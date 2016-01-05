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
    }, 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');

    // Form validation setup
    $('#registerForm').validate({
        rules: {
            email: {
                required: true,
                email: true
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
        },
        message: {
            password: {
                minlength: 'Must be at least 8 characters'
            },
            passwordVerify: {
                equalTo: 'Must match password'
            }
        }
    });

});