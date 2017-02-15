const config = require('./config');

// Because a bug of webpack (#667), we cannot inject image pathes into here

const result = {
  dir: config.base,
  name: config.title,
  short_name: config.title,
  start_url: './',
  display: 'standalone',
  theme_color: '#FFF',
  background_color: '#FFF',
  icons: [
    {
      src: require('./assets/touchicon@0.5x.png'),
      sizes: '32x32',
      type: 'image/png',
    },
    {
      src: require('./assets/touchicon@1x.png'),
      sizes: '64x64',
      type: 'image/png',
    },
    {
      src: require('./assets/touchicon@2x.png'),
      sizes: '128x128',
      type: 'image/png',
    },
    {
      src: require('./assets/touchicon@3x.png'),
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: require('./assets/touchicon180.png'),
      sizes: '180x180',
      type: 'image/png',
    },
  ],
};

module.exports = `${JSON.stringify(result)}`;
