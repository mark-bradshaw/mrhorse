var Code = require('code');
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

var server = {
    app: {}
};

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

lab.test('loads policies from a directory', function(done) {
    mrhorse.setup(server, {
        policyDirectory: __dirname + '/policies'
    }, function(err) {
        Code.expect(err).to.be.undefined();
        Code.expect(server.app.policies).to.exist();
        done();
    });

});