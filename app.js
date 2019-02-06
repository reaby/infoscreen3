let express = require('express');
let createError = require('http-errors');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let lessMiddleware = require('less-middleware');
const EventEmitter = require('events');
let config = require("./config.js");

class Dispatcher extends EventEmitter {
}

const eventDispatcher = new Dispatcher();

let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

if (config.mediaServer) {
    const {NodeMediaServer} = require('node-media-server');

    const nodeServerConfig = {
        rtmp: {
            port: 1935,
            chunk_size: 60000,
            gop_cache: true,
            ping: 60,
            ping_timeout: 30
        },
        http: {
            port: (parseInt(config.serverListenPort) + 1),
            allow_origin: '*'
        }
    };

    let nms = new NodeMediaServer(nodeServerConfig);
    nms.run();
}

// view engine setup
app.set('port', parseInt(config.serverListenPort));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));

app.use(express.static(path.join(__dirname, 'public')));

let websocket = require("./modules/websocket")(server, app, io, eventDispatcher);
let indexRouter = require('./routes/index.js')(websocket);
let adminRouter = require('./routes/admin.js')(websocket);

app.use('/', indexRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = {app: app, server: server, io: io, eventDispatcher: eventDispatcher};
