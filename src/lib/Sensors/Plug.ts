import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { HubCommand, RawData, SensorStates } from '../types';

// {"cmd":"report","model":"plug","sid":"dfdfd","short_id":52239,"data":{"status":"on"}}
// {"cmd":"report","model":"plug","sid":"dfdfdf","short_id":52239,"data":{"status":"off"}}
// {"cmd":"heartbeat","model":"plug","sid":"fdfdfd","short_id":52239,"data":{"voltage":3600,"status":"on","inuse":"0","power_consumed":"26326","load_power":"0.00"}}
export class Plug extends Sensor {
    private load_power: number | null = null;
    private power_consumed: number | null = null;
    private state: boolean | null = null;
    private inuse: boolean | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, 'plug');
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.load_power) {
            this.load_power = parseFloat(data.load_power as string);
            obj.load_power = this.load_power;
            newData = true;
        }
        if (data.power_consumed) {
            this.power_consumed = parseFloat(data.power_consumed as string);
            obj.power_consumed = this.power_consumed;
            newData = true;
        }
        if (data.inuse) {
            this.inuse = !!parseInt(data.inuse as string, 10);
            obj.inuse = this.inuse;
            newData = true;
        }
        if (data.status) {
            this.state = data.status === 'on';
            obj.state = this.state;
            newData = true;
        }
        // Protocol 2.0.x support
        if (data.channel_0) {
            this.state = data.channel_0 === 'on';
            obj.state = this.state;
            newData = true;
        }

        return newData ? obj : null;
    }

    public Control(attr: string, value: ioBroker.StateValue): void {
        if (attr !== 'channel_0' && attr !== 'state') {
            this.hub.emit('warning', `Unknown attribute ${attr}`);
            return;
        }

        const message: HubCommand = {
            cmd: 'write',
            model: this.type,
            sid: this.sid,
            short_id: 0,
            data: {
                channel_0: value ? 'on' : 'off',
                key: this.hub.getKey(this.ip),
            },
        };

        this.hub.sendMessage(message, this.ip);
    }
}
