/* eslint-disable no-unused-expressions, no-loop-func */

// Set up testing libraries
var common = require('../common/setup.js');
var chai = require('chai');
var should = chai.should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var sinon = require('sinon');
require('sinon-mongoose');
var sandbox;

// Set up mongoose
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// Set up user model test dependencies
var User = require('../../models/user');
var config = require('../../config/settings');
var messages = require('../../config/messages');
var async = require('async');
var bcrypt = require('bcrypt');

// Set up dummy account
var dummyDetails = common.dummyDetails;
var accountQuery = common.accountQuery;

// Define expected environment based on whether the test is running in Travis
process.env.NODE_ENV = process.env.TRAVIS ? 'PROD' : 'DEV';

describe('Dash user model', function() {
  /**
   * Set up connection and run quick tests prior to starting.
   */
  before(function(done) {
    // Ensure user model exists
    should.exist(User);

    // Ensure dummy details are populated correctly
    dummyDetails.should.have.all.keys([
      'email',
      'displayName',
      'avatar',
      'password'
    ]);

    // Connect to db
    mongoose.connect(config[process.env.NODE_ENV].MONGO_URI, function(err) {
      should.not.exist(err);

      // Ensure test user does not exist
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        if (user) {
          User.findByIdAndRemove(user._id, done);
        } else {
          done();
        }
      });
    });
  });

  /**
   * Clean up and close the connection.
   */
  after(function(done) {
    mongoose.connection.close(done);
  });

  /**
   * Create a sandbox environment for each test. This will allow for creating
   * temporary stubs that will be cleaned up before the particular test is done.
   *
   * Additionally sets up and cleans up the dummy user account for each test.
   */
  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    User.create(dummyDetails, done);
  });

  afterEach(function(done) {
    sandbox.restore();
    User.findOneAndRemove({email: dummyDetails.email}, done);
  });

  /**
   * Place all tests below. Ensure all branches and methods are covered.
   */

  describe('Model method: completeOperation', function() {
    it('catches errors', function(done) {
      var error = new Error('test');
      var callback = function(err, onSuccess, extra) {
        should.exist(err);
        err.should.equal(error);
        should.not.exist(onSuccess);
        should.not.exist(extra);
        done();
      };
      User.completeOperation(error, null, callback, null);
    });

    it('can return on success with extra parameter', function(done) {
      var callback = function(err, onSuccess, extra) {
        should.not.exist(err);
        onSuccess.should.be.true;
        extra.should.be.true;
        done();
      };
      User.completeOperation(null, true, callback, true);
    });

    it('can return on success without extra parameter', function(done) {
      var callback = function(err, onSuccess, extra) {
        should.not.exist(err);
        should.exist(onSuccess);
        onSuccess.should.be.true;
        should.not.exist(extra);
        done();
      };
      User.completeOperation(null, true, callback, null);
    });
  });

  describe('Virtual property: isLocked', function() {
    it('returns true when locked', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);

        // Create and test lock
        User.findByIdAndUpdate(user._id, {
          $set: {lockUntil: Date.now() + config.ACCOUNT.LOCK_TIME}
        }, {new: true}, function(err, updatedUser) {
          should.not.exist(err);
          should.exist(updatedUser);
          updatedUser.isLocked.should.be.ok;
          done();
        });
      });
    });

    it('returns false when unlocked', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);

        // By default, user should be unlocked
        user.isLocked.should.not.be.ok;

        // Create and test expired lock
        User.findByIdAndUpdate(user._id, {
          $set: {lockUntil: Date.now() - config.ACCOUNT.LOCK_TIME}
        }, {new: true}, function(err, updatedUser) {
          should.not.exist(err);
          should.exist(updatedUser);
          updatedUser.isLocked.should.not.be.ok;
          done();
        });
      });
    });
  });

  describe('Pre hook: save', function() {
    it('should catch errors in User.findOne', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(User, 'findOne').yields(new Error('MongoError'));
        user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
      });
    });

    it('should catch errors in bcrypt.genSalt', function(done) {
      var user = new User(dummyDetails);
      user.email = 'ErrorTest@Dash';
      sandbox.stub(bcrypt, 'genSalt').yields(new Error('SaltError'));
      user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
    });

    it('should catch errors in bcrypt.hash', function(done) {
      var user = new User(dummyDetails);
      user.email = 'ErrorTest@Dash';
      sandbox.stub(bcrypt, 'hash').yields(new Error('SaltError'));
      user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
    });

    it('should successfully hash password', function(done) {
      var user = new User(dummyDetails);
      user.email = 'HashTest@Dash';
      user.save().should.be.fulfilled.then(function() {
        user.password.should.not.equal(dummyDetails.password);
        user.remove().should.be.fulfilled.notify(done);
      });
    });
  });

  describe('Document method: comparePassword', function() {
    it('should catch errors in bcrypt.compare', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(bcrypt, 'compare').yields(new Error('CompareError'));
        user.comparePassword(dummyDetails.password, function(err, result) {
          should.exist(err);
          err.should.equal(messages.ERROR.GENERAL);
          should.not.exist(result);
          done();
        });
      });
    });

    it('should return false on failed match', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.comparePassword('InvalidPassword', function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result.should.not.be.ok;
          done();
        });
      });
    });

    it('should return true on successful match', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.comparePassword(dummyDetails.password, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result.should.be.ok;
          done();
        });
      });
    });
  });

  describe('Document method: incLoginAttempts', function() {
    it('should reset login attempts on detecting expired lock', function(done) {
      var date = Date.now();

      // Create lock
      var createLock = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.findByIdAndUpdate(user._id, {
            $set: {lockUntil: date - config.ACCOUNT.LOCK_TIME}
          }, {new: true}, function(err, updatedUser) {
            should.not.exist(err);
            should.exist(updatedUser);
            callback(err, updatedUser);
          });
        });
      };

      // Test counter reset
      var testReset = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.incLoginAttempts(function(err, updatedUser) {
            should.not.exist(err);
            should.exist(updatedUser);
            callback(err, updatedUser);
          });
        });
      };

      async.series([createLock, testReset], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].lockUntil.should.equal(date - config.ACCOUNT.LOCK_TIME);
        result[1].loginAttempts.should.equal(1);
        should.not.exist(result[1].lockUntil);
        done();
      });
    });

    it('should increment login attempts if unlocked', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.loginAttempts.should.equal(0);
        user.incLoginAttempts(function(err, updatedUser) {
          should.not.exist(err);
          should.exist(updatedUser);
          updatedUser.loginAttempts.should.equal(1);
          done();
        });
      });
    });

    it('should lock account if max login attempts reached', function(done) {
      // Increments the user's login attempts
      var task = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.incLoginAttempts(function(err, result) {
            should.not.exist(err);
            callback(null, result.loginAttempts);
          });
        });
      };

      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.loginAttempts.should.equal(0);
        async.series([task, task, task, task, task], function(err, result) {
          should.not.exist(err);
          for (var i = 0; i < 5; i++) {
            result[i].should.equal(i + 1);
          }
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.isLocked.should.be.ok;
            done();
          });
        });
      });
    });
  });

  describe('Model method: failAuthentication', function() {
    it('should successfully increment login attempts', function(done) {
      // Calls failAuthentication to increment login attempts
      var failAuth = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.loginAttempts.should.equal(0);
          var reasons = User.failedLogin;
          var keys = Object.keys(User.failedLogin);
          var randomReason = keys[Math.floor(Math.random() * keys.length)];
          User.failAuthentication(user, reasons[randomReason], callback);
        });
      };

      async.series([failAuth], function(err, result) {
        should.not.exist(err);
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.loginAttempts.should.equal(1);
          done();
        });
      });
    });
  });

  describe('Model method: authSerializer', function() {
    it('should properly serialize a user', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        User.authSerializer(user, function(err, id) {
          should.not.exist(err);
          user._id.toString().should.equal(id);
          done();
        });
      });
    });
  });

  describe('Model method: authDeserializer', function() {
    it('should catch errors in User.findById', function(done) {
      var mongoError = new Error('MongoError');
      sandbox.stub(User, 'findById').yields(mongoError);
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        User.authDeserializer(user._id.toString(), function(err, result) {
          should.exist(err);
          err.should.equal(mongoError);
          should.not.exist(result);
          done();
        });
      });
    });

    it('should properly deserialize a user', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        User.authDeserializer(user._id.toString(), function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result._id.toString().should.equal(user._id.toString());
          done();
        });
      });
    });
  });

  describe('Model method: authenticateUser', function() {
    it('should catch errors in User.findOne', function(done) {
      var mongoError = new Error('MongoError');
      sandbox.stub(User, 'findOne').yields(mongoError);
      User.authenticateUser(dummyDetails.email, 'invalidPassword', function(err,
          retrievedUser, reason) {
        should.exist(err);
        err.should.equal(mongoError);
        should.not.exist(retrievedUser);
        should.not.exist(reason);
        done();
      });
    });

    it('should fail authentication given invalid user email', function(done) {
      User.authenticateUser('InvalidUser@Dash', dummyDetails.password,
        function(err, retrievedUser, reason) {
          should.not.exist(err);
          should.not.exist(retrievedUser);
          reason.should.equal(User.failedLogin.NOT_FOUND);
          done();
        });
    });

    it('should fail authentication if user locked out', function(done) {
      // Increments the user's login attempts
      var task = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.incLoginAttempts(function(err, result) {
            should.not.exist(err);
            callback(null, result.loginAttempts);
          });
        });
      };

      // Checks for whether the user is locked
      var checkLock = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.isLocked.should.be.ok;
          User.authenticateUser(dummyDetails.email, dummyDetails.password,
            function(err, retrievedUser, reason) {
              callback(null, {
                err: err,
                retrievedUser: retrievedUser,
                reason: reason
              });
            });
        });
      };

      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.loginAttempts.should.equal(0);
        async.series([task, task, task, task, task, checkLock], function(err,
            result) {
          should.not.exist(err);
          for (var i = 0; i < 5; i++) {
            result[i].should.equal(i + 1);
          }
          should.not.exist(result[5].err);
          should.not.exist(result[5].retrievedUser);
          result[5].reason.should.equal(User.failedLogin.MAX_ATTEMPTS);
          done();
        });
      });
    });

    it('should catch errors in comparing passwords', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(bcrypt, 'compare').yields(
          new Error('ComparePasswordError')
        );
        User.authenticateUser(dummyDetails.email, 'InvalidPassword',
          function(err, retrievedUser, reason) {
            should.exist(err);
            err.should.equal(messages.ERROR.GENERAL);
            should.not.exist(retrievedUser);
            should.not.exist(reason);
            done();
          });
      });
    });

    it('should pass authentication given valid user credentials',
      function(done) {
        User.authenticateUser(dummyDetails.email, dummyDetails.password,
          function(err, retrievedUser, reason) {
            should.not.exist(err);
            should.exist(retrievedUser);
            should.not.exist(retrievedUser.lockUntil);
            should.not.exist(reason);
            retrievedUser.isLocked.should.be.false;
            retrievedUser.loginAttempts.should.equal(0);
            done();
          });
      });

    it('should unlock user when lock expires', function(done) {
      var date = Date.now();

      // Create expired lock
      var createExpiredLock = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);

          // By default, user should be unlocked
          user.isLocked.should.not.be.ok;

          User.findByIdAndUpdate(user._id, {
            $set: {lockUntil: date - config.ACCOUNT.LOCK_TIME}
          }, {new: true}, function(err, updatedUser) {
            should.not.exist(err);
            should.exist(updatedUser);
            updatedUser.isLocked.should.not.be.ok;
            callback(null, updatedUser);
          });
        });
      };

      // Checks for whether the user is locked
      var checkLock = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.authenticateUser(dummyDetails.email, dummyDetails.password,
            function(err, retrievedUser, reason) {
              callback(null, {
                err: err,
                retrievedUser: retrievedUser,
                reason: reason
              });
            });
        });
      };

      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        async.series([createExpiredLock, checkLock], function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result[0].lockUntil.should.equal(date - config.ACCOUNT.LOCK_TIME);
          should.not.exist(result[1].err);
          should.exist(result[1].retrievedUser);
          should.not.exist(result[1].reason);
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            should.not.exist(user.lockUntil);
            done();
          });
        });
      });
    });

    it('should fail authentication given invalid user password',
      function(done) {
        User.authenticateUser(dummyDetails.email, 'InvalidPassword',
          function(err, retrievedUser, reason) {
            should.not.exist(err);
            should.not.exist(retrievedUser);
            reason.should.equal(User.failedLogin.PASSWORD_INCORRECT);
            done();
          });
      });
  });

  describe('Model method: updateUser', function() {
    it('should properly update the user', function(done) {
      // Update the user's display name
      var updateUser = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.updateUser(user._id, {displayName: 'NewName'}, function(err,
              onSuccess, extra) {
            should.not.exist(err);
            onSuccess.should.be.true;
            should.not.exist(extra);
            callback(err, true);
          });
        });
      };

      async.series([updateUser], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.be.true;
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.displayName.should.equal('NewName');
          done();
        });
      });
    });

    it('should catch errors in User.update', function(done) {
      var mongoError = new Error('MongoError');
      sandbox.stub(User, 'update').yields(mongoError);

      // Update the user's display name
      var updateUser = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.updateUser(user._id, {displayName: 'NewName'}, function(err,
              onSuccess, extra) {
            should.exist(err);
            err.should.equal(mongoError);
            should.not.exist(onSuccess);
            should.not.exist(extra);
            callback(err, true);
          });
        });
      };

      async.series([updateUser], function(err, result) {
        should.exist(err);
        err.should.equal(mongoError);
        should.exist(result);
        result[0].should.be.true;
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.displayName.should.not.equal('NewName');
          done();
        });
      });
    });
  });

  describe('Model method: resetAvatar', function() {
    it('should reset the user\'s avatar', function(done) {
      // Change the user's avatar
      var changeAvatar = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.findByIdAndUpdate(user._id, {
            $set: {avatar: 'NewAvatar'}
          }, {new: true}, function(err, updatedUser) {
            callback(err, updatedUser);
          });
        });
      };

      // Check if avatar was changed to 'NewAvatar'
      var checkAvatar = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.avatar.should.equal('NewAvatar');
          User.resetAvatar(user._id, dummyDetails.email, function(err,
              onSuccess, extra) {
            should.not.exist(err);
            should.exist(onSuccess);
            onSuccess.should.be.true;
            should.not.exist(extra);
            callback(err, user);
          });
        });
      };

      async.series([changeAvatar, checkAvatar], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.avatar.should.equal(dummyDetails.avatar);
          done();
        });
      });
    });
  });

  describe('Model method: deleteUser', function() {
    it('should delete a valid user', function(done) {
      // Delete user account
      var deleteUser = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.deleteUser(user._id, function(err, onSuccess, extra) {
            should.not.exist(err);
            should.exist(onSuccess);
            onSuccess.should.be.true;
            should.not.exist(extra);
            callback(err, true);
          });
        });
      };

      async.series([deleteUser], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.be.true;
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.not.exist(user);
          done();
        });
      });
    });

    it('should not delete a user using an invalid id', function(done) {
      var ObjectId = mongoose.Types.ObjectId;

      // Delete user account
      var deleteUser = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.deleteUser(new ObjectId(), function(err, onSuccess, extra) {
            should.not.exist(err);
            should.exist(onSuccess);
            onSuccess.should.be.true;
            should.not.exist(extra);
            callback(err, true);
          });
        });
      };

      async.series([deleteUser], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.be.true;
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          done();
        });
      });
    });

    it('should catch errors in User.findByIdAndRemove', function(done) {
      var mongoError = new Error('MongoError');
      sandbox.stub(User, 'findByIdAndRemove').yields(mongoError);

      // Delete user account
      var deleteUser = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          User.deleteUser(user._id, function(err, onSuccess, extra) {
            should.exist(err);
            err.should.equal(mongoError);
            should.not.exist(onSuccess);
            should.not.exist(extra);
            callback(err, true);
          });
        });
      };

      async.series([deleteUser], function(err, result) {
        should.exist(err);
        err.should.equal(mongoError);
        should.exist(result);
        result[0].should.be.true;
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          done();
        });
      });
    });
  });

  describe('Document method: updateContent', function() {
    it('should catch errors in User.findById', function(done) {
      var mongoError = new Error('MongoError');
      sandbox.stub(User, 'findById').yields(mongoError);
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.updateContent(function(err, onSuccess, extra) {
          should.exist(err);
          err.should.equal(mongoError);
          should.not.exist(onSuccess);
          should.not.exist(extra);
          done();
        });
      });
    });

    it('should return from an update with no services when no calls exist',
      function(done) {
        // Add services to user account
        var addServices = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            var update = {$set: {}};
            [{facebook: 'Facebook'}, {youtube: 'YouTube'}].forEach(
              function(service) {
                var key = Object.keys(service)[0];
                update.$set[key] = {};
                update.$set[key].profileId = 'ProfileId';
                update.$set[key].acceptUpdates = true;
                update.$set[key].accessToken = 'AccessToken';
                var methodName = 'update' + service[key];
                sandbox.stub(user, methodName).yields({});
              });
            User.findByIdAndUpdate(user._id, update, {new: true},
              function(err, updatedUser) {
                should.not.exist(err);
                should.exist(updatedUser);
                callback(err, updatedUser);
              });
          });
        };

        async.series([addServices], function(err, result) {
          should.not.exist(err);
          should.exist(result);
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.updateContent(function(err, onSuccess, extra) {
              should.not.exist(err);
              should.not.exist(onSuccess);
              should.not.exist(extra);
              done();
            });
          });
        });
      });

    it('should catch errors in user.save on no new posts',
      function(done) {
        // Add services to user account
        var addServices = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            var update = {$set: {}};
            [{facebook: 'Facebook'}, {youtube: 'YouTube'}].forEach(
              function(service) {
                var key = Object.keys(service)[0];
                update.$set[key] = {};
                update.$set[key].profileId = 'ProfileId';
                update.$set[key].acceptUpdates = true;
                update.$set[key].accessToken = 'AccessToken';
                var methodName = 'update' + service[key];
                sandbox.stub(user, methodName).yields({});
              });
            User.findByIdAndUpdate(user._id, update, {new: true},
              function(err, updatedUser) {
                should.not.exist(err);
                should.exist(updatedUser);
                callback(err, updatedUser);
              });
          });
        };

        async.series([addServices], function(err, result) {
          should.not.exist(err);
          should.exist(result);
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            var mongoError = new Error('MongoError');
            sandbox.stub(user, 'save').yields(mongoError);
            sandbox.stub(User, 'findById').yields(null, user);
            user.updateContent(function(err, onSuccess, extra) {
              should.exist(err);
              err.should.equal(mongoError);
              should.not.exist(onSuccess);
              should.not.exist(extra);
              done();
            });
          });
        });
      });

    it('should catch errors in async.parallel', function(done) {
      // Add services to user account
      var addServices = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          var update = {$set: {}};
          [{facebook: 'Facebook'}, {youtube: 'YouTube'}].forEach(
            function(service) {
              var key = Object.keys(service)[0];
              update.$set[key] = {};
              update.$set[key].profileId = 'ProfileId';
              update.$set[key].acceptUpdates = true;
              update.$set[key].accessToken = 'AccessToken';
              var methodName = 'update' + service[key];
              sandbox.stub(user, methodName).yields({});
            });
          User.findByIdAndUpdate(user._id, update, {new: true},
            function(err, updatedUser) {
              should.not.exist(err);
              should.exist(updatedUser);
              callback(err, updatedUser);
            });
        });
      };

      async.series([addServices], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          var parallelError = new Error('ParallelError');
          sandbox.stub(async, 'parallel').yields(parallelError);
          user.updateContent(function(err, onSuccess, extra) {
            should.exist(err);
            err.should.equal(parallelError);
            should.not.exist(onSuccess);
            should.not.exist(extra);
            done();
          });
        });
      });
    });

    it('should successfully retrieve activity', function(done) {
      // Choose a random number of posts
      var numPosts = Math.floor(Math.random() * 10) + 1;

      // Generate a random date to use for the dummy posts' timestamps
      var randomDate = function(start, end) {
        return new Date(start.getTime() + Math.random() *
          (end.getTime() - start.getTime()));
      };

      // Generate dummy posts to attach to the calls
      var generateRandomPosts = function() {
        var dummyPosts = [];
        for (var i = 0; i < numPosts; i++) {
          dummyPosts.push({
            service: 'Service',
            title: 'Update',
            content: 'Things are happening',
            timestamp: randomDate(new Date(2016, 1, 1), new Date()),
            permalink: 'http://Dash',
            actionDescription: 'New activity',
            picture: 'update.jpg',
            url: 'http://Service',
            postType: 'page'
          });
        }
        return dummyPosts;
      };

      // Define function for calls
      var callbackFunc = function(callback) {
        var dummyPosts = generateRandomPosts();
        callback(null, dummyPosts);
      };

      // Define services
      var services = [{
        facebook: {
          formatted: 'Facebook',
          calls: {facebookPages: callbackFunc, facebookGroups: callbackFunc}
        }
      }, {
        youtube: {
          formatted: 'YouTube',
          calls: {youtubeVideos: callbackFunc}
        }
      }];

      // Add services to user account
      var addServices = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          var update = {$set: {}};

          services.forEach(function(service) {
            var key = Object.keys(service)[0];
            update.$set[key] = {};
            update.$set[key].profileId = 'ProfileId';
            update.$set[key].acceptUpdates = true;
            update.$set[key].accessToken = 'AccessToken';
          });

          // Save service information to the dummy user account
          User.findByIdAndUpdate(user._id, update, {new: true},
            function(err, updatedUser) {
              should.not.exist(err);
              should.exist(updatedUser);
              callback(err, updatedUser);
            });
        });
      };

      async.series([addServices], function(err, result) {
        should.not.exist(err);
        should.exist(result);
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          services.forEach(function(service) {
            var key = Object.keys(service)[0];
            var methodName = 'update' + service[key].formatted;
            sandbox.stub(user, methodName, function() {
              return service[key].calls;
            });
          });
          sandbox.stub(User, 'findById').yields(null, user);
          user.updateContent(function(err, onSuccess, extra) {
            should.not.exist(err);
            should.exist(onSuccess);
            onSuccess.posts.should.have.lengthOf(numPosts);
            var prevTimestamp = onSuccess.posts[0].timestamp;

            // Verify that the posts are sorted by date
            if (onSuccess.posts.length > 1) {
              for (var i = 1; i < onSuccess.posts.length; i++) {
                onSuccess.posts[i].timestamp.should.be.above(prevTimestamp);
                prevTimestamp = onSuccess.posts[i].timestamp;
              }
            }
            should.not.exist(extra);
            done();
          });
        });
      });
    });

    it('should return from an update with no services when no calls exist',
      function(done) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.updateContent(function(err, onSuccess, extra) {
            should.not.exist(err);
            should.not.exist(onSuccess);
            should.not.exist(extra);
            done();
          });
        });
      });
  });
});
