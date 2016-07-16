/* eslint-disable no-unused-expressions, no-loop-func */

// Set up testing libraries
var chai = require('chai');
var should = chai.should();
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var sinon = require('sinon');
require('sinon-mongoose');
var sandbox;

// Set up mongoose, user model, and mocks
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var User = require('../models/user');

// Set up user model test dependencies
var crypto = require('crypto');
var config = require('../config/settings');
var messages = require('../config/messages');
var async = require('async');
var bcrypt = require('bcrypt');

// Set up dummy account
var emailField = {email: 'Dashbot@Dash'};
var gravatar = crypto.createHash('md5').update(emailField.email).digest('hex');
var account = {
  email: emailField.email,
  displayName: 'Dashbot',
  avatar: 'https://gravatar.com/avatar/' + gravatar,
  password: 'DashRocks'
};

// Define expected environment based on whether the test is running in Travis
process.env.NODE_ENV = process.env.TRAVIS ? 'PROD' : 'DEV';

describe('Dash user model', function() {
  before(function(done) {
    mongoose.connect(config[process.env.NODE_ENV].MONGO_URI, function(err) {
      should.not.exist(err);

      // Ensure test user does not exist
      User.findOne(emailField, function(err, user) {
        should.not.exist(err);
        if (user) {
          User.deleteUser(user._id, done);
        } else {
          done();
        }
      });
    });
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should exist', function(done) {
    should.exist(User);
    done();
  });

  it('should properly save a user', function(done) {
    should.exist(account);
    account.should.have.all.keys([
      'email',
      'displayName',
      'avatar',
      'password'
    ]);
    var dummyUser = new User(account);
    dummyUser.save(done);
  });

  it('should find a valid user', function(done) {
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
      done();
      /* user.comparePassword(account.password, function(err, isMatch) {
        should.not.exist(err);
        isMatch.should.be.true;
        done();
      }); */
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
      User.findOne(emailField, function(err, user) {
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
      done();
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

  /* it('should pass authentication given valid user credentials', function(done) {
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
  });*/

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

  it('should catch errors in pre-save', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      sandbox.stub(User, 'findOne').yields(new Error('MongoError'));
      user.save().should.be.rejectedWith(messages.ERROR.GENERAL).notify(done);
    });
  });

  it('should properly delete a user', function(done) {
    User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      User.deleteUser(user._id, done);
    });
  });

  it('should catch errors while completing an operation', function(done) {
    var error = new Error('test');
    User.completeOperation(error, null, function(err, onSuccess,
        extra) {
      should.exist(err);
      err.should.equal(error);
      should.not.exist(onSuccess);
      should.not.exist(extra);
      done();
    }, null);
  });

  it('should return successfully upon completing an operation', function(done) {
    User.completeOperation(null, true, function(err, onSuccess,
        extra) {
      should.not.exist(err);
      should.exist(onSuccess);
      onSuccess.should.be.true;
      should.not.exist(extra);
      done();
    }, null);
  });

  it('should return with extra parameter, when given, upon completing an ' +
      'operation', function(done) {
    User.completeOperation(null, true, function(err, onSuccess,
        extra) {
      should.not.exist(err);
      should.exist(onSuccess);
      onSuccess.should.be.true;
      should.exist(extra);
      extra.should.be.true;
      done();
    }, true);
  });
});
