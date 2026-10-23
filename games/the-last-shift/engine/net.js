// =====================================================================
//  CO-OP (2–4 spelers) via Supabase Realtime, zoals de andere Bas Games.
//  De host draait het verhaal, het monster, deuren en stroom; gasten sturen
//  hun positie en interacties en tonen de toestand van de host.
// =====================================================================
import * as THREE from 'three';

const AV_COLORS = [0x2f4a63, 0x5a3a2a, 0x3f5a35, 0x5a2e52];
const $ = (id) => document.getElementById(id);
const TOPICS = ['st', 'mon', 'ui', 'sfx', 'use', 'take', 'beat', 'throw', 'caught', 'ending', 'hello', 'noise'];

export class Net {
  constructor(game) {
    this.g = game; this.lobby = null; this.room = null; this.active = false; this.isHost = false; this.waiting = false;
    this.code = null; this.myPeer = null; this.avatars = {}; this.remotes = {}; this.mon = null;
    this.stT = 0; this.monT = 0; this.presT = 0; this.lastSt = ''; this.lastMon = ''; this.doorKnown = [];
    this.rflash = [];
  }
  // ---------------- lobby ----------------
  async init() {
    const box = $('coop'); if (!box) return;
    let lobby = null;
    try {
      const B = window.HW_BUILD;
      if (window.__fakeRoom) { lobby = await window.__fakeRoom('lobby'); this.joinFn = (n) => window.__fakeRoom(n); }
      else if (window.claude && window.claude.use) { const r = await window.claude.use('room'); if (r) { lobby = r; this.joinFn = (n) => r.join(n); } }
      if (!lobby && B && B.online && B.online.url) {
        const f = supaRooms(B.online, B.env || 'live', this.profile().id + '.' + Math.random().toString(36).slice(2, 6));
        lobby = await f.lobby(); this.joinFn = f.join;
      }
    } catch (e) { console.warn('co-op niet beschikbaar', e); lobby = null; }
    this.lobby = lobby;
    if (!lobby) { box.hidden = true; return; }
    box.hidden = false;
    $('nameIn').value = this.profile().name || '';
    lobby.onConnection((c) => { $('coopStatus').textContent = c ? 'Verbonden. Host een dienst of doe mee met een andere speler.' : 'Verbinden…'; }, () => { $('coopStatus').textContent = 'Samen spelen is hier niet beschikbaar.'; });
    lobby.onPeers(() => this.renderLobby());
    lobby.presence({ nm: this.nameIn(), host: null }).catch(() => {});
    $('btnHost').onclick = () => this.host();
    $('btnJoin').onclick = () => { const c = ($('codeIn').value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); if (c) this.joinGame(c); };
    $('codeIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('btnJoin').click(); });
    $('nameIn').addEventListener('keydown', (e) => e.stopPropagation());
    $('nameIn').addEventListener('input', () => { this.saveName(this.nameIn()); lobby.presence({ nm: this.nameIn() }).catch(() => {}); });
  }
  profile() {
    if (this._me) return this._me; let P = {};
    try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    if (!P.id) { P.id = 'ls-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) { /* geen opslag */ } }
    return (this._me = { id: String(P.id), name: String(P.name || '').trim().slice(0, 16) });
  }
  saveName(n) { let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; } P.id = this.profile().id; P.name = n; try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) { /* geen opslag */ } }
  nameIn() { return (($('nameIn').value || '').trim().replace(/[^\p{L}\p{N} '\-]/gu, '').slice(0, 16)) || 'Daan'; }
  renderLobby() {
    if (!this.lobby) return; const list = $('coopList'); list.innerHTML = '';
    const games = this.lobby.peers().filter((p) => p.presence && p.presence.host && !p.sameTab);
    if (!games.length) { list.innerHTML = '<div class="coophint">Er draait nu geen open dienst.</div>'; return; }
    for (const p of games) {
      const pr = p.presence, b = document.createElement('button');
      b.textContent = `Doe mee met ${String(pr.nm || 'iemand').slice(0, 16)} · hoofdstuk ${pr.ch || 1} · ${pr.n || 1}/4`;
      b.disabled = (pr.n || 1) >= 4;
      b.onclick = () => this.joinGame(String(pr.host).replace(/[^a-z0-9]/g, ''));
      list.appendChild(b);
    }
  }
  async connect(code) {
    this.code = code;
    const r = await this.joinFn('tls-' + code); this.room = r;
    r.on('st', (m) => { if (!m.sameTab) this.onState(m.data, m.peer); });
    r.on('mon', (m) => { if (!m.sameTab && !this.isHost) this.mon = m.data; });
    r.on('ui', (m) => { if (!m.sameTab) this.onUI(m.data); });
    r.on('sfx', (m) => { if (!m.sameTab && !this.isHost) this.onSfx(m.data); });
    r.on('use', (m) => { if (!m.sameTab && this.isHost) this.onUse(m.data, m.peer); });
    r.on('take', (m) => { if (!m.sameTab && this.isHost) this.g.withActor(m.peer, m.data, () => this.g.story.remoteTake(m.data.id)); });
    r.on('beat', (m) => { if (!m.sameTab && this.isHost) this.g.withActor(m.peer, m.data, () => this.g.story.remoteBeat(m.data)); });
    r.on('throw', (m) => { if (!m.sameTab) this.onThrow(m.data, m.peer); });
    r.on('caught', (m) => { if (!m.sameTab && m.data && m.data.to === this.myPeer) this.g.caught(this.g.enemy, false, true); });
    r.on('ending', (m) => { if (!m.sameTab && !this.isHost && m.data) this.g.story.runEnding(m.data.k); });
    r.on('noise', (m) => { if (!m.sameTab && this.isHost && m.data) this.g.noise({ x: +m.data.x, z: +m.data.z }, Math.min(18, +m.data.r || 4), m.data.k === 'bottle' ? 'bottle' : 'player'); });
    r.on('hello', (m) => { if (!m.sameTab && this.isHost) this.sendState(true); });
    r.onPeers((ch) => {
      for (const p of ch.left || []) this.drop(p.peer);
      const me = (ch.peers || []).find((p) => p.sameTab); if (me) this.myPeer = me.peer;
      if (this.isHost && (ch.joined || []).some((p) => !p.sameTab)) this.sendState(true);
      this.hud();
    });
    const me = r.peers().find((p) => p.sameTab); if (me) this.myPeer = me.peer;
    return r;
  }
  async host() {
    const code = Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'x');
    $('coopStatus').textContent = 'Dienst openen…';
    try { await this.connect(code); } catch (e) { $('coopStatus').textContent = 'Kon geen dienst openen (' + ((e && e.code) || 'fout') + ').'; return; }
    this.isHost = true; this.active = true;
    this.lobby.presence({ nm: this.nameIn(), host: code, ch: 1, n: 1 }).catch(() => {});
    this.g.launch();
  }
  async joinGame(code) {
    $('coopStatus').textContent = 'Meedoen met dienst ' + code + '…';
    this.g.prepareLaunch();
    try { await this.connect(code); } catch (e) { $('coopStatus').textContent = 'Kon niet meedoen (' + ((e && e.code) || 'fout') + ').'; return; }
    this.active = true; this.waiting = true; this.isHost = false;
    const ask = () => { if (this.waiting) this.room.emit('hello', {}).catch(() => {}); };
    ask(); this.askT = setInterval(ask, 1500);
    setTimeout(() => { if (this.waiting) { clearInterval(this.askT); this.waiting = false; this.leave(); $('coopStatus').textContent = 'Niemand antwoordde in dienst ' + code + '. Misschien is hij gesloten.'; } }, 12000);
  }
  leave() {
    if (this.room) { try { this.room.leave(); } catch (e) { /* al weg */ } }
    this.room = null; this.active = false; this.isHost = false; this.waiting = false;
    for (const k of Object.keys(this.avatars)) this.drop(k);
    if (this.lobby) this.lobby.presence({ host: null }).catch(() => {});
    const h = $('coopHud'); if (h) h.hidden = true;
  }
  emit(t, d) { if (this.room && this.active) this.room.emit(t, d).catch(() => {}); }
  // ---------------- host → gasten ----------------
  ui(k, a, to) { if (this.active && this.isHost) this.emit('ui', { k, a, to: to || null }); }
  sfx(name, o) { if (this.active && this.isHost) this.emit('sfx', { n: name, o: compactOpts(o) }); }
  sendCaught(peer) { this.emit('caught', { to: peer }); }
  sendEnding(k) { this.emit('ending', { k }); }
  onUI(d) {
    if (!d || (d.to && d.to !== this.myPeer)) return;
    const ui = this.g.ui, a = Array.isArray(d.a) ? d.a : [];
    if (d.k === 'pager') ui.pager(String(a[0] || ''), a[1] ? String(a[1]) : undefined);
    else if (d.k === 'objective') ui.objective(String(a[0] || ''), a[1]);
    else if (d.k === 'chapter') ui.chapter(a[0], String(a[1] || ''));
    else if (d.k === 'toast') ui.toast(String(a[0] || ''), a[1]);
    else if (d.k === 'subtitle') ui.subtitle(String(a[0] || ''), a[1]);
    else if (d.k === 'flash') ui.flashVignette(+a[0] || 0.5);
  }
  onSfx(d) {
    if (!d || typeof d.n !== 'string') return;
    this.g.audio.play(d.n, d.o || {});
    const pl = this.g.player;
    if (d.n === 'handle_rattle' && pl.hidden && d.o && d.o.pos && Math.hypot(d.o.pos.x - pl.pos.x, d.o.pos.z - pl.pos.z) < 1.2) { this.g.shake(0.2); this.g.ui.flashVignette(0.5); }
    if (/^(door_slam|locker_burst|bang_door_hard|sparks)$/.test(d.n) && d.o && d.o.pos && Math.hypot(d.o.pos.x - pl.pos.x, d.o.pos.z - pl.pos.z) < 8) this.g.shake(0.25);
  }
  // ---------------- gasten → host ----------------
  useRemote(def) { this.emit('use', { id: def.netId, x: +this.g.player.pos.x.toFixed(2), z: +this.g.player.pos.z.toFixed(2) }); }
  onUse(d, peer) {
    if (!d) return; const def = this.g.netDefs[d.id];
    if (!def) return;
    if (def.enabled && !def.enabled()) return;
    this.g.withActor(peer, d, () => def.use({ remote: true }));
  }
  take(id) { this.emit('take', { id, x: +this.g.player.pos.x.toFixed(2), z: +this.g.player.pos.z.toFixed(2) }); }
  beat(b, extra) { this.emit('beat', Object.assign({ b, x: +this.g.player.pos.x.toFixed(2), z: +this.g.player.pos.z.toFixed(2) }, extra || {})); }
  noise(pos, r, k) { this.emit('noise', { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), r, k }); }
  sendThrow(p, v) { this.emit('throw', { p: [p.x, p.y, p.z].map((x) => +x.toFixed(2)), v: [v.x, v.y, v.z].map((x) => +x.toFixed(2)) }); }
  onThrow(d, peer) {
    if (!d || !Array.isArray(d.p) || !Array.isArray(d.v)) return;
    if (this.isHost) { this.g.inv.remove('bottle'); this.emit('throw', d); }
    this.g.spawnBottle(new THREE.Vector3(...d.p), new THREE.Vector3(...d.v), !this.isHost);
    void peer;
  }
  // ---------------- gedeelde toestand ----------------
  sendState(force) {
    if (!this.active || !this.isHost || this.g.state === 'menu') return;
    const s = this.g.story.snapshot(); const j = JSON.stringify(s);
    if (!force && j === this.lastSt) return; this.lastSt = j;
    this.emit('st', s);
  }
  onState(st, peer) {
    if (!st || typeof st !== 'object' || this.isHost) return;
    if (this.waiting) { this.waiting = false; clearInterval(this.askT); this.hostPeer = peer; this.g.startGuest(st); return; }
    if (this.g.state === 'menu') return;
    this.g.story.applyShared(st);
  }
  // ---------------- doelwitten voor het monster (host) ----------------
  remoteTargets() {
    if (!this.room) return [];
    const out = [];
    for (const p of this.room.peers()) {
      if (p.sameTab) continue; const pr = p.presence; if (!pr || !Array.isArray(pr.p)) continue;
      let t = this.remotes[p.peer];
      if (!t) t = this.remotes[p.peer] = { id: p.peer, local: false, pos: new THREE.Vector3(), eye: new THREE.Vector3(), dir: new THREE.Vector3(), lastPos: null, acc: 0 };
      t.pos.set(+pr.p[0] || 0, 0, +pr.p[1] || 0);
      t.eye.set(t.pos.x, +pr.ey || 1.6, t.pos.z);
      const yw = +pr.yw || 0, pt = +pr.pt || 0;
      t.dir.set(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt));
      t.crouch = pr.cr ? 1 : 0; t.running = !!pr.rn; t.flash = !!pr.fl; t.stillT = 0;
      t.dead = !!pr.dead || this.g.time < (t.deadUntil || 0); // net gepakt: even niet opnieuw vangen
      t.hidden = pr.hid ? this.g.level.hideSpots.find((s) => s.id === pr.hid) || null : null;
      out.push(t);
    }
    return out;
  }
  remoteSees(p) {
    for (const t of this.remoteTargets()) {
      if (t.dead) continue;
      const dx = p.x - t.eye.x, dy = p.y - t.eye.y, dz = p.z - t.eye.z, d = Math.hypot(dx, dy, dz);
      if (d > 30) continue;
      if ((dx * t.dir.x + dy * t.dir.y + dz * t.dir.z) / Math.max(0.01, d) < 0.55) continue;
      if (this.g.level.hasLOS(t.eye.x, t.eye.z, p.x, p.z)) return true;
    }
    return false;
  }
  // hulpfuncties voor verhaal-triggers: alle spelers
  allPlayers() {
    const g = this.g, a = [{ pos: g.player.pos, eye: g.camera.position, dir: new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion), local: true }];
    if (this.active && this.isHost) for (const t of this.remoteTargets()) if (!t.dead) a.push(t);
    return a;
  }
  // ---------------- elke frame ----------------
  tick(dt) {
    if (!this.active || !this.room || this.waiting) return;
    const g = this.g, P = g.player;
    this.presT -= dt;
    if (this.presT <= 0) {
      this.presT = 0.07;
      this.room.presence({ nm: this.nameIn(), p: [+P.pos.x.toFixed(2), +P.pos.z.toFixed(2)], ey: +g.camera.position.y.toFixed(2), yw: +P.yaw.toFixed(2), pt: +P.pitch.toFixed(2), cr: P.crouch > 0.5 ? 1 : 0, rn: P.running ? 1 : 0, fl: g.flashlight.on ? 1 : 0, hid: P.hidden ? P.hidden.id : '', dead: P.dead || g.dying ? 1 : 0, col: this.colorIdx(), ch: g.story.flags.chapter || 1 }).catch(() => {});
      if (this.isHost && this.lobby) {
        const n = this.room.peers().length, ch = g.story.flags.chapter || 1;
        if (n !== this.lastN || ch !== this.lastCh) { this.lastN = n; this.lastCh = ch; this.lobby.presence({ host: this.code, ch, n, nm: this.nameIn() }).catch(() => {}); }
      }
    }
    if (this.isHost) {
      this.stT -= dt; if (this.stT <= 0) { this.stT = 0.5; this.sendState(false); }
      this.monT -= dt;
      if (this.monT <= 0) { this.monT = 0.1; const m = g.enemy.netState(), j = JSON.stringify(m); if (j !== this.lastMon || Math.random() < 0.05) { this.lastMon = j; this.emit('mon', m); } }
      this.hostSenses(dt);
    }
    this.updateAvatars(dt);
    this.hudT = (this.hudT || 0) - dt; if (this.hudT <= 0) { this.hudT = 1; this.hud(); }
  }
  // de host 'hoort' de voetstappen en ziet het verstoppen van gasten
  hostSenses(dt) {
    const g = this.g;
    for (const t of this.remoteTargets()) {
      if (t.lastPos) {
        const mv = Math.hypot(t.pos.x - t.lastPos.x, t.pos.z - t.lastPos.z);
        if (mv < 2) t.acc += mv;
        const stride = t.running ? 1.0 : t.crouch ? 0.62 : 0.78;
        if (t.acc > stride && !t.hidden) {
          t.acc = 0;
          const s = g.level.surfaceAt(t.pos.x, t.pos.z);
          const mul = { metal: 1.4, wet: 1.25, carpet: 0.6, wood: 1.1, tile: 1.15 }[s] || 1;
          g.noise(t.pos, (t.crouch ? 1.2 : t.running ? 13 : 4.5) * mul, 'player');
        }
      }
      t.lastPos = { x: t.pos.x, z: t.pos.z };
      const hid = t.hidden ? t.hidden.id : '';
      if (hid !== t.lastHid) { if (hid) g.enemy.onPlayerHide(t.hidden, t); else g.enemy.onPlayerUnhide(); t.lastHid = hid; }
    }
    void dt;
  }
  colorIdx() { const s = this.myPeer || 'x'; let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % AV_COLORS.length; }
  // ---------------- avatars van de andere spelers ----------------
  updateAvatars(dt) {
    const g = this.g, seen = {};
    if (!this.rflash.length) for (let i = 0; i < 3; i++) { const sp = new THREE.SpotLight(0xfff1dc, 0, 22, 0.42, 0.55, 1.4); g.scene.add(sp, sp.target); this.rflash.push(sp); }
    let fi = 0;
    for (const p of this.room.peers()) {
      if (p.sameTab || !p.presence || !Array.isArray(p.presence.p)) continue;
      const pr = p.presence; seen[p.peer] = true;
      let a = this.avatars[p.peer];
      if (!a) a = this.avatars[p.peer] = this.makeAvatar(String(pr.nm || 'Collega').slice(0, 16), AV_COLORS[(pr.col | 0) % AV_COLORS.length]);
      const tx = +pr.p[0] || 0, tz = +pr.p[1] || 0, k = 1 - Math.exp(-dt * 12), G = a.g;
      const ox = G.position.x, oz = G.position.z;
      if (Math.hypot(G.position.x - tx, G.position.z - tz) > 5) G.position.set(tx, 0, tz); else { G.position.x += (tx - ox) * k; G.position.z += (tz - oz) * k; }
      let dr = (+pr.yw || 0) - G.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); G.rotation.y += dr * k;
      const mv = Math.hypot(G.position.x - ox, G.position.z - oz); a.walk += mv * 3.2; a.step += mv;
      a.legL.rotation.x = Math.sin(a.walk) * 0.5 * Math.min(1, mv * 40); a.legR.rotation.x = -a.legL.rotation.x;
      a.body.position.y = pr.cr ? -0.45 : 0; a.body.rotation.x = pr.dead ? 1.3 : 0;
      G.visible = !pr.hid;
      if (a.step > 0.75 && !pr.hid) { a.step = 0; g.audio.play('step_' + g.level.surfaceAt(G.position.x, G.position.z), { pos: { x: G.position.x, y: 0.1, z: G.position.z }, volume: pr.cr ? 0.15 : pr.rn ? 0.85 : 0.45 }); }
      const sp = this.rflash[fi++];
      if (sp) {
        const on = pr.fl && !pr.dead && !pr.hid; sp.intensity = on ? 18 : 0;
        if (on) { a.torch.getWorldPosition(sp.position); const yw = +pr.yw || 0, pt = +pr.pt || 0; sp.target.position.set(sp.position.x - Math.sin(yw) * Math.cos(pt) * 6, sp.position.y + Math.sin(pt) * 6, sp.position.z - Math.cos(yw) * Math.cos(pt) * 6); }
      }
      a.label.visible = g.player.pos.distanceTo(G.position) < 14 && !pr.hid;
    }
    for (; fi < this.rflash.length; fi++) this.rflash[fi].intensity = 0;
    for (const k of Object.keys(this.avatars)) if (!seen[k]) this.drop(k);
  }
  makeAvatar(name, color) {
    const g = this.g, G = new THREE.Group(), body = new THREE.Group(); G.add(body);
    const coat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 10), coat); torso.position.y = 1.2; body.add(torso);
    const mkLeg = (x) => { const lg = new THREE.Group(); lg.position.set(x, 0.85, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.7, 4, 8), dark); m.position.y = -0.42; lg.add(m); body.add(lg); return lg; };
    const legL = mkLeg(-0.1), legR = mkLeg(0.1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8f7865, roughness: 0.8 })); head.position.y = 1.7; body.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), dark); cap.position.y = 1.8; body.add(cap);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.1), dark); peak.position.set(0, 1.78, -0.15); body.add(peak);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.45, 4, 6), coat); arm.position.set(0.24, 1.25, -0.2); arm.rotation.x = -1.1; body.add(arm);
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8), g.M.darkMetal); torch.position.set(0.24, 1.35, -0.45); torch.rotation.x = Math.PI / 2; body.add(torch);
    G.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.font = '28px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(28, 12, 200, 42); x.fillStyle = '#d9d4c7'; x.fillText(name, 128, 43);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.8 })); label.scale.set(0.8, 0.2, 1); label.position.y = 2.1; G.add(label);
    g.scene.add(G);
    return { g: G, body, legL, legR, torch, label, walk: 0, step: 0 };
  }
  drop(k) { const a = this.avatars[k]; if (a) { if (a.g.parent) a.g.parent.remove(a.g); delete this.avatars[k]; } delete this.remotes[k]; }
  hud() {
    const h = $('coopHud'); if (!h) return;
    if (!this.active || !this.room) { h.hidden = true; return; }
    const names = this.room.peers().map((p) => (p.sameTab ? 'jij' : String((p.presence && p.presence.nm) || '…').slice(0, 16)));
    h.hidden = false; h.textContent = `Samen · code ${this.code} · ${names.join(', ')}`;
  }
}
function compactOpts(o) {
  if (!o) return {};
  const r = {};
  for (const k of ['volume', 'rate', 'reverb', 'ref', 'rolloff', 'bus', 'loop', 'occlude']) if (o[k] !== undefined) r[k] = o[k];
  const p = o.pos || (o.follow && o.follow.position);
  if (p) r.pos = { x: +(+p.x).toFixed(2), y: +(+p.y).toFixed(2), z: +(+p.z).toFixed(2) };
  return r;
}

// ---------- Supabase Realtime-kamers (Bas Games-site), dezelfde aanroepen als de artifact-room ----------
const SUPA_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
function supaRooms(cfg, env, meId) {
  let rtP = null;
  const client = () => rtP || (rtP = new Promise((res, rej) => { if (window.supabase) return res(); const s = document.createElement('script'); s.src = SUPA_LIB; s.onload = res; s.onerror = () => rej(new Error('Kon de online-bibliotheek niet laden.')); document.head.appendChild(s); })
    .then(() => window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } })));
  const open = async (name, topics) => { const rt = await client(); return supaRoom(rt.channel(name, { config: { broadcast: { self: false, ack: false } } }), meId, topics); };
  return { lobby: () => open('bg-tls-' + env + '-lobby', []), join: (n) => open('bg-tls-' + env + '-' + n, TOPICS) };
}
function supaRoom(ch, meId, topics) {
  const H = {}, PL = [], CL = [], peers = new Map(); let my = {}, conn = false, presT = 0, pend = null, fireQ = null;
  const snap = () => { const a = [{ peer: meId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: my, updatedAt: Date.now() }]; peers.forEach((v, k) => a.push({ peer: k, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: v.p, updatedAt: v.t })); return a; };
  let S = snap();
  const fire = (joined = [], left = []) => { S = snap(); PL.forEach((f) => { try { f({ peers: S, joined, left, updated: [] }); } catch (e) { console.error(e); } }); };
  const seen = (id, p) => { if (!id || id === meId) return; const fresh = !peers.has(id); peers.set(id, { p: p && typeof p === 'object' ? p : {}, t: Date.now() }); if (fresh) { fire([{ peer: id, presence: p || {}, sameTab: false }]); setTimeout(flush, 50); } else { S = snap(); if (!fireQ) fireQ = setTimeout(() => { fireQ = null; fire(); }, 150); } };
  const drop = (id) => { if (peers.delete(id)) fire([], [{ peer: id }]); };
  ch.on('broadcast', { event: '_p' }, ({ payload }) => { if (payload) seen(payload.from, payload.pr); });
  ch.on('broadcast', { event: '_bye' }, ({ payload }) => { if (payload) drop(payload.from); });
  topics.forEach((t) => ch.on('broadcast', { event: t }, ({ payload }) => { if (!payload || payload.from === meId) return; (H[t] || []).forEach((f) => f({ topic: t, data: payload.d, peer: payload.from, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false })); }));
  // Geen Supabase-presence (track): Supabase sluit clients af die dat te vaak doen (ClientPresenceRateLimitReached).
  // Wie er is volgt uit deze broadcast-hartslagen, '_bye' en een timeout.
  const flush = () => { if (!conn) return; ch.send({ type: 'broadcast', event: '_p', payload: { from: meId, pr: my } }).catch(() => {}); };
  const beat = setInterval(() => { flush(); const now = Date.now(); peers.forEach((v, k) => { if (now - v.t > 12000) drop(k); }); }, 2000);
  ch.subscribe((st) => { const c = st === 'SUBSCRIBED'; if (c !== conn) { conn = c; CL.forEach((f) => f(c)); } if (c) flush(); });
  return {
    emit: async (t, d) => { if (conn) ch.send({ type: 'broadcast', event: t, payload: { from: meId, d } }).catch(() => {}); },
    on: (t, f) => { (H[t] = H[t] || []).push(f); return () => {}; },
    presence: async (patch) => { my = Object.assign({}, my, patch); for (const k in patch) if (patch[k] === null) delete my[k]; S = snap(); const now = Date.now(); if (now - presT > 95 * Math.max(1, peers.size)) { presT = now; flush(); } else if (!pend) pend = setTimeout(() => { pend = null; presT = Date.now(); flush(); }, 100); },
    peers: () => S,
    onPeers: (f) => { PL.push(f); setTimeout(() => f({ peers: S, joined: S, left: [], updated: [] }), 0); return () => {}; },
    connected: () => conn,
    onConnection: (f) => { CL.push(f); setTimeout(() => f(conn), 0); return () => {}; },
    leave: async () => { clearInterval(beat); try { if (conn) ch.send({ type: 'broadcast', event: '_bye', payload: { from: meId } }).catch(() => {}); await ch.unsubscribe(); } catch (e) { /* al weg */ } },
  };
}
