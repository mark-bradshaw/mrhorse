var Boom = require('boom');

var customFail = function(request, reply, callback) {

    callback(Boom.notFound());
};

module.exports = customFail;