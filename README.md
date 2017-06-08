![Logo](admin/mihome.png)
ioBroker mihome Adapter
==============

[![NPM version](http://img.shields.io/npm/v/iobroker.mihome.svg)](https://www.npmjs.com/package/iobroker.mihome)
[![Downloads](https://img.shields.io/npm/dm/iobroker.mihome.svg)](https://www.npmjs.com/package/iobroker.mihome)

[![NPM](https://nodei.co/npm/iobroker.mihome.png?downloads=true)](https://nodei.co/npm/iobroker.mihome/)

## Requirements 
### Android (copied from [here](http://www.domoticz.com/wiki/Xiaomi_Gateway_(Aqara)) )
You first need to enable local network functions by using the Android Mi Home 
App https://play.google.com/store/apps/details?id=com.xiaomi.smarthome :

- Install the App on a Android device
- Make sure you set your region to: Mainland China under settings -> Locale - at time of writing this seems to be required.
- Mainland China and language can set on English
- Select your Gateway in Mi Home
- Then the 3 dots at the top right of the screen
- Then click on about
- Tap the version (2.27 is the current Android version as of 2 June 2017) number at the bottom of the screen repeatedly
- You should see now 2 extra options listed in English (was Chinese in earlier versions)until you did now enable the developer mode. \[ if not try all steps again! \]
- Choose the first new option
- Then tap the first toggle switch to enable LAN functions. Note down the password (29p9i40jeypwck38 in the screenshot). Make sure you hit the OK button (to the right of the cancel button) to save your changes.
- If you change here something, you lose your password!

![android](img/mihome-settings.png)

### iOS
You first need to enable local network functions by using the [iOS Mi Home App iosApp Mi](https://itunes.apple.com/fr/app/%E7%B1%B3%E5%AE%B6-%E7%B2%BE%E5%93%81%E5%95%86%E5%9F%8E-%E6%99%BA%E8%83%BD%E7%94%9F%E6%B4%BB/id957323480?mt=8)
Install the App on a iOS device: 
- Make sure you set your region to: Mainland China under settings -> Locale - required for the moment.
- Mainland China and language can set on English
- Select your Gateway in Mi Home
- Then the 3 dots at the top right of the screen
- Then click on about
- Tap under Tutorial menu(on the blank part) repeatedly
- You should see now 3 extra options listed in Chinese until you did now enable the developer mode. \[ if not try all steps again! \]
- Choose the second new option
- Then tap the first toggle switch to enable LAN functions. Note down the password (29p9i40jeypwck38 in the screenshot). Make sure you hit the OK button (to the right of the cancel button) to save your changes.
- If you change here something, you lose your password!

## Changelog
### 0.1.3 (2017-06-08)
 - (bluefox) add cube
 - (bluefox) remove voltage by gateway

### 0.1.1 (2017-06-06)
 - (bluefox) Initial commit

## License

Copyright (c) 2017 bluefox <dogafox@gmail.com>
