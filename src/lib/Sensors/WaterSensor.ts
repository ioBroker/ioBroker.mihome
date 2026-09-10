import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class WaterSensor extends Sensor {
    private leak: boolean | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, model);
    }

    // {"cmd":"report","model":"sensor_wleak.aq1","sid":"aaa000xxxxxxx","short_id":12345,"data":"{"status":"leak"}"}
    // {"cmd":"report","model":"sensor_wleak.aq1","sid":"aaa000xxxxxxx","short_id":12345,"data":"{"status":"no_leak"}"}
    public getData(data: RawData, isHeartbeat?: boolean): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }
        if (data.status && !isHeartbeat) {
            this.leak = data.status === 'leak';
            obj.state = this.leak;
            newData = true;
        }
        // Protocol 2.0.x support
        if (data.wleak_alarm && !isHeartbeat) {
            this.leak = data.wleak_alarm === 'leak';
            obj.state = this.leak;
            newData = true;
        }
        return newData ? obj : null;
    }
}
