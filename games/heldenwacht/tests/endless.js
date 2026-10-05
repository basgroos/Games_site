// Endless (v1.27): oplopend lastiger, rond golf 1000 onmogelijk.
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
  E(`setPlayerName('Tester'); window.ok = (c, m) => { if (!c) throw new Error(m); };
    for (const id of ['nul', 'omega']) { grantHero(id); Store.data.heroes[id].level = 10; }
    window.endless = (wave) => { Store.data.team = ['nul', 'omega']; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'endless' }); const g = App.game; g.cash = 1e9; g.wave = wave;
      const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)); g.placeHero('nul', t[3][0], t[3][1]); g.placeHero('omega', t[8][0], t[8][1]); for (const h of g.heroes) for (let i = 0; i < 5; i++) g.upgrade(h); return g; };`);
  run('moeilijkheid loopt geleidelijk op', () => E(`(() => {
    const W = [100, 300, 500, 700, 900, 1000], r = W.map(n => ({ n, treffer: +(endlessHitCap(n) * 100).toFixed(2), afweer: +endlessBypass(n).toFixed(2), snel: +endlessSpeed(n).toFixed(2), onstuit: +endlessUnstop(n).toFixed(2), ttk: +endlessTTK(n).toFixed(1), genezen: +endlessHeal(n).toFixed(2) }));
    for (let i = 1; i < r.length; i++) { ok(r[i].treffer <= r[i - 1].treffer && r[i].snel >= r[i - 1].snel && r[i].ttk >= r[i - 1].ttk, 'niet oplopend bij ' + r[i].n); }
    ok(r[0].treffer === 100 && r[0].ttk === 0 && r[0].afweer < 1, 'golf 100 te zwaar'); ok(r[5].ttk > 10 && r[5].treffer < 0.5 && r[5].afweer === 0 && r[5].onstuit === 1 && r[5].genezen === 0, 'golf 1000 te makkelijk');
    return r;
  })()`));
  run('golf 100: gewone schade, niets begrensd', () => E(`(() => {
    const g = endless(100), h = g.heroes[1], e = g.spawnEnemy('tank', 300, 100); const hp0 = e.hp; g.damage(e, 1000, h); ok(Math.round(hp0 - e.hp) > 0 && !e.ccImm, 'schade/onstuitbaar'); return { schade: Math.round(hp0 - e.hp) };
  })()`));
  run('golf 1000: één absurde klap haalt maar een klein stukje weg en uitwissen werkt niet', () => E(`(() => {
    const g = endless(1000), nul = g.heroes[0], e = g.spawnEnemy('grunt', 300, 1000);
    ok(e.ccImm, 'niet onstuitbaar'); ok(e.speed > ENEMIES.grunt.speed * 2, 'niet sneller');
    e.endBud = 1e300; g.damage(e, 1e300, nul); ok(!e.dead && e.hp > e.maxHp * 0.98, 'te veel schade: ' + (1 - e.hp / e.maxHp));
    let dead = 0; for (let i = 0; i < 200; i++) { const x = g.spawnEnemy('grunt', 300, 1000); g.damage(x, 10, nul); if (x.dead) dead++; } ok(dead === 0, 'uitgewist: ' + dead);
    return { procentWeg: +((1 - e.hp / e.maxHp) * 100).toFixed(3) };
  })()`));
  run('golf 1000: minimale tijd om een vijand te verslaan', () => E(`(() => {
    const g = endless(1000), h = g.heroes[1], e = g.spawnEnemy('grunt', 300, 1000); e.speed = 0; let t = 0;
    while (!e.dead && t < 120) { for (let i = 0; i < 50; i++) g.damage(e, 1e300, h); g.updateEnemy(e, 0.1); t += 0.1; }
    ok(t >= endlessTTK(1000) * 0.8, 'te snel verslagen: ' + t.toFixed(1) + ' s'); return { seconden: +t.toFixed(1), minimaal: +endlessTTK(1000).toFixed(1) };
  })()`));
  run('golf 1000: genezen van de basis werkt niet meer; lekkende baas kost geen 999 levens', () => E(`(() => {
    const g = endless(1000); g.hp = 50; const hp0 = g.hp; const orig = g.updateEnemy; g.update(0.05); g.hp += 0; const before = g.hp;
    g.useAbility = g.useAbility; const fake = Game.prototype.useAbility; g.hp = 50; const h = g.heroes[1]; h.abilCd = 0; const s = g.hp; Game.prototype.update.call(g, 0.01); ok(g.hp <= s, 'basis geneest');
    const b = g.spawnEnemy('overlord', 300, 1000); ok(b.E.leak < 200 && b.ccImm, 'baas lekt ' + b.E.leak); return { baasLek: b.E.leak };
  })()`));
  run('De Nul groeit niet mee met endless-HP (schade per klap en ability)', () => E(`(() => {
    const out = {};
    for (const wave of [40, 400, 900]) {
      const g = endless(wave), nul = g.heroes[0]; let sum = 0, n = 0;
      for (let i = 0; i < 150; i++) for (const type of ['grunt', 'tank', 'kolos']) { const e = g.spawnEnemy(type, 300, wave); e.speed = 0; e.hp = e.maxHp = 1e15; e.endBud = Infinity; e.endRate = 0; const hp0 = e.hp; g.damage(e, nul.st.dmg, nul); sum += hp0 - Math.max(0, e.hp); n++; }
      // ability: kan niet meer de hele map wegvagen
      const es = []; for (let i = 0; i < 10; i++) { const e = g.spawnEnemy('tank', 200 + i * 10, wave); e.speed = 0; e.hp = e.maxHp = 1e15; e.endBud = Infinity; e.endRate = 0; es.push(e); }
      const before = es.reduce((a, e) => a + e.hp, 0); nul.abilCd = 0; g.useAbility(nul); for (let i = 0; i < 20; i++) g.update(0.05);
      const abil = before - es.reduce((a, e) => a + Math.max(0, e.hp), 0);
      out[wave] = { perKlap: Math.round(sum / n), klapNul: Math.round(nul.st.dmg), ability: Math.round(abil) };
    }
    const r = out[900].perKlap / out[40].perKlap, ra = out[900].ability / Math.max(1, out[40].ability);
    ok(r < 2 && ra < 3, 'groeit nog: per klap ×' + r.toFixed(1) + ', ability ×' + ra.toFixed(1));
    return Object.assign(out, { verhoudingKlap: +r.toFixed(2), verhoudingAbility: +ra.toFixed(2) });
  })()`));
  run('buiten endless blijft De Nul hetzelfde (ability wist gewone vijanden)', () => E(`(() => {
    Store.data.team = ['nul']; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); const g = App.game; g.cash = 1e9; const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)); g.placeHero('nul', t[3][0], t[3][1]); const nul = g.heroes[0];
    const es = []; for (let i = 0; i < 10; i++) { const e = g.spawnEnemy('tank', 200 + i * 10, 5); e.hp = e.maxHp = 1e7; e.speed = 0; es.push(e); }
    nul.abilCd = 0; g.useAbility(nul); for (let i = 0; i < 20; i++) g.update(0.05); ok(es.every(e => e.dead), 'campagne-ability wist niet meer alles'); return true;
  })()`));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
