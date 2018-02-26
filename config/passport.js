// --------- Environment Setup ---------
let settings = require.main.require('./config/settings');
settings.ENV = settings[process.env.NODE_ENV];
let messages = require.main.require('./config/messages');

// --------- Dependencies ---------
let LocalStrategy = require('passport-local').Strategy;
let FacebookStrategy = require('passport-facebook').Strategy;
let YoutubeV3Strategy = require('passport-youtube-v3').Strategy;
let refresh = require('passport-oauth2-refresh');
let User = require.main.require('./models/user');
let validator = require('validator');
require.main.require('./config/custom-validation')(validator);
let crypto = require('crypto');

module.exports = function(passport) {
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
    let email = validator.trim(emailAddress);

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
        let reasons = User.failedLogin;

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
    let email = validator.trim(emailAddress);
    let gravatar = crypto.createHash('md5').update(email).digest('hex');
    let displayName = validator.trim(req.body.displayName);
    if (displayName.length === 0) {
      displayName = email.split('@')[0];
    }
    if (!validator.isValidDisplayName(displayName)) {
      displayName = 'User';
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
      if (returnedUser) {
        return done(null, false, req.flash('registerMessage',
          messages.ERROR.CREDENTIALS.ACCOUNT_EXISTS));
      }
      // If validation passes, proceed to register user
      process.nextTick(function() {
        let newUser = new User({
          email: email,
          displayName: displayName,
          password: password,
          avatar: 'https://gravatar.com/avatar/' + gravatar
        });

        newUser.save(function(err) {
          // An error occurred
          if (err) {
            return done(null, false, req.flash('registerMessage',
              messages.ERROR.CREDENTIALS.REGISTRATION_FAILURE));
          }

          // Registration succeeded
          return done(null, newUser, req.flash('registerMessage',
            messages.ERROR.CREDENTIALS.REGISTRATION_SUCCESS));
        });
      });
    });
  }));

  // Define Facebook strategy for passport
  let fbStrategy = new FacebookStrategy({
    clientID: settings.SERVICES.FACEBOOK.CLIENT_ID,
    clientSecret: settings.SERVICES.FACEBOOK.CLIENT_SECRET,
    callbackURL: settings.ENV.URL + '/services/auth/facebook/callback',
    enableProof: true,
    passReqToCallback: true
  }, function(req, accessToken, refreshToken, profile, done) {
    // Set up service
    let service = {
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
        return done(null, user, req.flash('serviceMessage', messages.STATUS
          .FACEBOOK.CONNECTED));
      });
      delete req.session.reauth;
      delete req.session.refreshAccessToken;
    });
  });

  passport.use(fbStrategy);
  refresh.use(fbStrategy);

  // Define YouTube strategy for passport
  let ytStrategy = new YoutubeV3Strategy({
    clientID: settings.SERVICES.YOUTUBE.CLIENT_ID,
    clientSecret: settings.SERVICES.YOUTUBE.CLIENT_SECRET,
    callbackURL: settings.ENV.URL + '/services/auth/youtube/callback',
    passReqToCallback: true
  }, function(req, accessToken, refreshToken, profile, done) {
    // Set up service
    let service = {
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
        return done(null, user, req.flash('serviceMessage', messages.STATUS
          .YOUTUBE.CONNECTED));
      });

      delete req.session.reauth;
      delete req.session.refreshAccessToken;
    });
  });

  passport.use(ytStrategy);
  refresh.use(ytStrategy);
};
