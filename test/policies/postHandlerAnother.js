'use strict';

const postHandler = function (request, reply, callback) {

    request.response.source.addedAnother = 'that';
    callback(null, true);
};

postHandler.applyPoint = 'onPostHandler';

module.exports = postHandler;
