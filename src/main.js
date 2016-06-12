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

    postUrl: null,
    postTimestamp: 0,
    postCont: null,
    editor: null,
    postTrans: null,

    user: null,
    signedIn: false,
    avatarLoaded: false,

    accountTrans: null,
  },
  methods: {
    initialize() {
      let data = {};
      try {
        data = util.parseURL(window.location.pathname);
      } catch(e) {
        // TODO: push state to index
      }

      let list = 'all';
      let page = 1;
      let post = null;

      if(data.type === 'list') {
        list = data.ref;
        page = data.page;
      } else if(data.type === 'post') {
        post = data.url;
      }

      this.pushRef(this.getRefName(list));

      this.ref = list;
      this.page = page;
      this.post = post;

      setTimeout(() => {
        this.running = true;
      }, 0);

      this.loadList(list, page, 'right');

      this.popAccount();
      util.initLogin((user) => {
        // TODO: validate
        const profile = user.getBasicProfile();
        const newAvatar = profile.getImageUrl();

        if(!this.user || newAvatar !== this.user.avatar) {
          this.avatarLoaded = false;
        }

        this.user = {
          name: profile.getName(),
          avatar: newAvatar,
          email: profile.getEmail(),
        };
        this.signedIn = true;
        this.pushAccount(this.user.name);
      }, () => {
        this.signedIn = false;
        this.popAccount();
      });
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

        if(this.postCont !== null) list.selectByUrl(this.postUrl);

        let removed = false;

        list.$once('scroll-up', () => {
          if(removed) return;
          removed = true;
          this.loadList(ref, page - 1, 'down');
        });

        list.$once('scroll-down', () => {
          if(removed) return;
          this.loadList(ref, page + 1, 'up');
        });

        list.$on('select', (index) => {
          let postDirection;

          const url = list.entries[index].url;
          const ts = list.entries[index].post_time;

          if(this.postUrl === null) postDirection = 'up';
          else if(this.postTimestamp < ts) postDirection = 'right';
          else if(this.postTimestamp > ts) postDirection = 'left';
          else return;

          this.postUrl = url;
          this.postTimestamp = ts;

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

          this.loadList(tag, 1, 'right');
          this.pushRef(tag);
        });

        post.$mount();

        this.showPost(direction, post);
      });
    },

    backToAll() {
      if(this.ref === 'all') return;

      this.ref = 'all';
      this.page = 1;

      this.loadList('all', 1, 'left');
      this.backRef('全部');
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

    getRefName(ref) {
      if(ref === 'all') return '全部';
      else return ref;
    },

    pushRef(cont) {
      const ref = new Transformer();
      ref.content = cont;
      ref.delta = 20;
      ref.delay = 100;

      ref.$on('click', () => {
        console.log('click!');
      });

      if(this.refTrans) {
        this.hideRef('right');

        ref.direction = 'right';
      }

      ref.enter('.list-ref');

      this.refTrans = ref;
    },

    backRef(cont) {
      const ref = new Transformer();
      ref.content = cont;
      ref.delta = 20;
      ref.delay = 100;

      if(this.refTrans) {
        this.hideRef('left');

        ref.direction = 'left';
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

        util.newPost(data, (err) => {
          if(err) throw err;

          this.loadPost(data.url, '');
          this.loadList(this.ref, this.page, '');
        });

        return true;
      };

      editor.$on('close', () => {
        // TODO: close post
      });

      editor.$on('save', savecb);
      editor.$on('saveclose', savecb);
    },
  },
});

instance.initialize();
