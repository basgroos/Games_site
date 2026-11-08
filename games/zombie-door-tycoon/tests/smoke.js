/* UI smoke test in jsdom: lobby, menus, summon, collection, a solo match with HUD, online lobby. */
const { loadPage, ok } = require('./helpers');
const { makeBus } = require('./fakesupa');
(async () => {
  console.log('Zombie Door Tycoon — smoke');
  const bus = makeBus();
  const { w, E, errors } = loadPage({ before: (win) => { win.supabase = bus.supabase; } });
  await new Promise((r) => setTimeout(r, 300));
  const $ = (id) => w.document.getElementById(id);
  let clock = 0; const frames = (n) => { for (let i = 0; i < n; i++) { const f = w.__raf; w.__raf = null; clock = Math.max(clock + 33, w.performance.now() + 50); if (f) f(clock); } };
  ok($('lobby').innerHTML.includes('ZOMBIE DOOR'), 'lobby rendered');
  ok(!!w.document.querySelector('.home-link'), 'link back to Bas Games');
  E('G.Profile.d.seenHelp = true'); if ($('mClose')) $('mClose').click();
  E("G.Profile.d.coins = 5000; G.UI.showLobby()");
  $('bSum').click(); ok(!!$('bnrs'), 'summon screen');
  w.document.querySelector('button[data-b="normal"][data-n="10"]').click();
  ok(E('G.Profile.d.coins') === 4000 && E('G.Profile.d.stats.summons') === 10, '10 summons cost 1000 coins');
  ok(!!$('summonFx') && !$('summonFx').classList.contains('hidden'), 'reveal animation shows');
  $('summonFx').click(); await new Promise((r) => setTimeout(r, 50)); if ($('rDone')) $('rDone').click();
  $('mClose').click();
  $('bCol').click(); ok(w.document.querySelectorAll('.icard').length === E('G.ITEMS.length'), 'collection shows all items');
  $('mClose').click();
  $('bLb').click(); ok(!!$('lbt'), 'leaderboard'); $('mClose').click();
  $('bAch').click(); ok(w.document.querySelectorAll('.ach').length >= 10, 'achievements'); $('mClose').click();
  // solo match
  E("G.Game.start('frozen','easy')");
  frames(5);
  ok(E('G.Game.state') === 'match' && !$('hud').classList.contains('hidden'), 'solo match + HUD');
  E("(function(){var m=G.Game.match;m.claimTimer=0.01;for(var k=0;k<5;k++)m.update(G.TICK);})()"); frames(2);
  ok(E('G.Game.match.players[0].room') >= 0, 'got a room');
  E("(function(){var g=G.Game,m=g.match,me=m.players[0],r=m.roomOf(me);me.pos.x=r.def.center.x;me.pos.y=r.def.center.y;me.cash=5000;m.prepTimer=0.01;var s=r.def.slots.filter(function(q){return !r.tile[q.x+','+q.y]})[0];g.net.send({type:'place',item:'pistol',x:s.x,y:s.y});})()");
  ok(E('G.Game.match.roomOf(G.Game.match.players[0]).towers.length') === 2, 'placed a tower in my room');
  for (let i = 0; i < 40; i++) { E('for(var k=0;k<30;k++)G.Game.match.update(G.TICK)'); frames(1); }
  ok(E('G.Game.match.wave') >= 1, 'waves started (wave ' + E('G.Game.match.wave') + ')');
  E("(function(){var g=G.Game,r=g.match.roomOf(g.match.players[0]);g.ui.selTower=r.towers[1].id;})()"); frames(12);
  ok(!$('hPanel').classList.contains('hidden'), 'tower panel opens');
  E('G.Game.toLobby()'); frames(2);
  // online lobby with the fake realtime
  $('bOnline').click(); for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 30)); bus.flush(); }
  ok(!!$('oHost'), 'online lobby');
  $('oHost').click(); for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 30)); bus.flush(); }
  ok(/^[A-Z0-9]{5}$/.test(E('G.MP.code') || ''), 'hosted a room ' + E('G.MP.code'));
  $('oStart').click(); frames(3);
  ok(E('G.Game.mode') === 'host' && E('G.Game.state') === 'match', 'online match started as host');
  frames(10);
  ok(errors.length === 0, 'no errors (' + errors.slice(0, 3).join(' | ') + ')');
  console.log('smoke OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
