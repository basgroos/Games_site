// ================= AUDIO: everything procedural (WebAudio) =================
const AU = { ctx:null, ready:false, master:null, sfx:null, amb:null, mus:null, noise:null, brown:null, loops:{}, seqs:[], vol:0.9 };

function audioInit(){
  if (AU.ctx){ if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const C = new AC(); AU.ctx = C;
  AU.master = C.createGain(); AU.master.gain.value = AU.vol;
  const comp = C.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25;
  AU.master.connect(comp); comp.connect(C.destination);
  AU.sfx = C.createGain(); AU.sfx.connect(AU.master);
  AU.amb = C.createGain(); AU.amb.connect(AU.master);
  AU.mus = C.createGain(); AU.mus.connect(AU.master);
  const len = C.sampleRate * 3;
  const nb = C.createBuffer(1, len, C.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  const bb = C.createBuffer(1, len, C.sampleRate), bd = bb.getChannelData(0); let l = 0;
  for (let i = 0; i < len; i++){ l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = l * 3.5; }
  AU.noise = nb; AU.brown = bb;
  const shaper = C.createWaveShaper(); const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++){ const x = i / 512 - 1; curve[i] = Math.tanh(x * 4); }
  shaper.curve = curve; AU.curve = curve;
  AU.ready = true;
  startAmbience();
}
const anow = () => AU.ctx.currentTime;
function setPP(p, x, y, z){
  if (p.positionX){ p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
}
// Destination: positional panner (HRTF) or plain sfx bus
function dest(pos, ref = 2, roll = 1.15){
  if (!pos) return AU.sfx;
  const p = AU.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
  p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 80;
  setPP(p, pos.x, pos.y, pos.z); p.connect(AU.sfx); return p;
}
function tone(d, type, f0, f1, dur, vol, at = 0, attack = 0.005){
  const C = AU.ctx, t = anow() + at;
  const o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.05); return o;
}
function nburst(d, ftype, freq, q, dur, vol, at = 0, attack = 0.003, brown = false){
  const C = AU.ctx, t = anow() + at;
  const s = C.createBufferSource(); s.buffer = brown ? AU.brown : AU.noise;
  const f = C.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(d); s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
  return { s, f, g };
}
function filt(d, type, freq, q = 1){ const f = AU.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(d); return f; }

const SND = {
  ok(){ return AU.ready; },
  step(surface, pos, vol = 0.35){
    if (!AU.ready) return; const d = dest(pos, 1.5);
    let f = 380, q = 2, dur = 0.1, th = 0.35;
    if (surface === 'tile'){ f = 2400; q = 3; dur = 0.05; th = 0.15; }
    else if (surface === 'grass'){ f = 2600; q = 0.5; dur = 0.16; th = 0.05; vol *= 0.8; }
    else if (surface === 'concrete'){ f = 1300; q = 1; dur = 0.07; th = 0.2; }
    else if (surface === 'carpet'){ f = 500; q = 0.7; dur = 0.08; th = 0.2; vol *= 0.6; }
    else if (surface === 'wet'){ f = 1800; q = 0.8; dur = 0.13; th = 0.1; }
    nburst(d, 'bandpass', f * (0.85 + Math.random() * 0.3), q, dur, vol);
    tone(d, 'sine', 120, 55, 0.09, vol * th);
    if (surface === 'wood' && Math.random() < 0.08) SND.creak(pos, 0.04);
    if (surface === 'grass' || surface === 'wet') nburst(d, 'highpass', 4000, 0.5, 0.12, vol * 0.25, 0.02);
  },
  creak(pos, vol = 0.12, dur = 0.7){
    if (!AU.ready) return; const d = filt(dest(pos), 'bandpass', 900 + Math.random() * 500, 7);
    const o = tone(d, 'sawtooth', 150 + Math.random() * 40, 85, dur, vol, 0, 0.08);
    const lfo = AU.ctx.createOscillator(); lfo.frequency.value = 11 + Math.random() * 8; const lg = AU.ctx.createGain(); lg.gain.value = 18;
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(); lfo.stop(anow() + dur + 0.1);
  },
  latch(pos, vol = 0.35){ if (!AU.ready) return; const d = dest(pos); nburst(d, 'highpass', 3200, 1, 0.03, vol); tone(d, 'square', 900, 600, 0.03, vol * 0.08, 0.02); },
  doorOpen(pos){ SND.latch(pos); SND.creak(pos, 0.11, 0.9); },
  doorClose(pos, hard = false){
    if (!AU.ready) return; const d = dest(pos, hard ? 4 : 2); const v = hard ? 1.4 : 0.55;
    tone(d, 'sine', 95, 38, hard ? 0.5 : 0.25, v); nburst(d, 'lowpass', hard ? 900 : 450, 0.8, hard ? 0.4 : 0.16, v * 0.8, 0, 0.002, true);
    nburst(d, 'highpass', 2500, 1, 0.04, v * 0.4, 0.02);
  },
  click(pos){ if (!AU.ready) return; const d = dest(pos, 1); nburst(d, 'bandpass', 4200, 2, 0.018, 0.5); tone(d, 'square', 2100, 1500, 0.012, 0.05); },
  lockClick(pos){ if (!AU.ready) return; const d = dest(pos, 1.5); nburst(d, 'bandpass', 2600, 3, 0.03, 0.5); tone(d, 'square', 320, 210, 0.07, 0.12, 0.05); nburst(d, 'bandpass', 3800, 4, 0.02, 0.3, 0.09); },
  knock(pos, n = 1, loud = false){
    if (!AU.ready) return; const d = dest(pos, loud ? 5 : 2);
    for (let i = 0; i < n; i++){ const at = i * (loud ? 0.75 : 0.32);
      tone(d, 'sine', loud ? 110 : 160, 50, loud ? 0.35 : 0.16, loud ? 1.6 : 0.5, at);
      nburst(d, 'lowpass', loud ? 700 : 1200, 1, loud ? 0.2 : 0.06, loud ? 1.0 : 0.4, at, 0.002, true); }
  },
  glassTap(pos, n = 3){ if (!AU.ready) return; const d = dest(pos, 2.5);
    for (let i = 0; i < n; i++){ const at = i * 0.42; tone(d, 'sine', 1900, 1650, 0.06, 0.25, at); nburst(d, 'bandpass', 3300, 4, 0.04, 0.4, at); } },
  bang(pos, big = false){
    if (!AU.ready) return; const d = dest(pos, big ? 12 : 5, 0.8);
    nburst(d, 'lowpass', big ? 500 : 800, 0.7, big ? 3 : 1.2, big ? 2.5 : 1.4, 0, 0.002, true);
    tone(d, 'sine', big ? 55 : 70, 22, big ? 2.2 : 1.0, big ? 2 : 1.1);
    nburst(d, 'highpass', 1800, 0.7, 0.35, big ? 1 : 0.5);
  },
  clang(pos, vol = 0.3, low = 1){
    if (!AU.ready) return; const d = dest(pos, 3);
    [523, 851, 1243, 1789, 2350].forEach((f, i) => tone(d, 'sine', f * low, f * low * 0.98, 0.7 + i * 0.25, vol / (1 + i * 0.4)));
    nburst(d, 'bandpass', 3000 * low, 1, 0.06, vol * 1.5);
  },
  metalBang(pos){ SND.clang(pos, 0.8, 0.45); SND.bang(pos, false); },
  drip(pos, vol = 0.22){ if (!AU.ready) return; const d = dest(pos, 1.2); tone(d, 'sine', 1700 + Math.random() * 400, 520, 0.07, vol); tone(d, 'sine', 900, 480, 0.05, vol * 0.4, 0.06); nburst(d, 'bandpass', 1400, 5, 0.04, vol * 0.4, 0.06); },
  whisper(pos, dur = 2.4, vol = 0.32){
    if (!AU.ready) return; const C = AU.ctx, t = anow(); const d = dest(pos, 2.5);
    const s = C.createBufferSource(); s.buffer = AU.noise;
    const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7;
    const g = C.createGain(); g.gain.value = 0;
    const formants = [700, 1150, 1800, 2600, 3300, 2200];
    for (let k = 0; k < dur / 0.085; k++){
      const tk = t + k * 0.085; bp.frequency.setValueAtTime(formants[(Math.random() * formants.length) | 0], tk);
      g.gain.setTargetAtTime(Math.random() < 0.25 ? 0.0 : vol * (0.4 + Math.random() * 0.6), tk, 0.02);
    }
    g.gain.setTargetAtTime(0, t + dur, 0.05);
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(d); s.start(t, Math.random()); s.stop(t + dur + 0.4);
  },
  voice(pos, dur = 1.6, vol = 0.18, pitch = 140){ // garbled distant speech
    if (!AU.ready) return; const C = AU.ctx, t = anow(); const d = dest(pos, 3);
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = pitch;
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5; const g = C.createGain(); g.gain.value = 0;
    for (let k = 0; k < dur / 0.11; k++){ const tk = t + k * 0.11;
      bp.frequency.setValueAtTime([500, 800, 1200, 1700, 950][(Math.random() * 5) | 0], tk);
      o.frequency.setTargetAtTime(pitch * (0.85 + Math.random() * 0.35), tk, 0.03);
      g.gain.setTargetAtTime(Math.random() < 0.2 ? 0 : vol, tk, 0.02); }
    g.gain.setTargetAtTime(0, t + dur, 0.05);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
    o.connect(bp); bp.connect(lp); lp.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.3);
  },
  shatter(pos){
    if (!AU.ready) return; const d = dest(pos, 3);
    nburst(d, 'highpass', 2600, 0.6, 0.7, 1.2); tone(d, 'sine', 85, 30, 0.3, 0.6);
    for (let i = 0; i < 14; i++) tone(d, 'sine', 2200 + Math.random() * 4500, 2000, 0.15 + Math.random() * 0.4, 0.07, Math.random() * 0.45);
  },
  pop(pos){ if (!AU.ready) return; const d = dest(pos, 2.5); nburst(d, 'bandpass', 5200, 1, 0.05, 0.8); for (let i = 0; i < 5; i++) tone(d, 'sine', 3000 + Math.random() * 3000, 2500, 0.15, 0.05, 0.03 + Math.random() * 0.2); },
  scream(pos, distant = false){
    if (!AU.ready) return; const C = AU.ctx, t = anow(); const d0 = dest(pos, distant ? 6 : 3, 0.7);
    const out = distant ? filt(d0, 'lowpass', 1400, 0.7) : d0; const dur = 1.8;
    [1, 1.007].forEach(m => {
      const o = C.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(420 * m, t); o.frequency.linearRampToValueAtTime(880 * m, t + 0.25); o.frequency.linearRampToValueAtTime(760 * m, t + 1.1); o.frequency.linearRampToValueAtTime(480 * m, t + dur);
      const vib = C.createOscillator(); vib.frequency.value = 6.5; const vg = C.createGain(); vg.gain.value = 22; vib.connect(vg); vg.connect(o.frequency);
      const f1 = C.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1000; f1.Q.value = 4;
      const f2 = C.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2600; f2.Q.value = 6;
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(distant ? 0.5 : 0.7, t + 0.08); g.gain.setValueAtTime(distant ? 0.45 : 0.6, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
      o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
    });
  },
  radio(pos, dur = 1.6, vol = 0.3){
    if (!AU.ready) return; const d = dest(pos, 2);
    tone(d, 'square', 1250, 1250, 0.07, vol * 0.25); nburst(d, 'bandpass', 1900, 1.2, dur, vol * 0.5, 0.06, 0.01);
    SND.voice(pos, dur * 0.75, vol * 0.5, 120); tone(d, 'square', 1250, 1250, 0.07, vol * 0.2, dur + 0.05);
  },
  sting(vol = 0.16){
    if (!AU.ready) return; const d = filt(AU.sfx, 'lowpass', 300, 1);
    d.frequency.setValueAtTime(300, anow()); d.frequency.exponentialRampToValueAtTime(3200, anow() + 0.4);
    [110, 116.5, 155.6, 233, 246.9].forEach(f => tone(d, 'sawtooth', f, f * 0.97, 2.8, vol, 0, 0.02));
    nburst(AU.sfx, 'highpass', 3000, 0.5, 0.6, vol * 1.5);
  },
  lowSwell(vol = 0.25, dur = 4){ if (!AU.ready) return; const d = filt(AU.sfx, 'lowpass', 220, 1);
    [41, 43.6, 61.7].forEach(f => tone(d, 'sawtooth', f, f, dur, vol, 0, dur * 0.6)); },
  breath(pos, vol = 0.6){
    if (!AU.ready) return; const C = AU.ctx, t = anow(); const d = dest(pos, 2.5);
    const s = C.createBufferSource(); s.buffer = AU.brown;
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(260, t); bp.frequency.linearRampToValueAtTime(520, t + 1.1); bp.frequency.linearRampToValueAtTime(180, t + 2.1);
    const sh = C.createWaveShaper(); sh.curve = AU.curve;
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 1.0); g.gain.linearRampToValueAtTime(vol * 0.25, t + 1.25); g.gain.linearRampToValueAtTime(vol * 0.9, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
    const post = C.createGain(); post.gain.value = 0.5;
    s.connect(bp); bp.connect(sh); sh.connect(g); g.connect(post); post.connect(d); s.start(t, Math.random()); s.stop(t + 2.5);
    tone(d, 'sine', 48, 40, 2.2, vol * 0.5, 0, 0.8);
  },
  mStep(pos, vol = 0.9){ if (!AU.ready) return; const d = dest(pos, 2.5, 1.0); tone(d, 'sine', 75, 34, 0.28, vol); nburst(d, 'lowpass', 320, 0.8, 0.14, vol * 0.8, 0, 0.002, true); nburst(d, 'bandpass', 2400, 4, 0.025, vol * 0.25, 0.03); },
  rustle(pos, dur = 0.5){ if (!AU.ready) return; const d = dest(pos, 1); for (let i = 0; i < 6; i++) nburst(d, 'highpass', 2800 + Math.random() * 2000, 0.6, 0.08, 0.15 + Math.random() * 0.15, i * dur / 6); },
  water(pos, dur = 1.4){ if (!AU.ready) return; const d = dest(pos, 1.5); nburst(d, 'bandpass', 1300, 0.7, dur, 0.22, 0, 0.1); nburst(d, 'highpass', 5000, 0.5, dur, 0.06, 0, 0.1);
    for (let i = 0; i < 3; i++) tone(d, 'sine', 2100 + Math.random() * 900, 1700, 0.08, 0.05, 0.3 + i * 0.35); },
  clink(pos){ if (!AU.ready) return; const d = dest(pos, 1.2); tone(d, 'sine', 3100, 3000, 0.25, 0.12); tone(d, 'sine', 4700, 4600, 0.18, 0.06, 0.01); },
  thud(pos, vol = 0.6){ if (!AU.ready) return; const d = dest(pos, 2); tone(d, 'sine', 110, 45, 0.18, vol); nburst(d, 'lowpass', 600, 1, 0.12, vol * 0.7, 0, 0.002, true); },
  scrape(pos, dur = 0.5){ if (!AU.ready) return; const d = dest(pos, 2); nburst(d, 'bandpass', 700, 2, dur, 0.5, 0, 0.04, true); nburst(d, 'bandpass', 2100, 3, dur * 0.8, 0.12, 0.02); },
  zap(pos){ if (!AU.ready) return; const d = dest(pos, 2); nburst(d, 'highpass', 1500, 0.7, 0.35, 0.5); tone(d, 'sawtooth', 120, 60, 0.4, 0.15); SND.click(pos); },
  thunk(pos){ if (!AU.ready) return; const d = dest(pos, 3); tone(d, 'sine', 70, 40, 0.35, 0.9); nburst(d, 'lowpass', 300, 1, 0.3, 0.5, 0, 0.002, true); },
  gulp(){ if (!AU.ready) return; const d = AU.sfx; [0, 0.45].forEach(a => { tone(d, 'sine', 330, 140, 0.1, 0.25, a); nburst(d, 'lowpass', 500, 2, 0.08, 0.2, a + 0.03); }); },
  heartbeat(vol = 0.6){ if (!AU.ready) return; const d = AU.sfx; tone(d, 'sine', 62, 38, 0.14, vol); tone(d, 'sine', 55, 35, 0.14, vol * 0.75, 0.26); },
  pant(vol = 0.25){ if (!AU.ready) return; nburst(AU.sfx, 'bandpass', 900, 1, 0.35, vol, 0, 0.08); nburst(AU.sfx, 'bandpass', 700, 1, 0.45, vol * 0.8, 0.45, 0.06); },
  bird(at = 0){ if (!AU.ready) return; const d = AU.sfx; const f = 2600 + Math.random() * 1600; for (let i = 0; i < 3; i++) tone(d, 'sine', f, f * 1.4, 0.07, 0.05, at + i * 0.1); },
  pickup(){ if (!AU.ready) return; tone(AU.sfx, 'sine', 520, 520, 0.08, 0.05); nburst(AU.sfx, 'highpass', 3000, 1, 0.08, 0.12); },
};

// ---------- Continuous loops ----------
function makeLoop(build, pos, vol, ref = 1.5){
  if (!AU.ready) return null;
  const C = AU.ctx; const g = C.createGain(); g.gain.value = 0; let pan = null;
  if (pos){ pan = dest(pos, ref); g.connect(pan); } else g.connect(AU.sfx);
  const inner = build(g) || {};
  const L = {
    g, pan, inner,
    setVol(v, r = 0.3){ g.gain.setTargetAtTime(v, anow(), r); },
    setPos(x, y, z){ if (pan) setPP(pan, x, y, z); },
    stop(r = 0.25){ g.gain.setTargetAtTime(0, anow(), r); const nodes = inner.nodes || []; setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { g.disconnect(); } catch (e) {} }, r * 6000 + 100); if (inner.seq) AU.seqs = AU.seqs.filter(s => s !== inner.seq); }
  };
  L.setVol(vol); return L;
}
function loopNoise(g, type, freq, q, brown){ const C = AU.ctx; const s = C.createBufferSource(); s.buffer = brown ? AU.brown : AU.noise; s.loop = true; const f = C.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(g); s.start(); return { s, f }; }

const LOOPS = {
  hum(pos){ return makeLoop(g => { const C = AU.ctx; const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60; const o2 = C.createOscillator(); o2.frequency.value = 120;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; o.connect(lp); o2.connect(lp); lp.connect(g); o.start(); o2.start();
    const n = loopNoise(g, 'bandpass', 6000, 3); return { nodes: [o, o2, n.s] }; }, pos, 0.05, 1.2); },
  washer(pos){ return makeLoop(g => { const C = AU.ctx; const n = loopNoise(g, 'lowpass', 240, 1, true); const o = C.createOscillator(); o.frequency.value = 46; const am = C.createGain(); am.gain.value = 0.5;
    const lfo = C.createOscillator(); lfo.frequency.value = 1.3; const lg = C.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(am.gain); o.connect(am); am.connect(g); o.start(); lfo.start(); return { nodes: [n.s, o, lfo] }; }, pos, 0.5, 1.5); },
  drone(pos, vol = 0.12){ return makeLoop(g => { const C = AU.ctx; const nodes = []; [36.7, 37.2, 55.1].forEach(f => { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; o.connect(lp); lp.connect(g); o.start(); nodes.push(o); }); return { nodes }; }, pos, vol, 2); },
  chase(){ // drone + tremolo strings + heartbeat pulses scheduled from game loop
    return makeLoop(g => {
      const C = AU.ctx, nodes = [];
      const low = C.createGain(); low.gain.value = 0.5; low.connect(g);
      [55, 55.6, 82.4].forEach(f => { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; o.connect(lp); lp.connect(low); o.start(); nodes.push(o); });
      const hi = C.createGain(); hi.gain.value = 0; hi.connect(g);
      const trem = C.createOscillator(); trem.frequency.value = 9; const tg = C.createGain(); tg.gain.value = 0.5; trem.connect(tg); tg.connect(hi.gain); trem.start(); nodes.push(trem);
      [466.2, 493.9, 698.5].forEach(f => { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 2; const og = C.createGain(); og.gain.value = 0.12; o.connect(bp); bp.connect(og); og.connect(hi); o.start(); nodes.push(o); });
      const seq = { next: anow(), intensity: 0, tick(){ const c = this; if (!AU.ready) return; const rate = 0.95 - c.intensity * 0.55; while (c.next < anow() + 0.15){ const at = Math.max(0, c.next - anow()); tone(g, 'sine', 62, 36, 0.16, 0.9, at); tone(g, 'sine', 55, 33, 0.16, 0.65, at + 0.24); if (c.intensity > 0.55) nburst(g, 'highpass', 6000, 1, 0.05, 0.15, at + rate / 2); c.next += rate; } } };
      AU.seqs.push(seq);
      return { nodes, seq, hi, low };
    }, null, 0.0);
  },
  music(pos){ // a soft music-box waltz from the neighbor's record player
    return makeLoop(g => {
      const notes = [[76,1],[79,1],[83,1],[81,2],[79,1],[76,1],[74,1],[76,2],[72,1],[74,1],[76,1],[79,2],[76,1],[74,3],[71,1],[72,1],[74,1],[76,2],[79,1],[81,1],[79,1],[76,2],[74,1],[72,3]];
      const bass = [48, 55, 52, 57, 53, 55, 48, 43];
      const seq = { next: anow() + 0.1, i: 0, b: 0, beat: 0.42, tick(){ const s = this; while (s.next < anow() + 0.2){ const at = Math.max(0, s.next - anow()); const [m, len] = notes[s.i % notes.length]; const f = 440 * Math.pow(2, (m - 69) / 12);
        tone(g, 'sine', f, f, 1.6, 0.16, at, 0.004); tone(g, 'triangle', f * 2, f * 2, 0.6, 0.04, at, 0.002);
        if (s.i % 3 === 0){ const bm = bass[(s.b++) % bass.length]; const bf = 440 * Math.pow(2, (bm - 69) / 12); tone(g, 'triangle', bf, bf, 1.8, 0.09, at, 0.01); }
        s.next += len * s.beat; s.i++; } } };
      AU.seqs.push(seq);
      const hg = AU.ctx.createGain(); hg.gain.value = 0.025; hg.connect(g);
      const n = loopNoise(hg, 'bandpass', 3000, 0.4); // vinyl hiss
      return { nodes: [n.s], seq };
    }, pos, 0.55, 2);
  },
};

// Ambience: rain + wind, filtered by indoor/outdoor
function startAmbience(){
  const C = AU.ctx;
  const rg = C.createGain(); rg.gain.value = 0; rg.connect(AU.amb);
  const r = loopNoise(rg, 'highpass', 800, 0.5); const rlp = C.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 6000; r.f.disconnect(); r.f.connect(rlp); rlp.connect(rg);
  const wg = C.createGain(); wg.gain.value = 0; wg.connect(AU.amb);
  const w = loopNoise(wg, 'bandpass', 320, 0.7, true);
  const lfo = C.createOscillator(); lfo.frequency.value = 0.06; const lg = C.createGain(); lg.gain.value = 200; lfo.connect(lg); lg.connect(w.f.frequency); lfo.start();
  const tg = C.createGain(); tg.gain.value = 0; tg.connect(AU.amb); // room tone
  const t = loopNoise(tg, 'lowpass', 140, 0.7, true);
  AU.loops.rain = { g: rg, lp: rlp }; AU.loops.wind = { g: wg }; AU.loops.room = { g: tg };
}
const AMB = { rain: 0.5, wind: 0.3, indoor: 0, master: 1, target: 1 };
function ambUpdate(indoor, dt){
  if (!AU.ready) return;
  AMB.indoor += (indoor - AMB.indoor) * Math.min(1, dt * 2);
  const m = AMB.master;
  AU.loops.rain.g.gain.setTargetAtTime(AMB.rain * m * (1 - AMB.indoor * 0.55) * 0.55, anow(), 0.2);
  AU.loops.rain.lp.frequency.setTargetAtTime(6000 - AMB.indoor * 5000, anow(), 0.2);
  AU.loops.wind.g.gain.setTargetAtTime(AMB.wind * m * (1 - AMB.indoor * 0.7) * 0.5, anow(), 0.3);
  AU.loops.room.g.gain.setTargetAtTime(0.18 * AMB.indoor * m, anow(), 0.3);
  // occasional rain ticks on windows/gutters
  if (Math.random() < dt * 5 * AMB.rain * m){ const d = AU.sfx; nburst(d, 'bandpass', 3000 + Math.random() * 3000, 3, 0.02, 0.04 * (1 - AMB.indoor * 0.5)); }
}
function audioUpdate(dt){ if (!AU.ready) return; AU.seqs.forEach(s => s.tick()); }
function audioListener(cam){
  if (!AU.ready) return; const L = AU.ctx.listener; const p = cam.position;
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); const u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  if (L.positionX){ L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
  else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
}
function setMasterVol(v){ AU.vol = v; if (AU.ready) AU.master.gain.setTargetAtTime(v, anow(), 0.05); }
