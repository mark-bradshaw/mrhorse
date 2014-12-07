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

lab.beforeEach(function(done) {
    server = new Hapi.Server();
    done();
});

lab.test('exists', function(done) {
    Code.expect(mrhorse).to.be.an.object();
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
        Code.expect(server.app.policies).to.be.an.object();
        Code.expect(server.app.policies.names.length).to.equal(0);
        try {
            fs.rmdirSync(__dirname + '/emptypolicies');
        } catch (err) {
            console.log(err);
        }

        done();
    });
});

lab.test('loads policies from a directory', function(done) {
    mrhorse.setup(server, {
        policyDirectory: __dirname + '/policies'
    }, function(err) {
        Code.expect(err).to.be.undefined();
        Code.expect(server.app.policies.names.length).to.be.greaterThan(0);
        done();
    });
});