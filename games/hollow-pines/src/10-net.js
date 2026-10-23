/* Hollow Pines — online play via Supabase Realtime.
   - The player who makes the room is The Hollow and runs the match (host). Friends join with a 4-letter code
     and play survivors; empty survivor slots are filled with AI bots.
   - Main channel  bg-room-hp-<env>-<CODE>          : lobby (hi, lobby, full, start, bye) and host → everyone (h, w, end)
   - Uplink        bg-room-hp-<env>-<CODE>-u-<id>    : one guest → host only (in, act), so guest traffic is not fanned out
   - Guests move their own survivor locally (no input lag) and report their position; the host runs everything
     else (doors, searching, repairs, the creature, bots, perception, damage) and sends state plus events.
   - Supabase counts every delivered message (Free plan: 100 per second for the whole project), so the update
     rate drops as the room fills: about 12×/s with one guest, about 5×/s with five, keeping a match under ~80/s.
     Guests standing still only send a heartbeat twice a second.
   - When the host moves a guest (hiding, grabbed, knocked down) it bumps that survivor's epoch; the guest snaps
     to the host's position and the host ignores reports carrying an older epoch. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { clamp, lerp } = HG.util;
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const MAIN_EVENTS = ['hi', 'lobby', 'full', 'start', 'h', 'w', 'end', 'bye'];
  const UP_EVENTS = ['in', 'act', 'bye'];
  const MAX_GUESTS = 5;
  const r2 = n => Math.round(n * 100) / 100, r1 = n => Math.round(n * 10) / 10, r3 = n => Math.round(n * 1000) / 1000;
  const FWD = new Set(['sound', 'say', 'footprint', 'hit', 'caught', 'grabbed', 'grabBreak', 'taskDone', 'powerFail', 'gateOpening', 'gateOpen', 'escaped', 'scream', 'darkness', 'lightning', 'reveal', 'toast', 'batteryDead', 'reload', 'patched', 'attackMiss', 'flicker', 'quiet', 'treeCleared', 'phase', 'generator']);

  // ---------------- transports ----------------
  // Supabase Realtime (the Bas Games site provides the URL and publishable key in HW_BUILD.online)
  function SupaTransport(cfg) { this.cfg = cfg; this.rt = null; }
  SupaTransport.prototype.client = async function () {
    if (this.rt) return this.rt;
    if (!G.supabase) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIB; s.onload = res; s.onerror = () => rej(new Error('Could not load the online library.')); document.head.appendChild(s); });
    this.rt = G.supabase.createClient(this.cfg.url, this.cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return this.rt;
  };
  // open(name, events, onMsg, onStatus) → { send(ev, payload), close() }
  SupaTransport.prototype.open = async function (name, events, onMsg, onStatus) {
    const rt = await this.client();
    const ch = rt.channel(name, { config: { broadcast: { self: false, ack: false } } });
    for (const ev of events) ch.on('broadcast', { event: ev }, ({ payload }) => onMsg(ev, payload || {}));
    ch.subscribe(st => onStatus(st === 'SUBSCRIBED' ? 'ok' : (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' ? 'error' : 'other')));
    return { send: (ev, payload) => ch.send({ type: 'broadcast', event: ev, payload }), close: async () => { try { await ch.unsubscribe(); rt.removeChannel(ch); } catch (e) { /* already closed */ } } };
  };
  // in-process hub for tests: same fan-out rules as Realtime broadcast (not echoed to the sender)
  function FakeHub() { this.chans = new Map(); this.sent = 0; this.delivered = 0; this.bytes = 0; this.queue = []; this.delay = 0; }
  FakeHub.prototype.transport = function () {
    const hub = this;
    return {
      open: async (name, events, onMsg, onStatus) => {
        const sub = { onMsg, events: new Set(events) };
        if (!hub.chans.has(name)) hub.chans.set(name, new Set());
        hub.chans.get(name).add(sub);
        setTimeout(() => onStatus('ok'), 0);
        return {
          send: (ev, payload) => {
            const json = JSON.stringify(payload); hub.sent++; hub.bytes += json.length;
            for (const o of hub.chans.get(name) || []) if (o !== sub && o.events.has(ev)) { hub.delivered++; hub.queue.push(() => o.onMsg(ev, JSON.parse(json))); }
          },
          close: async () => { const s = hub.chans.get(name); if (s) s.delete(sub); }
        };
      }
    };
  };
  FakeHub.prototype.pump = function () { const q = this.queue; this.queue = []; for (const f of q) f(); };
  HG.FakeHub = FakeHub;
  // same-browser tabs (used by the automated two-tab browser test: add ?net=bc to the address)
  function BCTransport() {}
  BCTransport.prototype.open = async function (name, events, onMsg, onStatus) {
    const bc = new BroadcastChannel(name), ev = new Set(events);
    bc.onmessage = (m) => { const d = m.data || {}; if (ev.has(d.e)) onMsg(d.e, d.p || {}); };
    setTimeout(() => onStatus('ok'), 30);
    return { send: (e, p) => bc.postMessage({ e, p: JSON.parse(JSON.stringify(p)) }), close: async () => bc.close() };
  };

  // ---------------- the session ----------------
  function Net(opts) {
    this.transport = opts.transport;
    this.env = opts.env || 'live';
    this.me = opts.me;                 // { id, name }
    this.cb = opts.callbacks || {};
    this.reset();
  }
  HG.Net = Net;
  HG.Net.Supa = SupaTransport;
  HG.Net.BC = BCTransport;
  HG.Net.MAX_GUESTS = MAX_GUESTS;
  const N = Net.prototype;

  N.reset = function () {
    this.status = 'idle'; this.error = ''; this.host = false; this.code = ''; this.hostId = '';
    this.members = []; this.main = null; this.ups = new Map(); this.up = null; this.started = false;
    this.sim = null; this.local = null; this.hostSeen = 0; this.openedAt = 0; this.hiT = 0; this.sendT = 0; this.wT = 0; this.wDirty = true;
    this.fx = []; this.inbox = []; this.lastIn = new Map(); this.lastH = null; this.lastW = null; this.timeSinceH = 0; this.lightHold = 0; this.puzzleHold = 0;
  };
  N.newCode = function () { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c = ''; for (let i = 0; i < 4; i++) c += L[Math.floor(Math.random() * L.length)]; return c; };
  N.chanName = function (code) { return 'bg-room-hp-' + this.env + '-' + code; };
  N.ui = function () { if (this.cb.onLobby) this.cb.onLobby(this); };
  N.memberName = function (id) { const m = this.members.find(m => m.id === id); return (m && m.name) || 'Player'; };
  N.survivorMembers = function () { return this.members.filter(m => m.slot >= 0).sort((a, b) => a.slot - b.slot); };

  N.open = async function (code, asHost) {
    await this.leave(true);
    this.reset();
    const now = performance.now();
    Object.assign(this, { code: String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4), host: asHost, status: 'connecting', openedAt: now });
    if (asHost) { this.hostId = this.me.id; this.members = [{ id: this.me.id, name: this.me.name || 'Player', slot: -1, last: now }]; }
    // heartbeat on its own timer: browsers pause the frame loop in background tabs, and a friend who
    // switches tabs in the lobby must not be dropped from the room
    clearInterval(this.hbTimer); this.lastHiAt = 0;
    this.hbTimer = setInterval(() => this.heartbeat(), 1000);
    this.ui();
    try {
      this.main = await this.transport.open(this.chanName(this.code), MAIN_EVENTS, (ev, p) => this.recv(ev, p), st => {
        if (st === 'ok' && this.status === 'connecting') { this.status = 'connected'; this.sendHi(); this.ui(); }
        else if (st === 'error') { this.status = 'error'; this.error = 'Could not connect. Check your internet and try again.'; this.ui(); }
      });
      if (!asHost) this.up = await this.transport.open(this.chanName(this.code) + '-u-' + this.me.id, UP_EVENTS, () => {}, () => {});
    } catch (e) { this.status = 'error'; this.error = e.message || 'Could not connect.'; this.ui(); }
  };
  N.leave = async function (quiet) {
    if (this.status === 'connected') { this.send('bye', {}); if (this.up) this.upSend('bye', {}); }
    const chans = [this.main, this.up, ...this.ups.values()].filter(Boolean);
    this.main = null; this.up = null; this.ups = new Map();
    const wasHost = this.host;
    clearInterval(this.hbTimer); this.hbTimer = null;
    this.status = 'idle'; this.started = false; this.members = []; this.code = ''; this.host = false;
    if (this.sim && wasHost) for (const s of this.sim.survivors) if (s.remote) this.toBot(s, true);
    this.sim = null; this.local = null;
    for (const c of chans) c.close();
    if (!quiet) this.ui();
  };
  N.send = function (ev, p) { if (!this.main || this.status !== 'connected') return; p.id = this.me.id; this.main.send(ev, p); };
  N.upSend = function (ev, p) { if (!this.up) return; p.id = this.me.id; this.up.send(ev, p); };
  N.sendHi = function () { this.send('hi', { name: this.me.name || 'Player', h: this.host ? 1 : 0 }); };
  N.sendLobby = function () { if (this.host) this.send('lobby', { host: this.me.id, members: this.members.map(m => ({ id: m.id, name: m.name, slot: m.slot })), started: this.started }); this.ui(); };
  N.setName = function (name) {
    this.me.name = String(name || '').trim().slice(0, 16);
    if (this.status === 'connected') { this.sendHi(); if (this.host) { const m = this.members.find(m => m.id === this.me.id); if (m) { m.name = this.me.name || 'Player'; this.sendLobby(); } } }
  };

  // host: listen to a guest's uplink
  N.watchUp = async function (id) {
    if (this.ups.has(id)) return;
    this.ups.set(id, null);
    const c = await this.transport.open(this.chanName(this.code) + '-u-' + id, UP_EVENTS, (ev, p) => this.recvUp(ev, p), () => {});
    if (this.ups.has(id)) this.ups.set(id, c); else c.close();
  };
  N.dropUp = function (id) { const c = this.ups.get(id); this.ups.delete(id); if (c) c.close(); };

  N.seen = function (id, name, isHost) {
    const now = performance.now();
    if (this.host) {
      let m = this.members.find(m => m.id === id);
      if (!m) {
        const guests = this.members.filter(m => m.slot >= 0).length;
        if (this.started || guests >= MAX_GUESTS) { this.send('full', { to: id, why: this.started ? 'started' : 'full' }); return; }
        const used = this.members.map(m => m.slot); let slot = 0; while (used.includes(slot)) slot++;
        m = { id, name: String(name || 'Player').slice(0, 16), slot, last: now };
        this.members.push(m); this.watchUp(id); this.sendLobby();
      } else { m.last = now; if (name && m.name !== name) { m.name = String(name).slice(0, 16); this.sendLobby(); } }
    } else if (isHost) { if (!this.hostId) this.hostId = id; if (id === this.hostId) this.hostSeen = now; }
  };
  N.recv = function (ev, p) {
    const me = this.me.id;
    if (!p || p.id === me || (p.to && p.to !== me)) return;
    switch (ev) {
      case 'hi': this.seen(p.id, p.name, p.h); break;
      case 'lobby':
        if (this.host) break;
        this.hostId = p.host; this.hostSeen = performance.now();
        this.members = (p.members || []).slice(0, MAX_GUESTS + 1);
        if (this.started && !this.members.find(m => m.id === me)) { this.hostLeft('The host removed you from the game.'); return; }
        this.ui(); break;
      case 'full': this.leave(true).then(() => { this.error = p.why === 'started' ? 'That match has already started. Wait for the next one.' : 'That room is full (5 survivors).'; this.status = 'idle'; this.ui(); }); break;
      case 'start':
        if (this.host || p.id !== this.hostId) break;
        this.hostSeen = performance.now(); this.lastH = null; this.lastW = null;
        if (this.cb.onStart) this.cb.onStart(p.cfg); break;
      case 'h': if (!this.host && p.id === this.hostId) { this.hostSeen = performance.now(); if (this.sim) this.applyH(p); } break;
      case 'w': if (!this.host && p.id === this.hostId && this.sim) this.applyW(p); break;
      case 'end': if (!this.host && p.id === this.hostId && this.sim) this.applyEnd(p); break;
      case 'bye':
        if (this.host) this.memberLeft(p.id);
        else if (p.id === this.hostId) this.hostLeft('The host left. The match is over.');
        break;
    }
  };
  N.recvUp = function (ev, p) {
    if (!this.host || !p || !p.id) return;
    const m = this.members.find(m => m.id === p.id); if (!m) return;
    m.last = performance.now();
    if (ev === 'bye') { this.memberLeft(p.id); return; }
    this.inbox.push({ ev, p });
  };
  N.memberLeft = function (id) {
    const m = this.members.find(m => m.id === id);
    this.members = this.members.filter(x => x.id !== id); this.dropUp(id);
    if (m) {
      if (this.sim) { const s = this.sim.survivors.find(s => s.netId === id); if (s && s.remote) { this.toBot(s); if (this.cb.onNotice) this.cb.onNotice(m.name + ' left. A bot takes over.'); } }
      this.sendLobby();
    }
  };
  N.hostLeft = function (msg) { const inGame = this.started; this.leave(true); this.error = msg; if (this.cb.onHostLeft) this.cb.onHostLeft(msg, inGame); this.ui(); };
  // a human survivor whose player is gone keeps playing as an AI bot
  N.toBot = function (s, silent) {
    s.remote = false; s.human = false; s.isPlayer = false; s.net = null;
    if (s.alive && !s.escaped && !s.ai) { s.ai = new HG.SurvivorAI(this.sim, s); if (!silent) this.sim.say(s, "I'm... I'm okay. Keep going.", {}); }
  };

  // ---------------- starting ----------------
  // host: build the start config, send it, and return it so the host can build the same match
  N.hostStart = function (opts) {
    if (!this.host) return null;
    const humans = this.survivorMembers().map(m => ({ id: m.id, name: m.name, slot: m.slot }));
    const cfg = { seed: (Math.random() * 1e9) | 0, difficulty: opts.difficulty, length: opts.length, weather: opts.weather, humans, host: this.me.name || 'The Hollow' };
    this.started = true; this.wDirty = true; this.sendT = 0; this.wT = 0;
    this.send('start', { cfg }); this.sendLobby();
    return cfg;
  };
  N.simOpts = function (cfg) { return { mode: 'monster', difficulty: cfg.difficulty, length: cfg.length, weather: cfg.weather, seed: cfg.seed, humans: cfg.humans, localId: this.host ? null : this.me.id }; };
  // updates per second for host state and guest reports, from the number of human guests
  N.rate = function () {
    const n = Math.max(1, this.sim ? this.sim.survivors.filter(s => s.remote).length : this.members.filter(m => m.slot >= 0).length);
    return clamp((80 - 0.8 * (n + 1)) / (3 * n + 1), 4, 12);
  };
  N.bind = function (sim) {
    this.sim = sim; this.started = true; this.fx = []; this.inbox = []; this.hz = this.rate(); this.lastSent = null; this.beatT = 0;
    this.local = this.host ? null : sim.player;
    for (const s of sim.survivors) if (s.remote) this.lastIn.set(s.netId, performance.now());
    if (!this.host) { this.lastH = null; this.timeSinceH = 0; sim.netGuest = true; }
  };
  N.backToRoom = function () { this.started = false; this.sim = null; this.local = null; if (this.host) this.sendLobby(); this.ui(); };

  // ---------------- every frame ----------------
  N.update = function (dt) { this.heartbeat(); };
  // runs from the frame loop and from a 1-second timer, on real time
  N.heartbeat = function () {
    if (this.status === 'idle') return;
    const now = performance.now();
    if (this.status === 'connected' && now - (this.lastHiAt || 0) >= 3000) { this.lastHiAt = now; this.sendHi(); }
    if (this.host) {
      const gone = this.members.filter(m => m.id !== this.me.id && now - m.last > 15000);
      for (const m of gone) { this.memberLeft(m.id); if (this.cb.onNotice) this.cb.onNotice(m.name + ' lost the connection.'); }
    } else if (this.status === 'connected') {
      if (this.hostSeen && now - this.hostSeen > 12000) return this.hostLeft('Lost the connection to the host.');
      if (!this.hostSeen && now - this.openedAt > 8000 && !this.noRoomMsg) { this.noRoomMsg = true; this.error = 'No room found with code ' + this.code + ' yet. Check the code, or wait for the host.'; this.ui(); }
    }
  };
  // host: before the simulation steps, apply what guests sent
  N.hostPre = function () {
    if (!this.host || !this.sim) return;
    const sim = this.sim;
    for (const { ev, p } of this.inbox) {
      const s = sim.survivors.find(s => s.netId === p.id && s.remote); if (!s) continue;
      this.lastIn.set(p.id, performance.now());
      if (ev === 'in') {
        if ((p.ep | 0) !== (s.netEpoch | 0)) continue;   // stale: the host moved this player since
        const prev = s.net;
        s.net = { x: +p.x, z: +p.z, level: p.l | 0, cr: p.cr, sp: p.sp, spd: +p.spd || 0, st: clamp(+p.st || 0, 0, 1), age: prev ? clamp((performance.now() - prev.at) / 1000, 0, 0.5) : 0.1, at: performance.now() };
        if (!isFinite(s.net.x) || !isFinite(s.net.z) || s.net.level < 0 || s.net.level > 2) { s.net = prev; continue; }
        s.ctrl.yaw = +p.yw || 0; s.ctrl.pitch = clamp(+p.pt || 0, -1.4, 1.4); s.ctrl.use = !!p.u;
      } else if (ev === 'act') {
        switch (p.k) {
          case 'use': s.ctrl.usePressed = true; break;
          case 'light': s.ctrl.toggleLight = true; break;
          case 'reload': s.ctrl.reload = true; break;
          case 'medkit': s.ctrl.medkit = true; break;
          case 'struggle': sim.struggle(s); break;
          case 'puzzle': if (s.interact && s.interact.kind === 'puzzle' && s.interact.step) s.interact.step.progress = s.interact.step.time; break;
          case 'wires': sim.emitSound('task_wires', s.x, s.z, s.level, p.bad ? 10 : 6, s); break;
          case 'cmd': if (this.cb.onCommand) this.cb.onCommand(s, p.c); break;
        }
      }
    }
    this.inbox = [];
  };
  // host: after the simulation stepped and events were handled, send state
  N.hostPost = function (dt, events) {
    if (!this.host || !this.sim || this.status !== 'connected') return;
    for (const e of events) if (FWD.has(e.type)) this.fx.push(this.serEvent(e));
    if (events.some(e => e.type === 'taskDone' || e.type === 'progress' || e.type === 'searched' || e.type === 'gateOpen' || e.type === 'treeCleared' || e.type === 'powerFail' || e.type === 'generator' || e.type === 'darkness')) this.wDirty = true;
    this.sendT -= dt; this.wT -= dt;
    if (this.sendT <= 0) { this.hz = this.rate(); this.sendT = 1 / this.hz; this.send('h', this.snapH()); this.fx = []; }
    if (this.wT <= 0 || (this.wDirty && this.wT < 0.6)) { this.wT = 0.8; this.wDirty = false; this.send('w', this.snapW()); }
  };
  N.hostEnd = function () {
    if (!this.host || !this.sim) return;
    const sim = this.sim;
    if (this.fx.length) this.send('h', this.snapH());
    this.send('w', this.snapW());
    this.send('end', { r: sim.result, st: { chases: sim.stats.chases, ab: sim.stats.abilityUses }, s: sim.survivors.map(s => [s.escaped ? 1 : 0, s.caught ? 1 : 0, s.escapedAt || 0, s.caughtAt || 0, s.lostToNight ? 1 : 0, s.deliveries, Math.round(s.taskTime)]) });
  };
  N.serEvent = function (e) {
    const o = {};
    for (const k in e) { if (k === 'src' || k[0] === '_' || k === 'result') continue; const v = e[k]; o[k] = typeof v === 'number' ? r3(v) : v; }
    if (e.src) o.sid = e.src.id;
    return o;
  };
  N.snapH = function () {
    const sim = this.sim, m = sim.monster;
    const S = sim.survivors.map(s => {
      const F = (s.alive ? 1 : 0) | (s.escaped ? 2 : 0) | (s.caught ? 4 : 0) | (s.crouching ? 8 : 0) | (s.sprinting ? 16 : 0) | (s.flashlightOn ? 32 : 0) | (s.grabbedBy ? 64 : 0) | (s.moving ? 128 : 0) | (s.lostToNight ? 256 : 0);
      const ia = s.interact;
      return [r2(s.x), r2(s.z), s.level, r3(s.yaw), r2(s.pitch || 0), r2(s.speed), F, s.health, r3(s.battery), s.batteries, r2(s.fear), r2(s.struggle || 0), r2(s.downT || 0),
        s.hidden ? sim.world.hides.indexOf(s.hidden) : -1, ia ? ia.kind : '', ia ? r2(ia.progress) : 0, ia ? r2(ia.time) : 0, ia ? (ia.step && ia.step.verb ? ia.step.verb + '…' : ia.label) : '',
        s.carry.join(','), s.netEpoch || 0, r2(s.lightFlicker), r2(s.lightForcedOff), r2(s.panicT), r2(s.freezeT), r2(s.burstT), r2(s.stamina), r1(s.lastSayT || -99), s.ai ? s.ai.mode : ''];
    });
    const M = [r2(m.x), r2(m.z), m.level, r3(m.yaw), r2(m.pitch || 0), r2(m.speed), m.mode, (m.crawling ? 1 : 0) | (m.stalking ? 2 : 0) | (m.running ? 4 : 0) | (m.moving ? 8 : 0),
      r2(m.ghostT), r2(m.attackWind), r2(m.pounceWind), r2(m.pounceT), r2(m.airY || 0), r2(m.stumbleT), r2(m.screamWind), r2(m.revealT), r2(m.eyesT || 0), r2(m.headTurn || 0), r2(m.recoverT), m.grabbed ? sim.survivors.indexOf(m.grabbed) : -1, r2(m.dashT)];
    const D = sim.world.doors.map(d => d.open ? ((d.swing || 1) > 0 ? 1 : 2) + (d.openedBy === 'wind' ? 4 : d.openedBy === 'monster' ? 8 : 0) : 0);
    const L = sim.world.lamps.map(L => r1(L.level01 || 0));
    return { hz: r1(this.hz || 8), t: r2(sim.time), ph: sim.phase, gs: sim.gateState, gt: r1(sim.gateTimer), lt: r2(sim.lightning || 0), fq: sim.forestQuiet ? 1 : 0, s: S, m: M, d: D, l: L, fx: this.fx };
  };
  N.snapW = function () {
    const sim = this.sim, w = sim.world;
    return {
      tk: sim.tasks.map(t => [t.stepIdx, t.done ? 1 : 0, r1(t.doneAt || 0), t.steps.map(st => [r2(st.progress || 0), st.delivered.join(','), st.occupants || 0])]),
      c: w.containers.map(c => [c.searched ? 1 : 0, c.locked ? 1 : 0, c.items.join(',')]),
      it: sim.items.map(i => [i.id, i.kind, r2(i.x), r2(i.z), i.level]),
      hd: w.hides.map(h => h.occupant ? sim.survivors.indexOf(h.occupant) : -1),
      f: [sim.generatorRunning, sim.generatorFixed, sim.stationPowered, sim.breakersReset, sim.truckRunning, sim.chainCut, sim.fallenTree, sim.beaconSent, sim.rescueCalled, sim.powerFailed, w.storageDoor.locked].map(v => v ? 1 : 0),
      dk: sim.darknessFields.map(f => [r2(f.x), r2(f.z), f.level, f.r, r2(f.t), r2(f.warn)]),
      ms: sim.team.missing.slice(), dl: sim.world.doors.map(d => d.locked ? 1 : 0)
    };
  };

  // ---------------- guest: applying the host's state ----------------
  N.applyH = function (p) {
    const sim = this.sim;
    this.lastH = p; this.timeSinceH = 0; if (p.hz) this.hz = p.hz;
    sim.time = p.t; sim.phase = p.ph; sim.gateTimer = p.gt; sim.lightning = p.lt; sim.forestQuiet = !!p.fq;
    if (p.gs !== sim.gateState) { if (p.gs === 'open') this.openGate(); sim.gateState = p.gs; }
    p.s.forEach((a, i) => this.applySurvivor(sim.survivors[i], a, i));
    this.applyMonster(p.m);
    p.d.forEach((v, i) => { const d = sim.world.doors[i]; if (!d) return; const open = v > 0; if (open && !d.open) { d.swing = (v & 3) === 2 ? -1 : 1; d.openedBy = v & 4 ? 'wind' : v & 8 ? 'monster' : 'survivor'; } else if (!open && d.open) d.openedBy = v & 8 ? 'monster' : ''; d.open = open; });
    p.l.forEach((v, i) => { const L = sim.world.lamps[i]; if (L) { L.level01 = v; L.on = v > 0.5; } });
    // events: rehydrate references and hand them to the game
    for (const e of p.fx || []) {
      if (e.sid !== undefined) e.src = e.sid === 'm' ? sim.monster : sim.survivors.find(s => s.id === e.sid);
      if (e.type === 'sound' && e.kind === 'step' && this.local && e.sid === this.local.id) continue; // own footsteps are made locally
      if (e.type === 'sound') sim.sounds.push(Object.assign({}, e, { t: sim.time }));
      sim.events.push(e);
    }
    if (sim.sounds.length > 80) sim.sounds = sim.sounds.slice(-40);
  };
  N.applySurvivor = function (s, a, i) {
    if (!s) return;
    const me = s === this.local;
    const F = a[6];
    const wasAlive = s.alive;
    s.alive = !!(F & 1); s.escaped = !!(F & 2); s.caught = !!(F & 4); s.lostToNight = !!(F & 256);
    s.health = a[7]; s.battery = a[8]; s.batteries = a[9]; s.fear = a[10]; s.struggle = a[11]; s.downT = a[12];
    const hid = a[13] >= 0 ? this.sim.world.hides[a[13]] : null; s.hidden = hid;
    s.grabbedBy = F & 64 ? this.sim.monster : null;
    s.interact = a[14] ? { kind: a[14], progress: a[15], time: a[16], label: a[17], x: s.x, z: s.z, step: a[14] === 'puzzle' ? { verb: '' } : null } : null;
    if (s.interact && a[14] !== 'puzzle') s.interact.step = { verb: '' };
    s.carry = a[18] ? a[18].split(',') : [];
    s.lightFlicker = a[20]; s.lightForcedOff = a[21]; s.panicT = a[22]; s.freezeT = a[23]; s.burstT = a[24];
    s.lastSayT = a[26]; s.aiMode = a[27];
    if (wasAlive && !s.alive) { s.deathX = s.x; s.deathZ = s.z; s.deathLevel = s.level; s.caughtAt = this.sim.time; }
    if (me) {
      if (this.lightHold <= 0) s.flashlightOn = !!(F & 32);
      // the host moved us (hidden, grabbed, knocked down, or a new epoch): snap to its position
      const forced = s.hidden || s.grabbedBy || s.downT > 0;
      if (forced || a[19] !== s.netEpoch || Math.hypot(a[0] - s.x, a[1] - s.z) > 6 || a[2] !== s.level && !forced && Math.hypot(a[0] - s.x, a[1] - s.z) > 2) {
        s.x = a[0]; s.z = a[1]; s.level = a[2]; s.vx = s.vz = 0;
        if (forced) s.yaw = a[3];
      }
      s.netEpoch = a[19];
      return;
    }
    s.flashlightOn = !!(F & 32);
    s.crouching = !!(F & 8); s.sprinting = !!(F & 16); s.moving = !!(F & 128); s.stamina = a[25];
    const jump = Math.hypot(a[0] - (s.tx === undefined ? a[0] : s.tx), a[1] - (s.tz === undefined ? a[1] : s.tz)) > 3 || a[2] !== s.level;
    const pdt = Math.max(0.05, this.sim.time - (s.tAt || 0));
    s.tvx = jump || s.tx === undefined ? 0 : clamp((a[0] - s.tx) / pdt, -7, 7); s.tvz = jump || s.tz === undefined ? 0 : clamp((a[1] - s.tz) / pdt, -7, 7); s.tAt = this.sim.time;
    s.tx = a[0]; s.tz = a[1]; s.tyaw = a[3]; s.tpitch = a[4]; s.netSpeed = a[5];
    if (jump || s.hidden) { s.x = a[0]; s.z = a[1]; s.yaw = a[3]; }
    s.level = a[2];
  };
  N.applyMonster = function (a) {
    const m = this.sim.monster;
    const jump = Math.hypot(a[0] - m.x, a[1] - m.z) > 6 || a[2] !== m.level;
    const pdt = Math.max(0.05, this.sim.time - (m.tAt || 0));
    m.tvx = jump || m.tx === undefined ? 0 : clamp((a[0] - m.tx) / pdt, -16, 16); m.tvz = jump || m.tz === undefined ? 0 : clamp((a[1] - m.tz) / pdt, -16, 16); m.tAt = this.sim.time;
    m.tx = a[0]; m.tz = a[1]; m.tyaw = a[3]; m.pitch = a[4]; m.netSpeed = a[5]; m.mode = a[6];
    if (jump) { m.x = a[0]; m.z = a[1]; m.yaw = a[3]; }
    m.level = a[2];
    m.crawling = !!(a[7] & 1); m.stalking = !!(a[7] & 2); m.running = !!(a[7] & 4); m.moving = !!(a[7] & 8);
    m.ghostT = a[8]; m.attackWind = a[9]; m.pounceWind = a[10]; m.pounceT = a[11]; m.airY = a[12]; m.stumbleT = a[13]; m.screamWind = a[14];
    m.revealT = a[15]; m.eyesT = a[16]; m.headTurn = a[17]; m.recoverT = a[18]; m.grabbed = a[19] >= 0 ? this.sim.survivors[a[19]] : null; m.dashT = a[20];
  };
  N.applyW = function (p) {
    const sim = this.sim, w = sim.world;
    this.lastW = p;
    p.tk.forEach((a, i) => {
      const t = sim.tasks[i]; if (!t) return;
      t.stepIdx = a[0]; t.done = !!a[1]; t.doneAt = a[2];
      a[3].forEach((b, j) => { const st = t.steps[j]; if (!st) return; st.progress = b[0]; st.delivered = b[1] ? b[1].split(',') : []; st.occupants = b[2]; });
    });
    p.c.forEach((a, i) => { const c = w.containers[i]; if (!c) return; c.searched = !!a[0]; c.locked = !!a[1]; c.items = a[2] ? a[2].split(',') : []; });
    sim.items = p.it.map(a => ({ id: a[0], kind: a[1], x: a[2], z: a[3], level: a[4] }));
    p.hd.forEach((v, i) => { const h = w.hides[i]; if (h) h.occupant = v >= 0 ? sim.survivors[v] : null; });
    const f = p.f.map(Boolean);
    [sim.generatorRunning, sim.generatorFixed, sim.stationPowered, sim.breakersReset, sim.truckRunning, sim.chainCut] = f;
    if (sim.fallenTree && !f[6]) sim.removeFallenTree();
    sim.fallenTree = f[6]; sim.beaconSent = f[7]; sim.rescueCalled = f[8]; sim.powerFailed = f[9];
    if (w.storageDoor.locked && !f[10]) { w.storageDoor.locked = false; for (const c of w.containers) if (c.id.startsWith('store_')) c.locked = false; }
    sim.darknessFields = p.dk.map(a => ({ x: a[0], z: a[1], level: a[2], r: a[3], t: a[4], warn: a[5] }));
    sim.team.missing = p.ms || [];
    (p.dl || []).forEach((v, i) => { const d = w.doors[i]; if (d) d.locked = !!v; });
  };
  N.openGate = function () {
    const sim = this.sim, w = sim.world;
    for (const b of w.gateBoxes) b.enabled = false;
    for (let x = 62; x <= 65; x++) w.set(0, x, 114, HG.T.OPEN);
    w.markDirty();
  };
  N.applyEnd = function (p) {
    const sim = this.sim;
    sim.survivors.forEach((s, i) => { const a = p.s[i]; if (!a) return; s.escaped = !!a[0]; s.caught = !!a[1]; s.escapedAt = a[2]; s.caughtAt = a[3]; s.lostToNight = !!a[4]; s.deliveries = a[5]; s.taskTime = a[6]; if (s.caught) s.alive = false; });
    sim.stats.chases = p.st.chases; sim.stats.abilityUses = p.st.ab || {};
    sim.over = true; sim.result = p.r;
    sim.events.push({ type: 'matchOver', result: p.r });
  };

  // guest: every frame, smooth everyone else toward the host's state and move our own survivor
  N.guestFrame = function (dt) {
    const sim = this.sim; if (!sim) return;
    this.timeSinceH += dt; this.lightHold = Math.max(0, this.lightHold - dt);
    sim.time += dt;
    const k = Math.min(1, dt * 12);
    // predict a little past the last update (it arrives every 1/hz s), never more than that
    const ahead = Math.min(this.timeSinceH, 1.2 / (this.hz || 8));
    for (const s of sim.survivors) {
      if (s === this.local || s.tx === undefined) continue;
      const ox = s.x, oz = s.z;
      const px = s.tx + (s.tvx || 0) * ahead, pz = s.tz + (s.tvz || 0) * ahead;
      s.x += (px - s.x) * k; s.z += (pz - s.z) * k;
      s.yaw += HG.angDiff(s.yaw, s.tyaw) * k; s.pitch = lerp(s.pitch || 0, s.tpitch || 0, k);
      s.speed = s.netSpeed !== undefined ? s.netSpeed : Math.hypot(s.x - ox, s.z - oz) / dt;
      s.y = sim.world.floorY(s.level, s.x, s.z);
    }
    const m = sim.monster;
    if (m.tx !== undefined) {
      const km = Math.min(1, dt * 14);
      const held = m.grabbed || m.recoverT > 0 || m.stumbleT > 0;
      const px = m.tx + (held ? 0 : (m.tvx || 0) * ahead), pz = m.tz + (held ? 0 : (m.tvz || 0) * ahead);
      m.x += (px - m.x) * km; m.z += (pz - m.z) * km; m.yaw += HG.angDiff(m.yaw, m.tyaw) * km;
      m.speed = m.netSpeed || 0; m.y = sim.world.floorY(m.level, m.x, m.z);
    }
    // own survivor: move locally unless the host holds us
    const me = this.local;
    if (me && me.alive && !me.escaped) {
      const held = me.hidden || me.grabbedBy || me.downT > 0 || me.freezeT > 0;
      if (held) { me.speed = 0; me.moving = false; me.vx = me.vz = 0; me.y = sim.world.floorY(me.level, me.x, me.z); }
      else {
        const moved = sim.moveSurvivor(me, dt);
        // our own footsteps are made here, without network delay
        if (me.moving) {
          me.stepAcc = (me.stepAcc || 0) + moved;
          const stride = me.sprinting ? 0.95 : (me.crouching ? 0.6 : 0.72);
          if (me.stepAcc > stride) { me.stepAcc = 0; sim.events.push({ type: 'sound', kind: 'step', x: me.x, z: me.z, level: me.level, radius: 6, src: me, surface: sim.surfaceAt(me), sprint: me.sprinting, crouch: me.crouching, foot: (me.foot = !me.foot) }); }
        }
      }
      if (me.ctrl.yaw !== null) me.yaw = me.ctrl.yaw; if (me.ctrl.pitch !== null) me.pitch = me.ctrl.pitch;
      this.sendT -= dt; this.beatT -= dt;
      if (this.sendT <= 0) {
        this.sendT = 1 / (this.hz || 8);
        const msg = { x: r2(me.x), z: r2(me.z), l: me.level, yw: r2(me.yaw), pt: r2(me.pitch || 0), cr: me.crouching ? 1 : 0, sp: me.sprinting ? 1 : 0, spd: r2(me.speed), st: r2(me.stamina), u: me.ctrl.use ? 1 : 0, ep: me.netEpoch || 0 };
        const key = JSON.stringify(msg);
        // only when something changed (looking around counts), otherwise a heartbeat twice a second
        if (key !== this.lastSent || this.beatT <= 0) { this.lastSent = key; this.beatT = 0.5; this.upSend('in', msg); }
      }
    }
    // decay visual timers between snapshots
    for (const s of sim.survivors) { s.lightFlicker = Math.max(0, (s.lightFlicker || 0) - dt); s.lightForcedOff = Math.max(0, (s.lightForcedOff || 0) - dt); }
  };
  N.act = function (k, extra) {
    if (this.host || !this.started) return;
    if (k === 'light' && this.local) { this.local.flashlightOn = !this.local.flashlightOn; this.lightHold = 0.6; }
    this.upSend('act', Object.assign({ k }, extra || {}));
  };
})(typeof window !== 'undefined' ? window : globalThis);
