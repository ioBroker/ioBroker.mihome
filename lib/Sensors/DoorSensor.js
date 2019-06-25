'use strict';
function DoorSensor(sid, ip, hub, model) {
    this.type    = model;
    this.sid     = sid;
    this.hub     = hub;
    this.ip      = ip;
    this.className = 'magnet';
    this.opened  = null;
    this.voltage = null;
    this.percent = null;
}

DoorSensor.prototype.getData = function (data, isHeartbeat) {
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
    // Protocol 2.0.x support
    if (data.window_status && data.window_status !== 'unknown' && !isHeartbeat) {
        this.opened = data.window_status !== 'close';
        obj.state   = this.opened;
        newData     = true;
    }
    if (data.status && data.status !== 'unknown' && !isHeartbeat) {
        this.opened = data.status !== 'close';
        obj.state   = this.opened;
        newData     = true;
    }

    return newData ? obj : null;
};

DoorSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data, true);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
DoorSensor.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
module.exports = DoorSensor;
