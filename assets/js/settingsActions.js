function createRequest(route) {
  $.post(route, function(data) {
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

function createRequestFromForm(route, formSelector) {
  $.post(route, $(formSelector).serialize(),
    function(data) {
      Materialize.toast(data.message, 4000, '', function() {
        if (data.refresh) {
          window.location.reload();
        }
      });
    })
  .fail(function(data) {
    Materialize.toast(data.responseJSON.message, 4000, '', function() {
      if (data.responseJSON.refresh) {
        window.location.reload();
      }
    });
  });
}

function deleteModal() {
  $('#deleteConfirm').attr('onclick', 'deleteAccount(); return false;');
  $('#deleteModal').openModal();
}

function deleteAccount() {
  createRequest('/settings/account/delete');
}

function resetAvatar() {
  createRequest('/settings/profile/avatar/reset');
}

/**
 * Handle submissions
 */
$('#displayNameForm').submit(function(e) {
  createRequest('/settings/profile/display_name', '#displayNameForm');
  e.preventDefault();
});

$('#avatarForm').submit(function(e) {
  createRequest('/settings/profile/avatar', '#avatarForm');
  e.preventDefault();
});

$('#emailForm').submit(function(e) {
  createRequest('/settings/account/email', '#emailForm');
  e.preventDefault();
});

$('#passwordForm').submit(function(e) {
  createRequest('/settings/account/password', '#passwordForm');
  e.preventDefault();
});
