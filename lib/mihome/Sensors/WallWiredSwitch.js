'use strict';

function WallWiredSwitch(sid, hub, model) {
    this.type         = model;
    this.sid          = sid;
    this.hub          = hub;
    this.channel_0    = null;
    this.channel_1    = null;

    return this;
}

WallWiredSwitch.prototype.getData = function (data) {
    var newData = false;
    var obj = {};

    if (data.channel_0) {
        this.channel_0 = data.channel_0 === 'on';
        obj.channel_0  = this.channel_0;
        newData = true;
    }
    if (data.channel_1) {
        this.channel_1 = data.channel_1 === 'on';
        obj.channel_1  = this.channel_1;
        newData = true;
    }

    return newData ? obj : null;
};

WallWiredSwitch.prototype.Control = function (attr, value) {
    if (attr !== 'channel_0' && attr !== 'channel_1' && attr !== 'state') {
        this.hub.emit('warning', 'Unknown attribute ' + attr);
        return;
    }

    var message = {
        cmd:      'write',
        model:    this.type,
        sid:      this.sid,
        short_id: 0,
        data: {
            key:  this.hub.getKey()
        }
    };
    message.data[attr] = value ? 'on' : 'off';

    this.hub.sendMessage(message);
};

WallWiredSwitch.prototype.heartBeat = function (token, data) {
    if (data) {
        var obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

WallWiredSwitch.prototype.onMessage = function (message) {
    if (message.data) {
        var obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

module.exports = WallWiredSwitch;
