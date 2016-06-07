import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const state = {
  headerLarge: true,
  headerType: "home",
  headerShown: "true", // For animation
  
  post: {},
  list: []
};
