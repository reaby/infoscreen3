import express from 'express';
const router = express.Router();
import config from '../config.js';
import cli from '../modules/cli.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
    points: 500, // Number of points
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

    if (config.accesskey) {
        if (req.query.accesskey && req.query.accesskey == config.accesskey) {
            req.session.accesskey = config.accesskey;
            return next();
        }
        if (req.session.accesskey && req.session.accesskey == config.accesskey) {
            return next();
        }
    }

    if (test) {
        return next();
    } else {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            req.session.location = req.originalUrl;
            return res.redirect("/login");
        }
    }
    return next();
}
const availableDisplays = config.displays;

export default function (pluginManager, websocket, dispatcher) {
    router.use(ensureIsAdmin);
    router.use(rateLimit);

    router.get('/', function (req, res, next) {
        res.render('index', {
            config: config
        });
    });

    router.get('/favicon.ico', function (req, res, next) {
        res.send("public/favicon.ico");
    });

    router.get('/display/:id/lite', function (req, res, next) {
        let idx = parseInt(req.params.id);
        let volume = req.query['videoVolume'] || 1.;
        let extra = pluginManager.getDisplayAdditions();
        return res.render('liteDisplay', {
            config: config,
            display: availableDisplays[idx],
            displayId: idx,
            extra: extra,
            videoVolume: volume
        });
    });

    router.get('/display/:id/css', function (req, res, next) {
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

    router.get('/display/:id', function (req, res, next) {
        let idx = parseInt(req.params.id);
        let preview = parseInt(req.query['isPreview']) || 0;
        let volume = parseFloat(req.query['videoVolume']) || 1.;
        let extra = pluginManager.getDisplayAdditions();
        res.render('displayWebGl', {
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
                res.status(404).end();
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
                res.status(404).end();
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
                res.status(404).end();
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
                res.status(404).end();
            }
        });
    });

    return router;
};
