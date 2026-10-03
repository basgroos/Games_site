/* =====================================================================
   Utilities, opslag, geluid en tekenwerk
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function fmt(n) { n = Math.round(n); if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M'; if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.', ',') + 'k'; return n.toLocaleString('nl-NL'); }
function fmtDmg(n) { if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k'; if (n >= 10) return String(Math.round(n)); return n.toFixed(n < 1 ? 1 : 0); }
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function shade(h, f) { const [r, g, b] = hexRgb(h); const m = f < 0 ? 0 : 255, t = Math.abs(f); return `rgb(${Math.round(r + (m - r) * t)},${Math.round(g + (m - g) * t)},${Math.round(b + (m - b) * t)})`; }
function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------------- Opslag & progressie ---------------- */
const SAVE_KEY = 'heldenwacht-save-v1' + (window.HW_BUILD && window.HW_BUILD.env === 'staging' ? '-staging' : '');
const Store = {
  data: null,
  defaults() {
    return {
      coins: 400,
      heroes: { vuist: { level: 1, copies: 1 }, pijl: { level: 1, copies: 1 } },
      team: ['vuist', 'pijl'],
      clears: {}, best: {},
      stats: { games: 0, wins: 0, pulls: 0, earned: 0, bossKills: 0, kills: 0, waves: 0, damage: 0, upgrades: 0, abilities: 0, raidsDone: 0, bossrushBest: 0, endlessBest: 0, highestWave: 0, fastest: {}, maxDmg: 0, maxModWin: 0, loginDays: 0, eventPurchases: 0, masteryXp: 0, coopRuns: 0, mythicRaid: false, flawlessHard: false },
      settings: { sfx: 0.6, music: 0.35, musicOn: true, dmgNums: true, fxHigh: true, shake: true, tips: true },
      tutorial: 0, pity: 0, pityCosmic: 0,
      xp: 0, level: 1, prestige: 0,
      tickets: { basic: 0, rare: 0, legendary: 0, cosmic: 0 }, tokens: 3, raidTokens: 0,
      skins: [], heroSkins: {}, titles: [], title: null, badges: [], traitsSeen: [], effects: {},
      quests: {}, ach: {}, ch: { day: null, week: null, perm: {} }, login: { last: null, day: 0 },
      ev: {}, secret: {}, raids: {}, raidShop: [], season: null, coop: { week: null, dmg: 0, runs: 0, claimed: false },
    };
  },
  load() {
    let d = null;
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    const def = this.defaults();
    this.data = d && typeof d === 'object' ? Object.assign(def, d) : def;
    this.data.settings = Object.assign(this.defaults().settings, this.data.settings || {});
    this.data.stats = Object.assign(this.defaults().stats, this.data.stats || {});
    const D0 = this.defaults();
    for (const k of ['tickets', 'ch', 'login', 'coop']) this.data[k] = Object.assign(D0[k], this.data[k] && typeof this.data[k] === 'object' ? this.data[k] : {});
    for (const k of ['skins', 'titles', 'badges', 'traitsSeen', 'raidShop']) if (!Array.isArray(this.data[k])) this.data[k] = [];
    for (const k of ['heroSkins', 'effects', 'quests', 'ach', 'ev', 'secret', 'raids']) if (!this.data[k] || typeof this.data[k] !== 'object') this.data[k] = {};
    this.data.team = (this.data.team || []).filter(id => HERO[id] && this.data.heroes[id]);
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* opslag niet beschikbaar */ } },
  reset() { this.data = this.defaults(); this.save(); },
};
const Progress = {
  cleared(mapId, di) { const c = Store.data.clears[mapId] || []; return c.includes(DIFFS[di].id); },
  clearedAtLeast(mapId, di) { for (let i = di; i < DIFFS.length; i++) if (this.cleared(mapId, i)) return true; return false; },
  mapUnlocked(i) { return i === 0 || this.clearedAtLeast(MAPS[i - 1].id, 1); },
  diffUnlocked(mi, di) { if (!this.mapUnlocked(mi)) return false; if (di <= 1) return true; return this.clearedAtLeast(MAPS[mi].id, di - 1); },
  stars(mapId) { return DIFFS.reduce((s, d, i) => s + (this.cleared(mapId, i) ? 1 : 0), 0); },
  gachaUnlocked(g) { return !g.unlock || this.clearedAtLeast(g.unlock.map, g.unlock.diff); },
  unlockText(g) { const m = MAPS.find(x => x.id === g.unlock.map); return `Haal ${m.name} op ${DIFFS[g.unlock.diff].name}`; },
  totalStars() { return MAPS.reduce((s, m) => s + this.stars(m.id), 0); },
};
function heroLevel(id) { return (Store.data.heroes[id] || {}).level || 1; }

/* Actief event: wisselt elke week (maandag). */
function currentEvent() {
  const WEEK = 7 * 864e5, epoch = Date.UTC(2024, 0, 1); // maandag
  const idx = Math.floor((Date.now() - epoch) / WEEK);
  const ev = EVENTS[((idx % EVENTS.length) + EVENTS.length) % EVENTS.length];
  const ends = epoch + (idx + 1) * WEEK;
  return Object.assign({ ends }, ev);
}
function timeLeft(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d > 0 ? `${d}d ${h}u ${m}m` : `${h}u ${m}m ${s % 60}s`; }

/* ---------------- Hero stats ---------------- */
const STAT_DEFAULTS = { dmg: 0, range: 2, rate: 1, pierce: 1, multi: 1, splash: 0, chains: 0, slow: 0, slowDur: 1.2, burn: 0, burnDur: 3, crit: 0, critMult: 2, stunChance: 0, stun: 0, air: false, knock: 0, shred: 0, cleave: 0, beams: 1, projSpeed: 12,
  income: 0, bounty: 0, heal: 0, buffRange: 0, buffRate: 0, buffDmg: 0, execute: 0, fork: 0, clones: 0, cloneTime: 0, earlyBoost: 0 };
function computeStats(def, tier, level, buffs, trait) {
  const s = Object.assign({}, STAT_DEFAULTS, def.base);
  for (let i = 0; i < tier; i++) {
    const m = def.upgrades[i].mods;
    for (const k in m) { if (typeof m[k] === 'boolean') s[k] = m[k]; else s[k] = (s[k] || 0) + m[k]; }
  }
  const lm = 1 + (level - 1) * 0.07;
  s.dmg *= lm; s.burn *= lm;
  if (trait) applyTraitStats(s, def, trait);
  if (buffs) for (const b of buffs) {
    if (b.rateMul) s.rate *= b.rateMul;
    if (b.chains) s.chains += b.chains;
    if (b.multi) s.multi += b.multi;
    if (b.crit != null) s.crit = Math.max(s.crit, b.crit);
    if (b.dmgMul) s.dmg *= b.dmgMul;
  }
  s.slow = Math.min(0.8, s.slow);
  return s;
}
function applyTraitStats(s, def, T) {
  const m = T.m;
  if (m.dmgPct) s.dmg *= 1 + m.dmgPct;
  if (m.ratePct) s.rate *= 1 + m.ratePct;
  if (m.rangePct && s.range < 90) s.range *= 1 + m.rangePct;
  if (m.crit) s.crit += m.crit;
  if (m.critMult) s.critMult += m.critMult;
  if (m.bossPct) s.bossPct += m.bossPct;
  if (m.bounty) s.bounty += m.bounty;
  if (m.shred) s.shred += m.shred;
  if (m.slow) { s.slow = Math.max(s.slow, m.slow); s.slowDur = Math.max(s.slowDur, m.slowDur || 1); }
  if (m.stunChance) { s.stunChance += m.stunChance; s.stun = Math.max(s.stun, m.stun || 0.5); }
  if (m.burnPct) s.burn += s.dmg * m.burnPct * (def.style === 'beam' ? 0.5 : Math.min(2, s.rate));
  if (m.multiAdd) { if (def.style === 'beam') s.beams += m.multiAdd; else if (def.style === 'melee') s.cleave += 0.6 * m.multiAdd; else if (def.style === 'chain') s.chains += 2 * m.multiAdd; else if (def.style === 'aura') s.range += 0.4 * m.multiAdd; else s.multi += m.multiAdd; }
  if (m.splashAdd) { if (def.style === 'melee') s.cleave += m.splashAdd; else if (def.style !== 'aura' && def.style !== 'beam') s.splash += m.splashAdd; }
  s.proc = m.proc || null;
}
function earlyFactor(wave) { return Math.max(0, 1 - Math.max(0, wave - 1) / 14); }
function estDps(def, s) {
  if (def.style === 'beam') return s.dmg * s.beams * 1.6 + s.burn * s.beams;
  if (def.style === 'beam') return s.dmg * s.beams * 1.6 * (1 + s.chains * 0.5) + s.burn * s.beams;
  let per = s.dmg * (1 + s.crit * (s.critMult - 1)) * (1 + s.fork * 0.4);
  let targets = s.multi;
  if (def.style === 'chain') targets = 1 + s.chains * 0.8;
  if (s.splash > 0 || s.cleave > 0) targets *= 1.8;
  if (def.style === 'aura') targets = 3;
  return per * s.rate * targets + s.burn * Math.min(targets, 3);
}

/* ---------------- Geluid (Web Audio synth) ---------------- */
const Sfx = {
  ac: null, out: null, mus: null, last: {}, nbuf: null,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ac = new AC();
      this.out = this.ac.createGain(); this.out.connect(this.ac.destination);
      this.mus = this.ac.createGain(); this.mus.connect(this.ac.destination);
      const len = this.ac.sampleRate * 1; this.nbuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVol(); Music.start();
    } catch (e) { this.ac = null; }
  },
  applyVol() { if (!this.ac) return; const s = Store.data.settings; this.out.gain.value = s.sfx * 0.45; this.mus.gain.value = s.musicOn ? s.music * 0.22 : 0; },
  tone(f, d, type = 'square', v = 0.3, f2 = null, delay = 0, dest = null) {
    const ac = this.ac, t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || this.out); o.start(t); o.stop(t + d + 0.05);
  },
  noise(d, v = 0.3, freq = 1200, type = 'lowpass', delay = 0) {
    const ac = this.ac, t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.nbuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  },
  play(name) {
    if (!this.ac || Store.data.settings.sfx <= 0) return;
    const now = performance.now(); if (this.last[name] && now - this.last[name] < 55) return; this.last[name] = now;
    const T = this.tone.bind(this), N = this.noise.bind(this);
    switch (name) {
      case 'click': T(660, 0.05, 'square', 0.12); break;
      case 'place': T(220, 0.08, 'square', 0.2); T(440, 0.12, 'square', 0.18, null, 0.06); N(0.1, 0.2, 800); break;
      case 'sell': T(700, 0.08, 'triangle', 0.2); T(500, 0.1, 'triangle', 0.18, null, 0.07); break;
      case 'error': T(160, 0.15, 'sawtooth', 0.15); break;
      case 'upgrade': [523, 659, 784].forEach((f, i) => T(f, 0.12, 'square', 0.14, null, i * 0.06)); break;
      case 'bigupgrade': [523, 659, 784, 1046, 1318].forEach((f, i) => T(f, 0.16, 'square', 0.14, null, i * 0.06)); N(0.5, 0.15, 5000, 'highpass', 0.2); break;
      case 'punch': N(0.08, 0.35, 900); T(120, 0.08, 'sine', 0.3, 60); break;
      case 'shoot': T(900, 0.06, 'triangle', 0.08, 500); break;
      case 'bullet': T(1400, 0.03, 'square', 0.05, 800); break;
      case 'zap': N(0.12, 0.2, 3000, 'bandpass'); T(1200, 0.1, 'sawtooth', 0.08, 300); break;
      case 'freeze': T(1800, 0.25, 'sine', 0.1, 900); T(2400, 0.2, 'sine', 0.06, 1200, 0.03); break;
      case 'boom': N(0.35, 0.45, 500); T(90, 0.3, 'sine', 0.35, 40); break;
      case 'bigboom': N(0.9, 0.6, 400); T(70, 0.8, 'sine', 0.5, 25); break;
      case 'strike': N(0.25, 0.4, 2500, 'bandpass'); T(200, 0.25, 'sawtooth', 0.15, 60); break;
      case 'laser': T(300, 0.4, 'sawtooth', 0.15, 1200); T(600, 0.35, 'square', 0.08, 2000); break;
      case 'fire': N(0.2, 0.2, 1500); break;
      case 'void': T(160, 0.35, 'sine', 0.25, 50); T(80, 0.4, 'triangle', 0.2, 40); break;
      case 'hum': T(220, 0.2, 'sawtooth', 0.04, 230); break;
      case 'shield': T(1500, 0.15, 'triangle', 0.12, 400); break;
      case 'death': T(300, 0.1, 'square', 0.06, 120); break;
      case 'leak': T(200, 0.3, 'sawtooth', 0.25, 80); break;
      case 'boss': T(55, 1.2, 'sawtooth', 0.3, 45); T(82, 1.2, 'square', 0.12, 60); N(1, 0.2, 300); break;
      case 'bossdie': N(1.2, 0.6, 700); [392, 523, 659, 784].forEach((f, i) => T(f, 0.3, 'square', 0.14, null, 0.3 + i * 0.1)); break;
      case 'wave': T(392, 0.12, 'square', 0.15); T(523, 0.2, 'square', 0.15, null, 0.1); break;
      case 'coin': T(988, 0.06, 'square', 0.1); T(1318, 0.12, 'square', 0.1, null, 0.05); break;
      case 'ability': T(300, 0.4, 'sawtooth', 0.2, 900); N(0.4, 0.2, 2000); break;
      case 'ult': T(150, 0.9, 'sawtooth', 0.25, 800); T(300, 0.9, 'square', 0.1, 1600); N(1, 0.3, 1500); [523, 784, 1046].forEach((f, i) => T(f, 0.3, 'square', 0.12, null, 0.4 + i * 0.08)); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => T(f, 0.22, 'square', 0.16, null, i * 0.13)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => T(f, 0.35, 'triangle', 0.2, null, i * 0.22)); break;
      case 'gacha': N(0.8, 0.2, 1200, 'bandpass'); T(200, 0.8, 'square', 0.1, 800); break;
      case 'r-common': T(523, 0.15, 'square', 0.14); break;
      case 'r-uncommon': T(523, 0.12, 'square', 0.14); T(659, 0.15, 'square', 0.14, null, 0.08); break;
      case 'r-rare': [523, 659, 784].forEach((f, i) => T(f, 0.15, 'square', 0.14, null, i * 0.07)); break;
      case 'r-epic': [523, 659, 784, 988].forEach((f, i) => T(f, 0.18, 'square', 0.15, null, i * 0.07)); break;
      case 'r-legendary': [523, 659, 784, 1046, 1318].forEach((f, i) => T(f, 0.25, 'square', 0.16, null, i * 0.08)); N(0.8, 0.2, 6000, 'highpass', 0.3); break;
      case 'r-exotic': [330, 440, 554, 659, 880, 1108, 1318, 1760].forEach((f, i) => T(f, 0.3, 'triangle', 0.18, null, i * 0.07)); N(1.4, 0.3, 7000, 'highpass', 0.2); T(55, 1.4, 'sine', 0.5, 35); break;
      case 'r-ultra': [262, 330, 392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => T(f, 0.4, 'square', 0.14, null, i * 0.09)); [131, 196].forEach(f => T(f, 2, 'sawtooth', 0.2, f * 1.5)); N(2, 0.35, 5000, 'highpass', 0.1); break;
      case 'cosmic': T(80, 1.5, 'sawtooth', 0.3, 800); T(40, 1.8, 'sine', 0.5, 30); N(1.5, 0.4, 3000); break;
      case 'r-mythic': [392, 523, 659, 784, 1046, 1318, 1568].forEach((f, i) => T(f, 0.3, 'square', 0.16, null, i * 0.08)); N(1.2, 0.3, 6000, 'highpass', 0.3); T(60, 1.2, 'sine', 0.4, 40); break;
    }
  },
};
const Music = {
  timer: null, step: 0,
  prog: [[110, 220, 262, 330], [87.3, 175, 220, 262], [130.8, 196, 262, 330], [98, 196, 247, 294]],
  start() { if (this.timer) return; this.timer = setInterval(() => this.tick(), 170); },
  tick() {
    const S = Sfx; if (!S.ac || !Store.data.settings.musicOn || document.hidden) return;
    const bar = Math.floor(this.step / 16) % 4, st = this.step % 16, ch = this.prog[bar];
    if (st % 4 === 0) S.tone(ch[0], 0.32, 'triangle', 0.5, null, 0, S.mus);
    if (st % 2 === 0) S.tone(ch[1 + (st / 2) % 3] * 2, 0.12, 'square', 0.12, null, 0, S.mus);
    if (st === 6 || st === 14) S.tone(ch[3] * 4, 0.08, 'square', 0.05, null, 0, S.mus);
    this.step++;
  },
};

/* ---------------- Particles ---------------- */
class FX {
  constructor() { this.p = []; }
  add(o) { if (this.p.length > 1400) return; o.life = o.life || 0.6; o.max = o.life; o.vx = o.vx || 0; o.vy = o.vy || 0; this.p.push(o); }
  burst(x, y, color, n = 10, spd = 120, size = 3, life = 0.5, type = 'dot', g = 0) {
    n = Math.ceil(n * (Store.data.settings.fxHigh ? 1 : 0.35));
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7); this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: size * (0.6 + Math.random() * 0.8), color, life: life * (0.6 + Math.random() * 0.6), type, g }); }
  }
  ring(x, y, r, color, life = 0.4, w = 3) { this.add({ type: 'ring', x, y, r1: r, color, life, w }); }
  update(dt) {
    const p = this.p;
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i]; q.life -= dt;
      if (q.life <= 0) { p[i] = p[p.length - 1]; p.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt;
      const dr = q.drag == null ? 2.2 : q.drag; q.vx *= Math.max(0, 1 - dr * dt); q.vy *= Math.max(0, 1 - dr * dt);
    }
  }
  draw(ctx) {
    for (const q of this.p) {
      const f = q.life / q.max; ctx.globalAlpha = Math.min(1, f * 1.4);
      switch (q.type) {
        case 'ring': ctx.strokeStyle = q.color; ctx.lineWidth = q.w * f + 0.5; circle(ctx, q.x, q.y, lerp(q.r1, 4, f)); ctx.stroke(); break;
        case 'spark': ctx.strokeStyle = q.color; ctx.lineWidth = q.size * 0.6; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); ctx.stroke(); break;
        case 'smoke': ctx.fillStyle = q.color; ctx.globalAlpha = f * 0.5; circle(ctx, q.x, q.y, q.size * (2 - f)); ctx.fill(); break;
        case 'glow': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = q.color; circle(ctx, q.x, q.y, q.size * (0.5 + f * 0.5)); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        case 'star': { ctx.fillStyle = q.color; const s = q.size * f + 1; ctx.beginPath(); ctx.moveTo(q.x, q.y - s * 2); ctx.lineTo(q.x + s * 0.5, q.y - s * 0.5); ctx.lineTo(q.x + s * 2, q.y); ctx.lineTo(q.x + s * 0.5, q.y + s * 0.5); ctx.lineTo(q.x, q.y + s * 2); ctx.lineTo(q.x - s * 0.5, q.y + s * 0.5); ctx.lineTo(q.x - s * 2, q.y); ctx.lineTo(q.x - s * 0.5, q.y - s * 0.5); ctx.fill(); break; }
        case 'snow': ctx.strokeStyle = q.color; ctx.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + q.life; ctx.beginPath(); ctx.moveTo(q.x - Math.cos(a) * q.size, q.y - Math.sin(a) * q.size); ctx.lineTo(q.x + Math.cos(a) * q.size, q.y + Math.sin(a) * q.size); ctx.stroke(); } break;
        case 'bat': { ctx.fillStyle = q.color; const f = Math.sin(q.life * 30) * q.size; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.size * 1.6, q.y - f); ctx.lineTo(q.x - q.size * 0.6, q.y + q.size * 0.4); ctx.lineTo(q.x, q.y + q.size * 0.2); ctx.lineTo(q.x + q.size * 0.6, q.y + q.size * 0.4); ctx.lineTo(q.x + q.size * 1.6, q.y - f); ctx.closePath(); ctx.fill(); break; }
        case 'bubble': ctx.strokeStyle = q.color; ctx.lineWidth = 1; circle(ctx, q.x + Math.sin(q.life * 8) * 2, q.y, q.size); ctx.stroke(); break;
        case 'text': ctx.fillStyle = q.color; ctx.font = `700 ${q.size}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.fillText(q.text, q.x, q.y); break;
        default: ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
/* idle-effecten per held */
function idleFx(fx, type, x, y, color) {
  switch (type) {
    case 'spark': fx.add({ type: 'spark', x: x + rnd(-10, 10), y: y + rnd(-22, 4), vx: rnd(-80, 80), vy: rnd(-80, 30), size: 2.5, color: '#fde047', life: 0.25 }); break;
    case 'frost': fx.add({ type: 'snow', x: x + rnd(-14, 14), y: y + rnd(-20, 6), vy: 12, size: 3, color: '#e0f2fe', life: 0.9, drag: 0 }); break;
    case 'ember': fx.add({ type: 'glow', x: x + rnd(-10, 10), y: y + rnd(-10, 6), vx: rnd(-10, 10), vy: rnd(-45, -25), size: 3, color: '#fb923c', life: 0.8, drag: 0 }); break;
    case 'shadow': fx.add({ type: 'smoke', x: x + rnd(-10, 10), y: y + rnd(-6, 10), vy: -12, size: 4, color: '#312e81', life: 0.9, drag: 0 }); break;
    case 'star': fx.add({ type: 'star', x: x + rnd(-16, 16), y: y + rnd(-26, 6), size: 1.6, color: '#fff7c2', life: 0.6 }); break;
    case 'void': { const a = rnd(0, TAU); fx.add({ type: 'glow', x: x + Math.cos(a) * 22, y: y - 6 + Math.sin(a) * 14, vx: -Math.cos(a) * 30, vy: -Math.sin(a) * 20, size: 2.2, color, life: 0.7, drag: 0 }); break; }
    case 'steam': fx.add({ type: 'smoke', x: x + rnd(-8, 8), y: y - 10, vx: rnd(-8, 8), vy: -25, size: 3, color: '#cbd5e1', life: 0.8, drag: 0 }); break;
    case 'leaf': fx.add({ type: 'dot', x: x + rnd(-14, 14), y: y - 22, vx: rnd(-15, 15), vy: 18, size: 3, color: '#86efac', life: 1, drag: 0 }); break;
    case 'gold': fx.add({ type: 'glow', x: x + rnd(-14, 14), y: y + rnd(-24, 4), vy: -8, size: 2, color: '#fcd34d', life: 0.7, drag: 0 }); break;
    case 'smoke': fx.add({ type: 'smoke', x: x + rnd(-6, 6), y: y - 6, vy: -18, size: 3, color: '#6b7280', life: 0.8, drag: 0 }); break;
    case 'wind': { const a = rnd(0, TAU); fx.add({ type: 'spark', x: x + Math.cos(a) * 16, y: y - 6 + Math.sin(a) * 8, vx: -Math.sin(a) * 90, vy: Math.cos(a) * 45, size: 2, color: '#cffafe', life: 0.35 }); break; }
    case 'prism': fx.add({ type: 'star', x: x + rnd(-18, 18), y: y + rnd(-28, 6), vy: -10, size: 2, color: `hsl(${Math.floor(rnd(0, 360))},100%,75%)`, life: 0.8 }); break;
    case 'bats': { const a = rnd(0, TAU); fx.add({ type: 'bat', x: x + Math.cos(a) * 14, y: y - 16 + Math.sin(a) * 6, vx: rnd(-40, 40), vy: rnd(-30, -10), size: 3, color: '#1c1917', life: 0.9, drag: 0.5 }); break; }
    case 'bubbles': fx.add({ type: 'bubble', x: x + rnd(-12, 12), y: y + rnd(-6, 10), vx: rnd(-6, 6), vy: rnd(-40, -25), size: rnd(1.5, 3.2), color: '#a5f3fc', life: 1, drag: 0 }); break;
    case 'confetti': fx.add({ type: 'dot', x: x + rnd(-14, 14), y: y - 24, vx: rnd(-20, 20), vy: rnd(10, 30), size: 3, color: ['#f472b6', '#fbbf24', '#60a5fa', '#34d399'][Math.floor(rnd(0, 4))], life: 1, drag: 0 }); break;
    case 'dust': if (Math.random() < 0.5) fx.add({ type: 'dot', x: x + rnd(-10, 10), y: y + 14, vx: rnd(-20, 20), vy: -8, size: 2, color: '#a8a29e', life: 0.4 }); break;
  }
}

/* ---------------- Emblemen ---------------- */
function drawEmblem(ctx, type, r, color) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (type) {
    case 'fist': rr(ctx, -r * 0.8, -r * 0.6, r * 1.6, r * 1.2, r * 0.35); ctx.fill(); break;
    case 'arrow': ctx.moveTo(r, 0); ctx.lineTo(-r * 0.2, -r * 0.8); ctx.lineTo(-r * 0.2, -r * 0.3); ctx.lineTo(-r, -r * 0.3); ctx.lineTo(-r, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.8); ctx.fill(); break;
    case 'cross': ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); break;
    case 'bolt': ctx.moveTo(r * 0.3, -r); ctx.lineTo(-r * 0.6, r * 0.15); ctx.lineTo(0, r * 0.15); ctx.lineTo(-r * 0.3, r); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(0, -r * 0.2); ctx.closePath(); ctx.fill(); break;
    case 'snow': for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); } ctx.stroke(); break;
    case 'bomb': ctx.arc(-r * 0.1, r * 0.15, r * 0.75, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.4); ctx.lineTo(r * 0.8, -r * 0.9); ctx.stroke(); break;
    case 'hex': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); break;
    case 'moon': ctx.arc(0, 0, r, Math.PI * 0.3, Math.PI * 1.7); ctx.arc(r * 0.45, 0, r * 0.72, Math.PI * 1.45, Math.PI * 0.55, true); ctx.closePath(); ctx.fill(); break;
    case 'sun': ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.lineWidth = r * 0.2; ctx.stroke(); break;
    case 'ring': ctx.arc(0, 0, r * 0.75, 0, TAU); ctx.lineWidth = r * 0.28; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.fill(); break;
    case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); break;
    case 'clock': ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.lineWidth = r * 0.22; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.6); ctx.moveTo(0, 0); ctx.lineTo(r * 0.45, 0); ctx.stroke(); break;
    case 'diamond': ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.fill(); break;
    case 'void': ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.lineWidth = r * 0.25; ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.1, r * 0.35, 0, TAU); ctx.fill(); break;
    case 'dollar': case 'omega': case 'infinity': case 'eye-t': { ctx.font = `900 ${Math.round(r * 2)}px Barlow, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText({ dollar: '$', omega: 'Ω', infinity: '∞' }[type] || '?', 0, r * 0.08); break; }
    case 'eye': ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); ctx.lineWidth = r * 0.22; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, TAU); ctx.fill(); break;
    case 'wind': ctx.lineWidth = r * 0.22; ctx.arc(0, 0, r * 0.8, 0.2, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 1.2, Math.PI * 2.2); ctx.stroke(); break;
    case 'wing': ctx.moveTo(-r * 0.9, r * 0.5); ctx.quadraticCurveTo(-r * 0.2, -r * 1.1, r, -r * 0.8); ctx.quadraticCurveTo(r * 0.3, -r * 0.2, r * 0.6, r * 0.1); ctx.quadraticCurveTo(0, 0, -r * 0.9, r * 0.5); ctx.fill(); break;
    case 'tri': ctx.moveTo(0, -r); ctx.lineTo(r * 0.9, r * 0.7); ctx.lineTo(-r * 0.9, r * 0.7); ctx.closePath(); ctx.lineWidth = r * 0.24; ctx.stroke(); ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.25, 0, TAU); ctx.fill(); break;
    case 'flame': ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, 0, r * 0.4, r * 0.8); ctx.quadraticCurveTo(0, r, -r * 0.4, r * 0.8); ctx.quadraticCurveTo(-r * 0.9, 0, 0, -r); ctx.fill(); break;
  }
}

/* ---------------- Superheld tekenen ----------------
   o: { tier, atk (0..1), ang, seed, stun, pulse }  — lokale coördinaten 1 = 1px bij schaal 1 (tegel = 40px) */
const EDGE = '#05040d';
function drawHero(ctx, H, x, y, s, t, o = {}) {
  const L = o.look || H.look, tier = o.tier || 0, atk = o.atk || 0, ang = o.ang == null ? 0.3 : o.ang, seed = o.seed || 0;
  const face = Math.cos(ang) < -0.05 ? -1 : 1;
  const k = s * (1 + tier * 0.035) * (L.big ? 1.12 : 1);
  const bob = Math.sin(t * 3.2 + seed) * 1.4;
  ctx.save(); ctx.translate(x, y);
  // schaduw
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 15 * s, 12 * k, 4.5 * k, 0, 0, TAU); ctx.fill();
  // aura's bij upgrades
  if (tier >= 3) {
    ctx.save(); ctx.strokeStyle = rgba(L.suit2, 0.75); ctx.lineWidth = 2 * s; ctx.setLineDash([6 * s, 5 * s]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.ellipse(0, 14 * s, 19 * k, 7 * k, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  if (tier >= 5) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -6 * s, 2, 0, -6 * s, 34 * k); g.addColorStop(0, rgba(L.suit2, 0.45 + Math.sin(t * 4) * 0.1)); g.addColorStop(1, rgba(L.suit2, 0));
    ctx.fillStyle = g; circle(ctx, 0, -6 * s, 34 * k); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = t * 2.2 + i * TAU / 5; ctx.fillStyle = '#fff3a0'; circle(ctx, Math.cos(a) * 21 * k, -4 * s + Math.sin(a) * 8 * k, 2 * s); ctx.fill(); }
    ctx.restore();
  }
  if (H.special && !o.ghost) drawSpecial(ctx, H, s, k, t, seed, o);
  if (L.overlay === 'legend' || L.overlay === 'moon') drawOverlay(ctx, L, 'back', k, s, t, seed);
  // aanval-uitval
  let lx = 0, ly = 0;
  if (atk > 0) { const m = H.style === 'melee' ? 8 : H.style === 'projectile' || H.style === 'splash' ? -3 : 0; lx = Math.cos(ang) * atk * m * s; ly = Math.sin(ang) * atk * m * s * 0.5; }
  ctx.translate(lx, ly + bob * s * 0.6);
  if (o.pulse) { const p = 1 + o.pulse * 0.12; ctx.scale(p, p); }
  ctx.scale(face, 1);
  const K = k;
  // vleugels
  if (L.wings) {
    const fl = Math.sin(t * 6 + seed) * 0.25;
    ctx.fillStyle = rgba(L.suit2, 0.85);
    for (const sd of [-1, 1]) { ctx.save(); ctx.rotate(sd * (0.2 + fl)); ctx.beginPath(); ctx.moveTo(0, -4 * K); ctx.quadraticCurveTo(sd * 26 * K, -22 * K, sd * 24 * K, 2 * K); ctx.quadraticCurveTo(sd * 14 * K, -4 * K, 0, 2 * K); ctx.fill(); ctx.restore(); }
  }
  // cape
  if (L.cape) {
    const len = (14 + (tier >= 3 ? 6 : 0)) * K, fl = Math.sin(t * 4 + seed) * 3 * K;
    ctx.fillStyle = L.cape; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(-6 * K, -7 * K); ctx.lineTo(6 * K, -7 * K);
    ctx.quadraticCurveTo(4 * K, len * 0.6, -2 * K + fl * 0.4, 8 * K + len * 0.55);
    ctx.lineTo(-14 * K + fl, 6 * K + len * 0.5); ctx.quadraticCurveTo(-12 * K, 0, -6 * K, -7 * K); ctx.fill(); ctx.stroke();
  }
  // halo (mythic)
  if (L.halo || tier >= 5) {
    ctx.save(); ctx.strokeStyle = tier >= 5 ? '#ffe066' : rgba(L.suit2, 0.9); ctx.lineWidth = 2.2 * s; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 10 * s;
    ctx.beginPath(); ctx.ellipse(0, -27 * K + Math.sin(t * 2) * 1.2, 8 * K, 2.6 * K, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  if (L.overlay === 'comic') drawOverlay(ctx, L, 'back', K, s, t, seed);
  // benen
  const dark = shade(L.suit, -0.45);
  ctx.fillStyle = dark; rr(ctx, -6 * K, 6 * K, 5 * K, 9 * K, 2 * K); ctx.fill(); rr(ctx, 1 * K, 6 * K, 5 * K, 9 * K, 2 * K); ctx.fill();
  ctx.fillStyle = L.suit2; rr(ctx, -6.5 * K, 12 * K, 6 * K, 3.5 * K, 1.5 * K); ctx.fill(); rr(ctx, 0.5 * K, 12 * K, 6 * K, 3.5 * K, 1.5 * K); ctx.fill();
  // achterste arm
  ctx.strokeStyle = shade(L.suit, -0.2); ctx.lineWidth = 4.5 * K; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5 * K, -4 * K); ctx.lineTo(-10 * K, 3 * K); ctx.stroke();
  ctx.fillStyle = L.suit2; circle(ctx, -10 * K, 3.5 * K, 2.8 * K); ctx.fill();
  // romp
  ctx.fillStyle = L.suit; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6 * s;
  rr(ctx, -8 * K, -8 * K, 16 * K, 16 * K, 5 * K); ctx.fill(); ctx.stroke();
  ctx.fillStyle = L.suit2; ctx.fillRect(-8 * K, 4 * K, 16 * K, 2.6 * K);
  if (tier >= 1) { ctx.fillStyle = L.suit2; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.ellipse(5 * K, -7 * K, 4.5 * K, 3 * K, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  // embleem
  ctx.save(); ctx.translate(0, -1.5 * K);
  ctx.fillStyle = L.suit2; circle(ctx, 0, 0, 4.6 * K); ctx.fill();
  if (tier >= 2) { ctx.shadowColor = L.suit2; ctx.shadowBlur = 8 * s; }
  drawEmblem(ctx, L.emblem, 3 * K, L.suit); ctx.restore();
  // hoofd
  const hy = -15 * K;
  ctx.fillStyle = L.skin; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6 * s; circle(ctx, 0, hy, 7.5 * K); ctx.fill(); ctx.stroke();
  drawHair(ctx, L, K, hy, t, seed, s);
  // ogen / masker
  if (L.hair !== 'ninja' && L.hair !== 'visor') {
    if (L.mask) { ctx.fillStyle = L.mask; rr(ctx, -2 * K, hy - 3.5 * K, 10 * K, 4 * K, 2 * K); ctx.fill(); }
    if (L.goggles) { ctx.fillStyle = '#fde68a'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1 * s; circle(ctx, 2 * K, hy - 1.5 * K, 2.3 * K); ctx.fill(); ctx.stroke(); circle(ctx, 6 * K, hy - 1.5 * K, 2.1 * K); ctx.fill(); ctx.stroke(); }
    else {
      ctx.fillStyle = tier >= 4 ? L.suit2 : '#fff'; if (tier >= 4) { ctx.shadowColor = L.suit2; ctx.shadowBlur = 8 * s; }
      ctx.beginPath(); ctx.ellipse(2 * K, hy - 1.5 * K, 1.4 * K, 1.8 * K, 0, 0, TAU); ctx.ellipse(5.6 * K, hy - 1.5 * K, 1.2 * K, 1.7 * K, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (L.glasses) { // bril: donkere montuur om beide ogen met een brugje
      ctx.save(); ctx.strokeStyle = L.glasses === true ? '#111827' : L.glasses; ctx.lineWidth = 0.9 * K; ctx.fillStyle = 'rgba(186,230,253,.25)';
      ctx.beginPath(); ctx.arc(2 * K, hy - 1.5 * K, 2.4 * K, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(6.2 * K, hy - 1.5 * K, 2.2 * K, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4.4 * K, hy - 1.8 * K); ctx.lineTo(4 * K, hy - 1.8 * K); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.4 * K, hy - 1.8 * K); ctx.lineTo(-3.5 * K, hy - 2.4 * K); ctx.stroke(); ctx.restore();
    }
  }
  // voorste arm + wapen
  drawArmWeapon(ctx, H, K, s, t, atk, tier, L);
  if (L.overlay) drawOverlay(ctx, L, 'front', K, s, t, seed, hy);
  // arm-banden
  if (tier >= 4) { ctx.fillStyle = L.suit2; circle(ctx, -10 * K, 1 * K, 1.6 * K); ctx.fill(); }
  // verdoofd
  if (o.stun) { ctx.fillStyle = '#ffe066'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; circle(ctx, Math.cos(a) * 9 * K, hy - 10 * K + Math.sin(a) * 3 * K, 1.8 * K); ctx.fill(); } }
  ctx.restore();
}
/* Exotic/Ultra: extra spectaculaire visuals rond de held */
function drawSpecial(ctx, H, s, k, t, seed, o) {
  const L = o.look || H.look;
  if (L.special === 'prism' || H.special === 'prism') {
    ctx.save(); ctx.lineWidth = 3 * s;
    for (let i = 0; i < 12; i++) { ctx.strokeStyle = `hsla(${(i * 30 + t * 120) % 360},100%,65%,.8)`; ctx.beginPath(); ctx.ellipse(0, 14 * s, 21 * k, 7.5 * k, 0, i * TAU / 12, (i + 1) * TAU / 12); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { const a = t * 1.8 + i * TAU / 3; ctx.save(); ctx.translate(Math.cos(a) * 20 * k, -8 * s + Math.sin(a) * 8 * k); ctx.rotate(a * 2); ctx.fillStyle = `hsla(${(i * 120 + t * 90) % 360},100%,70%,.9)`; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8 * s; ctx.beginPath(); ctx.moveTo(0, -6 * s); ctx.lineTo(3.5 * s, 0); ctx.lineTo(0, 6 * s); ctx.lineTo(-3.5 * s, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  if (H.special === 'phantom') {
    for (let i = 0; i < 2; i++) { const off = Math.sin(t * 2.5 + i * Math.PI) * 9 * s; ctx.save(); ctx.globalAlpha *= 0.28; drawHero(ctx, H, off, -Math.abs(off) * 0.2, s, t - 0.15 * (i + 1), Object.assign({}, o, { ghost: true, atk: 0 })); ctx.restore(); }
    ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = '#4c1d95'; for (let i = 0; i < 5; i++) { const a = t + i * 1.3; circle(ctx, Math.cos(a) * 14 * k, 12 * s + Math.sin(a * 1.7) * 3 * s, (3 + Math.sin(a * 3)) * s); ctx.fill(); } ctx.restore();
  }
  if (H.special === 'cosmic') {
    ctx.save();
    // runencirkel op de grond
    ctx.translate(0, 14 * s); ctx.scale(1, 0.36);
    ctx.strokeStyle = rgba(L.suit2, 0.85); ctx.lineWidth = 2 * s; ctx.shadowColor = L.suit2; ctx.shadowBlur = 10 * s;
    circle(ctx, 0, 0, 28 * k); ctx.stroke(); circle(ctx, 0, 0, 22 * k); ctx.stroke();
    ctx.save(); ctx.rotate(t * 0.6); ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * TAU / 6 * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 22 * k, Math.sin(a) * 22 * k); } ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22 * k, Math.sin(a) * 22 * k); ctx.lineTo(Math.cos(a) * 28 * k, Math.sin(a) * 28 * k); ctx.stroke(); } ctx.restore();
    ctx.restore();
    // lichtvleugels
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fl = Math.sin(t * 2.2 + seed) * 0.15;
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(0, -8 * s); ctx.rotate(sd * (0.15 + fl)); const g = ctx.createLinearGradient(0, 0, sd * 34 * k, -20 * k); g.addColorStop(0, rgba(L.suit2, 0.7)); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g;
      for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * (22 + f * 6) * k, (-26 + f * 10) * k, sd * (34 - f * 4) * k, (-14 + f * 12) * k); ctx.quadraticCurveTo(sd * 16 * k, (-2 + f * 4) * k, 0, 4 * k); ctx.fill(); } ctx.restore(); }
    for (let i = 0; i < 6; i++) { const a = -t * 1.4 + i * TAU / 6; ctx.fillStyle = i % 2 ? '#ffffff' : L.suit2; circle(ctx, Math.cos(a) * 26 * k, -10 * s + Math.sin(a) * 10 * k, (1.6 + Math.sin(t * 5 + i)) * s); ctx.fill(); }
    ctx.restore();
  }
}
/* Skin-overlays: extra onderdelen die een skin aan de held toevoegt */
function drawOverlay(ctx, L, phase, K, s, t, seed, hy) {
  const ov = L.overlay; ctx.save();
  if (phase === 'back') {
    if (ov === 'legend') { ctx.globalCompositeOperation = 'lighter'; for (const sd of [-1, 1]) { ctx.save(); ctx.translate(0, -8 * s); ctx.rotate(sd * (0.2 + Math.sin(t * 2 + seed) * 0.1)); const g = ctx.createLinearGradient(0, 0, sd * 30 * K, -16 * K); g.addColorStop(0, rgba(L.suit2, 0.65)); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * 24 * K, -26 * K, sd * 32 * K, -8 * K); ctx.quadraticCurveTo(sd * 16 * K, 0, 0, 4 * K); ctx.fill(); ctx.restore(); } }
    if (ov === 'moon') { ctx.fillStyle = 'rgba(239,68,68,.55)'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16 * s; circle(ctx, 0, -20 * K, 13 * K); ctx.fill(); }
    if (ov === 'comic') { ctx.strokeStyle = 'rgba(17,24,39,.45)'; ctx.lineWidth = 1.5 * s; for (let i = 0; i < 5; i++) { const y = -18 * K + i * 7 * K; ctx.beginPath(); ctx.moveTo(-12 * K, y); ctx.lineTo(-24 * K - (i % 2) * 5 * K, y); ctx.stroke(); } }
    ctx.restore(); return;
  }
  switch (ov) {
    case 'neon': ctx.strokeStyle = L.suit2; ctx.shadowColor = L.suit2; ctx.shadowBlur = 10 * s; ctx.lineWidth = 1.4 * s; rr(ctx, -8.5 * K, -8.5 * K, 17 * K, 17 * K, 5 * K); ctx.stroke(); circle(ctx, 0, hy, 8 * K); ctx.stroke(); break;
    case 'shine': { const a = t * 1.7 + seed; ctx.globalCompositeOperation = 'lighter'; ctx.translate(Math.cos(a) * 8 * K, -6 * K + Math.sin(a * 1.3) * 7 * K); ctx.rotate(t); drawEmblem(ctx, 'star', (1.5 + Math.abs(Math.sin(t * 3)) * 2) * K, '#fffbeb'); break; }
    case 'legend': ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2 * s; ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 12 * s; ctx.beginPath(); ctx.ellipse(0, hy - 11 * K + Math.sin(t * 2) * K, 8 * K, 2.4 * K, 0, 0, TAU); ctx.stroke(); break;
    case 'bats': for (let i = 0; i < 2; i++) { const a = t * 2.5 + i * Math.PI + seed; ctx.save(); ctx.translate(Math.cos(a) * 14 * K, hy - 4 * K + Math.sin(a) * 5 * K); const f = Math.sin(t * 16 + i) * 0.6; ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4 * K, -2 * K - f * 2 * K); ctx.lineTo(-2 * K, 1 * K); ctx.lineTo(0, 0.5 * K); ctx.lineTo(2 * K, 1 * K); ctx.lineTo(4 * K, -2 * K - f * 2 * K); ctx.closePath(); ctx.fill(); ctx.restore(); } break;
    case 'santahat': ctx.fillStyle = '#dc2626'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(-7 * K, hy - 5 * K); ctx.quadraticCurveTo(0, hy - 17 * K, 9 * K, hy - 11 * K); ctx.lineTo(7 * K, hy - 5 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f8fafc'; rr(ctx, -8 * K, hy - 7 * K, 16 * K, 3.5 * K, 1.5 * K); ctx.fill(); circle(ctx, 9 * K, hy - 11 * K, 2 * K); ctx.fill(); break;
    case 'shades': ctx.fillStyle = '#0f172a'; rr(ctx, -0.5 * K, hy - 3.5 * K, 4.5 * K, 3 * K, 1.2 * K); ctx.fill(); rr(ctx, 4.5 * K, hy - 3.5 * K, 4 * K, 3 * K, 1.2 * K); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0.5 * K, hy - 3 * K, 1.2 * K, 0.8 * K); break;
    case 'partyhat': ctx.fillStyle = '#ec4899'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1 * s; ctx.beginPath(); ctx.moveTo(-4.5 * K, hy - 6 * K); ctx.lineTo(1 * K, hy - 19 * K); ctx.lineTo(5.5 * K, hy - 6 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fbbf24'; ctx.fillRect(-2.6 * K, hy - 11 * K, 7 * K, 1.4 * K); circle(ctx, 1 * K, hy - 19.5 * K, 1.8 * K); ctx.fill(); break;
    case 'comic': ctx.strokeStyle = EDGE; ctx.lineWidth = 2.6 * s; rr(ctx, -8.4 * K, -8.4 * K, 16.8 * K, 16.8 * K, 5 * K); ctx.stroke(); circle(ctx, 0, hy, 7.9 * K); ctx.stroke(); break;
    case 'armor': ctx.fillStyle = '#94a3b8'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 7 * K, -7 * K, 5 * K, 3.2 * K, sd * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = L.suit2; ctx.fillRect(-1 * K, -7 * K, 2 * K, 10 * K); break;
    case 'bubblehelm': ctx.fillStyle = 'rgba(165,243,252,.18)'; ctx.strokeStyle = 'rgba(165,243,252,.9)'; ctx.lineWidth = 1.4 * s; circle(ctx, 0, hy, 10.5 * K); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-4 * K, hy - 5 * K, 2.5 * K, 1.2 * K, -0.6, 0, TAU); ctx.fill(); break;
    case 'galaxy': ctx.fillStyle = '#e0e7ff'; for (let i = 0; i < 7; i++) { const tw = Math.abs(Math.sin(t * 3 + i * 1.7 + seed)); circle(ctx, (-6 + ((i * 37) % 12)) * K, (-6 + ((i * 23) % 12)) * K, (0.4 + tw * 0.7) * K); ctx.fill(); } break;
    case 'laurel': ctx.fillStyle = '#65a30d'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.8 * s; for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) { const a = Math.PI + sd * (0.35 + i * 0.28); ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8.4 * K * sd * -1, hy + Math.sin(a) * 6 * K - 2 * K, 2.2 * K, 1 * K, a, 0, TAU); ctx.fill(); ctx.stroke(); } break;
    case 'dogtag': ctx.strokeStyle = '#d6d3d1'; ctx.lineWidth = 0.8 * s; ctx.beginPath(); ctx.moveTo(-3 * K, -8 * K); ctx.lineTo(0, -3 * K); ctx.lineTo(3 * K, -8 * K); ctx.stroke(); ctx.fillStyle = '#d6d3d1'; rr(ctx, -1.5 * K, -3.5 * K, 3 * K, 4 * K, 0.8 * K); ctx.fill(); break;
  }
  ctx.restore();
}
function drawHair(ctx, L, K, hy, t, seed, s) {
  const c = L.hairC; ctx.fillStyle = c; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s;
  switch (L.hair) {
    case 'spiky': ctx.beginPath(); ctx.moveTo(-8 * K, hy); for (let i = 0; i <= 5; i++) { const x = -8 * K + i * 3.2 * K; ctx.lineTo(x, hy - (i % 2 ? 7 : 12) * K + (i === 0 ? 6 * K : 0)); } ctx.lineTo(8 * K, hy - 2 * K); ctx.lineTo(6 * K, hy - 4 * K); ctx.lineTo(-6 * K, hy - 3 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'hood': ctx.beginPath(); ctx.arc(0, hy, 9 * K, Math.PI * 0.8, Math.PI * 2.1); ctx.lineTo(3 * K, hy - 4 * K); ctx.quadraticCurveTo(-3 * K, hy - 6 * K, -5 * K, hy + 2 * K); ctx.lineTo(-8 * K, hy + 6 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'helmet': ctx.beginPath(); ctx.arc(0, hy, 8.4 * K, Math.PI, 0); ctx.lineTo(8.4 * K, hy - 2 * K); ctx.lineTo(-8.4 * K, hy - 2 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.suit2; ctx.fillRect(-1.2 * K, hy - 8.6 * K, 2.4 * K, 6 * K); break;
    case 'visor': ctx.beginPath(); ctx.arc(0, hy, 8.4 * K, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = L.suit2; ctx.shadowColor = L.suit2; ctx.shadowBlur = 6 * s; rr(ctx, -3 * K, hy - 3.8 * K, 11 * K, 4 * K, 2 * K); ctx.fill(); ctx.shadowBlur = 0; break;
    case 'crystal': ctx.fillStyle = c; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3.2 * K - 2 * K, hy - 5 * K); ctx.lineTo(i * 3.2 * K, hy - (11 + (2 - Math.abs(i)) * 2.5) * K); ctx.lineTo(i * 3.2 * K + 2 * K, hy - 5 * K); ctx.fill(); ctx.stroke(); } ctx.fillStyle = shade(c, 0.4); ctx.beginPath(); ctx.arc(0, hy, 8 * K, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(0, hy - 4 * K); ctx.fill(); break;
    case 'ninja': { circle(ctx, 0, hy, 8 * K); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.skin; rr(ctx, -1 * K, hy - 4 * K, 9 * K, 4 * K, 2 * K); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(2 * K, hy - 2.8 * K, 2 * K, 1.4 * K); ctx.fillRect(5.2 * K, hy - 2.8 * K, 1.8 * K, 1.4 * K);
      const fl = Math.sin(t * 6 + seed) * 3 * K; ctx.strokeStyle = L.suit2; ctx.lineWidth = 2 * K; ctx.beginPath(); ctx.moveTo(-7 * K, hy - 2 * K); ctx.quadraticCurveTo(-13 * K, hy - 4 * K + fl, -18 * K, hy + fl); ctx.stroke(); break; }
    case 'long': ctx.beginPath(); ctx.arc(0, hy, 8.2 * K, Math.PI * 0.9, Math.PI * 2.05); ctx.quadraticCurveTo(-4 * K, hy - 2 * K, -8 * K, hy + 4 * K); ctx.quadraticCurveTo(-12 * K + Math.sin(t * 3 + seed) * 2 * K, hy + 12 * K, -10 * K, hy + 14 * K); ctx.lineTo(-7 * K, hy + 2 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'flame': { const f1 = Math.sin(t * 9 + seed) * 2 * K, f2 = Math.cos(t * 11 + seed) * 2 * K;
      ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 10 * s; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-8 * K, hy - 1 * K); ctx.quadraticCurveTo(-10 * K, hy - 12 * K, -5 * K + f1, hy - 18 * K); ctx.quadraticCurveTo(-3 * K, hy - 10 * K, 0, hy - 20 * K + f2); ctx.quadraticCurveTo(3 * K, hy - 11 * K, 6 * K + f2, hy - 16 * K); ctx.quadraticCurveTo(10 * K, hy - 8 * K, 8 * K, hy - 1 * K); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(c, 0.5); ctx.beginPath(); ctx.moveTo(-4 * K, hy - 3 * K); ctx.quadraticCurveTo(0, hy - 14 * K + f1, 4 * K, hy - 3 * K); ctx.fill(); ctx.restore(); break; }
    case 'witch': ctx.beginPath(); ctx.arc(0, hy, 8.2 * K, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, hy - 5 * K, 12 * K, 2.5 * K, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6 * K, hy - 6 * K); ctx.lineTo(-2 * K + Math.sin(t * 2 + seed) * 1.5 * K, hy - 20 * K); ctx.lineTo(-7 * K, hy - 24 * K); ctx.lineTo(1 * K, hy - 19 * K); ctx.lineTo(6 * K, hy - 6 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f97316'; ctx.fillRect(-6 * K, hy - 8.5 * K, 12 * K, 2 * K); break;
    case 'santa': ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, hy, 8.2 * K, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-7 * K, hy - 5 * K); ctx.quadraticCurveTo(0, hy - 18 * K, 10 * K, hy - 12 * K + Math.sin(t * 3 + seed) * K); ctx.lineTo(7 * K, hy - 5 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f8fafc'; rr(ctx, -8 * K, hy - 7 * K, 16 * K, 3.5 * K, 1.5 * K); ctx.fill(); circle(ctx, 10 * K, hy - 12 * K + Math.sin(t * 3 + seed) * K, 2.2 * K); ctx.fill(); break;
    case 'cap': ctx.beginPath(); ctx.arc(0, hy - 1 * K, 8 * K, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); rr(ctx, 2 * K, hy - 3.5 * K, 11 * K, 3 * K, 1.5 * K); ctx.fill(); ctx.stroke(); break;
    case 'dome': ctx.save(); ctx.fillStyle = 'rgba(191,219,254,.25)'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.6 * s; circle(ctx, 0, hy, 11 * K); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-4 * K, hy - 5 * K, 3 * K, 1.5 * K, -0.6, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#5b3a1f'; ctx.beginPath(); ctx.arc(0, hy, 7.6 * K, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); break;
    case 'crown': ctx.beginPath(); ctx.arc(0, hy, 8 * K, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#1a0b2e'; ctx.shadowColor = L.suit2; ctx.shadowBlur = 8 * s; ctx.beginPath(); ctx.moveTo(-7 * K, hy - 6 * K); ctx.lineTo(-6 * K, hy - 15 * K); ctx.lineTo(-2.5 * K, hy - 9 * K); ctx.lineTo(0, hy - 17 * K); ctx.lineTo(2.5 * K, hy - 9 * K); ctx.lineTo(6 * K, hy - 15 * K); ctx.lineTo(7 * K, hy - 6 * K); ctx.closePath(); ctx.fill();
      ctx.fillStyle = L.suit2; circle(ctx, 0, hy - 12 * K, 1.6 * K); ctx.fill(); ctx.restore(); break;
  }
}
function drawArmWeapon(ctx, H, K, s, t, atk, tier, L0) {
  const L = L0 || H.look;
  let hx = 9 * K, hy = 2 * K;
  const raised = H.style === 'chain' || H.style === 'strike' || H.style === 'aura';
  if (H.style === 'melee') { hx = (10 + atk * 7) * K; hy = (-1 - atk * 2) * K; }
  else if (raised) { hx = (7 + atk * 2) * K; hy = (-6 - atk * 8) * K; }
  else if (H.style === 'beam') { hx = 11 * K; hy = -3 * K; }
  else { hx = (11 + atk * 2) * K; hy = -2 * K; }
  ctx.strokeStyle = L.suit; ctx.lineWidth = 4.8 * K; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4 * K, -5 * K); ctx.lineTo(hx, hy); ctx.stroke();
  const glove = L.suit2;
  switch (L.weapon) {
    case 'fists': { const r = (L.big ? 4.4 : 3.6) * K * (1 + atk * 0.4); ctx.fillStyle = glove; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; circle(ctx, hx, hy, r); ctx.fill(); ctx.stroke();
      if (atk > 0.5) { ctx.strokeStyle = rgba('#ffffff', atk); ctx.lineWidth = 1.5 * s; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx + 5 * K, hy + i * 3 * K); ctx.lineTo(hx + 10 * K, hy + i * 4 * K); ctx.stroke(); } } break; }
    case 'bow': ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 2 * K; ctx.beginPath(); ctx.arc(hx - 2 * K, hy, 10 * K, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth = 0.8 * s; const pull = (1 - atk) * 4 * K; ctx.beginPath(); ctx.moveTo(hx + 2.5 * K, hy - 9 * K); ctx.lineTo(hx - pull, hy); ctx.lineTo(hx + 2.5 * K, hy + 9 * K); ctx.stroke(); break;
    case 'blaster': ctx.fillStyle = '#374151'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1 * s; rr(ctx, hx - 2 * K, hy - 2.5 * K, 11 * K, 4.5 * K, 1.5 * K); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.suit; ctx.fillRect(hx + 6 * K, hy - 1.5 * K, 3 * K, 2.5 * K);
      if (atk > 0.6) { ctx.fillStyle = '#fde047'; circle(ctx, hx + 11 * K, hy - 0.5 * K, 3 * K * atk); ctx.fill(); } ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); break;
    case 'rifle': ctx.fillStyle = '#27272a'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1 * s; rr(ctx, hx - 6 * K, hy - 2 * K, 22 * K, 3.6 * K, 1.2 * K); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.suit2; ctx.fillRect(hx + 1 * K, hy - 4.5 * K, 6 * K, 2.2 * K);
      if (atk > 0.6) { ctx.fillStyle = '#fef08a'; circle(ctx, hx + 18 * K, hy - 0.2 * K, 3.5 * K * atk); ctx.fill(); } ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); break;
    case 'shield': { ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); if (atk < 0.5) { ctx.save(); ctx.translate(hx + 3 * K, hy - 1 * K); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; for (const [r, c] of [[7, '#dc2626'], [5, '#f8fafc'], [3, '#1d4ed8']]) { ctx.fillStyle = c; circle(ctx, 0, 0, r * K); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#f8fafc'; drawEmblem(ctx, 'star', 2.2 * K, '#f8fafc'); ctx.restore(); } break; }
    case 'surf': { ctx.save(); ctx.translate(hx + 2 * K, hy - 2 * K); ctx.rotate(-0.9 + atk * 0.5); ctx.fillStyle = L.suit2; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.ellipse(0, -6 * K, 3.2 * K, 12 * K, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = L.suit; ctx.lineWidth = 1.5 * K; ctx.beginPath(); ctx.moveTo(0, -16 * K); ctx.lineTo(0, 4 * K); ctx.stroke(); ctx.restore(); ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); break; }
    case 'hammer': { ctx.save(); ctx.translate(hx, hy); ctx.rotate(-1.2 + atk * 1.9); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.4 * K; ctx.beginPath(); ctx.moveTo(0, 3 * K); ctx.lineTo(0, -14 * K); ctx.stroke(); ctx.fillStyle = '#9ca3af'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2 * s; rr(ctx, -6 * K, -19 * K, 12 * K, 7 * K, 1.5 * K); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.suit2; ctx.fillRect(-1.5 * K, -19 * K, 3 * K, 7 * K); ctx.restore(); ctx.fillStyle = glove; circle(ctx, hx, hy, 2.8 * K); ctx.fill(); break; }
    case 'grenade': ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); if (atk < 0.4) { ctx.fillStyle = '#4d7c0f'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1 * s; circle(ctx, hx + 1 * K, hy - 3.5 * K, 3.2 * K); ctx.fill(); ctx.stroke(); } break;
    case 'shuriken': { ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill(); ctx.save(); ctx.translate(hx + 3 * K, hy - 3 * K); ctx.rotate(t * 8); ctx.fillStyle = '#d4d4d8'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 1.2 * K : 4 * K; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); break; }
    case 'staff': ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2 * K; ctx.beginPath(); ctx.moveTo(hx, hy + 12 * K); ctx.lineTo(hx, hy - 14 * K); ctx.stroke(); ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill();
      ctx.save(); ctx.fillStyle = L.orb || '#fff'; ctx.shadowColor = L.orb || '#fff'; ctx.shadowBlur = (8 + atk * 14) * s; circle(ctx, hx, hy - 16 * K, (3 + atk * 1.5 + Math.sin(t * 5) * 0.4) * K); ctx.fill(); ctx.restore(); break;
    case 'orb': ctx.fillStyle = glove; circle(ctx, hx, hy, 2.6 * K); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.orb || '#fff'; ctx.shadowColor = L.orb || '#fff'; ctx.shadowBlur = (10 + atk * 16 + tier * 2) * s; circle(ctx, hx + 2 * K, hy - 5 * K + Math.sin(t * 4) * 1.2 * K, (2.8 + atk * 2 + tier * 0.25) * K); ctx.fill(); ctx.restore(); break;
    default: ctx.fillStyle = glove; circle(ctx, hx, hy, 2.8 * K); ctx.fill();
      if (raised) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(L.suit2, 0.5 + atk * 0.5); circle(ctx, hx, hy - 3 * K, (3 + atk * 3) * K); ctx.fill(); ctx.restore(); }
  }
}
/* Portret: statische afbeelding van een held op een canvas */
function drawPortrait(cv, id, opts = {}) {
  const H = HERO[id]; if (!H) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || +cv.getAttribute('width') || 100, h = cv.clientHeight || w;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const s = Math.min(w, h) / 44;
  drawHero(ctx, H, w / 2, h * 0.58, s, 0.6, { tier: opts.tier || 0, ang: 0.2, look: opts.skin ? resolveLook(H, opts.skin) : null });
  if (opts.silhouette) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#15122e'; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#3b3478'; ctx.font = `${Math.round(w * 0.3)}px Bungee, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', w / 2, h * 0.5); }
}
function hydratePortraits(root) {
  $$('canvas[data-portrait]', root).forEach(cv => drawPortrait(cv, cv.dataset.portrait, { tier: +cv.dataset.tier || 0, silhouette: cv.dataset.sil === '1', skin: cv.dataset.skin || null }));
  $$('canvas[data-enemy]', root).forEach(cv => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 28; cv.width = w * dpr; cv.height = w * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const E = ENEMIES[cv.dataset.enemy]; const sc = w / (E.r * 2.9 + 8);
    ctx.translate(w / 2, w / 2 + (E.flying ? 5 * sc : 2 * sc)); ctx.scale(sc, sc);
    drawEnemyBody(ctx, { type: cv.dataset.enemy, E, r: E.r, t: 0.5, hp: 1, maxHp: 1, shield: E.shield || 0, maxShield: E.shield || 0, flying: !!E.flying, dir: 0, boss: !!E.boss }, 0.5, true);
  });
}

/* ---------------- Vijanden tekenen ---------------- */
function drawEnemyBody(ctx, e, t, icon) {
  const E = e.E, r = e.r, c = E.color;
  ctx.save();
  if (e.flying && !icon) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 4, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill(); ctx.translate(0, -16); }
  else if (!icon) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill(); }
  const face = Math.cos(e.dir || 0) < -0.1 ? -1 : 1;
  const hop = e.flying ? Math.sin(t * 5) * 2 : -Math.abs(Math.sin(t * (6 + E.speed * 3))) * 2.2;
  ctx.translate(0, hop); ctx.scale(face, 1);
  ctx.strokeStyle = EDGE; ctx.lineWidth = 2;
  switch (E.drawAs || e.type) {
    case 'grunt': case 'mini': case 'splitter':
      ctx.fillStyle = c; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, -0.5); ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 1.02, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
      if (e.type === 'splitter') { ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(r * 0.1, -r * 0.3); ctx.lineTo(-r * 0.15, r * 0.2); ctx.lineTo(r * 0.15, r * 0.9); ctx.stroke(); }
      eyes(ctx, r, '#fff'); break;
    case 'runner':
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(r * 1.2, 0); ctx.quadraticCurveTo(r * 0.2, -r * 1.3, -r, -r * 0.4); ctx.quadraticCurveTo(-r * 1.2, r * 0.8, r * 1.2, 0); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 1.4, -r * 0.4 + i * r * 0.4); ctx.lineTo(-r * 2.2, -r * 0.4 + i * r * 0.4); ctx.stroke(); }
      eyes(ctx, r * 0.9, '#fff'); break;
    case 'tank':
      ctx.fillStyle = shade(c, -0.2); rr(ctx, -r, -r * 0.9, r * 2, r * 1.8, r * 0.35); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; rr(ctx, -r * 0.75, -r * 0.7, r * 1.5, r * 1.1, r * 0.25); ctx.fill();
      ctx.fillStyle = '#d4d4d8'; for (const [x, y] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) { circle(ctx, x * r * 0.9, y * r * 0.8, 1.6); ctx.fill(); }
      ctx.fillStyle = '#3f3f46'; ctx.fillRect(r * 0.4, -r * 0.2, r * 0.9, r * 0.35); ctx.fillStyle = '#ef4444'; circle(ctx, r * 0.2, -r * 0.2, r * 0.18); ctx.fill(); break;
    case 'flyer': {
      ctx.fillStyle = shade(c, -0.3); rr(ctx, -r * 0.7, -r * 0.45, r * 1.4, r * 0.9, r * 0.4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2; for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * r, y * r * 0.7); ctx.stroke(); ctx.save(); ctx.translate(x * r, y * r * 0.7); ctx.rotate(t * 30); ctx.strokeStyle = rgba('#e0f2fe', 0.8); ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = c; circle(ctx, 0, 0, r * 0.45); ctx.fill(); ctx.fillStyle = '#ef4444'; circle(ctx, r * 0.15, 0, r * 0.18); ctx.fill(); break; }
    case 'shield':
      ctx.fillStyle = c; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1e3a8a'; rr(ctx, -r * 0.6, -r * 0.55, r * 1.2, r * 0.5, 3); ctx.fill(); eyes(ctx, r, '#93c5fd');
      if (e.shield > 0) { ctx.save(); ctx.globalAlpha = 0.35 + 0.4 * (e.shield / Math.max(1, e.maxShield)); ctx.strokeStyle = '#7dd3fc'; ctx.fillStyle = 'rgba(125,211,252,.18)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } break;
    case 'healer':
      ctx.fillStyle = '#ecfdf5'; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); ctx.fillStyle = c; ctx.fillRect(-r * 0.2, -r * 0.65, r * 0.4, r * 1.3); ctx.fillRect(-r * 0.65, -r * 0.2, r * 1.3, r * 0.4);
      if (e.healPulse > 0) { ctx.strokeStyle = rgba('#34d399', e.healPulse); ctx.lineWidth = 2; circle(ctx, 0, 0, r + (1 - e.healPulse) * 40); ctx.stroke(); } break;
    case 'chaos': {
      ctx.fillStyle = '#f8fafc'; rr(ctx, -r * 0.8, -r * 0.2, r * 1.6, r * 1.2, r * 0.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fcd9b6'; circle(ctx, 0, -r * 0.45, r * 0.62); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.fillStyle = rgba(c, 0.85); ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.58, Math.PI, 0); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#365314'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.2 + i * r * 0.2, -r * 0.85, r * 0.15, 0, Math.PI); ctx.stroke(); }
      ctx.fillStyle = '#fde047'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; circle(ctx, r * 0.05, -r * 0.4, r * 0.18); ctx.fill(); ctx.stroke(); circle(ctx, r * 0.38, -r * 0.4, r * 0.16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#84cc16'; ctx.strokeStyle = EDGE; rr(ctx, r * 0.5, 0, r * 0.25, r * 0.5, 3); ctx.fill(); ctx.stroke();
      if (Math.sin(t * 7) > 0.7) { ctx.strokeStyle = '#bef264'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.1); ctx.lineTo(r * 1, -r * 0.5); ctx.lineTo(r * 0.8, -r * 0.6); ctx.lineTo(r * 1.2, -r); ctx.stroke(); } break; }
    case 'kolos': {
      ctx.fillStyle = '#78716c'; rr(ctx, -r, -r * 0.9, r * 2, r * 1.9, r * 0.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; rr(ctx, -r * 0.6, -r * 1.35, r * 1.2, r * 0.8, r * 0.2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.strokeStyle = '#fb923c'; ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 10; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.4); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r * 0.4, r * 0.5); ctx.moveTo(r * 0.5, -r * 0.6); ctx.lineTo(r * 0.2, r * 0.2); ctx.lineTo(r * 0.6, r * 0.7); ctx.stroke();
      ctx.fillStyle = '#fdba74'; circle(ctx, -r * 0.2, -r * 1.05, r * 0.1); ctx.fill(); circle(ctx, r * 0.25, -r * 1.05, r * 0.1); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#57534e'; const sw = Math.sin(t * 2) * r * 0.15; circle(ctx, r * 1.05, r * 0.2 + sw, r * 0.4); ctx.fill(); ctx.stroke(); circle(ctx, -r * 1.05, r * 0.2 - sw, r * 0.4); ctx.fill(); ctx.stroke(); break; }
    case 'wyrm': {
      const wing = Math.sin(t * 7) * 0.5;
      ctx.fillStyle = rgba('#7dd3fc', 0.85); for (const sd of [-1, 1]) { ctx.save(); ctx.scale(1, sd); ctx.rotate(-0.3 - wing * 0.5); ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(-r * 0.6, -r * 1.9); ctx.lineTo(r * 0.3, -r * 1.3); ctx.lineTo(r * 0.5, -r * 0.2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.65, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.3); ctx.lineTo(r * 1.6, 0); ctx.lineTo(r * 0.6, r * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fef08a'; circle(ctx, r * 0.95, -r * 0.1, r * 0.12); ctx.fill(); break; }
    case 'overlord': {
      ctx.save(); ctx.shadowColor = '#d946ef'; ctx.shadowBlur = 24; ctx.fillStyle = '#12051f'; circle(ctx, 0, 0, r); ctx.fill(); ctx.restore(); ctx.strokeStyle = '#d946ef'; ctx.lineWidth = 2.5; circle(ctx, 0, 0, r); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * TAU / 6; ctx.save(); ctx.translate(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); ctx.rotate(a * 2); ctx.fillStyle = '#a21caf'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#f0abfc'; ctx.beginPath(); ctx.ellipse(r * 0.1, 0, r * 0.45, r * 0.28, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#12051f'; circle(ctx, r * 0.18, 0, r * 0.16); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8); ctx.lineTo(-r * 0.4, -r * 1.35); ctx.lineTo(-r * 0.15, -r * 0.95); ctx.lineTo(0, -r * 1.45); ctx.lineTo(r * 0.15, -r * 0.95); ctx.lineTo(r * 0.4, -r * 1.35); ctx.lineTo(r * 0.6, -r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (e.shield > 0) { ctx.strokeStyle = rgba('#f0abfc', 0.7); ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = t * 30; circle(ctx, 0, 0, r * 1.8); ctx.stroke(); ctx.setLineDash([]); } break; }
    default: drawShape(ctx, e, t);
  }
  if (E.drawAs === 'chaos') { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#bef264', 0.5 + Math.sin(t * 6) * 0.3); ctx.lineWidth = 3; circle(ctx, 0, -r * 0.2, r * 1.3); ctx.stroke(); }
  ctx.restore();
}
function eyes(ctx, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(r * 0.28, -r * 0.2, r * 0.16, r * 0.22, 0, 0, TAU); ctx.ellipse(r * 0.68, -r * 0.2, r * 0.14, r * 0.2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#05040d'; circle(ctx, r * 0.33, -r * 0.17, r * 0.08); ctx.fill(); circle(ctx, r * 0.72, -r * 0.17, r * 0.07); ctx.fill(); }

/* ---------------- Map-achtergronden ---------------- */
const THEMES = {
  city:    { ground: '#2b2d42', g2: '#303350', path: '#1c1d2b', edge: '#555a78', amb: 'none',    sky: '#0b1030', label: 'Stad' },
  forest:  { ground: '#1f4d2b', g2: '#245a32', path: '#6b4f2a', edge: '#3f2c14', amb: 'firefly', sky: '#0a2014', label: 'Bos' },
  desert:  { ground: '#d8a45c', g2: '#dfb06b', path: '#b98643', edge: '#936528', amb: 'dust',    sky: '#4a2a10', label: 'Woestijn' },
  snow:    { ground: '#dbe6f1', g2: '#e7eef6', path: '#9fb4c9', edge: '#6e86a0', amb: 'snow',    sky: '#1d2b44', label: 'Besneeuwde bergen' },
  future:  { ground: '#0e1230', g2: '#121842', path: '#05060f', edge: '#22d3ee', amb: 'rain',    sky: '#050720', label: 'Futuristische stad' },
  volcano: { ground: '#2a1512', g2: '#331b16', path: '#150a09', edge: '#ff6a1a', amb: 'ember',   sky: '#1a0503', label: 'Vulkanisch gebied' },
};
function pathTilesOf(map) {
  const set = new Set();
  for (let i = 0; i < map.path.length - 1; i++) {
    const [x1, y1] = map.path[i], [x2, y2] = map.path[i + 1];
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1); let x = x1, y = y1;
    for (;;) { if (x >= 0 && y >= 0 && x < COLS && y < ROWS) set.add(x + ',' + y); if (x === x2 && y === y2) break; x += dx; y += dy; }
  }
  return set;
}
const MAP_CACHE = {};
function mapBackground(map) {
  if (MAP_CACHE[map.id]) return MAP_CACHE[map.id];
  const S = 2, cv = document.createElement('canvas'); cv.width = GW * S; cv.height = GH * S;
  const ctx = cv.getContext('2d'); ctx.scale(S, S);
  const th = THEMES[map.theme], rng = mulberry32(map.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const pathSet = pathTilesOf(map);
  ctx.fillStyle = th.ground; ctx.fillRect(0, 0, GW, GH);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2 === 0) { ctx.fillStyle = th.g2; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
  groundDetail(ctx, map.theme, rng, pathSet);
  // pad
  const pts = map.path.map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2]);
  const stroke = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.stroke(); };
  if (map.theme === 'future' || map.theme === 'volcano' || th.glow) { ctx.save(); ctx.shadowColor = th.edge; ctx.shadowBlur = 16; stroke(38, th.edge); ctx.restore(); stroke(33, th.path); }
  else { stroke(38, th.edge); stroke(32, th.path); }
  if (map.theme === 'city') { ctx.setLineDash([10, 12]); stroke(2, '#ffd23f'); ctx.setLineDash([]); }
  if (th.dash) { ctx.setLineDash([8, 12]); stroke(2.5, th.dash); ctx.setLineDash([]); }
  if (map.theme === 'future') { ctx.setLineDash([4, 16]); stroke(2, 'rgba(236,72,153,.7)'); ctx.setLineDash([]); }
  if (map.theme === 'desert' || map.theme === 'forest') { for (let i = 0; i < 260; i++) { const p = pathSetRandom(pathSet, rng); if (!p) break; ctx.fillStyle = 'rgba(0,0,0,.12)'; circle(ctx, p[0] * TILE + rng() * TILE, p[1] * TILE + 6 + rng() * 28, 1 + rng() * 1.6); ctx.fill(); } }
  if (map.theme === 'snow') { for (let i = 0; i < 120; i++) { const p = pathSetRandom(pathSet, rng); ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, p[0] * TILE + rng() * TILE, p[1] * TILE + 6 + rng() * 28, 1.5 + rng() * 2); ctx.fill(); } }
  // props (blokkeren plaatsing)
  const props = new Set();
  const near = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (pathSet.has((x + dx) + ',' + (y + dy))) return true; return false; };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const key = x + ',' + y; if (pathSet.has(key)) continue;
    const chance = near(x, y) ? 0.04 : 0.17;
    if (rng() < chance) { props.add(key); drawProp(ctx, map.theme, x * TILE + TILE / 2, y * TILE + TILE / 2, rng); }
  }
  const res = { canvas: cv, props, pathSet };
  MAP_CACHE[map.id] = res; return res;
}
function pathSetRandom(set, rng) { const arr = set._arr || (set._arr = Array.from(set).map(k => k.split(',').map(Number))); return arr[Math.floor(rng() * arr.length)]; }
function groundDetail(ctx, theme, rng, pathSet) {
  for (let i = 0; i < 180; i++) {
    const x = rng() * GW, y = rng() * GH; if (pathSet.has(Math.floor(x / TILE) + ',' + Math.floor(y / TILE))) continue;
    switch (theme) {
      case 'city': if (i < 40) { ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(x / TILE) * TILE + 2, Math.floor(y / TILE) * TILE + 2, TILE - 4, TILE - 4); } break;
      case 'forest': ctx.strokeStyle = 'rgba(134,239,172,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.stroke(); if (i % 9 === 0) { ctx.fillStyle = ['#f472b6', '#fde047', '#e0e7ff'][i % 3]; circle(ctx, x, y - 6, 2); ctx.fill(); } break;
      case 'desert': ctx.strokeStyle = 'rgba(146,95,40,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 10, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); break;
      case 'snow': ctx.fillStyle = 'rgba(148,170,196,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3, 0, 0, TAU); ctx.fill(); break;
      case 'future': if (i < 60) { ctx.strokeStyle = 'rgba(34,211,238,.10)'; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(x / TILE) * TILE + 0.5, Math.floor(y / TILE) * TILE + 0.5, TILE - 1, TILE - 1); } break;
      default: if (THEME_EXTRA[theme]) THEME_EXTRA[theme].ground(ctx, x, y, i, rng); break;
      case 'volcano': if (i % 3 === 0) { ctx.strokeStyle = 'rgba(255,106,26,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(-8, 8), y + 6); ctx.lineTo(x + rnd(-8, 8), y + 12); ctx.stroke(); } break;
    }
  }
}
function drawProp(ctx, theme, cx, cy, rng) {
  ctx.save(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5;
  const v = rng();
  switch (theme) {
    case 'city': {
      if (v < 0.75) {
        const cols = ['#4b4f73', '#5b4b73', '#3d5a73', '#6b5a48']; const c = cols[Math.floor(rng() * cols.length)];
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx - 15, cy - 13, 34, 34);
        ctx.fillStyle = c; rr(ctx, cx - 17, cy - 17, 34, 34, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = shade(c, -0.25); ctx.fillRect(cx - 13, cy - 13, 26, 26);
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(cx - 9 + rng() * 6, cy - 9, 7, 6);
        ctx.fillStyle = rng() < 0.5 ? '#fde68a' : '#93c5fd'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 11 + i * 8, cy + 6, 4, 3);
      } else { ctx.fillStyle = '#14532d'; circle(ctx, cx, cy, 13); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#166534'; circle(ctx, cx - 3, cy - 3, 8); ctx.fill(); }
      break; }
    case 'forest': {
      if (v < 0.8) { ctx.fillStyle = 'rgba(0,0,0,.3)'; circle(ctx, cx + 3, cy + 5, 16); ctx.fill(); ctx.fillStyle = '#14532d'; circle(ctx, cx, cy, 17); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#166534'; circle(ctx, cx - 5, cy - 4, 10); ctx.fill(); circle(ctx, cx + 6, cy + 2, 8); ctx.fill(); ctx.fillStyle = '#22c55e'; circle(ctx, cx - 7, cy - 7, 4); ctx.fill(); }
      else { ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 12, 8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#dc2626'; circle(ctx, cx + 8, cy - 8, 5); ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, cx + 7, cy - 9, 1.2); ctx.fill(); }
      break; }
    case 'desert': {
      if (v < 0.55) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx + 4, cy + 14, 10, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#4d7c0f'; rr(ctx, cx - 4, cy - 16, 8, 30, 4); ctx.fill(); ctx.stroke(); rr(ctx, cx - 13, cy - 6, 6, 12, 3); ctx.fill(); ctx.stroke(); rr(ctx, cx + 7, cy - 10, 6, 12, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f472b6'; circle(ctx, cx, cy - 17, 2.5); ctx.fill(); }
      else { ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.moveTo(cx - 15, cy + 10); ctx.lineTo(cx - 9, cy - 8); ctx.lineTo(cx + 4, cy - 12); ctx.lineTo(cx + 15, cy + 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.moveTo(cx - 9, cy - 8); ctx.lineTo(cx + 4, cy - 12); ctx.lineTo(cx + 1, cy + 2); ctx.fill(); }
      break; }
    case 'snow': {
      if (v < 0.75) { ctx.fillStyle = 'rgba(30,41,59,.2)'; ctx.beginPath(); ctx.ellipse(cx + 3, cy + 15, 12, 4, 0, 0, TAU); ctx.fill(); for (let i = 0; i < 3; i++) { const w = 16 - i * 4, y = cy + 10 - i * 9; ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx, y - 14); ctx.lineTo(cx + w, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(cx - w * 0.4, y - 8); ctx.lineTo(cx, y - 14); ctx.lineTo(cx + w * 0.4, y - 8); ctx.fill(); } }
      else { ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(cx - 16, cy + 12); ctx.lineTo(cx - 6, cy - 12); ctx.lineTo(cx + 8, cy - 6); ctx.lineTo(cx + 16, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 3); ctx.lineTo(cx - 6, cy - 12); ctx.lineTo(cx + 8, cy - 6); ctx.lineTo(cx + 4, cy - 1); ctx.fill(); }
      break; }
    case 'future': {
      const neon = rng() < 0.5 ? '#22d3ee' : '#ec4899';
      if (v < 0.7) { ctx.fillStyle = '#1e1b4b'; rr(ctx, cx - 16, cy - 16, 32, 32, 4); ctx.fill(); ctx.save(); ctx.shadowColor = neon; ctx.shadowBlur = 10; ctx.strokeStyle = neon; ctx.lineWidth = 2; rr(ctx, cx - 12, cy - 12, 24, 24, 3); ctx.stroke(); ctx.restore(); ctx.fillStyle = neon; ctx.globalAlpha = 0.7; for (let i = 0; i < 4; i++) ctx.fillRect(cx - 8 + (i % 2) * 10, cy - 8 + Math.floor(i / 2) * 10, 6, 6); }
      else { ctx.save(); ctx.shadowColor = neon; ctx.shadowBlur = 12; ctx.strokeStyle = neon; ctx.lineWidth = 2; circle(ctx, cx, cy, 13); ctx.stroke(); circle(ctx, cx, cy, 6); ctx.stroke(); ctx.restore(); }
      break; }
    case 'volcano': {
      if (v < 0.55) { ctx.fillStyle = '#1c1210'; ctx.beginPath(); ctx.moveTo(cx - 16, cy + 12); ctx.lineTo(cx - 8, cy - 14); ctx.lineTo(cx + 2, cy - 6); ctx.lineTo(cx + 9, cy - 16); ctx.lineTo(cx + 16, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 3, cy + 10); ctx.lineTo(cx, cy - 2); ctx.lineTo(cx + 4, cy + 4); ctx.stroke(); }
      else { ctx.save(); ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 16; const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.4, '#ff8a1a'); g.addColorStop(1, '#b91c1c'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 16, 12, rng(), 0, TAU); ctx.fill(); ctx.restore(); ctx.stroke(); }
      break; }
    default: if (THEME_EXTRA[theme]) THEME_EXTRA[theme].prop(ctx, cx, cy, rng, v);
  }
  ctx.restore();
}
