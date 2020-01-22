let chalk = require('chalk');
let lastStamp = "";

module.exports = {
    error: function (error, title) {
        if (title == null) {
            title = "";
        }
        this.log(chalk.bold.red("[Error]" + title) + " " + error);
    },

    info: function (string, category) {

        this.log(chalk.cyan("[" + (category || "Info") + "] ") + string);
    },

    debug: function (string) {
        console.log(chalk.bold.black("[Debug] " + string));
    },

    success: function (string) {
        this.log(string + chalk.green(" [Success]"));
    },

    log: function (string) {
        let now = getDateTime();
        if (lastStamp != now) {
            lastStamp = now;
            now = "\n" + now + "\n"
        } else {
            now = "";
        }

        console.log(now + string);
    }
};

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;

}