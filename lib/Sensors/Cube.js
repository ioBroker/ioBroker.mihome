'use strict';

function Cube(sid, ip, hub, model) {
    this.type            = model;
    this.sid             = sid;
    this.ip              = ip;
    this.hub             = hub;
    this.className       = 'cube';
    this.voltage         = null;
    this.percent         = null;
    this.rotate_position = 0;

    return this;
}

Cube.prototype.trigger = function (obj, name) {
    obj[name] = true;

    setTimeout(() => {
        const _obj = {};
        _obj[name] = false;
        this.hub.emit('data', this.sid, this.className, _obj);
    }, 300);
};

Cube.prototype.getData = function (data) {
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
        obj.voltage  = this.voltage;
        obj.percent  = this.percent;
        newData = true;
    }

    if (data.status) {
        // flip90, flip180, move, tap_twice, shake_air, swing, alert, free_fall, rotate_left, rotate_right
        this.trigger(obj, data.status);
        newData = true;
    }
    if (data.rotate) {
        // rotate
        obj.rotate = parseFloat(data.rotate.replace(',', '.')) || 0;
        if (obj.rotate >= 0) {
            this.trigger(obj, 'rotate_right');
        } else if (obj.rotate < 0) {
            this.trigger(obj, 'rotate_left');
        }
        this.rotate_position += obj.rotate;
        if (this.rotate_position < 0)   this.rotate_position = 0;
        if (this.rotate_position > 100) this.rotate_position = 100;
        obj.rotate_position = this.rotate_position;

        newData = true;
    }

    return newData ? obj : null;
};

Cube.prototype.Control = function (attr, val) {
    if (attr === 'rotate_position') {
        val = parseFloat(val);
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        if (this.rotate_position !== val) {
            this.hub.emit('data', this.sid, this.className, {rotate_position: this.rotate_position});
        }
    }
};

Cube.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

Cube.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

module.exports = Cube;
