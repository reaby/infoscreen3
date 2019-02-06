let cli = require("./cli.js");
let fs = require("fs");

class bundleClass {

    constructor(name, data, slides) {
        this.name = name;
        this.bundleData = data;
        this.allSlides = slides;
        this.enabledSlides = [];
        this.disabledSlides = [];
        this.sync();
    }

    getBundleData() {
        return this.bundleData;
    }

    getSlideJsonFile(fileName) {
        try {
            return fs.readFileSync("./data/" + this.name + "/slides/" + fileName).toString();
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
                    let path = "./data/" + this.name;
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
                this.sync();
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

    sync() {
        this.enabledSlides = [];
        this.disabledSlides = [];
        this.allSlides.sort(sortByProperty('index'));
        for (let slide of this.allSlides) {
            if (slide.enabled) {
                this.enabledSlides.push(slide.uuid.replace(".json", ""));
            } else {
                this.disabledSlides.push(slide.uuid.replace(".json", ""));
            }
        }
    }

    toJson() {
        this.sync();
        return JSON.stringify(this.allSlides, null, "\t");
    }

    save() {
        try {
            fs.writeFileSync("./data/" + this.name + "/slides.json", this.toJson());
            fs.writeFileSync("./data/" + this.name + "/bundle.json", JSON.stringify(this.bundleData, null, "\t"));
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

module.exports = bundleClass;