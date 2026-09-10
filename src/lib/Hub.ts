import { createSocket, type Socket } from 'node:dgram';
import { EventEmitter } from 'node:events';
import { createCipheriv } from 'node:crypto';

import { Devices } from './devices';
import type { Sensor } from './Sensors/Sensor';
import type { HubCommand, HubEvents, HubMessage, HubOptions, RawData } from './types';

/** Multicast address of the Xiaomi gateways */
const MULTICAST_ADDRESS = '224.0.0.50';
const WHOIS_PORT = 4321;

/**
 * Communication with the Xiaomi gateways.
 *
 * The gateways are found via multicast, every device behind a gateway is represented by a `Sensor`
 * instance. All values are emitted as `data` events.
 */
export class Hub extends EventEmitter<HubEvents> {
    private readonly options: HubOptions;
    private readonly port: number;
    private readonly sensors: Record<string, Sensor> = {};
    /** Default key for all gateways without an own key */
    private readonly key: string | undefined;
    /** Key per gateway IP address */
    private readonly keys: Record<string, string> = {};
    /** Model per sid for the devices that do not report their model */
    private readonly sids: Record<string, string> = {};
    /** Last token per gateway IP address */
    private readonly token: Record<string, string> = {};
    private readonly iv = Buffer.from([
        0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e,
    ]);
    /** Protocol version per gateway IP address */
    private readonly protoVer: Record<string, string[]> = {};

    private socket: Socket | null = null;
    private _state: 'CONNECTED' | 'CLOSED' | null = null;

    constructor(options?: HubOptions) {
        super();

        this.options = options || {};
        this.port = parseInt(this.options.port as string, 10) || 9898;
        this.key = this.options.key;

        if (this.options.keys) {
            for (let i = 0; i < this.options.keys.length; i++) {
                this.keys[this.options.keys[i].ip] = this.options.keys[i].key;
            }
        }
        if (this.options.sids) {
            for (let i = 0; i < this.options.sids.length; i++) {
                this.sids[this.options.sids[i].sid] = this.options.sids[i].model;
            }
        }
    }

    /** Major version of the protocol the gateway with this IP speaks */
    public protoMajor(ip: string): string {
        if (typeof this.protoVer[ip] !== 'object') {
            return '1'; // default protocol version.
        }
        return this.protoVer[ip][0];
    }

    /** Protocol 2.0.x delivers the values as a list of single attribute objects */
    private params2data(params: RawData[]): RawData {
        const data: RawData = {};
        for (let i = 0; i < params.length; i++) {
            for (const key in params[i]) {
                if (key === 'battery_voltage') {
                    data.voltage = params[i][key];
                } else if (key === 'energy_consumed') {
                    data.power_consumed = (params[i][key] as number) / 1000.0;
                } else if (key === 'button_0') {
                    data.channel_0 = params[i][key];
                } else if (key === 'button_1') {
                    data.channel_1 = params[i][key];
                } else if (key === 'dual_channel') {
                    if (params[i][key] === 'click') {
                        data.dual_channel = 'both_click';
                    }
                } else {
                    data[key] = params[i][key];
                }
            }
        }
        return data;
    }

    private data2params(data: RawData): RawData[] {
        const params: RawData[] = [];
        for (const k in data) {
            params.push({ [k]: data[k] });
        }
        return params;
    }

    public listen(): void {
        this.socket = createSocket('udp4');
        this.socket.on('message', (msg, rinfo) => this.onSocketMessage(msg, rinfo));
        this.socket.on('error', err => this.onError(err));
        this.socket.on('listening', () => this.onListening());
        this.socket.bind(this.port);
    }

    public stop(cb?: () => void): void {
        if (this._state === 'CLOSED') {
            return;
        }
        this._state = 'CLOSED';

        // stop the timers of all devices
        Object.keys(this.sensors).forEach(sid => this.sensors[sid].destroy());

        if (this.socket) {
            try {
                this.socket.removeAllListeners();
                this.socket.close(cb);
                this.socket = null;
            } catch {
                this.socket = null;
                cb?.();
            }
        } else {
            cb?.();
        }
    }

    private onListening(): void {
        this._state = 'CONNECTED';
        if (!this.socket) {
            return;
        }
        this.socket.setBroadcast(true);
        this.socket.setMulticastTTL(128);
        try {
            if (this.options.bind && this.options.bind !== '0.0.0.0') {
                this.socket.addMembership(MULTICAST_ADDRESS, this.options.bind);
            } else {
                this.socket.addMembership(MULTICAST_ADDRESS);
            }
        } catch (err) {
            this.emit('warning', `ERROR addMembership: ${(err as Error).message}`);
        }
        const whoIsCommand = '{"cmd": "whois"}';
        this.socket.send(whoIsCommand, 0, whoIsCommand.length, WHOIS_PORT, MULTICAST_ADDRESS);
    }

    private onError(err: Error): void {
        if (this._state === 'CLOSED') {
            return;
        }
        this.emit('error', err);
    }

    private onSocketMessage(msgBuffer: Buffer, rinfo: { address: string }): void {
        if (this._state === 'CLOSED') {
            return;
        }
        let msg: HubMessage;
        try {
            msg = JSON.parse(msgBuffer.toString()) as HubMessage;

            if ((msg.model === 'gateway' || msg.model === 'acpartner.v3') && msg.sid.length < 12) {
                // Issue with missing leading zero in gateway's sid
                msg.sid = `000000000000${msg.sid}`.slice(-12);
            }
            if (msg.proto_version) {
                this.protoVer[rinfo.address] = msg.proto_version.split('.');
            }
            if (msg.params && this.protoMajor(rinfo.address) === '2') {
                // Transfer params in protocol 2.0.x to data on protocol 1.0.x
                msg.data = this.params2data(msg.params);
            }
        } catch {
            return;
        }

        let sensor = this.getSensor(msg.sid);

        if (!msg.model && msg.sid) {
            msg.model = this.sids[msg.sid];
            this.emit('debug', `Updated model: ${JSON.stringify(msg)} [${this.sids[msg.sid]}]`);
        }

        if (!sensor) {
            // {"model":"lumi.lock.v1","did":"lumi.1xxxxxxxxxxxxx8","name":"Front door lock"}
            if (!msg.model) {
                return;
            }
            try {
                if (this.options.browse) {
                    if (msg.model === 'gateway' || msg.model === 'acpartner.v3') {
                        this.emit('browse', { ip: rinfo.address });
                    }
                    return;
                }
                sensor = this.sensorFactory(msg.sid, msg.model, rinfo.address, msg.name);
            } catch (e) {
                this.emit('warning', `Could not add new sensor: ${(e as Error).message}`);
                return;
            }
        }

        if (sensor) {
            if (msg.data && typeof msg.data === 'string') {
                try {
                    msg.data = JSON.parse(msg.data) as RawData;
                } catch {
                    this.emit('warning', `Could not parse: ${msg.data as string}`);
                    msg.data = null;
                }
            }
            if (msg.token) {
                this.token[rinfo.address] = msg.token;
            }

            if (msg.cmd === 'heartbeat') {
                sensor.heartBeat(msg.token, Hub.asRawData(msg.data));
            } else {
                sensor.heartBeat();
            }

            if (this.protoMajor(rinfo.address) === '2') {
                if (msg.cmd === 'read_rsp') {
                    msg.cmd = 'read_ack';
                }
                if (msg.cmd === 'write_rsp') {
                    msg.cmd = 'write_ack';
                }
                if (msg.cmd === 'discovery_rsp') {
                    const sids: string[] = [];
                    const devList = msg.dev_list || [];
                    for (let i = 0; i < devList.length; i++) {
                        sids.push(devList[i].sid);
                    }
                    msg.data = sids;
                    msg.cmd = 'get_id_list_ack';
                }
            }

            if (msg.data && (msg.cmd === 'report' || msg.cmd.includes('_ack'))) {
                sensor.onMessage(msg);
            }
        }

        this.emit('message', msg);
    }

    /** Encrypt the last token of this gateway with its key */
    public getKey(ip: string): string | null {
        if (!this.token[ip]) {
            return null;
        }
        try {
            const key = this.keys[ip] || this.key;
            const cipher = createCipheriv('aes-128-cbc', key as string, this.iv);
            const crypted = cipher.update(this.token[ip], 'ascii', 'hex');
            cipher.final('hex'); // Useless data, don't know why yet.
            return crypted;
        } catch (err) {
            this.emit('error', `Cannot get Key for ${ip}: ${(err as Error).message}`);
            return null;
        }
    }

    public sendMessage(message: HubCommand, ip?: string): void {
        if (this._state === 'CLOSED' || !this.socket) {
            return;
        }
        if (this.protoMajor(ip || '') === '2') {
            delete message.short_id;
            if (message.data) {
                message.key = message.data.key;
                delete message.data.key;
                message.params = this.data2params(message.data);
                delete message.data;
            }
        }
        const json = JSON.stringify(message);
        this.emit('debug', `Send json: ${json}`); // Added for debugging
        this.socket.send(json, 0, json.length, this.port, ip || MULTICAST_ADDRESS);
    }

    public sensorFactory(sid: string, model: string, ip: string, name?: string): Sensor | null {
        if (this._state === 'CLOSED') {
            return null;
        }
        const dev = Object.keys(Devices).find(id => Devices[id].type === model);

        if (!dev) {
            throw new Error(`Type "${model}" is not valid, use one of  Hub::sensorTypes`);
        }

        const sensor = new Devices[dev].ClassName(sid, ip, this, model, this.options);
        this.registerSensor(sensor, name);
        return sensor;
    }

    public getSensor(sid: string): Sensor | null {
        return this.sensors[sid] || null;
    }

    public registerSensor(sensor: Sensor, name?: string): void {
        if (this._state === 'CLOSED') {
            return;
        }
        this.emit('device', sensor, name);
        this.sensors[sensor.sid] = sensor;
    }

    /** The `data` of a message is an object only for the value messages */
    private static asRawData(data: HubMessage['data']): RawData | undefined {
        return data && typeof data === 'object' && !Array.isArray(data) ? data : undefined;
    }
}
