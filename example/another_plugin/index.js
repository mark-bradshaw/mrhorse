'use strict';

/*
Mr Horse can be used from other plugins.  You just need to make sure your plugin
depends on Mr Horse.  You can see how that works below.
*/

/* This will run after MrHorse is all loaded. */
var after = function(server, next) {

    /* all the main policies are available to us for these routes, but just
    for kicks we'll load our own logged in policy.  Just keep in mind, ALL
    plugins MUST be uniquely named.  We can't have a policy that is also
    named isLoggedIn, because that was already used in the main policy directory. */
    server.plugins.mrhorse.loadPolicies(server, __dirname + '/policies', function(err) {

        if (err) {
            console.log(err);
        }

        /*
        Try http://localhost:3000/otherplugin, and
        http://localhost:3000/otherplugin?loggedin=true
        */
        server.route({
            method: 'GET',
            path: '/otherplugin',
            handler: function(request, reply) {

                reply('You are logged in to another plugin.');
            },
            config: {
                plugins: {
                    policies: ['apIsLoggedIn']
                }
            }
        });

        next();
    });
};

exports.register = function register(server, options, next) {

    server.dependency('mrhorse', after);
    next();
};

exports.register.attributes = {
    name: 'otherPlugin',
    version: '1.0.0'
};