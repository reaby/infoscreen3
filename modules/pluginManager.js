import fs from 'fs';
import cli from './cli.js'
import config from '../config.js';

export default class pluginManager {

    constructor(app, io, eventDispatcher) {
        this.plugins = {};
        this.dispatcher = eventDispatcher;
        cli.info("Initializing plugins...");
        this.load(app, io, eventDispatcher);
    }

    async load(app, io, eventDispatcher) {
        for (const pluginName of config.plugins) {
            try {
                const pluginclass = await import("../plugins/" + pluginName + "/plugin.js");
                const plugin = pluginclass.default;
                let pluginInstance = new plugin(pluginName, app, io, eventDispatcher);
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