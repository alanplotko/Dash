module.exports = function(validator) {
    // Define custom validation function for a password
    validator.isValidPassword = function(str) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/.test(str);
    };

    // Define custom validation function for a password
    validator.isValidDisplayName = function(str) {
        return /^[a-zA-Z\d\ _-]{3,15}$/.test(str);
    };
};
