// =============================================================
//  BOSS 2: STATIC SERAPH — Architect of the Lattice
//
//  Silhouette: a tall crystal diamond with a halo and six wing shards.
//  Movement challenge: SPATIAL AWARENESS. It teleports, fills the
//  arena with laser grids, and shows FAKE grids (grey dashed lines) —
//  the ones that flash white become real a beat later.
//
//  Phase I   "LATTICE"   : laser grids, blinking (teleporting) bullets
//  Phase II  "SANCTUM"   : a drifting safe zone, fake-out grids
//  Phase III "SHATTER"   : rotating laser star, wing barrages
// =============================================================
PS.Bosses.seraph = class extends PS.Boss {
  constructor(g) {
    super(g);
    this.name = 'STATIC SERAPH';
    this.subtitle = 'Architect of the Lattice';
    this.track = 'seraph';
    this.y = 230;
    this.bodyRadius = 36;
    this.hitRadius = 70;
    this.vulnerability = 1.3; // fewer Resonance sources here, so hits count for more
    this.tp = null;          // teleport destination being telegraphed
    this.wingOrbit = false;
    this.wingAng = 0;
    this.wings = [];
    this.phaseNames = ['PHASE I — LATTICE', 'PHASE II — SANCTUM', 'PHASE III — SHATTER'];
    this.updateWings(0);
  }

  get bpms() { return [112, 118, 126]; }
  phaseSubtitle(n) { return ['', 'stay inside the light', 'its wings break free'][n]; }

  sequences() {
    return [
      [this.p_gridV, this.p_blinkRing, this.p_tenGates, this.p_gridCross, this.p_teleportBurst, this.p_gridH, this.p_tenGates, this.p_blinkSpiral],
      [this.p_safeZone, this.p_cage, this.p_fakeGrid, this.p_teleportBurst, this.p_tenGates, this.p_fakeGrid, this.p_cage, this.p_blinkRing],
      [this.p_starSweep, this.p_cage, this.p_wingStorm, this.p_crossSweep, this.p_fakeGrid, this.p_tenGates, this.p_gridBlink, this.p_safeZone]
    ];
  }

  // ---------- teleport ----------
  teleport(beats = 1, forced) {
    const g = this.g;
    const anchors = [[320, 200], [640, 170], [960, 200], [320, 520], [960, 520], [640, 550], [640, 360], [200, 360], [1080, 360]];
    let dest = forced;
    if (!dest) {
      const ok = anchors.filter(([x, y]) => PS.U.dist(x, y, g.player.x, g.player.y) > 300 && PS.U.dist(x, y, this.x, this.y) > 60);
      const pick = PS.U.choose(ok.length ? ok : anchors);
      dest = { x: pick[0], y: pick[1] };
    }
    this.tp = dest;
    this.tell();
    g.later(beats, () => {
      g.fx.ring(this.x, this.y, '#ffffff', 60, 4, 0.3, 3, 'square', Math.PI / 4);
      g.fx.spark(this.x, this.y, PS.Profile.palette().boss2, 12, 300, 0.4, 3, 'tri');
      this.x = dest.x; this.y = dest.y; this.tp = null;
      g.fx.ring(this.x, this.y, '#ffffff', 4, 90, 0.35, 3, 'square', Math.PI / 4);
    });
  }

  blink(g, times = 2) {
    return { at: g.beats(1), dist: 140, warn: g.beats(0.5), count: times, every: g.beats(1) };
  }

  // =================== PHASE I ===================
  p_gridV() {
    const g = this.g;
    this.tell();
    PS.Patterns.grid(g, { dir: 'v', count: g.mods.remix ? 6 : 5, warnBeats: 2, activeBeats: 1 });
    g.later(1, () => PS.Patterns.ring(g, this.x, this.y, { count: 8, speed: 130, breakable: true }));
    g.later(2, () => this.teleport(1.5));
    return 1;
  }
  p_gridH() {
    const g = this.g;
    this.tell();
    PS.Patterns.grid(g, { dir: 'h', count: 3, warnBeats: 2, activeBeats: 1 });
    g.later(1, () => PS.Patterns.ring(g, this.x, this.y, { count: 10, speed: 150, breakEvery: 2, blink: this.blink(g, 1) }));
    return 1;
  }
  p_gridCross() {
    const g = this.g, P = PS.Patterns;
    this.tell();
    P.grid(g, { dir: 'v', count: 4, warnBeats: 2, activeBeats: 1 });
    g.later(1, () => P.grid(g, { dir: 'h', count: 3, warnBeats: 2, activeBeats: 1 }));
    g.later(3, () => P.ring(g, this.x, this.y, { count: 9, speed: 150, breakEvery: 1 + (g.mods.remix ? 2 : 1) }));
    return 1;
  }
  p_blinkRing() {
    const g = this.g;
    [0, 2].forEach((b) => g.later(b, () => {
      this.tell(0.7);
      PS.Patterns.ring(g, this.x, this.y, { count: 12, speed: 150, breakEvery: 2, blink: this.blink(g, 2) });
    }));
    return 1;
  }
  p_teleportBurst() {
    const g = this.g, P = PS.Patterns;
    this.teleport(1);
    [1, 2].forEach((b) => g.later(b, () => P.aimed(g, this, { count: 5, speed: 300, spread: 0.18, breakMiddle: true })));
    g.later(3, () => P.ring(g, this.x, this.y, { count: 10, speed: 170 }));
    return 1;
  }
  p_blinkSpiral() {
    const g = this.g;
    this.tell();
    PS.Patterns.spiral(g, this, { arms: 3, breakArms: 3, perBeat: 3, beats: 3, speed: 160, step: 0.32, blink: { at: g.beats(1.2), dist: 120, warn: g.beats(0.5) } });
    return 1;
  }

  // =================== PHASE II ===================
  p_safeZone() {
    const g = this.g, P = PS.Patterns;
    this.tell();
    P.safeZone(g, { radius: 155, drift: 95, warnBeats: 2, activeBeats: 5 });
    for (let b = 3; b <= 6; b++) g.later(b, () => P.aimed(g, this, { count: 1, speed: 170, breakable: true }));
    return 2;
  }

  // Fake-out grid: grey dashed ghosts appear. One beat later some flash
  // white and become real (1 beat warning), the rest dissolve.
  p_fakeGrid() {
    const g = this.g, P = PS.Patterns, A = g.arena, U = PS.U;
    this.tell();
    const ghosts = [];
    for (let i = 0; i < 3; i++) {
      const x = A.x0 + ((A.x1 - A.x0) * (i + 0.5)) / 3 + U.rand(-70, 70);
      ghosts.push(P.laser(g, x, A.y0 - 40, Math.PI / 2, { fake: true, len: A.y1 - A.y0 + 80 }));
      const y = A.y0 + ((A.y1 - A.y0) * (i + 0.5)) / 3 + U.rand(-50, 50);
      ghosts.push(P.laser(g, A.x0 - 40, y, 0, { fake: true, len: A.x1 - A.x0 + 80 }));
    }
    g.later(1, () => {
      ghosts.sort(() => Math.random() - 0.5);
      const n = g.mods.remix ? 4 : 3;
      ghosts.forEach((l, i) => (i < n ? l.makeReal(g.beats(1), g.beats(0.75)) : l.dissolve()));
      PS.Audio.sfx('warn');
      this.tell();
    });
    g.later(3, () => PS.Patterns.ring(g, this.x, this.y, { count: 8, speed: 160, breakable: true }));
    return 1;
  }

  // =================== PHASE III ===================
  onPhase(n) {
    this.tp = null; // any pending teleport was cancelled by the phase change
    if (n === 2) this.wingOrbit = true;
  }

  p_starSweep() {
    const g = this.g, P = PS.Patterns;
    this.teleport(1, { x: 640, y: 360 });
    const dir = Math.random() < 0.5 ? 1 : -1;
    const base = Math.random() * Math.PI;
    const beams = [];
    g.later(1, () => {
      for (let k = 0; k < 4; k++) beams.push(P.laser(g, this.x, this.y, base + (k * Math.PI) / 2, { warnBeats: 1, activeBeats: 6, width: 22, rot: 0.45 * dir, follow: () => this }));
    });
    g.later(5, () => { beams.forEach((b) => (b.rot *= -1)); this.tell(); PS.Audio.sfx('warn'); });
    [3, 6].forEach((b) => g.later(b, () => P.ring(g, this.x, this.y, { count: 10, speed: 140, breakEvery: 2, blink: this.blink(g, 1) })));
    return 2;
  }

  p_wingStorm() {
    const g = this.g, P = PS.Patterns;
    for (let i = 0; i < 6; i++) g.later(i * 0.5, () => P.aimed(g, this.wings[i], { count: 1, speed: 330, breakable: i % 2 === 0 }));
    g.later(0, () => P.lineWall(g, PS.U.choose(['left', 'right']), { speed: 170, gapSize: 150 }));
    return 1;
  }

  p_gridBlink() {
    const g = this.g;
    this.tell();
    PS.Patterns.grid(g, { dir: PS.U.choose(['v', 'h']), count: 4, warnBeats: 2, activeBeats: 1 });
    g.later(1, () => PS.Patterns.ring(g, this.x, this.y, { count: 12, speed: 150, breakEvery: 3, blink: this.blink(g, 2) }));
    return 1;
  }

  // =================== update & draw ===================
  updateWings(dt) {
    this.wingAng += dt * (this.wingOrbit ? 0.9 : 0);
    for (let i = 0; i < 6; i++) {
      let x, y, a;
      if (this.wingOrbit) {
        a = this.wingAng + (i / 6) * PS.U.TAU;
        x = this.x + Math.cos(a) * 120; y = this.y + Math.sin(a) * 120;
      } else {
        const side = i < 3 ? -1 : 1, j = i % 3;
        a = side < 0 ? Math.PI + (j - 1) * 0.45 : (j - 1) * -0.45;
        const bob = Math.sin(this.time * 2 + i) * 5;
        x = this.x + Math.cos(a) * (66 + j * 6); y = this.y + Math.sin(a) * 50 - 10 + bob;
      }
      this.wings[i] = { x, y, a };
    }
  }

  update(dt) {
    super.update(dt);
    this.updateWings(dt);
  }

  draw(ctx) {
    const g = this.g, U = PS.U, pal = PS.Profile.palette();
    const pulse = g.visualPulse();
    let alpha = 1;
    if (this.defeated) alpha = Math.max(0, 1 - this.defeatT / 1.6);
    if (alpha <= 0) return;
    const hot = this.flash > 0.4;
    const main = hot ? '#ffffff' : '#dff8ff';
    const acc = hot ? '#ffffff' : pal.boss2;

    // teleport destination telegraph
    if (this.tp) {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = U.rgba('#ffffff', 0.4 + 0.4 * Math.sin(g.realTime * 20)); ctx.lineWidth = 2;
      PS.FX.shapePath(ctx, 'square', this.tp.x, this.tp.y, 50, Math.PI / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.tp.x, this.tp.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    const G = 200;
    ctx.globalAlpha = alpha * (0.45 + pulse * 0.3 + this.charge * 0.3);
    ctx.drawImage(PS.glow(pal.boss2, G), this.x - G, this.y - G);
    ctx.globalAlpha = alpha;

    // wings
    for (const w of this.wings) {
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.a + (this.defeated ? this.defeatT * 4 : 0));
      ctx.fillStyle = U.rgba(acc, 0.25); ctx.strokeStyle = acc; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(-10, 8); ctx.lineTo(-18, 0); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    ctx.translate(this.x, this.y);
    if (this.defeated) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    // halo
    ctx.strokeStyle = U.rgba(main, 0.8); ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]); ctx.lineDashOffset = -g.realTime * 30;
    ctx.beginPath(); ctx.ellipse(0, -96, 42 + pulse * 6, 10, 0, 0, U.TAU); ctx.stroke();
    ctx.setLineDash([]);
    // body: tall crystal
    const s = 1 + pulse * 0.06 + this.charge * 0.1;
    ctx.fillStyle = U.rgba(pal.bg, 0.9); ctx.strokeStyle = main; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -76 * s); ctx.lineTo(34 * s, 0); ctx.lineTo(0, 76 * s); ctx.lineTo(-34 * s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = acc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(18, 0); ctx.lineTo(0, 42); ctx.lineTo(-18, 0); ctx.closePath(); ctx.stroke();
    // eye slit
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12, -2 - this.charge * 3, 24, 4 + this.charge * 6);
    // static glitch lines
    if (Math.random() < 0.3) {
      ctx.fillStyle = U.rgba(main, 0.5);
      for (let i = 0; i < 3; i++) ctx.fillRect(U.rand(-60, 30), U.rand(-80, 80), U.rand(20, 60), 2);
    }
    ctx.restore();
    this.drawShield(ctx, this.x, this.y, 95);
  }

  // =================== SIGNATURE ATTACKS ===================
  // TEN GATES: lasers from all around the arena edge converge on your spot. Move!
  p_tenGates() {
    const g = this.g;
    this.tell();
    const n = { easy: 7, normal: 10, hard: 12 }[g.diff.id] || 10;
    PS.Patterns.edgeGates(g, { count: n, warnBeats: 1.5, activeBeats: 0.75 });
    g.later(2, () => { this.tell(); PS.Patterns.edgeGates(g, { count: n, warnBeats: 1.5, activeBeats: 0.75 }); });
    return 1;
  }

  // PRISM CAGE (DASH CHECK): four laser walls box you in and close together
  p_cage() {
    const g = this.g;
    this.tell();
    PS.Patterns.cage(g, { half: 170, warnBeats: 1.5, closeBeats: 2 });
    g.later(2, () => PS.Patterns.ring(g, this.x, this.y, { count: 10, speed: 140, breakEvery: 2 }));
    return 2;
  }

  // CROSS SWEEP (DASH CHECK x2): a vertical wall, then a horizontal one
  p_crossSweep() {
    const g = this.g;
    this.tell();
    PS.Patterns.sweepWall(g, { vertical: true, warnBeats: 1.5, sweepBeats: 2.5 });
    g.later(2.5, () => PS.Patterns.sweepWall(g, { vertical: false, warnBeats: 1.5, sweepBeats: 2 }));
    return 2;
  }
};
