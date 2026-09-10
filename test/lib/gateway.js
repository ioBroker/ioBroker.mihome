'use strict';

const dgram = require('node:dgram');

/** Messages of the simulated gateway. They are also the answer to a `whois` request. */
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
    { cmd: 'report', model: 'gateway', sid: '81726387164871', short_id: 0, data: { rgb: 0, illumination: 1180 } },
    { cmd: 'heartbeat', model: 'cube', sid: '287658275634875', short_id: 21396, data: { voltage: 2800 } },
    { cmd: 'report', model: 'sensor_wleak.aq1', sid: 'aaa000xxxxxxx', short_id: 12345, data: { status: 'leak' } },
    { cmd: 'report', model: 'sensor_wleak.aq1', sid: 'aaa000xxxxxxx', short_id: 12345, data: { status: 'no_leak' } },
];

/**
 * `rotate` adds up in the cube, so it may not be repeated. It is sent by `sendRotate()`, the test
 * triggers it as soon as the adapter is known to listen.
 */
const rotateCommand = {
    cmd: 'report',
    model: 'cube',
    sid: '287658275634875',
    short_id: 21396,
    data: { rotate: '6,500' },
};

/**
 * Interval of the repeated messages. It has to be longer than the double press interval of the
 * adapter (5 s), so that the repetitions are not detected as a double press, and shorter than
 * its heartbeat timeout (20 s), so that the connection stays alive.
 */
const REPEAT_INTERVAL = 6000;

/**
 * Minimal simulation of a Xiaomi gateway for the tests.
 *
 * A real gateway answers the multicast `whois` of the adapter. The GitHub runners for macOS and
 * Windows do not deliver multicast packets, so the messages are additionally pushed to the
 * adapter directly - and repeated, in case the adapter was not listening yet.
 */
class GatewaySimulator {
    /**
     * @param {number} adapterPort port the adapter listens on (`native.port`)
     * @param {string} adapterAddress address the adapter listens on
     */
    constructor(adapterPort = 9898, adapterAddress = '127.0.0.1') {
        this.socket = null;
        this.adapter = { address: adapterAddress, port: adapterPort };
        this.repeatTimer = null;
        this.firstBurst = true;
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

            this.sendAll(this.adapter);
            this.repeatTimer = setInterval(() => this.sendAll(this.adapter), REPEAT_INTERVAL);
        });
        this.socket.bind(4321);
    }

    /** Send the repeated device messages to the given target */
    sendAll(target) {
        const log = this.firstBurst;
        this.firstBurst = false;

        for (const command of commands) {
            this.send(command, target, log);
        }
    }

    /**
     * Send the single rotation of the cube.
     *
     * The cube adds every rotation up, so this message may arrive exactly once. It is sent to the
     * adapter directly and only after the adapter has proven that it is listening - the first
     * burst of `init()` is normally still lost, because the adapter binds its socket a bit later.
     */
    sendRotate() {
        this.send(rotateCommand, this.adapter, true);
    }

    /** Send one message to the given target */
    send(command, target, log) {
        const json = JSON.stringify(command);
        if (log) {
            console.log(`Send to ${target.address}:${target.port} ${json}`);
        }
        this.socket?.send(json, 0, json.length, target.port, target.address);
    }

    onMessage(msgBuffer, rinfo) {
        let msg;
        try {
            msg = JSON.parse(msgBuffer.toString());
        } catch {
            return;
        }

        if (msg.cmd === 'whois') {
            this.sendAll(rinfo);
        } else {
            msg.mirror = true;
            const json = JSON.stringify(msg);
            console.log(`Mirror ${json}`);
            this.socket.send(json, 0, json.length, rinfo.port, rinfo.address);
        }
    }

    destroy(cb) {
        if (this.repeatTimer) {
            clearInterval(this.repeatTimer);
            this.repeatTimer = null;
        }
        try {
            this.socket?.close(cb);
        } catch {
            // ignore
        }
        this.socket = null;
    }
}

module.exports = GatewaySimulator;
