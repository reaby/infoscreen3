let canvas;
let bundleData;
let slideData;

const grid = 1920 / 32;

let _clipboard = null;
let slideName = "untitled";
let undoData = [];
let undoActive = false;
let templates = {};
let guardRails = []


bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};

$(function () {
    canvas = new fabric.Canvas('edit');
    canvas.includeDefaultValues = false;
    canvas.preserveObjectStacking = true;
    canvas.antialias = true;

    canvas.on('object:moving', function (options) {
        if (Math.round(options.target.left / grid * 4) % 4 === 0) {
            options.target.set({
                left: Math.round(options.target.left / grid) * grid,
            }).setCoords();
        }

        if (Math.round(options.target.top / grid * 4) % 4 === 0) {
            options.target.set({ top: Math.round(options.target.top / grid) * grid }).setCoords();
        }
    });

    canvas.on("object:added", function () {
        if (undoActive) {
            saveState();
        }
    });


    canvas.on("object:modified", function () {
        if (undoActive) {
            saveState();
        }
    });

    $('html').keyup(function (e) {
        if (e.keyCode === 46) {
            const obj = canvas.getActiveObject();
            if (!obj.isEditing) {
                removeSelectedObjects();
            }
        }
    });

    $('html').keydown(function (e) {
        const obj = canvas.getActiveObject();
        if (obj == null) return;
        if (obj.isEditing) return;
        let mult = grid * 0.2;
        if (e.ctrlKey) mult = grid * 1;

        // left
        if (e.keyCode == 37) {
            e.preventDefault();
            obj.set({
                left: Math.round(obj.left - mult),
            }).setCoords();
            canvas.renderAll();
        }
        // right
        if (e.keyCode == 39) {
            e.preventDefault();
            obj.set({
                left: Math.round(obj.left + mult),
            }).setCoords();
            canvas.renderAll();
        }
        // down
        if (e.keyCode == 40) {
            e.preventDefault();
            obj.set({
                top: Math.round(obj.top + mult),
            }).setCoords();
            canvas.renderAll();
        }

        // up
        if (e.keyCode == 38) {
            e.preventDefault();
            obj.set({
                top: Math.round(obj.top - mult),
            }).setCoords();
            canvas.renderAll();
        }
    });

    $('#dropdownSave').dropdown();
    $('#dropdownAnnounce').dropdown();

    $('#order')
        .dropdown({
            action: 'hide',
            onChange: function (value, text, selectedItem) {
                setZindex(value);
            }
        });

    $('#contextmenu .dropdown').dropdown({
        on: 'hover',
    });

    $("#displaytime").checkbox();
    $('#colorPicker')
        .popup({
            inline: true,
            hoverable: true,
            position: 'bottom center',
            delay: {
                show: 50,
                hide: 800
            }
        });


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

function saveState() {
    if (undoData.length >= 15) {
        undoData.shift();
    }
    undoData.push(canvas.toJSON(['id', 'fontSize']));
}

function undo() {
    let json = {};
    if (undoData.length > 1) {
        undoData.pop();
        json = undoData[undoData.length - 1];
    }

    if (undoData.length == 1) {
        json = undoData[undoData.length - 1];
    }

    undoActive = false;
    canvas.loadFromJSON(json, function () {
        canvas.requestRenderAll();
        undoActive = true;
    }, function (obj, object) {
        if (object.type == "line") {
            object.selectable = false
        }

        if (object.type === "i-text") {

            var fill = object.get("fill");
            var fontSize = object.get("fontSize");

            if (object.id === "header") {
                object.setOptions(bundleData.styleHeader);
                if (bundleData.styleHeader.fontSize !== fontSize) {
                    object.setOptions({ fontSize: fontSize });
                }
                if (bundleData.styleText['stroke-width'] != 0) {
                    object.setShadow({ color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2 });
                }
            } else {
                object.setOptions(bundleData.styleText);
                if (bundleData.styleText.fontSize !== fontSize) {
                    object.setOptions({ fontSize: fontSize });
                }
                if (bundleData.styleText['stroke-width'] != 0) {
                    object.setShadow({ color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2 });
                }
            }

            if (fill != null) {
                object.setOptions({ fill: fill });
            }

            object.lockRotation = true;
            object.hasControls = false;
            object.lockUniScaling = true;
            object.hasRotatingPoint = false;
        }
        object.lockUniScaling = true;

    });
}


/**
 * Displays the local time for bottom of screen
 * hh:mm
 **/
function displayTime() {
    let date = new Date();
    let min = date.getMinutes();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    if (min < 10) min = "0" + min;
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    $('#time2').html(date.getHours() + ":" + min + "<div style='font-size: 3vh;'>" + date.getFullYear() + "-" + month + "-" + day + "</div>");
    checkTimeDisplay();
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

var canvasWidth = document.getElementById('edit').width,
    canvasHeight = document.getElementById('edit').height;
var edgedetection = 20;

socket.on('connect', function () {
    socket.emit('admin.editSlide', { bundleName: bundle, fileName: file });
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
    guardRails = data.guardRails;
    slideData = data.slideData;
    templates = data.templates;
    canvas.clear();

    if (data.slideData.name != null) {
        slideName = data.slideData.name;
        $("#slideName").val(slideName);
    }

    let templateText = `
    <div class="item" data-value="empty" data-text="Empty">
        <div class="content">
            <div class="text">Empty</div>
        </div>
    </div>
    `;

    for (let i in templates) {
        templateText += `
        <div class="item" data-value="${i}" data-text="${i}">
            <div class="right floated content">
            <i class="black close icon" onclick="removeTemplate('${i}')"></i>
            </div>
            <div class="content">
                <div class="text">${i}</div>
            </div>
        </div>
        `;
    }

    $('#templates .menu').html(templateText);


    $('#templates').dropdown({
        action: function (text, value) {
            $('#templates').dropdown("hide");
            if (value === "empty") {
                nextSlide({});
            }
            else {
                nextSlide(templates[value]);
            }
        }
    });

    $("#duration").val(data.slideData.duration || "");

    if (slideData.epochStart && slideData.epochStart != -1) {
        let d = new Date(slideData.epochStart);
        let isoStr = (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1);
        $("#enableStart").val(isoStr);
    }

    if (slideData.epochStart && slideData.epochEnd != -1) {
        let d = new Date(slideData.epochEnd);
        let isoStr = (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1);
        $("#enableEnd").val(isoStr);
    }

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
    //var values = ["bars", "blinds", "blinds3d", "zip", "blocks", "blocks2", "concentric", "warp", "cube", "tiles3d", "tiles3dprev", "slide", "swipe", "dissolve"];
    transitionArray.push({ name: "default", value: null });
    for (var i in SupportedTransitions) {
        transitionArray.push({ name: SupportedTransitions[i], value: SupportedTransitions[i] });
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
        WebFont.load({
            google: {
                families: [
                    `${data.bundleData.styleHeader.fontFamily}:${data.bundleData.styleHeader.fontWeight}`,
                    `${data.bundleData.styleText.fontFamily}:${data.bundleData.styleText.fontWeight}`
                ]
            },
            timeout: 2000,
            active: function () {
                nextSlide(data.json);
            },
            inactive: function () {
                nextSlide(data.json);
            }
        });
    } else {
        nextSlide(data.json);
    }
    checkTimeDisplay();
    setBackground(bundleData.background);
});

function setBackground(background) {
    background = "/background/" + background;

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
            try {
                video.load();
            } catch (err) {
                console.log(err);
            }
            $(video).hide();
        }
    }
}

function setStyle(object, styleName, value) {
    var style = {};
    style[styleName] = value;

    if (object.setSelectionStyles && object.isEditing) {
        object.setSelectionStyles(style);
    } else {
        object.setOptions({ styles: {} });
        object.setOptions(style);
    }
}

function getStyle(object, styleName) {
    if (object.getSelectionStyles && object.isEditing) {
        if (object.getSelectionStyles()[styleName]) {
            return object.getSelectionStyles()[styleName];
        }
        return object[styleName];
    } else {
        return object[styleName];
    }
}

function parseUrl(url) {
    return '/background' + url.split('background')[1]
}

function drawGrid() {
    var w = 1920 / 32 / 8;

    // Grid display part
    for (var i = 1; i <= (1920 / grid); i++) {
        canvas.add(new fabric.Line([i * grid, 0, i * grid, 1920], {
            stroke: '#ccc',
            strokeDashArray: [w, w],
            strokeWidth: 2,
            opacity: 0.5,
            selectable: false,
            zIndex: -1
        }));
        canvas.add(new fabric.Line([0, i * grid, 1920, i * grid], {
            stroke: '#ccc',
            strokeDashArray: [w, w],
            strokeWidth: 2,
            opacity: 0.5,
            selectable: false,
            zIndex: -1
        }));
    }

    // Add configured guardrails for the grid to assist on other resoltions
    guardRails.forEach((guardRail) => {
        canvas.add(new fabric.Line(guardRail.line, {
            stroke: guardRail.stroke || '#ccc',
            strokeDashArray: [w, w],
            strokeWidth: guardRail.strokeWidth || 4,
            opacity: guardRail.opacity || 0.5,
            selectable: false,
            zIndex: -1
        }));
    })
    canvas.renderAll();
}

function checkTimeDisplay() {
    if ($("#override").checkbox('is checked')) {
        if ($("#displaytime").checkbox('is checked')) {
            $('#time2').removeClass('flipOutX').addClass("flipInX");
        } else {
            $('#time2').addClass('flipOutX').removeClass("flipInX");
        }
    } else {
        if (bundleData.displayTime) {
            $('#time2').removeClass('flipOutX').addClass("flipInX");
        } else {
            $('#time2').addClass('flipOutX').removeClass("flipInX");
        }
    }
}

function nextSlide(jsonData) {
    undoActive = false;
    canvas.loadFromJSON(jsonData, function () {
        drawGrid();
        undoActive = true;
        saveState();
        canvas.renderAll();
    }, function (obj, object) {

        if (object.type === "i-text") {

            var fill = object.get("fill");
            var fontSize = object.get("fontSize");

            if (object.id === "header") {
                object.setOptions(bundleData.styleHeader);
                if (bundleData.styleHeader.fontSize !== fontSize) {
                    object.setOptions({ fontSize: fontSize });
                }
                if (bundleData.styleHeader.strokeWidth == 0) {
                    object.setShadow({ color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2 });
                }
            } else {
                object.setOptions(bundleData.styleText);
                if (bundleData.styleText.fontSize !== fontSize) {
                    object.setOptions({ fontSize: fontSize });
                }
                if (bundleData.styleText.strokeWidth == 0) {
                    object.setShadow({ color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2 });
                }
            }

            if (fill != null) {
                object.setOptions({ fill: fill });
            }

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
        text.setOptions({ top: y + 10, left: 150 });
        if (bundleData.styleHeader.strokeWidth == 0) {
            text.setShadow({ color: "#000", blur: 5, offsetX: 2, offsetY: 2 });
        }
    } else {
        text.setOptions(bundleData.styleText);
        text.setOptions({ top: y + 10, left: 250 });
        if (bundleData.styleText.strokeWidth == 0) {
            text.setShadow({ color: "#000", blur: 5, offsetX: 2, offsetY: 2 });
        }
    }

    text.lockRotation = true;
    text.hasControls = false;
    text.lockUniScaling = true;
    text.hasRotatingPoint = false;

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
    canvas.discardActiveObject(null);
    canvas.requestRenderAll();

}

function cueSlide(id) {
    if (id === null) {
        var bool = confirm('You are about to display the current slide for ALL DISPLAYS, are you sure?')
        if (bool === false) {
            return;
        }
    }

    if (confirm('Force display of the current slide?')) {
        var duration = null;
        if ($.isNumeric($("#duration").val())) {
            duration = parseFloat($("#duration").val());
        }
        var transition = $("#transitions").dropdown("get value");
        if (transition === "null") transition = "";

        var objects = canvas.getObjects('line');
        for (let i in objects) {
            canvas.remove(objects[i]);
        }

        let obj = {
            json: { type: "image" },
            png: canvas.toDataURL('png'),
            displayId: id,
            duration: duration,
            transition: transition,
        };

        socket.emit("admin.override", obj);

        drawGrid();
    }
}

function removeTemplate(value) {
    if (confirm("Are you sure you wish to remove this template?")) {
        socket.emit("edit.removeTemplate", {
            name: value,
        });
    }
}

function saveTemplate() {
    canvas.setBackgroundImage(null, null, null);
    var objects = canvas.getObjects('line');
    for (let i in objects) {
        canvas.remove(objects[i]);
    }

    let name = $("#slideName").val();
    if (name === "untitled") {
        var texts = canvas.getObjects('i-text');
        for (let i in texts) {
            if (texts[i].id == "header") {
                name = texts[i].text;
                break;
            }
        }
    }

    socket.emit("edit.saveTemplate", {
        name: name,
        json: canvas.toJSON(['id', 'fontSize'])
    });
    drawGrid();
    alert("Template saved.");

}

function save() {
    canvas.setBackgroundImage(null, null, null);
    var objects = canvas.getObjects('line');
    for (let i in objects) {
        canvas.remove(objects[i]);
    }

    slideName = $("#slideName").val();
    if (slideName === "untitled") {
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

    let epochStart = Date.parse($("#enableStart").val()) || -1;
    let epochEnd = Date.parse($("#enableEnd").val()) || -1;

    var obj = {
        bundleName: bundle,
        name: slideName,
        fileName: file,
        duration: duration,
        json: canvas.toJSON(['id', 'fontSize']),
        png: canvas.toDataURL('image/png', 1.0),
        displayTime: checked,
        transition: transition,
        epochStart: epochStart,
        epochEnd: epochEnd
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
                width: 1920,
                height: 1080,
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

function changeColor(elem) {
    var obj = canvas.getActiveObject();
    // console.log(window.getComputedStyle(elem).backgroundColor);
    setStyle(obj, "fill", window.getComputedStyle(elem).backgroundColor);
    canvas.renderAll();
}

function setCenter(direction) {
    switch (direction) {
        case "h":
            canvas.getActiveObject().viewportCenterH();
            break;
        case "v":
            canvas.getActiveObject().viewportCenterV();
            break;
    }
}

function alignObject(direction) {
    let objects = canvas.getActiveObjects();
    let active = canvas.getActiveObject();
    let first = true;
    for (var obj of objects) {
        if (first) {
            first = false;
            active = obj;
        }
        switch (direction) {
            case "top":
                if (obj.top < active.top) active = obj;
                break;
            case "bottom":
                if ((obj.top + obj.height) > (active.top + active.height)) active = obj;
                break;
            case "left": {
                if (obj.left < active.left) active = obj;
                break;
            }
            case "right": {
                if ((obj.left + obj.width) > (active.left + active.width)) active = obj;
                break;
            }
        }
    }

    for (var obj of objects) {
        if (direction == "top") {
            obj.set(
                {
                    top: parseFloat(active.top)
                });
        }
        if (direction == "bottom") {
            obj.set(
                {
                    top: parseFloat(active.top + active.height - obj.height)
                });
        }
        if (direction == "left") {
            obj.set(
                {
                    left: parseFloat(active.left)

                });
        }
        if (direction == "right") {
            obj.set(
                {
                    left: parseFloat(active.left + active.width - obj.width)

                });
        }
        obj.setCoords();
    }

    canvas.discardActiveObject(null);
    canvas.requestRenderAll();
}


function fontSize(direction) {
    for (var obj of canvas.getActiveObjects()) {
        var sizes = [20, 28, 32, 36, 40, 44, 48, 50, 54, 58, 64, 72, 96, 108, 116, 120, 128, 132, 140, 144, 148];
        if (obj.type === "i-text") {
            var idx = closest(sizes, getStyle(obj, "fontSize"));

            if ((idx + direction) < sizes.length && (idx + direction) > 0) {
                setStyle(obj, "fontSize", sizes[idx + direction]);
            }
        }
    }
    canvas.requestRenderAll();
}

function closest(list, x) {
    var min,
        chosen = 0;
    for (var i in list) {
        min = Math.abs(list[chosen] - x);
        if (Math.abs(list[i] - x) < min) {
            chosen = i;
        }
    }
    return parseInt(chosen);
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
