// =============================================================
//  PATTERNS — reusable attack building blocks.
//  Bosses combine these. All timing is in BEATS and goes through
//  the shared beat clock (g.later), never through separate timers.
//
//  g = the game. Common options:
//    speed (px/s), count, breakable, warnBeats, activeBeats ...
//  Difficulty automatically scales speed (g.diff.speed) and
//  bullet count (g.diff.density).
// =============================================================
(function () {
  const U = PS.U;
  const P = (PS.Patterns = {});

  const count = (g, n) => Math.max(3, Math.round(n * g.diff.density));
  const spd = (g, s) => s * g.diff.speed;
  const pos = (src) => (typeof src === 'function' ? src() : src);

  // Ring of orbs flying outward from (x, y)
  P.ring = function (g, x, y, o = {}) {
    const n = o.exact ? o.count : count(g, o.count || 12);
    const off = o.offset !== undefined ? o.offset : PS.rng() * U.TAU;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * U.TAU;
      if (o.gap && Math.abs(U.angDiff(a, o.gap.a)) < o.gap.w) continue;
      const brk = o.breakEvery ? i % o.breakEvery === 0 : !!o.breakable;
      g.hazards.orb({
        x, y, angle: a, speed: spd(g, o.speed || 220), r: o.r || 8, breakable: brk,
        delay: o.delayBeats ? g.beats(o.delayBeats) : 0,
        accel: o.accel, accelAt: o.accelAt, minSpeed: o.minSpeed, maxSpeed: o.maxSpeed, turn: o.turn,
        blink: o.blink, redirect: o.redirect, bounce: o.bounce, reverseAt: o.reverseAt
      });
    }
  };

  // Rotating spiral: `arms` streams, `perBeat` shots per beat for `beats` beats
  P.spiral = function (g, src, o = {}) {
    const perBeat = o.perBeat || 4, beats = o.beats || 2, arms = o.arms || 2;
    const base = o.angle !== undefined ? o.angle : PS.rng() * U.TAU;
    const dir = o.dir || (PS.rng() < 0.5 ? 1 : -1);
    const shots = Math.round(beats * perBeat);
    for (let i = 0; i < shots; i++) {
      g.later(i / perBeat, () => {
        const p = pos(src);
        // reverseAt: the spiral turns back the other way at that shot (a "rhythm change")
        const idx = o.reverseAt && i >= o.reverseAt ? 2 * o.reverseAt - i : i;
        for (let k = 0; k < arms; k++) {
          const a = base + idx * (o.step || 0.3) * dir + (k * U.TAU) / arms;
          const brk = o.breakArms ? k % o.breakArms === 0 : !!o.breakable;
          g.hazards.orb({ x: p.x, y: p.y, angle: a, speed: spd(g, o.speed || 200), r: o.r || 8, breakable: brk, blink: o.blink, turn: o.turn });
        }
      });
    }
  };

  // Volleys aimed at the player
  P.aimed = function (g, src, o = {}) {
    const volleys = o.volleys || 1;
    for (let v = 0; v < volleys; v++) {
      g.later(v * (o.interval || 1), () => {
        const p = pos(src);
        const tg = g.aimPoint(); // in co-op this alternates between the two players
        const a0 = U.angle(p.x, p.y, tg.x, tg.y);
        const n = o.count || 3, spread = o.spread || 0.22;
        for (let i = 0; i < n; i++) {
          const a = a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * (n - 1));
          g.hazards.orb({ x: p.x, y: p.y, angle: a, speed: spd(g, o.speed || 320), r: o.r || 8, breakable: o.breakable || (o.breakMiddle && i === (n >> 1)) });
        }
      });
    }
  };

  // Expanding floor ring (hop over it, or slip through a gap)
  P.shockwave = function (g, x, y, o = {}) {
    return g.hazards.add(new PS.Shockwave({
      x, y, warn: g.beats(o.warnBeats !== undefined ? o.warnBeats : 1),
      speed: spd(g, o.speed || 320), width: o.width || 26, gaps: o.gaps || [], r0: o.r0 || 30
    }));
  };

  // n random gaps for a shockwave, spread around the circle
  P.gaps = function (n, width = 0.36) {
    const out = [], off = PS.rng() * U.TAU;
    for (let i = 0; i < n; i++) out.push({ a: U.mod(off + (i / n) * U.TAU + U.rand(-0.4, 0.4), U.TAU), w: width });
    return out;
  };

  // One laser beam
  P.laser = function (g, x, y, ang, o = {}) {
    return g.hazards.add(new PS.Laser({
      x, y, ang,
      warn: g.beats(o.warnBeats !== undefined ? o.warnBeats : 1),
      life: g.beats(o.activeBeats || 0.5),
      rot: o.rot || 0, width: (o.width || 24) * g.diff.laserWidth, len: o.len || 2400,
      follow: o.follow, angFn: o.angFn, fake: o.fake
    }));
  };

  // A row of parallel lasers across the arena. dir 'v' = vertical lines.
  P.grid = function (g, o = {}) {
    const A = g.arena, out = [];
    const n = o.count || 4;
    const vertical = o.dir !== 'h';
    const span = vertical ? A.x1 - A.x0 : A.y1 - A.y0;
    const gap = span / n;
    const off = o.offset !== undefined ? o.offset : U.rand(0.2, 0.8);
    for (let i = 0; i < n; i++) {
      const c = (vertical ? A.x0 : A.y0) + gap * (i + off);
      const l = vertical
        ? P.laser(g, c, A.y0 - 40, Math.PI / 2, Object.assign({}, o, { len: A.y1 - A.y0 + 80 }))
        : P.laser(g, A.x0 - 40, c, 0, Object.assign({}, o, { len: A.x1 - A.x0 + 80 }));
      out.push(l);
    }
    return out;
  };

  // Delayed explosions at the given points, optionally staggered (beats)
  P.bombs = function (g, points, o = {}) {
    points.forEach((p, i) => {
      const fire = () => g.hazards.add(new PS.Bomb({ x: p.x, y: p.y, r: o.r || 60, warn: g.beats(o.warnBeats || 1), life: o.life || 0.22 }));
      const at = o.times ? o.times[i] : (o.stagger || 0) * i;
      at > 0 ? g.later(at, fire) : fire();
    });
  };

  // n points scattered around the player (kept inside the arena)
  P.aroundPlayer = function (g, n, radius, jitter = 40) {
    const A = g.arena, pts = [], off = PS.rng() * U.TAU, tg = g.aimPoint();
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * U.TAU;
      const r = i === 0 ? 0 : radius + U.rand(-jitter, jitter);
      pts.push({ x: U.clamp(tg.x + Math.cos(a) * r, A.x0 + 30, A.x1 - 30), y: U.clamp(tg.y + Math.sin(a) * r, A.y0 + 30, A.y1 - 30) });
    }
    return pts;
  };

  // Rotating arms of orbs around a centre ("rotating walls")
  P.orbitArms = function (g, cx, cy, o = {}) {
    const orbs = [];
    const arms = o.arms || 3, per = o.perArm || 6, base = o.angle !== undefined ? o.angle : PS.rng() * U.TAU;
    for (let a = 0; a < arms; a++) {
      for (let j = 0; j < per; j++) {
        orbs.push(g.hazards.orb({
          x: cx, y: cy, r: o.r || 9,
          breakable: o.breakTips && j === per - 1,
          delay: g.beats(o.delayBeats || 1),
          life: g.beats(o.lifeBeats || 8),
          orbit: { cx, cy, ang: base + (a / arms) * U.TAU, rad: (o.r0 || 110) + j * (o.spacing || 34), angVel: o.angVel || 0.9, radVel: o.radVel || 0 }
        }));
      }
    }
    return orbs;
  };

  // Checkerboard of floor tiles. parity 0/1 picks which half lights up.
  P.checker = function (g, o = {}) {
    const A = g.arena, cols = o.cols || 8, rows = o.rows || 4;
    const w = (A.x1 - A.x0) / cols, h = (A.y1 - A.y0) / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if ((c + r) % 2 !== o.parity) continue;
      g.hazards.add(new PS.Zone({ shape: 'rect', x: A.x0 + c * w, y: A.y0 + r * h, w, h, layer: 'ground', warn: g.beats(o.warnBeats || 1), life: g.beats(o.activeBeats || 0.4) }));
    }
  };

  // A wall of orbs sweeping across the arena with one gap
  P.lineWall = function (g, side, o = {}) {
    const A = g.arena, spacing = o.spacing || 34;
    const horizontal = side === 'left' || side === 'right';
    const span = horizontal ? A.y1 - A.y0 : A.x1 - A.x0;
    const n = Math.floor(span / spacing);
    const gapAt = o.gapAt !== undefined ? o.gapAt : U.rand(0.2, 0.8);
    const gapHalf = (o.gapSize || 120) / 2;
    const ang = { left: 0, right: Math.PI, top: Math.PI / 2, bottom: -Math.PI / 2 }[side];
    for (let i = 0; i <= n; i++) {
      const along = i * spacing;
      if (Math.abs(along - gapAt * span) < gapHalf) continue;
      const edge = o.delayBeats ? -12 : 20; // with a telegraph, spawn just inside so the markers are visible
      const x = horizontal ? (side === 'left' ? A.x0 - edge : A.x1 + edge) : A.x0 + along;
      const y = horizontal ? A.y0 + along : side === 'top' ? A.y0 - edge : A.y1 + edge;
      g.hazards.orb({
        x, y, angle: ang, speed: spd(g, o.speed || 200), r: 9, breakable: o.breakEvery ? i % o.breakEvery === 0 : false,
        delay: o.delayBeats ? g.beats(o.delayBeats) : 0, accel: o.accel, maxSpeed: o.maxSpeed
      });
    }
  };

  // =============================================================
  //  SIGNATURE ATTACKS — big set pieces. Several are "DASH CHECKS":
  //  there is no safe spot, so you MUST dash through at the right time.
  // =============================================================

  // Big warning text in the arena (used before dash checks)
  P.callout = function (g, text, color) {
    g.fx.text(g.W / 2, 128, text, color || PS.CONFIG.hazardColors.danger, 40, 1.1);
    PS.Audio.sfx('warn');
  };

  // "Clock hands": many lasers from one point (10 by default), slowly rotating.
  P.radialLasers = function (g, src, o = {}) {
    const n = o.count || 10;
    const base = o.angle !== undefined ? o.angle : PS.rng() * U.TAU;
    const beams = [];
    for (let k = 0; k < n; k++) {
      beams.push(P.laser(g, 0, 0, base + (k / n) * U.TAU, {
        warnBeats: o.warnBeats || 2, activeBeats: o.activeBeats || 4, width: o.width || 18, len: 1500,
        rot: o.rot || 0, follow: () => pos(src)
      }));
    }
    return beams;
  };

  // DASH CHECK: a solid ring of bullets closes in on you. No gaps — dash out.
  P.closingRing = function (g, o = {}) {
    const A = g.arena, R = o.radius || 290, tg = g.aimPoint();
    const cx = U.clamp(tg.x, A.x0 + R, A.x1 - R), cy = U.clamp(tg.y, A.y0 + R * 0.9, A.y1 - R * 0.9);
    const spacing = o.spacing || 24;
    const n = Math.ceil((U.TAU * R) / spacing);
    const speed = spd(g, o.speed || 240);
    P.callout(g, 'DASH OUT!');
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU;
      g.hazards.orb({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, angle: a + Math.PI, speed, r: 9, delay: g.beats(o.warnBeats || 1.5), life: (R + 60) / speed }); // passes through the centre: standing still is not safe
    }
  };

  // Lasers from all around the arena edge, all aimed at where you stand.
  P.edgeGates = function (g, o = {}) {
    const A = g.arena, n = o.count || 10;
    const W = A.x1 - A.x0, H = A.y1 - A.y0, per = 2 * (W + H);
    const off = PS.rng() * per;
    const tg = g.aimPoint(), tx = tg.x, ty = tg.y;
    for (let i = 0; i < n; i++) {
      let d = (off + (i / n) * per) % per, x, y;
      if (d < W) { x = A.x0 + d; y = A.y0; }
      else if ((d -= W) < H) { x = A.x1; y = A.y0 + d; }
      else if ((d -= H) < W) { x = A.x1 - d; y = A.y1; }
      else { d -= W; x = A.x0; y = A.y1 - d; }
      P.laser(g, x, y, U.angle(x, y, tx, ty), { warnBeats: o.warnBeats || 1.5, activeBeats: o.activeBeats || 0.75, width: 20, len: 1600 });
    }
  };

  // DASH CHECK: four laser walls box you in and close together.
  P.cage = function (g, o = {}) {
    const A = g.arena, half = o.half || 170, tg = g.aimPoint();
    const cx = U.clamp(tg.x, A.x0 + half + 10, A.x1 - half - 10), cy = U.clamp(tg.y, A.y0 + half + 10, A.y1 - half - 10);
    const warn = o.warnBeats || 1.5, close = o.closeBeats || 2;
    const b0 = g.clock.beat;
    const h = () => half * (1 - 0.92 * U.clamp((g.clock.beat - b0 - warn) / close, 0, 1));
    const opt = (follow, ang) => ({ warnBeats: warn, activeBeats: close + 0.5, width: 18, len: half * 2, follow });
    P.callout(g, 'DASH THROUGH!');
    P.laser(g, 0, 0, 0, opt(() => ({ x: cx - half, y: cy - h() })));
    P.laser(g, 0, 0, 0, opt(() => ({ x: cx - half, y: cy + h() })));
    P.laser(g, 0, 0, Math.PI / 2, opt(() => ({ x: cx - h(), y: cy - half })));
    P.laser(g, 0, 0, Math.PI / 2, opt(() => ({ x: cx + h(), y: cy - half })));
  };

  // Everything outside a drifting safe circle becomes dangerous
  P.safeZone = function (g, o = {}) {
    const A = g.arena;
    const sr = o.radius || 150, tg = g.aimPoint();
    const sx = U.clamp(o.x !== undefined ? o.x : tg.x, A.x0 + sr, A.x1 - sr);
    const sy = U.clamp(o.y !== undefined ? o.y : tg.y, A.y0 + sr, A.y1 - sr);
    const a = PS.rng() * U.TAU, sp = o.drift !== undefined ? o.drift : 90;
    return g.hazards.add(new PS.Zone({
      shape: 'inverse', sx, sy, sr, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      warn: g.beats(o.warnBeats || 2), life: g.beats(o.activeBeats || 4)
    }));
  };

  // TICK / TOCK: a grid of bomb spots. Each call arms one half (parity 0 or 1).
  P.bombGrid = function (g, o = {}) {
    const A = g.arena, cols = o.cols || 6, rows = o.rows || 3;
    const w = (A.x1 - A.x0) / cols, h = (A.y1 - A.y0) / rows, pts = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if ((c + r) % 2 === o.parity) pts.push({ x: A.x0 + w * (c + 0.5), y: A.y0 + h * (r + 0.5) });
    }
    P.bombs(g, pts, { warnBeats: o.warnBeats || 1, r: o.r || 75 });
  };

  // HALO RAIN: rows of bullets fall from the top; a safe gap drifts left and right
  P.rain = function (g, o = {}) {
    const A = g.arena, spacing = o.spacing || 40, rows = o.rows || 8, gapW = o.gap || 170;
    const start = PS.rng(), dir = PS.rng() < 0.5 ? 1 : -1;
    for (let r = 0; r < rows; r++) {
      g.later(r * (o.every || 0.5), () => {
        const t = r / Math.max(1, rows - 1);
        const gx = A.x0 + gapW / 2 + 20 + (A.x1 - A.x0 - gapW - 40) * (0.5 + 0.5 * Math.sin((start + t * dir * 0.6) * U.TAU));
        for (let x = A.x0 + spacing / 2; x < A.x1; x += spacing) {
          if (Math.abs(x - gx) < gapW / 2) continue;
          g.hazards.orb({ x, y: A.y0 + 4, angle: Math.PI / 2, speed: spd(g, o.speed || 240), r: 8, delay: g.beats(0.5), breakable: o.breakEvery ? Math.round(x / spacing) % o.breakEvery === 0 : false });
        }
      });
    }
  };
})();
