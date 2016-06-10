import Vue from 'vue';

Vue.filter('timeConverter', (time) => {
  const d = new Date(1970, 0);

  // ns to ms
  d.setMilliseconds(time / 1e6);
  return d.toLocaleDateString();
});
