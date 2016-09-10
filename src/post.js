import Vue from 'vue';

import tmpl from './tmpl/post.html';

export default Vue.component('post', {
  template: tmpl,
  data: () => ({
    topic: '',
    source: '',
    timestamp: 0,
    tags: [],
    author: null,
  }),
  methods: {
    tagClick(index) {
      this.$dispatch('tag', this.tags[index]);
    },
  },
});
