'use strict';

var dgram        = require('dgram');
var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var crypto       = require('crypto');
var Gateway      = require(__dirname + '/Sensors/Gateway');
var THSensor     = require(__dirname + '/Sensors/THSensor');
var DoorSensor   = require(__dirname + '/Sensors/DoorSensor');
var MotionSensor = require(__dirname + '/Sensors/MotionSensor');
var Plug         = require(__dirname + '/Sensors/Plug');
var Button       = require(__dirname + '/Sensors/Button');
var Cube         = require(__dirname + '/Sensors/Cube');
var WallButtons  = require(__dirname + '/Sensors/WallButtons');
var WallWiredSwitch = require(__dirname + '/Sensors/WallWiredSwitch');
var Alarm        = require(__dirname + '/Sensors/Alarm');
var Curtain      = require(__dirname + '/Sensors/Curtain');

function Hub(options) {
    if (!(this instanceof Hub)) return new Hub(options);

    options = options || {};
    options.port = parseInt(options.port, 10) || 9898;
    
    this.sensors = {};

    this.key     = options.key;
    this.token   = null;
    this.iv      = Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e]);

    this.sensorTypes = {
        gateway:    'gateway',          // Xiaomi RGB Gateway
        th:         'sensor_ht',        // Xiaomi Temperature/Humidity
        weather:    'weather.v1',       // Xiaomi Temperature/Humidity/Pressure
        button:     'switch',           // Xiaomi Wireless Switch
        button2:    'sensor_switch.aq2', // Xiaomi Wireless Switch Sensor
        plug:       'plug',             // Xiaomi Smart Plug
        plug86:     '86plug',           // Xiaomi Smart Wall Plug
        sw2_86:     '86sw2',            // Xiaomi Wireless Dual Wall Switch
        sw1_86:     '86sw1',            // Xiaomi Wireless Single Wall Switch
        natgas:     'natgas',           // Xiaomi Mijia Honeywell Gas Alarm Detector
        smoke:      'smoke',            // Xiaomi Mijia Honeywell Fire Alarm Detector
        ctrl_ln1:   'ctrl_ln1',         // Xiaomi Aqara 86 Fire Wall Switch One Button
        ctrl_ln2:   'ctrl_ln2',         // Xiaomi 86 zero fire wall switch double key
        ctrl_neutral2: 'ctrl_neutral2', // Xiaomi Wired Dual Wall Switch
        ctrl_neutral1: 'ctrl_neutral1', // Xiaomi Wired Single Wall Switch
        cube:       'cube',             // Xiaomi Cube
        magnet:     'magnet',           // Xiaomi Door Sensor
        magnet2:    'sensor_magnet.aq2',// Xiaomi Door Sensor
        curtain:    'curtain',          // Xiaomi Aqara Smart Curtain
        motion:     'motion',           // Xiaomi Motion Sensor
        motion2:    'sensor_motion.aq2' // Xiaomi Motion Sensor
    };

    this.clickTypes = {
        click:              'click',
        double_click:       'double_click',
        long_click_press:   'long_click_press',
        long_click_release: 'long_click_release'
    };

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
        var whoIsCommand = '{"cmd": "whois"}';
        this.socket.send(whoIsCommand, 0, whoIsCommand.length, 4321, '224.0.0.50');
    };

    this.onError = function (err) {
        if (this._state === 'CLOSED') return false;
        this.emit('error', err);
    };

    this.onMessage = function (msgBuffer) {
        if (this._state === 'CLOSED') return false;

        try {
            var msg = JSON.parse(msgBuffer.toString());
        }
        catch (e) {
            return;
        }

        var sensor = this.getSensor(msg.sid);
        if (!sensor) {
            if (!msg.model) {
                return;
            }
            try {
                sensor = this.sensorFactory(msg.sid, msg.model);
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
                this.token = msg.token;
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

    this.getKey = function (sid) {
        if (!this.token) return null;
        var cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
        var crypted = cipher.update(this.token, 'ascii', 'hex');
        cipher.final('hex'); // Useless data, don't know why yet.
        return crypted;
    };

    this.sendMessage = function (message) {
        if (this._state === 'CLOSED') return false;
        var json = JSON.stringify(message);
        this.socket.send(json, 0, json.length, options.port, '224.0.0.50');
    };

    this.sensorFactory = function (sid, model) {
        if (this._state === 'CLOSED') return false;
        var sensor = null;
        switch (model) {
            case this.sensorTypes.gateway:
                sensor = new Gateway(sid, this);
                break;
            case this.sensorTypes.weather:
            case this.sensorTypes.th:
                sensor = new THSensor(sid, this, model, options.interval);
                break;
            case this.sensorTypes.magnet2:
            case this.sensorTypes.magnet:
                sensor = new DoorSensor(sid, this);
                break;
            case this.sensorTypes.button2:
            case this.sensorTypes.button:
                sensor = new Button(sid, this);
                break;
            case this.sensorTypes.cube:
                sensor = new Cube(sid, this);
                break;
            case this.sensorTypes.plug:
            case this.sensorTypes.plug86:
                sensor = new Plug(sid, this);
                break;
            case this.sensorTypes.motion2:
            case this.sensorTypes.motion:
                sensor = new MotionSensor(sid, this, model);
                break;
            case this.sensorTypes.ctrl_ln1:
            case this.sensorTypes.ctrl_ln2:
            case this.sensorTypes.ctrl_neutral1:
            case this.sensorTypes.ctrl_neutral2:
                sensor = new WallWiredSwitch(sid, this, model);
                break;
            case this.sensorTypes.sw2_86:
            case this.sensorTypes.sw1_86:
                sensor = new WallButtons(sid, this, model);
                break;
            case this.sensorTypes.natgas:
            case this.sensorTypes.smoke:
                sensor = new Alarm(sid, this, model);
                break;
            case this.sensorTypes.curtain:
                sensor = new Curtain(sid, this);
                break;
            default:
                throw new Error('Type "' + model + '" is not valid, use one of  Hub::sensorTypes');
                break;
        }
        this.registerSensor(sensor);
        return sensor;
    };
    this.getSensor = function (sid) {
        return this.sensors[sid] || null;
    };
    this.registerSensor = function (sensor) {
        if (this._state === 'CLOSED') return false;
        this.emit('device', sensor);
        this.sensors[sensor.sid] = sensor;
    };
    
    return this;
}

// extend the EventEmitter class using our Radio class
util.inherits(Hub, EventEmitter);

module.exports = Hub;