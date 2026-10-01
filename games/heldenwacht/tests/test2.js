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
  E("setPlayerName('Tester')");
  if (WITH_DB) { await new Promise(r => setTimeout(r, 100)); if (dom.mock) { E(''); } }
  run('boot state', () => ({ v2: E('Store.data.traitsV2'), heroes: Object.keys(E('Store.data.heroes')), traits: Object.values(E('Store.data.heroes')).map(h => h.trait), online: E('Online.ready') }));
  run('all screens', () => { for (const s of ['maps', 'modes', 'gacha', 'collection', 'team', 'missions', 'event', 'leaderboard', 'profile', 'settings', 'home']) E(`nav('${s}')`); });
  run('claim login', () => { click($('[data-act="claim-login"]')); return { day: E('Store.data.login.day'), tickets: E('JSON.stringify(Store.data.tickets)') }; });
  run('all enemy shapes', () => { for (const t of Object.keys(E('ENEMIES'))) { const e = E(`(()=>{const E=ENEMIES['${t}'];return {type:'${t}',E,r:E.r,t:1,hp:1,maxHp:1,shield:E.shield||0,maxShield:E.shield||0,flying:!!E.flying,dir:0,boss:!!E.boss,ab:{},hitShield:3,dmgRed:0.7}})()`); w.__e = e; E('drawEnemyBody(document.createElement("canvas").getContext("2d"), window.__e, 1, false)'); } return Object.keys(E('ENEMIES')).length; });
  run('all map backgrounds', () => { for (const m of E('ALL_MAPS()')) { w.__m = m; E('mapBackground(window.__m)'); } return E('ALL_MAPS().length'); });
  run('all heroes with all skins', () => { const ctx = 'document.createElement("canvas").getContext("2d")'; E(`for (const H of HEROES) for (const S of [null, ...SKINS.map(s=>s.id)]) drawHero(${ctx}, H, 50, 50, 1, 1, { tier: 5, atk: 0.5, look: resolveLook(H, S) })`); return E('HEROES.length') + ' helden × ' + (E('SKINS.length') + 1); });
  run('code 8022', () => { E(`nav('home')`); click($('[data-act="open-code"]')); $('#code-in').value = '8022'; $('#code-form').dispatchEvent(new w.Event('submit', { cancelable: true })); return Object.keys(E('Store.data.heroes')).length + '/' + E('HEROES.length'); });
  run('hero modal tabs', () => { for (const id of ['vuist', 'omega', 'heks', 'valkyrie']) for (const tab of ['info', 'trait', 'skins', 'mastery']) { E(`openHeroModal('${id}', 5, '${tab}')`); E('drawPreview(0.05)'); } E('closeOverlay()'); });
  run('trait gacha', () => {
    E(`closeOverlay(); Store.data.tokens = 5; Store.data.coins = 100000; Store.data.heroes.vuist.trait = null; App.gachaSel='traits'; nav('gacha')`);
    click($('[data-act="tg-hero"][data-id="vuist"]'));
    click($('[data-act="tg-roll"][data-pay="token"]'));
    const reel = !!$('#treel'); click($('#reel-skip'));
    const t1 = E('Store.data.heroes.vuist.trait'), shown = $('#reel-n').textContent;
    click($('[data-act="tg-done"]'));
    E(`Store.data.heroes.vuist.trait = 'berserker'; renderTraitGacha()`);
    click($('[data-act="tg-roll"][data-pay="coins"]'));
    const conf = !!$('.confirm-box'); click($('[data-act="tg-roll-yes"]')); click($('#reel-skip'));
    const t2 = E('Store.data.heroes.vuist.trait'); E('closeOverlay()');
    E('Store.data.traitPity = 49; Store.data.tokens = 3'); const r = E(`Meta.rollTraitOn('vuist','token')`);
    E(`openHeroModal('vuist', 0, 'trait')`); const btn = !!$('[data-act="goto-trait"]'); E('closeOverlay()');
    return { reel, t1, shownMatches: shown === E(`TRAIT['${t1}'].name`), confirm: conf, t2, pityRarity: E(`TRAIT['${r.now}'].rarity`), pity: E('Store.data.traitPity'), tokens: E('Store.data.tokens'), coins: E('Store.data.coins'), heroTabBtn: btn };
  });
  run('trait odds sample', () => { const c = {}; for (let i = 0; i < 20000; i++) { const t = E('TRAIT[Meta.rollTrait()].rarity'); c[t] = (c[t] || 0) + 1; } return c; });
  run('equip skin', () => { E(`Store.data.skins.push('neon'); openHeroModal('pijl', 0, 'skins')`); click($('[data-act="equip-skin"][data-skin="neon"]')); return E('Store.data.heroes.pijl.skin'); });
  run('gacha + tickets', () => { E(`closeOverlay(); Store.data.coins = 1e6; Store.data.tickets.cosmic = 2; Store.data.clears = {stad:['normal'],bos:['normal'],woestijn:['normal'],bergen:['normal'],neo:['normal']}; App.gachaSel='cosmic'; nav('gacha')`); click($('[data-act="pull-ticket"]')); E('revealDone(); closeOverlay()'); click($('[data-act="pull"][data-n="10"]')); E('revealDone(); closeOverlay()'); return { cosmic: E('Store.data.tickets.cosmic'), pulls: E('Store.data.stats.pulls') }; });
  run('modes tabs', () => { E(`nav('modes')`); for (const t of ['endless', 'bossrush', 'raids', 'dungeon', 'custom', 'secret']) click($(`[data-act="mode-tab"][data-tab="${t}"]`)); });
  run('missions tabs', () => { E(`nav('missions')`); for (const t of ['daily', 'perm', 'quests', 'ach', 'login']) click($(`[data-act="mission-tab"][data-tab="${t}"]`)); });
  run('scores tabs', () => { E(`nav('leaderboard')`); for (const c of E('SCORE_MODES.map(c=>c[0])')) click($(`[data-act="score-mode"][data-tab="${c}"]`)); if (E('!!document.querySelector("[data-act=\\"mode-tab\\"][data-tab=\\"coop\\"]")')) throw new Error('co-op tab nog zichtbaar'); return $$('.lb tbody tr').length; });
  run('profile + event', () => { E(`nav('profile'); nav('event')`); return E('Meta.activeEvent().def.name'); });
  run('event calendar dates', () => { const out = {}; for (const ds of ['2026-07-15', '2026-09-29', '2026-10-20', '2026-12-25', '2027-01-03', '2027-03-01', '2026-11-20']) { w.__d = new Date(ds + 'T12:00:00'); out[ds] = E('Meta.activeEvent(window.__d).def.id'); } return out; });

  // -------- simulaties --------
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
        if (g.canStartWave() && (!g.bonusPending || opts.mode === 'bossrush')) g.startWave();
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
  const mid = ['storm', 'feniks', 'grav', 'zon', 'schaduw', 'staal'];
  run('sim campaign', () => sim({ map: 'stad', diffIdx: 0, mode: 'campaign' }, ['vuist', 'pijl', 'kogel', 'tweeling', 'schildmaagd', 'sterrenkind'], 3, 20));
  run('sim custom mods', () => sim({ map: 'bos', diffIdx: 1, mode: 'custom', mods: ['hp50', 'fast', 'costly', 'flyers', 'armored'] }, mid, 6, QUICK ? 6 : 25));
  run('sim challenge max3', () => sim({ map: 'stad', diffIdx: 1, mode: 'challenge', rules: { maxHeroes: 3 } }, strong, 8, QUICK ? 6 : 25));
  run('sim challenge lowOnly (team check)', () => { E(`Store.data.team=['omega']`); w.__o = { map: 'stad', diffIdx: 1, mode: 'challenge', rules: { maxRarity: 'uncommon' } }; E('startMatch(window.__o)'); return { started: !!E('App.game') }; });
  run('sim endless', () => sim({ map: 'stad', diffIdx: 1, mode: 'endless' }, strong, 10, QUICK ? 5 : 30));
  run('sim bossrush', () => sim({ map: 'arena', diffIdx: 1, mode: 'bossrush' }, strong, 10, QUICK ? 6 : 30));
  for (const r of ['titanen', 'kraken', 'tiran']) run('sim raid ' + r, () => sim({ map: E(`RAIDS.find(x=>x.id==='${r}').map`), diffIdx: 1, mode: 'raid', raid: r, raidDiff: 0 }, strong.concat([]), 10, QUICK ? 6 : 30));
  run('sim coop', () => sim({ map: 'baai', diffIdx: 1, mode: 'coop', coopPool: E('Online.coopPool()') }, strong, 10, 4));
  run('sim event', () => sim({ map: E('Meta.activeEvent().def.map'), diffIdx: 1, mode: 'event' }, ['heks', 'kerstagent', 'surfer', 'feestkoning', 'komeet', 'kampioen'], 8, QUICK ? 6 : 25));
  for (const m of ['kerker', 'wolken', 'lab']) run('sim secret ' + m, () => sim({ map: m, diffIdx: 1, mode: 'secret' }, strong, 10, QUICK ? 4 : 20));
  run('sim other event maps', () => { const out = []; for (const m of ['spookstad', 'kerstdorp', 'strand', 'stripstad']) out.push(sim({ map: m, diffIdx: 1, mode: 'event' }, ['heks', 'kerstagent', 'surfer', 'titanenbreker', 'valkyrie', 'kampioen'], 10, 3).kills); return out; });
  run('missions after play', () => { E(`nav('missions')`); const n = E('missionClaimables()'); for (const t of ['daily', 'perm', 'quests', 'ach']) { click($(`[data-act="mission-tab"][data-tab="${t}"]`)); let b; let guard = 0; while ((b = $('[data-act^="claim-"]')) && guard++ < 40) click(b); } return { claimables: n, level: E('Store.data.level'), tokens: E('Store.data.tokens'), raid: E('Store.data.raidTokens'), ach: Object.keys(E('Store.data.ach')).length }; });
  run('raid shop + event shop', () => { E(`Store.data.raidTokens = 1000; App.modeTab='raids'; nav('modes')`); for (const b of $$('[data-act="buy-raid"]:not([disabled])')) click(b); E(`Meta.evState(Meta.activeEvent()).cur = 2000; nav('event')`); for (const b of $$('[data-act="buy-event"]:not([disabled])')) click(b); return { skins: E('Store.data.skins.length'), titles: E('Store.data.titles.length') }; });
  run('prestige', () => { E(`Store.data.level = 25; for (const m of MAPS) Store.data.clears[m.id] = ['normal']; nav('profile')`); click($('[data-act="prestige"]')); click($('[data-act="prestige-yes"]')); return { p: E('Store.data.prestige'), coins: E('Store.data.coins'), lvl: E('Store.data.level') }; });
  run('leaderboard after play', () => { E(`App.lbSeason=true; App.lbCat='kills'; nav('leaderboard')`); return $$('.lb tbody tr').map(r => r.textContent.replace(/\s+/g, ' ').trim()).slice(0, 4); });
  if (WITH_DB) { await new Promise(r => setTimeout(r, 50)); run('db contents', () => ({ keys: Object.keys(dom.mock.store), mine: dom.mock.store['scores/u_me'] && dom.mock.store['scores/u_me'].a, coop: dom.mock.store['coop/u_me'] })); }
  run('reset', () => { E(`nav('settings')`); click($('#reset-btn')); click($('#reset-confirm')); return { coins: E('Store.data.coins'), heroes: Object.keys(E('Store.data.heroes')), prestige: E('Store.data.prestige') }; });
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED'); process.exitCode = errors.length ? 1 : 0;
})();
