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
let refresh = require('passport-oauth2-refresh');

// Set up dummy account
let dummyDetails = common.dummyDetails;
let accountQuery = common.accountQuery;

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

      // Test User.removeYouTube
      let test = function(callback) {
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

      // Test User.removeYouTube
      let test = function(callback) {
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

      // Test User.removeYouTube
      let test = function(callback) {
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      let test = function(callback) {
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
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, {
        statusCode: 400
      }, {
        error: 'invalid_token'
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      let test = function(callback) {
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
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, {
        statusCode: 200
      }, null);

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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      let test = function(callback) {
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
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, {}, null);

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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.removeYouTube
      let test = function(callback) {
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

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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
        let id;
        let tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 401,
            message: 'Invalid Credentials'
          }
        });
        sandbox.stub(refresh, 'requestNewAccessToken')
          .yields(new Error('RequestNewAccessTokenError'));

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
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test User.setUpYouTubeSubs
        let test = function(callback) {
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
        let id;
        let tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 403
          }
        });
        sandbox.stub(refresh, 'requestNewAccessToken')
          .yields(new Error('RequestNewAccessTokenError'));

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
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test User.setUpYouTubeSubs
        let test = function(callback) {
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
        let id;
        let tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 403
          }
        });
        sandbox.stub(refresh, 'requestNewAccessToken').yields(null,
          'NewAccessToken');

        // Get user id
        let getId = function(callback) {
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
        let addProfileId = function(callback) {
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
        let test = function(callback) {
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
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {
        error: {
          code: 403
        }
      });
      sandbox.stub(refresh, 'requestNewAccessToken').yields(null,
        'NewAccessToken');

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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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
      let id;
      let tasks = [];
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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
      let id;
      let tasks = [];

      let callback = sandbox.stub(request, 'get');

      let firstCall = {
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

      let secondCall = {
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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
      let id;
      let tasks = [];
      sandbox.stub(request, 'get').yields(null, null, {items: []});

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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test User.setUpYouTubeSubs
      let test = function(callback) {
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

  describe('Model method: saveYouTubeSubs', function() {
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

      // Test User.saveYouTubeSubs
      let test = function(callback) {
        User.saveYouTubeSubs(id, [], function(err) {
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

      // Test User.saveYouTubeSubs
      let test = function(callback) {
        User.saveYouTubeSubs(id, [], function(result1, result2, result3) {
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

      // Test User.saveYouTubeSubs
      let test = function(callback) {
        User.saveYouTubeSubs(id, [], function(err) {
          callback(null, err); // Return error
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

      // Test User.saveYouTubeSubs
      let test = function(callback) {
        User.saveYouTubeSubs(id, [], function(err, result) {
          callback(err, result);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1]);
        should.exist(result[1].youtube.subscriptions);
        result[1].youtube.subscriptions.should.be.empty;
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

      // Test User.saveYouTubeSubs
      let test = function(callback) {
        User.saveYouTubeSubs(id, ['A;B;C'], function(err, result) {
          callback(err, result);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result[0].should.equal(id);
        should.exist(result[1]);
        should.exist(result[1].youtube.subscriptions);
        result[1].youtube.subscriptions.should.have.lengthOf(1);
        result[1].youtube.subscriptions[0].toObject()
          .should.contain.all.keys({
            subscriptionId: 'A',
            name: 'B',
            thumbnail: 'C'
          });
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
      let tasks = [];

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(User, 'findById').yields(new Error('MongoError'));
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(function(err, result) {
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

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          sandbox.stub(async, 'parallel').yields(new Error('ParallelError'));
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(function(err, result) {
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
      sandbox.stub(request, 'get').yields(null, null, {});

      // Add profileId
      let addProfileId = function(callback) {
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

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(callback);
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].youtube);
        result[0].youtube.profileId.should.equal('ProfileId');
        result[0].youtube.accessToken.should.equal('AccessToken');
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.youtube.subscriptions.push({
            subscriptionId: 'SubscriptionId',
            name: 'Name',
            thumbnail: 'Thumbnail'
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(function(err, result) {
            callback(null, err);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].facebook);
        result[0].youtube.profileId.should.equal('ProfileId');
        result[0].youtube.accessToken.should.equal('AccessToken');
        result[1].toString().should.equal((new Error(messages.ERROR.GENERAL))
          .toString());
        done();
      });
    });

    it('should return error with expired access token and 400 code',
      function(done) {
        let tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 400
          }
        });

        // Add profileId
        let addProfileId = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.youtube.subscriptions.push({
              subscriptionId: 'SubscriptionId',
              name: 'Name',
              thumbnail: 'Thumbnail'
            });
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test user.refreshYouTube
        let test = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.refreshYouTube(function(err, result) {
              callback(null, err);
            });
          });
        };

        tasks.push(test);

        async.series(tasks, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          should.exist(result[0].youtube);
          result[0].youtube.profileId.should.equal('ProfileId');
          result[0].youtube.accessToken.should.equal('AccessToken');
          result[1].should.equal('400-YouTube');
          done();
        });
      });

    it('should return error with expired access token and 403 code',
      function(done) {
        let tasks = [];
        sandbox.stub(request, 'get').yields(null, null, {
          error: {
            code: 403
          }
        });

        // Add profileId
        let addProfileId = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.youtube.profileId = 'ProfileId';
            user.youtube.accessToken = 'AccessToken';
            user.youtube.subscriptions.push({
              subscriptionId: 'SubscriptionId',
              name: 'Name',
              thumbnail: 'Thumbnail'
            });
            user.save().then(function(result) {
              callback(null, result);
            });
          });
        };

        tasks.push(addProfileId);

        // Test user.refreshYouTube
        let test = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.refreshYouTube(function(err, result) {
              callback(null, err);
            });
          });
        };

        tasks.push(test);

        async.series(tasks, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          should.exist(result[0].youtube);
          result[0].youtube.profileId.should.equal('ProfileId');
          result[0].youtube.accessToken.should.equal('AccessToken');
          result[1].should.equal('400-YouTube');
          done();
        });
      });

    it('should return successfully on body.data', function(done) {
      let tasks = [];
      let currentTime = Date.now();
      sandbox.stub(request, 'get').yields(null, null, {
        items: [
          // Test: skip posts with no snippet property
          {},
          // Test: as previous, but with no snippet.type property
          {snippet: {}},
          // Test: as previous, but with snippet.type !== 'upload'
          {snippet: {type: 'NotUpload'}},
          // Test: max resolution thumbnail
          {
            snippet: {
              title: 'Title1',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {maxres: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with standard resolution thumbnail
          {
            snippet: {
              title: 'Title2',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {standard: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with hq thumbnail
          {
            snippet: {
              title: 'Title3',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with long description
          {
            snippet: {
              title: 'Title4',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              /**
               * A very long description to pass 200 words when split on spaces
               * for the case where the description truncates to 200 words and
               * a '...'
               */
              description: 'Description\nX X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with no description
          {
            snippet: {
              title: 'Title5',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          }
        ]
      });

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.youtube.subscriptions.push({
            subscriptionId: 'SubscriptionId',
            name: 'Name',
            thumbnail: 'Thumbnail'
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(function(err, result) {
            callback(err, result);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].youtube);
        result[0].youtube.profileId.should.equal('ProfileId');
        result[0].youtube.accessToken.should.equal('AccessToken');

        let matchingData = [
          {
            service: 'youtube',
            title: 'Title1',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title2',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title3',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title4',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description<br /><br />X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X...',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title5',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: '',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
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
        nextPageToken: 'NextPageToken',
        items: [
          // Test: skip posts with no snippet property
          {},
          // Test: as previous, but with no snippet.type property
          {snippet: {}},
          // Test: as previous, but with snippet.type !== 'upload'
          {snippet: {type: 'NotUpload'}},
          // Test: max resolution thumbnail
          {
            snippet: {
              title: 'Title1',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {maxres: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with standard resolution thumbnail
          {
            snippet: {
              title: 'Title2',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {standard: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with hq thumbnail
          {
            snippet: {
              title: 'Title3',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with long description
          {
            snippet: {
              title: 'Title4',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              /**
               * A very long description to pass 200 words when split on spaces
               * for the case where the description truncates to 200 words and
               * a '...'
               */
              description: 'Description\nX X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with no description
          {
            snippet: {
              title: 'Title5',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          }
        ]
      };

      let secondCall = {
        items: [
          // Test: skip posts with no snippet property
          {},
          // Test: as previous, but with no snippet.type property
          {snippet: {}},
          // Test: as previous, but with snippet.type !== 'upload'
          {snippet: {type: 'NotUpload'}},
          // Test: max resolution thumbnail
          {
            snippet: {
              title: 'Title1',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {maxres: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with standard resolution thumbnail
          {
            snippet: {
              title: 'Title2',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {standard: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with hq thumbnail
          {
            snippet: {
              title: 'Title3',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              description: 'Description',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with long description
          {
            snippet: {
              title: 'Title4',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              /**
               * A very long description to pass 200 words when split on spaces
               * for the case where the description truncates to 200 words and
               * a '...'
               */
              description: 'Description\nX X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
                'X X X X X X X X X X X X X X X X',
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          },
          // Test: as previous, but with no description
          {
            snippet: {
              title: 'Title5',
              channelTitle: 'ChannelTitle',
              publishedAt: currentTime,
              channelId: 'ChannelId',
              thumbnails: {high: {url: 'Thumbnail'}},
              type: 'upload'
            },
            contentDetails: {
              upload: {videoId: 'VideoId'}
            }
          }
        ]
      };

      callback
        .onCall(0).yields(null, null, firstCall)
        .onCall(1).yields(null, null, secondCall);

      // Add profileId
      let addProfileId = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.youtube.subscriptions.push({
            subscriptionId: 'SubscriptionId',
            name: 'Name',
            thumbnail: 'Thumbnail'
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(function(err, result) {
            callback(err, result);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].youtube);
        result[0].youtube.profileId.should.equal('ProfileId');
        result[0].youtube.accessToken.should.equal('AccessToken');

        let matchingData = [
          {
            service: 'youtube',
            title: 'Title1',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title2',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title3',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title4',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: 'Description<br /><br />X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X X X X X X X X X X X X X X X X X X X X X ' +
              'X X X X X X X X X X...',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
          },
          {
            service: 'youtube',
            title: 'Title5',
            actionDescription: 'ChannelTitle uploaded a new video!',
            content: '',
            timestamp: currentTime,
            permalink: 'https://www.youtube.com/channel/ChannelId',
            picture: undefined,
            url: 'https://www.youtube.com/watch?v=VideoId',
            postType: 'upload'
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
          user.youtube.profileId = 'ProfileId';
          user.youtube.accessToken = 'AccessToken';
          user.youtube.subscriptions.push({
            subscriptionId: 'SubscriptionId',
            name: 'Name',
            thumbnail: 'Thumbnail'
          });
          user.save().then(function(result) {
            callback(null, result);
          });
        });
      };

      tasks.push(addProfileId);

      // Test user.refreshYouTube
      let test = function(callback) {
        accountQuery.exec(function(err, user) {
          should.not.exist(err);
          should.exist(user);
          user.refreshYouTube(function(err, result) {
            callback(err, result);
          });
        });
      };

      tasks.push(test);

      async.series(tasks, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.exist(result[0].youtube);
        result[0].youtube.profileId.should.equal('ProfileId');
        result[0].youtube.accessToken.should.equal('AccessToken');
        should.not.exist(result[1]);
        done();
      });
    });

    it('should return successfully if not connected to YouTube',
      function(done) {
        let tasks = [];

        // Test user.refreshYouTube
        let test = function(callback) {
          accountQuery.exec(function(err, user) {
            should.not.exist(err);
            should.exist(user);
            user.refreshYouTube(callback);
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
