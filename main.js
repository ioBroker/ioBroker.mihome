/**
 *      ioBroker MiHome
 *
 *      Copyright 2017, bluefox <dogafox@gmail.com>
 *
 *      License: MIT
 */

var utils     = require(__dirname + '/lib/utils'); // Get common adapter utils
var MiHome    = require(__dirname + '/lib/mihome/Hub');
var adapter   = utils.adapter('mihome');

var objects   = {};
var delayed   = {};
var connected = null;
var connTimeout;
var hub;

adapter.on('ready', main);

adapter.on('stateChange', function (id, state) {
    if (!id || !state || state.ack) {
        return;
    }
    if (!objects[id]) {
        adapter.log.warn('Unknown ID: ' + id);
        return;
    }
    if (hub) {
        var pos = id.lastIndexOf('.');
        var channelId = id.substring(0, pos);
        var attr = id.substring(pos + 1);

        if (objects[channelId] && objects[channelId].native) {
            var device = hub.getSensor(objects[channelId].native.sid);
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

adapter.on('unload', function (callback) {
    if (hub) {
        hub.stop(callback);
    } else if (callback) {
        callback();
    }
});

function updateStates(sid, type, data) {
    var id = adapter.namespace + '.devices.' + type.replace('.', '_') + '_' + sid;

    for (var attr in data) {
        if (data.hasOwnProperty(attr)) {
            if (objects[id]) {
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

function syncObjects(objs, callback) {
    if (!objs || !objs.length) {
        callback && callback();
        return;
    }
    var obj = objs.shift();
    adapter.getForeignObject(obj._id, function (err, oObj) {
        if (!oObj) {
            objects[obj._id] = obj;
            adapter.setForeignObject(obj._id, obj, function () {
                setTimeout(syncObjects, 0, objs, callback);
            });
        } else {
            var changed = false;
            for (var a in obj.common) {
                if (obj.common.hasOwnProperty(a) && oObj.common[a] !== obj.common[a]) {
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
                adapter.setForeignObject(oObj._id, oObj, function () {
                    if (delayed[oObj._id]) {
                        adapter.setForeignState(oObj._id, delayed[oObj._id], true, function () {
                            delete delayed[oObj._id];
                            setTimeout(syncObjects, 0, objs, callback);
                        })
                    } else {
                        setTimeout(syncObjects, 0, objs, callback);
                    }
                });
            } else {
                if (delayed[oObj._id]) {
                    adapter.setForeignState(oObj._id, delayed[oObj._id], true, function () {
                        delete delayed[oObj._id];
                        setTimeout(syncObjects, 0, objs, callback);
                    })
                } else {
                    // init rotate position with previous value
                    if (oObj._id.match(/\.rotate_position$/)) {
                        adapter.getForeignState(oObj._id, function (err, state) {
                            if (state) {
                                var pos       = oObj._id.lastIndexOf('.');
                                var channelId = oObj._id.substring(0, pos);

                                if (objects[channelId]) {
                                    var device = hub.getSensor(objects[channelId].native.sid);
                                    if (device && device.Control) {
                                        device.Control('rotate_position', state.val);
                                    }
                                }
                            }
                            setTimeout(syncObjects, 0, objs, callback);
                        });
                    } else {
                        setTimeout(syncObjects, 0, objs, callback);
                    }
                }
            }
        }
    });
}

var names = {
    'gateway':          'Xiaomi RGB Gateway',
    'sensor_ht':        'Xiaomi Temperature/Humidity',
    'switch':           'Xiaomi Wireless Switch',
    'plug':             'Xiaomi Smart Plug',
    '86plug':           'Xiaomi Smart Wall Plug',
    '86sw2':            'Xiaomi Wireless Dual Wall Switch',
    '86sw1':            'Xiaomi Wireless Single Wall Switch',
    'ctrl_neutral2':    'Xiaomi Wired Dual Wall Switch',
    'ctrl_neutral1':    'Xiaomi Wired Single Wall Switch',
    'cube':             'Xiaomi Cube',
    'magnet':           'Xiaomi Door Sensor',
    'motion':           'Xiaomi Motion Sensor'
};

function createDevice(device, callback) {
    var objs = [];
    var id = adapter.namespace + '.devices.' + device.type.replace('.', '_') + '_' + device.sid;
    objs.push({
        _id: id,
        common: {
            name: names[device.type] || device.type,
            icon: '/icons/' + device.type + '.png'
        },
        type: 'channel',
        native: {
            sid:  device.sid,
            type: device.type
        }
    });

    switch (device.type) {
        case 'gateway':
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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

            break;

        case 'sensor_ht':
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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

        case 'sensor_motion.aq2':
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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

        case 'switch':
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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

        case '86sw2':
            getVoltageObjects(id, objs);

            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
        case 'plug':
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
        case 'ctrl_neutral1':
            objs.push({
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
        case 'ctrl_neutral2':
            objs.push({
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
            objs.push({
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
            getVoltageObjects(id, objs);
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
            objs.push({
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
    syncObjects(objs, callback);
}

function readObjects(callback) {
    adapter.getForeignObjects(adapter.namespace + '.devices.*', function (err, list) {
        adapter.subscribeStates('devices.*');
        objects = list;
        callback && callback();
    });
}

function setConnected(conn) {
    if (connected !== conn) {
        connected = conn;
        adapter.setState('info.connection', connected, true);
    }

    if (conn) {
        if (connTimeout) clearTimeout(connTimeout);

        connTimeout = setTimeout(function () {
            connected = false;
            adapter.setState('info.connection', connected, true);
        }, 20000);
    }
}

function startMihome() {
    setConnected(false);
    if (!adapter.config.key) {
        adapter.log.error('no key defined. Only read is possible');
    }

    hub = new MiHome({
        port:     adapter.config.port,
        bind:     adapter.config.bind || '0.0.0.0',
        key:      adapter.config.key,
        interval: adapter.config.interval
    });

    hub.on('message', function (msg) {
        setConnected(true);
        adapter.log.debug('RAW: ' + JSON.stringify(msg));
    });
    hub.on('warning', function (msg) {
        adapter.log.warn(msg);
    });
    hub.on('error', function (error) {
        adapter.log.error(error);
    });
    hub.on('device', function (device) {
        adapter.log.debug('device: ' + device.sid + '(' + device.type + ')');
        if (!objects[adapter.namespace + '.devices.' + device.type.replace('.', '_') + '_' + device.sid]) {
            createDevice(device);
        }
    });
    hub.on('data', function (sid, type, data) {
        adapter.log.debug('data: ' + sid + '(' + type + '): ' + JSON.stringify(data));
        updateStates(sid, type, data);
    });

    hub.listen();
}

function main() {
    readObjects(startMihome);
}
