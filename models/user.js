// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
const https = require('https');
var async = require('async');
var config = require('../config/settings').settings[process.env.NODE_ENV];
config.connections = require('../config/settings').settings['connections'];
var SALT_WORK_FACTOR = 10;
var MAX_LOGIN_ATTEMPTS = 5;
var LOCK_TIME = 2 * 60 * 60 * 1000; // 2-hour lock

// Define post fields
var PostSchema = new Schema({
    title: { type: String },        // Post title
    content: { type: String },      // Post content
    timestamp: { type: Date },      // Last updated
    permalink: { type: String },    // Link to source post
    picture: { type: String },      // Optional: Attached picture
    url: { type: String },          // Optional: Attached link
    postType: { type: String },     // Optional: Type of post
});

// Define user fields
var UserSchema = new Schema({

    // Username/Email
    email: { type: String, required: true, index: { unique: true } },

    // Personal
    displayName: { type: String, required: true },
    gravatar: { type: String, required: true },

    // Password & Security
    password: { type: String, required: true },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number },

    // Connections
    facebook: {
        // Identifiers & Tokens
        profileId: { type: String, index: { unique: true } },
        accessToken: { type: String },
        
        // Facebook Content
        groups: [{
            groupId: { type: String },
            name: { type: String }
        }],
        pages: [{
            pageId: { type: String },
            name: { type: String }
        }],
        posts: [PostSchema],
        
        // Last time data pulled from Facebook
        lastUpdateTime: { type: Date }
    }
});

/*=====================
 * User Connections
=======================*/

// Check if user has existing Facbeook connection
UserSchema.virtual('hasFacebook').get(function() {
    return !!(this.facebook.profileId);
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
    mongoose.models['User'].findOne({ email: user.email }, function (err, user) {
        // An error occurred
        if (err) return next(new Error('An error occurred. Please try again in a few minutes.'));

        // Email address already exists
        if (user) {
            return next(new Error('Registration failed. Do you perhaps already have an account?'));
        }
    });

    // Only hash password if it has been modified or is new
    if (!user.isModified('password')) return next();

    // Generate salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        // An error occurred
        if (err) return next(new Error('An error occurred. Please try again in a few minutes.'));

        // Hash password using new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(new Error('An error occurred. Please try again in a few minutes.'));

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
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        }, done);
    }

    // Otherwise, increment login attempts count
    var updates = { $inc: { loginAttempts: 1 } };

    // Lock account if max attempts reached and account is not already locked
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
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
    mongoose.models['User'].findById(id, 'email displayName gravatar facebook.profileId facebook.posts', function(err, user) {
        done(err, user);
    });
};

// Authenticate the provided credentials
UserSchema.statics.authenticateUser = function(email, password, done) {
    // Search for email address
    this.findOne({ email: email }, function(err, user) {
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
                if (!user.loginAttempts && !user.lockUntil) return done(null, user);
                
                // Reset attempts and lock duration
                var updates = {
                    $set: { loginAttempts: 0 },
                    $unset: { lockUntil: 1 }
                };

                return user.update(updates, function(err) {
                    // An error occurred
                    if (err) return done(err);
                    return done(null, user);
                });
            }

            // Password is incorrect, so increment login attempts before responding
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
    mongoose.models['User'].update({ _id: id }, settings, function(err, numAffected) {
        if (err) return done(err);  // An error occurred
        return done(null, true);    // Update succeeded
    });
};

/*========================
 * Facebook Connection
==========================*/

// Add Facebook id and access token to user
UserSchema.statics.addFacebook = function(id, connection, done) {
    mongoose.models['User'].findById(id, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // User can't be found; unexpected error
        if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

        // Connection already exists
        if(user.hasFacebook) return done(new Error('You\'re already connected with Facebook.'));

        // Add Facebook connection
        user.facebook = connection;

        // Save changes
        user.save(function (err) {
            if (err) return done(err);  // An error occurred
            return done(null, user);    // Added connection
        });
    });
};

// Remove Facebook
UserSchema.statics.removeFacebook = function(id, done) {
    mongoose.models['User'].findById(id, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // User can't be found; unexpected error
        if (!user) return done(new Error('An error occurred. Please try again in a few minutes.'));

        // Connection already exists
        if(!user.hasFacebook) return done(new Error('You\'re not connected with Facebook.'));
        
        // Remove Facebook connection
        user.facebook = undefined;

        // Save changes
        user.save(function (err) {
            if (err) return done(err);  // An error occurred
            return done(null, user);    // Removed connection
        });
    });
};

// Get content from Facebook
function getFacebookContent(url, content, appSecretProof, done) {
    https.get(url + appSecretProof, (res) => {
        var buffer = '';
        res.on('data', (d) => { buffer += d; });
        res.on('end', (d) => {
            buffer = JSON.parse(buffer);
            if (buffer.data && buffer.data.length > 0)
            {
                buffer.data.forEach(function(element) {
                    content[element.name] = element.id;
                });
            }
            if (buffer.paging && buffer.paging.next)
            {
                getFacebookContent(buffer.paging.next, content, appSecretProof, done);
            }
            else
            {
                done(null, content);
            }
        });
    }).on('error', (err) => { done(err); });
}

// Get Facebook posts
function getFacebookPosts(url, content, name, type, appSecretProofString, done) {
    https.get(url + appSecretProofString, (res) => {
        var buffer = '';
        res.on('data', (d) => { buffer += d; });
        res.on('end', (d) => {
            buffer = JSON.parse(buffer);
            if (buffer.data && buffer.data.length > 0)
            {
                buffer.data.forEach(function(element) {
                    var idInfo = element.id.split('_');
                    var permalink;

                    if (type === 'page')
                    {
                        permalink = 'https://www.facebook.com/' + idInfo[0] + '/posts/' + idInfo[1];
                    }
                    else
                    {
                        permalink = 'https://www.facebook.com/groups' + idInfo[0] + '/permalink/' + idInfo[1];
                    }

                    // We have a link or media share
                    if (element.story && element.message)
                    {
                        content.push({
                            title: element.story,
                            content: element.message,
                            timestamp: element.created_time,
                            permalink: permalink,
                            picture: element.full_picture || '',
                            url: element.link || '',
                            postType: type
                        });
                    }
                    // We have a standard post
                    else if (!element.story && element.message)
                    {
                        content.push({
                            title: name,
                            content: element.message,
                            timestamp: element.created_time,
                            permalink: permalink,
                            picture: element.full_picture || '',
                            url: element.link || '',
                            postType: type
                        });
                    }
                });
            }
            if (buffer.paging && buffer.paging.next)
            {
                getFacebookPosts(buffer.paging.next, content, name, type, appSecretProofString, done);
            }
            else
            {
                done(null, content);
            }
        });
    }).on('error', (err) => { done(err); });
}

// --------- First-time setup for Facebook groups ---------

// Get groups to display on setup page
UserSchema.statics.setUpFacebookGroups = function(id, done) {
    mongoose.models['User'].findById(id, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // User can't be found; unexpected error
        if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

        var appsecret_proof = '&appsecret_proof=' + crypto.createHmac('sha256', config.connections.facebook.clientSecret).update(user.facebook.accessToken).digest('hex');
        var url = 'https://graph.facebook.com/v2.5/' + user.facebook.profileId + '/groups?access_token=' + user.facebook.accessToken;

        var content = getFacebookContent(url, {}, appsecret_proof, function(err, content) {
            if (err) return done(err);  // An error occurred
            return done(null, content); // Retrieved groups
        });
    });
};

// Save selected groups
UserSchema.statics.saveFacebookGroups = function(id, groups, done) {
    mongoose.models['User'].findById(id, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // User can't be found; unexpected error
        if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

        user.facebook.groups = [];

        groups.forEach(function(group) {
            user.facebook.groups.push({
                groupId: group.split(':')[0],
                name: group.split(':')[1]
            });
        })

        // Save changes
        user.save(function (err) {
            if (err) return done(err);  // An error occurred
            return done(null, user);    // Saved groups
        });
    });
};

// --------- First-time setup for Facebook pages ---------

// Get pages to display on setup page
UserSchema.statics.setUpFacebookPages = function(id, done) {
    mongoose.models['User'].findById(id, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // User can't be found; unexpected error
        if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

        var appsecret_proof = '&appsecret_proof=' + crypto.createHmac('sha256', config.connections.facebook.clientSecret).update(user.facebook.accessToken).digest('hex');
        var url = 'https://graph.facebook.com/v2.5/' + user.facebook.profileId + '/likes?access_token=' + user.facebook.accessToken;

        var content = getFacebookContent(url, {}, appsecret_proof, function(err, content) {
            if (err) return done(err);  // An error occurred
            return done(null, content); // Retrieved pages
        });
    });
};

// Save selected pages
UserSchema.statics.saveFacebookPages = function(id, pages, done) {
    mongoose.models['User'].findById(id, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // User can't be found; unexpected error
        if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));
        
        user.facebook.pages = [];

        pages.forEach(function(page) {
            user.facebook.pages.push({
                pageId: page.split(':')[0],
                name: page.split(':')[1]
            });
        })

        // Save changes
        user.save(function (err) {
            if (err) return done(err);  // An error occurred
            return done(null, user);    // Saved pages
        });
    });
};

// Update content
UserSchema.methods.updateContent = function(done) {
    mongoose.models['User'].findById(this._id, function(err, user) {
        var appsecret_proof = '&appsecret_proof=' + crypto.createHmac('sha256', config.connections.facebook.clientSecret).update(user.facebook.accessToken).digest('hex');
        var lastUpdateTime = user.facebook.lastUpdateTime;

        // Set up async calls
        var calls = [];

        // Set up call for update time
        calls.push(function(callback) {
            callback(null, Date.now());
        });

        if (user.hasFacebook)
        {
            // Get page posts
            calls.push(function(callback) {
                var pagePosts = [];
                var progress = 0;
                if (user.facebook.pages.length > 0)
                {
                    user.facebook.pages.forEach(function(page) {
                        var feedUrl = 'https://graph.facebook.com/v2.5/' + page.pageId + '/posts?fields=id,story,message,link,full_picture,created_time&since=' + lastUpdateTime + '&access_token=' + user.facebook.accessToken;
                        var content = getFacebookPosts(feedUrl, [], page.name, 'page', appsecret_proof, function(err, content) {
                            // An error occurred
                            if (err) return callback(err);

                            // Retrieved posts successfully
                            Array.prototype.push.apply(pagePosts, content);
                            progress++;
                            if (progress == user.facebook.pages.length)
                            {
                                callback(null, pagePosts);
                            }
                        });
                    });
                }
                else
                {
                    callback(null, []);
                }
            });

            // Get group posts
            calls.push(function(callback) {
                var groupPosts = [];
                var progress = 0;
                if (user.facebook.groups.length > 0)
                {
                    user.facebook.groups.forEach(function(group) {
                        var feedUrl = 'https://graph.facebook.com/v2.5/' + group.groupId + '/feed?fields=id,story,message,link,full_picture,created_time&since=' + lastUpdateTime + '&access_token=' + user.facebook.accessToken;
                        var content = getFacebookPosts(feedUrl, [], group.name, 'group', appsecret_proof, function(err, content) {
                            // An error occurred
                            if (err) return callback(err);

                            // Retrieved posts successfully
                            Array.prototype.push.apply(groupPosts, content);
                            progress++;
                            if (progress == user.facebook.groups.length)
                            {
                                callback(null, groupPosts);
                            }
                        });
                    });
                }
                else
                {
                    callback(null, []);
                }
            });
        }

        async.parallel(calls, function(err, results) {
            if (err) return done(err);

            var progress = 0;

            // Group posts together and sort by timestamp
            Array.prototype.push.apply(results[1], results[2]);
            results[1].sort(function(a, b) {
                return new Date(a.timestamp) - new Date(b.timestamp)
            });

            // Set new last update time
            user.facebook.lastUpdateTime = results[0];

            if (results[1].length > 0)
            {
                results[1].forEach(function(post) {
                    user.facebook.posts.push(post);
                    progress++;
                    if (progress == results[1].length)
                    {
                        user.save(function (err) {
                            if (err) return done(err);              // An error occurred
                            return done(null, user.facebook.posts); // Saved posts and update time; return posts
                        });
                    }
                });
            }
            else
            {
                // No new posts, set new update time
                user.save(function (err) {
                    if (err) return done(err);  // An error occurred
                    return done(null, null);    // Saved update time
                });
            }
        });
    });
};

// Set up passport local strategy with mongoose
UserSchema.plugin(passportLocalMongoose, {
    usernameField: 'email' // Use 'email' field instead of default 'username' field
});

module.exports = mongoose.model('User', UserSchema);