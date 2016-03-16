'use strict';

const redirects = function (request, reply, callback) {

    callback(reply.redirect('/'), false);
};

module.exports = redirects;
