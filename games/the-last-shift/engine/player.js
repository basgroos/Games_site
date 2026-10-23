// First-person controller: lopen, rennen, hurken, botsingen, hoofdbeweging, voetstappen en verstoppen.
import * as THREE from 'three';

const EYE = 1.62, EYE_CROUCH = 0.95, R = 0.27;

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(3.2, 0, 16.5);
    this.yaw = -Math.PI / 2; this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.crouch = 0; this.crouching = false; this.running = false;
    this.stamina = 1; this.staminaLock = 0;
    this.bob = 0; this.stepAcc = 0; this.stepSide = 1;
    this.hidden = null; this.hideT = 0; this.hideBlend = 0;
    this.frozen = false; this.lookLock = null;
    this.speedNow = 0; this.moving = false; this.stillT = 0;
    this.breathSnd = null; this.lastYaw = this.yaw;
    this.shake = 0;
  }
  get camPos() { return this.game.camera.position; }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  look(dx, dy) {
    const s = this.game.settings.sens * 0.0022;
    this.yaw -= dx * s; this.pitch -= dy * s;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    if (this.hidden) {
      const base = this.hidden.yaw, lim = this.hidden.type === 'desk' ? 1.1 : 0.75;
      let d = Math.atan2(Math.sin(this.yaw - base), Math.cos(this.yaw - base));
      d = Math.max(-lim, Math.min(lim, d)); this.yaw = base + d;
      this.pitch = Math.max(-0.5, Math.min(0.45, this.pitch));
    }
  }
  update(dt, input) {
    const g = this.game, cam = g.camera, lvl = g.level;
    if (this.hidden) { this.updateHidden(dt); return; }
    if (this.dead) { this.vel.set(0, 0, 0); this.moving = false; return; }
    // --- input ---
    let fx = 0, fz = 0;
    if (!this.frozen) {
      if (input.key('KeyW') || input.key('ArrowUp')) fz += 1;
      if (input.key('KeyS') || input.key('ArrowDown')) fz -= 1;
      if (input.key('KeyA') || input.key('ArrowLeft')) fx -= 1;
      if (input.key('KeyD') || input.key('ArrowRight')) fx += 1;
    }
    this.crouching = !this.frozen && (input.key('ControlLeft') || input.key('ControlRight') || input.key('KeyC'));
    // niet opstaan onder iets laags
    const wantRun = (input.key('ShiftLeft') || input.key('ShiftRight')) && fz > 0 && !this.crouching;
    if (this.staminaLock > 0) this.staminaLock -= dt;
    this.running = wantRun && this.stamina > 0.02 && this.staminaLock <= 0;
    if (this.running) { this.stamina -= dt / 6.5; if (this.stamina <= 0) { this.stamina = 0; this.staminaLock = 2.5; } }
    else this.stamina = Math.min(1, this.stamina + dt / (this.moving ? 9 : 5));
    this.crouch += ((this.crouching ? 1 : 0) - this.crouch) * Math.min(1, dt * 9);

    const len = Math.hypot(fx, fz);
    const speed = this.crouching ? 1.15 : this.running ? 4.6 : 2.15;
    const f = this.forward(), r = new THREE.Vector3(-f.z, 0, f.x);
    const want = new THREE.Vector3();
    if (len > 0) want.addScaledVector(f, fz / len * speed).addScaledVector(r, fx / len * speed);
    const acc = len > 0 ? 10 : 12;
    this.vel.x += (want.x - this.vel.x) * Math.min(1, dt * acc);
    this.vel.z += (want.z - this.vel.z) * Math.min(1, dt * acc);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.collide(this.pos, R, this.crouch > 0.5 ? 1.0 : 1.7);
    this.speedNow = Math.hypot(this.vel.x, this.vel.z);
    this.moving = this.speedNow > 0.3;
    this.stillT = this.moving ? 0 : this.stillT + dt;

    // --- voetstappen ---
    if (this.moving) {
      const stride = this.crouching ? 0.62 : this.running ? 1.0 : 0.78;
      this.stepAcc += this.speedNow * dt;
      if (this.stepAcc > stride) { this.stepAcc = 0; this.footstep(); }
      this.bob += this.speedNow * dt * (this.running ? 2.35 : 2.6);
    } else { this.stepAcc = Math.min(this.stepAcc, 0.4); }

    // --- uitputting: hijgen (hoorbaar voor de vijand) ---
    if (this.stamina < 0.25 && !this.breathSnd) { this.breathSnd = g.audio.play('breath_player', { loop: true, volume: 0.35, reverb: 0.05 }); }
    if (this.stamina > 0.6 && this.breathSnd) { this.breathSnd.stop(0.8); this.breathSnd = null; }
    if (this.breathSnd && Math.random() < dt * 0.6) g.noise(this.pos, 3.5, 'player');

    // --- camera ---
    const eye = EYE + (EYE_CROUCH - EYE) * this.crouch;
    const motion = g.settings.motion;
    const amp = (this.running ? 0.05 : 0.028) * motion * Math.min(1, this.speedNow / 2);
    const by = Math.abs(Math.sin(this.bob)) * amp * 1.4 - amp * 0.7;
    const bx = Math.sin(this.bob) * amp * 0.6;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const sh = this.shake * this.shake;
    cam.position.set(this.pos.x + r.x * bx + (Math.random() - 0.5) * sh * 0.15, eye + by + (Math.random() - 0.5) * sh * 0.1, this.pos.z + r.z * bx + (Math.random() - 0.5) * sh * 0.15);
    let yaw = this.yaw, pitch = this.pitch;
    if (this.lookLock) { // gedwongen kijken (jumpscare)
      const t = this.lookLock; const d = new THREE.Vector3().subVectors(t, cam.position);
      const ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
      this.yaw += Math.atan2(Math.sin(ty - this.yaw), Math.cos(ty - this.yaw)) * Math.min(1, dt * 14);
      this.pitch += (tp - this.pitch) * Math.min(1, dt * 14);
      yaw = this.yaw; pitch = this.pitch;
    }
    cam.rotation.set(pitch + (Math.random() - 0.5) * sh * 0.05, yaw, Math.sin(this.bob) * amp * -0.35 * motion + (Math.random() - 0.5) * sh * 0.06, 'YXZ');
  }
  footstep() {
    const g = this.game, s = g.level.surfaceAt(this.pos.x, this.pos.z);
    const vol = this.crouching ? 0.16 : this.running ? 0.95 : 0.45;
    this.stepSide = -this.stepSide;
    const f = this.forward();
    const p = { x: this.pos.x + f.z * 0.15 * this.stepSide, y: 0.1, z: this.pos.z - f.x * 0.15 * this.stepSide };
    g.audio.play('step_' + s, { pos: p, volume: vol, occlude: false, ref: 1.5, reverb: 0.35, vary: 0.1 });
    const mul = { metal: 1.4, wet: 1.25, carpet: 0.6, wood: 1.1, tile: 1.15 }[s] || 1;
    const rad = (this.crouching ? 1.2 : this.running ? 13 : 4.5) * mul;
    g.noise(this.pos, rad, 'step');
    if (s === 'wood' && !this.crouching && Math.random() < 0.15) g.audio.play('floor_creak', { pos: p, volume: 0.3, occlude: false });
    g.story && g.story.onPlayerStep && g.story.onPlayerStep();
  }
  collide(p, r, height) {
    const lvl = this.game.level;
    for (let it = 0; it < 3; it++) {
      const x0 = Math.floor(p.x - r - 0.5), x1 = Math.floor(p.x + r + 0.5), z0 = Math.floor(p.z - r - 0.5), z1 = Math.floor(p.z + r + 0.5);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (lvl.isSolidCell(x, z)) pushOut(p, r, x, z, x + 1, z + 1);
      for (const c of lvl.colliders) {
        if (c.maxY < 0.3 || c.minY > height) continue;
        if (p.x + r < c.minX || p.x - r > c.maxX || p.z + r < c.minZ || p.z - r > c.maxZ) continue;
        pushOut(p, r, c.minX, c.minZ, c.maxX, c.maxZ);
      }
      for (const d of lvl.doors) { const b = d.panelAABB(); if (b && Math.abs(d.angle - d.target) < 0.01) pushOut(p, r, b.minX, b.minZ, b.maxX, b.maxZ); }
    }
  }
  // ---------- verstoppen ----------
  hide(spot) {
    const g = this.game;
    this.hidden = spot; this.hideT = 0; this.hidePrev = this.pos.clone();
    this.yaw = spot.yaw; this.pitch = spot.type === 'desk' ? -0.1 : 0;
    this.vel.set(0, 0, 0);
    if (spot.locker) { spot.locker.target = spot.locker.stall ? -1.4 : -1.8; g.audio.play(spot.locker.stall ? 'creak_2' : 'locker_open', { pos: spot.pos, volume: 0.5 }); }
    else g.audio.play('cloth', { volume: 0.6 });
    g.noise(spot.pos, 3, 'player');
    g.ui.setHidden(spot.type);
    if (g.enemy) g.enemy.onPlayerHide(spot);
  }
  updateHidden(dt) {
    const g = this.game, cam = g.camera, s = this.hidden;
    this.hideT += dt;
    if (s.locker && this.hideT > 0.45 && !s.closed) { s.closed = true; s.locker.target = 0; g.audio.play(s.locker.stall ? 'door_close' : 'locker_close', { pos: s.pos, volume: 0.45 }); }
    const k = Math.min(1, this.hideT / 0.6);
    const from = this.hidePrev || (this.hidePrev = s.pos.clone());
    const eyeFrom = EYE + (EYE_CROUCH - EYE) * this.crouch;
    cam.position.set(from.x + (s.pos.x - from.x) * k, eyeFrom + (s.pos.y - eyeFrom) * k, from.z + (s.pos.z - from.z) * k);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const sh = this.shake * this.shake;
    cam.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.05, this.yaw, (Math.random() - 0.5) * sh * 0.05, 'YXZ');
    this.pos.set(s.pos.x, 0, s.pos.z);
    this.moving = false; this.stillT += dt; this.speedNow = 0;
    this.stamina = Math.min(1, this.stamina + dt / 4);
  }
  unhide() {
    const g = this.game, s = this.hidden; if (!s || this.hideT < 0.7) return;
    s.closed = false;
    if (s.locker) { s.locker.target = s.locker.stall ? -1.4 : -1.8; g.audio.play(s.locker.stall ? 'creak_2' : 'locker_open', { pos: s.pos, volume: 0.5 }); setTimeout(() => { s.locker.target = 0; }, 900); }
    else g.audio.play('cloth', { volume: 0.6 });
    this.pos.set(s.out.x, 0, s.out.z);
    this.crouch = s.type === 'desk' ? 1 : 0;
    this.hidden = null;
    g.ui.setHidden(null);
    g.noise(this.pos, 3, 'player');
    if (g.enemy) g.enemy.onPlayerUnhide(s);
  }
}

export function pushOut(p, r, minX, minZ, maxX, maxZ) {
  const cx = Math.max(minX, Math.min(p.x, maxX)), cz = Math.max(minZ, Math.min(p.z, maxZ));
  let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
  else {
    const l = p.x - minX, rr = maxX - p.x, t = p.z - minZ, b = maxZ - p.z, m = Math.min(l, rr, t, b);
    if (m === l) p.x = minX - r; else if (m === rr) p.x = maxX + r; else if (m === t) p.z = minZ - r; else p.z = maxZ + r;
  }
  return true;
}
