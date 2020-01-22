let plugin = require("../../modules/plugin.js").default;
let cli = require('../../modules/cli.js');
let chalk = require('chalk');
let prevValue = 0;
let startValue = (process.memoryUsage().rss / 1048576).toFixed(1);

function tickHeapDump() {
    setImmediate(function () {
        var memMB = (process.memoryUsage().rss / 1048576).toFixed(1);
        if (prevValue != memMB) {
            let prefix = chalk.bold.red("▲");
            if (memMB < prevValue) {
                prefix = chalk.bold.green("▼");
            }
            cli.info("Memory: " + prefix + " " + (memMB - prevValue).toFixed(1) + 'Mb' + " start: " + startValue + "Mb   now: " + memMB + "Mb   (" + (memMB - startValue).toFixed(1) + "Mb)");
            prevValue = memMB;
        }
    });
}

class profilerPlugin extends plugin {
    onInit() {
        tickHeapDump();
        setInterval(() => {
            tickHeapDump();
        }, 5000);
    }
}

exports.default = profilerPlugin;
