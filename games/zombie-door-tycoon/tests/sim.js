/* Rules & balance checks on the built game (no DOM). */
const { loadGame, ok } = require('./helpers');
const { G } = loadGame();
console.log('Zombie Door Tycoon — sim');
ok(G.ITEMS.length >= 30, G.ITEMS.length + ' unique items');
ok(G.RARITIES.every((r) => G.itemsByRarity(r.id).length > 0), 'every rarity has items');
ok(Object.keys(G.BOSSES).length >= 10, Object.keys(G.BOSSES).length + ' bosses');
ok(Object.keys(G.ZOMBIES).length >= 10, Object.keys(G.ZOMBIES).length + ' zombie types');
ok(G.ROOMS.length === 8 && G.ROOMS.every((r) => r.slotCount === 30), '8 rooms with 30 build tiles each');
ok(G.ROOMS.every((r) => r.routes.length === G.GATES.length && r.useRoutes.length > 0), 'every room is reachable from every gate');
const lens = G.ROOMS.map((r) => r.pathLen / G.T);
ok(Math.max(...lens) / Math.min(...lens) < 1.35, 'rooms have similar walking distances (' + lens.map((l) => l.toFixed(0)).join(',') + ')');
// summon odds
['normal', 'premium'].forEach((b) => {
  const o = G.summonOdds(b), sum = Object.values(o).reduce((a, x) => a + x, 0);
  ok(Math.abs(sum - 100) < 1e-6, b + ' odds add up to 100%');
  ok(o.mythic < 5 && o.secret < 1, b + ' never guarantees Mythic/Secret');
});
ok(G.summonOdds('premium').epic === G.summonOdds('normal').epic * 3, 'premium has 3x luck');
const c = {}; for (let i = 0; i < 100000; i++) { const r = G.Profile.rollRarity('normal'); c[r] = (c[r] || 0) + 1; }
ok(Math.abs(c.common / 1000 - G.summonOdds('normal').common) < 1.2, 'rolled odds match the table');
// door upgrades: exponential, infinite
ok(G.doorUpgradeCost(10) > G.doorUpgradeCost(9) * 1.5 && G.doorMaxHp(40) > G.doorMaxHp(39), 'door upgrades get exponentially more expensive');
// a whole Easy match, only bots, starter loadouts
const players = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ name: 'b' + i, isBot: true, style: ['balanced', 'economy', 'defensive', 'aggressive'][i % 4], loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'] }));
const m = new G.Match({ mapId: 'city', diffId: 'easy', players, seed: 7 });
m.bots = players.map((p, i) => new G.Bot(m, i));
let bossSeen = false;
while (m.phase !== 'over' && m.elapsed < 1500) { m.update(G.TICK); if (!bossSeen && m.rooms.some((r) => r.zombies.some((z) => z.isBoss))) bossSeen = true; }
ok(m.phase === 'over', 'easy match finished (wave ' + m.wave + ')');
ok(bossSeen, 'a boss appeared');
const winners = m.players.filter((p) => p.finished && p.alive).length;
ok(winners >= 4, winners + '/8 bots survived Easy with starter towers');
ok(m.players.every((p) => p.room >= 0), 'every bot claimed a room');

// ---- 2.2: rarity power, Godly, removed towers, sorted index ----
ok(G.RARITIES.length === 7 && G.RARITIES[6].id === 'godly' && G.itemsByRarity('godly').length >= 4, 'Godly rarity with ' + G.itemsByRarity('godly').length + ' towers');
ok(G.RARITIES.every((r, i) => !i || r.power > G.RARITIES[i - 1].power), 'every rarity is clearly stronger (' + G.RARITIES.map((r) => r.power).join(' < ') + ')');
['normal', 'premium'].forEach((b) => { const o = G.summonOdds(b); ok(o.godly > 0 && o.godly < o.secret, b + ': Godly ' + o.godly.toFixed(2) + '% (rarer than Secret)'); });
ok(Object.keys(G.REMOVED_ITEMS).every((id) => !G.ITEM[id]), Object.keys(G.REMOVED_ITEMS).length + ' non-unique towers removed');
ok(G.ITEMS.every((it, i) => !i || G.RAR[it.rarity].index >= G.RAR[G.ITEMS[i - 1].rarity].index), 'index sorted by rarity');
(function () {
  const pl = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ name: 'g' + i, isBot: true, loadout: ['pistol', 'archangel', 'omegatitan', 'singularity', 'midas'] }));
  const g = new G.Match({ mapId: 'city', diffId: 'easy', players: pl, seed: 5 });
  g.claim(g.players[0], 1); const r = g.rooms[1]; g.phase = 'prep'; g.players[0].cash = 1e6; g.players.forEach((p) => { p.isBot = false; });
  const s2 = r.def.slots.filter((q) => !r.tile[q.x + ',' + q.y]);
  ['pistol', 'archangel', 'omegatitan', 'singularity', 'midas'].forEach((id, k) => g.addTower(r, G.ITEM[id], s2[k].x, s2[k].y, 0));
  const pist = r.towers.filter((t) => t.item.id === 'pistol')[0], ang = r.towers.filter((t) => t.item.id === 'archangel')[0];
  ok(g.stats(ang, r).dmg / G.ITEM.archangel.dmg > g.stats(pist, r).dmg / G.ITEM.pistol.dmg * 2.5, 'Godly towers get x' + G.RAR.godly.power + ' damage from their rarity');
  g.players.slice(1).forEach((p) => { p.alive = false; });
  g.claimTimer = 0; g.prepTimer = 0.01;
  while (g.wave < 4 && g.elapsed < 300) g.update(G.TICK);
  ['archangel', 'omegatitan', 'singularity'].forEach((id) => { const t = r.towers.filter((q) => q.item.id === id)[0]; ok(t.dmgDealt > 0, id + ' deals damage (' + Math.round(t.dmgDealt) + ')'); });
  ok(r.towers.filter((q) => q.item.id === 'midas')[0].earned > 0, 'Midas Throne earns money');
})();
// ---- 2.0: new towers, evolutions, quick upgrades, kill money, rewards, mastery, missions, duo ----
ok(G.ITEMS.length >= 60, G.ITEMS.length + ' towers');
ok(Object.keys(G.EVO).length >= 10 && Object.keys(G.EVO).every((id) => G.EVO[id].length === 2), 'evolution lines with 2 stages');
ok(G.ZOMBIES.normal.reward === 5 && G.ZOMBIES.fast.reward === 7 && G.ZOMBIES.armored.reward === 15 && G.ZOMBIES.poisonz.reward === 12 && G.ZOMBIES.giant.reward === 50, 'kill money per zombie type');
(function () {
  const pl = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ name: 'p' + i, isBot: i > 1, loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'], duoWith: i === 1 ? 0 : undefined }));
  pl[1].isBot = true;
  const d = new G.Match({ mapId: 'city', diffId: 'easy', players: pl, seed: 3, duo: true });
  d.claim(d.players[0], 2); d.claim(d.players[1], 2);
  const r = d.rooms[2];
  ok(r.owner === 0 && r.partner === 1 && d.players[1].room === 2, 'duo: buddy joins your room');
  d.players[0].cash = 10000;
  ok(d.players[1].cash === 10000, 'duo: one shared wallet');
  d.phase = 'prep';
  [0, 1].forEach((i) => { const p = d.players[i]; p.pos.x = r.def.center.x; p.pos.y = r.def.center.y; });
  const s = r.def.slots.filter((q) => !r.tile[q.x + ',' + q.y]);
  const a = d.command(0, { type: 'place', item: 'pistol', x: s[0].x, y: s[0].y }).tower;
  const b = d.command(1, { type: 'place', item: 'scout', x: s[1].x, y: s[1].y }).tower;
  ok(a && b && a.by === 0 && b.by === 1, 'duo: both players place their own towers');
  ok(d.command(1, { type: 'upgradeTower', tower: a.id }).ok && d.towerLevel(a) === 1, 'duo: partner upgrades your tower');
  const lv0 = Object.assign({}, a.lvl), lc = d.upgradeCost(a);
  ok(d.command(0, { type: 'upgradeTower', tower: a.id }).ok && d.towerLevel(a) === 2 && Object.keys(a.lvl).filter((k) => a.lvl[k] > lv0[k]).length >= 2, 'one upgrade level improves several stats (' + G.pathText(a.item, a.item.path[1]) + ', $' + lc + ')');
  ok(G.ITEMS.every((it) => it.path.length === G.UPGRADE_LEVELS && it.tracks.every((t) => it.path.reduce((s, p) => s + (p[t] || 0), 0) === G.MAX_TRACK_LEVEL)), 'every tower: ' + G.UPGRADE_LEVELS + ' levels, all stats maxed at the end');
  ok(G.ITEMS.filter((it) => it.tracks.length >= 2).every((it) => it.path.every((p) => Object.keys(p).length >= 2)), 'towers with several stats upgrade a mix every level');
  ok(d.command(0, { type: 'upgradeAll' }).ok, 'upgrade all');
  d.command(0, { type: 'auto', tower: a.id, on: true }); d.command(0, { type: 'prio', tower: a.id, on: true });
  ok(a.auto && a.prio, 'auto + priority toggles');
  const before = d.towerLevel(a); d.autoUpgrade(r);
  ok(d.towerLevel(a) > before, 'auto upgrade buys levels');
  d.players[0].cash = 1e6; while (d.towerLevel(a) < 6) d.command(0, { type: 'upgradeTower', tower: a.id });
  ok(d.command(0, { type: 'evolve', tower: a.id }).ok && a.evo === 1, 'evolution: Pistol → ' + G.EVO.pistol[0].name);
  ok(G.towerTier(a) >= 6, 'visual tier follows upgrades (' + G.towerTier(a) + ')');
  // kill money goes to the player who placed the tower
  const z = d.spawnZombie(r, 'normal'); const k0 = d.players[1].stats.killMoney, k0o = d.players[0].stats.killMoney;
  d.kill(r, z, b);
  ok(z.reward >= 5 && d.players[1].stats.killMoney - k0 === Math.round(z.reward) && d.players[0].stats.killMoney === k0o && d.players[1].stats.kills === 1, 'kill money ($' + z.reward + ') credited to the placer');
  d.kill(r, z, b);
  ok(d.players[1].stats.kills === 1, 'no double reward for one kill');
})();
// rewards: Easy win = 10x Normal Summon price (x map), Medium 30x, Hard 80x
(function () {
  const P = G.Profile; P.d = null; P.load();
  const fake = (diff, win, extra) => {
    const pl = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ name: 'x' + i, isBot: i > 0, loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'] }));
    const mm = new G.Match({ mapId: 'city', diffId: diff, players: pl, seed: 1 });
    const p = mm.players[0]; p.finished = win; p.stats.waveReached = win ? mm.diff.waves : 3; p.stats.doorDamage = 50; Object.assign(p.stats, extra || {});
    mm.players.forEach((q, i) => { if (i) { q.alive = false; q.stats.waveReached = 1; } });
    return P.rewards(mm, 0);
  };
  const price = G.SUMMON.normal.cost;
  const comp = (r) => r.lines.filter((l) => l.cat === 'completion')[0].coins;
  ok(comp(fake('easy', true)) === 10 * price && comp(fake('medium', true)) === 30 * price && comp(fake('hard', true)) === 80 * price, 'win rewards 10x / 30x / 80x the summon price');
  const lose = fake('hard', false); ok(comp(lose) < 80 * price * 0.1, 'early defeat gives only a small part');
  const bo = fake('medium', true, { bosses: 4, kills: 900 }); ok(bo.lines.some((l) => l.cat === 'bosses') && bo.lines.some((l) => l.cat === 'kills') && bo.lines.some((l) => l.cat === 'waves'), 'boss, kill and 10-wave bonuses');
  // mastery
  const pl = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ name: 'm' + i, isBot: i > 0, loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'] }));
  const mm = new G.Match({ mapId: 'city', diffId: 'easy', players: pl, seed: 1 });
  mm.players[0].mast.pistol = [200, 50000, 2];
  const res = P.addMastery(mm, 0, true);
  ok(res.length === 1 && res[0].xp > 400 && P.d.mastery.pistol.lvl > 1, 'mastery XP from kills/damage/bosses (Lv ' + P.d.mastery.pistol.lvl + ')');
  ok(!P.equip('pistol', 'skin', 'prism') && P.equip('pistol', 'kill', 'sparks') !== undefined, 'locked cosmetics cannot be equipped');
  // daily missions
  const ms = P.missions();
  ok(ms.length === 4 && ms.every((m) => m.goal > 0 && m.reward), '4 daily missions');
  P.missionAdd(ms[0].stat, 1e9); const cl = P.claimMission(0);
  ok(cl && ms[0].claimed && !P.claimMission(0), 'claim a mission once');
  ['firstwin', 'kills1000', 'boss100', 'rich', 'collect25', 'secret', 'endless100', 'build100'].forEach((id) => { if (!G.ACHIEVEMENTS.some((a) => a.id === id)) throw new Error('missing achievement ' + id); });
  ok(G.ACHIEVEMENTS.every((a) => a.icon && a.goal && a.reward), G.ACHIEVEMENTS.length + ' achievements with icon, progress and reward');
})();
console.log('sim OK');
