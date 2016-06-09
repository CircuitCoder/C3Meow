import Vue from 'vue';

import util from './util';
import config from './config';

import './style/general.scss';

import Transformer from './transformer.js';
import List from './list.js';

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
    },

    loadList(ref, page, direction) {
      if(this.listTrans) this.hideList(direction);
      this.updatePage(page);

      util.loadList(ref, page, (data) => {
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
  },
});

instance.initialize();
