import Vue from 'vue';

import tmpl from './tmpl/transformer.tmpl.html';
import './style/transformer.scss';

export default Vue.component('transformer', tmpl({
  // TODO: validator
  props: {
    direction: String,
    delta: Number,
    duration: {
      type: Number,
      default: 300,
    },
    delay: {
      type: Number,
      default: 0,
    },

    leaveHook: Boolean,
  },

  data: () => ({
    stage: 'entering',
    transform: '',

    transcb: null,
  }),

  watch: {
    leaveHook: 'leave',
  },

  created() {
    if(this.$isServer) {
      this.stage = 'visible';
      this.update();
    }
  },

  methods: {
    leave() {
      if(this.stage === 'leaving')
        return new Promise(resolve => {
          this.afterLeave(resolve);
        });

      return new Promise(resolve => {
        this.stage = 'leaving';
        this.update();

        this.transcb = () => {
          this.$emit('left');
          resolve();
        };
      });
    },

    enter() {
      return new Promise(resolve => {
        if(this.$isServer) {
          this.stage = 'visible';
          this.update();
          return void resolve();
        }

        this.stage = 'entering';
        this.update();

        this.$nextTick(() => {
          this.$el.offsetHeight; // eslint-disable-line no-unused-expressions
          // To force a DOM repaint

          setTimeout(() => {
            this.stage = 'visible';
            this.update();

            this.transcb = () => {
              resolve();
            };
          }, this.delay);
        });
      });
    },

    appear() {
      this.stage = 'visible';
      this.update();
    },

    transend() {
      if(this.transcb) this.transcb();
    },

    update() {
      this.transform = this.generate();
    },

    generate() {
      const stage = this.stage;
      const direction = this.direction;
      const delta = this.delta;

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
    },
  },
}));
