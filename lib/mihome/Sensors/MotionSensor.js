'use strict';

function MotionSensor(sid, hub) {
    this.type    = 'motion';
    this.sid     = sid;
    this.hub     = hub;
    this.motion  = null;
    this.voltage = null;
    this.percent = null;
}

MotionSensor.prototype.getData = function (data) {
    var newData = false;
    var obj = {};
    if (data.voltage !== undefined) {
        data.voltage = parseInt(data.voltage, 10);
        this.voltage = data.voltage / 1000;
        this.percent = ((data.voltage - 2200) / 10);
        obj.voltage  = this.voltage;
        obj.percent  = this.percent;
        newData = true;
    }
    if (data.status) {
        this.motion = data.status === 'motion';
        obj.state   = this.motion;
        if (this.motion) {
            this.no_motion = 0;
            obj.no_motion = 0;
        }
        newData     = true;
    }
    if (data.no_motion !== undefined) {
        this.no_motion = parseInt(data.no_motion, 10);
        obj.no_motion  = this.no_motion;
        obj.state      = false;
        newData        = true;
    }

    return newData ? obj : null;
};

MotionSensor.prototype.heartBeat = function (token, data) {
    if (data) {
        var obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};
MotionSensor.prototype.onMessage = function (message) {
    if (message.data) {
        var obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

module.exports = MotionSensor;