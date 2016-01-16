// --------- Dependencies ---------
var User = require('../models/user');
var validator = require('validator');
require('../config/custom-validation.js')(validator);

module.exports = function(app, passport, isLoggedIn) {

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
            posts: req.user.posts
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

    app.post('/dismiss/all', isLoggedIn, function(req, res) {
        User.findByIdAndUpdate(req.user._id, {
            $set: {
                'posts': []
            }
        }, function(err, user) {
            if (err) return res.sendStatus(500);
            return res.sendStatus(200);
        });
    });

    app.post('/dismiss/:id', isLoggedIn, function(req, res) {
        User.findByIdAndUpdate(req.user._id, {
            $pull: {
                'posts': {
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
};
