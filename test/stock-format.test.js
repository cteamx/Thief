const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

function loadStockUtils(fakeRequest) {
  const filename = path.resolve(__dirname, '../src/main/utils/stock.js');
  const transformed = fs
    .readFileSync(filename, 'utf8')
    .replace(/export default stockUtils;\s*$/, 'module.exports = stockUtils;');

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  mod.require = function requireForTest(request) {
    if (request === 'superagent') return fakeRequest || {};
    if (request === 'superagent-charset') return function noop() {};
    return originalRequire(request);
  };
  mod._compile(transformed, filename);
  return mod.exports;
}

function createTencentQuoteText(overrides = {}) {
  const fields = Array(50).fill('');
  fields[1] = 'ST京机';
  fields[2] = '000821';
  fields[3] = '9.50';
  fields[4] = '9.00';
  fields[9] = '9.50';
  fields[10] = '166';
  fields[32] = '-1.00';
  Object.entries(overrides).forEach(([index, value]) => {
    fields[index] = value;
  });
  return `v_sz000821="${fields.join('~')}";`;
}

function createTencentQuoteLine({ name, code, currPrice, previousClose, percentage }) {
  const fields = Array(50).fill('');
  fields[1] = name;
  fields[2] = code;
  fields[3] = currPrice;
  fields[4] = previousClose;
  fields[9] = currPrice;
  fields[10] = '166';
  fields[32] = percentage;
  return `v_sz${code}="${fields.join('~')}";`;
}

function createFakeRequest(responseText) {
  const chain = {
    buffer() {
      return chain;
    },
    charset() {
      return chain;
    },
    then(onFulfilled) {
      return Promise.resolve().then(() => onFulfilled({ text: responseText }));
    }
  };

  return {
    get() {
      return chain;
    }
  };
}

async function getStockData(stockUtils, stocks, options) {
  return new Promise(resolve => {
    stockUtils.getData(stocks, resolve, options);
  });
}

const stockUtils = loadStockUtils();

assert.strictEqual(typeof stockUtils.formatStockQuoteText, 'function');

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '9.07',
    percentage: '0.44',
    buy1AmountText: '15.7818W',
    showBuy1Amount: true
  }),
  'ST京机  9.07/0.44%  15.7818W\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '9.07',
    percentage: '0.44',
    buy1AmountText: '15.7818W',
    showBuy1Amount: false
  }),
  'ST京机  9.07/0.44%\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '10.50',
    percentage: '2.00',
    buy1AmountText: '15.7818W',
    showBuy1Amount: true,
    stockConfig: {
      cost: '10',
      buyDate: '2026-06-14',
      shares: '100'
    },
    previousClose: '10.00',
    now: new Date('2026-06-15T10:00:00+08:00'),
    profitOptions: {
      showStockTodayProfit: false,
      showStockHoldingProfit: true
    }
  }),
  '<span class="stock-color-red">ST京机  10.50/2.00%  15.7818W  持有收益:+50.00</span>\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '9.50',
    percentage: '-1.00',
    buy1AmountText: '15.7818W',
    showBuy1Amount: false,
    stockConfig: {
      cost: '10',
      buyDate: '2026-06-15',
      shares: '100'
    },
    previousClose: '9.00',
    now: new Date('2026-06-15T10:00:00+08:00'),
    profitOptions: {
      showStockTodayProfit: true,
      showStockHoldingProfit: false
    }
  }),
  '<span class="stock-color-green">ST京机  9.50/-1.00%  当天收益:-50.00</span>\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '9.50',
    percentage: '-1.00',
    buy1AmountText: '15.7818W',
    showBuy1Amount: false,
    previousClose: '9.00',
    stockConfig: {
      cost: '10',
      shares: '100'
    },
    profitOptions: {
      showStockTodayProfit: true,
      showStockHoldingProfit: true,
      showStockProfitLabel: false,
      stockProfitSeparator: ' | '
    }
  }),
  '<span class="stock-color-green">ST京机  9.50/-1.00%  -50.00 | -50.00</span>\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: '丰元股份',
    currPrice: '6.00',
    percentage: '-2.00',
    buy1AmountText: '15.7818W',
    showBuy1Amount: false,
    previousClose: '6.50',
    stockConfig: {
      cost: '5',
      shares: '200'
    },
    profitOptions: {
      showStockTodayProfit: false,
      showStockHoldingProfit: true
    }
  }),
  '<span class="stock-color-red">丰元股份  6.00/-2.00%  持有收益:+200.00</span>\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '9.50',
    percentage: '-1.00',
    buy1AmountText: '15.7818W',
    showBuy1Amount: false,
    previousClose: '9.00',
    stockConfig: {
      cost: '10',
      shares: '100'
    },
    profitOptions: {
      showStockTodayProfit: true,
      showStockHoldingProfit: true,
      stockColorMode: 'red_down_green_up'
    }
  }),
  '<span class="stock-color-red">ST京机  9.50/-1.00%  当天收益:-50.00/持有收益:-50.00</span>\n'
);

assert.strictEqual(
  stockUtils.formatStockQuoteText({
    stockName: 'ST京机',
    currPrice: '9.50',
    percentage: '-1.00',
    buy1AmountText: '15.7818W',
    showBuy1Amount: false,
    previousClose: '9.00',
    stockConfig: {
      cost: '10',
      shares: '100'
    },
    profitOptions: {
      showStockTodayProfit: true,
      showStockHoldingProfit: true,
      stockColorMode: 'none'
    }
  }),
  'ST京机  9.50/-1.00%  当天收益:-50.00/持有收益:-50.00\n'
);

(async () => {
  const stockUtilsWithQuote = loadStockUtils(createFakeRequest(createTencentQuoteText()));
  const text = await getStockData(
    stockUtilsWithQuote,
    [{ code: '000821', name: 'ST京机', cost: '10', buyDate: '2026-06-15', shares: '100' }],
    {
      showBuy1Amount: false,
      showStockTodayProfit: true,
      showStockHoldingProfit: true,
      showStockProfitLabel: true,
      stockProfitSeparator: '/',
      now: new Date('2026-06-15T10:00:00+08:00')
    }
  );

  assert.strictEqual(
    text,
    '<span class="stock-color-green">ST京机  9.50/-1.00%  当天收益:-50.00/持有收益:-50.00</span>\n'
  );

  const stockUtilsWithTwoQuotes = loadStockUtils(createFakeRequest([
    createTencentQuoteLine({
      name: 'ST京机',
      code: '000821',
      currPrice: '9.50',
      previousClose: '9.00',
      percentage: '-1.00'
    }),
    createTencentQuoteLine({
      name: '丰元股份',
      code: '002805',
      currPrice: '6.00',
      previousClose: '6.50',
      percentage: '-2.00'
    })
  ].join('')));
  const textWithTotal = await getStockData(
    stockUtilsWithTwoQuotes,
    [
      { code: '000821', name: 'ST京机', cost: '10', shares: '100' },
      { code: '002805', name: '丰元股份', cost: '5', shares: '200' }
    ],
    {
      showBuy1Amount: false,
      showStockTodayProfit: false,
      showStockHoldingProfit: true,
      showStockTotalTodayProfit: true,
      showStockTotalHoldingProfit: true,
      stockProfitSeparator: '/',
      now: new Date('2026-06-15T10:00:00+08:00')
    }
  );

  assert.strictEqual(
    textWithTotal,
    '<span class="stock-color-green">ST京机  9.50/-1.00%  持有收益:-50.00</span>\n' +
      '<span class="stock-color-red">丰元股份  6.00/-2.00%  持有收益:+200.00</span>\n' +
      '<span class="stock-color-red">总当天收益:+150.00</span>/<span class="stock-color-red">总持有收益:+150.00</span>\n'
  );

  const summaryOnlyText = await getStockData(
    stockUtilsWithTwoQuotes,
    [
      { code: '000821', name: 'ST京机', cost: '10', shares: '100' },
      { code: '002805', name: '丰元股份', cost: '5', shares: '200' }
    ],
    {
      showBuy1Amount: false,
      showStockItemData: false,
      showStockTodayProfit: false,
      showStockHoldingProfit: true,
      showStockTotalTodayProfit: true,
      showStockTotalHoldingProfit: true,
      stockProfitSeparator: '/',
      now: new Date('2026-06-15T10:00:00+08:00')
    }
  );

  assert.strictEqual(
    summaryOnlyText,
    '<span class="stock-color-red">总当天收益:+150.00</span>/<span class="stock-color-red">总持有收益:+150.00</span>\n'
  );

  console.log('stock format tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
