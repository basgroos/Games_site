// ================= CHAPTER 3: DON'T LOOK AWAY - the story =================
// The heart of it: C3ATT. A change only happens to something while nobody is looking at it - every player's view counts,
// and reading a note, holding up your phone or a black cutscene all count as looking away. Watchers (C3W) fire the
// moment someone does look at a thing (for "was that always there?" thoughts and the brief appearances of the thing).
let C3ENT = null, VISITOR = null, E_ANSWER = null, E_LOOP = null;
const C3ATT = [], C3W = [];
const BLIND_STATES = ['note', 'phone', 'cine', 'keypad'];
const pt = (x, y, z) => new V3(x, y, z);
function viewBlind(){ if (VIEW_ID){ const r = MP.remotes[VIEW_ID]; return !!(r && r.bl); } return BLIND_STATES.includes(G.state); }
// add a change: pts() = the points that must all be out of sight, wait = seconds out of sight, apply() = the change
function c3Change(id, o){ if (G.flags['a_' + id] || C3ATT.some(a => a.id === id)) return; C3ATT.push(Object.assign({ id, t: 0, seen: false, wait: 0.4, fov: 62, dist: 48, occl: true }, o)); }
function c3Watch(id, o){ if (G.flags['w_' + id] || C3W.some(w => w.id === id)) return; C3W.push(Object.assign({ id, t: 0, seen: false, need: 0.3, fov: 22, dist: 30, occl: true }, o)); }
function c3Unwatch(id){ const i = C3W.findIndex(w => w.id === id); if (i >= 0) C3W.splice(i, 1); }
function c3Mark(){
  if (viewBlind()) return;
  for (const a of C3ATT){ if (a.seen || (a.when && !a.when())) continue; if (a.pts().some(p => inView(p, a.fov, a.dist, a.occl))) a.seen = true; }
  for (const w of C3W){ if (w.seen) continue; if (w.pts().some(p => inView(p, w.fov, w.dist, w.occl))) w.seen = true; }
  if (C3ENT && C3ENT.visible){ const p = C3ENT.position; if (inView(pt(p.x, p.y + 2.3, p.z), 62, 70, C3.entOccl) || inView(pt(p.x, p.y + 1.2, p.z), 62, 70, C3.entOccl)) C3.entSeenNow = true; }
}
function c3Tick(dt){
  for (const a of C3ATT.slice()){
    const ready = !a.when || a.when(); const seen = a.seen; a.seen = false;
    if (!ready){ a.t = 0; continue; }
    a.t = seen ? 0 : a.t + dt;
    if (a.t >= a.wait){ C3ATT.splice(C3ATT.indexOf(a), 1); if (!a.repeat) G.flags['a_' + a.id] = 1; a.apply(); MP.dirty = true; if (a.repeat && (!a.until || !a.until())) { a.t = 0; C3ATT.push(a); } }
  }
  for (const w of C3W.slice()){ const seen = w.seen; w.seen = false; w.t = seen ? w.t + dt : 0; if (w.t >= w.need){ C3W.splice(C3W.indexOf(w), 1); G.flags['w_' + w.id] = 1; w.onSeen(); MP.dirty = true; } }
  C3.entSeen = C3.entSeenNow; C3.entSeenNow = false;
}
function localSnd(fn){ const m = MP.mute; MP.mute = true; try { fn(); } finally { MP.mute = m; } }
const hallEnd = () => C3HALL_Z + (G.flags.c3len || 0) * C3SEG;
const inHall = q => q.x > X3(3) && q.x < X3(5) && q.z > 4.2 && q.z < hallEnd();
const inC3House = q => { const r = inHouseRect(q.x, q.z); return r === 'c3house' || r === 'c3hall'; };
const inForest = q => q.x > FWX - 30;
function c3Broke(n){ G.flags['c3broke' + n] = 1; (G.c3rules = G.c3rules || {})[n] = 1; }
function c3t(add){ G.flags.c3t = (G.flags.c3t || 0) + add; }
function c3TimeStr(m){ const h = 9 + Math.floor(m / 60), mm = m % 60; return ((h - 1) % 12 + 1) + ':' + String(mm).padStart(2, '0') + (h >= 12 && h < 24 ? ' AM' : ' PM'); }
function c3Msg(from, text){ G.flags.c3m = (G.flags.c3m || []).concat([[from, text]]); MP.dirty = true; }
function entPlace(x, y, z, faceX, faceZ){ C3ENT.position.set(x, y, z); C3ENT.rotation.y = Math.atan2(faceX - x, faceZ - z); C3ENT.visible = true; MP.dirty = true; }
function entHide(){ if (C3ENT){ C3ENT.visible = false; MP.dirty = true; } }
function nearestPlayer(x, z){ let best = null, bd = 1e9; for (const v of monViews()){ const d = Math.hypot(v.pos.x - x, v.pos.z - z); if (d < bd){ bd = d; best = v; } } return { v: best, d: bd }; }

// ---------- what every computer shows, derived from the shared flags ----------
function c3ApplyLen(n){
  const old = C3.curLen == null ? n : C3.curLen; C3.curLen = n;
  if (old !== n){ const e0 = C3HALL_Z + old * C3SEG, p = player.pos;
    if (G.state !== 'menu' && player.level === 0 && p.x > X3(2) && p.x < X3(6) && p.z > e0 - 0.05 && p.z < e0 + 4.2){ p.z += (n - old) * C3SEG; if (player.trail) player.trail = []; } }
  C3.seg.forEach((s, i) => { const on = i < n; s.g.visible = on; s.cl.on = s.cr.on = on; });
  const nd = G.flags.c3nd || 0, s4 = C3.seg[4];
  if (nd > 0 && n > 4){ s4.wl.visible = false; s4.cl.on = false; C3.ndWallCols.forEach(c => { c.on = true; }); } else { s4.wl.visible = true; C3.ndWallCols.forEach(c => { c.on = false; }); }
  const dz = n * C3SEG; C3.end.position.z = dz;
  C3.movers.forEach(m => { m.c.minZ = m.z0 + dz; m.c.maxZ = m.z1 + dz; });
  const sd = C3.studyDoor, b = C3.sdBase; sd.pivot.position.z = b.pz + dz; sd.collider.minZ = b.c0 + dz; sd.collider.maxZ = b.c1 + dz; sd.center.z = b.cz + dz;
  FX.c3study.pos.z = C3.sdBase.lz + dz;
}
function ch3Visuals(){
  const f = G.flags; if (!f.ch3) return;
  const n = f.c3len || 0, key = n + ':' + (f.c3nd || 0);
  if (key !== C3.lastLen){ C3.lastLen = key; c3ApplyLen(n); }
  if ((f.c3carpet || 0) !== C3.lastCarpet){ C3.lastCarpet = f.c3carpet || 0; M3.carpet.map = C3TEX.carpet[C3.lastCarpet]; M3.carpet.needsUpdate = true; }
  if ((f.c3paint || 0) !== C3.lastPaint){ C3.lastPaint = f.c3paint || 0; PROPS.c3paintingMat.map = C3TEX.paint[C3.lastPaint]; PROPS.c3paintingMat.needsUpdate = true; }
  const cm = f.c3clock != null ? f.c3clock : (f.c3t || 0); if (cm !== C3.lastClock){ C3.lastClock = cm; PROPS.c3minHand.rotation.z = -(cm % 60) / 60 * Math.PI * 2; PROPS.c3hourHand.rotation.z = -((9 + cm / 60) % 12) / 12 * Math.PI * 2; }
  const th = f.c3thermo || 16; if (th !== C3.lastThermo){ C3.lastThermo = th; PROPS.c3thermoScreen.material.map = C3TEX.thermo[th]; PROPS.c3thermoScreen.material.needsUpdate = true; }
  // the hallway lamps: on while their segment exists and the power is on
  C3.seg.forEach((s, i) => { if (s.lamp) s.lamp.on = i < n && !f.c3dark; });
  FX.c3hallFixed.on = !f.c3dark; if (f.c3dark) FX.c3hall.on = false;
  // the door that wasn't there before: 0 none, 1 closed, 2 open onto bricks, 3 open onto the woods
  const nd = f.c3nd || 0; C3.newDoor.visible = nd > 0 && n > 4;
  C3.ndBrick.visible = nd === 2; C3.ndBrickCol.on = nd === 2; C3.ndCol.on = nd === 1;
  const tgt = nd >= 2 ? -Math.PI / 2 - 1.45 : -Math.PI / 2; C3.ndPivot.rotation.y += (tgt - C3.ndPivot.rotation.y) * Math.min(1, G.dt * 4);
  C3.ndDark.visible = nd === 3;
  PROPS.c3fold.visible = !!f.c3fold && !f.c3folded; PROPS.c3steps.visible = !!f.c3steps;
  PROPS.c3coat.visible = f.c3coat !== 0;
  PROPS.c3phoneLcd.material.color.setHex(f.c3ringing ? 0xb02018 : 0x1a2a18);
  PROPS.c3wardDoor.rotation.y = f.c3ward ? -1.6 : 0;
  C3.signArm2.visible = !!f.c3sign2; C3.fakePath.visible = !!f.c3sign2;
  C3.forestDoor.visible = !f.c3fdoorGone;
  C3.refl.forEach((g, i) => { g.visible = !(f.c3reflGone && i < 4); });
  C3.machineLed.visible = !f.c3machine || Math.sin(G.time * 6) > 0;
  G.flashDrain = f.ch3 ? 0.22 : 0.9;
}

// ---------- the phone (yours; everyone holds their own) ----------
function c3Unread(){ return ((G.flags.c3m || []).length) - (G.c3read || 0); }
function openPhone(){
  if (G.state !== 'playing' || !G.flags.ch3) return;
  G.state = 'phone'; for (const k in keys) keys[k] = false; $('phone').hidden = false; renderPhone(); G.c3read = (G.flags.c3m || []).length; G.c3phoneOpened = G.time; localSnd(() => SND.click(camera.position));
}
function closePhone(){ if (G.state !== 'phone') return; $('phone').hidden = true; G.state = 'playing'; localSnd(() => SND.click(camera.position)); c3PhoneClosed(); }
function renderPhone(){
  const f = G.flags; $('phTime').textContent = c3TimeStr(f.c3t || 0); $('phBat').textContent = Math.round(player.battery) + '%';
  const msgs = f.c3m || [];
  $('phMsgs').innerHTML = msgs.length ? msgs.map(([who, t]) => '<div class="ph-msg"><span>' + escHtml(who) + '</span>' + escHtml(t) + '</div>').join('') : '<div class="ph-empty">No messages. One bar of signal, then none.</div>';
  $('phMsgs').scrollTop = 1e6;
}
function c3PhoneClosed(){
  // the very last message: you look up from your phone and you are somewhere else
  if (G.flags.c3final && !G.c3home && (G.flags.c3m || []).length >= G.flags.c3final){
    G.c3home = true; localSnd(() => { fade(1, 0.05); SND.lowSwell(0.25, 3); }); movePlayerLocal(X3(4), 0, -2.4, Math.PI);
    setTimeout(() => localSnd(() => fade(0, 1.8)), 160);
  }
}

// ---------- the house, every frame, on every computer (teleports, little sounds) ----------
function ch3Local(dt){
  const f = G.flags; if (!f.ch3){ $('phBadge').hidden = true; G.flashDrain = 0.9; return; }
  ch3Visuals();
  const p = player.pos;
  // HUD: the phone
  const u = c3Unread(); $('phBadge').hidden = G.state === 'cine'; $('phBadge').textContent = u > 0 ? 'Q \u00b7 phone (' + u + ' new)' : 'Q \u00b7 phone';
  $('phBadge').classList.toggle('new', u > 0);
  const nmsg = (f.c3m || []).length; if (nmsg > (G.c3msgSeen || 0)){ if (G.c3msgSeen !== undefined) localSnd(() => { SND.click(camera.position); setTimeout(() => SND.click(camera.position), 120); }); G.c3msgSeen = nmsg; }
  if (G.state === 'phone'){ const k = nmsg + ':' + (f.c3t || 0) + ':' + Math.round(player.battery); if (k !== G.c3phKey){ G.c3phKey = k; renderPhone(); } }
  if (G.state !== 'playing') return;
  // rule two: the stairs go nowhere while the footsteps are upstairs
  if (f.c3stairLoop && player.level === 1 && p.x > X3(4.9) && p.z > 3.0 && p.x < X3(6.2)){
    movePlayerLocal(X3(5.5), 0, 0.75, Math.PI); player.pitch = 0.25; useInter(E_LOOP);
    localSnd(() => { think('(You were at the top. You are sure you were at the top.)', 3.5); SND.heartbeat(0.4); });
  }
  // the front door opens onto the hallway
  if (f.c3doorLoop && player.level === 0 && p.z < -0.4 && Math.abs(p.x - X3(4)) < 0.9){
    movePlayerLocal(X3(4), 0, hallEnd() - 1.3, 0); useInter(E_LOOP);
    localSnd(() => { SND.doorClose(pt(X3(4), 1, hallEnd() - 0.5), false); SND.heartbeat(0.5); });
    G.c3loops = (G.c3loops || 0) + 1; localSnd(() => { if (G.c3loops === 1){ SND.sting(0.2); flashFx('#000', 0.6, 1); } think(['(The porch. The rain. And then the hallway again.)', '(No. No, no, no.)', '(Every time. The hallway, every time.)'][Math.min(2, G.c3loops - 1)], 3.5); });
  }
  // through the door that wasn't there: the woods
  if (f.c3nd === 3 && p.x < X3(2.85) && Math.abs(p.z - C3.ndZ) < 0.6 && player.level === 0){
    localSnd(() => { fade(1, 0.05); SND.lowSwell(0.2, 3); }); movePlayerLocal(FWX, 0, FZ + 0.7, Math.PI); setTimeout(() => localSnd(() => fade(0, 1.4)), 150);
  }
  // the second path at the sign only ever leads back to the sign
  if (f.c3sign2 && p.x < FWX - 9.5 && p.z > FZ + 39 && p.x > FWX - 40){ movePlayerLocal(FWX + 0.4, 0, FZ + 31.2, Math.PI); localSnd(() => think('(The sign again. The same sign. You walked straight away from it.)', 3.5)); }
  // footsteps behind you in the hallway
  if (f.c3follow && inHall(p) && Math.hypot(player.vel.x, player.vel.z) > 0.6){
    G.c3stepT = (G.c3stepT || 0) - dt;
    const back = pt(p.x + Math.sin(player.yaw) * 3.5, 0.1, p.z + Math.cos(player.yaw) * 3.5);
    if (inView(pt(back.x, 1.2, back.z), 60, 6, true)) G.c3stepT = 3;   // they stop when you look
    else if (G.c3stepT <= 0){ G.c3stepT = 0.62; localSnd(() => SND.step('wood', back, 0.32)); }
  }
  // the house and the woods make their own small noises (each computer its own)
  G.c3ambT = (G.c3ambT || 4) - dt;
  if (G.c3ambT <= 0){
    const a = Math.random() * 6.28, r = 6 + Math.random() * 14, at = pt(p.x + Math.cos(a) * r, 0.5 + Math.random() * 2, p.z + Math.sin(a) * r);
    localSnd(() => {
      if (inForest(p)){ const k = Math.random(); if (k < 0.35){ SND.thud(at, 0.25); SND.creak(at, 0.05, 0.25); } else if (k < 0.7) SND.rustle(at, 0.6); else if (k < 0.82) SND.voice(pt(p.x + Math.cos(a) * 30, 1.5, p.z + Math.sin(a) * 30), 1.2, 0.04, 70); else SND.creak(at, 0.08, 1.2); G.c3ambT = rnd(3, 8); }
      else if (inC3House(p)){ const k = Math.random(); if (k < 0.4) SND.creak(at, 0.06, 0.9); else if (k < 0.6) SND.clang(at, 0.04, 0.35); else if (k < 0.7) SND.knock(at, 1, false); G.c3ambT = rnd(7, 16); }
      else G.c3ambT = 6;
    });
  }
}

// ---------- states ----------
function ch3Reset(){
  C3ATT.length = 0; C3W.length = 0; C3.lastLen = null; C3.curLen = null; G.flashDrain = 0.9; C3.lastCarpet = C3.lastPaint = C3.lastClock = C3.lastThermo = -1;
  if (C3ENT){ C3ENT.visible = false; C3ENT.position.set(0, -50, 0); }
  if (VISITOR) VISITOR.root.visible = false;
  C3.entSeen = C3.entSeenNow = false;
  G.c3read = 0; G.c3msgSeen = undefined; G.c3home = false; G.c3loops = 0; G.c3answerUntil = 0; G.c3callSeen = 0;
  $('phone').hidden = true;
  PROPS.c3package.position.set(X3(5.0), 0, -0.6); PROPS.c3package.visible = true;
  PROPS.c3plant.position.set(X3(1.4), 0, 0.5); PROPS.c3plantCol.minX = X3(1.2); PROPS.c3plantCol.maxX = X3(1.6); PROPS.c3plantCol.minZ = 0.3; PROPS.c3plantCol.maxZ = 0.7;
  PROPS.c3chair.g.position.set(X3(8.0), 0, 2.55); PROPS.c3chair.g.rotation.y = 0;
  C3.mark.position.set(FWX + 3.4, 0, FZ + 12);
  C3.markCol.minX = FWX + 3.1; C3.markCol.maxX = FWX + 3.7; C3.markCol.minZ = FZ + 11.7; C3.markCol.maxZ = FZ + 12.3;
  [FX.c3lamp, FX.c3living, FX.c3bedroom, FX.c3porch, FX.c3carLights].forEach(f => { f.on = false; });
  [FX.c3hall, FX.c3kitchen, FX.c3bath, FX.c3back, FX.c3closet, FX.c3hallFixed, FX.c3landing].forEach(f => { f.on = true; f.flicker = 0; });
}
function stateC3(){
  const f = G.flags; Object.assign(f, { ch3: true, c3len: 0, c3carpet: 0, c3paint: 0, c3thermo: 16, c3t: 32, c3m: [], c3nd: 0, c3coat: 1 });
  G.power = false; G.npower = false; setHouseLights([]);
  G.inv = ['Phone']; renderInv(); player.hasFlash = true; player.battery = 100; $('batWrap').hidden = false;
  D.c3front.locked = true; setDoor(D.c3front, false, { instant: true, silent: true, force: true });
  D.c3study.locked = true; setDoor(D.c3study, false, { instant: true, silent: true, force: true });
  AMB.rain = 0.75; AMB.wind = 0.35; FX.c3porch.on = false;
}
function startCh3(){
  G.c3rules = {}; resetWorld(); stateC3(); saveCheckpoint('c3'); G.step = 'c3_drive';
  setPlayer(X3(6.4), 0, -11.8, Math.PI); FX.c3carLights.on = true;
  cine([
    { t: 'CHAPTER 3', d: 2.4 },
    { t: "DON'T LOOK AWAY", cls: 'big', d: 3 },
    { t: 'Sunday. 9:32 PM.', d: 2.6 },
    { t: 'HOUSE-SITTER WANTED. A few nights. Quiet house, no pets, good pay.<br>You answered the ad on Thursday.', d: 5.5 },
    { t: 'Ruth Calloway sounded kind on the phone. Tired, but kind.', d: 4 },
    { t: 'The house is at the end of Blackwater Road. Forty minutes past the last streetlight.', d: 4.5 },
    { t: 'She said she would leave the keys in the mailbox. And a note.', d: 4 },
  ], () => { objective('Get the keys from the mailbox (by the road)'); G.step = 'c3_mail'; after(1.5, () => think('One window lit. The rest of the house is dark. The trees come right up to it.', 4.5)); });
}
function c3TasksDoneState(){
  const f = G.flags; Object.assign(f, { c3noteRead: 1, c3thermo: 20, c3lamp: 1, c3t: 58, c3carpet: 1, c3paint: 1, a_carpet1: 1, a_paint1: 1, a_lampoff: 1, a_chair: 1 });
  G.inv = ['Phone', 'House keys', 'Study key']; renderInv(); PROPS.c3package.visible = false;
  D.c3front.locked = true; FX.c3lamp.on = true; FX.c3porch.on = true;
  PROPS.c3chair.g.position.set(X3(7.7), 0, 2.3); PROPS.c3chair.g.rotation.y = 0.7;
}
function loadC3Mid(){ resetWorld(); stateC3(); c3TasksDoneState(); setPlayer(X3(3.6), 0, 2.2, Math.PI); G.step = 'c3_msg1'; saveCheckpoint('c3mid'); objective('Wait.'); after(2, c3Message1); }
function loadC3Dark(){
  resetWorld(); stateC3(); c3TasksDoneState(); Object.assign(G.flags, { c3len: 12, c3carpet: 2, c3fold: 1, c3dark: 1, c3paint: 2, c3steps: 0, c3ward: 1, c3letter: 1, c3follow: 1 });
  D.c3study.locked = false; setDoor(D.c3study, true, { instant: true, silent: true }); D.c3bath.locked = false; setDoor(D.c3bath, true, { instant: true, silent: true });
  setPlayer(X3(4), 0, C3HALL_Z + 24 + 2.2, 0); G.step = 'c3_dark'; saveCheckpoint('c3dark'); c3DarkObjective();
}
function loadC3Forest(){ resetWorld(); stateC3(); Object.assign(G.flags, { c3len: 12, c3nd: 3 }); G.inv = ['Phone', 'House keys']; renderInv(); setPlayer(FWX, 0, FZ + 0.7, Math.PI); c3ForestEnter(); }
function loadC3Stalk(){ resetWorld(); stateC3(); Object.assign(G.flags, { c3len: 12, c3nd: 3, c3fdoorGone: 1, c3machine: 1, c3cabin: 1 }); G.inv = ['Phone', 'House keys']; renderInv(); setPlayer(FWX + 9, 0, FZ + 44.5, -Math.PI / 2); c3StartStalk(); }

// ---------- 0-5 minutes: arriving, the rules, the chores ----------
function c3Rules(){
  return `Thank you for watching the house. It's an old house and it has its habits, but it's easy if you keep to a few rules:

1. Don't open the front door after 10 PM.
2. If you hear footsteps upstairs while you're downstairs, don't go upstairs.
3. If the hallway carpet changes, don't try to fix it.
4. If you see a door that wasn't there before, don't open it right away.
5. If the phone rings from an unknown number, let it ring.
6. If you hear someone calling your name from the woods, don't answer.

Tonight:
 - turn the heating up (thermostat in the hall)
 - water the fern
 - the living room lamp, please. It doesn't like the dark.
 - check the kitchen
 - bring the parcel in from the porch

The study key is in the parcel. You won't need it.
                                        - Ruth`;
}
function c3TaskObjectives(){
  const f = G.flags;
  setObjectives([{ key: 'thermo', text: 'Turn the heating up (thermostat, hall)', done: !!f.t_thermo }, { key: 'plant', text: 'Water the fern (living room)', done: !!f.t_plant },
    { key: 'lamp', text: 'Turn on the living room lamp (switch by the arch)', done: !!f.t_lamp }, { key: 'kitchen', text: 'Check the kitchen', done: !!f.t_kitchen }, { key: 'parcel', text: 'Bring in the parcel from the porch', done: !!f.t_parcel }]);
}
function c3TaskDone(key, mins){
  if (G.flags['t_' + key]) return; G.flags['t_' + key] = 1; c3t(mins || 3); markObj(key); MP.dirty = true;
  if (['thermo', 'plant', 'lamp', 'kitchen', 'parcel'].every(k => G.flags['t_' + k]) && G.step === 'c3_tasks'){
    G.step = 'c3_msg1'; G.flags.c3t = 58; saveCheckpoint('c3mid'); objective('Everything on Ruth\'s list is done. Get warm.');
    after(4, c3Message1);
  }
}
// ---------- 5-10 minutes: ten o'clock ----------
function c3Message1(){
  G.flags.c3t = 60; c3Msg('UNKNOWN NUMBER', 'did you lock the front door?');
  objective('Your phone buzzed (press Q)'); G.step = 'c3_msg1b';
  after(9, () => {
    G.step = 'c3_knock'; objective('Someone is knocking at the front door. It is after 10 PM.');
    for (let i = 0; i < 3; i++) after(i * 3.2, () => SND.knock(pt(X3(4), 1.4, -0.1), 3, false));
    after(16, c3Ring);
  });
}
function c3Ring(){
  if (G.step !== 'c3_knock') return;
  G.step = 'c3_ring'; G.flags.c3ringing = 1; objective('The phone is ringing (living room). The display says UNKNOWN.');
  let n = 0; const ring = () => { if (!G.flags.c3ringing) return; SND.ring(pt(X3(-2.7), 0.6, 3.6)); if (++n < 7) after(3.4, ring); else { G.flags.c3ringing = 0; after(1.5, () => { c3Msg('UNKNOWN NUMBER', 'you should have answered'); c3Footsteps(); }); } };
  ring();
}
function c3AnswerPhone(){
  G.flags.c3ringing = 0; c3Broke(5); SND.latch(pt(X3(-2.7), 0.6, 3.6));
  dialog([[null, '(Breathing. Then a voice. Your own voice.)', 3.5], ['YOUR VOICE (PHONE)', 'Why did you look away?', 3], [null, null, 1]], () => {
    think('(The line is dead. It was never connected. The cord is cut.)', 4);
    c3Change('thermo4', { pts: () => [pt(X3(2.1), 1.5, 0.6)], wait: 1, apply: () => { G.flags.c3thermo = 4; c3Watch('thermo4', { pts: () => [pt(X3(2.1), 1.5, 0.6)], need: 0.6, fov: 18, dist: 6, onSeen: () => think('(The thermostat says 4 degrees. Your breath is fogging.)', 4) }); } });
    after(5, c3Footsteps);
  });
}
function c3Footsteps(){
  if (G.step === 'c3_steps' || c3At3('c3_up')) return;
  G.step = 'c3_steps'; G.flags.c3stairLoop = 1; objective('Footsteps. Upstairs.');
  let i = 0; const walk = () => { if (G.step !== 'c3_steps') return; SND.step('wood', pt(X3(-2 + (i % 8) * 0.9), 3.05, 2 + Math.sin(i) * 1.5), 0.7); if (i % 5 === 0) SND.creak(pt(X3(0), 3.1, 3), 0.1, 0.8); i++; if (i < 34) after(0.75, walk); };
  walk();
  after(2, () => think('(Rule two.)', 2.5));
  after(27, () => { G.flags.c3stairLoop = 0; G.step = 'c3_up'; objective('The footsteps stopped. Check the noise upstairs.'); });
}
// ---------- the upstairs, the photographs ----------
function c3UpstairsBox(){
  showNote(`A shoebox of photographs. All of them of this house, from the front, someone standing at the door. Each one has two names on the back.

1971   Henrik Aalto, owner.   With: M. Okafor, house-sitter.
1990   M. Okafor, owner.   With: Ruth Calloway, house-sitter.
2009   Ruth Calloway, owner.   With: (torn off)

The house-sitter in each picture is the owner in the next one.`, 'inspect', () => {
    if (G.step !== 'c3_up2') return; G.step = 'c3_hall'; objective('Go back downstairs.');
    c3QueueHallChanges();
  });
}
function c3QueueHallChanges(){
  const hallPts = () => { const e = hallEnd(), out = [pt(X3(4), 1.4, e - 0.2)]; for (let z = 4.5; z < e; z += 2) out.push(pt(X3(4), 1.2, z)); return out; };
  c3Change('hall2', { when: () => G.flags.c3down, pts: hallPts, wait: 0.6, apply: () => { G.flags.c3len = 3; } });
  c3Change('bathOpen', { when: () => G.flags.c3down, pts: () => [D.c3bath.center], wait: 0.6, apply: () => setDoor(D.c3bath, true, { silent: true, speed: 9 }) });
  c3Change('plantMove', { when: () => G.flags.c3down && (G.flags.c3len || 0) >= 3, pts: () => [pt(X3(1.4), 0.6, 0.5), pt(X3(4.4), 0.6, 11.6)].concat(hallPts()), wait: 0.6, apply: () => {
    PROPS.c3plant.position.set(X3(4.45), 0, 11.6); Object.assign(PROPS.c3plantCol, { minX: X3(4.25), maxX: X3(4.65), minZ: 11.4, maxZ: 11.8 });
    c3Watch('plant', { pts: () => [pt(X3(4.45), 0.6, 11.6)], need: 0.5, fov: 20, dist: 10, onSeen: () => think('(The fern. In the middle of the hallway. You watered it in the living room.)', 4.5) });
    objective('Open the study at the end of the hallway (key from the parcel).'); G.step = 'c3_study'; c3HallGrows();
  } });
}
// ---------- the hallway grows every time you look back ----------
function c3HallGrows(){
  c3Change('grow', { repeat: true, until: () => (G.flags.c3len || 0) >= 7 || G.step !== 'c3_study',
    when: () => G.step === 'c3_study' && monViews().some(v => v.level === 0 && inHall(v.pos)),
    pts: () => { const e = hallEnd(); return [pt(X3(4), 1.4, e - 0.3), pt(X3(4), 1.2, e - 2.5), pt(X3(4), 1.2, e - 4.5)]; }, wait: 0.5,
    apply: () => { const n = (G.flags.c3len || 0) + 1; G.flags.c3len = n;
      if (n === 5){ G.flags.c3carpet = 2; G.flags.c3fold = 1; after(1, () => think('(Was the hallway this long? The carpet was red. You are sure it was red.)', 4.5)); }
      if (n === 7) after(0.6, () => think('(It keeps going. Don\'t look back. Just walk.)', 3.5)); } });
}
function c3FixCarpet(){
  G.flags.c3folded = 1; c3Broke(3); SND.rustle(PROPS.c3fold.position, 0.5);
  think('(You smooth it flat with your foot. Somewhere in the house, something sighs.)', 4);
  c3Change('carpetPunish', { pts: () => { const e = hallEnd(); return [pt(X3(4), 1.4, e - 0.3), pt(X3(4), 1.2, e - 3)]; }, wait: 0.5, apply: () => { G.flags.c3len = Math.min(C3MAXSEG, (G.flags.c3len || 0) + 4); localSnd(() => {}); SND.lowSwell(0.2, 3); } });
}
// ---------- the study ----------
function c3Letter(){
  showNote(`A letter on the desk, in Ruth's handwriting. It was never sent.

Mum,
The woman who hired me never came back. I waited three days. The house was so quiet as long as I kept looking at it.
I think it only stays still while someone is watching. The moment I looked away, it moved. A door. A room. A hallway that went on too long.
I tried to leave. I always come back in through the front door.
Last week I found the ad. HOUSE-SITTER WANTED. It was in my handwriting. I don't remember writing it.
Don't come looking for me. Don't let anyone

(the letter stops)`, 'owner', () => {
    if (G.flags.c3letter) return; G.flags.c3letter = 1;
    // while you read, the house took its chance
    G.flags.c3len = Math.min(C3MAXSEG, Math.max(12, (G.flags.c3len || 0) + 5)); G.flags.c3dark = 1; G.flags.c3follow = 1; G.flags.c3paint = 2;
    FX.c3hall.on = false; SND.thunk(pt(X3(6.9), 1.4, 8.6)); SND.pop(pt(X3(4), 2.8, hallEnd() - 3));
    G.step = 'c3_dark'; saveCheckpoint('c3dark');
    after(0.8, () => { think('(The power went out. When you look up from the letter, the hallway outside the study is black. And very, very long.)', 5.5); c3DarkObjective(); });
  });
}
function c3DarkObjective(){
  objective('The power is out. Fuse box: the closet near the front of the hall (flashlight: F).');
  c3Change('clock', { pts: () => [pt(X3(1.91), 2.1, 3.3)], wait: 1, apply: () => { G.flags.c3clock = 393;
    c3Watch('clock', { pts: () => [pt(X3(1.85), 2.1, 3.3)], need: 0.6, fov: 14, dist: 7, onSeen: () => think('(The clock says 3:33. It was ten past ten a minute ago.)', 4) }); } });
  // a figure at the end of the hall, only once you have turned your back on it
  c3Change('endFigure', { when: () => G.step === 'c3_dark' && monViews().some(v => v.level === 0 && inHall(v.pos) && v.pos.z < hallEnd() - 8 && v.pos.z > 12),
    pts: () => [pt(X3(4), 1.6, hallEnd() - 1.5)], wait: 1.0,
    apply: () => { entPlace(X3(4), 0, hallEnd() - 1.4, X3(4), 0); C3.entOccl = true;
      c3Watch('endFigure', { pts: () => [pt(X3(4), 2.2, hallEnd() - 1.4)], need: 0.5, fov: 14, dist: 40, onSeen: () => {
        SND.sting(0.22); SND.breath(pt(X3(4), 2.4, hallEnd() - 1.4), 0.6);
        after(0.9, () => c3Change('endFigureGone', { pts: () => [pt(X3(4), 2.2, hallEnd() - 1.4)], wait: 0.15, apply: () => entHide() }));
        after(2.4, () => think('(Something tall. In a raincoat. Standing at the end of the hall where you were a minute ago.)', 4.5)); } }); } });
}
function c3Fuse(){
  G.flags.c3dark = 0; FX.c3hall.on = true; SND.zap(PROPS.c3fuse.position); flickerGroup(f => f.group === 'c3', 1.2); G.step = 'c3_water';
  objective('Lights. Breathe.');
  after(4, () => { G.flags.c3tapOn = 1; objective('Water is running somewhere. Find it.'); c3TapSound(); });
}
function c3TapSound(){ if (!G.flags.c3tapOn) return; SND.water(pt(X3(2.4), 1.0, 9.6), 2.4); after(2.2, c3TapSound); }
function c3TapOff(){
  G.flags.c3tapOn = 0; SND.latch(pt(X3(2.4), 1.0, 9.6)); objective('Look in the mirror.'); G.step = 'c3_mirror';
  c3Watch('mirror', { pts: () => [pt(X3(2.4), 1.7, 9.95)], need: 1.1, fov: 16, dist: 3.5, onSeen: c3MirrorScare });
  after(18, () => { if (G.step === 'c3_mirror' && !G.flags.w_mirror){ c3Unwatch('mirror'); G.flags.w_mirror = 1; c3MirrorScare(); } });
}
function c3MirrorScare(){
  entPlace(X3(2.4), -0.78, 10.75, X3(2.4), 9); C3.entOccl = false; FX.c3mirrorCell.on = true;
  SND.sting(0.26); flickerGroup(f => f === FX.c3bath || f === FX.c3mirrorCell, 1.3); SND.breath(pt(X3(2.4), 1.8, 9), 0.6); player.shake = Math.max(player.shake, 0.6);
  after(0.6, () => think('(In the dark glass, right behind your shoulder: a hood. A head. The back of a head.)', 4.5));
  c3Change('mirrorGone', { pts: () => [pt(X3(2.4), 1.7, 9.95)], wait: 0.2, apply: () => { entHide(); FX.c3mirrorCell.on = false; after(2, c3Leave); } });
  after(12, () => { if (G.step === 'c3_mirror'){ entHide(); c3Leave(); } });
}
// ---------- 10-15 minutes: you think you can leave ----------
function c3Leave(){
  if (c3At3('c3_leave')) return;
  G.step = 'c3_leave'; c3t(14); c3Msg('UNKNOWN NUMBER', 'its ' + c3TimeStr(G.flags.c3t).toLowerCase() + '. you can still leave');
  objective('Leave. Get to your car (front door).'); D.c3front.locked = false; G.flags.c3doorLoop = 1;
  c3Change('coatGone', { pts: () => [pt(X3(2.2), 1.4, 1.0)], wait: 0.5, apply: () => { G.flags.c3coat = 0;
    c3Watch('coatGone', { pts: () => [pt(X3(2.2), 1.4, 1.0)], need: 0.4, fov: 20, dist: 7, onSeen: () => think('(The yellow raincoat is gone from its hook.)', 3.5) }); } });
}
function c3Looped(){
  G.flags.c3loopN = (G.flags.c3loopN || 0) + 1;
  if (G.flags.c3loopN === 1) after(9, c3NewDoor);
}
function c3NewDoor(){
  if (G.step !== 'c3_leave') return;
  G.step = 'c3_newdoor'; G.flags.c3len = Math.max(G.flags.c3len || 0, 8);
  objective('Find another way out.');
  c3Change('newDoor', { pts: () => [pt(X3(3), 1.2, C3.ndZ), pt(X3(4), 1.2, C3.ndZ)], wait: 0.8, apply: () => {
    G.flags.c3nd = 1; G.flags.c3ndSeen = 0;
    c3Watch('newDoor', { pts: () => [pt(X3(3.05), 1.2, C3.ndZ)], need: 0.3, fov: 30, dist: 14, onSeen: () => {
      G.flags.c3ndSeen = G.time; SND.creak(pt(X3(3), 1.2, C3.ndZ), 0.1, 1.2);
      objective('There is a door that wasn\'t there before.'); think('(A door. There was no door there. Rule four.)', 4);
      after(8.3, () => { if ((G.flags.c3nd || 0) === 1) objective('Open the door that wasn\'t there before.'); }); } });
  } });
}
function c3OpenNewDoor(){
  const f = G.flags;
  if (f.c3ndSeen && G.time - f.c3ndSeen < 8){   // too soon: bricks
    f.c3nd = 2; c3Broke(4); SND.latch(pt(X3(3), 1.1, C3.ndZ)); SND.sting(0.18);
    think('(Bricks. Wet, cold bricks. And the door is already closing.)', 3.5);
    after(1.5, () => c3Change('ndAway', { pts: () => [pt(X3(3), 1.2, C3.ndZ)], wait: 0.6, apply: () => { f.c3nd = 0; delete f.w_newDoor; delete f.a_newDoor; f.c3ndSeen = 0; after(6, () => { G.step = 'c3_leave'; c3NewDoor(); }); } }));
    return;
  }
  f.c3nd = 3; SND.latch(pt(X3(3), 1.1, C3.ndZ)); SND.creak(pt(X3(3), 1.1, C3.ndZ), 0.14, 1.6);
  objective('Go through.'); think('(Cold air. Rain. Wet earth. Trees, close, in the dark.)', 3.5);
}

// ---------- 15-20 minutes: the woods ----------
function c3ForestEnter(){
  if (G.step === 'c3_forest') return;
  G.step = 'c3_forest'; G.flags.c3doorLoop = 0; G.flags.c3follow = 0; saveCheckpoint('c3forest'); AMB.wind = 0.7; AMB.rain = 0.6; c3t(4);
  objective('Find a way out of the woods (follow the path).');
  after(1.5, () => think('(The woods. Behind the house? There is no house behind you. Just the door.)', 4.5));
  c3Change('fdoor', { pts: () => [pt(FWX, 1.1, FZ - 0.6)], wait: 1.0, when: () => G.time > 0, apply: () => { G.flags.c3fdoorGone = 1;
    c3Watch('fdoorGone', { pts: () => [pt(FWX, 1.1, FZ - 0.6)], need: 0.4, fov: 25, dist: 25, occl: false, onSeen: () => think('(The door is gone.)', 2.5) }); } });
  // a silhouette between the trees, only after you have looked away
  c3Change('glimpse', { when: () => monViews().some(v => inForest(v.pos) && v.pos.z > FZ + 8 && v.pos.z < FZ + 24), pts: () => [pt(FWX - 9, 1.6, FZ + 21)], wait: 1.2, apply: () => {
    entPlace(FWX - 9, 0, FZ + 21, FWX, FZ + 16); C3.entOccl = false;
    c3Watch('glimpse', { pts: () => [pt(FWX - 9, 2.2, FZ + 21)], need: 0.25, fov: 30, dist: 40, occl: false, onSeen: () => {
      SND.creak(pt(FWX - 9, 1, FZ + 21), 0.08, 0.6); after(2, () => think('(Between the trees. Tall. Still. Watching.)', 3.5));
      c3Change('glimpseGone', { pts: () => [pt(FWX - 9, 2.2, FZ + 21)], wait: 0.3, occl: false, apply: () => entHide() }); } }); } });
  // the sign: look at it for a while and the path splits
  c3Watch('sign', { pts: () => [pt(FWX + 1.3, 1.8, FZ + 32)], need: 1.4, fov: 16, dist: 9, onSeen: () => {
    c3Change('sign2', { pts: () => [pt(FWX + 1.3, 1.8, FZ + 32), pt(FWX - 6, 0.5, FZ + 37)], wait: 0.5, apply: () => { G.flags.c3sign2 = 1;
      c3Watch('sign2', { pts: () => [pt(FWX + 1, 1.5, FZ + 32)], need: 0.4, fov: 20, dist: 12, onSeen: () => think('(Two arms now. Both say ROAD. One points back into the trees.)', 4) }); } }); } });
}
function c3CabinSearch(){ if (G.step !== 'c3_forest') return; G.step = 'c3_cabin'; setObjectives([{ key: 'pol', text: 'Look at the photographs on the wall', done: !!G.flags.c3pol }, { key: 'doll', text: 'Look at the model on the table', done: !!G.flags.c3doll }, { key: 'tape', text: 'Play the answering machine' }]); think('(A cabin. The light is on. The door is open, like someone just left.)', 4); }
function c3Machine(){
  G.flags.c3machine = 1; SND.click(C3.machine.position); objective('Listen to the message.');
  dialog([['RUTH (TAPE)', "If you're hearing this, the house let you out the back. It does that when it's finished deciding.", 5.5],
    ['RUTH (TAPE)', "I don't know what it is. I only know it needs someone to keep looking at the house. As long as someone is watching, it stays a house.", 6.5],
    ['RUTH (TAPE)', 'I answered an ad too. In 2009. The woman never came back for me. I waited. I watched. And one day the ad was in my handwriting.', 6.5],
    [null, null, 1.5], ['RUTH (TAPE)', "I'm sorry. I needed someone to take my place.", 3.5], [null, null, 1.5],
    ['RUTH (TAPE)', 'Follow the red reflectors to the road. Never the signs. Keep looking back. It only moves when nobody is looking.', 6],
    ['RUTH (TAPE)', "And if you hear me calling your name out there... it isn't me.", 4]], () => { c3StartStalk(); });
}
function c3StartStalk(){
  if (G.flags.c3stalk) return;
  G.flags.c3stalk = 1; G.step = 'c3_stalk'; saveCheckpoint('c3stalk'); C3.entOccl = false;   // it walks through walls, so you can 'see' it through them too
  objective('Follow the red reflectors to the road. Keep looking back.');
  entPlace(FWX + 9, 0, FZ + 55, FWX + 9, FZ + 45);
  after(2.5, () => think('(Behind the cabin. Something tall, standing very still. It was not there a second ago.)', 4.5));
  c3Change('reflGone', { when: () => monViews().every(v => v.pos.x > FWX + 38), pts: () => C3REFL.slice(0, 4).map(([x, z]) => pt(FWX + x + 0.9, 0.8, FZ + z)), wait: 0.6, occl: false, apply: () => { G.flags.c3reflGone = 1; } });
  c3Change('markMoves', { when: () => monViews().some(v => v.pos.x > FWX + 30), pts: () => [pt(FWX + 3.4, 1.5, FZ + 12), pt(FWX + 45, 1.5, FZ + 50.6)], wait: 0.6, occl: false, apply: () => {
    C3.mark.position.set(FWX + 45, 0, FZ + 50.6); Object.assign(C3.markCol, { minX: FWX + 44.7, maxX: FWX + 45.3, minZ: FZ + 50.3, maxZ: FZ + 50.9 });
    c3Watch('markAgain', { pts: () => [pt(FWX + 45, 1.6, FZ + 50.6)], need: 0.5, fov: 20, dist: 14, occl: false, onSeen: () => think('(The tree with the red X. You passed it near the start. Didn\'t you?)', 4) }); } });
}
function c3EntAI(dt){
  const f = G.flags; if (f.c3stalk !== 1 || !C3ENT.visible || G.state === 'dead') return;
  const { v, d } = nearestPlayer(C3ENT.position.x, C3ENT.position.z); if (!v) return;
  if (C3.entSeen) return;                                             // it never moves while someone is looking
  const sp = (G.time < (f.c3rush || 0) ? 5.6 : 3.35) * dt;
  const dx = v.pos.x - C3ENT.position.x, dz = v.pos.z - C3ENT.position.z;
  if (d > 24){ const a = Math.atan2(dx, dz); C3ENT.position.set(v.pos.x - Math.sin(a) * 15, 0, v.pos.z - Math.cos(a) * 15); }
  else { C3ENT.position.x += dx / d * Math.min(sp, d); C3ENT.position.z += dz / d * Math.min(sp, d); }
  C3ENT.rotation.y = Math.atan2(v.pos.x - C3ENT.position.x, v.pos.z - C3ENT.position.z); MP.dirty = true;
  if (d < 1.05 && G.state !== 'dead') gameOver(v.local ? null : v.id);
}
function c3CallName(){ G.flags.c3call = (G.flags.c3call || 0) + 1; MP.dirty = true; }
function c3Answered(){
  if (G.flags.c3stalk !== 1) return;
  c3Broke(6); G.flags.c3rush = G.time + 5;
  const { v } = nearestPlayer(C3ENT.position.x, C3ENT.position.z); if (v){ const a = v.pos.x - C3ENT.position.x, b = v.pos.z - C3ENT.position.z, L = Math.hypot(a, b) || 1; if (L > 9){ C3ENT.position.x = v.pos.x - a / L * 9; C3ENT.position.z = v.pos.z - b / L * 9; } }
  SND.breath(C3ENT.position.clone().setY(2.3), 0.8); MP.dirty = true;
}
function c3Road(){
  G.flags.c3stalk = 2; G.step = 'c3_road'; c3t(9);
  const { v } = nearestPlayer(FWX + 72, FZ + 48);
  const back = v ? pt(v.pos.x - 1.7, 0, v.pos.z) : pt(FWX + 70, 0, FZ + 48);
  entPlace(back.x, 0, back.z, v ? v.pos.x : FWX + 72, v ? v.pos.z : FZ + 48); C3.entOccl = false;
  objective('The road. You made it.');
  after(1.6, () => think('(Asphalt. A road sign. No cars. Only the rain. And something breathing, right behind you.)', 4.5));
  c3Watch('roadEnt', { pts: () => [pt(C3ENT.position.x, 2.3, C3ENT.position.z)], need: 0.4, fov: 30, dist: 6, occl: false, onSeen: () => {
    SND.whisper(C3ENT.position.clone().setY(2.2), 1.8, 0.4); say('', '"...thank you... for watching..."', 3);
    after(2.5, () => c3Change('roadEntGone', { pts: () => [pt(C3ENT.position.x, 2.3, C3ENT.position.z)], wait: 0.2, occl: false, apply: () => entHide() }));
    after(4, () => { c3Msg('RUTH CALLOWAY', 'Thank you for watching the house.'); after(2.5, () => { c3Msg('RUTH CALLOWAY', "It's yours now."); G.flags.c3final = (G.flags.c3m || []).length; objective('Read your phone (Q)'); G.step = 'c3_home'; }); });
  } });
  after(9, () => { if (G.flags.w_roadEnt) return; c3Unwatch('roadEnt'); G.flags.w_roadEnt = 1; entHide(); c3Msg('RUTH CALLOWAY', 'Thank you for watching the house.'); after(2.5, () => { c3Msg('RUTH CALLOWAY', "It's yours now."); G.flags.c3final = (G.flags.c3m || []).length; objective('Read your phone (Q)'); G.step = 'c3_home'; }); });
}
// ---------- the end: back at the front door ----------
function c3Home(){
  G.step = 'c3_inside'; const f = G.flags;
  Object.assign(f, { c3len: 0, c3carpet: 0, c3paint: 4, c3clock: 41, c3t: 41, c3dark: 0, c3nd: 0, c3coat: 1, c3doorLoop: 0, c3follow: 0, c3stalk: 0, c3sign2: 0, c3thermo: 20 });
  entHide(); FX.c3porch.on = true; FX.c3carLights.on = false; FX.c3lamp.on = true; AMB.wind = 0.3; AMB.rain = 0.7;
  D.c3front.locked = false; setDoor(D.c3front, true, { silent: true }); D.c3study.locked = true; setDoor(D.c3study, false, { instant: true, silent: true, force: true }); D.c3bath.locked = false; setDoor(D.c3bath, false, { instant: true, silent: true });
  PROPS.c3plant.position.set(X3(1.4), 0, 0.5); Object.assign(PROPS.c3plantCol, { minX: X3(1.2), maxX: X3(1.6), minZ: 0.3, maxZ: 0.7 }); PROPS.c3package.visible = true; PROPS.c3package.position.set(X3(5.0), 0, -0.6);
  objective('Go inside.');
  after(1.2, () => think('(The porch. The rain. Your car in the drive. The front door is open, and the clock in the hall says 9:41.)', 5));
}
function c3Visitor(){
  if (G.step !== 'c3_inside') return;
  G.step = 'c3_knock2'; setDoor(D.c3front, false, { speed: 3 }); D.c3front.locked = false;
  FX.c3carLights.on = true; SND.thunk(pt(X3(7.5), 0.8, -14));
  objective('A car is coming up the drive.');
  after(2, () => think('(Headlights in the drive. A car door.)', 3));
  after(5, () => { for (let i = 0; i < 3; i++) after(i * 0.7, () => SND.knock(pt(X3(4), 1.4, -0.1), 1, false)); objective('Someone is at the door.'); G.step = 'c3_door'; });
}
function c3OpenForVisitor(){
  G.step = 'c3_final'; setDoor(D.c3front, true, { speed: 2.5 });
  VISITOR.root.visible = true; VISITOR.root.position.set(X3(4), 0, -1.0); VISITOR.root.rotation.set(0, 0, 0); MP.dirty = true;
  objective('Let them in.');
  dialog([['VISITOR', "Oh! Hi. Sorry, the road is... wow. I'm here about the house-sitting? I'm Sam.", 5],
    ['SAM', 'You must be the owner.', 3], [null, null, 2.5],
    ['YOU', 'Come in.', 2.2], ['YOU', 'There are only a few rules.', 3.5], [null, null, 1]], () => finalEnding3());
}
function _finalEnding3(){
  if (MP.guest === false || !MP.started) G.c3brokeN = null;
  G.state = 'ending'; player.flashOn = false; fade(1, 3); G.ignoreUnlock = true; if (document.exitPointerLock) document.exitPointerLock();
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  $('end1').textContent = '9:41 PM. IT IS RAINING ON BLACKWATER ROAD.';
  const broke = G.c3brokeN != null ? G.c3brokeN : [1, 2, 3, 4, 5, 6].filter(i => G.flags['c3broke' + i] || (G.c3rules || {})[i]).length;
  $('end2').textContent = broke ? 'YOU BROKE ' + ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][broke] + ' OF THE SIX RULES. YOU WILL WRITE THEM DOWN FOR SAM ANYWAY.' : 'YOU KEPT EVERY RULE. IT NEVER MATTERED. SOMEONE ALWAYS HAS TO WATCH THE HOUSE.';
  $('end3').innerHTML = "<span>DON'T</span><span>LOOK AWAY</span>"; $('bEndCh2').hidden = true; $('bEndCh3').hidden = true;
  setTimeout(() => { AMB.master = 0; $('hud').hidden = true; $('phone').hidden = true; $('ending').hidden = false; }, 3200);
  setTimeout(() => $('end1').classList.add('on'), 4700);
  setTimeout(() => $('end2').classList.add('on'), 8700);
  setTimeout(() => $('end3').classList.add('on'), 13500);
  setTimeout(() => $('end4').classList.add('on'), 16000);
}
function finalEnding3(){
  if (MP.bcast()){ G.c3brokeN = [1, 2, 3, 4, 5, 6].filter(i => G.flags['c3broke' + i] || (G.c3rules || {})[i]).length; MP.q({ t: 'end3', b: G.c3brokeN }); MP.flush(); MP.mute = true; try { _finalEnding3(); } finally { MP.mute = false; } return; }
  _finalEnding3();
}

// ---------- every frame (host; once per player's point of view) ----------
function storyUpdateF(dt){
  const f = G.flags; if (!f.ch3) return;
  if (!VIEW_ID){ c3Tick(dt); c3EntAI(dt); }
  c3Mark();
  const p = player.pos;
  if (G.step === 'c3_enter' && inC3House(p)){ G.step = 'c3_lock'; objective('Lock the front door behind you.'); think('Warm in here. Wet wool, old wood, and something sweet underneath.', 4.5); }
  if (G.step === 'c3_tasks' && !f.t_kitchen && p.x > X3(6.1) && p.z < 6 && inC3House(p)){ c3TaskDone('kitchen', 2);
    c3Change('chair', { pts: () => [pt(X3(8.0), 0.6, 2.55)], wait: 1.5, apply: () => { PROPS.c3chair.g.position.set(X3(7.7), 0, 2.3); PROPS.c3chair.g.rotation.y = 0.7; PROPS.c3chair.c.minX = X3(7.5); PROPS.c3chair.c.maxX = X3(7.9); PROPS.c3chair.c.minZ = 2.1; PROPS.c3chair.c.maxZ = 2.5; } }); }
  if (G.step === 'c3_up' && player.level === 1){ G.step = 'c3_up2'; f.c3ward = 1; MP.dirty = true; objective('Look around Ruth\'s bedroom.'); after(0.8, () => think('(The wardrobe is open. The window is open. The rain is coming in.)', 4)); }
  if (G.step === 'c3_hall' && !f.c3down && !VIEW_ID && everyone((q, l) => l === 0)){ f.c3down = 1; MP.dirty = true; }
  if ((G.step === 'c3_newdoor' || G.step === 'c3_leave') && f.c3nd === 3 && inForest(p)){ c3ForestEnter(); }
  if (G.step === 'c3_forest' && inHouseRect(p.x, p.z) === 'c3cabin') c3CabinSearch();
  if (G.step === 'c3_stalk'){
    if (!VIEW_ID){ const xs = monViews().map(v => v.pos.x); const mx = Math.max(...xs);
      if (mx > FWX + 31 && (f.c3call || 0) < 1) c3CallName(); if (mx > FWX + 52 && (f.c3call || 0) < 2) c3CallName(); }
    if (p.x > FWX + 71) c3Road();
  }
  if (G.step === 'c3_home' && !VIEW_ID && monViews().some(v => v.pos.x < X3(14) && v.pos.x > X3(-6) && v.pos.z < 0 && v.pos.z > -6)) c3Home();
  if (G.step === 'c3_inside' && inC3House(p) && p.z > 1.2) c3Visitor();
}

// ---------- hook it in ----------
function ch3Init(){
  buildC3House(); buildForest();
  C3ENT = buildSitter(); PROPS.c3ent = C3ENT;
  VISITOR = buildHuman({ shirt: 0x2f4a6a, pants: 0x22252b, skin: 0xd2b49a, hair: 0x5a3a22, eyes: true }); scene.add(VISITOR.root); VISITOR.root.visible = false; dyn(VISITOR.root); PROPS.c3visitor = VISITOR.root;
  const sd = C3.studyDoor; C3.sdBase = { pz: sd.pivot.position.z, c0: sd.collider.minZ, c1: sd.collider.maxZ, cz: sd.center.z, lz: FX.c3study.pos.z };
  PROPS.c3cols = [PROPS.c3plantCol, PROPS.c3chair.c, C3.markCol]; PROPS.c3moved = [PROPS.c3plant, PROPS.c3chair.g, PROPS.c3package, PROPS.c3wardDoor, C3.mark, C3.ndPivot];
  // interactions
  addInter(PROPS.c3mailbox, 'Open the mailbox', () => { addItem('House keys'); SND.latch(PROPS.c3mailbox.position); think('Keys on a ring. A tag in neat handwriting: THANK YOU. - R.', 3.5); G.step = 'c3_enter'; objective('Go inside (front door).'); FX.c3porch.on = true; }, () => G.step === 'c3_mail');
  const fd = D.c3front;
  const rule1 = () => (G.flags.c3t || 0) >= 60 && ['c3_msg1', 'c3_msg1b', 'c3_knock', 'c3_ring'].includes(G.step);
  fd.textFn = () => { if (G.step === 'c3_lock' && !fd.open) return 'Lock the front door';
    if (rule1()){ if (fd.open) return 'Close the front door'; if (!fd.locked) return 'Lock the front door'; return 'Open the front door'; } if (fd.locked) return hasItem('House keys') && ['c3_enter', 'c3_tasks', 'c3_leave', 'c3_newdoor'].includes(G.step) ? 'Unlock the front door' : 'Locked'; if (G.step === 'c3_door') return 'Open the door'; return fd.open ? 'Close door' : 'Open door'; };
  fd.useFn = () => {
    if (G.step === 'c3_door') return c3OpenForVisitor();
    if (G.step === 'c3_lock' && !fd.open){ fd.locked = true; SND.lockClick(fd.center); c3t(1); G.step = 'c3_note'; objective('Read the house-sitting instructions (hall table).'); return; }
    if (fd.locked && hasItem('House keys') && ['c3_enter', 'c3_tasks', 'c3_leave', 'c3_newdoor'].includes(G.step)){ fd.locked = false; SND.lockClick(fd.center); after(0.3, () => setDoor(fd, true)); return; }
    if (rule1() && fd.open){ setDoor(fd, false); return; }
    if (rule1() && !fd.locked){ fd.locked = true; SND.lockClick(fd.center); think('Locked.', 1.5); return; }
    if (rule1() && !G.flags.c3broke1){   // rule one, broken
      fd.locked = false; SND.lockClick(fd.center);
      c3Broke(1); setDoor(fd, true); after(1.2, () => think('(Nobody. Just the rain, coming in sideways.)', 3));
      c3Change('steps', { pts: () => [pt(X3(4), 0.2, 2), pt(X3(4), 0.2, 4.5)], wait: 0.8, apply: () => { G.flags.c3steps = 1; G.flags.c3follow = 1;
        c3Watch('steps', { pts: () => [pt(X3(4), 0.05, 3)], need: 0.6, fov: 30, dist: 8, onSeen: () => think('(Wet footprints. From the front door, into the hallway. Bare feet. Long ones.)', 4.5) }); } });
      return;
    }
    toggleDoor(fd);
  };
  addInter(PROPS.c3note, () => c3At3('c3_home') ? 'Read the note' : 'Read the instructions', () => c3At3('c3_home') ? showNote(c3Rules().replace('- Ruth', '- ' + ((MP.me().name || '').trim() || 'me')), 'owner') : showNote(c3Rules(), 'owner', () => {
    if (G.step !== 'c3_note') return; G.step = 'c3_tasks'; G.flags.c3noteRead = 1; c3t(3); c3TaskObjectives();
    // the first change: subtle. The carpet's diamonds are circles now.
    c3Change('carpet1', { pts: () => [pt(X3(4), 0.05, 5), pt(X3(4), 0.05, 7), pt(X3(4), 0.05, 9)], wait: 2, apply: () => { G.flags.c3carpet = 1; } });
  }), () => G.flags.ch3 && c3At3('c3_note'));
  addInter(PROPS.c3thermo, () => G.flags.c3thermo === 4 ? 'The thermostat: 4\u00b0' : 'Turn the heating up', () => { if (G.step !== 'c3_tasks' || G.flags.t_thermo){ think(G.flags.c3thermo === 4 ? '(It won\'t go up. It just blinks: 4.)' : 'Twenty degrees. The radiators tick.', 2.5); return; } G.flags.c3thermo = 20; SND.click(PROPS.c3thermo.position); c3TaskDone('thermo', 2); think('Twenty degrees. Somewhere, the radiators start to tick.', 3); }, () => G.flags.ch3);
  addInter(PROPS.c3plant, 'Water the fern', () => { SND.water(PROPS.c3plant.position.clone().setY(0.5), 1.4); c3TaskDone('plant', 2); think('The soil drinks it all at once, like it has been waiting.', 3);
    c3Change('paint1', { pts: () => [pt(X3(-1), 1.95, 0.12)], wait: 1.5, apply: () => { G.flags.c3paint = 1; c3Watch('paint1', { pts: () => [pt(X3(-1), 1.95, 0.12)], need: 0.9, fov: 14, dist: 6, onSeen: () => think('(The painting of the house. There is someone between the trees in it. Was there?)', 4.5) }); } });
  }, () => G.step === 'c3_tasks' && !G.flags.t_plant);
  addInter(PROPS.c3switch, () => FX.c3lamp.on ? 'Turn off the lamp' : 'Turn on the lamp', () => {
    SND.click(PROPS.c3switch.position); FX.c3lamp.on = !FX.c3lamp.on; G.flags.c3lamp = FX.c3lamp.on ? 1 : 0;
    if (G.step === 'c3_tasks' && !G.flags.t_lamp && FX.c3lamp.on){ c3TaskDone('lamp', 2);
      c3Change('lampoff', { pts: () => [pt(X3(-3.5), 1.5, 0.5), pt(X3(-3.5), 0.6, 0.5)], wait: 2.5, apply: () => { FX.c3lamp.on = false; G.flags.c3lamp = 0;
        c3Watch('lampoff', { pts: () => [pt(X3(-3.5), 1.4, 0.5)], need: 0.5, fov: 24, dist: 9, onSeen: () => think('(The lamp is off. You turned it on. You are sure you turned it on.)', 4) }); } }); }
  }, () => G.flags.ch3);
  addInter(PROPS.c3package, 'Pick up the parcel', () => {
    PROPS.c3package.visible = false; addItem('Study key'); SND.rustle(PROPS.c3package.position, 0.5); c3TaskDone('parcel', 3);
    showNote(`The parcel is light. Inside: a brass key on a ribbon (STUDY), and a Polaroid.

The Polaroid shows this house at night, taken from the trees. Your car is in the drive. Someone is standing at the front door with their back to the camera.

Under the picture, in pen: tonight's date.`, 'inspect');
  }, () => G.step === 'c3_tasks' && PROPS.c3package.visible);
  addInter(PROPS.c3fridge, 'Open the fridge', () => { SND.latch(PROPS.c3fridge.position); showNote('Milk. Eggs. Cheese. A note on the shelf:\n\nHelp yourself to anything.\nNot the bottom shelf.\n   - R.\n\nThe bottom shelf is empty. It is very clean. It smells of bleach.', 'inspect'); if (G.step === 'c3_tasks') c3TaskDone('kitchen', 1); }, () => G.flags.ch3 && !c3At3('c3_forest'));
  addInter(PROPS.c3phone, () => G.flags.c3ringing ? 'Answer the phone (UNKNOWN)' : 'A telephone', () => { if (G.flags.c3ringing) return c3AnswerPhone(); think('A dial tone. Then, far away, rain. On the line.', 2.5); }, () => G.flags.ch3);
  addInter(PROPS.c3box, 'Look in the box', c3UpstairsBox, () => G.flags.ch3 && G.flags.c3ward && (G.step === 'c3_up2' || c3At3('c3_hall')));
  addInter(PROPS.c3fold, 'Straighten the carpet', c3FixCarpet, () => G.flags.c3fold && !G.flags.c3folded);
  const sdr = C3.studyDoor;
  sdr.textFn = () => sdr.locked ? (hasItem('Study key') ? 'Unlock the study' : 'Locked') : (sdr.open ? 'Close door' : 'Open door');
  sdr.useFn = () => { if (sdr.locked){ if (!hasItem('Study key')){ SND.latch(sdr.center); think('Locked. A brass keyhole.', 2); return; } sdr.locked = false; SND.lockClick(sdr.center); after(0.3, () => setDoor(sdr, true));
      if (G.step === 'c3_study'){ G.step = 'c3_letter'; objective('Look around the study.'); } return; } toggleDoor(sdr); };
  addInter(C3.letter, 'Read the letter', c3Letter, () => G.flags.ch3 && !c3At3('c3_forest'));
  addInter(C3.radio, 'Turn on the radio', () => { SND.radio(C3.radio.position.clone(), 3.5, 0.3); say('RADIO', '"...police are again asking for information about a young woman last seen house-sitting on Blackwater Road in 2009. Ruth Call\u2014"', 6); }, () => G.flags.ch3);
  addInter(PROPS.c3fuse, () => G.flags.c3dark ? 'Reset the fuses' : 'The fuse box', () => { if (G.flags.c3dark && G.step === 'c3_dark') return c3Fuse(); think('All switches up.', 1.5); }, () => G.flags.ch3);
  addInter(PROPS.c3tap, () => G.flags.c3tapOn ? 'Turn off the tap' : 'The sink', () => { if (G.flags.c3tapOn) return c3TapOff(); think('Cold water. It smells of earth.', 2); }, () => G.flags.ch3);
  addInter(C3.ndHit, () => (G.flags.c3nd || 0) === 1 ? 'Open the door' : 'The door', () => { if ((G.flags.c3nd || 0) === 1) c3OpenNewDoor(); }, () => (G.flags.c3nd || 0) === 1);
  addInter(C3.signHit, 'Read the sign', () => think(G.flags.c3sign2 ? 'ROAD, says one arm. ROAD, says the other. The letters are fresh.' : 'ROAD, and an arrow. The paint is fresh. Everything else here is old.', 3.5), () => G.flags.ch3);
  addInter(C3.polHit, 'Look at the Polaroids', () => showNote(`Polaroids. Dozens of them, pinned edge to edge.

All of the same house, taken from the same spot in the trees. In every one, somebody stands at the front door with their back to the camera.

Years on the bottom: 1971. 1983. 1990. 1998. 2009. 2016. 2021.

The last one is still a little tacky to the touch. TONIGHT, it says. The person at the door is wearing your jacket.`, 'inspect', () => { G.flags.c3pol = 1; markObj('pol'); }), () => G.flags.ch3);
  addInter(C3.dollhouse, 'Look at the model', () => showNote('A model of the house, carefully made. Through its tiny front door you can see a little hallway.\n\nThe hallway is far too long for the house. It goes back and back.\n\nIn it stands a small figure in a yellow raincoat, facing the wrong way.', 'inspect', () => { G.flags.c3doll = 1; markObj('doll'); }), () => G.flags.ch3);
  addInter(C3.machine, () => G.flags.c3machine ? 'The answering machine' : 'Play the message', () => { if (G.flags.c3machine || S.busy) return; c3Machine(); }, () => G.flags.ch3 && (G.step === 'c3_cabin' || G.step === 'c3_forest') && !S.busy);
  E_ANSWER = addInter(hitbox(0.1, 0.1, 0.1, 400, -60, 400), '', c3Answered, () => G.flags.c3stalk === 1);
  E_LOOP = addInter(hitbox(0.1, 0.1, 0.1, 401, -60, 400), '', () => { if (G.flags.c3doorLoop) c3Looped(); else if (G.flags.c3stairLoop && !G.flags.c3broke2){ c3Broke(2);
    after(1.2, () => { SND.creak(pt(X3(4), 2.9, 3), 0.15, 1.4); });
    c3Change('broke2', { pts: () => [pt(X3(4), 1.2, 6), pt(X3(4), 1.4, hallEnd() - 0.3)], wait: 0.5, apply: () => { G.flags.c3len = Math.max(G.flags.c3len || 0, 2); } }); } }, () => G.flags.ch3);
  // the phone: Q (or Tab) to hold it up
  addEventListener('keydown', e => {
    if (!G.flags.ch3) return;
    if (e.code === 'KeyQ' || e.code === 'Tab'){ e.preventDefault(); if (G.state === 'phone') closePhone(); else openPhone(); return; }
    if (G.state === 'phone' && (e.code === 'Escape' || e.code === 'KeyE')){ e.preventDefault(); e.stopImmediatePropagation(); closePhone(); return; }
    if (e.code === 'KeyE' && G.state === 'playing' && G.c3answerUntil > G.time && !hover){ e.stopImmediatePropagation(); G.c3answerUntil = 0; useInter(E_ANSWER); localSnd(() => think('(You called back. The woods went quiet. Then something moved, close.)', 3.5)); }
  }, true);
  $('phone').addEventListener('click', () => closePhone());
  // co-op: say whether you are "looking away" (note, phone, cutscene), and the third ending
  const ms = MP.myState; MP.myState = function(){ const s = ms.call(this); s.bl = BLIND_STATES.includes(G.state) ? 1 : 0; return s; };
  const os = MP.onState; MP.onState = function(id, s){ os.call(this, id, s); const r = this.remotes[id]; if (r) r.bl = s.bl || 0; };
  const af = MP.applyFx; MP.applyFx = function(e){ if (e.t === 'end3'){ G.c3brokeN = e.b; _finalEnding3(); return; } return af.call(this, e); };
  // the name in the woods (each player hears their own)
  const ui = updateInteract; window.updateInteract = () => { ui();
    const f = G.flags; if (!f.ch3) return;
    if ((f.c3call || 0) > (G.c3callSeen || 0)){ G.c3callSeen = f.c3call; const nm = (MP.me().name || '').trim();
      const a = player.yaw + Math.PI / 2 + (f.c3call % 2 ? 0.4 : -0.6), at = pt(player.pos.x + Math.sin(a) * 18, 1.5, player.pos.z + Math.cos(a) * 18);
      localSnd(() => { SND.voice(at, 1.6, 0.28, 210); setTimeout(() => SND.voice(at, 1.0, 0.24, 215), 1900); });
      localSnd(() => subtitle('"' + escHtml(nm ? nm + '!' : 'Hey! You!') + ' Over here! Please, I\'m hurt!"', 4, '', 'A VOICE IN THE WOODS')); G.c3answerUntil = G.time + 5; }
    if (G.c3answerUntil > G.time && !hover && G.state === 'playing'){ const pr = $('prompt'); pr.innerHTML = '<kbd>E</kbd>Answer'; pr.classList.add('on'); } };
  // the woods: thicker fog, mud underfoot
  const sa = surfaceAt; window.surfaceAt = (x, z, l) => { if (x > FWX - 30){ const r = inHouseRect(x, z); return r === 'c3cabin' ? 'wood' : x > FWX + 71 ? 'concrete' : 'grass'; } const r = inHouseRect(x, z); if (r === 'c3house' || r === 'c3hall' || r === 'c3cabin') return (x > X3(6) && x < X3(11) && z < 6) || (x > X3(0) && x < X3(3) && z > 6 && z < 10) ? 'tile' : 'wood'; if (x > X3(-20) && x < X3(25)) return Math.abs(x - X3(4)) < 0.7 && z < -1 ? 'concrete' : 'grass'; return sa(x, z, l); };
  const eu = envUpdate; window.envUpdate = dt => { eu(dt); if (!G.flags.ch3) return; const c = camera.position, inside = !!inHouseRect(c.x, c.z);
    if (c.x > FWX - 30){ scene.fog.color.setHex(0x06080a); scene.fog.density = inside ? 0.03 : c.x > FWX + 62 ? 0.045 : 0.075; moon.intensity = inside ? 0.02 : 0.1; hemi.intensity = inside ? 0.04 : 0.07; }
    else if (c.x > X3(-25) && c.x < X3(30)){ scene.fog.density = inside ? 0.022 : 0.05; } };
  // every computer, every frame
  const uf = updateFireFx; window.updateFireFx = dt => { uf(dt); ch3Local(dt); };
  const r2r = ch2Reset; window.ch2Reset = () => { r2r(); ch3Reset(); };
  // menus, checkpoints, ending of chapter 2 -> chapter 3
  Object.assign(C2_LOADERS, { c3: startCh3, c3mid: loadC3Mid, c3dark: loadC3Dark, c3forest: loadC3Forest, c3stalk: loadC3Stalk });
  Object.assign(C2_LABELS, { c3: 'chapter 3', c3mid: 'chapter 3: ten o\'clock', c3dark: 'chapter 3: the dark hallway', c3forest: 'chapter 3: the woods', c3stalk: 'chapter 3: the reflectors' });
  $('bCh3').onclick = () => { audioInit(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} loadCheckpoint('c3'); };
  $('mpGoCh3').onclick = () => { if (MP.members.length >= 2){ try { localStorage.removeItem(SAVE_KEY); } catch (e) {} MP.hostStart('c3'); requestLock(); } };
  $('bEndCh3').onclick = () => { $('ending').hidden = true; ['end1', 'end2', 'end3', 'end4'].forEach(id => $(id).classList.remove('on')); if (MP.host && MP.started) MP.hostStart('c3'); else loadCheckpoint('c3'); };
  const fe2 = _finalEnding2; window._finalEnding2 = () => { fe2(); $('bEndCh3').hidden = MP.guest; };
  const fe1 = finalEnding; window.finalEnding = () => { $('bEndCh3').hidden = true; return fe1(); };
  const go = gameOver; window.gameOver = who => { const was = G.state; go(who);
    if (!G.flags.ch3 || G.state !== 'dead' || was === 'dead') return;
    MON.m.root.visible = false; $('phone').hidden = true;
    const f = new V3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
    C3ENT.position.set(camera.position.x + f.x * 0.75, player.feetY, camera.position.z + f.z * 0.75); C3ENT.rotation.y = Math.atan2(-f.x, -f.z); C3ENT.visible = true; player.pitch = 0.55; };
}
const C3_ORDER = ['c3_drive', 'c3_mail', 'c3_enter', 'c3_lock', 'c3_note', 'c3_tasks', 'c3_msg1', 'c3_msg1b', 'c3_knock', 'c3_ring', 'c3_steps', 'c3_up', 'c3_up2', 'c3_hall', 'c3_study', 'c3_letter', 'c3_dark', 'c3_water', 'c3_mirror', 'c3_leave', 'c3_newdoor', 'c3_forest', 'c3_cabin', 'c3_stalk', 'c3_road', 'c3_home', 'c3_inside', 'c3_knock2', 'c3_door', 'c3_final'];
function c3At3(step){ return C3_ORDER.indexOf(G.step) >= C3_ORDER.indexOf(step); }
