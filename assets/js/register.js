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
    $.validator.addMethod('passwordRegex', function(value, element, regexpr) {
        return regexpr.test(value);
    }, 'Must contain at least 1 uppercase letter, 1 lowercase letter, ' +
       'and 1 number.');
    $.validator.addMethod('displayNameRegex', function(value, element,
        regexpr) {
        return regexpr.test(value);
    }, 'Allowed characters: alphanumeric, spaces, underscores, and dashes.');

    // Form validation setup
    $('#registerForm').validate({
        rules: {
            email: {
                required: true,
                email: true
            },
            display_name: {
                required: false,
                minlength: 3,
                maxlength: 15,
                displayNameRegex: /^[a-zA-Z\d\ _-]{3,15}|$/
            },
            password: {
                required: true,
                minlength: 8,
                maxlength: 128,
                passwordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*}{><~`:;?|,.\]\[\)(+=._-]{8,128}$/
            },
            passwordVerify: {
                required: true,
                equalTo: '#password'
            }
        }
    });

});
