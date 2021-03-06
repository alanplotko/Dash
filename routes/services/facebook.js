// --------- Dependencies ---------
let User = require.main.require('./models/user');
let validator = require('validator');
require.main.require('./config/custom-validation')(validator);
let handlers = require.main.require('./routes/services/handlers');

module.exports = function(app, passport, isLoggedIn) {
  ['page', 'group'].forEach(function(type) {
    let plural = type + 's';
    let path = '/setup/facebook/' + plural;
    let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
    app.get(path, isLoggedIn, function(req, res) {
      User['setUpFacebook' + formatted](req.user._id, function(err, allContent,
          existingContent) {
        let settings = {name: 'Facebook', singular: type};
        handlers.retrieveActivity(settings, err, allContent, existingContent,
          req, res);
      });
    });
  });
};
