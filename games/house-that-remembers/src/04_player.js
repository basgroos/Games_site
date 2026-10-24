// =====================================================================
//  PLAYER — first-person controller, input, interaction, flashlight
// =====================================================================
const Input = { keys: {}, mdx: 0, mdy: 0, locked: false };
const P = {
  pos: new THREE.Vector3(0, 0, 24), yaw: Math.PI, pitch: 0, vy: 0, lv: 0, y: 0, eye: 1.62, crouch: false,
  stamina: 1, exhausted: false, speed: 0, stepDist: 0, lastSurface: 'grass', moving: false, stillTime: 0, walkTime: 0,
  flashOn: true, frozen: false, look: null, bob: 0, r: 0.28, outside: true, inHouse: false, sprinting: false
};

function initInput() {
  const canvas = $('gl');
  document.addEventListener('keydown', e => {
    if (e.code === 'Tab') e.preventDefault();
    if (e.repeat) return;
    Input.keys[e.code] = true;
    Game.onKey(e);
  });
  document.addEventListener('keyup', e => { Input.keys[e.code] = false; });
  document.addEventListener('mousemove', e => { if (Input.locked && (!Input.fallback || e.buttons)) { Input.mdx += e.movementX || 0; Input.mdy += e.movementY || 0; } });
  document.addEventListener('pointerlockchange', () => {
    if (Input.fallback) return;
    Input.locked = document.pointerLockElement === canvas;
    if (Input.locked) Input.everLocked = true;
    if (!Input.locked) { Input.keys = {}; Game.onUnlock(); }
    else Game.onLock();
  });
  canvas.addEventListener('click', () => { if (G.state === 'play' && !UI.modalOpen()) lockPointer(); });
  $('lockHint').addEventListener('click', () => lockPointer());
  document.addEventListener('pointerlockerror', () => { if (Input.everLocked) return; Input.fallback = true; Input.locked = true; Game.onLock(); });
  let downAt = null;
  canvas.addEventListener('mousedown', e => { downAt = [e.clientX, e.clientY]; if (Input.locked && !Input.fallback && e.button === 0 && G.state === 'play') Game.interact(); });
  canvas.addEventListener('mouseup', e => { if (Input.fallback && downAt && e.button === 0 && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 4 && G.state === 'play' && !UI.modalOpen()) Game.interact(); downAt = null; });
  window.addEventListener('blur', () => { Input.keys = {}; });
}
function lockPointer() {
  const c = $('gl');
  if (Input.fallback || !c.requestPointerLock) { Input.fallback = true; Input.locked = true; Game.onLock(); return; }
  try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
function unlockPointer() { Input.selfUnlock = performance.now(); if (Input.fallback) { Input.locked = false; return; } try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }

// body visible only in mirrors / snapshots (layer 2)
function buildPlayerBody() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: .9 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.2, .17, .7, 10), m); torso.position.y = 1.18; g.add(torso);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .82, 10), new THREE.MeshStandardMaterial({ color: 0x1b1c20 })); legs.position.y = .41; g.add(legs);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8a7562, roughness: .8 })); head.position.y = 1.66; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.125, 12, 8, 0, TAU, 0, 1.4), new THREE.MeshStandardMaterial({ color: 0x1d1712 })); hair.position.y = 1.68; g.add(hair);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .55, 6), m); arm.position.set(.22, 1.2, -.2); arm.rotation.x = -1.1; g.add(arm);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .18, 8), MAT.iron); torch.position.set(.22, 1.3, -.45); torch.rotation.x = Math.PI / 2; g.add(torch);
  g.traverse(o => { o.layers.set(2); });
  W.scene.add(g); W.body = g;
}

// rain & dust particles
function buildParticles() {
  // rain
  const N = 1400, pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = rand(-14, 14), y = rand(0, 14), z = rand(-14, 14); pos.set([x, y, z, x + .02, y - .45, z + .02], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  W.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8e9cb0, transparent: true, opacity: .32 }));
  W.rain.frustumCulled = false; W.scene.add(W.rain);
  // dust in flashlight beam (camera space cone)
  const D = 160, dp = new Float32Array(D * 3);
  for (let i = 0; i < D; i++) { const z = -rand(.5, 6), r = Math.abs(z) * .42 * Math.sqrt(Math.random()), a = rand(0, TAU); dp.set([Math.cos(a) * r, Math.sin(a) * r, z], i * 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dc = makeCanvas(32, 32), dctx = dc.getContext('2d'); const grd = dctx.createRadialGradient(16, 16, 0, 16, 16, 16); grd.addColorStop(0, 'rgba(255,240,210,1)'); grd.addColorStop(1, 'rgba(255,240,210,0)'); dctx.fillStyle = grd; dctx.fillRect(0, 0, 32, 32);
  W.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .022, map: new THREE.CanvasTexture(dc), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d0 }));
  W.dust.frustumCulled = false; G.camera.add(W.dust); W.scene.add(G.camera);
}
function updateParticles(dt) {
  if (W.rain) {
    const vis = P.outside && W.raining;
    W.rain.visible = vis || (W.raining && P.lv === 0 && P.pos.z > 2.5);
    if (W.rain.visible) {
      const a = W.rain.geometry.attributes.position, arr = a.array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= dt * 11; arr[i + 4] -= dt * 11;
        if (arr[i + 4] < 0) { const x = P.pos.x + rand(-14, 14); let z = P.pos.z + rand(-14, 14); if (z < 4.2) z = 4.2 + rand(0, 12); const y = 12 + rand(0, 3); arr[i] = x; arr[i + 1] = y; arr[i + 2] = z; arr[i + 3] = x + .02; arr[i + 4] = y - .45; arr[i + 5] = z + .02; }
      }
      a.needsUpdate = true;
    }
  }
  if (W.dust) {
    W.dust.visible = P.flashOn && !P.outside && W.flash.intensity > .5;
    if (W.dust.visible) {
      const a = W.dust.geometry.attributes.position, arr = a.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(G.time * .3 + i) * dt * .02; arr[i + 1] += (Math.cos(G.time * .23 + i * .7) * .02 - .008) * dt;
        const z = arr[i + 2], r = Math.abs(z) * .42; if (arr[i] * arr[i] + arr[i + 1] * arr[i + 1] > r * r) { arr[i] *= -.9; arr[i + 1] *= -.9; }
      }
      W.dust.rotation.z += dt * .02; a.needsUpdate = true;
    }
  }
}

// ---------------- movement ----------------
function updatePlayer(dt) {
  const cam = G.camera;
  if (Input.locked && !P.frozen) {
    const s = 0.0022 * Settings.sens;
    P.yaw -= Input.mdx * s; P.pitch -= Input.mdy * s * (Settings.invert ? -1 : 1);
    P.pitch = clamp(P.pitch, -1.45, 1.45);
  }
  Input.mdx = 0; Input.mdy = 0;
  let mx = 0, mz = 0;
  const K = Input.keys, canMove = G.state === 'play' && !P.frozen && Input.locked;
  if (canMove) {
    if (K.KeyW || K.ArrowUp) mz -= 1; if (K.KeyS || K.ArrowDown) mz += 1;
    if (K.KeyA || K.ArrowLeft) mx -= 1; if (K.KeyD || K.ArrowRight) mx += 1;
  }
  const len = Math.hypot(mx, mz); if (len > 0) { mx /= len; mz /= len; }
  const wantSprint = canMove && (K.ShiftLeft || K.ShiftRight) && mz < 0 && !P.crouch && !P.exhausted;
  P.sprinting = wantSprint && len > 0;
  if (P.sprinting) { P.stamina -= dt * .17; if (P.stamina <= 0) { P.stamina = 0; P.exhausted = true; } }
  else { P.stamina = Math.min(1, P.stamina + dt * (len > 0 ? .1 : .18)); if (P.exhausted && P.stamina > .35) P.exhausted = false; }
  const maxSpd = P.crouch ? 1.15 : P.sprinting ? 3.9 : 2.1;
  const tgt = len > 0 ? maxSpd : 0; P.speed = lerp(P.speed, tgt, 1 - Math.exp(-dt * 10));
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
  const vx = (mx * cos + mz * sin) * P.speed, vz = (-mx * sin + mz * cos) * P.speed;
  // move in substeps with collision
  const steps = Math.max(1, Math.ceil(Math.hypot(vx, vz) * dt / .08));
  const before = P.pos.clone();
  for (let i = 0; i < steps; i++) {
    P.pos.x += vx * dt / steps; P.pos.z += vz * dt / steps;
    collide(P.pos, P.r, P.lv, P.crouch);
  }
  // floor height
  const R = rampAt(P.pos.x, P.pos.z);
  let floorY;
  if (R) { floorY = rampY(R, P.pos.z); P.lv = floorY > 1.7 ? 1 : floorY < -1.7 ? -1 : 0; }
  else floorY = levelY(P.lv);
  P.y = R ? floorY : lerp(P.y, floorY, 1 - Math.exp(-dt * 20));
  const moved = Math.hypot(P.pos.x - before.x, P.pos.z - before.z);
  P.moving = moved > 0.002;
  // head bob & footsteps
  const eyeT = P.crouch ? 1.05 : 1.62; P.eye = lerp(P.eye, eyeT, 1 - Math.exp(-dt * 9));
  if (P.moving) {
    P.bob += moved * (P.sprinting ? 2.4 : 2.9); P.stepDist += moved; P.walkTime += dt; P.stillTime = 0;
    const stride = P.crouch ? .55 : P.sprinting ? .95 : .72;
    if (P.stepDist > stride) {
      P.stepDist = 0; const surf = P.outside ? (inRect(P.pos, -1.2, 1.2, 4, 28) ? 'gravel' : 'grass') : surfaceAt(P.pos.x, P.pos.z, P.lv);
      P.lastSurface = surf;
      SFX.footstep(surf, null, P.crouch ? .45 : P.sprinting ? 1.15 : .8);
      Story.onStep && Story.onStep(surf);
    }
  } else {
    if (P.walkTime > 1.5) { Story.onStop && Story.onStop(P.lastSurface); }
    P.walkTime = 0; P.stillTime += dt;
  }
  const bobAmt = P.moving ? (P.sprinting ? .045 : .028) * (P.crouch ? .6 : 1) : 0;
  const by = Math.sin(P.bob * Math.PI) * bobAmt, bx = Math.cos(P.bob * Math.PI * .5) * bobAmt * .6;
  cam.position.set(P.pos.x + bx * cos, P.y + P.eye + by + (W.camShake || 0) * rand(-.02, .02), P.pos.z - bx * sin);
  cam.rotation.set(P.pitch + (W.camShake || 0) * rand(-.004, .004), P.yaw, 0);
  if (W.forceLook) { // scripted look-at
    const fl = W.forceLook; const d = new THREE.Vector3().subVectors(fl.target, cam.position); const ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
    let dy = ty - P.yaw; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
    P.yaw += dy * (1 - Math.exp(-dt * fl.speed)); P.pitch += (tp - P.pitch) * (1 - Math.exp(-dt * fl.speed));
    fl.t -= dt; if (fl.t <= 0) W.forceLook = null;
  }
  cam.updateMatrixWorld();
  // body for reflections
  if (W.body) { W.body.position.set(P.pos.x, P.y - (P.crouch ? .5 : 0), P.pos.z); W.body.rotation.y = P.yaw; }
  // flashlight follows with slight lag
  const fl = W.flash; const fwd = camFwd();
  const off = new THREE.Vector3(.18, -.2, 0).applyQuaternion(cam.quaternion);
  fl.position.copy(cam.position).add(off);
  const tgtP = cam.position.clone().add(fwd.multiplyScalar(6));
  W.flashTarget.position.lerp(tgtP, 1 - Math.exp(-dt * 18));
  let fi = P.flashOn ? 2.6 : 0;
  if (W.flashFlicker > 0) { W.flashFlicker -= dt; if (Math.random() < .5) fi *= rand(0, .3); }
  if (W.flashDead) fi = 0;
  fl.intensity = fi;
  // stamina UI
  const st = $('stamina'); st.style.opacity = P.stamina < .98 ? 1 : 0; st.firstChild.style.width = (P.stamina * 100) + '%'; st.firstChild.style.background = P.exhausted ? 'rgba(160,80,70,.7)' : '';
  // inside / outside
  P.outside = P.lv === 0 && P.pos.z > 4.05;
}

// ---------------- interaction ----------------
const _ic = new THREE.Vector2(0, 0);
function updateInteraction() {
  P.look = null;
  if (G.state !== 'play' || UI.modalOpen() || P.frozen) { UI.prompt(null); return; }
  _ray.setFromCamera(_ic, G.camera); _ray.far = 2.4;
  const hits = _ray.intersectObjects(W.rayList, false);
  for (const h of hits) {
    if (!shown(h.object)) continue;
    const it = h.object.userData.it;
    if (it) {
      if (it.enabled && !it.enabled()) continue;
      const p = it.prompt ? it.prompt() : 'Examine';
      if (p) { P.look = it; UI.prompt(p); return; }
      continue;
    }
    break; // a wall/occluder blocks
  }
  UI.prompt(null);
}
