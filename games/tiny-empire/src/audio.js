/* =====================================================================
   AUDIO — tiny synthesized sound effects (no audio files needed).
   Sound starts only after the first click (browser autoplay rules).
   ===================================================================== */
(function (TE) {
  'use strict';
  let ac = null;
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone(freq, dur, type, vol, delay, slide) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    place: () => { tone(420, 0.08, 'triangle', 0.08); tone(620, 0.1, 'triangle', 0.06, 0.05); },
    road: () => tone(300, 0.04, 'square', 0.025),
    coin: () => { tone(988, 0.07, 'square', 0.04); tone(1319, 0.14, 'square', 0.04, 0.06); },
    upgrade: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, i * 0.06)),
    discover: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'sine', 0.08, i * 0.08)),
    level: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.1)),
    error: () => tone(200, 0.18, 'sawtooth', 0.04, 0, 140),
    demolish: () => tone(160, 0.25, 'sawtooth', 0.05, 0, 60),
    event: () => { tone(660, 0.12, 'sine', 0.06); tone(880, 0.16, 'sine', 0.06, 0.12); },
    click: () => tone(700, 0.03, 'sine', 0.03),
  };
  TE.Audio = {
    play(name) {
      if (!TE.S || !TE.S.settings.sound) return;
      try { SFX[name] && SFX[name](); } catch (e) { /* audio is optional */ }
    },
  };
})(window.TE = window.TE || {});
