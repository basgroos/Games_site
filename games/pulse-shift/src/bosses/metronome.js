// =============================================================
//  BOSS 1: THE METRONOME — Keeper of the Tempo
//
//  Silhouette: giant rotating octagon gear with a swinging needle.
//  Movement challenge: rhythm discipline. Every attack lands on
//  the beat; the needle laser swings like a real metronome.
//
//  Phase I   "TICK"     : shockwaves with gaps, breakable spirals, needle laser
//  Phase II  "TOCK"     : rotating orbit walls that reverse, checkerboard floor
//  Phase III "FRACTURE" : splits into 4 orbiting fragments attacking from
//                         every side, with sudden TEMPO SHIFTS
//
//  Each p_xxx method is one attack. It returns how many bars it lasts.
// =============================================================
PS.Bosses.metronome = class extends PS.Boss {
  constructor(g) {
    super(g);
    this.name = 'THE METRONOME';
    this.subtitle = 'Keeper of the Tempo';
    this.track = 'metronome';
    this.bodyRadius = 64;
    this.hitRadius = 100;
    this.ringSpin = 0;
    this.fragments = null;
    this.fragT = 0;
    this.orbitAng = 0;
    this.slowTempo = false;
    this.phaseNames = ['PHASE I — TICK', 'PHASE II — TOCK', 'PHASE III — FRACTURE'];
  }

  get bpms() { return [124, 136, 148]; }

  phaseSubtitle(n) {
    return ['', 'the walls begin to turn', 'it breaks apart — watch every side'][n];
  }

  sequences() {
    return [
      [this.p_shockTick, this.p_spiral, this.p_needle, this.p_pendulumWall, this.p_tickRain, this.p_spiral, this.p_shockSpiral],
      [this.p_orbitWalls, this.p_clockHands, this.p_checker, this.p_spiralFast, this.p_pendulumWall, this.p_needleDouble, this.p_aimedShock],
      [this.p_fragRings, this.p_alarm, this.p_crossLasers, this.p_fragSpiral, this.p_coreHands, this.p_fragShock, this.p_alarm, this.p_fragAimed]
    ];
  }

  // ---------- helpers ----------
  needleAngle() { return -Math.PI / 2 + Math.sin((this.g.clock.beat * Math.PI) / 2) * 0.85; }
  pivot() { return { x: this.x, y: this.y + 38 }; }
  frag(i) { return this.fragments[i % this.fragments.length]; }

  // =================== PHASE I ===================
  p_shockTick() {
    const g = this.g, P = PS.Patterns;
    [0, 2].forEach((b) => g.later(b, () => {
      this.tell();
      P.shockwave(g, this.x, this.y, { warnBeats: 1, speed: 330, gaps: P.gaps(2, 0.4) });
    }));
    if (g.mods.remix) [1, 3].forEach((b) => g.later(b, () => P.aimed(g, this, { count: 3, speed: 300 })));
    return 1;
  }

  p_spiral() {
    const g = this.g;
    this.tell();
    // 6 arms: every other arm is breakable (cyan) — perfect BREAK fodder
    PS.Patterns.spiral(g, this, { arms: 6, breakArms: 2, perBeat: 2, beats: 3.5, speed: 165, step: 0.22 });
    return 1;
  }

  p_needle(double) {
    const g = this.g, P = PS.Patterns;
    this.tell();
    const make = (off) => P.laser(g, 0, 0, 0, {
      warnBeats: 1, activeBeats: 2.5, width: 26, len: 1400,
      follow: () => this.pivot(), angFn: () => this.needleAngle() + off
    });
    make(0);
    if (double === true) make(Math.PI);
    if (g.mods.remix) g.later(2, () => P.ring(g, this.x, this.y, { count: 10, speed: 170, breakEvery: 2 }));
    return 1;
  }

  p_tickRain() {
    const g = this.g, P = PS.Patterns;
    for (let b = 0; b < 4; b++) g.later(b, () => { this.tell(0.5); P.aimed(g, this, { count: b % 2 ? 3 : 5, spread: 0.24, speed: 300 }); });
    g.later(2, () => P.ring(g, this.x, this.y, { count: 12, speed: 160, breakEvery: 3 }));
    return 1;
  }

  p_shockSpiral() {
    const g = this.g, P = PS.Patterns;
    this.tell();
    P.shockwave(g, this.x, this.y, { warnBeats: 1, speed: 300, gaps: [] }); // no gaps: you must HOP
    g.later(1, () => P.spiral(g, this, { arms: 2, perBeat: 4, beats: 2.5, speed: 210, step: 0.34 }));
    return 1;
  }

  // =================== PHASE II ===================
  p_orbitWalls() {
    const g = this.g, P = PS.Patterns, pal = PS.Profile.palette();
    this.tell();
    const dir = Math.random() < 0.5 ? 1 : -1;
    const orbs = P.orbitArms(g, this.x, this.y, {
      arms: 3, perArm: g.mods.remix ? 8 : 7, spacing: 34, r0: 145,
      angVel: 0.85 * dir, delayBeats: 1, lifeBeats: 9, breakTips: true
    });
    // rhythm change: the walls reverse halfway through
    g.later(4, () => {
      this.tell();
      g.fx.text(this.x, this.y - 150, 'REVERSE', pal.boss, 26, 0.8);
      PS.Audio.sfx('warn');
      orbs.forEach((o) => { if (o.orbit) o.orbit.angVel = -1.1 * dir; });
    });
    g.later(6, () => orbs.forEach((o) => { if (o.orbit) o.orbit.radVel = 110; }));
    g.later(8, () => orbs.forEach((o) => { if (o.orbit) o.orbit.radVel = 420; }));
    [2, 4, 6].forEach((b) => g.later(b, () => P.aimed(g, this, { count: 1, speed: 280 })));
    return 2;
  }

  p_checker() {
    const g = this.g, P = PS.Patterns;
    const every = g.mods.remix ? 1 : 2;
    for (let k = 0; k * every < 8; k++) {
      g.later(k * every, () => { this.tell(0.6); P.checker(g, { cols: 8, rows: 4, parity: k % 2, warnBeats: 1, activeBeats: 0.35 }); });
    }
    g.later(3, () => P.ring(g, this.x, this.y, { count: 10, speed: 150, breakable: true }));
    g.later(6, () => P.aimed(g, this, { count: 3, speed: 260 }));
    return 2;
  }

  p_spiralFast() {
    this.tell();
    PS.Patterns.spiral(this.g, this, { arms: 4, breakArms: 2, perBeat: 4, beats: 3, speed: 220, step: 0.25, reverseAt: 6 });
    return 1;
  }

  p_needleDouble() {
    this.p_needle(true);
    this.g.later(2, () => PS.Patterns.ring(this.g, this.x, this.y, { count: 8, speed: 150, breakable: true }));
    return 1;
  }

  p_aimedShock() {
    const g = this.g, P = PS.Patterns;
    [0, 1, 2].forEach((b) => g.later(b, () => { this.tell(0.5); P.aimed(g, this, { count: 3, speed: 330, spread: 0.2 }); }));
    g.later(2, () => P.shockwave(g, this.x, this.y, { warnBeats: 1, speed: 360, gaps: [] }));
    return 1;
  }

  // =================== PHASE III: FRACTURE ===================
  onPhase(n) {
    if (n === 2) {
      this.fragments = [0, 1, 2, 3].map((i) => ({ base: (i * Math.PI) / 2 + Math.PI / 4, x: this.x, y: this.y, flash: 0, spin: i }));
      this.fragT = 0;
    }
  }

  onAnyBeat(s) {
    // sudden tempo shifts in the final phase (warned one bar ahead)
    if (this.phase !== 2 || s.beatInBar !== 0 || this.pendingPhase >= 0) return;
    const g = this.g;
    if (this.phaseBar % 8 === 7) {
      g.announce(this.slowTempo ? 'TEMPO ▲' : 'TEMPO ▼', 'shift in 1 bar', 1.4);
      PS.Audio.sfx('warn');
    }
    if (this.phaseBar > 0 && this.phaseBar % 8 === 0) {
      this.slowTempo = !this.slowTempo;
      g.setBpm(this.slowTempo ? 112 : this.bpms[2]);
      g.fx.flash(PS.Profile.palette().accent, 0.3);
    }
  }

  p_fragRings() {
    const g = this.g;
    for (let i = 0; i < 4; i++) g.later(i, () => {
      const f = this.frag(i); f.flash = 1;
      PS.Patterns.ring(g, f.x, f.y, { count: 9, speed: 180, breakEvery: 3 });
    });
    return 1;
  }

  p_crossLasers() {
    const g = this.g, P = PS.Patterns;
    const beam = (a, b) => P.laser(g, 0, 0, 0, {
      warnBeats: 1, activeBeats: 1, width: 22,
      follow: () => this.frag(a), angFn: () => PS.U.angle(this.frag(a).x, this.frag(a).y, this.frag(b).x, this.frag(b).y),
      len: 1100
    });
    g.later(0, () => { this.frag(0).flash = 1; beam(0, 2); });
    g.later(1, () => P.ring(g, this.x, this.y, { count: 8, speed: 150, breakable: true }));
    g.later(2, () => { this.frag(1).flash = 1; beam(1, 3); });
    if (g.mods.remix) g.later(3, () => P.aimed(g, this.frag(2), { count: 3, speed: 300 }));
    return 1;
  }

  p_fragSpiral() {
    const g = this.g;
    for (let i = 0; i < 4; i++) {
      this.frag(i).flash = 1;
      PS.Patterns.spiral(g, this.frag(i), { arms: 1, perBeat: 3, beats: 2.5, speed: 170, step: 0.5, breakable: i % 2 === 0 });
    }
    return 1;
  }

  p_fragShock() {
    const g = this.g, P = PS.Patterns;
    g.later(0, () => [0, 2].forEach((i) => { this.frag(i).flash = 1; P.shockwave(g, this.frag(i).x, this.frag(i).y, { warnBeats: 1, speed: 300, gaps: P.gaps(1, 0.45) }); }));
    g.later(2, () => [1, 3].forEach((i) => { this.frag(i).flash = 1; P.shockwave(g, this.frag(i).x, this.frag(i).y, { warnBeats: 1, speed: 300, gaps: P.gaps(1, 0.45) }); }));
    g.later(3, () => P.aimed(g, this, { count: 3, speed: 260, breakMiddle: true }));
    return 1;
  }

  p_fragAimed() {
    const g = this.g, P = PS.Patterns;
    for (let b = 0; b < 4; b++) g.later(b, () => { const f = this.frag(b); f.flash = 1; P.aimed(g, f, { count: 3, speed: 290, spread: 0.25, breakMiddle: b % 2 === 0 }); });
    g.later(1, () => P.lineWall(g, PS.U.choose(['left', 'right', 'top', 'bottom']), { speed: 190, gapSize: 140 }));
    return 1;
  }

  // =================== targets & collision ===================
  targetPoint(x, y) {
    if (!this.fragments) return { x: this.x, y: this.y };
    let best = { x: this.x, y: this.y }, bd = PS.U.dist(x, y, this.x, this.y);
    for (const f of this.fragments) { const d = PS.U.dist(x, y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
    return best;
  }
  hitTest(x, y, r) {
    if (!this.fragments) return super.hitTest(x, y, r);
    if (PS.U.dist(x, y, this.x, this.y) < 40 + r) return true;
    return this.fragments.some((f) => PS.U.dist(x, y, f.x, f.y) < 44 + r);
  }
  bodyHits(px, py, pr) {
    if (this.defeated) return false;
    if (!this.fragments) return super.bodyHits(px, py, pr);
    if (PS.U.dist(px, py, this.x, this.y) < 28 + pr) return true;
    return this.fragments.some((f) => PS.U.dist(px, py, f.x, f.y) < 24 + pr);
  }

  update(dt) {
    super.update(dt);
    this.ringSpin += dt * (0.25 + this.phase * 0.35);
    if (this.fragments) {
      this.fragT = Math.min(1, this.fragT + dt * 0.8);
      this.orbitAng += dt * (this.slowTempo ? 0.12 : 0.22);
      const e = PS.U.easeInOut(this.fragT);
      for (const f of this.fragments) {
        const a = f.base + this.orbitAng;
        f.x = this.x + Math.cos(a) * 430 * e;
        f.y = this.y + Math.sin(a) * 230 * e;
        f.flash = Math.max(0, f.flash - dt * 4);
        f.spin += dt * 2;
      }
    }
  }

  // =================== drawing ===================
  draw(ctx) {
    const g = this.g, U = PS.U, pal = PS.Profile.palette();
    const pulse = g.visualPulse();
    let alpha = 1, scale = 1;
    if (this.defeated) { alpha = Math.max(0, 1 - this.defeatT / 1.6); scale = 1 + this.defeatT * 0.4; }
    if (alpha <= 0) return;
    const hot = this.flash > 0.4;
    const col = hot ? '#ffffff' : pal.boss;
    const col2 = hot ? '#ffffff' : pal.boss2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    if (this.defeated) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);

    const G = 230;
    ctx.globalAlpha = alpha * (0.5 + pulse * 0.35 + this.charge * 0.3);
    ctx.drawImage(PS.glow(pal.boss, G), -G, -G);
    ctx.globalAlpha = alpha;

    if (this.fragments) { ctx.restore(); this.drawFragments(ctx, alpha); return; }

    const R = 118 + pulse * 8 + this.charge * 12;
    ctx.lineJoin = 'round';
    // outer gear
    ctx.strokeStyle = col; ctx.lineWidth = 5;
    PS.FX.shapePath(ctx, 'oct', 0, 0, R, this.ringSpin); ctx.stroke();
    ctx.strokeStyle = U.rgba(col2, 0.8); ctx.lineWidth = 2;
    PS.FX.shapePath(ctx, 'oct', 0, 0, R - 16, -this.ringSpin * 1.5); ctx.stroke();
    // 16 teeth — the lit tooth chases the current 16th note
    const step = U.mod(g.clock.step, 16);
    for (let i = 0; i < 16; i++) {
      const a = this.ringSpin + (i / 16) * U.TAU;
      ctx.save(); ctx.rotate(a); ctx.translate(R + 12, 0);
      ctx.fillStyle = i === step ? '#ffffff' : U.rgba(col, i % 4 === 0 ? 0.8 : 0.4);
      ctx.fillRect(-5, -4, 10, 8);
      ctx.restore();
    }
    // metronome housing
    ctx.fillStyle = U.rgba(pal.bg, 0.9);
    ctx.strokeStyle = col2; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -84); ctx.lineTo(64, 52); ctx.lineTo(-64, 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = U.rgba(col2, 0.5); ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.28;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 60, 38 + Math.sin(a) * 60); ctx.lineTo(Math.cos(a) * 70, 38 + Math.sin(a) * 70); ctx.stroke();
    }
    // needle
    const na = this.needleAngle();
    ctx.strokeStyle = this.charge > 0.3 ? '#ffffff' : col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(Math.cos(na) * 100, 38 + Math.sin(na) * 100); ctx.stroke();
    ctx.fillStyle = col;
    ctx.save(); ctx.translate(Math.cos(na) * 62, 38 + Math.sin(na) * 62); ctx.rotate(na);
    ctx.fillRect(-7, -9, 14, 18); ctx.restore();
    // core
    ctx.fillStyle = hot ? '#ffffff' : U.rgba('#ffffff', 0.6 + pulse * 0.4);
    ctx.beginPath(); ctx.arc(0, 38, 12 + pulse * 3, 0, U.TAU); ctx.fill();
    ctx.restore();
    this.drawShield(ctx, this.x, this.y, R + 30);
  }

  drawFragments(ctx, alpha) {
    const U = PS.U, pal = PS.Profile.palette(), g = this.g;
    const pulse = g.visualPulse();
    ctx.save();
    ctx.globalAlpha = alpha;
    const hot = this.flash > 0.4;
    // tethers
    ctx.strokeStyle = U.rgba(pal.boss2, 0.25); ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    for (const f of this.fragments) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(f.x, f.y); ctx.stroke(); }
    ctx.setLineDash([]);
    // core
    ctx.strokeStyle = hot ? '#fff' : pal.boss; ctx.lineWidth = 4;
    PS.FX.shapePath(ctx, 'oct', this.x, this.y, 34 + pulse * 6, this.ringSpin * 2); ctx.stroke();
    const na = this.needleAngle() * 3;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(na) * 26, this.y + Math.sin(na) * 26); ctx.stroke();
    // fragments
    for (const f of this.fragments) {
      const c = hot || f.flash > 0.5 ? '#ffffff' : pal.boss;
      const G = 90;
      ctx.globalAlpha = alpha * (0.5 + f.flash * 0.5);
      ctx.drawImage(PS.glow(pal.boss, G), f.x - G, f.y - G);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = U.rgba(pal.bg, 0.85); ctx.strokeStyle = c; ctx.lineWidth = 4;
      PS.FX.shapePath(ctx, 'tri', f.x, f.y, 30 + pulse * 4 + f.flash * 8, f.spin); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = U.rgba(pal.boss2, 0.6); ctx.lineWidth = 2;
      PS.FX.shapePath(ctx, 'oct', f.x, f.y, 44, -f.spin * 0.5); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, U.TAU); ctx.fill();
      if (this.shielded) this.drawShield(ctx, f.x, f.y, 56);
    }
    ctx.restore();
    this.drawShield(ctx, this.x, this.y, 60);
  }

  // =================== SIGNATURE ATTACKS ===================
  // DASH CHECK: a full-height laser wall swings across the arena like the needle
  p_pendulumWall() {
    const g = this.g;
    this.tell();
    this.wallFromLeft = !this.wallFromLeft;
    PS.Patterns.sweepWall(g, { fromLeft: this.wallFromLeft, warnBeats: 1.5, sweepBeats: 2.5 });
    g.later(4.5, () => PS.Patterns.ring(g, this.x, this.y, { count: 10, speed: 150, breakable: true }));
    return 2;
  }

  // CLOCK HANDS: 10 lasers (7 on Easy, 12 on Hard) turn around the gear, then reverse
  p_clockHands() {
    const g = this.g;
    this.tell();
    const dir = Math.random() < 0.5 ? 1 : -1;
    const beams = PS.Patterns.radialLasers(g, this, { count: { easy: 7, normal: 10, hard: 12 }[g.diff.id] || 10, warnBeats: 2, activeBeats: 5.5, rot: 0.32 * dir, width: 18 });
    g.later(4.5, () => { beams.forEach((b) => (b.rot *= -1)); this.tell(); PS.Audio.sfx('warn'); });
    g.later(3, () => PS.Patterns.aimed(g, this, { count: 1, speed: 220, breakable: true }));
    return 2;
  }

  // ALARM: a solid ring of bullets closes in on you. Only a dash gets you out.
  p_alarm() {
    const g = this.g;
    this.fragments.forEach((f) => (f.flash = 1));
    PS.Patterns.closingRing(g, { radius: 290, spacing: 24, speed: 250, warnBeats: 1.5 });
    g.later(3, () => PS.Patterns.ring(g, this.x, this.y, { count: 12, speed: 160, breakEvery: 2 }));
    return 1;
  }

  // the cracked core spins its clock hands while the fragments keep firing
  p_coreHands() {
    const g = this.g;
    const beams = PS.Patterns.radialLasers(g, this, { count: { easy: 7, normal: 10, hard: 12 }[g.diff.id] || 10, warnBeats: 2, activeBeats: 5, rot: 0.4, width: 16 });
    g.later(4, () => beams.forEach((b) => (b.rot *= -1)));
    [2, 4, 6].forEach((b) => g.later(b, () => { const f = this.frag(b); f.flash = 1; PS.Patterns.aimed(g, f, { count: 1, speed: 260, breakable: true }); }));
    return 2;
  }
};
