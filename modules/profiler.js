var prevValue = 0;
let cli = require('./cli.js');
module.exports.init = function (datadir) {
    setInterval(tickHeapDump, 1000);
};

/**
 * Schedule a heapdump by the end of next tick
 */
function tickHeapDump() {
    setImmediate(function () {
        heapDump();
    });
}

/**
 * Creates a heap dump if the currently memory threshold is exceeded
 */
function heapDump() {
    var memMB = (process.memoryUsage().rss / 1048576).toFixed(1);
    if (prevValue != memMB) {
        cli.info("Memory: " + memMB + 'Mb');
        prevValue = memMB;
    }
}
