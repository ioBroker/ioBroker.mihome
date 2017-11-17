'use strict';

function Curtain(sid, ip, hub) {
    this.type           = 'curtain';
    this.sid            = sid;
    this.hub            = hub;
    this.ip             = ip;
    this.curtain_level  = null;
}

Curtain.prototype.getData = function (data) {
    var newData = false;
    var obj = {};
    if (data.curtain_level) {
        this.curtain_level = parseFloat(data.curtain_level);
        obj.curtain_level  = this.curtain_level;
        newData         = true;
    }
    if (data.status) {
        if (this.status === 'open') {
            obj.open = true;
            newData  = true;
        } else
        if (this.status === 'close') {
            obj.close = true;
            newData   = true;
        } else
        if (this.status === 'stop') {
            obj.stop = true;
            newData  = true;
        } else {
            this.hub.emit('warning', 'Unknown status "' + this.status + '"');
        }
    }

    return newData ? obj : null;
};

Curtain.prototype.heartBeat = function (token, data) {
    if (data) {
        var obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

Curtain.prototype.Control = function (attr, value) {
    var message;
    if (attr === 'stop' || attr === 'open' || attr === 'close') {
        message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                status: attr,
                key:  this.hub.getKey(this.ip)
            }
        };
    } else if (attr === '') {
        message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                status: 'auto', // may be it must be 2 different commands, first auto, then level
                curtain_level: value,
                key:  this.hub.getKey(this.ip)
            }
        };
    } else {
        this.hub.emit('warning', 'Unknown control attribute "' + attr + '"');
        return;
    }

    this.hub.sendMessage(message, this.ip);
};

Curtain.prototype.onMessage = function (message) {
    if (message.data) {
        if (message.data.status) {
            this.on = message.data.status === 'on';
            this.hub.emit('data', this.sid, this.type, {
                state: this.on
            });
        }
    }
};
module.exports = Curtain;