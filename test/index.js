/* eslint-disable */

var MrHorse = require('..');
var Code = require('code');
var fs = require('fs');
var Hapi = require('hapi');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var util = require('util');

var request = {
    route: {
        settings: {
            plugins: {
                policies: {}
            }
        }
    }
};

var reply = {
    called  : 0,
    continue: function () {
        reply.called++;
    }
};

var server = null;

lab.experiment('Non standard setups', function (done) {

    lab.before(function (done) {
        try {
            fs.rmdirSync(__dirname + '/emptypolicies');
            fs.unlinkSync(__dirname + '/incorrect-policies/incorrectApplyPoint.js');
            fs.rmdirSync(__dirname + '/incorrect-policies');
        }
        catch( err ) { /* do nothing */ }

        done();
    });


    lab.beforeEach(function (done) {

        server = new Hapi.Server();
        server.connection({
            port: 12345
        });
        done();
    });

    lab.test('can register without a policy directory', function (done) {

        server.register({
                register: MrHorse,
                options: {}
            },
            function () {

                Code.expect(server.plugins.mrhorse).to.be.an.object();
                Code.expect(server.plugins.mrhorse.data.names.length).to.equal(0);
                done();
            });
    });

    lab.test('ignores an empty policy directory', function (done) {

        try {
            fs.mkdirSync(__dirname + '/emptypolicies');
        }
        catch (err) {
            console.log(err);
        }

        server.register({
                register: MrHorse,
                options: {
                    policyDirectory: __dirname + '/emptypolicies'
                }
            },
            function () {

                Code.expect(server.plugins.mrhorse).to.be.an.object();
                Code.expect(server.plugins.mrhorse.data.names.length).to.equal(0);

                // cleanup
                try {
                    fs.rmdirSync(__dirname + '/emptypolicies');
                }
                catch (err) {
                    console.log(err);
                }

                done();
            });
    });

    lab.test('accepts an alternate default apply point', function(done) {

        server.register({
            register: MrHorse,
            options : {
                policyDirectory: __dirname + '/policies',
                defaultApplyPoint: 'onPostHandler'
            }
        }, function (err) {

            if (err) {
                console.log(err);
            }

            Code.expect(server.plugins.mrhorse.data.setHandlers.onPostHandler).to.equal(true);
            Code.expect(Object.keys(server.plugins.mrhorse.data.onPostHandler).length).to.equal(14);

            server.plugins.mrhorse.reset();

            done();
        });
    });

    lab.test('asserts on invalid defaultApplyPoint option.', function(done) {

        var registration = function() {
            server.register({
                register: MrHorse,
                options : {
                    policyDirectory: __dirname + '/policies',
                    defaultApplyPoint: 'onIncorrect'
                }
            }, function(err) {

                if (err) {
                    console.error(err);
                }
            });
        };

        Code.expect(registration).to.throw(Error, 'Specified invalid defaultApplyPoint: onIncorrect');
        done();
    });

    lab.test('incorrect applyPoint', function (done) {

        // pull this bad policy in to the policies folder.
        try {
            fs.mkdirSync(__dirname + '/incorrect-policies');
            fs.writeFileSync(__dirname + '/incorrect-policies/incorrectApplyPoint.js', fs.readFileSync(__dirname + '/fixtures/incorrectApplyPoint.js'));
        } catch (err) {
            console.log(err);
        }

        server.register({
                register: MrHorse,
                options : {
                    policyDirectory: __dirname + '/incorrect-policies'
                }
            },
            function (err) {

                Code.expect(err.toString()).to.equal('Error: Trying to set incorrect applyPoint for the policy: onIncorrect');

                // cleanup
                server.plugins.mrhorse.reset();
                try {
                    fs.unlinkSync(__dirname + '/incorrect-policies/incorrectApplyPoint.js');
                    fs.rmdirSync(__dirname + '/incorrect-policies');
                } catch (err2) {
                    console.log(err2);
                }

                done();

            });
    });
});

lab.experiment('Normal setup', function (done) {

    lab.beforeEach(function (done) {

        server = new Hapi.Server({
            debug: {
                request: false // we don't need to see tested implementation errors in console.
            }
        });

        server.connection({
            port: 1234
        });

        server.route({
            method : 'GET',
            path   : '/none',
            handler: function (request, reply) {
                reply('none');
            }
        });

        server.route({
            method : 'GET',
            path   : '/ok',
            handler: function (request, reply) {

                reply('ok');
            },
            config : {
                plugins: {
                    policies: ['passes']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/fails',
            handler: function (request, reply) {

                reply('ok');
            },
            config : {
                plugins: {
                    policies: ['fails']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/custommessage',
            handler: function (request, reply) {

                reply('ok');
            },
            config : {
                plugins: {
                    policies: ['customMessage']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/customerror',
            handler: function (request, reply) {

                reply('ok');
            },
            config : {
                plugins: {
                    policies: ['customError']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/posthandler',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: ['postHandler']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/twopolicies',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: ['passes', 'secondPasses']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/redirects',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: ['redirects']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/misspelled-policy',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: ['misspelled1', 'misspelled2']
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/policy-as-function-passes',
            handler: function (request, reply) {

                reply('ok');
            },
            config : {
                plugins: {
                    policies: [ require('./policies/passes') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/policy-as-function-bad-applypoint',
            handler: function (request, reply) {

                reply('ok');
            },
            config : {
                plugins: {
                    policies: [ require('./fixtures/incorrectApplyPoint') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/policy-as-function-posthandler',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [ require('./policies/postHandler') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/policy-bad-type',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [ {object: 'invalidPlainObject'} ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-ok',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [ MrHorse.parallel('postHandler', 'postHandlerAnother') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-fails',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [ MrHorse.parallel('passes', 'fails') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-custom-error',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [ MrHorse.parallel('customError', 'passes') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-default-handler',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [ MrHorse.parallel('passes', 'timedCustomMessageLate', 'timedCustomMessageEarly') ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-custom-handler',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.parallel('passes', 'customMessage',
                        function (policyNames, results, next) {

                            var transformedMessage = results.customMessage.message + ' and transformed';
                            next(null, false, transformedMessage);
                        })
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-as-array',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        ['postHandler', 'postHandlerAnother']
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/or-first-ok',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.orPolicy( 'multiPolicyOkA', 'multiPolicyFailB' )
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/or-second-ok',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.orPolicy( 'multiPolicyFailA', 'multiPolicyOkB' )
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/or-both-ok',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.orPolicy( 'multiPolicyOkA', 'multiPolicyOkB' )
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/or-both-fail',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.orPolicy( 'multiPolicyFailA', 'multiPolicyFailB' )
                    ]
                }
            }
        });

        server.register({
            register: MrHorse,
            options : {
                policyDirectory: __dirname + '/policies',
                defaultApplyPoint: 'onPreHandler'
            }
        }, function (err) {

            if (err) {
                console.log(err);
            }
            server.start(function () {

                done();
            });
        });
    });

    lab.afterEach(function (done) {

        server.plugins.mrhorse.reset();
        server.stop(function () {

            done();
        });
    });

    lab.test('loads policies from a directory', function (done) {

        Code.expect(server.plugins.mrhorse.data.names.length).to.be.greaterThan(0);
        done();
    });

    lab.test('does not allow duplication of policies', function (done) {

        server.plugins.mrhorse.loadPolicies(server, {policyDirectory: __dirname + '/policies'}, function (err) {

            Code.expect(err.toString()).to.equal('Error: Trying to add a duplicate policy: customError');
            done();
        });

    });

    lab.test('ignores duplicate policies', function (done) {

        server.plugins.mrhorse.loadPolicies(server, {policyDirectory: __dirname + '/policies', ignoreDuplicates: true}, function (err) {
            Code.expect(err).to.not.exist();
            done();
        });

    });

    lab.test('loads multiple policies from a single file', function (done) {

        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyOkA')).to.equal(true);
        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyFailA')).to.equal(true);
        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyOkB')).to.equal(true);
        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyFailB')).to.equal(true);
        done();
    });

    lab.test('routes do not have to have a policy', function (done) {

        server.inject('/none', function (res) {

            Code.expect(res.result).to.equal('none');
            done();
        });
    });

    lab.test('passing policies get to route handler', function (done) {

        server.inject('/ok', function (res) {

            Code.expect(res.result).to.equal('ok');
            done();
        });
    });

    lab.test('failing policies get a 403', function (done) {

        server.inject('/fails', function (res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.error).to.equal('Forbidden');
            done();
        });
    });

    lab.test('failing policies with a custom message get the message sent in the reply', function (done) {

        server.inject('/custommessage', function (res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.message).to.equal('custom');
            done();
        });
    });

    lab.test('failing policy can give a custom error', function (done) {

        server.inject('/customerror', function (res) {

            Code.expect(res.statusCode).to.equal(404);
            done();
        });
    });

    lab.test('policy can run as a posthandler', function (done) {

        server.inject('/posthandler', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.added).to.equal('this');
            done();
        });
    });

    lab.test('runs all policies', function (done) {

        server.inject('/twopolicies', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.ranSecondPasses).to.equal(true);
            done();
        });
    });

    lab.test('policy which redirects', function (done) {

        server.inject('/redirects', function (res) {

            Code.expect(res.statusCode).to.equal(302);
            done();
        });
    });

    lab.test('error on misspelled policy', function (done) {

        server.inject('/misspelled-policy', function (res) {

            Code.expect(res.statusCode).to.equal(501);
            done();
        });
    });

    lab.test('runs policy as function', function (done) {

        server.inject('/policy-as-function-passes', function (res) {

            Code.expect(res.result).to.equal('ok');
            done();
        });
    });

    lab.test('implementation error on policy as function with bad applyPoint', function (done) {

        var requestError;

        var setRequestError = function (request, event) {

            if (event.tags.length === 3 && event.tags[2] === 'error') {
                requestError = event.data;
            }
        }

        server.on('request-internal', setRequestError);

        server.inject('/policy-as-function-bad-applypoint', function (res) {

            Code.expect(res.statusCode).to.equal(500);

            setTimeout(() => {
                server.removeListener('request-internal', setRequestError);

                Code.expect(requestError.message).to.equal('Trying to use incorrect applyPoint for the dynamic policy: onIncorrect');
                done();
            }, 5);

        });
    });

    lab.test('runs policy as function with explicit applyPoint', function (done) {

        server.inject('/policy-as-function-posthandler', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.added).to.equal('this');
            done();
        });

    });

    lab.test('implementation error on policy not specified as string or function', function (done) {

        var requestError;

        var setRequestError = function (request, event) {

            if (event.tags.length === 3 && event.tags[2] === 'error') {
                requestError = event.data;
            }
        }

        server.on('request-internal', setRequestError);

        server.inject('/policy-bad-type', function (res) {

            Code.expect(res.statusCode).to.equal(500);

            setTimeout(() => {
                server.removeListener('request-internal', setRequestError);

                Code.expect(requestError.message).to.equal('Policy not specified by name or by function.');
                done();
            }, 5);
        });
    });

    lab.test('parallel aggregate policy runs multiple policies', function (done) {

        server.inject('/parallel-ok', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.added).to.equal('this');
            Code.expect(res.result.addedAnother).to.equal('that');
            done();
        });
    });

    lab.test('parallel aggregate policy fails if one policy fails', function (done) {

        server.inject('/parallel-fails', function (res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.error).to.equal('Forbidden');
            done();
        });
    });

    lab.test('parallel aggregate policy respects custom error responses', function (done) {

        server.inject('/parallel-custom-error', function (res) {

            Code.expect(res.statusCode).to.equal(404);
            done();
        });
    });

    lab.test('parallel aggregate policy default error handler fails with error prioritized by listed policy order.', function (done) {

        server.inject('/parallel-default-handler', function (res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.message).to.equal('custom late');
            done();
        });
    });

    lab.test('parallel aggregate policy accepts custom error handler.', function (done) {

        server.inject('/parallel-custom-handler', function (res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.message).to.equal('custom and transformed');
            done();
        });
    });

    lab.test('parallel aggregate policy runs multiple policies when specified in array format', function (done) {

        server.inject('/parallel-as-array', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.added).to.equal('this');
            Code.expect(res.result.addedAnother).to.equal('that');
            done();
        });
    });

    lab.test('policy can be added programmatically', function (done) {

        Code.expect(server.plugins.mrhorse.hasPolicy('yetAnotherPolicy')).to.equal(false);

        server.plugins.mrhorse.addPolicy('yetAnotherPolicy', (request, reply, callback) => callback(null, true));

        Code.expect(server.plugins.mrhorse.hasPolicy('yetAnotherPolicy')).to.equal(true);
        done();
    });

    lab.test('hasPolicy returns false on non-existent policies', function (done) {
        Code.expect(server.plugins.mrhorse.hasPolicy('thisPolicyAbsolutelyDoesNotExist')).to.equal(false);
        done();
    });

    lab.test('orPolicy creates a chain of policies in which only one must succeed (left)', function (done) {

        server.inject('/or-first-ok', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('orPolicy creates a chain of policies in which only one must succeed (right)', function (done) {

        server.inject('/or-second-ok', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('orPolicy creates a chain of policies in which both may succeed', function (done) {

        server.inject('/or-both-ok', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            done();
        });
    });

    lab.test('orPolicy creates a chain of policies in which at least one must succeed', function (done) {

        server.inject('/or-both-fail', function (res) {

            Code.expect(res.statusCode).to.equal(403);
            done();
        });
    });

    lab.test('programmatically added policy can be attached to a route', function (done) {

        const policyName = 'injectedPolicy';
        var policyCalled = false;

        Code.expect(server.plugins.mrhorse.hasPolicy(policyName)).to.equal(false);

        const policy = (request, reply, next) => {

            policyCalled = true;
            next( null, true );
        };

        server.plugins.mrhorse.addPolicy(policyName, policy);

        server.route({
            method : 'GET',
            path   : '/add-policy-test',
            handler: function (request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config : {
                plugins: {
                    policies: [
                        policyName
                    ]
                }
            }
        });

        Code.expect(policyCalled).to.equal(false);

        server.inject('/add-policy-test', function (res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(policyCalled).to.equal(true);
            done();
        });

    });


});
