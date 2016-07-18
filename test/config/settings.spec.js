var chai = require('chai');
var should = chai.should();
var settings = require('../../config/settings');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// Define expected environment based on whether the test is running in Travis
process.env.NODE_ENV = process.env.TRAVIS ? 'PROD' : 'DEV';
settings.ENV = settings[process.env.NODE_ENV];

// Define required keys for each environment property
var envProps = [
  'MONGO_URI',
  'URL',
  'EMAIL_SETTINGS',
  'VERIFY_EMAIL_FORMAT',
  'CONFIRM_EMAIL_FORMAT'
];

// Define required keys for other properties
var serviceProps = ['CLIENT_ID', 'CLIENT_SECRET'];      // Services
var emailProps = ['HOST', 'PORT', 'AUTH', 'SECURE'];    // Email Setup
var formatProps = ['FROM', 'SUBJECT', 'HTML', 'TEXT'];  // Email Formatting

/**
 * Test for whether required settings are defined
 */
describe('Dash settings', function() {
  it('should exist', function(done) {
    should.exist(settings);
    done();
  });

  it('should have at least one service configured', function(done) {
    should.exist(settings.SERVICES);
    Object.keys(settings.SERVICES).should.have.length.above(0);
    done();
  });

  it('should have all required service details defined', function(done) {
    for (var key in settings.SERVICES) {
      if (settings.SERVICES.hasOwnProperty(key)) {
        settings.SERVICES[key].should.contain.all.keys(serviceProps);
      }
    }
    done();
  });

  it('should have all required environment details defined', function(done) {
    should.exist(settings.ENV);
    settings.ENV.should.have.all.keys(envProps);
    done();
  });

  it('should have all required email details defined', function(done) {
    should.exist(settings.ENV.EMAIL_SETTINGS);
    settings.ENV.EMAIL_SETTINGS.should.have.all.keys(emailProps);

    should.exist(settings.ENV.EMAIL_SETTINGS.AUTH);
    settings.ENV.EMAIL_SETTINGS.AUTH.should.have.all.keys(['USER', 'PASS']);

    should.exist(settings.ENV.VERIFY_EMAIL_FORMAT);
    settings.ENV.VERIFY_EMAIL_FORMAT.should.have.all.keys(formatProps);

    should.exist(settings.ENV.CONFIRM_EMAIL_FORMAT);
    settings.ENV.CONFIRM_EMAIL_FORMAT.should.have.all.keys(formatProps);

    done();
  });
});

/**
 * Test for valid database configuration and connection.
 */
describe('Dash database', function() {
  it('should have a valid URL', function(done) {
    should.exist(settings.ENV.MONGO_URI);
    settings.ENV.MONGO_URI.should.match(/^(mongodb:(?:\/{2})?)((\S+?):(\S+?)@|:?@?)(\S+?):(\d+)\/(\w+?)$/);
    done();
  });

  it('should connect successfully', function(done) {
    mongoose.connect(settings.ENV.MONGO_URI, function(err) {
      should.not.exist(err);
      mongoose.connection.close(done);
    });
  });
});
