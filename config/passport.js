// --------- Dependencies ---------
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var refresh = require('passport-oauth2-refresh');
var User = require('../models/user');
var validator = require('validator');
require('../config/custom-validation.js')(validator);
var xss = require('xss');
var crypto = require('crypto');
var debug = (process.env.NODE_ENV == 'dev');
var config = require('../config/settings').settings[process.env.NODE_ENV];
config.connections = require('../config/settings').settings['connections'];

module.exports = function(passport) {

    // Let passport use the serialize and deserialize functions defined in the mongoose user schema
    passport.serializeUser(User.authSerializer);
    passport.deserializeUser(User.authDeserializer);

    // Define local login strategy for passport
    passport.use('local-login', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    }, function(req, emailAddress, password, done) {

        // Clean and verify form input
        var email = validator.trim(emailAddress);

        if (!validator.isEmail(email) || email.length == 0 || password.length == 0)
        {
            return done(null, false, req.flash('loginMessage', 'An error occurred. Please check if you\'ve typed in your credentials.'));
        }

        // Authenticate the provided credentials
        User.authenticateUser(email, password, function(err, user, reason) {
            // An error occurred
            if (err) return done(null, false, req.flash('loginMessage', err.toString()));

            // Login succeeded
            if (user) return done(null, user, req.flash('loginMessage', ''));

            // Login failed
            if (reason !== null)
            {
                var reasons = User.failedLogin;
                if (debug) var logFlag = false;

                switch (reason)
                {
                    case reasons.NOT_FOUND:
                        if (debug)
                        {
                            console.log('DEBUG: NOT_FOUND');
                            logFlag = true;
                        }
                    case reasons.PASSWORD_INCORRECT:
                        if (debug && !logFlag)
                        {
                            console.log('DEBUG: PASSWORD_INCORRECT');
                        }
                        return done(null, false, req.flash('loginMessage', 'Error: The email address or password is incorrect.'));
                    case reasons.MAX_ATTEMPTS:
                        if (debug)
                        {
                            console.log('DEBUG: MAX_ATTEMPTS');
                        }
                        // To Do: Send email about account being locked
                        return done(null, false, req.flash('loginMessage', 'Error: The account is temporarily locked.'));
                }
            }

            // An unexpected error occurred
            return done(null, false, req.flash('loginMessage', 'An error occurred. Please try again in a few minutes.'));
        });
    }));

    // Define local register strategy for passport
    passport.use('local-register', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, emailAddress, password, done) {

        // Clean and verify form input
        var email = validator.trim(emailAddress);
        var displayName = email.split('@')[0];
        var gravatar = crypto.createHash('md5').update(email).digest('hex');

        if (!validator.isValidDisplayName(displayName))
        {
            displayName = 'New_User';
        }

        if (!validator.isEmail(email) || email.length == 0 || password.length == 0)
        {
            return done(null, false, req.flash('registerMessage', 'An error occurred. Please check if you\'ve typed in your credentials.'));
        }

        if (!validator.isEmail(email) || !validator.isValidPassword(password))
        {
            return done(null, false, req.flash('registerMessage', 'Error: Email address or password did not meet criteria. Please try again.'));
        }

        if (password !== req.body.passwordVerify)
        {
            return done(null, false, req.flash('registerMessage', 'Error: Password confirmation failed. Please check if you\'ve typed in your password correctly.'));
        }

        // If validation passes, proceed to register user
        process.nextTick(function() {
            var newUser = new User({
                email: email,
                displayName: displayName,
                password: password,
                gravatar: gravatar
            });

            newUser.save(function(err) {
                // An error occurred
                if (err) return done(null, false, req.flash('registerMessage', err.toString()));
                
                // Registration succeeded
                return done(null, newUser);
            });
        });
    }));

    // Define Facebook strategy for passport
    var fbStrategy = new FacebookStrategy({
        clientID: config.connections.facebook.clientID,
        clientSecret: config.connections.facebook.clientSecret,
        callbackURL: config.url + '/connect/auth/facebook/callback',
        enableProof: true,
        passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, done) {
        // Set update date as yesterday
        var date = new Date();
        date.setDate(date.getDate() - 1);

        // Set up connection
        connection = {
            profileId: profile.id,
            accessToken: accessToken,
            lastUpdateTime: date
        };

        process.nextTick(function() {
            User.addFacebook(req.user.id, connection, function(err, user) {
                // An error occurred
                if (err) return done(null, false, req.flash('connectMessage', err.toString()));

                // Connection added successfully
                if (connection) return done(null, user, req.flash('connectMessage', 'You are now connected with Facebook.'));
            });
        });
    });
    passport.use(fbStrategy);
    refresh.use(fbStrategy);

};