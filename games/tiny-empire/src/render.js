/* =====================================================================
   RENDERER — isometric canvas drawing with procedural buildings,
   day/night lighting, cars, pedestrians, particles and overlays.
   No image assets: everything is drawn with simple shapes.
   ===================================================================== */
(function (TE) {
  'use strict';
  const HW = 32, HH = 16;              // half tile width / height in world pixels
  const G = () => TE.Game;
  const P = (gx, gy, z) => [(gx - gy) * HW, (gx + gy) * HH - (z || 0)];

  /* ---------- Color helpers ---------- */
  const colorCache = {};
  function hexToRgb(h) {
    if (colorCache[h]) return colorCache[h];
    const n = parseInt(h.slice(1), 16);
    return (colorCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function shade(hex, f) {
    const [r, g, b] = hexToRgb(hex);
    const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), Bc = hexToRgb(b);
    return `rgb(${Math.round(A[0] + (Bc[0] - A[0]) * t)},${Math.round(A[1] + (Bc[1] - A[1]) * t)},${Math.round(A[2] + (Bc[2] - A[2]) * t)})`;
  }
  function heat(v) { // 0 = red, 0.5 = yellow, 1 = green
    v = Math.max(0, Math.min(1, v));
    return v < 0.5 ? mix('#e63946', '#ffd166', v * 2) : mix('#ffd166', '#2a9d8f', (v - 0.5) * 2);
  }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; }

  /* ---------- Drawing primitives ---------- */
  let ctx = null;
  let glow = [];       // emissive draws performed after the night overlay
  let night = 0;
  let animT = 0;

  function poly(pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function prism(x0, y0, x1, y1, z0, z1, col, opts) {
    opts = opts || {};
    const left = opts.left || shade(col, 0.86), right = opts.right || shade(col, 0.7), top = opts.top || shade(col, 1.08);
    poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], left);
    poly([P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1)], right);
    if (!opts.noTop) poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top);
    if (opts.outline !== false) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      const a = P(x0, y1, z1), b = P(x1, y1, z1), c = P(x1, y0, z1), d = P(x1, y1, z0);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(d[0], d[1]);
      ctx.stroke();
    }
    return {
      L: (u, v) => P(x0 + (x1 - x0) * u, y1, z0 + (z1 - z0) * v),
      R: (u, v) => P(x1, y1 - (y1 - y0) * u, z0 + (z1 - z0) * v),
      T: (u, v) => P(x0 + (x1 - x0) * u, y0 + (y1 - y0) * v, z1),
    };
  }
  function quad(face, u0, v0, u1, v1, fill, emissive) {
    const pts = [face(u0, v0), face(u1, v0), face(u1, v1), face(u0, v1)];
    poly(pts, fill);
    if (emissive) glow.push({ kind: 'poly', pts, color: emissive });
  }
  function windows(face, cols, rows, o) {
    o = o || {};
    const u0 = o.u0 == null ? 0.1 : o.u0, u1 = o.u1 == null ? 0.9 : o.u1, v0 = o.v0 == null ? 0.15 : o.v0, v1 = o.v1 == null ? 0.9 : o.v1;
    const cw = (u1 - u0) / cols, rh = (v1 - v0) / rows, gx = cw * (o.gap || 0.28), gy = rh * (o.gapY || 0.3);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const lit = night > 0.25 && hash((o.seed || 1) * 131 + c * 17 + r * 7) < (o.litChance || 0.6);
      quad(face, u0 + c * cw + gx / 2, v0 + r * rh + gy / 2, u0 + (c + 1) * cw - gx / 2, v0 + (r + 1) * rh - gy / 2,
        o.color || '#a8dadc', lit ? (o.litColor || 'rgba(255,214,107,0.95)') : null);
    }
  }
  function hipRoof(x0, y0, x1, y1, z, h, col) {
    const ap = P((x0 + x1) / 2, (y0 + y1) / 2, z + h);
    poly([P(x0, y0, z), P(x1, y0, z), ap], shade(col, 1.15));
    poly([P(x0, y0, z), P(x0, y1, z), ap], shade(col, 1.05));
    poly([P(x0, y1, z), P(x1, y1, z), ap], shade(col, 0.92));
    poly([P(x1, y1, z), P(x1, y0, z), ap], shade(col, 0.72));
  }
  function gableRoof(x0, y0, x1, y1, z, h, col, wall) {
    const ym = (y0 + y1) / 2;
    poly([P(x0, y0, z), P(x1, y0, z), P(x1, ym, z + h), P(x0, ym, z + h)], shade(col, 1.12));
    poly([P(x0, y1, z), P(x1, y1, z), P(x1, ym, z + h), P(x0, ym, z + h)], shade(col, 0.9));
    poly([P(x1, y1, z), P(x1, y0, z), P(x1, ym, z + h)], shade(wall || col, 0.68));
  }
  function cylinder(gx, gy, z0, z1, r, col) {
    const [x, y0] = P(gx, gy, z0), [, y1] = P(gx, gy, z1);
    ctx.fillStyle = shade(col, 0.8); ctx.fillRect(x - r, y1, r * 2, y0 - y1);
    ctx.fillStyle = shade(col, 0.65); ctx.fillRect(x, y1, r, y0 - y1);
    ctx.beginPath(); ctx.ellipse(x, y0, r, r * 0.5, 0, 0, Math.PI); ctx.fillStyle = shade(col, 0.72); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y1, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = shade(col, 1.1); ctx.fill();
  }
  function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function treeAt(gx, gy, size, seed, col) {
    const sway = Math.sin(animT * 1.6 + seed * 10) * 1.2 * size;
    const [x, y] = P(gx, gy, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.ellipse(x + 3 * size, y + 1, 7 * size, 3.2 * size, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7f5539'; ctx.fillRect(x - 1.3 * size, y - 9 * size, 2.6 * size, 9 * size);
    const c = col || (seed < 0.33 ? '#40916c' : seed < 0.66 ? '#52b788' : '#2d6a4f');
    circle(x + sway * 0.6, y - 12 * size, 7 * size, shade(c, 0.85));
    circle(x - 3 * size + sway, y - 15 * size, 5.5 * size, c);
    circle(x + 3 * size + sway, y - 16 * size, 5 * size, shade(c, 1.12));
    circle(x + sway, y - 20 * size, 4.5 * size, shade(c, 1.2));
  }
  function pineAt(gx, gy, size, seed) {
    const sway = Math.sin(animT * 1.4 + seed * 9) * size;
    const [x, y] = P(gx, gy, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.ellipse(x + 3, y + 1, 6 * size, 3 * size, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4226'; ctx.fillRect(x - 1.2, y - 6 * size, 2.4, 6 * size);
    for (let i = 0; i < 3; i++) {
      const w = (8 - i * 2) * size, yy = y - (5 + i * 6) * size, s = sway * (0.4 + i * 0.3);
      poly([[x - w + s, yy], [x + w + s, yy], [x + s * 1.3, yy - 10 * size]], i % 2 ? '#2d6a4f' : '#1b4332');
    }
  }
  function person(x, y, col, bob) {
    const by = Math.sin(bob) * 0.6;
    ctx.fillStyle = col; ctx.fillRect(x - 1.2, y - 5 + by, 2.4, 3.5);
    circle(x, y - 6.3 + by, 1.3, '#f1c27d');
  }
  function sign(x, y, text, bg, fg, size) {
    ctx.font = `bold ${size || 7}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 5;
    ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - (size || 7) - 1, w, (size || 7) + 3);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }
  function awning(face, v, col, col2) {
    for (let i = 0; i < 6; i++) quad(face, i / 6, v, (i + 1) / 6, v + 0.16, i % 2 ? col : (col2 || '#ffffff'));
  }
  function lightGlow(x, y, r, color) { glow.push({ kind: 'radial', x, y, r, color }); }

  /* ---------- Building drawings ----------
     Each function receives (gx, gy, b, o) with o = { seed, lvl } and draws at tile (gx, gy). */
  const HOUSE_WALLS = ['#fde2c4', '#f9d5e5', '#d6eaf8', '#d5f5e3', '#fff3b0', '#e8daef'];
  const HOUSE_ROOFS = ['#d1495b', '#9c6644', '#3d6b8e', '#c96f2d', '#6a994e'];

  const DRAW = {
    road() { /* drawn in the ground pass */ },
    townhall(gx, gy, b, o) {
      const m = 0.08;
      prism(gx + m, gy + m, gx + 1 - m, gy + 1 - m, 0, 5, '#d8d2c4');
      const f = prism(gx + 0.16, gy + 0.16, gx + 0.84, gy + 0.84, 5, 24, '#f1e9d2');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      for (let i = 0; i < 4; i++) quad(A, 0.1 + i * 0.22, 0.05, 0.16 + i * 0.22, 0.85, '#fffaf0');
      for (let i = 0; i < 4; i++) quad(Bs, 0.1 + i * 0.22, 0.05, 0.16 + i * 0.22, 0.85, shade('#fffaf0', 0.85));
      windows(A, 4, 1, { u0: 0.06, u1: 0.94, v0: 0.3, v1: 0.7, color: '#5e6472', seed: 9, gap: 0.6 });
      prism(gx + 0.12, gy + 0.12, gx + 0.88, gy + 0.88, 24, 28, '#e9c46a');
      const [x, y] = P(gx + 0.5, gy + 0.5, 28);
      ctx.beginPath(); ctx.ellipse(x, y, 11, 6, 0, Math.PI, 0); ctx.lineTo(x + 11, y); ctx.fillStyle = '#7fb3d5'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - 1, 10, Math.PI, 0); ctx.fillStyle = '#5dade2'; ctx.fill();
      ctx.fillStyle = '#555'; ctx.fillRect(x - 0.5, y - 26, 1, 16);
      const wave = Math.sin(animT * 4) * 1.5;
      poly([[x + 0.5, y - 26], [x + 10, y - 23 + wave], [x + 0.5, y - 19]], '#e63946');
    },
    house(gx, gy, b, o) {
      const lv = o.lvl, wall = HOUSE_WALLS[Math.floor(o.seed * HOUSE_WALLS.length)], roof = HOUSE_ROOFS[Math.floor(hash(o.seed * 1000) * HOUSE_ROOFS.length)];
      const m = lv >= 4 ? 0.16 : 0.2;
      const h = 13 + (Math.min(lv, 4) - 1) * 9;
      if (lv >= 3) { // garden + fence
        const p = [P(gx + 0.06, gy + 0.06), P(gx + 0.94, gy + 0.06), P(gx + 0.94, gy + 0.94), P(gx + 0.06, gy + 0.94)];
        poly(p, 'rgba(116,198,157,0.55)');
        ctx.strokeStyle = '#f8f9fa'; ctx.lineWidth = 1; ctx.beginPath();
        const a = P(gx + 0.06, gy + 0.94, 3), c = P(gx + 0.94, gy + 0.94, 3), d = P(gx + 0.94, gy + 0.06, 3);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
      }
      const f = prism(gx + m, gy + m, gx + 1 - m, gy + 1 - m, 0, h, wall);
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      const floors = Math.min(lv, 4);
      quad(A, 0.42, 0, 0.58, 0.55 / floors, b && b.neglected ? '#6c584c' : '#8d5b4c');
      for (let fl = 0; fl < floors; fl++) {
        const v0 = fl / floors, v1 = (fl + 1) / floors;
        const lit = (k) => (night > 0.25 && hash(o.seed * 77 + fl * 5 + k) < 0.7 ? 'rgba(255,214,107,0.95)' : null);
        if (b && b.neglected) { quad(A, 0.12, v0 + 0.3 * (v1 - v0), 0.32, v0 + 0.75 * (v1 - v0), '#6c584c'); quad(Bs, 0.2, v0 + 0.3 * (v1 - v0), 0.45, v0 + 0.75 * (v1 - v0), '#5a4a40'); continue; }
        quad(A, 0.12, v0 + 0.3 * (v1 - v0), 0.32, v0 + 0.75 * (v1 - v0), '#a8dadc', lit(1));
        if (fl > 0) quad(A, 0.42, v0 + 0.3 * (v1 - v0), 0.58, v0 + 0.75 * (v1 - v0), '#a8dadc', lit(2));
        quad(A, 0.68, v0 + 0.3 * (v1 - v0), 0.88, v0 + 0.75 * (v1 - v0), '#a8dadc', lit(3));
        quad(Bs, 0.2, v0 + 0.3 * (v1 - v0), 0.45, v0 + 0.75 * (v1 - v0), '#94c5cc', lit(4));
        quad(Bs, 0.6, v0 + 0.3 * (v1 - v0), 0.85, v0 + 0.75 * (v1 - v0), '#94c5cc', lit(5));
      }
      if (lv >= 5) { // balcony
        quad(A, 0.05, 0.5, 0.95, 0.56, '#ffffff');
      }
      gableRoof(gx + m - 0.04, gy + m - 0.04, gx + 1 - m + 0.04, gy + 1 - m + 0.04, h, 10, b && b.neglected ? '#7d6b60' : roof, wall);
      if (lv >= 2) { const [x, y] = P(gx + 0.68, gy + 0.32, h + 8); ctx.fillStyle = '#7f5539'; ctx.fillRect(x - 2, y - 6, 4, 8); }
      if (b && b.neglected) { // boards
        const [x, y] = P(gx + 0.5, gy + 1 - m, h * 0.5);
        ctx.strokeStyle = '#7f5539'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 8, y - 2); ctx.lineTo(x - 2, y + 2); ctx.stroke();
      }
    },
    apartment(gx, gy, b, o) {
      const h = 32 + o.lvl * 6, col = ['#e5989b', '#b5838d', '#cdb4db', '#ffcdb2'][Math.floor(o.seed * 4)];
      const f = prism(gx + 0.12, gy + 0.12, gx + 0.88, gy + 0.88, 0, h, col);
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      const rows = Math.floor(h / 10);
      windows(A, 3, rows, { seed: o.seed * 99, color: '#bde0fe', v0: 0.08, v1: 0.96 });
      windows(Bs, 3, rows, { seed: o.seed * 98, color: '#a2d2ff', v0: 0.08, v1: 0.96 });
      quad(A, 0.4, 0, 0.6, 0.08, '#6d597a');
      prism(gx + 0.55, gy + 0.2, gx + 0.75, gy + 0.4, h, h + 5, '#adb5bd');
      if (o.lvl >= 3) treeAt(gx + 0.3, gy + 0.65, 0.45, o.seed);
    },
    condo(gx, gy, b, o) {
      const h = 50 + o.lvl * 9;
      const f = prism(gx + 0.15, gy + 0.15, gx + 0.85, gy + 0.85, 0, h, '#caf0f8', { left: '#90e0ef', right: '#48cae4', top: '#e0fbfc' });
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      const rows = Math.floor(h / 9);
      for (let r = 0; r < rows; r++) {
        quad(A, 0, r / rows, 1, r / rows + 0.02, '#ffffff');
        quad(Bs, 0, r / rows, 1, r / rows + 0.02, '#e9ecef');
      }
      windows(A, 2, rows, { seed: o.seed * 50, color: 'rgba(255,255,255,0.25)', gap: 0.15, litChance: 0.5 });
      prism(gx + 0.25, gy + 0.25, gx + 0.75, gy + 0.75, h, h + 3, '#95d5b2');
      treeAt(gx + 0.45, gy + 0.45, 0.35, o.seed, '#52b788');
      ctx.save(); ctx.translate(0, -h - 3); treeAt(gx + 0.6, gy + 0.6, 0.3, o.seed + 0.2); ctx.restore();
    },
    bakery(gx, gy, b, o) {
      const h = 16 + (o.lvl >= 3 ? 9 : 0);
      const f = prism(gx + 0.16, gy + 0.16, gx + 0.84, gy + 0.84, 0, h, '#ffe5d9');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.15, 0.08, 0.55, h > 16 ? 0.4 : 0.6, '#cdeefb', night > 0.25 ? 'rgba(255,214,107,0.9)' : null);
      quad(A, 0.65, 0, 0.85, h > 16 ? 0.45 : 0.65, '#9c6644');
      awning(A, h > 16 ? 0.42 : 0.62, '#ff8fab');
      if (h > 16) windows(A, 3, 1, { v0: 0.65, v1: 0.92, seed: o.seed * 7 });
      windows(Bs, 2, 1, { v0: 0.3, v1: 0.7, color: '#bde0fe', seed: o.seed * 3 });
      hipRoof(gx + 0.13, gy + 0.13, gx + 0.87, gy + 0.87, h, 7, '#b5651d');
      // bread sign (animated bounce)
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 9 + Math.sin(animT * 3 + o.seed * 6) * 1.2);
      ctx.beginPath(); ctx.ellipse(x, y, 6, 3.5, -0.2, 0, Math.PI * 2); ctx.fillStyle = '#e09f3e'; ctx.fill();
      ctx.strokeStyle = '#9c6644'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x - 3, y + 2); ctx.moveTo(x + 1, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
    },
    coffee(gx, gy, b, o) {
      const h = 17 + (o.lvl >= 3 ? 8 : 0);
      const f = prism(gx + 0.17, gy + 0.17, gx + 0.83, gy + 0.83, 0, h, '#a47148');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.1, 0.08, 0.6, 0.62, '#ffe8d6', night > 0.25 ? 'rgba(255,200,120,0.95)' : null);
      quad(A, 0.68, 0, 0.88, 0.6, '#582f0e');
      awning(A, 0.62, '#2d6a4f', '#d8f3dc');
      windows(Bs, 2, 1, { v0: 0.3, v1: 0.7, color: '#ffe8d6', seed: o.seed * 5 });
      prism(gx + 0.15, gy + 0.15, gx + 0.85, gy + 0.85, h, h + 2, '#6f4518');
      // coffee cup sign with steam
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 7, 8, 7); ctx.fillStyle = '#6f4518'; ctx.fillRect(x - 4, y - 7, 8, 2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + 5, y - 4, 2, -1.5, 1.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const ph = animT * 2 + i * 2;
        ctx.beginPath(); ctx.moveTo(x - 1 + i * 2, y - 9);
        ctx.quadraticCurveTo(x - 3 + i * 2 + Math.sin(ph) * 2, y - 12, x - 1 + i * 2, y - 15); ctx.stroke();
      }
      // café table outside
      const [tx, ty] = P(gx + 0.9, gy + 0.62, 0);
      circle(tx, ty - 5, 2.5, '#ffffff'); ctx.fillStyle = '#555'; ctx.fillRect(tx - 0.4, ty - 5, 0.8, 5);
    },
    grocery(gx, gy, b, o) {
      const h = 18 + (o.lvl >= 3 ? 6 : 0);
      const f = prism(gx + 0.1, gy + 0.12, gx + 0.9, gy + 0.88, 0, h, '#e9f5db');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.08, 0.06, 0.92, 0.55, '#d8f3dc', night > 0.25 ? 'rgba(220,255,200,0.9)' : null);
      awning(A, 0.58, '#40916c');
      quad(A, 0.05, 0.8, 0.95, 0.98, '#2d6a4f');
      windows(Bs, 2, 1, { v0: 0.3, v1: 0.7, color: '#b7e4c7', seed: 4 });
      prism(gx + 0.08, gy + 0.1, gx + 0.92, gy + 0.9, h, h + 2, '#52b788');
      // produce crates
      [['#e63946', 0.25], ['#f4a261', 0.45], ['#80b918', 0.65]].forEach(([c, u]) => {
        const [x, y] = P(gx + 0.1 + u * 0.8, gy + 0.96, 2);
        ctx.fillStyle = '#9c6644'; ctx.fillRect(x - 3, y - 2, 6, 3);
        circle(x - 1.5, y - 2.5, 1.3, c); circle(x + 1.3, y - 2.6, 1.3, c);
      });
      const [sx, sy] = P(gx + 0.5, gy + 0.5, h + 2);
      sign(sx, sy - 3, 'MARKET', '#2d6a4f', '#ffffff', 6);
    },
    restaurant(gx, gy, b, o) {
      const h = 17 + (o.lvl >= 3 ? 8 : 0);
      const f = prism(gx + 0.18, gy + 0.16, gx + 0.82, gy + 0.84, 0, h, '#c1121f');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.1, 0.1, 0.55, 0.6, '#fdf0d5', night > 0.25 ? 'rgba(255,190,110,0.95)' : null);
      quad(A, 0.65, 0, 0.85, 0.62, '#3a0ca3');
      awning(A, 0.63, '#780000', '#fdf0d5');
      windows(Bs, 2, 1, { v0: 0.3, v1: 0.7, color: '#fdf0d5', seed: o.seed });
      hipRoof(gx + 0.15, gy + 0.13, gx + 0.85, gy + 0.87, h, 6, '#3d405b');
      // terrace umbrella
      const [x, y] = P(gx + 0.92, gy + 0.55, 0);
      ctx.fillStyle = '#555'; ctx.fillRect(x - 0.5, y - 12, 1, 12);
      poly([[x - 7, y - 10], [x + 7, y - 10], [x, y - 15]], '#ffb703');
      circle(x, y - 4, 3, '#ffffff');
      if (night > 0.3) for (let i = 0; i < 5; i++) { const p = A(0.1 + i * 0.2, 1.05); lightGlow(p[0], p[1], 5, 'rgba(255,220,120,0.8)'); circle(p[0], p[1], 1, '#ffe066'); }
    },
    office(gx, gy, b, o) {
      const h = 28 + o.lvl * 8;
      const f = prism(gx + 0.15, gy + 0.15, gx + 0.85, gy + 0.85, 0, h, '#8da9c4', { left: '#7895b2', right: '#5d7b9a', top: '#b0c4de' });
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      const rows = Math.floor(h / 8);
      windows(A, 4, rows, { color: '#cfe8ff', seed: o.seed * 11, gap: 0.2, v0: 0.12, litChance: 0.7 });
      windows(Bs, 4, rows, { color: '#a9c8e8', seed: o.seed * 12, gap: 0.2, v0: 0.12, litChance: 0.7 });
      quad(A, 0.4, 0, 0.6, 0.1, '#2b2d42');
      prism(gx + 0.3, gy + 0.3, gx + 0.6, gy + 0.6, h, h + 4, '#adb5bd');
    },
    skyscraper(gx, gy, b, o) {
      const h = 78 + o.lvl * 12;
      const f = prism(gx + 0.17, gy + 0.17, gx + 0.83, gy + 0.83, 0, h, '#4cc9f0', { left: '#4895ef', right: '#3a0ca3', top: '#bde0fe' });
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      const rows = Math.floor(h / 7);
      windows(A, 3, rows, { color: 'rgba(255,255,255,0.35)', seed: o.seed * 21, gap: 0.12, gapY: 0.25, litChance: 0.55, v0: 0.04, v1: 0.98 });
      windows(Bs, 3, rows, { color: 'rgba(255,255,255,0.2)', seed: o.seed * 22, gap: 0.12, gapY: 0.25, litChance: 0.55, v0: 0.04, v1: 0.98 });
      prism(gx + 0.25, gy + 0.25, gx + 0.75, gy + 0.75, h, h + 8, '#3f37c9');
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 8);
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(x - 0.6, y - 16, 1.2, 16);
      const blink = Math.sin(animT * 4 + o.seed * 10) > 0.3;
      circle(x, y - 16, 1.8, blink ? '#ff006e' : '#6a040f');
      if (blink) lightGlow(x, y - 16, 7, 'rgba(255,0,110,0.8)');
    },
    factory(gx, gy, b, o) {
      const h = 16 + (o.lvl - 1) * 3;
      const f = prism(gx + 0.08, gy + 0.12, gx + 0.92, gy + 0.88, 0, h, '#b56576');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      windows(A, 4, 1, { v0: 0.4, v1: 0.8, color: '#e5e5e5', seed: o.seed, litChance: 0.8 });
      quad(Bs, 0.3, 0, 0.7, 0.7, '#6c757d');
      // saw-tooth roof
      for (let i = 0; i < 3; i++) {
        const x0 = gx + 0.08 + i * 0.28, x1 = x0 + 0.28;
        poly([P(x0, gy + 0.12, h), P(x0, gy + 0.88, h), P(x1, gy + 0.88, h + 8), P(x1, gy + 0.12, h + 8)], '#8d99ae');
        poly([P(x1, gy + 0.88, h), P(x1, gy + 0.12, h), P(x1, gy + 0.12, h + 8), P(x1, gy + 0.88, h + 8)], '#cfe8ff');
      }
      const chimH = 38 + o.lvl * 3;
      cylinder(gx + 0.75, gy + 0.3, 0, chimH, 3.5, '#9d0208');
      const [cx, cy] = P(gx + 0.75, gy + 0.3, chimH - 6);
      ctx.fillStyle = b && b.perks.filters ? '#80ed99' : '#ffffff'; ctx.fillRect(cx - 3.5, cy, 7, 2);
      if (b) b._chimney = P(gx + 0.75, gy + 0.3, chimH);
    },
    warehouse(gx, gy, b, o) {
      const h = 14;
      const f = prism(gx + 0.08, gy + 0.14, gx + 0.92, gy + 0.86, 0, h, '#adb5bd');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      for (let i = 0; i < 8; i++) quad(A, i / 8, 0, i / 8 + 0.04, 1, '#8d99ae');
      quad(A, 0.3, 0, 0.7, 0.7, '#6c757d');
      for (let i = 0; i < 4; i++) quad(A, 0.3, i * 0.17, 0.7, i * 0.17 + 0.05, '#495057');
      poly([P(gx + 0.08, gy + 0.14, h), P(gx + 0.92, gy + 0.14, h), P(gx + 0.92, gy + 0.5, h + 6), P(gx + 0.08, gy + 0.5, h + 6)], '#ced4da');
      poly([P(gx + 0.08, gy + 0.86, h), P(gx + 0.92, gy + 0.86, h), P(gx + 0.92, gy + 0.5, h + 6), P(gx + 0.08, gy + 0.5, h + 6)], '#868e96');
      poly([P(gx + 0.92, gy + 0.86, h), P(gx + 0.92, gy + 0.14, h), P(gx + 0.92, gy + 0.5, h + 6)], '#6c757d');
      [[0.95, 0.3], [0.97, 0.6]].forEach(([u, v]) => { prism(gx + u - 0.08, gy + v - 0.06, gx + u, gy + v + 0.06, 0, 5, '#c68b59'); });
    },
    mall(gx, gy, b, o) {
      const h = 22 + (o.lvl - 1) * 4;
      const f = prism(gx + 0.06, gy + 0.06, gx + 0.94, gy + 0.94, 0, h, '#f8edeb');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.05, 0.05, 0.95, 0.6, '#a2d2ff', night > 0.25 ? 'rgba(200,230,255,0.9)' : null);
      quad(A, 0.4, 0, 0.6, 0.45, '#ffffff');
      quad(Bs, 0.05, 0.1, 0.95, 0.6, '#90bde6');
      // animated color band
      const cols = ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff'];
      for (let i = 0; i < 10; i++) quad(A, i / 10, 0.72, (i + 1) / 10, 0.9, cols[(i + Math.floor(animT * 3)) % 5]);
      prism(gx + 0.04, gy + 0.04, gx + 0.96, gy + 0.96, h, h + 2, '#e5e5e5');
      prism(gx + 0.35, gy + 0.35, gx + 0.65, gy + 0.65, h + 2, h + 9, '#bde0fe', { top: '#e0fbfc' });
    },
    cinema(gx, gy, b, o) {
      const h = 26 + (o.lvl - 1) * 3;
      const f = prism(gx + 0.12, gy + 0.12, gx + 0.88, gy + 0.88, 0, h, '#7209b7');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.1, 0.05, 0.9, 0.35, '#3c096c');
      quad(A, 0.3, 0, 0.7, 0.32, '#ffd60a', night > 0.25 ? 'rgba(255,214,10,0.7)' : null);
      quad(A, 0.05, 0.42, 0.95, 0.62, '#240046');
      for (let i = 0; i < 10; i++) { // marquee bulbs
        const on = (i + Math.floor(animT * 6)) % 3 === 0;
        const p = A(0.08 + i * 0.094, 0.52);
        circle(p[0], p[1], 1.1, on ? '#ffea00' : '#9d4edd');
        if (on && night > 0.2) lightGlow(p[0], p[1], 4, 'rgba(255,234,0,0.8)');
      }
      quad(Bs, 0.2, 0.2, 0.5, 0.8, '#f72585');
      quad(Bs, 0.6, 0.2, 0.85, 0.8, '#4cc9f0');
      prism(gx + 0.1, gy + 0.1, gx + 0.9, gy + 0.9, h, h + 3, '#560bad');
    },
    hotel(gx, gy, b, o) {
      const h = 42 + o.lvl * 7;
      const f = prism(gx + 0.15, gy + 0.15, gx + 0.85, gy + 0.85, 0, h, '#fefae0', { left: '#faedcd', right: '#d4a373', top: '#fefae0' });
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      const rows = Math.floor(h / 9);
      windows(A, 3, rows, { seed: o.seed * 41, color: '#90e0ef', v0: 0.15, v1: 0.95 });
      windows(Bs, 3, rows, { seed: o.seed * 42, color: '#48cae4', v0: 0.15, v1: 0.95 });
      quad(A, 0.3, 0, 0.7, 0.12, '#bc6c25');
      prism(gx + 0.22, gy + 0.22, gx + 0.78, gy + 0.78, h, h + 3, '#dda15e');
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 3);
      sign(x, y - 2, 'HOTEL', '#bc6c25', '#fefae0', 7);
      if (night > 0.25) lightGlow(x, y - 6, 12, 'rgba(255,190,90,0.6)');
    },
    ecofactory(gx, gy, b, o) {
      const h = 18;
      const f = prism(gx + 0.08, gy + 0.12, gx + 0.92, gy + 0.88, 0, h, '#e9f5db');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0, 0.75, 1, 0.9, '#55a630');
      windows(A, 4, 1, { v0: 0.3, v1: 0.65, color: '#caf0f8', seed: o.seed });
      quad(Bs, 0.3, 0, 0.7, 0.65, '#adb5bd');
      // solar panels
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const x0 = gx + 0.15 + i * 0.36, y0 = gy + 0.18 + j * 0.34;
        poly([P(x0, y0, h + 1), P(x0 + 0.3, y0, h + 1), P(x0 + 0.3, y0 + 0.28, h + 5), P(x0, y0 + 0.28, h + 5)], '#1d3557', 'rgba(255,255,255,0.4)', 0.5);
      }
      // wind turbine
      const [x, y] = P(gx + 0.9, gy + 0.15, 0);
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(x - 1, y - 46, 2, 46);
      ctx.save(); ctx.translate(x, y - 46); ctx.rotate(animT * 2.5);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillRect(-1, 0, 2, 16); }
      ctx.restore();
      circle(x, y - 46, 2, '#dee2e6');
    },
    landmark(gx, gy, b, o) {
      prism(gx + 0.05, gy + 0.05, gx + 0.95, gy + 0.95, 0, 4, '#e9edc9');
      prism(gx + 0.22, gy + 0.22, gx + 0.78, gy + 0.78, 4, 20, '#ccd5ae');
      const f = prism(gx + 0.3, gy + 0.3, gx + 0.7, gy + 0.7, 20, 82, '#d4a373', { left: '#e6ccb2', right: '#b08968', top: '#ede0d4' });
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      windows(A, 1, 5, { color: '#7f5539', seed: 3, gap: 0.6, v1: 0.75 });
      // clock faces
      [[A, '#fefae0'], [Bs, '#f0e6d2']].forEach(([face, c]) => {
        const p = face(0.5, 0.88);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 5, 5.5, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8; ctx.beginPath();
        ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(animT * 0.5) * 3.5, p[1] + Math.sin(animT * 0.5) * 3.5);
        ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(animT * 0.04) * 2.5, p[1] + Math.sin(animT * 0.04) * 2.5); ctx.stroke();
        if (night > 0.25) lightGlow(p[0], p[1], 9, 'rgba(255,240,180,0.7)');
      });
      hipRoof(gx + 0.27, gy + 0.27, gx + 0.73, gy + 0.73, 82, 26, '#386641');
      const [x, y] = P(gx + 0.5, gy + 0.5, 108);
      circle(x, y, 2.2, '#ffd60a');
    },
    park(gx, gy, b, o) {
      poly([P(gx + 0.04, gy + 0.04), P(gx + 0.96, gy + 0.04), P(gx + 0.96, gy + 0.96), P(gx + 0.04, gy + 0.96)], '#74c69d');
      // path
      poly([P(gx + 0.42, gy + 0.04), P(gx + 0.58, gy + 0.04), P(gx + 0.58, gy + 0.96), P(gx + 0.42, gy + 0.96)], '#e9d8a6');
      poly([P(gx + 0.04, gy + 0.42), P(gx + 0.96, gy + 0.42), P(gx + 0.96, gy + 0.58), P(gx + 0.04, gy + 0.58)], '#e9d8a6');
      // fountain (level 2+) or flowerbed
      const [fx, fy] = P(gx + 0.5, gy + 0.5);
      ctx.beginPath(); ctx.ellipse(fx, fy, 7, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#adb5bd'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(fx, fy, 5.5, 2.6, 0, 0, Math.PI * 2); ctx.fillStyle = '#48cae4'; ctx.fill();
      const jet = 4 + Math.sin(animT * 5) * 1.2;
      ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - jet); ctx.stroke();
      // flowers
      for (let i = 0; i < 5; i++) {
        const u = hash(o.seed * 50 + i), v = hash(o.seed * 70 + i);
        if (Math.abs(u - 0.5) < 0.12 || Math.abs(v - 0.5) < 0.12) continue;
        const [x, y] = P(gx + 0.08 + u * 0.84, gy + 0.08 + v * 0.84);
        circle(x, y - 1, 1.3, ['#ff006e', '#ffbe0b', '#ffffff', '#c77dff'][i % 4]);
      }
      treeAt(gx + 0.22, gy + 0.22, 0.6, o.seed);
      treeAt(gx + 0.78, gy + 0.25, 0.55, o.seed + 0.3);
      // bench
      const [bx, by] = P(gx + 0.25, gy + 0.78);
      ctx.fillStyle = '#9c6644'; ctx.fillRect(bx - 4, by - 4, 8, 2); ctx.fillRect(bx - 4, by - 7, 8, 1.5);
      // visitors
      const visitors = b && b._visitors ? b._visitors : 2;
      for (let i = 0; i < visitors; i++) {
        const a = animT * 0.3 + i * 2.1 + o.seed * 7;
        const u = 0.5 + Math.cos(a) * 0.32, v = 0.5 + Math.sin(a * 1.3) * 0.32;
        const [px, py] = P(gx + u, gy + v);
        person(px, py, ['#e76f51', '#457b9d', '#ffb703', '#8338ec', '#2a9d8f'][i % 5], animT * 8 + i);
      }
      if (b && b.level >= 2) treeAt(gx + 0.78, gy + 0.8, 0.5, o.seed + 0.6);
    },
    tree(gx, gy, b, o) { if (o.seed < 0.4) pineAt(gx + 0.5, gy + 0.5, 1, o.seed); else treeAt(gx + 0.5, gy + 0.5, 1, o.seed); },
    streetlight(gx, gy, b, o) {
      const [x, y] = P(gx + 0.5, gy + 0.5);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#343a40'; ctx.fillRect(x - 1, y - 26, 2, 26);
      ctx.fillRect(x - 1, y - 26, 7, 1.6);
      const on = night > 0.15;
      circle(x + 6, y - 24, 2.3, on ? '#fff3b0' : '#dee2e6');
      if (on) { lightGlow(x + 6, y - 22, 26, `rgba(255,236,150,${0.55 * Math.min(1, night * 1.5)})`); lightGlow(x + 6, y - 24, 6, 'rgba(255,250,210,1)'); }
      // flower pot
      circle(x - 3, y - 1, 1.5, '#ff8fab');
    },
    police(gx, gy, b, o) {
      const h = 20 + (o.lvl - 1) * 5;
      const f = prism(gx + 0.12, gy + 0.12, gx + 0.88, gy + 0.88, 0, h, '#e7ecef');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0, 0.55, 1, 0.7, '#1d3557');
      windows(A, 3, 1, { v0: 0.1, v1: 0.48, color: '#a8dadc', seed: 2 });
      quad(Bs, 0.35, 0, 0.65, 0.5, '#457b9d');
      windows(Bs, 2, 1, { v0: 0.75, v1: 0.95, color: '#a8dadc', seed: 3 });
      prism(gx + 0.1, gy + 0.1, gx + 0.9, gy + 0.9, h, h + 2, '#1d3557');
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 2);
      sign(x, y - 2, 'POLICE', '#1d3557', '#ffffff', 6);
      const phase = Math.floor(animT * 4) % 2;
      circle(x - 4, y - 11, 1.8, phase ? '#e63946' : '#6a040f');
      circle(x + 4, y - 11, 1.8, phase ? '#03045e' : '#4361ee');
      lightGlow(phase ? x - 4 : x + 4, y - 11, 7, phase ? 'rgba(230,57,70,0.8)' : 'rgba(67,97,238,0.8)');
      // patrol car
      const [cx, cy] = P(gx + 0.95, gy + 0.45, 0);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 5, cy - 4, 10, 4); ctx.fillStyle = '#1d3557'; ctx.fillRect(cx - 3, cy - 6.5, 6, 2.5);
    },
    fire(gx, gy, b, o) {
      const h = 20 + (o.lvl - 1) * 4;
      const f = prism(gx + 0.1, gy + 0.12, gx + 0.9, gy + 0.88, 0, h, '#d62828');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      quad(A, 0.08, 0, 0.45, 0.6, '#f1faee'); quad(A, 0.55, 0, 0.92, 0.6, '#f1faee');
      for (let i = 0; i < 4; i++) { quad(A, 0.08, i * 0.15, 0.45, i * 0.15 + 0.03, '#adb5bd'); quad(A, 0.55, i * 0.15, 0.92, i * 0.15 + 0.03, '#adb5bd'); }
      windows(Bs, 2, 1, { v0: 0.35, v1: 0.75, color: '#ffe5d9', seed: 7 });
      prism(gx + 0.08, gy + 0.1, gx + 0.92, gy + 0.9, h, h + 2, '#9d0208');
      const t = prism(gx + 0.62, gy + 0.18, gx + 0.82, gy + 0.38, h + 2, h + 14, '#d62828');
      quad(t.L, 0.25, 0.5, 0.75, 0.85, '#ffba08');
      hipRoof(gx + 0.6, gy + 0.16, gx + 0.84, gy + 0.4, h + 14, 6, '#370617');
    },
    hospital(gx, gy, b, o) {
      const h = 30 + (o.lvl - 1) * 6;
      const f = prism(gx + 0.1, gy + 0.1, gx + 0.9, gy + 0.9, 0, h, '#f8f9fa');
      const [A, Bs] = o.rot ? [f.R, f.L] : [f.L, f.R];
      windows(A, 4, 3, { color: '#a2d2ff', seed: 5, v0: 0.2 });
      windows(Bs, 4, 3, { color: '#90bde6', seed: 6, v0: 0.2 });
      quad(A, 0.38, 0, 0.62, 0.2, '#e63946');
      prism(gx + 0.1, gy + 0.1, gx + 0.9, gy + 0.9, h, h + 1, '#dee2e6');
      // red cross on roof
      poly([P(gx + 0.42, gy + 0.25, h + 1), P(gx + 0.58, gy + 0.25, h + 1), P(gx + 0.58, gy + 0.75, h + 1), P(gx + 0.42, gy + 0.75, h + 1)], '#e63946');
      poly([P(gx + 0.25, gy + 0.42, h + 1), P(gx + 0.75, gy + 0.42, h + 1), P(gx + 0.75, gy + 0.58, h + 1), P(gx + 0.25, gy + 0.58, h + 1)], '#e63946');
    },
  };
  /* Approximate visual height (for click hit-testing and icons). */
  const HEIGHTS = {};
  function heightOf(type, lvl) {
    if (HEIGHTS[type]) return typeof HEIGHTS[type] === 'function' ? HEIGHTS[type](lvl || 1) : HEIGHTS[type];
    switch (type) {
      case 'house': return 23 + (Math.min(lvl, 4) - 1) * 9;
      case 'apartment': return 37 + lvl * 6;
      case 'condo': return 56 + lvl * 9;
      case 'office': return 32 + lvl * 8;
      case 'skyscraper': return 98 + lvl * 12;
      case 'hotel': return 52 + lvl * 7;
      case 'factory': return 44 + lvl * 3;
      case 'landmark': return 110;
      case 'ecofactory': return 60;
      case 'hospital': return 34;
      case 'streetlight': return 28;
      case 'tree': return 30;
      case 'road': return 2;
      case 'park': return 20;
      default: return 32;
    }
  }

  /* ---------- Ground ---------- */
  const RES_TINT = { fertile: '#b5c99a', ore: '#b8a9b5', scenic: '#a9def9' };
  /* The ground (tiles, roads, map edge) rarely changes, so it is drawn once
     into an offscreen canvas and reused until the city changes. */
  let groundCache = null;
  function drawGround(S, v) {
    const n = S.size, scale = Math.min(2, Render.cam.zoom * Render.dpr);
    const sb = Math.round(scale * 4) / 4;
    const key = (v.R ? v.R._id : 0) + ':' + sb + ':' + S.chunks.join('') + ':' + (v.grid ? 1 : 0);
    const x0 = -n * HW - 4, y0 = -4, w = n * HW * 2 + 8, h = n * HH * 2 + 32;
    if (!groundCache || groundCache.key !== key) {
      const cv = groundCache && groundCache.cv.width === Math.ceil(w * sb) ? groundCache.cv : document.createElement('canvas');
      cv.width = Math.ceil(w * sb); cv.height = Math.ceil(h * sb);
      const prev = ctx;
      ctx = cv.getContext('2d');
      ctx.setTransform(sb, 0, 0, sb, -x0 * sb, -y0 * sb);
      ctx.clearRect(x0, y0, w, h);
      drawGroundStatic(S, v);
      ctx = prev;
      groundCache = { key, cv };
    }
    ctx.drawImage(groundCache.cv, x0, y0, w, h);
    // animated water sparkles
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < n * n; i++) {
      if (!S.tiles[i].water) continue;
      const x = i % n, y = (i / n) | 0, hh = hash(x * 31 + y * 17);
      for (let k = 0; k < 2; k++) {
        const u = (animT * 0.25 + hh + k * 0.5) % 1, sx = x + 0.25 + k * 0.45;
        const a0 = P(sx, y + u), a1 = P(sx, y + Math.min(1, u + 0.18));
        ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]);
      }
    }
    ctx.stroke();
    for (let i = 0; i < n * n; i++) {
      if (S.tiles[i].f !== 'pond') continue;
      const x = i % n, y = (i / n) | 0, hh = hash(x * 928371 + y * 1237);
      const [cx, cy] = P(x + 0.5, y + 0.5);
      if (Math.sin(animT * 2 + hh * 20) > 0.85) circle(cx + (hh - 0.5) * 10, cy, 1.1, '#ffffff');
    }
    drawChunks(S, v);
  }
  function drawGroundStatic(S, v) {
    const n = S.size, R = v.R;
    for (let s = 0; s < 2 * n - 1; s++) {
      for (let x = Math.max(0, s - n + 1); x <= Math.min(n - 1, s); x++) {
        const y = s - x, t = S.tiles[y * n + x];
        const owned = G().isOwned(S, x, y);
        const h = hash(x * 928371 + y * 1237);
        let col;
        if (t.water) {
          const dirt = R && R.riverPol ? Math.min(1, R.riverPol[y * n + x] / 60) : 0;
          const L = (p, q, k) => p.map((v0, j) => v0 + (q[j] - v0) * k);
          let w = L([63, 167, 214], [95, 195, 228], 0.3 + 0.3 * h);
          w = L(w, [122, 127, 58], dirt * 0.8);
          if (!owned) w = L(w, [47, 127, 158], 0.25);
          col = `rgb(${w.map(Math.round).join(',')})`;
        } else if (t.f === 'pond') col = mix('#48cae4', '#90e0ef', 0.3 + 0.3 * h);
        else if (owned) col = mix('#8fd16f', '#7cc45f', h);
        else col = mix('#6f9e62', '#668f59', h);
        const pts = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
        poly(pts, col);
        if (t.water) {
          // sandy banks where water meets land
          const land = (dx, dy) => { const o = G().tile(S, x + dx, y + dy); return o && !o.water && o.f !== 'pond'; };
          const bank = '#e9d8a6';
          if (land(0, -1)) poly([P(x, y), P(x + 1, y), P(x + 1, y + 0.1), P(x, y + 0.1)], bank);
          if (land(-1, 0)) poly([P(x, y), P(x + 0.1, y), P(x + 0.1, y + 1), P(x, y + 1)], bank);
          if (land(0, 1)) poly([P(x, y + 0.9), P(x + 1, y + 0.9), P(x + 1, y + 1), P(x, y + 1)], bank);
          if (land(1, 0)) poly([P(x + 0.9, y), P(x + 1, y), P(x + 1, y + 1), P(x + 0.9, y + 1)], bank);
        }
        if (t.r && t.f !== 'pond' && !t.water) {
          poly([P(x + 0.15, y + 0.15), P(x + 0.85, y + 0.15), P(x + 0.85, y + 0.85), P(x + 0.15, y + 0.85)], RES_TINT[t.r] + (owned ? '' : '99'));
          const [cx, cy] = P(x + 0.5, y + 0.5);
          if (!t.b) { ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TE.RESOURCES[t.r].icon, cx, cy); }
        }
        if (owned && v.grid && !t.water) poly(pts, null, 'rgba(255,255,255,0.08)', 0.5);
      }
    }
    // Map slab edges (floating island look)
    const a = P(0, n), b = P(n, n), c = P(n, 0), d = 22;
    poly([a, b, [b[0], b[1] + d], [a[0], a[1] + d]], '#8a6a4f');
    poly([b, c, [c[0], c[1] + d], [b[0], b[1] + d]], '#6d5139');
    poly([a, b, [b[0], b[1] + 5], [a[0], a[1] + 5]], '#5f8d4e');
    poly([b, c, [c[0], c[1] + 5], [b[0], b[1] + 5]], '#4f7a40');
    // river mouth waterfall on the slab edge
    (S.river || []).forEach((i) => { const x = i % n, y = (i / n) | 0; if (y === n - 1) poly([P(x, n), P(x + 1, n), [P(x + 1, n)[0], P(x + 1, n)[1] + d], [P(x, n)[0], P(x, n)[1] + d]], '#48a9d6'); });
    // Roads and paths
    G().eachBuilding(S, (bd) => { if (GROUND_ROADS[bd.type]) drawRoad(S, bd, v); });
  }
  const GROUND_ROADS = { road: 1, avenue: 1, bikelane: 1, roundabout: 1, path: 1 };
  function isRoad(S, x, y) { const b = G().buildingAt(S, x, y); return b && G().isCarRoad(b.type); }
  function isPath(S, x, y) { const b = G().buildingAt(S, x, y); return b && G().isWalkway(b.type); }
  function drawRoad(S, b, v) {
    const x = b.x, y = b.y;
    if (b.type === 'path') {
      const nE = isPath(S, x + 1, y), nW = isPath(S, x - 1, y), nS = isPath(S, x, y + 1), nN = isPath(S, x, y - 1);
      const gravel = '#d9c9a3';
      poly([P(x + 0.32, y + 0.32), P(x + 0.68, y + 0.32), P(x + 0.68, y + 0.68), P(x + 0.32, y + 0.68)], gravel);
      if (nE) poly([P(x + 0.68, y + 0.32), P(x + 1, y + 0.32), P(x + 1, y + 0.68), P(x + 0.68, y + 0.68)], gravel);
      if (nW) poly([P(x, y + 0.32), P(x + 0.32, y + 0.32), P(x + 0.32, y + 0.68), P(x, y + 0.68)], gravel);
      if (nS) poly([P(x + 0.32, y + 0.68), P(x + 0.68, y + 0.68), P(x + 0.68, y + 1), P(x + 0.32, y + 1)], gravel);
      if (nN) poly([P(x + 0.32, y), P(x + 0.68, y), P(x + 0.68, y + 0.32), P(x + 0.32, y + 0.32)], gravel);
      for (let k = 0; k < 4; k++) { const [sx, sy] = P(x + 0.35 + hash(b.uid * 7 + k) * 0.3, y + 0.35 + hash(b.uid * 11 + k) * 0.3); circle(sx, sy, 1.1, '#b5a27a'); }
      return;
    }
    const conn = !v.R || v.R.roadConn[y * S.size + x];
    const asphalt = conn ? '#4a4e69' : '#6b6b78';
    const avenue = b.type === 'avenue', m = avenue ? 0.03 : 0.1;
    poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], '#d6d6d6');
    poly([P(x + m, y + m), P(x + 1 - m, y + m), P(x + 1 - m, y + 1 - m), P(x + m, y + 1 - m)], asphalt);
    const nE = isRoad(S, x + 1, y), nW = isRoad(S, x - 1, y), nS = isRoad(S, x, y + 1), nN = isRoad(S, x, y - 1);
    if (nE) poly([P(x + 1 - m, y + m), P(x + 1, y + m), P(x + 1, y + 1 - m), P(x + 1 - m, y + 1 - m)], asphalt);
    if (nW) poly([P(x, y + m), P(x + m, y + m), P(x + m, y + 1 - m), P(x, y + 1 - m)], asphalt);
    if (nS) poly([P(x + m, y + 1 - m), P(x + 1 - m, y + 1 - m), P(x + 1 - m, y + 1), P(x + m, y + 1)], asphalt);
    if (nN) poly([P(x + m, y), P(x + 1 - m, y), P(x + 1 - m, y + m), P(x + m, y + m)], asphalt);
    const alongX = (nE || nW) && !(nN || nS), alongY = (nN || nS) && !(nE || nW);
    if (b.type === 'roundabout') {
      const [cx, cy] = P(x + 0.5, y + 0.5);
      ctx.beginPath(); ctx.ellipse(cx, cy, 18, 9, 0, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 5, 0, 0, Math.PI * 2); ctx.fillStyle = '#74c69d'; ctx.fill(); ctx.strokeStyle = '#f8f9fa'; ctx.lineWidth = 1.2; ctx.stroke();
      circle(cx - 2, cy - 1, 1.5, '#ff006e'); circle(cx + 3, cy, 1.5, '#ffbe0b');
      return;
    }
    if (avenue) {
      // planted median along the road direction
      if (!alongY) poly([P(x, y + 0.45), P(x + 1, y + 0.45), P(x + 1, y + 0.55), P(x, y + 0.55)], '#74c69d');
      if (alongY) poly([P(x + 0.45, y), P(x + 0.55, y), P(x + 0.55, y + 1), P(x + 0.45, y + 1)], '#74c69d');
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.7; ctx.setLineDash([2.5, 3]);
      ctx.beginPath();
      [0.25, 0.75].forEach((q) => {
        if (!alongY) { const p0 = P(x, y + q), p1 = P(x + 1, y + q); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
        if (alongY) { const p0 = P(x + q, y), p1 = P(x + q, y + 1); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
      });
      ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    if (b.type === 'bikelane') {
      const g = '#2a9d8f';
      if (!alongY) poly([P(x, y + 0.78), P(x + 1, y + 0.78), P(x + 1, y + 0.9), P(x, y + 0.9)], g);
      if (alongY) poly([P(x + 0.78, y), P(x + 0.9, y), P(x + 0.9, y + 1), P(x + 0.78, y + 1)], g);
    }
    ctx.strokeStyle = 'rgba(255,230,120,0.85)'; ctx.lineWidth = 0.9; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const c = P(x + 0.5, y + 0.5);
    if (nE || nW) { const p0 = P(x + (nW ? 0 : 0.5), y + 0.5), p1 = P(x + (nE ? 1 : 0.5), y + 0.5); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
    if (nN || nS) { const p0 = P(x + 0.5, y + (nN ? 0 : 0.5)), p1 = P(x + 0.5, y + (nS ? 1 : 0.5)); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
    if (!nE && !nW && !nN && !nS) { ctx.moveTo(c[0] - 4, c[1]); ctx.lineTo(c[0] + 4, c[1]); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function drawChunks(S, v) {
    const cc = G().chunkCount(S), cs = TE.BALANCE.chunkSize;
    // Border around owned land
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let cy = 0; cy < cc; cy++) for (let cx = 0; cx < cc; cx++) {
      if (!S.chunks[cy * cc + cx]) continue;
      const own = (a, b) => a >= 0 && b >= 0 && a < cc && b < cc && S.chunks[b * cc + a];
      const x0 = cx * cs, y0 = cy * cs, x1 = x0 + cs, y1 = y0 + cs;
      const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
      if (!own(cx, cy - 1)) seg(P(x0, y0), P(x1, y0));
      if (!own(cx, cy + 1)) seg(P(x0, y1), P(x1, y1));
      if (!own(cx - 1, cy)) seg(P(x0, y0), P(x0, y1));
      if (!own(cx + 1, cy)) seg(P(x1, y0), P(x1, y1));
    }
    ctx.stroke(); ctx.setLineDash([]);
    // Purchasable chunks: price tags
    for (let cy = 0; cy < cc; cy++) for (let cx = 0; cx < cc; cx++) {
      if (S.chunks[cy * cc + cx]) continue;
      const st = G().chunkStatus(S, cx, cy);
      if (!st.ok && !st.funds && !st.capped) continue;
      const hov = v.hoverChunk && v.hoverChunk[0] === cx && v.hoverChunk[1] === cy;
      const x0 = cx * cs, y0 = cy * cs;
      if (hov || v.tool === 'expand') {
        poly([P(x0, y0), P(x0 + cs, y0), P(x0 + cs, y0 + cs), P(x0, y0 + cs)],
          st.ok ? (hov ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)') : 'rgba(0,0,0,0.12)', st.ok ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', 1.5);
      }
      if (v.tool === 'expand' || hov || v.zoom > 0.9) {
        const [x, y] = P(x0 + cs / 2, y0 + cs / 2);
        const txt = st.capped ? '🔒' : '🏷️ ' + TE.fmtMoney(st.cost || G().expansionCost(S));
        ctx.save(); ctx.translate(x, y); const sc = 1 / Math.max(1, Math.sqrt(Render.cam.zoom)); ctx.scale(sc, sc); ctx.translate(-x, -y);
        ctx.font = 'bold 11px system-ui, sans-serif';
        const w = ctx.measureText(txt).width + 12;
        ctx.fillStyle = st.ok ? 'rgba(255,255,255,0.92)' : 'rgba(40,40,60,0.55)';
        roundRect(x - w / 2, y - 10, w, 20, 10); ctx.fill();
        ctx.fillStyle = st.ok ? '#2b2d42' : '#f1f1f1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x, y + 1);
        ctx.restore();
      }
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------- Overlays ---------- */
  const needOv = (k) => (S, R, i, cache) => (cache.needs[i].active[k] ? cache.needs[i][k] / 100 : NaN);
  const OVERLAYS = {
    happiness: { name: 'Happiness', legend: ['Unhappy', 'Happy'], needs: true, get: (S, R, i, cache) => cache.needs[i].happiness / 100 },
    safety: { name: 'Safety', legend: ['Unsafe', 'Safe'], needs: true, get: needOv('safety') },
    health: { name: 'Healthcare', legend: ['No hospital', 'Well served'], needs: true, get: needOv('health') },
    education: { name: 'Education', legend: ['No school', 'Well served'], needs: true, get: needOv('education') },
    pollution: { name: 'Pollution (air & river)', legend: ['Polluted', 'Clean'], water: true,
      get: (S, R, i) => (S.tiles[i].water ? 1 - R.riverPol[i] / 50 : 1 - R.f.pollution[i] / 60) },
    noise: { name: 'Noise', legend: ['Loud', 'Quiet'], get: (S, R, i) => 1 - R.f.noise[i] / 30 },
    traffic: { name: 'Traffic', legend: ['Jammed', 'Flowing'], roads: true,
      get: (S, R, i) => (R.roadCap[i] ? 1 - R.cong[i] / 1.3 : NaN) },
    parking: { name: 'Parking', legend: ['Shortage', 'Plenty'],
      get: (S, R, i) => { const t = S.tiles[i]; if (!t.b) return NaN; const p = R.parking[t.b]; if (p) return p.ratio; const l = R.lots[t.b]; return l ? 1 - l.used / l.cap * 0.6 : NaN; } },
    transit: { name: 'Public transport', legend: ['Car only', 'Bus + train'], get: (S, R, i) => R.transit[i] || 0 },
    services: { name: 'Emergency coverage', legend: ['No services', 'Police + Fire + Hospital'],
      get: (S, R, i) => ((R.f.police[i] > 0) + (R.f.fire[i] > 0) + (R.f.hospital[i] > 0)) / 3 },
    flood: { name: 'Flood risk', legend: ['Unprotected', 'Protected'],
      get: (S, R, i) => (R.floodZone && R.floodZone[i] ? (R.floodSafe[i] ? 1 : 0) : NaN) },
    districts: { name: 'Districts', legend: [], custom: true },
    quality: { name: 'Neighborhood quality', legend: ['Poor', 'Excellent'], homesOnly: true,
      get: (S, R, i) => { const t = S.tiles[i]; const info = t.b && R.b[t.b]; return info && info.quality != null ? info.quality / 100 : NaN; } },
  };
  let overlayCache = { R: null, needs: null };
  function overlayNeeds(S, R) {
    if (overlayCache.R === R) return overlayCache;
    const N = S.size * S.size, needs = new Array(N);
    for (let i = 0; i < N; i++) needs[i] = TE.Citizens.needsAt(S, R, i);
    overlayCache = { R, needs };
    return overlayCache;
  }
  function drawOverlay(S, v) {
    const ov = OVERLAYS[v.overlay]; if (!ov || !v.R) return;
    const cache = ov.needs ? overlayNeeds(S, v.R) : null;
    const n = S.size;
    if (ov.custom) { drawDistricts(S, v); return; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!G().isOwned(S, x, y)) continue;
      const i = y * n + x;
      const val = ov.get(S, v.R, i, cache);
      if (isNaN(val)) {
        if (ov.roads && !S.tiles[i].water) { ctx.globalAlpha = 0.3; poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], '#2b2d42'); ctx.globalAlpha = 1; }
        continue;
      }
      ctx.globalAlpha = ov.roads ? 0.85 : 0.55;
      poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], heat(val));
      ctx.globalAlpha = 1;
    }
    if (v.overlay === 'quality') v.R.neighborhoods.forEach((nb) => {
      const [x, y] = P(nb.cx + 0.5, nb.cy + 0.5, 50);
      const txt = `${nb.name} · ${Math.round(nb.quality)}`;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = 'rgba(20,24,40,0.8)'; roundRect(x - w / 2, y - 10, w, 20, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1);
    });
  }
  function drawDistricts(S, v) {
    const cs = TE.BALANCE.chunkSize;
    (v.R.districts || []).forEach((d) => {
      if (!d.type || !S.chunks[d.cy * G().chunkCount(S) + d.cx]) return;
      const D = TE.DISTRICTS[d.type], x0 = d.cx * cs, y0 = d.cy * cs;
      ctx.globalAlpha = 0.35;
      poly([P(x0, y0), P(x0 + cs, y0), P(x0 + cs, y0 + cs), P(x0, y0 + cs)], D.color, '#ffffff', 1.5);
      ctx.globalAlpha = 1;
      const [x, y] = P(x0 + cs / 2, y0 + cs / 2, 40);
      const txt = D.icon + ' ' + D.name;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = 'rgba(20,24,40,0.82)'; roundRect(x - w / 2, y - 10, w, 20, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1);
    });
  }
  function drawCoverage(S, cov) {
    // cov = { x, y, radius, color, square } or { tiles: Map(index -> distance), radius, color }
    const n = S.size;
    if (cov.tiles) {
      cov.tiles.forEach((d, i) => {
        const xx = i % n, yy = (i / n) | 0;
        ctx.globalAlpha = 0.18 + 0.25 * (1 - d / (cov.radius + 1));
        poly([P(xx, yy), P(xx + 1, yy), P(xx + 1, yy + 1), P(xx, yy + 1)], cov.color);
      });
      ctx.globalAlpha = 1;
      return;
    }
    const r = Math.ceil(cov.radius);
    for (let yy = cov.y - r; yy <= cov.y + r; yy++) for (let xx = cov.x - r; xx <= cov.x + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
      const d = cov.square ? Math.max(Math.abs(xx - cov.x), Math.abs(yy - cov.y)) : Math.hypot(xx - cov.x, yy - cov.y);
      if (d > cov.radius + (cov.square ? 0 : 0.5)) continue;
      const a = 0.18 + 0.25 * (1 - d / (cov.radius + 1));
      ctx.globalAlpha = a;
      poly([P(xx, yy), P(xx + 1, yy), P(xx + 1, yy + 1), P(xx, yy + 1)], cov.color);
    }
    ctx.globalAlpha = 1;
  }
  function drawHotspots(S, hs) {
    const n = S.size;
    for (let i = 0; i < n * n; i++) {
      const v = hs.score[i];
      if (isNaN(v)) continue;
      const x = i % n, y = (i / n) | 0;
      if (v > 0.02) { ctx.globalAlpha = Math.min(0.55, 0.1 + v * 0.6); poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], '#b9fbc0'); }
      else if (v < -0.02) { ctx.globalAlpha = Math.min(0.5, 0.1 - v * 0.6); poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], '#ff8fa3'); }
      ctx.globalAlpha = 1;
      if (hs.combo[i]) {
        const [cx, cy] = P(x + 0.5, y + 0.5);
        const s = 1 + Math.sin(animT * 4 + i) * 0.2;
        ctx.font = `${Math.round(11 * s)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(hs.combo[i] === 2 ? '✨' : '⭐', cx, cy);
      }
    }
  }

  /* ---------- Agents: cars, buses, bikes, pedestrians and boats ----------
     Vehicles wander the network; busy streets attract more of them and jams slow them down. */
  const agents = { cars: [], buses: [], bikes: [], peds: [], boats: [] };
  const CAR_COLORS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#ffffff', '#ffb703', '#8338ec', '#264653'];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function netNeighbors(S, net, x, y) {
    const out = [];
    DIRS.forEach(([dx, dy], k) => { const nx = x + dx, ny = y + dy; if (G().inBounds(S, nx, ny) && net[ny * S.size + nx]) out.push(k); });
    return out;
  }
  function updateAgents(S, R, dt) {
    if (!R || !R.road) return;
    const n = S.size, roads = [], walks = [], bikes = [], water = [];
    for (let i = 0; i < R.road.length; i++) {
      if (R.roadConn[i]) roads.push(i);
      if (R.walk[i]) walks.push(i);
      if (S.tiles[i].water) water.push(i);
    }
    let busStops = 0, marinas = 0;
    G().eachBuilding(S, (b) => { if (b.type === 'bikelane') bikes.push(b.y * n + b.x); if (b.type === 'busstop') busStops++; if (b.type === 'marina') marinas++; });
    const pop = (R.totals && R.totals.population) || 0;
    const ts = R.trafficStats || { trips: 0, removed: 0 };
    const want = {
      cars: Math.min(70, Math.floor(roads.length / 4 + (ts.trips - ts.removed) / 4)),
      buses: Math.min(8, busStops),
      bikes: Math.min(14, Math.floor(bikes.length / 2)),
      peds: Math.min(70, Math.floor(pop / 4) + 2),
      boats: water.length ? Math.min(6, 1 + marinas * 2) : 0,
    };
    const pools = { cars: roads, buses: roads, bikes: bikes.length ? bikes : roads, peds: walks, boats: water };
    const nets = { cars: R.road, buses: R.road, bikes: R.road, peds: R.walk, boats: null };
    const speeds = { cars: 1.1, buses: 0.7, bikes: 0.55, peds: 0.35, boats: 0.25 };
    const isWater = (x, y) => G().inBounds(S, x, y) && S.tiles[y * n + x].water;
    Object.keys(want).forEach((kind) => {
      const list = agents[kind], pool = pools[kind];
      while (list.length < want[kind] && pool.length) {
        const i = pool[Math.floor(Math.random() * pool.length)], x = i % n, y = (i / n) | 0;
        const nbr = kind === 'boats' ? DIRS.map((d, k) => k).filter((k) => isWater(x + DIRS[k][0], y + DIRS[k][1])) : netNeighbors(S, nets[kind], x, y);
        if (!nbr.length) break;
        list.push({ x, y, dir: nbr[Math.floor(Math.random() * nbr.length)], t: Math.random(), speed: speeds[kind] * (0.7 + Math.random() * 0.6),
          color: kind === 'buses' ? '#ffb703' : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], side: Math.random() < 0.5 ? 1 : -1, seed: Math.random() });
      }
      if (list.length > want[kind]) list.length = want[kind];
      list.forEach((a) => {
        const cong = kind === 'peds' || kind === 'boats' ? 0 : (R.cong[a.y * n + a.x] || 0);
        a.t += a.speed * dt / (1 + Math.max(0, cong - 0.6) * 2.5);
        while (a.t >= 1) {
          a.t -= 1;
          a.x += DIRS[a.dir][0]; a.y += DIRS[a.dir][1];
          let opts;
          if (kind === 'boats') { if (!isWater(a.x, a.y)) { a.dead = true; return; } opts = DIRS.map((d, k) => k).filter((k) => isWater(a.x + DIRS[k][0], a.y + DIRS[k][1])); }
          else { if (!nets[kind][a.y * n + a.x]) { a.dead = true; return; } opts = netNeighbors(S, nets[kind], a.x, a.y); }
          if (!opts.length) { a.dead = true; return; }
          const back = a.dir ^ 1, fw = opts.filter((k) => k !== back);
          const choices = fw.length ? fw : [back];
          if (kind === 'cars' && choices.length > 1) { // prefer busy streets: that is where the trips are
            const w = choices.map((k) => 0.5 + (R.load[(a.y + DIRS[k][1]) * n + a.x + DIRS[k][0]] || 0));
            let r = Math.random() * w.reduce((p, q) => p + q, 0), pick = choices[0];
            for (let j = 0; j < choices.length; j++) { r -= w[j]; if (r <= 0) { pick = choices[j]; break; } }
            a.dir = pick;
          } else if (kind === 'bikes') {
            const bl = choices.filter((k) => { const b = G().buildingAt(S, a.x + DIRS[k][0], a.y + DIRS[k][1]); return b && b.type === 'bikelane'; });
            const c2 = bl.length && Math.random() < 0.8 ? bl : choices; a.dir = c2[Math.floor(Math.random() * c2.length)];
          } else a.dir = choices[Math.floor(Math.random() * choices.length)];
        }
      });
      agents[kind] = list.filter((a) => !a.dead);
    });
  }
  function agentPos(a, lane) {
    const d = DIRS[a.dir];
    const gx = a.x + 0.5 + d[0] * a.t, gy = a.y + 0.5 + d[1] * a.t;
    return [gx - d[1] * lane, gy + d[0] * lane];
  }
  function deckZ(S, gx, gy, kind) {
    const b = G().buildingAt(S, Math.floor(gx), Math.floor(gy));
    if (!b) return 0;
    if (b.type === 'bridge') return 10;
    if (b.type === 'footbridge' && kind === 'ped') return 10;
    return 0;
  }
  function drawVehicle(S, a, lane, len, wid, h, col, roof) {
    const [gx, gy] = agentPos(a, lane);
    const z = deckZ(S, gx, gy, 'car');
    const along = DIRS[a.dir][0] !== 0;
    const lx = along ? len : wid, ly = along ? wid : len;
    prism(gx - lx, gy - ly, gx + lx, gy + ly, z + 1, z + h, col, { outline: false });
    prism(gx - lx * (roof || 0.55), gy - ly * 0.85, gx + lx * (roof || 0.55), gy + ly * 0.85, z + h, z + h + 2.5, '#cfe8ff', { outline: false });
    if (night > 0.3) { const [x, y] = P(gx + DIRS[a.dir][0] * lx, gy + DIRS[a.dir][1] * ly, z + 3); lightGlow(x, y, 6, 'rgba(255,245,200,0.8)'); }
  }
  function drawCar(S, a) { drawVehicle(S, a, 0.17, 0.17, 0.09, 5, a.color); }
  function drawBus(S, a) {
    drawVehicle(S, a, 0.18, 0.32, 0.11, 9, '#ffb703', 0.9);
  }
  function drawBike(S, a) {
    const [gx, gy] = agentPos(a, 0.33);
    const z = deckZ(S, gx, gy, 'car');
    const [x, y] = P(gx, gy, z);
    ctx.strokeStyle = '#212529'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x - 2.2, y - 1.5, 1.5, 0, Math.PI * 2); ctx.arc(x + 2.2, y - 1.5, 1.5, 0, Math.PI * 2); ctx.stroke();
    person(x, y - 2.5, a.color, 0);
  }
  function drawPed(S, a) {
    const [gx, gy] = agentPos(a, 0.4 * a.side);
    const [x, y] = P(gx, gy, deckZ(S, gx, gy, 'ped'));
    person(x, y, a.color, animT * 9 + a.seed * 10);
  }
  function drawBoat(S, a) {
    const [gx, gy] = agentPos(a, 0.15 * a.side);
    const [x, y] = P(gx, gy, 1);
    const bob = Math.sin(animT * 2 + a.seed * 8) * 0.8;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y + bob, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a.seed < 0.5 ? '#e63946' : '#1d3557'; ctx.fillRect(x - 3, y - 3 + bob, 5, 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 6, y + 2); ctx.lineTo(x - 11, y + 3); ctx.stroke();
  }

  /* ---------- Particles & floating text ---------- */
  let particles = [];
  function addParticle(p) { if (particles.length < 400) particles.push(Object.assign({ age: 0, vx: 0, vy: 0, size: 3 }, p)); }
  function updateParticles(dt) {
    particles.forEach((p) => {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'smoke') { p.size += dt * 3; p.vx += dt * 2; }
      if (p.kind === 'spark') p.vy += 40 * dt;
    });
    particles = particles.filter((p) => p.age < p.life);
  }
  function drawParticles(after) {
    particles.forEach((p) => {
      const k = p.age / p.life;
      if ((p.kind === 'text' || p.kind === 'icon') !== after) return;
      if (p.kind === 'smoke') {
        ctx.globalAlpha = (1 - k) * (p.alpha || 0.45);
        circle(p.x, p.y, p.size, p.color || '#dee2e6');
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = 1 - k;
        circle(p.x, p.y, p.size * (1 - k * 0.5), p.color);
      } else if (p.kind === 'flame') {
        ctx.globalAlpha = 1 - k;
        circle(p.x, p.y, p.size * (1 - k), k < 0.4 ? '#ffba08' : '#e85d04');
      } else if (p.kind === 'text') {
        ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) / 0.25;
        ctx.font = `bold ${p.size || 11}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color || '#ffd60a'; ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === 'icon') {
        ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) / 0.25;
        ctx.font = `${p.size || 14}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.text, p.x, p.y);
      }
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- Main renderer ---------- */
  const Render = {
    HW, HH, P, OVERLAYS, heightOf, DRAW, HEIGHTS,
    /* Drawing kit shared with render-city.js (the newer buildings). */
    kit: { P, poly, prism, quad, windows, hipRoof, gableRoof, cylinder, circle, treeAt, pineAt, person, sign, awning, lightGlow, shade, mix, hash, heat,
      roundRect: (x, y, w, h, r) => roundRect(x, y, w, h, r), ctx: () => ctx, night: () => night, t: () => animT },
    canvas: null, cam: { x: 0, y: 380, zoom: 1.1 }, W: 0, H: 0, dpr: 1,
    init(canvas) {
      Render.canvas = canvas;
      ctx = canvas.getContext('2d');
      Render.resize();
    },
    resize() {
      const c = Render.canvas, r = c.getBoundingClientRect();
      Render.dpr = Math.min(2, window.devicePixelRatio || 1);
      Render.W = r.width; Render.H = r.height;
      c.width = Math.round(r.width * Render.dpr); c.height = Math.round(r.height * Render.dpr);
    },
    worldToScreen(wx, wy) {
      const c = Render.cam;
      return [(wx - c.x) * c.zoom + Render.W / 2, (wy - c.y) * c.zoom + Render.H / 2];
    },
    screenToWorld(sx, sy) {
      const c = Render.cam;
      return [(sx - Render.W / 2) / c.zoom + c.x, (sy - Render.H / 2) / c.zoom + c.y];
    },
    screenToTile(sx, sy) {
      const [wx, wy] = Render.screenToWorld(sx, sy);
      return [Math.floor((wx / HW + wy / HH) / 2), Math.floor((wy / HH - wx / HW) / 2)];
    },
    tileToScreen(gx, gy, z) { const [wx, wy] = P(gx, gy, z); return Render.worldToScreen(wx, wy); },
    /* Find the building drawn under the cursor (tall buildings cover tiles behind them). */
    pickBuilding(S, sx, sy) {
      const [wx, wy] = Render.screenToWorld(sx, sy);
      let best = null, bestDepth = -1;
      G().eachBuilding(S, (b) => {
        if (b.type === 'road') return;
        const [bx, by] = P(b.x + 0.5, b.y + 0.5);
        const h = heightOf(b.type, b.level);
        if (Math.abs(wx - bx) <= HW * 0.75 && wy <= by + HH * 0.8 && wy >= by - h - 4) {
          const d = b.x + b.y;
          if (d > bestDepth) { bestDepth = d; best = b; }
        }
      });
      return best;
    },
    centerOn(gx, gy) { const [wx, wy] = P(gx + 0.5, gy + 0.5); Render.cam.x = wx; Render.cam.y = wy - 20; },
    clampCam(S) {
      const n = S.size, c = Render.cam;
      c.x = Math.max(-n * HW, Math.min(n * HW, c.x));
      c.y = Math.max(-40, Math.min(n * HH * 2, c.y));
      c.zoom = Math.max(0.45, Math.min(2.6, c.zoom));
    },

    /* Effects triggered by the game */
    floatText(gx, gy, text, color, size, z) {
      const [x, y] = P(gx + 0.5, gy + 0.5, z == null ? 30 : z);
      addParticle({ kind: 'text', x, y, vy: -18, life: 1.8, text, color, size });
    },
    floatIcon(gx, gy, text, z) {
      const [x, y] = P(gx + 0.5, gy + 0.5, z == null ? 30 : z);
      addParticle({ kind: 'icon', x, y, vy: -14, life: 2, text, size: 15 });
    },
    burst(gx, gy, colors, n, z) {
      const [x, y] = P(gx + 0.5, gy + 0.5, z == null ? 20 : z);
      for (let i = 0; i < (n || 18); i++) {
        const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 60;
        addParticle({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.9 + Math.random() * 0.6, size: 2 + Math.random() * 2,
          color: colors[Math.floor(Math.random() * colors.length)] });
      }
    },
    dust(gx, gy) {
      for (let i = 0; i < 10; i++) {
        const [x, y] = P(gx + Math.random(), gy + Math.random(), 2);
        addParticle({ kind: 'smoke', x, y, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 10, life: 0.8, size: 3, color: '#d6ccc2', alpha: 0.7 });
      }
    },

    nightFactor(S) {
      if (S.settings.dayNight === false) return 0;
      const ph = (S.time % TE.BALANCE.dayLength) / TE.BALANCE.dayLength;
      // 0-0.6 day, 0.6-0.7 dusk, 0.7-0.92 night, 0.92-1 dawn
      if (ph < 0.6) return 0;
      if (ph < 0.7) return (ph - 0.6) / 0.1;
      if (ph < 0.92) return 1;
      return 1 - (ph - 0.92) / 0.08;
    },

    /* Draw one frame. v = view state from the UI. */
    draw(S, v, dt) {
      animT += dt;
      const R = S.R;
      v.R = R;
      night = Render.nightFactor(S);
      glow = [];
      updateAgents(S, R, dt * (v.paused ? 0 : Math.max(1, v.speed || 1)));
      updateParticles(dt);
      Render.spawnAmbient(S, R, dt, v);

      const c = Render.cam, dpr = Render.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, Render.H);
      g.addColorStop(0, night > 0.5 ? '#1b263b' : '#bde0fe'); g.addColorStop(1, night > 0.5 ? '#0d1b2a' : '#e0f2e9');
      ctx.fillStyle = g; ctx.fillRect(0, 0, Render.W, Render.H);
      // clouds
      if (night < 0.5) for (let i = 0; i < 4; i++) {
        const x = ((animT * (6 + i * 2) + i * 400) % (Render.W + 300)) - 150, y = 50 + i * 70;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        circle(x, y, 22, 'rgba(255,255,255,0.5)'); circle(x + 25, y + 5, 18, 'rgba(255,255,255,0.5)'); circle(x - 22, y + 6, 15, 'rgba(255,255,255,0.5)');
      }
      ctx.setTransform(dpr * c.zoom, 0, 0, dpr * c.zoom, dpr * (Render.W / 2 - c.x * c.zoom), dpr * (Render.H / 2 - c.y * c.zoom));
      v.zoom = c.zoom;
      drawGround(S, v);
      if (v.overlay) drawOverlay(S, v);
      if (v.hotspots && !v.overlay) drawHotspots(S, v.hotspots);
      if (v.coverage) v.coverage.forEach((cv) => drawCoverage(S, cv));
      // hover tile & selection outlines
      if (v.hover && G().inBounds(S, v.hover[0], v.hover[1]) && v.tool !== 'expand') {
        const [x, y] = v.hover;
        poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], v.ghostValid === false ? 'rgba(230,57,70,0.35)' : 'rgba(255,255,255,0.25)', v.ghostValid === false ? '#e63946' : '#ffffff', 1.5);
      }
      if (v.selected && S.buildings[v.selected]) {
        const b = S.buildings[v.selected], pulse = 0.6 + 0.4 * Math.sin(animT * 5);
        poly([P(b.x, b.y), P(b.x + 1, b.y), P(b.x + 1, b.y + 1), P(b.x, b.y + 1)], `rgba(255,214,10,${0.25 * pulse})`, '#ffd60a', 2);
      }
      if (v.highlight) v.highlight.forEach((h) => {
        poly([P(h.x, h.y), P(h.x + 1, h.y), P(h.x + 1, h.y + 1), P(h.x, h.y + 1)], h.color, null);
      });
      // Shadows
      ctx.fillStyle = 'rgba(30,50,30,0.16)';
      G().eachBuilding(S, (b) => {
        const h = heightOf(b.type, b.level);
        if (h < 12 || b.type === 'tree' || b.type === 'streetlight' || b.type === 'park') return;
        const s = Math.min(0.9, h / 90);
        poly([P(b.x + 0.85, b.y + 0.15), P(b.x + 0.85 + s, b.y + 0.15 - s * 0.3), P(b.x + 0.85 + s, b.y + 0.85 - s * 0.3), P(b.x + 0.85, b.y + 0.85)], 'rgba(30,50,30,0.14)');
      });
      // Depth-sorted objects
      const objs = [];
      G().eachBuilding(S, (b) => { if (!GROUND_ROADS[b.type]) objs.push({ d: b.x + b.y + 0.5, b }); });
      const n = S.size;
      for (let i = 0; i < n * n; i++) {
        const t = S.tiles[i];
        if (t.f === 'tree' || t.f === 'rock') objs.push({ d: (i % n) + ((i / n) | 0) + 0.5, f: t.f, x: i % n, y: (i / n) | 0 });
      }
      agents.cars.forEach((a) => { const [gx, gy] = agentPos(a, 0.17); objs.push({ d: gx + gy - 0.4 + deckZ(S, gx, gy, 'car') * 0.06, ag: a, draw: drawCar }); });
      agents.buses.forEach((a) => { const [gx, gy] = agentPos(a, 0.18); objs.push({ d: gx + gy - 0.4 + deckZ(S, gx, gy, 'car') * 0.06, ag: a, draw: drawBus }); });
      agents.bikes.forEach((a) => { const [gx, gy] = agentPos(a, 0.33); objs.push({ d: gx + gy - 0.4 + deckZ(S, gx, gy, 'car') * 0.06, ag: a, draw: drawBike }); });
      agents.peds.forEach((a) => { const [gx, gy] = agentPos(a, 0.4 * a.side); objs.push({ d: gx + gy - 0.4 + deckZ(S, gx, gy, 'ped') * 0.06, ag: a, draw: drawPed }); });
      agents.boats.forEach((a) => { const [gx, gy] = agentPos(a, 0.15 * a.side); objs.push({ d: gx + gy - 0.6, ag: a, draw: drawBoat }); });
      if (v.ghost) objs.push({ d: v.ghost.x + v.ghost.y + 0.5, ghost: v.ghost });
      objs.sort((a, b) => a.d - b.d);
      for (const o of objs) {
        if (o.b) {
          const b = o.b;
          if (v.moving === b.uid) continue;
          if (v.overlay) ctx.globalAlpha = 0.55;
          Render.drawBuilding(b.type, b.x, b.y, b, S);
          ctx.globalAlpha = 1;
        } else if (o.f === 'tree') {
          const h = hash(o.x * 31 + o.y * 17);
          if (h < 0.5) pineAt(o.x + 0.3 + h * 0.4, o.y + 0.5, 0.8, h); else treeAt(o.x + 0.4, o.y + 0.5, 0.75, h);
          if (h > 0.3) treeAt(o.x + 0.75, o.y + 0.2, 0.55, h * 0.7);
        } else if (o.f === 'rock') {
          const [x, y] = P(o.x + 0.5, o.y + 0.5);
          ctx.beginPath(); ctx.ellipse(x, y - 3, 9, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#9a8c98'; ctx.fill();
          ctx.beginPath(); ctx.ellipse(x - 2, y - 5, 5, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#c9ada7'; ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + 7, y, 4, 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#8a7b88'; ctx.fill();
        } else if (o.ag) o.draw(S, o.ag);
        else if (o.ghost) {
          ctx.globalAlpha = 0.72;
          Render.drawBuilding(o.ghost.type, o.ghost.x, o.ghost.y, o.ghost.b || null, S, o.ghost.rot);
          ctx.globalAlpha = 1;
          if (o.ghost.invalid) {
            const [x, y] = P(o.ghost.x + 0.5, o.ghost.y + 0.5, 20);
            ctx.font = '16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚫', x, y);
          }
        }
      }
      drawParticles(false);
      if (S.event && S.event.id === 'flood') Render.drawRain();
      // Night overlay + lights
      if (night > 0.01) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(16,24,64,${0.45 * night})`;
        ctx.fillRect(0, 0, Render.canvas.width, Render.canvas.height);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        glow.forEach((gw) => {
          if (gw.kind === 'poly') { ctx.globalAlpha = Math.min(1, night * 1.2) * 0.85; poly(gw.pts, gw.color); }
          else {
            ctx.globalAlpha = Math.min(1, night * 1.2);
            const rg = ctx.createRadialGradient(gw.x, gw.y, 0, gw.x, gw.y, gw.r);
            rg.addColorStop(0, gw.color); rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gw.x, gw.y, gw.r, 0, Math.PI * 2); ctx.fill();
          }
        });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      } else {
        // daytime: only strong lights (sirens) glow a little
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25;
        glow.forEach((gw) => { if (gw.kind === 'radial' && gw.r <= 8) { circle(gw.x, gw.y, gw.r * 0.5, gw.color); } });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      Render.drawIcons(S, v);
      drawParticles(true);
    },

    drawRain() {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(40,60,90,0.18)'; ctx.fillRect(0, 0, Render.canvas.width, Render.canvas.height);
      ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 140; k++) {
        const x = (hash(k * 13) * Render.canvas.width + animT * 60) % Render.canvas.width;
        const y = (hash(k * 7) * Render.canvas.height + animT * 700 * (0.6 + hash(k) * 0.6)) % Render.canvas.height;
        ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12);
      }
      ctx.stroke(); ctx.restore();
    },
    drawBuilding(type, gx, gy, b, S, rot) {
      const fn = DRAW[type]; if (!fn) return;
      const seed = b ? hash(b.uid * 7919 + 13) : 0.5;
      const lvl = b ? b.level : 1;
      fn(gx, gy, b, { seed, lvl, rot: b && b.uid > 0 ? (b.rot || 0) : (rot || 0) });
      if (b && b.damagedUntil && S && b.damagedUntil > S.time) {
        const [x, y] = P(gx + 0.5, gy + 0.5, heightOf(type, lvl) * 0.6);
        ctx.fillStyle = 'rgba(40,30,30,0.35)'; circle(x, y, 10, 'rgba(40,30,30,0.3)');
      }
      // Perk badges
      if (b && b.perks) {
        const ks = Object.keys(b.perks).filter((k) => b.perks[k]);
        if (ks.length && Render.cam.zoom > 0.8) {
          const [x, y] = P(gx + 0.1, gy + 0.9, 4);
          ks.forEach((k, i) => { ctx.font = '8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TE.PERKS[k].icon, x + i * 8, y); });
        }
      }
    },

    /* Floating icons above buildings: unmet needs, upgrades, fire, road access. */
    drawIcons(S, v) {
      const R = S.R; if (!R) return;
      const bob = Math.sin(animT * 3) * 2;
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type], info = R.b[b.uid]; if (!info) return;
        const h = heightOf(b.type, b.level);
        let icon = null, bubble = '#ffffff';
        if (b.damagedUntil > S.time) icon = b.damageKind === 'flood' ? '💧' : '🔥';
        else if (def.residents && S.settings.bubbles && info.needs) {
          if (b.neglected) icon = '🏚️';
          else {
            let worst = null, wv = 999;
            for (const k in TE.NEEDS) { if (info.needs.active[k] && info.needs[k] < TE.NEED_THRESHOLDS.ok && info.needs[k] < wv) { wv = info.needs[k]; worst = k; } }
            if (worst) { icon = TE.NEEDS[worst].icon; bubble = '#ffe5e5'; }
          }
        } else if (TE.ROAD_ACCESS[def.cat] && !info.connected) icon = '🚧';
        else if (R.parking && R.parking[b.uid] && R.parking[b.uid].ratio < 0.6 && S.settings.bubbles) icon = '🅿️';
        else if (R.power && R.power.short && def.power >= 2 && S.settings.bubbles) icon = '⚡';
        if (icon) {
          const [x, y] = P(b.x + 0.5, b.y + 0.5, h + 10 + bob);
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = bubble; ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
          poly([[x - 3, y + 6], [x + 3, y + 6], [x, y + 11]], bubble);
          ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, x, y + 0.5);
        }
        if (S.settings.arrows && !icon) {
          const cost = G().upgradeCost(S, b);
          if (cost != null && S.money >= cost && (def.income || def.residents || def.service) && b.type !== 'park') {
            const [x, y] = P(b.x + 0.85, b.y + 0.5, h + 2 + bob * 0.7);
            poly([[x - 4, y], [x + 4, y], [x, y - 6]], '#38b000', 'rgba(255,255,255,0.9)', 1);
            ctx.fillStyle = '#38b000'; ctx.fillRect(x - 1.5, y, 3, 3);
          }
        }
      });
    },

    /* Smoke, income coins, happy hearts, fire flames. */
    spawnAmbient(S, R, dt, v) {
      if (!R || v.paused) return;
      const sp = Math.max(1, v.speed || 1);
      let earners = 0;
      G().eachBuilding(S, (b) => { const info = R.b[b.uid]; if (info && info.income > 0.05) earners++; });
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type], info = R.b[b.uid];
        if (b.type === 'powerplant' && b._steam && Math.random() < dt * 4 * sp) {
          const [x, y] = b._steam;
          addParticle({ kind: 'smoke', x: x + (Math.random() - 0.5) * 12, y, vx: 3 + Math.random() * 3, vy: -12 - Math.random() * 6, life: 3.5, size: 6, color: '#f8f9fa', alpha: 0.55 });
        }
        if ((b.type === 'factory' || b.type === 'powerplant') && b._chimney && !(b.damagedUntil > S.time) && Math.random() < dt * 3 * sp) {
          const [x, y] = b._chimney;
          addParticle({ kind: 'smoke', x: x + (Math.random() - 0.5) * 3, y, vx: 4 + Math.random() * 4, vy: -14 - Math.random() * 6, life: 3, size: 3,
            color: b.perks.filters ? '#e9f5db' : '#ced4da', alpha: b.perks.filters ? 0.3 : 0.5 });
        }
        if (b.damagedUntil > S.time && b.damageKind === 'flood') {
          if (Math.random() < dt * 4) { const [x, y] = P(b.x + Math.random(), b.y + Math.random(), 1); addParticle({ kind: 'spark', x, y, vx: 0, vy: -20, life: 0.6, size: 2, color: '#90e0ef' }); }
        } else if (b.damagedUntil > S.time && Math.random() < dt * 8) {
          const [x, y] = P(b.x + 0.3 + Math.random() * 0.4, b.y + 0.3 + Math.random() * 0.4, heightOf(b.type, b.level) * 0.7);
          addParticle({ kind: 'flame', x, y, vy: -25, vx: (Math.random() - 0.5) * 8, life: 0.7, size: 4 });
          if (Math.random() < 0.3) addParticle({ kind: 'smoke', x, y: y - 6, vy: -18, vx: 3, life: 2.5, size: 4, color: '#495057', alpha: 0.6 });
        }
        // income coins (fewer per building in big cities so the map stays readable)
        if (S.settings.floaters && info && info.income > 0.05) {
          b._coinT = (b._coinT == null ? Math.random() * 6 : b._coinT) - dt * sp;
          if (b._coinT <= 0) {
            const period = 6 + Math.max(0, earners - 25) * 0.25;
            b._coinT = period * (0.8 + Math.random() * 0.4);
            const amt = info.income * period;
            if (particles.length < 160) Render.floatText(b.x, b.y, '+' + TE.fmtMoney(amt), '#ffd60a', 9 / Math.sqrt(Math.max(1, Render.cam.zoom)), heightOf(b.type, b.level) + 4);
          }
        }
        if (def.residents && info && info.quality >= 75 && Math.random() < dt * 0.08) Render.floatIcon(b.x, b.y, '💖', heightOf(b.type, b.level) + 6);
        if (b.type === 'park' && R.f && b._visR !== R._id) {
          b._visR = R._id;
          // visitors depend on nearby residents
          let pop = 0;
          for (let yy = b.y - 3; yy <= b.y + 3; yy++) for (let xx = b.x - 3; xx <= b.x + 3; xx++) { const nb = G().buildingAt(S, xx, yy); if (nb && nb.occ) pop += nb.occ; }
          b._visitors = Math.min(6, 1 + Math.floor(pop / 6));
        }
      });
    },

    /* Render a building into a small canvas (construction menu icons). */
    iconCanvas(type, size) {
      size = size || 64;
      const cv = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = size * dpr; cv.height = size * dpr;
      const prev = ctx, prevNight = night, prevGlow = glow;
      ctx = cv.getContext('2d'); night = 0; glow = [];
      const h = Math.min(120, heightOf(type, 1));
      const scale = Math.min(size / 70, (size * 0.9) / (h + 36));
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * size / 2, dpr * (size - 6 - 16 * scale));
      // little ground tile
      ctx.translate(0, -HH);
      poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], '#8fd16f');
      if (GROUND_ROADS[type]) {
        if (type === 'path') { poly([P(0.32, 0), P(0.68, 0), P(0.68, 1), P(0.32, 1)], '#d9c9a3'); }
        else {
          const m = type === 'avenue' ? 0.03 : 0.1;
          poly([P(0, m), P(1, m), P(1, 1 - m), P(0, 1 - m)], '#4a4e69');
          if (type === 'avenue') poly([P(0, 0.45), P(1, 0.45), P(1, 0.55), P(0, 0.55)], '#74c69d');
          if (type === 'bikelane') poly([P(0, 0.78), P(1, 0.78), P(1, 0.9), P(0, 0.9)], '#2a9d8f');
          if (type === 'roundabout') { const [cx, cy] = P(0.5, 0.5); ctx.beginPath(); ctx.ellipse(cx, cy, 10, 5, 0, 0, Math.PI * 2); ctx.fillStyle = '#74c69d'; ctx.fill(); }
          if (type !== 'avenue' && type !== 'roundabout') { ctx.strokeStyle = '#ffe066'; ctx.setLineDash([3, 3]); ctx.beginPath(); const a0 = P(0, 0.5), a1 = P(1, 0.5); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke(); ctx.setLineDash([]); }
        }
      } else if (DRAW[type] && TE.BUILDINGS[type] && TE.BUILDINGS[type].place === 'water') {
        poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], '#48a9d6');
        DRAW[type](0, 0, null, { seed: 0.3, lvl: 1, rot: 0 });
      } else DRAW[type] && DRAW[type](0, 0, null, { seed: 0.3, lvl: 1, rot: 0 });
      ctx = prev; night = prevNight; glow = prevGlow;
      return cv;
    },
  };
  TE.Render = Render;
})(window.TE = window.TE || {});
