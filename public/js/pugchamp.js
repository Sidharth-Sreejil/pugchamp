var socket = io();

var notifications = false;

if (window.Notification) {
    if (Notification.permission === 'granted') {
        notifications = true;
    }
    else {
        Notification.requestPermission(function(result) {
            if (result === 'granted') {
                notifications = true;
            }
            else {
                notifications = false;
            }
        });
    }
}
else {
    notifications = false;
}

function displayNotification(info) {
    if (notifications) {
        // TODO: update defaults

        var notification = new Notification('PugChamp', _.merge({}, info));
    }
}

var currentRestrictions;

var internalAvailabilityChange = false;
function changeAvailability() {
    if (internalAvailabilityChange) {
        return;
    }

    var roles = [];

    $('.role-select input[type=checkbox]:checked').each(function() {
        roles.push($(this).val());
    });

    var captain = $('#captain-select input[type=checkbox]').is(':checked');

    socket.emit('changeAvailability', {
        roles: roles,
        captain: captain
    });
}

$('.role-select input[type=checkbox]').on('change', changeAvailability);
$('#captain-select input[type=checkbox]').on('change', changeAvailability);

var internalReadyStatusChange = false;
function updateReadyStatus() {
    if (internalReadyStatusChange) {
        return;
    }

    socket.emit('updateReadyStatus', $('#ready-dialog input[type=checkbox]').is(':checked'));
}

$('#ready-dialog input[type=checkbox]').on('change', updateReadyStatus);

socket.on('connect', function() {
    $('#disconnected-alert').prop('hidden', true);

    var tokenRequest = new XMLHttpRequest();

    tokenRequest.onreadystatechange = function() {
        if (tokenRequest.readyState === XMLHttpRequest.DONE) {
            if (tokenRequest.status === 200) {
                socket.emit('authenticate', {
                    token: tokenRequest.responseText
                });
            } else if (tokenRequest.status !== 401) {
                throw new Error('Token request failed.');
            }
        }
    };

    tokenRequest.open('GET', '/user/token', true);
    tokenRequest.send(null);
});

socket.on('error', function(err) {
    if (error.type === 'UnauthorizedError' || error.code === 'invalid_token') {
        var tokenRequest = new XMLHttpRequest();

        tokenRequest.onreadystatechange = function() {
            if (tokenRequest.readyState === XMLHttpRequest.DONE) {
                if (tokenRequest.status === 200) {
                    socket.emit('authenticate', {
                        token: tokenRequest.responseText
                    });
                } else if (tokenRequest.status !== 401) {
                    throw new Error('Token request failed.');
                }
            }
        };

        tokenRequest.open('GET', '/user/token', true);
        tokenRequest.send(null);
    }
});

socket.on('launchStatusUpdated', function(currentStatus) {
    $('.role-players template[is=dom-repeat]').each(function() {
        this.items = currentStatus.playersAvailable[this.dataset.type];
    });

    $('#captains-list').text(_.map(currentStatus.captainsAvailable, function(player) {
        return player.alias;
    }).join(', '));
});

socket.on('userAvailabilityUpdated', function(availability) {
    internalAvailabilityChange = true;

    _.each(availability.roles, function(available, roleName) {
        if (available) {
            $('.role-select input[type=checkbox][value=' + roleName + ']').prop('checked', true);
        }
        else {
            $('.role-select input[type=checkbox][value=' + roleName + ']').prop('checked', false);
        }
    });

    if (availability.captain) {
        $('#captain-select input[type=checkbox]').prop('checked', true);
    }
    else {
        $('#captain-select input[type=checkbox]').prop('checked', false);
    }

    internalAvailabilityChange = false;
});

socket.on('launchInProgress', function() {
    displayNotification({body: 'A new game is being launched.', tag: 'launchAttempt'});

    $('#ready-dialog').prop('hidden', false);

    if (!currentRestrictions.aspects.includes('start')) {
        $('#ready-dialog label').prop('hidden', false);
        $('#ready-dialog input[type=checkbox]').prop('disabled', false);
    }
});

socket.on('launchAborted', function() {
    $('#ready-dialog').prop('hidden', true);
    $('#ready-dialog label').prop('hidden', true);
    $('#ready-dialog input[type=checkbox]').prop('disabled', true);
});

socket.on('userReadyStatusUpdated', function(ready) {
    internalReadyStatusChange = true;

    if (ready) {
        $('#ready-dialog input[type=checkbox]').prop('checked', true);
    }
    else {
        $('#ready-dialog input[type=checkbox]').prop('checked', false);
    }

    internalReadyStatusChange = false;
});

socket.on('restrictionsUpdated', function(restrictions) {
    currentRestrictions = restrictions;

    $('#restriction-alerts').empty();
    restrictions.reasons.forEach(function(reason) {
        $('<div class="alert alert-danger" role="alert"><i class="glyphicon glyphicon-alert"></i> ' + reason + '</div>').appendTo('#restriction-alerts');
    });

    if (restrictions.aspects.includes('start')) {
        $('.role-select input[type=checkbox]').prop('disabled', true);
        $('.role-select input[type=checkbox]').prop('hidden', true);
    } else {
        $('.role-select input[type=checkbox]').prop('disabled', false);
        $('.role-select input[type=checkbox]').prop('hidden', false);
    }

    if (restrictions.aspects.includes('start') || restrictions.aspects.includes('captain')) {
        $('#captain-select').prop('hidden', true);
        $('#captain-select input[type=checkbox]').prop('disabled', true);
    } else {
        $('#captain-select').prop('hidden', false);
        $('#captain-select input[type=checkbox]').prop('disabled', false);
    }

    if (restrictions.aspects.includes('chat')) {
        // disable chat box
    } else {
        // enable chat box
    }
});

socket.on('disconnect', function() {
    $('#disconnected-alert').prop('hidden', false);
});
