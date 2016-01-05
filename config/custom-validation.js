module.exports = function(validator) {

    // Define custom validation function for a password
    validator.extend('isValidPassword', function (str) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/.test(str);
    });

    // Define custom validation function for a password
    validator.extend('isValidDisplayName', function (str) {
        return /^[a-zA-Z\d\ _-]{3,15}$/.test(str);
    });

}