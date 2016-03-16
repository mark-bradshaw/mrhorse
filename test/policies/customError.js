'use strict';

const Boom = require('boom');

const customFail = function (request, reply, callback) {

    callback(Boom.notFound());
};

module.exports = customFail;
