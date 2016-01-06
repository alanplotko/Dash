// --------- Environment Setup ---------
process.env.NODE_ENV = (process.argv[2] == 'dev' || process.argv[2] == 'development') ? 'dev' : 'prod';
var debug = (process.env.NODE_ENV == 'dev');
var config = require('./config/settings').settings[process.env.NODE_ENV];

// --------- Dependencies ---------
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
var cookieParser = require('cookie-parser');
var passport = require('passport');
var flash = require('connect-flash');
var mongoose = require('mongoose');
var User = require('./models/user');

// --------- Support bodies ---------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --------- MongoDB & Mongoose Setup ---------
mongoose.connect(config.MONGO_URI, function(err) {
    if (err) throw err;
    if (debug) console.log('Successfully connected to MongoDB');
});

// --------- Authentication Setup ---------
require('./config/passport')(passport);
app.use(cookieParser());
app.use(session({ 
    secret: '#ofi!af8_1b_edlif6h=o8b)f&)hc!8kx=w*$f2pi%hm)(@yx8',
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// --------- Assets Setup ---------
app.use('/static', express.static(path.join(__dirname, '/assets')));
app.use('/font', express.static(path.join(__dirname, '/node_modules/materialize-css/dist/font')));
app.set('view engine', 'jade');
require('./routes/assets')(app);

// Pass login status for use in views
app.use(function (req, res, next) {
    // Set up login status and variables
    res.locals.login = req.isAuthenticated();
    if (req.user)
    {
        // Get display name
        res.locals.displayName = req.user.displayName;

        // Set up greeting message
        var date = new Date();
        var hour = date.getHours();
        var greeting = 'Hi';
        switch (hour)
        {
            case hour < 12:
                greeting = 'Good morning';
                break;
            case hour < 18:
                greeting = 'Good afternoon';
                break;
            default:
                greeting = 'Good evening';
                break; 
        }
        res.locals.greeting = greeting;

        // Get gravatar url
        res.locals.gravatar = "http://gravatar.com/avatar/" + req.user.gravatar;
    }
    next();
});

// Set up app routes
require('./routes/pages')(app, passport);

// --------- Error handling ---------
app.use(function(err, req, res, next) {
    // If no status is predefined, then label as internal server error
    if (!err.status) err.status = 500;

    // If in dev env, pass all information on error
    if (debug)
    {
        res.render('error', {
            title: err.name || 'Error ' + err.status,
            message: err.message,
            fullError: JSON.stringify(err, null, '<br />').replace('}', '<br />}'),
            stack: err.stack
        });
    }
    // If in prod env, pass a user-friendly message
    else
    {
        res.render('error', {
            title: 'Error ' + err.status,
            message: 'Internal Server Error',
            description: err.description || 'An error occurred! Click the button below to return to the front page.<br /><br />If you were in the middle of trying to do something, then try again after a few minutes.<br /><br />If you\'re still experiencing problems, then let the team know!'
        });
    }
});

// Run App
var server = app.listen(3000, function () {
    if (debug) {
        var host = (server.address().address == "::") ? "localhost" : server.address().address;
        var port = server.address().port;
        console.log('Listening on %s:%s', host, port);
    }
});
