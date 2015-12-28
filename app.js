// Express Setup
var express = require('express');
var app = express();

// Requirements Setup
var path = require('path');
var bodyParser = require('body-parser');

// Assets and Views
app.use('/static', express.static(path.join(__dirname, '/assets')));
app.use('/font', express.static(path.join(__dirname, '/node_modules/materialize-css/dist/font')));
app.set('view engine', 'jade');

// Support json encoded bodies
app.use(bodyParser.json());

// Support encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

/*===============================
 *  MongoDB & Mongoose Setup
=================================*/

var mongoose = require('mongoose');
mongoose.connect(process.env.DASH_MONGODB_URL);
var Schema = mongoose.Schema;

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
