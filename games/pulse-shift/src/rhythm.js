// =============================================================
//  BEAT CLOCK — the single shared rhythm timer.
//
//  Everything musical uses this one clock:
//    - the music (one call per 16th note)
//    - boss attack scheduling: clock.after(beats, fn)
//    - visual pulses: clock.pulse
//
//  It runs on game time (not audio time), so the game plays
//  exactly the same with sound off.
// =============================================================
PS.BeatClock = class {
  constructor() {
    this.listeners = []; // functions called on every 16th note step
    this.reset(120, 0);
  }

  reset(bpm, startBeat = 0) {
    this.bpm = bpm;
    this.beat = startBeat;                 // current position in beats (float)
    this.step = Math.floor(startBeat * 4) - 1; // last 16th note that fired
    this.queue = [];                       // scheduled callbacks
    this.running = false;
    this._base = null;
  }

  get beatDur() { return 60 / this.bpm; }       // seconds per beat
  get beatInBar() { return PS.U.mod(Math.floor(this.beat), 4); }
  get bar() { return Math.floor(this.beat / 4); }
  // 1 right on the beat, fading to 0 before the next one
  get pulse() { const f = this.beat - Math.floor(this.beat); return Math.pow(1 - f, 3); }

  setBpm(bpm) { this.bpm = bpm; } // the beat position is preserved

  // Run fn after `beats` beats. If called during a beat event, timing is
  // measured from that exact beat, so patterns never drift off the grid.
  after(beats, fn) {
    const base = this._base !== null ? this._base : this.beat;
    this.queue.push({ beat: base + beats, fn });
  }

  update(dt) {
    if (!this.running) return;
    this.beat += (dt * this.bpm) / 60;

    // fire every 16th-note step we passed this frame
    const target = Math.floor(this.beat * 4);
    let guard = 0;
    while (this.step < target && guard++ < 64) {
      this.step++;
      this._base = this.step / 4;
      const s = this.step;
      const info = {
        step: s,
        sub: PS.U.mod(s, 4),               // 0 = on the beat, 2 = the "and"
        beatIndex: Math.floor(s / 4),
        beatInBar: PS.U.mod(Math.floor(s / 4), 4),
        bar: Math.floor(s / 16),
        stepInBar: PS.U.mod(s, 16),
        beatDur: this.beatDur,
        lag: (this.beat - s / 4) * this.beatDur // seconds since this step should have happened
      };
      for (let i = 0; i < this.listeners.length; i++) this.listeners[i](info);
      this._base = null;
    }

    // run scheduled callbacks that are due (in time order)
    if (this.queue.length) {
      const due = [];
      this.queue = this.queue.filter((q) => {
        if (q.beat <= this.beat) { due.push(q); return false; }
        return true;
      });
      due.sort((a, b) => a.beat - b.beat);
      for (const q of due) {
        this._base = q.beat;
        q.fn();
      }
      this._base = null;
    }
  }
};
