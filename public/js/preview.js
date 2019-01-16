/** fabric **/
var canvas;
var displayId = 0;

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

    /* $(document).mouseenter(function () {
         $('.ui.basic.modal')
             .modal('show')
         ;
     });

     $(document).mouseleave(function () {
         $('.ui.basic.modal')
             .modal('hide')
         ;
     });
 */

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

    bundleData = data.bundleData;
    serverOptions = data.serverOptions;

    displayGroup = new fabric.Group();

    setBackground(bundleData.background);
});


function setBackground(background) {
    background = "/background/" + bundleData.bundleName + "/" + background;

    var video = document.getElementById("bgvid");
    var bg = $("#bg");
    var bgImage = document.getElementById("bgimg");
    if (background.indexOf(".mp4") !== -1) {
        if (parseUrl(video.src) !== background) {
            bg.hide();
            $(video).show();
            video.src = background;
            video.play();
        }
    } else {
        if (parseUrl(bgImage.src) !== background) {
            bgImage.src = background;
            bg.show();
            $(video).hide();
            video.pause();
            video.src = "";
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

function override() {
    var obj = canvas.toJSON(['id']);
    var video = document.getElementById("bgvid");
    var bg = "";
    if (video.src.indexOf(".mp4") !== -1) {
        bg = video.src;
    } else {
        bg = video.poster;
    }

    socket.emit("admin.override", {json: obj, displayId: displayId, background: bg});
}


function nextSlide(data, updateOptions) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;


    setBackground(data.bundleData.background);

    canvas.loadFromJSON(data.json, function () {

    }, function (o, object) {
        object.set(data.bundleData.styleText);
        if (object.id === "header") {
            object.set(data.bundleData.styleHeader);
        }

        object.setShadow({color: "#000", blur: 3, offsetX: 0, offsetY: 0});

    });
}