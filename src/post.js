import Vue from 'vue';

import tmpl from './tmpl/post.html';

import { markdown } from './filters';

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
      this.$emit('tag', this.tags[index]);
    },
    md(m) {
      return markdown(m, true);
    },
  },
});
