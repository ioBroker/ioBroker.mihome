'use strict';

function WallButtons(sid, hub, model) {
    this.type         = model;
    this.sid          = sid;
    this.hub          = hub;
    this.channel_0    = null;
    this.channel_1    = null;
    this.dual_channel = null;
    this.voltage      = null;
    this.percent      = null;
    return this;
}

WallButtons.prototype.getData = function (data) {
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
        obj.voltage  = this.voltage;
        obj.percent  = this.percent;
        newData = true;
    }
    
    if (data.channel_0) {
        obj.channel_0_double = data.channel_0 === 'double_click';
        this.channel_0 = data.channel_0 === 'click';
        obj.channel_0  = this.channel_0;
        newData = true;
        if (obj.channel_0) {
            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    channel_0: false
                });
            }.bind(this), 300);
        }
        if (obj.channel_0_double) {
            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    channel_0_double: false
                });
            }.bind(this), 300);
        }
    }
    
    if (data.channel_1) {
        obj.channel_1_double = data.channel_1 === 'double_click';
        this.channel_1       = data.channel_1 === 'click';
        obj.channel_1        = this.channel_1;
        newData = true;
        if (obj.channel_1) {
            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    channel_1: false
                });
            }.bind(this), 300);
        }
        if (obj.channel_1_double) {
            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    channel_1_double: false
                });
            }.bind(this), 300);
        }
    }
    if (data.dual_channel) {
        this.dual_channel = data.dual_channel === 'both_click';
        obj.dual_channel  = this.dual_channel;
        newData = true;
        if (obj.dual_channel) {
            setTimeout(function () {
                this.hub.emit('data', this.sid, this.type, {
                    dual_channel: false
                });
            }.bind(this), 300);
        }
    }
    return newData ? obj : null;
};

WallButtons.prototype.heartBeat = function (token, data) {
    if (data) {
        var obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

WallButtons.prototype.onMessage = function (message) {
    if (message.data) {
        var obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

module.exports = WallButtons;
