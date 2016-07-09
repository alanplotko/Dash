$(document).ready(function() {
  // Form validation setup
  $('#loginForm').validate({
    rules: {
      email: {
        required: true,
        email: true
      },
      password: {
        required: true,
        minlength: 8,
        maxlength: 128,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/
      }
    },
    messages: {
      password: {
        regex: 'Must contain at least 1 uppercase letter, 1 lowercase ' +
          'letter, and 1 number.'
      }
    }
  });
});
