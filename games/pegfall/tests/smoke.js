/* Pegfall Arena smoke test: boots the built page, visits every screen, summons, then plays a whole match
   against an Easy bot by steering the paddle under the ball in the arcade machine. */
const { load, ok, waitFor } = require('./helpers');
const { w, E, errors } = load();
const $ = (s) => w.document.querySelector(s);
const click = (s) => { const el = typeof s === 'string' ? $(s) : s; ok(el, 'missing ' + s); el.click(); };
let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
const phase = () => E('S.match&&S.match.phase');
(async () => {
  await run('boots to the menu with a link back to Bas Games', () => {
    ok(E("S.screen") === 'menu', 'not on menu');
    ok(E("!!document.querySelector('a.home-link[href=\"../../\"]')"), 'no link back to the site');
    ok(w.document.querySelectorAll('.tile').length === 6, 'menu tiles missing');
    ok(E('VIEWS.menuDemo instanceof ArcadeView'), 'menu demo is not the arcade machine');
    for (let i = 0; i < 300; i++) E('VIEWS.menuDemo.frame(1/60)');
    return { shards: E('S.save.shards'), owned: E('ownedIds().length') };
  });
  await run('collection lists all fighters, details open', () => {
    E("go('collection')");
    const n = w.document.querySelectorAll('#cgrid .ccard').length;
    ok(n === E('CHARS.length'), 'collection shows ' + n);
    click('#cgrid .ccard'); ok($('.modal'), 'detail did not open'); E('VIEWS.detail(0.5,0)'); click('.modal [data-x]');
    return { cards: n };
  });
  await run('summon x10 spends shards and adds fighters', async () => {
    E("go('gacha')"); const before = E('ownedIds().length');
    click('#p10'); ok($('.summon'), 'summon overlay missing');
    E('VIEWS.summon(2,0)'); await waitFor(() => w.document.querySelectorAll('#rv .flip').length === 10, 3000, '10 revealed cards');
    ok(E('S.save.shards') < 1000, 'shards not spent');
    click('#sk');
    return { owned: E('ownedIds().length'), before, pulls: E('S.save.stats.pulls') };
  });
  await run('settings save the name', () => {
    E("go('settings')"); $('#nm').value = 'Tester'; click('#save'); ok(E('S.save.name') === 'Tester', 'name not saved');
  });
  await run('plays a full match against an Easy bot using the arcade machine', async () => {
    E("go('prep',{kind:'bot',diff:'easy'})");
    if ($('#go').disabled) { click('#pg .ccard:not(.sel)'); }
    if ($('#go').disabled) { click('#pg .ccard:not(.sel)'); }
    ok(!$('#go').disabled, 'could not choose 2 starters'); click('#go');
    E('S.bot.ai.fast=true');
    let rounds = 0, drops = 0, earned = 0;
    while (rounds < 9) {
      await waitFor(() => ['arcade', 'pick', 'over'].includes(phase()), 8000, 'arcade or pick');
      if (phase() === 'over') break;
      if (phase() === 'pick') { await waitFor(() => $('#pkg .ccard'), 3000, 'pick cards'); click('#pkg .ccard'); click('#lock'); continue; }
      await waitFor(() => E('!!VIEWS.arcade'), 3000, 'arcade view');
      E('VIEWS.arcade.m.launchAll()');
      for (let f = 0; f < 3000 && E('!VIEWS.arcade.m.done'); f++) E('VIEWS.arcade.target=steerTarget(VIEWS.arcade.m,Math.random,0,.8);VIEWS.arcade.frame(1/60)');
      E('VIEWS.arcade.frame(1/60)');
      ok(E('VIEWS.arcade.m.done'), 'arcade never finished');
      earned += E('Object.values(MV.counts).reduce((a,b)=>a+b,0)'); drops += E('VIEWS.arcade.m.drops');
      await waitFor(() => phase() === 'muster', 5000, 'muster');
      ok(w.document.querySelectorAll('.muster-col').length === 2, 'muster screen missing');
      click('#tobattle');
      await waitFor(() => E('!!VIEWS.battle'), 3000, 'battle view');
      E('VIEWS.battle.intro=0;VIEWS.battle.skip();VIEWS.battle.frame(0.016)');
      await waitFor(() => phase() === 'roundOver' || phase() === 'over', 5000, 'round over');
      rounds++;
      if (phase() === 'roundOver') { await waitFor(() => $('#cont'), 2000, 'continue button'); click('#cont'); }
    }
    await waitFor(() => phase() === 'over', 8000, 'match over');
    const score = E('S.match.score');
    ok(Math.max(...score) === 3, 'nobody reached 3 points');
    ok(earned > 20, 'good paddle play earned only ' + earned);
    ok($('.big.win') || $('.big.lose'), 'no result screen');
    return { rounds, score, hits: earned, drops, reward: E('S.match.reward') };
  });
  await run('multiplayer screen works offline (no backend in tests)', () => {
    click('#tomenu'); E("go('mp')"); ok($('#mq'), 'no quick match button'); click('#mb'); ok(E('S.screen') === 'prep', 'bot fallback broken');
  });
  if (errors.length) { console.log('page errors:', errors); failed++; }
  if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
  console.log('Pegfall Arena smoke: all checks passed');
  process.exit(0);
})();
