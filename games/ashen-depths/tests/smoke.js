/* Ashen Depths smoke test: boots the built game in jsdom and plays every class,
   all ten bosses, the shop, events, inventory and the end of a run. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'ashen-depths', 'index.html'), 'utf8');

function makeCtx(cv) {
  const grad = { addColorStop() {} };
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/games/ashen-depths/',
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx(this)); };
    w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
    w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
  } });
const w = dom.window, E = s => w.eval(s);
const errors = [];
w.addEventListener('error', e => { errors.push(e.message); console.log('WINDOW ERROR', e.message); });
const ok = (c, m) => { if (!c) throw new Error(m); };
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 4).join(' | ')); } }
E(`window.__step = (n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); if (G.state === 'play' && !G.modal) update(1 / 60); renderWorld(); if (G.p) updateHUD(1 / 60); } };`);

run('camp opens with a back link and all six classes', () => {
  ok(E("G.state") === 'hub', 'not in camp');
  ok(E("document.querySelectorAll('[data-a=pickcls]').length") === 6, 'class cards missing');
  ok(E("!!document.querySelector('#hub a[href=\"../../\"]')"), 'no link back to the site');
  return E("Save.key");
});
for (const cls of ['warrior', 'rogue', 'mage', 'ranger', 'paladin', 'necro']) run(`${cls}: fights and clears a room`, () => E(`(() => {
  newRun('${cls}', 0, 1, false);
  const p = G.p; p.ap = 20;
  for (const id of CLASSES['${cls}'].abilities) for (let r = 0; r < 5; r++) ACT.learn(id);
  CLASSES['${cls}'].abilities.slice(0, 4).forEach((id, i) => p.slots[i] = id);
  const q = G.D.rooms.find(r => r.type === 'monster' || r.type === 'elite');
  p.x = q.cx * 16; p.y = q.cy * 16;
  __step(60);
  __step(1500, i => { p.hp = p.S.maxHp; p.mp = p.S.maxMp; for (const k in p.cds) p.cds[k] = 0; if (G.modal) UI.close();
    const e = G.ents.find(e => !e.dead && e.spawnT <= 0); if (e) { G.mx = e.x; G.my = e.y; }
    Input.mouse.down = true; if (i % 20 === 0) Input.pressed['Digit' + ((i / 20) % 4 + 1)] = true; if (i % 50 === 0) Input.pressed.Space = true; });
  Input.mouse.down = false;
  const kills = G.run.stats.kills;
  if (kills < 1 || G.run.stats.dmg <= 0) throw new Error('no damage dealt');
  // A player standing still cannot always reach ranged enemies: walk to the ones that are left.
  for (let k = 0; k < 8 && !q.cleared; k++) {
    const e = G.ents.find(e => !e.dead && e.roomId === q.id && !e.thief);
    if (e) { p.x = e.x; p.y = e.y + 6; e.hp = Math.min(e.hp, 1); }
    __step(120, () => { p.hp = p.S.maxHp; if (G.modal) UI.close(); const t = G.ents.find(e => !e.dead && e.spawnT <= 0); if (t) { G.mx = t.x; G.my = t.y; } Input.mouse.down = true; });
    Input.mouse.down = false;
  }
  if (!q.cleared) throw new Error('room not cleared, enemies left: ' + G.ents.length);
  if (q.locked) throw new Error('doors still locked after clearing');
  return { kills: G.run.stats.kills, casts: G.run.stats.casts, level: p.level };
})()`));
run('inventory, level-up, shop and events', () => E(`(() => {
  const p = G.p;
  for (let i = 0; i < 6; i++) p.inv.push(genItem({ minR: i }));
  UI.open('inventory'); ACT.sel('inv:0'); ACT.equip('0'); ACT.sell('1');
  for (const v of ['character', 'abilities', 'map', 'menu', 'pause', 'settings']) UI.open(v);
  UI.close();
  gainXP(5000); if (G.pendingLevel) { UI.open('levelup'); while (G.pendingLevel > 0) ACT.levelpick('0'); }
  p.gold = 99999; const sp = { type: 'shopkeeper', x: p.x, y: p.y }; UI.open('shop', sp);
  for (let i = 0; i < 7; i++) ACT.buy(String(i)); ACT.reroll(); UI.close();
  for (const t of Object.keys(EVENTS)) { const pp = { type: t, x: p.x, y: p.y }; UI.open('event', pp); const c = EVENTS[t].choices(pp, p)[0]; if (c.id !== 'leave' && !c.disabled) eventChoice(c.id); if (G.modal) UI.close(); }
  if (p.inv.some(x => !x)) throw new Error('hole in backpack');
  return { level: p.level, items: p.inv.length, gold: p.gold };
})()`));
run('all ten bosses spawn, change phase and die', () => E(`(() => {
  const out = [];
  Save.data.unlocked = 10;
  for (let bi = 0; bi < 10; bi++) {
    newRun('warrior', bi, 1, false);
    const p = G.p; G.run.floor = 3; G.run.floorNum = 3; startFloor();
    const q = G.D.rooms.find(r => r.type === 'boss');
    p.x = q.cx * 16; p.y = (q.cy + 3) * 16;
    __step(150, () => { p.hp = p.S.maxHp; if (G.modal) UI.close(); });
    const b = G.boss; if (!b) throw new Error('no boss in ' + BIOMES[bi].name);
    b.hp = b.maxHp * 0.25;
    __step(400, () => { p.hp = p.S.maxHp; if (G.modal) UI.close(); if (G.boss) { G.mx = G.boss.x; G.my = G.boss.y; Input.mouse.down = true; } });
    if (G.boss) { const B = G.boss; B.hidden = 0; B.air = 0; B.surfacing = false; B.invuln = false; B.hp = 1; hitEnemy(p, B, 1000, {}); }
    Input.mouse.down = false;
    __step(200, () => { p.hp = p.S.maxHp; if (G.modal) UI.close(); });
    if (G.boss) throw new Error('boss still alive in ' + BIOMES[bi].name);
    if (!G.props.some(x => x.type === 'portal')) throw new Error('no portal after boss in ' + BIOMES[bi].name);
    out.push(b.bossId + ':p' + b.phase);
  }
  return out;
})()`));
run('death ends the run, pays shards and returns to camp', () => E(`(() => {
  const before = Save.data.shards;
  newRun('mage', 0, 1, false); G.p.hp = 1; G.p.ifr = 0; hurtPlayer(9999, null, {});
  for (let i = 0; i < 200 && G.state !== 'ended'; i++) frame(i * 16);
  if (G.modal !== 'end') throw new Error('no end screen, state ' + G.state);
  ACT.tohub();
  if (G.state !== 'hub') throw new Error('not back in camp');
  return { shards: Save.data.shards - before, saved: !!w.localStorage.getItem(Save.key) };
})()`.replace('!!w.localStorage', '!!localStorage')));

if (errors.length) { console.log(`\n${errors.length} problem(s): ${errors.join(', ')}`); process.exit(1); }
console.log('\nAshen Depths: all checks passed');
process.exit(0);
