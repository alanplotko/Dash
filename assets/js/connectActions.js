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

function toggleModal(connection, isEnable) {
    var toggleOption = isEnable ? 'Enable' : 'Disable';
    var description = isEnable ? 'Enabling will include ' + connection +
        ' in future updates. You can always return here to disable updates ' +
        'for this connection.' : 'Disabling will exclude ' + connection +
        ' from future updates. You can always return here to enable updates ' +
        'for this connection.';
    $('#toggleTitle').html(toggleOption + ' ' + connection + ' Connection?');
    $('#toggleDescription').html(description);
    $('#toggleConfirm').html(toggleOption + ' ' + connection);
    $('#toggleConfirm').attr('onclick', 'toggleUpdates("' + connection +
        '"); return false;');
    $('#toggleModal').openModal();
}

function reset(connection) {
    $('.refresh-bar').remove();
    $('<div class="refresh-bar progress">' +
        '<div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/reset/' + connection, function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh) {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            if (data.responseJSON.refresh) {
                window.location.reload();
            }
        });
    });
}

function update(connection) {
    $('.refresh-bar').remove();
    $('<div class="refresh-bar progress">' +
        '<div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/refresh/' + connection.toLowerCase(), function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh) {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            if (data.responseJSON.refresh) {
                window.location.reload();
            }
        });
    });
}

function toggleUpdates(connection) {
    $('.refresh-bar').remove();
    $('<div class="refresh-bar progress">' +
        '<div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/toggleUpdates/' + connection.toLowerCase(), function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh) {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            if (data.responseJSON.refresh) {
                window.location.reload();
            }
        });
    });
}
