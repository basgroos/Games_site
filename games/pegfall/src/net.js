/* ===================== NETWORK BACKENDS =====================
 The match code only needs a "lobby" and named "rooms" where each player publishes one state object
 and sees everyone else's. Two backends provide that same small interface:
  - On the Bas Games site: Supabase Realtime (window.HW_BUILD.online, set by scripts/build.js).
    Presence is used only to know WHO is in a room (tracked once, and again after every reconnect);
    the state objects travel as broadcasts, re-sent on change, when someone joins, and every 2 seconds,
    so a missed message or a reconnect heals by itself. This is the same pattern the other Bas Games use.
  - Inside Claude: the artifact "room" capability (its presence is built for exactly this).
 Room interface: { peers() -> [{peer, sameTab, presence}], onPeers(fn, onErr) -> unsubscribe,
                   presence(patch) -> Promise, leave() -> Promise }   Backend: { kind, lobby, join(name) } */
const BUILD = Object.assign({ env: 'live', version: 'dev', home: '' }, window.HW_BUILD || {});

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
    document.head.appendChild(s);
  });
}

async function connectBackend() {
  if (BUILD.online && BUILD.online.url && BUILD.online.key) return supabaseBackend(BUILD.online);
  if (window.claude && typeof window.claude.use === 'function') {
    const room = await window.claude.use('room');
    return room ? { kind: 'claude', lobby: room, join: (name) => room.join(name) } : null;
  }
  return null;
}

async function supabaseBackend(cfg) {
  if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
  const rt = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } },
  });
  const me = 'pf' + randHex(6); // one id per open tab, so two tabs can play each other
  const mkRoom = (channel) => new Promise((resolve, reject) => {
    const ch = rt.channel(channel, { config: { presence: { key: me }, broadcast: { self: false, ack: false } } });
    const mine = {}, states = {}, seen = {};
    let members = [], tracked = [], cbs = [], sendTimer = null, lastSend = 0, joined = false, dead = false, beat = null;
    // here = tracked in presence, or sent us its state in the last 6 s (covers a peer that is mid-reconnect)
    const recompute = () => { const now = Date.now(); members = [...new Set([...tracked, ...Object.keys(seen).filter((k) => now - seen[k] < 6000)])];
      for (const k of Object.keys(states)) if (!members.includes(k)) { delete states[k]; delete seen[k]; } };
    const peerList = () => {
      const list = members.filter((k) => k !== me).map((k) => ({ peer: k, sameTab: false, isMe: false, presence: states[k] || {} }));
      list.push({ peer: me, sameTab: true, isMe: true, presence: Object.assign({}, mine) });
      return list;
    };
    let peers = peerList();
    let pend = false; // deliver updates after the current call, like the Claude room does
    const notify = () => { peers = peerList(); if (pend) return; pend = true; setTimeout(() => { pend = false; cbs.forEach((f) => { try { f({ peers }); } catch (e) { console.error(e); } }); }, 0); };
    const sendNow = () => {
      clearTimeout(sendTimer); sendTimer = null; if (dead || !joined) return;
      lastSend = Date.now();
      ch.send({ type: 'broadcast', event: 'st', payload: { from: me, p: mine } }).catch(() => {});
    };
    // at most ~8 state messages a second; anything in between is folded into the next one
    const sendSoon = () => { if (sendTimer) return; sendTimer = setTimeout(sendNow, Math.max(0, 120 - (Date.now() - lastSend))); };
    ch.on('presence', { event: 'sync' }, () => {
      const before = tracked.join();
      tracked = Object.keys(ch.presenceState()).sort();
      if (tracked.join() !== before) sendSoon();
      recompute(); notify();
    });
    ch.on('broadcast', { event: 'st' }, ({ payload }) => {
      if (!payload || typeof payload.from !== 'string' || payload.from === me || !payload.p || typeof payload.p !== 'object') return;
      states[payload.from] = payload.p; seen[payload.from] = Date.now();
      recompute(); notify();
    });
    ch.on('broadcast', { event: 'hi' }, () => sendSoon());
    const room = {
      name: channel,
      peers: () => peers,
      onPeers(f) { cbs.push(f); setTimeout(() => f({ peers }), 0); return () => { cbs = cbs.filter((x) => x !== f); }; },
      presence(patch) {
        for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; }
        notify(); sendSoon();
        return Promise.resolve();
      },
      async leave() {
        dead = true; clearTimeout(sendTimer); clearInterval(beat); cbs = [];
        try { await ch.untrack(); await ch.unsubscribe(); rt.removeChannel(ch); } catch (e) { /* ignore */ }
      },
    };
    // supabase-js rejoins a channel by itself after a network hiccup; we only re-announce ourselves then.
    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED' && !dead) {
        ch.track({ at: Date.now() }).catch(() => {});
        ch.send({ type: 'broadcast', event: 'hi', payload: {} }).catch(() => {});
        if (!joined) { joined = true; beat = setInterval(() => { sendNow(); const b = members.join(); recompute(); if (members.join() !== b) notify(); }, 2000); resolve(room); }
        sendSoon();
      }
    });
    setTimeout(() => { if (!joined) { dead = true; try { rt.removeChannel(ch); } catch (e) { /* ignore */ } reject({ code: 'upstream_error' }); } }, 12000);
  });
  const lobby = await mkRoom('bg-lobby-pf-' + BUILD.env);
  return { kind: 'supabase', lobby, join: (name) => mkRoom('bg-room-pf-' + BUILD.env + '-' + name) };
}
