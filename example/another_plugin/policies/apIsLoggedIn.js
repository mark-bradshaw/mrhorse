'use strict';

const apIsLoggedIn = (request, reply, next) => {

    /* This is just for example purposes.  You would need your own logic here. */
    const loggedIn = request.query.loggedin || false;
    console.log('apisloggedin', loggedIn);
    next(null, loggedIn);
};

module.exports = apIsLoggedIn;
