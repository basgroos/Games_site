// Nieuwe helden (v1.23): elke held in een echt potje, plus zijn ability.
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
const ok = (c, m) => { if (!c) throw new Error(m); };
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); } }

setTimeout(() => {
  E(`setPlayerName('Tester'); Store.data.settings.rareAnim = 'off'; Store.data.settings.tips = false;
    window.ok = (c, m) => { if (!c) throw new Error(m); };
    window.T4 = ['premiejager','omkeerder','wortelaar','garnizoen','oerkiem','mesmera','singulara','drieling','dronemeester'];
    for (const id of T4) { grantHero(id); Store.data.heroes[id].level = 5; }
    // speel een potje met één held: plaats hem midden langs het pad, upgrade en draai seconden
    window.solo = (id, opts = {}) => {
      Store.data.team = [id]; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' });
      const g = App.game; g.cash = 1e6;
      const mid = g.pts[Math.floor(g.pts.length / 2)];
      const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)).sort((a, b) => ((a[0] * TILE + 20 - mid.x) ** 2 + (a[1] * TILE + 20 - mid.y) ** 2) - ((b[0] * TILE + 20 - mid.x) ** 2 + (b[1] * TILE + 20 - mid.y) ** 2))[0];
      g.placeHero(id, t[0], t[1]); const h = g.heroes[0];
      for (let i = 0; i < (opts.tier || 0); i++) g.upgrade(h);
      return { g, h };
    };
    window.dNear = (g, h) => { let best = 0, bd = 1e9; for (let d = 0; d <= g.leakD; d += 4) { const p = g.posAt(d), dd = (p.x - h.x) ** 2 + (p.y - h.y) ** 2; if (dd < bd) { bd = dd; best = d; } } return best; };
    window.step = (g, sec, fn) => { for (let t = 0; t < sec; t += 0.05) { g.update(0.05); if (fn) fn(); if (g.over) break; } };
    window.spawnAt = (g, type, d, n = 1, w = 6) => { const out = []; for (let i = 0; i < n; i++) out.push(g.spawnEnemy(type, d + i * 6, w)); return out; };
  `);

  run('alle 9 helden bestaan, hebben 5 upgrades, een ability en zitten in de gacha', () => {
    const r = E(`T4.map(id => { const H = HERO[id]; return [id, H.rarity, H.upgrades.length, !!ABILITIES[H.ability], typeof ABILITY_FX[H.ability], !!STYLE_LABEL[H.style], HEROES.filter(x => x.rarity === H.rarity && !x.exclusive).includes(H)]; })`);
    for (const x of r) ok(x[2] === 5 && x[3] && x[4] === 'function' && x[5] && x[6], 'held niet compleet: ' + JSON.stringify(x));
    return r.map(x => x[0] + ':' + x[1]);
  });
  run('Premiejager markeert een vijand; verslaan geeft premie', () => E(`(() => {
    const { g, h } = solo('premiejager', { tier: 2 }); const [e] = spawnAt(g, 'tank', dNear(g, h) - 8, 1, 8);
    step(g, 1); ok(e.bountyT > 0, 'niet gemarkeerd');
    const c0 = g.cash; e.hp = 1; g.damage(e, 50, h); const gain = g.cash - c0;
    ok(e.dead && gain > e.reward + 20, 'geen premie: ' + gain); return { premie: gain - e.reward };
  })()`));
  run('Omkeerder laat vijanden achteruit lopen', () => E(`(() => {
    const { g, h } = solo('omkeerder', { tier: 4 }); const es = spawnAt(g, 'tank', dNear(g, h) - 60, 6, 8); es.forEach(e => { e.hp = e.maxHp = 1e6; e.speed = 0.15; });
    let back = 0; step(g, 10, () => { for (const e of es) if (e.revT > 0) back++; }); ok(back > 0, 'Omkeerder keerde niemand om');
    const e = es[0]; h4Reverse(e, 2); const d0 = e.d; step(g, 1); ok(e.d < d0, 'loopt niet terug ' + d0 + ' → ' + e.d);
    const boss = g.spawnEnemy('kolos', 100, 5); h4Reverse(boss, 2); ok(boss.revT <= 0.61, 'baas te lang omgekeerd');
    return { omkeerTicks: back, terug: Math.round(d0 - e.d) };
  })()`));
  run('Wortelaar zet grondvijanden vast en vertraagt; vliegers niet', () => E(`(() => {
    const { g, h } = solo('wortelaar'); const [e] = spawnAt(g, 'tank', dNear(g, h) - 8, 1, 8); e.hp = e.maxHp = 1e6;
    let rooted = false; step(g, 4, () => { if (e.rootT > 0) rooted = true; }); ok(rooted, 'nooit vastgezet');
    h4Root(e, 2); const d0 = e.d; step(g, 1); ok(Math.abs(e.d - d0) < 1, 'beweegt tijdens wortels');
    const [f] = spawnAt(g, 'flyer', 50, 1, 4); h4Root(f, 2); ok(!(f.rootT > 0), 'vlieger vastgezet');
    return { vast: true, vines: (g.vines || []).length };
  })()`));
  run('Garnizoen stuurt soldaten van de basis naar het portaal; ze houden vijanden op', () => E(`(() => {
    const { g, h } = solo('garnizoen', { tier: 2 }); g.startWave(); step(g, 6);
    ok((g.allies || []).length > 0, 'geen soldaten'); const a = g.allies[0], d0 = a.d; g.enemies.forEach(e => e.hp = 0); g.enemies = []; step(g, 1);
    ok(a.d < d0, 'soldaat loopt niet richting portaal');
    const [e] = spawnAt(g, 'grunt', a.d - 30, 1, 2); e.hp = e.maxHp = 1e6; step(g, 3); const de = e.d; step(g, 1);
    ok(e.d - de < 5, 'vijand niet tegengehouden: ' + (e.d - de)); return { soldaten: g.allies.length };
  })()`));
  run('Oerkiem groeit per golf en krijgt meteoren vanaf groei 15', () => E(`(() => {
    const { g, h } = solo('oerkiem'); const d0 = g.heroStats(h).dmg; g.wave = 16; const st = g.heroStats(h);
    ok(h.growth === 16 && st.dmg > d0 * 2 && st.cleave > 0 && st.stunChance > 0, 'groei klopt niet ' + h.growth + ' ' + d0 + '→' + st.dmg);
    const es = spawnAt(g, 'tank', dNear(g, h) - 8, 3, 8); es.forEach(e => { e.hp = e.maxHp = 1e7; e.speed = 0; });
    let comet = 0; step(g, 8, () => { comet += g.effects.filter(f => f.type === 'strike' && f.kind === 'comet' && f.h === h).length; });
    ok(comet > 0, 'geen meteoren'); return { groei: h.growth, schade: Math.round(d0) + ' → ' + Math.round(st.dmg) };
  })()`));
  run('Mesmera hypnotiseert vijanden; die lopen terug en vechten', () => E(`(() => {
    const { g, h } = solo('mesmera', { tier: 4 }); const es = spawnAt(g, 'grunt', dNear(g, h) - 30, 12, 3);
    step(g, 8); const hyp = (g.allies || []).filter(a => a.kind === 'hyp');
    const boss = g.spawnEnemy('kolos', 50, 5); ok(!h4Hypno(g, boss, h), 'baas gehypnotiseerd');
    ok(hyp.length > 0, 'niemand gehypnotiseerd (kills ' + g.kills + ')'); const a = hyp[0], d0 = a.d; step(g, 0.5); ok(a.gone || a.d <= d0, 'loopt niet terug'); return { gehypnotiseerd: hyp.length, kills: g.kills };
  })()`));
  run('Singulara trekt vijanden naar één punt', () => E(`(() => {
    const { g, h } = solo('singulara'); const es = spawnAt(g, 'tank', dNear(g, h) - 30, 6, 8); es.forEach((e, i) => { e.d += i * 12; e.hp = e.maxHp = 1e7; e.speed = 0; });
    const spread0 = Math.max(...es.map(e => e.d)) - Math.min(...es.map(e => e.d));
    let wells = 0; step(g, 4, () => { wells = Math.max(wells, (g.wells || []).length); });
    const spread1 = Math.max(...es.map(e => e.d)) - Math.min(...es.map(e => e.d));
    ok(wells > 0 && spread1 < spread0 * 0.5, 'niet samengetrokken ' + spread0 + ' → ' + spread1); return { spreiding: Math.round(spread0) + ' → ' + Math.round(spread1) };
  })()`));
  run('De Drieling valt met drie verschillende helden aan', () => E(`(() => {
    const { g, h } = solo('drieling'); const es = spawnAt(g, 'tank', dNear(g, h) - 8, 4, 8); es.forEach(e => { e.hp = e.maxHp = 1e7; e.speed = 0; }); spawnAt(g, 'flyer', dNear(g, h) - 8, 2, 6).forEach(e => { e.hp = e.maxHp = 1e7; e.speed = 0; });
    const seen = new Set(); step(g, 4, () => { (h.trioAtk || []).forEach((v, i) => { if (v === 1) seen.add(i); }); });
    ok(seen.size === 3, 'niet alle drie aangevallen: ' + [...seen]); return { aanvallers: [...seen].map(i => HERO.drieling.trio[i].name) };
  })()`));
  run('Dronemeester: drones vallen zelf aan en stijgen in level', () => E(`(() => {
    const { g, h } = solo('dronemeester', { tier: 1 }); spawnAt(g, 'grunt', dNear(g, h) - 8, 30, 1);
    step(g, 10); ok(h.dr && h.dr.length === 3, 'drones: ' + (h.dr || []).length); ok(g.kills > 5, 'drones doden niets');
    h.droneXp = 130; step(g, 0.2); ok(h.droneLvl === 10, 'level ' + h.droneLvl); return { drones: h.dr.length, kills: g.kills, level: h.droneLvl };
  })()`));
  run('alle abilities en ULTIMATEs werken zonder fouten', () => E(`(() => {
    const res = {};
    for (const id of T4) {
      const { g, h } = solo(id, { tier: 5 }); g.startWave(); spawnAt(g, 'grunt', dNear(g, h) - 30, 8, 4); step(g, 1);
      h.abilCd = 0; const used = g.useAbility(h); step(g, 3); res[id] = used && h.tier === 5;
    }
    ok(Object.values(res).every(Boolean), JSON.stringify(res)); return Object.keys(res).length;
  })()`));
  run('volledig potje met alle nieuwe helden samen haalt golf 10 zonder fouten', () => E(`(() => {
    Store.data.team = T4.slice(0, 8); closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); const g = App.game; g.cash = 50000;
    const tiles = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)); let k = 0; for (const id of Store.data.team) { const t = tiles[k += 5]; g.placeHero(id, t[0], t[1]); }
    g.autoWave = true; g.startWave(); for (let t = 0; t < 400 && g.wave < 10 && !g.over; t += 0.05) { g.update(0.05); if (g.canStartWave() && !g.queue.length && !g.enemies.length) g.startWave(); for (const h of g.heroes) if (h.abilCd <= 0) g.useAbility(h); }
    ok(g.wave >= 10 && g.hp > 0, 'golf ' + g.wave + ' hp ' + g.hp); return { golf: g.wave, hp: Math.round(g.hp), bondgenoten: (g.allies || []).length };
  })()`));
  run('tekenen van alle helden (ook drieling-portret) zonder fouten', () => E(`(() => { const g = App.game; const ctx = document.createElement('canvas').getContext('2d'); g.render(ctx, 1); for (const id of T4) drawHero(ctx, HERO[id], 0, 0, 1, 0.5, {}); return true; })()`));

  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
