// --------- Dependencies ---------
let moment = require('moment');
let crypto = require('crypto');
let messages = require('../../config/messages');
let settings = require('../../config/settings');

/**
 * Saves the items to the user document successfully or returns a general error.
 * @param  {Object}   user        The user object
 * @param  {Object}   returnObj   The object to return via the callback
 * @param  {Function} done        The callback function to execute
 * @return {done}                 Execute the callback upon return with the
 *                                error and the object to return, if either
 *                                are present
 */
let saveToUser = module.exports.saveToUser = function(user, returnObj, done) {
  return user.save(function(err) {
    // An error occurred
    if (err) {
      return done(new Error(messages.ERROR.GENERAL));
    }

    // Complete save
    return done(null, returnObj);
  });
};

/**
 * Checks if the error message indicates that a refresh is possible for the
 * access token associated with the service. Returns the same error if it is
 * eligible or a general error if it is not. It will proceed past this method
 * only if it is eligible for a refresh; otherwise, it will return a general
 * error and thus exit the control flow for a refresh.
 * @param  {Object|string}    err         The error to check
 * @param  {string}           serviceName The name of the service associated
 *                                        with the error
 * @param  {Function}           done      The callback function to execute
 * @return {done}                         Execute the callback upon return with
 *                                        the error and the object to return,
 *                                        if either are present
 */
module.exports.checkIfRefreshEligible = function(err, serviceName, done) {
  if (err === '400-' + serviceName) {
    return done(err);
  }
  return done(new Error(messages.ERROR.GENERAL));
};

/**
 * Processes the posts retrieved from a service.
 * @param  {Object}   err             An error, if one has occurred
 * @param  {Object[]} content         The content retrieved from the service
 * @param  {Object}   updates         Progress details tracked by the caller
 * @param  {number}   expectedLength  The number of posts expected
 * @param  {Function} callback        The callback function to execute upon
 *                                    completion
 * @return {Object}                   The updated progress and list of posts
 */
module.exports.processContent = function(err, content, updates, expectedLength,
    callback) {
  // An error occurred
  if (err) {
    return callback(err);
  }

  // Retrieved content successfully
  Array.prototype.push.apply(updates.posts, content);
  updates.progress++;
  if (updates.progress === expectedLength) {
    return callback(null, updates.posts);
  }
  return {progress: updates.progress, posts: updates.posts};
};

/**
 * Generates the app secret proof for authorizing Facebook API calls.
 * @param  {string} token The user's Facebook access token
 * @return {string}       A portion of the URL containing the app secret proof
 *                        to attach to the full URL for the API call
 */
module.exports.generateAppSecretProof = function(token) {
  return '&appsecret_proof=' + crypto
    .createHmac('sha256', settings.SERVICES.FACEBOOK.CLIENT_SECRET)
    .update(token)
    .digest('hex');
};

/**
 * Completes the refresh operation by saving the new content.
 * @param  {string}   serviceName The name of the service that was refreshed
 * @param  {Object[]} newPosts    A list of new posts that have been received
 * @param  {Object}   user        The user object
 * @param  {Function} done        The callback function to execute
 * @return {Function}             Executes the saveToUser function to save any
 *                                available user data to the user document
 */
module.exports.completeRefresh = function(serviceName, newPosts, user, done) {
  if (newPosts.length > 0) {
    let newUpdate = {
      posts: newPosts,
      description: 'Checking in with ' + serviceName + ' for updates!'
    };
    user.batches.push(newUpdate);

    // Saved posts and update times; return new posts
    return saveToUser(user, newPosts, done);
  }

  // No new posts, set new update time
  return saveToUser(user, null, done);
};

/**
 * Process service deauthorization by deleting unnecessary fields.
 * @param  {string}   serviceName The name of the service that was refreshed
 * @param  {Object}   user        The user object
 * @param  {Function} done        The callback function to execute
 * @return {Function}             Executes the saveToUser function to save any
 *                                available user data to the user document
 */
module.exports.processDeauthorization = function(serviceName, user, done) {
  // Remove relevant service data
  user[serviceName.toLowerCase()] =
    user.lastUpdateTime[serviceName.toLowerCase()] = undefined;

  // Remove service
  return saveToUser(user, user, done);
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
