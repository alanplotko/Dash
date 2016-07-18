// --------- Dependencies ---------
var mongoose = require('mongoose');

/**
 * Saves the update for the user into the database or returns a general error
 * on failure.
 * @param  {Object}   user    The user object
 * @param  {Object}   obj     The object to return to the user
 * @param  {string}   message The message to display on an error
 * @param  {Function} done    The callback function to execute upon completion
 * @return {Function}         Execute the callback function
 */
function saveUpdate(user, obj, message, done) {
  return user.save(function(err) {
    // An error occurred
    if (err) {
      return done(new Error(message));
    }

    // Saved object to user
    return done(null, obj);
  });
}

module.exports = function(UserSchema, messages) {
  ['Facebook', 'YouTube'].forEach(function(serviceName) {
    /**
     * Populate service identifiers and tokens.
     * @param  {ObjectId} id          The current user's id in MongoDB
     * @param  {Object}   service     User-specific details for the service
     * @param  {Function} done        The callback function to execute upon
     *                                completion
     */
    UserSchema.statics['add' + serviceName] = function(id, service, done) {
      mongoose.models.User.findById(id, function(err, user) {
        // Database Error
        if (err) {
          return done(new Error(messages.ERROR.GENERAL));
        }

        // Unexpected Error: User not found
        if (!user) {
          return done(new Error(messages.ERROR.GENERAL));
        }

        if (service.reauth) {
          return done(messages.STATUS[serviceName.toUpperCase()]
            .MISSING_PERMISSIONS);
        } else if (service.refreshAccessToken) {
          delete service.refreshAccessToken;
          user[serviceName.toLowerCase()] = service;
          user.save(function(err) {
            // Database Error
            if (err) {
              return done(new Error(messages.ERROR.GENERAL));
            }

            // Success: Refreshed access token for service
            return done(messages.STATUS[serviceName.toUpperCase()].RENEWED);
          });
        } else if (user['has' + serviceName]) {
          // Defined Error: Service already exists
          return done(new Error(messages.STATUS[serviceName.toUpperCase()]
            .ALREADY_CONNECTED));
        } else {
          // Save service information (excluding other states) to account
          delete service.reauth;
          delete service.refreshAccessToken;
          user[serviceName.toLowerCase()] = service;
          return saveUpdate(user, user, messages.ERROR.GENERAL, done);
        }
      });
    };

    /**
     * Check if the user is connected to the service.
     * @return {Boolean} A status of whether the user has added this service
     */
    UserSchema.virtual('has' + serviceName).get(function() {
      return Boolean(this[serviceName.toLowerCase()].profileId);
    });

    /**
     * Enable or disable updates for a service.
     * @param {Function} done The callback function to execute upon completion
     */
    UserSchema.methods['toggle' + serviceName] = function(done) {
      mongoose.models.User.findById(this._id, function(err, user) {
        // Database Error
        if (err) {
          return done(new Error(messages.ERROR.GENERAL));
        }

        var message = messages.STATUS[serviceName.toUpperCase()].NOT_CONFIGURED;
        if (user['has' + serviceName]) {
          message = user[serviceName.toLowerCase()].acceptUpdates ?
            messages.STATUS[serviceName.toUpperCase()].UPDATES_DISABLED :
            messages.STATUS[serviceName.toUpperCase()].UPDATES_ENABLED;
          user[serviceName.toLowerCase()].acceptUpdates =
            !user[serviceName.toLowerCase()].acceptUpdates;
        }

        return saveUpdate(user, message, messages.ERROR.GENERAL, done);
      });
    };
  });
};
