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
        res.render('dashboard');
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
                req.flash('settingsMessage', err.toString())
            }
            // Update succeeded
            if (updateSuccess)
            {
                req.flash('settingsMessage', 'Your changes have been saved.')
            }
            // An unexpected error occurred
            else
            {
                req.flash('settingsMessage', 'An error occurred. Please try again in a few minutes.')
            }

            return res.redirect('/settings');
        });
    });

    // --------- User's Connected Sites ---------
    app.get('/connections', isLoggedIn, function(req, res) {
        res.render('connections');
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
