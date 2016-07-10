// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation')(validator);
var messages = require.main.require('./config/messages');

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
    User.setUpFacebookGroups(req.user._id, function(err, allGroups,
        existingGroups) {
      // An error occurred
      if (err) {
        // Get new access token if current token was deemed invalid
        if (err.toString() === '400-Facebook') {
          req.flash('serviceMessage', messages.ERROR.FACEBOOK.REFRESH);
        } else {
          req.flash('serviceMessage', err.toString());
        }
        res.redirect('/services');
      // Found groups
      } else if (Object.keys(allGroups).length > 0) {
        // Fill in checkboxes for existing groups
        if (existingGroups.length > 0) {
          var groupIds = [];

          existingGroups.forEach(function(group) {
            groupIds.push(group.groupId);
          });

          for (var key in allGroups) {
            if (groupIds.indexOf(allGroups[key].id) > -1) {
              allGroups[key].checked = true;
            } else {
              allGroups[key].checked = false;
            }
          }
        }

        res.render('facebook-setup', {
          message: req.flash('setupMessage'),
          content: allGroups,
          contentName: 'groups'
        });
      // No groups found; return to services page
      } else {
        req.flash('serviceMessage', messages.ERROR.FACEBOOK.REAUTH.GROUPS);
        res.redirect('/services');
      }
    });
  });

  app.post('/setup/facebook/groups', isLoggedIn, function(req, res) {
    User.saveFacebookGroups(req.user._id, Object.keys(req.body),
      function(err, data) {
        // An error occurred
        if (err) {
          req.flash('setupMessage', err.toString());
          res.redirect('/setup/facebook/groups');
        } else {
          // Saved groups; return to services page
          req.flash('serviceMessage', messages.STATUS.FACEBOOK.GROUPS_UPDATED);
          res.redirect('/services');
        }
      });
  });

  app.get('/setup/facebook/pages', isLoggedIn, function(req, res) {
    User.setUpFacebookPages(req.user._id, function(err, allPages,
        existingPages) {
      // An error occurred
      if (err) {
        // Get new access token if current token was deemed invalid
        if (err.toString() === '400-Facebook') {
          req.flash('serviceMessage', messages.ERROR.FACEBOOK.REFRESH);
        } else {
          req.flash('serviceMessage', err.toString());
        }
        res.redirect('/services');
      } else if (Object.keys(allPages).length > 0) {
        // Fill in checkboxes for existing pages
        if (existingPages.length > 0) {
          var pageIds = [];

          existingPages.forEach(function(page) {
            pageIds.push(page.pageId);
          });

          for (var key in allPages) {
            if (pageIds.indexOf(allPages[key].id) > -1) {
              allPages[key].checked = true;
            } else {
              allPages[key].checked = false;
            }
          }
        }

        res.render('facebook-setup', {
          message: req.flash('setupMessage'),
          content: allPages,
          contentName: 'pages'
        });
      } else {
        // No pages found; return to services page
        req.flash('serviceMessage', messages.ERROR.FACEBOOK.REAUTH.PAGES);
        res.redirect('/services');
      }
    });
  });

  app.post('/setup/facebook/pages', isLoggedIn, function(req, res) {
    User.saveFacebookPages(req.user._id, Object.keys(req.body), function(err,
        data) {
      // An error occurred
      if (err) {
        req.flash('setupMessage', err.toString());
        res.redirect('/setup/facebook/pages');
      } else {
        // Saved pages; return to services page
        req.flash('serviceMessage', messages.STATUS.FACEBOOK.PAGES_UPDATED);
        res.redirect('/services');
      }
    });
  });

  app.get('/services/remove/facebook', isLoggedIn, function(req, res) {
    User.removeFacebook(req.user.id, function(err) {
      // Get new access token if current token was deemed invalid
      if (err && err.toString() === '400-Facebook') {
        req.flash('serviceMessage', messages.ERROR.FACEBOOK.REFRESH);
      } else {
        req.flash('serviceMessage', messages.STATUS.FACEBOOK.REMOVED);
      }
      res.redirect('/services');
    });
  });
};
