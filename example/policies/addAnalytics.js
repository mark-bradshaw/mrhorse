'use strict';

const addAnalytics = (request, reply, callback) => {

    console.log('addAnalytics');
    request.response.source.analytics = 'this could be different for each request or user';

    callback(null, true);
};

addAnalytics.applyPoint = 'onPostHandler';

module.exports = addAnalytics;
