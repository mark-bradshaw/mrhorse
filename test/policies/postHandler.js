var postHandler = function(request, reply, callback) {

    //console.log("repsonse", require('util').inspect(request.response));
    //process.exit();
    request.response.source.added = 'this';
    callback(null, true);
};

postHandler.applyPoint = 'onPostHandler';

module.exports = postHandler;