/**
 *      ioBroker MiHome
 *
 *      Copyright 2017-2026, bluefox <dogafox@gmail.com>
 *
 *      License: MIT
 */
import * as utils from '@iobroker/adapter-core';

import { Hub } from './lib/Hub';
import { Devices } from './lib/devices';
import type { Sensor } from './lib/Sensors/Sensor';
import type { SensorStates } from './lib/types';

/** Objects that are created for the devices of a gateway */
type DeviceObject = ioBroker.StateObject | ioBroker.ChannelObject;

class MihomeAdapter extends utils.Adapter {
    /** All known objects below `<namespace>.devices.` */
    private objects: Record<string, ioBroker.Object> = {};
    /** Values that arrived before the according object existed */
    private readonly delayed: Record<string, ioBroker.StateValue> = {};
    private readonly tasks: DeviceObject[] = [];

    private isConnected: boolean | null = null;
    private hub: Hub | null = null;

    private connTimeout: ioBroker.Timeout | undefined = undefined;
    private reconnectTimeout: ioBroker.Timeout | undefined = undefined;
    private browseTimeout: ioBroker.Timeout | undefined = undefined;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({ ...options, name: 'mihome' });

        this.on('ready', () => this.onReady());
        this.on('stateChange', (id, state) => this.onStateChange(id, state));
        this.on('message', obj => this.onMessage(obj));
        this.on('unload', callback => this.onUnload(callback));
    }

    private async onReady(): Promise<void> {
        // the values could be stored as string by an older version of the admin
        if (this.config.heartbeatTimeout === undefined) {
            this.config.heartbeatTimeout = 20000;
        } else {
            this.config.heartbeatTimeout = parseInt(this.config.heartbeatTimeout as unknown as string, 10) || 0;
        }
        this.config.restartInterval = parseInt(this.config.restartInterval as unknown as string, 10) || 30000;

        await this.readObjects();
        this.startMihome();
    }

    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (!id || !state || state.ack) {
            return;
        }
        if (!this.objects[id]) {
            this.log.warn(`Unknown ID: ${id}`);
            return;
        }
        if (this.hub) {
            const pos = id.lastIndexOf('.');
            const channelId = id.substring(0, pos);
            const attr = id.substring(pos + 1);

            if (this.objects[channelId]?.native) {
                const device = this.hub.getSensor(this.objects[channelId].native.sid);
                if (device?.Control) {
                    this.log.debug(`attr:${attr}`); // This is added for debugging
                    this.log.debug(`state:${state.val as string}`); // This is added for debugging
                    device.Control(attr, state.val);
                } else {
                    this.log.warn(`Cannot control ${id}`);
                }
            } else {
                this.log.warn(`Invalid device: ${id}`);
            }
        }
    }

    private onMessage(obj: ioBroker.Message): void {
        if (obj?.command === 'browse') {
            const message = (obj.message || {}) as { port?: number; bind?: string };
            let browse: Hub | null = new Hub({
                port: (message.port || this.config.port) + 1,
                bind: message.bind || '0.0.0.0',
                browse: true,
            });
            const result: string[] = [];

            browse.on('browse', data => {
                if (!result.includes(data.ip)) {
                    result.push(data.ip);
                }
            });

            browse.listen();

            this.browseTimeout = this.setTimeout(() => {
                this.browseTimeout = undefined;
                browse?.stop(() => {
                    browse = null;
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                });
            }, 3000);
        }
    }

    private onUnload(callback: () => void): void {
        this.clearTimeout(this.browseTimeout);
        this.browseTimeout = undefined;

        this.clearTimeout(this.connTimeout);
        this.connTimeout = undefined;

        this.clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;

        if (this.hub) {
            try {
                this.hub.stop(callback);
            } catch (e) {
                this.log.error(`Cannot stop: ${(e as Error).message}`);
                callback();
            }
        } else {
            callback();
        }
    }

    private updateStates(sid: string, type: string, data: SensorStates): void {
        const id = `${this.namespace}.devices.${type.replace('.', '_')}_${sid}`;

        for (const attr of Object.keys(data)) {
            const stateId = `${id}.${attr}`;
            if (this.objects[id] || this.objects[stateId]) {
                const common = this.objects[stateId]?.common as ioBroker.StateCommon | undefined;
                // convert hPa => mmHg
                if (common?.unit === 'mmHg') {
                    data[attr] = Math.round(((data.pressure as number) * 100) / 133.322);
                }
                if (!this.objects[stateId]) {
                    // TODO: what should be done here? Object does not exist, but the value will be set...
                    this.log.warn(
                        `Check, why the object ${stateId} does not exist! But the value ${data[attr] as string} is set.`,
                    );
                }

                void this.setForeignState(stateId, data[attr], true);
            } else {
                this.delayed[stateId] = data[attr];
            }
        }
    }

    /** Set a value that arrived before its object existed */
    private async setDelayedState(id: string): Promise<void> {
        if (this.delayed[id] !== undefined) {
            await this.setForeignStateAsync(id, this.delayed[id], true);
            delete this.delayed[id];
        }
    }

    /** Create or update all objects that are collected in `tasks` */
    private async syncObjects(): Promise<void> {
        while (this.tasks.length) {
            const obj = this.tasks.shift() as DeviceObject;
            const oObj = await this.getForeignObjectAsync(obj._id);

            if (!oObj) {
                this.objects[obj._id] = obj;
                await this.setForeignObjectAsync(obj._id, obj);
                await this.setDelayedState(obj._id);
                continue;
            }

            let changed = false;
            // merge info together
            const common = obj.common as unknown as Record<string, unknown>;
            const oCommon = oObj.common as unknown as Record<string, unknown>;
            for (const a of Object.keys(common)) {
                if (a !== 'name' && oCommon[a] !== common[a]) {
                    changed = true;
                    oCommon[a] = common[a];
                }
            }
            if (JSON.stringify(obj.native) !== JSON.stringify(oObj.native)) {
                changed = true;
                oObj.native = obj.native;
            }

            this.objects[oObj._id] = oObj;

            if (changed) {
                await this.setForeignObjectAsync(oObj._id, oObj);
                await this.setDelayedState(oObj._id);
            } else if (this.delayed[oObj._id] !== undefined) {
                await this.setDelayedState(oObj._id);
            } else if (oObj._id.endsWith('.rotate_position')) {
                // init rotate position with previous value
                const state = await this.getForeignStateAsync(oObj._id);
                if (state) {
                    const pos = oObj._id.lastIndexOf('.');
                    const channelId = oObj._id.substring(0, pos);

                    if (this.objects[channelId]) {
                        const device = this.hub?.getSensor(this.objects[channelId].native.sid);
                        if (device?.Control) {
                            device.Control('rotate_position', state.val);
                        }
                    }
                }
            }
        }
    }

    private createDeviceObjects(device: Sensor, name?: string): void {
        const id = `${this.namespace}.devices.${device.className.replace('.', '_')}_${device.sid}`;
        const isStartTasks = !this.tasks.length;
        const dev = Object.keys(Devices).find(key => Devices[key].type === device.type);

        if (dev) {
            const states = Devices[dev].states;
            for (const attr of Object.keys(states)) {
                this.log.debug(`Create ${id}.${attr}`);

                // the definitions are shared between all devices of a type, so work on a copy
                const common: ioBroker.StateCommon = { ...states[attr] };

                // use valid units
                if (this.config.mmHg && common.unit === 'hPa') {
                    common.unit = 'mmHg';
                    common.min = 0;
                    common.max = 1000;
                }

                this.tasks.push({
                    _id: `${id}.${attr}`,
                    common,
                    type: 'state',
                    native: {},
                });
            }
        } else {
            this.log.error(`Device ${device.type} not found`);
        }

        this.tasks.push({
            _id: id,
            common: {
                // `dev` is the key of the definition and not the definition itself, so the
                // JavaScript version always fell back to `device.type` here
                name: name || device.type,
                icon: `/icons/${device.type.replace('.', '_')}.png`,
            },
            type: 'channel',
            native: {
                sid: device.sid,
                type: device.type,
            },
        });

        if (isStartTasks) {
            void this.syncObjects();
        }
    }

    private async readObjects(): Promise<void> {
        // channels and states, the channels carry the sid in their `native`
        const list = await this.getForeignObjectsAsync(`${this.namespace}.devices.*`);
        void this.subscribeStates('devices.*');
        this.objects = list;
    }

    private disconnected(): void {
        this.connTimeout = undefined;
        if (this.isConnected) {
            this.isConnected = false;
            this.log.info(
                `Change connection status on timeout after ${this.config.heartbeatTimeout}ms: ${this.isConnected}`,
            );
            void this.setState('info.connection', this.isConnected, true);
        }
        this.stopMihome();
    }

    private setConnected(conn: boolean): void {
        if (this.isConnected !== conn) {
            this.isConnected = conn;
            this.log.info(`Change connection status: ${conn}`);
            void this.setState('info.connection', this.isConnected, true);
        }

        if (conn && this.config.heartbeatTimeout) {
            this.clearTimeout(this.connTimeout);

            this.connTimeout = this.setTimeout(() => this.disconnected(), this.config.heartbeatTimeout);
        }
    }

    private stopMihome(): void {
        if (this.hub) {
            try {
                this.hub.stop();
                this.hub = null;
            } catch {
                // ignore
            }
        }
        if (!this.reconnectTimeout) {
            this.reconnectTimeout = this.setTimeout(() => this.startMihome(), this.config.restartInterval);
        }
    }

    private startMihome(): void {
        this.reconnectTimeout = undefined;
        this.setConnected(false);

        if (!this.config.key && !this.config.keys?.find(e => e.key)) {
            this.log.error('no key defined. Only read is possible');
        }

        this.hub = new Hub({
            port: this.config.port,
            bind: this.config.bind || '0.0.0.0',
            key: this.config.key,
            keys: this.config.keys,
            sids: this.config.sids,
            interval: this.config.interval,
        });

        this.hub.on('message', msg => {
            this.setConnected(true);
            // Here's the output in Log ioBrokera of debug RAW lines:
            this.log.debug(`RAW: ${JSON.stringify(msg)}`);
        });
        this.hub.on('warning', msg => this.log.warn(msg));
        this.hub.on('debug', msg => this.log.debug(msg));
        this.hub.on('error', error => {
            this.log.error(typeof error === 'string' ? error : error.message);
            this.stopMihome();
        });
        this.hub.on('device', (device, name) => {
            if (device.sid !== '000000000000') {
                // Ignore devices with empty sid
                const id = `${this.namespace}.devices.${device.className.replace('.', '_')}_${device.sid}`;
                if (!this.objects[id]) {
                    // Here's the output in Log ioBrokera of the lines NEW device:
                    this.log.debug(`NEW device: ${device.sid}(${device.type})`);
                    this.createDeviceObjects(device, name);
                } else {
                    this.log.debug(`known device: ${device.sid}(${device.type})`);
                }
            }
        });
        this.hub.on('data', (sid, type, data) => {
            if (sid !== '000000000000') {
                // Ignore devices with empty sid
                // data: 000000000000(gateway): {"relay_status":"off"}
                this.log.debug(`data: ${sid}(${type}): ${JSON.stringify(data)}`);
                this.updateStates(sid, type, data);
            }
        });

        if (!this.connTimeout && this.config.heartbeatTimeout) {
            this.connTimeout = this.setTimeout(() => this.disconnected(), this.config.heartbeatTimeout);
        }

        this.hub.listen();
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new MihomeAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new MihomeAdapter())();
}
