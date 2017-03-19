'use strict';

module.exports = {

    multiPolicyOkA : (request, reply, callback) => {

        callback(null, true);
    },

    multiPolicyFailA : (request, reply, callback) => {

        callback(null, false);
    },

    multiPolicyOkB : (request, reply, callback) => {

        callback(null, true);
    },

    multiPolicyFailB : (request, reply, callback) => {

        callback(null, false);
    }

};
