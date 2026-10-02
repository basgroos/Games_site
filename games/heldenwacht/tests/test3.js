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
  E("setPlayerName('Tester'); Store.data.settings.rareAnim = 'off'");
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
  const strong = ['omega', 'genesis', 'prisma', 'nova', 'leegte', 'kosmos'];
  const w2team = ['spion', 'astro', 'farao', 'xeno', 'nebula', 'kristal'];
  E(`redeemCode('8022')`); E('closeOverlay()');
  run('new screens', () => { for (const s of ['shop', 'maps', 'gacha', 'profile', 'collection']) E(`nav('${s}')`); E(`App.modeTab='dungeon'; nav('modes')`); return { shopItems: $$('#scr-shop .shop-item').length, gems: E('Store.data.gems'), tbGems: $('#tb-gems').textContent }; });
  run('shop tabs + buy', () => {
    E(`Store.data.gems = 5000; Store.data.coins = 500000; Store.data.level = 5; nav('shop')`);
    const out = {};
    for (const t of ['rot', 'deals', 'heroes', 'skins', 'tickets', 'tokens', 'currency']) { click($(`[data-act="shop-tab"][data-tab="${t}"]`)); const n = $$('#scr-shop .shop-item').length; let b, guard = 0; while ((b = $('#scr-shop [data-act="shop-buy"]:not([disabled])')) && guard++ < 30) click(b); out[t] = n + '/' + $$('#scr-shop [data-act="shop-buy"][disabled]').length; }
    click($('[data-act="shop-tab"][data-tab="rot"]')); const before = $$('#scr-shop .shop-item b').map(x => x.textContent).join('|'); click($('[data-act="shop-refresh"]')); const after = $$('#scr-shop .shop-item b').map(x => x.textContent).join('|');
    out.refreshed = before !== after; out.buys = E('Store.data.stats.shopBuys'); out.gems = E('Store.data.gems'); out.skins = E('Store.data.skins.length'); out.lim = Object.keys(E('Store.data.shop.lim')).length;
    return out;
  });
  run('gem + limited gachas', () => {
    E(`Store.data.gems = 10000; Store.data.coins = 500000; Store.data.level = 40; nav('gacha')`);
    const out = {};
    for (const id of ['epic', 'mythic', 'exotic', 'limited']) { click($(`[data-act="sel-gacha"][data-id="${id}"]`)); const g0 = E('Store.data.gems'), c0 = E('Store.data.coins'); click($(`[data-act="pull"][data-id="${id}"][data-n="10"]`)); click($('#reveal-skip')); out[id] = { cards: $$('#rcards .rcard').length, gemsSpent: g0 - E('Store.data.gems'), coinsSpent: c0 - E('Store.data.coins') }; click($('[data-act="reveal-close"]')); }
    // limited pity
    E(`Store.data.pityLimited = 69`); E(`doPull('limited', 1)`); out.limPityHit = E(`App.reveal && App.reveal.res.map(r => r.id || ('skin:'+r.skin)).join()`); E('closeOverlay()');
    out.limitedSet = E('JSON.stringify(Meta.limitedSet().heroes)');
    return out;
  });
  run('secret odds (100k exotic rolls)', () => { return E(`(() => { const g = GACHAS.find(x => x.id === 'exotic'), pool = gachaPool(g), c = {}; for (let i = 0; i < 100000; i++) { const p = rollFrom(pool); c[p.rarity] = (c[p.rarity] || 0) + 1; } return JSON.stringify(c); })()`); });
  run('locks by level', () => { E(`Store.data.level = 1; for (const m of MAPS.slice(0, WORLD1_COUNT)) Store.data.clears[m.id] = ['normal','hard','nightmare']`); const a = { w2: E('Progress.mapUnlocked(WORLD1_COUNT)'), insane: E('Progress.diffUnlocked(0, 4)'), exoticG: E(`Progress.gachaUnlocked(GACHAS.find(g=>g.id==='exotic'))`), text: E('Progress.lockText(WORLD1_COUNT)'), dText: E('Progress.diffLockText(0, 4)') }; E(`Store.data.level = 40`); a.w2after = E('Progress.mapUnlocked(WORLD1_COUNT)'); a.abyss = E('Progress.diffUnlocked(0, 6)'); E(`App.world = 2; nav('maps')`); a.w2cards = $$('#scr-maps .map-card').length; a.diffBtns = $$('#scr-maps .diff').length; return a; });
  run('collection level', () => { E(`nav('profile')`); const c = E('JSON.stringify(collectionInfo())'); const cl = E('Meta.collClaimable()'); if ($('[data-act="coll-claim"]')) click($('[data-act="coll-claim"]')); return { c, cl, after: E('Meta.collClaimable()'), max: E('collectionMax()'), top: E('COLL_LEVELS[COLL_LEVELS.length-1]') }; });
  // world 2 sims met nieuwe helden
  for (const m of ['neonstad', 'gletsjer', 'inferno', 'xenoplaneet', 'tempel', 'station']) run('sim w2 ' + m, () => sim({ map: m, diffIdx: 1, mode: 'campaign' }, w2team, 20, QUICK ? 5 : 30));
  run('sim abyss drops', () => sim({ map: 'stad', diffIdx: 6, mode: 'campaign' }, ['paradox', 'nul', 'nebula', 'farao', 'xeno', 'astro'], 30, QUICK ? 5 : 30));
  run('sim dungeon d1', () => { const r = sim({ map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: 1, back: 'modes' }, ['mechasmid', 'spion', 'kristal', 'plasma', 'bij', 'stuiter'], 15, QUICK ? 6 : 30); return Object.assign(r, { best: E('Store.data.dungeon.best') }); });
  run('sim dungeon d5', () => sim({ map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: 5, back: 'modes' }, w2team, 25, QUICK ? 5 : 30));
  run('relic overlay UI', () => { E(`startMatch({ map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: 1, back: 'modes' })`); const g = E('App.game'); g.wave = 3; g.offerRelic(); E('showRelicPick()'); const n = $$('.relic').length; click($('.relic')); const r = { cards: n, relics: g.relics.slice(), paused: g.paused, canStart: g.canStartWave(), R: JSON.stringify(g.R) }; E('exitGame("home")'); return r; });
  run('all new abilities + helpers', () => {
    E(`Store.data.team = ${JSON.stringify(['stuiter','lasso','bij','magneet','spion','plasma'])}`);
    const out = {};
    for (const grp of [['stuiter','lasso','bij','magneet','spion','plasma'], ['kristal','mechasmid','astro','farao','xeno','nebula'], ['paradox','nul']]) {
      E(`Store.data.team = ${JSON.stringify(grp)}`); E(`startMatch({ map: 'station', diffIdx: 1, mode: 'campaign' })`); const g = E('App.game'); g.cash = 1e6;
      let i = 0; for (const id of grp) { const [x, y] = g.freeTiles.filter(([a, b]) => g.tileFree(a, b))[i * 7 % 50]; g.placeHero(id, x, y); i++; }
      g.startWave(); for (let k = 0; k < 200; k++) g.update(1 / 30);
      for (const t of ['sluiper', 'trol', 'necro', 'schildgen', 'priester', 'hacker', 'xenolarve', 'netrunner', 'lawine', 'magmatitan', 'moederbrein', 'anubis', 'stationai', 'kerkerheer']) g.spawnEnemy(t, 60, 10);
      for (const h of g.heroes.slice()) { h.tier = 5; h.abilCd = 0; g.useAbility(h); }
      for (let k = 0; k < 30 * 25; k++) { g.update(1 / 30); if (k % 30 === 0) g.render(E('App.cv').getContext('2d'), 1); if (k === 400) for (const h of g.heroes.filter(h => !h.temp)) { h.abilCd = 0; h.tier = 4; g.useAbility(h); } }
      out[grp[0]] = { temps: g.heroes.filter(h => h.temp).length, kills: g.kills, dmg: Math.round(g.ms.dmg), over: g.over };
      E('exitGame("home")');
    }
    return out;
  });
  run('invisible + detect', () => {
    E(`Store.data.team = ['vuist', 'spion']`); E(`startMatch({ map: 'stad', diffIdx: 1, mode: 'campaign' })`); const g = E('App.game'); g.cash = 1e5;
    const e = g.spawnEnemy('sluiper', 200, 5); g.revealPass(0); const hidden = !e.revealed;
    const [x, y] = [Math.floor(e.x / 40), Math.floor(e.y / 40) + 1]; g.placeHero('spion', x, y); g.update(1/30); const seen = e.revealed;
    const r = { hidden, seen, targetable: g.findTargets(g.heroes[0], 400, 5).includes(e) }; E('exitGame("home")'); return r;
  });
  run('new traits on heroes', () => {
    const ids = E('TRAITS.slice(-24).map(t => t.id)'); E(`Store.data.team = ['kogel','sterrenkind','omega','vuist','tweeling','pijl']`);
    E(`startMatch({ map: 'stad', diffIdx: 2, mode: 'campaign' })`); const g = E('App.game'); g.cash = 1e6;
    ids.slice(0, 6).forEach((t, i) => { g.hmeta[g.team[i]].trait = E(`TRAIT['${t}']`); });
    let k = 0; for (const id of g.team) { const [x, y] = g.freeTiles.filter(([a, b]) => g.tileFree(a, b))[k++ * 9 % 60]; g.placeHero(id, x, y); }
    for (let wv = 0; wv < 3; wv++) { g.startWave(); for (let f = 0; f < 30 * 25; f++) g.update(1 / 30); }
    const res = { costs: g.team.map(id => g.costOf(id)), kills: g.kills }; E('exitGame("home")');
    for (let chunk = 6; chunk < 24; chunk += 6) { E(`startMatch({ map: 'stad', diffIdx: 2, mode: 'campaign' })`); const g2 = E('App.game'); g2.cash = 1e6; ids.slice(chunk, chunk + 6).forEach((t, i) => { g2.hmeta[g2.team[i]].trait = E(`TRAIT['${t}']`); }); let q = 0; for (const id of g2.team) { const [x, y] = g2.freeTiles.filter(([a, b]) => g2.tileFree(a, b))[q++ * 9 % 60]; g2.placeHero(id, x, y); } for (let wv = 0; wv < 3; wv++) { g2.startWave(); for (let f = 0; f < 30 * 25; f++) g2.update(1 / 30); } res['k' + chunk] = g2.kills; E('exitGame("home")'); }
    return res;
  });
  run('world2 results + leaderboard dungeon', () => { E(`App.lbCat='dungeon'; nav('leaderboard')`); return { rows: $$('.lb tbody tr').length, stats: E('JSON.stringify({el: Store.data.stats.elites, drops: Store.data.stats.drops, gemsEarned: Store.data.stats.gemsEarned, db: Store.data.stats.dungeonBest})') }; });
  run('save reload', () => { E('Store.save(); Store.load(); Meta.ensureAll()'); return { gems: E('Store.data.gems'), shop: !!E('Store.data.shop.lim'), dungeon: E('Store.data.dungeon.best') }; });
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED'); process.exitCode = errors.length ? 1 : 0; setTimeout(() => process.exit(process.exitCode), 50);
})();
