let passport = require("passport");
const {RateLimiterMemory} = require('rate-limiter-flexible');
const maxWrongAttemptsByIPperDay = 30;
const maxConsecutiveFailsByUsernameAndIP = 5;

const limiterSlowBruteByIP = new RateLimiterMemory({
    points: maxWrongAttemptsByIPperDay,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24, // Block for 1 day, if 30 wrong attempts per day
});

const limiterConsecutiveFailsByUsernameAndIP = new RateLimiterMemory({
    points: maxConsecutiveFailsByUsernameAndIP,
    duration: 60 * 60 * 24, // Store number for day since first fail
    blockDuration: 15 * 60, // Block for 15min
});

const getUsernameIPkey = (username, ip) => `${username}_${ip}`;

module.exports = function (app, websocket, dispatcher) {


    app.get('/login', function (req, res, next) {
        res.render('auth/login');
    });

    app.post('/login',
        function (req, res, next) {
            passport.authenticate('local', async function (err, user, info) {
                const ipAddr = req.ip;
                const usernameIPkey = getUsernameIPkey(req.body.username, ipAddr);

                const [resUsernameAndIP, resSlowByIP] = await Promise.all([
                    limiterConsecutiveFailsByUsernameAndIP.get(usernameIPkey),
                    limiterSlowBruteByIP.get(ipAddr),
                ]);

                let retrySecs = 0;

                // Check if IP or Username + IP is already blocked
                if (resSlowByIP !== null && resSlowByIP.consumedPoints > maxWrongAttemptsByIPperDay) {
                    retrySecs = Math.round(resSlowByIP.msBeforeNext / 1000) || 1;
                } else if (resUsernameAndIP !== null && resUsernameAndIP.consumedPoints > maxConsecutiveFailsByUsernameAndIP) {
                    retrySecs = Math.round(resUsernameAndIP.msBeforeNext / 1000) || 1;
                }

                if (retrySecs > 0) {
                    console.log(`Blocked ${req.ip}, due too many requests`);
                    res.status(429).end('Too Many Requests');
                    return;
                } else {
                    if (!user) {
                        // Consume 1 point from limiters on wrong attempt and block if limits reached
                        try {
                            const promises = [limiterSlowBruteByIP.consume(ipAddr)];
                            // Count failed attempts by Username + IP only for registered users
                            promises.push(limiterConsecutiveFailsByUsernameAndIP.consume(usernameIPkey));
                            await Promise.all(promises);

                            return res.redirect('/login');
                        } catch (rlRejected) {
                            if (rlRejected instanceof Error) {
                                throw rlRejected;
                            } else {
                                console.log(`Blocked ${req.ip}, due too many requests`);
                                res.status(429).end('Too Many Requests');
                                return;
                            }
                        }

                    }

                    req.logIn(user, async function (err) {
                        if (err) {
                            return next(err);
                        }

                        if (resUsernameAndIP !== null && resUsernameAndIP.consumedPoints > 0) {
                            // Reset on successful authorisation
                            await limiterConsecutiveFailsByUsernameAndIP.delete(usernameIPkey);
                        }

                        if (req.session.location) {
                            return res.redirect(req.session.location);
                        }
                        return res.redirect("/");
                    });

                    if (err) {

                        return next(err);
                    }
                }
            })(req, res, next);
        });

    app.get('/logout',
        function (req, res) {
            req.logout();
            res.redirect('/');
        });

    app.get('/empty', function (req, res, next) {
        res.render('empty');
    });

    return app;
};