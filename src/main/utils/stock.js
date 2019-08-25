'use strict';
var request = require('request');


const url = 'http://hq.sinajs.cn/list=';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
}

export default {
    getData(code, callback) {
        request({
            url: url + code,
            method: "GET",
            encoding: null,
            headers: headers
        }, function (err, res, body) {
            var arr = body.toString().split(",")
            var today_price = parseFloat(arr[1]);
            var curr_price = parseFloat(arr[3]);
            var percentage = (curr_price - today_price) / today_price * 100
            var text = curr_price.toFixed(2) + "," + percentage.toFixed(2) + "%";
            callback(text)
        })
    }
};