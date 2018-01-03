'use strict';

const postHandler = function (request, h) {

    request.response.source.addedAnother = 'that';
    return h.continue;
};

postHandler.applyPoint = 'onPostHandler';

module.exports = postHandler;
