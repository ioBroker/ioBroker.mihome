// Augments the globally declared ioBroker types with everything this adapter adds.
// The attributes of `AdapterConfig` must be kept in sync with `native` in io-package.json
// and with admin/jsonConfig.json.

declare global {
    namespace ioBroker {
        interface AdapterConfig {
            /** IP address of the interface the adapter listens on, `0.0.0.0` for all */
            bind: string;
            /** UDP port of the gateway communication */
            port: number;
            /** Default key of all gateways that have no own key */
            key: string;
            /** Keys of the single gateways */
            keys: { ip: string; key: string }[];
            /** Models for devices that do not report their model name */
            sids: { sid: string; model: string }[];
            /** Interval in ms in which a second press is reported as double press */
            interval: number;
            /** Time in ms without any packet after which the gateway counts as disconnected */
            heartbeatTimeout: number;
            /** Time in ms after which the connection is established again */
            restartInterval: number;
            /** Show the pressure in mmHg instead of hPa */
            mmHg: boolean;
        }
    }
}

// this is required so the above is treated as a module
export {};
