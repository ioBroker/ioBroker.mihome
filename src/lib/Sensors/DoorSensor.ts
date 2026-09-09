import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class DoorSensor extends Sensor {
    private opened: boolean | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, 'magnet');
    }

    public getData(data: RawData, isHeartbeat?: boolean): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }
        // Protocol 2.0.x support
        if (data.window_status && data.window_status !== 'unknown' && !isHeartbeat) {
            this.opened = data.window_status !== 'close';
            obj.state = this.opened;
            newData = true;
        }
        if (data.status && data.status !== 'unknown' && !isHeartbeat) {
            this.opened = data.status !== 'close';
            obj.state = this.opened;
            newData = true;
        }

        return newData ? obj : null;
    }
}
