let config = require("./config.js");
let express = require('express');
let createError = require('http-errors');
let logger = require('morgan');
let lessMiddleware = require('less-middleware');
let path = require('path');
let PluginManager = require("./modules/pluginManager");
const EventEmitter = require('events');

let cookieParser = require('cookie-parser')(config.sessionKey);

class Dispatcher extends EventEmitter {}

const eventDispatcher = new Dispatcher();

let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);
let i18next = require("i18next");
let FilesystemBackend = require("i18next-node-fs-backend");
let i18nextMiddleware = require("i18next-express-middleware");

let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let User = require("./modules/db.js");

passport.serializeUser(function (user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
    User.findById(id, function (err, user) {
        if (err) {
            return cb(err);
        }
        cb(null, user);
    });
});

passport.use("local", new LocalStrategy({
        passReqToCallback: true
    },
    function (req, username, password, cb) {
        User.findByUsername(username, function (err, user) {
            if (err) {
                return cb(err);
            }
            if (!user) {
                return cb(null, false);
            }
            if (user.password !== password) {
                return cb(null, false);
            }
            return cb(null, user);
        });
    }));

if (config.mediaServer) {
    const NodeMediaServer = require('node-media-server');

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




i18next
    .use(FilesystemBackend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        backend: {
            loadPath: './locales/{{lng}}/{{ns}}.json',
            addPath: './locales/{{lng}}/{{ns}}.missing.json'
        },
        fallbackLng: config.defaultLocale,
        preload: ['en', 'fi'],
        saveMissing: false,
        detection: {
            // order and from where user language should be detected
            order: [ /*'path', 'session', */ 'querystring', 'cookie', 'header'],

            // keys or params to lookup language from
            lookupQuerystring: 'lng',
            lookupCookie: 'i18next',
            lookupHeader: 'accept-language',
            lookupSession: 'lng',
            lookupPath: 'lng',
            lookupFromPathIndex: 0,

            // cache user language
            caches: false, // ['cookie']

            // optional expire and domain for set cookie
            //  cookieExpirationDate: new Date(),
            //  cookieDomain: 'myDomain',
            //  cookieSecure: true // if need secure cookie
        }
    });


// view engine setup
app.set('port', parseInt(config.serverListenPort));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');
app.use(i18nextMiddleware.handle(i18next));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(cookieParser);
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

var expressSession = require('express-session');
var SQLiteStore = require('connect-sqlite3')(expressSession);
var sessionStore = new SQLiteStore({
    dir: "./data",
    db: "sessions.db"

});

app.use(expressSession({
    key: 'express.sid',
    secret: config.sessionKey,
    store: sessionStore,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize({}));
app.use(passport.session({}));



// default socket.io config
var passportSocketIo = require('passport.socketio');
io.use(passportSocketIo.authorize({
    key: 'express.sid', // the name of the cookie where express/connect stores its session_id
    secret: config.sessionKey, // the session_secret to parse the cookie
    store: sessionStore,
    cookieParser: require('cookie-parser'),
    //  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
    fail: onAuthorizeFail, // *optional* callback on fail/error - read more below
}));

function onAuthorizeFail(data, message, error, accept) {
    if (message) {        
        console.log("Websocket error: " + message);
        if (message === "No session found") {
            message += ", logout and try login again.";
        }
        return accept(new Error(message));
    }

    if (error) {
        console.log("Websocket error: " + message);        
        return accept(new Error(message));
    }
}


let pluginManager = new PluginManager(app, io, eventDispatcher);
let websocket = require("./modules/websocket")(pluginManager, io, eventDispatcher);
let indexRouter = require('./routes/index.js')(pluginManager, websocket, eventDispatcher);
let adminRouter = require('./routes/admin.js')(pluginManager, websocket, eventDispatcher);
let authRouter = require('./routes/auth.js')(app, websocket, eventDispatcher);

app.use('/', indexRouter);
app.use('/admin', adminRouter);
//app.use('/', authRouter);

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

module.exports = {
    app: app,
    server: server,
    io: io,
    eventDispatcher: eventDispatcher
};