'use strict';
/* =====================================================================
   ASHEN DEPTHS — core utilities, input, audio, music, save system
   ===================================================================== */
/* window.HW_BUILD is set by scripts/build.js: { env, version, commit, date, home } */
const BUILD = Object.assign({ env: 'live', version: 'dev', commit: '', date: '', home: '' }, window.HW_BUILD || {});
const TAU = Math.PI * 2;
const TS = 16; // tile size in world pixels
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n >= 100000 ? (n / 1000).toFixed(0) + 'k' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toLocaleString('en-US');
const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let UID = 1;

/** Seeded xorshift RNG so dungeon floors can be regenerated from a seed (used by the save system). */
function RNG(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  const f = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = a => a[Math.floor(f() * a.length)];
  f.chance = p => f() < p;
  return f;
}
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function weightedPick(items, wf, r = Math.random) {
  let t = 0; for (const it of items) t += wf(it);
  let v = r() * t;
  for (const it of items) { v -= wf(it); if (v <= 0) return it; }
  return items[items.length - 1];
}

/* ---------------- INPUT ---------------- */
const Input = {
  keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, rdown: false },
  init(cv) {
    addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      Sfx.init();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; this.mouse.rdown = false; });
    cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; });
    cv.addEventListener('mousedown', e => {
      Sfx.init();
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) { this.mouse.rdown = true; this.pressed.Mouse2 = true; }
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; if (e.button === 2) this.mouse.rdown = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
  },
  tap(c) { if (this.pressed[c]) { this.pressed[c] = false; return true; } return false; },
  end() { this.pressed = {}; }
};

/* ---------------- AUDIO: generated retro sound effects (Web Audio API) ---------------- */
const Sfx = {
  ctx: null, out: null, sfx: null, mus: null, noiseBuf: null, last: {},
  init() {
    if (this.ctx) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      this.ctx = new C();
      this.out = this.ctx.createGain(); this.out.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.out);
      this.mus = this.ctx.createGain(); this.mus.connect(this.out);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = n;
      this.applyVol();
      if (Music.want) { const w = Music.want; Music.cur = null; Music.play(w.key, w.def); }
    } catch (e) { this.ctx = null; }
  },
  applyVol() { if (!this.ctx) return; const s = Save.data.settings; this.sfx.gain.value = s.sfx; this.mus.gain.value = s.music * 0.55; },
  tone(f, d, type = 'square', v = .15, slide = 0, delay = 0, dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + d + .03);
  },
  noise(d, v = .2, freq = 2000, delay = 0, type = 'lowpass', dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * .5); s.stop(t + d + .03);
  },
  play(n) {
    if (!this.ctx) return;
    const now = performance.now();
    if (this.last[n] && now - this.last[n] < 45) return;
    this.last[n] = now;
    switch (n) {
      case 'swing': this.noise(.09, .12, 3200, 0, 'bandpass'); break;
      case 'hit': this.noise(.08, .22, 1400); this.tone(150, .08, 'square', .07, -70); break;
      case 'crit': this.noise(.12, .3, 2600); this.tone(560, .12, 'square', .09, -320); break;
      case 'hurt': this.tone(220, .2, 'sawtooth', .16, -150); this.noise(.15, .2, 800); break;
      case 'shoot': this.tone(900, .08, 'triangle', .06, -500); break;
      case 'arrow': this.noise(.07, .12, 5000, 0, 'highpass'); break;
      case 'coin': this.tone(988, .05, 'square', .06); this.tone(1318, .1, 'square', .06, 0, .05); break;
      case 'chest': this.tone(330, .1, 'square', .1); this.tone(440, .1, 'square', .1, 0, .08); this.tone(660, .25, 'square', .1, 0, .16); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .22, 'square', .09, 0, i * .08)); break;
      case 'cast': this.tone(300, .25, 'sine', .12, 600); this.noise(.2, .08, 4000, 0, 'bandpass'); break;
      case 'fire': this.noise(.35, .2, 900); this.tone(120, .3, 'sawtooth', .06, -60); break;
      case 'ice': this.tone(1600, .25, 'sine', .08, -800); this.tone(2400, .15, 'triangle', .05, -1000, .05); break;
      case 'zap': this.noise(.12, .18, 6000, 0, 'highpass'); this.tone(1200, .1, 'square', .06, -900); break;
      case 'boom': this.noise(.5, .4, 500); this.tone(70, .45, 'sine', .3, -40); break;
      case 'boss': this.tone(55, 1.4, 'sawtooth', .2, 20); this.tone(82, 1.4, 'square', .1, -20, .1); this.noise(1, .2, 300); break;
      case 'dash': this.noise(.15, .14, 1500, 0, 'bandpass'); break;
      case 'pickup': this.tone(660, .08, 'square', .07, 200); break;
      case 'potion': this.tone(400, .3, 'sine', .12, 500); break;
      case 'die': this.tone(200, .25, 'square', .07, -160); this.noise(.2, .12, 700); break;
      case 'door': this.tone(80, .3, 'square', .12, -20); this.noise(.3, .2, 400); break;
      case 'select': this.tone(660, .04, 'square', .05); break;
      case 'buy': this.tone(784, .08, 'square', .08); this.tone(1175, .15, 'square', .08, 0, .07); break;
      case 'error': this.tone(150, .2, 'square', .1); break;
      case 'shield': this.tone(500, .3, 'triangle', .1, 300); break;
      case 'heal': [392, 523, 659].forEach((f, i) => this.tone(f, .25, 'sine', .1, 0, i * .07)); break;
      case 'summon': this.tone(100, .5, 'sawtooth', .1, 200); this.noise(.4, .1, 600); break;
      case 'break': this.noise(.2, .25, 1500); this.tone(180, .1, 'square', .06, -80); break;
      case 'death': [330, 262, 196, 131].forEach((f, i) => this.tone(f, .4, 'square', .12, 0, i * .22)); break;
      case 'secret': [523, 659, 784, 988, 1318].forEach((f, i) => this.tone(f, .15, 'triangle', .08, 0, i * .07)); break;
      case 'spike': this.tone(400, .06, 'square', .05, -200); break;
      case 'legend': [392, 523, 784, 1046, 1568].forEach((f, i) => this.tone(f, .35, 'triangle', .1, 0, i * .09)); break;
      case 'step': this.noise(.04, .03, 600); break;
    }
  }
};

/* ---------------- MUSIC: tiny generative sequencer, one seeded track per region + boss tracks ---------------- */
const Music = {
  cur: null, timer: null, next: 0, step: 0, want: null,
  play(key, def) {
    this.want = { key, def };
    if (this.cur === key) return;
    this.stop(); this.cur = key;
    if (!Sfx.ctx) return;
    this.def = def; this.step = 0; this.next = Sfx.ctx.currentTime + .1;
    const r = RNG(def.seed);
    const lead = []; for (let i = 0; i < 32; i++) lead.push(r.chance(def.boss ? .62 : .22) ? r.int(0, def.scale.length * 2 - 1) : -1);
    const bass = []; for (let i = 0; i < 4; i++) bass.push(r.pick([0, 0, 2, 3, 4]));
    this.seq = { lead, bass };
    this.timer = setInterval(() => this.tick(), 60);
  },
  stop() { clearInterval(this.timer); this.timer = null; this.cur = null; },
  tick() {
    const c = Sfx.ctx; if (!c || !this.def) return;
    const d = this.def, spb = 60 / d.tempo / 4;
    const note = deg => { const n = d.scale.length; const o = Math.floor(deg / n); return d.root * Math.pow(2, (d.scale[((deg % n) + n) % n] + 12 * o) / 12); };
    if (this.next < c.currentTime - .5) this.next = c.currentTime + .05;
    while (this.next < c.currentTime + .25) {
      const s = this.step % 32, t = Math.max(0, this.next - c.currentTime);
      const b = this.seq.bass[Math.floor(s / 8)];
      if (s % 8 === 0) Sfx.tone(note(b) / 2, spb * 7.5, d.boss ? 'sawtooth' : 'triangle', d.boss ? .06 : .08, 0, t, Sfx.mus);
      if (d.boss && s % 2 === 0) Sfx.tone(note(b) * (s % 4 ? 1 : .5), spb * 1.5, 'square', .03, 0, t, Sfx.mus);
      const l = this.seq.lead[s];
      if (l >= 0) Sfx.tone(note(l) * 2, spb * (d.boss ? 1.8 : 6), d.boss ? 'square' : 'sine', d.boss ? .035 : .045, 0, t, Sfx.mus);
      if (d.boss) {
        if (s % 4 === 0) { Sfx.tone(110, .12, 'sine', .14, -70, t, Sfx.mus); }
        if (s % 4 === 2) Sfx.noise(.05, .05, 7000, t, 'highpass', Sfx.mus);
      } else if (s === 0) Sfx.tone(d.root / 4, spb * 30, 'sine', .07, 0, t, Sfx.mus);
      this.next += spb; this.step++;
    }
  }
};

/* ---------------- SAVE SYSTEM (localStorage, wrapped so the game still runs without it) ---------------- */
const Save = {
  key: 'ashen_depths_save_v1' + (BUILD.env === 'staging' ? '-staging' : ''), data: null, ok: true,
  def() {
    return {
      shards: 0, totalShards: 0, upgrades: {}, achievements: {}, bestiary: {}, armory: { cats: {}, uniques: {}, best: null },
      unlocked: 1, bossKills: {}, clsFloors: {},
      stats: { runs: 0, kills: 0, chests: 0, bestFloor: 0, bestEndless: 0, deaths: 0, legendaries: 0, elites: 0, bought: 0, bestTime: 0, victories: 0 },
      settings: { sfx: .6, music: .45, shake: 1, numbers: 1 },
      bonus: { luck: 0, dmg: 0, hp: 0, speed: 0 },
      last: { cls: 'warrior', region: 0, diff: 1, endless: 0 },
      run: null
    };
  },
  load() {
    let raw = null;
    try { raw = localStorage.getItem(this.key); } catch (e) { this.ok = false; }
    const d = this.def();
    if (raw) {
      try {
        const o = JSON.parse(raw);
        for (const k in d) if (o[k] !== undefined) d[k] = (typeof d[k] === 'object' && d[k] && !Array.isArray(d[k]) && o[k] && typeof o[k] === 'object') ? Object.assign(d[k], o[k]) : o[k];
      } catch (e) { /* corrupt save: start fresh */ }
    }
    this.data = d;
  },
  write() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { this.ok = false; } },
  reset() { const s = this.data.settings; this.data = this.def(); this.data.settings = s; this.write(); }
};
