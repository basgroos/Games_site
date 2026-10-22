// ================= STORY I: state, checkpoints, chapters 1–3 =================
const D = DOORS;
let anims = [];
function animate(dur, fn, done){ const a = { t: 0, dur, fn, done }; anims.push(a); return a; }
function updateAnims(dt){ for (const a of anims.slice()){ a.t += dt; const k = Math.min(1, a.t / a.dur); a.fn(k); if (k >= 1){ anims = anims.filter(x => x !== a); a.done && a.done(); } } }
const ease = k => k * k * (3 - 2 * k);
const S = { loops: {}, look: {} }; // misc story runtime
function stopStoryLoops(){ for (const k in S.loops){ if (S.loops[k]) S.loops[k].stop(0.3); } S.loops = {}; }
function looked(key, cond, dt, need){ const k = VIEW_ID ? key + '#' + VIEW_ID : key; S.look[k] = cond ? (S.look[k] || 0) + G.dt : 0; return S.look[k] >= need; }
let OFF1, OFF2, NEIGH; const BATT = [];
let beam1, beam2;

function lightBurst(pos, color = 0xffffff){ const f = FX.ghost; f.pos.copy(pos); f.color.set(color); f.base = 3.5; f.dist = 9; f.on = true; SND.pop(pos); after(0.12, () => { f.on = false; }); }
function moveChair(x, z, ry){ const c = PROPS.kchair; c.g.position.set(x, 0, z); c.g.rotation.y = ry; c.c.minX = x - 0.2; c.c.maxX = x + 0.2; c.c.minZ = z - 0.2; c.c.maxZ = z + 0.2; }
const CHORES = [['trash', 'Take out the trash'], ['dishes', 'Wash the dishes'], ['laundry', 'Do the laundry'], ['lock', 'Lock up before bed']];
function chores(cur, text, extra){
  const idx = CHORES.findIndex(c => c[0] === cur);
  const list = CHORES.map((c, i) => ({ key: c[0], text: i === idx && text ? text : c[1], done: i < idx, cls: i > idx ? 'later' : '' }));
  setObjectives(extra ? [extra].concat(list) : list); flashObj();
}
function saveCheckpoint(name){ G.checkpoint = name; try { localStorage.setItem(SAVE_KEY, name); } catch (e) {} }
function savedCheckpoint(){ try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } }

// ---------- one-time story setup: characters, interactions ----------
function storyInit(){
  OFF1 = buildHuman({ shirt: 0x1b2438, pants: 0x101420, cap: true, belt: true, skin: 0xb98f70 }); OFF2 = buildHuman({ shirt: 0x1b2438, pants: 0x101420, cap: true, belt: true, skin: 0x8a6248, hair: 0x111111 });
  NEIGH = buildHuman({ shirt: 0x8c6f4e, pants: 0x3a3630, skin: 0xd2b49a, hair: 0x9a958e, eyes: true, longFingers: true });
  [OFF1, OFF2, NEIGH].forEach(h => { scene.add(h.root); h.root.visible = false; });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamGeo = new THREE.CylinderGeometry(0.03, 0.7, 3.5, 16, 1, true); beamGeo.translate(0, -1.75, 0);
  beam1 = new THREE.Mesh(beamGeo, beamMat); beam2 = new THREE.Mesh(beamGeo, beamMat); scene.add(beam1); scene.add(beam2); beam1.visible = beam2.visible = false;
  // battery pickups
  D.back.def.locked = true;
  [[0.3, 1.81, 9.15], [9.2, 3.33, 10.1], [3.4, 0.93, 10.3], [7.2, 0.62, -29.78]].forEach(([x, y, z]) => {
    const g = grp(x, y, z); B(0.05, 0.1, 0.05, std({ color: 0xc5862a, roughness: 0.4 }), 0, 0, 0, { parent: g }); B(0.05, 0.1, 0.05, std({ color: 0x222222, roughness: 0.4 }), 0.06, 0, 0, { parent: g });
    hitbox(0.25, 0.25, 0.25, 0.03, 0.05, 0, g);
    const b = { g, taken: false }; BATT.push(b);
    addInter(g, 'Take the batteries', () => { b.taken = true; g.visible = false; player.battery = Math.min(100, player.battery + 45); netFx({ t: 'bat', v: 45 }); SND.pickup(); think(player.hasFlash ? 'Batteries. The flashlight will last a little longer.' : 'Batteries. Could be useful.', 2.5); }, () => !b.taken);
  });

  // ---- Chapter 1: key & door ----
  addInter(PROPS.flowerpot, 'Lift the flowerpot', () => {
    G.flags.key = true; addItem('House key'); animate(0.8, k => { PROPS.flowerpot.rotation.z = Math.sin(k * Math.PI) * 0.35; });
    think('A brass key, taped to the bottom of the pot.', 3); objective('Let yourself in'); G.step = 'enter';
  }, () => !G.flags.key);
  D.front.textFn = () => { const d = D.front; if (d.jammed) return "It won't open"; if (G.step === 'lockup' && !G.flags.lockFront && !d.open) return 'Lock the front door'; if (d.locked) return hasItem('House key') && !G.flags.lockFront ? 'Unlock the front door' : 'Locked'; return d.open ? 'Close door' : 'Open door'; };
  D.front.useFn = () => {
    const d = D.front; if (d.jammed) return toggleDoor(d);
    if (G.step === 'lockup' && !G.flags.lockFront && !d.open){ d.locked = true; G.flags.lockFront = true; SND.lockClick(d.center); markObj('front'); checkLockup(); return; }
    if (d.locked && hasItem('House key') && !G.flags.lockFront){ d.locked = false; SND.lockClick(d.center); after(0.35, () => setDoor(d, true)); return; }
    toggleDoor(d);
  };
  D.back.textFn = () => { const d = D.back; if (d.jammed) return "It won't open"; if (G.step === 'lockup' && !G.flags.lockBack && !d.open) return 'Lock the back door'; if (d.locked) return player.pos.z < 12 && !G.flags.lockBack ? 'Unlock the back door' : 'Locked'; return d.open ? 'Close door' : 'Open door'; };
  D.back.useFn = () => {
    const d = D.back; if (d.jammed) return toggleDoor(d);
    if (G.step === 'lockup' && !G.flags.lockBack && !d.open){ d.locked = true; G.flags.lockBack = true; SND.lockClick(d.center); markObj('back'); gardenEvent(); return; }
    if (d.locked && player.pos.z < 12 && !G.flags.lockBack){ d.locked = false; SND.lockClick(d.center); after(0.3, () => setDoor(d, true)); return; }
    toggleDoor(d);
  };
  D.back.lockedThought = 'Locked from the inside.';
  addInter(PROPS.note, 'Read the note', () => showNote(
`Thanks for watching the house! Just finish the chores on the list, lock the doors before bed, and make yourself comfortable. Please don't enter the locked room upstairs. There's nothing in there you need.

  - take out the trash (bins out back)
  - dishes
  - laundry (basket's in the laundry room)
  - lock up before bed!!

Back Sunday night. Help yourself to anything in the fridge.
        - Dana & Rob`, 'owner', () => { if (G.step === 'note'){ G.step = 'trash'; chores('trash', 'Take out the trash (kitchen, by the fridge)'); after(1.5, () => think("Easy enough. Fifty bucks a day.", 3)); } }), () => G.step !== 'arrive' && G.step !== 'enter');

  // ---- Task 1: trash ----
  addInter(PROPS.trashBag, 'Pick up the trash bag', takeTrash, () => G.step === 'trash' && !G.flags.bag);
  addInter(PROPS.trashTop, 'Pick up the trash bag', takeTrash, () => G.step === 'trash' && !G.flags.bag);
  const binHit = hitbox(0.8, 1.1, 0.8, 2.1, 0.55, 13.0);
  addInter(binHit, () => G.flags.bag && !G.flags.binned ? 'Throw the bag in the bin' : 'Trash bin', () => {
    if (!(G.flags.bag && !G.flags.binned)){ SND.clang(new V3(2.1, 1, 13), 0.15); return; }
    G.flags.binned = true; removeItem('Trash bag'); const lid = PROPS.bins[0].lid; animate(0.4, k => { lid.rotation.x = -1.9 * ease(k); });
    SND.clang(new V3(2.1, 1, 13), 0.35); SND.rustle(new V3(2.1, 1, 13), 0.6); PROPS.binInside.visible = true; PROPS.bone.visible = true;
    after(0.7, () => { think('The bag tore open. Is that... a finger?', 4); SND.lowSwell(0.2, 4); }); G.step = 'bone'; S.boneT = 0;
  }, () => G.step === 'trash' || G.step === 'bone' || G.step === 'bone2');

  // ---- Task 2: dishes ----
  const sinkHit = hitbox(0.9, 0.45, 0.5, 8, 1.05, 11.55);
  addInter(sinkHit, () => G.flags.plates >= 4 ? 'Sink' : 'Wash a plate (' + (G.flags.plates || 0) + '/4)', washPlate, () => G.step === 'dishes' && !(G.flags.plates >= 4));

  // ---- Task 3: laundry ----
  addInter(PROPS.basket, 'Pick up the laundry basket', () => { G.flags.basket = true; PROPS.basket.visible = false; addItem('Laundry'); chores('laundry', 'Load the washing machine'); }, () => G.step === 'laundry' && !G.flags.basket);
  addInter(PROPS.washer, () => G.flags.washed ? 'Open the washing machine' : 'Load the washer and start it', () => {
    if (G.flags.washed){ G.flags.washerOpen = true; PROPS.garment.visible = true; SND.latch(PROPS.washer.position); think('Towels. Jeans. And... this.', 3); chores('laundry', 'Inspect the black cloth'); return; }
    removeItem('Laundry'); G.flags.washing = true; SND.thunk(new V3(0.45, 0.6, 11.4)); S.loops.washer = LOOPS.washer(new V3(0.45, 0.6, 11.4));
    chores('laundry', 'Wait for the wash to finish'); knockChain(); after(3, () => think("That knocking doesn't sound like a zipper.", 3.5));
    after(10, () => { G.flags.washing = false; G.flags.washed = true; if (S.loops.washer){ S.loops.washer.stop(0.4); S.loops.washer = null; } SND.thunk(new V3(0.45, 0.6, 11.4)); PROPS.washer.position.x = 0.45; chores('laundry', 'Open the washing machine'); });
  }, () => G.step === 'laundry' && ((hasItem('Laundry') && !G.flags.washing && !G.flags.washed) || (G.flags.washed && !G.flags.washerOpen)));
  const gHit = hitbox(0.6, 0.5, 1.6, 0.3, 0.25, -0.8, PROPS.garment);
  addInter(PROPS.garment, 'Inspect the black cloth', () => showNote(
`Heavy black fabric, still soaking wet.

It unrolls. And keeps unrolling.

The sleeves alone are longer than your arms. The shoulders are narrow, like a coat made for a broom handle.

Nobody who lives in this house is this tall.`, 'inspect', () => {
    G.flags.inspected = true; G.step = 'prepower';
    after(0.6, () => SND.whisper(new V3(2, 4.6, 9.5), 2.6, 0.4)); after(3.4, () => think('...Someone whispered. Upstairs.', 3.5));
    setObjectives([{ text: 'Take out the trash', done: true }, { text: 'Wash the dishes', done: true }, { text: 'Do the laundry', done: true }, { text: 'Lock up before bed', cls: '' }]);
    after(7.5, powerOut);
  }), () => G.flags.washerOpen && !G.flags.inspected);

  // ---- Task 4: power ----
  addInter(PROPS.drawer, 'Search the drawer', () => {
    player.hasFlash = true; player.battery = 100; addItem('Flashlight'); $('batWrap').hidden = false; SND.rustle(PROPS.drawer.position, 0.4);
    think('A flashlight. Press [F] to switch it on.', 4); G.step = 'fuse';
    setObjectives([{ text: 'Reset the breakers (fuse box, laundry room)', cls: 'urgent' }, { text: 'Lock up before bed', cls: 'later' }]); flashObj();
  }, () => G.step === 'flashlight');
  addInter(PROPS.fuse, 'Reset the breakers', restorePower, () => G.step === 'fuse');

  // ---- Task 5: windows ----
  [['livFront', 'win_liv'], ['dinFront', 'win_din']].forEach(([wn, key]) => addInter(W[wn].glass, 'Check the window latch', () => { G.flags[key] = true; SND.lockClick(W[wn].center); markObj(key); checkLockup(); }, () => G.step === 'lockup' && !G.flags[key]));
  addInter(W.kitchenWin.glass, () => G.step === 'chase1' ? 'Break the window!' : 'Check the window latch', () => {
    if (G.step === 'chase1') return breakWindow();
    G.flags.win_kit = true; SND.lockClick(W.kitchenWin.center); markObj('win_kit'); checkLockup();
  }, () => (G.step === 'lockup' && !G.flags.win_kit) || (G.step === 'chase1' && !G.flags.winBroken));
  ['livSide', 'kitchenSide', 'bedFront', 'bedSide'].forEach(wn => addInter(W[wn].glass, () => G.step === 'chase1' ? "It won't budge" : (wn === 'bedSide' && G.step === 'bed') ? 'Listen to the rain' : 'Window', () => {
    if (G.step === 'chase1'){ SND.thud(W[wn].center, 0.4); think('Painted shut!', 1.5); return; }
    if (wn === 'bedSide' && G.step === 'bed'){ think('The rain sounds closer up here. Like it is pressed right against the glass.', 4); AMB.rain = 0.75; return; }
    think(G.power ? 'Rain on the glass. The street is empty.' : 'Your own reflection, and the dark behind it.', 2.5);
  }, () => G.state === 'playing'));

  // ---- Chapter 3: lamp & bed ----
  addInter(FX.bedLamp.bulb, () => FX.bedLamp.on ? 'Turn off the lamp' : 'Turn on the lamp', () => { if (!G.power){ SND.click(); think('No power.', 1.5); return; } FX.bedLamp.on = !FX.bedLamp.on; SND.click(FX.bedLamp.pos); });
  const bedHit = hitbox(2.1, 0.8, 1.5, 1.15, 3.4, 3.6);
  addInter(bedHit, () => (FX.bedLamp.on || FX.bedroom.on) ? 'Turn off the lights first' : 'Go to sleep', () => { if (FX.bedLamp.on || FX.bedroom.on){ think('Too bright to sleep. Lamp first.', 2); return; } startSleep(); }, () => G.step === 'bed');
  storyInitB(); storyInitC();
}

// ---------- reset & state builders ----------
function resetWorld(){
  timers = []; subTimer = null; anims = []; $('sub').classList.remove('on'); S.look = {};
  Object.assign(S, { cop: null, neighWalk: null, neighWalked: false, dripOn: false, radioOn: false, busy: false, washing: false, pushing: false, revArmed: false, obsNext: 0 });
  FX.cop1.base = FX.cop2.base = 0; FX.copRed.base = FX.copBlue.base = 0; if (TORCH1){ TORCH1.visible = TORCH2.visible = false; }
  D.front.lockedThought = 'Locked. Mrs. Henderson said the spare key is under the flowerpot.'; D.nBath.lockedThought = 'Locked.';
  stopStoryLoops(); monHide(); ghostHide(); stopChaseMusic();
  G.flags = {}; G.inv = []; renderInv(); G.power = true; G.npower = false; G.clutter = null; G.step = ''; G.objectives = []; renderObjectives();
  D.locked.maxAng = 1.7;
  doors.forEach(d => { d.locked = d.def.locked; d.jammed = false; d.hold = 0; setDoor(d, d.def.open, { instant: true, silent: true, force: true }); });
  D.locked.lockedThought = 'Three padlocks, a deadbolt and a chain. All on this side of the door.';
  fixtures.forEach(f => { if (f.unstable0 === undefined){ f.unstable0 = f.unstable; f.base0 = f.base; } f.on = f.def; f.flicker = 0; f.broken = false; f.unstable = f.unstable0; f.base = f.base0; });
  // props
  PROPS.flowerpot.rotation.z = 0; PROPS.trashBag.visible = PROPS.trashTop.visible = true; PROPS.binInside.visible = false; PROPS.bone.visible = true; PROPS.bins[0].lid.rotation.x = 0;
  PROPS.dirty.forEach(p => p.visible = true); PROPS.clean.forEach(p => p.visible = false); moveChair(12.4, 8.25, 0);
  PROPS.basket.visible = true; PROPS.garment.visible = false; PROPS.washer.position.x = 0.45;
  PROPS.hallShelf.visible = true; PROPS.hallShelfCol.on = true; PROPS.fallenShelf.visible = false; PROPS.fallenShelfCol.on = false;
  PROPS.locks.forEach((l, i) => { l.rotation.set(0, 0, 0); }); PROPS.chain.rotation.set(0, 0, 0);
  W.kitchenWin.glass.visible = true; PROPS.water.visible = true; PROPS.shadow.visible = true;
  PROPS.pantry.position.x = 13; PROPS.pantryCol.minX = 12.25; PROPS.pantryCol.maxX = 13.75; PROPS.nKey.visible = true;
  PROPS.policeCar.visible = false; PROPS.policeCarCol.on = false;
  if (PROPS.clutterMeshes) PROPS.clutterMeshes.visible = false;
  BATT.forEach(b => { b.taken = false; b.g.visible = true; });
  [OFF1, OFF2, NEIGH].forEach(h => { h.root.visible = false; h.root.rotation.set(0, 0, 0); });
  beam1.visible = beam2.visible = false;
  AMB.rain = 0.55; AMB.wind = 0.3; AMB.master = 1;
  Object.assign(player, { hasFlash: false, flashOn: false, battery: 100, stamina: 100, exhausted: false, frozen: false, speedMul: 1, lookTarget: null, shake: 0, stumble: 0 });
  $('batWrap').hidden = true; $('danger').style.opacity = 0;
  G.prevStep = null;
}
function setHouseLights(onRooms){ fixtures.forEach(f => { if (f.group === 'house') f.on = onRooms.includes(f.room); }); }
function stateChoresDone(){
  G.flags.key = true; G.flags.bag = G.flags.binned = true; PROPS.trashBag.visible = PROPS.trashTop.visible = false; PROPS.binInside.visible = true; PROPS.bone.visible = false; PROPS.bins[0].lid.rotation.x = -1.9;
  G.flags.plates = 4; PROPS.dirty.forEach(p => p.visible = false); PROPS.clean.forEach(p => p.visible = true); moveChair(8.5, 9.9, 0);
  G.flags.basket = G.flags.washed = G.flags.washerOpen = G.flags.inspected = true; PROPS.basket.visible = false; PROPS.garment.visible = true;
  G.flags.lockFront = G.flags.lockBack = G.flags.win_liv = G.flags.win_din = G.flags.win_kit = true; D.front.locked = true; D.back.locked = true;
  G.inv = ['House key', 'Flashlight']; renderInv(); player.hasFlash = true; $('batWrap').hidden = false;
}
function stateNight(){
  stateChoresDone(); G.power = false;
  setHouseLights([]); FX.locked.on = true;
  D.locked.locked = false; setDoor(D.locked, true, { instant: true, silent: true }); D.locked.maxAng = 1.25; D.locked.target = 1.25; D.locked.ang = 1.25;
  PROPS.locks.forEach((l, i) => { l.rotation.z = [1.1, -0.7, 2.2][i]; }); PROPS.chain.rotation.z = -1.3;
  AMB.rain = 0.6;
  if (!S.loops.drone) S.loops.drone = LOOPS.drone(new V3(8, 4.5, 10.5), 0.1);
}

// ---------- Chapter 1 ----------
function startCh1(){
  resetWorld(); saveCheckpoint('start');
  setHouseLights(['hall', 'living', 'porch']); FX.living.on = false;
  setPlayer(8, 0, -13.2, Math.PI);
  G.step = 'arrive';
  cine([
    { t: 'Friday. 8:40 PM.', d: 2.6 },
    { t: 'The Hendersons needed someone to watch the house for the weekend. Fifty dollars a day. Water the plants, take out the trash. Easy.', d: 6 },
    { t: 'Before they drove off, Mrs. Henderson held your arm a little too tightly and gave you three rules.', d: 5.5 },
    { t: 'One. Never open the locked door at the end of the upstairs hallway.', d: 5, cls: 'rule' },
    { t: 'Two. If you hear footsteps upstairs while you are downstairs, do not investigate.', d: 5, cls: 'rule' },
    { t: 'Three. If someone knocks on a window during the night, do not look outside.', d: 5, cls: 'rule' },
    { t: 'Then they smiled, waved, and drove away a little too fast.', d: 4.5 },
  ], () => { objective('Find the spare key under the flowerpot'); after(1.2, () => think("41 Alder Lane. Every window dark except two.", 4)); });
}
function takeTrash(){
  G.flags.bag = true; PROPS.trashBag.visible = PROPS.trashTop.visible = false; addItem('Trash bag'); SND.rustle(player.pos, 0.6);
  [0.9, 1.7, 2.3, 3.4].forEach(t => after(t, () => SND.drip(new V3(player.pos.x, 0.05, player.pos.z), 0.3)));
  after(2.0, () => think("It's leaking. Something dark is dripping on the tiles.", 3.5));
  chores('trash', 'Take the bag to the bins out back');
}
function washPlate(){
  if (S.washing) return; S.washing = true; after(1.1, () => { S.washing = false; });
  const n = (G.flags.plates || 0); G.flags.plates = n + 1; SND.water(new V3(8, 1, 11.6)); after(0.6, () => SND.clink(new V3(8, 1, 11.6)));
  PROPS.dirty[3 - n].visible = false; PROPS.clean[n].visible = true;
  if (G.flags.plates === 2){ after(0.3, () => { FX.kitchen.flicker = 1.6; SND.pop(FX.kitchen.pos); }); }
  if (G.flags.plates === 3){ after(0.8, () => { ghostShow(7.75, 0, 12.85, false, Math.PI); G.flags.refl = 'shown'; FX.kitchen.flicker = 0.5; }); }
}
function knockChain(){ if (!G.flags.washing) return; SND.knock(new V3(0.45, 0.6, 11.4), 1, false); SND.thud(new V3(0.45, 0.5, 11.4), 0.5); after(rnd(0.5, 1.2), knockChain); }
function powerOut(){
  G.power = false; SND.thunk(new V3(0.5, 1.5, 8.2)); SND.pop(FX.kitchen.pos); player.shake = 0.3;
  AMB.master = 0; after(1.6, () => { AMB.master = 1; AMB.rain = 0.7; });
  G.step = 'flashlight'; think('The power just went out.', 3);
  after(3.5, () => think("Mrs. Henderson said there's a flashlight in the kitchen drawer.", 4));
  setObjectives([{ text: 'Find the flashlight (kitchen drawer)', cls: 'urgent' }, { text: 'Lock up before bed', cls: 'later' }]); flashObj();
}
function restorePower(){
  SND.zap(PROPS.fuse.position); G.power = true; flickerGroup(f => f.group === 'house', 1.4); ghostHide(); G.flags.figDone = true;
  G.step = 'knocks'; think('Lights. Thank God.', 2.5);
  after(2.6, () => { SND.knock(new V3(8, 4.2, 9.1), 3, true); player.shake = 0.5; });
  after(5.0, () => think('Three knocks. From inside the locked room upstairs.', 4.5));
  after(10, () => { G.step = 'lockup'; setObjectives([{ key: 'front', text: 'Lock the front door' }, { key: 'win_liv', text: 'Check the living room window' }, { key: 'win_din', text: 'Check the dining room window' }, { key: 'win_kit', text: 'Check the kitchen window' }, { key: 'back', text: 'Lock the back door' }]); flashObj(); });
}
function gardenEvent(){ G.flags.garden = 'armed'; S.gardenT = 0; ghostShow(12.5, 0, 21, false, Math.PI); }
function checkLockup(){
  const f = G.flags; if (!(f.lockFront && f.lockBack && f.win_liv && f.win_din && f.win_kit && f.garden === 'gone')) return;
  G.step = 'bed'; FX.bedLamp.on = true;
  after(1.2, () => { objective('Everything is locked. Go upstairs and get some sleep.'); });
}

// ---------- Chapter 3: sleep ----------
function startSleep(){
  G.step = 'sleeping'; fade(1, 1.5); player.flashOn = false;
  after(1.6, () => cine([
    { t: '11:52 PM', d: 3, fx: () => { AMB.rain = 0.65; } },
    { t: 'The rain will not stop.', d: 3.5 },
    { t: '12:40 AM', d: 2.5, fx: () => SND.creak(new V3(9, 4, 6), 0.18, 1.2) },
    { t: 'Somewhere in the house, a floorboard settles.', d: 4 },
    { t: '1:15 AM', d: 2.5, fx: () => { for (let i = 0; i < 6; i++) after(i * 0.8, () => SND.step('wood', new V3(7.6, 3.05, 1 + i * 0.5), 0.5)); } },
    { t: 'Footsteps in the hallway. Slow ones.\nThey stop outside your door.', d: 5 },
    { t: '2:03 AM', d: 2.5, fx: () => SND.glassTap(new V3(-0.2, 4.6, 2), 3) },
    { t: 'tap.   tap.   tap.', d: 3.5, fx: () => after(1.6, () => SND.glassTap(new V3(-0.2, 4.6, 2), 3)) },
    { t: 'Rule three. Do not look outside.', d: 4, cls: 'rule' },
    { t: '3:30 AM', d: 2.5, fx: () => SND.lockClick(new V3(8, 4.1, 9)) },
    { t: 'A small metal click. Like a padlock coming open.', d: 4, fx: () => after(2.5, () => { AMB.master = 0; }) },
    { t: '3:33 AM', d: 3.5 },
    { t: '', d: 2.5 },
  ], wakeUp));
}
function wakeUp(){
  AMB.master = 0; SND.bang(new V3(8, 4.2, 10.5), true); player.shake = 1.6; flashFx('#fff', 0.6, 0.7);
  stateNight(); saveCheckpoint('night');
  setPlayer(2.5, 3, 3.6, -Math.PI / 2, -0.05);
  fade(0, 0.4); after(0.8, () => { AMB.master = 1; });
  FX.bedroom.on = true; G.power = true; flickerGroup(f => f.room === 'bedroom', 1.2);
  after(1.3, () => { G.power = false; FX.bedroom.on = false; SND.pop(FX.bedroom.pos); });
  after(1.8, () => { scare('What was THAT?', 2.5); });
  after(3.5, () => { objective('Find out what made that noise.'); G.step = 'investigate'; });
  after(7, () => { if (!player.flashOn) think('It is pitch black. Flashlight: [F]', 3.5); });
  G.step = 'woke';
}
function loadNight(){ resetWorld(); stateNight(); saveCheckpoint('night'); setPlayer(2.5, 3, 3.6, -Math.PI / 2); G.step = 'investigate'; objective('Find out what made that noise.'); player.battery = 100; }

// ---------- per-frame checks for chapters 1–3 ----------
function storyUpdateA(dt){
  const p = player.pos, f = G.flags;
  if (G.step === 'enter' && inHouseRect(p.x, p.z) === 'house'){ G.step = 'note'; objective('Read the note on the kitchen table'); think('Smells like lemon cleaner. And something underneath it.', 4); }
  if (G.step === 'note' && player.level === 1 && p.z > 6 && !f.sawLock){ f.sawLock = true; think('That must be the locked room. Three padlocks. On the outside.', 4); }
  if ((G.step === 'trash' || G.step === 'dishes') && player.level === 1 && p.z > 6 && !f.sawLock){ f.sawLock = true; think('Three padlocks. On the outside of the door.', 4); }
  if (G.step === 'bone'){
    S.boneT += dt; const binPos = new V3(2.1, 0.95, 13.0);
    const seen = inView(binPos, 40, 6, false);
    if (!seen && S.boneT > 1.2){ if (looked('boneAway', true, dt, 0.5)){ PROPS.bone.visible = false; G.step = 'bone2'; S.bone2T = 0; } } else looked('boneAway', false, dt, 1);
  }
  if (G.step === 'bone2'){
    S.bone2T += dt;
    if (!f.boneLook && inView(new V3(2.1, 0.95, 13.0), 30, 6, false)){ f.boneLook = true; think('...Nothing. Coffee grounds. Old takeout. That is all.', 3.5); }
    if (S.bone2T > 3.2 && !f.bang1){ f.bang1 = true; SND.metalBang(new V3(12, 1.2, 9)); player.shake = 0.4; moveChair(8.5, 9.9, 0);
      after(1.5, () => think('What was that? It came from the kitchen.', 3.5)); G.step = 'checkKitchen'; chores('dishes', 'Wash the dishes', { text: 'Check the kitchen', cls: 'urgent' }); }
  }
  if (G.step === 'checkKitchen' && player.level === 0 && p.x > 6.2 && p.z > 6.2 && p.z < 11.9){
    if (inView(new V3(8.5, 0.6, 9.9), 35, 10)){ G.step = 'dishes'; think('That chair was pushed in when I left. I am sure it was.', 4); chores('dishes', 'Wash the dishes in the sink'); }
  }
  if (G.step === 'dishes'){
    if (f.refl === 'shown'){
      const head = new V3(7.75, 2.4, 12.85);
      if (looked('refl', inView(head, 22, 8, false), dt, 0.9)){ f.refl = 'seen'; think('There is someone standing behind me. In the glass.', 3.5); SND.lowSwell(0.28, 3); SND.heartbeat(0.5); after(0.7, () => SND.heartbeat(0.55)); }
    } else if (f.refl === 'seen'){
      if (looked('reflAway', !inView(W.kitchenWin.center, 55, 10, false), dt, 0.25)){ ghostHide(); f.refl = 'gone'; after(0.6, () => think('Nobody. There is nobody in here.', 3)); }
    }
    if (f.plates >= 4 && f.refl === 'gone' && !f.dishesDone){
      f.dishesDone = true; G.step = 'steps';
      after(2.5, () => { for (let i = 0; i < 7; i++) after(i * 0.75, () => { SND.step('wood', new V3(7.5 + i * 0.1, 3.05, 2 + i * 0.95), 0.75); if (i === 3) SND.creak(new V3(8, 3.1, 5), 0.12); }); });
      after(4.5, () => think('Footsteps. Upstairs.', 3)); after(8, () => think('Rule two. Do not investigate.', 3.5));
      after(10.5, () => { G.step = 'laundry'; chores('laundry', 'Get the laundry basket (laundry room)'); });
    }
  }
  if ((G.step === 'steps' || G.step === 'laundry') && player.level === 1 && !f.disobey){
    f.disobey = true; flickerGroup(x => x.room === 'upHall', 1.0); SND.whisper(new V3(8, 4.5, 9), 1.6, 0.25); after(1, () => think('Empty. But the air up here is freezing.', 3.5));
  }
  if (f.washing) PROPS.washer.position.x = 0.45 + rnd(-0.012, 0.012);
  if (G.step === 'fuse' && !f.figDone){
    const lvl0 = player.level === 0;
    if (!f.figShown && lvl0){
      if (p.x > 6.2 && p.x < 9.8 && p.z < 5.5 && p.z > 3){ ghostShow(7.6, 0, 0.55, false, 0); f.figShown = true; S.figT = 0; S.figPos = new V3(7.6, 2.3, 0.55); }
      else if (p.x < 5.8 && p.z < 7.8 && p.x > 3.5){ ghostShow(0.75, 0, 0.8, false, Math.PI * 0.75); f.figShown = true; S.figT = 0; S.figPos = new V3(0.75, 2.3, 0.8); }
      if (f.figShown) SND.creak(S.figPos, 0.07, 1.4);
    }
    if (f.figShown){
      S.figT += dt; const vis = inView(S.figPos, 10, 16);
      if (player.flashOn && vis){ ghostHide(); f.figDone = true; SND.sting(0.13); after(0.8, () => think('It was there. It was right there.', 3)); }
      else if (vis && !player.flashOn && !f.figHint && S.figT > 1.5){ f.figHint = true; think('Something is standing at the end of the room. Flashlight: [F]', 3.5); SND.heartbeat(0.5); }
      else if (S.figT > 14 && !vis){ ghostHide(); f.figDone = true; }
      if (Math.hypot(p.x - S.figPos.x, p.z - S.figPos.z) < 2.5){ ghostHide(); f.figDone = true; SND.whisper(S.figPos, 1, 0.3); }
    }
  }
  if (f.garden === 'armed'){
    S.gardenT += dt; const head = new V3(12.5, 2.4, 21);
    if (looked('garden', inView(head, 22, 14, false), dt, 1.3)){
      f.garden = 'blink'; fade(1, 0.07); SND.heartbeat(0.6);
      after(0.18, () => { ghostShow(12.5, 0, 12.75, false, Math.PI); fade(0, 0.12); SND.sting(0.22); f.garden = 'close'; after(0.6, () => think('It is right outside the glass.', 3)); });
    } else if (looked('gardenHint', true, dt, 4) && S.gardenT > 4 && !f.gardenHint){ f.gardenHint = true; think('Something is out in the garden. Behind the glass door.', 3.5); }
  }
  if (f.garden === 'close'){
    if (looked('gardenAway', !inView(new V3(12.5, 1.6, 12.6), 45, 12, false), dt, 0.7)){ ghostHide(); f.garden = 'gone'; f.gardenBack = true; }
  }
  if (f.gardenBack && inView(new V3(12.5, 1.6, 12.6), 30, 12, false)){ f.gardenBack = false; think('...Gone. The garden is empty.', 3); checkLockup(); }
  if (f.garden === 'gone' && !f.gardenChecked){ f.gardenChecked = true; after(4, checkLockup); }
}
