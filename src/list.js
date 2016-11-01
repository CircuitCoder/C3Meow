import Vue from 'vue';

import './style/list.scss';
import tmpl from './tmpl/list.tmpl.html';

import { time } from './filters.js';
import bus from './bus';

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
    if(this.hasPrev)
      this.$el.scrollTop = 121; // 1 for the border
    else
      this.$el.scrollTop = 0;
  },

  beforeDestroy() {
    bus.off('list-perform-unselect', this.unselectHandler);
    bus.off('list-perform-select-by-url', this.unselectHandler);
  },

  methods: {
    scroll() {
      if(this.$el.scrollTop === 0 && this.hasPrev)
        bus.emit('list-scroll', this.page - 1);

      if(this.$el.scrollTop === this.$el.scrollHeight - this.$el.offsetHeight && this.hasNext)
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
  },
}));
