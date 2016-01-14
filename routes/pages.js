// --------- Dependencies ---------
var User = require('../models/user');
var validator = require('validator');
require('../config/custom-validation.js')(validator);
var xss = require('xss');
var debug = (process.env.NODE_ENV == 'dev');

module.exports = function(app, passport) {

    // --------- Front Page ---------
    app.get('/', function (req, res) {
        if (req.isAuthenticated()) return res.redirect('/dashboard');
        res.render('index');
    });

    // --------- User Dashboard ---------
     app.get('/dashboard', isLoggedIn, function(req, res) {
        res.render('dashboard', {
            // Add other connection fields here
            connected: req.user.facebook.profileId !== undefined,
            facebookPosts: req.user.facebook.posts
        });
    });

    app.post('/refresh', isLoggedIn, function(req, res) {
        req.user.updateContent(function(err, posts) {
            if (err)
            {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a few minutes.'
                });
            }
            else if (posts)
            {
                return res.status(200).send({
                    message: 'New posts! Loading them in...',
                    refresh: true
                });
            }
            else
            {
                return res.status(200).send({
                    message: 'No new posts.',
                    refresh: false
                });
            }
        });
    });

    app.post('/dismiss/facebook/all', isLoggedIn, function(req, res) {
        User.findByIdAndUpdate(req.user._id, {
            $set: {
                'facebook.posts': []
            }
        }, function(err, user) {
            if (err) return res.sendStatus(500);
            return res.sendStatus(200);
        });
    });

    app.post('/dismiss/facebook/:id', isLoggedIn, function(req, res) {
        User.findByIdAndUpdate(req.user._id, {
            $pull: {
                'facebook.posts': {
                    _id: req.params.id
                }
            }
        }, function(err, user) {
            if (err) return res.sendStatus(500);
            return res.sendStatus(200);
        });
    });

    // --------- User's Settings ---------
    app.get('/settings', isLoggedIn, function(req, res) {
        res.render('settings', {
            message: req.flash('settingsMessage')
        });
    });

    app.post('/settings', isLoggedIn, function(req, res) {
        var displayName = validator.trim(req.body.displayName);
        var settings = {};
        
        // Validate changes
        if (validator.isValidDisplayName(displayName))
        {
            settings.displayName = displayName;
        }

        // Update user settings
        User.updateUser(req.user._id, settings, function(err, updateSuccess) {
            // An error occurred
            if (err)
            {
                req.flash('settingsMessage', err.toString());
            }
            // Update succeeded
            else if (updateSuccess)
            {
                req.flash('settingsMessage', 'Your changes have been saved.');
            }
            // An unexpected error occurred
            else
            {
                req.flash('settingsMessage', 'An error occurred. Please try again in a few minutes.');
            }

            return res.redirect('/settings');
        });
    });

    // --------- User's Connected Sites ---------
    app.get('/connect', isLoggedIn, function(req, res) {
        res.render('connect', {
            message: req.flash('connectMessage'),
            facebook: req.user.facebook.profileId
        });
    });

    app.get('/setup/facebook/groups', isLoggedIn, function(req, res) {
        User.setUpFacebookGroups(req.user._id, function(err, data) {
            // An error occurred
            if (err)
            {
                req.flash('setupMessage', err.toString());
                res.redirect('/setup/facebook/groups');
            }
            // Found groups
            else if (Object.keys(data).length > 0)
            {
                res.render('setup', {
                    message: req.flash('setupMessage'),
                    content: data,
                    contentName: 'groups'
                });
            }
            // No groups found; proceed to pages
            else
            {;
                res.redirect('/setup/facebook/pages');
            }
        });
    });

    app.post('/setup/facebook/groups', isLoggedIn, function(req, res) {
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
                res.redirect('/setup/facebook/pages');
            }
        });
    });

    app.get('/setup/facebook/pages', isLoggedIn, function(req, res) {
        User.setUpFacebookPages(req.user._id, function(err, data) {
            // An error occurred
            if (err)
            {
                req.flash('setupMessage', err.toString());
                res.redirect('/setup/facebook/groups');
            }
            // Found groups
            else if (Object.keys(data).length > 0)
            {
                res.render('setup', {
                    message: req.flash('setupMessage'),
                    content: data,
                    contentName: 'pages'
                });
            }
            // No groups found; proceed to pages
            else
            {
                res.redirect('/connect');
            }
        });
    });

    app.post('/setup/facebook/pages', isLoggedIn, function(req, res) {
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
                res.redirect('/connect');
            }
        });
    });

    app.get('/connect/auth/facebook', passport.authenticate('facebook', { 
        scope: ['user_managed_groups', 'user_likes']
    }));

    app.get('/connect/auth/facebook/callback', passport.authenticate('facebook', {
        failureRedirect: '/connect',
        successRedirect: '/setup/facebook/groups'
    }));

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

    // --------- Dash Login/Logout ---------

    app.get('/login', function(req, res) {
        if (req.isAuthenticated())
        {
            return res.redirect('/dashboard');
        }
        else
        {
            res.render('login', {
                message: req.flash('loginMessage')
            });
        }
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/dashboard',
        failureRedirect : '/login',
        failureFlash : true
    }));

    // Clear credentials and destroy session upon logout
    app.get('/logout', function(req, res) {
        req.logout();
        req.session.destroy(function (err) {
            res.redirect('/');
        });
    });

    // --------- Dash Registration ---------

    app.get('/register', function(req, res) {
        res.render('register', { message: req.flash('registerMessage') });
    });

    app.post('/register', passport.authenticate('local-register', {
        successRedirect : '/dashboard',
        failureRedirect : '/register',
        failureFlash : true
    }));


    // --------- Miscellaneous Routes & Helper Functions ---------

    // Route middleware to ensure user is logged in
    function isLoggedIn(req, res, next) {
        // Proceed if user is authenticated
        if (req.isAuthenticated())
            return next();
        // Otherwise, redirect to front page
        res.redirect('/');
    }

    /*================================================================
     *  If the route does not exist (error 404), go to the error 
     *  page. This route must remain as the last defined route, so
     *  that other routes are not overridden!
    ==================================================================*/
    app.all('*', function(req, res, next) {
        var err = new Error();
        err.status = 404;
        err.message = 'Page Not Found';
        err.description = 'That\'s strange... we couldn\'t find what you were looking for.<br /><br />If you\'re sure that you\'re in the right place, let the team know.<br /><br />Otherwise, if you\'re lost, you can find your way back to the front page using the button below.';
        next(err);
    });
};
