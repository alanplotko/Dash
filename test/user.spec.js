/* eslint-disable no-unused-expressions, no-loop-func */
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var should = chai.should();
var mongoose = require('mongoose');
var crypto = require('crypto');
mongoose.Promise = require('bluebird');
var config = require('../config/settings');
var User;

var emailField = {email: 'Dashbot@Dash'};
var gravatar = crypto.createHash('md5').update(emailField.email).digest('hex');
// Dummy account
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
      done();
    });
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  it('should exist', function(done) {
    User = require('../models/user');
    should.exist(User);
    done();
  });

  it('should properly save a user', function(done) {
    var dummyUser = new User({
      email: account.email,
      displayName: account.displayName,
      avatar: account.avatar,
      password: account.password
    });
    dummyUser.save(done);
  });

  it('should find a valid user', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      should.exist(user);
      done();
    });
  });

  it('should properly maintain given registration data', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
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
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
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
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      user.isLocked.should.be.false;
      user.loginAttempts.should.equal(0);
      done();
    });
  });

  for (var i = 0; i < 5; i++) {
    it('can increase login attempts to ' + (i + 1), function(done) {
      mongoose.models.User.findOne(emailField, function(err,
          user) {
        should.not.exist(err);
        user.incLoginAttempts(done);
      });
    });
  }

  it('should lock out user on login attempt #5', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      user.loginAttempts.should.equal(5);
      user.isLocked.should.be.true;
      done();
    });
  });

  it('should fail authentication if user is locked out', function(done) {
    mongoose.models.User.authenticateUser(account.email, account.password,
      function(err, retrievedUser, reason) {
        should.not.exist(err);
        should.not.exist(retrievedUser);
        reason.should.equal(mongoose.models.User.failedLogin.MAX_ATTEMPTS);
      });

    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);

      // Update lock until time to force unlock for next test
      var date = new Date();
      user.lockUntil = date.setDate(date.getDate() - 1);
      user.incLoginAttempts(done);
    });
  });

  it('should unlock when lockout expires', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      user.loginAttempts.should.equal(1);
      user.isLocked.should.be.false;
      done();
    });
  });

  it('should properly serialize a user', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      mongoose.models.User.authSerializer(user, function(err, id) {
        should.not.exist(err);
        user._id.toString().should.equal(id);
        done();
      });
    });
  });

  it('should properly deserialize a user', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      mongoose.models.User.authDeserializer(user._id.toString(), function(err,
          retrievedUser) {
        should.not.exist(err);
        should.exist(retrievedUser);
        done();
      });
    });
  });

  it('should fail authentication given invalid user email', function(done) {
    mongoose.models.User.authenticateUser('invalidUser@Dash',
      account.password, function(err, retrievedUser, reason) {
        should.not.exist(err);
        should.not.exist(retrievedUser);
        reason.should.equal(mongoose.models.User.failedLogin.NOT_FOUND);
        done();
      });
  });

  it('should fail authentication given invalid user password', function(done) {
    mongoose.models.User.authenticateUser(account.email, 'invalidPassword',
      function(err, retrievedUser, reason) {
        should.not.exist(err);
        should.not.exist(retrievedUser);
        reason.should.equal(mongoose.models.User.failedLogin
          .PASSWORD_INCORRECT);
        done();
      });
  });

  /* it('should pass authentication given valid user credentials',
    function(done) {
      mongoose.models.User.authenticateUser(account.email, account.password,
        function(err, retrievedUser, reason) {
          should.not.exist(err);
          should.exist(retrievedUser);
          should.not.exist(reason);
          retrievedUser.isLocked.should.be.false;
          retrievedUser.loginAttempts.should.equal(0);
          should.not.exist(retrievedUser.lockUntil);
          done();
        });
    });*/

  it('should properly reset the user\'s avatar', function(done) {
    var gravatar = crypto.createHash('md5').update(account.email).digest('hex');
    var avatarUrl = 'https://gravatar.com/avatar/' + gravatar;
    var id;
    Promise.resolve(mongoose.models.User.findOne(emailField, function(err,
        user) {
      should.not.exist(err);
      id = user._id;
    })).then(mongoose.models.User.resetAvatar(id, account.email, function(err,
        onSuccess, extra) {
      should.not.exist(err);
      should.exist(onSuccess);
      onSuccess.should.be.true;
      should.not.exist(extra);
      mongoose.models.User.findOne(emailField, function(err, user) {
        should.not.exist(err);
        user.avatar.should.equal(avatarUrl);
        done();
      });
    }));
  });

  it('should properly return from an update with no services', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      user.updateContent(done);
    });
  });

  it('should properly delete a user', function(done) {
    mongoose.models.User.findOne(emailField, function(err, user) {
      should.not.exist(err);
      mongoose.models.User.deleteUser(user._id, done);
    });
  });

  it('should catch errors while completing an operation', function(done) {
    var error = new Error('test');
    mongoose.models.User.completeOperation(error, null, function(err, onSuccess,
        extra) {
      should.exist(err);
      err.should.equal(error);
      should.not.exist(onSuccess);
      should.not.exist(extra);
      done();
    }, null);
  });

  it('should return successfully upon completing an operation', function(done) {
    mongoose.models.User.completeOperation(null, true, function(err, onSuccess,
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
    mongoose.models.User.completeOperation(null, true, function(err, onSuccess,
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
