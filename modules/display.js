let fs = require("fs");
let cli = require(`./cli.js`);
let bundleManager = require(`./bundleManager.js`);

/**
 * handles one display instance
 */
class display {

    /**
     * @param {object} sharedIO - socketIO
     * @param {object} dispatcher  - dispatcher
     * @param {object} meta - reads from config.displays
     * @param {number} displayId - this display instances id
     * @param {module:infoscreen3/bundleManager} bundleManager
     */
    constructor(sharedIO, dispatcher, meta, displayId, bundleManager) {
        cli.info("Starting display with id " + displayId + " ...");

        /** @property {Array} timeoutId - holds setTimeout id's for mainLoop */
        this.timeoutId = [];

        /**
         * @type {bundleManager|module:infoscreen3/bundleManager}
         */
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
         * @listens event:announce
         *
         */

        dispatcher.on("all.override", function (data) {
            self.overrideSlide(data.json, data.png, data.duration);
            self.displayCurrentSlide();
        });

        dispatcher.on("announce", function (obj) {
            // if global announce, ie screens is null
            if (obj.screens === null) {
                console.log("announcing: " + this.serverOptions.displayId);
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
                cli.info("WS display" + displayId + ":" + socket.conn.remoteAddress + " connect");

                socket.on('error', function (error) {
                    cli.info("WS display" + displayId + ": error");
                    cli.error(error);
                });

                socket.on('disconnect', function (reason) {
                    cli.info("WS display" + displayId + ": disconnect " + reason + " " + socket.conn.remoteAddress);
                });

                socket.on('sync', function () {
                    cli.info("request sync " + self.name);
                    socket.emit("callback.load", self.getSlideData());
                });

            }); // io

        this.init(meta);
        cli.success(meta.name + " started with '" + meta.bundle + "'");
    } // display


    init(meta) {
        this.io.emit("callback.reload");
        this.changeBundle(meta.bundle);
    }


    /**
     * change displayed bundle
     * @param {string} bundleName
     */
    changeBundle(bundleName) {
        this.serverOptions.currentBundle = bundleName;
        let bundle = this.getBundle();
        this.serverOptions.loopIndex = 0;
        this.serverOptions.currentFile = bundle.enabledSlides[0] || "";
        this.serverOptions.currentMeta = bundle.findSlideByUuid(bundle.enabledSlides[0]);
        this.serverOptions.slideDuration = bundle.getBundleData().duration;
        this.serverOptions.currentId = bundle.enabledSlides.indexOf(this.serverOptions.currentFile);
        this.serverOptions.transition = bundle.getBundleData().transition;
        this.serverOptions.loop = true;
        this.io.emit("callback.load", this.getSlideData());
        this.mainLoop();
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
     * @return {bundle}
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
            this.serverOptions.displayTime = bundle.bundleData.displayTime;
        }

        if (this.serverOptions.loop) {
            let that = this;

            // override slide timeout if set by slide
            let slideTimeout = this.serverOptions.slideDuration * 1000;
            if (this.serverOptions.currentMeta.duration > 5) {
                slideTimeout = parseFloat(this.serverOptions.currentMeta.duration) * 1000;
            }

            if (slideTimeout >= 5000) {
                this.timeoutId.push(
                    setTimeout(function () {
                        that.mainLoop();
                    }, slideTimeout));

            } else {
                this.serverOptions.loop = false;
            }
        }

        this.displayCurrentSlide();
        this.serverOptions.loopIndex += 1;
    }

    overrideSlide(json, pngData, duration, transition) {
        this.clearTimers();
        let _transition = this.serverOptions.transition;
        this.serverOptions.transition = transition;
        this.serverOptions.loop = false;
        this.serverOptions.isAnnounce = true;
        // save temporarily png data...
        fs.writeFileSync("./tmp/display_" + this.serverOptions.displayId + ".png", pngData.replace(/^data:image\/png;base64,/, ""), "base64");
        let that = this;
        if (duration && duration >= 5) {
            this.serverOptions.loop = true;
            this.timeoutId.push(
                setTimeout(function () {
                    that.mainLoop();
                }, duration * 1000));
        }
        this.displayCurrentSlide();
        this.serverOptions.transition = _transition;
    }

    displayCurrentSlide() {
        this.announce([this.serverOptions.displayId, "admin"], "callback.update", this.getSlideData());
    }
}

/**
 * @type {display}
 */
module.exports = display;