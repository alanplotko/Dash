/*===============================
 *  Dependencies & App Setup
=================================*/

// --------- Dependencies ---------
process.env.NODE_ENV = process.argv[2] || 'prod';
var config = require('./config.js').config[process.env.NODE_ENV]
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

// --------- Authentication Setup ---------
app.use(cookieParser());
app.use(expressSession({ 
    secret: '#ofi!af8_1b_edlif6h=o8b)f&)hc!8kx=w*$f2pi%hm)(@yx8',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// --------- App Setup ---------
app.use('/static', express.static(path.join(__dirname, '/assets')));
app.use('/font', express.static(path.join(__dirname, '/node_modules/materialize-css/dist/font')));
app.set('view engine', 'jade');

// Support json-encoded/encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Support displaying messages that are saved in the session
app.use(flash());

/*===============================
 *  MongoDB & Mongoose Setup
=================================*/

// Set uo Mongoose; connect to MongoDB database
var mongoose = require('mongoose');
mongoose.connect(config.MONGO_URI);
var Schema = mongoose.Schema;

// Create user schema
var userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    admin: Boolean,
    created_at: Date,
    updated_at: Date
});

var User = mongoose.model('User', userSchema);
module.exports = User;

passport.use('login', new LocalStrategy({
    passReqToCallback : true
}, function(req, username, password, done) { 
    // check in mongo if a user with username exists or not
    User.findOne({ 'username' :  username }, function(err, user) {
        // In case of any error, return using the done method
        if (err)
            return done(err);
        // Username does not exist, log error & redirect back
        if (!user){
            console.log('User Not Found with username '+username);
            return done(null, false, 
                req.flash('message', 'User Not found.'));                 
        }
        // User exists but wrong password, log the error 
        if (!isValidPassword(user, password)){
            console.log('Invalid Password');
            return done(null, false, 
                req.flash('message', 'Invalid Password'));
        }
        // User and password both match, return user from 
        // done method which will be treated like success
        return done(null, user);
    });
}));

/*===========================
 *  Routes for App Pages
=============================*/

app.get('/', function (req, res) {
	res.render('index');
});

app.post('/login', function(req, res) {
    var username = req.body.username;
});

app.post('/register', function(req, res) {
    var username = req.body.username;
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

// Run App
var server = app.listen(3000, function () {
	var host = (server.address().address == "::") ? "localhost" : server.address().address;
	var port = server.address().port;
	console.log('Listening on %s:%s', host, port);
});
