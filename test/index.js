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

    lab.test('requires a policy directory', function(done) {
        mrhorse.setup(server, {}, function(err) {
            Code.expect(err.toString()).to.equal('Error: policyDirectory is required for MrHorse.');
            done();
        });
    });

    lab.test('ignores an empty policy directory', function(done) {
        try {
            fs.mkdirSync(__dirname + '/emptypolicies');
        } catch (err) {
            console.log(err);
        }
        mrhorse.setup(server, {
            policyDirectory: __dirname + '/emptypolicies'
        }, function(err) {
            Code.expect(server.app.mrhorse).to.be.an.object();
            Code.expect(server.app.mrhorse.names.length).to.equal(0);
            try {
                fs.rmdirSync(__dirname + '/emptypolicies');
            } catch (err) {
                console.log(err);
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
            path: '/',
            handler: function(request, reply) {
                reply('ok');
            },
            config: {
                plugins: {
                    policies: ['passes']
                }
            }
        });

        mrhorse.setup(server, {
            policyDirectory: __dirname + '/policies'
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
        server.stop(function() {
            done();
        });
    });

    lab.test('loads policies from a directory', function(done) {
        Code.expect(server.app.mrhorse.names.length).to.be.greaterThan(0);
        done();
    });

    lab.test('passing test calls reply.continue', function(done) {
        server.inject('/', function(res) {
            Code.expect(res.result).to.equal('ok');
            done();
        });

    });
});