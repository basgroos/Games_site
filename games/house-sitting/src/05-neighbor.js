// ================= THE NEIGHBOR'S HOUSE (across the street), BACKYARD, BACK STREET, POLICE CAR =================
M.fenceGate = std({ color: 0x3d2e22, roughness: 0.9 });
M.cleanMirror = std({ color: 0x3a434c, roughness: 0.05, metalness: 0.9 });
function buildNeighbor(){
  B(16, 0.1, 10, M.floor, 8, -0.1, -29, { uv: [2, 2] });
  B(6, 0.012, 10, M.tile, 13, 0, -29, { uv: [1, 1] }); B(8, 0.012, 4, M.tile, 4, 0, -32, { uv: [1, 1] });
  slab(0, 16, -34, -24, 2.9, 0.1, M.roof, M.ceiling);
  roofGable(0, 16, -34, -24, 3, 5.2);
  // walls
  wall('x', -24, 0, 8, 0, M.nLiving, M.sidingWarm, [{ c: 4, w: 1.0, h: 2.15 }, { c: 1.6, w: 1.4, win: [0.9, 2.1] }, { c: 6.4, w: 1.2, win: [0.9, 2.1] }], { ea: true });
  wall('x', -24, 8, 10, 0, M.nHall, M.sidingWarm);
  wall('x', -24, 10, 16, 0, M.nKitchen, M.sidingWarm, [{ c: 13, w: 1.6, win: [1, 2.1] }], { eb: true });
  wall('x', -34, 0, 8, 0, M.sidingWarm, M.nBath, [{ c: 4, w: 0.8, win: [1.4, 2.0] }], { ea: true });
  wall('x', -34, 8, 10, 0, M.sidingWarm, M.locked);
  wall('x', -34, 10, 16, 0, M.sidingWarm, M.nKitchen, [{ c: 13, w: 1.0, h: 2.15 }], { eb: true });
  wall('z', 0, -33.93, -30, 0, M.sidingWarm, M.nBath);
  wall('z', 0, -30, -24.07, 0, M.sidingWarm, M.nLiving, [{ c: -25.6, w: 1.0, win: [0.9, 2.1] }]);
  wall('z', 16, -33.93, -24.07, 0, M.nKitchen, M.sidingWarm, [{ c: -29, w: 1.4, win: [1.0, 2.1], name: 'nKitchenWin' }]);
  wall('z', 8, -30, -24.07, 0, M.nLiving, M.nHall, [{ c: -27, w: 0.95 }]);
  wall('z', 8, -33.93, -30, 0, M.nBath, M.nHall, [{ c: -30.5, w: 0.85 }]);
  wall('x', -30, 0.07, 7.93, 0, M.nBath, M.nLiving);
  wall('x', -31, 8.07, 9.93, 0, M.locked, M.nHall, [{ c: 9, w: 0.9 }]);
  wall('z', 10, -31, -24.07, 0, M.nHall, M.nKitchen, [{ c: -29.5, w: 0.95 }]);
  wall('z', 10, -33.93, -31, 0, M.locked, M.nKitchen);
  // doors
  makeDoor({ axis: 'x', fixed: -24, c: 4, w: 1.0, into: '-', name: 'nFront', locked: true, mat: M.doorDark, lockedThought: 'Nobody answers. The house across the street is dark.' });
  makeDoor({ axis: 'z', fixed: 8, c: -27, w: 0.95, into: '+', name: 'nLivHall', open: true, hinge: 'max' });
  makeDoor({ axis: 'z', fixed: 8, c: -30.5, w: 0.85, into: '-', name: 'nBath' });
  const nl = makeDoor({ axis: 'x', fixed: -31, c: 9, w: 0.9, into: '-', name: 'nLocked', locked: true, mat: M.lockedDoor, lockedThought: 'Padlocked. From the outside. Just like theirs.' });
  const pl = new THREE.Group(); pl.position.set(0.75, 1.1, 0.07); nl.panel.add(pl); B(0.16, 0.05, 0.02, M.darkMetal, 0, 0, 0, { parent: pl }); B(0.08, 0.09, 0.035, M.brass, 0.03, -0.12, 0.01, { parent: pl });
  makeDoor({ axis: 'z', fixed: 10, c: -29.5, w: 0.95, into: '+', name: 'nKitchen', open: true });
  makeDoor({ axis: 'x', fixed: -34, c: 13, w: 1.0, into: '+', name: 'nBack', locked: true, lockedThought: 'Locked. There has to be a key somewhere.' });
  makeDoor({ axis: 'x', fixed: -46, c: 8, w: 1.2, h: 1.8, into: '-', name: 'nGate', mat: M.fenceGate });
  B(0.5, 0.03, 0.4, M.fabricTan, 4, 0.0, -23.7, { cast: false });
  // lights
  FX.nPorch = ceilingLight(4.75, 2.35, -23.88, 0xffc070, 1.1, 7, { kind: 'porch', group: 'neighbor', room: 'nPorch', on: false });
  FX.nLiving = ceilingLight(4, 2.9, -27, 0xffc888, 1.1, 8, { group: 'neighbor', room: 'nLiving' });
  FX.nLamp = floorLamp(0.5, -24.5, 0xffb870, 0.9, 6, 0, { group: 'neighbor', room: 'nLiving' });
  FX.nLamp2 = tableLamp(7.4, 0.62, -29.6, 0xffb060, 0.6, 4, { group: 'neighbor', room: 'nLiving' }).f;
  FX.nHall = ceilingLight(9, 2.9, -27.5, 0xffd09a, 0.8, 6, { group: 'neighbor', room: 'nHall' });
  FX.nKitchen = ceilingLight(13, 2.92, -29, 0xfff0d8, 1.1, 8, { group: 'neighbor', room: 'nKitchen', kind: 'tube' });
  FX.nBath = ceilingLight(4, 2.9, -32, 0xf0f0e8, 0.7, 5, { group: 'neighbor', room: 'nBath' });
  FX.nYard = ceilingLight(13.8, 2.3, -34.15, 0xffb060, 0.9, 8, { kind: 'porch', group: 'neighbor', room: 'nYard' });
  // living room
  couch(4.6, -27.2, -Math.PI / 2, 2.0, M.fabricTan);
  table(2.9, -27.2, 0.6, 1.1, 0.42, M.midWood);
  PROPS.water = CYL(0.035, 0.03, 0.12, std({ color: 0xa8c0cc, roughness: 0.05, transparent: true, opacity: 0.55 }), 2.85, 0.42, -27.0);
  armchair(0.75, -29.2, Math.PI / 2, M.fabricGreen);
  bookshelf(5.5, -29.75, 0, 1.4, 1.9);
  B(0.6, 0.62, 0.45, M.darkWood, 7.4, 0, -24.4, { col: 0 }); CYL(0.16, 0.16, 0.03, M.black, 7.4, 0.62, -24.4); B(0.04, 0.04, 0.2, M.metal, 7.55, 0.66, -24.35);
  B(0.4, 0.6, 0.4, M.darkWood, 7.4, 0, -29.6, { col: 0 });
  rug(3.2, -27.2, 3.2, 2.6, 0x6a3b2a); plant(7.4, -25.6, 0, 1.1);
  frame(2.6, 1.4, -24.09, Math.PI, 0.5, 0.4, photoTex(0)); frame(5.2, 1.5, -29.91, 0, 0.45, 0.55, photoTex(3));
  PROPS.shadow = PLANE(1.3, 2.86, new THREE.MeshBasicMaterial({ map: TX.silhouette, transparent: true, depthWrite: false, opacity: 0.85 }), 0.09, 1.45, -28.3, Math.PI / 2);
  // hallway
  rug(9, -27.5, 1.0, 6, 0x5a3a2a); wallThing(9, 1.0, -24.07, '-z', 0.7, 1.0, 0.02, M.cleanMirror);
  frame(8.08, 1.4, -25.4, Math.PI / 2, 0.35, 0.45, photoTex(2)); frame(9.92, 1.4, -26.3, -Math.PI / 2, 0.35, 0.45, photoTex(1));
  // kitchen
  cabinetRunZ(-28.2, -24.07, 15.65, 0.6, '-', 0, M.lightWood); cabinetRunZ(-33.93, -30, 15.65, 0.6, '-', 0, M.lightWood);
  B(0.45, 0.05, 0.7, M.metal, 15.6, 0.86, -31.6, { cast: false }); CYL(0.015, 0.015, 0.3, M.metal, 15.85, 0.9, -31.6);
  PLANE(1.2, 1.0, M.stain, 15.0, 0.02, -31.4, 0, { rx: -Math.PI / 2 });
  B(0.8, 1.9, 0.75, M.white, 11.0, 0, -24.45, { col: 0 });
  table(13, -27, 1.2, 0.9, 0.76, M.lightWood); chair(12.6, -26.25, Math.PI, M.lightWood); chair(13.4, -27.75, 0, M.lightWood);
  const sh = grp(13, 0, -33.62); PROPS.pantry = sh;
  B(1.5, 1.9, 0.45, M.darkWood, 0, 0, 0, { parent: sh }); for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) CYL(0.06, 0.06, 0.18, [M.pot, M.white, M.fabricRed, M.fabricBlue][k], -0.5 + k * 0.33, 0.1 + i * 0.47, 0.05, { parent: sh });
  PROPS.pantryCol = colliderFromObject(sh, 0, 0);
  B(0.3, 0.2, 0.03, M.midWood, 10.08, 1.5, -30.6, { ry: Math.PI / 2 });
  PROPS.nKey = grp(10.12, 1.45, -30.6); CYL(0.02, 0.02, 0.006, M.brass, 0, 0, 0, { parent: PROPS.nKey, rz: Math.PI / 2 }); B(0.004, 0.06, 0.012, M.metal, 0, -0.05, 0, { parent: PROPS.nKey });
  PROPS.nKeyHit = hitbox(0.2, 0.3, 0.3, 10.15, 1.45, -30.6);
  // bathroom
  B(1.6, 0.55, 0.75, M.porcelain, 1.0, 0, -33.55, { col: 0 }); CYL(0.18, 0.15, 0.42, M.porcelain, 6.5, 0, -33.4); addCollider(6.3, 6.7, -33.7, -33.1, 0);
  // backyard
  fence('z', 0, -46, -34); fence('z', 16, -46, -34); fence('x', -46, 0, 16, 1.8, [[7.4, 8.6]]);
  B(1.0, 0.03, 12, M.concrete, 13, -0.02, -40, { uv: [1.2, 1.2], cast: false });
  CYL(0.04, 0.04, 2.0, M.darkMetal, 3, 0, -37.5); CYL(0.04, 0.04, 2.0, M.darkMetal, 3, 0, -43.5); B(0.01, 0.01, 6, M.white, 3, 1.95, -40.5);
  PROPS.yardGarment = B(0.03, 1.75, 0.55, M.cloth, 3, 0.22, -41, { cast: true });
  B(2.6, 2.2, 2.2, M.fence, 2, 0, -44.4, { col: 0, uv: [2, 2] }); B(3, 0.12, 2.6, M.roof, 2, 2.2, -44.4);
  tree(11, -42, 5.5); tree(-4, -36, 6); tree(20, -38, 6.5);
  B(1.6, 0.06, 0.06, M.darkMetal, 7.5, 2.0, -38); CYL(0.03, 0.03, 2.0, M.darkMetal, 6.7, 0, -38); CYL(0.03, 0.03, 2.0, M.darkMetal, 8.3, 0, -38);
  PROPS.swing = grp(7.5, 2.0, -38); B(0.01, 1.5, 0.01, M.black, -0.2, -1.5, 0, { parent: PROPS.swing }); B(0.01, 1.5, 0.01, M.black, 0.2, -1.5, 0, { parent: PROPS.swing }); B(0.5, 0.04, 0.2, M.midWood, 0, -1.52, 0, { parent: PROPS.swing });
  // police car (hidden until chapter 6)
  const car = grp(10.5, 0, -12.6); car.visible = false; PROPS.policeCar = car;
  B(4.6, 0.75, 1.9, std({ color: 0xe8e8ea, roughness: 0.35, metalness: 0.3 }), 0, 0.3, 0, { parent: car }); B(1.6, 0.76, 1.92, std({ color: 0x0d1220, roughness: 0.35, metalness: 0.3 }), 0, 0.3, 0, { parent: car });
  B(2.4, 0.55, 1.7, std({ color: 0x0a0c10, roughness: 0.1, metalness: 0.6 }), -0.2, 1.05, 0, { parent: car });
  PROPS.barR = B(0.5, 0.12, 0.3, bulbMat(0xff2020), -0.45, 1.6, 0, { parent: car }); PROPS.barB = B(0.5, 0.12, 0.3, bulbMat(0x2050ff), 0.15, 1.6, 0, { parent: car });
  [[-1.5, 0.95], [1.5, 0.95], [-1.5, -0.95], [1.5, -0.95]].forEach(([x, z]) => CYL(0.34, 0.34, 0.22, M.black, x, 0.2, z, { parent: car, rx: Math.PI / 2 }));
  PROPS.policeCarCol = colliderFromObject(car, -1, 0); PROPS.policeCarCol.on = false;
  FX.copRed = addFixture(9.9, 1.9, -12.6, 0xff1a1a, 0, 12, { group: 'police', alt: 0.1 }); FX.copBlue = addFixture(10.7, 1.9, -12.6, 0x2a52ff, 0, 12, { group: 'police', alt: 3.2 });
  FX.copRed.bulb = PROPS.barR; FX.copBlue.bulb = PROPS.barB;
  // officers' flashlights (moving inside the house, then dropped)
  FX.cop1 = addFixture(8, 1.4, 2, 0xdfe8ff, 0, 7, { group: 'cop' }); FX.cop2 = addFixture(8, 1.4, 2, 0xdfe8ff, 0, 7, { group: 'cop' });
  FX.ghost = addFixture(0, 0, 0, 0xff0000, 0, 1, { group: 'ghost', on: false });
}
