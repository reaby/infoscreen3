import plugin from "../../modules/plugin.js";
import cli from "../../modules/cli.js";
import chalk from 'chalk';

let prevValue = 0;
let startValue = (process.memoryUsage().rss / 1048576).toFixed(1);

function tickHeapDump() {
    setImmediate(function () {
        let memMB = (process.memoryUsage().rss / 1048576).toFixed(1);
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

export default class profilerPlugin extends plugin {
    onInit() {
        tickHeapDump();
        setInterval(() => {
            tickHeapDump();
        }, 5000);
    }
}
