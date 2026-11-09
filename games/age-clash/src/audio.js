/* =========================================================================
 * audio.js — gesynthetiseerde geluiden (WebAudio, geen bestanden nodig).
 * Ieder tijdperk heeft een eigen klankkleur: hout/steen → buskruit → synth.
 * Plus een eenvoudige procedurele muziekloop per tijdperk.
 * ========================================================================= */
var AC = window.AC;
(function () {
  function Audio() {
    this.ctx = null; this.master = null; this.sfx = null; this.mus = null;
    this.vol = 0.7; this.musVol = 0.35; this.muted = false;
    this.last = {}; this.noiseBuf = null; this.musicOn = false; this.musicAge = 0; this.nextBeat = 0; this.step = 0;
  }
  AC.Audio = Audio;
  var P = Audio.prototype;

  P.init = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.mus = this.ctx.createGain(); this.mus.connect(this.master);
      var len = this.ctx.sampleRate * 1, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.apply();
    } catch (e) { this.ctx = null; }
  };
  P.apply = function () {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfx.gain.value = this.vol * 0.5;
    this.mus.gain.value = this.musVol * 0.4;
  };

  P._tone = function (type, f0, f1, dur, vol, dest, delay) {
    var c = this.ctx, t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  };
  P._noise = function (dur, vol, fType, freq, q, dest, delay) {
    var c = this.ctx, t = c.currentTime + (delay || 0);
    var s = c.createBufferSource(); s.buffer = this.noiseBuf;
    var f = c.createBiquadFilter(); f.type = fType || 'lowpass'; f.frequency.value = freq || 1000; f.Q.value = q || 1;
    var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  };

  P._ok = function (key, gap) {
    if (!this.ctx || this.muted) return false;
    var now = this.ctx.currentTime;
    if (this.last[key] && now - this.last[key] < gap) return false;
    this.last[key] = now; return true;
  };

  P.attack = function (e) {
    var age = e.age;
    if (e.atk === 'melee') {
      if (!this._ok('melee', 0.07)) return;
      if (age <= 3) this._noise(0.08, 0.35, 'bandpass', 600 + Math.random() * 400, 2);
      else if (age <= 5) { this._noise(0.06, 0.3, 'highpass', 2500, 1); this._tone('triangle', 900, 500, 0.06, 0.08); }
      else this._tone('sawtooth', 1200 + Math.random() * 400, 300, 0.12, 0.08);
    } else if (e.atk === 'beam') {
      if (!this._ok('beam', 0.09)) return;
      this._tone('sawtooth', 1800, 200, 0.18, 0.07); this._tone('sine', 900, 1600, 0.12, 0.05);
    } else {
      if (!this._ok('shot' + (age > 4 ? 'g' : 'a'), 0.06)) return;
      if (age <= 3) { this._noise(0.12, 0.18, 'bandpass', 1800, 4); this._tone('triangle', 400, 900, 0.08, 0.04); }
      else if (age <= 5) { this._noise(0.18, 0.4, 'lowpass', 1600, 1); this._tone('square', 140, 60, 0.1, 0.06); }
      else if (age === 6) { this._tone('square', 900, 300, 0.1, 0.06); this._noise(0.05, 0.15, 'highpass', 3000); }
      else { this._tone('sine', 300, 1400, 0.16, 0.08); this._tone('triangle', 1500, 400, 0.18, 0.04); }
    }
  };

  P.play = function (k, age, size) {
    if (!this.ctx || this.muted) return;
    age = age || 0;
    switch (k) {
      case 'spawn': if (this._ok('spawn', 0.1)) this._tone(age >= 6 ? 'square' : 'triangle', 300 + age * 40, 500 + age * 60, 0.09, 0.06); break;
      case 'hit': if (this._ok('hit', 0.05)) this._noise(0.05, 0.18, 'bandpass', 900 + age * 200, 1.5); break;
      case 'death': if (this._ok('death', 0.08)) { this._noise(0.22, 0.25, 'lowpass', 500, 1); this._tone('sine', 220, 70, 0.2, 0.08); } break;
      case 'boom': if (this._ok('boom', 0.09)) { var s = Math.min(2, size || 1); this._noise(0.4 + s * 0.3, 0.45 * Math.min(1.4, s + 0.3), 'lowpass', 300 + 400 / s, 1); this._tone('sine', 120, 35, 0.35 + s * 0.2, 0.18); } break;
      case 'tshot0': if (this._ok('t0', 0.08)) this._tone(age >= 6 ? 'square' : 'triangle', 1100, 700, 0.04, 0.035); break;
      case 'tshot1': if (this._ok('t1', 0.2)) { this._noise(0.25, 0.3, 'highpass', 800, 1); this._tone('sawtooth', 600, 100, 0.2, 0.06); } break;
      case 'tshot2': if (this._ok('t2', 0.2)) { this._tone('sine', 160, 60, 0.25, 0.14); this._noise(0.15, 0.2, 'lowpass', 600); } break;
      case 'evolve': {
        var base = [220, 247, 262, 294, 330, 349, 392, 440][age] || 262;
        [0, 4, 7, 12].forEach(function (n, i) { this._tone('triangle', base * Math.pow(2, n / 12), null, 0.5, 0.12, null, i * 0.11); this._tone('sine', base * 2 * Math.pow(2, n / 12), null, 0.4, 0.05, null, i * 0.11); }, this);
        break;
      }
      case 'power': this._tone('sawtooth', 120, 600, 0.6, 0.1); this._noise(0.8, 0.25, 'bandpass', 400, 0.8); break;
      case 'potion': [0, 4, 7, 12].forEach(function (n, i) { this._tone('sine', 520 * Math.pow(2, n / 12), null, 0.18, 0.07, null, i * 0.06); }, this); this._noise(0.3, 0.12, 'bandpass', 2400, 3); break;
      case 'buff': this._tone('sawtooth', 220, 880, 0.35, 0.08); this._tone('triangle', 440, 1320, 0.4, 0.06, null, 0.1); break;
      case 'freeze': this._tone('sine', 2400, 600, 0.6, 0.07); this._noise(0.6, 0.2, 'highpass', 4000, 1); break;
      case 'throw': this._noise(0.25, 0.2, 'bandpass', 900, 2); this._tone('triangle', 300, 600, 0.2, 0.05); break;
      case 'build': this._tone('triangle', 400, 800, 0.12, 0.08); this._tone('triangle', 600, 1200, 0.12, 0.06, null, 0.08); break;
      case 'upgrade': this._tone('sine', 660, 1320, 0.15, 0.08); this._tone('sine', 990, 1980, 0.15, 0.05, null, 0.06); break;
      case 'charge': this._noise(0.3, 0.3, 'lowpass', 300); break;
      case 'blink': this._tone('sine', 1600, 200, 0.25, 0.08); break;
      case 'click': this._tone('triangle', 700, 900, 0.05, 0.06); break;
      case 'deny': this._tone('square', 180, 140, 0.12, 0.05); break;
      case 'coin': this._tone('square', 988, null, 0.08, 0.05); this._tone('square', 1318, null, 0.2, 0.05, null, 0.08); break;
      case 'win': [0, 4, 7, 12, 16].forEach(function (n, i) { this._tone('triangle', 330 * Math.pow(2, n / 12), null, 0.6, 0.12, null, i * 0.14); }, this); break;
      case 'lose': [0, -3, -7, -12].forEach(function (n, i) { this._tone('triangle', 330 * Math.pow(2, n / 12), null, 0.7, 0.12, null, i * 0.22); }, this); break;
    }
  };

  /* ------------------------------ muziek ------------------------------ */
  var SCALES = [[0, 3, 5, 7, 10], [0, 2, 4, 7, 9], [0, 1, 4, 5, 7, 8], [0, 2, 3, 5, 7, 8, 10], [0, 2, 4, 5, 7, 9, 11], [0, 3, 5, 6, 7, 10], [0, 3, 7, 10, 12], [0, 1, 5, 6, 8, 11]];
  var ROOT = [98, 110, 104, 98, 110, 82, 73, 65];
  P.music = function (on, age) {
    this.musicOn = on; if (age != null) this.musicAge = age;
    if (on && this.ctx) this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + 0.05);
  };
  P.update = function () {
    if (!this.ctx || !this.musicOn || this.muted || this.musVol <= 0) return;
    var c = this.ctx, age = this.musicAge, bpm = [92, 96, 100, 104, 110, 118, 126, 112][age], spb = 60 / bpm / 2;
    while (this.nextBeat < c.currentTime + 0.25) {
      var t = this.nextBeat - c.currentTime, st = this.step % 16, sc = SCALES[age], root = ROOT[age];
      if (st % 4 === 0) { // kick / trom
        if (age <= 3) this._noise(0.18, 0.35, 'lowpass', 180, 1, this.mus, t); else this._tone('sine', 110, 40, 0.18, 0.3, this.mus, t);
      }
      if (st % 8 === 4) this._noise(age >= 5 ? 0.12 : 0.08, age >= 5 ? 0.25 : 0.15, 'highpass', age >= 5 ? 1800 : 900, 1, this.mus, t);
      if (st % 2 === 1 && age >= 4) this._noise(0.03, 0.06, 'highpass', 6000, 1, this.mus, t);
      if (st % 4 === 0 || (st % 4 === 3 && (this.step >> 4) % 2)) {
        var bn = sc[(this.step >> 2) % 2 ? 0 : (st === 8 ? 3 % sc.length : 0)];
        this._tone(age >= 6 ? 'sawtooth' : 'triangle', root * Math.pow(2, bn / 12), null, spb * 1.8, 0.09, this.mus, t);
      }
      if (st % 2 === 0 && Math.random() < 0.45) {
        var n = sc[Math.floor(Math.random() * sc.length)] + 12 * (Math.random() < 0.3 ? 2 : 1);
        this._tone(age >= 6 ? 'square' : age >= 4 ? 'triangle' : 'sine', root * 2 * Math.pow(2, n / 12), null, spb * 1.5, 0.035, this.mus, t);
      }
      this.nextBeat += spb; this.step++;
    }
  };
})();
