// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings')['connections'];

// --------- Dependencies ---------
var mongoose = require('mongoose');
var moment = require('moment');
var request = require('request');
var refresh = require('passport-oauth2-refresh');

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
        mongoose.models['User'].findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

            // Defined Error: Connection already exists
            if(user.hasYouTube) return done(new Error('You\'re already connected with YouTube.'));

            // Save connection information to account
            user.youtube = connection;
            user.save(function (err) {
                // Database Error
                if (err) return done(err);

                // Success: Added YouTube connection
                return done(null, user);
            });
        });
    };

    // Remove user's YouTube identifiers and tokens; deauthorize Dash app from account
    UserSchema.statics.removeYouTube = function(id, done) {
        mongoose.models['User'].findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(new Error('An error occurred. Please try again in a few minutes.'));

            // Defined Error: Connection does not exist
            if(!user.hasYouTube) return done(new Error('You\'re not connected with YouTube.'));
            
            var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + user.youtube.accessToken;

            request({ 'url': url, 'json': true }, function(err, res, body) {
                // Request Error
                if (err) return done(err);

                // Success: Deauthorized Dash app or Dash app already deauthorized
                if (res.statusCode == 200 || (res.statusCode == 400 && body.error === 'invalid_token'))
                {
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
        request({ 'url': url + nextPageToken, 'json': true }, function(err, res, body) {
            // Request Error
            if (err) return done(err);
            
            // Access Token Error
            if (body.error && body.error.code == 401 && body.error.message === 'Invalid Credentials') return done(new Error('Invalid Credentials'));

            if (body.items && body.items.length > 0)
            {
                body.items.forEach(function(element) {
                    content[element.snippet.title] = {
                        'id': element.snippet.resourceId.channelId,
                        'thumbnail': element.snippet.thumbnails.high.url || element.snippet.thumbnails.default.url,
                        'description': element.snippet.description || 'No description provided.'
                    }
                });
            }

            // Go to next page
            if (body.nextPageToken)
            {
                getYouTubeContent(url, '&pageToken=' + body.nextPageToken, content, done);
            }
            // Success: Retrieved all available content
            else
            {
                return done(null, content);
            }
        });
    }

    // --------- Setup: YouTube subscriptions ---------

    // Retrieve YouTube subscriptions to display on setup page
    UserSchema.statics.setUpYouTubeSubs = function(id, done) {
        mongoose.models['User'].findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

            var url = 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&maxResults=50&mine=true&order=alphabetical&access_token=' + user.youtube.accessToken;
            var retries = 2;
            var content = function() {
                if (retries > 0)
                {
                    retries--;
                    getYouTubeContent(url, '', {}, function(err, content) {
                        // Error while retrieving content
                        if (err)
                        {
                            if (err.message === 'Invalid Credentials')
                            {
                                refresh.requestNewAccessToken('youtube', user.youtube.refreshToken, function(err, accessToken, refreshToken) {
                                    user.youtube.accessToken = accessToken;
                                    user.save(function(err) {
                                        // Database Error
                                        if (err) return done(err);

                                        // Success: Saved new YouTube access token
                                        content();
                                    });
                                });
                            }
                            else
                            {
                                return done(err);
                            }
                        }

                        // Success: Retrieved subscriptions
                        return done(null, content, user.youtube.subscriptions);
                    });
                }
                else
                {
                    return done(new Error('An error occurred while refreshing credentials. Please try again in a few minutes.'));
                }
            };

            content();
        });
    };

    // Save selected subscriptions to user's account
    UserSchema.statics.saveYouTubeSubs = function(id, subscriptions, done) {
        mongoose.models['User'].findById(id, function(err, user) {
            // Database Error
            if (err) return done(err);

            // Unexpected Error: User not found
            if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

            user.youtube.subscriptions = [];

            subscriptions.forEach(function(sub) {
                var info = sub.split(';');
                user.youtube.subscriptions.push({
                    subId: info[0],
                    name: info[1],
                    thumbnail: info[2]
                });
            })

            user.save(function (err) {
                // Database Error
                if (err) return done(err);

                // Success: Saved selected YouTube subscriptions
                return done(null, user);
            });
        });
    };

    // Get YouTube updates
    UserSchema.methods.updateYouTube = function(calls) {
        // To do: get subscriber updates
        return calls;
    };

};