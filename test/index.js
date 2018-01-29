/* eslint-disable */

const MrHorse = require('..');
const Code = require('code');
const fs = require('fs');
const Hapi = require('hapi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const util = require('util');

const request = {
    route: {
        settings: {
            plugins: {
                policies: {}
            }
        }
    }
};

const reply = {
    called  : 0,
    continue: () => {
        reply.called++;
    }
};

let server = null;

lab.experiment('Non standard setups', () => {

    lab.before(() => {
        try {
            fs.rmdirSync(__dirname + '/emptypolicies');
            fs.unlinkSync(__dirname + '/incorrect-policies/incorrectApplyPoint.js');
            fs.rmdirSync(__dirname + '/incorrect-policies');
        }
        catch( err ) { /* do nothing */ }
    });


    lab.beforeEach(() => {

        server = new Hapi.Server( { port: 12345 } );
    });

    lab.test('can register without a policy directory', () => {

        return server.register({
                plugin: MrHorse,
                options: {}
            })
            .then( () => {
                Code.expect(server.plugins.mrhorse).to.be.an.object();
                Code.expect(server.plugins.mrhorse.data.names.length).to.equal(0);
            });
    });

    lab.test('ignores an empty policy directory', () => {

        try {
            fs.mkdirSync(__dirname + '/emptypolicies');
        }
        catch (err) {
            console.log(err);
        }

        return server.register({
                plugin: MrHorse,
                options: {
                    policyDirectory: __dirname + '/emptypolicies'
                }
            })
            .then( () => {
                Code.expect(server.plugins.mrhorse).to.be.an.object();
                Code.expect(server.plugins.mrhorse.data.names.length).to.equal(0);

                // cleanup
                try {
                    fs.rmdirSync(__dirname + '/emptypolicies');
                }
                catch (err) {
                    console.log(err);
                }
            });
    });

    lab.test('accepts an alternate default apply point', () => {

        return server.register({
            plugin: MrHorse,
            options : {
                policyDirectory: __dirname + '/policies',
                defaultApplyPoint: 'onPostHandler'
            }
        })
        .then( () => {
            Code.expect(server.plugins.mrhorse.data.setHandlers.onPostHandler).to.equal(true);
            Code.expect(Object.keys(server.plugins.mrhorse.data.onPostHandler).length).to.equal(15);

            server.plugins.mrhorse.reset();
        });
    });

    lab.test('asserts on invalid defaultApplyPoint option.', async () => {

        const registration = () => {
            return server.register({
                plugin: MrHorse,
                options : {
                    policyDirectory: __dirname + '/policies',
                    defaultApplyPoint: 'onIncorrect'
                }
            });
        };

        await Code.expect(registration()).to.reject(Error, 'Specified invalid defaultApplyPoint: onIncorrect');
    });

    lab.test('incorrect applyPoint', () => {

        // pull this bad policy in to the policies folder.
        try {
            fs.mkdirSync(__dirname + '/incorrect-policies');
            fs.writeFileSync(__dirname + '/incorrect-policies/incorrectApplyPoint.js', fs.readFileSync(__dirname + '/fixtures/incorrectApplyPoint.js'));
        } catch (err) {
            console.log(err);
        }

        return server.register({
                plugin: MrHorse,
                options : {
                    policyDirectory: __dirname + '/incorrect-policies'
                }
            })
            .then(
                () => { throw new Error('Unexpected success'); },
                (err) => {

                    Code.expect(err.toString()).to.equal('Error: Trying to set incorrect applyPoint for the policy: onIncorrect');
                }
            )
            .then(
                () => {

                   // cleanup
                    server.plugins.mrhorse.reset();
                    try {
                        fs.unlinkSync(__dirname + '/incorrect-policies/incorrectApplyPoint.js');
                        fs.rmdirSync(__dirname + '/incorrect-policies');
                    } catch (err2) {
                        console.log(err2);
                    }
            });
    });

    lab.test('ONLY dynamic function policies', () => {

        server.route({
            method : 'GET',
            path   : '/only-function-policy-passes',
            handler: () => {

                return {};
            },
            config : {
                plugins: {
                    policies: [ require('./policies/function-policy/postHandlerFunction') ]
                }
            }
        });

        return server.register({
            plugin: MrHorse,
            options : {
                watchApplyPoints: ['onPostHandler']
            }
        })
        .then(() => server.start)
        .then(() => server.inject('/only-function-policy-passes'))
        .then((res) => {
            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.posthandler).to.equal('posthandler');
        });
    });

});

lab.experiment('Normal setup', () => {

    lab.beforeEach(() => {

        server = new Hapi.Server({
            debug: {
                request: false // we don't need to see tested implementation errors in console.
            },
            port: 1234
        });

        server.route({
            method : 'GET',
            path   : '/none',
            handler: async () => {
                return 'none';
            }
        });

        server.route({
            method : 'GET',
            path   : '/ok',
            handler: async () => {

                return 'ok';
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
            handler: async () => {

                return 'ok';
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
            handler: async () => {

                return 'ok';
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
            handler: async () => {

                return 'ok'
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return 'ok';
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
            handler: async () => {

                return 'ok';
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async (request, reply) => {

                return {
                    handler: 'handler'
                };
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
            handler: async (request, reply) => {

                return {
                    handler: 'handler'
                };
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
            handler: async (request, reply) => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.parallel('passes', 'customMessage',
                        (policyNames, results) => {

                            throw new Error( results.customMessage.err.message + ' and transformed' );
                        })
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/parallel-as-array',
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
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
            handler: async () => {

                return {
                    handler: 'handler'
                };
            },
            config : {
                plugins: {
                    policies: [
                        MrHorse.orPolicy( 'multiPolicyFailA', 'multiPolicyFailB' )
                    ]
                }
            }
        });

        server.route({
            method : 'GET',
            path   : '/strange',
            handler: async () => {

                return {
                    handler: 'handler'
                };
            },
            config : {
                plugins: {
                    policies: [
                        'strangeError'
                    ]
                }
            }
        });

        return server.register({
            plugin: MrHorse,
            options : {
                policyDirectory: __dirname + '/policies',
                defaultApplyPoint: 'onPreHandler',
                watchApplyPoints: ['onPreHandler'] // this is used to make sure the handler doesn't apply twice.  NOT normally needed.
            }
        })
        .then(() => server.start())
        .catch(console.log)
    });


    lab.afterEach(() => {

        server.plugins.mrhorse.reset();

        return server.stop();
    });

    lab.test('only one preHandler when using watchApplyPoints', () => {

        Code.expect(server._core.extensions.route.onPreHandler.nodes.length).to.equal(1);
    });

    lab.test('loads policies from a directory', () => {

        Code.expect(server.plugins.mrhorse.data.names.length).to.be.greaterThan(0);
    });

    lab.test('does not allow duplication of policies', () => {

        try {
            server.plugins.mrhorse.loadPolicies(server, {policyDirectory: __dirname + '/policies'});
            throw new Error('Should not reach here');
        }
        catch(err) {
            Code.expect(err.toString()).to.equal('Error: Trying to add a duplicate policy: customError');
        }
    });

    lab.test('ignores duplicate policies', () => {

        try {
            server.plugins.mrhorse.loadPolicies(server, {policyDirectory: __dirname + '/policies', ignoreDuplicates: true});
        }
        catch(err) {
            throw new Error('Should not reach here');
        }
    });

    lab.test('loads multiple policies from a single file', () => {

        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyOkA')).to.equal(true);
        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyFailA')).to.equal(true);
        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyOkB')).to.equal(true);
        Code.expect(server.plugins.mrhorse.hasPolicy('multiPolicyFailB')).to.equal(true);
    });

    lab.test('routes do not have to have a policy', () => {

        return server.inject('/none')
            .then((res) => {
                Code.expect(res.result).to.equal('none');
            });
    });

    lab.test('passing policies get to route handler', () => {

        return server.inject('/ok')
            .then((res) => {
                Code.expect(res.result).to.equal('ok');
            });
    });

    lab.test('failing policies get a 403', () => {

        return server.inject('/fails')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(403);
                Code.expect(res.result.error).to.equal('Forbidden');
            });
    });

    lab.test('failing policies with a custom message get the message sent in the reply', () => {

        return server.inject('/custommessage')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(403);
                Code.expect(res.result.message).to.equal('custom');
            });
    });

    lab.test('failing policy can give a custom error', () => {

        return server.inject('/customerror')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(404);
            });
    });

    lab.test('policy can run as a posthandler', () => {

        return server.inject('/posthandler')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(200);
                Code.expect(res.result.added).to.equal('this');
            });
    });

    lab.test('runs all policies', () => {

        return server.inject('/twopolicies')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(200);
                Code.expect(res.result.ranSecondPasses).to.equal(true);
            });
    });

    lab.test('policy which redirects', () => {

        return server.inject('/redirects')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(302);
            });
    });

    lab.test('error on misspelled policy', () => {

        return server.inject('/misspelled-policy')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(501);
            });
    });

    lab.test('runs policy as function', () => {

        return server.inject('/policy-as-function-passes')
            .then((res) => {
                Code.expect(res.result).to.equal('ok');
            });
    });

    lab.test('implementation error on policy as function with bad applyPoint', () => {

        let requestError;

        const setRequestError = (request, event) => {

            if (event.tags.length === 3 && event.tags[2] === 'error') {
                requestError = event.error;
            }
        };

        server.events.on('request', setRequestError);

        return new Promise((resolve, reject) => {

            server.inject('/policy-as-function-bad-applypoint')
                .then((res) => {
                    Code.expect(res.statusCode).to.equal(500);

                    setTimeout(() => {
                        server.events.removeListener('request', setRequestError);

                        Code.expect(requestError.message).to.equal('Trying to use incorrect applyPoint for the dynamic policy: onIncorrect');

                        resolve();
                    }, 5);
                });
        });
    });

    lab.test('runs policy as function with explicit applyPoint', () => {

        return server.inject('/policy-as-function-posthandler')
            .then((res) => {
                Code.expect(res.statusCode).to.equal(200);
                Code.expect(res.result.added).to.equal('this');
            });

    });

    lab.test('implementation error on policy not specified as string or function', () => {

        let requestError;

        const setRequestError = (request, event) => {

            if (event.tags.length === 3 && event.tags[2] === 'error') {
                requestError = event.error;
            }
        };

        server.events.on('request', setRequestError);

        return new Promise((resolve, reject) => {

            server.inject('/policy-bad-type')
                .then((res) => {
                    Code.expect(res.statusCode).to.equal(500);

                    setTimeout(() => {
                        server.events.removeListener('request', setRequestError);

                        Code.expect(requestError.message).to.equal('Policy not specified by name or by function.');

                        resolve();
                    }, 5);
                });
        });
    });

    lab.test('parallel aggregate policy runs multiple policies', () => {

        return server.inject('/parallel-ok')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(200);
                Code.expect(res.result.added).to.equal('this');
                Code.expect(res.result.addedAnother).to.equal('that');
            });
    });

    lab.test('parallel aggregate policy fails if one policy fails', () => {

        return server.inject('/parallel-fails')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(403);
                Code.expect(res.result.error).to.equal('Forbidden');
            });
    });

    lab.test('parallel aggregate policy respects custom error responses', () => {

        return server.inject('/parallel-custom-error')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(404);
            });
    });

    lab.test('parallel aggregate policy default error handler fails with error prioritized by listed policy order.', () => {

        return server.inject('/parallel-default-handler')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(403);
                Code.expect(res.result.message).to.equal('custom late');
            });
    });

    lab.test('parallel aggregate policy accepts custom error handler', () => {

        return server.inject('/parallel-custom-handler')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(403);
                Code.expect(res.result.message).to.equal('custom and transformed');
            });
    });

    lab.test('parallel aggregate policy runs multiple policies when specified in array format', () => {

        return server.inject('/parallel-as-array')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(200);
                Code.expect(res.result.added).to.equal('this');
                Code.expect(res.result.addedAnother).to.equal('that');
            });
    });

    lab.test('policy can be added programmatically', () => {

        Code.expect(server.plugins.mrhorse.hasPolicy('yetAnotherPolicy')).to.equal(false);

        server.plugins.mrhorse.addPolicy('yetAnotherPolicy', async (request, h) => h.continue);

        Code.expect(server.plugins.mrhorse.hasPolicy('yetAnotherPolicy')).to.equal(true);
    });

    lab.test('hasPolicy returns false on non-existent policies', () => {
        Code.expect(server.plugins.mrhorse.hasPolicy('thisPolicyAbsolutelyDoesNotExist')).to.equal(false);
    });

    lab.test('orPolicy creates a chain of policies in which only one must succeed (left)', () => {

        return server.inject('/or-first-ok')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(200);
            });
    });

    lab.test('orPolicy creates a chain of policies in which only one must succeed (right)', () => {

        return server.inject('/or-second-ok')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(200);
            });
    });

    lab.test('orPolicy creates a chain of policies in which both may succeed', () => {

        return server.inject('/or-both-ok')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(200);
            });
    });

    lab.test('orPolicy creates a chain of policies in which at least one must succeed', () => {

        return server.inject('/or-both-fail')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(403);
            });
    });

    lab.test('programmatically added policy can be attached to a route', () => {

        const policyName = 'injectedPolicy';
        let policyCalled = false;

        Code.expect(server.plugins.mrhorse.hasPolicy(policyName)).to.equal(false);

        const policy = async (request, h) => {

            policyCalled = true;
            return h.continue;
        };

        server.plugins.mrhorse.addPolicy(policyName, policy);

        server.route({
            method : 'GET',
            path   : '/add-policy-test',
            handler: async () => {

                return {
                    handler: 'handler'
                };
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

        return server.inject('/add-policy-test')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(200);
                Code.expect(policyCalled).to.equal(true);
            });

    });


    lab.test('can manage non-Error/non-Boom exceptions', () => {

        return server.inject('/strange')
            .then((res) => {

                Code.expect(res.statusCode).to.equal(403);
                Code.expect(res.result.message).to.equal('This is a weird thing to throw');
            });
    });

});
