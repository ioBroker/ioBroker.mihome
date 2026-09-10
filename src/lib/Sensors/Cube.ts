import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

export class Cube extends Sensor {
    private rotate_position = 0;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, 'cube');
    }

    private trigger(obj: SensorStates, name: string): void {
        obj[name] = true;

        this.emitReset(name);
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.voltage) {
            newData = this.parseVoltage(data, obj);
        }

        if (data.status) {
            // flip90, flip180, move, tap_twice, shake_air, swing, alert, free_fall, rotate_left, rotate_right
            this.trigger(obj, data.status as string);
            newData = true;
        }
        if (data.rotate) {
            // rotate
            const rotate = parseFloat((data.rotate as string).replace(',', '.')) || 0;
            obj.rotate = rotate;
            if (rotate >= 0) {
                this.trigger(obj, 'rotate_right');
            } else if (rotate < 0) {
                this.trigger(obj, 'rotate_left');
            }
            this.rotate_position += rotate;
            if (this.rotate_position < 0) {
                this.rotate_position = 0;
            }
            if (this.rotate_position > 100) {
                this.rotate_position = 100;
            }
            obj.rotate_position = this.rotate_position;

            newData = true;
        }

        return newData ? obj : null;
    }

    public Control(attr: string, value: ioBroker.StateValue): void {
        if (attr === 'rotate_position') {
            let val = parseFloat(value as string);
            if (val < 0) {
                val = 0;
            }
            if (val > 100) {
                val = 100;
            }

            if (this.rotate_position !== val) {
                this.hub.emit('data', this.sid, this.className, { rotate_position: this.rotate_position });
            }
        }
    }
}
