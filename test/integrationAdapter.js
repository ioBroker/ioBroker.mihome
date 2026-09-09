'use strict';

const path = require('node:path');
const assert = require('node:assert');
const { tests } = require('@iobroker/testing');

const GatewaySimulator = require('./lib/gateway');

/** Values that the devices of the gateway simulator must produce */
const expectedStates = {
    'mihome.0.devices.gateway_81726387164871.illumination': 1180,
    'mihome.0.devices.gateway_81726387164871.on': false,
    'mihome.0.devices.gateway_81726387164871.dimmer': 0,
    'mihome.0.devices.gateway_81726387164871.rgb': '#000000',
    'mihome.0.devices.86sw2_1234567abeefc.channel_1': false,
    'mihome.0.devices.86sw2_1234567abeefc.channel_1_double': false,
    'mihome.0.devices.86sw2_1234567abeefc.dual_channel': false,
    'mihome.0.devices.weather_v1_1652761251244.temperature': 20.3,
    'mihome.0.devices.weather_v1_1652761251244.humidity': 66.06,
    'mihome.0.devices.weather_v1_1652761251244.pressure': 1001.2,
    'mihome.0.devices.cube_287658275634875.voltage': 2.8,
    'mihome.0.devices.cube_287658275634875.percent': 42,
    'mihome.0.devices.cube_287658275634875.rotate': 6.5,
    'mihome.0.devices.cube_287658275634875.rotate_position': 6.5,
    'mihome.0.devices.cube_287658275634875.rotate_right': false,
    'mihome.0.devices.sensor_wleak_aq1_aaa000xxxxxxx.state': false,
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Wait until the state has the expected value */
async function waitForState(harness, id, expected, timeout = 20000) {
    const until = Date.now() + timeout;
    let state = null;
    do {
        state = await harness.states.getState(id);
        if (state && state.val === expected) {
            assert.strictEqual(state.ack, true, `${id} was not acknowledged`);
            return;
        }
        await delay(200);
    } while (Date.now() < until);

    assert.fail(`${id} is ${state ? JSON.stringify(state.val) : 'not existing'} instead of ${JSON.stringify(expected)}`);
}

tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Test with a simulated gateway', getHarness => {
            /** @type {GatewaySimulator | null} */
            let gw = null;

            after(() => {
                if (gw) {
                    gw.destroy();
                    gw = null;
                }
            });

            it('must create the states of the devices behind the gateway', async function () {
                this.timeout(120000);
                const harness = getHarness();

                await harness.changeAdapterConfig('mihome', {
                    native: { key: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' },
                });

                gw = new GatewaySimulator();
                gw.init();

                await harness.startAdapterAndWait();

                await waitForState(harness, 'mihome.0.info.connection', true, 30000);

                for (const [id, val] of Object.entries(expectedStates)) {
                    await waitForState(harness, id, val);
                }
            });

            it('must detect that the gateway is gone', async function () {
                this.timeout(120000);
                const harness = getHarness();

                gw.destroy();
                gw = null;

                // the adapter waits `heartbeatTimeout` (20 s by default) for the next packet
                await waitForState(harness, 'mihome.0.info.connection', false, 60000);
            });
        });
    },
});
