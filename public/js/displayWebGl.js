/***************************
 *  window load, init
 * **************************/
let bundleData = {
    background: "",
    duration: 10,
    styleHeader: {},
    styleText: {},
    useWebFonts: false
};
let serverOptions = {};


let sketch = new Sketch(
    {
        duration: 2000,
        debug: false,
        easing: TWEEN.Easing.Quadratic.Out
    });

sketch.loadManager.onLoad = () => {
    try {
        sketch.play();
        if (sketch.tmpImage) {
            sketch.showSlide("temp");
            return;
        }

        setBackground(bundleData.background);
        if (checkStream(serverOptions) === false) {
            nextSlide();
        }
    } catch (e) {
        console.error(e);
    }
}

let connectionTimeoutId;
let layer = 0;
let flvPlayer;

/** bundleData
 * @see data/default/bundle.json
 *
 **/


$(function () {

    displayTime();
    setInterval(displayTime, 1000);
    $('#blackoutLayer').dblclick(toggleFullScreen);
    if (isPreview === 0) {
        document.addEventListener("keydown", function (e) {
            if (e.code == 13) {
                toggleFullScreen();
            }
        }, false);
    }

});


function symmetricDifference(a1, a2) {
    let result = [];
    for (let i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    for (let i = 0; i < a2.length; i++) {
        if (a1.indexOf(a2[i]) === -1) {
            result.push(a2[i]);
        }
    }
    return result;
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
    sketch.removeImageByUuid(data.uuid);
});

socket.on('callback.reload', function () {
    location.reload(true);
});

socket.on('callback.reloadImage', function (data) {
    reloadImage(data);
});

socket.on('callback.announce', function (data) {
    checkBlackout();
    if (checkStream(serverOptions) === false) {
        nextSlide(data);
    }
});

socket.on('callback.forceSlide', function (data) {
    checkBlackout();
    if (checkStream(serverOptions) === false) {
        nextSlide(data);
    }
});

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
    $('#time').html(date.getHours() + ":" + min + "<div style='font-size: 3vh;'>" + date.toLocaleDateString() + "</div>");
}

function checkTimeDisplay() {
    let bool = serverOptions.displayTime;
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
    if (data) {
        serverOptions = data.serverOptions;
        bundleData = data.bundleData;
    }

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


            $("#slider").show();
            // $("#helperLayer").addClass("announce");
            const id = uuidv4();
            const imgUrl = "/tmp/" + serverOptions.displayId + "/?randomId=" + id;
            sketch.showTempImage(imgUrl)
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
                let transition = serverOptions.transition;
                if (serverOptions.currentMeta.transition !== null) {
                    transition = serverOptions.currentMeta.transition;
                }

                $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
                $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
                $("#stream").hide();
                $("#slider").show();
                sketch.showSlide(serverOptions.currentFile, transition);                
                video.pause();
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

    const video = document.getElementById("bgvid");
    const bg = $("#bg");
    const bgImage = document.getElementById("bgimg");

    if (background.indexOf(".mp4") !== -1) {
        if (parseUrl(video.src) !== background) {
            bg.fadeOut();
            try {
                video.src = background;
                video.volume = 0.;
                video.load();
                video.play();
                $(video).show();
            } catch (e) {
                console.error(e);
            }
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
            const videoElement = document.getElementById('stream');
            flvPlayer = flvjs.createPlayer(
                {
                    type: 'flv',
                    url: serverOptions.streamSource
                },
                {
                    enableStashBuffer: false,   // enable for much longer buffer, note, video may stall if network jitter
                    cors: true,
                    isLive: true
                }
            );
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
async function preloadImages(data) {
    sketch.stop();
    sketch.clearImages();
    const allSlides = data.slides;

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

    for (let i in allSlides) {
        try {
            if (allSlides[i].type === "slide") {
                await sketch.loadImage("/render/" + serverOptions.currentBundle + "/" + allSlides[i].uuid + ".png", allSlides[i].uuid);
            }
        } catch (err) {
            console.log(err);
        }
    }
}

async function reloadImage(data) {
    if (serverOptions.currentBundle === data.bundleName) {
        await sketch.loadImage("/render/" + data.bundleName + "/" + data.uuid + ".png?" + uuidv4(), data.uuid);
    }
}


/** not in use */
/*
async function checkImages(allSlides) {
    let fluxIds = [];
    let allIds = [];

    for (let i in sketch.textures) {
        fluxIds.push(sketch.textures[j].image.uuid);
    }
    for (let k in allSlides) {
        if (allSlides[k].type === "slide") {
            allIds.push(allSlides[k].uuid);
        }
    }

    // new slides count is less than slides in rotation
    // remove slides
    if (allIds.length < fluxIds.length) {
        let diffIds = symmetricDifference(fluxIds, allIds);
        for (let l in diffIds) {
            sketch.removeImageByUuid(diffIds[l]);
        }
    } else
    // else count is greater, so add slides
    {
        for (let i in allIds) {
            try {
            await sketch.loadImage("/render/" + serverOptions.currentBundle + "/" + allIds[i] + ".png", allIds[i]);
            } catch (e) {
                console.error(e);
            }
        }
        return true;
    }
    return false;
}
*/

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
    if (layer >= 1) {
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