/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var GW     = require(__dirname + '/lib/gateway');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;
var sendToID = 1;
var gw;

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.') + 1);
var runningMode = require(__dirname + '/../io-package.json').common.mode;

var checkStates = {
    "mihome.0.devices.gateway_81726387164871.illumination": {
        "val": 1180,
        "ack": true,
        "ts": 1509870303537,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303537
    },
    "mihome.0.devices.gateway_81726387164871.on": {
        "val": false,
        "ack": true,
        "ts": 1509870303539,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303539
    },
    "mihome.0.devices.gateway_81726387164871.dimmer": {
        "val": 0,
        "ack": true,
        "ts": 1509870303539,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303539
    },
    "mihome.0.devices.gateway_81726387164871.rgb": {
        "val": "#000000",
        "ack": true,
        "ts": 1509870303539,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303539
    },
    "mihome.0.devices.86sw2_1234567abeefc.channel_1": {
        "val": false,
        "ack": true,
        "ts": 1509870303830,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303830
    },
    "mihome.0.devices.86sw2_1234567abeefc.dual_channel": {
        "val": false,
        "ack": true,
        "ts": 1509870303831,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303831
    },
    "mihome.0.devices.86sw2_1234567abeefc.channel_1_double": {
        "val": false,
        "ack": true,
        "ts": 1509870303574,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303574
    },
    "mihome.0.devices.weather_v1_1652761251244.temperature": {
        "val": 20.3,
        "ack": true,
        "ts": 1509870303587,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303587
    },
    "mihome.0.devices.weather_v1_1652761251244.humidity": {
        "val": 66.06,
        "ack": true,
        "ts": 1509870303590,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303590
    },
    "mihome.0.devices.weather_v1_1652761251244.pressure": {
        "val": 1001.2,
        "ack": true,
        "ts": 1509870303593,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303593
    },
    "mihome.0.devices.cube_287658275634875.voltage": {
        "val": 3.025,
        "ack": true,
        "ts": 1509870303600,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303600
    },
    "mihome.0.devices.cube_287658275634875.percent": {
        "val": 67.9,
        "ack": true,
        "ts": 1509870303603,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303603
    },
    "mihome.0.devices.cube_287658275634875.rotate": {
        "val": 6.5,
        "ack": true,
        "ts": 1509870303605,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303605
    },
    "mihome.0.devices.cube_287658275634875.rotate_position": {
        "val": 6.5,
        "ack": true,
        "ts": 1509870303607,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303607
    },
    "mihome.0.devices.cube_287658275634875.rotate_right": {
        "val": false,
        "ack": true,
        "ts": 1509870303835,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303835
    },
    "mihome.0.devices.sensor_wleak_aq1_aaa000xxxxxxx.state": {
        "val": false,
        "ack": true,
        "ts": 1509870303649,
        "q": 0,
        "from": "system.adapter.mihome.0",
        "lc": 1509870303649
    }
};

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.' + adapterShortName + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        if (cb) cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            if (cb) cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = function (id, state) {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage('system.adapter.' + target, {
        command:    command,
        message:    message,
        from:       'system.adapter.test.0',
        callback: {
            message: message,
            id:      sendToID++,
            ack:     false,
            time:    (new Date()).getTime()
        }
    });
}

describe('Test ' + adapterShortName + ' adapter', function() {
    before('Test ' + adapterShortName + ' adapter: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled = true;
            config.common.loglevel = 'debug';
            config.native.key = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

            //config.native.dbtype   = 'sqlite';

            setup.setAdapterConfig(config.common, config.native);

            setup.startController(true, function (id, obj) {
                }, function (id, state) {
                    if (onStateChanged) onStateChanged(id, state);
                },
                function (_objects, _states) {
                    objects = _objects;
                    states = _states;
                    gw = new GW();
                    gw.init();
                    _done();
                });
        });
    });

    it('Test ' + adapterShortName + ' instance object: it must exists', function (done) {
        objects.getObject('system.adapter.' + adapterShortName + '.0', function (err, obj) {
            expect(err).to.be.null;
            expect(obj).to.be.an('object');
            expect(obj).not.to.be.null;
            done();
        });
    });

    it('Test ' + adapterShortName + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(function (res) {
            if (res) console.log(res);
            if (runningMode === 'daemon') {
                expect(res).not.to.be.equal('Cannot check connection');
            } else {
                //??
            }
            done();
        });
    });

    it('Test ' + adapterShortName + ' adapter: must connect', function (done) {
        this.timeout(5000);
        setTimeout(function () {
            states.getState(adapterShortName + '.0.info.connection', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.equal(true);
                done();
            });
        }, 3000);
    });

    it('Test ' + adapterShortName + ' adapter: states must exist', function (done) {
        this.timeout(5000);
        var cnt = 0;
        for (var __id in checkStates) {
            if (checkStates.hasOwnProperty(__id)) cnt++;
        }
        for (var id in checkStates) {
            if (!checkStates.hasOwnProperty(id)) continue;
            (function (_id, checkState) {
                states.getState(_id, function (err, state) {
                    expect(err).to.be.not.ok;
                    if (!state) {
                        console.error('cannot find ' + _id);
                    }
                    expect(state.val).to.be.equal(checkState.val);
                    expect(state.ack).to.be.equal(checkState.ack);
                    console.log('Check ' + _id);
                    if (!--cnt) {
                        done();
                    }
                });
            })(id, checkStates[id]);
        }
    });
    /*
    it('Test ' + adapterShortName + ' adapter: control should work', (done) => {
        states.setState('mihome.0.devices.gateway_81726387164871.on', true, err => {
            expect(err).to.be.not.ok;
        });
    }).timeout(5000);
*/
    it('Test ' + adapterShortName + ' adapter: detect disconnect', function (done) {
        this.timeout(30000);
        gw.destroy();
        setTimeout(function () {
            states.getState(adapterShortName + '.0.info.connection', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state.val).to.be.equal(false);
                done();
            });
        }, 21000);
    });

    after('Test ' + adapterShortName + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);
        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
