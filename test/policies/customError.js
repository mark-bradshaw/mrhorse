'use strict';

const Boom = require('@hapi/boom');

const customFail = function () {

    throw Boom.notFound();
};

module.exports = customFail;
