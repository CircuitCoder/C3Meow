import Vue from 'vue';
import MarkdownIt from 'markdown-it';
import moment from 'moment';

import hljs from './lib/hljs';
import 'highlight.js/styles/solarized-dark.css';

const unsafeMd = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const safeMd = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  highlight: (str, lang) => {
    if(lang && hljs.getLanguage(lang)) try {
      return `<pre class="hljs"><code>${hljs.highlight(lang, str).value}</code></pre>`;
    } catch(__) { /* ignore */ }

    return `<pre class="hljs"><code>${safeMd.utils.escapeHtml(str)}</code></pre>`;
  },
});

function time(t) {
  return moment.utc(t).local().format('l');
}

const markdown = (source, safe) => (safe ? safeMd.render(source) : unsafeMd.render(source));

Vue.filter('time', time);
Vue.filter('markdown', markdown);

module.exports = {
  time,
  markdown,
};
