// =============================================================
//  FX — particles, rings, floating text, lightning bolts,
//  screen shake and flashes. Purely visual.
// =============================================================

// Cached soft glow sprites (much faster than ctx.shadowBlur)
PS.glowCache = {};
PS.glow = function (color, radius) {
  const key = color + radius;
  let c = PS.glowCache[key];
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = radius * 2;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, PS.U.rgba(color, 0.55));
  g.addColorStop(0.35, PS.U.rgba(color, 0.18));
  g.addColorStop(1, PS.U.rgba(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, radius * 2, radius * 2);
  PS.glowCache[key] = c;
  return c;
};

PS.FX = class {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.parts = [];
    this.rings = [];
    this.texts = [];
    this.bolts = [];
    this.shakeMag = 0;
    this.shakeT = 0;
    this.flashA = 0;
    this.flashColor = '#ffffff';
    this.zoom = 0;
  }

  // burst of glowing particles
  spark(x, y, color, n = 10, speed = 300, life = 0.5, size = 3, shape = 'dot') {
    if (this.parts.length > 700) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.6),
        color, shape, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12
      });
    }
  }

  // expanding outline: shape = 'circle' | 'hex' | 'square' | 'tri'
  ring(x, y, color, r0, r1, life, width = 3, shape = 'circle', rot = 0) {
    this.rings.push({ x, y, color, r0, r1, life, max: life, width, shape, rot });
  }

  text(x, y, str, color, size = 22, life = 0.9) {
    this.texts.push({ x, y, str, color, size, life, max: life });
  }

  bolt(x1, y1, x2, y2, color, life = 0.25) {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const off = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 40;
      const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
      pts.push([x1 + (x2 - x1) * t + (nx / l) * off, y1 + (y2 - y1) * t + (ny / l) * off]);
    }
    this.bolts.push({ pts, color, life, max: life });
  }

  shake(mag, time = 0.25) {
    const s = PS.Profile.settings.shake;
    if (s <= 0) return;
    this.shakeMag = Math.max(this.shakeMag, mag * s);
    this.shakeT = Math.max(this.shakeT, time);
  }

  flash(color, alpha) {
    if (!PS.Profile.settings.flashes) alpha *= 0.25;
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, alpha);
  }

  shakeOffset() {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * 2 * this.shakeMag, y: (Math.random() - 0.5) * 2 * this.shakeMag };
  }

  update(dt, realDt) {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt;
      p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const t of this.texts) { t.life -= realDt; t.y -= 30 * realDt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const b of this.bolts) b.life -= realDt;
    this.bolts = this.bolts.filter((b) => b.life > 0);

    this.shakeT -= realDt;
    if (this.shakeT <= 0) this.shakeMag = 0; else this.shakeMag *= 1 - 6 * realDt;
    this.flashA = Math.max(0, this.flashA - realDt * 3);
    this.zoom = Math.max(0, this.zoom - realDt * 4);
  }

  drawWorld(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const rad = PS.U.lerp(r.r0, r.r1, PS.U.easeOut(t));
      ctx.strokeStyle = PS.U.rgba(r.color, (1 - t) * 0.9);
      ctx.lineWidth = r.width * (1 - t * 0.6);
      PS.FX.shapePath(ctx, r.shape, r.x, r.y, rad, r.rot + t * 0.6);
      ctx.stroke();
    }
    for (const p of this.parts) {
      const a = p.life / p.max;
      ctx.fillStyle = PS.U.rgba(p.color, a);
      if (p.shape === 'tri') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.moveTo(p.size * 2, 0); ctx.lineTo(-p.size, p.size); ctx.lineTo(-p.size, -p.size); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    for (const b of this.bolts) {
      const a = b.life / b.max;
      ctx.strokeStyle = PS.U.rgba(b.color, a);
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      b.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTexts(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = Math.min(1, t.life / (t.max * 0.5));
      const pop = 1 + Math.max(0, (t.life - t.max + 0.12) / 0.12) * 0.4;
      ctx.font = '800 ' + Math.round(t.size * pop) + 'px ' + PS.FONT;
      ctx.fillStyle = PS.U.rgba('#000000', a * 0.6);
      ctx.fillText(t.str, t.x + 2, t.y + 2);
      ctx.fillStyle = PS.U.rgba(t.color, a);
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  }

  drawFlash(ctx, w, h) {
    if (this.flashA <= 0) return;
    ctx.fillStyle = PS.U.rgba(this.flashColor, this.flashA * 0.5);
    ctx.fillRect(0, 0, w, h);
  }
};

// Build a path for a regular shape (used by rings, bosses, UI)
PS.FX.shapePath = function (ctx, shape, x, y, r, rot = 0) {
  ctx.beginPath();
  if (shape === 'circle') { ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); return; }
  const sides = shape === 'hex' ? 6 : shape === 'square' ? 4 : shape === 'tri' ? 3 : shape === 'oct' ? 8 : 5;
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
};

PS.FONT = '"Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif';
PS.MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
