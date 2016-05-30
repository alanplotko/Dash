// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings').connections;

// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');
var PostSchema = mongoose.model('Post').schema;
var passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt');
var crypto = require('crypto');

// Define constants for account
var SALT_WORK_FACTOR = 10;
var MAX_LOGIN_ATTEMPTS = 5;
var LOCK_TIME = 2 * 60 * 60 * 1000; // 2-hour lock

// Define user fields
var UserSchema = new Schema({

    // Username/Email
    email: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },

    // Personal
    displayName: {
        type: String,
        required: true
    },

    avatar: {
        type: String,
        required: true
    },

    // Password & Security
    password: {
        type: String,
        required: true
    },

    loginAttempts: {
        type: Number,
        required: true,
        default: 0
    },

    lockUntil: {
        type: Number
    },

    // Posts for all content
    posts: [PostSchema],

    // Last time data pulled from connections
    lastUpdateTime: {
        facebook: Date,
        youtube: Date
    },

    // Connections
    facebook: {

        // Connection status
        acceptUpdates: {
            type: Boolean,
            default: true
        },

        // Identifiers & Tokens
        profileId: {
            type: String,
            index: {
                unique: true,
                sparse: true
            }
        },

        accessToken: {
            type: String
        },

        refreshToken: {
            type: String
        },

        // Facebook Content
        groups: [{
            groupId: {
                type: String
            },

            name: {
                type: String
            }
        }],

        pages: [{
            pageId: {
                type: String
            },

            name: {
                type: String
            }
        }]
    },

    youtube: {

        // Connection status
        acceptUpdates: {
            type: Boolean,
            default: true
        },

        // Identifiers & Tokens
        profileId: {
            type: String,
            index: {
                unique: true,
                sparse: true
            }
        },

        accessToken: {
            type: String
        },

        refreshToken: {
            type: String
        },

        // YouTube Content
        subscriptions: [{
            subId: {
                type: String
            },

            name: {
                type: String
            },

            thumbnail: {
                type: String
            }
        }]
    }
});

/*===========================
 * User Account Functions
=============================*/

// Check for a future lockUntil timestamp
UserSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Run checks prior to saving the document
UserSchema.pre('save', function(next) {
    var user = this;

    // Check if the provided email address already exists
    mongoose.models.User.findOne({
        email: user.email
    }, function(err, user) {
        // An error occurred
        if (err) return next(new Error('An error occurred. Please try ' +
            'again in a few minutes.'));

        // Email address already exists
        if (user) {
            return next(new Error('Registration failed. Do you perhaps ' +
                'already have an account?'));
        }
    });

    // Only hash password if it has been modified or is new
    if (user.isNew || !user.isModified('password')) return next();

    // Generate salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        // An error occurred
        if (err) return next(new Error('An error occurred. Please try again ' +
            'in a few minutes.'));

        // Hash password using new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(new Error('An error occurred. Please try ' +
                'again in a few minutes.'));

            // Set hashed password back on document
            user.password = hash;
            next();
        });
    });
});

// Validate password for user
UserSchema.methods.comparePassword = function(candidatePassword, done) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return done(err);
        done(null, isMatch);
    });
};

// If login fails, increment login attempts count
UserSchema.methods.incLoginAttempts = function(done) {
    // If previous lock has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: {
                loginAttempts: 1
            },
            $unset: {
                lockUntil: 1
            }
        }, done);
    }

    // Otherwise, increment login attempts count
    var updates = {
        $inc: {
            loginAttempts: 1
        }
    };

    // Lock account if max attempts reached and account is not already locked
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + LOCK_TIME
        };
    }

    return this.update(updates, done);
};

// Expose enum on model to provide internal reference
var reasons = UserSchema.statics.failedLogin = {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
};

// Serialize function for use with passport
UserSchema.statics.authSerializer = function(user, done) {
    done(null, user.id);
};

// Deserialize function for use with passport
UserSchema.statics.authDeserializer = function(id, done) {
    mongoose.models.User.findById(id,
        'email displayName avatar posts facebook.profileId ' +
        'facebook.acceptUpdates youtube.profileId youtube.acceptUpdates',
        function(err, user) {
            done(err, user);
        }
    );
};

// Authenticate the provided credentials
UserSchema.statics.authenticateUser = function(email, password, done) {
    // Search for email address
    this.findOne({
        email: email
    }, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // Check if user exists
        if (!user) return done(null, null, reasons.NOT_FOUND);

        // Check if account is currently locked
        if (user.isLocked) {
            // Increment login attempts if account is already locked
            return user.incLoginAttempts(function(err) {
                // An error occurred
                if (err) return done(err);
                return done(null, null, reasons.MAX_ATTEMPTS);
            });
        }

        // Test provided credentials for matching password
        user.comparePassword(password, function(err, isMatch) {
            // An error occurred
            if (err) return done(err);

            // Check if password matched
            if (isMatch) {
                // If there's no lock or failed attempts, just return the user
                if (!user.loginAttempts && !user.lockUntil) {
                    return done(null, user);
                }

                // Reset attempts and lock duration
                var updates = {
                    $set: {
                        loginAttempts: 0
                    },
                    $unset: {
                        lockUntil: 1
                    }
                };

                return user.update(updates, function(err) {
                    // An error occurred
                    if (err) return done(err);
                    return done(null, user);
                });
            }

            // Password incorrect, so increment login attempts before responding
            user.incLoginAttempts(function(err) {
                // An error occurred
                if (err) return done(err);
                return done(null, null, reasons.PASSWORD_INCORRECT);
            });
        });
    });
};

// Update user settings
UserSchema.statics.updateUser = function(id, settings, done) {
    mongoose.models.User.update({
        _id: id
    }, settings, function(err, numAffected) {
        if (err) return done(err);  // An error occurred
        return done(null, true);    // Update succeeded
    });
};

// Reset user's avatar to using Gravatar
UserSchema.statics.resetAvatar = function(id, email, done) {
    var settings = {};
    var gravatar = crypto.createHash('md5').update(email).digest('hex');
    var avatarUrl = 'https://gravatar.com/avatar/' + gravatar;
    settings.avatar = avatarUrl;

    mongoose.models.User.update({
        _id: id
    }, settings, function(err, numAffected) {
        if (err) return done(err);  // An error occurred
        return done(null, true);    // Update succeeded
    });
};

// Remove user account
UserSchema.statics.deleteUser = function(id, done) {
    mongoose.models.User.findByIdAndRemove(id, function(err) {
        if (err) return done(err);  // An error occurred
        return done(null, true);    // Deletion succeeded
    });
};

/*=======================
 * Set Up Connections
=========================*/

require('./connections/facebook')(UserSchema);
require('./connections/youtube')(UserSchema);

// Update content
UserSchema.methods.updateContent = function(done) {
    mongoose.models.User.findById(this._id, function(err, user) {
        // Set up async calls
        var calls = {};

        if (user.hasFacebook && user.facebook.acceptUpdates) {
            calls = user.updateFacebook(calls, user);
        }
        if (user.hasYouTube && user.youtube.acceptUpdates) {
            calls = user.updateYouTube(calls, user);
        }

        async.parallel(calls, function(err, results) {
            if (err) return done(err);

            var progress = 0;
            var newPosts = [];

            if (user.hasFacebook && user.facebook.acceptUpdates) {
                Array.prototype.push.apply(newPosts, results.facebookPages);
                Array.prototype.push.apply(newPosts, results.facebookGroups);

                // Set new last update time
                user.lastUpdateTime.facebook = results.facebookUpdateTime;
            }

            if (user.hasYouTube && user.youtube.acceptUpdates) {
                Array.prototype.push.apply(newPosts, results.youtubeVideos);

                // Set new last update time
                user.lastUpdateTime.youtube = results.youtubeUpdateTime;
            }

            // Sort posts by timestamp
            newPosts.sort(function(a, b) {
                return new Date(a.timestamp) - new Date(b.timestamp);
            });

            if (newPosts.length > 0) {
                newPosts.forEach(function(post) {
                    user.posts.push(post);
                    progress++;
                    if (progress == newPosts.length) {
                        user.save(function(err) {
                            // An error occurred
                            if (err) return done(err);

                            // Saved posts and update times; return posts
                            return done(null, user.posts);
                        });
                    }
                });
            // No new posts, set new update time
            } else {
                user.save(function(err) {
                    if (err) return done(err);  // An error occurred
                    return done(null, null);    // Saved update time
                });
            }
        });
    });
};

// Set up passport local strategy with mongoose
UserSchema.plugin(passportLocalMongoose, {
    // Use 'email' field instead of default 'username' field
    usernameField: 'email'
});

module.exports = mongoose.model('User', UserSchema);
