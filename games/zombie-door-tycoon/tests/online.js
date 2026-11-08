/* Online multiplayer over a simulated Supabase Realtime (with and without message loss):
   host + 2 guests, roster, start, claiming by walking, building as a guest, waves in sync, leaving → bot. */
const { loadGame, ok } = require('./helpers');
const { makeBus } = require('./fakesupa');
async function run(drop) {
  console.log('Zombie Door Tycoon — online (' + Math.round(drop * 100) + '% loss)');
  const bus = makeBus({ drop });
  const mk = (name) => { const b = loadGame({ online: true, window: { supabase: bus.supabase } }); b.G.MP.hooks.myInfo = () => ({ name, loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'], stars: {} }); b.evs = {}; b.G.FX.hooks = new Proxy({}, { get: (o, k) => () => { b.evs[k] = (b.evs[k] || 0) + 1; } }); return b; };
  const A = mk('Host'), B = mk('Gast'), C = mk('Derde'), all = [A, B, C];
  const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.resolve(); bus.flush(); all.forEach((b) => b.run()); await new Promise((r) => setImmediate(r)); bus.flush(); } };
  let code; A.G.MP.host().then((c) => { code = c; }); await settle();
  ok(/^[A-Z0-9]{5}$/.test(code), 'host made room ' + code);
  let list; B.G.MP.watchLobby((l) => { list = l; }); await settle();
  ok(list && list.some((r) => r.code === code), 'room listed in the public lobby');
  B.G.MP.join(code); C.G.MP.join(code); await settle();
  for (let i = 0; i < 12; i++) { A.G.MP.hostLobbyTick(0.5); all.forEach((b) => b.beat()); await settle(); }
  ok(A.G.MP.roster.length === 3 && B.G.MP.roster.length === 3, 'roster of 3 on host and guest');
  const bots = (diff, n) => Array.from({ length: n }, (_, k) => ({ name: 'Bot' + k, isBot: true, style: 'balanced', loadout: A.G.botLoadout(Math.random, 0.3), stars: {} }));
  A.G.MP.setSettings('city', 'easy');
  const hm = A.G.MP.startMatch(bots); await settle();
  for (let q = 0; q < 6 && !(B.G.MP.match && C.G.MP.match); q++) { A.G.MP.hostTick(3.1, 1); await settle(); }
  ok(B.G.MP.match && C.G.MP.match && B.G.MP.match.mid === hm.mid, 'guests received the match');
  ok(hm.players.filter((p) => p.isBot).length === 5, '3 humans + 5 bots');
  const bm = B.G.MP.match, bp = B.G.MP.myPid;
  B.G.MP.clientSend({ type: 'goto', room: 7 }); C.G.MP.clientSend({ type: 'goto', room: 0 });
  const TICK = A.G.TICK;
  const frame = async (n) => { for (let f = 0; f < n; f++) { hm.update(TICK); A.G.MP.hostTick(TICK, 1); B.G.MP.clientTick(TICK); C.G.MP.clientTick(TICK); if (f % 3 === 0) await settle(); if (f % 60 === 0) all.forEach((b) => b.beat()); } await settle(); };
  await frame(30 * 14);
  ok(hm.players[bp].room === 7 && bm.players[bp].room === 7, 'guest claimed room 7 by walking in');
  await frame(30 * 14);
  const room = bm.rooms[7], slot = room.def.slots.filter((s) => !room.tile[s.x + ',' + s.y])[0];
  ok(B.G.MP.clientSend({ type: 'place', item: 'pistol', x: slot.x, y: slot.y }).ok, 'guest sends a build command');
  await frame(30 * 3);
  ok(hm.rooms[7].towers.some((t) => t.item.id === 'pistol') && bm.rooms[7].towers.some((t) => t.item.id === 'pistol'), 'tower exists on host and guest');
  const other = hm.rooms[0].def.slots[3];
  ok(!B.G.MP.clientSend({ type: 'place', item: 'pistol', x: other.x, y: other.y }).ok, 'guest cannot build in another room');
  B.G.MP.clientSend({ type: 'door' }); await frame(30 * 3);
  ok(hm.rooms[7].door.lvl === 1 && bm.rooms[7].door.lvl === 1, 'door upgrade went through');
  await frame(30 * 70);
  const hz = hm.rooms.reduce((a, r) => a + r.zombies.length, 0), bz = bm.rooms.reduce((a, r) => a + r.zombies.length, 0);
  ok(hm.wave >= 2 && bm.wave === hm.wave, 'waves in sync (' + hm.wave + ')');
  ok(Math.abs(hz - bz) <= Math.max(8, hz * 0.3), 'zombies in sync (host ' + hz + ', guest ' + bz + ')');
  ok((B.evs.wave || 0) >= 1, 'guest got the wave banners');
  B.G.MP.leave(); await frame(10); if (!hm.players[bp].left) await frame(30 * 20);
  ok(hm.players[bp].left && hm.players[bp].isBot, 'a bot takes over when a guest leaves');
  ok(bus.stats.maxBytes < 200000, 'largest message ' + Math.round(bus.stats.maxBytes / 1024) + ' kB');
}
(async () => { await run(0); await run(0.15); console.log('online OK'); })().catch((e) => { console.error(e); process.exit(1); });
