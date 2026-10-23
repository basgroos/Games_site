// De entiteit: procedureel model, animatie en AI (patrouille, onderzoek, jacht, zoeken, verdwijnen).
import * as THREE from 'three';
import { faceMat } from './textures.js';
import { pushOut } from './player.js';

const CATCH_DIST = 1.0;

export class Enemy {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    this.buildModel();
    game.scene.add(this.root);
    this.pos = this.root.position;
    this.yaw = 0;
    this.mode = 'inactive';
    this.path = null; this.pathI = 0; this.speed = 0; this.curSpeed = 0;
    this.phase = 0; this.lastStepPhase = 0;
    this.suspicion = 0; this.lastKnown = new THREE.Vector3(); this.lastSeenT = -99;
    this.timer = 0; this.sub = null; this.wait = 0;
    this.sawHide = null; this.inspectSpot = null;
    this.breath = null; this.cooldown = 0; this.shriekCD = 0;
    this.scriptCb = null; this.perceive = true; this.chaseSpeed = 3.85;
    this.relocateCD = 10; this.nodes = [];
    this.headLook = 0; this.twitchT = 0; this.pose = 'walk';
    this.encounterT = 0;
    this.root.visible = false;
    this.ccOnly = false;
  }
  buildModel() {
    const skin = faceMat();
    const skinPlain = new THREE.MeshStandardMaterial({ color: 0x544e47, roughness: 0.7 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 0.95 });
    const cloth2 = new THREE.MeshStandardMaterial({ color: 0x1d222b, roughness: 0.95 });
    const cap = (r, l, m) => { const g = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m); g.castShadow = true; return g; };
    const P = this.parts = {};
    const hips = P.hips = new THREE.Group(); hips.position.y = 1.0; this.root.add(hips);
    const torso = P.torso = new THREE.Group(); hips.add(torso);
    const chest = cap(0.16, 0.42, cloth); chest.position.y = 0.33; chest.scale.set(1.15, 1, 0.75); torso.add(chest);
    const pelvis = cap(0.14, 0.12, cloth2); pelvis.position.y = 0.02; pelvis.scale.set(1.1, 1, 0.8); torso.add(pelvis);
    const neck = cap(0.045, 0.2, skinPlain); neck.position.y = 0.7; torso.add(neck);
    const head = P.head = new THREE.Group(); head.position.y = 0.84; torso.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 18), skin); skull.scale.set(0.92, 1.25, 1.0); skull.position.y = 0.06; skull.castShadow = true; head.add(skull);
    const jaw = P.jaw = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skinPlain); jaw.position.set(0, -0.02, 0.02); jaw.scale.set(1, 1.3, 1); head.add(jaw);
    // oogglans (alleen zichtbaar in zaklamplicht door hoge reflectie)
    this.eyes = [];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); e.position.set(s * 0.04, 0.09, 0.112); head.add(e); this.eyes.push(e); }
    // haar: plukken
    for (let i = 0; i < 14; i++) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22 + Math.random() * 0.2, 0.01), cloth); const a = Math.random() * Math.PI - Math.PI / 2 + Math.PI; h.position.set(Math.sin(a) * 0.1, 0.0, Math.cos(a) * 0.1 - 0.02); h.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3); head.add(h); }
    const arm = (s) => {
      const sh = new THREE.Group(); sh.position.set(s * 0.24, 0.6, 0); torso.add(sh);
      const up = cap(0.055, 0.36, cloth); up.position.y = -0.22; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.46; sh.add(el);
      const fo = cap(0.045, 0.4, skinPlain); fo.position.y = -0.24; el.add(fo);
      const hand = new THREE.Group(); hand.position.y = -0.5; el.add(hand);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.03), skinPlain); palm.position.y = -0.04; hand.add(palm);
      for (let f = 0; f < 4; f++) { const fi = cap(0.009, 0.13, skinPlain); fi.position.set(-0.025 + f * 0.017, -0.16, 0); fi.rotation.x = 0.2; hand.add(fi); }
      return { sh, el, hand };
    };
    P.armL = arm(-1); P.armR = arm(1);
    const leg = (s) => {
      const hp = new THREE.Group(); hp.position.set(s * 0.1, 0, 0); hips.add(hp);
      const th = cap(0.075, 0.38, cloth2); th.position.y = -0.24; hp.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.49; hp.add(kn);
      const sh = cap(0.06, 0.38, cloth2); sh.position.y = -0.23; kn.add(sh);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.6 })); ft.position.set(0, -0.48, 0.05); ft.castShadow = true; kn.add(ft);
      return { hp, kn };
    };
    P.legL = leg(-1); P.legR = leg(1);
    this.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  // --------------------------------------------------------------------------
  setNodes(nodes) { this.nodes = nodes; }
  place(x, z, yaw = 0) { this.pos.set(x, 0, z); this.yaw = yaw; this.root.rotation.y = yaw; this.path = null; }
  setMode(m) {
    const prev = this.mode; this.mode = m; this.timer = 0; this.sub = null; this.wait = 0;
    this.root.visible = m !== 'inactive';
    if (m === 'inactive') { this.path = null; this.stopBreath(); }
    if (m === 'chase' && prev !== 'chase') this.onChaseStart();
    if (m === 'patrol') this.path = null;
  }
  activate(x, z) { if (x !== undefined) this.place(x, z); this.perceive = true; this.setMode('patrol'); }
  deactivate() { this.setMode('inactive'); }
  scriptGoto(points, speed, cb, perceive = false) {
    this.mode = 'scripted'; this.root.visible = true; this.perceive = perceive;
    this.path = points.map((p) => new THREE.Vector3(p[0], 0, p[1])); this.pathI = 0; this.speed = speed; this.scriptCb = cb;
  }
  scriptIdle(perceive = false) { this.mode = 'scripted'; this.root.visible = true; this.path = null; this.speed = 0; this.perceive = perceive; }

  get head() { return new THREE.Vector3(this.pos.x, 1.8, this.pos.z); }
  // Alle spelers die het monster kan waarnemen (lokaal + co-op-gasten, zie Game.targets)
  targets() { return this.game.targets(); }
  nearest() { let best = null, bd = 1e9; for (const t of this.targets()) { const d = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z); if (d < bd) { bd = d; best = t; } } return best; }
  distTo(t) { return t ? Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) : 1e9; }
  distToPlayer() { return this.distTo(this.nearest()); }
  distToLocal() { const p = this.game.player.pos; return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  targetById(id) { return this.targets().find((t) => t.id === id) || null; }

  // ---------------- zintuigen ----------------
  canSeePlayer() {
    let best = null, bd = 1e9;
    for (const t of this.targets()) { if (this.canSee(t)) { const d = this.distTo(t); if (d < bd) { bd = d; best = t; } } }
    return best;
  }
  canSee(t) {
    const g = this.game, pl = t;
    if (pl.hidden || pl.dead) return false;
    const d = this.distTo(t);
    const cam = t.eye;
    const dx = cam.x - this.pos.x, dz = cam.z - this.pos.z;
    const fwd = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
    const cos = (dx * fwd.x + dz * fwd.z) / Math.max(0.01, Math.hypot(dx, dz));
    const fovCos = this.mode === 'chase' || this.mode === 'search' ? Math.cos(1.4) : Math.cos(0.95);
    if (d > 1.7 && cos < fovCos) return false;
    let range = 6.5;
    if (t.flash) range = 17; else if (g.lights.anyPowerAt(pl.pos.x, pl.pos.z)) range = 12;
    if (pl.crouch > 0.5) range *= 0.55;
    if (pl.running) range += 3;
    if (this.mode === 'chase') range = Math.max(range, 14);
    if (d > range) return false;
    return g.level.hasLOS(this.pos.x, this.pos.z, cam.x, cam.z);
  }
  // schijnt deze speler (standaard: de lokale) met de zaklamp op het monster?
  litByFlashlight(t) {
    const g = this.game; t = t || g.localTarget();
    if (!t || !t.flash) return false;
    const cam = t.eye, d = this.distTo(t); if (d > 16) return false;
    const to = new THREE.Vector3(this.pos.x - cam.x, 1.3 - cam.y, this.pos.z - cam.z).normalize();
    const dir = t.dir;
    return to.dot(dir) > 0.93 && g.level.hasLOS(cam.x, cam.z, this.pos.x, this.pos.z);
  }
  hear(pos, radius, kind) {
    if (this.mode === 'inactive' || this.mode === 'scripted' && !this.perceive) return;
    if (this.mode === 'chase') return;
    const d = Math.hypot(pos.x - this.pos.x, pos.z - this.pos.z);
    if (d > radius * 1.5) return;
    const occ = this.game.level.occlusion(this.pos.x, this.pos.z, pos.x, pos.z, 'audio');
    const eff = radius * Math.pow(0.6, occ);
    if (d > eff) return;
    if (this.mode === 'scripted') { this.setMode('investigate'); }
    if (kind === 'player' && d < eff * 0.45) this.suspicion = Math.min(0.95, this.suspicion + 0.35);
    this.investigate(pos, kind === 'bottle' ? 2.2 : 1.7);
  }
  investigate(pos, speed = 1.7) {
    if (this.mode === 'chase') return;
    this.mode = 'investigate'; this.root.visible = true; this.timer = 0; this.sub = 'go';
    this.target = new THREE.Vector3(pos.x, 0, pos.z); this.speed = speed;
    this.path = this.game.level.findPath(this.pos.x, this.pos.z, pos.x, pos.z); this.pathI = 0;
  }
  onPlayerHide(spot, t) { if (this.game.isGuest()) return; t = t || this.game.localTarget(); if (this.mode !== 'inactive' && this.root.visible && t && this.canSeePlayerRaw(t)) this.sawHide = spot.id; }
  onPlayerUnhide() { if (this.game.isGuest()) return; if (!this.targets().some((t) => t.hidden && t.hidden.id === this.sawHide)) this.sawHide = null; }
  canSeePlayerRaw(t) { // tijdens het verstoppen: zag de vijand het?
    const cam = t.eye, d = this.distTo(t);
    if (d > 14) return false;
    const dx = cam.x - this.pos.x, dz = cam.z - this.pos.z;
    const cos = (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / Math.max(0.01, Math.hypot(dx, dz));
    return (cos > Math.cos(1.2) || d < 2) && this.game.level.hasLOS(this.pos.x, this.pos.z, cam.x, cam.z);
  }
  onChaseStart() {
    const g = this.game;
    this.encounterT = g.time;
    if (this.shriekCD <= 0) { g.sfx('shriek', { pos: this.head, volume: 0.9 }); this.shriekCD = 25; g.audio.play('stinger', { volume: 0.5 }); }
    g.ui.flashVignette(0.6);
    g.story && g.story.onChase && g.story.onChase();
  }
  // ---------------- update ----------------
  update(dt) {
    const g = this.game;
    this.shriekCD -= dt; this.relocateCD -= dt;
    if (this.mode === 'inactive') return;

    // waarneming
    if (this.perceive) {
      const pl = this.canSeePlayer();
      if (pl) {
        const d = this.distTo(pl);
        this.lastKnown.set(pl.pos.x, 0, pl.pos.z); this.lastSeenT = g.time;
        if (this.mode !== 'chase') this.chaseId = pl.id;
        const rate = this.mode === 'search' || this.mode === 'investigate' ? 2.2 : 1.2;
        this.suspicion += dt * rate * (1.3 - Math.min(1, d / 15)) * (pl.running ? 1.6 : 1);
        if (this.litByFlashlight(pl)) this.suspicion += dt * 2.5;
      } else this.suspicion = Math.max(0, this.suspicion - dt * 0.15);
      if (this.mode !== 'chase' && this.suspicion >= 1) { this.setMode('chase'); }
      else if (pl && this.mode === 'patrol' && this.suspicion > 0.35) this.investigate(pl.pos, 1.6);
      else if (pl && this.mode === 'scripted' && this.suspicion > 0.3) this.investigate(pl.pos, 1.6);
      // licht dat uit een verstopplek lekt
      for (const t of this.targets()) if (t.hidden && t.flash && this.distTo(t) < 3.2 && this.mode !== 'chase' && this.mode !== 'inspect') { this.sawHide = t.hidden.id; this.suspicion = 1; this.startInspect(t.hidden); break; }
    }

    // gedrag
    switch (this.mode) {
      case 'scripted': this.followPath(dt); if (!this.path && this.scriptCb) { const cb = this.scriptCb; this.scriptCb = null; cb(); } break;
      case 'patrol': this.patrol(dt); break;
      case 'investigate': this.doInvestigate(dt); break;
      case 'chase': this.chase(dt); break;
      case 'search': this.search(dt); break;
      case 'inspect': this.doInspect(dt); break;
      case 'retreat': this.retreat(dt); break;
    }
    // vangen
    if (this.mode === 'chase' || this.mode === 'search' || this.mode === 'investigate') {
      for (const t of this.targets()) if (!t.hidden && !t.dead && this.distTo(t) < CATCH_DIST && g.level.hasLOS(this.pos.x, this.pos.z, t.pos.x, t.pos.z)) { this.catchTarget(t); break; }
    }

    this.animate(dt);
    this.sounds(dt, this.distToLocal());
  }
  catchTarget(t, fromHide = false) {
    const g = this.game;
    if (t.local) { g.caught(this, fromHide); return; }
    // een co-op-gast: zijn eigen scherm toont de jumpscare, het monster trekt zich terug
    g.net.sendCaught(t.id);
    t.dead = true; t.deadUntil = g.time + 5;
    this.sawHide = null; this.suspicion = 0; this.setMode('retreat'); g.director.relief(20);
  }
  // ---------- co-op: gasten tonen een kopie van het monster van de host ----------
  puppetUpdate(dt, m) {
    const g = this.game;
    if (m && !this.puppetHold) {
      const vis = !!m.v;
      if (vis && !this.root.visible) this.pos.set(m.x, 0, m.z);
      this.root.visible = vis; this.mode = vis ? (m.md || 'patrol') : 'inactive';
      const k = 1 - Math.exp(-dt * 10);
      if (Math.hypot(m.x - this.pos.x, m.z - this.pos.z) > 4) this.pos.set(m.x, 0, m.z);
      else { this.pos.x += (m.x - this.pos.x) * k; this.pos.z += (m.z - this.pos.z) * k; }
      let dy = (m.yw || 0) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * k;
      this.curSpeed += ((m.sp || 0) - this.curSpeed) * k; this.pose = m.ps || 'walk'; this.silent = !!m.sl;
      if (m.md === 'chase' && this.prevNetMode !== 'chase') { if (this.shriekCD <= 0 && this.root.visible) { g.audio.play('shriek', { pos: this.head, volume: 0.9 }); this.shriekCD = 25; } g.ui.flashVignette(0.5); }
      this.prevNetMode = m.md;
    }
    this.shriekCD -= dt;
    if (!this.root.visible) { this.stopBreath(); return; }
    if (this.mode === 'chase' && Math.random() < dt * 0.8) g.lights.flickerNear(this.pos.x, this.pos.z, 6, 0.4);
    this.animate(dt);
    this.sounds(dt, this.distToLocal());
  }
  netState() { return { v: this.root.visible ? 1 : 0, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), yw: +this.yaw.toFixed(2), sp: +this.curSpeed.toFixed(2), md: this.mode, ps: this.pose, sl: this.silent ? 1 : 0 }; }
  pickNode(near) {
    const g = this.game, p = (this.nearest() || g.localTarget() || { pos: g.player.pos }).pos;
    let best = null;
    for (let tries = 0; tries < 30; tries++) {
      const n = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      const dp = Math.hypot(n.x - p.x, n.z - p.z);
      if (near && (dp < 4 || dp > 14)) continue;
      if (Math.hypot(n.x - this.pos.x, n.z - this.pos.z) < 4) continue;
      if (!g.level.findPath(this.pos.x, this.pos.z, n.x, n.z)) continue;
      best = n; break;
    }
    return best || this.nodes[Math.floor(Math.random() * this.nodes.length)];
  }
  patrol(dt) {
    const g = this.game;
    if (this.wait > 0) { this.wait -= dt; this.curSpeed = 0; this.lookAround(dt); return; }
    if (!this.path) {
      const sinceEnc = g.time - this.encounterT;
      const near = g.director.reliefT > 0 ? Math.random() < 0.15 : (g.director.pressure > 0.3 || sinceEnc > 40 ? Math.random() < 0.8 : Math.random() < 0.4);
      const n = this.pickNode(near);
      this.path = g.level.findPath(this.pos.x, this.pos.z, n.x, n.z); this.pathI = 0; this.speed = 1.3;
      if (!this.path) { this.wait = 1; return; }
    }
    this.followPath(dt);
    if (!this.path) { this.wait = 1.5 + Math.random() * 3.5; this.headLook = 0; }
    // stilstaan en luisteren als de speler stilstaat
    const d = this.distToPlayer();
    if (this.distToLocal() < 14 && g.player.stillT > 0.5 && g.player.stillT < 0.6 && Math.random() < 0.5) { this.wait = 2.5 + Math.random() * 3; }
    // verdwijnen wanneer een speler dichtbij komt en het niet ziet
    if (d < 7 && this.relocateCD <= 0 && !g.isVisibleToAny(this.head) && Math.random() < dt * 0.6) this.relocate(18);
  }
  relocate(minDist = 18) {
    const g = this.game, ts = this.targets(), p = (ts[0] || { pos: g.player.pos }).pos;
    for (let i = 0; i < 40; i++) {
      const n = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      if (ts.some((t) => Math.hypot(n.x - t.pos.x, n.z - t.pos.z) < minDist)) continue;
      if (g.isVisibleToAny(new THREE.Vector3(n.x, 1.5, n.z))) continue;
      if (!g.level.findPath(n.x, n.z, p.x, p.z)) continue; // nooit in een afgesloten ruimte
      this.place(n.x, n.z, Math.random() * 6.28); this.path = null; this.wait = 2 + Math.random() * 3; this.relocateCD = 25;
      return true;
    }
    return false;
  }
  doInvestigate(dt) {
    if (this.sub === 'go') {
      this.followPath(dt);
      if (!this.path) { this.sub = 'look'; this.timer = 3 + Math.random() * 2.5; this.game.story?.onEnemyInvestigate?.(); }
    } else if (this.sub === 'look') {
      this.curSpeed = 0; this.lookAround(dt); this.timer -= dt;
      if (this.timer <= 0) {
        const spot = this.nearbyHide(4.5);
        if (spot && Math.random() < 0.55) this.startInspect(spot);
        else { this.mode = 'patrol'; this.path = null; this.wait = 1; }
      }
    }
  }
  nearbyHide(r) {
    const c = this.game.level.hideSpots.filter((s) => Math.hypot(s.out.x - this.pos.x, s.out.z - this.pos.z) < r);
    if (this.sawHide) { const s = c.find((x) => x.id === this.sawHide) || this.game.level.hideSpots.find((x) => x.id === this.sawHide); if (s) return s; }
    return c[Math.floor(Math.random() * c.length)] || null;
  }
  startInspect(spot) {
    this.mode = 'inspect'; this.inspectSpot = spot; this.sub = 'go'; this.timer = 0;
    this.path = this.game.level.findPath(this.pos.x, this.pos.z, spot.out.x, spot.out.z); this.pathI = 0; this.speed = 1.4;
  }
  doInspect(dt) {
    const g = this.game, s = this.inspectSpot;
    if (this.sub === 'go') {
      this.followPath(dt);
      if (!this.path) { this.sub = 'rattle'; this.timer = 0; }
    } else if (this.sub === 'rattle') {
      this.curSpeed = 0;
      const ty = Math.atan2(s.pos.x - this.pos.x, s.pos.z - this.pos.z);
      this.yaw += Math.atan2(Math.sin(ty - this.yaw), Math.cos(ty - this.yaw)) * Math.min(1, dt * 4);
      if (this.timer === 0) {
        if (s.type !== 'desk') g.sfx('handle_rattle', { pos: { x: s.pos.x, y: 1.1, z: s.pos.z }, volume: 0.9, occlude: false });
        else g.sfx('breath_enemy', { pos: { x: s.pos.x, y: 0.8, z: s.pos.z }, volume: 0.9 });
        if (g.player.hidden === s) { g.shake(0.15); g.ui.flashVignette(0.5); }
      }
      this.timer += dt;
      const inside = this.targets().find((t) => t.hidden && t.hidden.id === s.id);
      const found = this.sawHide === s.id && inside;
      if (this.timer > (found ? 2.2 : 3.8)) {
        if (found) { if (s.locker) s.locker.target = s.locker.stall ? -1.4 : -1.8; this.catchTarget(inside, true); return; }
        this.sawHide = null; this.mode = 'patrol'; this.path = null; this.wait = 0.5;
        g.story?.onHideSurvived?.(s);
      }
    }
  }
  chase(dt) {
    const g = this.game;
    this.speed = this.chaseSpeed;
    const seen = this.canSeePlayer();
    if (seen) this.chaseId = seen.id;
    const pl = this.targetById(this.chaseId) || this.nearest();
    if (!pl) { this.mode = 'search'; this.timer = 0; this.sub = null; return; }
    const d = this.distTo(pl), sees = seen === pl;
    if (sees) { this.lastKnown.set(pl.pos.x, 0, pl.pos.z); this.lastSeenT = g.time; }
    if (pl.hidden && !this.sawHide) { // speler is ongezien verdwenen
      if (g.time - this.lastSeenT > 0.4) { this.mode = 'search'; this.timer = 0; this.sub = null; return; }
    }
    if (pl.hidden && this.sawHide) { this.startInspect(pl.hidden); this.speed = 2.6; return; }
    const lostFor = g.time - this.lastSeenT;
    if (lostFor > 4) { this.mode = 'search'; this.timer = 0; this.sub = null; return; }
    // direct op de speler af als er zicht is, anders via pad
    if (sees && d < 8) {
      this.path = [new THREE.Vector3(pl.pos.x, 0, pl.pos.z)]; this.pathI = 0;
    } else {
      this.repath = (this.repath || 0) - dt;
      if (this.repath <= 0 || !this.path) { this.repath = 0.4; this.path = g.level.findPath(this.pos.x, this.pos.z, this.lastKnown.x, this.lastKnown.z); this.pathI = 0; }
    }
    this.followPath(dt);
    if (Math.random() < dt * 0.8) g.lights.flickerNear(this.pos.x, this.pos.z, 6, 0.4);
  }
  search(dt) {
    const g = this.game;
    this.timer += dt;
    if (!this.sub) { this.sub = 'go'; this.path = g.level.findPath(this.pos.x, this.pos.z, this.lastKnown.x, this.lastKnown.z); this.pathI = 0; this.speed = 2.0; this.searchN = 0; }
    if (this.sub === 'go') { this.followPath(dt); if (!this.path) { this.sub = 'look'; this.wait = 2.5; } }
    else if (this.sub === 'look') {
      this.curSpeed = 0; this.lookAround(dt); this.wait -= dt;
      if (this.wait <= 0) {
        this.searchN++;
        const spot = this.nearbyHide(6);
        if (spot && (this.sawHide || Math.random() < 0.6) && this.searchN < 4) { this.startInspect(spot); return; }
        if (this.searchN > 3 || this.timer > 22) { this.mode = 'retreat'; this.timer = 0; this.path = null; return; }
        const a = Math.random() * 6.28, r = 3 + Math.random() * 4;
        this.path = g.level.findPath(this.pos.x, this.pos.z, this.lastKnown.x + Math.cos(a) * r, this.lastKnown.z + Math.sin(a) * r); this.pathI = 0; this.sub = 'go'; this.speed = 1.6;
      }
    }
  }
  retreat(dt) {
    const g = this.game;
    if (!this.path) { const n = this.pickNode(false); this.path = g.level.findPath(this.pos.x, this.pos.z, n.x, n.z); this.pathI = 0; this.speed = 1.4; if (!this.path) { this.mode = 'patrol'; return; } }
    this.followPath(dt); this.timer += dt;
    if (!this.path && g.isVisibleToAny(this.head)) { const n = this.pickNode(false); this.path = g.level.findPath(this.pos.x, this.pos.z, n.x, n.z); this.pathI = 0; }
    if (this.timer > 25) { this.mode = 'patrol'; this.path = null; g.director.relief(15); return; }
    if ((!this.path || this.timer > 8) && !g.isVisibleToAny(this.head)) {
      if (this.distToPlayer() > 10) { this.relocate(22); }
      g.director.relief(18 + Math.random() * 15);
      this.mode = 'patrol'; this.path = null; this.wait = 4;
    }
  }
  lookAround(dt) {
    this.headLook += dt;
    this.yaw += Math.sin(this.headLook * 0.9) * dt * 0.8;
  }
  followPath(dt) {
    const g = this.game, lvl = g.level;
    if (!this.path || this.pathI >= this.path.length) { this.path = null; this.curSpeed = Math.max(0, this.curSpeed - dt * 4); return; }
    if (this.doorWait > 0) { this.doorWait -= dt; this.curSpeed = 0; return; }
    let tgt = this.path[this.pathI];
    // deur op het pad?
    const cx = Math.floor(tgt.x), cz = Math.floor(tgt.z);
    const door = lvl.doorAt[cx + ',' + cz];
    if (door && door.blocking && Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z) < 1.4) {
      if (door.locked) { this.path = null; return; }
      door.toggle(this.mode === 'chase' ? 'fast' : 'normal', { pos: this.pos });
      this.doorWait = this.mode === 'chase' ? 0.25 : 0.7; return;
    }
    // padverkorting: verder kijken als er vrije zichtlijn is
    while (this.pathI < this.path.length - 1 && this.mode !== 'scripted') {
      const n = this.path[this.pathI + 1];
      if (lvl.hasLOS(this.pos.x, this.pos.z, n.x, n.z) && !lvl.doorAt[Math.floor(n.x) + ',' + Math.floor(n.z)] && !lvl.doorAt[cx + ',' + cz] && Math.hypot(n.x - this.pos.x, n.z - this.pos.z) < 4) { this.pathI++; tgt = n; } else break;
    }
    const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 0.25) { this.pathI++; this.stuckT = 0; return; }
    // anti-vastlopen: geen voortgang -> volgend punt of opnieuw plannen
    this.stuckT = (this.stuckT || 0) + dt;
    if (this.stuckT > 1.2) {
      this.stuckT = 0;
      if (!this._sp || this._sp.distanceTo(this.pos) < 0.3) {
        const end = this.path[this.path.length - 1];
        const np = lvl.findPath(this.pos.x, this.pos.z, end.x, end.z);
        if (np && np.length > 1) { this.path = np; this.pathI = 1; } else if (this.pathI < this.path.length - 1) this.pathI++; else { this.path = null; return; }
        this.pos.x += (Math.floor(this.pos.x) + 0.5 - this.pos.x) * 0.5; this.pos.z += (Math.floor(this.pos.z) + 0.5 - this.pos.z) * 0.5;
      }
      this._sp = (this._sp || new THREE.Vector3()).copy(this.pos);
    }
    const ty = Math.atan2(dx, dz);
    const dyaw = Math.atan2(Math.sin(ty - this.yaw), Math.cos(ty - this.yaw));
    this.yaw += dyaw * Math.min(1, dt * (this.mode === 'chase' ? 9 : 5));
    const facing = Math.abs(dyaw) < 1.2 ? 1 : 0.3;
    this.curSpeed += (this.speed * facing - this.curSpeed) * Math.min(1, dt * 4);
    const st = Math.min(dist, this.curSpeed * dt);
    this.pos.x += Math.sin(this.yaw) * st; this.pos.z += Math.cos(this.yaw) * st;
    // botsing met muren
    for (let it = 0; it < 2; it++) {
      for (let z = Math.floor(this.pos.z) - 1; z <= Math.floor(this.pos.z) + 1; z++) for (let x = Math.floor(this.pos.x) - 1; x <= Math.floor(this.pos.x) + 1; x++) if (lvl.isSolidCell(x, z)) pushOut(this.pos, 0.25, x, z, x + 1, z + 1);
    }
  }
  // ---------------- animatie ----------------
  animate(dt) {
    const P = this.parts, sp = this.curSpeed, run = sp > 2.5;
    this.root.rotation.y = this.yaw;
    this.phase += dt * (sp > 0.05 ? (run ? 7.5 + sp * 0.5 : 2.6 + sp * 2.2) : 0);
    const amp = Math.min(1, sp / 1.4) * (run ? 1.2 : 0.75);
    const s = Math.sin(this.phase);
    P.legL.hp.rotation.x = s * 0.55 * amp; P.legR.hp.rotation.x = -s * 0.55 * amp;
    P.legL.kn.rotation.x = Math.max(0, -Math.cos(this.phase)) * 0.9 * amp + 0.05; P.legR.kn.rotation.x = Math.max(0, Math.cos(this.phase)) * 0.9 * amp + 0.05;
    P.hips.position.y = 0.98 - Math.abs(Math.cos(this.phase)) * 0.04 * amp - (run ? 0.06 : 0);
    P.torso.rotation.x = run ? 0.38 : 0.12 + 0.03 * Math.sin(this.game.time * 1.3);
    // armen: slap hangend, bij rennen grijpend naar voren
    const armSwing = run ? 0.9 : 0.18;
    P.armL.sh.rotation.x = -s * armSwing * amp - (run ? 0.6 : 0); P.armR.sh.rotation.x = s * armSwing * amp - (run ? 0.6 : 0);
    P.armL.sh.rotation.z = -0.08; P.armR.sh.rotation.z = 0.08;
    P.armL.el.rotation.x = run ? -0.6 : -0.12; P.armR.el.rotation.x = run ? -0.6 : -0.12;
    if (this.pose === 'reach') { P.armL.sh.rotation.x = P.armR.sh.rotation.x = -1.4; P.armL.el.rotation.x = P.armR.el.rotation.x = -0.2; P.armL.sh.rotation.z = -0.35; P.armR.sh.rotation.z = 0.35; }
    // hoofd: scheef, met schokjes
    this.twitchT -= dt;
    if (this.twitchT <= 0) { this.twitchT = 0.4 + Math.random() * 2.5; this.twitchTarget = (Math.random() - 0.5) * 0.9; this.twitchSnap = Math.random() < 0.4; }
    const k = this.twitchSnap ? Math.min(1, dt * 30) : Math.min(1, dt * 3);
    P.head.rotation.z += ((0.28 + (this.twitchTarget || 0) * 0.3) - P.head.rotation.z) * k;
    P.head.rotation.y += (((this.mode === 'search' || this.mode === 'investigate' || this.wait > 0) ? Math.sin(this.game.time * 1.7) * 0.8 : (this.twitchTarget || 0) * 0.3) - P.head.rotation.y) * k;
    P.head.rotation.x = run ? -0.35 : 0.1;
    P.jaw.position.y = this.pose === 'scream' ? -0.09 : -0.02 - (this.mode === 'chase' ? 0.025 : 0);
    // oogglans in zaklamplicht
    const lit = this.game.flashlight.on && this.litByFlashlight();
    for (const e of this.eyes) e.material.color.setScalar(lit ? 0.85 : 0.0);
  }
  // ---------------- geluid ----------------
  sounds(dt, d) {
    const g = this.game, sp = this.curSpeed;
    if (!this.root.visible || this.silent) { this.stopBreath(); return; }
    // voetstappen op fase-nuldoorgangen
    const half = Math.floor(this.phase / Math.PI);
    if (half !== this.lastStepPhase) {
      this.lastStepPhase = half;
      if (sp > 0.3 && d < 40) {
        const s = g.level.surfaceAt(this.pos.x, this.pos.z);
        g.audio.play('estep_' + s, { pos: { x: this.pos.x, y: 0.1, z: this.pos.z }, volume: sp > 2.5 ? 1.3 : 0.95, ref: 2.0, rolloff: 1.0, reverb: 0.6, vary: 0.12 });
        if (sp < 2 && Math.random() < 0.15) g.audio.play('drag', { pos: { x: this.pos.x, y: 0.2, z: this.pos.z }, volume: 0.25, ref: 1.5 });
      }
    }
    // ademhaling dichtbij
    if (d < 9 && !this.breath) this.breath = g.audio.play('breath_enemy', { follow: { position: this._hp || (this._hp = new THREE.Vector3()) }, loop: true, volume: 0.75, ref: 0.9, rolloff: 1.8 });
    if (this._hp) this._hp.set(this.pos.x, 1.75, this.pos.z);
    if (d > 11 && this.breath) this.stopBreath();
    // fluisteren / grommen tijdens zoeken
    if ((this.mode === 'search' || this.mode === 'investigate') && Math.random() < dt * 0.12) g.audio.play('whisper', { pos: this.head, volume: 0.5 });
    if (d < 8 && g.flashlight.on && Math.random() < dt * 2) g.flashlight.glitch(0.08);
  }
  stopBreath() { if (this.breath) { this.breath.stop(0.6); this.breath = null; } }
}

// "Regisseur": houdt spanning bij en zorgt voor rustmomenten
export class Director {
  constructor(game) { this.game = game; this.pressure = 0; this.reliefT = 0; }
  relief(t) { this.reliefT = t; }
  update(dt) {
    const e = this.game.enemy;
    if (this.reliefT > 0) { this.reliefT -= dt; this.pressure = Math.max(0, this.pressure - dt * 0.05); }
    else this.pressure = Math.min(1, this.pressure + dt * 0.012);
    if (e.mode === 'chase') this.pressure = 0;
    // in rustfase blijft de vijand op afstand
    if (this.reliefT > 0 && e.mode === 'patrol' && e.distToPlayer() < 12 && !this.game.isVisibleToAny(e.head) && Math.random() < dt * 0.3) e.relocate(20);
  }
}
