/*jshint esversion: 6 */

// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings').connections;
const messages = require.main.require('./config/messages.js');

// --------- Dependencies ---------
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var YoutubeV3Strategy = require('passport-youtube-v3').Strategy;
var refresh = require('passport-oauth2-refresh');
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);
var xss = require('xss');
var crypto = require('crypto');
var bcrypt = require('bcrypt');

// Define constants for account
var SALT_WORK_FACTOR = 10;

module.exports = function(passport, nev) {

    /**
     * Let passport use the serialize and deserialize functions defined in
     * the mongoose user schema
     */
    passport.serializeUser(User.authSerializer);
    passport.deserializeUser(User.authDeserializer);

    // Define local login strategy for passport
    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    }, function(req, emailAddress, password, done) {
        // Clean and verify form input
        var email = validator.trim(emailAddress);

        if (!validator.isEmail(email) || email.length === 0 ||
            password.length === 0) {
            return done(null, false, req.flash('loginMessage',
                messages.error.credentials.missing));
        }

        // Authenticate the provided credentials
        User.authenticateUser(email, password, function(err, user, reason) {
            // An error occurred
            if (err) {
                return done(null, false, req.flash('loginMessage',
                    err.toString()));
            }

            // Login succeeded
            if (user) {
                return done(null, user, req.flash('loginMessage', ''));
            }

            // Login failed
            if (reason !== null) {
                var reasons = User.failedLogin;

                switch (reason) {
                    case reasons.NOT_FOUND:
                    case reasons.PASSWORD_INCORRECT:
                        return done(null, false, req.flash('loginMessage',
                            messages.error.credentials.incorrect));
                    case reasons.MAX_ATTEMPTS:
                        // To Do: Send email about account being locked
                        return done(null, false, req.flash('loginMessage',
                            messages.error.credentials.locked));
                }
            }

            // An unexpected error occurred
            return done(null, false, req.flash('loginMessage',
                messages.error.general));
        });
    }));

    // Define local register strategy for passport
    passport.use('local-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    }, function(req, emailAddress, password, done) {
        // Clean and verify form input
        var email = validator.trim(emailAddress);
        var display = validator.trim(req.body.display_name);
        if (display.length === 0) {
            display = email.split('@')[0];
        }
        var gravatar = crypto.createHash('md5').update(email).digest('hex');

        if (!validator.isValidDisplayName(display)) {
            display = 'User';
        }

        if (!validator.isEmail(email) || email.length === 0 ||
                password.length === 0 || !validator.isValidPassword(password)) {
            return done(null, false, req.flash('registerMessage',
                messages.error.credentials.missing));
        }

        if (password !== req.body.passwordVerify) {
            return done(null, false, req.flash('registerMessage',
                messages.error.credentials.password));
        }

        User.findOne({'email': email}, function(err, returnedUser) {
            // An error occurred
            if (err) {
                return done(new Error(messages.error.general));
            }

            if (!returnedUser) {
                // If validation passes, proceed to register user
                process.nextTick(function() {
                    // Generate salt
                    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
                        // An error occurred
                        if (err) {
                            return done(new Error(messages.error.general));
                        }

                        // Hash password using new salt
                        bcrypt.hash(password, salt, function(err, hash) {
                            if (err) {
                                return done(new Error(messages.error.general));
                            }

                            // Set hashed password back on document
                            var newUser = new User({
                                email: email,
                                displayName: display,
                                password: hash,
                                avatar: 'https://gravatar.com/avatar/' +
                                    gravatar
                            });

                            nev.createTempUser(newUser, function(err,
                                    existingPersistentUser, newTempUser) {
                                // An error occurred
                                if (err) {
                                    return done(null, false,
                                        req.flash('registerMessage',
                                        err.toString()));
                                }

                                /**
                                 * Registration succeeded; next step is email
                                 * verification
                                 */
                                if (newTempUser) {
                                    var URL = newTempUser[
                                        nev.options.URLFieldName
                                    ];
                                    nev.sendVerificationEmail(email, URL,
                                            function(err, info) {
                                        if (err) {
                                            return done(null, false,
                                                req.flash('registerMessage',
                                                err.toString()));
                                        }
                                        req.flash('loginMessage',
                                            messages.error.credentials
                                            .register_success);
                                        return done(null, newTempUser);
                                    });

                                /**
                                 * User already exists in the verified
                                 * user collection
                                 */
                                } else if (existingPersistentUser) {
                                    return done(null, false,
                                        req.flash('registerMessage',
                                            messages.error.credentials
                                            .account_exists + ' Perhaps ' +
                                            '<a href="/resend/' + email +
                                            '"> resend a verification ' +
                                            'email?</a>'));
                                }
                            });
                        });
                    });
                });
            } else {
                return done(null, false, req.flash('registerMessage',
                    messages.error.credentials.account_exists));
            }
        });
    }));

    // Define Facebook strategy for passport
    var fbStrategy = new FacebookStrategy({
        clientID: config.connections.facebook.clientID,
        clientSecret: config.connections.facebook.clientSecret,
        callbackURL: config.url + '/connect/auth/facebook/callback',
        enableProof: true,
        passReqToCallback: true
    }, function(req, accessToken, refreshToken, profile, done) {
        // Set up connection
        connection = {
            profileId: profile.id,
            accessToken: accessToken,
            refreshToken: refreshToken,
            reauth: req.session.reauth,
            refreshAccessToken: req.session.refreshAccessToken
        };

        process.nextTick(function() {
            User.addFacebook(req.user.id, connection, function(err, user) {
                // An error occurred
                if (err) {
                    return done(null, false, req.flash('connectMessage',
                        err.toString()));
                }

                // Connection added successfully
                if (connection) {
                    return done(null, user, req.flash('connectMessage',
                        messages.status.Facebook.connected));
                }
            });
            delete req.session.reauth;
            delete req.session.refreshAccessToken;
        });
    });
    passport.use(fbStrategy);
    refresh.use(fbStrategy);

    // Define YouTube strategy for passport
    var ytStrategy = new YoutubeV3Strategy({
        clientID: config.connections.youtube.clientID,
        clientSecret: config.connections.youtube.clientSecret,
        callbackURL: config.url + '/connect/auth/youtube/callback',
        passReqToCallback: true
    }, function(req, accessToken, refreshToken, profile, done) {
        // Set up connection
        connection = {
            profileId: profile.id,
            accessToken: accessToken,
            refreshToken: refreshToken,
            reauth: req.session.reauth,
            refreshAccessToken: req.session.refreshAccessToken
        };

        process.nextTick(function() {
            User.addYouTube(req.user.id, connection, function(err, user) {
                // An error occurred
                if (err) {
                    return done(null, false, req.flash('connectMessage',
                        err.toString()));
                }

                // Connection added successfully
                if (connection) {
                    return done(null, user, req.flash('connectMessage',
                        messages.status.YouTube.connected));
                }
            });
            delete req.session.reauth;
            delete req.session.refreshAccessToken;
        });
    });
    passport.use(ytStrategy);
    refresh.use(ytStrategy);
};
