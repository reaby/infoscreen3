let config = require(`../config.js`);
let availableDisplays = config.displays;
let display = require(`./display.js`);
let admin = require(`./admin.js`);
let adminLobby = require(`./adminLobby.js`);
let cli = require(`./cli.js`);
let _bundleManager = require(`./bundleManager.js`);
let chalk = require('chalk');
let fs = require('fs');



/**
 * @param server
 * @param app
 * @param io
 * @param dispatcher
 * @return {{screenView: display[], adminView: admin[], bundleManager: bundleManager}}
 */
module.exports = function (pluginManager, io, dispatcher) {
    /**
     * @type {display[]}
     */
    let screenView = [];

    /** @type {admin[]} */
    let adminView = [];

    console.log(chalk.green(">> ") + "InfoScreen3" + chalk.green("<<"));
    cli.log("Checking for write permissions...");

    try {
        fs.accessSync("./data", fs.W_OK);
        cli.success("data directory (./data) is writable");
    } catch (err) {
        cli.error("data directory (./data) is not writable", err);
        process.exit(1);
    }

    try {
        fs.accessSync("./tmp", fs.W_OK);
        cli.success("temp directory (./tmp) is writable ");
        let tempFiles = fs.readdirSync("./tmp/", {
            dotfiles: false
        });
        cli.info("removing temp-files...");
        for (let file of tempFiles) {
            if (file !== ".gitkeep") {
                fs.unlinkSync("./tmp/" + file);
            }
        }
        cli.info("done.");

    } catch (err) {
        cli.error("temp directory (./tmp) is not writable", err);
        process.exit(1);
    }

    cli.info("Starting bundle manager...");

    let bundleManager = new _bundleManager();

    cli.info("Starting websocket backend...");

    let screenId = 0;

    // create screens and admin socket interfaces
    for (let metadata of availableDisplays) {
        let view = new display(io, dispatcher, metadata, screenId, bundleManager);
        screenView.push(view);
        adminView.push(new admin(io, dispatcher, view, screenId, bundleManager));
        screenId += 1;
    }

    let adminLobby1 = new adminLobby(io, dispatcher, screenView, adminView, bundleManager);
    // create lobby
    io.of("/lobby").on("connection", function (socket) {
        cli.info("WS/" + socket.conn.remoteAddress + " connect");

        socket.on('error', function (error) {
            cli.error(error, "WS/ error");
        });

        socket.on('disconnect', function (reason) {
            cli.info("WS/ " + reason + " " + socket.conn.remoteAddress);
        });

        socket.on('displays', function () {
            let previewImages = [];
            for (let display of screenView) {
                if (display.serverOptions.currentMeta.type === "slide") {
                    previewImages.push("/render/" + display.serverOptions.currentBundle + "/" + display.serverOptions.currentFile + ".png");
                } else {
                    previewImages.push("/img/nopreview.png");
                }
            }
            socket.emit("callback.displays", { displays: availableDisplays, previewImages: previewImages });
        });
    });

    return { screenView: screenView, adminView: adminView, bundleManager: bundleManager };
};

