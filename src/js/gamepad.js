class CanvasStage {
    canvas;
    #dpi = window.devicePixelRatio;
    #width;
    #height;
    #ctx;
    #elements = [];
    touches = {};
    showTouches = false;

    constructor(id, node) {
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("id", id);
        node.appendChild(this.canvas);

        addEventListener("resize", () => this.resize());
        this.resize();

        console.debug("Created canvas", this.canvas);

        setInterval(() => {
            this.drawElements();
        }, 10);
    }

    /* Resizes the canvas to be the correct size for the current screen */
    resize() {
        this.#ctx = this.canvas.getContext("2d");
        this.#height = +getComputedStyle(this.canvas).getPropertyValue("height").slice(0, -2);
        this.#width = +getComputedStyle(this.canvas).getPropertyValue("width").slice(0, -2);
        this.canvas.setAttribute('height', this.#height * this.#dpi);
        this.canvas.setAttribute('width', this.#width * this.#dpi);
    }

    /* Translate a screen x coordinate to a canvas x coordinate */
    screenToCanvasX(x) { return x * this.#dpi; }

    /* Translate a screen y coordinate to a canvas y coordinate */
    screenToCanvasY(y) { return y * this.#dpi; }

    /* Get target at position, i.e. the element that intersects said position */
    getTarget(x, y) {
        x *= this.#dpi;
        y *= this.#dpi;
        for (let i = 0; i < this.#elements.length; i++) {
            if ((this.#elements[i] instanceof TouchElement)
                && (this.#elements[i].collides(this.#ctx, x, y))) {
                return this.#elements[i];
            }
        }
    }

    /* Redraws all elements of the stage on the screen. */
    drawElements() {
        this.#ctx.clearRect(0, 0, this.#width * this.#dpi, this.#height * this.#dpi);
        for (let i = 0; i < this.#elements.length; i++) {
            this.#elements[i].draw(this.#ctx);
        }
        if (this.showTouches) {
            this.drawTouches();
        }
    }

    /* Draws all touches on the screen, used to debug */
    drawTouches(e) {
        const colors = ["200, 0, 0", "0, 200, 0", "0, 0, 200", "200, 200, 0", "200, 200, 200"]
        for (const [identifier, touch] of Object.entries(this.touches)) {
            this.#ctx.beginPath();
            this.#ctx.arc(touch.x * this.#dpi, touch.y * this.#dpi, 20 * this.#dpi, 0, 2*Math.PI, true);
            this.#ctx.fillStyle = `rgba(${colors[identifier]}, 0.2)`;
            this.#ctx.fill();

            this.#ctx.lineWidth = 2.0;
            this.#ctx.strokeStyle = `rgba(${colors[identifier]}, 0.8)`;
            this.#ctx.stroke();
        }
    }

    /* Add a element to the stage */
    addElement(element) {
        this.#elements.push(element);
        element.init();
    }

    /* Remove a element from the stage by id */
    removeElementById(id) {
        for (let i = 0; i < this.#elements.length; i++) {
            if (id === this.#elements[i].id) {
                this.#elements.splice(i, 1);
                return;
            }
        }
    }

    /* Wipe all elements from the stage */
    removeAllElements() {
        this.#elements.splice(0, this.#elements.length);
    }

}

class Element {
    gamepad;
    id;
    x;
    y;
    alignX;
    alignY;
    path;
    isInside;
    isActive;
    type = "Element";
    
    constructor(opts, gamepad) {
        let _opts = Object.assign({
            id: null,
            x: 0,
            y: 0,
            alignX: null,
            alignY: null
        }, opts);
        this.id = _opts.id;
        this.x = _opts.x;
        this.y = _opts.y;
        this.alignX = _opts.alignX;
        this.alignY = _opts.alignY;
        this.gamepad = gamepad;
    }

    /* Used for initializing the element onto the stage */
    init() {}

    /* Get the x-axis scaling factor (currently unused, only the y scaling factor is in use) */
    getScaleX(ctx) { 
        return ctx.canvas.width / 100;
    }

    /* Get the y-axis scaling factor */
    getScaleY(ctx) { 
        return ctx.canvas.height / 100;
    }

    /* Get the canvas x position of this element, adjusted from the virtual canvas coordinates */
    getX(ctx) {
        let x = this.x * this.getScaleY(ctx);
        if (this.alignX === "center") {
            x = (ctx.canvas.width / 2) + x;
        }
        if (this.alignX === "right") {
            x = ctx.canvas.width - x;
        }
        return x;
    }

    /* Get the canvas y position of this element, adjusted from the virtual canvas coordinates */
    getY(ctx) {
        let y = this.y * this.getScaleY(ctx);
        if (this.alignY === "center") {
            y = (ctx.canvas.height / 2) + y;
        }
        if (this.alignY === "bottom") {
            y = ctx.canvas.height - y;
        }
        return y;
    }

    /* Used to draw the element onto a canvas context */
    draw(ctx) {}

    /* Used to check wether the coordinates is inside this element */
    collides(ctx, x, y) {
        this.isInside = ctx.isPointInPath(this.path, x, y);
        return this.isInside;
    }

}

export class Square extends Element {
    draw(ctx) {
        this.path = new Path2D();
        let w = this.getScaleY(ctx) * 20;
        this.path.rect(this.getX(ctx) - (w/2), this.getY(ctx) - (w/2), w, w);
        ctx.fillStyle = `rgba(100, 100, 100, 0.8)`;
        ctx.fill(this.path);
    }
}

class TouchElement extends Element {
    type = "TouchElement";
    touchCount = 0;

    setActive(e, doCallbacks = true) {
        if (["end", "cancel"].includes(e.type)) { this.touchCount--; }
        let eState = e.type == "start";
        if ((eState !== this.isActive) && (this.touchCount == 0)) {
            this.isActive = eState;
            if (doCallbacks) {
                this.gamepad.handleTouchEventCallbacks(this.createTouchEventObject(
                    this.isActive ? "touchstart" : "touchend"
                ));
            }
        }
        if (e.type == "start") { this.touchCount++; }
    }

    createTouchEventObject(action) {
        return {
            id: this.id,
            action: action,
            type: this.type
        }
    }

}

export class GamepadButton extends TouchElement {
    shape;
    altText;
    altTextAlign;
    type = "GamepadButton";

    constructor(opts) {
        let _opts = Object.assign({
            keyboardButton: null,
            altText: null,
            altTextAlign: "left",
            shape: "round"
        }, opts);
        super(opts);
        this.keyboardButton = _opts.keyboardButton;
        this.shape = _opts.shape;
        this.altText = _opts.altText;
        this.altTextAlign = _opts.altTextAlign;
    }

    init() {
        if (this.keyboardButton !== null) {
            this.gamepad.registerKeybinding(this.keyboardButton, this);
        }
    }

    draw(ctx) {
        this.path = new Path2D();
        if (this.shape === "round") {
            this.path.arc(this.getX(ctx), this.getY(ctx), this.getScaleY(ctx) * 10, 0, 4*Math.PI, true);
        } else if (this.shape === "square") {
            let w = this.getScaleY(ctx) * 20;
            this.path.rect(this.getX(ctx) - (w/2), this.getY(ctx) - (w/2), w, w);
        }
        if (this.isActive) {
            ctx.fillStyle = `rgba(80, 80, 80, 1)`;
        } else {
            ctx.fillStyle = `rgba(100, 100, 100, 0.8)`;
        }
        ctx.fill(this.path);

        let s = `${Math.floor((this.getScaleY(ctx)*8).toString())}px 'Press Start 2P'`;
        ctx.font = s;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255, 255, 255, 1)`;
        ctx.fillText(this.id, this.getX(ctx), this.getY(ctx));

        if ((this.altText !== null) && (this.gamepad.showAltText)) {
            ctx.beginPath();
            ctx.font = `${Math.floor((this.getScaleY(ctx)*3).toString())}px 'Press Start 2P'`;
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.fillStyle = `rgba(150, 150, 150, 1)`;
            let ax = this.getX(ctx);
            let ay = this.getY(ctx);
            switch (this.altTextAlign) {
                case "left":
                    ax -= (this.getScaleY(ctx) * 13);
                    break;
                case "right":
                    ax += (this.getScaleY(ctx) * 13);
                    break;
                case "top":
                    ay -= (this.getScaleY(ctx) * 13);
                    break;
                case "bottom":
                    ay += (this.getScaleY(ctx) * 13);
                    break;
            }
            ctx.fillText(this.altText, ax, ay);
        }
    }

}

export class GamepadJoystick extends TouchElement {
    type = "GamepadJoystick";
    mouseX = 0;
    mouseY = 0;
    cR = 0;
    cX = 0;
    cY = 0;

    #lockX;
    #lockY;

    #pressedKeys = {};

    constructor(opts) {
        let _opts = Object.assign({
            lockX: false,
            lockY: false,
            autoCenter: true,
            bindUp: null,
            bindLeft: null,
            bindRight: null,
            bindDown: null
        }, opts);
        super(opts);
        this.#lockX = _opts.lockX;
        this.#lockY = _opts.lockY;
        this.bindUp = _opts.bindUp;
        this.bindLeft = _opts.bindLeft;
        this.bindRight = _opts.bindRight;
        this.bindDown = _opts.bindDown;
    }

    init() {
        if (this.bindUp !== null) {
            this.gamepad.registerKeybinding(this.bindUp, this);
        }
        if (this.bindLeft !== null) {
            this.gamepad.registerKeybinding(this.bindLeft, this);
        }
        if (this.bindRight !== null) {
            this.gamepad.registerKeybinding(this.bindRight, this);
        }
        if (this.bindDown !== null) {
            this.gamepad.registerKeybinding(this.bindDown, this);
        }
    }

    isKeyPressed(key) {
        return ((key !== null)
                && (this.#pressedKeys.hasOwnProperty(key))
                && (this.#pressedKeys[key] > 0));
    }

    createTouchEventObject(action) {
        return {
            id: this.id,
            action: action,
            type: this.type,
            x: Math.round((this.mouseX / this.cR) * 100),
            y: Math.round((this.mouseY / this.cR) * 100)
        }
    }

    setActive(e) {
        super.setActive(e, false);
        if (e.hasOwnProperty("key")) {
            if (!this.#pressedKeys.hasOwnProperty(e.key)) {
                this.#pressedKeys[e.key] = 0;
            }
            if (["start"].includes(e.type)) {
                this.#pressedKeys[e.key]++;
            }
            if (["end", "cancel"].includes(e.type)) {
                this.#pressedKeys[e.key]--;
            }
        }

        let max = this.cR
        if (!this.#lockX) {
            if (e.hasOwnProperty("x")) {
                this.mouseX = this.cX - this.gamepad.stage.screenToCanvasX(e.x);
                this.mouseX = Math.min(Math.abs(this.mouseX), max) * Math.sign(this.mouseX); 
                this.mouseX *= -1;
            }
            if (this.isKeyPressed(this.bindLeft)) { this.mouseX = -max; } 
            if (this.isKeyPressed(this.bindRight)) { this.mouseX = max; }
            if (this.isKeyPressed(this.bindLeft) && this.isKeyPressed(this.bindRight)) { this.mouseX = 0; }
            if (!this.isActive) { this.mouseX = 0; }
        }
        if (!this.#lockY) {
            if (e.hasOwnProperty("y")) {
                this.mouseY = this.cY - this.gamepad.stage.screenToCanvasY(e.y);
                this.mouseY = Math.min(Math.abs(this.mouseY), max) * Math.sign(this.mouseY); 
            } 
            if (this.isKeyPressed(this.bindUp)) { this.mouseY = max; } 
            if (this.isKeyPressed(this.bindDown)) { this.mouseY = -max; }
            if (this.isKeyPressed(this.bindUp) && this.isKeyPressed(this.bindDown)) { this.mouseY = 0; }
            if (!this.isActive) { this.mouseY = 0; }
        }

        let action = "touchmove";
        if (this.isActive && (this.touchCount == 1) && (e.type === "start")) {
            action = "touchstart";
        }
        if (!this.isActive) {
            action = "touchend";
        }
        this.gamepad.handleTouchEventCallbacks(this.createTouchEventObject(action));
    }

    draw(ctx) {
        this.cX = this.getX(ctx);
        this.cY = this.getY(ctx);
        this.cR = this.getScaleY(ctx) * 25;

        this.path = new Path2D();
        this.path.arc(this.cX, this.cY, this.cR, 0, 4*Math.PI, true);
        if (this.isActive) {
            ctx.fillStyle = `rgba(85, 85, 85, 0.8)`;
        } else {
            ctx.fillStyle = `rgba(100, 100, 100, 0.8)`;
        }
        ctx.fill(this.path);

        ctx.beginPath();
        ctx.arc(this.cX + this.mouseX, this.cY - this.mouseY, this.getScaleY(ctx) * 15, 0, 4*Math.PI, true);
        ctx.fillStyle = `rgba(130, 130, 130, 1)`;
        ctx.fill();

    }

}

export class Gamepad {
    stage;
    #width;
    #height;

    #touches = {};
    #keybindings = {};
    #keystates = {};
    #touchEventCallbacks = [];

    showDebug = false;
    showAltText = true;
    enableVibration = true;

    constructor() {
        this.stage = new CanvasStage("GamePad", document.querySelector(".gamepad-wrapper"));
        this.addEventListeners();
    }

    addEventListeners() {
        let ev = ["keydown", "keyup"];
        for(var e in ev) {
            document.addEventListener(ev[e], (e) => this.handleKeyEvent(e), false);
        }
        ev = ["touchstart", "touchend", "touchcancel", "touchmove"];
        for(var e in ev) {
            this.stage.canvas.addEventListener(ev[e], (e) => this.handleTouchEvent(e), false);
        }
        ev = ["mousedown", "mouseup", "mousemove"];
        for(var e in ev) {
            this.stage.canvas.addEventListener(ev[e], (e) => this.handleMouseEvent(e), false);
        }
    }

    /* Used by stage elements to register themselves with some keybinding */
    registerKeybinding(binding, element) {
        this.#keybindings[binding] = element;
    }

    /* Event handler for keyboard events */
    handleKeyEvent(e) {
        const typedict = {"keydown": "start", "keyup": "end"}
        if (!this.#keystates.hasOwnProperty(e.keyCode)) {
            this.#keystates[e.keyCode] = {pressed: false};
        }
        if (this.#keybindings.hasOwnProperty(e.key)) {
            let id = `Key ${e.key}`
            let target = this.#keybindings[e.key];
            let gtEvent = {
                touchId: id,
                key: e.key,
                type: typedict[e.type]
            };
            switch (e.type) {
                case "keydown":
                    if (this.#keystates[e.keyCode].pressed) { return; }
                    this.#keystates[e.keyCode].pressed = true;

                    this.#touches[id] = {};
                    this.#touches[id].target = target;
                    if (this.#touches[id].hasOwnProperty("target")
                        && this.#touches[id].target != null) {
                        this.#touches[id].target.setActive(gtEvent);
                    }
                    break;
                case "keyup":
                    if (!this.#keystates[e.keyCode].pressed) { return; }
                    this.#keystates[e.keyCode].pressed = false;

                    if (this.#touches[id].hasOwnProperty("target")
                        && this.#touches[id].target != null) {
                        this.#touches[id].target.setActive(gtEvent);
                    }
                    delete this.#touches[id];
                    break;
            }
        }
        this.stage.touches = this.#touches;
        this.debugTouches();
    }

    /* Event handler for mouse events, will just translate the event to a more common form
     * before further processing. */
    handleMouseEvent(e) {
        const typedict = {"mousedown": "start", "mouseup": "end", "mousemove": "move"}
        this.processGamepadTouchEvent({
            x: e.clientX,
            y: e.clientY,
            touchId: "mouse",
            type: typedict[e.type]
        });
    }

    /* Event handler for touch events, will just translate the event to a more common form
     * before further processing. */
    handleTouchEvent(e) {
        e.preventDefault();
        const typedict = {"touchstart": "start", "touchend": "end", "touchcancel": "end", "touchmove": "move"}
        for (let i = 0; i < e.changedTouches.length; i++) {
            let touch = e.changedTouches[i];
            this.processGamepadTouchEvent({
                x: touch.clientX,
                y: touch.clientY,
                touchId: touch.identifier,
                type: typedict[e.type]
            });
        }
    }

    /* Event handler for processing standarized touch/mouse events. */
    processGamepadTouchEvent(gtEvent) {
        let target = this.stage.getTarget(gtEvent.x, gtEvent.y)
        switch (gtEvent.type) {
            case "start":
                this.#touches[gtEvent.touchId] = {};
                this.#touches[gtEvent.touchId].target = target;
            case "move":
                if (this.#touches.hasOwnProperty(gtEvent.touchId)) {
                    this.#touches[gtEvent.touchId].x = gtEvent.x;
                    this.#touches[gtEvent.touchId].y = gtEvent.y;

                    if (this.#touches[gtEvent.touchId].hasOwnProperty("target")
                        && this.#touches[gtEvent.touchId].target != null) {
                        this.#touches[gtEvent.touchId].target.setActive(gtEvent);
                    }
                }
                break;

            case "end":
            case "cancel":
                if (this.#touches[gtEvent.touchId].hasOwnProperty("target")
                    && this.#touches[gtEvent.touchId].target != null) {
                    this.#touches[gtEvent.touchId].target.setActive(gtEvent);
                }
                delete this.#touches[gtEvent.touchId];
                break;

            default:
                console.log("Unknown touch event", gtEvent.type);
        }
        this.stage.touches = this.#touches;
        this.debugTouches();
    }

    /* Update the debug text with all current touches */
    debugTouches() {
        let s = "";
        if (this.showDebug) {
            for (const [i, t] of Object.entries(this.#touches)) {
                s += `[${i}] `
                if (t.hasOwnProperty("x")) {
                    s += `x: ${Math.round(t.x, 2)}, y: ${Math.round(t.y)},`
                }
                s += `target: ${t.target ? t.target.id : null}\n`;
            }
        }
        document.querySelector(".gamepad-touches").innerHTML = s;
    }

    /* Used by elements to process callbacks on actions to outside the gamepad */
    handleTouchEventCallbacks(e) {
        if (this.enableVibration && ["touchstart", "touchend"].includes(e.action)) {
            try {
                window.navigator.vibrate(5);
            } catch (e) {
                console.error(e);
            }
        }
        for (let i = 0; i < this.#touchEventCallbacks.length; i++) {
            this.#touchEventCallbacks[i](e);
        }
    }

    /* Register a method as a callback for gamepad touch events */
    onTouchEvent(callback) {
        this.#touchEventCallbacks.push(callback);
    }

    /* Add a list of elements to the gamepad stage */
    addElements(elements) {
        for (let i = 0; i < elements.length; i++) {
            elements[i].gamepad = this;
            this.stage.addElement(elements[i]);
        }
    }

    /* Remove a list of elements from the gamepad stage by id */
    removeElementsById(elementIds) {
        for (let i = 0; i < elementIds.length; i++) {
            this.stage.removeElementById(elementIds[i]);
        }
    }

    /* Remove all elements from the gamepad stage */
    removeAllElements() {
        this.stage.removeAllElements();
    }

    /* Initialize gamepad with a predefined layout */
    setGamepadLayout(variant) {
        console.debug(`Setting the gamepad layout to ${variant}, deleting all current elements.`);
        this.removeAllElements();
        switch (variant) {
            case "1":
                this.addElements([
                    new Square({id: "filler1", x: 40,  y: 0, alignX: "left",  alignY: "center"}),
                    new GamepadButton({id: "C", x: 20, y:   0, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowLeft", altText: "◀", altTextAlign: "right"}),
                    new GamepadButton({id: "D", x: 60, y:   0, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowRight",altText: "▶", altTextAlign: "left"}),
                    new GamepadButton({id: "A", x: 40, y: -20, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowUp",   altText: "▲", altTextAlign: "bottom"}),
                    new GamepadButton({id: "B", x: 40, y:  20, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowDown", altText: "▼", altTextAlign: "top"}),
                    new GamepadButton({id: "3", x: 20, y:   0, alignX: "right", alignY: "center", shape: "round", keyboardButton: "3", altText: "3", altTextAlign: "left"}),
                    new GamepadButton({id: "4", x: 60, y:   0, alignX: "right", alignY: "center", shape: "round", keyboardButton: "4", altText: "4", altTextAlign: "right"}),
                    new GamepadButton({id: "1", x: 40, y: -20, alignX: "right", alignY: "center", shape: "round", keyboardButton: "1", altText: "1", altTextAlign: "bottom"}),
                    new GamepadButton({id: "2", x: 40, y:  20, alignX: "right", alignY: "center", shape: "round", keyboardButton: "2", altText: "2", altTextAlign: "top"}),
                ])
                break;
            case "2":
                this.addElements([
                    new Square({id: "filler2", x: 40,  y: 0, alignX: "right",  alignY: "center"}),
                    new Square({id: "filler1", x: 40,  y: 0, alignX: "left",  alignY: "center"}),
                    new GamepadButton({id: "C", x: 20, y:   0, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowLeft", altText: "◀", altTextAlign: "right"}),
                    new GamepadButton({id: "D", x: 60, y:   0, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowRight",altText: "▶", altTextAlign: "left"}),
                    new GamepadButton({id: "A", x: 40, y: -20, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowUp",   altText: "▲", altTextAlign: "bottom"}),
                    new GamepadButton({id: "B", x: 40, y:  20, alignX: "left", alignY: "center", shape: "square", keyboardButton: "ArrowDown", altText: "▼", altTextAlign: "top"}),
                    new GamepadButton({id: "3", x: 20, y:   0, alignX: "right", alignY: "center", shape: "square", keyboardButton: "3"}),
                    new GamepadButton({id: "4", x: 60, y:   0, alignX: "right", alignY: "center", shape: "square", keyboardButton: "4"}),
                    new GamepadButton({id: "1", x: 40, y: -20, alignX: "right", alignY: "center", shape: "square", keyboardButton: "1"}),
                    new GamepadButton({id: "2", x: 40, y:  20, alignX: "right", alignY: "center", shape: "square", keyboardButton: "2"}),
                ])
                break;
            case "9":
                this.addElements([
                    new GamepadJoystick({id: "left", x: 40, y:  0, alignX: "left",  alignY: "center", lockX: true, bindUp: "ArrowUp", bindDown: "ArrowDown"}),
                    new GamepadJoystick({id: "right", x: 40, y:  0, alignX: "right", alignY: "center", lockY: true, bindLeft: "ArrowLeft", bindRight: "ArrowRight"})
                ]);
                break;
        }
    }

}
