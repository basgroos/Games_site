// ================= BUILD HELPERS: procedural textures, materials, walls, doors, furniture =================
function ctex(w, h, draw, o = {}){
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (!o.linear) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
function speckle(x, w, h, n, a, light = false){ for (let i = 0; i < n; i++){ x.fillStyle = (light ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (Math.random() * a) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
function grime(x, w, h, s = 0.35){ const g = x.createLinearGradient(0, h, 0, h * 0.6); g.addColorStop(0, 'rgba(20,15,10,' + s + ')'); g.addColorStop(1, 'rgba(20,15,10,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++){ const gx = Math.random() * w; const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, 'rgba(60,50,30,.12)'); gg.addColorStop(1, 'rgba(60,50,30,0)'); x.fillStyle = gg; x.fillRect(gx, 0, 6 + Math.random() * 20, h * Math.random()); } }
const TX = {
  woodFloor: ctex(512, 512, (x, w, h) => { const rows = 8, rh = h / rows; for (let r = 0; r < rows; r++){ let off = Math.random() * w; for (let k = -1; k < 3; k++){ const L = 200 + Math.random() * 180; const l = 18 + Math.random() * 10; x.fillStyle = `hsl(${24 + Math.random() * 8},${30 + Math.random() * 12}%,${l}%)`; x.fillRect((off + k * L) % w, r * rh, L, rh); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect((off + k * L) % w, r * rh, 2, rh); } x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, r * rh, w, 2); }
    for (let i = 0; i < 220; i++){ x.strokeStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.beginPath(); const y = Math.random() * h; x.moveTo(0, y); for (let px = 0; px < w; px += 40) x.lineTo(px, y + Math.sin(px * 0.02 + i) * 2); x.stroke(); } speckle(x, w, h, 900, 0.15); }),
  tile: ctex(256, 256, (x, w, h) => { x.fillStyle = '#8f8b84'; x.fillRect(0, 0, w, h); const n = 4, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){ const l = 72 + Math.random() * 6; x.fillStyle = (i + j) % 2 ? `hsl(40,8%,${l}%)` : `hsl(210,10%,${l - 34}%)`; x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); } speckle(x, w, h, 600, 0.12); }),
  carpet: ctex(256, 256, (x, w, h) => { x.fillStyle = '#4a4f5c'; x.fillRect(0, 0, w, h); speckle(x, w, h, 6000, 0.25); speckle(x, w, h, 3000, 0.08, true); }),
  plaster: ctex(256, 256, (x, w, h) => { x.fillStyle = '#d6d2c8'; x.fillRect(0, 0, w, h); speckle(x, w, h, 2500, 0.06); }),
  grass: ctex(512, 512, (x, w, h) => { x.fillStyle = '#1d2a17'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++){ x.fillStyle = `hsla(${85 + Math.random() * 30},${25 + Math.random() * 20}%,${8 + Math.random() * 16}%,.8)`; x.fillRect(Math.random() * w, Math.random() * h, 1, 3 + Math.random() * 4); } }),
  asphalt: ctex(512, 512, (x, w, h) => { x.fillStyle = '#1b1c1f'; x.fillRect(0, 0, w, h); speckle(x, w, h, 9000, 0.4); speckle(x, w, h, 3000, 0.08, true); for (let i = 0; i < 5; i++){ x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 15 + Math.random() * 30, Math.random() * 3, 0, 7); x.fill(); } }),
  concrete: ctex(256, 256, (x, w, h) => { x.fillStyle = '#56575a'; x.fillRect(0, 0, w, h); speckle(x, w, h, 4000, 0.18); speckle(x, w, h, 1000, 0.06, true); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h); }),
  siding: ctex(256, 512, (x, w, h) => { x.fillStyle = '#5d6872'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32){ const g = x.createLinearGradient(0, y, 0, y + 32); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.2, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.05)'); x.fillStyle = g; x.fillRect(0, y, w, 32); } speckle(x, w, h, 1200, 0.1); grime(x, w, h, 0.4); }),
  sidingWarm: ctex(256, 512, (x, w, h) => { x.fillStyle = '#7c6a55'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32){ const g = x.createLinearGradient(0, y, 0, y + 32); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.2, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.05)'); x.fillStyle = g; x.fillRect(0, y, w, 32); } speckle(x, w, h, 1200, 0.1); grime(x, w, h, 0.3); }),
  roof: ctex(256, 256, (x, w, h) => { x.fillStyle = '#26282c'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16){ const off = (y / 16) % 2 ? 16 : 0; for (let px = -off; px < w; px += 32){ x.fillStyle = `hsl(220,5%,${11 + Math.random() * 6}%)`; x.fillRect(px + 1, y + 1, 30, 14); } } }),
  fence: ctex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++){ x.fillStyle = `hsl(30,18%,${18 + Math.random() * 8}%)`; x.fillRect(i * 32, 0, 30, h); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(i * 32 + 30, 0, 2, h); } speckle(x, w, h, 1500, 0.2); grime(x, w, h, 0.5); }),
};
function wallpaper(base, ink, kind, dirt = 0.3){
  return ctex(256, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); x.fillStyle = ink; x.strokeStyle = ink;
    if (kind === 'stripe'){ for (let i = 0; i < w; i += 32){ x.globalAlpha = 0.5; x.fillRect(i, 0, 10, h); x.globalAlpha = 0.25; x.fillRect(i + 16, 0, 2, h); } }
    if (kind === 'damask'){ x.globalAlpha = 0.35; for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++){ const cx = i * 64 + (j % 2) * 32 + 16, cy = j * 64 + 32; x.beginPath(); x.ellipse(cx, cy, 10, 20, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 14, cy); x.quadraticCurveTo(cx, cy - 34, cx + 14, cy); x.stroke(); } }
    if (kind === 'floral'){ x.globalAlpha = 0.3; for (let k = 0; k < 70; k++){ const cx = Math.random() * w, cy = Math.random() * h; for (let p = 0; p < 5; p++){ x.beginPath(); x.ellipse(cx + Math.cos(p * 1.26) * 5, cy + Math.sin(p * 1.26) * 5, 4, 2.5, p * 1.26, 0, 7); x.fill(); } } }
    if (kind === 'wainscot'){ x.globalAlpha = 1; x.fillStyle = ink; x.fillRect(0, h * 0.68, w, h * 0.32); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, h * 0.68, w, 4); for (let i = 0; i < w; i += 64){ x.strokeStyle = 'rgba(0,0,0,.2)'; x.strokeRect(i + 8, h * 0.72, 48, h * 0.24); } }
    if (kind === 'bathtile'){ x.globalAlpha = 1; x.fillStyle = ink; x.fillRect(0, h * 0.55, w, h * 0.45); x.strokeStyle = 'rgba(80,90,100,.5)'; for (let y = h * 0.55; y < h; y += 21){ x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } for (let i = 0; i < w; i += 21){ x.beginPath(); x.moveTo(i, h * 0.55); x.lineTo(i, h); x.stroke(); } }
    x.globalAlpha = 1; speckle(x, w, h, 1500, 0.07); grime(x, w, h, dirt);
  });
}
TX.locked = ctex(512, 512, (x, w, h) => {
  x.fillStyle = '#4a4438'; x.fillRect(0, 0, w, h); speckle(x, w, h, 6000, 0.3);
  for (let i = 0; i < 14; i++){ x.fillStyle = `rgba(${20 + Math.random() * 30},${15 + Math.random() * 10},8,${0.2 + Math.random() * 0.3})`; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 80, 30 + Math.random() * 120, 0, 0, 7); x.fill(); }
  x.lineCap = 'round';
  for (let g = 0; g < 26; g++){ const gx = Math.random() * w, gy = Math.random() * h * 0.9, len = 40 + Math.random() * 160, ang = 1.2 + Math.random() * 0.7;
    for (let k = 0; k < 5; k++){ x.strokeStyle = `rgba(${200 + Math.random() * 40},${190},${170},${0.35 + Math.random() * 0.3})`; x.lineWidth = 1 + Math.random() * 1.5; x.beginPath(); const sx = gx + k * 7; x.moveTo(sx, gy); x.quadraticCurveTo(sx + Math.cos(ang) * len * 0.5 + 6, gy + Math.sin(ang) * len * 0.5, sx + Math.cos(ang) * len, gy + Math.sin(ang) * len); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx + 1.5, gy); x.lineTo(sx + 1.5 + Math.cos(ang) * len, gy + Math.sin(ang) * len); x.stroke(); } }
  x.strokeStyle = 'rgba(30,20,15,.7)'; x.lineWidth = 2;
  for (let t = 0; t < 12; t++){ const tx = 20 + Math.random() * (w - 80), ty = 20 + Math.random() * (h - 60); for (let k = 0; k < 4; k++){ x.beginPath(); x.moveTo(tx + k * 6, ty); x.lineTo(tx + k * 6 + 1, ty + 26); x.stroke(); } x.beginPath(); x.moveTo(tx - 4, ty + 20); x.lineTo(tx + 26, ty + 6); x.stroke(); }
});
TX.mirror = ctex(256, 384, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#5d6670'); g.addColorStop(0.5, '#2a3036'); g.addColorStop(1, '#4b535c'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const cx = w * 0.45, cy = h * 0.4; x.strokeStyle = 'rgba(230,235,240,.75)'; for (let i = 0; i < 18; i++){ const a = Math.random() * 6.28; let px = cx, py = cy; x.lineWidth = 1 + Math.random(); x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 6; s++){ px += Math.cos(a + rnd(-0.4, 0.4)) * 30; py += Math.sin(a + rnd(-0.4, 0.4)) * 30; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.moveTo(cx - 20, cy - 10); x.lineTo(cx + 25, cy - 5); x.lineTo(cx + 5, cy + 30); x.fill(); }, { clamp: true });
function photoTex(variant){
  return ctex(128, 160, (x, w, h) => {
    x.fillStyle = '#efe7d4'; x.fillRect(0, 0, w, h); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8a7458'); g.addColorStop(1, '#4b3b29'); x.fillStyle = g; x.fillRect(8, 8, w - 16, h - 36);
    const people = variant === 3 ? 3 : 2;
    for (let i = 0; i < people; i++){ const cx = 8 + (w - 16) * (i + 1) / (people + 1), tall = (variant === 3 && i === 2); const hy = tall ? 30 : 52;
      x.fillStyle = tall ? '#140f0b' : '#2a2016'; x.beginPath(); x.ellipse(cx, hy + 50, tall ? 10 : 16, tall ? 60 : 34, 0, 0, 7); x.fill();
      x.fillStyle = tall ? '#1a1410' : '#c8b392'; x.beginPath(); x.ellipse(cx, hy, tall ? 7 : 9, tall ? 12 : 11, 0, 0, 7); x.fill();
      if (variant >= 1 && !tall){ x.strokeStyle = '#120c08'; x.lineWidth = 3; for (let k = 0; k < 4; k++){ x.beginPath(); x.moveTo(cx - 12 + Math.random() * 4, hy - 4 + k * 2); x.lineTo(cx + 12, hy - 2 + k * 2 + Math.random() * 3); x.stroke(); } } }
    x.fillStyle = 'rgba(80,60,30,.25)'; x.fillRect(0, 0, w, h); speckle(x, w, h, 500, 0.2);
    x.fillStyle = '#3a3022'; x.font = '11px serif'; x.fillText(['1962', '1987', '2004', '2025'][variant], 10, h - 12);
  });
}
TX.silhouette = ctex(128, 512, (x, w, h) => { x.fillStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.ellipse(64, 50, 16, 30, 0.12, 0, 7); x.fill(); x.beginPath(); x.moveTo(50, 80); x.lineTo(78, 80); x.lineTo(84, 280); x.lineTo(44, 280); x.fill(); x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineCap = 'round';
  x.beginPath(); x.moveTo(52, 90); x.lineTo(28, 250); x.lineTo(22, 420); x.stroke(); x.beginPath(); x.moveTo(76, 90); x.lineTo(98, 250); x.lineTo(106, 415); x.stroke(); x.lineWidth = 10; x.beginPath(); x.moveTo(56, 280); x.lineTo(50, 505); x.stroke(); x.beginPath(); x.moveTo(72, 280); x.lineTo(80, 505); x.stroke(); }, { clamp: true });
TX.stain = ctex(128, 128, (x, w, h) => { for (let i = 0; i < 40; i++){ x.fillStyle = `rgba(${50 + Math.random() * 30},6,4,${0.08 + Math.random() * 0.12})`; x.beginPath(); x.ellipse(64 + rnd(-30, 30), 64 + rnd(-30, 30), rnd(5, 26), rnd(4, 18), Math.random() * 3, 0, 7); x.fill(); } }, { clamp: true });
TX.paper = ctex(128, 160, (x, w, h) => { x.fillStyle = '#e6dfcf'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(40,40,70,.7)'; x.lineWidth = 1.5; for (let y = 22; y < h - 15; y += 12){ x.beginPath(); x.moveTo(12, y); let px = 12; while (px < w - 14 - Math.random() * 20){ px += 4; x.lineTo(px, y + Math.sin(px * 0.7) * 1.5); } x.stroke(); } }, { clamp: true });
TX.scrawl = ctex(128, 160, (x, w, h) => { x.fillStyle = '#c9bfa6'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(60,10,8,.9)'; x.lineWidth = 3; for (let y = 30; y < h - 20; y += 22){ x.beginPath(); x.moveTo(10, y); let px = 10; while (px < w - 12){ px += 5; x.lineTo(px, y + rnd(-4, 4)); } x.stroke(); } }, { clamp: true });
TX.tv = ctex(128, 96, (x, w, h) => { x.fillStyle = '#0a0c0e'; x.fillRect(0, 0, w, h); const g = x.createRadialGradient(w * 0.4, h * 0.35, 4, w / 2, h / 2, w * 0.7); g.addColorStop(0, 'rgba(120,140,160,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, { clamp: true });

// ---------- Materials ----------
function std(o){ return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o)); }
const M = {
  floor: std({ map: TX.woodFloor, roughness: 0.6 }), tile: std({ map: TX.tile, roughness: 0.35 }), carpet: std({ map: TX.carpet, roughness: 1 }),
  ceiling: std({ map: TX.plaster, color: 0xe9e4da }), plaster: std({ map: TX.plaster }),
  living: std({ map: wallpaper('#7e8a72', '#5d6a55', 'stripe') }), hall: std({ map: wallpaper('#b9a98b', '#8e7c5e', 'damask') }),
  kitchen: std({ map: wallpaper('#d5c99a', '#c2b68a', 'plain', 0.25) }), dining: std({ map: wallpaper('#7a4440', '#5a2c2a', 'damask') }),
  bath: std({ map: wallpaper('#c8ced2', '#dfe6ea', 'bathtile', 0.2) }), laundry: std({ map: wallpaper('#8e9194', '#7d8083', 'plain', 0.45) }),
  upHall: std({ map: wallpaper('#a99b86', '#7d6e60', 'floral', 0.35) }), bedroom: std({ map: wallpaper('#6d7c8c', '#3e4a59', 'wainscot', 0.25) }),
  storage: std({ map: wallpaper('#77756f', '#77756f', 'plain', 0.5) }), locked: std({ map: TX.locked, roughness: 1 }),
  nLiving: std({ map: wallpaper('#b88f62', '#9c7246', 'wainscot', 0.15) }), nHall: std({ map: wallpaper('#c2a777', '#a98d5f', 'stripe', 0.15) }),
  nKitchen: std({ map: wallpaper('#d9c58e', '#cbb57e', 'plain', 0.2) }), nBath: std({ map: wallpaper('#bfc9c4', '#dde4e0', 'bathtile', 0.2) }),
  siding: std({ map: TX.siding }), sidingWarm: std({ map: TX.sidingWarm }), roof: std({ map: TX.roof, roughness: 0.9 }),
  grass: std({ map: TX.grass, roughness: 1 }), asphalt: std({ map: TX.asphalt, roughness: 0.55, metalness: 0.1 }), concrete: std({ map: TX.concrete }),
  fence: std({ map: TX.fence }),
  trim: std({ color: 0xd9d4c6, roughness: 0.6 }), darkWood: std({ color: 0x3a2618, roughness: 0.6 }), midWood: std({ color: 0x6a4a2e, roughness: 0.65 }), lightWood: std({ color: 0xa07f57, roughness: 0.7 }),
  door: std({ color: 0xcfc8b8, roughness: 0.55 }), doorDark: std({ color: 0x3b2a1e, roughness: 0.6 }), lockedDoor: std({ color: 0x4a4038, roughness: 0.9 }),
  metal: std({ color: 0x8c8f93, roughness: 0.35, metalness: 0.8 }), darkMetal: std({ color: 0x2b2d30, roughness: 0.4, metalness: 0.7 }), brass: std({ color: 0xb08d4a, roughness: 0.3, metalness: 0.9 }),
  white: std({ color: 0xe8e6e0, roughness: 0.3 }), porcelain: std({ color: 0xf0eee8, roughness: 0.15 }), black: std({ color: 0x0c0c0d, roughness: 0.5 }),
  fabricGreen: std({ color: 0x3f4d3a, roughness: 1 }), fabricRed: std({ color: 0x5e2a26, roughness: 1 }), fabricBlue: std({ color: 0x34405a, roughness: 1 }), fabricTan: std({ color: 0x8a7558, roughness: 1 }), fabricGrey: std({ color: 0x5a5a5e, roughness: 1 }),
  linen: std({ color: 0xcdc7b8, roughness: 1 }), cloth: std({ color: 0x08080a, roughness: 1, side: THREE.DoubleSide }),
  glass: new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.22, depthWrite: false }),
  leaf: std({ color: 0x1c2a1a, roughness: 1 }), bark: std({ color: 0x241b14, roughness: 1 }), pot: std({ color: 0x8a4b30, roughness: 0.9 }),
  stain: new THREE.MeshBasicMaterial({ map: TX.stain, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  bone: std({ color: 0xe0d8c4, roughness: 0.6 }), mirror: std({ map: TX.mirror, roughness: 0.15, metalness: 0.7 }),
  paper: std({ map: TX.paper, roughness: 1 }), scrawl: std({ map: TX.scrawl, roughness: 1 }), tv: std({ map: TX.tv, roughness: 0.2, metalness: 0.3 }),
  books: [0x5a2a22, 0x2c3b4f, 0x3d4a2b, 0x6b5a3a, 0x25221e, 0x7a6a50].map(c => std({ color: c })),
};
function bulbMat(color){ return new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(color), emissiveIntensity: 1 }); }

// ---------- Mesh helpers ----------
function worldUV(geo, cx, cy, cz, sx = 1.5, sy = 3, base = 0){
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i) + cx, y = pos.getY(i) + cy, z = pos.getZ(i) + cz; const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, x / sx, z / sx); else if (nx > 0.5) uv.setXY(i, z / sx, (y - base) / sy); else uv.setXY(i, x / sx, (y - base) / sy);
  }
  uv.needsUpdate = true;
}
function grp(x = 0, y = 0, z = 0, ry = 0, parent = scene){ const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
// Box with bottom at y. o: parent, ry, col (level), uv [sx,sy,base], cast, occ
function B(w, h, d, mat, x, y, z, o = {}){
  const geo = new THREE.BoxGeometry(w, h, d);
  if (o.uv) worldUV(geo, o.parent ? 0 : x, o.parent ? 0 : y + h / 2, o.parent ? 0 : z, o.uv[0], o.uv[1], o.uv[2] || 0);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y + h / 2, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m);
  if (o.col !== undefined){ if (o.parent) colliderFromObject(m, o.col, 0); else { const sw = Math.abs(Math.sin(o.ry || 0)) > 0.5; const W = sw ? d : w, D = sw ? w : d; addCollider(x - W / 2, x + W / 2, z - D / 2, z + D / 2, o.col); } }
  if (o.occ){ m.userData.occ = true; occluders.push(m); }
  return m;
}
function CYL(rt, rb, h, mat, x, y, z, o = {}){ const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 14, 1, !!o.open), mat); m.position.set(x, y + h / 2, z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m); return m; }
function SPH(r, mat, x, y, z, o = {}){ const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 14, o.seg ? o.seg - 2 : 10), mat); m.position.set(x, y, z); if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]); m.castShadow = o.cast !== false; (o.parent || scene).add(m); return m; }
function PLANE(w, h, mat, x, y, z, ry = 0, o = {}){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; if (o.rx !== undefined) m.rotation.x = o.rx; m.receiveShadow = true; (o.parent || scene).add(m); return m; }
function hitbox(w, h, d, x, y, z, parent = scene){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); m.userData.hitbox = true; parent.add(m); return m; }

// ---------- Walls, windows, doors ----------
const WALL_T = 0.14;
function wallSeg(axis, fixed, a, b, y0, y1, mA, mB, level, col = true){
  const len = b - a, h = y1 - y0; if (len < 0.01 || h < 0.01) return null;
  const w = axis === 'x' ? len : WALL_T, d = axis === 'x' ? WALL_T : len;
  const cx = axis === 'x' ? (a + b) / 2 : fixed, cz = axis === 'x' ? fixed : (a + b) / 2;
  const geo = new THREE.BoxGeometry(w, h, d); worldUV(geo, cx, y0 + h / 2, cz, 1.5, 3, level * 3);
  const mats = axis === 'x' ? [mA, mA, mA, mA, mB, mA] : [mB, mA, mA, mA, mA, mA];
  const m = new THREE.Mesh(geo, mats); m.position.set(cx, y0 + h / 2, cz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  m.userData.occ = true; occluders.push(m);
  if (col) addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, level);
  return m;
}
function windowFrame(axis, fixed, a, b, ys, yt, level){
  const g = new THREE.Group(); scene.add(g);
  const cxy = (a + b) / 2, w = b - a, h = yt - ys, t = WALL_T + 0.04;
  const put = (W, H, D, x, y, z) => { const ax = axis === 'x'; B(ax ? W : D, H, ax ? D : W, M.trim, ax ? x : fixed, y, ax ? fixed : x, { parent: g }); };
  put(w + 0.12, 0.06, t + 0.06, cxy, ys - 0.03, 0); put(w + 0.12, 0.06, t, cxy, yt - 0.03, 0);
  put(0.06, h, t, a + 0.03, ys, 0); put(0.06, h, t, b - 0.03, ys, 0); put(0.04, h, 0.05, cxy, ys, 0); put(w, 0.04, 0.05, cxy, ys + h * 0.55, 0);
  // fix the axis placement for children made with parent g (B uses x,z directly)
  g.children.forEach(c => { if (axis === 'x') c.position.z = fixed; else c.position.x = fixed; });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? w - 0.06 : 0.02, h - 0.06, axis === 'x' ? 0.02 : w - 0.06), M.glass.clone());
  glass.position.set(axis === 'x' ? cxy : fixed, ys + h / 2, axis === 'x' ? fixed : cxy); glass.renderOrder = 2; scene.add(glass);
  return { glass, frame: g, center: new V3(axis === 'x' ? cxy : fixed, ys + h / 2, axis === 'x' ? fixed : cxy), axis, a, b, ys, yt, level };
}
const W = {}; // named windows
function wall(axis, fixed, from, to, level, mA, mB, gaps = [], o = {}){
  const H = o.H || 3; const y0 = level * 3, y1 = y0 + H; gaps = gaps.slice().sort((p, q) => p.c - q.c);
  let cur = from - (o.ea ? WALL_T / 2 : 0); const end = to + (o.eb ? WALL_T / 2 : 0);
  for (const g of gaps){ const a = g.c - g.w / 2, b = g.c + g.w / 2;
    wallSeg(axis, fixed, cur, a, y0, y1, mA, mB, level);
    if (g.win){ wallSeg(axis, fixed, a, b, y0, y0 + g.win[0], mA, mB, level); wallSeg(axis, fixed, a, b, y0 + g.win[1], y1, mA, mB, level, false);
      if (axis === 'x') addCollider(a, b, fixed - WALL_T / 2, fixed + WALL_T / 2, level); else addCollider(fixed - WALL_T / 2, fixed + WALL_T / 2, a, b, level);
      const wf = windowFrame(axis, fixed, a, b, y0 + g.win[0], y0 + g.win[1], level); if (g.name) W[g.name] = wf;
      if (g.boarded){ for (let k = 0; k < 4; k++){ const yy = y0 + g.win[0] + 0.1 + k * (g.win[1] - g.win[0]) / 4; B(axis === 'x' ? g.w + 0.2 : 0.03, 0.16, axis === 'x' ? 0.03 : g.w + 0.2, M.midWood, axis === 'x' ? g.c : fixed + (g.boarded === '+' ? 0.09 : -0.09), yy, axis === 'x' ? fixed + (g.boarded === '+' ? 0.09 : -0.09) : g.c, { rz: axis === 'x' ? rnd(-0.12, 0.12) : 0, rx: axis === 'z' ? rnd(-0.12, 0.12) : 0 }); } }
    } else {
      const h = g.h || 2.15; wallSeg(axis, fixed, a, b, y0 + h, y1, mA, mB, level, false);
      // jambs
      const jt = WALL_T + 0.05;
      [a + 0.03, b - 0.03].forEach(p => B(axis === 'x' ? 0.06 : jt, h, axis === 'x' ? jt : 0.06, M.trim, axis === 'x' ? p : fixed, y0, axis === 'x' ? fixed : p));
      B(axis === 'x' ? g.w : jt, 0.07, axis === 'x' ? jt : g.w, M.trim, axis === 'x' ? g.c : fixed, y0 + h - 0.02, axis === 'x' ? fixed : g.c);
    }
    cur = b;
  }
  wallSeg(axis, fixed, cur, end, y0, y1, mA, mB, level);
}
const doors = [];
function makeDoor(o){
  const level = o.level || 0, y0 = level * 3, w = o.w || 0.9, h = o.h || 2.1;
  const hingeMin = o.hinge !== 'max'; const hp = hingeMin ? o.c - w / 2 : o.c + w / 2;
  const pivot = new THREE.Group(); scene.add(pivot);
  if (o.axis === 'x') pivot.position.set(hp, y0, o.fixed); else pivot.position.set(o.fixed, y0, hp);
  let base, swing;
  if (o.axis === 'x'){ base = hingeMin ? 0 : Math.PI; swing = hingeMin ? (o.into === '-' ? 1 : -1) : (o.into === '+' ? 1 : -1); }
  else { base = hingeMin ? -Math.PI / 2 : Math.PI / 2; swing = hingeMin ? (o.into === '+' ? 1 : -1) : (o.into === '-' ? 1 : -1); }
  pivot.rotation.y = base;
  const mat = o.mat || M.door;
  const panel = new THREE.Group(); pivot.add(panel);
  if (o.glass){
    B(w - 0.03, 0.14, 0.06, mat, w / 2, 0, 0, { parent: panel }); B(w - 0.03, 0.14, 0.06, mat, w / 2, h - 0.14, 0, { parent: panel });
    B(0.1, h, 0.06, mat, 0.06, 0, 0, { parent: panel }); B(0.1, h, 0.06, mat, w - 0.07, 0, 0, { parent: panel }); B(0.08, 0.3, 0.06, mat, w / 2, 0.14, 0, { parent: panel });
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, h - 0.6, 0.02), M.glass.clone()); gl.position.set(w / 2, 0.44 + (h - 0.6) / 2, 0); gl.renderOrder = 2; panel.add(gl);
  } else {
    const p = B(w - 0.03, h, 0.05, mat, w / 2, 0, 0, { parent: panel }); p.userData.occ = true; occluders.push(p);
    B(w * 0.36, h * 0.38, 0.06, mat, w * 0.3, h * 0.52, 0, { parent: panel }); B(w * 0.36, h * 0.38, 0.06, mat, w * 0.7, h * 0.52, 0, { parent: panel });
    B(w * 0.36, h * 0.3, 0.06, mat, w * 0.3, h * 0.1, 0, { parent: panel }); B(w * 0.36, h * 0.3, 0.06, mat, w * 0.7, h * 0.1, 0, { parent: panel });
  }
  SPH(0.035, M.brass, w - 0.1, 1.0, 0.05, { parent: panel }); SPH(0.035, M.brass, w - 0.1, 1.0, -0.05, { parent: panel });
  hitbox(w, h, 0.2, w / 2, h / 2, 0, panel);
  const a = o.c - w / 2, b = o.c + w / 2;
  const collider = o.axis === 'x' ? addCollider(a, b, o.fixed - 0.07, o.fixed + 0.07, level) : addCollider(o.fixed - 0.07, o.fixed + 0.07, a, b, level);
  const center = o.axis === 'x' ? new V3(o.c, y0 + 1.1, o.fixed) : new V3(o.fixed, y0 + 1.1, o.c);
  const d = { pivot, panel, base, swing, ang: 0, target: 0, open: false, locked: !!o.locked, jammed: false, maxAng: o.maxAng || 1.7, speed: 5, collider, level, center, name: o.name || '', def: { open: !!o.open, locked: !!o.locked }, lockedThought: o.lockedThought || 'Locked.', closeSound: null, useFn: null, textFn: null };
  addInter(panel, () => d.textFn ? d.textFn() : (d.jammed ? 'It won\'t open' : d.locked ? 'Locked' : (d.open ? 'Close door' : 'Open door')), () => d.useFn ? d.useFn() : toggleDoor(d));
  if (o.open) setDoor(d, true, { instant: true, silent: true });
  doors.push(d); if (o.name) DOORS[o.name] = d; return d;
}
const DOORS = {};
function toggleDoor(d){
  if (d.jammed){ SND.latch(d.center, 0.6); SND.thud(d.center, 0.4); think(d.jamThought || "It won't open. It isn't even locked. It just won't move.", 2.5); return; }
  if (d.locked){ SND.latch(d.center); think(d.lockedThought, 2.5); return; }
  setDoor(d, !d.open);
}
function setDoor(d, open, o = {}){
  if (d.open === open && !o.force) return; d.open = open; d.target = open ? d.maxAng : 0; d.speed = o.speed || 5;
  if (open){ d.collider.on = false; if (!o.silent) SND.doorOpen(d.center); d.closeSound = null; }
  else { d.closeSound = o.silent ? null : (o.slam ? 'slam' : 'close'); }
  if (o.instant){ d.ang = d.target; d.pivot.rotation.y = d.base + d.ang * d.swing; if (!open){ d.collider.on = true; d.closeSound = null; } }
}
function updateDoors(dt){
  for (const d of doors){
    d.ang += (d.target - d.ang) * Math.min(1, dt * d.speed);
    d.pivot.rotation.y = d.base + d.ang * d.swing;
    if (!d.open && d.ang < 0.05){ if (!d.collider.on){ d.collider.on = true; } if (d.closeSound){ SND.doorClose(d.center, d.closeSound === 'slam'); if (d.closeSound === 'slam') player.shake = Math.max(player.shake, 0.35); d.closeSound = null; } }
  }
}

// ---------- Furniture ----------
function table(x, z, w, d, h = 0.76, mat = M.darkWood, level = 0){
  const g = grp(x, level * 3, z); B(w, 0.05, d, mat, 0, h - 0.05, 0, { parent: g });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => B(0.06, h - 0.05, 0.06, mat, sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07), { parent: g }));
  colliderFromObject(g, level, 0.02); return g;
}
function chair(x, z, ry, mat = M.darkWood, level = 0, col = true, cushion = null){
  const g = grp(x, level * 3, z, ry); B(0.44, 0.05, 0.44, mat, 0, 0.44, 0, { parent: g });
  if (cushion) B(0.4, 0.04, 0.4, cushion, 0, 0.49, 0, { parent: g });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => B(0.04, 0.44, 0.04, mat, sx * 0.19, 0, sz * 0.19, { parent: g }));
  B(0.44, 0.52, 0.04, mat, 0, 0.49, -0.2, { parent: g }); B(0.04, 0.5, 0.04, mat, 0.19, 0.49, -0.2, { parent: g }); B(0.04, 0.5, 0.04, mat, -0.19, 0.49, -0.2, { parent: g });
  const c = col ? addCollider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, level) : null; return { g, c };
}
function couch(x, z, ry, w = 2.1, mat = M.fabricGreen, level = 0){
  const g = grp(x, level * 3, z, ry);
  B(w, 0.42, 0.9, mat, 0, 0.08, 0, { parent: g }); B(w, 0.5, 0.22, mat, 0, 0.45, -0.34, { parent: g });
  B(0.2, 0.62, 0.9, mat, w / 2 - 0.1, 0.08, 0, { parent: g }); B(0.2, 0.62, 0.9, mat, -w / 2 + 0.1, 0.08, 0, { parent: g });
  for (let i = 0; i < 3; i++) B(w / 3 - 0.12, 0.12, 0.62, mat, -w / 3 + i * w / 3, 0.5, 0.08, { parent: g });
  B(0.36, 0.3, 0.12, M.fabricTan, -w / 2 + 0.45, 0.58, -0.18, { parent: g, rz: 0.2 });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => B(0.05, 0.08, 0.05, M.darkWood, sx * (w / 2 - 0.08), 0, sz * 0.38, { parent: g }));
  colliderFromObject(g, level, 0); return g;
}
function armchair(x, z, ry, mat = M.fabricRed, level = 0){
  const g = grp(x, level * 3, z, ry); B(0.85, 0.4, 0.85, mat, 0, 0.08, 0, { parent: g }); B(0.85, 0.62, 0.2, mat, 0, 0.42, -0.33, { parent: g });
  B(0.16, 0.6, 0.85, mat, 0.35, 0.08, 0, { parent: g }); B(0.16, 0.6, 0.85, mat, -0.35, 0.08, 0, { parent: g }); colliderFromObject(g, level, 0); return g;
}
function bed(x, z, ry, level = 1, blanket = M.fabricBlue){
  const g = grp(x, level * 3, z, ry);
  B(1.45, 0.3, 2.05, M.midWood, 0, 0.1, 0, { parent: g }); B(1.4, 0.22, 2.0, M.linen, 0, 0.4, 0, { parent: g });
  B(1.42, 0.06, 1.45, blanket, 0, 0.6, 0.28, { parent: g }); B(1.45, 0.4, 0.05, blanket, 0, 0.27, 1.0, { parent: g });
  B(0.55, 0.13, 0.36, M.linen, -0.33, 0.62, -0.75, { parent: g }); B(0.55, 0.13, 0.36, M.linen, 0.33, 0.62, -0.75, { parent: g });
  B(1.5, 1.1, 0.07, M.midWood, 0, 0, -1.04, { parent: g });
  colliderFromObject(g, level, 0); return g;
}
function cabinetRun(x0, x1, z, depth, facing, level = 0, mat = M.white, top = M.darkWood, h = 0.9){ // along x; facing '+' or '-' (front side)
  const w = x1 - x0, cx = (x0 + x1) / 2; const s = facing === '+' ? 1 : -1;
  B(w, h - 0.04, depth, mat, cx, level * 3, z, { col: level }); B(w + 0.02, 0.04, depth + 0.03, top, cx, level * 3 + h - 0.04, z + s * 0.015);
  for (let px = x0 + 0.3; px < x1 - 0.1; px += 0.6){ B(0.56, h - 0.16, 0.01, mat, px, level * 3 + 0.06, z + s * (depth / 2 + 0.005)); B(0.1, 0.02, 0.02, M.metal, px, level * 3 + h - 0.22, z + s * (depth / 2 + 0.02)); }
}
function cabinetRunZ(z0, z1, x, depth, facing, level = 0, mat = M.white, top = M.darkWood, h = 0.9){
  const d = z1 - z0, cz = (z0 + z1) / 2; const s = facing === '+' ? 1 : -1;
  B(depth, h - 0.04, d, mat, x, level * 3, cz, { col: level }); B(depth + 0.03, 0.04, d + 0.02, top, x + s * 0.015, level * 3 + h - 0.04, cz);
  for (let pz = z0 + 0.3; pz < z1 - 0.1; pz += 0.6){ B(0.01, h - 0.16, 0.56, mat, x + s * (depth / 2 + 0.005), level * 3 + 0.06, pz); B(0.02, 0.02, 0.1, M.metal, x + s * (depth / 2 + 0.02), level * 3 + h - 0.22, pz); }
}
function bookshelf(x, z, ry, w = 1.0, h = 1.9, level = 0, col = true){
  const g = grp(x, level * 3, z, ry); const d = 0.32;
  B(w, h, 0.03, M.darkWood, 0, 0, -d / 2 + 0.015, { parent: g }); B(0.03, h, d, M.darkWood, -w / 2, 0, 0, { parent: g }); B(0.03, h, d, M.darkWood, w / 2, 0, 0, { parent: g });
  for (let s = 0; s < 5; s++){ const y = s * h / 5; B(w, 0.03, d, M.darkWood, 0, y, 0, { parent: g });
    if (s < 4){ let px = -w / 2 + 0.04; while (px < w / 2 - 0.08){ const bw = rnd(0.03, 0.07), bh = rnd(0.2, h / 5 - 0.06); if (Math.random() < 0.85) B(bw, bh, rnd(0.18, 0.26), M.books[(Math.random() * M.books.length) | 0], px + bw / 2, y + 0.03, 0.01, { parent: g, rz: Math.random() < 0.1 ? 0.25 : 0, cast: false }); px += bw + 0.005; } } }
  B(w, 0.03, d, M.darkWood, 0, h, 0, { parent: g });
  if (col) colliderFromObject(g, level, 0); return g;
}
function frame(x, y, z, ry, w, h, tex, parent = scene){
  const g = grp(x, y, z, ry, parent); B(w + 0.08, h + 0.08, 0.03, M.darkWood, 0, -0.04, 0, { parent: g, cast: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: 0.5 })); p.position.set(0, h / 2, 0.02); g.add(p); return g;
}
function ceilingLight(x, y, z, color, intensity, dist, o = {}){
  let bulb;
  if (o.kind === 'tube'){ B(1.2, 0.06, 0.18, M.white, x, y - 0.06, z, { cast: false }); bulb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.08), bulbMat(color)); bulb.position.set(x, y - 0.08, z); scene.add(bulb); }
  else if (o.kind === 'bare'){ CYL(0.004, 0.004, 0.6, M.black, x, y - 0.6, z, { cast: false }); bulb = SPH(0.05, bulbMat(color), x, y - 0.65, z, { cast: false }); }
  else if (o.kind === 'chandelier'){ CYL(0.01, 0.01, 0.5, M.brass, x, y - 0.5, z); CYL(0.25, 0.05, 0.12, M.brass, x, y - 0.62, z); bulb = SPH(0.06, bulbMat(color), x, y - 0.6, z, { cast: false }); for (let i = 0; i < 5; i++){ const a = i * 1.256; SPH(0.035, bulb.material, x + Math.cos(a) * 0.24, y - 0.52, z + Math.sin(a) * 0.24, { cast: false }); } }
  else if (o.kind === 'porch'){ B(0.16, 0.24, 0.12, M.darkMetal, x, y - 0.12, z); bulb = SPH(0.05, bulbMat(color), x, y, z, { cast: false }); }
  else { CYL(0.22, 0.28, 0.08, M.white, x, y - 0.08, z, { cast: false }); bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), bulbMat(color)); bulb.position.set(x, y - 0.09, z); scene.add(bulb); }
  return addFixture(x, y - (o.kind === 'bare' ? 0.7 : 0.35), z, color, intensity, dist, Object.assign({ bulb }, o));
}
function tableLamp(x, y, z, color, intensity, dist, o = {}){
  CYL(0.07, 0.09, 0.04, M.brass, x, y, z); CYL(0.015, 0.015, 0.32, M.brass, x, y + 0.04, z);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.22, 16, 1, true), std({ color: 0xe8dcc0, side: THREE.DoubleSide, emissive: new THREE.Color(color), emissiveIntensity: 0.6 })); shade.position.set(x, y + 0.46, z); scene.add(shade);
  const f = addFixture(x, y + 0.45, z, color, intensity, dist, Object.assign({ bulb: shade }, o)); return { f, shade };
}
function floorLamp(x, z, color, intensity, dist, level = 0, o = {}){
  const y = level * 3; CYL(0.15, 0.17, 0.03, M.darkMetal, x, y, z); CYL(0.015, 0.015, 1.5, M.darkMetal, x, y, z);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.3, 16, 1, true), std({ color: 0xe0d2b4, side: THREE.DoubleSide, emissive: new THREE.Color(color), emissiveIntensity: 0.6 })); shade.position.set(x, y + 1.55, z); scene.add(shade);
  addCollider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, level);
  return addFixture(x, y + 1.5, z, color, intensity, dist, Object.assign({ bulb: shade }, o));
}
function rug(x, z, w, d, color, level = 0, y = 0.005){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std({ color, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, level * 3 + y, z); m.receiveShadow = true; scene.add(m); return m; }
function plant(x, z, level = 0, s = 1){ const y = level * 3; CYL(0.16 * s, 0.12 * s, 0.3 * s, M.pot, x, y, z); for (let i = 0; i < 6; i++) SPH(0.14 * s, M.leaf, x + rnd(-0.12, 0.12) * s, y + (0.38 + Math.random() * 0.3) * s, z + rnd(-0.12, 0.12) * s, { s: [1, 1.4, 1] }); addCollider(x - 0.17 * s, x + 0.17 * s, z - 0.17 * s, z + 0.17 * s, level); }
function tree(x, z, h = 6){ CYL(0.15, 0.25, h * 0.5, M.bark, x, 0, z); for (let i = 0; i < 7; i++) SPH(rnd(0.9, 1.5), M.leaf, x + rnd(-1, 1), h * 0.5 + rnd(0, h * 0.4), z + rnd(-1, 1), { cast: true }); addCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0); }
function fence(axis, fixed, a, b, h = 1.8, gaps = []){
  let cur = a; const segs = [];
  gaps.forEach(g => { segs.push([cur, g[0]]); cur = g[1]; }); segs.push([cur, b]);
  segs.forEach(([p, q]) => { if (q - p < 0.01) return; const L = q - p, c = (p + q) / 2;
    if (axis === 'x') B(L, h, 0.08, M.fence, c, 0, fixed, { col: -1, uv: [2, 2] }); else B(0.08, h, L, M.fence, fixed, 0, c, { col: -1, uv: [2, 2] }); });
}
function invisibleWall(minX, maxX, minZ, maxZ){ addCollider(minX, maxX, minZ, maxZ, -1); }
function hedge(axis, fixed, a, b){ const L = b - a, c = (a + b) / 2; const m = B(axis === 'x' ? L : 0.9, 1.4, axis === 'x' ? 0.9 : L, M.leaf, axis === 'x' ? c : fixed, 0, axis === 'x' ? fixed : c, { col: -1 }); return m; }
function streetLight(x, z, flicker = 0, side = 1){
  CYL(0.07, 0.1, 5.2, M.darkMetal, x, 0, z); B(0.08, 0.08, 1.2, M.darkMetal, x, 5.1, z + side * 0.55);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.4), bulbMat(0xffb060)); bulb.position.set(x, 5.05, z + side * 1.1); scene.add(bulb);
  addCollider(x - 0.12, x + 0.12, z - 0.12, z + 0.12, -1);
  return addFixture(x, 4.8, z + side * 1.1, 0xff9a40, 2.6, 16, { group: 'street', bulb, unstable: flicker });
}
