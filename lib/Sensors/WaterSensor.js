'use strict';

function WaterSensor(sid, ip, hub, model) {
    this.type    = model;
    this.sid     = sid;
    this.hub     = hub;
    this.ip      = ip;
    this.className = model;
    this.motion  = null;
    this.voltage = null;
    this.percent = null;
}

WaterSensor.prototype.getData = function (data, isHeartbeat) {
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
    // {“cmd”:“report”,“model”:“sensor_wleak.aq1”,“sid”:“aaa000xxxxxxx”,“short_id”:12345,“data”:"{“status”:“leak”}"}
    // {“cmd”:“report”,“model”:“sensor_wleak.aq1”,“sid”:“aaa000xxxxxxx”,“short_id”:12345,“data”:"{“status”:“no_leak”}"}
    if (data.status && !isHeartbeat) {
        this.leak = data.status === 'leak';
        obj.state   = this.leak;
        newData     = true;
    }
    // Protocol 2.0.x support
    if (data.wleak_alarm && !isHeartbeat) {
        this.leak = data.wleak_alarm === 'leak';
        obj.state   = this.leak;
        newData     = true;
    }
    return newData ? obj : null;
};

WaterSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data, true);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
WaterSensor.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

module.exports = WaterSensor;
