// =============================================================
//  Small helpers: math, saving, player profile
// =============================================================
// Seeded random numbers for everything that decides attacks.
// Same seed = same patterns, which keeps co-op players in sync.
// (Pure visuals like particles use Math.random instead.)
PS.rngState = 1;
PS.seed = function (s) { PS.rngState = (s >>> 0) || 1; };
PS.rng = function () { // mulberry32
  let t = (PS.rngState = (PS.rngState + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
PS.seed(Date.now());

PS.U = {
  TAU: Math.PI * 2,
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  // these use the SEEDED generator (PS.rng) so both co-op players get the same attacks
  rand: (a, b) => a + PS.rng() * (b - a),
  randInt: (a, b) => Math.floor(a + PS.rng() * (b - a + 1)),
  choose: (arr) => arr[Math.floor(PS.rng() * arr.length)],
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  // smallest signed difference between two angles
  angDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  // distance from point P to the line segment A-B
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  },
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  mod: (a, n) => ((a % n) + n) % n,

  _rgba: {},
  // '#ff00aa' + alpha -> 'rgba(...)' (cached)
  rgba(hex, a) {
    let c = this._rgba[hex];
    if (!c) {
      const h = hex.replace('#', '');
      c = this._rgba[hex] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  },
  formatTime(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    const sec = s - m * 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec.toFixed(1);
  }
};

// Build info from the Bas Games site (scripts/build.js sets window.HW_BUILD)
PS.BUILD = Object.assign({ env: 'live', version: 'dev', commit: '', date: '', home: '' }, window.HW_BUILD || {});

// localStorage wrapper that never crashes (private mode, blocked storage...)
// Staging uses its own save, so testing never touches your real progress.
PS.Store = {
  prefix: 'pulseshift' + (PS.BUILD.env === 'staging' ? '-staging' : '') + '.',
  load(key, fallback) {
    try {
      const s = window.localStorage.getItem(this.prefix + key);
      return s ? JSON.parse(s) : fallback;
    } catch (e) { return fallback; }
  },
  save(key, value) {
    try { window.localStorage.setItem(this.prefix + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
};

// Everything that persists between sessions
PS.Profile = {
  data: null,
  defaults() {
    return {
      settings: { shake: 1, flashes: true, music: 0.7, sfx: 0.8, ghost: true, hitbox: false, palette: 'neon', trail: 'ribbon' },
      records: {},                 // "mode:boss:difficulty" -> { score, rank, time }
      flags: {},                   // achievement flags used for unlocks
      lifetime: { perfects: 0, runs: 0, clears: 0 }
    };
  },
  load() {
    const d = PS.Store.load('profile', null) || {};
    const def = this.defaults();
    this.data = {
      settings: Object.assign(def.settings, d.settings || {}),
      records: d.records || {},
      flags: d.flags || {},
      lifetime: Object.assign(def.lifetime, d.lifetime || {})
    };
  },
  save() { PS.Store.save('profile', this.data); },
  get settings() { return this.data.settings; },
  palette() { return PS.CONFIG.palettes[this.data.settings.palette] || PS.CONFIG.palettes.neon; },
  isUnlocked(item) { return !item.unlock || !!this.data.flags[item.unlock.id]; }
};

PS.RANKS = ['C', 'B', 'A', 'S', 'S+'];
PS.rankValue = (r) => PS.RANKS.indexOf(r);
