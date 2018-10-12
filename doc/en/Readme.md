![Logo](media/mihome.png)
# ioBroker Mi Home Adapter
The Mi Home Adapter integrates a Mi Control Hub (Gateway) into an ioBroker system  
and enables the communication of various Xiaomi sensors, switches etc. with ioBroker.

Via ioBroker, e.g. the lighting and the speaker of the gateway are controlled.
## Requirements
* Mi Home App on Android or iOS device and free local network function
* Connected Mi Home Gateway
* Ready to use ioBroker system
### Mi Home App installation and local network feature unlocking
#### Android 
* Download, install and open [Android Mi Home App][Android App] on an Android device
* Choose `Mainland China` and set language `English`
* Setup an Account with `Sign in`
* After successfully logging in add a device via `+`
* Choose `MI Control Hub` under `Household security` and follow the instructions 
* After successfully integration of the Gateway in Mi Home tip the 3 dots at the top  
right of the screen and click `About`
* Tap the text `Plug*in version` number at the bottom of the screen 10 times
* There should be now 2 extra options listed until the developer mode is enabled.   
[ if not try all steps again!]
* Choose the option `Wireless communication protocol`
* Then tap the first toggle switch to enable LAN functions. Note down the password.
> Password is required later in the ioBroker installation.
* Make sure to hit the OK button to save changes.
* If you change here something, you lose your password!

Now further devices can be trained via the `+` sign.

#### iOS
* Download, install and open [iOS Mi Home App][ios App] on a iOS device
* Select the country setting `mainland China` via Profile/Settings/Country .
* Setup an Account with `Sign in`
* After successfully logging in add a device via `+`
* Choose `MI Control Hub` under `Household security` and follow the instructions 
* After successfully integration of the Gateway in Mi Home tip the 3 dots at the top  
right of the screen and click `About`* 
* There should be now more extra options listed until the developer mode is enabled.   
[ if not try all steps again!]
* Choose the option No. 4
* Then tap the first toggle switch to enable LAN functions. Note down the password.
> Password is required later in the ioBroker installation.
* Make sure to hit the OK button to save changes.
* If you change here something, you lose your password!

Now further devices can be trained via the `+` sign.

## Router Setup
The Gateway IP address can be determined within the text after _localip_ under About/Hub  
info. In the used router used, this IP should be assigned fix to the gateway.  
If the operation of the learned devices via the App is no longer wanted, after learning  
all devices the Internet access of the gateway can be switched off in the router.

### Supported devices
The following list does not claim to be complete:
* gateway *           Xiaomi RGB Gateway
* sensor_ht *         Xiaomi Temperature/Humidity
* weather.v1 *        Xiaomi Temperature/Humidity/Pressure
* switch *            Xiaomi Wireless Switch
* sensor_switch.aq2 * Xiaomi Aqara Wireless Switch Sensor
* sensor_switch.aq3 * Xiaomi Aqara Wireless Switch Sensor
* plug *              Xiaomi Smart Plug
* 86plug *            Xiaomi Smart Wall Plug
* 86sw2 *             Xiaomi Wireless Dual Wall Switch
* 86sw1 *             Xiaomi Wireless Single Wall Switch
* natgas *            Xiaomi Mijia Honeywell Gas Alarm Detector
* smoke *             Xiaomi Mijia Honeywell Fire Alarm Detector
* ctrl_ln1 *          Xiaomi Aqara 86 Fire Wall Switch One Button
* ctrl_ln1.aq1 *      Xiaomi Aqara Wall Switch LN
* ctrl_ln2 *          Xiaomi 86 zero fire wall switch double key
* ctrl_ln2.aq1 *      Xiaomi Aqara Wall Switch LN double key
* ctrl_neutral2 *     Xiaomi Wired Dual Wall Switch
* ctrl_neutral1 *     Xiaomi Wired Single Wall Switch
* cube *              Xiaomi Cube
* sensor_cube.aqgl01 * Xiaomi Cube
* magnet *            Xiaomi Door Sensor
* sensor_magnet.aq2 * Xiaomi Aqara Door Sensor
* curtain *           Xiaomi Aqara Smart Curtain
* motion *            Xiaomi Motion Sensor
* sensor_motion.aq2 * Xiaomi Aqara Motion Sensor
* sensor_wleak.aq1 *  Xiaomi Aqara water sensor
* ctrl_ln2.aq1 *      Xiaomi Aqara Wall Switch LN (Double)
* remote.b286acn01 *  Xiaomi Aqara Wireless Remote Switch (Double Rocker)
* remote.b1acn01 *    Xiaomi Aqara Wireless Remote Switch
* vibration *         Xiaomi vibration Sensor
* wleak1 *            Xiaomi Aqara Water Sensor
* lock_aq1 *          Xiaomi Lock

## ioBroker Mi Home Adapter installation
Further settings are only made via the ioBroker Admin * interface.  
Find the adapter in the `Adapter` area and install it using the `+` sign. 

![Logo](media/Adapter.png)

The following configuration window then opens:

![Logo](media/Adapterconfig1.PNG)

Enter the password determined above under `Default Gateway Key` and close the window  
with `save and close`.   
The current adapter should then be displayed green under `Instances`:

![Logo](media/Instanz.PNG)

Under `Objects` now the gateway and its learned devices are displayed:

![Logo](media/Objekte.PNG)

The manual was created to the best of my knowledge and belief. 

[Android App]:(https://play.google.com/store/apps/details?id=com.xiaomi.smarthome)

[iOS App]:(https://itunes.apple.com/de/app/mi*home*xiaomi*smarthome/id957323480?mt=8)
