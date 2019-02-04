let fs = require("fs");
let path = require("path");
let cli = require("./cli.js");
let bundleManager = require('./bundleManager.js');

/**
 * handles one instance of display
 * @module infoscreen3/display
 */
class display {

    /**
     * @param {object} sharedIO - socketIO
     * @param {object} dispatcher  - dispatcher
     * @param {object} meta - reads from ./data/meta.json --> as display[displayId]
     * @param {number} displayId - this display instances id
     * @param {object} bundleManager
     */
    constructor(sharedIO, dispatcher, meta, displayId, bundleManager) {
        cli.info("Starting display" + displayId + ": " + meta.name + "...");

        /** @property {Array} timeoutId - holds setTimeout id's for mainLoop */
        this.timeoutId = [];
        this.bundleManager = bundleManager;
        let self = this;

        /**
         * @property {number} displayId - this display id
         * @property {number} currentId -  index number @see getBundle()
         * @property {string} currentBundle - current bundle directory name at ./data/
         * @property {string} currentFile - current filename at bundle
         * @property {string} currentJSON - current slides json data
         * @property {boolean} loop - runs main loop
         * @property {number} loopIndex - index number used to calculate slide at enabledSlides @see getBundle()
         * @property {boolean} blackout - should the blackout be enabled
         * @property {boolean} isStreaming - is media server stream enabled at client
         * @property {string} streamSource - URL for FLV media stream
         * @property {string} transition values supported: bars,blinds,blinds3d,zip,blocks,blocks2,concentric,warp,cube,tiles3d,tiles3dprev,slide,swipe,dissolve
         */
        this.serverOptions = {
            displayId: displayId,
            currentId: -1,
            currentBundle: "default",
            currentMeta: {},
            currentFile: null,
            slideDuration: 10,
            loop: true,
            loopIndex: 0,
            blackout: false,
            isStreaming: false,
            streamSource: "",
            isAnnounce: false,
            transition: "tiles3d",
            displayTime: true
        };

        let io = sharedIO.of("/display-" + displayId.toString());
        this.io = io;
        this.name = meta.name;
        this.dispatcher = dispatcher;
        this.id = displayId;

        /**
         * helper callback for global announce
         /**
         * @listens event:announce
         *
         */
        dispatcher.on("announce", function (obj) {
            // if global announce, ie screens is null
            if (obj.screens == null) {
                io.emit(obj.event, obj.data);
            } else {
                // screens is array
                for (let screen of obj.screens) {
                    // so if match, emit data from here
                    if (screen === displayId) {
                        io.emit(obj.event, obj.data);
                    }
                }
            }
        });

        io.on("connection",
            /**
             * @param socket
             */
            function (socket) {
                console.log("WS display" + displayId + ":" + socket.conn.remoteAddress + " connect");

                socket.on('error', function (error) {
                    console.log("WS display" + displayId + ": error");
                    console.log(error);
                });

                socket.on('disconnect', function (reason) {
                    console.log("WS display" + displayId + ": disconnect " + reason + " " + socket.conn.remoteAddress);
                });

                socket.on('sync', function () {
                    cli.info("request sync " + self.name);
                    socket.emit("callbackLoad", self.getSlideData());
                });

            }); // io

        this.init(meta);
        cli.info("done.");
    } // display


    init(meta) {
        this.changeBundle(meta.bundle);
        this.mainLoop();
    }

    /**
     * change displayed bundle
     * @param {string} bundleName
     */
    changeBundle(bundleName) {
        let bundle = this.getBundle();
        this.serverOptions.currentBundle = bundleName;
        this.serverOptions.loopIndex = 0;
        this.serverOptions.currentFile = bundle.enabledSlides[0] || "";
        this.serverOptions.slideDuration = bundle.findSlideByUuid(bundle.enabledSlides[0]).duration || bundle.getBundleData().duration;
        this.serverOptions.currentId = bundle.enabledSlides.indexOf(this.serverOptions.currentFile);
    }

    getSlideData() {
        let bundle = this.getBundle();
        return {bundleData: bundle.getBundleData(), slides: bundle.allSlides, serverOptions: this.serverOptions};
    }

    /**
     * clears timers
     */
    clearTimers() {
        for (let i in this.timeoutId) {
            clearTimeout(this.timeoutId[i]);
            delete this.timeoutId[i];
        }
    }

    /**
     * @returns {bundle}
     */
    getBundle() {
        return this.bundleManager.getBundle(this.serverOptions.currentBundle);
    }


    /**
     * emits custom event for screens
     * @fires event:announce
     * @param screens list of screenId's use "admin" for admin interface
     * @param event  string event to io.emit on the selected screens
     * @param data   object object to send
     */
    announce(screens, event, data) {
        /**
         * @event event:announce
         */
        this.dispatcher.emit("announce", {screens: screens, event: event, data: data});
    }

    /**
     * display main loop, which updates the display periodically
     */
    mainLoop() {
        if (this.serverOptions.loop) {
            this.clearTimers();
        }
        this.serverOptions.isAnnounce = false;

        let bundle = this.getBundle();
        let slides = bundle.enabledSlides;

        if (slides.length >= 0) {
            let lIndex = this.serverOptions.loopIndex;
            if (lIndex < 0) lIndex = slides.length - Math.abs(lIndex); // negative values should shift from end
            let idx = (lIndex % slides.length); // make sure id is normalized to slide count
            this.serverOptions.loopIndex = idx;
            this.serverOptions.currentFile = slides[idx];
            this.serverOptions.slideDuration = bundle.findSlideByUuid(slides[idx]).duration || bundle.getBundleData().duration;
            this.serverOptions.currentId = bundle.enabledSlides.indexOf(this.serverOptions.currentFile);
            this.serverOptions.currentMeta = bundle.findSlideByUuid(slides[idx]);
        }

        this.displayCurrentSlide();


        this.serverOptions.loopIndex += 1;

        if (this.serverOptions.loop) {
            let that = this;
            this.timeoutId.push(
                setTimeout(function () {
                    that.mainLoop();
                }, this.serverOptions.slideDuration * 1000));
        }
    }

    overrideSlide(json, pngData) {
        this.clearTimers();
        this.serverOptions.loop = false;
        this.serverOptions.isAnnounce = true;
        // save temporarily png data...
        fs.writeFileSync("./tmp/display_" + this.serverOptions.displayId + ".png", pngData.replace(/^data:image\/png;base64,/, ""), "base64");
    }

    displayCurrentSlide() {
        this.announce([this.serverOptions.displayId, "admin"], "callback.update", this.getSlideData());
    }
}

module.exports = display;