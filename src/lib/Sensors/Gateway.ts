import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { HubCommand, HubMessage, RawData, SensorStates } from '../types';

export class Gateway extends Sensor {
    public token: string | null = null;
    private illumination: number | null = null;
    private protoVersion = '';
    private acPower: ioBroker.StateValue | undefined = undefined;
    // New states for acpartner-----------------
    private onOffCfg: ioBroker.StateValue | undefined = undefined;
    private modeCfg: ioBroker.StateValue | undefined = undefined;
    private wsCfg: ioBroker.StateValue | undefined = undefined;
    private swingCfg: ioBroker.StateValue | undefined = undefined;
    private tempCfg: ioBroker.StateValue | undefined = undefined;
    private relayStatus: ioBroker.StateValue | undefined = undefined;
    //----------------------------------------------
    private connected = false;

    private readonly lastValues = {
        rgb: '#FFFFFF',
        dimmer: 100,
    };

    private rgb: string | null = null;
    private dimmer: number | null = null;
    private on: boolean | null = null;
    private mid: ioBroker.StateValue | undefined = undefined;

    /** Timeout to detect that the gateway is not reachable any more */
    private timeout: NodeJS.Timeout | null = null;
    /** Collects the light changes before they are sent */
    private timer: NodeJS.Timeout | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model.includes('acpartner') ? model : 'gateway', 'gateway');

        if (this.hub.protoMajor(this.ip) === '2') {
            this.hub.sendMessage({ cmd: 'discovery', sid }, this.ip);
            this.hub.emit('debug', `sid : ${sid} ip : ${this.ip}`);
        } else {
            this.hub.sendMessage({ cmd: 'get_id_list', sid }, this.ip);
            this.hub.emit('debug', `sid : ${sid} ip : ${this.ip}`); // For debug
        }
    }

    public getData(data?: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};

        if (typeof data === 'undefined') {
            return null;
        }

        if (data.proto_version !== undefined && data.proto_version !== this.protoVersion) {
            this.protoVersion = data.proto_version as string;
            obj.proto_version = this.protoVersion;
            newData = true;
        }
        // New states for acpartner-----------------
        if (data.on_off_cfg !== undefined && data.on_off_cfg !== this.onOffCfg) {
            this.onOffCfg = data.on_off_cfg;
            obj.on_off_cfg = this.onOffCfg;
            newData = true;
        }
        if (data.mode_cfg !== undefined && data.mode_cfg !== this.modeCfg) {
            this.modeCfg = data.mode_cfg;
            obj.mode_cfg = this.modeCfg;
            newData = true;
        }
        if (data.ws_cfg !== undefined && data.ws_cfg !== this.wsCfg) {
            this.wsCfg = data.ws_cfg;
            obj.ws_cfg = this.wsCfg;
            newData = true;
        }
        if (data.swing_cfg !== undefined && data.swing_cfg !== this.swingCfg) {
            this.swingCfg = data.swing_cfg;
            obj.swing_cfg = this.swingCfg;
            newData = true;
        }
        if (data.temp_cfg !== undefined && data.temp_cfg !== this.tempCfg) {
            this.tempCfg = data.temp_cfg;
            obj.temp_cfg = this.tempCfg;
            newData = true;
        }
        if (data.relay_status !== undefined && data.relay_status !== this.relayStatus) {
            this.relayStatus = data.relay_status;
            obj.relay_status = this.relayStatus;
            newData = true;
        }
        //-----------------------------------------------------
        if (data.ac_power !== undefined && data.ac_power !== this.acPower) {
            this.acPower = data.ac_power;
            obj.ac_power = this.acPower;
            newData = true;
        }
        if (data.illumination !== undefined) {
            this.illumination = parseFloat(data.illumination as string);
            obj.illumination = this.illumination;
            newData = true;
        }
        if (!this.connected) {
            this.connected = true;
            obj.connected = this.connected;
            newData = true;
        }
        // Start timeout to detect disconnect
        this.clearTimer(this.timeout);
        if (this.hub.protoMajor(this.ip) === '2') {
            // Protocol 2.0.x said cannot receive heartbeat longer than 65s means device offline.
            // In case of network issue. set heartbeat timeout to 130s
            this.timeout = this.setTimer(() => {
                this.timeout = null;
                this.hub.emit('data', this.sid, this.type, { connected: false });
            }, 130000);
        } else {
            this.timeout = this.setTimer(() => {
                this.timeout = null;
                this.hub.emit('data', this.sid, this.type, { connected: false });
            }, 20000);
        }
        if (data.rgb !== undefined) {
            const rgbNumber = parseInt(data.rgb as string, 10);
            if (!rgbNumber) {
                this.rgb = '#000000';
                this.dimmer = 0;
                this.on = false;
            } else {
                let rgb = rgbNumber.toString(16);
                if (rgb.length === 7) {
                    rgb = `0${rgb}`;
                } else if (rgb.length === 6) {
                    rgb = `00${rgb}`;
                } else if (rgb.length === 5) {
                    rgb = `000${rgb}`;
                } else if (rgb.length === 4) {
                    rgb = `0000${rgb}`;
                } else if (rgb.length === 3) {
                    rgb = `00000${rgb}`;
                } else if (rgb.length === 2) {
                    rgb = `000000${rgb}`;
                } else if (rgb.length === 1) {
                    rgb = `0000000${rgb}`;
                }
                this.dimmer = parseInt(rgb.substring(0, 2), 16);
                this.rgb = `#${rgb.substring(2).toUpperCase()}`;
                this.on = true;
            }
            obj.on = this.on;
            obj.dimmer = this.dimmer;
            obj.rgb = this.rgb;

            // remember last non null values
            if (this.dimmer) {
                this.lastValues.dimmer = this.dimmer;
            }
            if (parseInt(this.rgb.replace('#', ''), 16)) {
                this.lastValues.rgb = this.rgb;
            }
            newData = true;
        }
        return newData ? obj : null;
    }

    public override heartBeat(token?: string, data?: RawData): void {
        if (token) {
            this.token = token;
            const obj = this.getData(data);
            if (obj) {
                this.hub.emit('data', this.sid, this.className, obj);
            }
        }
    }

    public override onMessage(message: HubMessage): void {
        if (message.cmd === 'get_id_list_ack') {
            this.initSensors((message.data as string[]) || []);
        } else if (message.cmd === 'write_ack') {
            const data = Sensor.asRawData(message.data);
            if (data?.error) {
                this.hub.emit('error', data.error as string);
            }
            const obj_ = this.getData(data ?? undefined);
            if (obj_) {
                this.hub.emit('data', this.sid, this.className, obj_);
            }
        } else if (message.data) {
            const obj = this.getData(Sensor.asRawData(message.data) ?? undefined);
            if (obj) {
                this.hub.emit('data', this.sid, this.className, obj);
            }
        }
    }

    public Control(attr: string, value: ioBroker.StateValue): void {
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
                this.dimmer = value as number;
                if (this.dimmer < 0) {
                    this.dimmer = 0;
                } else if (this.dimmer > 100) {
                    this.dimmer = 100;
                }

                if (this.dimmer) {
                    this.on = true;

                    if (!parseInt(this.rgb.replace('#', ''), 16)) {
                        this.rgb = this.lastValues.rgb;
                    }
                }
            }

            if (attr === 'rgb') {
                this.rgb = (value || '').toString();

                if (parseInt(this.rgb.replace('#', ''), 16)) {
                    this.on = true;

                    if (!this.dimmer) {
                        this.dimmer = this.lastValues.dimmer;
                    }
                }
            }

            this.clearTimer(this.timer);

            // collect data before send
            this.timer = this.setTimer(() => {
                this.timer = null;
                let rgbValue: number;
                if (!this.on || !this.dimmer || this.rgb === '000000' || this.rgb === '#000000') {
                    rgbValue = 0;
                } else {
                    rgbValue = (this.dimmer << 24) | parseInt((this.rgb || '').replace('#', ''), 16);
                }

                this.sendWrite({ rgb: rgbValue });
            }, 200);
        } else if (attr === 'volume') {
            let volume = value as number;
            if (volume < 0) {
                volume = 0;
            }
            if (volume > 100) {
                volume = 100;
            }

            this.sendWrite({ mid: this.mid || 999, vol: volume });
        } else if (attr === 'mid') {
            this.mid = value;
            this.sendWrite({ mid: value });
            // New states for acpartner------------------------
        } else if (attr === 'on_off_cfg') {
            this.sendWrite({ on_off_cfg: value });
        } else if (attr === 'mode_cfg') {
            this.sendWrite({ mode_cfg: value });
        } else if (attr === 'ws_cfg') {
            this.sendWrite({ ws_cfg: value });
        } else if (attr === 'swing_cfg') {
            this.sendWrite({ swing_cfg: value });
        } else if (attr === 'temp_cfg') {
            this.sendWrite({ temp_cfg: parseInt(value as string, 10) });
        } else if (attr === 'relay_status') {
            this.sendWrite({ relay_status: value });
        } else if (attr === 'remove_device') {
            // remove subdevice sid = xxxxxxxx
            this.sendWrite({ remove_device: value });
        } else if (attr === 'join_permission') {
            // add subdevice yes/no
            this.sendWrite({ join_permission: value });
        } else {
            this.hub.emit('warning', `Unknown attribute ${attr}`);
        }
    }

    public initSensors(sids: string[]): void {
        this.hub.sendMessage({ cmd: 'read', sid: this.sid }, this.ip);
        for (let i = 0; i < sids.length; i++) {
            this.hub.sendMessage({ cmd: 'read', sid: sids[i] }, this.ip);
        }
    }

    /** Send a `write` command with the given values and the current key of the gateway */
    private sendWrite(data: RawData): void {
        const message: HubCommand = {
            cmd: 'write',
            model: this.type,
            sid: this.sid,
            short_id: 0,
            data: {
                ...data,
                key: this.hub.getKey(this.ip),
            },
        };

        this.hub.sendMessage(message, this.ip);
    }
}
