/* ===================== NETWORK BACKENDS =====================
 The match code only needs a "lobby" and named "rooms" where each player publishes one presence object
 and sees everyone else's. Two backends provide that same small interface:
  - On the Bas Games site: Supabase Realtime presence (window.HW_BUILD.online, set by scripts/build.js)
  - Inside Claude: the artifact "room" capability
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
    const ch = rt.channel(channel, { config: { presence: { key: me } } });
    const mine = {};
    let peers = [{ peer: me, sameTab: true, isMe: true, presence: {} }], cbs = [], timer = null, joined = false, dead = false;
    const notify = () => cbs.forEach((f) => { try { f({ peers }); } catch (e) { console.error(e); } });
    const rebuild = () => {
      const st = ch.presenceState();
      peers = Object.keys(st).filter((k) => k !== me).map((k) => {
        const metas = st[k] || [];
        return { peer: k, sameTab: false, isMe: false, presence: (metas[metas.length - 1] || {}).p || {} };
      });
      peers.push({ peer: me, sameTab: true, isMe: true, presence: Object.assign({}, mine) });
      notify();
    };
    ch.on('presence', { event: 'sync' }, rebuild);
    const room = {
      name: channel,
      peers: () => peers,
      onPeers(f, onErr) { cbs.push(f); if (onErr) room._err = onErr; if (joined) setTimeout(() => f({ peers }), 0); return () => { cbs = cbs.filter((x) => x !== f); }; },
      presence(patch) {
        for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; }
        const self = peers.find((p) => p.sameTab); if (self) self.presence = Object.assign({}, mine);
        notify();
        if (!timer && !dead) timer = setTimeout(() => { timer = null; if (!dead) ch.track({ p: mine }).catch(() => {}); }, 60);
        return Promise.resolve();
      },
      async leave() {
        dead = true; clearTimeout(timer); cbs = [];
        try { await ch.untrack(); await ch.unsubscribe(); rt.removeChannel(ch); } catch (e) { /* ignore */ }
      },
    };
    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED') { if (!joined) { joined = true; ch.track({ p: mine }).catch(() => {}); resolve(room); } }
      else if ((st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') && !dead) {
        if (!joined) reject({ code: 'upstream_error' }); else if (room._err) room._err({ code: 'upstream_error' });
      }
    });
    setTimeout(() => { if (!joined) reject({ code: 'upstream_error' }); }, 10000);
  });
  const lobby = await mkRoom('bg-lobby-pf-' + BUILD.env);
  return { kind: 'supabase', lobby, join: (name) => mkRoom('bg-room-pf-' + BUILD.env + '-' + name) };
}
