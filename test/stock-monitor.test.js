const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

function loadStockMonitor(mocks = {}) {
  const filename = path.resolve(__dirname, '../src/main/utils/stockMonitor.js');
  const transformed = fs
    .readFileSync(filename, 'utf8')
    .replace("import stockUtils from './stock';", "const stockUtils = require('./stock');")
    .replace("import dingtalkUtils from './dingtalk';", "const dingtalkUtils = require('./dingtalk');")
    .replace("import db from './db';", "const db = require('./db');")
    .replace("import { stripDisplayHtml } from './displayText';", "const { stripDisplayHtml } = require('./displayText');")
    .replace(/export default\s*\{/, 'module.exports = {');

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  mod.require = function requireForTest(request) {
    if (request === './stock') return mocks.stockUtils || {};
    if (request === './dingtalk') return mocks.dingtalkUtils || {};
    if (request === './db') return mocks.db || {};
    if (request === './displayText') {
      return {
        stripDisplayHtml(text = '') {
          return String(text)
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
        }
      };
    }
    return originalRequire(request);
  };
  mod._compile(transformed, filename);
  return mod.exports;
}

const stockMonitor = loadStockMonitor();

const htmlStockInfo = stockMonitor.parseStockLine(
  '<span class="stock-color-green">ST京机  8.21/-0.48%  80.7700W  当天收益:-12.00/持有收益:-266.10</span>',
  { code: '000821' }
);

assert.deepStrictEqual(
  {
    code: htmlStockInfo.code,
    name: htmlStockInfo.name,
    price: htmlStockInfo.price,
    percentage: htmlStockInfo.percentage,
    sealAmount: htmlStockInfo.sealAmount
  },
  {
    code: '000821',
    name: 'ST京机',
    price: 8.21,
    percentage: -0.48,
    sealAmount: 80.77
  }
);

let capturedOptions = null;
const monitorWithMocks = loadStockMonitor({
  db: {
    async get(key) {
      if (key === 'display_shares_list') {
        return [{ code: '000821', name: 'ST京机' }];
      }
      return null;
    }
  },
  stockUtils: {
    getData(_stocks, callback, options) {
      capturedOptions = options;
      callback('');
    }
  }
});

monitorWithMocks.checkStocks();

setImmediate(() => {
  assert.deepStrictEqual(capturedOptions, {
    showBuy1Amount: true,
    showStockTodayProfit: false,
    showStockHoldingProfit: false,
    showStockTotalTodayProfit: false,
    showStockTotalHoldingProfit: false,
    stockColorMode: 'none'
  });
  console.log('stock monitor tests passed');
});
