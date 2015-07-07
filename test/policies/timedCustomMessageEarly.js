var timedCustomMessageEarly = function (request, reply, callback) {

    setTimeout(function () {

        callback(null, false, 'custom early');
    }, 1);
};

module.exports = timedCustomMessageEarly;
