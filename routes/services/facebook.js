// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var handlers = require.main.require('./routes/services/handlers');

module.exports = function(app, passport, isLoggedIn) {
  ['page', 'group'].forEach(function(type) {
    var plural = type + 's';
    var path = '/setup/facebook/' + plural;
    var formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
    app.get(path, isLoggedIn, function(req, res) {
      User['setUpFacebook' + formatted](req.user._id, function(err, allContent,
          existingContent) {
        var settings = {name: 'Facebook', singular: type};
        handlers.retrieveActivity(settings, err, allContent, existingContent,
          req, res);
      });
    });
  });
};
