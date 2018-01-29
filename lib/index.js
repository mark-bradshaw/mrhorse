'use strict';

const _ = require('lodash');
const Boom = require('boom');
const Fs = require('fs');
const Hoek = require('hoek');
const Path = require('path');

const _applyPoints = ['onRequest',
    'onPreAuth',
    'onPostAuth',
    'onPreHandler',
    'onPostHandler',
    'onPreResponse'];

const hasValidApplyPoint = (policy) => {

    return !policy.applyPoint || _applyPoints.indexOf(policy.applyPoint) !== -1;
};

// Memoizes by converting ['policy1', ..., 'policyN'] to 'policy1,...,policyN' as key
const determineAggregateApplyPoint = _.memoize((policyNames) => {

    Hoek.assert(Array.isArray(policyNames), 'Requires array of policy names.');
    Hoek.assert(policyNames.length > 0, 'Requires non-empty array of policy names.');
    Hoek.assert(_.intersection(data.names, policyNames).length === policyNames.length, 'Requires loaded policy names.');

    const firstPolicy = policyNames[0];

    let applyPoint;
    for (let i = 0; i < _applyPoints.length; ++i) {

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

let data = {
    names: [],
    rawPolicies: {},
    setHandlers: {}
};

/* adding arrays, to hold the policies */
_applyPoints.forEach((applyPoint) => {

    data[applyPoint] = {};
});


const negotiateError = (err) => {

    if (_.isError(err)) {
        if (!Boom.isBoom(err)) {
            Boom.boomify(err, { statusCode: 403, override: false });
        }

        return err;
    }

    // In case someone throws a string or something equally terrifying
    return Boom.forbidden(err);
};

const runPolicies = async (policiesToRun, request, h) => {

    for (const policy of policiesToRun) {
        try {
            const policyResult = await policy(request, h);

            if (policyResult !== h.continue) {

                return policyResult;
            }
        }
        catch (err) {
            throw negotiateError(err);
        }
    }

    return h.continue;
};

/* generate handlers, one handler for each application point */
const handlers = {};
_applyPoints.forEach((applyPoint) => {

    handlers[applyPoint] = async (request, h) => {

        const applyPointPolicies = data[applyPoint];
        const routePolicies = Hoek.reach(request, 'route.settings.plugins.policies');
        if (!routePolicies) {
            return h.continue;
        }

        const policiesToRun = routePolicies.reduce((tmpList, routePolicy) => {

            // Transform array to parallel, determine apply point in advance
            let aggregateApplyPoint;
            if (Array.isArray(routePolicy)) {

                aggregateApplyPoint = determineAggregateApplyPoint(routePolicy);

                if (aggregateApplyPoint === applyPoint) {
                    routePolicy = exports.parallel.apply(this, routePolicy);
                }
                else {
                    routePolicy = null;
                }
            }

            if (typeof routePolicy === 'string') {

                // Look for missing policies.  Probably due to misspelling.
                if (data.names.indexOf(routePolicy) === -1) {
                    throw Boom.notImplemented('Missing policy: ' + routePolicy);
                }

                if (applyPointPolicies[routePolicy]) {
                    tmpList.push(applyPointPolicies[routePolicy]);
                }

            }
            else if (typeof routePolicy === 'function') {

                // If an aggregate apply point wasn't already determined
                // but an aggregate apply point seems like it will be used, determine it from `policy.runs`.
                // `policy.runs` is an array of loaded policies reported by an aggregate policy
                // such as MrHorse.parallel, specifically for determining
                // its apply point ad hoc, notably here in the extension handler.
                if (!aggregateApplyPoint && routePolicy.runs && !routePolicy.applyPoint) {
                    aggregateApplyPoint = determineAggregateApplyPoint(routePolicy.runs);
                }

                if (!hasValidApplyPoint(routePolicy)) {
                    throw Boom.badImplementation('Trying to use incorrect applyPoint for the dynamic policy: ' + routePolicy.applyPoint);
                }

                const effectiveApplyPoint = routePolicy.applyPoint || aggregateApplyPoint || request.server.plugins.mrhorse.defaultApplyPoint;

                if (effectiveApplyPoint === applyPoint) {
                    tmpList.push(routePolicy);
                }

            }
            else if (routePolicy !== null) {

                throw Boom.badImplementation('Policy not specified by name or by function.');
            }

            return tmpList;
        }, []);

        return await runPolicies(policiesToRun, request, h);
    };
});


const addPolicy = (policyName, policy, server, options) => {

    // Does this policy already exist
    if (hasPolicy(policyName)) {
        if (options.ignoreDuplicates) {
            return;
        }

        throw new Error('Trying to add a duplicate policy: ' + policyName);
    }

    // Check if the apply point is correct
    if (!hasValidApplyPoint(policy)) {
        throw new Error('Trying to set incorrect applyPoint for the policy: ' + policy.applyPoint);
    }

    // going further, filling the policies vs application points list
    if (policy.applyPoint === undefined || policy.applyPoint) {
        const applyPoint = policy.applyPoint || options.defaultApplyPoint;

        server.log(['info'], 'Adding a new policy called ' + policyName);
        data[applyPoint][policyName] = policy;
        data.rawPolicies[policyName] = policy;
        data.names.push(policyName);

        // connect the handler if this is the first policy
        if (!data.setHandlers[applyPoint]) {
            server.ext(applyPoint, handlers[applyPoint]);
            data.setHandlers[applyPoint] = true;
        }
    }
};


const loadPolicies = (server, options) => {

    let match = null;
    const re = /(.+)\.js$/;

    options.defaultApplyPoint = options.defaultApplyPoint || 'onPreHandler'; // default application point

    const policyFiles = Fs.readdirSync(options.policyDirectory);
    if (policyFiles.length === 0) {
        return;
    }

    const loadPolicyFile = (filename) => {

        // Only looking for .js files in the policies folder
        match = filename.match(re);
        if (match) {

            const policyData = require(Path.join(options.policyDirectory, filename));

            try {
                if (_.isPlainObject(policyData)) {
                    _.each(policyData, (policy, policyName) => addPolicy(policyName, policy, server, options));
                }
                else {
                    addPolicy(match[1], policyData, server, options);
                }
            }
            catch (err) {
                server.log(['error'], err.message);
                throw err;
            }
        }
    };

    for (const policyFile of policyFiles) {
        loadPolicyFile(policyFile);
    }
};


const hasPolicy = (policyName) => {

    return (data.names.indexOf(policyName) !== -1);
};


const reset = function reset() {

    data = {
        names: [],
        rawPolicies: {},
        setHandlers: {}
    };

    /* clear memoize cache */
    determineAggregateApplyPoint.cache.clear();

    /* adding arrays to hold the policies */
    _applyPoints.forEach((applyPoint) => {

        data[applyPoint] = {};
    });
};


exports.plugin = { pkg: require('../package.json') };

exports.plugin.register = async function register(server, options) {

    options.defaultApplyPoint = options.defaultApplyPoint || 'onPreHandler'; // default application point

    Hoek.assert(_applyPoints.indexOf(options.defaultApplyPoint) !== -1, 'Specified invalid defaultApplyPoint: ' + options.defaultApplyPoint);

    server.expose('loadPolicies', loadPolicies);
    server.expose('data', data);
    server.expose('reset', reset);
    server.expose('orPolicy', exports.orPolicy);
    server.expose('parallel', exports.parallel);
    server.expose('addPolicy', (policyName, policy) => addPolicy(policyName, policy, server, options));
    server.expose('hasPolicy', hasPolicy);
    server.expose('defaultApplyPoint', options.defaultApplyPoint);

    if (options.policyDirectory !== undefined) {
        await loadPolicies(server, options);
    }

    if (options.watchApplyPoints !== undefined) {
        Hoek.assert(Array.isArray(options.watchApplyPoints), 'watchApplyPoints must be an array');

        options.watchApplyPoints.forEach((applyPoint) => {

            if (!data.setHandlers[applyPoint]) {
                server.ext(applyPoint, handlers[applyPoint]);
                data.setHandlers[applyPoint] = true;
            }
        });
    }
};


/* Policy aggregation tools */
exports.parallel = function (/*policy1, policy2, [cb]*/) {

    Hoek.assert(arguments.length, 'Requires at least one argument.');

    const args = Array.prototype.slice.call(arguments);

    // This error aggregator is used by default, giving priority to error responses
    // by the policies' listed order.
    const defaultErrorHandler = (ranPolicies, results) => {

        for (let i = 0; i < ranPolicies.length; ++i) {

            const result = results[ranPolicies[i]];

            if (result.err || result.status === 'error') {

                throw result.err;
            }

        }
    };

    // Determine the error handler and policies we're using
    let errorHandler;
    let policyNames;

    if (typeof args[args.length - 1] === 'function') {

        errorHandler = args[args.length - 1];
        policyNames = args.slice(0, -1);
    }
    else {

        errorHandler = defaultErrorHandler;
        policyNames = args;
    }

    Hoek.assert(_.uniq(policyNames).length === policyNames.length, 'Listed policies must be unique.');

    const managePolicy = async (policy, request, h) => {

        try {
            const result = await policy(request, h);

            return { status: 'ok', result };
        }
        catch (err) {
            return { status: 'error', err };
        }
    };

    // Aggregate policy
    const aggregatePolicy = async (request, h) => {

        const policies = _(data.rawPolicies)
            .pick(policyNames)
            .mapValues((policy) => (managePolicy(policy, request, h)))
            .value();

        const results = _.zipObject(_.keys(policies), await Promise.all(_.values(policies)));

        errorHandler(policyNames, results);

        return h.continue;
    };

    // Report to MrHorse handler which policies are going to be run
    aggregatePolicy.runs = policyNames;

    // Here ya go!
    return aggregatePolicy;
};


exports.orPolicy = function () {

    const args = Array.prototype.slice.call(arguments);

    args.push(
        (ranPolicies, results) => {

            // successful if at least one policy was OK
            const success = !_.every(ranPolicies, (policyName) => (results[ policyName ].status === 'error'));

            if (success) {
                return;
            }

            // find left-most failed policy
            const failed = _.find(results, { status : 'error' });

            throw failed.err;
        }
    );

    return exports.parallel.apply(this, args);
};
