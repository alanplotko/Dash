module.exports = function(validator) {
  // Define custom validation function for a password
  validator.isValidPassword = function(str) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/
      .test(str);
  };

  // Define custom validation function for a display name
  validator.isValidDisplayName = function(str) {
    return /^[a-zA-Z\d _-]{3,15}$/.test(str);
  };

  // Define custom validation function for an avatar
  validator.isValidAvatar = function(str) {
    return /^(https?:\/\/|www.)(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:\/[^/#?]+)+\.(?:jp(e?)g|png)$/i
      .test(str);
  };
};
