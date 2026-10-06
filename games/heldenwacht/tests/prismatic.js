// v1.29: Prismatic (Aurora), tweede Godly (Eindrechter), Exotic Stormram, Godly in Kosmisch, endless max. 100.000 munten.
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
  E(`setPlayerName('Tester'); Store.data.settings.rareAnim = 'off'; window.ok = (c, m) => { if (!c) throw new Error(m); };
    window.solo = (id, tier = 0) => { grantHero(id); Store.data.heroes[id].level = 10; Store.data.team = [id]; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' });
      const g = App.game; g.cash = 1e9; const mid = g.pts[Math.floor(g.pts.length / 2)];
      const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)).sort((a, b) => ((a[0] * TILE + 20 - mid.x) ** 2 + (a[1] * TILE + 20 - mid.y) ** 2) - ((b[0] * TILE + 20 - mid.x) ** 2 + (b[1] * TILE + 20 - mid.y) ** 2))[0];
      g.placeHero(id, t[0], t[1]); const h = g.heroes[0]; for (let i = 0; i < tier; i++) g.upgrade(h); return { g, h }; };
    window.nearD = (g, h) => { let b = 0, bd = 1e9; for (let d = 0; d < g.leakD; d += 4) { const p = g.posAt(d), dd = (p.x - h.x) ** 2 + (p.y - h.y) ** 2; if (dd < bd) { bd = dd; b = d; } } return b; };
    window.step = (g, s) => { for (let t = 0; t < s && !g.over; t += 0.05) g.update(0.05); };
    window.dpsT = H => { const s = computeStats(H, 0, 10); return s.dmg * s.rate; };`);
  run('Prismatic boven Godly; Aurora alleen in Basic met 0,002%', () => E(`(() => {
    ok(RARITY_ORDER[RARITY_ORDER.length - 1] === 'prismatic' && rarOrd('prismatic') > rarOrd('godly'), RARITY_ORDER.join());
    const b = GACHAS.find(g => g.id === 'basic'), pool = gachaPool(b), a = pool.find(p => p.id === 'aurora');
    ok(a && Math.abs(a.rate - 0.002) < 1e-9, 'kans ' + (a && a.rate)); ok(Math.abs(Object.values(b.rates).reduce((x, y) => x + y, 0) - 100) < 1e-6, 'Basic telt niet op tot 100');
    ok(!pool.some(p => HERO[p.id].rarity === 'godly'), 'Godly nog in Basic');
    for (const g of GACHAS.filter(g => g.id !== 'basic')) ok(!gachaPool(g).some(p => p.id === 'aurora'), 'Aurora ook in ' + g.id);
    let n = 0; const N = 1000000; for (let i = 0; i < N; i++) if (rollFrom(pool).id === 'aurora') n++; ok(n >= 3 && n <= 50, 'getrokken ' + n + ' van ' + N);
    return { kans: a.rate + '%', getrokkenIn1M: n };
  })()`));
  run('De Eindrechter: één doel, veel hogere schade per doel dan andere Godly', () => E(`(() => {
    const E1 = HERO.eindrechter, s = computeStats(E1, 0, 10), k = computeStats(HERO.elementkoning, 0, 10);
    ok(E1.rarity === 'godly' && s.multi === 1 && !s.splash, 'niet single target'); ok(s.dmg * s.rate > k.dmg * k.rate * 3, 'per doel ' + Math.round(s.dmg * s.rate) + ' vs ' + Math.round(k.dmg * k.rate));
    const { g, h } = solo('eindrechter'); const e = g.spawnEnemy('tank', nearD(g, h), 10); e.hp = e.maxHp = 1e12; e.speed = 0; step(g, 3); ok(e.hp < 1e12, 'raakt niets');
    h.abilCd = 0; h.stunT = 0; const hp1 = e.hp; ok(g.useAbility(h), 'Vonnis'); ok(hp1 - e.hp > s.dmg * 20, 'Vonnis te zwak: ' + (hp1 - e.hp)); return { dpsPerDoel: Math.round(s.dmg * s.rate), koningPerDoel: Math.round(k.dmg * k.rate) };
  })()`));
  run('Aurora Prismatica: mega sterk en vertraagt alles in haar gloed zwaar', () => E(`(() => {
    const a = computeStats(HERO.aurora, 0, 10), k = computeStats(HERO.elementkoning, 0, 10);
    ok(a.dmg * a.rate * a.multi > k.dmg * k.rate * k.multi * 1.5, 'niet sterker dan Godly');
    const { g, h } = solo('aurora'); const es = []; for (let i = 0; i < 6; i++) { const e = g.spawnEnemy('tank', nearD(g, h) - 30 + i * 12, 10); e.hp = e.maxHp = 1e12; es.push(e); }
    step(g, 2); const slowed = es.filter(e => e.slowT > 0 && e.slowM >= 0.7).length; ok(slowed >= 5, 'vertraagd: ' + slowed);
    h.abilCd = 0; ok(g.useAbility(h), 'Regenboogstilte'); ok(es.every(e => e.slowM >= 0.9), 'ability vertraagt niet');
    return { dpsTotaal: Math.round(a.dmg * a.rate * a.multi), godlyTotaal: Math.round(k.dmg * k.rate * k.multi), vertraagd: slowed };
  })()`));
  run('Stormram: weinig schade, duwt ver terug', () => E(`(() => {
    const s = computeStats(HERO.stormram, 0, 10); ok(HERO.stormram.rarity === 'exotic' && s.dmg < 60 && s.knock >= 1.4, JSON.stringify({ dmg: s.dmg, knock: s.knock }));
    const { g, h } = solo('stormram'); const e = g.spawnEnemy('grunt', nearD(g, h) + 10, 3); e.hp = e.maxHp = 1e9; e.speed = 0; const d0 = e.d; step(g, 1.5); ok(e.d < d0 - TILE, 'niet teruggeduwd: ' + (d0 - e.d));
    h.abilCd = 0; const d1 = e.d; ok(g.useAbility(h), 'Orkaanstoot'); ok(e.d < d1 - 3 * TILE || e.d <= -19, 'ability duwt niet');
    return { schade: Math.round(s.dmg), terugInPx: Math.round(d0 - e.d) };
  })()`));
  run('Endless: hooguit 100.000 munten per potje', () => E(`(() => {
    Store.data.team = ['elementkoning']; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'endless' }); const g = App.game; g.wave = 400; g.cleared = 400; g.bossKills = 80; g.ms.dmg = 1e12;
    const c0 = Store.data.coins; g.lose(); const R = Meta.finishMatch(g); const got = Store.data.coins - c0;
    ok(got <= 100000 && got >= 99000, 'gekregen ' + got); ok(R.rows.some(r => /Endless-maximum/.test(r[0])), 'geen regel');
    closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'endless' }); const g2 = App.game; g2.wave = 10; g2.cleared = 10; const c1 = Store.data.coins; g2.lose(); Meta.finishMatch(g2); const small = Store.data.coins - c1;
    ok(small > 0 && small < 100000, 'kort potje ' + small);
    return { lang: got, kort: small };
  })()`));
  run('tekenen zonder fouten', () => E(`(() => { const { g, h } = solo('aurora'); g.spawnEnemy('grunt', 100, 3); step(g, 0.5); const ctx = document.createElement('canvas').getContext('2d'); g.render(ctx, 1); for (const id of ['aurora', 'eindrechter', 'stormram']) drawHero(ctx, HERO[id], 0, 0, 1, 0, {}); return true; })()`));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
