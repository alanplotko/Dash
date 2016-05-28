// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings').connections;

// --------- Dependencies ---------
var mongoose = require('mongoose');
var moment = require('moment');
var crypto = require('crypto');
var request = require('request');
var async = require('async');

module.exports = function(UserSchema) {

    /*========================
     * Facebook Connection
    ==========================*/

    // Check if user has existing Facebook connection
    UserSchema.virtual('hasFacebook').get(function() {
        return !!(this.facebook.profileId);
    });

    // Populate user's Facebook identifiers and tokens
    UserSchema.statics.addFacebook = function(id, connection, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null,
                new Error('An error occurred. Please try again in a ' +
                    'few minutes.'));

            if (connection.reauth) {
                return done('Missing permissions for Facebook have been ' +
                    'regranted.');
            } else if (connection.refreshAccessToken) {
                delete connection.refreshAccessToken;
                user.facebook = connection;
                user.save(function(err) {
                    // Database Error
                    if (err) return done(err);

                    // Success: Refreshed access token for Facebook connection
                    return done('Access privileges for Facebook have been ' +
                        'renewed.');
                });
            } else if (user.hasFacebook) {
                // Defined Error: Connection already exists
                return done(new Error('You\'re already ' +
                    'connected with Facebook.'));
            }

            // Save connection information (excluding other states) to account
            delete connection.reauth;
            delete connection.refreshAccessToken;
            user.facebook = connection;
            user.save(function(err) {
                // Database Error
                if (err) return done(err);

                // Success: Added Facebook connection
                return done(null, user);
            });
        });
    };

    /**
     * Remove user's Facebook identifiers and tokens;
     * deauthorize Dash app from account
     */
    UserSchema.statics.removeFacebook = function(id, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(new Error('An error occurred. Please ' +
                'try again in a few minutes.'));

            // Defined Error: Connection does not exist
            if (!user.hasFacebook) return done(new Error('You\'re not ' +
                'connected with Facebook.'));

            var appSecretProof = '&appsecret_proof=' +
                crypto.createHmac('sha256',
                    config.connections.facebook.clientSecret).
                    update(user.facebook.accessToken).digest('hex');

            var url = 'https://graph.facebook.com/v2.5/' +
                      user.facebook.profileId + '/permissions?access_token=' +
                      user.facebook.accessToken + appSecretProof;

            request.del({
                'url': url,
                'json': true
            }, function(err, res, body) {
                // Request Error
                if (err) return done(err);

                // Access Token Error
                if (body.error && body.error.code == 190) {
                    return done('400-Facebook');
                }

                // Success: Deauthorized Dash app
                if (body.success) {
                    // Remove relevant Facebook data
                    user.facebook = user.lastUpdateTime.facebook = undefined;
                    user.save(function(err) {
                        // Database Error
                        if (err) return done(err);

                        // Success: Removed Facebook connection
                        return done(null, user);
                    });
                }
            });
        });
    };

    // Retrieve Facebook content for user to select from
    function getFacebookContent(url, content, appSecretProof, done) {
        request({
            'url': url + appSecretProof,
            'json': true
        },
            function(err, res, body) {
                // Request Error
                if (err) return done(err);

                // Access Token Error
                if (body.error && body.error.code == 190) {
                    return done('400-Facebook');
                }

                if (body.data && body.data.length > 0) {
                    body.data.forEach(function(element) {
                        // Skip non-Facebook pages and merged pages
                        if ((element.link &&
                            element.link.indexOf(
                                'https://www.facebook.com') === -1) ||
                                element.best_page) return;
                        var coverImage;
                        if (element.cover) coverImage = element.cover.source;

                        content[element.name] = {
                            'id': element.id,
                            'cover': coverImage || '/static/img/no-image.png',
                            'description': element.description ||
                                           element.about ||
                                           'No description provided.',
                            'is_verified': element.is_verified || false,
                            'link': element.link ||
                                    'https://www.facebook.com/groups/' +
                                    element.id
                        };
                    });
                }

                // Go to next page
                if (body.paging && body.paging.next) {
                    getFacebookContent(body.paging.next, content,
                        appSecretProof, done);
                // Success: Retrieved all available content
                } else {
                    return done(null, content);
                }
            }
        );
    }

    // Retrieve Facebook posts for selected pages
    function getFacebookPosts(url, content, name, type, appSecretProof, done) {
        request({
            'url': url + appSecretProof,
            'json': true
        }, function(err, res, body) {
            // Request Error
            if (err) return done(err);

            // Access Token Error
            if (body.error && body.error.code == 190) {
                return done('400-Facebook');
            }

            if (body.data && body.data.length > 0) {
                body.data.forEach(function(element) {
                    var idInfo = element.id.split('_');
                    var permalink;

                    if (type === 'page') {
                        permalink = 'https://www.facebook.com/' +
                                    idInfo[0] + '/posts/' + idInfo[1];
                    } else {
                        permalink = 'https://www.facebook.com/groups' +
                                    idInfo[0] + '/permalink/' + idInfo[1];
                    }

                    if (element.message) {
                        if (element.story &&
                            element.story.indexOf(name) > -1) {
                            element.story = element.story.
                                            replace(name, '').
                                            trim().
                                            replace(/[.?!,:;]$/g, '');
                        }

                        content.push({
                            connection: 'facebook',
                            title: name,
                            actionDescription: element.story || '',
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

            // Go to next page
            if (body.paging && body.paging.next) {
                getFacebookPosts(body.paging.next, content, name, type,
                    appSecretProof, done);
            // Success: Retrieved all available posts meeting criteria
            } else {
                return done(null, content);
            }
        });
    }

    // --------- Setup: Facebook groups ---------

    // Retrieve Facebook groups to display on setup page
    UserSchema.statics.setUpFacebookGroups = function(id, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            var appSecretProof = '&appsecret_proof=' +
                crypto.createHmac('sha256',
                    config.connections.facebook.clientSecret).
                    update(user.facebook.accessToken).digest('hex');

            var url = 'https://graph.facebook.com/v2.5/' +
                      user.facebook.profileId + '/groups?fields=cover,name,' +
                      'id,description,is_verified&access_token=' +
                      user.facebook.accessToken;

            getFacebookContent(url, {}, appSecretProof, function(err, content) {
                // Error while retrieving content
                if (err) return done(err);

                // Success: Retrieved groups
                return done(null, content, user.facebook.groups);
            });
        });
    };

    // Save selected groups to user's account
    UserSchema.statics.saveFacebookGroups = function(id, groups, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            user.facebook.groups = [];

            groups.forEach(function(group) {
                user.facebook.groups.push({
                    groupId: group.substring(0, group.indexOf(':')),
                    name: group.substring(group.indexOf(':') + 1)
                });
            });

            user.save(function(err) {
                // Database Error
                if (err) return done(err);

                // Success: Saved selected Facebook groups
                return done(null, user);
            });
        });
    };

    // --------- Setup: Facebook pages ---------

    // Retrieve Facebook pages to display on setup page
    UserSchema.statics.setUpFacebookPages = function(id, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            var appSecretProof = '&appsecret_proof=' +
                crypto.createHmac('sha256',
                    config.connections.facebook.clientSecret).
                    update(user.facebook.accessToken).digest('hex');

            var url = 'https://graph.facebook.com/v2.5/' +
                      user.facebook.profileId + '/likes?fields=cover,name,id,' +
                      'description,link,is_verified,best_page,about&' +
                      'access_token=' + user.facebook.accessToken;

            getFacebookContent(url, {}, appSecretProof, function(err, content) {
                // Error while retrieving content
                if (err) return done(err);

                // Success: Retrieved pages
                return done(null, content, user.facebook.pages);
            });
        });
    };

    // Save selected pages to user's account
    UserSchema.statics.saveFacebookPages = function(id, pages, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            user.facebook.pages = [];

            pages.forEach(function(page) {
                user.facebook.pages.push({
                    pageId: page.substring(0, page.indexOf(':')),
                    name: page.substring(page.indexOf(':') + 1)
                });
            });

            user.save(function(err) {
                // Database Error
                if (err) return done(err);

                // Success: Saved selected Facebook pages
                return done(null, user);
            });
        });
    };

    // --------- Facebook content management ---------

    // Retrieve new content from Facebook
    UserSchema.methods.updateFacebook = function(calls) {
        var user = this;

        // Set up call for update time
        calls.facebookUpdateTime = function(callback) {
            callback(null, Date.now());
        };

        var appSecretProof = '&appsecret_proof=' + crypto.createHmac('sha256',
                             config.connections.facebook.clientSecret).
                             update(user.facebook.accessToken).digest('hex');

        var lastUpdateTime = user.lastUpdateTime.facebook ?
                             user.lastUpdateTime.facebook :
                             moment().add(-1, 'days').toDate();

        // Retrieve page posts
        calls.facebookPages = function(callback) {
            var pagePosts = [];
            var progress = 0;
            if (user.facebook.pages.length > 0) {
                user.facebook.pages.forEach(function(page) {
                    var feedUrl = 'https://graph.facebook.com/v2.5/' +
                                  page.pageId + '/posts?fields=id,story,' +
                                  'message,link,full_picture,created_time' +
                                  '&since=' + lastUpdateTime +
                                  '&access_token=' + user.facebook.accessToken;

                    var content = getFacebookPosts(feedUrl, [], page.name,
                        'page', appSecretProof, function(err, content) {
                            // An error occurred
                            if (err) return callback(err);

                            // Retrieved posts successfully
                            Array.prototype.push.apply(pagePosts, content);
                            progress++;
                            if (progress == user.facebook.pages.length) {
                                callback(null, pagePosts);
                            }
                        }
                    );
                });
            } else {
                callback(null, []);
            }
        };

        // Retrieve group posts
        calls.facebookGroups = function(callback) {
            var groupPosts = [];
            var progress = 0;
            if (user.facebook.groups.length > 0) {
                user.facebook.groups.forEach(function(group) {
                    var feedUrl = 'https://graph.facebook.com/v2.5/' +
                                   group.groupId + '/feed?fields=id,story,' +
                                   'message,link,full_picture,created_time&' +
                                   'since=' + lastUpdateTime +
                                   '&access_token=' + user.facebook.accessToken;

                    var content = getFacebookPosts(feedUrl, [], group.name,
                        'group', appSecretProof, function(err, content) {
                            // An error occurred
                            if (err) return callback(err);

                            // Retrieved posts successfully
                            Array.prototype.push.apply(groupPosts, content);
                            progress++;
                            if (progress == user.facebook.groups.length) {
                                callback(null, groupPosts);
                            }
                        }
                    );
                });
            } else {
                callback(null, []);
            }
        };

        return calls;
    };

    // Retrieve only new content from Facebook on the connections page
    UserSchema.methods.refreshFacebook = function(done) {
        mongoose.models.User.findById(this._id, function(err, user) {
            // Set up async calls
            var calls = {};

            if (user.hasFacebook && user.facebook.acceptUpdates) {
                calls = user.updateFacebook(calls, user);
            }

            async.parallel(calls, function(err, results) {
                if (err) return done(err);

                var progress = 0;
                var newPosts = [];

                if (user.hasFacebook && user.facebook.acceptUpdates) {
                    Array.prototype.push.apply(newPosts, results.facebookPages);
                    Array.prototype.push.apply(newPosts,
                        results.facebookGroups);

                    // Set new last update time
                    user.lastUpdateTime.facebook = results.facebookUpdateTime;
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

    // Enable or disable updates for Facebook
    UserSchema.methods.toggleFacebook = function(done) {
        mongoose.models.User.findById(this._id, function(err, user) {
            var message = 'Facebook is not currently configured.';
            if (user.hasFacebook) {
                if (user.facebook.acceptUpdates) {
                    user.facebook.acceptUpdates = false;
                    message = 'Facebook updates have been disabled. ' +
                              'Refreshing...';
                } else {
                    user.facebook.acceptUpdates = true;
                    message = 'Facebook updates have been enabled. ' +
                              'Refreshing...';
                }
            }

            user.save(function(err) {
                if (err) return done(err);  // An error occurred
                return done(null, message); // Saved update preference
            });
        });
    };
};
