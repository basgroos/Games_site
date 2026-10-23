/* Hollow Pines — procedural spatial audio (WebAudio). Every sound is synthesised. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { clamp, lerp } = HG.util;

  function Audio(settings) {
    this.settings = settings;
    this.ok = false;
    this.loops = {};
    this.speechQ = 0;
    this.lx = 64; this.ly = 1.6; this.lz = 61; this.llevel = 0; this.indoor = 0;
    this.voices = [];   // live spatial voices, disconnected when finished
    this.maxVoices = 28;
  }
  HG.Audio = Audio;
  const A = Audio.prototype;

  A.start = function () {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    // soft clipper: linear up to 0.75, then rounds off below 1.0 so screams never crack the speakers
    const clip = ctx.createWaveShaper(); const cc = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1, ax = Math.abs(x) * 2; cc[i] = Math.sign(x) * (ax < 0.75 ? ax : 0.75 + 0.24 * Math.tanh((ax - 0.75) / 0.24)); }
    clip.curve = cc;
    const pre = ctx.createGain(); pre.gain.value = 0.5; // curve input spans [-2, 2]
    this.master.connect(pre); pre.connect(clip); clip.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 14; comp.knee.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2; comp.connect(this.master);
    this.out = comp;
    this.sfx = ctx.createGain(); this.sfx.connect(comp);
    this.amb = ctx.createGain(); this.amb.connect(comp);
    this.voice = ctx.createGain(); this.voice.connect(comp);
    this.body = ctx.createGain(); this.body.connect(comp); // breathing / heartbeat
    // reverb for interiors (generated impulse)
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(1.6, 2.6);
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.25; this.verb.connect(this.verbGain); this.verbGain.connect(this.sfx);
    // long forest echo for screams carrying through the trees
    this.echo = ctx.createConvolver(); this.echo.buffer = this.impulse(3.8, 3.4);
    this.echoGain = ctx.createGain(); this.echoGain.gain.value = 0.55; this.echo.connect(this.echoGain); this.echoGain.connect(this.sfx);
    // noise buffers
    const len = ctx.sampleRate * 2;
    this.white = ctx.createBuffer(1, len, ctx.sampleRate); const w = this.white.getChannelData(0); for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate); const b = this.brown.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = l * 3.5; }
    this.pink = ctx.createBuffer(1, len, ctx.sampleRate); const p = this.pink.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const x = Math.random() * 2 - 1; b0 = 0.99765 * b0 + x * 0.099; b1 = 0.963 * b1 + x * 0.2965; b2 = 0.57 * b2 + x * 1.0526; p[i] = (b0 + b1 + b2 + x * 0.1848) * 0.18; }
    this.dist = ctx.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 4); } this.dist.curve = curve;
    this.applyVolumes();
    this.buildAmbience();
    this.ok = true;
  };
  A.applyVolumes = function () {
    if (!this.ctx) return;
    const s = this.settings;
    this.master.gain.value = s.volMaster;
    this.sfx.gain.value = s.volSfx;
    this.amb.gain.value = s.volAmb;
    this.voice.gain.value = s.volVoice;
    this.body.gain.value = s.volSfx;
  };
  A.impulse = function (sec, decay) {
    const ctx = this.ctx, n = ctx.sampleRate * sec, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return buf;
  };

  // ---------- spatial chain ----------
  A.listen = function (x, y, z, yaw, pitch, level) {
    if (!this.ok || !isFinite(x) || !isFinite(y) || !isFinite(z) || !isFinite(yaw) || !isFinite(pitch)) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    this.lx = x; this.ly = y; this.lz = z; this.llevel = level;
    const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
    if (L.positionX) { L.positionX.setValueAtTime(x, t); L.positionY.setValueAtTime(y, t); L.positionZ.setValueAtTime(z, t); L.forwardX.setValueAtTime(fx, t); L.forwardY.setValueAtTime(fy, t); L.forwardZ.setValueAtTime(fz, t); L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t); }
    else { L.setPosition(x, y, z); L.setOrientation(fx, fy, fz, 0, 1, 0); }
  };
  // returns an input node routed through muffle filter + panner, or null if inaudible
  A.spatial = function (x, y, z, level, radius, gain, bus, life, important, echo) {
    const ctx = this.ctx;
    if (!isFinite(x) || !isFinite(y) || !isFinite(z) || !isFinite(radius)) return null;
    this.reap();
    if (this.voices.length >= this.maxVoices && !important) return null;
    const d = Math.hypot(x - this.lx, z - this.lz, (y - this.ly) * 0.5);
    const walls = this.world ? this.world.wallsBetween(this.llevel, this.lx, this.lz, level, x, z) : 0;
    const eff = d * (1 + walls * 0.5) + Math.abs(level - this.llevel) * 5;
    if (eff > radius * 1.6) return null;
    const inp = ctx.createGain(); inp.gain.value = gain;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = walls > 0.1 || level !== this.llevel ? clamp(9000 / (1 + walls * 2.2 + Math.abs(level - this.llevel) * 3), 260, 9000) : 16000;
    const pan = ctx.createPanner();
    // binaural only where it matters (close sounds); distant ones use cheap panning
    pan.panningModel = this.settings.headphones && (d < 22 || important) ? 'HRTF' : 'equalpower';
    pan.distanceModel = 'exponential'; pan.refDistance = Math.max(0.6, radius * 0.09); pan.rolloffFactor = 1.15; pan.maxDistance = 400;
    if (pan.positionX) { pan.positionX.value = x; pan.positionY.value = y; pan.positionZ.value = z; } else pan.setPosition(x, y, z);
    const att = ctx.createGain(); att.gain.value = 1 / (1 + walls * 0.6) * clamp(1.5 - eff / radius, 0, 1);
    inp.connect(lp); lp.connect(att); att.connect(pan); pan.connect(bus || this.sfx);
    let send = null;
    if (echo) { const es = ctx.createGain(); es.gain.value = echo * clamp(0.3 + d / 40, 0.3, 1.2); att.connect(es); es.connect(this.echo); }
    if (this.indoor > 0.3 && level === this.llevel && d < 15) { send = ctx.createGain(); send.gain.value = 0.5 * this.indoor; pan.connect(send); send.connect(this.verb); }
    const v = { inp, pan, lp, att, send, end: ctx.currentTime + (life || 2.6) };
    this.voices.push(v);
    return v;
  };
  // disconnect finished voices so their panners stop processing
  A.reap = function () {
    const now = this.ctx.currentTime;
    if (!this.voices.length || this.voices[0].end > now) { if (this.voices.length < this.maxVoices) return; }
    const keep = [];
    for (const v of this.voices) {
      if (v.end <= now) { try { v.inp.disconnect(); v.lp.disconnect(); v.att.disconnect(); v.pan.disconnect(); if (v.send) v.send.disconnect(); } catch (e) { /* already gone */ } }
      else keep.push(v);
    }
    this.voices = keep;
  };
  A.noise = function (buf, dur, start) {
    const s = this.ctx.createBufferSource(); s.buffer = buf || this.white; s.loop = true;
    const off = Math.random() * 1.5;
    s.start(start || this.ctx.currentTime, off); s.stop((start || this.ctx.currentTime) + dur + 0.05);
    return s;
  };
  A.env = function (g, t, a, peak, d, sustain) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
  };
  A.filt = function (type, f, q) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  A.osc = function (type, f, t, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + dur + 0.05); return o; };
  // burst of filtered noise
  A.burst = function (out, t, dur, ftype, f, q, peak, buf, attack) {
    const n = this.noise(buf, dur, t), fl = this.filt(ftype, f, q), g = this.ctx.createGain();
    this.env(g, t, attack || 0.003, peak, dur);
    n.connect(fl); fl.connect(g); g.connect(out);
    return { n, fl, g };
  };
  A.tone = function (out, t, dur, type, f0, f1, peak, attack) {
    const o = this.osc(type, f0, t, dur), g = this.ctx.createGain();
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g, t, attack || 0.005, peak, dur);
    o.connect(g); g.connect(out);
    return { o, g };
  };

  // ---------- event dispatch ----------
  A.onEvent = function (e, sim, viewer) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    if (e.type === 'sound') return this.playSound(e, sim, viewer);
    if (e.type === 'say') return this.sayLine(e, sim, viewer);
    if (e.type === 'lightning') { setTimeout(() => this.thunder(), (e.delay || 1.5) * 1000); return; }
    if (e.type === 'taskDone') { this.chime(); return; }
    if (e.type === 'powerFail') { this.powerDown(); return; }
    if (e.type === 'gateOpen') { return; }
    if (e.type === 'reveal' && viewer && viewer.kind === 'survivor') { this.sting(0.5); return; }
    if (e.type === 'hit' && viewer && e.who === viewer.id) { this.tinnitus(); return; }
    if (e.type === 'caught' && viewer && e.who === viewer.id) { this.playerDeath(viewer.prof); return; }
    if (e.type === 'grabbed' && viewer && e.who === viewer.id) { this.sting(1.2); return; }
    if (e.type === 'quiet') { return; }
  };
  A.playSound = function (e, sim, viewer) {
    const k = e.kind;
    const y = (e.level === 0 ? (this.world ? this.world.floorY(0, e.x, e.z) : 0) : HG.LEVEL_FLOOR[e.level]) + (k === 'step' || k === 'mstep' ? 0.1 : 1.2);
    // the viewer's own footsteps play non-spatially (and quieter)
    const own = viewer && e.src === viewer;
    let r = e.radius;
    if (k === 'step' || k === 'mstep') r = Math.max(r, 6);
    let out;
    const LIFE = { roar: 2, grab: 2, struggle: 1.6, grab_break: 2, closet_rip: 2.4, pounce_wind: 1, pounce_leap: 1.2, pounce_hit: 2.4, pounce_land: 1.2, scream: 3.4, death_scream: 9, ghost_on: 2.4, darkness: 2.6, gate_open: 3, gate_alarm: 1.8, door_open: 2.2, generator_start: 2, fox: 1.6, owl: 2, thump: 1.4, task_chainsaw: 1.4, task_metal: 1.2, task_static: 1.3, radio_burst: 1.8, dash: 1, hit: 2.4 };
    const important = k === 'dash' || k === 'scream' || k === 'hit' || k === 'death_scream' || k === 'roar' || k === 'grab' || k === 'struggle' || k === 'grab_break' || k === 'closet_rip' || k.startsWith('pounce') || k === 'ghost_on' || k === 'darkness' || (k === 'mstep' && e.mode !== 'ghost');
    if (own) { out = { inp: this.ctx.createGain() }; out.inp.gain.value = 0.55; out.inp.connect(this.sfx); out.end = this.ctx.currentTime + 1; out.lp = out.att = out.pan = out.inp; this.voices.push(out); }
    else {
      const echo = { death_scream: 0.9, scream: 0.7, hit: 0.5, struggle: 0.4, grab: 0.5, roar: 0.5, fox: 0.4, pounce_hit: 0.4 }[k] || 0;
      out = this.spatial(e.x, y, e.z, e.level, Math.max(r * 1.4, 10), 1, this.sfx, LIFE[k] || (k === 'step' || k === 'mstep' ? 0.7 : 1.2), important, echo);
    }
    if (!out) return;
    const o = out.inp, t = this.ctx.currentTime + 0.01;
    switch (k) {
      case 'step': this.footstep(o, t, e.surface, e.sprint ? 1 : e.crouch ? 0.3 : 0.6, false); break;
      case 'mstep': this.footstep(o, t, e.surface, e.mode === 'run' || e.mode === 'dash' ? 1.3 : e.mode === 'crawl' ? 0.4 : e.mode === 'ghost' ? 0.12 : e.mode === 'stalk' ? 0.35 : 0.9, true, e.mode); break;
      case 'door_open': this.creak(o, t, e.slow ? 1.6 : 0.6, 1); break;
      case 'door_close': this.thud(o, t, 0.5); this.click(o, t + 0.05, 0.4); break;
      case 'click': this.click(o, t, 0.5); break;
      case 'reload': this.click(o, t, 0.4); this.burst(o, t + 0.1, 0.12, 'bandpass', 2400, 2, 0.2); this.click(o, t + 0.3, 0.6); break;
      case 'rummage': for (let i = 0; i < 4; i++) this.burst(o, t + Math.random() * 0.3, 0.06 + Math.random() * 0.08, 'bandpass', 1500 + Math.random() * 3000, 1.2, 0.18); if (Math.random() < 0.3) this.clank(o, t + 0.2, 0.15); break;
      case 'pickup': case 'deliver': this.clank(o, t, 0.25); break;
      case 'hide': this.creak(o, t, 0.35, 1.8); this.click(o, t + 0.35, 0.3); break;
      case 'closet_rattle': for (let i = 0; i < 6; i++) this.thud(o, t + i * 0.07, 0.25); break;
      case 'closet_open': this.creak(o, t, 0.25, 2.2); this.thud(o, t + 0.2, 0.8); break;
      case 'voice': case 'whisper': break; // handled by say
      case 'task_wrench': case 'task_work': this.clank(o, t, 0.35); break;
      case 'task_wires': this.crackle(o, t, 0.4, 0.3); break;
      case 'task_metal': this.grind(o, t, 0.9, 0.4); break;
      case 'task_tinker': this.click(o, t, 0.3); this.click(o, t + 0.15, 0.25); break;
      case 'task_static': this.staticBurst(o, t, 1.0, 0.35); break;
      case 'task_switch': this.thud(o, t, 0.6); this.click(o, t, 0.6); break;
      case 'task_engine': this.engineCrank(o, t, 1.1); break;
      case 'task_chainsaw': this.chainsaw(o, t, 1.15); break;
      case 'task_beacon': this.beep(o, t); break;
      case 'step_done': this.thud(o, t, 0.5); break;
      case 'generator': break; // loop handles it
      case 'generator_start': this.engineCrank(o, t, 1.5); break;
      case 'power_fail': this.powerDown(); break;
      case 'gate_alarm': this.siren(o, t, 1.4); break;
      case 'gate_open': this.grind(o, t, 2.5, 0.6); break;
      // creature
      case 'dash': this.dashCue(o, t); break;
      case 'crawl_down': case 'crawl_up': this.bones(o, t, 4, 0.35); break;
      case 'ghost_on': this.ghostOn(o, t); break;
      case 'ghost_off': this.burst(o, t, 0.35, 'bandpass', 900, 3, 0.4, this.pink, 0.2); break;
      case 'scream_wind': this.burst(o, t, 0.6, 'bandpass', 700, 1.5, 0.35, this.pink, 0.5); break;
      case 'scream': this.creatureScream(o, t); break;
      case 'darkness': this.darknessHum(o, t); break;
      case 'attack_wind': this.burst(o, t, 0.25, 'bandpass', 500, 1, 0.3, this.pink, 0.15); break;
      case 'swing_miss': this.burst(o, t, 0.3, 'bandpass', 900, 0.8, 0.6, this.pink, 0.02); break;
      case 'impact': this.thud(o, t, 1.0); break;
      case 'hit': this.painHit(o, t, e.src && e.src.prof, e.attack); break;
      case 'death_scream': this.deathSequence(o, t, e.src && e.src.prof, e.how, own); break;
      case 'roar': this.roar(o, t, 1); break;
      case 'grab': this.slap(o, t, 1); this.humanScream(o, t + 0.04, e.src && e.src.prof, 0.9, 0.8, { crack: true }); this.snarl(o, t + 0.1, 1.2, 0.8); break;
      case 'struggle': this.struggleCries(o, t, e.src && e.src.prof); break;
      case 'grab_break': this.creatureShriek(o, t, 0.8, 1.0); this.gasp(o, t + 0.2, e.src && e.src.prof, 0.7); break;
      case 'closet_rip': this.splinter(o, t); this.humanScream(o, t + 0.15, e.src && e.src.prof, 1, 1.0, { crack: true }); break;
      case 'pounce_wind': this.pounceCue(o, t); break;
      case 'pounce_leap': this.creatureShriek(o, t, 0.45, 0.8); this.burst(o, t, 0.5, 'bandpass', 600, 0.8, 0.6, this.pink, 0.03); break;
      case 'pounce_hit': this.thud(o, t, 1.6); this.slap(o, t, 1); this.crunch(o, t + 0.05, 0.6); break;
      case 'pounce_land': this.thud(o, t, 1.2); this.burst(o, t + 0.05, 0.5, 'bandpass', 1500, 1, 0.3, this.pink, 0.02); break;
      // ambient director
      case 'branch': this.snap(o, t); break;
      case 'owl': this.owl(o, t); break;
      case 'fox': this.fox(o, t); break;
      case 'thump': this.thud(o, t, 0.9); this.thud(o, t + 0.5 + Math.random() * 0.4, 0.6); break;
      case 'creak': this.creak(o, t, 0.5 + Math.random() * 0.6, 0.6); break;
      case 'knock': for (let i = 0; i < 3; i++) this.knock(o, t + i * 0.32); break;
      case 'radio_burst': this.staticBurst(o, t, 1.4, 0.4); break;
    }
    // the creature's presence: low breath when close
    if (k === 'mstep' && Math.random() < 0.12 && e.mode !== 'ghost') this.breathCreature(o, t + 0.1);
  };

  // ---------- synth voices ----------
  A.footstep = function (o, t, surf, k, heavy, mode) {
    const p = heavy ? 0.6 : 1;
    switch (surf) {
      case 'wood': this.tone(o, t, 0.08, 'sine', 110 * p, 60 * p, 0.6 * k); this.burst(o, t, 0.05, 'bandpass', 1800, 1.5, 0.25 * k); if (Math.random() < (heavy ? 0.4 : 0.12)) this.creak(o, t + 0.02, 0.25 + Math.random() * 0.3, 0.35 * k); break;
      case 'gravel': for (let i = 0; i < 6; i++) this.burst(o, t + Math.random() * 0.06, 0.025, 'highpass', 3000 + Math.random() * 3000, 0.7, 0.22 * k); this.tone(o, t, 0.05, 'sine', 90 * p, 50, 0.2 * k); break;
      case 'mud': { const b = this.burst(o, t, 0.16, 'bandpass', 380, 4, 0.5 * k, this.pink); b.fl.frequency.exponentialRampToValueAtTime(900, t + 0.12); this.tone(o, t, 0.08, 'sine', 70 * p, 40, 0.3 * k); break; }
      case 'grass': this.burst(o, t, 0.13, 'bandpass', 2600, 0.9, 0.18 * k, this.pink, 0.02); this.tone(o, t, 0.06, 'sine', 80 * p, 45, 0.18 * k); break;
      default: this.burst(o, t, 0.03, 'highpass', 2200, 1, 0.3 * k); this.tone(o, t, 0.06, 'sine', 95 * p, 55, 0.35 * k);
    }
    if (heavy && mode !== 'ghost') {
      this.tone(o, t, 0.18, 'sine', 48, 32, 0.7 * k);
      if (mode === 'crawl') { this.bones(o, t, 2, 0.25); const s = this.burst(o, t, 0.25, 'bandpass', 1200, 2, 0.15, this.pink, 0.05); }
      else this.burst(o, t + 0.03, 0.02, 'bandpass', 4200, 6, 0.35 * k); // claws
    }
  };
  A.creak = function (o, t, dur, k) {
    const ctx = this.ctx;
    const osc = this.osc('sawtooth', 160 + Math.random() * 120, t, dur);
    // stick-slip: jittery pitch
    for (let i = 0; i < dur * 22; i++) osc.frequency.setValueAtTime(140 + Math.random() * 260 + Math.sin(i * 0.5) * 60, t + i / 22);
    const b1 = this.filt('bandpass', 1100, 7), b2 = this.filt('bandpass', 2300, 9), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 * k, t + 0.05); g.gain.setValueAtTime(0.14 * k, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(o);
  };
  A.thud = function (o, t, k) { this.tone(o, t, 0.22, 'sine', 85, 38, 0.8 * k); this.burst(o, t, 0.08, 'lowpass', 600, 0.7, 0.4 * k, this.brown); };
  A.click = function (o, t, k) { this.burst(o, t, 0.012, 'highpass', 3500, 0.7, 0.4 * k); this.tone(o, t, 0.02, 'square', 2200, 1800, 0.05 * k); };
  A.clank = function (o, t, k) { for (const f of [523, 1187, 2093, 3170]) this.tone(o, t, 0.25 + Math.random() * 0.2, 'sine', f * (0.95 + Math.random() * 0.1), f, 0.12 * k, 0.002); };
  A.knock = function (o, t) { this.tone(o, t, 0.1, 'sine', 160, 90, 0.6); this.burst(o, t, 0.03, 'bandpass', 900, 2, 0.4); };
  A.snap = function (o, t) { this.burst(o, t, 0.04, 'bandpass', 2500, 1.5, 0.8); this.burst(o, t + 0.03, 0.15, 'bandpass', 1200, 2, 0.3, this.pink); };
  A.crackle = function (o, t, dur, k) { for (let i = 0; i < 10; i++) this.burst(o, t + Math.random() * dur, 0.008, 'highpass', 4000, 0.5, k * Math.random()); };
  A.grind = function (o, t, dur, k) { const b = this.burst(o, t, dur, 'bandpass', 1800, 3, k, this.white, 0.05); const s = this.tone(o, t, dur, 'sawtooth', 70, 90, k * 0.2, 0.1); };
  A.staticBurst = function (o, t, dur, k) { const b = this.burst(o, t, dur, 'bandpass', 2400, 0.6, k, this.white, 0.02); for (let i = 0; i < 8; i++) b.g.gain.setValueAtTime(k * Math.random(), t + Math.random() * dur * 0.9); this.crackle(o, t, dur, k * 0.8); };
  A.beep = function (o, t) { this.tone(o, t, 0.12, 'sine', 1240, 1240, 0.18, 0.004); this.tone(o, t + 0.2, 0.12, 'sine', 1240, 1240, 0.18, 0.004); };
  A.engineCrank = function (o, t, dur) {
    const g = this.ctx.createGain(); g.connect(o);
    const s = this.osc('sawtooth', 28, t, dur); s.frequency.linearRampToValueAtTime(40, t + dur);
    const lp = this.filt('lowpass', 400, 1); s.connect(lp); lp.connect(g);
    const am = this.osc('square', 9, t, dur); const amg = this.ctx.createGain(); amg.gain.value = 0.3; am.connect(amg); amg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  A.chainsaw = function (o, t, dur) {
    const g = this.ctx.createGain(); g.connect(o);
    const s = this.osc('sawtooth', 105 + Math.random() * 20, t, dur); const s2 = this.osc('square', 211, t, dur);
    const bp = this.filt('bandpass', 900, 1.2); s.connect(bp); s2.connect(bp); bp.connect(g);
    this.burst(g, t, dur, 'highpass', 3000, 0.5, 0.15);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.05); g.gain.setValueAtTime(0.4, t + dur - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  A.siren = function (o, t, dur) { const s = this.tone(o, t, dur, 'square', 620, 620, 0.12, 0.05); s.o.frequency.linearRampToValueAtTime(880, t + dur / 2); s.o.frequency.linearRampToValueAtTime(620, t + dur); };
  A.owl = function (o, t) { for (const [dt, f, d] of [[0, 410, 0.25], [0.45, 390, 0.6], [1.2, 400, 0.35]]) { const s = this.tone(o, t + dt, d, 'sine', f, f * 0.9, 0.12, 0.05); } };
  A.fox = function (o, t) {
    // a vixen's scream: unsettling but natural
    const d = 1.1, g = this.ctx.createGain(); g.connect(o);
    const s = this.osc('sawtooth', 700, t, d); s.frequency.exponentialRampToValueAtTime(1100, t + 0.25); s.frequency.exponentialRampToValueAtTime(500, t + d);
    const f1 = this.filt('bandpass', 1300, 6), f2 = this.filt('bandpass', 2700, 8);
    s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g);
    this.env(g, t, 0.05, 0.25, d);
  };
  A.bones = function (o, t, n, k) { for (let i = 0; i < n; i++) { const tt = t + i * (0.05 + Math.random() * 0.06); this.burst(o, tt, 0.012, 'bandpass', 3000 + Math.random() * 2500, 8, 0.5 * k); } };
  A.dashCue = function (o, t) {
    // learnable cue: three accelerating bone-cracks then a low rush
    this.bones(o, t, 1, 1.2); this.bones(o, t + 0.11, 1, 1.2); this.bones(o, t + 0.17, 1, 1.4);
    const b = this.burst(o, t + 0.12, 0.5, 'bandpass', 300, 1.2, 0.9, this.pink, 0.05); b.fl.frequency.exponentialRampToValueAtTime(1600, t + 0.55);
    this.tone(o, t + 0.12, 0.4, 'sine', 55, 35, 0.8);
  };
  A.ghostOn = function (o, t) {
    const b = this.burst(o, t, 1.4, 'bandpass', 2400, 4, 0.3, this.pink, 1.0); b.fl.frequency.exponentialRampToValueAtTime(600, t + 1.4);
    for (const f of [523, 659, 784, 1046]) { const s = this.tone(o, t + 0.2, 1.6, 'sine', f * 1.003, f * 0.97, 0.03, 0.8); }
  };
  A.darknessHum = function (o, t) {
    const s = this.tone(o, t, 2.2, 'square', 120, 40, 0.12, 0.3);
    const lp = this.filt('lowpass', 700, 2); s.g.disconnect(); s.g.connect(lp); lp.connect(o);
    this.crackle(o, t, 1.2, 0.25);
  };
  // ---------- voice engine: screams that sound like a throat, not a synth ----------
  // f0: function of normalized time -> Hz multiplier applied to base pitch; formants: [[f, q, gain], ...]
  A.throat = function (o, t, dur, base, opts) {
    const ctx = this.ctx; opts = opts || {};
    const out = ctx.createGain(); out.gain.value = 0;
    const shaper = ctx.createWaveShaper(); shaper.curve = this.dist.curve; shaper.oversample = '2x';
    const pre = ctx.createGain(); pre.gain.value = opts.drive || 1.6;
    pre.connect(shaper); shaper.connect(out); out.connect(o);
    // glottal source: two slightly detuned saws, jittered every 25 ms
    const src = [this.osc('sawtooth', base, t, dur), this.osc('sawtooth', base, t, dur)];
    src[1].detune.value = 9;
    const steps = Math.ceil(dur / 0.025);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, tt = t + u * dur;
      let mul = opts.contour ? opts.contour(u) : 1;
      if (opts.crack && Math.random() < 0.07) mul *= 1.45 + Math.random() * 0.3;   // voice breaking
      const jit = 1 + (Math.random() - 0.5) * (opts.jitter || 0.06);
      for (const s of src) s.frequency.setValueAtTime(Math.max(40, base * mul * jit), tt);
    }
    // vibrato
    const vib = this.osc('sine', opts.vibRate || 7.5, t, dur), vg = ctx.createGain(); vg.gain.value = base * (opts.vib || 0.035);
    vib.connect(vg); for (const s of src) vg.connect(s.frequency);
    // roughness: fast amplitude modulation, the acoustic signature of screams
    const rough = ctx.createGain(); rough.gain.value = 1;
    const am = this.osc('sine', opts.roughHz || 55, t, dur), amg = ctx.createGain(); amg.gain.value = opts.rough === undefined ? 0.45 : opts.rough;
    am.connect(amg); amg.connect(rough.gain);
    // formants (vowel)
    const F = opts.formants || [[850, 9, 1], [1350, 11, 0.7], [2700, 14, 0.45], [3600, 16, 0.25]];
    for (const s of src) s.connect(rough);
    for (const [f, q, g] of F) { const b = this.filt('bandpass', f * (opts.fShift || 1), q), bg = ctx.createGain(); bg.gain.value = g; rough.connect(b); b.connect(bg); bg.connect(pre); }
    // breath / aspiration
    const asp = this.noise(this.white, dur, t), af = this.filt('bandpass', 2600, 1.2), ag = ctx.createGain(); ag.gain.value = opts.breath || 0.25;
    asp.connect(af); af.connect(ag); ag.connect(pre);
    // envelope
    const peak = opts.peak || 0.5, att = opts.attack || 0.04;
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(peak, t + att);
    out.gain.setValueAtTime(peak * (opts.sustain || 0.85), t + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return out;
  };
  const VOWEL = {
    a: [[850, 9, 1], [1350, 11, 0.7], [2700, 14, 0.45], [3600, 16, 0.25]],
    ae: [[700, 9, 1], [1750, 11, 0.8], [2800, 14, 0.4], [3800, 16, 0.2]],
    i: [[350, 9, 0.8], [2300, 12, 0.9], [3000, 14, 0.5], [3800, 16, 0.3]],
    o: [[480, 8, 1], [820, 9, 0.7], [2600, 14, 0.2]],
    u: [[320, 7, 1], [700, 8, 0.5], [2400, 14, 0.12]]
  };
  const baseOf = (prof) => (prof && prof.voice === 'f' ? 330 : 205) * ((prof && prof.pitch) || 1);
  const fsOf = (prof) => (prof && prof.voice === 'f' ? 1.15 : 1);
  // full-throated scream with breaks and a wavering top
  A.humanScream = function (o, t, prof, k, dur, opts) {
    opts = opts || {};
    const base = baseOf(prof);
    return this.throat(o, t, dur, base, {
      contour: u => (u < 0.08 ? 1.3 + u * 14 : 2.4 + Math.sin(u * 23) * 0.12 - (u > 0.75 ? (u - 0.75) * 2.2 : 0)) * (opts.high ? 1.25 : 1),
      formants: VOWEL[opts.vowel || 'a'], fShift: fsOf(prof), crack: opts.crack, jitter: 0.09, vib: 0.05, vibRate: 8 + Math.random() * 3,
      rough: 0.55, roughHz: 45 + Math.random() * 30, drive: 2.4, breath: 0.35, peak: 0.42 * k, attack: 0.03
    });
  };
  A.gasp = function (o, t, prof, k) {
    // sharp inhale with a voiced catch
    const b = this.burst(o, t, 0.35, 'bandpass', 1800, 1.5, 0.35 * k, this.white, 0.12); b.fl.frequency.exponentialRampToValueAtTime(3200, t + 0.3);
    this.throat(o, t + 0.25, 0.18, baseOf(prof) * 1.4, { formants: VOWEL.ae, fShift: fsOf(prof), peak: 0.25 * k, rough: 0.2, attack: 0.01 });
  };
  A.sob = function (o, t, prof, k) {
    for (let i = 0; i < 3; i++) this.throat(o, t + i * 0.28, 0.2, baseOf(prof) * (1.3 - i * 0.08), { formants: VOWEL.u, fShift: fsOf(prof), peak: 0.2 * k, rough: 0.3, roughHz: 30, attack: 0.02, breath: 0.4 });
  };
  // choking: the scream collapses into a wet gurgle
  A.gurgle = function (o, t, prof, dur, k) {
    const base = baseOf(prof) * 0.45;
    const g = this.throat(o, t, dur, base, { contour: u => 1.2 - u * 0.55, formants: VOWEL.o, fShift: fsOf(prof) * 0.9, rough: 0.9, roughHz: 18 + Math.random() * 10, jitter: 0.25, drive: 3, breath: 0.15, peak: 0.4 * k, attack: 0.02, sustain: 0.7 });
    // bubbles: short resonant pops
    for (let i = 0; i < dur * 14; i++) {
      const tt = t + Math.random() * dur, f = 300 + Math.random() * 900;
      const b = this.burst(o, tt, 0.05 + Math.random() * 0.05, 'bandpass', f, 12, 0.25 * k * Math.random(), this.white, 0.005);
      b.fl.frequency.exponentialRampToValueAtTime(f * (1.6 + Math.random()), tt + 0.05);
    }
  };
  // a breaking crunch
  A.crunch = function (o, t, k) {
    this.burst(o, t, 0.015, 'highpass', 2500, 0.7, 1.0 * k);
    this.tone(o, t, 0.12, 'sine', 140, 50, 0.9 * k, 0.002);
    for (let i = 0; i < 9; i++) this.burst(o, t + 0.01 + Math.random() * 0.18, 0.01 + Math.random() * 0.02, 'bandpass', 1500 + Math.random() * 3500, 3, 0.6 * k * Math.random(), this.white, 0.001);
  };
  // wet tearing
  A.tear = function (o, t, dur, k) {
    const b = this.burst(o, t, dur, 'bandpass', 900, 2.5, 0.45 * k, this.pink, 0.04); b.fl.frequency.exponentialRampToValueAtTime(2600, t + dur);
    for (let i = 0; i < dur * 40; i++) this.burst(o, t + Math.random() * dur, 0.012, 'bandpass', 600 + Math.random() * 2000, 5, 0.35 * k * Math.random(), this.white, 0.001);
  };
  A.slap = function (o, t, k) { this.burst(o, t, 0.09, 'lowpass', 1400, 1.2, 0.9 * k, this.white, 0.002); this.tone(o, t, 0.15, 'sine', 110, 55, 0.7 * k, 0.002); };
  A.splinter = function (o, t) { for (let i = 0; i < 7; i++) this.burst(o, t + Math.random() * 0.25, 0.04 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 3000, 2, 0.7, this.white, 0.002); this.thud(o, t, 1.2); this.creak(o, t + 0.05, 0.3, 2.5); };
  // creature voices
  A.snarl = function (o, t, dur, k) {
    const ctx = this.ctx, g = ctx.createGain(); g.connect(o);
    const sh = ctx.createWaveShaper(); sh.curve = this.dist.curve; sh.connect(g);
    const s = this.osc('sawtooth', 68, t, dur), s2 = this.osc('sawtooth', 103, t, dur);
    const am = this.osc('sine', 31, t, dur), amg = ctx.createGain(); amg.gain.value = 0.6; am.connect(amg);
    const v = ctx.createGain(); v.gain.value = 0.5; amg.connect(v.gain);
    const lp = this.filt('bandpass', 420, 1.5), hp = this.filt('bandpass', 1700, 4);
    s.connect(v); s2.connect(v); v.connect(lp); v.connect(hp); lp.connect(sh); hp.connect(sh);
    this.burst(sh, t, dur, 'bandpass', 900, 1, 0.5, this.pink, 0.05);
    this.env(g, t, 0.06, 0.55 * k, dur);
  };
  A.roar = function (o, t, k) {
    this.snarl(o, t, 1.5, k);
    const s = this.throat(o, t + 0.05, 1.4, 95, { contour: u => (u < 0.15 ? 1 + u * 5 : 1.75 - u * 0.6), formants: [[500, 6, 1], [1100, 8, 0.6], [2400, 10, 0.4]], rough: 0.9, roughHz: 28, drive: 4, jitter: 0.2, breath: 0.6, peak: 0.6 * k, attack: 0.05 });
  };
  A.creatureShriek = function (o, t, dur, k) {
    const ctx = this.ctx, g = ctx.createGain(); g.connect(o);
    const sh = ctx.createWaveShaper(); sh.curve = this.dist.curve; sh.connect(g);
    for (const [f0, f1] of [[900, 2600], [1350, 3300], [610, 1700]]) {
      const s = this.osc('sawtooth', f0, t, dur); s.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.3); s.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
      const rm = this.osc('sine', 73 + Math.random() * 40, t, dur), rmg = ctx.createGain(); rmg.gain.value = 0; rm.connect(rmg.gain);
      const b = this.filt('bandpass', f1 * 0.8, 3); s.connect(rmg); rmg.connect(b); b.connect(sh);
    }
    this.env(g, t, 0.02, 0.5 * k, dur);
  };
  A.pounceCue = function (o, t) {
    // a rising hiss and accelerating clicks: the warning before it leaps
    const b = this.burst(o, t, 0.5, 'bandpass', 1200, 4, 0.45, this.white, 0.4); b.fl.frequency.exponentialRampToValueAtTime(5200, t + 0.5);
    let tt = t; for (let i = 0; i < 7; i++) { this.bones(o, tt, 1, 0.9); tt += 0.11 - i * 0.012; }
  };
  A.painHit = function (o, t, prof, how) {
    this.slap(o, t, 1.1);
    if (how === 'pounce') this.crunch(o, t + 0.03, 0.5); else this.tear(o, t + 0.02, 0.25, 0.8);
    this.humanScream(o, t + 0.05, prof, 0.9, 0.7, { crack: true, high: true });
    this.gasp(o, t + 0.85, prof, 0.6);
    this.sob(o, t + 1.3, prof, 0.5);
  };
  A.struggleCries = function (o, t, prof) {
    // strained shrieks between gasps, and something growling right on top of them
    this.humanScream(o, t, prof, 0.8, 0.45 + Math.random() * 0.25, { crack: true, high: Math.random() < 0.5, vowel: Math.random() < 0.5 ? 'a' : 'ae' });
    this.gasp(o, t + 0.75, prof, 0.6);
    this.snarl(o, t + 0.2, 0.9, 0.6);
    if (Math.random() < 0.4) this.thud(o, t + 0.4, 0.5);
  };
  // a death, in stages: terror, impact, the voice failing, the creature feeding
  A.deathSequence = function (o, t, prof, how, own) {
    const k = own ? 1.15 : 1;
    let tt = t;
    if (how === 'grab') { this.snarl(o, tt, 0.9, 1.2); tt += 0.15; }
    if (how === 'pounce') { this.thud(o, tt, 1.5); this.slap(o, tt, 1); }
    // the scream, cracking
    this.humanScream(o, tt, prof, k, 1.5, { crack: true, high: true });
    this.crunch(o, tt + 1.05, 1.0 * k);
    this.tear(o, tt + 1.1, 0.5, 1.0 * k);
    // the voice collapses into choking
    this.gurgle(o, tt + 1.45, prof, 1.3, k);
    this.crunch(o, tt + 2.0, 0.8 * k);
    // last breath
    const rattle = this.burst(o, tt + 2.8, 1.1, 'bandpass', 700, 3, 0.25 * k, this.pink, 0.1); rattle.fl.frequency.exponentialRampToValueAtTime(260, tt + 3.9);
    // the creature feeding: low growls and wet clicks
    this.snarl(o, tt + 3.4, 2.2, 0.7);
    for (let i = 0; i < 10; i++) { const ft = tt + 3.5 + Math.random() * 2.4; this.burst(o, ft, 0.04, 'bandpass', 700 + Math.random() * 900, 6, 0.3 * Math.random(), this.white, 0.003); if (Math.random() < 0.35) this.crunch(o, ft, 0.35); }
  };
  // the player is the one being taken: everything happens inside your head
  A.playerDeath = function (prof) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, b = this.body;
    this.creatureShriek(b, t, 0.9, 1.4);
    this.sting(1.6);
    // heartbeat racing, then slowing, then stopping
    let tt = t + 0.6;
    for (let i = 0; i < 9; i++) { const k = 1 - i / 9; this.tone(b, tt, 0.13, 'sine', 55, 38, 0.5 * k + 0.05, 0.005); this.tone(b, tt + 0.17, 0.11, 'sine', 50, 36, 0.35 * k + 0.03, 0.005); tt += 0.32 + i * 0.12; }
    this.tone(b, tt + 0.6, 4, 'sine', 3900, 3850, 0.04, 0.5);
    // the woods go silent around you
    const a = this.amb.gain, now = this.ctx.currentTime;
    a.cancelScheduledValues(now); a.setValueAtTime(a.value, now); a.linearRampToValueAtTime(0.0001, now + 2.5); a.linearRampToValueAtTime(this.settings.volAmb, now + 9);
  };
  A.creatureScream = function (o, t) {
    const ctx = this.ctx, d = 2.4, g = ctx.createGain();
    const dist = ctx.createWaveShaper(); dist.curve = this.dist.curve;
    g.connect(dist); dist.connect(o);
    for (const [f0, f1, det] of [[260, 1250, 0], [263, 1270, 7], [130, 610, -5], [520, 2400, 3]]) {
      const s = this.osc('sawtooth', f0, t, d); s.detune.value = det * 10;
      s.frequency.exponentialRampToValueAtTime(f1, t + 0.35); s.frequency.exponentialRampToValueAtTime(f1 * 0.7, t + d);
      const vib = this.osc('sine', 7 + Math.random() * 3, t, d), vg = ctx.createGain(); vg.gain.value = f1 * 0.03; vib.connect(vg); vg.connect(s.frequency);
      const f = this.filt('bandpass', 900 + Math.random() * 1600, 5); s.connect(f); f.connect(g);
    }
    this.burst(g, t, d, 'bandpass', 3000, 0.8, 0.25, this.white, 0.1);
    // inside it, faintly, human screams pitched wrong
    for (const [p, fs] of [[0.62, 0.8], [1.35, 1.2], [0.9, 1.0]]) this.throat(o, t + 0.1 + Math.random() * 0.2, d * 0.85, 300 * p, { contour: u => 1.4 + Math.sin(u * 17) * 0.15 - u * 0.4, formants: VOWEL.a, fShift: fs, rough: 0.7, roughHz: 40, drive: 3, crack: true, peak: 0.16, attack: 0.1 });
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.15); g.gain.setValueAtTime(0.6, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  };
  A.humanCry = function (o, t, k, long, prof) {
    const ctx = this.ctx, d = long ? 1.6 : 0.45, g = ctx.createGain(); g.connect(o);
    const base = (prof && prof.voice === 'f' ? 420 : 260) * (prof ? prof.pitch : 1);
    const s = this.osc('sawtooth', base, t, d); s.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.12); s.frequency.exponentialRampToValueAtTime(base * (long ? 0.8 : 1.1), t + d);
    const vib = this.osc('sine', 6, t, d), vg = ctx.createGain(); vg.gain.value = base * 0.04; vib.connect(vg); vg.connect(s.frequency);
    for (const [f, q] of [[800, 6], [1150, 8], [2600, 10]]) { const fl = this.filt('bandpass', f, q); s.connect(fl); fl.connect(g); }
    this.env(g, t, 0.03, 0.6 * k, d);
  };
  A.breathCreature = function (o, t) { const b = this.burst(o, t, 1.2, 'bandpass', 380, 3, 0.25, this.pink, 0.4); const r = this.tone(o, t, 1.2, 'sawtooth', 38, 32, 0.05, 0.4); };
  A.sting = function (k) { if (!this.ok) return; const t = this.ctx.currentTime; for (const f of [55, 58.3, 82.4]) this.tone(this.amb, t, 3, 'sawtooth', f, f * 0.98, 0.06 * k, 0.02); this.burst(this.amb, t, 2.5, 'bandpass', 4000, 6, 0.08 * k, this.white, 0.02); };
  A.tinnitus = function () { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(this.body, t, 3, 'sine', 3800, 3700, 0.05, 0.01); };
  A.chime = function () { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(this.amb, t, 2.2, 'sine', 196, 196, 0.06, 0.4); this.tone(this.amb, t + 0.05, 2.2, 'sine', 294, 294, 0.04, 0.4); };
  A.thunder = function () {
    if (!this.ok) return; const t = this.ctx.currentTime;
    const b = this.burst(this.amb, t, 4.5, 'lowpass', 900, 0.7, 0.9, this.brown, 0.04); b.fl.frequency.exponentialRampToValueAtTime(70, t + 4.5);
    for (let i = 0; i < 5; i++) this.burst(this.amb, t + 0.3 + Math.random() * 2.5, 0.6, 'lowpass', 300, 1, 0.4 * Math.random(), this.brown, 0.1);
  };
  A.powerDown = function () { if (!this.ok) return; const t = this.ctx.currentTime; const s = this.tone(this.amb, t, 2.5, 'sawtooth', 120, 30, 0.12, 0.01); this.thud(this.amb, t, 0.8); };

  // ---------- voices ----------
  A.sayLine = function (e, sim, viewer) {
    const t = this.ctx.currentTime;
    if (viewer && viewer.kind === 'survivor' && e.who === viewer.id && !e.mimic) return;
    // radio blip before team chatter (unless close by)
    const d = Math.hypot(e.x - this.lx, e.z - this.lz);
    const radio = e.radio && (d > 10 || e.level !== this.llevel) && viewer && viewer.kind === 'survivor';
    if (radio) this.staticBurst(this.voice, t, 0.18, 0.12);
    if (!radio) {
      const out = this.spatial(e.x, (this.world ? this.world.floorY(e.level, e.x, e.z) : 0) + 1.6, e.z, e.level, e.whisper ? 6 : 22, 1, this.voice, 4, true);
      if (!out && !e.mimic) return;
      if (out) this.murmur(out.inp, t, e);
    } else this.murmur(this.voice, t, e, 0.35);
    if (this.settings.speech && window.speechSynthesis && (!viewer || viewer.kind === 'survivor' || d < 20)) this.speak(e, radio, d);
  };
  // formant babble that carries the line's rhythm (always present; speech synthesis optional)
  A.murmur = function (o, t, e, k) {
    k = k || 1;
    const words = e.text.split(/\s+/).length, dur = Math.min(3.5, words * 0.22 / (e.rate || 1));
    const base = (e.voice === 'f' ? 210 : 120) * (e.pitch || 1);
    const g = this.ctx.createGain(); g.connect(o);
    if (e.whisper || e.mimic) {
      const b = this.burst(g, t, dur, 'bandpass', 1400, 1.2, 0.25 * k, this.pink, 0.05);
      for (let i = 0; i < words; i++) b.fl.frequency.setValueAtTime(900 + Math.random() * 1600, t + i * dur / words);
      g.gain.value = 1;
      if (!e.mimic) return;
    }
    const s = this.osc('sawtooth', base, t, dur);
    for (let i = 0; i < words * 2; i++) s.frequency.setValueAtTime(base * (0.85 + Math.random() * 0.4), t + i * dur / (words * 2));
    const f1 = this.filt('bandpass', 700, 4), f2 = this.filt('bandpass', 1500, 6);
    for (let i = 0; i < words * 2; i++) { f1.frequency.setValueAtTime(400 + Math.random() * 600, t + i * dur / (words * 2)); f2.frequency.setValueAtTime(1000 + Math.random() * 1400, t + i * dur / (words * 2)); }
    s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < words; i++) { const tt = t + i * dur / words; g.gain.exponentialRampToValueAtTime(0.09 * k * (e.mimic ? 0.6 : 1), tt + 0.04); g.gain.exponentialRampToValueAtTime(0.01, tt + dur / words * 0.9); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  };
  A.speak = function (e, radio, d) {
    const ss = window.speechSynthesis;
    if (ss.pending && this.speechQ > 1) return;
    const u = new SpeechSynthesisUtterance(e.text);
    const voices = ss.getVoices().filter(v => /^en/i.test(v.lang));
    if (voices.length) {
      const fem = voices.filter(v => /female|samantha|victoria|karen|zira|susan|moira|tessa|fiona|serena/i.test(v.name));
      const mal = voices.filter(v => /male|daniel|alex|fred|david|mark|george|rishi|oliver/i.test(v.name) && !/female/i.test(v.name));
      const pool = e.voice === 'f' ? (fem.length ? fem : voices) : (mal.length ? mal : voices);
      let h = 0; for (const c of e.name) h = (h * 31 + c.charCodeAt(0)) | 0;
      u.voice = pool[Math.abs(h) % pool.length];
    }
    u.pitch = clamp((e.pitch || 1) * (e.mimic ? 0.8 : 1), 0.5, 1.6);
    u.rate = clamp((e.rate || 1) * (e.whisper ? 0.9 : 1.05) * (e.mimic ? 0.82 : 1), 0.6, 1.5);
    const dist = radio ? 0.45 : clamp(1 - d / 24, 0.1, 1);
    u.volume = clamp(this.settings.volVoice * this.settings.volMaster * dist * (e.whisper ? 0.5 : 1), 0, 1);
    this.speechQ++;
    u.onend = u.onerror = () => { this.speechQ = Math.max(0, this.speechQ - 1); };
    ss.speak(u);
  };

  // ---------- ambience & loops ----------
  A.buildAmbience = function () {
    const ctx = this.ctx;
    // wind in the trees
    const wn = ctx.createBufferSource(); wn.buffer = this.pink; wn.loop = true; wn.start();
    const wf = this.filt('bandpass', 500, 0.6), wg = ctx.createGain(); wg.gain.value = 0.25;
    wn.connect(wf); wf.connect(wg); wg.connect(this.amb);
    this.loops.wind = { f: wf, g: wg };
    // rain
    const rn = ctx.createBufferSource(); rn.buffer = this.white; rn.loop = true; rn.start();
    const rf = this.filt('highpass', 1200, 0.5), rg = ctx.createGain(); rg.gain.value = 0;
    rn.connect(rf); rf.connect(rg); rg.connect(this.amb);
    this.loops.rain = { g: rg, f: rf };
    // crickets: chirp pattern
    const cg = ctx.createGain(); cg.gain.value = 0; cg.connect(this.amb);
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 4200 + i * 330; o.start();
      const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = 22 + i * 3; am.start();
      const amg = ctx.createGain(); amg.gain.value = 0.5; am.connect(amg);
      const slow = ctx.createOscillator(); slow.frequency.value = 0.7 + i * 0.23; slow.start();
      const sg = ctx.createGain(); sg.gain.value = 0.5; slow.connect(sg);
      const g = ctx.createGain(); g.gain.value = 0; amg.connect(g.gain); sg.connect(g.gain);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.connect(g); if (pan) { pan.pan.value = (i - 1) * 0.7; g.connect(pan); pan.connect(cg); } else g.connect(cg);
    }
    this.loops.crickets = { g: cg };
    // dread drone: two detuned low tones, swells with tension
    const dg = ctx.createGain(); dg.gain.value = 0; dg.connect(this.amb);
    for (const f of [41.2, 43.65, 61.7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.start(); const lp = this.filt('lowpass', 180, 1); o.connect(lp); lp.connect(dg); }
    const hiss = ctx.createBufferSource(); hiss.buffer = this.pink; hiss.loop = true; hiss.start(); const hf = this.filt('bandpass', 5200, 3); const hg = ctx.createGain(); hg.gain.value = 0.2; hiss.connect(hf); hf.connect(hg); hg.connect(dg);
    this.loops.drone = { g: dg };
    // house hum (power on)
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 60; hum.start();
    const hum2 = ctx.createOscillator(); hum2.type = 'sine'; hum2.frequency.value = 120; hum2.start();
    const humg = ctx.createGain(); humg.gain.value = 0; hum.connect(humg); const h2g = ctx.createGain(); h2g.gain.value = 0.4; hum2.connect(h2g); h2g.connect(humg); humg.connect(this.amb);
    this.loops.hum = { g: humg };
    // player body: breathing + heartbeat
    const br = ctx.createBufferSource(); br.buffer = this.pink; br.loop = true; br.start();
    const bf = this.filt('bandpass', 900, 1.4), bg = ctx.createGain(); bg.gain.value = 0;
    br.connect(bf); bf.connect(bg); bg.connect(this.body);
    this.loops.breath = { g: bg, f: bf, phase: 0 };
    this.heartT = 0;
    // positional loops (generator, beacon, chainsaw, static) created on demand
  };
  A.loopAt = function (key, x, y, z, level, build) {
    let L = this.loops[key];
    if (!L) {
      const ctx = this.ctx;
      const pan = ctx.createPanner(); pan.panningModel = this.settings.headphones ? 'HRTF' : 'equalpower'; pan.distanceModel = 'exponential'; pan.refDistance = 3; pan.rolloffFactor = 1.2;
      const lp = this.filt('lowpass', 16000, 0.7), g = ctx.createGain(); g.gain.value = 0;
      g.connect(lp); lp.connect(pan); pan.connect(this.sfx);
      L = this.loops[key] = { pan, lp, g, nodes: build(g) };
    }
    if (L.pan.positionX) { L.pan.positionX.value = x; L.pan.positionY.value = y; L.pan.positionZ.value = z; } else L.pan.setPosition(x, y, z);
    const walls = this.world.wallsBetween(this.llevel, this.lx, this.lz, level, x, z);
    L.lp.frequency.value = clamp(14000 / (1 + walls * 2.5 + Math.abs(level - this.llevel) * 3), 200, 14000);
    L.walls = walls;
    return L;
  };
  A.update = function (dt, sim, view) {
    if (!this.ok) return;
    this.reap();
    this.world = sim.world;
    const t = this.ctx.currentTime, set = (p, v, tc) => p.setTargetAtTime(v, t, tc || 0.3);
    this.indoor = view.indoor || 0;
    const viewer = view.viewer;
    // wind & rain, muffled indoors
    set(this.loops.wind.g.gain, (sim.weather === 'rain' ? 0.32 : 0.22) * (1 - this.indoor * 0.75) * (0.7 + 0.3 * Math.sin(t * 0.21) + 0.2 * Math.sin(t * 0.073)), 0.8);
    set(this.loops.wind.f.frequency, 380 + Math.sin(t * 0.17) * 160 + (sim.weather === 'rain' ? 120 : 0), 1);
    set(this.loops.rain.g.gain, sim.weather === 'rain' ? 0.16 * (1 - this.indoor * 0.6) : 0, 1);
    set(this.loops.rain.f.frequency, this.indoor > 0.5 ? 600 : 1500, 1);
    // the forest falls silent when it is near
    set(this.loops.crickets.g.gain, sim.forestQuiet || view.level !== 0 ? 0 : 0.012 * (1 - this.indoor * 0.8), sim.forestQuiet ? 0.4 : 3);
    // tension drone
    const m = sim.monster;
    let tension = 0;
    if (viewer && viewer.kind === 'survivor') {
      const d = m.level === viewer.level ? Math.hypot(m.x - viewer.x, m.z - viewer.z) : 40;
      tension = clamp(1 - d / 30, 0, 1) * 0.7 + (m.ai && m.ai.state === 'chase' && m.ai.target === viewer ? 0.5 : 0) + (view.fear || 0) * 0.3;
    } else if (viewer && viewer.kind === 'monster') tension = 0.15;
    set(this.loops.drone.g.gain, clamp(tension, 0, 1) * 0.09, 1.2);
    set(this.loops.hum.g.gain, sim.houseCircuit() && view.level !== -1 && this.indoor > 0.3 ? 0.012 : 0, 0.5);
    // generator
    if (sim.generatorRunning || this.loops.gen) {
      const L = this.loopAt('gen', 60.1, 0.8, 47, 0, (g) => {
        const ctx = this.ctx; const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 29; s.start();
        const sq = ctx.createOscillator(); sq.type = 'square'; sq.frequency.value = 58; sq.start();
        const lp = this.filt('lowpass', 420, 1.2); s.connect(lp); sq.connect(lp); lp.connect(g);
        const n = ctx.createBufferSource(); n.buffer = this.brown; n.loop = true; n.start(); const ng = ctx.createGain(); ng.gain.value = 0.4; n.connect(ng); ng.connect(g);
        return [s, sq, n];
      });
      set(L.g.gain, sim.generatorRunning ? 0.35 : 0, 0.4);
    }
    // static from the radio while transmitting
    const rd = sim.tasks.find(x => x.type === 'radio');
    const transmitting = rd && !rd.done && rd.stepIdx === 2 && sim.survivors.some(s => s.interact && s.interact.step === rd.steps[2]);
    if (transmitting || this.loops.radio) {
      const L = this.loopAt('radio', 67.5, 1.4, 64, 0, (g) => { const n = this.ctx.createBufferSource(); n.buffer = this.white; n.loop = true; n.start(); const f = this.filt('bandpass', 2200, 0.7); n.connect(f); f.connect(g); return [n]; });
      set(L.g.gain, transmitting ? 0.06 + Math.random() * 0.06 : 0, 0.05);
    }
    // breathing & heartbeat for the viewer
    const fear = view.fear || 0, stam = view.stamina === undefined ? 1 : view.stamina;
    const br = this.loops.breath;
    const rate = 0.25 + fear * 0.55 + (1 - stam) * 0.6;
    br.phase += dt * rate * Math.PI * 2;
    const bAmp = viewer && viewer.kind === 'survivor' && viewer.alive ? (0.004 + fear * 0.03 + (1 - stam) * 0.05) * (view.hidden ? 1.6 : 1) : 0;
    set(br.g.gain, bAmp * Math.max(0, Math.sin(br.phase)) ** 2, 0.05);
    set(br.f.frequency, Math.sin(br.phase) > 0 ? 1100 : 700, 0.1);
    if (viewer && viewer.kind === 'survivor' && viewer.alive && fear > 0.45) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        const bpm = 70 + fear * 75; this.heartT = 60 / bpm;
        const k = (fear - 0.45) * 1.6 * (view.hidden ? 1.5 : 1);
        this.tone(this.body, t, 0.12, 'sine', 55, 40, 0.25 * k); this.tone(this.body, t + 0.16, 0.1, 'sine', 50, 38, 0.18 * k);
      }
    }
  };
  A.stopLoops = function () {
    if (!this.ok) return;
    for (const k of ['gen', 'radio']) if (this.loops[k]) this.loops[k].g.gain.value = 0;
  };
  A.suspend = function (on) { if (this.ctx) { if (on) this.ctx.suspend(); else this.ctx.resume(); } if (on && window.speechSynthesis) window.speechSynthesis.cancel(); };
})(typeof window !== 'undefined' ? window : globalThis);
