/**
 *      ioBroker MiHome
 *
 *      Copyright 2017-2018, bluefox <dogafox@gmail.com>
 *
 *      License: MIT
 */
'use strict';
const utils     = require(__dirname + '/lib/utils'); // Get common adapter utils
const MiHome    = require(__dirname + '/lib/mihome/Hub');
const adapter   = utils.Adapter('mihome');

let objects   = {};
let delayed   = {};
let connected = null;
let connTimeout;
let hub;
let reconnectTimeout;
let tasks = [];

adapter.on('ready', main);

adapter.on('stateChange', (id, state) => {
    if (!id || !state || state.ack) {
        return;
    }
    if (!objects[id]) {
        adapter.log.warn('Unknown ID: ' + id);
        return;
    }
    if (hub) {
        const pos = id.lastIndexOf('.');
        const channelId = id.substring(0, pos);
        const attr = id.substring(pos + 1);

        if (objects[channelId] && objects[channelId].native) {
            const device = hub.getSensor(objects[channelId].native.sid);
            if (device && device.Control) {
                device.Control(attr, state.val);
            } else {
                adapter.log.warn('Cannot control ' + id);
            }
        } else {
            adapter.log.warn('Invalid device: ' + id);
        }
    }
});

adapter.on('unload', callback => {
    if (hub) {
        try {
            hub.stop(callback);
        } catch (e) {
            console.error('Cannot stop: ' + e);
            callback && callback();
        }
    } else if (callback) {
        callback();
    }
});

adapter.on('message', obj => {
    if (obj) {
        switch (obj.command) {
            case 'browse':
                let browse = new MiHome({
                    port:     (obj.message.port || adapter.config.port) + 1,
                    bind:     obj.message.bind || '0.0.0.0',
                    browse:   true
                });
                let result = [];

                browse.on('browse', data => (result.indexOf(data.ip) === -1) && result.push(data.ip));

                browse.listen();
                setTimeout(() => {
                    browse.stop(() => {
                        browse = null;
                        if (obj.callback) adapter.sendTo(obj.from, obj.command, result, obj.callback);
                    });
                }, 3000);
                break;
        }
    }
});

function updateStates(sid, type, data) {
    const id = adapter.namespace + '.devices.' + type.replace('.', '_') + '_' + sid;

    for (const attr in data) {
        if (data.hasOwnProperty(attr)) {
            if (objects[id] || objects[id + '.' + attr]) {
                adapter.setForeignState(id + '.' + attr, data[attr], true);
            } else {
                delayed[id + '.' + attr] = data[attr];
            }
        }
    }
}

function getVoltageObjects(id, objs) {
    objs.push({
        _id: id + '.voltage',
        common: {
            name: 'Battery voltage',
            icon: '/icons/battery_v.png',
            desc: 'Battery voltage',
            role: 'battery.voltage',
            unit: 'V',
            write: false,
            read: true,
            type: 'number'
        },
        type: 'state',
        native: {}
    });
    objs.push({
        _id: id + '.percent',
        common: {
            name: 'Battery percent',
            icon: '/icons/battery_p.png',
            desc: 'Battery level in percent',
            role: 'battery.percent',
            unit: '%',
            write: false,
            read: true,
            type: 'number',
            min: 0,
            max: 100
        },
        type: 'state',
        native: {}
    });
}

function syncObjects(callback) {
    if (!tasks || !tasks.length) {
        callback && callback();
        return;
    }
    const obj = tasks.shift();
    adapter.getForeignObject(obj._id, (err, oObj) => {
        if (!oObj) {
            objects[obj._id] = obj;
            adapter.setForeignObject(obj._id, obj, () => {
                if (delayed[obj._id] !== undefined) {
                    adapter.setForeignState(obj._id, delayed[obj._id], true, () => {
                        delete delayed[obj._id];
                        setImmediate(syncObjects, callback);
                    })
                } else {
                    setImmediate(syncObjects, callback);
                }
            });
        } else {
            let changed = false;
            // merge info together
            for (const a in obj.common) {
                if (obj.common.hasOwnProperty(a) && a !== 'name' && oObj.common[a] !== obj.common[a]) {
                    changed = true;
                    oObj.common[a] = obj.common[a];
                }
            }
            if (JSON.stringify(obj.native) !== JSON.stringify(oObj.native)) {
                changed = true;
                oObj.native = obj.native;
            }

            objects[obj._id] = oObj;
            if (changed) {
                adapter.setForeignObject(oObj._id, oObj, () => {
                    if (delayed[oObj._id] !== undefined) {
                        adapter.setForeignState(oObj._id, delayed[oObj._id], true, () => {
                            delete delayed[oObj._id];
                            setImmediate(syncObjects, callback);
                        })
                    } else {
                        setImmediate(syncObjects, callback);
                    }
                });
            } else {
                if (delayed[oObj._id] !== undefined) {
                    adapter.setForeignState(oObj._id, delayed[oObj._id], true, () => {
                        delete delayed[oObj._id];
                        setImmediate(syncObjects, callback);
                    })
                } else {
                    // init rotate position with previous value
                    if (oObj._id.match(/\.rotate_position$/)) {
                        adapter.getForeignState(oObj._id, (err, state) => {
                            if (state) {
                                const pos       = oObj._id.lastIndexOf('.');
                                const channelId = oObj._id.substring(0, pos);

                                if (objects[channelId]) {
                                    const device = hub.getSensor(objects[channelId].native.sid);
                                    if (device && device.Control) {
                                        device.Control('rotate_position', state.val);
                                    }
                                }
                            }
                            setImmediate(syncObjects, callback);
                        });
                    } else {
                        setImmediate(syncObjects, callback);
                    }
                }
            }
        }
    });
}

const names = {
    'curtain':           'Xiaomi Aqara Smart Curtain',
    'gateway':           'Xiaomi RGB Gateway',
    'sensor_ht':         'Xiaomi Temperature/Humidity',
    'switch':            'Xiaomi Wireless Switch',
    'plug':              'Xiaomi Smart Plug',
    '86plug':            'Xiaomi Smart Wall Plug',
    '86sw2':             'Xiaomi Wireless Dual Wall Switch',
    '86sw1':             'Xiaomi Wireless Single Wall Switch',
    'ctrl_neutral2':     'Xiaomi Wired Dual Wall Switch',
    'ctrl_neutral1':     'Xiaomi Wired Single Wall Switch',
    'ctrl_86plug_aq1':   'Xiaomi Aqara Wall Socket',
    'cube':              'Xiaomi Cube',
    'lock.v1':           'Xiaomi Vima Smart Lock', // todo
    'remote.b286acn01':  'Xiaomi Aqara Wireless Remote Switch (Double Rocker)',
    'lock.aq1':          'Xiaomi Lock',
    'sensor_cube.aqgl01':'Xiaomi Cube 01',
    'magnet':            'Xiaomi Door Sensor',
    'motion':            'Xiaomi Motion Sensor',
    'weather.v1':        'Xiaomi Temperature/Humidity/Pressure',
    'sensor_switch.aq2': 'Xiaomi Wireless Switch Sensor',
    'sensor_switch.aq3': 'Xiaomi Wireless Switch Sensor',
    'natgas':            'Xiaomi Mijia Honeywell Gas Alarm Detector',
    'smoke':             'Xiaomi Mijia Honeywell Fire Alarm Detector',
    'ctrl_ln1':          'Xiaomi Aqara 86 Fire Wall Switch One Button',
    'ctrl_ln1.aq1':      'Xiaomi Aqara Wall Switch LN',
    'ctrl_ln2':          'Xiaomi 86 zero fire wall switch double key',
    'ctrl_ln2.aq1':      'Xiaomi Aqara Wall Switch LN double key',
    'sensor_magnet.aq2': 'Xiaomi Door Sensor',
    'sensor_motion.aq2': 'Xiaomi Motion Sensor',
    'sensor_wleak.aq1':  'Xiaomi Aqara Water Sensor',
    'vibration':         'Xiaomi Vibration Sensor'
};

function createDevice(device, name, callback) {
    const id = adapter.namespace + '.devices.' + device.type.replace('.', '_') + '_' + device.sid;
    switch (device.type) {
        case 'gateway':
            tasks.push({
                _id: id + '.illumination',
                common: {
                    name: 'Illumination',
                    role: 'value.lux',
                    unit: 'lux',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.rgb',
                common: {
                    name: 'RGB',
                    role: 'level.rgb',
                    write: true,
                    read: true,
                    type: 'string'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.on',
                common: {
                    name:  'Light',
                    role:  'switch',
                    write: true,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.dimmer',
                common: {
                    name: 'Light',
                    role: 'level.dimmer',
                    write: true,
                    read:  true,
                    unit:  '%',
                    min:   0,
                    max:   100,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.volume',
                common: {
                    name: 'Volume',
                    role: 'level.volume',
                    write: true,
                    read:  true,
                    unit:  '%',
                    min:   0,
                    max:   100,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.mid',
                common: {
                    name: 'Music ID',
                    desc: '10000 - stop, 10005 - custom ringtone',
                    role: 'state',
                    write: true,
                    read:  false,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.connected',
                common: {
                    name: 'Is gateway connected',
                    desc: 'Will be set to false if no packets received in 20 seconds',
                    role: 'indicator.reachable',
                    write: true,
                    read:  false,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });

            break;

        case 'sensor_ht':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.temperature',
                common: {
                    name: 'Temperature',
                    role: 'value.temperature',
                    unit: '°C',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.humidity',
                common: {
                    name: 'Humidity',
                    role: 'value.humidity',
                    unit: '%',
                    write: false,
                    read: true,
                    type: 'number',
                    min: 0,
                    max: 100
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.doublePress',
                common: {
                    name:  'Double press',
                    desc:  'You can press connect button twice',
                    role:  'state',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'weather.v1':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.temperature',
                common: {
                    name: 'Temperature',
                    role: 'value.temperature',
                    unit: '°C',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.humidity',
                common: {
                    name: 'Humidity',
                    role: 'value.humidity',
                    unit: '%',
                    write: false,
                    read: true,
                    type: 'number',
                    min: 0,
                    max: 100
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.pressure',
                common: {
                    name: 'Pressure',
                    role: 'value.pressure',
                    unit: 'Pa',
                    write: false,
                    read: true,
                    type: 'number',
                    min: 0,
                    max: 100
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.doublePress',
                common: {
                    name:  'Double press',
                    desc:  'You can press connect button twice',
                    role:  'state',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'magnet':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Is opened',
                    role: 'state',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'natgas':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Alarm state',
                    role: 'indicator.alarm.CO2',
                    write: false,
                    read:  true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.description',
                common: {
                    name: 'Alarm description',
                    role: 'state',
                    write: false,
                    read:  true,
                    type: 'string'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'smoke':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Alarm state',
                    role: 'indicator.alarm.fire',
                    write: false,
                    read:  true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.description',
                common: {
                    name: 'Alarm description',
                    role: 'state',
                    write: false,
                    read:  true,
                    type: 'string'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'motion':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Is motion',
                    role: 'indicator.motion',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.no_motion',
                common: {
                    name:  'Last motion',
                    desc:  'Last motion for at least X seconds',
                    role:  'state',
                    unit:  'seconds',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'vibration':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Is vibration',
                    role: 'indicator.vibration',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.tilt_angle',
                common: {
                    name:  'Tilt angle',
                    desc:  'Last tilt angle',
                    role:  'value',
                    unit:  '°',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.orientationX',
                common: {
                    name:  'Orientation X',
                    desc:  'Last X orientation',
                    role:  'value',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.orientationY',
                common: {
                    name:  'Orientation Y',
                    desc:  'Last Y orientation',
                    role:  'value',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.orientationZ',
                common: {
                    name:  'Orientation Z',
                    desc:  'Last Z orientation',
                    role:  'value',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.bed_activity',
                common: {
                    name:  'Bed activity',
                    desc:  'Last bed activity',
                    role:  'value',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'lock.v1':
        case 'lock.aq1':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.fing_verified',
                common: {
                    name: 'Finger verified',
                    role: 'value',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.psw_verified',
                common: {
                    name: 'Password verified',
                    role: 'value',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.card_verified',
                common: {
                    name: 'Card verified',
                    role: 'value',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.verified_wrong',
                common: {
                    name: 'Wrong verification',
                    role: 'value',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            break;


        case 'sensor_motion.aq2':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Is motion',
                    role: 'indicator.motion',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.no_motion',
                common: {
                    name:  'Last motion',
                    desc:  'Last motion for at least X seconds',
                    role:  'state',
                    unit:  'seconds',
                    write: false,
                    read:  true,
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.lux',
                common: {
                    name: 'Brightness',
                    role: 'indicator.brightness',
                    write: false,
                    read: true,
                    unit: 'lux',
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'sensor_wleak.aq1':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Is water detected',
                    role: 'indicator.leakage',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });

            break;

        case 'sensor_switch.aq2':
        case 'sensor_switch.aq3':
        case 'switch':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.click',
                common: {
                    name: 'Simple click',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.double',
                common: {
                    name: 'Double click',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.long',
                common: {
                    name: 'Long click',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case '86sw1':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.channel_0',
                common: {
                    name: 'Simple click',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.channel_0_double',
                common: {
                    name: 'Double click',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'remote.b286acn01':
        case '86sw2':
            getVoltageObjects(id, tasks);

            tasks.push({
                _id: id + '.channel_0',
                common: {
                    name: 'First button pressed',
                    role: 'button',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.channel_1',
                common: {
                    name: 'Second button pressed',
                    role: 'button',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.dual_channel',
                common: {
                    name: 'Both buttons pressed',
                    role: 'button',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.channel_0_double',
                common: {
                    name: 'First button pressed double',
                    role: 'button',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.channel_1_double',
                common: {
                    name: 'Second button pressed double',
                    role: 'button',
                    write: false,
                    read:  true,
                    type:  'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case '86plug':
        case 'ctrl_86plug_aq1':
        case 'plug':
            tasks.push({
                _id: id + '.state',
                common: {
                    name: 'Socket plug',
                    role: 'switch',
                    write: true,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.load_power',
                common: {
                    name: 'Load power',
                    role: 'value.power',
                    unit: 'W',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.power_consumed',
                common: {
                    name: 'Power consumed',
                    role: 'value.consumption',
                    unit: 'W',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.inuse',
                common: {
                    name: 'Is in use',
                    role: 'state',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'curtain':
            tasks.push({
                _id: id + '.curtain_level',
                common: {
                    name: 'Curtain level',
                    role: 'level.blinds',
                    write: true,
                    read: true,
                    min: 0,
                    max: 100,
                    unit: '%',
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.open',
                common: {
                    name: 'Open',
                    role: 'button',
                    write: true,
                    read: false,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.close',
                common: {
                    name: 'Close',
                    role: 'button',
                    write: true,
                    read: false,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.stop',
                common: {
                    name: 'Stop',
                    role: 'button',
                    write: true,
                    read: false,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'ctrl_ln1':
        case 'ctrl_ln1.aq1':
        case 'ctrl_neutral1':
            tasks.push({
                _id: id + '.channel_0',
                common: {
                    name: 'Wall switch',
                    role: 'switch',
                    write: true,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'ctrl_ln2':
        case 'ctrl_ln2.aq1':
        case 'ctrl_neutral2':
            tasks.push({
                _id: id + '.channel_0',
                common: {
                    name: 'Wall switch 0',
                    role: 'switch',
                    write: true,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.channel_1',
                common: {
                    name: 'Wall switch 1',
                    role: 'switch',
                    write: true,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;

        case 'cube':
        case 'sensor_cube.aqgl01':
            getVoltageObjects(id, tasks);
            tasks.push({
                _id: id + '.rotate',
                common: {
                    name: 'Rotation angle',
                    role: 'state',
                    write: false,
                    read: true,
                    type: 'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.rotate_position',
                common: {
                    name: 'Rotation angle',
                    role: 'state',
                    write: true,
                    read:  true,
                    min:   0,
                    max:   100,
                    unit:  '%',
                    type:  'number'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.flip90',
                common: {
                    name: 'Flip on 90°',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.flip180',
                common: {
                    name: 'Flip on 180°',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.move',
                common: {
                    name: 'Move action',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.tap_twice',
                common: {
                    name: 'Tapped twice',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.shake_air',
                common: {
                    name: 'Shaken in air',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.swing',
                common: {
                    name: 'Swing action',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.alert',
                common: {
                    name: 'Alert action',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.free_fall',
                common: {
                    name: 'Free fall action',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.rotate_left',
                common: {
                    name: 'Rotate left',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            tasks.push({
                _id: id + '.rotate_right',
                common: {
                    name: 'Rotate right',
                    role: 'button',
                    write: false,
                    read: true,
                    type: 'boolean'
                },
                type: 'state',
                native: {}
            });
            break;
    }

    const isStartTasks = !tasks.length;

    tasks.push({
        _id: id,
        common: {
            name: name || names[device.type] || device.type,
            icon: '/icons/' + device.type.replace('.', '_') + '.png'
        },
        type: 'channel',
        native: {
            sid:  device.sid,
            type: device.type
        }
    });

    isStartTasks && syncObjects(callback);
}

function readObjects(callback) {
    adapter.getForeignObjects(adapter.namespace + '.devices.*', (err, list) => {
        adapter.subscribeStates('devices.*');
        objects = list;
        callback && callback();
    });
}

function disconnected () {
    connTimeout = null;
    if (connected) {
        connected = false;
        adapter.log.info(`Change connection status on timeout after ${adapter.config.heartbeatTimeout}ms: false`);
        adapter.setState('info.connection', connected, true);
    }
    stopMihome();
}

function setConnected(conn) {
    if (connected !== conn) {
        connected = conn;
        adapter.log.info('Change connection status: ' + conn);
        adapter.setState('info.connection', connected, true);
    }

    if (conn && adapter.config.heartbeatTimeout) {
        if (connTimeout) {
            clearTimeout(connTimeout);
        }

        connTimeout = setTimeout(disconnected, adapter.config.heartbeatTimeout);
    }
}

function stopMihome() {
    if (hub) {
        try {
            hub.stop();
            hub = null;
        } catch (e) {

        }
    }
    if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(startMihome, adapter.config.restartInterval);
    }
}

function startMihome() {
    reconnectTimeout = null;
    setConnected(false);
    if (!adapter.config.key && (!adapter.config.keys || !adapter.config.keys.find(e => e.key))) {
        adapter.log.error('no key defined. Only read is possible');
    }

    hub = new MiHome({
        port:     adapter.config.port,
        bind:     adapter.config.bind || '0.0.0.0',
        key:      adapter.config.key,
        keys:     adapter.config.keys,
        interval: adapter.config.interval
    });

    hub.on('message', msg => {
        setConnected(true);
        adapter.log.debug('RAW: ' + JSON.stringify(msg));
    });
    hub.on('warning', msg => adapter.log.warn(msg));
    hub.on('error', error => {
        adapter.log.error(error);
        stopMihome();
    });
    hub.on('device', (device, name) => {
        adapter.log.debug('device: ' + device.sid + '(' + device.type + ')');
        if (!objects[adapter.namespace + '.devices.' + device.type.replace('.', '_') + '_' + device.sid]) {
            createDevice(device, name);
        }
    });
    hub.on('data', (sid, type, data) => {
        adapter.log.debug('data: ' + sid + '(' + type + '): ' + JSON.stringify(data));
        updateStates(sid, type, data);
    });

    if (!connTimeout && adapter.config.heartbeatTimeout) {
        connTimeout = setTimeout(disconnected, adapter.config.heartbeatTimeout);
    }

    hub.listen();
}

function main() {
    if (adapter.config.heartbeatTimeout === undefined) {
        adapter.config.heartbeatTimeout = 20000;
    } else {
        adapter.config.heartbeatTimeout = parseInt(adapter.config.heartbeatTimeout, 10) || 0;
    }
    adapter.config.restartInterval = parseInt(adapter.config.restartInterval, 10) || 30000;

    readObjects(startMihome);
}
