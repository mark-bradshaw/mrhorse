'use strict';

module.exports = {

    multiPolicyOkA : (request, h) => {

        return h.continue;
    },

    multiPolicyFailA : () => {

        throw new Error();
    },

    multiPolicyOkB : (request, h) => {

        return h.continue;
    },

    multiPolicyFailB : () => {

        throw new Error();
    }

};
