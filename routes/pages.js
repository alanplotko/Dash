/*jshint esversion: 6 */

// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);
const error_messages = require.main.require('./config/error-messages.js');

module.exports = function(app, passport, isLoggedIn) {

    // --------- Front Page ---------
    app.get('/', function(req, res) {
        if (req.isAuthenticated()) return res.redirect('/dashboard');
        res.render('index');
    });

    // --------- User Dashboard ---------
    app.get('/dashboard', isLoggedIn, function(req, res) {
        res.render('dashboard', {
            // Add other connection fields here
            connected: req.user.facebook.profileId !== undefined,
            posts: req.user.posts
        });
    });

    app.post('/reset/:service', isLoggedIn, function(req, res) {
        var connectionName = req.params.service;
        var connectionNameLower = connectionName.toLowerCase();
        var connectionUpdateTime = 'lastUpdateTime.' + connectionNameLower;

        var pullQuery = {};
        var unsetQuery = {};
        pullQuery.connection = connectionNameLower;
        unsetQuery[connectionUpdateTime] = 1;

        User.findByIdAndUpdate(req.user._id, {
            $pull: {
                posts: pullQuery
            },
            $unset: unsetQuery
        }, function(err, user) {
            if (err) {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            } else {
                return res.status(200).send({
                    message: 'Successfully reset ' + connectionName +
                             ' connection. Refreshing...',
                    refresh: true
                });
            }
        });
    });

    app.post('/refresh', isLoggedIn, function(req, res) {
        req.user.updateContent(function(err, posts) {
            if (err) {
                if (err.toString().indexOf('400') !== -1) {
                    var service = err.toString().split('-')[1];
                    req.flash('connectMessage',
                        error_messages[service].refresh);
                    return res.status(500).send({
                        message: 'Encountered an error. ' + service +
                                 ' access privileges must be renewed...',
                        toConnect: true
                    });
                } else {
                    return res.status(500).send({
                        message: 'Encountered an error. Please try again ' +
                        'in a few minutes.',
                        refresh: false
                    });
                }
            } else if (posts) {
                return res.status(200).send({
                    message: 'New posts! Loading them in...',
                    refresh: true
                });
            } else {
                return res.status(200).send({
                    message: 'No new posts.',
                    refresh: false
                });
            }
        });
    });

    app.post('/refresh/:service', isLoggedIn, function(req, res) {
        var connectionName = req.params.service;
        if (connectionName === 'facebook') {
            req.user.refreshFacebook(function(err, posts) {
                if (err) {
                    if (err.toString() === '400-Facebook') {
                        req.flash('connectMessage',
                            error_messages.Facebook.refresh);
                        return res.status(500).send({
                            message: 'Encountered an error. Facebook access ' +
                                     'privileges must be renewed...',
                            refresh: true
                        });
                    } else {
                        return res.status(500).send({
                            message: 'Encountered an error. Please try again ' +
                            'in a few minutes.',
                            refresh: false
                        });
                    }
                } else if (posts) {
                    return res.status(200).send({
                        message: 'New posts! Loading them in...',
                        refresh: true
                    });
                } else {
                    return res.status(200).send({
                        message: 'No new posts.',
                        refresh: false
                    });
                }
            });
        } else if (connectionName === 'youtube') {
            req.user.refreshYouTube(function(err, posts) {
                if (err) {
                    if (err.toString() === '400-YouTube') {
                        req.flash('connectMessage',
                            error_messages.YouTube.refresh);
                        return res.status(500).send({
                            message: 'Encountered an error. YouTube access ' +
                                     'privileges must be renewed...',
                            refresh: true
                        });
                    } else {
                        return res.status(500).send({
                            message: 'Encountered an error. Please try again ' +
                            'in a few minutes.',
                            refresh: false
                        });
                    }
                } else if (posts) {
                    return res.status(200).send({
                        message: 'New posts! Loading them in...',
                        refresh: true
                    });
                } else {
                    return res.status(200).send({
                        message: 'No new posts.',
                        refresh: false
                    });
                }
            });
        }
    });

    app.post('/toggleUpdates/:service', isLoggedIn, function(req, res) {
        var connectionName = req.params.service;
        if (connectionName === 'facebook') {
            req.user.toggleFacebook(function(err, result) {
                if (err) {
                    return res.status(500).send({
                        message: 'Encountered an error. Please try again in ' +
                                 'a few minutes.',
                        refresh: false
                    });
                } else if (result) {
                    return res.status(200).send({
                        message: result,
                        refresh: true
                    });
                } else {
                    return res.status(200).send({
                        message: result,
                        refresh: false
                    });
                }
            });
        } else if (connectionName === 'youtube') {
            req.user.toggleYouTube(function(err, result) {
                if (err) {
                    return res.status(500).send({
                        message: 'Encountered an error. Please try again in ' +
                                 'a few minutes.',
                        refresh: false
                    });
                } else if (result) {
                    return res.status(200).send({
                        message: result,
                        refresh: true
                    });
                } else {
                    return res.status(200).send({
                        message: result,
                        refresh: false
                    });
                }
            });
        }
    });

    app.post('/dismiss/all', isLoggedIn, function(req, res) {
        User.findByIdAndUpdate(req.user._id, {
            $set: {
                'posts': []
            }
        }, function(err, user) {
            if (err) return res.sendStatus(500);
            return res.sendStatus(200);
        });
    });

    app.post('/dismiss/:id', isLoggedIn, function(req, res) {
        User.findByIdAndUpdate(req.user._id, {
            $pull: {
                'posts': {
                    _id: req.params.id
                }
            }
        }, function(err, user) {
            if (err) return res.sendStatus(500);
            return res.sendStatus(200);
        });
    });

    // --------- User's Settings ---------
    app.get('/settings', isLoggedIn, function(req, res) {
        res.render('settings', {
            message: req.flash('settingsMessage')
        });
    });

    app.post('/settings', isLoggedIn, function(req, res) {
        var displayName = validator.trim(req.body.display_name);
        var settings = {};

        // Validate changes
        if (validator.isValidDisplayName(displayName)) {
            settings.displayName = displayName;
        } else {
            req.flash('settingsMessage',
                    'Please enter a valid display name.');
            return res.redirect('/settings');
        }

        // Update user settings
        User.updateUser(req.user._id, settings, function(err, updateSuccess) {
            // An error occurred
            if (err) {
                req.flash('settingsMessage', err.toString());
            // Update succeeded
            } else if (updateSuccess) {
                req.flash('settingsMessage', 'Your changes have been saved.');
            // An unexpected error occurred
            } else {
                req.flash('settingsMessage',
                    'An error occurred. Please try again in a few minutes.');
            }

            return res.redirect('/settings');
        });
    });

    app.post('/delete', isLoggedIn, function(req, res) {
        User.deleteUser(req.user._id, function(err, deleteSuccess) {
            if (err) {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a ' +
                             'few minutes.',
                        refresh: false
                });
            } else if (deleteSuccess) {
                return res.status(200).send({
                    message: 'Account deletion processed... redirecting...',
                    refresh: true
                });
            } else {
                return res.status(200).send({
                    message: 'Account deletion failed. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            }
        });
    });

    // --------- User's Connected Sites ---------
    app.get('/connect', isLoggedIn, function(req, res) {
        res.render('connect', {
            message: req.flash('connectMessage'),
            facebook: req.user.facebook.profileId,
            facebook_on: req.user.facebook.acceptUpdates,
            youtube: req.user.youtube.profileId,
            youtube_on: req.user.youtube.acceptUpdates
        });
    });

    // --------- Dash Login/Logout ---------
    app.get('/login', function(req, res) {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        } else {
            res.render('login', {
                message: req.flash('loginMessage')
            });
        }
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    }));

    // Clear credentials and destroy session upon logout
    app.get('/logout', function(req, res) {
        req.logout();
        req.session.destroy(function(err) {
            res.redirect('/');
        });
    });

    // --------- Dash Registration ---------
    app.get('/register', function(req, res) {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        } else {
            res.render('register', {
                message: req.flash('registerMessage')
            });
        }
    });

    app.post('/register', passport.authenticate('local-register', {
        successRedirect: '/dashboard',
        failureRedirect: '/register',
        failureFlash: true
    }));
};
