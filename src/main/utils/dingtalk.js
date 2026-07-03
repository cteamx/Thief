'use strict';
const request = require('superagent');
import db from './db';

export default {
    /**
     * 发送钉钉消息
     * @param {string} text 消息内容
     * @param {Array} atMobiles 要@的手机号列表
     */
    async sendMessage(text, atMobiles = []) {
        const webhook = await db.get("dingtalk_webhook");
        if (!webhook) {
            console.log("钉钉Webhook地址未配置");
            return;
        }

        const isAtAll = atMobiles.length === 0;
        
        const message = {
            msgtype: "text",
            text: {
                content: text
            },
            at: {
                atMobiles: atMobiles,
                isAtAll: isAtAll
            }
        };

        try {
            const response = await request
                .post(webhook)
                .send(message)
                .timeout(10000);
            
            console.log("钉钉消息发送成功:", response.body);
            return response.body;
        } catch (error) {
            console.error("钉钉消息发送失败:", error);
            throw error;
        }
    },

    /**
     * 发送涨停告警消息
     * @param {Object} stockInfo 股票信息
     * @param {string} alertType 告警类型
     */
    async sendLimitUpAlert(stockInfo, alertType) {
        const atPhones = await db.get("at_phone_numbers") || [];
        
        let message = "";
        const currentTime = new Date().toLocaleString('zh-CN');
        
        switch (alertType) {
            case 'limit_up':
                message = `🚀 涨停提醒 🚀\n` +
                         `股票：${stockInfo.name}(${stockInfo.code})\n` +
                         `当前价格：${stockInfo.price}\n` +
                         `涨幅：${stockInfo.percentage}%\n` +
                         `封单金额：${stockInfo.sealAmount}万\n` +
                         `时间：${currentTime}`;
                break;
            case 'weak_seal':
                message = `⚠️ 炸板预警 ⚠️\n` +
                         `股票：${stockInfo.name}(${stockInfo.code})\n` +
                         `当前价格：${stockInfo.price}\n` +
                         `涨幅：${stockInfo.percentage}%\n` +
                         `封单金额：${stockInfo.sealAmount}万 (小于1000万)\n` +
                         `时间：${currentTime}`;
                break;
            case 'rapid_decrease':
                message = `📉 封单快速减少告警 📉\n` +
                         `股票：${stockInfo.name}(${stockInfo.code})\n` +
                         `当前价格：${stockInfo.price}\n` +
                         `涨幅：${stockInfo.percentage}%\n` +
                         `封单金额：${stockInfo.sealAmount}万\n` +
                         `1秒内减少：${stockInfo.decreaseAmount}万\n` +
                         `时间：${currentTime}`;
                break;
            case 'large_decrease':
                message = `📊 封单大幅减少告警 📊\n` +
                         `股票：${stockInfo.name}(${stockInfo.code})\n` +
                         `当前价格：${stockInfo.price}\n` +
                         `涨幅：${stockInfo.percentage}%\n` +
                         `当前封单：${stockInfo.sealAmount}万\n` +
                         `最高封单：${stockInfo.maxSealAmount}万\n` +
                         `减少金额：${stockInfo.decreaseFromMax}万\n` +
                         `时间：${currentTime}`;
                break;
            default:
                message = `股票告警：${stockInfo.name}(${stockInfo.code}) - ${alertType}`;
        }

        try {
            await this.sendMessage(message, atPhones);
            console.log(`${alertType} 告警消息发送成功:`, stockInfo.code);
        } catch (error) {
            console.error(`${alertType} 告警消息发送失败:`, error);
        }
    }
};
