import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { HubOptions, RawData, SensorStates } from '../types';

export class THSensor extends Sensor {
    /** Interval in ms in which a second press is reported as double press */
    private readonly interval: number;
    private temperature: number | null = null;
    private humidity: number | null = null;
    private pressure: number | null = null;
    private lastData: number | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string, options?: HubOptions) {
        super(sid, ip, hub, model, model);

        this.interval = parseInt((options?.interval as string) || '5000', 10) || 0;
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        const ts = Date.now();
        if (this.interval && this.lastData) {
            const diff = ts - this.lastData;
            if (diff > 200 && diff < this.interval) {
                obj.doublePress = true;
                // deactivate after 300 ms
                this.emitReset('doublePress');
                this.lastData = null;
            } else {
                this.lastData = ts;
            }
        } else {
            this.lastData = ts;
        }

        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }
        if (data.temperature === '10000' || data.temperature === 10000) {
            // ignore all values if 10000 as temperature.
            return null;
        }
        if (data.temperature !== undefined) {
            this.temperature = parseInt(data.temperature as string, 10) / 100;
            obj.temperature = this.temperature;
            newData = true;
        }

        if (data.humidity !== undefined) {
            this.humidity = parseInt(data.humidity as string, 10) / 100;
            obj.humidity = this.humidity;
            newData = true;
        }
        if (data.pressure !== undefined && data.pressure !== null && data.pressure !== 0 && data.pressure !== '0') {
            this.pressure = parseInt(data.pressure as string, 10) / 100;
            obj.pressure = this.pressure;
            newData = true;
        }
        return newData ? obj : null;
    }
}
