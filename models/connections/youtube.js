// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings').connections;

// --------- Dependencies ---------
var mongoose = require('mongoose');
var moment = require('moment');
var request = require('request');
var refresh = require('passport-oauth2-refresh');
var async = require('async');

module.exports = function(UserSchema) {

    /*========================
     * YouTube Connection
    ==========================*/

    // Check if user has existing YouTube connection
    UserSchema.virtual('hasYouTube').get(function() {
        return !!(this.youtube.profileId);
    });

    // Populate user's YouTube identifiers and tokens
    UserSchema.statics.addYouTube = function(id, connection, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            if (connection.reauth) {
                return done('Missing permissions for YouTube have been ' +
                    'regranted.');
            } else if (connection.refreshAccessToken) {
                delete connection.refreshAccessToken;
                user.youtube = connection;
                user.save(function(err) {
                    // Database Error
                    if (err) return done(err);

                    // Success: Refreshed access token for YouTube connection
                    return done('Access privileges for YouTube have been ' +
                        'renewed.');
                });
            } else if (user.hasYouTube) {
                // Defined Error: Connection already exists
                return done(new Error('You\'re already connected with ' +
                    'YouTube.'));
            }

            // Save connection information (excluding other states) to account
            delete connection.reauth;
            delete connection.refreshAccessToken;
            user.youtube = connection;
            user.save(function(err) {
                // Database Error
                if (err) return done(err);

                // Success: Added YouTube connection
                return done(null, user);
            });
        });
    };

    /**
     * Remove user's YouTube identifiers and tokens;
     * deauthorize Dash app from account
     */
    UserSchema.statics.removeYouTube = function(id, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            // Defined Error: Connection does not exist
            if (!user.hasYouTube) return done(new Error('You\'re not ' +
                'connected with YouTube.'));

            var url = 'https://accounts.google.com/o/oauth2/revoke?token=' +
                      user.youtube.accessToken;

            request({
                'url': url,
                'json': true
            }, function(err, res, body) {
                // Request Error
                if (err) return done(err);

                // Access Token Error
                if (res.statusCode == 400 && body.error === 'invalid_token') {
                    return done('400-YouTube');
                }

                // Success: Deauthorized Dash app (or app already deauthorized)
                if (res.statusCode == 200) {
                    // Remove relevant YouTube data
                    user.youtube = user.lastUpdateTime.youtube = undefined;
                    user.save(function(err) {
                        // Database Error
                        if (err) return done(err);

                        // Success: Removed YouTube connection
                        return done(null, user);
                    });
                }
            });
        });
    };

    // Get YouTube subscriptions
    function getYouTubeContent(url, nextPageToken, content, done) {
        request({
            'url': url + nextPageToken,
            'json': true
        }, function(err, res, body) {
            // Request Error
            if (err) return done(err);

            // Access Token Error
            if (body.error && ((body.error.code == 401 &&
                body.error.message === 'Invalid Credentials') ||
                body.error.code == 403)) {
                return done('400-YouTube');
            }

            if (body.items && body.items.length > 0) {
                body.items.forEach(function(element) {
                    content[element.snippet.title] = {
                        'id': element.snippet.resourceId.channelId,

                        'thumbnail': element.snippet.thumbnails.high.url ||
                                     element.snippet.thumbnails.default.url,

                        'description': element.snippet.description ||
                                       'No description provided.'
                    };
                });
            }

            // Go to next page
            if (body.nextPageToken) {
                getYouTubeContent(url, '&pageToken=' + body.nextPageToken,
                    content, done);
            // Success: Retrieved all available content
            } else {
                return done(null, content);
            }
        });
    }

    // --------- Setup: YouTube subscriptions ---------

    // Retrieve YouTube subscriptions to display on setup page
    UserSchema.statics.setUpYouTubeSubs = function(id, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            var url = 'https://www.googleapis.com/youtube/v3/subscriptions?' +
                      'part=snippet&maxResults=50&mine=true&order=' +
                      'alphabetical&access_token=' + user.youtube.accessToken;

            getYouTubeContent(url, '', {}, function(err, content) {
                // Error while retrieving content
                if (err) {
                    if (err === '400-YouTube') {
                        refresh.requestNewAccessToken('youtube',
                            user.youtube.refreshToken,
                            function(err, accessToken, refreshToken) {
                                user.youtube.accessToken = accessToken;
                                user.save(function(err) {
                                    // Database Error
                                    if (err) return done(err);

                                    // Successfully refreshed access token
                                    return done(new Error('Refreshed ' +
                                        'Access Token'));
                                });
                        });
                    }
                } else {
                    return done(null, content, user.youtube.subscriptions);
                }
            });
        });
    };

    // Save selected subscriptions to user's account
    UserSchema.statics.saveYouTubeSubs = function(id, subscriptions, done) {
        mongoose.models.User.findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. ' +
                'Please try again in a few minutes.'));

            user.youtube.subscriptions = [];

            subscriptions.forEach(function(sub) {
                var info = sub.split(';');
                user.youtube.subscriptions.push({
                    subId: info[0],
                    name: info[1],
                    thumbnail: info[2]
                });
            });

            user.save(function(err) {
                // Database Error
                if (err) return done(err);

                // Success: Saved selected YouTube subscriptions
                return done(null, user);
            });
        });
    };

    // Retrieve YouTube video posts for selected subscriptions
    function getYouTubeUploads(url, nextPageToken, content, name, done) {
        request({
            'url': url + ((nextPageToken !== null) ? '&pageToken=' +
                nextPageToken : ''),
            'json': true
        }, function(err, res, body) {
            // Request Error
            if (err) return done(err);

            // Access Token Error
            if (body.error && (body.error.code == 400 ||
                body.error.code == 403)) {
                return done('400-YouTube');
            }

            if (body.items && body.items.length > 0) {
                body.items.forEach(function(element) {
                    // Continue with next iteration if activity is not an upload
                    if (!element.snippet || element.snippet.type !== 'upload') {
                        return;
                    }

                    var url = 'https://www.youtube.com/watch?v=' +
                        element.contentDetails.upload.videoId;
                    var permalink = 'https://www.youtube.com/channel/' +
                        element.snippet.channelId;

                    var picture = '';
                    var thumbnails = element.snippet.thumbnails;
                    if (thumbnails.maxres) {
                        picture = thumbnails.maxres.url;
                    } else if (thumbnails.standard) {
                        picture = thumbnails.standard.url;
                    } else {
                        picture = thumbnails.high.url;
                    }

                    var videoDesc = element.snippet.description.replace('\n',
                        '<br /><br />');
                    videoDesc = videoDesc.split(/\s+/, 200);
                    if (videoDesc.length === 200) {
                        videoDesc = videoDesc.join(' ') + '...';
                    } else {
                        videoDesc = videoDesc.join(' ');
                    }

                    content.push({
                        connection: 'youtube',
                        title: element.snippet.title,
                        actionDescription: element.snippet.channelTitle +
                                           ' uploaded a new video!',
                        content: videoDesc || '',
                        timestamp: element.snippet.publishedAt,
                        permalink: permalink,
                        picture: picture,
                        url: url,
                        postType: element.snippet.type
                    });
                });
            }

            // Go to next page
            if (body.nextPageToken) {
                getYouTubeUploads(url, body.nextPageToken, content, name, done);
            // Success: Retrieved all available posts meeting criteria
            } else {
                return done(null, content);
            }
        });
    }

    // Get YouTube updates
    UserSchema.methods.updateYouTube = function(calls) {
        var user = this;

        // Set up call for update time
        calls.youtubeUpdateTime = function(callback) {
            callback(null, Date.now());
        };

        var lastUpdateTime = user.lastUpdateTime.youtube ?
                             user.lastUpdateTime.youtube :
                             moment().add(-1, 'days').toDate();

        // Retrieve video posts
        calls.youtubeVideos = function(callback) {
            var videoPosts = [];
            var progress = 0;
            if (user.youtube.subscriptions.length > 0) {
                user.youtube.subscriptions.forEach(function(account) {
                    var feedUrl = 'https://www.googleapis.com/youtube/v3/' +
                                  'activities?part=snippet%2CcontentDetails' +
                                  '&channelId=' + account.subId +
                                  '&maxResults=50&' + 'publishedAfter=' +
                                  lastUpdateTime.toISOString() +
                                  '&access_token=' + user.youtube.accessToken;

                    var content = getYouTubeUploads(feedUrl, null, [],
                        account.name, function(err, content) {
                            // An error occurred
                            if (err) return callback(err);

                            // Retrieved posts successfully
                            Array.prototype.push.apply(videoPosts, content);
                            progress++;
                            if (progress == user.youtube.subscriptions.length) {
                                callback(null, videoPosts);
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

    // Retrieve only new content from YouTube on the connections page
    UserSchema.methods.refreshYouTube = function(done) {
        mongoose.models.User.findById(this._id, function(err, user) {
            var calls = {};

            if (user.hasYouTube && user.youtube.acceptUpdates) {
                calls = user.updateYouTube(calls, user);
            }

            async.parallel(calls, function(err, results) {
                if (err) return done(err);

                var newPosts = [];

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
                    var newUpdate = {
                        posts: newPosts,
                        description: 'Checking in with YouTube for updates!'
                    };
                    user.batches.push(newUpdate);
                    user.save(function(err) {
                        // An error occurred
                        if (err) return done(err);

                        // Saved posts and update times; return new posts
                        return done(null, newPosts);
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

    // Enable or disable updates for YouTube
    UserSchema.methods.toggleYouTube = function(done) {
        mongoose.models.User.findById(this._id, function(err, user) {
            var message = 'YouTube is not currently configured.';
            if (user.hasYouTube) {
                if (user.youtube.acceptUpdates) {
                    user.youtube.acceptUpdates = false;
                    message = 'YouTube updates have been disabled. ' +
                              'Reloading...';
                } else {
                    user.youtube.acceptUpdates = true;
                    message = 'YouTube updates have been enabled. ' +
                              'Reloading...';
                }
            }

            user.save(function(err) {
                if (err) return done(err);  // An error occurred
                return done(null, message); // Saved update preference
            });
        });
    };
};
