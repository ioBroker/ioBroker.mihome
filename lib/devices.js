'use strict';

const Gateway         = require('./Sensors/Gateway');
const THSensor        = require('./Sensors/THSensor');
const DoorSensor      = require('./Sensors/DoorSensor');
const MotionSensor    = require('./Sensors/MotionSensor');
const VibrationSensor = require('./Sensors/VibrationSensor');
const Plug            = require('./Sensors/Plug');
const Button          = require('./Sensors/Button');
const Cube            = require('./Sensors/Cube');
const WallButtons     = require('./Sensors/WallButtons');
const WallWiredSwitch = require('./Sensors/WallWiredSwitch');
const Alarm           = require('./Sensors/Alarm');
const Curtain         = require('./Sensors/Curtain');
const WaterSensor     = require('./Sensors/WaterSensor');
const Lock            = require('./Sensors/Lock');
const Relay           = require('./Sensors/Relay');

const states = {
    voltage:          {name: 'Battery voltage',       role: 'battery.voltage',   write: false, read: true, type: 'number', unit: 'V', icon: '/icons/battery_v.png', desc: 'Battery voltage'},
    percent:          {name: 'Battery percent',       role: 'battery.percent',   write: false, read: true, type: 'number', unit: '%', icon: '/icons/battery_p.png', desc: 'Battery level in percent', min: 0, max: 100},

    temperature:      {name: 'Temperature',           role: 'value.temperature', write: false, read: true, type: 'number', unit: '°C'},
    humidity:         {name: 'Humidity',              role: 'value.humidity',    write: false, read: true, type: 'number', unit: '%', min: 0, max: 100},

    doublePress:      {name: 'Double press',          role: 'state',             write: false, read: true, type: 'boolean', desc:  'You can press connect button twice'},

    opened:           {name: 'Is opened',             role: 'state',             write: false, read: true, type: 'boolean'},
    description:      {name: 'Alarm description',     role: 'state',             write: false, read: true, type: 'string'},

    motion:           {name: 'Is motion',             role: 'indicator.motion',  write: false, read: true, type: 'boolean'},
    no_motion:        {name: 'Last motion',           role: 'state',             write: false, read: true, type: 'number', unit: 'seconds', desc:  'Last motion for at least X seconds'},
    fing_verified:    {name: 'Finger verified',       role: 'value',             write: false, read: true, type: 'number'},

    psw_verified:     {name: 'Password verified',     role: 'value',             write: false, read: true, type: 'number'},
    card_verified:    {name: 'Card verified',         role: 'value',             write: false, read: true, type: 'number'},
    verified_wrong:   {name: 'Wrong verification',    role: 'value',             write: false, read: true, type: 'number'},

    click:            {name: 'Simple click',          role: 'button',            write: false, read: true, type: 'boolean'},
    double:           {name: 'Double click',          role: 'button',            write: false, read: true, type: 'boolean'},
    long:             {name: 'Long click',            role: 'button',            write: false, read: true, type: 'boolean'},

    channel_0:        {name: 'First button pressed',  role: 'button',            write: false, read: true, type: 'boolean'},
    channel_0_double: {name: 'First button pressed double',  role: 'button',     write: false, read: true, type: 'boolean'},
    channel_0_long:   {name: 'First button long pressed',  role: 'button',       write: false, read: true, type: 'boolean'},
    channel_1:        {name: 'Second button pressed', role: 'button',            write: false, read: true, type: 'boolean'},
    channel_1_double: {name: 'Second button pressed double', role: 'button',     write: false, read: true, type: 'boolean'},
    channel_1_long:   {name: 'Second button long pressed',  role: 'button',      write: false, read: true, type: 'boolean'},
    dual_channel:     {name: 'Both buttons pressed',  role: 'button',            write: false, read: true, type: 'boolean'},

    power:            {name: 'Socket plug',           role: 'switch',            write: true,  read: true, type: 'boolean'},
    load_power:       {name: 'Load power',            role: 'value.power',       write: false, read: true, type: 'number', unit: 'W'},
    power_consumed:   {name: 'Power consumed',        role: 'value.consumption', write: false, read: true, type: 'number', unit: 'Wh'},
    inuse:            {name: 'Is in use',             role: 'state',             write: false, read: true, type: 'number'},

    wall_switch:      {name: 'Wall switch',           role: 'switch',            write: true,  read: true, type: 'boolean'},
    wall_switch0:     {name: 'Wall switch 0',         role: 'switch',            write: true,  read: true, type: 'boolean'},
    wall_switch1:     {name: 'Wall switch 1',         role: 'switch',            write: true,  read: true, type: 'boolean'},

    relay_switch0:    {name: 'switch 0',              role: 'switch',            write: true,  read: true, type: 'boolean'},
    relay_switch1:    {name: 'switch 1',              role: 'switch',            write: true,  read: true, type: 'boolean'},
    
    rotate:           {name: 'Rotation angle',        role: 'state',             write: false, read: true, type: 'number'},
    rotate_position:  {name: 'Rotation angle',        role: 'state',             write: true,  read: true, type: 'number', min: 0, max: 100, unit: '%'},
    flip90:           {name: 'Flip on 90°',           role: 'button',            write: false, read: true, type: 'boolean'},
    flip180:          {name: 'Flip on 180°',          role: 'button',            write: false, read: true, type: 'boolean'},
    move:             {name: 'Move action',           role: 'button',            write: false, read: true, type: 'boolean'},
    tap_twice:        {name: 'Tapped twice',          role: 'button',            write: false, read: true, type: 'boolean'},
    shake_air:        {name: 'Shaken in air',         role: 'button',            write: false, read: true, type: 'boolean'},
    swing:            {name: 'Swing action',          role: 'button',            write: false, read: true, type: 'boolean'},
    alert:            {name: 'Alert action',          role: 'button',            write: false, read: true, type: 'boolean'},
    free_fall:        {name: 'Free fall action',      role: 'button',            write: false, read: true, type: 'boolean'},
    rotate_left:      {name: 'Rotate left',           role: 'button',            write: false, read: true, type: 'boolean'},
    rotate_right:     {name: 'Rotate right',          role: 'button',            write: false, read: true, type: 'boolean'}
};

// type - name as delivered by gateway
// fullName - Name of the device
// ClassName - handler class
// states - list of states for this sensor

const devices = {
    gateway:          {type: 'gateway',            fullName: 'Xiaomi RGB Gateway', ClassName: Gateway, states: {
            illumination:   {name: 'Illumination',    role: 'value.lux',         write: false, read: true,  type: 'number', unit: 'lux'},
            rgb:            {name: 'RGB',             role: 'level.color.rgb',   write: true,  read: true,  type: 'string'},
            on:             {name: 'Light',           role: 'switch',            write: true,  read: true,  type: 'boolean'},
            dimmer:         {name: 'Light',           role: 'level.dimmer',      write: true,  read: true,  type: 'number', unit: '%', min: 0, max: 100},
            volume:         {name: 'Volume',          role: 'level.volume',      write: true,  read: true,  type: 'number', unit: '%', min: 0, max: 100},
            mid:            {name: 'Music ID',        role: 'state',             write: true,  read: false, type: 'number', desc: '10000 - stop, 10005 - custom ringtone'},
            proto_version:  {name: 'Proto Version',   role: 'info',              write: false, read: true,  type: 'string'},
            join_permission:{name: 'Add device',      role: 'state',             write: true, read: true,  type: 'string'},
            remove_device:  {name: 'Remove device',   role: 'state',             write: true, read: true,  type: 'string'},
            connected:      {name: 'Is gateway connected', role: 'indicator.reachable', write: true, read: false, type: 'boolean', desc: 'Will be set to false if no packets received in 20 seconds'}
        }
    },
    acpartner3:             {type: 'acpartner.v3',    fullName: 'Xiaomi Aqara AC partner Gateway', ClassName: Gateway, states: {
            illumination:   {name: 'Illumination',    role: 'value.lux',         write: false, read: true,  type: 'number', unit: 'lux'},
            mid:            {name: 'Music ID',        role: 'state',             write: true,  read: false, type: 'number', desc: '10000 - stop, 10005 - custom ringtone'},
            on_off_cfg:     {name: 'Air conditioning switch status',    role: 'state',          write: true, read: true,  type: 'string'},
            mode_cfg:       {name: 'Air conditioning mode',             role: 'state',          write: true, read: true,  type: 'string'},
            ws_cfg:         {name: 'Air conditioning speed',            role: 'state',          write: true, read: true,  type: 'string'},
            swing_cfg:      {name: 'Air conditioning swing',            role: 'state',          write: true, read: true,  type: 'string'},
            temp_cfg:       {name: 'Air conditioning temperature',      role: 'state',          write: true, read: true,  type: 'string'},
            relay_status:   {name: 'Air conditioning relay control',    role: 'state',          write: true, read: true,  type: 'string'},
            join_permission:{name: 'Add device',    role: 'state',          write: true, read: true,  type: 'string'},
            remove_device:  {name: 'Remove device',   role: 'state',          write: true, read: true,  type: 'string'},
            volume:         {name: 'Volume',          role: 'level.volume',      write: true,  read: true,  type: 'number', unit: '%', min: 0, max: 100},
            ac_power:       {name: 'AC power',        role: 'state',             write: false, read: true,  type: 'number'},
            proto_version:  {name: 'Proto Version',   role: 'info',              write: false, read: true,  type: 'string'},
            connected:      {name: 'Is gateway connected', role: 'indicator.reachable', write: true, read: false, type: 'boolean', desc: 'Will be set to false if no packets received in 20 seconds'}
        }
    },
    th:               {type: 'sensor_ht',          fullName: 'Xiaomi Temperature/Humidity', ClassName: THSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            temperature:  states.temperature,
            humidity:     states.humidity,
            doublePress:  states.doublePress
        }
    },
    weather:          {type: 'weather.v1',         fullName: 'Xiaomi Temperature/Humidity/Pressure', ClassName: THSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            temperature:  states.temperature,
            humidity:     states.humidity,
            pressure:     {name: 'Pressure',        role: 'value.pressure',    write: false, read: true, type: 'number', unit: 'mmHg', min: 0, max: 1000},
            doublePress:  states.doublePress
        }
    },
    weather0:          {type: 'weather',         fullName: 'Xiaomi Temperature/Humidity/Pressure', ClassName: THSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            temperature:  states.temperature,
            humidity:     states.humidity,
            pressure:     {name: 'Pressure',        role: 'value.pressure',    write: false, read: true, type: 'number', unit: 'mmHg', min: 0, max: 1000},
            doublePress:  states.doublePress
        }
    },
    button:           {type: 'switch',             fullName: 'Xiaomi Wireless Switch', ClassName: Button, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            click:        states.click,
            double:       states.double,
            long:         states.long
        }
    },
    sensor_switch:    {type: 'sensor_switch',      fullName: 'Xiaomi Wireless Switch', ClassName: Button, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            click:        states.click,
            double:       states.double,
            long:         states.long
        }
    },
    button2:          {type: 'sensor_switch.aq2',  fullName: 'Xiaomi Wireless Switch Sensor', ClassName: Button, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            click:        states.click,
            double:       states.double,
            long:         states.long
        }
    },
    button3:          {type: 'sensor_switch.aq3',  fullName: 'Xiaomi Wireless Switch Sensor', ClassName: Button, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            click:        states.click,
            double:       states.double,
            long:         states.long
        }
    },
    button4:          {type: 'remote.b1acn01',     fullName: 'Xiaomi Aqara Smart Wireless Switch', ClassName: Button, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            click:        states.click,
            double:       states.double,
            long:         states.long
        }
    },
    plug:             {type: 'plug',               fullName: 'Xiaomi Smart Plug', ClassName: Plug, states: {
            // voltage:          states.voltage,    здесь нет батарейки
            // percent:          states.percent,    здесь нет батарейки

            state:            states.power,
            load_power:       states.load_power,
            power_consumed:   states.power_consumed,
            inuse:            states.inuse
        }
    },
    plug86:           {type: '86plug',             fullName:  'Xiaomi Smart Wall Plug', ClassName: Plug, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            state:            states.power,
            load_power:       states.load_power,
            power_consumed:   states.power_consumed,
            inuse:            states.inuse
        }
    },
    remote_b286acn01: {type: 'remote.b286acn01',   fullName: 'Xiaomi Aqara Wireless Remote Switch (Double Rocker)', ClassName: WallButtons, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            channel_0:        states.channel_0,
            channel_0_long:        states.channel_0_long,
            channel_1:        states.channel_1,
            channel_1_long:        states.channel_1_long,
            dual_channel:     states.dual_channel,
            channel_0_double: states.channel_0_double,
            channel_1_double: states.channel_1_double
        }
    },

    remote_b186acn01: {type: 'remote.b186acn01',   fullName: 'Xiaomi Aqara Wireless Remote Switch (Single Rocker)', ClassName: WallButtons, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            channel_0:        states.channel_0,
            channel_0_double: states.channel_0_double
        }
    },    
    aqara_relay: {type: 'relay.c2acn01',   fullName: 'Aqara Two-channel Relay', ClassName: Relay, states: {
            channel_0:        states.relay_switch0,
            channel_1:        states.relay_switch1,
            }
    }, 

    sw2_86:           {type: '86sw2',              fullName: 'Xiaomi Wireless Dual Wall Switch', ClassName: WallButtons, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            channel_0:        states.channel_0,
            channel_1:        states.channel_1,
            dual_channel:     states.dual_channel,
            channel_0_double: states.channel_0_double,
            channel_1_double: states.channel_1_double
        }
    },
    sw1_86:           {type: '86sw1',              fullName: 'Xiaomi Wireless Single Wall Switch', ClassName: WallButtons, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            channel_0:        states.click,
            channel_0_double: states.double
        }
    },
    sensor_sw2_86:    {type: 'sensor_86sw2',       fullName: 'Xiaomi Wireless Dual Wall Switch', ClassName: WallButtons, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            channel_0:        states.channel_0,
            channel_1:        states.channel_1,
            dual_channel:     states.dual_channel,
            channel_0_double: states.channel_0_double,
            channel_1_double: states.channel_1_double
        }
    },
    sensor_sw1_86:    {type: 'sensor_86sw1',       fullName: 'Xiaomi Wireless Single Wall Switch', ClassName: WallButtons, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            channel_0:        states.click,
            channel_0_double: states.double
        }
    },
    natgas:           {type: 'natgas',             fullName: 'Xiaomi Mijia Honeywell Gas Alarm Detector', ClassName: Alarm, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        {name: 'Alarm state',     role: 'indicator.alarm.CO2', write: false, read: true, type: 'boolean'},
            description:  states.description
        }
    },
    smoke:            {type: 'smoke',              fullName: 'Xiaomi Mijia Honeywell Fire Alarm Detector', ClassName: Alarm, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        {name: 'Alarm state',     role: 'indicator.alarm.fire', write: false, read: true, type: 'boolean'},
            description:  states.description
        }
    },
    ctrl_ln1:         {type: 'ctrl_ln1',           fullName: 'Xiaomi Aqara 86 Fire Wall Switch One Button', ClassName: WallWiredSwitch, states: {
            channel_0:      states.wall_switch
        }
    },
    ctrl_ln1_aq1:     {type: 'ctrl_ln1.aq1',       fullName: 'Xiaomi Aqara Wall Switch LN', ClassName: WallWiredSwitch, states: {
            channel_0:      states.wall_switch
        }
    },
    ctrl_ln2:         {type: 'ctrl_ln2',           fullName: 'Xiaomi 86 zero fire wall switch double key', ClassName: WallWiredSwitch, states: {
            channel_0:      states.wall_switch0,
            channel_1:      states.wall_switch1
        }
    },
    ctrl_ln2_aq1:     {type: 'ctrl_ln2.aq1',       fullName: 'Xiaomi Aqara Wall Switch LN double key', ClassName: WallWiredSwitch, states: {
            channel_0:      states.wall_switch0,
            channel_1:      states.wall_switch1
        }
    },
    ctrl_86plug:  {type: 'ctrl_86plug',    fullName: 'Xiaomi Aqara Wall Socket', ClassName: Plug, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            state:            states.power,
            load_power:       states.load_power,
            power_consumed:   states.power_consumed,
            inuse:            states.inuse
        }
    },
    ctrl_86plug_aq1:  {type: 'ctrl_86plug.aq1',    fullName: 'Xiaomi Aqara Wall Socket', ClassName: Plug, states: {
            // voltage:          states.voltage,    здесь нет батарейки
            // percent:          states.percent,    здесь нет батарейки

            state:            states.power,
            load_power:       states.load_power,
            power_consumed:   states.power_consumed,
            inuse:            states.inuse
        }
    },
    ctrl_neutral2:    {type: 'ctrl_neutral2',      fullName: 'Xiaomi Wired Dual Wall Switch', ClassName: WallWiredSwitch, states: {
            channel_0:      states.wall_switch0,
            channel_1:      states.wall_switch1
        }
    },
    ctrl_neutral1:    {type: 'ctrl_neutral1',      fullName: 'Xiaomi Wired Single Wall Switch', ClassName: WallWiredSwitch, states: {
            channel_0:      states.wall_switch
        }
    },
    cube:             {type: 'cube',               fullName: 'Xiaomi Cube', ClassName: Cube, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            rotate:           states.rotate,
            rotate_position:  states.rotate_position,
            flip90:           states.flip90,
            flip180:          states.flip180,
            move:             states.move,
            tap_twice:        states.tap_twice,
            shake_air:        states.shake_air,
            swing:            states.swing,
            alert:            states.alert,
            free_fall:        states.free_fall,
            rotate_left:      states.rotate_left,
            rotate_right:     states.rotate_right,
        }
    },
    cube2:            {type: 'sensor_cube.aqgl01', fullName: 'Xiaomi Cube 01', ClassName: Cube, states: {
            voltage:          states.voltage,
            percent:          states.percent,

            rotate:           states.rotate,
            rotate_position:  states.rotate_position,
            flip90:           states.flip90,
            flip180:          states.flip180,
            move:             states.move,
            tap_twice:        states.tap_twice,
            shake_air:        states.shake_air,
            swing:            states.swing,
            alert:            states.alert,
            free_fall:        states.free_fall,
            rotate_left:      states.rotate_left,
            rotate_right:     states.rotate_right,
        }
    },
    magnet:           {type: 'magnet',             fullName: 'Xiaomi Door Sensor', ClassName: DoorSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        states.opened
        }
    },
    sensor_magnet:           {type: 'sensor_magnet', fullName: 'Xiaomi Door Sensor', ClassName: DoorSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        states.opened
        }
    },
    magnet2:          {type: 'sensor_magnet.aq2',  fullName: 'Xiaomi Door Sensor', ClassName: DoorSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        states.opened
        }
    },
    curtain:          {type: 'curtain',            fullName: 'Xiaomi Aqara Smart Curtain', ClassName: Curtain, states: {
            curtain_level: {name: 'Curtain level',  role: 'level.blind', write: true, read: true,  type: 'number', min: 0, max: 100, unit: '%'},
            open:          {name: 'Open',           role: 'button.open',  write: true, read: false, type: 'boolean'},
            close:         {name: 'Close',          role: 'button.close', write: true, read: false, type: 'boolean'},
            stop:          {name: 'Stop',           role: 'button.stop',  write: true, read: false, type: 'boolean'}
        }
    },
    motion:           {type: 'motion',             fullName: 'Xiaomi Motion Sensor', ClassName: MotionSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        states.motion,
            no_motion:    states.no_motion
        }
    },
    sensor_motion:    {type: 'sensor_motion',      fullName: 'Xiaomi Motion Sensor', ClassName: MotionSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        states.motion,
            no_motion:    states.no_motion
        }
    },
    lock_aq1:         {type: 'lock.aq1',           fullName: 'Xiaomi Lock', ClassName: Lock, states: {
            voltage:        states.voltage,
            percent:        states.percent,

            fing_verified:  states.fing_verified,
            psw_verified:   states.psw_verified,
            card_verified:  states.card_verified,
            verified_wrong: states.verified_wrong
        }
    },
    lock_v1:          {type: 'lock.v1',            fullName: 'Xiaomi Vima Smart Lock', ClassName: Lock, states: {
            voltage:        states.voltage,
            percent:        states.percent,

            fing_verified:  states.fing_verified,
            psw_verified:   states.psw_verified,
            card_verified:  states.card_verified,
            verified_wrong: states.verified_wrong
        }
    },
    motion2:          {type: 'sensor_motion.aq2',  fullName: 'Xiaomi Motion Sensor', ClassName: MotionSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        states.motion,
            no_motion:    states.no_motion,
            lux:          {name: 'Brightness', role: 'indicator.brightness', write: false, read: true, type: 'number', unit: 'lux'}
        }
    },
    vibration:        {type: 'vibration',          fullName: 'Xiaomi Vibration Sensor', ClassName: VibrationSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        {name: 'Is vibration',  role: 'indicator.vibration', write: false, read:  true, type: 'boolean', desc:  'Last tilt angle'},
            tilt_angle:   {name: 'Tilt angle',    role:  'value',              write: false, read:  true, type:  'number', unit:  '°'},
            orientationX: {name: 'Orientation X', role:  'value',              write: false, read:  true, type:  'number', desc:  'Last X orientation'},
            orientationY: {name: 'Orientation Y', role:  'value',              write: false, read:  true, type:  'number', desc:  'Last Y orientation'},
            orientationZ: {name: 'Orientation Z', role:  'value',              write: false, read:  true, type:  'number', desc:  'Last Z orientation'},
            bed_activity: {name: 'Bed activity',  role:  'value',              write: false, read:  true, type:  'number', desc:  'Last bed activity'}
        }
    },
    wleak1:           {type: 'sensor_wleak.aq1',   fullName: 'Xiaomi Aqara Water Sensor', ClassName: WaterSensor, states: {
            voltage:      states.voltage,
            percent:      states.percent,

            state:        {name: 'Is water detected', role: 'indicator.leakage', write: false, read: true, type: 'boolean'}
        }
    },
};

module.exports = devices;
