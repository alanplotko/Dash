function deleteModal() {
    $('#deleteConfirm').attr('onclick', 'deleteAccount(); return false;');
    $('#deleteModal').openModal();
}

function deleteAccount() {
    $.post('/delete', function(data) {
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh) {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            if (data.responseJSON.refresh) {
                window.location.reload();
            }
        });
    });
}
