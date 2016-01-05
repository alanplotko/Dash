// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;
var MAX_LOGIN_ATTEMPTS = 5;
var LOCK_TIME = 2 * 60 * 60 * 1000; // 2-hour lock

// Define user fields
var UserSchema = new Schema({
    email: { type: String, required: true, index: { unique: true } },
    displayName: { type: String, required: true },
    password: { type: String, required: true },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number },
    gravatar: { type: String, required: true }
});

// Check for a future lockUntil timestamp
UserSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Run checks prior to saving the document
UserSchema.pre('save', function(next) {
    var user = this;

    // Check if the provided email address already exists
    mongoose.models['User'].findOne({ email: user.email }, function (err, user) {
        if (user) {
            return next(new Error('Registration failed. Do you perhaps already have an account?'));
        }
    });

    // Only hash password if it has been modified or is new
    if (!user.isModified('password')) return next();

    // Generate salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(new Error('An error occurred. Please try again in a few minutes.'));

        // Hash password using new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(new Error('An error occurred. Please try again in a few minutes.'));

            // Set hashed password back on document
            user.password = hash;
            next();
        });
    });
});

// Validate password for user
UserSchema.methods.comparePassword = function(candidatePassword, done) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return done(err);
        done(null, isMatch);
    });
};

// If login fails, increment login attempts count
UserSchema.methods.incLoginAttempts = function(done) {
    // If previous lock has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        }, done);
    }

    // Otherwise, increment login attempts count
    var updates = { $inc: { loginAttempts: 1 } };

    // Lock account if max attempts reached and account is not already locked
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    }

    return this.update(updates, done);
};

// Expose enum on model to provide internal reference
var reasons = UserSchema.statics.failedLogin = {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
};

// Serialize function for use with passport
UserSchema.statics.authSerializer = function(user, done) {
    done(null, user.id);
};

// Deserialize function for use with passport
UserSchema.statics.authDeserializer = function(id, done) {
    mongoose.models['User'].findById(id, 'email displayName gravatar', function(err, user) {
        done(err, user);
    });
};

// Authenticate the provided credentials
UserSchema.statics.authenticateUser = function(email, password, done) {
    // Search for email address
    this.findOne({ email: email }, function(err, user) {
        // An error occurred
        if (err) return done(err);

        // Check if user exists
        if (!user) {
            return done(null, null, reasons.NOT_FOUND);
        }

        // Check if account is currently locked
        if (user.isLocked) {
            // Increment login attempts if account is already locked
            return user.incLoginAttempts(function(err) {
                // An error occurred
                if (err) return done(err);

                return done(null, null, reasons.MAX_ATTEMPTS);
            });
        }

        // Test provided credentials for matching password
        user.comparePassword(password, function(err, isMatch) {
            // An error occurred
            if (err) return done(err);

            // Check if password matched
            if (isMatch) {
                // If there's no lock or failed attempts, just return the user
                if (!user.loginAttempts && !user.lockUntil) return done(null, user);
                
                // Reset attempts and lock duration
                var updates = {
                    $set: { loginAttempts: 0 },
                    $unset: { lockUntil: 1 }
                };

                return user.update(updates, function(err) {
                    // An error occurred
                    if (err) return done(err);

                    return done(null, user);
                });
            }

            // Password is incorrect, so increment login attempts before responding
            user.incLoginAttempts(function(err) {
                // An error occurred
                if (err) return done(err);
                
                return done(null, null, reasons.PASSWORD_INCORRECT);
            });
        });
    });
};

// Update user settings
UserSchema.statics.updateUser = function(id, settings, done) {
    mongoose.models['User'].update({ _id: id }, settings, function(err, numAffected) {
        // An error occurred
        if (err) return done(err);
        // Update succeeded
        return done(null, true);
    });
};

// Set up passport local strategy with mongoose
UserSchema.plugin(passportLocalMongoose, {
    usernameField: 'email' // Use 'email' field instead of default 'username' field
});

module.exports = mongoose.model('User', UserSchema);