import fs from 'fs';
import cli from './cli.js';

/**
 * handles one display instance
 */
export default class display {

    /**
     * @param {object} sharedIO - socketIO
     * @param {object} dispatcher  - dispatcher
     * @param {object} meta - reads from config.displays
     * @param {number} displayId - this display instances id
     * @param {module:infoscreen3/bundleManager} bundleManager
     */
    constructor(sharedIO, dispatcher, meta, displayId, bundleManager) {
        cli.info("Starting display with id " + displayId + " ...");

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
         * @property {bool} isAnnounce - if the next slide is announce one
         * @property {bool} announceMeta - all data needed for announces
         * @property {string} transition values
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
            announceMeta: {},
            transition: "fade",
            displayTime: true,
            statusMessage: "",
        };

        /** @property {Array} timeoutId - holds setTimeout id's for mainLoop */
        this.timeoutId = null;

        /**
         * @type {bundleManager|module:infoscreen3/bundleManager}
         */
        this.bundleManager = bundleManager;

        let io = sharedIO.of("/display-" + displayId.toString());
        this.io = io;
        this.name = meta.name;
        this.dispatcher = dispatcher;
        this.id = displayId;
        let self = this;

        /**
         * helper callback for global announce
         * @listens event:announce
         *
         */

        dispatcher.on("all.override", function (data) {
            self.overrideSlide(data.json, data.png, data.duration);
            self.displayCurrentSlide();
        });

        dispatcher.on("display.recalcBundleData", function (bundleName) {
            if (self.serverOptions.currentBundle === bundleName) {
                for (let slide of self.getBundle()?.allSlides) {
                    // calculate new index for next slide;
                    if (slide.uuid === self.serverOptions.currentFile) {
                        self.serverOptions.loopIndex = slide.index + 1;
                    }
                }
            }
        });

        dispatcher.on("announce", function (obj) {
            // if global announce, ie screens is null
            if (obj.screens === null) {
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
        if (bundle) {
            this.serverOptions.loopIndex = 0;
            this.serverOptions.currentFile = bundle.enabledSlides[0] || "";
            this.serverOptions.currentMeta = bundle.findSlideByUuid(bundle.enabledSlides[0]);
            this.serverOptions.slideDuration = bundle.getBundleData().duration;
            this.serverOptions.currentId = bundle.enabledSlides.indexOf(this.serverOptions.currentFile);
            this.serverOptions.transition = bundle.getBundleData().transition;
            this.serverOptions.loop = true;
            this.io.emit("callback.load", this.getSlideData());
        }
        bundle = null;
        this.mainLoop();
    }

    getSlideData() {
        let bundle = this.getBundle();
        return { bundleData: bundle?.getBundleData(), slides: bundle?.allSlides, serverOptions: this.serverOptions };
    }

    /**
     * clears timers
     */
    clearTimers() {
        clearTimeout(this.timeoutId);
    }

    /**
     * @return {bundle}
     */
    getBundle() {
        return this.bundleManager?.getBundle(this.serverOptions.currentBundle);
    }

    toggleBlackout() {
        this.serverOptions.blackout = this.serverOptions.blackout === false;
        this.io.emit("callback.blackout", { serverOptions: this.serverOptions });
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
        this.dispatcher.emit("announce", { screens: screens, event: event, data: data });
    }

    /**
     * display main loop, which updates the display periodically
     */
    mainLoop() {
        if (this.serverOptions.loop) {
            this.clearTimers();
        }

        this.serverOptions.isAnnounce = false;
        this.serverOptions.announceMeta = {};

        let bundle = this.getBundle();
        if (!bundle) {
            return
        }
        let slides = bundle.getEnabledSlides();

        if (slides.length >= 0) {
            let lIndex = this.serverOptions.loopIndex;
            if (lIndex < 0) lIndex = slides.length - Math.abs(lIndex); // negative values should shift from end
            let idx = (lIndex % slides.length); // make sure id is normalized to slide count
            this.serverOptions.loopIndex = idx;
            this.serverOptions.currentFile = slides[idx];
            this.serverOptions.slideDuration = bundle.findSlideByUuid(slides[idx]).duration || bundle.getBundleData().duration;
            this.serverOptions.currentId = slides.indexOf(this.serverOptions.currentFile);
            this.serverOptions.currentMeta = bundle.findSlideByUuid(slides[idx]);
            this.serverOptions.displayTime = bundle.bundleData.displayTime;
        }

        if (this.serverOptions.loop) {
            // override slide timeout if set by slide
            let slideTimeout = this.serverOptions.slideDuration * 1000;
            if (this.serverOptions.currentMeta.duration > 5) {
                slideTimeout = parseFloat(this.serverOptions.currentMeta.duration) * 1000;
            }

            if (slideTimeout >= 5000) {
                this.timeoutId = setTimeout(this.mainLoop.bind(this), slideTimeout);
            } else {
                this.serverOptions.loop = false;
            }
        }

        if (!this.serverOptions.isStreaming) {
            this.displayCurrentSlide();
            this.serverOptions.loopIndex += 1;
        }

        bundle = null;
    }

    overrideSlide(json, pngData, duration, transition) {
        this.clearTimers();
        let _transition = this.serverOptions.transition;
        this.serverOptions.transition = transition;
        this.serverOptions.loop = false;
        this.serverOptions.isAnnounce = true;
        this.serverOptions.announceMeta = json;
        // save temporarily png data...
        if (json.type === "image") {
            fs.writeFileSync("./tmp/display_" + this.serverOptions.displayId + ".png", pngData.replace(/^data:image\/png;base64,/, ""), "base64");
        }

        if (duration && duration >= 5 &&
            (json.type === "video" && json.loop === false)
        ) {
            this.serverOptions.loop = true;
            this.timeoutId = setTimeout(this.mainLoop.bind(this), duration * 1000);
        }
        this.displayCurrentSlide();
        this.serverOptions.transition = _transition;
    }

    updateUI() {
        this.io.emit("callback.updateUI", this.getSlideData());
    }

    displayCurrentSlide() {
        this.announce([this.id, "admin"], "callback.update", this.getSlideData());
    }
}

