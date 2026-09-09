import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { HubCommand, RawData, SensorStates } from '../types';

export class Curtain extends Sensor {
    private curtain_level: number | null = null;
    /**
     * Never assigned - see `getData`.
     * Kept to preserve the behavior of the JavaScript version.
     */
    private readonly status: string | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, 'curtain');
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (typeof data.curtain_level !== 'undefined') {
            this.curtain_level = parseFloat(data.curtain_level as string);
            obj.curtain_level = this.curtain_level;
            newData = true;
        }
        if (data.status) {
            // BUG (kept 1:1 from the JavaScript version): `this.status` is never set, so the
            // status of the message is never evaluated here and only the warning is emitted.
            if (this.status === 'open') {
                obj.open = true;
                newData = true;
            } else if (this.status === 'close') {
                obj.close = true;
                newData = true;
            } else if (this.status === 'stop') {
                obj.stop = true;
                newData = true;
            } else {
                this.hub.emit('warning', `Unknown status "${this.status}"`);
            }
        }

        return newData ? obj : null;
    }

    public Control(attr: string, value: ioBroker.StateValue): void {
        let data: RawData;
        if (attr === 'stop' || attr === 'open' || attr === 'close') {
            data = {
                status: attr,
                key: this.hub.getKey(this.ip),
            };
            if (this.hub.protoMajor(this.ip) === '2') {
                data.curtain_status = attr;
                delete data.status;
            }
        } else if (attr === 'curtain_level') {
            data = {
                curtain_level: value?.toString(), // Strange thing, working only if string.
                key: this.hub.getKey(this.ip),
            };
            if (this.hub.protoMajor(this.ip) === '2') {
                data.curtain_level = value;
            }
        } else {
            this.hub.emit('warning', `Unknown control attribute "${attr}"`);
            return;
        }

        const message: HubCommand = {
            cmd: 'write',
            model: this.type,
            sid: this.sid,
            short_id: 0,
            data,
        };

        this.hub.sendMessage(message, this.ip);
    }
}
