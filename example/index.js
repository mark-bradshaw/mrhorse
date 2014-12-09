'use strict';

var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({
    port: 3000
});

/* Register the MrHorse Plugin, and feed it an initial list of policies */
server.register({
        register: require('..'),
        options: {
            policyDirectory: __dirname + '/policies'
        }
    },
    function(err) {

        if (err) {
            return console.log(err);
        }
    });

/* Register another plugin to show how Mr Horse is used by other plugins. */
server.register({
        register: require('./another_plugin'),
        options: {}
    },
    function(err) {

        if (err) {
            return console.log(err);
        }
    });

/* Make a couple routes for example purposes. */
server.route({
    method: 'GET',
    path: '/',
    handler: function(request, reply) {

        reply('MrHorse <a href="https://github.com/mark-bradshaw/mrhorse"></a>' +
            '<br />Try these:' +
            '<br /><a href="/loggedin">http://localhost:3000/loggedin</a> - This will give a 403' +
            '<br /><a href="/loggedin?loggedin=true">http://localhost:3000/loggedin?loggedin=true</a>' +
            '<br /><a href="/admin">http://localhost:3000/admin</a> - This will give a 403' +
            '<br /><a href="/admin?loggedin=true">http://localhost:3000/admin?loggedin=true</a> - This will give a 403 with a special message' +
            '<br /><a href="/admin?loggedin=true&admin=true">http://localhost:3000/admin?loggedin=true&admin=true</a> - mixing multiple policies' +
            '<br /><a href="/addanalytics">http://localhost:3000/addanalytics</a> - Part of this JSON data is injected in a post handler' +
            '<br /><a href="/otherplugin">http://localhost:3000/otherplugin</a> - This route comes from a plugin, which can also use Mr Horse.  This will give a 403.' +
            '<br /><a href="/otherplugin?loggedin=true">http://localhost:3000/otherplugin?loggedin=true</a> - Here is that route, logged in');
    }
});

/*
Try http://localhost:3000/loggedin, and
http://localhost:3000/loggedin?loggedin=true
 */
server.route({
    method: 'GET',
    path: '/loggedin',
    handler: function(request, reply) {

        reply('You are logged in.');
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
    handler: function(request, reply) {

        reply('You are logged in AND an admin.');
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
    handler: function(request, reply) {

        reply({
            data: 'this could be cached'
        });
    },
    config: {
        plugins: {
            policies: ['addAnalytics']
        }
    }
});

server.start(function(err) {

    console.log('Server started at: ' + server.info.uri);
});