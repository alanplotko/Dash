// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);
var messages = require.main.require('./config/messages.js');
var ITEMS_PER_PAGE = 10;

/**
 * Modifies the user's email address by moving the user back into
 * the unverified users' MongoDB collection.
 * @param  {Object}   nev           The email-verification module imported from
 *                                  app.js
 * @param  {Object}   returnedUser  The returned User object containing user
 *                                  details
 * @param  {string}   newEmail      The user's new email address
 * @param  {Object}   req           The current request
 * @param  {Object}   res           The response
 * @return {res}                    Send a message back to the user regarding
 *                                  the status of updating the email address
 */
function changeUserEmail(nev, returnedUser, newEmail, req, res) {
  return nev.createTempUser(returnedUser, function(err, existingPersistentUser,
      newTempUser) {
    // An error occurred
    if (err || existingPersistentUser) {
      return res.status(500).send({
        message: messages.ERROR.GENERAL,
        refresh: false
      });
    }

    // New user creation successful; delete old one and verify email
    if (newTempUser) {
      User.deleteUser(req.user._id, function(err, deleteSuccess) {
        // An error occurred
        if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        } else if (deleteSuccess) {
          var URL = newTempUser[nev.options.URLFieldName];
          nev.sendVerificationEmail(newEmail, URL, function(err, info) {
            if (err) {
              req.logout();
              req.session.destroy(function(err) {
                if (err) {
                  return res.status(500).send({
                    message: messages.ERROR.GENERAL,
                    refresh: true
                  });
                }
                return res.status(500).send({
                  message: messages.SETTINGS.EMAIL.CHANGE_FAILED,
                  refresh: true
                });
              });
            } else {
              req.logout();
              req.session.destroy(function(err) {
                if (err) {
                  return res.status(500).send({
                    message: messages.ERROR.GENERAL,
                    refresh: true
                  });
                }
                return res.status(200).send({
                  message: messages.SETTINGS.EMAIL.CHANGE_SUCCEEDED,
                  refresh: true
                });
              });
            }
          });
        }
      });
    }
  });
}

/**
 * Modifies the user's password after verifying it is different from
 * the current password.
 * @param  {string}   currentPass The current password
 * @param  {string}   newPass     The new password
 * @param  {Object}   req         The current request
 * @param  {Object}   res         The response
 * @return {res}                  Send a message back to the user regarding
 *                                the status of updating the password
 */
function updateUserPassword(currentPass, newPass, req, res) {
  return User.findById(req.user._id, function(err, user) {
    if (err) {
      return res.status(500).send({
        message: messages.ERROR.GENERAL,
        refresh: false
      });
    } else if (user) {
      if (currentPass === newPass) {
        return res.status(200).send({
          message: messages.SETTINGS.PASSWORD.NOT_NEW,
          refresh: false
        });
      }
      user.password = newPass;
      user.save(function(err) {
        // An error occurred
        if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        }

        // Successfully changed password
        return res.status(200).send({
          message: messages.SETTINGS.PASSWORD.CHANGE_SUCCEEDED,
          refresh: true
        });
      });
    } else {
      return res.status(200).send({
        message: messages.SETTINGS.PASSWORD.CHANGE_FAILED,
        refresh: false
      });
    }
  });
}

module.exports = function(app, passport, isLoggedIn, nev) {
  // --------- Return <= 10 posts for pagination ---------
  var slicePosts = function(batches, currentPage, totalPosts, numPages) {
    var results = {
      batches: batches,
      currentPage: currentPage,
      numPages: numPages,
      startPage: null,
      endPage: null
    };

    if (totalPosts > 0) {
      var postCount = ITEMS_PER_PAGE;
      var skipCount = ITEMS_PER_PAGE * (results.currentPage - 1);
      batches.reverse().forEach(function(batch) {
        batch.posts.slice().forEach(function(post, idx, obj) {
          if (skipCount > 0) {
            skipCount--;
            batch.posts.splice(obj.length - 1 - idx, 1);
          } else if (postCount > 0) {
            postCount--;
          } else if (postCount === 0) {
            batch.posts.splice(obj.length - 1 - idx, 1);
          }
        });
      });
      results.startPage = results.currentPage - 2 > 0 ?
      results.currentPage - 2 : 1;
      results.endPage = results.startPage + (ITEMS_PER_PAGE - 1) >
      results.numPages ? results.numPages : results.startPage +
      (ITEMS_PER_PAGE - 1);
      if (results.endPage - results.numPages < results.startPage - 1) {
        results.startPage = results.endPage - results.numPages + 1;
      }
    }

    return results;
  };

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
    var numPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);

    var results = slicePosts(req.user.batches, 1, totalPosts, numPages);
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
    var numPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);
    if (currentPage === 1 || currentPage <= 0 || currentPage > numPages) {
      return res.redirect('/dashboard');
    }

    var results = slicePosts(req.user.batches, currentPage, totalPosts,
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

  app.post('/reset/:service', isLoggedIn, function(req, res) {
    var connectionName = req.params.service;
    var connectionNameLower = connectionName.toLowerCase();

    User.findById(req.user._id, function(err, user) {
      if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      }

      // Clear update time
      user.lastUpdateTime[connectionNameLower] = undefined;

      // Clear service's posts
      user.batches.forEach(function(batch) {
        batch.posts.slice().reverse().forEach(function(post, idx, obj) {
          if (post.connection === connectionNameLower) {
            batch.posts.splice(obj.length - 1 - idx, 1);
          }
        });
        // Delete batch if it has no posts after cleanup
        if (batch.posts.length === 0) {
          batch.remove();
        }
      });

      user.save(function(err) {
        if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        }
        return res.status(200).send({
          message: messages.STATUS.GENERAL.RESET_CONNECTION,
          refresh: true
        });
      });
    });
  });

  app.post('/refresh', isLoggedIn, function(req, res) {
    req.user.updateContent(function(err, posts) {
      if (err && err.toString().indexOf('400') !== -1) {
        var SERVICE = err.toString().split('-')[1];
        req.flash('connectMessage', messages.ERROR[SERVICE].REFRESH ||
          messages.ERROR.GENERAL);
        return res.status(500).send({
          message: messages.STATUS[SERVICE].ACCESS_PRIVILEGES ||
          messages.ERROR.GENERAL,
          toConnect: true
        });
      } else if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      } else if (posts) {
        return res.status(200).send({
          message: messages.STATUS.GENERAL.NEW_POSTS,
          refresh: true
        });
      }

      return res.status(200).send({
        message: messages.STATUS.GENERAL.NO_POSTS,
        refresh: false
      });
    });
  });

  app.post('/refresh/:service', isLoggedIn, function(req, res) {
    var connectionName = req.params.service;
    if (connectionName === 'facebook') {
      req.user.refreshFacebook(function(err, posts) {
        if (err && err.toString() === '400-Facebook') {
          req.flash('connectMessage', messages.ERROR.FACEBOOK.REFRESH);
          return res.status(500).send({
            message: messages.STATUS.FACEBOOK.ACCESS_PRIVILEGES,
            refresh: true
          });
        } else if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        } else if (posts) {
          return res.status(200).send({
            message: messages.STATUS.GENERAL.NEW_POSTS,
            refresh: true
          });
        }

        return res.status(200).send({
          message: messages.STATUS.GENERAL.NO_POSTS,
          refresh: false
        });
      });
    } else if (connectionName === 'youtube') {
      req.user.refreshYouTube(function(err, posts) {
        if (err && err.toString() === '400-YouTube') {
          req.flash('connectMessage', messages.ERROR.YOUTUBE.REFRESH);
          return res.status(500).send({
            message: messages.STATUS.YOUTUBE.ACCESS_PRIVILEGES,
            refresh: true
          });
        } else if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        } else if (posts) {
          return res.status(200).send({
            message: messages.STATUS.GENERAL.NEW_POSTS,
            refresh: true
          });
        }

        return res.status(200).send({
          message: messages.STATUS.GENERAL.NO_POSTS,
          refresh: false
        });
      });
    }
  });

  app.post('/toggleUpdates/:service', isLoggedIn, function(req, res) {
    var connectionName = req.params.service;
    if (connectionName === 'facebook') {
      req.user.toggleFacebook(function(err, result) {
        if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        } else if (result) {
          return res.status(200).send({
            message: result,
            refresh: true
          });
        }

        return res.status(200).send({
          message: result,
          refresh: false
        });
      });
    } else if (connectionName === 'youtube') {
      req.user.toggleYouTube(function(err, result) {
        if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        } else if (result) {
          return res.status(200).send({
            message: result,
            refresh: true
          });
        }

        return res.status(200).send({
          message: result,
          refresh: false
        });
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
      }

      return res.sendStatus(500);
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
      return res.status(200).send({
        message: messages.SETTINGS.DISPLAY_NAME.INVALID,
        refresh: false
      });
    }

    // Update user settings
    User.updateUser(req.user._id, settings, function(err, updateSuccess) {
      if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      } else if (updateSuccess) {
        return res.status(200).send({
          message: messages.SETTINGS.DISPLAY_NAME.CHANGE_SUCCEEDED,
          refresh: true
        });
      }

      return res.status(200).send({
        message: messages.SETTINGS.DISPLAY_NAME.CHANGE_FAILED,
        refresh: false
      });
    });
  });

  app.post('/settings/profile/avatar', isLoggedIn, function(req, res) {
    var avatarUrl = validator.trim(req.body.avatar);
    var settings = {};

    // Validate changes
    if (validator.isValidAvatar(avatarUrl)) {
      settings.avatar = avatarUrl;
    } else {
      return res.status(200).send({
        message: messages.SETTINGS.AVATAR.INVALID,
        refresh: false
      });
    }

    // Update user settings
    User.updateUser(req.user._id, settings, function(err, updateSuccess) {
      if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      } else if (updateSuccess) {
        return res.status(200).send({
          message: messages.SETTINGS.AVATAR.CHANGE_SUCCEEDED,
          refresh: true
        });
      }

      return res.status(200).send({
        message: messages.SETTINGS.AVATAR.CHANGE_FAILED,
        refresh: false
      });
    });
  });

  app.post('/settings/profile/avatar/reset', isLoggedIn, function(req, res) {
    // Reset user's avatar to use Gravatar
    User.resetAvatar(req.user._id, req.user.email, function(err,
        updateSuccess) {
      if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      } else if (updateSuccess) {
        return res.status(200).send({
          message: messages.SETTINGS.AVATAR.RESET_SUCCEEDED,
          refresh: true
        });
      }

      return res.status(200).send({
        message: messages.SETTINGS.AVATAR.RESET_FAILED,
        refresh: false
      });
    });
  });

  app.post('/settings/account/email', isLoggedIn, function(req, res) {
    // Clean and verify form input
    var newEmail = validator.trim(req.body.email);

    // Validate changes
    if (!validator.isEmail(newEmail) || newEmail.length === 0) {
      return res.status(200).send({
        message: messages.SETTINGS.EMAIL.INVALID,
        refresh: false
      });
    }

    User.findOne({_id: req.user._id}, function(err, returnedUser) {
      if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      }
      returnedUser.email = newEmail;
      return changeUserEmail(nev, returnedUser, newEmail, req, res);
    });
  });

  app.post('/settings/account/password', isLoggedIn, function(req, res) {
    var currentPass = validator.trim(req.body.currentPass);
    var newPass = validator.trim(req.body.newPass);
    var newPassConfirm = validator.trim(req.body.newPassConfirm);
    var settings = {};

    // Validate changes
    if (newPass !== newPassConfirm) {
      return res.status(200).send({
        message: messages.SETTINGS.PASSWORD.NO_MATCH,
        refresh: false
      });
    } else if (validator.isValidPassword(newPass)) {
      settings.password = newPass;
      User.findById(req.user._id, function(err, user) {
        if (err) {
          return res.status(500).send({
            message: messages.ERROR.GENERAL,
            refresh: false
          });
        }
        user.comparePassword(currentPass, function(err, isMatch) {
          if (err) {
            return res.status(500).send({
              message: messages.ERROR.GENERAL,
              refresh: false
            });
          } else if (isMatch) {
            // Update user settings
            return updateUserPassword(currentPass, newPass, req, res);
          }

          return res.status(200).send({
            message: messages.SETTINGS.PASSWORD.UNAUTHORIZED,
            refresh: false
          });
        });
      });
    } else {
      return res.status(200).send({
        message: messages.SETTINGS.PASSWORD.INVALID,
        refresh: false
      });
    }
  });

  app.post('/settings/account/delete', isLoggedIn, function(req, res) {
    var connected = req.user.facebook.profileId !== undefined ||
    req.user.youtube.profileId !== undefined;

    if (connected) {
      return res.status(200).send({
        message: messages.SETTINGS.ACCOUNT.CONNECTIONS_ACTIVE,
        refresh: false
      });
    }

    User.deleteUser(req.user._id, function(err, deleteSuccess) {
      if (err) {
        return res.status(500).send({
          message: messages.ERROR.GENERAL,
          refresh: false
        });
      } else if (deleteSuccess) {
        return res.status(200).send({
          message: messages.SETTINGS.ACCOUNT.DELETE_SUCCEEDED,
          refresh: true
        });
      }

      return res.status(200).send({
        message: messages.SETTINGS.ACCOUNT.DELETE_FAILED,
        refresh: false
      });
    });
  });

  // --------- User's Connected Sites ---------
  app.get('/connect', isLoggedIn, function(req, res) {
    res.render('connect', {
      message: req.flash('connectMessage'),
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
      // An error occurred
      if (err) {
        req.flash('registerMessage', err.toString());
        return res.redirect('/register');
      }
      // Redirect to login
      if (newPersistentUser) {
        req.flash('loginMessage', messages.SETTINGS.EMAIL.VERIFIED);
        return res.redirect('/login');
      }

      // Redirect to register page
      req.flash('registerMessage',
        messages.SETTINGS.EMAIL.VERIFICATION_EXPIRED);
      return res.redirect('/register');
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
      // An error occurred
      if (err) {
        req.flash('registerMessage', err.toString());
        return res.redirect('/register');
      }

      // Redirect to login
      if (userFound) {
        req.flash('loginMessage', messages.SETTINGS.EMAIL.VERIFICATION_RESENT);
        return res.redirect('/login');
      }

      // Redirect to register page
      req.flash('registerMessage', messages.SETTINGS.EMAIL.INCORRECT);
      return res.redirect('/register');
    });
  });
};
