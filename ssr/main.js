const SSR = require('vue-server-renderer');
const fs = require('fs');
const express = require('express');
const path = require('path');

const renderer = SSR.createBundleRenderer(fs.readFileSync('./ssrres/static/js/app.js', 'utf-8'));
const index = fs.readFileSync('./ssrres/index.html', 'utf-8');
const parts = index.split(/\<div\ id\=.*\<\/div\>/);

const server = express();
server.use(express.static(path.resolve(__dirname, '../ssrres'), {
  index: false,
}));

server.get('*', (req, res) => {
  const stream = renderer.renderToStream({
    url: req.url
  });

  res.write(parts[0]);
  stream.pipe(res).on('end', () => {
    res.write(parts[1]);
  });
});

const config = require('../config');
server.listen(config.ssr.port, () => {
  console.log(`Server up at ${config.ssr.port}`);
});
