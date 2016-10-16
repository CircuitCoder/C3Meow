import Vue from 'vue';

const isBrowser = typeof window !== 'undefined' && typeof window !== 'undefined';

if(isBrowser) {
  const VueTouch = require('vue-touch');
  const Hammer = require('hammerjs');

  Hammer.defaults.cssProps.userSelect = 'initial';
  Hammer.defaults.inputClass = Hammer.TouchInput;

  VueTouch.registerCustomEvent('sidebar-open', {
    type: 'swipe',
    direction: Hammer.DIRECTION_RIGHT,
    threshold: 200,
    velocity: 0.3,
  });

  VueTouch.registerCustomEvent('sidebar-close', {
    type: 'swipe',
    direction: Hammer.DIRECTION_LEFT,
    threshold: 200,
    velocity: 0.3,
  });

  Vue.use(VueTouch);
}

Vue.config.keyCodes.a = 65;
Vue.config.keyCodes.d = 68;
Vue.config.keyCodes.e = 69;
Vue.config.keyCodes.s = 83;

import util from './util';
import config from './config';
import bus from './bus';

import './style/general.scss';

import './iterator.js';

import './filters.js';

let gaPV;

function setupGA() {
  if(config.googleAnalyticsID) {
    /* eslint-disable */
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

    ga('create', config.googleAnalyticsID, 'auto');

    gaPV = (title, url) => {
      ga('send', {
        hitType: 'pageview',
        title,
        page: url,
      });
    }
    /* eslint-enable */
  }
}

import tmpl from './tmpl/root.tmpl.html';

// eslint-disable-next-line no-new
const instance = new Vue(tmpl({
  data: () => ({
    running: false,
    cacheTitle: `加载中... | ${config.title}`,
    titlebar: config.title,

    ref: '',
    page: 0,
    post: null,

    refTrans: null,

    postCont: null,
    listCont: null,
    notFound: false,

    user: null,
    signedIn: false,
    isAuthor: false,
    avatarLoaded: false,

    postTsStore: [],

    sidebarShown: false,

    pendingDeletion: false,
    deletionConfirmation: '',
    deletionPlaceholder: '',
    deleting: false,

    lastPV: '',

    iteratorContent: {
      post: [],
      list: [],
      ref: [],
      pager: [],
      account: [],
    },

    iteratorCount: {
      post: 0,
      list: 0,
      ref: 0,
      pager: 0,
      account: 0,
    },
  }),

  mounted() {
    if(!this.$isServer) {
      setupGA();
      this.initialize(window.location.pathname);
      this.$refs.frame.focus();
    }
  },

  created() {
    if(!this.$isServer) this.$mount('#app');

    bus.on('tag', tag => {
      this.openSidebar();

      if(tag === this.ref) return;

      this.ref = tag;
      this.page = 1;
      this.saveState();

      this.loadList(tag, 1, 'right');
      this.updateRef(tag, 'right');
    });

    bus.on('editor-save', (content, isNew) => {
      if(isNew) bus.emit('editor-saveclose', content, isNew);
      else this.saveEdit(content);
    });

    bus.on('editor-close', (url, isNew) => {
      if(isNew) this.closePost('down');
      else this.loadPost(url, '');
    });

    bus.on('editor-saveclose', (content, isNew) => {
      (isNew ? this.saveNew(content) : this.saveEdit(content))
      .then(() => {
        if(this.post !== content.url) {
          this.saveState(); // TODO: replace state on edit
          this.post = content.url;
        }
        this.loadPost(content.url, '');
      });
    });

    bus.on('list-scroll', (page) => {
      const up = this.page > page;
      this.page = page;
      this.saveState();
      this.loadList(this.ref, page, up ? 'up' : 'down');
    });

    bus.on('list-select', (entry) => {
      this.closeSidebar();

      let postDirection;

      const url = entry.url;
      const ts = entry.post_time;

      if(this.post === null) postDirection = 'up';
      else if(this.postTsStore[this.post] < ts) postDirection = 'right';
      else if(this.postTsStore[this.post] > ts) postDirection = 'left';
      else if(this.postTsStore[this.post] === ts) return;
      else throw new Error('Post timestamp not stored');

      this.postTsStore[url] = ts;

      this.post = url;
      this.saveState();

      this.loadPost(url, postDirection);
    });
  },

  methods: {
    initialize(url) {
      this.title = `正在喂食 | ${config.title}`;

      let data = {};
      try {
        data = util.parseURL(url);

        this.ref = data.ref;
        this.post = data.post;
        this.page = data.page;
      } catch(e) {
        this.ref = 'all';
        this.post = null;
        this.page = 1;

        if(!this.$isServer) this.saveState(true);
      }

      setTimeout(() => {
        this.running = true;
      });

      const pList = this.loadList(this.ref, this.page, '');
      const pPost = this.post ? this.loadPost(this.post, '') : Promise.resolve();

      if(this.ref === 'all') this.updateRef('全部', '', false);
      else this.updateRef(this.ref, '');

      this.popAccount();

      if(this.$isServer) return Promise.all([pList, pPost]);

      window.onpopstate = (e) => this.loadState(e.state);
      util.initLogin((user) => {
        // TODO: validate
        const profile = user.getBasicProfile();
        const newAvatar = profile.getImageUrl();

        if(!this.user || newAvatar !== this.user.avatar) {
          this.avatarLoaded = false;
        }

        util.postLogin(user.getAuthResponse().id_token, user.getId(), (err, pres) => {
          if(err) throw err;
          else if(pres.error_description) throw pres.error_description;
          else if(!pres.valid) throw new Error('Not valid');
          else {
            this.user = {
              name: profile.getName(),
              avatar: newAvatar,
              email: profile.getEmail(),
            };

            this.isAuthor = !!pres.isAuthor;
            this.signedIn = true;

            this.pushAccount(this.user.name);
          }
        });
      }, () => {
        util.postLogout((err, pres) => {
          if(err) throw err;
          else if(pres.ok !== 0) throw pres;

          this.signedIn = false;
          this.isAuthor = false;
          this.popAccount();
        });
      });

      return Promise.all([pList, pPost]);
    },

    loadState(_state) {
      // TODO: promisify
      const state = _state || {
        post: null,
        ref: 'all',
        page: 1,
      };

      if(state.ref !== this.ref || state.page !== this.page) {
        this.ref = state.ref;
        this.page = state.page;

        const direction = this.ref === 'all' ? 'left' : 'right';
        this.loadList(this.ref, this.page, direction);
        this.updateRef(this.ref === 'all' ? '全部' : this.ref, direction, this.ref !== 'all');
      }

      if(state.post !== this.post) {
        if(!state.post) {
          this.closePost('down', true);
        } else {
          let postDirection = 'up';
          if(!(state.post in this.postTsStore)) postDirection = 'up';
          if(this.postTsStore[this.post] < this.postTsStore[state.post]) postDirection = 'right';
          if(this.postTsStore[this.post] > this.postTsStore[state.post]) postDirection = 'left';

          this.post = state.post;
          bus.emit('list-perform-select-by-url', this.post);

          this.loadPost(this.post, postDirection);
        }
      }
    },

    loadList(ref, page, direction) {
      return new Promise((resolve) => {
        this.clearIterator('list', { direction });
        this.updatePager();

        util.loadList(ref, page, (err, data) => {
          if(this.page !== page || this.ref !== ref) {
            // Another loading procedure already kicked in
            return;
          }

          // TODO: handle
          if(err) throw err;

          this.pushIterator('list', {
            entries: data.posts,
            page,
            hasPrev: page !== 1,
            hasNext: data.hasNext,
          }, {
            delta: 20,
            delay: 0,
            direction,
          });

          if(this.post !== null) {
            this.$nextTick(() =>
              bus.emit('list-perform-select-by-url', this.post));
          }

          this.pageview();
          resolve();
        });
      });
    },

    loadPost(url, direction) {
      return new Promise((resolve, reject) => {
        this.clearIterator('post', { direction });
        this.notFound = false;

        util.loadPost(url, (err, data) => {
          if(url !== this.post) {
            // Another loading procedure already kicked in
            return;
          }

          if(err) {
            if(err.status === 404) {
              this.notFound = true;
              this.title = `404 | ${config.title}`;
              this.post = null;
              return void resolve();
            } else {
              return void reject(err);
            }
          }

          this.postCont = data;

          this.pushIterator('post', {
            topic: data.topic,
            tags: data.tags,
            source: data.content,
            timestamp: data.post_time,
            author: data.user,
          }, {
            delta: 50,
            delay: 0,
            direction,
          });

          // For start-up loading
          this.postTsStore[url] = data.post_time;

          // Update title
          this.title = `${data.topic} | ${config.title}`;

          this.pageview();
          resolve();
        });
      });
    },

    closePost(direction, fromState) {
      // TODO: refactor
      if(!this.post) return;

      this.post = null;
      this.postCont = null;
      if(!fromState) this.saveState();

      bus.emit('list-perform-unselect');

      this.clearIterator('post', { direction });
      this.title = `正在喂食 | ${config.title}`;

      this.pageview();
    },

    backToAll() {
      if(this.ref === 'all') return;

      this.ref = 'all';
      this.page = 1;
      this.saveState();

      this.loadList('all', 1, 'left');
      this.updateRef('全部', 'left', false);

      this.pageview();
    },

    modAccount() {
      if(this.signedIn) {
        util.doLogout();
      } else {
        // TODO: prevent multiple invoke
        util.doLogin();
      }
    },

    onAvatarLoad() {
      this.avatarLoaded = true;
    },

    updateRef(content, _direction, hasBack = true) {
      let direction = _direction;

      if(this.iteratorCount.ref === 0) direction = '';
      else {
        const status = this.iteratorContent.ref[this.iteratorCount.ref - 1].data;

        if(content === status.content && hasBack === status.hasBack) return;
        this.clearIterator('ref', { direction });
      }

      this.pushIterator('ref', {
        hasBack,
        content,
      }, {
        direction: '',
        delta: 20,
        delay: 100,
      });
    },

    updatePager() {
      if(this.iteratorCount.pager > 0) {
        const prev = this.iteratorContent.pager[this.iteratorCount.pager - 1].data;
        if(prev === this.page) return;
        const direction = this.page > prev ? 'right' : 'left';

        this.clearIterator('pager', { direction, delay: 0, delta: 20 });
        this.pushIterator('pager', this.page, {
          direction,
          delta: 20,
          delay: 100,
        });
      } else {
        this.pushIterator('pager', this.page, {
          direction: '',
        });
      }
    },

    pushAccount(name) {
      this.clearIterator('account', { direction: 'right' });
      this.pushIterator('account', name, {
        delta: 20,
        delay: 100,
        duration: 200,
        direction: 'right',
      });
      return;
    },

    popAccount() {
      this.clearIterator('account', { direction: 'left' });
      this.pushIterator('account', '使用 Google 登录', {
        delta: 20,
        delay: 100,
        duration: 200,
        direction: 'right',
      });
      return;
    },

    doEdit() {
      if(!this.isAuthor) return;
      if(this.postCont === null) throw new Error('Invalid Environment');

      this.$refs.postIterator.clear();
      this.$refs.postIterator.overridePush('editor', {
        topic: this.postCont.topic,
        tags: this.postCont.tags,
        content: this.postCont.content,
        id: this.postCont.post_time,
        url: this.postCont.url,
      }, {
        delta: 50,
        delay: 0,
        direction: '',
      });
    },

    saveEdit(data) {
      return new Promise(resolve => {
        util.updatePost(data.post_time, data, (err, res) => {
          if(err) throw err;
          else if(res.ok !== 0) throw res;

          resolve();
        });
      });
    },

    doAdd() {
      // if(!this.isAuthor) return;

      let direction = '';

      if(this.postCont) {
        this.$refs.postIterator.clear({ direction: 'up' });
        direction = 'up';
      }

      this.$refs.postIterator.overridePush('editor', {
        isNew: true,
      }, {
        delta: 50,
        delay: 0,
        direction,
      });

      this.post = null;
      this.saveState();

      bus.emit('list-perform-unselect');
    },

    doDelete() {
      if(!this.isAuthor) return;

      // Close sidebar
      this.sidebarShown = false;

      if(this.postCont === null || this.post === null) throw new Error('Invalid Condition');

      // Request to delete
      this.deletionConfirmation = '';
      this.deletionPlaceholder = this.post;
      this.pendingDeletion = true;

      setTimeout(() => this.$el.querySelector('input').focus());
    },

    checkDeletion() {
      if(!this.pendingDeletion) {
        // Ignore
        return;
      } if(this.deletionConfirmation === this.deletionPlaceholder) {
        // Perform deletion
        this.deleting = true;
        util.deletePost(this.postCont.post_time, () => {
          this.closePost('down');
          this.post = null;

          this.loadList(this.ref, this.page, '');
          this.deleting = false;
          this.pendingDeletion = false;
        });
      }
    },

    discardDeletion() {
      this.pendingDeletion = false;
    },

    saveNew(data) {
      return new Promise((resolve, reject) => {
        if(!data.url || data.url === '') return void reject();

        util.newPost(data, (err, res) => {
          if(err) throw err;
          this.postTsStore[data.url] = res.id;
          resolve();
        });
      });
    },

    clearIterator(type, trans) {
      for(const d of this.iteratorContent[type]) {
        Object.assign(d, trans);
        d.leave = true;
      }
      this.iteratorCount[type] = 0;
    },

    pushIterator(type, data, trans) {
      this.overridePushIterator(type, type, data, trans);
    },

    overridePushIterator(type, _type, data, trans) {
      const obj = Object.assign({}, trans);
      obj.data = data;
      obj.type = type;
      obj.leave = false;
      this.iteratorContent[type].push(obj);
      ++this.iteratorCount[type];
    },

    saveState(replace) {
      const state = {
        post: this.post,
        ref: this.ref,
        page: this.page,
      };

      const url = util.buildURL(state);

      if(replace) window.history.replaceState(state, '', url);
      else window.history.pushState(state, '', url);
    },

    toggleSidebar() {
      this.sidebarShown = !this.sidebarShown;
    },

    openSidebar() {
      this.sidebarShown = true;
    },

    closeSidebar() {
      this.sidebarShown = false;
    },

    pageview() {
      if(gaPV) {
        const url = util.buildURL({
          post: this.post,
          ref: this.ref,
          page: this.page,
        });

        if(url === this.lastPV) return;
        this.lastPV = url;
        this.$nextTick(() => gaPV(this.title, url));
      }
    },

    eventBlocker(e) {
      e.stopPropagation();
    },

    gotoFeed() {
      window.location.href = `${config.backend}/feed`;
    },
  },

  computed: {
    title: {
      get() {
        return this.cacheTitle;
      },

      set(t) {
        this.cacheTitle = t;
        if(!this.$isServer) document.title = t;
      },
    },
  },
}));

export default context =>
  new Promise(resolve =>
    instance.initialize(context.url).then(() => resolve(instance)));
