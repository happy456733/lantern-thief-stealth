// Keyboard and mouse state, kept in one place so the game never touches
// DOM events directly. Movement keys, sneak, pause, and mouse clicks that
// tell the player where to toss a pebble.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
    this._onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.toLowerCase());
    };
    this._onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    this._onMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    };
    this._onMouseDown = (event) => {
      this._onMouseMove(event);
      this.mouse.clicked = true;
      this.mouse.clickX = this.mouse.x;
      this.mouse.clickY = this.mouse.y;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  // A unit movement vector from the keys currently held down.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  get sneaking() {
    return this.keys.has('shift');
  }

  // True once per key press of the named key (edge-triggered).
  consumeKey(key) {
    const k = key.toLowerCase();
    if (this.keys.has(k)) {
      this.keys.delete(k);
      return true;
    }
    return false;
  }

  // True once per mouse click; the game reads the click position from mouse.
  consumeClick() {
    if (this.mouse.clicked) {
      this.mouse.clicked = false;
      return true;
    }
    return false;
  }
}
