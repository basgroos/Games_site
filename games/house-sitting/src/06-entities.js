// ================= ENTITIES: the tall thing, people, monster AI =================
function buildMonster(dim = 1){
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const skin = std({ color: 0xb9b2a4, roughness: 0.55, emissive: 0x16140f, emissiveIntensity: dim });
  const dark = std({ color: 0x0b0a0a, roughness: 0.95 }); const limb = std({ color: 0x1b1816, roughness: 0.8 });
  const hollow = std({ color: 0x020202, roughness: 1 });
  const P = {};
  const cyl = (rt, rb, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8), mat); m.castShadow = true; return m; };
  const mkLeg = sx => { const hip = new THREE.Group(); hip.position.set(sx * 0.1, 1.5, 0); body.add(hip);
    const th = cyl(0.045, 0.034, 0.8, limb); th.position.y = -0.4; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.8; hip.add(knee);
    const sh = cyl(0.034, 0.024, 0.72, limb); sh.position.y = -0.36; knee.add(sh);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.26), limb); ft.position.set(0, -0.72, 0.07); knee.add(ft);
    return { hip, knee }; };
  P.lL = mkLeg(-1); P.lR = mkLeg(1);
  const torso = new THREE.Group(); torso.position.y = 1.5; body.add(torso); P.torso = torso;
  const t = cyl(0.17, 0.1, 0.95, dark); t.position.y = 0.47; t.scale.z = 0.55; torso.add(t);
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.36, 1.8, 14, 1, true, 0.4, Math.PI * 2 - 0.8), M.cloth); coat.position.y = 0.05; coat.castShadow = true; torso.add(coat);
  const neck = new THREE.Group(); neck.position.y = 0.95; torso.add(neck); P.neck = neck;
  const nk = cyl(0.035, 0.045, 0.22, skin); nk.position.y = 0.11; neck.add(nk);
  const head = new THREE.Group(); head.position.y = 0.22; neck.add(head); P.head = head;
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin); hm.scale.set(0.92, 1.7, 1.05); hm.position.y = 0.17; hm.castShadow = true; head.add(hm);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), hollow); e.scale.set(1, 0.55, 0.35); e.position.set(s * 0.042, 0.22, 0.112); head.add(e); });
  const mo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.01), hollow); mo.position.set(0, 0.07, 0.118); head.add(mo);
  const mkArm = sx => { const sh = new THREE.Group(); sh.position.set(sx * 0.2, 0.88, 0); sh.rotation.z = sx * 0.07; torso.add(sh);
    const up = cyl(0.034, 0.028, 0.78, limb); up.position.y = -0.39; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.78; sh.add(el); const fo = cyl(0.028, 0.02, 0.8, limb); fo.position.y = -0.4; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.8; el.add(hand); const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.025), skin); palm.position.y = -0.05; hand.add(palm);
    for (let i = 0; i < 4; i++){ const f = cyl(0.007, 0.004, 0.24, skin); f.position.set(-0.018 + i * 0.012, -0.22, 0); f.rotation.z = (i - 1.5) * 0.06; hand.add(f); }
    return { sh, el }; };
  P.aL = mkArm(-1); P.aR = mkArm(1);
  root.scale.setScalar(0.93);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, body, P, phase: 0, tilt: 0, twitch: 0 };
}
function animMonster(m, dt, speed, tiltTarget = 0){
  const P = m.P; m.phase += dt * (1.1 + speed * 1.3);
  const amp = Math.min(0.6, speed * 0.13), s = Math.sin(m.phase), c = Math.cos(m.phase);
  P.lL.hip.rotation.x = s * amp; P.lR.hip.rotation.x = -s * amp;
  P.lL.knee.rotation.x = Math.max(0, c) * amp * 1.4; P.lR.knee.rotation.x = Math.max(0, -c) * amp * 1.4;
  const idle = Math.sin(G.time * 0.8) * 0.04;
  P.aL.sh.rotation.x = -s * amp * 0.7 + idle; P.aR.sh.rotation.x = s * amp * 0.7 - idle;
  P.aL.el.rotation.x = -0.1 - amp * 0.3; P.aR.el.rotation.x = -0.1 - amp * 0.3;
  const lean = speed > 5 ? 0.38 : speed > 2 ? 0.14 : 0.03;
  m.body.rotation.x += (lean - m.body.rotation.x) * Math.min(1, dt * 4);
  m.body.position.y = Math.abs(s) * 0.04 * amp;
  m.tilt += (tiltTarget - m.tilt) * Math.min(1, dt * 1.5); P.head.rotation.z = m.tilt;
  m.twitch -= dt; if (m.twitch <= 0){ P.head.rotation.y = Math.random() < 0.6 ? 0 : rnd(-0.5, 0.5); m.twitch = rnd(0.3, 2.2); }
  P.neck.rotation.x = 0.12 + lean * 0.4;
}
function buildHuman(o = {}){
  const root = new THREE.Group(); const P = {};
  const skin = std({ color: o.skin || 0xc8a184, roughness: 0.6 }), shirt = std({ color: o.shirt || 0x34405a, roughness: 0.9 }), pants = std({ color: o.pants || 0x1e2128, roughness: 0.9 }), hair = std({ color: o.hair || 0x2a2018, roughness: 1 });
  const cyl = (rt, rb, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), mat); m.castShadow = true; return m; };
  const mkLeg = sx => { const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.92, 0); root.add(hip); const l = cyl(0.07, 0.055, 0.9, pants); l.position.y = -0.45; hip.add(l);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), std({ color: 0x111111 })); sh.position.set(0, -0.9, 0.05); hip.add(sh); return hip; };
  P.lL = mkLeg(-1); P.lR = mkLeg(1);
  const tor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), shirt); tor.position.y = 1.22; tor.castShadow = true; root.add(tor);
  if (o.belt) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.26), std({ color: 0x0a0a0a })); b.position.y = 0.95; root.add(b); }
  const nk = cyl(0.05, 0.06, 0.1, skin); nk.position.y = 1.57; root.add(nk);
  const head = new THREE.Group(); head.position.y = 1.72; root.add(head); P.head = head;
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin); hm.scale.set(1, 1.15, 1.05); hm.castShadow = true; head.add(hm);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hr.position.y = 0.02; hr.rotation.x = -0.25; head.add(hr);
  if (o.eyes){ [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), std({ color: 0xf2efe8, roughness: 0.2 })); w.position.set(s * 0.04, 0.02, 0.1); head.add(w); const p = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), std({ color: 0x050505 })); p.position.set(s * 0.04, 0.02, 0.117); head.add(p); }); const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), std({ color: 0x5a2a28 })); m.position.set(0, -0.05, 0.108); m.rotation.z = 0.0; head.add(m); }
  if (o.cap){ const c = cyl(0.12, 0.12, 0.07, std({ color: 0x0f1626 })); c.position.y = 0.1; head.add(c); const br = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.1), std({ color: 0x050505 })); br.position.set(0, 0.07, 0.12); head.add(br); }
  const mkArm = sx => { const sh = new THREE.Group(); sh.position.set(sx * 0.26, 1.48, 0); root.add(sh); const a = cyl(0.045, 0.04, 0.62, shirt); a.position.y = -0.31; sh.add(a);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.03), skin); hand.position.y = -0.67; sh.add(hand);
    if (o.longFingers){ for (let i = 0; i < 4; i++){ const f = cyl(0.006, 0.004, 0.19, skin); f.position.set(-0.02 + i * 0.013, -0.8, 0); sh.add(f); } }
    return sh; };
  P.aL = mkArm(-1); P.aR = mkArm(1);
  return { root, P, phase: 0 };
}
function animHuman(h, dt, speed){ h.phase += dt * speed * 3.2; const a = Math.min(0.5, speed * 0.25), s = Math.sin(h.phase); h.P.lL.rotation.x = s * a; h.P.lR.rotation.x = -s * a; h.P.aL.rotation.x = -s * a * 0.6; h.P.aR.rotation.x = s * a * 0.6; }

// ---------- Monster controller ----------
const MON = { m: null, mode: 'off', pos: new V3(), level: 0, yaw: 0, speed: 0, kind: 'walk', kindT: 0, path: [], stall: 0, P: null, stepAcc: 0, breathT: 2, tilt: 0, intensity: 0, music: null };
let GHOST = null;
function monInit(){ MON.m = buildMonster(1); scene.add(MON.m.root); MON.m.root.visible = false; GHOST = buildMonster(0.6); scene.add(GHOST.root); GHOST.root.visible = false; }
function syncMon(){ MON.m.root.position.copy(MON.pos); MON.m.root.rotation.y = MON.yaw; }
function monPlace(x, y, z, yaw = 0){ MON.pos.set(x, y, z); MON.level = y > 1.5 ? 1 : 0; MON.yaw = yaw; MON.m.root.visible = true; syncMon(); }
function monFacePlayer(){ MON.yaw = Math.atan2(player.pos.x - MON.pos.x, player.pos.z - MON.pos.z); syncMon(); }
function monStand(x, y, z){ monPlace(x, y, z); monFacePlayer(); MON.mode = 'stand'; }
function monHide(){ MON.mode = 'off'; MON.m.root.visible = false; MON.speed = 0; stopChaseMusic(); }
function monChase(P){
  MON.mode = 'chase'; MON.P = Object.assign({ slow: 1.5, walk: 3.9, burst: 7.0, catchup: 5.0, catchupDist: 11, closeCap: 5.0, catch: 0.9, doorStall: 1.4 }, P);
  MON.path = []; MON.tid = null; MON.kind = 'walk'; MON.kindT = 1; MON.stall = 0; MON.m.root.visible = true;
  if (!MON.music){ MON.music = LOOPS.chase(); }
}
function stopChaseMusic(){ if (MON.music){ MON.music.stop(0.6); MON.music = null; } $('danger').style.opacity = 0; }
function ghostShow(x, y, z, faceCam = true, yaw = 0){ GHOST.root.position.set(x, y, z); GHOST.root.rotation.y = faceCam ? Math.atan2(camera.position.x - x, camera.position.z - z) : yaw; GHOST.root.visible = true; }
function ghostHide(){ GHOST.root.visible = false; }
// Everyone the monster can hunt. Solo: just you. In co-op 11-net.js adds the other players.
function monViews(){ return [{ id: '', pos: player.pos, level: player.level, feetY: player.feetY, trail: player.trail, local: true }]; }
const monDist = v => Math.hypot(v.pos.x - MON.pos.x, v.pos.z - MON.pos.z) + (v.level !== MON.level ? 6 : 0);
function nearestView(views){ let best = views[0]; for (const v of views) if (monDist(v) < monDist(best)) best = v; return best; }

function monUpdate(dt){
  if (GHOST.root.visible) animMonster(GHOST, dt, 0, Math.sin(G.time * 0.6) * 0.25);
  if (MON.mode === 'off') return;
  const m = MON.m, views = monViews();
  const dLocal = Math.hypot(player.pos.x - MON.pos.x, player.pos.z - MON.pos.z);
  if (MON.mode === 'stand' || MON.mode === 'watch'){
    const t = nearestView(views), dx = t.pos.x - MON.pos.x, dz = t.pos.z - MON.pos.z;
    const ty = Math.atan2(dx, dz); let dy = ty - MON.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    MON.yaw += dy * Math.min(1, dt * (MON.mode === 'watch' ? 0.8 : 2)); syncMon();
    animMonster(m, dt, 0, Math.sin(G.time * 0.5) * 0.35 + 0.1);
    MON.breathT -= dt; if (MON.breathT <= 0 && Math.hypot(dx, dz) < 9){ SND.breath(new V3(MON.pos.x, MON.pos.y + 2.4, MON.pos.z), 0.45); MON.breathT = rnd(2.6, 3.6); }
    return;
  }
  // ----- chase: pick a target (the nearest player, with some stickiness) -----
  const P = MON.P;
  let tgt = views.find(v => v.id === MON.tid);
  if (!tgt){ tgt = nearestView(views); MON.path = [{ x: tgt.pos.x, z: tgt.pos.z, level: tgt.level }]; MON.tid = tgt.id; }
  else { const best = nearestView(views); if (best !== tgt && monDist(best) < monDist(tgt) - 3){
    // switch: follow the new target's own footsteps from the point closest to the monster
    const tr = best.trail; let k = tr.length, bd = 1e9;
    for (let i = 0; i < tr.length; i++){ const t = tr[i], dd = Math.hypot(t.x - MON.pos.x, t.z - MON.pos.z) + (t.level !== MON.level ? 6 : 0); if (dd < bd){ bd = dd; k = i; } }
    MON.path = tr.slice(k).map(t => ({ x: t.x, z: t.z, level: t.level })); tgt = best; MON.tid = best.id; } }
  const pp = tgt.pos; const dx = pp.x - MON.pos.x, dz = pp.z - MON.pos.z, d = Math.hypot(dx, dz);
  const last = MON.path[MON.path.length - 1];
  if (!last || Math.hypot(last.x - pp.x, last.z - pp.z) > 0.45 || last.level !== tgt.level) MON.path.push({ x: pp.x, z: pp.z, level: tgt.level });
  if (MON.stall > 0){ MON.stall -= dt; animMonster(m, dt, 0.4, 0.3); updateChaseFx(dLocal, dt); return; }
  MON.kindT -= dt;
  if (MON.kindT <= 0){
    if (MON.kind === 'burst'){ MON.kind = 'walk'; MON.kindT = rnd(1.0, 2.0); }
    else if (Math.random() < 0.42){ MON.kind = 'burst'; MON.kindT = rnd(0.6, 1.0); if (d < 14) SND.mStep(MON.pos, 1.2); }
    else if (Math.random() < 0.35){ MON.kind = 'slow'; MON.kindT = rnd(0.5, 0.9); }
    else { MON.kind = 'walk'; MON.kindT = rnd(1.0, 1.8); }
  }
  let spd = P[MON.kind];
  if (d > P.catchupDist) spd = Math.max(spd, P.catchup);
  if (d < 2.4) spd = Math.min(spd, P.closeCap);
  MON.speed += (spd - MON.speed) * Math.min(1, dt * (MON.kind === 'burst' ? 9 : 4));
  // doors in the way
  for (const dr of doors){
    if (dr.open || Math.abs(dr.center.y - 1.1 - MON.level * 3) > 1) continue;
    if (Math.hypot(dr.center.x - MON.pos.x, dr.center.z - MON.pos.z) < 1.05){
      MON.stall = P.doorStall; SND.knock(dr.center, 2, true); player.shake = Math.max(player.shake, 0.3);
      const door = dr; after(P.doorStall * 0.9, () => { if (MON.mode !== 'chase') return; door.locked = false; door.jammed = false; setDoor(door, true, { speed: 16, silent: true }); SND.bang(door.center); });
      updateChaseFx(dLocal, dt); return;
    }
  }
  // follow the trail
  let remain = MON.speed * dt; let mvx = 0, mvz = 0;
  while (remain > 0 && MON.path.length){
    const tp = MON.path[0]; const vx = tp.x - MON.pos.x, vz = tp.z - MON.pos.z, L = Math.hypot(vx, vz);
    if (L <= remain){ MON.pos.x = tp.x; MON.pos.z = tp.z; MON.level = tp.level; MON.path.shift(); remain -= L; mvx += vx; mvz += vz; }
    else { MON.pos.x += vx / L * remain; MON.pos.z += vz / L * remain; mvx += vx; mvz += vz; MON.level = tp.level; remain = 0; }
  }
  if (remain > 0 && MON.level === tgt.level && d > 0.3){ MON.pos.x += dx / d * Math.min(remain, d); MON.pos.z += dz / d * Math.min(remain, d); mvx += dx; mvz += dz; }
  const fl = floorAt(MON.pos.x, MON.pos.z, MON.level); MON.pos.y += (fl.y - MON.pos.y) * Math.min(1, dt * 12);
  if (Math.abs(mvx) + Math.abs(mvz) > 1e-4){ const ty = Math.atan2(mvx, mvz); let dy = ty - MON.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; MON.yaw += dy * Math.min(1, dt * 8); }
  syncMon(); animMonster(m, dt, MON.speed, d < 4 ? 0.35 : 0.1);
  MON.stepAcc += MON.speed * dt; if (MON.stepAcc > 1.15){ MON.stepAcc = 0; SND.mStep(new V3(MON.pos.x, MON.pos.y + 0.1, MON.pos.z), MON.kind === 'burst' ? 1.2 : 0.8); }
  MON.breathT -= dt; if (MON.breathT <= 0){ SND.breath(new V3(MON.pos.x, MON.pos.y + 2.5, MON.pos.z), 0.6); MON.breathT = rnd(1.8, 2.8); }
  updateChaseFx(dLocal, dt);
  // caught? (in co-op: anyone caught means everyone starts over)
  for (const v of views){
    if (Math.hypot(v.pos.x - MON.pos.x, v.pos.z - MON.pos.z) < P.catch && Math.abs(v.feetY - MON.pos.y) < 1.3){ gameOver(v.local ? null : v.id); return; }
  }
}
function updateChaseFx(d, dt){
  const i = clamp(1 - (d - 1.5) / 13, 0, 1); MON.intensity += (i - MON.intensity) * Math.min(1, dt * 3);
  if (MON.music){ MON.music.setVol(0.18 + MON.intensity * 0.5, 0.2); if (MON.music.inner.seq) MON.music.inner.seq.intensity = MON.intensity; if (MON.music.inner.hi) MON.music.inner.hi.gain.setTargetAtTime(MON.intensity * 0.5, anow(), 0.2); }
  player.shake = Math.max(player.shake, MON.intensity * 0.32);
  $('danger').style.opacity = (MON.intensity * (0.6 + 0.25 * Math.sin(G.time * 9))).toFixed(3);
}
