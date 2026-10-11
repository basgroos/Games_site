// =============================================================
//  AUDIO — a tiny Web Audio synthesizer.
//  Instruments (kick, snare, bass...) are used by music.js.
//  Sound effects are in PS.Audio.sfx(name).
//  If audio is unavailable everything here silently does nothing,
//  and the game still plays normally.
// =============================================================
PS.mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

PS.Audio = {
  ctx: null,
  musicVol: 0.7,
  sfxVol: 0.8,
  _last: {},

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const c = (this.ctx = new AC());
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
      comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
      this.musicFilter = c.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 20000;
      this.musicFilter.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.musicFilter);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      // one second of white noise, reused by drums and effects
      const len = c.sampleRate;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    } catch (e) {
      this.ctx = null;
    }
  },

  applyVolumes() {
    const s = PS.Profile.settings;
    this.musicVol = s.music; this.sfxVol = s.sfx;
    if (!this.ctx) return;
    this.musicBus.gain.value = this.musicVol * 0.5;
    this.sfxBus.gain.value = this.sfxVol * 0.75;
    if (PS.game && PS.game.customAudio) PS.game.customAudio.volume = this.musicVol;
  },

  // muffle the music (used while paused / during slow-motion)
  muffle(amount) {
    if (!this.ctx) return;
    const f = amount > 0 ? PS.U.lerp(20000, 600, amount) : 20000;
    this.musicFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.04);
  },

  now() { return this.ctx ? this.ctx.currentTime + 0.01 : 0; },

  // ---------- building blocks ----------
  env(t, attack, decay, peak, bus) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(bus || this.musicBus);
    return g;
  },
  osc(type, freq, t, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  noiseSrc(t, dur, dest, type, freq, q) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 0.8;
    s.connect(f); f.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    return f;
  },

  // ---------- instruments (used by music.js) ----------
  kick(t, v = 1, bus) {
    if (!this.ctx) return;
    const g = this.env(t, 0.002, 0.32, 0.95 * v, bus);
    const o = this.osc('sine', 160, t, 0.35, g);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const c = this.env(t, 0.001, 0.02, 0.3 * v, bus);
    this.noiseSrc(t, 0.03, c, 'highpass', 3000);
  },
  snare(t, v = 1) {
    if (!this.ctx) return;
    this.noiseSrc(t, 0.2, this.env(t, 0.001, 0.18, 0.55 * v), 'bandpass', 1900, 0.7);
    const o = this.osc('triangle', 200, t, 0.1, this.env(t, 0.001, 0.08, 0.35 * v));
    o.frequency.exponentialRampToValueAtTime(130, t + 0.08);
  },
  clap(t, v = 1, bus) {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) this.noiseSrc(t + i * 0.012, 0.12, this.env(t + i * 0.012, 0.001, 0.09, 0.4 * v, bus), 'bandpass', 1300, 1.2);
  },
  hat(t, v = 1, open = false) {
    if (!this.ctx) return;
    const d = open ? 0.2 : 0.04;
    this.noiseSrc(t, d, this.env(t, 0.001, d, 0.28 * v), 'highpass', 7500);
  },
  // metronome "wood block" tick
  tick(t, freq, v = 1, bus) {
    if (!this.ctx) return;
    this.osc('sine', freq, t, 0.06, this.env(t, 0.001, 0.05, 0.4 * v, bus));
    this.osc('square', freq * 2.01, t, 0.03, this.env(t, 0.001, 0.02, 0.06 * v, bus));
  },
  bass(t, midi, dur, v = 1) {
    if (!this.ctx) return;
    const g = this.env(t, 0.005, dur, 0.5 * v);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    f.connect(g);
    this.osc('sawtooth', PS.mtof(midi), t, dur, f);
    this.osc('square', PS.mtof(midi) * 0.5, t, dur, f);
  },
  pluck(t, midi, dur, v = 1, type = 'square') {
    if (!this.ctx) return;
    const g = this.env(t, 0.003, dur, 0.22 * v);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    f.connect(g);
    this.osc(type, PS.mtof(midi), t, dur, f);
  },
  bell(t, midi, dur, v = 1) {
    if (!this.ctx) return;
    const fr = PS.mtof(midi);
    this.osc('sine', fr, t, dur, this.env(t, 0.002, dur, 0.22 * v));
    this.osc('sine', fr * 2.76, t, dur * 0.4, this.env(t, 0.002, dur * 0.4, 0.07 * v));
    this.osc('sine', fr * 5.4, t, dur * 0.2, this.env(t, 0.001, dur * 0.2, 0.03 * v));
  },
  pad(t, midis, dur, v = 1) {
    if (!this.ctx) return;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09 * v, t + Math.min(0.4, dur * 0.3));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1300;
    f.connect(g); g.connect(this.musicBus);
    for (const m of midis) {
      this.osc('sawtooth', PS.mtof(m) * 1.003, t, dur, f);
      this.osc('sawtooth', PS.mtof(m) * 0.997, t, dur, f);
    }
  },

  // ---------- sound effects ----------
  sfx(name, opt = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.005, B = this.sfxBus;
    // throttle effects that can fire many times per frame
    const minGap = { bossHit: 0.05, graze: 0.06, boom: 0.08, deny: 0.2, fire: 0.05 }[name] || 0;
    if (minGap && this._last[name] && t - this._last[name] < minGap) return;
    this._last[name] = t;

    switch (name) {
      case 'dash': {
        const f = this.noiseSrc(t, 0.14, this.env(t, 0.002, 0.13, 0.35, B), 'bandpass', 900, 1.5);
        f.frequency.exponentialRampToValueAtTime(4500, t + 0.12);
        break;
      }
      case 'perfect': {
        [72, 79, 84, 91].forEach((m, i) => this.osc('triangle', PS.mtof(m), t + i * 0.015, 0.5, this.env(t + i * 0.015, 0.002, 0.5, 0.18, B)));
        this.noiseSrc(t, 0.5, this.env(t, 0.001, 0.45, 0.25, B), 'highpass', 6000);
        const o = this.osc('sine', 1800, t, 0.25, this.env(t, 0.001, 0.25, 0.25, B));
        o.frequency.exponentialRampToValueAtTime(4800, t + 0.2);
        break;
      }
      case 'perfectHop': {
        [67, 74, 79].forEach((m, i) => this.osc('triangle', PS.mtof(m), t + i * 0.02, 0.35, this.env(t + i * 0.02, 0.002, 0.35, 0.15, B)));
        break;
      }
      case 'graze':
        this.osc('sine', 2400, t, 0.05, this.env(t, 0.001, 0.05, 0.08, B));
        break;
      case 'hop': {
        const o = this.osc('sine', 300, t, 0.2, this.env(t, 0.005, 0.18, 0.25, B));
        o.frequency.exponentialRampToValueAtTime(700, t + 0.15);
        break;
      }
      case 'land': {
        const o = this.osc('sine', 180, t, 0.12, this.env(t, 0.002, 0.1, 0.25, B));
        o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
        break;
      }
      case 'break': {
        const o = this.osc('sawtooth', 1600, t, 0.45, this.env(t, 0.005, 0.4, 0.22, B));
        o.frequency.exponentialRampToValueAtTime(120, t + 0.4);
        const f = this.noiseSrc(t, 0.5, this.env(t, 0.01, 0.45, 0.3, B), 'bandpass', 6000, 2);
        f.frequency.exponentialRampToValueAtTime(300, t + 0.45);
        this.kick(t, 0.7, B);
        break;
      }
      case 'deny':
        this.osc('square', 140, t, 0.12, this.env(t, 0.002, 0.1, 0.12, B));
        break;
      case 'hurt': {
        const o = this.osc('sawtooth', 220, t, 0.4, this.env(t, 0.001, 0.38, 0.4, B));
        o.frequency.exponentialRampToValueAtTime(40, t + 0.35);
        this.noiseSrc(t, 0.3, this.env(t, 0.001, 0.25, 0.5, B), 'lowpass', 1500);
        break;
      }
      case 'bossHit': {
        const o = this.osc('square', 520 + Math.random() * 80, t, 0.08, this.env(t, 0.001, 0.07, 0.12, B));
        o.frequency.exponentialRampToValueAtTime(160, t + 0.07);
        break;
      }
      case 'core':
        [76, 83, 88].forEach((m, i) => this.osc('sine', PS.mtof(m), t + i * 0.04, 0.25, this.env(t + i * 0.04, 0.002, 0.22, 0.16, B)));
        break;
      case 'boom':
        this.kick(t, 0.6, B);
        this.noiseSrc(t, 0.25, this.env(t, 0.001, 0.22, 0.25, B), 'lowpass', 900);
        break;
      case 'warn':
        this.osc('square', 880, t, 0.05, this.env(t, 0.001, 0.05, 0.05, B));
        break;
      case 'phase': {
        this.kick(t, 1, B); this.clap(t, 1, B);
        const o = this.osc('sawtooth', 80, t, 1.2, this.env(t, 0.02, 1.1, 0.3, B));
        o.frequency.exponentialRampToValueAtTime(640, t + 1.0);
        break;
      }
      case 'defeat': {
        this.kick(t, 1, B);
        this.noiseSrc(t, 2.2, this.env(t, 0.005, 2.1, 0.6, B), 'lowpass', 2500);
        [57, 64, 69, 72, 76].forEach((m, i) => this.osc('triangle', PS.mtof(m), t + 0.2 + i * 0.06, 2.4, this.env(t + 0.2 + i * 0.06, 0.02, 2.3, 0.12, B)));
        break;
      }
      case 'death': {
        const o = this.osc('sawtooth', 400, t, 1.2, this.env(t, 0.001, 1.1, 0.4, B));
        o.frequency.exponentialRampToValueAtTime(30, t + 1.1);
        this.noiseSrc(t, 0.8, this.env(t, 0.001, 0.7, 0.5, B), 'lowpass', 800);
        break;
      }
      case 'count':
        this.tick(t, opt.high ? 1760 : 1175, 1, B);
        break;
      case 'ui':
        this.osc('triangle', opt.high ? 1320 : 880, t, 0.06, this.env(t, 0.001, 0.06, 0.12, B));
        break;
      case 'unlock':
        [72, 76, 79, 84].forEach((m, i) => this.bell(t + i * 0.08, m, 0.6, 1));
        break;
    }
  }
};
