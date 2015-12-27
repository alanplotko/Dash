// Express Setup
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');

// Assets and Views
app.use('/static', express.static(path.join(__dirname, '/assets')));
app.use('/font', express.static(path.join(__dirname, '/node_modules/materialize-css/dist/font')));
app.set('view engine', 'jade');
app.use(bodyParser.json()); // Support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // Support encoded bodies

// Routes for App Pages
app.get('/', function (req, res) {
	res.render('index');
});

app.post('/login', function(req, res) {
    var username = req.body.username;
});

// Routes for App Assets
app.get('/jquery/jquery.js', function(req, res) {
    res.sendFile(path.join(__dirname, '/node_modules/jquery/dist/jquery.min.js'));
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
