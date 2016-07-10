// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var messages = require.main.require('./config/messages');
var handlers = require.main.require('./routes/services/serviceHandlers');

module.exports = function(app, passport, isLoggedIn) {
  app.get('/services/auth/youtube', isLoggedIn,
    passport.authenticate('youtube', {
      scope: [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.readonly'
      ]
    }));

  app.get('/services/auth/youtube/callback', isLoggedIn,
    passport.authenticate('youtube', {
      failureRedirect: '/services',
      successRedirect: '/services'
    }));

  app.get('/services/reauth/youtube', isLoggedIn, function(req, res, next) {
    req.session.reauth = true;
    next();
  }, passport.authenticate('youtube', {
    scope: [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  }));

  app.get('/services/refresh_token/youtube', isLoggedIn, function(req, res,
      next) {
    req.session.refreshAccessToken = true;
    next();
  }, passport.authenticate('youtube'));

  app.get('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
    User.setUpYouTubeSubs(req.user._id, function(err, allSubscriptions,
        existingSubscriptions) {
      // An error occurred
      if (err) {
        // Retry request if access token was refreshed successfully
        handlers.handlePostSetupError('YouTube', err,
          'Error: Refreshed Access Token', req, res);
      } else if (allSubscriptions && Object.keys(allSubscriptions).length > 0) {
        // Fill in checkboxes for existing subscriptions
        if (existingSubscriptions.length > 0) {
          var subIds = [];

          existingSubscriptions.forEach(function(subscription) {
            subIds.push(subscription.subId);
          });

          for (var key in allSubscriptions) {
            if (subIds.indexOf(allSubscriptions[key].id) > -1) {
              allSubscriptions[key].checked = true;
            } else {
              allSubscriptions[key].checked = false;
            }
          }
        }

        res.render('youtube-setup', {
          message: req.flash('setupMessage'),
          content: allSubscriptions,
          contentName: 'subscriptions'
        });
      } else {
        // No subscriptions found; return to services page
        req.flash('serviceMessage',
          messages.ERROR.YOUTUBE.REAUTH.SUBSCRIPTIONS);
        res.redirect('/services');
      }
    });
  });

  app.post('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
    User.saveYouTubeSubs(req.user._id, Object.keys(req.body), function(err,
        data) {
      var settings = {
        error: {
          target: 'setupMessage',
          redirect: '/setup/youtube/subscriptions'
        },
        success: {
          target: 'serviceMessage',
          message: messages.STATUS.YOUTUBE.SUBSCRIPTIONS_UPDATED,
          redirect: '/services'
        }
      };
      handlers.handlePostSave(settings, err, req, res);
    });
  });

  app.get('/services/remove/youtube', isLoggedIn, function(req, res) {
    User.removeYouTube(req.user.id, function(err) {
      handlers.handlePostRemoveError('YouTube', err, '400-YouTube', req, res);
    });
  });
};
