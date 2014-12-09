'use strict';

var isLoggedIn = function(request, reply, callback) {

    /* This is just for example purposes.  You would need your own logic here. */
    var loggedIn = request.query.loggedin || false;
    console.log('loggedin', loggedIn);
    callback(null, loggedIn);
};

module.exports = isLoggedIn;