'use strict';

var _ = require('lodash');
var async = require('async');
var boom = require('boom');
var fs = require('fs');
var hoek = require('hoek');
var path = require('path');

var data = {
    names: [],
    pre: [],
    post: []
};

var runPolicies = function(policies, request, reply) {
    var policyNames = hoek.reach(request, 'route.settings.plugins.policies');
    if (!policyNames) {
        return reply.continue(); // continue as normal
    }

    var policiesToRun = _(policies) // begin a lodash chainable object
        .pick(policyNames) // just the policies included in this route
        .values() // we want the values (the functions), not the keys
        .value(); // convert to an array

    // BUG.  Don't silently drop on misspelled/missing policy.

    var checkPolicy = function(policy, callback) {
        policy(request, reply, function(err, canContinue, message) {
            if (err) {
                return callback(err); // you can provide a custom hapi error object here.
            }
            if (canContinue) {
                return callback(null, true);
            }
            return callback(boom.forbidden(message)); // if a message is passed in use it in the forbidden message
        });
    };

    // use eachSeries to get quick fails and ordering.
    async.eachSeries(policiesToRun, checkPolicy, function(err, result) {
        if (err) {
            return reply(err);
        }

        reply.continue();
    });
};

var onPreHandler = function(request, reply) {
    runPolicies(data.pre, request, reply);
};

var onPostHandler = function(request, reply) {
    runPolicies(data.post, request, reply);
};

var loadPolicies = function(server, policyDirectory, next) {
    var match = null;
    var re = /(.+)\.js$/; // Only looking for .js files in the policies folder.

    var addPolicy = function(filename, callback) {
        match = filename.match(re);
        if (match) {
            // Does this policy already exist?
            if (data.names.indexOf(match[1]) !== -1) {
                server.log(['error'], 'Trying to add a duplicate policy: ' + match[1]);
                return callback(new Error('Trying to add a duplicate policy: ' + match[1]));
            }

            data.names.push(match[1]);

            // Add this policy function to the server.app.mrhorse object.
            var policy = require(path.join(policyDirectory, filename));
            if (policy.pre === undefined || policy.pre) {
                server.log(['info'], 'Adding a new PRE policy called ' + match[1]);
                // console.log('Adding a new PRE policy called ' + match[1]);
                data.pre[match[1]] = policy;

                // connect the prehandler if this is the first pre policy
                if (!data.setPreHandler) {
                    server.ext('onPreHandler', onPreHandler);
                    data.setPreHandler = true;
                }
            }
            if (policy.post) {
                server.log(['info'], 'Adding a new POST policy called ' + match[1]);
                // console.log('Adding a new POST policy called ' + match[1]);
                data.post[match[1]] = policy;

                // connect the prehandler if this is the first post policy
                if (!data.setPostHandler) {
                    server.ext('onPostHandler', onPostHandler);
                    data.setPostHandler = true;
                }
            }
        }

        callback();
    };

    var policyFiles = fs.readdirSync(policyDirectory);
    if (policyFiles.length === 0) {
        return next();
    }
    async.eachSeries(policyFiles, addPolicy, function(err) {
        next(err);
    });
};

var reset = function() {
    data = {
        names: [],
        pre: [],
        post: []
    };
};

exports.register = function register(server, options, next) {
    server.expose('loadPolicies', loadPolicies);
    server.expose('data', data);
    server.expose('reset', reset);

    if (options.policyDirectory !== undefined) {
        loadPolicies(server, options.policyDirectory, function(err) {
            next(err);
        });
    } else {
        next();
    }
};

exports.register.attributes = {
    pkg: require('../package.json')
};