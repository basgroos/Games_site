// =============================================================
//  SURVIVAL DIRECTOR + TUTORIAL DUMMY
//
//  Survival: an invulnerable core ("THE GRID") picks random attacks
//  from a pool. Every 8 bars the level rises: faster tempo, faster
//  bullets, and new attack types join the pool. Reflected shards and
//  cores give score instead of damage.
// =============================================================
PS.Bosses.survival = class extends PS.Boss {
  constructor(g) {
    super(g);
    this.name = 'THE GRID';
    this.subtitle = 'Survive';
    this.track = 'survival';
    this.isSurvival = true;
    this.y = g.H / 2;
    this.level = 1;
    this.bodyRadius = 26;
    this.hitRadius = 50;
    this.thresholds = [];
    this.baseSpeed = g.diff.speed;
    this.spinA = 0;
  }
  get bpms() { return [120, 120, 120]; }

  onBeat(s) {
    if (s.bar < 0) return;
    if (s.beatInBar !== 0) return;
    this.phaseBar++;
    if (s.bar > 0 && s.bar % 8 === 0) this.levelUp();
    if (--this.barsLeft <= 0) {
      this.barsLeft = this.runPattern();
      // from level 4, sometimes layer a second short attack
      if (this.level >= 4 && Math.random() < 0.45) this.runPattern(true);
    }
  }

  levelUp() {
    const g = this.g;
    this.level++;
    g.setBpm(Math.min(120 + (this.level - 1) * 5, 170));
    g.diff.speed = this.baseSpeed * Math.min(1.4, 1 + 0.045 * (this.level - 1));
    g.announce('LEVEL ' + this.level, this.level === 2 ? 'new patterns unlocked' : '', 1.4);
    PS.Audio.sfx('phase');
    g.fx.ring(this.x, this.y, PS.Profile.palette().accent, 30, 700, 0.8, 5, 'hex');
  }

  pool() {
    const g = this.g, P = PS.Patterns, U = PS.U, A = g.arena;
    const L = this.level;
    const edge = () => U.choose([{ x: A.x0 + 10, y: U.rand(A.y0, A.y1) }, { x: A.x1 - 10, y: U.rand(A.y0, A.y1) }, { x: U.rand(A.x0, A.x1), y: A.y0 + 10 }, { x: U.rand(A.x0, A.x1), y: A.y1 - 10 }]);
    return [
      { lvl: 1, bars: 1, fn: () => [0, 2].forEach((b) => g.later(b, () => P.ring(g, this.x, this.y, { count: 11 + L, speed: 180, breakEvery: 3 }))) },
      { lvl: 1, bars: 1, fn: () => P.spiral(g, this, { arms: 4, breakArms: 2, perBeat: 3, beats: 3, speed: 180, step: 0.3 }) },
      { lvl: 1, bars: 1, fn: () => [0, 2].forEach((b) => g.later(b, () => P.shockwave(g, this.x, this.y, { warnBeats: 1, speed: 320, gaps: P.gaps(2, 0.4) }))) },
      { lvl: 1, bars: 1, fn: () => [0, 1, 2, 3].forEach((b) => g.later(b, () => P.aimed(g, edge(), { count: 3, speed: 280, breakMiddle: b % 2 === 0 }))) },
      { lvl: 2, bars: 1, fn: () => P.lineWall(g, U.choose(['left', 'right', 'top', 'bottom']), { speed: 200, gapSize: 140, breakEvery: 6 }) },
      { lvl: 2, bars: 1, fn: () => P.grid(g, { dir: U.choose(['v', 'h']), count: U.choose([3, 4]), warnBeats: 2, activeBeats: 1 }) },
      { lvl: 3, bars: 1, fn: () => [0, 1, 2].forEach((b) => g.later(b, () => P.bombs(g, [{ x: g.player.x, y: g.player.y }], { warnBeats: 1, r: 60 }))) },
      { lvl: 3, bars: 1, fn: () => P.orbitArms(g, this.x, this.y, { arms: 3, perArm: 6, angVel: U.choose([-1, 1]) * 0.9, lifeBeats: 5, breakTips: true }) },
      { lvl: 3, bars: 1, fn: () => P.shockwave(g, this.x, this.y, { warnBeats: 1, speed: 340, gaps: [] }) },
      { lvl: 4, bars: 2, fn: () => { for (let k = 0; k < 4; k++) g.later(k * 2, () => P.checker(g, { parity: k % 2, warnBeats: 1, activeBeats: 0.35 })); } },
      { lvl: 4, bars: 1, fn: () => P.ring(g, this.x, this.y, { count: 12, speed: 50, accel: 650, accelAt: g.beats(1), maxSpeed: 420, breakEvery: 4 }) },
      { lvl: 5, bars: 1, fn: () => P.ring(g, this.x, this.y, { count: 12, speed: 150, breakEvery: 2, blink: { at: g.beats(1), dist: 140, warn: g.beats(0.5), count: 2, every: g.beats(1) } }) },
      { lvl: 5, bars: 1, fn: () => P.ring(g, this.x, this.y, { count: 14, speed: 520, accel: -760, minSpeed: 0, breakEvery: 2, redirect: { at: g.beats(2), speed: 320 } }) },
      { lvl: 6, bars: 2, fn: () => P.safeZone(g, { radius: 160, drift: 90, warnBeats: 2, activeBeats: 4 }) }
    ].filter((p) => p.lvl <= L);
  }

  runPattern(shortOnly) {
    let list = this.pool();
    if (shortOnly) list = list.filter((p) => p.bars === 1);
    // newest patterns are a bit more likely
    const pick = Math.random() < 0.35 ? list[list.length - 1 - Math.floor(Math.random() * Math.min(3, list.length))] : PS.U.choose(list);
    this.tell();
    pick.fn();
    return pick.bars;
  }

  // can't be destroyed — hits just score points
  takeDamage(amount, x, y) {
    this.flash = 1;
    this.g.addScore(150);
    PS.Audio.sfx('bossHit');
    if (x !== undefined) this.g.fx.spark(x, y, '#ffffff', 6, 260, 0.35, 3);
    return true;
  }

  update(dt) { super.update(dt); this.spinA += dt * (0.5 + this.level * 0.1); }

  draw(ctx) {
    const g = this.g, pal = PS.Profile.palette(), U = PS.U, pulse = g.visualPulse();
    const G = 140;
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.drawImage(PS.glow(pal.accent, G), this.x - G, this.y - G);
    ctx.globalAlpha = 1;
    const c = this.flash > 0.4 ? '#ffffff' : pal.accent;
    ctx.strokeStyle = c; ctx.lineWidth = 4;
    PS.FX.shapePath(ctx, 'hex', this.x, this.y, 30 + pulse * 6 + this.charge * 8, this.spinA); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = -this.spinA * 1.5 + (i * U.TAU) / 4;
      ctx.strokeStyle = U.rgba(pal.boss2, 0.8); ctx.lineWidth = 2;
      PS.FX.shapePath(ctx, 'square', this.x + Math.cos(a) * 58, this.y + Math.sin(a) * 58, 10, a); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, U.TAU); ctx.fill();
  }
};

// Tutorial target: does nothing by itself; the tutorial script attacks.
PS.Bosses.dummy = class extends PS.Boss {
  constructor(g) {
    super(g);
    this.name = 'TRAINING PRISM';
    this.subtitle = 'Tutorial';
    this.track = 'tutorial';
    this.isDummy = true;
    this.y = 250;
    this.thresholds = [];
    this.bodyRadius = 34;
    this.hitRadius = 70;
  }
  get bpms() { return [108, 108, 108]; }
  onBeat() {}
  takeDamage(amount, x, y) {
    this.flash = 1;
    this.hp = Math.max(15, this.hp - amount * 3);
    PS.Audio.sfx('bossHit');
    if (x !== undefined) this.g.fx.spark(x, y, '#ffffff', 6, 260, 0.35, 3);
    if (this.g.tutorial) this.g.tutorial.onBossHit();
    return true;
  }
  draw(ctx) {
    const g = this.g, pal = PS.Profile.palette(), pulse = g.visualPulse();
    const c = this.flash > 0.4 ? '#ffffff' : pal.boss;
    const G = 140;
    ctx.globalAlpha = 0.4 + pulse * 0.3;
    ctx.drawImage(PS.glow(pal.boss, G), this.x - G, this.y - G);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c; ctx.lineWidth = 4;
    PS.FX.shapePath(ctx, 'tri', this.x, this.y, 46 + pulse * 6, this.time * 0.8 - Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = PS.U.rgba(pal.boss2, 0.7); ctx.lineWidth = 2;
    PS.FX.shapePath(ctx, 'hex', this.x, this.y, 64, -this.time * 0.4); ctx.stroke();
  }
};
