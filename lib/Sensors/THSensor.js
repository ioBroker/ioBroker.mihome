'use strict';

function THSensor(sid, ip, hub, model, options) {
    this.type = model;
    this.sid  = sid;
    this.hub  = hub;
    this.ip   = ip;
    this.className = model;

    this.interval    = parseInt((options && options.interval) || 5000, 10) || 0;
    this.temperature = null;
    this.humidity    = null;
    this.voltage     = null;
    this.percent     = null;
    this.lastData    = null;
}

THSensor.prototype.getData = function (data) {
    let newData = false;
    let obj = {};
    const ts = Date.now();
    if (this.interval && this.lastData) {
        const diff = ts - this.lastData;
        if (diff > 200 && diff < this.interval) {
            obj.doublePress = true;
            // deactivate after 300 ms
            setTimeout(() => this.hub.emit('data', this.sid, this.className, {doublePress: false}), 300);
            this.lastData = null;
        } else {
            this.lastData = ts;
        }
    } else {
        this.lastData = ts;
    }

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
    if (data.temperature === '10000' || data.temperature === 10000) {
        // ignore all values if 10000 as temperature.
        return null;
    }
    if (data.temperature !== undefined) {
        this.temperature = parseInt(data.temperature) / 100;
        obj.temperature = this.temperature;
        newData = true;
    }

    if (data.humidity !== undefined) {
        this.humidity = parseInt(data.humidity) / 100;
        obj.humidity = this.humidity;
        newData = true;
    }    
    if (data.pressure !== undefined && data.pressure !== null && data.pressure !== 0 && data.pressure !== '0') {
        this.pressure = Math.round(parseInt(data.pressure) / 133.322);      // Давление в мм.рт.ст.
        // this.pressure = parseInt(data.pressure) / 100;
        obj.pressure = this.pressure;
        newData = true;
    }
    return newData ? obj : null;
};

THSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
THSensor.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
module.exports = THSensor;
