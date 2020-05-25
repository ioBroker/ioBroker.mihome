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
    this.className    = 'gateway';
    this.token        = null;
    this.illumination = null;
    this.protoVersion = '';
    this.acPower      = undefined;
    this.OnOffCfg     = undefined;
    this.ModeCfg      = undefined;
    this.WsCfg        = undefined;
    this.SwingCfg     = undefined;
    this.TempCfg      = undefined;
    this.RelayStatus  = undefined;
    this.connected    = false;

    this.lastValues = {
        rgb: '#FFFFFF',
        dimmer: 100
    };
    this.rgb          = null;
    this.dimmer       = null;
    this.on           = null;

    if (this.hub.protoMajor(this.ip) === '2')  {
        this.hub.sendMessage({cmd: 'discovery', sid: sid}, this.ip);
        this.hub.emit('debug', 'sid : ' + sid + ' ip : ' + this.ip);       //  ?
    } else {
        this.hub.sendMessage({cmd: 'get_id_list', sid: sid}, this.ip);     //  ?
        this.hub.emit('debug', 'sid : ' + sid + ' ip : ' + this.ip);       //  ?
    }
    this.timeout      = null;
    return this;
}

Gateway.prototype.getData = function (data) {
    let newData = false;
    let obj = {};

    if (typeof data === 'undefined') {
        return null;
    }

    if ((data.proto_version !== undefined) && (data.proto_version !== this.protoVersion)) {
        this.protoVersion = data.proto_version;
        obj.proto_version = this.protoVersion;
        newData           = true;
    }
    if ((data.on_off_cfg !== undefined) && (data.on_off_cfg !== this.OnOffCfg)) {
        this.OnOffCfg      = data.on_off_cfg;
        obj.on_off_cfg      = this.OnOffCfg;
        newData           = true;
    }
    if ((data.mode_cfg !== undefined) && (data.mode_cfg !== this.ModeCfg)) {
        this.ModeCfg      = data.mode_cfg;
        obj.mode_cfg      = this.ModeCfg;
        newData           = true;
    }
    if ((data.ws_cfg !== undefined) && (data.ws_cfg !== this.WsCfg)) {
        this.WsCfg      = data.ws_cfg;
        obj.ws_cfg      = this.WsCfg;
        newData           = true;
    }
    if ((data.swing_cfg !== undefined) && (data.swing_cfg !== this.SwingCfg)) {
        this.SwingCfg      = data.swing_cfg;
        obj.swing_cfg      = this.SwingCfg;
        newData           = true;
    }
    if ((data.temp_cfg !== undefined) && (data.temp_cfg !== this.TempCfg)) {
        this.TempCfg      = data.temp_cfg;
        obj.temp_cfg      = this.TempCfg;
        newData           = true;
    }
    if ((data.relay_status !== undefined) && (data.relay_status !== this.RelayStatus)) {
        this.RelayStatus      = data.relay_status;
        obj.relay_status      = this.RelayStatus;
        newData           = true;
    }
    if ((data.ac_power !== undefined) && (data.ac_power !== this.acPower)) {
        this.acPower      = data.ac_power;
        obj.ac_power      = this.acPower;
        newData           = true;
    }
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
    if (this.hub.protoMajor(this.ip) === '2') {
        // Protocol 2.0.x said cannot receive heartbeat longer than 65s means device offline.
        // Incase of network issue. set heartbeat timeout to 130s
        this.timeout = setTimeout(() => {
            this.timeout = null;
            this.hub.emit('data', this.sid, this.type, {connected: false});
        }, 130000);
    } else {
        this.timeout = setTimeout(() => {
            this.timeout = null;
            this.hub.emit('data', this.sid, this.type, {connected: false});
        }, 20000);
    }
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
            this.hub.emit('data', this.sid, this.className, obj);
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
            this.hub.emit('data', this.sid, this.className, obj_);
        }
    } else if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
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

    } else if (attr === 'on_off_cfg') {
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                on_off_cfg:  value,
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);

    } else if (attr === 'mode_cfg') {
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                mode_cfg:  value,
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);
        
    } else if (attr === 'ws_cfg') {
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                ws_cfg:  value,
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);

    } else if (attr === 'swing_cfg') {
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                swing_cfg:  value,
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);

    } else if (attr === 'temp_cfg') {
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                temp_cfg:  parseInt(value,10),
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);

    } else if (attr === 'relay_status') {
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                relay_status:  value,
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);
	    
    } else if (attr === 'remove_device') {        // это работает
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                remove_device:  value,
                key:  this.hub.getKey(this.ip)
            }
        };
        this.hub.sendMessage(message, this.ip);	    


    } else if (attr === 'join_permission') {        // это работает
        const message = {
            cmd:      'write',
            model:    this.type,
            sid:      this.sid,
            short_id: 0,
            data: {
                join_permission:  value,
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
