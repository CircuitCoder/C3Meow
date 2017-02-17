import Vue from 'vue';

import './style/list.scss';
import tmpl from './tmpl/list.tmpl.html';

import { time } from './filters';
import bus from './bus';

import config from './config';

export default Vue.component('list', tmpl({
  props: {
    entries: Array,
    hasPrev: {
      type: Boolean,
      default: true,
    },
    hasNext: {
      type: Boolean,
      default: true,
    },
    page: Number,
    reference: {
      type: String,
    },
    cachedTime: Number,
    cacheMissed: Boolean,
  },

  data: () => ({
    unselectHandler: null,
    selectByUrlHandler: null,
    selected: -1,
  }),

  created() {
    this.unselectHandler = () => this.unselect();
    this.selectByUrlHandler = url => this.selectByUrl(url);
    bus.on('list-perform-unselect', this.unselectHandler);
    bus.on('list-perform-select-by-url', this.selectByUrlHandler);
  },

  mounted() {
    if(bus.get('running')) this.initScroll();
    else bus.once('start', () => this.initScroll());
  },

  beforeDestroy() {
    bus.off('list-perform-unselect', this.unselectHandler);
    bus.off('list-perform-select-by-url', this.unselectHandler);
  },

  methods: {
    initScroll() {
      if(this.hasPrev)
        this.$el.scrollTop = 121; // 1 for the border
      else
        this.$el.scrollTop = 0;
    },

    scroll() {
      if(!config.scrollToSwitch) return;

      if(this.$el.scrollTop === 0 && this.hasPrev)
        this.prev();

      if(this.$el.scrollTop === this.$el.scrollHeight - this.$el.offsetHeight && this.hasNext)
        this.next();
    },

    prev() {
      bus.emit('list-scroll', this.page - 1);
    },

    next() {
      bus.emit('list-scroll', this.page + 1);
    },

    select(index) {
      this.selected = index;
      bus.emit('list-select', this.entries[index]);
    },

    unselect() {
      this.selected = -1;
      bus.emit('list-unselect');
    },

    selectByUrl(url) {
      if(!this.entries) return;
      for(let i = 0; i < this.entries.length; ++i)
        if(this.entries[i].url === url) {
          this.selected = i;
          return;
        }

      this.selected = -1;
    },

    convertTime(t) {
      return time(t);
    },

    buildEntryLink(entry) {
      return `/${entry.url}`;
    },

    refresh() {
      bus.emit('refresh', 'list');
    },
  },

  computed: {
    showNaviLinks() {
      return (!this.cacheMissed) && this.entries && this.entries.length > 0;
    },
    nextLink() {
      return `/${this.reference}/${this.page + 1}`;
    },

    prevLink() {
      if(this.reference === 'all' && this.page === 2)
        return '/';
      else
        return `/${this.reference}/${this.page - 1}`;
    },
  },
}));
