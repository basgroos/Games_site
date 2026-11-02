/* Pegfall Arena connection test. Plays real online matches between two pages over a simulated Supabase Realtime
   (same API the site uses: channels, presence track/sync, broadcast) that loses messages and has network hiccups.
   Checks that hiccups and short disappearances never end a match, and that leaving on purpose does. */
const { load, ok, waitFor, sleep } = require('./helpers');

/* ---------- simulated Supabase Realtime server ---------- */
function makeServer() {
  const chans = {}; // name -> Map(clientId -> client)
  let nextId = 0;
  const S = { drop: 0, sent: 0, dropped: 0 };
  const later = (f, ms = 8) => setTimeout(f, ms);
  function syncAll(name) { for (const c of (chans[name] || new Map()).values()) if (c.subscribed) later(() => c.fire('presence', 'sync')); }
  S.createClient = () => ({
    channel(name, { config }) {
      const c = { id: nextId++, name, key: config.presence.key, self: !!(config.broadcast && config.broadcast.self), handlers: [], meta: null, subscribed: false, statusCb: null };
      c.fire = (type, event, arg) => c.handlers.filter((h) => h.type === type && h.event === event).forEach((h) => h.cb(arg));
      const ch = {
        on(type, filter, cb) { c.handlers.push({ type, event: filter.event, cb }); return ch; },
        subscribe(cb) { c.statusCb = cb; (chans[name] = chans[name] || new Map()).set(c.id, c); later(() => { c.subscribed = true; cb('SUBSCRIBED'); c.fire('presence', 'sync'); }, 20); return ch; },
        presenceState() { const o = {}; for (const x of (chans[name] || new Map()).values()) if (x.meta) (o[x.key] = o[x.key] || []).push(x.meta); return o; },
        track(meta) { if (!c.subscribed) return Promise.resolve('error'); c.meta = Object.assign({ phx_ref: String(Math.random()) }, meta); syncAll(name); return Promise.resolve('ok'); },
        untrack() { c.meta = null; syncAll(name); return Promise.resolve('ok'); },
        send(msg) {
          if (!c.subscribed) return Promise.resolve('error');
          for (const x of (chans[name] || new Map()).values()) {
            if (!x.subscribed || (x === c && !c.self)) continue;
            S.sent++; if (Math.random() < S.drop) { S.dropped++; continue; }
            later(() => x.fire('broadcast', msg.event, { payload: JSON.parse(JSON.stringify(msg.payload)) }), 5 + Math.random() * 20);
          }
          return Promise.resolve('ok');
        },
        unsubscribe() { c.subscribed = false; c.meta = null; if (chans[name]) chans[name].delete(c.id); syncAll(name); return Promise.resolve('ok'); },
        _c: c,
      };
      return ch;
    },
    removeChannel() {},
  });
  // A network hiccup like supabase-js sees it: the socket drops (presence of that client disappears for everyone),
  // the channel reports CHANNEL_ERROR, then rejoins a moment later and reports SUBSCRIBED again (the client must re-track).
  S.hiccup = (key, prefix, ms) => {
    for (const [name, m] of Object.entries(chans)) {
      if (!name.startsWith(prefix)) continue;
      for (const c of m.values()) if (c.key === key && c.subscribed) {
        c.subscribed = false; c.meta = null; syncAll(name); c.statusCb('CHANNEL_ERROR');
        setTimeout(() => { c.subscribed = true; c.statusCb('SUBSCRIBED'); c.fire('presence', 'sync'); }, ms);
      }
    }
  };
  S.keyOf = (prefix) => { for (const [name, m] of Object.entries(chans)) if (name.startsWith(prefix)) return [...m.values()].map((c) => c.key); return []; };
  return S;
}

let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
const $ = (p, s) => p.w.document.querySelector(s);
const phase = (p) => p.E('S.match&&S.match.phase');
async function step(p) {
  const ph = phase(p);
  if (ph === 'over' || !ph) return false;
  if (ph === 'pick' && $(p, '#pkg .ccard') && !p.__picked) { p.__picked = 1; $(p, '#pkg .ccard').click(); $(p, '#lock').click(); }
  if (ph !== 'pick') p.__picked = 0;
  if (ph === 'arcade' && p.E('!!VIEWS.arcade') && p.E('!VIEWS.arcade.m.done')) {
    p.E('VIEWS.arcade.m.pre=0;VIEWS.arcade.m.launchAll()');
    for (let f = 0; f < 3000 && p.E('!VIEWS.arcade.m.done'); f++) p.E('VIEWS.arcade.target=steerTarget(VIEWS.arcade.m,Math.random,12,.5);VIEWS.arcade.frame(1/60)');
    p.E('VIEWS.arcade.frame(1/60)');
  }
  if (ph === 'muster' && $(p, '#tobattle')) $(p, '#tobattle').click();
  if (ph === 'battle' && p.E('!!VIEWS.battle&&!VIEWS.battle.reported')) p.E('VIEWS.battle.intro=0;VIEWS.battle.skip();VIEWS.battle.frame(0.016)');
  if (ph === 'roundOver' && $(p, '#cont')) $(p, '#cont').click();
  return true;
}
async function pair(server, nameA, nameB) {
  const mk = () => load({ before: (w) => { w.supabase = { createClient: server.createClient }; } });
  const A = mk(), B = mk();
  await waitFor(() => A.E("NET.status==='on'") && B.E("NET.status==='on'"), 5000, 'both online via Supabase');
  ok(A.E('NET.backend.kind') === 'supabase', 'not using the Supabase backend');
  A.E(`S.save.name=${JSON.stringify(nameA)};go('search',{kind:'create'})`);
  await waitFor(() => $(A, '.code'), 3000, 'invite code');
  const code = $(A, '.code').textContent.trim().toLowerCase();
  B.E(`S.save.name=${JSON.stringify(nameB)};go('search',{kind:'join',code:${JSON.stringify(code)}})`);
  await waitFor(() => A.E("S.screen==='match'&&!!S.match&&!!S.match.oppInfo") && B.E("S.screen==='match'&&!!S.match&&!!S.match.oppInfo"), 8000, 'match started on both pages');
  return { A, B, code };
}

(async () => {
  await run('full match over lossy Supabase with network hiccups: nobody is declared a winner by mistake', async () => {
    const server = makeServer(); server.drop = 0.15;
    const { A, B, code } = await pair(server, 'Ann', 'Bob');
    const prefix = 'bg-room-pf-live-pf-' + code;
    const keys = server.keyOf(prefix);
    ok(keys.length === 2, 'expected two players in the room, got ' + keys.length);
    let hiccups = 0, sawBanner = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 170000) {
      const a = await step(A), b = await step(B);
      if (!a && !b) break;
      const el = Date.now() - t0;
      if (hiccups < 4 && el > 4000 * (hiccups + 1)) { server.hiccup(keys[hiccups % 2], prefix, 1500 + hiccups * 1500); hiccups++; }
      if (A.E("!!document.querySelector('#netbox .warn')") || B.E("!!document.querySelector('#netbox .warn')")) sawBanner = true;
      await sleep(40);
    }
    const fa = A.E('S.match&&S.match.forfeit&&S.match.forfeit.msg'), fb = B.E('S.match&&S.match.forfeit&&S.match.forfeit.msg');
    ok(!fa && !fb, 'match was forfeited: ' + (fa || fb));
    ok(phase(A) === 'over' && phase(B) === 'over', `match did not finish (${phase(A)} / ${phase(B)})`);
    ok(A.E('JSON.stringify(S.match.score)') === B.E('JSON.stringify(S.match.score)'), 'scores differ');
    ok(A.E('JSON.stringify(S.match.army)') === B.E('JSON.stringify(S.match.army)'), 'armies differ');
    ok(!A.E('S.match.desync') && !B.E('S.match.desync'), 'battle results disagreed');
    return { score: A.E('S.match.score'), rounds: A.E('S.match.history.length'), hiccups, dropped: server.dropped + '/' + server.sent, sawBanner };
  });

  await run('opponent missing for 14 s shows a waiting banner but does not end the match', async () => {
    const server = makeServer();
    const { A, B, code } = await pair(server, 'Cat', 'Dan');
    A.E('GONE_AFTER=30'); B.E('GONE_AFTER=30');
    const prefix = 'bg-room-pf-live-pf-' + code, kb = server.keyOf(prefix).find((k) => k !== A.E('S.match.t.nr.peers().find(p=>p.sameTab).peer'));
    server.hiccup(kb, prefix, 14000);
    await sleep(12500);
    const banner = A.E("(document.querySelector('#netbox .warn')||{}).textContent||''");
    ok(/Waiting for them|Reconnecting/.test(banner), 'no waiting banner: ' + banner);
    ok(!A.E('S.match.forfeit'), 'match ended while waiting');
    await waitFor(() => A.E("!document.querySelector('#netbox .warn')"), 8000, 'banner to clear after they came back');
    ok(!A.E('S.match.forfeit') && !B.E('S.match.forfeit'), 'match ended after they came back');
    for (const p of [A, B]) p.E('closeMatch()');
    return { banner };
  });

  await run('opponent who stays away past the limit loses by forfeit', async () => {
    const server = makeServer();
    const { A, B, code } = await pair(server, 'Eve', 'Fay');
    A.E('GONE_AFTER=3');
    const prefix = 'bg-room-pf-live-pf-' + code, kb = server.keyOf(prefix).find((k) => k !== A.E('S.match.t.nr.peers().find(p=>p.sameTab).peer'));
    B.E('S.match.stop();S.match.t.close(false)'); // B's page crashes: gone without saying goodbye
    await waitFor(() => A.E("S.match.phase==='over'"), 20000, 'forfeit after the limit');
    const msg = A.E('S.match.forfeit.msg');
    ok(/lost their connection/.test(msg), msg);
    ok(A.E('S.match.winnerSide') === A.E('S.match.side'), 'remaining player did not win');
    A.E('closeMatch()');
    return msg;
  });

  await run('leaving on purpose ends the match for the other player right away', async () => {
    const server = makeServer();
    const { A, B } = await pair(server, 'Gus', 'Hal');
    const t0 = Date.now();
    B.E('leaveMatch()');
    await waitFor(() => A.E("S.match.phase==='over'"), 5000, 'the other player to see the leave');
    const msg = A.E('S.match.forfeit.msg');
    ok(/left the match/.test(msg), msg);
    return { msg, ms: Date.now() - t0 };
  });

  if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
  console.log('Pegfall Arena connection: all checks passed');
  process.exit(0);
})();
