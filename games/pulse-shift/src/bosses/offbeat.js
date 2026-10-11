// =============================================================
//  BOSS 3: THE OFFBEAT — Thief of the Downbeat
//
//  Silhouette: a lopsided, glitching star with one off-centre eye.
//  Movement challenge: READING TELEGRAPHS. Its attacks land on the
//  "and" between beats, accelerate and decelerate, and it fakes
//  its own wind-ups (grey flash = fake). Real attacks ALWAYS show a
//  marker in the arena first.
//
//  Phase I   "SYNCOPATE" : late waves, accelerating bursts, stutter shockwaves
//  Phase II  "DRAG"      : bullets that stop and re-aim, false cues, off-grid bombs
//  Phase III "DESYNC"    : the tempo drifts constantly and the arena pulse
//                          lies. Only the markers tell the truth.
// =============================================================
PS.Bosses.offbeat = class extends PS.Boss {
  constructor(g) {
    super(g);
    this.name = 'THE OFFBEAT';
    this.subtitle = 'Thief of the Downbeat';
    this.track = 'offbeat';
    this.y = 300;
    this.bodyRadius = 48;
    this.hitRadius = 80;
    this.drift = false;
    this.fakeTell = 0;
    this.glitch = 0;
    this.glitchT = 0;
    this.spinA = 0;
    this.wander = { x: this.x, y: this.y };
    this.wanderT = 0;
    this.points = [];
    for (let i = 0; i < 11; i++) this.points.push(55 + ((i * 37) % 5) * 9 + (i % 3) * 6);
    this.phaseNames = ['PHASE I — SYNCOPATE', 'PHASE II — DRAG', 'PHASE III — DESYNC'];
  }

  get bpms() { return [100, 104, 108]; }

  // pick a new spot to drift to every 2 bars (on the beat, so co-op stays in sync)
  onAnyBeat(s) {
    if (s.beatInBar === 0 && s.bar % 2 === 0) this.wander = { x: PS.U.rand(420, 860), y: PS.U.rand(230, 470) };
  }
  phaseSubtitle(n) { return ['', 'it hesitates… then it doesn\'t', 'don\'t trust the beat — trust the markers'][n]; }

  sequences() {
    return [
      [this.p_lateWave, this.p_stutterSpokes, this.p_bouncers, this.p_accelBurst, this.p_stutterShock, this.p_swingRings, this.p_lateWave],
      [this.p_decelSpray, this.p_wrongWalls, this.p_rewind, this.p_falseCue, this.p_bombsOffgrid, this.p_stutterSpokes, this.p_bouncers, this.p_stutterShock],
      [this.p_desyncWaves, this.p_wrongWalls, this.p_rewind, this.p_bombsOffgrid, this.p_lateRing, this.p_decelSpray, this.p_stutterSpokes, this.p_falseCue]
    ];
  }

  // a ring whose orbs show spawn markers for 0.5 beat, activating exactly at `at`
  markedRing(at, o) {
    const g = this.g;
    g.later(Math.max(0, at - 0.5), () => {
      this.tell(0.6);
      PS.Patterns.ring(g, this.x, this.y, Object.assign({ delayBeats: 0.5 }, o));
    });
  }

  // =================== PHASE I ===================
  p_lateWave() {
    // lands on the "and"s instead of the beats
    [0.75, 1.5, 2.25].forEach((t, i) => this.markedRing(t, { count: 12, speed: 180, breakEvery: 3, offset: i * 0.22 }));
    if (this.g.mods.remix) this.g.later(3, () => PS.Patterns.aimed(this.g, this, { count: 3, speed: 300 }));
    return 1;
  }

  p_accelBurst() {
    const g = this.g, P = PS.Patterns;
    [0, 1.5].forEach((t) => g.later(t, () => {
      this.tell();
      P.ring(g, this.x, this.y, { count: 10, speed: 50, accel: 650, accelAt: g.beats(1), maxSpeed: 420, breakEvery: 5 });
    }));
    g.later(3, () => P.aimed(g, this, { count: 3, speed: 120, spread: 0.3 }));
    return 1;
  }

  p_stutterShock() {
    const g = this.g, P = PS.Patterns;
    [0, 0.75, 1.25, 2.5].forEach((t) => g.later(t, () => {
      this.tell(0.6);
      P.shockwave(g, this.x, this.y, { warnBeats: 0.75, speed: 300, gaps: P.gaps(2, 0.42) });
    }));
    return 1;
  }

  p_swingRings() {
    const g = this.g;
    [0, 0.67, 1, 1.67, 2, 2.67].forEach((t, i) => g.later(t, () => {
      PS.Patterns.ring(g, this.x, this.y, { count: 8, speed: 170, breakable: i % 2 === 1, offset: i * 0.39 });
    }));
    return 1;
  }

  // =================== PHASE II ===================
  // fast spray that brakes to a stop, hangs, then re-aims at you
  p_decelSpray() {
    const g = this.g;
    [0, 1.5].forEach((t, k) => g.later(t, () => {
      this.tell();
      PS.Patterns.ring(g, this.x, this.y, {
        count: 14, speed: 520, accel: -760, minSpeed: 0, breakEvery: 2, offset: k * 0.2,
        redirect: { at: g.beats(2), speed: 330 * g.diff.speed }
      });
    }));
    return 1;
  }

  // the boss winds up on beat 1… and nothing happens. The real attack
  // comes off the grid, with markers.
  p_falseCue() {
    const g = this.g, P = PS.Patterns;
    this.fakeTell = 1;
    PS.Audio.sfx('warn');
    g.fx.ring(this.x, this.y, '#9a9ab0', 40, 160, 0.4, 3);
    g.later(0.5, () => P.bombs(g, P.aroundPlayer(g, 3, 120), { warnBeats: 1, r: 62 }));
    g.later(2, () => { this.tell(); P.shockwave(g, this.x, this.y, { warnBeats: 1, speed: 330, gaps: P.gaps(2, 0.42) }); });
    return 1;
  }

  p_bombsOffgrid() {
    const g = this.g, U = PS.U;
    const times = g.mods.remix ? [0, 0.5, 1, 1.25, 1.5, 2.25, 2.75] : [0, 0.5, 1.25, 1.5, 2.75];
    times.forEach((t) => g.later(t, () => {
      const A = g.arena, a = PS.rng() * U.TAU, r = U.rand(0, 70), tg = g.aimPoint();
      PS.Patterns.bombs(g, [{ x: U.clamp(tg.x + Math.cos(a) * r, A.x0 + 40, A.x1 - 40), y: U.clamp(tg.y + Math.sin(a) * r, A.y0 + 40, A.y1 - 40) }], { warnBeats: 1, r: 62 });
    }));
    g.later(2, () => PS.Patterns.ring(g, this.x, this.y, { count: 10, speed: 150, breakEvery: 2 }));
    return 1;
  }

  // =================== PHASE III ===================
  onPhase(n) {
    if (n === 2) this.drift = true;
  }

  p_desyncWaves() {
    const offs = [0.33, 0.9, 1.6, 2.2, 2.9].sort(() => PS.rng() - 0.5).slice(0, 3).sort((a, b) => a - b);
    offs.forEach((t, i) => this.markedRing(t, { count: 13, speed: 190, breakEvery: 3, offset: i * 0.3 }));
    this.g.later(1, () => PS.Patterns.aimed(this.g, this, { count: 3, speed: 60, spread: 0.35 }));
    return 1;
  }

  update(dt) {
    super.update(dt);
    const g = this.g, U = PS.U;
    this.spinA += dt * 0.6;
    this.fakeTell = Math.max(0, this.fakeTell - dt * 2);
    // glitch jitter
    this.glitchT -= dt;
    if (this.glitchT <= 0) { this.glitch = Math.random() < 0.4 ? 3 + Math.random() * 6 : 0; this.glitchT = 0.05 + Math.random() * 0.2; } // cosmetic only
    // wander slowly around the middle of the arena
    if (!this.defeated) {
      this.x += (this.wander.x - this.x) * Math.min(1, dt * 0.5);
      this.y += (this.wander.y - this.y) * Math.min(1, dt * 0.5);
    }
    // phase III: the tempo keeps speeding up and slowing down,
    // and the arena's visual pulse is deliberately out of sync
    if (this.drift && !this.defeated) {
      g.setBpm(104 + Math.sin(this.time * 0.45) * 20);
      g.pulseOffset = Math.sin(this.time * 1.3) * 0.45;
    }
  }

  draw(ctx) {
    const g = this.g, U = PS.U, pal = PS.Profile.palette();
    const pulse = g.visualPulse();
    let alpha = 1;
    if (this.defeated) alpha = Math.max(0, 1 - this.defeatT / 1.6);
    if (alpha <= 0) return;
    const hot = this.flash > 0.4;
    const s = 1 + pulse * 0.07 + this.charge * 0.12;

    ctx.save();
    ctx.globalAlpha = alpha;
    const G = 200;
    ctx.globalAlpha = alpha * (0.45 + pulse * 0.3 + this.charge * 0.3);
    ctx.drawImage(PS.glow(this.fakeTell > 0.2 ? '#9a9ab0' : pal.accent, G), this.x - G, this.y - G);
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    if (this.defeated) ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);

    const shape = (ox, oy) => {
      ctx.beginPath();
      const n = this.points.length;
      for (let i = 0; i <= n; i++) {
        const k = i % n;
        const a = this.spinA + (k / n) * U.TAU;
        const r = (k % 2 ? this.points[k] * 0.55 : this.points[k]) * s;
        const px = ox + Math.cos(a) * r, py = oy + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    };
    // chromatic split when glitching
    if (this.glitch > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 3;
      ctx.strokeStyle = U.rgba('#00e5ff', 0.6); shape(-this.glitch, 0); ctx.stroke();
      ctx.strokeStyle = U.rgba('#ff2bd6', 0.6); shape(this.glitch, 2); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = U.rgba(pal.bg, 0.92);
    ctx.strokeStyle = hot ? '#ffffff' : this.fakeTell > 0.2 ? '#b8b8cc' : pal.accent;
    ctx.lineWidth = 4; ctx.lineJoin = 'round';
    shape(0, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = U.rgba(pal.boss2, 0.6); ctx.lineWidth = 2;
    PS.FX.shapePath(ctx, 'square', 0, 0, 30 * s, -this.spinA * 2); ctx.stroke();

    // off-centre eye that follows you
    const ex = 20, ey = -14;
    const la = Math.atan2(g.player.y - (this.y + ey), g.player.x - (this.x + ex));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex, ey, 15 + this.charge * 4, 0, U.TAU); ctx.fill();
    ctx.fillStyle = pal.bg;
    ctx.beginPath(); ctx.arc(ex + Math.cos(la) * 6, ey + Math.sin(la) * 6, 6, 0, U.TAU); ctx.fill();
    ctx.restore();
    this.drawShield(ctx, this.x, this.y, 110);
  }

  // =================== SIGNATURE ATTACKS ===================
  // STUTTER SPOKES: 10 lasers around the boss fire one by one, out of order, off the beat
  p_stutterSpokes() {
    const g = this.g;
    const n = { easy: 7, normal: 10, hard: 12 }[g.diff.id] || 10;
    const base = PS.rng() * PS.U.TAU;
    const order = [...Array(n).keys()].sort(() => PS.rng() - 0.5);
    const times = [0, 0.5, 0.75, 1.25, 1.5, 2, 2.25, 2.75, 3, 3.25, 3.5, 3.75];
    order.forEach((k, i) => g.later(times[i], () => {
      this.tell(0.4);
      PS.Patterns.laser(g, 0, 0, base + (k / n) * PS.U.TAU, { warnBeats: 0.75, activeBeats: 0.5, width: 22, len: 1500, follow: () => this });
    }));
    return 2;
  }

  // WRONG WALLS (DASH CHECK x2): solid bullet curtains from both sides, at
  // different speeds, speeding up. No gaps — dash through each one.
  p_wrongWalls() {
    const g = this.g, P = PS.Patterns;
    const sides = PS.rng() < 0.5 ? ['left', 'right'] : ['top', 'bottom'];
    P.callout(g, 'DASH THROUGH!');
    P.lineWall(g, sides[0], { speed: 110, accel: 160, maxSpeed: 360, spacing: 24, gapSize: 0, delayBeats: 1 });
    g.later(0.75, () => P.lineWall(g, sides[1], { speed: 80, accel: 220, maxSpeed: 420, spacing: 24, gapSize: 0, delayBeats: 1 }));
    return 2;
  }

  // LATE RING (DASH CHECK): a closing ring that arrives on the "and", not the beat
  p_lateRing() {
    const g = this.g;
    g.later(0.5, () => { this.tell(); PS.Patterns.closingRing(g, { radius: 280, spacing: 24, speed: 230, warnBeats: 1.25 }); });
    return 1;
  }

  // REWIND: bullets fly out, freeze-flicker, then all come back the way they came
  p_rewind() {
    const g = this.g;
    g.fx.text(g.W / 2, 128, '◀◀ REWIND', '#00e5ff', 32, 1.1);
    PS.Audio.sfx('warn');
    [0, 1].forEach((k) => g.later(k * 0.75, () => {
      this.tell();
      PS.Patterns.ring(g, this.x, this.y, { count: 14, speed: 240, breakEvery: 3, offset: k * 0.22, reverseAt: g.beats(2 - k * 0.75) });
    }));
    return 2;
  }

  // BOUNCERS: big slow bullets that ricochet around the arena a few times
  p_bouncers() {
    const g = this.g;
    this.tell();
    const n = { easy: 3, normal: 5, hard: 6 }[g.diff.id] || 5, base = PS.rng() * PS.U.TAU;
    for (let i = 0; i < n; i++) g.later(i * 0.5 + 0.25, () => {
      g.hazards.orb({ x: this.x, y: this.y, angle: base + (i / n) * PS.U.TAU, speed: 210 * g.diff.speed, r: 15, bounce: 3, breakable: i === 0, life: 9 });
    });
    return 1;
  }
};
