var postHandler = function(request, reply, callback) {

    request.response.source.added = 'this';
    callback(null, true);
};

postHandler.pre = false;
postHandler.post = true;

module.exports = postHandler;