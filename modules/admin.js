let fs = require("fs");
let config = require("../config.js");
let cli = require('./cli.js');

/**
 * @module infoscreen3/admin
 * @class
 */
class admin {

    /**
     *
     * @param sharedIO
     * @param dispatcher
     * @param screenViews
     * @param bundleManager
     */
    constructor(sharedIO, dispatcher, screenViews, bundleManager) {
        cli.info("Starting admin socket interface");

        /**
         * @typedef {object} previewInstance
         * @property {string} adminId is string from admin socket.Id
         * @property {object} preview, pure previews socket
         *
         * @type {previewInstance[]}
         */
        let previewInstances = [];
        let io = sharedIO.of("/admin");
        this.io = io;
        this.dispatcher = dispatcher;

        this.bundleManager = bundleManager;
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

        /** helper function to call announce easier **/
        function announce(screens, event, data) {
            self.dispatcher.emit("announce", {screens: screens, event: event, data: data});
        }

        io.on("connection", function (socket) {
            cli.success("WS " + socket.conn.remoteAddress + " connect with id:" + socket.id);


            socket.on('error', function (error) {
                cli.error(error, "WS error on socket id:" + socket.id);
                for (let i in previewInstances) {
                    if (previewInstances[i].adminId === socket.id || previewInstances[i].preview === socket) {
                        delete previewInstances[i];
                        break;
                    }
                }
            });

            socket.on('disconnect', function (reason) {
                for (let i in previewInstances) {
                    if (previewInstances[i].adminId === socket.id || previewInstances[i].preview === socket) {
                        delete previewInstances[i];
                        break;
                    }
                }
                cli.success("WS " + reason + " " + socket.conn.remoteAddress + " socket id:" + socket.id);
            });

            socket.on('sync.preview', function (socketId) {
                for (let i in previewInstances) {
                    if (previewInstances[i].adminId === decodeURIComponent(socketId)) {
                        previewInstances[i].preview = socket;
                    }
                }
            });

            socket.on('admin.reload', function (data) {
                announce([data.displayId], "callback.reload", {});
            });

            // toggle time
            socket.on('controls.time.toggle', function (data) {
                let view = getView(data.displayId);
                view.serverOptions.timeDisplay = !view.serverOptions.timeDisplay;
                view.io.emit("callback.time", view.serverOptions.timeDisplay);
                updateDashboard(io, data.displayId);
            });

            socket.on('controls.previous', function (data) {
                let view = getView(data.displayId);
                view.serverOptions.loopIndex -= 2;
                view.mainLoop();
            });

            socket.on('controls.play', function (data) {
                getServerOptions(data.displayId).loop = true;
                getView(data.displayId).mainLoop();
                updateDashboard(io, data.displayId);
            });

            socket.on('controls.startStream', function (data) {
                let view = getView(data.displayId);
                let serverOptions = getServerOptions(data.displayId);

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
                view.io.emit("callbackLoad", view.getSlideData());
                updateDashboard(io, data.displayId);
            });


            socket.on('controls.pause', function (data) {
                let view = getView(data.displayId);
                view.clearTimers();
                getServerOptions(data.displayId).loop = false;
                updateDashboard(io, data.displayId);
            });

            socket.on('controls.next', function (data) {
                getView(data.displayId).mainLoop();
            });

            socket.on('controls.blackout', function (data) {
                let view = getView(data.displayId);
                view.serverOptions.blackout = view.serverOptions.blackout === false;

                view.io.emit("callback.blackout", {serverOptions: view.serverOptions});
                updateDashboard(io, data.displayId);
            });

            socket.on("controls.preview", function (data) {
                let bundle = self.bundleManager.getBundle(data.bundle);
                let json = "{}";
                if (data.fileName) {
                    json = bundle.getSlideJsonFile(data.fileName);
                }

                try {
                    getPreview(socket).preview.emit("callback.preview",
                        {
                            bundleData: bundle.getBundleData(),
                            json: json,
                            displayId: data.displayId
                        }
                    );
                } catch (err) {
                    cli.error("preview instance not found");
                }

            });

            socket.on("controls.skipTo", function (data) {
                let bundleSettings = getView(data.displayId).getBundle();
                let slides = bundleSettings.enabledSlides;

                let idx = slides.indexOf(data.fileName);
                if (idx >= 0) {
                    getServerOptions(data.displayId).loopIndex = idx;
                }
                getView(data.displayId).mainLoop();
            });

            socket.on('controls.toggle', function (data) {
                let fileName = data.fileName;
                let bundleSettings = getView(data.displayId).getBundle();
                let idx = bundleSettings.disabledSlides.indexOf(fileName);

                if (idx > -1) {
                    bundleSettings.setSlideStatus(fileName, true);
                } else {
                    bundleSettings.setSlideStatus(fileName, false);
                }

                updateDashboard(socket, data.displayId);
            });

            // override
            socket.on('admin.override', function (data) {
                let view = getView(parseInt(data.displayId));
                view.overrideSlide(data.json, data.png);
                view.displayCurrentSlide();
            });

            socket.on('admin.setBundle', function (data) {
                let view = getView(data.displayId);
                view.changeBundle(data.bundle);
                view.displayCurrentSlide();
                updateDashboard(io, data.displayId);
            });

            socket.on('admin.dashboard.sync', function (data) {
                syncDashboard(socket, 0);
                updateDashboard(socket, data.displayId);
            });

            socket.on('admin.setDisplay', function (data) {
                syncDashboard(socket, data.display);
                updateDashboard(socket, data.display);
            });

            socket.on('admin.listSlides', function (data) {
                updateDashboard(socket, data.displayId);
            });

            socket.on('admin.listBundles', function (data) {
                updateDashboard(socket, data.displayId);
            });


            socket.on('admin.reorderSlides', function (data) {
                let view = getView(data.displayId);
                let serverOptions = view.serverOptions;
                let bundle = view.getBundle();

                let i = 0;
                console.log(data.sortedIDs);

                for (let uuid of data.sortedIDs) {
                    bundle.setIndex(uuid, i);
                    i += 1;
                }

                for (let slide of bundle.allSlides) {
                    // calculate new index for next slide;
                    if (slide.uuid === serverOptions.currentFile) {
                        serverOptions.loopIndex = slide.index + 1;
                    }
                }

                bundle.save();
                updateDashboard(io, data.displayId);
            });

            /** remove slide **/
            socket.on('admin.removeSlide', function (data) {
                let view = getView(data.displayId);
                let bundle = view.getBundle();
                bundle.removeUuid(data.uuid);
                updateSlides(io, bundle.getBundleData().bundleName, bundle);
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
                var duration = null;

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
                        displayTime: data.displayTime || true,
                        type: "webpage",
                        webUrl: data.webUrl,
                        zoom: 1.0,
                        index: bundle.allSlides.length
                    };

                    let obj = bundle.findSlideByUuid(filename);
                    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
                        bundle.allSlides.push(template);
                    } else {
                        obj.webUrl = data.webUrl;
                        obj.name = data.name;
                        obj.duration = data.duration || null;
                        obj.displayTime = data.displayTime || true;
                        obj.zoom = parseFloat(data.zoom) || 1.0;
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
                if (data.fileName) {
                    json = bundle.getSlideJsonFile(data.fileName);
                }
                socket.emit("callbackEdit", {bundleData: bundleData, json: json});
            });

            /** rename **/
            socket.on('admin.renameSlide', function (data) {
                getView(data.displayId).getBundle().setName(data.uuid, data.name);
                updateDashboard(io, data.displayId);
            });
            /** change transition **/
            socket.on('admin.setTransition', function (data) {
                getServerOptions(data.displayId).transition = data.transition;
                updateDashboard(io, data.displayId);
            });

            socket.on('edit.save', function (data) {

                let filename = data.fileName.replace(".json", "");
                if (filename === "") {
                    filename = uuidv4();
                }

                try {
                    fs.writeFileSync("./data/" + data.bundleName + "/render/" + filename + ".png", data.png.replace(/^data:image\/png;base64,/, ""), "base64");
                    fs.writeFileSync("./data/" + data.bundleName + "/slides/" + filename, JSON.stringify(data.json));

                    let bundle = self.bundleManager.getBundle(data.bundleName);

                    let template = {
                        file: filename,
                        name: data.name,
                        duration: null,
                        enabled: true,
                        displayTime: true,
                        type: "slide",
                        index: bundle.allSlides.length,
                    };

                    let obj = bundle.findSlideByUuid(filename);
                    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
                        bundle.allSlides.push(template);
                    }

                    bundle.save();

                    cli.success("save new slide data");
                    socket.emit("callback.save", {});
                    announce([parseInt(data.displayId)], "callback.reloadImage", {
                        bundle: data.bundleName,
                        file: filename
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

                    fs.writeFileSync("./data/" + data.bundleName + "/images/" + filename + ext, data.imageData.replace(re, ""), "base64");
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
                    fs.unlinkSync("./data/" + data.bundleName + "/images/" + data.name);
                    cli.success("delete " + data.name);
                    socket.emit("callback.edit.updateFileList", {});
                } catch (err) {
                    cli.error(err, "delete image");
                    socket.emit("callback.edit.updateFileList", {error: err});
                }
            });

        }); // io


        /** helper functions  */

        /**
         * @param {object} socket
         * @param {number} displayId
         */
        function updateDashboard(socket, displayId) {
            let view = getView(displayId);
            let serverOptions = view.serverOptions;
            let bundleSettings = view.getBundle();

            socket.emit("callback.dashboard.update", {
                bundleSettings: bundleSettings,
                allSlides: bundleSettings.allSlides,
                serverOptions: serverOptions,
                displayId: displayId
            });
        }

        function updateSlides(socket, bundlename, bundle) {
            socket.emit("callback.dashboard.updateSlides", {
                bundleName: bundlename,
                bundleSettings: bundle
            });
        }

        function syncDashboard(socket, displayId) {

            previewInstances.push({adminId: socket.id, preview: {}, currentView: {}});
            let serverOptions = getView(displayId).serverOptions;
            let bundleDirs = getDirectories("./data");
            let meta = JSON.parse(fs.readFileSync("./data/meta.json").toString());

            socket.emit("callback.dashboard.sync", {
                displayId: displayId,
                bundleDirs: bundleDirs,
                serverOptions: serverOptions,
                displays: meta.displays
            });
        }

        function getDirectories(path) {
            return fs.readdirSync(path).filter(function (file) {
                return fs.statSync(path + '/' + file).isDirectory();
            });
        }

        function getPreview(socket) {
            for (let i in previewInstances) {
                if (previewInstances[i].adminId === socket.id) {
                    return previewInstances[i];
                }
            }

            throw "error";
        }

        /** Generate an uuid
         * @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
        function uuidv4() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        /**
         * @param {number} displayId
         */
        function getServerOptions(displayId) {
            return getView(displayId).serverOptions;

        }

        /**
         *
         * @param displayId
         */
        function getView(displayId) {
            try {
                return screenViews[parseInt(displayId)];
            } catch (err) {
                throw "display not found";
            }
        }
    }

} // admin


module.exports = admin;