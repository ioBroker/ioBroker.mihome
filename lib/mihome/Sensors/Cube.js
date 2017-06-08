'use strict';

function Cube(sid, hub) {
    this.type    = 'cube';
    this.sid     = sid;
    this.hub     = hub;
    this.voltage = null;
    this.percent = null;

    return this;
}

Cube.prototype.getData = function (data) {
    var newData = false;
    var obj = {};
    if (data.voltage) {
        data.voltage = parseInt(data.voltage, 10);
        this.voltage = data.voltage / 1000;
        this.percent = ((data.voltage - 2200) / 10);
        obj.voltage = this.voltage;
        obj.percent = this.percent;
        newData = true;
    }
    function trigger(obj, name) {
        obj[name] = true;

        setTimeout(function () {
            var _obj = {};
            _obj.name = false;
            this.hub.emit('data', this.sid, this.type, _obj);
        }.bind(this), 300);
    }

    if (data.status) {
        // flip90, flip180, move, tap_twice, shake_air, swing, alert, free_fall, rotate_left, rotate_right
        trigger(obj, data.status).bind(this);
        newData = true;
    }

    return newData ? obj : null;
};

Cube.prototype.heartBeat = function (token, data) {
    if (data) {
        var obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

Cube.prototype.onMessage = function (message) {
    if (message.data) {
        var obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};
module.exports = Cube;
