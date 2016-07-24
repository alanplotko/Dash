/* eslint-disable no-unused-expressions, no-loop-func */

// Set up testing libraries
var common = require('../../common/setup.js');
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
var User = require('../../../models/user');
var config = require('../../../config/settings');
var messages = require('../../../config/messages');
var async = require('async');

// Set up dummy account
var dummyDetails = common.dummyDetails;
var accountQuery = common.accountQuery;
var services = ['Facebook', 'YouTube'];

describe('Common service methods', function() {
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

  describe('Helper function: saveUpdate', function() {
    /**
     * Successful save tested in model method add[Service].
     */
    it('should catch errors in user.save', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(user, 'save').yields(new Error('MongoError'));
          sandbox.stub(User, 'findById').yields(null, user);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {
            profileId: 'ProfileId',
            accessToken: 'AccessToken',
            refreshToken: 'RefreshToken'
          }, callback);
        });
      });

      async.series(tasks, function(err, result) {
        should.exist(err);
        var error = new Error(messages.ERROR.GENERAL);
        err.toString().should.equal(error.toString());
        should.exist(result);
        result[0].should.equal(id);
        should.not.exist(result[1]);
        done();
      });
    });
  });

  describe('Model method: add[Service]', function() {
    it('should catch errors in User.findById', function(done) {
      sandbox.stub(User, 'findById').yields(new Error('MongoError'));
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {}, function(err, result) {
            callback(null, err);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length + 1);
        result[0].should.equal(id);
        var error = new Error(messages.ERROR.GENERAL);
        for (var i = 0; i < services.length; i++) {
          should.exist(result[i + 1]);
          result[i + 1].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should return a general error on an invalid user id', function(done) {
      var id = 'InvalidId';
      var tasks = [];
      sandbox.stub(User, 'findById').yields(null, null);

      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {}, function(err, result) {
            callback(null, err);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length);
        var error = new Error(messages.ERROR.GENERAL);
        for (var i = 0; i < services.length; i++) {
          should.exist(result[i]);
          result[i].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should return a missing permissions error on reauth', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {
            reauth: true
          }, function(err, result) {
            callback(null, err);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length + 1);
        result[0].should.equal(id);
        for (var i = 0; i < services.length; i++) {
          var error = messages.STATUS[services[i].toUpperCase()]
            .MISSING_PERMISSIONS;
          should.exist(result[i + 1]);
          result[i + 1].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should catch errors in user.save', function(done) {
      var id;
      var tasks = [];
      var mongoError = new Error('MongoError');

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(user, 'save').yields(mongoError);
          sandbox.stub(User, 'findById').yields(null, user);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {
            refreshAccessToken: true,
            accessToken: 'AccessToken'
          }, function(err, result) {
            callback(null, err);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length + 1);
        result[0].should.equal(id);
        var error = new Error(messages.ERROR.GENERAL);
        for (var j = 0; j < services.length; j++) {
          should.exist(result[j + 1]);
          result[j + 1].toString().should.equal(error.toString());
        }
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          services.forEach(function(serviceName) {
            should.not.exist(user[serviceName.toLowerCase()].accessToken);
          });
          done();
        });
      });
    });

    it('should return on refreshing access token', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {
            refreshAccessToken: true,
            accessToken: 'AccessToken'
          }, function(err, result) {
            callback(null, err);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length + 1);
        result[0].should.equal(id);
        for (var j = 0; j < services.length; j++) {
          var error = messages.STATUS[services[j].toUpperCase()].RENEWED;
          should.exist(result[j + 1]);
          result[j + 1].toString().should.equal(error.toString());
        }
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          services.forEach(function(serviceName) {
            should.exist(user[serviceName.toLowerCase()].accessToken);
            user[serviceName.toLowerCase()].accessToken
              .should.equal('AccessToken');
          });
          done();
        });
      });
    });

    it('should return on being already connected to a service', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      // Add services to user
      var addServices = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          services.forEach(function(serviceName) {
            user[serviceName.toLowerCase()].profileId = 'ProfileId';
          });
          Promise.resolve(user.save()).should.notify(callback);
        });
      };

      tasks.push(getId);
      tasks.push(addServices);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {}, function(err, result) {
            callback(null, err);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length + 2);
        result[0].should.equal(id);
        should.not.exist(result[1]);
        for (var j = 0; j < services.length; j++) {
          var error = new Error(
            messages.STATUS[services[j].toUpperCase()].ALREADY_CONNECTED
          );
          should.exist(result[j + 2]);
          result[j + 2].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should return on successfully adding a service', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.add[Service]
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {
            profileId: 'ProfileId',
            accessToken: 'AccessToken',
            refreshToken: 'RefreshToken'
          }, function(err, result) {
            callback(err, result);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(services.length + 1);
        result[0].should.equal(id);
        for (var j = 0; j < services.length; j++) {
          should.exist(result[j + 1]);

          should.exist(result[j + 1][services[j].toLowerCase()].profileId);
          result[j + 1][services[j].toLowerCase()].profileId
            .should.equal('ProfileId');

          should.exist(result[j + 1][services[j].toLowerCase()].accessToken);
          result[j + 1][services[j].toLowerCase()].accessToken
            .should.equal('AccessToken');

          should.exist(result[j + 1][services[j].toLowerCase()].refreshToken);
          result[j + 1][services[j].toLowerCase()].refreshToken
            .should.equal('RefreshToken');
        }
        done();
      });
    });
  });

  describe('Document method: toggle[Service]', function() {
    it('should catch errors in User.findById', function(done) {
      var tasks = [];
      sandbox.stub(User, 'findById').yields(new Error('MongoError'));

      // Generate test function by service name
      var test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user['toggle' + serviceName](callback);
          });
        };
      };

      // Test User.toggle[Service]
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.exist(err);
        var error = new Error(messages.ERROR.GENERAL);
        err.toString().should.equal(error.toString());
        should.exist(result);
        result.should.have.lengthOf(1);
        should.not.exist(result[0]);
        done();
      });
    });

    it('should return correct message for missing service', function(done) {
      var tasks = [];

      // Generate test function by service name
      var test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user['toggle' + serviceName](callback);
          });
        };
      };

      // Test User.toggle[Service]
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(2);
        for (var i = 0; i < result.length; i++) {
          should.exist(result[i]);
          result[i].should
            .equal(messages.STATUS[services[i].toUpperCase()].NOT_CONFIGURED);
        }
        done();
      });
    });

    it('should return correct message for existing service', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add service
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          User['add' + serviceName](id, {
            profileId: 'ProfileId',
            accessToken: 'AccessToken',
            refreshToken: 'RefreshToken'
          }, function(err, result) {
            callback(err, result);
          });
        });
      });

      // Generate test function by service name
      var test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user['toggle' + serviceName](callback);
          });
        };
      };

      // Test User.toggle[Service] (disable services)
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      // Confirm updates were disabled
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            callback(null, user[serviceName.toLowerCase()].acceptUpdates);
          });
        });
      });

      // Test User.toggle[Service] (enable services)
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      // Confirm updates were enabled
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            callback(null, user[serviceName.toLowerCase()].acceptUpdates);
          });
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf((services.length * 5) + 1);
        should.exist(result[0]);
        result[0].should.equal(id);
        for (var i = 1; i < result.length; i++) {
          should.exist(result[i]);
        }

        var j;
        // Check whether toggle messages are correct
        for (j = 0; j < services.length; j++) {
          result[j + services.length + 1].should
            .equal(messages.STATUS[services[j].toUpperCase()].UPDATES_DISABLED);
        }
        for (j = 0; j < services.length; j++) {
          result[j + (services.length * 2) + 1].should.be.false;
        }
        for (j = 0; j < services.length; j++) {
          result[j + (services.length * 3) + 1].should
            .equal(messages.STATUS[services[j].toUpperCase()].UPDATES_ENABLED);
        }
        for (j = 0; j < services.length; j++) {
          result[j + (services.length * 4) + 1].should.be.true;
        }
        done();
      });
    });
  });
});
