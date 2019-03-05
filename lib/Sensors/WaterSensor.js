'use strict';

function WaterSensor(sid, ip, hub) {
    this.type    = 'sensor_wleak.aq1';
    this.sid     = sid;
    this.hub     = hub;
    this.ip      = ip;
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
        this.percent = ((data.voltage - 2655) / 5.45).toFixed(1);
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
    return newData ? obj : null;
};

WaterSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data, true);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};
WaterSensor.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

module.exports = WaterSensor;
