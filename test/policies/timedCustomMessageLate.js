var timedCustomMessageLate = function (request, reply, callback) {

    setTimeout(function () {

        callback(null, false, 'custom late');
    }, 50);
};

module.exports = timedCustomMessageLate;
