let router = require('express').Router();
let passport = require("passport");

module.exports = function (websocket, dispatcher) {

    router.get('/login', function (req, res, next) {
        console.log(req.session);

        res.render('auth/login');
    });

    router.post('/login',
        passport.authenticate('local', {failureRedirect: '/login'}),
        function (req, res) {
            if (req.session.location) {
                return res.redirect(req.session.location);
            }
            return res.redirect("/");
        });

    router.get('/logout',
        function (req, res) {
            req.logout();
            res.redirect('/');
        });

    router.get('/empty', function (req, res, next) {
        res.render('empty');
    });

    return router;
};