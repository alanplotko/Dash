module.exports = function(app, debug) {

    var path = require('path');
    var User = require('./user-model');
    var validator = require('validator');
    var xss = require('xss');

    validator.extend('isValidUsername', function (str) {
        return /^([A-Za-z0-9\-\_]){3,}$/.test(str);
    });

    validator.extend('isValidPassword', function (str) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%\^&*\"\>\<\ \')(+=._-]{8,}$/.test(str);
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

    app.get('/', function (req, res) {
        res.render('index', {
            message: app.locals.defaultHeading
        });
    });

    app.post('/login', function(req, res) {
        // Attempt to authenticate user
        User.getAuthenticated(req.body.username, req.body.password, function(err, user, reason) {
            if (err) throw err;

            // Login succeeded
            if (user) {
                res.send({ 
                    isError: false,
                    message: 'Logging in...'
                });
                return;
            }

            // Login failed
            var reasons = User.failedLogin;

            if (debug) var logFlag = false;
            switch (reason) {
                case reasons.NOT_FOUND:
                    if (debug) { console.log('DEBUG: NOT_FOUND'); logFlag = true; }
                case reasons.PASSWORD_INCORRECT:
                    if (debug && !logFlag) console.log('DEBUG: PASSWORD_INCORRECT');
                    res.send({ 
                        isError: true,
                        message: 'Error: The username or password is incorrect.'
                    });
                    break;
                case reasons.MAX_ATTEMPTS:
                    if (debug) console.log('DEBUG: MAX_ATTEMPTS');
                    res.send({ 
                        isError: true,
                        message: 'Error: The account is temporarily locked.'
                    });
                    // To Do: Send email about account being locked
                    break;
            }
        });
    });

    app.post('/register', function(req, res) {
        // Clean and verify form input
        var uname = validator.trim(validator.escape(req.body.username));
        var pass = req.body.password;

        if (validator.isValidUsername(uname) && validator.isValidPassword(pass))
        {
            var newUser = new User({
                username: uname,
                password: pass
            });

            newUser.save(function(err) {
                if (err)
                {
                    res.send({ 
                        isError: true,
                        message: err.toString()
                    });
                }
                else
                {
                    res.send({ 
                        isError: false,
                        username: xss(uname)
                    });
                }
            });
        }
        else
        {
            res.send({ 
                isError: true,
                message: 'Username or password did not meet criteria. Please refresh the page and try again.'
            });
        }
    });

}
