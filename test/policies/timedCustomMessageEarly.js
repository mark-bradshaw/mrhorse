'use strict';

const timedCustomMessageEarly = function () {

    return new Promise((resolve, reject) => {

        setTimeout(() => {

            reject(new Error('custom early'));
        }, 1);

    });
};

module.exports = timedCustomMessageEarly;
