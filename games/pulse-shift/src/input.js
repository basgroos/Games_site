// =============================================================
//  INPUT — keyboard + gamepad, with input buffering
//  Change key bindings in `bindings` below.
// =============================================================
PS.Input = {
  bindings: {
    up:    ['KeyW', 'ArrowUp'],
    down:  ['KeyS', 'ArrowDown'],
    left:  ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    dash:  ['Space', 'KeyJ', 'KeyZ'],
    hop:   ['KeyK', 'KeyX', 'ShiftLeft', 'ShiftRight'],
    brk:   ['KeyL', 'KeyC', 'KeyE'],
    pause: ['Escape', 'KeyP'],
    retry: ['KeyR']
  },
  down: {},       // keys currently held
  buffer: {},     // action -> seconds left in its input buffer
  padDown: {},
  padPrev: {},
  padAxis: { x: 0, y: 0 },
  onAction: null, // optional callback(actionName) — used for pause / retry

  init() {
    window.addEventListener('keydown', (e) => {
      PS.Audio.init(); // browsers only allow audio after a key press / click
      const playing = PS.game && PS.game.state === 'playing';
      if (playing && this.isGameKey(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down[e.code] = true;
      for (const a in this.bindings) {
        if (this.bindings[a].includes(e.code)) this.press(a);
      }
    });
    window.addEventListener('keyup', (e) => { this.down[e.code] = false; });
    window.addEventListener('blur', () => { this.down = {}; });
    window.addEventListener('pointerdown', () => PS.Audio.init());
  },

  isGameKey(code) {
    for (const a in this.bindings) if (this.bindings[a].includes(code)) return true;
    return false;
  },

  press(action) {
    this.buffer[action] = PS.CONFIG.player.inputBuffer;
    if (this.onAction) this.onAction(action);
  },

  held(action) {
    const keys = this.bindings[action];
    for (let i = 0; i < keys.length; i++) if (this.down[keys[i]]) return true;
    return !!this.padDown[action];
  },

  // true once if the action was pressed recently (then clears it)
  consume(action) {
    if (this.buffer[action] > 0) { this.buffer[action] = 0; return true; }
    return false;
  },
  peek(action) { return this.buffer[action] > 0; },
  clear() { this.buffer = {}; },

  // movement direction, length 0..1
  move() {
    let x = 0, y = 0;
    if (this.held('left')) x -= 1;
    if (this.held('right')) x += 1;
    if (this.held('up')) y -= 1;
    if (this.held('down')) y += 1;
    x += this.padAxis.x; y += this.padAxis.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },

  update(dt) {
    for (const a in this.buffer) this.buffer[a] -= dt;
    this.pollGamepad();
  },

  // Controller: left stick / d-pad move, A = dash, B = hop, X or RB = break, Start = pause
  pollGamepad() {
    if (!navigator.getGamepads) return;
    let pad = null;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) if (pads[i]) { pad = pads[i]; break; }
    if (!pad) { this.padAxis.x = this.padAxis.y = 0; this.padDown = {}; return; }
    const dz = (v) => (Math.abs(v) < 0.25 ? 0 : v);
    const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    this.padAxis.x = dz(pad.axes[0] || 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
    this.padAxis.y = dz(pad.axes[1] || 0) + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
    const now = { dash: b(0), hop: b(1) || b(4), brk: b(2) || b(5), pause: b(9), retry: b(3) };
    for (const a in now) {
      if (now[a] && !this.padPrev[a]) this.press(a);
      this.padPrev[a] = now[a];
    }
    this.padDown = now;
  }
};
