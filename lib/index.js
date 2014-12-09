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
        return reply.continue();
    }

    var policiesToRun = _(policies) // Begin a lodash chainable object
        .pick(policyNames) // Just the policies included in this route
        .values() // We want the values (the functions), not the keys
        .value(); // Convert to an array

    var checkPolicy = function(policy, next) {

        policy(request, reply, function(err, canContinue, message) {

            if (err) {
                // You can provide a custom hapi error object here
                return next(err);
            }
            if (canContinue) {
                return next(null, true);
            }
            return next(boom.forbidden(message));
        });
    };

    // Use eachSeries to get quick fails and ordering
    async.eachSeries(policiesToRun, checkPolicy, function(err, result) {

        if (err) {
            return reply(err);
        }

        reply.continue();
    });
};

var preHandler = function(request, reply) {

    runPolicies(data.pre, request, reply);
};

var postHandler = function(request, reply) {

    runPolicies(data.post, request, reply);
};

var loadPolicies = function(server, policyDirectory, next) {

    var match = null;
    var re = /(.+)\.js$/;

    var addPolicy = function(filename, addPolicyNext) {

        // Only looking for .js files in the policies folder
        match = filename.match(re);
        if (match) {
            // Does this policy already exist
            if (data.names.indexOf(match[1]) !== -1) {
                server.log(['error'], 'Trying to add a duplicate policy: ' + match[1]);
                return addPolicyNext(new Error('Trying to add a duplicate policy: ' + match[1]));
            }

            data.names.push(match[1]);

            // Add this policy function to the data object
            var policy = require(path.join(policyDirectory, filename));
            if (policy.pre === undefined || policy.pre) {
                server.log(['info'], 'Adding a new PRE policy called ' + match[1]);
                data.pre[match[1]] = policy;

                // connect the prehandler if this is the first pre policy
                if (!data.setPreHandler) {
                    server.ext('onPreHandler', preHandler);
                    data.setPreHandler = true;
                }
            }
            if (policy.post) {
                server.log(['info'], 'Adding a new POST policy called ' + match[1]);
                data.post[match[1]] = policy;

                // connect the posthandler if this is the first post policy
                if (!data.setPostHandler) {
                    server.ext('onPostHandler', postHandler);
                    data.setPostHandler = true;
                }
            }
        }

        addPolicyNext();
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