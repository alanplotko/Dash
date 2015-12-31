module.exports = function(app) {

    var path = require('path');
    var User = require('./user-model');
    
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
        res.render('index');
    });

    app.post('/login', function(req, res) {
        console.log(req.body);
        // attempt to authenticate user
        User.getAuthenticated(req.body.username, req.body.password, function(err, user, reason) {
            if (err) throw err;

            // login was successful if we have a user
            if (user) {
                // handle login success
                console.log('login success');
                return;
            }

            // otherwise we can determine why we failed
            var reasons = User.failedLogin;
            switch (reason) {
                case reasons.NOT_FOUND:
                    console.log('DEBUG: NOT_FOUND');
                    break;
                case reasons.PASSWORD_INCORRECT:
                    // note: these cases are usually treated the same - don't tell
                    // the user *why* the login failed, only that it did
                    console.log('DEBUG: PASSWORD_INCORRECT');
                    break;
                case reasons.MAX_ATTEMPTS:
                    // send email or otherwise notify user that account is
                    // temporarily locked
                    console.log('DEBUG: MAX_ATTEMPTS');
                    break;
            }
        });
    });

    app.post('/register', function(req, res) {
        // create a user a new user
        var newUser = new User({
            username: req.body.username,
            password: req.body.password
        });
    });

}
