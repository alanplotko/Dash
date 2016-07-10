/* eslint-disable no-unused-expressions */
var chai = require('chai');
var should = chai.should();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var config = require('../config/settings');
var User;

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
      email: 'Dashbot@Dash',
      displayName: 'Dashbot',
      avatar: 'Dashbot.jpg',
      password: 'DashRocks'
    });
    dummyUser.save(done);
  });

  it('should properly find a user', function(done) {
    mongoose.models.User.findOne({email: 'Dashbot@Dash'}, function(err, user) {
      should.not.exist(err);
      done();
    });
  });

  it('should properly maintain given registration data', function(done) {
    mongoose.models.User.findOne({email: 'Dashbot@Dash'}, function(err, user) {
      should.not.exist(err);
      user.should.have.property('email', 'Dashbot@Dash');
      user.should.have.property('displayName', 'Dashbot');
      user.should.have.property('avatar', 'Dashbot.jpg');
      user.should.have.property('password', 'DashRocks');
      done();
    });
  });

  it('should properly accept activity updates', function(done) {
    mongoose.models.User.findOne({email: 'Dashbot@Dash'}, function(err, user) {
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

  it('should properly delete a user', function(done) {
    mongoose.models.User.findOne({email: 'Dashbot@Dash'}, function(err, user) {
      should.not.exist(err);
      user.remove(done);
    });
  });
});

