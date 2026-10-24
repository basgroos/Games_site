// ================= ENTITIES: the tall thing, people, monster AI =================
// ---------- the thing: an emaciated, too-tall body with real anatomy ----------
// skin: pale, waxy, mottled, with veins showing through; the same picture drives the bump map
const MON_SKIN = (() => {
  const W = 512, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d');
  const bc = document.createElement('canvas'); bc.width = bc.height = W; const b = bc.getContext('2d');
  if (!x || !b) return null;
  x.fillStyle = '#b3a995'; x.fillRect(0, 0, W, W); b.fillStyle = '#808080'; b.fillRect(0, 0, W, W);
  for (let i = 0; i < 260; i++){ const px = Math.random() * W, py = Math.random() * W, r = 8 + Math.random() * 60, g = x.createRadialGradient(px, py, 0, px, py, r);
    const tone = [[150, 140, 120], [190, 180, 160], [140, 128, 118], [165, 150, 150], [125, 120, 100]][(Math.random() * 5) | 0];
    g.addColorStop(0, `rgba(${tone[0]},${tone[1]},${tone[2]},${0.12 + Math.random() * 0.2})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  // veins
  for (let v = 0; v < 70; v++){
    let px = Math.random() * W, py = Math.random() * W, a = Math.random() * 6.28; const len = 30 + Math.random() * 160, w = 0.6 + Math.random() * 1.6;
    x.strokeStyle = `rgba(${70 + Math.random() * 30},${70 + Math.random() * 30},${110 + Math.random() * 40},${0.18 + Math.random() * 0.22})`; x.lineWidth = w; x.lineCap = 'round';
    b.strokeStyle = 'rgba(200,200,200,.5)'; b.lineWidth = w + 1;
    x.beginPath(); b.beginPath(); x.moveTo(px, py); b.moveTo(px, py);
    for (let k = 0; k < len; k += 6){ a += (Math.random() - 0.5) * 0.7; px += Math.cos(a) * 6; py += Math.sin(a) * 6; x.lineTo(px, py); b.lineTo(px, py); }
    x.stroke(); b.stroke();
  }
  // pores, wrinkles and grime
  for (let i = 0; i < 9000; i++){ const px = Math.random() * W, py = Math.random() * W; x.fillStyle = `rgba(60,50,40,${Math.random() * 0.12})`; x.fillRect(px, py, 1, 1); b.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; b.fillRect(px, py, 1, 1); }
  for (let i = 0; i < 160; i++){ const px = Math.random() * W, py = Math.random() * W, l = 6 + Math.random() * 30; x.strokeStyle = 'rgba(70,58,46,.16)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py + (Math.random() - 0.5) * 6, px + l, py + (Math.random() - 0.5) * 4); x.stroke();
    b.strokeStyle = 'rgba(30,30,30,.6)'; b.beginPath(); b.moveTo(px, py); b.lineTo(px + l, py + (Math.random() - 0.5) * 4); b.stroke(); }
  for (let i = 0; i < 40; i++){ const px = Math.random() * W, py = Math.random() * W, r = 10 + Math.random() * 40, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(50,40,30,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.encoding = THREE.sRGBEncoding; map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(bc); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
})();
// torn black rags: a cloth texture whose bottom edge is ripped into strips
const MON_RAG = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'); if (!x) return null;
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 256);
  x.fillStyle = '#000'; let px = 0; while (px < 128){ const w = 4 + Math.random() * 14, top = 80 + Math.random() * 170; x.beginPath(); x.moveTo(px, 256); x.lineTo(px + w * 0.5, top); x.lineTo(px + w, 256); x.fill(); px += w * (0.6 + Math.random() * 0.8); }
  for (let i = 0; i < 25; i++){ x.beginPath(); x.ellipse(Math.random() * 128, 40 + Math.random() * 200, 2 + Math.random() * 7, 3 + Math.random() * 12, Math.random() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); return t;
})();

function buildMonster(dim = 1){
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const skin = new THREE.MeshStandardMaterial({ color: 0x6d685c, map: MON_SKIN && MON_SKIN.map, bumpMap: MON_SKIN && MON_SKIN.bump, bumpScale: 0.006, roughness: 0.42, metalness: 0, emissive: 0x0c0b09, emissiveIntensity: dim });
  const skinDark = new THREE.MeshStandardMaterial({ color: 0x5e554a, map: MON_SKIN && MON_SKIN.map, bumpMap: MON_SKIN && MON_SKIN.bump, bumpScale: 0.008, roughness: 0.5, emissive: 0x070605, emissiveIntensity: dim });
  const bone = new THREE.MeshStandardMaterial({ color: 0x8a8372, map: MON_SKIN && MON_SKIN.map, roughness: 0.38, emissive: 0x0e0c09, emissiveIntensity: dim });
  const hollow = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1 });
  const nail = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.3 });
  const tooth = new THREE.MeshStandardMaterial({ color: 0xb7ab8a, roughness: 0.35 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x202018, roughness: 0.05, metalness: 0.2, emissive: 0x2a2a20, emissiveIntensity: 0.6 * dim });
  const rag = new THREE.MeshStandardMaterial({ color: 0x060505, roughness: 1, metalness: 0, emissive: 0x000000, side: THREE.DoubleSide, alphaMap: MON_RAG, alphaTest: 0.5 });
  const P = { fingers: [] };
  const tube = (r0, r1, h, mat, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg, 3), mat); m.castShadow = true; m.receiveShadow = true; return m; };   // r0 at the bottom
  const ball = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; return m; };
  const lathe = (pts, mat, seg = 18) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- legs: long thin bones, knobby knees, long feet ----
  const mkLeg = sx => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.085, 1.52, 0); body.add(hip);
    const th = lathe([[0, 0], [0.024, 0.02], [0.03, 0.2], [0.036, 0.55], [0.042, 0.74], [0.035, 0.82], [0, 0.83]], skin); th.rotation.x = Math.PI; th.position.y = 0; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.82; hip.add(knee);
    const cap = ball(0.03, skin, 1, 1.2, 0.9); cap.position.z = 0.016; knee.add(cap);
    const sh = lathe([[0, 0], [0.016, 0.02], [0.019, 0.12], [0.027, 0.45], [0.03, 0.62], [0.026, 0.76], [0, 0.78]], skin); sh.rotation.x = Math.PI; knee.add(sh);
    const ank = ball(0.022, bone); ank.position.y = -0.77; knee.add(ank);
    const foot = new THREE.Group(); foot.position.y = -0.79; knee.add(foot);
    const ft = ball(0.05, skinDark, 0.75, 0.38, 2.6); ft.position.set(0, -0.005, 0.09); foot.add(ft);
    for (let t = 0; t < 4; t++){ const toe = tube(0.009, 0.006, 0.07, skinDark, 6); toe.rotation.x = Math.PI / 2 + 0.25; toe.position.set((t - 1.5) * 0.016, -0.012, 0.215); foot.add(toe); }
    return { hip, knee };
  };
  P.lL = mkLeg(-1); P.lR = mkLeg(1);
  // ---- pelvis ----
  const pel = lathe([[0, 0], [0.07, 0.01], [0.105, 0.05], [0.11, 0.1], [0.095, 0.14], [0.085, 0.16], [0, 0.17]], skin, 18); pel.scale.z = 0.68; pel.position.y = 1.43; body.add(pel);
  [-1, 1].forEach(sx => { const crest = ball(0.026, skin, 1.5, 0.7, 0.9); crest.position.set(sx * 0.092, 1.565, 0.022); body.add(crest); });

  // ---- torso: caved belly, ribcage under the skin, a spine you can count ----
  const torso = new THREE.Group(); torso.position.y = 1.55; torso.rotation.set(0.16, 0.05, 0.035); body.add(torso); P.torso = torso;
  const chest = new THREE.Group(); torso.add(chest); P.chest = chest;
  const rib = lathe([[0, -0.04], [0.085, -0.03], [0.072, 0.06], [0.066, 0.16], [0.08, 0.28], [0.104, 0.4], [0.118, 0.53], [0.124, 0.65], [0.122, 0.76], [0.108, 0.85], [0.07, 0.92], [0, 0.95]], skin, 22);
  rib.scale.z = 0.58; chest.add(rib);
  for (let i = 0; i < 7; i++){
    const y = 0.42 + i * 0.054, r = [0.108, 0.116, 0.121, 0.123, 0.121, 0.115, 0.104][i] + 0.004;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0065, 5, 18, Math.PI * 0.82), skin); arc.castShadow = true;
    arc.rotation.x = Math.PI / 2; arc.rotation.z = Math.PI * 0.09; arc.scale.y = 0.58; arc.position.y = y; arc.position.z = 0.002;
    chest.add(arc);
  }
  const sternum = tube(0.009, 0.012, 0.3, skin, 6); sternum.position.set(0, 0.66, 0.068); sternum.rotation.x = -0.08; chest.add(sternum);
  for (let i = 0; i < 16; i++){ const v = ball(0.017, bone, 1.2, 0.7, 1); v.position.set(0, 0.06 + i * 0.056, -0.072 - Math.sin(i / 15 * Math.PI) * 0.015); chest.add(v); }
  [-1, 1].forEach(sx => {
    const blade = ball(0.07, skin, 0.75, 1, 0.22); blade.position.set(sx * 0.07, 0.72, -0.07); blade.rotation.z = sx * 0.3; chest.add(blade);
    const clav = tube(0.011, 0.013, 0.17, bone, 6); clav.rotation.z = sx * (Math.PI / 2 - 0.18); clav.position.set(sx * 0.085, 0.89, 0.045); chest.add(clav);
  });

  // ---- neck and head: long neck with tendons; an elongated skull, sunken eyes, a mouth that is slightly open ----
  const neck = new THREE.Group(); neck.position.y = 0.92; neck.rotation.x = 0.3; torso.add(neck); P.neck = neck;
  const nk = lathe([[0, 0], [0.036, 0.01], [0.031, 0.12], [0.034, 0.24], [0, 0.26]], skin); neck.add(nk);
  [-1, 1].forEach(sx => { const ten = tube(0.009, 0.007, 0.25, skin, 6); ten.position.set(sx * 0.02, 0.12, 0.022); ten.rotation.z = sx * -0.12; ten.rotation.x = -0.1; neck.add(ten); });
  const head = new THREE.Group(); head.position.y = 0.25; neck.add(head); P.head = head;
  const skull = ball(0.1, skin, 0.88, 1.5, 1.08); skull.position.set(0, 0.16, -0.015); head.add(skull);
  const face = ball(0.085, skin, 0.86, 1.25, 0.62); face.position.set(0, 0.11, 0.04); head.add(face);
  [-1, 1].forEach(sx => {
    // deep, dark eye sockets with only a wet glint at the bottom
    const sock = ball(0.026, hollow, 1.25, 0.95, 0.8); sock.position.set(sx * 0.034, 0.158, 0.078); head.add(sock);
    const e = ball(0.006, eye); e.position.set(sx * 0.034, 0.152, 0.093); head.add(e);
    const cb = ball(0.012, bone, 1.6, 0.8, 1); cb.position.set(sx * 0.052, 0.128, 0.075); head.add(cb);   // cheekbones
    const hol = ball(0.02, skinDark, 0.9, 1.4, 0.6); hol.position.set(sx * 0.045, 0.09, 0.072); head.add(hol);   // hollow cheeks
  });
  const jaw = new THREE.Group(); jaw.position.set(0, 0.07, 0.0); head.add(jaw); P.jaw = jaw;
  const jb = ball(0.062, skin, 0.78, 0.62, 1.0); jb.position.set(0, -0.018, 0.025); jaw.add(jb);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.007, 0.006), hollow); mouth.position.set(0, 0.052, 0.088); head.add(mouth);
  for (let t = 0; t < 9; t++){ const tt = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.008, 0.003), tooth); tt.position.set((t - 4) * 0.0055, 0.049, 0.088); head.add(tt); }
  [-1, 1].forEach(sx => { const n = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.01, 0.004), hollow); n.position.set(sx * 0.006, 0.106, 0.092); n.rotation.z = sx * 0.4; head.add(n); });
  for (let i = 0; i < 7; i++){ const h = tube(0.0018, 0.0012, 0.18 + Math.random() * 0.2, hollow, 3); h.position.set(rnd(-0.06, 0.06), 0.2 - Math.random() * 0.05, rnd(-0.09, 0.0)); h.rotation.set(rnd(-0.5, 0.2), 0, rnd(-0.3, 0.3)); head.add(h); }

  // ---- arms: far too long, knobby elbows, hands with jointed fingers and dark nails ----
  const mkArm = sx => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.15, 0.86, -0.005); sh.rotation.z = sx * 0.05; torso.add(sh);
    const shj = ball(0.03, skin, 1.25, 1, 0.9); shj.position.y = -0.01; sh.add(shj);
    const up = lathe([[0, 0], [0.02, 0.02], [0.024, 0.2], [0.028, 0.5], [0.024, 0.74], [0, 0.76]], skin); up.rotation.x = Math.PI; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.76; sh.add(el);
    const elb = ball(0.023, skin, 1, 1.25, 1); elb.position.z = -0.01; el.add(elb);
    const fo = lathe([[0, 0], [0.016, 0.02], [0.019, 0.2], [0.024, 0.55], [0.022, 0.76], [0, 0.8]], skin); fo.rotation.x = Math.PI; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.8; el.add(hand);
    const wr = ball(0.018, bone, 1.3, 1, 0.9); hand.add(wr);
    const palm = ball(0.04, skinDark, 0.8, 1.45, 0.35); palm.position.y = -0.055; hand.add(palm);
    [-1.5, -0.5, 0.5, 1.5].forEach((k, i) => {
      let g = new THREE.Group(); g.position.set(k * 0.0145, -0.11, 0.004); g.rotation.z = k * 0.04; hand.add(g);
      const segs = [0.12, 0.095, 0.07];
      segs.forEach((L, j) => {
        const kn = ball(0.0085 - j * 0.0012, bone); g.add(kn);
        const ph = tube(0.0072 - j * 0.0012, 0.0062 - j * 0.0012, L, skin, 6); ph.position.y = -L / 2; g.add(ph);
        const next = new THREE.Group(); next.position.y = -L; next.rotation.x = 0.12 + j * 0.08; g.add(next);
        P.fingers.push(next); g = next;
      });
      const nl = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.004), nail); nl.position.set(0, -0.006, 0.004); g.add(nl);
    });
    const th = new THREE.Group(); th.position.set(sx * -0.022, -0.06, 0.01); th.rotation.z = sx * -0.6; hand.add(th);
    const t1 = tube(0.008, 0.006, 0.08, skin, 6); t1.position.y = -0.04; th.add(t1);
    return { sh, el, hand };
  };
  P.aL = mkArm(-1); P.aR = mkArm(1);

  // ---- rags: what is left of a long black coat ----
  const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.35, 16, 4, true, 0.9, Math.PI * 2 - 1.8), rag); r1.position.y = 0.2; r1.castShadow = true; torso.add(r1);
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.7), rag); r2.position.set(0.0, 0.72, -0.1); r2.rotation.x = 0.15; torso.add(r2);
  P.rag = r1;

  root.scale.setScalar(0.95);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, body, P, phase: 0, tilt: 0, twitch: 0, fingerT: 0 };
}
function animMonster(m, dt, speed, tiltTarget = 0){
  const P = m.P; m.phase += dt * (1.1 + speed * 1.3);
  const amp = Math.min(0.6, speed * 0.13), s = Math.sin(m.phase), c = Math.cos(m.phase);
  P.lL.hip.rotation.x = s * amp - 0.05; P.lR.hip.rotation.x = -s * amp - 0.05;
  P.lL.knee.rotation.x = Math.max(0, c) * amp * 1.5 + 0.08; P.lR.knee.rotation.x = Math.max(0, -c) * amp * 1.5 + 0.08;
  const idle = Math.sin(G.time * 0.8) * 0.04;
  // arms hang forward, swaying; when it runs they swing wide
  P.aL.sh.rotation.x = -s * amp * 0.8 + idle - 0.12; P.aR.sh.rotation.x = s * amp * 0.8 - idle - 0.12;
  P.aL.sh.rotation.z = -0.05 - amp * 0.15; P.aR.sh.rotation.z = 0.05 + amp * 0.15;
  P.aL.el.rotation.x = -0.25 - amp * 0.35; P.aR.el.rotation.x = -0.25 - amp * 0.35;
  const lean = speed > 5 ? 0.42 : speed > 2 ? 0.18 : 0.06;
  m.body.rotation.x += (lean - m.body.rotation.x) * Math.min(1, dt * 4);
  m.body.position.y = Math.abs(s) * 0.04 * amp;
  // breathing: the ribcage rises and falls, slow and deep
  const br = Math.sin(G.time * (speed > 2 ? 3.2 : 1.1));
  if (P.chest){ P.chest.scale.set(1 + br * 0.025, 1 + br * 0.012, 1 + br * 0.05); }
  if (P.jaw) P.jaw.rotation.x = 0.06 + Math.max(0, br) * 0.05 + (speed > 5 ? 0.12 : 0);
  m.tilt += (tiltTarget - m.tilt) * Math.min(1, dt * 1.5); P.head.rotation.z = m.tilt;
  m.twitch -= dt; if (m.twitch <= 0){ P.head.rotation.y = Math.random() < 0.6 ? 0 : rnd(-0.5, 0.5); m.twitch = rnd(0.3, 2.2); }
  P.neck.rotation.x = 0.3 + lean * 0.4;
  // fingers: slowly curling, now and then one twitches
  if (P.fingers){ m.fingerT = (m.fingerT || 0) - dt;
    for (let i = 0; i < P.fingers.length; i++){ const f = P.fingers[i]; const base = 0.15 + (i % 3) * 0.1 + Math.sin(G.time * 0.7 + i) * 0.08 + (speed > 4 ? 0.35 : 0); f.rotation.x += (base - f.rotation.x) * Math.min(1, dt * 3); }
    if (m.fingerT <= 0){ const f = P.fingers[(Math.random() * P.fingers.length) | 0]; f.rotation.x = rnd(-0.3, 0.9); m.fingerT = rnd(0.15, 0.9); } }
  if (P.rag) P.rag.rotation.y = Math.sin(G.time * 1.3) * 0.05 + s * amp * 0.08;
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
