// =====================================================================
//  AUDIO — fully procedural WebAudio sound design (positional)
// =====================================================================
const SFX = {
  ok: false, ctx: null, t: 0,
  init() {
    if (this.ok) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = Settings.vol;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.amb = ctx.createGain(); this.amb.connect(this.master);
      this.loops = ctx.createGain(); this.loops.connect(this.master);
      this.sfx = ctx.createGain(); this.sfx.connect(this.master);
      this.voice = ctx.createGain(); this.voice.connect(this.master);
      // noise buffers
      const mk = (fn) => { const len = ctx.sampleRate * 3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); fn(d, len); return b; };
      this.white = mk((d, n) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
      this.brown = mk((d, n) => { let l = 0; for (let i = 0; i < n; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
      this.pink = mk((d, n) => { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2; } });
      this.buildAmbience();
      this.ok = true;
    } catch (e) { console.warn('Audio unavailable', e); this.ok = false; }
  },
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  setVolume(v) { if (this.ok) this.master.gain.setTargetAtTime(v, this.now(), .05); },
  noise(buf = 'white', loop = true) { const s = this.ctx.createBufferSource(); s.buffer = this[buf]; s.loop = loop; return s; },
  // ---------- spatial ----------
  panner(pos, ref = 1.6, roll = 1.2) {
    const p = this.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 60;
    this.place(p, pos); return p;
  },
  place(p, pos) {
    if (!pos) return;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  },
  out(pos, bus, ref, roll) { // returns entry node routed to bus (positional if pos)
    const b = bus || this.sfx;
    if (!pos) { const g = this.ctx.createGain(); g.connect(b); return g; }
    const p = this.panner(pos, ref, roll); p.connect(b); return p;
  },
  listener(cam) {
    if (!this.ok) return;
    const L = this.ctx.listener, p = cam.position, f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    if (L.positionX) {
      const t = this.now();
      L.positionX.setValueAtTime(p.x, t); L.positionY.setValueAtTime(p.y, t); L.positionZ.setValueAtTime(p.z, t);
      L.forwardX.setValueAtTime(f.x, t); L.forwardY.setValueAtTime(f.y, t); L.forwardZ.setValueAtTime(f.z, t);
      L.upX.setValueAtTime(u.x, t); L.upY.setValueAtTime(u.y, t); L.upZ.setValueAtTime(u.z, t);
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  },
  env(g, t, a, peak, d, sus = 0) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d); },
  // ---------- ambience ----------
  buildAmbience() {
    const ctx = this.ctx, t = this.now();
    // rain
    const rn = this.noise('pink'); const rhp = ctx.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 400;
    this.rainLP = ctx.createBiquadFilter(); this.rainLP.type = 'lowpass'; this.rainLP.frequency.value = 6000;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    rn.connect(rhp); rhp.connect(this.rainLP); this.rainLP.connect(this.rainGain); this.rainGain.connect(this.amb); rn.start();
    // wind
    const wn = this.noise('brown'); const wbp = ctx.createBiquadFilter(); wbp.type = 'bandpass'; wbp.frequency.value = 400; wbp.Q.value = .8;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .07; const lfoG = ctx.createGain(); lfoG.gain.value = 250; lfo.connect(lfoG); lfoG.connect(wbp.frequency); lfo.start();
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wn.connect(wbp); wbp.connect(this.windGain); this.windGain.connect(this.amb); wn.start();
    // drone
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 300; dlp.connect(this.droneGain); this.droneGain.connect(this.amb);
    this.droneLP = dlp;
    [[43.6, 'sine', .5], [46.2, 'sine', .4], [87.3, 'triangle', .12], [130.8, 'sine', .05]].forEach(([f, ty, g]) => {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = g; o.connect(og); og.connect(dlp); o.start();
    });
    const dn = this.noise('brown'); const dnf = ctx.createBiquadFilter(); dnf.type = 'lowpass'; dnf.frequency.value = 140; const dng = ctx.createGain(); dng.gain.value = .5; dn.connect(dnf); dnf.connect(dng); dng.connect(dlp); dn.start();
    // high dissonance layer (reality breaking)
    this.highGain = ctx.createGain(); this.highGain.gain.value = 0; this.highGain.connect(this.amb);
    [[932, .02], [988, .02], [1661, .008]].forEach(([f, g]) => { const o = ctx.createOscillator(); o.frequency.value = f; const og = ctx.createGain(); og.gain.value = g; const tr = ctx.createOscillator(); tr.frequency.value = rand(.2, .6); const tg = ctx.createGain(); tg.gain.value = g * .8; tr.connect(tg); tg.connect(og.gain); o.connect(og); og.connect(this.highGain); o.start(); tr.start(); });
    // room tone (inside)
    const rt = this.noise('brown'); const rtf = ctx.createBiquadFilter(); rtf.type = 'lowpass'; rtf.frequency.value = 90; this.roomGain = ctx.createGain(); this.roomGain.gain.value = 0; rt.connect(rtf); rtf.connect(this.roomGain); this.roomGain.connect(this.amb); rt.start();
  },
  ambState: { inside: 0, rain: 1, intensity: 0, basement: 0 },
  updateAmbience(inside, rain, intensity, basement) {
    if (!this.ok) return; const t = this.now(), s = this.ambState;
    s.inside = inside; s.rain = rain; s.intensity = intensity; s.basement = basement;
    const rainV = rain * (inside ? (basement ? 0.02 : 0.12) : 0.42);
    this.rainGain.gain.setTargetAtTime(rainV, t, .6);
    this.rainLP.frequency.setTargetAtTime(inside ? (basement ? 300 : 900) : 6500, t, .5);
    this.windGain.gain.setTargetAtTime(inside ? (basement ? .02 : .06) : .22, t, .8);
    this.roomGain.gain.setTargetAtTime(inside ? .25 : 0, t, .8);
    const dv = [0, .02, .05, .1, .17, .26][clamp(Math.round(intensity), 0, 5)];
    this.droneGain.gain.setTargetAtTime(dv, t, 2.5);
    this.droneLP.frequency.setTargetAtTime(200 + intensity * 80, t, 2);
    this.highGain.gain.setTargetAtTime(intensity >= 5 ? .5 : intensity >= 4 ? .18 : 0, t, 3);
  },
  silence(dur = 6, fade = .25) { // sudden silence before events
    if (!this.ok) return; const t = this.now();
    [this.amb, this.loops].forEach(b => { b.gain.cancelScheduledValues(t); b.gain.setTargetAtTime(0, t, fade); b.gain.setTargetAtTime(1, t + dur, 1.2); });
  },
  // ---------- one-shots ----------
  footstep(surface, pos, vol = 1, heavy = 1) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 1.2, 1.4);
    const n = this.noise('white', false); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    let dur = .12, peak = .35 * vol;
    switch (surface) {
      case 'wood': f.type = 'bandpass'; f.frequency.value = rand(450, 700); f.Q.value = 1.4; peak = .5 * vol; break;
      case 'carpet': f.type = 'lowpass'; f.frequency.value = rand(350, 500); peak = .5 * vol; dur = .14; break;
      case 'concrete': f.type = 'bandpass'; f.frequency.value = rand(1800, 2600); f.Q.value = .9; peak = .28 * vol; dur = .08; break;
      case 'tile': f.type = 'bandpass'; f.frequency.value = rand(2500, 3200); f.Q.value = 2; peak = .25 * vol; dur = .07; break;
      case 'grass': f.type = 'highpass'; f.frequency.value = 2500; peak = .18 * vol; dur = .2; break;
      case 'gravel': f.type = 'highpass'; f.frequency.value = 1800; peak = .3 * vol; dur = .18; break;
      default: f.type = 'lowpass'; f.frequency.value = 800;
    }
    n.connect(f); f.connect(g); g.connect(out); this.env(g, t, .006, peak, dur); n.start(t, rand(0, 2)); n.stop(t + dur + .05);
    // body thump
    if (surface !== 'grass' && surface !== 'gravel') {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(surface === 'wood' ? 110 : 80, t); o.frequency.exponentialRampToValueAtTime(45, t + .08);
      const og = ctx.createGain(); o.connect(og); og.connect(out); this.env(og, t, .004, .35 * vol * heavy, .1); o.start(t); o.stop(t + .15);
    }
    if (surface === 'wood' && Math.random() < .12) this.creak(pos, .35 * vol);
  },
  creak(pos, vol = .5, dur) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); dur = dur || rand(.35, .8);
    const out = this.out(pos, this.sfx, 1.5, 1.1);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; const base = rand(90, 160);
    o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * rand(1.15, 1.5), t + dur * .6); o.frequency.linearRampToValueAtTime(base * rand(.9, 1.2), t + dur);
    const am = ctx.createOscillator(); am.frequency.value = rand(18, 34); const amg = ctx.createGain(); amg.gain.value = .5; am.connect(amg);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rand(700, 1100); bp.Q.value = 6;
    const g = ctx.createGain(); amg.connect(g.gain);
    o.connect(bp); bp.connect(g); g.connect(out); this.env(g, t, dur * .2, vol, dur * .8);
    o.start(t); am.start(t); o.stop(t + dur + .1); am.stop(t + dur + .1);
  },
  thunder(dist = 1, inside = false) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now() + dist * .8;
    const n = this.noise('brown', false); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = inside ? 160 : 380;
    const g = ctx.createGain(); n.connect(lp); lp.connect(g); g.connect(this.amb);
    const peak = (inside ? .5 : .9) / (0.6 + dist * .5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + .15);
    for (let i = 1; i < 6; i++) g.gain.linearRampToValueAtTime(peak * rand(.3, 1), t + .15 + i * rand(.25, .5));
    g.gain.exponentialRampToValueAtTime(.0001, t + 5.5); n.start(t); n.stop(t + 6);
  },
  knock(pos, count = 3, vol = .7) {
    if (!this.ok) return; const ctx = this.ctx, t0 = this.now(); const out = this.out(pos, this.sfx, 2, 1);
    for (let i = 0; i < count; i++) {
      const t = t0 + i * .42 + rand(0, .05);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + .12);
      const g = ctx.createGain(); o.connect(g); g.connect(out); this.env(g, t, .003, vol, .18); o.start(t); o.stop(t + .25);
      const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; const ng = ctx.createGain(); n.connect(f); f.connect(ng); ng.connect(out); this.env(ng, t, .002, vol * .4, .06); n.start(t); n.stop(t + .1);
    }
  },
  slam(pos, vol = 1) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 2.5, .9);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(35, t + .3);
    const g = ctx.createGain(); o.connect(g); g.connect(out); this.env(g, t, .002, vol, .45); o.start(t); o.stop(t + .5);
    const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; const ng = ctx.createGain(); n.connect(f); f.connect(ng); ng.connect(out); this.env(ng, t, .002, vol * .8, .25); n.start(t); n.stop(t + .3);
    this.creak(pos, .2, .25);
  },
  crash(pos, vol = 1) {
    if (!this.ok) return; this.slam(pos, vol); const ctx = this.ctx, t = this.now() + .05; const out = this.out(pos, this.sfx, 3, .8);
    for (let i = 0; i < 9; i++) { const tt = t + rand(0, .6); const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rand(3000, 7000); f.Q.value = 4; const g = ctx.createGain(); n.connect(f); f.connect(g); g.connect(out); this.env(g, tt, .001, vol * rand(.15, .35), rand(.1, .4)); n.start(tt); n.stop(tt + .5); }
  },
  scrape(pos, dur = 1.2, vol = .5) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 1.5, 1);
    const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(900, t + dur);
    const g = ctx.createGain(); const am = ctx.createOscillator(); am.frequency.value = 22; const amg = ctx.createGain(); amg.gain.value = vol * .5; am.connect(amg); amg.connect(g.gain);
    n.connect(f); f.connect(g); g.connect(out); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .1); g.gain.setValueAtTime(vol, t + dur - .2); g.gain.linearRampToValueAtTime(0, t + dur);
    n.start(t); n.stop(t + dur + .1); am.start(t); am.stop(t + dur + .1);
  },
  click(pos, vol = .4, freq = 3000) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 1, 1.2);
    const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3; const g = ctx.createGain(); n.connect(f); f.connect(g); g.connect(out); this.env(g, t, .001, vol, .03); n.start(t); n.stop(t + .06);
  },
  pickup() { this.click(null, .3, 2200); setTimeout(() => this.click(null, .2, 1500), 70); },
  doorOpen(pos, slow) { this.creak(pos, slow ? .45 : .3, slow ? 2.2 : rand(.5, .9)); this.click(pos, .25, 1800); },
  doorClose(pos) { this.click(pos, .3, 1200); this.knock(pos, 1, .35); },
  locked(pos) { this.click(pos, .35, 1400); setTimeout(() => this.click(pos, .3, 1100), 90); setTimeout(() => this.click(pos, .25, 1300), 190); },
  unlock(pos) { this.click(pos, .4, 2500); setTimeout(() => this.click(pos, .5, 1600), 160); },
  staticBurst(pos, dur = 2, vol = .4) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 1.5, 1);
    const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200; const g = ctx.createGain(); n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .03); g.gain.setValueAtTime(vol, t + dur - .05); g.gain.linearRampToValueAtTime(0, t + dur); n.start(t); n.stop(t + dur + .1);
    const o = ctx.createOscillator(); o.frequency.value = 15734 / 2; const og = ctx.createGain(); og.gain.value = .015; o.connect(og); og.connect(out); o.start(t); o.stop(t + dur);
  },
  stinger(vol = .5, dur = 3) { // dissonant swell — used rarely
    if (!this.ok) return; const ctx = this.ctx, t = this.now();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(200, t); lp.frequency.linearRampToValueAtTime(2200, t + dur * .7);
    const g = ctx.createGain(); lp.connect(g); g.connect(this.sfx); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .75); g.gain.linearRampToValueAtTime(0, t + dur);
    [55, 58.3, 82.4, 116.5, 123.5].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = rand(-15, 15); const og = ctx.createGain(); og.gain.value = .09; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + .1); });
  },
  hit(vol = .8) { // a short heavy impact for the few big scares
    if (!this.ok) return; const ctx = this.ctx, t = this.now();
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + .8); const g = ctx.createGain(); o.connect(g); g.connect(this.sfx); this.env(g, t, .005, vol, 1.1); o.start(t); o.stop(t + 1.2);
    const n = this.noise('brown', false); const ng = ctx.createGain(); n.connect(ng); ng.connect(this.sfx); this.env(ng, t, .005, vol * .6, .7); n.start(t); n.stop(t + .8);
  },
  heartbeat(count = 6, vol = .5, rate = 1.1) {
    if (!this.ok) return; const ctx = this.ctx, t0 = this.now();
    for (let i = 0; i < count; i++) for (let k = 0; k < 2; k++) {
      const t = t0 + i / rate + k * .22; const o = ctx.createOscillator(); o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(35, t + .12); const g = ctx.createGain(); o.connect(g); g.connect(this.sfx); this.env(g, t, .01, vol * (k ? .6 : 1), .16); o.start(t); o.stop(t + .2);
    }
  },
  // ---------- voices (formant synthesis) ----------
  murmur(pos, dur = 3, opts = {}) {
    if (!this.ok) return; const ctx = this.ctx, t0 = this.now() + (opts.delay || 0);
    const out = this.out(pos, opts.bus || this.voice, opts.ref || 1.5, opts.roll || 1);
    const pitch = opts.pitch || 120;
    const src = ctx.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(pitch, t0);
    const nz = this.noise('white', false); const nzg = ctx.createGain(); nzg.gain.value = opts.breath || .12; nz.connect(nzg);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 5; const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 7;
    const mix = ctx.createGain(); src.connect(f1); src.connect(f2); nzg.connect(f1); nzg.connect(f2); f1.connect(mix); f2.connect(mix);
    let last = mix;
    if (opts.radio) { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; const ws = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); } ws.curve = curve; last.connect(hp); hp.connect(ws); ws.connect(lp); last = lp; }
    const g = ctx.createGain(); g.gain.value = 0; last.connect(g); g.connect(out);
    const vowels = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [440, 1020], [300, 870], [660, 1720]];
    let t = t0; const vol = opts.vol || .4;
    while (t < t0 + dur) {
      const syl = rand(.09, .24), v = pick(vowels), sh = opts.formantShift || 1;
      f1.frequency.setTargetAtTime(v[0] * sh, t, .02); f2.frequency.setTargetAtTime(v[1] * sh, t, .02);
      src.frequency.setTargetAtTime(pitch * rand(.85, 1.2), t, .05);
      g.gain.setTargetAtTime(vol * rand(.5, 1), t, .02); g.gain.setTargetAtTime(vol * .1, t + syl * .7, .03);
      t += syl; if (Math.random() < .14) t += rand(.15, .4);
    }
    g.gain.setTargetAtTime(0, t0 + dur, .05);
    src.start(t0); nz.start(t0, rand(0, 2)); src.stop(t0 + dur + .3); nz.stop(t0 + dur + .3);
  },
  whisper(pos, dur = 2.2, vol = .35) {
    if (!this.ok) return; const ctx = this.ctx, t0 = this.now(); const out = this.out(pos, this.voice, 1.2, 1);
    const n = this.noise('white', false); const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4; const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0; n.connect(hp); hp.connect(f1); hp.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
    let t = t0; while (t < t0 + dur) { const s = rand(.08, .2); f1.frequency.setTargetAtTime(rand(1200, 2600), t, .02); f2.frequency.setTargetAtTime(rand(2800, 4200), t, .02); g.gain.setTargetAtTime(vol * rand(.4, 1), t, .015); g.gain.setTargetAtTime(vol * .05, t + s * .6, .03); t += s + (Math.random() < .2 ? rand(.1, .3) : 0); }
    g.gain.setTargetAtTime(0, t0 + dur, .05); n.start(t0, rand(0, 2)); n.stop(t0 + dur + .3);
  },
  speak(text, opts = {}) { // optional real voice for a handful of key lines
    if (!Settings.voice || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.pitch = opts.pitch == null ? 1 : opts.pitch; u.rate = opts.rate || .85; u.volume = (opts.volume == null ? .55 : opts.volume) * Settings.vol;
      const vs = speechSynthesis.getVoices(); const pref = vs.find(v => /en(-|_)GB/i.test(v.lang) && /female|woman|libby|sonia|hazel|serena|kate/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang));
      if (pref) u.voice = pref; speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {}
  },
  // ---------- music box ----------
  MELODY: [[69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [71, 2], [72, 1], [69, 3], [67, 1], [69, 1], [71, 1], [72, 1], [74, 2], [72, 1], [71, 1], [69, 3], [76, 1], [79, 1], [77, 2], [76, 1], [74, 1], [72, 2], [74, 1], [76, 3], [72, 1], [71, 1], [69, 1], [71, 1], [72, 2], [71, 1], [69, 4]],
  pluck(t, midi, out, vol = .25, detune = 0) {
    const ctx = this.ctx, f = 440 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, detune / 1200);
    [[1, 1, 1.6], [2.0, .35, .6], [3.01, .15, .35], [5.4, .05, .15]].forEach(([m, a, d]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const g = ctx.createGain(); o.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * a, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.start(t); o.stop(t + d + .05);
    });
  },
  musicBox(pos, opts = {}) { // returns handle; opts: notes (count), tempo, wrong, slowdown
    if (!this.ok) return { stop() {} };
    const ctx = this.ctx; const out = this.out(pos, opts.bus || this.loops, 1.2, 1.1); const gate = ctx.createGain(); gate.connect(out);
    const notes = this.MELODY.slice(0, opts.notes || this.MELODY.length);
    let t = this.now() + .1, beat = opts.tempo || .32; const vol = opts.vol || .22;
    notes.forEach(([m, d], i) => {
      let det = 0; if (opts.wrong) det = (i % 3 === 1 ? rand(-90, -40) : rand(-25, 25)); if (opts.wrong && i > 6) det -= i * 12;
      this.pluck(t, m + (opts.transpose || 0), gate, vol, det);
      if (opts.slowdown) beat *= 1.04; t += beat * d * .5 + (opts.wrong ? rand(0, .08) : 0);
    });
    const end = t;
    return { stop: () => { try { gate.gain.setTargetAtTime(0, this.now(), .05); } catch (e) {} }, end, dur: end - this.now() };
  },
  // persistent looping emitter (clock, radio, tv)
  emitter(pos, kind) {
    if (!this.ok) return { stop() {}, setPos() {}, set() {} };
    const ctx = this.ctx; const p = this.panner(pos, 1.3, 1.1); const g = ctx.createGain(); g.gain.value = 0; g.connect(p); p.connect(this.loops);
    const h = { g, p, alive: true, timer: null, setPos: (v) => this.place(p, v), set: (v, tc = .3) => g.gain.setTargetAtTime(v, this.now(), tc), stop: () => { h.alive = false; clearInterval(h.timer); g.gain.setTargetAtTime(0, this.now(), .1); } };
    if (kind === 'clock') {
      let tock = false; h.timer = setInterval(() => { if (!h.alive || !this.ok) return; const t = this.now(); const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = tock ? 2200 : 3100; f.Q.value = 8; const eg = ctx.createGain(); n.connect(f); f.connect(eg); eg.connect(g); this.env(eg, t, .001, .9, .025); n.start(t); n.stop(t + .05); tock = !tock; }, 1000);
    } else if (kind === 'static') {
      const n = this.noise('white'); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .6; const am = ctx.createOscillator(); am.frequency.value = 7; const amg = ctx.createGain(); amg.gain.value = .3; am.connect(amg); const ng = ctx.createGain(); ng.gain.value = .5; amg.connect(ng.gain); n.connect(f); f.connect(ng); ng.connect(g); n.start(); am.start();
      h.extra = [n, am];
      const oldStop = h.stop; h.stop = () => { oldStop(); setTimeout(() => { try { n.stop(); am.stop(); } catch (e) {} }, 300); };
    } else if (kind === 'hum') {
      const o = ctx.createOscillator(); o.frequency.value = 60; const o2 = ctx.createOscillator(); o2.frequency.value = 120; const og = ctx.createGain(); og.gain.value = .3; o.connect(og); o2.connect(og); og.connect(g); o.start(); o2.start();
      const oldStop = h.stop; h.stop = () => { oldStop(); setTimeout(() => { try { o.stop(); o2.stop(); } catch (e) {} }, 300); };
    } else if (kind === 'drip') {
      h.timer = setInterval(() => { if (!h.alive) return; if (Math.random() < .5) { const t = this.now(); const o = ctx.createOscillator(); o.frequency.setValueAtTime(rand(900, 1400), t); o.frequency.exponentialRampToValueAtTime(rand(300, 500), t + .08); const eg = ctx.createGain(); o.connect(eg); eg.connect(g); this.env(eg, t, .002, .4, .12); o.start(t); o.stop(t + .15); } }, 1300);
    }
    return h;
  }
};
