let serverOptions;
let bundleSettings;
let bundleDirs = [];
let displayList;


socket.on('connect', function () {
    emit("admin.dashboard.sync");
});

socket.on("callback.update", function (data) {
    // filter out other displays updates than the current one
    if (data.serverOptions.displayId === displayId) {
        serverOptions = data.serverOptions;
        $('#bundleSlides').children().css("border", "1px solid black");
        $('#' + serverOptions.currentFile).css("border", "1px solid #1ebc30");
        updateControls(data.serverOptions);
        updateSlides(data.slides);
    }
});

socket.on("callback.error", function (data) {
    alert(data);
});

socket.on("callback.dashboard.sync", function (data) {
    displayId = parseInt(data.displayId);
    serverOptions = data.serverOptions;
    bundleDirs = data.bundleDirs;
    displayList = data.displays;
    updateControls(data.serverOptions);

    // update dropdown at menu with bundles
    let valueArray = [];
    for (let dir of bundleDirs) {
        valueArray.push({ name: dir.name, value: dir.dir });
    }

    $('#bundles')
        .dropdown({
            direction: "downward",
            values: valueArray,
            action: function (_label, _value) {
                $('#bundles')
                    .dropdown("hide");

                emit("admin.setBundle", { bundle: _value });
            }
        }).dropdown("set selected", { bundle: serverOptions.currentBundle });
    $('#currentBundle').text(serverOptions.currentBundle);
    $('#statusMessageAdmin').val(serverOptions.statusMessage);
    // update dropdown at menu with bundles
    valueArray = [];
    let x = 0;
    for (let display of data.displays) {
        valueArray.push({ name: display.name, value: x });
        x++;
    }

    $('#displays')
        .dropdown({
            direction: "downward",
            values: valueArray,
            action: function (text, value) {
                $('#displays')
                    .dropdown("hide");

                displayId = parseInt(value);
                document.location = "/admin/display/" + displayId;
            }
        }).dropdown("set selected", displayId);

    $('.currentDisplay').text(displayList[displayId].name);

    let transitionArray = [];
    // let values = ["bars", "blinds", "blinds3d", "zip", "blocks", "blocks2", "concentric", "warp", "cube", "tiles3d", "tiles3dprev", "slide", "swipe", "dissolve"];

    transitionArray.push({ name: "random", value: null });
    for (let i in SupportedTransitions) {
        transitionArray.push({ name: SupportedTransitions[i], value: SupportedTransitions[i] });
    }

    $('#transitions')
        .dropdown({
            direction: "downward",
            values: transitionArray,
            action: function (text, value) {
                $('#transitions').dropdown("hide");
                $('#transitions').dropdown("set selected", value);

                emit("admin.setTransition", { transition: value });
                $('#currentTransition').text(text);

            }
        }).dropdown("set selected", serverOptions.transition);

    $('#currentTransition').text(serverOptions.transition || "random");

    //   let preview = document.getElementById('preview');
    //  preview.src = "/admin/preview?displayId=" + displayId + "&socket=" + encodeURIComponent(socket.id);
    updateBundleData(bundleDirs);
});

socket.on("callback.dashboard.updateSlides", function (data) {
    if (serverOptions.currentBundle === data.bundleName) {
        bundleSettings = data.bundleSettings;
        updateSlides(data.bundleSettings.allSlides);
    }
});

socket.on("callback.dashboard.updateBundles", function (data) {
    bundleSettings.bundleDirs = data.bundleDirs;
    updateBundleData(data.bundleDirs);
});

socket.on("callback.dashboard.update", function (data) {
    if (data.serverOptions.displayId !== displayId)
        return;

    displayId = parseInt(data.displayId);
    bundleSettings = data.bundleSettings;
    serverOptions = data.serverOptions;
    updateControls(data.serverOptions);
    updateSlides(bundleSettings.allSlides);

    $('#allBundles').children().css("border", "1px solid black");
    $('#bundle_' + simpleHash(serverOptions.currentBundle)).css("border", "1px solid #1ebc30");
    $('#currentBundle').text(serverOptions.currentBundle);
    $('#currentDisplay').text(displayList[displayId].name);
    $('#transitions').dropdown("set selected", serverOptions.transition);
    $('#currentTransition').text(serverOptions.transition || "random");

    $('.editable').editable(function (value, settings) {
        let uuid = $(this).parent().parent().attr("id");
        emit("admin.renameSlide", { uuid: uuid, name: value, bundleName: serverOptions.currentBundle });
        return (value);
    }, {
        submit: 'rename',
        tooltip: "Doubleclick to edit...",
        event: "dblclick",
        cssclass: 'ui mini nopadded form',
        cancelcssclass: 'ui tiny basic negative button',
        submitcssclass: 'ui tiny basic positive button',
    });
});

$(function () {
    fixPreview();
    $(".sortable").sortable({
        beforeStop: function (event, element) {
            let sortedIDs = $(".sortable").sortable("toArray");
            emit("admin.reorderSlides", { bundleName: serverOptions.currentBundle, sortedIDs: sortedIDs });
        }
    }).disableSelection();
});

function updateBundleData(bundleDirs) {
    let output = "";
    bundleDirs.sort(sortByName);

    for (let i in bundleDirs) {
        let bundle = bundleDirs[i];
        output += `
        <div class="ui green message item" id="bundle_${simpleHash(bundle.dir)}">
            <div class="ui right floated content" style="width: fit-content;">
                <button class="ui small basic inverted icon button" onclick="editBundleProperties('${bundle.dir}')"><i class="edit icon"></i></button>
                <button class="ui small basic inverted icon button" onclick="editBundleSlides('${bundle.dir}')"><i class="list icon"></i></button>
                <button class="ui small basic inverted icon button" onclick="changeBundle('${bundle.dir}')"><i class="play icon"></i></button>
            </div>
            <div class="content">
                <div>${bundle.name}</div>
            </div>
        </div>`;
    }

    $('#allBundles').html(output);
    $('#allBundles').children().css("border", "1px solid black");
    $('#bundle_' + simpleHash(serverOptions.currentBundle)).css("border", "1px solid #1ebc30");
}


function fixPreview() {
    let con = $("#programContainer"),
        aspect = (0.9 / 1.6),
        width = con.innerWidth(),
        height = Math.floor(width * aspect);
    $("#program").css("width", width + "px").css("height", height + "px");
    $("#preview").css("width", width + "px").css("height", height + "px");
}

$(window).bind("resize", function () {
    fixPreview();
});

function createNewSlide() {
    editSlide("", "slide");
}

function addLink() {
    editSlide("", "webpage");
}

function createNewVideo() {
    editSlide("", "video");
}

function editSlide(name, type) {
    switch (type) {
        case "slide":
            window.open("/admin/edit/slide?bundle=" + serverOptions.currentBundle + "&file=" + name + "&displayId=" + displayId, '_blank', 'location=no,height=900,width=1304,scrollbars=no,status=no');
            break;
        case "webpage":
            window.open("/admin/edit/link?bundle=" + serverOptions.currentBundle + "&file=" + name + "&displayId=" + displayId, '_blank', 'location=no,height=400,width=600,scrollbars=no,status=no');
            break;
        case "video":
            window.open("/admin/edit/video?bundle=" + serverOptions.currentBundle + "&file=" + name + "&displayId=" + displayId, '_blank', 'location=no,height=600,width=600,scrollbars=no,status=no');
            break;
    }
}

function setStatusMessage() {
    emit("admin.setStatusMessage", $('#statusMessageAdmin').val());
}

function playYoutubeVideo() {
    let elem = $('#youtubeId').val();
    let regexMatch = /(?:https?:)?(?:\/\/)?(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/\S*?[^\w\s-])((?!videoseries)[\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/.exec(elem);
    let videoId = elem;
    if (regexMatch.length == 2) {
        videoId = regexMatch[1];
    }

    if (videoId !== "") {
        let obj = {
            json: {
                type: "webPage",
                webUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=${serverUrl}&rel=0&modestbranding=0`,
                zoom: 1.,
                displayTime: false,
            },
            displayId: displayId,
            duration: null,
            transition: null,
            png: null,
        };
        socket.emit("admin.overrideWebPage", obj);
    }
}



function createNewBundle() {
    $('#newBundle')
        .modal({
            closable: true,
            onDeny: function () {
                $('#newBundle').modal("hide");
                return false;
            },
            onApprove: function () {
                emit("admin.createBundle", { "dir": $("#newBundleDirName").val(), "bundle": $("#newBundleName").val() });
                $("#newBundleDirName").val("");
                $("#newBundleName").val("");
                $('#newBundle').modal("hide");
            }
        })
        .modal('show');
}


function editBundles() {
    window.open("/admin/edit/bundles", '_blank', 'width=700,height=700,scrollbars=yes,status=no,location=no');
}

function emit(eventName, data) {
    if (data === undefined || data === null) {
        data = {};
    }
    Object.assign(data, { displayId: parseInt(displayId) });
    socket.emit(eventName, data);
}

/**
 *
 * @param {display~serverOptions} serverOptions
 */
function updateControls(serverOptions) {

    if (serverOptions.blackout) {
        $('#blackout').removeClass('basic');
    } else {
        $('#blackout').addClass('basic');
    }

    if (serverOptions.displayTime) {
        $('#toggleTime').removeClass('basic');
    } else {
        $('#toggleTime').addClass('basic');
    }

    if (serverOptions.isStreaming) {
        $('#stream').removeClass('basic');
    } else {
        $('#stream').addClass('basic');
    }

    if (serverOptions.loop) {
        $('#play').addClass('green');
        $('#pause').removeClass('orange');

    } else {
        $('#play').removeClass('green');
        $('#pause').addClass('orange');
    }

}

function updateSlides(slides) {
    let output = "";
    let index = 0;
    let currentIndex = 0;
    for (let slide of slides) {
        let status = "on";
        let color = "green";
        if (!slide.enabled) {
            status = "off";
            color = "red";
        }
        let iconStatus = "play";
        if (serverOptions.currentFile === slide.uuid) {
            iconStatus = "play";
            currentIndex = index;
        }

        let statusHtml = ``;
        if (slide.epochStart != -1) {
            let d = new Date(slide.epochStart);
            let isoStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
            statusHtml = `<i class="check icon"></i> ${isoStr}`;
        }
        if (slide.epochEnd != -1) {
            let d = new Date(slide.epochEnd);
            let isoStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
            statusHtml += ` <i class="delete icon"></i> ${isoStr}`;
        }

        let toggleButton =  `<i class="large toggle ${status} icon" onclick="emit('controls.toggle', {fileName: '${slide.uuid}'} );"></i>`;
        if (slide.epochEnd != -1 && slide.epochStart != -1) {
            toggleButton = `<i class="large icon"></i>`;
        }




        output += `
        <div class="ui ${color} message item" id="${slide.uuid}">
            <div class="right floated content">
                <button class="ui small basic inverted icon button" onclick="editSlide('${slide.uuid}', '${slide.type}');"><i class="edit outline icon"></i></button>
                <button class="ui small basic inverted icon button" onclick="emit('controls.skipTo', {fileName: '${slide.uuid}'} );"><i class="step forward icon"></i></button>
             <!--   <button class="ui small basic inverted icon button" onclick="remove('${slide.uuid}');"><i class="delete icon"></i></button> -->
               ${toggleButton}
            </div>
            <div class="content">
                <span class="editable">${slide.name}</span><br>
                ${statusHtml}
            </div>
        </div>
        `;

        index += 1;
    }

    $("#bundleSlides").html(output);
    $('#bundleSlides').children().css("border", "1px solid black");
    $('#' + serverOptions.currentFile).css("border", "1px solid #1ebc30");
    $('.editable').editable(function (value, settings) {
        let uuid = $(this).parent().parent().attr("id");
        emit("admin.renameSlide", { uuid: uuid, name: value, bundleName: serverOptions.currentBundle });
        return (value);
    }, {
        submit: 'rename',
        tooltip: "Doubleclick to edit...",
        event: "dblclick",
        cssclass: 'ui mini nopadded form',
        cancelcssclass: 'ui tiny basic negative button',
        submitcssclass: 'ui tiny basic positive button',
    });

}
function editBundleProperties(bundle) {
    window.open("/admin/edit/bundleProperties?bundle=" + bundle, '_blank', 'width=400,height=800,scrollbars=yes,status=no,location=no');
}

function editBundleSlides(name) {
    window.open("/admin/edit/bundleSlides?bundle=" + name, '_blank', 'width=400,height=800,scrollbars=yes,status=no,location=no');
}

function changeBundle(name) {
    if (confirm(askMessage) == true) {
        emit("admin.setBundle", {bundle: name});
    }
    return true;
}

function remove(uuid) {
    let obj = { bundleName: serverOptions.currentBundle, uuid: uuid };

    if (confirm("Really delete slide?")) {
        emit('admin.removeSlide', obj);
    }
}

function forceReload() {
    if (confirm("Really reload all connected display clients ?")) {
        emit('admin.reload');
    }
}

function sortByName(a, b) {
    if (a.name < b.name)
        return -1;
    if (a.name > b.name)
        return 1;
    return 0;
}

function simpleHash(string) {
    let hash = 0;
    if (string.length == 0) {
        return hash;
    }
    for (let i = 0; i < string.length; i++) {
        let char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}
