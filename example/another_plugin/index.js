'use strict';

/*
Mr Horse can be used from other plugins.  You just need to make sure your plugin
depends on Mr Horse.  You can see how that works below.
*/

/* This will run after MrHorse is all loaded. */
const after = async function (server, next) {

    /* all the main policies are available to us for these routes, but just
    for kicks we'll load our own logged in policy.  Just keep in mind, ALL
    plugins MUST be uniquely named.  We can't have a policy that is also
    named isLoggedIn, because that was already used in the main policy directory. */
    await server.plugins.mrhorse.loadPolicies(server, {
        policyDirectory: __dirname + '/policies'
    });

    /*
    Try http://localhost:3000/otherplugin, and
    http://localhost:3000/otherplugin?loggedin=true
    */
    server.route({
        method: 'GET',
        path: '/otherplugin',
        handler: function (request, h) {

            return 'You are logged in to another plugin.';
        },
        config: {
            plugins: {
                policies: ['apIsLoggedIn']
            }
        }
    });
};

exports.plugin = {
    pkg: {
        name: 'anotherPlugin',
        version: '1.0.0'
    }
};

exports.plugin.register = function register(server, options) {

    server.dependency('mrhorse', after);
};
