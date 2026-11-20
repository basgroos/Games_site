// ===================== RENDERING =====================
const CELL = 70, OX = 30, OY = 52, CW = OX * 2 + AW * CELL, CH = OY + AH * CELL + 26;
const PX = x => OX + x * CELL, PY = y => OY + y * CELL;
const TEAMC = ['#4fd1ff', '#ff5a6a'];

function hex6(h) { if (h.length === 4) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return h; }
function shade(hex, p) {
  const n = parseInt(hex6(hex).slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (p < 0) { r *= 1 + p; g *= 1 + p; b *= 1 + p; } else { r += (255 - r) * p; g += (255 - g) * p; b += (255 - b) * p; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function rgba(hex, a) { const n = parseInt(hex6(hex).slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- weapons (drawn in a frame where the grip is at 0,0 and "up" is -y) ----------
function drawWeapon(c, L, a) {
  const w = L.weapon;
  const steel = '#d9dee5', wood = '#7a4f2a';
  if (w === 'sword' || w === 'greatsword') {
    const len = w === 'greatsword' ? 30 : 21, wd = w === 'greatsword' ? 4.5 : 3.2;
    c.fillStyle = steel; c.beginPath(); c.moveTo(-wd / 2, -3); c.lineTo(-wd / 2, -len); c.lineTo(0, -len - 4); c.lineTo(wd / 2, -len); c.lineTo(wd / 2, -3); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-wd / 2 + 0.6, -len + 1, 1, len - 5);
    c.fillStyle = '#c9a23a'; rr(c, -6, -4.5, 12, 2.6, 1); c.fill();
    c.fillStyle = '#4a2c18'; c.fillRect(-1.3, -2, 2.6, 6);
  } else if (w === 'spear') {
    c.fillStyle = wood; c.fillRect(-1.2, -30, 2.4, 38);
    c.fillStyle = steel; c.beginPath(); c.moveTo(-3, -29); c.lineTo(0, -39); c.lineTo(3, -29); c.closePath(); c.fill();
  } else if (w === 'dagger') {
    c.fillStyle = steel; c.beginPath(); c.moveTo(-1.6, -2); c.lineTo(0, -13); c.lineTo(1.6, -2); c.fill();
    c.fillStyle = '#3b2a3a'; c.fillRect(-3, -3, 6, 1.8);
  } else if (w === 'axe') {
    c.fillStyle = wood; c.fillRect(-1.3, -24, 2.6, 28);
    c.fillStyle = steel; c.beginPath(); c.moveTo(1, -24); c.quadraticCurveTo(13, -27, 11, -14); c.quadraticCurveTo(6, -18, 1, -16); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-1, -23); c.quadraticCurveTo(-7, -22, -6, -16); c.lineTo(-1, -18); c.fill();
  } else if (w === 'hammer') {
    c.fillStyle = wood; c.fillRect(-1.3, -22, 2.6, 26);
    c.fillStyle = '#e8c45a'; rr(c, -7, -29, 14, 8, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-6, -28, 12, 2);
  } else if (w === 'mace') {
    c.fillStyle = wood; c.fillRect(-1.3, -16, 2.6, 20);
    c.fillStyle = '#9aa4ad'; circ(c, 0, -20, 5.5); c.fill();
    c.fillStyle = '#cfd6dd'; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(an) * 4, -20 + Math.sin(an) * 4); c.lineTo(Math.cos(an) * 8, -20 + Math.sin(an) * 8); c.lineTo(Math.cos(an + 0.4) * 4, -20 + Math.sin(an + 0.4) * 4); c.fill(); }
  } else if (w === 'club') {
    c.fillStyle = '#8a5a30'; c.beginPath(); c.moveTo(-1.5, 4); c.lineTo(-3.5, -18); c.quadraticCurveTo(0, -24, 3.5, -18); c.lineTo(1.5, 4); c.fill();
  } else if (w === 'scythe') {
    c.fillStyle = '#3a2f2a'; c.fillRect(-1.2, -32, 2.4, 40);
    c.fillStyle = '#b8c0c8'; c.beginPath(); c.moveTo(0, -32); c.quadraticCurveTo(-16, -34, -20, -24); c.quadraticCurveTo(-12, -29, 0, -28); c.fill();
  }
}
function drawStaff(c, L, a) {
  c.fillStyle = '#6b4424'; c.fillRect(-1.2, -30, 2.4, 40);
  const gem = L.gem || '#9be7ff';
  const glow = 0.5 + 0.5 * Math.sin(a.t * 4 + a.seed) + (a.cast > 0 || a.atk > 0 ? 1.5 : 0);
  const g = c.createRadialGradient(0, -33, 0, 0, -33, 9 + glow * 2);
  g.addColorStop(0, rgba(gem, 0.9)); g.addColorStop(1, rgba(gem, 0));
  c.fillStyle = g; circ(c, 0, -33, 9 + glow * 2); c.fill();
  c.fillStyle = gem; c.beginPath(); c.moveTo(0, -38); c.lineTo(3.5, -33); c.lineTo(0, -28); c.lineTo(-3.5, -33); c.closePath(); c.fill();
  c.strokeStyle = '#c9a23a'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, -33, 4.5, 0.2, Math.PI - 0.2); c.stroke();
}

// ---------- hats ----------
function hatBehind(c, L, hx, hy) {
  if (L.hat === 'hood') { c.fillStyle = shade(L.hatC, -0.1); circ(c, hx - 2, hy, 11.5); c.fill(); }
  if (L.hat === 'elf' || L.hair && L.hat !== 'none') { c.fillStyle = L.hatC || L.hair; c.beginPath(); c.moveTo(hx - 9, hy - 4); c.quadraticCurveTo(hx - 14, hy + 10, hx - 8, hy + 14); c.lineTo(hx, hy + 4); c.closePath(); c.fill(); }
  if (L.collar) { c.fillStyle = '#8b0012'; c.beginPath(); c.moveTo(hx - 6, hy + 8); c.lineTo(hx - 14, hy - 8); c.lineTo(hx - 2, hy + 4); c.closePath(); c.fill(); }
}
function hatFront(c, L, hx, hy, a) {
  const h = L.hatC || '#888';
  switch (L.hat) {
    case 'cap': c.fillStyle = h; c.beginPath(); c.arc(hx, hy - 1, 10, Math.PI, 0); c.fill(); c.fillStyle = shade(h, -0.3); c.fillRect(hx - 10.5, hy - 2, 21, 2.4); break;
    case 'helm': case 'plume': case 'horns':
      c.fillStyle = h; c.beginPath(); c.arc(hx, hy - 0.5, 10.6, Math.PI * 0.95, Math.PI * 2.02); c.lineTo(hx + 10, hy + 1); c.lineTo(hx - 11, hy + 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(hx - 2, hy - 5, 5, Math.PI * 1.1, Math.PI * 1.5); c.lineTo(hx - 2, hy - 5); c.fill();
      c.fillStyle = shade(h, -0.35); c.fillRect(hx + 6, hy - 2, 2.2, 7);
      if (L.hat === 'plume') { c.fillStyle = L.plume || '#d33'; c.beginPath(); c.moveTo(hx - 1, hy - 10); c.quadraticCurveTo(hx - 6, hy - 22, hx - 16, hy - 14 + Math.sin(a.t * 5) * 1.5); c.quadraticCurveTo(hx - 7, hy - 15, hx + 2, hy - 9); c.fill(); }
      if (L.hat === 'horns') { c.fillStyle = '#efe6cf'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + s * 6, hy - 7); c.quadraticCurveTo(hx + s * 16, hy - 10, hx + s * 15, hy - 22); c.quadraticCurveTo(hx + s * 11, hy - 12, hx + s * 3, hy - 9); c.fill(); } }
      break;
    case 'greathelm':
      c.fillStyle = h; rr(c, hx - 10.5, hy - 11, 21, 20, 5); c.fill();
      c.fillStyle = '#1a1d22'; c.fillRect(hx + 1, hy - 3, 9.5, 2.4); c.fillRect(hx + 4, hy + 1, 1.6, 5);
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(hx - 8, hy - 9, 3, 15); break;
    case 'hood':
      c.fillStyle = h; c.beginPath(); c.arc(hx - 1, hy - 0.5, 11, Math.PI * 0.9, Math.PI * 1.9); c.quadraticCurveTo(hx + 4, hy - 6, hx + 2, hy + 9); c.lineTo(hx - 10, hy + 10); c.fill();
      break;
    case 'wizard':
      c.fillStyle = h; ell(c, hx, hy - 7, 13, 3.4); c.fill();
      c.beginPath(); c.moveTo(hx - 8, hy - 8); c.quadraticCurveTo(hx - 4, hy - 22, hx - 9, hy - 32 + Math.sin(a.t * 2 + a.seed)); c.quadraticCurveTo(hx + 2, hy - 22, hx + 8, hy - 8); c.fill();
      c.fillStyle = shade(h, 0.35); c.fillRect(hx - 8, hy - 11, 16, 2.4);
      if (L.stars) { c.fillStyle = '#ffe680'; circ(c, hx - 2, hy - 18, 1.3); c.fill(); circ(c, hx + 2, hy - 13, 1); c.fill(); circ(c, hx - 5, hy - 25, 1); c.fill(); }
      break;
    case 'mitre':
      c.fillStyle = h; c.beginPath(); c.moveTo(hx - 7, hy - 6); c.lineTo(hx - 5, hy - 20); c.lineTo(hx + 1, hy - 26); c.lineTo(hx + 7, hy - 20); c.lineTo(hx + 8, hy - 6); c.fill();
      c.strokeStyle = '#fff6d0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx + 1, hy - 21); c.lineTo(hx + 1, hy - 9); c.moveTo(hx - 3, hy - 16); c.lineTo(hx + 5, hy - 16); c.stroke(); break;
    case 'crown':
      c.fillStyle = h; c.beginPath(); c.moveTo(hx - 8, hy - 6); c.lineTo(hx - 9, hy - 15); c.lineTo(hx - 4, hy - 10); c.lineTo(hx, hy - 17); c.lineTo(hx + 4, hy - 10); c.lineTo(hx + 9, hy - 15); c.lineTo(hx + 8, hy - 6); c.fill();
      c.fillStyle = '#e0303d'; circ(c, hx, hy - 9, 1.6); c.fill(); c.fillStyle = '#3b8cff'; circ(c, hx - 5, hy - 8, 1.2); c.fill(); circ(c, hx + 5, hy - 8, 1.2); c.fill(); break;
    case 'bandana':
      c.fillStyle = h; c.beginPath(); c.arc(hx, hy - 1, 10, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(hx + 9, hy - 2); c.lineTo(hx - 9, hy - 2); c.fill();
      c.beginPath(); c.moveTo(hx - 9, hy - 4); c.lineTo(hx - 16, hy - 1 + Math.sin(a.t * 6) * 1.5); c.lineTo(hx - 15, hy + 3); c.closePath(); c.fill(); break;
    case 'elf':
      c.fillStyle = h; c.beginPath(); c.arc(hx, hy - 1, 10, Math.PI * 1.0, Math.PI * 1.9); c.quadraticCurveTo(hx + 2, hy - 6, hx - 4, hy - 4); c.lineTo(hx - 10, hy + 2); c.fill();
      c.fillStyle = L.skin; c.beginPath(); c.moveTo(hx - 3, hy - 1); c.lineTo(hx - 9, hy - 9); c.lineTo(hx - 1, hy + 2); c.fill(); break;
    case 'feather':
      c.fillStyle = '#7a3b1e'; c.fillRect(hx - 10, hy - 6, 20, 3);
      [['#4fd2ff', -6, -20], ['#ffcf4a', -2, -23], ['#ff6a4a', -9, -16]].forEach(([col, dx, dy]) => { c.fillStyle = col; c.beginPath(); c.moveTo(hx + dx, hy - 6); c.quadraticCurveTo(hx + dx - 4, hy + dy / 2, hx + dx - 2, hy + dy); c.quadraticCurveTo(hx + dx + 2, hy + dy / 2, hx + dx + 1, hy - 6); c.fill(); });
      break;
    default:
      if (L.hair) { c.fillStyle = L.hair; c.beginPath(); c.arc(hx, hy - 1, 10, Math.PI * 0.95, Math.PI * 1.9); c.quadraticCurveTo(hx + 3, hy - 7, hx - 3, hy - 5); c.lineTo(hx - 10, hy + 2); c.fill(); }
  }
}

// ---------- humanoid ----------
function drawHumanoid(c, def, a) {
  const L = def.look, t = a.t, ph = a.walk * 9;
  const step = a.moving ? Math.sin(ph) : 0;
  const bob = a.moving ? -Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 2.4 + a.seed) * 0.7;
  const body = L.body, dark = shade(body, -0.4), skin = L.skin || '#f1c27d';
  if (L.cape) { c.fillStyle = shade(L.cape, -0.1); c.beginPath(); c.moveTo(-6, -27 + bob); c.quadraticCurveTo(-15, -14, -14 + step * 2 + Math.sin(t * 3 + a.seed), -3); c.lineTo(-2, -5); c.lineTo(4, -26 + bob); c.closePath(); c.fill(); }
  const leg = (x, o) => { c.fillStyle = dark; rr(c, x - 2.6 + o * 0.5, -12, 5.2, 11, 2); c.fill(); c.fillStyle = '#2a1f18'; rr(c, x - 3 + o, -3.2, 6.6, 3.4, 1.5); c.fill(); };
  leg(-3.2, step * 2.5); leg(3.2, -step * 2.5);
  c.save(); c.translate(0, bob);
  // torso
  const g = c.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, shade(body, 0.22)); g.addColorStop(1, shade(body, -0.22));
  c.fillStyle = g; rr(c, -8.5, -28, 17, 17.5, 6); c.fill();
  c.fillStyle = 'rgba(25,16,10,.8)'; c.fillRect(-8.5, -14.6, 17, 2.6); c.fillStyle = '#d9b45a'; c.fillRect(-1.5, -14.9, 3, 3.2);
  if (def.role === 'healer' || L.hat === 'wizard' || L.hat === 'mitre') { c.fillStyle = shade(body, -0.15); c.beginPath(); c.moveTo(-8.5, -12); c.lineTo(8.5, -12); c.lineTo(10, -2); c.lineTo(-10, -2); c.fill(); }
  // back hand / offhand
  if (L.off === 'round') { c.fillStyle = L.offC; circ(c, -4, -18, 8); c.fill(); c.strokeStyle = '#c9cfd6'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#c9cfd6'; circ(c, -4, -18, 2); c.fill(); }
  if (L.off === 'tower') { c.fillStyle = L.offC; rr(c, -12, -31, 13, 27, 3); c.fill(); c.strokeStyle = '#b0bac4'; c.lineWidth = 1.8; c.stroke(); c.strokeStyle = '#e8c45a'; c.beginPath(); c.moveTo(-5.5, -27); c.lineTo(-5.5, -9); c.moveTo(-10, -19); c.lineTo(-1, -19); c.stroke(); }
  if (L.off === 'dagger') { c.save(); c.translate(-6, -16); c.rotate(-0.6 - a.atk * 0.8); drawWeapon(c, { weapon: 'dagger' }, a); c.restore(); }
  // head
  const hx = 1, hy = -34;
  hatBehind(c, L, hx, hy);
  if (L.ears) { c.fillStyle = skin; c.beginPath(); c.moveTo(hx - 5, hy - 2); c.lineTo(hx - 17, hy - 7); c.lineTo(hx - 5, hy + 3); c.fill(); }
  const hg = c.createRadialGradient(hx + 3, hy - 3, 2, hx, hy, 10); hg.addColorStop(0, shade(skin, 0.15)); hg.addColorStop(1, shade(skin, -0.15));
  c.fillStyle = hg; circ(c, hx, hy, 9.5); c.fill();
  if (L.ears) { c.fillStyle = shade(skin, -0.08); c.beginPath(); c.moveTo(hx + 4, hy - 4); c.lineTo(hx + 14, hy - 10); c.lineTo(hx + 7, hy + 1); c.fill(); }
  if (L.mask) { c.fillStyle = '#121016'; rr(c, hx - 3, hy - 4, 13, 5, 2); c.fill(); }
  c.fillStyle = L.mask ? '#ff4d6d' : '#1c1414';
  circ(c, hx + 4, hy - 1.5, 1.5); c.fill(); circ(c, hx + 8, hy - 1.5, 1.4); c.fill();
  if (!L.mask) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(hx + 4.5, hy + 4, 3.5, 1.1); }
  if (L.beard) { c.fillStyle = L.beard; c.beginPath(); c.moveTo(hx - 2, hy + 2); c.quadraticCurveTo(hx + 4, hy + 15, hx + 10, hy + 2); c.quadraticCurveTo(hx + 5, hy + 6, hx - 2, hy + 2); c.fill(); }
  hatFront(c, L, hx, hy, a);
  c.restore();
  // weapon hand
  const w = L.weapon;
  if (w === 'bow') {
    const pull = a.atk > 0 ? a.atk : 0;
    c.save(); c.translate(9, -19 + bob);
    c.strokeStyle = '#7a4f2a'; c.lineWidth = 2.4; c.beginPath(); c.arc(-4, 0, 12, -1.1, 1.1); c.stroke();
    c.strokeStyle = 'rgba(240,240,240,.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(1.4, -10.7); c.lineTo(-4 - pull * 6, 0); c.lineTo(1.4, 10.7); c.stroke();
    c.fillStyle = skin; circ(c, 7, 0, 2.4); c.fill();
    c.restore();
  } else if (w === 'crossbow') {
    c.save(); c.translate(6, -19 + bob); c.rotate(-0.08 - a.atk * 0.25);
    c.fillStyle = '#6b4424'; rr(c, -6, -2, 18, 4, 1.5); c.fill();
    c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(11, -8); c.quadraticCurveTo(14, 0, 11, 8); c.stroke();
    c.fillStyle = skin; circ(c, 0, 1, 2.3); c.fill(); c.restore();
  } else if (w === 'staff') {
    c.save(); c.translate(8, -15 + bob - (a.cast > 0 || a.atk > 0 ? 4 : 0)); c.rotate(0.12 - (a.atk > 0 ? 0.25 : 0));
    drawStaff(c, L, a); c.fillStyle = skin; circ(c, 0, 0, 2.4); c.fill(); c.restore();
  } else if (w === 'drum') {
    c.save(); c.translate(6, -16 + bob);
    c.fillStyle = '#c8302f'; rr(c, -2, -5, 11, 11, 3); c.fill(); c.fillStyle = '#f4e3c0'; ell(c, 3.5, -5, 5.5, 2); c.fill();
    c.strokeStyle = '#e8c45a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -3); c.lineTo(9, 5); c.moveTo(9, -3); c.lineTo(-2, 5); c.stroke();
    c.rotate(-0.8 + Math.sin(a.t * 10 + a.seed) * (a.atk > 0 ? 0.6 : 0.2)); c.fillStyle = '#e8d6a8'; c.fillRect(2, -12, 1.6, 10);
    c.restore();
  } else {
    const p = 1 - a.atk;
    const ang = a.atk > 0 ? (p < 0.35 ? lerp(-1.4, 1.9, p / 0.35) : lerp(1.9, 0.35, (p - 0.35) / 0.65)) : 0.35 + Math.sin(t * 2 + a.seed) * 0.04;
    c.save(); c.translate(6.5, -17 + bob); c.rotate(ang);
    drawWeapon(c, L, a); c.fillStyle = skin; circ(c, 0, 0, 2.6); c.fill();
    c.restore();
  }
}

// ---------- creatures ----------
function drawWolf(c, L, a) {
  const t = a.t, ph = a.walk * 11, mv = a.moving ? 1 : 0;
  const col = L.body, dark = shade(col, -0.35), lunge = a.atk * 4;
  c.fillStyle = dark;
  [[-10, 0], [-5, 1], [6, 1], [11, 0]].forEach(([x, k], i) => { const o = mv * Math.sin(ph + i * 1.6) * 2.5; rr(c, x - 1.8 + o, -10, 3.6, 10, 1.5); c.fill(); });
  c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-13, -15); c.quadraticCurveTo(-20, -17, -23, -24 + Math.sin(t * 5) * 2); c.stroke(); c.lineCap = 'butt';
  const g = c.createLinearGradient(0, -21, 0, -6); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, dark);
  c.fillStyle = g; ell(c, 0, -14, 15, 7.5); c.fill();
  c.fillStyle = shade(col, 0.45); ell(c, 4, -9, 8, 2.5); c.fill();
  c.save(); c.translate(lunge, 0);
  c.fillStyle = col; ell(c, 14, -19, 7, 6); c.fill();
  c.beginPath(); c.moveTo(10, -23); c.lineTo(12, -31); c.lineTo(15.5, -24); c.fill();
  c.fillStyle = shade(col, 0.3); ell(c, 20, -17, 5.5, 3.2); c.fill();
  c.fillStyle = '#111'; circ(c, 25, -18, 1.6); c.fill();
  if (a.atk > 0) { c.fillStyle = '#3a0d0d'; c.beginPath(); c.moveTo(16, -15); c.lineTo(25, -14.5); c.lineTo(18, -12); c.fill(); }
  c.fillStyle = '#ffd34a'; circ(c, 16, -21, 1.4); c.fill();
  c.restore();
}
function drawGriffin(c, L, a) {
  const t = a.t, hov = -9 + Math.sin(t * 3 + a.seed) * 2, flap = Math.sin(t * 9 + a.seed) * 0.7;
  const col = L.body;
  c.save(); c.translate(0, hov);
  const wing = (back) => { c.save(); c.translate(-2, -20); c.rotate(-0.4 + flap * (back ? 0.8 : 1)); c.fillStyle = back ? shade(col, -0.35) : shade(col, 0.15);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-12, -22, -26, -26); c.lineTo(-22, -18); c.lineTo(-25, -14); c.lineTo(-19, -10); c.lineTo(-20, -5); c.quadraticCurveTo(-8, -2, 0, 4); c.fill(); c.restore(); };
  wing(true);
  c.fillStyle = shade(col, -0.3); rr(c, -11, -12, 4, 9, 1.5); c.fill(); rr(c, 6, -12, 4, 9, 1.5); c.fill();
  c.fillStyle = col; ell(c, 0, -15, 14, 8); c.fill();
  c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(-13, -15); c.quadraticCurveTo(-21, -14, -22, -22); c.stroke();
  c.fillStyle = '#f4efe3'; ell(c, 11, -23, 7.5, 6.5); c.fill();
  c.fillStyle = '#f0a020'; c.beginPath(); c.moveTo(17, -25); c.quadraticCurveTo(25, -23, 22, -18); c.lineTo(17, -20); c.fill();
  c.fillStyle = '#1a1a1a'; circ(c, 14, -25, 1.4); c.fill();
  wing(false);
  c.restore();
}
function drawGolem(c, L, a) {
  const t = a.t, ph = a.walk * 6, mv = a.moving ? 1 : 0, col = L.body;
  const bob = mv * -Math.abs(Math.sin(ph)) * 1.5;
  c.fillStyle = shade(col, -0.35);
  rr(c, -11 + mv * Math.sin(ph) * 2, -13, 9, 13, 3); c.fill(); rr(c, 2 - mv * Math.sin(ph) * 2, -13, 9, 13, 3); c.fill();
  c.save(); c.translate(0, bob);
  c.fillStyle = shade(col, -0.25); circ(c, -15, -24, 7); c.fill();
  const g = c.createLinearGradient(-15, -44, 15, -12); g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, shade(col, -0.3));
  c.fillStyle = g; c.beginPath(); c.moveTo(-15, -42); c.lineTo(14, -44); c.lineTo(13, -12); c.lineTo(-13, -11); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -40); c.lineTo(-4, -30); c.lineTo(-9, -20); c.moveTo(6, -38); c.lineTo(9, -28); c.stroke();
  const pulse = 0.6 + 0.4 * Math.sin(t * 3 + a.seed);
  c.strokeStyle = `rgba(90,255,240,${pulse})`; c.lineWidth = 1.6; circ(c, 0, -28, 5); c.stroke(); c.beginPath(); c.moveTo(0, -33); c.lineTo(0, -23); c.moveTo(-5, -28); c.lineTo(5, -28); c.stroke();
  c.fillStyle = '#5c8f3a'; ell(c, -10, -42, 6, 2.5); c.fill(); ell(c, 9, -43, 4, 2); c.fill();
  c.fillStyle = shade(col, 0.1); rr(c, -4, -54, 13, 11, 3); c.fill();
  c.fillStyle = `rgba(90,255,240,${0.7 + pulse * 0.3})`; c.fillRect(2, -50, 2.5, 2.5); c.fillRect(6, -50, 2.5, 2.5);
  const sw = a.atk > 0 ? Math.sin((1 - a.atk) * Math.PI) : 0;
  c.save(); c.translate(12, -34); c.rotate(-0.3 + sw * 1.6 - (a.atk > 0.7 ? 1.4 : 0));
  c.fillStyle = shade(col, 0.05); rr(c, -4, 0, 8, 14, 3); c.fill(); c.fillStyle = shade(col, 0.15); circ(c, 0, 18, 7.5); c.fill();
  c.restore();
  c.restore();
}
function drawPhoenix(c, L, a) {
  const t = a.t, hov = -22 + Math.sin(t * 3 + a.seed) * 3, flap = Math.sin(t * 7 + a.seed);
  c.save(); c.translate(0, hov);
  const gl = c.createRadialGradient(0, -12, 2, 0, -12, 30); gl.addColorStop(0, 'rgba(255,170,60,.55)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = gl; circ(c, 0, -12, 30); c.fill();
  for (let i = 0; i < 3; i++) { c.strokeStyle = ['#ff3d1c', '#ff8a2b', '#ffd34a'][i]; c.lineWidth = 3 - i * 0.6; c.beginPath(); c.moveTo(-6, -10); c.quadraticCurveTo(-18, -4 + i * 3, -28 - i * 2, 4 + Math.sin(t * 6 + i) * 4); c.stroke(); }
  const wing = (k, back) => { c.save(); c.translate(0, -14); c.rotate(-0.2 + flap * 0.7 * k); const g = c.createLinearGradient(0, 0, -10, -28); g.addColorStop(0, '#ffd34a'); g.addColorStop(1, back ? '#c42a10' : '#ff4a1c');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-6, -20, -18, -30); c.lineTo(-14, -20); c.lineTo(-22, -20); c.lineTo(-15, -12); c.lineTo(-21, -8); c.quadraticCurveTo(-8, -4, 0, 4); c.fill(); c.restore(); };
  wing(0.8, true);
  const bg = c.createLinearGradient(0, -22, 0, -4); bg.addColorStop(0, '#ffd34a'); bg.addColorStop(1, '#ff5a1c');
  c.fillStyle = bg; ell(c, 0, -13, 9, 7, -0.2); c.fill();
  c.fillStyle = '#ffb02e'; circ(c, 8, -21, 5.5); c.fill();
  c.fillStyle = '#ffe680'; c.beginPath(); c.moveTo(5, -25); c.quadraticCurveTo(2, -36 + Math.sin(t * 8) * 2, -2, -32); c.quadraticCurveTo(2, -30, 6, -25); c.fill();
  c.fillStyle = '#ffe9a8'; c.beginPath(); c.moveTo(12, -22); c.lineTo(18, -20); c.lineTo(12, -18.5); c.fill();
  c.fillStyle = '#2b0e00'; circ(c, 9.5, -22, 1.2); c.fill();
  wing(1, false);
  c.restore();
}
function drawDragon(c, L, a) {
  const t = a.t, hov = -10 + Math.sin(t * 2 + a.seed) * 2, flap = Math.sin(t * 4 + a.seed);
  const col = L.body, dark = shade(col, -0.45), belly = '#f0b45a';
  c.save(); c.translate(0, hov);
  const wing = (back) => { c.save(); c.translate(-2, -22); c.rotate(-0.25 + flap * 0.45 * (back ? 0.8 : 1));
    c.fillStyle = back ? shade(col, -0.55) : shade(col, -0.25);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -26); c.lineTo(-34, -30); c.quadraticCurveTo(-30, -20, -32, -12); c.quadraticCurveTo(-24, -12, -22, -4); c.quadraticCurveTo(-14, -6, -8, 4); c.closePath(); c.fill();
    c.strokeStyle = shade(col, -0.6); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-10, -26); c.lineTo(-22, -4); c.moveTo(-10, -26); c.lineTo(-32, -12); c.stroke(); c.restore(); };
  wing(true);
  c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-10, -14); c.quadraticCurveTo(-24, -6, -32, -12 + Math.sin(t * 2.5) * 3); c.stroke(); c.lineCap = 'butt';
  c.fillStyle = dark; c.beginPath(); c.moveTo(-31, -14); c.lineTo(-38, -18); c.lineTo(-35, -10); c.fill();
  c.fillStyle = dark; rr(c, -8, -10, 5, 8, 2); c.fill(); rr(c, 5, -10, 5, 8, 2); c.fill();
  const g = c.createLinearGradient(0, -28, 0, -6); g.addColorStop(0, shade(col, 0.15)); g.addColorStop(1, shade(col, -0.3));
  c.fillStyle = g; ell(c, 0, -16, 15, 10); c.fill();
  c.fillStyle = belly; ell(c, 3, -10, 10, 4); c.fill();
  c.fillStyle = shade(col, 0.3); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8 + i * 5, -25); c.lineTo(-6 + i * 5, -30); c.lineTo(-4 + i * 5, -25); c.fill(); }
  c.strokeStyle = col; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(9, -20); c.quadraticCurveTo(15, -26, 15, -32); c.stroke(); c.lineCap = 'butt';
  const jaw = a.atk > 0 ? a.atk * 0.5 : 0.05;
  c.save(); c.translate(16, -34);
  c.fillStyle = shade(col, -0.1); c.save(); c.rotate(jaw); rr(c, 0, 0, 13, 3.5, 1.5); c.fill(); c.restore();
  if (a.atk > 0) { const fg = c.createRadialGradient(10, 1, 0, 10, 1, 8); fg.addColorStop(0, 'rgba(255,230,120,.95)'); fg.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = fg; circ(c, 10, 1, 8); c.fill(); }
  c.fillStyle = col; c.beginPath(); c.moveTo(-5, -4); c.lineTo(14, -3); c.lineTo(15, 1); c.lineTo(-3, 3); c.closePath(); c.fill(); ell(c, 0, -2, 6.5, 5.5); c.fill();
  c.fillStyle = '#efe0c0'; c.beginPath(); c.moveTo(-3, -6); c.lineTo(-12, -12); c.lineTo(-4, -3); c.fill(); c.beginPath(); c.moveTo(0, -6); c.lineTo(-6, -15); c.lineTo(2, -5); c.fill();
  c.fillStyle = '#ffe14a'; ell(c, 3, -3.5, 2, 1.3); c.fill(); c.fillStyle = '#000'; c.fillRect(2.7, -4.6, 0.8, 2.2);
  c.restore();
  wing(false);
  c.restore();
}
function drawTitan(c, L, a) {
  const t = a.t, ph = a.walk * 5, mv = a.moving ? 1 : 0, col = L.body;
  for (let i = 0; i < 4; i++) { const an = t * 1.2 + i * Math.PI / 2 + a.seed; const x = Math.cos(an) * 20, y = -32 + Math.sin(an) * 7; c.fillStyle = Math.sin(an) > 0 ? '#b06bff' : 'rgba(176,107,255,.5)'; c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 2.5, y); c.lineTo(x, y + 4); c.lineTo(x - 2.5, y); c.fill(); }
  c.fillStyle = '#16101f'; rr(c, -11 + mv * Math.sin(ph) * 2, -14, 9, 14, 3); c.fill(); rr(c, 2 - mv * Math.sin(ph) * 2, -14, 9, 14, 3); c.fill();
  c.fillStyle = shade(col, -0.2); circ(c, -16, -36, 6); c.fill(); rr(c, -21, -34, 9, 20, 4); c.fill();
  const g = c.createLinearGradient(0, -48, 0, -12); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, '#100a1a');
  c.fillStyle = g; c.beginPath(); c.moveTo(-17, -46); c.lineTo(17, -46); c.lineTo(11, -12); c.lineTo(-11, -12); c.closePath(); c.fill();
  const p = 0.6 + 0.4 * Math.sin(t * 4 + a.seed);
  c.strokeStyle = `rgba(190,120,255,${p})`; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-12, -42); c.lineTo(-6, -34); c.lineTo(-10, -22); c.moveTo(12, -40); c.lineTo(7, -30); c.lineTo(10, -18); c.stroke();
  const vg = c.createRadialGradient(0, -31, 0, 0, -31, 7); vg.addColorStop(0, '#000'); vg.addColorStop(0.6, '#1a0630'); vg.addColorStop(1, `rgba(190,120,255,${p})`);
  c.fillStyle = vg; circ(c, 0, -31, 6.5); c.fill();
  c.fillStyle = shade(col, 0.1); rr(c, -6, -58, 13, 12, 4); c.fill();
  c.fillStyle = '#d8c8ff'; c.beginPath(); c.moveTo(-5, -56); c.lineTo(-11, -68); c.lineTo(-2, -57); c.fill(); c.beginPath(); c.moveTo(5, -56); c.lineTo(10, -69); c.lineTo(2, -57); c.fill();
  c.fillStyle = `rgba(220,170,255,${0.8 + p * 0.2})`; c.fillRect(1, -53, 2.5, 2); c.fillRect(4.5, -53, 2.5, 2);
  const sw = a.atk > 0 ? Math.sin((1 - a.atk) * Math.PI) : 0;
  c.save(); c.translate(15, -40); c.rotate(-0.2 + sw * 1.5 - (a.atk > 0.75 ? 1.2 : 0));
  c.fillStyle = shade(col, 0.05); rr(c, -4.5, 0, 9, 18, 4); c.fill();
  c.fillStyle = '#d8c8ff'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 3 - 1, 17); c.lineTo(i * 3.5, 25); c.lineTo(i * 3 + 1.5, 17); c.fill(); }
  c.restore();
}
function drawSkeleton(c, L, a) {
  const t = a.t, ph = a.walk * 9, step = a.moving ? Math.sin(ph) : 0, bone = '#ece6d2';
  c.strokeStyle = bone; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2, -12); c.lineTo(-3 + step * 2.5, 0); c.moveTo(2, -12); c.lineTo(3 - step * 2.5, 0); c.stroke();
  c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -27); c.stroke();
  c.lineWidth = 1.6; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-6, -24 + i * 3.5); c.quadraticCurveTo(0, -22 + i * 3.5, 6, -24 + i * 3.5); c.stroke(); }
  c.lineCap = 'butt';
  c.fillStyle = bone; circ(c, 1, -33, 7.5); c.fill(); rr(c, -2, -29, 8, 5, 1.5); c.fill();
  c.fillStyle = '#1b1210'; circ(c, 3, -34, 2); c.fill(); circ(c, 7, -34, 1.7); c.fill();
  c.fillStyle = '#7dff9b'; circ(c, 3, -34, 0.8); c.fill(); circ(c, 7, -34, 0.7); c.fill();
  const p = 1 - a.atk; const ang = a.atk > 0 ? (p < 0.35 ? lerp(-1.4, 1.9, p / 0.35) : lerp(1.9, 0.35, (p - 0.35) / 0.65)) : 0.4;
  c.save(); c.translate(6, -18); c.rotate(ang); c.fillStyle = '#9a7b52';
  c.beginPath(); c.moveTo(-1.5, -2); c.lineTo(-1.5, -17); c.lineTo(0, -20); c.lineTo(1.5, -17); c.lineTo(1.5, -2); c.fill(); c.fillStyle = '#5a4030'; c.fillRect(-4, -3.5, 8, 2); c.restore();
}

// ---------- generic figure ----------
// draws def at (X,Y) feet position in px; k = px per unit; face 1/-1
function drawFigure(c, def, X, Y, k, face, a) {
  c.save(); c.translate(X, Y); c.scale(face * k, k);
  switch (def.look.creature) {
    case 'wolf': drawWolf(c, def.look, a); break;
    case 'griffin': drawGriffin(c, def.look, a); break;
    case 'golem': drawGolem(c, def.look, a); break;
    case 'phoenix': drawPhoenix(c, def.look, a); break;
    case 'dragon': drawDragon(c, def.look, a); break;
    case 'titan': drawTitan(c, def.look, a); break;
    case 'skeleton': drawSkeleton(c, def.look, a); break;
    default: drawHumanoid(c, def, a);
  }
  c.restore();
}
const figureHeight = def => ({ dragon: 50, titan: 70, golem: 56, phoenix: 58, griffin: 40 }[def.look.creature] || 46);

// ---------- portraits ----------
const portraitCache = {};
function portrait(def, size = 128) {
  const key = def.id + size;
  if (portraitCache[key]) return portraitCache[key];
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const c = cv.getContext('2d');
  const col = RAR[def.rar].color;
  const g = c.createRadialGradient(size / 2, size * 0.6, 4, size / 2, size * 0.6, size * 0.6);
  g.addColorStop(0, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, size / 2, size * 0.86, size * 0.24, size * 0.06); c.fill();
  const h = figureHeight(def) + (def.fly ? 20 : 0);
  const k = Math.min(size * 0.72 / h, size / 52);
  drawFigure(c, def, size / 2 - (def.look.creature === 'dragon' ? -size * 0.05 : 0), size * 0.86, k, 1, { t: 0.6, walk: 0, moving: false, atk: 0, cast: 0, seed: 1 });
  return portraitCache[key] = cv.toDataURL();
}

// ---------- arena background ----------
let bgCanvas = null;
function buildBackground() {
  bgCanvas = document.createElement('canvas'); bgCanvas.width = CW; bgCanvas.height = CH;
  const c = bgCanvas.getContext('2d');
  const sr = (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  c.fillStyle = '#100c18'; c.fillRect(0, 0, CW, CH);
  // back wall
  const wg = c.createLinearGradient(0, 0, 0, OY); wg.addColorStop(0, '#1b1626'); wg.addColorStop(1, '#2a2236');
  c.fillStyle = wg; c.fillRect(0, 0, CW, OY);
  for (let row = 0; row < 3; row++) for (let x = -(row % 2) * 30; x < CW; x += 60) {
    c.fillStyle = `rgba(${60 + sr() * 25},${50 + sr() * 20},${80 + sr() * 25},.55)`;
    rr(c, x + 2, row * 16 + 4, 56, 13, 2); c.fill();
  }
  c.fillStyle = '#0c0912'; c.fillRect(0, OY - 6, CW, 6);
  // floor tiles
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const v = sr() * 10;
    const base = x < 4 ? [38, 44, 66] : x > 7 ? [62, 38, 50] : [46, 40, 58];
    c.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
    c.fillRect(PX(x) + 1, PY(y) + 1, CELL - 2, CELL - 2);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(PX(x) + 1, PY(y) + 1, CELL - 2, 2); c.fillRect(PX(x) + 1, PY(y) + 1, 2, CELL - 2);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(PX(x) + 1, PY(y + 1) - 3, CELL - 2, 2);
    if (sr() < 0.25) { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.beginPath(); let cx = PX(x) + sr() * CELL, cy = PY(y) + sr() * CELL; c.moveTo(cx, cy); for (let i = 0; i < 3; i++) { cx += (sr() - 0.5) * 20; cy += (sr() - 0.5) * 20; c.lineTo(cx, cy); } c.stroke(); }
  }
  // center emblem
  const cx = PX(6), cy = PY(3);
  c.strokeStyle = 'rgba(233,185,73,.16)'; c.lineWidth = 3; circ(c, cx, cy, 120); c.stroke(); c.lineWidth = 1.5; circ(c, cx, cy, 104); c.stroke();
  for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; c.beginPath(); c.moveTo(cx + Math.cos(an) * 104, cy + Math.sin(an) * 104); c.lineTo(cx + Math.cos(an) * 120, cy + Math.sin(an) * 120); c.stroke(); }
  c.beginPath(); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 - Math.PI / 2; c.lineTo(cx + Math.cos(an) * 60, cy + Math.sin(an) * 60); } c.closePath(); c.stroke();
  // zone lines
  c.strokeStyle = rgba(TEAMC[0], 0.35); c.lineWidth = 2; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(PX(4), PY(0)); c.lineTo(PX(4), PY(AH)); c.stroke();
  c.strokeStyle = rgba(TEAMC[1], 0.35); c.beginPath(); c.moveTo(PX(8), PY(0)); c.lineTo(PX(8), PY(AH)); c.stroke(); c.setLineDash([]);
  // warm light & vignette
  const lg = c.createRadialGradient(cx, cy, 40, cx, cy, CW * 0.6); lg.addColorStop(0, 'rgba(255,190,110,.10)'); lg.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = lg; c.fillRect(0, 0, CW, CH);
  // front ledge
  c.fillStyle = '#0b0810'; c.fillRect(0, PY(AH) + 4, CW, CH);
  c.fillStyle = '#2a2236'; c.fillRect(0, PY(AH) + 2, CW, 5);
}
const TORCHES = [90, 330, 570, 810];
function drawTorches(c, t) {
  for (const [i, x] of TORCHES.entries()) {
    const f = 0.8 + Math.sin(t * 9 + i * 2) * 0.1 + Math.sin(t * 23 + i) * 0.06;
    const g = c.createRadialGradient(x, 20, 2, x, 20, 90 * f); g.addColorStop(0, 'rgba(255,170,70,.28)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g; circ(c, x, 20, 90 * f); c.fill();
    c.fillStyle = '#3a2c20'; c.fillRect(x - 3, 22, 6, 18);
    c.fillStyle = '#ff9a2b'; c.beginPath(); c.moveTo(x - 6, 24); c.quadraticCurveTo(x - 4 + Math.sin(t * 11 + i) * 2, 10 - f * 6, x, 6 - f * 6); c.quadraticCurveTo(x + 4, 12, x + 6, 24); c.fill();
    c.fillStyle = '#ffe58a'; c.beginPath(); c.moveTo(x - 3, 24); c.quadraticCurveTo(x, 14 - f * 4, x + 3, 24); c.fill();
  }
}

// ---------- visual FX ----------
const VFX = { parts: [], texts: [], effects: [] };
function resetVFX() { VFX.parts = []; VFX.texts = []; VFX.effects = []; }
function part(x, y, o) { if (VFX.parts.length > 900) return; VFX.parts.push(Object.assign({ x, y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 3, color: '#fff', g: 0, drag: 0.92, kind: 'dot' }, o)); }
function burstParts(x, y, n, color, sp = 120, o = {}) { for (let i = 0; i < n; i++) { const an = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random()); const l = 0.3 + Math.random() * 0.4; part(x, y, Object.assign({ vx: Math.cos(an) * v, vy: Math.sin(an) * v - 30, life: l, max: l, size: 2 + Math.random() * 3, color }, o)); } }

function consumeFx(B, onCast) {
  for (const e of B.fx) {
    const x = e.x != null ? PX(e.x) : 0, y = e.y != null ? PY(e.y) : 0;
    switch (e.type) {
      case 'text': VFX.texts.push({ x, y, text: String(e.text), color: e.color, size: e.size, life: 0.9, max: 0.9, vx: (Math.random() - 0.5) * 20 }); break;
      case 'slash': VFX.effects.push({ type: 'slash', x, y, face: e.face, big: e.big, color: e.color, life: 0.18, max: 0.18 }); SFX.hit(); break;
      case 'explosion': VFX.effects.push({ type: 'ring', x, y, r: e.r * CELL, color: e.color, life: 0.45, max: 0.45, fill: true });
        burstParts(x, y, e.small ? 8 : 26, e.color, e.small ? 90 : 220); if (!e.small) { burstParts(x, y, 10, '#555', 60, { kind: 'smoke', size: 10, life: 0.9, max: 0.9, vy: -40 }); SFX.boom(); } break;
      case 'burst': burstParts(x, y, e.n || 5, e.color, 80); break;
      case 'chain': VFX.effects.push({ type: 'chain', pts: e.pts.map(p => ({ x: PX(p.x), y: p.y < 0 ? 0 : PY(p.y) })), color: e.color, life: e.big ? 0.4 : 0.22, max: e.big ? 0.4 : 0.22, big: e.big }); SFX.zap(); break;
      case 'death': burstParts(x, y - 20, 18, TEAMC[e.team], 140); part(x, y - 20, { kind: 'soul', vy: -50, life: 1.2, max: 1.2, size: 7, color: 'rgba(220,230,255,.8)', drag: 1 }); SFX.die(); break;
      case 'revive': VFX.effects.push({ type: 'pillar', x, y, color: e.kind === 'raise' ? '#7dff9b' : e.kind === 'rebirth' ? '#ff8a2b' : '#ffe066', life: 0.9, max: 0.9 }); burstParts(x, y - 20, 16, e.kind === 'raise' ? '#7dff9b' : '#ffe066', 90); break;
      case 'poof': burstParts(x, y - 20, 14, e.color, 100, { kind: 'smoke', size: 7 }); break;
      case 'sparkle': for (let i = 0; i < (e.n || 5); i++) part(x + (Math.random() - 0.5) * 30, y - Math.random() * 40, { kind: 'plus', vy: -40, life: 0.8, max: 0.8, size: 4, color: e.color, drag: 0.97 }); break;
      case 'ring': VFX.effects.push({ type: 'ring', x, y, r: e.r * CELL, color: e.color, life: 0.6, max: 0.6, fill: e.fill }); break;
      case 'meteor': VFX.effects.push({ type: 'meteor', x, y, r: e.r * CELL, life: e.delay, max: e.delay }); SFX.whoosh(); break;
      case 'beam': VFX.effects.push({ type: 'beam', x, y, color: e.color, life: 0.6, max: 0.6 }); burstParts(x, y - 10, 20, '#fff3b0', 160); SFX.boom(); break;
      case 'frostnova': VFX.effects.push({ type: 'ring', x, y, r: e.r * CELL, color: '#bff3ff', life: 0.6, max: 0.6, fill: true }); burstParts(x, y, 30, '#dff8ff', 200, { kind: 'shard' }); SFX.freeze(); break;
      case 'whirl': VFX.effects.push({ type: 'whirl', x, y, r: e.r * CELL, life: 0.4, max: 0.4 }); SFX.hit(); break;
      case 'voidpull': VFX.effects.push({ type: 'voidpull', x, y, r: e.r * CELL, life: 0.8, max: 0.8 }); SFX.whoosh(); break;
      case 'teamflash': VFX.effects.push({ type: 'teamflash', team: e.team, color: e.color, life: 0.8, max: 0.8 }); SFX.cast(); break;
      case 'quake': for (let i = 0; i < 40; i++) part(Math.random() * CW, PY(Math.random() * AH), { kind: 'smoke', vy: -30, size: 8, life: 0.8, max: 0.8, color: '#8a7358' }); SFX.boom(); break;
      case 'arrowwave': for (let i = 0; i < 9; i++) { const an = Math.random() * Math.PI * 2, rr2 = Math.sqrt(Math.random()) * e.r * CELL; part(x + Math.cos(an) * rr2, y + Math.sin(an) * rr2 - 120, { kind: 'arrow', vy: 600, vx: 40, life: 0.2, max: 0.2, drag: 1, color: '#e8d6a8' }); } break;
      case 'cast': if (onCast) onCast(e); break;
      case 'banner': if (onCast) onCast(e); break;
    }
  }
  B.fx.length = 0;
}

function updateVFX(dt) {
  for (const p of VFX.parts) { p.life -= dt; p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  VFX.parts = VFX.parts.filter(p => p.life > 0);
  for (const t of VFX.texts) { t.life -= dt; t.y -= 38 * dt; t.x += t.vx * dt; }
  VFX.texts = VFX.texts.filter(t => t.life > 0);
  for (const e of VFX.effects) e.life -= dt;
  VFX.effects = VFX.effects.filter(e => e.life > 0);
}

function drawGroundEffects(c, B, t) {
  for (const z of B.zones) {
    const x = PX(z.x), y = PY(z.y), r = z.r * CELL;
    if (z.kind === 'poison') {
      const g = c.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, 'rgba(140,255,90,.35)'); g.addColorStop(1, 'rgba(60,160,40,.05)');
      c.fillStyle = g; circ(c, x, y, r); c.fill();
      for (let i = 0; i < 9; i++) { const an = i * 0.7 + t * 0.6, rr2 = r * (0.3 + (i % 3) * 0.22); c.fillStyle = 'rgba(150,255,100,.18)'; circ(c, x + Math.cos(an) * rr2, y + Math.sin(an) * rr2 * 0.7 - 6, 16 + (i % 3) * 5); c.fill(); }
      if (Math.random() < 0.3) part(x + (Math.random() - 0.5) * r * 1.6, y + (Math.random() - 0.5) * r, { vy: -30, size: 3, life: 0.7, max: 0.7, color: '#a6ff6b' });
    } else if (z.kind === 'arrows') {
      c.strokeStyle = 'rgba(232,214,168,.5)'; c.lineWidth = 2; c.setLineDash([6, 6]); circ(c, x, y, r); c.stroke(); c.setLineDash([]);
    } else if (z.kind === 'hole') {
      const k = z.t / z.dur;
      const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(0.25, 'rgba(40,10,70,.8)'); g.addColorStop(1, 'rgba(176,107,255,0)');
      c.fillStyle = g; circ(c, x, y, r * (0.6 + 0.4 * k)); c.fill();
      c.strokeStyle = 'rgba(200,150,255,.7)'; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x, y, r * (0.3 + i * 0.15) * (1 - k * 0.3), t * 4 + i, t * 4 + i + 1.8); c.stroke(); }
      if (Math.random() < 0.8) { const an = Math.random() * 6.28; part(x + Math.cos(an) * r, y + Math.sin(an) * r, { vx: -Math.cos(an) * 160, vy: -Math.sin(an) * 160, life: 0.5, max: 0.5, color: '#c9a6ff', size: 2.5, drag: 1 }); }
    }
  }
}

function drawProjectile(c, p) {
  const x = PX(p.x), y = PY(p.y), a = p.ang || 0;
  c.save(); c.translate(x, y); c.rotate(a);
  switch (p.kind) {
    case 'arrow': c.strokeStyle = '#e8d6a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 0); c.lineTo(6, 0); c.stroke(); c.fillStyle = '#ddd'; c.beginPath(); c.moveTo(9, 0); c.lineTo(4, -3); c.lineTo(4, 3); c.fill(); c.fillStyle = '#c33'; c.fillRect(-13, -2, 4, 4); break;
    case 'bolt': c.strokeStyle = '#bbb'; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, 0); c.lineTo(6, 0); c.stroke(); c.fillStyle = '#eee'; c.beginPath(); c.moveTo(10, 0); c.lineTo(5, -3.5); c.lineTo(5, 3.5); c.fill(); break;
    case 'note': c.fillStyle = '#ffe27a'; circ(c, 0, 3, 3.5); c.fill(); c.fillRect(2.5, -7, 1.6, 10); break;
    default: {
      const col = { fire: ['#fff1a8', '#ff7a1c'], breath: ['#fff1a8', '#ff4a1c'], holy: ['#ffffff', '#ffe680'], healorb: ['#ffffff', '#5dff9a'], shadow: ['#d8ffe0', '#3fbf6a'], frost: ['#ffffff', '#7fdcff'], arcane: ['#ffffff', '#b07bff'] }[p.kind] || ['#fff', '#aaa'];
      const r = p.kind === 'breath' ? 13 : p.kind === 'fire' ? 8 : 6;
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.8); g.addColorStop(0, col[0]); g.addColorStop(0.4, col[1]); g.addColorStop(1, rgba(hex6(col[1]), 0));
      c.fillStyle = g; circ(c, 0, 0, r * 1.8); c.fill();
      if (Math.random() < 0.7) part(x, y, { vx: -Math.cos(a) * 40 + (Math.random() - 0.5) * 30, vy: -Math.sin(a) * 40 + (Math.random() - 0.5) * 30, life: 0.3, max: 0.3, size: r * 0.5, color: col[1] });
    }
  }
  c.restore();
}

function drawEffect(c, e, B) {
  const k = 1 - e.life / e.max;
  c.save();
  switch (e.type) {
    case 'slash': {
      c.translate(e.x, e.y); c.scale(e.face, 1); c.globalAlpha = 1 - k; c.strokeStyle = e.color; c.lineWidth = e.big ? 6 : 4; c.lineCap = 'round';
      c.beginPath(); c.arc(-6, 0, e.big ? 30 : 20, -1.2 + k * 0.6, 0.9 + k * 0.6); c.stroke(); break;
    }
    case 'ring': {
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = e.color; c.lineWidth = 4 * (1 - k) + 1;
      c.beginPath(); c.ellipse(e.x, e.y, e.r * (0.4 + 0.6 * k), e.r * (0.4 + 0.6 * k) * 0.75, 0, 0, Math.PI * 2); c.stroke();
      if (e.fill) { c.fillStyle = rgba(hex6(e.color), 0.25 * (1 - k)); c.fill(); }
      break;
    }
    case 'chain': {
      c.globalAlpha = 1 - k; c.strokeStyle = e.color; c.lineWidth = e.big ? 4 : 2.5; c.shadowColor = e.color; c.shadowBlur = 12;
      c.beginPath(); e.pts.forEach((p, i) => { if (!i) { c.moveTo(p.x, p.y); return; } const q = e.pts[i - 1]; for (let s = 1; s <= 5; s++) { const f = s / 5; c.lineTo(lerp(q.x, p.x, f) + (s < 5 ? (Math.random() - 0.5) * 14 : 0), lerp(q.y, p.y, f) + (s < 5 ? (Math.random() - 0.5) * 14 : 0)); } }); c.stroke(); break;
    }
    case 'pillar': {
      c.globalAlpha = Math.sin(k * Math.PI); const g = c.createLinearGradient(e.x, e.y - 120, e.x, e.y);
      g.addColorStop(0, rgba(hex6(e.color), 0)); g.addColorStop(1, rgba(hex6(e.color), 0.7)); c.fillStyle = g; c.fillRect(e.x - 18, e.y - 120, 36, 124); break;
    }
    case 'meteor': {
      const sx = e.x - 260, sy = -60; const mx = lerp(sx, e.x, k), my = lerp(sy, e.y - 10, k);
      c.strokeStyle = 'rgba(255,90,40,.3)'; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.75, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = `rgba(255,80,30,${0.15 + k * 0.25})`; c.fill();
      const g = c.createRadialGradient(mx, my, 2, mx, my, 34); g.addColorStop(0, '#fff3c0'); g.addColorStop(0.3, '#ff8a2b'); g.addColorStop(1, 'rgba(255,60,20,0)');
      c.fillStyle = g; circ(c, mx, my, 34); c.fill(); c.fillStyle = '#5a2c1a'; circ(c, mx, my, 11); c.fill();
      part(mx, my, { vx: -120 + Math.random() * 40, vy: -60 + Math.random() * 40, life: 0.4, max: 0.4, size: 7, color: '#ff7a1c' });
      break;
    }
    case 'beam': {
      c.globalAlpha = Math.sin(k * Math.PI); const w = 26 * (1 - k * 0.5);
      const g = c.createLinearGradient(e.x - w, 0, e.x + w, 0); g.addColorStop(0, 'rgba(255,243,176,0)'); g.addColorStop(0.5, 'rgba(255,255,240,.95)'); g.addColorStop(1, 'rgba(255,243,176,0)');
      c.fillStyle = g; c.fillRect(e.x - w, 0, w * 2, e.y); c.fillStyle = 'rgba(255,250,210,.6)'; c.beginPath(); c.ellipse(e.x, e.y, 40, 16, 0, 0, Math.PI * 2); c.fill(); break;
    }
    case 'whirl': {
      c.globalAlpha = 1 - k; c.strokeStyle = '#fff1c8'; c.lineWidth = 5; c.translate(e.x, e.y - 15); c.rotate(k * 9);
      c.beginPath(); c.arc(0, 0, e.r * 0.8, 0, 4.5); c.stroke(); break;
    }
    case 'voidpull': {
      c.globalAlpha = 1 - k; c.strokeStyle = '#b06bff'; c.lineWidth = 3; c.beginPath(); c.ellipse(e.x, e.y, e.r * (1 - k), e.r * (1 - k) * 0.75, 0, 0, Math.PI * 2); c.stroke(); break;
    }
    case 'teamflash': {
      c.globalAlpha = Math.sin(k * Math.PI) * 0.8;
      for (const u of B.alive[e.team]) { const g = c.createRadialGradient(PX(u.x), PY(u.y) - 20, 2, PX(u.x), PY(u.y) - 20, 40 * u.size); g.addColorStop(0, rgba(hex6(e.color), 0.6)); g.addColorStop(1, rgba(hex6(e.color), 0)); c.fillStyle = g; circ(c, PX(u.x), PY(u.y) - 20, 40 * u.size); c.fill(); }
      break;
    }
  }
  c.restore();
}

function drawParticles(c) {
  for (const p of VFX.parts) {
    const a = Math.max(0, p.life / p.max);
    c.globalAlpha = a;
    if (p.kind === 'smoke') { c.fillStyle = p.color; circ(c, p.x, p.y, p.size * (1.6 - a * 0.6)); c.fill(); }
    else if (p.kind === 'plus') { c.fillStyle = p.color; c.fillRect(p.x - p.size, p.y - 1.2, p.size * 2, 2.4); c.fillRect(p.x - 1.2, p.y - p.size, 2.4, p.size * 2); }
    else if (p.kind === 'shard') { c.fillStyle = p.color; c.save(); c.translate(p.x, p.y); c.rotate(p.x); c.fillRect(-1, -4, 2, 8); c.restore(); }
    else if (p.kind === 'arrow') { c.strokeStyle = p.color; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 3, p.y - 14); c.stroke(); }
    else if (p.kind === 'soul') { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2); g.addColorStop(0, 'rgba(230,240,255,.9)'); g.addColorStop(1, 'rgba(180,200,255,0)'); c.fillStyle = g; circ(c, p.x, p.y, p.size * 2); c.fill(); }
    else { c.fillStyle = p.color; circ(c, p.x, p.y, p.size * (0.5 + a * 0.5)); c.fill(); }
  }
  c.globalAlpha = 1;
}
function drawTexts(c) {
  c.textAlign = 'center'; c.lineJoin = 'round';
  for (const t of VFX.texts) {
    const a = Math.min(1, t.life / t.max * 2); const pop = 1 + Math.max(0, (t.life - t.max + 0.12)) * 4;
    c.globalAlpha = a; c.font = `800 ${Math.round(t.size * pop)}px Nunito, system-ui, sans-serif`;
    c.strokeStyle = 'rgba(10,6,16,.9)'; c.lineWidth = 3.5; c.strokeText(t.text, t.x, t.y); c.fillStyle = t.color; c.fillText(t.text, t.x, t.y);
  }
  c.globalAlpha = 1;
}

// ---------- unit on arena ----------
function unitK(u) { return CELL / 70 * 1.08 * u.size / (u.def.size || 1) * (u.def.size || 1); }
function drawUnitShadow(c, u) {
  const x = PX(u.x), y = PY(u.y) + 6;
  c.fillStyle = 'rgba(0,0,0,.4)'; ell(c, x, y, 17 * u.size, 6 * u.size); c.fill();
}
function drawUnitOnArena(c, u, t, opts = {}) {
  const x = PX(u.x), y = PY(u.y) + 6;
  const dead = !u.alive;
  if (dead) {
    if (u.pending) { c.fillStyle = 'rgba(60,40,30,.9)'; ell(c, x, y, 14, 5); c.fill(); for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(255,${120 + i * 40},40,${0.5 + Math.sin(t * 8 + i) * 0.3})`; circ(c, x - 6 + i * 6, y - 2, 2); c.fill(); } return; }
    if (u.anim.deathT > 0.6) { if (!u.summon) { c.globalAlpha = 0.35; c.fillStyle = '#d8d0c0'; ell(c, x, y - 1, 8, 3); c.fill(); circ(c, x + 3, y - 4, 3.5); c.fill(); c.globalAlpha = 1; } return; }
  }
  const team = u.team;
  // team ring
  if (!dead) {
    c.strokeStyle = rgba(TEAMC[team], opts.sel ? 1 : 0.75); c.lineWidth = opts.sel ? 3 : 2;
    ell(c, x, y, 18 * u.size, 7 * u.size); c.stroke();
    c.fillStyle = rgba(TEAMC[team], 0.12); c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, x, y, 15 * u.size, 5 * u.size); c.fill();
  const k = CELL / 70 * 1.2 * u.size;
  const a = { t, walk: u.anim.walk, moving: u.anim.moving, atk: u.anim.atk, cast: u.anim.cast, seed: u.uid * 1.7 };
  c.save();
  if (dead) { c.globalAlpha = Math.max(0, 1 - u.anim.deathT / 0.6); c.translate(0, u.anim.deathT * 20); }
  if (u.anim.spawn > 0) { c.globalAlpha = 1 - u.anim.spawn; }
  if (u.raised) c.filter = 'hue-rotate(90deg) saturate(.6) brightness(1.1)';
  if (u.anim.flash > 0) c.filter = 'brightness(2.6)';
  if (u.st && u.st.freeze > 0) c.filter = 'saturate(.3) brightness(1.3) hue-rotate(170deg)';
  drawFigure(c, u.def, x, y, k, u.anim.face, a);
  c.filter = 'none';
  c.restore();
  if (dead) return;
  const top = y - figureHeight(u.def) * k - (u.def.fly ? 16 * k : 0) - 6;
  // statuses
  const s = u.st;
  if (s.freeze > 0) { c.fillStyle = 'rgba(190,240,255,.35)'; c.strokeStyle = 'rgba(220,250,255,.8)'; c.lineWidth = 1.5; rr(c, x - 16 * u.size, top + 6, 32 * u.size, y - top - 6, 6); c.fill(); c.stroke(); }
  if (s.stun > 0) for (let i = 0; i < 3; i++) { const an = t * 6 + i * 2.1; c.fillStyle = '#ffe27a'; star(c, x + Math.cos(an) * 12, top + 2 + Math.sin(an) * 4, 3.5); }
  if (s.shield > 0) { c.strokeStyle = 'rgba(160,220,255,.8)'; c.fillStyle = 'rgba(160,220,255,.12)'; c.lineWidth = 2; ell(c, x, (y + top) / 2 + 4, 22 * u.size, (y - top) / 2 + 4); c.fill(); c.stroke(); }
  if (s.inv > 0) { c.strokeStyle = 'rgba(255,220,90,.9)'; c.lineWidth = 3; ell(c, x, (y + top) / 2 + 4, 24 * u.size, (y - top) / 2 + 6); c.stroke(); }
  if (s.burn > 0 && Math.random() < 0.35) part(x + (Math.random() - 0.5) * 20 * u.size, y - Math.random() * (y - top), { vy: -50, size: 3, life: 0.45, max: 0.45, color: Math.random() < 0.5 ? '#ff8a2b' : '#ffd34a' });
  if (s.poison > 0 && Math.random() < 0.25) part(x + (Math.random() - 0.5) * 20 * u.size, y - Math.random() * (y - top), { vy: -30, size: 2.5, life: 0.6, max: 0.6, color: '#a6ff6b' });
  if ((s.rage > 0 || s.blood > 0) && Math.random() < 0.3) part(x + (Math.random() - 0.5) * 26, y - 4, { vy: -70, size: 3, life: 0.5, max: 0.5, color: s.blood > 0 ? '#ff2a4a' : '#ff5a3c' });
  if (s.warp > 0 || s.slow > 0) { c.strokeStyle = 'rgba(126,240,255,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y - 4, 14 * u.size, t * 3, t * 3 + 2.5); c.stroke(); }
  if (s.curse > 0) { c.fillStyle = '#c47bff'; c.font = '700 12px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('☠', x, top - 12); }
  // health bar
  const w = clamp(36 * u.size, 34, 74), hh = 5, bx = x - w / 2, by = top - 6;
  u.dispHp = lerp(u.dispHp ?? u.hp, u.hp, 0.25); u.lagHp = Math.max(u.dispHp, (u.lagHp ?? u.hp) - u.maxHp * 0.006);
  if (u.lagHp < u.dispHp) u.lagHp = u.dispHp;
  c.fillStyle = 'rgba(8,5,14,.85)'; rr(c, bx - 1.5, by - 1.5, w + 3, hh + 3, 3); c.fill();
  c.fillStyle = 'rgba(255,240,220,.7)'; c.fillRect(bx, by, w * clamp(u.lagHp / u.maxHp, 0, 1), hh);
  const hg = c.createLinearGradient(0, by, 0, by + hh); hg.addColorStop(0, shade(TEAMC[team], 0.3)); hg.addColorStop(1, shade(TEAMC[team], -0.2));
  c.fillStyle = hg; c.fillRect(bx, by, w * clamp(u.dispHp / u.maxHp, 0, 1), hh);
  if (s.shield > 0) { c.fillStyle = 'rgba(230,245,255,.85)'; c.fillRect(bx, by - 3, w * clamp(s.shield / u.maxHp, 0, 1), 2.5); }
  c.fillStyle = RAR[u.def.rar].color; c.save(); c.translate(bx - 6, by + hh / 2); c.rotate(Math.PI / 4); c.fillRect(-3, -3, 6, 6); c.restore();
  if (u.lifeT > 0) { c.fillStyle = 'rgba(125,255,155,.8)'; c.fillRect(bx, by + hh + 1.5, w * clamp(u.lifeT / 15, 0, 1), 1.5); }
}
function star(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(an) * rr2, y + Math.sin(an) * rr2); } c.closePath(); c.fill(); }

// ---------- full scene ----------
function drawScene(c, B, t, overlay) {
  if (!bgCanvas) buildBackground();
  c.save();
  if (B && B.shake > 0) c.translate((Math.random() - 0.5) * B.shake * 14, (Math.random() - 0.5) * B.shake * 10);
  c.drawImage(bgCanvas, 0, 0);
  drawTorches(c, t);
  if (overlay && overlay.under) overlay.under(c);
  if (B) {
    drawGroundEffects(c, B, t);
    const list = B.units.slice().sort((a, b) => (a.alive - b.alive) || (a.y - b.y));
    for (const u of list) drawUnitOnArena(c, u, t, { sel: overlay && overlay.sel === u });
    for (const p of B.proj) drawProjectile(c, p);
    for (const e of VFX.effects) drawEffect(c, e, B);
  }
  drawParticles(c);
  drawTexts(c);
  if (overlay && overlay.over) overlay.over(c);
  c.restore();
}

// ---------- icons (SVG) ----------
const ICON_PATHS = {
  sharp: '<path d="M5 27 21 11M21 11l4-5 1 1-5 4M8 21l3 3M27 27 11 11M11 11 6 6 7 5l5 4M24 21l-3 3"/>',
  iron: '<path d="M16 3 27 7v8c0 7-5 11-11 14C10 26 5 22 5 15V7z"/><path d="M11 12h10M11 17h10"/>',
  swift: '<path d="M9 23h11l6-3v-4h-6l-2-8h-5v12z"/><path d="M2 11h6M3 16h5M2 21h4"/>',
  eagle: '<path d="M3 16c5-8 21-8 26 0-5 8-21 8-26 0z"/><circle cx="16" cy="16" r="4"/>',
  crit: '<path d="m16 3 3 10 10 3-10 3-3 10-3-10-10-3 10-3z"/>',
  regen: '<circle cx="16" cy="16" r="12"/><path d="M16 9v14M9 16h14"/>',
  fire: '<path d="M16 3c4 7 10 10 8 18-1 5-5 8-8 8-5 0-9-4-8-10 1-4 4-5 4-9 2 2 3 4 3 6 2-4 2-9 1-13z"/>',
  thorns: '<circle cx="16" cy="16" r="7"/><path d="M16 2v6M16 24v6M2 16h6M24 16h6M6 6l4 4M22 22l4 4M26 6l-4 4M6 26l4-4"/>',
  folk: '<circle cx="9" cy="12" r="3"/><circle cx="23" cy="12" r="3"/><circle cx="16" cy="10" r="4"/><path d="M3 26c0-5 3-8 6-8M29 26c0-5-3-8-6-8M8 28c0-6 4-10 8-10s8 4 8 10"/>',
  venom: '<path d="M21 4 28 11 14 25l-6-1-1-6z"/><path d="M8 30c-3-3-1-5 0-7 1 2 3 4 0 7z"/>',
  vamp: '<path d="M16 4c6 8 9 13 9 17a9 9 0 0 1-18 0c0-4 3-9 9-17z"/><path d="m12 19 2 4 2-4 2 4 2-4"/>',
  giant: '<path d="m16 3 7 8h-4v5h-6v-5H9z"/><circle cx="16" cy="21" r="3"/><path d="M10 30c0-4 3-5 6-5s6 1 6 5"/>',
  banner: '<path d="M8 29V3M8 4h16l-4 6 4 6H8"/>',
  holy: '<circle cx="16" cy="16" r="5"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l3 3M22 22l3 3M25 7l-3 3M7 25l3-3"/>',
  hero: '<path d="m5 12 5 5 6-9 6 9 5-5-2 14H7z"/>',
  martyr: '<path d="M16 27C6 20 3 15 3 10a6 6 0 0 1 13-2 6 6 0 0 1 13 2c0 5-3 10-13 17z"/><path d="m16 8-3 6 5 3-3 6"/>',
  gods: '<path d="m16 6 3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/><path d="M3 10c3 6 6 8 9 9M29 10c-3 6-6 8-9 9"/>',
  soul: '<path d="M16 28c-6-4-8-10-6-16 2 4 4 5 6 5s4-1 6-5c2 6 0 12-6 16z"/><path d="M16 17V6M12 9l4-4 4 4"/>',
  heal: '<path d="M12 4h8v8h8v8h-8v8h-8v-8H4v-8h8z"/>',
  shield: '<path d="M16 3 27 7v8c0 7-5 12-11 14C10 27 5 22 5 15V7z"/><path d="M16 8v16M10 14h12"/>',
  tele: '<path d="M16 16a2 2 0 1 1 2 2 5 5 0 1 1-6-5 8 8 0 1 1-3 9"/><path d="M24 4l3 3-3 3"/>',
  arrows: '<path d="M8 3v18M16 3v22M24 3v18M5 18l3 4 3-4M13 22l3 4 3-4M21 18l3 4 3-4"/>',
  freeze: '<path d="M16 3v26M5 9.5l22 13M27 9.5l-22 13M12 5l4 3 4-3M12 27l4-3 4 3"/>',
  lightning: '<path d="M18 2 7 18h8l-3 12 13-18h-8z"/>',
  rage: '<path d="M6 28 10 10l4 8 2-14 2 14 4-8 4 18z"/>',
  curse: '<circle cx="16" cy="14" r="10"/><circle cx="12" cy="13" r="2.5"/><circle cx="20" cy="13" r="2.5"/><path d="M11 24v5M16 24v5M21 24v5"/>',
  meteor: '<circle cx="20" cy="20" r="7"/><path d="M15 15 4 4M18 13 10 3M13 18 3 10"/>',
  poison: '<path d="M8 20a5 5 0 0 1 2-9 7 7 0 0 1 13 1 4.5 4.5 0 0 1 1 8z"/><path d="M11 24v3M16 24v5M21 24v3"/>',
  skeletons: '<path d="M8 15a8 8 0 1 1 16 0v5h-3v4H11v-4H8z"/><circle cx="12.5" cy="15" r="2"/><circle cx="19.5" cy="15" r="2"/>',
  quake: '<path d="M2 20h28M6 20l3-6 3 4 4-9 3 7 3-4 4 8"/><path d="m14 20 2 4-2 4M21 20l-1 6"/>',
  warp: '<path d="M8 3h16M8 29h16M10 3c0 8 12 8 12 13s-12 5-12 13M22 3c0 8-12 8-12 13s12 5 12 13"/>',
  blood: '<path d="M20 4a12 12 0 1 0 8 18A10 10 0 1 1 20 4z"/><path d="M12 13c-3 4 0 6 0 6s3-2 0-6z"/>',
  smite: '<path d="M12 2h8l-2 20h-4z"/><path d="M6 28c3-4 7-6 10-6s7 2 10 6"/>',
  resurrect: '<circle cx="16" cy="9" r="5"/><path d="M16 14v16M9 19h14"/>',
  inv: '<path d="M4 24a12 12 0 0 1 24 0z"/><path d="M2 24h28M16 9V5M9 11 7 8M23 11l2-3"/>',
  hole: '<circle cx="16" cy="16" r="3.5"/><path d="M16 11c6-4 12 0 10 6M21 16c4 6 0 12-6 10M16 21c-6 4-12 0-10-6M11 16C7 10 11 4 17 6"/>',
};
function iconSVG(id, size = 32, color = 'currentColor') {
  return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[id] || ''}</svg>`;
}
