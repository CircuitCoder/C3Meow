const loaderUtils = require('loader-utils');
const path = require('path');

module.exports = function(_content) {
  this.cacheable && this.cacheable();
  if(!this.emitFile) throw new Error('emitFile is required from module system');

  const content = JSON.stringify(this.exec(_content, this.resourcePath));
  const basename = path.basename(this.resourcePath, '.json.gen.js');

  const targetName = process.env.NODE_ENV === 'production' ? `${basename}.[hash].json` : `${basename}.json`;

  const url = loaderUtils.interpolateName(this, targetName, {
    content: content
  });

  const publicPath = '__webpack_public_path__ + ' + JSON.stringify(url);

  this.emitFile(url, content);
  return 'module.exports = ' + publicPath + ';';
}
