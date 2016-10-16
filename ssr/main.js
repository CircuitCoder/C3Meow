const SSR = require('vue-server-renderer');
const fs = require('fs');
const express = require('express');
const path = require('path');

const renderer = SSR.createBundleRenderer(fs.readFileSync('./ssrres/static/js/app.js', 'utf-8'));
const index = fs.readFileSync('./ssrres/index.html', 'utf-8');
const parts = index.split(/\<div\ id\=.*\<\/div\>/);
const frontParts = parts[0].split(/\<title.*\<\/title\>/);

const server = express();
server.use(express.static(path.resolve(__dirname, '../ssrres'), {
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

  res.write(frontParts[0]);
 
  stream.on('data', chunk => {
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
      res.write(frontParts[1]);
      res.write(`<title>${stash}</title>`);
      res.write(buf);
    }
  })
  .on('end', () => {
    res.end(parts[1]);
  })
  .on('error', err => {
    res.sendStatus(500);
    console.error(err.stack);
  });
});

const config = require('../config');
server.listen(config.ssr.port, () => {
  console.log(`Server up at ${config.ssr.port}`);
});
