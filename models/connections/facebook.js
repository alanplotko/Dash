// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.connections = require.main.require('./config/settings')['connections'];

// --------- Dependencies ---------
var mongoose = require('mongoose');
var moment = require('moment');
var crypto = require('crypto');
const https = require('https');

module.exports = function(UserSchema) {

    /*========================
     * Facebook Connection
    ==========================*/

    // Check if user has existing Facebook connection
    UserSchema.virtual('hasFacebook').get(function() {
        return !!(this.facebook.profileId);
    });

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
            
            // Remove Facebook connection and update time
            user.facebook = user.lastUpdateTime.facebook = undefined;

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
                        content[element.name] = {
                            'id': element.id
                        }
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
                // An error occurred
                if (err) return done(err);

                // Retrieved groups
                return done(null, content, user.facebook.groups);
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
                    groupId: group.substring(0, group.indexOf(':')),
                    name: group.substring(group.indexOf(':') + 1)
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
                // An error occurred
                if (err) return done(err);

                // Retrieved pages
                return done(null, content, user.facebook.pages); 
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
                    pageId: page.substring(0, page.indexOf(':')),
                    name: page.substring(page.indexOf(':') + 1)
                });
            })

            // Save changes
            user.save(function (err) {
                if (err) return done(err);  // An error occurred
                return done(null, user);    // Saved pages
            });
        });
    };

    // Update Facebook
    UserSchema.methods.updateFacebook = function(calls) {
        var user = this;

        // Set up call for update time
        calls['facebookUpdateTime'] = function(callback) {
            callback(null, Date.now());
        };

        var appsecret_proof = '&appsecret_proof=' + crypto.createHmac('sha256', config.connections.facebook.clientSecret).update(user.facebook.accessToken).digest('hex');
        var lastUpdateTime = user.lastUpdateTime.facebook ? user.lastUpdateTime.facebook : moment().add(-1, 'days').toDate();

        // Get page posts
        calls['facebookPages'] = function(callback) {
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
        };

        // Get group posts
        calls['facebookGroups'] = function(callback) {
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
        };

        return calls;
    };
};