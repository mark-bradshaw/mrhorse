var secondPasses = function(request, reply, callback) {
    request.response.source.ranSecondPasses = true;
    callback(null, true);
};

secondPasses.applyPoint = 'onPostHandler';

module.exports = secondPasses;