function createRequest(route) {
  $.post(route, function(data) {
    notify(data);
  }).fail(function(data) {
    notify(data.responseJSON);
  });
}

function createRequestFromForm(route, formSelector) {
  $.post(route, $(formSelector).serialize(), function(data) {
    notify(data);
  }).fail(function(data) {
    notify(data.responseJSON);
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
  createRequestFromForm('/settings/profile/display_name', '#displayNameForm');
  e.preventDefault();
});

$('#avatarForm').submit(function(e) {
  createRequestFromForm('/settings/profile/avatar', '#avatarForm');
  e.preventDefault();
});

$('#emailForm').submit(function(e) {
  createRequestFromForm('/settings/account/email', '#emailForm');
  e.preventDefault();
});

$('#passwordForm').submit(function(e) {
  createRequestFromForm('/settings/account/password', '#passwordForm');
  e.preventDefault();
});
