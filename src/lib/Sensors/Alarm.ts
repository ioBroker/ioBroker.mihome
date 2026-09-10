import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

const texts: Record<number, string> = {
    0: 'Release alarm',
    1: 'Gas alarm',
    2: 'Analog alarm',
    64: 'Sensitivity fault alarm',
    32768: 'I2C communication failure',
};

export class Alarm extends Sensor {
    private state: boolean | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, model);
    }

    public getData(data: RawData, isHeartbeat?: boolean): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};

        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }
        if (data.alarm !== undefined && !isHeartbeat) {
            if (data.alarm !== true && data.alarm !== false) {
                const alarm = parseInt(data.alarm as string, 10) || 0;
                if (alarm === 1) {
                    data.description = this.type === 'smoke' ? 'Smoke alarm' : 'Gas alarm';
                } else {
                    data.description = texts[alarm] || '';
                }
                data.alarm = alarm === 1 || alarm === 2;
            }

            this.state = data.alarm;
            obj.state = data.alarm;
            // the gateway sends the description only together with a numeric alarm value
            obj.description = (data.description as string) ?? null;
            newData = true;
        }

        return newData ? obj : null;
    }
}
