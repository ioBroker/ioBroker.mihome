'use strict';

function Relay(sid, ip, hub, model) {
    this.type         = model;
    this.sid          = sid;
    this.hub          = hub;
    this.ip           = ip;
    this.className    = model;
    this.channel_0    = null;
    this.channel_1    = null;

    return this;
}

Relay.prototype.getData = function (data) {
    let newData = false;
    let obj = {};

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

Relay.prototype.Control = function (attr, value) {
    if (attr !== 'channel_0' && attr !== 'channel_1') {
        this.hub.emit('warning', 'Unknown attribute ' + attr);
        return;
    }

    const message = {
        cmd:      'write',
        model:    this.type,
        sid:      this.sid,
        short_id: 0,
        data: {
            key:  this.hub.getKey(this.ip)
        }
    };
    message.data[attr] = value ? 'on' : 'off';

    this.hub.sendMessage(message, this.ip);
};

Relay.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

Relay.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

module.exports = Relay;
