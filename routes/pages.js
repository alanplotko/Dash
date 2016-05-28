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
            connected: req.user.facebook.profileId !== undefined ||
                req.user.youtube.profileId !== undefined,
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
                             ' connection. Reloading...',
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
                        message: service + ' access privileges must be ' +
                                 'renewed. Reloading...',
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
                    message: 'New posts! Reloading...',
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
                            message: 'Facebook access privileges must be ' +
                                     'renewed. Reloading...',
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
                        message: 'New posts! Reloading...',
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
                            message: 'YouTube access privileges must be ' +
                                     'renewed. Reloading...',
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
                        message: 'New posts! Reloading...',
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

    app.post('/settings/profile/display_name', isLoggedIn, function(req, res) {
        var displayName = validator.trim(req.body.display_name);
        var settings = {};

        // Validate changes
        if (validator.isValidDisplayName(displayName)) {
            settings.displayName = displayName;
        } else {
            return res.status(200).send({
                message: 'Please enter a valid display name.',
                refresh: false
            });
        }

        // Update user settings
        User.updateUser(req.user._id, settings, function(err, updateSuccess) {
            if (err) {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            } else if (updateSuccess) {
                return res.status(200).send({
                    message: 'New display name set. Reloading...',
                    refresh: true
                });
            } else {
                return res.status(200).send({
                    message: 'Settings update failed. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            }
        });
    });

    app.post('/settings/profile/avatar', isLoggedIn, function(req, res) {
        var avatarUrl = validator.trim(req.body.avatar);
        var settings = {};

        // Validate changes
        if (validator.isValidAvatar(avatarUrl)) {
            settings.avatar = avatarUrl;
        } else {
            return res.status(200).send({
                message: 'Avatar URL invalid. Please select a valid avatar ' +
                         'URL.',
                refresh: false
            });
        }

        // Update user settings
        User.updateUser(req.user._id, settings, function(err, updateSuccess) {
            if (err) {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            } else if (updateSuccess) {
                return res.status(200).send({
                    message: 'Avatar updated. Reloading...',
                    refresh: true
                });
            } else {
                return res.status(200).send({
                    message: 'Avatar update failed. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            }
        });
    });

    app.post('/settings/profile/avatar/reset', isLoggedIn, function(req, res) {
        // Reset user's avatar to use Gravatar
        User.resetAvatar(req.user._id, req.user.email, function(err,
            updateSuccess) {
            if (err) {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            } else if (updateSuccess) {
                return res.status(200).send({
                    message: 'Your avatar has been reverted to using ' +
                             'Gravatar. Reloading...',
                    refresh: true
                });
            } else {
                return res.status(200).send({
                    message: 'Avatar reset failed. Please try again in a ' +
                             'few minutes.',
                    refresh: false
                });
            }
        });
    });

    app.post('/settings/account/delete', isLoggedIn, function(req, res) {
        var connected = req.user.facebook.profileId !== undefined ||
            req.user.youtube.profileId !== undefined;

        if (connected) {
            return res.status(200).send({
                message: 'Account deletion failed. Please remove all ' +
                         'connections beforehand.',
                refresh: false
            });
        }

        User.deleteUser(req.user._id, function(err, deleteSuccess) {
            if (err) {
                return res.status(500).send({
                    message: 'Encountered an error. Please try again in a ' +
                             'few minutes.',
                        refresh: false
                });
            } else if (deleteSuccess) {
                return res.status(200).send({
                    message: 'Account deletion processed. Reloading...',
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
