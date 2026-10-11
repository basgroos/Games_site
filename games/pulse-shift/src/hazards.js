// =============================================================
//  HAZARDS — every dangerous thing in the arena.
//
//  Layers decide how you survive them:
//    'air'    (PINK)   -> DASH through it (dash invulnerability)
//    'ground' (VIOLET) -> HOP over it (pulse hop invulnerability)
//  Orbs with breakable:true (CYAN hollow diamonds) can be reversed with BREAK.
//
//  Every hazard has:
//    warn   seconds of telegraph before it becomes dangerous
//    active() true when it can hurt you
//    hits(x, y, r) collision test
//    update(dt, game) / draw(ctx, game)
// =============================================================
(function () {
  const U = PS.U;
  const HC = () => PS.CONFIG.hazardColors;

  // ---------------------------------------------------------------
  // ORB — a bullet. Can move straight, curve, accelerate, orbit,
  // teleport ("blink") and re-aim at the player ("redirect").
  // ---------------------------------------------------------------
  class Orb {
    constructor(o) {
      this.type = 'orb';
      this.layer = 'air';
      this.x = o.x; this.y = o.y;
      const sp = o.speed || 0, a = o.angle || 0;
      this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
      this.r = o.r || 8;
      this.breakable = !!o.breakable;
      this.delay = o.delay || 0;            // telegraph time (orb is harmless & still)
      this.life = o.life || 14;             // seconds before it disappears
      this.accel = o.accel || 0;            // speed change per second
      this.accelAt = o.accelAt || 0;        // seconds before acceleration starts
      this.minSpeed = o.minSpeed !== undefined ? o.minSpeed : 0;
      this.maxSpeed = o.maxSpeed || 1400;
      this.turn = o.turn || 0;              // radians per second the path curves
      this.orbit = o.orbit ? Object.assign({}, o.orbit) : null; // {cx,cy,ang,rad,angVel,radVel}
      this.blink = o.blink ? Object.assign({ done: 0, count: 1, warn: 0.3 }, o.blink) : null; // {at, dist, every, count}
      this.redirect = o.redirect ? Object.assign({ done: false }, o.redirect) : null; // {at, speed}
      this.age = 0;
      this.dead = false;
      this.friendly = false;
      this.grazed = false;
      this.spin = Math.random() * 6;
      if (this.orbit) this.placeOnOrbit();
    }
    active() { return !this.dead && this.age >= this.delay; }
    placeOnOrbit() {
      const o = this.orbit;
      this.x = o.cx + Math.cos(o.ang) * o.rad;
      this.y = o.cy + Math.sin(o.ang) * o.rad;
    }
    speed() { return Math.hypot(this.vx, this.vy); }

    update(dt, g) {
      this.age += dt;
      this.spin += dt * 5;
      if (this.age < this.delay) return;
      const t = this.age - this.delay;

      if (this.friendly) {
        // reflected shard: home in on the boss
        const tp = g.boss ? g.boss.targetPoint(this.x, this.y) : null;
        if (tp) {
          const want = U.angle(this.x, this.y, tp.x, tp.y);
          const cur = Math.atan2(this.vy, this.vx);
          const na = cur + U.clamp(U.angDiff(cur, want), -9 * dt, 9 * dt);
          const sp = Math.min(1100, this.speed() + 1600 * dt);
          this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (t > this.life) this.dead = true;
        return;
      }

      if (this.orbit) {
        const o = this.orbit;
        o.ang += o.angVel * dt;
        o.rad += o.radVel * dt;
        if (o.rad < 4) this.dead = true;
        this.placeOnOrbit();
      } else {
        if (this.turn) {
          const c = Math.cos(this.turn * dt), s = Math.sin(this.turn * dt);
          const vx = this.vx * c - this.vy * s;
          this.vy = this.vx * s + this.vy * c; this.vx = vx;
        }
        if (this.accel && t >= this.accelAt) {
          const sp = this.speed();
          const ns = U.clamp(sp + this.accel * dt, this.minSpeed, this.maxSpeed);
          if (sp > 0.001) { this.vx *= ns / sp; this.vy *= ns / sp; }
        }
        if (this.redirect && !this.redirect.done && t >= this.redirect.at) {
          this.redirect.done = true;
          const p = g.player;
          const a = p ? U.angle(this.x, this.y, p.x, p.y) : Math.random() * U.TAU;
          this.vx = Math.cos(a) * this.redirect.speed; this.vy = Math.sin(a) * this.redirect.speed;
          this.accel = 0;
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
      }

      // blink = teleport forward along the travel direction
      const b = this.blink;
      if (b && b.done < b.count && t >= b.at + b.done * (b.every || 0)) {
        b.done++;
        const sp = this.speed() || 1;
        g.fx.ring(this.x, this.y, HC().breakable, this.r * 2, 2, 0.25, 2, 'square', Math.PI / 4);
        this.x += (this.vx / sp) * b.dist; this.y += (this.vy / sp) * b.dist;
        g.fx.ring(this.x, this.y, this.breakable ? HC().breakable : HC().danger, 2, this.r * 3, 0.25, 2);
      }

      const A = g.arena;
      if (t > this.life || this.x < A.x0 - 90 || this.x > A.x1 + 90 || this.y < A.y0 - 90 || this.y > A.y1 + 90) this.dead = true;
    }

    hits(px, py, pr) {
      if (!this.active()) return false;
      const dx = px - this.x, dy = py - this.y, rr = this.r + pr;
      return dx * dx + dy * dy < rr * rr;
    }
    hitsSeg(ax, ay, bx, by, pr) {
      return this.active() && U.segDist(this.x, this.y, ax, ay, bx, by) < this.r + pr;
    }

    // where the orb will appear after its next blink (for the warning ghost)
    blinkGhost() {
      const b = this.blink;
      if (!b || b.done >= b.count) return null;
      const t = this.age - this.delay;
      const next = b.at + b.done * (b.every || 0);
      if (next - t > b.warn) return null;
      const sp = this.speed() || 1;
      const ahead = (next - t) * sp;
      return { x: this.x + (this.vx / sp) * (b.dist + ahead), y: this.y + (this.vy / sp) * (b.dist + ahead) };
    }

    draw(ctx, g) {
      const hc = HC();
      const col = this.friendly ? hc.friendly : this.breakable ? hc.breakable : hc.danger;
      // spawn telegraph: a shrinking outline where the orb will appear
      if (this.age < this.delay) {
        const p = this.age / this.delay;
        ctx.strokeStyle = U.rgba(col, 0.25 + p * 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * (3.2 - 2.2 * p), 0, U.TAU); ctx.stroke();
        ctx.fillStyle = U.rgba(col, p * 0.5);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.4, 0, U.TAU); ctx.fill();
        return;
      }
      const R = Math.round(this.r * 3.2);
      ctx.drawImage(PS.glow(col, R), this.x - R, this.y - R);

      if (this.friendly) {
        const sp = this.speed() || 1;
        ctx.strokeStyle = U.rgba(col, 0.8); ctx.lineWidth = this.r;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - (this.vx / sp) * 34, this.y - (this.vy / sp) * 34); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.7, 0, U.TAU); ctx.fill();
        return;
      }

      // warning flicker before acceleration / redirect
      const t = this.age - this.delay;
      const soon = (this.accel > 0 && this.accelAt > 0 && t < this.accelAt && t > this.accelAt - 0.35) ||
        (this.redirect && !this.redirect.done && t > this.redirect.at - 0.35);
      if (soon) {
        ctx.strokeStyle = U.rgba('#ffffff', 0.5 + 0.5 * Math.sin(g.realTime * 50));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 6, 0, U.TAU); ctx.stroke();
      }

      if (this.breakable) {
        // hollow diamond = "you can BREAK this"
        const r = this.r * 1.35;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
        ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.lineTo(0, -r); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      } else {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, U.TAU); ctx.fill();
        ctx.fillStyle = hc.dangerCore;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.5, 0, U.TAU); ctx.fill();
      }

      const gh = this.blinkGhost();
      if (gh) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = U.rgba(col, 0.7); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(gh.x, gh.y, this.r * 1.3, 0, U.TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ---------------------------------------------------------------
  // SHOCKWAVE — an expanding floor ring (GROUND layer -> hop it,
  // or walk through one of its gaps).
  // ---------------------------------------------------------------
  class Shockwave {
    constructor(o) {
      this.type = 'shock';
      this.layer = 'ground';
      this.x = o.x; this.y = o.y;
      this.r = o.r0 || 30;
      this.speed = o.speed || 300;
      this.width = o.width || 26;
      this.warn = o.warn || 0;
      this.gaps = o.gaps || [];  // [{a: angle, w: half-width in radians}]
      this.maxR = o.maxR || 1500;
      this.age = 0; this.dead = false; this.grazed = false;
    }
    active() { return this.age >= this.warn && !this.dead; }
    inGap(a) {
      for (const gp of this.gaps) if (Math.abs(U.angDiff(a, gp.a)) < gp.w) return true;
      return false;
    }
    update(dt) {
      this.age += dt;
      if (this.active()) this.r += this.speed * dt;
      if (this.r > this.maxR) this.dead = true;
    }
    hits(px, py, pr) {
      if (!this.active()) return false;
      const d = Math.hypot(px - this.x, py - this.y);
      if (Math.abs(d - this.r) > this.width / 2 + pr) return false;
      return !this.inGap(Math.atan2(py - this.y, px - this.x));
    }
    arcs(ctx, r) {
      ctx.beginPath();
      if (!this.gaps.length) { ctx.arc(this.x, this.y, r, 0, U.TAU); return; }
      const gs = this.gaps.slice().sort((a, b) => a.a - b.a);
      for (let i = 0; i < gs.length; i++) {
        const a0 = gs[i].a + gs[i].w;
        let a1 = (i + 1 < gs.length ? gs[i + 1].a : gs[0].a + U.TAU) - (i + 1 < gs.length ? gs[i + 1].w : gs[0].w);
        if (a1 <= a0) continue;
        ctx.moveTo(this.x + Math.cos(a0) * r, this.y + Math.sin(a0) * r);
        ctx.arc(this.x, this.y, r, a0, a1);
      }
    }
    draw(ctx, g) {
      const col = HC().ground;
      if (!this.active()) {
        // telegraph: charging circle + preview of the gaps
        const p = this.age / this.warn;
        ctx.fillStyle = U.rgba(col, 0.15 + p * 0.25);
        ctx.beginPath(); ctx.arc(this.x, this.y, 18 + p * 30, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = U.rgba(col, 0.3 + p * 0.6);
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 8]);
        this.arcs(ctx, 70 + p * 30);
        ctx.stroke();
        ctx.setLineDash([]);
        if (!this.gaps.length) { // no gaps: the only answer is to HOP
          ctx.fillStyle = U.rgba('#ffffff', 0.5 + 0.5 * p);
          ctx.font = '800 18px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('HOP / DASH!', this.x, this.y - 118);
        }
        return;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(col, 0.25); ctx.lineWidth = this.width + 14;
      this.arcs(ctx, this.r); ctx.stroke();
      ctx.strokeStyle = U.rgba(col, 0.9); ctx.lineWidth = this.width;
      this.arcs(ctx, this.r); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      this.arcs(ctx, this.r - this.width / 2 + 2); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------
  // LASER — a beam from (x,y) at angle `ang`. AIR layer.
  // fake lasers are grey dashed ghosts that never hurt, unless
  // makeReal() is called on them.
  // ---------------------------------------------------------------
  class Laser {
    constructor(o) {
      this.type = 'laser';
      this.layer = 'air';
      this.x = o.x; this.y = o.y; this.ang = o.ang;
      this.len = o.len || 2400;
      this.width = o.width || 22;
      this.warn = o.warn || 0.5;
      this.life = o.life || 0.4;
      this.rot = o.rot || 0;          // radians/second while active
      this.follow = o.follow || null; // function -> {x,y} (beam stays attached to something)
      this.angFn = o.angFn || null;   // function -> angle (beam aims dynamically)
      this.fake = !!o.fake;
      this.age = 0; this.dead = false; this.grazed = false; this.fade = 0;
      this.converting = 0;
    }
    active() { return !this.fake && !this.dead && this.age >= this.warn && this.age < this.warn + this.life; }
    makeReal(warn, life) { this.fake = false; this.age = 0; this.warn = warn; this.life = life; this.converting = 0.3; }
    dissolve() { this.fake = true; this.life = 0; this.warn = 0; this.age = 0; this.fade = 0.3; this.dissolving = true; }
    update(dt) {
      this.age += dt;
      this.converting = Math.max(0, this.converting - dt);
      if (this.follow) { const p = this.follow(); this.x = p.x; this.y = p.y; }
      if (this.angFn) this.ang = this.angFn();
      else if (this.active()) this.ang += this.rot * dt;
      if (this.dissolving) { if (this.age > this.fade) this.dead = true; return; }
      if (!this.fake && this.age > this.warn + this.life + 0.15) this.dead = true;
    }
    end() { return { x: this.x + Math.cos(this.ang) * this.len, y: this.y + Math.sin(this.ang) * this.len }; }
    hits(px, py, pr) {
      if (!this.active()) return false;
      const e = this.end();
      return U.segDist(px, py, this.x, this.y, e.x, e.y) < this.width / 2 + pr;
    }
    draw(ctx, g) {
      const e = this.end();
      const col = HC().danger;
      if (this.fake) {
        const a = this.dissolving ? Math.max(0, 1 - this.age / this.fade) * 0.5 : 0.35 + 0.1 * Math.sin(g.realTime * 8);
        ctx.setLineDash([14, 12]);
        ctx.strokeStyle = 'rgba(200,200,220,' + a.toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        ctx.setLineDash([]);
        return;
      }
      if (this.age < this.warn) {
        // telegraph: flickering thin line + outline of the beam's width
        const p = this.age / this.warn;
        const flick = 0.55 + 0.45 * Math.sin(g.realTime * (20 + p * 40));
        const nx = -Math.sin(this.ang) * this.width / 2, ny = Math.cos(this.ang) * this.width / 2;
        ctx.strokeStyle = U.rgba(col, (0.25 + p * 0.5) * flick);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + nx, this.y + ny); ctx.lineTo(e.x + nx, e.y + ny);
        ctx.moveTo(this.x - nx, this.y - ny); ctx.lineTo(e.x - nx, e.y - ny);
        ctx.stroke();
        ctx.fillStyle = U.rgba(col, 0.06 + p * 0.12);
        ctx.beginPath();
        ctx.moveTo(this.x + nx, this.y + ny); ctx.lineTo(e.x + nx, e.y + ny);
        ctx.lineTo(e.x - nx, e.y - ny); ctx.lineTo(this.x - nx, this.y - ny); ctx.closePath(); ctx.fill();
        if (this.converting > 0) {
          ctx.strokeStyle = U.rgba('#ffffff', this.converting * 3);
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        }
        return;
      }
      const after = this.age - this.warn - this.life;
      const a = after > 0 ? Math.max(0, 1 - after / 0.15) : 1;
      const grow = Math.min(1, (this.age - this.warn) / 0.05);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba(col, 0.3 * a); ctx.lineWidth = this.width * 2.2 * grow;
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.strokeStyle = U.rgba(col, 0.95 * a); ctx.lineWidth = this.width * grow;
      ctx.stroke();
      ctx.strokeStyle = U.rgba('#ffffff', 0.9 * a); ctx.lineWidth = this.width * 0.35 * grow;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------
  // BOMB — delayed explosion. AIR layer.
  // ---------------------------------------------------------------
  class Bomb {
    constructor(o) {
      this.type = 'bomb';
      this.layer = 'air';
      this.x = o.x; this.y = o.y; this.r = o.r || 60;
      this.warn = o.warn || 0.5;
      this.life = o.life || 0.22;
      this.age = 0; this.dead = false; this.grazed = false; this.popped = false;
    }
    active() { return !this.dead && this.age >= this.warn && this.age < this.warn + this.life; }
    update(dt, g) {
      this.age += dt;
      if (!this.popped && this.age >= this.warn) {
        this.popped = true;
        g.fx.spark(this.x, this.y, HC().danger, 14, 380, 0.4, 4);
        g.fx.ring(this.x, this.y, HC().danger, this.r * 0.6, this.r * 1.5, 0.3, 4);
        g.fx.shake(3, 0.1);
        PS.Audio.sfx('boom');
      }
      if (this.age > this.warn + this.life + 0.12) this.dead = true;
    }
    hits(px, py, pr) {
      return this.active() && Math.hypot(px - this.x, py - this.y) < this.r + pr;
    }
    draw(ctx, g) {
      const col = HC().danger;
      if (this.age < this.warn) {
        const p = this.age / this.warn;
        ctx.strokeStyle = U.rgba(col, 0.6); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, U.TAU); ctx.stroke();
        ctx.fillStyle = U.rgba(col, 0.08 + p * 0.22);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * p, 0, U.TAU); ctx.fill();
        // countdown arc
        ctx.strokeStyle = U.rgba('#ffffff', 0.8); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 6, -Math.PI / 2, -Math.PI / 2 + p * U.TAU); ctx.stroke();
        return;
      }
      const after = this.age - this.warn;
      const a = Math.max(0, 1 - after / (this.life + 0.12));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba(col, 0.85 * a);
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, U.TAU); ctx.fill();
      ctx.fillStyle = U.rgba('#ffffff', 0.7 * a);
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.55, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------
  // ZONE — an area of the arena.
  //   shape 'rect'    : danger inside the rectangle (usually GROUND)
  //   shape 'inverse' : danger EVERYWHERE except a (moving) safe circle
  // ---------------------------------------------------------------
  const hatchCache = {};
  function hatch(ctx, color) {
    if (hatchCache[color] !== undefined) return hatchCache[color];
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    x.strokeStyle = U.rgba(color, 0.55); x.lineWidth = 3;
    x.beginPath(); x.moveTo(-4, 20); x.lineTo(20, -4); x.moveTo(-4, 4); x.lineTo(4, -4); x.moveTo(12, 20); x.lineTo(20, 12); x.stroke();
    hatchCache[color] = ctx.createPattern(c, 'repeat');
    return hatchCache[color];
  }

  class Zone {
    constructor(o) {
      this.type = 'zone';
      this.shape = o.shape || 'rect';
      this.layer = o.layer || (this.shape === 'inverse' ? 'air' : 'ground');
      this.noPerfect = this.shape === 'inverse';
      this.x = o.x; this.y = o.y; this.w = o.w; this.h = o.h;
      this.sx = o.sx; this.sy = o.sy; this.sr = o.sr; this.vx = o.vx || 0; this.vy = o.vy || 0;
      this.warn = o.warn || 0.5;
      this.life = o.life || 0.3;
      this.age = 0; this.dead = false; this.grazed = false;
    }
    active() { return !this.dead && this.age >= this.warn && this.age < this.warn + this.life; }
    update(dt, g) {
      this.age += dt;
      if (this.shape === 'inverse' && this.age >= this.warn) {
        // the safe circle drifts and bounces off the arena walls
        const A = g.arena;
        this.sx += this.vx * dt; this.sy += this.vy * dt;
        if (this.sx < A.x0 + this.sr || this.sx > A.x1 - this.sr) { this.vx *= -1; this.sx = U.clamp(this.sx, A.x0 + this.sr, A.x1 - this.sr); }
        if (this.sy < A.y0 + this.sr || this.sy > A.y1 - this.sr) { this.vy *= -1; this.sy = U.clamp(this.sy, A.y0 + this.sr, A.y1 - this.sr); }
      }
      if (this.age > this.warn + this.life + 0.2) this.dead = true;
    }
    hits(px, py, pr) {
      if (!this.active()) return false;
      if (this.shape === 'inverse') return Math.hypot(px - this.sx, py - this.sy) > this.sr - 2;
      return px > this.x && px < this.x + this.w && py > this.y && py < this.y + this.h;
    }
    draw(ctx, g) {
      const col = this.layer === 'ground' ? HC().ground : HC().danger;
      const warning = this.age < this.warn;
      const p = warning ? this.age / this.warn : 1;
      const after = this.age - this.warn - this.life;
      const fade = after > 0 ? Math.max(0, 1 - after / 0.2) : 1;
      ctx.save();
      if (this.shape === 'inverse') {
        const A = g.arena;
        ctx.beginPath();
        ctx.rect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
        ctx.arc(this.sx, this.sy, this.sr, 0, U.TAU, true); // hole = safe area
        if (warning) {
          ctx.fillStyle = hatch(ctx, col) || U.rgba(col, 0.15);
          ctx.globalAlpha = 0.25 + 0.5 * p;
          ctx.fill();
        } else {
          ctx.fillStyle = U.rgba(col, (0.28 + 0.06 * Math.sin(g.realTime * 30)) * fade);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = U.rgba('#ffffff', 0.9 * fade); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.sx, this.sy, this.sr, 0, U.TAU); ctx.stroke();
        if (warning) {
          ctx.fillStyle = U.rgba('#ffffff', 0.9);
          ctx.font = '700 16px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('SAFE', this.sx, this.sy);
          if (this.vx || this.vy) { // arrow showing drift direction
            const l = Math.hypot(this.vx, this.vy), ax = this.vx / l, ay = this.vy / l;
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(this.sx + ax * (this.sr - 30), this.sy + ay * (this.sr - 30));
            ctx.lineTo(this.sx + ax * (this.sr + 30), this.sy + ay * (this.sr + 30)); ctx.stroke();
          }
        }
      } else {
        if (warning) {
          ctx.globalAlpha = 0.3 + 0.6 * p;
          ctx.fillStyle = hatch(ctx, col) || U.rgba(col, 0.15);
          ctx.fillRect(this.x, this.y, this.w, this.h);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = U.rgba(col, 0.4 + 0.5 * p); ctx.lineWidth = 2;
          ctx.strokeRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = U.rgba(col, 0.55 * fade);
          ctx.fillRect(this.x, this.y, this.w, this.h);
          ctx.strokeStyle = U.rgba('#ffffff', 0.7 * fade); ctx.lineWidth = 2;
          ctx.strokeRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);
        }
      }
      ctx.restore();
    }
  }

  PS.Orb = Orb; PS.Shockwave = Shockwave; PS.Laser = Laser; PS.Bomb = Bomb; PS.Zone = Zone;

  // ---------------------------------------------------------------
  // The list of all live hazards
  // ---------------------------------------------------------------
  PS.HazardSystem = class {
    constructor(game) { this.g = game; this.list = []; }
    add(h) { this.list.push(h); return h; }
    orb(o) { return this.add(new Orb(o)); }
    update(dt) {
      for (let i = 0; i < this.list.length; i++) this.list[i].update(dt, this.g);
      this.list = this.list.filter((h) => !h.dead);
    }
    draw(ctx) {
      // floor stuff first, bullets on top
      const order = { zone: 0, shock: 1, bomb: 2, laser: 3, orb: 4 };
      const sorted = this.list.slice().sort((a, b) => order[a.type] - order[b.type]);
      for (const h of sorted) h.draw(ctx, this.g);
    }
    // remove everything; orbs turn into sparkles
    clear(sparkle) {
      if (sparkle) {
        for (const h of this.list) {
          if (h.type === 'orb' && h.active()) this.g.fx.spark(h.x, h.y, HC().breakable, 2, 120, 0.4, 3);
        }
      }
      this.list = [];
    }
  };
})();
