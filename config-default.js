module.exports = {
    "serverListenPort": process.env.PORT || 8000,
    "serverHost": process.env.HOST || "127.0.0.1",
    "serverUrl": "http://" + (process.env.HOST || "127.0.0.1"),  // used for web client
    "sessionKey": "generateRandomStringForSecret",
    "secureViews": false,        // set true to use password also for viewing info screen content
    "useLocalAssets": false,    // used to load javascript libraries locally from /public/assets
    "mediaServer": false,       // local streaming server for rtmp, see docs how to use
    "defaultLocale": "en",

    /*
     * Administrators
     */

    "admins": [
        {
            "id": 1,
            "displayName": "Administrator",
            "username": "admin",
            "password": "admin",
            "permissions": {
                "isAdmin": true,
                "dashboard": {
                    "addBundle": true,
                    "addSlides": true,
                    "addWebPage": true,
                }
            }
        },
        {
            "id": 2,
            "displayName": "Display Operator",
            "username": "operator",
            "password": "operator",
            "permissions": {
                "isAdmin": true,
                "dashboard": {
                    "addBundle": false,
                    "addSlides": true,
                    "addWebPage": false,
                }
            }
        },
        {
            "id": 3,
            "displayName": "Display Viewer",
            "username": "view",
            "password": "view",
            "permissions": {
                "isAdmin": false,
            }
        }
    ],
    /*
     * Displays
     * If needed, define more screens
     */

    "displays": [
        {
            "name": "Big Screen",
            "bundle": "default"
        },
        {
            "name": "Secondary Screen",
            "bundle": "set1"
        },
        {
            "name": "Kiosk",
            "bundle": "default"
        }
    ]
};
