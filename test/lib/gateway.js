'use strict';

const dgram        = require('dgram');

const commands = [
    {"cmd": "heartbeat", "model": "gateway",          "sid":"81726387164871",  "short_id": "0",   "token": "8475638456384", "data": {"ip":"192.168.10.68"}},
    {"cmd": "report",    "model": "86sw2",            "sid":"1234567abeefc",   "short_id": 10256, "data": {"channel_1": "click"}},
    {"cmd": "report",    "model": "86sw2",            "sid":"1234567abeefc",   "short_id": 10256, "data": {"dual_channel": "both_click"}},
    {"cmd": "report",    "model": "weather.v1",       "sid":"1652761251244",   "short_id": 12817, "data": {"pressure": "100120"}},
    {"cmd": "report",    "model": "weather.v1",       "sid":"1652761251244",   "short_id": 12817, "data": {"humidity": "6606"}},
    {"cmd": "report",    "model": "weather.v1",       "sid":"1652761251244",   "short_id": 12817, "data": {"temperature": "2030"}},
    {"cmd": "report",    "model": "cube",             "sid":"287658275634875", "short_id": 21396, "data": {"rotate": "6,500"}},
    {"cmd": "report",    "model": "gateway",          "sid":"81726387164871",  "short_id": 0,     "data": {"rgb": 0, "illumination": 1180}},
    {"cmd": "heartbeat", "model": "cube",             "sid":"287658275634875", "short_id": 21396, "data": {"voltage": 3025}},
    {"cmd": "report",    "model": "sensor_wleak.aq1", "sid":"aaa000xxxxxxx",   "short_id": 12345, "data": {"status": "leak"}},
    {"cmd": "report",    "model": "sensor_wleak.aq1", "sid":"aaa000xxxxxxx",   "short_id": 12345, "data": {"status": "no_leak"}}
];

function GatewaySimulator () {
    const that = this;

    this.destroy = function (cb) {
        this.socket.close(cb);
        this.socket = null;
    };

    function onMessage(msgBuffer, rinfo) {
        let msg;
        try {
            msg = JSON.parse(msgBuffer.toString());
        }
        catch (e) {
            return;
        }
        if (msg.cmd === 'whois') {
            for (let c = 0; c < commands.length; c++) {
                const json = JSON.stringify(commands[c]);
                console.log('Send ' + json);
                that.socket.send(json, 0, json.length, rinfo.port, rinfo.ip);
            }
        } else {
            msg.mirror = true;
            const json = JSON.stringify(msg);
            console.log('Mirror ' + json);
            that.socket.send(json, 0, json.length, rinfo.port, rinfo.ip);
        }
    }

    this.init = function () {
        this.socket = dgram.createSocket('udp4');
        this.socket.on('message', onMessage);
        this.socket.on('error', error => console.error('ERROR: ' + error));
        this.socket.on('listening', () => {
            that.socket.setBroadcast(true);
            that.socket.setMulticastTTL(128);
            that.socket.addMembership('224.0.0.50');
        });
        this.socket.bind(4321);
    };

    return this;
}

if (typeof module !== undefined && module.parent) {
    module.exports = GatewaySimulator;
} else {
    const gw = new GatewaySimulator();
    gw.init();
}