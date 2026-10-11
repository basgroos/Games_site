// =============================================================
//  PLAYER — movement, Dash, Pulse Hop, and drawing.
//  All tuning numbers live in PS.CONFIG.player (config.js).
//
//  DASH  : short burst, invulnerable to AIR hazards (pink).
//          Touch a pink hazard at the very start = PERFECT SHIFT.
//  HOP   : short jump, invulnerable to GROUND hazards (violet).
//  BREAK : handled by game.tryBreak() (spends Resonance).
// =============================================================
PS.Player = class {
  constructor(game, x, y, hp) {
    this.g = game;
    this.x = x; this.y = y;
    this.prevX = x; this.prevY = y;
    this.vx = 0; this.vy = 0;
    this.facing = { x: 0, y: -1 };
    this.hp = hp; this.maxHp = hp;
    this.dashT = -1;     // time since the dash started (-1 = not dashing)
    this.dashDir = { x: 0, y: -1 };
    this.dashCd = 0;
    this.dashInv = 0;    // remaining dash invulnerability
    this.hopT = -1;      // time since hop started (-1 = on the floor)
    this.hopCd = 0;
    this.hurtT = 0;      // remaining invulnerability after a hit
    this.breakInv = 0;
    this.overdrive = 0;
    this.spin = 0;
    this.trail = [];
    this.alive = true;
  }

  get dashing() { return this.dashT >= 0; }
  get hopping() { return this.hopT >= 0; }
  airSafe() { return this.dashInv > 0; }
  groundSafe() { return this.hopT >= 0; }
  hurtSafe() { return this.hurtT > 0 || this.breakInv > 0; }

  update(dt) {
    const C = PS.CONFIG.player, I = PS.Input, A = this.g.arena;
    this.prevX = this.x; this.prevY = this.y;
    this.dashCd -= dt; this.hopCd -= dt; this.hurtT -= dt; this.breakInv -= dt;
    this.overdrive -= dt; this.dashInv -= dt;

    const mv = this.g.inputLocked ? { x: 0, y: 0 } : I.move();
    const ml = Math.hypot(mv.x, mv.y);
    if (ml > 0.2) { this.facing.x = mv.x / ml; this.facing.y = mv.y / ml; }

    if (this.dashing) {
      this.dashT += dt;
      const k = Math.min(1, this.dashT / C.dashTime);
      const sp = C.dashSpeed * (1 - 0.45 * k * k);
      this.x += this.dashDir.x * sp * dt;
      this.y += this.dashDir.y * sp * dt;
      if (this.dashT >= C.dashTime) {
        this.dashT = -1;
        this.vx = this.dashDir.x * C.moveSpeed;
        this.vy = this.dashDir.y * C.moveSpeed;
      }
    } else {
      const max = C.moveSpeed * (this.overdrive > 0 ? C.overdriveSpeedMult : 1) * (this.hopping ? C.hopSpeedMult : 1);
      const tx = mv.x * max, ty = mv.y * max;
      const rate = (ml > 0.05 ? C.accel : C.decel) * dt;
      const dx = tx - this.vx, dy = ty - this.vy, d = Math.hypot(dx, dy);
      if (d <= rate) { this.vx = tx; this.vy = ty; } else { this.vx += (dx / d) * rate; this.vy += (dy / d) * rate; }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    if (this.hopping) {
      this.hopT += dt;
      if (this.hopT >= C.hopTime) {
        this.hopT = -1;
        this.g.fx.ring(this.x, this.y, PS.CONFIG.hazardColors.ground, 6, 34, 0.25, 2);
        PS.Audio.sfx('land');
      }
    }

    const r = C.size;
    this.x = PS.U.clamp(this.x, A.x0 + r, A.x1 - r);
    this.y = PS.U.clamp(this.y, A.y0 + r, A.y1 - r);
    this.spin += dt * (this.dashing ? 22 : 3);

    // actions (pressed slightly early = buffered)
    if (!this.g.inputLocked) {
      if (!this.dashing && !this.hopping && this.dashCd <= 0 && I.consume('dash')) this.startDash(mv, ml);
      if (!this.dashing && !this.hopping && this.hopCd <= 0 && I.consume('hop')) this.startHop();
      if (I.consume('brk')) this.g.tryBreak();
    }

    // trail
    for (const t of this.trail) t.age += dt;
    this.trail.push({ x: this.x, y: this.y, age: 0, dash: this.dashing });
    this.trail = this.trail.filter((t) => t.age < (t.dash ? 0.4 : 0.18));
  }

  startDash(mv, ml) {
    const C = PS.CONFIG.player;
    if (ml > 0.2) { this.dashDir.x = mv.x / ml; this.dashDir.y = mv.y / ml; }
    else { this.dashDir.x = this.facing.x; this.dashDir.y = this.facing.y; }
    this.dashT = 0;
    this.perfectDone = false; // only one Perfect Shift per dash
    this.dashCd = C.dashCooldown + C.dashTime;
    this.dashInv = C.dashTime + C.dashIFrameExtra;
    this.g.onDash();
  }

  startHop() {
    const C = PS.CONFIG.player;
    this.hopT = 0;
    this.hopCd = C.hopCooldown + C.hopTime;
    this.g.onHop();
  }

  // ---------------- drawing ----------------
  drawTrail(ctx) {
    const pal = PS.Profile.palette();
    const style = PS.Profile.settings.trail;
    const col = pal.trail;
    const T = this.trail;
    if (T.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 1; i < T.length; i++) {
      const a = T[i - 1], b = T[i];
      const life = b.dash ? 0.4 : 0.18;
      const k = 1 - b.age / life;
      if (k <= 0) continue;
      const w = (b.dash ? 12 : 5) * k;
      if (style === 'ribbon') {
        ctx.strokeStyle = PS.U.rgba(col, k * (b.dash ? 0.8 : 0.4));
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else if (style === 'pixel') {
        if (i % 2) continue;
        const s = Math.max(2, w);
        ctx.fillStyle = PS.U.rgba(col, k * 0.8);
        ctx.fillRect(Math.round(b.x / 6) * 6 - s / 2, Math.round(b.y / 6) * 6 - s / 2, s, s);
      } else if (style === 'shards') {
        if (i % 2) continue;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang + b.age * 10);
        ctx.fillStyle = PS.U.rgba(col, k * 0.8);
        ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(-w * 0.6, w * 0.5); ctx.lineTo(-w * 0.6, -w * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (style === 'comet') {
        ctx.fillStyle = PS.U.rgba(col, k * 0.5);
        ctx.beginPath(); ctx.arc(b.x, b.y, w * 0.8 + 1, 0, PS.U.TAU); ctx.fill();
      } else if (style === 'helix') {
        const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
        const off = Math.sin(i * 0.9 + this.spin) * (b.dash ? 10 : 5);
        ctx.fillStyle = PS.U.rgba(col, k * 0.8);
        ctx.fillRect(b.x + Math.cos(ang) * off - 2, b.y + Math.sin(ang) * off - 2, 4, 4);
        ctx.fillStyle = PS.U.rgba(pal.accent, k * 0.8);
        ctx.fillRect(b.x - Math.cos(ang) * off - 2, b.y - Math.sin(ang) * off - 2, 4, 4);
      }
    }
    ctx.restore();
  }

  draw(ctx) {
    const C = PS.CONFIG.player, pal = PS.Profile.palette(), g = this.g;
    if (!this.alive) return;
    this.drawTrail(ctx);
    const hop = this.hopping ? Math.sin((Math.PI * this.hopT) / C.hopTime) : 0;
    const s = C.size * (1 + hop * 0.45);
    const lift = -hop * 16;

    if (hop > 0) { // shadow on the floor while airborne
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 4, s * (1 - hop * 0.3), s * 0.45, 0, 0, PS.U.TAU); ctx.fill();
      ctx.strokeStyle = PS.U.rgba(PS.CONFIG.hazardColors.ground, 0.6); ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const flicker = this.hurtT > 0 && Math.floor(g.realTime * 20) % 2 ? 0.35 : 1;
    ctx.save();
    ctx.translate(this.x, this.y + lift);
    ctx.globalAlpha = flicker;

    // dark halo so the player is always readable on top of bullets
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, s + 7, 0, PS.U.TAU); ctx.fill();
    const R = Math.round(s * 3.2);
    ctx.drawImage(PS.glow(pal.player, R), -R, -R);

    if (this.overdrive > 0) {
      ctx.strokeStyle = PS.U.rgba(pal.accent, Math.min(1, this.overdrive) * 0.8); ctx.lineWidth = 2;
      PS.FX.shapePath(ctx, 'hex', 0, 0, s + 9, -this.spin * 0.5); ctx.stroke();
    }

    // stretch along the dash direction
    if (this.dashing) {
      ctx.rotate(Math.atan2(this.dashDir.y, this.dashDir.x));
      ctx.scale(1.55, 0.7);
      ctx.rotate(-Math.atan2(this.dashDir.y, this.dashDir.x));
    }

    // body: spinning diamond with a white core
    ctx.save();
    ctx.rotate(this.spin * 0.3 + Math.PI / 4);
    ctx.fillStyle = PS.U.rgba(pal.player, 0.3);
    ctx.strokeStyle = pal.player; ctx.lineWidth = 3;
    ctx.fillRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
    ctx.strokeRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, PS.U.TAU); ctx.fill();
    // eye looking where you're heading
    ctx.fillStyle = pal.bg;
    ctx.beginPath(); ctx.arc(this.facing.x * s * 0.16, this.facing.y * s * 0.16, s * 0.17, 0, PS.U.TAU); ctx.fill();

    ctx.restore();

    // BREAK ready: two cyan diamonds orbit you
    if (g.res >= PS.CONFIG.resonance.breakCost) {
      const bc = PS.CONFIG.hazardColors.breakable;
      for (let i = 0; i < (g.res >= PS.CONFIG.resonance.max ? 4 : 2); i++) {
        const a = g.realTime * 4 + (i * PS.U.TAU) / (g.res >= 100 ? 4 : 2);
        const ox = this.x + Math.cos(a) * (s + 14), oy = this.y + lift + Math.sin(a) * (s + 14);
        ctx.fillStyle = bc;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
      }
    }

    if (PS.Profile.settings.hitbox) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, C.hitRadius, 0, PS.U.TAU); ctx.stroke();
    }
  }
};
