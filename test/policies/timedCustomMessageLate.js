'use strict';

const timedCustomMessageLate = function () {

    return new Promise((resolve, reject) => {

        setTimeout(() => {

            reject(new Error('custom late'));
        }, 50);

    });
};

module.exports = timedCustomMessageLate;
