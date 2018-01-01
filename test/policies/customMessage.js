'use strict';

const customMessage = function () {

    throw new Error('custom');
};

module.exports = customMessage;
