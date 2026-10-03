/* =====================================================================
   PROCEDURAL PIXEL ART — character templates are recoloured per creature,
   tiles and icons are painted pixel by pixel at startup. No image files.
   Palette keys: 1 outline, 2 main/hood, 3 shade/legs, 4 highlight, 5 eyes,
   6 body/clothes, 7 metal/trim, 8 skin
   ===================================================================== */
const PAL = o => Object.assign({ '1': '#1a1220', '2': '#777777', '3': '#444444', '4': '#bbbbbb', '5': '#1a1220', '6': '#666666', '7': '#99a0aa', '8': '#d8b08c' }, o);

const HUMAN_BODY = [
  "..12222221..",
  "..18588581..",
  "..18888881..",
  "...166661...",
  "..16666661..",
  ".1866446681.",
  ".1816666181.",
  "...166661...",
  "...13..31...",
  "...11..11..."];
const TPL = {
  human: ["....1111....", "...122221...", ...HUMAN_BODY],
  crowned: ["...7.77.7...", "...777777..", ...HUMAN_BODY],
  horned: [".7..1111..7.", ".7112222117.", ...HUMAN_BODY],
  skel: ["....1111....", "...144441...", "..14444441..", "..14544541..", "...144441...", "....1441....", "..14444441..", ".1.141141.1.", ".4.144441.4.", "...14..41...", "...14..41...", "...11..11..."],
  slime: ["............", "............", "............", "....1111....", "...122221...", "..12244221..", ".1222222221.", ".1252222521.", ".1222222221.", ".1332222331.", "..13333331..", "...111111..."],
  bat: ["............", "............", "1..........1", "21...11...12", "221.1221.122", "222122221222", "122225522221", ".1122222211.", "...112211...", ".....11.....", "............", "............"],
  bat2: ["............", "............", "............", ".....11.....", "....1221....", "..11222211..", ".1222552221.", "122222222221", "221122221122", "21...11...12", "1..........1", "............"],
  spider: ["............", "............", "............", "1...1111...1", ".1.122221.1.", "..11222211..", "111252252111", "..12222221..", ".1.133331.1.", "1...1111...1", "............", "............"],
  ghost: ["....1111....", "...144441...", "..14444441..", ".1445445441.", ".1445445441.", ".1444444441.", ".1444114441.", ".1444444441.", ".1444444441.", ".1434434341.", ".141.141.41.", ".1...1...1.."],
  beast: ["............", "............", "............", "........11..", "1......1221.", ".11111112581", "122222222221", ".1222222221.", ".1233333321.", ".121..1.121.", ".11...1..11.", "............"],
  chest: ["............", "............", "............", ".1111111111.", "122222222221", "123333333321", "177777777771", "122227722221", "122222222221", "123333333321", "111111111111", "............"],
  chestOpen: ["............", ".1111111111.", "122222222221", "133333333331", "155555555551", "144444444441", "177777777771", "122227722221", "122222222221", "123333333321", "111111111111", "............"],
  mimic: ["............", ".1111111111.", "122222222221", "125222222521", "141414141414", "166666666661", "141414141414", "122227722221", "122222222221", "123333333321", "111111111111", "............"],
  barrel: ["............", "...111111...", "..12222221..", "..17777771..", "..12323231..", "..12323231..", "..17777771..", "..12323231..", "..12323231..", "..17777771..", "...111111...", "............"],
  crate: ["............", ".1111111111.", ".1777777771.", ".1722222371.", ".1722223271.", ".1722232271.", ".1722322271.", ".1723222271.", ".1732222271.", ".1777777771.", ".1111111111.", "............"],
  fountain: ["......1111......", ".....144441.....", "......1441......", ".......11.......", "......1771......", "...1117777111...", "..177444444771..", ".17444444444471.", ".17444444444471.", "..177444444771..", "...1777777771...", "....17777771....", "...1777777771...", "...1111111111..."],
  shrine: [".....11.....", "....1771....", "....1771....", "...177771...", "...175571...", "...177771...", "...175571...", "...177771...", "...177771...", "..17777771..", ".1777777771.", ".1111111111."],
  altar: ["............", "............", "............", "...1....1...", "..151..151..", "..171..171..", "111111111111", "177777777771", "173333333371", "173355553371", "177777777771", "111111111111"],
  tree: ["....11111111....", "..112222222211..", ".12222332222221.", "1222333333322221", "1223355335532221", "1222333333332221", ".12223333332221.", "..111333333111..", "....13333331....", "....13344331....", "....13333331....", "...1333333331...", "..133.3333.331..", ".131..1331..131.", ".11...1..1...11."],
  kraken: [".....111111.....", "...1122222211...", "..122222222221..", ".12222222222221.", ".12255222255221.", ".12255222255221.", ".12222222222221.", "..122233332221..", "...1222222221...", "..12.12..21.21..", ".12..12..21..21.", ".12.12....21.21.", "12..12....21..21", "1..12......21..1", "..12........21.."],
  eye: ["....111111....", "..1177777711..", ".177222222771.", ".172233332271.", "17223355332271", "17233555533271", "17233555533271", "17223355332271", ".172233332271.", ".177222222771.", "..1177777711..", "....111111....", "......77......", ".....7..7....."],
  dragon: ["........1111........", ".......122221.......", "......12522521......", "......12222221......", "..11....1221....11..", ".1221..122221..1221.", "12222211222222112221", "12666612222221666621", "12666612233221666621", ".126661223322166621.", "..1266122332216621..", "...12112222221121...", "....1..122221..1....", ".......122221.......", "........1221........", ".........11........."]
};

const SPR_CACHE = {};
/** Build a sprite from a template + palette: auto 1px dark outline and a white "hit flash" copy. */
function makeSprite(tpl, pal, key) {
  key = key || tpl + '|' + JSON.stringify(pal);
  if (SPR_CACHE[key]) return SPR_CACHE[key];
  const rows = TPL[tpl] || TPL.human;
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const W = w + 2, H = h + 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const cells = [], occ = new Set();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][i] || '.';
    if (ch !== '.' && ch !== ' ') { cells.push([i + 1, j + 1, pal[ch] || '#f0f']); occ.add((i + 1) + ',' + (j + 1)); }
  }
  x.fillStyle = '#0b0810';
  for (const [i, j] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!occ.has((i + dx) + ',' + (j + dy))) x.fillRect(i + dx, j + dy, 1, 1);
  for (const [i, j, col] of cells) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
  const f = document.createElement('canvas'); f.width = W; f.height = H;
  const fx = f.getContext('2d'); fx.drawImage(c, 0, 0); fx.globalCompositeOperation = 'source-in'; fx.fillStyle = '#fff'; fx.fillRect(0, 0, W, H);
  return (SPR_CACHE[key] = { img: c, flash: f, w: W, h: H });
}
/** Draw a sprite with its feet at (x,y). */
function drawSpr(ctx, spr, x, y, sc = 1, flip = false, flash = false, alpha = 1) {
  const w = spr.w * sc, h = spr.h * sc;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(flash ? spr.flash : spr.img, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
  ctx.restore();
}

/* ---------------- pixel helpers for icons ---------------- */
function pxCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function pxLine(x, x0, y0, x1, y1, col) {
  x.fillStyle = col;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) x.fillRect(Math.round(x0 + (x1 - x0) * i / (n || 1)), Math.round(y0 + (y1 - y0) * i / (n || 1)), 1, 1);
}
function pxRect(x, a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); }
function pxCircle(x, cx, cy, r, col, fill = true) {
  x.fillStyle = col;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const d = Math.hypot(i, j);
    if (fill ? d <= r + .3 : Math.abs(d - r) < .6) x.fillRect(cx + i, cy + j, 1, 1);
  }
}
function outlineCanvas(c) {
  const [o, x] = pxCanvas(c.width, c.height);
  const src = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  x.fillStyle = '#0b0810';
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    if (src[(j * c.width + i) * 4 + 3]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + dx, b = j + dy;
      if (a >= 0 && b >= 0 && a < c.width && b < c.height && src[(b * c.width + a) * 4 + 3]) { x.fillRect(i, j, 1, 1); break; }
    }
  }
  x.drawImage(c, 0, 0);
  return o;
}

const ICON_CACHE = {};
const METAL = '#cfd3db', METAL2 = '#7c818c', WOOD = '#7a5230', WOOD2 = '#4e331d';
/** Item icons (16x16). accent = rarity colour. Returns {cv, url}. */
function itemIcon(type, accent = '#b9b1a2') {
  const key = type + accent;
  if (ICON_CACHE[key]) return ICON_CACHE[key];
  const [c, x] = pxCanvas(16, 16);
  switch (type) {
    case 'sword': pxLine(x, 5, 10, 13, 2, METAL2); pxLine(x, 5, 9, 12, 2, METAL); pxLine(x, 3, 8, 7, 12, accent); pxLine(x, 2, 13, 4, 11, WOOD); pxRect(x, 1, 14, 1, 1, accent); break;
    case 'greatsword': pxLine(x, 4, 10, 14, 0, METAL); pxLine(x, 5, 11, 15, 1, METAL2); pxLine(x, 4, 11, 14, 1, METAL); pxLine(x, 2, 8, 7, 13, accent); pxLine(x, 1, 14, 3, 12, WOOD); break;
    case 'axe': pxLine(x, 3, 14, 11, 4, WOOD); pxLine(x, 4, 14, 12, 4, WOOD2); pxRect(x, 9, 1, 5, 7, METAL2); pxRect(x, 10, 1, 4, 6, METAL); pxLine(x, 13, 1, 13, 7, accent); break;
    case 'dagger': pxLine(x, 7, 8, 12, 3, METAL); pxLine(x, 8, 8, 12, 4, METAL2); pxLine(x, 5, 7, 8, 10, accent); pxLine(x, 4, 11, 6, 9, WOOD); break;
    case 'spear': pxLine(x, 1, 15, 11, 5, WOOD); pxLine(x, 2, 15, 12, 5, WOOD2); pxLine(x, 11, 4, 14, 1, METAL); pxLine(x, 12, 5, 15, 2, METAL2); pxRect(x, 10, 5, 2, 2, accent); break;
    case 'hammer': pxLine(x, 2, 14, 9, 7, WOOD); pxLine(x, 3, 14, 10, 7, WOOD2); pxRect(x, 7, 1, 8, 7, METAL2); pxRect(x, 8, 2, 6, 5, METAL); pxRect(x, 10, 1, 2, 7, accent); break;
    case 'shield': pxRect(x, 3, 2, 10, 9, METAL2); pxRect(x, 4, 3, 8, 8, accent); pxRect(x, 5, 11, 6, 2, METAL2); pxRect(x, 6, 13, 4, 1, METAL2); pxRect(x, 7, 4, 2, 7, METAL); pxRect(x, 5, 6, 6, 2, METAL); break;
    case 'bow': for (let j = 1; j <= 14; j++) { const dx = Math.round(Math.sin((j - 1) / 13 * Math.PI) * 6); pxRect(x, 4 + dx, j, 1, 1, WOOD); pxRect(x, 5 + dx, j, 1, 1, WOOD2); } pxLine(x, 4, 1, 4, 14, '#e8e0d0'); pxRect(x, 9, 7, 2, 2, accent); break;
    case 'staff': pxLine(x, 2, 15, 10, 6, WOOD); pxLine(x, 3, 15, 11, 6, WOOD2); pxCircle(x, 12, 4, 3, accent); pxRect(x, 11, 2, 2, 2, '#ffffff'); break;
    case 'wand': pxLine(x, 3, 13, 10, 6, WOOD); pxRect(x, 11, 2, 1, 7, accent); pxRect(x, 8, 5, 7, 1, accent); pxRect(x, 11, 5, 1, 1, '#fff'); break;
    case 'helmet': pxRect(x, 3, 4, 10, 8, METAL2); pxRect(x, 4, 3, 8, 8, METAL); pxRect(x, 4, 7, 8, 2, '#1a1220'); pxRect(x, 7, 2, 2, 6, accent); pxRect(x, 3, 12, 10, 1, METAL2); break;
    case 'chest': pxRect(x, 3, 3, 10, 11, METAL2); pxRect(x, 4, 3, 8, 10, METAL); pxRect(x, 1, 3, 3, 5, METAL2); pxRect(x, 12, 3, 3, 5, METAL2); pxRect(x, 6, 3, 4, 2, '#1a1220'); pxRect(x, 5, 7, 6, 2, accent); break;
    case 'gloves': pxRect(x, 3, 5, 6, 8, WOOD); pxRect(x, 3, 3, 2, 4, WOOD); pxRect(x, 5, 2, 2, 4, WOOD); pxRect(x, 7, 3, 2, 4, WOOD); pxRect(x, 9, 7, 3, 2, WOOD); pxRect(x, 3, 11, 6, 2, accent); break;
    case 'boots': pxRect(x, 4, 2, 5, 10, WOOD); pxRect(x, 4, 11, 9, 3, WOOD); pxRect(x, 4, 14, 9, 1, WOOD2); pxRect(x, 4, 4, 5, 2, accent); break;
    case 'ring': pxCircle(x, 8, 9, 4, '#d0a040', false); pxCircle(x, 8, 9, 3, '#8a6420', false); pxCircle(x, 8, 4, 2, accent); break;
    case 'amulet': pxLine(x, 3, 1, 8, 8, '#c09040'); pxLine(x, 13, 1, 8, 8, '#c09040'); pxCircle(x, 8, 10, 3, '#8a6420'); pxCircle(x, 8, 10, 2, accent); break;
    case 'potion': pxRect(x, 6, 1, 4, 2, WOOD); pxRect(x, 6, 3, 4, 3, '#8a9aaa'); pxCircle(x, 8, 10, 4, '#8a9aaa'); pxCircle(x, 8, 10, 3, accent); pxRect(x, 6, 8, 1, 2, '#fff'); break;
    case 'orb': pxCircle(x, 8, 8, 5, accent); pxCircle(x, 8, 8, 3, '#ffffff'); pxCircle(x, 8, 8, 2, accent); break;
    case 'reroll': pxCircle(x, 8, 8, 5, accent, false); pxRect(x, 11, 3, 3, 3, accent); pxRect(x, 2, 10, 3, 3, accent); break;
    default: pxRect(x, 4, 4, 8, 8, accent);
  }
  const o = outlineCanvas(c);
  return (ICON_CACHE[key] = { cv: o, url: o.toDataURL() });
}

/** Ability icons: framed 16x16 glyphs. */
const GLYPHS = {
  spin: x => { pxCircle(x, 8, 8, 5, '#fff', false); pxRect(x, 11, 2, 3, 3, '#fff'); pxRect(x, 2, 11, 3, 3, '#fff'); },
  slam: x => { pxRect(x, 6, 2, 4, 6, '#fff'); pxRect(x, 3, 8, 10, 2, '#fff'); pxLine(x, 2, 13, 5, 11, '#fff'); pxLine(x, 13, 13, 10, 11, '#fff'); pxLine(x, 8, 14, 8, 11, '#fff'); },
  shield: x => { pxRect(x, 4, 3, 8, 7, '#fff'); pxRect(x, 5, 10, 6, 2, '#fff'); pxRect(x, 6, 12, 4, 1, '#fff'); pxRect(x, 7, 4, 2, 7, '#0006'); },
  horn: x => { pxLine(x, 3, 12, 12, 3, '#fff'); pxLine(x, 3, 11, 11, 3, '#fff'); pxLine(x, 3, 3, 3, 7, '#fff'); pxLine(x, 12, 12, 8, 12, '#fff'); },
  leap: x => { for (let i = 0; i < 11; i++) pxRect(x, 2 + i, Math.round(12 - Math.sin(i / 10 * Math.PI) * 9), 1, 1, '#fff'); pxRect(x, 11, 10, 3, 3, '#fff'); },
  step: x => { pxRect(x, 3, 9, 3, 4, '#fff'); pxRect(x, 9, 3, 3, 4, '#fff'); pxRect(x, 3, 7, 3, 1, '#fff'); pxRect(x, 9, 1, 3, 1, '#fff'); },
  eye: x => { pxLine(x, 2, 8, 8, 4, '#fff'); pxLine(x, 8, 4, 14, 8, '#fff'); pxLine(x, 2, 8, 8, 12, '#fff'); pxLine(x, 8, 12, 14, 8, '#fff'); pxCircle(x, 8, 8, 2, '#fff'); },
  knives: x => { for (let a = 0; a < 8; a++) { const c = Math.cos(a * TAU / 8), s = Math.sin(a * TAU / 8); pxLine(x, Math.round(8 + c * 3), Math.round(8 + s * 3), Math.round(8 + c * 6), Math.round(8 + s * 6), '#fff'); } },
  cloud: x => { pxCircle(x, 5, 9, 3, '#fff'); pxCircle(x, 10, 8, 4, '#fff'); pxCircle(x, 8, 6, 3, '#fff'); pxRect(x, 3, 12, 11, 1, '#fff'); },
  slash: x => { pxLine(x, 2, 13, 13, 2, '#fff'); pxLine(x, 5, 14, 14, 5, '#fff'); pxLine(x, 1, 10, 10, 1, '#fff'); },
  flame: x => { pxCircle(x, 8, 10, 4, '#fff'); pxLine(x, 8, 2, 5, 8, '#fff'); pxLine(x, 8, 2, 11, 8, '#fff'); pxRect(x, 7, 4, 3, 5, '#fff'); },
  nova: x => { pxCircle(x, 8, 8, 6, '#fff', false); pxCircle(x, 8, 8, 3, '#fff', false); pxRect(x, 7, 7, 2, 2, '#fff'); },
  bolt: x => { pxLine(x, 10, 1, 5, 8, '#fff'); pxLine(x, 5, 8, 11, 8, '#fff'); pxLine(x, 11, 8, 6, 15, '#fff'); pxLine(x, 11, 1, 6, 8, '#fff'); },
  meteor: x => { pxCircle(x, 10, 10, 3, '#fff'); pxLine(x, 2, 2, 8, 8, '#fff'); pxLine(x, 4, 1, 9, 6, '#fff'); pxLine(x, 1, 4, 6, 9, '#fff'); },
  blink: x => { pxLine(x, 8, 1, 8, 15, '#fff'); pxLine(x, 1, 8, 15, 8, '#fff'); pxLine(x, 4, 4, 12, 12, '#fff'); pxLine(x, 12, 4, 4, 12, '#fff'); pxRect(x, 6, 6, 5, 5, '#fff'); },
  arrows: x => { for (const o of [-4, 0, 4]) { pxLine(x, 2, 8 + o, 12, 8 + o * .2, '#fff'); pxRect(x, 12, 7 + Math.round(o * .2), 2, 2, '#fff'); } },
  rain: x => { for (const o of [3, 7, 11]) { pxLine(x, o, 2, o + 2, 10, '#fff'); pxRect(x, o + 1, 11, 3, 2, '#fff'); } },
  trap: x => { pxRect(x, 2, 10, 12, 2, '#fff'); for (let i = 2; i < 14; i += 3) pxLine(x, i, 10, i + 1, 5, '#fff'); },
  roll: x => { pxCircle(x, 8, 8, 5, '#fff', false); pxLine(x, 3, 8, 13, 8, '#fff'); pxRect(x, 12, 6, 2, 5, '#fff'); },
  burst: x => { pxCircle(x, 8, 8, 3, '#fff'); for (let a = 0; a < 8; a++) pxLine(x, 8 + Math.round(Math.cos(a * TAU / 8) * 5), 8 + Math.round(Math.sin(a * TAU / 8) * 5), 8 + Math.round(Math.cos(a * TAU / 8) * 7), 8 + Math.round(Math.sin(a * TAU / 8) * 7), '#fff'); },
  cross: x => { pxRect(x, 6, 2, 4, 12, '#fff'); pxRect(x, 2, 6, 12, 4, '#fff'); },
  sun: x => { pxCircle(x, 8, 8, 3, '#fff'); for (let a = 0; a < 12; a++) pxRect(x, 8 + Math.round(Math.cos(a * TAU / 12) * 6), 8 + Math.round(Math.sin(a * TAU / 12) * 6), 1, 1, '#fff'); },
  hammer: x => { pxRect(x, 4, 2, 8, 5, '#fff'); pxRect(x, 7, 7, 2, 8, '#fff'); },
  charge: x => { pxLine(x, 2, 8, 13, 8, '#fff'); pxLine(x, 9, 4, 13, 8, '#fff'); pxLine(x, 9, 12, 13, 8, '#fff'); pxLine(x, 2, 5, 7, 5, '#fff'); pxLine(x, 2, 11, 7, 11, '#fff'); },
  skull: x => { pxCircle(x, 8, 7, 5, '#fff'); pxRect(x, 5, 11, 6, 3, '#fff'); pxRect(x, 5, 6, 2, 2, '#000'); pxRect(x, 9, 6, 2, 2, '#000'); pxRect(x, 7, 12, 1, 2, '#000'); },
  bone: x => { pxLine(x, 3, 12, 12, 3, '#fff'); pxRect(x, 1, 11, 3, 3, '#fff'); pxRect(x, 12, 2, 3, 3, '#fff'); },
  drain: x => { pxCircle(x, 4, 8, 2, '#fff'); pxCircle(x, 12, 8, 2, '#fff'); for (let i = 5; i < 11; i++) pxRect(x, i, 8 + Math.round(Math.sin(i) * 2), 1, 1, '#fff'); },
  raise: x => { pxLine(x, 8, 2, 8, 14, '#fff'); pxLine(x, 4, 6, 8, 2, '#fff'); pxLine(x, 12, 6, 8, 2, '#fff'); pxRect(x, 3, 13, 10, 2, '#fff'); },
  dash: x => { pxLine(x, 2, 5, 10, 5, '#fff'); pxLine(x, 4, 8, 14, 8, '#fff'); pxLine(x, 2, 11, 10, 11, '#fff'); },
  potion: x => { pxRect(x, 6, 2, 4, 3, '#fff'); pxCircle(x, 8, 10, 4, '#fff'); }
};
function abilityIcon(glyph, color) {
  const key = 'ab' + glyph + color;
  if (ICON_CACHE[key]) return ICON_CACHE[key];
  const [c, x] = pxCanvas(18, 18);
  pxRect(x, 0, 0, 18, 18, '#0b0810'); pxRect(x, 1, 1, 16, 16, color); pxRect(x, 1, 1, 16, 1, 'rgba(255,255,255,.35)'); pxRect(x, 1, 15, 16, 2, 'rgba(0,0,0,.3)');
  const [g, gx] = pxCanvas(16, 16);
  (GLYPHS[glyph] || GLYPHS.burst)(gx);
  x.globalAlpha = .45; x.drawImage(g, 2, 2); x.globalAlpha = 1; x.drawImage(g, 1, 1);
  return (ICON_CACHE[key] = { cv: c, url: c.toDataURL() });
}

/* ---------------- TILESETS: painted per region ---------------- */
const TILE_CACHE = {};
const LIQUID_COLS = {
  lava: ['#b8321a', '#f07a1a', '#ffd040'], water: ['#1a4e6c', '#2a7aa0', '#8ad0e8'], ice: ['#7ab0d0', '#a8d6ee', '#ffffff'],
  poison: ['#35701a', '#58a02a', '#b8f060'], swamp: ['#26341a', '#3a4a26', '#6a7a3a'], void: ['#07040e', '#2a1a4a', '#b080ff']
};
function getTiles(bi) {
  if (TILE_CACHE[bi]) return TILE_CACHE[bi];
  const B = BIOMES[bi], r = RNG(bi * 977 + 13);
  const mk = () => pxCanvas(16, 16);
  const floors = [];
  for (let v = 0; v < 5; v++) {
    const [c, x] = mk();
    pxRect(x, 0, 0, 16, 16, B.floor);
    for (let i = 0; i < 26; i++) pxRect(x, r.int(0, 15), r.int(0, 15), 1, 1, r() < .55 ? B.floor2 : B.line);
    if (B.organic) {
      for (let i = 0; i < 3; i++) pxRect(x, r.int(0, 13), r.int(0, 13), r.int(2, 3), 1, B.floor2);
    } else {
      pxRect(x, 0, 15, 16, 1, B.line); pxRect(x, 15, 0, 1, 16, B.line);
      if (v === 1) pxRect(x, 0, 7, 16, 1, B.line);
      if (v === 2) pxRect(x, 7, 0, 1, 15, B.line);
      pxRect(x, 0, 0, 15, 1, 'rgba(255,255,255,.04)');
    }
    floors.push(c);
  }
  const [wf, wx] = mk();
  pxRect(wx, 0, 0, 16, 16, B.wall);
  for (let j = 0; j < 4; j++) {
    const y = 2 + j * 4; pxRect(wx, 0, y + 3, 16, 1, B.wallDark);
    const off = j % 2 ? 4 : 0;
    for (let i = off; i < 16; i += 8) pxRect(wx, i, y, 1, 3, B.wallDark);
    for (let k = 0; k < 4; k++) pxRect(wx, r.int(0, 15), y + r.int(0, 2), 1, 1, r() < .5 ? B.wallHi : B.wallDark);
  }
  pxRect(wx, 0, 0, 16, 2, B.wallHi); pxRect(wx, 0, 15, 16, 1, '#0006');
  const [wt, tx] = mk();
  pxRect(tx, 0, 0, 16, 16, B.top);
  for (let i = 0; i < 10; i++) pxRect(tx, r.int(0, 15), r.int(0, 15), 1, 1, 'rgba(255,255,255,.035)');
  const [ck, cx] = mk(); cx.drawImage(wf, 0, 0);
  pxLine(cx, 4, 2, 7, 7, '#0b0810'); pxLine(cx, 7, 7, 5, 11, '#0b0810'); pxLine(cx, 7, 7, 11, 9, '#0b0810'); pxLine(cx, 11, 9, 12, 14, '#0b0810'); pxRect(cx, 8, 5, 1, 1, B.wallHi);
  const [dr, dx] = mk();
  pxRect(dx, 0, 0, 16, 16, '#150f12'); for (let i = 1; i < 16; i += 3) { pxRect(dx, i, 0, 2, 16, '#5a5660'); pxRect(dx, i, 0, 1, 16, '#8a8690'); }
  pxRect(dx, 0, 3, 16, 2, '#3a363f'); pxRect(dx, 0, 11, 16, 2, '#3a363f');
  const liq = [];
  const LC = LIQUID_COLS[B.liquid || 'water'];
  for (let f = 0; f < 3; f++) {
    const [c, x] = mk(); pxRect(x, 0, 0, 16, 16, LC[0]);
    const rr = RNG(bi * 31 + f * 7);
    for (let i = 0; i < 6; i++) pxRect(x, (rr.int(0, 15) + f * 3) % 16, rr.int(0, 15), rr.int(2, 4), 1, LC[1]);
    for (let i = 0; i < 3; i++) pxRect(x, rr.int(0, 15), rr.int(0, 15), 1, 1, LC[2]);
    liq.push(c);
  }
  const decor = {};
  for (const d of B.decor) decor[d] = decorTile(d, B, r);
  return (TILE_CACHE[bi] = { floors, wallFace: wf, wallTop: wt, crack: ck, door: dr, liq, decor });
}
function decorTile(type, B, r) {
  const [c, x] = pxCanvas(16, 16);
  const ox = r.int(2, 8), oy = r.int(3, 9);
  switch (type) {
    case 'bones': pxLine(x, ox, oy, ox + 5, oy + 3, '#d8d0bc'); pxLine(x, ox, oy + 3, ox + 5, oy, '#b8b09c'); break;
    case 'skull': pxRect(x, ox, oy, 4, 3, '#ddd4c0'); pxRect(x, ox + 1, oy + 3, 2, 1, '#ddd4c0'); pxRect(x, ox, oy + 1, 1, 1, '#1a1220'); pxRect(x, ox + 2, oy + 1, 1, 1, '#1a1220'); break;
    case 'rubble': for (let i = 0; i < 4; i++) pxRect(x, ox + r.int(0, 5), oy + r.int(0, 4), r.int(1, 2), 1, B.wallHi); break;
    case 'candle': pxRect(x, ox, oy + 2, 2, 4, '#e8e0c0'); pxRect(x, ox, oy, 2, 2, '#ffb040'); pxRect(x, ox, oy + 1, 1, 1, '#fff0a0'); break;
    case 'mushroom': pxRect(x, ox + 1, oy + 2, 1, 3, '#d8c8a0'); pxRect(x, ox, oy, 3, 2, '#5ae0a0'); pxRect(x, ox + 4, oy + 3, 1, 2, '#d8c8a0'); pxRect(x, ox + 3, oy + 2, 3, 1, '#5ae0a0'); break;
    case 'grass': for (let i = 0; i < 4; i++) pxLine(x, ox + i * 2, oy + 4, ox + i * 2 + r.int(-1, 1), oy + r.int(0, 2), '#5a8a3a'); break;
    case 'fern': pxLine(x, ox + 3, oy + 6, ox + 3, oy, '#3e7a2e'); for (let i = 0; i < 3; i++) { pxLine(x, ox + 3, oy + 1 + i * 2, ox, oy + i * 2, '#4e8a3a'); pxLine(x, ox + 3, oy + 1 + i * 2, ox + 6, oy + i * 2, '#4e8a3a'); } break;
    case 'flower': pxRect(x, ox + 1, oy + 2, 1, 3, '#4e8a3a'); pxRect(x, ox, oy, 3, 2, '#e070a0'); pxRect(x, ox + 1, oy, 1, 1, '#ffe060'); break;
    case 'crystal': pxLine(x, ox + 2, oy, ox, oy + 5, '#8ae0ff'); pxLine(x, ox + 2, oy, ox + 4, oy + 5, '#5ab0e0'); pxRect(x, ox + 1, oy + 3, 3, 3, '#6ac8f0'); pxRect(x, ox + 2, oy + 1, 1, 2, '#ffffff'); break;
    case 'snow': for (let i = 0; i < 5; i++) pxRect(x, ox + r.int(0, 6), oy + r.int(0, 5), 1, 1, '#e8f4ff'); break;
    case 'ember': for (let i = 0; i < 4; i++) pxRect(x, ox + r.int(0, 6), oy + r.int(0, 5), 1, 1, r() < .5 ? '#ff7a20' : '#ffc040'); break;
    case 'rug': pxRect(x, 1, 2, 14, 12, '#6a1e24'); pxRect(x, 2, 3, 12, 10, '#8a2a30'); pxRect(x, 4, 5, 8, 6, '#c8a040'); pxRect(x, 5, 6, 6, 4, '#8a2a30'); break;
    case 'seaweed': for (let i = 0; i < 6; i++) pxRect(x, ox + (i % 2), oy + i, 1, 1, '#3a8a5a'); for (let i = 0; i < 5; i++) pxRect(x, ox + 3 + (i % 2), oy + 1 + i, 1, 1, '#2a7a4a'); break;
    case 'shell': pxRect(x, ox, oy + 1, 4, 2, '#f0c8b0'); pxRect(x, ox + 1, oy, 2, 1, '#f0d8c8'); pxRect(x, ox + 1, oy + 1, 1, 2, '#c8a090'); break;
    case 'coral': pxLine(x, ox + 2, oy + 6, ox + 2, oy + 1, '#e0707a'); pxLine(x, ox + 2, oy + 3, ox, oy, '#e0707a'); pxLine(x, ox + 2, oy + 2, ox + 5, oy, '#f08a90'); break;
    case 'wisp': pxRect(x, ox, oy, 2, 2, '#b080ff'); pxRect(x, ox + 4, oy + 3, 1, 1, '#d0b0ff'); break;
    case 'glyph': pxRect(x, 3, 3, 10, 1, B.wallHi); pxRect(x, 3, 12, 10, 1, B.wallHi); pxRect(x, 3, 3, 1, 10, B.wallHi); pxRect(x, 12, 3, 1, 10, B.wallHi); pxRect(x, 7, 5, 2, 6, B.wallHi); pxRect(x, 5, 7, 6, 2, B.wallHi); break;
    case 'urn': pxRect(x, ox, oy + 1, 4, 4, '#a06a3a'); pxRect(x, ox + 1, oy, 2, 1, '#a06a3a'); pxRect(x, ox, oy + 2, 4, 1, '#d0a040'); break;
  }
  return c;
}
/** Soft light sprite used for the darkness mask and coloured glows. */
const LIGHT_CACHE = {};
function lightSprite(color = '255,255,255') {
  if (LIGHT_CACHE[color]) return LIGHT_CACHE[color];
  const [c, x] = pxCanvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(.45, `rgba(${color},.55)`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (LIGHT_CACHE[color] = c);
}
