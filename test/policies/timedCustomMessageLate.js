'use strict';

const timedCustomMessageLate = function (request, reply, callback) {

    setTimeout(() => {

        callback(null, false, 'custom late');
    }, 50);
};

module.exports = timedCustomMessageLate;
