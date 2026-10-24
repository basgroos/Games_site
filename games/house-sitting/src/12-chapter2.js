// ================= CHAPTER 2: THE ROOM =================
// One night later you go back to 41 Alder Lane. The Hendersons are home, sort of. Their diary sends you to the
// cellar under the laundry room, where the ledger of house-sitters is kept. You take what you need, it comes down
// the ladder after you, you get out through the coal chute, break the locks on the room, pour gasoline and burn it.
const CELLAR = { minX: 60, maxX: 76, minZ: 0, maxZ: 12 };
const HOUSE_ZONE = { minX: -0.5, maxX: 16.5, minZ: -0.6, maxZ: 12.5 };
const CHASE3 = { slow: 1.4, walk: 3.5, burst: 6.0, catchup: 4.6, catchupDist: 10, closeCap: 4.6, catch: 0.9, doorStall: 1.8, zone: CELLAR };
const CHASE4 = { slow: 1.6, walk: 4.0, burst: 6.6, catchup: 5.0, catchupDist: 11, closeCap: 4.8, catch: 0.9, doorStall: 1.5, zone: HOUSE_ZONE };
const C2_STEPS = ['c2_arrive', 'c2_note', 'c2_find', 'c2_owners', 'c2_turn', 'c2_vanish', 'c2_diary', 'c2_key', 'c2_hatch', 'c2_down', 'c2_cellar', 'c2_hunt', 'c2_room', 'c2_pour', 'c2_light', 'c2_fire', 'c2_out', 'c2_end'];
const LADDER_DOWN = [61.3, 0, 1.9, Math.PI], LADDER_UP = [2.3, 0, 9.6, 0], CHUTE_OUT = [1.6, 0, 13.6, Math.PI];
let HEN = [];
const c2At = step => C2_STEPS.indexOf(G.step) >= C2_STEPS.indexOf(step);
const inZone = (q, z) => q.x > z.minX && q.x < z.maxX && q.z > z.minZ && q.z < z.maxZ;

// ---------- a teleport for one player only (ladders, the coal chute) ----------
function movePlayerLocal(x, y, z, yaw){ const p = player; p.seated = null; p.pos.set(x, y, z); p.feetY = y; p.level = y > 1.5 ? 1 : 0; p.yaw = yaw; p.pitch = 0; p.vel.set(0, 0, 0); p.trail = []; p.lookTarget = null; }
function movePlayer(x, y, z, yaw){
  if (MP.bcast() && MP.actor){ MP.q({ t: 'tp1', to: MP.actor, a: [x, y, z, yaw] }); return; }
  movePlayerLocal(x, y, z, yaw);
}

// ---------- textures ----------
TX.brick = ctex(256, 256, (x, w, h) => {
  x.fillStyle = '#2b2622'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = -1; c < 5; c++){ const bw = 62, bh = 15, ox = (r % 2) * 31; x.fillStyle = `hsl(${12 + Math.random() * 10},${22 + Math.random() * 14}%,${20 + Math.random() * 10}%)`; x.fillRect(c * 64 + ox + 1, r * 16 + 1, bw, bh); }
  speckle(x, w, h, 3000, 0.3); grime(x, w, h, 0.6);
  for (let i = 0; i < 12; i++){ x.fillStyle = 'rgba(200,200,190,.07)'; x.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 2 + Math.random() * 10); }
});
TX.flame = ctex(64, 128, (x, w, h) => {
  const g = x.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,190,80,.95)'); g.addColorStop(0.55, 'rgba(240,90,20,.6)'); g.addColorStop(1, 'rgba(120,20,0,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(60, 50, 64, 120, 32, 126); x.bezierCurveTo(0, 120, 4, 50, 32, 2); x.fill();
}, { clamp: true });
M.brick = std({ map: TX.brick, roughness: 0.95 });
M.cellarFloor = std({ map: TX.concrete, color: 0x6f6a62, roughness: 0.9 });
M.rust = std({ color: 0x5a3320, roughness: 0.7, metalness: 0.5 });
M.gasRed = std({ color: 0x9a1a12, roughness: 0.4, metalness: 0.3 });
M.puddle = new THREE.MeshStandardMaterial({ color: 0x14110a, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
M.salt = new THREE.MeshBasicMaterial({ color: 0xcfcac0, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
M.flameMat = new THREE.SpriteMaterial({ map: TX.flame, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

function flameGroup(spots, parent = scene){
  const g = new THREE.Group(); parent.add(g); g.visible = false; g.userData.flames = [];
  spots.forEach(([x, y, z, s]) => { for (let k = 0; k < 3; k++){ const sp = new THREE.Sprite(M.flameMat.clone()); const sc = (s || 1) * rnd(0.6, 1.0); sp.position.set(x + rnd(-0.25, 0.25), y + sc * 0.45, z + rnd(-0.25, 0.25)); sp.scale.set(sc * 0.55, sc, 1); sp.userData.base = { y: sp.position.y, s: sc, ph: Math.random() * 7 }; g.add(sp); g.userData.flames.push(sp); } });
  return g;
}

// ---------- the cellar (built far away; you only get there by ladder) ----------
function buildCellar(){
  houseRects.push({ minX: CELLAR.minX, maxX: CELLAR.maxX, minZ: CELLAR.minZ, maxZ: CELLAR.maxZ, name: 'cellar' });
  B(16.4, 0.1, 12.4, M.cellarFloor, 68, -0.1, 6, { uv: [2, 2], cast: false });
  slab(59.8, 76.2, -0.2, 12.2, 2.7, 0.2, M.concrete, M.concrete);
  const o = { H: 2.75 };
  wall('x', 0, 60, 76, 0, M.brick, M.brick, [], Object.assign({ ea: true, eb: true }, o));
  wall('x', 12, 60, 76, 0, M.brick, M.brick, [], Object.assign({ ea: true, eb: true }, o));
  wall('z', 60, 0.07, 11.93, 0, M.brick, M.brick, [], o);
  wall('z', 76, 0.07, 11.93, 0, M.brick, M.brick, [], o);
  // the first room: where it all started
  wall('z', 70, 0.07, 5.0, 0, M.brick, M.locked, [{ c: 2.6, w: 0.9, h: 2.05 }], o);
  wall('x', 5, 70, 75.93, 0, M.locked, M.brick, [], Object.assign({ ea: true }, o));
  makeDoor({ axis: 'z', fixed: 70, c: 2.6, w: 0.9, h: 2.05, into: '+', name: 'cellarRoom', open: true, mat: M.lockedDoor });
  [[64.5, 4], [64.5, 8], [68, 8]].forEach(([x, z]) => B(0.42, 2.7, 0.42, M.brick, x, 0, z, { col: 0, occ: true, uv: [1, 1.5] }));
  // ladder up to the hatch, with a little light falling down it
  [-0.22, 0.22].forEach(dx => B(0.05, 2.7, 0.05, M.darkWood, 61.3 + dx, 0, 0.45));
  for (let y = 0.3; y < 2.6; y += 0.32) B(0.44, 0.04, 0.04, M.darkWood, 61.3, y, 0.45);
  PROPS.ladderHit = hitbox(0.7, 2.4, 0.5, 61.3, 1.2, 0.55);
  // boiler and pipes
  CYL(0.55, 0.6, 1.9, M.rust, 62.4, 0, 10.6); CYL(0.12, 0.12, 0.9, M.rust, 62.4, 1.9, 10.6); B(0.1, 0.1, 9, M.rust, 62.4, 2.45, 6); addCollider(61.8, 63.0, 10.0, 11.2, 0);
  // shelves of jars along the back wall
  for (let i = 0; i < 3; i++){ const sx = 65.5 + i * 1.3; B(1.2, 1.9, 0.35, M.darkWood, sx, 0, 11.7, { col: 0 }); for (let j = 0; j < 12; j++) CYL(0.06, 0.06, 0.18, std({ color: [0x6b5a2a, 0x4a3a20, 0x5a2a20][j % 3], roughness: 0.15, transparent: true, opacity: 0.8 }), sx - 0.45 + (j % 4) * 0.3, 0.35 + Math.floor(j / 4) * 0.55, 11.6); }
  // workbench with the crowbar
  table(67.6, 0.55, 1.6, 0.6, 0.9, M.darkWood); B(0.9, 0.04, 0.12, M.darkMetal, 67.3, 0.9, 0.5, { ry: 0.2 });
  PROPS.crowbar = grp(67.8, 0.92, 0.55, 0.3); B(0.7, 0.025, 0.025, std({ color: 0x7a1d14, roughness: 0.4, metalness: 0.6 }), 0, 0, 0, { parent: PROPS.crowbar }); B(0.025, 0.025, 0.12, std({ color: 0x7a1d14, roughness: 0.4, metalness: 0.6 }), 0.34, 0, 0.05, { parent: PROPS.crowbar });
  hitbox(0.8, 0.2, 0.3, 0, 0.05, 0, PROPS.crowbar);
  // gas can by the boiler
  PROPS.gascan = grp(63.7, 0, 11.3, -0.4); B(0.32, 0.4, 0.18, M.gasRed, 0, 0, 0, { parent: PROPS.gascan }); B(0.18, 0.04, 0.04, M.darkMetal, 0, 0.42, 0, { parent: PROPS.gascan }); CYL(0.025, 0.025, 0.12, M.darkMetal, 0.12, 0.38, 0, { parent: PROPS.gascan, rz: -0.5 });
  hitbox(0.4, 0.5, 0.3, 0, 0.25, 0, PROPS.gascan);
  // inside the first room: the ledger, the lighter, a chair in a salt circle, chains
  table(73.2, 2.3, 1.1, 0.7, 0.78, M.darkWood);
  PROPS.ledger = B(0.34, 0.05, 0.26, std({ color: 0x3a2018, roughness: 0.8 }), 73.0, 0.78, 2.3, { ry: 0.15 });
  PROPS.lighter = grp(73.55, 0.79, 2.15); B(0.04, 0.06, 0.02, M.brass, 0, 0, 0, { parent: PROPS.lighter }); hitbox(0.2, 0.2, 0.2, 0, 0.05, 0, PROPS.lighter);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.82, 40), M.salt); ring.rotation.x = -Math.PI / 2; ring.position.set(74.6, 0.006, 1.1); scene.add(ring);
  chair(74.6, 1.1, Math.PI * 0.75, M.darkWood, 0);
  for (let i = 0; i < 5; i++){ const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 8), M.metal); l.position.set(75.9, 1.8 - i * 0.06, 3.5); l.rotation.y = i % 2 ? Math.PI / 2 : 0; scene.add(l); }
  PLANE(1.2, 1.0, M.stain, 74.4, 0.006, 3.6, 0, { rx: -Math.PI / 2 });
  frame(75.93, 1.4, 1.6, -Math.PI / 2, 0.35, 0.45, photoTex(3));
  // the coal chute: a steep iron slide up to a little door in the garden
  const ch = grp(75.25, 0, 11.3); B(0.75, 0.05, 1.6, M.rust, 0, 0.8, 0, { parent: ch, rx: 0.9 }); B(0.05, 0.4, 1.6, M.rust, -0.38, 0.75, 0, { parent: ch, rx: 0.9 }); B(0.05, 0.4, 1.6, M.rust, 0.38, 0.75, 0, { parent: ch, rx: 0.9 });
  PROPS.chuteHit = hitbox(0.9, 1.6, 1.2, 75.25, 0.9, 11.1);
  // where the chute comes out in the garden
  B(0.7, 0.12, 0.6, M.rust, CHUTE_OUT[0], 0, 12.45);
  // lights: bare bulbs; one keeps failing
  FX.cel1 = ceilingLight(62.5, 2.65, 3.2, 0xffc887, 0.9, 6, { kind: 'bare', group: 'cellar' });
  FX.cel2 = ceilingLight(66.6, 2.65, 9.3, 0xffb870, 0.8, 6, { kind: 'bare', group: 'cellar', unstable: 0.2 });
  FX.cel3 = ceilingLight(73.0, 2.65, 2.6, 0xd9a050, 0.7, 5, { kind: 'bare', group: 'cellar' });
  FX.cel4 = ceilingLight(72.5, 2.65, 9.0, 0xffc887, 0.6, 5, { kind: 'bare', group: 'cellar', unstable: 0.12 });
  FX.ladderLight = addFixture(61.3, 2.4, 0.6, 0xbfd0ff, 0.5, 3, { group: 'cellar' });
}

// ---------- things in the house that only matter in chapter 2 ----------
function buildCh2House(){
  // the cellar hatch in the laundry room floor
  const hatch = grp(2.2, 0.012, 10.2); PROPS.c2hatch = hatch; hatch.visible = false;
  const lid = new THREE.Group(); hatch.add(lid); PROPS.c2lid = lid;
  B(0.8, 0.04, 0.8, M.darkWood, 0, 0, 0.4, { parent: lid }); for (let i = 0; i < 4; i++) B(0.8, 0.01, 0.02, M.black, 0, 0.04, 0.1 + i * 0.2, { parent: lid });
  const rg = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12), M.metal); rg.rotation.x = Math.PI / 2; rg.position.set(0, 0.05, 0.62); lid.add(rg);
  PROPS.c2padlock = B(0.07, 0.08, 0.03, M.brass, 0.15, 0.04, 0.7, { parent: lid });
  const hole = PLANE(0.78, 0.78, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0.002, 0.4, 0, { parent: hatch, rx: -Math.PI / 2 }); PROPS.c2hole = hole; hole.visible = false;
  hitbox(0.9, 0.3, 0.9, 0, 0.1, 0.4, hatch);
  // the Hendersons' bedroom: two chairs facing the wall, a nightstand with Dana's diary
  const c1 = chair(15.1, 2.7, Math.PI / 2, M.midWood, 1, true), c2 = chair(15.1, 4.1, Math.PI / 2, M.midWood, 1, true);
  PROPS.henChairs = [c1.g, c2.g];
  B(0.45, 0.55, 0.45, M.midWood, 10.45, 3, 1.0, { col: 1 });
  PROPS.diary = B(0.18, 0.04, 0.24, std({ color: 0x5a2030, roughness: 0.7 }), 10.45, 3.55, 1.0, { ry: 0.3 });
  FX.owners = ceilingLight(13, 5.9, 3.5, 0xffc27a, 0.55, 6, { room: 'owners', unstable: 0.05 });
  HEN = [buildHuman({ shirt: 0x6b4f5a, pants: 0x2c2a30, skin: 0xc9b4a0, hair: 0x9a948c, eyes: true }), buildHuman({ shirt: 0x46525e, pants: 0x25272b, skin: 0xbfa18a, hair: 0x4a4038, eyes: true })];
  HEN.forEach((h, i) => { scene.add(h.root); humanSit(h, true); h.root.position.set(15.05, 3 - 0.4, i ? 4.1 : 2.7); h.root.rotation.y = Math.PI / 2; h.root.visible = false; });
  PROPS.hen = HEN.map(h => h.root); PROPS.henHeads = HEN.map(h => h.P.head);
  PROPS.henHit = hitbox(0.8, 1.4, 2.2, 15.0, 3.7, 3.4);
  // gasoline: three spots in the room, and puddles that appear when you pour
  PROPS.gasSpots = [[9.4, 3.25, 10.6], [6.35, 4.2, 10.3], [6.6, 3.35, 11.35]].map(([x, y, z]) => hitbox(0.6, 0.6, 0.6, x, y, z));
  PROPS.gasPuddles = [[9.0, 10.6], [6.8, 10.3], [6.9, 11.2]].map(([x, z]) => { const m = PLANE(1.0, 0.8, M.puddle, x, 3.008, z, 0, { rx: -Math.PI / 2 }); m.visible = false; return m; });
  PROPS.lightHit = hitbox(1.0, 1.6, 0.4, 8, 3.9, 8.7);
  // fire
  PROPS.fireRoom = flameGroup([[9.3, 3.15, 10.6, 1.4], [8.4, 3.0, 10.9, 1.0], [6.4, 3.6, 10.3, 1.2], [6.6, 3.0, 11.3, 1.2], [7.6, 3.0, 9.6, 0.9], [9.6, 3.0, 9.4, 0.9], [8.0, 3.0, 11.6, 1.1]]);
  PROPS.fireHall = flameGroup([[8.0, 3.0, 8.6, 1.2], [6.5, 3.0, 7.6, 0.9], [7.6, 3.0, 5.6, 0.8], [6.4, 3.0, 3.6, 0.9], [9.3, 3.0, 6.6, 0.8]]);
  PROPS.fireDown = flameGroup([[9.6, 0, 3.8, 0.9], [5.0, 0, 6.6, 1.1], [3.0, 0, 3.0, 1.0], [12.0, 0, 9.0, 1.2], [13.2, 0, 3.0, 1.0], [3.0, 3.0, 3.0, 1.1], [13.0, 3.0, 9.0, 1.1]]);
  FX.fire1 = addFixture(8.0, 3.9, 10.4, 0xff7a2a, 2.2, 8, { group: 'fire', on: false, unstable: 0.3 });
  FX.fire2 = addFixture(7.4, 3.9, 6.0, 0xff6a20, 1.8, 7, { group: 'fire', on: false, unstable: 0.3 });
  FX.fire3 = addFixture(5.0, 1.2, 4.0, 0xff6a20, 2.0, 9, { group: 'fire', on: false, unstable: 0.3 });
  FX.fire4 = addFixture(12.0, 1.2, 6.0, 0xff6a20, 2.0, 9, { group: 'fire', on: false, unstable: 0.3 });
  FX.fire5 = addFixture(3.0, 4.2, 3.0, 0xff6a20, 1.8, 8, { group: 'fire', on: false, unstable: 0.3 });
  // flames on the thing itself (for the very end)
  PROPS.monFire = flameGroup([[0, 0.3, 0, 1.0], [0, 1.2, 0, 1.4], [0, 2.0, 0, 1.2], [0.2, 1.6, 0, 0.9], [-0.2, 1.6, 0, 0.9]], MON.m.root);
}

// ---------- flicker the flames (every computer, every frame) ----------
function updateFireFx(dt){
  for (const k of ['fireRoom', 'fireHall', 'fireDown', 'monFire']){
    const g = PROPS[k]; if (!g) continue;
    if (k === 'monFire') g.visible = !!MON.burning && MON.m.root.visible;
    if (!g.visible) continue;
    for (const sp of g.userData.flames){ const b = sp.userData.base; const f = 0.85 + 0.25 * Math.sin(G.time * 11 + b.ph) + 0.12 * Math.sin(G.time * 23 + b.ph * 2);
      sp.scale.set(b.s * 0.55 * (0.9 + 0.2 * Math.sin(G.time * 7 + b.ph)), b.s * f, 1); sp.position.y = b.y + Math.sin(G.time * 5 + b.ph) * 0.05; sp.material.opacity = 0.75 + 0.25 * Math.sin(G.time * 17 + b.ph); }
  }
  if (MON.burning && MON.m.root.visible && Math.random() < dt * 3) SND.creak(new V3(MON.pos.x, MON.pos.y + 1.5, MON.pos.z), 0.03, 0.3);
}

// ---------- states ----------
function ch2Reset(){
  if (!PROPS.c2hatch) return;
  HEN.forEach((h, i) => { humanSit(h, true); h.root.visible = false; h.root.position.set(15.05, 2.6, i ? 4.1 : 2.7); h.root.rotation.set(0, Math.PI / 2, 0); h.P.head.rotation.set(0, 0, 0); });
  PROPS.henChairs.forEach(g => { g.rotation.y = Math.PI / 2; });
  PROPS.c2hatch.visible = false; PROPS.c2lid.rotation.x = 0; PROPS.c2padlock.visible = true; PROPS.c2hole.visible = false;
  ['fireRoom', 'fireHall', 'fireDown'].forEach(k => { PROPS[k].visible = false; });
  PROPS.gasPuddles.forEach(m => { m.visible = false; });
  PROPS.crowbar.visible = PROPS.gascan.visible = PROPS.lighter.visible = true;
  [FX.fire1, FX.fire2, FX.fire3, FX.fire4, FX.fire5].forEach(f => { f.on = false; });
  [FX.cel1, FX.cel2, FX.cel3, FX.cel4, FX.ladderLight].forEach(f => { f.on = true; });
  MON.burning = false; D.owners.maxAng = 1.7; MON.zone = null;
  if (PROPS.tapes){ PROPS.tapes.forEach(g => { g.visible = true; }); PROPS.combo.visible = true; S.ringing = false; S.onAnswer = null; }
  D.cellarRoom.locked = true; setDoor(D.cellarRoom, false, { instant: true, silent: true, force: true });
}
function stateC2(){
  G.flags.ch2 = true; G.power = true; G.npower = false;
  setHouseLights(['porch', 'kitchen', 'owners']);
  D.front.locked = false; D.back.locked = false; D.owners.locked = false; D.owners.maxAng = 0.5; setDoor(D.owners, true, { instant: true, silent: true });
  HEN.forEach(h => { h.root.visible = true; });
  PROPS.c2hatch.visible = true;
  G.inv = ['Flashlight']; renderInv(); player.hasFlash = true; player.battery = 100; $('batWrap').hidden = false;
  AMB.rain = 0.7;
}
function startCh2(){
  resetWorld(); stateC2(); saveCheckpoint('c2'); G.step = 'c2_poster';
  setPlayer(8, 0, -13.2, Math.PI);
  cine([
    { t: 'CHAPTER 2', d: 2.4 },
    { t: 'THE ROOM', cls: 'big', d: 3 },
    { t: 'Saturday. 9:10 PM. One night later.', d: 3.2 },
    { t: 'The police found nothing at 41 Alder Lane. No officers were missing. No calls were logged.\nThe house across the street has stood empty for eleven years.', d: 6.5 },
    { t: "At six o'clock your phone rang.", d: 3 },
    { who: 'MRS. HENDERSON', t: "You left before you finished the list, sweetheart. Come back tonight. We're home.", d: 5.5 },
    { t: 'You should not go back.', d: 3 },
    { t: 'You go back.', cls: 'rule', d: 3 },
  ], () => { objective('Read the posters on the pole by the sidewalk'); after(1.5, () => think('Every window is dark. Except the kitchen. And their bedroom, upstairs.', 4.5)); });
}
function c2Gone(){ HEN.forEach(h => { h.root.visible = false; }); PROPS.henChairs.forEach(g => { g.rotation.y = -Math.PI / 2; }); }
function loadC2Cellar(){
  resetWorld(); stateC2(); c2Gone(); Object.assign(G.flags, { c2note: true, c2diary: true });
  PROPS.c2lid.rotation.x = -1.75; PROPS.c2padlock.visible = false; PROPS.c2hole.visible = true;
  G.inv = ['Flashlight', 'Cellar key']; renderInv();
  setPlayer(...LADDER_DOWN); c2CellarEnter();
}
function loadC2Room(){
  resetWorld(); stateC2(); c2Gone(); Object.assign(G.flags, { c2note: true, c2diary: true, c2ledger: true });
  PROPS.crowbar.visible = PROPS.gascan.visible = PROPS.lighter.visible = false;
  G.inv = ['Flashlight', 'Crowbar', 'Gas can', 'Lighter']; renderInv();
  setPlayer(...CHUTE_OUT); G.step = 'c2_room'; saveCheckpoint('c2room');
  objective('Go back inside. Break the locks on the room upstairs.');
}
function loadC2Fire(){
  resetWorld(); stateC2(); c2Gone(); Object.assign(G.flags, { c2note: true, c2diary: true, c2ledger: true, pry: 3, gas0: 1, gas1: 1, gas2: 1 });
  PROPS.crowbar.visible = PROPS.gascan.visible = PROPS.lighter.visible = false;
  G.inv = ['Flashlight', 'Crowbar', 'Lighter']; renderInv();
  D.locked.locked = false; setDoor(D.locked, true, { instant: true, silent: true }); PROPS.locks.forEach((l, i) => { l.rotation.z = [1.1, -0.7, 2.2][i]; }); PROPS.chain.rotation.z = -1.3; FX.locked.on = true;
  PROPS.gasPuddles.forEach(m => { m.visible = true; });
  setPlayer(8, 3, 7.7, Math.PI); G.step = 'c2_light'; saveCheckpoint('c2fire');
  objective('Step back into the hall and light it.', 'urgent');
}

// ---------- story ----------
function c2CellarEnter(){
  if (G.step === 'c2_cellar') return;
  saveCheckpoint('c2cellar'); G.step = 'c2_cellar'; ghostHide();
  setObjectives([{ key: 'crow', text: 'Find something to break the locks' }, { key: 'gas', text: 'Find fuel' }, { key: 'code', text: 'Open the old room (combination lock: the year it started)' }, { key: 'lite', text: 'Find something to light it with' }, { key: 't4', text: 'Play the last tape' }, { key: 'ledger', text: 'Read the ledger' }]); flashObj();
  after(1.2, () => think('It smells of wet stone and old smoke. And something sweet underneath.', 4));
  after(14, () => { if (G.step === 'c2_cellar') SND.mStep(new V3(2.2, 0.3, 10.2), 0.6); });
  after(16, () => { if (G.step === 'c2_cellar') think('(Footsteps. Up in the laundry room. Right over the hatch.)', 3.5); });
}
function c2Take(prop, name, key, text){ prop.visible = false; addItem(name); markObj(key); think(text, 3); c2CheckHunt(); }
function c2CheckHunt(){
  if (G.step !== 'c2_cellar' || S.busy || !hasItem('Crowbar') || !hasItem('Gas can') || !hasItem('Lighter') || !G.flags.t4 || !G.flags.c2ledger) return;
  G.step = 'c2_hunt'; objective('You have everything. Get back to the ladder.');
  after(1.5, () => {
    [FX.cel1, FX.cel3, FX.ladderLight].forEach(f => { f.on = false; }); FX.cel2.unstable = 0.6; FX.cel4.unstable = 0.5; SND.pop(FX.cel1.pos); SND.pop(FX.cel3.pos);
    SND.doorClose(new V3(61.3, 2.6, 0.5), true); player.shake = 0.6;
    after(0.8, () => { SND.creak(new V3(61.3, 2.2, 0.5), 0.2, 1.4); scare('Something is coming down the ladder.', 2.5); });
    after(2.2, () => { if (G.step !== 'c2_hunt') return; monPlace(61.3, 0, 1.0, Math.PI); MON.mode = 'stand'; SND.breath(new V3(61.3, 2.4, 1), 0.8); });
    after(3.4, () => { if (G.step !== 'c2_hunt') return; monChase(CHASE3); objective('It blocks the ladder. Get out through the coal chute (far corner)!', 'urgent'); });
  });
}
function c2Escaped(){
  G.step = 'c2_room'; monHide(); stopChaseMusic(); MON.zone = null;
  PROPS.c2lid.rotation.x = 0; PROPS.c2hole.visible = false; SND.doorClose(new V3(2.2, 0.2, 10.4), true);
  saveCheckpoint('c2room');
  after(1, () => think('Behind you, under the house, something throws itself against the hatch. Again. And again.', 4.5));
  for (let i = 0; i < 6; i++) after(2 + i * 2.6, () => { if (G.step === 'c2_room' || G.step === 'c2_pour') SND.knock(new V3(2.2, 0.0, 10.4), 2, true); });
  objective('Go back inside. Break the locks on the room upstairs.');
}
function c2Pry(){
  const n = (G.flags.pry || 0); if (n >= 3) return;
  G.flags.pry = n + 1; const lk = PROPS.locks[n]; lk.rotation.z = [1.1, -0.7, 2.2][n]; SND.clang(D.locked.center, 0.45, 0.55); SND.scrape(D.locked.center, 0.3); player.shake = Math.max(player.shake, 0.3);
  if (G.flags.pry >= 3){
    PROPS.chain.rotation.z = -1.3; D.locked.locked = false; after(0.4, () => { setDoor(D.locked, true, { speed: 2 }); SND.creak(D.locked.center, 0.2, 1.5); FX.locked.on = true; });
    G.step = 'c2_pour';
    setObjectives([{ key: 'gas0', text: 'Pour gasoline on the mattress' }, { key: 'gas1', text: 'Pour gasoline on the photographs' }, { key: 'gas2', text: 'Pour gasoline on the chair in the corner' }]); flashObj();
    after(1.2, () => think('The air in here is warm. Like breath.', 3.5));
  } else think(['One.', 'Two.'][n], 1.2);
}
function c2Pour(i){
  G.flags['gas' + i] = 1; PROPS.gasPuddles[i].visible = true; SND.water(PROPS.gasPuddles[i].position, 1.2); markObj('gas' + i);
  [() => { SND.whisper(new V3(8, 4.4, 11), 2.2, 0.35); }, () => { SND.thud(new V3(6.2, 4.2, 10.3), 0.5); flickerGroup(f => f.group === 'locked', 0.8); }, () => { SND.sting(0.12); }][i]();
  if (G.flags.gas0 && G.flags.gas1 && G.flags.gas2){
    removeItem('Gas can'); G.step = 'c2_light'; saveCheckpoint('c2fire');
    objective('Step back into the hall and light it.', 'urgent');
    after(0.8, () => think('Its bulb is swinging. Nothing touched it.', 3));
  }
}
function c2Ignite(){
  G.step = 'c2_fire'; PROPS.fireRoom.visible = true; FX.fire1.on = true; FX.locked.on = false;
  SND.bang(new V3(8, 3.5, 10.4), false); SND.lowSwell(0.35, 4); flashFx('#ff8a3a', 0.8, 0.6); player.shake = 0.8;
  D.front.locked = false; D.front.jammed = false; setDoor(D.front, true, { speed: 3 }); D.back.jammed = true; D.back.jamThought = 'The handle is burning hot. Not this way!';
  objective('GET OUT! Down the stairs, out the front door!', 'urgent');
  after(0.6, () => think('It goes up all at once. And something inside the fire screams.', 3.5));
  after(1.0, () => SND.scream(new V3(8, 4.2, 10.6), false));
  after(2.4, () => { if (G.step !== 'c2_fire') return; monPlace(8, 3, 10.3, Math.PI); MON.burning = true; MON.mode = 'stand'; monFacePlayer(); });
  after(3.0, () => { if (G.step === 'c2_fire') monChase(CHASE4); });
  after(4, () => { PROPS.fireHall.visible = true; FX.fire2.on = true; FX.fire5.on = true; lightBurst(FX.upHall1.pos, 0xffd29a); });
  after(8, () => { PROPS.fireDown.visible = true; FX.fire3.on = true; FX.fire4.on = true; lightBurst(FX.hall.pos, 0xffd59a); });
}
function c2Out(){
  G.step = 'c2_out'; stopChaseMusic(); MON.zone = null;
  monPlace(8, 0, 0.9, Math.PI); MON.mode = 'watch'; MON.burning = true;
  PROPS.fireDown.visible = PROPS.fireHall.visible = true; [FX.fire2, FX.fire3, FX.fire4, FX.fire5].forEach(f => { f.on = true; });
  objective('Get away from the house');
  after(1.2, () => think("It doesn't follow. It can't. The room was the only thing keeping it here, and the room is burning.", 5.5));
  S.c2outT = 0;
}
function c2Collapse(){
  G.step = 'c2_end'; SND.bang(new V3(8, 3, 5), true); flashFx('#ffb070', 1.2, 0.7); player.shake = 1.2;
  after(0.15, () => { SND.scream(new V3(8, 1.5, 0.9), false); });
  after(1.4, () => { monHide(); MON.burning = false; });
  // across the street, a porch light switches on
  after(5, () => { G.npower = true; FX.nPorch.on = true; NEIGH.root.visible = true; NEIGH.root.position.set(4, 0, -23.35); NEIGH.root.rotation.set(0, 0, 0); SND.latch(new V3(4, 1, -24)); think('(Across the street, a porch light switches on.)', 4); });
  after(10, finalEnding2);
  objective('Watch it burn.');
}
function _finalEnding2(){
  G.state = 'ending'; player.flashOn = false; fade(1, 3); G.ignoreUnlock = true; if (document.exitPointerLock) document.exitPointerLock();
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  $('end1').textContent = '41 ALDER LANE BURNED UNTIL MORNING.';
  $('end2').textContent = 'IN THE ASHES THEY FOUND A LEDGER. THE LINE FOR 2026 WAS STILL EMPTY.';
  $('end3').innerHTML = '<span>THE</span><span>ROOM</span>'; $('bEndCh2').hidden = true;
  setTimeout(() => { AMB.master = 0; $('hud').hidden = true; $('ending').hidden = false; }, 3200);
  setTimeout(() => $('end1').classList.add('on'), 4700);
  setTimeout(() => $('end2').classList.add('on'), 8700);
  setTimeout(() => $('end3').classList.add('on'), 13500);
  setTimeout(() => $('end4').classList.add('on'), 16000);
}
function finalEnding2(){
  if (MP.bcast()){ MP.q({ t: 'end2' }); MP.flush(); MP.mute = true; try { _finalEnding2(); } finally { MP.mute = false; } return; }
  _finalEnding2();
}

// ---------- every frame (host) ----------
function storyUpdateD(dt){
  if (!G.flags.ch2) return;
  const p = player.pos, f = G.flags, lvl = player.level, inH = inHouseRect(p.x, p.z);
  if (G.step === 'c2_arrive' && inH === 'house'){ G.step = 'c2_note'; objective('Read the note on the kitchen table'); think('Everything is back. The shelf. The window. As if last night never happened.', 4.5); }
  if (G.step === 'c2_find' && lvl === 1 && !f.c2hallGhost && p.x > 6 && p.x < 10 && inView(new V3(8, 5.3, 8.4), 18, 9)){ f.c2hallGhost = true; ghostShow(8, 3, 8.5, true); SND.sting(0.12); after(0.7, ghostHide); }
  if (G.step === 'c2_find' && lvl === 1 && p.x > 10.3 && p.z < 6.9){ G.step = 'c2_owners'; objective('Talk to them'); AMB.master = 0.6; after(0.6, () => think('They are sitting with their backs to you. Facing the wall. Very still.', 4.5)); }
  if (G.step === 'c2_vanish'){ const at = new V3(15.05, 4.2, 3.4); if (looked('henAway', !inView(at, 50, 12, false), dt, 0.4)){ c2Gone(); G.step = 'c2_diary'; SND.whisper(new V3(15, 4.2, 3.4), 1.4, 0.3); after(0.6, () => think('...They are gone. Both chairs are turned towards the door now.', 4)); objective('Read the diary on the nightstand'); } }
  if (G.step === 'c2_hatch' && f.c2win === 1 && inView(new V3(3, 4.5, 0.6), 14, 25)){ f.c2win = 2; after(0.6, () => { ghostHide(); }); think('(Someone is standing at the upstairs window. Watching you.)', 3.5); }
  if (G.step === 'c2_hunt' && !VIEW_ID && MON.mode === 'chase' && everyone(q => !inZone(q, CELLAR))) c2Escaped();
  if (G.step === 'c2_down' && inZone(p, CELLAR)) c2CellarEnter();
  if (G.step === 'c2_fire' && !VIEW_ID && everyone(q => inHouseRect(q.x, q.z) !== 'house')) c2Out();
  if (G.step === 'c2_out' && !VIEW_ID){ S.c2outT = (S.c2outT || 0) + dt; if (S.c2outT > 9 || p.z < -9) c2Collapse(); }
}

// ---------- hook it all into the game ----------
function ch2Init(){
  buildCellar(); buildCh2House(); ch2StoryInit();
  // the old interactions get a chapter-2 meaning
  const eFlower = PROPS.flowerpot.children[0].userData.inter, fUse = eFlower.use, fEn = eFlower.enabled;
  eFlower.text = () => G.step === 'c2_key' ? 'Look under the flowerpot' : 'Lift the flowerpot';
  eFlower.enabled = () => G.flags.ch2 ? G.step === 'c2_key' : fEn();
  eFlower.use = () => { if (!G.flags.ch2) return fUse();
    addItem('Cellar key'); animate(0.8, k => { PROPS.flowerpot.rotation.z = Math.sin(k * Math.PI) * 0.35; });
    think('An old iron key on a string. The tag says CELLAR.', 3.5); G.step = 'c2_hatch'; objective('Open the cellar hatch (laundry room floor)');
    G.flags.c2win = 1; ghostShow(3, 3, 0.6, true); };
  const eNote = PROPS.note.userData.inter, nUse = eNote.use, nEn = eNote.enabled;
  eNote.enabled = () => G.flags.ch2 ? true : nEn();
  eNote.use = () => { if (!G.flags.ch2) return nUse();
    showNote(`Welcome back, sweetheart.
You left before you finished the list.

  - feed the room
  - lock the door again
  - don't go down to the cellar

We're upstairs. Come and say hello.
        - D & R`, 'owner', () => { if (G.step === 'c2_note'){ G.step = 'c2_phone';
          after(1.2, () => { for (let i = 0; i < 5; i++) after(i * 0.8, () => SND.step('wood', new V3(12 + i * 0.4, 3.05, 4), 0.6)); }); after(4, () => think('Footsteps. Upstairs. Then nothing.', 3));
          after(7, () => { objective('The phone is ringing (hall, by the front door)'); ringPhone(3, () => {
            dialog([['JESSE (PHONE)', 'Hello? ...Is someone there? Can you hear me?', 3.5], ['JESSE (PHONE)', "Don't go up to them. Not yet.", 3],
              ['JESSE (PHONE)', 'I left tapes. Living room. Bathroom. Your bed upstairs. Play them first.', 5.5], ['JESSE (PHONE)', 'The last one is down where they keep the book.', 3.5], [null, null, 1.5]], () => {
              think('(The line goes dead. Jesse. Jesse Brandt. The boy on the poster.)', 4.5); G.step = 'c2_tapes'; tapeObjectives();
            });
          }); });
        } }); };
  // the locked room: in chapter 2 you pry the locks off
  const dl = D.locked;
  dl.textFn = () => { if (G.flags.ch2 && G.step === 'c2_room' && dl.locked && G.flags.plea === 2) return hasItem('Crowbar') ? 'Pry the locks off (' + (G.flags.pry || 0) + '/3)' : 'Locked'; return dl.jammed ? "It won't open" : dl.locked ? 'Locked' : (dl.open ? 'Close door' : 'Open door'); };
  dl.useFn = () => { if (G.flags.ch2 && G.step === 'c2_room' && dl.locked && G.flags.plea === 2 && hasItem('Crowbar')) return c2Pry(); return toggleDoor(dl); };
  // new interactions
  addInter(PROPS.c2hatch, () => PROPS.c2hole.visible ? 'Climb down the ladder' : (hasItem('Cellar key') ? 'Unlock the cellar hatch' : 'A hatch in the floor. Padlocked.'), () => {
    if (PROPS.c2hole.visible){ movePlayer(...LADDER_DOWN); SND.creak(new V3(2.2, 0.2, 10.4), 0.12, 1); return; }
    if (!hasItem('Cellar key')){ SND.latch(PROPS.c2hatch.position); think('Padlocked. The key must be somewhere.', 2.5); return; }
    PROPS.c2padlock.visible = false; SND.lockClick(PROPS.c2hatch.position); animate(0.8, k => { PROPS.c2lid.rotation.x = -1.75 * ease(k); }); PROPS.c2hole.visible = true; SND.creak(PROPS.c2hatch.position, 0.18, 1.2);
    G.step = 'c2_down'; objective('Climb down into the cellar');
  }, () => G.flags.ch2 && PROPS.c2hatch.visible && c2At('c2_hatch') && !c2At('c2_room'));
  addInter(PROPS.ladderHit, () => G.step === 'c2_hunt' ? 'Something is on the ladder' : 'Climb up the ladder', () => { if (G.step === 'c2_hunt') return; movePlayer(...LADDER_UP); }, () => G.flags.ch2 && c2At('c2_cellar') && !c2At('c2_room'));
  addInter(PROPS.chuteHit, () => G.step === 'c2_hunt' ? 'Climb up the coal chute!' : 'A coal chute. A little iron door at the top.', () => { if (G.step !== 'c2_hunt'){ think('Too steep to climb for fun. Only if you have to.', 2.5); return; } movePlayer(...CHUTE_OUT); SND.scrape(new V3(1.6, 0.3, 12.5), 0.6); SND.thud(new V3(1.6, 0.2, 12.6), 0.7); }, () => G.flags.ch2 && c2At('c2_cellar') && !c2At('c2_room'));
  addInter(PROPS.crowbar, 'Take the crowbar', () => c2Take(PROPS.crowbar, 'Crowbar', 'crow', 'A crowbar. The end is dark with old paint. Or not paint.'), () => G.step === 'c2_cellar' && PROPS.crowbar.visible);
  addInter(PROPS.gascan, 'Take the gas can', () => c2Take(PROPS.gascan, 'Gas can', 'gas', 'Half full. It sloshes.'), () => G.step === 'c2_cellar' && PROPS.gascan.visible);
  addInter(PROPS.lighter, 'Take the lighter', () => c2Take(PROPS.lighter, 'Lighter', 'lite', 'A brass lighter. Engraved: D & R, 1962.'), () => G.step === 'c2_cellar' && PROPS.lighter.visible);
  addInter(PROPS.ledger, 'Read the ledger', () => showNote(`HOUSE-SITTERS, 41 ALDER LANE

1962   Dana Albers (17), Rob Henderson (17) ... kept
1987   T. Visser (16) ............ kept
2004   S. de Wit (15) ............ kept
2025   J. Brandt (17) ............ kept
2026   __________________

It must never be empty. When the room is empty it goes looking.
The room keeps it fed. The room keeps it here.
If the room burns, there is nothing left to keep it.
                                        - R. H.`, 'inspect', () => { G.flags.c2ledger = true; markObj('ledger'); after(0.4, () => think('2026. The line is empty. It was meant for you.', 4)); c2CheckHunt(); }), () => G.flags.ch2 && c2At('c2_cellar') && !c2At('c2_room'));
  addInter(PROPS.henHit, 'Mrs. Henderson?', () => {
    G.step = 'c2_turn'; AMB.master = 0.3;
    dialog([['YOU', "Mrs. Henderson? Mr. Henderson? It's me. I came back.", 3.5], [null, null, 2.5]], () => {
      SND.creak(new V3(15, 4.2, 3.4), 0.2, 2.2);
      HEN.forEach((h, i) => { const hd = h.P.head; animate(2.4, k => { hd.rotation.y = -Math.PI * 0.95 * ease(k); hd.rotation.z = 0.25 * ease(k) * (i ? -1 : 1); }); });
      after(2.6, () => { say('MRS. HENDERSON', '"You didn\'t finish the list."', 3); SND.voice(new V3(15, 4.2, 2.7), 2, 0.2, 190); });
      after(5.8, () => { say('MR. HENDERSON', '"Feed the room."', 2.6); SND.voice(new V3(15, 4.2, 4.1), 1.4, 0.2, 120); flickerGroup(fx => fx.room === 'owners', 1.4); });
      after(8.6, () => { G.step = 'c2_vanish'; objective('Look away. Then look back.'); AMB.master = 0.8; });
    });
  }, () => G.step === 'c2_owners');
  addInter(PROPS.diary, 'Read the diary', () => showNote(`Dana's diary. Most of the pages are torn out. The last one:

We were careful this time. A good kid. Polite. Did the dishes.
It didn't take them. It let them run.
Rob says that means it wants something else.
It wants out of the room.

If anyone reads this: the cellar is under the laundry room. Everything is down there. The key is where we always keep the spare.

Don't let it out. Burn the room if you have to.
We never had the courage.`, 'owner', () => { if (G.step === 'c2_diary'){ G.step = 'c2_key'; objective('Find the cellar key (where they keep the spare)'); after(0.6, () => think('Where they keep the spare. The flowerpot by the front door.', 4)); } }), () => G.flags.ch2 && G.step === 'c2_diary');
  PROPS.gasSpots.forEach((h, i) => addInter(h, 'Pour gasoline here', () => c2Pour(i), () => G.step === 'c2_pour' && !G.flags['gas' + i] && hasItem('Gas can')));
  addInter(PROPS.lightHit, () => hasItem('Lighter') ? 'Light the room' : 'You need something to light it', () => { if (!hasItem('Lighter')) return; if (player.pos.z > 8.95){ think('Not from in here. Step back into the hall first.', 2.5); return; } c2Ignite(); }, () => G.step === 'c2_light');

  // co-op: personal teleports, the second ending, and the burning monster
  const af = MP.applyFx; MP.applyFx = function(e){ if (e.to && e.to !== this.me().id) return; if (e.t === 'tp1'){ movePlayerLocal(...e.a); return; } if (e.t === 'end2'){ _finalEnding2(); return; } return af.call(this, e); };
  const ms = MP.monState; MP.monState = function(){ const s = ms.call(this); s.b = MON.burning ? 1 : 0; return s; };
  const gw = MP.guestWorld; MP.guestWorld = function(dt){ gw.call(this, dt); if (this.mon) MON.burning = !!this.mon.b; };
  // surfaces down in the cellar
  const sa = surfaceAt; window.surfaceAt = (x, z, l) => inHouseRect(x, z) === 'cellar' ? 'concrete' : sa(x, z, l);
  // smoke indoors while the house burns
  const eu = envUpdate; window.envUpdate = dt => { eu(dt); const burning = G.step === 'c2_fire' || G.step === 'c2_out' || G.step === 'c2_end'; if (burning){ const ind = inHouseRect(camera.position.x, camera.position.z) === 'house'; scene.fog.color.setHex(ind ? 0x2a160c : 0x120a08); scene.fog.density += ind ? 0.05 : 0.004; } else scene.fog.color.setHex(0x06080d); };
  // the chapter-1 ending now offers chapter 2; and puts its own words back
  const fe = finalEnding; window.finalEnding = () => { $('end1').textContent = 'YOU SURVIVED THE NIGHT.'; $('end2').textContent = 'BUT YOU NEVER FOUND OUT WHO WAS HOUSE-SITTING FOR WHOM.'; $('end3').innerHTML = '<span>HOUSE</span><span>SITTING</span>'; $('bEndCh2').hidden = MP.guest; return fe(); };
  $('bCh2').onclick = () => { audioInit(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} loadCheckpoint('c2'); };
  $('bEndCh2').onclick = () => { $('ending').hidden = true; ['end1', 'end2', 'end3', 'end4'].forEach(id => $(id).classList.remove('on')); if (MP.host && MP.started) MP.hostStart('c2'); else loadCheckpoint('c2'); };
  $('mpGoCh2').onclick = () => { if (MP.members.length >= 2){ try { localStorage.removeItem(SAVE_KEY); } catch (e) {} MP.hostStart('c2'); requestLock(); } };
}
const C2_LOADERS = { c2: startCh2, c2find: () => loadC2Find(), c2cellar: loadC2Cellar, c2room: loadC2Room, c2fire: loadC2Fire };
const C2_LABELS = { c2: 'chapter 2', c2find: 'chapter 2: the Hendersons', c2cellar: 'the cellar', c2room: 'the locked room', c2fire: 'the fire' };
