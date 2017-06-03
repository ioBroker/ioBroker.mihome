'use strict';

function Plug (sid, hub) {
    this.type           = 'plug';
    this.sid            = sid;
    this.hub            = hub;
    this.on             = null;
    this.load_power     = null;
    this.power_consumed = null;
    this.state          = null;
    this.inuse          = null;
}

Plug.prototype.getData = function (data) {
    var newData = false;
    var obj = {};
    if (data.load_power) {
        this.load_power = parseFloat(data.load_power);
        obj.load_power  = this.load_power;
        newData         = true;
    }
    if (data.power_consumed) {
        this.power_consumed = parseFloat(data.power_consumed);
        obj.power_consumed  = this.power_consumed;
        newData             = true;
    }
    if (data.inuse) {
        this.inuse = !!parseInt(data.inuse, 10);
        obj.inuse  = this.inuse;
        newData    = true;
    }
    if (data.status) {
        this.state = data.status === 'on';
        obj.state  = this.state;
        newData    = true;
    }

    return newData ? obj : null;
};

Plug.prototype.heartBeat = function () {

};

Plug.prototype.Control = function (attr, value) {
    if (attr !== 'channel_0') {
        this.hub.emit('warning', 'Unknown attribute ' + attr);
        return;
    }

    var message = {
        cmd:      'write',
        model:    this.type,
        sid:      this.sid,
        short_id: 0,
        data: {
            channel_0: value ? 'on' : 'off',
            key:  this.hub.key
        }
    };

    this.hub.sendMessage(message);
};

Plug.prototype.onMessage = function (message) {
    if (message.data) {
        if (message.data.status) {
            this.on = message.data.status === 'on';
            this.hub.emit('data', this.sid, this.type, {
                state: this.on
            });
        }
    }
};
module.exports = Plug;