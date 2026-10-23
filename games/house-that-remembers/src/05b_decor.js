// =====================================================================
//  DECAY — cobwebs, water stains, grime, debris, cracks (realism pass)
// =====================================================================
const DECAL = {};
function buildDecals() {
  const mk = (w, h, fn) => { const c = makeCanvas(w, h); fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
  DECAL.web = mk(256, 256, (x, w, h) => {
    x.strokeStyle = 'rgba(225,222,212,.55)'; x.lineWidth = 1;
    const rays = 9; const ang = []; for (let i = 0; i < rays; i++) ang.push(i / (rays - 1) * Math.PI / 2);
    ang.forEach(a => { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * w * 1.1, Math.sin(a) * h * 1.1); x.stroke(); });
    for (let r = 18; r < w * 1.05; r += rand(12, 22)) { x.beginPath(); for (let i = 0; i < rays; i++) { const a = ang[i], rr = r * (1 + rand(-.06, .06)); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) x.moveTo(px, py); else { const pa = ang[i - 1]; const mx = Math.cos((a + pa) / 2) * rr * .86, my = Math.sin((a + pa) / 2) * rr * .86; x.quadraticCurveTo(mx, my, px, py); } } x.globalAlpha = rand(.4, .9); x.stroke(); x.globalAlpha = 1; }
    x.fillStyle = 'rgba(200,196,186,.18)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(rand(0, w * .6), rand(0, h * .6), rand(1, 4), 0, TAU); x.fill(); }
  });
  DECAL.stain = mk(256, 256, (x, w, h) => {
    const img = x.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i - w / 2) / (w / 2), dy = (j - h / 2) / (h / 2); const r = Math.sqrt(dx * dx + dy * dy) + (NZ.fbm(i * .03, j * .03, 4) - .5) * .7;
      const ring = Math.exp(-Math.pow((r - .78) * 9, 2)) * .65; const fill = r < .78 ? .22 + NZ.fbm(i * .05 + 9, j * .05, 3) * .2 : 0;
      const a = clamp(ring + fill, 0, .85); const o = (j * w + i) * 4; d[o] = 70; d[o + 1] = 52; d[o + 2] = 30; d[o + 3] = a * 255;
    }
    x.putImageData(img, 0, 0);
  });
  DECAL.streak = mk(128, 256, (x, w, h) => {
    for (let k = 0; k < 7; k++) {
      const cx = rand(20, w - 20), len = rand(.4, 1) * h, wd = rand(4, 14);
      const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(60,45,28,.55)'); g.addColorStop(1, 'rgba(60,45,28,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx - wd, 0); x.quadraticCurveTo(cx + rand(-6, 6), len * .6, cx, len); x.quadraticCurveTo(cx + rand(-6, 6), len * .6, cx + wd, 0); x.fill();
    }
    const g2 = x.createLinearGradient(0, 0, 0, 40); g2.addColorStop(0, 'rgba(50,38,24,.6)'); g2.addColorStop(1, 'rgba(50,38,24,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, 40);
  });
  DECAL.grime = mk(256, 256, (x, w, h) => {
    const img = x.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i - w / 2) / (w / 2), dy = (j - h / 2) / (h / 2); const fall = clamp(1 - Math.sqrt(dx * dx + dy * dy), 0, 1);
      const n = NZ.fbm(i * .04 + 3, j * .04, 5); const a = clamp((n - .35) * 1.6, 0, 1) * fall * .75;
      const o = (j * w + i) * 4; d[o] = 22; d[o + 1] = 18; d[o + 2] = 14; d[o + 3] = a * 255;
    }
    x.putImageData(img, 0, 0);
  });
  DECAL.crack = mk(256, 256, (x, w, h) => {
    x.strokeStyle = 'rgba(20,16,12,.85)'; x.lineCap = 'round';
    const branch = (px, py, a, len, wd, depth) => { let cx = px, cy = py; x.lineWidth = wd; x.beginPath(); x.moveTo(cx, cy); const n = Math.floor(len / 8); for (let i = 0; i < n; i++) { a += rand(-.5, .5); cx += Math.cos(a) * 8; cy += Math.sin(a) * 8; x.lineTo(cx, cy); if (depth < 3 && Math.random() < .12) { x.stroke(); branch(cx, cy, a + rand(-1, 1), len * .45, wd * .6, depth + 1); x.lineWidth = wd; x.beginPath(); x.moveTo(cx, cy); } } x.stroke(); };
    branch(w * .5, 6, Math.PI / 2, h * .95, 2.4, 0);
  });
  DECAL.paper = mk(128, 160, (x, w, h) => {
    x.fillStyle = '#cfc6ad'; x.fillRect(4, 4, w - 8, h - 8); x.fillStyle = 'rgba(70,60,40,.5)'; for (let i = 0; i < 12; i++) x.fillRect(14, 20 + i * 10, rand(40, w - 30), 2);
    x.fillStyle = 'rgba(90,70,40,.35)'; x.beginPath(); x.arc(rand(20, 100), rand(30, 120), rand(14, 30), 0, TAU); x.fill();
  });
  DECAL.leaves = mk(256, 256, (x, w, h) => {
    for (let i = 0; i < 40; i++) { x.save(); x.translate(rand(20, w - 20), rand(20, h - 20)); x.rotate(rand(0, TAU)); x.fillStyle = pick(['#4a3520', '#5a3f22', '#3a2a18', '#6a4a26']); x.beginPath(); x.ellipse(0, 0, rand(6, 12), rand(3, 6), 0, 0, TAU); x.fill(); x.restore(); }
  });
}
function decalMat(tex, opts = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, opts));
}
// decorate the inside of one rectangular room
function decorateRoom(x1, x2, z1, z2, y0, h, o = {}) {
  const parent = o.parent || W.scene; const lv = o.lv;
  const m = WALL_T / 2 + .012; const top = y0 + h - .005;
  const add = (w, hh, x, y, z, mat, rot) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), mat); p.position.set(x, y, z); if (rot) p.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); p.renderOrder = 2; parent.add(p); return p; };
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  // cobwebs in upper corners
  const webM = decalMat(DECAL.web, { side: THREE.DoubleSide, opacity: o.webs === 0 ? 0 : .9 });
  [[x1, z1], [x2, z1], [x1, z2], [x2, z2]].forEach(([wx, wz]) => {
    if (Math.random() < (o.webChance || .7)) {
      const s = rand(.5, .95); const px = wx + Math.sign(cx - wx) * (s * .32 + m), pz = wz + Math.sign(cz - wz) * (s * .32 + m);
      const web = add(s, s, px, top - s * .32, pz, webM); web.lookAt(cx, top - .5, cz); web.rotateZ(Math.PI * .75);
    }
  });
  // water stains on the ceiling
  const stM = decalMat(DECAL.stain, { opacity: .85 });
  for (let i = 0; i < (o.stains == null ? 2 : o.stains); i++) { const s = rand(.8, 1.8); add(s, s * rand(.7, 1.2), rand(x1 + 1, x2 - 1), top - .002, rand(z1 + 1, z2 - 1), stM, [Math.PI / 2, 0, rand(0, TAU)]); }
  // streaks running down from the ceiling on the walls
  const skM = decalMat(DECAL.streak, { opacity: .8 });
  for (let i = 0; i < (o.streaks == null ? 2 : o.streaks); i++) {
    const side = Math.floor(rand(0, 4)), w = rand(.5, 1.1), hh = rand(.6, .9), y = top - hh / 2;
    if (side === 0) add(w, hh, x1 + m, y, rand(z1 + .8, z2 - .8), skM, [0, Math.PI / 2, 0]);
    else if (side === 1) add(w, hh, x2 - m, y, rand(z1 + .8, z2 - .8), skM, [0, -Math.PI / 2, 0]);
    else if (side === 2) add(w, hh, rand(x1 + .8, x2 - .8), y, z1 + m, skM, [0, 0, 0]);
    else add(w, hh, rand(x1 + .8, x2 - .8), y, z2 - m, skM, [0, Math.PI, 0]);
  }
  // cracks high on the walls
  if (Math.random() < (o.crack == null ? .6 : o.crack)) { const crM = decalMat(DECAL.crack, { opacity: .8 }); const w = rand(.5, .9); add(w, w, x1 + m, top - w / 2, rand(z1 + .8, z2 - .8), crM, [0, Math.PI / 2, 0]); }
  // grime and debris on the floor
  const grM = decalMat(DECAL.grime, { opacity: .85 });
  const n = o.grime == null ? 4 : o.grime;
  for (let i = 0; i < n; i++) {
    const along = Math.random() < .5; const s = rand(.8, 1.6);
    const px = along ? (Math.random() < .5 ? x1 + .45 : x2 - .45) : rand(x1 + .5, x2 - .5);
    const pz = along ? rand(z1 + .5, z2 - .5) : (Math.random() < .5 ? z1 + .45 : z2 - .45);
    add(s, s, px, y0 + .006, pz, grM, [-Math.PI / 2, 0, rand(0, TAU)]);
  }
  const ppM = decalMat(DECAL.paper, { transparent: false, depthWrite: true });
  for (let i = 0; i < (o.papers == null ? 2 : o.papers); i++) add(.21, .27, rand(x1 + .6, x2 - .6), y0 + .008, rand(z1 + .6, z2 - .6), ppM, [-Math.PI / 2, 0, rand(0, TAU)]);
}
function decorateHouse() {
  if (!DECAL.web) buildDecals();
  decorateRoom(-2, 2, -14, 4, 0, 3.15, { papers: 1, grime: 5 });
  decorateRoom(2, 10, -6, 4, 0, 3.15, { papers: 3 });
  decorateRoom(-13, -5, -9, 1, 0, 3.15, { parent: W.dining, papers: 1 });
  decorateRoom(2, 6, -14, -6, 0, 6.3, { stains: 1, streaks: 3, grime: 1, papers: 0 });
  decorateRoom(-2, 2, -14, 4, UY, 2.9, { papers: 1, grime: 4 });
  decorateRoom(2, 10, -6, 4, UY, 2.9, { papers: 2 });
  decorateRoom(-10, -2, -14, -9, UY, 2.9, { papers: 0, stains: 3, streaks: 4 });
  decorateRoom(-10, -2, -9, -4, UY, 2.9, { papers: 2 });
  decorateRoom(-10, -2, -4, 4, UY, 2.9, { papers: 1, grime: 2, stains: 1, streaks: 1, crack: 0 });
  decorateRoom(-22, -10, -.5, .5, UY, 2.0, { webChance: 1, stains: 2, streaks: 0, crack: 0, grime: 3, papers: 0 });
  decorateRoom(-10, 10, -36, -24, BY, 3.1, { stains: 4, streaks: 5, grime: 8, papers: 4, webChance: 1 });
  decorateRoom(-4, 4, -44, -36, BY, 3.1, { stains: 2, streaks: 3, grime: 3, papers: 0, webChance: 1 });
  decorateRoom(-24, -10, -31, -29, BY, 2.3, { stains: 1, streaks: 2, grime: 3, papers: 0, webChance: 1 });
  decorateRoom(10, 24, -31, -29, BY, 2.3, { stains: 1, streaks: 2, grime: 3, papers: 0, webChance: 1 });
  // leaves blown in by the front door
  const lm = decalMat(DECAL.leaves);
  [[0, 2.8], [-1.2, 1.8], [1.1, 3.3]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), lm); p.rotation.x = -Math.PI / 2; p.rotation.z = rand(0, TAU); p.position.set(x, .009, z); W.scene.add(p); });

}
