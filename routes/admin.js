let express = require('express');
let authMiddleWare = require('../modules/auth.js');
let router = express.Router();
let cli = require("../modules/cli.js");
let fs = require('fs');
let path = require('path');
let config = require("../config.js");
let busboy = require("connect-busboy");

module.exports = function (websocket, dispatcher) {
    var bundleManager = websocket.bundleManager;

    router.use(authMiddleWare);
    router.use(busboy({immediate: true}));

    router.get('/', function (req, res, next) {
        res.render('admin/dashboard', {config: config});
    });

    router.get('/preview', function (req, res, next) {
        let socketId = req.query['socket'];
        let displayId = req.query['displayId'] || 0;
        res.render('preview', {config: config, socketId: socketId, displayId: displayId});
    });


    router.get('/edit/slide', function (req, res, next) {
        let bundle = req.query['bundle'];
        let file = req.query['file'];
        let displayId = req.query['displayId'];

        res.render('admin/editSlide', {config: config, bundle: bundle, displayId: displayId, file: file});
    });

    router.post('/edit/bundleProperties', function (req, res, next) {
        let bundleData = {};

        var transition = null;
        if (req.body.transition !== "") {
            transition = req.body.transition;
        }

        var useWebFonts = false;
        if (req.body.useWebFonts) {
            useWebFonts = true;
        }

        var displayTime = false;
        if (req.body.displayTime) {
            displayTime = true;
        }

        try {
            let bundle = bundleManager.getBundle(req.body.bundle);
            bundleData = bundle.getBundleData();
            bundleData.displayName = req.body.displayName;
            bundleData.background = req.body.background;
            bundleData.duration = parseInt(req.body.duration);
            bundleData.transition = transition;
            bundleData.useWebFonts = useWebFonts;
            bundleData.displayTime = displayTime;
            bundleData.styleHeader.fontFamily = req.body.headerFontFamily;
            bundleData.styleHeader.fontSize = parseInt(req.body.headerFontSize);
            bundleData.styleHeader.fill = req.body.headerFill;
            bundleData.styleHeader.stroke = req.body.headerStroke;
            bundleData.styleText.fontFamily = req.body.textFontFamily;
            bundleData.styleText.fontSize = parseInt(req.body.textFontSize);
            bundleData.styleText.fill = req.body.textFill;
            bundleData.styleText.stroke = req.body.textStroke;
            bundle.setBundleData(bundleData);
            bundle.save();

        } catch (err) {
            cli.error("error loading bundle", err);

        }

        dispatcher.emit("updateBundles");
        res.send("<!doctype HTML><html><head><script>window.close();</script></head><body></body></html>");
    });

    router.get('/edit/bundleProperties', function (req, res, next) {
        let bundle = req.query['bundle'];
        let bundleData = {};
        try {
            bundleData = bundleManager.getBundle(bundle).getBundleData();
        } catch (err) {
            cli.error("error loading bundle", err);
        }

        res.render('admin/editBundleProperties', {config: config, bundle: bundle, bundleData: bundleData});
    });

    router.get('/edit/link', function (req, res, next) {
        let bundle = req.query['bundle'];
        let file = req.query['file'];
        let displayId = req.query['displayId'] || 0;
        res.render('admin/link', {config: config, bundle: bundle, displayId: displayId, file: file});
    });


    router.get('/edit/bundleSlides', function (req, res, next) {
        // let bundles = getDirectories("./data");
        var bundle = {};
        try {
            bundle = bundleManager.getBundle(req.query['bundle']);
        } catch (err) {

        }
        console.log(bundle);
        res.render('admin/editBundleSlides', {config: config, bundle: bundle});
    });


    router.get('/ajax/imagelist', function (req, res, next) {
        let bundle = req.query['bundle'];
        let bundleRoot = path.normalize("./data/" + bundle);
        let bundleImages = fs.readdirSync(bundleRoot + "/images", {
            dotfiles: false
        });

        let output = [];
        for (let file of bundleImages) {
            if (file.match(/(.*\.png)|(.*\.jpg)/i)) {
                output.push({url: "/images/" + bundle + "/" + file, name: file});
            }
        }

        res.render('ajax/bundleImageList', {bundleImages: output});
    });

    function getDirectories(path) {
        return fs.readdirSync(path).filter(function (file) {
            return fs.statSync(path + '/' + file).isDirectory();
        });
    }

    return router;
};
