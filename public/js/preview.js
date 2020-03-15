/** fabric **/
var canvas;
var displayId = 0;
var slide = {};
/** bundleData
 * @see data/default/bundle.json
 *
 **/
var bundleData;
bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};
/** displayGroup
 * contains displayed slide items
 */
var displayGroup;
displayGroup = [];

var background = "";

var serverOptions = {};

/** background image **/
var bgImage;

/***************************
 *  window load, init
 * **************************/
$(function () {
    canvas = new fabric.StaticCanvas('c');
    canvas.backgroundColor = null;
    canvas.backgroundImage = null;
    canvas.renderAll();
    var ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.translate(0.5, 0.5);
    }
    fixCanvas();

});

$(window).bind("resize", function () {
    fixCanvas();
});

// socketio callbacks

/** when connected **/
socket.on('connect', function () {
    socket.emit("sync.preview", socketId);
});

/** callback Load **/
socket.on('callback.preview', function (data) {
    canvas.clear();
    displayId = data.displayId;
    slide = data.slide;
    bundleData = data.bundleData;
    serverOptions = data.serverOptions;

    if (slide.type === "slide") {
        if (data.bundleData.useWebFonts) {
            if (bundleData.styleHeader.fontFamily != data.bundleData.styleHeader.fontFamily || bundleData.styleText.fontFamily != data.bundleData.styleText.fontFamily) {
                WebFont.load({
                    google: {
                        families: [data.bundleData.styleHeader.fontFamily, data.bundleData.styleText.fontFamily]
                    },
                    timeout: 2000,
                    active: function () {

                        nextSlide(data);
                    },
                    inactive: function () {

                        nextSlide(data);
                    }
                });
            } else {
                nextSlide(data);
            }
        } else {
            nextSlide(data);
        }
    }

    displayGroup = new fabric.Group();
    setBackground();
});


function setBackground() {
    background = "/background/" + bundleData.background;

    var video = document.getElementById("bgvid");
    var bg = $("#bg");
    var bgImage = document.getElementById("bgimg");
    if (slide.type === "webpage") {
        bg.show();
        $(video).hide();
        bgImage.src = "/img/nopreview.png";
    } else {
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
                bgImage.src = background;
                bg.show();
                video.pause();
                video.removeAttribute("src");
                video.load();
                $(video).hide();
            }
        }
    }
}

function parseUrl(url) {
    return '/background' + url.split('background')[1]
}

/** resize canvas to max width keeping aspect ratio 16:9**/
function fixCanvas() {
    var con = $(window),
        aspect = (0.9 / 1.6),
        width = con.innerWidth(),
        height = Math.floor(width * aspect);

    canvas.setWidth(1280).setHeight(720);
    $("#c").css("width", width + "px").css("height", height + "px");
    canvas.calcOffset();
}


function nextSlide(data, updateOptions) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;


    setBackground(data.bundleData.background);

    canvas.loadFromJSON(data.json, function () {
        canvas.renderAll();
    }, function (obj, object) {

        if (object.type === "i-text") {

            var fill = object.get("fill");
            var fontSize = object.get("fontSize");

            if (object.id === "header") {
                object.setOptions(bundleData.styleHeader);
                if (bundleData.styleHeader.fontSize !== fontSize) {
                    object.setOptions({fontSize: fontSize});
                }
                if (bundleData.styleHeader.fill !== "") {
                    object.setShadow({color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2});
                }
            } else {
                object.setOptions(bundleData.styleText);
                if (bundleData.styleText.fontSize !== fontSize) {
                    object.setOptions({fontSize: fontSize});
                }
                if (bundleData.styleText.fill !== "") {
                    object.setShadow({color: "rgba(0,0,0,0.6)", blur: 5, offsetX: 2, offsetY: 2});
                }
            }

            if (fill != null) {
                object.setOptions({fill: fill});
            }

            object.lockRotation = true;
            object.hasControls = false;
            object.lockUniScaling = true;
            object.hasRotatingPoint = false;
        }

    });
}