/* Pegfall Arena online test: two separate game pages play a full match against each other through the real
   matchmaking screens, presence transport and protocol. The network is an in-memory stand-in with the same
   presence semantics as the Supabase adapter (one merged presence object per tab, sync to everyone). */
const { load, ok, waitFor } = require('./helpers');

// in-memory "realtime": rooms of peers, each with one presence object; every change syncs to all members
const rooms = {};
function joinRoom(name, peer) {
  const r = rooms[name] || (rooms[name] = { members: new Map() });
  const me = { presence: {}, cbs: [] };
  r.members.set(peer, me);
  const snapshot = (forPeer) => [...r.members.entries()].map(([k, v]) => ({ peer: k, sameTab: k === forPeer, isMe: k === forPeer, presence: JSON.parse(JSON.stringify(v.presence)) }));
  const sync = () => setTimeout(() => { for (const [k, v] of r.members) v.cbs.forEach((f) => f({ peers: snapshot(k) })); }, 5);
  sync();
  return {
    peers: () => snapshot(peer),
    onPeers(f) { me.cbs.push(f); setTimeout(() => f({ peers: snapshot(peer) }), 0); return () => { me.cbs = me.cbs.filter((x) => x !== f); }; },
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete me.presence[k]; else me.presence[k] = JSON.parse(JSON.stringify(patch[k])); } sync(); return Promise.resolve(); },
    leave() { r.members.delete(peer); sync(); return Promise.resolve(); },
  };
}
function connect(page, id) {
  page.w.__fakeBackend = { kind: 'fake', lobby: joinRoom('lobby', id), join: (name) => Promise.resolve(joinRoom(name, id)) };
  page.E('NET.backend=__fakeBackend;NET.room=NET.backend.lobby;NET.status="on";');
}

let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
const A = load(), B = load();
connect(A, 'tab-a'); connect(B, 'tab-b');
const $ = (p, s) => p.w.document.querySelector(s);
const phase = (p) => p.E('S.match&&S.match.phase');
async function playRound(p) {
  // plays whatever this page needs to do next; returns false once the match is over
  const ph = phase(p);
  if (ph === 'over') return false;
  if (ph === 'pick' && $(p, '#pkg .ccard') && !p.__picked) { p.__picked = 1; $(p, '#pkg .ccard').click(); $(p, '#lock').click(); }
  if (ph !== 'pick') p.__picked = 0;
  if (ph === 'arcade' && p.E('!!VIEWS.arcade') && p.E('!VIEWS.arcade.m.done')) {
    p.E('VIEWS.arcade.m.launchAll()');
    for (let f = 0; f < 3000 && p.E('!VIEWS.arcade.m.done'); f++) p.E('VIEWS.arcade.target=steerTarget(VIEWS.arcade.m,Math.random,12,.5);VIEWS.arcade.frame(1/60)');
    p.E('VIEWS.arcade.frame(1/60)');
  }
  if (ph === 'muster' && $(p, '#tobattle')) $(p, '#tobattle').click();
  if (ph === 'battle' && p.E('!!VIEWS.battle&&!VIEWS.battle.reported')) p.E('VIEWS.battle.intro=0;VIEWS.battle.skip();VIEWS.battle.frame(0.016)');
  if (ph === 'roundOver' && $(p, '#cont')) $(p, '#cont').click();
  return true;
}
(async () => {
  await run('host creates a private match, friend joins with the code', async () => {
    A.E("S.save.name='Host';go('search',{kind:'create'})");
    const code = $(A, '.code').textContent.trim().toLowerCase();
    ok(/^[a-z0-9]{5}$/.test(code), 'bad code ' + code);
    B.E("S.save.name='Friend'"); B.E(`go('search',{kind:'join',code:${JSON.stringify(code)}})`);
    await waitFor(() => A.E("S.screen==='match'") && B.E("S.screen==='match'"), 8000, 'both in a match');
    await waitFor(() => A.E('!!S.match.oppInfo') && B.E('!!S.match.oppInfo'), 8000, 'rosters exchanged');
    ok(A.E('S.match.oppInfo.name') === 'Friend' && B.E('S.match.oppInfo.name') === 'Host', 'names not exchanged');
    ok(A.E('S.match.side') !== B.E('S.match.side'), 'both players got the same side');
    return { code, sides: [A.E('S.match.side'), B.E('S.match.side')] };
  });
  await run('opponent sees live arcade progress', async () => {
    await waitFor(() => phase(A) === 'arcade' && phase(B) === 'arcade', 8000, 'both at the arcade');
    A.E('VIEWS.arcade.m.launchAll()');
    for (let f = 0; f < 600; f++) A.E('VIEWS.arcade.target=steerTarget(VIEWS.arcade.m,Math.random,0,.8);VIEWS.arcade.frame(1/60)');
    await waitFor(() => B.E('Object.keys((S.match.opp&&S.match.opp.lv&&S.match.opp.lv.counts)||{}).length') > 0, 3000, 'live progress on the other page');
    return { seenByFriend: B.E('S.match.opp.lv') };
  });
  await run('both pages play the match to the end and agree on everything', async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      const a = await playRound(A), b = await playRound(B);
      if (!a && !b) break;
      await new Promise((r) => setTimeout(r, 30));
    }
    ok(phase(A) === 'over' && phase(B) === 'over', `match not over (${phase(A)} / ${phase(B)})`);
    const sa = A.E('S.match.score'), sb = B.E('S.match.score');
    ok(JSON.stringify(sa) === JSON.stringify(sb), 'scores differ ' + sa + ' vs ' + sb);
    ok(A.E('JSON.stringify(S.match.army)') === B.E('JSON.stringify(S.match.army)'), 'armies differ');
    ok(!A.E('S.match.desync') && !B.E('S.match.desync'), 'battle results disagreed');
    ok(!A.E('S.match.forfeit') && !B.E('S.match.forfeit'), 'match was forfeited: ' + (A.E('S.match.forfeit&&S.match.forfeit.msg') || B.E('S.match.forfeit&&S.match.forfeit.msg')));
    ok(Math.max(...sa) === 3, 'nobody reached 3');
    return { score: sa, rounds: A.E('S.match.history.length'), armies: A.E('S.match.army.map(a=>a.reduce((s,x)=>s+x.count,0))') };
  });
  await run('a forged machine log is rejected by the other player', async () => {
    const r = A.E(`(()=>{const [tA,tB]=makeLoopback();const m=new Match({transport:tA,side:0,me:{name:'x',st:['pip','bramble'],coll:ownedIds()}});
      m.phase='arcadeWait';m.round=1;m.myLog={};m.seed='s';m.machine=[['pip'],['pip','bramble']];m.collect({pip:3,vex:40});return m.forfeit&&m.forfeit.msg;})()`);
    ok(/impossible/.test(r || ''), 'forged log was accepted');
    return r;
  });
  const errs = [...A.errors, ...B.errors];
  if (errs.length) { console.log('page errors:', errs); failed++; }
  if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
  console.log('Pegfall Arena online: all checks passed');
  process.exit(0);
})();
