let express = require('express');
let authMiddleWare = require('../modules/auth.js');
let router = express.Router();

let fs = require('fs');
let path = require('path');
let config = require("../config.js");

module.exports = function (displays) {

    router.use(authMiddleWare);

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
        let displayId = req.query['displayId'] || 0;
        res.render('admin/edit', {config: config, bundle: bundle, displayId: displayId, file: file});
    });

    router.get('/bundle', function (req, res, next) {
        let bundles = getDirectories("./data");
        res.render('admin/listBundle', {config: config, bundles: bundles});
    });


    router.get('/edit/bundle', function (req, res, next) {
        let bundle = req.query['bundle'];
        let file = req.query['file'];
        let displayId = req.query['displayId'] || 0;
        res.render('admin/editBundle', {config: config, bundle: bundle, displayId: displayId, file: file});
    });

    router.get('/ajax/imagelist', function (req, res, next) {
        let bundle = req.query['bundle'];
        let bundleRoot = path.normalize("./data/" + bundle);
        let bundleImages = fs.readdirSync(bundleRoot + "/images", {
            dotfiles: false
        });

        let output = [];
        for (let file of bundleImages) {
            output.push({url: "/images/" + bundle + "/" + file, name: file});
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
