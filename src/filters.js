import Vue from 'vue';
import MarkdownIt from 'markdown-it';

import hljs from 'highlight.js';
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
  const d = new Date(1970, 0);

  // ns to ms
  d.setMilliseconds(t);
  return d.toLocaleDateString();
}

const markdown = (source, safe) => (safe ? safeMd.render(source) : unsafeMd.render(source));

Vue.filter('time', time);
Vue.filter('markdown', markdown);

module.exports = {
  time,
  markdown,
};
