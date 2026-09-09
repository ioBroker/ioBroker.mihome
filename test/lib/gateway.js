'use strict';

const dgram = require('node:dgram');

/** Messages that the simulated gateway answers to a `whois` request */
const commands = [
    {
        cmd: 'heartbeat',
        model: 'gateway',
        sid: '81726387164871',
        short_id: '0',
        token: '8475638456384',
        data: { ip: '192.168.10.68' },
    },
    { cmd: 'report', model: '86sw2', sid: '1234567abeefc', short_id: 10256, data: { channel_1: 'click' } },
    { cmd: 'report', model: '86sw2', sid: '1234567abeefc', short_id: 10256, data: { dual_channel: 'both_click' } },
    { cmd: 'report', model: 'weather.v1', sid: '1652761251244', short_id: 12817, data: { pressure: '100120' } },
    { cmd: 'report', model: 'weather.v1', sid: '1652761251244', short_id: 12817, data: { humidity: '6606' } },
    { cmd: 'report', model: 'weather.v1', sid: '1652761251244', short_id: 12817, data: { temperature: '2030' } },
    { cmd: 'report', model: 'cube', sid: '287658275634875', short_id: 21396, data: { rotate: '6,500' } },
    { cmd: 'report', model: 'gateway', sid: '81726387164871', short_id: 0, data: { rgb: 0, illumination: 1180 } },
    { cmd: 'heartbeat', model: 'cube', sid: '287658275634875', short_id: 21396, data: { voltage: 2800 } },
    { cmd: 'report', model: 'sensor_wleak.aq1', sid: 'aaa000xxxxxxx', short_id: 12345, data: { status: 'leak' } },
    { cmd: 'report', model: 'sensor_wleak.aq1', sid: 'aaa000xxxxxxx', short_id: 12345, data: { status: 'no_leak' } },
];

/** Minimal simulation of a Xiaomi gateway for the tests */
class GatewaySimulator {
    constructor() {
        this.socket = null;
    }

    init() {
        this.socket = dgram.createSocket('udp4');
        this.socket.on('message', (msgBuffer, rinfo) => this.onMessage(msgBuffer, rinfo));
        this.socket.on('error', error => console.error(`ERROR: ${error}`));
        this.socket.on('listening', () => {
            this.socket.setBroadcast(true);
            this.socket.setMulticastTTL(128);
            try {
                this.socket.addMembership('224.0.0.50');
            } catch (err) {
                console.error(`ERROR addMembership: ${err}`);
            }
        });
        this.socket.bind(4321);
    }

    onMessage(msgBuffer, rinfo) {
        let msg;
        try {
            msg = JSON.parse(msgBuffer.toString());
        } catch {
            return;
        }

        if (msg.cmd === 'whois') {
            for (let c = 0; c < commands.length; c++) {
                const json = JSON.stringify(commands[c]);
                console.log(`Send ${json}`);
                this.socket.send(json, 0, json.length, rinfo.port, rinfo.address);
            }
        } else {
            msg.mirror = true;
            const json = JSON.stringify(msg);
            console.log(`Mirror ${json}`);
            this.socket.send(json, 0, json.length, rinfo.port, rinfo.address);
        }
    }

    destroy(cb) {
        try {
            this.socket?.close(cb);
        } catch {
            // ignore
        }
        this.socket = null;
    }
}

module.exports = GatewaySimulator;
