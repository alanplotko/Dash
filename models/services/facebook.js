// --------- Dependencies ---------
let mongoose = require('mongoose');
let request = require('request');
let async = require('async');
let handlers = require('./handlers');

module.exports = function(UserSchema, messages) {
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
        return done(new Error(messages.ERROR.GENERAL));
      }

      // Unexpected Error: User not found
      if (!user) {
        return done(new Error(messages.ERROR.GENERAL));
      }

      // Defined Error: Service does not exist
      if (!user.hasFacebook) {
        return done(new Error(messages.STATUS.FACEBOOK.NOT_CONNECTED));
      }

      let appSecretProof = handlers.generateAppSecretProof(user.facebook
        .accessToken);

      let url = 'https://graph.facebook.com/v2.5/' +
        user.facebook.profileId + '/permissions?access_token=' +
        user.facebook.accessToken + appSecretProof;

      request.del({url: url, json: true}, function(err, res, body) {
        // Request Error
        if (err) {
          return done(new Error(messages.ERROR.GENERAL));
        }

        // Access Token Error
        if (body.error && body.error.code === 190) {
          return done('400-Facebook');
        }

        // Success: Deauthorized Dash app
        if (body.success) {
          // Remove relevant Facebook data
          return handlers.processDeauthorization('Facebook', user, done);
        }

        // Return general error message
        return done(new Error(messages.ERROR.GENERAL));
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
    request.get({url: url + appSecretProof, json: true}, function(err, res,
        body) {
      // Request Error
      if (err) {
        return done(new Error(messages.ERROR.GENERAL));
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

          let coverImage;
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
    request.get({url: url + appSecretProof, json: true}, function(err, res,
        body) {
      // Request Error
      if (err) {
        return done(new Error(messages.ERROR.GENERAL));
      }

      // Access Token Error
      if (body.error && body.error.code === 190) {
        return done('400-Facebook');
      }

      if (body.data && body.data.length > 0) {
        body.data.forEach(function(element) {
          let idInfo = element.id.split('_');
          let permalink;

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
              service: 'facebook',
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

  [{
    key: 'page',
    route: 'likes'
  },
  {
    key: 'group',
    route: 'groups'
  }].forEach(function(type) {
    let plural = type.key + 's';
    let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);

    // --------- Setup: Facebook pages and groups ---------

    /**
     * Retrieve Facebook pages and groups to display on setup page.
     * @param  {ObjectId} id          The current user's id in MongoDB
     * @param  {Function} done        The callback function to execute upon
     *                                completion
     */
    UserSchema.statics['setUpFacebook' + formatted] = function(id, done) {
      mongoose.models.User.findById(id, function(err, user) {
        // Database Error
        if (err) {
          return done(new Error(messages.ERROR.GENERAL));
        }

        // Unexpected Error: User not found
        if (!user) {
          return done(null, null, new Error(messages.ERROR.GENERAL));
        }

        let appSecretProof = handlers.generateAppSecretProof(user.facebook
          .accessToken);

        let url = 'https://graph.facebook.com/v2.5/' + user.facebook.profileId +
          '/' + type.route + '?fields=cover,name,id,description,is_verified,' +
          'best_page,about&access_token=' + user.facebook.accessToken;

        getFacebookContent(url, {}, appSecretProof, function(err, content) {
          // Error while retrieving content
          if (err) {
            return handlers.checkIfRefreshEligible(err, 'Facebook', done);
          }

          // Success: Retrieved items
          return done(null, content, user.facebook[plural]);
        });
      });
    };

    /**
     * Save selected pages and groups to user's account.
     * @param  {ObjectId} id          The current user's id in MongoDB
     * @param  {Object[]} content     A list of content items that the user
     *                                selected
     * @param  {Function} done        The callback function to execute upon
     *                                completion
     */
    UserSchema.statics['saveFacebook' + formatted] = function(id, content,
        done) {
      mongoose.models.User.findById(id, function(err, user) {
        // Database Error
        if (err) {
          return done(new Error(messages.ERROR.GENERAL));
        }

        // Unexpected Error: User not found
        if (!user) {
          return done(null, null, new Error(messages.ERROR.GENERAL));
        }

        user.facebook[plural] = [];

        content.forEach(function(item) {
          let itemFormatted = {name: item.substring(item.indexOf(':') + 1)};
          itemFormatted[type.key + 'Id'] = item.substring(0, item.indexOf(':'));
          user.facebook[plural].push(itemFormatted);
        });

        // Save selected Facebook items
        return handlers.saveToUser(user, user, done);
      });
    };
  });

  // --------- Facebook content management ---------

  /**
   * Retrieve new content from Facebook.
   * @param  {Object} calls An object containing the calls to asycnhronously
   *                        execute to fetch new content
   * @return {Object}       The calls after they have been populated
   */
  UserSchema.methods.updateFacebook = function(calls) {
    let user = this;

    // Set up call for update time
    calls.facebookUpdateTime = function(callback) {
      callback(null, Date.now());
    };

    let appSecretProof = handlers.generateAppSecretProof(user.facebook
      .accessToken);

    let lastUpdateTime = handlers.getLastUpdateTime('Facebook', user);

    // Retrieve page and group posts
    [{
      key: 'page',
      route: 'posts'
    },
    {
      key: 'group',
      route: 'feed'
    }].forEach(function(type) {
      let plural = type.key + 's';
      let prop = 'facebook' + plural.charAt(0).toUpperCase() + plural.slice(1);
      calls[prop] = function(callback) {
        let updates = {
          progress: 0,
          posts: []
        };
        if (user.facebook[plural].length > 0) {
          user.facebook[plural].forEach(function(item) {
            let feedUrl = 'https://graph.facebook.com/v2.5/' +
              item[type.key + 'Id'] + '/' + type.route + '?fields=id,story,' +
              'message,link,full_picture,created_time&since=' + lastUpdateTime +
              '&access_token=' + user.facebook.accessToken;

            getFacebookPosts(feedUrl, [], item.name, type.key, appSecretProof,
              function(err, content) {
                updates = handlers.processContent(err, content, updates,
                  user.facebook[plural].length, callback);
              });
          });
        } else {
          callback(null, []);
        }
      };
    });

    return calls;
  };

  /**
   * Retrieve only new content from Facebook on the services page.
   * @param {Function} done The callback function to execute upon completion
   */
  UserSchema.methods.refreshFacebook = function(done) {
    mongoose.models.User.findById(this._id, function(err, user) {
      // Database Error
      if (err) {
        return done(new Error(messages.ERROR.GENERAL));
      }

      // Set up async calls
      let calls = {};

      if (user.hasFacebook && user.facebook.acceptUpdates) {
        calls = user.updateFacebook(calls, user);
      }

      async.parallel(calls, function(err, results) {
        if (err) {
          return handlers.checkIfRefreshEligible(err, 'Facebook', done);
        }

        let newPosts = [];

        if (user.hasFacebook && user.facebook.acceptUpdates) {
          Array.prototype.push.apply(newPosts, results.facebookPages);
          Array.prototype.push.apply(newPosts, results.facebookGroups);

          // Set new last update time
          user.lastUpdateTime.facebook = results.facebookUpdateTime;
        }

        // Sort posts by timestamp
        newPosts.sort(handlers.sortPosts);

        return handlers.completeRefresh('Facebook', newPosts, user, done);
      });
    });
  };
};
