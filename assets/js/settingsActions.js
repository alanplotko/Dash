function deleteModal() {
  $('#deleteConfirm').attr('onclick', 'deleteAccount(); return false;');
  $('#deleteModal').openModal();
}

function deleteAccount() {
  $.post('/settings/account/delete', function(data) {
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

function resetAvatar() {
  $.post('/settings/profile/avatar/reset', function(data) {
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

/**
 * Handle submissions
 */
$('#displayNameForm').submit(function(e) {
  updateDisplayName();
  e.preventDefault();
});
$('#avatarForm').submit(function(e) {
  updateAvatar();
  e.preventDefault();
});
$('#emailForm').submit(function(e) {
  updateEmail();
  e.preventDefault();
});
$('#passwordForm').submit(function(e) {
  updatePassword();
  e.preventDefault();
});

function updateDisplayName() {
  $.post('/settings/profile/display_name', $('#displayNameForm').serialize(),
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

function updateAvatar() {
  $.post('/settings/profile/avatar', $('#avatarForm').serialize(),
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

function updateEmail() {
  $.post('/settings/account/email', $('#emailForm').serialize(),
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

function updatePassword() {
  $.post('/settings/account/password', $('#passwordForm').serialize(),
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
