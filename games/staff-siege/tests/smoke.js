/* Staff Siege smoke test: lobby, alle panelen, gacha, equippen, loadout-lock in een potje,
   snelheid 1x/2x/3x, pauze/beëindigen, resultaten en opslaan. */
const { load, ok, sleep, run, done } = require('./helpers');
const { w, E, errors } = load({ before(win) { win.HW_BUILD = { env: 'live', version: 'test', home: '../../' }; } });
const $ = (s) => w.document.querySelector(s);
const click = (s) => { const el = typeof s === 'string' ? $(s) : s; ok(el, 'missing ' + s); el.click(); };
const step = (n) => { for (let i = 0; i < n; i++) E('update(1/60)'); };
(async () => {
  await run('start in de lobby met link terug naar Bas Games', () => {
    ok(E("G.state") === 'lobby', 'niet in de lobby');
    ok($('#lobby').classList.contains('on'), 'lobbyscherm niet zichtbaar');
    ok($('#homeLink') && !$('#homeLink').hidden && $('#homeLink').getAttribute('href') === '../../', 'geen link terug');
    return { burgers: E('S.burgers'), tickets: E('S.tickets') };
  });
  await run('alle lobbypanelen openen en sluiten', () => {
    for (const go of ['staffs', 'classes', 'syn', 'gacha', 'upg', 'stats', 'daily', 'set']) {
      E(`openPanel('${go}')`);
      const open = [...w.document.querySelectorAll('.ov.on')].map((e) => e.id);
      ok(open.length === 1, go + ' opende niet: ' + open);
      w.document.querySelector('.ov.on [data-close]').click();
    }
    for (const t of ['ov', 'ach', 'coll', 'boss', 'zi']) { E(`openPanel('stats')`); click(`#stTabs [data-t="${t}"]`); ok($('#stBody').innerHTML.length > 50, 'leeg tabblad ' + t); click('#stats [data-close]'); }
  });
  await run('collectie toont alle staffen en classes', () => {
    E("openPanel('staffs')"); ok(w.document.querySelectorAll('#collGrid .card').length === E('STAFFS.length'), 'staffen ontbreken');
    click('#collTabs [data-t="class"]'); ok(w.document.querySelectorAll('#collGrid .card').length === E('CLASSES.length'), 'classes ontbreken');
    click('#coll [data-close]');
  });
  await run('gacha: 1x, 10x en ticket met pity en duplicates', async () => {
    E('S.burgers=5000;S.tickets=2'); E("openPanel('gacha')");
    const p0 = E('S.pulls');
    click('[data-pull="1"]'); await sleep(10); E("reveal"); click('#sum'); ok($('#sumCards').children.length === 1, 'geen kaart na 1x'); click('#sumDone');
    click('[data-pull="10"]'); click('#sum'); ok($('#sumCards').children.length === 10, 'geen 10 kaarten'); click('#sumDone');
    click('[data-tix="1"]'); click('#sum'); click('#sumDone');
    ok(E('S.pulls') === p0 + 12, 'pulls niet geteld');
    ok(E('S.burgers') <= 5000 - 1100 + 30 * 7 * 11, 'burgers niet afgeschreven');
    ok(E('S.tickets') === 1, 'ticket niet gebruikt');
    for (let i = 0; i < 70; i++) E("GA.tab='staff';roll('staff')");
    ok(E('S.pity.staff.p60') < 60 && E('S.pity.staff.p10') < 10, 'pity werkt niet');
    click('#gacha [data-close]');
    return { pulls: E('S.pulls'), staffs: E('Object.keys(S.staffs).length') };
  });
  await run('equippen in de lobby', () => {
    const id = E("Object.keys(S.staffs).find(k=>k!==S.eqStaff)"); ok(id, 'geen tweede staf');
    E("openPanel('staffs')"); E(`COL.sel='${id}';renderColl()`); click('#equipB'); ok(E('S.eqStaff') === id, 'equip mislukt');
    click('#coll [data-close]');
  });
  await run('potje starten: loadout ligt vast, gacha en collectie op slot', async () => {
    const st = E('S.eqStaff'), cl = E('S.eqClass');
    click('[data-start="1"]'); await sleep(600);
    ok(E('G.state') === 'play', 'potje niet gestart');
    ok(E('K.st.id') === st && E('K.cl.id') === cl, 'loadout klopt niet');
    for (const go of ['gacha', 'staffs', 'classes', 'upg']) { E(`openPanel('${go}')`); ok(!w.document.querySelector('.ov.on'), go + ' ging open tijdens potje'); }
    const b = E('S.burgers'); E('doPull(1)'); ok(E('S.burgers') === b, 'gacha werkte tijdens potje');
    E("S.eqStaff='oak';S.eqClass='recruit'"); step(30);
    ok(E('K.st.id') === st && E('K.cl.id') === cl, 'loadout veranderde tijdens potje');
    E(`S.eqStaff='${st}';S.eqClass='${cl}'`);
    E("openPanel('set')"); ok($('#set').classList.contains('on'), 'settings niet beschikbaar in potje'); click('#set [data-close]');
  });
  await run('waves, burgers en auto skip', () => {
    E('P.maxhp=P.hp=1e9'); const b = E('S.burgers');
    for (let i = 0; i < 60 * 40 && E('G.wave') < 3; i++) { E('update(1/60)'); E('P.hp=1e9'); }
    ok(E('G.wave') >= 3, 'auto skip ging niet door: wave ' + E('G.wave'));
    ok(E('S.burgers') >= b + 40, 'geen 20 burgers per wave');
    return { wave: E('G.wave'), burgers: E('S.burgers') - b };
  });
  await run('snelheid 1x, 2x en 3x', () => {
    const rate = (s) => { E(`S.set.speed='${s}'`); const t0 = E('G.t'); for (let i = 0; i < 30; i++) E('frame(last+1000/60)'); return (E('G.t') - t0) / 0.5; };
    const r1 = rate(1), r2 = rate(2), r3 = rate(3);
    ok(Math.abs(r1 - 1) < .1 && Math.abs(r2 - 2) < .15 && Math.abs(r3 - 3) < .2, `snelheden ${r1} ${r2} ${r3}`);
    E("cycleSpeed()"); ok(E('S.set.speed') === '1', 'F/knop schakelt niet rond');
    return { r1: +r1.toFixed(2), r2: +r2.toFixed(2), r3: +r3.toFixed(2) };
  });
  await run('pauze, potje beëindigen, resultaten en terug naar de lobby', async () => {
    E('openPause()'); ok(E('G.paused'), 'niet gepauzeerd'); click('#quitB');
    ok(E('G.state') === 'res' && $('#res').classList.contains('on'), 'geen resultaten');
    click('#toLobby'); await sleep(600);
    ok(E('G.state') === 'lobby' && $('#lobby').classList.contains('on'), 'niet terug in de lobby');
  });
  await run('voortgang wordt opgeslagen', () => {
    E('save()'); const j = JSON.parse(w.localStorage.getItem('staffsiege_v1'));
    ok(j && j.pulls === E('S.pulls') && j.burgers === E('S.burgers') && j.st.runs >= 1, 'save klopt niet');
    return { runs: j.st.runs, best: j.best };
  });
  done(errors);
})();
