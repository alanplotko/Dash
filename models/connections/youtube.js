// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings')['connections'];

// --------- Dependencies ---------
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment');
var crypto = require('crypto');
const https = require('https');

module.exports = function(UserSchema) {

    /*========================
     * YouTube Connection
    ==========================*/

    // Check if user has existing YouTube connection
    UserSchema.virtual('hasYouTube').get(function() {
        return !!(this.youtube.profileId);
    });

    // Add YouTube id and access token to user
    UserSchema.statics.addYouTube = function(id, connection, done) {
        mongoose.models['User'].findById(id, function(err, user) {
            // An error occurred
            if (err) return done(err);

            // User can't be found; unexpected error
            if (!user) return done(null, null, new Error('An error occurred. Please try again in a few minutes.'));

            // Connection already exists
            if(user.hasYouTube) return done(new Error('You\'re already connected with YouTube.'));

            // Add YouTube connection
            user.youtube = connection;

            // Save changes
            user.save(function (err) {
                if (err) return done(err);  // An error occurred
                return done(null, user);    // Added connection
            });
        });
    };

    // Remove YouTube
    UserSchema.statics.removeYouTube = function(id, done) {
        mongoose.models['User'].findById(id, function(err, user) {
            // An error occurred
            if (err) return done(err);

            // User can't be found; unexpected error
            if (!user) return done(new Error('An error occurred. Please try again in a few minutes.'));

            // Connection already exists
            if(!user.hasYouTube) return done(new Error('You\'re not connected with YouTube.'));
            
            // Remove YouTube connection and update time
            user.youtube = user.lastUpdateTime.youtube = undefined;

            // Save changes
            user.save(function (err) {
                if (err) return done(err);  // An error occurred
                return done(null, user);    // Removed connection
            });
        });
    };

    // Get YouTube subscriptions
    function getYouTubeContent(url, content, name, type, done) {
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

                        if (element.message)
                        {
                            if (element.story && element.story.indexOf(name) > -1)
                            {
                                element.story = element.story.replace(name, '').trim().replace(/[.?!,:;]$/g, '');
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

    // Get YouTube updates
    UserSchema.methods.updateYouTube = function(calls) {
        // To do: get subscriber updates
        return calls;
    };
    /*function getYouTubeContent(url, content, name, type, appSecretProofString, done) {
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

                        if (element.message)
                        {
                            if (element.story && element.story.indexOf(name) > -1)
                            {
                                element.story = element.story.replace(name, '').trim().replace(/[.?!,:;]$/g, '');
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
                if (buffer.paging && buffer.paging.next)
                {
                    getYouTubeContent(buffer.paging.next, content, name, type, appSecretProofString, done);
                }
                else
                {
                    done(null, content);
                }
            });
        }).on('error', (err) => { done(err); });
    }
    
    // Update content
    UserSchema.methods.updateContent = function(done) {
        mongoose.models['User'].findById(this._id, function(err, user) {
            var appsecret_proof = '&appsecret_proof=' + crypto.createHmac('sha256', config.connections.facebook.clientSecret).update(user.facebook.accessToken).digest('hex');
            var lastUpdateTime = user.lastUpdateTime.facebook ? user.lastUpdateTime.facebook : moment().add(-1, 'days').toDate();

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
                user.lastUpdateTime.facebook = results[0];

                if (results[1].length > 0)
                {
                    results[1].forEach(function(post) {
                        user.posts.push(post);
                        progress++;
                        if (progress == results[1].length)
                        {
                            user.save(function (err) {
                                if (err) return done(err);              // An error occurred
                                return done(null, user.posts); // Saved posts and update time; return posts
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
    };*/
};