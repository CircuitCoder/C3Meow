import Vue from 'vue';

import tmpl from './tmpl/avatar.tmpl.html';

import backupURL from './assets/avatar.svg';

export default Vue.component('avatar', tmpl({
  data: () => ({
    primaryShown: false,
    backupURL,
  }),
  props: {
    src: String,
  },
  methods: {
    showPrimary() {
      this.primaryShown = true;
    },
  },
}));
