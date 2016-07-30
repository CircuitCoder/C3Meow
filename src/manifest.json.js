const config = require('./config');

// Because a bug of webpack (#667), we cannot inject image pathes into here

module.exports = {
  dir: config.base,
  name: config.title,
  short_name: config.title,
  start_url: './',
  display: 'standalone',
  theme_color: '#FFF',
  background_color: '#FFF',
};
