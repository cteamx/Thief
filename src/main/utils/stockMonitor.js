'use strict';
import stockUtils from './stock';
import dingtalkUtils from './dingtalk';
import db from './db';
import { stripDisplayHtml } from './displayText';

export default {
    monitorInterval: null,
    stockHistory: new Map(), // 存储股票历史数据
    lastCheckTime: new Map(), // 存储上次检查时间
    maxSealAmounts: new Map(), // 存储最大封单金额
    alertCounts: new Map(), // 存储告警计数（用于5000万递减告警）
    sealedStocks: new Map(), // 存储已封板的股票状态
    weakSealAlerted: new Map(), // 存储已炸板告警的股票

    /**
     * 开始监控涨停股票
     */
    async startMonitoring() {
        if (!(await db.get("limit_up_alert_enabled"))) {
            console.log("涨停告警未启用");
            return;
        }

        // 确保先停止现有的监控
        this.stopMonitoring();
        
        console.log("开始监控涨停股票...");
        
        // 打印配置文件中的股票代码
        this.logCurrentStocks();
        
        // 立即执行一次检查，验证股票代码是否有效
        setTimeout(() => {
            this.checkStocks();
        }, 100);
        
        // 每秒检查一次
        this.monitorInterval = setInterval(() => {
            this.checkStocks();
        }, 1000);
    },

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log("股票监控已停止");
        }
    },

    /**
     * 重新启动监控（强制刷新配置）
     */
    async restartMonitoring() {
        console.log("重新启动股票监控...");
        
        // 强制重新加载配置文件
        console.log("强制重新加载配置文件...");
        db.reloadConfig();
        
        // 清除所有历史状态
        this.stockHistory.clear();
        this.lastCheckTime.clear();
        this.maxSealAmounts.clear();
        this.alertCounts.clear();
        this.sealedStocks.clear();
        this.weakSealAlerted.clear();
        
        // 停止当前监控
        this.stopMonitoring();
        
        // 延迟100ms后重新启动
        setTimeout(async () => {
            if (await db.get("limit_up_alert_enabled")) {
                this.startMonitoring();
            }
        }, 100);
    },

    /**
     * 检查所有配置的股票
     */
    async checkStocks() {
        try {
            // 每次都重新从数据库获取最新的股票代码列表
            const stockCodes = await db.get("display_shares_list") || [];
            if (stockCodes.length === 0) {
                return;
            }
            
            console.log('检查股票：', stockCodes.map(s => s.code).join(','));

            stockUtils.getData(stockCodes, (result) => {
                try {
                    this.parseAndAnalyzeStockData(result, stockCodes);
                } catch (err) {
                    console.error("解析股票数据回调异常:", err);
                }
            }, {
                showBuy1Amount: true,
                showStockTodayProfit: false,
                showStockHoldingProfit: false,
                showStockTotalTodayProfit: false,
                showStockTotalHoldingProfit: false,
                stockColorMode: 'none'
            });
        } catch (error) {
            console.error("检查股票数据时出错:", error);
        }
    },

    /**
     * 解析并分析股票数据
     * @param {string} stockDataText 股票数据文本
     * @param {Array} stockCodes 股票代码列表
     */
    parseAndAnalyzeStockData(stockDataText, stockCodes) {
        if (typeof stockDataText !== 'string') {
            console.error("股票数据格式异常，期望字符串，实际类型:", typeof stockDataText);
            return;
        }

        if (!stockDataText.trim()) {
            return;
        }

        const lines = stockDataText.split('\n').filter(line => line.trim());
        
        lines.forEach((line, index) => {
            if (index < stockCodes.length) {
                const stockInfo = this.parseStockLine(line, stockCodes[index]);
                if (stockInfo) {
                    this.analyzeStock(stockInfo);
                }
            }
        });
    },

    /**
     * 解析单行股票数据
     * @param {string} line 股票数据行
     * @param {Object} stockCode 股票代码对象
     * @returns {Object} 解析后的股票信息
     */
    parseStockLine(line, stockCode) {
        try {
            // 解析格式: "股票名称  价格/涨幅%  封单金额单位"
            const plainLine = stripDisplayHtml(line).trim();
            const parts = plainLine.split(/\s+/);
            if (parts.length < 3) {
                return null;
            }

            const name = parts[0];
            const priceAndPercentage = parts[1].split('/');
            if (priceAndPercentage.length < 2) {
                return null;
            }
            const sealAmountText = parts[2];

            const price = parseFloat(priceAndPercentage[0]);
            const percentage = parseFloat(priceAndPercentage[1].replace('%', ''));
            
            // 解析封单金额
            const sealAmount = this.parseSealAmount(sealAmountText);

            return {
                code: stockCode.code,
                name: name,
                price: price,
                percentage: percentage,
                sealAmount: sealAmount, // 万元
                timestamp: Date.now()
            };
        } catch (error) {
            console.error("解析股票数据失败:", line, error);
            return null;
        }
    },

    /**
     * 解析封单金额
     * @param {string} amountText 金额文本，如 "1234.56W" 或 "12.34Y"
     * @returns {number} 金额（万元）
     */
    parseSealAmount(amountText) {
        const match = amountText.match(/^([\d.]+)([WY]?)$/);
        if (!match) {
            return parseFloat(amountText) || 0;
        }

        const value = parseFloat(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'Y': // 亿
                return value * 10000; // 转换为万
            case 'W': // 万
                return value;
            default: // 元
                return value / 10000; // 转换为万
        }
    },    /**
     * 分析单个股票
     * @param {Object} stockInfo 股票信息
     */
    analyzeStock(stockInfo) {
        const code = stockInfo.code;
        const currentTime = stockInfo.timestamp;

        // 获取历史数据
        const history = this.stockHistory.get(code) || [];
        const lastData = history.length > 0 ? history[history.length - 1] : null;

        // 检查是否涨停（涨幅接近10%且封单金额大于1000万）
        if (this.isLimitUp(stockInfo)) {
            this.checkLimitUpAlert(stockInfo, lastData);
            // 记录封板状态
            this.sealedStocks.set(code, true);
        }

        // 检查炸板预警（只在封板后首次跌破1000万时告警）
        this.checkWeakSealAlert(stockInfo);

        // 检查封单快速减少告警
        if (lastData && this.lastCheckTime.get(code)) {
            const timeDiff = currentTime - this.lastCheckTime.get(code);
            if (timeDiff >= 1000 && timeDiff <= 2000) { // 1-2秒内
                const decrease = lastData.sealAmount - stockInfo.sealAmount;
                if (decrease >= 1000) { // 减少1000万以上
                    this.sendAlert({
                        ...stockInfo,
                        decreaseAmount: decrease.toFixed(2)
                    }, 'rapid_decrease');
                }
            }
        }

        // 检查封单大幅减少告警
        this.checkLargeDecreaseAlert(stockInfo);

        // 更新历史数据
        history.push(stockInfo);
        // 只保留最近100条记录
        if (history.length > 100) {
            history.shift();
        }
        this.stockHistory.set(code, history);
        this.lastCheckTime.set(code, currentTime);

        // 更新最大封单金额
        const currentMax = this.maxSealAmounts.get(code) || 0;
        if (stockInfo.sealAmount > currentMax) {
            this.maxSealAmounts.set(code, stockInfo.sealAmount);
        }
    },

    /**
     * 判断是否涨停
     * @param {Object} stockInfo 股票信息
     * @returns {boolean}
     */
    isLimitUp(stockInfo) {
        return stockInfo.percentage >= 9.8 && stockInfo.sealAmount >= 1000;
    },    /**
     * 检查涨停告警
     * @param {Object} stockInfo 当前股票信息
     * @param {Object} lastData 上次股票信息
     */
    checkLimitUpAlert(stockInfo, lastData) {
        // 如果上次不是涨停状态，现在是涨停状态，发送告警
        if (!lastData || !this.isLimitUp(lastData)) {
            this.sendAlert(stockInfo, 'limit_up');
        }
    },

    /**
     * 检查炸板预警（只在封板后首次跌破1000万时告警）
     * @param {Object} stockInfo 股票信息
     */
    checkWeakSealAlert(stockInfo) {
        const code = stockInfo.code;
        const wasSealed = this.sealedStocks.get(code) || false;
        const hasAlerted = this.weakSealAlerted.get(code) || false;

        // 只有在以下条件同时满足时才告警：
        // 1. 该股票曾经封板（封单金额>=1000万）
        // 2. 当前封单金额<1000万（炸板）
        // 3. 还未对该股票发送过炸板告警
        if (wasSealed && stockInfo.sealAmount > 0 && stockInfo.sealAmount < 1000 && !hasAlerted) {
            this.sendAlert(stockInfo, 'weak_seal');
            this.weakSealAlerted.set(code, true);
        }
    },

    /**
     * 检查封单大幅减少告警
     * @param {Object} stockInfo 股票信息
     */
    checkLargeDecreaseAlert(stockInfo) {
        const code = stockInfo.code;
        const maxSealAmount = this.maxSealAmounts.get(code) || 0;
        
        if (maxSealAmount === 0) {
            return;
        }

        const decreaseFromMax = maxSealAmount - stockInfo.sealAmount;
        
        // 每减少5000万告警一次
        const alertThreshold = 5000;
        const currentAlertCount = this.alertCounts.get(code) || 0;
        const shouldAlertCount = Math.floor(decreaseFromMax / alertThreshold);

        if (shouldAlertCount > currentAlertCount) {
            this.alertCounts.set(code, shouldAlertCount);
            this.sendAlert({
                ...stockInfo,
                maxSealAmount: maxSealAmount.toFixed(2),
                decreaseFromMax: decreaseFromMax.toFixed(2)
            }, 'large_decrease');
        }
    },

    /**
     * 发送告警
     * @param {Object} stockInfo 股票信息
     * @param {string} alertType 告警类型
     */
    async sendAlert(stockInfo, alertType) {
        try {
            await dingtalkUtils.sendLimitUpAlert(stockInfo, alertType);
        } catch (error) {
            console.error(`发送${alertType}告警失败:`, error);
        }
    },    /**
     * 重置监控数据
     */
    resetMonitoringData() {
        this.stockHistory.clear();
        this.lastCheckTime.clear();
        this.maxSealAmounts.clear();
        this.alertCounts.clear();
        this.sealedStocks.clear();
        this.weakSealAlerted.clear();
        console.log("监控数据已重置");
    },

    /**
     * 打印当前配置的股票代码（用于调试）
     */
    async logCurrentStocks() {
        try {
            console.log('-------- 配置文件中的股票代码 --------');
            const stockCodes = await db.get("display_shares_list") || [];
            console.log('股票数量:', stockCodes.length);
            if (stockCodes.length > 0) {
                stockCodes.forEach((stock, index) => {
                    console.log(`股票 ${index+1}:`, JSON.stringify(stock));
                });
            } else {
                console.log('未配置股票');
            }
            console.log('------------------------------------');
            
            // 尝试检查文件内容
            try {
                const fs = require('fs-extra');
                const path = require('path');
                const electron = require('electron');
                const app = electron.app;
                const userData = app.getPath('userData');
                const configPath = path.join(userData, '/thief_data.json');
                
                if (fs.existsSync(configPath)) {
                    const configContent = fs.readFileSync(configPath, 'utf8');
                    const configObj = JSON.parse(configContent);
                    console.log('直接从文件读取的股票代码:', JSON.stringify(configObj.display_shares_list || []));
                    
                    // 比较数据库读取和文件读取的结果
                    const dbStocks = JSON.stringify(stockCodes);
                    const fileStocks = JSON.stringify(configObj.display_shares_list || []);
                    
                    if (dbStocks !== fileStocks) {
                        console.error('⚠️ 警告：数据库读取的股票代码与文件中的不一致！');
                        console.error('数据库读取:', dbStocks);
                        console.error('文件读取:', fileStocks);
                        
                        // 强制重新加载数据库
                        db.reloadConfig();
                        const reloadedStocks = await db.get("display_shares_list") || [];
                        console.log('重新加载后的股票代码:', JSON.stringify(reloadedStocks));
                    } else {
                        console.log('✓ 数据库和文件中的股票代码一致');
                    }
                } else {
                    console.log('配置文件不存在:', configPath);
                }
            } catch (fileErr) {
                console.error('读取配置文件失败:', fileErr);
            }
        } catch (err) {
            console.error('打印股票代码失败:', err);
        }
    },
};
