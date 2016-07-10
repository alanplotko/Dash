// --------- Dependencies ---------
var mongoose = require('mongoose');
var moment = require('moment');
var request = require('request');
var refresh = require('passport-oauth2-refresh');
var async = require('async');

module.exports = function(UserSchema, messages) {
  /**
   * Check if the user is connected to YouTube.
   * @return {Boolean} A status of whether the user has added this service
   */
  UserSchema.virtual('hasYouTube').get(function() {
    return Boolean(this.youtube.profileId);
  });

  /**
   * Populate the user's YouTube identifiers and tokens.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Object}   service     User-specific details for the service
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.addYouTube = function(id, service, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      if (service.reauth) {
        return done(messages.STATUS.YOUTUBE.MISSING_PERMISSIONS);
      } else if (service.refreshAccessToken) {
        delete service.refreshAccessToken;
        user.youtube = service;
        user.save(function(err) {
          // Database Error
          if (err) {
            return done(err);
          }

          // Success: Refreshed access token for YouTube service
          return done(messages.STATUS.YOUTUBE.RENEWED);
        });
      } else if (user.hasYouTube) {
        // Defined Error: Service already exists
        return done(new Error(messages.STATUS.YOUTUBE.ALREADY_CONNECTED));
      }

      // Save service information (excluding other states) to account
      delete service.reauth;
      delete service.refreshAccessToken;
      user.youtube = service;
      user.save(function(err) {
        // Database Error
        if (err) {
          return done(err);
        }

        // Success: Added YouTube service
        return done(null, user);
      });
    });
  };

  /**
   * Remove the user's YouTube identifiers and tokens and deauthorize Dash app
   * from the account.
   *
   * @param  {ObjectId} id   The current user's id in MongoDB
   * @param  {Function} done The callback function to execute upon completion
   */
  UserSchema.statics.removeYouTube = function(id, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(new Error(messages.ERROR.GENERAL));
      }

      // Defined Error: Service does not exist
      if (!user.hasYouTube) {
        return done(new Error(messages.STATUS.YOUTUBE.NOT_CONNECTED));
      }

      var url = 'https://accounts.google.com/o/oauth2/revoke?token=' +
      user.youtube.accessToken;

      request({url: url, json: true}, function(err, res, body) {
        // Request Error
        if (err) {
          return done(err);
        }

        // Access Token Error
        if (res.statusCode === 400 && body.error === 'invalid_token') {
          return done('400-YouTube');
        }

        // Success: Deauthorized Dash app (or app already deauthorized)
        if (res.statusCode === 200) {
          // Remove relevant YouTube data
          user.youtube = user.lastUpdateTime.youtube = undefined;
          user.save(function(err) {
            // Database Error
            if (err) {
              return done(err);
            }

            // Success: Removed YouTube service
            return done(null, user);
          });
        }
      });
    });
  };

  /**
   * Retrieve YouTube content for the user to select from.
   * @param  {string}   url            The YoUTube API URL
   * @param  {string}   nextPageToken  The token to access the next page of
   *                                   results from the YouTube API
   * @param  {Object}   content        Holds all collected activity
   * @param  {Function} done           The callback function to execute upon
   *                                   completion
   */
  function getYouTubeContent(url, nextPageToken, content, done) {
    request({url: url + nextPageToken, json: true}, function(err, res, body) {
      // Request Error
      if (err) {
        return done(err);
      }

      // Access Token Error
      if (body.error && ((body.error.code === 401 &&
          body.error.message === 'Invalid Credentials') ||
          body.error.code === 403)) {
        return done('400-YouTube');
      }

      if (body.items && body.items.length > 0) {
        body.items.forEach(function(element) {
          content[element.snippet.title] = {
            id: element.snippet.resourceId.channelId,
            thumbnail: element.snippet.thumbnails.high.url ||
              element.snippet.thumbnails.default.url,
            description: element.snippet.description ||
              'No description provided.'
          };
        });
      }

      // Go to next page if possible
      if (body.nextPageToken) {
        getYouTubeContent(url, '&pageToken=' + body.nextPageToken, content,
          done);
      } else {
        // Success: Retrieved all available content
        return done(null, content);
      }
    });
  }

  // --------- Setup: YouTube subscriptions ---------

  /**
   * Retrieve YouTube subscriptions to display on setup page.
   * @param  {ObjectId} id          The current user's id in MongoDB
   * @param  {Function} done        The callback function to execute upon
   *                                completion
   */
  UserSchema.statics.setUpYouTubeSubs = function(id, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      var url = 'https://www.googleapis.com/youtube/v3/subscriptions?' +
        'part=snippet&maxResults=50&mine=true&order=alphabetical&' +
        'access_token=' + user.youtube.accessToken;

      getYouTubeContent(url, '', {}, function(err, content) {
        // Error while retrieving content
        if (err && err === '400-YouTube') {
          refresh.requestNewAccessToken('youtube', user.youtube.refreshToken,
            function(err, accessToken, refreshToken) {
              // Request Error
              if (err) {
                return done(err);
              }

              user.youtube.accessToken = accessToken;
              user.save(function(err) {
                // Database Error
                if (err) {
                  return done(err);
                }

                // Successfully refreshed access token
                return done(new Error(messages.STATUS.YOUTUBE.REFRESHED_TOKEN));
              });
            });
        } else {
          return done(null, content, user.youtube.subscriptions);
        }
      });
    });
  };

  /**
   * Save selected subscriptions to the user's account.
   * @param  {ObjectId} id            The current user's id in MongoDB
   * @param  {Object[]} subscriptions A list of subscriptions that the
   *                                  user selected
   * @param  {Function} done          The callback function to execute upon
   *                                  completion
   */
  UserSchema.statics.saveYouTubeSubs = function(id, subscriptions, done) {
    mongoose.models.User.findById(id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(null, null, new Error(messages.ERROR.GENERAL));
      }

      user.youtube.subscriptions = [];
      subscriptions.forEach(function(sub) {
        var info = sub.split(';');
        user.youtube.subscriptions.push({
          subscriptionId: info[0],
          name: info[1],
          thumbnail: info[2]
        });
      });
      user.save(function(err) {
        // Database Error
        if (err) {
          return done(err);
        }

        // Success: Saved selected YouTube subscriptions
        return done(null, user);
      });
    });
  };

  /**
   * Retrieve YouTube video posts for selected subscriptions.
   * @param  {string}   url            The YouTube API URL
   * @param  {string}   nextPageToken  The token to access the next page of
   *                                   results from the YouTube API
   * @param  {Object}   content        Holds all collected activity
   * @param  {string}   name           A reader-friendly identifier for the
   *                                   activity source
   * @param  {Function} done           The callback function to execute upon
   *                                   completion
   */
  function getYouTubeUploads(url, nextPageToken, content, name, done) {
    request({
      url: url + ((nextPageToken === null) ? '' : '&pageToken=' +
        nextPageToken),
      json: true
    }, function(err, res, body) {
      // Request Error
      if (err) {
        return done(err);
      }

      // Access Token Error
      if (body.error && (body.error.code === 400 ||
          body.error.code === 403)) {
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
            service: 'youtube',
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

      // Go to next page if possible
      if (body.nextPageToken) {
        getYouTubeUploads(url, body.nextPageToken, content, name, done);
      } else {
        // Success: Retrieved all available posts meeting criteria
        return done(null, content);
      }
    });
  }

  // --------- YouTube content management ---------

  /**
   * Retrieve new content from YouTube.
   * @param  {Object} calls An object containing the calls to asycnhronously
   *                        execute to fetch new content
   * @return {Object}       The calls after they have been populated
   */
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
          var feedUrl = 'https://www.googleapis.com/youtube/v3/activities' +
            '?part=snippet%2CcontentDetails&channelId=' +
            account.subscriptionId + '&maxResults=50&publishedAfter=' +
            lastUpdateTime.toISOString() + '&access_token=' +
            user.youtube.accessToken;

          getYouTubeUploads(feedUrl, null, [], account.name,
            function(err, content) {
              // An error occurred
              if (err) {
                return callback(err);
              }

              // Retrieved posts successfully
              Array.prototype.push.apply(videoPosts, content);
              progress++;
              if (progress === user.youtube.subscriptions.length) {
                callback(null, videoPosts);
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
   * Retrieve only new content from YouTube on the services page.
   * @param {Function} done The callback function to execute upon completion
   */
  UserSchema.methods.refreshYouTube = function(done) {
    mongoose.models.User.findById(this._id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      var calls = {};

      if (user.hasYouTube && user.youtube.acceptUpdates) {
        calls = user.updateYouTube(calls, user);
      }

      async.parallel(calls, function(err, results) {
        if (err) {
          return done(err);
        }

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
            if (err) {
              return done(err);
            }

            // Saved posts and update times; return new posts
            return done(null, newPosts);
          });
        } else {
          // No new posts, set new update time
          user.save(function(err) {
            // An error occurred
            if (err) {
              return done(err);
            }

            // Saved update time
            return done(null, null);
          });
        }
      });
    });
  };

  /**
   * Enable or disable updates for YouTube.
   * @param {Function} done The callback function to execute upon completion
   */
  UserSchema.methods.toggleYouTube = function(done) {
    mongoose.models.User.findById(this._id, function(err, user) {
      // Database Error
      if (err) {
        return done(err);
      }

      var message = messages.STATUS.YOUTUBE.NOT_CONFIGURED;
      if (user.hasYouTube) {
        message = user.youtube.acceptUpdates ?
          messages.STATUS.YOUTUBE.UPDATES_DISABLED :
          messages.STATUS.YOUTUBE.UPDATES_ENABLED;
        user.youtube.acceptUpdates = !user.youtube.acceptUpdates;
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
