module.exports = {
    "serverListenPort": process.env.PORT || 8000,
    "serverHost": process.env.HOST || "localhost",
    "serverUrl": "http://" + (process.env.HOST || "localhost"),
    "admins": [
        {
            "name": process.env.ADMIN_USER || "admin",
            "pass": process.env.ADMIN_PASS || "admin"
        }
    ],
    "mediaServer": false
};
