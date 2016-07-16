/* eslint-disable no-unused-expressions, no-loop-func */

// Set up testing libraries
var chai = require('chai');
var should = chai.should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var sinon = require('sinon');
require('sinon-mongoose');
var sandbox;

// Set up mongoose and user model
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var User = require('../models/user');

// Set up user model test dependencies
var LOCK_TIME = 2 * 60 * 60 * 1000; // 2-hour lock
var crypto = require('crypto');
var config = require('../config/settings');
var messages = require('../config/messages');
var async = require('async');
var bcrypt = require('bcrypt');

// Set up dummy account and query
var email = 'Dashbot@Dash';
var gravatar = crypto.createHash('md5').update(email).digest('hex');
var dummyDetails = {
  email: email,
  displayName: 'Dashbot',
  avatar: 'https://gravatar.com/avatar/' + gravatar,
  password: 'DashRocks'
};
var accountQuery = User.findOne({email: email});

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
    User.findOneAndRemove({email: email}, function(err, result) {
      should.not.exist(err);
      should.exist(result);
      mongoose.connection.close(done);
    });
  });

  /**
   * Create a sandbox environment for each test. This will allow for creating
   * temporary stubs that will be cleaned up before the particular test is done.
   *
   * Additionally sets up and cleans up the test user for each test.
   */
  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    done();
  });
  afterEach(function(done) {
    sandbox.restore();
    done();
  });

  it('Create dummy user successfully', function(done) {
    var user = new User(dummyDetails);
    user.save().should.be.fulfilled.then(function() {
      user.markModified('password');
      user.save().should.be.fulfilled.notify(done);
    });
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
          $set: {lockUntil: Date.now() + LOCK_TIME}
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
          $set: {lockUntil: Date.now() - LOCK_TIME}
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
    /*it('should catch errors in User.findOne', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(User, 'findOne').yields(new Error('MongoError'));
        user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
      });
    });

    it('should catch errors in bcrypt.genSalt', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(bcrypt, 'genSalt').yields(new Error('SaltError'));
        user.markModified('password');
        user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
      });
    });

    it('should catch errors in bcrypt.hash', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(bcrypt, 'hash').yields(new Error('HashError'));
        user.markModified('password');
        user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
      });
    });

    it('should successfully hash password', function(done) {
      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.markModified('password');
        user.save().should.be.fulfilled.then(function() {
          user.password.should.not.equal(dummyDetails.password);
        }).should.notify(done);
      });
    });*/
  });

  /* it('should find a valid user', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      done();
    });
  });

  it('should properly maintain given registration data', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      user.should.have.property('email', account.email);
      user.should.have.property('displayName', account.displayName);
      user.should.have.property('avatar', account.avatar);
      user.should.have.property('password', account.password);
      user.comparePassword(account.password, function(err, isMatch) {
        should.not.exist(err);
        isMatch.should.be.true;
        done();
      });
    });
  });

  it('should properly accept activity updates', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      var dummyPosts = [];
      var numPosts = Math.floor(Math.random() * 10) + 1;
      var numBatches = Math.floor(Math.random() * 10) + 1;
      var i;
      for (i = 0; i < numPosts; i++) {
        dummyPosts.push({
          service: 'Service',
          title: 'Update',
          content: 'Things are happening',
          timestamp: Date.now(),
          permalink: 'http://Dash',
          actionDescription: 'New activity',
          picture: 'update.jpg',
          url: 'http://Service',
          postType: 'page'
        });
      }
      for (i = 0; i < numBatches; i++) {
        user.batches.push({
          posts: dummyPosts,
          description: 'New posts!'
        });
      }
      user.save(function(err, user) {
        should.not.exist(err);
        user.batches.length.should.equal(numBatches);
        for (i = 0; i < user.batches.length; i++) {
          user.batches[i].posts.length.should.equal(numPosts);
        }
        done();
      });
    });
  });

  it('should start at 0 login attempts', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      user.isLocked.should.be.false;
      user.loginAttempts.should.equal(0);
      done();
    });
  });

  it('can increase login attempts', function(done) {
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

  it('should lock out user on login attempt #5', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      user.loginAttempts.should.equal(5);
      user.isLocked.should.be.true;
      done();
    });
  });

  it('should fail authentication if user is locked out', function(done) {
    User.authenticateUser(account.email, account.password,
      function(err, retrievedUser, reason) {
        should.not.exist(err);
        should.not.exist(retrievedUser);
        reason.should.equal(User.failedLogin.MAX_ATTEMPTS);
      });

    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);

      // Update lock until time to force unlock for next test
      var date = new Date();
      user.lockUntil = date.setDate(date.getDate() - 1);
      user.incLoginAttempts(done);
    });
  });

  it('should unlock when lockout expires', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      user.loginAttempts.should.equal(1);
      user.isLocked.should.be.false;
      done();
    });
  });

  it('should properly serialize a user', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      User.authSerializer(user, function(err, id) {
        should.not.exist(err);
        user._id.toString().should.equal(id);
        done();
      });
    });
  });

  it('should properly deserialize a user', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      User.authDeserializer(user._id.toString(), function(err,
          retrievedUser) {
        should.not.exist(err);
        should.exist(retrievedUser);
        done();
      });
    });
  });

  it('should fail authentication given invalid user email', function(done) {
    User.authenticateUser('invalidUser@Dash',
      account.password, function(err, retrievedUser, reason) {
        should.not.exist(err);
        should.not.exist(retrievedUser);
        reason.should.equal(User.failedLogin.NOT_FOUND);
        done();
      });
  });

  it('should fail authentication given invalid user password', function(done) {
    User.authenticateUser(account.email, 'invalidPassword',
      function(err, retrievedUser, reason) {
        should.not.exist(err);
        should.not.exist(retrievedUser);
        reason.should.equal(User.failedLogin
          .PASSWORD_INCORRECT);
        done();
      });
  });

  it('should catch errors for finding users in authentication', function(done) {
    var mongoError = new Error('MongoError');
    sandbox.stub(User, 'findOne').yields(mongoError);
    User.authenticateUser(account.email, 'invalidPassword',
      function(err, retrievedUser, reason) {
        should.exist(err);
        err.should.equal(mongoError);
        should.not.exist(retrievedUser);
        should.not.exist(reason);
        done();
      });
  });

  it('should catch errors in comparing passwords in authentication',
    function(done) {
      var comparePasswordError = new Error('ComparePasswordError');
      User.findOne(emailField, function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(bcrypt, 'compare').yields(comparePasswordError);
        User.authenticateUser(account.email, 'invalidPassword',
          function(err, retrievedUser, reason) {
            should.exist(err);
            err.should.equal(comparePasswordError);
            should.not.exist(retrievedUser);
            should.not.exist(reason);
            done();
          });
      });
    });

  it('should pass authentication given valid user credentials', function(done) {
    User.authenticateUser(account.email, account.password,
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

  it('should properly reset the user\'s avatar', function(done) {
    var gravatar = crypto.createHash('md5').update(account.email).digest('hex');
    var avatarUrl = 'https://gravatar.com/avatar/' + gravatar;
    var id;
    Promise.resolve(User.findOne(emailField, function(err,
        user) {
      should.not.exist(err);
      should.exist(user);
      id = user._id;
    })).then(User.resetAvatar(id, account.email, function(err,
        onSuccess, extra) {
      should.not.exist(err);
      should.exist(onSuccess);
      onSuccess.should.be.true;
      should.not.exist(extra);
      User.findOne(emailField, function(err, user) {
        should.not.exist(err);
        user.avatar.should.equal(avatarUrl);
        done();
      });
    }));
  });

  it('should properly return from an update with no services', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      user.updateContent(done);
    });
  });

  it('should catch errors for finding users in a content update',
    function(done) {
      var mongoError = new Error('MongoError');
      sandbox.stub(User, 'findById').yields(mongoError);
      User.findOne(emailField, function(err, user) {
        should.not.exist(err);
        should.exist(user);
        user.updateContent(function(err, retrievedUser, reason) {
          should.exist(err);
          err.should.equal(mongoError);
          should.not.exist(retrievedUser);
          should.not.exist(reason);
          done();
        });
      });
    });

  it('should properly delete a user', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      User.deleteUser(user._id, done);
    });
  });*/
});
