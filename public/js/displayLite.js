var layer = 0;

/** bundleData
 * @see data/default/bundle.json
 *
 **/
var flvPlayer;
var connectionTimeoutId;
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
    $('#blackoutLayer').dblclick(toggleFullScreen);

// socketio callbacks
    /** when connected **/
    socket.on('connect', function () {
        socket.emit("sync");
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

    socket.on('callback.blackout', function (data) {
        serverOptions = data.serverOptions;
        checkBlackout();
    });

    socket.on('callback.time', function (data) {
        serverOptions.displayTime = data;
        checkTimeDisplay();
    });
    
    socket.on('callback.updateUI', function (data) {
        serverOptions = data.serverOptions;
        bundleData = data.bundleData;
        updateStatusMessage();
    });

    /** callback Load **/
    socket.on('callback.load', function (data) {
        serverOptions = data.serverOptions;
        bundleData = data.bundleData;
        checkBlackout();
        nextSlide(data);
    });


    /** callback Update **/
    socket.on('callback.update', function (data) {
        serverOptions = data.serverOptions;
        bundleData = data.bundleData;
        checkBlackout();
        nextSlide(data);
    });

    socket.on('callback.reload', function () {
        location.reload(true);
    });

    socket.on('callback.announce', function (data) {
        checkBlackout();
        nextSlide(data);
    });

    socket.on('callback.forceSlide', function (data) {
        checkBlackout();
        nextSlide(data);
    });

});


$(window).bind("resize", function () {
    fixImageSizes();
});

function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen(); 
      }
    }
  }
  
  document.addEventListener("keydown", function(e) {
    if (e.keyCode == 13) {
      toggleFullScreen();
    }
  }, false);


function getLayer(offset) {
    if (offset === undefined) offset = 0;
    return "layer" + (layer + offset) % 2;
}


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


    $("#layer0").css("width", width + "px").css("height", height + "px");
    $("#layer1").css("width", width + "px").css("height", height + "px");
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
        $('#statusMessageOuter').fadeIn();
        $('#statusMessage').text(serverOptions.statusMessage);
    } else {
        $('#statusMessageOuter').fadeOut();
        $('#statusMessage').text("");
    }
}

function nextSlide(data) {
    serverOptions = data.serverOptions;
    bundleData = data.bundleData;
    checkTimeDisplay();
    updateStatusMessage();
    
    var elem = document.getElementById("img" + layer);
    if (serverOptions.isAnnounce) {
        if (serverOptions.announceMeta.type === "webPage") {
            $(elem).hide();
            $("#" + getWebLayer()).css("transform", "scale(" + serverOptions.announceMeta.zoom + ")");
            $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");
            clearIFrame(getWebLayer(1));
            if (serverOptions.announceMeta.displayTime) {
                $('#time').removeClass('flipOutX').addClass("flipInX");
            } else {
                $('#time').addClass('flipOutX').removeClass("flipInX");
            }
            displayWebPage(serverOptions.announceMeta.webUrl);
        }
        if (serverOptions.announceMeta.type === "image") {
            $(elem).show();
            $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
            $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
            setTimeout(function () {
                clearIFrame(getWebLayer());
                clearIFrame(getWebLayer(1));
            }, 1500);

            $("#helperLayer").addClass("announce");
            try {
                var randomId = uuidv4();
                elem.src = "/tmp/" + serverOptions.displayId + "/?randomId=" + randomId;
            } catch (err) {
                console.log(err);
            }
        }
    } else {
        $("#helperLayer").removeClass("announce");
        switch (serverOptions.currentMeta.type) {
            case "webpage":
                $(elem).hide();
                $("#" + getWebLayer()).addClass("fadeIn").removeClass("fadeOut");
                displayWebPage(serverOptions.currentMeta.webUrl);
                break;
            default:
                $(elem).show();
                $("#" + getWebLayer()).addClass("fadeOut").removeClass("fadeIn");
                $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
                setTimeout(function () {
                    clearIFrame(getLayer());
                    clearIFrame(getLayer(1));
                }, 1000);
                elem.src = "/render/" + serverOptions.currentBundle + "/" + serverOptions.currentFile + ".png";
                break;
        }

    }

    setBackground(bundleData.background);
    $("#" + getLayer(1)).css("opacity", 0);
    $("#" + getLayer()).css("opacity", 1);

    layer++;
    if (layer > 1) {
        layer = 0;
    }

}


function setBackground(background) {
    background = "/background/" + background;
    if (serverOptions.isStreaming) return;

    var video = document.getElementById("bgvid");
    var bg = $("#bg");
    var bgImage = document.getElementById("bgimg");
    if (background.indexOf(".mp4") !== -1) {

        if (parseUrl(video.src) !== background) {
            bg.fadeOut();
            video.src = background;
            video.load();
            video.play();
            $(video).show();
        }
    } else {
        if (parseUrl(bgImage.src) !== background) {
            bgImage.src = background;
            bg.fadeIn();
            // unload video
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

function showBackgroundOnly() {
    $("#" + getLayer(1)).css("opacity", 0);
    $("#" + getLayer()).css("opacity", 0);
}

function checkStream(serverOptions) {

    if (serverOptions.isStreaming && streamStarted === false) {
        if (flvjs.isSupported()) {
            var videoElement = document.getElementById('bgvid');
            flvPlayer = flvjs.createPlayer({
                    type: 'flv',
                    url: serverOptions.streamSource
                }, {
                    enableStashBuffer: false,   // enable for much longer buffer, note, video may stall if network jitter
                    isLive: true
                }
            );
            try {
                flvPlayer.attachMediaElement(videoElement);
                flvPlayer.volume = videoVolume;
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

function updateTimeout() {
    clearTimeout(connectionTimeoutId);
    $("#networkstatus").css("opacity", 0);
    connectionTimeoutId = setTimeout(function () {
        $("#networkstatus").css("opacity", 1);
    }, 30000)
}

/** Generate an uuid
 * @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

var weblayer = 0;

function displayWebPage(url) {
    $("#" + getWebLayer()).attr('src', url).addClass("fadeIn").removeClass("fadeOut");
    $("#" + getWebLayer(1)).addClass("fadeOut").removeClass("fadeIn");
    weblayer++;
    if (weblayer > 1) {
        weblayer = 0;
    }
}

function getWebLayer(offset) {
    if (offset === undefined) offset = 0;
    return "webLayer" + (weblayer + offset) % 2;
}

function clearIFrame(id) {
    if ($('#' + id).attr('src') !== "/empty") {
        $('#' + id).attr('src', '/empty');
    }
}

