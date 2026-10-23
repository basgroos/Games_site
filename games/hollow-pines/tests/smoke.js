/* Hollow Pines smoke test: full bot-only matches (every character is AI) and the creature's attacks.
   Runs the real game code from src/ in Node (no rendering); with HW_FILE set it also checks that the
   built page contains that code. */
const { load } = require('./lib');
const HG = load();
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ✔ ' : '  ✖ ') + msg); if (!c) failed++; };
const world = new HG.World(); world.build();

console.log('Bot-only matches');
for (const [mode, diff, seed] of [['survivor', 'normal', 1000], ['survivor', 'hard', 1077], ['monster', 'normal', 1154]]) {
  const sim = new HG.Sim(world, { mode, difficulty: diff, length: 'normal', seed, allBots: true, weather: 'rain' });
  let n = 0;
  while (!sim.over && n++ < 30 * 60 * 25) { sim.update(1 / 30); sim.events.length = 0; }
  const r = sim.result || {};
  ok(sim.over && !r.timeout && r.tasksDone >= 1, `${mode}/${diff}: match ends (${r.escaped} escaped, ${r.caught} taken, ${r.tasksDone}/${r.tasksTotal} objectives, ${(r.time / 60).toFixed(1)} min)`);
}

console.log('The creature\'s attacks');
function setup() {
  const sim = new HG.Sim(world, { mode: 'survivor', difficulty: 'normal', length: 'normal', seed: 5 });
  const p = sim.player, m = sim.monster; m.ai = null; m.isPlayer = true;
  for (const s of sim.survivors) if (s !== p) { s.ai = null; s.x = 100; s.z = 100; }
  p.x = 61; p.z = 80; p.level = 0; m.x = 61; m.z = 81.2; m.level = 0; m.yaw = 0;
  return { sim, p, m };
}
const run = (sim, sec, each) => { for (let i = 0; i < sec * 60; i++) { if (each) each(i); sim.update(1 / 60); } };
{ const { sim, p, m } = setup(); m.ctrl.grab = true; run(sim, 0.4); ok(p.grabbedBy === m, 'grab seizes a survivor');
  run(sim, 3.5, i => { if (i % 12 === 0) sim.struggle(p); }); ok(p.alive && !p.grabbedBy && p.health === 1, 'mashing breaks free, wounded'); }
{ const { sim, p, m } = setup(); m.ctrl.grab = true; run(sim, 4); ok(!p.alive && p.deathHow === 'grab', 'not fighting back is fatal'); }
{ const { sim, p, m } = setup(); m.z = 86; m.ctrl.pounce = true; run(sim, 1.4); ok(p.health === 1, 'a pounce from 6 m wounds'); }
{ const { sim, p, m } = setup(); p.x = 70; m.z = 86; m.ctrl.pounce = true; run(sim, 1.15); ok(m.stumbleT > 0 && p.health === 2, 'a missed pounce makes it stumble'); }

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nHollow Pines smoke test passed');
