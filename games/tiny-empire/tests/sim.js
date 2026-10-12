/* Headless simulation test: a simple "bot" plays Tiny Empire for N game
   minutes using the real game systems, then prints how the city grew.
   Run:  node tests/sim.js [minutes] [seed]                         */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = {};
const ctx = { console, Math, Date, JSON, Object, Array, Uint8Array, Float32Array, isNaN, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary'), escape, unescape, encodeURIComponent, decodeURIComponent,
  localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
["config","game","combos","transport","water","districts","citizens","economy","progression","events","sim","save"].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
});
const TE = ctx.TE; globalThis.__TE = TE;
const minutes = +(process.argv[2] || 30);
const seed = +(process.argv[3] || 42);

let fails = 0;
function assert(c, msg) { if (!c) { fails++; console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); }

console.log('Unit checks');
{
  const S = TE.Game.newState(7); TE.Sim.init(S);
  assert(S.money === 1000, 'starts with $1,000');
  assert(TE.Game.count(S, 'townhall') === 1 && TE.Game.count(S, 'road') === 15, 'town hall + starter roads');
  const r1 = TE.Game.place(S, 'house', 10, 10);
  assert(r1.ok, 'can place a house on owned empty land');
  assert(!TE.Game.place(S, 'house', 10, 10).ok, 'cannot place on occupied tile');
  assert(!TE.Game.place(S, 'house', 0, 0).ok, 'cannot place on unowned land');
  assert(!TE.Game.place(S, 'office', 9, 10).ok, 'locked buildings cannot be placed');
  TE.Sim.ensure(S);
  const pv = TE.Economy.preview(S, 'bakery', 10, 9);
  assert(pv && pv.bonuses.some((b) => b.label === 'Hungry neighbors'), 'bakery next to house previews a synergy');
  const u = TE.Game.undo(S);
  assert(u.ok && TE.Game.count(S, 'house') === 0 && S.money === 1000, 'undo refunds placement');
  // Combo: coffee + bakery + park
  TE.Game.place(S, 'coffee', 10, 10); TE.Game.place(S, 'bakery', 10, 11); TE.Game.place(S, 'park', 9, 10);
  TE.Sim.step(S, 1.0);
  assert(S.discovered.morning_ritual, 'Morning Ritual combo discovered');
  assert(S.notes.some((n) => n.kind === 'discovery'), 'discovery notification queued');
  const before = S.money; TE.Sim.step(S, 10);
  assert(S.money > before, 'money increases over time');
  const b = TE.Game.buildingAt(S, 10, 11);
  const up = TE.Game.upgrade(S, b);
  assert(up.ok && b.level === 2, 'upgrade to level 2');
  const mv = TE.Game.move(S, b, 9, 9);
  assert(mv.ok && TE.Game.buildingAt(S, 9, 9) === b, 'relocate building');
  const dm = TE.Game.demolish(S, b);
  assert(dm.ok && dm.refund > 0, 'demolish refunds half');
  // Save round-trip
  const code = TE.Save.exportCode(S);
  const S2 = TE.Save.importCode(code); TE.Sim.init(S2);
  assert(Object.keys(S2.buildings).length === Object.keys(S.buildings).length && Math.abs(S2.money - S.money) < 1, 'save/load round trip');
  // Land
  S.money = 5000;
  const lc = TE.Game.buyChunk(S, 1, 2);
  assert(lc.ok && TE.Game.isOwned(S, 4, 8), 'buy land expansion');
  // Needs
  TE.Sim.ensure(S);
  const nd = TE.Citizens.needsAt(S, S.R, 10 * S.size + 13);
  assert(nd.safety >= 0 && nd.happiness >= 0 && nd.happiness <= 100, 'needs computed in range');
}

console.log('\nLiving-city checks');
{
  const S = TE.Game.newState(11); TE.Sim.init(S);
  const n = S.size;
  assert(S.river.length >= n * 2 - 2, 'a river crosses the map');
  const ri = S.river.find((i) => ((i / n) | 0) === 12);
  const rx = ri % n, ry = 12;
  // own the land around the river at row 12
  S.money = 1e6;
  const [cx, cy] = TE.Game.chunkOf(rx, ry); S.chunks[cy * TE.Game.chunkCount(S) + cx] = 1;
  const [cx2] = TE.Game.chunkOf(rx + 2, ry); S.chunks[cy * TE.Game.chunkCount(S) + cx2] = 1;
  assert(!TE.Game.place(S, 'house', rx, ry).ok, 'cannot build a house on the river');
  assert(TE.Game.canPlace(S, 'bridge', 15, 12).ok === false, 'bridges only go on water');
  // road from the starter crossroads (ends at x=15) to the river, then bridges across
  for (let x = 16; x < n; x++) {
    const t = S.tiles[ry * n + x];
    if (t.b) continue;
    t.f = null;
    const r = TE.Game.place(S, t.water ? 'bridge' : 'road', x, ry);
    if (!r.ok) { console.log('   place failed at', x, r.reason); break; }
    if (x > rx + 3) break;
  }
  TE.Sim.ensure(S);
  assert(S.R.roadConn[ry * n + rx + 3] === 1, 'road bridge connects the far bank to the Town Hall');
  // police coverage blocked by water without a bridge
  const yb = 4; const rb = S.river.find((i) => ((i / n) | 0) === yb) % n;
  const reachNoBridge = TE.Citizens.reach(S, S.R, rb - 1, yb, 5, 'road');
  assert(!reachNoBridge.has(yb * n + rb + 2), 'emergency travel cannot cross the river without a bridge');
  const reachBridge = TE.Citizens.reach(S, S.R, rx - 1, ry, 5, 'road');
  assert(reachBridge.has(ry * n + rx + 2), 'emergency travel crosses on a road bridge');
  // traffic: lots of offices on one street jam it
  S.level = 5; TE.Progress.checkUnlocks(S, true);
  for (let x = 9; x <= 14; x++) { const t = S.tiles[11 * n + x]; if (!t.b) { t.f = null; TE.Game._put(S, 'skyscraper', x, 11); } }
  TE.Sim.ensure(S);
  const st = S.R.trafficStats;
  assert(st.jammed > 0, 'six skyscrapers on one street cause jams (' + st.jammed + ' jammed)');
  const sk = TE.Game.buildingAt(S, 10, 11);
  assert(S.R.b[sk.uid].bonuses.some((b) => b.label === 'Traffic jams outside'), 'jams cut business income');
  assert(S.R.parking[sk.uid] && S.R.parking[sk.uid].ratio < 0.9, 'skyscrapers lack parking');
  const jamBefore = st.jammed;
  for (let x = 9; x <= 15; x++) { const b = TE.Game.buildingAt(S, x, 12); if (b && b.type === 'road') TE.Game.convertRoad(S, b, 'avenue'); }
  TE.Sim.ensure(S);
  assert(S.R.trafficStats.jammed < jamBefore, 'upgrading streets to avenues reduces jams');
  TE.Game._put(S, 'trainstation', 13, 13); TE.Sim.ensure(S);
  assert(S.R.transitCut[11 * n + 10] >= 0.4, 'train station cuts car trips nearby');
  // power
  assert(S.R.power.short, 'skyscrapers exceed the Town Hall power supply');
  TE.Game._put(S, 'powerplant', 9, 14); TE.Sim.ensure(S);
  assert(S.R.power.supply >= 180, 'power plant adds supply');
  // river pollution from a factory on the bank
  const fy = 3, fx = S.river.find((i) => ((i / n) | 0) === fy) % n - 1;
  TE.Game.tile(S, fx, fy).f = null; TE.Game._put(S, 'factory', fx, fy); TE.Sim.ensure(S);
  const down = S.river.find((i) => ((i / n) | 0) === fy + 4);
  assert(S.R.riverPol[down] > 5, 'factory pollution flows downstream (' + S.R.riverPol[down].toFixed(1) + ')');
  // flood
  const fzB = []; TE.Game.eachBuilding(S, (b) => { if (S.R.floodZone[b.y * n + b.x] && !TE.BUILDINGS[b.type].road) fzB.push(b); });
  const victims = TE.Water.floodVictims(S, S.R);
  assert(victims.length >= 1, 'buildings next to the river are at flood risk');
  const v = victims[0];
  const shore = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]].map(([dx, dy]) => [v.x + dx, v.y + dy]).find(([x, y]) => TE.Game.inBounds(S, x, y) && !TE.Game.buildingAt(S, x, y) && !S.tiles[y * n + x].water && TE.Game.nearWater(S, x, y));
  if (shore) { S.tiles[shore[1] * n + shore[0]].f = null; TE.Game._put(S, 'floodbarrier', shore[0], shore[1]); TE.Sim.ensure(S); }
  assert(shore && TE.Water.floodVictims(S, S.R).indexOf(v) < 0, 'a flood barrier protects the bank');
  TE.Events.start(S, 'flood'); S.event.end = S.time; TE.Events.tick(S);
  assert(!S.event, 'flood event resolves');
  // districts & rotation
  TE.Sim.ensure(S);
  const d = TE.Districts.at(S, S.R, 10, 11);
  assert(d && d.type === 'downtown', 'skyscraper block becomes Downtown (' + (d && d.type) + ')');
  S.tiles[13 * n + 11].f = null; const h = TE.Game.place(S, 'house', 11, 13).building;
  assert(h && h.rot === 1, 'buildings face the street automatically (rot ' + (h && h.rot) + ')');
  // combos with water
  assert(TE.COMBOS.length >= 20, TE.COMBOS.length + ' combinations defined');
  // every building has a drawing-independent definition with costs
  const bad = Object.keys(TE.BUILDINGS).filter((k) => { const b = TE.BUILDINGS[k]; return b.cost == null || !b.desc || !b.icon; });
{
  const Sb = TE.Game.newState(11); TE.Sim.init(Sb);
  let spot = null; for (let y = 8; y < 16 && !spot; y++) for (let x = 8; x < 16 && !spot; x++) { const t = Sb.tiles[y * Sb.size + x]; if (!t.b && !t.water && TE.Game.isOwned(Sb, x, y)) { t.f = null; spot = [x, y]; } }
  const hb = TE.Game.place(Sb, 'house', spot[0], spot[1]);
  let bspot = null; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = spot[0] + dx, y = spot[1] + dy, t = Sb.tiles[y * Sb.size + x]; if (!bspot && t && !t.b && !t.water && TE.Game.isOwned(Sb, x, y)) { t.f = null; bspot = [x, y]; } }
  TE.Sim.ensure(Sb); const recBefore = Sb.R.b[hb.building.uid].needs.recreation;
  const br = TE.Game.place(Sb, 'bench', bspot[0], bspot[1]); TE.Sim.ensure(Sb);
  assert(br.ok && Sb.R.b[hb.building.uid].needs.recreation > recBefore, `a bench raises recreation for the home next to it (${recBefore.toFixed(0)} → ${Sb.R.b[hb.building.uid].needs.recreation.toFixed(0)})`);
}
  assert(!bad.length, 'every building has cost, icon and description' + (bad.length ? ': ' + bad : ''));
}

console.log(`\nBot playthrough: ${minutes} game minutes (seed ${seed})`);
const S = TE.Game.newState(seed); TE.Sim.init(S);
let nextAct = 0;
const timeline = [];
let lastLevel = 1;
const N = S.size;
function emptyTiles() {
  const out = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = S.tiles[y * N + x];
    if (!t.b && !t.f && TE.Game.isOwned(S, x, y)) out.push([x, y]);
  }
  return out;
}
function act() {
  TE.Sim.ensure(S);
  // Upgrade/perk if cheap compared to cash
  // Try placements
  const types = Object.keys(TE.BUILDINGS).filter((t) => TE.Game.isUnlocked(S, t) && t !== 'road' && TE.Game.costOf(S, t) <= S.money);
  const tiles = emptyTiles();
  let best = null;
  for (let k = 0; k < 40 && tiles.length; k++) {
    const [x, y] = tiles[Math.floor(Math.random() * tiles.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    if (!type) break;
    const pv = TE.Economy.preview(S, type, x, y);
    if (!pv) continue;
    const cost = TE.Game.costOf(S, type);
    const score = (pv.netDelta + pv.happinessDelta * 0.3 + (pv.newCombos.length ? 3 : 0)) / cost;
    if (!best || score > best.score) best = { score, type, x, y };
  }
  if (best && best.score > 0) TE.Game.place(S, best.type, best.x, best.y);
  // Upgrades
  TE.Game.eachBuilding(S, (b) => {
    const c = TE.Game.upgradeCost(S, b);
    if (c != null && c < S.money * 0.3 && TE.BUILDINGS[b.type].income) TE.Game.upgrade(S, b);
  });
  // Expand when land is getting full
  if (tiles.length < 10) {
    const cc = TE.Game.chunkCount(S);
    for (let cy = 0; cy < cc; cy++) for (let cx = 0; cx < cc; cx++) {
      const st = TE.Game.chunkStatus(S, cx, cy);
      if (st.ok) { TE.Game.buyChunk(S, cx, cy); return; }
    }
  }
}
const t0 = Date.now();
for (let s = 0; s < minutes * 60; s += 0.5) {
  TE.Sim.step(S, 0.5);
  if (S.time >= nextAct) { act(); nextAct = S.time + (+process.env.ACT || 4); }
  if (S.level !== lastLevel) { timeline.push(`  ${(S.time / 60).toFixed(1)} min → Level ${S.level} (${TE.LEVELS[S.level - 1].name})`); lastLevel = S.level; }
  if (Math.round(S.time) % 300 === 0 && Math.abs(S.time - Math.round(S.time)) < 0.01) {
    const T = S.R.totals;
    console.log(`  t=${(S.time / 60).toFixed(0)}m  $${S.money.toFixed(0)}  net $${T.net.toFixed(1)}/s  pop ${T.population.toFixed(0)}  happy ${T.happiness.toFixed(0)}  safe ${T.safety.toFixed(0)}  pol ${T.pollution.toFixed(0)}  bldgs ${Object.keys(S.buildings).length}  combos ${Object.keys(S.discovered).length}  land+${S.expansions}`);
  }
}
globalThis.__S = S;
console.log(timeline.join('\n') || '  (no level-ups)');
console.log(`  quests done: ${Object.keys(S.questsDone).length}, events: ${S.eventLog.length}, fires contained: ${S.stats.firesContained}`);
console.log(`  discovered: ${Object.keys(S.discovered).join(', ')}`);
console.log(`  sim speed: ${((minutes * 60) / ((Date.now() - t0) / 1000)).toFixed(0)}x realtime`);
assert(Number.isFinite(S.money) && S.money >= 0, 'money stays finite and non-negative');
assert(S.level >= 2, 'bot reaches at least level 2');
console.log(fails ? `\n${fails} FAILED` : '\nAll checks passed');
process.exit(fails ? 1 : 0);
