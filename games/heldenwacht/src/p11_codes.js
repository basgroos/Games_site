/* =====================================================================
   UITBREIDING 4 — Mystery-rarity, Janne de Lijmer en nieuwe codes
   ===================================================================== */
// Mystery: ongeveer even sterk als Legendary, alleen via codes te krijgen
RARITY_ORDER.splice(RARITY_ORDER.indexOf('legendary') + 1, 0, 'mystery');
RARITIES.mystery = { label: 'Mystery', color: '#a78bfa', dupe: 500, lvl: 560, cap: 2 };
COLL_WEIGHT.mystery = 30;
STAT_DEFAULTS.puddle = 0; STAT_DEFAULTS.puddleDur = 0; STAT_DEFAULTS.puddleSlow = 0; STAT_DEFAULTS.puddleDps = 0;

const JANNE = { id: 'janne', name: 'Janne de Lijmer', rarity: 'mystery', role: 'Controle', title: 'Niemand ontsnapt aan de lijm', style: 'projectile', cost: 800, exclusive: true, codeOnly: true,
  desc: 'Schiet witte lijmklodders die ontploffen en 5 seconden als plas op het pad blijven liggen. Vijanden die erdoor lopen raken vastgeplakt: de lijm blijft aan ze zitten en vertraagt ze nog even. Niet te krijgen in gacha\'s.',
  base: { dmg: 70, splash: 0.9, range: 3.8, rate: 1.0, slow: 0.3, slowDur: 1.5, air: true, projSpeed: 11, puddle: 1, puddleDur: 5, puddleSlow: 0.4, puddleDps: 0.35 },
  look: { skin: '#f1c27d', suit: '#f8fafc', suit2: '#8b5cf6', cape: null, hair: 'cap', hairC: '#6d28d9', emblem: 'ring', weapon: 'blaster', goggles: true },
  fx: 'glue', proj: 'glue', ability: 'lijmstorm',
  upgrades: [
    U('Dikkere Lijm', 700, '+45 schade', { dmg: 45 }),
    U('Grote Plassen', 1000, 'Grotere klodders en plassen, +0.4 bereik', { splash: 0.3, range: 0.4 }),
    U('Superlijm', 1800, 'Plassen vertragen 15% meer en blijven 2 seconden langer', { puddleSlow: 0.15, puddleDur: 2 }, true),
    U('Lijmfabriek', 2300, '+0.35 snelheid, plassen doen meer schade', { rate: 0.35, puddleDps: 0.2 }),
    U('Lijmkoning(in)', 4200, '2 klodders tegelijk, +120 schade. ULTIMATE', { multi: 1, dmg: 120 }, true),
  ] };
HEROES.push(JANNE); HERO[JANNE.id] = JANNE;

/* ---------- lijmplassen ---------- */
const MAX_PUDDLES = 18;
Game.prototype.spawnPuddle = function (h, st, x, y, scale = 1) {
  const list = (this.ext || []).filter(o => o.puddle);
  if (list.length >= MAX_PUDDLES) { const old = list[0]; old.t = Math.max(old.t, old.dur - 0.3); }
  const R = Math.max(0.55, st.splash * 0.9) * TILE * scale, dur = st.puddleDur || 5;
  const blobs = Array.from({ length: 6 }, () => ({ a: rnd(0, TAU), d: rnd(0.2, 0.75), r: rnd(0.3, 0.55) }));
  this.addExt({ puddle: true, under: true, dur, x, y, R, h, tick: 0,
    update(g, dt) {
      this.tick -= dt; const pulse = this.tick <= 0; if (pulse) this.tick = 0.25;
      const slow = st.puddleSlow || 0.4;
      for (const e of g.enemies) {
        if (e.dead || e.flying || (e.x - this.x) ** 2 + (e.y - this.y) ** 2 > this.R * this.R) continue;
        const s = Math.min(0.75, slow * (e.boss ? 0.5 : 1));
        e.glueT = 2; e.glueM = Math.max(e.glueM || 0, s);
        if (e.slowT <= 0 || s >= e.slowM) e.slowM = s; e.slowT = Math.max(e.slowT, 0.3);
        if (pulse && st.puddleDps > 0) g.damage(e, st.dmg * st.puddleDps * 0.25, this.h, { acc: true, color: '#f8fafc', noProc: true });
      }
    },
    draw(g, ctx, t) {
      const k = this.t / this.dur, grow = Math.min(1, this.t * 6), fade = k > 0.8 ? (1 - k) / 0.2 : 1, R = this.R * grow;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = 'rgba(241,245,249,.82)'; ctx.strokeStyle = 'rgba(148,163,184,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 4, R, R * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (const b of blobs) { ctx.beginPath(); ctx.ellipse(this.x + Math.cos(b.a) * R * b.d, this.y + 4 + Math.sin(b.a) * R * b.d * 0.62, R * b.r, R * b.r * 0.6, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.ellipse(this.x - R * 0.3, this.y - R * 0.05, R * 0.22, R * 0.1, -0.3, 0, TAU); ctx.fill();
      // bubbeltjes die knappen
      const ph = (t * 0.8 + this.x * 0.01) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - ph)})`; ctx.lineWidth = 1; circle(ctx, this.x + R * 0.35, this.y + 2, 2 + ph * 4); ctx.stroke();
      ctx.globalAlpha = 1;
    } });
  this.fx.burst(x, y, '#f8fafc', 10, 120, 3, 0.45, 'dot');
};
const _explode4 = Game.prototype.explode;
Game.prototype.explode = function (p, x, y) {
  if (p.kind === 'glue') {
    const R = Math.max(0.5, p.splash) * TILE, list = this.enemiesIn(x, y, R, p.air);
    for (const e of list) { const crit = Math.random() < p.st.crit; this.damage(e, p.dmg, p.h, { crit, critMult: p.st.critMult, color: '#f8fafc' }); this.applyStatus(e, p.st); }
    this.fx.ring(x, y, R, '#f8fafc', 0.3, 3); Sfx.play('punch');
    if (p.st.puddle > 0) { const pos = this.nearPath ? this.nearPath(x, y) : { x, y }; this.spawnPuddle(p.h, p.st, pos.x, pos.y, p.big ? 1.5 : 1); }
    return;
  }
  return _explode4.call(this, p, x, y);
};
// Een plas ligt altijd op het pad: zoek het dichtstbijzijnde punt
Game.prototype.nearPath = function (x, y) {
  let best = null, bd = Infinity;
  for (const e of this.enemies) { if (e.dead || e.flying) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best && bd < (TILE * 1.5) ** 2 ? { x: best.x, y: best.y } : { x, y };
};
// Vastgeplakt: de lijm blijft aan vijanden zitten en vertraagt ze nog even
const _updEnemy4 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e, dt) {
  if (e.glueT > 0) { e.glueT -= dt; if (e.slowT <= 0 || e.glueM >= e.slowM) e.slowM = e.glueM; e.slowT = Math.max(e.slowT, 0.05); if (e.glueT <= 0) e.glueM = 0; }
  return _updEnemy4.call(this, e, dt);
};

/* ---------- ability: Lijmstorm ---------- */
ABILITIES.lijmstorm = { name: 'Lijmstorm', ult: 'Megalijm', cd: 22, desc: 'Laat 6 lijmklodders op vijanden in bereik regenen. De plassen blijven langer liggen en vertragen extra sterk.' };
Object.assign(ABILITY_FX, {
  lijmstorm(g, h, ult) {
    const R = h.st.range * TILE * (ult ? 1.8 : 1.3);
    const list = g.enemiesIn(h.x, h.y, R, false).filter(e => !(e.invis && !e.revealed)); if (!list.length) return noTarget(g, h);
    const n = ult ? 10 : 6, st = Object.assign({}, h.st, { puddleDur: (h.st.puddleDur || 5) + (ult ? 4 : 2), puddleSlow: Math.min(0.7, (h.st.puddleSlow || 0.4) + (ult ? 0.25 : 0.15)) });
    for (let i = 0; i < n; i++) g.after(i * 0.07, () => {
      const e = list[i % list.length]; const x = e.dead ? e.x : e.x + rnd(-10, 10), y = e.dead ? e.y : e.y + rnd(-6, 6);
      dropFx(g, x, y, 'glue', 0.35, gg => { gg.hitArea(x, y, 1.1 * TILE, h.st.dmg * (ult ? 2.5 : 1.6), h, h.st, { air: false, color: '#f8fafc' }); gg.spawnPuddle(h, st, x, y, ult ? 1.6 : 1.3); Sfx.play('punch'); });
    });
    for (const e of list) { e.glueT = ult ? 5 : 3.5; e.glueM = Math.min(0.75, st.puddleSlow * (e.boss ? 0.5 : 1)); }
    g.floatText(h.x, h.y - 44, ult ? 'MEGALIJM!' : 'LIJMSTORM!', '#f8fafc', 18, 1); g.fx.ring(h.x, h.y, R, '#f8fafc', 0.5, 4); Sfx.play('shoot');
  },
});
const _dropFx4 = dropFx;
dropFx = function (g, x, y, kind, dur, onLand) {
  if (kind !== 'glue') return _dropFx4(g, x, y, kind, dur, onLand);
  return g.addExt({ dur, draw(gg, ctx) {
    const k = clamp(this.t / dur, 0, 1), yy = lerp(y - 200, y, k * k), xx = lerp(x - 30, x, k);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 14 * k + 4, 8 * k + 2, 0, 0, TAU); ctx.fill();
    ctx.translate(xx, yy); ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }, end: onLand });
};

/* ---------- tekenen ---------- */
const _drawProj4 = Game.prototype.drawProj;
Game.prototype.drawProj = function (ctx, p, t) {
  if (p.kind !== 'glue') return _drawProj4.call(this, ctx, p, t);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang || 0);
  const w = Math.sin(p.rot * 0.6) * 1.2, r = p.big ? 8 : 6;
  ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, r + w, r - w * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r - 2, 0, r * 0.45, r * 0.3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(ctx, r * 0.3, -r * 0.35, r * 0.28); ctx.fill();
  ctx.restore();
  if (Math.random() < 0.35 && this.fx) this.fx.add({ type: 'dot', x: p.x, y: p.y, vy: 30, size: 2, color: '#e2e8f0', life: 0.35 });
};
const _drawEnemy4 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  _drawEnemy4.call(this, ctx, e, t);
  if (e.glueT > 0 && !e.dead) {
    const oy = e.flying ? -16 : 0, a = Math.min(1, e.glueT); ctx.save(); ctx.translate(e.x, e.y + oy); ctx.globalAlpha = 0.9 * a;
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const an = e.id * 1.7 + i * 1.6, rr2 = e.r * 0.65; ctx.beginPath(); ctx.ellipse(Math.cos(an) * rr2, Math.sin(an) * rr2, e.r * 0.32, e.r * 0.24, an, 0, TAU); ctx.fill(); ctx.stroke(); }
    // druppel onderaan
    const dr = (t * 1.5 + e.id * 0.3) % 1; ctx.beginPath(); ctx.ellipse(e.r * 0.2, e.r * 0.6 + dr * 8, 2, 3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
};
const _idleFx4 = idleFx;
idleFx = function (fx, type, x, y, color) {
  if (type === 'glue') { fx.add({ type: 'dot', x: x + rnd(6, 14), y: y - 8, vx: rnd(-6, 6), vy: 28, size: 2.4, color: '#f8fafc', life: 0.6, drag: 0 }); return; }
  return _idleFx4(fx, type, x, y, color);
};

/* ---------- codes ---------- */
// Nieuwe codes voeg je hier toe. Sleutels in kleine letters; hoofdletters maken bij het invullen niet uit.
Object.assign(CODES, {
  'levodejing': { once: true, give: () => ({ coins: 5000, tokens: 20 }) },
  'boosgras': { once: true, give: () => { const L = HEROES.filter(h => h.rarity === 'legendary' && !h.exclusive && !h.hidden); return { hero: L[Math.floor(Math.random() * L.length)].id }; } },
  'jannexander': { once: true, give: () => ({ hero: 'janne' }) },
});
const _redeem4 = redeemCode;
redeemCode = function (code) {
  const key = String(code || '').trim().toLowerCase(), def = CODES[key];
  if (!def || typeof def !== 'object') return _redeem4(String(code || '').trim());
  const D = Store.data; D.codesUsed = D.codesUsed || [];
  if (def.once && D.codesUsed.includes(key)) { Sfx.play('error'); $('#code-err').textContent = 'Deze code heb je al gebruikt.'; $('#code-in').select(); return; }
  const r = def.give(), had = r.hero && D.heroes[r.hero];
  Meta.grant(r); if (def.once) D.codesUsed.push(key);
  Meta.ensureAll(); Meta.checkAchievements(); Store.save(); closeOverlay();
  const parts = [];
  if (r.coins) parts.push(`${fmt(r.coins)} munten`);
  if (r.tokens) parts.push(`${r.tokens} Trait Tokens`);
  if (r.hero) { const H = HERO[r.hero]; parts.push(`${had ? 'een extra kopie van ' : ''}${H.name} (${RARITIES[H.rarity].label})`); }
  Sfx.play(r.hero ? 'r-legendary' : 'coin'); toast(`Code geaccepteerd! Je krijgt ${parts.join(' en ')}.`, 'good');
  if (r.hero && !had) setTimeout(() => { try { openHeroModal(r.hero); } catch (e) {} }, 350);
  if (typeof updateTopbar === 'function') updateTopbar();
  if (App.screen) nav(App.screen);
};
// 8022 geeft alle helden behalve helden die alleen met een eigen code te krijgen zijn
const _redeem4b = redeemCode;
redeemCode = function (code) {
  if (String(code || '').trim() === '8022') {
    let n = 0; for (const h of HEROES) if (!h.codeOnly && !Store.data.heroes[h.id]) { Store.data.heroes[h.id] = { level: 1, copies: 1 }; n++; }
    const tot = HEROES.filter(h => !h.codeOnly).length;
    Meta.ensureAll(); Meta.checkAchievements(); Store.save(); closeOverlay();
    if (n) { Sfx.play('r-ultra'); toast(`Code geaccepteerd! ${n} nieuwe helden vrijgespeeld. Je hebt nu alle ${tot} gacha-helden.`, 'good'); }
    else { Sfx.play('coin'); toast(`Je hebt al alle ${tot} gacha-helden.`, 'good'); }
    nav(App.screen === 'home' ? 'collection' : App.screen); return;
  }
  return _redeem4b(code);
};
