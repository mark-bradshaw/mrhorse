'use strict';

const redirects = function (request, h) {

    return h.redirect('/').takeover();
};

module.exports = redirects;
