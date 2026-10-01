const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
const WITH_DB = process.argv.includes('--db');
const QUICK = process.argv.includes('--quick');

function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
// in-memory mock van de db + user capability
function mockClaude() {
  const store = {}; const subs = [];
  const notify = () => subs.forEach(s => s());
  const snapOf = (path) => ({ id: path.split('/').pop(), exists: !!store[path], data: () => store[path] });
  const db = {
    doc(path) { return { id: path.split('/').pop(), path, async get() { return snapOf(path); }, async set(d) { store[path] = JSON.parse(JSON.stringify(d)); notify(); }, async update(d) { Object.assign(store[path], d); notify(); }, async delete() { delete store[path]; notify(); }, onSnapshot(n) { const f = () => n(snapOf(path)); subs.push(f); f(); return () => {}; } }; },
    collection(path) { const q = { async get() { const docs = Object.keys(store).filter(k => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(snapOf); return { docs, size: docs.length, empty: !docs.length }; }, onSnapshot(n) { const f = async () => n(await q.get()); subs.push(f); f(); return () => {}; }, doc: id => db.doc(path + '/' + id), where: () => q, orderBy: () => q, limit: () => q }; return q; },
  };
  store['scores/u_other'] = { v: 1, season: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'), level: 12, prestige: 1, title: 'raider', a: { wave: 40, endless: 33, bossrush: 5, bosses: 90, damage: 1e6, fastest: { stad: 500 }, raids: 3, kills: 50000, mastery: 20000 }, s: { wave: 20, endless: 22, bossrush: 3, bosses: 10, damage: 400000, fastest: { stad: 520 }, raids: 1, kills: 3000, mastery: 3000 } };
  store['coop/u_other'] = { week: null, dmg: 500000, runs: 3 };
  const user = { async id() { return 'u_me'; }, async can() { return true; }, async profiles(ids) { const o = {}; for (const id of [].concat(ids)) o[id] = { id, name: id === 'u_other' ? 'Sanne' : 'Bas', avatarUrl: '', color: '#888', email: null, isMe: id === 'u_me', guest: false }; return o; } };
  return { store, api: { use: async n => (n === 'db' ? db : n === 'user' ? user : null) } };
}
function boot() {
  const mock = WITH_DB ? mockClaude() : null;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx()); };
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
      if (mock) { mock.store['coop/u_other'].week = null; w.claude = mock.api; }
    } });
  dom.mock = mock; return dom;
}
const errors = [];
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 5).join(' | ')); } }

const dom = boot(), w = dom.window, d = w.document;
w.addEventListener('error', e => { errors.push('window error'); console.log('WINDOW ERROR', e.message, e.filename, e.lineno); });
const E = s => w.eval(s);
const click = el => { if (!el) throw new Error('element niet gevonden'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];

(async () => {
  await new Promise(r => setTimeout(r, 50));
  if (WITH_DB) { await new Promise(r => setTimeout(r, 100)); if (dom.mock) { E(''); } }
  function sim(opts, team, level, maxMin = 25, bot = {}) {
    E(`Store.data.team = ${JSON.stringify(team)}; ${JSON.stringify(team)}.forEach(id => { Store.data.heroes[id] = Object.assign(Store.data.heroes[id] || {copies:1}, { level: ${level} }); Meta.ensureHero(id); });`);
    w.__o = opts; E('startMatch(window.__o)');
    const g = E('App.game'); if (!g) throw new Error('geen game gestart');
    const pathPts = []; for (let dd = 0; dd < g.pathLen; dd += 20) pathPts.push(g.posAt(dd));
    const score = (tx, ty, R) => { const x = tx * 40 + 20, y = ty * 40 + 20; let s = 0; for (const p of pathPts) if ((p.x - x) ** 2 + (p.y - y) ** 2 < (Math.min(R, 6) * 40) ** 2) s++; return s; };
    let frames = 0; const dt = 1 / 30;
    while (!g.over && frames < 30 * 60 * maxMin) {
      if (frames % 15 === 0) {
        const cands = team.filter(id => g.heroAllowed(id) && g.cash >= g.costOf(id) && g.heroCount(id) < g.heroCap(id) && g.realHeroes().length < (g.rules.maxHeroes || 14));
        const upg = g.heroes.filter(h => !h.temp && h.tier < (g.rules.maxTier != null ? g.rules.maxTier : 5)).map(h => ({ h, cost: h.def.upgrades[h.tier].cost })).sort((a, b) => a.cost - b.cost)[0];
        if (cands.length && (g.realHeroes().length < 3 || !upg || Math.random() < 0.4)) {
          const id = cands[Math.floor(Math.random() * cands.length)], R = E('HERO')[id].base.range || 2;
          let best = null, bs = -1; for (const [x, y] of g.freeTiles) { if (!g.tileFree(x, y)) continue; const s = score(x, y, R); if (s > bs) { bs = s; best = [x, y]; } }
          if (best) g.placeHero(id, best[0], best[1]);
        } else if (upg && g.cash >= upg.cost) g.upgrade(upg.h);
        for (const h of g.heroes) if (!h.temp && h.abilCd <= 0 && g.enemies.length > 2) g.useAbility(h);
        if (g.relicOffer) g.chooseRelic(g.relicOffer[0]); if (g.canStartWave() && (!g.bonusPending || opts.mode === 'bossrush')) g.startWave();
      }
      g.update(dt);
      if (frames % 60 === 0) { g.render(E('App.cv').getContext('2d'), 1); E('hudUpdate(); handleGameEvents(); renderSide();'); if (g.heroes[0]) { g.select(g.heroes[0]); E('renderSide()'); g.select(null); } }
      if (bot.quitAt && frames === bot.quitAt) g.quit();
      frames++;
    }
    if (!g.over) g.quit();
    E('handleGameEvents()'); E('showResults()');
    const txt = ($('.results-card') || {}).textContent || '';
    const res = { mode: g.mode, win: g.result.win, wave: g.wave, cleared: g.cleared, kills: g.kills, bosses: g.bossKills, dmg: Math.round(g.ms.dmg), coop: Math.round(g.coopDmg), mins: (frames / 1800).toFixed(1), coins: E('Store.data.coins'), resultOk: /Totaal/.test(txt) };
    E('exitGame("home")');
    return res;
  }

  const T = { top: ['kosmos', 'tijd', 'storm', 'feniks', 'grav', 'zon'], myth: ['nova', 'leegte', 'kosmos', 'tijd', 'engel', 'midas'], ultra: ['omega', 'genesis', 'prisma', 'fantoom', 'nova', 'leegte'], w2: ['spion', 'astro', 'farao', 'kosmos', 'tijd', 'zon'], start: ['tweeling', 'schildmaagd', 'sterrenkind', 'kosmos', 'tijd', 'nova'], sec: ['paradox', 'nul', 'omega', 'genesis', 'nebula', 'xeno'] };
  const cases = [
    ['vulkaan N top L8', { map: 'vulkaan', diffIdx: 1, mode: 'campaign' }, 'top', 8],
    ['neonstad N top L10', { map: 'neonstad', diffIdx: 1, mode: 'campaign' }, 'top', 10],
    ['neonstad N w2 L10', { map: 'neonstad', diffIdx: 1, mode: 'campaign' }, 'w2', 10],
    ['gletsjer N myth L11', { map: 'gletsjer', diffIdx: 1, mode: 'campaign' }, 'myth', 11],
    ['inferno N myth L12', { map: 'inferno', diffIdx: 1, mode: 'campaign' }, 'myth', 12],
    ['xenoplaneet N ultra L12', { map: 'xenoplaneet', diffIdx: 1, mode: 'campaign' }, 'ultra', 12],
    ['tempel N ultra L13', { map: 'tempel', diffIdx: 1, mode: 'campaign' }, 'ultra', 13],
    ['station N ultra L14', { map: 'station', diffIdx: 1, mode: 'campaign' }, 'ultra', 14],
    ['neo insane start L14', { map: 'neo', diffIdx: 4, mode: 'campaign' }, 'start', 14],
    ['vulkaan hell ultra L20', { map: 'vulkaan', diffIdx: 5, mode: 'campaign' }, 'ultra', 20],
    ['vulkaan abyss sec L25', { map: 'vulkaan', diffIdx: 6, mode: 'campaign' }, 'sec', 25],
    ['dungeon d1 top L10', { map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: 1 }, 'top', 10],
    ['dungeon d5 myth L13', { map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: 5 }, 'myth', 13],
    ['dungeon d10 ultra L18', { map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: 10 }, 'ultra', 18],
    ['bossrush ultra L12', { map: 'arena', diffIdx: 1, mode: 'bossrush' }, 'ultra', 12],
    ['neonstad hard ultra L15', { map: 'neonstad', diffIdx: 2, mode: 'campaign' }, 'ultra', 15],
    ['station nightmare sec L20', { map: 'station', diffIdx: 3, mode: 'campaign' }, 'sec', 20],
    ['station abyss sec L30', { map: 'station', diffIdx: 6, mode: 'campaign' }, 'sec', 30],
    ['neo insane myth L15', { map: 'neo', diffIdx: 4, mode: 'campaign' }, 'myth', 15],
    ['station hell sec L25', { map: 'station', diffIdx: 5, mode: 'campaign' }, 'sec', 25],
    ['neo nightmare myth L15', { map: 'neo', diffIdx: 3, mode: 'campaign' }, 'myth', 15],
    ['neo hard myth L15', { map: 'neo', diffIdx: 2, mode: 'campaign' }, 'myth', 15],
    ['tempel insane ultra L18', { map: 'tempel', diffIdx: 4, mode: 'campaign' }, 'ultra', 18],
  ];
  E(`redeemCode('8022')`); E('closeOverlay()');
  const idx = process.argv.slice(2).map(Number).filter(n => !isNaN(n));
  for (const i of idx) { const [label, o, t, lv] = cases[i]; run(label, () => { const t0 = Date.now(); const r = sim(o, T[t], lv, 45); return { win: r.win, wave: r.wave, cleared: r.cleared, bosses: r.bosses, mins: r.mins, sec: Math.round((Date.now() - t0) / 1000) }; }); }
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'DONE');
})();
