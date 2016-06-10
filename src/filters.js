import Vue from 'vue';
import MarkdownIt from 'markdown-it';

const unsafeMd = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const safeMd = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
});

Vue.filter('timeConverter', (time) => {
  const d = new Date(1970, 0);

  // ns to ms
  d.setMilliseconds(time / 1e6);
  return d.toLocaleDateString();
});

Vue.filter('markdown', (source, safe) => (safe ? safeMd.render(source) : unsafeMd.render(source)));
