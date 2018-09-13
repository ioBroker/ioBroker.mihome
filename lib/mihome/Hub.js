'use strict';

const dgram           = require('dgram');
const util            = require('util');
const EventEmitter    = require('events').EventEmitter;
const crypto          = require('crypto');
const Gateway         = require(__dirname + '/Sensors/Gateway');
const THSensor        = require(__dirname + '/Sensors/THSensor');
const DoorSensor      = require(__dirname + '/Sensors/DoorSensor');
const MotionSensor    = require(__dirname + '/Sensors/MotionSensor');
const VibrationSensor = require(__dirname + '/Sensors/VibrationSensor');
const Plug            = require(__dirname + '/Sensors/Plug');
const Button          = require(__dirname + '/Sensors/Button');
const Cube            = require(__dirname + '/Sensors/Cube');
const WallButtons     = require(__dirname + '/Sensors/WallButtons');
const WallWiredSwitch = require(__dirname + '/Sensors/WallWiredSwitch');
const Alarm           = require(__dirname + '/Sensors/Alarm');
const Curtain         = require(__dirname + '/Sensors/Curtain');
const WaterSensor     = require(__dirname + '/Sensors/WaterSensor');
const Lock            = require(__dirname + '/Sensors/Lock');

function Hub(options) {
    if (!(this instanceof Hub)) return new Hub(options);

    options = options || {};
    options.port = parseInt(options.port, 10) || 9898;
    
    this.sensors = {};

    this.key     = options.key;
    this.keys    = {};
    this.token   = {};
    this.iv      = Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e]);

    if (options.keys) {
        for (let i = 0; i < options.keys.length; i++) {
            this.keys[options.keys[i].ip] = options.keys[i].key;
        }
    }

    this.sensorTypes = {
        gateway:        'gateway',          // Xiaomi RGB Gateway
        th:             'sensor_ht',        // Xiaomi Temperature/Humidity
        weather:        'weather.v1',       // Xiaomi Temperature/Humidity/Pressure
        button:         'switch',           // Xiaomi Wireless Switch
        button2:        'sensor_switch.aq2',// Xiaomi Wireless Switch Sensor
        button3:        'sensor_switch.aq3',// Xiaomi Wireless Switch Sensor
        plug:           'plug',             // Xiaomi Smart Plug
        plug86:         '86plug',           // Xiaomi Smart Wall Plug
        remote_b286acn01: 'remote.b286acn01', // Xiaomi Aqara Wireless Remote Switch (Double Rocker)
        sw2_86:         '86sw2',            // Xiaomi Wireless Dual Wall Switch
        sw1_86:         '86sw1',            // Xiaomi Wireless Single Wall Switch
        natgas:         'natgas',           // Xiaomi Mijia Honeywell Gas Alarm Detector
        smoke:          'smoke',            // Xiaomi Mijia Honeywell Fire Alarm Detector
        ctrl_ln1:       'ctrl_ln1',         // Xiaomi Aqara 86 Fire Wall Switch One Button
        ctrl_ln1_aq1:   'ctrl_ln1.aq1',     // Xiaomi Aqara Wall Switch LN
        ctrl_ln2:       'ctrl_ln2',         // Xiaomi 86 zero fire wall switch double key
        ctrl_ln2_aq1:   'ctrl_ln2.aq1',     // Xiaomi Aqara Wall Switch LN double key
        ctrl_86plug_aq1: 'ctrl_86plug_aq1', // Xiaomi Aqara Wall socket
        ctrl_neutral2:  'ctrl_neutral2',    // Xiaomi Wired Dual Wall Switch
        ctrl_neutral1:  'ctrl_neutral1',    // Xiaomi Wired Single Wall Switch
        cube:           'cube',             // Xiaomi Cube
        cube2:          'sensor_cube.aqgl01',// Xiaomi Aqara Cube
        magnet:         'magnet',           // Xiaomi Door Sensor
        magnet2:        'sensor_magnet.aq2',// Xiaomi Door Sensor
        curtain:        'curtain',          // Xiaomi Aqara Smart Curtain
        motion:         'motion',           // Xiaomi Motion Sensor
        lock_aq1:       'lock.aq1',         // Xiaomi Vima Smart Lock
        lock_v1:        'lock.v1',          // Xiaomi Lock
        motion2:        'sensor_motion.aq2',// Xiaomi Motion Sensor
        vibration:      'vibration',        // Xiaomi vibration Sensor
        wleak1:         'sensor_wleak.aq1'  // Xiaomi Aqara Water Sensor
    };

    /* this.clickTypes = {
        click:              'click',
        double_click:       'double_click',
        long_click_press:   'long_click_press',
        long_click_release: 'long_click_release'
    }; */

    this.listen = function () {
        this.socket = dgram.createSocket('udp4');
        this.socket.on('message', this.onMessage.bind(this));
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('listening', this.onListening.bind(this));
        this.socket.bind(options.port);
    };

    this.stop = function (cb) {
        if (this._state === 'CLOSED') return false;
        this._state = 'CLOSED';

        if (this.socket) {
            try {
                this.socket.removeAllListeners();
                this.socket.close(cb);
                this.socket = null;
            } catch (e) {
                cb && cb();
            }
        } else {
            cb && cb();
        }
    };

    this.onListening = function () {
        this._state = 'CONNECTED';
        this.socket.setBroadcast(true);
        this.socket.setMulticastTTL(128);
        if (options.bind && options.bind !== '0.0.0.0') {
            this.socket.addMembership('224.0.0.50', options.bind);
        } else {
            this.socket.addMembership('224.0.0.50');
        }
        const whoIsCommand = '{"cmd": "whois"}';
        this.socket.send(whoIsCommand, 0, whoIsCommand.length, 4321, '224.0.0.50');
    };

    this.onError = function (err) {
        if (this._state === 'CLOSED') return false;
        this.emit('error', err);
    };

    this.onMessage = function (msgBuffer, rinfo) {
        if (this._state === 'CLOSED') return false;
        let msg;
        try {
            msg = JSON.parse(msgBuffer.toString());
        }
        catch (e) {
            return;
        }

        let sensor = this.getSensor(msg.sid);
        if (!sensor) {
            // {"model":"lumi.lock.v1","did":"lumi.1xxxxxxxxxxxxx8","name":"Front door lock"}
            if (!msg.model) {
                return;
            }
            try {
                if (options.browse) {
                    if (msg.model === 'gateway') {
                        this.emit('browse', {ip: rinfo.address});
                    }
                    return;
                } else {
                    sensor = this.sensorFactory(msg.sid, msg.model, rinfo.address, msg.name);
                }
            }
            catch (e) {
                this.emit('warning', 'Could not add new sensor: ' + e.message);
                return;
            }
        }
        
        if (sensor) {
            if (msg.data && typeof msg.data === 'string') {
                try {
                    msg.data = JSON.parse(msg.data);
                } catch (e) {
                    this.emit('warning', 'Could not parse: ' + msg.data);
                    msg.data = null;
                }
            }
            if (msg.token) {
                this.token[rinfo.address] = msg.token;
            }

            if (msg.cmd === 'heartbeat') {
                sensor.heartBeat(msg.token, msg.data);
            } else {
                sensor.heartBeat();
            }

            if (msg.data && (msg.cmd === 'report' || msg.cmd.indexOf('_ack') !== -1)) {
                sensor.onMessage(msg);
            }
        }
        
        this.emit('message', msg);
    };

    this.getKey = function (ip) {
        if (!this.token[ip]) return null;
        const key = this.keys[ip] || this.key;
        const cipher = crypto.createCipheriv('aes-128-cbc', key, this.iv);
        const crypted = cipher.update(this.token[ip], 'ascii', 'hex');
        cipher.final('hex'); // Useless data, don't know why yet.
        return crypted;
    };

    this.sendMessage = function (message, ip) {
        if (this._state === 'CLOSED') return false;
        const json = JSON.stringify(message);
        this.socket.send(json, 0, json.length, options.port, ip || '224.0.0.50');
    };

    this.sensorFactory = function (sid, model, ip, name) {
        if (this._state === 'CLOSED') return false;
        let sensor = null;
        switch (model) {
            case this.sensorTypes.gateway:
                sensor = new Gateway(sid, ip, this);
                break;
            case this.sensorTypes.weather:
            case this.sensorTypes.th:
                sensor = new THSensor(sid, ip, this, model, options.interval);
                break;
            case this.sensorTypes.magnet2:
            case this.sensorTypes.magnet:
                sensor = new DoorSensor(sid, ip, this);
                break;
            case this.sensorTypes.button3:
            case this.sensorTypes.button2:
            case this.sensorTypes.button:
                sensor = new Button(sid, ip, this);
                break;
            case this.sensorTypes.cube:
            case this.sensorTypes.cube2:
                sensor = new Cube(sid, ip, this);
                break;
            case this.sensorTypes.plug:
            case this.sensorTypes.ctrl_86plug_aq1:
            case this.sensorTypes.plug86:
                sensor = new Plug(sid, ip, this);
                break;
            case this.sensorTypes.wleak1:
                sensor = new WaterSensor(sid, ip, this);
                break;
            case this.sensorTypes.lock_v1:
            case this.sensorTypes.lock_aq1:
                sensor = new Lock(sid, ip, this, model);
                break;
            case this.sensorTypes.motion2:
            case this.sensorTypes.motion:
                sensor = new MotionSensor(sid, ip, this, model);
                break;
            case this.sensorTypes.vibration:
                sensor = new VibrationSensor(sid, ip, this, model);
                break;
            case this.sensorTypes.ctrl_ln1:
            case this.sensorTypes.ctrl_ln1_aq1:
            case this.sensorTypes.ctrl_ln2:
            case this.sensorTypes.ctrl_ln2_aq1:
            case this.sensorTypes.ctrl_neutral1:
            case this.sensorTypes.ctrl_neutral2:
                sensor = new WallWiredSwitch(sid, ip, this, model);
                break;
            case this.sensorTypes.remote_b286acn01:
            case this.sensorTypes.sw2_86:
            case this.sensorTypes.sw1_86:
                sensor = new WallButtons(sid, ip, this, model);
                break;
            case this.sensorTypes.natgas:
            case this.sensorTypes.smoke:
                sensor = new Alarm(sid, ip, this, model);
                break;
            case this.sensorTypes.curtain:
                sensor = new Curtain(sid, ip, this);
                break;
            default:
                throw new Error('Type "' + model + '" is not valid, use one of  Hub::sensorTypes');
        }
        this.registerSensor(sensor, name);
        return sensor;
    };
    this.getSensor = function (sid) {
        return this.sensors[sid] || null;
    };
    this.registerSensor = function (sensor, name) {
        if (this._state === 'CLOSED') return false;
        this.emit('device', sensor, name);
        this.sensors[sensor.sid] = sensor;
    };
    
    return this;
}

// extend the EventEmitter class using our Radio class
util.inherits(Hub, EventEmitter);

module.exports = Hub;