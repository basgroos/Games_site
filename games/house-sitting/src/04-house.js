// ================= THE HENDERSON HOUSE, YARDS AND STREET =================
const PROPS = {}; const FX = {};
M.bin = std({ color: 0x1d3527, roughness: 0.6 }); M.bag = std({ color: 0x0b0b0c, roughness: 0.25, metalness: 0.1 }); M.dirty = std({ color: 0x8f8670, roughness: 1 });

function slab(x0, x1, z0, z1, yb, h, top, bot){
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const geo = new THREE.BoxGeometry(w, h, d); worldUV(geo, cx, yb + h / 2, cz, 2, 2, 0);
  const m = new THREE.Mesh(geo, [bot, bot, top, bot, bot, bot]); m.position.set(cx, yb + h / 2, cz); m.receiveShadow = true; m.castShadow = true; scene.add(m);
  m.userData.occ = true; occluders.push(m); return m;
}
// a thin thing mounted on a wall; n = '+x' | '-x' | '+z' | '-z' (direction it faces)
function wallThing(x, y, z, n, w, h, t, mat){ const ax = n[1] === 'x'; const s = n[0] === '+' ? 1 : -1; return B(ax ? t : w, h, ax ? w : t, mat, x + (ax ? s * t / 2 : 0), y, z + (ax ? 0 : s * t / 2), { cast: false }); }
function lightSwitch(x, y, z, n, room){
  const m = wallThing(x, y, z, n, 0.08, 0.12, 0.02, M.trim); const p = m.position.clone();
  addInter(m, 'Light switch', () => {
    if (!G.power){ SND.click(p); think('Click. Nothing. The power is out.', 2); return; }
    const fs = fixtures.filter(f => f.room === room && f.group === 'house'); const on = !fs.some(f => f.on); fs.forEach(f => { f.on = on; }); SND.click(p);
  });
}
function gable(x, z0, z1, y0, y1, mat){
  const sh = new THREE.Shape(); sh.moveTo(z0, 0); sh.lineTo(z1, 0); sh.lineTo((z0 + z1) / 2, y1 - y0); sh.lineTo(z0, 0);
  const geo = new THREE.ShapeGeometry(sh); const pos = geo.attributes.position; const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 1.5, (pos.getY(i) + 1) / 3);
  const m = new THREE.Mesh(geo, mat.clone()); m.material.side = THREE.DoubleSide; m.rotation.y = -Math.PI / 2; m.position.set(x, y0, 0); scene.add(m); return m;
}
function roofGable(x0, x1, z0, z1, yEave, yRidge, mat = M.roof){
  const run = (z1 - z0) / 2 + 0.6, rise = yRidge - yEave, L = Math.hypot(run, rise), ang = Math.atan2(rise, run), zc = (z0 + z1) / 2;
  const a = B(x1 - x0 + 1, 0.14, L, mat, (x0 + x1) / 2, (yEave + yRidge) / 2 - 0.07, zc - run / 2 + 0.3, { rx: -ang, uv: [2, 2] }); a.position.z = z0 - 0.6 + run / 2; a.position.y = yEave + rise / 2;
  const b = B(x1 - x0 + 1, 0.14, L, mat, (x0 + x1) / 2, (yEave + yRidge) / 2 - 0.07, zc + run / 2, { rx: ang, uv: [2, 2] }); b.position.z = z1 + 0.6 - run / 2; b.position.y = yEave + rise / 2;
  gable(x0 + 0.01, z0, z1, yEave, yRidge, M.siding); gable(x1 - 0.01, z0, z1, yEave, yRidge, M.siding);
}

function buildHouse(){
  // ---- floors ----
  B(16, 0.1, 12, M.floor, 8, -0.1, 6, { uv: [2, 2] });
  B(10, 0.012, 6, M.tile, 11, 0, 9, { uv: [1, 1] }); B(6, 0.012, 4, M.tile, 3, 0, 10, { uv: [1, 1] });
  slab(0, 8.6, 0, 12, 2.9, 0.1, M.floor, M.ceiling); slab(10, 16, 0, 12, 2.9, 0.1, M.floor, M.ceiling);
  slab(8.6, 10, 0, 1.5, 2.9, 0.1, M.floor, M.ceiling); slab(8.6, 10, 6, 12, 2.9, 0.1, M.floor, M.ceiling);
  B(6, 0.012, 7, M.carpet, 3, 3, 3.5, { uv: [1, 1] });
  slab(0, 16, 0, 12, 5.9, 0.1, M.roof, M.ceiling);
  roofGable(0, 16, 0, 12, 6, 8.2);
  // ---- ground floor walls ----
  wall('x', 0, 0, 6, 0, M.siding, M.living, [{ c: 3, w: 2.2, win: [0.9, 2.2], name: 'livFront' }], { ea: true });
  wall('x', 0, 6, 10, 0, M.siding, M.hall, [{ c: 8, w: 1.0, h: 2.15 }]);
  wall('x', 0, 10, 16, 0, M.siding, M.dining, [{ c: 13, w: 2, win: [0.9, 2.2], name: 'dinFront' }], { eb: true });
  wall('x', 12, 0, 3, 0, M.laundry, M.siding, [{ c: 1.5, w: 1, win: [1.2, 2.0] }], { ea: true });
  wall('x', 12, 3, 6, 0, M.bath, M.siding, [{ c: 4.5, w: 0.8, win: [1.4, 2.0] }]);
  wall('x', 12, 6, 16, 0, M.kitchen, M.siding, [{ c: 8, w: 1.8, win: [1.0, 2.2], name: 'kitchenWin' }, { c: 12.5, w: 1.0, h: 2.15 }], { eb: true });
  wall('z', 0, 0.07, 8, 0, M.siding, M.living, [{ c: 6.2, w: 1.6, win: [0.9, 2.2], name: 'livSide' }]);
  wall('z', 0, 8, 11.93, 0, M.siding, M.laundry);
  wall('z', 16, 0.07, 6, 0, M.dining, M.siding, [{ c: 3, w: 1.6, win: [0.9, 2.2] }]);
  wall('z', 16, 6, 11.93, 0, M.kitchen, M.siding, [{ c: 9.2, w: 1.4, win: [1.0, 2.1], name: 'kitchenSide' }]);
  wall('z', 6, 0.07, 6, 0, M.living, M.hall, [{ c: 2.5, w: 2.0, h: 2.4 }]);
  wall('z', 6, 6, 8, 0, M.living, M.kitchen, [{ c: 7.0, w: 0.95 }]);
  wall('z', 6, 8, 11.93, 0, M.bath, M.kitchen);
  wall('x', 8, 0.07, 3, 0, M.living, M.laundry, [{ c: 1.5, w: 0.9 }]);
  wall('x', 8, 3, 5.93, 0, M.living, M.bath, [{ c: 4.5, w: 0.85 }]);
  wall('z', 3, 8.07, 11.93, 0, M.laundry, M.bath);
  wall('x', 6, 6.07, 10, 0, M.hall, M.kitchen, [{ c: 7.25, w: 2.1, h: 2.4 }]);
  wall('x', 6, 10, 15.93, 0, M.dining, M.kitchen, [{ c: 13, w: 1.6, h: 2.3 }]);
  wall('z', 10, 0.07, 5.93, 0, M.hall, M.dining, [{ c: 0.75, w: 1.0, h: 2.15 }]);
  // ---- upstairs walls ----
  wall('x', 0, 0, 6, 1, M.siding, M.bedroom, [{ c: 3, w: 1.6, win: [0.9, 2.1], name: 'bedFront' }], { ea: true });
  wall('x', 0, 6, 10, 1, M.siding, M.upHall, [{ c: 8, w: 1.0, win: [1.0, 2.0] }]);
  wall('x', 0, 10, 16, 1, M.siding, M.storage, [{ c: 13, w: 1.6, win: [0.9, 2.1] }], { eb: true });
  wall('x', 12, 0, 6, 1, M.storage, M.siding, [{ c: 3, w: 1.2, win: [1, 2] }], { ea: true });
  wall('x', 12, 6, 10, 1, M.locked, M.siding, [{ c: 8, w: 1.0, win: [1.0, 2.0], boarded: '-' }]);
  wall('x', 12, 10, 16, 1, M.storage, M.siding, [{ c: 13, w: 1.2, win: [1, 2] }], { eb: true });
  wall('z', 0, 0.07, 7, 1, M.siding, M.bedroom, [{ c: 2, w: 1.2, win: [0.9, 2.1], name: 'bedSide' }]);
  wall('z', 0, 7, 11.93, 1, M.siding, M.storage);
  wall('z', 16, 0.07, 11.93, 1, M.storage, M.siding, [{ c: 3, w: 1.4, win: [0.9, 2.1] }]);
  wall('z', 6, 0.07, 7, 1, M.bedroom, M.upHall, [{ c: 3.5, w: 0.9 }]);
  wall('x', 7, 0.07, 5.93, 1, M.bedroom, M.storage);
  wall('z', 6, 7, 9, 1, M.storage, M.upHall); wall('z', 6, 9, 11.93, 1, M.storage, M.locked);
  wall('z', 10, 0.07, 7, 1, M.upHall, M.storage, [{ c: 6.6, w: 0.9 }]); wall('z', 10, 7, 9, 1, M.upHall, M.storage); wall('z', 10, 9, 11.93, 1, M.locked, M.storage);
  wall('x', 9, 6.07, 9.93, 1, M.upHall, M.locked, [{ c: 8, w: 1.0 }]);
  wall('x', 7, 10.07, 15.93, 1, M.storage, M.storage);
  // ---- stairs ----
  for (let i = 0; i < 15; i++) B(1.4, (i + 1) * 0.2, 0.3, M.midWood, 9.3, 0, 1.65 + i * 0.3, { cast: i % 3 === 0 });
  stairs.push({ minX: 8.6, maxX: 10, minZ: 1.5, maxZ: 6, y0: 0, y1: 3 });
  addCollider(8.53, 8.62, 1.5, 6, 0);
  const rail = B(0.06, 0.06, 5.45, M.darkWood, 8.64, 2.35, 3.75, { rx: -Math.atan2(3, 4.5) });
  for (let i = 0; i < 5; i++) B(0.05, 0.9, 0.05, M.darkWood, 8.64, i * 0.67 * 0.9 + 0.2, 1.7 + i * 1.0);
  // upstairs banister around the stair hole
  B(0.06, 0.06, 4.5, M.darkWood, 8.6, 3.95, 3.75); B(1.4, 0.06, 0.06, M.darkWood, 9.3, 3.95, 1.5);
  for (let z = 1.5; z <= 6.01; z += 0.25) B(0.03, 0.95, 0.03, M.trim, 8.6, 3, z);
  for (let x = 8.85; x < 10; x += 0.25) B(0.03, 0.95, 0.03, M.trim, x, 3, 1.5);
  addCollider(8.5, 8.68, 1.5, 6, 1); addCollider(8.5, 10, 1.42, 1.58, 1);

  // ---- doors ----
  makeDoor({ axis: 'x', fixed: 0, c: 8, w: 1.0, into: '+', name: 'front', locked: true, mat: M.doorDark, lockedThought: "Locked. Mrs. Henderson said the spare key is under the flowerpot." });
  makeDoor({ axis: 'z', fixed: 6, c: 7.0, w: 0.95, into: '-', name: 'livKit', open: true });
  makeDoor({ axis: 'x', fixed: 8, c: 1.5, w: 0.9, into: '+', name: 'laundry' });
  makeDoor({ axis: 'x', fixed: 8, c: 4.5, w: 0.85, into: '+', name: 'bath', hinge: 'max' });
  makeDoor({ axis: 'x', fixed: 12, c: 12.5, w: 1.0, into: '-', name: 'back', glass: true, mat: M.trim, hinge: 'max' });
  makeDoor({ axis: 'z', fixed: 6, c: 3.5, w: 0.9, into: '-', name: 'bedroom', level: 1, open: true });
  makeDoor({ axis: 'z', fixed: 10, c: 6.6, w: 0.9, into: '+', name: 'owners', level: 1, locked: true, lockedThought: "The Hendersons' bedroom. Locked. Fair enough." });
  const ld = makeDoor({ axis: 'x', fixed: 9, c: 8, w: 1.0, into: '+', name: 'locked', level: 1, locked: true, mat: M.lockedDoor, lockedThought: 'Three padlocks, a deadbolt and a chain. All on this side of the door.' });
  // locks on the hall face of the locked door
  PROPS.locks = [];
  [[0.78, 0.8], [0.78, 1.25], [0.78, 1.7]].forEach(([lx, ly], i) => {
    const lg = new THREE.Group(); lg.position.set(lx, ly, -0.07); ld.panel.add(lg);
    B(0.16, 0.05, 0.02, M.darkMetal, 0, -0.025, 0, { parent: lg }); const body = B(0.08, 0.09, 0.035, M.brass, 0.03, -0.14, -0.01, { parent: lg });
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), M.metal); sh.position.set(0.03, -0.05, -0.01); lg.add(sh);
    PROPS.locks.push(lg);
  });
  const chain = new THREE.Group(); chain.position.set(0.5, 1.95, -0.06); ld.panel.add(chain);
  for (let i = 0; i < 9; i++){ const l = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 5, 8), M.metal); l.position.set(i * 0.035, 0, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; chain.add(l); }
  PROPS.chain = chain;
  B(1.0, 0.004, 0.08, M.white, 8, 3, 8.88, { cast: false }); // a line of salt across the threshold
  const stainF = PLANE(1.0, 0.7, M.stain, 8, 3.006, 8.7, 0, { rx: -Math.PI / 2 });

  // ---- lights & switches ----
  FX.living = ceilingLight(3, 2.9, 4, 0xffcf8f, 1.0, 7.5, { room: 'living' });
  FX.livLamp = floorLamp(0.5, 0.5, 0xffc27a, 0.8, 5.5, 0, { room: 'living' });
  FX.hall = ceilingLight(7.4, 2.9, 3, 0xffd59a, 0.9, 6.5, { room: 'hall' });
  FX.dining = ceilingLight(13, 2.9, 3, 0xffc98a, 1.0, 7, { room: 'dining', kind: 'chandelier' });
  FX.kitchen = ceilingLight(11, 2.92, 9, 0xe8f2ff, 1.2, 8, { room: 'kitchen', kind: 'tube' });
  FX.laundry = ceilingLight(1.5, 2.92, 10, 0xe0ecff, 0.9, 5, { room: 'laundry', kind: 'tube' });
  FX.bath = ceilingLight(4.5, 2.9, 10, 0xf2f0e8, 0.8, 4.5, { room: 'bath' });
  FX.upHall1 = ceilingLight(7.4, 5.9, 2.5, 0xffd29a, 0.8, 6, { room: 'upHall' });
  FX.upHall2 = ceilingLight(7.6, 5.9, 7.5, 0xffd29a, 0.8, 6, { room: 'upHall' });
  FX.bedroom = ceilingLight(3, 5.9, 3.5, 0xffd8a8, 0.9, 6.5, { room: 'bedroom' });
  FX.bedLamp = tableLamp(0.35, 3.56, 4.95, 0xffb870, 0.8, 4.5, { room: 'bedLamp' }).f;
  FX.porch = ceilingLight(8.75, 2.35, -0.12, 0xffc070, 1.0, 7, { kind: 'porch', room: 'porch' });
  FX.locked = ceilingLight(8, 5.95, 10.6, 0xd6a860, 0.75, 5, { kind: 'bare', group: 'locked', on: false, unstable: 0.12 });
  lightSwitch(5.93, 1.3, 1.2, '-x', 'living'); lightSwitch(6.07, 1.3, 3.75, '+x', 'hall'); lightSwitch(9.93, 1.3, 7.4, '-x', 'kitchen'); lightSwitch(10.07, 1.3, 1.5, '+x', 'dining');
  lightSwitch(2.2, 1.3, 8.07, '+z', 'laundry'); lightSwitch(5.2, 1.3, 8.07, '+z', 'bath'); lightSwitch(6.07, 4.3, 6.5, '+x', 'upHall'); lightSwitch(5.93, 4.3, 4.3, '-x', 'bedroom');

  // ---- living room ----
  couch(4.7, 3.6, -Math.PI / 2, 2.2, M.fabricGreen);
  B(0.45, 0.5, 1.4, M.darkWood, 0.3, 0, 3.6, { col: 0 }); B(0.1, 0.62, 1.1, M.black, 0.32, 0.5, 3.6); PLANE(1.0, 0.56, M.tv, 0.38, 0.81, 3.6, Math.PI / 2);
  table(3.2, 3.6, 0.6, 1.1, 0.42, M.midWood); B(0.25, 0.02, 0.3, M.paper, 3.1, 0.42, 3.4, { cast: false, ry: 0.3 }); B(0.05, 0.02, 0.16, M.black, 3.3, 0.42, 3.9, { ry: 1.1 });
  armchair(2.2, 6.4, Math.PI, M.fabricRed);
  bookshelf(3.0, 7.75, Math.PI, 1.6, 1.9);
  plant(5.5, 0.5); rug(3.3, 3.6, 3.0, 2.4, 0x4a2f2a);
  frame(1.0, 1.4, 0.09, 0, 0.45, 0.55, photoTex(0)); frame(5.2, 1.4, 0.09, 0, 0.4, 0.5, photoTex(2)); frame(5.93, 1.3, 5.2, -Math.PI / 2, 0.6, 0.45, photoTex(1));
  // ---- hall ----
  const hs = bookshelf(6.25, 4.7, Math.PI / 2, 1.0, 1.9, 0, false); PROPS.hallShelf = hs; PROPS.hallShelfCol = colliderFromObject(hs, 0, 0);
  const fs = grp(7.2, 0, 5.6, 0.12); fs.visible = false; PROPS.fallenShelf = fs;
  B(1.9, 0.34, 0.9, M.darkWood, 0, 0, 0, { parent: fs }); for (let i = 0; i < 14; i++) B(rnd(0.15, 0.25), 0.04, rnd(0.2, 0.3), M.books[i % 6], rnd(-1.2, 1.2), 0, rnd(-0.9, 0.7), { parent: fs, ry: Math.random() * 3 });
  PROPS.fallenShelfCol = addCollider(6.07, 8.35, 5.1, 6.05, 0, { on: false });
  CYL(0.03, 0.03, 1.8, M.darkWood, 6.45, 0, 0.45); CYL(0.2, 0.22, 0.03, M.darkWood, 6.45, 0, 0.45); B(0.35, 0.7, 0.25, M.fabricBlue, 6.45, 0.9, 0.55); addCollider(6.25, 6.65, 0.25, 0.65, 0);
  wallThing(6.07, 1.0, 0.85, '+x', 0.5, 0.8, 0.03, M.mirror);
  B(0.3, 0.1, 0.5, M.black, 7.2, 0, 0.35); rug(7.5, 2.8, 1.2, 4.2, 0x3b3530);
  // ---- dining ----
  table(13, 3, 1.0, 2.0, 0.76, M.darkWood);
  chair(12.25, 2.4, Math.PI / 2, M.darkWood, 0, true, M.fabricRed); chair(12.25, 3.6, Math.PI / 2, M.darkWood, 0, true, M.fabricRed);
  chair(13.75, 2.4, -Math.PI / 2, M.darkWood, 0, true, M.fabricRed); chair(13.75, 3.6, -Math.PI / 2, M.darkWood, 0, true, M.fabricRed);
  chair(13, 1.65, 0, M.darkWood, 0, true, M.fabricRed); chair(13, 4.35, Math.PI, M.darkWood, 0, true, M.fabricRed);
  B(0.5, 2.0, 1.6, M.darkWood, 15.7, 0, 1.4, { col: 0 }); for (let i = 0; i < 4; i++) CYL(0.12, 0.12, 0.02, M.porcelain, 15.6, 1.2 + i * 0.25, 1.0 + (i % 2) * 0.6, { rz: Math.PI / 2 });
  frame(15.93, 1.3, 4.3, -Math.PI / 2, 0.7, 0.5, photoTex(0)); rug(13, 3, 2.6, 3.4, 0x3a2422);
  // ---- kitchen ----
  cabinetRun(6.07, 10.8, 11.62, 0.6, '-', 0);
  B(0.7, 0.05, 0.45, M.metal, 8, 0.85, 11.6, { cast: false }); CYL(0.015, 0.015, 0.3, M.metal, 8, 0.9, 11.85); B(0.02, 0.02, 0.18, M.metal, 8, 1.19, 11.78);
  B(0.9, 0.7, 0.35, M.white, 6.55, 1.55, 11.75); B(1.8, 0.7, 0.35, M.white, 9.9, 1.55, 11.75);
  B(0.6, 0.02, 0.55, M.black, 10.35, 0.9, 11.62); [[10.2, 11.5], [10.5, 11.5], [10.2, 11.75], [10.5, 11.75]].forEach(([x, z]) => CYL(0.08, 0.08, 0.01, M.darkMetal, x, 0.92, z));
  B(0.8, 1.9, 0.75, M.white, 15.55, 0, 11.45, { col: 0 }); B(0.03, 0.5, 0.03, M.metal, 15.12, 1.1, 11.1);
  cabinetRunZ(6.1, 8.3, 15.65, 0.6, '-', 0);
  PROPS.drawer = B(0.02, 0.16, 0.5, M.white, 15.34, 0.66, 7.2); B(0.03, 0.02, 0.14, M.brass, 15.33, 0.74, 7.2);
  table(12, 9, 1.4, 0.9, 0.76, M.lightWood);
  chair(11.6, 8.25, 0, M.lightWood); chair(12.4, 9.75, Math.PI, M.lightWood); chair(11.6, 9.75, Math.PI, M.lightWood);
  PROPS.kchair = chair(12.4, 8.25, 0, M.lightWood);
  PROPS.note = B(0.21, 0.004, 0.28, M.paper, 12.1, 0.762, 9.0, { ry: 0.25, cast: false });
  PROPS.dirty = []; PROPS.clean = [];
  for (let i = 0; i < 4; i++){ PROPS.dirty.push(CYL(0.13, 0.11, 0.025, M.dirty, 9.35, 0.9 + i * 0.03, 11.55)); const c = CYL(0.13, 0.11, 0.022, M.porcelain, 6.65, 0.9 + i * 0.03, 11.55); c.visible = false; PROPS.clean.push(c); }
  PROPS.trashBag = SPH(0.3, M.bag, 14.6, 0.32, 11.55, { s: [1, 1.15, 0.9], seg: 9 });
  PROPS.trashTop = SPH(0.1, M.bag, 14.6, 0.72, 11.55, { s: [1, 1.6, 1] });
  frame(12.5, 1.6, 6.09, 0, 0.3, 0.4, TX.paper); // calendar
  // ---- laundry ----
  const washer = grp(0.45, 0, 11.55); PROPS.washer = washer;
  B(0.62, 0.85, 0.62, M.white, 0, 0, 0, { parent: washer }); const wd = CYL(0.2, 0.2, 0.04, M.darkMetal, 0, 0.25, -0.31, { parent: washer, rx: Math.PI / 2 }); wd.position.y = 0.45;
  B(0.5, 0.1, 0.02, M.darkMetal, 0, 0.72, -0.31, { parent: washer }); addCollider(0.14, 0.76, 11.24, 11.86, 0);
  B(0.62, 0.85, 0.62, M.white, 1.15, 0, 11.55, { col: 0 }); const dd = CYL(0.2, 0.2, 0.04, M.darkMetal, 1.15, 0.25, 11.24, { rx: Math.PI / 2 }); dd.position.y = 0.45;
  B(0.4, 1.8, 1.0, M.darkWood, 0.27, 0, 9.4, { col: 0 }); for (let i = 0; i < 6; i++) CYL(0.05, 0.05, 0.24, [M.fabricBlue, M.white, M.fabricRed][i % 3], 0.27, 0.62 + (i % 3) * 0.6, 9.0 + (i % 2) * 0.5);
  PROPS.fuse = B(0.45, 0.6, 0.12, M.darkMetal, 0.55, 1.2, 8.13);
  PROPS.basket = grp(2.45, 0, 9.0); CYL(0.25, 0.2, 0.35, M.fabricTan, 0, 0, 0, { parent: PROPS.basket }); for (let i = 0; i < 4; i++) SPH(0.1, [M.fabricBlue, M.linen, M.fabricGreen][i % 3], rnd(-0.1, 0.1), 0.36, rnd(-0.1, 0.1), { parent: PROPS.basket });
  const garment = grp(0.45, 0, 11.2); garment.visible = false; PROPS.garment = garment;
  B(0.34, 0.02, 0.8, M.cloth, 0, 0.42, -0.3, { parent: garment, rx: 0.5 }); B(0.38, 0.02, 1.4, M.cloth, 0.05, 0.01, -0.9, { parent: garment }); B(0.12, 0.02, 1.2, M.cloth, 0.35, 0.01, -1.1, { parent: garment, ry: 0.4 });
  // ---- bathroom ----
  B(1.6, 0.55, 0.75, M.porcelain, 4.6, 0, 11.55, { col: 0 }); B(1.4, 0.02, 0.55, std({ color: 0x9fb2bd, roughness: 0.1 }), 4.6, 0.5, 11.55);
  CYL(0.18, 0.15, 0.42, M.porcelain, 5.6, 0, 9.6); B(0.18, 0.4, 0.42, M.porcelain, 5.84, 0.4, 9.6); addCollider(5.4, 5.93, 9.35, 9.85, 0);
  CYL(0.07, 0.09, 0.8, M.porcelain, 3.3, 0, 10.3); B(0.4, 0.12, 0.5, M.porcelain, 3.3, 0.8, 10.3); addCollider(3.07, 3.5, 10.05, 10.55, 0);
  wallThing(3.07, 1.2, 10.3, '+x', 0.5, 0.7, 0.02, M.mirror);
  // ---- upstairs hall ----
  B(0.4, 0.8, 0.8, M.darkWood, 6.3, 3, 7.7, { col: 1 }); CYL(0.08, 0.1, 0.3, std({ color: 0x6b7a84, roughness: 0.3 }), 6.3, 3.8, 7.7);
  frame(6.09, 4.3, 1.0, Math.PI / 2, 0.4, 0.5, photoTex(0)); frame(6.09, 4.3, 5.4, Math.PI / 2, 0.4, 0.5, photoTex(1)); frame(9.91, 4.4, 7.9, -Math.PI / 2, 0.5, 0.4, photoTex(2));
  rug(7.4, 4.5, 1.1, 7.6, 0x3a3230, 1, 0.006);
  // ---- bedroom ----
  bed(1.15, 3.6, Math.PI / 2, 1);
  B(0.42, 0.56, 0.42, M.midWood, 0.33, 3, 4.95, { col: 1 });
  B(0.6, 2.0, 1.2, M.midWood, 5.6, 3, 6.2, { col: 1 }); B(1.2, 0.04, 0.55, M.midWood, 3.0, 3.72, 0.38, { col: 1 }); B(0.04, 0.72, 0.5, M.midWood, 2.45, 3, 0.38); B(0.04, 0.72, 0.5, M.midWood, 3.55, 3, 0.38);
  chair(3.0, 1.1, Math.PI, M.midWood, 1); B(0.35, 0.4, 0.2, M.fabricRed, 2.5, 3, 5.3, { ry: 0.4 });
  frame(5.91, 4.3, 1.4, -Math.PI / 2, 0.5, 0.4, photoTex(2));
  // ---- the locked room ----
  B(0.9, 0.16, 1.9, M.dirty, 9.4, 3, 10.6, { col: 1 }); B(0.8, 0.12, 0.9, M.fabricGrey, 9.35, 3.16, 10.9, { rz: 0.1 });
  for (let i = 0; i < 5; i++) CYL(0.035, 0.035, 0.22, std({ color: 0x8aa0a8, roughness: 0.2, transparent: true, opacity: 0.6 }), 8.6 + rnd(-0.3, 0.3), 3, 9.5 + rnd(0, 0.5), i % 2 ? { rz: Math.PI / 2 } : {});
  for (let i = 0; i < 3; i++) CYL(0.12, 0.1, 0.02, M.dirty, 8.9 + i * 0.12, 3 + i * 0.022, 11.6);
  PROPS.cornerChair = chair(6.6, 11.4, -Math.PI / 4, M.darkWood, 1, true);
  PROPS.photos = grp(0, 0, 0);
  [[9.5, 4.6, 0], [10.0, 4.2, 1], [10.4, 4.7, 2], [9.8, 5.1, 3], [10.9, 4.3, 1], [11.3, 4.8, 0], [10.6, 5.25, 2], [9.4, 3.9, 3]].forEach(([z, y, v]) => frame(6.08, y, z, Math.PI / 2 + rnd(-0.05, 0.05), 0.22, 0.28, photoTex(v), PROPS.photos));
  PROPS.keyboard = B(1.5, 0.9, 0.03, M.midWood, 8.0, 4.0, 11.9);
  const keyHead = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 8), M.brass, 60), keyBlade = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.05, 0.004), M.metal, 60);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(1, 1, 1);
  for (let i = 0; i < 60; i++){ const kx = 7.35 + (i % 12) * 0.11, ky = 4.8 - Math.floor(i / 12) * 0.16; q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, rnd(-0.3, 0.3))); mx.compose(new V3(kx, ky, 11.87), q, sc); keyHead.setMatrixAt(i, mx); mx.compose(new V3(kx, ky - 0.04, 11.87), new THREE.Quaternion(), sc); keyBlade.setMatrixAt(i, mx); }
  scene.add(keyHead); scene.add(keyBlade);
  PROPS.brokenMirror = wallThing(9.93, 4.1, 11.1, '-x', 0.5, 0.75, 0.02, M.mirror);
  for (let i = 0; i < 6; i++) B(rnd(0.04, 0.1), 0.004, rnd(0.04, 0.1), M.mirror, 9.6 + rnd(-0.2, 0.15), 3, 11.1 + rnd(-0.3, 0.3), { ry: Math.random() * 3, cast: false });
  PROPS.lockedNote = B(0.2, 0.004, 0.26, M.scrawl, 7.1, 3.0, 10.95, { ry: -0.5, cast: false });
  PLANE(1.3, 1.0, M.stain, 7.0, 3.006, 11.3, 0, { rx: -Math.PI / 2 });

  // ---- exterior: yards, porch, bins ----
  B(140, 0.1, 110, M.grass, 10, -0.12, -15, { uv: [3, 3], cast: false });
  B(1.2, 0.03, 8, M.concrete, 8, -0.02, -4.4, { uv: [1.2, 1.2], cast: false }); B(4, 0.04, 1.6, M.concrete, 8, -0.02, -0.8, { uv: [1.2, 1.2] });
  B(3.6, 0.12, 1.8, M.roof, 8, 2.65, -0.85); CYL(0.06, 0.06, 2.65, M.trim, 6.4, 0, -1.6); CYL(0.06, 0.06, 2.65, M.trim, 9.6, 0, -1.6); addCollider(6.3, 6.5, -1.7, -1.5, 0); addCollider(9.5, 9.7, -1.7, -1.5, 0);
  B(0.9, 0.02, 0.5, M.fabricTan, 8, 0.02, -0.4, { cast: false });
  const pot = grp(9.3, 0, -0.55); PROPS.flowerpot = pot; CYL(0.2, 0.15, 0.32, M.pot, 0, 0, 0, { parent: pot }); for (let i = 0; i < 5; i++) SPH(0.13, M.leaf, rnd(-0.08, 0.08), 0.42 + Math.random() * 0.15, rnd(-0.08, 0.08), { parent: pot, s: [1, 1.3, 1] });
  addCollider(9.1, 9.5, -0.75, -0.35, 0);
  CYL(0.05, 0.05, 1.1, M.darkWood, 6.2, 0, -7.6); B(0.25, 0.22, 0.45, M.darkMetal, 6.2, 1.1, -7.6); addCollider(6.1, 6.3, -7.7, -7.5, -1);
  // bins
  PROPS.bins = [];
  [[2.1, 13.0], [3.0, 13.0]].forEach(([x, z], i) => {
    B(0.7, 1.0, 0.7, M.bin, x, 0, z, { col: 0 }); B(0.62, 0.02, 0.62, M.black, x, 0.88, z, { cast: false });
    const lid = grp(x, 1.0, z + 0.36); B(0.74, 0.05, 0.74, M.bin, 0, 0, -0.37, { parent: lid }); PROPS.bins.push({ lid, x, z });
  });
  const binIn = grp(2.1, 0.9, 13.0); binIn.visible = false; PROPS.binInside = binIn;
  SPH(0.22, M.bag, 0, 0.02, 0, { parent: binIn, s: [1.2, 0.35, 1] });
  PROPS.bone = grp(0, 0, 0, 0, binIn);
  CYL(0.012, 0.01, 0.07, M.bone, 0.04, 0.07, 0.02, { parent: PROPS.bone, rz: 1.3 }); CYL(0.011, 0.009, 0.05, M.bone, 0.1, 0.075, 0.03, { parent: PROPS.bone, rz: 1.1 }); SPH(0.014, M.bone, 0.0, 0.075, 0.015, { parent: PROPS.bone });
  const st = PLANE(0.4, 0.4, M.stain, 0.02, 0.08, 0, 0, { parent: PROPS.bone, rx: -Math.PI / 2 });
  // backyard
  B(3, 0.03, 2.5, M.concrete, 12.5, -0.02, 13.4, { uv: [1.2, 1.2] });
  table(11.6, 14.0, 0.8, 0.8, 0.72, M.darkMetal); chair(10.9, 14.0, Math.PI / 2, M.darkMetal); chair(12.3, 14.0, -Math.PI / 2, M.darkMetal);
  B(3, 2.4, 2.5, M.fence, 19, 0, 20.5, { col: 0, uv: [2, 2] }); B(3.4, 0.12, 2.9, M.roof, 19, 2.4, 20.5);
  tree(4, 19.5, 6.5); tree(15.5, 22.5, 5.5); tree(-3.5, 6, 7); tree(19.5, -4.5, 6); tree(-2.5, -5.5, 5.5);
  hedge('x', 23.2, 6, 14);
  fence('x', 24, -6, 22); fence('z', -6, -8, 24); fence('z', 22, -8, 24);
  for (let i = 0; i < 9; i++) B(0.5, 0.25, 0.3, M.leaf, 10 + i * 0.6, 0, 23.5, {});
}

// ---- street, other houses, boundaries ----
function dummyHouse(x, z, w, d, facing = 1, mat = M.siding){
  B(w, 5.6, d, mat, x, 0, z, { col: -1, uv: [1.5, 3] }); B(w + 0.8, 0.2, d + 0.8, M.roof, x, 5.6, z);
  const fz = z + facing * (d / 2 + 0.01);
  [-w / 3, w / 3].forEach(ox => [1.0, 3.8].forEach(oy => { const p = PLANE(1.2, 1.3, std({ color: 0x07090c, roughness: 0.1, metalness: 0.5 }), x + ox, oy + 0.6, fz, facing > 0 ? 0 : Math.PI); }));
  PLANE(1.0, 2.1, M.doorDark, x, 1.05, fz, facing > 0 ? 0 : Math.PI);
}
function buildStreet(){
  B(84, 0.04, 3, M.concrete, 9, -0.02, -9.5, { uv: [1.5, 1.5], cast: false });
  B(84, 0.02, 8, M.asphalt, 9, -0.03, -15, { uv: [4, 4], cast: false });
  for (let x = -30; x < 50; x += 4) B(1.8, 0.005, 0.12, std({ color: 0x9a8a50, roughness: 0.6 }), x, -0.01, -15, { cast: false });
  B(84, 0.04, 3, M.concrete, 9, -0.02, -20.5, { uv: [1.5, 1.5], cast: false });
  B(1.2, 0.03, 2, M.concrete, 4, -0.02, -23, { uv: [1.2, 1.2], cast: false });
  B(84, 0.02, 7, M.asphalt, 9, -0.03, -50.5, { uv: [4, 4], cast: false }); B(84, 0.04, 1.2, M.concrete, 9, -0.02, -46.6, { uv: [1.5, 1.5], cast: false });
  FX.street1 = streetLight(-4, -8.6, 0, -1); FX.street2 = streetLight(20, -8.6, 0.25, -1); FX.street3 = streetLight(10, -21.4, 0, 1);
  FX.backStreet1 = streetLight(-12, -46.9, 0, -1); FX.backStreet2 = streetLight(38, -46.9, 0.5, -1);
  dummyHouse(-17, -1, 9, 10, -1); dummyHouse(33, -1, 9, 10, -1, M.sidingWarm); dummyHouse(-17, -30, 9, 9, 1, M.sidingWarm); dummyHouse(33, -30, 9, 9, 1);
  dummyHouse(-14, -60, 10, 8, 1); dummyHouse(6, -60, 10, 8, 1, M.sidingWarm); dummyHouse(26, -60, 10, 8, 1);
  hedge('x', -8.3, -30, -6); hedge('x', -8.3, 22, 48); hedge('x', -22.6, -30, 0); hedge('x', -22.6, 16, 48);
  invisibleWall(-31, -30, -60, 30); invisibleWall(48, 49, -60, 30);
  fence('z', 0, -24, -22, 1.0); fence('z', 16, -24, -22, 1.0);
  hedge('x', -46.2, -30, 0); hedge('x', -46.2, 16, 48); invisibleWall(-31, 49, -55, -54.6);
  // parked car
  const car = grp(-9, 0, -12.3); B(4.2, 0.7, 1.8, std({ color: 0x3a1f1f, roughness: 0.4, metalness: 0.4 }), 0, 0.3, 0, { parent: car }); B(2.3, 0.55, 1.6, std({ color: 0x0a0c10, roughness: 0.1, metalness: 0.6 }), -0.2, 1.0, 0, { parent: car });
  [[-1.4, 0.9], [1.4, 0.9], [-1.4, -0.9], [1.4, -0.9]].forEach(([x, z]) => CYL(0.33, 0.33, 0.22, M.black, x, 0.2, z, { parent: car, rx: Math.PI / 2 })); colliderFromObject(car, -1, 0);
}
