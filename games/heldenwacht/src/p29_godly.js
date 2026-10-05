/* =====================================================================
   v1.28
   - Legendary-, Epic- en Mythic Gacha weg. Hun tickets worden omgezet in
     tickets van ongeveer dezelfde waarde (ook tickets die je al had):
     Epic → 2 Rare, Legendary → 3 Rare, Mythic → 1 Kosmisch.
   - Nieuwe rarity GODLY (boven Secret). Eén held: De Koning der Elementen,
     alleen in de Basic (common) Gacha, kans 0,01%.
   - Vier element-helden in Ultra: vuur, ijs, gif en bliksem.
   - Gif: nieuwe status (schade per seconde + pantser weg).
   - 100× openen voor alle gacha's (kost 90× de prijs, elke 10 trekkingen
     de gewone garantie), met een overzicht in plaats van 100 kaarten.
   ===================================================================== */

/* ---------- gacha's weg + tickets omzetten ---------- */
const REMOVED_GACHAS = ['legendary', 'epic', 'mythic'];
for (const id of REMOVED_GACHAS) { const i = GACHAS.findIndex(g => g.id === id); if (i >= 0) GACHAS.splice(i, 1); }
const TICKET_REMAP = { epic: ['rare', 2], legendary: ['rare', 3], mythic: ['cosmic', 1] };
function remapTickets(t) { const o = {}; for (const k in t) { const m = TICKET_REMAP[k]; if (m) o[m[0]] = (o[m[0]] || 0) + t[k] * m[1]; else o[k] = (o[k] || 0) + t[k]; } return o; }
function remapReward(r) { return r && r.tickets && Object.keys(r.tickets).some(k => TICKET_REMAP[k]) ? Object.assign({}, r, { tickets: remapTickets(r.tickets) }) : r; }
const _grant29 = Meta.grant, _rewardText29 = Meta.rewardText;
Meta.grant = function (r, o) { return _grant29.call(this, remapReward(r), o); };
Meta.rewardText = function (r) { return _rewardText29.call(this, remapReward(r)); };
function convertOwnedTickets() {
  const D = Store.data; if (!D || !D.tickets) return;
  let changed = false; for (const k in TICKET_REMAP) if (D.tickets[k]) { const [to, m] = TICKET_REMAP[k]; D.tickets[to] = (D.tickets[to] || 0) + D.tickets[k] * m; delete D.tickets[k]; changed = true; }
  if (changed) Store.save();
}
convertOwnedTickets();
setInterval(convertOwnedTickets, 5000); // vangnet: ook als iets anders ze later nog toevoegt
for (const k in TICKET_REMAP) TICKETS[k].hidden = true;
// winkel: losse tickets van verdwenen gacha's weg, bundels/aanbiedingen omgezet
if (SHOP_FIXED.tickets) SHOP_FIXED.tickets = SHOP_FIXED.tickets.filter(x => !(x.reward && x.reward.tickets && Object.keys(x.reward.tickets).some(k => TICKET_REMAP[k])));
const fixShopItem = it => { if (!it || !it.reward || !it.reward.tickets || !Object.keys(it.reward.tickets).some(k => TICKET_REMAP[k])) return it; const reward = remapReward(it.reward); return Object.assign({}, it, { reward, text: _rewardText29.call(Meta, reward).join(' + ') }); };
for (const it of RAID_SHOP) Object.assign(it, fixShopItem(it));
for (const fn of ['rotation', 'deals']) { const o = Shop[fn]; Shop[fn] = function () { return o.apply(this, arguments).map(fixShopItem); }; }
// overige vaste teksten (bv. eventwinkel) in beeld omzetten
const TICKET_TXT = { Epic: [2, 'Rare'], Legendary: [3, 'Rare'], Mythic: [1, 'Kosmisch'] };
function fixTicketText(s) {
  return s.replace(/(\d+)?\s*(?:×\s*)?(Epic|Legendary|Mythic) Tickets?\b/g, (m, n, k) => { const [mult, to] = TICKET_TXT[k], c = (n ? +n : 1) * mult; return `${c} ${to} Ticket${c > 1 ? 's' : ''}`; });
}
if (typeof MutationObserver !== 'undefined' && document.body) {
  const fixNode = n => { if (n.nodeType === 3) { if (/(Epic|Legendary|Mythic) Ticket/.test(n.nodeValue)) n.nodeValue = fixTicketText(n.nodeValue); return; } if (n.nodeType === 1 && /(Epic|Legendary|Mythic) Ticket/.test(n.textContent)) { const w = document.createTreeWalker(n, 4); let t; while ((t = w.nextNode())) if (/(Epic|Legendary|Mythic) Ticket/.test(t.nodeValue)) t.nodeValue = fixTicketText(t.nodeValue); } };
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) fixNode(n); }).observe(document.body, { childList: true, subtree: true });
}

/* ---------- rarity Godly ---------- */
if (!RARITY_ORDER.includes('godly')) RARITY_ORDER.push('godly');
RARITIES.godly = { label: 'Godly', color: '#ff3d6e', dupe: 60000, lvl: 7000, cap: 1 };
if (typeof COLL_WEIGHT === 'object') COLL_WEIGHT.godly = 500;
const basicG = GACHAS.find(g => g.id === 'basic');
if (basicG) { basicG.rates = Object.assign({}, basicG.rates, { common: +(basicG.rates.common - 0.01).toFixed(2), godly: 0.01 }); basicG.desc = 'Normale helden om je team mee te starten, en een piepkleine kans (0,01%) op de enige Godly held: De Koning der Elementen.'; }

/* ---------- gif ---------- */
Object.assign(STAT_DEFAULTS, { poison: 0, poisonDur: 0 });
Object.assign(STYLE_LABEL, { elements: 'Vuur · IJs · Gif' });
const _applyStatus29 = Game.prototype.applyStatus;
Game.prototype.applyStatus = function (e, st, o = {}) {
  const r = _applyStatus29.apply(this, arguments);
  if (st && st.poison > 0 && e && !e.dead && !e.E.worldBoss) { e.poisonT = Math.max(e.poisonT || 0, st.poisonDur || 4); e.poisonD = Math.max(e.poisonD || 0, st.poison * (e.poisonT > 0 ? 1 : 1)); }
  return r;
};
const _updEnemy29 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e, dt) {
  if (e.poisonT > 0 && !e.dead) {
    e.poisonT -= dt; this.damage(e, e.poisonD * dt, null, { pure: true, acc: true, color: '#84cc16' });
    e.shred = Math.max(e.shred || 0, 6);
    if (e.poisonT <= 0) e.poisonD = 0;
    if (e.dead) return;
  }
  return _updEnemy29.call(this, e, dt);
};
if (typeof FLAG_BITS !== 'undefined' && !FLAG_BITS.includes('poisonT')) FLAG_BITS.push('poisonT');
const _drawEnemy29 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  _drawEnemy29.call(this, ctx, e, t);
  if (e.poisonT > 0) { ctx.save(); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1 + e.id, y = e.ay - e.r - 4 - ((t * 20 + i * 7) % 14); ctx.fillStyle = rgba('#84cc16', 0.8); circle(ctx, e.x + Math.cos(a) * e.r * 0.6, y, 2.2); ctx.fill(); } ctx.restore(); }
};

/* ---------- helden ---------- */
const ELEM_HEROES = [
  { id: 'elementkoning', name: 'De Koning der Elementen', rarity: 'godly', role: 'Area damage', h4: 'elements', cap: 1, title: 'Heerser over vuur, ijs en gif', style: 'elements', cost: 3000,
    desc: 'De enige Godly held. Elk schot is om de beurt vuur (brandt), ijs (vertraagt en bevriest) of gif (vreet pantser en levens weg), op meerdere vijanden tegelijk met grote explosies. Extreem sterk. Alleen in de Basic Gacha, met 0,01% kans.',
    base: { dmg: 700, splash: 1.3, range: 5.5, rate: 1.4, multi: 3, air: true, projSpeed: 14, crit: 0.15, critMult: 2.5 },
    look: { skin: '#f5d0a9', suit: '#1e1b4b', suit2: '#fbbf24', cape: '#dc2626', hair: 'crown', hairC: '#fde047', emblem: 'star', weapon: 'staff', halo: true, wings: true, big: true }, fx: 'star', ability: 'elementenstorm',
    upgrades: [U('Vlammenkroon', 5000, '+300 schade', { dmg: 300 }, false, true), U('IJzige Wil', 8000, '+1 doel, +0,3 snelheid', { multi: 1, rate: 0.3 }), U('Gifhart', 12000, 'Grotere explosies, 20% extra kritiek', { splash: 0.5, crit: 0.2 }, true, true), U('Drie-eenheid', 18000, '+600 schade, +1 bereik', { dmg: 600, range: 1 }), U('Godheid der Elementen', 30000, '+1000 schade, +2 doelen. ULTIMATE: Kroon der Elementen', { dmg: 1000, multi: 2 }, true, true)] },
  { id: 'pyra', name: 'Pyra', rarity: 'ultra', role: 'Area damage', title: 'Haar adem is lava', style: 'projectile', proj: 'fire', cost: 1850,
    desc: 'Grote vuurballen die ontploffen en alles laten branden.',
    base: { dmg: 230, splash: 1.6, burn: 60, burnDur: 3, range: 4.0, rate: 0.9, multi: 2, air: true, projSpeed: 11 },
    look: { skin: '#fcd5b4', suit: '#7f1d1d', suit2: '#f97316', cape: '#ea580c', hair: 'flame', hairC: '#f97316', emblem: 'flame', weapon: 'orb', orb: '#f97316' }, fx: 'ember', ability: 'vuurregen',
    upgrades: [U('Hete Kern', 2400, '+150 schade', { dmg: 150 }, false, true), U('Laaiend', 3100, '+60 brand per seconde', { burn: 60 }), U('Vuurzee', 5300, 'Grotere explosies, +1 vuurbal', { splash: 0.5, multi: 1 }, true, true), U('Smeltpunt', 6800, '+280 schade, breekt 8 pantser', { dmg: 280, shred: 8 }), U('Zonnevlam', 12000, '+450 schade, +100 brand. ULTIMATE', { dmg: 450, burn: 100 }, true, true)] },
  { id: 'glaciera', name: 'Glaciëra', rarity: 'ultra', role: 'Controle', title: 'Koningin van de eeuwige winter', style: 'aura', cost: 1800,
    desc: 'Een ijzige puls rond haar heen: vertraagt alles sterk en bevriest vijanden vaak.',
    base: { dmg: 170, range: 2.8, rate: 0.7, slow: 0.5, slowDur: 2, stunChance: 0.22, stun: 1.2, air: true },
    look: { skin: '#e0f2fe', suit: '#0c4a6e', suit2: '#7dd3fc', cape: '#bae6fd', hair: 'crystal', hairC: '#e0f2fe', emblem: 'snow', weapon: 'staff', halo: true }, fx: 'frost', ability: 'ijstijd',
    upgrades: [U('Poolwind', 2400, '+110 schade', { dmg: 110 }, false, true), U('Diepvries', 3100, '+10% bevriezen, +0,4 bereik', { stunChance: 0.1, range: 0.4 }), U('Gletsjer', 5300, 'Sterkere vertraging, bevriest langer', { slow: 0.15, stun: 0.6 }, true, true), U('Absolute Nul', 6800, '+240 schade, +0,3 snelheid', { dmg: 240, rate: 0.3 }), U('Eeuwige Winter', 12000, '+400 schade, +0,6 bereik. ULTIMATE', { dmg: 400, range: 0.6 }, true, true)] },
  { id: 'venoma', name: 'Venoma', rarity: 'ultra', role: 'Area damage', title: 'Eén druppel is genoeg', style: 'projectile', proj: 'acid', cost: 1800,
    desc: 'Gifbommen die vijanden vergiftigen: veel schade per seconde en hun pantser lost op.',
    base: { dmg: 150, splash: 1.3, range: 4.2, rate: 1.0, multi: 2, poison: 120, poisonDur: 5, shred: 6, air: true, projSpeed: 12 },
    look: { skin: '#d9f99d', suit: '#14532d', suit2: '#84cc16', cape: '#365314', hair: 'hood', hairC: '#3f6212', emblem: 'hex', weapon: 'orb', orb: '#84cc16' }, fx: 'bubbles', ability: 'gifwolk',
    upgrades: [U('Sterker Gif', 2400, '+80 gif per seconde', { poison: 80 }, false, true), U('Zure Regen', 3100, '+100 schade, +1 bom', { dmg: 100, multi: 1 }), U('Gifwolken', 5300, 'Grotere explosies, gif duurt langer', { splash: 0.5, poisonDur: 2 }, true, true), U('Neurotoxine', 6800, '+150 gif per seconde, breekt 8 pantser', { poison: 150, shred: 8 }), U('Moeder der Gifslangen', 12000, '+300 gif, +250 schade. ULTIMATE', { poison: 300, dmg: 250 }, true, true)] },
  { id: 'voltara', name: 'Voltara', rarity: 'ultra', role: 'Snelle aanvallen', title: 'Sneller dan de bliksem', style: 'chain', cost: 1850,
    desc: 'Bliksem die van vijand naar vijand springt en ze soms even verlamt.',
    base: { dmg: 190, range: 4.0, rate: 1.4, chains: 5, stunChance: 0.1, stun: 0.4, air: true },
    look: { skin: '#fef3c7', suit: '#1e3a8a', suit2: '#fde047', cape: '#facc15', hair: 'spiky', hairC: '#fde047', emblem: 'bolt', weapon: 'fists' }, fx: 'spark', ability: 'donderslag',
    upgrades: [U('Hoogspanning', 2400, '+120 schade', { dmg: 120 }, false, true), U('Kettingreactie', 3100, '+3 sprongen', { chains: 3 }), U('Onweer', 5300, '+0,5 snelheid, verlamt vaker', { rate: 0.5, stunChance: 0.08 }, true, true), U('Supergeleider', 6800, '+260 schade', { dmg: 260 }), U('Stormgodin', 12000, '+420 schade, +4 sprongen. ULTIMATE', { dmg: 420, chains: 4 }, true, true)] },
];
ELEM_HEROES.forEach(h => { HEROES.push(h); HERO[h.id] = h; });
Object.assign(ABILITIES, {
  elementenstorm: { name: 'Elementenstorm', ult: 'Kroon der Elementen', cd: 18, desc: 'Vuur, ijs en gif tegelijk op alle vijanden in een groot gebied: zware schade, branden, bevriezen en vergiftigen. ULTIMATE: over de hele map.' },
  vuurregen: { name: 'Vuurregen', ult: 'Meteorenstorm', cd: 18, desc: 'Meteoren op de 5 sterkste vijanden in bereik (ULTIMATE: 10).' },
  ijstijd: { name: 'IJstijd', ult: 'Eeuwige Winter', cd: 20, desc: 'Bevriest alle vijanden in bereik (bazen korter).' },
  gifwolk: { name: 'Gifwolk', ult: 'Gifzee', cd: 18, desc: 'Vergiftigt alle vijanden in bereik zwaar en lost hun pantser op.' },
  donderslag: { name: 'Donderslag', ult: 'Godenstorm', cd: 16, desc: 'Bliksem slaat in bij alle vijanden in bereik.' },
});
const elemStats = (st, i) => i === 0 ? Object.assign({}, st, { burn: Math.max(st.burn, st.dmg * 0.35), burnDur: 3 })
  : i === 1 ? Object.assign({}, st, { slow: Math.max(st.slow, 0.5), slowDur: 1.6, stunChance: Math.max(st.stunChance, 0.15), stun: Math.max(st.stun, 1) })
  : Object.assign({}, st, { poison: st.dmg * 0.45, poisonDur: 4, shred: st.shred + 5 });
const ELEM_KIND = ['fire', 'snowball', 'acid'], ELEM_COL = ['#f97316', '#7dd3fc', '#84cc16'];
H4_TICK.elements = function (g, h, dt, attacked) {
  if (!attacked) return; const st = h.st;
  const ts = g.findTargets(h, st.range * TILE, Math.max(1, st.multi));
  ts.forEach((t, i) => { const k = (h.elemI = (h.elemI || 0) + 1) % 3; g.fireProjectile(h, t, elemStats(st, k), i, { kind: ELEM_KIND[k], speed: 14 }); });
  if (ts.length) Sfx.play('fire');
};
function elemBlast(g, h, list, mult, freeze) {
  for (const e of list) {
    if (e.dead) continue; g.damage(e, h.st.dmg * mult, h, { color: '#fde047' }); if (e.dead) continue;
    g.applyStatus(e, Object.assign({}, h.st, { burn: h.st.dmg * 0.5, burnDur: 4, slow: 0.55, slowDur: 2.5, poison: h.st.dmg * 0.6, poisonDur: 5 }), { noKnock: true });
    if (freeze && !e.ccImm && !e.megaBoss && !e.E.worldBoss) e.stunT = Math.max(e.stunT, e.boss ? freeze * 0.25 : freeze);
  }
}
Object.assign(ABILITY_FX, {
  elementenstorm(g, h, ult) {
    const list = ult ? g.enemies.filter(e => !e.dead) : g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.6, true);
    if (!list.length) return noTarget(g, h);
    elemBlast(g, h, list, ult ? 14 : 7, ult ? 2.5 : 1.5);
    ELEM_COL.forEach((c, i) => g.fx.ring(h.x, h.y, (ult ? 300 : h.st.range * TILE * 1.6) * (0.6 + i * 0.2), c, 0.7, 7));
    if (ult) { g.banner('KROON DER ELEMENTEN', 'Vuur, ijs en gif over de hele map', '#ff3d6e'); g.flash = { color: '#fde047', life: 0.4, max: 0.4 }; } g.shake(ult ? 14 : 6);
  },
  vuurregen(g, h, ult) {
    const ts = g.findTargets(h, h.st.range * TILE * 1.4, ult ? 10 : 5).sort((a, b) => b.hp - a.hp); if (!ts.length) return noTarget(g, h);
    ts.forEach((t, i) => g.effects.push({ type: 'strike', target: t, x: t.x, y: t.y, delay: 0.2 + i * 0.08, h, st: Object.assign({}, h.st, { splash: 1.8 }), dmg: h.st.dmg * (ult ? 8 : 5), kind: 'comet', color: '#f97316', life: 0.3, max: 0.3 }));
  },
  ijstijd(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * (ult ? 2.2 : 1.6), true); if (!list.length) return noTarget(g, h);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 6 : 3), h, { color: '#7dd3fc' }); if (!e.dead && !e.ccImm && !e.megaBoss && !e.E.worldBoss) { const d = ult ? 4 : 2.5; e.stunT = Math.max(e.stunT, e.boss ? d * 0.25 : d); e.frozenT = Math.max(e.frozenT || 0, e.boss ? d * 0.25 : d); } }
    g.fx.ring(h.x, h.y, h.st.range * TILE * 1.6, '#bae6fd', 0.7, 8);
  },
  gifwolk(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * (ult ? 1.8 : 1.3), true); if (!list.length) return noTarget(g, h);
    for (const e of list) { g.applyStatus(e, Object.assign({}, h.st, { poison: h.st.poison * (ult ? 4 : 2.5), poisonDur: ult ? 10 : 6 }), { noKnock: true }); e.shred = Math.max(e.shred || 0, 15); }
    for (let i = 0; i < 30; i++) g.fx.add({ type: 'smoke', x: h.x + rnd(-80, 80), y: h.y + rnd(-60, 60), size: 8, color: '#65a30d', life: 1.2 });
  },
  donderslag(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * (ult ? 2 : 1.4), true); if (!list.length) return noTarget(g, h);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 7 : 4), h, { color: '#fde047' }); g.effects.push({ type: 'bolt', x: e.x, y: e.y, color: '#fde047', life: 0.3, max: 0.3, w: 0.6 }); if (!e.dead && !e.ccImm) e.stunT = Math.max(e.stunT, e.boss ? 0.3 : 1); }
    g.shake(5);
  },
});
// Koning der Elementen: drie bollen (vuur, ijs, gif) draaien om hem heen
const _drawHeroUnit29 = Game.prototype.drawHeroUnit;
Game.prototype.drawHeroUnit = function (ctx, h, t) {
  const r = _drawHeroUnit29.call(this, ctx, h, t);
  if (h.def && h.def.id === 'elementkoning') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ELEM_COL.forEach((c, i) => { const a = t * 2.2 + i * TAU / 3; const x = h.x + Math.cos(a) * 22, y = h.y - 8 + Math.sin(a) * 9; ctx.fillStyle = rgba(c, 0.35); circle(ctx, x, y, 7); ctx.fill(); ctx.fillStyle = c; circle(ctx, x, y, 3.5); ctx.fill(); }); ctx.restore(); }
  return r;
};

/* ---------- 100× openen ---------- */
const _doPull29 = doPull;
doPull = function (gid, n, ticket) {
  if (n !== 100 || ticket) return _doPull29.apply(this, arguments);
  const g = GACHAS.find(x => x.id === gid), D = Store.data; if (!g || !Progress.gachaUnlocked(g)) return;
  const cur = g.currency || 'coins', price = g.price * 90;
  if ((D[cur] || 0) < price) { Sfx.play('error'); toast(`Je hebt ${fmt(price - (D[cur] || 0))} ${CUR_LABEL[cur]} te weinig voor 100×.`, 'bad'); return; }
  D[cur] -= price;
  const pool = gachaPool(g), res = [];
  for (let i = 0; i < 100; i++) {
    let minOrd = 0, forceLim = false;
    const block = res.slice(i - (i % 10));
    if (i % 10 === 9 && !block.some(r => r.id && rarOrd(HERO[r.id].rarity) >= rarOrd(g.guarantee10))) minOrd = rarOrd(g.guarantee10);
    if (g.pity) { const k = g.pity.key; D[k] = (D[k] || 0) + 1; if (D[k] >= g.pity.n) { if (g.pity.rarity === 'limited') forceLim = true; else minOrd = Math.max(minOrd, rarOrd(g.pity.rarity)); } }
    const pick = forceLim ? rollList(pool.filter(p => p.cat === 'limited')) : rollFrom(pool, minOrd);
    if (g.pity && (g.pity.rarity === 'limited' ? pick.cat === 'limited' : !pick.skin && rarOrd(pick.rarity) >= rarOrd(g.pity.rarity))) D[g.pity.key] = 0;
    res.push(pick.skin ? grantSkinPull(pick.skin) : grantHero(pick.id));
  }
  D.stats.pulls += 100; Meta.checkAchievements(); Store.save(); updateCoins();
  showReveal(res, g);
};
// overzicht in plaats van 100 losse kaarten
const _showReveal29 = showReveal;
showReveal = function (res, g) {
  if (res.length <= 10) return _showReveal29.apply(this, arguments);
  const byId = new Map(); let coins = 0, gems = 0, newN = 0;
  for (const r of res) {
    const key = r.skin ? 'skin:' + r.skin : r.id; const o = byId.get(key) || { r, n: 0, isNew: false }; o.n++; if (r.isNew) { o.isNew = true; newN++; } byId.set(key, o);
    coins += r.coins || 0; gems += r.gems || 0;
  }
  const list = [...byId.values()].sort((a, b) => (b.r.skin ? 0 : rarOrd(HERO[b.r.id].rarity)) - (a.r.skin ? 0 : rarOrd(HERO[a.r.id].rarity)) || b.n - a.n);
  const top = list[0] && !list[0].r.skin ? HERO[list[0].r.id].rarity : 'rare';
  const cnt = {}; for (const r of res) if (!r.skin) { const k = HERO[r.id].rarity; cnt[k] = (cnt[k] || 0) + 1; }
  $('#overlay-root').innerHTML = `<div class="overlay" id="reveal" role="dialog" aria-modal="true" aria-label="Resultaat 100× openen" style="--c:${rarColor(top)}"><div class="panel modal-card pull100" style="width:min(980px,100%)">
    <span class="kicker">${esc(g.name || '')} · ${res.length}× geopend</span><h2 style="font-size:28px">Beste: <span style="color:${rarColor(top)}">${RARITIES[top].label}</span></h2>
    <div class="p100-sum">${RARITY_ORDER.slice().reverse().filter(r => cnt[r]).map(r => `<span class="chip rar rar-${r}">${RARITIES[r].label} ×${cnt[r]}</span>`).join('')}${newN ? `<span class="chip" style="background:var(--good);color:#04130b">${newN} nieuw</span>` : ''}${coins ? `<span class="chip">+${fmt(coins)} munten</span>` : ''}${gems ? `<span class="chip">+${gems} gems</span>` : ''}</div>
    <div class="p100-grid">${list.map(o => { if (o.r.skin) return `<div class="p100-it" style="--rc:#f472b6"><b>Skin: ${esc(SKIN[o.r.skin].name)}</b>${o.n > 1 ? `<span class="p100-n">×${o.n}</span>` : ''}</div>`; const H = HERO[o.r.id]; return `
      <button class="p100-it" style="--rc:${rarColor(H.rarity)}" data-act="hero-info" data-id="${H.id}">${portrait(H.id)}<span class="p100-name">${esc(H.name)}</span><span class="chip rar rar-${H.rarity}">${RARITIES[H.rarity].label}</span>${o.n > 1 ? `<span class="p100-n">×${o.n}</span>` : ''}${o.isNew ? '<span class="rtag">NIEUW!</span>' : ''}</button>`; }).join('')}</div>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-pow" data-act="reveal-close">Doorgaan</button><button class="btn btn-sky" data-act="reveal-again" data-id="${g.id}" data-n="${res.length}">Nog eens ${res.length}×</button></div>
  </div></div>`;
  App.reveal = { timers: [], res }; hydratePortraits($('#overlay-root')); Sfx.play(rarOrd(top) >= rarOrd('ultra') ? 'cosmic' : 'gacha');
};
const _renderGacha29 = renderGacha;
renderGacha = function () {
  const r = _renderGacha29.apply(this, arguments);
  const ten = document.querySelector('#scr-gacha .pull-row [data-act="pull"][data-n="10"]');
  if (ten && !document.querySelector('#scr-gacha [data-act="pull"][data-n="100"]')) {
    const g = GACHAS.find(x => x.id === ten.dataset.id), b = document.createElement('button');
    b.className = 'btn btn-pow pull100-btn'; b.dataset.act = 'pull'; b.dataset.id = g.id; b.dataset.n = '100'; b.disabled = !canPayG(g, g.price * 90);
    b.innerHTML = `100× openen · ${priceHtml(g, g.price * 90)}`; ten.after(b);
  }
  const note = document.querySelector('#scr-gacha .gacha-detail p.muted[style*="font-size:13px"]');
  if (note && !/100×/.test(note.textContent)) note.insertAdjacentHTML('beforeend', ' 100× kost 90× de prijs, met de garantie in elk blok van 10.');
  return r;
};
