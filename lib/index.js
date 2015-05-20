'use strict';

var _ = require('lodash');
var async = require('async');
var boom = require('boom');
var fs = require('fs');
var hoek = require('hoek');
var path = require('path');

var _applyPoints = ['onRequest',
    'onPreAuth',
    'onPostAuth',
    'onPreHandler',
    'onPostHandler',
    'onPreResponse'];

var data = {
    names: [],
    setHandlers: {}
};

/* adding arrays, to hold the policies */
_applyPoints.forEach(function (applyPoint) {
    data[applyPoint] = {};
});

var runPolicies = function (policies, request, reply) {

    var policyNames = hoek.reach(request, 'route.settings.plugins.policies');
    if (!policyNames) {
        return reply.continue();
    }

    var policiesToRun = _(policies) // Begin a lodash chainable object
        .pick(policyNames) // Just the policies included in this route
        .values() // We want the values (the functions), not the keys
        .value(); // Convert to an array

    var checkPolicy = function (policy, next) {
        policy(request, reply, function (err, canContinue, message) {
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
    async.eachSeries(policiesToRun, checkPolicy, function (err) {
        if (!reply._replied) {
            if (err) {
                return reply(err);
            }

            reply.continue();
        }
    });
};

/* generate handlers, one handler for each application point */
var handlers = {};
_applyPoints.forEach(function (applyPoint) {
    handlers[applyPoint] = function (request, reply) {
        runPolicies(data[applyPoint], request, reply);
    };
});

var loadPolicies = function (server, options, next) {

    var match = null;
    var re = /(.+)\.js$/;

    var policyFiles = fs.readdirSync(options.policyDirectory);
    if (policyFiles.length === 0) {
        return next();
    }

    function addPolicy(filename, addPolicyNext) {

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
            var policy = require(path.join(options.policyDirectory, filename));

            // Check if the apply point is correct
            if (policy.applyPoint && _applyPoints.indexOf(policy.applyPoint) === -1) {
                server.log(['error'], 'Trying to set incorrect applyPoint for the policy: ' + policy.applyPoint);
                return addPolicyNext(new Error('Trying to set incorrect applyPoint for the policy: ' + policy.applyPoint));
            }

            // going further, filling the policies vs application points list
            if (policy.applyPoint === undefined || policy.applyPoint) {
                var applyPoint = policy.applyPoint || options.defaultApplyPoint;

                server.log(['info'], 'Adding a new PRE policy called ' + match[1]);
                data[applyPoint][match[1]] = policy;

                // connect the handler if this is the first pre policy
                if (!data.setHandlers[applyPoint]) {
                    server.ext(applyPoint, handlers[applyPoint]);
                    data.setHandlers[applyPoint] = true;
                }
            }
        }

        addPolicyNext();
    }

    async.eachSeries(policyFiles, addPolicy, function (err) {

        next(err);
    });
};

var reset = function reset() {

    data = {
        names: [],
        setHandlers: {}
    };

    /* adding arrays to hold the policies */
    _applyPoints.forEach(function (applyPoint) {
        data[applyPoint] = {};
    });
};

exports.register = function register(server, options, next) {

    server.expose('loadPolicies', loadPolicies);
    server.expose('data', data);
    server.expose('reset', reset);

    options.defaultApplyPoint = options.defaultApplyPoint || 'onPreHandler'; // default application point

    if (options.policyDirectory !== undefined) {
        loadPolicies(server, options, function (err) {
            next(err);
        });
    }
    else {
        next();
    }
};

exports.register.attributes = {
    pkg: require('../package.json')
};
