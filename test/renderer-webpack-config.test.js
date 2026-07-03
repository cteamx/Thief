const assert = require('assert');

const rendererConfig = require('../.electron-vue/webpack.renderer.config');
const externals = rendererConfig.externals.flat();

assert(
  !externals.includes('axios'),
  'axios must be bundled into the renderer to avoid runtime require failures before pages mount'
);

console.log('renderer webpack config tests passed');
