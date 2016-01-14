// --------- Dependencies ---------
var path = require('path');

module.exports = function(app) {

    // --------- jQuery & Validation ---------

    app.get('/jquery/jquery.js', function(req, res) {
        res.sendFile(path.join(__dirname, '../node_modules/jquery/dist/jquery.min.js'));
    });

    app.get('/jquery/jquery.validate.js', function(req, res) {
        res.sendFile(path.join(__dirname, '../node_modules/jquery-validation/dist/jquery.validate.js'));
    });

    app.get('/jquery/additional-methods.js', function(req, res) {
        res.sendFile(path.join(__dirname, '../node_modules/jquery-validation/dist/additional-methods.js'));
    });

    // --------- Date & Time ---------

    app.get('/calendar/moment.js', function(req, res) {
        res.sendFile(path.join(__dirname, '../node_modules/moment/min/moment.min.js'));
    });

    // --------- Materialize Assets ---------

    app.get('/materialize/materialize.js', function(req, res) {
        res.sendFile(path.join(__dirname, '../node_modules/materialize-css/dist/js/materialize.min.js'));
    });

    app.get('/materialize/materialize.css', function(req, res) {
        res.sendFile(path.join(__dirname, '../node_modules/materialize-css/dist/css/materialize.min.css'));
    });

}