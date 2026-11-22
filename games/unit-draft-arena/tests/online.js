/* Unit Draft Arena online: two separate pages play a private match through the real screens.
   The network is a simulated realtime service with the same presence behaviour as the Supabase adapter,
   with random lag and without guaranteed ordering. The host runs the auction and the battle; the guest
   bids, passes, places and casts through commands and draws the host's snapshots. */
const { load, ok, sleep, waitFor } = require('./helpers');

const rooms = {};
function joinRoom(name, peer, lag) {
  const r = rooms[name] || (rooms[name] = { members: new Map() });
  const me = { presence: {}, cbs: [] };
  r.members.set(peer, me);
  const snapshot = (forPeer) => [...r.members.entries()].map(([k, v]) => ({ peer: k, isMe: k === forPeer, presence: JSON.parse(JSON.stringify(v.presence)) }));
  const deliver = (k, v) => { const list = snapshot(k); v.cbs.forEach((f) => f(list, [])); };
  const sync = () => { for (const [k, v] of r.members) setTimeout(() => deliver(k, v), lag()); };
  sync();
  return {
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete me.presence[k]; else me.presence[k] = JSON.parse(JSON.stringify(patch[k])); } sync(); return Promise.resolve(); },
    onPeers(f) { me.cbs.push(f); setTimeout(() => f(snapshot(peer), []), 0); return () => { me.cbs = me.cbs.filter((x) => x !== f); }; },
    join: (n) => Promise.resolve(joinRoom(n, peer, lag)),
    leave() { r.members.delete(peer); me.cbs = []; sync(); return Promise.resolve(); },
    me: () => peer,
  };
}
const lag = () => 5 + Math.random() * 45;
function connect(p, id) { p.w.__lobby = joinRoom('lobby', id, lag); p.E("Net.lobby = __lobby; Net.mode = 'site'; Net.ready = Promise.resolve('site');"); }

const A = load(), B = load();   // peer ids: 'a-host' < 'b-guest', so A hosts
connect(A, 'a-host'); connect(B, 'b-guest');
const $ = (p, s) => p.w.document.querySelector(s);
const click = (p, s) => { const el = typeof s === 'string' ? $(p, s) : s; ok(el, 'missing ' + s); el.click(); };
let T = 0;
async function steps(n, dt = 0.1) { for (let i = 0; i < n; i++) { T += dt; A.E(`gameStep(${dt}, ${T})`); B.E(`gameStep(${dt}, ${T})`); await sleep(8); } }
// like waitFor, but keeps both games running (the host only publishes from its game loop)
async function until(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return; await steps(1); } throw new Error('timed out waiting for ' + label); }

let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}

(async () => {
  await run('private room: host makes a code, friend joins with it', async () => {
    A.E('onlineLobby()'); B.E('onlineLobby()');
    await waitFor(() => $(A, '#onMake') && !$(A, '#onMake').disabled && !$(B, '#onJoin').disabled, 3000, 'lobby ready');
    $(A, '#onName').value = 'Host'; $(B, '#onName').value = 'Vriend';
    click(A, '#onMake');
    const code = A.E('Net._code');
    ok(/^[A-Z2-9]{5}$/.test(code), 'code ' + code);
    ok($(A, '.code-big') && $(A, '.code-big').textContent === code, 'code not shown');
    $(B, '#onCode').value = code.toLowerCase(); click(B, '#onJoin');
    await waitFor(() => A.E('!!G.net') && B.E('!!G.net'), 6000, 'both in the match');
    ok(A.E('G.net.host') && !B.E('G.net.host'), 'roles');
    await until(() => B.E("G.screen === 'scr-draft' && !!G.A"), 6000, 'guest sees the draft');
    ok(A.E('G.pers.name') === 'Vriend' && B.E('G.pers.name') === 'Host', 'names not exchanged');
    ok(A.E('G.bestOf') === 3 && B.E('G.bestOf') === 3, 'online is best of 3');
  });

  await run('auction: guest and host bid in €1 steps and both see the same result', async () => {
    let guestBids = 0, hostBids = 0, guard = 0;
    while (!(A.E('G.modalOpen && !!document.querySelector("#toArena")') && B.E('!!document.querySelector("#toArena")')) && guard++ < 3000) {
      const g = B.E('(() => { const A = G.A; if (!A || A.closed) return null; return { lead: A.leader, price: A.price, passed: A.pPassed, coins: G.player.coins, i: G.lotIdx }; })()');
      if (g && g.lead !== 0 && !g.passed) {
        const need = g.lead === null ? 1 : g.price + 1;
        if (need <= (g.i === 0 ? 6 : 2) && need <= g.coins && (g.i === 0 || Math.random() < 0.5) && !$(B, '#bid1').disabled) { click(B, '#bid1'); guestBids++; }
        else if (!$(B, '#bidPass').disabled) click(B, '#bidPass');
      }
      const h = A.E('(() => { const A = G.A; if (!A || A.closed) return null; return { lead: A.leader, price: A.price, passed: A.pPassed, coins: G.player.coins }; })()');
      if (h && h.lead !== 0 && !h.passed) {
        const need = h.lead === null ? 1 : h.price + 1;
        if (need <= 3 && need <= h.coins && Math.random() < 0.6) { click(A, '#bid1'); hostBids++; }
        else if (h.lead === 1 || Math.random() < 0.2) click(A, '#bidPass');
      }
      await steps(1, 0.15);
    }
    await steps(10);
    ok(A.E('G.lots.every(l => l.winner !== null)'), 'host has unresolved lots');
    const hostView = A.E('JSON.stringify([G.player.coins, G.ai.coins, G.player.units.map(u => u.def.id), G.ai.units.map(u => u.def.id), G.ai.buffs.map(b => b.def.id), G.ai.abilities.map(a => a.def.id)])');
    const guestView = B.E('JSON.stringify([G.ai.coins, G.player.coins, G.ai.units.map(u => u.def.id), G.player.units.map(u => u.def.id), G.player.buffs.map(b => b.def.id), G.player.abilities.map(a => a.def.id)])');
    ok(hostView === guestView, 'host and guest disagree:\n' + hostView + '\n' + guestView);
    const guestWon = A.E('G.lots.filter(l => l.winner === 1).length');
    ok(guestWon >= 1, 'guest won nothing');
    ok(A.E('G.ai.coins') === 20 - A.E('G.lots.filter(l => l.winner === 1).reduce((s, l) => s + l.price, 0)'), 'guest coins do not add up');
    return { lots: A.E('G.lots.length'), guestBids, hostBids, guestWon, hostWon: A.E('G.lots.filter(l => l.winner === 0).length') };
  });

  await run('placement: opponent is hidden, both press Klaar, battle starts on both pages', async () => {
    click(A, '#toArena'); click(B, '#toArena');
    ok(A.E("G.mode === 'place'") && B.E("G.mode === 'place'"), 'not placing');
    ok(A.E('G.B.alive[1].length') === 0 && B.E('G.B.alive[1].length') === 0, 'opponent placement visible');
    ok($(A, '#btnFight').textContent === 'Klaar', 'button text');
    // give the guest two abilities through the host (host-authoritative), so casting is always exercised
    // plus two sturdy units so the battle lasts long enough for abilities to charge (missing units are auto-placed by the host)
    A.E("G.ai.abilities.push({ def: ABILITY.meteor, price: 0, uid: 9001 }, { def: ABILITY.heal, price: 0, uid: 9002 }); G.ai.units.push({ def: UNIT.golem, price: 0, uid: 9003 }, { def: UNIT.tank, price: 0, uid: 9004 })");
    click(B, '#btnFight');
    await steps(10);
    ok(A.E('G.net.readyR') && /klaar/i.test(A.E("document.querySelector('#placeHint').textContent")), 'host does not see guest ready');
    ok(B.E('G.place.locked') && $(B, '#btnFight').disabled, 'guest not locked');
    click(A, '#btnFight');
    await until(() => A.E("G.mode === 'battle'") && B.E("G.mode === 'battle' && G.B && G.B.view"), 6000, 'battle on both');
    await steps(5);
    const nA = A.E('G.B.units.length'), nB = B.E('G.B.units.length');
    ok(nA === nB, 'unit counts differ ' + nA + ' vs ' + nB);
    ok(B.E('G.B.units.filter(u => u.team === 0).length') === A.E('G.B.units.filter(u => u.team === 1).length'), 'guest does not see own army as team 0');
    ok(A.E('G.B.units.some(u => u.team === 1 && u.def.id === "golem")'), 'host did not auto-place a unit the guest did not send');
    ok(B.E('G.B.units.filter(u => u.team === 0).every(u => u.x < 4.5)'), 'guest army is not on the left');
    ok(A.E('G.B.units.filter(u => u.team === 1).every(u => u.x > 7.5)'), 'guest army is not on the right for the host');
    return { units: nA };
  });

  await run('battle: guest casts its abilities through the host, views stay in sync, result on both', async () => {
    await steps(40);
    ok(A.E('G.countdown <= 0'), 'countdown');
    const nab = B.E('G.B.teams[0].abilities.length');
    let casts = 0; const castTimes = [];
    for (let i = 0; i < 1600 && !(A.E("G.mode === 'done'") && B.E("G.mode === 'done'")); i++) {
      if (i % 5 === 0) for (let k = 0; k < nab; k++) {
        if (!B.E(`!G.B.over && canCast(G.B, G.B.teams[0], G.B.teams[0].abilities[${k}]) && G.countdown <= 0`)) continue;
        B.E(`armAbility(${k})`);
        if (B.E('!!G.target')) {
          const p = B.E('(() => { const e = G.B.alive[1][0] || { x: 9, y: 3 }; const m = G.B.alive[0][0] || { x: 1, y: 1 }; return G.target.stage === "ally" ? { x: m.x, y: m.y - 0.3 } : { x: e.x, y: e.y }; })()');
          B.E(`battleClick({ x: ${p.x}, y: ${p.y} })`); if (B.E('!!G.target')) B.E('battleClick({ x: 1, y: 1 })');
        }
        casts++; castTimes.push(A.E('G.B.over ? 1e9 : G.B.time'));
      }
      if (i % 50 === 25) {
        const drift = B.E('(() => { let m = 0; for (const u of G.B.units) if (u.alive) { const h = __hostPos[u.uid]; if (h) m = Math.max(m, Math.abs(h[1] - u.y)); } return m; })()'.replace('__hostPos', 'JSON.parse(' + JSON.stringify(A.E('JSON.stringify(Object.fromEntries(G.B.units.map(u => [u.uid, [12 - u.x, u.y]])))')) + ')'));
        ok(drift < 1.5, 'guest view drifted ' + drift);
      }
      await steps(1, 0.1);
    }
    ok(A.E("G.mode === 'done'") && B.E("G.mode === 'done'"), 'no result on both');
    const used = A.E('G.B.teams[1].abilities.reduce((s, a) => s + a.uses, 0)');
    // a cast that reaches the host after the battle ended is ignored on purpose; only count earlier ones
    const endT = A.E('G.B.time'), early = castTimes.filter(t => t < endT - 1).length;
    ok(nab >= 2 && early >= 1, 'guest could not cast its abilities (' + nab + ' abilities, ' + early + ' early casts)');
    if (early) ok(used >= 1, 'host never executed a guest cast (' + early + ' sent well before the end at ' + castTimes.map(t => t.toFixed ? t.toFixed(1) : t) + ', end ' + endT.toFixed(1) + ')');
    const wA = A.E('G.B.winner'), wB = B.E('G.B.winner');
    ok(wA === -1 ? wB === -1 : wB === 1 - wA, 'winner differs ' + wA + ' / ' + wB);
    ok(A.E('JSON.stringify(G.score)') === JSON.stringify(B.E('G.score').slice().reverse()), 'score differs');
    ok($(A, '#nextRound') && $(B, '#nextRound'), 'no next-round button');
    return { winnerHost: wA, guestCasts: casts, early, hostRan: used, time: Math.round(A.E('G.B.time')) };
  });

  await run('next round starts only when both are ready', async () => {
    click(B, '#nextRound');
    await steps(10);
    ok(A.E("G.screen === 'scr-arena'"), 'round started before host was ready');
    ok(/klaar/.test(A.E("document.querySelector('#nextInfo').textContent")), 'host does not see guest is ready');
    click(A, '#nextRound');
    await until(() => A.E('G.round') === 2 && B.E("G.round === 2 && G.screen === 'scr-draft' && !!G.A"), 6000, 'round 2 on both');
    ok(B.E('G.player.coins') === 20 && A.E('G.ai.coins') === 20, 'budget not reset');
  });

  await run('a guest bid that arrives too late is refused, not double-counted', async () => {
    await until(() => A.E('!!G.A && !G.A.closed && G.A.leader === null'), 6000, 'fresh lot');
    B.E("G.net.send({ t: 'bid', i: G.lotIdx, a: 5 })"); // wrong amount (should be €1)
    B.E("G.net.send({ t: 'bid', i: 99, a: 1 })");       // wrong lot
    await steps(6);
    ok(A.E('G.A.leader') === null && A.E('G.ai.coins') === 20, 'invalid bid accepted');
  });

  await run('leaving: the other side sees the connection is gone', async () => {
    B.E('toMenu()');
    await steps(10);
    await until(() => A.E('!!(G.net && G.net.lostShown)'), 4000, 'host notices');
    ok(/Verbinding verbroken/.test($(A, '#modalBox').textContent), 'no message');
    click(A, '#lostMenu');
    ok(A.E("G.screen === 'scr-title' && !G.net") && B.E("G.screen === 'scr-title' && !G.net"), 'not back at the menu');
  });

  await run('no page errors on either page', () => ok(A.errors.length + B.errors.length === 0, A.errors.concat(B.errors).join(' | ')));
  if (failed) { console.log(failed + ' failed'); process.exit(1); }
  console.log('Unit Draft Arena online: all passed');
  process.exit(0);
})();
