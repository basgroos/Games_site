// Procedurele geluidssynthese. Alle geluiden worden bij het opstarten
// sample-voor-sample berekend (geen externe bestanden nodig).

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Biquad {
  constructor(sr) { this.sr = sr; this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, Q = 0.707, gDb = 0) {
    const w = 2 * Math.PI * Math.min(f, this.sr * 0.45) / this.sr;
    const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), A = Math.pow(10, gDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lp': b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
      case 'hp': b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
      case 'bp': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
      case 'pk': b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; break;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export function makeSounds(sr) {
  const R = mulberry32(90210);
  const r = (a = 0, b = 1) => a + (b - a) * R();
  const N = (sec) => new Float32Array(Math.max(1, Math.floor(sec * sr)));
  const bq = () => new Biquad(sr);

  function filter(a, type, f, Q, g) { const b = bq().set(type, f, Q, g); for (let i = 0; i < a.length; i++) a[i] = b.p(a[i]); return a; }
  function filterVar(a, type, fn, Q) {
    const b = bq();
    for (let i = 0; i < a.length; i++) { if ((i & 31) === 0) b.set(type, fn(i / sr), Q); a[i] = b.p(a[i]); }
    return a;
  }
  function normalize(a, peak = 0.9) {
    let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
    if (m > 0) { const k = peak / m; for (let i = 0; i < a.length; i++) a[i] *= k; }
    return a;
  }
  function fade(a, inS = 0.002, outS = 0.01) {
    const fi = Math.floor(inS * sr), fo = Math.floor(outS * sr);
    for (let i = 0; i < fi && i < a.length; i++) a[i] *= i / fi;
    for (let i = 0; i < fo && i < a.length; i++) a[a.length - 1 - i] *= i / fo;
    return a;
  }
  function mix(dst, src, at = 0, g = 1) {
    const o = Math.floor(at * sr);
    for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g;
    return dst;
  }
  function noise(sec, color = 'white') {
    const a = N(sec); let b = 0, p0 = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < a.length; i++) {
      const w = R() * 2 - 1;
      if (color === 'white') a[i] = w;
      else if (color === 'brown') { b = (b + 0.02 * w) / 1.02; a[i] = b * 3.5; }
      else { p0 = 0.99765 * p0 + w * 0.099; p1 = 0.963 * p1 + w * 0.2965; p2 = 0.57 * p2 + w * 1.0527; a[i] = (p0 + p1 + p2 + w * 0.1848) * 0.2; }
    }
    return a;
  }
  function env(a, fn) { for (let i = 0; i < a.length; i++) a[i] *= fn(i / sr, i / a.length); return a; }
  function expDecay(t, tau) { return Math.exp(-t / tau); }
  function sine(sec, fFn, ampFn = () => 1) {
    const a = N(sec); let ph = 0;
    for (let i = 0; i < a.length; i++) { const t = i / sr; ph += 2 * Math.PI * fFn(t) / sr; a[i] = Math.sin(ph) * ampFn(t); }
    return a;
  }
  // Excites a set of resonators (modal synthesis)
  function modal(exc, modes) {
    const out = new Float32Array(exc.length);
    for (const [f, Q, g] of modes) {
      const b = bq().set('bp', f, Q);
      for (let i = 0; i < exc.length; i++) out[i] += b.p(exc[i]) * g;
    }
    return out;
  }
  function tanhDist(a, drive) { const k = Math.tanh(drive); for (let i = 0; i < a.length; i++) a[i] = Math.tanh(a[i] * drive) / k; return a; }
  function stereo(l, rr) { return { ch: [l, rr] }; }

  const S = {};

  // ---------- VOETSTAPPEN ----------
  function step(surface, heavy, v) {
    const len = heavy ? 0.55 : 0.4;
    const a = N(len);
    const pitch = heavy ? 0.7 : 1;
    // hiel-impact
    const imp = noise(0.03);
    env(imp, (t) => expDecay(t, heavy ? 0.009 : 0.005));
    const lpF = { concrete: 2600, lino: 2200, tile: 6000, wood: 1600, metal: 5000, carpet: 700, wet: 3000 }[surface] * (heavy ? 0.7 : 1) * r(0.85, 1.15);
    filter(imp, 'lp', lpF, 0.8);
    mix(a, imp, 0, heavy ? 1.4 : 1);
    // lage plof
    const th = sine(0.12, (t) => (heavy ? 55 : 85) * pitch * (1 + 0.5 * Math.exp(-t * 60)), (t) => expDecay(t, heavy ? 0.045 : 0.025));
    mix(a, th, 0, heavy ? 1.1 : (surface === 'carpet' ? 0.6 : 0.5));
    // teen / afrol
    const toeAt = heavy ? r(0.09, 0.14) : r(0.06, 0.09);
    const toe = noise(0.04); env(toe, (t) => expDecay(t, 0.006)); filter(toe, 'lp', lpF * 0.9, 0.7);
    mix(a, toe, toeAt, 0.55);
    // schuren
    const sc = noise(heavy ? 0.25 : 0.12);
    env(sc, (t, p) => Math.sin(Math.PI * p) * 0.6);
    filter(sc, 'bp', surface === 'carpet' ? 900 : r(1800, 3200), 0.9);
    mix(a, sc, toeAt + 0.01, heavy ? 0.35 : 0.18);

    if (surface === 'tile') {
      const c = noise(0.02); env(c, (t) => expDecay(t, 0.003));
      mix(a, filter(c, 'bp', r(3500, 5000), 3), 0, 0.9);
      mix(a, filter(noise(0.02).map((x, i) => x * Math.exp(-i / sr / 0.003)), 'bp', 4200, 3), toeAt, 0.6);
    }
    if (surface === 'wood') {
      const ex = new Float32Array(a); const m = modal(ex, [[r(180, 230), 6, 1], [r(420, 520), 9, 0.7], [r(900, 1100), 10, 0.3]]);
      mix(a, m, 0, 0.8);
      if (R() < 0.35) { // kraak
        const cr = creak(r(0.25, 0.45), r(0.7, 1.2), true);
        mix(a, cr, 0.05, 0.35);
      }
    }
    if (surface === 'metal') {
      const ex = new Float32Array(a.length); mix(ex, imp, 0, 1); mix(ex, toe, toeAt, 0.6);
      const m = modal(ex, [[r(380, 450), 30, 1], [r(1050, 1200), 40, 0.8], [r(2100, 2400), 50, 0.5], [r(3200, 3500), 60, 0.3]]);
      mix(a, m, 0, 1.6);
    }
    if (surface === 'wet') {
      const sp = noise(0.18); env(sp, (t) => expDecay(t, 0.04)); filter(sp, 'bp', r(1500, 2500), 0.8);
      mix(a, sp, 0.01, 0.6);
      for (let k = 0; k < 5; k++) {
        const f0 = r(700, 2200);
        const bub = sine(0.025, (t) => f0 * (1 + t * 30), (t) => expDecay(t, 0.006));
        mix(a, bub, r(0.01, 0.15), 0.15);
      }
    }
    return fade(normalize(a, heavy ? 0.95 : 0.8), 0.001, 0.05);
  }
  const surfaces = ['concrete', 'lino', 'tile', 'wood', 'metal', 'carpet', 'wet'];
  for (const s of surfaces) for (let v = 0; v < 4; v++) { S[`step_${s}_${v}`] = step(s, false, v); }
  for (const s of surfaces) for (let v = 0; v < 3; v++) { S[`estep_${s}_${v}`] = step(s, true, v); }

  // ---------- KRAKEN (stick-slip) ----------
  function creak(len, pitch = 1, small = false) {
    const a = N(len);
    let ph = 0;
    const base = r(25, 45) * pitch;
    const exc = N(len);
    for (let i = 0; i < a.length; i++) {
      const t = i / sr, p = t / len;
      const rate = base * (1 + 1.6 * Math.sin(Math.PI * p) + 0.6 * Math.sin(p * 17 + 1.3)) * (1 + 0.25 * (R() - 0.5));
      ph += rate / sr;
      if (ph >= 1) { ph -= 1; exc[i] = (R() * 0.5 + 0.5) * (R() < 0.15 ? 1.6 : 1); }
    }
    const m = modal(exc, [[620 * pitch, 18, 1], [1430 * pitch, 22, 0.7], [2550 * pitch, 25, 0.45], [380 * pitch, 12, 0.6]]);
    mix(a, m, 0, 1);
    env(a, (t, p) => Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.05)), 0.6));
    if (!small) filter(a, 'hp', 150, 0.7);
    return fade(normalize(a, 0.8), 0.01, 0.05);
  }
  S.creak_0 = creak(1.6, 1);
  S.creak_1 = creak(2.2, 0.8);
  S.creak_2 = creak(1.1, 1.25);
  S.creak_slow = creak(4.2, 0.65);
  S.floor_creak_0 = creak(0.7, 0.5, true);
  S.floor_creak_1 = creak(0.9, 0.42, true);

  // ---------- DEUREN ----------
  function thump(len, f, tau, nAmt = 0.6, lpF = 1200) {
    const a = sine(len, (t) => f * (1 + 0.8 * Math.exp(-t * 40)), (t) => expDecay(t, tau));
    const n = noise(len); env(n, (t) => expDecay(t, tau * 0.35)); filter(n, 'lp', lpF, 0.7);
    mix(a, n, 0, nAmt);
    return a;
  }
  {
    const a = N(1.6);
    mix(a, thump(1.2, 55, 0.14, 1.2, 1800), 0, 1.2);
    const n = noise(0.08); env(n, (t) => expDecay(t, 0.015)); filter(n, 'bp', 2500, 0.8); mix(a, n, 0, 0.8);
    const ring = modal(n, [[190, 25, 1], [410, 30, 0.6], [870, 35, 0.4]]); mix(a, ring, 0, 1.2);
    for (let k = 0; k < 14; k++) { // ratelen van de deur in het kozijn
      const c = noise(0.015); env(c, (t) => expDecay(t, 0.003)); filter(c, 'bp', r(1500, 4000), 2);
      mix(a, c, 0.05 + k * 0.035 + r(0, 0.02), 0.5 * Math.exp(-k / 5));
    }
    S.door_slam = fade(normalize(a, 0.98), 0.0005, 0.2);
  }
  {
    const a = N(0.5);
    const latch = noise(0.02); env(latch, (t) => expDecay(t, 0.003));
    mix(a, modal(latch, [[2200, 20, 1], [3400, 25, 0.6]]), 0, 0.8);
    mix(a, thump(0.4, 80, 0.05, 0.5, 900), 0.03, 0.7);
    mix(a, modal(latch, [[1800, 15, 1]]), 0.08, 0.5);
    S.door_close = fade(normalize(a, 0.7), 0.001, 0.05);
  }
  function rattle(len, count, spread, metalF = 2600) {
    const a = N(len);
    for (let k = 0; k < count; k++) {
      const c = noise(0.02); env(c, (t) => expDecay(t, 0.004));
      const m = modal(c, [[metalF * r(0.9, 1.1), 25, 1], [metalF * 1.7, 30, 0.5]]);
      mix(a, m, k * spread + r(0, spread * 0.4), r(0.5, 1));
    }
    return normalize(a, 0.7);
  }
  S.door_locked = rattle(0.6, 6, 0.08);
  S.handle_rattle = (() => { const a = N(3.2); mix(a, rattle(1.2, 9, 0.12, 2300), 0.0, 0.8); mix(a, rattle(1.2, 7, 0.15, 2500), 1.7, 0.9); return normalize(a, 0.7); })();
  S.unlock = (() => { const a = N(0.5); mix(a, rattle(0.2, 3, 0.04, 3000), 0, 0.6); mix(a, thump(0.2, 300, 0.02, 0.3, 4000), 0.18, 0.5); return normalize(a, 0.6); })();

  // ---------- BONZEN ----------
  function bang(n, interval, f = 60, wood = true) {
    const a = N(n * interval + 1.5);
    for (let k = 0; k < n; k++) {
      const t = k * interval + r(-0.03, 0.03);
      const th = thump(1.0, f * r(0.9, 1.1), 0.12, 1.3, 2000);
      mix(a, th, t, r(0.8, 1));
      if (wood) mix(a, modal(th, [[150, 10, 0.7], [320, 12, 0.5]]), t, 0.6);
      else mix(a, modal(th, [[230, 60, 1], [610, 70, 0.7], [1330, 90, 0.4]]), t, 1.5);
    }
    return fade(normalize(a, 0.95), 0.001, 0.3);
  }
  S.bang_door = bang(3, 0.42);
  S.bang_door_hard = bang(5, 0.3, 50);
  S.bang_metal = bang(1, 1, 70, false);
  S.knock = (() => { const a = N(1.4); for (let k = 0; k < 3; k++) { const c = thump(0.3, 140, 0.03, 0.8, 2500); mix(a, modal(c, [[300, 8, 1], [650, 10, 0.5]]), k * 0.28, 1); } return fade(normalize(a, 0.8)); })();

  // ---------- STEMMEN: SCREAMS ----------
  function rosenberg(x, open = 0.42, close = 0.16) {
    if (x < open) return 0.5 * (1 - Math.cos(Math.PI * x / open));
    if (x < open + close) return Math.cos(Math.PI * (x - open) / (2 * close));
    return 0;
  }
  function voice(len, f0Fn, vowelFn, o = {}) {
    const a = N(len);
    let ph = 0, prev = 0, per = 0, jit = 0, amp = 1;
    const asp = o.aspiration ?? 0.25, rough = o.rough ?? 0.3, saw = o.saw ?? 0.3;
    for (let i = 0; i < a.length; i++) {
      const t = i / sr;
      jit = jit * 0.999 + (R() - 0.5) * 0.004 * (o.jitter ?? 1);
      const f = f0Fn(t) * (1 + jit * 4);
      ph += f / sr;
      if (ph >= 1) {
        ph -= 1; per++;
        amp = (per % 2 === 0) ? 1 : 1 - rough * r(0.3, 1);
        if (o.triple && per % 3 === 0) amp *= 0.4;
      }
      const g = rosenberg(ph);
      const d = (g - prev) * sr / Math.max(60, f) * 0.2; prev = g;
      a[i] = (d + saw * (2 * ph - 1)) * amp + (R() * 2 - 1) * asp * (0.3 + g);
    }
    // formanten (tijdsvariabel)
    const out = new Float32Array(a.length);
    const bands = [0, 1, 2, 3, 4].map(() => bq());
    for (let i = 0; i < a.length; i++) {
      if ((i & 63) === 0) {
        const fm = vowelFn(i / sr);
        for (let k = 0; k < 5; k++) bands[k].set('bp', fm[k][0], fm[k][0] / fm[k][1]);
        bands.g = fm;
      }
      let s = 0;
      for (let k = 0; k < 5; k++) s += bands[k].p(a[i]) * bands.g[k][2];
      out[i] = s;
    }
    return out;
  }
  const VOW = {
    a: [[950, 110, 1], [1400, 120, 0.7], [2800, 160, 0.45], [3700, 200, 0.3], [4800, 250, 0.15]],
    ae: [[800, 100, 1], [1800, 130, 0.7], [2700, 160, 0.45], [3600, 200, 0.3], [4700, 250, 0.15]],
    i: [[420, 80, 1], [2300, 130, 0.6], [3100, 160, 0.5], [3800, 200, 0.3], [4900, 250, 0.15]],
    o: [[560, 90, 1], [900, 100, 0.7], [2500, 150, 0.3], [3400, 200, 0.2], [4500, 250, 0.1]],
    u: [[380, 80, 1], [800, 90, 0.5], [2400, 150, 0.2], [3300, 200, 0.12], [4400, 250, 0.08]],
  };
  const lerpV = (A, B, k) => A.map((f, j) => [f[0] + (B[j][0] - f[0]) * k, f[1] + (B[j][1] - f[1]) * k, f[2] + (B[j][2] - f[2]) * k]);
  const vib = (t, rate, depth) => 1 + depth * Math.sin(2 * Math.PI * rate * t);

  // Menselijke kreet (ver weg / hulpkreet)
  {
    const len = 1.9;
    const v1 = voice(len, (t) => (t < 0.12 ? 380 + 2500 * t : 680 - 120 * Math.max(0, t - 1.1)) * vib(t, 5.5, 0.03), (t) => lerpV(VOW.ae, VOW.a, Math.min(1, t * 2)), { rough: 0.25, aspiration: 0.35, saw: 0.15 });
    env(v1, (t, p) => Math.min(1, t / 0.05) * (p > 0.75 ? (1 - p) / 0.25 : 1));
    tanhDist(normalize(v1), 1.8);
    const v2 = voice(len, (t) => 1.007 * (t < 0.12 ? 380 + 2500 * t : 680 - 120 * Math.max(0, t - 1.1)) * vib(t, 5.1, 0.035), () => VOW.a, { rough: 0.3, aspiration: 0.3 });
    env(v2, (t, p) => Math.min(1, t / 0.07) * (p > 0.75 ? (1 - p) / 0.25 : 1));
    mix(v1, normalize(v2), 0.012, 0.5);
    filter(v1, 'hp', 200, 0.7);
    S.scream_human = fade(normalize(v1, 0.9), 0.005, 0.1);
  }
  // Korte afgebroken kreet ("help-")
  {
    const len = 0.9;
    const v = voice(len, (t) => (420 + 600 * Math.min(1, t * 5)) * vib(t, 7, 0.04), (t) => lerpV(VOW.ae, VOW.o, Math.min(1, t * 1.5)), { rough: 0.35, aspiration: 0.4 });
    env(v, (t, p) => Math.min(1, t / 0.03) * (p > 0.6 ? Math.max(0, (0.85 - p) / 0.25) : 1));
    tanhDist(normalize(v), 2);
    S.scream_cutoff = fade(normalize(filter(v, 'hp', 200), 0.9), 0.003, 0.05);
  }
  // Monsterlijke screams
  function monster(len, base, peak, shriekAmt, seedVowel) {
    const f0 = (t) => {
      const p = t / len;
      const c = p < 0.1 ? base + (peak - base) * (p / 0.1) : peak * (1 - 0.35 * (p - 0.1));
      return c * vib(t, 9 + 4 * Math.sin(t * 3), 0.06);
    };
    const low = voice(len, f0, (t) => lerpV(VOW[seedVowel], VOW.a, Math.min(1, t / len * 1.5)), { rough: 0.85, triple: true, aspiration: 0.5, saw: 0.5, jitter: 4 });
    // grom-AM
    for (let i = 0; i < low.length; i++) low[i] *= 0.6 + 0.4 * Math.sin(2 * Math.PI * (37 + 10 * Math.sin(i / sr * 5)) * i / sr);
    const hi = voice(len, (t) => f0(t) * 3.1, () => VOW.i, { rough: 0.5, aspiration: 0.6, saw: 0.4, jitter: 3 });
    const out = N(len);
    mix(out, normalize(low), 0, 1);
    mix(out, normalize(hi), 0.02, shriekAmt);
    const br = noise(len); filter(br, 'bp', 2500, 0.5); env(br, (t) => 0.4 + 0.6 * Math.random());
    mix(out, br, 0, 0.25);
    env(out, (t, p) => Math.min(1, t / 0.012) * (p > 0.7 ? Math.pow((1 - p) / 0.3, 1.5) : 1));
    tanhDist(normalize(out), 3.5);
    // sub-dreun eronder
    mix(out, sine(len, (t) => 48 - 15 * t, (t) => expDecay(t, 0.5)), 0, 0.5);
    filter(out, 'hp', 35, 0.7);
    return fade(normalize(out, 0.97), 0.001, 0.1);
  }
  S.scream_monster_0 = monster(2.1, 140, 330, 0.55, 'o');
  S.scream_monster_1 = monster(1.6, 180, 420, 0.75, 'ae');
  S.scream_monster_2 = monster(2.8, 110, 260, 0.4, 'u');
  S.shriek = monster(1.0, 300, 600, 0.9, 'i');

  // ---------- FLUISTEREN ----------
  function whisper(len) {
    const a = N(len);
    const src = noise(len);
    filter(src, 'hp', 400, 0.7);
    let t = 0.05;
    const bands = [0, 1, 2, 3].map(() => bq());
    const segs = [];
    while (t < len - 0.15) { const d = r(0.08, 0.22); segs.push([t, d, Object.values(VOW)[Math.floor(R() * 5)], R() < 0.25]); t += d + r(0.02, 0.12); }
    for (const [s, d, vw, sib] of segs) {
      const i0 = Math.floor(s * sr), i1 = Math.min(a.length, Math.floor((s + d) * sr));
      for (let k = 0; k < 4; k++) bands[k].set('bp', vw[k][0] * r(0.95, 1.05), vw[k][0] / (vw[k][1] * 1.8));
      for (let i = i0; i < i1; i++) {
        const p = (i - i0) / (i1 - i0);
        const e = Math.sin(Math.PI * p);
        let x = 0;
        if (sib) { x = src[i] * 0.5; } else for (let k = 0; k < 4; k++) x += bands[k].p(src[i]) * vw[k][2];
        a[i] += x * e;
      }
    }
    filter(a, 'hp', 300, 0.7);
    return fade(normalize(a, 0.7), 0.02, 0.1);
  }
  for (let k = 0; k < 5; k++) S[`whisper_${k}`] = whisper(r(1.2, 2.4));

  // ---------- ADEMHALING ----------
  {
    const len = 4.0;
    const a = N(len);
    const n = noise(len, 'pink');
    const b1 = bq(), b2 = bq();
    for (let i = 0; i < a.length; i++) {
      const t = i / sr;
      const inh = t < 1.5;
      const p = inh ? t / 1.5 : (t - 1.6) / 2.2;
      const e = inh ? Math.sin(Math.PI * p) * 0.6 : (t > 1.6 ? Math.sin(Math.PI * Math.min(1, p)) : 0);
      if ((i & 31) === 0) { b1.set('bp', inh ? 900 + 500 * p : 650 - 200 * p, 3); b2.set('bp', 2200, 2); }
      const fry = inh ? 1 : 0.55 + 0.45 * Math.sign(Math.sin(2 * Math.PI * 38 * t + 3 * Math.sin(t * 9)));
      a[i] = (b1.p(n[i]) * 1.2 + b2.p(n[i]) * 0.4) * e * fry;
    }
    mix(a, sine(len, (t) => 62 + 5 * Math.sin(t * 7), (t) => (t > 1.7 && t < 3.6 ? 0.05 * Math.sin(Math.PI * (t - 1.7) / 1.9) : 0)), 0, 1);
    S.breath_enemy = fade(normalize(a, 0.8), 0.05, 0.2);
  }
  {
    const len = 2.6;
    const a = N(len);
    const n = noise(len, 'pink');
    const b = bq();
    for (let i = 0; i < a.length; i++) {
      const t = i / sr;
      if ((i & 31) === 0) b.set('bp', t < 1 ? 1500 : 1100, 1.5);
      const e = t < 1 ? Math.sin(Math.PI * t) * 0.5 : (t > 1.1 && t < 2.4 ? Math.sin(Math.PI * (t - 1.1) / 1.3) * 0.8 : 0);
      a[i] = b.p(n[i]) * e;
    }
    S.breath_player = fade(normalize(a, 0.5), 0.05, 0.1);
  }
  // ---------- HARTSLAG ----------
  {
    const a = N(1.0);
    mix(a, sine(0.15, (t) => 55 - 80 * t, (t) => expDecay(t, 0.04)), 0, 1);
    mix(a, sine(0.15, (t) => 48 - 60 * t, (t) => expDecay(t, 0.05)), 0.24, 0.7);
    S.heartbeat = fade(normalize(a, 0.9), 0.001, 0.01);
  }

  // ---------- ELEKTRISCH ----------
  // TL-zoem: 100 Hz (50 Hz net) – naadloos te loopen (gehele perioden)
  {
    const len = 2.0, a = N(len);
    for (let i = 0; i < a.length; i++) {
      const t = i / sr;
      const s = Math.sin(2 * Math.PI * 100 * t);
      a[i] = 0.5 * s + 0.25 * Math.sin(2 * Math.PI * 200 * t) + 0.18 * Math.sin(2 * Math.PI * 300 * t + 1) + 0.12 * Math.abs(Math.sin(2 * Math.PI * 50 * t)) * Math.sin(2 * Math.PI * 1200 * t) + 0.05 * Math.sin(2 * Math.PI * 4000 * t) * (0.5 + 0.5 * s);
    }
    S.tl_hum = normalize(a, 0.6);
  }
  function crackle(len, density, f = 3000) {
    const a = N(len);
    for (let i = 0; i < a.length; i++) if (R() < density / sr) { const amp = r(0.3, 1); const L = Math.floor(r(20, 200)); for (let j = 0; j < L && i + j < a.length; j++) a[i + j] += (R() * 2 - 1) * amp * Math.exp(-j / (L / 4)); }
    filter(a, 'hp', f * 0.3, 0.7);
    return normalize(a, 0.8);
  }
  S.tl_flicker = (() => { const a = crackle(0.8, 40); mix(a, filter(sine(0.8, () => 100, (t) => (Math.sin(t * 60) > 0 ? 0.3 : 0)), 'lp', 800), 0, 1); return fade(normalize(a, 0.7)); })();
  S.sparks = (() => { const a = crackle(1.2, 120, 5000); env(a, (t) => expDecay(t, 0.4)); mix(a, thump(0.3, 90, 0.05, 1.2, 5000), 0, 0.6); return fade(normalize(a, 0.95)); })();
  S.tl_start = (() => {
    const a = N(1.6);
    for (const at of [0, 0.35, 0.62]) { const c = noise(0.01); env(c, (t) => expDecay(t, 0.002)); mix(a, modal(c, [[3500, 20, 1], [5000, 20, 0.5]]), at, 0.6); }
    mix(a, filter(sine(0.9, () => 100, (t) => Math.min(1, t * 6) * 0.25), 'lp', 1500), 0.7, 1);
    const ping = sine(0.4, () => 3150, (t) => expDecay(t, 0.12)); mix(a, ping, 0.7, 0.25);
    return fade(normalize(a, 0.6), 0.001, 0.3);
  })();
  S.breaker = (() => { const a = N(0.6); mix(a, thump(0.5, 120, 0.04, 1.2, 3000), 0, 1); const c = noise(0.01); mix(a, modal(c, [[1700, 20, 1], [2900, 25, 0.6]]), 0.005, 1); return fade(normalize(a, 0.85)); })();
  S.power_down = (() => {
    const len = 3.0; const a = sine(len, (t) => 100 * Math.exp(-t * 0.9) + 20, (t) => expDecay(t, 0.9) * 0.6);
    mix(a, sine(len, (t) => 300 * Math.exp(-t * 1.1) + 40, (t) => expDecay(t, 0.6) * 0.3), 0, 1);
    mix(a, thump(1.2, 50, 0.2, 1.2, 1500), 0, 1);
    mix(a, crackle(0.7, 90), 0, 0.5);
    return fade(normalize(a, 0.95), 0.001, 0.3);
  })();
  S.power_up = (() => {
    const len = 2.5; const a = sine(len, (t) => 30 + 70 * (1 - Math.exp(-t * 2)), (t) => Math.min(1, t) * 0.4 * (1 - t / len));
    mix(a, thump(0.8, 70, 0.1, 1, 2500), 0, 1);
    return fade(normalize(a, 0.8), 0.001, 0.3);
  })();
  S.static = (() => { const a = noise(3, 'white'); filter(a, 'bp', 1800, 0.4); env(a, (t) => 0.5 + 0.5 * Math.random() * (Math.sin(t * 13) > 0.6 ? 1 : 0.3)); return fade(normalize(a, 0.5), 0.1, 0.2); })();

  // ---------- TELEFOON ----------
  {
    // Ouderwetse bel: hamer op twee bellen ~ 20 Hz
    const len = 2.1, a = N(len);
    for (let i = 0; i < a.length; i++) {
      const t = i / sr;
      if (t > 1.9) break;
      const strike = Math.abs(Math.sin(Math.PI * 20 * t));
      a[i] = (Math.sin(2 * Math.PI * 1180 * t) + 0.7 * Math.sin(2 * Math.PI * 1460 * t) + 0.35 * Math.sin(2 * Math.PI * 2950 * t) + 0.2 * Math.sin(2 * Math.PI * 4120 * t)) * (0.35 + 0.65 * strike);
    }
    S.phone_ring = fade(normalize(a, 0.7), 0.005, 0.15);
  }
  S.phone_pickup = (() => { const a = N(0.4); mix(a, thump(0.3, 200, 0.03, 1, 4000), 0, 1); mix(a, rattle(0.2, 2, 0.03, 1800), 0.05, 0.4); return fade(normalize(a, 0.7)); })();
  S.pager = (() => { const a = N(0.5); for (const at of [0, 0.18]) { const b = sine(0.1, () => 2730, () => 1); for (let i = 0; i < b.length; i++) b[i] = Math.sign(b[i]) * 0.3 + b[i] * 0.3; mix(a, fade(b, 0.002, 0.005), at, 0.6); } return normalize(a, 0.4); })();

  // ---------- ALARM ----------
  {
    const len = 2.0, a = N(len); let ph = 0;
    for (let i = 0; i < a.length; i++) { const t = i / sr; const f = 650 + 450 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / len)); ph += f / sr; a[i] = (ph % 1 < 0.5 ? 1 : -1) * 0.5 + Math.sin(2 * Math.PI * ph) * 0.4; }
    filter(a, 'lp', 3500, 0.7);
    S.alarm = normalize(a, 0.55);
  }
  // ---------- AMBIENCE ----------
  function loopify(a, xf) {
    const n = Math.floor(xf * sr), L = a.length - n, out = new Float32Array(L);
    for (let i = 0; i < L; i++) out[i] = a[i];
    for (let i = 0; i < n; i++) { const k = i / n; out[i] = a[i] * k + a[L + i] * (1 - k); }
    return out;
  }
  {
    const a = noise(9, 'brown'); filter(a, 'lp', 380, 0.7);
    const n2 = noise(9, 'pink'); filterVar(n2, 'bp', (t) => 700 + 250 * Math.sin(t * 0.7) + 120 * Math.sin(t * 2.3), 1.2);
    mix(a, n2, 0, 0.12);
    mix(a, sine(9, () => 59.5, () => 0.04), 0, 1);
    S.vent = normalize(loopify(a, 1.0), 0.6);
  }
  {
    const a = sine(10, () => 36, (t) => 0.5 + 0.2 * Math.sin(t * 0.9));
    mix(a, sine(10, () => 38.3, () => 0.4), 0, 1);
    mix(a, sine(10, () => 72.4, (t) => 0.12 + 0.08 * Math.sin(t * 0.4)), 0, 1);
    const n = noise(10, 'brown'); filter(n, 'lp', 120, 0.7); mix(a, n, 0, 0.6);
    S.drone = normalize(loopify(a, 1.0), 0.7);
  }
  {
    // Dreigende, schurende lage toon (hoge spanning)
    const a = N(8);
    for (const f of [55, 58.3, 61.7, 110.5]) { const s = sine(8, (t) => f * (1 + 0.003 * Math.sin(t * 1.7 + f)), () => 0.3); for (let i = 0; i < s.length; i++) s[i] = Math.tanh(s[i] * 3) * 0.3; mix(a, s, 0, 1); }
    const n = noise(8, 'pink'); filterVar(n, 'bp', (t) => 300 + 200 * Math.sin(t * 0.8), 4); mix(a, n, 0, 0.3);
    S.tension = normalize(loopify(a, 1.0), 0.7);
  }
  {
    const a = noise(8, 'pink'); filterVar(a, 'lp', (t) => 900 + 600 * Math.sin(t * 0.5), 0.7);
    for (let k = 0; k < 12; k++) { const f = r(2500, 4500); mix(a, sine(0.3, (t) => f * (1 + 0.3 * Math.sin(t * 40)), (t) => Math.sin(Math.PI * t / 0.3) * 0.15), r(0, 7.5), 1); }
    S.outside = normalize(loopify(a, 1.0), 0.6);
  }
  // ---------- OVERIG ----------
  S.drip_0 = (() => { const a = sine(0.25, (t) => 1400 + 1800 * t, (t) => expDecay(t, 0.03)); return fade(normalize(a, 0.4)); })();
  S.drip_1 = (() => { const a = sine(0.25, (t) => 1100 + 2600 * t, (t) => expDecay(t, 0.025)); return fade(normalize(a, 0.4)); })();
  S.scratch = (() => {
    const len = 2.4, a = noise(len); filterVar(a, 'bp', (t) => 2200 + 1500 * Math.sin(t * 7) + 400 * Math.sin(t * 31), 6);
    env(a, (t) => { const s = Math.sin(t * 5.3) * Math.sin(t * 2.1); return s > 0.1 ? Math.min(1, s * 2) : 0; });
    return fade(normalize(a, 0.6), 0.02, 0.1);
  })();
  S.drag = (() => {
    const len = 3.5, a = noise(len, 'brown'); filter(a, 'lp', 600, 0.8);
    const g = noise(len); filter(g, 'bp', 1200, 1); env(g, (t) => (Math.random() < 0.3 ? 1 : 0.2)); mix(a, g, 0, 0.4);
    env(a, (t, p) => Math.sin(Math.PI * p) * (0.6 + 0.4 * Math.sin(t * 3.5)));
    return fade(normalize(a, 0.7), 0.1, 0.2);
  })();
  function stinger(len, cluster, hit) {
    const a = N(len);
    for (const f of cluster) {
      let ph = 0;
      const s = N(len);
      for (let i = 0; i < s.length; i++) { const t = i / sr; ph += f * (1 + 0.01 * Math.sin(t * 6 + f)) / sr; s[i] = (2 * (ph % 1) - 1) * expDecay(t, len * 0.35); }
      mix(a, s, 0, 0.3);
    }
    filter(a, 'lp', 4000, 0.7);
    if (hit) { const n = noise(0.6); env(n, (t) => expDecay(t, 0.08)); mix(a, n, 0, 1.2); mix(a, thump(1.5, 45, 0.4, 0.8, 600), 0, 1.5); }
    tanhDist(normalize(a), 2);
    return fade(normalize(a, 0.95), 0.0005, 0.3);
  }
  S.stinger = stinger(2.5, [196, 207.6, 220, 233, 277, 293.6, 415, 440], true);
  S.stinger_soft = (() => { const a = N(5); for (const f of [110, 116.5, 164.8]) mix(a, sine(5, (t) => f * (1 + 0.004 * Math.sin(t * 4)), (t, p) => Math.sin(Math.PI * Math.min(1, t / 5)) * 0.4), 0, 1); return fade(normalize(a, 0.6), 0.5, 0.5); })();
  S.sub_boom = (() => { const a = thump(3, 32, 0.9, 0.3, 200); return fade(normalize(a, 0.95), 0.001, 0.4); })();
  S.tinnitus = sine(4, () => 6200, (t) => expDecay(t, 1.3) * 0.2);
  S.glass_break = (() => {
    const a = N(1.4);
    const n = noise(0.3); env(n, (t) => expDecay(t, 0.05)); filter(n, 'hp', 2000, 0.7); mix(a, n, 0, 1);
    for (let k = 0; k < 40; k++) { const f = r(2500, 9000); mix(a, sine(0.15, () => f, (t) => expDecay(t, r(0.01, 0.05))), r(0, 0.5) * r(0.2, 1), r(0.1, 0.4)); }
    return fade(normalize(a, 0.9));
  })();
  S.bottle_clink = (() => { const a = N(0.8); const c = noise(0.01); env(c, (t) => expDecay(t, 0.002)); mix(a, modal(c, [[1900, 60, 1], [4400, 70, 0.6], [6100, 80, 0.3]]), 0, 1); mix(a, modal(c, [[1900, 60, 1], [4400, 70, 0.5]]), 0.12, 0.5); mix(a, modal(c, [[1850, 60, 1]]), 0.2, 0.3); return fade(normalize(a, 0.6)); })();
  S.bottle_roll = (() => { const a = noise(1.5); filterVar(a, 'bp', (t) => 1900 + 200 * Math.sin(t * 20), 20); env(a, (t, p) => (1 - p) * (0.6 + 0.4 * Math.sin(t * 25))); return fade(normalize(a, 0.4), 0.01, 0.2); })();
  S.locker_open = (() => { const a = N(0.8); mix(a, rattle(0.3, 3, 0.05, 1600), 0, 0.6); const ex = noise(0.03); env(ex, (t) => expDecay(t, 0.008)); mix(a, modal(ex, [[260, 40, 1], [710, 50, 0.6], [1450, 60, 0.4]]), 0.05, 1.5); return fade(normalize(a, 0.7)); })();
  S.locker_close = (() => { const a = N(1.0); mix(a, thump(0.5, 90, 0.05, 1, 3000), 0, 0.7); const ex = noise(0.03); env(ex, (t) => expDecay(t, 0.006)); mix(a, modal(ex, [[240, 40, 1], [690, 50, 0.7], [1500, 60, 0.4]]), 0, 2); mix(a, rattle(0.2, 2, 0.04, 2000), 0.08, 0.5); return fade(normalize(a, 0.8)); })();
  S.locker_burst = (() => { const a = N(2.0); mix(a, thump(1, 60, 0.12, 1.5, 4000), 0, 1); const ex = noise(0.05); env(ex, (t) => expDecay(t, 0.01)); mix(a, modal(ex, [[230, 50, 1], [640, 60, 0.8], [1400, 70, 0.6], [2700, 80, 0.4]]), 0, 3); mix(a, rattle(0.8, 10, 0.06, 1800), 0.1, 0.8); return fade(normalize(a, 0.98), 0.0005, 0.3); })();
  S.pickup = (() => { const a = noise(0.25); filter(a, 'bp', 2500, 0.8); env(a, (t, p) => Math.sin(Math.PI * p) * (0.5 + 0.5 * Math.random())); return fade(normalize(a, 0.35)); })();
  S.paper = (() => { const a = noise(0.6); filter(a, 'hp', 1500, 0.7); env(a, (t, p) => Math.sin(Math.PI * p) * (Math.random() < 0.2 ? 1 : 0.25)); return fade(normalize(a, 0.4)); })();
  S.key_jingle = rattle(0.5, 7, 0.05, 4200);
  S.beep = (() => { const a = sine(0.08, () => 1900, () => 1); return fade(normalize(a, 0.3), 0.002, 0.01); })();
  S.beep_err = (() => { const a = sine(0.4, () => 380, () => 1); for (let i = 0; i < a.length; i++) a[i] = Math.sign(a[i]) * 0.5; filter(a, 'lp', 2000); return fade(normalize(a, 0.35), 0.002, 0.02); })();
  S.beep_ok = (() => { const a = N(0.4); mix(a, sine(0.1, () => 1500, () => 1), 0, 0.5); mix(a, sine(0.15, () => 2200, () => 1), 0.12, 0.5); return fade(normalize(a, 0.35)); })();
  S.stamp = (() => { const a = N(1.0); mix(a, thump(0.3, 160, 0.03, 1, 3000), 0, 1); mix(a, rattle(0.2, 2, 0.03, 2600), 0.05, 0.6); mix(a, sine(0.9, () => 2400, (t) => expDecay(t, 0.25) * 0.3), 0.15, 1); return fade(normalize(a, 0.6)); })();
  S.switch_click = (() => { const c = noise(0.01); env(c, (t) => expDecay(t, 0.002)); const a = modal(c, [[3000, 20, 1], [4500, 20, 0.5]]); const o = N(0.15); mix(o, a, 0, 1); return fade(normalize(o, 0.5)); })();
  S.roller_gate = (() => {
    const len = 5.5; const a = sine(len, () => 95, (t, p) => 0.25); for (let i = 0; i < a.length; i++) a[i] = Math.tanh(a[i] * 4) * 0.2;
    const ch = N(len); for (let t = 0.05; t < len; t += r(0.03, 0.06)) { const c = noise(0.01); env(c, (x) => expDecay(x, 0.003)); mix(ch, modal(c, [[r(1200, 2200), 15, 1]]), t, r(0.3, 0.8)); }
    mix(a, ch, 0, 1);
    env(a, (t) => Math.min(1, t * 3) * Math.min(1, (len - t) * 2));
    return fade(normalize(a, 0.8));
  })();
  S.body_fall = (() => { const a = N(1.2); mix(a, thump(1, 45, 0.15, 1.2, 800), 0, 1); mix(a, thump(1, 60, 0.08, 0.8, 1000), 0.18, 0.6); return fade(normalize(a, 0.9)); })();
  S.run_away = (() => { const a = N(2.4); let t = 0, k = 0; while (t < 2.1) { const s = S[`estep_concrete_${k % 3}`]; mix(a, s, t, Math.max(0.15, 1 - t / 2.2)); t += 0.24 + r(-0.02, 0.02); k++; } return fade(normalize(a, 0.8)); })();
  S.thud_above = (() => { const a = N(0.6); mix(a, thump(0.6, 45, 0.1, 0.7, 300), 0, 1); return fade(normalize(a, 0.8)); })();
  S.metal_ping = (() => { const c = noise(0.01); env(c, (t) => expDecay(t, 0.002)); const a = N(2.5); mix(a, modal(c, [[540, 200, 1], [1320, 220, 0.6], [2380, 240, 0.4]]), 0, 2); return fade(normalize(a, 0.5)); })();
  S.throw_whoosh = (() => { const a = noise(0.3); filterVar(a, 'bp', (t) => 800 + 3000 * t, 1.5); env(a, (t, p) => Math.sin(Math.PI * p)); return fade(normalize(a, 0.25)); })();
  S.cloth = (() => { const a = noise(0.5, 'pink'); filter(a, 'bp', 1200, 0.6); env(a, (t, p) => Math.sin(Math.PI * p) * (0.7 + 0.3 * Math.random())); return fade(normalize(a, 0.3)); })();
  S.flashlight_click = (() => { const c = noise(0.006); env(c, (t) => expDecay(t, 0.001)); const a = N(0.1); mix(a, modal(c, [[2600, 12, 1], [5200, 15, 0.4]]), 0, 1); mix(a, modal(c, [[2100, 12, 1]]), 0.03, 0.5); return fade(normalize(a, 0.35)); })();
  return S;
}
