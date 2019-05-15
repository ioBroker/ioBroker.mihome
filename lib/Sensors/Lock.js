'use strict';

function Lock(sid, ip, hub, model) {
    this.type           = model;
    this.sid            = sid;
    this.ip             = ip;
    this.hub            = hub;
    this.className      = model;
    this.fing_verified  = null;
    this.psw_verified   = null;
    this.card_verified  = null;
    this.verified_wrong = null;
}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"voltage":3387}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"fing_verified": 65536}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"fing_verified": 65537}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"psw_verified": 131074}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"card_verified": 196608}'}
// {'cmd': 'report', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"verified_wrong":"3"}'}

Lock.prototype.getData = function (data) {
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
    if (data.fing_verified) {
        this.fing_verified = parseInt(data.fing_verified);
        obj.fing_verified  = this.fing_verified;
        newData            = true;
    }
    if (data.psw_verified) {
        this.psw_verified = parseInt(data.psw_verified);
        obj.psw_verified  = this.psw_verified;
        newData           = true;
    }
    if (data.card_verified) {
        this.card_verified = parseInt(data.card_verified);
        obj.card_verified  = this.card_verified;
        newData            = true;
    }
    if (data.verified_wrong) {
        this.verified_wrong = parseInt(data.verified_wrong);
        obj.verified_wrong  = this.verified_wrong;
        newData             = true;
    }

    return newData ? obj : null;
};

Lock.prototype.heartBeat = function (token, data) {
    if (data) {
        const obj = this.getData(data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};

Lock.prototype.onMessage = function (message) {
    if (message.data) {
        const obj = this.getData(message.data);
        if (obj) {
            this.hub.emit('data', this.sid, this.className, obj);
        }
    }
};
module.exports = Lock;
