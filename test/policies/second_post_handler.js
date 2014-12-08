var secondPostHandler = function(request, reply, callback) {
    // this is an unused duplicate, that just makes sure that we exercise a code path.
    callback(null, true);
};

secondPostHandler.pre = false;
secondPostHandler.post = true;

module.exports = secondPostHandler;