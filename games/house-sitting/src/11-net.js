// ================= PLAY TOGETHER: online co-op for 2–4 players via Supabase Realtime =================
//  - The host makes a room with a 4-letter code; friends join with it (up to 4 players).
//  - Room = Realtime channel "bg-room-hs-<env>-<CODE>" (broadcast + presence). No database tables needed.
//  - The host's game runs the story and the monster. Everyone walks around with their own player.
//    Story checks ("someone walked into the kitchen", "someone looked at the window") are run
//    through every player's eyes, so any of you can move the story forward.
//  - The host sends the world (doors, lights, props, objectives, pockets) a few times per second,
//    plus events as they happen (sounds, subtitles, cutscenes, teleports).
//  - Guests press E on things: the host does it for them.
//  - The monster hunts whoever is closest. If it catches anyone, everyone starts over (deathlink).
//  Messages: hi, lobby, full, start, p (player), h (host player + monster), snap (world), fx (events), use, req, bye
const MP_COLORS = ['#6b8fb5', '#c08a52', '#7aa36b', '#b07aa6'];
const MP_SKIN = [0xc8a184, 0x8a6248, 0xe0bfa0, 0xa7785a];
const MP_EVENTS = ['hi', 'lobby', 'full', 'start', 'p', 'h', 'snap', 'fx', 'use', 'req', 'bye'];
const MP_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;
const escHtml = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ser = a => (a && a.isVector3) ? { v: [r3(a.x), r3(a.y), r3(a.z)] } : a;
const des = a => (a && a.v && a.v.length === 3) ? new V3(a.v[0], a.v[1], a.v[2]) : a;

const MP = {
  status: 'idle', error: '', host: false, guest: false, started: false,
  code: '', hostId: '', members: [], remotes: {}, ch: null, rt: null, fake: null,
  fxq: [], depth: 0, mute: false, actor: '', notes: {}, tok: 0, tpN: 0,
  sendT: 0, snapT: 0, flushT: 0, hiT: 0, dirty: false, hostSeen: 0, openedAt: 0,
  mon: null, fz: 0, cl: null, gl: {}, lastO: '', lastI: '', sync: [], syncCols: [],

  get active(){ return this.status !== 'idle'; },
  available(){ const o = window.HW_BUILD && window.HW_BUILD.online; return !!this.fake || !!(o && o.url && o.key); },
  env(){ return (window.HW_BUILD && window.HW_BUILD.env) || 'live'; },
  bcast(){ return this.host && this.started && !this.mute; },

  // shared Bas Games player profile (same name as in the other games)
  me(){
    if (this._me) return this._me;
    let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    if (!P.id){ P.id = 'hs-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) {} }
    this._me = { id: P.id, name: String(P.name || '').trim().slice(0, 16) }; return this._me;
  },
  setName(name){
    const me = this.me(); me.name = String(name || '').trim().slice(0, 16);
    let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    P.id = me.id; P.name = me.name; try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) {}
  },
  nameOf(id){ const m = this.members.find(m => m.id === id); return (m && m.name) || 'Player'; },
  slotOf(id){ const m = this.members.find(m => m.id === id); return m ? m.slot : 0; },
  newCode(){ const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c = ''; for (let i = 0; i < 4; i++) c += L[Math.floor(Math.random() * L.length)]; return c; },

  // ---------- connection ----------
  async rtClient(){
    if (this.rt) return this.rt;
    if (!window.supabase){
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = MP_LIB; s.onload = res; s.onerror = () => rej(new Error('Could not load the online library.')); document.head.appendChild(s); });
    }
    const cfg = window.HW_BUILD.online;
    this.rt = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return this.rt;
  },
  async open(code, asHost){
    await this.leave();
    const me = this.me();
    Object.assign(this, { code: String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4), host: asHost, guest: !asHost, status: 'connecting', error: '',
      started: false, hostId: asHost ? me.id : '', hostSeen: 0, openedAt: performance.now(), members: asHost ? [{ id: me.id, name: me.name || 'Player', slot: 0, last: performance.now() }] : [] });
    this.ui();
    if (this.fake){ this.fake.connect(this); this.status = 'connected'; this.sendHi(); this.ui(); return; }
    try {
      const rt = await this.rtClient();
      const ch = rt.channel('bg-room-hs-' + this.env() + '-' + this.code, { config: { presence: { key: me.id }, broadcast: { self: false, ack: false } } });
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState();
        for (const k of Object.keys(st)) if (k !== me.id){ const m = (st[k] || [])[0] || {}; this.seen(k, m.name, m.h); }
      });
      for (const ev of MP_EVENTS) ch.on('broadcast', { event: ev }, ({ payload }) => this.recv(ev, payload || {}));
      ch.subscribe(st => {
        if (st === 'SUBSCRIBED'){ this.status = 'connected'; ch.track({ name: me.name || 'Player', h: this.host ? 1 : 0 }); this.sendHi(); this.ui(); }
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT'){ this.status = 'error'; this.error = 'Could not connect. Check your internet and try again.'; this.ui(); }
      });
      this.ch = ch;
    } catch (e){ this.status = 'error'; this.error = e.message || 'Could not connect.'; this.ui(); }
  },
  // leaving is immediate; closing the channel finishes in the background
  async leave(){
    if (this.status === 'connected') this.send('bye', {});
    const ch = this.ch; this.ch = null;
    if (this.fake && this.status !== 'idle') this.fake.disconnect(this);
    for (const id of Object.keys(this.remotes)) this.dropRemote(id);
    this.stopLoops(); if (this.started){ player.frozen = false; }
    Object.assign(this, { status: 'idle', host: false, guest: false, started: false, code: '', hostId: '', members: [], hostSeen: 0, fxq: [], mon: null, fz: 0, cl: null, notes: {} });
    if (ch){ try { await ch.unsubscribe(); if (this.rt) this.rt.removeChannel(ch); } catch (e) {} }
  },
  send(ev, payload){
    if (this.status !== 'connected') return;
    payload.id = this.me().id;
    if (this.fake){ this.fake.send(this, ev, payload); return; }
    if (this.ch) this.ch.send({ type: 'broadcast', event: ev, payload });
  },
  sendHi(){ this.send('hi', { name: this.me().name || 'Player', h: this.host ? 1 : 0 }); },
  sendLobby(){ if (this.host) this.send('lobby', { host: this.me().id, members: this.members.map(m => ({ id: m.id, name: m.name, slot: m.slot })), started: this.started }); this.ui(); },

  // someone is in the room (from presence or a 'hi' message)
  seen(id, name, isHost){
    const now = performance.now();
    if (this.host){
      let m = this.members.find(m => m.id === id);
      if (!m){
        if (this.started || this.members.length >= 4){ this.send('full', { to: id, why: this.started ? 'started' : 'full' }); return; }
        const used = this.members.map(m => m.slot); let slot = 0; while (used.includes(slot)) slot++;
        m = { id, name: String(name || 'Player').slice(0, 16), slot, last: now }; this.members.push(m); this.sendLobby();
      } else { m.last = now; if (name && m.name !== name){ m.name = String(name).slice(0, 16); this.sendLobby(); } }
    } else if (isHost){ if (!this.hostId) this.hostId = id; if (id === this.hostId) this.hostSeen = now; }
  },
  recv(ev, p){
    const me = this.me().id; if (!p || p.id === me || (p.to && p.to !== me)) return;
    switch (ev){
      case 'hi': this.seen(p.id, p.name, p.h); break;
      case 'lobby':
        if (!this.guest) break;
        this.hostId = p.host; this.hostSeen = performance.now(); this.members = (p.members || []).slice(0, 4);
        for (const id of Object.keys(this.remotes)) if (!this.members.find(m => m.id === id)) this.dropRemote(id);
        if (!this.members.find(m => m.id === me) && this.started){ this.hostLeft('The host removed you from the game.'); return; }
        this.ui(); break;
      case 'full': this.leave().then(() => { this.error = p.why === 'started' ? 'That game has already started.' : 'That room is full (4 players).'; this.status = 'idle'; this.ui(true); }); break;
      case 'start': if (this.guest && p.id === this.hostId) this.startLocal(p.cp); break;
      case 'p': if (this.started) this.onState(p.id, p); if (this.host){ const m = this.members.find(m => m.id === p.id); if (m) m.last = performance.now(); } break;
      case 'h': if (this.guest && p.id === this.hostId){ this.hostSeen = performance.now(); if (this.started){ if (p.p) this.onState(p.id, p.p); this.mon = p.m; this.fz = p.fz; if (p.sk > 0.45) player.shake = Math.max(player.shake, p.sk * 0.7); } } break;
      case 'snap': if (this.guest && this.started && p.id === this.hostId) this.applySnap(p); break;
      case 'fx': if (this.guest && this.started && p.id === this.hostId) (p.e || []).forEach(e => { try { this.applyFx(e); } catch (er) { console.warn('fx', e && e.t, er); } }); break;
      case 'use': if (this.host && this.started) this.remoteUse(p.id, p.i | 0); break;
      case 'req':
        if (!this.host) break;
        if (p.k === 'note' && this.notes[p.tok]){ const cb = this.notes[p.tok]; delete this.notes[p.tok]; cb && cb(); this.dirty = true; }
        if (p.k === 'skip' && G.state === 'cine') nextCine();
        break;
      case 'bye':
        if (this.host){ const m = this.members.find(m => m.id === p.id); this.members = this.members.filter(m => m.id !== p.id); this.dropRemote(p.id); if (m){ this.sendLobby(); if (this.started) subtitle(escHtml(m.name) + ' left the house.', 3, 'thought'); } }
        else if (p.id === this.hostId) this.hostLeft('The host left the game.');
        else this.dropRemote(p.id);
        break;
    }
  },
  hostLeft(msg){
    const inGame = this.started; this.leave();
    if (inGame) toMenu();
    this.openScreen(); this.error = msg; this.ui(true);
  },

  // ---------- starting ----------
  hostStart(cp){
    if (!this.host) return;
    this.started = true; this.fxq = []; this.notes = {}; this.dirty = true; this.snapT = 0;
    this.send('start', { cp }); this.sendLobby();
    for (const r of Object.values(this.remotes)) r.trail = [];
    $('mp').hidden = true; audioInit(); loadCheckpoint(cp);
  },
  startLocal(cp){
    this.started = true; this.cl = null; this.stopLoops(); this.lastO = this.lastI = ''; this.mon = null; this.fz = 0;
    hideScreens(); $('mp').hidden = true; $('hud').hidden = false; fade(0, 0.2);
    resetWorld(); G.state = 'playing'; G.checkpoint = cp;
    audioInit(); if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
    // pointer lock needs a click from the player, so the "click to look around" hint shows until they click
  },

  // ---------- every frame ----------
  update(dt){
    if (this.status === 'idle') return;
    const now = performance.now();
    if (this.status === 'connected'){ this.hiT -= dt; if (this.hiT <= 0){ this.hiT = 3; this.sendHi(); } }
    if (this.host){
      const gone = this.members.filter(m => m.id !== this.me().id && now - m.last > 20000);
      if (gone.length){ this.members = this.members.filter(m => !gone.includes(m)); gone.forEach(m => this.dropRemote(m.id)); this.sendLobby(); }
    } else if (this.status === 'connected'){
      if (this.hostSeen && now - this.hostSeen > 20000) return this.hostLeft('Lost the connection to the host.');
      if (!this.hostSeen && now - this.openedAt > 8000 && !this.noRoomMsg){ this.noRoomMsg = true; this.error = 'No room found with code ' + this.code + ' yet. Check the code, or wait for the host.'; this.ui(); }
    }
    if (!this.started) return;
    // the flashlight is shared: once anyone finds it, everyone has one
    if (this.guest){ const f = hasItem('Flashlight'); if (player.hasFlash !== f){ player.hasFlash = f; if (!f) player.flashOn = false; $('batWrap').hidden = !f; } }
    else if (hasItem('Flashlight') && !player.hasFlash){ player.hasFlash = true; $('batWrap').hidden = false; }
    this.sendT -= dt;
    if (this.sendT <= 0){
      this.sendT = 1 / 8;
      if (this.host) this.send('h', { p: this.myState(), m: this.monState(), fz: player.frozen ? 1 : 0, sk: r2(player.shake) });
      else this.send('p', this.myState());
    }
    if (this.host){
      this.snapT -= dt; this.flushT -= dt;
      if (this.snapT <= 0 || (this.dirty && this.snapT < 0.25)){ this.snapT = 0.4; this.dirty = false; this.send('snap', this.snapshot()); }
      if (this.fxq.length && this.flushT <= 0) this.flush();
    }
    this.updateAvatars(dt);
  },
  q(e){ this.fxq.push(e); },
  flush(){ if (!this.fxq.length) return; this.send('fx', { e: this.fxq }); this.fxq = []; this.flushT = 0.1; },
  myState(){ const p = player; return { x: r2(p.pos.x), y: r2(p.feetY), z: r2(p.pos.z), yw: r3(p.yaw), pt: r3(p.pitch), lv: p.level, fl: p.flashOn ? 1 : 0 }; },
  monState(){ const r = MON.m.root; return { mo: MON.mode, v: r.visible ? 1 : 0, x: r2(MON.pos.x), y: r2(MON.pos.y), z: r2(MON.pos.z), yw: r3(MON.yaw), sp: r2(MON.speed) }; },

  // ---------- other players ----------
  onState(id, s){
    if (id === this.me().id) return;
    let r = this.remotes[id];
    if (!r) r = this.remotes[id] = { id, trail: [], seen: false };
    const jump = r.seen && Math.hypot(s.x - r.tx, s.z - r.tz) > 3;
    if (!r.seen || jump){ r.x = s.x; r.y = s.y; r.z = s.z; r.yaw = s.yw; r.pitch = s.pt; r.trail = []; }
    r.seen = true; r.tx = s.x; r.ty = s.y; r.tz = s.z; r.tyaw = s.yw; r.tpitch = s.pt; r.lv = s.lv | 0; r.fl = s.fl; r.t = performance.now();
    if (this.host){ const l = r.trail[r.trail.length - 1]; if (!l || Math.hypot(l.x - s.x, l.z - s.z) > 0.45 || l.level !== r.lv){ r.trail.push({ x: s.x, z: s.z, level: r.lv }); if (r.trail.length > 400) r.trail.shift(); } }
  },
  liveRemotes(){ return Object.values(this.remotes).filter(r => r.seen && this.members.find(m => m.id === r.id)); },
  dropRemote(id){
    const r = this.remotes[id]; if (!r) return;
    if (r.av){ scene.remove(r.av.h.root); scene.remove(r.av.tag); scene.remove(r.av.spot); scene.remove(r.av.spot.target); }
    delete this.remotes[id];
    if (MON.tid === id) MON.tid = null;
  },
  makeAvatar(r){
    const slot = this.slotOf(r.id), col = MP_COLORS[slot % 4];
    const h = buildHuman({ shirt: new THREE.Color(col).getHex(), pants: 0x23262c, skin: MP_SKIN[slot % 4], hair: [0x2a2018, 0x111111, 0x6b4a2a, 0x3a2a1a][slot % 4] });
    scene.add(h.root);
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    if (x){ x.font = '600 30px "Cutive Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(28, 10, 200, 44); x.fillStyle = col; x.fillText(String(this.nameOf(r.id)).slice(0, 14), 128, 33); }
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); tag.scale.set(0.9, 0.225, 1); scene.add(tag);
    const spot = new THREE.SpotLight(0xfff0d6, 0, 20, 0.42, 0.5, 1.4); scene.add(spot); scene.add(spot.target);
    r.av = { h, tag, spot, step: 0, name: this.nameOf(r.id) };
  },
  updateAvatars(dt){
    const k = Math.min(1, dt * 12);
    for (const r of Object.values(this.remotes)){
      if (!r.seen) continue;
      if (!r.av) this.makeAvatar(r);
      const a = r.av, ox = r.x, oz = r.z;
      r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k;
      let dy = r.tyaw - r.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; r.yaw += dy * k; r.pitch += (r.tpitch - r.pitch) * k;
      const moved = Math.hypot(r.x - ox, r.z - oz), speed = dt > 0 ? moved / dt : 0;
      a.h.root.position.set(r.x, r.y, r.z); a.h.root.rotation.y = r.yaw + Math.PI; a.h.P.head.rotation.x = -r.pitch * 0.6;
      animHuman(a.h, dt, Math.min(speed, 6));
      a.tag.position.set(r.x, r.y + 2.08, r.z);
      a.step += moved; if (a.step > 0.75 && speed > 0.5){ a.step = 0; SND.step(surfaceAt(r.x, r.z, r.lv), new V3(r.x, r.y + 0.05, r.z), speed > 4 ? 0.4 : 0.26); }
      const eye = new V3(r.x, r.y + 1.5, r.z), fwd = new V3(-Math.sin(r.yaw) * Math.cos(r.pitch), Math.sin(r.pitch), -Math.cos(r.yaw) * Math.cos(r.pitch));
      a.spot.position.copy(eye).addScaledVector(fwd, 0.3); a.spot.target.position.copy(eye).addScaledVector(fwd, 6); a.spot.intensity = r.fl ? 2.2 : 0;
      if (a.name !== this.nameOf(r.id)){ scene.remove(a.h.root); scene.remove(a.tag); scene.remove(a.spot); scene.remove(a.spot.target); this.makeAvatar(r); }
    }
  },
  // run fn as if this computer's player stood where remote player r stands (for story checks and their E presses)
  withView(r, fn){
    const p = player, sv = { x: p.pos.x, y: p.pos.y, z: p.pos.z, lv: p.level, fy: p.feetY, fl: p.flashOn, cp: camera.position.clone(), cr: camera.rotation.clone() }, tp0 = this.tpN;
    p.pos.set(r.tx, r.ty, r.tz); p.feetY = r.ty; p.level = r.lv; p.flashOn = !!r.fl;
    camera.position.set(r.tx, r.ty + p.height, r.tz); camera.rotation.set(r.tpitch, r.tyaw, 0); camera.updateMatrixWorld(true);
    VIEW_ID = r.id;
    try { fn(); }
    finally {
      VIEW_ID = ''; p.flashOn = sv.fl;
      if (this.tpN === tp0){ p.pos.set(sv.x, sv.y, sv.z); p.level = sv.lv; p.feetY = sv.fy; camera.position.copy(sv.cp); camera.rotation.copy(sv.cr); }
      camera.updateMatrixWorld(true);
    }
  },
  remoteUse(id, i){
    const e = inters[i], r = this.remotes[id];
    if (!e || !r || !r.seen) return;
    this.withView(r, () => { this.actor = id; try { if (e.enabled()) e.use(); } finally { this.actor = ''; } });
    this.dirty = true;
  },

  // ---------- world snapshot (host → guests) ----------
  collect(){
    const objs = new Set(), cols = new Set();
    const add = v => {
      if (!v) return;
      if (v.isObject3D){ objs.add(v); return; }
      if (Array.isArray(v)){ v.forEach(add); return; }
      if (typeof v === 'object'){ if ('minX' in v && 'on' in v){ cols.add(v); return; } if (v.g) add(v.g); if (v.lid) add(v.lid); if (v.c) cols.add(v.c); }
    };
    Object.values(PROPS).forEach(add);
    [GHOST.root, OFF1.root, OFF2.root, NEIGH.root, beam1, beam2, TORCH1, TORCH2].forEach(add);
    BATT.forEach(b => add(b.g)); Object.values(W).forEach(w => add(w.glass));
    this.sync = [...objs]; this.syncCols = [...cols];
  },
  snapshot(){
    return {
      st: G.step, f: G.flags, o: G.objectives || [], inv: G.inv, pw: G.power ? 1 : 0, np: G.npower ? 1 : 0, ck: G.checkpoint,
      d: doors.map(d => [d.open ? 1 : 0, d.locked ? 1 : 0, d.jammed ? 1 : 0, r2(d.maxAng)]),
      l: fixtures.map(f => { const a = [f.on ? 1 : 0, f.broken ? 1 : 0, r2(f.base), r2(f.unstable || 0), f.flicker > 0 ? r2(f.flicker) : 0]; if (f.group === 'cop' || f.group === 'ghost') a.push(r2(f.pos.x), r2(f.pos.y), r2(f.pos.z)); return a; }),
      ob: this.sync.map(o => [o.visible ? 1 : 0, r3(o.position.x), r3(o.position.y), r3(o.position.z), r3(o.rotation.x), r3(o.rotation.y), r3(o.rotation.z)]),
      c: this.syncCols.map(c => [c.on ? 1 : 0, r3(c.minX), r3(c.maxX), r3(c.minZ), r3(c.maxZ)]),
      a: [r2(AMB.rain), r2(AMB.wind), r2(AMB.master)],
      lp: Object.keys(S.loops).filter(k => S.loops[k]), cl: G.clutter ? 1 : 0,
    };
  },
  applySnap(s){
    G.step = s.st; G.flags = s.f || {}; G.power = !!s.pw; G.npower = !!s.np; G.checkpoint = s.ck;
    const o = JSON.stringify(s.o); if (o !== this.lastO){ this.lastO = o; G.objectives = s.o; renderObjectives(); flashObj(); }
    const iv = JSON.stringify(s.inv); if (iv !== this.lastI){ this.lastI = iv; G.inv = s.inv || []; renderInv(); }
    (s.d || []).forEach((a, i) => { const d = doors[i]; if (!d) return; d.locked = !!a[1]; d.jammed = !!a[2]; d.maxAng = a[3]; if (d.open !== !!a[0]) setDoor(d, !!a[0], { silent: true }); else if (d.open) d.target = d.maxAng; });
    (s.l || []).forEach((a, i) => { const f = fixtures[i]; if (!f) return; f.on = !!a[0]; f.broken = !!a[1]; f.base = a[2]; f.unstable = a[3]; if (a[4] > 0 && f.flicker <= 0){ f.flicker = a[4]; f.mulT = 0; } if (a.length > 5) f.pos.set(a[5], a[6], a[7]); });
    (s.ob || []).forEach((a, i) => { const ob = this.sync[i]; if (!ob) return; ob.visible = !!a[0]; ob.position.set(a[1], a[2], a[3]); ob.rotation.set(a[4], a[5], a[6]); });
    (s.c || []).forEach((a, i) => { const c = this.syncCols[i]; if (!c) return; c.on = !!a[0]; c.minX = a[1]; c.maxX = a[2]; c.minZ = a[3]; c.maxZ = a[4]; });
    if (s.a){ AMB.rain = s.a[0]; AMB.wind = s.a[1]; AMB.master = s.a[2]; }
    this.syncLoops(s.lp || []);
    if (s.cl && !G.clutter) G.clutter = CLUTTER.map(c => Object.assign({}, c)); else if (!s.cl) G.clutter = null;
  },
  syncLoops(keys){
    const make = { washer: () => LOOPS.washer(new V3(0.45, 0.6, 11.4)), music: () => LOOPS.music(new V3(7.4, 0.8, -24.4)), drone: () => LOOPS.drone(new V3(8, 4.5, 10.5), 0.1) };
    for (const k of Object.keys(this.gl)) if (!keys.includes(k)){ if (this.gl[k]) this.gl[k].stop(k === 'music' ? 0.03 : 0.3); delete this.gl[k]; }
    for (const k of keys) if (!(k in this.gl) && make[k]) this.gl[k] = make[k]();
  },
  stopLoops(){ for (const k of Object.keys(this.gl)) if (this.gl[k]) this.gl[k].stop(0.2); this.gl = {}; },

  // ---------- events (host → guests) ----------
  applyFx(e){
    switch (e.t){
      case 's': if (typeof SND[e.n] === 'function') SND[e.n](...(e.a || []).map(des)); break;
      case 'sub': subtitle(escHtml(e.a[0]), e.a[1], e.a[2], escHtml(e.a[3] || '')); break;
      case 'fo': flashObj(); break;
      case 'fa': fade(e.a[0], e.a[1]); break;
      case 'ff': flashFx(e.a[0], e.a[1], e.a[2]); break;
      case 'la': lookAtPoint(des(e.a[0]), e.a[1]); break;
      case 'tp': this.tp(e.a); break;
      case 'ci0': this.guestCine(e.l || []); break;
      case 'ci': this.guestCineLine(e.i); break;
      case 'note':
        if (G.state === 'playing' || G.state === 'paused'){ $('pause').hidden = true; showNote(String(e.text), e.cls, () => this.send('req', { k: 'note', tok: e.tok })); }
        else this.send('req', { k: 'note', tok: e.tok });
        break;
      case 'go': gameOver(e.who === this.me().id ? null : e.who); break;
      case 'end': finalEnding(); break;
      case 'dr': { const d = doors[e.i]; if (d) setDoor(d, !!e.o, { silent: true, speed: e.sp, instant: !!e.ins, force: true }); break; }
      case 'gs': ghostShow(...e.a); break;
      case 'gh': ghostHide(); break;
      case 'bat': player.battery = Math.min(100, player.battery + (+e.v || 0)); break;
    }
  },
  tp(a){
    const [x, y, z, yaw = 0, pitch = 0] = a; const s = this.slotOf(this.me().id) % 4;
    const off = [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.8]][s];
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), bx = Math.sin(yaw), bz = Math.cos(yaw);
    setPlayer(x + rx * off[0] + bx * off[1], y, z + rz * off[0] + bz * off[1], yaw, pitch);
  },
  guestCine(lines){
    this.cl = lines; $('pause').hidden = true; $('note').hidden = true; $('cine').hidden = false; $('hud').hidden = true;
    if (G.state !== 'dead' && G.state !== 'ending') G.state = 'cine';
    $('cineText').classList.remove('on');
  },
  guestCineLine(i){
    const el = $('cineText'); el.classList.remove('on');
    if (i < 0 || !this.cl){ this.cl = null; after(0.6, () => { if (this.cl) return; $('cine').hidden = true; if (G.state === 'cine'){ $('hud').hidden = false; G.state = 'playing'; } }); return; }
    const L = this.cl[i]; if (!L) return; const lines = this.cl;
    after(0.35, () => { if (this.cl !== lines) return; el.className = L.cls === 'rule' || L.cls === 'big' ? L.cls : ''; el.innerHTML = (L.who ? '<span class="who">' + escHtml(L.who) + '</span>' : '') + escHtml(L.t); void el.offsetWidth; el.classList.add('on'); });
  },
  // guests: the monster and the ghost, driven by the host
  guestWorld(dt){
    if (GHOST.root.visible) animMonster(GHOST, dt, 0, Math.sin(G.time * 0.6) * 0.25);
    player.frozen = !!this.fz;
    const m = this.mon; if (!m || G.state === 'dead') return;
    MON.m.root.visible = !!m.v;
    if (!m.v){ if (MON.music) stopChaseMusic(); return; }
    if (Math.hypot(m.x - MON.pos.x, m.z - MON.pos.z) > 4 || Math.abs(m.y - MON.pos.y) > 2){ MON.pos.set(m.x, m.y, m.z); MON.yaw = m.yw; }
    else { const k = Math.min(1, dt * 10); MON.pos.x += (m.x - MON.pos.x) * k; MON.pos.y += (m.y - MON.pos.y) * k; MON.pos.z += (m.z - MON.pos.z) * k; let dy = m.yw - MON.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; MON.yaw += dy * k; }
    syncMon();
    if (m.mo === 'chase'){ if (!MON.music) MON.music = LOOPS.chase(); animMonster(MON.m, dt, m.sp, 0.2); updateChaseFx(Math.hypot(player.pos.x - MON.pos.x, player.pos.z - MON.pos.z), dt); }
    else { if (MON.music) stopChaseMusic(); animMonster(MON.m, dt, 0, Math.sin(G.time * 0.5) * 0.35 + 0.1); }
  },

  // ---------- lobby screen ----------
  openScreen(){ $('menu').hidden = true; $('mp').hidden = false; $('mpName').value = this.me().name; this.ui(true); },
  ui(force){
    if ($('mp').hidden && !force) return;
    const inRoom = this.status !== 'idle';
    $('mpPick').hidden = inRoom; $('mpRoom').hidden = !inRoom;
    $('mpCodeShow').textContent = this.code || '----';
    const me = this.me().id;
    $('mpList').innerHTML = this.members.slice().sort((a, b) => a.slot - b.slot).map(m => '<li style="--c:' + MP_COLORS[m.slot % 4] + '">' + escHtml(m.name || 'Player') + '<i>' + [m.id === this.hostId ? 'HOST' : '', m.id === me ? 'YOU' : ''].filter(Boolean).join(' · ') + '</i></li>').join('');
    $('mpHostBtns').hidden = !this.host;
    const cp = savedCheckpoint(); $('mpGoCont').hidden = !(cp && cp !== 'start');
    $('mpGo').disabled = $('mpGoCont').disabled = this.members.length < 2;
    let msg = this.error;
    if (!msg){
      if (this.status === 'connecting') msg = 'Connecting...';
      else if (this.status === 'connected' && this.host) msg = this.members.length < 2 ? 'Give this code to your friends. Waiting for them to join...' : this.members.length + ' players in the room. Start when everyone is here.';
      else if (this.status === 'connected') msg = this.hostId ? 'You are in. Waiting for the host to start...' : 'Looking for the room...';
    }
    $('mpMsg').textContent = msg || '';
  },
};

// ---------- hooks into the game (installed at boot) ----------
function netWrap(name, make){ const orig = window[name]; window[name] = make(orig); }
function netInit(){
  MP.collect();
  if (MP.available()) $('bMp').hidden = false;
  $('bMp').onclick = () => { audioInit(); MP.error = ''; MP.openScreen(); };
  $('mpBack').onclick = () => { MP.leave(); MP.error = ''; $('mp').hidden = true; $('menu').hidden = false; refreshContinue(); };
  $('mpName').oninput = e => { MP.setName(e.target.value); if (MP.status === 'connected'){ MP.sendHi(); if (MP.host){ const m = MP.members.find(m => m.id === MP.me().id); if (m){ m.name = MP.me().name || 'Player'; MP.sendLobby(); } } } };
  $('mpCreate').onclick = () => { MP.error = ''; MP.noRoomMsg = false; MP.open(MP.newCode(), true); };
  $('mpJoin').onclick = () => { const c = $('mpCode').value.toUpperCase().replace(/[^A-Z]/g, ''); MP.noRoomMsg = false; if (c.length !== 4){ MP.error = 'Type the 4-letter room code.'; MP.ui(); return; } MP.error = ''; MP.open(c, false); };
  $('mpCode').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $('mpJoin').click(); };
  $('mpName').onkeydown = e => e.stopPropagation();
  $('mpGo').onclick = () => { if (MP.members.length >= 2){ try { localStorage.removeItem(SAVE_KEY); } catch (e) {} MP.hostStart('start'); requestLock(); } };
  $('mpGoCont').onclick = () => { if (MP.members.length >= 2){ MP.hostStart(savedCheckpoint() || 'start'); requestLock(); } };

  // sounds: the host's game makes them, everyone hears them (footsteps and panting are made per player)
  for (const k of Object.keys(SND)){
    if (['ok', 'step', 'pant', 'pickup'].includes(k) || typeof SND[k] !== 'function') continue;
    const o = SND[k];
    SND[k] = function(...a){ const top = MP.depth === 0; MP.depth++; try { if (top && MP.bcast()) MP.q({ t: 's', n: k, a: a.map(ser) }); return o.apply(SND, a); } finally { MP.depth--; } };
  }
  netWrap('subtitle', o => (text, dur, cls, who) => { if (MP.bcast()) MP.q({ t: 'sub', a: [text, dur, cls || '', who || ''] }); return o(text, dur, cls, who); });
  netWrap('flashObj', o => () => { if (MP.bcast()) MP.q({ t: 'fo' }); return o(); });
  netWrap('fade', o => (to, dur) => { if (MP.bcast()) MP.q({ t: 'fa', a: [to, dur] }); return o(to, dur); });
  netWrap('flashFx', o => (c, d, p) => { if (MP.bcast()) MP.q({ t: 'ff', a: [c, d, p] }); return o(c, d, p); });
  netWrap('lookAtPoint', o => (p, sp) => { if (MP.bcast()) MP.q({ t: 'la', a: [ser(p), sp] }); return o(p, sp); });
  netWrap('setPlayer', o => (x, y, z, yaw, pitch) => { MP.tpN++; if (MP.bcast()) MP.q({ t: 'tp', a: [r3(x), r3(y), r3(z), r3(yaw), r3(pitch || 0)] }); return o(x, y, z, yaw, pitch); });
  netWrap('ghostShow', o => (...a) => { if (MP.bcast()) MP.q({ t: 'gs', a }); return o(...a); });
  netWrap('ghostHide', o => () => { if (MP.bcast()) MP.q({ t: 'gh' }); return o(); });
  netWrap('setDoor', o => (d, open, opt = {}) => { if (MP.bcast()){ MP.q({ t: 'dr', i: doors.indexOf(d), o: open ? 1 : 0, sp: opt.speed || 5, ins: opt.instant ? 1 : 0 }); MP.dirty = true; } return o(d, open, opt); });
  netWrap('cine', o => (lines, done) => { if (MP.bcast()){ $('pause').hidden = true; MP.q({ t: 'ci0', l: lines.map(l => ({ t: l.t, who: l.who || '', cls: l.cls || '', d: l.d })) }); } return o(lines, done); });
  netWrap('nextCine', o => () => {
    if (MP.guest && MP.started){ MP.send('req', { k: 'skip' }); return; }
    const r = o(); if (MP.bcast()) MP.q({ t: 'ci', i: cineData ? cineData.i : -1 }); return r;
  });
  netWrap('showNote', o => (text, cls, cb) => {
    if (MP.bcast() && MP.actor){ const tok = ++MP.tok; MP.notes[tok] = cb; MP.q({ t: 'note', to: MP.actor, text, cls, tok }); return; }
    return o(text, cls, cb);
  });
  netWrap('gameOver', o => who => {
    if (MP.bcast()){ MP.q({ t: 'go', who: who || MP.me().id }); MP.flush(); MP.mute = true; try { return o(who); } finally { MP.mute = false; } }
    return o(who);
  });
  netWrap('finalEnding', o => () => {
    if (MP.bcast()){ MP.q({ t: 'end' }); MP.flush(); MP.mute = true; try { return o(); } finally { MP.mute = false; } }
    return o();
  });
  netWrap('netFx', o => e => { if (MP.bcast()) MP.q(e); });
  netWrap('useInter', o => h => { if (MP.guest && MP.started){ const i = inters.indexOf(h); if (i >= 0) MP.send('use', { i }); return; } return o(h); });
  netWrap('storyUpdate', o => dt => {
    o(dt);
    if (!(MP.host && MP.started)) return;
    for (const r of MP.liveRemotes()){ if (!(G.state === 'playing' || G.state === 'cine' || G.state === 'note' || G.state === 'paused')) break; MP.withView(r, () => o(0)); }
  });
  netWrap('monViews', o => () => {
    const v = o(); if (!(MP.host && MP.started)) return v;
    for (const r of MP.liveRemotes()) v.push({ id: r.id, pos: new V3(r.tx, r.ty, r.tz), level: r.lv, feetY: r.ty, trail: r.trail, local: false });
    return v;
  });
  netWrap('restartCheckpoint', o => () => { if (MP.started){ if (MP.host) MP.hostStart(G.checkpoint); return; } return o(); });
}
