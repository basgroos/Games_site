/* Age Clash online: twee losse pagina's spelen via de echte schermen een privé-match (lockstep).
   Het netwerk is een nagebootste realtime-dienst met dezelfde presence-werking als de Supabase-adapter;
   met een vertraging en zonder dat berichten in volgorde hoeven aan te komen. */
const { load, ok, sleep, waitFor, run, done } = require('./helpers');

const rooms = {};
function joinRoom(name, peer, lag) {
  const r = rooms[name] || (rooms[name] = { members: new Map() });
  const me = { presence: {}, cbs: [] };
  r.members.set(peer, me);
  let prev = [];
  const snapshot = (forPeer) => [...r.members.entries()].map(([k, v]) => ({ peer: k, isMe: k === forPeer, presence: JSON.parse(JSON.stringify(v.presence)) }));
  const deliver = (k, v) => { const list = snapshot(k); v.cbs.forEach((f) => f(list, [])); };
  const sync = () => { for (const [k, v] of r.members) setTimeout(() => deliver(k, v), lag()); };
  sync();
  const room = {
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete me.presence[k]; else me.presence[k] = JSON.parse(JSON.stringify(patch[k])); } sync(); return Promise.resolve(); },
    onPeers(f) { me.cbs.push(f); setTimeout(() => f(snapshot(peer), []), 0); return () => { me.cbs = me.cbs.filter((x) => x !== f); }; },
    join: (n) => Promise.resolve(joinRoom(n, peer, lag)),
    leave() { r.members.delete(peer); me.cbs = []; sync(); return Promise.resolve(); },
    me: () => peer,
  };
  return room;
}
function connect(p, id) {
  const lag = () => 5 + Math.random() * 40;
  p.E('0'); p.w.__lobby = joinRoom('lobby', id, lag);
  p.E("AC.Net.lobby=__lobby;AC.Net.mode='site';AC.Net.delay=4;AC.Net.ready=Promise.resolve('site');");
}
const A = load(), B = load();
connect(A, 'tab-a'); connect(B, 'tab-b');
const $ = (p, s) => p.w.document.querySelector(s);
const btn = (p, txt) => [...p.w.document.querySelectorAll('button')].find((b) => b.textContent.includes(txt));
const click = (p, el) => el.dispatchEvent(new p.w.MouseEvent('click', { bubbles: true }));
const step = (p, dt) => p.E(`AC.Main.step(${dt})`);

(async () => {
  await run('privé-match: host maakt een code, vriend doet mee', async () => {
    A.E("AC.Profile.data.name='Host'"); B.E("AC.Profile.data.name='Vriend';AC.Profile.data.agesOwned=[1,1,1,1,1,1,1,1]");
    A.E("AC.UI.show('online')"); B.E("AC.UI.show('online')");
    await waitFor(() => btn(A, 'Privé-match maken') && btn(B, 'Deelnemen'), 3000, 'lobby');
    click(A, btn(A, 'Privé-match maken'));
    const code = A.E('AC.Net._code');
    ok(/^[A-Z0-9]{5}$/.test(code), 'code ' + code);
    $(B, 'input[placeholder=CODE]').value = code; click(B, btn(B, 'Deelnemen'));
    await waitFor(() => A.E('AC.Match.active') && B.E('AC.Match.active'), 9000, 'beide in de match');
    ok(A.E('AC.Match.oppInfo.name') === 'Vriend' && B.E('AC.Match.oppInfo.name') === 'Host', 'namen niet uitgewisseld');
    ok(A.E('AC.Match.net.side') + B.E('AC.Match.net.side') === 1, 'kanten');
    ok(B.E('AC.Match.sim.players[AC.Match.net.side].maxAge') === 7 && A.E('AC.Match.sim.players[1-AC.Match.net.side].maxAge') === 7, 'collectie niet uitgewisseld');
  });
  await run('lockstep: beide pagina\'s houden exact dezelfde staat', async () => {
    const cmds = ["{t:'spawn',s:0}", "{t:'spawn',s:1}", "{t:'spawn',s:2}", "{t:'spawn',s:3}", "{t:'tower',s:1,k:0}", "{t:'upg',k:'income'}", "{t:'upg',k:'dmg1'}", "{t:'power'}", "{t:'evolve'}"];
    for (let i = 0; i < 1800; i++) {
      for (const p of [A, B]) {
        if (i % 7 === 0) p.E(`AC.Match.net.command(${cmds[Math.floor(Math.random() * cmds.length)]})`);
        step(p, 1 / 30);
      }
      if (i % 3 === 0) await sleep(4);
    }
    await sleep(200);
    for (let i = 0; i < 60; i++) { step(A, 1 / 30); step(B, 1 / 30); await sleep(3); }
    const hA = A.E('JSON.stringify(AC.Match.net.hashes)'), hB = B.E('JSON.stringify(AC.Match.net.hashes)');
    const a = JSON.parse(hA), b = JSON.parse(hB), common = Object.keys(a).filter((k) => k in b);
    ok(common.length >= 5, 'te weinig vergelijkingen: ' + common.length);
    ok(common.every((k) => a[k] === b[k]), 'desync');
    ok(!A.E('AC.Match.net.desync') && !B.E('AC.Match.net.desync'), 'desync gemeld');
    return { turns: A.E('AC.Match.net.exec'), checks: common.length, units: A.E('AC.Match.sim.units.length') };
  });
  await run('tabblad op de achtergrond (geen animatieframes): de match loopt toch door', async () => {
    // A krijgt geen frames meer (zoals een tabblad dat niet in beeld is); alleen B wordt gestapt.
    const e0 = A.E('AC.Match.net.exec');
    for (let i = 0; i < 150; i++) { step(B, 1 / 30); await sleep(10); }
    ok(A.E('AC.Match.net.exec') > e0 + 8, 'A liep niet door: ' + e0 + ' -> ' + A.E('AC.Match.net.exec'));
    ok(A.E('AC.Match.net.away') === true, 'A meldt niet dat hij weg is');
    await sleep(100); step(B, 1 / 30);
    ok(B.E('AC.Match.net.oppAway') === true && /niet in beeld/.test(B.E("AC.Match.netEl.textContent")), 'B krijgt geen melding');
    ok(B.E('AC.Match.net.grace()') >= 180, 'geen langere wachttijd');
    for (let i = 0; i < 40; i++) { step(A, 1 / 30); step(B, 1 / 30); await sleep(3); }
    await sleep(300); step(B, 1 / 30);
    ok(A.E('AC.Match.net.away') === false && B.E('AC.Match.net.oppAway') === false, 'terug-melding');
    ok(!A.E('AC.Match.net.desync') && !B.E('AC.Match.net.desync'), 'desync');
  });
  await run('opgeven: beide zien hetzelfde einde', async () => {
    B.E("AC.Match.net.command({t:'surrender'})");
    for (let i = 0; i < 200 && !(A.E('AC.Match.sim.over') && B.E('AC.Match.sim.over')); i++) { step(A, 1 / 30); step(B, 1 / 30); await sleep(3); }
    ok(A.E('AC.Match.sim.over') && B.E('AC.Match.sim.over'), 'niet afgelopen');
    ok(A.E('AC.Match.sim.winner') === B.E('AC.Match.sim.winner'), 'andere winnaar');
    for (let i = 0; i < 80; i++) { step(A, 1 / 30); step(B, 1 / 30); }
    ok($(A, '.result .rtitle').textContent === 'OVERWINNING' && $(B, '.result .rtitle').textContent === 'NEDERLAAG', 'resultaatscherm');
  });
  await run('korte haper: geen onterechte winst; echt weg: wel winst na de wachttijd', async () => {
    for (const p of [A, B]) click(p, btn(p, 'Nieuwe match zoeken'));
    await sleep(50);
    for (const p of [A, B]) click(p, btn(p, 'SNEL ZOEKEN'));
    await waitFor(() => A.E('AC.Match.active') && B.E('AC.Match.active'), 9000, 'nieuwe match');
    for (let i = 0; i < 60; i++) { step(A, 1 / 30); step(B, 1 / 30); await sleep(3); }
    // B valt 14 s (speltijd) weg: A wacht en wint niet
    A.E('AC.NetMatch.GRACE=45');
    const t0 = Date.now(); A.E('AC.Match.net.lastSeen=Date.now()-14000'); for (let i = 0; i < 30; i++) { step(A, 1 / 30); await sleep(2); }
    ok(!A.E('AC.Match.over'), 'onterechte winst na korte haper');
    ok(A.E("document.querySelector('.hint[style*=\"block\"]') !== null"), 'geen wachtmelding');
    for (let i = 0; i < 30; i++) { step(A, 1 / 30); step(B, 1 / 30); await sleep(3); }
    ok(!A.E('AC.Match.over'), 'match ging niet verder na herstel');
    // B is echt weg
    B.E('AC.Match.net.room.leave()');
    A.E('AC.Match.net.lastSeen=Date.now()-46000');
    for (let i = 0; i < 120 && !A.E('AC.Match.over'); i++) { step(A, 1 / 30); await sleep(2); }
    ok(A.E('AC.Match.over && AC.Match.disconnectWin'), 'geen winst na echte disconnect');
  });
  ok(!A.errors.length && !B.errors.length, [...A.errors, ...B.errors].join(' | '));
  done();
})();
