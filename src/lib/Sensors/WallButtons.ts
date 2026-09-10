import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class WallButtons extends Sensor {
    private channel_0: boolean | null = null;
    private channel_1: boolean | null = null;
    private dual_channel: boolean | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, model);
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};

        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }

        if (data.channel_0) {
            obj.channel_0_double = data.channel_0 === 'double_click';
            obj.channel_0_long = data.channel_0 === 'long_click';
            this.channel_0 = data.channel_0 === 'click';
            obj.channel_0 = this.channel_0;
            newData = true;
            if (obj.channel_0) {
                this.emitReset('channel_0');
            }
            if (obj.channel_0_double) {
                this.emitReset('channel_0_double');
            }
            if (obj.channel_0_long) {
                this.emitReset('channel_0_long');
            }
        }

        if (data.channel_1) {
            obj.channel_1_double = data.channel_1 === 'double_click';
            obj.channel_1_long = data.channel_1 === 'long_click';
            this.channel_1 = data.channel_1 === 'click';
            obj.channel_1 = this.channel_1;
            newData = true;
            if (obj.channel_1) {
                this.emitReset('channel_1');
            }
            if (obj.channel_1_double) {
                this.emitReset('channel_1_double');
            }
            if (obj.channel_1_long) {
                this.emitReset('channel_1_long');
            }
        }
        if (data.dual_channel) {
            this.dual_channel = data.dual_channel === 'both_click';
            obj.dual_channel = this.dual_channel;
            newData = true;
            if (obj.dual_channel) {
                this.emitReset('dual_channel');
            }
        }
        return newData ? obj : null;
    }
}
