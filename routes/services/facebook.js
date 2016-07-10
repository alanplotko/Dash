// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var messages = require.main.require('./config/messages');
var handlers = require.main.require('./routes/services/serviceHandlers');

module.exports = function(app, passport, isLoggedIn) {
  app.get('/services/auth/facebook', isLoggedIn, function(req, res, next) {
    req.session.reauth = false;
    next();
  }, passport.authenticate('facebook', {
    scope: ['user_managed_groups', 'user_likes']
  }));

  app.get('/services/auth/facebook/callback', isLoggedIn,
    passport.authenticate('facebook', {
      failureRedirect: '/services',
      successRedirect: '/services'
    }));

  app.get('/services/reauth/facebook/', isLoggedIn, function(req, res, next) {
    req.session.reauth = true;
    next();
  }, passport.authenticate('facebook', {
    authType: 'rerequest',
    scope: ['user_managed_groups', 'user_likes']
  }));

  app.get('/services/refresh_token/facebook', isLoggedIn, function(req, res,
      next) {
    req.session.refreshAccessToken = true;
    next();
  }, passport.authenticate('facebook'));

  app.get('/setup/facebook/groups', isLoggedIn, function(req, res) {
    User.setUpFacebookGroups(req.user._id, function(err, allContent,
        existingContent) {
      var settings = {name: 'Facebook', error: '400-Facebook'};
      var type = {id: 'groupId', name: 'groups'};
      handlers.retrieveActivity(err, settings, allContent, existingContent,
        type, req, res);
    });
  });

  app.post('/setup/facebook/groups', isLoggedIn, function(req, res) {
    User.saveFacebookGroups(req.user._id, Object.keys(req.body),
      function(err, data) {
        handlers.handlePostSave('/setup/facebook/groups',
          messages.STATUS.FACEBOOK.GROUPS_UPDATED, err, req, res);
      });
  });

  app.get('/setup/facebook/pages', isLoggedIn, function(req, res) {
    User.setUpFacebookPages(req.user._id, function(err, allContent,
        existingContent) {
      var settings = {name: 'Facebook', error: '400-Facebook'};
      var type = {id: 'pageId', name: 'pages'};
      handlers.retrieveActivity(err, settings, allContent, existingContent,
        type, req, res);
    });
  });

  app.post('/setup/facebook/pages', isLoggedIn, function(req, res) {
    User.saveFacebookPages(req.user._id, Object.keys(req.body), function(err,
      data) {
      handlers.handlePostSave('/setup/facebook/pages',
        messages.STATUS.FACEBOOK.PAGES_UPDATED, err, req, res);
    });
  });

  app.get('/services/remove/facebook', isLoggedIn, function(req, res) {
    User.removeFacebook(req.user.id, function(err) {
      handlers.handlePostRemoveError('Facebook', err, '400-Facebook', req, res);
    });
  });
};
