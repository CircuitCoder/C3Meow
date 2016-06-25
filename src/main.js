import Vue from 'vue';

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

    ref: '',
    page: 0,
    post: null,

    refTrans: null,
    listTrans: null,
    pageTrans: null,

    postTimestamp: 0,
    postCont: null,
    editor: null,
    postTrans: null,

    user: null,
    signedIn: false,
    isAuthor: false,
    avatarLoaded: false,

    accountTrans: null,
  },
  methods: {
    initialize() {
      let data = {};
      try {
        data = util.parseURL(window.location.pathname);
        console.log(data);

        this.ref = data.ref;
        this.post = data.post;
        this.page = data.page;
      } catch(e) {
        console.log(e);

        this.ref = 'all';
        this.post = null;
        this.page = 1;

        this.saveState(true);

        // TODO: pushState
      }

      setTimeout(() => {
        this.running = true;
      }, 0);

      this.loadList(this.ref, this.page, '');
      if(this.post) this.loadPost(this.post, '');

      if(this.ref === 'all') this.showRef('全部', '');
      else this.showRef(this.ref, '');

      this.popAccount();

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

    loadState(state) {
      console.log(state);
    },

    loadList(ref, page, direction) {
      if(this.listTrans) this.hideList(direction);
      this.updatePage(page);

      util.loadList(ref, page, (err, data) => {
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
          let postDirection;

          const url = list.entries[index].url;
          const ts = list.entries[index].post_time;

          if(this.post === null) postDirection = 'up';
          else if(this.postTimestamp < ts) postDirection = 'right';
          else if(this.postTimestamp > ts) postDirection = 'left';
          else return;

          this.post = url;
          this.postTimestamp = ts;
          this.saveState();

          this.loadPost(url, postDirection);
        });

        this.showList(direction, list);
      });
    },

    loadPost(url, direction) {
      // TODO: prevent multiple
      if(this.postTrans) this.hidePost(direction);

      util.loadPost(url, (err, data) => {
        // TODO: handle
        if(err) throw err;

        this.postCont = data;

        const post = new Post();
        post.topic = data.topic;
        post.tags = data.tags;
        post.source = data.content;
        post.timestamp = data.post_time;

        // Update title
        this.title = `${post.topic} | ${config.title}`;

        post.$on('tag', (tag) => {
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

    closePost(direction) {
      this.post = null;
      this.postCont = null;
      this.postTimestamp = 0;
      this.saveState();

      this.hidePost(direction);
    },

    backToAll() {
      if(this.ref === 'all') return;

      this.ref = 'all';
      this.page = 1;
      this.saveState();

      this.loadList('all', 1, 'left');
      this.showRef('全部', 'left');
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

    showRef(cont, direction) {
      const ref = new Transformer();
      ref.content = cont;
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
        if(page === this.page) return;
        else if(page > this.page) {
          this.hidePage('right');
          this.showPage('right', page);
        } else if(page < this.page) {
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
      list.delay = 10;
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
      post.delay = 10;
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
      setTimeout(() => editor.initialize(true), 0);

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
      } else {
        this.showPost('', editor);
      }

      setTimeout(() => editor.initialize(true), 0);

      const savecb = () => {
        const data = this.editor.getContent();

        if(!data.url || data.url === '') return false;

        util.newPost(data, (err, res) => {
          if(err) throw err;

          this.post = data.url;
          this.postTimestamp = res.id;
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
      if(this.postCont === null) throw new Error('Invalid Condition');
      util.deletePost(this.postCont.post_time, () => {
        this.closePost('down');
        this.loadList(this.ref, this.page, '');
      });
    },

    saveState(replace) {
      const state = {
        post: this.post,
        ref: this.ref,
        page: this.page,
      };

      const url = util.buildURL(state);

      console.log(state);
      console.log(url);

      if(replace) window.history.replaceState(state, '', url);
      else window.history.pushState(state, '', url);
    },
  },
});

instance.initialize();
