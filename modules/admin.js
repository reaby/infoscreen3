let fs = require("fs");
let config = require(`../config.js`);
let cli = require(`./cli.js`);

/**
 *
 */
class admin {

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
                "bundleDirs": self.bundleManager.getBundleInfos()
            });
        });

        /** helper function to call announce easier **/
        function announce(screens, event, data) {
            self.dispatcher.emit("announce", {screens: screens, event: event, data: data});
        }

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
                announce([data.displayId], "callback.reload", {});
            });

            // toggle time
            socket.on('controls.time.toggle', function () {
                let view = self.getView();
                let bool = !view.serverOptions.displayTime;

                view.getBundle().bundleData.displayTime = bool;
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


            socket.on('controls.startStream', function (data) {
                let view = self.getView();
                let serverOptions = self.getServerOptions();

                if (serverOptions.isStreaming === false) {
                    serverOptions.loop = false;
                    serverOptions.streamSource = "http://" + config.serverHost + ":" + (config.serverListenPort + 1) + "/live/" + data.streamName + ".flv";
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
            });


            socket.on('controls.blackout', function () {
                let view = self.getView();
                view.serverOptions.blackout = view.serverOptions.blackout === false;

                view.io.emit("callback.blackout", {serverOptions: view.serverOptions});
                self.updateDashboard(io);
            });

            socket.on("controls.preview", function (data) {
                let bundle = self.bundleManager.getBundle(data.bundle);
                let json = "{}";
                if (data.fileName) {
                    json = bundle.getSlideJsonFile(data.fileName);
                }

                try {
                    self.getPreview(socket).preview.emit("callback.preview",
                        {
                            bundleData: bundle.getBundleData(),
                            json: json,
                            slide: bundle.findSlideByUuid(data.fileName),
                            displayId: data.displayId
                        }
                    );
                } catch (err) {
                    cli.error("preview instance not found");
                }

            });

            socket.on("controls.skipTo", function (data) {
                let bundleSettings = self.getView().getBundle();
                let slides = bundleSettings.enabledSlides;

                let idx = slides.indexOf(data.fileName);
                if (idx >= 0) {
                    self.getServerOptions().loopIndex = idx;
                }
                self.getView().mainLoop();
            });

            socket.on('controls.toggle', function (data) {
                let fileName = data.fileName;
                let bundleSettings = self.getView().getBundle();
                let idx = bundleSettings.disabledSlides.indexOf(fileName);

                if (idx > -1) {
                    bundleSettings.setSlideStatus(fileName, true);
                } else {
                    bundleSettings.setSlideStatus(fileName, false);
                }

                self.updateDashboard(socket);
            });

            // override
            socket.on('admin.override', function (data) {
                try {
                    if (data.displayId === null) {
                        if (data.duration == null || data.duration <= 5) {
                            data.duration = 45;
                        }
                        dispatcher.emit("all.override", data);
                    } else {
                        let view = self.getView();
                        view.overrideSlide(data.json, data.png, data.duration, data.transition);
                    }
                } catch (err) {
                    cli.error("error, admin.override", err);
                }
            });

            socket.on('admin.setBundle', function (data) {
                let view = self.getView();
                view.changeBundle(data.bundle);
                view.displayCurrentSlide();
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
                let bundle = bundleManager.getBundle(data.bundleName);

                let i = 0;
                for (let uuid of data.sortedIDs) {
                    bundle.setIndex(uuid, i);
                    i += 1;
                }

                // calculate next slide order for all displays which has the bundle selected
                let display = screenView;
                if (display.serverOptions.currentBundle === data.bundleName) {
                    for (let slide of bundle.allSlides) {
                        // calculate new index for next slide;
                        if (slide.uuid === display.serverOptions.currentFile) {
                            display.serverOptions.loopIndex = slide.index + 1;
                        }
                    }
                }

                bundle.save();
                updateSlides(io, bundle.name, bundle);
            });

            /** remove slide **/
            socket.on('admin.removeSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    bundle.removeUuid(data.uuid);
                    updateSlides(io, bundle.name, bundle);
                    announce(null, "callback.removeSlide", data);
                } catch (err) {
                    cli.error("error while removing slide", err);
                }
            });


            socket.on("admin.createBundle", function (data) {
                cli.info("@ create Bundle");

                try {
                    if (!fs.existsSync("data/bundles" + data.dir)) {
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


            /** edit web links **/
            socket.on('admin.editLink', function (data) {
                let bundle = self.bundleManager.getBundle(data.bundleName);
                let bundleData = bundle.getBundleData();
                let json = "{}";
                if (data.fileName) {
                    json = bundle.findSlideByUuid(data.fileName);
                }
                socket.emit("callback.webpage", {bundleData: bundleData, json: json});

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
                    }

                    bundle.save();

                    cli.success("save web link");
                    socket.emit("callback.saveLink", {});
                    updateSlides(io, data.bundleName, bundle);

                } catch (err) {
                    cli.error(err, "save web link");
                    socket.emit("callback.saveLink", {error: err});
                }
            });


            /** edit **/
            socket.on('admin.editSlide', function (data) {
                let bundle = self.bundleManager.getBundle(data.bundleName);
                let bundleData = bundle.getBundleData();
                let json = "{}";
                let slide = {displayTime: null};
                if (data.fileName) {
                    json = bundle.getSlideJsonFile(data.fileName);
                    slide = bundle.findSlideByUuid(data.fileName);
                }
                socket.emit("callback.edit", {bundleData: bundleData, slideData: slide, json: json});
            });

            /** rename **/
            socket.on('admin.renameSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    bundle.setName(data.uuid, data.name);
                    updateSlides(io, data.bundleName, bundle);
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
                    fs.writeFileSync("./data/bundles/" + data.bundleName + "/render/" + filename + ".png", data.png.replace(/^data:image\/png;base64,/, ""), "base64");
                    fs.writeFileSync("./data/bundles/" + data.bundleName + "/slides/" + filename, JSON.stringify(data.json));

                    let bundle = self.bundleManager.getBundle(data.bundleName);


                    let template = {
                        uuid: filename,
                        name: data.name,
                        duration: duration,
                        enabled: true,
                        displayTime: data.displayTime,
                        type: "slide",
                        index: bundle.allSlides.length,
                        transition: transition,
                    };

                    let obj = bundle.findSlideByUuid(filename);
                    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
                        bundle.allSlides.push(template);
                    } else {
                        obj.name = data.name;
                        obj.duration = duration;
                        obj.displayTime = data.displayTime;
                        obj.transition = transition;
                    }

                    bundle.save();

                    cli.success("save new slide data");
                    socket.emit("callback.save", {});

                    announce(null, "callback.reloadImage", {
                        bundleName: data.bundleName,
                        uuid: filename
                    });
                    updateSlides(io, data.bundleName, bundle);

                } catch (err) {
                    cli.error(err, "save new slide date");
                    socket.emit("callback.save", {error: err});
                }
            });

            socket.on('edit.uploadImage', function (data) {

                let filename = data.name.replace(/\.[^/.]+$/, "");
                let ext = "." + data.type.replace("image/", "");
                if (filename === "") {
                    filename = uuidv4();
                }
                try {
                    let replace = "^data:" + data.type + ";base64,";
                    let re = new RegExp(replace, "g");

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
                    fs.unlinkSync("./data/bundles/" + data.bundleName + "/images/" + data.name);
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
        let view = this.getView();
        let serverOptions = view.serverOptions;
        let bundleSettings = view.getBundle();

        socket.emit("callback.dashboard.update", {
            bundleSettings: bundleSettings,
            allSlides: bundleSettings.allSlides,
            serverOptions: serverOptions,
            displayId: this.displayId
        });

        this.dispatcher.emit("dashboard.update", {displayId: this.displayId, serverOptions: serverOptions});

    }

    static updateSlides(socket, bundlename, bundle) {
        socket.emit("callback.dashboard.updateSlides", {
            bundleName: bundlename,
            bundleSettings: bundle
        });
    }

    syncDashboard(socket) {
        this.previewInstances.push({adminId: socket.id, preview: {}, currentView: {}});
        let serverOptions = this.getView().serverOptions;
        let bundleDirs = this.bundleManager.getBundleInfos();


        socket.emit("callback.dashboard.sync", {
            displayId: displayId,
            bundleDirs: bundleDirs,
            serverOptions: serverOptions,
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
        return this.getView().serverOptions;
    }

    /**
     * @return display
     */
    getView() {
        return this.screenView;
    }


    controls(action) {
        switch (action) {
            case "previous":
                let view = this.getView();
                view.serverOptions.loopIndex -= 2;
                view.mainLoop();
                break;
            case "play":
                this.getServerOptions().loop = true;
                this.getView().mainLoop();
                this.updateDashboard(this.io);
                break
            case "pause":
                this.getView().clearTimers();
                this.getServerOptions().loop = false;
                this.updateDashboard(this.io);
                break;
            case "next":
                this.getView().mainLoop();
                break;
        }

    } // admin
}

/**
 * @type {admin}
 */
module.exports = admin;