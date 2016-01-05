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
    $.validator.addMethod('displayNameRegex', function(value, element, regexpr) {          
        return regexpr.test(value);
    }, 'Must contain only alphanumeric characters, dashes, underscores, and spaces');

    // Form validation setup
    $('#settingsForm').validate({
        rules: {
            displayName: {
                required: true,
                minlength: 3,
                maxlength: 15,
                displayNameRegex: /^[a-zA-Z\d\ _-]{3,15}$/
            }
        }
    });
    
});