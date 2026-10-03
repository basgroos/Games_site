// Mystery-helden uit de Limited Gacha (v1.24): Levo de Jingeling en BoosGras.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
  beforeParse(w) { w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx()); }; w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {}; } });
const w = dom.window, errors = [];
w.addEventListener('error', e => { errors.push('window error'); console.log('WINDOW ERROR', e.message, e.lineno); });
const E = s => w.eval(s);
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); } }

setTimeout(() => {
  E(`setPlayerName('Tester'); Store.data.settings.rareAnim = 'off'; Store.data.settings.tips = false;
    window.ok = (c, m) => { if (!c) throw new Error(m); };
    for (const id of ['levo', 'boosgras']) { grantHero(id); Store.data.heroes[id].level = 5; }
    window.solo = (id, tier = 0) => {
      Store.data.team = [id]; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' });
      const g = App.game; g.cash = 1e6; const mid = g.pts[Math.floor(g.pts.length / 2)];
      const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)).sort((a, b) => ((a[0] * TILE + 20 - mid.x) ** 2 + (a[1] * TILE + 20 - mid.y) ** 2) - ((b[0] * TILE + 20 - mid.x) ** 2 + (b[1] * TILE + 20 - mid.y) ** 2))[0];
      g.placeHero(id, t[0], t[1]); const h = g.heroes[0]; for (let i = 0; i < tier; i++) g.upgrade(h); return { g, h };
    };
    window.step = (g, sec) => { for (let t = 0; t < sec && !g.over; t += 0.05) g.update(0.05); };
  `);
  run('beide zijn Mystery, alleen in de Limited Gacha', () => E(`(() => {
    const L = Meta.limitedSet().heroes, lim = GACHAS.find(x => x.limited), pool = gachaPool(lim).map(p => p.id);
    for (const id of ['levo', 'boosgras']) {
      const H = HERO[id]; ok(H.rarity === 'mystery' && H.exclusive === 'limited', id + ' rarity/exclusive');
      ok(L.includes(id) && pool.includes(id), id + ' niet in limited gacha');
      for (const g of GACHAS.filter(x => !x.limited)) ok(!gachaPool(g).some(p => p.id === id), id + ' ook in ' + g.name);
      ok(heroSource(H) === 'Limited Gacha', 'bron: ' + heroSource(H));
    }
    return { limited: L };
  })()`));
  run('Levo de Jingeling: oneindig bereik, ongeveer exotic-sterk', () => E(`(() => {
    const { g, h } = solo('levo'); const st = g.heroStats(h), fan = computeStats(HERO.fantoom, 0, 5);
    ok(st.range >= 90, 'bereik ' + st.range); ok(st.dmg * st.rate > fan.dmg * fan.rate * 0.8 && st.dmg * st.rate < fan.dmg * fan.rate * 1.4, 'dps ' + st.dmg * st.rate + ' vs exotic ' + fan.dmg * fan.rate);
    const far = g.spawnEnemy('grunt', 5, 3); far.hp = far.maxHp = 1e6; step(g, 3); ok(far.hp < 1e6, 'raakt ver weg niet');
    return { dps: Math.round(st.dmg * st.rate), exotic: Math.round(fan.dmg * fan.rate), bril: !!HERO.levo.look.glasses, wapen: HERO.levo.look.weapon };
  })()`));
  run('Loeky Aanval: honden rennen van de basis naar het portaal en raken iedereen', () => E(`(() => {
    const { g, h } = solo('levo'); const es = []; for (let i = 0; i < 8; i++) { const e = g.spawnEnemy('tank', 100 + i * 80, 5); e.hp = e.maxHp = 1e6; e.speed = 0; es.push(e); }
    h.abilCd = 0; g.useAbility(h); ok(g.dogs.length === 5, 'honden: ' + g.dogs.length); const d0 = g.dogs[0].d; step(g, 0.5); ok(g.dogs[0].d < d0, 'honden lopen niet richting portaal');
    step(g, 12); const hit = es.filter(e => e.hp < 1e6).length; ok(hit === 8, 'niet alle vijanden gebeten: ' + hit); ok(!g.dogs.length, 'honden niet verdwenen bij portaal');
    return { gebeten: hit, schadePerBeet: Math.round(h.st.dmg * 5) };
  })()`));
  run('Loeky Aura (ULTIMATE): 10 s lang honden met de grote Loeky voorop', () => E(`(() => {
    const { g, h } = solo('levo', 5); ok(h.tier === 5, 'tier'); h.abilCd = 0; g.useAbility(h);
    ok(g.dogs.some(d => d.big), 'geen grote Loeky'); let max = 0; for (let t = 0; t < 11; t += 0.05) { g.update(0.05); max = Math.max(max, g.dogs.length); }
    ok(max >= 10 && !(h.loekyAura > 0), 'aura: max ' + max); return { maxHonden: max };
  })()`));
  run('BoosGras: plasmaballen met mega-explosie', () => E(`(() => {
    const { g, h } = solo('boosgras'); const st = g.heroStats(h), fan = computeStats(HERO.fantoom, 0, 5);
    ok(st.splash >= 2, 'splash ' + st.splash); ok(HERO.boosgras.proj === 'plasma', 'proj');
    const mid = g.pts[Math.floor(g.pts.length / 2)]; let best = 0, bd = 1e9; for (let d = 0; d < g.leakD; d += 4) { const p = g.posAt(d), dd = (p.x - h.x) ** 2 + (p.y - h.y) ** 2; if (dd < bd) { bd = dd; best = d; } }
    const es = []; for (let i = 0; i < 6; i++) { const e = g.spawnEnemy('tank', best - 30 + i * 12, 5); e.hp = e.maxHp = 1e6; e.speed = 0; es.push(e); }
    step(g, 3); const hit = es.filter(e => e.hp < 1e6).length; ok(hit >= 5, 'explosie raakt er maar ' + hit);
    return { splash: st.splash, geraakt: hit, dpsPerDoel: Math.round(st.dmg * st.rate), exotic: Math.round(fan.dmg * fan.rate) };
  })()`));
  run('Boze Grasjes en Angry Gras: gras op het pad vertraagt en doet schade', () => E(`(() => {
    const { g, h } = solo('boosgras'); h.abilCd = 0; g.useAbility(h); const n = g.grass.length; ok(n > 2, 'gras: ' + n);
    const gp = g.grass[0]; const e = g.spawnEnemy('tank', gp.d, 5); e.hp = e.maxHp = 1e6; e.speed = 0.0001; step(g, 1); ok(e.hp < 1e6 && e.slowT > 0, 'geen schade/vertraging');
    const { g: g2, h: h2 } = solo('boosgras', 5); h2.abilCd = 0; g2.useAbility(h2); const n2 = g2.grass.length; ok(n2 > n * 2 && g2.grass.some(x => x.angry), 'Angry Gras te klein: ' + n2);
    step(g2, 13); ok(!g2.grass.length, 'gras verdwijnt niet');
    return { grasjes: n, angryGras: n2 };
  })()`));
  run('tekenen (bril, honden, gras) zonder fouten', () => E(`(() => { const g = App.game; const h = g.heroes[0]; h.abilCd = 0; g.useAbility(h); loekyDog(g, h, { dmg: 1, big: true }); g.update(0.3); const ctx = document.createElement('canvas').getContext('2d'); g.render(ctx, 1); drawHero(ctx, HERO.levo, 0, 0, 1, 0, {}); drawHero(ctx, HERO.boosgras, 0, 0, 1, 0, {}); return true; })()`));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
