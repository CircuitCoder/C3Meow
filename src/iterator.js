import Vue from 'vue';

import tmpl from './tmpl/iterator.tmpl.html';

const isBrowser = typeof window !== 'undefined' && typeof window !== 'undefined';

import Transformer from './transformer.js';
import Post from './post.js';
import List from './list.js';
let Editor;

if(isBrowser) {
  Editor = require('./editor.js').default;
}

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

        if(props.type === 'pager' || props.type === 'account') {
          return h('span', props.data);
        }

        if(props.type === 'ref') {
          if(props.data.hasBack) {
            return h('span', {}, [
              h('span', { class: ['blocker'] }),
              props.data.content,
            ]);
          } else return h('span', props.data.content);
        }

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
    enter(el, done) {
      if(!this.$refs.transformers) return;
      for(const trans of this.$refs.transformers) {
        if(trans.$el === el) {
          trans.enter().then(done);
        }
      }
    },

    appear(el) {
      if(!this.$refs.transformers) return;
      for(const trans of this.$refs.transformers) {
        if(trans.$el === el) {
          trans.appear();
        }
      }
    },

    remove(spec) {
      for(let i = 0; i < this.list.length; ++i) {
        if(this.list[i] === spec) {
          this.list.splice(i, 1);
        }
      }
    },

    get(index) {
      return this.list[index];
    },
  },
}));
