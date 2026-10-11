// =============================================================
//  BOSS BASE — shared logic for every boss.
//
//  How a boss works:
//   - Each phase has a SEQUENCE: a list of attack functions.
//   - At the start of every bar (4 beats), if the previous attack
//     is finished, the next attack in the sequence runs.
//   - An attack function schedules its bullets with g.later(beats, fn)
//     and returns how many bars it lasts (default 1).
//   - When HP crosses a threshold, the boss finishes the bar, then
//     spends one "rest" bar changing phase (shielded).
//
//  To make a new boss: extend PS.Boss, set name/track/bpms, and
//  write sequences() + draw(). See metronome.js for a full example.
// =============================================================
PS.Bosses = {};

PS.Boss = class {
  constructor(g) {
    this.g = g;
    this.name = 'BOSS';
    this.subtitle = '';
    this.track = 'metronome';
    this.x = g.W / 2; this.y = g.H / 2 - 20;
    this.maxHp = 100; this.hp = 100;
    this.phase = 0;
    this.thresholds = [0.66, 0.33]; // HP fractions that trigger phase 2 and 3
    this.phaseNames = ['PHASE I', 'PHASE II', 'PHASE III'];
    this.pendingPhase = -1;
    this.shielded = false;
    this.defeated = false;
    this.seqIndex = 0;
    this.barsLeft = 0;
    this.phaseBar = 0;
    this.bodyRadius = 60;  // touching this hurts
    this.hitRadius = 80;   // reflected shards hit inside this
    this.flash = 0;
    this.time = 0;
    this.defeatT = 0;
    this.charge = 0;       // visual "about to attack" glow (0..1)
    this.vulnerability = 1; // damage multiplier (balance knob per boss)
  }

  get bpms() { return [120, 128, 136]; }
  sequences() { return [[], [], []]; }

  // called by the game on every beat
  onBeat(s) {
    if (this.defeated || s.bar < 0) return;
    if (s.beatInBar === 0) {
      if (this.pendingPhase >= 0) {
        this.beginPhase(this.pendingPhase);
        this.pendingPhase = -1;
        this.barsLeft = 1; // one rest bar
      } else {
        this.phaseBar++;
        if (--this.barsLeft <= 0) {
          this.shielded = false;
          const seq = this.sequences()[this.phase];
          if (seq.length) {
            const attack = seq[this.seqIndex % seq.length];
            this.seqIndex++;
            this.barsLeft = attack.call(this, s) || 1;
          } else this.barsLeft = 1;
        }
      }
    }
    this.onAnyBeat(s);
  }
  onAnyBeat(s) {}

  beginPhase(n) {
    const g = this.g;
    this.phase = n;
    this.seqIndex = 0;
    this.phaseBar = 0;
    g.epoch++;                 // cancels attacks still scheduled from the old phase
    g.hazards.clear(true);
    g.setBpm(this.bpms[n]);
    g.announce(this.phaseNames[n], this.phaseSubtitle ? this.phaseSubtitle(n) : '');
    g.fx.flash(PS.Profile.palette().boss, 0.5);
    g.fx.shake(10, 0.5);
    g.fx.ring(this.x, this.y, PS.Profile.palette().boss, 40, 900, 1.0, 8, 'hex');
    PS.Audio.sfx('phase');
    this.onPhase(n);
  }
  onPhase(n) {}

  takeDamage(amount, x, y) {
    if (this.defeated || this.shielded) return false;
    const g = this.g;
    amount *= g.damageMult * this.vulnerability;
    this.hp = Math.max(0, this.hp - amount);
    this.flash = 1;
    g.stats.damageDealt += amount;
    PS.Audio.sfx('bossHit');
    if (x !== undefined) g.fx.spark(x, y, '#ffffff', 6, 260, 0.35, 3);
    if (this.hp <= 0) { this.defeat(); return true; }
    const th = this.thresholds[this.phase];
    if (th !== undefined && this.pendingPhase < 0 && this.hp / this.maxHp <= th) {
      this.hp = th * this.maxHp;
      this.pendingPhase = this.phase + 1;
      this.shielded = true;
      g.fx.text(this.x, this.y - 140, 'SHIELD UP', PS.Profile.palette().boss, 24, 1.2);
    }
    return true;
  }

  defeat() {
    this.defeated = true;
    this.g.epoch++;
    this.g.onBossDefeated(this);
  }

  // used by reflected shards
  hitTest(x, y, r) { return Math.hypot(x - this.x, y - this.y) < this.hitRadius + r; }
  targetPoint(x, y) { return { x: this.x, y: this.y }; }
  // contact damage
  bodyHits(px, py, pr) { return !this.defeated && Math.hypot(px - this.x, py - this.y) < this.bodyRadius + pr; }

  update(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.charge = Math.max(0, this.charge - dt * 2.5);
    if (this.defeated) this.defeatT += dt;
  }

  // flash before an attack (a visual telegraph on the boss itself)
  tell(strength = 1) { this.charge = Math.max(this.charge, strength); }

  draw(ctx) {}

  drawShield(ctx, x, y, r) {
    if (!this.shielded) return;
    const a = 0.35 + 0.2 * Math.sin(this.g.realTime * 10);
    ctx.strokeStyle = PS.U.rgba('#ffffff', a); ctx.lineWidth = 3;
    PS.FX.shapePath(ctx, 'hex', x, y, r, this.g.realTime);
    ctx.stroke();
  }
};
