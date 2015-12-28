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
    }, 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');

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
                regex: {
                    param: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%\^&*)(+=._-]{8,}$/,
                    depends: function(e) {
                        return $('#register').css('display') == 'none';
                    }
                }
            },
            passwordVerify: {
                required: {
                    depends: function(e) {
                        return $('#register').css('display') == 'none';
                    }
                },
                minlength: 8,
                regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%\^&*)(+=._-]{8,}$/,
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
                regex: 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
                required: 'Required input'
            },
            passwordVerify: {
                minlength: 'Must be at least 8 characters',
                regex: 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
                equalTo: 'Must match password'
            }
        },
        submitHandler: function(form) {
            $('#login, #return, #register').prop('disabled', true);
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
        // Update submit button text
        $('#login').html('Register <i class="material-icons right">send</i>');
        // Show new options to return and register
        $.when(
            $(this).fadeOut(function() {
                $('#return, #verifySection').fadeIn();
            })
        ).then(function() {
            $('#loginForm').valid();
        });
    });

    // Handle switching back into login mode
    $('#return').click(function(e) {
        e.preventDefault();
        // Switch to login mode
        $('#loginForm').prop('action', '/login');
        // Clear and hide second password prompt
        $('#verifySection').fadeOut();
        $("#passwordVerify").val("").removeClass('valid').removeClass('invalid');
        // Update submit button text
        $('#login').html('Sign In <i class="material-icons right">send</i>');
        // Show old options to register or sign in
        $.when(
            $(this).fadeOut(function() {
                $('#register').fadeIn();
            })
        ).then(function() {
            $('#loginForm').valid();
        });
    });

});