import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { HubCommand, RawData, SensorStates } from '../types';

export class Relay extends Sensor {
    private channel_0: boolean | null = null;
    private channel_1: boolean | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, model);
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};

        if (data.channel_0) {
            this.channel_0 = data.channel_0 === 'on';
            obj.channel_0 = this.channel_0;
            newData = true;
        }
        if (data.channel_1) {
            this.channel_1 = data.channel_1 === 'on';
            obj.channel_1 = this.channel_1;
            newData = true;
        }

        return newData ? obj : null;
    }

    public Control(attr: string, value: ioBroker.StateValue): void {
        if (attr !== 'channel_0' && attr !== 'channel_1') {
            this.hub.emit('warning', `Unknown attribute ${attr}`);
            return;
        }

        const data: RawData = {
            key: this.hub.getKey(this.ip),
        };
        data[attr] = value ? 'on' : 'off';

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
