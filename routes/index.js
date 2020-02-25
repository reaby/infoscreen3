let express = require('express');
let router = express.Router();
let fs = require("fs");
let config = require("../config.js");
let availableDisplays = config.displays;
const cli = require('../modules/cli.js');
const {RateLimiterMemory} = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
    points: 100, // Number of points
    duration: 1, // Per second
    blockDuration: 60 // one minute
});

const rateLimit = (req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(_ => {
            console.log(`Blocked ${req.ip}, due too many requests`);
            res.status(429).send('Too Many Requests');
        });
};

function ensureIsAdmin(req, res, next) {
    let test = req.url.match(/^\/(login|logout|empty)\//);
    if (test) {
        next();
    } else {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            req.session.location = req.originalUrl;
            return res.redirect("/login");
        }
    }
    next();
}

module.exports = function (pluginManager, websocket, dispatcher) {
    router.use(ensureIsAdmin);
    router.use(rateLimit);

    router.get('/', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.render('index', {
            config: config
        });
    });

    router.get('/favicon.ico', function (req, res, next) {
        res.send("public/favicon.ico");
    });

    router.get('/display/:id/lite', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        let idx = parseInt(req.params.id);
        let volume = req.query['videoVolume'] || 1.;
        let extra = pluginManager.getDisplayAdditions();
        res.render('liteDisplay', {
            config: config,
            display: availableDisplays[idx],
            displayId: idx,
            extra: extra,
            videoVolume: volume
        });
    });

    router.get('/display/:id', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        let idx = parseInt(req.params.id);
        let preview = parseInt(req.query['isPreview']) || 0;
        let volume = parseFloat(req.query['videoVolume']) || 1.;
        let extra = pluginManager.getDisplayAdditions();
        res.render('display', {
            config: config,
            display: availableDisplays[idx],
            displayId: idx,
            videoVolume: volume,
            extra: extra,
            isPreview: preview
        });
    });

    router.get('/images/:dir/:name', function (req, res, next) {
        let options = {
            root: './data/bundles/' + req.params.dir + '/images/',
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true
            }
        };

        res.sendFile(req.params.name, options, function (err) {
            if (err) {
                cli.error(err);
                res.end();
            }
        });
    });

    router.get('/render/:dir/:name', function (req, res, next) {
        let options = {
            root: './data/bundles/' + req.params.dir + '/render/',
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true
            }
        };

        res.sendFile(req.params.name, options, function (err) {
            if (err) {
                cli.error(err);
                res.end();
            }
        });
    });

    router.get('/tmp/:displayId', function (req, res, next) {
        let options = {
            root: './tmp',
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true
            }
        };

        res.sendFile("display_" + req.params.displayId + ".png", options, function (err) {
            if (err) {
                cli.error(err);
                res.end();
            }
        });
    });

    router.get('/background/:name', function (req, res, next) {
        let options = {
            root: './data/backgrounds/',
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true
            }
        };

        res.sendFile(req.params.name, options, function (err) {
            if (err) {
                cli.error(err);
                res.end();
            }
        });
    });


    return router;
};