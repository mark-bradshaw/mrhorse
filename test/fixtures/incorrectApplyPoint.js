'use strict';

const incorrectApplyPoint = function () {

    throw new Error('custom');
};

incorrectApplyPoint.applyPoint = 'onIncorrect'; // invalid hapi event name

module.exports = incorrectApplyPoint;
