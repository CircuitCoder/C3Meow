import Vue from 'vue';

import tmpl from './tmpl/transformer.html';
import './style/transformer.scss';

function getTransform(stage, direction, delta) {
  if(stage === 'visible') return 'translate(0,0)';

  let tx = 0;
  let ty = 0;
  if(direction === 'up') ty = -delta;
  else if(direction === 'down') ty = delta;
  else if(direction === 'left') tx = -delta;
  else if(direction === 'right') tx = delta;

  if(stage === 'entering') return `translate(${-tx}px, ${-ty}px)`;
  else if(stage === 'leaving') return `translate(${tx}px, ${ty}px)`;
  else return 'translate(0,0)';
}

export default Vue.component('transformer', {
  template: tmpl,
  // TODO: validator
  data: () => ({
    content: '',
    transform: '',
    direction: '',
    stage: '',
    delta: '',

    duration: 300,
    delay: 0,
  }),
  watch: {
    stage: 'update',
  },
  methods: {
    leave() {
      this.stage = 'leaving';

      setTimeout(() => {
        this.$remove();
      }, this.duration);
    },

    enter(target) {
      this.stage = 'entering';
      this.$mount().$appendTo(target);

      setTimeout(() => {
        this.stage = 'visible';
      }, 0);
    },

    update() {
      this.transform = getTransform(this.stage, this.direction, this.delta);
    },
  },
});
