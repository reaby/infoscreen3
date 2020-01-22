let fs = require("fs");
let cli = require(`./cli.js`);
let config = require(`../config.js`);

class pluginManager {

    constructor(app, io, eventDispatcher) {
        this.plugins = {};
        this.dispatcher = eventDispatcher;
        cli.info("Initializing plugins...");
        for (let pluginName of config.plugins) {
            try {
                let pluginclass = require("../plugins/" + pluginName + "/plugin.js").default;
                let pluginInstance = new pluginclass(pluginName, app, io, eventDispatcher);
                cli.info("" + pluginName, 'plugin');
                this.plugins[pluginName] = pluginInstance;
            } catch (err) {
                cli.error(err, pluginName);
            }
        }
    }

    callMethod(method, params) {
        this.dispatcher.emit("plugin." + method, params);
    }

    getDisplayAdditions() {
        let additions = "";
        for (let name in this.plugins) {
            additions += this.plugins[name].setDisplayViewAdditions();
        }
        return additions;
    }

}

module.exports = pluginManager;