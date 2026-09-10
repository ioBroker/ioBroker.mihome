import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class VibrationSensor extends Sensor {
    private vibration: boolean | null = null;
    private orientationX: number | null = null;
    private orientationY: number | null = null;
    private orientationZ: number | null = null;
    private bed_activity: number | null = null;
    private tilt_angle: number | null = null;

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
            this.vibration = data.status === 'vibration' || data.status === 'vibrate';
            if (this.vibration) {
                this.emitReset('state');
            }

            obj.state = this.vibration;
            newData = true;
        }
        if (data.final_tilt_angle !== undefined) {
            this.tilt_angle = parseInt(data.final_tilt_angle as string, 10);
            obj.tilt_angle = this.tilt_angle;
            newData = true;
        }
        if (data.coordination !== undefined) {
            const parts = (data.coordination as string).split(',').map(num => parseInt(num.trim(), 10));
            this.orientationX = parts[0];
            this.orientationY = parts[1];
            this.orientationZ = parts[2];
            obj.orientationX = this.orientationX;
            obj.orientationY = this.orientationY;
            obj.orientationZ = this.orientationZ;
            newData = true;
        }
        if (data.bed_activity !== undefined) {
            this.bed_activity = parseInt(data.bed_activity as string, 10);
            obj.bed_activity = this.bed_activity;
            newData = true;
        }
        return newData ? obj : null;
    }
}
