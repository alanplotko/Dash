// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var messages = require.main.require('./config/messages');
var handlers = require.main.require('./routes/handlers');

module.exports = function(app, passport, isLoggedIn, nev) {
  // --------- Front Page ---------
  app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }
    res.render('index');
  });

  // --------- User Dashboard ---------
  app.get('/dashboard', isLoggedIn, function(req, res) {
    var totalPosts = 0;
    req.user.batches.forEach(function(batch) {
      totalPosts += batch.posts.length;
    });
    var numPages = Math.ceil(totalPosts / handlers.ITEMS_PER_PAGE);

    var results = handlers.handlePagination(req.user.batches, 1, totalPosts,
      numPages);

    res.render('dashboard', {
      connected: req.user.facebook.profileId !== undefined ||
        req.user.youtube.profileId !== undefined,
      batches: results.batches,
      currentPage: results.currentPage || null,
      numPages: results.numPages || null,
      startPage: results.startPage || null,
      endPage: results.endPage || null
    });
  });

  app.get('/dashboard/:page(\\d+)', isLoggedIn, function(req, res) {
    var currentPage = parseInt(req.params.page, 10);
    var totalPosts = 0;
    req.user.batches.forEach(function(batch) {
      totalPosts += batch.posts.length;
    });
    var numPages = Math.ceil(totalPosts / handlers.ITEMS_PER_PAGE);
    if (currentPage === 1 || currentPage <= 0 || currentPage > numPages) {
      return res.redirect('/dashboard');
    }

    var results = handlers.handlePagination(req.user.batches, currentPage,
      totalPosts, numPages);

    res.render('dashboard', {
      connected: req.user.facebook.profileId !== undefined ||
        req.user.youtube.profileId !== undefined,
      batches: results.batches,
      currentPage: results.currentPage || null,
      numPages: results.numPages || null,
      startPage: results.startPage || null,
      endPage: results.endPage || null
    });
  });

  app.post('/reset/:service', isLoggedIn, function(req, res) {
    var serviceName = req.params.service;
    var serviceNameLower = serviceName.toLowerCase();

    User.findById(req.user._id, function(err, user) {
      if (err) {
        return handlers.handleResponse(res, 500, null, false);
      }

      // Clear update time
      user.lastUpdateTime[serviceNameLower] = undefined;

      // Clear service's posts
      user.batches.forEach(function(batch) {
        batch.posts.slice().reverse().forEach(function(post, idx, obj) {
          if (post.service === serviceNameLower) {
            batch.posts.splice(obj.length - 1 - idx, 1);
          }
        });
        // Delete batch if it has no posts after cleanup
        if (batch.posts.length === 0) {
          batch.remove();
        }
      });

      user.save(function(err) {
        return handlers.handlePostSave(messages.STATUS.GENERAL.RESET_SERVICE,
          err, req, res);
      });
    });
  });

  app.post('/refresh', isLoggedIn, function(req, res) {
    req.user.updateContent(function(err, posts) {
      return handlers.handlePostRefresh('', err, '', posts, req, res);
    });
  });

  app.post('/refresh/:service', isLoggedIn, function(req, res) {
    var serviceName = req.params.service;
    if (serviceName === 'facebook') {
      req.user.refreshFacebook(function(err, posts) {
        return handlers.handlePostRefresh(serviceName.toUpperCase(), err,
          '400-Facebook', posts, req, res);
      });
    } else if (serviceName === 'youtube') {
      req.user.refreshYouTube(function(err, posts) {
        return handlers.handlePostRefresh(serviceName.toUpperCase(), err,
          '400-YouTube', posts, req, res);
      });
    }
  });

  app.post('/toggleUpdates/:service', isLoggedIn, function(req, res) {
    var serviceName = req.params.service;
    if (serviceName === 'facebook') {
      req.user.toggleFacebook(function(err, result) {
        return handlers.handlePostUpdate(result, result, err, result, req, res);
      });
    } else if (serviceName === 'youtube') {
      req.user.toggleYouTube(function(err, result) {
        return handlers.handlePostUpdate(result, result, err, result, req, res);
      });
    }
  });

  app.post('/dismiss/all', isLoggedIn, function(req, res) {
    User.findByIdAndUpdate(req.user._id, {
      $set: {
        batches: []
      }
    }, function(err, user) {
      if (err) {
        return res.sendStatus(500);
      }
      return res.sendStatus(200);
    });
  });

  app.post('/dismiss/:batchId/:postId', isLoggedIn, function(req, res) {
    User.findById(req.user._id, function(err, user) {
      // Database Error
      if (err) {
        return res.sendStatus(500);
      }

      var batch = user.batches.id(req.params.batchId);
      if (batch) {
        batch.posts.id(req.params.postId).remove();
        if (batch.posts.length === 0) {
          batch.remove();
        }
        user.save(function(err) {
          if (err) {
            return res.sendStatus(500);
          }
          return res.sendStatus(200);
        });
      } else {
        return res.sendStatus(500);
      }
    });
  });

  // --------- User's Settings ---------
  app.get('/settings', isLoggedIn, function(req, res) {
    res.render('settings', {
      message: req.flash('settingsMessage')
    });
  });

  app.post('/settings/profile/display_name', isLoggedIn, function(req, res) {
    var displayName = validator.trim(req.body.displayName);
    var settings = {};

    // Validate changes
    if (validator.isValidDisplayName(displayName)) {
      settings.displayName = displayName;
    } else if (!validator.isValidDisplayName(displayName)) {
      return handlers.handleResponse(res, 200,
        messages.SETTINGS.DISPLAY_NAME.INVALID, false);
    }

    // Update user settings
    User.updateUser(req.user._id, settings, function(err, updateSuccess) {
      var success = messages.SETTINGS.DISPLAY_NAME.CHANGE_SUCCEEDED;
      var failure = messages.SETTINGS.DISPLAY_NAME.CHANGE_FAILED;
      return handlers.handlePostUpdate(success, failure, err, updateSuccess,
        req, res);
    });
  });

  app.post('/settings/profile/avatar', isLoggedIn, function(req, res) {
    var avatarUrl = validator.trim(req.body.avatar);
    var settings = {};

    // Validate changes
    if (validator.isValidAvatar(avatarUrl)) {
      settings.avatar = avatarUrl;
    } else {
      return handlers.handleResponse(res, 200, messages.SETTINGS.AVATAR.INVALID,
        false);
    }

    // Update user settings
    User.updateUser(req.user._id, settings, function(err, updateSuccess) {
      var success = messages.SETTINGS.AVATAR.CHANGE_SUCCEEDED;
      var failure = messages.SETTINGS.AVATAR.CHANGE_FAILED;
      return handlers.handlePostUpdate(success, failure, err, updateSuccess,
        req, res);
    });
  });

  app.post('/settings/profile/avatar/reset', isLoggedIn, function(req, res) {
    // Reset user's avatar to use Gravatar
    User.resetAvatar(req.user._id, req.user.email, function(err,
        updateSuccess) {
      var success = messages.SETTINGS.AVATAR.RESET_SUCCEEDED;
      var failure = messages.SETTINGS.AVATAR.RESET_FAILED;
      return handlers.handlePostUpdate(success, failure, err, updateSuccess,
        req, res);
    });
  });

  app.post('/settings/account/email', isLoggedIn, function(req, res) {
    // Clean and verify form input
    var newEmail = validator.trim(req.body.email);

    // Validate changes
    if (!validator.isEmail(newEmail) || newEmail.length === 0) {
      return handlers.handleResponse(res, 200, messages.SETTINGS.EMAIL.INVALID,
        false);
    }

    User.findOne({_id: req.user._id}, function(err, returnedUser) {
      if (err) {
        return handlers.handleResponse(res, 500, null, false);
      }
      returnedUser.email = newEmail;
      return handlers.handleEmailChange(nev, returnedUser, newEmail, req, res);
    });
  });

  app.post('/settings/account/password', isLoggedIn, function(req, res) {
    var currentPass = validator.trim(req.body.currentPass);
    var newPass = validator.trim(req.body.newPass);
    var newPassConfirm = validator.trim(req.body.newPassConfirm);
    var settings = {};

    // Validate changes
    if (newPass !== newPassConfirm) {
      return handlers.handleResponse(res, 200,
        messages.SETTINGS.PASSWORD.NO_MATCH, false);
    } else if (validator.isValidPassword(newPass)) {
      settings.password = newPass;
      User.findById(req.user._id, function(err, user) {
        if (err) {
          return handlers.handleResponse(res, 500, null, false);
        }
        user.comparePassword(currentPass, function(err, isMatch) {
          if (err) {
            return handlers.handleResponse(res, 500, null, false);
          } else if (isMatch) {
            // Update user settings
            return handlers.handlePasswordChange(currentPass, newPass, req,
              res);
          }

          return handlers.handleResponse(res, 200,
            messages.SETTINGS.PASSWORD.UNAUTHORIZED, false);
        });
      });
    } else {
      return handlers.handleResponse(res, 200,
        messages.SETTINGS.PASSWORD.INVALID, false);
    }
  });

  app.post('/settings/account/delete', isLoggedIn, function(req, res) {
    var connected = req.user.facebook.profileId !== undefined ||
      req.user.youtube.profileId !== undefined;

    if (connected) {
      return handlers.handleResponse(res, 200,
        messages.SETTINGS.ACCOUNT.SERVICES_ACTIVE, false);
    }

    User.deleteUser(req.user._id, function(err, deleteSuccess) {
      var success = messages.SETTINGS.ACCOUNT.DELETE_SUCCEEDED;
      var failure = messages.SETTINGS.ACCOUNT.DELETE_FAILED;
      return handlers.handlePostUpdate(success, failure, err, deleteSuccess,
        req, res);
    });
  });

  // --------- User's Connected Services ---------
  app.get('/services', isLoggedIn, function(req, res) {
    res.render('services', {
      message: req.flash('serviceMessage'),
      facebook: req.user.facebook.profileId,
      facebookOn: req.user.facebook.acceptUpdates,
      youtube: req.user.youtube.profileId,
      youtubeOn: req.user.youtube.acceptUpdates
    });
  });

  // --------- Dash Login/Logout ---------
  app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }

    res.render('login', {
      message: req.flash('loginMessage')
    });
  });

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  }));

  // Clear credentials and destroy session upon logout
  app.get('/logout', function(req, res) {
    req.logout();
    req.session.destroy(function(err) {
      if (err) {
        res.redirect('/');
      }
      res.redirect('/');
    });
  });

  // --------- Dash Registration ---------
  app.get('/register', function(req, res) {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }

    res.render('register', {
      message: req.flash('registerMessage')
    });
  });

  app.post('/register', passport.authenticate('local-register', {
    successRedirect: '/login',
    failureRedirect: '/register'
  }));

  // --------- Dash Email Verification ---------
  app.get('/verify/:token', function(req, res) {
    nev.confirmTempUser(req.params.token, function(err, newPersistentUser) {
      var success = messages.SETTINGS.EMAIL.VERIFIED;
      var failure = messages.SETTINGS.EMAIL.VERIFICATION_EXPIRED;
      return handlers.handlePostRegistrationEmail(success, failure, err,
        newPersistentUser, req, res);
    });
  });

  app.get('/resend/:email', function(req, res) {
    // Clean and verify form input
    var email = validator.trim(req.params.email);
    if (!validator.isEmail(email) || email.length === 0) {
      req.flash('registerMessage', messages.SETTINGS.EMAIL.INCORRECT);
      return res.redirect('/register');
    }

    nev.resendVerificationEmail(email, function(err, userFound) {
      var success = messages.SETTINGS.EMAIL.VERIFICATION_RESENT;
      var failure = messages.SETTINGS.EMAIL.INCORRECT;
      return handlers.handlePostRegistrationEmail(success, failure, err,
        userFound, req, res);
    });
  });
};
