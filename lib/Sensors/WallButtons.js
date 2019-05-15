'use strict';

function WallButtons(sid, ip, hub, model) {
    this.type         = model;
    this.sid          = sid;
    this.hub          = hub;
    this.ip           = ip;
    this.className    = model;
    this.channel_0    = null;
    this.channel_1    = null;
    this.dual_channel = null;
    this.voltage      = null;
    this.percent      = null;
    return this;
}

WallButtons.prototype.getData = function (data) {
    let newData = false;
    let obj = {};

    if (data.voltage !== undefined) {
        data.voltage = parseInt(data.voltage, 10);
        this.voltage = data.voltage / 1000;
        this.percent = Math.round(((data.voltage - 2655) / 5.45) * 10) / 10;
        if (this.percent > 100) {
            this.percent = 100;
        }
        if (this.percent < 0) {
            this.percent = 0;
        }
        obj.voltage  = this.voltage;
        obj.percent  = this.percent;
        newData = true;
    }
    
    if (data.channel_0) {
        obj.channel_0_double = data.channel_0 === 'double_click';
        obj.channel_0_long = data.channel_0 === 'long_click';
        this.channel_0 = data.channel_0 === 'click';
        obj.channel_0  = this.channel_0;
        newData = true;
        if (obj.channel_0) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {channel_0: false}), 300);
        }
        if (obj.channel_0_double) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {channel_0_double: false}), 300);
        }
        if (obj.channel_0_long) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {channel_0_long: false}), 300);
        }
    }
    
    if (data.channel_1) {
        obj.channel_1_double = data.channel_1 === 'double_click';
        obj.channel_1_long   = data.channel_1 === 'long_click';
        this.channel_1       = data.channel_1 === 'click';
        obj.channel_1        = this.channel_1;
        newData = true;
        if (obj.channel_1) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {channel_1: false}), 300);
        }
        if (obj.channel_1_double) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {channel_1_double: false}), 300);
        }
        if (obj.channel_1_long) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {channel_1_long: false}), 300);
        }
    }
    if (data.dual_channel) {
        this.dual_channel = data.dual_channel === 'both_click';
        obj.dual_channel  = this.dual_channel;
        newData = true;
        if (obj.dual_channel) {
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {dual_channel: false}), 300);
        }
    }
    return newData ? obj : null;
};

WallButtons.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

WallButtons.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

module.exports = WallButtons;
