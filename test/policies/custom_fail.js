var customFail = function(request, reply, callback) {
    callback(null, false, 'custom');
};

module.exports = customFail;