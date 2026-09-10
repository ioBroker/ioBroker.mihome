import { Sensor } from './Sensor';
import type { Hub } from '../Hub';
import type { RawData, SensorStates } from '../types';

// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"voltage":3387}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"fing_verified": 65536}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"fing_verified": 65537}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"psw_verified": 131074}'}
// {'cmd': 'read_ack', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"card_verified": 196608}'}
// {'cmd': 'report', 'model': 'lock.aq1', 'sid': '158d000222****', 'short_id': 55***, 'data': '{"verified_wrong":"3"}'}
export class Lock extends Sensor {
    private fing_verified: number | null = null;
    private psw_verified: number | null = null;
    private card_verified: number | null = null;
    private verified_wrong: number | null = null;

    constructor(sid: string, ip: string, hub: Hub, model: string) {
        super(sid, ip, hub, model, model);
    }

    public getData(data: RawData): SensorStates | null {
        let newData = false;
        const obj: SensorStates = {};
        if (data.voltage !== undefined) {
            newData = this.parseVoltage(data, obj);
        }
        if (data.fing_verified) {
            this.fing_verified = parseInt(data.fing_verified as string, 10);
            obj.fing_verified = this.fing_verified;
            newData = true;
        }
        if (data.psw_verified) {
            this.psw_verified = parseInt(data.psw_verified as string, 10);
            obj.psw_verified = this.psw_verified;
            newData = true;
        }
        if (data.card_verified) {
            this.card_verified = parseInt(data.card_verified as string, 10);
            obj.card_verified = this.card_verified;
            newData = true;
        }
        if (data.verified_wrong) {
            this.verified_wrong = parseInt(data.verified_wrong as string, 10);
            obj.verified_wrong = this.verified_wrong;
            newData = true;
        }

        return newData ? obj : null;
    }
}
