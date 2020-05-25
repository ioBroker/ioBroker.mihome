/**
 *      ioBroker MiHome
 *
 *      Copyright 2017-2018, bluefox <dogafox@gmail.com>
 *
 *      License: MIT
 */
'use strict';
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const MiHome  = require('./lib/Hub');
const adapter = utils.Adapter('mihome');

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
                adapter.log.debug('attr:' + attr);              // Для отладки
                adapter.log.debug('state:' + state.val);        // Для отладки
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
                let browse = new MiHome.Hub({
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

function createDevice(device, name, callback) {
    const id = adapter.namespace + '.devices.' + device.className.replace('.', '_') + '_' + device.sid;
    const isStartTasks = !tasks.length;
    const dev = Object.keys(MiHome.Devices).find(id => MiHome.Devices[id].type === device.type);

    if (dev) {
        for (const attr in MiHome.Devices[dev].states) {
            if (!MiHome.Devices[dev].states.hasOwnProperty(attr)) continue;
            console.log('Create ' + id + '.' + attr);
            tasks.push({
                _id: id + '.' + attr,
                common: MiHome.Devices[dev].states[attr],
                type: 'state',
                native: {}
            });
        }
    } else {
        adapter.log.error('Device ' + device.type + ' not found');
    }

    tasks.push({
        _id: id,
        common: {
            name: name || (dev && dev.fullName) || device.type,
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

    hub = new MiHome.Hub({
        port:     adapter.config.port,
        bind:     adapter.config.bind || '0.0.0.0',
        key:      adapter.config.key,
        keys:     adapter.config.keys,
        sids:     adapter.config.sids,
        interval: adapter.config.interval
    });

    hub.on('message', msg => {
        setConnected(true);
        adapter.log.debug('RAW: ' + JSON.stringify(msg));       // Здесь вывод в Log ioBrokera строк debug RAW:
    });
    hub.on('warning', msg => adapter.log.warn(msg));
    hub.on('debug', msg => adapter.log.debug(msg));
    hub.on('error', error => {
        adapter.log.error(error);
        stopMihome();
    });
    hub.on('device', (device, name) => {
        if (device.sid !== '000000000000') {        // Игнорируем устройства с пустым sid
            if (!objects[adapter.namespace + '.devices.' + device.className.replace('.', '_') + '_' + device.sid]) {
                adapter.log.debug('NEW device: ' + device.sid + '(' + device.type + ')');       // Здесь вывод в Log ioBrokera строк NEW device:
                createDevice(device, name);
            } else {
                adapter.log.debug('known device: ' + device.sid + '(' + device.type + ')');
            }
        }
    });
    hub.on('data', (sid, type, data) => {
        if (sid !== '000000000000') {               // Игнорируем устройства с пустым sid
                adapter.log.debug('data: ' + sid + '(' + type + '): ' + JSON.stringify(data));      // data: 000000000000(gateway): {"relay_status":"off"}
                updateStates(sid, type, data);
        }
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
