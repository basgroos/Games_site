/* =====================================================================
   Meta-systemen: beloningen, voortgang, uitdagingen, events, ranglijsten
   ===================================================================== */
const pad2 = n => String(n).padStart(2, '0');
function dayKey(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function weekKey(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${pad2(Math.ceil(((t - y0) / 864e5 + 1) / 7))}`; }
function seasonKey(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function endOfDay() { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); }
function endOfWeek() { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() + (8 - day)); d.setHours(0, 0, 0, 0); return d.getTime(); }
function endOfSeason() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); }
const SEASON_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
function seasonName(k = seasonKey()) { const [y, m] = k.split('-').map(Number); return `Seizoen ${SEASON_NAMES[m - 1]} ${y}`; }

const Meta = {
  pending: [],   // meldingen voor de UI (toasts)
  note(msg, kind = 'good') { this.pending.push({ msg, kind }); },

  /* ---------- beloningen ---------- */
  prestigeMult() { return 1 + PRESTIGE_BONUS * Math.min(5, Store.data.prestige || 0); },
  rewardText(r) {
    const out = [];
    if (r.coins) out.push(`${fmt(r.coins)} munten`);
    if (r.xp) out.push(`${fmt(r.xp)} XP`);
    if (r.tokens) out.push(`${r.tokens} Reroll Token${r.tokens > 1 ? 's' : ''}`);
    if (r.raidTokens) out.push(`${r.raidTokens} Raidtokens`);
    if (r.eventCur) out.push(`${r.eventCur} ${(this.activeEvent() || {}).def ? this.activeEvent().def.currency : 'eventmunten'}`);
    if (r.tickets) for (const k in r.tickets) if (r.tickets[k]) out.push(`${r.tickets[k]}× ${TICKETS[k].name}`);
    if (r.skin) out.push(`Skin "${SKIN[r.skin].name}"`);
    if (r.title) out.push(`Titel "${titleName(r.title)}"`);
    if (r.badge) out.push(`Badge`);
    if (r.hero) out.push(`Held: ${HERO[r.hero].name}`);
    if (r.unlockMap) out.push(`Geheime map: ${SMAP[r.unlockMap].name}`);
    return out;
  },
  grant(r, o = {}) {
    const D = Store.data, lines = this.rewardText(r);
    if (r.coins) { D.coins += r.coins; D.stats.earned += r.coins; }
    if (r.tokens) D.tokens += r.tokens;
    if (r.raidTokens) D.raidTokens += r.raidTokens;
    if (r.tickets) for (const k in r.tickets) D.tickets[k] = (D.tickets[k] || 0) + r.tickets[k];
    if (r.eventCur) { const ev = this.activeEvent(); if (ev) this.evState(ev).cur += r.eventCur; }
    if (r.skin && !D.skins.includes(r.skin)) D.skins.push(r.skin);
    if (r.title && !D.titles.includes(r.title)) { D.titles.push(r.title); if (!D.title) D.title = r.title; }
    if (r.badge && !D.badges.includes(r.badge)) D.badges.push(r.badge);
    if (r.hero) { const res = grantHero(r.hero); if (res.isNew) this.note(`Nieuwe held: ${HERO[r.hero].name}!`); }
    if (r.unlockMap) D.secret[r.unlockMap] = true;
    if (r.xp) lines.push(...this.addXP(r.xp));
    return lines;
  },
  addXP(n) {
    const D = Store.data, msgs = []; D.xp += Math.round(n);
    while (D.level < PLAYER_MAX_LEVEL && D.xp >= xpForLevel(D.level)) {
      D.xp -= xpForLevel(D.level); D.level++;
      const r = levelReward(D.level); this.grant(r);
      msgs.push(`Level ${D.level}! ${this.rewardText(r).join(', ')}`); this.note(`Spelerslevel ${D.level}!`);
    }
    return msgs;
  },

  /* ---------- helden, traits, skins, mastery ---------- */
  rollTrait(rng = Math.random) {
    const tot = Object.values(TRAIT_WEIGHTS).reduce((a, b) => a + b, 0); let r = rng() * tot, rar = 'common';
    for (const k of Object.keys(TRAIT_WEIGHTS)) { r -= TRAIT_WEIGHTS[k]; if (r <= 0) { rar = k; break; } }
    const list = TRAITS.filter(t => t.rarity === rar); return list[Math.floor(rng() * list.length)].id;
  },
  ensureHero(id) {
    const D = Store.data, o = D.heroes[id]; if (!o) return;
    if (o.trait && !TRAIT[o.trait]) o.trait = null;
    if (!o.trait) o.trait = null;
    if (o.mxp == null) o.mxp = 0;
    if (o.skin && !this.ownsSkin(id, o.skin)) o.skin = null;
  },
  ensureAll() {
    const D = Store.data;
    // Trait Gacha: helden krijgen geen gratis trait meer. Oude, automatisch gegeven traits worden eenmalig verwijderd.
    if (!D.traitsV2) { const had = Object.values(D.heroes).some(o => o.trait); for (const id in D.heroes) D.heroes[id].trait = null; D.traitsSeen = []; D.traitsV2 = true; if (had) { D.tokens += 5; this.note('Traits werken nu via de Trait Gacha. Je krijgt 5 gratis Reroll Tokens om te beginnen!'); } }
    for (const id in D.heroes) if (HERO[id]) this.ensureHero(id); else delete D.heroes[id];
  },
  traitPityLeft() { return TRAIT_PITY - (Store.data.traitPity || 0); },
  canRollTrait(pay) { const D = Store.data; return pay === 'coins' ? D.coins >= TRAIT_COST.coins : D.tokens >= TRAIT_COST.tokens; },
  rollTraitOn(id, pay) {
    const D = Store.data, o = D.heroes[id]; if (!o || !this.canRollTrait(pay)) return null;
    if (pay === 'coins') D.coins -= TRAIT_COST.coins; else D.tokens -= TRAIT_COST.tokens;
    D.stats.rerolls = (D.stats.rerolls || 0) + 1; D.traitPity = (D.traitPity || 0) + 1;
    let now = this.rollTrait(), pity = false;
    if (D.traitPity >= TRAIT_PITY && rarOrdG(TRAIT[now].rarity) < 4) { const hi = TRAITS.filter(t => rarOrdG(t.rarity) >= 4), tot = hi.reduce((a, t) => a + TRAIT_WEIGHTS[t.rarity] / TRAITS.filter(x => x.rarity === t.rarity).length, 0); let r = Math.random() * tot; for (const t of hi) { r -= TRAIT_WEIGHTS[t.rarity] / TRAITS.filter(x => x.rarity === t.rarity).length; if (r <= 0) { now = t.id; break; } } pity = true; }
    if (rarOrdG(TRAIT[now].rarity) >= 4) D.traitPity = 0;
    const old = o.trait, isNew = !D.traitsSeen.includes(now); o.trait = now;
    if (isNew) D.traitsSeen.push(now);
    this.checkAchievements(); Store.save();
    return { old, now, isNew, pity };
  },
  ownsSkin(id, skin) { const D = Store.data; return D.skins.includes(skin) || !!D.heroSkins[id + ':' + skin]; },
  skinsFor(id) { return SKINS.filter(s => this.ownsSkin(id, s.id)); },
  mastery(id) { const o = Store.data.heroes[id] || {}; const xp = o.mxp || 0, lvl = masteryLevel(xp); return { xp, lvl, next: lvl < MASTERY_MAX ? MASTERY_XP[lvl] : null, cur: MASTERY_XP[lvl - 1] }; },
  masteryBadge(id) { const l = this.mastery(id).lvl; return l >= 15 ? 'diamant' : l >= 13 ? 'goud' : l >= 8 ? 'zilver' : l >= 2 ? 'brons' : null; },
  addMastery(id, xp) {
    const D = Store.data, o = D.heroes[id]; if (!o || xp <= 0) return [];
    const before = masteryLevel(o.mxp || 0); o.mxp = (o.mxp || 0) + Math.round(xp); D.stats.masteryXp += Math.round(xp);
    const after = masteryLevel(o.mxp), out = [];
    for (let l = before + 1; l <= after; l++) {
      const R = MASTERY_REWARDS[l]; if (!R) continue;
      if (R.coins) this.grant({ coins: R.coins }); if (R.tokens) this.grant({ tokens: R.tokens }); if (R.tickets) this.grant({ tickets: R.tickets });
      if (R.heroSkin) D.heroSkins[id + ':' + R.heroSkin] = true;
      if (R.heroTitle) { const t = (R.heroTitle === 'kenner' ? 'mk:' : 'ml:') + id; if (!D.titles.includes(t)) D.titles.push(t); }
      out.push(`${HERO[id].name} mastery ${l}: ${R.text.replace('<held>', HERO[id].name)}`);
    }
    return out;
  },

  /* ---------- quests ---------- */
  questValue(q) { return Store.data.stats[q.stat] || 0; },
  questState(q) { const i = Store.data.quests[q.id] || 0; const done = i >= q.tiers.length; const n = done ? q.tiers[q.tiers.length - 1] : q.tiers[i]; return { i, n, done, claimable: !done && this.questValue(q) >= n, reward: done ? null : q.reward(i) }; },
  claimQuest(id) { const q = QUESTS.find(x => x.id === id), st = this.questState(q); if (!st.claimable) return null; Store.data.quests[id] = st.i + 1; const l = this.grant(st.reward); Store.save(); return l; },

  /* ---------- achievements ---------- */
  checkAchievements() {
    const D = Store.data;
    for (const a of ACHIEVEMENTS) if (!D.ach[a.id] && a.check(D.stats, D)) { D.ach[a.id] = 'done'; this.note(`Achievement: ${a.name}!`); if (a.unlockMap && !D.secret[a.unlockMap]) { D.secret[a.unlockMap] = true; this.note(`Geheime map ontdekt: ${SMAP[a.unlockMap].name}!`); } }
  },
  claimAch(id) { const a = ACHIEVEMENTS.find(x => x.id === id); if (!a || Store.data.ach[id] !== 'done') return null; Store.data.ach[id] = 'claimed'; const l = this.grant(a.reward); Store.save(); return l; },

  /* ---------- uitdagingen ---------- */
  ensureChallenges() {
    const D = Store.data, dk = dayKey(), wk = weekKey();
    const pick = (pool, key, n) => { const rng = mulberry32(hashStr(key)); const idx = pool.map((_, i) => i).sort(() => rng() - 0.5).slice(0, n); return idx.map(i => ({ i, prog: 0, st: 'open' })); };
    if (!D.ch.day || D.ch.day.key !== dk) D.ch.day = { key: dk, list: pick(DAILY_POOL, 'd' + dk, 3) };
    if (!D.ch.week || D.ch.week.key !== wk) D.ch.week = { key: wk, list: pick(WEEKLY_POOL, 'w' + wk, 3) };
  },
  chDef(kind, c) { return (kind === 'day' ? DAILY_POOL : WEEKLY_POOL)[c.i]; },
  progressValue(def, S) {
    const campaignLike = ['campaign', 'custom', 'challenge', 'event', 'secret'].includes(S.mode);
    const diffOk = def.minDiff == null || (S.diffIdx >= def.minDiff);
    switch (def.type) {
      case 'kills': return { add: S.kills };
      case 'waves': return { add: S.waves };
      case 'bosses': return { add: S.bosses };
      case 'upgrades': return { add: S.upgrades };
      case 'abilities': return { add: S.abilities };
      case 'winAny': return { add: S.win ? 1 : 0 };
      case 'winDiff': return { add: S.win && campaignLike && diffOk ? 1 : 0 };
      case 'fastboss': return { add: S.fastBoss <= def.sec ? 1 : 0 };
      case 'rule': return { add: S.win && campaignLike && diffOk && S.rules[def.rule] && (!def.map || def.map === S.mapId) ? 1 : 0 };
      case 'modWin': return { max: S.win ? S.mods : 0 };
      case 'endless': return { max: S.mode === 'endless' ? S.wave : 0 };
      case 'raid': return { add: S.raidDone ? 1 : 0 };
      case 'bossrush': return { max: S.mode === 'bossrush' ? S.stage : 0 };
      case 'winMap': return { add: S.win && S.mapId === def.map && S.diffIdx >= (def.minDiff || 0) && campaignLike ? 1 : 0 };
      case 'totalKills': return { abs: Store.data.stats.kills };
      case 'totalWaves': return { abs: Store.data.stats.waves };
    }
    return { add: 0 };
  },
  applyProgress(c, def, S) {
    if (c.st !== 'open') return false;
    const v = this.progressValue(def, S);
    if (v.add) c.prog += v.add; if (v.max != null) c.prog = Math.max(c.prog, v.max); if (v.abs != null) c.prog = v.abs;
    if (c.prog >= def.n) { c.prog = def.n; c.st = 'done'; return true; }
    return false;
  },
  updateChallenges(S) {
    this.ensureChallenges(); const D = Store.data, done = [];
    for (const kind of ['day', 'week']) for (const c of D.ch[kind].list) { const def = this.chDef(kind, c); if (this.applyProgress(c, def, S)) done.push(`${kind === 'day' ? 'Dagelijkse' : 'Wekelijkse'} uitdaging voltooid: ${def.text}`); }
    for (const def of PERM_CHALLENGES) { const c = D.ch.perm[def.id] || (D.ch.perm[def.id] = { prog: 0, st: 'open' }); if (this.applyProgress(c, def, S)) done.push(`Uitdaging voltooid: ${def.name}`); }
    return done;
  },
  claimCh(kind, idx) {
    const D = Store.data; let c, def;
    if (kind === 'perm') { def = PERM_CHALLENGES.find(x => x.id === idx); c = D.ch.perm[idx]; } else { c = D.ch[kind].list[idx]; def = this.chDef(kind, c); }
    if (!c || c.st !== 'done') return null; c.st = 'claimed'; const l = this.grant(def.reward); this.checkAchievements(); Store.save(); return l;
  },

  /* ---------- login ---------- */
  loginClaimable() { return Store.data.login.last !== dayKey(); },
  claimLogin() {
    const D = Store.data; if (!this.loginClaimable()) return null;
    const r = LOGIN_CAL[D.login.day % 28]; D.login.day = (D.login.day + 1) % 28; D.login.last = dayKey(); D.stats.loginDays++;
    const l = this.grant(r); this.checkAchievements(); Store.save(); return l;
  },

  /* ---------- events ---------- */
  activeEvent(now = new Date()) {
    const y = now.getFullYear(), md = (now.getMonth() + 1) * 100 + now.getDate();
    for (const ev of SEASON_EVENTS) {
      if (ev.fallback) continue;
      const f = ev.from[0] * 100 + ev.from[1], t = ev.to[0] * 100 + ev.to[1];
      const inside = f <= t ? (md >= f && md <= t) : (md >= f || md <= t);
      if (!inside) continue;
      const startYear = f <= t || md >= f ? y : y - 1, endYear = f <= t ? y : startYear + 1;
      return { def: ev, inst: `${ev.id}-${startYear}`, ends: new Date(endYear, ev.to[0] - 1, ev.to[1] + 1).getTime() };
    }
    // Superheldenfestival vult de periodes tussen de seizoensevents
    const next = this.nextEvent(now), ev = SEASON_EVENTS.find(e => e.fallback);
    return { def: ev, inst: `${ev.id}-${next ? dayKey(new Date(next.start - 864e5)) : y}`, ends: next ? next.start : now.getTime() + 7 * 864e5 };
  },
  nextEvent(now = new Date()) {
    let best = null;
    for (const ev of SEASON_EVENTS) { if (ev.fallback) continue; for (const yy of [now.getFullYear(), now.getFullYear() + 1]) { const st = new Date(yy, ev.from[0] - 1, ev.from[1]).getTime(); if (st > now.getTime() && (!best || st < best.start)) best = { def: ev, start: st }; } }
    return best;
  },
  evState(ev) { const D = Store.data; return D.ev[ev.inst] || (D.ev[ev.inst] = { cur: 0, s: { plays: 0, wins: 0, bossKills: 0, evKills: 0, hardWins: 0 }, q: {}, bought: [] }); },
  evQuest(ev, q) { const st = this.evState(ev), v = st.s[q.stat] || 0, cl = !!st.q[q.id]; return { v: Math.min(v, q.n), done: v >= q.n, claimed: cl }; },
  claimEvQuest(qid) { const ev = this.activeEvent(), q = EVENT_QUESTS.find(x => x.id === qid), s = this.evQuest(ev, q); if (!s.done || s.claimed) return null; this.evState(ev).q[qid] = true; const l = this.grant({ eventCur: q.reward, tokens: q.tokens || 0 }); Store.save(); return l; },
  buyEvent(itemId) {
    const ev = this.activeEvent(), st = this.evState(ev), it = EVENT_SHOP(ev.def).find(x => x.id === itemId);
    if (!it || st.cur < it.cost || (it.once && this.shopOwned(it, st.bought))) return null;
    st.cur -= it.cost; st.bought.push(it.id); Store.data.stats.eventPurchases++;
    const l = this.grant(it.reward); this.checkAchievements(); Store.save(); return l;
  },
  shopOwned(it, bought) { const D = Store.data; if (it.reward.hero) return !!D.heroes[it.reward.hero]; if (it.reward.skin) return D.skins.includes(it.reward.skin); if (it.reward.title) return D.titles.includes(it.reward.title); return bought.includes(it.id); },

  /* ---------- raids, modi, geheime maps ---------- */
  raidUnlocked(r) { return Progress.clearedAtLeast(r.unlock.map, r.unlock.diff); },
  raidDiffUnlocked(r, di) { if (!this.raidUnlocked(r)) return false; if (di === 0) return true; return (Store.data.raids[r.id] || []).includes(RAID_DIFFS[di - 1].id); },
  raidCleared(r, di) { return (Store.data.raids[r.id] || []).includes(RAID_DIFFS[di].id); },
  buyRaid(id) { const D = Store.data, it = RAID_SHOP.find(x => x.id === id); if (!it || D.raidTokens < it.cost || (it.once && this.shopOwned(it, D.raidShop))) return null; D.raidTokens -= it.cost; D.raidShop.push(id); const l = this.grant(it.reward); this.checkAchievements(); Store.save(); return l; },
  modeUnlocked(u) { return Progress.clearedAtLeast(u.map, u.diff); },
  secretUnlocked(m) {
    const D = Store.data; if (D.secret[m.id]) return true;
    const u = m.unlock; let ok = false;
    if (u.type === 'bosses') ok = D.stats.bossKills >= u.n;
    if (u.type === 'challenge') ok = D.ch.perm[u.id] && D.ch.perm[u.id].st !== 'open';
    if (u.type === 'achievement') ok = !!D.ach[u.id];
    if (ok) { D.secret[m.id] = true; this.note(`Geheime map ontdekt: ${m.name}!`); this.checkAchievements(); Store.save(); }
    return ok;
  },

  /* ---------- prestige ---------- */
  canPrestige() { const D = Store.data; return D.prestige < PRESTIGE.length && D.level >= prestigeReqLevel(D.prestige) && MAPS.slice(0, WORLD1_COUNT).every(m => Progress.clearedAtLeast(m.id, 1)); },
  doPrestige() {
    const D = Store.data; if (!this.canPrestige()) return null;
    const P = PRESTIGE[D.prestige]; D.prestige++;
    D.coins = 400; D.clears = {}; D.best = {}; D.level = 1; D.xp = 0;
    for (const id in D.heroes) D.heroes[id].level = 1;
    const l = this.grant(P.reward); this.checkAchievements(); Store.save(); return l;
  },

  /* ---------- seizoen ---------- */
  season() { const D = Store.data, k = seasonKey(); if (!D.season || D.season.id !== k) D.season = { id: k, wave: 0, endless: 0, bossrush: 0, bosses: 0, damage: 0, fastest: {}, raids: 0, kills: 0, mastery: 0 }; return D.season; },

  /* ---------- einde van een potje ---------- */
  finishMatch(g) {
    const D = Store.data, S0 = D.stats, win = !!g.result.win, mode = g.mode, pm = this.prestigeMult() * this.collMult();
    const wavesCleared = win ? (g.totalWaves === Infinity ? g.cleared : g.totalWaves) : g.cleared;
    const bosses = g.bossKills, ms = g.ms, lines = [], rows = [];
    const brStage = BOSSRUSH.filter(b => ms.bossKillsList.includes(b)).length;
    const diffMult = (DIFF_MULT[g.diffIdx] || 1) * ({ endless: 1.2, raid: 1.6, bossrush: 1.5, coop: 1.2, dungeon: 1.4 }[mode] || 1);
    let coins = 0; const extra = {};
    const campaignLike = ['campaign', 'custom', 'challenge', 'event', 'secret'].includes(mode);
    const eligibleClear = campaignLike && !g.mods.includes('power');
    let firstClear = false;
    if (campaignLike) {
      firstClear = win && eligibleClear && !Progress.cleared(g.map.id, g.diffIdx);
      const R = matchRewards(g.map, g.diffIdx, wavesCleared, bosses, win, firstClear); const mb = modBonus(g.mods);
      for (const r of R.rows) rows.push([r[0], Math.round(r[1] * mb * pm)]);
      if (g.mods.length) rows.push([`Modifiers (${g.mods.length})`, `×${mb.toFixed(2).replace('.', ',')}`]);
      if (win && eligibleClear) { D.clears[g.map.id] = D.clears[g.map.id] || []; if (!D.clears[g.map.id].includes(g.diff.id)) D.clears[g.map.id].push(g.diff.id); }
      const bk = g.map.id + ':' + g.diff.id; D.best[bk] = Math.max(D.best[bk] || 0, wavesCleared);
      if (win) { let gm = (g.map.world === 2 ? 4 : 0) + Math.max(0, g.diffIdx - 1) * 3; if (firstClear) gm += 10 + g.diffIdx * 5 + (g.map.world === 2 ? 10 : 0); if (gm) extra.gems = gm; }
    } else if (mode === 'endless') {
      const w = g.cleared;
      rows.push([`Golven overleefd (${w})`, Math.round(g.map.reward * 0.025 * Math.pow(w, 1.4) * pm)]);
      rows.push([`Bazen verslagen (${bosses})`, Math.round(bosses * g.map.reward * 0.1 * pm)]);
      rows.push([`Schade gedaan (${fmt(ms.dmg)})`, Math.round(Math.sqrt(ms.dmg) * 0.8 * pm)]);
      extra.tokens = Math.floor(w / 15); if (w >= 10) extra.gems = Math.floor(w / 10) * 3;
    } else if (mode === 'bossrush') {
      const st = brStage;
      let c = 0; for (let i = 1; i <= st; i++) c += 220 * i; rows.push([`Bazen verslagen (${st} van ${BOSSRUSH.length})`, Math.round(c * pm)]);
      extra.tokens = Math.floor(st / 2); if (st) extra.gems = st * 2; if (st >= BOSSRUSH.length && S0.bossrushBest < BOSSRUSH.length) extra.tickets = { cosmic: 1 };
    } else if (mode === 'raid') {
      const r = g.raid, rd = g.raidDiff;
      if (win) { rows.push([`${r.name} (${rd.name}) voltooid`, Math.round(900 * rd.reward * pm)]); extra.raidTokens = Math.round(25 * rd.reward); extra.tokens = RAID_DIFFS.indexOf(rd) + 1; extra.gems = 8 * (RAID_DIFFS.indexOf(rd) + 1);
        const cleared = D.raids[r.id] || (D.raids[r.id] = []); if (!cleared.includes(rd.id)) { cleared.push(rd.id); const fc = r.firstClear[rd.id]; if (fc) lines.push('Eerste keer: ' + this.grant(fc).join(', ')); } }
      else { const ph = g.wave ? g.raidPhase(Math.max(1, g.cleared)).idx : 0; rows.push([`Golven gehaald (${g.cleared})`, Math.round(120 * g.cleared * rd.reward * pm)]); extra.raidTokens = Math.round(4 * (ph + g.cleared * 0.5) * rd.reward); }
    } else if (mode === 'coop') {
      rows.push([`Schade aan de wereldbaas (${fmt(g.coopDmg)})`, Math.min(3500, Math.round(g.coopDmg / 15 * pm))]);
      extra.raidTokens = 5 + Math.round(g.coopDmg / 5000);
    } else if (mode === 'dungeon') {
      const dep = g.depth, rooms = win ? DUNGEON.rooms : Math.floor(g.cleared / DUNGEON.wavesPerRoom);
      rows.push([`Kamers veroverd (${rooms} van ${DUNGEON.rooms})`, Math.round(rooms * 260 * (1 + 0.35 * (dep - 1)) * pm)]);
      if (g.relics.length) rows.push([`Relikwieën (${g.relics.length})`, `${g.relics.map(id => RELICS.find(r => r.id === id).name).join(', ')}`]);
      if (win) {
        rows.push([`Kerkerheer verslagen (diepte ${dep})`, Math.round(900 * (1 + 0.4 * (dep - 1)) * pm)]); extra.gems = 10 + dep * 4; extra.tokens = 1 + Math.floor(dep / 3);
        if (dep > (D.dungeon.best || 0)) { D.dungeon.best = dep; const fc = DUNGEON_FIRST[dep]; if (fc) lines.push(`Diepte ${dep} voor het eerst: ` + this.grant(fc).join(', ')); }
        S0.dungeonBest = Math.max(S0.dungeonBest || 0, dep); const se0 = this.season(); se0.dungeon = Math.max(se0.dungeon || 0, dep);
      }
    }
    if (ms.eliteGems) extra.gems = (extra.gems || 0) + ms.eliteGems;
    const drops = win && campaignLike ? this.rollDrops(g) : [];
    for (const dr of drops) lines.push('Speciale drop: ' + this.grant(dr).join(', '));
    for (const r of rows) if (typeof r[1] === 'number') coins += r[1];
    D.coins += coins; S0.earned += coins;
    const xp = Math.round((wavesCleared * 10 * diffMult + bosses * 25 + (win ? 100 : 0) + (mode === 'coop' ? g.coopDmg / 2000 : 0)) * pm);
    lines.push(...this.grant(Object.assign({ xp }, extra)).filter(x => !x.endsWith(' XP')));
    // event-valuta
    const ev = this.activeEvent(); let evCur = 0;
    if (ev && g.wave > 0) {
      const onMap = g.map.id === ev.def.map; evCur = wavesCleared * (onMap ? 3 : 1) + (win && onMap ? 50 : 0) + (mode === 'raid' || mode === 'bossrush' ? 20 : 0);
      const st = this.evState(ev); st.cur += evCur;
      if (onMap) { st.s.plays++; if (win) st.s.wins++; if (win && g.diffIdx >= 2) st.s.hardWins++; }
      st.s.bossKills += ms.evBossKills; st.s.evKills += ms.evKills;
    }
    // statistieken
    S0.games++; if (win && mode !== 'coop') S0.wins++; S0.kills += g.kills; S0.bossKills += bosses; S0.waves += wavesCleared; S0.damage += ms.dmg;
    S0.maxDmg = Math.max(S0.maxDmg, ms.dmg); S0.elites = (S0.elites || 0) + (ms.elites || 0); S0.drops = (S0.drops || 0) + drops.length; S0.upgrades += ms.upgrades; S0.abilities += ms.abilities; S0.highestWave = Math.max(S0.highestWave, g.wave === Infinity ? 0 : (win ? g.wave : g.cleared));
    if (mode === 'endless') S0.endlessBest = Math.max(S0.endlessBest, g.cleared);
    if (mode === 'bossrush') S0.bossrushBest = Math.max(S0.bossrushBest, brStage);
    if (mode === 'raid' && win) { S0.raidsDone++; if (g.raidDiff.id === 'mythic') S0.mythicRaid = true; }
    if (mode === 'coop') S0.coopRuns++;
    if (win && campaignLike) { S0.maxModWin = Math.max(S0.maxModWin, g.mods.length); if (g.diffIdx >= 2 && ms.hpLost === 0) S0.flawlessHard = true; }
    const fastOk = win && campaignLike && MAPS.includes(g.map) && g.diffIdx >= 1 && !g.mods.includes('power');
    if (fastOk) S0.fastest[g.map.id] = Math.min(S0.fastest[g.map.id] || Infinity, Math.round(g.time));
    // seizoen
    const se = this.season();
    se.kills += g.kills; se.bosses += bosses; se.damage = Math.max(se.damage, ms.dmg); se.wave = Math.max(se.wave, win ? wavesCleared : g.cleared);
    if (mode === 'endless') se.endless = Math.max(se.endless, g.cleared); if (mode === 'bossrush') se.bossrush = Math.max(se.bossrush, brStage);
    if (mode === 'raid' && win) se.raids++; if (fastOk) se.fastest[g.map.id] = Math.min(se.fastest[g.map.id] || Infinity, Math.round(g.time));
    // mastery
    const used = Object.keys(ms.heroUse), totalD = used.reduce((a, id) => a + ms.heroUse[id].dmg, 0) || 1, mastery = [];
    for (const id of used) {
      const share = ms.heroUse[id].dmg / totalD * used.length, mx = Math.round((15 + wavesCleared * 3) * diffMult * clamp(0.7 + 0.6 * share, 0.5, 2));
      const before = this.mastery(id).lvl, ups = this.addMastery(id, mx); se.mastery += mx;
      mastery.push({ id, xp: mx, lvl: this.mastery(id).lvl, up: this.mastery(id).lvl > before }); lines.push(...ups);
    }
    // uitdagingen en achievements
    const S = { win, mode, diffIdx: g.diffIdx, mapId: g.map.id, kills: g.kills, waves: wavesCleared, bosses, upgrades: ms.upgrades, abilities: ms.abilities, fastBoss: ms.fastBoss,
      mods: g.mods.length, wave: g.cleared, raidDone: mode === 'raid' && win, stage: mode === 'bossrush' ? brStage : 0,
      rules: { max3: ms.maxPlaced > 0 && ms.maxPlaced <= 3, noLegend: ms.maxPlaced > 0 && ms.maxRar <= 3, lowOnly: ms.maxPlaced > 0 && ms.maxRar <= 1, noUpg: ms.maxPlaced > 0 && ms.maxTier <= 2 } };
    const done = this.updateChallenges(S);
    for (const m of SPECIAL_MAPS) if (m.kind === 'secret') this.secretUnlocked(m);
    this.checkAchievements();
    Store.save();
    Online.submit();
    if (mode === 'coop') Online.submitCoop(g.coopDmg);
    return { rows, coins, xp, lines, mastery, done, evCur, ev, firstClear, drops };
  },
};

/* =====================================================================
   Online: gedeelde ranglijsten en co-op wereldbaas via de db-capability
   ===================================================================== */
const Online = {
  db: null, user: null, uid: null, ready: false, canWrite: true, scores: [], coop: [], names: {}, listeners: [],
  async init() {
    try {
      const C = window.claude; if (!C || !C.use) return;
      const [db, user] = await Promise.all([C.use('db'), C.use('user')]);
      if (!db) return;
      this.db = db; this.user = user; this.uid = user ? await user.id() : null;
      const cw = user ? await user.can('data.write') : null; if (cw === false) this.canWrite = false;
      this.ready = true;
      db.collection('scores').onSnapshot(s => { this.scores = s.docs.filter(d => d.exists).map(d => Object.assign({ id: d.id }, d.data())); this.refreshNames(); this.emit(); }, () => {});
      db.collection('coop').onSnapshot(s => { this.coop = s.docs.filter(d => d.exists).map(d => Object.assign({ id: d.id }, d.data())); this.refreshNames(); this.emit(); }, () => {});
      this.submit(); this.emit();
    } catch (e) { this.ready = false; }
  },
  on(fn) { this.listeners.push(fn); },
  emit() { for (const f of this.listeners) try { f(); } catch (e) { } },
  async refreshNames() {
    if (!this.user) return; const ids = [...new Set(this.scores.map(s => s.id).concat(this.coop.map(c => c.id)))];
    try { const ps = await this.user.profiles(ids); for (const id of ids) this.names[id] = ps[id] ? ps[id].name : ''; this.emit(); } catch (e) { }
  },
  nameOf(id) { return id === this.uid ? 'Jij' : (this.names[id] || 'Speler'); },
  myScore() {
    const D = Store.data, S = D.stats, se = Meta.season();
    const fin = o => { const r = {}; for (const k in o) if (isFinite(o[k])) r[k] = o[k]; return r; };
    return { v: 1, season: se.id, level: D.level, prestige: D.prestige, title: D.title || null, t: Date.now(),
      a: { dungeon: S.dungeonBest || 0, wave: S.highestWave, endless: S.endlessBest, bossrush: S.bossrushBest, bosses: S.bossKills, damage: Math.round(S.maxDmg), fastest: fin(S.fastest), raids: S.raidsDone, kills: S.kills, mastery: S.masteryXp },
      s: { dungeon: se.dungeon || 0, wave: se.wave, endless: se.endless, bossrush: se.bossrush, bosses: se.bosses, damage: Math.round(se.damage), fastest: fin(se.fastest), raids: se.raids, kills: se.kills, mastery: se.mastery } };
  },
  async submit() {
    if (!this.ready || !this.uid || !this.canWrite) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    do { this.again = false; try { await this.db.doc('scores/' + this.uid).set(this.myScore()); } catch (e) { if (e && e.code === 'invalid_argument') this.canWrite = false; } } while (this.again && this.canWrite);
    this.busy = false;
  },
  coopTotal() {
    const wk = weekKey(), D = Store.data;
    let sum = 0, mine = false;
    for (const c of this.coop) if (c.week === wk) { sum += c.dmg || 0; if (c.id === this.uid) mine = true; }
    if (!mine && D.coop.week === wk) sum += D.coop.dmg;
    return sum;
  },
  coopPool() { return Math.max(0, COOP.hp - this.coopTotal()); },
  async submitCoop(dmg) {
    const D = Store.data, wk = weekKey();
    if (D.coop.week !== wk) { D.coop = { week: wk, dmg: 0, runs: 0, claimed: false }; }
    D.coop.dmg += Math.round(dmg); D.coop.runs++; Store.save();
    if (!this.ready || !this.uid || !this.canWrite) return;
    try { await this.db.doc('coop/' + this.uid).set({ week: wk, dmg: D.coop.dmg, runs: D.coop.runs, t: Date.now() }); } catch (e) { if (e && e.code === 'invalid_argument') this.canWrite = false; }
  },
  board(cat, seasonal, mapId) {
    const key = seasonal ? 's' : 'a', se = seasonKey(), C = LB_CATS.find(c => c.id === cat);
    let rows = this.scores.filter(r => r.id !== this.uid && r[key] && (!seasonal || r.season === se)).map(r => { let v = r[key][cat]; if (cat === 'fastest') v = r[key].fastest ? r[key].fastest[mapId] : null; return { id: r.id, v, title: r.title, level: r.level, prestige: r.prestige }; });
    if (this.uid) { const m = this.myScore()[key]; let v = cat === 'fastest' ? m.fastest[mapId] : m[cat]; rows.push({ id: this.uid, v, title: Store.data.title, level: Store.data.level, prestige: Store.data.prestige, local: true }); }
    if (!this.ready) { const m = this.myScore()[key]; rows = [{ id: 'me', v: cat === 'fastest' ? m.fastest[mapId] : m[cat], title: Store.data.title, level: Store.data.level, prestige: Store.data.prestige, me: true }]; }
    rows = rows.filter(r => r.v != null && r.v > 0);
    rows.sort((a, b) => C.asc ? a.v - b.v : b.v - a.v);
    return rows;
  },
};
