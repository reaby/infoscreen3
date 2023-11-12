var path = require("path");
var fs = require("fs");

var nodeModules = {    };
fs.readdirSync("./node_modules")
    .filter(function (x) {
        return [".bin"].indexOf(x) === -1;
    })
    .forEach(function (mod) {
        nodeModules[mod] = "commonjs " + mod;
    });

if (fs.existsSync("./data/sessions.db")) {
    fs.rmSync("./data/sessions.db");
}

module.exports = [
    {
        name: "infoscreen3",
        context: __dirname,
        mode: 'production',
        entry: "./infoscreen3.js",
        target: "node",
        output: {
            path: __dirname + '/webpack',
            filename: "bundle.js",
            library: 'commonjs'
        },
        externals: nodeModules,
        module: {
            noParse: [/socket.io-client/],
            rules: [
                {
                    test: /\.js$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            exclude: /node_modules/,
                        }
                    }
                },
                { test: /\.node$/, use: { loader: "node-loader" } }
            ]
        },
        resolve: {
            alias: {
                'socket.io-client': path.join(__dirname, 'node_modules', 'socket.io-client', 'socket.io.js')
            },
            extensions: ["", ".js", ".node"]
        },
        node: {
            __dirname: true,
            __filename: true
        },
        profile: true
    }
];