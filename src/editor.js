import Vue from 'vue';
import CodeMirror from 'codemirror';

import 'codemirror/lib/codemirror.css';
import 'codemirror/keymap/vim.js';
import 'codemirror/mode/markdown/markdown.js';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/dialog/dialog.css';

import tmpl from './tmpl/editor.html';

let instance;

CodeMirror.commands.save = () => {
  if(instance) instance.$dispatch('save');
};

CodeMirror.Vim.defineEx('q', null, () => {
  if(instance) instance.$dispatch('close');
});

CodeMirror.Vim.defineEx('wq', null, () => {
  if(instance) instance.$dispatch('saveclose');
});

export default Vue.component('editor', {
  template: tmpl,
  data: () => ({
    content: '',
    topic: '',
    tags: [],
    tagsStr: '',
    url: '',
    id: 0,

    preview: false,
    cm: null,
  }),
  methods: {
    initialize(vim) {
      /* eslint-disable new-cap */
      this.cm = CodeMirror(this.$el.getElementsByClassName('source')[0], {
        value: this.content,
        mode: 'markdown',
        keyMap: vim ? 'vim' : 'default',
        lineNumbers: true,
        lineWrapping: true,
      });

      this.tagsStr = this.tags.join(' ');

      instance = this;
    },

    getContent() {
      this.tags = this.tagsStr.split(' ');
      return {
        topic: this.topic,
        url: this.url,
        tags: this.tags,
        content: this.cm.getValue(),
        post_time: this.id,
        user_ident: 'test,dummy',
      };
    },
  },
});
