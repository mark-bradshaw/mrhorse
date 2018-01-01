'use strict';

const postHandler = function (request, h) {

    request.response.source.added = 'this';
    return h.continue;
};

postHandler.applyPoint = 'onPostHandler';

module.exports = postHandler;
