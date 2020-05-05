'use strict';
var rp = require('request-promise');

const url = 'http://ad.c.team/ad?p=thief-book';

export default {
    getAd(callback) {
        rp(url)
            .then(function(result) {
                callback(result)
            })
            .catch(function(err) {
                callback("err")
            });
    }
};