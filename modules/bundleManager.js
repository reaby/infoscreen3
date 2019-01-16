"use strict";

const bundle = require('./bundle.js');
let fs = require("fs");

/**
 * @module infoscreen3/bundleManager
 */
class bundleManager {

    constructor() {
        this.bundles = {};
        let dirs = getDirectories("./data");

        for (let name of dirs) {
            let data = getJson("./data/" + name + "/bundle.json");
            let slides = getJson("./data/" + name + "/slides.json");

            this.bundles[name] = new bundle(name, data, slides);
        }
    }

    /**
     *
     * @param {string} name
     * @returns {bundle}
     */
    getBundle(name) {
        return this.bundles[name];
    }

}

function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path + '/' + file).isDirectory();
    });
}


function getJson(file) {
    return JSON.parse(fs.readFileSync(file).toString());
}

module.exports = bundleManager;