'use strict';

const texts = {
    0: 'Release alarm',
    1: 'Gas alarm',
    2: 'Analog alarm',
    64: 'Sensitivity fault alarm',
    32768: 'I2C communication failure'
};

function Alarm(sid, ip, hub, model) {
    this.type = model;
    this.sid  = sid;
    this.hub  = hub;
    this.ip   = ip;
    this.className = model;

    this.state       = null;
    this.description = null;
    this.voltage     = null;
    this.percent     = null;
}

Alarm.prototype.getData = function (data, isHeartbeat) {
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
        obj.voltage = this.voltage;
        obj.percent = this.percent;
        newData = true;
    }
    if (data.alarm !== undefined && !isHeartbeat) {
        if (data.alarm !== true && data.alarm !== false) {
            data.alarm = parseInt(data.alarm, 10) || 0;
            if (data.alarm === 1) {
                if (this.type === 'smoke') {
                    data.description = 'Smoke alarm';
                } else {
                    data.description = 'Gas alarm';
                }
            } else {
                data.description = texts[data.alarm] || '';
            }
            data.alarm = (data.alarm === 1 || data.alarm === 2);
        }

        this.state = data.alarm;
        obj.state  = data.alarm;
        obj.description = data.description;
        newData = true;
    }

    return newData ? obj : null;
};

Alarm.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data, true);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
Alarm.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
module.exports = Alarm;
