'use strict';

function Gateway(sid, ip, hub, model) {
    if (model.indexOf('acpartner') !== -1) {
        this.type     = model;
    } else {
        this.type     = 'gateway';
    }
    this.sid          = sid;
    this.ip           = ip;
    this.hub          = hub;
    this.token        = null;
    this.illumination = null;
    this.connected    = false;

    this.lastValues = {
        rgb: '#FFFFFF',
        dimmer: 100
    };
    this.rgb          = null;
    this.dimmer       = null;
    this.on           = null;

    if (this.hub.protoMajor() === '2') {
        this.hub.sendMessage({cmd: 'discovery', sid: sid}, this.ip);
    } else {
        this.hub.sendMessage({cmd: 'get_id_list', sid: sid}, this.ip);
    }
    this.timeout      = null;

    return this;
}

Gateway.prototype.getData = function (data) {
    let newData = false;
    let obj = {};

    if (data.illumination !== undefined) {
        this.illumination = parseFloat(data.illumination);
        obj.illumination  = this.illumination;
        newData           = true;
    }

    if (!this.connected) {
        this.connected = true;
        obj.connected  = this.connected;
        newData        = true;
    }

    // Start timeout to detect dicsonnect
    this.timeout && clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
        this.timeout = null;
        this.hub.emit('data', this.sid, this.type, {connected: false});
    }, 20000);

    if (data.rgb !== undefined) {
        let rgb = parseInt(data.rgb, 10);
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
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

Gateway.prototype.onMessage = function (message) {
    if (message.cmd === 'get_id_list_ack') {
        this.initSensors(message.data);
    } else if (message.cmd === 'write_ack') {
        if (message.data.error) {
            this.hub.emit('error', message.data.error);
        }
        const obj_ = this.getData(message.data);
        if (obj_) {
            this.hub.emit('data', this.sid, this.type, obj_);
        }
    } else if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.type, obj);
        }
    }
};

Gateway.prototype.Control = function (attr, value) {
    if (attr === 'on' || attr === 'dimmer' || attr === 'rgb') {
        if (this.dimmer === null) {
            this.dimmer = this.lastValues.dimmer;
        }
        if (this.rgb === null) {
            this.rgb = this.lastValues.rgb;
        }
        if (this.on === null) {
            this.on = true;
        }

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

        if (this.timer) clearTimeout(this.timer);

        // collect data before send
        this.timer = setTimeout(() => {
            this.timer = null;
            let value;
            if (!this.on || !this.dimmer || this.rgb === '000000' || this.rgb === '#000000') {
                value = 0;
            } else {
                value = (this.dimmer << 24) | parseInt(this.rgb.replace('#', ''), 16);
            }

            const message = {
                cmd:      'write',
                model:    this.type,
                sid:      this.sid,
                short_id: 0,
                data: {
                    rgb:  value,
                    key:  this.hub.getKey(this.ip)
                }
            };

            this.hub.sendMessage(message, this.ip);
        }, 200);
    } else if (attr === 'volume') {
        if (value < 0)   value = 0;
        if (value > 100) value = 100;

        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                mid:  this.mid || 999,
                vol: value,
                key:  this.hub.getKey(this.ip)
            }
        };

        this.hub.sendMessage(message, this.ip);
    } else if (attr === 'mid') {
        this.mid = value;
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                mid:  value,
                key:  this.hub.getKey(this.ip)
            }
        };

        this.hub.sendMessage(message, this.ip);
    } else {
        this.hub.emit('warning', 'Unknown attribute ' + attr);
    }
};

Gateway.prototype.initSensors = function (sids) {
    this.hub.sendMessage({cmd: 'read', sid: this.sid}, this.ip);
    for (let i = 0; i < sids.length; i++) {
        this.hub.sendMessage({cmd: 'read', sid: sids[i]}, this.ip);
    }
};

module.exports = Gateway;