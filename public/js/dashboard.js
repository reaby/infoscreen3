var serverOptions;
var bundleSettings;
var bundleDirs;
var displayId = 0;
var displayList;


socket.on('connect', function () {
    canvas = new fabric.Canvas('edit');
    canvas.includeDefaultValues = false;
    emit('admin.dashboard.sync');
});

socket.on("callback.update", function (data) {
    // filter out other displays updates than the current one
    if (data.serverOptions.displayId === displayId) {
        serverOptions = data.serverOptions;
        $('#bundleSlides').children().css("border", "1px solid black");
        $('#' + serverOptions.currentFile).css("border", "1px solid #1ebc30");
    }
    updateControls(data.serverOptions);
});


socket.on("callback.dashboard.sync", function (data) {
    displayId = parseInt(data.displayId);
    serverOptions = data.serverOptions;
    bundleDirs = data.bundleDirs;
    displayList = data.displays;
    updateControls(data.serverOptions);

    // update dropdown at menu with bundles
    var valueArray = [];
    for (var dir of bundleDirs) {
        valueArray.push({name: dir, value: dir});
    }

    $('#bundles')
        .dropdown({
            direction: "upward",
            values: valueArray,
            action: function (text, value) {
                $('#bundles')
                    .dropdown("hide");
                emit("admin.setBundle", {bundle: value});
            }
        }).dropdown("set selected", {bundle: serverOptions.currentBundle});
    $('#currentBundle').text(serverOptions.currentBundle);

    // update dropdown at menu with bundles
    valueArray = [];
    var x = 0;
    for (var display of data.displays) {
        valueArray.push({name: display.name, value: x});
        x++;
    }

    $('#displays')
        .dropdown({
            direction: "upward",
            values: valueArray,
            action: function (text, value) {
                $('#displays')
                    .dropdown("hide");

                displayId = parseInt(value);
                emit("admin.setDisplay", {display: value});
                var program = document.getElementById('program');
                program.src = "/display/" + value;
            }
        }).dropdown("set selected", displayId);

    $('.currentDisplay').text(displayList[displayId].name);

    var transitionArray = [];
    var values = ["bars", "blinds", "blinds3d", "zip", "blocks", "blocks2", "concentric", "warp", "cube", "tiles3d", "tiles3dprev", "slide", "swipe", "dissolve"];

    transitionArray.push({name: "random", value: null});
    for (var i in values) {
        transitionArray.push({name: values[i], value: values[i]});
    }

    $('#transitions')
        .dropdown({
            direction: "upward",
            values: transitionArray,
            action: function (text, value) {
                $('#transitions').dropdown("hide");
                $('#transitions').dropdown("set selected", value);

                emit("admin.setTransition", {transition: value});
                $('#currentTransition').text(text);

            }
        }).dropdown("set selected", serverOptions.transition);

    $('#currentTransition').text(serverOptions.transition || "random");

    var preview = document.getElementById('preview');
    preview.src = "/admin/preview?displayId=" + displayId + "&socket=" + encodeURIComponent(socket.id);


    let output = "";
    for (var i in data.bundleDirs) {
        let bundle = data.bundleDirs[i];
        output += '<div class="ui green message item" id="bundle_' + bundle + '">' +
            '<div class="right floated content">' +
            '<button class="ui small basic inverted icon button" onclick="emit(\'admin.setBundle\', {bundle:\'' + bundle + '\'});"><i class="step forward icon"></i></button>' +
            '<button class="ui small basic inverted icon button" onclick="editBundle(\'' + bundle + '\')"><i class="edit outline icon"></i></button>' +
            '</div>' +
            '<div class="content">' +
            '<div>' + bundle + '</div>' +
            '</div>' +
            '</div>';
    }

    $('#allBundles').html(output);


});

socket.on("callback.dashboard.updateSlides", function (data) {

    console.log("update");
    if (serverOptions.currentBundle === data.bundleName) {
        bundleSettings = data.bundleSettings;
        updateSlides(data.bundleSettings);
    }
});


socket.on("callback.dashboard.update", function (data) {
    if (data.serverOptions.displayId !== displayId)
        return;

    displayId = parseInt(data.displayId);
    bundleSettings = data.bundleSettings;
    serverOptions = data.serverOptions;
    updateControls(data.serverOptions);
    updateSlides(bundleSettings);

    $('#allBundles').children().css("border", "1px solid black");
    $('#bundle_' + serverOptions.currentBundle).css("border", "1px solid #1ebc30");
    $('#currentBundle').text(serverOptions.currentBundle);
    $('#currentDisplay').text(displayList[displayId].name);
    $('#transitions').dropdown("set selected", serverOptions.transition);
    $('#currentTransition').text(serverOptions.transition || "random");

    $('.editable').editable(function (value, settings) {
        var uuid = $(this).parent().parent().attr("id");
        emit("admin.renameSlide", {uuid: uuid, name: value, bundleName: serverOptions.currentBundle});
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
            var sortedIDs = $(".sortable").sortable("toArray");
            emit("admin.reorderSlides", {sortedIDs: sortedIDs});
        }
    }).disableSelection();
});

function fixPreview() {
    var con = $("#programContainer"),
        aspect = (0.9 / 1.6),
        width = con.innerWidth(),
        height = Math.floor(width * aspect);
    $("#program").css("width", width + "px").css("height", height + "px");
    $("#preview").css("width", width + "px").css("height", height + "px");
}

$(window).bind("resize", function () {
    fixPreview();
});

function createNew() {
    editSlide("", "slide");
}

function addLink() {
    editSlide("", "webpage");
}

function editSlide(name, type) {
    switch (type) {
        case "slide":
            window.open("/admin/edit/slide?bundle=" + serverOptions.currentBundle + "&file=" + name + "&displayId=" + displayId, '_blank', 'location=no,height=800,width=1304,scrollbars=no,status=no');
            break;
        case "webpage":
            window.open("/admin/edit/link?bundle=" + serverOptions.currentBundle + "&file=" + name + "&displayId=" + displayId, '_blank', 'location=no,height=400,width=600,scrollbars=no,status=no');
            break;
    }
}

function emit(callback, data) {
    if (data === undefined || data === null) {
        data = {};
    }
    Object.assign(data, {displayId: parseInt(displayId)});
    socket.emit(callback, data);
}

/**
 *
 * @param {display~serverOptions} serverOptions
 */
function updateControls() {
    if (serverOptions.blackout) {
        $('#blackout').removeClass('basic');
    } else {
        $('#blackout').addClass('basic');
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

function updateSlides(settings) {
    var slides = settings.allSlides;

    var output = "";
    var index = 0;
    var currentIndex = 0;
    for (slide of slides) {
        var status = "on";
        var color = "green";
        if (!slide.enabled) {
            status = "off";
            color = "red";
        }
        var iconStatus = "play";
        if (serverOptions.currentFile === slide.uuid) {
            iconStatus = "play";
            currentIndex = index;
        }

        var slideType = "'" + slide.type + "'";

        output += '<div class="ui ' + color + ' message item" id="' + slide.uuid + '">' +
            '<div class="right floated content">' +
            '<button class="ui small basic inverted icon button" onclick="emit(\'controls.preview\', {fileName: \'' + slide.uuid + '\', bundle: \'' + serverOptions.currentBundle + '\' });"><i class="search icon"></i></button>' +
            '<button class="ui small basic inverted icon button" onclick="emit(\'controls.skipTo\',{fileName: \'' + slide.uuid + '\'});"><i class="step forward icon"></i></button>' +
            '<button class="ui small basic inverted icon button" onclick="editSlide(\'' + slide.uuid + '\', ' + slideType + ')"><i class="edit outline icon"></i></button>' +
            '<button class="ui small basic inverted icon button" onclick="remove({uuid: \'' + slide.uuid + '\'});"><i class="delete icon"></i></button>' +
            '</div>' +
            '<div class="content">' +
            '<i class="large toggle ' + status + ' icon" onclick="emit(\'controls.toggle\', {fileName: \'' + slide.uuid + '\'});"></i>' +
            '<div class="editable">' + slide.name.replace(".json", "") + '</div>' +
            '</div>' +
            '</div>';

        index += 1;
    }

    $("#bundleSlides").html(output);
    $('#bundleSlides').children().css("border", "1px solid black");
    $('#' + serverOptions.currentFile).css("border", "1px solid #1ebc30");
}


function remove(obj) {
    if (confirm("Really delete slide?")) {
        emit('admin.removeSlide', obj);
    }
}

function forceReload() {
    if (confirm("Really reload all connected display clients ?")) {
        emit('admin.reload');
    }
}