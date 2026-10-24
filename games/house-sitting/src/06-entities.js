// ================= ENTITIES: the tall thing, people, monster AI =================
// ---------- the thing: an emaciated, too-tall body with real anatomy ----------
// skin: pale, waxy, mottled, with veins showing through; the same picture drives the bump map
// ---------- the thing ----------
// Flesh: dark, wet-looking and striated, as if the skin were peeled back to the muscle fibres, with a deep red in the grooves.
const MON_FLESH = (() => {
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const bc = document.createElement('canvas'); bc.width = W; bc.height = H; const b = bc.getContext('2d');
  if (!x || !b) return null;
  x.fillStyle = '#2b2326'; x.fillRect(0, 0, W, H); b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4.6){
    const wob = Math.random() * 6.28, amp = 1 + Math.random() * 2;
    for (let px = 0; px < W; px += 4){
      const yy = y + Math.sin(px * 0.035 + wob) * amp;
      x.fillStyle = `rgba(${120 + Math.random() * 30},${100 + Math.random() * 20},${102 + Math.random() * 20},.32)`; x.fillRect(px, yy, 4.5, 1.6);   // ridge
      x.fillStyle = `rgba(${75 + Math.random() * 35},${12 + Math.random() * 12},${20 + Math.random() * 14},.55)`; x.fillRect(px, yy + 2.1, 4.5, 1.5); // red groove
      b.fillStyle = '#ffffff'; b.fillRect(px, yy, 4.5, 1.8); b.fillStyle = '#101010'; b.fillRect(px, yy + 2.2, 4.5, 1.6);
    }
  }
  for (let i = 0; i < 40; i++){ const px = Math.random() * W, py = Math.random() * H, r = 20 + Math.random() * 70, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(10,6,8,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  for (let i = 0; i < 25; i++){ const px = Math.random() * W, py = Math.random() * H, r = 10 + Math.random() * 40, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(110,30,45,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.encoding = THREE.sRGBEncoding; map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(bc); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
})();
// Bone: the skull, old and stained, with hairline cracks
const MON_BONE = (() => {
  const W = 256, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); if (!x) return null;
  x.fillStyle = '#b9b3a6'; x.fillRect(0, 0, W, W);
  for (let i = 0; i < 70; i++){ const px = Math.random() * W, py = Math.random() * W, r = 8 + Math.random() * 50, g = x.createRadialGradient(px, py, 0, px, py, r); const t = Math.random() < 0.5 ? '80,70,55' : '210,205,195'; g.addColorStop(0, `rgba(${t},.25)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  x.strokeStyle = 'rgba(40,32,26,.55)'; x.lineWidth = 0.8;
  for (let i = 0; i < 14; i++){ let px = Math.random() * W, py = Math.random() * W, a = Math.random() * 6.28; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 12; k++){ a += (Math.random() - 0.5) * 1.2; px += Math.cos(a) * 5; py += Math.sin(a) * 5; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 3000; i++){ x.fillStyle = `rgba(50,40,30,${Math.random() * 0.15})`; x.fillRect(Math.random() * W, Math.random() * W, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
})();

function buildMonster(dim = 1){
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const fleshMat = (rx, ry, col = 0xffffff) => { const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.38, metalness: 0.05, emissive: 0x0a0506, emissiveIntensity: dim });
    if (MON_FLESH){ m.map = MON_FLESH.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(rx, ry); m.bumpMap = MON_FLESH.bump.clone(); m.bumpMap.needsUpdate = true; m.bumpMap.repeat.set(rx, ry); m.bumpScale = 0.012; } return m; };
  const flesh = fleshMat(2, 3.5, 0x8a7d80), fleshLimb = fleshMat(1, 7, 0x80777a), fleshDark = fleshMat(1, 2, 0x524649);
  const skull = new THREE.MeshStandardMaterial({ color: 0x847d70, map: MON_BONE, roughness: 0.72, emissive: 0x0d0c0a, emissiveIntensity: dim });
  const hollow = new THREE.MeshStandardMaterial({ color: 0x030202, roughness: 1 });
  const gum = new THREE.MeshStandardMaterial({ color: 0x0f0405, roughness: 0.2 });
  const tooth = new THREE.MeshStandardMaterial({ color: 0x857a62, roughness: 0.35, emissive: 0x0e0c0a, emissiveIntensity: dim });
  const claw = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.25, metalness: 0.2 });
  const pupil = new THREE.MeshBasicMaterial({ color: 0xe9e4d6 });   // two pale pinpoints you can see in the dark
  const P = { fingers: [] };
  const lathe = (pts, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };
  const ball = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
  const cone = (r, h, mat, seg = 6) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.castShadow = true; return m; };
  const bone = (len, r0, r1, mat) => lathe([[0, 0], [r1 * 0.8, 0.01], [r1, len * 0.12], [(r0 + r1) / 2 * 0.85, len * 0.5], [r0, len * 0.86], [r0 * 0.8, len * 0.98], [0, len]], mat);  // a limb segment pointing down from 0

  // ---- legs that bend the wrong way: thigh forward, shin back, a long foot forward, claws ----
  const LEG = { hip: -0.58, knee: 1.3, ankle: -1.02 };
  const mkLeg = sx => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.09, 1.5, 0); body.add(hip);
    const th = bone(0.62, 0.032, 0.05, fleshLimb); th.rotation.x = Math.PI; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.62; hip.add(knee);
    const kj = ball(0.036, fleshDark, 1, 1.2, 1.1); knee.add(kj);
    const sh = bone(0.7, 0.022, 0.034, fleshLimb); sh.rotation.x = Math.PI; knee.add(sh);
    for (let k = 0; k < 4; k++){ const sp = cone(0.008, 0.05, claw); sp.position.set(0, -0.15 - k * 0.11, -0.03); sp.rotation.x = -2.0; knee.add(sp); }   // spurs down the back of the shin
    const ankle = new THREE.Group(); ankle.position.y = -0.7; ankle.rotation.x = LEG.ankle; knee.add(ankle);
    ankle.add(ball(0.022, fleshDark));
    const mt = bone(0.45, 0.018, 0.026, fleshLimb); mt.rotation.x = Math.PI; ankle.add(mt);
    const foot = new THREE.Group(); foot.position.y = -0.45; foot.rotation.x = -LEG.hip - LEG.knee - LEG.ankle; ankle.add(foot);
    [-1, 0, 1].forEach(k => { const toe = bone(0.11, 0.008, 0.012, fleshDark); toe.rotation.x = -Math.PI / 2 + 0.15; toe.position.set(k * 0.022, 0, 0.0); toe.rotation.z = k * 0.25; foot.add(toe);
      const c = cone(0.007, 0.07, claw); c.position.set(k * 0.05, -0.02, 0.14); c.rotation.x = Math.PI / 2 + 0.6; foot.add(c); });
    hip.rotation.x = LEG.hip; knee.rotation.x = LEG.knee;
    return { hip, knee };
  };
  P.lL = mkLeg(-1); P.lR = mkLeg(1); P.legBase = LEG;
  const pel = lathe([[0, 0], [0.06, 0.01], [0.1, 0.05], [0.105, 0.1], [0.09, 0.14], [0, 0.16]], flesh); pel.scale.z = 0.7; pel.position.y = 1.43; body.add(pel);

  // ---- torso: hunched, starved; ribs, a spine with spikes ----
  const torso = new THREE.Group(); torso.position.y = 1.55; torso.rotation.set(0.42, 0.04, 0.03); body.add(torso); P.torso = torso;
  const chest = new THREE.Group(); torso.add(chest); P.chest = chest;
  const rib = lathe([[0, -0.04], [0.072, -0.03], [0.058, 0.08], [0.056, 0.18], [0.072, 0.3], [0.1, 0.42], [0.118, 0.55], [0.124, 0.67], [0.12, 0.77], [0.1, 0.86], [0.06, 0.92], [0, 0.95]], flesh, 22);
  rib.scale.z = 0.6; chest.add(rib);
  for (let i = 0; i < 7; i++){ const r = [0.105, 0.114, 0.12, 0.123, 0.122, 0.116, 0.104][i] + 0.004;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0045, 4, 18, Math.PI * 0.7), fleshDark); arc.castShadow = true; arc.rotation.x = Math.PI / 2; arc.rotation.z = Math.PI * 0.075; arc.scale.y = 0.6; arc.position.y = 0.43 + i * 0.055; chest.add(arc); }
  for (let i = 0; i < 17; i++){ const v = ball(0.017, fleshDark, 1.2, 0.7, 1); v.position.set(0, 0.04 + i * 0.054, -0.07 - Math.sin(i / 16 * Math.PI) * 0.02); chest.add(v);
    if (i > 3 && i % 2 === 0){ const sp = cone(0.012, 0.09 + Math.sin(i / 16 * Math.PI) * 0.05, claw); sp.position.set(0, 0.04 + i * 0.054, -0.1 - Math.sin(i / 16 * Math.PI) * 0.02); sp.rotation.x = -Math.PI / 2 + 0.5; chest.add(sp); } }
  [-1, 1].forEach(sx => { const blade = ball(0.07, flesh, 0.75, 1, 0.22); blade.position.set(sx * 0.07, 0.72, -0.07); blade.rotation.z = sx * 0.3; chest.add(blade);
    const clav = bone(0.17, 0.011, 0.014, fleshDark); clav.rotation.z = sx * (Math.PI / 2 - 0.18); clav.position.set(0, 0.89, 0.045); chest.add(clav); });

  // ---- neck: long, craning forward; the head is a bare skull with a grin ----
  const neck = new THREE.Group(); neck.position.y = 0.92; neck.rotation.x = 0.55; torso.add(neck); P.neck = neck;
  neck.add(lathe([[0, 0], [0.038, 0.01], [0.028, 0.14], [0.03, 0.27], [0, 0.3]], fleshLimb));
  [-1, 1].forEach(sx => { const ten = bone(0.27, 0.008, 0.01, fleshDark); ten.rotation.x = Math.PI; ten.position.set(sx * 0.022, 0.28, 0.022); ten.rotation.z = sx * 0.08; neck.add(ten); });
  const head = new THREE.Group(); head.position.y = 0.29; head.rotation.x = -0.85; head.scale.setScalar(0.86); neck.add(head); P.head = head;
  const sk = ball(0.105, skull, 0.86, 1.16, 1.02); sk.position.set(0, 0.14, -0.01); head.add(sk);
  const face = ball(0.08, skull, 0.92, 0.85, 0.62); face.position.set(0, 0.06, 0.03); head.add(face);
  [-1, 1].forEach(sx => {
    const sock = ball(0.03, hollow, 0.95, 1.35, 0.75); sock.position.set(sx * 0.037, 0.112, 0.07); sock.rotation.z = sx * -0.35; head.add(sock);
    const pu = ball(0.0058, pupil); pu.position.set(sx * 0.036, 0.104, 0.093); head.add(pu); P['eye' + (sx < 0 ? 'L' : 'R')] = pu;
    const cb = ball(0.016, skull, 1.6, 0.75, 1); cb.position.set(sx * 0.058, 0.074, 0.062); head.add(cb);
    const hol = ball(0.02, hollow, 0.7, 1.3, 0.5); hol.position.set(sx * 0.06, 0.042, 0.05); head.add(hol);   // sunken cheeks
    const tmp = ball(0.024, hollow, 0.6, 1.2, 1); tmp.position.set(sx * 0.085, 0.1, 0.0); head.add(tmp);
  });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.03, 3), hollow); nose.position.set(0, 0.06, 0.112); nose.rotation.x = Math.PI; head.add(nose);
  // the grin: two rows of long teeth on dark gums, the jaw hanging a little open
  const upper = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 6, 20, Math.PI * 1.0), gum); upper.rotation.set(Math.PI / 2, 0, Math.PI * 0.05); upper.scale.y = 0.75; upper.position.set(0, 0.022, 0.035); head.add(upper);
  for (let t = 0; t < 20; t++){ const a = -1.45 + t * (2.9 / 19), tt = new THREE.Mesh(new THREE.BoxGeometry(0.0075, 0.03 - Math.abs(a) * 0.006 + Math.random() * 0.006, 0.005), tooth); tt.position.set(Math.sin(a) * 0.058, 0.008, 0.035 + Math.cos(a) * 0.044); tt.rotation.y = a; head.add(tt); }
  const jaw = new THREE.Group(); jaw.position.set(0, 0.02, -0.02); head.add(jaw); P.jaw = jaw;
  const jb = ball(0.056, skull, 0.85, 0.42, 0.95); jb.position.set(0, -0.032, 0.05); jaw.add(jb);
  const lower = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 6, 20, Math.PI * 0.9), gum); lower.rotation.set(Math.PI / 2, 0, Math.PI * 0.05); lower.scale.y = 0.75; lower.position.set(0, -0.012, 0.058); jaw.add(lower);
  for (let t = 0; t < 18; t++){ const a = -1.4 + t * (2.8 / 17), tt = new THREE.Mesh(new THREE.BoxGeometry(0.0072, 0.022 + Math.random() * 0.008, 0.005), tooth); tt.position.set(Math.sin(a) * 0.052, 0.002, 0.058 + Math.cos(a) * 0.039); tt.rotation.y = a; jaw.add(tt); }

  // ---- arms: absurdly long, ending in clawed hands that hang past the knees ----
  const mkArm = sx => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.15, 0.86, -0.005); torso.add(sh);
    sh.add(ball(0.032, flesh, 1.3, 1, 0.9));
    const up = bone(0.78, 0.022, 0.03, fleshLimb); up.rotation.x = Math.PI; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.78; sh.add(el);
    el.add(ball(0.026, fleshDark, 1, 1.3, 1));
    const fo = bone(0.82, 0.016, 0.024, fleshLimb); fo.rotation.x = Math.PI; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.82; el.add(hand);
    const palm = ball(0.035, fleshDark, 0.9, 1.6, 0.4); palm.position.y = -0.05; hand.add(palm);
    [-1.5, -0.5, 0.5, 1.5].forEach(k => {
      let g = new THREE.Group(); g.position.set(k * 0.016, -0.1, 0.004); g.rotation.z = k * 0.06; hand.add(g);
      [0.13, 0.11, 0.08].forEach((L, j) => {
        g.add(ball(0.009 - j * 0.0012, fleshDark));
        const ph = bone(L, 0.006 - j * 0.0012, 0.0075 - j * 0.0012, fleshLimb); ph.rotation.x = Math.PI; g.add(ph);
        const next = new THREE.Group(); next.position.y = -L; next.rotation.x = 0.18 + j * 0.1; g.add(next); P.fingers.push(next); g = next;
      });
      const c = cone(0.006, 0.09, claw); c.position.set(0, -0.04, 0.012); c.rotation.x = Math.PI - 0.5; g.add(c);   // long curved claw
    });
    const th = new THREE.Group(); th.position.set(sx * -0.025, -0.05, 0.012); th.rotation.z = sx * -0.7; hand.add(th);
    const t1 = bone(0.09, 0.006, 0.008, fleshLimb); t1.rotation.x = Math.PI; th.add(t1); const tc = cone(0.005, 0.05, claw); tc.position.y = -0.11; tc.rotation.x = Math.PI - 0.4; th.add(tc);
    return { sh, el, hand };
  };
  P.aL = mkArm(-1); P.aR = mkArm(1);
  root.scale.setScalar(0.97);
  root.traverse(o => { if (o.isMesh && o.material !== pupil) o.castShadow = true; });
  return { root, body, P, phase: 0, tilt: 0, twitch: 0, fingerT: 0 };
}
function animMonster(m, dt, speed, tiltTarget = 0){
  const P = m.P, L = P.legBase || { hip: 0, knee: 0 }; m.phase += dt * (1.1 + speed * 1.3);
  const amp = Math.min(0.6, speed * 0.13), s = Math.sin(m.phase), c = Math.cos(m.phase);
  // digitigrade gait: the thigh swings, the shin folds back further when the leg lifts
  P.lL.hip.rotation.x = L.hip + s * amp; P.lR.hip.rotation.x = L.hip - s * amp;
  P.lL.knee.rotation.x = L.knee + Math.max(0, c) * amp * 0.9; P.lR.knee.rotation.x = L.knee + Math.max(0, -c) * amp * 0.9;
  const idle = Math.sin(G.time * 0.8) * 0.04;
  P.aL.sh.rotation.x = -s * amp * 0.8 + idle - 0.32; P.aR.sh.rotation.x = s * amp * 0.8 - idle - 0.32;
  P.aL.sh.rotation.z = -0.12 - amp * 0.2; P.aR.sh.rotation.z = 0.12 + amp * 0.2;
  P.aL.el.rotation.x = -0.35 - amp * 0.4; P.aR.el.rotation.x = -0.35 - amp * 0.4;
  const lean = speed > 5 ? 0.38 : speed > 2 ? 0.16 : 0.04;
  m.body.rotation.x += (lean - m.body.rotation.x) * Math.min(1, dt * 4);
  m.body.position.y = Math.abs(s) * 0.05 * amp - 0.02;
  const br = Math.sin(G.time * (speed > 2 ? 3.2 : 1.1));
  if (P.chest) P.chest.scale.set(1 + br * 0.03, 1 + br * 0.012, 1 + br * 0.06);
  if (P.jaw) P.jaw.rotation.x = 0.1 + Math.max(0, br) * 0.06 + (speed > 5 ? 0.25 : 0);
  m.tilt += (tiltTarget - m.tilt) * Math.min(1, dt * 1.5); P.head.rotation.z = m.tilt;
  m.twitch -= dt; if (m.twitch <= 0){ P.head.rotation.y = Math.random() < 0.6 ? 0 : rnd(-0.6, 0.6); P.head.rotation.x = Math.random() < 0.7 ? -0.85 : rnd(-1.15, -0.5); m.twitch = rnd(0.3, 2.2); }
  P.neck.rotation.x = 0.55 + lean * 0.3;
  if (P.fingers){ m.fingerT = (m.fingerT || 0) - dt;
    for (let i = 0; i < P.fingers.length; i++){ const f = P.fingers[i]; const base = 0.2 + (i % 3) * 0.12 + Math.sin(G.time * 0.7 + i) * 0.1 + (speed > 4 ? 0.4 : 0); f.rotation.x += (base - f.rotation.x) * Math.min(1, dt * 3); }
    if (m.fingerT <= 0){ const f = P.fingers[(Math.random() * P.fingers.length) | 0]; f.rotation.x = rnd(-0.3, 1.0); m.fingerT = rnd(0.12, 0.8); } }
}
function buildHuman(o = {}){
  const root = new THREE.Group(); const P = {};
  const skin = std({ color: o.skin || 0xc8a184, roughness: 0.6 }), shirt = std({ color: o.shirt || 0x34405a, roughness: 0.9 }), pants = std({ color: o.pants || 0x1e2128, roughness: 0.9 }), hair = std({ color: o.hair || 0x2a2018, roughness: 1 });
  const cyl = (rt, rb, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), mat); m.castShadow = true; return m; };
  const mkLeg = sx => { const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.92, 0); root.add(hip);
    const th = cyl(0.07, 0.062, 0.46, pants); th.position.y = -0.23; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee); hip.userData.knee = knee;
    const sn = cyl(0.062, 0.055, 0.44, pants); sn.position.y = -0.22; knee.add(sn);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), std({ color: 0x111111 })); sh.position.set(0, -0.44, 0.05); knee.add(sh); return hip; };
  P.lL = mkLeg(-1); P.lR = mkLeg(1); P.kL = P.lL.userData.knee; P.kR = P.lR.userData.knee;
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
// sitting: thighs forward, shins down, hands in the lap
function humanSit(h, on){
  const P = h.P; h.seated = !!on;
  P.lL.rotation.x = P.lR.rotation.x = on ? -Math.PI / 2 : 0; P.kL.rotation.x = P.kR.rotation.x = on ? Math.PI / 2 : 0;
  P.aL.rotation.x = P.aR.rotation.x = on ? -0.5 : 0; P.head.rotation.set(0, 0, 0);
  h.root.position.y = on ? -0.4 : 0;
}
function animHuman(h, dt, speed){ if (h.seated) return; h.phase += dt * speed * 3.2; const a = Math.min(0.5, speed * 0.25), s = Math.sin(h.phase); h.P.lL.rotation.x = s * a; h.P.lR.rotation.x = -s * a; h.P.aL.rotation.x = -s * a * 0.6; h.P.aR.rotation.x = s * a * 0.6; }

// ---------- Monster controller ----------
const MON = { burning: false, zone: null, m: null, mode: 'off', pos: new V3(), level: 0, yaw: 0, speed: 0, kind: 'walk', kindT: 0, path: [], stall: 0, P: null, stepAcc: 0, breathT: 2, tilt: 0, intensity: 0, music: null };
let GHOST = null;
function monInit(){ MON.m = buildMonster(1); scene.add(MON.m.root); MON.m.root.visible = false; GHOST = buildMonster(0.6); scene.add(GHOST.root); GHOST.root.visible = false; }
function syncMon(){ MON.m.root.position.copy(MON.pos); MON.m.root.rotation.y = MON.yaw; }
function monPlace(x, y, z, yaw = 0){ MON.pos.set(x, y, z); MON.level = y > 1.5 ? 1 : 0; MON.yaw = yaw; MON.m.root.visible = true; syncMon(); }
function monFacePlayer(){ MON.yaw = Math.atan2(player.pos.x - MON.pos.x, player.pos.z - MON.pos.z); syncMon(); }
function monStand(x, y, z){ monPlace(x, y, z); monFacePlayer(); MON.mode = 'stand'; }
function monHide(){ MON.mode = 'off'; MON.m.root.visible = false; MON.speed = 0; stopChaseMusic(); }
function monChase(P){
  MON.mode = 'chase'; MON.P = Object.assign({ slow: 1.5, walk: 3.9, burst: 7.0, catchup: 5.0, catchupDist: 11, closeCap: 5.0, catch: 0.9, doorStall: 1.4 }, P);
  MON.zone = (P && P.zone) || null;   // it only hunts players inside this area (e.g. the cellar)
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
  const m = MON.m, views = monViews().filter(v => !MON.zone || (v.pos.x > MON.zone.minX && v.pos.x < MON.zone.maxX && v.pos.z > MON.zone.minZ && v.pos.z < MON.zone.maxZ));
  if (!views.length){ animMonster(m, dt, 0, 0.2); return; }
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
      const door = dr, hold = dr.hold || 0; dr.hold = 0;
      MON.stall = hold || P.doorStall; SND.knock(dr.center, 2, true); player.shake = Math.max(player.shake, 0.3);
      if (hold) poundDoor(door, hold);
      after(MON.stall * 0.9, () => { if (MON.mode !== 'chase') return; door.locked = false; door.jammed = false; setDoor(door, true, { speed: 16, silent: true }); SND.bang(door.center); player.shake = Math.max(player.shake, 0.6); });
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
// it throws itself against a door again and again: the lights shake, the frame splinters
function poundDoor(door, secs){
  for (let t = 0.9; t < secs * 0.85; t += rnd(0.7, 1.1)) after(t, () => {
    if (MON.mode !== 'chase' || door.open) return;
    SND.knock(door.center, 1, true); SND.thud(door.center, 0.9); player.shake = Math.max(player.shake, 0.45);
    flickerGroup(f => f.pos.distanceTo(door.center) < 6, 0.3);
  });
}
function updateChaseFx(d, dt){
  const i = clamp(1 - (d - 1.5) / 13, 0, 1); MON.intensity += (i - MON.intensity) * Math.min(1, dt * 3);
  if (MON.music){ MON.music.setVol(0.18 + MON.intensity * 0.5, 0.2); if (MON.music.inner.seq) MON.music.inner.seq.intensity = MON.intensity; if (MON.music.inner.hi) MON.music.inner.hi.gain.setTargetAtTime(MON.intensity * 0.5, anow(), 0.2); }
  player.shake = Math.max(player.shake, MON.intensity * 0.32);
  $('danger').style.opacity = (MON.intensity * (0.6 + 0.25 * Math.sin(G.time * 9))).toFixed(3);
}
