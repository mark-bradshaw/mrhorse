'use strict';

const Boom = require('boom');

const isAnAdmin = (request, h) => {

    /* This is just for example purposes.  You would need your own logic here. */
    const admin = request.query.admin || false;
    console.log('admin', admin);
    if (!admin) {
        throw Boom.forbidden('You are not an admin');
    }

    return h.continue;
};

module.exports = isAnAdmin;
