'use strict';

var _ = require('lodash');
var Items = require('items');
var Boom = require('boom');
var Fs = require('fs');
var Hoek = require('hoek');
var Path = require('path');

var _applyPoints = ['onRequest',
    'onPreAuth',
    'onPostAuth',
    'onPreHandler',
    'onPostHandler',
    'onPreResponse'];

var hasValidApplyPoint = function (policy) {

    return !policy.applyPoint || _applyPoints.indexOf(policy.applyPoint) !== -1;
};

// Memoizes by converting ['policy1', ..., 'policyN'] to 'policy1,...,policyN' as key
var determineAggregateApplyPoint = _.memoize(function (policyNames) {

    Hoek.assert(Array.isArray(policyNames), 'Requires array of policy names.');
    Hoek.assert(policyNames.length > 0, 'Requires non-empty array of policy names.');
    Hoek.assert(_.intersection(data.names, policyNames).length === policyNames.length, 'Requires loaded policy names.');

    var firstPolicy = policyNames[0];

    var applyPoint;
    for (var i = 0; i < _applyPoints.length; ++i) {

        // Check if the first policy appears to have this apply point.
        if (!applyPoint &&
            Object.keys(data[_applyPoints[i]]).indexOf(firstPolicy) !== -1) {

            applyPoint = _applyPoints[i];
        }
    }

    Hoek.assert(applyPoint, 'Policies must be in a valid applyPoint.');
    Hoek.assert(_.intersection(Object.keys(data[applyPoint]), policyNames).length === policyNames.length,
                'Aggregate policies must be from same applyPoint.');

    return applyPoint;
});

var data = {
    names: [],
    rawPolicies: {},
    setHandlers: {}
};

/* adding arrays, to hold the policies */
_applyPoints.forEach(function (applyPoint) {

    data[applyPoint] = {};
});

var runPolicies = function (policiesToRun, request, reply) {

    var checkPolicy = function (policy, next) {

        policy(request, reply, function (err, canContinue, message) {

            if (err) {
                // You can provide a custom hapi error object here
                return next(err);
            }
            if (canContinue) {
                return next(null, true);
            }
            return next(Boom.forbidden(message));
        });
    };

    // Use eachSeries to get quick fails and ordering
    Items.serial(policiesToRun, checkPolicy, function (err) {

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

        var applyPointPolicies = data[applyPoint];
        var routePolicies = Hoek.reach(request, 'route.settings.plugins.policies');
        if (!routePolicies) {
            return reply.continue();
        }

        var repliedWithError = false;
        var policiesToRun = routePolicies.reduce(function (tmpList, routePolicy) {

            // Already replied
            if (repliedWithError) {
                return;
            }

            // Transform array to parallel, determine apply point in advance
            var aggregateApplyPoint;
            if (Array.isArray(routePolicy)) {

                aggregateApplyPoint = determineAggregateApplyPoint(routePolicy);

                if (aggregateApplyPoint === applyPoint) {
                    routePolicy = exports.parallel.apply(this, routePolicy);
                } else {
                    routePolicy = null;
                }
            }

            if (typeof routePolicy === 'string') {

                // Look for missing policies.  Probably due to misspelling.
                if (data.names.indexOf(routePolicy) === -1) {
                    repliedWithError = true;
                    return reply(Boom.notImplemented('Missing policy: ' + routePolicy));
                }

                if (applyPointPolicies[routePolicy]) {
                    tmpList.push(applyPointPolicies[routePolicy]);
                }

            } else if (typeof routePolicy === 'function') {

                if (!aggregateApplyPoint && routePolicy.runs && !routePolicy.applyPoint) {

                    aggregateApplyPoint = determineAggregateApplyPoint(routePolicy.runs);
                }

                if (!hasValidApplyPoint(routePolicy)) {
                    repliedWithError = true;
                    return reply(Boom.badImplementation('Trying to use incorrect applyPoint for the dynamic policy: ' + routePolicy.applyPoint));
                }

                var effectiveApplyPoint = routePolicy.applyPoint || aggregateApplyPoint || request.server.plugins.mrhorse.defaultApplyPoint;

                if (effectiveApplyPoint === applyPoint) {
                    tmpList.push(routePolicy);
                }

            } else if (routePolicy !== null) {

                repliedWithError = true;
                return reply(Boom.badImplementation('Policy not specified by name or by function.'));
            }

            return tmpList;
        }, []);

        // Already replied
        if (repliedWithError) {
            return;
        }

        runPolicies(policiesToRun, request, reply);
    };
});

var loadPolicies = function (server, options, next) {

    var match = null;
    var re = /(.+)\.js$/;

    options.defaultApplyPoint = options.defaultApplyPoint || 'onPreHandler'; // default application point

    var policyFiles = Fs.readdirSync(options.policyDirectory);
    if (policyFiles.length === 0) {
        return next();
    }

    var addPolicy = function (filename, addPolicyNext) {

        // Only looking for .js files in the policies folder
        match = filename.match(re);
        if (match) {
            // Does this policy already exist
            if (data.names.indexOf(match[1]) !== -1) {
                server.log(['error'], 'Trying to add a duplicate policy: ' + match[1]);
                return addPolicyNext(new Error('Trying to add a duplicate policy: ' + match[1]));
            }

            // Add this policy function to the data object
            var policy = require(Path.join(options.policyDirectory, filename));

            // Check if the apply point is correct
            if (!hasValidApplyPoint(policy)) {
                server.log(['error'], 'Trying to set incorrect applyPoint for the policy: ' + policy.applyPoint);
                return addPolicyNext(new Error('Trying to set incorrect applyPoint for the policy: ' + policy.applyPoint));
            }

            // going further, filling the policies vs application points list
            if (policy.applyPoint === undefined || policy.applyPoint) {
                var applyPoint = policy.applyPoint || options.defaultApplyPoint;

                server.log(['info'], 'Adding a new policy called ' + match[1]);
                data[applyPoint][match[1]] = policy;
                data.rawPolicies[match[1]] = policy;
                data.names.push(match[1]);

                // connect the handler if this is the first pre policy
                if (!data.setHandlers[applyPoint]) {
                    server.ext(applyPoint, handlers[applyPoint]);
                    data.setHandlers[applyPoint] = true;
                }
            }
        }

        addPolicyNext();
    };

    Items.serial(policyFiles, addPolicy, function (err) {

        next(err);
    });
};

var reset = function reset () {

    data = {
        names: [],
        rawPolicies: {},
        setHandlers: {}
    };

    /* clear memoize cache */
    determineAggregateApplyPoint.cache.__data__ = {};

    /* adding arrays to hold the policies */
    _applyPoints.forEach(function (applyPoint) {

        data[applyPoint] = {};
    });
};

exports.register = function register (server, options, next) {

    options.defaultApplyPoint = options.defaultApplyPoint || 'onPreHandler'; // default application point

    Hoek.assert(_applyPoints.indexOf(options.defaultApplyPoint) !== -1, 'Specified invalid defaultApplyPoint: ' + options.defaultApplyPoint);

    server.expose('loadPolicies', loadPolicies);
    server.expose('data', data);
    server.expose('reset', reset);
    server.expose('defaultApplyPoint', options.defaultApplyPoint);

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

/* Policy aggregation tools */
exports.parallel = function (/*policy1, policy2, [cb]*/) {

    Hoek.assert(arguments.length, 'Requires at least one argument.');

    var args = Array.prototype.slice.call(arguments);

    // This error aggregator is used by default, giving priority to error responses
    // by the policies' listed order.
    var defaultErrorHandler = function (ranPolicies, results, next) {

        var result;
        for (var i = 0; i < ranPolicies.length; ++i) {

            result = results[ranPolicies[i]];

            if (result.err || !result.canContinue) {

                next(result.err, result.canContinue, result.message);
                break;
            }

        }

        next(null, true);
    };

    // Determine the error handler and policies we're using
    var errorHandler;
    var policyNames;
    if (typeof args[args.length - 1] === 'function') {

        errorHandler = args[args.length - 1];
        policyNames = args.slice(0, -1);
    } else {

        errorHandler = defaultErrorHandler;
        policyNames = args;
    }

    Hoek.assert(_.uniq(policyNames).length === policyNames.length, 'Listed policies must be unique.');

    // Wraps policy for use in Items.parallel.execute, never errors.
    var wrapPolicy = function (policy, request, reply) {

        return function (next) {

            policy(request, reply, function (err, canContinue, message) {

                next(null, {
                    err: err,
                    canContinue: canContinue,
                    message: message
                });
            });
        };
    };

    // Aggregate policy
    var aggregatePolicy = function (request, reply, next) {

        var policies = _(data.rawPolicies)
                        .pick(policyNames)
                        .mapValues(function (policy) {

                            return wrapPolicy(policy, request, reply);
                        }).value();

        Items.parallel.execute(policies, function (err, results) {

            Hoek.assert(!err, 'There should never be an error here because of wrapPolicy.');

            errorHandler(policyNames, results, next);
        });
    };

    // Report to MrHorse handler which policies are going to be run
    aggregatePolicy.runs = policyNames;

    // Here ya go!
    return aggregatePolicy;
};
