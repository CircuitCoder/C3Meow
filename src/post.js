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
    url: String,
  },
  methods: {
    tagClick(index) {
      bus.emit('tag', this.tags[index]);
      this.$emit('tag', this.tags[index]);
    },

    buildTagLink(tag) {
      return `/${tag}/1`;
    },
  },

  computed: {
    compiled() {
      return markdown(this.source, true);
    },
  },
}));
