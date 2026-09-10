import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class Button extends Sensor {
    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, 'switch');
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.voltage) {
            newData = this.parseVoltage(data, obj);
        }
        if (data.status) {
            if (data.status === 'click') {
                obj.click = true;

                this.emitReset('click');
            }
            if (data.status === 'double_click') {
                obj.double = true;

                this.emitReset('double');
            }
            if (data.status === 'long_click_press') {
                obj.long = true;
            }
            if (data.status === 'long_click_release') {
                obj.long = false;
            }
            newData = true;
        }
        // Protocol 2.0.x support
        if (data.channel_0) {
            if (data.channel_0 === 'click') {
                obj.click = true;

                this.emitReset('click');
            }
            if (data.channel_0 === 'double_click') {
                obj.double = true;

                this.emitReset('double');
            }
            if (data.channel_0 === 'long_click_press') {
                obj.long = true;
            }
            if (data.channel_0 === 'long_click_release') {
                obj.long = false;
            }
            newData = true;
        }

        return newData ? obj : null;
    }
}
