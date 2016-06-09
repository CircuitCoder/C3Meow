import Vue from 'vue';

import './style/list.scss';
import tmpl from './tmpl/list.html';

export default Vue.component('list', {
  template: tmpl,

  data: () => ({
    entries: [],
    hasPrev: true,
    hasNext: true,
    selected: -1,
    page: 1,
  }),

  methods: {
    initialize() {
      this.$mount();

      setTimeout(() => {
        if(this.hasPrev) {
          this.$el.scrollTop = 121; // 1 for the border
        } else {
          this.$el.scrollTop = 0;
        }
      }, 0);
    },

    scroll() {
      if(this.$el.scrollTop === 0 && this.hasPrev) {
        this.$dispatch('scroll-up');
      }

      if(this.$el.scrollTop === this.$el.scrollHeight - this.$el.offsetHeight) {
        this.$dispatch('scroll-down');
      }
    },

    select(index) {
      // TODO: select on load
      this.selected = index;
      this.$dispatch('select', index);
    },
  },
});
