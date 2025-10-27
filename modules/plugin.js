import express from 'express';
import fs from 'fs';
import Twig from 'twig';
import { checkAndSanitizeFilePathName } from './utils.js';

/**
 * Base plugin class
 *
 *  Strucure of plugin:
 *  D /public/     -- serves files statically at http path: /data/pluginName/
 *  D /views/      -- directory for twig templates
 *  F /plugin.js   -- pluginfile which will be loaded
 *
 *  if you need external libs, just add `package.json` to the plugin dir, and call npm install :)
 */
export default class plugin {

    constructor(pluginName, app, io, dispatcher) {
        this.pluginName = checkAndSanitizeFilePathName(pluginName);
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
        template = checkAndSanitizeFilePathName(template)
        return Twig.twig({ data: fs.readFileSync("plugins/" + this.pluginName + "/views/" + template + ".twig").toString() }).render(data);
    }

    /**
     * Called at infoscreen init-phase
     *
     * the example will render a view from `pluginName/Views/test.twig` to route `/admin/test`
     * @example
     * let self = this;
     * router.get("/test", function (req, res, next) {
     *      res.send(self.renderPluginView("test", { test: "hello!" }));
     *      // res.render(); will render from infoscreen/views/*.twig
     * });
     * @param {express.Router} router
     */
    onAdminRouter(router) {

    }

    /**
     * Called at infoscreen init-phase
     *
     * the example will render a view from `pluginName/Views/test.twig` to route `/test`
     *
     * @example
     * router.get("/test", function (req, res) {
     *    res.render("test", { test: "hello!" });
     * });
     *
     * @param {express.Router} router
     */
    onPluginRouter(router) {

    }

    onInit() {

    }
    /**
     * Inserts html to display views
     *
     * @returns {string} HTML to be added to display View
     */
    setDisplayViewAdditions() {
        return "";
    }
}
