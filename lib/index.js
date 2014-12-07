'use strict';

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var hoek = require('hoek');
var path = require('path');

var inited = false;

function runPolicies(policies, request, next) {
    var policyNames = hoek.reach(request, 'route.plugins.policy');
    if (!policyNames) return next(); // continue as normal

    function checkPolicy(policy, callback) {
        // To alter the response look at request.response.
        policy(request, function(err, canContinue, message) {
            if (err) return callback(err); // you can provide a custom hapi error object here.
            if (canContinue) return callback(null, true);
            return callback(request.hapi.error.forbidden(message)); // if a message is passed in use it in the forbidden message
        });
    }

    var policiesToRun = _(policies) // begin a lodash chainable object
        .pick(policyNames) // just the policies included in this route
        .values() // we want the values (checker functions) not the keys
        .value(); // convert to an array

    // use eachSeries to get quick fails and ordering
    async.eachSeries(policiesToRun, checkPolicy, function(err, result) {
        next(err, result);
    });
}

function onPreHandler(request, next) {
    runPolicies(request.server.pack.app.policies.pre, request, next);
}

function onPostHandler(request, next) {
    runPolicies(request.server.pack.app.policies.post, request, next);
}

function loadPolicies(plugin, policyDirectory, next) {
    var match = null;
    var re = /(.+)\.js$/; // Only looking for .js files in the policies folder.

    function addPolicy(filename) {
        match = filename.match(re);
        if (match) {
            // Does this policy already exist?
            if (plugin.app.policies.names.indexOf(match[1]) !== -1) {
                plugin.log(['error'], 'Trying to add a duplicate policy: ' + match[1]);
                next(new Error('Trying to add a duplicate policy: ' + match[1]));
                return;
            }

            plugin.app.policies.names.push(match[1]);

            // Add this to the plugin.app.policies object.
            var policy = require(path.join(policyDirectory, filename));
            if (policy.pre === undefined || policy.pre) {
                plugin.log(['info'], 'Adding a new PRE policy called ' + match[1]);
                console.log('Adding a new PRE policy called ' + match[1]);
                plugin.app.policies.pre[match[1]] = policy;
            }
            if (policy.post) {
                plugin.log(['info'], 'Adding a new POST policy called ' + match[1]);
                console.log('Adding a new POST policy called ' + match[1]);
                plugin.app.policies.post[match[1]] = policy;
            }
        }
    }

    // initialize policies object.
    plugin.app.policies = plugin.app.policies || {
        names: [],
        pre: [],
        post: []
    };

    _.forEach(fs.readdirSync(policyDirectory), addPolicy);
}

exports.setup = function register(plugin, options, next) {
    if (!options.policyDirectory) {
        plugin.log('error', 'policyDirectory option is required to setup MrHorse.');
        return next(new Error('policyDirectory is required for MrHorse.'));
    }

    loadPolicies(plugin, options.policyDirectory, function(err) {
        if (err) {
            return next(err);
        }
    });

    // Make sure we don't end up with duplicate handlers if the module is used
    // more than once.
    if (!inited) {
        inited = true;
        plugin.ext('onPreHandler', onPreHandler);
        plugin.ext('onPostHandler', onPostHandler);
    }

    return next();
};