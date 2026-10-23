/* Co-op test: a host and a guest in one house, through an in-memory stand-in for the Supabase rooms.
   Checks the lobby, joining, seeing each other, shared keys and doors, being pulled into the next chapter,
   the monster chasing both players, and leaving. */
const { boot, sleep, check, done, makeBus } = require('./lib');
const errors = [], bus = makeBus();
const A = boot('Anna', errors, bus), B = boot('Bram', errors, bus);
const a = s => A.eval(s), b = s => B.eval(s);
const both = async (sec) => { for (let t = 0; t < sec; t += .25) { a('T.step(.25)'); b('T.step(.25)'); await sleep(5); } };
(async () => {
  await sleep(100);
  check(!a("$('coop').hidden") && !b("$('coop').hidden"), 'co-op shows on the title screen');
  a("$('btnHost').click()"); await sleep(300);
  check(a("G.state") === 'play' && a("Net.active && Net.isHost"), 'Anna hosts a house and starts playing');
  await both(.5); b("Net.renderLobby()");
  check(/Anna/.test(b("$('coopList').textContent")), "Bram sees Anna's house in the lobby", b("$('coopList').textContent"));
  b("$('coopList').querySelector('button').click()"); await sleep(300); await both(.25); await sleep(300);
  check(b("G.state") === 'play' && b("Story.S.ch") === 1 && !b("Net.waiting"), 'Bram joins the house');
  await both(1);
  check(a("Object.keys(Net.avatars).length") === 1 && b("Object.keys(Net.avatars).length") === 1, 'each sees the other');
  check(/Bram/.test(a("$('coopHud').textContent")), 'the house code and players are shown', a("$('coopHud').textContent"));
  // shared key and door
  a("T.tp(8.2,0,15,Math.PI); T.use('frontKey'); T.tp(0,0,5,0); W.doors.front.tryUse(); W.doors.front.tryUse()");
  await both(1.5);
  check(!b("W.obj.frontKey.visible") && b("W.doors.front.open") && !b("W.doors.front.locked"), "Bram sees the key taken and the door open");
  // Anna reads the note: Bram, still outside, is pulled into chapter II
  a("T.tp(0,0,3,0); T.step(.3); T.use('gfNote'); T.close()"); await both(3);
  check(b("Story.S.ch") === 2 && !b("P.outside"), 'Bram is pulled inside into chapter II', b("[Story.S.ch, P.outside]"));
  // a shared item
  a("T.tp(5,0,1.5,0); T.use('drawer2')"); await both(1);
  check(b("Story.has('diningKey')"), 'the team inventory is shared');
  // keys found by different players count together: Anna finds one, Bram another -> the sewing room opens
  a("Story.S.ch = 4; T.tp(9,1,-2.5,0); T.use('nightstand')"); b("Story.S.ch = 4; T.tp(-8,1,-12,0); T.use('bathtub')");
  await both(1.5); a("T.tp(0,1,-4,0)"); await both(2);
  check(a("Story.keysFound()") === 2 && b("Story.keysFound()") === 2, 'both count two keys when each found one', [a("Story.keysFound()"), b("Story.keysFound()")]);
  check(a("W.doors.sewing.open") && b("W.doors.sewing.open"), 'the sewing room door opens for both');
  // the monster: Anna's game runs it, Bram sees it and can be chased
  a("Story.S.ch = 4; T.tp(0,1,-4,0); Chase.start(CHASES[1])"); b("T.tp(.5,1,-6,0)");
  await both(1);
  check(b("Chase.active && !Chase.owner"), "Bram's game follows Anna's chase");
  await both(2.5);
  const da = a("Ent.g.position.distanceTo(new THREE.Vector3(0,3.4,-13.3))"), pb = b("Ent.g.position.z"), pa = a("Ent.g.position.z");
  check(da > .5 && Math.abs(pa - pb) < 1.5, 'the monster moves the same for both', { anna: pa, bram: pb });
  // leaving
  b("Game.quitToTitle()"); await both(1);
  check(a("Object.keys(Net.avatars).length") === 0, 'when Bram leaves, Anna no longer sees him');
  done(errors, 'The House That Remembers co-op test');
})().catch(e => { console.log('FAIL crashed: ' + e.stack); process.exit(1); });
