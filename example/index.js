'use strict';

const Hapi = require('hapi');

(async () => {

    const server = new Hapi.Server({ port: 3000 });

    /* Register the MrHorse Plugin, and feed it an initial list of policies */
    await server.register(
        {
            plugin: require('..'),
            options: {
                policyDirectory: __dirname + '/policies'
            }
        }
    );

    /* Register another plugin to show how Mr Horse is used by other plugins. */
    await server.register(
        {
            plugin: require('./another_plugin'),
            options: {}
        }
    );

    /* Make a couple routes for example purposes. */
    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, h) {

            return 'MrHorse <a href="https://github.com/mark-bradshaw/mrhorse"></a>' +
                '<br />Try these:' +
                '<br /><a href="/loggedin">http://localhost:3000/loggedin</a> - This will give a 403' +
                '<br /><a href="/loggedin?loggedin=true">http://localhost:3000/loggedin?loggedin=true</a>' +
                '<br /><a href="/admin">http://localhost:3000/admin</a> - This will give a 403' +
                '<br /><a href="/admin?loggedin=true">http://localhost:3000/admin?loggedin=true</a> - This will give a 403 with a special message' +
                '<br /><a href="/admin?loggedin=true&admin=true">http://localhost:3000/admin?loggedin=true&admin=true</a> - mixing multiple policies' +
                '<br /><a href="/adminnight?loggedin=true&admin=true">http://localhost:3000/adminnight?loggedin=true&admin=true</a> - using parallel policies.  this might 403 depending on the phase of the moon.  seriously.' +
                '<br /><a href="/addanalytics">http://localhost:3000/addanalytics</a> - Part of this JSON data is injected in a post handler' +
                '<br /><a href="/otherplugin">http://localhost:3000/otherplugin</a> - This route comes from a plugin, which can also use Mr Horse.  This will give a 403.' +
                '<br /><a href="/otherplugin?loggedin=true">http://localhost:3000/otherplugin?loggedin=true</a> - Here is that route, logged in';
        }
    });

    /*
    Try http://localhost:3000/loggedin, and
    http://localhost:3000/loggedin?loggedin=true
     */
    server.route({
        method: 'GET',
        path: '/loggedin',
        handler: function (request, h) {

            return 'You are logged in.';
        },
        config: {
            plugins: {
                policies: ['isLoggedIn']
            }
        }
    });

    /*
    Try http://localhost:3000/admin, and
    http://localhost:3000/admin?loggedin=true, and
    http://localhost:3000/admin?loggedin=true&admin=true
     */
    server.route({
        method: 'GET',
        path: '/admin',
        handler: function (request, h) {

            return 'You are logged in AND an admin.';
        },
        config: {
            plugins: {
                policies: ['isLoggedIn', 'isAnAdmin']
            }
        }
    });

    /*
    Try http://localhost:3000/addanalytics
     */
    server.route({
        method: 'GET',
        path: '/addanalytics',
        handler: function (request, h) {

            return {
                data: 'this could be cached'
            };
        },
        config: {
            plugins: {
                policies: ['addAnalytics']
            }
        }
    });

    /*
    Try http://localhost:3000/adminnight, and
    http://localhost:3000/adminnight?loggedin=true, and
    http://localhost:3000/adminnight?loggedin=true&admin=true

    Then try them again (with an internet connection) on a night when the moon is a waning crescent.
     */
    server.route({
        method: 'GET',
        path: '/adminnight',
        handler: (request, h) => {

            return 'You are logged in AND an admin AND the moon is in phase.';
        },
        config: {
            plugins: {
                policies: [
                    ['moonInPhase', 'isLoggedIn'], // Check these in parallel
                    'isAnAdmin'
                ]
            }
        }
    });


    await server.start();
    console.log('Server started at: ' + server.info.uri);

})();
