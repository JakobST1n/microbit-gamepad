# HOVER:BIT Bluetooth Controller software
This is a webapp for sending DPAD events to micro:bit devices over bluetooth.

It works the best if you install it on your device, usually you should get a prompt to install it when accessing the site.

> Only tested on __Google Chrome__! Will __NOT__ work on Safari or firefox (as they don't support web bluetooth). I have not tested on IOS, but it should work with chrome there as well.

This is a continuation of [HOVER:BIT BLE](https://github.com/JakobST1n/hoverbit-ble), but does not support fine-grained joystick input the way that project did. This is because it is intended to work with the default makecode MES_DPAD events.

## Usage
### Programming the micro:bit
You can create your own micro:bit code, and program it any way you are familiar with.
This app sends MES_DPAD events, so you can add blocks listening for those.

### Controlling the micro:bit
Navigate to [the progressive web app](https://jakobst1n.github.io/microbit-gamepad/) on a phone, and press connect.
You should then select your micro:bit from the list of devices, and pair it. Now, the buttons will send events to the
paired micro:bit.

## Versions
For the [HOVER:BIT BLE](https://github.com/JakobST1n/hoverbit-ble) project, the versions matter, as they indicate compatability.
Here you can use them to know wether you have the latest app, but it does not matter apart from that.

## Developing
To run locally
```
npm i
npm build
npm run dev
```

## Contribute
Fork this repo, and open a pull request. I will then deploy and push to gh-pages.

To deploy
```
./deploy.sh <version>
```

