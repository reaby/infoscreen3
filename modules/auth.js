
let basicAuth = require("basic-auth");
let config = require("../config.js");

module.exports = function (req, res, next) {
    function unauthorized(res) {
        res.set("WWW-Authenticate", "Basic realm=Authorization Required");
        return res.sendStatus(401);
    }

    let user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    for (let i in config.admins) {
        let admin = config.admins[i];
        if (user.name === admin.name && user.pass === admin.pass) {
            return next('route');
        }
    }

    return unauthorized(res);
};



