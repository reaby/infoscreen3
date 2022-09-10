export default {
    "serverListenPort": process.env.PORT || 8000,
    "serverHost": process.env.HOST || "127.0.0.1",
    "serverUrl": () => {
        if (process.env.FRONT_PROXY || false) return "https://" + (process.env.HOST || "127.0.0.1");
        else return "http://" + (process.env.HOST || "127.0.0.1") + ":" + (process.env.PORT || 8000);
    },
    "sessionKey": "generateRandomStringForSecret", // used for encrypting cookies
    "streamKey": 'INFOSCREEN3',  // stream key for rtmp end point
    "useLocalAssets": false,    // used to load javascript libraries locally from /public/assets
    "mediaServer": false,       // local streaming server for rtmp, see docs how to use
    "defaultLocale": "en",      // currently supported values are: "en","fi"

    /*
     * Plugins
     */
    "plugins": [
        "profiler", // display memory statistics at console.
    ],

    /*
     * Administrators
     */

    "admins": [
        {
            "id": 1,
            "displayName": "Administrator",
            "username": process.env.ADMIN_USER || "admin",
            "password": process.env.ADMIN_PASS || "admin",
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
            "displayName": "Display Viewer",
            "username": process.env.USER || "view",
            "password": process.env.PASS || "view",
            "permissions": {
                "isAdmin": false,
            }
        }
    ],
    "displays":
        [
            {
                "name": "Main Screen",
                "bundle": "default"
            },
            {
                "name": "Secondary Screen",
                "bundle": "default"
            },
        ]
};
