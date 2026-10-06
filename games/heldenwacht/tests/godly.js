// v1.28: gacha's weg + tickets omgezet, rarity Godly (Koning der Elementen), element-Ultra's, gif en 100× openen.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const store = { 'heldenwacht-save': null };
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
    window.step = (g, s) => { for (let t = 0; t < s && !g.over; t += 0.05) g.update(0.05); };`);
  run('Legendary-, Epic- en Mythic Gacha zijn weg', () => E(`(() => { const ids = GACHAS.map(g => g.id); ok(!['legendary', 'epic', 'mythic'].some(x => ids.includes(x)), ids.join(',')); return ids; })()`));
  run("tickets van die gacha's worden omgezet (in bezit en bij beloningen)", () => E(`(() => {
    const D = Store.data; D.tickets = { legendary: 2, epic: 1, mythic: 1, rare: 0, cosmic: 0 }; convertOwnedTickets();
    ok(D.tickets.rare === 8 && D.tickets.cosmic === 1 && !D.tickets.legendary && !D.tickets.epic && !D.tickets.mythic, JSON.stringify(D.tickets));
    Meta.grant({ tickets: { legendary: 1 } }); ok(D.tickets.rare === 11, 'beloning niet omgezet: ' + D.tickets.rare);
    const txt = Meta.rewardText({ tickets: { mythic: 2 } }).join(); ok(/Kosmisch/.test(txt), txt);
    const shopTxt = Shop.items('tickets').concat(Shop.items('deals'), Shop.items('rot')).map(x => x.text).join(' | '); ok(!/(Legendary|Epic|Mythic) Ticket/.test(shopTxt), shopTxt);
    return { tickets: D.tickets, tekst: txt };
  })()`));
  run('Godly bestaat boven Secret; Godly-helden alleen in de Kosmische Gacha, 0,01% per held', () => E(`(() => {
    ok(rarOrd('godly') > rarOrd('secret') && rarOrd('prismatic') > rarOrd('godly'), RARITY_ORDER.join());
    const b = GACHAS.find(g => g.id === 'cosmic'), pool = gachaPool(b), k = pool.find(p => p.id === 'elementkoning'), k2 = pool.find(p => p.id === 'eindrechter');
    ok(k && k2 && Math.abs(k.rate - 0.01) < 1e-9 && Math.abs(k2.rate - 0.01) < 1e-9, 'kans ' + (k && k.rate) + ' / ' + (k2 && k2.rate)); ok(Math.abs(Object.values(b.rates).reduce((a, c) => a + c, 0) - 100) < 1e-6, 'kansen tellen niet op tot 100');
    for (const g of GACHAS.filter(g => g.id !== 'cosmic')) ok(!gachaPool(g).some(p => p.id === 'elementkoning' || p.id === 'eindrechter'), 'ook in ' + g.id);
    ok(!Shop.heroPool(['godly']).length, 'in de winkel');
    let n = 0; const N = 400000; for (let i = 0; i < N; i++) if (rollFrom(pool).id === 'elementkoning') n++; ok(n >= 12 && n <= 75, 'getrokken ' + n + ' van ' + N);
    return { kans: k.rate + '%', getrokkenIn400k: n };
  })()`));
  run('Koning der Elementen is extreem sterk en doet vuur, ijs en gif', () => E(`(() => {
    const { g, h } = solo('elementkoning'); const st = g.heroStats(h), neb = computeStats(HERO.nebula, 0, 10), uk = st.dmg * st.rate * st.multi, un = neb.dmg * neb.rate * neb.multi;
    ok(uk > un * 4, 'niet extreem sterk genoeg: ' + Math.round(uk) + ' vs Ultra ' + Math.round(un));
    const es = []; for (let i = 0; i < 6; i++) { const e = g.spawnEnemy('tank', nearD(g, h) - 20 + i * 8, 10); e.hp = e.maxHp = 1e9; e.speed = 0; es.push(e); }
    step(g, 4); const burn = es.some(e => e.burnT > 0), slow = es.some(e => e.slowT > 0), gif = es.some(e => e.poisonT > 0);
    ok(burn && slow && gif, JSON.stringify({ burn, slow, gif }));
    h.abilCd = 0; ok(g.useAbility(h), 'ability'); h.tier = 5; h.abilCd = 0; ok(g.useAbility(h), 'ultimate');
    return { dpsKoning: Math.round(uk), dpsUltra: Math.round(un), keer: +(uk / un).toFixed(1) };
  })()`));
  run("vier element-Ultra's (vuur, ijs, gif, bliksem) met werkende abilities", () => E(`(() => {
    const out = {};
    for (const id of ['pyra', 'glaciera', 'venoma', 'voltara']) {
      ok(HERO[id].rarity === 'ultra' && GACHAS.some(g => gachaPool(g).some(p => p.id === id)), id + ' niet in een gacha');
      const { g, h } = solo(id); const es = []; for (let i = 0; i < 4; i++) { const e = g.spawnEnemy('tank', nearD(g, h) - 10 + i * 8, 10); e.hp = e.maxHp = 1e8; e.speed = 0; es.push(e); }
      step(g, 3); const hit = es.filter(e => e.hp < 1e8).length; ok(hit > 0, id + ' raakt niets');
      h.abilCd = 0; ok(g.useAbility(h), id + ' ability'); step(g, 1);
      out[id] = { geraakt: hit, gif: es.some(e => e.poisonT > 0), bevroren: es.some(e => e.stunT > 0), brand: es.some(e => e.burnT > 0) };
    }
    ok(out.venoma.gif && out.glaciera.bevroren && out.pyra.brand, JSON.stringify(out)); return out;
  })()`));
  run('gif doet schade per seconde', () => E(`(() => { const { g } = solo('venoma'); const e = g.spawnEnemy('tank', 30, 5); e.hp = e.maxHp = 1e6; e.speed = 0; g.applyStatus(e, Object.assign({}, STAT_DEFAULTS, { poison: 1000, poisonDur: 3 })); const h0 = e.hp; for (let i = 0; i < 20; i++) g.updateEnemy(e, 0.05); ok(h0 - e.hp > 500, 'gif ' + (h0 - e.hp)); return Math.round(h0 - e.hp); })()`));
  run('100× openen: kost 90×, 100 helden, garantie per 10, overzicht', () => E(`(() => {
    closeOverlay(); const D = Store.data; D.coins = 1e7; const c0 = D.coins, p0 = D.stats.pulls; App.gachaSel = 'basic'; nav('gacha');
    const btn = document.querySelector('#scr-gacha [data-act="pull"][data-n="100"]'); ok(btn && !btn.disabled, 'geen 100×-knop');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const g = GACHAS.find(x => x.id === 'basic'); const back = App.reveal.res.reduce((a, r) => a + (r.coins || 0), 0); ok(c0 - D.coins + back === g.price * 90, 'kosten ' + (c0 - D.coins + back)); ok(D.stats.pulls - p0 === 100, 'pulls ' + (D.stats.pulls - p0));
    const res = App.reveal.res; ok(res.length === 100, 'resultaten ' + res.length);
    for (let b = 0; b < 10; b++) ok(res.slice(b * 10, b * 10 + 10).some(r => r.id && rarOrd(HERO[r.id].rarity) >= rarOrd(g.guarantee10)), 'garantie mist in blok ' + b);
    const items = document.querySelectorAll('#reveal .p100-it').length; ok(items > 0 && items <= 100, 'overzicht ' + items);
    for (const x of GACHAS.filter(x => !x.limited)) { App.gachaSel = x.id; renderGacha(); }
    return { soorten: items, prijs: g.price * 90 };
  })()`));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
