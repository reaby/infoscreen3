import fs from 'fs';
import cli from './cli.js';
import bundle from './bundle.js';

/**
 * @module infoscreen3/bundleManager
 */
export default class bundleManager {

    constructor() {
        this.syncBundles();
    }

    /**
     * Sync bundles...
     */
    syncBundles() {
        this.bundles = {};
        let dirs = getDirectories("./data/bundles/");
        dirs.sort();

        for (let name of dirs) {
            let data = getJson("./data/bundles/" + name + "/bundle.json");
            let slides = getJson("./data/bundles/" + name + "/slides.json");
            this.bundles[name] = new bundle(name, data, slides);
        }

    }

    /**
     * get bundle
     * @param {string} name
     * @returns {bundle}
     */
    getBundle(name) {
        if (this.bundles.hasOwnProperty(name)) {
            return this.bundles[name];
        } else {
            try {
                cli.info(name + " not in bundles, trying to load from fs...");
                let data = getJson("./data/bundles/" + name + "/bundle.json");
                let slides = getJson("./data/bundles/" + name + "/slides.json");
                this.bundles[name] = new bundle(name, data, slides);
                cli.success(name + " load");
                return this.bundles[name];
            } catch (err) {
                cli.error("bundle by name " + name + " not found on filesystem", err);
            }
        }
    }

    moveSlide(fromBundle, toBundle, uuid, position) {
        let fromBundleObj = this.getBundle(fromBundle);
        let slideData = fromBundleObj?.moveTo(toBundle, uuid);
        let bundle = this.getBundle(toBundle);
        if (slideData && bundle) {
            slideData.index = position;
            bundle.allSlides.push(slideData);
            bundle.save();
        }

    }

    reorderSlides(bundleName, sortedIDs) {
        let bundle = this.getBundle(bundleName);
        let i = 0;
        for (let uuid of sortedIDs) {
            bundle?.setIndex(uuid, i);
            i += 1;
        }
        bundle?.save();
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

/**
 * helper function to returns all directories for path
 * @param path
 * @return {string[]}
 */
function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path + '/' + file).isDirectory();
    });
}

/**
 * helper function to load and parse json to array
 * @param file
 * @return {object}
 */
function getJson(file) {
    return JSON.parse(fs.readFileSync(file).toString());
}
