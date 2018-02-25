// --------- Dependencies ---------
let User = require.main.require('./models/user');
let validator = require('validator');
require.main.require('./config/custom-validation')(validator);
let handlers = require.main.require('./routes/services/handlers');

module.exports = function(app, passport, isLoggedIn) {
  app.get('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
    User.setUpYouTubeSubs(req.user._id, function(err, allContent,
        existingContent) {
      let settings = {
        name: 'YouTube',
        error: 'Error: Refreshed Access Token',
        singular: 'subscription'
      };
      handlers.retrieveActivity(settings, err, allContent, existingContent, req,
        res);
    });
  });
};
