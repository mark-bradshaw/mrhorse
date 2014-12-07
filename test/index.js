var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var mrhorse = require('..');

lab.test('exists', function(done) {
    Code.expect(mrhorse).to.be.an.object();
    done();
});