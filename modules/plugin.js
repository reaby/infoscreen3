let express = require('express');
let Twig = require('twig');
let fs = require('fs');
let cli = require('./cli');


class plugin {

    constructor(pluginName, app, io, dispatcher) {        
        this.pluginName = pluginName;
        this.subApp = express();
        this.subApp.set('views', "plugins/" + pluginName + "/views");
        this.subApp.set('view engine', 'twig');
        let router = express.Router();
        this.onPluginRouter(router);
        this.subApp.use(router);

        app.use(this.subApp);
        app.use("/data/" + pluginName, express.static("plugins/" + pluginName + "/public"));
        // register callbacks
        let self = this;
        dispatcher.on('plugin.onAdminRouter', (arr) => self.onAdminRouter(arr));
        this.onInit();
    }

    renderPluginView(template, data) {
        return Twig.twig({ data: fs.readFileSync("plugins/" + this.pluginName + "/views/" + template + ".twig").toString() }).render(data);
    }

    onAdminRouter(router) {

    }

    onPluginRouter(router) {

    }

    onInit() {

    }

    setDisplayViewAdditions() {
        return "";
    }
}

exports.default = plugin;
