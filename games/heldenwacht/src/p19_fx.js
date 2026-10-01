/* =====================================================================
   Effecten 2.0: sporen, mondingsvuur, inslagen, licht, explosies,
   ability-signaturen, held- en vijandanimaties en baasfases.
   Een kwaliteitsregelaar (FXQ) schaalt alles automatisch terug als de
   framerate zakt, zodat het spel soepel blijft.
   ===================================================================== */
const FXQ = {
  q: 1, avg: 6,
  // meet hoe lang tekenen echt duurt; boven ~14 ms per beeld gaat de kwaliteit omlaag
  frame(ms) {
    this.avg = this.avg * 0.9 + Math.min(80, ms) * 0.1;
    const cap = Store.data.settings.fxHigh ? 1 : 0.5;
    if (this.avg > 14) this.q = Math.max(0.3, this.q - 0.02); else if (this.avg < 9) this.q = Math.min(cap, this.q + 0.005);
    if (this.q > cap) this.q = cap;
  },
  get rich() { return this.q > 0.55; },
};
// Maximaal aantal deeltjes schaalt mee met de kwaliteit
FX.prototype.add = (function (orig) {
  return function (o) { if (this.p.length > 260 + 1140 * FXQ.q) return; return orig.call(this, o); };
})(FX.prototype.add);

const TRAIL_COL = { arrow: '#fde68a', bullet: '#fde047', shuriken: '#e4e4e7', fire: '#fb923c', time: '#fcd34d', plasma: '#f472b6', star: '#fef3c7', snipe: '#d9f99d', phantom: '#c4b5fd', void: '#d946ef', ball: '#fb7185', bee: '#facc15', crystal: '#67e8f9', acid: '#a3e635', echo: '#22d3ee', glue: '#f8fafc', coin: '#facc15' };
const NO_TRAIL = { grenade: 1, shield: 1, rope: 1 };

/* ---------- licht- en decallagen ---------- */
Game.prototype.addLight = function (x, y, r, color, life = 0.25, a = 0.55) {
  if (!FXQ.rich && r < 40) return;
  const L = this.lights || (this.lights = []); if (L.length > 14 + 30 * FXQ.q) L.shift();
  L.push({ x, y, r, color, life, max: life, a });
};
Game.prototype.addScorch = function (x, y, r, color) {
  if (!FXQ.rich) return;
  const S = this.scorch || (this.scorch = []); if (S.length > 24) S.shift();
  S.push({ x, y, r, color: color || '#000000', life: 3.5, max: 3.5, rot: Math.random() * TAU });
};
const _initExt11 = Game.prototype.initExt3;
Game.prototype.initExt3 = function () {
  _initExt11.call(this);
  this.lights = []; this.scorch = [];
  // decals onder vijanden
  this.addExt({ under: true, update(g, dt) { for (const s of g.scorch) s.life -= dt; if (g.scorch.length && g.scorch[0].life <= 0) g.scorch = g.scorch.filter(s => s.life > 0); return true; },
    draw(g, ctx) { for (const s of g.scorch) { const a = Math.min(1, s.life / 1.2) * 0.35; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = a; ctx.fillStyle = '#05040d'; ctx.beginPath(); ctx.ellipse(0, 0, s.r, s.r * 0.6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = a * 0.6; ctx.fillStyle = s.color; ctx.beginPath(); ctx.ellipse(0, 0, s.r * 0.55, s.r * 0.32, 0, 0, TAU); ctx.fill(); ctx.restore(); } } });
  // licht bovenop alles
  this.addExt({ under: false, update(g, dt) { for (const l of g.lights) l.life -= dt; if (g.lights.length && g.lights.some(l => l.life <= 0)) g.lights = g.lights.filter(l => l.life > 0); return true; },
    draw(g, ctx) {
      if (!g.lights.length) return; ctx.globalCompositeOperation = 'lighter';
      for (const l of g.lights) { const k = l.life / l.max, r = l.r * (1.15 - 0.15 * k); const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r); gr.addColorStop(0, rgba(l.color, l.a * k)); gr.addColorStop(1, rgba(l.color, 0)); ctx.fillStyle = gr; ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2); }
    } });
};
const _render11 = Game.prototype.render;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
Game.prototype.render = function (ctx, k) { const t0 = nowMs(), r = _render11.call(this, ctx, k); FXQ.frame(nowMs() - t0); return r; };

/* ---------- projectielen: sporen, mondingsvuur, inslag ---------- */
const _updProj11 = Game.prototype.updateProjectiles;
Game.prototype.updateProjectiles = function (dt) {
  if (FXQ.q > 0.4) for (const p of this.proj) { if (NO_TRAIL[p.kind]) continue; const tr = p.tr || (p.tr = []); tr.push(p.x, p.y); if (tr.length > 14) tr.splice(0, 2); }
  return _updProj11.call(this, dt);
};
const _drawProj11 = Game.prototype.drawProj;
Game.prototype.drawProj = function (ctx, p, t) {
  const tr = p.tr;
  if (tr && tr.length >= 4 && FXQ.q > 0.4) {
    const col = TRAIL_COL[p.kind] || p.color || '#ffffff', tier = p.h ? p.h.tier : 0, w0 = (p.big ? 5 : 2.2) + tier * 0.45, n = tr.length / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 1; i < n; i++) { const f = i / n; ctx.strokeStyle = rgba(col, 0.55 * f); ctx.lineWidth = w0 * f; ctx.beginPath(); ctx.moveTo(tr[i * 2 - 2], tr[i * 2 - 1]); ctx.lineTo(i === n - 1 ? p.x : tr[i * 2], i === n - 1 ? p.y : tr[i * 2 + 1]); ctx.stroke(); }
    if (tier >= 3) { ctx.fillStyle = rgba(col, 0.35); circle(ctx, p.x, p.y, 4 + tier); ctx.fill(); }
    ctx.restore();
  }
  return _drawProj11.call(this, ctx, p, t);
};
const _fire11 = Game.prototype.fireProjectile;
Game.prototype.fireProjectile = function (h, e, st, i = 0, over = {}) {
  _fire11.call(this, h, e, st, i, over);
  if (i === 0 && !h.temp) {
    const p = this.proj[this.proj.length - 1], col = TRAIL_COL[p.kind] || h.look.suit2;
    this.fx.add({ type: 'glow', x: p.sx, y: p.sy, size: 3.5 + h.tier * 0.6, color: col, life: 0.12, drag: 0 });
    if (FXQ.rich && Math.random() < 0.7) { const a = Math.atan2(e.ay - p.sy, e.x - p.sx); for (let k = 0; k < 2; k++) { const s = rnd(80, 160), aa = a + rnd(-0.4, 0.4); this.fx.add({ type: 'spark', x: p.sx, y: p.sy, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, size: 2, color: col, life: 0.15 }); } }
    if (h.tier >= 3) this.addLight(p.sx, p.sy, 22 + h.tier * 3, col, 0.1, 0.4);
  }
};
const _projHit11 = Game.prototype.projHit;
Game.prototype.projHit = function (p, e) {
  const r = _projHit11.call(this, p, e);
  if (!p.splash) {
    const col = TRAIL_COL[p.kind] || p.color || '#ffffff', a = Math.atan2(p.y - p.sy, p.x - p.sx);
    this.fx.add({ type: 'ring', x: e.x, y: e.ay, r1: 8 + (p.h ? p.h.tier : 0) * 1.5, color: col, life: 0.18, w: 2 });
    if (FXQ.rich) for (let k = 0; k < 3; k++) { const aa = a + Math.PI + rnd(-0.8, 0.8), s = rnd(60, 150); this.fx.add({ type: 'spark', x: e.x, y: e.ay, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, size: 1.8, color: col, life: 0.2 }); }
    this.addLight(e.x, e.ay, 16 + (p.h ? p.h.tier : 0) * 2, col, 0.12, 0.45);
  }
  return r;
};
const _explode11 = Game.prototype.explode;
Game.prototype.explode = function (p, x, y) {
  _explode11.call(this, p, x, y);
  const R = Math.max(0.5, p.splash) * TILE, col = TRAIL_COL[p.kind] || p.color || '#fde68a';
  this.addLight(x, y, R * 1.7, col, 0.3, 0.6);
  this.fx.add({ type: 'ring', x, y, r1: R * 1.25, color: '#ffffff', life: 0.22, w: 2 });
  if (FXQ.rich) for (let k = 0; k < 6; k++) { const a = rnd(0, TAU), s = rnd(90, 200); this.fx.add({ type: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, g: 420, drag: 0.5, size: rnd(2, 3.5), color: '#57534e', life: 0.6 }); }
  this.addScorch(x, y + 4, R * 0.7, col);
};
const _hitArea11 = Game.prototype.hitArea;
Game.prototype.hitArea = function (x, y, R, dmg, h, st, o = {}) {
  _hitArea11.call(this, x, y, R, dmg, h, st, o);
  this.addLight(x, y, R * 1.5, o.color || (h && h.look ? h.look.suit2 : '#ffffff'), 0.28, 0.5);
};
const _drawBeams11 = Game.prototype.drawBeams;
Game.prototype.drawBeams = function (ctx, h, t) {
  _drawBeams11.call(this, ctx, h, t);
  if (!h.beamTargets.length) return;
  const col = h.look.suit2; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sx = h.x + Math.cos(h.ang) * 12, sy = h.y - 12;
  const gm = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10 + h.tier * 2); gm.addColorStop(0, rgba('#ffffff', 0.8)); gm.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gm; circle(ctx, sx, sy, 10 + h.tier * 2); ctx.fill();
  for (const e of h.beamTargets) { if (e.dead) continue; const r = 12 + h.tier * 2 + Math.sin(t * 30 + e.id) * 3, g2 = ctx.createRadialGradient(e.x, e.ay, 0, e.x, e.ay, r); g2.addColorStop(0, rgba('#ffffff', 0.85)); g2.addColorStop(0.4, rgba(col, 0.6)); g2.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g2; circle(ctx, e.x, e.ay, r); ctx.fill(); if (FXQ.rich && Math.random() < 0.25) this.fx.add({ type: 'spark', x: e.x, y: e.ay, vx: rnd(-120, 120), vy: rnd(-120, 40), size: 1.8, color: col, life: 0.2 }); }
  ctx.restore();
};

/* ---------- abilities: signatuur per element ---------- */
function abilitySignature(g, h, el) {
  const col = ELEM_INFO[el] ? ELEM_INFO[el].color : h.look.suit2, ult = h.tier >= 5, R = Math.min(h.st.range < 90 ? h.st.range * TILE : 5 * TILE, 6 * TILE);
  // lichtzuil + schokgolf
  g.addExt({ dur: 0.7, draw(gg, ctx) {
    const k = this.t / 0.7, a = 1 - k; ctx.globalCompositeOperation = 'lighter';
    const w = (ult ? 34 : 24) * (1 - k * 0.5), gr = ctx.createLinearGradient(h.x - w, 0, h.x + w, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(col, 0.55 * a)); gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr; ctx.fillRect(h.x - w, h.y - 220, w * 2, 236);
    ctx.strokeStyle = rgba(col, 0.8 * a); ctx.lineWidth = 4 * a + 1; circle(ctx, h.x, h.y + 6, 20 + k * R); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.5 * a); ctx.lineWidth = 2; circle(ctx, h.x, h.y + 6, 10 + k * R * 0.75); ctx.stroke();
    if (ult) for (let i = 0; i < 10; i++) { const an = i * TAU / 10 + this.t * 2; ctx.strokeStyle = rgba(col, 0.35 * a); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x + Math.cos(an) * 24, h.y + Math.sin(an) * 12); ctx.lineTo(h.x + Math.cos(an) * (40 + k * R), h.y + Math.sin(an) * (20 + k * R * 0.5)); ctx.stroke(); }
  } });
  g.addLight(h.x, h.y - 10, ult ? 160 : 110, col, 0.5, 0.55);
  // element-specifiek
  const list = g.enemiesIn(h.x, h.y, R, true).slice(0, 10);
  switch (el) {
    case 'burn': for (let i = 0; i < (ult ? 26 : 16); i++) { const a = i * TAU / (ult ? 26 : 16); g.fx.add({ type: 'glow', x: h.x, y: h.y, vx: Math.cos(a) * R * 1.6, vy: Math.sin(a) * R * 0.9, drag: 1.6, size: 5, color: i % 2 ? '#fb923c' : '#fde047', life: 0.6 }); } break;
    case 'freeze': for (let i = 0; i < (ult ? 20 : 12); i++) { const a = rnd(0, TAU), s = rnd(R * 0.8, R * 1.6); g.fx.add({ type: 'snow', x: h.x, y: h.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, drag: 2, size: 4, color: '#e0f2fe', life: 0.8 }); } g.flash = { color: '#bae6fd', life: 0.18, max: 0.18 }; break;
    case 'shock': for (const e of list) g.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 20 }, { x: (h.x + e.x) / 2 + rnd(-20, 20), y: (h.y + e.ay) / 2 + rnd(-20, 20) }, { x: e.x, y: e.ay }], color: '#fde047', life: 0.25, max: 0.25, w: 3 }); break;
    case 'knock': g.fx.ring(h.x, h.y, R, '#e2e8f0', 0.45, 6); g.shake(5); break;
    case 'weaken': for (const e of list) { g.fx.add({ type: 'star', x: e.x, y: e.ay - e.r - 8, vy: -30, size: 2.5, color: '#c084fc', life: 0.7 }); } break;
    case 'slow': g.addExt({ dur: 0.9, under: true, draw(gg, ctx) { const k = this.t / 0.9; ctx.strokeStyle = rgba('#60a5fa', 0.6 * (1 - k)); ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.setLineDash([8, 8]); ctx.lineDashOffset = -this.t * 60 * (i + 1); circle(ctx, h.x, h.y, R * (0.4 + i * 0.3)); ctx.stroke(); } ctx.setLineDash([]); } }); break;
    case 'stun': for (const e of list) for (let i = 0; i < 3; i++) g.fx.add({ type: 'star', x: e.x + rnd(-8, 8), y: e.ay - e.r - 6, vx: rnd(-40, 40), vy: rnd(-60, -20), size: 2.5, color: '#fde047', life: 0.6 }); break;
    case 'empower': for (const o of g.heroes) { if ((o.x - h.x) ** 2 + (o.y - h.y) ** 2 > (2.6 * TILE) ** 2) continue; g.addLight(o.x, o.y - 10, 40, '#fbbf24', 0.6, 0.5); for (let i = 0; i < 5; i++) g.fx.add({ type: 'glow', x: o.x + rnd(-10, 10), y: o.y + 10, vy: rnd(-90, -50), drag: 0, size: 2.5, color: '#fde68a', life: 0.7 }); } break;
  }
}
const _useAbility11 = Game.prototype.useAbility;
Game.prototype.useAbility = function (h) {
  const ok = _useAbility11.call(this, h);
  if (ok) { const el = (typeof ABILITY_ELEM !== 'undefined' && ABILITY_ELEM[h.def.ability]) || 'empower'; abilitySignature(this, h, el); h.castGlow = 1; }
  return ok;
};

/* ---------- helden: aura per upgradeniveau, aanvalsanimatie, plaatsen, upgrade ---------- */
const _placeHero11 = Game.prototype.placeHero;
Game.prototype.placeHero = function (id, tx, ty) {
  const n0 = this.heroes.length, r = _placeHero11.apply(this, arguments);
  if (this.heroes.length > n0) { const h = this.heroes[this.heroes.length - 1]; h.spawnA = 0.32; }
  return r;
};
const _upgrade11 = Game.prototype.upgrade;
Game.prototype.upgrade = function (h) {
  const ok = _upgrade11.call(this, h);
  if (ok) {
    const col = RARITIES[h.def.rarity] ? RARITIES[h.def.rarity].color : h.look.suit2, major = h.def.upgrades[h.tier - 1] && h.def.upgrades[h.tier - 1].major;
    g_pillar(this, h.x, h.y, major ? '#ffd23f' : col, major ? 0.9 : 0.6, major ? 30 : 18);
    this.addLight(h.x, h.y - 10, major ? 120 : 70, major ? '#ffd23f' : col, 0.5, 0.6);
  }
  return ok;
};
function g_pillar(g, x, y, col, dur, w) {
  g.addExt({ dur, draw(gg, ctx) { const k = this.t / dur, a = Math.sin(k * Math.PI); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(col, 0.6 * a)); gr.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gr; ctx.fillRect(x - w, y - 260 * k - 40, w * 2, 260 * k + 56); } });
}
const _updHero11 = Game.prototype.updateHero;
Game.prototype.updateHero = function (h, dt) {
  if (h.spawnA > 0) { h.spawnA -= dt; if (h.spawnA <= 0) { this.fx.ring(h.x, h.y + 12, 26, '#e2e8f0', 0.35, 3); this.fx.burst(h.x, h.y + 12, '#a8a29e', 8, 90, 3, 0.4, 'smoke'); this.addLight(h.x, h.y, 50, h.look.suit2, 0.3, 0.5); } }
  if (h.castGlow > 0) h.castGlow = Math.max(0, h.castGlow - dt * 1.5);
  return _updHero11.call(this, h, dt);
};
const _drawHero11 = Game.prototype.drawHeroUnit;
Game.prototype.drawHeroUnit = function (ctx, h, t) {
  const tier = h.tier, col = RARITIES[h.def.rarity] ? RARITIES[h.def.rarity].color : h.look.suit2;
  if (!h.temp && tier >= 3) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + h.seed), r = 20 + tier * 2;
    const gr = ctx.createRadialGradient(h.x, h.y + 12, 0, h.x, h.y + 12, r); gr.addColorStop(0, rgba(col, 0.28 + 0.1 * pulse)); gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(h.x, h.y + 12, r, r * 0.45, 0, 0, TAU); ctx.fill();
    if (tier >= 5) {
      ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.ellipse(h.x, h.y + 12, r + 3, (r + 3) * 0.42, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) { const a = t * 1.8 + i * TAU / 3 + h.seed; ctx.fillStyle = rgba(col, 0.9); circle(ctx, h.x + Math.cos(a) * (r - 2), h.y + 2 + Math.sin(a) * (r - 2) * 0.42 - 8, 2.2); ctx.fill(); }
    }
    ctx.restore();
  }
  if (h.castGlow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(h.look.suit2, 0.35 * h.castGlow); circle(ctx, h.x, h.y - 6, 26 + 10 * (1 - h.castGlow)); ctx.fill(); ctx.restore(); }
  const sp = h.spawnA > 0 ? h.spawnA / 0.32 : 0, atk = h.atk || 0;
  if (sp > 0 || atk > 0) {
    ctx.save();
    const fy = h.y + 14, sx = 1 + atk * 0.07 + sp * 0.25, sy = 1 - atk * 0.05 + sp * 0.15;
    ctx.translate(h.x, fy - sp * sp * 60); ctx.scale(sx, sy); ctx.translate(-h.x, -fy);
    if (sp > 0) ctx.globalAlpha = 1 - sp * 0.5;
    _drawHero11.call(this, ctx, h, t); ctx.restore();
  } else _drawHero11.call(this, ctx, h, t);
};

/* ---------- vijanden: spawnen, geraakt worden, sterven, baasfases ---------- */
const _spawn11 = Game.prototype.spawnEnemy;
Game.prototype.spawnEnemy = function (type, d, w) {
  const e = _spawn11.call(this, type, d, w);
  if (e) { e.spawnA = e.boss ? 0.6 : 0.28; if (d <= 4 && FXQ.rich) { this.fx.add({ type: 'ring', x: e.x, y: e.y, r1: e.r * 2, color: e.E.color, life: 0.3, w: 2 }); } if (e.boss) { this.addLight(e.x, e.y, 140, e.E.color, 0.8, 0.6); this.fx.ring(e.x, e.y, 80, e.E.color, 0.7, 6); } }
  return e;
};
const _updEnemy11 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e, dt) {
  if (e.spawnA > 0) e.spawnA -= dt;
  if (e.hitJ > 0) e.hitJ = Math.max(0, e.hitJ - dt * 8);
  if (e.boss && (e.bph || 1) >= 3 && FXQ.rich && Math.random() < dt * 14) this.fx.add({ type: 'glow', x: e.x + rnd(-e.r, e.r), y: e.ay + rnd(-4, e.r * 0.5), vy: rnd(-70, -40), drag: 0, size: rnd(2, 4), color: Math.random() < 0.5 ? '#ef4444' : '#f97316', life: 0.6 });
  return _updEnemy11.call(this, e, dt);
};
const _damage11 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h, o = {}) {
  const r = _damage11.call(this, e, amt, h, o);
  if (r > 0 && !o.acc && !e.boss) e.hitJ = 1;
  return r;
};
const _drawEnemy11 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  const ph = e.boss ? (e.bph || ((e.phase || 0) + 1)) : 1;
  if (e.boss && ph >= 2) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const c = ph >= 3 ? '#ef4444' : '#f59e0b', p = 0.5 + 0.5 * Math.sin(t * (ph >= 3 ? 9 : 5)), oy = e.flying ? -16 : 0;
    const gr = ctx.createRadialGradient(e.x, e.y + oy, e.r * 0.5, e.x, e.y + oy, e.r * (1.9 + 0.3 * p)); gr.addColorStop(0, rgba(c, 0.35)); gr.addColorStop(1, rgba(c, 0)); ctx.fillStyle = gr; circle(ctx, e.x, e.y + oy, e.r * (1.9 + 0.3 * p)); ctx.fill(); ctx.restore();
  }
  const sp = e.spawnA > 0 ? e.spawnA / (e.boss ? 0.6 : 0.28) : 0, j = e.hitJ || 0;
  if (sp > 0 || j > 0) {
    ctx.save();
    const ox = j ? rnd(-1.6, 1.6) * j : 0, s = 1 - sp * 0.7;
    ctx.translate(e.x + ox, e.y); ctx.scale(s, s); ctx.translate(-e.x, -e.y);
    if (sp > 0) ctx.globalAlpha = 1 - sp * 0.6;
    _drawEnemy11.call(this, ctx, e, t); ctx.restore();
  } else _drawEnemy11.call(this, ctx, e, t);
};
const _kill11 = Game.prototype.kill;
Game.prototype.kill = function (e, h) {
  const was = e.dead; _kill11.call(this, e, h); if (was || !e.dead) return;
  const x = e.x, y = e.ay, r = e.r, col = e.E.color;
  if (!e.boss) {
    if (FXQ.q > 0.35 && (!this.ext || this.ext.length < 90)) this.addExt({ dur: 0.28, draw(g, ctx) { const k = this.t / 0.28; ctx.globalAlpha = 1 - k; ctx.fillStyle = col; circle(ctx, x, y, r * (1 + k * 0.9)); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#ffffff', 0.7 * (1 - k)); circle(ctx, x, y, r * (0.6 + k * 0.5)); ctx.fill(); } });
    this.addLight(x, y, r * 3, col, 0.2, 0.4);
  } else {
    this.addLight(x, y, 220, '#ffffff', 0.9, 0.7); this.addScorch(x, e.y + 6, r * 1.6, col);
    for (let i = 0; i < 6; i++) this.after(i * 0.12, () => { const xx = x + rnd(-r * 1.4, r * 1.4), yy = y + rnd(-r, r); this.fx.burst(xx, yy, i % 2 ? col : '#fde68a', 18, 220, 4, 0.6, 'glow'); this.fx.ring(xx, yy, r * 1.4, '#ffffff', 0.35, 4); this.addLight(xx, yy, 90, col, 0.3, 0.6); this.shake(4); Sfx.play('boom'); });
  }
};
const _bossBar11 = Game.prototype.drawBossBar;
Game.prototype.drawBossBar = function (ctx) {
  _bossBar11.call(this, ctx);
  if (this.mode === 'coop') return;
  const b = this.enemies.find(e => e.boss && !e.dead && !e.E.decoy); if (!b || b.E.worldBoss) return;
  const w = 420, x = GW / 2 - w / 2, y = 14, ph = b.bph || ((b.phase || 0) + 1);
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.85)'; for (const f of [0.66, 0.33]) ctx.fillRect(x + w * f - 1, y + 14, 2, 16);
  ctx.font = "700 11px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = ph >= 3 ? '#ef4444' : ph >= 2 ? '#f59e0b' : '#e2e8f0'; ctx.fillText(`FASE ${ph}`, GW / 2, y - 1); ctx.restore();
};

/* ---------- schadegetallen: samenvoegen per vijand zodat ze het veld niet bedekken ---------- */
const _dmgText11 = Game.prototype.dmgText;
Game.prototype.dmgText = function (e, amt, color, crit) {
  if (!Store.data.settings.dmgNums || amt < 0.5) return;
  const last = e.dtx;
  if (last && !crit && !last.crit && last.life > last.max - 0.25 && this.texts.includes(last)) {
    last.amt += amt; last.text = fmtDmg(last.amt); last.size = 13 + Math.min(7, Math.log10(last.amt + 1) * 2); last.color = color; return;
  }
  _dmgText11.call(this, e, amt, color, crit);
  const t = this.texts[this.texts.length - 1]; if (t) { t.amt = amt; t.crit = crit; e.dtx = t; }
  if (this.texts.length > 30 + 40 * FXQ.q) this.texts.shift();
};
