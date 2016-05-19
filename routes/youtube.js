// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);

module.exports = function(app, passport, isLoggedIn) {

    app.get('/connect/auth/youtube', isLoggedIn,
        passport.authenticate('youtube', {
            scope: [
                'https://www.googleapis.com/auth/youtube.force-ssl',
                'https://www.googleapis.com/auth/youtube.readonly'
            ]
    }));

    app.get('/connect/auth/youtube/callback', isLoggedIn,
        passport.authenticate('youtube', {
            failureRedirect: '/connect',
            successRedirect: '/connect'
    }));

    app.get('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
        User.setUpYouTubeSubs(req.user._id, function(err, allSubscriptions,
            existingSubscriptions) {
                // An error occurred
                if (err) {
                    req.flash('setupMessage', err.toString());
                    res.redirect('/setup/youtube/subscriptions');
                // Found subscriptions
                } else if (allSubscriptions &&
                    Object.keys(allSubscriptions).length > 0) {

                    // Fill in checkboxes for existing subscriptions
                    if (existingSubscriptions.length > 0) {
                        var subIds = [];
                        editingMode = true;

                        existingSubscriptions.forEach(function(subscription) {
                            subIds.push(subscription.subId);
                        });

                        for (var key in allSubscriptions) {
                            if (subIds.indexOf(allSubscriptions[key].id) > -1) {
                                allSubscriptions[key].checked = true;
                            } else {
                                allSubscriptions[key].checked = false;
                            }
                        }
                    }

                    res.render('youtube-setup', {
                        message: req.flash('setupMessage'),
                        content: allSubscriptions,
                        contentName: 'subscriptions'
                    });
                // No subscriptions found; return to connect page
                } else {
                    req.flash('connectMessage',
                        'You do not have any configurable YouTube ' +
                        'subscriptions groups at this time.');
                    res.redirect('/connect');
                }
            }
        );
    });

    app.post('/setup/youtube/subscriptions', isLoggedIn, function(req, res) {
        User.saveYouTubeSubs(req.user._id, Object.keys(req.body),
            function(err, data) {
                // An error occurred
                if (err) {
                    req.flash('setupMessage', err.toString());
                    res.redirect('/setup/youtube/subscriptions');
                // Saved subscriptions; return to connect page
                } else {
                    req.flash('connectMessage',
                        'Your YouTube subscriptions have been updated.');
                    res.redirect('/connect');
                }
            }
        );
    });

    app.get('/connect/remove/youtube', isLoggedIn, function(req, res) {
        User.removeYouTube(req.user.id, function(err) {
            if (err) {
                req.flash('connectMessage', err.toString());
            } else {
                req.flash('connectMessage',
                    'Your YouTube connection has been removed.');
            }
            res.redirect('/connect');
        });
    });
};
