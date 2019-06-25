'use strict';

function MotionSensor(sid, ip, hub, model) {
    this.type    = model;
    this.sid     = sid;
    this.ip      = ip;
    this.hub     = hub;
    this.className = model;
    this.motion  = null;
    this.voltage = null;
    this.percent = null;
}

MotionSensor.prototype.getData = function (data, isHeartbeat) {
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
    if (data.status && !isHeartbeat) {
        this.motion = data.status === 'motion';
        obj.state   = this.motion;
        if (this.motion) {
            this.no_motion = 0;
            obj.no_motion  = 0;
        }
        newData     = true;
    }
    // Protocol 2.0.x support
    if (data.motion_status && !isHeartbeat) {
        this.motion = data.motion_status === 'motion';
        obj.state   = this.motion;
        if (this.motion) {
            this.no_motion = 0;
            obj.no_motion  = 0;
        }
        newData     = true;
    }
    if (data.no_motion !== undefined && !isHeartbeat) {
        this.no_motion = parseInt(data.no_motion, 10);
        obj.no_motion  = this.no_motion;
        obj.state      = !this.no_motion;
        newData        = true;
    }
    if (data.lux !== undefined) {
        this.lux   = parseInt(data.lux, 10);
        obj.lux    = this.lux;
        newData    = true;
    }
    return newData ? obj : null;
};

MotionSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data, true);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
MotionSensor.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

module.exports = MotionSensor;
