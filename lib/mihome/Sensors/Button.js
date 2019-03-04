'use strict';

function Button(sid, ip, hub) {
    this.type    = 'switch';
    this.sid     = sid;
    this.hub     = hub;
    this.voltage = null;
    this.percent = null;
    this.ip      = ip;

    return this;
}

Button.prototype.getData = function (data) {
    let newData = false;
    let obj = {};
    if (data.voltage) {
        data.voltage = parseInt(data.voltage, 10);
        this.voltage = data.voltage / 1000;
        this.percent = ((data.voltage - 2655) / 5.45).toFixed(1);
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
    if (data.status) {
        if (data.status === 'click') {
            obj.click = true;

            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    click: false
                });
            }.bind(this), 300);
        }
        if (data.status === 'double_click') {
            obj.double = true;

            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    double: false
                });
            }.bind(this), 300);
        }
        if (data.status === 'long_click_press') {
            obj.long = true;
        }
        if (data.status === 'long_click_release') {
            obj.long = false;
        }
        newData = true;
    }

    return newData ? obj : null;
};

Button.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

Button.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};
module.exports = Button;
