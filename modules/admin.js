import fs from 'fs';
import config from '../config.js';
import cli from './cli.js';
import { checkAndSanitizeFilePathName, uuidv4 } from './utils.js';

/**
 *
 */
export default class admin {

    /**
     * @param sharedIO
     * @param dispatcher
     * @param screenView
     * @param displayId
     * @param bundleManager
     */
    constructor(sharedIO, dispatcher, screenView, displayId, bundleManager) {
        /**
         * @typedef {string[]} previewInstance
         * @property {string} adminId is string from admin socket.Id
         * @property {object} preview, pure previews socket
         *
         * @type {object}
         */
        let io = sharedIO.of("/admin-" + displayId);
        this.io = io;
        this.displayId = displayId;
        this.dispatcher = dispatcher;
        this.screenView = screenView;
        this.bundleManager = bundleManager;
        this.previewInstances = [];

        let self = this;
        // helper callback for global announce
        dispatcher.on("announce", function (obj) {
            if (obj.screens == null) {
                io.emit(obj.event, obj.data);
            } else {
                for (let screen of obj.screens) {
                    if (screen === "admin") {
                        io.emit(obj.event, obj.data);
                    }
                }
            }
        });

        dispatcher.on("updateBundles", function () {
            io.emit("callback.dashboard.updateBundles", {
                "bundleDirs": bundleManager.getBundleInfos()
            });
            self.syncDashboard(io);
        });

        io.on("connection", function (socket) {
            cli.success("WS " + socket.conn.remoteAddress + " connect with id:" + socket.id);


            socket.on('error', function (error) {
                cli.error(error, "WS error on socket id:" + socket.id);
                for (let i in self.previewInstances) {
                    if (self.previewInstances[i].adminId === socket.id || self.previewInstances[i].preview === socket) {
                        self.previewInstances.splice(i, 1);
                        break;
                    }
                }
            });

            socket.on('disconnect', function (reason) {
                for (let i in self.previewInstances) {
                    if (self.previewInstances[i].adminId === socket.id || self.previewInstances[i].preview === socket) {
                        self.previewInstances.splice(i, 1);
                        break;
                    }
                }
                cli.success("WS " + reason + " " + socket.conn.remoteAddress + " socket id:" + socket.id);
            });

            socket.on('sync.preview', function (socketId) {
                for (let i in self.previewInstances) {
                    if (self.previewInstances[i].adminId === decodeURIComponent(socketId)) {
                        self.previewInstances[i].preview = socket;
                    }
                }
            });

            socket.on('admin.reload', function (data) {
                self.announce([data.displayId], "callback.reload", {});
            });

            // toggle time
            socket.on('controls.time.toggle', function () {
                let view = self.getView();
                let bool = !view.serverOptions.displayTime;
                let bundle = view.getBundle();
                if (bundle) {
                    bundle.bundleData.displayTime = bool;
                }
                view.serverOptions.displayTime = bool;

                view.io.emit("callback.time", bool);
                self.updateDashboard(io);
            });

            socket.on('controls.previous', function () {
                self.controls('previous');
            });

            socket.on('controls.play', function () {
                self.controls('play');
            });
            socket.on('controls.pause', function () {
                self.controls('pause');
            });

            socket.on('controls.next', function () {
                self.controls('next');
            });


            socket.on('controls.startStream', function () {
                let view = self.getView();
                let serverOptions = self.getServerOptions();

                if (serverOptions.isStreaming === false) {
                    serverOptions.loop = false;
                    // changed next line from http:// to ws://, to reduce stream lag                    

                    serverOptions.streamSource = "http://" + config.serverHost + ":" + (parseInt(config.serverListenPort) + 1) + "/live/" + config.streamKey + ".flv";
                    serverOptions.isStreaming = true;
                    cli.success("start stream");
                } else {
                    serverOptions.loop = true;
                    serverOptions.isStreaming = false;
                    serverOptions.streamSource = "";
                    cli.success("stop stream");
                }
                view.io.emit("callback.load", view.getSlideData());
                self.updateDashboard(io);

                view = null;
                serverOptions = null;
            });

            socket.on('controls.blackout', function () {
                self.screenView.toggleBlackout();
                self.updateDashboard(io);
            });

            socket.on("controls.preview", function (data) {
                let bundle = self.bundleManager.getBundle(data.bundle);
                let json = "{}";
                if (data.fileName) {
                    json = bundle?.getSlideJsonFile(data.fileName);
                }

                try {
                    self.getPreview(socket).preview.emit("callback.preview",
                        {
                            bundleData: bundle?.getBundleData(),
                            json: json,
                            slide: bundle?.findSlideByUuid(data.fileName),
                            displayId: data.displayId
                        }
                    );
                } catch (err) {
                    cli.error("preview instance not found");
                }
                bundle = null;
            });

            socket.on("controls.skipTo", function (data) {
                let bundleSettings = self.screenView.getBundle();
                if (bundleSettings) {
                    let slides = bundleSettings.enabledSlides;

                    let idx = slides.indexOf(data.fileName);
                    if (idx >= 0) {
                        self.getServerOptions().loopIndex = idx;
                    }
                    self.screenView.mainLoop();
                }
            });

            socket.on('controls.toggle', function (data) {
                let fileName = data.fileName;
                let bundleSettings = self.screenView.getBundle();
                if (bundleSettings) {
                    let idx = bundleSettings.disabledSlides.indexOf(fileName);

                    if (idx > -1) {
                        bundleSettings.setSlideStatus(fileName, true);
                    } else {
                        bundleSettings.setSlideStatus(fileName, false);
                    }
                }
                self.updateDashboard(socket);
                bundleSettings = null;
            });

            // announce
            socket.on('admin.override', function (data) {
                try {
                    if (data.displayId === null) {
                        if (data.duration == null || data.duration <= 5) {
                            data.duration = 45;
                        }
                        dispatcher.emit("all.override", data);
                    } else {
                        self.screenView.overrideSlide(data.json, data.png, data.duration, data.transition);
                    }
                } catch (err) {
                    cli.error("error, admin.override", err);
                }
            });
            // announce web
            socket.on('admin.overrideWebPage', function (data) {
                if (data.displayId === null) {
                    if (data.duration == null || data.duration <= 5) {
                        data.duration = 45;
                    }
                    dispatcher.emit("all.override", data);
                } else {
                    self.screenView.overrideSlide(data.json, null, data.duration, data.transition);
                }
            });

            socket.on('admin.overrideVideo', function (data) {
                if (data.displayId === null) {
                    dispatcher.emit("all.override", data);
                } else {
                    self.screenView.overrideSlide(data.json, null, data.json.duration, null);
                }
            });



            socket.on('admin.setBundle', function (data) {
                self.screenView.changeBundle(data.bundle);
                self.updateDashboard(io);
            });

            socket.on('admin.dashboard.sync', function () {
                self.syncDashboard(socket);
                self.updateDashboard(socket);
            });

            socket.on('admin.listSlides', function () {
                self.updateDashboard(socket);
            });

            socket.on('admin.listBundles', function () {
                self.updateDashboard(socket);
            });


            socket.on('admin.reorderSlides', function (data) {
                bundleManager.reorderSlides(data.bundleName, data.sortedIDs);
                dispatcher.emit("display.recalcBundleData", data.bundleName);
                self.updateSlides();
            });

            /** remove slide **/
            socket.on('admin.removeSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    bundle?.removeUuid(data.uuid);
                    self.updateSlides();
                    self.announce(null, "callback.removeSlide", data);
                } catch (err) {
                    cli.error("error while removing slide", err);
                }
            });


            socket.on("admin.createBundle", function (data) {
                try {
                    data.dir = checkAndSanitizeFilePathName(data.dir)
                    if (!fs.existsSync("data/bundles/" + data.dir)) {
                        fs.mkdirSync("data/bundles/" + data.dir);
                        fs.mkdirSync("data/bundles/" + data.dir + "/images");
                        fs.mkdirSync("data/bundles/" + data.dir + "/render");
                        fs.mkdirSync("data/bundles/" + data.dir + "/slides");

                        let tempData = JSON.parse(fs.readFileSync("templates/bundle/bundle.json").toString());
                        tempData.displayName = data.bundle;
                        fs.writeFileSync("data/bundles/" + data.dir + "/bundle.json", JSON.stringify(tempData));

                        fs.copyFileSync("templates/bundle/slides.json", "data/bundles/" + data.dir + "/slides.json");
                        bundleManager.getBundle(data.dir);
                        self.syncDashboard(io);
                    } else {
                        socket.emit("callback.error", "Error: bundle already exists.");
                        self.syncDashboard(io);
                    }
                } catch (err) {
                    cli.error(err, "Error while creating new bundle");
                    socket.emit("callback.error", "Error: " + err);
                }
            });

            socket.on("admin.setStatusMessage", function (message) {
                self.getView().serverOptions.statusMessage = message;
                self.getView().updateUI();
            });


            /** edit web links **/
            socket.on('admin.editLink', function (data) {
                let bundle = self?.bundleManager?.getBundle(data.bundleName);
                if (bundle) {
                    let bundleData = bundle.getBundleData();
                    let json = "{}";
                    if (data.fileName) {
                        json = bundle.findSlideByUuid(data.fileName);
                    }
                    socket.emit("callback.webpage", {bundleData: bundleData, json: json});
                }
            });


            socket.on('edit.saveLink', function (data) {

                let filename = data.filename;
                if (filename === "") {
                    filename = uuidv4();
                }

                if (data.duration === "") {
                    data.duration = null;
                }

                try {
                    let bundle = self.bundleManager.getBundle(data.bundleName);
                    if (!bundle) {
                        throw "no active bundle";
                    }
                    let template = {
                        uuid: filename,
                        name: data.name,
                        duration: data.duration || null,
                        enabled: true,
                        displayTime: data.displayTime,
                        type: "webpage",
                        webUrl: data.webUrl,
                        zoom: parseFloat(data.zoom) || 1.0,
                        index: bundle.allSlides.length,
                        transition: null,
                        epochStart: -1,
                        epochEnd: -1
                    };

                    let obj = bundle.findSlideByUuid(filename);
                    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
                        bundle.allSlides.push(template);
                    } else {
                        obj.webUrl = data.webUrl;
                        obj.name = data.name;
                        obj.duration = data.duration || null;
                        obj.displayTime = data.displayTime;
                        obj.zoom = parseFloat(data.zoom) || 1.0;
                        obj.transition = null;
                        obj.epochStart = -1;
                        obj.epochEnd = -1;
                    }

                    bundle.save();

                    cli.success("save web link");
                    socket.emit("callback.saveLink", {});
                    self.updateSlides();

                } catch (err) {
                    cli.error(err, "save web link");
                    socket.emit("callback.saveLink", {error: err});
                }
            });

            /** video **/

            socket.on('admin.editVideo', function (data) {
                let bundle = self.bundleManager.getBundle(data.bundleName);
                if (bundle) {
                    let bundleData = bundle.getBundleData();
                    let json = "{}";
                    if (data.fileName) {
                        json = bundle.findSlideByUuid(data.fileName);
                    }
                    socket.emit("callback.video", {bundleData: bundleData, json: json});
                }
            });


            socket.on('edit.saveVideo', function (data) {

                let filename = data.filename;
                if (filename === "") {
                    filename = uuidv4();
                }

                if (data.duration === "") {
                    socket.emit("callback.saveVideo", {erro: "Video duration is not known. Remember to load metadata!"});
                    return;
                }

                try {
                    let bundle = self.bundleManager.getBundle(data.bundleName);
                    if (!bundle) {
                        throw "no active bundle";
                    }
                    let template = {
                        uuid: filename,
                        name: data.name,
                        duration: data.duration,
                        enabled: true,
                        displayTime: data.displayTime,
                        type: "video",
                        url: data.url,
                        mute: data.mute,
                        loop: data.loop,
                        index: bundle.allSlides.length,
                        transition: null,
                        epochStart: -1,
                        epochEnd: -1
                    };

                    let obj = bundle.findSlideByUuid(filename);
                    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
                        bundle.allSlides.push(template);
                    } else {
                        obj.url = data.url;
                        obj.name = data.name;
                        obj.duration = data.duration;
                        obj.displayTime = data.displayTime;
                        obj.mute = data.mute;
                        obj.loop = data.loop;
                        obj.transition = null;
                        obj.epochEnd = -1;
                        obj.epochStart = -1;
                    }

                    bundle.save();

                    cli.success("save video link");
                    socket.emit("callback.saveVideo", {});
                    self.updateSlides();

                } catch (err) {
                    cli.error(err, "save video link");
                    socket.emit("callback.saveVideo", {error: err});
                }
            });


            /** edit **/
            socket.on('admin.editSlide', function (data) {
                let bundle = self?.bundleManager?.getBundle(data.bundleName);
                if (bundle) {
                    let bundleData = bundle.getBundleData();
                    let templateData = {};
                    let json = "{}";
                    if (fs.existsSync("./data/template.json")) {
                        templateData = JSON.parse(fs.readFileSync("./data/template.json").toString());
                    }
                    let slide = { displayTime: null };
                    if (data.fileName) {
                        json = bundle.getSlideJsonFile(data.fileName);
                        slide = bundle.findSlideByUuid(data.fileName);
                    }
                    socket.emit("callback.edit", {bundleData: bundleData, slideData: slide, json: json, templates: templateData, guardRails: config.guardRails});
                }
            });

            /** rename **/
            socket.on('admin.renameSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    if (!bundle) {
                        throw "no active bundle";
                    }
                    bundle.setName(data.uuid, data.name);
                    self.updateSlides();
                } catch (err) {
                    cli.error("error while renaming slide", err);
                }
            });

            /** change transition **/
            socket.on('admin.setTransition', function (data) {
                let transition = data.transition;
                if (data.transition === "null") {
                    transition = null;
                }

                self.getServerOptions().transition = transition;
                self.updateDashboard(io);
            });

            socket.on('edit.saveTemplate', function (data) {
                let templates = {};

                if (fs.existsSync("./data/template.json")) {
                    templates = JSON.parse(fs.readFileSync("./data/template.json").toString());
                }
                templates[data.name] = data.json;
                try {
                    fs.writeFileSync("./data/template.json", JSON.stringify(templates));
                } catch (e) {
                    cli.error(e, "save template");
                }
            });

            socket.on('edit.removeTemplate', function (data) {
                let templates = {};

                if (fs.existsSync("./data/template.json")) {
                    templates = JSON.parse(fs.readFileSync("./data/template.json").toString());
                }

                delete templates[data.name];

                try {
                    fs.writeFileSync("./data/template.json", JSON.stringify(templates));
                } catch (e) {
                    cli.error(e, "remove template");
                }
            });


            socket.on('edit.save', function (data) {

                let filename = data.fileName.replace(".json", "");
                if (filename === "") {
                    filename = uuidv4();
                }

                let duration = data.duration;
                if (data.duration === "") {
                    duration = null;
                }

                let transition = data.transition;
                if (data.transition === "") {
                    transition = null;
                }


                try {
                    data.bundleName = checkAndSanitizeFilePathName(data.bundleName);
                    filename = checkAndSanitizeFilePathName(filename);
                    let bundle = self.bundleManager.getBundle(data.bundleName);
                    if (!bundle) {
                        throw "no active bundle";
                    }
                    fs.writeFileSync("./data/bundles/" + data.bundleName + "/render/" + filename + ".png", data.png.replace(/^data:image\/png;base64,/, ""), "base64");
                    fs.writeFileSync("./data/bundles/" + data.bundleName + "/slides/" + filename, JSON.stringify(data.json));


                    let template = {
                        uuid: filename,
                        name: data.name,
                        duration: duration,
                        enabled: true,
                        displayTime: data.displayTime,
                        type: "slide",
                        index: bundle.allSlides.length,
                        transition: transition,
                        epochStart: data.epochStart,
                        epochEnd: data.epochEnd
                    };

                    let obj = bundle.findSlideByUuid(filename);
                    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
                        bundle.allSlides.push(template);
                    } else {
                        obj.name = data.name;
                        obj.duration = duration;
                        obj.displayTime = data.displayTime;
                        obj.transition = transition;
                        obj.epochStart = data.epochStart,
                        obj.epochEnd = data.epochEnd;
                    }

                    bundle.save();

                    cli.success("save new slide data");
                    socket.emit("callback.save", {});

                    self.announce(null, "callback.reloadImage", {
                        bundleName: data.bundleName,
                        uuid: filename
                    });
                    self.updateSlides();
                    self.dispatcher.emit("lobbyUpdate");
                } catch (err) {
                    cli.error(err, "save new slide date");
                    socket.emit("callback.save", {error: err});
                }
            });

            socket.on('edit.uploadImage', function (data) {

                let filename = data.name.replace(/\.[^/.]+$/, "");
                let ext = data.type.replace("image/", "");
                if (filename === "") {
                    filename = uuidv4();
                }
                try {
                    let replace = "^data:" + data.type + ";base64,";
                    let re = new RegExp(replace, "g");
                    data.bundleName = checkAndSanitizeFilePathName(data.bundleName);
                    filename = checkAndSanitizeFilePathName(filename);
                    ext =  "." + checkAndSanitizeFilePathName(ext)
                    
                    fs.writeFileSync("./data/bundles/" + data.bundleName + "/images/" + filename + ext, data.imageData.replace(re, ""), "base64");
                    cli.success("upload of " + filename + ext);
                    socket.emit("callback.edit.updateFileList", {});
                } catch (err) {
                    cli.error("upload of " + filename + ext);
                    cli.error(err);
                    socket.emit("callback.edit.updateFileList", {error: err});
                }
            });

            socket.on('edit.deleteImage', function (data) {
                try {
                    data.bundleName = checkAndSanitizeFilePathName(data.bundleName);
                    data.name = checkAndSanitizeFilePathName(data.name);
                    fs.unlinkSync("./data/bundles/" + data.bundleName + "/images/" + data.name);
                    cli.success("delete " + data.name);
                    socket.emit("callback.edit.updateFileList", {});
                } catch (err) {
                    cli.error(err, "delete image");
                    socket.emit("callback.edit.updateFileList", {error: err});
                }
            });
            socket.on('edit.deleteImage', function (data) {
                try {
                    data.name = checkAndSanitizeFilePathName(data.name);
                    fs.unlinkSync("./data/backgrounds/" + data.name);
                    cli.success("delete " + data.name);
                    socket.emit("callback.edit.updateFileList", {});
                } catch (err) {
                    cli.error(err, "delete image");
                    socket.emit("callback.edit.updateFileList", {error: err});
                }
            });
        }); // io
    }

    /** helper functions  */

    /**
     * @param {object} socket
     */
    updateDashboard(socket) {
        let bundleSettings = this.screenView.getBundle();

        socket.emit("callback.dashboard.update", {
            bundleSettings: bundleSettings,
            allSlides: bundleSettings?.allSlides,
            serverOptions: this.screenView.serverOptions,
            displayId: this.displayId
        });

        this.dispatcher.emit("dashboard.update", {
            displayId: this.displayId,
            serverOptions: this.screenView.serverOptions
        });

        bundleSettings = null;
    }

    /** helper function to call announce easier **/
    announce(screens, event, data) {
        this.dispatcher.emit("announce", {screens: screens, event: event, data: data});
    }

    updateSlides() {
        let bundleName = this.getServerOptions().currentBundle;
        let bundle = this.getView().getBundle();
        this.io.emit("callback.dashboard.updateSlides", {
            bundleName: bundleName,
            bundleSettings: bundle,
        });
    }

    syncDashboard(socket) {
        this.previewInstances.push({adminId: socket.id, preview: {}, currentView: {}});
        socket.emit("callback.dashboard.sync", {
            displayId: this.displayId,
            bundleDirs: this.bundleManager.getBundleInfos(),
            serverOptions: this.screenView.serverOptions,
            displays: config.displays
        });
    }

    getPreview(socket) {
        for (let i in this.previewInstances) {
            if (this.previewInstances[i].adminId === socket.id) {
                return this.previewInstances[i];
            }
        }
        throw "error";
    }

    /**
     * @return infoscreen3/display.serverOptions
     */
    getServerOptions() {
        return this.screenView.serverOptions;
    }

    /**
     * @return display
     */
    getView() {
        return this.screenView;
    }


    controls(action) {
        let view = this.getView();
        switch (action) {
            case "previous":
                view.serverOptions.loopIndex -= 2;
                view.mainLoop();
                break;
            case "play":
                view.serverOptions.loop = true;
                view.mainLoop();
                this.updateDashboard(this.io);
                break;
            case "pause":
                view.clearTimers();
                view.serverOptions.loop = false;
                this.updateDashboard(this.io);
                break;
            case "next":
                view.mainLoop();
                break;
        }
        view = null;
    }

    // admin
}
