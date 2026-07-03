const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

function loadStockUtils(mocks = {}) {
  const filename = path.resolve(__dirname, '../src/main/utils/stock.js');
  const transformed = fs
    .readFileSync(filename, 'utf8')
    .replace(/export default stockUtils;\s*$/, 'module.exports = stockUtils;');

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  mod.require = function requireForTest(request) {
    if (request === 'superagent') return mocks.request || {};
    if (request === 'superagent-charset') return function noop() {};
    if (request === './db') return { default: mocks.db || {} };
    return originalRequire(request);
  };
  mod._compile(transformed, filename);
  return mod.exports;
}

function createPagedRequest(handlers) {
  return {
    get(url) {
      return {
        query(query) {
          return {
            timeout() {
              const handler = handlers[url];
              if (!handler) {
                return Promise.reject(new Error(`Unexpected url: ${url}`));
              }
              return Promise.resolve(handler(query));
            }
          };
        }
      };
    }
  };
}

function createEastmoneyPage(start, count) {
  return Array.from({ length: count }, (_, index) => {
    const code = String(start + index).padStart(6, '0');
    return {
      f12: code,
      f14: `Stock${code}`
    };
  });
}

(async () => {
  const eastmoneyQueries = [];
  const eastmoneyRequest = createPagedRequest({
    'http://80.push2.eastmoney.com/api/qt/clist/get': query => {
      eastmoneyQueries.push({ ...query });
      if (query.pn === 1) {
        return {
          body: {
            data: {
              total: 201,
              diff: createEastmoneyPage(1, 100)
            }
          }
        };
      }

      if (query.pn === 2) {
        return {
          body: {
            data: {
              total: 201,
              diff: createEastmoneyPage(101, 100)
            }
          }
        };
      }

      if (query.pn === 3) {
        return {
          body: {
            data: {
              total: 201,
              diff: createEastmoneyPage(201, 1)
            }
          }
        };
      }

      return {
        body: {
          data: {
            total: 2501,
            diff: []
          }
        }
      };
    }
  });

  const stockUtilsWithPaging = loadStockUtils({ request: eastmoneyRequest });
  stockUtilsWithPaging.stockCache = {};
  const fetchedCount = await stockUtilsWithPaging.tryEastmoneyApi();

  assert.strictEqual(fetchedCount, 201);
  assert.strictEqual(stockUtilsWithPaging.getUniqueStockCount(), 201);
  assert.strictEqual(eastmoneyQueries.length, 3);
  assert.strictEqual(eastmoneyQueries[0].pn, 1);
  assert.strictEqual(eastmoneyQueries[1].pn, 2);
  assert.strictEqual(eastmoneyQueries[2].pn, 3);
  assert.strictEqual(eastmoneyQueries[0].pz, 100);
  assert.ok(eastmoneyQueries[0].fs.includes('m:0+t:81+s:2048'));
  assert.deepStrictEqual(stockUtilsWithPaging.stockCache['000001'], {
    code: '000001',
    name: 'Stock000001',
    fullCode: '000001',
    exchange: 'SZ'
  });
  assert.strictEqual(stockUtilsWithPaging.stockCache.Stock000001, undefined);

  const stockUtilsWithFallback = loadStockUtils();
  let usedEastmoneyFallback = false;
  let usedSinaFallback = false;

  stockUtilsWithFallback.saveStockCacheToStorage = () => true;
  stockUtilsWithFallback.fetchAllStockCodesFromMairui = async function fetchAllStockCodesFromMairuiMock() {
    this.stockCache = {};
    for (let index = 1; index <= 3000; index += 1) {
      this.setStockCacheEntry({
        code: String(index).padStart(6, '0'),
        name: `M${index}`
      });
    }
    return 3000;
  };
  stockUtilsWithFallback.tryEastmoneyApi = async function tryEastmoneyApiMock() {
    usedEastmoneyFallback = true;
    for (let index = 3001; index <= 5100; index += 1) {
      this.setStockCacheEntry({
        code: String(index).padStart(6, '0'),
        name: `E${index}`
      });
    }
    return 2100;
  };
  stockUtilsWithFallback.trySinaApi = async function trySinaApiMock() {
    usedSinaFallback = true;
    return 0;
  };

  const totalCount = await stockUtilsWithFallback.fetchAllStockCodesFromEastMoney();

  assert.strictEqual(usedEastmoneyFallback, true);
  assert.strictEqual(usedSinaFallback, true);
  assert.strictEqual(totalCount, 5100);
  assert.strictEqual(stockUtilsWithFallback.getUniqueStockCount(), 5100);

  const normalized = stockUtilsWithFallback.normalizeStockCache({
    '000001': 'PingAn',
    '600000': 'PfBank'
  });
  stockUtilsWithFallback.stockCache = normalized;
  stockUtilsWithFallback.isStockSearchIndexDirty = true;
  stockUtilsWithFallback.isStockCacheInitialized = true;
  assert.strictEqual(stockUtilsWithFallback.getUniqueStockCount(), 2);
  assert.deepStrictEqual(stockUtilsWithFallback.stockCache['000001'], {
    code: '000001',
    name: 'PingAn',
    fullCode: '000001',
    exchange: 'SZ'
  });
  assert.strictEqual(stockUtilsWithFallback.stockCache.PingAn, undefined);
  assert.deepStrictEqual(
    stockUtilsWithFallback.searchStocks('Ping'),
    [{ code: '000001', name: 'PingAn' }]
  );

  console.log('stock cache fetch tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
