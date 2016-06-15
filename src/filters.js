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
    if(lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(lang, str).value}</code></pre>`;
      } catch(__) { /* ignore */ }
    }

    return `<pre class="hljs"><code>${safeMd.utils.escapeHtml(str)}</code></pre>`;
  },
});

Vue.filter('timeConverter', (time) => {
  const d = new Date(1970, 0);

  // ns to ms
  d.setMilliseconds(time);
  return d.toLocaleDateString();
});

Vue.filter('markdown', (source, safe) => (safe ? safeMd.render(source) : unsafeMd.render(source)));
