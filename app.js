let express = require('express');
let createError = require('http-errors');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let lessMiddleware = require('less-middleware');
let path = require('path');

const EventEmitter = require('events');
let config = require("./config.js");

class Dispatcher extends EventEmitter {
}

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

passport.use("local", new LocalStrategy(
    {

    },
    function (username, password, cb) {
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

passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
    User.findById(id, function (err, user) {
        if (err) { return cb(err); }
        cb(null, user);
    });
});


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
        saveMissing: true,
        detection: {
            // order and from where user language should be detected
            order: [/*'path', 'session', */ 'querystring', 'cookie', 'header'],

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
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('express-session')({ secret: config.sessionKey, resave: false, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize({}));
app.use(passport.session({}));

let websocket = require("./modules/websocket")(server, app, io, eventDispatcher);
let indexRouter = require('./routes/index.js')(websocket, eventDispatcher);
let adminRouter = require('./routes/admin.js')(websocket, eventDispatcher);
let authRouter = require('./routes/auth.js')(websocket, eventDispatcher);


app.use('/', authRouter);
app.use('/admin', adminRouter);
app.use('/', indexRouter);

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
