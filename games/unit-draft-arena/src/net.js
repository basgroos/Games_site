// ===================== NETWORK (online 1v1) =====================
// Transport: Supabase Realtime on the Bas Games site (lobby `bg-lobby-uda-<env>`, rooms `bg-room-uda-<env>-<name>`),
// or a BroadcastChannel between tabs of the same browser when no online config is present (test mode).
// Every peer publishes one state object ("presence"); it is re-sent on change, for newcomers and every 2 s,
// so a lost message is repaired by the next one. The match itself is host-authoritative: the host runs the
// auction and the battle; the guest sends numbered commands and draws the host's snapshots.
function netHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const NET_NAME_RE = /[^\p{L}\p{N} _.\-']/gu;
const cleanName = s => String(s || '').replace(NET_NAME_RE, '').trim().slice(0, 16) || 'Tegenstander';

// ---------- BroadcastChannel transport (two tabs, offline testing) ----------
function LocalBus(room, chan, id) {
  this.kind = 'local'; this.room = room || 'lobby';
  this.id = id || ('t' + Math.random().toString(36).slice(2, 10));
  this.chan = chan || new BroadcastChannel('uda-net');
  this.mine = {}; this.peers = {}; this.cbs = []; this.closed = false;
  this._onMsg = ev => {
    const m = ev.data; if (!m || m.room !== this.room || m.from === this.id || this.closed) return;
    if (m.bye) { delete this.peers[m.from]; this._emit([m.from]); return; }
    const isNew = !this.peers[m.from];
    this.peers[m.from] = { presence: m.p, seen: Date.now() };
    if (isNew) this._send();
    this._emit([]);
  };
  this.chan.addEventListener('message', this._onMsg);
  this._hb = setInterval(() => {
    this._send();
    const now = Date.now(), gone = [];
    for (const k in this.peers) if (now - this.peers[k].seen > 4000) { delete this.peers[k]; gone.push(k); }
    if (gone.length) this._emit(gone);
  }, 800);
  setTimeout(() => { this._send(); this._emit([]); }, 30);
}
LocalBus.prototype._send = function () { if (!this.closed) this.chan.postMessage({ room: this.room, from: this.id, p: this.mine }); };
LocalBus.prototype._emit = function (left) {
  const list = [{ peer: this.id, presence: this.mine, isMe: true }];
  for (const k in this.peers) list.push({ peer: k, presence: this.peers[k].presence, isMe: false });
  this.cbs.forEach(cb => cb(list, left || []));
};
LocalBus.prototype.presence = function (p) { for (const k in p) { if (p[k] === null) delete this.mine[k]; else this.mine[k] = p[k]; } this._send(); this._emit([]); return Promise.resolve(); };
LocalBus.prototype.onPeers = function (cb) { this.cbs.push(cb); setTimeout(() => this._emit([]), 0); return () => { const i = this.cbs.indexOf(cb); if (i >= 0) this.cbs.splice(i, 1); }; };
LocalBus.prototype.join = function (name) { return Promise.resolve(new LocalBus(name, this.chan, this.id)); };
LocalBus.prototype.leave = function () { this.closed = true; clearInterval(this._hb); this.chan.postMessage({ room: this.room, from: this.id, bye: true }); this.chan.removeEventListener('message', this._onMsg); return Promise.resolve(); };
LocalBus.prototype.me = function () { return this.id; };

// ---------- Supabase Realtime transport (same pattern as the other Bas Games) ----------
function netLoadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); });
}
function supabaseBackend(cfg, env) {
  const p = window.supabase ? Promise.resolve() : netLoadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
  return p.then(() => {
    const rt = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 }, worker: true } });
    const me = 'ud' + Math.random().toString(36).slice(2, 10);
    function mkRoom(channel) {
      return new Promise((resolve, reject) => {
        const ch = rt.channel(channel, { config: { presence: { key: me }, broadcast: { self: false, ack: false } } });
        let mine = {}, states = {}, seen = {}, members = [], tracked = [], cbs = [], sendTimer = null, lastSend = 0, joined = false, dead = false, beat = null, prev = [], pend = false;
        function recompute() {
          const now = Date.now(), set = {};
          tracked.forEach(k => { set[k] = 1; });
          Object.keys(seen).forEach(k => { if (now - seen[k] < 6000) set[k] = 1; });
          members = Object.keys(set).sort();
          Object.keys(states).forEach(k => { if (!set[k]) { delete states[k]; delete seen[k]; } });
        }
        function list() {
          const l = members.filter(k => k !== me).map(k => ({ peer: k, presence: states[k] || {}, isMe: false }));
          l.push({ peer: me, presence: Object.assign({}, mine), isMe: true });
          return l;
        }
        function notify() {
          if (pend) return; pend = true;
          setTimeout(() => {
            pend = false;
            const l = list(), now = l.map(x => x.peer), left = prev.filter(k => now.indexOf(k) < 0); prev = now;
            cbs.forEach(f => { try { f(l, left); } catch (e) { console.error(e); } });
          }, 0);
        }
        function sendNow() {
          clearTimeout(sendTimer); sendTimer = null; if (dead || !joined) return;
          lastSend = Date.now();
          ch.send({ type: 'broadcast', event: 'st', payload: { from: me, p: mine } }).catch(() => {});
        }
        function sendSoon() { if (sendTimer) return; sendTimer = setTimeout(sendNow, Math.max(0, 60 - (Date.now() - lastSend))); }
        ch.on('presence', { event: 'sync' }, () => {
          const before = tracked.join(); tracked = Object.keys(ch.presenceState()).sort();
          if (tracked.join() !== before) sendSoon();
          recompute(); notify();
        });
        ch.on('broadcast', { event: 'st' }, m => {
          const pl = m && m.payload;
          if (!pl || typeof pl.from !== 'string' || pl.from === me || !pl.p || typeof pl.p !== 'object') return;
          states[pl.from] = pl.p; seen[pl.from] = Date.now(); recompute(); notify();
        });
        ch.on('broadcast', { event: 'hi' }, () => sendSoon());
        const room = {
          kind: 'supabase',
          presence(patch) { for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } notify(); sendSoon(); return Promise.resolve(); },
          onPeers(f) { cbs.push(f); setTimeout(() => f(list(), []), 0); return () => { cbs = cbs.filter(x => x !== f); }; },
          join(name) { return mkRoom('bg-room-uda-' + env + '-' + name); },
          leave() {
            sendNow(); dead = true; clearTimeout(sendTimer); clearInterval(beat); cbs = [];
            return Promise.resolve().then(() => ch.untrack()).then(() => ch.unsubscribe()).then(() => rt.removeChannel(ch)).catch(() => {});
          },
          me() { return me; },
        };
        ch.subscribe(st => {
          if (st === 'SUBSCRIBED' && !dead) {
            ch.track({ at: Date.now() }).catch(() => {});
            ch.send({ type: 'broadcast', event: 'hi', payload: {} }).catch(() => {});
            if (!joined) {
              joined = true;
              beat = setInterval(() => { sendNow(); const b = members.join(); recompute(); if (members.join() !== b) notify(); }, 2000);
              resolve(room);
            }
            sendSoon();
          }
        });
        setTimeout(() => { if (!joined) { dead = true; try { rt.removeChannel(ch); } catch (e) { } reject({ code: 'upstream_error' }); } }, 12000);
      });
    }
    return mkRoom('bg-lobby-uda-' + env);
  });
}

// ---------- lobby & matchmaking ----------
const Net = { lobby: null, mode: 'none', ready: null, peers: [], online: 0, _seeking: false, _code: null, _info: null, _onMatch: null, _unsub: null, _cbs: [] };
Net.init = function () {
  if (Net.ready) return Net.ready;
  Net.ready = new Promise(resolve => {
    const fallback = () => {
      if (typeof BroadcastChannel !== 'undefined') { Net.lobby = new LocalBus('lobby'); Net.mode = 'tabs'; } else Net.mode = 'none';
      resolve(Net.mode);
    };
    const B = window.HW_BUILD;
    if (B && B.online && B.online.url && B.online.key) {
      supabaseBackend(B.online, B.env || 'live').then(lobby => { Net.lobby = lobby; Net.mode = 'site'; resolve('site'); }, () => { Net.mode = 'offline'; Net.ready = null; resolve('offline'); });
      return;
    }
    fallback();
  });
  return Net.ready;
};
Net.watch = function (cb) {
  Net._cbs.push(cb);
  if (Net.lobby && !Net._unsub) {
    Net._unsub = Net.lobby.onPeers(peers => {
      Net.peers = peers; Net.online = peers.length;
      Net._cbs.forEach(f => { try { f(peers); } catch (e) { console.error(e); } });
      if (Net._seeking) Net._tryPair(peers);
    });
  }
  return () => { Net._cbs = Net._cbs.filter(f => f !== cb); };
};
// info: {name}. code: private room code or null for a quick match.
Net.seek = function (info, onMatch, code) {
  if (!Net.lobby) return;
  Net._seeking = true; Net._info = info; Net._onMatch = onMatch; Net._code = code || null;
  const p = { st: 'seek', name: cleanName(info.name), ts: Date.now() };
  if (code) p.code = code;
  Net.lobby.presence({ mm: p });
  Net.watch(() => {});
  if (Net.peers.length) Net._tryPair(Net.peers);
};
Net.cancel = function () { Net._seeking = false; if (Net.lobby) Net.lobby.presence({ mm: null }); };
Net.idle = function () { Net._seeking = false; if (Net.lobby) Net.lobby.presence({ mm: null }); };
Net._tryPair = function (peers) {
  if (!Net._seeking) return;
  const me = peers.find(p => p.isMe); if (!me) return;
  const code = Net._code;
  // someone already put us in a match: follow them to their room
  const inv = peers.find(p => { const m = p.presence && p.presence.mm; return !p.isMe && m && m.st === 'match' && m.with === me.peer && typeof m.room === 'string' && /^[a-z0-9][a-z0-9_.-]{0,47}$/.test(m.room); });
  if (inv) return Net._joinMatch(me.peer, inv.peer, inv.presence.mm.room, cleanName(inv.presence.mm.name));
  const seekers = peers.filter(p => { const m = p.presence && p.presence.mm; return m && m.st === 'seek' && (m.code || null) === code; }).sort((a, b) => a.peer < b.peer ? -1 : 1);
  const idx = seekers.findIndex(p => p.peer === me.peer); if (idx < 0) return;
  const mate = seekers[idx % 2 === 0 ? idx + 1 : idx - 1]; if (!mate) return;
  const a = me.peer < mate.peer ? me.peer : mate.peer, b = me.peer < mate.peer ? mate.peer : me.peer;
  const name = 'm-' + netHash(a + '|' + b).toString(36) + (code ? '-' + code.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
  Net._joinMatch(me.peer, mate.peer, name, cleanName(mate.presence.mm.name));
};
Net._joinMatch = function (myPeer, oppPeer, room, oppName) {
  Net._seeking = false;
  const info = Net._info;
  Net.lobby.presence({ mm: { st: 'match', room, with: oppPeer, name: cleanName(info.name), ts: Date.now() } });
  Net.lobby.join(room).then(r => {
    const s = new NetSession(r, myPeer, oppPeer, info, oppName);
    Net._onMatch && Net._onMatch(s);
  }, () => { Net._seeking = true; Net.lobby.presence({ mm: { st: 'seek', name: cleanName(info.name), ts: Date.now(), code: Net._code || undefined } }); });
};
Net.makeCode = function () { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

// ---------- match session ----------
// host (side 0): receives the guest's commands (onCmd) and publishes the whole match state.
// guest (side 1): sends commands and receives the host's state (onState).
function NetSession(room, myPeer, oppPeer, info, oppName) {
  this.room = room; this.myPeer = myPeer; this.oppPeer = oppPeer;
  this.side = myPeer < oppPeer ? 0 : 1; this.host = this.side === 0;
  this.myName = cleanName(info.name); this.oppName = oppName || 'Tegenstander';
  this.lastSeen = Date.now(); this.cmdN = 0; this.cmds = []; this.seenN = 0; this.stV = 0; this.ver = 0;
  this.ended = false; this.oppLeft = false; this.onCmd = null; this.onState = null; this.onLeft = null; this.pending = null;
  room.presence({ hello: { name: this.myName, v: 1 } });
  this._unsub = room.onPeers(peers => {
    const o = peers.find(p => p.peer === this.oppPeer); if (!o) return;
    this.lastSeen = Date.now();
    const pr = o.presence || {};
    if (pr.hello && pr.hello.name) this.oppName = cleanName(pr.hello.name);
    if (pr.left && !this.oppLeft) { this.oppLeft = true; if (this.onLeft) this.onLeft(); return; }
    if (this.host && Array.isArray(pr.cmds)) {
      const list = pr.cmds.filter(c => c && typeof c === 'object' && (c.n | 0) > this.seenN).sort((a, b) => a.n - b.n);
      for (const c of list) { this.seenN = c.n | 0; if (this.onCmd) { try { this.onCmd(c); } catch (e) { console.error(e); } } }
    }
    if (!this.host && pr.st && typeof pr.st === 'object' && (pr.st.v | 0) > this.stV) {
      this.stV = pr.st.v | 0;
      if (this.onState) { try { this.onState(pr.st); } catch (e) { console.error(e); } } else this.pending = pr.st;
    }
  });
}
NetSession.prototype.send = function (c) {
  c.n = ++this.cmdN; this.cmds.push(c); if (this.cmds.length > 40) this.cmds.shift();
  this.room.presence({ cmds: this.cmds.slice() });
};
NetSession.prototype.publish = function (st) { st.v = ++this.ver; this.room.presence({ st }); };
NetSession.prototype.leave = function () {
  if (this.ended) return; this.ended = true;
  try { this.room.presence({ left: true }); } catch (e) { }
  const r = this.room, u = this._unsub;
  setTimeout(() => { try { u && u(); } catch (e) { } r.leave(); }, 500);
  Net.idle();
};
