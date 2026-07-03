'use strict';
const axios = require('axios');

const url = 'http://ad.c.team/ad?p=thief-book';

export default {
    getAd(callback) {
        axios.get(url, { timeout: 10000 })
            .then(function(response) {
                callback(response.data)
            })
            .catch(function(err) {
                callback("err")
            });
    }
};
