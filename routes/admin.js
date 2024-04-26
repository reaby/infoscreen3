import express from 'express';
const router = express.Router();
import cli from '../modules/cli.js';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import busboy from 'connect-busboy'
import fse from 'fs-extra';


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

export default function (pluginManager, websocket, dispatcher) {
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

        req.busboy.on('file', function (fieldname, file, details) {
            if (fieldname === "newBackground")
                if (details.filename && details.filename.length > 0 && (details.mimeType === "image/jpeg" || details.mimeType === "video/mp4" || details.mimeType === "image/png")) {
                    let fstream = fs.createWriteStream('./data/backgrounds/' + details.filename);
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
                    bundleData.styleHeader.fontWeight = parseInt(fields.headerFontWeight) || 400;
                    bundleData.styleHeader.fill = fields.headerFill;
                    bundleData.styleHeader.stroke = fields.headerStroke;
                    bundleData.styleHeader.strokeWidth = parseInt(fields.headerStrokeSize) || 0;
                    bundleData.styleText.fontFamily = fields.textFontFamily;
                    bundleData.styleText.fontSize = parseInt(fields.textFontSize);
                    bundleData.styleText.fontWeight = parseInt(fields.textFontWeight) || 400;
                    bundleData.styleText.fill = fields.textFill;
                    bundleData.styleText.stroke = fields.textStroke;
                    bundleData.styleText.strokeWidth = parseInt(fields.textStrokeSize) || 0;

                    bundle.setBundleData(bundleData);
                    bundle.save();

                } catch (err) {
                    cli.error("error loading bundle", err);
                }
                res.send("<!doctype HTML><html><head><script>window.close();</script></head><body></body></html>");
                dispatcher.emit("updateBundles");
            }
        });
    });

    router.post('/delete/bundle', function (req, res, next) {
        let fields = {};

        req.busboy.on('field', function (fieldname, val) {

            fields[fieldname] = val;
        });

        req.busboy.on('finish', function () {
            if (fields.hasOwnProperty("sDelete")) {
                let dir = `./data/bundles/${fields.bundle}/`;
                if (fs.existsSync(dir)) {
                    let trashDir = `./trash/${fields.bundle}/`;
                    if (fs.existsSync(trashDir)) {
                        let i = 0;
                        while(fs.existsSync(trashDir)) {
                            i++;
                            trashDir = `./trash/${fields.bundle}_${i}`;
                        }
                    }
                    fse.moveSync(dir, trashDir);
                    bundleManager.syncBundles();
                    cli.success(dir, "Bundle removed");
                } else {
                    cli.error(dir, "Folder not found");
                }

                res.send("<!doctype HTML><html><head><script>window.close();</script></head><body></body></html>");
                dispatcher.emit("updateBundles");
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

    router.get('/edit/video', function (req, res, next) {
        let bundle = req.query['bundle'];
        let file = req.query['file'];
        let displayId = req.query['displayId'] || 0;
        res.render('admin/video', {
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
            if (file.match(/(.*\.png)|(.*\.jpg)|(.*\.jpeg)/i)) {
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