import Vue from 'vue';

import tmpl from './tmpl/iterator.tmpl.html';

const isBrowser = typeof window !== 'undefined' && typeof window !== 'undefined';

import Transformer from './transformer';
import Post from './post';
import List from './list';

let Editor;

if(isBrowser)
  Editor = require('./editor').default;

export default Vue.component('iterator', tmpl({
  props: {
    type: String,
    list: Array,
  },

  components: {
    adaptor: {
      functional: true,

      props: {
        type: String,
        data: [String, Number, Object],
      },

      render(h, context) {
        const { props } = context;

        if(props.type === 'pager' || props.type === 'account')
          return h('span', props.data);

        if(props.type === 'ref')
          if(props.data.hasBack)
            return h('span', {}, [
              h('span', { class: ['blocker'] }),
              props.data.content,
            ]);
          else return h('span', props.data.content);

        return h(props.type, {
          props: props.data,
        });
      },
    },

    post: Post,
    editor: Editor,
    list: List,
    transformer: Transformer,
  },

  methods: {
    perform(el, action) {
      if(!this.$refs.transformers) return Promise.resolve();
      for(const trans of this.$refs.transformers)
        if(trans.$el === el)
          return trans[action]();
      return Promise.resolve();
    },

    enter(el) {
      return this.perform(el, 'enter');
    },

    appear(el) {
      return this.perform(el, 'appear');
    },

    leave(el) {
      return this.perform(el, 'leave');
    },

    get(index) {
      return this.list[index];
    },
  },
}));
