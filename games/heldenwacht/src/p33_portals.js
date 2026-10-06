/* =====================================================================
   v1.31 PORTALEN
   - Win je een gewoon potje (campaign of co-op) in wereld 1 of 2, dan heb je
     kans op een portaal: Underworld Portal (wereld 1) of Lunar Portal (wereld 2).
     Kans: 0,5% op de eerste map tot 3% op de laatste map van die wereld,
     ×1,2 per moeilijkheid (Makkelijk ×1, Normaal ×1,2, Moeilijk ×1,44, …).
   - Een gevonden portaal is altijd Rare. Win je een portaal, dan:
       Rare → 80% kans op een Epic portaal
       Epic → 50% kans op een Legendary portaal
       Legendary → 10% kans op een Secret portaal
     Hetzelfde voor Lunar.
   - Speciale held: The Devil (Underworld) en Moon Empress (Lunar), beide Secret.
     Kans per gewonnen portaal: Rare 0,5% · Epic 2% · Legendary 6% · Secret 100%.
   - Elk portaal heeft een eigen map: in de Onderwereld komen vijanden van
     2 kanten, op de Maan van 3 kanten (meerdere routes naar één basis).
   - Portalen speel je alleen of samen met een vriend (co-op). De host
     gebruikt zijn portaal; allebei krijgen jullie de beloningen en de kansen.
   ===================================================================== */

/* ---------- meerdere routes (lanes) ----------
   map.lanes = extra paden (tegelcoördinaten) die uitkomen op het hoofdpad
   (meestal bij de basis). Een vijand op lane l > 0 gebruikt dezelfde
   afstand e.d als op het hoofdpad; zolang e.d < joinD loopt hij over zijn
   eigen route (geschaald naar dezelfde lengte), daarna over het hoofdpad.
   Zo blijven voortgang, lekken en 'eerste vijand' gewoon kloppen. */
const _pathTiles33 = pathTilesOf;
pathTilesOf = function (map) {
  const set = _pathTiles33.apply(this, arguments);
  for (const L of map.lanes || []) _pathTiles33({ path: L }).forEach(k => set.add(k));
  return set;
};
const _mapBg33 = mapBackground;
mapBackground = function (map) {
  const had = !!MAP_CACHE[map.id], res = _mapBg33.apply(this, arguments);
  if (had || !map.lanes || !map.lanes.length) return res;
  const ctx = res.canvas.getContext('2d'), th = THEMES[map.theme];
  ctx.save(); ctx.setTransform(res.canvas.width / GW, 0, 0, res.canvas.height / GH, 0, 0);
  const lines = map.lanes.map(L => L.map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2]));
  const stroke = (w, c, dash) => { for (const pts of lines) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.stroke(); } ctx.setLineDash([]); };
  if (th.glow) { ctx.save(); ctx.shadowColor = th.edge; ctx.shadowBlur = 16; stroke(38, th.edge); ctx.restore(); stroke(33, th.path); } else { stroke(38, th.edge); stroke(32, th.path); }
  if (th.dash) stroke(2.5, th.dash, [8, 12]);
  ctx.restore();
  return res;
};
function laneSegs(pts) { const segs = []; let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y); segs.push({ a, b, len, start: acc, ang: Math.atan2(b.y - a.y, b.x - a.x) }); acc += len; } return { segs, len: acc }; }
const _buildPath33 = Game.prototype.buildPath;
Game.prototype.buildPath = function () {
  _buildPath33.apply(this, arguments);
  this.lanes = null; this.laneRR = 0;
  if (!this.map.lanes || !this.map.lanes.length) return;
  this.lanes = this.map.lanes.map(path => {
    const pts = path.map(([x, y]) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 })), S = laneSegs(pts), end = pts[pts.length - 1];
    let joinD = 0, bd = 1e18; for (let d = 0; d <= this.pathLen; d += 2) { const p = this.posAt(d), dd = (p.x - end.x) ** 2 + (p.y - end.y) ** 2; if (dd < bd) { bd = dd; joinD = d; } }
    return { pts, segs: S.segs, len: S.len, joinD: Math.max(1, joinD), k: S.len / Math.max(1, joinD), start: { x: clamp(pts[0].x, 18, GW - 18), y: clamp(pts[0].y, 18, GH - 18) } };
  });
};
Game.prototype.posAtL = function (l, d) {
  const L = l && this.lanes && this.lanes[l - 1];
  if (!L || d >= L.joinD) return this.posAt(d);
  const fd = d * L.k;
  if (fd <= 0) { const s = L.segs[0]; return { x: s.a.x + Math.cos(s.ang) * fd, y: s.a.y + Math.sin(s.ang) * fd, ang: s.ang }; }
  for (const s of L.segs) if (fd <= s.start + s.len) { const f = (fd - s.start) / s.len; return { x: lerp(s.a.x, s.b.x, f), y: lerp(s.a.y, s.b.y, f), ang: s.ang }; }
  const s = L.segs[L.segs.length - 1]; return { x: s.b.x, y: s.b.y, ang: s.ang };
};
// welke route: nieuwe vijanden aan het begin om de beurt; afsplitsingen (bv. splitters, oproepingen) volgen hun ouder
const _updEnemy33 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e) {
  if (!this.lanes) return _updEnemy33.apply(this, arguments);
  const prev = this._laneCtx; this._laneCtx = e.lane || 0;
  try { return _updEnemy33.apply(this, arguments); } finally { this._laneCtx = prev; }
};
const _kill33 = Game.prototype.kill;
Game.prototype.kill = function (e) {
  if (!this.lanes || !e) return _kill33.apply(this, arguments);
  const prev = this._laneCtx; this._laneCtx = e.lane || 0;
  try { return _kill33.apply(this, arguments); } finally { this._laneCtx = prev; }
};
const _spawn33 = Game.prototype.spawnEnemy;
Game.prototype.spawnEnemy = function (type, d) {
  const e = _spawn33.apply(this, arguments);
  if (!e || !this.lanes) return e;
  e.lane = this._laneCtx != null && d > TILE * 0.5 ? this._laneCtx : (this.laneRR++) % (this.lanes.length + 1);
  const p = this.posAtL(e.lane, e.d); e.x = p.x; e.y = p.y; e.ay = p.y - (e.flying ? 16 : 0); e.dir = p.ang;
  return e;
};
// tekenen: extra poorten en stroompijltjes op elke route
const _drawPortal33 = Game.prototype.drawPortal;
Game.prototype.drawPortal = function (ctx, t) {
  _drawPortal33.apply(this, arguments);
  if (!this.lanes) return;
  const keep = this.portal; for (const L of this.lanes) { this.portal = L.start; _drawPortal33.call(this, ctx, t); } this.portal = keep;
};
const _drawFlow33 = Game.prototype.drawPathFlow;
Game.prototype.drawPathFlow = function (ctx, t) {
  _drawFlow33.apply(this, arguments);
  if (!this.lanes) return;
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.12)';
  this.lanes.forEach((L, i) => { for (let d = (t * 30) % 70; d < L.joinD; d += 70) { const p = this.posAtL(i + 1, d); if (p.x < 0 || p.x > GW || p.y < 0 || p.y > GH) continue; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -6); ctx.lineTo(-1, 0); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill(); ctx.restore(); } });
  ctx.restore();
};
// punten langs alle routes (voor effecten die 'het hele pad' raken)
Game.prototype.allPathPoints = function (step) {
  const out = []; for (let d = 0; d <= this.leakD; d += step) out.push(this.posAt(d));
  (this.lanes || []).forEach((L, i) => { for (let d = 0; d < L.joinD; d += step) out.push(this.posAtL(i + 1, d)); });
  return out;
};
// Rafaels Brandbom zet ook de andere routes in de fik
if (ABILITY_FX.brandbom) {
  const _bb33 = ABILITY_FX.brandbom;
  ABILITY_FX.brandbom = function (g, h, ult) {
    const n0 = (g.fires || []).length; _bb33.apply(this, arguments);
    if (!g.lanes) return; const P = g.fires, f0 = P[n0]; if (!f0) return;
    g.lanes.forEach((L, i) => { for (let d = 0; d < L.joinD; d += 30) { if (P.length >= 180) break; const p = g.posAtL(i + 1, d); P.push(Object.assign({}, f0, { x: p.x, y: p.y, seed: Math.random() * 10 })); } });
  };
}
// co-op: de gast moet weten op welke route elke vijand loopt
if (typeof coopSnapshot === 'function') { const _s33 = coopSnapshot; coopSnapshot = function (g) { const p = _s33.apply(this, arguments); if (g.lanes) p.EL = g.enemies.filter(e => !e.dead && e.lane).map(e => [e.id, e.lane]); return p; }; }
if (typeof coopGuestMsg === 'function') { const _m33 = coopGuestMsg; coopGuestMsg = function (g, ev, p) { const r = _m33.apply(this, arguments); if (ev === 'snap' && p && g.lanes) { const m = new Map(p.EL || []); for (const e of g.enemies) e.lane = m.get(e.id) || 0; } return r; }; }

/* ---------- thema's en maps ---------- */
Object.assign(THEMES, {
  underworld: { ground: '#1a0608', g2: '#20080b', path: '#0a0203', edge: '#dc2626', glow: true, dash: 'rgba(168,85,247,.45)', amb: 'ember', sky: '#0b0103', label: 'Onderwereld' },
  lunar: { ground: '#4b5563', g2: '#525c6b', path: '#1f2433', edge: '#c7d2fe', glow: true, dash: 'rgba(224,231,255,.55)', amb: 'sparkle', sky: '#020617', label: 'Maan' },
});
Object.assign(THEME_EXTRA, {
  underworld: {
    ground(ctx, x, y, i) { if (i % 3 === 0) { ctx.save(); ctx.strokeStyle = 'rgba(220,38,38,.45)'; ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 6; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 5); ctx.lineTo(x + 2, y + 11); ctx.stroke(); ctx.restore(); } else if (i % 5 === 0) { ctx.fillStyle = 'rgba(168,85,247,.25)'; circle(ctx, x, y, 2); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.45) { // grafsteen
        ctx.fillStyle = '#3f3f46'; ctx.beginPath(); ctx.moveTo(cx - 10, cy + 14); ctx.lineTo(cx - 10, cy - 6); ctx.arc(cx, cy - 6, 10, Math.PI, 0); ctx.lineTo(cx + 10, cy + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#18181b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 4); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy - 5); ctx.stroke();
      } else if (v < 0.8) { // zielenvuur
        ctx.save(); ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 16; const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14); g.addColorStop(0, '#f5d0fe'); g.addColorStop(0.5, '#a855f7'); g.addColorStop(1, 'rgba(88,28,135,0)'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.quadraticCurveTo(cx + 12, cy, cx, cy + 12); ctx.quadraticCurveTo(cx - 12, cy, cx, cy - 16); ctx.fill(); ctx.restore();
      } else { // lavapoel
        ctx.save(); ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14; const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15); g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#ef4444'); g.addColorStop(1, '#450a0a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 15, 9, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    } },
  lunar: {
    ground(ctx, x, y, i) { if (i % 4 === 0) { ctx.fillStyle = 'rgba(30,41,59,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(226,232,240,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 1, 7, 4, 0, Math.PI, TAU); ctx.stroke(); } else { ctx.fillStyle = 'rgba(226,232,240,.18)'; circle(ctx, x, y, 1.3); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.55) { // krater
        const r = 10 + rng() * 6; ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.ellipse(cx + 1, cy + 1, r * 0.7, r * 0.45, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(226,232,240,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.7, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (v < 0.8) { // maankristal
        ctx.save(); ctx.shadowColor = '#c7d2fe'; ctx.shadowBlur = 12; ctx.fillStyle = '#e0e7ff'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 6 - 3, cy + 12); ctx.lineTo(cx + i * 6, cy - 10 - (1 - Math.abs(i)) * 6); ctx.lineTo(cx + i * 6 + 3, cy + 12); ctx.closePath(); ctx.fill(); } ctx.restore();
      } else { // vlag-lander
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx - 10, cy - 2, 20, 10); ctx.strokeRect(cx - 10, cy - 2, 20, 10); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 8); ctx.lineTo(cx - 13, cy + 15); ctx.moveTo(cx + 8, cy + 8); ctx.lineTo(cx + 13, cy + 15); ctx.moveTo(cx + 4, cy - 2); ctx.lineTo(cx + 4, cy - 16); ctx.stroke(); ctx.fillStyle = '#818cf8'; ctx.fillRect(cx + 4, cy - 16, 9, 6);
      }
    } },
});
SPECIAL_MAPS.push(
  { id: 'onderwereld', kind: 'portal', world: 1, name: 'De Onderwereld', theme: 'underworld', reward: 900, hpMult: 3.4, startCash: 1500,
    desc: 'Achter de Underworld Portal. De doden komen van twee kanten binnen en trekken samen op naar je basis.',
    pool: ['grunt', 'runner', 'tank', 'flyer', 'shield', 'healer', 'splitter', 'necro', 'skelet'], bosses: ['wyrm', 'chaos', 'kolos'], finalBoss: 'kerkerheer',
    path: [[-1, 1], [6, 1], [6, 4], [11, 4], [11, 8], [3, 8], [3, 12], [19, 12], [19, 8], [15, 8]],
    lanes: [[[24, 1], [17, 1], [17, 4], [11, 4]]] },
  { id: 'maanbasis', kind: 'portal', world: 2, name: 'De Maan', theme: 'lunar', reward: 1800, hpMult: 6.5, startCash: 3400,
    desc: 'Achter de Lunar Portal. Vijanden landen aan drie kanten (links, rechts en boven) en trekken samen op naar je basis.',
    pool: ['flyer', 'hacker', 'schildgen', 'tank', 'runner', 'sluiper', 'shield', 'xenolarve', 'mutant'], bosses: ['netrunner', 'moederbrein', 'stationai'], finalBoss: 'stationai',
    path: [[9, -1], [9, 2], [15, 2], [15, 5], [12, 5], [12, 8], [4, 8], [4, 12], [20, 12], [20, 8], [15, 8]],
    lanes: [[[-1, 3], [6, 3], [6, 5], [12, 5]], [[24, 3], [19, 3], [19, 7], [12, 7]]] },
);
SMAP.onderwereld = SPECIAL_MAPS.find(m => m.id === 'onderwereld'); SMAP.maanbasis = SPECIAL_MAPS.find(m => m.id === 'maanbasis');
for (const m of [SMAP.onderwereld, SMAP.maanbasis]) m.pool = m.pool.filter(t => ENEMIES[t]);

/* ---------- portalen: gegevens ---------- */
const PORTAL = {
  tiers: ['rare', 'epic', 'legendary', 'secret'],
  worlds: {
    underworld: { name: 'Underworld Portal', map: 'onderwereld', world: 1, hero: 'duivel', color: '#ef4444', sides: 2 },
    lunar: { name: 'Lunar Portal', map: 'maanbasis', world: 2, hero: 'maankeizerin', color: '#c7d2fe', sides: 3 },
  },
  diff: { rare: 2, epic: 3, legendary: 4, secret: 5 },        // moeilijkheid van het portaal-potje
  waves: 20,
  next: { rare: 0.8, epic: 0.5, legendary: 0.1 },               // kans op het volgende portaal
  hero: { rare: 0.005, epic: 0.02, legendary: 0.06, secret: 1 }, // kans op The Devil / Moon Empress
  coins: { rare: 1500, epic: 3000, legendary: 6000, secret: 12000 },
  gems: { rare: 20, epic: 40, legendary: 80, secret: 150 },
  dropMin: 0.005, dropMax: 0.03, dropDiff: 1.2,
};
const portalKey = (w, t) => w + ':' + t;
function portalInv() { const D = Store.data; return D.portals || (D.portals = {}); }
function portalCount(w, t) { return portalInv()[portalKey(w, t)] || 0; }
function portalAdd(w, t, n = 1) { const P = portalInv(), k = portalKey(w, t); P[k] = Math.max(0, (P[k] || 0) + n); if (!P[k]) delete P[k]; }
function portalTotal() { return Object.values(portalInv()).reduce((a, b) => a + b, 0); }
function portalLabel(w, t) { return `${PORTAL.worlds[w].name} (${RARITIES[t] ? RARITIES[t].label : t})`; }
function portalWorldOfMap(m) { if (!m || !MAPS.includes(m)) return null; return (m.world || 1) === 2 ? 'lunar' : 'underworld'; }
// kans op een portaal na een gewonnen potje op deze map/moeilijkheid
function portalDropChance(m, diffIdx) {
  const w = portalWorldOfMap(m); if (!w) return 0;
  const list = MAPS.filter(x => (x.world || 1) === PORTAL.worlds[w].world), i = list.indexOf(m), n = list.length;
  const base = n > 1 ? PORTAL.dropMin + (PORTAL.dropMax - PORTAL.dropMin) * i / (n - 1) : PORTAL.dropMin;
  return base * Math.pow(PORTAL.dropDiff, diffIdx || 0);
}
const portalOf = g => (g && g.opts && g.opts.portal) || null;
const portalPct = p => { const v = p * 100; let t = v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2); if (t.includes('.')) t = t.replace(/\.?0+$/, ''); return t.replace('.', ',') + '%'; };

/* ---------- helden: The Devil en Moon Empress ---------- */
const PORTAL_HEROES = [
  { id: 'duivel', name: 'The Devil', rarity: 'secret', role: 'Area damage', exclusive: 'portal', portal: 'underworld', cap: 1, title: 'Heerser van de Onderwereld', style: 'projectile', proj: 'fire', cost: 2100,
    desc: 'Hellevuur dat ontploft en alles laat branden. Elke vijand die hij doodt geeft hem een ziel: +0,4% schade per ziel (tot +50%). Zwakke vijanden maakt hij meteen af. Ability *Hellepoort*: alle vijanden op de map krijgen zware schade en branden; bijna-dode gewone vijanden worden geoogst. Alleen uit de Underworld Portal.',
    base: { dmg: 330, splash: 1.4, burn: 120, burnDur: 4, range: 4.4, rate: 1.0, multi: 2, air: true, projSpeed: 12, shred: 6, execute: 0.06 },
    look: { skin: '#b91c1c', suit: '#1c0606', suit2: '#ef4444', cape: '#450a0a', hair: 'spiky', hairC: '#0a0a0a', horns: '#1f1f1f', emblem: 'flame', weapon: 'staff', glow: '#ef4444', big: true }, fx: 'ember', ability: 'hellepoort',
    upgrades: [U('Zwavel', 3000, '+180 schade, +60 brand', { dmg: 180, burn: 60 }, false, true), U('Drietand', 4000, '+1 vuurbal, +0,4 bereik', { multi: 1, range: 0.4 }), U('Hellevuur', 7000, 'Grotere explosies, breekt 8 pantser', { splash: 0.5, shred: 8 }, true, true), U('Zielenhonger', 9000, '+350 schade, maakt vijanden onder 10% meteen af', { dmg: 350, execute: 0.04 }), U('Vorst der Hel', 17000, '+600 schade, +0,3 snelheid. ULTIMATE: Apocalyps', { dmg: 600, rate: 0.3 }, true, true)] },
  { id: 'maankeizerin', name: 'Moon Empress', rarity: 'secret', role: 'Controle', exclusive: 'portal', portal: 'lunar', cap: 1, title: 'Keizerin van de Maan', style: 'projectile', proj: 'star', cost: 2100,
    desc: 'Maanstralen op 3 vijanden die vertragen. Alles wat ze raakt, krijgt 2 seconden 20% extra schade van iedereen (Maanlicht). Ability *Eclips*: alle vijanden staan even stil (bazen korter) en krijgen 50% extra schade. Alleen uit de Lunar Portal.',
    base: { dmg: 250, splash: 1.1, range: 4.8, rate: 1.1, multi: 3, slow: 0.35, slowDur: 2, air: true, projSpeed: 14, crit: 0.15, critMult: 2.5 },
    look: { skin: '#f1f5f9', suit: '#1e1b4b', suit2: '#e0e7ff', cape: '#312e81', hair: 'crown', hairC: '#e5e7eb', emblem: 'moon', weapon: 'orb', orb: '#e0e7ff', halo: true, wings: true, big: true }, fx: 'star', ability: 'eclips',
    upgrades: [U('Maanstof', 3000, '+150 schade', { dmg: 150 }, false, true), U('Getijden', 4000, '+1 straal, sterkere vertraging', { multi: 1, slow: 0.1 }), U('Zilverlicht', 7000, '+0,5 bereik, +0,3 snelheid', { range: 0.5, rate: 0.3 }, true, true), U('Nachtkroon', 9000, '+320 schade, +10% kritiek', { dmg: 320, crit: 0.1 }), U('Volle Maan', 17000, '+550 schade, +1 straal. ULTIMATE: Volle Maan', { dmg: 550, multi: 1 }, true, true)] },
];
PORTAL_HEROES.forEach(h => { if (!HERO[h.id]) { HEROES.push(h); HERO[h.id] = h; } });
if (typeof heroSource === 'function') { const _src33 = heroSource; heroSource = function (h) { return h && h.exclusive === 'portal' ? PORTAL.worlds[h.portal].name : _src33.apply(this, arguments); }; }
Object.assign(ABILITIES, {
  hellepoort: { name: 'Hellepoort', ult: 'Apocalyps', cd: 45, desc: 'Alle vijanden op de map krijgen 6× zijn schade en gaan branden. Gewone vijanden onder 20% levens worden meteen geoogst. ULTIMATE: 12× schade, oogst onder 35% en het hele pad staat 6 seconden in brand.' },
  eclips: { name: 'Eclips', ult: 'Volle Maan', cd: 50, desc: 'Alle vijanden staan 3 seconden stil (bazen 1,2 s) en krijgen 8 seconden 50% extra schade. ULTIMATE: 5 seconden (bazen 2 s), 100% extra schade en 8× haar schade op alles.' },
});
Object.assign(ABILITY_FX, {
  hellepoort(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead); if (!list.length) return noTarget(g, h);
    const thr = ult ? 0.35 : 0.2;
    for (const e of list) {
      if (!e.boss && !e.megaBoss && !e.E.worldBoss && e.hp / Math.max(1, e.maxHp) <= thr) { g.fx.burst(e.x, e.ay, '#a855f7', 10, 140, 3, 0.5, 'glow'); e.hp = 0; g.kill(e, h); continue; }
      g.damage(e, h.st.dmg * (ult ? 12 : 6), h, { color: '#ef4444' });
      if (!e.dead) { e.burnT = Math.max(e.burnT || 0, 4); e.burnD = Math.max(e.burnD || 0, h.st.burn * (ult ? 2 : 1.2)); }
    }
    if (ult) { const P = g.fires || (g.fires = []); for (const p of g.allPathPoints(30)) { if (P.length >= 180) break; P.push({ x: p.x, y: p.y, r: 24, life: 6, max: 6, dps: h.st.dmg * 2.5, burn: h.st.burn, h, seed: Math.random() * 10 }); } }
    g.banner(ult ? 'APOCALYPS' : 'HELLEPOORT', 'De Onderwereld gaat open', '#ef4444'); g.shake(ult ? 16 : 10); g.flash = { color: '#7f1d1d', life: 0.4, max: 0.4 }; Sfx.play('boom');
  },
  eclips(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead); if (!list.length) return noTarget(g, h);
    for (const e of list) {
      if (ult) g.damage(e, h.st.dmg * 8, h, { color: '#c7d2fe' });
      if (e.dead) continue;
      e.vulnT = Math.max(e.vulnT || 0, ult ? 10 : 8); e.vulnM = Math.max(e.vulnM || 0, ult ? 1 : 0.5);
      if (!e.ccImm && !e.megaBoss && !e.E.worldBoss) e.stunT = Math.max(e.stunT || 0, e.boss ? (ult ? 2 : 1.2) : (ult ? 5 : 3));
    }
    g.eclipseT = ult ? 5 : 3;
    g.banner(ult ? 'VOLLE MAAN' : 'ECLIPS', 'Alles staat stil onder de maan', '#c7d2fe'); g.flash = { color: '#1e1b4b', life: 0.6, max: 0.6 }; g.shake(8); Sfx.play('freeze');
  },
});
// The Devil: zielen geven extra schade
const _kill33b = Game.prototype.kill;
Game.prototype.kill = function (e, h) {
  const was = e && e.dead; const r = _kill33b.apply(this, arguments);
  if (!was && e && e.dead && h && h.def && h.def.id === 'duivel') h.souls = (h.souls || 0) + 1;
  return r;
};
const _heroStats33 = Game.prototype.heroStats;
Game.prototype.heroStats = function (h) {
  const st = _heroStats33.apply(this, arguments);
  if (h.def && h.def.id === 'duivel' && h.souls) st.dmg *= 1 + Math.min(0.5, h.souls * 0.004);
  return st;
};
// Moon Empress: Maanlicht (20% extra schade, 2 seconden)
const _damage33 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h) {
  const r = _damage33.apply(this, arguments);
  if (h && h.def && h.def.id === 'maankeizerin' && e && !e.dead) { e.vulnT = Math.max(e.vulnT || 0, 2); e.vulnM = Math.max(e.vulnM || 0, 0.2); }
  return r;
};
// eclips: de map wordt donker met een maan
const _updExt33 = Game.prototype.updateExt;
Game.prototype.updateExt = function (dt) { _updExt33.call(this, dt); if (this.eclipseT > 0) this.eclipseT -= dt; };
const _drawExt33 = Game.prototype.drawExt;
Game.prototype.drawExt = function (ctx, t, under) {
  _drawExt33.call(this, ctx, t, under);
  if (under || !(this.eclipseT > 0)) return;
  const a = Math.min(1, this.eclipseT) * 0.35; ctx.save(); ctx.fillStyle = rgba('#020617', a); ctx.fillRect(0, 0, GW, GH);
  ctx.globalAlpha = Math.min(1, this.eclipseT); ctx.fillStyle = '#e0e7ff'; ctx.shadowColor = '#c7d2fe'; ctx.shadowBlur = 30; circle(ctx, GW - 70, 60, 26); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#020617'; circle(ctx, GW - 60, 54, 24); ctx.fill(); ctx.restore();
};
// hoorns voor The Devil
const _drawHair33 = drawHair;
drawHair = function (ctx, L, K, hy) {
  _drawHair33.apply(this, arguments);
  if (!L.horns) return;
  ctx.save(); ctx.fillStyle = L.horns; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 4 * K, hy - 6 * K); ctx.quadraticCurveTo(s * 11 * K, hy - 9 * K, s * 9 * K, hy - 17 * K); ctx.quadraticCurveTo(s * 8 * K, hy - 10 * K, s * 2 * K, hy - 8 * K); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
};

/* ---------- portaal-potjes ---------- */
const _startMatch33 = startMatch;
startMatch = function (o) {
  if (o && o.mp && o.mp.kind === 'portal') {
    const m = mapById(o.map), w = m && m.kind === 'portal' ? (m.world === 2 ? 'lunar' : 'underworld') : null, t = PORTAL.tiers[(o.diffIdx || 0) - 2];
    if (!w || !t) return _startMatch33.apply(this, arguments);
    if (o.mp.role === 'host' && !o.portalPaid) {
      if (portalCount(w, t) < 1) { toast(`Je hebt geen ${portalLabel(w, t)} meer.`, 'bad'); if (typeof MP !== 'undefined') MP.leave(); return; }
      portalAdd(w, t, -1); Store.save();
    }
    o = Object.assign({}, o, { portal: { w, t }, portalPaid: true });
  } else if (o && o.mode === 'portal') {
    const P = o.portal || {}, w = P.w, t = P.t;
    if (!PORTAL.worlds[w] || !PORTAL.tiers.includes(t)) return;
    if (portalCount(w, t) < 1) {
      toast(`Je hebt geen ${portalLabel(w, t)} meer.`, 'bad'); Sfx.play('error');
      if (!App.game) { $('#topbar').hidden = false; $('#main').hidden = false; $('#scr-game').hidden = true; App.modeTab = 'portals'; nav('modes'); }
      return;
    }
    if (!Store.data.team.length) return _startMatch33.apply(this, arguments);
    portalAdd(w, t, -1); Store.save();
    o = Object.assign({}, o, { map: PORTAL.worlds[w].map, diffIdx: PORTAL.diff[t], back: 'modes' });
  }
  return _startMatch33.call(this, o);
};
const _initExt33 = Game.prototype.initExt3;
Game.prototype.initExt3 = function () { _initExt33.call(this); if (portalOf(this)) this.totalWaves = PORTAL.waves; };
const _modeLabel33 = modeLabel;
modeLabel = function (g) {
  const P = portalOf(g); if (!P) return _modeLabel33.apply(this, arguments);
  const mp = g.mp || (g.opts && g.opts.mp); return `${portalLabel(P.w, P.t)}${mp ? ' met ' + mp.opp.name : ''}`;
};
// beloningen
function portalRoll(w, t, rng = Math.random) {
  const out = { coins: Math.round(PORTAL.coins[t] * (w === 'lunar' ? 1.6 : 1)), gems: PORTAL.gems[t], hero: null, next: null };
  if (rng() < PORTAL.hero[t]) out.hero = PORTAL.worlds[w].hero;
  const ni = PORTAL.tiers.indexOf(t) + 1; if (PORTAL.next[t] && rng() < PORTAL.next[t]) out.next = PORTAL.tiers[ni];
  return out;
}
const _finish33 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const P = portalOf(g);
  if (P) g._mpRew = true; // gewone co-op-beloning overslaan
  const R = _finish33.apply(this, arguments);
  if (!g || g._portal33) return R; g._portal33 = true;
  const win = !!(g.result && g.result.win);
  if (P) {
    if (!win) { R.rows.push([`${portalLabel(P.w, P.t)} niet gehaald`, 'Het portaal is gesloten']); Store.save(); return R; }
    const roll = portalRoll(P.w, P.t), pm = this.prestigeMult() * this.collMult(), coins = Math.round(roll.coins * pm);
    this.grant({ coins, gems: roll.gems }); R.coins += coins;
    R.rows.push([`${portalLabel(P.w, P.t)} gehaald!`, coins]); R.rows.push(['Gems', `+${roll.gems}`]);
    if (roll.hero) { const res = grantHero(roll.hero); const H = HERO[roll.hero]; R.rows.push([`${H.name}!`, res.isNew ? 'Nieuwe Secret-held!' : 'Extra exemplaar']); R.lines.push(`${H.name} gevonden!`); g.portalHero = roll.hero; }
    else R.rows.push([`${HERO[PORTAL.worlds[P.w].hero].name}`, `Niet dit keer (${portalPct(PORTAL.hero[P.t])} kans)`]);
    if (roll.next) { portalAdd(P.w, roll.next); R.rows.push(['Nieuw portaal!', portalLabel(P.w, roll.next)]); R.lines.push(`Je kreeg een ${portalLabel(P.w, roll.next)}!`); g.portalNext = roll.next; }
    else if (PORTAL.next[P.t]) R.rows.push(['Volgend portaal', `Niet dit keer (${portalPct(PORTAL.next[P.t])} kans)`]);
    const S = Store.data.stats; S.portalWins = (S.portalWins || 0) + 1;
    Store.save(); return R;
  }
  // gewone potjes in wereld 1 en 2: kans op een portaal
  const normal = g.mode === 'campaign' || (g.mode === 'coop2' && !(g.opts && g.opts.mega));
  if (win && normal) {
    const w = portalWorldOfMap(g.map), ch = portalDropChance(g.map, g.diffIdx);
    if (w && Math.random() < ch) { portalAdd(w, 'rare'); g.portalDrop = w; R.rows.push(['Portaal gevonden!', portalLabel(w, 'rare')]); R.lines.push(`Je vond een ${portalLabel(w, 'rare')}! Open hem bij Modi → Portalen.`); Store.save(); }
  }
  return R;
};

/* ---------- co-op: uitnodigen voor een portaal ----------
   In de database is het een co-op-uitnodiging met map "pt:<map>" (max. 32 tekens). */
KIND_LABEL.portal = 'Portaal';
const portalDecode = inv => { if (inv && typeof inv.map === 'string' && inv.map.startsWith('pt:')) { inv.kind = 'portal'; inv.map = inv.map.slice(3); } return inv; };
const _socInvite33 = SOC.invite;
SOC.invite = function (to, kind, map, diff) { return kind === 'portal' ? _socInvite33.call(this, to, 'coop', 'pt:' + map, diff).then(r => Object.assign({}, r, { kind: 'portal', map })) : _socInvite33.apply(this, arguments); };
const _socRpc33 = SOC.rpc;
SOC.rpc = async function (fn) {
  const r = await _socRpc33.apply(this, arguments);
  if (fn === 'my_social' && r) { (r.invites || []).forEach(portalDecode); (r.sent || []).forEach(portalDecode); }
  if (fn === 'invite_respond' && r && r.ok) portalDecode(r);
  return r;
};
const _join33 = MP.join;
MP.join = function (inv, role, opp) { return _join33.call(this, portalDecode(Object.assign({}, inv)), role, opp); };
function openPortalInvite(w, t) {
  if (portalCount(w, t) < 1) { toast(`Je hebt geen ${portalLabel(w, t)}.`, 'bad'); return; }
  const d = SOC.data, fr = (d && d.friends) || [];
  App.portalInv = { w, t };
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-labelledby="pinv-title"><div class="panel modal-card mp-dialog" style="width:min(520px,100%)">
    <button type="button" class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
    <span class="kicker">Samen · portaal</span><h2 id="pinv-title" style="font-size:24px">${esc(portalLabel(w, t))} met een vriend</h2>
    <p class="muted" style="margin:4px 0 12px">Jullie verdedigen samen ${esc(SMAP[PORTAL.worlds[w].map].name)} (${DIFFS[PORTAL.diff[t]].name}, ${PORTAL.waves} golven). Jij gebruikt je portaal; als jullie winnen krijgen jullie <b>allebei</b> de beloning en allebei een kans op ${esc(HERO[PORTAL.worlds[w].hero].name)} en het volgende portaal.</p>
    ${fr.length ? `<div class="row-list">${fr.slice().sort((a, b) => SOC.isOnline(b) - SOC.isOnline(a) || a.name.localeCompare(b.name)).map(f => `<div class="row-card"><div><b>${esc(f.name)}</b> <span class="muted">${SOC.isOnline(f) ? '· online' : ''}</span></div><button class="btn btn-sm btn-pow" data-act="portal-invite-send" data-id="${f.id}">Uitnodigen</button></div>`).join('')}</div>`
      : `<p class="muted">${d ? 'Je hebt nog geen vrienden. Voeg ze toe bij Vrienden.' : 'Vrienden laden… (online spelen moet aan staan)'}</p>`}
    <div class="btn-row" style="margin-top:14px"><button class="btn" data-act="modal-close">Annuleren</button></div>
  </div></div>`;
}

/* ---------- scherm: Modi → Portalen ---------- */
function portalsBody() {
  const tierRow = (w, t) => {
    const n = portalCount(w, t), W = PORTAL.worlds[w], hc = PORTAL.hero[t], nx = PORTAL.next[t];
    return `<div class="row-card portal-row" style="--rc:${rarColor(t)}">
      <div style="min-width:0"><div class="rc-title"><span style="color:${rarColor(t)}">${RARITIES[t].label}</span> · ${esc(W.name)} <span class="num muted">×${n}</span></div>
        <div class="rc-sub">${DIFFS[PORTAL.diff[t]].name} · ${PORTAL.waves} golven · ${fmt(Math.round(PORTAL.coins[t] * (w === 'lunar' ? 1.6 : 1)))} munten + ${PORTAL.gems[t]} gems</div>
        <div class="rc-sub">${esc(HERO[W.hero].name)}: <b>${t === 'secret' ? 'gegarandeerd' : portalPct(hc) + ' kans'}</b>${nx ? ` · ${RARITIES[PORTAL.tiers[PORTAL.tiers.indexOf(t) + 1]].label} portaal: <b>${portalPct(nx)}</b>` : ''}</div></div>
      <div class="btn-row" style="flex-wrap:nowrap"><button class="btn btn-sm btn-pow" data-act="portal-open" data-w="${w}" data-t="${t}" ${n ? '' : 'disabled'}>Openen</button><button class="btn btn-sm btn-sky" data-act="portal-friend" data-w="${w}" data-t="${t}" ${n ? '' : 'disabled'}>Met vriend</button></div></div>`;
  };
  const card = w => {
    const W = PORTAL.worlds[w], m = SMAP[W.map], H = HERO[W.hero], own = !!Store.data.heroes[H.id];
    const list = MAPS.filter(x => (x.world || 1) === W.world), first = list[0], last = list[list.length - 1];
    return `<div class="panel card portal-card" style="--pc:${W.color}">
      <canvas data-map="${m.id}" style="width:100%;aspect-ratio:24/15;border:2px solid var(--edge);border-radius:4px;max-width:100%"></canvas>
      <span class="kicker">Wereld ${W.world} · vijanden van ${W.sides} kanten</span><h3>${esc(W.name)}</h3>
      <p class="muted" style="margin:0">${esc(m.desc)}</p>
      <div style="display:flex;gap:10px;align-items:center"><div style="width:56px;height:56px;flex:none;overflow:hidden;border-radius:6px">${portrait(H.id).replace('<canvas ', '<canvas style="width:56px;height:56px;display:block" ')}</div><div><b style="color:${rarColor(H.rarity)}">${esc(H.name)}</b> <span class="muted">(Secret)${own ? ' · in bezit' : ''}</span><div class="rc-sub">${esc(H.title)}</div></div></div>
      <p class="muted" style="font-size:13px;margin:0">Vinden: win een gewoon potje in wereld ${W.world}. Kans ${portalPct(portalDropChance(first, 0))} op ${esc(first.name)} tot ${portalPct(portalDropChance(last, 0))} op ${esc(last.name)} (Makkelijk), ×1,2 per moeilijkheid hoger.</p>
      <div class="row-list">${PORTAL.tiers.map(t => tierRow(w, t)).join('')}</div>
    </div>`;
  };
  return `<p class="muted" style="margin-top:0">Een gevonden portaal is altijd <b style="color:${rarColor('rare')}">Rare</b>. Win je een portaal, dan heb je kans op het volgende: Rare → Epic 80%, Epic → Legendary 50%, Legendary → Secret 10%. Een portaal is op als je hem opent, ook als je verliest.</p>
    <div class="two-col">${card('underworld')}${card('lunar')}</div>`;
}
const _renderModes33 = renderModes;
renderModes = function () {
  const mine = App.modeTab === 'portals';
  const r = _renderModes33.apply(this, arguments);
  const tabs = document.querySelector('#scr-modes .tabs');
  if (tabs && !tabs.querySelector('[data-tab="portals"]')) {
    const n = portalTotal(); const b = document.createElement('button'); b.dataset.act = 'mode-tab'; b.dataset.tab = 'portals'; b.setAttribute('aria-pressed', String(mine));
    b.innerHTML = `Portalen${n ? `<span class="ndot">${n}</span>` : ''}`; tabs.appendChild(b);
  }
  if (mine) {
    const box = document.createElement('div'); box.id = 'portals-body'; box.innerHTML = portalsBody();
    tabs ? tabs.after(box) : $('#scr-modes').appendChild(box);
    $$('#scr-modes canvas[data-map]').forEach(cv => drawMapThumb(cv, mapById(cv.dataset.map)));
    hydratePortraits($('#scr-modes'));
  }
  return r;
};
Object.assign(ACTIONS, {
  'portal-open': b => { Sfx.play('click'); startMatch({ mode: 'portal', portal: { w: b.dataset.w, t: b.dataset.t }, map: PORTAL.worlds[b.dataset.w].map, diffIdx: PORTAL.diff[b.dataset.t], back: 'modes' }); },
  'portal-friend': b => { Sfx.play('click'); if (!SOC.data && SOC.refresh) SOC.refresh(); openPortalInvite(b.dataset.w, b.dataset.t); },
  'portal-invite-send': async b => {
    const I = App.portalInv; if (!I) return; const f = ((SOC.data && SOC.data.friends) || []).find(x => x.id === b.dataset.id);
    if (portalCount(I.w, I.t) < 1) { toast(`Je hebt geen ${portalLabel(I.w, I.t)} meer.`, 'bad'); return; }
    const map = PORTAL.worlds[I.w].map, diff = PORTAL.diff[I.t];
    try { const r = await SOC.invite(b.dataset.id, 'portal', map, diff); closeOverlay(); MP.waitForAnswer(Object.assign({}, r, { to: b.dataset.id, toName: f ? f.name : 'je vriend', kind: 'portal', map, diff })); }
    catch (e) { toast(/notfriends/.test(e.message) ? 'Jullie zijn (nog) geen vrienden.' : 'Uitnodigen lukte niet. Probeer het opnieuw.', 'bad'); }
  },
});
// uitnodiging-popup bij de vriend: duidelijk dat het een portaal is
const _showInv33 = typeof showInvitePopup === 'function' ? showInvitePopup : null;
if (_showInv33) showInvitePopup = function (inv) {
  const r = _showInv33.apply(this, arguments);
  if (inv && inv.kind === 'portal') { const el = document.querySelector(`.mp-invite[data-id="${inv.id}"]`); const m = SMAP[inv.map]; const t = PORTAL.tiers[(inv.diff || 0) - 2];
    if (el && m && t) { const p = el.querySelector('p, .muted'); if (p) p.textContent = `${portalLabel(m.world === 2 ? 'lunar' : 'underworld', t)} · ${m.name}`; } }
  return r;
};
