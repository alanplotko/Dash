// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);

module.exports = function(app, passport, isLoggedIn) {

    app.get('/connect/auth/youtube', isLoggedIn, passport.authenticate('youtube', { 
        scope: ['https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube.readonly']
    }));

    app.get('/connect/auth/youtube/callback', isLoggedIn, passport.authenticate('youtube', {
        failureRedirect: '/connect',
        successRedirect: '/connect'
    }));

    app.get('/connect/remove/youtube', isLoggedIn, function(req, res) {
        User.removeYouTube(req.user.id, function(err) {
            if (err)
            {
                req.flash('connectMessage', err.toString());
            }
            else
            {
                req.flash('connectMessage', 'Your YouTube connection has been removed.');
            }
            res.redirect('/connect');
        });
    });
}