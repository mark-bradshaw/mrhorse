'use strict';

const postHandler = function (request, reply, callback) {

    request.response.source.added = 'this';
    callback(null, true);
};

postHandler.applyPoint = 'onPostHandler';

module.exports = postHandler;
