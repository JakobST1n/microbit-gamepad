import { notif_alert, notif_warn, notif_info, notif_success } from './notification';
/*
 * This code is written with a lot of help from these resources:
 * https://github.com/antefact/microBit.js/blob/master/src/microBit.js
 * https://gist.github.com/kotobuki/7c67f8b9361e08930da1a5cfcfb0653f
 * https://lancaster-university.github.io/microbit-docs/resources/bluetooth/bluetooth_profile.html
 */
const UART_SERVICE_UUID                      = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
/* Used for reading UART data from micro bit */
const UART_TX_CHARACTERISTIC_UUID            = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
/* Used for writing UART data to micro bit */
const UART_RX_CHARACTERISTIC_UUID            = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
/* The event service characteristic (which extends the uBit message bus over bluetooth) */
const EVENT_SERVICE_UUID                     = "e95d93af-251d-470a-a062-fa1922dfa9a8";
/* This should be read once connected, as the ubit will advertise which events it wants to subscribe to */
const UBIT_REQUIREMENT_CHARACTERISTIC_UUID   = "e95db84c-251d-470a-a062-fa1922dfa9a8";
/* The characteristic where we should write the events we wish to be informed of from the microbit */
const CLIENTREQUIREMENTS_CHARACTERISTIC_UUID = "e95d23c4-251d-470a-a062-fa1922dfa9a8"
/* The characteristic used for reading EventService messages */
const UBITEVENT_CHARACTERISTIC_UUID          = "e95d9775-251d-470a-a062-fa1922dfa9a8";
/* The characteristic used for writing EventService messages */
const CLIENTEVENT_CHARACTERISTIC_UUID        = "e95d5404-251d-470a-a062-fa1922dfa9a8";

/* This table is retrieved from this site:
 * https://github.com/lancaster-university/microbit-dal/blob/master/inc/bluetooth/MESEvents.h */
export const MESEvents = {
    MES_DPAD_CONTROLLER_ID: 1104,
    MES_DPAD_BUTTON_A_DOWN: 1,
    MES_DPAD_BUTTON_A_UP:   2,
    MES_DPAD_BUTTON_B_DOWN: 3,
    MES_DPAD_BUTTON_B_UP:   4,
    MES_DPAD_BUTTON_C_DOWN: 5,
    MES_DPAD_BUTTON_C_UP:   6,
    MES_DPAD_BUTTON_D_DOWN: 7,
    MES_DPAD_BUTTON_D_UP:   8,
    MES_DPAD_BUTTON_1_DOWN: 9,
    MES_DPAD_BUTTON_1_UP:   10,
    MES_DPAD_BUTTON_2_DOWN: 11,
    MES_DPAD_BUTTON_2_UP:   12,
    MES_DPAD_BUTTON_3_DOWN: 13,
    MES_DPAD_BUTTON_3_UP:   14,
    MES_DPAD_BUTTON_4_DOWN: 15,
    MES_DPAD_BUTTON_4_UP:   16
}

class BluetoothService {
    static gattEventQueue = [];
    SERVICE_UUID = null;

    static doGattEvent() {
        if (BluetoothService.gattEventQueue <= 0) { return; }
        BluetoothService.gattEventQueue.pop()();
    }
}

class EventService extends BluetoothService {
    /* Implements methods for interacting with microbit EventService */
    static SERVICE_UUID = EVENT_SERVICE_UUID;
    service;

    constructor(service, ubitEvent) {
        super();
        this.service = service;
        this.ubitEvent = ubitEvent;
        console.debug("EventService initialized.");
    }

    sendEvent(event_type, event_value) {
        BluetoothService.gattEventQueue.push(() => {
            this.ubitEvent.writeValue(
                new Uint16Array([event_type, event_value])
            );
        });
    }

    static async getService(gattServer) {
        console.debug("Getting EventService");
        let service = await gattServer.getPrimaryService(EventService.SERVICE_UUID);
        console.debug("Getting ClientEvent characteristic");
        let ubitEventCharacteristic = await service.getCharacteristic(CLIENTEVENT_CHARACTERISTIC_UUID);
        return new EventService(service, ubitEventCharacteristic);
    }
}

class UartService extends BluetoothService {
    /* Implements methods for interacting with microbit UartService */
    static SERVICE_UUID = UART_SERVICE_UUID;
    handlers = [];

    constructor(service, uartTx, uartRx) {
        super();
        this.service = service;
        this.uartTx = uartTx;
        this.uartRx = uartRx;
        console.debug("UartService initialized.");
    }

    async sendUart(str, isVolatile=true) {
        let encoder = new TextEncoder();
        try {
            await this.uartRx.writeValue(
                encoder.encode(str)
            )
        } catch (e) {
            if (!isVolatile) {
                console.error(e);
            }
        }
    }

    #onUartTx(e) {
        for (let i = 0; i < this.handlers.length; i++) {
            this.handlers[i]();
        }
    }

    onUartTx(callback) {
        this.handlers.push(callback);
    }

    static async getService(gattServer) {
        console.debug("Getting UartService");
        let service = await gattServer.getPrimaryService(UartService.SERVICE_UUID);

        console.debug("Getting Uart characteristics");
        
        let uartTxCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
        await uartTxCharacteristic.startNotifications();
        await uartTxCharacteristic.addEventListener("characteristicvaluechanged", (e) => {
            this.#onUartTx(e);
        });

        let uartRxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);

        return new UartService(service, uartTxCharacteristic, uartRxCharacteristic);
    }


}

export class uBitBLE {
    eventService;
    eventServiceAvailable = false;
    uartService;
    uartServiceAvailable = false;
    uartTxHandlers = [];
    device;

    constructor() {
        this.onConnectCallback = [];
        this.onDisconnectCallback = [];
        this.pushInterval = setInterval(BluetoothService.doGattEvent, 40);
    }

    #onDisconnect(e) {
        console.debug("Device disconnected", e);
        for (let i = 0; i < this.onDisconnectCallback.length; i++) {
            this.onDisconnectCallback[i]();
        }
    }

    #onConnect() {
        console.debug("Device connected");
        for (let i = 0; i < this.onConnectCallback.length; i++) {
            this.onConnectCallback[i]();
        }
    }

    onConnect(callbackFunction) {
        this.onConnectCallback.push(callbackFunction);
    }

    onDisconnect(callbackFunction) {
        this.onDisconnectCallback.push(callbackFunction);
    }

    isConnected() {
        if (this.device) {
            return this.device.gatt.connected;
        } else {
            return false;
        }
    }

    disconnect() {
        if (this.isConnected()) {
            this.device.gatt.disconnect();
        }
    }

    async searchDevice() {
        this.device = await navigator.bluetooth.requestDevice({
            filters: [{namePrefix: "BBC micro:bit"}],
            optionalServices: [EVENT_SERVICE_UUID, UART_SERVICE_UUID]
        });
        this.device.addEventListener('gattserverdisconnected', (e) => this.#onDisconnect(e));
        console.log("Connected to new device", this.device.name, this.device.id);

        console.debug("Connection to GATT server...");
        const server = await this.device.gatt.connect()

        this.#onConnect();

        console.debug("Getting services...");

        try {
            const eventService = await EventService.getService(server);
            this.eventService = eventService;
            this.eventServiceAvailable = true;
        } catch (e) {
            this.eventServiceAvailable = false;
            console.debug("Could not get EventService");
            notif_warn("Connected device's firmware does not support bluetooth EventService, gamepad will not work.");
        }

        try {
            const uartService = await UartService.getService(server);
            this.uartService = uartService;
            for (let i = 0; i < this.uartTxHandlers.length; i++) {
                this.uartService.onUartTx(this.uartTxHandlers[i]);
            }
            this.uartServiceAvailable = true;
        } catch (e) {
            this.uartServiceAvailable = false;
            console.debug("Could not get UartService", e)
            notif_info("Connected device's firmware does not support bluetooth UartService, joysticks won't work.");
        }
    }

    sendEvent(event_type, event_value) {
        if (this.isConnected() && this.eventServiceAvailable) {
            this.eventService.sendEvent(event_type, event_value);
        } else {
            console.debug(`Could not send event {${event_type}, ${event_value}}, because: ${this.isConnected() ? "Device does not have EventService characteristic" : "No device connected"}.`);
        }
    }

    sendUart(str) {
        if (this.isConnected() && this.uartServiceAvailable) {
            this.uartService.sendUart(str);
        } else {
            console.debug(`Could not send uart data, because: ${this.isConnected() ? "Device does not have UartService characteristic" : "No device connected"}.`);
        }
    }

    onUartTx(callback) {
        this.uartTxHandlers.push(callback);
        if (this.uartServiceAvailable) {
            this.uartService.onUartTx(callback);
        }
    }

}

function getSupportedProperties(characteristic) {
    let supportedProperties = [];
    for (const p in characteristic.properties) {
        if (characteristic.properties[p] === true) {
            supportedProperties.push(p.toUpperCase());
        }
    }
    return '[' + supportedProperties.join(', ') + ']';
}

function eventByteArrayToString(event) {
    let receivedData = [];
    for (var i = 0; i < event.target.value.byteLength; i++) {
        receivedData[i] = event.target.value.getUint8(i);
    }
    return String.fromCharCode.apply(null, receivedData);
}
