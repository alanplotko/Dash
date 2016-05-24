function updateModal(connection) {
    $('#updateTitle').html('Update ' + connection + ' Connection?');
    $('#updateDescription').html('Updating will retrieve only the latest ' +
        connection + ' posts.');
    $('#updateConfirm').html('Update ' + connection);
    $('#updateConfirm').attr('onclick', 'update("' + connection +
        '"); return false;');
    $('#updateModal').openModal();
}

function resetModal(connection) {
    $('#resetTitle').html('Reset ' + connection + ' Connection?');
    $('#resetDescription').html('Resetting will clear all existing ' +
        connection + ' posts. It will also set the last updated time for ' +
        connection + ' to yesterday.');
    $('#resetConfirm').html('Reset ' + connection);
    $('#resetConfirm').attr('onclick', 'reset("' + connection +
        '"); return false;');
    $('#resetModal').openModal();
}

function reset(connection) {
    $('.refresh-bar').remove();
    $('<div class="refresh-bar progress">'+
        '<div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/reset/' + connection, function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh)
            {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            $('.refresh-bar').fadeOut();
        });
    });
}

function update(connection) {
    $('.refresh-bar').remove();
    $('<div class="refresh-bar progress">'+
        '<div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/refresh/' + connection.toLowerCase(), function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh)
            {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            $('.refresh-bar').fadeOut();
        });
    });
}