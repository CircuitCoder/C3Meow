import Vue from 'vue';

import tmpl from './tmpl/post.tmpl.html';

import { markdown } from './filters';
import bus from './bus';

export default Vue.component('post', tmpl({
  props: {
    topic: String,
    source: String,
    timestamp: Number,
    tags: Array,
    author: Object,
  },
  methods: {
    tagClick(index) {
      bus.emit('tag', this.tags[index]);
      this.$emit('tag', this.tags[index]);
    },
  },

  computed: {
    compiled() {
      return markdown(this.source, true);
    },
  },
}));
