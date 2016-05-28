/*jshint esversion: 6 */

// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);
const error_messages = require.main.require('./config/error-messages.js');

module.exports = function(app, passport, isLoggedIn) {

    app.get('/connect/auth/facebook', isLoggedIn, function(req, res, next) {
        req.session.reauth = false;
        next();
    }, passport.authenticate('facebook', {
        scope: ['user_managed_groups', 'user_likes']
    }));

    app.get('/connect/auth/facebook/callback', isLoggedIn,
        passport.authenticate('facebook', {
            failureRedirect: '/connect',
            successRedirect: '/connect'
    }));

    app.get('/connect/reauth/facebook/', isLoggedIn, function(req, res, next) {
        req.session.reauth = true;
        next();
    }, passport.authenticate('facebook', {
        authType: 'rerequest',
        scope: ['user_managed_groups', 'user_likes']
    }));

    app.get('/connect/refresh_token/facebook', isLoggedIn, function(req,
        res, next) {
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
                        req.flash('connectMessage',
                            error_messages.Facebook.refresh);
                    } else {
                        req.flash('connectMessage', err.toString());
                    }
                    res.redirect('/connect');
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
                // No groups found; return to connect page
                } else {
                    req.flash('connectMessage',
                        error_messages.Facebook.reauth.groups);
                    res.redirect('/connect');
                }
            }
        );
    });

    app.post('/setup/facebook/groups', isLoggedIn, function(req, res) {
        User.saveFacebookGroups(req.user._id, Object.keys(req.body),
            function(err, data) {
                // An error occurred
                if (err) {
                    req.flash('setupMessage', err.toString());
                    res.redirect('/setup/facebook/groups');
                // Saved groups; return to connect page
                } else {
                    req.flash('connectMessage',
                        'Your Facebook groups have been updated.');
                    res.redirect('/connect');
                }
            }
        );
    });

    app.get('/setup/facebook/pages', isLoggedIn, function(req, res) {
        User.setUpFacebookPages(req.user._id, function(err, allPages,
            existingPages) {
                // An error occurred
                if (err) {
                    // Get new access token if current token was deemed invalid
                    if (err.toString() === '400-Facebook') {
                        req.flash('connectMessage',
                            error_messages.Facebook.refresh);
                    } else {
                        req.flash('connectMessage', err.toString());
                    }
                    res.redirect('/connect');
                // Found pages
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
                // No pages found; return to connect page
                } else {
                    req.flash('connectMessage',
                        error_messages.Facebook.reauth.pages);
                    res.redirect('/connect');
                }
            }
        );
    });

    app.post('/setup/facebook/pages', isLoggedIn, function(req, res) {
        User.saveFacebookPages(req.user._id, Object.keys(req.body),
            function(err, data) {
                // An error occurred
                if (err) {
                    req.flash('setupMessage', err.toString());
                    res.redirect('/setup/facebook/pages');
                // Saved pages; return to connect page
                } else {
                    req.flash('connectMessage',
                        'Your Facebook pages have been updated.');
                    res.redirect('/connect');
                }
            }
        );
    });

    app.get('/connect/remove/facebook', isLoggedIn, function(req, res) {
        User.removeFacebook(req.user.id, function(err) {
            // Get new access token if current token was deemed invalid
            if (err) {
                if (err.toString() === '400-Facebook') {
                    req.flash('connectMessage',
                        error_messages.Facebook.refresh);
                }
            } else {
                req.flash('connectMessage',
                    'Your Facebook connection has been removed.');
            }
            res.redirect('/connect');
        });
    });
};
