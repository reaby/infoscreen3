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

window.f = new flux.slider('#slider', {
    controls: false,
    captions: false,
    autoplay: false,
    pagination: false,
    width: $(window).width(),
    height: $(window).height(),
});

$(function () {
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
var flvPlayer;
var doNext = false;
/** bundleData
 * @see data/default/bundle.json
 *
 **/
var bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};
var serverOptions = {};
var streamStarted = false;


/***************************
 *  window load, init
 * **************************/

$(function () {
    fixImageSizes();
    displayTime();
    setInterval(displayTime, 1000);
    $('#blackoutLayer').dblclick(toggleFullScreen);
});

$(window).bind("resize", function () {
    fixImageSizes();
});

if (isPreview === 0) {
    document.addEventListener("keydown", function (e) {
        if (e.keyCode == 13) {
            toggleFullScreen();
        }
    }, false);
}

function toggleFullScreen() {
    if (isPreview === 0) {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}



function getLayer(offset) {
    if (offset === undefined) offset = 0;
    return "layer" + (layer + offset) % 2;
}

// socketio callbacks
/** when connected **/
socket.on('connect', function () {
    socket.emit("sync");
    doNext = true;
    $("#networkstatus").css("opacity", 0);
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
    serverOptions.displayTime = data;
    checkTimeDisplay();
});

/** callback Load **/
socket.on('callback.load', function (data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    preloadImages(data);
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

socket.on('callback.updateUI', function (data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    updateStatusMessage();
});

socket.on('callback.removeSlide', function (data) {
    window.f.clearImageById(data.uuid);
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
    let date = new Date();
    let min = date.getMinutes();
    let month = date.getMonth()+1;
    let day = date.getDate();
    if (min < 10) min = "0" + min;
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    $('#time').html(date.getHours() + ":" + min + "<div style='font-size: 3vh;'>"+date.toLocaleDateString() + "</div>");
}

/** resize canvas to max width keeping aspect ratio 16:9**/
function fixImageSizes() {
    var con = $(window),
        aspect = (0.9 / 1.6),
        width = con.innerWidth(),
        height = Math.floor(width * aspect);
}

function checkTimeDisplay() {
    var bool = serverOptions.displayTime;

    if (serverOptions.currentMeta.displayTime !== null) {
        bool = serverOptions.currentMeta.displayTime;
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

function updateStatusMessage() {
    if (serverOptions.statusMessage !== "") {
        //only update on a real change
        let msg = serverOptions.statusMessage;
        if (serverOptions.statusMessageScrolling) {
            const dur = serverOptions.statusMessageScrollingDuration || 15
            msg = '<div id="statusMessageScrolling" style="animation-duration: ' + dur + 's">' + msg + '</div>'
        }
        if ($('#statusMessage').html() !== msg) {
            $('#statusMessageOuter').fadeIn();
            $('#statusMessage').html(msg);
        }
    } else {
        $('#statusMessageOuter').fadeOut();
        $('#statusMessage').text("");
    }
}
function displayVideo(url, loop, mute) {
    if (serverOptions.isStreaming) return;
    $("#stream").show();
    let video = document.getElementById("stream");
    video.src = url;
    video.loop = loop;
    video.volume = mute ? 0.0 : 1.0;
    video.load();
    video.play();
}

function nextSlide(data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    checkTimeDisplay();
    updateStatusMessage();
    $("#helperLayer").removeClass("announce");

    if (serverOptions.isAnnounce) {

        if (serverOptions.announceMeta.type === "webPage") {
            $("#slider").hide();
            $("#" + getWebLayer()).css("transform", "scale(" + serverOptions.announceMeta.zoom + ")");
            $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");
            if (serverOptions.announceMeta.displayTime) {
                $('#time').removeClass('flipOutX').addClass("flipInX");
            } else {
                $('#time').addClass('flipOutX').removeClass("flipInX");
            }
            displayWebPage(serverOptions.announceMeta.webUrl);
        }

        if (serverOptions.announceMeta.type === "video") {
            if (serverOptions.announceMeta.displayTime) {
                $('#time').removeClass('flipOutX').addClass("flipInX");
            } else {
                $('#time').addClass('flipOutX').removeClass("flipInX");
            }
            displayVideo(serverOptions.announceMeta.url, serverOptions.announceMeta.loop, serverOptions.announceMeta.mute);
        }

        if (serverOptions.announceMeta.type === "image") {
            $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
            $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
            setTimeout(function () {
                clearIFrame(getWebLayer());
                clearIFrame(getWebLayer(1));
            }, 2500);
            try {
                var randomId = uuidv4();
                getDataUri("/tmp/" + serverOptions.displayId + "/?randomId=" + randomId, randomId, function (imageId, dataUrl, image) {
                    image.id = imageId;
                    image.class = "temp";
                    window.f.images.push(image);
                    window.f.imageData.push(dataUrl);
                    $("#slider").show();
                    $("#helperLayer").addClass("announce");
                    window.f.showTempImage(imageId);
                });
            } catch (err) {
                console.log(err);
            }
        }
    } else {
        let video = document.getElementById("stream");
        
        switch (serverOptions.currentMeta.type) {
            case "webpage":
                $("#slider").hide();            
                video.pause();
                $("#stream").hide();
                $("#" + getWebLayer()).css("transform", "scale(" + serverOptions.currentMeta.zoom + ")");
                $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");
                displayWebPage(serverOptions.currentMeta.webUrl);
                break;
            case "video":
                displayVideo(serverOptions.currentMeta.url, serverOptions.currentMeta.loop, serverOptions.currentMeta.mute);
                setTimeout(function () {
                    clearIFrame(getWebLayer());
                    clearIFrame(getWebLayer(1));
                }, 2500);
                break;
            default:
                /* var transition = serverOptions.transition;
                if (serverOptions.currentMeta.transition !== null) {
                    transition = serverOptions.currentMeta.transition;
                } */

                //var values = ["bars", "blinds", "blinds3d", "zip", "blocks", "blocks2", "concentric", "warp", "cube", "tiles3d", "tiles3dprev", "slide", "swipe", "dissolve"];
                var transition = "tiles3d";

                $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
                $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
                $("#stream").hide();
                video.pause();
                $("#slider").show();
                window.f.showImageById(serverOptions.currentFile, transition);                
                setTimeout(function () {                    
                    clearIFrame(getWebLayer());
                    clearIFrame(getWebLayer(1));
                }, 2500);
                break;
        }
    }

    setBackground(bundleData.background);
}


function setBackground(background) {
    background = encodeURI("/background/" + background);
    if (serverOptions.isStreaming) return;

    var video = document.getElementById("bgvid");
    var bg = $("#bg");
    var bgImage = document.getElementById("bgimg");
    if (background.indexOf(".mp4") !== -1) {
        if (parseUrl(video.src) !== background) {
            bg.fadeOut();
            video.src = background;
            video.volume = 0.;
            video.load();
            video.play();
            $(video).show();
        }
    } else {
        bgImage.src = background;
        bg.fadeIn();
        // unload video
        video.pause();
        video.removeAttribute("src");
        video.load();
        $(video).hide();
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
    if (serverOptions.isStreaming) {
        if (flvjs.isSupported()) {
            $("#stream").show();
            var videoElement = document.getElementById('stream');
            flvPlayer = flvjs.createPlayer({
                type: 'flv',
                url: serverOptions.streamSource
            },
                {
                    enableStashBuffer: false,   // enable for much longer buffer, note: video may stall if network jitter
                    isLive: true,
                    cors: true,
                });
            try {
                flvPlayer.attachMediaElement(videoElement);
                flvPlayer.muted = true;
                flvPlayer.load();
                flvPlayer.play();
                streamStarted = true;
                return true;
            } catch (err) {
                $('#stream').hide();
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
            return false;
        }
        $("#stream").hide();
        return false;
    }
    return true;
}

/**
 * preload images
 * @param data
 */
function preloadImages(data) {
    window.f.clearImages();

    let allSlides = data.slides;
    let count = 0;
    for (var i in allSlides) {
        if (allSlides[i].type == "slide") {
            count += 1;
        }
    }
    if (count == 0) {
        setBackground(bundleData.background);
        if (checkStream(serverOptions) === false) {
            nextSlide(data);
        }
        return;
    }

    let counter = 0;
    for (var i in allSlides) {
        try {
            if (allSlides[i].type === "slide") {
                getDataUri("/render/" + serverOptions.currentBundle + "/" + allSlides[i].uuid + ".png", allSlides[i].uuid, function (imageId, imageData, image) {
                    image.id = imageId;
                    window.f.images.push(image);
                    window.f.imageData.push(imageData);
                    counter++;
                    if (counter >= count) {
                        setBackground(bundleData.background);
                        if (checkStream(serverOptions) === false) {
                            nextSlide(data);
                        }
                    }
                });
            }
        } catch (err) {
            console.log(err);
        }
    }
}

function reloadImage(data) {
    if (serverOptions.currentBundle === data.bundleName) {
        getDataUri("/render/" + data.bundleName + "/" + data.uuid + ".png?" + uuidv4(), data.uuid, function (imageId, imageData, image) {
            var found = false;
            for (var i in window.f.images) {
                if (window.f.images[i].id === data.uuid) {
                    image.id = imageId;
                    window.f.images[i] = image;
                    window.f.imageData[i] = imageData;
                    found = true;
                }
            }
            if (!found) {
                console.log("notfound, adding!");
                image.id = imageId;
                window.f.images.push(image);
                window.f.imageData.push(imageData);
            }
        });
    }
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
        if (allSlides[k].type === "slide") {
            allIds.push(allSlides[k].uuid);
        }
    }

    // new slides count is less than slides in rotation
    // remove slides
    if (allIds.length < fluxIds.length) {
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
                    getDataUri("/render/" + serverOptions.currentBundle + "/" + allIds[i] + ".png", allIds[i], function (imageId, imageData, image) {
                        image.id = imageId;
                        window.f.images.push(image);
                        // window.f.imageData.push(imageData);
                    });
                    return true;
                }
            } catch (err) {
                console.log(err);
                return false;
            }
        }
    }
    return false;
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
    $("#" + getWebLayer()).attr('src', url).addClass("fadeIn").removeClass("fadeOut");
    $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
    clearIFrame(getWebLayer(1));
    layer++;
    if (layer > 1) {
        layer = 0;
    }
}

function getWebLayer(offset) {
    if (offset === undefined) offset = 0;
    return "webLayer" + (layer + offset) % 2;
}

function clearIFrame(id) {
    if ($('#' + id).attr('src') !== "/empty") {
        $('#' + id).attr('src', '/empty');
    }
}


function getDataUri(url, imageId, callback) {
    var image = new Image();
    image.onload = function () {
        //  let canvas = document.createElement('canvas');
        //  canvas.width = 1920; // or 'width' if you want a special/scaled size
        //  canvas.height = 1080; // or 'height' if you want a special/scaled size
        //  canvas.getContext('2d').drawImage(this, 0, 0);
        //callback(imageId, canvas.toDataURL('image/png'), this);
        callback(imageId, null, this);
        //  canvas = null;
    };
    image.src = url;
}
