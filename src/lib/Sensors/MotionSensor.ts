import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class MotionSensor extends Sensor {
    private motion: boolean | null = null;
    private no_motion: number | null = null;
    private lux: number | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, model);
    }

    public getData(data: RawData, isHeartbeat?: boolean): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }
        if (data.status && !isHeartbeat) {
            this.motion = data.status === 'motion';
            obj.state = this.motion;
            if (this.motion) {
                this.no_motion = 0;
                obj.no_motion = 0;
            }
            newData = true;
        }
        // Protocol 2.0.x support
        if (data.motion_status && !isHeartbeat) {
            this.motion = data.motion_status === 'motion';
            obj.state = this.motion;
            if (this.motion) {
                this.no_motion = 0;
                obj.no_motion = 0;
            }
            newData = true;
        }
        if (data.no_motion !== undefined && !isHeartbeat) {
            this.no_motion = parseInt(data.no_motion as string, 10);
            obj.no_motion = this.no_motion;
            obj.state = !this.no_motion;
            newData = true;
        }
        if (data.lux !== undefined) {
            this.lux = parseInt(data.lux as string, 10);
            obj.lux = this.lux;
            newData = true;
        }
        return newData ? obj : null;
    }
}
