/* Tiny Empire smoke test: boots the built game in jsdom and plays through
   the main loop: building, combos, the river and bridges, road upgrades,
   traffic, parking, events, overlays, dialogs and saving. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'tiny-empire', 'index.html'), 'utf8');

function makeCtx(cv) {
  const grad = { addColorStop() {} };
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: (t) => ({ width: String(t).length * 6 }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/games/tiny-empire/',
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx(this)); };
    w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
  } });
const w = dom.window, E = (s) => w.eval(s);
const errors = [];
w.addEventListener('error', (e) => { errors.push(e.message); console.log('WINDOW ERROR', e.message); });
const origErr = w.console.error; w.console.error = (...a) => { errors.push(String(a[0] && a[0].stack || a[0])); origErr.apply(w.console, a); };
const ok = (c, m) => { if (!c) throw new Error(m); };
function run(label, fn) {
  try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 4).join(' | ')); }
}
// one rendered frame + UI refresh, like the real loop
E(`window.__frame = (dt) => { TE.Sim.step(TE.S, dt || 0.1); TE.Sim.ensure(TE.S); TE.UI.processNotes(); TE.UI.frame(0.3); TE.Render.draw(TE.S, TE.UI.view(), 0.016); };`);

run('boots with the welcome screen and a link back to the site', () => {
  ok(E('!!TE.S && !!TE.S.R'), 'game state missing');
  ok(!E("document.getElementById('modal').hidden"), 'welcome dialog not shown');
  ok(E("!!document.querySelector('a.home-link[href=\"../../\"]')"), 'no link back to Bas Games');
  ok(E('TE.S.river.length') > 30, 'no river on the map');
  E('TE.UI.closeModal(); __frame();');
  return { money: E('TE.S.money'), river: E('TE.S.river.length'), key: E('TE.Save.KEY') };
});
run('builds homes and shops, discovers a combination', () => E(`(() => {
  const S = TE.S, UI = TE.UI;
  [['house', 10, 11], ['house', 9, 11], ['house', 10, 10], ['bakery', 11, 10], ['coffee', 13, 11], ['park', 13, 10]].forEach(([t, x, y]) => { S.tiles[y * S.size + x].f = null; if (UI.buildType !== t) UI.selectBuild(t); UI.hoverAt([x, y], 100, 100); UI.tryPlace(t, x, y); });
  for (let i = 0; i < 20; i++) __frame(0.5);
  if (!S.discovered.morning_ritual) throw new Error('Morning Ritual not discovered');
  UI._queue = []; UI.closeModal();
  if (TE.S.R.totals.net <= 0) throw new Error('no income');
  return { buildings: Object.keys(S.buildings).length, net: +S.R.totals.net.toFixed(2), discovered: Object.keys(S.discovered) };
})()`));
run('buys land across the river and builds a road bridge', () => E(`(() => {
  const S = TE.S, G = TE.Game, n = S.size;
  S.money = 50000;
  const ri = S.river.filter((i) => ((i / n) | 0) === 12).map((i) => i % n);
  const [cx, cy] = G.chunkOf(ri[0], 12);
  const r = G.buyChunk(S, cx, cy); if (!r.ok) throw new Error('buy failed: ' + r.reason);
  const far = Math.max(...ri) + 1;
  if (G.isOwned(S, far, 12) === false) { const [c2] = G.chunkOf(far, 12); const r2 = G.buyChunk(S, c2, cy); if (!r2.ok) throw new Error('second chunk: ' + r2.reason); }
  TE.UI.setTool('select');
  for (let x = 16; x <= far; x++) {
    const t = S.tiles[12 * n + x]; t.f = null;
    if (t.b) continue;
    const want = t.water ? 'bridge' : 'road'; if (TE.UI.buildType !== want) TE.UI.selectBuild(want); TE.UI.clickAt([x, 12], null, { stroke: 77 });
  }
  __frame();
  if (!S.R.roadConn[12 * n + far]) throw new Error('far bank not connected');
  // a house cannot be built on the river
  if (G.canPlace(S, 'house', ri[0], 12 - 1).ok && S.tiles[11 * n + ri[0]].water) throw new Error('house allowed on water');
  return { bridges: G.count(S, 'bridge'), far };
})()`));
run('promenade, waterfront and flood barrier on the bank', () => E(`(() => {
  const S = TE.S, G = TE.Game, n = S.size;
  S.level = 3; TE.Progress.checkUnlocks(S, true);
  const shore = []; for (let y = 12; y < 16; y++) for (let x = 14; x < 20; x++) { const t = S.tiles[y * n + x]; if (G.isOwned(S, x, y) && !t.water && !t.b && G.nearWater(S, x, y)) shore.push([x, y]); }
  if (shore.length < 3) throw new Error('no free shore tiles: ' + shore.length);
  shore.forEach(([x, y]) => { S.tiles[y * n + x].f = null; });
  const r1 = G.place(S, 'promenade', shore[0][0], shore[0][1]); if (!r1.ok) throw new Error('promenade: ' + r1.reason);
  const r2 = G.place(S, 'restaurant', shore[1][0], shore[1][1]); if (!r2.ok) throw new Error('restaurant: ' + r2.reason);
  const r3 = G.place(S, 'floodbarrier', shore[2][0], shore[2][1]); if (!r3.ok) throw new Error('barrier: ' + r3.reason);
  __frame();
  const rb = S.R.b[r2.building.uid].bonuses.map((b) => b.label);
  if (!rb.some((l) => /Waterfront|Promenade/.test(l))) throw new Error('no waterfront bonus: ' + rb.join(','));
  return { restaurant: rb, combos: Object.keys(S.discovered).length };
})()`));
run('streets jam, avenues and transit fix them; parking matters', () => E(`(() => {
  const S = TE.S, G = TE.Game, n = S.size;
  S.level = 5; S.money = 1e7; TE.Progress.checkUnlocks(S, true);
  for (let x = 8; x <= 10; x++) for (let y = 13; y <= 14; y++) { const t = S.tiles[y * n + x]; t.f = null; if (!t.b) G._put(S, 'skyscraper', x, y); }
  __frame();
  const jam = S.R.trafficStats.jammed;
  if (jam < 1) throw new Error('no jams with six skyscrapers');
  const sk = G.buildingAt(S, 9, 13);
  if (!(S.R.parking[sk.uid] && S.R.parking[sk.uid].ratio < 1)) throw new Error('skyscraper has all the parking it needs?');
  // select the busiest street and upgrade it from the panel
  let best = null; G.eachBuilding(S, (b) => { if (b.type === 'road' && (!best || S.R.cong[b.y * n + b.x] > S.R.cong[best.y * n + best.x])) best = b; });
  TE.UI.select(best.uid); TE.UI.sideSig = ''; TE.UI.renderSide();
  const btn = document.querySelector('#side button[data-road="avenue"]'); if (!btn) throw new Error('no avenue button on road panel');
  btn.click(); __frame();
  if (best.type !== 'avenue') throw new Error('road not converted');
  G._put(S, 'busstop', 11, 13); G._put(S, 'parkinglot', 11, 14); __frame();
  return { jamBefore: jam, jamAfter: S.R.trafficStats.jammed, parking: +S.R.parking[sk.uid].ratio.toFixed(2), transitCut: +S.R.transitCut[13 * n + 9].toFixed(2) };
})()`));
run('power shortage and power plant', () => E(`(() => {
  const S = TE.S, G = TE.Game;
  __frame();
  const before = S.R.power;
  const t = G.tile(S, 15, 15); t.f = null; if (!t.b) G._put(S, 'powerplant', 15, 15);
  __frame();
  if (!(S.R.power.supply > before.supply)) throw new Error('power plant did not add supply');
  return { before: before.short, after: S.R.power.short, supply: S.R.power.supply, demand: Math.round(S.R.power.demand) };
})()`));
run('events: flood, rush hour, fire, heatwave, pollution choice', () => E(`(() => {
  const S = TE.S, out = {};
  ['flood', 'traffic', 'heatwave', 'celebration', 'community'].forEach((id) => { TE.Events.start(S, id); __frame(); S.event.end = S.time; __frame(1.1); out[id] = !S.event; });
  TE.Events.start(S, 'pollution'); __frame(); TE.Events.choose(S, 'cut'); S.event.end = S.time; __frame(1.1); out.pollution = !S.event;
  TE.Events.fire(S); __frame();
  if (Object.values(out).some((v) => !v)) throw new Error('event did not finish: ' + JSON.stringify(out));
  return out;
})()`));
run('every overlay, dialog and rotation works', () => E(`(() => {
  const S = TE.S, UI = TE.UI;
  Object.keys(TE.Render.OVERLAYS).forEach((k) => { UI.setOverlay(k); __frame(); });
  UI.setOverlay(null);
  ['showCollection', 'showStats', 'showIncome', 'showMenu', 'showHelp'].forEach((f) => { UI[f](); UI.closeModal(); });
  UI.showStats();
  const statsText = document.querySelector('#modal').textContent;
  ['City health', 'Happiness', 'Safety', 'Pollution', 'Traffic', 'Parking', 'Power', 'River', 'Public transport'].forEach((k) => { if (statsText.indexOf(k) < 0) throw new Error('stats missing ' + k); });
  UI.closeModal();
  ['happiness', 'safety', 'pollution', 'traffic', 'neighborhoods'].forEach((f) => { UI.showReport(f); UI.closeModal(); });
  let h; TE.Game.eachBuilding(S, (b) => { if (!h && b.type === 'house') h = b; });
  UI.select(h.uid); UI.sideSig = ''; UI.renderSide();
  const before = h.rot || 0; UI.rotate(); if ((h.rot || 0) === before) throw new Error('rotate did nothing');
  UI.selectBuild('townhouse'); UI.rotate(); UI.hoverAt([9, 9], 50, 50); __frame();
  ['roads', 'homes', 'shops', 'fun', 'work', 'energy', 'services', 'rec', 'transit'].forEach((t) => { UI.tab = t; UI.buildCards(); });
  UI.setTool('select');
  return { overlays: Object.keys(TE.Render.OVERLAYS).length, cards: document.querySelectorAll('.card').length };
})()`));
run('a long stretch of play stays stable', () => E(`(() => {
  for (let i = 0; i < 600; i++) { TE.Sim.step(TE.S, 1); TE.UI.processNotes(); TE.UI._queue = []; }
  __frame();
  const S = TE.S;
  if (!isFinite(S.money) || S.money < 0) throw new Error('bad money');
  return { level: S.level, pop: Math.round(S.R.totals.population), net: Math.round(S.R.totals.net), combos: Object.keys(S.discovered).length };
})()`));
run('saves and loads (with the river)', () => E(`(() => {
  if (!TE.UI.saveGame(false)) throw new Error('save failed');
  const L = TE.Save.load(); if (!L) throw new Error('load failed');
  if (L.river.length !== TE.S.river.length) throw new Error('river lost');
  if (Object.keys(L.buildings).length !== Object.keys(TE.S.buildings).length) throw new Error('buildings lost');
  TE.Main.startWith(L); __frame();
  return { key: TE.Save.KEY, buildings: Object.keys(L.buildings).length };
})()`));

if (errors.length) { console.log('\nErrors:', errors.length); errors.slice(0, 8).forEach((e) => console.log('  ', String(e).split('\n')[0])); w.close(); process.exit(1); }
console.log('\nTiny Empire smoke test passed');
w.close();
process.exit(0);
