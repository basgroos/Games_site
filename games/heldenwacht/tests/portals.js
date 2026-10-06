// v1.31: portalen (Underworld/Lunar), meerdere routes, The Devil en Moon Empress.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {}, setTransform() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
  beforeParse(w) { w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx()); }; w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {}; } });
const w = dom.window, errors = [];
w.addEventListener('error', e => { errors.push('window error'); console.log('WINDOW ERROR', e.message, e.lineno); });
const E = s => w.eval(s);
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); } }
setTimeout(() => {
  E(`setPlayerName('Tester'); Store.data.settings.rareAnim = 'off'; window.ok = (c, m) => { if (!c) throw new Error(m); };
    window.step = (g, s) => { for (let t = 0; t < s && !g.over; t += 0.05) g.update(0.05); };
    window.withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
    window.fakeEnd = (g, win) => { g.result = { win }; g.cleared = win ? (isFinite(g.totalWaves) ? g.totalWaves : 10) : 3; return Meta.finishMatch(g); };
    Store.data.team = ['vuist'];`);
  run('twee portaal-maps: Onderwereld met 2 routes, Maan met 3; alle routes eindigen bij de basis', () => E(`(() => {
    const out = {};
    for (const [id, n] of [['onderwereld', 2], ['maanbasis', 3]]) {
      closeOverlay(); startMatch({ map: id, diffIdx: 1, mode: 'endless' }); const g = App.game; ok(g && g.map.id === id, 'start ' + id);
      ok(g.lanes && g.lanes.length + 1 === n, id + ' routes ' + (g.lanes ? g.lanes.length + 1 : 1));
      for (let l = 1; l <= g.lanes.length; l++) { const L = g.lanes[l - 1], a = g.posAtL(l, L.joinD - 0.01), b = g.posAt(L.joinD); ok(Math.hypot(a.x - b.x, a.y - b.y) < 6, id + ' route ' + l + ' sluit niet aan'); ok(Math.abs(L.k - 1) < 0.25, id + ' route ' + l + ' lengte x' + L.k.toFixed(2)); }
      const starts = [g.posAtL(0, 0)].concat(g.lanes.map((L, i) => g.posAtL(i + 1, 0)));
      for (const [x, y] of SMAP[id].lanes.flat()) ok(g.pathSet.has(x + ',' + y) || x < 0 || y < 0 || x >= COLS || y >= ROWS, 'route-tegel niet geblokkeerd ' + x + ',' + y);
      ok(!g.freeTiles.some(([x, y]) => SMAP[id].lanes.some(L => L.some(([a, b]) => a === x && b === y))), 'helden mogen op de route');
      out[id] = { routes: n, starts: starts.map(p => [Math.round(p.x), Math.round(p.y)]) };
    }
    ok(out.onderwereld.starts[0][0] < 100 && out.onderwereld.starts[1][0] > 860, 'Onderwereld: niet van links en rechts');
    ok(out.maanbasis.starts.some(p => p[1] < 40) && out.maanbasis.starts.some(p => p[0] < 40) && out.maanbasis.starts.some(p => p[0] > 920), 'Maan: niet van boven, links en rechts');
    return out;
  })()`));
  run('vijanden verdelen zich over de routes en lopen naar de basis', () => E(`(() => {
    closeOverlay(); startMatch({ map: 'maanbasis', diffIdx: 0, mode: 'endless' }); const g = App.game; g.heroes = [];
    const es = []; for (let i = 0; i < 9; i++) { const e = g.spawnEnemy('runner', -10, 1); es.push(e); }
    const cnt = [0, 0, 0]; es.forEach(e => cnt[e.lane]++); ok(cnt.every(c => c === 3), 'verdeling ' + cnt);
    const x0 = es.map(e => Math.round(e.x)); ok(new Set(x0).size >= 3, 'zelfde startplek');
    const hp0 = g.hp; step(g, 60); ok(es.every(e => e.dead), 'niet aangekomen'); ok(g.hp < hp0, 'basis geen schade');
    const p = g.spawnEnemy('splitter', 30, 1); p.lane = 2; g._laneCtx = 2; const kid = g.spawnEnemy('grunt', 60, 1); g._laneCtx = null; ok(kid.lane === 2, 'kind volgt ouder');
    const snap = coopSnapshot(g); ok(snap.EL && snap.EL.some(r => r[1] === 2), 'co-op: routes niet in snapshot');
    return { verdeling: cnt };
  })()`));
  run('kans op een portaal: 0,5% eerste map, 3% laatste map, ×1,2 per moeilijkheid; wereld 1 Underworld, wereld 2 Lunar', () => E(`(() => {
    const w1 = MAPS.filter(m => (m.world || 1) === 1), w2 = MAPS.filter(m => m.world === 2);
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    ok(near(portalDropChance(w1[0], 0), 0.005) && near(portalDropChance(w1[w1.length - 1], 0), 0.03), 'wereld 1');
    ok(near(portalDropChance(w2[0], 0), 0.005) && near(portalDropChance(w2[w2.length - 1], 0), 0.03), 'wereld 2');
    ok(near(portalDropChance(w1[0], 2), 0.005 * 1.44) && near(portalDropChance(w1[w1.length - 1], 6), 0.03 * Math.pow(1.2, 6)), 'moeilijkheid');
    ok(portalWorldOfMap(w1[2]) === 'underworld' && portalWorldOfMap(w2[1]) === 'lunar' && portalWorldOfMap(SMAP.crypte) === null, 'wereld');
    return { eerste: portalDropChance(w1[0], 0), laatsteAfgrond: +portalDropChance(w1[w1.length - 1], 6).toFixed(4) };
  })()`));
  run('gewonnen gewoon potje kan een Rare portaal geven; verloren of andere modi niet', () => E(`(() => {
    Store.data.portals = {};
    closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); let g = App.game; withRandom(0.001, () => fakeEnd(g, true));
    ok(portalCount('underworld', 'rare') === 1, 'geen portaal na winst: ' + JSON.stringify(Store.data.portals));
    closeOverlay(); startMatch({ map: MAPS.find(m => m.world === 2).id, diffIdx: 1, mode: 'campaign' }); g = App.game; withRandom(0.001, () => fakeEnd(g, true)); ok(portalCount('lunar', 'rare') === 1, 'lunar');
    closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); g = App.game; withRandom(0.001, () => fakeEnd(g, false)); ok(portalCount('underworld', 'rare') === 1, 'verlies gaf portaal');
    closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'endless' }); g = App.game; withRandom(0.001, () => fakeEnd(g, true)); ok(portalCount('underworld', 'rare') === 1, 'endless gaf portaal');
    closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); g = App.game; withRandom(0.99, () => fakeEnd(g, true)); ok(portalCount('underworld', 'rare') === 1, 'te veel portalen');
    return Store.data.portals;
  })()`));
  run('portaal openen: gebruikt het portaal, eigen map, moeilijkheid per tier, 20 golven', () => E(`(() => {
    Store.data.portals = { 'underworld:rare': 1, 'lunar:legendary': 1 }; closeOverlay();
    startMatch({ mode: 'portal', portal: { w: 'underworld', t: 'rare' } }); let g = App.game;
    ok(g.map.id === 'onderwereld' && g.diffIdx === 2 && g.totalWaves === 20, g.map.id + ' ' + g.diffIdx + ' ' + g.totalWaves); ok(portalCount('underworld', 'rare') === 0, 'niet gebruikt');
    ok(/Underworld Portal/.test(modeLabel(g)), modeLabel(g));
    const q = g.genWave(20); ok(q.some(x => x.type === 'kerkerheer'), 'eindbaas');
    closeOverlay(); App.game = null; startMatch({ mode: 'portal', portal: { w: 'underworld', t: 'rare' } }); ok(!App.game, 'zonder portaal toch gestart');
    startMatch({ mode: 'portal', portal: { w: 'lunar', t: 'legendary' } }); g = App.game; ok(g.map.id === 'maanbasis' && g.diffIdx === 4, 'lunar legendary');
    return { map: g.map.id, diff: g.diff.name };
  })()`));
  run('portaal winnen: munten, gems, kans op de held en het volgende portaal', () => E(`(() => {
    const D = Store.data; delete D.heroes.duivel; delete D.heroes.maankeizerin; D.portals = { 'underworld:rare': 1, 'underworld:legendary': 2, 'underworld:secret': 1, 'lunar:epic': 1 };
    closeOverlay(); startMatch({ mode: 'portal', portal: { w: 'underworld', t: 'rare' } }); let g = App.game, c0 = D.coins, gm0 = D.gems;
    let R = withRandom(0.5, () => fakeEnd(g, true)); ok(!D.heroes.duivel, 'held bij 50%'); ok(portalCount('underworld', 'epic') === 1, 'geen epic bij 50% (kans 80%)'); ok(D.coins > c0 && D.gems >= gm0 + 20, 'beloning ' + (D.coins-c0) + ' ' + (D.gems-gm0) + JSON.stringify(R.rows));
    closeOverlay(); startMatch({ mode: 'portal', portal: { w: 'underworld', t: 'legendary' } }); g = App.game; withRandom(0.2, () => fakeEnd(g, true)); ok(portalCount('underworld', 'secret') === 1, 'secret bij 20% (kans 10%)');
    closeOverlay(); startMatch({ mode: 'portal', portal: { w: 'underworld', t: 'legendary' } }); g = App.game; withRandom(0.05, () => fakeEnd(g, true)); ok(portalCount('underworld', 'secret') === 2 && D.heroes.duivel, 'legendary 5%: secret + held');
    delete D.heroes.duivel;
    closeOverlay(); startMatch({ mode: 'portal', portal: { w: 'underworld', t: 'secret' } }); g = App.game; R = withRandom(0.999, () => fakeEnd(g, true)); ok(D.heroes.duivel, 'secret portaal: The Devil niet gegarandeerd'); ok(R.rows.some(r => /The Devil/.test(r[0])), 'rij');
    closeOverlay(); startMatch({ mode: 'portal', portal: { w: 'lunar', t: 'epic' } }); g = App.game; withRandom(0.6, () => fakeEnd(g, false)); ok(portalCount('lunar', 'epic') === 0 && portalCount('lunar', 'legendary') === 0 && !D.heroes.maankeizerin, 'verlies gaf iets');
    const s = { r: 0, e: 0 }; for (let i = 0; i < 20000; i++) { const x = portalRoll('lunar', 'rare'); if (x.next) s.e++; if (x.hero) s.r++; } ok(s.e > 15500 && s.e < 16500, 'rare→epic ' + s.e); ok(s.r > 50 && s.r < 170, 'held uit rare ' + s.r);
    return { epicUitRare: s.e / 20000, heldUitRare: s.r / 20000 };
  })()`));
  run('samen spelen: host gebruikt het portaal, gast niet; uitnodiging past in de database', () => E(`(() => {
    const D = Store.data; D.portals = { 'lunar:rare': 1 };
    const inv = portalDecode({ map: 'pt:maanbasis', kind: 'coop', diff: 2 }); ok(inv.kind === 'portal' && inv.map === 'maanbasis', 'decode'); ok(('pt:maanbasis').length <= 32, 'te lang');
    closeOverlay(); startMatch({ map: 'maanbasis', diffIdx: 2, mode: 'coop2', back: 'friends', mp: { kind: 'portal', role: 'guest', opp: { id: 'x', name: 'Anna' }, seed: 1 } }); let g = App.game;
    ok(g.opts.portal && g.opts.portal.w === 'lunar' && g.opts.portal.t === 'rare' && portalCount('lunar', 'rare') === 1, 'gast');
    ok(g.totalWaves === 20 && /met Anna/.test(modeLabel(g)), modeLabel(g));
    closeOverlay(); startMatch({ map: 'maanbasis', diffIdx: 2, mode: 'coop2', back: 'friends', mp: { kind: 'portal', role: 'host', opp: { id: 'x', name: 'Anna' }, seed: 1 } }); g = App.game;
    ok(portalCount('lunar', 'rare') === 0 && g.opts.portal, 'host');
    const c0 = D.coins; withRandom(0.5, () => fakeEnd(g, true)); ok(portalCount('lunar', 'epic') === 1, 'co-op: volgende portaal'); 
    App.game.over = true; closeOverlay(); App.game = null; startMatch({ map: 'maanbasis', diffIdx: 2, mode: 'coop2', back: 'friends', mp: { kind: 'portal', role: 'host', opp: { id: 'x', name: 'Anna' }, seed: 1 } }); ok(!App.game, 'host zonder portaal gestart');
    return true;
  })()`));
  run('The Devil en Moon Empress: Secret, alleen uit portalen, abilities werken', () => E(`(() => {
    for (const id of ['duivel', 'maankeizerin']) { const H = HERO[id]; ok(H && H.rarity === 'secret' && H.exclusive === 'portal', id); ok(!GACHAS.some(g => gachaPool(g).some(p => p.id === id)), id + ' in gacha'); ok(!Shop.heroPool(['secret']).some(h => h.id === id), id + ' in winkel'); }
    const out = {};
    for (const id of ['duivel', 'maankeizerin']) {
      grantHero(id); Store.data.heroes[id].level = 10; Store.data.team = [id]; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); const g = App.game; g.cash = 1e9;
      const mid = g.pts[Math.floor(g.pts.length / 2)], t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)).sort((a, b) => ((a[0] * TILE + 20 - mid.x) ** 2 + (a[1] * TILE + 20 - mid.y) ** 2) - ((b[0] * TILE + 20 - mid.x) ** 2 + (b[1] * TILE + 20 - mid.y) ** 2))[0];
      g.placeHero(id, t[0], t[1]); const h = g.heroes[0];
      let nd = 0, bd = 1e9; for (let d = 0; d < g.leakD; d += 4) { const p = g.posAt(d), dd = (p.x - h.x) ** 2 + (p.y - h.y) ** 2; if (dd < bd) { bd = dd; nd = d; } }
      const es = []; for (let i = 0; i < 5; i++) { const e = g.spawnEnemy('tank', nd - 20 + i * 8, 10); e.hp = e.maxHp = 1e9; e.speed = 0; es.push(e); }
      step(g, 3); ok(es.some(e => e.hp < 1e9), id + ' raakt niets');
      if (id === 'maankeizerin') ok(es.some(e => e.vulnT > 0 && e.vulnM >= 0.2), 'geen maanlicht');
      const weak = g.spawnEnemy('grunt', nd, 10); weak.speed = 0; weak.hp = weak.maxHp * 0.1;
      h.abilCd = 0; ok(g.useAbility(h), id + ' ability'); ok(h.abilCd >= 40, 'cd ' + h.abilCd);
      if (id === 'duivel') { ok(weak.dead, 'niet geoogst'); ok(h.souls >= 1, 'geen zielen'); const s0 = g.heroStats(h).dmg; h.souls = 1000; ok(Math.abs(g.heroStats(h).dmg / s0 - 1.5 / (1 + 0.004 * 1)) < 0.05 || g.heroStats(h).dmg > s0, 'zielen'); }
      else { ok(es.every(e => e.stunT > 0 && e.vulnM >= 0.5), 'eclips'); ok(g.eclipseT > 0, 'donker'); }
      h.tier = 5; h.abilCd = 0; ok(g.useAbility(h), id + ' ultimate'); step(g, 1);
      out[id] = { schade: Math.round(1e9 - Math.min(...es.map(e => e.hp))) };
    }
    return out;
  })()`));
  run('Modi → Portalen toont beide portalen, aantallen en knoppen', () => E(`(() => {
    closeOverlay(); App.game = null; Store.data.portals = { 'underworld:rare': 2, 'lunar:secret': 1 }; App.modeTab = 'portals'; nav('modes');
    const tab = document.querySelector('#scr-modes [data-tab="portals"]'); ok(tab && tab.getAttribute('aria-pressed') === 'true', 'tab');
    ok(document.querySelectorAll('#scr-modes .portal-card').length === 2, 'kaarten'); ok(document.querySelectorAll('#scr-modes [data-act="portal-open"]:not([disabled])').length === 2, 'knoppen');
    const txt = document.querySelector('#scr-modes').textContent; ok(/Epic portaal: 80%/.test(txt) && /Legendary portaal: 50%/.test(txt) && /Secret portaal: 10%/.test(txt) && /0,5% kans/.test(txt), 'kansen in beeld'); ok(document.querySelectorAll('#scr-modes .portal-card canvas[data-portrait]').length >= 2, 'portret');
    ok(/The Devil/.test(document.querySelector('#scr-modes').textContent) && /Moon Empress/.test(document.querySelector('#scr-modes').textContent), 'helden');
    App.modeTab = 'endless'; renderModes(); ok(!document.querySelector('#portals-body'), 'blijft staan'); ok(document.querySelectorAll('#scr-modes [data-tab="portals"]').length === 1, 'dubbele tab');
    document.querySelector('#scr-modes [data-tab="portals"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); ok(document.querySelector('#portals-body'), 'tab klikken');
    document.querySelector('#scr-modes [data-act="portal-open"][data-w="lunar"][data-t="secret"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); ok(App.game && App.game.map.id === 'maanbasis' && portalCount('lunar', 'secret') === 0, 'openen via knop ' + (App.game && App.game.map.id) + ' ' + portalCount('lunar','secret') + ' ' + document.querySelectorAll('#scr-modes [data-act="portal-open"]').length);
    return true;
  })()`.replace('new w.MouseEvent', 'new MouseEvent').replace('new w.MouseEvent', 'new MouseEvent')));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
