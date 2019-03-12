let express = require('express');
let authMiddleWare = require('../modules/auth.js');
let router = express.Router();
let fs = require("fs");
let config = require("../config.js");
let displayMeta = require("../data/meta.json");
const cli = require('../modules/cli.js');

module.exports = function (websocket) {

    router.use(authMiddleWare);

    router.get('/', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.render('index', {config: config});
    });

    router.get('/display/:id/lite', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        let idx = parseInt(req.params.id);
        res.render('liteDisplay', {config: config, display: displayMeta.displays[idx], displayId: idx});
    });

    router.get('/display/:id', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        let idx = parseInt(req.params.id);
        res.render('display', {config: config, display: displayMeta.displays[idx], displayId: idx});
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

        res.sendFile("display_"+req.params.displayId+".png", options, function (err) {
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