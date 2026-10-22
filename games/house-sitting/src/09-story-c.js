// ================= STORY III: chapters 6–9 (police, the officers, the neighbor, the final escape) =================
let TORCH1, TORCH2;
const CAR_POS = new V3(10.5, 1.0, -12.6), DRIP_POS = new V3(15.6, 0.9, -31.6);
// lines: [who, text, seconds]; text null = a quiet pause (things can be noticed then)
function dialog(lines, done){
  S.busy = true; let t = 0;
  lines.forEach(([who, text, d]) => { after(t, () => {
    if (text == null) return;
    S.talkEnd = G.time + d;
    if (who === 'YOU') say('YOU', '"' + text + '"', d);
    else if (who){ say(who, '"' + text + '"', d); if (NEIGH.root.visible) SND.voice(new V3(NEIGH.root.position.x, NEIGH.seated ? 1.2 : 1.6, NEIGH.root.position.z), Math.min(d * 0.6, 2.5), 0.12, 175); }
    else think(text, d);
  }); t += d + 0.25; });
  after(t, () => { S.busy = false; done && done(); });
}
function observe(key, text){ if (G.flags['obs_' + key] || G.time < (S.obsNext || 0) || G.time < (S.talkEnd || 0)) return; G.flags['obs_' + key] = true; think(text, 4.5); S.obsNext = G.time + 5.5; }
function dripChain(){ if (!S.dripOn) return; SND.drip(DRIP_POS, 0.4); after(rnd(0.9, 1.7), dripChain); }
function radioChain(){ if (!S.radioOn) return; SND.radio(new V3(12.4, 0.2, 10.2), rnd(0.6, 1.2), 0.14); after(rnd(6, 11), radioChain); }

function storyInitC(){
  const tm = std({ color: 0x1a1a1c, roughness: 0.4, metalness: 0.6 });
  TORCH1 = CYL(0.025, 0.03, 0.25, tm, 0, 0, 0, { rz: Math.PI / 2 }); TORCH2 = CYL(0.025, 0.03, 0.25, tm, 0, 0, 0, { rz: Math.PI / 2 }); TORCH1.visible = TORCH2.visible = false;
  addInter(hitbox(0.8, 0.5, 1.9, 7.3, 0.25, 2.7), 'Check on the officer', () => { G.flags.o1 = true; think("He isn't breathing. There isn't a mark on him. His eyes are wide open, fixed on the ceiling.", 5); markObj('o1'); afterOfficers(); }, () => OFF1.root.visible && G.step === 'search' && !G.flags.o1);
  addInter(hitbox(0.8, 0.5, 1.9, 12.8, 0.25, 10.6), 'Check on the officer', () => { G.flags.o2 = true; think('She is face down, one hand stretched toward the back door. Her radio is still hissing.', 5); markObj('o2'); afterOfficers(); }, () => OFF2.root.visible && G.step === 'search' && !G.flags.o2);
  // the neighbor
  hitbox(0.7, 1.8, 0.6, 0, 0.9, 0, NEIGH.root);
  addInter(NEIGH.root, 'Talk to the neighbor', talkNeighbor, () => ['n_talk0', 'n_drink', 'n_ask'].includes(G.step) && !S.busy);
  addInter(PROPS.water, 'Drink the water', drinkWater, () => G.step === 'n_drink' && !S.busy);
  SEATS.forEach(seat => { const e = addInter(hitbox(0.6, 0.55, 0.62, seat.x, 0.5, seat.z), 'Sit down', () => { sitDown(seat); think('(The cushions are warm. Press W to get up.)', 3); },
    () => CHILL.includes(G.step) && !player.seated && NEIGH.root.visible); e.local = true; });
  addInter(PROPS.nKeyHit, 'Grab the key', () => { addItem('Back door key'); PROPS.nKey.visible = false; markObj('k'); think('BACK DOOR, says the tag.', 2); }, () => G.step === 'chase2' && !hasItem('Back door key'));
  addInter(PROPS.pantry, () => 'Push the shelf aside (' + (G.flags.pantry || 0) + '/2)', () => {
    if (S.pushing) return; S.pushing = true; G.flags.pantry = (G.flags.pantry || 0) + 1; SND.scrape(new V3(13, 0.5, -33.6), 0.4); player.shake = Math.max(player.shake, 0.25);
    const x0 = PROPS.pantry.position.x, x1 = 13 + G.flags.pantry * 0.8;
    animate(0.28, k => { PROPS.pantry.position.x = x0 + (x1 - x0) * k; }, () => { S.pushing = false; PROPS.pantryCol.minX = x1 - 0.75; PROPS.pantryCol.maxX = x1 + 0.75; if (G.flags.pantry >= 2){ G.flags.shelfMoved = true; markObj('s'); } });
  }, () => G.step === 'chase2' && !(G.flags.pantry >= 2));
  D.nBack.textFn = () => { const d = D.nBack; if (G.step === 'chase2'){ if (!G.flags.shelfMoved) return 'Blocked by the shelf'; if (d.locked) return hasItem('Back door key') ? 'Unlock the back door' : 'Locked'; } return d.locked ? 'Locked' : (d.open ? 'Close door' : 'Open door'); };
  D.nBack.useFn = () => {
    const d = D.nBack;
    if (G.step === 'chase2' && !G.flags.shelfMoved){ SND.thud(d.center, 0.4); think('The shelf is in the way!', 1.8); return; }
    if (d.locked && G.step === 'chase2'){ if (hasItem('Back door key')){ d.locked = false; SND.lockClick(d.center); markObj('u'); after(0.25, () => setDoor(d, true, { speed: 9 })); } else { SND.latch(d.center); think('Locked! There was a key hook by the kitchen door.', 2.5); } return; }
    toggleDoor(d);
  };
  D.nGate.textFn = () => G.step === 'chase2' && !D.nGate.open ? 'Force the bolt (' + (G.flags.gate || 0) + '/2)' : (D.nGate.open ? 'Gate' : 'Locked');
  D.nGate.useFn = () => {
    if (G.step !== 'chase2' || D.nGate.open) return; G.flags.gate = (G.flags.gate || 0) + 1; SND.clang(D.nGate.center, 0.4, 0.6); player.shake = Math.max(player.shake, 0.3);
    if (G.flags.gate >= 2){ setDoor(D.nGate, true, { speed: 9 }); markObj('g'); think('GO!', 1); }
  };
}

// ---------- Chapter 6: the police ----------
function ch6Start(){
  MON.mode = 'off'; MON.m.root.visible = false;
  cine([
    { t: 'You run.', d: 2.4 },
    { t: 'Past dark houses. Past parked cars with rain beading on the glass.\nNobody opens a door. Nobody is awake.', d: 5 },
    { t: 'Twelve blocks. The station is the only building with its lights on.', d: 4.2, fx: () => SND.radio(null, 1.4, 0.22) },
    { who: 'DESK SERGEANT', t: 'Slow down. Breathe. Something is in the house?', d: 4.2 },
    { who: 'YOU', t: 'Not someone. Something. Tall. It came out of the locked room.\nThe owners... they might still be in there.', d: 6 },
    { who: 'DESK SERGEANT', t: "Kid, you're soaked through and you're shaking. When did you last sleep?", d: 4.6 },
    { who: 'YOU', t: 'Please. Just look. Three padlocks. On the outside of the door.', d: 4.8 },
    { t: 'He looks at you for a long moment.\nThen he reaches for the radio.', d: 4.4, fx: () => SND.radio(null, 1.2, 0.25) },
    { who: 'RADIO', t: 'Unit fourteen, possible intruder, 41 Alder Lane. Bring the kid. Take a look.', d: 4.8, fx: () => SND.radio(null, 2, 0.3) },
  ], policeScene);
}
function statePolice(){
  stateNight(); FX.locked.on = false;
  D.locked.maxAng = 1.7; setDoor(D.locked, false, { instant: true, silent: true, force: true }); D.locked.locked = true; PROPS.locks.forEach(l => l.rotation.set(0, 0, 0)); PROPS.chain.rotation.set(0, 0, 0);
  D.locked.lockedThought = 'The locks are back on. All of them. From this side.';
  PROPS.hallShelf.visible = false; PROPS.hallShelfCol.on = false; PROPS.fallenShelf.visible = true; PROPS.fallenShelfCol.on = true; PROPS.clutterMeshes.visible = true;
  W.kitchenWin.glass.visible = false; G.flags.winBroken = true;
  D.front.locked = true; D.back.locked = true; D.front.lockedThought = 'They told you to wait by the car.';
  PROPS.policeCar.visible = true; PROPS.policeCarCol.on = true; FX.copRed.base = 2.4; FX.copBlue.base = 2.4; FX.copRed.on = FX.copBlue.on = true;
  player.battery = Math.max(player.battery, 70); AMB.rain = 0.6;
}
function stateBodies(){
  OFF1.root.visible = true; OFF1.root.position.set(7.3, 0.13, 3.55); OFF1.root.rotation.set(-Math.PI / 2, 0, 0.2);
  OFF2.root.visible = true; OFF2.root.position.set(12.8, 0.13, 9.75); OFF2.root.rotation.set(Math.PI / 2, 0, -0.3);
  TORCH1.visible = true; TORCH1.position.set(6.75, 0.04, 2.4); TORCH2.visible = true; TORCH2.position.set(13.5, 0.04, 10.7);
  beam1.visible = true; beam1.position.set(6.62, 0.12, 2.4); beam1.rotation.set(0, 0, -Math.PI / 2 + 0.05);
  beam2.visible = true; beam2.position.set(13.63, 0.12, 10.7); beam2.rotation.set(0, 0, Math.PI / 2 - 0.05);
  FX.cop1.pos.set(5.6, 0.35, 2.4); FX.cop1.base = 0.9; FX.cop1.dist = 5; FX.cop1.on = true;
  FX.cop2.pos.set(14.6, 0.35, 10.7); FX.cop2.base = 0.8; FX.cop2.dist = 4; FX.cop2.on = true;
}
const COP_PATH = [[9.7, -10.6], [8.3, -6], [8.15, -1.7], [8.05, 0.9], [8.0, 2.4]];
function policeScene(){
  resetWorld(); statePolice(); saveCheckpoint('police'); G.step = 'police';
  setPlayer(6.0, 0, -12.2, Math.PI);
  [OFF1, OFF2].forEach((o, i) => { o.root.visible = true; o.root.position.set(10.1 + i * 0.8, 0, -11.0); o.root.rotation.set(0, Math.PI, 0); });
  S.cop = { t: 0, phase: 'walk', seg: [0, 0], delay: [0, 0.9], doorOpened: false };
  objective('Wait by the car while the officers check the house');
  SND.radio(CAR_POS, 1.4, 0.3); after(1.2, () => say('OFFICER', '"Stay by the car. We\'ll be right back out."', 3.5));
  after(4, () => SND.radio(CAR_POS, 1.0, 0.2));
}
function updateCops(dt){
  const c = S.cop; if (!c) return;
  if (c.phase === 'walk'){
    let inside = 0;
    [OFF1, OFF2].forEach((o, i) => {
      if (c.delay[i] > 0){ c.delay[i] -= dt; return; }
      const si = c.seg[i]; if (si >= COP_PATH.length){ inside++; return; }
      const [tx, tz0] = COP_PATH[si]; const tz = tz0 - i * 0.7; const p = o.root.position; const vx = tx + i * 0.25 - p.x, vz = tz - p.z, L = Math.hypot(vx, vz);
      if (L < 0.08){ c.seg[i]++; if (si === 2 && i === 0 && !c.doorOpened){ c.doorOpened = true; D.front.locked = false; setDoor(D.front, true); } return; }
      const st = Math.min(L, 1.25 * dt); p.x += vx / L * st; p.z += vz / L * st; o.root.rotation.y = Math.atan2(vx, vz); animHuman(o, dt, 1.25);
    });
    if (inside === 2){ c.phase = 'inside'; c.t = 0; OFF1.root.visible = OFF2.root.visible = false; setDoor(D.front, false); after(0.6, () => { D.front.locked = true; }); FX.cop1.base = FX.cop2.base = 1.6; FX.cop1.dist = FX.cop2.dist = 7; FX.cop1.on = FX.cop2.on = true; }
    return;
  }
  if (c.phase !== 'inside') return;
  const prev = c.t; c.t += dt; const T = t => prev < t && c.t >= t;
  if (c.t < 13){
    const a = c.t * 0.45; FX.cop1.pos.set(3 + Math.cos(a) * 1.8, 1.3, 4 + Math.sin(a * 1.3) * 2.2);
    const b = c.t; if (b < 7) FX.cop2.pos.set(13 + Math.sin(b * 0.6) * 1.5, 1.3, 3 + Math.cos(b * 0.5) * 1.5); else FX.cop2.pos.set(7.5, 4.3, 1.5 + (b - 7) * 0.6);
  }
  if (T(2)) SND.radio(new V3(8, 1.2, 2), 1.2, 0.18);
  if (T(8)) think('Their flashlights sweep past the windows. Room by room.', 4);
  if (T(15)) think('The flashlights have stopped moving.', 3.5);
  if (T(17.5)){ SND.scream(FX.cop2.pos.clone(), true); FX.cop2.flicker = 1.6; }
  if (T(20)){ SND.scream(FX.cop1.pos.clone(), true); FX.cop1.flicker = 1.4; }
  if (T(21.6)){ stateBodies(); FX.cop1.base = FX.cop2.base = 0; SND.radio(CAR_POS, 0.6, 0.35); }
  if (T(23.5)) think('Both flashlights went out.', 3);
  if (T(28)){ D.front.locked = false; setDoor(D.front, true, { speed: 0.45, silent: true }); SND.creak(D.front.center, 0.22, 3); think('The front door is opening. Slowly.', 4); objective('Wait.'); }
  if (T(34)) think('Nobody comes out.', 3.5);
  if (T(40)){ SND.radio(CAR_POS, 2.2, 0.38); say('CAR RADIO', '"Unit fourteen, status? ...Unit fourteen, respond."', 4.5); }
  if (T(47)){ SND.scream(new V3(9, 1.5, 5), true); think('A scream. Someone in there is still alive.', 4); objective('Go inside.', 'urgent'); G.step = 'policeGo'; }
  if (c.t > 47 && Math.floor((c.t - 47) / 15) !== Math.floor((prev - 47) / 15)) SND.scream(new V3(9, 1.5, 5), true);
}

// ---------- Chapter 7: the dead officers ----------
function ch7(){
  G.step = 'search'; S.cop = null; AMB.master = 0.55; AMB.rain = 0.45; FX.cop1.base = 0.9; FX.cop2.base = 0.8;
  setObjectives([{ key: 'o1', text: 'Find the officers' }, { key: 'o2', text: 'Find the second officer' }]); flashObj();
  think('Hello? ...Officers?', 2.5); S.radioOn = true; after(3, radioChain);
}
function afterOfficers(){
  if (!(G.flags.o1 && G.flags.o2)) return;
  after(5.5, () => { setObjectives([{ key: 'liv', text: 'Search the living room' }, { key: 'kit', text: 'Search the kitchen' }, { key: 'up', text: 'Search upstairs' }]); flashObj(); G.flags.searching = true; think('Whatever did this is still in the house. Or it was.', 4); });
}
function neighborCall(){
  objective('Someone across the street is calling you'); G.npower = true; FX.nPorch.on = true; SND.latch(new V3(4, 1, -24)); SND.creak(new V3(4, 1, -24), 0.15, 1.2);
  D.nFront.locked = false; setDoor(D.nFront, true, { silent: true });
  NEIGH.root.visible = true; NEIGH.root.position.set(4, 0, -23.35); NEIGH.root.rotation.set(0, 0, 0);
  after(1.4, () => { SND.voice(new V3(4, 1.7, -23.3), 3, 0.4, 175); say('NEIGHBOR, ACROSS THE STREET', '"Hey! Are you okay? You look like you\'ve had a terrible night. Come inside. You can rest here."', 6.5); });
  after(8.5, () => { think('A porch light. Someone awake. Someone warm.', 3.5); objective('Find somewhere safe.'); G.step = 'safe'; });
  G.step = 'called'; lawnWatcher();
}
// it is standing on the Hendersons' lawn, between the police lights, watching you cross the street
function lawnWatcher(){ monPlace(7.4, 0, -4.6, Math.PI); MON.mode = 'watch'; }
// the front door of the neighbor's house shuts with all of you inside: the thing outside is gone
function frontDoorShut(){ S.doorShut = true; SND.lockClick(D.nFront.center); }
function loadPolice(){ policeScene(); }

// ---------- Chapter 8: the neighbor ----------
const NSEAT = { x: 4.5, z: -27.87 };                       // the neighbor's spot on the couch
const SEATS = [{ x: 4.45, z: -26.55, yaw: Math.PI / 2 }, { x: 0.85, z: -29.2, yaw: -Math.PI / 2 }];   // couch, armchair
const CHILL = ['n_talk0', 'n_chat', 'n_drink', 'n_story', 'n_rest', 'n_ask'];
function neighborSit(){ NEIGH.root.position.set(NSEAT.x, 0, NSEAT.z); NEIGH.root.rotation.y = -Math.PI / 2; humanSit(NEIGH, true); SND.rustle(new V3(NSEAT.x, 0.5, NSEAT.z), 0.4); }
function neighborWalkIn(){
  S.neighWalked = true; const path = [[4, -24.6], [3.3, -25.6], [3.6, -27.87]]; let i = 0;
  S.neighWalk = () => { if (i >= path.length){ neighborSit(); return false; } const p = NEIGH.root.position; const [tx, tz] = path[i]; const vx = tx - p.x, vz = tz - p.z, L = Math.hypot(vx, vz); if (L < 0.06){ i++; return true; } const st = Math.min(L, 1.1 * G.dt); p.x += vx / L * st; p.z += vz / L * st; NEIGH.root.rotation.y = Math.atan2(vx, vz); animHuman(NEIGH, G.dt, 1.1); return true; };
  say('NEIGHBOR', '"Come in, come in. Sit down before you fall down."', 4);
}
function startChill(){
  if (G.step !== 'n_talk0') return; G.step = 'n_chat'; objective('Rest and talk with the neighbor');
  dialog([['NEIGHBOR', "There. Isn't that better? Nobody can get you in here.", 4], ['YOU', 'Thanks. Really. I just need a minute.', 3.5], [null, null, 2.5],
    ['NEIGHBOR', "You poor thing. You're soaked right through.", 3.5], ['NEIGHBOR', 'I poured you some water. Go on. Drink something.', 4]],
    () => { G.step = 'n_drink'; objective('Drink the water (on the coffee table)'); });
}
function ch8(){
  saveCheckpoint('neighbor'); G.step = 'n_talk0'; S.radioOn = false; S.chillT = 0;
  // you step inside: the thing on the lawn is gone
  monHide(); ghostHide();
  after(0.8, () => think('(You glance back across the street. The lawn is empty. It is gone.)', 4.5));
  S.loops.music = LOOPS.music(new V3(7.4, 0.8, -24.4)); AMB.master = 0.8;
  objective('Talk to the neighbor (or sit down and rest)'); S.dripOn = true; after(4, dripChain);
}
function talkNeighbor(){
  if (G.step === 'n_talk0') startChill();
  else if (G.step === 'n_drink') dialog([['NEIGHBOR', "Go on. Drink. You'll feel better.", 3]]);
  else if (G.step === 'n_ask'){ G.step = 'n_twist'; objective('Go to the bathroom'); dialog([['YOU', 'Can I use your bathroom?', 2.8], ['NEIGHBOR', 'Of course.', 2.2], ['NEIGHBOR', "Just don't go into that room at the end of the hall.", 4]], twistA); }
}
function drinkWater(){
  SND.gulp(); PROPS.water.visible = false; G.step = 'n_story'; objective('Rest and listen to him');
  dialog([['NEIGHBOR', 'Better?', 2], ['NEIGHBOR', 'Now. Tell me what happened over there.', 3.5],
    ['YOU', "There's something in that house. Something tall. Two police officers went in after it and they... they didn't come out.", 6.5],
    ['NEIGHBOR', 'Mm.', 2.4], ['NEIGHBOR', 'That house has always been particular about its guests.', 4.5], [null, null, 5],
    ['NEIGHBOR', "Put your feet up. You're safe here. Nobody comes in unless I let them in.", 5], [null, null, 6],
    ['NEIGHBOR', 'I have lived on Alder Lane a long time. Longer than the Hendersons. Longer than the trees out front.', 5.5], [null, null, 4],
    ['NEIGHBOR', 'This record was my mother\'s favourite. Or somebody\'s mother.', 4.5], [null, null, 6],
    ['NEIGHBOR', 'The rain always stops around four. You can go home then.', 4.5], [null, null, 4]], () => {
    G.step = 'n_rest'; objective('Rest for a moment on the couch');
    after(5, () => { S.dripLoud = true; think('(Drip. Drip. The same wet sound as the trash bag. From the kitchen.)', 4.5); });
    after(12, () => { think('(You need a minute alone. Somewhere with a lock on the door.)', 4); objective('Ask to use the bathroom'); G.step = 'n_ask'; });
  });
}
function twistA(){
  if (S.loops.music){ S.loops.music.stop(0.03); S.loops.music = null; } AMB.master = 0; S.dripOn = false;
  think('(...That is exactly what Mrs. Henderson said.)', 4); after(3.6, twistB);
}
function twistB(){
  // he gets up from the couch, right next to whoever is closest
  humanSit(NEIGH, false); standUp(); netFx({ t: 'stand' }); objective('Get away from him!', 'urgent');
  const views = monViews(); let best = views[0]; for (const v of views) if (v.pos.distanceTo(NEIGH.root.position) < best.pos.distanceTo(NEIGH.root.position)) best = v;
  player.frozen = true; const p = best.pos, n = NEIGH.root.position;
  let dx = n.x - p.x, dz = n.z - p.z, L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  const sx = p.x + dx * 1.25, sz = p.z + dz * 1.25; NEIGH.root.position.set(sx, 0, sz); NEIGH.root.rotation.y = Math.atan2(-dx, -dz);
  lookAtPoint(new V3(sx, 1.65, sz), 9); SND.lowSwell(0.32, 3); SND.heartbeat(0.7);
  after(0.5, () => say('NEIGHBOR', '"You shouldn\'t have left the house."', 3));
  const showMon = () => { NEIGH.root.visible = false; monPlace(sx, 0, sz, Math.atan2(-dx, -dz)); MON.mode = 'stand'; };
  const showN = () => { NEIGH.root.visible = true; MON.m.root.visible = false; MON.mode = 'off'; };
  after(2.6, () => { flickerGroup(f => f.group === 'neighbor', 2.2); });
  after(2.8, () => { showMon(); SND.sting(0.15); }); after(3.0, showN);
  after(3.5, () => { showMon(); }); after(3.65, showN);
  after(4.3, () => {
    showMon(); G.npower = false; PROPS.shadow.visible = false; SND.bang(new V3(sx, 2, sz)); SND.sting(0.28); player.shake = 0.8; AMB.master = 0.7;
    player.frozen = false; scare('RUN. To the kitchen!', 2.2); saveCheckpoint('chase2'); after(2.0, startChase2);
  });
}
function stateNeighborDark(){
  statePolice(); stateBodies(); S.radioOn = false; D.front.locked = false; setDoor(D.front, true, { instant: true, silent: true });
  G.npower = false; FX.nPorch.on = true; PROPS.water.visible = false; PROPS.shadow.visible = false;
  D.nFront.locked = true; D.nFront.jammed = true;
}
function loadChase2(){
  resetWorld(); statePolice(); stateBodies(); S.radioOn = false; D.front.locked = false; setDoor(D.front, true, { instant: true, silent: true });
  G.npower = true; FX.nPorch.on = true; D.nFront.locked = true; S.doorShut = true; PROPS.water.visible = false;
  NEIGH.root.visible = true; neighborSit(); saveCheckpoint('chase2'); G.step = 'n_twist';
  setPlayer(SEATS[0].x, 0, SEATS[0].z, SEATS[0].yaw); sitDown(SEATS[0]);
  objective('Go to the bathroom'); S.dripOn = true; after(0.5, dripChain);
  after(0.6, () => say('NEIGHBOR', '"Of course. Just don\'t go into that room at the end of the hall."', 3.2));
  after(4.2, () => { think('(...That is exactly what Mrs. Henderson said.)', 2.6); AMB.master = 0; });
  after(6.4, twistB);
}
function loadNeighbor(){
  resetWorld(); statePolice(); stateBodies(); D.front.locked = false; setDoor(D.front, true, { instant: true, silent: true });
  G.npower = true; FX.nPorch.on = true; D.nFront.locked = false; setDoor(D.nFront, true, { instant: true, silent: true });
  NEIGH.root.visible = true; NEIGH.root.position.set(4, 0, -23.35); setPlayer(4.6, 0, -18.5, 0); G.step = 'safe'; saveCheckpoint('neighbor');
  objective('Find somewhere safe.'); S.neighWalked = false; lawnWatcher();
}

// ---------- Chapter 9: final escape ----------
const CHASE2 = { slow: 1.8, walk: 4.3, burst: 7.0, catchup: 5.0, catchupDist: 12, closeCap: 5.0, catch: 0.9, doorStall: 1.6 };
function startChase2(){
  G.step = 'chase2'; D.nFront.jammed = true; D.nFront.jamThought = "It won't open! Not this way!";
  setObjectives([{ text: 'Out the back. Through the kitchen.', cls: 'urgent' }, { key: 'k', text: 'Grab the back door key (hook by the kitchen door)' }, { key: 's', text: 'Push the shelf away from the back door' }, { key: 'u', text: 'Unlock the back door' }, { key: 'g', text: 'Get through the garden gate' }]); flashObj();
  monChase(CHASE2);
  player.stamina = Math.max(player.stamina, 85);
}
function endChase(){
  G.step = 'end1'; MON.mode = 'watch'; stopChaseMusic(); AMB.master = 0; after(1.4, () => { AMB.master = 1; AMB.rain = 0.5; });
  S.endT = 0; S.monMoved = false; FX.backStreet2.unstable = 0.55;
  objective('Keep running.'); after(1.8, () => think("It stopped. It isn't chasing you anymore.", 3.5));
}
function finalEnding(){
  G.state = 'ending'; player.flashOn = false; fade(1, 3); G.ignoreUnlock = true; if (document.exitPointerLock) document.exitPointerLock();
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  setTimeout(() => { AMB.master = 0; $('hud').hidden = true; $('ending').hidden = false; for (let i = 0; i < 7; i++) SND.bird(i * 0.9 + Math.random()); }, 3200);
  setTimeout(() => $('end1').classList.add('on'), 4700);
  setTimeout(() => $('end2').classList.add('on'), 8700);
  setTimeout(() => $('end3').classList.add('on'), 13000);
  setTimeout(() => $('end4').classList.add('on'), 15500);
}

function storyUpdateC(dt){
  const p = player.pos, f = G.flags, inN = inHouseRect(p.x, p.z) === 'neighbor';
  if (G.step === 'police' || G.step === 'policeGo') updateCops(dt);
  if ((G.step === 'policeGo' || (G.step === 'police' && S.cop && S.cop.t > 28)) && inHouseRect(p.x, p.z) === 'house' && p.z > 0.4) ch7();
  if (G.step === 'search' && f.searching){
    const l0 = player.level === 0;
    if (l0 && p.x < 5.9 && p.z < 7.9 && !f.s_liv){ f.s_liv = true; markObj('liv'); think('The couch. The TV. Nothing.', 3); }
    if (l0 && p.x > 6.2 && p.z > 6.2 && !f.s_kit){ f.s_kit = true; markObj('kit'); think('Just the broken window, and the rain coming in.', 3.5); }
    if (player.level === 1 && p.z > 5 && !f.s_up){ f.s_up = true; markObj('up'); think('The locked door is shut again. Every lock is back in place.', 4.5); SND.lowSwell(0.2, 3); }
    if (f.s_liv && f.s_kit && f.s_up && !f.callArmed){ f.callArmed = true; objective('Nothing here. Wait... a sound from across the street.'); after(4, neighborCall); }
  }
  if (G.step === 'safe' && !S.neighWalked && Math.hypot(p.x - 4, p.z + 24) < 5) neighborWalkIn();
  if (!VIEW_ID && S.neighWalk && !S.neighWalk()) S.neighWalk = null;
  if (G.step === 'safe' && inN) ch8();
  // everyone settles in; after a little while (or once you sit) he starts talking
  if (G.step === 'safe' && !S.lawnSeen && MON.m.root.visible && inView(new V3(MON.pos.x, 2.4, MON.pos.z), 25, 40, false)){ S.lawnSeen = true; think('(It is standing on the lawn. Watching you. Do not look back. Just get inside.)', 4.5); }
  if (CHILL.includes(G.step) && !VIEW_ID && !S.doorShut){
    S.shutT += dt;
    if (!D.nFront.open && D.nFront.ang < 0.05) frontDoorShut();
    else if (S.shutT > 6 && everyone(q => inHouseRect(q.x, q.z) === 'neighbor' && Math.hypot(q.x - 4, q.z + 24) > 1.2)){ setDoor(D.nFront, false); }   // the door swings shut behind you
  }
  if (G.step === 'n_talk0' && !VIEW_ID){
    const allIn = everyone(q => inHouseRect(q.x, q.z) === 'neighbor');
    // he starts talking once you sit, or once everyone has been inside for a bit (or talk to him yourself)
    S.chillT += dt;
    if (!S.neighWalk && NEIGH.seated && ((player.seated && S.chillT > 2) || (allIn && S.chillT > 8) || S.chillT > 16)) startChill();
  }
  if ((CHILL.includes(G.step) || G.step === 'n_twist') && NEIGH.root.visible && !player.frozen){
    if (!S.neighWalk){ const ty = Math.atan2(p.x - NEIGH.root.position.x, p.z - NEIGH.root.position.z); let dy = ty - NEIGH.root.rotation.y; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      if (NEIGH.seated){ const h = NEIGH.P.head; h.rotation.y += (clamp(dy, -1.1, 1.1) - h.rotation.y) * Math.min(1, G.dt * 2); }   // sitting: only his head turns to watch you
      else NEIGH.root.rotation.y += dy * Math.min(1, dt * 2); }
    const nh = new V3(NEIGH.root.position.x, NEIGH.seated ? 1.32 : 1.72, NEIGH.root.position.z), dN = Math.hypot(p.x - nh.x, p.z - nh.z);
    if (looked('blink', dN < 3.2 && inView(nh, 12, 4), dt, 3.5)) observe('blink', "(They haven't blinked. Not once.)");
    if (PROPS.shadow.visible && looked('shadow', inView(new V3(0.09, 1.9, -28.3), 22, 8), dt, 1.2)) observe('shadow', '(Their shadow on the wall behind them... it reaches all the way to the ceiling.)');
    const hp = new V3(); NEIGH.P.aR.getWorldPosition(hp); hp.y -= 0.72;
    if (dN < 2.4 && looked('hands', inView(hp, 18, 3), dt, 0.9)) observe('hands', '(Their fingers are too long. Far too long.)');
    if (looked('ndoor', inView(D.nLocked.center, 14, 9), dt, 0.8)) observe('ndoor', '(A door at the end of the hall. Padlocked. On the outside.)');
  }
  if (G.step === 'chase2'){
    const inHall = p.x > 8.1 && p.x < 9.9 && p.z > -31 && p.z < -24.1;
    if (inHall && !f.hallLocks){ f.hallLocks = true; if (D.nBath.open) setDoor(D.nBath, false, { slam: true, speed: 18 }); else SND.lockClick(D.nBath.center); D.nBath.locked = true; D.nBath.lockedThought = 'Locked! From the inside?'; SND.knock(D.nLocked.center, 3, true); SND.clang(D.nLocked.center, 0.2, 0.7); }
    if (inHall && !f.livSlam && p.x > 8.4 && Math.hypot(p.x - 8, p.z + 27) > 1.6 && Math.hypot(MON.pos.x - 8, MON.pos.z + 27) > 2.2){ f.livSlam = true; setDoor(D.nLivHall, false, { slam: true, speed: 18 }); }
    if (inHall && !f.hallGhost && inView(new V3(9, 2.3, -24.5), 22, 8)){ f.hallGhost = true; ghostShow(9, 0, -24.55, true); SND.sting(0.14); after(0.3, ghostHide); }
    const inKitchen = q => q.x > 10.2 && q.z > -34 && q.z < -24.1 && Math.hypot(q.x - 10, q.z + 29.5) > 0.8;
    if (inKitchen(p) && !f.kitBurst){ f.kitBurst = true; lightBurst(FX.nKitchen.pos, 0xfff0d8); }
    if (!f.kitSlam && D.nKitchen.open && everyone(inKitchen) && Math.hypot(MON.pos.x - 10, MON.pos.z + 29.5) > 1.3){
      f.kitSlam = true; D.nKitchen.hold = 10; setDoor(D.nKitchen, false, { slam: true, speed: 18 });
      after(0.5, () => think('The door slammed shut behind you. Something is throwing itself against it. Key, shelf, back door. Hurry!', 4.5));
    }
    const outside = q => q.z < -34.7;
    if (!f.backSlam && D.nBack.open && everyone(outside) && MON.pos.z > -34 && Math.hypot(MON.pos.x - 13, MON.pos.z + 34) > 1.5){ f.backSlam = true; D.nBack.hold = 3.5; setDoor(D.nBack, false, { slam: true, speed: 18 }); }
    if (p.x > 10.2 && !f.winGhost && inView(new V3(16.9, 2.3, -29), 20, 9)){ f.winGhost = true; ghostShow(16.9, 0, -29, true); SND.sting(0.14); after(0.45, ghostHide); }
    if (p.z < -34.4 && !f.yard){ f.yard = true; think('The gate! At the back of the garden!', 2.5); }
    if (f.yard && !f.yardGhost && inView(new V3(2.4, 2.3, -42.8), 25, 14)){ f.yardGhost = true; ghostShow(2.4, 0, -42.8, true); after(0.5, ghostHide); }
    if (p.z < -46.6) endChase();
  }
  if (G.step === 'end1'){
    S.endT += dt; const mh = new V3(MON.pos.x, MON.pos.y + 2.4, MON.pos.z);
    if (!S.monMoved && !inView(mh, 75, 90, false)){ S.monMoved = true; monPlace(38.3, 0, -50.4); MON.mode = 'watch'; monFacePlayer(); }
    if (S.monMoved && !f.watchSeen && inView(new V3(38.3, 2.4, -50.4), 20, 70, false)){ f.watchSeen = true; think('It stands under the streetlight at the end of the road. It does not follow. It just watches.', 5); }
    if (S.monMoved && (p.x < -12 || S.endT > 24 || Math.hypot(p.x - 38.3, p.z + 50.4) < 7)) finalEnding();
  }
}
