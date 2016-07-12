// --------- Dependencies ---------
var moment = require('moment');
var crypto = require('crypto');
var config = require('../../config/settings');

/**
 * Generates the app secret proof for authorizing Facebook API calls.
 * @param  {string} token The user's Facebook access token
 * @return {string}       A portion of the URL containing the app secret proof
 *                        to attach to the full URL for the API call
 */
module.exports.generateAppSecretProof = function(token) {
  return '&appsecret_proof=' + crypto
    .createHmac('sha256', config.SERVICES.FACEBOOK.CLIENT_SECRET)
    .update(token)
    .digest('hex');
};

/**
 * Completes the refresh operation by saving the new content.
 * @param  {string}   serviceName The name of the service that was refreshed
 * @param  {Object[]} newPosts    A list of new posts that have been received
 * @param  {Object}   user        The user object
 * @param  {Function} done        The callback function to execute
 */
module.exports.completeRefresh = function(serviceName, newPosts, user, done) {
  if (newPosts.length > 0) {
    var newUpdate = {
      posts: newPosts,
      description: 'Checking in with ' + serviceName + ' for updates!'
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
};

/**
 * Process service deauthorization by deleting unnecessary fields.
 * @param  {string}   serviceName The name of the service that was refreshed
 * @param  {Object}   user        The user object
 * @param  {Function} done        The callback function to execute
 */
module.exports.processDeauthorization = function(serviceName, user, done) {
  // Remove relevant service data
  user[serviceName.toLowerCase()] =
    user.lastUpdateTime[serviceName.toLowerCase()] = undefined;
  user.save(function(err) {
    // Database Error
    if (err) {
      return done(err);
    }

    // Success: Removed service
    return done(null, user);
  });
};

/**
 * Gets the user's last update time for the service.
 * @param  {string}   serviceName The name of the service that was refreshed
 * @param  {Object}   user        The user object
 * @return {Date}                 Return the last update's timestamp to the user
 *                                formatted using the moment package
 */
module.exports.getLastUpdateTime = function(serviceName, user) {
  return user.lastUpdateTime[serviceName.toLowerCase()] ?
    user.lastUpdateTime[serviceName.toLowerCase()] :
    moment().add(-1, 'days').toDate();
};

/**
 * Compare method for post times.
 * @param  {Date} a The date for content item a's release
 * @param  {Date} b The date for content item b's release
 * @return {number} Difference of a and b for use in sorting content
 */
module.exports.sortPosts = function(a, b) {
  return new Date(a.timestamp) - new Date(b.timestamp);
};
