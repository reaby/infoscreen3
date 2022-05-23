import plugin from "../../modules/plugin.js";
import exec from 'child_process';
import config from './settings.js';

function ping_getTime() {
    let d = new Date();
    return d.getTime();
}


export default class myTestPlugin extends plugin {

    onInit() {
        this.cache = 0;
        this.lastStamp = ping_getTime()-30000;
    }

    onPluginRouter(router) {
        let self = this;
        router.get("/ajax/ping", function (req, res) {

            if ((ping_getTime() - self.lastStamp) <= 5 * 1000) {
                return res.json({ ping: self.cache });
            }

            let cmd = "ping -c 1 ";
            let regex = /=([0-9.]+?) ms/;
            if (/^win/.test(process.platform)) {
                cmd = "ping -n 1 ";
                regex = /[><=]([0-9.]+?)ms/;
            }

            exec(cmd + config.host, function (err, stdout, stdErr) {
                var ms = stdout.match(regex);
                ms = (ms && ms[1]) ? Number(ms[1]) : ms;
                self.lastStamp = ping_getTime();
                self.cache = ms;
                res.json({ ping: ms });
            });
        })
    }

    setDisplayViewAdditions() {
        return this.renderPluginView("pingWidget");
    }
}
