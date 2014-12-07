'use strict';

var _ = require('lodash');
var async = require('async');
var boom = require('boom');
var fs = require('fs');
var hoek = require('hoek');
var path = require('path');

var setPreHandler = false;
var setPostHandler = false;

function runPolicies(policies, request, reply) {
    var policyNames = hoek.reach(request, 'route.settings.plugins.policies');
    if (!policyNames) return reply.continue(); // continue as normal

    var policiesToRun = _(policies) // begin a lodash chainable object
        .pick(policyNames) // just the policies included in this route
        .values() // we want the values (the functions), not the keys
        .value(); // convert to an array

    // BUG.  Don't silently drop on misspelled/missing policy.

    function checkPolicy(policy, callback) {
        policy(request, reply, function(err, canContinue, message) {
            if (err) return callback(err); // you can provide a custom hapi error object here.
            if (canContinue) return callback(null, true);
            return callback(boom.forbidden(message)); // if a message is passed in use it in the forbidden message
        });
    }

    // use eachSeries to get quick fails and ordering.
    async.eachSeries(policiesToRun, checkPolicy, function(err, result) {
        if (err) {
            return reply(err);
        }

        reply.continue();
    });
}

function onPreHandler(request, reply) {
    runPolicies(request.server.app.policies.pre, request, reply);
}

function onPostHandler(request, reply) {
    runPolicies(request.server.app.policies.post, request, reply);
}

function loadPolicies(server, policyDirectory, next) {
    var match = null;
    var re = /(.+)\.js$/; // Only looking for .js files in the policies folder.

    function addPolicy(filename) {
        match = filename.match(re);
        if (match) {
            // Does this policy already exist?
            if (server.app.policies.names.indexOf(match[1]) !== -1) {
                server.log(['error'], 'Trying to add a duplicate policy: ' + match[1]);
                next(new Error('Trying to add a duplicate policy: ' + match[1]));
                return;
            }

            server.app.policies.names.push(match[1]);

            // Add this to the server.app.policies object.
            var policy = require(path.join(policyDirectory, filename));
            if (policy.pre === undefined || policy.pre) {
                server.log(['info'], 'Adding a new PRE policy called ' + match[1]);
                console.log('Adding a new PRE policy called ' + match[1]);
                server.app.policies.pre[match[1]] = policy;

                if (!setPreHandler) {
                    server.ext('onPreHandler', onPreHandler);
                    setPreHandler = true;
                }
            }
            if (policy.post) {
                server.log(['info'], 'Adding a new POST policy called ' + match[1]);
                console.log('Adding a new POST policy called ' + match[1]);
                server.app.policies.post[match[1]] = policy;

                if (!setPostHandler) {
                    server.ext('onPostHandler', onPostHandler);
                    setPostHandler = true;
                }
            }
        }
    }

    // initialize policies object.
    server.app.policies = server.app.policies || {
        names: [],
        pre: [],
        post: []
    };

    var policyFiles = fs.readdirSync(policyDirectory);
    if (policyFiles.length === 0) {
        return next();
    }
    _.forEach(policyFiles, addPolicy);
    next();
}

exports.setup = function register(server, options, next) {
    if (!options.policyDirectory) {
        return next(new Error('policyDirectory is required for MrHorse.'));
    }

    loadPolicies(server, options.policyDirectory, function(err) {
        next(err);
    });
};