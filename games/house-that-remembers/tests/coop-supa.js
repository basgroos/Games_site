/* Co-op through the game's real Supabase room code (supaRoom), with a stand-in supabase-js.
   Both players walk from the gate into the house; checks they keep seeing each other inside,
   that the story stays in step, and that the message traffic stays under Supabase's free limit. */
const { boot, sleep, check, done, makeSupa } = require('./lib');
const errors = [], supa = makeSupa({ delay: 15 });
const A = boot('Anna', errors, null, supa), B = boot('Bram', errors, null, supa);
const a = s => A.eval(s), b = s => B.eval(s);
const walk = (w, x, z) => w.eval(`(() => { const dx = ${x} - P.pos.x, dz = ${z} - P.pos.z, d = Math.hypot(dx, dz); if (d > .1) { const s = Math.min(d, .11); P.pos.x += dx / d * s; P.pos.z += dz / d * s; P.yaw = Math.atan2(-dx, -dz); } return d; })()`);
async function run(sec, routeA, routeB) {
  for (let t = 0; t < sec; t += .05) {
    if (routeA) walk(A, routeA[0], routeA[1]); if (routeB) walk(B, routeB[0], routeB[1]);
    a('T.step(.05)'); b('T.step(.05)'); if (Math.round(t * 20) % 4 === 0) await sleep(1);
  }
  await sleep(60);
}
const seen = (w, other) => w.eval(`(() => { const a = Object.values(Net.avatars)[0]; if (!a) return -1; const o = ${JSON.stringify(other)}; return Math.hypot(a.g.position.x - o[0], a.g.position.z - o[1]); })()`);
const pos = w => w.eval('[P.pos.x, P.pos.z]');
(async () => {
  await sleep(200);
  check(!a("$('coop').hidden"), 'co-op is offered on the site (Supabase)');
  a("$('btnHost').click()"); await sleep(400); await run(.5);
  b("Net.renderLobby()");
  check(/Anna/.test(b("$('coopList').textContent")), "Bram sees Anna's house", b("$('coopList').textContent"));
  b("$('coopList').querySelector('button').click()"); await sleep(600); await run(.3); await sleep(400); await run(1);
  check(b("G.state") === 'play' && !b("Net.waiting"), 'Bram joins');
  check(seen(A, pos(B)) >= 0 && seen(A, pos(B)) < 1.5 && seen(B, pos(A)) < 1.5, 'they see each other at the gate', [seen(A, pos(B)), seen(B, pos(A))]);
  const d0 = supa.delivered; const t0 = Date.now();
  // walk up the path together; Anna gets the key from the angel and opens the door
  await run(9, [8.2, 15], [1, 8]); a("T.use('frontKey')");
  await run(10, [0, 5.2], [.8, 6]); a("W.doors.front.tryUse(); W.doors.front.tryUse()");
  await run(1.5);
  check(b("W.doors.front.open"), 'Bram sees the door open');
  // both walk in
  await run(6, [0, 2.2], [0, 4.6]); await run(3, null, [.8, 2.6]);
  check(!a("P.outside") && !b("P.outside"), 'both are inside');
  check(seen(A, pos(B)) < 1.5 && seen(B, pos(A)) < 1.5, 'inside, they still see each other', [seen(A, pos(B)), seen(B, pos(A))]);
  a("T.use('gfNote'); T.close()"); await run(3);
  check(a("Story.S.ch") === 2 && b("Story.S.ch") === 2, 'both in chapter II', [a("Story.S.ch"), b("Story.S.ch")]);
  // into the living room and around
  await run(8, [5, 1], [6, -2]); await run(12, [7, -3], [3, 2]);
  check(seen(A, pos(B)) < 1.5 && seen(B, pos(A)) < 1.5, 'after a while in the living room they still see each other', [seen(A, pos(B)), seen(B, pos(A))]);
  check(a("Net.game.peers().length") === 2 && b("Net.game.peers().length") === 2, 'both still in the room');
  a("T.use('drawer2')"); await run(1);
  check(b("Story.has('diningKey')"), 'items still shared inside');
  supa.byEvent = {}; const g0 = a('T.now'); await run(20, [5, -2], [3, 1]); const gs = (a('T.now') - g0) / 1000;
  console.log('per game second while playing inside:', JSON.stringify(Object.fromEntries(Object.entries(supa.byEvent).map(([k, v]) => [k, +(v / gs).toFixed(2)]))));
  check(!supa.tracks, 'no Supabase presence updates (Supabase cuts off clients that send too many)', supa.tracks || 0);
  console.log(`traffic: ${supa.delivered - d0} delivered messages, max ${supa.maxBytes} bytes per message`);
  done(errors, 'The House That Remembers Supabase co-op test');
})().catch(e => { console.log('FAIL crashed: ' + e.stack); process.exit(1); });
