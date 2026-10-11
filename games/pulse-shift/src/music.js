// =============================================================
//  MUSIC — procedural soundtrack, one track per boss.
//
//  Each track has:
//    bpm   : starting tempo (bosses can change it per phase)
//    url   : OPTIONAL path to your own audio file, e.g. 'music/my-song.mp3'.
//            When set, that file plays instead of the synth. The combat
//            still runs on the shared beat clock, so set the boss BPMs in
//            its file (bpms getter) to match your song.
//    offset: seconds to delay the file so its first beat lines up
//    play(A, t, s, layer): called on every 16th note.
//       A     = PS.Audio (instruments)
//       t     = exact audio time to play at
//       s     = step info { stepInBar 0-15, sub 0-3, beatInBar 0-3, bar, beatDur }
//       layer = intensity 0..3 (rises with boss phase)
// =============================================================
(function () {
  // 'x' = hit. e.g. hit('x...x...', i) is true on steps 0 and 4
  const hit = (pattern, i) => pattern[i % pattern.length] !== '.';

  PS.Tracks = {};

  // ---------------- MENU ----------------
  PS.Tracks.menu = {
    name: 'Standby', bpm: 100, url: null, offset: 0,
    play(A, t, s) {
      const i = s.stepInBar, chords = [[57, 60, 64, 71], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]];
      const ch = chords[((s.bar % 4) + 4) % 4];
      if (hit('x.......x.......', i)) A.kick(t, 0.55);
      if (hit('..x...x...x...x.', i)) A.hat(t, 0.25);
      if (i === 0) A.pad(t, ch, s.beatDur * 4, 0.7);
      if (hit('x..x..x.', i) && s.bar % 2 === 1) A.bell(t, ch[(i / 2 | 0) % 4] + 12, 0.6, 0.6);
    }
  };

  // ---------------- TUTORIAL ----------------
  PS.Tracks.tutorial = {
    name: 'First Steps', bpm: 108, url: null, offset: 0,
    play(A, t, s) {
      const i = s.stepInBar, roots = [45, 41, 48, 43];
      const r = roots[((s.bar % 4) + 4) % 4];
      if (hit('x...x...x...x...', i)) A.kick(t, 0.8);
      if (s.sub === 0) A.tick(t, s.beatInBar === 0 ? 1760 : 1175, 0.25);
      if (hit('..x.', i)) A.hat(t, 0.35);
      if (hit('..x...x...x...xx', i)) A.bass(t, r - 12, s.beatDur * 0.4, 0.7);
    }
  };

  // ---------------- BOSS 1: THE METRONOME ----------------
  // Driving A-minor techno. Every beat has a tick/tock wood block.
  PS.Tracks.metronome = {
    name: 'Escapement', bpm: 124, url: null, offset: 0,
    play(A, t, s, L) {
      const i = s.stepInBar;
      const chords = [{ r: 57, q: [0, 3, 7] }, { r: 53, q: [0, 4, 7] }, { r: 60, q: [0, 4, 7] }, { r: 55, q: [0, 4, 7] }];
      const ch = chords[((s.bar % 4) + 4) % 4];
      if (hit('x...x...x...x...', i)) A.kick(t, 1);
      if (s.sub === 0) A.tick(t, s.beatInBar % 2 === 0 ? 1760 : 1175, 0.3); // tick... tock...
      if (hit('..x.', i)) A.hat(t, 0.45);
      if (L >= 1 && hit('....x.......x...', i)) A.snare(t, 0.8);
      if (L >= 2 && hit('x.xx', i)) A.hat(t, 0.22);
      // bass
      if (L === 0 && hit('..x.', i)) A.bass(t, ch.r - 24, s.beatDur * 0.3, 0.8);
      if (L >= 1 && hit('x.xxx.xxx.xxx.xx', i)) A.bass(t, ch.r - 24 + (i % 4 === 2 ? 12 : 0), s.beatDur * 0.22, 0.75);
      // arpeggio
      if (L >= 1) {
        const notes = [0, 1, 2, 1, 0, 2, 1, 2];
        if (i % 2 === 0) A.pluck(t, ch.r + 12 + ch.q[notes[(i / 2) % 8]], s.beatDur * 0.35, L >= 2 ? 0.9 : 0.5);
      }
      if (L >= 2 && i === 0) A.pad(t, ch.q.map((q) => ch.r + q), s.beatDur * 4, 0.8);
      if (L >= 3 && hit('...x..x.', i)) A.pluck(t, ch.r + 24 + ch.q[2], s.beatDur * 0.2, 0.5, 'sawtooth');
    }
  };

  // ---------------- BOSS 2: STATIC SERAPH ----------------
  // Airy, glassy bells over a half-time beat in D.
  PS.Tracks.seraph = {
    name: 'Lattice Hymn', bpm: 112, url: null, offset: 0,
    play(A, t, s, L) {
      const i = s.stepInBar;
      const chords = [[62, 66, 69, 73], [64, 67, 71, 74], [59, 62, 66, 69], [55, 59, 62, 66]];
      const ch = chords[((s.bar % 4) + 4) % 4];
      if (hit('x.........x.....', i)) A.kick(t, 0.9);
      if (L >= 1 && hit('x.....x...x.....', i)) A.kick(t, 0.7);
      if (hit('........x.......', i)) A.clap(t, 0.8);
      A.hat(t, (i % 4 === 2 ? 0.4 : 0.12) + Math.random() * 0.08);
      if (i === 0) A.pad(t, ch, s.beatDur * 4, 1);
      if (hit('x.x.', i)) A.bell(t, ch[(i / 2) % 4] + 12, s.beatDur * 1.5, 0.7);
      if (L >= 2 && hit('.x.x', i)) A.bell(t, ch[(i + 1) % 4] + 24, s.beatDur, 0.4);
      if (hit('x.......x.......', i)) A.bass(t, ch[0] - 24, s.beatDur * 1.5, 0.7);
      if (L >= 2 && hit('......x.......x.', i)) A.bass(t, ch[0] - 12, s.beatDur * 0.4, 0.6);
    }
  };

  // ---------------- BOSS 3: THE OFFBEAT ----------------
  // Syncopated E-phrygian groove. At high intensity drums randomly drop out.
  PS.Tracks.offbeat = {
    name: 'Displacement', bpm: 100, url: null, offset: 0,
    play(A, t, s, L) {
      const i = s.stepInBar;
      const drop = L >= 3 ? 0.18 : 0; // chance to skip a hit in the final phase
      const ok = () => Math.random() >= drop;
      const roots = [40, 41, 40, 43];
      const r = roots[((s.bar % 4) + 4) % 4];
      if (hit('x..x..x...x.x...', i) && ok()) A.kick(t, 1);
      if (hit('......x.......x.', i) && ok()) A.snare(t, 0.8);
      if (hit('x.x..x.x.xx..x.x', i) && ok()) A.hat(t, 0.35);
      if (hit('x..x..x...x..x..', i)) A.bass(t, r - 12 + (i === 10 ? 12 : 0), s.beatDur * 0.3, 0.8);
      if (L >= 1 && hit('...x.....x....x.', i)) A.pluck(t, r + 24 + [0, 1, 7, 3][(i >> 2)], s.beatDur * 0.25, 0.7, 'sawtooth');
      if (L >= 2 && i === 2) A.pad(t, [r + 12, r + 13, r + 19], s.beatDur * 3, 0.7);
      if (L >= 3 && Math.random() < 0.12) A.pluck(t, r + 36 + PS.U.choose([0, 1, 5, 7]), 0.05, 0.6, 'square'); // glitches
    }
  };

  // ---------------- SURVIVAL ----------------
  PS.Tracks.survival = {
    name: 'Overrun', bpm: 120, url: null, offset: 0,
    play(A, t, s, L) {
      const i = s.stepInBar;
      const roots = [48, 44, 51, 46];
      const r = roots[((s.bar % 4) + 4) % 4];
      if (hit('x...x...x...x...', i)) A.kick(t, 1);
      if (hit('..x.', i)) A.hat(t, 0.4);
      if (L >= 1 && hit('....x.......x...', i)) A.clap(t, 0.7);
      if (hit('x.xx', i)) A.bass(t, r - 24, s.beatDur * 0.2, 0.7);
      if (L >= 1 && i % 2 === 0) A.pluck(t, r + 12 + [0, 3, 7, 10][(i / 2) % 4], s.beatDur * 0.3, 0.6);
      if (L >= 2 && i === 0) A.pad(t, [r, r + 3, r + 7], s.beatDur * 4, 0.8);
      if (L >= 3 && hit('x.x.x.x.', i)) A.hat(t, 0.2, i === 14);
    }
  };
})();
