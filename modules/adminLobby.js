import cli from './cli.js'

export default class adminLobby {

    /**
     * @param sharedIO
     * @param dispatcher
     * @param screenView
     * @param adminView
     * @param bundleManager
     */
    constructor(sharedIO, dispatcher, screenView, adminView, bundleManager) {
        let io = sharedIO.of("/admin");
        this.io = io;
        this.dispatcher = dispatcher;
        this.screenView = screenView;
        this.adminView = adminView;
        this.bundleManager = bundleManager;
        let self = this;

        // create overview admin lobby
        io.on("connection", function (socket) {

            let arr = [];
            for (let display of screenView) {
                arr.push({displayId: display.serverOptions.displayId, serverOptions: display.serverOptions});
            }
            socket.emit("callback.serverOptions", arr);

            // handle other events
            cli.info("WS/" + socket.conn.remoteAddress + " connect");
            socket.on('error', function (error) {
                cli.error(error, "WS/ error");
            });
            socket.on('disconnect', function (reason) {
                cli.info("WS/ " + reason + " " + socket.conn.remoteAddress);
            });

            socket.on('admin.reorderSlides', function (data) {
                bundleManager.reorderSlides(data.bundleName, data.sortedIDs);
                dispatcher.emit("display.recalcBundleData", data.bundleName);
                let bundle = bundleManager.getBundle(data.bundleName);
                updateSlides(data.bundleName, bundle);
            });

            socket.on('admin.removeSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    bundle.removeUuid(data.uuid);
                    updateSlides(data.bundleName, bundle);
                    socket.emit("callback.updateBundleData");
                    self.announce(null, "callback.removeSlide", data);
                } catch (err) {
                    cli.error("error while removing slide", err);
                }
            });

            socket.on('admin.duplicateSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    bundle.duplicateUuid(data.uuid);
                    socket.emit("callback.updateBundleData");
                    dispatcher.emit("display.recalcBundleData", data.bundleName);
                    updateSlides(data.bundleName, bundle);
                } catch (err) {
                    cli.error("error while duplicating slide", err);
                }
            });

            socket.on('admin.moveSlide', function (data) {
                try {
                    let bundle = bundleManager.moveSlide(data.from, data.to, data.uuid, data.position);
                    socket.emit("callback.updateBundleData");
                    updateSlides(data.from, bundle);
                } catch (err) {
                    cli.error("error while moving slide", err);
                }
            });

            /** rename **/
            socket.on('admin.renameSlide', function (data) {
                try {
                    let bundle = bundleManager.getBundle(data.bundleName);
                    bundle.setName(data.uuid, data.name);
                    updateSlides(data.bundleName, bundle);
                    socket.emit("callback.updateBundleData");
                } catch (err) {
                    cli.error("error while renaming slide", err);
                }
            });


            socket.on('controls.previous', function (data) {
                getAdminView(data.displayId).controls("previous");
            });

            socket.on('controls.play', function (data) {
                getAdminView(data.displayId).controls("play");
            });

            socket.on('controls.next', function (data) {
                getAdminView(data.displayId).controls("next");
            });

            socket.on('controls.pause', function (data) {
                getAdminView(data.displayId).controls("pause");
            });
            
            cli.info('admin lobby adding dispatcher on dashboard.update count:' + dispatcher.rawListeners("dashboard.update").length);
            let dashboardUpdateHandler = function (data) {
                socket.emit("callback.serverOptions", [data]);
            };
            dispatcher.on("dashboard.update", dashboardUpdateHandler);

            socket.on("disconnect", function (s) {
                dispatcher.removeListener('dashboard.update', dashboardUpdateHandler);
                cli.info("admin lobby socket disconnect");
            })
        });
        function updateSlides(bundleName, bundleData) {
            for (let aView of adminView) {
                aView.updateSlides();
            }
            // update admin lobby
            io.emit("callback.dashboard.updateSlides", {
                bundleName: bundleName,
                bundleSettings: bundleData
            });
        }

        /**
         * @return admin
         */
        function getAdminView(index) {
            try {
                return adminView[index];
            } catch (err) {
                cli.log(err);
            }
        }

    }

    announce(screens, event, data) {
        /**
         * @event event:announce
         */
        this.dispatcher.emit("announce", {screens: screens, event: event, data: data});
    }

}
