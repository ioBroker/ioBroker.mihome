'use strict';

function THSensor(sid, hub) {
    this.type = 'sensor_ht';
    this.sid  = sid;
    this.hub  = hub;

    this.temperature = null;
    this.humidity    = null;
    this.voltage     = null;
    this.percent     = null;
}
THSensor.prototype.getData = function (data) {
    var newData = false;
    var obj = {};
    if (data.voltage !== undefined) {
        data.voltage = parseInt(data.voltage, 10);
        this.voltage = data.voltage / 1000;
        this.percent = ((data.voltage - 2200) / 10);
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
    if (data.humidity !== undefined) {
        this.humidity = parseInt(data.humidity) / 100;
        obj.humidity = this.humidity;
        newData = true;
    }
    if (data.temperature !== undefined) {
        this.temperature = parseInt(data.temperature) / 100;
        obj.temperature = this.temperature;
        newData = true;
    }
    return newData ? obj : null;
};

THSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        var obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};
THSensor.prototype.onMessage = function (message) {
    if (message.data) {
        var obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};
module.exports = THSensor;