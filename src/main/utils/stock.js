'use strict';
const request = require('superagent')
require('superagent-charset')(request)
// const url = 'http://hq.sinajs.cn/list=';
//https://www.php.cn/blog/detail/24976.html
const url = 'http://qt.gtimg.cn/r=0.8409869808238q=';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/74.0.3729.169 Safari/537.36',
}

// 东方财富API地址
const EASTMONEY_API_URL = 'http://80.push2.eastmoney.com/api/qt/clist/get';
const EASTMONEY_A_SHARE_FILTER = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
const MIN_EXPECTED_A_SHARE_COUNT = 5300;
const EASTMONEY_PAGE_SIZE = 100;
const EASTMONEY_FETCH_CONCURRENCY = 8;
const EASTMONEY_PAGE_TIMEOUT_MS = 15000;
const SINA_PAGE_SIZE = 2000;

const stockUtils = {
    stockCache: {},
    stockSearchIndex: [],
    isStockSearchIndexDirty: true,
    normalizeStockCode(code) {
        const normalized = String(code || '')
            .trim()
            .replace(/^(sh|sz|bj)/i, '');
        return /^\d{6}$/.test(normalized) ? normalized : '';
    },

    inferExchangeFromCode(code, fullCode, exchange) {
        const normalizedExchange = String(exchange || '').trim().toUpperCase();
        if (normalizedExchange) {
            return normalizedExchange;
        }

        const normalizedFullCode = String(fullCode || '').trim();
        if (normalizedFullCode.includes('.')) {
            const suffix = normalizedFullCode.split('.').pop().trim().toUpperCase();
            if (suffix) {
                return suffix;
            }
        }

        if (/^bj/i.test(normalizedFullCode)) {
            return 'BJ';
        }
        if (/^sh/i.test(normalizedFullCode)) {
            return 'SH';
        }
        if (/^sz/i.test(normalizedFullCode)) {
            return 'SZ';
        }
        if (code.startsWith('6')) {
            return 'SH';
        }
        if (code.startsWith('4') || code.startsWith('8')) {
            return 'BJ';
        }
        return 'SZ';
    },

    createNormalizedStock(stockInfo) {
        if (!stockInfo) {
            return null;
        }

        const code = this.normalizeStockCode(stockInfo.code);
        const name = String(stockInfo.name || '').trim();
        if (!code || !name) {
            return null;
        }

        const fullCode = String(stockInfo.fullCode || code).trim() || code;
        return {
            code,
            name,
            fullCode,
            exchange: this.inferExchangeFromCode(code, fullCode, stockInfo.exchange)
        };
    },

    insertStockCacheEntry(cache, stockInfo) {
        if (!cache || !stockInfo) {
            return false;
        }

        const normalizedStock = this.createNormalizedStock(stockInfo);
        if (!normalizedStock) {
            return false;
        }

        cache[normalizedStock.code] = normalizedStock;
        return true;
    },

    setStockCacheEntry(stockInfo) {
        const inserted = this.insertStockCacheEntry(this.stockCache, stockInfo);
        if (inserted) {
            this.isStockSearchIndexDirty = true;
        }
        return inserted;
    },

    normalizeStockCache(cache) {
        const normalizedCache = {};
        if (!cache || typeof cache !== 'object') {
            return normalizedCache;
        }

        Object.entries(cache).forEach(([key, value]) => {
            if (value && typeof value === 'object' && value.code && value.name) {
                this.insertStockCacheEntry(normalizedCache, value);
                return;
            }

            if (typeof value === 'string') {
                this.insertStockCacheEntry(normalizedCache, {
                    code: key,
                    name: value
                });
            }
        });

        return normalizedCache;
    },

    getUniqueStockCount() {
        return Object.keys(this.stockCache).length;
    },

    async fetchAndMergeStockCache(fetcher) {
        const previousCache = this.normalizeStockCache(this.stockCache);
        await fetcher.call(this);
        this.stockCache = this.normalizeStockCache(Object.assign({}, previousCache, this.stockCache));
        this.isStockSearchIndexDirty = true;
        return this.getUniqueStockCount();
    },

    rebuildStockSearchIndex() {
        const dedupedMap = new Map();
        Object.values(this.stockCache).forEach(stockInfo => {
            if (!stockInfo || typeof stockInfo !== 'object' || !stockInfo.code || !stockInfo.name) {
                return;
            }
            const normalizedStock = this.createNormalizedStock(stockInfo);
            if (normalizedStock && !dedupedMap.has(normalizedStock.code)) {
                dedupedMap.set(normalizedStock.code, normalizedStock);
            }
        });
        this.stockSearchIndex = Array.from(dedupedMap.values());
        this.isStockSearchIndexDirty = false;
    },

    ensureStockSearchIndex() {
        if (this.isStockSearchIndexDirty) {
            this.rebuildStockSearchIndex();
        }
        return this.stockSearchIndex;
    },

    parseJsonResponse(response) {
        if (!response) {
            return null;
        }

        if (response.body && typeof response.body === 'object') {
            return response.body;
        }

        if (typeof response.body === 'string' && response.body.trim()) {
            try {
                return JSON.parse(response.body);
            } catch (error) {
                return null;
            }
        }

        if (typeof response.text === 'string' && response.text.trim()) {
            try {
                return JSON.parse(response.text);
            } catch (error) {
                return null;
            }
        }

        return null;
    },

    async fetchEastmoneyPage(page) {
        let lastError = null;

        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                const response = await request
                    .get(EASTMONEY_API_URL)
                    .query({
                        pn: page,
                        pz: EASTMONEY_PAGE_SIZE,
                        po: 1,
                        np: 1,
                        ut: 'bd1d9ddb04089700cf9c27f6f7426281',
                        fltt: 2,
                        invt: 2,
                        fid: 'f3',
                        fs: EASTMONEY_A_SHARE_FILTER,
                        fields: 'f12,f14'
                    })
                    .timeout(EASTMONEY_PAGE_TIMEOUT_MS);

                const payload = this.parseJsonResponse(response);
                const data = payload && payload.data ? payload.data : null;
                const stocks = data && Array.isArray(data.diff) ? data.diff : [];

                return {
                    total: Number(data && data.total) || 0,
                    stocks
                };
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, attempt * 300));
            }
        }

        console.log(`eastmoney page ${page} fetch failed:`, lastError ? lastError.message : 'unknown error');
        return null;
    },
    isStockCacheInitialized: false, // 添加标志位

    // 从本地存储加载股票缓存
    async loadStockCacheFromStorage() {
        try {
            const db = require('./db').default;
            const storedCache = await db.get('stock_code_mapping');
            const normalizedCache = this.normalizeStockCache(storedCache);
            if (Object.keys(normalizedCache).length > 0) {
                this.stockCache = normalizedCache;
                this.isStockSearchIndexDirty = true;
                this.isStockCacheInitialized = true;
                console.log(`从本地存储加载了 ${Object.keys(this.stockCache).length} 条股票数据`);
                return true;
            }
        } catch (error) {
            console.error('从本地存储加载股票缓存失败:', error);
        }
        return false;
    },

    // 保存股票缓存到本地存储
    saveStockCacheToStorage() {
        try {
            const db = require('./db').default;
            this.stockCache = this.normalizeStockCache(this.stockCache);
            this.isStockSearchIndexDirty = true;
            db.setBatch({
                stock_code_mapping: this.stockCache,
                stock_cache_update_time: new Date().toISOString()
            });
            console.log(`保存了 ${Object.keys(this.stockCache).length} 条股票数据到本地存储`);
            return true;
        } catch (error) {
            console.error('保存股票缓存到本地存储失败:', error);
            return false;
        }
    },

    async initializeStockCache() {
        if (!this.isStockCacheInitialized) {
            // 首先尝试从本地加载
            if (!await this.loadStockCacheFromStorage()) {
                // 如果本地没有数据，则从API获取
                console.log('本地无股票数据缓存，从API获取...');
                await this.fetchAllStockCodesFromEastMoney();
            }
            this.isStockCacheInitialized = true;
        }
    },

    // 使用迈瑞API获取全A股股票数据
    async fetchAllStockCodesFromMairui() {
        console.log('开始从迈瑞API获取股票数据...');
        
        try {
            const response = await request
                .get('https://api.mairuiapi.com/hslt/list/LICENCE-66D8-9F96-0C7F0FBCD073')
                .timeout(30000)
                .buffer(true)
                .parse(request.parse.text); // 禁用自动JSON解析，作为文本处理
            
            let stockData = null;
            
            if (response.text) {
                try {
                    stockData = JSON.parse(response.text);
                    console.log(`从迈瑞API成功解析JSON，获取到 ${stockData.length} 条股票数据`);
                } catch (parseError) {
                    console.warn('JSON解析失败，尝试修复数据:', parseError.message);
                    console.log('原始响应长度:', response.text.length);
                    
                    // 尝试修复被截断的JSON
                    let fixedText = response.text;
                    
                    // 如果不以]结尾，说明被截断了
                    if (!fixedText.endsWith(']')) {
                        // 找到最后一个完整的对象
                        const lastCompleteIndex = fixedText.lastIndexOf('}');
                        if (lastCompleteIndex > 0) {
                            fixedText = fixedText.substring(0, lastCompleteIndex + 1) + ']';
                            console.log('尝试修复JSON...');
                            
                            try {
                                stockData = JSON.parse(fixedText);
                                console.log(`修复后成功解析JSON，获取到 ${stockData.length} 条股票数据`);
                            } catch (fixError) {
                                console.error('修复后仍无法解析:', fixError.message);
                                return 0;
                            }
                        } else {
                            console.error('无法找到完整的JSON对象');
                            return 0;
                        }
                    }
                }
            } else {
                console.error('迈瑞API没有返回文本数据');
                return 0;
            }
            
            if (stockData && Array.isArray(stockData)) {
                // 处理数据格式转换
                stockData.forEach(stock => {
                    if (stock.dm && stock.mc) {
                        // 提取纯代码（去掉交易所后缀）
                        const pureCode = stock.dm.split('.')[0];
                        
                        // 将数据存储到缓存中
                        this.stockCache[pureCode] = {
                            code: pureCode,
                            name: stock.mc.trim(),
                            fullCode: stock.dm, // 保留完整代码
                            exchange: stock.jys
                        };
                        
                        // 同时以名称为键存储，便于按名称搜索
                        this.stockCache[stock.mc.trim()] = {
                            code: pureCode,
                            name: stock.mc.trim(),
                            fullCode: stock.dm,
                            exchange: stock.jys
                        };
                    }
                });
                
                console.log(`迈瑞API数据处理完成，缓存中共有 ${Object.keys(this.stockCache).length} 条记录`);
                this.stockCache = this.normalizeStockCache(this.stockCache);
                this.isStockSearchIndexDirty = true;
                return stockData.length;
            } else {
                console.error('迈瑞API返回数据格式不正确');
                return 0;
            }
        } catch (error) {
            console.error('迈瑞API获取失败:', error);
            return 0;
        }
    },

    // 更新获取股票数据的主方法
    async fetchAllStockCodesFromEastMoney() {
        console.log('开始获取股票数据...');
        this.stockCache = {}; // 清空现有缓存
        
        try {
            // 方法1: 优先使用东方财富分页 API
            let count = await this.fetchAndMergeStockCache(this.tryEastmoneyApi);
            
            // 方法2: 如果东方财富数据不够，尝试新浪财经补充
            if (count < MIN_EXPECTED_A_SHARE_COUNT) {
                console.log('东方财富数据量不足，尝试新浪财经作为补充...');
                count = await this.fetchAndMergeStockCache(this.trySinaApi);
            }
            
            // 方法3: 如果数据量还是不够，尝试迈瑞 API 补充
            if (count < MIN_EXPECTED_A_SHARE_COUNT) {
                console.log('新浪补充后数据仍不足，尝试迈瑞API作为补充...');
                count = await this.fetchAndMergeStockCache(this.fetchAllStockCodesFromMairui);
            }

            console.log(`总共获取到 ${Object.keys(this.stockCache).length} 条股票数据`);
            
            // 保存到本地存储
            this.saveStockCacheToStorage();
            
            return count;
        } catch (error) {
            console.error('获取股票数据失败:', error);
            
            // 如果所有API都失败，至少保证有基础数据
            console.log('所有API都失败，使用基础股票数据');
            this.addBasicStockData();
            this.saveStockCacheToStorage();
            
            return this.getUniqueStockCount();
        }
    },

    // 尝试东方财富API
    async tryEastmoneyApi() {
        const beforeCount = this.getUniqueStockCount();
        const addStocks = (stocks) => {
            stocks.forEach(stock => {
                if (stock && stock.f12 && stock.f14) {
                    this.setStockCacheEntry({
                        code: stock.f12,
                        name: stock.f14
                    });
                }
            });
        };

        const firstPage = await this.fetchEastmoneyPage(1);
        if (!firstPage || firstPage.stocks.length === 0) {
            return 0;
        }

        addStocks(firstPage.stocks);

        const totalPages = firstPage.total > 0
            ? Math.ceil(firstPage.total / EASTMONEY_PAGE_SIZE)
            : 1;
        const remainingPages = [];

        for (let page = 2; page <= totalPages; page += 1) {
            remainingPages.push(page);
        }

        for (let index = 0; index < remainingPages.length; index += EASTMONEY_FETCH_CONCURRENCY) {
            const batchPages = remainingPages.slice(index, index + EASTMONEY_FETCH_CONCURRENCY);
            const pageResults = await Promise.all(batchPages.map(page => this.fetchEastmoneyPage(page)));

            pageResults.forEach(result => {
                if (result && result.stocks.length > 0) {
                    addStocks(result.stocks);
                }
            });
        }

        return this.getUniqueStockCount() - beforeCount;

    },

    // 尝试新浪财经API
    async trySinaApi() {
        const beforeCount = this.getUniqueStockCount();
        let page = 1;

        try {
            while (true) {
                const response = await request
                    .get('http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData')
                    .query({
                        page,
                        num: SINA_PAGE_SIZE,
                        sort: 'symbol',
                        asc: 1,
                        node: 'hs_a',
                        symbol: '',
                        _s_r_a: 'init'
                    })
                    .timeout(15000);

                const data = this.parseJsonResponse(response);
                const stocks = Array.isArray(data) ? data : [];

                if (stocks.length === 0) {
                    break;
                }

                stocks.forEach(stock => {
                    if (stock && stock.symbol && stock.name) {
                        this.setStockCacheEntry({
                            code: stock.symbol,
                            name: stock.name,
                            fullCode: stock.symbol
                        });
                    }
                });

                if (stocks.length < SINA_PAGE_SIZE) {
                    break;
                }

                page += 1;
            }

            return this.getUniqueStockCount() - beforeCount;
        } catch (error) {
            console.log('sina paged fetch failed:', error.message);
            return 0;
        }

    },

    // 添加基础股票数据作为备用
    addBasicStockData() {
        console.log('添加基础股票数据...');
        
        const basicStocks = [
            { code: "000001", name: "平安银行" },
            { code: "000002", name: "万科A" },
            { code: "000858", name: "五粮液" },
            { code: "000876", name: "新希望" },
            { code: "002142", name: "宁波银行" },
            { code: "002415", name: "海康威视" },
            { code: "002475", name: "立讯精密" },
            { code: "300059", name: "东方财富" },
            { code: "300274", name: "阳光电源" },
            { code: "300750", name: "宁德时代" },
            { code: "600000", name: "浦发银行" },
            { code: "600036", name: "招商银行" },
            { code: "600519", name: "贵州茅台" },
            { code: "600900", name: "长江电力" },
            { code: "000858", name: "五粮液" },
            { code: "002304", name: "洋河股份" },
            { code: "600887", name: "伊利股份" },
            { code: "000063", name: "中兴通讯" },
            { code: "002230", name: "科大讯飞" },
            { code: "300015", name: "爱尔眼科" },
            { code: "300033", name: "同花顺" },
            { code: "600276", name: "恒瑞医药" },
            { code: "300142", name: "沃森生物" },
            { code: "002027", name: "分众传媒" },
            { code: "002008", name: "大族激光" },
            { code: "300144", name: "宋城演艺" },
            { code: "300347", name: "泰格医药" },
            { code: "688111", name: "金山办公" },
            { code: "688981", name: "中芯国际" },
            { code: "688099", name: "晶晨股份" }
        ];
        
        basicStocks.forEach(stock => {
            this.setStockCacheEntry({
                code: stock.code,
                name: stock.name,
                fullCode: stock.code,
                exchange: stock.code.startsWith('6') ? 'SH' : 'SZ'
            });
            
            // 缓存仅按代码存储；搜索时走 stockSearchIndex。
        });
        
        console.log(`添加了 ${basicStocks.length} 条基础股票数据`);
    },

    // 手动刷新股票数据（供设置页面调用）
    async refreshStockData() {
        this.isStockCacheInitialized = false;
        const count = await this.fetchAllStockCodesFromEastMoney();
        this.isStockCacheInitialized = true;
        return count;
    },

    // 获取股票缓存统计信息
    async getStockCacheInfo() {
        const db = require('./db').default;
        const updateTime = await db.get('stock_cache_update_time');
        return {
            count: this.getUniqueStockCount(),
            updateTime: updateTime || '未知',
            isInitialized: this.isStockCacheInitialized
        };
    },

    // 搜索股票（按代码或名称）
    searchStocks(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const results = [];
        const lowerQuery = query.toLowerCase().trim();
        const resultSet = new Set(); // 用于去重

        // 确保股票缓存已初始化
        if (!this.isStockCacheInitialized) {
            console.warn('股票缓存尚未初始化');
            return [];
        }

        // 遍历股票缓存
        for (const stockInfo of this.ensureStockSearchIndex()) {
            if (!stockInfo || typeof stockInfo !== 'object') {
                continue;
            }

            const { code, name } = stockInfo;
            if (!code || !name) {
                continue;
            }

            const lowerCode = code.toLowerCase();
            const lowerName = name.toLowerCase();

            // 精确匹配优先
            if (lowerCode === lowerQuery || lowerName === lowerQuery) {
                const resultKey = `${code}_${name}`;
                if (!resultSet.has(resultKey)) {
                    results.unshift({ code, name }); // 精确匹配放在前面
                    resultSet.add(resultKey);
                }
            }
            // 前缀匹配
            else if (lowerCode.startsWith(lowerQuery) || lowerName.startsWith(lowerQuery)) {
                const resultKey = `${code}_${name}`;
                if (!resultSet.has(resultKey)) {
                    results.push({ code, name });
                    resultSet.add(resultKey);
                }
            }
            // 包含匹配
            else if (lowerCode.includes(lowerQuery) || lowerName.includes(lowerQuery)) {
                const resultKey = `${code}_${name}`;
                if (!resultSet.has(resultKey) && results.length < 20) { // 限制包含匹配的数量
                    results.push({ code, name });
                    resultSet.add(resultKey);
                }
            }

            // 限制总结果数量
            if (results.length >= 50) {
                break;
            }
        }

        return results;
    },

    searchStockByCodeOrName(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const stockInfo of this.ensureStockSearchIndex()) {
            if (typeof stockInfo === 'object' && stockInfo.code && stockInfo.name) {
                const { code, name } = stockInfo;
                if (code.toLowerCase().startsWith(lowerQuery) || name.toLowerCase().startsWith(lowerQuery)) {
                    results.push({ code, name });
                }
            }
        }

        return results;
    },

    parsePositiveNumber(value) {
        const num = parseFloat(value);
        return Number.isFinite(num) && num > 0 ? num : null;
    },

    parseNumber(value) {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : null;
    },

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    formatDateOnly(value) {
        if (!value) return "";
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, "0");
            const day = String(value.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
        return String(value).slice(0, 10);
    },

    isBoughtToday(stockConfig, now) {
        const buyDate = stockConfig ? this.formatDateOnly(stockConfig.buyDate) : "";
        const today = this.formatDateOnly(now || new Date());
        return !buyDate || buyDate === today;
    },

    normalizeProfitOptions(options) {
        const source = options || {};
        return {
            showStockTodayProfit: source.showStockTodayProfit !== false,
            showStockHoldingProfit: source.showStockHoldingProfit !== false,
            showStockProfitLabel: source.showStockProfitLabel !== false,
            showStockItemData: source.showStockItemData !== false,
            stockProfitSeparator: source.stockProfitSeparator !== undefined ? String(source.stockProfitSeparator) : "/",
            showStockTotalTodayProfit: source.showStockTotalTodayProfit === true,
            showStockTotalHoldingProfit: source.showStockTotalHoldingProfit === true,
            stockColorMode: this.normalizeStockColorMode(source.stockColorMode || source.stock_color_mode)
        };
    },

    normalizeStockColorMode(value) {
        const mode = value || "red_up_green_down";
        return ["red_up_green_down", "red_down_green_up", "none"].includes(mode) ? mode : "red_up_green_down";
    },

    getDirectionByValue(value) {
        const num = this.parseNumber(value);
        if (num === null || num === 0) return "";
        return num > 0 ? "up" : "down";
    },

    getStockDirection({ percentage, currPrice, previousClose, stockConfig }) {
        const cost = stockConfig ? this.parseNumber(stockConfig.cost) : null;
        const current = this.parseNumber(currPrice);
        if (cost !== null && current !== null && current !== cost) {
            return current > cost ? "up" : "down";
        }

        const direction = this.getDirectionByValue(percentage);
        if (direction) return direction;

        const previous = this.parseNumber(previousClose);
        if (current === null || previous === null || current === previous) return "";
        return current > previous ? "up" : "down";
    },

    getColorClassByDirection(direction, stockColorMode) {
        const mode = this.normalizeStockColorMode(stockColorMode);
        if (!direction || mode === "none") return "";
        if (mode === "red_down_green_up") {
            return direction === "up" ? "stock-color-green" : "stock-color-red";
        }
        return direction === "up" ? "stock-color-red" : "stock-color-green";
    },

    wrapColorText(text, colorClass) {
        return colorClass ? `<span class="${colorClass}">${text}</span>` : text;
    },

    formatProfitValue(label, value, showLabel) {
        const labelText = showLabel ? label + ":" : "";
        return labelText + this.formatMoney(value);
    },

    formatMoney(value) {
        const sign = value > 0 ? "+" : "";
        return sign + value.toFixed(2);
    },

    formatProfitSpan(label, value, showLabel, stockColorMode) {
        const text = this.formatProfitValue(label, value, showLabel);
        const className = this.getColorClassByDirection(this.getDirectionByValue(value), stockColorMode);
        return this.wrapColorText(text, className);
    },

    calculateProfitValues({ currPrice, previousClose, stockConfig, now }) {
        const current = this.parseNumber(currPrice);
        const previous = this.parseNumber(previousClose);
        const cost = stockConfig ? this.parseNumber(stockConfig.cost) : null;
        const shares = stockConfig ? this.parsePositiveNumber(stockConfig.shares) : null;
        if (current === null || shares === null) {
            return {
                todayProfit: null,
                holdingProfit: null
            };
        }
        const todayBasePrice = this.isBoughtToday(stockConfig, now) ? cost : previous;

        return {
            todayProfit: todayBasePrice === null ? null : (current - todayBasePrice) * shares,
            holdingProfit: cost === null ? null : (current - cost) * shares
        };
    },

    formatProfitText({ currPrice, previousClose, stockConfig, profitOptions, now, plain }) {
        const options = this.normalizeProfitOptions(profitOptions);
        const values = this.calculateProfitValues({
            currPrice: currPrice,
            previousClose: previousClose,
            stockConfig: stockConfig,
            now: now
        });
        const parts = [];

        if (options.showStockTodayProfit && values.todayProfit !== null) {
            parts.push(plain
                ? this.formatProfitValue("当天收益", values.todayProfit, options.showStockProfitLabel)
                : this.formatProfitSpan("当天收益", values.todayProfit, options.showStockProfitLabel, options.stockColorMode));
        }
        if (options.showStockHoldingProfit && values.holdingProfit !== null) {
            parts.push(plain
                ? this.formatProfitValue("持有收益", values.holdingProfit, options.showStockProfitLabel)
                : this.formatProfitSpan("持有收益", values.holdingProfit, options.showStockProfitLabel, options.stockColorMode));
        }

        return parts.join(this.escapeHtml(options.stockProfitSeparator));
    },

    formatStockTotalText({ totals, profitOptions }) {
        const options = this.normalizeProfitOptions(profitOptions);
        const parts = [];

        if (options.showStockTotalTodayProfit && totals.todayProfit !== null) {
            parts.push(this.formatProfitSpan("总当天收益", totals.todayProfit, options.showStockProfitLabel, options.stockColorMode));
        }
        if (options.showStockTotalHoldingProfit && totals.holdingProfit !== null) {
            parts.push(this.formatProfitSpan("总持有收益", totals.holdingProfit, options.showStockProfitLabel, options.stockColorMode));
        }

        if (parts.length === 0) {
            return "";
        }
        return parts.join(this.escapeHtml(options.stockProfitSeparator)) + "\n";
    },

    addProfitTotals(totals, values) {
        if (values.todayProfit !== null) {
            totals.todayProfit = totals.todayProfit === null ? values.todayProfit : totals.todayProfit + values.todayProfit;
        }
        if (values.holdingProfit !== null) {
            totals.holdingProfit = totals.holdingProfit === null ? values.holdingProfit : totals.holdingProfit + values.holdingProfit;
        }
    },

    formatLegacyProfitText({ currPrice, stockConfig, now }) {
        const cost = stockConfig ? this.parsePositiveNumber(stockConfig.cost) : null;
        const current = this.parsePositiveNumber(currPrice);
        if (cost === null || current === null) {
            return "";
        }

        const profitRate = (current - cost) / cost * 100;
        const sign = profitRate > 0 ? "+" : "";
        const className = profitRate >= 0 ? "profit-up" : "profit-down";
        const label = this.isBoughtToday(stockConfig, now) ? "当天收益" : "持有收益";

        return `<span class="profit ${className}">${label}:${sign}${profitRate.toFixed(2)}%</span>`;
    },

    formatStockQuoteText({ stockName, currPrice, percentage, previousClose, buy1AmountText, showBuy1Amount, stockConfig, now, profitOptions }) {
        const options = profitOptions ? this.normalizeProfitOptions(profitOptions) : { stockColorMode: "none" };
        var text = stockName + '  ' + currPrice + "/" + percentage + "%";
        if (showBuy1Amount !== false) {
            text = text + '  ' + buy1AmountText;
        }
        const profitText = profitOptions
            ? this.formatProfitText({
                currPrice: currPrice,
                previousClose: previousClose,
                stockConfig: stockConfig,
                profitOptions: profitOptions,
                now: now,
                plain: true
            })
            : this.formatLegacyProfitText({
                currPrice: currPrice,
                stockConfig: stockConfig,
                now: now
            });
        if (profitText) {
            text = text + '  ' + profitText;
        }
        return this.wrapColorText(text, this.getColorClassByDirection(this.getStockDirection({
            percentage: percentage,
            currPrice: currPrice,
            previousClose: previousClose,
            stockConfig: stockConfig
        }), options.stockColorMode)) + "\n";
    },

    getData: function (code, callback, options) {
        // var codeArr = code.split(",");
        var that = this;
        // var textAll = "";
        var urlAll = url;
        
        // 确保code是一个数组
        if (!code || !Array.isArray(code) || code.length === 0) {
            console.log("No stock codes provided or invalid format");
            callback("没有股票数据");
            return;
        }
        
        code.forEach(function (stockCode) {
            if (!stockCode || typeof stockCode !== 'object' || !stockCode.code) {
                console.log("Invalid stock code item:", stockCode);
                return;
            }
            
            var codeValue = stockCode.code;
            // console.log("codeValue: " + codeValue);
            // if (!code.startsWith("s_")) {
            //     code = "s_" + code;
            // }
            // 根据股票代码添加交易所前缀（小写）
            if (codeValue.startsWith("6")) {
                // 上海交易所：沪市主板 600xxx, 沪市科创板 688xxx
                codeValue = "sh" + codeValue;
            } else if (codeValue.startsWith("0") || codeValue.startsWith("3")) {
                // 深圳交易所：深市主板 000xxx, 中小板 002xxx, 创业板 300xxx
                codeValue = "sz" + codeValue;
            } else if (codeValue.startsWith("8")) {
                // 北京交易所：新三板精选层 8xxxxx
                codeValue = "bj" + codeValue;
            }
            urlAll = urlAll + codeValue + ",";
        })
        // console.log("urlAll: " + urlAll);
        // var responseArr = codeArr.map(code => {
        //
        //     return url + code
        // }).map(url => {
        //     return new Promise(function (resolve) {
        //         that.requestStock(url, function (res) {
        //             resolve(res);
        //         })
        //     })
        // })
        // Promise.all(responseArr)
        //     .then(function (res) {
        //         res.forEach(item => {
        //             textAll = textAll + item + " || ";
        //         })
        //         console.log(textAll)
        //         callback(textAll.substring(0, textAll.length-3));
        //     });
        const requestOptions = Object.assign({}, options || {}, {
            stockConfigs: code
        });
        that.requestStock(urlAll, function (res) {
            callback(res)
        }, requestOptions)
    },
    requestStock(url, func, options) {
        // console.log(url);
        var showBuy1Amount = true;
        const stockConfigs = options && Array.isArray(options.stockConfigs) ? options.stockConfigs : [];
        const profitOptions = this.normalizeProfitOptions(options);
        if (options && Object.prototype.hasOwnProperty.call(options, 'showBuy1Amount')) {
            showBuy1Amount = options.showBuy1Amount !== false;
        } else {
            try {
                const db = require('./db').default;
                showBuy1Amount = db.get('is_display_buy1_amount') !== false;
                profitOptions.showStockItemData = db.get('is_display_stock_item_data') !== false;
                profitOptions.showStockTodayProfit = db.get('is_display_stock_today_profit') !== false;
                profitOptions.showStockHoldingProfit = db.get('is_display_stock_holding_profit') !== false;
                profitOptions.showStockProfitLabel = db.get('is_display_stock_profit_label') !== false;
                profitOptions.stockProfitSeparator = db.get('stock_profit_separator') || "/";
                profitOptions.showStockTotalTodayProfit = db.get('is_display_stock_total_today_profit') === true;
                profitOptions.showStockTotalHoldingProfit = db.get('is_display_stock_total_holding_profit') === true;
                profitOptions.stockColorMode = stockUtils.normalizeStockColorMode(db.get('stock_color_mode'));
            } catch (err) {
                console.error('读取股票显示配置失败:', err && err.message ? err.message : err);
            }
        }

        request
            .get(url)
            .buffer(true)
            .charset("gbk")
            .then(function (res) {
                let results = res.text;
                const resultsArray = results.split(";");
                var textAll = "";
                var totals = {
                    todayProfit: null,
                    holdingProfit: null
                };
                for (let i = 0; i < resultsArray.length - 1; i++) {

                    let result = resultsArray[i];
                    var arr = result.split("~")
                    // console.log(arr)
                    var stockName = arr[1];
                    var stockCode = arr[2];
                    var currPrice = arr[3];
                    var previousClose = arr[4];
                    var percentage = arr[32];
                    var priceBuyer1 = arr[9];
                    var amountBuyer1 = arr[10];
                    var amountBuyer1Total = priceBuyer1 * amountBuyer1 * 100;                    var param = {}
                    var sizes = ['', 'W', 'Y'];
                    var m;
                    if(amountBuyer1Total < 10000){
                        // 保留2位小数
                        param.value = amountBuyer1Total.toFixed(2);
                        param.unit=''
                    }else{
                        m = Math.floor(Math.log(amountBuyer1Total) / Math.log(10000));
                        param.value = ((amountBuyer1Total / Math.pow(10000, m))).toFixed(4);
                        param.unit = sizes[m];
                    }
                    // console.log("amountBuyer1Total: " + param.value + param.unit);

                    // 将封单金额转换为万元
                    var sealAmountInWan = 0;
                    if (param.unit === 'Y') {
                        sealAmountInWan = parseFloat(param.value) * 10000;
                    } else if (param.unit === 'W') {
                        sealAmountInWan = parseFloat(param.value);
                    } else {
                        sealAmountInWan = parseFloat(param.value) / 10000;
                    }

                    var text = stockUtils.formatStockQuoteText({
                        stockName: stockName,
                        currPrice: currPrice,
                        percentage: percentage,
                        previousClose: previousClose,
                        buy1AmountText: param.value + param.unit,
                        showBuy1Amount: showBuy1Amount,
                        stockConfig: stockConfigs[i],
                        profitOptions: profitOptions,
                        now: options && options.now
                    });
                    stockUtils.addProfitTotals(totals, stockUtils.calculateProfitValues({
                        currPrice: currPrice,
                        previousClose: previousClose,
                        stockConfig: stockConfigs[i],
                        now: options && options.now
                    }));
                    if (profitOptions.showStockItemData) {
                        textAll = textAll + text;
                    }
                    // console.log(textAll);
                }
                textAll = textAll + stockUtils.formatStockTotalText({
                    totals: totals,
                    profitOptions: profitOptions
                });
                func(textAll)
            }).catch((err) => {
            console.error('请求股票行情失败:', err && err.message ? err.message : err);
            func('');
        })
        // request
        //     .get(url)
        //     .buffer(true)
        //     .charset("gbk")
        //     .then(function (res) {
        //         const results = res.text;
        //         var arr = results.split(",")
        //         var firstLine = arr[0];
        //         var stockName = firstLine.split("\"")[1];
        //         var yesterday_price = parseFloat(arr[2]);
        //         var curr_price = parseFloat(arr[3]);
        //         var percentage = (curr_price - yesterday_price) / yesterday_price * 100
        //         if (curr_price < 10) {
        //             curr_price = curr_price.toFixed(3)
        //         } else {
        //             curr_price = curr_price.toFixed(2)
        //         }
        //         var text = stockName + '  ' + curr_price + "/" + percentage.toFixed(2) + "%" + "\r\n";
        //
        //         func(text);
        //     })
        //     .catch((err) => {
        //         func(err);
        //     })
    }
};

// 导出模块
export default stockUtils;
