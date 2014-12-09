'use strict';

var addAnalytics = function(request, reply, callback) {

    console.log('addAnalytics');
    request.response.source.analytics = 'this could be different for each request or user';

    callback(null, true);
};

addAnalytics.pre = false;
addAnalytics.post = true;

module.exports = addAnalytics;