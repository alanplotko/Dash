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
let request = require('request');
let messages = require('../../../config/messages');

// Set up dummy account
let dummyDetails = common.dummyDetails;
let accountQuery = common.accountQuery;
let contentTypes = [
  {key: 'page', route: 'likes'},
  {key: 'group', route: 'groups'}
];

describe('Facebook service', function() {
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

  describe('Model method: removeFacebook', function() {
    it('should catch errors in User.findById', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        result[1].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error on no user found', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(null, null);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        result[1].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error if not connected to Facebook', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        result[1].toString().should.equal(
          (new Error(messages.STATUS.FACEBOOK.NOT_CONNECTED)).toString()
        );
        done();
      });
    });

    it('should return error if delete request fails', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'del').yields(new Error('RequestError'));

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error with expired access token', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'del').yields(null, null, {
        error: {
          code: 190
        }
      });

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        result[2].should.equal('400-Facebook');
        done();
      });
    });

    it('should return successfully on body.success', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'del').yields(null, null, {
        success: {}
      });

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, callback);
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        should.exist(result[2]);
        result[2].toObject().should.not.have.keys('facebook');
        done();
      });
    });

    it('should return an error on no success property', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'del').yields(null, null, {});

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeFacebook
      let test = function(callback) {
        User.removeFacebook(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });
  });

  /**
   * This also tests the helper function, getFacebookContent.
   */
  describe('Model method: setUpFacebook[ContentType]', function() {
    it('should catch errors in User.findById', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(err) {
            callback(null, err);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 1].toString().should.equal(
            (new Error(messages.ERROR.GENERAL)).toString()
          );
        }
        done();
      });
    });

    it('should return error on no user found', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(null, null);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(result1, result2,
              result3) {
            callback(null, result3); // Return error
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 1].toString().should.equal(
            (new Error(messages.ERROR.GENERAL)).toString()
          );
        }
        done();
      });
    });

    it('should return error if get request fails', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(new Error('RequestError'));

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(err) {
            callback(null, err);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 2].toString().should.equal(
            (new Error(messages.ERROR.GENERAL)).toString()
          );
        }
        done();
      });
    });

    it('should return error with expired access token', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        error: {
          code: 190
        }
      });

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(err) {
            callback(null, err);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 2].should.equal('400-Facebook');
        }
        done();
      });
    });

    it('should return successfully on body.data', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        data: [
          // Non-Facebook page test
          {link: 'Link'},

          // Merged page test
          {best_page: 'BestPage'}, // eslint-disable-line camelcase

          /**
           * Test: has no cover, no description, is not verified, and provides
           * no link
           */
          {id: 'Id', name: 'Name1'},

          // Test: has cover, description, is verified, and provides link
          {
            id: 'Id',
            name: 'Name2',
            cover: {source: 'CoverImageSource'},
            description: 'Description',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          },

          // Test: as previous test with about instead of description
          {
            id: 'Id',
            name: 'Name3',
            cover: {source: 'CoverImageSource'},
            about: 'About',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          }
        ]
      });

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(err, content, type) {
            callback(err, content);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        for (let i = 0; i < contentTypes.length; i++) {
          should.exist(result[i + 2]);
          result[i + 2].should.have.all.keys({
            Name1: {
              id: 'Id',
              cover: '/static/img/no-image.png',
              description: 'No description provided.',
              isVerified: false,
              link: 'https://www.facebook.com/groups/Id'
            },
            Name2: {
              id: 'Id',
              cover: 'CoverImageSource',
              description: 'Description',
              isVerified: false,
              link: 'https://www.facebook.com'
            },
            Name3: {
              id: 'Id',
              cover: 'CoverImageSource',
              description: 'About',
              isVerified: false,
              link: 'https://www.facebook.com'
            }
          });
        }
        done();
      });
    });

    it('should traverse pages correctly', function(done) {
      let id;
      let tasks = [];

      let callback = sandbox.stub(request, 'get');

      let firstCall = {
        paging: {next: 'Next'},
        data: [
          // Non-Facebook page test
          {link: 'Link'},

          // Merged page test
          {best_page: 'BestPage'}, // eslint-disable-line camelcase

          /**
           * Test: has no cover, no description, is not verified, and
           * provides no link
           */
          {id: 'Id', name: 'Name1'},

          // Test: has cover, description, is verified, and provides link
          {
            id: 'Id',
            name: 'Name2',
            cover: {source: 'CoverImageSource'},
            description: 'Description',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          },

          // Test: as previous test with about instead of description
          {
            id: 'Id',
            name: 'Name3',
            cover: {source: 'CoverImageSource'},
            about: 'About',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          }
        ]
      };

      let secondCall = {
        data: [
          // Non-Facebook page test
          {link: 'Link'},

          // Merged page test
          {best_page: 'BestPage'}, // eslint-disable-line camelcase

          /**
           * Test: has no cover, no description, is not verified, and
           * provides no link
           */
          {id: 'Id', name: 'Name4'},

          // Test: has cover, description, is verified, and provides link
          {
            id: 'Id',
            name: 'Name5',
            cover: {source: 'CoverImageSource'},
            description: 'Description',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          },

          // Test: as previous test with about instead of description
          {
            id: 'Id',
            name: 'Name6',
            cover: {source: 'CoverImageSource'},
            about: 'About',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          }
        ]
      };

      callback
        .onCall(0).yields(null, null, firstCall)
        .onCall(1).yields(null, null, secondCall)
        .onCall(2).yields(null, null, firstCall)
        .onCall(3).yields(null, null, secondCall);

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(err, result, type) {
            callback(err, result);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        for (let i = 0; i < contentTypes.length; i++) {
          should.exist(result[i + 2]);
          result[i + 2].should.have.all.keys({
            Name1: {
              id: 'Id',
              cover: '/static/img/no-image.png',
              description: 'No description provided.',
              isVerified: false,
              link: 'https://www.facebook.com/groups/Id'
            },
            Name2: {
              id: 'Id',
              cover: 'CoverImageSource',
              description: 'Description',
              isVerified: false,
              link: 'https://www.facebook.com'
            },
            Name3: {
              id: 'Id',
              cover: 'CoverImageSource',
              description: 'About',
              isVerified: false,
              link: 'https://www.facebook.com'
            },
            Name4: {
              id: 'Id',
              cover: '/static/img/no-image.png',
              description: 'No description provided.',
              isVerified: false,
              link: 'https://www.facebook.com/groups/Id'
            },
            Name5: {
              id: 'Id',
              cover: 'CoverImageSource',
              description: 'Description',
              isVerified: false,
              link: 'https://www.facebook.com'
            },
            Name6: {
              id: 'Id',
              cover: 'CoverImageSource',
              description: 'About',
              isVerified: false,
              link: 'https://www.facebook.com'
            }
          });
        }
        done();
      });
    });

    it('should return successfully on no body.data', function(done) {
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {});

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['setUpFacebook' + formatted](id, function(err, content, type) {
            callback(err, content);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].facebook);
        result[1].facebook.profileId.should.equal('ProfileId');
        result[1].facebook.accessToken.should.equal('AccessToken');
        for (let i = 0; i < contentTypes.length; i++) {
          should.exist(result[i + 2]);
          result[i + 2].should.be.an('object').that.is.empty;
        }
        done();
      });
    });
  });

  describe('Model method: saveFacebook[ContentType]', function() {
    it('should catch errors in User.findById', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['saveFacebook' + formatted](id, [], function(err) {
            callback(null, err);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 1].toString().should.equal(
            (new Error(messages.ERROR.GENERAL)).toString()
          );
        }
        done();
      });
    });

    it('should return error on no user found', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(null, null);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['saveFacebook' + formatted](id, [], function(result1, result2,
              result3) {
            callback(null, result3); // Return error
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 1].toString().should.equal(
            (new Error(messages.ERROR.GENERAL)).toString()
          );
        }
        done();
      });
    });

    it('should catch errors in user.save', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
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

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['saveFacebook' + formatted](id, [], function(err) {
            callback(null, err); // Return error
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          result[i + 1].toString().should.equal(
            (new Error(messages.ERROR.GENERAL)).toString()
          );
        }
        done();
      });
    });

    it('should return successfully on no new content', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['saveFacebook' + formatted](id, [], function(err, result) {
            callback(err, result);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          should.exist(result[i + 1]);
          should.exist(result[i + 1].facebook[contentTypes[i].key + 's']);
          result[i + 1].facebook[contentTypes[i].key + 's'].should.be.empty;
        }
        done();
      });
    });

    it('should return successfully on new content', function(done) {
      let id;
      let tasks = [];

      // Get user id
      let getId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Generate test for each content type
      let test = function(formatted) {
        return function(callback) {
          User['saveFacebook' + formatted](id, ['A:B'], function(err, result) {
            callback(err, result);
          });
        };
      };

      contentTypes.forEach(function(type) {
        let plural = type.key + 's';
        let formatted = plural.charAt(0).toUpperCase() + plural.slice(1);
        tasks.push(test(formatted));
      });

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        for (let i = 0; i < contentTypes.length; i++) {
          should.exist(result[i + 1]);
          should.exist(result[i + 1].facebook[contentTypes[i].key + 's']);
          result[i + 1].facebook[contentTypes[i].key + 's']
            .should.have.lengthOf(1);
          if (contentTypes[i].key === 'group') {
            result[i + 1].facebook[contentTypes[i].key + 's'][0].toObject()
              .should.contain.all.keys({
                name: 'A',
                groupId: 'B'
              });
          } else {
            result[i + 1].facebook[contentTypes[i].key + 's'][0].toObject()
              .should.contain.all.keys({
                name: 'A',
                pageId: 'B'
              });
          }
        }
        done();
      });
    });
  });

  /**
   * This also tests the helper function, getFacebookPosts, and the document
   * method, updateFacebook.
   */
  describe('Document method: refreshFacebook', function() {
    it('should catch errors in User.findById', function(done) {
      let tasks = [];

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(null, err);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should catch errors in async.parallel', function(done) {
      let tasks = [];

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(async, 'parallel').yields(new Error('ParallelError'));
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(null, err);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return successfully on no new posts', function(done) {
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        data: [
          // Non-Facebook page test
          {link: 'Link'},

          // Merged page test
          {best_page: 'BestPage'}, // eslint-disable-line camelcase

          /**
           * Test: has no cover, no description, is not verified, and provides
           * no link
           */
          {id: 'Id', name: 'Name1'},

          // Test: has cover, description, is verified, and provides link
          {
            id: 'Id',
            name: 'Name2',
            cover: {source: 'CoverImageSource'},
            description: 'Description',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          },

          // Test: as previous test with about instead of description
          {
            id: 'Id',
            name: 'Name3',
            cover: {source: 'CoverImageSource'},
            about: 'About',
            isVerified: 'IsVerified',
            link: 'https://www.facebook.com'
          }
        ]
      });

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(callback);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].facebook.profileId.should.equal('ProfileId');
        result[0].facebook.accessToken.should.equal('AccessToken');
        should.not.exist(result[1]);
        done();
      });
    });

    it('should return errors if get request fails', function(done) {
      let tasks = [];
      sandbox.stub(request, 'get').yields(new Error('RequestError'));

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          for (let i = 0; i < contentTypes.length; i++) {
            if (contentTypes[i] === 'group') {
              user.facebook[contentTypes[i].key + 's'][i] = {
                groupId: 'GroupId',
                name: 'Name'
              };
            } else {
              user.facebook[contentTypes[i].key + 's'][i] = {
                pageId: 'PageId',
                name: 'Name'
              };
            }
          }
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(null, err);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].facebook.profileId.should.equal('ProfileId');
        result[0].facebook.accessToken.should.equal('AccessToken');
        result[1].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error with expired access token', function(done) {
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        error: {
          code: 190
        }
      });

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          contentTypes.forEach(function(type) {
            if (type.key === 'group') {
              user.facebook[type.key + 's'].push({
                groupId: 'GroupId',
                name: 'Name'
              });
            } else {
              user.facebook[type.key + 's'].push({
                pageId: 'PageId',
                name: 'Name'
              });
            }
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(null, err);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].facebook.profileId.should.equal('ProfileId');
        result[0].facebook.accessToken.should.equal('AccessToken');
        result[1].should.equal('400-Facebook');
        done();
      });
    });

    it('should return successfully on body.data', function(done) {
      let tasks = [];
      let currentTime = Date.now();
      sandbox.stub(request, 'get').yields(null, null, {
        data: [
          // Test: skip posts with no message property
          {
            id: 'A_B'
          },
          // Test: has message and timestamp, but no story property
          {
            id: 'A_B',
            message: 'Message',
            created_time: currentTime     // eslint-disable-line camelcase
          },
          // Test: has all properties
          {
            id: 'A_B',
            message: 'Message',
            story: 'Story',
            created_time: currentTime,    // eslint-disable-line camelcase
            full_picture: 'FullPicture',  // eslint-disable-line camelcase
            link: 'Link'
          },
          // Test: same as previous test, but with story requiring formatting
          {
            id: 'A_B',
            message: 'Message',
            story: 'Story: Name',
            created_time: currentTime,    // eslint-disable-line camelcase
            full_picture: 'FullPicture',  // eslint-disable-line camelcase
            link: 'Link'
          }
        ]
      });

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          contentTypes.forEach(function(type) {
            if (type.key === 'group') {
              user.facebook[type.key + 's'].push({
                groupId: 'GroupId',
                name: 'Name'
              });
            } else {
              user.facebook[type.key + 's'].push({
                pageId: 'PageId',
                name: 'Name'
              });
            }
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(err, result);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].facebook.profileId.should.equal('ProfileId');
        result[0].facebook.accessToken.should.equal('AccessToken');

        let matchingData = [
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: '',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/A/posts/B',
            picture: '',
            url: '',
            postType: 'page'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/A/posts/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'page'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/A/posts/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'page'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: '',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/groupsA/permalink/B',
            picture: '',
            url: '',
            postType: 'group'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/groupsA/permalink/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'group'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/groupsA/permalink/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'group'
          }
        ];

        should.exist(result[1]);
        result[1].should.have.lengthOf(matchingData.length);
        for (let i = 0; i < result[1].length; i++) {
          result[1][i].should.have.all.keys(matchingData[i]);
        }
        done();
      });
    });

    it('should traverse pages correctly', function(done) {
      let tasks = [];
      let currentTime = Date.now();

      let callback = sandbox.stub(request, 'get');

      let firstCall = {
        paging: {next: 'Next'},
        data: [
          // Test: skip posts with no message property
          {
            id: 'A_B'
          },
          // Test: has message and timestamp, but no story property
          {
            id: 'A_B',
            message: 'Message',
            created_time: currentTime     // eslint-disable-line camelcase
          },
          // Test: has all properties
          {
            id: 'A_B',
            message: 'Message',
            story: 'Story',
            created_time: currentTime,    // eslint-disable-line camelcase
            full_picture: 'FullPicture',  // eslint-disable-line camelcase
            link: 'Link'
          },
          // Test: same as previous test, but with story requiring formatting
          {
            id: 'A_B',
            message: 'Message',
            story: 'Story: Name',
            created_time: currentTime,    // eslint-disable-line camelcase
            full_picture: 'FullPicture',  // eslint-disable-line camelcase
            link: 'Link'
          }
        ]
      };

      let secondCall = {
        data: [
          // Test: skip posts with no message property
          {
            id: 'A_B'
          },
          // Test: has message and timestamp, but no story property
          {
            id: 'A_B',
            message: 'Message',
            created_time: currentTime     // eslint-disable-line camelcase
          },
          // Test: has all properties
          {
            id: 'A_B',
            message: 'Message',
            story: 'Story',
            created_time: currentTime,    // eslint-disable-line camelcase
            full_picture: 'FullPicture',  // eslint-disable-line camelcase
            link: 'Link'
          },
          // Test: same as previous test, but with story requiring formatting
          {
            id: 'A_B',
            message: 'Message',
            story: 'Story: Name',
            created_time: currentTime,    // eslint-disable-line camelcase
            full_picture: 'FullPicture',  // eslint-disable-line camelcase
            link: 'Link'
          }
        ]
      };

      callback
        .onCall(0).yields(null, null, firstCall)
        .onCall(1).yields(null, null, secondCall)
        .onCall(2).yields(null, null, firstCall)
        .onCall(3).yields(null, null, secondCall);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          contentTypes.forEach(function(type) {
            if (type.key === 'group') {
              user.facebook[type.key + 's'].push({
                groupId: 'GroupId',
                name: 'Name'
              });
            } else {
              user.facebook[type.key + 's'].push({
                pageId: 'PageId',
                name: 'Name'
              });
            }
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(err, result);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].facebook.profileId.should.equal('ProfileId');
        result[0].facebook.accessToken.should.equal('AccessToken');

        let matchingData = [
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: '',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/A/posts/B',
            picture: '',
            url: '',
            postType: 'page'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/A/posts/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'page'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/A/posts/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'page'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: '',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/groupsA/permalink/B',
            picture: '',
            url: '',
            postType: 'group'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/groupsA/permalink/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'group'
          },
          {
            service: 'facebook',
            title: 'Name',
            actionDescription: 'Story',
            content: 'Message',
            timestamp: currentTime,
            permalink: 'https://www.facebook.com/groupsA/permalink/B',
            picture: 'FullPicture',
            url: 'Link',
            postType: 'group'
          }
        ];

        should.exist(result[1]);
        result[1].should.have.lengthOf(matchingData.length * 2);
        for (let i = 0; i < result[1].length; i++) {
          result[1][i].should.have.all.keys(
            matchingData[i % matchingData.length]
          );
        }
        done();
      });
    });

    it('should return successfully on no body.data', function(done) {
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {});

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          contentTypes.forEach(function(type) {
            if (type.key === 'group') {
              user.facebook[type.key + 's'].push({
                groupId: 'GroupId',
                name: 'Name'
              });
            } else {
              user.facebook[type.key + 's'].push({
                pageId: 'PageId',
                name: 'Name'
              });
            }
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshFacebook
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshFacebook(function(err, result) {
            callback(err, result);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].facebook.profileId.should.equal('ProfileId');
        result[0].facebook.accessToken.should.equal('AccessToken');
        should.not.exist(result[1]);
        done();
      });
    });

    it('should return successfully if not connected to Facebook',
      function(done) {
        let tasks = [];

        // Test user.refreshFacebook
        let test = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.refreshFacebook(callback);
          });
        };

        tasks.push(test);

        async.series(tasks, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          should.not.exist(result[0]);
          done();
        });
      });
  });
});
