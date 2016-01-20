// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);

module.exports = function(app, passport, isLoggedIn) {

    app.get('/connect/auth/facebook', isLoggedIn, passport.authenticate('facebook', { 
        scope: ['user_managed_groups', 'user_likes']
    }));

    app.get('/connect/auth/facebook/callback', isLoggedIn, passport.authenticate('facebook', {
        failureRedirect: '/connect',
        successRedirect: '/setup/facebook/groups'
    }));

    app.get('/setup/facebook/groups', isLoggedIn, function(req, res) {
        User.setUpFacebookGroups(req.user._id, function(err, allGroups, existingGroups) {
            // An error occurred
            if (err)
            {
                req.flash('setupMessage', err.toString());
                res.redirect('/setup/facebook/groups');
            }
            // Found groups
            else if (Object.keys(allGroups).length > 0)
            {
                var editingMode = false;

                // Fill in checkboxes for existing groups
                if (existingGroups.length > 0)
                {
                    var groupIds = [];
                    editingMode = true;

                    existingGroups.forEach(function(group) {
                        groupIds.push(group.groupId);
                    });

                    for (var key in allGroups)
                    {
                        if (groupIds.indexOf(allGroups[key].id) > -1)
                        {
                            allGroups[key].checked = true;
                        }
                        else
                        {
                            allGroups[key].checked = false;
                        }
                    }
                }

                res.render('facebook-setup', {
                    message: req.flash('setupMessage'),
                    content: allGroups,
                    contentName: 'groups',
                    editingMode: editingMode
                });
            }
            // No groups found; proceed to pages
            else
            {
                res.redirect('/setup/facebook/pages');
            }
        });
    });

    app.post('/setup/facebook/groups', isLoggedIn, function(req, res) {
        // Determine whether user is editing their settings
        var editingMode = validator.escape(req.body.editingMode);
        delete req.body.editingMode;
        
        User.saveFacebookGroups(req.user._id, Object.keys(req.body), function(err, data) {
            // An error occurred
            if (err)
            {
                req.flash('setupMessage', err.toString());
                res.redirect('/setup/facebook/groups');
            }
            // Saved groups
            else
            {
                if (editingMode && editingMode === 'true' && !req.session.flash.connectMessage)
                {
                    req.flash('connectMessage', 'Your Facebook settings have been updated.');
                }
                res.redirect('/setup/facebook/pages');
            }
        });
    });

    app.get('/setup/facebook/pages', isLoggedIn, function(req, res) {
        User.setUpFacebookPages(req.user._id, function(err, allPages, existingPages) {
            // An error occurred
            if (err)
            {
                req.flash('setupMessage', err.toString());
                res.redirect('/setup/facebook/groups');
            }
            // Found groups
            else if (Object.keys(allPages).length > 0)
            {
                var editingMode = false;

                // Fill in checkboxes for existing groups
                if (existingPages.length > 0)
                {
                    var pageIds = [];
                    editingMode = true;

                    existingPages.forEach(function(page) {
                        pageIds.push(page.pageId);
                    });

                    for (var key in allPages)
                    {
                        if (pageIds.indexOf(allPages[key].id) > -1)
                        {
                            allPages[key].checked = true;
                        }
                        else
                        {
                            allPages[key].checked = false;
                        }
                    }
                }

                res.render('facebook-setup', {
                    message: req.flash('setupMessage'),
                    content: allPages,
                    contentName: 'pages',
                    editingMode: editingMode
                });
            }
            // No pages found; proceed to connect page
            else
            {
                res.redirect('/connect');
            }
        });
    });

    app.post('/setup/facebook/pages', isLoggedIn, function(req, res) {
        // Determine whether user is editing their settings
        var editingMode = validator.escape(req.body.editingMode);
        delete req.body.editingMode;

        User.saveFacebookPages(req.user._id, Object.keys(req.body), function(err, data) {
            // An error occurred
            if (err)
            {
                req.flash('setupMessage', err.toString());
                res.redirect('/setup/facebook/pages');
            }
            // Saved pages; return to connect page
            else
            {
                if (editingMode && editingMode === 'true' && !req.session.flash.connectMessage)
                {
                    req.flash('connectMessage', 'Your Facebook settings have been updated.');
                }
                res.redirect('/connect');
            }
        });
    });

    app.get('/connect/remove/facebook', isLoggedIn, function(req, res) {
        User.removeFacebook(req.user.id, function(err) {
            if (err)
            {
                req.flash('connectMessage', err.toString());
            }
            else
            {
                req.flash('connectMessage', 'Your Facebook connection has been removed.');
            }
            res.redirect('/connect');
        });
    });
}