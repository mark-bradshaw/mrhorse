var Wreck = require('wreck');
var Boom  = require('boom');

var moonInPhase = function (request, reply, next) {
 
    var timestamp = parseInt(Date.now() / 1000);
    
    Wreck.get('http://api.farmsense.net/v1/moonphases/?d=' + timestamp, { json: 'force' }, function (err, res, payload) {

        if (err || !payload || !payload[0] || payload[0].Error) {

            return next(Boom.badImplementation(), false);
        }

        if (payload[0].Phase !== 'Waning Crescent') {
            
            return next(null, false, payload[0].Phase + ' is the wrong moon phase for admin night.');
        }

        next(null, true);
    });

}

moonInPhase.applyPoint = 'onPreHandler';

module.exports = moonInPhase;

