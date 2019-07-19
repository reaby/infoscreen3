const records = require(`../config.js`).admins;

module.exports = {

    findById: function (id, cb) {
        process.nextTick(function () {
            let idx = id - 1;
            if (records[idx]) {
                cb(null, records[idx]);
            } else {
                cb(new Error('User ' + id + ' does not exist'));
            }
        });
    },

    findByUsername: function (username, cb) {
        process.nextTick(function () {
            for (let i = 0, len = records.length; i < len; i++) {
                let record = records[i];
                if (record.username === username) {
                    return cb(null, record);
                }
            }
            return cb(null, null);
        });
    }

};
