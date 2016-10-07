const merge = require('webpack-merge');
const config = require('../config')
const prodWebpackConfig = require('./webpack.prod.conf');
const webpack = require('webpack')

const webpackConfig = merge(prodWebpackConfig, {
  externals: /^(?!\.).*/,
  target: 'node',
  output: {
    libraryTarget: 'commonjs2',
  },
});

for(let i = 0; i < webpackConfig.plugins.length; ++i)
  if(webpackConfig.plugins[i] instanceof webpack.optimize.CommonsChunkPlugin)
    webpackConfig.plugins.splice(i, 1);

module.exports = webpackConfig;
