import type { Hub } from './Hub';
import type { Sensor } from './Sensors/Sensor';

/** A single value as it is delivered by the gateway. Numbers are often transmitted as strings. */
export type RawValue = string | number | boolean | null | undefined;

/** The `data` object of a gateway message: attribute name => value */
export interface RawData {
    [attr: string]: RawValue;
}

/** Values that are written into the ioBroker states */
export type SensorStates = Record<string, ioBroker.StateValue>;

/** Message as it is received from the gateway */
export interface HubMessage {
    cmd: string;
    sid: string;
    model?: string;
    short_id?: number;
    token?: string;
    /**
     * The values of the device: an object, a JSON string with the object
     * or - for `get_id_list_ack` - the list of the sids known by the gateway
     */
    data?: RawData | string | string[] | null;
    /** Protocol 2.0.x delivers the values as a list of single attribute objects */
    params?: RawData[];
    proto_version?: string;
    /** Device list of the `discovery_rsp` answer of protocol 2.0.x */
    dev_list?: { sid: string }[];
    name?: string;
}

/** Message that is sent to the gateway */
export interface HubCommand {
    cmd: string;
    sid: string;
    model?: string;
    short_id?: number;
    data?: RawData;
    /** Filled by `Hub.sendMessage` for protocol 2.0.x */
    params?: RawData[];
    /** Filled by `Hub.sendMessage` for protocol 2.0.x */
    key?: RawValue;
}

/** Options of the `Hub` class. They come from the adapter configuration. */
export interface HubOptions {
    port?: number | string;
    bind?: string;
    /** Default gateway key, used for all gateways without an own key */
    key?: string;
    /** Gateway keys per IP address */
    keys?: { ip: string; key: string }[];
    /** Models for devices that do not report their model name */
    sids?: { sid: string; model: string }[];
    /** Interval in ms in which a second press is detected as double press */
    interval?: number | string;
    /** Only search for gateways and emit `browse` events */
    browse?: boolean;
}

/** Events emitted by the `Hub` */
export interface HubEvents {
    message: [message: HubMessage];
    warning: [text: string];
    debug: [text: string];
    error: [error: Error | string];
    device: [sensor: Sensor, name?: string];
    data: [sid: string, type: string, data: SensorStates];
    browse: [info: { ip: string }];
}

export type SensorConstructor = new (sid: string, ip: string, hub: Hub, model: string, options?: HubOptions) => Sensor;

/**
 * One entry of the supported devices list.
 * `type` is the model name as delivered by the gateway, `states` the objects that will be created for it.
 */
export interface DeviceDefinition {
    type: string;
    fullName: string;
    ClassName: SensorConstructor;
    states: Record<string, ioBroker.StateCommon>;
}
