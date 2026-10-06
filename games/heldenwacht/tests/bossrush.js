// v1.30: Boss Rush met meer bazen (even zwaar), eerst tickets bij trekken, Rafael Verbrand.
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
    window.step = (g, s) => { for (let t = 0; t < s && !g.over; t += 0.05) g.update(0.05); };
    window.nearD = (g, h) => { let b = 0, bd = 1e9; for (let d = 0; d < g.leakD; d += 4) { const p = g.posAt(d), dd = (p.x - h.x) ** 2 + (p.y - h.y) ** 2; if (dd < bd) { bd = dd; b = d; } } return b; };
    window.solo = (id, tier = 0) => { grantHero(id); Store.data.heroes[id].level = 10; Store.data.team = [id]; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' });
      const g = App.game; g.cash = 1e9; const mid = g.pts[Math.floor(g.pts.length / 2)];
      const t = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)).sort((a, b) => ((a[0] * TILE + 20 - mid.x) ** 2 + (a[1] * TILE + 20 - mid.y) ** 2) - ((b[0] * TILE + 20 - mid.x) ** 2 + (b[1] * TILE + 20 - mid.y) ** 2))[0];
      g.placeHero(id, t[0], t[1]); const h = g.heroes[0]; for (let i = 0; i < tier; i++) g.upgrade(h); return { g, h }; };`);
  run('Boss Rush heeft 23 bazen, allemaal echte (geen raid)bazen, geen dubbele', () => E(`(() => {
    ok(BOSSRUSH.length === 23, 'aantal ' + BOSSRUSH.length); ok(new Set(BOSSRUSH).size === 23, 'dubbel');
    for (const b of BOSSRUSH) ok(ENEMIES[b] && ENEMIES[b].boss && !ENEMIES[b].worldBoss, 'geen geldige baas: ' + b);
    ok(BOSSRUSH[BOSSRUSH.length - 1] === 'chaoskoning', 'eindbaas'); return BOSSRUSH.length;
  })()`));
  run('even zwaar: laatste baas heeft dezelfde HP-schaal als de oude fase 12, eerste fase onveranderd', () => E(`(() => {
    Store.data.team = ['vuist']; closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'bossrush' }); const g = App.game;
    const base = g.mode; ok(base === 'bossrush', 'modus');
    const bossHp = (n) => { const e = g.spawnEnemy('chaoskoning', 10, n); const v = e.maxHp; e.dead = true; return v; };
    const oldScale = 1 + 11 * 0.4, newScale = 1 + 22 * 0.4;
    const last = bossHp(23), first = bossHp(1);
    ok(Math.abs(last / first - oldScale) < 0.01, 'eindfase-schaal ' + (last / first));
    const esc = n => { const e = g.spawnEnemy('grunt', 10, n); const v = e.maxHp; e.dead = true; return v; };
    const r = (esc(23) / esc(1)) / (g.hpScale(36) / g.hpScale(3)); ok(r > 0.85 && r < 1.1, 'escort-schaal t.o.v. oude eindfase ' + r);
    const q = g.genBossRush(23); ok(q[q.length - 1].type === 'chaoskoning' && q.filter(x => x.type !== '__pause').length - 1 === 3 + 12 * 2, 'escortes eindfase ' + q.length);
    ok(g.totalWaves === 23, 'golven ' + g.totalWaves);
    return { eindbaasHPx: +(last / first).toFixed(2), oudeEindbaasHPx: oldScale };
  })()`));
  run('veel meer beloningen', () => E(`(() => {
    const g = App.game, D = Store.data; g.ms.bossKillsList = BOSSRUSH.slice(); g.result = { win: true }; g.cleared = 23; const c0 = D.coins, gm0 = D.gems, t0 = D.tickets.cosmic || 0;
    const R = Meta.finishMatch(g); const dc = D.coins - c0;
    let oldC = 0; for (let i = 1; i <= 12; i++) oldC += 220 * i;
    ok(dc > oldC * 3, 'munten ' + dc + ' vs oud ' + oldC); ok(D.gems - gm0 >= 23 * 2 + 23 * 6 + 150, 'gems ' + (D.gems - gm0)); ok((D.tickets.cosmic || 0) - t0 >= 5, 'kosmisch ' + ((D.tickets.cosmic || 0) - t0));
    ok(R.rows.some(r => /Boss Rush-bonus/.test(r[0])), 'rij');
    return { munten: dc, oudMax: oldC, gems: D.gems - gm0, kosmisch: (D.tickets.cosmic || 0) - t0 };
  })()`));
  run('trekken gebruikt eerst de tickets van die gacha', () => E(`(() => {
    closeOverlay(); const D = Store.data, g = GACHAS.find(x => x.id === 'basic'), tk = ticketFor('basic'); ok(tk, 'geen ticket voor basic');
    D.tickets[tk] = 3; D.coins = 1e6; let c0 = D.coins; doPull('basic', 10);
    let back = App.reveal.res.reduce((a, r) => a + (r.coins || 0), 0); closeOverlay();
    ok(D.tickets[tk] === 0, 'tickets ' + D.tickets[tk]); const paid = c0 - D.coins + back; ok(paid === g.price * 9 - Math.round(3 * g.price * 0.9), 'betaald ' + paid);
    D.tickets[tk] = 15; c0 = D.coins; doPull('basic', 10); back = App.reveal.res.reduce((a, r) => a + (r.coins || 0), 0); closeOverlay();
    ok(D.tickets[tk] === 5 && c0 - D.coins + back === 0, 'tickets ' + D.tickets[tk] + ' betaald ' + (c0 - D.coins + back));
    closeOverlay(); D.tickets[tk] = 2; D.coins = 0; doPull('basic', 10); ok(D.tickets[tk] === 2 && D.coins === 0, 'te weinig: niets mag veranderen');
    D.tickets[tk] = 1; c0 = D.coins; doPull('basic', 1); ok(D.tickets[tk] === 0 && D.coins === c0 + App.reveal.res.reduce((a, r) => a + (r.coins || 0), 0), '1× met ticket'); closeOverlay();
    D.tickets[tk] = 4; App.gachaSel = 'basic'; nav('gacha'); ok(document.querySelector('#scr-gacha .tk-first'), 'geen uitleg in het scherm');
    return { betaaldMet3Tickets: paid };
  })()`));
  run('Rafael Verbrand: mystery, alleen in de Limited Gacha, ongeveer Exotic-sterk', () => E(`(() => {
    const h = HERO.rafael; ok(h && h.rarity === 'mystery' && h.ability === 'brandbom', 'held');
    ok(MYSTERY_LIMITED.includes('rafael'), 'niet in MYSTERY_LIMITED');
    const lim = GACHAS.filter(g => gachaPool(g).some(p => p.id === 'rafael')).map(g => g.id); ok(lim.length && GACHAS.filter(g => lim.includes(g.id)).every(g => g.limited), 'gachas ' + lim.join());
    const st = computeStats(h, 0, 10), ex = HEROES.filter(x => x.rarity === 'exotic').map(x => { const s = computeStats(x, 0, 10); return s.dmg * s.rate * s.multi; });
    const me = st.dmg * st.rate * st.multi, avg = ex.reduce((a, b) => a + b, 0) / ex.length; ok(me > avg * 0.5 && me < avg * 2.5, 'dps ' + me + ' vs exotic ' + avg);
    ok(ABILITIES.brandbom.cd >= 50, 'cooldown ' + ABILITIES.brandbom.cd);
    return { dps: Math.round(me), exoticGem: Math.round(avg), cd: ABILITIES.brandbom.cd, gachas: lim };
  })()`));
  run('Brandbom zet het hele pad in de fik en doet vuurschade', () => E(`(() => {
    const { g, h } = solo('rafael'); const es = [];
    for (const f of [0.05, 0.3, 0.6, 0.95]) { const e = g.spawnEnemy('tank', g.leakD * f, 10); e.hp = e.maxHp = 1e9; e.speed = 0; es.push(e); }
    h.abilCd = 0; ok(g.useAbility(h), 'ability'); ok(h.abilCd > 50, 'cd ' + h.abilCd);
    const P = g.fires; ok(P && P.length > 5, 'vuur ' + (P && P.length));
    const cover = es.every(e => P.some(f => (f.x - e.x) ** 2 + (f.y - e.y) ** 2 < (f.r + 10) ** 2)); ok(cover, 'niet het hele pad');
    step(g, 2); ok(es.every(e => e.hp < 1e9 && e.burnT > 0), 'schade/brand ' + es.map(e => Math.round(1e9 - e.hp)).join(','));
    step(g, 8); ok(!g.fires.length, 'vuur dooft niet');
    h.tier = 5; h.abilCd = 0; ok(g.useAbility(h), 'ultimate'); ok(g.fires[0].max === 12, 'ult duur');
    const snap = coopSnapshot(g); ok(snap.X6 && snap.X6.length, 'co-op snapshot');
    return { vlammen: P.length, schade: es.map(e => Math.round(1e9 - e.hp)) };
  })()`));
  run('Legendary en hoger: -30% schade en -30% aanvalssnelheid, lagere rarities gelijk', () => E(`(() => {
    const out = {};
    for (const h of HEROES) {
      const s = computeStats(h, 0, 1), b = Object.assign({}, STAT_DEFAULTS, h.base), hi = rarOrd(h.rarity) >= rarOrd('legendary');
      const fd = s.dmg / (b.dmg || 1), fr = s.rate / (b.rate || 1);
      if (b.dmg) ok(Math.abs(fd - (hi ? 0.7 : 1)) < 1e-6, h.id + ' schade x' + fd);
      if (b.rate) ok(Math.abs(fr - (hi ? 0.7 : 1)) < 1e-6, h.id + ' snelheid x' + fr);
      out[h.rarity] = (out[h.rarity] || 0) + (hi ? 1 : 0);
    }
    return out;
  })()`));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
