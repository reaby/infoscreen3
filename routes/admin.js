let express = require('express');
let router = express.Router();
let cli = require("../modules/cli.js");
let fs = require('fs');
let path = require('path');
let config = require("../config.js");
let busboy = require("connect-busboy");

function getFiles(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path + '/' + file).isFile();
    });
}

function ensureIsAdmin(req, res, next) {

    if (!req.isAuthenticated || !req.isAuthenticated()) {
        req.session.location = req.originalUrl;
        return res.redirect("/login");
    } else {
        if (!req.user.permissions.isAdmin) {
            cli.error(req.user.displayName + " has tried to access admin!", "permission error");
            return res.redirect("/login");
        }
    }
    next();
}

module.exports = function (pluginManager, websocket, dispatcher) {
    var bundleManager = websocket.bundleManager;

    router.use(ensureIsAdmin);
    router.use(busboy({
        immediate: true
    }));

    router.get('/', function (req, res, next) {
        res.render('admin/overview', {
            config: config
        });
    });

    router.get('/preview', function (req, res, next) {
        let socketId = req.query['socket'];
        let displayId = parseInt(req.query['displayId']) || 0;
        res.render('preview', {
            config: config,
            socketId: socketId,
            displayId: displayId
        });
    });

    router.get('/display/:id', function (req, res, next) {
        let displayId = parseInt(req.params.id) || 0;
        res.render('admin/dashboard', {
            config: config,
            displayId: displayId,
            permission: req.user.permissions
        });
    });

    router.get('/edit/slide', function (req, res, next) {
        let bundle = req.query['bundle'];
        let file = req.query['file'];
        let displayId = req.query['displayId'];

        res.render('admin/editSlide', {
            config: config,
            bundle: bundle,
            displayId: displayId || 0,
            file: file
        });
    });

    router.get('/edit/bundles', function (req, res, next) {
        let bundleInfos = bundleManager.getBundleInfos();
        res.render('admin/editBundles', {
            config: config,
            bundles: bundleInfos
        });
    });

    router.post('/edit/bundleProperties', function (req, res, next) {
        let bundleData = {};
        let fields = {};

        req.busboy.on('field', function (fieldname, val) {
            fields[fieldname] = val;
        });

        req.busboy.on('file', function (fieldname, file, filename, encoding, mimeType) {
            if (fieldname === "newBackground")
                if (filename.length > 0 && (mimeType === "image/jpeg" || mimeType === "video/mp4" || mimeType === "image/png")) {
                    console.log(filename)
                    let fstream = fs.createWriteStream('./data/backgrounds/' + filename);
                    file.pipe(fstream);
                } else {
                    file.resume();
                }
        });

        req.busboy.on('finish', function () {

            if (fields.hasOwnProperty("sUpload")) {
                res.redirect("/admin/edit/bundleProperties?bundle=" + fields.bundle);
            } else {
                var transition = null;
                if (fields.transition !== "") {
                    transition = fields.transition;
                }

                var useWebFonts = false;
                if (fields.hasOwnProperty('useWebFonts')) {
                    useWebFonts = true;
                }

                var displayTime = false;
                if (fields.hasOwnProperty('displayTime')) {
                    displayTime = true;
                }

                try {
                    let bundle = bundleManager.getBundle(fields.bundle);
                    bundleData = bundle.getBundleData();
                    bundleData.displayName = fields.displayName;
                    bundleData.background = fields.background;
                    bundleData.duration = parseInt(fields.duration);
                    bundleData.transition = transition;
                    bundleData.useWebFonts = useWebFonts;
                    bundleData.displayTime = displayTime;
                    bundleData.styleHeader.fontFamily = fields.headerFontFamily;
                    bundleData.styleHeader.fontSize = parseInt(fields.headerFontSize);
                    bundleData.styleHeader.fill = fields.headerFill;
                    bundleData.styleHeader.stroke = fields.headerStroke;
                    bundleData.styleText.fontFamily = fields.textFontFamily;
                    bundleData.styleText.fontSize = parseInt(fields.textFontSize);
                    bundleData.styleText.fill = fields.textFill;
                    bundleData.styleText.stroke = fields.textStroke;
                    bundle.setBundleData(bundleData);
                    bundle.save();

                } catch (err) {
                    cli.error("error loading bundle", err);
                }

                dispatcher.emit("updateBundles");
                res.send("<!doctype HTML><html><head><script>window.close();</script></head><body></body></html>");
            }
        });
    });

    router.get('/edit/bundleProperties', function (req, res, next) {
        let bundle = req.query['bundle'];
        let bundleData = {};
        try {
            bundleData = bundleManager.getBundle(bundle).getBundleData();
        } catch (err) {
            cli.error("error loading bundle", err);
        }

        let bundleRoot = path.normalize("./data/bundles/" + bundle);
        let backgroundImages = getFiles("./data/backgrounds/");

        res.render('admin/editBundleProperties', {
            config: config,
            bundle: bundle,
            bundleData: bundleData,
            backgroundImages: backgroundImages
        });
    });

    router.get('/edit/link', function (req, res, next) {
        let bundle = req.query['bundle'];
        let file = req.query['file'];
        let displayId = req.query['displayId'] || 0;
        res.render('admin/link', {
            config: config,
            bundle: bundle,
            displayId: displayId,
            file: file
        });
    });


    router.get('/edit/bundleSlides', function (req, res, next) {
        var bundle = {};
        try {
            bundle = bundleManager.getBundle(req.query['bundle']);
        } catch (err) {
            cli.error(err, "can't find bundle");
        }
        res.render('admin/editBundleSlides', {
            config: config,
            bundle: bundle
        });
    });

    router.get('/ajax/getBundles', function (req, res, next) {
        res.json(bundleManager.getBundleInfos());
    });

    router.get('/ajax/getSlides', function (req, res, next) {
        var bundle = {};
        try {
            bundle = bundleManager.getBundle(req.query['bundle']);
        } catch (err) {
            cli.error(err, "can't find bundle");
        }
        res.json(bundle);
    });

    router.get('/ajax/imagelist', function (req, res, next) {
        let bundle = req.query['bundle'];
        let bundleRoot = path.normalize("./data/bundles/" + bundle);
        let bundleImages = fs.readdirSync(bundleRoot + "/images", {
            dotfiles: false
        });

        let output = [];
        for (let file of bundleImages) {
            if (file.match(/(.*\.png)|(.*\.jpg)/i)) {
                output.push({
                    url: "/images/" + bundle + "/" + file,
                    name: file
                });
            }
        }

        res.render('ajax/bundleImageList', {
            bundleImages: output
        });
    });

    pluginManager.callMethod('onAdminRouter', router);

    return router;
};