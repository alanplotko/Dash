// --------- Dependencies ---------
let User = require.main.require('./models/user');
let validator = require('validator');
require.main.require('./config/custom-validation')(validator);
let routes = require.main.require('./config/service-routes');
let handlers = require.main.require('./routes/services/handlers');

module.exports = function(app, passport, isLoggedIn) {
  /**
   * Common POST setup routes for services
   */
  routes.SETUP.forEach(function(SERVICE) {
    let path = '/setup/' + SERVICE.NAME.toLowerCase() + '/' + SERVICE.ROUTE;
    app.post(path, isLoggedIn, function(req, res) {
      User[SERVICE.METHOD](req.user._id, Object.keys(req.body), function(err,
          data) {
        handlers.handlePostSave(path, SERVICE.MESSAGE, err, req, res);
      });
    });
  });

  /**
   * Common GET remove routes for services
   */
  routes.REMOVE.forEach(function(SERVICE) {
    let path = '/services/remove/' + SERVICE.NAME.toLowerCase();
    app.get(path, isLoggedIn, function(req, res) {
      User[SERVICE.METHOD](req.user.id, function(err) {
        handlers.handlePostRemoveError(SERVICE.NAME, err, '400-' + SERVICE.NAME,
          req, res);
      });
    });
  });

  /**
   * Common GET auth and reauth routes for services
   */
  routes.AUTHENTICATION.forEach(function(SERVICE) {
    ['auth', 'reauth'].forEach(function(route) {
      let path = '/services/' + route + '/' + SERVICE.NAME.toLowerCase();
      let passportSettings = {
        scope: SERVICE.SCOPE
      };
      if (SERVICE.NAME.toLowerCase() === 'facebook' && route === 'reauth') {
        passportSettings.authType = 'rerequest';
      }
      app.get(path, isLoggedIn, function(req, res, next) {
        handlers.handleSessionFlag(route.toUpperCase(), req, res, next);
      }, passport.authenticate(SERVICE.NAME.toLowerCase(), passportSettings));
    });
  });

  /**
   * Common GET authentication callback routes for services
   */
  routes.AUTH_CALLBACK.forEach(function(SERVICE) {
    let path = '/services/auth/' + SERVICE.toLowerCase() + '/callback';
    app.get(path, isLoggedIn, passport.authenticate(SERVICE.toLowerCase(), {
      failureRedirect: '/services',
      successRedirect: '/services'
    }));
  });

  /**
   * Common GET refresh token routes for services
   */
  routes.REFRESH_TOKEN.forEach(function(SERVICE) {
    let path = '/services/refresh_token/' + SERVICE.toLowerCase();
    app.get(path, isLoggedIn, function(req, res, next) {
      handlers.handleSessionFlag('REFRESH_TOKEN', req, res, next);
    }, passport.authenticate(SERVICE.toLowerCase()));
  });
};
