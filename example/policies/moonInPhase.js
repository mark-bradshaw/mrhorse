'use strict';

const Wreck = require('wreck');
const Boom = require('boom');

const moonInPhase = async (request, h) => {

    const timestamp = parseInt(Date.now() / 1000);
    const url = `http://api.farmsense.net/v1/moonphases/?d=${timestamp}`;
    console.log(`Getting ${url}`);

    const { payload } = await Wreck.get(url, { json: 'force' });
    if (payload[0].Phase !== 'Waning Cresent') {
        throw Boom.forbidden(`${payload[0].Phase} is the wrong moon phase for admin night.`);
    }

    return h.continue;
};

moonInPhase.applyPoint = 'onPreHandler';

module.exports = moonInPhase;
