'use strict';
import os from 'os'

export default {
    data() {
        return {
            db_util: null,
            file_json: ""
        };
    },
    dealTime(seconds) {
        var seconds = seconds | 0;
        var day = (seconds / (3600 * 24)) | 0;
        var hours = ((seconds - day * 3600) / 3600) | 0;
        var minutes = ((seconds - day * 3600 * 24 - hours * 3600) / 60) | 0;
        var second = seconds % 60;
        (day < 10) && (day = '0' + day);
        (hours < 10) && (hours = '0' + hours);
        (minutes < 10) && (minutes = '0' + minutes);
        (second < 10) && (second = '0' + second);
        return [day, hours, minutes, second].join(':');
    },
    getTime() {
        var uptime = os.uptime();
        return "您的开机时长：" + this.dealTime(uptime);
    },
    getCpu() {
        var freeMem = os.freemem();
        var totalMem = os.totalmem();
        var men = ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(1) + "G/" + (totalMem / 1024 / 1024 / 1024).toFixed(0) + "G";
        return men;
    }
};