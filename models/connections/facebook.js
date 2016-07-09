// --------- Environment Setup ---------
var config = require.main.require('./config/settings')[process.env.NODE_ENV];
config.CONNECTIONS = require.main.require('./config/settings').CONNECTIONS;
var messages = require.main.require('./config/messages');

// --------- Dependencies ---------
var mongoose = require('mongoose');
var moment = require('moment');
var crypto = require('crypto');
var request = require('request');
var async = require('async');

module.exports = function(UserSchema) {
  /**
   * Check if the user has an existing Facebook connection.
   * @return {Boolean} A status of whether the user has added this connection
   */
  UserSchema.virtual('hasFacebook').get(function() {
    return Boolean(this.facebook.profileId);
  });

  /**
   * Populate the user's Facebook identifiers and tokens.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Object}   connection  User-specific details for the connection
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.addFacebook = function(id, connection, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      if (connection.reauth) {
        return done(messages.STATUS.FACEBOOK.MISSING_PERMISSIONS);
      } else if (connection.refreshAccessToken) {
        delete connection.refreshAccessToken;
        user.facebook = connection;
        user.save(function(err) {
          // Database Error
          if (err) {
            return done(err);
          }

          // Success: Refreshed access token for Facebook connection
          return done(messages.STATUS.FACEBOOK.RENEWED);
        });
      } else if (user.hasFacebook) {
        // Defined Error: Connection already exists
        return done(new Error(messages.STATUS.FACEBOOK.ALREADY_CONNECTED));
      }

      // Save connection information (excluding other states) to account
      delete connection.reauth;
      delete connection.refreshAccessToken;
      user.facebook = connection;
      user.save(function(err) {
        // Database Error
        if (err) {
          return done(err);
        }

        // Success: Added Facebook connection
        return done(null, user);
      });
    });
  };

  /**
   * Remove the user's Facebook identifiers and tokens and deauthorize Dash app
   * from the account.
   *
   * @param  {ObjectId} id   The current user's id in MongoDB
   * @param  {Function} done The callback function to execute upon completion
   */
  UserSchema.statics.removeFacebook = function(id, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(new Error(messages.ERROR.GENERAL));
      }

      // Defined Error: Connection does not exist
      if (!user.hasFacebook) {
        return done(new Error(messages.STATUS.FACEBOOK.NOT_CONNECTED));
      }

      var appSecretProof = '&appsecret_proof=' + crypto
        .createHmac('sha256', config.CONNECTIONS.FACEBOOK.CLIENT_SECRET)
        .update(user.facebook.accessToken)
        .digest('hex');

      var url = 'https://graph.facebook.com/v2.5/' +
        user.facebook.profileId + '/permissions?access_token=' +
        user.facebook.accessToken + appSecretProof;

      request.del({url: url, json: true}, function(err, res, body) {
        // Request Error
        if (err) {
          return done(err);
        }

        // Access Token Error
        if (body.error && body.error.code === 190) {
          return done('400-Facebook');
        }

        // Success: Deauthorized Dash app
        if (body.success) {
          // Remove relevant Facebook data
          user.facebook = user.lastUpdateTime.facebook = undefined;
          user.save(function(err) {
            // Database Error
            if (err) {
              return done(err);
            }

            // Success: Removed Facebook connection
            return done(null, user);
          });
        }
      });
    });
  };

  /**
   * Retrieve Facebook content for the user to select from.
   * @param  {string}   url            The Facebook API URL
   * @param  {Object}   content        Holds all collected activity
   * @param  {string}   appSecretProof Secret property to send to Facebook
   * @param  {Function} done           The callback function to execute upon
   *                                   completion
   */
  function getFacebookContent(url, content, appSecretProof, done) {
    request({url: url + appSecretProof, json: true}, function(err, res, body) {
      // Request Error
      if (err) {
        return done(err);
      }

      // Access Token Error
      if (body.error && body.error.code === 190) {
        return done('400-Facebook');
      }

      if (body.data && body.data.length > 0) {
        body.data.forEach(function(element) {
          // Skip non-Facebook pages and merged pages
          if ((element.link &&
              element.link.indexOf('https://www.facebook.com') === -1) ||
              element.best_page) {
            return;
          }

          var coverImage;
          if (element.cover) {
            coverImage = element.cover.source;
          }

          content[element.name] = {
            id: element.id,
            cover: coverImage || '/static/img/no-image.png',
            description: element.description || element.about ||
              'No description provided.',
            isVerified: element.is_verified || false,
            link: element.link || 'https://www.facebook.com/groups/' +
              element.id
          };
        });
      }

      // Go to next page if possible
      if (body.paging && body.paging.next) {
        getFacebookContent(body.paging.next, content, appSecretProof, done);
      } else {
        // Success: Retrieved all available content
        return done(null, content);
      }
    });
  }

  /**
   * Retrieve Facebook posts for selected pages.
   * @param  {string}   url            The Facebook API URL
   * @param  {Object}   content        Holds all collected activity
   * @param  {string}   name           A reader-friendly identifier for the
   *                                   activity source
   * @param  {string}   type           Distinguish between page and group
   *                                   activity
   * @param  {string}   appSecretProof Secret property to send to Facebook
   * @param  {Function} done           The callback function to execute upon
   *                                   completion
   */
  function getFacebookPosts(url, content, name, type, appSecretProof, done) {
    request({url: url + appSecretProof, json: true}, function(err, res, body) {
      // Request Error
      if (err) {
        return done(err);
      }

      // Access Token Error
      if (body.error && body.error.code === 190) {
        return done('400-Facebook');
      }

      if (body.data && body.data.length > 0) {
        body.data.forEach(function(element) {
          var idInfo = element.id.split('_');
          var permalink;

          if (type === 'page') {
            permalink = 'https://www.facebook.com/' + idInfo[0] + '/posts/' +
              idInfo[1];
          } else {
            permalink = 'https://www.facebook.com/groups' + idInfo[0] +
              '/permalink/' + idInfo[1];
          }

          if (element.message) {
            if (element.story && element.story.indexOf(name) > -1) {
              element.story = element.story
                .replace(name, '')
                .trim()
                .replace(/[.?!,:;]$/g, '');
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

      // Go to next page if possible
      if (body.paging && body.paging.next) {
        getFacebookPosts(body.paging.next, content, name, type, appSecretProof,
          done);
      } else {
        // Success: Retrieved all available posts meeting criteria
        return done(null, content);
      }
    });
  }

  // --------- Setup: Facebook groups ---------

  /**
   * Retrieve Facebook groups to display on setup page.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.setUpFacebookGroups = function(id, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      var appSecretProof = '&appsecret_proof=' + crypto
        .createHmac('sha256', config.CONNECTIONS.FACEBOOK.CLIENT_SECRET)
        .update(user.facebook.accessToken)
        .digest('hex');

      var url = 'https://graph.facebook.com/v2.5/' + user.facebook.profileId +
        '/groups?fields=cover,name,id,description,is_verified&access_token=' +
        user.facebook.accessToken;

      getFacebookContent(url, {}, appSecretProof, function(err, content) {
        // Error while retrieving content
        if (err) {
          return done(err);
        }

        // Success: Retrieved groups
        return done(null, content, user.facebook.groups);
      });
    });
  };

  /**
   * Save selected groups to the user's account.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Object[]} groups      A list of groups that the user selected
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.saveFacebookGroups = function(id, groups, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      user.facebook.groups = [];

      groups.forEach(function(group) {
        user.facebook.groups.push({
          groupId: group.substring(0, group.indexOf(':')),
          name: group.substring(group.indexOf(':') + 1)
        });
      });

      user.save(function(err) {
        // Database Error
        if (err) {
          return done(err);
        }

        // Success: Saved selected Facebook groups
        return done(null, user);
      });
    });
  };

  // --------- Setup: Facebook pages ---------

  /**
   * Retrieve Facebook pages to display on setup page.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.setUpFacebookPages = function(id, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      var appSecretProof = '&appsecret_proof=' + crypto
        .createHmac('sha256', config.CONNECTIONS.FACEBOOK.CLIENT_SECRET)
        .update(user.facebook.accessToken)
        .digest('hex');

      var url = 'https://graph.facebook.com/v2.5/' + user.facebook.profileId +
        '/likes?fields=cover,name,id,description,link,is_verified,best_page,' +
        'about&access_token=' + user.facebook.accessToken;

      getFacebookContent(url, {}, appSecretProof, function(err, content) {
        // Error while retrieving content
        if (err) {
          return done(err);
        }

        // Success: Retrieved pages
        return done(null, content, user.facebook.pages);
      });
    });
  };

  /**
   * Save selected pages to user's account.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Object[]} pages       A list of pages that the user selected
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.saveFacebookPages = function(id, pages, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      user.facebook.pages = [];

      pages.forEach(function(page) {
        user.facebook.pages.push({
          pageId: page.substring(0, page.indexOf(':')),
          name: page.substring(page.indexOf(':') + 1)
        });
      });

      user.save(function(err) {
        // Database Error
        if (err) {
          return done(err);
        }

        // Success: Saved selected Facebook pages
        return done(null, user);
      });
    });
  };

  // --------- Facebook content management ---------

  /**
   * Retrieve new content from Facebook.
   * @param  {Object} calls An object containing the calls to asycnhronously
   *                        execute to fetch new content
   * @return {Object}       The calls after they have been populated
   */
  UserSchema.methods.updateFacebook = function(calls) {
    var user = this;

    // Set up call for update time
    calls.facebookUpdateTime = function(callback) {
      callback(null, Date.now());
    };

    var appSecretProof = '&appsecret_proof=' + crypto
      .createHmac('sha256', config.CONNECTIONS.FACEBOOK.CLIENT_SECRET)
      .update(user.facebook.accessToken)
      .digest('hex');

    var lastUpdateTime = user.lastUpdateTime.facebook ?
      user.lastUpdateTime.facebook : moment().add(-1, 'days').toDate();

    // Retrieve page posts
    calls.facebookPages = function(callback) {
      var pagePosts = [];
      var progress = 0;
      if (user.facebook.pages.length > 0) {
        user.facebook.pages.forEach(function(page) {
          var feedUrl = 'https://graph.facebook.com/v2.5/' + page.pageId +
            '/posts?fields=id,story,message,link,full_picture,created_time' +
            '&since=' + lastUpdateTime + '&access_token=' +
            user.facebook.accessToken;

          getFacebookPosts(feedUrl, [], page.name, 'page', appSecretProof,
            function(err, content) {
              // An error occurred
              if (err) {
                return callback(err);
              }

              // Retrieved posts successfully
              Array.prototype.push.apply(pagePosts, content);
              progress++;
              if (progress === user.facebook.pages.length) {
                callback(null, pagePosts);
              }
            });
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
          var feedUrl = 'https://graph.facebook.com/v2.5/' + group.groupId +
            '/feed?fields=id,story,message,link,full_picture,created_time' +
            '&since=' + lastUpdateTime + '&access_token=' +
            user.facebook.accessToken;

          getFacebookPosts(feedUrl, [], group.name, 'group', appSecretProof,
            function(err, content) {
              // An error occurred
              if (err) {
                return callback(err);
              }

              // Retrieved posts successfully
              Array.prototype.push.apply(groupPosts, content);
              progress++;
              if (progress === user.facebook.groups.length) {
                callback(null, groupPosts);
              }
            });
        });
      } else {
        callback(null, []);
      }
    };

    return calls;
  };

  /**
   * Retrieve only new content from Facebook on the connections page.
   * @param {Function} done The callback function to execute upon completion
   */
  UserSchema.methods.refreshFacebook = function(done) {
    mongoose.models.User.findById(this._id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Set up async calls
      var calls = {};

      if (user.hasFacebook && user.facebook.acceptUpdates) {
        calls = user.updateFacebook(calls, user);
      }

      async.parallel(calls, function(err, results) {
        if (err) {
          return done(err);
        }

        var newPosts = [];

        if (user.hasFacebook && user.facebook.acceptUpdates) {
          Array.prototype.push.apply(newPosts, results.facebookPages);
          Array.prototype.push.apply(newPosts, results.facebookGroups);

          // Set new last update time
          user.lastUpdateTime.facebook = results.facebookUpdateTime;
        }

        // Sort posts by timestamp
        newPosts.sort(function(a, b) {
          return new Date(a.timestamp) - new Date(b.timestamp);
        });

        if (newPosts.length > 0) {
          var newUpdate = {
            posts: newPosts,
            description: 'Checking in with Facebook for updates!'
          };
          user.batches.push(newUpdate);
          user.save(function(err) {
            // An error occurred
            if (err) {
              return done(err);
            }

            // Saved posts and update times; return new posts
            return done(null, newPosts);
          });
        // No new posts, set new update time
        } else {
          user.save(function(err) {
            // An error occurred
            if (err) {
              return done(err);
            }
            // Saved new update time
            return done(null, null);
          });
        }
      });
    });
  };

  /**
   * Enable or disable updates for Facebook.
   * @param {Function} done The callback function to execute upon completion
   */
  UserSchema.methods.toggleFacebook = function(done) {
    mongoose.models.User.findById(this._id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      var message = messages.STATUS.FACEBOOK.NOT_CONFIGURED;
      if (user.hasFacebook) {
        message = user.facebook.acceptUpdates ?
          messages.STATUS.FACEBOOK.UPDATES_DISABLED :
          messages.STATUS.FACEBOOK.UPDATES_ENABLED;
        user.facebook.acceptUpdates = !user.facebook.acceptUpdates;
      }

      user.save(function(err) {
        // An error occurred
        if (err) {
          return done(err);
        }

        // Saved update preference
        return done(null, message);
      });
    });
  };
};
