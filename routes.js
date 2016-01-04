// --------- Dependencies ---------
var path = require('path');
var User = require('./models/user');
var validator = require('validator');
var xss = require('xss');
var debug = (process.env.NODE_ENV == 'dev');

module.exports = function(app, passport) {

    // Define custom validation function for a password
    validator.extend('isValidPassword', function (str) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%\^&*\"\>\<\ \'\~\`\:\;\?\/\\\\{\}\[\]\|\,\.)(+=._-]{8,}$/.test(str);
    });

    /*===========================
     *  Routes for App Assets
    =============================*/

    app.get('/jquery/jquery.js', function(req, res) {
        res.sendFile(path.join(__dirname, '/node_modules/jquery/dist/jquery.min.js'));
    });

    app.get('/jquery/jquery.validate.js', function(req, res) {
        res.sendFile(path.join(__dirname, '/node_modules/jquery-validation/dist/jquery.validate.js'));
    });
    app.get('/jquery/additional-methods.js', function(req, res) {
        res.sendFile(path.join(__dirname, '/node_modules/jquery-validation/dist/additional-methods.js'));
    });

    app.get('/materialize/materialize.js', function(req, res) {
        res.sendFile(path.join(__dirname, '/node_modules/materialize-css/dist/js/materialize.min.js'));
    });

    app.get('/materialize/materialize.css', function(req, res) {
        res.sendFile(path.join(__dirname, '/node_modules/materialize-css/dist/css/materialize.min.css'));
    });

    /*===========================
     *  Routes for App Pages
    =============================*/

    // --------- Front Page ---------

    app.get('/', function (req, res) {
        if (req.isAuthenticated())
        {
            return res.redirect('/dashboard');
        }
        else
        {
            res.render('index');
        }
    });

    // --------- User Dashboard ---------

    app.get('/dashboard', isLoggedIn, function(req, res) {
        console.log(req.user);
        res.render('dashboard', {
            username: xss(req.user.displayName)
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
