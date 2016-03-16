'use strict';

const timedCustomMessageEarly = function (request, reply, callback) {

    setTimeout(() => {

        callback(null, false, 'custom early');
    }, 1);
};

module.exports = timedCustomMessageEarly;
