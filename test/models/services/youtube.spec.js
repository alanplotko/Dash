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
var async = require('async');
var request = require('request');
var messages = require('../../../config/messages');
var refresh = require('passport-oauth2-refresh');

// Set up dummy account
var dummyDetails = common.dummyDetails;
var accountQuery = common.accountQuery;

describe('YouTube service', function() {
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

  describe('Model method: removeYouTube', function() {
    it('should catch errors in User.findById', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, function(err) {
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
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(null, null);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, function(err) {
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

    it('should return error if not connected to YouTube', function(done) {
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

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        result[1].toString().should.equal(
          (new Error(messages.STATUS.YOUTUBE.NOT_CONNECTED)).toString()
        );
        done();
      });
    });

    it('should return error if get request fails', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(new Error('RequestError'));

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error with expired access token', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, {
        statusCode: 400
      }, {
        error: 'invalid_token'
      });

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        result[2].should.equal('400-YouTube');
        done();
      });
    });

    it('should return successfully on res.statusCode = 200', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, {
        statusCode: 200
      }, null);

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, callback);
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        should.exist(result[2]);
        result[2].toObject().should.not.have.keys('youtube');
        done();
      });
    });

    it('should return an error on no res.statusCode property', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, {}, null);

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      var test = function(callback) {
        User.removeYouTube(id, function(err) {
          callback(null, err);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });
  });

  /**
   * This also tests the helper function, getYouTubeContent.
   */
  describe('Model method: setUpYouTubeSubs', function() {
    it('should catch errors in User.findById', function(done) {
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(err) {
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
      var id;
      var tasks = [];

      // Get user id
      var getId = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(null, null);
          should.not.exist(err);
          should.exist(user);
          id = user._id;
          callback(err, user._id);
        });
      };

      tasks.push(getId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(result1, result2, result3) {
          callback(null, result3); // Return error
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

    it('should return error if get request fails', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(new Error('RequestError'));

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(err) {
          callback(null, err); // Return error
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error with expired access token and 401 code',
      function(done) {
        var id;
        var tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 401,
            message: 'Invalid Credentials'
          }
        });
        sandbox.stub(refresh, 'requestNewAccessToken')
          .yields(new Error('RequestNewAccessTokenError'));

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

        // Add profileId
        var addProfileId = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test User.setUpYouTubeSubs
        var test = function(callback) {
          User.setUpYouTubeSubs(id, function(err) {
            callback(null, err); // Return error
          });
        };

        tasks.push(test);

        async.series(tasks, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result[0].should.equal(id);
          should.exist(result[1].youtube);
          result[1].youtube.profileId.should.equal('ProfileId');
          result[1].youtube.accessToken.should.equal('AccessToken');
          result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
            .toString());
          done();
        });
      });

    it('should return error with expired access token and 403 code',
      function(done) {
        var id;
        var tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 403
          }
        });
        sandbox.stub(refresh, 'requestNewAccessToken')
          .yields(new Error('RequestNewAccessTokenError'));

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

        // Add profileId
        var addProfileId = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test User.setUpYouTubeSubs
        var test = function(callback) {
          User.setUpYouTubeSubs(id, function(err) {
            callback(null, err); // Return error
          });
        };

        tasks.push(test);

        async.series(tasks, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result[0].should.equal(id);
          should.exist(result[1].youtube);
          result[1].youtube.profileId.should.equal('ProfileId');
          result[1].youtube.accessToken.should.equal('AccessToken');
          result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
            .toString());
          done();
        });
      });

    it('should catch errors in user.save on refresh access token',
      function(done) {
        var id;
        var tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 403
          }
        });
        sandbox.stub(refresh, 'requestNewAccessToken').yields(null,
          'NewAccessToken');

        // Get user id
        var getId = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            sandbox.stub(user, 'save').yields(new Error('MongoError'));
            sandbox.stub(User, 'findById').yields(null, user);
            id = user._id;
            callback(err, user._id);
          });
        };

        tasks.push(getId);

        // Add profileId
        var addProfileId = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test User.setUpYouTubeSubs
        var test = function(callback) {
          User.setUpYouTubeSubs(id, function(err) {
            callback(null, err); // Return error
          });
        };

        tasks.push(test);

        async.series(tasks, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result[0].should.equal(id);
          should.exist(result[1].youtube);
          result[1].youtube.profileId.should.equal('ProfileId');
          result[1].youtube.accessToken.should.equal('AccessToken');
          result[2].toString().should.equal((new Error(messages.ERROR.GENERAL))
            .toString());
          done();
        });
      });

    it('should refresh access token on expired access token', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        error: {
          code: 403
        }
      });
      sandbox.stub(refresh, 'requestNewAccessToken').yields(null,
        'NewAccessToken');

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(err) {
          callback(null, err); // Return error
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        result[2].toString().should.equal(
          (new Error(messages.STATUS.YOUTUBE.REFRESHED_TOKEN)).toString()
        );
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.accessToken.should.equal('NewAccessToken');
          done();
        });
      });
    });

    it('should return successfully on body.items', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        items: [
          // Test: has title, channel id, hq thumbnail, and description
          {
            snippet: {
              title: 'Title1',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {high: {url: 'ThumbnailUrl'}},
              description: 'Description'
            }
          },
          // Test: as previous with default thumbnail and no description
          {
            snippet: {
              title: 'Title2',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {default: {url: 'ThumbnailUrl'}}
            }
          },
          // Test: as previous with no hq or default thumbnail
          {
            snippet: {
              title: 'Title3',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {}
            }
          },
          // Test: as previous with no thumbnails property
          {
            snippet: {
              title: 'Title4',
              resourceId: {channelId: 'ChannelId'}
            }
          }
        ]
      });

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(err, content, type) {
          callback(err, {content: content, type: type});
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        should.exist(result[2]);
        result[2].content.should.have.all.keys({
          Title1: {
            id: 'ChannelId',
            thumbnail: 'ThumbnailUrl',
            description: 'Description'
          },
          Title2: {
            id: 'ChannelId',
            thumbnail: 'ThumbnailUrl',
            description: 'No description provided.'
          },
          Title3: {
            id: 'ChannelId',
            thumbnail: '',
            description: 'No description provided.'
          },
          Title4: {
            id: 'ChannelId',
            thumbnail: '',
            description: 'No description provided.'
          }
        });
        result[2].type.should.be.an('array').that.is.empty;
        done();
      });
    });

    it('should traverse pages correctly', function(done) {
      var id;
      var tasks = [];

      var callback = sandbox.stub(request, 'get');

      var firstCall = {
        nextPageToken: 'NextPageToken',
        items: [
          // Test: has title, channel id, hq thumbnail, and description
          {
            snippet: {
              title: 'Title1',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {high: {url: 'ThumbnailUrl'}},
              description: 'Description'
            }
          },
          // Test: as previous with default thumbnail and no description
          {
            snippet: {
              title: 'Title2',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {default: {url: 'ThumbnailUrl'}}
            }
          },
          // Test: as previous with no hq or default thumbnail
          {
            snippet: {
              title: 'Title3',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {}
            }
          },
          // Test: as previous with no thumbnails property
          {
            snippet: {
              title: 'Title4',
              resourceId: {channelId: 'ChannelId'}
            }
          }
        ]
      };

      var secondCall = {
        items: [
          // Test: has title, channel id, hq thumbnail, and description
          {
            snippet: {
              title: 'Title5',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {high: {url: 'ThumbnailUrl'}},
              description: 'Description'
            }
          },
          // Test: as previous with default thumbnail and no description
          {
            snippet: {
              title: 'Title6',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {default: {url: 'ThumbnailUrl'}}
            }
          },
          // Test: as previous with no hq or default thumbnail
          {
            snippet: {
              title: 'Title7',
              resourceId: {channelId: 'ChannelId'},
              thumbnails: {}
            }
          },
          // Test: as previous with no thumbnails property
          {
            snippet: {
              title: 'Title8',
              resourceId: {channelId: 'ChannelId'}
            }
          }
        ]
      };

      callback
        .onCall(0).yields(null, null, firstCall)
        .onCall(1).yields(null, null, secondCall);

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(err, content, type) {
          callback(err, {content: content, type: type});
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        result[2].content.should.have.all.keys({
          Title1: {
            id: 'ChannelId',
            thumbnail: 'ThumbnailUrl',
            description: 'Description'
          },
          Title2: {
            id: 'ChannelId',
            thumbnail: 'ThumbnailUrl',
            description: 'No description provided.'
          },
          Title3: {
            id: 'ChannelId',
            thumbnail: '',
            description: 'No description provided.'
          },
          Title4: {
            id: 'ChannelId',
            thumbnail: '',
            description: 'No description provided.'
          },
          Title5: {
            id: 'ChannelId',
            thumbnail: 'ThumbnailUrl',
            description: 'Description'
          },
          Title6: {
            id: 'ChannelId',
            thumbnail: 'ThumbnailUrl',
            description: 'No description provided.'
          },
          Title7: {
            id: 'ChannelId',
            thumbnail: '',
            description: 'No description provided.'
          },
          Title8: {
            id: 'ChannelId',
            thumbnail: '',
            description: 'No description provided.'
          }
        });
        result[2].type.should.be.an('array').that.is.empty;
        done();
      });
    });

    it('should return successfully on no body.items', function(done) {
      var id;
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {items: []});

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

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      var test = function(callback) {
        User.setUpYouTubeSubs(id, function(err, content, type) {
          callback(err, {content: content, type: type});
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1].youtube);
        result[1].youtube.profileId.should.equal('ProfileId');
        result[1].youtube.accessToken.should.equal('AccessToken');
        should.exist(result[2]);
        result[2].content.should.be.an('object').that.is.empty;
        result[2].type.should.be.an('array').that.is.empty;
        done();
      });
    });
  });

  /**
   * This also tests the helper function, getYouTubeUploads, and the document
   * method, updateYouTube.
   */
  describe('Document method: refreshYouTube', function() {
    it('should catch errors in User.findById', function(done) {
      var tasks = [];

      // Test user.refreshFacebook
      var test = function(callback) {
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
      var tasks = [];

      // Test user.refreshFacebook
      var test = function(callback) {
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
      var tasks = [];
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
      var addProfileId = function(callback) {
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
      var test = function(callback) {
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
      var tasks = [];
      sandbox.stub(request, 'get').yields(new Error('RequestError'));

      // Add profileId
      var addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.facebook.profileId = 'ProfileId';
          user.facebook.accessToken = 'AccessToken';
          for (var i = 0; i < contentTypes.length; i++) {
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
      var test = function(callback) {
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
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        error: {
          code: 190
        }
      });

      // Add profileId
      var addProfileId = function(callback) {
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
      var test = function(callback) {
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
      var tasks = [];
      var currentTime = Date.now();
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
      var addProfileId = function(callback) {
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
      var test = function(callback) {
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

        var matchingData = [
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
        for (var i = 0; i < result[1].length; i++) {
          result[1][i].should.have.all.keys(matchingData[i]);
        }
        done();
      });
    });

    it('should traverse pages correctly', function(done) {
      var tasks = [];
      var currentTime = Date.now();

      var callback = sandbox.stub(request, 'get');

      var firstCall = {
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

      var secondCall = {
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
      var addProfileId = function(callback) {
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
      var test = function(callback) {
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

        var matchingData = [
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
        for (var i = 0; i < result[1].length; i++) {
          result[1][i].should.have.all.keys(
            matchingData[i % matchingData.length]
          );
        }
        done();
      });
    });

    it('should return successfully on no body.data', function(done) {
      var tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {});

      // Add profileId
      var addProfileId = function(callback) {
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
      var test = function(callback) {
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
        var tasks = [];

        // Test user.refreshFacebook
        var test = function(callback) {
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
