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
    User.setUpYouTubeSubs(req.user._id, function(err, allContent,
        existingContent) {
      var settings = {
        name: 'YouTube',
        error: 'Error: Refreshed Access Token',
        singular: 'subscription'
      };
      handlers.retrieveActivity(settings, err, allContent, existingContent, req,
        res);
    });
  });

  app.post('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
    User.saveYouTubeSubs(req.user._id, Object.keys(req.body), function(err,
        data) {
      handlers.handlePostSave('/setup/youtube/subscriptions',
        messages.STATUS.YOUTUBE.SUBSCRIPTIONS_UPDATED, err, req, res);
    });
  });

  app.get('/services/remove/youtube', isLoggedIn, function(req, res) {
    User.removeYouTube(req.user.id, function(err) {
      handlers.handlePostRemoveError('YouTube', err, '400-YouTube', req, res);
    });
  });
};
