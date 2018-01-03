'use strict';

const secondPasses = function (request, h) {

    request.response.source.ranSecondPasses = true;
    return h.continue;
};

secondPasses.applyPoint = 'onPostHandler';

module.exports = secondPasses;
