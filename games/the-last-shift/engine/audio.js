// Ruimtelijk audiosysteem: HRTF-panning, afstandsdemping, galm en occlusie door muren/deuren.
import { makeSounds, mulberry32 } from './dsp.js';

const SCARY = /^(scream|shriek|stinger|locker_burst|door_slam|bang_door_hard|sub_boom)/;

export class AudioEngine {
  constructor() {
    this.ctx = null; this.buffers = {}; this.variants = {}; this.handles = new Set();
    this.occlusionFn = null; this.volume = 0.8; this.scareVolume = 0.85;
    this.rand = mulberry32(777);
  }
  // Synthese vooraf (tijdens het laadscherm), los van de AudioContext
  async prepare(sr = 48000) { await new Promise((r) => setTimeout(r, 30)); this.sr = sr; if (!(window.AudioContext || window.webkitAudioContext)) { this.raw = {}; return; } this.raw = makeSounds(sr); }
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // geen Web Audio (bv. in tests): stil spelen
    try { this.ctx = new AC({ latencyHint: 'interactive', sampleRate: this.sr }); } catch (e) { this.ctx = new AC(); }
    const c = this.ctx;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -8; this.limiter.knee.value = 4; this.limiter.ratio.value = 16; this.limiter.attack.value = 0.002; this.limiter.release.value = 0.25;
    this.master = c.createGain(); this.master.gain.value = this.volume;
    this.master.connect(this.limiter); this.limiter.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.scare = c.createGain(); this.scare.gain.value = this.scareVolume; this.scare.connect(this.master);
    this.amb = c.createGain(); this.amb.connect(this.master);
    // galm
    this.convolver = c.createConvolver(); this.convolver.buffer = this.makeIR(2.6);
    this.reverbIn = c.createGain(); this.reverbOut = c.createGain(); this.reverbOut.gain.value = 0.6;
    this.reverbIn.connect(this.convolver); this.convolver.connect(this.reverbOut); this.reverbOut.connect(this.master);
    const raw = this.raw;
    for (const [k, v] of Object.entries(raw)) {
      let buf;
      if (v.ch) { buf = c.createBuffer(2, v.ch[0].length, this.sr); buf.copyToChannel(v.ch[0], 0); buf.copyToChannel(v.ch[1], 1); }
      else { buf = c.createBuffer(1, v.length, this.sr); buf.copyToChannel(v, 0); }
      this.buffers[k] = buf;
      const m = k.match(/^(.*)_(\d+)$/);
      if (m) (this.variants[m[1]] ||= []).push(k);
    }
  }
  makeIR(sec) {
    const c = this.ctx, len = Math.floor(sec * c.sampleRate), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / c.sampleRate;
        const early = t < 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 2 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t / sec, 2.5) * Math.exp(-t * 2.2) + early) * 0.5;
      }
      // donkerder maken (simpele lowpass)
      let y = 0; for (let i = 0; i < len; i++) { y += (d[i] - y) * 0.35; d[i] = y; }
    }
    return b;
  }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setScareVolume(v) { this.scareVolume = v; if (this.scare) this.scare.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setReverb(amount) { if (this.reverbOut) this.reverbOut.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.4); }
  pick(name) {
    if (this.buffers[name]) return name;
    const v = this.variants[name]; if (!v) return null;
    return v[Math.floor(this.rand() * v.length)];
  }
  updateListener(cam) {
    if (!this.ctx) return;
    const L = this.ctx.listener, p = cam.position, t = this.ctx.currentTime;
    const f = this._f || (this._f = { x: 0, y: 0, z: -1 });
    const e = cam.matrixWorld.elements;
    f.x = -e[8]; f.y = -e[9]; f.z = -e[10];
    if (L.positionX) {
      L.positionX.setValueAtTime(p.x, t); L.positionY.setValueAtTime(p.y, t); L.positionZ.setValueAtTime(p.z, t);
      L.forwardX.setValueAtTime(f.x, t); L.forwardY.setValueAtTime(f.y, t); L.forwardZ.setValueAtTime(f.z, t);
      L.upX.setValueAtTime(e[4], t); L.upY.setValueAtTime(e[5], t); L.upZ.setValueAtTime(e[6], t);
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, e[4], e[5], e[6]); }
    this.listenerPos = p;
  }
  /**
   * opts: pos {x,y,z} | follow (object met .position) | volume | rate | loop | reverb (0..1) |
   *       occlude (bool) | ref (refDistance) | rolloff | bus ('sfx'|'amb'|'scare') | delay
   */
  play(name, o = {}) {
    if (!this.ctx) return null;
    const key = this.pick(name); if (!key) { console.warn('geen geluid', name); return null; }
    const c = this.ctx, now = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.buffers[key];
    src.loop = !!o.loop;
    src.playbackRate.value = (o.rate || 1) * (o.detune === false ? 1 : 1 + (this.rand() - 0.5) * (o.vary ?? 0.06));
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 20000; filt.Q.value = 0.5;
    const gain = c.createGain(); gain.gain.value = o.volume ?? 1;
    src.connect(filt); filt.connect(gain);
    const bus = o.bus === 'amb' ? this.amb : (o.bus === 'scare' || SCARY.test(name)) ? this.scare : this.sfx;
    let panner = null;
    const spatial = o.pos || o.follow;
    if (spatial) {
      panner = c.createPanner();
      panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
      panner.refDistance = o.ref ?? 1.2; panner.rolloffFactor = o.rolloff ?? 1.3; panner.maxDistance = 200;
      const p = o.pos || o.follow.position;
      if (panner.positionX) { panner.positionX.value = p.x; panner.positionY.value = p.y; panner.positionZ.value = p.z; } else panner.setPosition(p.x, p.y, p.z);
      gain.connect(panner); panner.connect(bus);
    } else gain.connect(bus);
    let send = null;
    const rv = o.reverb ?? (spatial ? 0.5 : 0.15);
    if (rv > 0) { send = c.createGain(); send.gain.value = rv; gain.connect(send); send.connect(this.reverbIn); }
    src.start(now, o.offset || 0);
    const h = { name, src, gain, filt, panner, send, pos: o.pos ? { ...o.pos } : null, follow: o.follow || null, occlude: o.occlude !== false && spatial, base: o.volume ?? 1, alive: true, t0: now };
    src.onended = () => { h.alive = false; this.handles.delete(h); };
    h.stop = (fadeT = 0.05) => { if (!h.alive) return; try { gain.gain.setTargetAtTime(0, c.currentTime, fadeT / 3); src.stop(c.currentTime + fadeT + 0.05); } catch (e) { /* al gestopt */ } h.alive = false; this.handles.delete(h); };
    h.setVolume = (v, tc = 0.1) => { h.base = v; };
    h.setPos = (p) => { h.pos = { x: p.x, y: p.y, z: p.z }; };
    this.handles.add(h);
    if (h.occlude) this.applyOcclusion(h, true);
    return h;
  }
  applyOcclusion(h, instant) {
    const p = h.follow ? h.follow.position : h.pos;
    if (!p) return;
    if (h.panner) {
      const t = this.ctx.currentTime;
      if (h.panner.positionX) { h.panner.positionX.setTargetAtTime(p.x, t, 0.03); h.panner.positionY.setTargetAtTime(p.y, t, 0.03); h.panner.positionZ.setTargetAtTime(p.z, t, 0.03); }
      else h.panner.setPosition(p.x, p.y, p.z);
    }
    let occ = 0;
    if (h.occlude && this.occlusionFn && this.listenerPos) occ = this.occlusionFn(this.listenerPos, p);
    const f = occ <= 0 ? 18000 : Math.max(280, 2600 / (occ * 1.3));
    const g = h.base * (occ <= 0 ? 1 : Math.max(0.12, Math.pow(0.5, occ)));
    const t = this.ctx.currentTime;
    if (instant) { h.filt.frequency.value = f; h.gain.gain.value = g; }
    else { h.filt.frequency.setTargetAtTime(f, t, 0.08); h.gain.gain.setTargetAtTime(g, t, 0.08); }
    // achter muren klinkt het "kamerachtiger"
    if (h.send) h.send.gain.setTargetAtTime(Math.min(1, 0.45 + occ * 0.25), t, 0.2);
  }
  update() {
    if (!this.ctx) return;
    for (const h of this.handles) if (h.occlude || h.follow) this.applyOcclusion(h, false);
    for (const h of this.handles) if (!h.occlude && !h.follow && h.gain && h._lastBase !== h.base) { h.gain.gain.setTargetAtTime(h.base, this.ctx.currentTime, 0.1); h._lastBase = h.base; }
  }
  stopAll() { for (const h of [...this.handles]) h.stop(0.2); }
  duck(amount, time) {
    // korte stilte na een intens geluid
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.amb.gain.cancelScheduledValues(t); this.amb.gain.setValueAtTime(this.amb.gain.value, t);
    this.amb.gain.linearRampToValueAtTime(amount, t + 0.05); this.amb.gain.setTargetAtTime(1, t + time, time * 0.5);
  }
}
