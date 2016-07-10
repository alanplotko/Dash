// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.SERVICES = require.main.require('./config/settings').SERVICES;
var messages = require.main.require('./config/messages');

// --------- Dependencies ---------
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var YoutubeV3Strategy = require('passport-youtube-v3').Strategy;
var refresh = require('passport-oauth2-refresh');
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var crypto = require('crypto');
var bcrypt = require('bcrypt');

// Define constants for account
var SALT_WORK_FACTOR = 10;

/**
 * Registers a new user with the details contained in the User object and
 * returns via the provided callback.
 * @param  {Object}   nev     The email-verification module imported from app.js
 * @param  {Object}   newUser The new User object containing user details
 * @param  {string}   email   The new user's email address
 * @param  {Object}   req     The current request
 * @param  {done}     done    The callback function to execute
 * @return {done}             Run the callback to complete registration
 */
function registerNewUser(nev, newUser, email, req, done) {
  return nev.createTempUser(newUser, function(err, existingPersistentUser,
      newTempUser) {
    // An error occurred
    if (err) {
      return done(null, false, req.flash('registerMessage',
        err.toString()));
    }

    /**
     * Registration succeeded; next step is email
     * verification
     */
    if (newTempUser) {
      var URL = newTempUser[nev.options.URLFieldName];
      nev.sendVerificationEmail(email, URL, function(err, info) {
        if (err) {
          return done(null, false, req.flash('registerMessage',
            err.toString()));
        }
        req.flash('loginMessage',
          messages.ERROR.CREDENTIALS.REGISTER_SUCCESS);
        return done(null, newTempUser);
      });
    } else if (existingPersistentUser) {
      /**
       * User already exists in the verified
       * user collection
       */
      return done(null, false, req.flash('registerMessage',
        messages.ERROR.CREDENTIALS.ACCOUNT_EXISTS + ' Perhaps ' +
        '<a href="/resend/' + email + '"> resend a verification ' +
        'email?</a>'));
    }
  });
}

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
        messages.ERROR.CREDENTIALS.MISSING));
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
              messages.ERROR.CREDENTIALS.INCORRECT));
          case reasons.MAX_ATTEMPTS:
            // To Do: Send email about account being locked
            return done(null, false, req.flash('loginMessage',
              messages.ERROR.CREDENTIALS.LOCKED));
          default:
            return done(null, false, req.flash('loginMessage',
              messages.ERROR.CREDENTIALS.INCORRECT));
        }
      }

      // An unexpected error occurred
      return done(null, false, req.flash('loginMessage',
        messages.ERROR.GENERAL));
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
    var gravatar = crypto.createHash('md5').update(email).digest('hex');
    var display = validator.trim(req.body.displayName);
    if (display.length === 0) {
      display = email.split('@')[0];
    }
    if (!validator.isValidDisplayName(display)) {
      display = 'User';
    }
    if (!validator.isEmail(email) || email.length === 0 ||
        password.length === 0 || !validator.isValidPassword(password)) {
      return done(null, false, req.flash('registerMessage',
        messages.ERROR.CREDENTIALS.MISSING));
    }

    if (password !== req.body.passwordVerify) {
      return done(null, false, req.flash('registerMessage',
        messages.ERROR.CREDENTIALS.PASSWORD));
    }

    User.findOne({email: email}, function(err, returnedUser) {
      // An error occurred
      if (err) {
        return done(new Error(messages.ERROR.GENERAL));
      }

      if (!returnedUser) {
        // If validation passes, proceed to register user
        process.nextTick(function() {
          // Generate salt
          bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            // An error occurred
            if (err) {
              return done(new Error(messages.ERROR.GENERAL));
            }

            // Hash password using new salt
            bcrypt.hash(password, salt, function(err, hash) {
              if (err) {
                return done(new Error(messages.ERROR.GENERAL));
              }

              // Set hashed password back on document
              var newUser = new User({
                email: email,
                displayName: display,
                password: hash,
                avatar: 'https://gravatar.com/avatar/' + gravatar
              });

              return registerNewUser(nev, newUser, email, req, done);
            });
          });
        });
      }

      return done(null, false, req.flash('registerMessage',
        messages.ERROR.CREDENTIALS.ACCOUNT_EXISTS));
    });
  }));

  // Define Facebook strategy for passport
  var fbStrategy = new FacebookStrategy({
    clientID: config.SERVICES.FACEBOOK.CLIENT_ID,
    clientSecret: config.SERVICES.FACEBOOK.CLIENT_SECRET,
    callbackURL: config.URL + '/services/auth/facebook/callback',
    enableProof: true,
    passReqToCallback: true
  }, function(req, accessToken, refreshToken, profile, done) {
    // Set up service
    var service = {
      profileId: profile.id,
      accessToken: accessToken,
      refreshToken: refreshToken,
      reauth: req.session.reauth,
      refreshAccessToken: req.session.refreshAccessToken
    };

    process.nextTick(function() {
      User.addFacebook(req.user.id, service, function(err, user) {
        // An error occurred
        if (err) {
          return done(null, false, req.flash('serviceMessage', err.toString()));
        }

        // Service added successfully
        if (service) {
          return done(null, user, req.flash('serviceMessage',
            messages.STATUS.FACEBOOK.CONNECTED));
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
    clientID: config.SERVICES.YOUTUBE.CLIENT_ID,
    clientSecret: config.SERVICES.YOUTUBE.CLIENT_SECRET,
    callbackURL: config.url + '/services/auth/youtube/callback',
    passReqToCallback: true
  }, function(req, accessToken, refreshToken, profile, done) {
    // Set up service
    var service = {
      profileId: profile.id,
      accessToken: accessToken,
      refreshToken: refreshToken,
      reauth: req.session.reauth,
      refreshAccessToken: req.session.refreshAccessToken
    };

    process.nextTick(function() {
      User.addYouTube(req.user.id, service, function(err, user) {
        // An error occurred
        if (err) {
          return done(null, false, req.flash('serviceMessage',
            err.toString()));
        }

        // Service added successfully
        if (service) {
          return done(null, user, req.flash('serviceMessage',
            messages.STATUS.YOUTUBE.CONNECTED));
        }
      });

      delete req.session.reauth;
      delete req.session.refreshAccessToken;
    });
  });

  passport.use(ytStrategy);
  refresh.use(ytStrategy);
};
