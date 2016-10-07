// see http://vuejs-templates.github.io/webpack for documentation.
var path = require('path')

const assetsRoot = process.env.C3_BUILD_TYPE == 'ssr'
  ? path.resolve(__dirname, '../ssrres')
  : path.resolve(__dirname, '../dist');

module.exports = {
  build: {
    env: require('./prod.env'),
    index: path.resolve(assetsRoot, './index.html'),
    assetsRoot: assetsRoot,
    assetsSubDirectory: 'static',
    assetsPublicPath: '/',
    productionSourceMap: true,
    // gzip off by default as many popular static hosts such as
    // surge or netlify already gzip all static assets for you
    productionGzip: false,
    productionGzipExtensions: ['js', 'css']
  },
  dev: {
    env: require('./dev.env'),
    port: 8080,
    proxyTable: {}
  },
  ssr: {
    index: path.resolve(__dirname, '../ssrres/index.html'),
    port: 3820,
  }
}
