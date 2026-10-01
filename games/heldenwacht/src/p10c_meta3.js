/* =====================================================================
   META UITBREIDING 3 — gems, shop, collectielevel, drops, dungeon,
   vergrendelingen op level en de limited gacha
   ===================================================================== */
const _defaults3 = Store.defaults;
Store.defaults = function () {
  const d = _defaults3.call(this);
  d.gems = 25; Object.assign(d.tickets, { epic: 0, mythic: 0, exotic: 0 });
  d.shop = { rot: null, lim: {}, starter: false }; d.dungeon = { best: 0 }; d.coll = { claimed: 0 };
  Object.assign(d.stats, { elites: 0, dungeonBest: 0, shopBuys: 0, gemsEarned: 0, drops: 0 });
  return d;
};
const _levelReward3 = levelReward;
levelReward = function (l) { const r = Object.assign({}, _levelReward3(l)); r.gems = (r.gems || 0) + (l % 5 === 0 ? 30 : 5); return r; };

/* ---------- collectie ---------- */
function collectionInfo(D = Store.data) {
  let pts = 0;
  for (const id in D.heroes) { const H = HERO[id]; if (H && !H.hidden) pts += COLL_WEIGHT[H.rarity] || 0; }
  pts += (D.skins || []).length * 10 + Object.keys(D.heroSkins || {}).length * 4 + (D.traitsSeen || []).length * 3;
  let level = 0; while (level + 1 < COLL_LEVELS.length && pts >= COLL_LEVELS[level + 1]) level++;
  return { pts, level, cur: COLL_LEVELS[level], next: level + 1 < COLL_LEVELS.length ? COLL_LEVELS[level + 1] : null, max: COLL_LEVELS.length - 1 };
}
function collectionMax() { let p = 0; for (const H of HEROES) p += COLL_WEIGHT[H.rarity] || 0; return p + SKINS.filter(s => !s.mastery).length * 10 + TRAITS.length * 3; }

/* ---------- vergrendelingen ---------- */
Progress.mapUnlocked = function (i) { const m = MAPS[i]; if (!m) return false; if (m.reqLevel && Store.data.level < m.reqLevel) return false; return i === 0 || this.clearedAtLeast(MAPS[i - 1].id, 1); };
Progress.lockText = function (i) { const m = MAPS[i]; if (i > 0 && !this.clearedAtLeast(MAPS[i - 1].id, 1)) return `Haal eerst ${MAPS[i - 1].name} op Normaal`; if (m.reqLevel && Store.data.level < m.reqLevel) return `Bereik eerst spelerslevel ${m.reqLevel}`; return ''; };
const _diffUnlocked3 = Progress.diffUnlocked;
Progress.diffUnlocked = function (mi, di) { const d = DIFFS[di]; if (d.reqLevel && Store.data.level < d.reqLevel) return false; return _diffUnlocked3.call(this, mi, di); };
Progress.diffLockText = function (mi, di) { const d = DIFFS[di]; if (!this.mapUnlocked(mi)) return 'Map vergrendeld'; if (di > 1 && !this.clearedAtLeast(MAPS[mi].id, di - 1)) return `Haal eerst ${DIFFS[di - 1].name}`; if (d.reqLevel && Store.data.level < d.reqLevel) return `Vanaf spelerslevel ${d.reqLevel}`; return ''; };
const _gachaUnlocked3 = Progress.gachaUnlocked, _unlockText3 = Progress.unlockText;
Progress.gachaUnlocked = function (g) { if (g.unlockLevel && Store.data.level < g.unlockLevel) return false; return _gachaUnlocked3.call(this, g); };
Progress.unlockText = function (g) { if (g.unlockLevel && Store.data.level < g.unlockLevel) return `Vanaf spelerslevel ${g.unlockLevel}`; return _unlockText3.call(this, g); };

/* ---------- valuta en beloningen ---------- */
const CUR_LABEL = { coins: 'munten', gems: 'Gems', raidTokens: 'Raidtokens', tokens: 'Trait Tokens' };
const _rewardText3 = Meta.rewardText, _grant3 = Meta.grant, _ensureAll3 = Meta.ensureAll;
Object.assign(Meta, {
  rewardText(r) { const out = _rewardText3.call(this, r); if (r.gems) out.unshift(`${r.gems} Gems`); return out.map(t => t.replace(/Reroll Token/g, 'Trait Token')); },
  grant(r, o) { const lines = _grant3.call(this, r, o); if (r.gems) { Store.data.gems += r.gems; Store.data.stats.gemsEarned += r.gems; } return lines; },
  ensureAll() {
    const D = Store.data;
    if (typeof D.gems !== 'number' || !isFinite(D.gems)) D.gems = 25;
    if (!D.shop || typeof D.shop !== 'object') D.shop = { rot: null, lim: {}, starter: false }; if (!D.shop.lim) D.shop.lim = {};
    if (!D.dungeon || typeof D.dungeon !== 'object') D.dungeon = { best: 0 };
    if (!D.coll || typeof D.coll !== 'object') D.coll = { claimed: 0 };
    _ensureAll3.call(this);
  },
  collMult() { return 1 + COLL_BONUS * collectionInfo().level; },
  collClaimable() { return Math.max(0, collectionInfo().level - (Store.data.coll.claimed || 0)); },
  claimColl() {
    const D = Store.data, lv = collectionInfo().level, out = [];
    while ((D.coll.claimed || 0) < lv) { D.coll.claimed = (D.coll.claimed || 0) + 1; out.push(...this.grant(collReward(D.coll.claimed))); }
    if (!out.length) return null; this.checkAchievements(); Store.save(); return out;
  },
  canAfford(cost) { const D = Store.data; for (const k in cost) if ((D[k] || 0) < cost[k]) return false; return true; },
  pay(cost) { const D = Store.data; for (const k in cost) D[k] -= cost[k]; },
  costText(cost) { return Object.keys(cost).map(k => `${fmt(cost[k])} ${CUR_LABEL[k] || k}`).join(' + '); },

  /* ---------- speciale drops ---------- */
  rollDrops(g) {
    const d = g.diff; if (!d.drops) return [];
    const out = [], tbl = DROP_TABLE.filter(x => !x.minDiff || g.diffIdx >= x.minDiff), tot = tbl.reduce((a, x) => a + x.w, 0);
    for (let i = 0; i < d.drops; i++) {
      if (Math.random() > 0.6) continue;
      let r = Math.random() * tot, pick = tbl[0]; for (const x of tbl) { r -= x.w; if (r <= 0) { pick = x; break; } }
      let rw = pick.r(); if (rw.skin && Store.data.skins.includes(rw.skin)) rw = { gems: 60 };
      out.push(rw);
    }
    return out;
  },

  /* ---------- dungeon ---------- */
  dungeonUnlocked() { return Store.data.level >= DUNGEON.unlockLevel && Progress.clearedAtLeast(DUNGEON.unlock.map, DUNGEON.unlock.diff); },
  dungeonMaxDepth() { return Math.min(DUNGEON.maxDepth, (Store.data.dungeon.best || 0) + 1); },

  /* ---------- limited gacha ---------- */
  limitedSet() {
    const ev = this.activeEvent(), list = SEASON_EVENTS, i = list.indexOf(ev.def);
    let j = (i - 1 + list.length) % list.length; if (list[j] === ev.def || list[j].fallback) j = (j - 1 + list.length) % list.length;
    const prev = list[j];
    return { ev, prev, heroes: [...new Set([ev.def.hero, prev.hero])], skins: [...new Set([ev.def.skin, prev.skin, 'cyber', 'kristalhuid', 'schaduwridder'])] };
  },
});

/* ---------- Shop ---------- */
const Shop = {
  rotKey() { return Math.floor(Date.now() / (SHOP_ROT_HOURS * 3600e3)); },
  rotEnds() { return (this.rotKey() + 1) * SHOP_ROT_HOURS * 3600e3; },
  state() { const D = Store.data; if (!D.shop.rot || D.shop.rot.key !== this.rotKey()) D.shop.rot = { key: this.rotKey(), n: 0, bought: [] }; return D.shop.rot; },
  heroPool(rars) { return HEROES.filter(h => !h.exclusive && !h.hidden && rars.includes(h.rarity) && HERO_SHOP_PRICE[h.rarity]); },
  heroItem(H, id, per, disc = 1) {
    const base = HERO_SHOP_PRICE[H.rarity], cost = {}; for (const k in base) cost[k] = Math.round(base[k] * disc / (k === 'coins' ? 50 : 5)) * (k === 'coins' ? 50 : 5);
    return { id, cat: 'heroes', hero: H.id, text: H.name, sub: `${RARITIES[H.rarity].label} · ${H.role}`, cost, reward: { hero: H.id }, limit: 1, per, disc };
  },
  rotation() {
    const st = this.state(), rng = mulberry32(hashStr('rot' + st.key + ':' + st.n)), pick = a => a[Math.floor(rng() * a.length)], id = i => `rot-${st.key}-${st.n}-${i}`, out = [];
    const h1 = pick(this.heroPool(['rare', 'epic'])), h2 = pick(this.heroPool(rng() < 0.3 ? ['mythic'] : ['legendary']));
    out.push(this.heroItem(h1, id(0), 'rot', 0.7), this.heroItem(h2, id(1), 'rot', 0.75));
    const skins = SKINS.filter(s => s.shop && !Store.data.skins.includes(s.id));
    if (skins.length) { const S = pick(skins); out.push({ id: id(2), cat: 'skins', skin: S.id, text: `Skin "${S.name}"`, sub: 'Voor al je helden', cost: { gems: Math.round(S.shop * 0.8 / 5) * 5 }, reward: { skin: S.id }, limit: 1, per: 'rot', disc: 0.8 }); }
    else out.push({ id: id(2), cat: 'tickets', text: '2 Mythic Tickets', sub: 'Aanbieding', cost: { gems: 210 }, reward: { tickets: { mythic: 2 } }, limit: 1, per: 'rot', disc: 0.8 });
    const tk = pick([['epic', 2, { coins: 10000 }], ['legendary', 2, { gems: 120 }], ['rare', 3, { coins: 7000 }], ['exotic', 2, { gems: 95 }]]);
    out.push({ id: id(3), cat: 'tickets', text: `${tk[1]}× ${TICKETS[tk[0]].name}`, sub: 'Aanbieding', cost: tk[2], reward: { tickets: { [tk[0]]: tk[1] } }, limit: 1, per: 'rot', disc: 0.85 });
    out.push(rng() < 0.5 ? { id: id(4), cat: 'tokens', text: '3 Trait Tokens', sub: 'Aanbieding', cost: { coins: 8500 }, reward: { tokens: 3 }, limit: 1, per: 'rot', disc: 0.8 } : { id: id(4), cat: 'tokens', text: '6 Trait Tokens', sub: 'Aanbieding', cost: { gems: 110 }, reward: { tokens: 6 }, limit: 1, per: 'rot', disc: 0.8 });
    out.push(rng() < 0.5 ? { id: id(5), cat: 'currency', text: '15 Raidtokens', sub: 'Aanbieding', cost: { coins: 6000 }, reward: { raidTokens: 15 }, limit: 1, per: 'rot' } : { id: id(5), cat: 'currency', text: '12.000 munten', sub: 'Aanbieding', cost: { gems: 70 }, reward: { coins: 12000 }, limit: 1, per: 'rot', disc: 0.8 });
    return out;
  },
  weeklyHeroes() {
    const wk = weekKey(), rng = mulberry32(hashStr('wh' + wk)), pick = a => a[Math.floor(rng() * a.length)], out = [], used = new Set();
    for (const rars of [['common'], ['uncommon'], ['rare'], ['epic'], ['legendary'], ['mythic']]) { const list = this.heroPool(rars).filter(h => !used.has(h.id)); if (!list.length) continue; const H = pick(list); used.add(H.id); out.push(this.heroItem(H, 'wh-' + H.id, 'week')); }
    return out;
  },
  skins() { return SKINS.filter(s => s.shop).map(S => ({ id: 'skin-' + S.id, cat: 'skins', skin: S.id, text: `Skin "${S.name}"`, sub: 'Voor al je helden', cost: { gems: S.shop }, reward: { skin: S.id }, per: 'once' })); },
  deals() {
    const wk = weekKey(), rng = mulberry32(hashStr('deal' + wk)), pool = DEAL_POOL.slice().sort(() => rng() - 0.5).slice(0, 3);
    const out = pool.map(d => Object.assign({ id: 'deal-' + d.id, cat: 'deals', sub: d.name, limit: 1, per: 'week' }, d.make(rng, wk)));
    if (!Store.data.shop.starter && Store.data.level <= STARTER_DEAL.maxLevel) out.unshift(Object.assign({ cat: 'deals', sub: `Eenmalig · tot level ${STARTER_DEAL.maxLevel}`, per: 'once' }, STARTER_DEAL));
    return out;
  },
  fixed(cat) { return (SHOP_FIXED[cat] || []).map(x => Object.assign({ cat, per: x.per || null }, x)); },
  items(cat) {
    switch (cat) {
      case 'rot': return this.rotation();
      case 'heroes': return this.weeklyHeroes();
      case 'skins': return this.skins();
      case 'deals': return this.deals();
      default: return this.fixed(cat);
    }
  },
  find(id) { for (const c of ['rot', 'heroes', 'skins', 'deals', 'tickets', 'tokens', 'currency']) { const it = this.items(c).find(x => x.id === id); if (it) return it; } return null; },
  period(it) { return it.per === 'day' ? dayKey() : it.per === 'week' ? weekKey() : it.per === 'once' ? 'once' : ''; },
  used(it) {
    const D = Store.data;
    if (it.per === 'rot') return this.state().bought.includes(it.id) ? 1 : 0;
    if (it.id === 'starter') return D.shop.starter ? 1 : 0;
    if (it.per === 'once' && it.skin) return D.skins.includes(it.skin) ? 1 : 0;
    return D.shop.lim[it.id + '@' + this.period(it)] || 0;
  },
  left(it) { if (it.per === 'once') return this.used(it) ? 0 : 1; if (!it.limit) return Infinity; return Math.max(0, it.limit - this.used(it)); },
  status(it) {
    if (this.left(it) <= 0) return { ok: false, why: it.skin ? 'In bezit' : 'Uitverkocht' };
    if (it.skin && Store.data.skins.includes(it.skin)) return { ok: false, why: 'In bezit' };
    if (!Meta.canAfford(it.cost)) return { ok: false, why: 'Te duur' };
    return { ok: true };
  },
  buy(id) {
    const it = this.find(id); if (!it) return null;
    const s = this.status(it); if (!s.ok) { toast(s.why === 'Te duur' ? `Je hebt niet genoeg ${Object.keys(it.cost).map(k => CUR_LABEL[k]).join(' of ')}.` : s.why, 'bad'); Sfx.play('error'); return null; }
    const D = Store.data; Meta.pay(it.cost);
    if (it.per === 'rot') this.state().bought.push(it.id);
    else if (it.id === 'starter') D.shop.starter = true;
    else if (it.per) { const k = it.id + '@' + this.period(it); D.shop.lim[k] = (D.shop.lim[k] || 0) + 1; }
    D.stats.shopBuys = (D.stats.shopBuys || 0) + 1;
    const l = Meta.grant(it.reward); Meta.checkAchievements(); Store.save(); return l;
  },
  refresh() {
    const D = Store.data; if (D.gems < SHOP_ROT_REFRESH) { toast(`Vernieuwen kost ${SHOP_ROT_REFRESH} Gems.`, 'bad'); Sfx.play('error'); return false; }
    D.gems -= SHOP_ROT_REFRESH; const st = this.state(); st.n++; st.bought = []; Store.save(); return true;
  },
  cleanup() { const D = Store.data, keep = [dayKey(), weekKey(), 'once']; for (const k in D.shop.lim) if (!keep.some(p => k.endsWith('@' + p))) delete D.shop.lim[k]; },
};
