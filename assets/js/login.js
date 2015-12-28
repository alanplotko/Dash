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
    }, 'Please enter a valid password.');

    // Form validation setup
    $('#loginForm').validate({
        rules: {
            username: {
                minlength: 3,
                required: true
            },
            password: {
                minlength: 8,
                required: true,
                regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
            },
            passwordVerify: {
                minlength: 8,
                regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
                equalTo: '#password'
            }
        },
        message: {
            username: {
                minlength: 'Must be at least 3 characters',
                required: 'Required input'
            },
            password: {
                minlength: 'Must be at least 8 characters',
                regex: 'Must contain 1 upper, 1 lower, and 1 number',
                required: 'Required input'
            },
            passwordVerify: {
                minlength: 'Must be at least 8 characters',
                regex: 'Must contain 1 upper, 1 lower, and 1 number',
                equalTo: 'Must match password'
            }
        },
        submitHandler: function(form) {
            $('#login').prop('disabled', true);
            form.submit();
        }
    });

    // Handle clicking main button
    $('#authenticate').click(function(e) {
        e.preventDefault();
        $('#formArea').fadeOut(function() {             // Hide buttons
            $('.prefix.active').removeClass('active');  // Default color override
            $('#loginForm').fadeIn();                   // Show login form
        });
    });

    // Handle switching into registration mode
    $('#register').click(function(e) {
        e.preventDefault();
        // Switch to register mode
        $('#loginForm').prop('action', '/register');
        // Require re-entering password for verification
        $('#passwordVerify').prop('required', true);
        // Update submit button text
        $('#submit').html('Register <i class="material-icons right">send</i>');
        // Show new options to return and register
        $(this).fadeOut(function() {
            $('#return, #verifySection').fadeIn();
        });
    });

    // Handle switching back into login mode
    $('#return').click(function(e) {
        e.preventDefault();
        // Switch to login mode
        $('#loginForm').prop('action', '/login');
        // Disable re-entering password; clear and hide second password prompt
        $('#passwordVerify').prop('required', false);
        $('#verifySection').fadeOut();
        $("#passwordVerify").val("").removeClass('valid').removeClass('invalid');
        $(".verifyIcon").text("check_box_outline_blank");
        // Update submit button text
        $('#submit').html('Sign In <i class="material-icons right">send</i>');
        // Show old options to register or sign in
        $(this).fadeOut(function() {
            $('#register').fadeIn();
        });
    });

    // Update indicator for passwords matching in registration mode
    $('#passwordVerify').on('blur', function() {
        if($('#passwordVerify').prop('required') && $('#passwordVerify').hasClass('valid'))
        {
            $('.verifyIcon').text('check_box');
        }
        else
        {
            $(".verifyIcon").text("check_box_outline_blank");
        }
    });

});