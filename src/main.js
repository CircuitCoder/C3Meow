import Vue from 'vue';

import VueTouch from 'vue-touch';
import Hammer from 'hammerjs';

Hammer.defaults.cssProps.userSelect = 'initial';
Hammer.defaults.inputClass = Hammer.TouchInput;

Vue.use(VueTouch);

import util from './util';
import config from './config';

import './style/general.scss';

import Transformer from './transformer.js';
import List from './list.js';
import Post from './post.js';
import Editor from './editor.js';

import './filters.js';

/* eslint-disable no-new */
const instance = new Vue({
  el: 'html',
  data: {
    running: false,
    title: `正在喂食 | ${config.title}`,
    titlebar: config.title,

    ref: '',
    page: 0,
    post: null,

    refTrans: null,
    listTrans: null,
    pageTrans: null,

    postCont: null,
    listCont: null,
    editor: null,
    postTrans: null,
    notFound: false,

    user: null,
    signedIn: false,
    isAuthor: false,
    avatarLoaded: false,

    accountTrans: null,

    postTsStore: [],

    sidebarShown: false,

    pendingDeletion: false,
    deletionConfirmation: '',
    deletionPlaceholder: '',
    deleting: false,
  },
  methods: {
    initialize() {
      let data = {};
      try {
        data = util.parseURL(window.location.pathname);

        this.ref = data.ref;
        this.post = data.post;
        this.page = data.page;
      } catch(e) {
        this.ref = 'all';
        this.post = null;
        this.page = 1;

        this.saveState(true);
      }

      setTimeout(() => {
        this.running = true;
      });

      this.loadList(this.ref, this.page, '');
      if(this.post) this.loadPost(this.post, '');

      if(this.ref === 'all') this.showRef('全部', '', false);
      else this.showRef(this.ref, '');

      this.popAccount();

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
    },

    loadState(_state) {
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
        this.showRef(this.ref === 'all' ? '全部' : this.ref, direction, this.ref !== 'all');
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
          if(this.listCont) this.listCont.selectByUrl(this.post);

          this.loadPost(this.post, postDirection);
        }
      }
    },

    loadList(ref, page, direction) {
      if(this.listTrans) this.hideList(direction);
      this.updatePage(page);

      util.loadList(ref, page, (err, data) => {
        if(this.page !== page || this.ref !== ref) {
          // Another loading procedure already kicked in
          return;
        }

        // TODO: handle
        if(err) throw err;

        const list = new List();
        list.entries = data.posts;
        list.initialize();
        list.page = page;
        list.hasPrev = page !== 1;
        list.hasNext = data.hasNext;

        if(this.post !== null) list.selectByUrl(this.post);

        let removed = false;

        list.$once('scroll-up', () => {
          if(removed) return;
          removed = true;
          this.page = page - 1;
          this.saveState();
          this.loadList(ref, page - 1, 'down');
        });

        list.$once('scroll-down', () => {
          if(removed) return;
          this.page = page + 1;
          this.saveState();
          this.loadList(ref, page + 1, 'up');
        });

        list.$on('select', (index) => {
          this.closeSidebar();

          let postDirection;

          const url = list.entries[index].url;
          const ts = list.entries[index].post_time;

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

        this.listCont = list;
        this.showList(direction, list);
      });
    },

    loadPost(url, direction) {
      if(this.postTrans) this.hidePost(direction);
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
            return;
          } else {
            throw err;
          }
        }

        this.postCont = data;

        const post = new Post();
        post.topic = data.topic;
        post.tags = data.tags;
        post.source = data.content;
        post.timestamp = data.post_time;
        post.author = data.user;

        // For start-up loading
        this.postTsStore[url] = post.timestamp;

        // Update title
        this.title = `${post.topic} | ${config.title}`;

        post.$on('tag', (tag) => {
          this.openSidebar();

          if(tag === this.ref) return;

          this.ref = tag;
          this.page = 1;
          this.saveState();

          this.loadList(tag, 1, 'right');
          this.showRef(tag, 'right');
        });

        post.$mount();

        this.showPost(direction, post);
      });
    },

    closePost(direction, fromState) {
      // TODO: refactor
      this.post = null;
      this.postCont = null;
      if(!fromState) this.saveState();

      if(this.listCont) this.listCont.unselect();

      this.hidePost(direction);
    },

    backToAll() {
      if(this.ref === 'all') return;

      this.ref = 'all';
      this.page = 1;
      this.saveState();

      this.loadList('all', 1, 'left');
      this.showRef('全部', 'left', false);
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

    showRef(cont, direction, hasBack = true) {
      const ref = new Transformer();

      if(hasBack) ref.content = `<span class="blocker"></span>${cont}`;
      else ref.content = cont;

      ref.delta = 20;
      ref.delay = 100;

      if(this.refTrans) {
        this.hideRef(direction);

        ref.direction = direction;
      }

      ref.enter('.list-ref');

      this.refTrans = ref;
    },

    hideRef(direction) {
      this.refTrans.direction = direction;
      this.refTrans.leave();
      this.refTrans = null;
    },

    updatePage(page) {
      if(this.pageTrans) {
        if(page === this.pageTrans.content) return;
        else if(page > this.pageTrans.content) {
          this.hidePage('right');
          this.showPage('right', page);
        } else if(page < this.pageTrans.content) {
          this.hidePage('left');
          this.showPage('left', page);
        }
      } else {
        this.showPage('', page);
      }

      this.page = page;
    },

    showPage(direction, num) {
      const page = new Transformer();
      page.delta = 20;
      page.delay = 100;
      page.direction = direction;
      page.content = num;

      page.enter('.pager');
      this.pageTrans = page;
    },

    hidePage(direction) {
      this.pageTrans.direction = direction;
      this.pageTrans.leave();
      this.pageTrans = null;
    },

    hideList(direction) {
      this.listTrans.direction = direction;
      this.listTrans.leave();
      this.listTrans = null;
    },

    showList(direction, content) {
      const list = new Transformer();
      list.delta = 20;
      list.delay = 0;
      list.direction = direction;
      list.enter('.list-content-holder');

      content.$appendTo(list.$el);

      this.listTrans = list;
    },

    hidePost(direction) {
      this.postTrans.direction = direction;
      this.postTrans.leave();
      this.postTrans = null;
    },

    showPost(direction, content) {
      const post = new Transformer();
      post.delta = 50;
      post.delay = 0;
      post.direction = direction;
      post.enter('.post-container');

      content.$appendTo(post.$el);

      this.postTrans = post;
    },

    pushAccount(name) {
      this.accountTrans.direction = 'right';
      this.accountTrans.leave();

      const account = new Transformer();
      account.delta = 20;
      account.delay = 100;
      account.duration = 200;
      account.direction = 'right';
      account.content = name;
      account.enter('.name-holder');

      this.accountTrans = account;
    },

    popAccount() {
      const account = new Transformer();
      account.delta = 20;
      account.delay = 100;
      account.content = '使用 Google 登录';

      if(this.accountTrans) {
        this.accountTrans.direction = 'left';
        this.accountTrans.leave();
      }

      account.direction = 'left';
      account.enter('.name-holder');
      this.accountTrans = account;
    },

    doEdit() {
      if(this.postCont === null) throw new Error('Invalid Environment');

      const editor = new Editor();
      editor.topic = this.postCont.topic;
      editor.tags = this.postCont.tags;
      editor.content = this.postCont.content;
      editor.id = this.postCont.post_time;
      editor.url = this.postCont.url;
      editor.$mount();

      this.editor = editor;

      this.hidePost('');

      this.showPost('', editor);
      setTimeout(() => editor.initialize(true, true));

      editor.$on('save', () => {
        this.saveEdit();
      });

      editor.$on('close', () => {
        // TODO: state on editor
        this.loadPost(editor.url, '');
      });

      editor.$on('saveclose', () => {
        this.saveEdit(() => this.loadPost(editor.url, ''));
      });
    },

    saveEdit(cb) {
      const data = this.editor.getContent();

      util.updatePost(data.post_time, data, (err, res) => {
        if(err) throw err;
        else if(res.ok !== 0) throw res;

        if(cb) cb();
      });
    },

    doAdd() {
      const editor = new Editor();

      this.editor = editor;
      editor.$mount();

      if(this.postCont) {
        this.hidePost('up');
        this.showPost('up', editor);
        this.post = null;
      } else {
        this.showPost('', editor);
      }

      if(this.listCont) this.listCont.unselect();

      setTimeout(() => editor.initialize(true));

      const savecb = () => {
        const data = this.editor.getContent();

        if(!data.url || data.url === '') return false;

        util.newPost(data, (err, res) => {
          if(err) throw err;

          this.post = data.url;
          this.postTsStore[this.post] = res.id;
          this.saveState();

          this.loadPost(data.url, '');
          this.loadList(this.ref, this.page, '');
        });

        return true;
      };

      editor.$on('close', () => {
        this.closePost('down');
      });

      editor.$on('save', savecb);
      editor.$on('saveclose', savecb);
    },

    doDelete() {
      // Close sidebar
      this.sidebarShown = false;

      if(this.postCont === null) throw new Error('Invalid Condition');

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

    eventBlocker(e) {
      e.stopPropagation();
    },

    gotoFeed() {
      window.location.href = `${config.backend}/feed`;
    },
  },
});

instance.initialize();
