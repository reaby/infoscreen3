let plugin = require("../../modules/plugin.js").default;
let config = require(__dirname + "/config.json");
var sys = require('util');
var exec = require('child_process').exec;

class myTestPlugin extends plugin {

    onInit() {

    }

    onAdminRouter(router) {
        /* let self = this;
         router.get("/test", function (req, res, next) {
              res.send(self.renderPluginView("test", { test: "hello!" }));
         }); */
    }

    onPluginRouter(router) {
        router.get("/ajax/ping", function (req, res) {
            let cmd = "ping -c 1 ";
            let regex = /=([0-9.]+?) ms/;
            if (/^win/.test(process.platform)) {
                cmd = "ping -n 1 ";
                regex = /[><=]([0-9.]+?)ms/;
            }
            exec(cmd + config.host, function (err, stdout, stdErr) {
                var ms = stdout.match(regex);
                ms = (ms && ms[1]) ? Number(ms[1]) : ms;
                res.json({ ping: ms });
            });
        })
    }

    setDisplayViewAdditions() {
        return this.renderPluginView("pingWidget");
    }

}

exports.default = myTestPlugin;
