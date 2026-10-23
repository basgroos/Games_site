// Procedurele textures (canvas). Geen externe afbeeldingen nodig.
import * as THREE from 'three';
import { mulberry32 } from './dsp.js';

const R = mulberry32(4242);
const r = (a = 0, b = 1) => a + (b - a) * R();

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Wolkachtige ruis door kleine random-canvassen vergroot te tekenen
function clouds(ctx, w, h, layers, color, alpha) {
  for (const s of layers) {
    const c = canvas(s, s); const x = c.getContext('2d');
    const id = x.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = R() * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0);
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 0, 0, w, h); ctx.restore();
  }
  if (color) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); ctx.restore(); }
}
function grain(ctx, w, h, amt) {
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(id, 0, 0);
}
function stains(ctx, w, h, n, col, rmin, rmax, a = 0.15) {
  for (let i = 0; i < n; i++) {
    const x = r(0, w), y = r(0, h), rad = r(rmin, rmax);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rad, rad * r(0.5, 1.2), r(0, 3), 0, Math.PI * 2); ctx.fill();
  }
}
function cracks(ctx, w, h, n, col = 'rgba(20,18,15,0.5)') {
  ctx.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    let x = r(0, w), y = r(0, h), a = r(0, Math.PI * 2);
    ctx.lineWidth = r(0.6, 1.6); ctx.beginPath(); ctx.moveTo(x, y);
    const L = r(10, 40);
    for (let k = 0; k < L; k++) { a += r(-0.6, 0.6); x += Math.cos(a) * 4; y += Math.sin(a) * 4; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}
function drips(ctx, w, y0, n, col) {
  for (let i = 0; i < n; i++) {
    const x = r(0, w), L = r(20, 140);
    const g = ctx.createLinearGradient(0, y0, 0, y0 + L);
    g.addColorStop(0, col.replace('A', 0.25)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.fillRect(x, y0, r(1, 4), L);
  }
}
function toBump(c) {
  const b = canvas(c.width, c.height), x = b.getContext('2d');
  x.filter = 'grayscale(1) contrast(1.3)'; x.drawImage(c, 0, 0);
  return b;
}
function tex(c, repeat = true, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function mat(c, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex(c), bumpMap: tex(toBump(c), true, false), bumpScale: o.bump ?? 1.2, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0 });
  return m;
}

// Muur: 512px = 2m breed, 768px = 3m hoog (v loopt over de hoogte)
function wallPaint(top, bottom, opts = {}) {
  const w = 512, h = 768, c = canvas(w, h), x = c.getContext('2d');
  const py = (m) => h - m / 3 * h;
  x.fillStyle = top; x.fillRect(0, 0, w, h);
  if (bottom) { x.fillStyle = bottom; x.fillRect(0, py(1.15), w, h); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, py(1.17), w, 5); x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, py(1.15) + 4, w, 2); }
  clouds(x, w, h, [8, 32, 128], null, 0.18);
  stains(x, w, h, 18, 'rgba(70,60,40,A)', 20, 90, 0.12);
  drips(x, w, 0, 25, 'rgba(60,50,30,A)');
  // vuil richting de vloer
  const g = x.createLinearGradient(0, py(0.6), 0, h); g.addColorStop(0, 'rgba(30,25,20,0)'); g.addColorStop(1, 'rgba(30,25,20,0.45)');
  x.fillStyle = g; x.fillRect(0, py(0.6), w, h);
  // plint
  x.fillStyle = opts.plint || '#2b2a28'; x.fillRect(0, py(0.1), w, h); x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, py(0.1), w, 2);
  // krassen / schoenstrepen
  x.strokeStyle = 'rgba(20,20,20,0.25)';
  for (let i = 0; i < 30; i++) { x.lineWidth = r(1, 3); const yy = r(py(0.9), py(0.15)), xx = r(0, w); x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + r(10, 50), yy + r(-4, 4)); x.stroke(); }
  cracks(x, w, h, 4);
  // afbladderende verf
  for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(90,85,75,0.5)'; x.beginPath(); x.ellipse(r(0, w), r(0, h * 0.8), r(4, 14), r(3, 9), r(0, 3), 0, Math.PI * 2); x.fill(); }
  grain(x, w, h, 14);
  return mat(c, { rough: 0.9, bump: 1.5 });
}
function tileWall() {
  const w = 512, h = 768, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#b9bab2'; x.fillRect(0, 0, w, h);
  const ts = 512 / 2 * 0.15 / 0.15 * 0.15 / 1 * (1 / 0.15) * 0.15 / 2; // 15 cm tegels
  const tpx = 512 / (2 / 0.15);
  const tileTop = h - 2.0 / 3 * h;
  for (let yy = h; yy > tileTop; yy -= tpx) for (let xx = 0; xx < w; xx += tpx) {
    const v = 200 + r(-12, 8); x.fillStyle = `rgb(${v},${v + 2},${v - 4})`;
    x.fillRect(xx + 1.5, yy - tpx + 1.5, tpx - 3, tpx - 3);
  }
  x.fillStyle = '#8f8d82'; x.fillRect(0, tileTop - 3, w, 6);
  x.fillStyle = '#a8a89c'; x.fillRect(0, 0, w, tileTop - 3);
  clouds(x, w, h, [16, 64], null, 0.12);
  stains(x, w, h, 20, 'rgba(110,90,40,A)', 10, 60, 0.15);
  drips(x, w, tileTop, 30, 'rgba(90,70,30,A)');
  const g = x.createLinearGradient(0, h * 0.85, 0, h); g.addColorStop(0, 'rgba(40,35,20,0)'); g.addColorStop(1, 'rgba(40,35,20,0.5)'); x.fillStyle = g; x.fillRect(0, h * 0.85, w, h);
  cracks(x, w, h, 3);
  grain(x, w, h, 10);
  void ts;
  return mat(c, { rough: 0.35, bump: 2 });
}
function blockWall(tint = '#8a8880') {
  const w = 512, h = 768, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#5b5a56'; x.fillRect(0, 0, w, h);
  const bw = 512 / 2 * 0.4, bh = 768 / 3 * 0.2;
  for (let row = 0; row * bh < h; row++) for (let col = -1; col * bw < w; col++) {
    const ox = (row % 2) * bw / 2;
    const v = r(-10, 10);
    x.fillStyle = tint; x.globalAlpha = 1; x.fillRect(col * bw + ox + 2, row * bh + 2, bw - 4, bh - 4);
    x.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 100})`; x.fillRect(col * bw + ox + 2, row * bh + 2, bw - 4, bh - 4);
  }
  clouds(x, w, h, [16, 64, 256], null, 0.25);
  stains(x, w, h, 25, 'rgba(40,35,25,A)', 15, 100, 0.2);
  drips(x, w, 0, 30, 'rgba(30,25,20,A)');
  const g = x.createLinearGradient(0, h * 0.8, 0, h); g.addColorStop(0, 'rgba(20,18,15,0)'); g.addColorStop(1, 'rgba(20,18,15,0.6)'); x.fillStyle = g; x.fillRect(0, h * 0.8, w, h);
  cracks(x, w, h, 6);
  grain(x, w, h, 22);
  return mat(c, { rough: 0.95, bump: 2.5 });
}
function floorTex(kind) {
  const s = 512, c = canvas(s, s), x = c.getContext('2d');
  let rough = 0.8, bump = 1;
  if (kind === 'lino') {
    x.fillStyle = '#5d6459'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) { const v = r(); x.fillStyle = v < 0.5 ? 'rgba(30,35,30,0.5)' : 'rgba(170,175,160,0.4)'; x.fillRect(r(0, s), r(0, s), r(1, 3), r(1, 3)); }
    x.strokeStyle = 'rgba(20,20,20,0.5)'; x.lineWidth = 1.5;
    for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(k * s / 4, 0); x.lineTo(k * s / 4, s); x.stroke(); x.beginPath(); x.moveTo(0, k * s / 4); x.lineTo(s, k * s / 4); x.stroke(); }
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) { x.fillStyle = `rgba(${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},0,0.03)`; x.fillRect(k * s / 4, j * s / 4, s / 4, s / 4); }
    rough = 0.55;
  } else if (kind === 'terrazzo') {
    x.fillStyle = '#8b857a'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) { const v = r(60, 220); x.fillStyle = `rgba(${v},${v * 0.95},${v * 0.88},0.7)`; x.beginPath(); x.arc(r(0, s), r(0, s), r(0.8, 3.5), 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(40,38,34,0.7)'; x.lineWidth = 3;
    for (let k = 0; k <= 5; k++) { x.beginPath(); x.moveTo(k * s / 5, 0); x.lineTo(k * s / 5, s); x.stroke(); x.beginPath(); x.moveTo(0, k * s / 5); x.lineTo(s, k * s / 5); x.stroke(); }
    rough = 0.4;
  } else if (kind === 'tileWhite') {
    x.fillStyle = '#4a4a44'; x.fillRect(0, 0, s, s);
    const n = 10, t = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 175 + r(-15, 10); x.fillStyle = `rgb(${v},${v},${v - 6})`; x.fillRect(i * t + 2, j * t + 2, t - 4, t - 4); }
    rough = 0.3; bump = 2;
  } else if (kind === 'wood') {
    x.fillStyle = '#4a3322'; x.fillRect(0, 0, s, s);
    const pw = s / 6;
    for (let i = 0; i < 6; i++) {
      let yy = -r(0, 300);
      while (yy < s) {
        const L = r(180, 380); const v = r(-18, 18);
        x.fillStyle = `rgb(${92 + v},${64 + v * 0.8},${42 + v * 0.6})`; x.fillRect(i * pw + 1, yy + 1, pw - 2, L - 2);
        for (let g = 0; g < 14; g++) { x.strokeStyle = `rgba(40,25,15,${r(0.1, 0.3)})`; x.lineWidth = r(0.5, 1.5); const gx = i * pw + r(2, pw - 2); x.beginPath(); x.moveTo(gx, yy); x.bezierCurveTo(gx + r(-4, 4), yy + L / 3, gx + r(-4, 4), yy + L * 2 / 3, gx + r(-3, 3), yy + L); x.stroke(); }
        yy += L;
      }
    }
    rough = 0.7;
  } else if (kind === 'concrete') {
    x.fillStyle = '#6b6862'; x.fillRect(0, 0, s, s);
    clouds(x, s, s, [8, 32, 128, 256], null, 0.35);
    stains(x, s, s, 25, 'rgba(25,22,18,A)', 20, 110, 0.25);
    stains(x, s, s, 10, 'rgba(60,40,20,A)', 10, 50, 0.2);
    cracks(x, s, s, 8);
    x.strokeStyle = 'rgba(20,20,20,0.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, s / 2); x.lineTo(s, s / 2); x.stroke();
    rough = 0.9; bump = 1.6;
  } else if (kind === 'metal') {
    x.fillStyle = '#505357'; x.fillRect(0, 0, s, s);
    clouds(x, s, s, [16, 64], null, 0.25);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const cx = i * 32 + 16, cy = j * 32 + 16, a = (i + j) % 2 ? 0.6 : -0.6;
      x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = 'rgba(160,165,170,0.5)'; x.fillRect(-10, -2.5, 20, 5); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(-10, 2.5, 20, 1.5); x.restore();
    }
    stains(x, s, s, 20, 'rgba(90,50,20,A)', 10, 60, 0.3);
    rough = 0.45; bump = 2;
  } else if (kind === 'carpet') {
    x.fillStyle = '#3a3d44'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 40000; i++) { const v = r(30, 90); x.fillStyle = `rgba(${v},${v + 3},${v + 10},0.5)`; x.fillRect(r(0, s), r(0, s), 1.5, 1.5); }
    x.strokeStyle = 'rgba(15,15,18,0.6)'; x.lineWidth = 2;
    for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(k * s / 4, 0); x.lineTo(k * s / 4, s); x.stroke(); x.beginPath(); x.moveTo(0, k * s / 4); x.lineTo(s, k * s / 4); x.stroke(); }
    stains(x, s, s, 12, 'rgba(20,15,10,A)', 15, 70, 0.3);
    rough = 1;
  }
  if (kind !== 'concrete') { clouds(x, s, s, [8, 64], null, 0.15); stains(x, s, s, 14, 'rgba(30,25,15,A)', 20, 90, 0.2); }
  grain(x, s, s, 10);
  return mat(c, { rough, bump });
}
function ceilingTiles() {
  const s = 512, c = canvas(s, s), x = c.getContext('2d');
  const t = s / (2 / 0.6) ; // 60 cm
  x.fillStyle = '#6f6e69'; x.fillRect(0, 0, s, s);
  for (let i = -1; i * t < s; i++) for (let j = -1; j * t < s; j++) {
    const v = 175 + r(-15, 10); x.fillStyle = `rgb(${v},${v - 2},${v - 8})`; x.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
    for (let k = 0; k < 120; k++) { x.fillStyle = 'rgba(80,75,65,0.35)'; x.fillRect(i * t + r(4, t - 4), j * t + r(4, t - 4), 1.5, 1.5); }
    if (R() < 0.22) { const g = x.createRadialGradient(i * t + t / 2, j * t + t / 2, 2, i * t + t / 2, j * t + t / 2, t * 0.6); g.addColorStop(0, 'rgba(120,85,30,0.5)'); g.addColorStop(0.7, 'rgba(120,85,30,0.25)'); g.addColorStop(1, 'rgba(120,85,30,0)'); x.fillStyle = g; x.fillRect(i * t, j * t, t, t); }
  }
  grain(x, s, s, 8);
  return mat(c, { rough: 0.95, bump: 1 });
}
function concreteCeil() {
  const s = 512, c = canvas(s, s), x = c.getContext('2d');
  x.fillStyle = '#5c5a55'; x.fillRect(0, 0, s, s);
  clouds(x, s, s, [8, 32, 128], null, 0.35);
  stains(x, s, s, 30, 'rgba(20,18,15,A)', 20, 120, 0.3);
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, s, 6); x.fillRect(0, s / 2, s, 4);
  grain(x, s, s, 16);
  return mat(c, { rough: 0.95, bump: 1.5 });
}
function doorTex(kind) {
  const w = 256, h = 512, c = canvas(w, h), x = c.getContext('2d');
  if (kind === 'metal' || kind === 'exit') {
    x.fillStyle = kind === 'exit' ? '#4b5a4c' : '#59606a'; x.fillRect(0, 0, w, h);
    clouds(x, w, h, [16, 64], null, 0.25);
    stains(x, w, h, 12, 'rgba(90,50,20,A)', 6, 40, 0.35);
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2; x.strokeRect(14, 14, w - 28, h - 28);
    if (kind === 'exit') { x.fillStyle = '#c9c4b0'; x.fillRect(20, h * 0.48, w - 40, 14); }
  } else {
    x.fillStyle = '#6e5137'; x.fillRect(0, 0, w, h);
    for (let g = 0; g < 70; g++) { x.strokeStyle = `rgba(40,25,10,${r(0.08, 0.25)})`; x.lineWidth = r(0.5, 2); const gx = r(0, w); x.beginPath(); x.moveTo(gx, 0); x.bezierCurveTo(gx + r(-10, 10), h / 3, gx + r(-10, 10), 2 * h / 3, gx + r(-6, 6), h); x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 3; x.strokeRect(24, 30, w - 48, h * 0.38); x.strokeRect(24, h * 0.52, w - 48, h * 0.42);
    stains(x, w, h, 8, 'rgba(20,10,5,A)', 6, 30, 0.3);
  }
  const g = x.createLinearGradient(0, h * 0.8, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); x.fillStyle = g; x.fillRect(0, h * 0.8, w, h);
  grain(x, w, h, 12);
  return mat(c, { rough: kind === 'wood' ? 0.7 : 0.5, metal: kind === 'wood' ? 0 : 0.4, bump: 1 });
}
function plainMat(color, rough = 0.8, metal = 0, noiseAmt = 0.25) {
  const s = 128, c = canvas(s, s), x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, s, s);
  clouds(x, s, s, [8, 32], null, noiseAmt);
  stains(x, s, s, 6, 'rgba(20,15,10,A)', 5, 30, 0.25);
  grain(x, s, s, 10);
  const m = new THREE.MeshStandardMaterial({ map: tex(c), roughness: rough, metalness: metal });
  return m;
}
function lockerTex() {
  const w = 128, h = 512, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#4e5a63'; x.fillRect(0, 0, w, h);
  clouds(x, w, h, [16, 64], null, 0.25);
  for (let k = 0; k < 6; k++) { x.fillStyle = '#121416'; x.fillRect(30, 30 + k * 12, 68, 5); x.fillRect(30, h - 110 + k * 12, 68, 5); }
  x.fillStyle = '#9a9a9a'; x.fillRect(100, h * 0.48, 10, 30);
  stains(x, w, h, 10, 'rgba(90,45,15,A)', 5, 25, 0.4);
  x.strokeStyle = 'rgba(0,0,0,0.4)'; x.strokeRect(4, 4, w - 8, h - 8);
  grain(x, w, h, 14);
  return new THREE.MeshStandardMaterial({ map: tex(c, false), roughness: 0.55, metalness: 0.5 });
}

export function textCanvas(lines, o = {}) {
  const w = o.w || 512, h = o.h || 256, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = o.bg || '#d8d2c0'; x.fillRect(0, 0, w, h);
  if (o.aged !== false) { clouds(x, w, h, [8, 32], null, 0.2); stains(x, w, h, 6, 'rgba(110,80,30,A)', 10, 60, 0.2); }
  x.fillStyle = o.fg || '#1c1a17'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lh = h / (lines.length + 1);
  lines.forEach((l, i) => { const [txt, size, bold] = Array.isArray(l) ? l : [l, o.size || 34, o.bold]; x.font = `${bold ? 'bold ' : ''}${size}px ${o.font || 'Arial, sans-serif'}`; x.fillText(txt, w / 2, lh * (i + 1)); });
  if (o.border) { x.strokeStyle = o.fg || '#1c1a17'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); }
  return c;
}
export function signMat(lines, o = {}) {
  const c = textCanvas(lines, o);
  const t = tex(c, false);
  if (o.emissive) return new THREE.MeshStandardMaterial({ map: t, emissive: new THREE.Color(o.emissive), emissiveMap: t, emissiveIntensity: o.ei ?? 1.5, roughness: 0.5 });
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
}

// Gekraste cijfers op de muur (transparant)
export function scratchMat(roman, digit) {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  const scr = (txt, size, cx, cy) => {
    x.font = `${size}px "Courier New", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let k = 0; k < 6; k++) { x.strokeStyle = `rgba(${k % 2 ? 230 : 20},${k % 2 ? 225 : 18},${k % 2 ? 210 : 15},${k % 2 ? 0.5 : 0.7})`; x.lineWidth = k % 2 ? 1.2 : 2.5; x.strokeText(txt, cx + r(-2, 2), cy + r(-2, 2)); }
  };
  scr(roman, 70, 128, 70);
  scr(String(digit), 120, 128, 170);
  for (let i = 0; i < 25; i++) { x.strokeStyle = 'rgba(20,18,15,0.4)'; x.lineWidth = 1; const xx = r(20, 236), yy = r(20, 236); x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + r(-20, 20), yy + r(-20, 20)); x.stroke(); }
  const t = tex(c, false);
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
}

// Gezicht van de entiteit (voor model én schrikflitsen)
export function faceCanvas(w = 512, h = 256, front = true) {
  const c = canvas(w, h), x = c.getContext('2d');
  const g0 = x.createLinearGradient(0, 0, 0, h); g0.addColorStop(0, '#8b867c'); g0.addColorStop(1, '#6d675c');
  x.fillStyle = g0; x.fillRect(0, 0, w, h);
  clouds(x, w, h, [8, 32, 128], null, 0.35);
  stains(x, w, h, 30, 'rgba(60,40,40,A)', 5, 40, 0.3);
  // aders
  x.strokeStyle = 'rgba(50,40,60,0.35)';
  for (let i = 0; i < 40; i++) { let px = r(0, w), py = r(0, h); x.lineWidth = r(0.5, 1.5); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 10; k++) { px += r(-8, 8); py += r(-8, 8); x.lineTo(px, py); } x.stroke(); }
  if (front) {
    const cx = w * 0.25, cy = h * 0.5, fw = w * 0.12, fh = h * 0.42;
    const eye = (ex, ey) => {
      let g = x.createRadialGradient(ex, ey, 1, ex, ey, fw * 0.55); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(5,0,0,0.95)'); g.addColorStop(1, 'rgba(30,20,20,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(ex, ey, fw * 0.55, fh * 0.32, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(210,205,190,0.9)'; x.beginPath(); x.arc(ex + r(-1, 1), ey + 1, Math.max(1.5, fw * 0.045), 0, 7); x.fill();
    };
    eye(cx - fw * 0.42, cy - fh * 0.28); eye(cx + fw * 0.42, cy - fh * 0.24);
    // neus
    x.fillStyle = 'rgba(20,10,10,0.8)'; x.beginPath(); x.ellipse(cx - 3, cy + fh * 0.05, 3, 5, 0, 0, 7); x.ellipse(cx + 3, cy + fh * 0.05, 3, 5, 0, 0, 7); x.fill();
    // mond: lang, open
    let g = x.createRadialGradient(cx, cy + fh * 0.45, 2, cx, cy + fh * 0.45, fw * 0.5); g.addColorStop(0, '#000'); g.addColorStop(0.7, '#070000'); g.addColorStop(1, 'rgba(40,10,10,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy + fh * 0.45, fw * 0.32, fh * 0.42, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(200,190,160,0.75)';
    for (let i = -3; i <= 3; i++) { x.fillRect(cx + i * fw * 0.07 - 2, cy + fh * 0.1, 3, r(5, 10)); }
    x.strokeStyle = 'rgba(90,20,20,0.6)'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy + fh * 0.45, fw * 0.33, fh * 0.43, 0, 0, 7); x.stroke();
  }
  grain(x, w, h, 20);
  return c;
}
export function faceMat() {
  return new THREE.MeshStandardMaterial({ map: tex(faceCanvas(), true), roughness: 0.6 });
}

export function buildMaterials() {
  const M = {
    paintBeige: wallPaint('#a39b86', '#5f6b5a'),
    paintGreen: wallPaint('#9aa08e', '#45564a'),
    paintBlue: wallPaint('#8d97a0', '#3e4a57'),
    tileWall: tileWall(),
    block: blockWall(),
    blockDark: blockWall('#6a6660'),
    lino: floorTex('lino'),
    terrazzo: floorTex('terrazzo'),
    tileWhite: floorTex('tileWhite'),
    wood: floorTex('wood'),
    concrete: floorTex('concrete'),
    metal: floorTex('metal'),
    carpet: floorTex('carpet'),
    tiles: ceilingTiles(),
    concreteCeil: concreteCeil(),
    doorWood: doorTex('wood'),
    doorMetal: doorTex('metal'),
    doorExit: doorTex('exit'),
    frame: plainMat('#3b3b38', 0.6, 0.3),
    deskWood: plainMat('#5d4630', 0.6),
    deskTop: plainMat('#8b8576', 0.5),
    darkMetal: plainMat('#2c2f33', 0.5, 0.6),
    greyMetal: plainMat('#6a6f74', 0.45, 0.6),
    rust: plainMat('#5a4334', 0.8, 0.3, 0.5),
    cardboard: plainMat('#8a7050', 0.95),
    cardboard2: plainMat('#6d5a43', 0.95),
    plastic: plainMat('#2a2a2a', 0.4),
    beigePlastic: plainMat('#b3ab92', 0.5),
    fabric: plainMat('#2e3540', 1),
    porcelain: plainMat('#d4d2c8', 0.2, 0, 0.1),
    red: plainMat('#7a1a14', 0.5, 0.1),
    paper: plainMat('#d8d3c3', 0.9, 0, 0.1),
    rubber: plainMat('#151515', 0.9),
    pipe: plainMat('#4a4d4f', 0.5, 0.7),
    yellow: plainMat('#a68a1e', 0.6),
    wood2: plainMat('#6b4f33', 0.8),
    burnt: plainMat('#121010', 1, 0, 0.6),
    locker: lockerTex(),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fb4b8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),
    frosted: new THREE.MeshStandardMaterial({ color: 0xc8ccc8, roughness: 0.6, transparent: true, opacity: 0.72, depthWrite: false }),
    mirror: new THREE.MeshStandardMaterial({ color: 0x9aa4a6, roughness: 0.05, metalness: 1.0 }),
    puddle: new THREE.MeshStandardMaterial({ color: 0x1a1d1e, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.65, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    screenOff: new THREE.MeshStandardMaterial({ color: 0x0b0d0c, roughness: 0.15, metalness: 0.2 }),
    exitSign: new THREE.MeshStandardMaterial({ color: 0x0a3a14, emissive: 0x18ff55, emissiveIntensity: 1.2 }),
    ledGreen: new THREE.MeshBasicMaterial({ color: 0x33ff66 }),
    ledRed: new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
    black: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 }),
  };
  M.wallFor = { paintBeige: M.paintBeige, paintGreen: M.paintGreen, paintBlue: M.paintBlue, tileWall: M.tileWall, block: M.block, blockDark: M.blockDark };
  return M;
}
