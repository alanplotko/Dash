// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');
require('./post');
require('./post_collection');
var PostCollection = mongoose.model('PostCollection');
var PostCollectionSchema = PostCollection.schema;
var passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var config = require('../config/settings');
var messages = require('../config/messages');

// --------- Account Constants ---------
var SALT_WORK_FACTOR = 10;
var MAX_LOGIN_ATTEMPTS = 5;
var LOCK_TIME = 2 * 60 * 60 * 1000; // 2-hour lock

// --------- User Fields ---------
var UserSchema = new Schema({

  // Username/Email
  email: {
    type: String,
    required: true,
    index: {
      unique: true
    }
  },

  // Personal
  displayName: {
    type: String,
    required: true
  },

  avatar: {
    type: String,
    required: true
  },

  // Password & Security
  password: {
    type: String,
    required: true
  },

  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },

  lockUntil: {
    type: Number
  },

  // Batches of post updates
  batches: [PostCollectionSchema],

  // Last time data pulled from services
  lastUpdateTime: {
    facebook: Date,
    youtube: Date
  },

  // Services
  facebook: {

    // Service status
    acceptUpdates: {
      type: Boolean,
      default: true
    },

    // Identifiers & Tokens
    profileId: {
      type: String,
      index: {
        unique: true,
        sparse: true
      }
    },

    accessToken: {
      type: String
    },

    refreshToken: {
      type: String
    },

    // Facebook Content
    groups: [{
      groupId: {
        type: String
      },

      name: {
        type: String
      }
    }],

    pages: [{
      pageId: {
        type: String
      },

      name: {
        type: String
      }
    }]
  },

  youtube: {

    // Service status
    acceptUpdates: {
      type: Boolean,
      default: true
    },

    // Identifiers & Tokens
    profileId: {
      type: String,
      index: {
        unique: true,
        sparse: true
      }
    },

    accessToken: {
      type: String
    },

    refreshToken: {
      type: String
    },

    // YouTube Content
    subscriptions: [{
      subscriptionId: {
        type: String
      },

      name: {
        type: String
      },

      thumbnail: {
        type: String
      }
    }]
  }
});

/**
 * User Handlers
 */

/**
 * Handles post operation error checking.
 * @param  {Object}           err        An error if one has occurred
 * @param  {?boolean|Object=} onSuccess  An object, boolean, or null to send
 *                                       back upon success for further
 *                                       processing or indicating the status of
 *                                       the operation
 * @param  {Function}         done       The callback function to execute upon
 *                                       completion
 * @param  {?Object}          extra      An optional, additional parameter to
 *                                       send back along with onSuccess
 * @return {Function}                    Run the callback after error checking
 */
function completeOperation(err, onSuccess, done, extra) {
  // Set extra parameter to null if not given
  extra = extra || null;

  // An error occurred
  if (err) {
    return done(err);
  }

  // Operation succeeded, check for extra parameter
  if (extra) {
    return done(null, onSuccess, extra);
  }
  return done(null, onSuccess);
}

/**
 * Updates user information given the user id and settings to change.
 * @param  {ObjectId} id        The current user's id in MongoDB
 * @param  {Object}   settings  An object containing the names and values of
 *                              the settings to update
 * @param  {Function} done      The callback function to execute upon completion
 * @return {Function}           Update the user information and run the callback
 */
function updateUserDetails(id, settings, done) {
  return mongoose.models.User.update({_id: id}, settings, function(err,
      numAffected) {
    return completeOperation(err, true, done);
  });
}

/**
 * User Account Functions
 */

/**
 * Check if user has existing account lock
 * @return {Boolean} A status of whether the user's account is locked
 */
UserSchema.virtual('isLocked').get(function() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Run checks prior to saving the document.
 * @param  {Function} next Pass control to the next matching route
 */
UserSchema.pre('save', function(next) {
  var user = this;

  // Check if the provided email address already exists
  mongoose.models.User.findOne({email: user.email}, function(err, user) {
    // An error occurred
    if (err) {
      return next(new Error(messages.ERROR.GENERAL));
    }
  });

  // Only hash password if it has been modified or is new
  if (user.isNew || !user.isModified('password')) {
    return next();
  }

  // Generate salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    // An error occurred
    if (err) {
      return next(new Error(messages.ERROR.GENERAL));
    }

    // Hash password using new salt
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) {
        return next(new Error(messages.ERROR.GENERAL));
      }

      // Set hashed password back on document
      user.password = hash;
      next();
    });
  });
});

/**
 * Validate the password received from the user for user authentication.
 * @param  {string}   candidatePassword A password received from the user to
 *                                      compare with the account's password
 *                                      for user authentication
 * @param  {Function} done              The callback function to execute upon
 *                                      completion
 */
UserSchema.methods.comparePassword = function(candidatePassword, done) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) {
      return done(err);
    }
    done(null, isMatch);
  });
};

/**
 * Increment the number of login attempts upon authentication failure.
 * @param  {Function} done  The callback function to execute upon completion
 * @return {Function}       Update the login count and run the callback
 */
UserSchema.methods.incLoginAttempts = function(done) {
  // If previous lock has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    }, done);
  }

  // Otherwise, increment login attempts count
  var updates = {
    $inc: {
      loginAttempts: 1
    }
  };

  // Lock account if max attempts reached and account is not already locked
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + LOCK_TIME
    };
  }

  return this.update(updates, done);
};

/**
 * Expose enum on model to provide internal reference.
 */
var reasons = UserSchema.statics.failedLogin = {
  NOT_FOUND: 0,
  PASSWORD_INCORRECT: 1,
  MAX_ATTEMPTS: 2
};

/**
 * Serialize function for use with passport.
 * @param  {Object}   user  A User object containing the user's account details
 * @param  {Function} done  The callback function to execute upon completion
 */
UserSchema.statics.authSerializer = function(user, done) {
  done(null, user.id);
};

/**
 * Deserialize function for use with passport.
 * @param  {ObjectId} id    The current user's id in MongoDB
 * @param  {Function} done  The callback function to execute upon completion
 */
UserSchema.statics.authDeserializer = function(id, done) {
  mongoose.models.User.findById(id, 'email displayName avatar batches ' +
    'facebook.profileId facebook.acceptUpdates youtube.profileId ' +
    'youtube.acceptUpdates', function(err, user) {
      done(err, user);
    });
};

/**
 * Authenticate the provided credentials.
 * @param  {string}   email    The email address received from the user
 * @param  {string}   password The password received from the user
 * @param  {Function} done     The callback function to execute upon completion
 */
UserSchema.statics.authenticateUser = function(email, password, done) {
  // Search for email address
  this.findOne({email: email}, function(err, user) {
    // An error occurred
    if (err) {
      return done(err);
    }

    // Check if user exists
    if (!user) {
      return done(null, null, reasons.NOT_FOUND);
    }

    // Check if account is currently locked
    if (user.isLocked) {
      // Increment login attempts if account is already locked
      return user.incLoginAttempts(function(err) {
        return completeOperation(err, null, done, reasons.MAX_ATTEMPTS);
      });
    }

    // Test provided credentials for matching password
    user.comparePassword(password, function(err, isMatch) {
      // An error occurred
      if (err) {
        return done(err);
      }

      // Check if password matched
      if (isMatch) {
        // If there's no lock or failed attempts, just return the user
        if (!user.loginAttempts && !user.lockUntil) {
          return done(null, user);
        }

        // Reset attempts and lock duration
        var updates = {
          $set: {
            loginAttempts: 0
          },
          $unset: {
            lockUntil: 1
          }
        };

        return user.update(updates, function(err) {
          return completeOperation(err, user, done);
        });
      }

      // Password incorrect, so increment login attempts before responding
      user.incLoginAttempts(function(err) {
        return completeOperation(err, null, done, reasons.PASSWORD_INCORRECT);
      });
    });
  });
};

/**
 * Update the user's settings.
 * @param  {ObjectId} id       The current user's id in MongoDB
 * @param  {Object}   settings An object containing the names and values of
 *                             the settings to update
 * @param  {Function} done     The callback function to execute upon completion
 */
UserSchema.statics.updateUser = updateUserDetails;

/**
 * Update the user's avatar to the default Gravatar.
 * @param  {ObjectId} id    The current user's id in MongoDB
 * @param  {string}   email The email address received from the user
 * @param  {Function} done  The callback function to execute upon completion
 * @return {Function}       Update the user information and run the callback
 */
UserSchema.statics.resetAvatar = function(id, email, done) {
  var settings = {};
  var gravatar = crypto.createHash('md5').update(email).digest('hex');
  var avatarUrl = 'https://gravatar.com/avatar/' + gravatar;
  settings.avatar = avatarUrl;

  return updateUserDetails(id, settings, done);
};

/**
 * Remove the user's account.
 * @param  {ObjectId} id    The current user's id in MongoDB
 * @param  {Function} done  The callback function to execute upon completion
 */
UserSchema.statics.deleteUser = function(id, done) {
  mongoose.models.User.findByIdAndRemove(id, function(err) {
    return completeOperation(err, true, done);
  });
};

/**
 * Set Up Services
 */
require('./services/facebook')(UserSchema, messages, config);
require('./services/youtube')(UserSchema, messages);

/**
 * Update all of the user's services.
 * @param  {Function} done  The callback function to execute upon completion
 */
UserSchema.methods.updateContent = function(done) {
  mongoose.models.User.findById(this._id, function(err, user) {
    // An error occurred
    if (err) {
      return done(err);
    }

    // Set up async calls
    var calls = {};

    if (user.hasFacebook && user.facebook.acceptUpdates) {
      calls = user.updateFacebook(calls, user);
    }
    if (user.hasYouTube && user.youtube.acceptUpdates) {
      calls = user.updateYouTube(calls, user);
    }

    async.parallel(calls, function(err, results) {
      // An error occurred
      if (err) {
        return done(err);
      }

      var newUpdate = {
        posts: [],
        description: 'A new update!'
      };

      if (user.hasFacebook && user.facebook.acceptUpdates) {
        Array.prototype.push.apply(newUpdate.posts, results.facebookPages);
        Array.prototype.push.apply(newUpdate.posts, results.facebookGroups);

        // Set new last update time
        user.lastUpdateTime.facebook = results.facebookUpdateTime;
      }

      if (user.hasYouTube && user.youtube.acceptUpdates) {
        Array.prototype.push.apply(newUpdate.posts,
          results.youtubeVideos);

        // Set new last update time
        user.lastUpdateTime.youtube = results.youtubeUpdateTime;
      }

      // Sort posts by timestamp
      newUpdate.posts.sort(function(a, b) {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      if (newUpdate.posts.length > 0) {
        user.batches.push(newUpdate);
        user.save(function(err) {
          return completeOperation(err, newUpdate, done);
        });
        // No new posts, set new update time
      } else {
        user.save(function(err) {
          return completeOperation(err, null, done);
        });
      }
    });
  });
};

/**
 * Set up passport local strategy with mongoose.
 *
 * Use the 'email' field instead of the default 'username' field.
 */
UserSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
module.exports = mongoose.model('User', UserSchema);
