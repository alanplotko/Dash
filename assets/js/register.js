$(document).ready(function() {
  // Form validation setup
  $('#registerForm').validate({
    rules: {
      email: {
        required: true,
        email: true
      },
      displayName: {
        required: false,
        minlength: 3,
        maxlength: 15,
        regex: /^[a-zA-Z\d _-]{3,15}|$/
      },
      password: {
        required: true,
        minlength: 8,
        maxlength: 128,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/
      },
      passwordVerify: {
        required: true,
        equalTo: '#password'
      }
    },
    messages: {
      displayName: {
        regex: 'Allowed characters: alphanumeric, spaces, underscores, ' +
          'and dashes.'
      },
      password: {
        regex: 'Must contain at least 1 uppercase letter, 1 lowercase ' +
          'letter, and 1 number.'
      }
    }
  });
});
