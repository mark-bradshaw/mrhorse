'use strict';

var apIsLoggedIn = function(request, reply, next) {

    /* This is just for example purposes.  You would need your own logic here. */
    var loggedIn = request.query.loggedin || false;
    console.log('apisloggedin', loggedIn);
    next(null, loggedIn);
};

module.exports = apIsLoggedIn;