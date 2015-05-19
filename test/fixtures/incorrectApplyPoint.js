var incorrectApplyPoint = function(request, reply, callback) {

    callback(null, false, 'custom');
};

incorrectApplyPoint.applyPoint='onIncorrect';

module.exports = incorrectApplyPoint;