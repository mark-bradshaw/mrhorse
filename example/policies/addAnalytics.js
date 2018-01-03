'use strict';

const addAnalytics = async (request, h) => {

    console.log('addAnalytics');
    request.response.source.analytics = 'this could be different for each request or user';

    return h.continue;
};

addAnalytics.applyPoint = 'onPostHandler';

module.exports = addAnalytics;
