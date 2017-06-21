const SSR = require('vue-server-renderer');
const fs = require('fs');
const express = require('express');
const path = require('path');

const basepath = path.resolve(__dirname, './..');

const ssrManifest = require(path.resolve(basepath, 'ssrres/wp-manifest.json'));
const distManifest = require(path.resolve(basepath, 'dist/wp-manifest.json'));
const assetsMapping = {};
for(const chunk in ssrManifest)
  if(chunk in distManifest)
    assetsMapping[ssrManifest[chunk]] = path.resolve(basepath, 'dist', distManifest[chunk]);
assetsMapping['static/js/vendor.js'] = path.resolve(basepath, 'dist', distManifest['vendor.js']);
assetsMapping['static/js/vendor.js.map'] = path.resolve(basepath, 'dist', distManifest['vendor.js.map']);

let index = fs.readFileSync(path.resolve(basepath, './ssrres/index.html'), 'utf-8');
const [, originalTitle] = index.match(/\<title\>(.*)\<\/title\>/);

index = index
  .replace(/\<div\ id\=.*\<\/div\>/, "<!--vue-ssr-outlet-->")
  .replace(/\<title.*\<\/title\>/, "<title>{{title}}</title>")
  .replace('<script type=text/javascript src=/static/js/manifest.js></script>', '')
  .replace('<script type=text/javascript src=/static/js/app.js>',
    '<script type=text/javascript src=/static/js/manifest.js></script><script type=text/javascript src=/static/js/vendor.js></script><script type=text/javascript src=/static/js/app.js>');

const renderer = SSR.createBundleRenderer(
  fs.readFileSync(path.resolve(basepath, './ssrres/static/js/app.js'), 'utf-8'),
  {
    template: index,
    runInNewContext: true,
  }
);

const server = express();

// Remap static assets to staticly built ones
server.use((req, res, next) => {
  if(req.path.substr(1) in assetsMapping)
    return res.sendFile(assetsMapping[req.path.substr(1)]);
  return next();
});

// Static assets in ssrres (sw.js ...)
server.use(express.static(path.resolve(basepath, 'ssrres'), {
  index: false,
}));

// Static assets in dist (source maps ...)
server.use(express.static(path.resolve(basepath, 'dist'), {
  index: false,
}));

server.get('*', (req, res, next) => {
  renderer.renderToString({
    url: req.url,
    title: originalTitle,
  }, (err, html) => {
    if(err) {
      if(err.code) res.end(html);
      else next(err);
    } else
      res.end(html);
  });
});

const config = require('../config');
server.listen(config.ssr.port, () => {
  console.log(`Server up at ${config.ssr.port}`);
});
