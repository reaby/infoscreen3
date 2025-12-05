import EventEmitter from 'events';
class Dispatcher extends EventEmitter { }
const eventDispatcher = new Dispatcher();

import config from './config.js';
import express from 'express';
import createError from 'http-errors';
import path from 'path';
import PluginManager from './modules/pluginManager.js';
const app = express();
const server = Http.Server(app);
const io = new SocketIO(server, {
    maxHttpBufferSize: 4e8,
    pingTimeout: 60000
});

const pluginManager = new PluginManager(app, io, eventDispatcher);
import WebSocket from './modules/websocket.js';
const websocket = WebSocket(pluginManager, io, eventDispatcher);
import routerIndex from './routes/index.js';
const indexRouter = routerIndex(pluginManager, websocket, eventDispatcher);
import routerAdmin from './routes/admin.js';
const adminRouter = routerAdmin(pluginManager, websocket, eventDispatcher);
import routerAuth from './routes/auth.js';
const authRouter = routerAuth(websocket, eventDispatcher);

import CookieParser from 'cookie-parser';
import Http from 'http';
import { Server as SocketIO } from 'socket.io';
import i18next from 'i18next';
import FilesystemBackend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import passport from 'passport';
import passportlocal from 'passport-local';
import NodeMediaServer from 'node-media-server';
import expressSession from 'express-session';
import BetterExpressStore from 'better-express-store';
const cookieParser = CookieParser(config.sessionKey);


const LocalStrategy = passportlocal.Strategy;
import User from './modules/db.js';

import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
    const nodeServerConfig = {
        logtype: 2,
        allow_origin: '*',
        rtmp: {
            port: 1935,
            chunk_size: 60000,
            gop_cache: true,
            ping: 60,
            ping_timeout: 30,
        },
        http: {
            port: (parseInt(config.serverListenPort) + 1),
            allow_origin: '*',
        },
        auth: {
            api: true,
            api_user: config.admins[0].username,
            api_pass: config.admins[0].password,
        }
    };

    const nms = new NodeMediaServer(nodeServerConfig);
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
            cookieSecure: false // if need secure cookie
        }
    });


// view engine setup
app.set('port', parseInt(config.serverListenPort));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');
app.use(i18nextMiddleware.handle(i18next));
//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(cookieParser);
app.use(express.static(path.join(__dirname, 'public')));
app.use("/video/", express.static(path.join(__dirname, 'data', 'video')));

app.use(expressSession({
    key: 'express.sid',
    secret: config.sessionKey,
    store: BetterExpressStore({ dbPath: "./data/sessions.db" }),
    resave: true,
    saveUninitialized: true,
    cookie: {
        sameSite: true,
        secure: false
    }
}));

app.use(passport.initialize({}));
app.use(passport.session({}));



// default socket.io config
/* var passportSocketIo = require('passport.socketio');
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
*/

app.use('/', authRouter);
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


export {
    app,
    server,
    io,
    eventDispatcher
};