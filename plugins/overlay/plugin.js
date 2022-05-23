import plugin from "../../modules/plugin.js";

export default class overlayPlugin extends plugin {

    setDisplayViewAdditions() {
        return `<style type="text/css">
        html, body {
            background: none;
        }
        #bg, #bgvid {
            visibility: hidden !important;
        }
        </style>`;
    }
}
