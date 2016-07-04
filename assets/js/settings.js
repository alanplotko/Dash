$(document).ready(function() {
  // Validation defaults
  $.validator.setDefaults({
    onkeyup: false,
    errorClass: 'invalid',
    validClass: 'valid',
    errorPlacement: function(error, element) {
      error.insertAfter($(element).siblings('label'));
    }
  });

  // Regex validations
  $.validator.addMethod('regex', function(value, element, regexpr) {
    return regexpr.test(value);
  }, 'Invalid input. Please follow the requirements for this field.');

  $('#displayNameForm').validate({
    rules: {
      displayName: {
        required: true,
        minlength: 3,
        maxlength: 15,
        regex: /^[a-zA-Z\d _-]{3,15}$/
      }
    },
    messages: {
      displayName: {
        regex: 'Please enter a valid display name.'
      }
    }
  });

  $('#avatarForm').validate({
    rules: {
      avatar: {
        required: true,
        regex: /^(https?:\/\/|www.)(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:\/[^/#?]+)+\.(?:jp(e?)g|png)$/i
      }
    },
    messages: {
      avatar: {
        regex: 'Please enter a valid avatar URL.'
      }
    }
  });

  $('#emailForm').validate({
    rules: {
      email: {
        required: true,
        email: true
      }
    }
  });

  $.validator.addMethod('notEqualTo', function(value, element, param) {
    var notEqual = true;
    value = $.trim(value);
    for (i = 0; i < param.length; i++) {
      if (value === $.trim($(param[i]).val())) {
        notEqual = false;
      }
    }
    return this.optional(element) || notEqual;
  }, 'Values cannot match.');

  $('#passwordForm').validate({
    rules: {
      currentPass: {
        required: true,
        minlength: 8,
        maxlength: 128,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/,
        notEqualTo: ['#newPass', '#newPassConfirm']
      },
      newPass: {
        required: true,
        minlength: 8,
        maxlength: 128,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/
      },
      newPassConfirm: {
        required: true,
        equalTo: '#newPass'
      }
    },
    messages: {
      currentPass: {
        notEqualTo: 'New password cannot match current password.',
        regex: 'Please enter a valid password.'
      },
      newPass: {
        regex: 'Please enter a valid password.'
      }
    }
  });
});
