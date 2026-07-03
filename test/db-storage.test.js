const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function loadDbModule(userDataPath) {
  const filename = path.resolve(__dirname, '../src/main/utils/db.js');
  const transformed = fs
    .readFileSync(filename, 'utf8')
    .replace("import path from 'path'", "const path = require('path')")
    .replace("import fsExtra from 'fs-extra'", "const fsExtra = require('fs-extra')")
    .replace("import { app } from 'electron'", "const { app } = require('electron')")
    .replace(/export default\s*{/, 'module.exports = {');

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  mod.require = function requireForTest(request) {
    if (request === 'electron') {
      return {
        app: {
          getPath(name) {
            assert.strictEqual(name, 'userData');
            return userDataPath;
          }
        }
      };
    }
    return originalRequire(request);
  };
  mod._compile(transformed, filename);
  return mod.exports;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'thief-db-'));
const mainConfigPath = path.join(tempRoot, 'thief_data.json');
const stockCachePath = path.join(tempRoot, 'thief_stock_cache.json');

const legacyStockCache = {
  '000001': { code: '000001', name: 'Ping An Bank' }
};

fs.writeFileSync(
  mainConfigPath,
  JSON.stringify({
    current_page: 3,
    stock_code_mapping: legacyStockCache
  }, null, 2),
  'utf8'
);

const db = loadDbModule(tempRoot);

assert.strictEqual(db.init(), true);
assert.deepStrictEqual(db.get('stock_code_mapping'), legacyStockCache);

const trimmedConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf8'));
assert.strictEqual(trimmedConfig.current_page, 3);
assert.ok(!Object.prototype.hasOwnProperty.call(trimmedConfig, 'stock_code_mapping'));

const externalStockCache = JSON.parse(fs.readFileSync(stockCachePath, 'utf8'));
assert.deepStrictEqual(externalStockCache, legacyStockCache);

assert.strictEqual(db.setBatch({ current_page: 9, txt_color: '#123456' }), true);

const updatedConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf8'));
assert.strictEqual(updatedConfig.current_page, 9);
assert.strictEqual(updatedConfig.txt_color, '#123456');
assert.ok(!Object.prototype.hasOwnProperty.call(updatedConfig, 'stock_code_mapping'));

const unchangedExternalCache = JSON.parse(fs.readFileSync(stockCachePath, 'utf8'));
assert.deepStrictEqual(unchangedExternalCache, legacyStockCache);

console.log('db storage tests passed');
