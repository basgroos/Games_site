/* =========================================================================
 * net.js — Online PvP.
 *
 * Architectuur: deterministische LOCKSTEP. Beide spelers draaien exact
 * dezelfde simulatie (zelfde seed); alleen commando's worden uitgewisseld.
 * Een "beurt" = 3 ticks (100 ms). Commando's worden 3 beurten vooruit
 * ingepland, zodat beide clients ze op hetzelfde moment uitvoeren.
 * Iedere ~5 s wisselen clients een hash van de game-state uit om
 * desyncs te detecteren.
 *
 * Transport: presence-gebaseerd (iedere speler publiceert zijn eigen staat,
 * inclusief een venster van recente beurten). Werkt via
 *   1) de realtime "room" van het artifact-platform (echte online spelers)
 *   2) BroadcastChannel (twee tabbladen in dezelfde browser — offline test)
 * ========================================================================= */
var AC = window.AC;
(function () {
  var TURN_TICKS = 3, WINDOW = 14;

  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* --------------------------- transports --------------------------- */
  function wrapRoom(r) {
    var meId = null;
    return {
      kind: 'room',
      presence: function (p) { return r.presence(p).catch(function () { }); },
      onPeers: function (cb) {
        return r.onPeers(function (ch) {
          var list = ch.peers.map(function (p) { if (p.sameTab) meId = p.peer; return { peer: p.peer, presence: p.presence || {}, isMe: !!p.sameTab, kind: p.kind }; })
            .filter(function (p) { return p.kind !== 'agent'; });
          cb(list, ch.left ? ch.left.map(function (p) { return p.peer; }) : []);
        }, function () { });
      },
      join: function (name) { return r.join(name).then(wrapRoom); },
      leave: function () { if (r.leave) return r.leave().catch(function () { }); },
      me: function () { return meId; },
    };
  }

  function LocalBus(room, chan, id) {
    this.kind = 'local'; this.room = room || 'lobby';
    this.id = id || ('t' + Math.random().toString(36).slice(2, 10));
    this.chan = chan || new BroadcastChannel('ageclash-net');
    this.mine = {}; this.peers = {}; this.cbs = []; this.closed = false;
    var self = this;
    this._onMsg = function (ev) {
      var m = ev.data; if (!m || m.room !== self.room || m.from === self.id || self.closed) return;
      if (m.bye) { delete self.peers[m.from]; self._emit([m.from]); return; }
      var isNew = !self.peers[m.from];
      self.peers[m.from] = { presence: m.p, seen: Date.now() };
      if (isNew) self._send();
      self._emit([]);
    };
    this.chan.addEventListener('message', this._onMsg);
    this._hb = setInterval(function () {
      self._send();
      var now = Date.now(), gone = [];
      for (var k in self.peers) if (now - self.peers[k].seen > 4000) { delete self.peers[k]; gone.push(k); }
      if (gone.length) self._emit(gone);
    }, 800);
    setTimeout(function () { self._send(); self._emit([]); }, 30);
  }
  LocalBus.prototype._send = function () { if (!this.closed) this.chan.postMessage({ room: this.room, from: this.id, p: this.mine }); };
  LocalBus.prototype._emit = function (left) {
    var list = [{ peer: this.id, presence: this.mine, isMe: true }];
    for (var k in this.peers) list.push({ peer: k, presence: this.peers[k].presence, isMe: false });
    this.cbs.forEach(function (cb) { cb(list, left || []); });
  };
  LocalBus.prototype.presence = function (p) { for (var k in p) { if (p[k] === null) delete this.mine[k]; else this.mine[k] = p[k]; } this._send(); this._emit([]); return Promise.resolve(); };
  LocalBus.prototype.onPeers = function (cb) { this.cbs.push(cb); var self = this; setTimeout(function () { self._emit([]); }, 0); return function () { var i = self.cbs.indexOf(cb); if (i >= 0) self.cbs.splice(i, 1); }; };
  LocalBus.prototype.join = function (name) { return Promise.resolve(new LocalBus(name, this.chan, this.id)); };
  LocalBus.prototype.leave = function () { this.closed = true; clearInterval(this._hb); this.chan.postMessage({ room: this.room, from: this.id, bye: true }); this.chan.removeEventListener('message', this._onMsg); return Promise.resolve(); };
  LocalBus.prototype.me = function () { return this.id; };

  /* Supabase Realtime (Bas Games-site). Zelfde patroon als de andere Bas Games:
     presence alleen om te zien wie er is, de staat van iedere speler via broadcast,
     opnieuw verstuurd bij wijziging, bij een nieuwkomer en iedere 2 seconden. */
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); });
  }
  function supabaseBackend(cfg, env) {
    var p = window.supabase ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
    return p.then(function () {
      var rt = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 }, worker: true } }); // hartslag in een worker: blijft verbonden in een achtergrond-tabblad
      var me = 'ac' + Math.random().toString(36).slice(2, 10);
      function mkRoom(channel) {
        return new Promise(function (resolve, reject) {
          var ch = rt.channel(channel, { config: { presence: { key: me }, broadcast: { self: false, ack: false } } });
          var mine = {}, states = {}, seen = {}, members = [], tracked = [], cbs = [], sendTimer = null, lastSend = 0, joined = false, dead = false, beat = null, prev = [];
          function recompute() {
            var now = Date.now(), set = {};
            tracked.forEach(function (k) { set[k] = 1; });
            Object.keys(seen).forEach(function (k) { if (now - seen[k] < 6000) set[k] = 1; });
            members = Object.keys(set).sort();
            Object.keys(states).forEach(function (k) { if (!set[k]) { delete states[k]; delete seen[k]; } });
          }
          function list() {
            var l = members.filter(function (k) { return k !== me; }).map(function (k) { return { peer: k, presence: states[k] || {}, isMe: false }; });
            l.push({ peer: me, presence: Object.assign({}, mine), isMe: true });
            return l;
          }
          var pend = false;
          function notify() {
            if (pend) return; pend = true;
            setTimeout(function () {
              pend = false;
              var l = list(), now = l.map(function (x) { return x.peer; });
              var left = prev.filter(function (k) { return now.indexOf(k) < 0; }); prev = now;
              cbs.forEach(function (f) { try { f(l, left); } catch (e) { console.error(e); } });
            }, 0);
          }
          function sendNow() {
            clearTimeout(sendTimer); sendTimer = null; if (dead || !joined) return;
            lastSend = Date.now();
            ch.send({ type: 'broadcast', event: 'st', payload: { from: me, p: mine } }).catch(function () { });
          }
          function sendSoon() { if (sendTimer) return; sendTimer = setTimeout(sendNow, Math.max(0, 60 - (Date.now() - lastSend))); }
          ch.on('presence', { event: 'sync' }, function () {
            var before = tracked.join(); tracked = Object.keys(ch.presenceState()).sort();
            if (tracked.join() !== before) sendSoon();
            recompute(); notify();
          });
          ch.on('broadcast', { event: 'st' }, function (m) {
            var pl = m && m.payload;
            if (!pl || typeof pl.from !== 'string' || pl.from === me || !pl.p || typeof pl.p !== 'object') return;
            states[pl.from] = pl.p; seen[pl.from] = Date.now(); recompute(); notify();
          });
          ch.on('broadcast', { event: 'hi' }, function () { sendSoon(); });
          var room = {
            kind: 'supabase',
            presence: function (patch) { for (var k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } notify(); sendSoon(); return Promise.resolve(); },
            onPeers: function (f) { cbs.push(f); setTimeout(function () { f(list(), []); }, 0); return function () { cbs = cbs.filter(function (x) { return x !== f; }); }; },
            join: function (name) { return mkRoom('bg-room-ac-' + env + '-' + name); },
            leave: function () {
              sendNow(); dead = true; clearTimeout(sendTimer); clearInterval(beat); cbs = [];
              return Promise.resolve().then(function () { return ch.untrack(); }).then(function () { return ch.unsubscribe(); }).then(function () { rt.removeChannel(ch); }).catch(function () { });
            },
            me: function () { return me; },
          };
          ch.subscribe(function (st) {
            if (st === 'SUBSCRIBED' && !dead) {
              ch.track({ at: Date.now() }).catch(function () { });
              ch.send({ type: 'broadcast', event: 'hi', payload: {} }).catch(function () { });
              if (!joined) {
                joined = true;
                beat = setInterval(function () { sendNow(); var b = members.join(); recompute(); if (members.join() !== b) notify(); }, 2000);
                resolve(room);
              }
              sendSoon();
            }
          });
          setTimeout(function () { if (!joined) { dead = true; try { rt.removeChannel(ch); } catch (e) { } reject({ code: 'upstream_error' }); } }, 12000);
        });
      }
      return mkRoom('bg-lobby-ac-' + env);
    });
  }
  AC.supabaseBackend = supabaseBackend;

  /* ------------------------------ Net ------------------------------ */
  var Net = { delay: 3, lobby: null, mode: 'none', status: '', online: 0, _unsub: null, _seeking: false, _cb: null, _match: null, ready: null };
  AC.Net = Net;

  Net.init = function () {
    if (Net.ready) return Net.ready;
    Net.ready = new Promise(function (resolve) {
      var fallback = function () {
        if (typeof BroadcastChannel !== 'undefined') { Net.lobby = new LocalBus('lobby'); Net.mode = 'tabs'; }
        else Net.mode = 'none';
        resolve(Net.mode);
      };
      var B = window.HW_BUILD;
      if (B && B.online && B.online.url && B.online.key) {
        supabaseBackend(B.online, B.env || 'live').then(function (lobby) { Net.lobby = lobby; Net.mode = 'site'; Net.delay = 4; resolve('site'); }, function () { Net.mode = 'offline'; resolve('offline'); });
        return;
      }
      if (window.claude && window.claude.use) {
        var t = setTimeout(fallback, 11000);
        window.claude.use('room').then(function (r) {
          clearTimeout(t);
          if (r) { Net.lobby = wrapRoom(r); Net.mode = 'room'; resolve('room'); } else fallback();
        }, function () { clearTimeout(t); fallback(); });
      } else fallback();
    });
    return Net.ready;
  };

  Net.watchLobby = function (cb) {
    if (!Net.lobby) return function () { };
    return Net.lobby.onPeers(function (peers) {
      Net.online = peers.length;
      Net.peers = peers;
      cb && cb(peers);
      if (Net._seeking) Net._tryPair(peers);
    });
  };

  // info: {name, rating, color, emblem, glow, loadout(string), maxAge}
  Net.seek = function (info, onMatch, code) {
    if (!Net.lobby) return;
    Net._seeking = true; Net._info = info; Net._onMatch = onMatch; Net._code = code || null;
    var p = { st: 'seek', name: String(info.name).slice(0, 20), rating: info.rating | 0, ts: Date.now() };
    if (code) p.code = code;
    Net.lobby.presence({ mm: p });
    if (!Net._unsub) Net._unsub = Net.watchLobby(null);
    else if (Net.peers) Net._tryPair(Net.peers);
  };
  Net.cancel = function () {
    Net._seeking = false;
    if (Net.lobby) Net.lobby.presence({ mm: null });
  };
  Net._tryPair = function (peers) {
    if (!Net._seeking) return;
    var me = peers.filter(function (p) { return p.isMe; })[0]; if (!me) return;
    var code = Net._code;
    // 1) Heeft iemand ons al uitgenodigd? Dan gaan we naar diens kamer (voorkomt dat
    //    de één al 'in match' staat terwijl de ander zijn zoek-status nooit zag).
    var inv = peers.filter(function (p) { var m = p.presence && p.presence.mm; return !p.isMe && m && m.st === 'match' && m.with === me.peer && typeof m.room === 'string' && /^[a-z0-9][a-z0-9_.-]{0,47}$/.test(m.room); })[0];
    if (inv) return Net._joinMatch(me.peer, inv.peer, inv.presence.mm.room, { name: String(inv.presence.mm.name || 'Tegenstander').slice(0, 20), rating: inv.presence.mm.rating | 0 });
    var seekers = peers.filter(function (p) {
      var m = p.presence && p.presence.mm;
      return m && m.st === 'seek' && (m.code || null) === code;
    }).sort(function (a, b) { return a.peer < b.peer ? -1 : 1; });
    // bij ranked matchmaking: paar opeenvolgende spelers (deterministisch voor beide)
    var idx = seekers.map(function (p) { return p.peer; }).indexOf(me.peer);
    if (idx < 0) return;
    var mateIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    var mate = seekers[mateIdx]; if (!mate) return;
    var a = me.peer < mate.peer ? me.peer : mate.peer, b = me.peer < mate.peer ? mate.peer : me.peer;
    var name = 'm-' + hashStr(a + '|' + b).toString(36) + (code ? '-' + code.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
    Net._joinMatch(me.peer, mate.peer, name, { name: mate.presence.mm.name, rating: mate.presence.mm.rating });
  };
  Net._joinMatch = function (myPeer, oppPeer, name, oppMeta) {
    Net._seeking = false;
    var info = Net._info;
    Net.lobby.presence({ mm: { st: 'match', room: name, with: oppPeer, name: String(info.name).slice(0, 20), rating: info.rating | 0, ts: Date.now() } });
    Net.lobby.join(name).then(function (room) {
      var m = new NetMatch(room, myPeer, oppPeer, info, oppMeta);
      Net._match = m;
      Net._onMatch && Net._onMatch(m);
    }, function () {
      Net._seeking = true; Net.lobby.presence({ mm: { st: 'seek', name: String(info.name).slice(0, 20), rating: info.rating | 0, ts: Date.now(), code: Net._code || undefined } });
    });
  };
  Net.idle = function () { if (Net.lobby) Net.lobby.presence({ mm: null }); };

  /* ------------------------------ NetMatch ------------------------------ */
  function NetMatch(room, myPeer, oppPeer, info, oppMeta) {
    this.room = room; this.myPeer = myPeer; this.oppPeer = oppPeer;
    this.side = myPeer < oppPeer ? 0 : 1;
    this.seed = hashStr([myPeer, oppPeer].sort().join('#')) || 7;
    this.info = info; this.oppMeta = oppMeta; this.opp = null;
    this.myTurns = {}; this.oppTurns = {}; this.oppUpTo = -1; this.exec = 0; this.acc = 0;
    this.started = false; this.ended = false; this.disconnected = false; this.desync = false;
    this.hashes = {}; this.oppHash = null; this.lastSeen = Date.now(); this.onReady = null; this.onDisconnect = null;
    this.waiting = 0; this.pingMs = 0; this.baseDelay = Net.delay || 3; this.delay = this.baseDelay; this.pubUpTo = -1;
    this.vote = 1; this.oppVote = 1; // snelheid: ieders stem
    var self = this;
    this.room.presence({ hello: { name: String(info.name).slice(0, 20), rating: info.rating | 0, color: info.color, emblem: info.emblem || '', glow: info.glow || '', lo: info.loadout, max: info.maxAge | 0, v: 1 } });
    this._unsub = this.room.onPeers(function (peers, left) {
      var opp = peers.filter(function (p) { return p.peer === self.oppPeer; })[0];
      if (!opp) return;
      self.lastSeen = Date.now();
      var pr = opp.presence || {};
      if (!self.opp && pr.hello) { self.opp = sanitizeHello(pr.hello); self._maybeReady(); }
      if (pr.lk) self._readTurns(pr.lk);
      self.oppAway = !!pr.aw;
      if (NetMatch.SPEEDS.indexOf(pr.sp) >= 0) self.oppVote = pr.sp;
      if (pr.left && self.started && !self.ended) { self.disconnected = true; self.onDisconnect && self.onDisconnect(); }
    });
  }
  AC.NetMatch = NetMatch;

  function sanitizeHello(h) {
    var col = /^#[0-9a-fA-F]{6}$/.test(h.color) ? h.color : '#ff4a4a';
    var lo = typeof h.lo === 'string' && /^[01]{32}$/.test(h.lo) ? h.lo : '11111111111011101110000000000000';
    var glow = /^#[0-9a-fA-F]{6}$/.test(h.glow) ? h.glow : null;
    var em = ['skull', 'sun', 'eagle', 'gear', 'eye', 'crown'].indexOf(h.emblem) >= 0 ? h.emblem : null;
    return { name: String(h.name || 'Tegenstander').slice(0, 20), rating: Math.max(0, Math.min(5000, h.rating | 0)), color: col, emblem: em, glow: glow, loadout: lo, maxAge: Math.max(0, Math.min(7, h.max | 0)) };
  }
  NetMatch.decodeLoadout = function (s) {
    var o = []; for (var a = 0; a < 8; a++) { var r = []; for (var k = 0; k < 4; k++) r.push(s[a * 4 + k] === '1'); o.push(r); } return o;
  };
  NetMatch.encodeLoadout = function (lo) { var s = ''; for (var a = 0; a < 8; a++) for (var k = 0; k < 4; k++) s += lo[a][k] ? '1' : '0'; return s; };

  NetMatch.prototype._maybeReady = function () { if (this.opp && this.onReady) { var f = this.onReady; this.onReady = null; f(this.opp); } };
  NetMatch.prototype.whenReady = function (fn) { this.onReady = fn; this._maybeReady(); };

  var VALID = { spawn: 1, tower: 1, sell: 1, upg: 1, evolve: 1, power: 1, surrender: 1 };
  var UPKEYS = AC.UPGRADES.map(function (u) { return u.key; });
  function sanitizeCmd(c) {
    if (!c || !VALID[c.t]) return null;
    var o = { t: c.t };
    if (c.s != null) o.s = Math.max(0, Math.min(3, c.s | 0));
    if (c.k != null) { if (c.t === 'upg') { if (UPKEYS.indexOf(c.k) < 0) return null; o.k = c.k; } else o.k = Math.max(0, Math.min(2, c.k | 0)); }
    return o;
  }

  NetMatch.prototype._readTurns = function (lk) {
    if (typeof lk.u === 'number') this.oppUpTo = Math.max(this.oppUpTo, lk.u | 0);
    var c = lk.c || {}, u = lk.u | 0;
    for (var k in c) {
      var t = k | 0; if (this.oppTurns[t] || t < this.exec || t > u) continue; // alleen definitieve beurten
      var arr = Array.isArray(c[k]) ? c[k].slice(0, 6).map(sanitizeCmd).filter(Boolean) : [];
      this.oppTurns[t] = arr;
    }
    if (lk.h && Array.isArray(lk.h)) this.oppHash = [lk.h[0] | 0, lk.h[1] >>> 0];
    this._checkHash();
  };
  NetMatch.prototype._checkHash = function () {
    if (!this.oppHash) return;
    var mine = this.hashes[this.oppHash[0]];
    if (mine != null && mine !== this.oppHash[1]) { this.desync = true; }
  };

  // Commando van de lokale speler → ingepland voor exec + DELAY
  NetMatch.prototype.command = function (c) {
    // nooit inplannen in een beurt die al als definitief is gepubliceerd
    var t = Math.max(this.exec + this.delay, this.pubUpTo + 1);
    (this.myTurns[t] = this.myTurns[t] || []);
    if (this.myTurns[t].length < 6) this.myTurns[t].push(c);
    this._publish();
  };
  NetMatch.prototype._publish = function () {
    var u = Math.max(this.pubUpTo, this.exec + this.delay - 1); this.pubUpTo = u;
    var c = {}, from = this.exec - 40, to = u;
    for (var t = from; t <= to; t++) if (this.myTurns[t] && this.myTurns[t].length) c[t] = this.myTurns[t];
    var lk = { u: u, c: c };
    var hk = Math.floor((this.exec - 1) / 50) * 50;
    if (this.hashes[hk] != null) lk.h = [hk, this.hashes[hk]];
    this.room.presence({ lk: lk });
  };

  // Laat de simulatie lopen in 30 ticks/s; iedere beurt (3 ticks) wordt pas
  // gestart als de commando's van de tegenstander voor die beurt binnen zijn.
  NetMatch.prototype.step = function (sim, dt) {
    if (this.disconnected || sim.over) return 0;
    var T = AC.CONST.TICK, ran = 0;
    this.delay = this.baseDelay * this.speed();
    this.acc += dt; this.sub = this.sub || 0;
    var maxRun = Math.min(120, Math.max(8, Math.ceil(dt / T) + 4));
    while (this.acc >= T && ran < maxRun) {
      if (this.sub === 0) {
        if (this.oppUpTo < this.exec) { this.waiting += dt; break; } // wacht op tegenstander
        var e = this.exec, mine = this.myTurns[e] || [], theirs = this.oppTurns[e] || [];
        var s0 = this.side === 0 ? mine : theirs, s1 = this.side === 0 ? theirs : mine;
        s0.forEach(function (c) { sim.command(0, c); });
        s1.forEach(function (c) { sim.command(1, c); });
        this.waiting = 0;
      }
      sim.tick(); this.sub++; this.acc -= T; ran++;
      if (this.sub >= TURN_TICKS) {
        this.sub = 0;
        var ex = this.exec;
        if (ex % 50 === 0) { this.hashes[ex] = sim.hash(); this._checkHash(); }
        delete this.oppTurns[ex - 80]; delete this.myTurns[ex - 80]; delete this.hashes[ex - 500];
        this.exec++;
        this._publish();
      }
    }
    if (this.acc > 4) this.acc = 4; // niet eindeloos inhalen
    // even geen contact: blijven wachten (de verbinding herstelt vaak vanzelf); pas na 45 s is het voorbij
    this.lostFor = this.waiting > 0 ? (Date.now() - this.lastSeen) / 1000 : 0;
    if (this.lostFor > this.grace() && this.started && !this.ended) { this.disconnected = true; this.onDisconnect && this.onDisconnect(); }
    return ran;
  };
  /* Snelheid: iedere speler stemt. De meerderheid bepaalt; is er geen meerderheid
     (met twee spelers: verschillende keuzes), dan speel je op 1×. De snelheid verandert
     alleen hoe snel beurten in echte tijd lopen; de simulatie zelf blijft identiek. */
  NetMatch.SPEEDS = [1, 2, 3, 5];
  NetMatch.majority = function (votes) {
    var cnt = {}; votes.forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; });
    for (var k in cnt) if (cnt[k] * 2 > votes.length) return +k;
    return 1;
  };
  NetMatch.prototype.speed = function () { return NetMatch.majority([this.vote, this.oppVote]); };
  NetMatch.prototype.setVote = function (v) { if (NetMatch.SPEEDS.indexOf(v) < 0) return; this.vote = v; this.room.presence({ sp: v }); };
  // wie het spel niet in beeld heeft (ander tabblad/app) krijgt 3 minuten in plaats van 45 s
  NetMatch.prototype.grace = function () { return this.oppAway ? NetMatch.GRACE * 4 : NetMatch.GRACE; };
  NetMatch.prototype.setAway = function (away) { if (this.away === away || this.ended) return; this.away = away; this.room.presence({ aw: away }); };
  NetMatch.prototype.start = function () { this.started = true; this.lastSeen = Date.now(); this._publish(); };
  NetMatch.prototype.leave = function () {
    this.ended = true;
    try { this.room.presence({ left: true }); } catch (e) { }
    var r = this.room, u = this._unsub;
    setTimeout(function () { try { u && u(); } catch (e) { } r.leave(); }, 600);
    Net.idle();
  };
  NetMatch.TURN_TICKS = TURN_TICKS; NetMatch.GRACE = 45;
})();
