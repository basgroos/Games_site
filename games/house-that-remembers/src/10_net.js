// =====================================================================
//  CO-OP — the page's built-in realtime room: lobby, avatars, shared house
// =====================================================================
const AV_COLORS = [0x6a3a2a, 0x2c4a5e, 0x4d5a2a, 0x5a2e52, 0x7a6a3a, 0x3a3a6a];
const Net = {
  lobby: null, game: null, active: false, code: null, isHost: false, waiting: false,
  avatars: {}, doorKnown: {}, clock: 0, lastSnap: '', snapT: 0, presT: 0, beatsSeen: new Set(), myPeer: null,
  async init() {
    const box = $('coop');
    this.lobby = null; this.joinFn = null;
    try {
      if (window.__fakeRoom) { this.lobby = await window.__fakeRoom('lobby'); this.joinFn = n => window.__fakeRoom(n); }
      else if (window.claude && window.claude.use) { const r = await window.claude.use('room'); if (r) { this.lobby = r; this.joinFn = n => r.join(n); } }
      if (!this.lobby && window.HW_BUILD && window.HW_BUILD.online && window.HW_BUILD.online.url) { const f = supaRooms(window.HW_BUILD.online, window.HW_BUILD.env || 'live', this.profile().id + '.' + Math.random().toString(36).slice(2, 6)); this.lobby = await f.lobby(); this.joinFn = f.join; }
    } catch (e) { console.warn('co-op unavailable', e); this.lobby = null; }
    if (!this.lobby) { box.hidden = true; return; }
    box.hidden = false;
    this.lobby.onConnection(c => { $('coopStatus').textContent = c ? 'Connected. Host a house, or join one below.' : 'Connecting…'; }, () => { $('coopStatus').textContent = 'Co-op is not available for you on this page.'; });
    this.lobby.onPeers(() => this.renderLobby());
    this.lobby.presence({ nm: this.nameIn(), host: null }).catch(() => {});
    $('btnHost').onclick = () => this.host();
    $('btnJoin').onclick = () => { const c = ($('codeIn').value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); if (c) this.joinGame(c); };
    $('codeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('btnJoin').click(); });
    $('nameIn').addEventListener('input', () => this.lobby && this.lobby.presence({ nm: this.nameIn() }).catch(() => {}));
  },
  profile() {
    if (this._me) return this._me; let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    if (!P.id) { P.id = 'th-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) {} }
    return (this._me = { id: String(P.id), name: String(P.name || '').trim().slice(0, 16) });
  },
  saveName(n) { if (!window.HW_BUILD) return; let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; } P.id = this.profile().id; P.name = n; try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) {} },
  nameIn() { return (($('nameIn').value || '').trim().replace(/[^\p{L}\p{N} '\-]/gu, '').slice(0, 16)) || 'Sam'; },
  renderLobby() {
    if (!this.lobby) return; const list = $('coopList'); list.innerHTML = '';
    const games = this.lobby.peers().filter(p => p.presence && p.presence.host && !p.sameTab);
    if (!games.length) { list.innerHTML = '<div class="hint" style="margin:0">No open houses right now.</div>'; return; }
    games.forEach(p => {
      const b = document.createElement('button'); const pr = p.presence;
      b.textContent = `Join ${String(pr.nm || 'someone').slice(0, 16)}'s house · Ch. ${ROMAN[pr.ch] || 'I'} · ${pr.n || 1} inside`;
      b.onclick = () => this.joinGame(String(pr.host).replace(/[^a-z0-9]/g, '')); list.appendChild(b);
    });
  },
  async connectGame(code) {
    this.code = code; const g = await this.joinFn('thtr-' + code); this.game = g;
    g.on('st', m => { if (!m.sameTab) this.onState(m.data, m.peer); });
    g.on('beat', m => { if (!m.sameTab) this.onBeat(m.data); });
    g.on('mon', m => { if (!m.sameTab) Chase.onNet(m.data); });
    g.on('chase', m => { if (!m.sameTab) this.onChase(m.data, m.peer); });
    g.on('hello', m => { if (!m.sameTab && !this.waiting) this.sendState(true); });
    g.onPeers(ch => {
      ch.left.forEach(p => this.dropAvatar(p.peer));
      if (ch.joined.some(p => !p.sameTab) && !this.waiting && this.active) this.sendState(true);
      const me = ch.peers.find(p => p.sameTab); if (me) this.myPeer = me.peer;
      this.hud();
    });
    return g;
  },
  async host() {
    const code = Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'x');
    try { await this.connectGame(code); } catch (e) { $('coopStatus').textContent = 'Could not open a co-op house (' + (e && e.code || 'error') + ').'; return; }
    this.isHost = true; this.active = true;
    this.lobby.presence({ nm: this.nameIn(), host: code, ch: 1, n: 1 }).catch(() => {});
    Game.newGame(this.nameIn());
  },
  async joinGame(code) {
    $('coopStatus').textContent = 'Joining house ' + code + '…';
    try { await this.connectGame(code); } catch (e) { $('coopStatus').textContent = 'Could not join (' + (e && e.code || 'error') + ').'; return; }
    this.active = true; this.waiting = true; this.isHost = false;
    const ask = () => { if (this.waiting) { this.game.emit('hello', {}).catch(() => {}); } };
    ask(); this.askT = setInterval(ask, 1500);
    setTimeout(() => { if (this.waiting) { clearInterval(this.askT); this.waiting = false; this.leave(); $('coopStatus').textContent = 'Nobody answered in house ' + code + '. It may be closed.'; } }, 12000);
  },
  leave() {
    if (this.game) { try { this.game.leave(); } catch (e) {} } this.game = null; this.active = false; this.isHost = false; this.waiting = false;
    Object.keys(this.avatars).forEach(k => this.dropAvatar(k));
    if (this.lobby) this.lobby.presence({ host: null }).catch(() => {});
    $('coopHud').hidden = true;
  },
  emit(topic, data) { if (this.game && this.active) this.game.emit(topic, data).catch(() => {}); },
  beat(b, data) { if (!this.active) return; const id = b + ':' + Date.now() + ':' + Math.random().toString(36).slice(2, 6); this.beatsSeen.add(b); this.emit('beat', Object.assign({ b, id }, data || {})); },
  onBeat(d) {
    if (!d || !Story.S || !W || this.beatsSeen.has(d.b)) return; this.beatsSeen.add(d.b);
    const S = Story;
    if (d.b === 'ch3end') S.endChapter3(true);
    else if (d.b === 'boxSolved') { if (!SF().boxSolved) S.boxSolved(true); }
    else if (d.b === 'pedSolved') { if (!SF().pedSolved) S.pedSolved(true); }
    else if (d.b === 'tape') { if (!SF().tapePlaying && !SF().tapeDone) S.playTape(true); }
    else if (d.b === 'ending' && /^[ABC]$/.test(d.w)) { if (!SF().endingChosen) { UI.closeAll(); S['ending' + d.w](true); } }
  },
  onChase(d, peer) {
    if (!d || !CHASES[d.id]) return;
    if (d.act === 'start') {
      if (Chase.active && Chase.cfg.id === d.id && Chase.owner && this.myPeer && peer < this.myPeer) { Chase.owner = false; Chase.lastMon = performance.now(); }
      else if (!Chase.active && !SF()['chase' + d.id]) Chase.start(CHASES[d.id], { remote: true });
    } else if (d.act === 'end' && Chase.active && !Chase.owner) Chase.end(true);
  },
  // ---------- shared state ----------
  snapshot() {
    const S = Story.S, f = {};
    for (const k in S.flags) if (!/(T|CD|Look)$/.test(k)) f[k] = S.flags[k];
    const d = {}; for (const k in W.doors) { const D = W.doors[k]; d[k] = [D.open ? 1 : 0, D.locked ? 1 : 0, D.missing ? 1 : 0, D.netT || 0]; }
    return { nm: S.name, ch: S.ch, f, inv: S.inv, iv: S.invV || 0, mem: S.mem, d, ped: W.pedestals.map(p => p.item), pv: S.pedV || 0, ps: [W.portraitStage.dining, W.portraitStage.hall] };
  },
  sendState(force) {
    if (!this.active || this.waiting || !Story.S || !W || G.state !== 'play') return;
    const s = this.snapshot(); const j = JSON.stringify(s);
    if (!force && j === this.lastSnap) return; this.lastSnap = j;
    if (j.length > 3900) { delete s.mem; }
    this.emit('st', s);
  },
  onState(st, peer) {
    if (!st || typeof st !== 'object') return;
    if (this.waiting) { this.waiting = false; clearInterval(this.askT); Game.joinFromState(st, peer); return; }
    if (!Story.S || !W || G.state !== 'play') return;
    const S = Story.S;
    // flags: true wins, numbers take the larger
    for (const k in (st.f || {})) { const rv = st.f[k], lv = S.flags[k]; if (lv === undefined) S.flags[k] = rv; else if (typeof rv === 'boolean' || typeof lv === 'boolean') S.flags[k] = !!(lv || rv); else if (typeof rv === 'number' && typeof lv === 'number') S.flags[k] = Math.max(lv, rv); }
    // team inventory
    if (Array.isArray(st.inv) && (st.iv > (S.invV || 0) || (st.iv === (S.invV || 0) && this.myPeer && peer < this.myPeer && JSON.stringify(st.inv) !== JSON.stringify(S.inv)))) {
      const added = st.inv.filter(i => ITEMS[i] && !S.inv.includes(i)); S.inv = st.inv.filter(i => ITEMS[i]); S.invV = st.iv;
      added.forEach(i => UI.notify(`${String(st.nm || 'They').slice(0, 16)} found: ${ITEMS[i].name}`));
    }
    for (const k in (st.mem || {})) if (MEMS[k] && !S.mem[k]) { S.mem[k] = true; UI.notify(`${String(st.nm || 'They').slice(0, 16)} found a memory`); }
    // doors (lamport clock)
    for (const k in (st.d || {})) {
      const D = W.doors[k], v = st.d[k]; if (!D || !Array.isArray(v)) continue; this.clock = Math.max(this.clock, v[3] || 0);
      if ((v[3] || 0) > (D.netT || 0)) { D.netT = v[3]; if (v[2] && !D.missing) D.setMissing(); D.locked = !!v[1]; if (!!v[0] !== D.open && !D.missing) { D.setOpen(!!v[0], 3); if (v[0]) SFX.doorOpen(D.pos()); else SFX.doorClose(D.pos()); } this.doorKnown[k] = v.slice(0, 3).join(); }
    }
    // pedestals
    if (Array.isArray(st.ped) && st.pv > (S.pedV || 0)) { S.pedV = st.pv; st.ped.forEach((id, i) => { const p = W.pedestals[i]; if (!p || p.item === id) return; if (p.mesh) { p.holder.remove(p.mesh); p.mesh = null; } p.item = null; if (id && ITEMS[id]) Story.placeOnPedestal(i, id, true); }); }
    if (Array.isArray(st.ps)) { if (st.ps[0] > W.portraitStage.dining) Story.setPortrait('dining', st.ps[0]); if (st.ps[1] > W.portraitStage.hall) Story.setPortrait('hall', st.ps[1]); }
    if (st.ch > S.ch && st.ch <= 7) this.catchUp(st.ch, peer);
    this.applyWorld();
  },
  applyWorld() {
    const f = SF(), o = W.obj;
    if (f.gotFrontKey) o.frontKey.visible = false;
    if (f.gotPhotoA) o.photoA.visible = false; if (f.gotPhotoC) o.photoC.visible = false;
    if (f.cabOpen && o.cabDoor.visible) { o.cabDoor.visible = false; o.cabSlotPics.forEach((p, i) => { p.material.map = texFrom(Story.puzzlePhotos()[[1, 0, 2][i]], false); p.material.needsUpdate = true; p.visible = true; }); }
    if (f.gotLetter) o.cabLetter.visible = false;
    if (f.paintingDown && !o.gMessage.visible) { o.gPainting.g.visible = false; o.gMessage.visible = true; }
    if (f.medOpened) o.medDoorPivot.rotation.y = -1.6;
    if (f.chairMoved && o.armchair.position.x !== 6.9) { o.armchair.position.set(6.9, 0, 1.6); o.armchair.rotation.y = -1.25 + Math.PI; const c = o.armCol; c.x1 = 6.5; c.x2 = 7.3; c.z1 = 1.2; c.z2 = 2.0; }
    if (f.clockTicking && !W.clockEm) Story.startClock();
    if (f.wardOpen && o.wardCol.on) Story.openWardrobe(true);
    if (f.boxTaken) o.musicBox.visible = false; if (f.diaryTaken) o.diary.visible = false;
    if (f.panelOpen && o.backPanelCol.on && CH() < 7) { o.backPanel.position.y = BY - 2.15; o.backPanelCol.on = false; }
  },
  catchUp(ch, peer) {
    const pp = this.peerPos(peer); const room = Story.getRoom();
    const needTp = P.outside || (ch === 6 && P.lv === 1) || (ch === 7 && room !== 'memory');
    Story.setupChapter(ch); this.applyWorld();
    if (needTp && pp) { UI.fade(1, .4); Story.after(.6, () => { P.pos.set(pp.x + .7, 0, pp.z + .4); P.lv = pp.lv; P.y = levelY(pp.lv); P.outside = P.lv === 0 && P.pos.z > 4.05; UI.fade(0, 1.2); UI.sub('', '[the house pulls you after them]', 3); }); }
    Story.startChapter(ch, true);
  },
  // ---------- presence & avatars ----------
  peerPos(peer) { if (!this.game) return null; const p = this.game.peers().find(q => q.peer === peer); const pr = p && p.presence; if (!pr || !Array.isArray(pr.p)) return null; return { x: +pr.p[0] || 0, z: +pr.p[2] || 0, lv: [-1, 0, 1].includes(pr.lv) ? pr.lv : 0 }; },
  presenceNow() { this.presT = 0; },
  remoteTargets(lv) {
    if (!this.active || !this.game) return [];
    return this.game.peers().filter(p => !p.sameTab && p.presence && Array.isArray(p.presence.p) && p.presence.lv === lv && !p.presence.dead && !p.presence.sf).map(p => ({ id: p.peer, x: +p.presence.p[0], z: +p.presence.p[2] }));
  },
  tick(dt) {
    if (!this.active || !this.game || this.waiting || !W) return;
    // local door changes get a lamport stamp
    for (const k in W.doors) { const D = W.doors[k]; const key = [D.open ? 1 : 0, D.locked ? 1 : 0, D.missing ? 1 : 0].join(); if (this.doorKnown[k] === undefined) this.doorKnown[k] = key; else if (this.doorKnown[k] !== key) { this.doorKnown[k] = key; D.netT = ++this.clock; } }
    this.presT -= dt;
    if (this.presT <= 0) {
      this.presT = .066;
      this.game.presence({ nm: Story.S.name, p: [+P.pos.x.toFixed(2), +P.y.toFixed(2), +P.pos.z.toFixed(2)], yw: +P.yaw.toFixed(2), pt: +P.pitch.toFixed(2), lv: P.lv, fl: P.flashOn ? 1 : 0, cr: P.crouch ? 1 : 0, ch: Story.S.ch, dead: P.dead ? 1 : 0, sf: Chase.localSafe ? 1 : 0, col: this.colorIdx() }).catch(() => {});
      if (this.isHost && this.lobby) { const n = this.game.peers().length; if (n !== this.lastN || Story.S.ch !== this.lastCh) { this.lastN = n; this.lastCh = Story.S.ch; this.lobby.presence({ host: this.code, ch: Story.S.ch, n, nm: Story.S.name }).catch(() => {}); } }
    }
    this.snapT -= dt; if (this.snapT <= 0) { this.snapT = .4; this.sendState(false); }
    this.updateAvatars(dt);
    this.hudT = (this.hudT || 0) - dt; if (this.hudT <= 0) { this.hudT = 1; this.hud(); }
  },
  colorIdx() { const s = this.myPeer || 'x'; let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % AV_COLORS.length; },
  updateAvatars(dt) {
    const seen = {}; let fi = 0;
    this.game.peers().forEach(p => {
      if (p.sameTab || !p.presence || !Array.isArray(p.presence.p)) return; const pr = p.presence; seen[p.peer] = true;
      let a = this.avatars[p.peer]; if (!a) a = this.avatars[p.peer] = this.makeAvatar(String(pr.nm || 'Someone').slice(0, 16), AV_COLORS[(pr.col | 0) % AV_COLORS.length]);
      const tx = +pr.p[0] || 0, ty = +pr.p[1] || 0, tz = +pr.p[2] || 0;
      const g = a.g; const k = 1 - Math.exp(-dt * 12); const ox = g.position.x, oz = g.position.z;
      if (g.position.distanceTo(V3(tx, ty, tz)) > 6) g.position.set(tx, ty, tz); else g.position.lerp(V3(tx, ty, tz), k);
      let dr = (+pr.yw || 0) - g.rotation.y; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; g.rotation.y += dr * k;
      const mv = Math.hypot(g.position.x - ox, g.position.z - oz); a.walk += mv * 3.2; a.step += mv;
      a.legL.rotation.x = Math.sin(a.walk) * .5 * Math.min(1, mv * 40); a.legR.rotation.x = -a.legL.rotation.x;
      a.body.position.y = pr.cr ? -.45 : 0; a.body.rotation.x = pr.dead ? 1.3 : 0;
      if (a.step > .72) { a.step = 0; const lv = [-1, 0, 1].includes(pr.lv) ? pr.lv : 0; SFX.footstep(surfaceAt(g.position.x, g.position.z, lv), g.position.clone().setY(ty + .1), .7); }
      // their torch
      const sp = W.rflash && W.rflash[fi++];
      if (sp) { const on = pr.fl && !pr.dead; sp.intensity = on ? 2.2 : 0; if (on) { a.torch.getWorldPosition(sp.position); const yaw = +pr.yw || 0, pit = +pr.pt || 0; sp.target.position.set(sp.position.x - Math.sin(yaw) * Math.cos(pit) * 6, sp.position.y + Math.sin(pit) * 6, sp.position.z - Math.cos(yaw) * Math.cos(pit) * 6); } }
      a.label.visible = P.pos.distanceTo(g.position) < 14;
    });
    for (; W.rflash && fi < W.rflash.length; fi++) W.rflash[fi].intensity = 0;
    Object.keys(this.avatars).forEach(k => { if (!seen[k]) this.dropAvatar(k); });
  },
  makeAvatar(name, color) {
    const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
    const coat = new THREE.MeshStandardMaterial({ color, roughness: .9 }); const dark = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: .9 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(.21, .19, .75, 10), coat); torso.position.y = 1.18; body.add(torso);
    const mkLeg = x => { const lg = new THREE.Group(); lg.position.set(x, .82, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .06, .82, 8), dark); m.position.y = -.41; lg.add(m); body.add(lg); return lg; };
    const legL = mkLeg(-.09), legR = mkLeg(.09);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9a826a, roughness: .8 })); head.position.y = 1.68; body.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.127, 12, 8, 0, TAU, 0, 1.4), new THREE.MeshStandardMaterial({ color: 0x1d1712 })); hair.position.y = 1.7; body.add(hair);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .55, 6), coat); arm.position.set(.24, 1.22, -.2); arm.rotation.x = -1.1; body.add(arm);
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .18, 8), MAT.iron); torch.position.set(.24, 1.32, -.45); torch.rotation.x = Math.PI / 2; body.add(torch);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.026, 10), new THREE.MeshBasicMaterial({ color: 0xfff2d0 })); lens.position.set(.24, 1.32, -.545); lens.rotation.y = Math.PI; body.add(lens);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const c = makeCanvas(256, 64), x = c.getContext('2d'); x.font = '30px "IM Fell English", Georgia, serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(28, 12, 200, 42); x.fillStyle = '#e8e0cc'; x.fillText(name, 128, 44);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: .8 })); label.scale.set(.8, .2, 1); label.position.y = 2.05; g.add(label);
    W.scene.add(g);
    return { g, body, legL, legR, torch, label, walk: 0, step: 0 };
  },
  dropAvatar(k) { const a = this.avatars[k]; if (!a) return; if (W && a.g.parent) a.g.parent.remove(a.g); delete this.avatars[k]; },
  hud() {
    const h = $('coopHud'); if (!this.active || !this.game) { h.hidden = true; return; }
    const names = this.game.peers().map(p => (p.sameTab ? 'you' : String((p.presence && p.presence.nm) || '…').slice(0, 16)));
    h.hidden = false; h.textContent = `Co-op · house code ${this.code} · ${names.join(', ')}`;
  },
};

// ---------- Supabase Realtime rooms (Bas Games site), same calls as the artifact room ----------
const SUPA_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
function supaRooms(cfg, env, meId) {
  let rtP = null;
  const client = () => rtP || (rtP = new Promise((res, rej) => { if (window.supabase) return res(); const s = document.createElement('script'); s.src = SUPA_LIB; s.onload = res; s.onerror = () => rej(new Error('Could not load the online library.')); document.head.appendChild(s); })
    .then(() => window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } })));
  const open = async (name, topics) => { const rt = await client(); return supaRoom(rt.channel(name, { config: { broadcast: { self: false, ack: false } } }), meId, topics); };
  return { lobby: () => open('bg-thtr-' + env + '-lobby', []), join: n => open('bg-thtr-' + env + '-' + n, ['st', 'beat', 'mon', 'chase', 'hello']) };
}
function supaRoom(ch, meId, topics) {
  const H = {}, PL = [], CL = [], peers = new Map(); let my = {}, conn = false, presT = 0, pend = null, fireQ = null;
  const snap = () => { const a = [{ peer: meId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: my, updatedAt: Date.now() }]; peers.forEach((v, k) => a.push({ peer: k, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: v.p, updatedAt: v.t })); return a; };
  let S = snap();
  const fire = (joined = [], left = []) => { S = snap(); PL.forEach(f => { try { f({ peers: S, joined, left, updated: [] }); } catch (e) { console.error(e); } }); };
  const seen = (id, p) => { if (!id || id === meId) return; const fresh = !peers.has(id); peers.set(id, { p: p && typeof p === 'object' ? p : {}, t: Date.now() }); if (fresh) { fire([{ peer: id, presence: p || {}, sameTab: false }]); setTimeout(flush, 50); } else { S = snap(); if (!fireQ) fireQ = setTimeout(() => { fireQ = null; fire(); }, 150); } };
  const drop = id => { if (peers.delete(id)) fire([], [{ peer: id }]); };
  ch.on('broadcast', { event: '_p' }, ({ payload }) => { if (payload) seen(payload.from, payload.pr); });
  ch.on('broadcast', { event: '_bye' }, ({ payload }) => { if (payload) drop(payload.from); });
  topics.forEach(t => ch.on('broadcast', { event: t }, ({ payload }) => { if (!payload || payload.from === meId) return; (H[t] || []).forEach(f => f({ topic: t, data: payload.d, peer: payload.from, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false })); }));
  // No Supabase presence (track) at all: Supabase cuts off clients that update presence too often
  // (ClientPresenceRateLimitReached). Who is here comes from these broadcast heartbeats, '_bye' and a timeout.
  const flush = () => { if (!conn) return; ch.send({ type: 'broadcast', event: '_p', payload: { from: meId, pr: my } }).catch(() => {}); };
  const beat = setInterval(() => { flush(); const now = Date.now(); peers.forEach((v, k) => { if (now - v.t > 12000) drop(k); }); }, 2000);
  ch.subscribe(st => { const c = st === 'SUBSCRIBED'; if (c !== conn) { conn = c; CL.forEach(f => f(c)); } if (c) flush(); });
  return {
    emit: async (t, d) => { if (conn) ch.send({ type: 'broadcast', event: t, payload: { from: meId, d } }).catch(() => {}); },
    on: (t, f) => { (H[t] = H[t] || []).push(f); return () => {}; },
    presence: async patch => { my = Object.assign({}, my, patch); for (const k in patch) if (patch[k] === null) delete my[k]; S = snap(); const now = Date.now(); if (now - presT > 95 * Math.max(1, peers.size)) { presT = now; flush(); } else if (!pend) pend = setTimeout(() => { pend = null; presT = Date.now(); flush(); }, 100); },
    peers: () => S,
    onPeers: f => { PL.push(f); setTimeout(() => f({ peers: S, joined: S, left: [], updated: [] }), 0); return () => {}; },
    connected: () => conn,
    onConnection: f => { CL.push(f); setTimeout(() => f(conn), 0); return () => {}; },
    leave: async () => { clearInterval(beat); try { if (conn) ch.send({ type: 'broadcast', event: '_bye', payload: { from: meId } }).catch(() => {}); await ch.unsubscribe(); } catch (e) {} },
  };
}
