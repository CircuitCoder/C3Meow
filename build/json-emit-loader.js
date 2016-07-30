const loaderUtils = require('loader-utils');
const path = require('path');

module.exports = function(_content) {
  this.cacheable && this.cacheable();
  if(!this.emitFile) throw new Error('emitFile is required from module system');

  let content = JSON.stringify(this.exec(_content, this.resourcePath));
  let basename = path.basename(this.resourcePath, '.json.js');

  let url = loaderUtils.interpolateName(this, `${basename}.[hash].json`, {
    content: content
  });

  let publicPath = '__webpack_public_path__ + ' + JSON.stringify(url);

  this.emitFile(url, content);
  return 'module.exports = ' + publicPath + ';';
}
