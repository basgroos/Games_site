// ================= CHAPTER 3: DON'T LOOK AWAY - the world =================
// Ruth Calloway's house at the end of Blackwater Road, deep in the woods (world x ~ 296..311),
// and the forest behind it (world x ~ 505..600). The hallway can grow: it is built from 2-metre segments.
const OX = 300, OZ = 0, FWX = 520, FZ = 0;
const C3SEG = 2, C3MAXSEG = 18, C3HALL_Z = 10;        // the stretchable part of the hallway starts at z = 10
const C3 = { seg: [], movers: [], hallLights: [], lastLen: -1, lastCarpet: -1, lastPaint: -1, lastClock: -1, lastThermo: -1, lastNewDoor: -1 };
const X3 = v => OX + v;

// ---------- textures ----------
function c3Carpet(variant){
  return ctex(128, 512, (x, w, h) => {
    const base = ['#5b1a1c', '#5b1a1c', '#1f3a2a', '#0d0b0b'][variant], ink = ['#b08a3e', '#b08a3e', '#b9a774', '#3a1112'][variant];
    x.fillStyle = base; x.fillRect(0, 0, w, h); x.fillStyle = ink; x.fillRect(6, 0, 5, h); x.fillRect(w - 11, 0, 5, h);
    for (let y = 16; y < h; y += 32){ x.save(); x.translate(w / 2, y); x.rotate(Math.PI / 4);
      if (variant === 1){ x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill(); }   // the subtle one: circles where the diamonds were
      else x.fillRect(-8, -8, 16, 16);
      x.restore(); }
    if (variant === 3){ for (let i = 0; i < 40; i++){ x.fillStyle = `rgba(80,10,12,${Math.random() * 0.4})`; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 20, 4 + Math.random() * 16, 0, 0, 7); x.fill(); } }
    speckle(x, w, h, 2500, 0.25); grime(x, w, h, 0.2);
  });
}
function c3Painting(v){
  return ctex(256, 192, (x, w, h) => {
    if (v === 4){ // the hallway, going on forever
      x.fillStyle = '#211714'; x.fillRect(0, 0, w, h); const cx = w / 2, cy = h * 0.52;
      for (let i = 0; i < 14; i++){ const s = Math.pow(0.78, i); x.strokeStyle = `rgba(180,140,90,${0.5 * s + 0.05})`; x.strokeRect(cx - 110 * s, cy - 80 * s, 220 * s, 160 * s); }
      x.fillStyle = '#4a1416'; x.beginPath(); x.moveTo(cx - 60, h); x.lineTo(cx - 3, cy); x.lineTo(cx + 3, cy); x.lineTo(cx + 60, h); x.fill();
      x.fillStyle = '#000'; x.fillRect(cx - 2, cy - 9, 4, 12); return;
    }
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0c1118'); g.addColorStop(1, '#1a1d1a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++){ const tx = Math.random() * w, th = 60 + Math.random() * 90; x.fillStyle = `rgba(8,12,10,${0.7 + Math.random() * 0.3})`; x.beginPath(); x.moveTo(tx, h * 0.72 - th); x.lineTo(tx - 14, h * 0.72); x.lineTo(tx + 14, h * 0.72); x.fill(); }
    x.fillStyle = '#121512'; x.fillRect(0, h * 0.72, w, h);
    x.fillStyle = '#2a2622'; x.fillRect(90, 84, 80, 54); x.beginPath(); x.moveTo(84, 86); x.lineTo(130, 60); x.lineTo(176, 86); x.fill();
    x.fillStyle = v === 3 ? '#e7d3a0' : '#c9a35a'; x.fillRect(102, 100, 14, 14); x.fillRect(146, 100, 14, 14); x.fillStyle = '#100c0a'; x.fillRect(126, 112, 10, 26);
    const fig = (fx, fy, s) => { x.fillStyle = '#030303'; x.fillRect(fx - 2 * s, fy - 20 * s, 4 * s, 20 * s); x.beginPath(); x.moveTo(fx - 3 * s, fy - 20 * s); x.lineTo(fx, fy - 27 * s); x.lineTo(fx + 3 * s, fy - 20 * s); x.fill(); };
    if (v === 1) fig(30, h * 0.72, 0.7);                // far away, between the trees
    if (v === 2) fig(70, h * 0.78, 1.3);                // in the yard
    if (v === 3){ x.fillStyle = '#030303'; x.fillRect(104, 100, 10, 14); }   // at the window
    speckle(x, w, h, 900, 0.18);
  }, { clamp: true });
}
function c3Thermo(t){ return ctex(64, 32, (x, w, h) => { x.fillStyle = '#0e1612'; x.fillRect(0, 0, w, h); x.fillStyle = t < 10 ? '#7fb6ff' : '#8cf0a8'; x.font = 'bold 20px monospace'; x.textAlign = 'center'; x.fillText(t + '\u00b0', w / 2, 23); }, { clamp: true }); }
TX.mud = ctex(512, 512, (x, w, h) => { x.fillStyle = '#17150f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++){ x.fillStyle = `hsla(${30 + Math.random() * 60},${10 + Math.random() * 20}%,${5 + Math.random() * 12}%,.8)`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } });
TX.dirt = ctex(256, 256, (x, w, h) => { x.fillStyle = '#2b2219'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, 0.35); for (let i = 0; i < 30; i++){ x.fillStyle = 'rgba(10,8,6,.35)'; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 20, 4 + Math.random() * 10, Math.random() * 3, 0, 7); x.fill(); } });
TX.xmark = ctex(64, 128, (x, w, h) => { x.fillStyle = '#2a2018'; x.fillRect(0, 0, w, h); speckle(x, w, h, 900, 0.4); x.strokeStyle = '#a3140f'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(12, 40); x.lineTo(52, 88); x.moveTo(52, 40); x.lineTo(12, 88); x.stroke(); });
TX.polaroids = ctex(512, 256, (x, w, h) => {
  x.fillStyle = '#3a2f24'; x.fillRect(0, 0, w, h); speckle(x, w, h, 3000, 0.3);
  const years = ['1971', '1983', '1990', '1998', '2009', '2016', '2021', ''];
  for (let i = 0; i < 24; i++){
    const px = 14 + (i % 8) * 62 + Math.random() * 6, py = 14 + Math.floor(i / 8) * 80 + Math.random() * 6, last = i === 23;
    x.save(); x.translate(px + 25, py + 32); x.rotate((Math.random() - 0.5) * 0.2); x.fillStyle = '#e8e2d2'; x.fillRect(-25, -32, 50, 62);
    x.fillStyle = '#0b0e10'; x.fillRect(-21, -28, 42, 40);
    x.fillStyle = '#2a2420'; x.fillRect(-12, -14, 24, 18); x.beginPath(); x.moveTo(-14, -14); x.lineTo(0, -22); x.lineTo(14, -14); x.fill();   // the house, from the trees
    x.fillStyle = '#c9a35a'; x.fillRect(-2, -8, 4, 5);
    x.fillStyle = last ? '#d8d0c0' : '#8a8070'; x.fillRect(-3, -2, 3, 9);                                                           // somebody at the door
    x.fillStyle = last ? '#9a1a12' : '#3a342c'; x.font = last ? 'bold 9px sans-serif' : '8px sans-serif'; x.textAlign = 'center';
    x.fillText(last ? 'TONIGHT' : years[i % 8] || '', 0, 24); x.restore();
  }
});

// ---------- materials ----------
const M3 = {
  hall: std({ map: wallpaper('#8d7b60', '#6d5c44', 'damask', 0.35) }), living: std({ map: wallpaper('#5e6b5c', '#46523f', 'stripe', 0.3) }),
  kitchen: std({ map: wallpaper('#cdbf98', '#bdae86', 'plain', 0.3) }), bath: std({ map: wallpaper('#b9c3c4', '#d8e0e0', 'bathtile', 0.25) }),
  back: std({ map: wallpaper('#7a7a74', '#7a7a74', 'plain', 0.55) }), bedroom: std({ map: wallpaper('#6b5a68', '#4a3c48', 'floral', 0.3) }),
  study: std({ map: wallpaper('#4b3a30', '#3a2c24', 'wainscot', 0.3) }), cabin: std({ map: TX.fence, roughness: 0.95 }),
  carpet: std({ map: c3Carpet(0), roughness: 1 }), siding: std({ map: TX.sidingWarm, color: 0x8a8a8a }),
  mud: std({ map: TX.mud, roughness: 1 }), dirt: std({ map: TX.dirt, roughness: 1 }),
  pine: std({ color: 0x0e1a12, roughness: 1 }), bark: std({ color: 0x1d1610, roughness: 1 }),
  raincoat: std({ color: 0xb08a1c, roughness: 0.35, metalness: 0.05 }), reflector: new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
  glassDark: new THREE.MeshStandardMaterial({ color: 0x161b20, roughness: 0.08, metalness: 0.7, transparent: true, opacity: 0.5, depthWrite: false }),
};
const C3TEX = { carpet: [0, 1, 2, 3].map(c3Carpet), paint: [0, 1, 2, 3, 4].map(c3Painting), thermo: { 20: c3Thermo(20), 4: c3Thermo(4) } };
M3.carpet.map = C3TEX.carpet[0];

// ---------- helpers ----------
function dyn(o){ o.userData.dyn = true; return o; }
function c3Col(mesh, level = 0){ const c = colliderFromObject(mesh, level, 0); return c; }
// a box that belongs to a moving group: its collider follows the group along z
function moverBox(g, w, h, d, mat, x, y, z, o = {}){
  const m = B(w, h, d, mat, x, y, z, Object.assign({ parent: g }, o));
  if (o.occ){ m.userData.occ = true; occluders.push(m); }
  if (o.solid !== false){ g.updateMatrixWorld(true); const c = colliderFromObject(m, o.level || 0, 0); C3.movers.push({ c, z0: c.minZ, z1: c.maxZ, g }); }
  return m;
}

// ---------- the house ----------
function buildC3House(){
  houseRects.push({ minX: X3(-4), maxX: X3(11), minZ: OZ, maxZ: OZ + 10, name: 'c3house' });
  houseRects.push({ minX: X3(2), maxX: X3(6), minZ: OZ + 10, maxZ: OZ + 10 + C3MAXSEG * C3SEG + 4.5, name: 'c3hall' });
  // floors and ceilings
  B(15.2, 0.1, 10.2, M.floor, X3(3.5), -0.1, 5, { uv: [2, 2] });
  B(5, 0.012, 6, M.tile, X3(8.5), 0, 3, { uv: [1, 1] }); B(3, 0.012, 4, M.tile, X3(1.5), 0, 8, { uv: [1, 1] });
  slab(X3(-4), X3(5), 0, 10, 2.9, 0.1, M.floor, M.ceiling); slab(X3(5), X3(6), 4, 10, 2.9, 0.1, M.floor, M.ceiling); slab(X3(5), X3(6), 0, 0.6, 2.9, 0.1, M.floor, M.ceiling);
  slab(X3(6), X3(11), 0, 10, 2.9, 0.1, M.floor, M.ceiling);
  slab(X3(-4), X3(11), 0, 10, 5.9, 0.1, M.roof, M.ceiling);
  roofGable(X3(-4), X3(11), 0, 10, 6, 8.4);
  // --- ground floor, outside walls ---
  const S = M3.siding;
  wall('x', 0, X3(-4), X3(2), 0, S, M3.living, [{ c: X3(-3.1), w: 1.0, win: [0.9, 2.2], name: 'c3livWin' }], { ea: true });
  wall('x', 0, X3(2), X3(6), 0, S, M3.hall, [{ c: X3(4), w: 1.0, h: 2.15 }]);
  wall('x', 0, X3(6), X3(11), 0, S, M3.kitchen, [{ c: X3(8.5), w: 1.4, win: [1.0, 2.1], name: 'c3kitWin' }], { eb: true });
  wall('x', 10, X3(-4), X3(0), 0, M3.back, S, [{ c: X3(-2), w: 1.0, win: [1.2, 2.0] }], { ea: true });
  wall('x', 10, X3(0), X3(2.1), 0, M3.bath, S, [], {}); wall('x', 10, X3(2.7), X3(3), 0, M3.bath, S, [], {});
  wallSeg('x', 10, X3(2.1), X3(2.7), 0, 1.25, M3.bath, S, 0); wallSeg('x', 10, X3(2.1), X3(2.7), 2.15, 3, M3.bath, S, 0, false);
  wall('x', 10, X3(5), X3(7), 0, M3.back, S, [], {});
  wall('x', 10, X3(7), X3(11), 0, M3.kitchen, S, [], { eb: true });
  wall('z', X3(-4), 0.07, 9.93, 0, S, M3.living, [{ c: 3, w: 1.4, win: [0.9, 2.2] }]);
  wall('z', X3(11), 0.07, 9.93, 0, M3.kitchen, S, [{ c: 3, w: 1.4, win: [1.0, 2.1], name: 'c3kitSide' }]);
  // --- ground floor, inside walls ---
  wall('z', X3(2), 0.07, 4, 0, M3.living, M3.hall, [{ c: 2, w: 1.6, h: 2.4 }]);
  wall('x', 4, X3(2), X3(3), 0, M3.hall, M3.living, [], {});
  wall('x', 4, X3(5), X3(6), 0, M3.hall, M3.hall, [], {});
  wall('z', X3(3), 4.07, 9.93, 0, M3.living, M3.hall, [{ c: 8, w: 0.9 }]);          // hallway west wall (bathroom door)
  wall('z', X3(5), 6.07, 9.93, 0, M3.hall, M3.back, [{ c: 8, w: 0.9 }]);            // hallway east wall (closet door)
  wall('x', 6, X3(-4), X3(3), 0, M3.living, M3.bath, [{ c: X3(-2), w: 0.9 }]);
  wall('z', X3(0), 6.07, 9.93, 0, M3.back, M3.bath, []);
  wall('z', X3(6), 0.07, 6, 0, M3.hall, M3.kitchen, [{ c: 5.0, w: 1.0, h: 2.2 }]);    // kitchen, reached from the little vestibule
  wall('x', 6, X3(5), X3(11), 0, M3.kitchen, M3.back, [{ c: X3(9), w: 0.9 }]);
  wall('z', X3(7), 6.07, 9.93, 0, M3.back, M3.kitchen, []);
  // --- upstairs: landing and Ruth's bedroom, the rest closed ---
  wall('x', 0, X3(-4), X3(2), 1, S, M3.bedroom, [{ c: X3(-1), w: 1.4, win: [0.9, 2.1], name: 'c3bedWin' }], { ea: true });
  wall('x', 0, X3(2), X3(11), 1, S, M3.hall, [{ c: X3(4), w: 1.0, win: [1.0, 2.0] }], { eb: true });
  wall('x', 10, X3(-4), X3(11), 1, S, S, [], { ea: true, eb: true });
  wall('z', X3(-4), 0.07, 9.93, 1, S, M3.bedroom, []);
  wall('z', X3(11), 0.07, 9.93, 1, S, S, []);
  wall('x', 6, X3(-4), X3(6), 1, M3.bedroom, S, [], {});
  wall('z', X3(6), 0.07, 5.93, 1, M3.hall, S, []);
  wall('z', X3(2), 0.07, 5.93, 1, M3.bedroom, M3.hall, [{ c: 3.5, w: 0.9 }]);
  // --- stairs in the hall, up along the east wall ---
  for (let i = 0; i < 12; i++) B(1.0, (i + 1) * 0.25, 0.275, M.midWood, X3(5.5), 0, 0.74 + i * 0.275, { cast: i % 3 === 0 });
  stairs.push({ minX: X3(5), maxX: X3(6), minZ: 0.6, maxZ: 3.9, y0: 0, y1: 3 });
  addCollider(X3(4.92), X3(5.0), 0.6, 3.9, 0);
  for (let z = 0.7; z <= 3.9; z += 0.4) B(0.03, 0.95, 0.03, M.trim, X3(4.97), 3, z);
  B(0.06, 0.06, 3.3, M.darkWood, X3(4.97), 3.95, 2.25);
  addCollider(X3(4.92), X3(5.02), 0.6, 3.9, 1); addCollider(X3(5), X3(6), 0.5, 0.62, 1);
  // --- doors ---
  makeDoor({ axis: 'x', fixed: 0, c: X3(4), w: 1.0, into: '+', name: 'c3front', locked: true, mat: M.doorDark, lockedThought: 'Locked. The keys are in the mailbox.' });
  makeDoor({ axis: 'z', fixed: X3(3), c: 8, w: 0.9, into: '-', name: 'c3bath' });
  makeDoor({ axis: 'z', fixed: X3(5), c: 8, w: 0.9, into: '+', name: 'c3closet', hinge: 'max' });
  makeDoor({ axis: 'x', fixed: 6, c: X3(-2), w: 0.9, into: '+', name: 'c3back' });
  makeDoor({ axis: 'x', fixed: 6, c: X3(9), w: 0.9, into: '+', name: 'c3pantry', locked: true, lockedThought: 'The pantry. Locked. There is a smell under the door.' });
  makeDoor({ axis: 'z', fixed: X3(2), c: 3.5, w: 0.9, into: '-', name: 'c3bed', level: 1 });
  // --- lights ---
  FX.c3hall = ceilingLight(X3(3.6), 2.9, 1.6, 0xffcf8f, 0.8, 6, { group: 'c3' });
  FX.c3living = ceilingLight(X3(-1), 2.9, 3, 0xffc98a, 0.7, 7, { group: 'c3', on: false });
  FX.c3lamp = floorLamp(X3(-3.5), 0.5, 0xffb870, 0.85, 5.5, 0, { group: 'c3', on: false });
  FX.c3kitchen = ceilingLight(X3(8.5), 2.92, 3, 0xe8f2ff, 1.0, 7, { group: 'c3', kind: 'tube' });
  FX.c3bath = ceilingLight(X3(1.5), 2.9, 8, 0xf2f0e8, 0.7, 4.5, { group: 'c3' });
  FX.c3back = ceilingLight(X3(-2), 2.9, 8, 0xe0d0b0, 0.5, 4.5, { group: 'c3', kind: 'bare' });
  FX.c3closet = ceilingLight(X3(6), 2.9, 8, 0xe0d0b0, 0.5, 3.5, { group: 'c3', kind: 'bare' });
  FX.c3hallFixed = ceilingLight(X3(4), 2.9, 7, 0xffcf8f, 0.7, 5.5, { group: 'c3' });
  FX.c3landing = ceilingLight(X3(3.6), 5.9, 3, 0xffcf8f, 0.6, 5, { group: 'c3' });
  FX.c3bedroom = ceilingLight(X3(-1), 5.9, 3, 0xffd8a8, 0.6, 6, { group: 'c3', on: false });
  FX.c3porch = ceilingLight(X3(4.75), 2.35, -0.12, 0xffc070, 0.9, 7, { kind: 'porch', group: 'c3', on: false });
  // --- entrance hall ---
  PROPS.c3note = B(0.21, 0.004, 0.28, M.paper, X3(2.45), 0.86, 3.4, { ry: 0.2, cast: false });
  B(0.42, 0.86, 0.8, M.darkWood, X3(2.3), 0, 3.4, { col: 0 });
  PROPS.c3coat = dyn(grp(X3(2.18), 1.2, 1.0)); B(0.05, 0.05, 0.25, M.brass, 0, 0.55, 0, { parent: PROPS.c3coat });
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 1.1, 12, 1, true), M3.raincoat); coat.position.set(0.12, 0, 0); PROPS.c3coat.add(coat);
  PROPS.c3thermo = B(0.14, 0.09, 0.03, M.trim, X3(2.08), 1.45, 0.6, { ry: Math.PI / 2 });
  PROPS.c3thermoScreen = PLANE(0.1, 0.05, new THREE.MeshBasicMaterial({ map: C3TEX.thermo[20] }), X3(2.1), 1.495, 0.6, Math.PI / 2);
  rug(X3(3.6), 1.8, 1.4, 2.6, 0x3b2a22);
  // the hallway carpet, fixed part (z 4..10)
  C3.fixedCarpet = []; for (let i = 0; i < 3; i++){ const c = PLANE(1.2, 2, M3.carpet, X3(4), 0.006, 5 + i * 2, 0, { rx: -Math.PI / 2 }); C3.fixedCarpet.push(c); }
  // the rumpled corner of the carpet (rule three)
  PROPS.c3fold = dyn(grp(X3(4.3), 0.02, 9.2)); B(0.6, 0.05, 0.5, M3.carpet, 0, 0, 0, { parent: PROPS.c3fold, rz: 0.15, ry: 0.3 }); PROPS.c3fold.visible = false;
  // footprints from the front door into the hallway (rule one)
  PROPS.c3steps = dyn(grp(0, 0, 0)); for (let i = 0; i < 9; i++) PLANE(0.14, 0.3, M.puddle, X3(4 + (i % 2 ? 0.13 : -0.13)), 0.009 + i * 0.0001, 0.6 + i * 0.75, 0, { rx: -Math.PI / 2, parent: PROPS.c3steps }); PROPS.c3steps.visible = false;
  // --- living room ---
  couch(X3(-1.2), 4.9, Math.PI, 2.2, M.fabricGreen); armchair(X3(-3.2), 2.2, Math.PI / 2, M.fabricRed);
  table(X3(-1.2), 3.6, 1.0, 0.6, 0.42, M.midWood);
  B(1.6, 1.1, 0.5, M.brick, X3(-1), 0, 0.3, { col: 0 }); B(0.9, 0.6, 0.06, M.black, X3(-1), 0.15, 0.56); B(1.8, 0.08, 0.6, M.darkWood, X3(-1), 1.1, 0.32);
  PROPS.c3paintingMat = std({ map: C3TEX.paint[0], roughness: 0.7 });
  const pf = grp(X3(-1), 1.55, 0.09); B(1.12, 0.86, 0.04, M.darkWood, 0, -0.04, 0, { parent: pf, cast: false }); const pp = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), PROPS.c3paintingMat); pp.position.set(0, 0.39, 0.03); pf.add(pp); PROPS.c3painting = pp;
  PROPS.c3clock = dyn(grp(X3(1.91), 2.1, 3.3)); PROPS.c3clock.rotation.y = -Math.PI / 2;
  CYL(0.2, 0.2, 0.04, M.darkWood, 0, -0.02, 0, { parent: PROPS.c3clock, rx: Math.PI / 2 }); const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), std({ color: 0xe8e0cc, roughness: 0.6 })); face.position.z = 0.025; PROPS.c3clock.add(face);
  PROPS.c3hourHand = dyn(grp(0, 0, 0.03, 0, PROPS.c3clock)); B(0.014, 0.09, 0.005, M.black, 0, 0, 0, { parent: PROPS.c3hourHand });
  PROPS.c3minHand = dyn(grp(0, 0, 0.035, 0, PROPS.c3clock)); B(0.01, 0.14, 0.005, M.black, 0, 0, 0, { parent: PROPS.c3minHand });
  PROPS.c3plant = dyn(grp(X3(1.4), 0, 0.5)); CYL(0.18, 0.14, 0.34, M.pot, 0, 0, 0, { parent: PROPS.c3plant }); for (let i = 0; i < 7; i++) SPH(0.15, M.leaf, rnd(-0.12, 0.12), 0.45 + Math.random() * 0.35, rnd(-0.12, 0.12), { parent: PROPS.c3plant, s: [1, 1.4, 1] });
  PROPS.c3plantCol = addCollider(X3(1.2), X3(1.6), 0.3, 0.7, 0);
  PROPS.c3can = dyn(grp(X3(0.9), 0, 0.4)); CYL(0.08, 0.09, 0.2, M.darkMetal, 0, 0, 0, { parent: PROPS.c3can }); B(0.2, 0.02, 0.02, M.darkMetal, 0.12, 0.17, 0, { parent: PROPS.c3can, rz: 0.6 });
  PROPS.c3phone = dyn(grp(X3(-2.7), 0.42, 3.6)); B(0.2, 0.07, 0.16, M.black, 0, 0, 0, { parent: PROPS.c3phone }); B(0.21, 0.04, 0.05, M.black, 0, 0.07, 0, { parent: PROPS.c3phone });
  B(0.55, 0.42, 0.45, M.darkWood, X3(-2.7), 0, 3.6, { col: 0 });
  PROPS.c3phoneLcd = PLANE(0.06, 0.02, new THREE.MeshBasicMaterial({ color: 0x1a2a18 }), X3(-2.7), 0.5, 3.69, 0, { rx: -0.6 });
  PROPS.c3switch = B(0.08, 0.12, 0.02, M.trim, X3(1.93), 1.3, 0.9, { ry: Math.PI / 2 });
  bookshelf(X3(-3.7), 5.2, Math.PI / 2, 1.2, 1.9);
  rug(X3(-1.2), 3.6, 3, 2.2, 0x40302a);
  // --- kitchen ---
  cabinetRun(X3(6.07), X3(11), 0.32, 0.6, '+', 0, M.white);
  B(0.7, 0.05, 0.45, M.metal, X3(8.5), 0.85, 0.35, { cast: false });
  B(0.8, 1.9, 0.75, M.white, X3(10.55), 0, 5.55, { col: 0 });
  PROPS.c3fridge = hitbox(0.8, 1.9, 0.2, X3(10.55), 0.95, 5.1);
  table(X3(8.5), 3.3, 1.4, 0.9, 0.76, M.lightWood);
  PROPS.c3chair = chair(X3(8.0), 2.55, 0, M.lightWood, 0, true); dyn(PROPS.c3chair.g);
  chair(X3(9.0), 4.05, Math.PI, M.lightWood);
  // --- the package on the porch, and the mailbox by the drive ---
  PROPS.c3package = dyn(grp(X3(5.0), 0, -0.6, 0.3)); B(0.42, 0.28, 0.32, std({ color: 0x8a6a46, roughness: 0.9 }), 0, 0, 0, { parent: PROPS.c3package }); B(0.43, 0.02, 0.06, std({ color: 0xc9c2b0 }), 0, 0.28, 0, { parent: PROPS.c3package });
  hitbox(0.5, 0.4, 0.4, 0, 0.18, 0, PROPS.c3package);
  CYL(0.05, 0.05, 1.1, M.darkWood, X3(1.8), 0, -10.5); PROPS.c3mailbox = B(0.25, 0.24, 0.45, M.darkMetal, X3(1.8), 1.1, -10.5); addCollider(X3(1.7), X3(1.9), -10.6, -10.4, -1);
  B(4, 0.12, 1.8, M.roof, X3(4), 2.6, -0.85); CYL(0.06, 0.06, 2.6, M.trim, X3(2.3), 0, -1.6); CYL(0.06, 0.06, 2.6, M.trim, X3(5.7), 0, -1.6);
  B(1.2, 0.03, 9, M3.dirt, X3(4), -0.02, -5.5, { cast: false, uv: [1.5, 1.5] });
  // --- bathroom: sink, tub, and the mirror (with the space "inside" it) ---
  B(1.5, 0.55, 0.75, M.porcelain, X3(0.8), 0, 9.55, { col: 0 });
  CYL(0.07, 0.09, 0.8, M.porcelain, X3(2.4), 0, 9.6); B(0.45, 0.12, 0.4, M.porcelain, X3(2.4), 0.8, 9.6); addCollider(X3(2.15), X3(2.65), 9.35, 9.85, 0);
  PROPS.c3tap = hitbox(0.5, 0.3, 0.4, X3(2.4), 1.0, 9.6);
  B(0.7, 0.07, 0.05, M.darkWood, X3(2.4), 2.09, 9.905, { cast: false }); B(0.7, 0.07, 0.05, M.darkWood, X3(2.4), 1.2, 9.905, { cast: false });
  B(0.07, 0.96, 0.05, M.darkWood, X3(2.085), 1.2, 9.905, { cast: false }); B(0.07, 0.96, 0.05, M.darkWood, X3(2.715), 1.2, 9.905, { cast: false });
  PROPS.c3mirror = PLANE(0.6, 0.9, M3.glassDark, X3(2.4), 1.7, 9.92, Math.PI);
  const cellM = std({ color: 0x0c0e10, roughness: 0.9 }); B(0.7, 1.0, 0.04, cellM, X3(2.4), 1.2, 11.3); B(0.04, 1.0, 1.3, cellM, X3(2.07), 1.2, 10.65); B(0.04, 1.0, 1.3, cellM, X3(2.73), 1.2, 10.65); B(0.7, 0.04, 1.3, cellM, X3(2.4), 2.18, 10.65); B(0.7, 0.04, 1.3, cellM, X3(2.4), 1.2, 10.65);   // the cell behind the glass
  FX.c3mirrorCell = addFixture(X3(2.4), 1.9, 10.4, 0xc8d0d0, 0.45, 2.2, { group: 'c3', on: false });
  // --- back room and closet ---
  B(0.62, 0.85, 0.62, M.white, X3(-3.5), 0, 9.5, { col: 0 }); B(1.2, 1.8, 0.4, M.darkWood, X3(-1.0), 0, 9.7, { col: 0 });
  PROPS.c3fuse = B(0.45, 0.6, 0.12, M.darkMetal, X3(6.9), 1.2, 8.6, { ry: -Math.PI / 2 });
  B(0.5, 1.8, 0.35, M.darkWood, X3(6.0), 0, 9.75, { col: 0 });
  // --- upstairs bedroom: bed, the wardrobe that opens itself, the window ---
  bed(X3(-2.6), 2.3, -Math.PI / 2, 1, M.fabricRed);
  const wd = grp(X3(1.3), 3, 5.62); B(1.0, 2.0, 0.6, M.darkWood, 0, 0, 0, { parent: wd }); c3Col(wd.children[0], 1);
  PROPS.c3wardDoor = dyn(grp(X3(0.8), 3.05, 5.31)); B(0.48, 1.9, 0.03, M.midWood, 0.24, 0, 0, { parent: PROPS.c3wardDoor }); B(0.48, 1.9, 0.03, M.midWood, 0.74, 0, 0, { parent: PROPS.c3wardDoor });
  PROPS.c3box = hitbox(0.8, 0.5, 0.4, X3(1.3), 3.3, 5.5);
  // --- outside: the yard is closed in by the trees; the road out is blocked by a fallen pine ---
  invisibleWall(X3(-14), X3(-13), -26, 10); invisibleWall(X3(20), X3(21), -26, 10); invisibleWall(X3(-14), X3(21), -26.5, -25.5);
  invisibleWall(X3(-14), X3(-4.1), 9.9, 10.5); invisibleWall(X3(11.1), X3(21), 9.9, 10.5);
  const fallen = grp(X3(4), 0.5, -24, 1.2); B(9, 0.7, 0.7, M3.bark, 0, 0, 0, { parent: fallen }); addCollider(X3(-1), X3(9), -24.6, -23.4, -1);
  // your car, at the end of the road
  const car = grp(X3(7.5), 0, -14, 0.15); B(4.2, 0.7, 1.8, std({ color: 0x2b3a4a, roughness: 0.35, metalness: 0.4 }), 0, 0.3, 0, { parent: car }); B(2.3, 0.55, 1.6, std({ color: 0x0a0c10, roughness: 0.1, metalness: 0.6 }), -0.2, 1.0, 0, { parent: car });
  [[-1.4, 0.9], [1.4, 0.9], [-1.4, -0.9], [1.4, -0.9]].forEach(([x, z]) => CYL(0.33, 0.33, 0.22, M.black, x, 0.2, z, { parent: car, rx: Math.PI / 2 })); colliderFromObject(car, -1, 0); PROPS.c3car = car;
  FX.c3carLights = addFixture(X3(5.3), 0.9, -14.4, 0xfff2d0, 1.6, 12, { group: 'c3', on: false });
  // the woods around the house
  C3.yardTrees = [];
  for (let i = 0; i < 140; i++){ const a = Math.random() * 6.28, r = 16 + Math.random() * 22; const x = X3(4) + Math.cos(a) * r, z = -6 + Math.sin(a) * r; if (z > 12 || (x > X3(-7) && x < X3(14) && z > -3)) continue; if (x > X3(1) && x < X3(10) && z < -2) continue; C3.yardTrees.push([x, z, 9 + Math.random() * 8]); }
  // --- the stretchable hallway: 18 segments of 2 m, and the end (with the study) that slides along ---
  for (let i = 0; i < C3MAXSEG; i++){
    const z0 = C3HALL_Z + i * C3SEG, zc = z0 + C3SEG / 2, g = dyn(grp(0, 0, 0)); g.visible = false;
    const wl = B(WALL_T, 3, C3SEG, M3.hall, X3(3), 0, zc, { parent: g, uv: [1.5, 3] }), wr = B(WALL_T, 3, C3SEG, M3.hall, X3(5), 0, zc, { parent: g, uv: [1.5, 3] });
    [wl, wr].forEach(m => { m.userData.occ = true; occluders.push(m); });
    B(2, 0.1, C3SEG, M.floor, X3(4), -0.1, zc, { parent: g, uv: [2, 2] }); B(2, 0.1, C3SEG, M.ceiling, X3(4), 3.0, zc, { parent: g });
    PLANE(1.2, C3SEG, M3.carpet, X3(4), 0.006, zc, 0, { rx: -Math.PI / 2, parent: g });
    B(0.03, 0.12, C3SEG, M.trim, X3(3.08), 0, zc, { parent: g, cast: false }); B(0.03, 0.12, C3SEG, M.trim, X3(4.92), 0, zc, { parent: g, cast: false });
    if (i % 3 === 1) frame(X3(3.08), 1.4, zc, Math.PI / 2, 0.35, 0.45, photoTex(i % 4), g);
    const cl = addCollider(X3(2.86), X3(3.07), z0, z0 + C3SEG, 0), cr = addCollider(X3(4.93), X3(5.14), z0, z0 + C3SEG, 0); cl.on = cr.on = false;
    let lamp = null; if (i % 2 === 0){ const bulb = SPH(0.06, bulbMat(0xffcf8f), X3(4), 2.88, zc, { parent: g, cast: false }); CYL(0.1, 0.12, 0.05, M.white, X3(4), 2.93, zc, { parent: g, cast: false }); lamp = addFixture(X3(4), 2.7, zc, 0xffcf8f, 0.7, 5.5, { group: 'c3', on: false, bulb }); }
    C3.seg.push({ g, cl, cr, wl, lamp });
  }
  // the door that wasn't there before (rule four): built into segment 4's west wall
  const nd = C3.seg[4], ndz = C3HALL_Z + 4 * C3SEG + 1;
  C3.newDoor = dyn(grp(0, 0, 0)); C3.newDoor.visible = false;
  B(WALL_T, 3, 0.55, M3.hall, X3(3), 0, ndz - 0.725, { parent: C3.newDoor }); B(WALL_T, 3, 0.55, M3.hall, X3(3), 0, ndz + 0.725, { parent: C3.newDoor }); B(WALL_T, 0.85, 0.9, M3.hall, X3(3), 2.15, ndz, { parent: C3.newDoor });
  B(0.2, 2.15, 0.06, M.trim, X3(3.05), 0, ndz - 0.48, { parent: C3.newDoor }); B(0.2, 2.15, 0.06, M.trim, X3(3.05), 0, ndz + 0.48, { parent: C3.newDoor }); B(0.2, 0.07, 1.0, M.trim, X3(3.05), 2.12, ndz, { parent: C3.newDoor });
  C3.ndPivot = grp(X3(3), 0, ndz - 0.45, 0, C3.newDoor); C3.ndPivot.rotation.y = -Math.PI / 2;
  const ndp = B(0.88, 2.1, 0.05, M.lockedDoor, 0.44, 0, 0, { parent: C3.ndPivot }); SPH(0.035, M.brass, 0.78, 1.0, 0.05, { parent: C3.ndPivot });
  C3.ndHit = hitbox(0.88, 2.1, 0.3, 0.44, 1.05, 0, C3.ndPivot);
  C3.ndBrick = B(0.04, 2.1, 0.9, M.brick, X3(2.75), 0, ndz, { parent: C3.newDoor }); C3.ndBrick.visible = false;
  C3.ndDark = B(0.04, 2.1, 0.9, M.black, X3(2.3), 0, ndz, { parent: C3.newDoor });
  C3.ndCol = addCollider(X3(2.96), X3(3.04), ndz - 0.45, ndz + 0.45, 0); C3.ndCol.on = false;
  C3.ndWallCols = [addCollider(X3(2.86), X3(3.07), ndz - 1, ndz - 0.45, 0), addCollider(X3(2.86), X3(3.07), ndz + 0.45, ndz + 1, 0)]; C3.ndWallCols.forEach(c => { c.on = false; });
  C3.ndBrickCol = addCollider(X3(2.7), X3(2.8), ndz - 0.45, ndz + 0.45, 0); C3.ndBrickCol.on = false;
  C3.ndZ = ndz;
  // the end of the hallway and the study behind it (all of it slides)
  const E = C3.end = dyn(grp(0, 0, 0));
  moverBox(E, 0.55, 3, WALL_T, M3.hall, X3(3.275), 0, C3HALL_Z, { occ: true });
  moverBox(E, 0.55, 3, WALL_T, M3.hall, X3(4.725), 0, C3HALL_Z, { occ: true });
  moverBox(E, 1.0, 3, 0.06, M3.study, X3(2.5), 0, C3HALL_Z + 0.2, { occ: true });
  moverBox(E, 1.0, 3, 0.06, M3.study, X3(5.5), 0, C3HALL_Z + 0.2, { occ: true });
  moverBox(E, 0.9, 0.85, WALL_T, M3.hall, X3(4), 2.15, C3HALL_Z, { occ: true, solid: false });
  moverBox(E, WALL_T, 3, 4, M3.study, X3(2), 0, C3HALL_Z + 2, { occ: true });
  moverBox(E, WALL_T, 3, 4, M3.study, X3(6), 0, C3HALL_Z + 2, { occ: true });
  moverBox(E, 4.14, 3, WALL_T, M3.study, X3(4), 0, C3HALL_Z + 4, { occ: true });
  B(4, 0.1, 4, M.floor, X3(4), -0.1, C3HALL_Z + 2, { parent: E, uv: [2, 2] }); B(4, 0.1, 4, M.ceiling, X3(4), 3.0, C3HALL_Z + 2, { parent: E });
  moverBox(E, 1.4, 0.76, 0.7, M.darkWood, X3(4), 0, C3HALL_Z + 3.4);
  C3.letter = B(0.22, 0.004, 0.28, M.paper, X3(3.8), 0.762, C3HALL_Z + 3.3, { parent: E, ry: 0.15, cast: false });
  C3.radio = grp(X3(4.5), 0.76, C3HALL_Z + 3.4, -0.2, E); B(0.3, 0.16, 0.12, std({ color: 0x3a2a1c, roughness: 0.6 }), 0, 0, 0, { parent: C3.radio }); hitbox(0.35, 0.25, 0.2, 0, 0.08, 0, C3.radio);
  moverBox(E, 0.35, 1.9, 1.2, M.darkWood, X3(5.7), 0, C3HALL_Z + 2.4);
  C3.studyPhotos = grp(0, 0, 0, 0, E); [[2.9, 1.5, 0], [3.4, 1.7, 1], [4.6, 1.6, 2], [5.1, 1.4, 3]].forEach(([x, y, v]) => frame(X3(x), y, C3HALL_Z + 3.92, Math.PI, 0.26, 0.32, photoTex(v), C3.studyPhotos));
  C3.studyLampBulb = SPH(0.05, bulbMat(0xffb060), X3(3.3), 1.1, C3HALL_Z + 3.5, { parent: E, cast: false });
  FX.c3study = addFixture(X3(3.3), 1.2, C3HALL_Z + 3.4, 0xffb060, 0.6, 4.5, { group: 'c3', bulb: C3.studyLampBulb });
  C3.studyDoor = makeDoor({ axis: 'x', fixed: C3HALL_Z, c: X3(4), w: 0.9, into: '+', name: 'c3study', locked: true, mat: M.doorDark, lockedThought: 'The study. Locked. A brass keyhole.' });
}

// ---------- the forest ----------
const C3PATH = [[0, 0], [2, 12], [-3, 24], [0, 32], [4, 40], [9, 45.5]];
const C3FAKE = [[0, 32], [-6, 37], [-12, 43], [-16, 47]];
const C3REFL = [[13, 47], [19, 44], [25, 45], [31, 49], [37, 50], [43, 47], [49, 45], [55, 47], [61, 50], [67, 48]];
function F3(x, z){ return [FWX + x, FZ + z]; }
function pathStrip(pts, w, mat, parent = scene){
  for (let i = 0; i < pts.length - 1; i++){
    const [ax, az] = F3(...pts[i]), [bx, bz] = F3(...pts[i + 1]), L = Math.hypot(bx - ax, bz - az), a = Math.atan2(bx - ax, bz - az);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L + 0.8), mat); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, a, 0); m.position.set((ax + bx) / 2, 0.004 + i * 0.0003, (az + bz) / 2); m.receiveShadow = true; parent.add(m);
  }
}
function nearPolyline(x, z, pts, d){ for (let i = 0; i < pts.length - 1; i++){ const [ax, az] = F3(...pts[i]), [bx, bz] = F3(...pts[i + 1]); const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz; let t = ((x - ax) * vx + (z - az) * vz) / L2; t = clamp(t, 0, 1); if (Math.hypot(x - (ax + vx * t), z - (az + vz * t)) < d) return true; } return false; }
function buildForest(){
  houseRects.push({ minX: FWX + 5.5, maxX: FWX + 12.5, minZ: FZ + 46, maxZ: FZ + 52, name: 'c3cabin' });
  B(130, 0.1, 130, M3.mud, FWX + 35, -0.12, FZ + 30, { uv: [3, 3], cast: false });
  pathStrip(C3PATH, 1.6, M3.dirt); pathStrip(C3REFL, 1.2, M3.dirt); C3.fakePath = dyn(grp(0, 0, 0)); pathStrip(C3FAKE, 1.4, M3.dirt, C3.fakePath);
  // the trees: instanced, with a collider each
  const pts = [];
  for (let i = 0; i < 2600 && pts.length < 420; i++){
    const x = FWX - 25 + Math.random() * 115, z = FZ - 15 + Math.random() * 85;
    if (nearPolyline(x, z, C3PATH, 2.6) || nearPolyline(x, z, C3FAKE, 2.4) || nearPolyline(x, z, C3REFL, 2.3)) continue;
    if (x > FWX + 4 && x < FWX + 14 && z > FZ + 43 && z < FZ + 55) continue;       // the cabin's clearing
    if (x > FWX + 68) continue;                                                    // the road
    if (pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.2)) continue;
    pts.push([x, z, 7 + Math.random() * 9]);
  }
  const all = pts.concat(C3.yardTrees.map(t => [t[0], t[1], t[2]]));
  const trunkG = new THREE.CylinderGeometry(0.16, 0.32, 1, 7), coneG = new THREE.ConeGeometry(1, 1, 7);
  const trunks = new THREE.InstancedMesh(trunkG, M3.bark, all.length), cones = new THREE.InstancedMesh(coneG, M3.pine, all.length * 3);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3();
  all.forEach(([x, z, h], i) => {
    mx.compose(new V3(x, h * 0.5, z), q, sc.set(1 + h * 0.03, h, 1 + h * 0.03)); trunks.setMatrixAt(i, mx);
    for (let k = 0; k < 3; k++){ const r = (2.2 - k * 0.55) * (0.8 + h / 40), ch = h * 0.34; mx.compose(new V3(x, h * 0.32 + k * h * 0.2 + ch / 2, z), q.setFromEuler(new THREE.Euler(0, Math.random() * 3, 0)), sc.set(r, ch, r)); cones.setMatrixAt(i * 3 + k, mx); }
    addCollider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, -1);
  });
  trunks.castShadow = cones.castShadow = false; trunks.frustumCulled = cones.frustumCulled = false; scene.add(trunks); scene.add(cones);
  // keep you in the woods
  invisibleWall(FWX - 26, FWX - 25, FZ - 16, FZ + 72); invisibleWall(FWX + 86, FWX + 87, FZ - 16, FZ + 72); invisibleWall(FWX - 26, FWX + 87, FZ - 17, FZ - 16); invisibleWall(FWX - 26, FWX + 87, FZ + 71, FZ + 72);
  invisibleWall(FWX - 3, FWX + 3, FZ - 3, FZ - 2.2);
  // the door you came out of, standing alone in the trees
  const df = C3.forestDoor = dyn(grp(FWX, 0, FZ - 0.6));
  B(0.12, 2.2, 0.14, M.trim, -0.5, 0, 0, { parent: df }); B(0.12, 2.2, 0.14, M.trim, 0.5, 0, 0, { parent: df }); B(1.12, 0.12, 0.14, M.trim, 0, 2.2, 0, { parent: df });
  B(0.9, 2.15, 0.04, M.lockedDoor, -0.0, 0, -0.35, { parent: df, ry: 1.2 });
  // the marked tree (it will be somewhere else later)
  C3.mark = dyn(grp(FWX + 3.4, 0, FZ + 12)); CYL(0.3, 0.38, 9, M3.bark, 0, 0, 0, { parent: C3.mark }); const xm = PLANE(0.5, 1.0, std({ map: TX.xmark, roughness: 1 }), 0, 1.6, -0.36, Math.PI, { parent: C3.mark }); xm.rotation.y = Math.PI * 0.85; xm.position.set(-0.17, 1.6, -0.3);
  addCollider(FWX + 3.1, FWX + 3.7, FZ + 11.7, FZ + 12.3, -1); C3.markCol = colliderFromObject(C3.mark.children[0], -1, 0);
  // the sign: one arm, and later a second one that wasn't there
  C3.sign = grp(FWX + 1.3, 0, FZ + 32); CYL(0.06, 0.06, 2.2, M3.bark, 0, 0, 0, { parent: C3.sign });
  const signTex = t => ctex(128, 32, (x, w, h) => { x.fillStyle = '#4a3a28'; x.fillRect(0, 0, w, h); speckle(x, w, h, 300, 0.3); x.fillStyle = '#e8dcc0'; x.font = 'bold 17px sans-serif'; x.textAlign = 'center'; x.fillText(t, w / 2, 23); }, { clamp: true });
  const arm1 = B(0.9, 0.22, 0.04, std({ map: signTex('ROAD \u2192') }), 0.35, 1.8, 0, { parent: C3.sign, ry: -0.5 });
  C3.signArm2 = dyn(grp(0, 0, 0, 0, C3.sign)); B(0.9, 0.22, 0.04, std({ map: signTex('\u2190 ROAD') }), -0.35, 1.45, 0, { parent: C3.signArm2, ry: 0.6 }); C3.signArm2.visible = false;
  C3.signHit = hitbox(1.4, 1.0, 0.6, 0, 1.6, 0, C3.sign);
  // the cabin
  const cb = 'c3cabin';
  wall('x', FZ + 46, FWX + 6, FWX + 12, 0, M3.cabin, M3.cabin, [{ c: FWX + 9, w: 0.9, h: 2.05 }], { ea: true, eb: true, H: 2.6 });
  wall('x', FZ + 52, FWX + 6, FWX + 12, 0, M3.cabin, M3.cabin, [], { ea: true, eb: true, H: 2.6 });
  wall('z', FWX + 6, FZ + 46.07, FZ + 51.93, 0, M3.cabin, M3.cabin, [{ c: FZ + 49, w: 0.8, win: [1.0, 1.8] }], { H: 2.6 });
  wall('z', FWX + 12, FZ + 46.07, FZ + 51.93, 0, M3.cabin, M3.cabin, [], { H: 2.6 });
  slab(FWX + 5.8, FWX + 12.2, FZ + 45.8, FZ + 52.2, 2.6, 0.12, M.roof, M3.cabin);
  B(6, 0.1, 6, M.floor, FWX + 9, -0.1, FZ + 49, { uv: [2, 2] });
  makeDoor({ axis: 'x', fixed: FZ + 46, c: FWX + 9, w: 0.9, h: 2.05, into: '+', name: 'c3cabinDoor', mat: M.doorDark });
  table(FWX + 9, FZ + 49.6, 1.4, 0.8, 0.76, M.darkWood);
  C3.dollhouse = grp(FWX + 9, 0.76, FZ + 49.6); B(0.5, 0.26, 0.36, M3.siding, 0, 0, 0, { parent: C3.dollhouse }); B(0.56, 0.04, 0.42, M.roof, 0, 0.26, 0, { parent: C3.dollhouse }); B(0.06, 0.06, 0.3, M3.carpet, 0.02, 0.02, 0.32, { parent: C3.dollhouse }); B(0.012, 0.035, 0.012, M3.raincoat, 0.02, 0.06, 0.4, { parent: C3.dollhouse }); hitbox(0.6, 0.35, 0.8, 0, 0.15, 0.15, C3.dollhouse);
  B(1.6, 0.04, 0.35, M.darkWood, FWX + 11.6, 1.0, FZ + 50.6, { ry: Math.PI / 2 }); C3.machine = grp(FWX + 11.55, 1.04, FZ + 50.6); B(0.22, 0.07, 0.16, M.black, 0, 0, 0, { parent: C3.machine }); C3.machineLed = SPH(0.01, new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0.06, 0.075, 0.05, { parent: C3.machine, cast: false }); hitbox(0.3, 0.2, 0.25, 0, 0.05, 0, C3.machine);
  C3.polaroids = PLANE(3.2, 1.6, std({ map: TX.polaroids, roughness: 0.9 }), FWX + 9, 1.45, FZ + 51.92, Math.PI); C3.polHit = hitbox(3.2, 1.6, 0.2, FWX + 9, 1.45, FZ + 51.85);
  B(0.05, 0.05, 0.25, M.brass, FWX + 6.12, 1.7, FZ + 47.2, { ry: Math.PI / 2 });
  FX.c3cabin = addFixture(FWX + 9, 2.2, FZ + 49, 0xffb060, 0.55, 6, { group: 'c3', unstable: 0.1 });
  // red reflector posts to the road (Ruth: follow these, never the signs)
  C3.refl = C3REFL.map(([x, z], i) => { const g = dyn(grp(FWX + x + 0.9, 0, FZ + z)); CYL(0.04, 0.05, 1.0, std({ color: 0xd8d4c8, roughness: 0.6 }), 0, 0, 0, { parent: g }); B(0.06, 0.12, 0.02, M3.reflector, 0, 0.85, -0.05, { parent: g }); B(0.06, 0.12, 0.02, M3.reflector, 0, 0.85, 0.05, { parent: g }); return g; });
  // the road
  B(9, 0.04, 90, M.asphalt, FWX + 76, -0.02, FZ + 30, { uv: [4, 4], cast: false });
  for (let z = -10; z < 72; z += 5) B(0.12, 0.005, 2.2, std({ color: 0x9a8a50 }), FWX + 76, 0.01, FZ + z, { cast: false });
  const rs = grp(FWX + 71.2, 0, FZ + 52); CYL(0.04, 0.04, 2.2, M.metal, 0, 0, 0, { parent: rs }); PLANE(0.9, 0.3, std({ map: ctex(128, 40, (x, w, h) => { x.fillStyle = '#1d5a2c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#fff'; x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.fillText('BLACKWATER RD', w / 2, 26); }, { clamp: true }) }), 0, 2.0, 0.03, Math.PI * 1.5, { parent: rs });
  CYL(0.07, 0.09, 4.6, M.darkMetal, FWX + 72.2, 0, FZ + 49.5); B(2.6, 0.08, 0.08, M.darkMetal, FWX + 73.4, 4.5, FZ + 49.5);
  const roadBulb = B(0.5, 0.1, 0.25, bulbMat(0xff9a40), FWX + 74.5, 4.38, FZ + 49.5, { cast: false });
  FX.c3road = addFixture(FWX + 74.5, 4.2, FZ + 49.5, 0xff9a40, 1.9, 16, { group: 'c3', unstable: 0.15, bulb: roadBulb });
}

// ---------- the thing in the raincoat ----------
// Very tall and narrow, in a long wet raincoat with the hood up. Where its face should be is the back of a head.
// It never moves while someone is looking at it.
function buildSitter(){
  const root = dyn(new THREE.Group()); scene.add(root); root.visible = false;
  const coatMat = std({ color: 0x2e2810, roughness: 0.55, metalness: 0.05 }), dark = std({ color: 0x050505, roughness: 1 }), hair = std({ color: 0x1a120c, roughness: 0.9 }), skin = std({ color: 0xa89f92, roughness: 0.6 });
  const lathe = (pts, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), mat); m.castShadow = true; return m; };
  const coat = lathe([[0.4, 0.02], [0.37, 0.35], [0.3, 1.0], [0.27, 1.55], [0.3, 1.85], [0.33, 2.0], [0.27, 2.12], [0.12, 2.2], [0.0, 2.22]], coatMat, 20); coat.material.side = THREE.DoubleSide; coat.scale.z = 0.62; root.add(coat);
  for (let i = 0; i < 7; i++){ const t = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.22 + Math.random() * 0.2), coatMat); const a = i / 7 * Math.PI * 2; t.position.set(Math.sin(a) * 0.39, 0.05, Math.cos(a) * 0.25); t.rotation.y = a; t.rotation.x = 0.1; root.add(t); }   // ragged hem
  const inside = lathe([[0.38, 0.03], [0.34, 0.45], [0.0, 0.46]], dark, 16); inside.scale.z = 0.62; root.add(inside);
  const hoodG = new THREE.Group(); hoodG.position.set(0, 2.16, 0.02); hoodG.rotation.x = 0.28; hoodG.rotation.z = 0.12; root.add(hoodG);
  const hood = lathe([[0.0, 0.0], [0.17, 0.02], [0.2, 0.26], [0.16, 0.48], [0.07, 0.62], [0.0, 0.66]], coatMat, 18); hood.material = coatMat.clone(); hood.material.side = THREE.DoubleSide; hoodG.add(hood);
  const hollow = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), dark); hollow.position.set(0, 0.28, 0.185); hollow.scale.y = 1.4; hoodG.add(hollow);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), hair); head.position.set(0, 0.27, 0.07); head.scale.set(0.95, 1.18, 1); hoodG.add(head);       // the back of a head, facing you
  for (let i = 0; i < 9; i++){ const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.3 + Math.random() * 0.25, 4), hair); st.position.set((Math.random() - 0.5) * 0.18, 0.08, 0.12 + Math.random() * 0.04); st.rotation.z = (Math.random() - 0.5) * 0.3; hoodG.add(st); }   // wet hair hanging out
  [-1, 1].forEach(s => { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), skin); ear.scale.set(0.5, 1.2, 1); ear.position.set(s * 0.108, 0.27, 0.03); hoodG.add(ear); });
  [-1, 1].forEach(s => {
    const sl = lathe([[0.0, 0], [0.07, 0.02], [0.06, 0.9], [0.0, 0.92]], coatMat, 10); sl.rotation.x = Math.PI; sl.position.set(s * 0.32, 2.02, 0.0); sl.rotation.z = s * -0.05; root.add(sl);
    const arm = lathe([[0, 0], [0.02, 0.01], [0.018, 0.5], [0, 0.52]], skin, 8); arm.rotation.x = Math.PI; arm.position.set(s * 0.35, 1.12, 0.0); root.add(arm);
    const hand = new THREE.Group(); hand.position.set(s * 0.35, 0.6, 0.0); root.add(hand);
    for (let f = 0; f < 4; f++){ const fg = lathe([[0, 0], [0.007, 0.01], [0.005, 0.22], [0, 0.24]], skin, 6); fg.rotation.x = Math.PI; fg.position.set((f - 1.5) * 0.012, 0, 0); fg.rotation.z = (f - 1.5) * 0.05; hand.add(fg); }
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.24), skin); foot.position.set(s * 0.09, 0.02, 0.12); root.add(foot);
  });
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return root;
}
