const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

function loadDisplayTextUtils() {
  const filename = path.resolve(__dirname, '../src/main/utils/displayText.js');
  const transformed = fs
    .readFileSync(filename, 'utf8')
    .replace(/export\s*\{\s*stripDisplayHtml,\s*formatTrayTitle\s*\}\s*$/, 'module.exports = { stripDisplayHtml, formatTrayTitle };');

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(transformed, filename);
  return mod.exports;
}

const { stripDisplayHtml, formatTrayTitle } = loadDisplayTextUtils();

assert.strictEqual(
  stripDisplayHtml('ST京机<br/><span class="profit profit-up">当天收益:+50.00</span>'),
  'ST京机 当天收益:+50.00'
);

assert.strictEqual(
  formatTrayTitle('ST京机<br/><span class="profit profit-up">当天收益:+50.00</span>/<span class="profit profit-down">持有收益:-20.00</span>'),
  'ST京机 \u001b[31m当天收益:+50.00\u001b[0m/\u001b[32m持有收益:-20.00\u001b[0m'
);

assert.strictEqual(
  formatTrayTitle('<span class="stock-color-red">ST京机  10.50/2.00%  持有收益:+50.00</span><br/><span class="stock-color-green">丰元股份  6.00/-2.00%  持有收益:-20.00</span>'),
  '\u001b[31mST京机 10.50/2.00% 持有收益:+50.00\u001b[0m \u001b[32m丰元股份 6.00/-2.00% 持有收益:-20.00\u001b[0m'
);

assert.strictEqual(
  formatTrayTitle('<span class="profit profit-down">&lt;-1.00&gt;</span>'),
  '\u001b[32m<-1.00>\u001b[0m'
);

console.log('display text tests passed');
