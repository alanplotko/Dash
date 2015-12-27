$('#login').click(function(e) {
    e.preventDefault();
    $(this).hide(function() {
        $('.prefix.active').removeClass('active');
        $('#loginForm').show();
    });
});

$('#return').click(function(e) {
    e.preventDefault();
    $('#loginForm').hide(function() {
        $('#login').show();
    });
});

