// --------- Environment Setup ---------
process.env.NODE_ENV = (process.argv[2] == 'dev' || process.argv[2] == 'development') ? 'dev' : 'prod';
var debug = (process.env.NODE_ENV == 'dev');
var config = require('./config.js').config[process.env.NODE_ENV]

// --------- Dependencies ---------
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

// --------- Default Variables Setup ---------
app.locals.defaultHeading = 'Organize your social media with Dash';

// --------- Authentication Setup ---------
app.use(cookieParser());
app.use(expressSession({ 
    secret: '#ofi!af8_1b_edlif6h=o8b)f&)hc!8kx=w*$f2pi%hm)(@yx8',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Support json-encoded/encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Support displaying messages to user
app.use(flash());

// --------- Assets Setup ---------
app.use('/static', express.static(path.join(__dirname, '/assets')));
app.use('/font', express.static(path.join(__dirname, '/node_modules/materialize-css/dist/font')));
app.set('view engine', 'jade');

// Set up app routes
var routes = require('./routes')(app, debug);

// --------- MongoDB & Mongoose Setup ---------
var mongoose = require('mongoose');
var User = require('./user-model');

mongoose.connect(config.MONGO_URI, function(err) {
    if (err) throw err;
    if (debug) console.log('Successfully connected to MongoDB');
});

// Run App
var server = app.listen(3000, function () {
    if (debug) {
        var host = (server.address().address == "::") ? "localhost" : server.address().address;
        var port = server.address().port;
        console.log('Listening on %s:%s', host, port);
    }
});
