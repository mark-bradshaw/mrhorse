'use strict';

const Boom = require('boom');

const isLoggedIn = (request, h) => {

    /* This is just for example purposes.  You would need your own logic here. */
    const loggedIn = request.query.loggedin || false;
    console.log('loggedin', loggedIn);
    if (loggedIn) {
        return h.continue;
    }

    throw Boom.forbidden();
};

module.exports = isLoggedIn;
