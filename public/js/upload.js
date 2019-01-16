var images = {};

$(document).ready(function () {
    var opts = {
        dragClass: "active",
        on: {
            load: function (e, file) {
                // check file type
                var imageType = /image.(jpeg|png)/;
                if (!file.type.match(imageType)) {
                    alert("File \"" + file.name + "\" is not a valid image file, only jpeg and png are supported");
                    return false;
                }

                // check file size
                if (parseInt(file.size / 1024) > 2050) {
                    alert("File \"" + file.name + "\" is too big.Max allowed size is 2 MB.");
                    return false;
                }

                createBox(e, file);
            },
        }
    };

    FileReaderJS.setupDrop(document.getElementById('dropzone'), opts);
    FileReaderJS.setupClipboard(document.body, opts);
});


function createBox(e, file) {
    var uid = uuidv4();
    var imgName = file.name;

    var src = e.target.result;
    var tempCanvas = new fabric.StaticCanvas("tempCanvas", {width: 1280, height: 720});
    tempCanvas.backgroundColor = null;
    tempCanvas.backgroundImage = null;

    fabric.Image.fromURL(src, function (bgImage) {

        var canvasAspect = tempCanvas.width / tempCanvas.height;
        var imgAspect = bgImage.width / bgImage.height;
        var left, top, scaleFactor;

        if (canvasAspect >= imgAspect) {
            scaleFactor = tempCanvas.width / bgImage.width;
            left = 0;
            top = -((bgImage.height * scaleFactor) - tempCanvas.height) / 2;
        } else {
            scaleFactor = tempCanvas.height / bgImage.height;
            top = 0;
            left = -((bgImage.width * scaleFactor) - tempCanvas.width) / 2;
        }

        bgImage.set({
            top: top,
            left: left,
            originX: 'left',
            originY: 'top',
            scaleX: scaleFactor,
            scaleY: scaleFactor
        });

        bgImage.lockUniScaling = true;
        tempCanvas.add(bgImage);
        tempCanvas.renderAll();

        images[uid] = {data: src, crop: tempCanvas.toDataURL(), name: imgName, type: file.type};

        var template = ` <div class="ui card" id="${uid}">
        <div class="image">
            <img class="" src="${src}" alt="image">
        </div>
        <div class="content">
            <div class="center aligned header">${imgName}</div>
        </div>
        <div class="extra content">
            <div class="ui tiny basic button" onclick="upload('${uid}', true);">Upload Original</div>
            <div class="ui tiny basic button" onclick="upload('${uid}', false);">Upload & Scale to 16:9</div>
            <div class="ui tiny basic button" onclick="cancelUpload('${uid}');">Cancel</div>
        </div>
    </div>`;
        $("#imageList").append(template);
    });

}


function upload(uid, useOriginal) {

    if (images[uid] !== null) {
        var busyTemplate = `<div class="card">                                
                                    <div class="ui active dimmer">
                                        <div class="ui text loader">Uploading</div>
                                    </div>                                  
                            </div>`;

        $("#" + uid).html(busyTemplate);
        let filename = images[uid].name.replace(/\.[^/.]+$/, "");

        if (useOriginal) {
            socket.emit("edit.uploadImage", {
                bundleName: bundle,
                name: filename,
                imageData: images[uid].data,
                type: images[uid].type,
                displayId: displayId
            });
        } else {
            socket.emit("edit.uploadImage", {
                bundleName: bundle,
                name: filename + "_crop",
                imageData: images[uid].crop,
                type: "image/png",
                displayId: displayId
            });
        }

        delete (images[uid]);

    }
}

function addImagesFromUploadQueue() {

    for (var i in images) {
        var uid = i;
        var image = images[i];
        var template = ` <div class="ui card" id="${uid}">
        <div class="image">
            <img class="" src="${image.data}" alt="image">
        </div>
        <div class="content">
            <div class="center aligned header">${image.name}</div>
        </div>
        <div class="extra content">
            <div class="ui tiny basic button" onclick="upload('${uid}', true);">Upload Original</div>
            <div class="ui tiny basic button" onclick="upload('${uid}', false);">Upload & Scale to 16:9</div>
            <div class="ui tiny basic button" onclick="cancelUpload('${uid}');">Cancel</div>
        </div>
    </div>`;
        $("#imageList").append(template);
    }
}

function cancelUpload(uid) {
    delete images[uid];
    $("#" + uid).remove();
}