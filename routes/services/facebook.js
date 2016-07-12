// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var handlers = require.main.require('./routes/services/serviceHandlers');

module.exports = function(app, passport, isLoggedIn) {
  ['page', 'group'].forEach(function(type) {
    var plural = type + 's';
    var path = '/setup/facebook/' + plural;
    app.get(path, isLoggedIn, function(req, res) {
      User.setUpFacebookGroups(req.user._id, function(err, allContent,
          existingContent) {
        var settings = {name: 'Facebook', singular: type};
        handlers.retrieveActivity(settings, err, allContent, existingContent,
          req, res);
      });
    });
  });
};
