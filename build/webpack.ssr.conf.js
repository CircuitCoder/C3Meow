const merge = require('webpack-merge');
const config = require('../config')
const utils = require('./utils')
const prodWebpackConfig = require('./webpack.prod.conf');

const ExtractTextPlugin = require('extract-text-webpack-plugin')
const webpack = require('webpack')

const webpackConfig = merge(prodWebpackConfig, {
  externals: [
    { 'highlight.js/styles/solarized-dark.css': false },
    /^(?!\.)/
  ],
  target: 'node',
  output: {
    libraryTarget: 'commonjs2',
    filename: utils.assetsPath('js/[name].js'),
    chunkFilename: utils.assetsPath('js/[id].[chunkhash].js')
  },
});

for(let i = 0; i < webpackConfig.plugins.length; ++i)
  if(webpackConfig.plugins[i] instanceof webpack.optimize.CommonsChunkPlugin)
    webpackConfig.plugins.splice(i, 1);

module.exports = webpackConfig;
