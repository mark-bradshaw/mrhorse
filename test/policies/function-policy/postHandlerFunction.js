'use strict';

const postHandler = (request, h) => {

    request.response.source.posthandler = 'posthandler';
    return h.continue;
};

postHandler.applyPoint = 'onPostHandler';

module.exports = postHandler;
