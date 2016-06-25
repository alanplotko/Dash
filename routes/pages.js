/*jshint esversion: 6 */

// --------- Dependencies ---------
var User = require.main.require('./models/user');
var validator = require('validator');
require.main.require('./config/custom-validation.js')(validator);
const error_messages = require.main.require('./config/error-messages.js');

module.exports = function(app, passport, isLoggedIn, nev) {

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
            batches: req.user.batches
        });
    });

    app.post('/reset/:service', isLoggedIn, function(req, res) {
        var connectionName = req.params.service.toLowerCase();
        var connectionUpdateTime = 'lastUpdateTime.' + connectionName;

        var unsetQuery = {};
        unsetQuery[connectionUpdateTime] = 1;

        User.findByIdAndUpdate(req.user._id, {
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
                'batches': []
            }
        }, function(err, user) {
            if (err) return res.sendStatus(500);
            return res.sendStatus(200);
        });
    });

    app.post('/dismiss/:batchId/:postId', isLoggedIn, function(req, res) {
        User.findById(req.user._id, function(err, user) {
            var batch = user.batches.id(req.params.batchId);
            if (batch) {
                batch.posts.id(req.params.postId).remove();
                if (batch.posts.length === 0) {
                    batch.remove();
                }
                user.save(function(err) {
                    if (err) return res.sendStatus(500);
                    return res.sendStatus(200);
                });
            } else {
                return res.sendStatus(500);
            }
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
                    message: 'Display name update failed. Please try again ' +
                             'in a few minutes.',
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

    app.post('/settings/account/email', isLoggedIn, function(req, res) {
        // Clean and verify form input
        var email = validator.trim(req.body.email);
        var settings = {};

        // Validate changes
        if (validator.isEmail(email) & email.length > 0) {
            settings.email = email;
        } else {
            return res.status(200).send({
                message: 'Email address invalid. Please enter a valid email ' +
                         'address.',
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
                User.findOne({
                    '_id': req.user._id
                }, function(err, returnedUser) {
                    if (err) {
                        return res.status(500).send({
                            message: 'An error occurred. Please try again in ' +
                                     'a few minutes.',
                            refresh: false
                        });
                    }
                    nev.createTempUser(returnedUser, function(err,
                        newTempUser) {
                        // An error occurred
                        if (err) {
                            return res.status(500).send({
                                message: 'An error occurred. Please try ' +
                                         'again in a few minutes.',
                                refresh: false
                            });
                        }

                        // Update succeeded; next step is email verification
                        if (newTempUser) {
                            delete newTempUser.posts;
                            nev.registerTempUser(newTempUser, function(err) {
                                if (err) {
                                    return res.status(500).send({
                                        message: 'An error occurred. ' +
                                                 'Please try again in a ' +
                                                 'few minutes.',
                                        refresh: false
                                    });
                                }
                                User.deleteUser(req.user._id, function(err,
                                    deleteSuccess) {
                                    // An error occurred
                                    if (err) {
                                        return res.status(500).send({
                                            message: 'An error occurred. ' +
                                                     'Please try again in a ' +
                                                     'few minutes.',
                                            refresh: false
                                        });
                                    } else if (deleteSuccess) {
                                        req.logout();
                                        req.session.destroy(function(err) {
                                            return res.status(200).send({
                                                message: 'Email address ' +
                                                    'updated. Remember to ' +
                                                    'verify your email ' +
                                                    'address! Logging out... ',
                                                refresh: true
                                            });
                                        });
                                    }
                                });
                            });
                        }
                    });
                });
            } else {
                return res.status(200).send({
                    message: 'Email address update failed. Please try again ' +
                    'in a few minutes.',
                    refresh: false
                });
            }
        });
    });

    app.post('/settings/account/password', isLoggedIn, function(req, res) {
        var currentPass = validator.trim(req.body.currentPass);
        var newPass = validator.trim(req.body.newPass);
        var newPassConfirm = validator.trim(req.body.newPassConfirm);
        var settings = {};

        // Validate changes
        if (newPass !== newPassConfirm) {
            return res.status(200).send({
                message: 'Please ensure the passwords match.',
                refresh: false
            });
        } else if (validator.isValidPassword(newPass)) {
            settings.password = newPass;
            User.findById(req.user._id, function(err, user) {
                user.comparePassword(currentPass, function(err, isMatch) {
                    if (err) {
                        return res.status(500).send({
                            message: 'Encountered an error. Please try ' +
                                     'again in a few minutes.',
                            refresh: false
                        });
                    } else if (isMatch) {
                        // Update user settings
                        User.findById(req.user._id, function(err, user) {
                            if (err) {
                                return res.status(500).send({
                                    message: 'Encountered an error. Please ' +
                                    'try again in a few minutes.',
                                    refresh: false
                                });
                            } else if (user) {
                                if (currentPass === newPass) {
                                    return res.status(200).send({
                                        message: 'New password invalid. ' +
                                                 'Your new password cannot ' +
                                                 'be the same as your ' +
                                                 'current password.',
                                        refresh: false
                                    });
                                }
                                user.password = newPass;
                                user.save(function(err) {
                                    // An error occurred
                                    if (err) {
                                        return res.status(500).send({
                                            message: 'Encountered an error. ' +
                                                     'Please try again in a ' +
                                                     'few minutes.',
                                            refresh: false
                                        });
                                    }

                                    // Successfully changed password
                                    return res.status(200).send({
                                        message: 'Password updated. ' +
                                                 'Reloading...',
                                        refresh: true
                                    });
                                });
                            } else {
                                return res.status(200).send({
                                    message: 'Password update failed. Please ' +
                                             'try again in a few minutes.',
                                    refresh: false
                                });
                            }
                        });
                    } else {
                        return res.status(200).send({
                            message: 'Please enter your current password ' +
                                     'correctly to authorize the password ' +
                                     'change.',
                            refresh: false
                        });
                    }
                });
            });
        } else {
            return res.status(200).send({
                message: 'Please enter a valid password.',
                refresh: false
            });
        }
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
        successRedirect: '/login',
        failureRedirect: '/register'
    }));

    // --------- Dash Email Verification ---------
    app.get('/verify/:token', function(req, res) {
        nev.confirmTempUser(req.params.token, function(err, user) {
            // An error occurred
            if (err) {
                req.flash('registerMessage', err.toString());
                return res.redirect('/register');
            }
            // Redirect to login
            if (user) {
                req.flash('loginMessage', 'Email address verification ' +
                    'complete! You may now login.');
                return res.redirect('/login');
            } else {
                // Redirect to register page
                req.flash('registerMessage', 'Incorrect verification token. ' +
                    'You need to create an account first, before you can ' +
                    'proceed with the verification process.');
                return res.redirect('/register');
            }
        });
    });

    app.get('/resend/:email', function(req, res) {
        // Clean and verify form input
        var email = validator.trim(req.params.email);
        if (!validator.isEmail(email) || email.length === 0) {
            req.flash('registerMessage', 'Incorrect email address. ' +
                'You need to create an account first, before you can ' +
                'proceed with the verification process.');
            return res.redirect('/register');
        }

        nev.resendVerificationEmail(email, function(err, userFound) {
            // An error occurred
            if (err) {
                req.flash('registerMessage', err.toString());
                return res.redirect('/register');
            }
            // Redirect to login
            if (userFound) {
                req.flash('loginMessage', 'Email address verification ' +
                    'resent! Please wait a few minutes for the email to ' +
                    'arrive.');
                return res.redirect('/login');
            } else {
                // Redirect to register page
                req.flash('registerMessage', 'Incorrect email address. ' +
                    'You need to create an account first, before you can ' +
                    'proceed with the verification process.');
                return res.redirect('/register');
            }
        });
    });
};
