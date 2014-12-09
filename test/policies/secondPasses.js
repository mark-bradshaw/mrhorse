var secondPasses = function(request, reply, callback) {

    request.response.source.ranSecondPasses = true;
    callback(null, true);
};

secondPasses.pre = false;
secondPasses.post = true;

module.exports = secondPasses;