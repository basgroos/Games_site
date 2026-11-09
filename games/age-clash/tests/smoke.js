/* Age Clash: alle schermen openen en een match tegen de bot spelen via de echte knoppen. */
const { load, ok, run, done } = require('./helpers');
const P = load(), w = P.w, AC = w.AC, $ = (s) => w.document.querySelector(s);
const step = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) AC.Main.step(dt); };
const click = (sel) => { const el = typeof sel === 'string' ? $(sel) : sel; ok(el, 'geen element ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
const btn = (txt) => [...w.document.querySelectorAll('button')].find((b) => b.textContent.includes(txt));

(async () => {
  await run('menu en alle schermen', () => {
    step(30);
    ok($('#scr-menu.on') && btn('SPELEN'), 'menu');
    for (const s of ['mode', 'collection', 'ages', 'upgrades', 'shop', 'season', 'leader', 'settings', 'menu']) { AC.UI.show(s); step(3); ok($('#scr-' + s + '.on'), s); }
    ok(!P.errors.length, P.errors.join(' | '));
  });
  await run('unit kopen in de collectie', () => {
    AC.Profile.data.coins = 1000; AC.UI.show('collection', { age: 2 });
    ok(!AC.Profile.data.owned[2][3], 'al in bezit');
    ok(AC.Profile.buyUnit(2, 3) && AC.Profile.data.owned[2][3] && AC.Profile.data.coins === 700, 'kopen mislukt');
  });
  await run('match tegen de bot met knoppen, towers, upgrades en evolueren', () => {
    AC.UI.show('mode'); click(btn('START MATCH')); step(2);
    ok(AC.Match.active && $('#scr-match.on'), 'match start niet');
    const sim = AC.Match.sim;
    click(w.document.querySelectorAll('.slot')[0]); step(2);
    ok(sim.units.some((u) => u.side === 0), 'geen unit geplaatst');
    sim.players[0].iron = 5000;
    AC.Match.cmd(0, { t: 'tower', s: 0, k: 2 }); AC.Match.cmd(0, { t: 'upg', k: 'income' }); step(2);
    ok(sim.towerAt(0, 0) && sim.players[0].upg.income === 1, 'tower/upgrade');
    sim.players[0].itemCd = 0; click(w.document.querySelector('.islot')); step(2);
    ok(sim.players[0].st.items === 1, 'item (slot 5) niet gebruikt via de knop');
    sim.players[0].xp = 1700; AC.Match.cmd(0, { t: 'evolve' }); step(2);
    ok(sim.players[0].age === 1, 'evolueren');
    sim.bases[0].hp = sim.bases[0].maxHp = 1e7; // zonder verdediging mag de bot de basis niet slopen tijdens deze test
    AC.Match.setSpeed(5); step(30 * 60, 1 / 30); // ~5 minuten speltijd
    ok(sim.time > 250, 'snelheid ' + sim.time);
    ok(!sim.over, 'match was al voorbij: winnaar ' + sim.winner + ' bases ' + sim.bases.map((b) => Math.round(b.hp)));
    return { time: Math.round(sim.time), units: sim.units.length, ages: sim.players.map((p) => p.age + 1) };
  });
  await run('opgeven toont het resultaat en geeft beloningen', () => {
    const coins = AC.Profile.data.coins;
    AC.Match.sim.command(0, { t: 'surrender' }); step(120);
    ok($('.result .rtitle'), 'geen resultaat');
    ok(AC.Profile.data.coins > coins && AC.Profile.data.matches === 1, 'geen beloning ' + coins + ' -> ' + AC.Profile.data.coins + ' m=' + AC.Profile.data.matches);
    click(btn('Terug naar menu')); step(2);
    ok($('#scr-menu.on') && !AC.Match.active, 'niet terug');
    ok(!P.errors.length, P.errors.join(' | '));
  });
  done();
})();
