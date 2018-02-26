/* eslint-disable no-unused-expressions, no-loop-func */

// Set up testing libraries
let common = require('../../common/setup.js');
let chai = require('chai');
let should = chai.should();
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let sinon = require('sinon');
require('sinon-mongoose');
let sandbox;

// Set up mongoose
let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// Set up user model test dependencies
let User = require('../../../models/user');
let config = require('../../../config/settings');
let async = require('async');
let messages = require('../../../config/messages');
let moment = require('moment');
let handlers = require('../../../models/services/handlers');

// Set up dummy account
let dummyDetails = common.dummyDetails;
let accountQuery = common.accountQuery;
let services = ['Facebook', 'YouTube'];

describe('Service handlers', function() {
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

  describe('Handler method: saveToUser', function() {
    it('should catch errors in user.save', function(done) {
      // Test handlers.saveToUser
      let test = function(user, callback) {
        handlers.saveToUser(user, user, function(err, result) {
          should.exist(err);
          err.toString().should.equal((new Error(messages.ERROR.GENERAL))
            .toString());
          should.not.exist(result);
          callback();
        });
      };

      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        sandbox.stub(user, 'save').yields(new Error('MongoError'));
        test(user, done);
      });
    });

    it('should return successfully on save', function(done) {
      // Test handlers.saveToUser
      let test = function(user, callback) {
        handlers.saveToUser(user, user, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          user.should.equal(result);
          callback();
        });
      };

      accountQuery.exec(function(err, user) {
        should.not.exist(err);
        should.exist(user);
        test(user, done);
      });
    });
  });

  describe('Handler method: checkIfRefreshEligible', function() {
    it('should correct identify eligible refreshes', function(done) {
      handlers.checkIfRefreshEligible('400-ServiceName', 'ServiceName',
        function(err, result) {
          should.exist(err);
          err.should.equal('400-ServiceName');
          should.not.exist(result);
          done();
        });
    });

    it('should correct identify ineligible refreshes', function(done) {
      handlers.checkIfRefreshEligible('IneligibleRefreshError', 'ServiceName',
        function(err, result) {
          should.exist(err);
          err.toString().should.equal((new Error(messages.ERROR.GENERAL))
            .toString());
          should.not.exist(result);
          done();
        });
    });
  });

  describe('Handler method: processContent', function() {
    it('should catch errors', function(done) {
      let error = new Error(messages.ERROR.GENERAL);
      handlers.processContent(error, [], {}, 0, function(err, result) {
        should.exist(err);
        err.should.equal(error);
        should.not.exist(result);
        done();
      });
    });

    it('should return posts upon reaching expected post count', function(done) {
      let update = {posts: [], progress: 0};
      let postCount = Math.floor(Math.random() * 10) + 5;
      let currentCount = postCount - 1;
      for (let i = 0; i < currentCount; i++) {
        update.posts.push({});
      }
      update.progress = currentCount;
      handlers.processContent(null, [{}], update, postCount, function(err,
          result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.lengthOf(postCount);
        done();
      });
    });

    it('should return current status if expected post count not reached',
      function(done) {
        let update = {posts: [], progress: 0};
        let postCount = Math.floor(Math.random() * 10) + 5;
        let currentCount = postCount - 2;
        for (let i = 0; i < currentCount; i++) {
          update.posts.push({});
        }
        update.progress = currentCount;
        let result = handlers.processContent(null, [{}], update, postCount,
          function() {});
        should.exist(result);
        result.posts.should.have.lengthOf(currentCount + 1);
        result.progress.should.equal(currentCount + 1);
        done();
      });
  });

  describe('Handler method: generateAppSecretProof', function() {
    it('should correctly format proof', function(done) {
      let actualProof = handlers.generateAppSecretProof('AccessToken');
      should.exist(actualProof);
      actualProof.should.contain('&appsecret_proof=');
      done();
    });
  });

  describe('Handler method: completeRefresh', function() {
    it('should catch errors in user.save on new posts', function(done) {
      let tasks = [];
      let samplePosts = [{SamplePostKey: 'SamplePostValue'}];

      // Execute the test and run the callback with the error as the result
      let executeTest = function(serviceName, samplePosts, user, callback) {
        handlers.completeRefresh(serviceName, samplePosts, user, function(err) {
          callback(null, err);
        });
      };

      // Generate runner to test function by service name
      let testRunner = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            sandbox.stub(user, 'save').yields(new Error('MongoError'));
            executeTest(serviceName, samplePosts, user, callback);
          });
        };
      };

      // Test handlers.completeRefresh
      services.forEach(function(serviceName) {
        tasks.push(testRunner(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        let error = new Error(messages.ERROR.GENERAL);
        should.exist(result);
        for (let i = 0; i < result.length; i++) {
          result[i].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should save new content on new posts', function(done) {
      let tasks = [];
      let samplePosts = [{SamplePostKey: 'SamplePostValue'}];

      // Generate test function by service name
      let test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            handlers.completeRefresh(serviceName, samplePosts, user, callback);
          });
        };
      };

      // Test handlers.completeRefresh
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(samplePosts);
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          should.exist(user.batches);
          user.batches.should.have.lengthOf(services.length);
          for (let i = 0; i < services.length; i++) {
            should.exist(user.batches[i]);
            user.batches[i].should.have.property('posts');
            user.batches[i].should.have.property('description');
            user.batches[i].should.have.property('updateTime');
            user.batches[i].should.have.property('_id');
            user.batches[i].description.should
              .equal('Checking in with ' + services[i] + ' for updates!');
          }
          done();
        });
      });
    });

    it('should catch errors in user.save for no new posts', function(done) {
      let tasks = [];
      let samplePosts = [];

      // Generate test function by service name
      let test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            sandbox.stub(user, 'save').yields(new Error('MongoError'));
            handlers.completeRefresh(serviceName, samplePosts, user,
              function(err) {
                callback(null, err);
              });
          });
        };
      };

      // Test handlers.completeRefresh
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        let error = new Error(messages.ERROR.GENERAL);
        should.exist(result);
        for (let i = 0; i < result.length; i++) {
          result[i].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should save new update time on no new posts', function(done) {
      let tasks = [];
      let samplePosts = [];

      // Generate test function by service name
      let test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            handlers.completeRefresh(serviceName, samplePosts, user, callback);
          });
        };
      };

      // Test handlers.completeRefresh
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        for (let i = 0; i < services.length; i++) {
          should.not.exist(result[i]);
        }
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          should.exist(user.batches);
          user.batches.should.be.empty;
          done();
        });
      });
    });
  });

  describe('Handler method: processDeauthorization', function() {
    it('should catch errors in user.save', function(done) {
      let tasks = [];

      // Generate test function by service name
      let test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            sandbox.stub(user, 'save').yields(new Error('MongoError'));
            handlers.processDeauthorization(serviceName, user, function(err) {
              callback(null, err);
            });
          });
        };
      };

      // Test handlers.completeRefresh
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        let error = new Error(messages.ERROR.GENERAL);
        should.exist(result);
        for (let i = 0; i < result.length; i++) {
          result[i].toString().should.equal(error.toString());
        }
        done();
      });
    });

    it('should successfully remove services', function(done) {
      let tasks = [];

      // Generate test function by service name
      let test = function(serviceName) {
        return function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            handlers.processDeauthorization(serviceName, user, callback);
          });
        };
      };

      // Test handlers.completeRefresh
      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);

        // Check whether each service was deleted in each operation
        for (let i = 0; i < result.length; i++) {
          result[i].toObject().should.not.have.keys(services[i].toLowerCase());
        }

        done();
      });
    });
  });

  describe('Handler method: getLastUpdateTime', function() {
    it('should return lastUpdateTime if available', function(done) {
      let userDoc;
      let tasks = [];
      let NUM_DAYS_BACK = -5;

      // Add lastUpdateTime
      let addLastUpdateTime = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          let daysBack = moment().add(NUM_DAYS_BACK, 'days').toDate();
          for (let i = 0; i < services.length; i++) {
            user.lastUpdateTime[services[i].toLowerCase()] = daysBack;
          }
          userDoc = user;
          callback(err, user);
        });
      };

      tasks.push(addLastUpdateTime);

      // Save user changes
      let saveUser = function(callback) {
        Promise.resolve(userDoc.save()).then(function(doc) {
          userDoc = doc;
          callback(null, doc);
        });
      };

      tasks.push(saveUser);

      // Generate test function by service name
      let test = function(serviceName) {
        return function(callback) {
          callback(null, handlers.getLastUpdateTime(serviceName, userDoc));
        };
      };

      services.forEach(function(serviceName) {
        tasks.push(test(serviceName));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0]);
        should.exist(result[1]);
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          for (let j = 0; j < services.length; j++) {
            should.exist(result[j + 2]);
            result[j + 2].toString().should
              .equal(user.lastUpdateTime[services[j].toLowerCase()].toString());
          }
          done();
        });
      });
    });

    it('should return yesterday if lastUpdateTime unavailable', function(done) {
      let userDoc;
      let tasks = [];

      // Get user
      let getUser = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          userDoc = user;
          callback(err, user);
        });
      };

      tasks.push(getUser);

      // Test handlers.getLastUpdateTime
      services.forEach(function(serviceName) {
        tasks.push(function(callback) {
          callback(null, handlers.getLastUpdateTime(serviceName, userDoc));
        });
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0]);
        let yesterday = moment().add(-1, 'days').toDate();
        for (let i = 0; i < services.length; i++) {
          should.exist(result[i + 1]);
          let diff = yesterday - result[i + 1];
          // Acceptable range due to processing time in between
          diff.should.be.below(20);
        }
        done();
      });
    });
  });

  describe('Handler method: sortPosts', function() {
    it('should correctly sort posts', function(done) {
      let yesterday = {timestamp: Date.now() - 86400000};
      let today = {timestamp: Date.now()};
      handlers.sortPosts(yesterday, today).should.be.below(0);
      handlers.sortPosts(today, yesterday).should.be.above(0);
      handlers.sortPosts(today, today).should.equal(0);
      done();
    });
  });
});
