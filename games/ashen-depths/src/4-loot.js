/* =====================================================================
   LOOT — random items, rarities, affixes, uniques and the LUCK system
   ===================================================================== */

/** Luck factor 0..1 with diminishing returns: luck 20 → .25, 60 → .5, 180 → .75.
    Keeps high luck strong without making every drop legendary. */
const luckFactor = L => Math.max(0, L) / (Math.max(0, L) + 60);

/** Roll a rarity. Each tier's weight is multiplied by (1 + lf * tier * 1.4). minR forces a floor. */
function rollRarity(luck, minR = 0, bonus = 0) {
  const lf = luckFactor(luck + bonus);
  const opts = RARITIES.map((r, i) => ({ i, w: i < minR ? 0 : r.w * (1 + lf * i * 1.4) }));
  return weightedPick(opts, o => o.w).i;
}
function effLuck() { return (G.p ? G.p.S.luck : 0) + (DIFFS[G.run ? G.run.diff : 1].loot - 1) * 20; }
function itemLevel() { return G.run ? Math.max(1, G.run.depth + 1 + G.run.diff) : 1; }
function rollAffix(stat, ilvl, rar) {
  const a = AFFIXES[stat];
  const v = (a.v[0] + a.v[1] * ilvl) * RARITIES[rar].mult * rand(.8, 1.15);
  return a.u === '/s' ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
}

/** Generate a weapon. unique: force a named unique when rarity >= legendary. */
function genWeapon(ilvl, rar, type, opts = {}) {
  type = type || pick(Object.keys(WEAPON_TYPES));
  const T = WEAPON_TYPES[type], R = RARITIES[rar];
  const it = { uid: UID++, kind: 'weapon', type, slot: 'weapon', rar, ilvl, stats: {} };
  it.dmg = Math.round(T.dmg * (1 + ilvl * .11) * R.mult * rand(.92, 1.08) * 10) / 10;
  it.rate = T.rate;
  if (T.base) for (const k in T.base) it.stats[k] = Math.round(T.base[k] * (1 + ilvl * .05));
  const nA = randi(R.affix[0], R.affix[1]);
  const pool = shuffle(Object.keys(AFFIXES).filter(k => !['hp', 'mp', 'armor', 'block'].includes(k) || chance(.3)));
  const chosen = pool.slice(0, nA);
  for (const s of chosen) it.stats[s] = (it.stats[s] || 0) + rollAffix(s, ilvl, rar);
  if (rar >= 4) {
    const uq = UNIQUES.filter(u => u.type === type);
    if (uq.length && (opts.unique || chance(.55))) { const u = pick(uq); it.unique = u.name; it.power = u.power; }
    else it.power = pick(Object.keys(POWERS).filter(k => k !== 'split' || T.kind === 'ranged'));
  }
  it.name = it.unique || nameItem(pick(T.names), chosen);
  if (rar === 5) it.name = 'Mythic ' + it.name;
  it.value = itemValue(it);
  return it;
}
function genArmor(ilvl, rar, slot) {
  slot = slot || pick(Object.keys(ARMOR_SLOTS));
  const S = ARMOR_SLOTS[slot], R = RARITIES[rar];
  const it = { uid: UID++, kind: 'armor', type: slot, slot, rar, ilvl, stats: {} };
  for (const k in S.base) it.stats[k] = k === 'move' || k === 'atkSpd' || k === 'crit' || k === 'luck' ? Math.round(S.base[k] * R.mult) : Math.round(S.base[k] * (1 + ilvl * .12) * R.mult);
  const nA = randi(R.affix[0], R.affix[1]) + (rar >= 4 ? 1 : 0);
  const chosen = shuffle(Object.keys(AFFIXES)).slice(0, nA);
  for (const s of chosen) it.stats[s] = (it.stats[s] || 0) + rollAffix(s, ilvl, rar);
  if (rar >= 4 && chance(.5)) it.power = pick(['vampire', 'thorns', 'midas', 'chain', 'frostbite', 'ignite']);
  it.name = nameItem(pick(S.names), chosen);
  if (rar === 5) it.name = 'Mythic ' + it.name;
  it.value = itemValue(it);
  return it;
}
function nameItem(base, affixes) {
  const pre = PREFIXES.filter(p => affixes.includes(p[1]));
  const suf = SUFFIXES.filter(s => affixes.includes(s[1]));
  let n = base;
  if (pre.length) n = pick(pre)[0] + ' ' + n;
  if (suf.length) { const s = pick(suf); if (!n.includes(s[0])) n += ' ' + s[0]; }
  return n;
}
function itemValue(it) { return Math.round((12 + it.ilvl * 5) * (1 + it.rar * it.rar * .7) * (it.power ? 1.5 : 1)); }

/** Random item influenced by luck. o: {minR, kind, bonus} */
function genItem(o = {}) {
  const rar = rollRarity(effLuck(), o.minR || 0, o.bonus || 0);
  const ilvl = itemLevel() + (o.ilvlBonus || 0);
  const kind = o.kind || (chance(.5) ? 'weapon' : 'armor');
  const it = kind === 'weapon' ? genWeapon(ilvl, rar, o.type, o) : genArmor(ilvl, rar, o.type);
  return it;
}
function registerFind(it) {
  const A = Save.data.armory;
  if (it.kind === 'weapon') A.cats[it.type] = Math.max(A.cats[it.type] || 0, it.rar + 1);
  if (it.unique) A.uniques[it.unique] = 1;
  if (it.rar >= 4) { Save.data.stats.legendaries++; unlockAch('legendary'); Sfx.play('legend'); }
  if (it.rar >= 5) unlockAch('mythic');
  if (!A.best || it.rar > A.best.rar || (it.rar === A.best.rar && it.value > A.best.value)) A.best = { name: it.name, rar: it.rar, type: it.type, value: it.value };
}

/** Human readable stat line */
function statLine(k, v) {
  const a = AFFIXES[k]; if (!a) return '';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${a.u === '/s' ? v.toFixed(1) : Math.round(v)}${a.u === '%' ? '%' : a.u === '/s' ? '/s' : ''} ${a.name}`;
}
/** Numeric score used for comparisons (roughly how good an item is). */
function itemScore(it) {
  if (!it) return 0;
  let s = it.dmg ? it.dmg * it.rate * 4 : 0;
  for (const k in it.stats) s += it.stats[k] * (k === 'hp' ? .25 : k === 'armor' ? .8 : k === 'mp' ? .2 : 1);
  if (it.power) s += 25;
  return s;
}
