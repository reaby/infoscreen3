import fs from 'fs';
import cli from './cli.js';

/**
 * @module infoscreen3/bundle
 */
export default class bundleClass {

    constructor(name, data, slides) {
        this.name = name;
        this.bundleData = data;
        this.bundleData['bundleName'] = this.name;
        this.allSlides = slides;
        this.enabledSlides = [];
        this.disabledSlides = [];
        this.sync();
    }

    getBundleData() {
        this.bundleData['bundleName'] = this.name; // to ensure backwards compatibility
        return this.bundleData;
    }

    setBundleData(data) {
        this.bundleData = data;
        this.bundleData['bundleName'] = this.name; // to ensure backwards compatibility
    }

    getSlideJsonFile(fileName) {
        try {
            return fs.readFileSync(process.cwd() + "/data/bundles/" + this.name + "/slides/" + fileName).toString();
        } catch (err) {
            return "{}";
        }
    }

    findSlideByUuid(uuid) {
        for (let slide of this.allSlides) {
            if (slide.uuid === uuid) {
                return slide;
            }
        }
        return {};
    }

    duplicateUuid(uuid) {
        for (let slide of this.allSlides) {
            if (slide.uuid === uuid) {
                if (slide.type === "slide") {
                    let newId = uuidv4();
                    let path = process.cwd() + "/data/bundles/" + this.name;
                    try {
                        // duplicate at filesystem
                        if (fs.existsSync(path + "/render/" + uuid + ".png")) {
                            fs.copyFileSync(path + "/render/" + uuid + ".png", path + "/render/" + newId + ".png");
                        }
                        if (fs.existsSync(path + "/slides/" + uuid)) {
                            fs.copyFileSync(path + "/slides/" + uuid, path + "/slides/" + newId);
                        }

                        // duplicate at json
                        let newSlide = clone(slide);
                        newSlide.uuid = newId;
                        this.allSlides.push(newSlide);
                        this.save();
                    } catch (err) {
                        cli.error("error while duplicating file:" + uuid, err);
                    }
                }
            }
        }
    }

    moveTo(bundleDir, uuid) {
        let toPath = process.cwd() +"/data/bundles/" + bundleDir;
        let path = process.cwd() + "/data/bundles/" + this.name;
        for (let slide of this.allSlides) {
            if (slide.uuid === uuid) {
                try {
                    // duplicate at filesystem
                    if (fs.existsSync(path + "/render/" + uuid + ".png")) {
                        fs.renameSync(path + "/render/" + uuid + ".png", toPath + "/render/" + uuid + ".png");
                    }

                    if (fs.existsSync(path + "/slides/" + uuid)) {
                        fs.renameSync(path + "/slides/" + uuid, toPath + "/slides/" + uuid);
                    }
                    let slideData = clone(slide);
                    this.removeUuid(uuid);
                    return slideData;
                } catch (err) {
                    cli.error("error while moving file:" + uuid, err);
                    return null;
                }
            }
        }
    }

    removeUuid(uuid) {
        // delete files from fs
        let newList = [];
        let x = 0;
        for (let slide of this.allSlides) {
            if (slide.uuid !== uuid) {
                let ent = slide;
                ent.index = x;
                newList.push(ent);
                x++;
            }
            if (slide.uuid === uuid) {
                if (slide.type === "slide") {
                    let path = process.cwd() + "/data/bundles/" + this.name;
                    try {
                        if (fs.existsSync(path + "/render/" + uuid + ".png")) {
                            fs.unlinkSync(path + "/render/" + uuid + ".png");
                            cli.success("removing file:" + path + "/render/" + uuid + ".png");
                        }
                        if (fs.existsSync(path + "/slides/" + uuid)) {
                            fs.unlinkSync(path + "/slides/" + uuid);
                            cli.success("removing file:" + path + "/slides/" + uuid);
                        }
                    } catch (err) {
                        cli.error("error while deleting file:" + uuid, err);
                    }
                }
            }
        }
        this.allSlides = newList;
        this.save();
    }

    setSlideStatus(uuid, status) {
        for (let i in this.allSlides) {
            if (this.allSlides[i].uuid === uuid) {
                this.allSlides[i].enabled = status;
                this.save();
                break;
            }
        }
    }

    setIndex(uuid, index) {
        for (let i in this.allSlides) {
            if (this.allSlides[i].uuid === uuid) {
                this.allSlides[i].index = index;
                this.sync();
                return;
            }
        }
    }

    setName(uuid, name) {
        for (let i in this.allSlides) {
            if (this.allSlides[i].uuid === uuid) {
                this.allSlides[i].name = name;
                this.save();
                return;
            }
        }
    }

    getEnabledSlides() {
        this.sync();
        return this.enabledSlides;
    }


    sync() {
        this.enabledSlides = [];
        this.disabledSlides = [];
        this.allSlides.sort(sortByProperty('index'));
        let time = Date.parse(new Date().toISOString());
        for (let slide of this.allSlides) {

            if (slide.epochEnd != -1 && time >= slide.epochEnd) {
                slide.enabled = false;
                this.disabledSlides.push(slide.uuid.replace(".json", ""));
                continue;
            }

            if (slide.epochStart != -1) {
                slide.enabled = false;
                if (time >= slide.epochStart) {
                    slide.enabled = true;
                    this.enabledSlides.push(slide.uuid.replace(".json", ""));
                    continue;
                }
            }

            if (slide.enabled) {
                this.enabledSlides.push(slide.uuid.replace(".json", ""));
            } else {
                this.disabledSlides.push(slide.uuid.replace(".json", ""));
            }
        }
    }

    getSlideData(uuid) {
        let slideData = {};
        for (let slide of this.allSlides) {
            if (slide.uuid === uuid) {
                slideData = {
                    settings: slide,
                    render: fs.readFileSync(process.cwd() + "/data/bundles/" + this.name + "/slides/" + slide.uuid + ".png")
                };
                return slide;
            }
        }
    }

    save() {
        this.sync();
        try {
            fs.writeFileSync(process.cwd() + "/data/bundles/" + this.name + "/slides.json", JSON.stringify(this.allSlides, null, "\t"));
            fs.writeFileSync(process.cwd() + "/data/bundles/" + this.name + "/bundle.json", JSON.stringify(this.bundleData, null, "\t"));
        } catch (e) {
            cli.error("error while saving file:", e);
        }
    }
}

/**
 * helper function to clone object
 * @returns {*}
 */
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}


/**
 * helper function to sort object by property.
 * @param property
 * @returns {function(*, *): number}
 */
function sortByProperty(property) {
    let sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        let result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

/** Generate an uuid
 * @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
