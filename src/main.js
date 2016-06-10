import Vue from 'vue';

import util from './util';
import config from './config';

import './style/general.scss';

import Transformer from './transformer.js';
import List from './list.js';

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

    postReady: false,

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
        list.entries = data;
        list.initialize();
        list.page = page;
        list.hasPrev = page !== 1;

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

        this.showList(direction, list);
      });
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

    hideRef(direction) {
      this.refTrans.direction = direction;
      this.refTrans.leave();
      this.refTrans = null;
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
  },
});

instance.initialize();
