function createRequest(route) {
  $('.refresh-bar').remove();
  $('<div class="refresh-bar progress"><div class="indeterminate"></div>' +
    '</div>').insertAfter('nav');
  $.post(route, function(data) {
    $('.refresh-bar').fadeOut();
    notify(data);
  }).fail(function(data) {
    $('.refresh-bar').fadeOut();
    notify(data.responseJSON);
  });
}

function reset(service) {
  createRequest('/reset/' + service);
}

function resetModal(service) {
  $('#resetTitle').html('Reset ' + service + ' Service?');
  $('#resetDescription').html('Resetting will clear all existing ' +
    service + ' posts. It will also set the last updated time for ' +
    service + ' to yesterday.');
  $('#resetConfirm').html('Reset ' + service);
  $('#resetConfirm').attr('onclick', 'reset("' + service +
    '"); return false;');
  $('#resetModal').openModal();
}

function toggleUpdates(service) {
  createRequest('/toggleUpdates/' + service.toLowerCase());
}

function toggleModal(service, isEnable) {
  let toggleOption = isEnable ? 'Enable' : 'Disable';
  let description = isEnable ? 'Enabling will include ' + service + ' in' +
    'future updates. You can always return here to disable updates for this' +
    'service.' : 'Disabling will exclude ' + service + ' from future ' +
    'updates. You can always return here to enable updates for this ' +
    'service.';
  $('#toggleTitle').html(toggleOption + ' ' + service + ' Service?');
  $('#toggleDescription').html(description);
  $('#toggleConfirm').html(toggleOption + ' ' + service);
  $('#toggleConfirm').attr('onclick', 'toggleUpdates("' + service +
    '"); return false;');
  $('#toggleModal').openModal();
}

function update(service) {
  createRequest('/refresh/' + service.toLowerCase());
}

function updateModal(service) {
  $('#updateTitle').html('Update ' + service + ' Service?');
  $('#updateDescription').html('Updating will retrieve only the latest ' +
    service + ' posts.');
  $('#updateConfirm').html('Update ' + service);
  $('#updateConfirm').attr('onclick', 'update("' + service +
    '"); return false;');
  $('#updateModal').openModal();
}
