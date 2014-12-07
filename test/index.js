var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var policy = require('..');

lab.test('exists', function(done) {
    Code.expect(policy).to.be.an.object();
    done();
});