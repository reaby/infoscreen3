let canvas;
let bundleData;

let _clipboard = null;
let slideName = "untitled";

bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};

$(function () {

    $('html').keyup(function (e) {
        if (e.keyCode === 46) {
            obj = canvas.getActiveObject();
            if (!obj.isEditing) {
                removeSelectedObjects();
            }
        }
    });

    $('#order')
        .dropdown({
            action: 'hide',
            onChange: function (value, text, $selectedItem) {
                setZindex(value);
            }
        });


    $('#contextmenu .dropdown').dropdown({
        on: 'hover',
    });

    $("#displaytime").checkbox();

    displayTime();
    setInterval(displayTime, 1000);
});


// Trigger action when the contexmenu is about to be shown
$(document).bind("contextmenu", function (event) {

    // Avoid the real one
    event.preventDefault();

    var objects = canvas.getActiveObjects();

    if (objects.length > 0) {
        // Show contextmenu
        $("#contextmenu").finish().toggle(100).// In the right position (the mouse)
        css({
            top: event.pageY + "px",
            left: event.pageX + "px"
        });
    }

});


// If the document is clicked somewhere
$(document).bind("mousedown", function (e) {

    // If the clicked element is not the menu
    if (!$(e.target).parents("#contextmenu").length > 0) {
        if (!$(e.target).attr("data-action")) {
            // Hide it
            $("#contextmenu").hide(100);
        }
    }
});


// If the menu element is clicked
$("#contextmenu .item").click(function () {

    // This is the triggered action name
    switch ($(this).attr("data-action")) {

        // A case for each action. Your actions here
        case "copy":
            copyObject();
            break;
        case "paste":
            pasteObject();
            break;
        case "delete":
            removeSelectedObjects();
            break;
        case "bringToFront":
            setZindex("bringToFront");
            break;
        case "sendToBack":
            setZindex("sendToBack");
            break;
        case "bringForward":
            setZindex("bringForward");
            break;
        case "sendBackwards":
            setZindex("sendBackwards");
            break;
    }

    // Hide it AFTER the action was triggered
    $("#contextmenu").hide(100);
});

/**
 * Displays the local time for bottom of screen
 * hh:mm
 **/
function displayTime() {
    var date = new Date();
    var min = date.getMinutes();
    if (min < 10) min = "0" + min;
    var time = date.getHours() + ":" + min;
    $('#time2').html(time);
}

function setAlign(align) {
        var object = canvas.getActiveObject();
        if (object.type === "i-text") {
            object.textAlign = align;
        }
        canvas.renderAll();
}


function setZindex(value) {
    switch (value) {
        case "sendToBack":
            canvas.sendToBack(canvas.getActiveObject());
            break;
        case "bringToFront":
            canvas.bringToFront(canvas.getActiveObject());
            break;
        case "bringForward":
            canvas.bringForward(canvas.getActiveObject());
            break;
        case "sendBackwards":
            canvas.sendBackwards(canvas.getActiveObject());
            break;
    }
    canvas.renderAll();
}

// socketio

fabric.Image.prototype.toObject = (function (toObject) {
    return function () {
        return fabric.util.object.extend(toObject.call(this), {
            src: '/images' + this.getSrc().split('images')[1]
        });
    }
})(fabric.Image.prototype.toObject);

socket.on('connect', function () {
    canvas = new fabric.Canvas('edit');
    canvas.includeDefaultValues = false;
    canvas.preserveObjectStacking = true;
    canvas.antialias = true;

    socket.emit('admin.editSlide', {bundleName: bundle, fileName: file});
});

socket.on('callback.save', function (data) {
    if (data.error) {
        alert(data.error);
    } else {
        // alert("slide saved successfully.");
        window.close();
    }
});

socket.on('callback.edit.updateFileList', function (data) {
    if (data.error) {
        alert(data.error);
    } else {
        openImageBrowser();
    }
});

socket.on('callback.edit', function (data) {
    bundleData = data.bundleData;
    canvas.clear();
    if (data.slideData.name != null) {
        slideName = data.slideData.name;
    }

    $("#duration").val(data.slideData.duration + "");

    if (data.slideData.displayTime !== null) {
        $("#override").checkbox('set checked');
        if (data.slideData.displayTime) {
            $("#displaytime").checkbox('set checked');
        } else {
            $("#displaytime").checkbox('set unchecked');
        }
    } else {
        $("#override").checkbox('set unchecked');
    }

    var transitionArray = [];
    var values = ["bars", "blinds", "blinds3d", "zip", "blocks", "blocks2", "concentric", "warp", "cube", "tiles3d", "tiles3dprev", "slide", "swipe", "dissolve"];

    transitionArray.push({name: "default", value: null});
    for (var i in values) {
        transitionArray.push({name: values[i], value: values[i]});
    }

    $('#transitions')
        .dropdown({
            direction: "downward",
            values: transitionArray,
            action: function (text, value) {
                $('#transitions').dropdown("hide");
                $('#transitions').dropdown("set selected", value);
                $('#currentTransition').text(text);

            }
        }).dropdown("set selected", data.slideData.transition);

    $('#currentTransition').text(data.slideData.transition || "default");


    if (data.bundleData.useWebFonts) {
        if (data.bundleData.styleHeader.fontFamily !== bundleData.styleHeader.fontFamily || data.bundleData.styleText.fontFamily !== bundleData.styleText.fontFamily) {
            WebFont.load({
                google: {
                    families: [data.bundleData.styleHeader.fontFamily, data.bundleData.styleText.fontFamily]
                },
                timeout: 2000,
                active: function () {
                    nextSlide(data, true);
                },
                inactive: function () {
                    nextSlide(data, true);
                }
            });
        } else {
            nextSlide(data, true);
        }
    } else {
        nextSlide(data, true);
    }

    setBackground(bundleData.background);
});

function setBackground(background) {
    background = "/background/" + bundleData.bundleName + "/" + background;

    var video = document.getElementById("bgvid2");
    var bg = $("#bg");
    var bgImage = document.getElementById("bgimg");
    if (background.indexOf(".mp4") !== -1) {
        if (parseUrl(video.src) !== background) {
            bg.hide();
            video.src = background;
            video.load();
            video.play();
            $(video).show();
        }
    } else {
        if (parseUrl(bgImage.src) !== background) {
            bgImage.src = background;
            bg.show();
            video.pause();
            video.removeAttribute("src");
            video.load();
            $(video).hide();
        }
    }
}

function parseUrl(url) {
    return '/background' + url.split('background')[1]
}

function nextSlide(data) {
    canvas.loadFromJSON(data.json, canvas.renderAll.bind(canvas), function (o, object) {

        if (object.type === "i-text") {

            if (object.id === "header") {
                object.setOptions(bundleData.styleHeader);
            } else {
                object.setOptions(bundleData.styleText);
            }
            object.setShadow({color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2});

            object.lockRotation = true;
            object.hasControls = false;
            object.lockUniScaling = true;
            object.hasRotatingPoint = false;
        }

        object.lockUniScaling = true;
    });
}


function copyObject() {
    // clone what are you copying since you
    // may want copy and paste on different moment.
    // and you do not want the changes happened
    // later to reflect on the copy.
    canvas.getActiveObject().clone(function (cloned) {
        _clipboard = cloned;
    });
}

function pasteObject() {
    if (_clipboard === null) return;
    // clone again, so you can do multiple copies.
    _clipboard.clone(function (clonedObj) {
        canvas.discardActiveObject();
        clonedObj.set({
            left: clonedObj.left + 10,
            top: clonedObj.top + 10,
            evented: true,
        });
        if (clonedObj.type === 'activeSelection') {
            // active selection needs a reference to the canvas.
            clonedObj.canvas = canvas;
            clonedObj.forEachObject(function (obj) {
                canvas.add(obj);
            });
            // this should solve the unselectability
            clonedObj.setCoords();
        } else {
            canvas.add(clonedObj);
        }
        _clipboard.top += 10;
        _clipboard.left += 10;
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    });
}

function addText(content, isHeader) {
    let text = new fabric.IText(content, {
        id: "normal",
    });

    let y = 0;
    var objects = canvas.getObjects('i-text');
    for (let i in objects) {
        if (objects[i].top > y) {
            y = objects[i].top + objects[i].height;
        }
    }

    if (y === 0) {
        y = 30;
    }

    if (isHeader) {
        text.id = "header";
        text.setOptions(bundleData.styleHeader);
        text.setOptions({top: y + 10, left: 150});
    } else {
        text.setOptions(bundleData.styleText);
        text.setOptions({top: y + 10, left: 250});
    }

    text.lockRotation = true;
    text.hasControls = false;
    text.lockUniScaling = true;
    text.hasRotatingPoint = false;

    text.setShadow({color: "#000", blur: 5, offsetX: 2, offsetY: 2});
    canvas.add(text);
}

function addImage(imageUrl, isFullSized) {

    fabric.Image.fromURL(imageUrl, function (bgImage) {

        var canvasAspect = canvas.width / canvas.height;
        var imgAspect = bgImage.width / bgImage.height;
        var left, top, scaleFactor;

        if (canvasAspect >= imgAspect) {
            scaleFactor = canvas.width / bgImage.width;
            left = 0;
            top = -((bgImage.height * scaleFactor) - canvas.height) / 2;
        } else {
            scaleFactor = canvas.height / bgImage.height;
            top = 0;
            left = -((bgImage.width * scaleFactor) - canvas.width) / 2;
        }

        if (isFullSized) {
            bgImage.set({
                top: top,
                left: left,
                originX: 'left',
                originY: 'top',
                scaleX: scaleFactor,
                scaleY: scaleFactor
            });
        } else {
            bgImage.set({
                scaleY: 0.5,
                scaleX: 0.5,
            });
        }

        bgImage.lockUniScaling = true;
        canvas.add(bgImage);
    });

    $("#imageLayer").modal("hide");

}

function addHeader(content) {
    addText(content, true);
}

function removeSelectedObjects() {
    let obj = canvas.getActiveObjects();
    for (var i in obj) {
        canvas.remove(obj[i]);
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();

}

function cueSlide() {
    if (displayId !== null) {
        if (confirm('Force display of the current slide?')) {
            var duration = null;
            if ($.isNumeric($("#duration").val())) {
                duration = parseFloat($("#duration").val());
            }

            let obj = {
                json: canvas.toJSON(['id']),
                png: canvas.toDataURL('png'),
                displayId: displayId,
                duration: duration
            };
            socket.emit("admin.override", obj);
        }
    } else {
        alert("Can't find display to announce");
    }
}


function save() {
    canvas.setBackgroundImage(null, null, null);
    if (slideName == "untitled") {
        var texts = canvas.getObjects('i-text');
        for (let i in texts) {
            if (texts[i].id == "header") {
                slideName = texts[i].text;
                break;
            }
        }
    }

    var duration = null;
    if ($.isNumeric($("#duration").val())) {
        duration = parseFloat($("#duration").val());
    }

    var checked = null;

    if ($("#override").checkbox('is checked')) {
        checked = false;
        if ($("#displaytime").checkbox('is checked')) {
            checked = true;
        }
    }


    var transition = $("#transitions").dropdown("get value");
    if (transition === "null") transition = "";


    var obj = {
        bundleName: bundle,
        name: slideName,
        fileName: file,
        duration: duration,
        json: canvas.toJSON(['id']),
        png: canvas.toDataURL('png'),
        displayTime: checked,
        transition: transition
    };

    socket.emit("edit.save", obj);
}

function saveAsFullScreenImage(name = "untitled", imageData) {
    canvas.clear();
    canvas.setBackgroundImage(null, null, null);

    fabric.Image.fromURL(imageData, function (bgImage) {

        var canvasAspect = canvas.width / canvas.height;
        var imgAspect = bgImage.width / bgImage.height;
        var left, top, scaleFactor;

        if (canvasAspect >= imgAspect) {
            scaleFactor = canvas.width / bgImage.width;
            left = 0;
            top = -((bgImage.height * scaleFactor) - canvas.height) / 2;
        } else {
            scaleFactor = canvas.height / bgImage.height;
            top = 0;
            left = -((bgImage.width * scaleFactor) - canvas.width) / 2;
        }

        bgImage.set({
            top: top,
            left: left,
            originX: 'left',
            originY: 'top',
            scaleX: scaleFactor,
            scaleY: scaleFactor
        });

        canvas.add(bgImage);
        canvas.renderAll();

        var duration = null;
        if ($.isNumeric($("#duration").val())) {
            duration = parseFloat($("#duration").val());
        }

        var checked = null;

        if ($("#override").checkbox('is checked')) {
            checked = $("#displaytime").checkbox('is checked');
        }


        var transition = $("#transitions").dropdown("get value");
        if (transition === "null") transition = null;

        var dataurl = canvas.toDataURL('png');

        var json =
            {
                version: "2.6.0",
                objects: [{
                    type: "image",
                    version: "2.6.0",
                    width: 1280,
                    height: 720,
                    crossOrigin: "",
                    src: dataurl,
                    filters: []
                }]
            };

        var obj = {
            bundleName: bundle,
            name: name,
            fileName: file,
            duration: duration,
            json: json,
            png: dataurl,
            displayTime: checked,
            transition: transition,
        };

        socket.emit("edit.save", obj);
    });
}


function deleteImage(name) {
    if (confirm("Really delete image?")) {
        socket.emit("edit.deleteImage", {
            bundleName: bundle,
            name: name,
        });
    }
}


function openImageBrowser() {
    $("#imageList").load("/admin/ajax/imagelist?bundle=" + bundle + "&nocache=" + uuidv4(), null, function () {
        addImagesFromUploadQueue();
        $('#imageLayer').modal('show');
    });
}

/** Generate an uuid
 * @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

