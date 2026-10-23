'use strict';
// =====================================================================
//  THE HOUSE THAT REMEMBERS — core utilities, settings, textures
// =====================================================================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);
const smooth = t => t * t * (3 - 2 * t);
function levelY(l) { return l === 1 ? 3.4 : l === -1 ? -3.4 : 0; }

// ---------- persistent storage (artifact-safe) ----------
const STORE_P = (window.HW_BUILD && window.HW_BUILD.env === 'staging') ? 'thtr_stg_' : 'thtr_';
const Store = {
  mem: {},
  get(k) { try { const v = localStorage.getItem(STORE_P + k); if (v != null) return JSON.parse(v); } catch (e) {} return this.mem[k]; },
  set(k, v) { this.mem[k] = v; try { localStorage.setItem(STORE_P + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { delete this.mem[k]; try { localStorage.removeItem(STORE_P + k); } catch (e) {} }
};

const Settings = Object.assign({
  sens: 1.0, vol: 0.85, bright: 1.0, subs: true, voice: true, grain: true, invert: false, shadows: true
}, Store.get('settings') || {});
function saveSettings() { Store.set('settings', Settings); }

// ---------- canvas helpers ----------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texFrom(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
// simple value noise for texture generation
function makeNoise(seed) {
  let s = seed || 1;
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const g = []; for (let i = 0; i < 256; i++) g.push(r());
  const p = []; for (let i = 0; i < 512; i++) p.push(Math.floor(r() * 256));
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => g[p[(p[a & 255] + b) & 255]];
    const u = smooth(xf), v = smooth(yf);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  const fbm = (x, y, o = 4) => { let a = 0, f = 1, amp = 0.5, t = 0; for (let i = 0; i < o; i++) { a += n2(x * f, y * f) * amp; t += amp; f *= 2; amp *= 0.5; } return a / t; };
  return { n2, fbm, r };
}
const NZ = makeNoise(7);

// tileable fbm (wraps at period P)
function tileFbm(x, y, P, o = 4) {
  let a = 0, f = 1, amp = .5, t = 0;
  for (let i = 0; i < o; i++) {
    const p = P * f;
    const xx = x * f, yy = y * f;
    const fx = ((xx % p) + p) % p, fy = ((yy % p) + p) % p;
    // bilinear blend of four samples for seamless tiling
    const u = fx / p, v = fy / p;
    const s00 = NZ.n2(fx, fy), s10 = NZ.n2(fx - p, fy), s01 = NZ.n2(fx, fy - p), s11 = NZ.n2(fx - p, fy - p);
    a += lerp(lerp(s00, s10, u), lerp(s01, s11, u), v) * amp; t += amp; f *= 2; amp *= .5;
  }
  return a / t;
}

function pixelTex(w, h, fn) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; const col = fn(x, y);
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------- procedural material textures ----------
const TEX = {};
function buildTextures() {
  const S = 256;
  // wood floor planks (tile = 2m)
  {
    const c = pixelTex(S, S, (x, y) => {
      const plank = Math.floor(y / 32), off = (plank * 97) % S;
      const xx = (x + off) % S;
      const seam = (y % 32 === 0 || (xx % 128) === 0) ? 0.45 : 1;
      const grain = tileFbm(xx * 0.02, y * 0.3, 5.12 * 1, 3) * 0.5 + Math.sin(xx * 0.08 + NZ.n2(xx * .05, y * .2) * 6) * 0.12;
      const tone = 0.75 + ((plank * 37) % 7) / 28;
      const v = (0.55 + grain * 0.5) * tone * seam;
      return [92 * v, 60 * v, 38 * v];
    });
    TEX.wood = texFrom(c);
  }
  // wallpaper (faded damask stripes) tile 1m wide x 1m
  const wallpaper = (base, stripe, dot) => {
    const c = makeCanvas(S, S), ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = stripe; ctx.fillRect(i * 64 + 4, 0, 10, S); ctx.fillRect(i * 64 + 50, 0, 3, S); }
    ctx.fillStyle = dot;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = i * 64 + 32, cy = j * 64 + 32 + (i % 2) * 32;
      ctx.beginPath(); ctx.ellipse(cx, cy % S, 7, 12, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, (cy + 16) % S, 3, 3, 0, 0, TAU); ctx.fill();
    }
    const img = ctx.getImageData(0, 0, S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 4, n = tileFbm(x * .03, y * .03, 7.68, 4);
      const stain = Math.max(0, n - 0.55) * 1.6;
      const k = 0.8 + n * 0.35 - stain;
      d[o] *= k; d[o + 1] *= k; d[o + 2] *= k * 0.95;
    }
    ctx.putImageData(img, 0, 0);
    return texFrom(c);
  };
  TEX.wallpaper = wallpaper('#5d6150', '#535846', '#6b6c56');
  TEX.wallpaperRed = wallpaper('#5a3f39', '#4d3530', '#694b42');
  TEX.wallpaperPink = wallpaper('#7a6461', '#6e5856', '#8a716b');
  TEX.wallpaperBlue = wallpaper('#47525a', '#3e4850', '#56616a');
  // plaster ceiling
  TEX.plaster = texFrom(pixelTex(S, S, (x, y) => { const n = tileFbm(x * .04, y * .04, 10.24, 4); const v = 150 + n * 60 - Math.max(0, n - .62) * 200; return [v, v * .97, v * .9]; }));
  // carpet (dark red, patterned)
  TEX.carpet = texFrom(pixelTex(S, S, (x, y) => {
    const n = NZ.r() * 0.25 + tileFbm(x * .05, y * .05, 12.8, 3) * 0.5;
    const pat = ((Math.floor(x / 32) + Math.floor(y / 32)) % 2) ? 1 : 0.85;
    const border = (x % 128 < 6 || y % 128 < 6) ? 0.6 : 1;
    const v = (0.55 + n) * pat * border; return [96 * v, 30 * v, 30 * v];
  }));
  // tiles
  TEX.tile = texFrom(pixelTex(S, S, (x, y) => {
    const g = (x % 32 < 2 || y % 32 < 2) ? 0.55 : 1; const n = tileFbm(x * .05, y * .05, 12.8, 3);
    const v = (0.75 + n * 0.3) * g; return [175 * v, 178 * v, 168 * v];
  }));
  // concrete
  TEX.concrete = texFrom(pixelTex(S, S, (x, y) => {
    const n = tileFbm(x * .03, y * .03, 7.68, 5); const sp = NZ.r() * 0.12;
    const v = 0.55 + n * 0.45 + sp - Math.max(0, n - .66) * 0.8; return [105 * v, 102 * v, 96 * v];
  }));
  // brick/stone exterior siding (clapboard)
  TEX.siding = texFrom(pixelTex(S, S, (x, y) => {
    const b = y % 32; const shade = b < 3 ? 0.45 : 1 - b / 32 * 0.25; const n = tileFbm(x * .03, y * .05, 7.68, 4);
    const v = shade * (0.6 + n * 0.5); return [118 * v, 116 * v, 108 * v];
  }));
  TEX.roof = texFrom(pixelTex(S, S, (x, y) => {
    const row = Math.floor(y / 21), xx = (x + (row % 2) * 16) % 32; const edge = (y % 21 < 2 || xx < 2) ? 0.4 : 1;
    const v = edge * (0.5 + tileFbm(x * .05, y * .05, 12.8, 3) * 0.5); return [52 * v, 48 * v, 50 * v];
  }));
  TEX.grass = texFrom(pixelTex(S, S, (x, y) => { const n = tileFbm(x * .04, y * .04, 10.24, 5); const s = NZ.r() * .3; const v = .45 + n * .6 + s; return [34 * v, 48 * v, 26 * v]; }));
  TEX.gravel = texFrom(pixelTex(S, S, (x, y) => { const s = NZ.r(); const n = tileFbm(x * .1, y * .1, 25.6, 2); const v = .4 + s * .45 + n * .3; return [92 * v, 88 * v, 80 * v]; }));
  TEX.bark = texFrom(pixelTex(S, S, (x, y) => { const n = tileFbm(x * .15, y * .015, 38.4, 4); const v = .35 + n * .7; return [52 * v, 44 * v, 36 * v]; }));
  TEX.doorWood = texFrom(pixelTex(S, S, (x, y) => {
    const grain = tileFbm(x * .3, y * .015, 76.8, 4); const v = 0.5 + grain * 0.6;
    const panel = (x > 30 && x < 226 && ((y > 24 && y < 110) || (y > 140 && y < 236))) ? 1.08 : 0.92;
    const edge = (Math.abs(x - 30) < 3 || Math.abs(x - 226) < 3 || Math.abs(y - 24) < 3 || Math.abs(y - 110) < 3 || Math.abs(y - 140) < 3 || Math.abs(y - 236) < 3) ? 0.6 : 1;
    const k = v * panel * edge; return [78 * k, 50 * k, 32 * k];
  }));
  TEX.darkWood = texFrom(pixelTex(S, S, (x, y) => { const g = tileFbm(x * .02, y * .25, 5.12, 4); const v = .4 + g * .6; return [58 * v, 38 * v, 26 * v]; }));
  TEX.fabric = texFrom(pixelTex(S, S, (x, y) => { const w = ((x + y) % 4 < 2) ? 1 : .88; const n = tileFbm(x * .05, y * .05, 12.8, 3); const v = w * (.6 + n * .5); return [58 * v, 66 * v, 50 * v]; }));
  TEX.fabricRed = texFrom(pixelTex(S, S, (x, y) => { const w = ((x + y) % 4 < 2) ? 1 : .88; const n = tileFbm(x * .05, y * .05, 12.8, 3); const v = w * (.6 + n * .5); return [96 * v, 44 * v, 42 * v]; }));
  TEX.sheet = texFrom(pixelTex(S, S, (x, y) => { const n = tileFbm(x * .03, y * .03, 7.68, 4); const v = .75 + n * .3; return [190 * v, 186 * v, 172 * v]; }));
  TEX.metal = texFrom(pixelTex(S, S, (x, y) => { const n = tileFbm(x * .04, y * .2, 10.24, 4); const rust = Math.max(0, tileFbm(x * .02 + 9, y * .02, 5.12, 4) - .5) * 2; const v = .4 + n * .4; return [70 * v + rust * 80, 68 * v + rust * 30, 66 * v]; }));
}

// box UV scaling so a single shared texture tiles in world units
function scaleBoxUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  // face order: +x,-x,+y,-y,+z,-z ; 4 verts each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
  }
  uv.needsUpdate = true;
}

// ---------- materials ----------
const MAT = {};
function stdMat(map, rough = 0.85, color = 0xffffff, extra = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ map, roughness: rough, metalness: 0, color }, extra));
}
function buildMaterials() {
  MAT.wood = stdMat(TEX.wood, .7); MAT.wood.userData.tile = 2;
  MAT.wall = stdMat(TEX.wallpaper, .9); MAT.wall.userData.tile = 1.2;
  MAT.wallRed = stdMat(TEX.wallpaperRed, .9); MAT.wallRed.userData.tile = 1.2;
  MAT.wallPink = stdMat(TEX.wallpaperPink, .9); MAT.wallPink.userData.tile = 1.0;
  MAT.wallBlue = stdMat(TEX.wallpaperBlue, .9); MAT.wallBlue.userData.tile = 1.2;
  MAT.plaster = stdMat(TEX.plaster, .95); MAT.plaster.userData.tile = 3;
  MAT.carpet = stdMat(TEX.carpet, 1); MAT.carpet.userData.tile = 2;
  MAT.tile = stdMat(TEX.tile, .35); MAT.tile.userData.tile = 1;
  MAT.concrete = stdMat(TEX.concrete, .95); MAT.concrete.userData.tile = 2;
  MAT.siding = stdMat(TEX.siding, .9); MAT.siding.userData.tile = 1.5;
  MAT.roof = stdMat(TEX.roof, .9); MAT.roof.userData.tile = 1.5;
  MAT.grass = stdMat(TEX.grass, 1); MAT.grass.userData.tile = 3;
  MAT.gravel = stdMat(TEX.gravel, 1); MAT.gravel.userData.tile = 1.5;
  MAT.bark = stdMat(TEX.bark, 1); MAT.bark.userData.tile = 1;
  MAT.door = stdMat(TEX.doorWood, .7); MAT.door.userData.tile = 1;
  MAT.darkWood = stdMat(TEX.darkWood, .65); MAT.darkWood.userData.tile = 1;
  MAT.fabric = stdMat(TEX.fabric, 1); MAT.fabric.userData.tile = 1;
  MAT.fabricRed = stdMat(TEX.fabricRed, 1); MAT.fabricRed.userData.tile = 1;
  MAT.sheet = stdMat(TEX.sheet, 1); MAT.sheet.userData.tile = 1.5;
  MAT.metal = stdMat(TEX.metal, .6, 0xffffff, { metalness: .4 }); MAT.metal.userData.tile = 1;
  MAT.stone = stdMat(TEX.concrete, .95, 0x9a9a92); MAT.stone.userData.tile = 1;
  MAT.black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  MAT.paper = stdMat(null, .9, 0xd9d0b8);
  MAT.brass = stdMat(null, .35, 0xa07a3c, { metalness: .8 });
  MAT.iron = stdMat(null, .5, 0x3a3936, { metalness: .7 });
  MAT.porcelain = stdMat(null, .25, 0xe2ded2);
  MAT.glassDark = stdMat(null, .1, 0x10161c, { metalness: .2 });
  MAT.frame = stdMat(TEX.darkWood, .5, 0x9a7a52); MAT.frame.userData.tile = .5;
  MAT.leaf = stdMat(null, 1, 0x1c2a18);
  MAT.leafDark = stdMat(null, 1, 0x141d12);
  MAT.skin = stdMat(null, .8, 0x8a7560);
  [['wood', .028], ['wall', .014], ['wallRed', .014], ['wallPink', .014], ['wallBlue', .014], ['plaster', .03], ['carpet', .02], ['tile', .02], ['concrete', .045], ['siding', .05], ['roof', .05], ['bark', .07], ['door', .03], ['darkWood', .025], ['fabric', .02], ['fabricRed', .02], ['metal', .03], ['stone', .05]].forEach(([k, b]) => { const m = MAT[k]; if (m && m.map) { m.bumpMap = m.map; m.bumpScale = b; } });
  MAT.window = new THREE.MeshBasicMaterial({ color: 0x46566e });
  MAT.windowLit = new THREE.MeshBasicMaterial({ color: 0x8aa0bc });
}

// ---------- photograph / picture drawing ----------
// spec: {w,h, tree:0..1, people:[{x, kind, scratched, shadow, smile, extra}], caption, tint, bg:'garden'|'table'|'room', aged}
function drawFigure(ctx, x, ground, kind, s, opts = {}) {
  const H = { man: 1.0, woman: .92, boy: .62, girl: .6, baby: .3, teen: .78, player: .95, entity: 1.32, oldman: .96 }[kind] || .9;
  const h = H * s, hw = h * 0.17;
  ctx.save();
  const body = opts.entity ? '#0a0908' : (opts.color || ({ man: '#2d2721', oldman: '#2a2620', woman: '#3d3128', girl: '#5b4a3a', boy: '#3a3229', baby: '#cfc1a3', teen: '#3a3229', player: '#26292c' }[kind]));
  ctx.fillStyle = body;
  if (kind === 'baby') {
    ctx.beginPath(); ctx.ellipse(x, ground - h * .9, h * .45, h * .6, 0, 0, TAU); ctx.fill();
  } else {
    // legs
    if (kind !== 'woman' && kind !== 'girl') { ctx.fillRect(x - hw * .55, ground - h * .45, hw * .45, h * .45); ctx.fillRect(x + hw * .1, ground - h * .45, hw * .45, h * .45); }
    ctx.beginPath();
    if (kind === 'woman' || kind === 'girl') { // dress
      ctx.moveTo(x - hw * .7, ground - h * .8); ctx.lineTo(x + hw * .7, ground - h * .8); ctx.lineTo(x + hw * 1.25, ground - h * .08); ctx.lineTo(x - hw * 1.25, ground - h * .08);
      ctx.fill(); ctx.fillRect(x - hw * .3, ground - h * .1, hw * .2, h * .1); ctx.fillRect(x + hw * .1, ground - h * .1, hw * .2, h * .1);
    } else {
      ctx.moveTo(x - hw, ground - h * .8); ctx.lineTo(x + hw, ground - h * .8); ctx.lineTo(x + hw * .8, ground - h * .42); ctx.lineTo(x - hw * .8, ground - h * .42); ctx.fill();
    }
    // arms
    ctx.fillRect(x - hw * 1.25, ground - h * .78, hw * .3, h * (opts.entity ? .62 : .36));
    ctx.fillRect(x + hw * .95, ground - h * .78, hw * .3, h * (opts.entity ? .62 : .36));
    if (kind === 'player') { // flashlight glint
      ctx.fillStyle = 'rgba(255,245,210,.85)'; ctx.beginPath(); ctx.arc(x + hw * 1.1, ground - h * .42, hw * .2, 0, TAU); ctx.fill();
    }
  }
  // head
  const hr = kind === 'baby' ? h * .28 : h * .11, hy = kind === 'baby' ? ground - h * 1.45 : ground - h * .91;
  if (opts.entity) {
    const g = ctx.createRadialGradient(x, hy, 1, x, hy, hr * 1.6); g.addColorStop(0, 'rgba(70,64,58,.9)'); g.addColorStop(.6, 'rgba(15,13,12,.95)'); g.addColorStop(1, 'rgba(10,9,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, hy, hr * 1.3, hr * 1.7, 0, 0, TAU); ctx.fill();
  } else if (opts.shadow) {
    ctx.fillStyle = '#060504'; ctx.beginPath(); ctx.arc(x, hy, hr, 0, TAU); ctx.fill();
  } else {
    // hair
    ctx.fillStyle = kind === 'oldman' ? '#8d8676' : (kind === 'woman' || kind === 'girl') ? '#2b2018' : '#2a221b';
    ctx.beginPath(); ctx.arc(x, hy - hr * .15, hr * 1.08, Math.PI, TAU); ctx.fill();
    if (kind === 'woman' || kind === 'girl') { ctx.fillRect(x - hr * 1.08, hy - hr * .2, hr * .35, hr * (kind === 'girl' ? 1.7 : 1.3)); ctx.fillRect(x + hr * .73, hy - hr * .2, hr * .35, hr * (kind === 'girl' ? 1.7 : 1.3)); }
    ctx.fillStyle = opts.pale ? '#e6dcc6' : '#c7b394';
    ctx.beginPath(); ctx.ellipse(x, hy + hr * .1, hr * .82, hr * .95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2017';
    ctx.fillRect(x - hr * .38, hy, hr * .16, hr * .14); ctx.fillRect(x + hr * .22, hy, hr * .16, hr * .14);
    ctx.strokeStyle = '#4a3626'; ctx.lineWidth = Math.max(1, hr * .08);
    ctx.beginPath();
    if (opts.smile) ctx.arc(x, hy + hr * .3, hr * .32, 0.15 * Math.PI, 0.85 * Math.PI); else { ctx.moveTo(x - hr * .25, hy + hr * .5); ctx.lineTo(x + hr * .25, hy + hr * .5); }
    ctx.stroke();
    if (opts.scratched) {
      ctx.strokeStyle = 'rgba(245,240,228,.95)'; ctx.lineWidth = Math.max(1.2, hr * .12);
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.moveTo(x + rand(-hr, hr), hy + rand(-hr * 1.1, hr)); ctx.lineTo(x + rand(-hr, hr), hy + rand(-hr * 1.1, hr)); ctx.stroke(); }
    }
  }
  ctx.restore();
}

function drawPhoto(spec) {
  const w = spec.w || 320, h = spec.h || 240;
  const c = makeCanvas(w, h), ctx = c.getContext('2d');
  const m = spec.border === false ? 0 : Math.round(w * 0.05);
  ctx.fillStyle = spec.borderColor || '#e7dfcb'; ctx.fillRect(0, 0, w, h);
  const iw = w - m * 2, ih = h - m * 2 - (spec.caption && spec.border !== false ? h * .1 : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(m, m, iw, ih); ctx.clip(); ctx.translate(m, m);
  // background
  const bg = spec.bg || 'garden';
  if (bg === 'garden') {
    const g = ctx.createLinearGradient(0, 0, 0, ih); g.addColorStop(0, '#b7a585'); g.addColorStop(.62, '#a69273'); g.addColorStop(.63, '#6e6046'); g.addColorStop(1, '#4e432f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, iw, ih);
    // house silhouette
    ctx.fillStyle = 'rgba(70,60,46,.55)'; ctx.fillRect(iw * .55, ih * .25, iw * .42, ih * .38);
    ctx.beginPath(); ctx.moveTo(iw * .52, ih * .26); ctx.lineTo(iw * .76, ih * .08); ctx.lineTo(iw * 1.0, ih * .26); ctx.fill();
    ctx.fillStyle = 'rgba(40,34,26,.6)'; for (let i = 0; i < 3; i++) ctx.fillRect(iw * (.6 + i * .12), ih * .33, iw * .06, ih * .1);
    if (spec.tree != null) { // the oak grows over the years
      const t = spec.tree, tx = iw * .22, base = ih * .64, th = ih * (.12 + t * .5);
      ctx.fillStyle = '#3d3326'; ctx.fillRect(tx - iw * (.006 + t * .02), base - th, iw * (.012 + t * .04), th);
      ctx.fillStyle = 'rgba(52,48,34,.92)'; ctx.beginPath(); ctx.ellipse(tx, base - th, iw * (.04 + t * .2), ih * (.04 + t * .2), 0, 0, TAU); ctx.fill();
    }
  } else if (bg === 'table' || bg === 'room') {
    const g = ctx.createLinearGradient(0, 0, 0, ih); g.addColorStop(0, '#6a5a44'); g.addColorStop(1, '#3a3024');
    ctx.fillStyle = g; ctx.fillRect(0, 0, iw, ih);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(i * iw / 9, 0, 3, ih * .7); }
    ctx.fillStyle = 'rgba(30,24,18,.7)'; ctx.fillRect(iw * .72, ih * .12, iw * .18, ih * .2); // a framed picture
  } else if (bg === 'dark') {
    ctx.fillStyle = '#1b1814'; ctx.fillRect(0, 0, iw, ih);
  } else if (bg === 'dawn') {
    const g = ctx.createLinearGradient(0, 0, 0, ih); g.addColorStop(0, '#c9b089'); g.addColorStop(.6, '#e1c79d'); g.addColorStop(.61, '#7c6a4c'); g.addColorStop(1, '#5a4b36');
    ctx.fillStyle = g; ctx.fillRect(0, 0, iw, ih);
  }
  // people
  const ground = bg === 'table' ? ih * .98 : ih * .92;
  const s = ih * (spec.scale || .72);
  (spec.people || []).forEach(p => {
    drawFigure(ctx, iw * p.x, ground - (bg === 'table' ? 0 : 0), p.kind, s * (p.s || 1), p);
  });
  if (bg === 'table') { // tabletop over bodies
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(0, ih * .7, iw, ih * .06);
    ctx.fillStyle = '#4a3c2c'; ctx.fillRect(0, ih * .76, iw, ih * .3);
    ctx.fillStyle = '#efe6d2'; (spec.plates || []).forEach(px => { ctx.beginPath(); ctx.ellipse(iw * px, ih * .72, iw * .05, ih * .015, 0, 0, TAU); ctx.fill(); });
  }
  if (spec.draw) spec.draw(ctx, iw, ih);
  // sepia + aging
  const img = ctx.getImageData(m, m, iw, ih), d = img.data, tint = spec.tint || [1.07, .98, .82];
  const age = spec.aged == null ? 1 : spec.aged;
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    const o = (y * iw + x) * 4; const l = d[o] * .3 + d[o + 1] * .59 + d[o + 2] * .11;
    const dx = (x / iw - .5), dy = (y / ih - .5); const vig = 1 - (dx * dx + dy * dy) * 1.3 * age;
    const n = (Math.random() - .5) * 24 * age;
    const sat = spec.color ? 1 : 0;
    d[o] = clamp(lerp(l, d[o], sat) * tint[0] * vig + n, 0, 255);
    d[o + 1] = clamp(lerp(l, d[o + 1], sat) * tint[1] * vig + n, 0, 255);
    d[o + 2] = clamp(lerp(l, d[o + 2], sat) * tint[2] * vig + n, 0, 255);
  }
  ctx.putImageData(img, m, m);
  // scratches & dust
  ctx.strokeStyle = 'rgba(240,232,214,.25)'; ctx.lineWidth = 1;
  for (let i = 0; i < 6 * age; i++) { ctx.beginPath(); const x = rand(0, iw); ctx.moveTo(x, rand(0, ih)); ctx.lineTo(x + rand(-10, 10), rand(0, ih)); ctx.stroke(); }
  ctx.restore();
  if (spec.caption && m) {
    ctx.fillStyle = '#3b2f22'; ctx.font = `${Math.round(h * .07)}px Caveat, cursive`; ctx.textAlign = 'center';
    ctx.fillText(spec.caption, w / 2, h - m * .9);
  }
  return c;
}

// child's crayon drawing
function drawCrayon(variant) {
  const w = 256, h = 200, c = makeCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  const wob = () => rand(-2, 2);
  const stick = (x, y, sc, col, opts = {}) => {
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, 9 * sc, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 9 * sc); ctx.lineTo(x + wob(), y + 40 * sc); ctx.moveTo(x - 14 * sc, y + 20 * sc); ctx.lineTo(x + 14 * sc, y + 20 * sc);
    ctx.moveTo(x, y + 40 * sc); ctx.lineTo(x - 10 * sc, y + 60 * sc); ctx.moveTo(x, y + 40 * sc); ctx.lineTo(x + 10 * sc, y + 60 * sc); ctx.stroke();
    if (opts.dress) { ctx.beginPath(); ctx.moveTo(x - 4, y + 15 * sc); ctx.lineTo(x - 13 * sc, y + 44 * sc); ctx.lineTo(x + 13 * sc, y + 44 * sc); ctx.lineTo(x + 4, y + 15 * sc); ctx.stroke(); }
    if (opts.scribble) { ctx.strokeStyle = '#111'; ctx.lineWidth = 4; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(x + rand(-10, 10) * sc, y + rand(-10, 10) * sc); ctx.lineTo(x + rand(-10, 10) * sc, y + rand(-10, 10) * sc); ctx.stroke(); } ctx.lineWidth = 3; }
    if (!opts.noface && !opts.scribble) { ctx.fillStyle = col; ctx.fillRect(x - 4 * sc, y - 2 * sc, 2, 2); ctx.fillRect(x + 3 * sc, y - 2 * sc, 2, 2); ctx.beginPath(); ctx.arc(x, y + 2 * sc, 4 * sc, .2, Math.PI - .2); ctx.stroke(); }
  };
  const kind = variant.kind;
  if (kind === 'family') {
    ctx.strokeStyle = '#3a6a3a'; ctx.beginPath(); ctx.moveTo(0, 175); ctx.lineTo(w, 172); ctx.stroke();
    ctx.fillStyle = '#e8b830'; ctx.beginPath(); ctx.arc(220, 30, 16, 0, TAU); ctx.fill();
    const st = variant.stage || 0;
    stick(50, 90, 1.25, '#2d4a8a'); stick(95, 95, 1.15, '#a03050', { dress: true });
    stick(140, 118, .8, '#2d6a3a'); stick(180, 120, .78, '#c0602a', st >= 2 ? { scribble: true } : { dress: true });
    if (st >= 1) stick(225, 60, 1.7, '#111', { noface: true });
    ctx.fillStyle = '#333'; ctx.font = '16px Caveat, cursive';
    ctx.fillText(st >= 2 ? 'ME?' : 'ELENA', 162, 196);
  } else if (kind === 'house') {
    const st = variant.stage || 0;
    ctx.strokeStyle = '#7a3a2a'; ctx.strokeRect(60, 70, 140, 110); ctx.beginPath(); ctx.moveTo(50, 72); ctx.lineTo(130, 20); ctx.lineTo(210, 72); ctx.stroke();
    const n = 4 + st * 5;
    for (let i = 0; i < n; i++) { const x = 70 + (i % 5) * 26, y = 80 + Math.floor(i / 5) * 30; ctx.strokeStyle = '#2d4a8a'; ctx.strokeRect(x, y, 16, 18); if (st >= 1) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 4, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = '#333'; ctx.font = '16px Caveat, cursive'; ctx.fillText(st >= 2 ? 'IT HAS MORE ROOMS AT NIGHT' : 'OUR HOUSE', 50, 196);
  } else if (kind === 'mama') {
    const st = variant.stage || 0;
    stick(80, 60, 1.4, '#a03050', { dress: true });
    stick(170, 60, 1.4, st >= 1 ? '#111' : '#a03050', st >= 2 ? { dress: true, noface: true } : { dress: true });
    ctx.fillStyle = '#333'; ctx.font = '17px Caveat, cursive';
    ctx.fillText('MAMA', 58, 180); ctx.fillText(st >= 1 ? 'NOT MAMA' : 'MAMA', 140, 180);
    if (st >= 2) { ctx.fillStyle = '#7a1a1a'; ctx.fillText("IT KNOWS THE SONG NOW", 40, 22); }
  }
  return c;
}

// window scenes (seasons) for Elena's window
function drawSeason(i, noEnt) {
  const w = 256, h = 256, c = makeCanvas(w, h), ctx = c.getContext('2d');
  const seasons = [
    { sky: ['#7f9bb8', '#c9d6dc'], ground: '#4f6b37', leaf: '#3f6b2f', name: 'summer' },
    { sky: ['#8d8a86', '#c7b39a'], ground: '#6b5536', leaf: '#a0582a', name: 'autumn' },
    { sky: ['#9aa3ad', '#dfe3e6'], ground: '#e9ecef', leaf: null, name: 'winter' },
    { sky: ['#13171f', '#20283a'], ground: '#0d100c', leaf: '#121810', name: 'night' },
  ];
  const s = seasons[i % 4];
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, s.sky[0]); g.addColorStop(1, s.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = s.ground; ctx.fillRect(0, h * .72, w, h * .28);
  ctx.fillStyle = '#2a2219'; ctx.fillRect(w * .3, h * .3, 14, h * .45);
  if (s.leaf) { ctx.fillStyle = s.leaf; ctx.beginPath(); ctx.ellipse(w * .32, h * .3, 70, 55, 0, 0, TAU); ctx.fill(); }
  else { ctx.strokeStyle = '#2a2219'; ctx.lineWidth = 4; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(w * .32, h * .35); ctx.lineTo(w * .32 + rand(-60, 60), h * .35 - rand(20, 70)); ctx.stroke(); } ctx.fillStyle = '#fff'; for (let k = 0; k < 90; k++) ctx.fillRect(rand(0, w), rand(0, h), 2, 2); }
  // the swing hangs from the oak; in one season a small figure sits on it
  ctx.strokeStyle = 'rgba(30,25,20,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(w * .42, h * .36); ctx.lineTo(w * .42, h * .6); ctx.moveTo(w * .5, h * .36); ctx.lineTo(w * .5, h * .6); ctx.stroke();
  ctx.fillStyle = '#2a2219'; ctx.fillRect(w * .41, h * .6, w * .1, 4);
  if (i % 4 === 1) drawFigure(ctx, w * .46, h * .7, 'girl', 70, { color: '#5b4a3a' });
  if (i % 4 === 3 && !noEnt) { ctx.fillStyle = '#e6e2d4'; ctx.beginPath(); ctx.arc(w * .8, h * .18, 14, 0, TAU); ctx.fill(); drawFigure(ctx, w * .7, h * .78, 'entity', 70, { entity: true }); }
  return c;
}
