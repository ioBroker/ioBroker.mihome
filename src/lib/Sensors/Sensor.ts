import type { Hub } from '../Hub';
import type { HubMessage, RawData, SensorStates } from '../types';

/**
 * `Control` is only implemented by the devices that can be controlled.
 * It is declared here so that the subclasses can define it as a normal method.
 */
export interface Sensor {
    Control?(attr: string, value: ioBroker.StateValue): void;
}

/**
 * Base class of all devices that are connected to a gateway.
 *
 * A sensor converts the raw values of the gateway protocol into ioBroker states (`getData`)
 * and - if it can be controlled - the other way round (`Control`).
 */
export abstract class Sensor {
    /** Model name as it is delivered by the gateway, e.g. `sensor_ht` */
    public readonly type: string;
    public readonly sid: string;
    public readonly ip: string;
    /** Name of the device class. It is a part of the object ID, so it must never change. */
    public readonly className: string;

    protected readonly hub: Hub;

    public voltage: number | null = null;
    public percent: number | null = null;

    /** All running timers of this sensor, so that they can be stopped in `destroy` */
    private readonly timers = new Set<NodeJS.Timeout>();

    protected constructor(sid: string, ip: string, hub: Hub, type: string, className: string) {
        this.sid = sid;
        this.ip = ip;
        this.hub = hub;
        this.type = type;
        this.className = className;
    }

    /**
     * Convert the values of a gateway message into ioBroker states.
     * Returns `null` if the message does not contain anything new.
     */
    public abstract getData(data: RawData, isHeartbeat?: boolean): SensorStates | null;

    public heartBeat(_token?: string, data?: RawData): void {
        if (data) {
            const obj = this.getData(data, true);
            if (obj) {
                this.hub.emit('data', this.sid, this.className, obj);
            }
        }
    }

    public onMessage(message: HubMessage): void {
        const data = Sensor.asRawData(message.data);
        if (data) {
            const obj = this.getData(data);
            if (obj) {
                this.hub.emit('data', this.sid, this.className, obj);
            }
        }
    }

    /** Stop all timers of this sensor */
    public destroy(): void {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
    }

    /** `setTimeout`, but the timer is stopped in `destroy` too */
    protected setTimer(cb: () => void, delay: number): NodeJS.Timeout {
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            cb();
        }, delay);
        this.timers.add(timer);
        return timer;
    }

    protected clearTimer(timer: NodeJS.Timeout | null): void {
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(timer);
        }
    }

    /** Set an attribute back to false after `delay` ms. Used for the button like states. */
    protected emitReset(attr: string, delay = 300): void {
        this.setTimer(() => this.hub.emit('data', this.sid, this.className, { [attr]: false }), delay);
    }

    /**
     * Battery voltage in mV => `voltage` in V and `percent`.
     * Returns false if the message did not contain a voltage.
     */
    protected parseVoltage(data: RawData, obj: SensorStates): boolean {
        const voltage = parseInt(data.voltage as string, 10);
        // the raw message is logged after the sensors have seen it, so keep the converted value in it
        data.voltage = voltage;
        this.voltage = voltage / 1000;
        this.percent = Math.round(((voltage - 2655) / 3.45) * 10) / 10;
        if (this.percent > 100) {
            this.percent = 100;
        }
        if (this.percent < 0) {
            this.percent = 0;
        }
        obj.voltage = this.voltage;
        obj.percent = this.percent;
        return true;
    }

    /** The `data` of a message is an object only for the value messages */
    protected static asRawData(data: HubMessage['data']): RawData | null {
        return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    }
}
