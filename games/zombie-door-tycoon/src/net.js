// =====================================================================
//  ONLINE MULTIPLAYER — host-authoritative over Supabase Realtime
//  * One player hosts: their browser runs the real simulation (and the bots).
//  * Everyone else sends commands (place/upgrade/door/…) and their avatar
//    position; the host sends back snapshots ~5x per second plus the visual
//    events (shots, explosions, banners) that happened in between.
//  * Channels: bg-lobby-zdt-<env> (presence list of open rooms) and
//    bg-room-zdt-<env>-<CODE> (one per room). Presence is only used to see who
//    is there; all game data travels as broadcasts and is re-sent periodically,
//    so a missed message heals by itself.
// =====================================================================
(function () {
  var W = (typeof window !== 'undefined') ? window : {};
  var BUILD = G.BUILD = Object.assign({ env: 'live', version: 'dev', home: '' }, W.HW_BUILD || {});
  var T = G.T;
  var SNAP_EVERY = 0.2, TOWERS_EVERY = 1.0, START_EVERY = 3, ROSTER_EVERY = 1.5, POS_EVERY = 0.12;
  var MAX_PLAYERS = 8, PROTO = 3;

  function rid(n) { var s = '', a = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < n; i++) s += a[(Math.random() * a.length) | 0]; return s; }
  function code5() { var s = '', a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (var i = 0; i < 5; i++) s += a[(Math.random() * a.length) | 0]; return s; }
  function r1(v) { return Math.round(v * 10) / 10; }

  // ------------------------------------------------------------------
  //  Transport: Supabase Realtime (or any object with the same createClient API)
  // ------------------------------------------------------------------
  var Net = G.Net = { client: null, me: 'z' + rid(8) };
  Net.available = function () { return !!(BUILD.online && BUILD.online.url && BUILD.online.key); };
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Kon ' + src + ' niet laden')); };
      document.head.appendChild(s);
    });
  }
  Net.ensure = function () {
    if (Net.client) return Promise.resolve(Net.client);
    if (!Net.available()) return Promise.reject(new Error('offline'));
    var p = W.supabase ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
    return p.then(function () {
      Net.client = W.supabase.createClient(BUILD.online.url, BUILD.online.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 }, worker: true } }); // heartbeat in a worker: survives background tabs
      return Net.client;
    });
  };
  // channel wrapper: { send(ev, payload), on(ev, fn), members() -> {key: meta}, onMembers(fn), track(meta), close() }
  Net.open = function (name, meta) {
    return Net.ensure().then(function (rt) {
      return new Promise(function (resolve, reject) {
        var ch = rt.channel(name, { config: { presence: { key: Net.me }, broadcast: { self: false, ack: false } } });
        var handlers = {}, memberCbs = [], joined = false, dead = false, myMeta = meta || null;
        var wrap = {
          name: name,
          send: function (ev, payload) { if (dead || !joined) return; try { var r = ch.send({ type: 'broadcast', event: ev, payload: payload }); if (r && r.catch) r.catch(function () { }); } catch (e) { } },
          on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
          members: function () { var st = {}, ps = ch.presenceState ? ch.presenceState() : {}; Object.keys(ps).forEach(function (k) { st[k] = (ps[k] && ps[k][0]) || {}; }); return st; },
          onMembers: function (fn) { memberCbs.push(fn); },
          track: function (m) { myMeta = m; if (joined) { try { var r = ch.track(m); if (r && r.catch) r.catch(function () { }); } catch (e) { } } },
          close: function () { dead = true; try { ch.untrack(); ch.unsubscribe(); rt.removeChannel(ch); } catch (e) { } }
        };
        ['hello', 'roster', 'start', 'snap', 'cmd', 'pos', 'reply', 'end', 'bye', 'kick'].forEach(function (ev) {
          ch.on('broadcast', { event: ev }, function (msg) { var p = msg && msg.payload; if (!p) return; (handlers[ev] || []).forEach(function (f) { try { f(p); } catch (e) { console.error(e); } }); });
        });
        ch.on('presence', { event: 'sync' }, function () { var m = wrap.members(); memberCbs.forEach(function (f) { try { f(m); } catch (e) { console.error(e); } }); });
        ch.subscribe(function (st) {
          if (st === 'SUBSCRIBED' && !dead) {
            if (myMeta) { try { var r = ch.track(myMeta); if (r && r.catch) r.catch(function () { }); } catch (e) { } }
            if (!joined) { joined = true; resolve(wrap); }
          }
        });
        setTimeout(function () { if (!joined) { dead = true; try { rt.removeChannel(ch); } catch (e) { } reject(new Error('Geen verbinding met de server')); } }, 12000);
      });
    });
  };
  Net.roomChannel = function (code) { return 'bg-room-zdt-' + BUILD.env + '-' + code; };
  Net.lobbyChannel = function () { return 'bg-lobby-zdt-' + BUILD.env; };

  // ------------------------------------------------------------------
  //  Serialization of visual events (FX calls) so clients can replay them
  // ------------------------------------------------------------------
  function ser(v, depth) {
    if (v == null || typeof v !== 'object') return typeof v === 'number' ? r1(v) : v;
    if ((depth || 0) > 3) return null;
    if (Array.isArray(v)) return v.map(function (x) { return ser(x, (depth || 0) + 1); });
    if (v.def && v.towers) return { $r: v.index };
    if (v.stats && v.loadout) return { $p: v.id };
    if (v.abil && v.title) return { $b: v.id };
    if (v.item && v.px != null) return { $t: 1, px: r1(v.px), py: r1(v.py), i: v.item.index, a: r1(v.angle || 0), d: v.drone ? 1 : 0 };
    if (v.maxHp != null && v.x != null) return { $z: 1, x: r1(v.x), y: r1(v.y), s: v.size, c: v.color, b: v.isBoss ? 1 : 0, ty: v.type, n: v.name || '', ch: v.child ? 1 : 0, rw: v.reward, bid: v.boss ? v.boss.id : '' };
    var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = ser(v[k], (depth || 0) + 1); return o;
  }
  function deser(v, m) {
    if (v == null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(function (x) { return deser(x, m); });
    if (v.$r != null) return m.rooms[v.$r];
    if (v.$p != null) return m.players[v.$p];
    if (v.$b != null) return G.BOSSES[v.$b];
    if (v.$t) return { px: v.px, py: v.py, item: G.ITEMS[v.i], angle: v.a, drone: !!v.d, data: {} };
    if (v.$z) return { x: v.x, y: v.y, size: v.s, color: v.c, isBoss: !!v.b, type: v.ty, name: v.n, child: !!v.ch, reward: v.rw, boss: v.bid ? G.BOSSES[v.bid] : null, maxHp: 1, hp: 1 };
    var o = {}; for (var k in v) o[k] = deser(v[k], m); return o;
  }
  G.netSer = ser; G.netDeser = deser;
  var EV_CAP = { hit: 50, shot: 70, cash: 30, text: 25, flame: 20, kill: 60, heal: 10 };
  function recordingFx(real, outbox) {
    var counts = {};
    return new Proxy({}, { get: function (o, name) {
      return function () {
        var args = Array.prototype.slice.call(arguments);
        if (real[name]) real[name].apply(null, args);
        var cap = EV_CAP[name];
        if (cap) { counts[name] = (counts[name] || 0) + 1; if (counts[name] > cap) return; }
        outbox.push([name].concat(args.map(function (a) { return ser(a); })));
      };
    }, set: function () { return true; } });
  }

  // ------------------------------------------------------------------
  //  Snapshot encode (host) / apply (client)
  // ------------------------------------------------------------------
  var ZF = { fly: 1, invis: 2, revealed: 4, slowed: 8, burn: 16, poison: 32, stun: 64, mark: 128, immune: 256, elite: 512, moving: 1024, child: 2048, armor: 4096, swing: 8192, atk: 16384 };
  function mastOut(ms) { var o = {}; for (var k in ms) o[k] = [ms[k][0], Math.round(ms[k][1]), ms[k][2]]; return o; }
  G.encodeSnap = function (m, withTowers, events, speed) {
    var now = m.time, s = { v: PROTO, mid: m.mid, t: r1(now), ph: m.phase, w: m.wave, wt: r1(m.waveTimer), ct: r1(m.claimTimer), pt: r1(m.prepTimer), sp: speed || 1 };
    s.P = m.players.map(function (p) {
      var st = p.stats;
      return [p.room, Math.floor(p.cash), p.alive ? 1 : 0, p.finished ? 1 : 0, p.vote ? 1 : 0, Math.round(p.pos.x), Math.round(p.pos.y), p.face, p.moving ? 1 : 0,
        st.kills, st.bosses, Math.round(st.moneyEarned), Math.round(st.doorDamage), st.waveReached, Math.round(st.damage), p.isBot ? 1 : 0, p.incomeLast || 0,
        Math.round(st.killMoney), st.upgrades, st.evolves, mastOut(p.mast)];
    });
    s.R = m.rooms.map(function (r) {
      var d = r.door;
      return [r.owner, d.lvl, Math.round(d.hp), d.max, Math.round(d.shield), r1(d.shieldUntil), r1(d.repairUntil), r1(d.repairReady), r1(d.lastHit), r1(r.timeSlowUntil), r.timeSlowAmt, r1(r.blessUntil), r1(r.incomeT), r.queue.length, r.partner];
    });
    s.Z = [];
    m.rooms.forEach(function (r) {
      r.zombies.forEach(function (z) {
        if (z.dead) return;
        var f = (z.fly ? ZF.fly : 0) | (z.invis ? ZF.invis : 0) | (z.revealUntil > now ? ZF.revealed : 0) | ((z.slowUntil > now && !z.immuneSlow) || z.trapSlow ? ZF.slowed : 0) |
          (z.burn && z.burn.until > now ? ZF.burn : 0) | (z.poison.length ? ZF.poison : 0) | (z.stunUntil > now ? ZF.stun : 0) | (z.markUntil > now ? ZF.mark : 0) |
          (z.immuneUntil > now ? ZF.immune : 0) | (z.elite ? ZF.elite : 0) | (z.moving ? ZF.moving : 0) | (z.child ? ZF.child : 0) | (z.armor - z.shred > 0.5 ? ZF.armor : 0) | (z.swing ? ZF.swing : 0);
        s.Z.push([r.index, z.id, z.isBoss ? 'B:' + z.boss.id : z.type, Math.round(z.x), Math.round(z.y), Math.ceil(z.hp), Math.ceil(z.maxHp), f, Math.round(z.dir * 100), Math.round(z.size * 100), z.isBoss ? z.name : 0]);
      });
    });
    s.D = []; // dynamic tower state
    m.rooms.forEach(function (r) {
      r.towers.forEach(function (t) {
        if (t.item.isFarm && t.item.kind !== 'goldengod' && t.item.kind !== 'mine_farm' && t.item.kind !== 'jackpot' && !t.fire) return;
        var row = [r.index, t.id, Math.round(t.angle * 100), Math.round(t.fire * 100), t.stunUntil > now ? 1 : 0, t.data.mode || 0, t.data.souls || 0, t.data.armed ? 1 : 0, t.hp != null ? Math.round(t.hp) : -1];
        row.push(t.data.drones && t.data.drones.length ? t.data.drones.map(function (d) { return [Math.round(d.x), Math.round(d.y)]; }) : 0);
        var x = null, dd = t.data;
        if (dd.spin) (x = x || {}).s = Math.round(dd.spin * 100) / 100;
        if (dd.ammo != null) (x = x || {}).a = dd.ammo;
        if (dd.reloadUntil > now) (x = x || {}).r = 1;
        if (dd.charge != null) (x = x || {}).c = Math.round(dd.charge * 100) / 100;
        if (dd.stormUntil > now) (x = x || {}).st = 1;
        if (dd.kz && dd.kz.length) (x = x || {}).k = dd.kz.map(function (k) { return [Math.round(k.x), Math.round(k.y)]; });
        if (x) row.push(x);
        s.D.push(row);
      });
    });
    s.V = [];
    m.rooms.forEach(function (r) { r.vortices.forEach(function (v) { s.V.push([r.index, Math.round(v.x), Math.round(v.y), Math.round(v.r), r1(v.until), r1(v.start)]); }); });
    s.F = [];
    m.rooms.forEach(function (r) { (r.fields || []).forEach(function (f) { s.F.push([r.index, Math.round(f.x), Math.round(f.y), Math.round(f.r), r1(f.until), f.col || '#9dff5a']); }); });
    if (withTowers) {
      s.T = m.rooms.map(function (r) {
        return r.towers.map(function (t) {
          var L = t.lvl, b = t.buff;
          return [t.id, t.item.index, t.x, t.y, [L.dmg, L.spd, L.rng, L.spc, L.inc], t.target, t.hp != null ? Math.round(t.hp) : -1, t.maxHp || 0, r1(t.downUntil || 0), r1(t.placedAt),
            t.kills, Math.round(t.dmgDealt), Math.round(t.earned), t.spent, t.starter ? 1 : 0, [r1(b.dmg), r1(b.spd), r1(b.rng), b.detect ? 1 : 0, r1(b.farm || 1)],
            t.evo || 0, (t.auto ? 1 : 0) | (t.prio ? 2 : 0), t.by != null ? t.by : -1, t.ul || 0];
        });
      });
    }
    if (events && events.length) s.ev = events;
    return s;
  };

  G.applySnap = function (m, s, meId) {
    var now = s.t;
    m.phase = s.ph; m.wave = s.w; m.waveTimer = s.wt; m.claimTimer = s.ct; m.prepTimer = s.pt; m.time = now; m.netSpeed = s.sp || 1;
    s.P.forEach(function (a, i) {
      var p = m.players[i]; if (!p) return;
      p.room = a[0]; p.cash = a[1]; p.alive = !!a[2]; p.finished = !!a[3]; p.vote = !!a[4];
      if (i !== meId) { p.tx = a[5]; p.ty = a[6]; p.face = a[7]; p.moving = !!a[8]; if (p.pos.x == null || Math.hypot(p.pos.x - a[5], p.pos.y - a[6]) > 6 * T) { p.pos.x = a[5]; p.pos.y = a[6]; } }
      else if (Math.hypot(p.pos.x - a[5], p.pos.y - a[6]) > 8 * T && !m.netPosSent) { p.pos.x = a[5]; p.pos.y = a[6]; }
      var st = p.stats; st.kills = a[9]; st.bosses = a[10]; st.moneyEarned = a[11]; st.doorDamage = a[12]; st.waveReached = a[13]; st.damage = a[14];
      p.isBot = !!a[15]; p.incomeLast = a[16];
      if (a.length > 17) { st.killMoney = a[17]; st.upgrades = a[18]; st.evolves = a[19]; p.mast = a[20] || {}; }
    });
    s.R.forEach(function (a, i) {
      var r = m.rooms[i], d = r.door;
      r.owner = a[0]; d.lvl = a[1]; d.hp = a[2]; d.max = a[3]; d.shield = a[4]; d.shieldUntil = a[5]; d.repairUntil = a[6]; d.repairReady = a[7];
      if (a[8] > d.lastHit) d.lastHit = a[8];
      r.timeSlowUntil = a[9]; r.timeSlowAmt = a[10]; r.blessUntil = a[11]; r.incomeT = a[12];
      if (r.queue.length !== a[13]) r.queue = new Array(a[13]);
      if (a[14] != null) r.partner = a[14];
      r.time = now;
    });
    if (s.T) s.T.forEach(function (list, ri) {
      var r = m.rooms[ri], old = {}; r.towers.forEach(function (t) { old[t.id] = t; });
      r.towers = []; r.tile = {}; r.walls = [];
      list.forEach(function (a) {
        var t = old[a[0]], it = G.ITEMS[a[1]];
        if (!t || t.item !== it) t = { id: a[0], item: it, x: a[2], y: a[3], px: a[2] * T + T / 2, py: a[3] * T + T / 2, angle: -Math.PI / 2, fire: 0, stunUntil: 0, data: { drones: [] }, cd: 0 };
        t.lvl = { dmg: a[4][0], spd: a[4][1], rng: a[4][2], spc: a[4][3], inc: a[4][4] };
        t.target = a[5]; if (a[6] >= 0) t.hp = a[6]; t.maxHp = a[7]; t.downUntil = a[8]; t.placedAt = a[9];
        t.kills = a[10]; t.dmgDealt = a[11]; t.earned = a[12]; t.spent = a[13]; t.starter = !!a[14];
        t.buff = { dmg: a[15][0], spd: a[15][1], rng: a[15][2], detect: !!a[15][3], farm: a[15][4] };
        t.evo = a[16] || 0; t.ul = a[19] || 0; t.auto = !!(a[17] & 1); t.prio = !!(a[17] & 2); t.by = a[18] >= 0 ? a[18] : r.owner; t.roomIdx = ri;
        var bp = m.players[t.by]; t.cos = (bp && bp.cos && bp.cos[it.id]) || null;
        r.towers.push(t); r.tile[t.x + ',' + t.y] = t; if (it.kind === 'wall') r.walls.push(t);
      });
    });
    var byId = {}; m.rooms.forEach(function (r) { r.towers.forEach(function (t) { byId[r.index + ':' + t.id] = t; }); });
    (s.D || []).forEach(function (a) {
      var t = byId[a[0] + ':' + a[1]]; if (!t) return;
      t.angle = a[2] / 100; t.fire = a[3] / 100; t.stunUntil = a[4] ? now + 0.3 : 0; t.data.mode = a[5]; t.data.souls = a[6]; t.data.armed = !!a[7];
      if (a[8] >= 0) t.hp = a[8];
      if (a[9]) { var ds = t.data.drones || (t.data.drones = []); a[9].forEach(function (p, k) { if (!ds[k]) ds[k] = { x: p[0], y: p[1] }; ds[k].tx = p[0]; ds[k].ty = p[1]; }); ds.length = a[9].length; }
      var x = a[10] || {}, dd = t.data;
      dd.spin = x.s || 0; dd.ammo = x.a; dd.reloadUntil = x.r ? now + 0.3 : 0; dd.charge = x.c; dd.stormUntil = x.st ? now + 0.3 : 0;
      if (x.k) { var kz = dd.kz || (dd.kz = []); x.k.forEach(function (p, k) { if (!kz[k]) kz[k] = { x: p[0], y: p[1] }; kz[k].x += (p[0] - kz[k].x) * 0.6; kz[k].y += (p[1] - kz[k].y) * 0.6; }); kz.length = x.k.length; } else dd.kz = null;
    });
    // zombies: reuse objects so they can glide between snapshots
    var oldZ = {}; m.rooms.forEach(function (r) { r.zombies.forEach(function (z) { oldZ[r.index + ':' + z.id] = z; }); r.zombies = []; });
    s.Z.forEach(function (a) {
      var r = m.rooms[a[0]], key = a[0] + ':' + a[1], z = oldZ[key], f = a[7];
      if (!z) {
        var isB = typeof a[2] === 'string' && a[2].indexOf('B:') === 0, bd = isB ? G.BOSSES[a[2].slice(2)] : null, zd = isB ? null : G.ZOMBIES[a[2]];
        z = { id: a[1], type: isB ? 'boss' : a[2], def: zd, boss: bd, isBoss: isB, name: a[10] || (bd ? bd.name : zd ? zd.name : ''), x: a[3], y: a[4], walk: Math.random() * 6,
          color: isB ? bd.color : zd ? zd.color : '#6fbf4a', poison: [], burn: null, flash: 0, armor: 0, shred: 0, trapSlow: 0, slowAmt: 0.4 };
      }
      if (z.hp != null && a[5] < z.hp) z.flash = 0.08;
      z.tx = a[3]; z.ty = a[4]; z.hp = a[5]; z.maxHp = a[6]; z.dir = a[8] / 100; z.size = a[9] / 100;
      if (a[2] === 'golden' || z.type !== a[2] && !z.isBoss) { z.type = a[2]; z.def = G.ZOMBIES[a[2]] || z.def; z.color = z.def ? z.def.color : z.color; }
      z.fly = !!(f & ZF.fly); z.invis = !!(f & ZF.invis); z.revealUntil = f & ZF.revealed ? now + 0.4 : 0; z.slowUntil = f & ZF.slowed ? now + 0.4 : 0; z.immuneSlow = false;
      z.burn = f & ZF.burn ? { until: now + 0.4, dps: 1 } : null; z.poison = f & ZF.poison ? [1] : []; z.stunUntil = f & ZF.stun ? now + 0.4 : 0;
      z.markUntil = f & ZF.mark ? now + 0.4 : 0; z.immuneUntil = f & ZF.immune ? now + 0.4 : 0; z.elite = !!(f & ZF.elite); z.moving = !!(f & ZF.moving);
      z.child = !!(f & ZF.child); z.armor = f & ZF.armor ? 1 : 0; z.swing = f & ZF.swing ? 0.2 : 0;
      r.zombies.push(z);
    });
    m.rooms.forEach(function (r) { r.vortices = []; });
    (s.V || []).forEach(function (a) { m.rooms[a[0]].vortices.push({ room: a[0], x: a[1], y: a[2], r: a[3], until: a[4], start: a[5] }); });
    if (s.F) { m.rooms.forEach(function (r) { r.fields = []; }); s.F.forEach(function (a) { m.rooms[a[0]].fields.push({ x: a[1], y: a[2], r: a[3], until: a[4], col: a[5] }); }); }
    if (s.ev) s.ev.forEach(function (e) {
      var fn = m.fx && m.fx[e[0]]; if (typeof fn !== 'function') return;
      try { fn.apply(null, e.slice(1).map(function (a) { return deser(a, m); })); } catch (err) { /* cosmetic only */ }
    });
  };
  // client-side smoothing between snapshots
  G.netInterpolate = function (m, dt, meId) {
    var k = Math.min(1, dt * 10);
    m.time += dt * (m.netSpeed || 1);
    m.rooms.forEach(function (r) {
      r.time = m.time;
      r.zombies.forEach(function (z) {
        if (z.tx == null) return;
        z.x += (z.tx - z.x) * k; z.y += (z.ty - z.y) * k;
        if (z.moving) z.walk += dt * 6; z.flash = Math.max(0, (z.flash || 0) - dt);
      });
      r.towers.forEach(function (t) {
        t.fire = Math.max(0, (t.fire || 0) - dt);
        if (t.data && t.data.drones) t.data.drones.forEach(function (d) { if (d.tx != null) { d.x += (d.tx - d.x) * k; d.y += (d.ty - d.y) * k; } });
      });
    });
    m.players.forEach(function (p, i) {
      if (i === meId || p.tx == null) return;
      p.pos.x += (p.tx - p.pos.x) * k; p.pos.y += (p.ty - p.pos.y) * k;
      if (p.moving) p.walk += dt * 11;
    });
  };

  // ------------------------------------------------------------------
  //  Session: lobby + match, host or client
  // ------------------------------------------------------------------
  var MP = G.MP = { pending: [], acks: {}, role: null, code: null, ch: null, lobby: null, roster: [], settings: { map: 'city', diff: 'easy' }, hooks: {}, match: null };
  function hook(n, a, b) { if (MP.hooks[n]) try { MP.hooks[n](a, b); } catch (e) { console.error(e); } }
  MP.myInfo = function () { return MP.hooks.myInfo ? MP.hooks.myInfo() : { name: 'Speler', loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'], stars: {} }; };

  // public room list (presence in the lobby channel)
  MP.watchLobby = function (cb) {
    return Net.open(Net.lobbyChannel(), null).then(function (ch) {
      MP.lobby = ch;
      var emit = function (mem) {
        var list = Object.keys(mem).map(function (k) { return mem[k]; }).filter(function (x) { return x && x.code && x.open && x.n < MAX_PLAYERS && x.v === PROTO; });
        cb(list);
      };
      ch.onMembers(emit); emit(ch.members());
      return ch;
    });
  };
  MP.unwatchLobby = function () { if (MP.lobby && MP.role !== 'host') { MP.lobby.close(); MP.lobby = null; } };
  function advertise() {
    if (MP.role !== 'host' || !MP.lobby) return;
    MP.lobby.track({ v: PROTO, code: MP.code, host: MP.myInfo().name, n: MP.roster.length, map: MP.settings.map, diff: MP.settings.diff, duo: !!MP.settings.duo, open: !MP.match, at: Date.now() });
  }

  // ---------- HOST ----------
  MP.host = function () {
    MP.leave();
    MP.role = 'host'; MP.code = code5(); MP.match = null;
    var me = MP.myInfo();
    MP.roster = [{ cid: Net.me, name: me.name, loadout: me.loadout, stars: me.stars, cos: sanitizeCos(me.cos), hat: sanitizeHat(me.hat), host: true }];
    return Net.open(Net.roomChannel(MP.code), { name: me.name, cid: Net.me }).then(function (ch) {
      MP.ch = ch;
      ch.on('hello', function (p) {
        if (!p.cid || p.v !== PROTO) return;
        if (MP.match) {
          var pid = MP.pidOf(p.cid);
          if (pid >= 0) sendStart(); else ch.send('reply', { cid: p.cid, msg: 'Dit potje is al begonnen.', kick: 1 });
          return;
        }
        var ex = MP.roster.filter(function (r) { return r.cid === p.cid; })[0];
        if (!ex) {
          if (MP.roster.length >= MAX_PLAYERS) { ch.send('reply', { cid: p.cid, msg: 'Deze kamer is vol (8 spelers).', kick: 1 }); return; }
          MP.roster.push({ cid: p.cid, name: String(p.name || 'Speler').slice(0, 16), loadout: sanitizeLoadout(p.loadout), stars: p.stars || {}, cos: sanitizeCos(p.cos), hat: sanitizeHat(p.hat) });
          hook('toast', '👋 ' + String(p.name || 'Speler').slice(0, 16) + ' doet mee');
        } else { ex.name = String(p.name || ex.name).slice(0, 16); ex.loadout = sanitizeLoadout(p.loadout); ex.stars = p.stars || {}; ex.cos = sanitizeCos(p.cos); ex.hat = sanitizeHat(p.hat); ex.seen = Date.now(); }
        sendRoster(); hook('roster', MP.roster);
      });
      ch.on('bye', function (p) { dropPlayer(p.cid); });
      ch.on('cmd', function (p) {
        var m = MP.match; if (!m) return;
        var pid = MP.pidOf(p.cid); if (pid < 0 || !p.c || typeof p.c.type !== 'string') return;
        var done = MP.acks[p.cid] || (MP.acks[p.cid] = []);
        if (p.s != null) { if (done.indexOf(p.s) >= 0) return; done.push(p.s); if (done.length > 30) done.shift(); }
        var r = m.command(pid, p.c);
        if (r && !r.ok && r.msg) ch.send('reply', { cid: p.cid, msg: r.msg });
        MP.towersDirty = true;
      });
      ch.on('pos', function (p) {
        var m = MP.match; if (!m) return;
        var pid = MP.pidOf(p.cid); if (pid < 0) return;
        var pl = m.players[pid]; if (!pl.remote) return;
        if (typeof p.x === 'number' && typeof p.y === 'number' && G.canStand(p.x, p.y)) { pl.pos.x = p.x; pl.pos.y = p.y; }
        pl.face = p.f === -1 ? -1 : 1; pl.moving = !!p.m; pl.seen = MP.clock || 0;
      });
      ch.onMembers(function (mem) { MP.members = mem; });
      return MP.lobbyReady().then(function () { advertise(); hook('roster', MP.roster); return MP.code; });
    });
  };
  MP.lobbyReady = function () { return MP.lobby ? Promise.resolve(MP.lobby) : Net.open(Net.lobbyChannel(), null).then(function (ch) { MP.lobby = ch; return ch; }); };
  var SKINS = ['camo', 'neon', 'gold', 'prism'], KILLS = ['sparks', 'souls', 'prism'];
  function sanitizeCos(c) {
    var out = {}; if (!c || typeof c !== 'object') return out;
    Object.keys(c).slice(0, 5).forEach(function (id) { var v = c[id]; if (!G.ITEM[id] || !v) return; out[id] = { skin: SKINS.indexOf(v.skin) >= 0 ? v.skin : null, kill: KILLS.indexOf(v.kill) >= 0 ? v.kill : null, anim: !!v.anim }; });
    return out;
  }
  function sanitizeHat(h) { return G.HATS && G.HATS.some(function (x) { return x.id === h; }) ? h : null; }
  function sanitizeLoadout(lo) {
    var out = (Array.isArray(lo) ? lo : []).filter(function (id, i, a) { return G.ITEM[id] && a.indexOf(id) === i; }).slice(0, 5);
    ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'].forEach(function (id) { if (out.length < 5 && out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  function sendRoster() { if (MP.ch) MP.ch.send('roster', { v: PROTO, code: MP.code, players: MP.roster.map(function (r) { return { cid: r.cid, name: r.name, host: !!r.host }; }), map: MP.settings.map, diff: MP.settings.diff, duo: !!MP.settings.duo }); advertise(); }
  MP.setSettings = function (map, diff, duo) { MP.settings = { map: map, diff: diff, duo: duo == null ? !!MP.settings.duo : !!duo }; sendRoster(); };
  MP.kick = function (cid) { MP.roster = MP.roster.filter(function (r) { return r.cid !== cid || r.host; }); if (MP.ch) MP.ch.send('reply', { cid: cid, msg: 'De host heeft je uit de kamer gehaald.', kick: 1 }); sendRoster(); hook('roster', MP.roster); };
  MP.pidOf = function (cid) { var m = MP.match; if (!m) return -1; for (var i = 0; i < m.players.length; i++) if (m.players[i].cid === cid && !m.players[i].left) return i; return -1; };
  function dropPlayer(cid) {
    if (!MP.match) { MP.roster = MP.roster.filter(function (r) { return r.cid !== cid || r.host; }); sendRoster(); hook('roster', MP.roster); return; }
    var pid = MP.pidOf(cid); if (pid < 0) return;
    var p = MP.match.players[pid];
    p.left = true; p.remote = false; p.isBot = true; p.style = 'balanced';
    MP.match.bots.push(new G.Bot(MP.match, pid));
    hook('toast', '🤖 ' + p.name + ' heeft het spel verlaten — een bot neemt het over');
  }
  // host: build the match (humans first, bots fill the remaining seats)
  MP.startMatch = function (botFactory) {
    var seed = (Math.random() * 1e9) | 0, players = [];
    MP.roster.slice(0, MAX_PLAYERS).forEach(function (r) { players.push({ name: r.name, isBot: false, loadout: r.loadout, stars: r.stars, cid: r.cid, cos: r.cos || {}, hat: r.hat || null }); });
    var bots = botFactory(MP.settings.diff, MAX_PLAYERS - players.length);
    players = players.concat(bots);
    MP.startInfo = { v: PROTO, mid: rid(6), seed: seed, map: MP.settings.map, diff: MP.settings.diff, duo: !!MP.settings.duo, players: players };
    var m = MP.buildMatch(MP.startInfo, true);
    MP.match = m; MP.outbox = []; MP.acks = {}; MP.t = { snap: 0, towers: 0, start: 0, check: 0 };
    sendStart(); advertise();
    return m;
  };
  function sendStart() { if (MP.ch && MP.startInfo) MP.ch.send('start', MP.startInfo); }
  MP.buildMatch = function (info, asHost) {
    var outbox = [];
    var real = G.FX ? G.FX.api : {};
    var m = new G.Match({ mapId: info.map, diffId: info.diff, seed: info.seed, duo: !!info.duo, players: info.players.map(function (p) { return { name: p.name, isBot: p.isBot, style: p.style, loadout: p.loadout, stars: p.stars, cos: p.cos, hat: p.hat, duoWith: p.duoWith }; }), fx: asHost ? recordingFx(real, outbox) : real });
    m.mid = info.mid; m.online = true;
    info.players.forEach(function (p, i) { m.players[i].cid = p.cid || null; m.players[i].remote = asHost && !p.isBot && p.cid !== Net.me; m.players[i].isBot = !!p.isBot; m.players[i].style = p.style || null; });
    m.bots = asHost ? m.players.filter(function (p) { return p.isBot; }).map(function (p) { return new G.Bot(m, p.id); }) : [];
    if (asHost) MP.outbox = outbox, m._outbox = outbox;
    return m;
  };
  // host: called every frame (real time)
  MP.hostTick = function (dt, speed) {
    var m = MP.match; if (!m || !MP.ch) return;
    MP.clock = (MP.clock || 0) + dt;
    var t = MP.t; t.snap += dt; t.towers += dt; t.start += dt; t.check += dt;
    if (t.snap >= SNAP_EVERY) {
      var withT = t.towers >= TOWERS_EVERY || MP.towersDirty;
      if (withT) { t.towers = 0; MP.towersDirty = false; }
      var ev = m._outbox.splice(0, m._outbox.length);
      var snap = G.encodeSnap(m, withT, ev, speed); snap.A = MP.acks;
      MP.ch.send('snap', snap);
      t.snap = 0;
    }
    if (t.start >= START_EVERY) { t.start = 0; sendStart(); }
    if (t.check >= 2) {
      t.check = 0;
      var mem = MP.ch.members(), now = MP.clock;
      m.players.forEach(function (p) {
        if (!p.remote || p.left) return;
        var present = Object.keys(mem).some(function (k) { return mem[k] && mem[k].cid === p.cid; });
        if (present || (p.seen && now - p.seen < 6)) p.missing = 0; else p.missing = (p.missing || 0) + 2;
        if (p.missing >= 14) dropPlayer(p.cid);
      });
    }
  };
  MP.hostLobbyTick = function (dt) {
    if (MP.role !== 'host' || MP.match || !MP.ch) return;
    MP._rt = (MP._rt || 0) + dt;
    if (MP._rt >= ROSTER_EVERY) { MP._rt = 0; sendRoster(); }
  };

  // ---------- CLIENT ----------
  MP.join = function (code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (code.length !== 5) return Promise.reject(new Error('Een kamercode heeft 5 tekens.'));
    MP.leave();
    MP.role = 'client'; MP.code = code; MP.match = null; MP.roster = []; MP.lastSnap = 0; MP.joinedAt = Date.now(); MP.pending = []; MP.seq = 0;
    var me = MP.myInfo();
    return Net.open(Net.roomChannel(code), { name: me.name, cid: Net.me }).then(function (ch) {
      MP.ch = ch;
      var hello = function () { var i = MP.myInfo(); ch.send('hello', { v: PROTO, cid: Net.me, name: i.name, loadout: i.loadout, stars: i.stars, cos: i.cos, hat: i.hat }); };
      hello(); MP._hello = setInterval(function () { if (!MP.match || Date.now() - MP.lastSnap > 4000) hello(); }, 2000);
      ch.on('roster', function (p) { if (MP.match) return; MP.roster = p.players || []; MP.settings = { map: p.map, diff: p.diff, duo: !!p.duo }; MP.gotRoster = Date.now(); hook('roster', MP.roster); });
      ch.on('reply', function (p) { if (p.cid !== Net.me) return; hook('toast', p.msg); if (p.kick) { MP.leave(); hook('kicked', p.msg); } });
      ch.on('start', function (info) {
        if (info.v !== PROTO) return;
        if (MP.match && MP.match.mid === info.mid) return;
        var idx = -1; info.players.forEach(function (p, i) { if (p.cid === Net.me) idx = i; });
        if (idx < 0) return;
        MP.match = MP.buildMatch(info, false); MP.myPid = idx; MP.lastSnap = Date.now();
        hook('start', MP.match, idx);
      });
      ch.on('snap', function (s) {
        if (!MP.match || s.mid !== MP.match.mid) return;
        MP.lastSnap = Date.now();
        var mine = s.A && s.A[Net.me];
        if (mine) MP.pending = MP.pending.filter(function (q) { return mine.indexOf(q.s) < 0; });
        G.applySnap(MP.match, s, MP.myPid);
      });
      ch.on('end', function (p) { if (MP.match) hook('hostEnded', p && p.msg); });
      return code;
    });
  };
  // client: send a command; movement is handled locally (own avatar is predicted)
  MP.clientSend = function (cmd) {
    var m = MP.match, me = m.players[MP.myPid];
    if (cmd.type === 'move' || cmd.type === 'goto' || cmd.type === 'keys') return m.command(MP.myPid, cmd);
    var room = m.roomOf(me), err = null, t;
    if (cmd.type === 'place') err = m.canPlace(me, cmd.item, cmd.x, cmd.y);
    else if (cmd.type === 'upgrade') {
      t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
      if (!t) err = 'Geen tower'; else if (!m.canBuild(me)) err = 'Loop naar je kamer om te upgraden'; else if (!m.nextLevel(t)) err = 'Max level'; else if (me.cash < m.upgradeCost(t)) err = 'Niet genoeg geld';
    } else if ((cmd.type === 'sell' || cmd.type === 'door' || cmd.type === 'repair') && !m.canBuild(me)) err = 'Loop naar je kamer';
    else if (cmd.type === 'door' && me.cash < G.doorUpgradeCost(room.door.lvl)) err = 'Niet genoeg geld';
    else if (cmd.type === 'vote' && !m.canVote(me)) err = 'Skippen kan pas als jouw wave volledig gespawned is.';
    else if ((cmd.type === 'upgradeTower' || cmd.type === 'upgradeAll' || cmd.type === 'evolve') && !m.canBuild(me)) err = 'Loop naar je kamer om te upgraden';
    else if (cmd.type === 'upgradeTower') {
      t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
      if (!t) err = 'Geen tower'; else if (!m.nextLevel(t)) err = 'Deze tower is al max level'; else if (me.cash < m.upgradeCost(t)) err = 'Niet genoeg geld ($' + m.upgradeCost(t) + ')';
    } else if (cmd.type === 'evolve') {
      t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
      var nx = t && t.item.evo && t.item.evo[t.evo || 0];
      if (!nx) err = 'Kan niet (verder) evolueren'; else if (m.towerLevel(t) < nx.lvl) err = 'Eerst level ' + nx.lvl + ' nodig'; else if (me.cash < nx.cost) err = 'Niet genoeg geld ($' + nx.cost + ')';
    } else if (cmd.type === 'auto' || cmd.type === 'prio') {   // optimistic toggle
      t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0]; if (t) t[cmd.type] = !!cmd.on;
    }
    if (err) return { ok: false, msg: err };
    MP.seq = (MP.seq || 0) + 1;
    var q = { s: MP.seq, c: cmd, age: 0 }; MP.pending.push(q);
    MP.ch.send('cmd', { cid: Net.me, s: q.s, c: cmd });
    if (cmd.type === 'vote') me.vote = !me.vote;
    return { ok: true, pending: true };
  };
  MP.clientTick = function (dt) {
    var m = MP.match; if (!m) return;
    var me = m.players[MP.myPid];
    G.netInterpolate(m, dt, MP.myPid);
    m.moveAvatar(me, dt);
    MP.pending.forEach(function (q) { q.age += dt; if (q.age > 0.7) { q.age = 0; q.tries = (q.tries || 0) + 1; if (q.tries < 8) MP.ch.send('cmd', { cid: Net.me, s: q.s, c: q.c }); } });
    MP.pending = MP.pending.filter(function (q) { return (q.tries || 0) < 8; });
    MP._pt = (MP._pt || 0) + dt;
    var moved = !MP._last || Math.abs(MP._last.x - me.pos.x) + Math.abs(MP._last.y - me.pos.y) > 1;
    if (MP._pt >= (moved ? POS_EVERY : 1)) {
      MP._pt = 0; MP._last = { x: me.pos.x, y: me.pos.y }; m.netPosSent = true;
      MP.ch.send('pos', { cid: Net.me, x: Math.round(me.pos.x), y: Math.round(me.pos.y), f: me.face, m: me.moving ? 1 : 0 });
    }
    if (MP.lastSnap && Date.now() - MP.lastSnap > 12000 && !MP.lostWarned) { MP.lostWarned = true; hook('hostLost'); }
    if (MP.lastSnap && Date.now() - MP.lastSnap < 2000) MP.lostWarned = false;
  };

  MP.leave = function (msg) {
    clearInterval(MP._hello);
    if (MP.ch) {
      if (MP.role === 'host') MP.ch.send('end', { msg: msg || 'De host heeft het potje beëindigd.' });
      else MP.ch.send('bye', { cid: Net.me });
      var ch = MP.ch; setTimeout(function () { ch.close(); }, 300);
    }
    if (MP.lobby && MP.role === 'host') { try { MP.lobby.track({ v: PROTO, code: MP.code, open: false, n: 99 }); } catch (e) { } }
    MP.ch = null; MP.role = null; MP.code = null; MP.match = null; MP.roster = []; MP.startInfo = null; MP.lostWarned = false; MP.lastSnap = 0; MP._last = null;
  };
})();
