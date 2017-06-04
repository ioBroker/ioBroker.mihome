'use strict';

function Gateway(sid, hub) {
    this.type         = 'gateway';
    this.sid          = sid;
    this.hub          = hub;
    this.token        = null;
    this.illumination = null;

    this.lastValues = {
        rgb: '#FFFFFF',
        dimmer: 100
    };
    this.rgb          = null;
    this.dimmer       = null;
    this.on           = null;

    this.hub.sendMessage({cmd: 'get_id_list', sid: sid});

    return this;
}

Gateway.prototype.getData = function (data) {
    var newData = false;
    var obj = {};

    if (data.illumination !== undefined) {
        this.illumination = parseFloat(data.illumination);
        newData     = true;
    }
    if (data.rgb !== undefined) {
        var rgb = parseInt(data.rgb, 10);
        if (!rgb) {
            this.rgb    = '#000000';
            this.dimmer = 0;
            this.on     = false;
        } else {
            rgb = rgb.toString(16);
            if (rgb.length === 7) {
                rgb = '0' + rgb;
            } else if (rgb.length === 6) {
                rgb = '00' + rgb;
            } else if (rgb.length === 5) {
                rgb = '000' + rgb;
            } else if (rgb.length === 4) {
                rgb = '0000' + rgb;
            } else if (rgb.length === 3) {
                rgb = '00000' + rgb;
            } else if (rgb.length === 2) {
                rgb = '000000' + rgb;
            } else if (rgb.length === 1) {
                rgb = '0000000' + rgb;
            }
            this.dimmer = parseInt(rgb.substring(0, 2), 16);
            this.rgb    = '#' + rgb.substring(2).toUpperCase();
            this.on     = true;
        }
        obj.on      = this.on;
        obj.dimmer  = this.dimmer;
        obj.rgb     = this.rgb;

        // remember last non null values
        if (obj.dimmer) {
            this.lastValues.dimmer = obj.dimmer;
        }
        if (parseInt(obj.rgb.replace('#', ''), 16)) {
            this.lastValues.rgb = obj.rgb;
        }

        newData     = true;
    }

    return newData ? obj : null;
};

Gateway.prototype.heartBeat = function (token, data) {
    if (token) {
        this.token = token;
    }
};

Gateway.prototype.onMessage = function (message) {
    if (message.cmd === 'get_id_list_ack') {
        this.initSensors(message.data);
    } else if (message.cmd === 'write_ack') {
        if (message.data.error) {
            this.hub.emit('error', message.data.error);
        }
    } else if (message.data) {
        var obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

Gateway.prototype.Control = function (attr, value) {
    if (attr === 'on' || attr === 'dimmer' || attr === 'rgb') {
        if (attr === 'on') {
            this.on = !!value;

            if (this.on) {
                if (!parseInt(this.rgb.replace('#', ''), 16)) {
                    this.rgb = this.lastValues.rgb;
                }
                if (!this.dimmer) {
                    this.dimmer = this.lastValues.dimmer;
                }
            }
        }
        if (attr === 'dimmer') {
            this.dimmer = value;
            if (this.dimmer < 0)   this.dimmer = 0;
            if (this.dimmer > 100) this.dimmer = 100;

            if (this.dimmer) {
                this.on = true;

                if (!parseInt(this.rgb.replace('#', ''), 16)) {
                    this.rgb = this.lastValues.rgb;
                }
            }

        }

        if (attr === 'rgb') {
            this.rgb = value;

            if (parseInt(this.rgb.replace('#', ''), 16)) {
                this.on = true;

                if (!this.dimmer) {
                    this.dimmer = this.lastValues.dimmer;
                }
            }

        }
        if (this.dimmer === null) {
            this.dimmer = this.lastValues.dimmer;
        }
        if (this.rgb === null) {
            this.rgb = this.lastValues.rgb;
        }
        if (this.on === null) {
            this.on = true;
        }
        if (this.timer) clearTimeout(this.timer);

        // collect data before send
        this.timer = setTimeout(function () {
            this.timer = null;
            var value;
            if (!this.on || !this.dimmer || this.rgb === '000000' || this.rgb === '#000000') {
                value = 0;
            } else {
                value = (this.dimmer << 24) | parseInt(this.rgb.replace('#', ''), 16);
            }

            var message = {
                cmd:      'write',
                model:    this.type,
                sid:      this.sid,
                short_id: 0,
                data: {
                    rgb:  value,
                    key:  this.hub.getKey()
                }
            };

            this.hub.sendMessage(message);
        }.bind(this), 200);
    } else if (attr === 'volume') {
        if (value < 0)   value = 0;
        if (value > 100) value = 100;

        var message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                mid:  999,
                vol: value,
                key:  this.hub.getKey()
            }
        };

        this.hub.sendMessage(message);
    }
};

Gateway.prototype.initSensors = function (sids) {
    for (var i = 0; i < sids.length; i++) {
        this.hub.sendMessage({cmd: 'read', sid: sids[i]});
    }
};

module.exports = Gateway;