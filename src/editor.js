import Vue from 'vue';
import CodeMirror from 'codemirror';

import 'codemirror/lib/codemirror.css';
import 'codemirror/keymap/vim';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/dialog/dialog.css';

import tmpl from './tmpl/editor.tmpl.html';

import bus from './bus';

let instance;

CodeMirror.commands.save = () => {
  if(instance) bus.emit('editor-save', instance.getContent(), instance.isNew);
};

CodeMirror.Vim.defineEx('q', null, () => {
  if(instance) bus.emit('editor-close', instance.url, instance.isNew);
});

CodeMirror.Vim.defineEx('wq', null, () => {
  if(instance) bus.emit('editor-saveclose', instance.getContent(), instance.isNew);
});

export default Vue.component('editor', tmpl({
  props: {
    isNew: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      default: '',
    },
    tags: {
      type: Array,
      default: () => [],
    },
    url: {
      type: String,
      default: '',
    },
    id: {
      type: Number,
      default: 0,
    },
  },

  data: () => ({
    tagsStr: '',
    urlStr: '',
    topicStr: '',

    preview: false,
    cm: null,
  }),

  mounted() {
    this.initialize(true, !this.isNew);
  },

  methods: {
    initialize(vim, focus) {
      const el = this.$el.getElementsByClassName('source')[0];
      /* eslint-disable new-cap */
      this.cm = CodeMirror(el, {
        value: this.content,
        mode: 'markdown',
        keyMap: vim ? 'vim' : 'default',
        lineNumbers: true,
        lineWrapping: true,
      });

      this.tagsStr = this.tags.join(' ');
      this.urlStr = this.url;
      this.topicStr = this.topic;

      instance = this;

      if(focus)
        setTimeout(() => {
          this.cm.focus();
        });
    },

    getContent() {
      const tags = this.tagsStr.split(' ').filter(e => e !== '');

      return {
        topic: this.topicStr,
        url: this.urlStr,
        tags,
        content: this.cm.getValue(),
        post_time: this.id,
        user_ident: 'test,dummy',
      };
    },
  },
}));
