const SSR = require('vue-server-renderer');
const fs = require('fs');
const express = require('express');
const path = require('path');

const MarkdownIt = require('markdown-it');
const H2T = require('html-to-text');
const he = require('he');

const appConfig = require('../src/config');

const compileMd = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
});

function transformCont(src) {
  const html = compileMd.render(src);
  const text = H2T.fromString(html, {
    wordwrap: false,
    linkHrefBaseUrl: appConfig.frontend,
    hideLinkHrefIfSameAsText: true,
    singleNewLineParagraphs: true,
  });
  const escaped = he.encode(text);
  return escaped;
}

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
const frontParts = parts[0].split(/\<title\>.*\<\/title\>\<meta property=og[^>]*\>\<meta property=og[^>]*\>/);
const backPart = parts[1]
  .replace('<script type=text/javascript src=/static/js/manifest.js></script>', '')
  .replace('<script type=text/javascript src=/static/js/app.js>','<script type=text/javascript src=/static/js/manifest.js></script><script type=text/javascript src=/static/js/vendor.js></script><script type=text/javascript src=/static/js/app.js>');

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

server.get('*', (req, res) => {
  const context = {
    url: req.url
  };

  const stream = renderer.renderToStream(context);

  let buf = '';

  let firstChunk = false;

  stream.on('data', chunk => {
    // Wait for error
    if(!firstChunk) {
      firstChunk = true;
      res.write(frontParts[0]);

      const transformed = transformCont(context.cont);
      res.write(`<title>${context.title}</title>`);
      res.write(`<meta property=og:title content="${context.title}">`);
      res.write(`<meta property=og:description content="${transformed}">`);
      res.write(`<meta property=og:url content="${appConfig.frontend}${req.url}">`);
      res.write(`<meta property=og:image content="${appConfig.frontend}/${distManifest['favicon@3x.png']}">`);
      res.write(`<meta property=og:image:secure_url content="${appConfig.frontend}/${distManifest['favicon@3x.png']}">`);
      res.write(`<meta property=og:image:width content="192">`);
      res.write(`<meta property=og:image:height content="192">`);
      res.write(`<meta property=og:image:alt content="${appConfig.title}">`);

      res.write(frontParts[1]);
    }

    res.write(chunk);
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
