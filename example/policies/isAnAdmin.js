'use strict';

const isAnAdmin = (request, reply, callback) => {

    /* This is just for example purposes.  You would need your own logic here. */
    const admin = request.query.admin || false;
    console.log('admin', admin);
    if (!admin) {
        return callback(null, false, 'You are not an admin');
    }
    callback(null, true);
};

module.exports = isAnAdmin;
