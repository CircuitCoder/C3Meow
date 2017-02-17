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

const renderer = SSR.createBundleRenderer(
  fs.readFileSync(path.resolve(basepath, './ssrres/static/js/app.js'), 'utf-8')
);
const index = fs.readFileSync(path.resolve(basepath, './ssrres/index.html'), 'utf-8');
const parts = index.split(/\<div\ id\=.*\<\/div\>/);
const frontParts = parts[0].split(/\<title.*\<\/title\>/);
const backPart = parts[1]
  .replace('<script type=text/javascript src=/static/js/manifest.js></script>', '')
  .replace('<script type=text/javascript src=/static/js/app.js>','<script type=text/javascript src=/static/js/manifest.js></script><script type=text/javascript src=/static/js/vendor.js></script><script type=text/javascript src=/static/js/app.js>');

const server = express();

server.use((req, res, next) => {
  if(req.path.substr(1) in assetsMapping)
    return res.sendFile(assetsMapping[req.path.substr(1)]);
  return next();
});

server.use(express.static(path.resolve(basepath, 'ssrres'), {
  index: false,
}));

server.get('*', (req, res) => {
  const stream = renderer.renderToStream({
    url: req.url
  });

  let tagClosing = 0;
  let tagOpening = 0;
  let stash = '';
  let buf = '';

  let firstChunk = false;

  stream.on('data', chunk => {
    // Wait for error
    if(!firstChunk) {
      firstChunk = true;
      res.write(frontParts[0]);
    }
 
    if(tagOpening > 2) return void res.write(chunk);

    const str = chunk.toString('utf-8');

    buf += str;
    for(const i of str) {
      if(i === '<') ++tagOpening;
      else if(i === '>') ++tagClosing;
      else if(tagClosing === 2 && tagOpening === 2) stash += i;

      if(tagOpening > 2) break;
    }

    if(tagOpening > 2) {
      res.write(`<title>${stash}</title>`);
      res.write(frontParts[1]);
      res.write(buf);
    }
  })
  .on('end', () => {
    res.end(backPart);
  })
  .on('error', err => {
    if(err.code) 
      return res.status(err.code).end();

    console.error(err.stack);
    res.end();
  });
});

const config = require('../config');
server.listen(config.ssr.port, () => {
  console.log(`Server up at ${config.ssr.port}`);
});
