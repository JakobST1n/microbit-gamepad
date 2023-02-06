import { uBitBLE, MESEvents } from "./uBit";
import { notif_alert, notif_warn, notif_info, notif_success } from './notification';
import { Gamepad } from './gamepad';

/* Attempt to install service worker */
let sw = "service-worker.js";
if (navigator.serviceWorker) {
    navigator.serviceWorker.register(
        sw, {scope: '/microbit-gamepad/'}
    ).then(registration => {
        registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) { return; }
            installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                        notif_info("New content is available, relaunch the app to install it.");
                    } else {
                        notif_success("Content is cached for offline use.");
                    }
                }
            };
        };
        registration.update();
    }).catch(error => {
        notif_warn("Could not install service worker...");
        console.error("Error during service worker registration:", error);
    });
}

/* Allow the ignore-landscape-warning button to work */
document.getElementById("btn_ignore_landscape_warning").addEventListener("click", () => {
    document.body.classList.add("ignore-landscape-warning");
});

/* Show a warning if bluetooth is unavailable in the browser. */
if (!navigator.bluetooth) {
    //alert("Bluetooth not enabled in your browser, this won't work...");
    console.error("You do not have a bluetooth enabled browser, you need to have a bluetooth enabled browser...");
    notif_alert("Your browser does not seem to support bluetooth, try using Google Chrome or Microsoft Edge.");
}

/* Define and initialize things */
let gamepad = new Gamepad();
window.gamepad = gamepad;
let ubit = new uBitBLE();
window.ubit = ubit;

/* Setup storage and picker for the gamepad layout */
document.querySelector(".settings-dialog #layout").addEventListener("change", (v) => {
    gamepad.setGamepadLayout(v.target.value);
    localStorage.setItem("gamepadLayout", v.target.value);
    document.querySelector(".button-states pre").innerHTML = "No buttons pressed yet";
});
if (localStorage.getItem("gamepadLayout") === null) { localStorage.setItem("gamepadLayout", "1"); }
gamepad.setGamepadLayout(localStorage.getItem("gamepadLayout"));
document.querySelector(".button-states pre").innerHTML = "No buttons pressed yet";
document.querySelector(".settings-dialog #layout").value = localStorage.getItem("gamepadLayout");

/* Setup storage for toggling touches */
document.querySelector(".settings-dialog #show-touches").addEventListener("change", (v) => {
    gamepad.stage.showTouches = v.target.checked;
    localStorage.setItem("showTouches", v.target.checked);
});
if (localStorage.getItem("showTouches") === null) { localStorage.setItem("showTouches", false); }
gamepad.stage.showTouches = localStorage.getItem("showTouches") == "true";
document.querySelector(".settings-dialog #show-touches").checked = localStorage.getItem("showTouches") == "true";

/* Setup storage for toggling alt text */
document.querySelector(".settings-dialog #show-gamepad-alt-text").addEventListener("change", (v) => {
    gamepad.showAltText = v.target.checked;
    localStorage.setItem("showAltText", v.target.checked);
});
if (localStorage.getItem("showAltText") === null) { localStorage.setItem("showAltText", false); }
gamepad.showAltText = localStorage.getItem("showAltText") == "true";
document.querySelector(".settings-dialog #show-gamepad-alt-text").checked = localStorage.getItem("showAltText") == "true";

/* Setup storage for toggling vibration/haptic feedback */
document.querySelector(".settings-dialog #enable-haptic").addEventListener("change", (v) => {
    gamepad.enableVibration = v.target.checked;
    localStorage.setItem("enableHaptic", v.target.checked);
});
if (localStorage.getItem("enableHaptic") === null) { localStorage.setItem("enableHaptic", true); }
gamepad.enableVibration = localStorage.getItem("enableHaptic") == "true";
document.querySelector(".settings-dialog #enable-haptic").checked = localStorage.getItem("enableHaptic") == "true";

/* Setup storage for toggling debug mode */
document.querySelector(".settings-dialog #enable-debug").addEventListener("change", (v) => {
    gamepad.showDebug = v.target.checked;
    if (v.target.checked) {
        document.body.classList.add("debug");
    } else {
        document.body.classList.remove("debug");
    }
    localStorage.setItem("enableDebug", v.target.checked);
});
if (localStorage.getItem("enableDebug") === null) { localStorage.setItem("enableDebug", false); }
gamepad.showDebug = localStorage.getItem("enableDebug") == "true";
if (localStorage.getItem("enableDebug") === "true") {
    document.body.classList.add("debug");
} else {
    document.body.classList.remove("debug");
}
document.querySelector(".settings-dialog #enable-debug").checked = localStorage.getItem("enableDebug") == "true";

/* Setup buttons for opening/closing settings panel */
document.querySelector("#btn_show_settings").addEventListener("click", () => {
    document.querySelector(".settings-dialog").classList.add("shown");
});
document.querySelector("#btn_hide_settings").addEventListener("click", () => {
    document.querySelector(".settings-dialog").classList.remove("shown");
});

/* Setup actions for bluetooth connect/disconnect buttons */
document.querySelector("#btn_disconnect").addEventListener("click", () => {
    ubit.disconnect();
});
document.getElementById("btn_connect").addEventListener("click", async () => {
    if (!navigator.bluetooth) {
        notif_alert("You need a bluetooth enabled browser for this app to work, try chrome.");
    }
    try {
        await ubit.searchDevice();
    } catch (e) {
        notif_alert(`Could not connect to device: ${e}.`);
    }
});

/* Handle gamepad events */
let gamepadState = {};
gamepad.onTouchEvent(e => {
    /* This is just for the debug data */
    if (["touchstart", "touchmove"].includes(e.action)) {
        gamepadState[e.id] = {state: true, ...e};
    }
    if (["touchend"].includes(e.action)) {
        gamepadState[e.id] = {state: false, ...e};
    }
    let debugString = "";
    for (const [key, value] of Object.entries(gamepadState)) {
        debugString += `${key}: ${value.state ? 'Pressed' : 'Not pressed'}`;
        if (value.hasOwnProperty("x")) {
            debugString += ` (x: ${value.x}, y: ${value.y})`;
        }
        debugString += `\n`;
    }
    document.querySelector(".button-states pre").innerHTML = debugString;
});

let gamepadJoysickState = {};
gamepad.onTouchEvent(e => {
    const event_type = MESEvents.MES_DPAD_CONTROLLER_ID;
    let event_value = null;
    if (e.action == "touchstart") {
        if        (e.id == "A") {
            event_value = MESEvents.MES_DPAD_BUTTON_A_DOWN;
        } else if (e.id == "B") {
            event_value = MESEvents.MES_DPAD_BUTTON_B_DOWN;
        } else if (e.id == "C") {
            event_value = MESEvents.MES_DPAD_BUTTON_C_DOWN;
        } else if (e.id == "D") {
            event_value = MESEvents.MES_DPAD_BUTTON_D_DOWN;
        } else if (e.id == "1") {
            event_value = MESEvents.MES_DPAD_BUTTON_1_DOWN;
        } else if (e.id == "2") {
            event_value = MESEvents.MES_DPAD_BUTTON_2_DOWN;
        } else if (e.id == "3") {
            event_value = MESEvents.MES_DPAD_BUTTON_3_DOWN;
        } else if (e.id == "4") {
            event_value = MESEvents.MES_DPAD_BUTTON_4_DOWN;
        }
    } else if (e.action == "touchend") {
        if        (e.id == "A") {
            event_value = MESEvents.MES_DPAD_BUTTON_A_UP;
        } else if (e.id == "B") {
            event_value = MESEvents.MES_DPAD_BUTTON_B_UP;
        } else if (e.id == "C") {
            event_value = MESEvents.MES_DPAD_BUTTON_C_UP;
        } else if (e.id == "D") {
            event_value = MESEvents.MES_DPAD_BUTTON_D_UP;
        } else if (e.id == "1") {
            event_value = MESEvents.MES_DPAD_BUTTON_1_UP;
        } else if (e.id == "2") {
            event_value = MESEvents.MES_DPAD_BUTTON_2_UP;
        } else if (e.id == "3") {
            event_value = MESEvents.MES_DPAD_BUTTON_3_UP;
        } else if (e.id == "4") {
            event_value = MESEvents.MES_DPAD_BUTTON_4_UP;
        }
    }
    if ((ubit.isConnected()) && (event_value != null)) {
        ubit.sendEvent(event_type, event_value);
    }

    if (e.id == "right") {
        gamepadJoysickState.x = e.x;
    }
    if (e.id == "left") {
        gamepadJoysickState.y = e.y;
    }
});

/* Setup handlers for ubit (bluetooth) events */
ubit.onConnect(() => {
    document.body.classList.add("connected");
});

ubit.onDisconnect(() => {
    document.body.classList.remove("connected");
});


let i = 0;
setInterval(() => {
    if ((i==0) && gamepadJoysickState.hasOwnProperty("x")) {
        ubit.sendUart(`x:${gamepadJoysickState.x}\n`);
    }
    if ((i==1) && gamepadJoysickState.hasOwnProperty("y")) {
        ubit.sendUart(`y:${gamepadJoysickState.y}\n`);
    }
    i++;
    if (i>1) { i = 0; }
}, 20);
