/* =====================================================================
   v1.29
   - Godly-helden uit de Basic Gacha naar de Kosmische Gacha (0,01% per held).
   - Tweede Godly: De Eindrechter — één doel tegelijk, enorme schade per seconde.
   - Nieuwe rarity PRISMATIC (boven Godly): Aurora Prismatica, alleen in de
     Basic (common) Gacha met 0,002% kans. Mega sterk en vertraagt alles zwaar.
   - Nieuwe Exotic: Stormram — weinig schade, maar duwt vijanden ver terug.
   - Endless: hooguit 100.000 munten per potje (verder spelen kan, meer munten niet).
   ===================================================================== */

/* ---------- rarity Prismatic ---------- */
if (!RARITY_ORDER.includes('prismatic')) RARITY_ORDER.push('prismatic');
RARITIES.prismatic = { label: 'Prismatic', color: '#e879f9', dupe: 150000, lvl: 12000, cap: 1 };
if (typeof COLL_WEIGHT === 'object') COLL_WEIGHT.prismatic = 1000;

/* ---------- helden ---------- */
const PRISM_HEROES = [
  { id: 'eindrechter', name: 'De Eindrechter', rarity: 'godly', role: 'Baasdoder', cap: 1, title: 'Eén schot, één vonnis', style: 'projectile', proj: 'snipe', cost: 3000,
    desc: 'Richt al zijn kracht op één vijand tegelijk: gigantische schade per seconde, kritieke treffers en extra schade tegen bazen. Ability *Vonnis*: één verwoestend schot op de sterkste vijand.',
    base: { dmg: 2600, range: 7, rate: 1.8, multi: 1, splash: 0, air: true, projSpeed: 28, crit: 0.3, critMult: 3, bossPct: 0.5, shred: 12 },
    look: { skin: '#e5e7eb', suit: '#0f172a', suit2: '#f43f5e', cape: '#7f1d1d', hair: 'visor', hairC: '#111827', emblem: 'eye', weapon: 'rifle', halo: true, big: true }, fx: 'shadow', ability: 'vonnis',
    upgrades: [U('Doelzoeker', 5000, '+1200 schade', { dmg: 1200 }, false, true), U('Vaste Hand', 8000, '+0,5 snelheid, +10% kritiek', { rate: 0.5, crit: 0.1 }), U('Hemelse Loop', 12000, '+2 bereik, kritiek ×4', { range: 2, critMult: 1 }, true, true), U('Laatste Woord', 18000, '+2500 schade, +50% tegen bazen', { dmg: 2500, bossPct: 0.5 }), U('De Eindtijd', 30000, '+4000 schade, +0,6 snelheid. ULTIMATE', { dmg: 4000, rate: 0.6 }, true, true)] },
  { id: 'aurora', name: 'Aurora Prismatica', rarity: 'prismatic', role: 'Controle', h4: 'prism', cap: 1, title: 'Breekt het licht, en de tijd', style: 'prism', proj: 'crystal', cost: 4000,
    desc: 'De enige Prismatic held: mega sterk. Haar prisma-schoten splitsen op 4 vijanden met grote explosies, en alles in haar regenbooggloed loopt zwaar vertraagd. Ability *Regenboogstilte*: de hele map bijna stil. Alleen in de Basic Gacha, met 0,002% kans.',
    base: { dmg: 1100, splash: 1.6, range: 6, rate: 1.5, multi: 4, air: true, projSpeed: 15, slow: 0.8, slowDur: 3, crit: 0.2, critMult: 2.5 },
    look: { skin: '#fdf4ff', suit: '#581c87', suit2: '#f0abfc', cape: '#22d3ee', hair: 'long', hairC: '#fbcfe8', emblem: 'diamond', weapon: 'orb', orb: '#f0abfc', halo: true, wings: true, big: true }, fx: 'prism', ability: 'regenboogstilte',
    upgrades: [U('Lichtbreking', 8000, '+600 schade', { dmg: 600 }, false, true), U('Spectrum', 12000, '+1 doel, groter gloed-bereik', { multi: 1, range: 1 }), U('Kristalstorm', 18000, 'Grotere explosies, +0,4 snelheid', { splash: 0.6, rate: 0.4 }, true, true), U('Tijdsprisma', 26000, '+1500 schade, langere vertraging', { dmg: 1500, slowDur: 2 }), U('Het Volle Spectrum', 45000, '+2500 schade, +2 doelen. ULTIMATE', { dmg: 2500, multi: 2 }, true, true)] },
  { id: 'stormram', name: 'Stormram', rarity: 'exotic', role: 'Controle', title: 'Niemand komt er langs', style: 'projectile', proj: 'ball', cost: 1350,
    desc: 'Doet maar weinig schade, maar zijn windballen duwen vijanden ver terug over het pad. Bazen schuiven minder ver, onstuitbare vijanden helemaal niet.',
    base: { dmg: 22, splash: 1.0, range: 3.6, rate: 1.1, multi: 2, knock: 1.4, air: true, projSpeed: 13 },
    look: { skin: '#e0f2fe', suit: '#334155', suit2: '#67e8f9', cape: '#0ea5e9', hair: 'helmet', hairC: '#94a3b8', emblem: 'wind', weapon: 'shield' }, fx: 'wind', ability: 'orkaanstoot',
    upgrades: [U('Rukwind', 1400, '+0,4 terugduw', { knock: 0.4 }), U('Dubbele Bal', 2000, '+1 bal, grotere explosie', { multi: 1, splash: 0.3 }, true), U('Windhoos', 3300, '+0,4 snelheid, +0,4 bereik', { rate: 0.4, range: 0.4 }), U('Stormfront', 4600, '+0,6 terugduw, +15 schade', { knock: 0.6, dmg: 15 }), U('Orkaankoning', 8000, '+1 bal, +0,8 terugduw. ULTIMATE', { multi: 1, knock: 0.8 }, true)] },
];
PRISM_HEROES.forEach(h => { HEROES.push(h); HERO[h.id] = h; });
Object.assign(ABILITIES, {
  vonnis: { name: 'Vonnis', ult: 'Laatste Oordeel', cd: 16, desc: 'Eén verwoestend schot (40×) op de sterkste vijand in bereik. ULTIMATE: 100× op de 3 sterkste.' },
  regenboogstilte: { name: 'Regenboogstilte', ult: 'Stilstaand Spectrum', cd: 22, desc: 'Alle vijanden op de map 6 seconden 90% vertraagd en zware schade. ULTIMATE: 10 seconden, nog meer schade.' },
  orkaanstoot: { name: 'Orkaanstoot', ult: 'Grote Orkaan', cd: 18, desc: 'Duwt alle vijanden in bereik 4 vakjes terug en verdooft ze kort (ULTIMATE: 7 vakjes).' },
});
Object.assign(ABILITY_FX, {
  vonnis(g, h, ult) {
    const ts = g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.2, true).filter(e => !e.dead).sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield)).slice(0, ult ? 3 : 1);
    if (!ts.length) return noTarget(g, h);
    for (const t of ts) { g.damage(t, h.st.dmg * (ult ? 100 : 40), h, { crit: true, critMult: 1, color: '#f43f5e' }); g.effects.push({ type: 'laser', x: t.x, y: t.y, life: 0.35, max: 0.35, w: 1.2 }); g.fx.burst(t.x, t.ay, '#fecdd3', 24, 220, 3, 0.5, 'spark'); }
    g.shake(ult ? 12 : 7); Sfx.play('laser');
  },
  regenboogstilte(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead); if (!list.length) return noTarget(g, h);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 12 : 5), h, { color: '#f0abfc' }); if (!e.dead && !e.ccImm && !e.megaBoss) { e.slowM = Math.max(e.slowM || 0, e.boss ? 0.6 : 0.9); e.slowT = Math.max(e.slowT || 0, ult ? 10 : 6); } }
    g.flash = { color: '#f0abfc', life: 0.45, max: 0.45 }; g.banner(ult ? 'STILSTAAND SPECTRUM' : 'REGENBOOGSTILTE', 'Alles op de map loopt bijna stil', '#e879f9');
  },
  orkaanstoot(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.3, true); if (!list.length) return noTarget(g, h);
    for (const e of list) { g.damage(e, h.st.dmg * 3, h, { color: '#67e8f9', noKnock: true }); if (e.dead || e.ccImm || e.megaBoss || e.E.worldBoss) continue; e.d = Math.max(-20, e.d - (ult ? 7 : 4) * TILE * (e.boss ? 0.2 : 1)); e.stunT = Math.max(e.stunT, e.boss ? 0.2 : 0.6); }
    g.fx.ring(h.x, h.y, h.st.range * TILE * 1.3, '#67e8f9', 0.6, 7); Sfx.play('boom');
  },
});
// Aurora: regenbooggloed die alles in haar bereik constant zwaar vertraagt
H4_TICK.prism = function (g, h, dt, attacked) {
  if (attacked) { const ts = g.findTargets(h, h.st.range * TILE, Math.max(1, h.st.multi)); ts.forEach((t, i) => g.fireProjectile(h, t, h.st, i, { kind: 'crystal', speed: 15 })); if (ts.length) Sfx.play('shoot'); }
  h.prismT = (h.prismT || 0) - dt; if (h.prismT > 0) return; h.prismT = 0.25;
  for (const e of g.enemiesIn(h.x, h.y, h.st.range * TILE, true)) { if (e.ccImm || e.megaBoss || e.E.worldBoss) continue; e.slowM = Math.max(e.slowM || 0, e.boss ? 0.5 : 0.7); e.slowT = Math.max(e.slowT || 0, 0.4); }
};
Object.assign(STYLE_LABEL, { prism: 'Prisma' });
const _drawHeroUnit30 = Game.prototype.drawHeroUnit;
Game.prototype.drawHeroUnit = function (ctx, h, t) {
  if (h.def && h.def.id === 'aurora') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const R = h.st.range * TILE; for (let i = 0; i < 6; i++) { ctx.strokeStyle = `hsla(${(t * 80 + i * 60) % 360},100%,70%,.10)`; ctx.lineWidth = 6; circle(ctx, h.x, h.y, R * (0.55 + i * 0.08) + Math.sin(t * 2 + i) * 4); ctx.stroke(); } ctx.restore(); }
  return _drawHeroUnit30.call(this, ctx, h, t);
};

/* ---------- gacha's: Godly naar Kosmisch, Prismatic in Basic ---------- */
const basic30 = GACHAS.find(g => g.id === 'basic'), cosmic30 = GACHAS.find(g => g.id === 'cosmic');
if (basic30) {
  const r = Object.assign({}, basic30.rates); delete r.godly;
  r.common = +(58 - 0.002).toFixed(3); r.prismatic = 0.002; basic30.rates = r;
  basic30.desc = 'Normale helden om je team mee te starten, en een piepkleine kans (0,002%) op de enige Prismatic held: Aurora Prismatica.';
}
if (cosmic30) {
  const r = Object.assign({}, cosmic30.rates), godlyN = HEROES.filter(h => h.rarity === 'godly' && !h.exclusive).length;
  r.godly = +(0.01 * godlyN).toFixed(3); r.legendary = +(r.legendary - r.godly).toFixed(3); cosmic30.rates = r;
  cosmic30.desc = 'De beste kans op Exotic en Ultra helden, een kleine kans op Secret, en 0,01% per Godly held (De Koning der Elementen en De Eindrechter).';
}
HERO.elementkoning.desc = HERO.elementkoning.desc.replace('Alleen in de Basic Gacha, met 0,01% kans.', 'Alleen in de Kosmische Gacha, met 0,01% kans.');

/* ---------- Endless: max. 100.000 munten per potje ---------- */
const ENDLESS_MAX_COINS = 100000;
const _finish30 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const c0 = Store.data.coins, R = _finish30.apply(this, arguments);
  if (g && g.mode === 'endless' && !g._coinCap30) {
    g._coinCap30 = true; const got = Store.data.coins - c0;
    if (got > ENDLESS_MAX_COINS) {
      const cut = got - ENDLESS_MAX_COINS; Store.data.coins -= cut; if (Store.data.stats) Store.data.stats.earned = Math.max(0, (Store.data.stats.earned || 0) - cut);
      R.coins = Math.max(0, (R.coins || 0) - cut); R.rows.push([`Endless-maximum (${fmt(ENDLESS_MAX_COINS)} munten per potje)`, -cut]); Store.save();
    }
  }
  return R;
};
