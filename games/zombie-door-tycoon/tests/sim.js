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
console.log('sim OK');
