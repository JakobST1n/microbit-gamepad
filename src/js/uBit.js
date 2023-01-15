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
const EVENT_SERVICE_CHARACTERISTIC_UUID      = "e95d93af-251d-470a-a062-fa1922dfa9a8";
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
    SERVICE_UUID = null;
}

class EventService extends BluetoothService {
    static SERVICE_UUID = EVENT_SERVICE_CHARACTERISTIC_UUID;
    service;

    constructor(service, ubitEvent) {
        super();
        this.service = service;
        this.ubitEvent = ubitEvent;
        console.log("EventService initialized.");
    }

    sendEvent(event_type, event_value) {
        this.ubitEvent.writeValue(
            new Uint16Array([event_type, event_value])
        );
    }

    static async getService(gattServer) {
        console.debug("Getting EventService");
        let service = await gattServer.getPrimaryService(EventService.SERVICE_UUID);
        console.debug("Getting UBitevent characteristic");
        let ubitEventCharacteristic = await service.getCharacteristic(CLIENTEVENT_CHARACTERISTIC_UUID);
        return new EventService(service, ubitEventCharacteristic);
    }
}

export class uBitBLE {
    eventService;
    device;

    constructor() {
        this.onConnectCallback = function() {};
        this.onDisconnectCallback = function() {};
    }

    onConnect(callbackFunction) {
        this.onConnectCallback = callbackFunction;
    }

    onDisconnect(callbackFunction) {
        this.onDisconnectCallback = callbackFunction;
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
            optionalServices: [EVENT_SERVICE_CHARACTERISTIC_UUID]
        });
        this.device.addEventListener('gattserverdisconnected', this.onDisconnectCallback);
        console.log("Connected to new device", this.device.name, this.device.id);

        console.debug("Connection to GATT server...");
        const server = await this.device.gatt.connect()

        this.onConnectCallback();
        console.debug("Getting services...");

        const eventService = await EventService.getService(server);
        this.eventService = eventService;
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
