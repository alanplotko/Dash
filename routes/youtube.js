// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var messages = require.main.require('./config/messages');

module.exports = function(app, passport, isLoggedIn) {
  app.get('/connect/auth/youtube', isLoggedIn,
    passport.authenticate('youtube', {
      scope: [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.readonly'
      ]
    }));

  app.get('/connect/auth/youtube/callback', isLoggedIn,
    passport.authenticate('youtube', {
      failureRedirect: '/connect',
      successRedirect: '/connect'
    }));

  app.get('/connect/reauth/youtube', isLoggedIn, function(req, res, next) {
    req.session.reauth = true;
    next();
  }, passport.authenticate('youtube', {
    scope: [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  }));

  app.get('/connect/refresh_token/youtube', isLoggedIn, function(req, res,
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
        if (err.toString() === 'Error: Refreshed Access Token') {
          res.redirect('/setup/youtube/subscriptions');
        } else {
          req.flash('connectMessage', err.toString());
          res.redirect('/connect');
        }
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
        // No subscriptions found; return to connect page
        req.flash('connectMessage',
          messages.ERROR.YOUTUBE.REAUTH.SUBSCRIPTIONS);
        res.redirect('/connect');
      }
    });
  });

  app.post('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
    User.saveYouTubeSubs(req.user._id, Object.keys(req.body), function(err,
        data) {
      // An error occurred
      if (err) {
        req.flash('setupMessage', err.toString());
        res.redirect('/setup/youtube/subscriptions');
      } else {
        // Saved subscriptions; return to connect page
        req.flash('connectMessage',
          messages.STATUS.YOUTUBE.SUBSCRIPTIONS_UPDATED);
        res.redirect('/connect');
      }
    });
  });

  app.get('/connect/remove/youtube', isLoggedIn, function(req, res) {
    User.removeYouTube(req.user.id, function(err) {
      // Get new access token if current token was deemed invalid
      if (err && err.toString() === '400-YouTube') {
        req.flash('connectMessage', messages.ERROR.YOUTUBE.REFRESH);
      } else {
        req.flash('connectMessage', messages.STATUS.YOUTUBE.REMOVED);
      }
      res.redirect('/connect');
    });
  });
};
