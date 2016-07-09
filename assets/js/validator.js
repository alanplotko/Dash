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
});