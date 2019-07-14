let express = require('express');
let router = express.Router();
let fs = require("fs");
let config = require("../config.js");
let availableDisplays = config.displays;
const cli = require('../modules/cli.js');

function ensureIsAdmin(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.log(req.originalUrl);
        req.session.location = req.originalUrl;
        return res.redirect("/login");
    }
    return next();
}

module.exports = function (websocket, dispatcher) {
    if (config.secureViews) {
        router.use(ensureIsAdmin);
    }

    router.get('/', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.render('index', {config: config});
    });

    router.get('/display/:id/lite', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        let idx = parseInt(req.params.id);
        let volume = req.params.videoVolume || 1.;
        res.render('liteDisplay', {config: config, display: availableDisplays[idx], displayId: idx, videoVolume: volume});
    });

    router.get('/display/:id', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        let idx = parseInt(req.params.id);
        let volume = req.params.videoVolume || 1.;
        res.render('display', {config: config, display: availableDisplays[idx], displayId: idx, videoVolume: volume});
    });

    router.get('/images/:dir/:name', function (req, res, next) {
        let options = {
            root: './data/' + req.params.dir + '/images/',
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
            root: './data/' + req.params.dir + '/render/',
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

    router.get('/background/:dir/:name', function (req, res, next) {
        let options = {
            root: './data/' + req.params.dir + '/backgrounds/',
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