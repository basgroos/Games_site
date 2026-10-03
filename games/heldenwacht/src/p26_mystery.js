/* =====================================================================
   Mystery-helden uit de Limited Gacha (v1.24):
   - Levo de Jingeling: oneindig bereik, toverstaf en bril. Ability
     "Loeky Aanval" / ULTIMATE "Loeky Aura": honden rennen vanaf de basis
     over het pad naar het portaal en bijten alles wat ze passeren.
   - BoosGras: plasmaballen met een enorme explosie. Ability "Boze Grasjes"
     / ULTIMATE "Angry Gras": gras groeit op het pad, vertraagt en doet
     veel schade.
   Beide ongeveer zo sterk als een Exotic en alleen te krijgen in de
   Limited Gacha.
   ===================================================================== */
const MYSTERY_LIMITED = ['levo', 'boosgras'];
const MYSTERY_HEROES = [
  { id: 'levo', name: 'Levo de Jingeling', rarity: 'mystery', role: 'Groot bereik', exclusive: 'limited', cap: 1, title: 'Tovenaar met de beste hond van de stad', style: 'projectile', proj: 'star', cost: 1450,
    desc: 'Zijn toverstaf raakt elke vijand op de hele map: oneindig bereik. Met zijn ability stuurt hij zijn hond Loeky en vrienden over het pad; ze rennen door alle vijanden heen en bijten hard.',
    base: { dmg: 92, range: 99, rate: 1.1, air: true, projSpeed: 17, crit: 0.1 },
    look: { skin: '#f1c27d', suit: '#1d4ed8', suit2: '#fde047', cape: '#7c3aed', hair: 'spiky', hairC: '#7c2d12', emblem: 'star', weapon: 'staff', glasses: true }, fx: 'star', ability: 'loeky',
    upgrades: [U('Toverspreuk', 1500, '+45 schade', { dmg: 45 }), U('Snelle Staf', 2100, '+0,3 snelheid, 10% extra kritiek', { rate: 0.3, crit: 0.1 }), U('Dubbele Spreuk', 3500, '+1 doel tegelijk', { multi: 1 }, true), U('Brilglazen van Kracht', 4800, '+90 schade, kritiek ×2,5', { dmg: 90, critMult: 0.5 }), U('Grootmeester Jingeling', 8500, '+150 schade, +1 doel. ULTIMATE: Loeky Aura', { dmg: 150, multi: 1 }, true)] },
  { id: 'boosgras', name: 'BoosGras', rarity: 'mystery', role: 'Area damage', exclusive: 'limited', cap: 1, title: 'Loop niet over zijn gras', style: 'projectile', proj: 'plasma', cost: 1400,
    desc: 'Schiet plasmaballen die ontploffen in een mega-explosie. Met zijn ability laat hij boos gras op het pad groeien: alles wat erdoorheen loopt wordt vertraagd en krijgt veel schade.',
    base: { dmg: 78, splash: 2.2, range: 4.0, rate: 0.85, air: true, projSpeed: 10 },
    look: { skin: '#e0ac69', suit: '#166534', suit2: '#a3e635', cape: '#14532d', hair: 'spiky', hairC: '#3f6212', emblem: 'wind', weapon: 'blaster', mask: '#14532d' }, fx: 'leaf', ability: 'bozegrasjes',
    upgrades: [U('Heter Plasma', 1450, '+40 schade', { dmg: 40 }), U('Megaknal', 2000, 'Nog grotere explosies, +0,5 bereik', { splash: 0.5, range: 0.5 }), U('Dubbel Plasma', 3400, '+1 plasmabal tegelijk', { multi: 1 }, true), U('Woedend', 4700, '+0,3 snelheid, +80 schade', { rate: 0.3, dmg: 80 }), U('Koning van het Gras', 8200, '+140 schade, nog grotere explosies. ULTIMATE: Angry Gras', { dmg: 140, splash: 0.4 }, true)] },
];
MYSTERY_HEROES.forEach(h => { HEROES.push(h); HERO[h.id] = h; });
Object.assign(ABILITIES, {
  loeky: { name: 'Loeky Aanval', ult: 'Loeky Aura', cd: 20, desc: 'Stuurt 5 honden vanaf de basis over het pad: ze rennen door alle vijanden heen en bijten hard. ULTIMATE: 10 seconden lang blijven er honden komen, met de grote Loeky voorop.' },
  bozegrasjes: { name: 'Boze Grasjes', ult: 'Angry Gras', cd: 20, desc: 'Laat 8 seconden boos gras groeien op het pad rond hem: het schiet omhoog met een klap, houdt vijanden even vast, vertraagt en doet veel schade. ULTIMATE: het hele pad, 12 seconden, nog veel bozer.' },
});

/* ---------- Limited Gacha ---------- */
const _limitedSet26 = Meta.limitedSet;
Meta.limitedSet = function () { const r = _limitedSet26.apply(this, arguments); r.heroes = [...new Set(r.heroes.concat(MYSTERY_LIMITED))]; return r; };
const _heroSource26 = heroSource;
heroSource = function (h) { return h && h.exclusive === 'limited' ? 'Limited Gacha' : _heroSource26.apply(this, arguments); };

/* ---------- honden (Loeky) ---------- */
function loekyDog(g, h, o = {}) {
  const D = g.dogs || (g.dogs = []); if (D.length >= 40) return;
  const big = !!o.big, d = g.leakD - 4 - (o.off || 0);
  D.push({ d, x: 0, y: 0, ang: 0, speed: big ? 3.2 : 4.4, dmg: o.dmg, h, hit: new Set(), big, t: Math.random() * 3, fur: o.fur || ['#a16207', '#78350f', '#f5f5f4', '#1c1917'][D.length % 4] });
}
function loekyTick(g, dt) {
  const D = g.dogs; if (!D || !D.length) return;
  for (const dog of D) {
    dog.t += dt; dog.d -= dog.speed * TILE * dt;
    const p = g.posAt(dog.d); dog.x = p.x; dog.y = p.y; dog.ang = p.ang + Math.PI;
    const R = dog.big ? 26 : 16;
    for (const e of g.enemies) {
      if (e.dead || dog.hit.has(e.id)) continue;
      if ((e.x - dog.x) ** 2 + (e.y - dog.y) ** 2 > (R + e.r) ** 2) continue;
      dog.hit.add(e.id); const hh = g.heroes.includes(dog.h) ? dog.h : null;
      g.damage(e, dog.dmg, hh, { color: '#fde047' }); g.fx.burst(e.x, e.ay, '#fef3c7', 6, 110, 2, 0.3, 'spark');
      if (Math.random() < 0.3) g.floatText(e.x, e.ay - e.r - 10, 'WAF!', '#fde047', 13, 0.6);
    }
    if (dog.d < -15) dog.gone = true;
  }
  g.dogs = D.filter(x => !x.gone);
}
function drawDog(ctx, dog, t) {
  const s = dog.big ? 1.6 : 1, run = Math.sin(dog.t * 22);
  ctx.save(); ctx.translate(dog.x, dog.y); const face = Math.cos(dog.ang) < 0 ? -1 : 1; ctx.scale(face * s, s);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 9, 11, 3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6; ctx.fillStyle = dog.fur;
  for (const [lx, ph] of [[-6, 0], [-2, Math.PI], [4, Math.PI / 2], [8, -Math.PI / 2]]) { ctx.beginPath(); ctx.moveTo(lx, 2); ctx.lineTo(lx + Math.sin(dog.t * 22 + ph) * 3, 9); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-10, -2); ctx.quadraticCurveTo(-16, -8 - run * 2, -14, -12); ctx.stroke(); // staart
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(11, -5 + run * 0.6, 6, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); // kop
  ctx.fillStyle = shade(dog.fur, -0.35); ctx.beginPath(); ctx.ellipse(9, -9, 2.4, 4, -0.4, 0, TAU); ctx.fill(); // oor
  ctx.fillStyle = '#111827'; circle(ctx, 16.5, -5, 1.4); ctx.fill(); circle(ctx, 12, -6.5, 1); ctx.fill();
  ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.ellipse(15, -2, 1.6, 2.4 + Math.max(0, run), 0, 0, TAU); ctx.fill(); // tong
  if (dog.big) { ctx.fillStyle = '#ef4444'; ctx.fillRect(4, -3, 5, 2.4); ctx.fillStyle = '#fde047'; circle(ctx, 6.5, 0.5, 1.4); ctx.fill(); } // halsband
  ctx.restore();
}

/* ---------- boos gras ---------- */
function grassGrow(g, h, ult) {
  const st = h.st, R = st.range * TILE * 1.8, P = g.grass || (g.grass = []), life = ult ? 12 : 8;
  let n = 0;
  for (let d = 0; d <= g.leakD; d += ult ? 30 : 26) {
    const p = g.posAt(d); if (!ult && (p.x - h.x) ** 2 + (p.y - h.y) ** 2 > R * R) continue;
    if (P.length >= 110) break;
    P.push({ d, x: p.x, y: p.y, r: 26, life, max: life, dps: st.dmg * (ult ? 4.5 : 2.6), slow: ult ? 0.7 : 0.55, angry: ult || Math.random() < 0.3, h, seed: Math.random() * 10 }); n++;
  }
  // het gras schiet omhoog: meteen een klap en grondvijanden zitten even vast
  const hh = g.heroes.includes(h) ? h : null, hit = new Set();
  for (const gp of P.slice(-n)) for (const e of g.enemies) {
    if (e.dead || e.flying || hit.has(e.id) || (e.x - gp.x) ** 2 + (e.y - gp.y) ** 2 > (gp.r + e.r) ** 2) continue;
    hit.add(e.id); g.damage(e, st.dmg * (ult ? 8 : 4), hh, { color: '#84cc16' });
    if (!e.dead && !e.boss && !e.ccImm && !e.megaBoss) e.stunT = Math.max(e.stunT || 0, ult ? 1.5 : 0.8);
  }
  return n;
}
function grassTick(g, dt) {
  const P = g.grass; if (!P || !P.length) return;
  g.grassT = (g.grassT || 0) - dt; const hot = g.grassT <= 0; if (hot) g.grassT = 0.25;
  if (hot) {
    const done = new Set();
    for (const gp of P) for (const e of g.enemies) {
      if (e.dead || e.flying || done.has(e.id)) continue;
      if ((e.x - gp.x) ** 2 + (e.y - gp.y) ** 2 > (gp.r + e.r * 0.5) ** 2) continue;
      done.add(e.id); const hh = g.heroes.includes(gp.h) ? gp.h : null;
      g.damage(e, gp.dps * 0.25, hh, { acc: true, color: '#a3e635' });
      if (!e.dead && !e.ccImm && !e.megaBoss) { e.slowM = Math.max(e.slowM || 0, e.boss ? gp.slow * 0.5 : gp.slow); e.slowT = Math.max(e.slowT || 0, 0.4); }
    }
  }
  for (const gp of P) gp.life -= dt;
  g.grass = P.filter(x => x.life > 0);
}
function drawGrass(ctx, gp, t) {
  const f = gp.life / gp.max, grow = Math.min(1, (1 - f) * gp.max * 2.5), fade = Math.min(1, f * 4);
  ctx.save(); ctx.translate(gp.x, gp.y + 4); ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(63,98,18,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, gp.r, gp.r * 0.45, 0, 0, TAU); ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const bx = (i - 4) * gp.r * 0.22, h = (10 + ((i * 7 + gp.seed * 3) % 8)) * grow, sway = Math.sin(t * 4 + i + gp.seed) * 2.5;
    ctx.strokeStyle = i % 2 ? '#65a30d' : '#84cc16'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, 4); ctx.quadraticCurveTo(bx + sway * 0.5, 4 - h * 0.6, bx + sway, 4 - h); ctx.stroke();
  }
  if (gp.angry && grow > 0.6) { // boze oogjes en wenkbrauwen
    ctx.fillStyle = '#fff'; circle(ctx, -4, -6, 2.4); ctx.fill(); circle(ctx, 4, -6, 2.4); ctx.fill();
    ctx.fillStyle = '#111827'; circle(ctx, -3.5, -5.5, 1.2); ctx.fill(); circle(ctx, 4.5, -5.5, 1.2); ctx.fill();
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(-2, -8); ctx.moveTo(7, -10); ctx.lineTo(2, -8); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- abilities ---------- */
Object.assign(ABILITY_FX, {
  loeky(g, h, ult) {
    const st = h.st;
    if (ult) {
      loekyDog(g, h, { big: true, dmg: st.dmg * 15, fur: '#a16207' });
      h.loekyAura = 10; h.loekyT = 0.4;
      g.banner('LOEKY AURA', 'Loeky en zijn vrienden komen eraan!', '#fde047');
    } else {
      for (let i = 0; i < 5; i++) loekyDog(g, h, { dmg: st.dmg * 5, off: i * 22 });
      g.floatText(h.x, h.y - 36, 'Loeky, pak ze!', '#fde047', 17, 1.2);
    }
    g.fx.ring(h.x, h.y, 50, '#fde047', 0.5, 5); Sfx.play('ability');
  },
  bozegrasjes(g, h, ult) {
    const n = grassGrow(g, h, ult); if (!n) return noTarget(g, h);
    if (ult) { g.banner('ANGRY GRAS', 'Het hele pad wordt boos!', '#84cc16'); g.shake(6); } else g.floatText(h.x, h.y - 36, 'Boze Grasjes!', '#a3e635', 17, 1.2);
    g.fx.burst(h.x, h.y, '#a3e635', 24, 160, 3, 0.6, 'leaf');
  },
});

/* ---------- elke tick ---------- */
const _updExt26 = Game.prototype.updateExt;
Game.prototype.updateExt = function (dt) {
  _updExt26.call(this, dt);
  for (const h of this.heroes) if (h.loekyAura > 0) {
    h.loekyAura -= dt; h.loekyT -= dt;
    if (h.loekyT <= 0) { h.loekyT = 0.4; loekyDog(this, h, { dmg: h.st.dmg * 8 }); }
    if (Math.random() < dt * 12) this.fx.add({ type: 'star', x: h.x + rnd(-30, 30), y: h.y + rnd(-34, 10), vy: -30, size: 2.4, color: '#fde047', life: 0.6 });
  }
  loekyTick(this, dt); grassTick(this, dt);
};
const _drawExt26 = Game.prototype.drawExt;
Game.prototype.drawExt = function (ctx, t, under) {
  _drawExt26.call(this, ctx, t, under);
  const V = this.h5view;
  if (under) { for (const gp of (V ? V.g : this.grass) || []) drawGrass(ctx, gp, t); return; }
  for (const dog of (V ? V.d : this.dogs) || []) drawDog(ctx, dog, t);
  for (const h of this.heroes) if (h.loekyAura > 0) { ctx.save(); ctx.strokeStyle = rgba('#fde047', 0.35 + Math.sin(t * 8) * 0.15); ctx.lineWidth = 3; circle(ctx, h.x, h.y, 34 + Math.sin(t * 5) * 3); ctx.stroke(); ctx.restore(); }
};

/* ---------- co-op: honden en gras meesturen naar de gast ---------- */
if (typeof coopSnapshot === 'function') {
  const _snap26 = coopSnapshot;
  coopSnapshot = function (g) {
    const p = _snap26.apply(this, arguments);
    const d = (g.dogs || []).map(x => ({ x: Math.round(x.x), y: Math.round(x.y), ang: +x.ang.toFixed(2), big: x.big, fur: x.fur, t: 0 }));
    const gr = (g.grass || []).map(x => ({ x: Math.round(x.x), y: Math.round(x.y), r: x.r, life: +x.life.toFixed(2), max: x.max, angry: x.angry, seed: x.seed }));
    if (d.length || gr.length) p.X5 = { d, g: gr };
    return p;
  };
}
if (typeof coopGuestMsg === 'function') {
  const _gmsg26 = coopGuestMsg;
  coopGuestMsg = function (g, ev, p) {
    const r = _gmsg26.apply(this, arguments);
    if (ev === 'snap' && p) { const X = p.X5 || { d: [], g: [] }; for (const x of X.d) x.t = performance.now() / 1000 * (x.big ? 0.8 : 1); g.h5view = X; }
    return r;
  };
}
