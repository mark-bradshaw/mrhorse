var incorrectApplyPoint = function(request, reply, callback) {

    callback(null, false, 'custom');
};

incorrectApplyPoint.applyPoint = 'onIncorrect'; // invalid hapi event name

module.exports = incorrectApplyPoint;
