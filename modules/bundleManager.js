"use strict";

const bundle = require('./bundle.js');
let fs = require("fs");
let cli = require("./cli.js");

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
        if (this.bundles.hasOwnProperty(name)) {
            return this.bundles[name];
        } else {
            try {
                cli.info(name + " not in bundles, trying to load from fs...");
                let data = getJson("./data/" + name + "/bundle.json");
                let slides = getJson("./data/" + name + "/slides.json");
                this.bundles[name] = new bundle(name, data, slides);
                cli.success(name + " load");
                return this.bundles[name];
            } catch (err) {
                cli.error("bundle by name "+ name +" not found on filesystem", err);
            }
        }
    }

    /**
     *
     * @return {Array}
     */
    getBundleInfos() {
        let out = [];
        for (let key in this.bundles) {
            out.push({
                dir: key,
                name: this.bundles[key].getBundleData().displayName
            });
        }
        return out;
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