'use strict';

const Boom = require('boom');

const customFail = function () {

    throw Boom.notFound();
};

module.exports = customFail;
