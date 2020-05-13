let plugin = require("../../modules/plugin.js").default;

class overlayPlugin extends plugin {
    
    setDisplayViewAdditions() {
        return `<style type="text/css">
        html, body {
            background: none;
        }
        video, #bg {
            visibility: hidden !important;
        }
        </style>`;
    }
}

exports.default = overlayPlugin;
