var Code = require('code');
var fs = require('fs');
var Hapi = require('hapi');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var mrhorse = require('..');

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
    called: 0,
    continue: function() {
        reply.called++;
    }
};

var server = null;

lab.experiment('Non standard setups', function(done) {

    lab.beforeEach(function(done) {

        server = new Hapi.Server();
        done();
    });

    lab.test('can register without a policy directory', function(done) {

        server.register({
                register: require('..'),
                options: {}
            },
            function(err) {

                Code.expect(server.plugins.mrhorse).to.be.an.object();
                Code.expect(server.plugins.mrhorse.data.names.length).to.equal(0);
                done();
            });
    });

    lab.test('ignores an empty policy directory', function(done) {

        try {
            fs.mkdirSync(__dirname + '/emptypolicies');
        } catch (err) {
            console.log(err);
        }

        server.register({
                register: require('..'),
                options: {
                    policyDirectory: __dirname + '/emptypolicies'
                }
            },
            function(err) {

                Code.expect(server.plugins.mrhorse).to.be.an.object();
                Code.expect(server.plugins.mrhorse.data.names.length).to.equal(0);
                try {
                    fs.rmdirSync(__dirname + '/emptypolicies');
                } catch (err2) {
                    console.log(err2);
                }

                done();
            });
    });
});

lab.experiment('Normal setup', function(done) {

    lab.beforeEach(function(done) {

        server = new Hapi.Server();
        server.connection({
            port: 1234
        });

        server.route({
            method: 'GET',
            path: '/none',
            handler: function(request, reply) {

                reply('none');
            }
        });

        server.route({
            method: 'GET',
            path: '/ok',
            handler: function(request, reply) {

                reply('ok');
            },
            config: {
                plugins: {
                    policies: ['passes']
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/fails',
            handler: function(request, reply) {

                reply('ok');
            },
            config: {
                plugins: {
                    policies: ['fails']
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/custommessage',
            handler: function(request, reply) {

                reply('ok');
            },
            config: {
                plugins: {
                    policies: ['customMessage']
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/customerror',
            handler: function(request, reply) {

                reply('ok');
            },
            config: {
                plugins: {
                    policies: ['customError']
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/posthandler',
            handler: function(request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config: {
                plugins: {
                    policies: ['postHandler']
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/twopolicies',
            handler: function(request, reply) {

                reply({
                    handler: 'handler'
                });
            },
            config: {
                plugins: {
                    policies: ['passes', 'secondPasses']
                }
            }
        });

        server.register({
            register: require('..'),
            options: {
                policyDirectory: __dirname + '/policies'
            }
        }, function(err) {

            if (err) {
                console.log(err);
            }
            server.start(function() {

                done();
            });
        });
    });

    lab.afterEach(function(done) {

        server.plugins.mrhorse.reset();
        server.stop(function() {

            done();
        });
    });

    lab.test('loads policies from a directory', function(done) {

        Code.expect(server.plugins.mrhorse.data.names.length).to.be.greaterThan(0);
        done();
    });

    lab.test('does not allow duplication of policies', function(done) {

        server.plugins.mrhorse.loadPolicies(server, __dirname + '/policies', function(err) {

            Code.expect(err.toString()).to.equal('Error: Trying to add a duplicate policy: customError');
            done();
        });

    });

    lab.test('routes do not have to have a policy', function(done) {

        server.inject('/none', function(res) {

            Code.expect(res.result).to.equal('none');
            done();
        });
    });

    lab.test('passing policies get to route handler', function(done) {

        server.inject('/ok', function(res) {

            Code.expect(res.result).to.equal('ok');
            done();
        });
    });

    lab.test('failing policies get a 403', function(done) {

        server.inject('/fails', function(res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.error).to.equal('Forbidden');
            done();
        });
    });

    lab.test('failing policies with a custom message get the message sent in the reply', function(done) {

        server.inject('/custommessage', function(res) {

            Code.expect(res.statusCode).to.equal(403);
            Code.expect(res.result.message).to.equal('custom');
            done();
        });
    });

    lab.test('failing policy can give a custom error', function(done) {

        server.inject('/customerror', function(res) {

            Code.expect(res.statusCode).to.equal(404);
            done();
        });
    });

    lab.test('policy can run as a posthandler', function(done) {

        server.inject('/posthandler', function(res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.added).to.equal('this');
            done();
        });
    });

    lab.test('runs all policies', function(done) {

        server.inject('/twopolicies', function(res) {

            Code.expect(res.statusCode).to.equal(200);
            Code.expect(res.result.ranSecondPasses).to.equal(true);
            done();
        });
    });
});