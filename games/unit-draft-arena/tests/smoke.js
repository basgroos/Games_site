/* Unit Draft Arena smoke test: boots the built page, opens every screen and plays a whole match (best of 1):
   veiling (bieden + passen), opstelling, gevecht met abilities, uitslag en eindscherm. */
const { load, ok, sleep, waitFor } = require('./helpers');
const { w, E, errors } = load();
const $ = (s) => w.document.querySelector(s);
const click = (s) => { const el = typeof s === 'string' ? $(s) : s; ok(el, 'missing ' + s); el.click(); };
let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
(async () => {
  await run('boots to the title screen with a link back to Bas Games', () => {
    ok(E('G.screen') === 'scr-title', 'not on title');
    ok(E("!!document.querySelector('a.home-link[href=\"../../\"]')"), 'no link back to the site');
    E('drawHero(1)');
  });
  await run('rules and card overview open, every tab renders', () => {
    click('#btnHow'); ok($('#modal.on'), 'rules did not open'); click('#modalBox [data-close]');
    click('#btnCodex'); ok(w.document.querySelectorAll('#modalBox .card').length === E('UNITS.length'), 'unit cards missing');
    for (const t of ['buff', 'ability', 'syn']) click(`[data-codex="${t}"]`);
    ok(w.document.querySelectorAll('.syn-list > div').length === E('SYNERGIES.length'), 'synergies missing');
    click('#modalBox [data-close]');
  });
  await run('starts a best-of-1 match with a draft of 10-12 lots and €20 each', () => {
    click('#segBo button[data-v="1"]'); click('#btnStart');
    ok(E('G.screen') === 'scr-draft', 'not on draft');
    const n = w.document.querySelectorAll('#lotStrip .lot').length;
    ok(n >= 10 && n <= 12, 'lots: ' + n);
    ok(E('G.player.coins') === 20 && E('G.ai.coins') === 20, 'not €20');
    return { lots: n, ai: E('G.pers.name') };
  });
  let bought = 0;
  await run('upcoming lots stay secret and every lot opens at €1', () => {
    ok(w.document.querySelectorAll('#lotStrip .lot.hidden').length === E('G.lots.length') - 1, 'upcoming lots are visible');
    ok(!$('#lotStrip').textContent.includes(E('G.lots[G.lots.length - 1].def.name')) || E('G.lots[0].def.name === G.lots[G.lots.length - 1].def.name'), 'last lot name leaks');
    ok(E('G.lots.every(l => l.start === 1)'), 'not every lot starts at €1');
    ok(!$('#bid2') && !$('#bid5'), 'big-step bid buttons still there');
  });
  await run('plays the whole auction: bids on cheap lots, passes on the rest', async () => {
    let guard = 0, prev = 0;
    while (!E('G.modalOpen') && guard++ < 4000) {
      if (E('G.A && !G.A.closed')) {
        const can = E('(() => { const A = G.A, need = A.leader === null ? A.lot.start : A.price + 1; return A.leader !== 0 && !A.pPassed && need <= 3 && need <= G.player.coins; })()');
        if (can && !$('#bid1').disabled) { const before = E('G.A.leader === null ? 0 : G.A.price'); click('#bid1'); ok(E('G.A.price') === before + 1, 'bid did not go up by €1'); }
        else if (!$('#bidPass').disabled && E('G.A.leader !== 0') && Math.random() < 0.3) click('#bidPass');
        const p = E('G.A.price'); if (E('G.A.leader === 1') && prev > 0) ok(p <= prev + 1 || p === 1, 'AI raised by more than €1: ' + prev + ' -> ' + p);
        prev = E('G.A.closed') ? 0 : p;
        E('tickDraft(0.25)');
      } else await sleep(60);
    }
    ok(E('G.modalOpen') && $('#toArena'), 'draft did not finish');
    ok(E('G.lots.every(l => l.winner !== null)'), 'unresolved lots');
    const spent = E('G.lots.filter(l => l.winner === 0).reduce((s, l) => s + l.price, 0)');
    ok(E('G.player.coins') === 20 - spent && E('G.player.coins') >= 0, 'coins do not add up');
    ok(E('G.ai.coins') >= 0, 'AI overspent');
    bought = E('G.lots.filter(l => l.winner === 0).length');
    ok(E('G.player.units.some(u => u.def.id === "recruit")'), 'free recruit missing');
    return { bought, coins: E('G.player.coins'), ai: E('G.lots.filter(l => l.winner === 1).length') + ' items, €' + E('G.ai.coins') };
  });
  await run('inventory shows both armies', () => {
    click('#toArena'); click('#btnItems'); ok(w.document.querySelectorAll('#modalBox .card').length >= 1, 'no cards');
    click('[data-inv="1"]'); click('#modalBox [data-close]');
  });
  await run('placement: auto, clear, place by clicking cells, assign buff', () => {
    ok(E('G.mode') === 'place', 'not placing');
    ok(!$('#btnFight').disabled, 'auto placement incomplete');
    click('#btnClear'); ok($('#btnFight').disabled, 'can fight with nobody placed');
    const n = E('G.player.units.length');
    for (let i = 0; i < n; i++) E(`placeClick({ cx: ${3 - Math.floor(i / 6)}, cy: ${i % 6}, x: ${3.5 - Math.floor(i / 6)}, y: ${i % 6 + 0.5} })`);
    ok(!$('#btnFight').disabled, 'manual placement incomplete');
    E('placeClick({ cx: 9, cy: 2, x: 9.5, y: 2.5 })');
    ok(E('Object.values(G.place.pos).every(p => p.cx <= 3)'), 'unit placed in AI zone');
    E('drawScene(cx2, G.B, 1, placementOverlay())');
    return { units: n, aiUnits: E('G.B.alive[1].length') };
  });
  await run('battle: countdown, abilities, ends with a winner', () => {
    click('#btnFight'); ok(E('G.mode') === 'battle', 'not fighting');
    for (let i = 0; i < 40; i++) E('tickBattle(0.1)');
    ok(E('G.countdown <= 0'), 'countdown stuck');
    const nab = E('G.B.teams[0].abilities.length');
    E('G.speed = 3');
    let casts = 0;
    for (let i = 0; i < 1500 && E('G.mode') === 'battle'; i++) {
      E('tickBattle(0.1)');
      if (i % 10 === 0) { E(`updateVFX(0.1); drawScene(cx2, G.B, ${i} / 10, battleOverlay()); updateHud(); updateAbilityBar()`); }
      for (let k = 0; k < nab; k++) if (E(`!G.B.over && canCast(G.B, G.B.teams[0], G.B.teams[0].abilities[${k}])`)) {
        E(`armAbility(${k})`);
        if (E('!!G.target')) { const p = E('(() => { const e = G.B.alive[1][0] || { x: 9, y: 3 }; return { x: e.x, y: e.y }; })()'); E(`battleClick({ x: ${p.x}, y: ${p.y} })`); if (E('!!G.target')) E(`battleClick({ x: 1, y: 1 })`); }
        casts++;
      }
    }
    ok(E('G.B.over'), 'battle never ended');
    for (let i = 0; i < 40 && !E('G.modalOpen'); i++) E('tickBattle(0.1)');
    ok($('#toFinal'), 'no result screen with a final button');
    return { winner: E('G.B.winner'), time: Math.round(E('G.B.time')), casts };
  });
  await run('final screen, record saved, play again starts a new draft', () => {
    click('#toFinal'); ok(E('G.screen') === 'scr-final', 'no final screen');
    const rec = JSON.parse(w.localStorage.getItem('unit-draft-arena-record-v1'));
    ok(rec && rec.w + rec.l === 1, 'record not saved');
    click('#again'); ok(E('G.screen') === 'scr-draft' && E('G.round') === 1, 'play again failed');
    E('toMenu()'); ok(E('G.screen') === 'scr-title', 'menu failed');
    return rec;
  });
  await run('no page errors', () => ok(errors.length === 0, errors.join(' | ')));
  if (failed) { console.log(failed + ' failed'); process.exit(1); }
  console.log('Unit Draft Arena smoke: all passed');
  process.exit(0);
})();
