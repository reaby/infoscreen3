function symmetricDifference(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    for (i = 0; i < a2.length; i++) {
        if (a1.indexOf(a2[i]) === -1) {
            result.push(a2[i]);
        }
    }
    return result;
}

var connectionTimeoutId;

$(function () {
    if (!flux.browser.supportsTransitions)
        alert("Flux Slider requires a browser that supports CSS3 transitions");

    window.f = new flux.slider('#slider', {
        controls: false,
        captions: false,
        autoplay: false,
        pagination: false,
        width: $(window).width(),
        height: $(window).height(),
    });

    $(window).resize(function () {
        if (this.resizeTO) clearTimeout(this.resizeTO);
        this.resizeTO = setTimeout(function () {
            $(this).trigger('windowResize');
        }, 250);
    });

    $(window).on('windowResize', function () {
        window.f.setSize($(window).width(), $(window).height());
    });

    updateTimeout();
});

var layer = 0;

/** bundleData
 * @see data/default/bundle.json
 *
 **/
var bundleData;
var serverOptions;
var streamStarted = false;
bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};

/***************************
 *  window load, init
 * **************************/

$(function () {
    fixImageSizes();
    displayTime();
    setInterval(displayTime, 1000);
});

$(window).bind("resize", function () {
    fixImageSizes();
});


function getLayer(offset) {
    if (offset === undefined) offset = 0;
    return "layer" + (layer + offset) % 2;
}


// socketio callbacks
/** when connected **/
socket.on('connect', function () {
    socket.emit("sync");
});

socket.on('callback.blackout', function (data) {
    serverOptions = data.serverOptions;
    checkBlackout();
});

socket.on('error', function () {
    $("#networkstatus").css("opacity", 1);
});

socket.on('disconnect', function () {
    $("#networkstatus").css("opacity", 1);
});

socket.on('pong', function () {
    updateTimeout();
});

socket.on('callback.time', function (data) {
    toggleTime();
});

/** callback Load **/
socket.on('callbackLoad', function (data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    preloadImages(data.slides);
    checkBlackout();
    setBackground(data.bundleData.background);
    if (checkStream(serverOptions) === false) {
        nextSlide(data);
    }
});


/** callback Update **/
socket.on('callback.update', function (data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    checkBlackout();
    if (checkStream(serverOptions) === false) {
        nextSlide(data);
    }
});

socket.on('callback.reload', function () {
    location.reload(true);
});

socket.on('callback.reloadImage', function (data) {
    reloadImage(data);
});

socket.on('callback.announce', function (data) {
    checkBlackout();
    nextSlide(data);
});

socket.on('callback.forceSlide', function (data) {
    checkBlackout();
    nextSlide(data);
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
    $('#time').html(time);
}

/** resize canvas to max width keeping aspect ratio 16:9**/
function fixImageSizes() {
    var con = $(window),
        aspect = (0.9 / 1.6),
        width = con.innerWidth(),
        height = Math.floor(width * aspect);
}

function toggleTime(bool = null) {
    if (bool === null) {
        if ($('#time').hasClass('flipOutX')) {
            toggleTime(true);
            return;
        } else {
            toggleTime(false);
            return;
        }
    }
    if (bool) {
        $('#time').removeClass('flipOutX').addClass("flipInX");
    } else {
        $('#time').addClass('flipOutX').removeClass("flipInX");
    }
}

function checkBlackout() {
    updateTimeout();
    if (serverOptions.blackout) {
        $("#blackoutLayer").css("opacity", 1);
    } else {
        $("#blackoutLayer").css("opacity", 0);
    }
}

function nextSlide(data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    checkImages(data.slides);

    if (serverOptions.currentMeta.displayTime !== null) {
        toggleTime(serverOptions.currentMeta.displayTime);
    } else {
        toggleTime(serverOptions.diplayTime);
    }

    if (serverOptions.isAnnounce) {
        $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
        $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");

        try {
            var randomId = uuidv4();
            var image = new Image();
            image.src = "/tmp/" + serverOptions.displayId + "/?randomId=" + randomId;
            image.id = randomId;
            image.class = "temp";
            window.f.images.push(image);
            window.f.showTempImage(randomId);
        } catch (err) {
            console.log(err);
        }
    } else {

        switch (serverOptions.currentMeta.type) {
            case "webpage":
                $("#slider").hide();
                $("#" + getWebLayer()).css("transform", "scale(" + serverOptions.currentMeta.zoom + ")");
                $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");

                displayWebPage(serverOptions.currentMeta.webUrl);
                break;
            default:
                var transition = serverOptions.transition;
                if (serverOptions.currentMeta.transition !== null ) {
                    transition = serverOptions.currentMeta.transition;
                }

                $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
                $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
                $("#slider").show();
                window.f.showImageById(serverOptions.currentFile, transition);
                break;
        }
    }

    setBackground(bundleData.background);
}

function setBackground(background) {
    background = "/background/" + bundleData.bundleName + "/" + background;
    if (serverOptions.isStreaming) return;

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
            video.src = null;
            video.pause();
        }
    }
}

function parseUrl(url) {
    return '/background' + url.split('background')[1]
}

function showBackgroundOnly() {
    $("#" + getLayer(1)).css("opacity", 0);
    $("#" + getLayer()).css("opacity", 0);
}

function checkStream(serverOptions) {

    if (serverOptions.isStreaming && streamStarted === false) {
        console.log("start stream!");
        if (flvjs.isSupported()) {
            var videoElement = document.getElementById('bgvid');
            flvPlayer = flvjs.createPlayer({
                type: 'flv',
                url: serverOptions.streamSource
            });
            try {
                flvPlayer.attachMediaElement(videoElement);
                flvPlayer.load();
                flvPlayer.play();
                showBackgroundOnly();
                streamStarted = true;
                return true;

            } catch (err) {
                console.log(err);
                streamStarted = false;
                return false;
            }
        }
    } else if (serverOptions.isStreaming === false) {
        if (typeof flvPlayer !== "undefined") {
            if (flvPlayer != null) {
                flvPlayer.pause();
                flvPlayer.unload();
                flvPlayer.detachMediaElement();
                flvPlayer.destroy();
                flvPlayer = null;
                streamStarted = false;
            }
        }
        return false;
    }
    return false;
}

/**
 * preload images
 * @param allSlides
 */
function preloadImages(allSlides) {
    window.f.clearImages();
    console.log(allSlides);

    for (var i in allSlides) {
        try {
            if (allSlides[i].type === "slide") {
                var image = new Image();
                image.src = "/render/" + serverOptions.currentBundle + "/" + allSlides[i].uuid + ".png";
                image.id = allSlides[i].uuid;
                window.f.images.push(image);
            }
        } catch (err) {
            console.log(err);
        }
    }
    window.f.setupImages();
}

function reloadImage(data) {
    console.log("reloadImage");
    console.log(data);

    window.f.clearImageById(data.uuid);
    window.f.setupImages();

    var image = new Image();
    image.src = "/render/" + data.bundle + "/" + data.uuid + ".png?" + uuidv4();
    image.id = data.uuid;
    window.f.images.push(image);

}

var fluxIds;
var allIds;

function checkImages(allSlides) {
    fluxIds = [];
    allIds = [];

    var fImages = window.f.images;
    for (var j in fImages) {
        fluxIds.push(fImages[j].id);
    }
    for (var k in allSlides) {
        if (allSlides[k].type == "slide") {
            allIds.push(allSlides[k].uuid);
        }
    }

    // new slides count is less than slides in rotation
    // remove slides
    if (allIds.length < fluxIds.length) {
        console.log("less");
        var diffIds = symmetricDifference(fluxIds, allIds);
        for (var l in diffIds) {
            window.f.clearImageById(diffIds[l]);
        }
    } else
    // else count is greater, so add slides
    {
        for (var i in allIds) {
            try {
                if (fluxIds.indexOf(allIds[i]) < 0) {
                    console.log("adding", "/render/" + serverOptions.currentBundle + "/" + allIds[i] + ".png");
                    var image = new Image();
                    image.src = "/render/" + serverOptions.currentBundle + "/" + allIds[i] + ".png";
                    image.id = allIds[i];
                    window.f.images.push(image);
                }
            } catch (err) {
                console.log(err);
            }
        }
    }


}

/** Generate an uuid
 * @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function updateTimeout() {
    clearTimeout(connectionTimeoutId);
    $("#networkstatus").css("opacity", 0);
    connectionTimeoutId = setTimeout(function () {
        $("#networkstatus").css("opacity", 1);
    }, 30000)
}


function displayWebPage(url) {
    var ifr = document.getElementById(getWebLayer());
    ifr.contentWindow.location.href = url;
    $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");

    layer++;
    if (layer > 1) {
        layer = 0;
    }
}

function getWebLayer(offset) {
    if (offset === undefined) offset = 0;
    return "webLayer" + (layer + offset) % 2;
}


