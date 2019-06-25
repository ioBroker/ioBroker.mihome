'use strict';

function Button(sid, ip, hub, model) {
    this.type    = model;
    this.sid     = sid;
    this.hub     = hub;
    this.className = 'switch';
    this.voltage = null;
    this.percent = null;
    this.ip      = ip;

    return this;
}

Button.prototype.getData = function (data) {
    let newData = false;
    let obj = {};
    if (data.voltage) {
        data.voltage = parseInt(data.voltage, 10);
        this.voltage = data.voltage / 1000;
        this.percent = Math.round(((data.voltage - 2655) / 5.45) * 10) / 10;
        if (this.percent > 100) {
            this.percent = 100;
        }
        if (this.percent < 0) {
            this.percent = 0;
        }
        obj.voltage = this.voltage;
        obj.percent = this.percent;
        newData = true;
    }
    if (data.status) {
        if (data.status === 'click') {
            obj.click = true;

            setTimeout(() => this.hub.emit('data', this.sid, this.className, {click: false}), 300);
        }
        if (data.status === 'double_click') {
            obj.double = true;

            setTimeout(() => this.hub.emit('data', this.sid, this.className, {double: false}), 300);
        }
        if (data.status === 'long_click_press') {
            obj.long = true;
        }
        if (data.status === 'long_click_release') {
            obj.long = false;
        }
        newData = true;
    }
    // Protocol 2.0.x support
    if (data.channel_0) {
        if (data.channel_0 === 'click') {
            obj.click = true;

            setTimeout(() => this.hub.emit('data', this.sid, this.className, {click: false}), 300);
        }
        if (data.channel_0 === 'double_click') {
            obj.double = true;

            setTimeout(() => this.hub.emit('data', this.sid, this.className, {double: false}), 300);
        }
        if (data.channel_0 === 'long_click_press') {
            obj.long = true;
        }
        if (data.channel_0 === 'long_click_release') {
            obj.long = false;
        }
        newData = true;
    }

    return newData ? obj : null;
};

Button.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

Button.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
module.exports = Button;
