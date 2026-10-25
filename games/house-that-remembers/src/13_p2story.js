// =====================================================================
//  PART II — ST. BRIGID'S: story, puzzles, spread-out scares, chases, endings
//  Chapters are numbered 11–16 so they never collide with Part I (1–7).
// =====================================================================
Object.assign(CHAPTERS, { 11: 'The Grounds', 12: 'Reception', 13: 'Ward B', 14: 'Room 14', 15: 'The Morgue', 16: 'Visiting Hours' });
function chapLabel(n) { return n > 10 ? `Part II · Chapter ${ROMAN[n - 10]}` : `Chapter ${ROMAN[n]}`; }

Object.assign(ITEMS, {
  shedKey: { name: 'Shed key', desc: 'A small key on a loop of string, from the hook in the security booth. A cardboard tag: "GROUNDS".' },
  boltCutters: { name: 'Bolt cutters', desc: 'Long, red-handled, heavy. They smell of oil and wet grass.' },
  lighter: { name: 'Lighter', desc: 'A cheap red lighter from the guard\'s desk. It still works, just.' },
  keycard: { name: 'Ward B card', desc: 'A staff access card, clipped inside Margaret\'s file. A note in biro: "For when they come for her."' },
  fuseA: { name: 'Fuse', desc: 'A ceramic cartridge fuse, 30 A. From room 11.' },
  fuseB: { name: 'Fuse', desc: 'A ceramic cartridge fuse, 30 A. From room 16.' },
  fuseC: { name: 'Fuse', desc: 'A ceramic cartridge fuse, 30 A. From under the sink in room 19.' },
  basementKey: { name: 'Stairwell key', desc: 'Heavy, cold, stamped MORTUARY. It was behind the photographs on Margaret\'s wall.' },
  album: { name: 'The last photograph', desc: 'The dinner table, 14 October 1987. Grandad, Grandma, Tom, Elena. Everyone is laughing at something outside the frame. On the back, in Margaret\'s hand: "Don\'t let me forget."', img: () => Story.diningPortrait(3) },
});
Object.assign(MEMS, {
  mem7: { title: 'The drawing on the noticeboard', text: 'Pinned among the rotas: the family in crayon, labelled ELENA. Margaret brought it with her in 1994 and asked the nurses to put it where she could see it from the lobby.' },
  mem8: { title: 'The ribbon on room 14', text: 'A yellow ribbon, knotted around the handle. Margaret tied it there, the way Elena used to tie them on things she didn\'t want the house to take.' },
  mem9: { title: 'The postcard', text: 'A postcard of the seaside, never sent. "Dear Elena — the nurses are kind. I am trying very hard to remember your voice. Mum."' },
  mem10: { title: 'The wedding ring', text: 'Margaret\'s wedding ring, in an envelope marked PERSONAL EFFECTS. Engraved inside: "A. & M. — our first summer".' },
});
const TXT2 = {
  letter: () => [`ST. BRIGID'S HOSPITAL (CLOSED)\nEstates Office\n\nDear ${NM()},\n\nDuring the clearance of St. Brigid's we found a box of personal effects belonging to a former long-stay patient, Mrs Margaret Hale, who died here in 2009. Your name and this address were written inside the lid.\n\nThe building is due for demolition on the 15th. If you wish to collect the effects, the site key is with the security booth by the gate.`,
    `We would ask you to come in daylight.\n\nThe night staff we hired for the clearance have not come back after the first week. They say the patient bell in Ward B still rings, though the wiring was cut years ago, and that a woman's voice asks for her daughter.\n\nWe are sure there is a simple explanation.\n\nYours faithfully,\nEstates Office`],
  logbook: () => [`SECURITY LOG — NIGHTS\n\n02:10  Lights on in Ward B again. Power's been off since '94. Went to check. Nothing.\n02:40  Phone at reception rang. Nobody there. Didn't answer it this time.\n03:15  Woman humming in 14. There is no woman in 14.`,
    `Spare key for the grounds shed is on the hook. Bolt cutters are in the shed if you need to get the front doors open — they chained them after the second night.\n\nDon't look at the monitors too long. Camera 4 shows the booth. Sometimes it shows the booth with someone in it.`],
  visitorLog: () => [`VISITORS' BOOK — WARD B\n\n14/10/1995  M. Hale (patient)  — visiting: E. Hale, Room 14\n14/10/1996  M. Hale (patient)  — visiting: E. Hale, Room 14\n14/10/1997  M. Hale (patient)  — visiting: E. Hale, Room 14\n...\n\nEvery year. The same day. The same hand, getting older.`,
    `On the inside cover, in a nurse's writing:\n\n"Records door code is the day the little one was lost, then the month. Day first. (Mrs Hale tells everyone the date, so we may as well use it.)"`],
  staffMemo: () => [`MEMO — ALL WARD B STAFF\n\nStaff are reminded NOT to answer the patient in Room 14 when she calls from the corridor at night.\n\nMrs Hale is in her room. The door is locked from the outside. Whatever is in the corridor is not Mrs Hale, and it is not her daughter, however much it sounds like either.`],
  file: () => [`PATIENT FILE — HALE, Margaret\nAdmitted: 3rd March 1994. Long stay.\n\nPresenting: insists her daughter (missing since 1987) visits her at night. Patient is calm, lucid, and asks staff to set a second chair at her table.\n\nPatient brought one photograph with her and will not be parted from it.`,
    `1998: Night staff report a child in a yellow dress on Ward B. Patient: "She's learning. Don't let her see the photograph."\n\n2006: Patient asks for the photograph to be taken away and locked in the mortuary "where it's cold and nothing remembers." Request granted.\n\n2009: Patient deceased. Effects to Mortuary, drawer 7.\n\n(A Ward B access card is clipped to the last page.)`],
  mDiary: () => [`Margaret's diary — the last one\n\nIt comes to the door at nine. It has her dress, her hair, her voice. It has learned all of it from me, from my looking at that photograph every day.`,
    `But it cannot do everything. It always looks straight at the camera — Elena never did; she was always looking at whoever made her laugh.\n\nAnd it smiles with all its teeth. My girl had a gap where her front tooth came out the week before.`,
    `I've hung four photographs on the wall. Two are hers. Two are the things it made, that turned up in my drawer one morning.\n\nTake the wrong ones down and you'll find what I hid behind them. I couldn't bring myself to touch them again.`],
  nurseNotes: () => [`NIGHT NOTES — NURSES' STATION\n\nFuse box keeps tripping. Spare fuses: one in the bedside cabinet in 11, one in the cupboard in 16, one under the sink in 19. Don't ask me why we keep them in the rooms.\n\nRoom numbers on the doors change at night. Use the ribbon on 14. Mrs Hale's ribbon is the only thing on this ward that stays where it is.`],
  toeTags: () => [`MORTUARY REGISTER (clearance)\n\n1 — empty\n2 — empty\n3 — HALE, M. (envelope, personal)\n4 — empty\n5 — unclaimed effects\n6 — empty\n7 — HALE, M. (photograph — DO NOT REMOVE)\n8, 9 — empty\n10 — DO NOT OPEN. We don't know what's in 10.\n11, 12 — empty`],
};
// the four photographs on Margaret's wall: 0 and 2 are Elena, 1 and 3 are the copies
Story.p2Photo = function (i) {
  const k = 'p2ph' + i; if (this.cache[k]) return this.cache[k];
  const fake = i === 1 || i === 3;
  return (this.cache[k] = drawPhoto({ w: 220, h: 260, bg: i % 2 ? 'room' : 'garden', tree: .7, scale: .8, people: [{ x: fake ? .5 : .42, kind: 'girl', smile: true, pale: fake, s: 1.1 }], aged: .8 }));
};
const P2PH = [
  'Elena on the swing, laughing at someone just out of the picture. There is a gap where a front tooth is missing.',
  'Elena in the dayroom, looking straight into the camera. A wide smile. Every tooth perfect.',
  'Elena at the kitchen table, looking sideways at Tom, mid-giggle. The gap in her teeth shows.',
  'Elena on the porch, staring straight down the lens. She is smiling with all of her teeth. Her hands are hidden behind her back.',
];
// ---------------- interaction definitions ----------------
Object.assign(Story.defs, {
  p2road: { prompt: () => 'Back to the car', use: () => UI.say('You came all this way for her. For both of them.', 3.5) },
  p2ambulance: { prompt: () => 'Look in the ambulance', use: () => insp('The ambulance', 'Back doors hanging open. Inside: a stretcher with the restraints still buckled. Someone has scratched "14" into the paint, over and over.') },
  p2chain: { prompt: () => Story.has('boltCutters') ? 'Cut the chain' : 'Examine the chain', use: () => Story.p2CutChain() },
  p2logbook: readDef('p2log', 'The security log', TXT2.logbook, 'Read the log', { after: () => { if (!Story.has('shedKey') && !SF().gotShedKey) UI.objective('Take the shed key from the hook.'); } }),
  p2shedKey: { prompt: () => 'Take the shed key', use: () => { SF().gotShedKey = true; W.obj.shedKey.visible = false; Story.give('shedKey'); UI.objective('Find the bolt cutters in the groundskeeper\'s shed.'); } },
  p2lighter: { prompt: () => 'Take the lighter', use: () => { SF().gotLighter = true; W.obj.lighter.visible = false; Story.give('lighter'); } },
  p2monitor: { prompt: () => 'Look at the monitor', use: () => UI.say(SF().camScare ? 'Camera 4. The booth. Just you, now.' : 'CAMERA 4 — BOOTH. Grainy grey snow, and the shape of the desk.', 3.5) },
  p2boltCutters: { prompt: () => 'Take the bolt cutters', use: () => Story.p2TakeCutters() },
  p2phone: { prompt: () => W.p2ring ? 'Answer the phone' : 'Pick up the phone', use: () => Story.p2Phone() },
  p2visitorLog: readDef('p2visitors', 'The visitors\' book', TXT2.visitorLog, 'Read the visitors\' book', { after: () => { if (!SF().recordsOpen) UI.objective('Open the records room. The code is in the visitors\' book.'); } }),
  p2calendar: { prompt: () => 'Look at the calendar', use: () => insp('The calendar', 'OCTOBER. The 14th is circled in red — so hard the pen went through.\n\nSomeone has torn off every other month.') },
  mem7: memDef('mem7', 'Look at the noticeboard'),
  p2wheelchair: { prompt: () => 'Examine the wheelchair', use: () => UI.say(SF().chairRolled ? 'It came all the way across the room. The wheels are still turning.' : 'An old wheelchair. One wheel squeaks when you touch it.', 3.5) },
  p2keypad: { prompt: () => SF().recordsOpen ? null : 'Use the keypad', use: () => Story.p2Keypad() },
  p2files: readDef('p2file', 'Patient file — Hale, Margaret', TXT2.file, 'Read Margaret\'s file', { after: () => { if (!SF().gotCard) { SF().gotCard = true; Story.give('keycard'); UI.objective('Go into Ward B.'); } } }),
  p2staffMemo: readDef('p2memo', 'A staff memo', TXT2.staffMemo, 'Read the memo'),
  p2fuse1: { prompt: () => SF().fuseA ? null : 'Open the bedside cabinet', use: () => Story.p2Fuse('fuseA', 'A ceramic fuse, rolling loose in the cabinet.') },
  p2fuse2: { prompt: () => SF().fuseB ? null : 'Open the cupboard', use: () => Story.p2Fuse('fuseB', 'Bandages, a bedpan… and a fuse, wrapped in a nurse\'s note: "SPARE".') },
  p2fuse3: { prompt: () => SF().fuseC ? 'Look under the sink' : 'Look under the sink', use: () => SF().fuseC ? UI.say('Pipes, and a smell of old water.', 3) : Story.p2Fuse('fuseC', 'Taped under the sink: a fuse. The tape is new.') },
  p2patient: { prompt: () => 'Look at the patient', use: () => insp('The patient in 13', SF().patTurned ? 'A training mannequin in a hospital gown.\n\nIts head is turned towards you. It was facing the window.' : 'A training mannequin in a hospital gown, propped up in bed facing the window. Someone has drawn a mouth on it in lipstick.') },
  mem8: memDef('mem8', 'Untie the ribbon'),
  p2photo0: { prompt: () => 'Look at the photograph', use: () => Story.p2PhotoLook(0) }, p2photo1: { prompt: () => 'Look at the photograph', use: () => Story.p2PhotoLook(1) },
  p2photo2: { prompt: () => 'Look at the photograph', use: () => Story.p2PhotoLook(2) }, p2photo3: { prompt: () => 'Look at the photograph', use: () => Story.p2PhotoLook(3) },
  p2mDiary: readDef('p2mdiary', 'Margaret\'s diary', TXT2.mDiary, 'Read Margaret\'s diary', { hand: true, after: () => { SF().mDiaryRead = true; if (!SF().wallDone) UI.objective('Take down the photographs that are not her.'); } }),
  p2mBox: { prompt: () => 'Look at the music box', use: () => insp('A music box', 'Not Elena\'s — a cheap copy from a seaside shop. It plays the same song. Margaret wore the key on a string; the string is still here, the key is gone.') },
  p2nurseNotes: readDef('p2nurse', 'Night notes', TXT2.nurseNotes, 'Read the notes', { after: () => { if (!SF().powerOn) UI.objective(Story.p2FuseObjective()); } }),
  mem9: memDef('mem9', 'Pick up the postcard'),
  p2fusebox: { prompt: () => SF().powerOn ? 'The fuse box' : 'Open the fuse box', use: () => Story.p2FuseBox() },
  p2tableBody: { prompt: () => 'Look at the body', use: () => UI.say(SF().bodySat ? 'It is standing beside the table now, facing you. You did not see it move.' : 'A shape under a sheet. Clearance staff left it here. It is the only thing in the room that is not covered in dust.', 4.5) },
  p2toeTags: readDef('p2tags', 'The mortuary register', TXT2.toeTags, 'Read the register', { after: () => { if (!Story.has('album')) UI.objective('Open drawer 7.'); } }),
  p2liftBtn: { prompt: () => 'Call the lift', use: () => Story.p2LiftButton() },
  p2margaret: { prompt: () => SF().p2Ending ? null : 'Speak to her', use: () => Story.p2TalkMargaret() },
  p2girl: { prompt: () => 'Look at the girl', use: () => UI.say('A girl in a yellow dress, at the window, humming. When you step closer she stops. She does not turn around.', 4.5) },
});
for (let i = 0; i < 12; i++) Story.defs['p2drawer' + i] = { prompt: () => SF()['dr' + i] ? 'Look in drawer ' + (i + 1) : 'Open drawer ' + (i + 1), use: () => Story.p2Drawer(i) };

// ---------------- scares, spread through the hospital ----------------
const Scare = {
  last: -999,
  ready(gap = 35) { return !Chase.active && G.time - this.last > gap; },
  face(dist = 1.25) {
    if (Chase.active) return; const fw = camFwd(); fw.y = 0; fw.normalize();
    const x = P.pos.x + fw.x * dist, z = P.pos.z + fw.z * dist;
    Ent.show(x, P.y, z, { dur: .6, quiet: true, pose: 'lunge', stareT: 99 }); Ent.pose(.016, 'lunge');
    SFX.screech(V3(x, P.y + 1.8, z), 1.1); SFX.hit(.9); W.camShake = 1; W.fx.flash = .18; W.fx.red = .45; this.last = G.time;
  },
  sting(v = .35) { SFX.stinger(v, 2.2); SFX.heartbeat(5, .4, 1.4); this.last = G.time; },
};
Object.assign(SFX, {
  ring(pos) { if (!this.ok) return; const ctx = this.ctx, t0 = this.now(), out = this.out(pos, this.sfx, 2, 1); [0, .55].forEach(o => { [440, 480].forEach(f => { const os = ctx.createOscillator(); os.frequency.value = f; const g = ctx.createGain(); os.connect(g); g.connect(out); g.gain.setValueAtTime(0, t0 + o); g.gain.linearRampToValueAtTime(.12, t0 + o + .02); g.gain.setValueAtTime(.12, t0 + o + .4); g.gain.linearRampToValueAtTime(0, t0 + o + .42); os.start(t0 + o); os.stop(t0 + o + .45); }); }); },
  ding(pos) { if (!this.ok) return; const ctx = this.ctx, t = this.now(), out = this.out(pos, this.sfx, 2, 1); [880, 660].forEach((f, i) => { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); o.connect(g); g.connect(out); this.env(g, t + i * .35, .005, .25, 1.2); o.start(t + i * .35); o.stop(t + i * .35 + 1.3); }); },
});

// ---------------- world state per chapter ----------------
Story.afterBuild2 = function () {
  W.portraitStage = { dining: 0, hall: 0 }; W.pedestals = [];
  W.intensity = 1; W.raining = true; W.tvOn = true; W.radioOn = false; W.fx = { flash: 0, distort: 0, red: 0 }; W.p2power = false;
  this.timers = []; this.ambT = 0; this.thunderT = rand(8, 16); this.chT = 0; this.room = 'outside'; this.roomT = 0; this.stopCD = 10;
  Ent.build(); Chase.reset();
  W.tvCamPos = V3(6.35, 2.35, 21.75);
  W.doors.ward.onOpen = () => { if (CH() === 12) this.startChapter(13); };
  W.dripB = SFX.emitter(V3(-46, BY + .3, -30), 'drip'); W.emitters.push(W.dripB);
  W.hum = SFX.emitter(V3(-20, BY + 2.3, -26), 'hum'); W.emitters.push(W.hum);
};
Story.p2ApplyPower = function (instant) {
  W.p2power = true; const f = SF(); f.powerOn = true;
  ['w1', 'w2', 'w3', 'w4', 'w5'].forEach((n, i) => { const L = W.obj['lamp_' + n]; if (instant) setLamp(L, true); else this.after(.6 + i * .7, () => { setLamp(L, true); SFX.click(L.obj.getWorldPosition(new THREE.Vector3()), .6, 900); }); });
  Object.keys(W.p2rooms).forEach(n => setLamp(W.obj['lamp_room' + n], true)); ['nurse', 'rec'].forEach(n => setLamp(W.obj['lamp_' + n], true));
  setLamp(W.obj.lamp_wEmerg, false); setLamp(W.obj.lamp_fuseLed, false);
  Object.entries(W.p2plates).forEach(([n, p]) => p.set(+n));
  W.obj.fuseSlots.forEach(s => s.material = MAT.brass);
  const d = W.doors.r14; d.locked = false;
};
Story.setupChapter2 = function (n) {
  const D = W.doors, f = SF(), o = W.obj;
  o.shedKey.visible = !f.gotShedKey; o.lighter.visible = !f.gotLighter;
  if (n >= 12) { o.chain.visible = false; D.entrance.locked = false; D.entrance.setOpen(true, 50); o.boltCutters.visible = false; D.shed.locked = false; f.chainCut = true; }
  if (n >= 13) { D.records.locked = false; f.recordsOpen = true; D.ward.locked = false; D.ward.setOpen(true, 50); }
  if (n >= 14) { this.p2ApplyPower(true); }
  if (n >= 15) { [1, 3].forEach(i => W.p2.photoWall[i].g.visible = false); o.wallPanel.visible = false; f.wallDone = true; D.stairs2.locked = false; D.stairs2.setOpen(true, 50); o.r14Fig.visible = false; }
  if (n >= 16) { f.dr6 = true; W.p2.drawers[6].position.x = -49.74 + .7; }
  for (const k in D) D[k].ang = D[k].target, D[k].pivot.rotation.y = D[k].ang, D[k].col.on = Math.abs(D[k].ang) < .35;
};
Story.placePlayer2 = function (n) {
  const spots = { 11: [0, 0, 27.5, 0], 12: [0, 0, 2.6, 0], 13: [-7.2, 0, -3.2, Math.PI / 2], 14: [-14, 0, .4, Math.PI], 15: [-42.5, 0, -9, 0], 16: [12.8, 0, -13, -Math.PI / 2] };
  const s = spots[n] || spots[11];
  P.pos.set(s[0], 0, s[2]); P.lv = s[1]; P.y = levelY(s[1]); P.yaw = s[3]; P.pitch = 0; P.crouch = false; P.stamina = 1; P.speed = 0; P.flashOn = true;
  P.outside = P.lv === 0 && P.pos.z > 4.05;
};
Story.getRoom2 = function () {
  const p = P.pos, lv = P.lv, x = p.x, z = p.z;
  if (P.outside) { if (x > 6 && x < 9 && z > 19 && z < 22) return 'booth'; if (x > -12 && x < -8 && z > 12 && z < 16) return 'shed'; return 'outside'; }
  if (lv === 0) {
    if (x >= -6 && x <= 6 && z >= -8) return 'lobby';
    if (x > 6 && x <= 12 && z > -8 && z < -2) return 'records';
    if (x >= 14 && x <= 30 && z >= -20 && z <= -6) return 'dayroom';
    if (x >= 22 && x <= 24.4 && z > -6) return 'fire';
    if (x > 11.4 && x < 14 && z > -14.4 && z < -11.6) return 'liftT';
    if (x < -38 && x >= -46 && z > -8 && z < 0) return 'nurse';
    if (x > -44 && x < -41 && z < -8) return 'stairs';
    if (x < -6 && x > -38) { if (z > -4.4 && z < -2) return 'corridor'; const i = Math.min(4, Math.floor((-6 - x) / 6.4)); return 'r' + (z <= -4.4 ? 11 + i * 2 : 12 + i * 2); }
    return 'lobby';
  }
  if (z > -18) return 'stairs';
  if (x < -36) return 'morgue'; if (x < -4) return 'tunnel'; if (x < 4) return 'liftLobby'; return 'liftB';
};
Story.onRoom2 = function (r, prev) {
  if (CH() === 11 && r === 'lobby') this.startChapter(12);
  if (CH() === 14 && r === 'stairs' && SF().wallDone) this.startChapter(15);
  if (r === 'booth' && !SF().inBooth) { SF().inBooth = true; this.after(1, () => UI.sub(NM(), 'Somebody left in a hurry. The kettle\'s still on the desk.', 3.5)); }
};
Story.p2Common = function (dt) {
  // fluorescent tubes glow only while their lamp is lit
  (W.p2tubes || []).forEach(t => { const on = t.L.cur > 0; t.m.color.setHex(on ? 0xdfe8e4 : 0x22262a); });
};
Story.p2ApplyWorld = function () {
  const f = SF(), o = W.obj;
  if (f.gotShedKey) o.shedKey.visible = false; if (f.gotLighter) o.lighter.visible = false; if (f.gotCutters) o.boltCutters.visible = false;
  if (f.chainCut) o.chain.visible = false; if (f.fuseA) o.fuse1.visible = false;
  if (f.powerOn && !W.p2power) this.p2ApplyPower(true);
  if (f.wallDone && o.wallPanel.visible) { [1, 3].forEach(i => W.p2.photoWall[i].g.visible = false); o.wallPanel.visible = false; }
  for (let i = 0; i < 12; i++) if (f['dr' + i] && W.p2.drawers[i].position.x < -49.5) W.p2.drawers[i].position.x = -49.74 + .7;
  if (f.liftCalled && !W.p2.liftCalling) this.p2CallLift();
  if (f.fusesIn) W.obj.fuseSlots.forEach((s, i) => { if (i < f.fusesIn) s.material = MAT.brass; });
};

// ---------------- chapter 11: the grounds ----------------
Story.enter11 = function (load) {
  this.setIntensity(1); W.raining = true;
  UI.objective('Find a way into the hospital.');
  if (!load) {
    this.after(2, () => UI.sub(NM(), 'St. Brigid\'s. Grandma Margaret\'s last address.', 4));
    this.after(5.5, () => { this.addNote('p2letter', 'A letter from the hospital', TXT2.letter()); UI.read('A letter from the hospital', TXT2.letter(), { onClose: () => UI.objective('Find a way in. The site key is "with the security booth by the gate".') }); });
  }
};
Story.ch11 = function (dt) {
  const f = SF(), r = this.room;
  // the CCTV monitor shows the booth — with someone standing behind you
  if (r === 'booth' && !f.camScare) {
    const mp = W.obj.tv.getWorldPosition(new THREE.Vector3()).setY(1.0);
    if (inView(mp, .2) && P.pos.distanceTo(mp) < 2.2) { f.camLook = (f.camLook || 0) + dt; }
    if (f.camLook > 1.2) {
      f.camScare = true; W.tvImage = true; W.obj.tvMat.uniforms.mixImg.value = 1;
      const b = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(.8);
      Ent.show(P.pos.x + b.x, P.y, P.pos.z + b.z, { mirror: true, dur: 2.4, yaw0: P.yaw, quiet: true });
      UI.sub('', '[on the screen: someone is standing right behind you]', 3); Scare.sting(.4);
      this.after(2.4, () => { W.tvImage = false; W.obj.tvMat.uniforms.mixImg.value = 0; });
    }
  }
  // a figure on the roof edge, once you are close enough to look up
  if (!f.roofSeen && P.outside && P.pos.z < 15 && P.pos.z > 6 && !Ent.on && G.time > 25) {
    const sp = V3(-15.6, 7.45, 4.3);
    if (inView(sp.clone().setY(9), .5) && lookDot(sp) > .8) { f.roofSeen = true; Ent.show(sp.x, sp.y, sp.z, { dur: 2.6, quiet: true, vanish: 4 }); this.after(.3, () => SFX.whisper(V3(-15.6, 8.5, 4.3), 1.4, .3)); }
  }
};
Story.p2EntranceMsg = function () { return SF().chainCut ? 'It will not open.' : 'Chained shut from the outside. A heavy padlock hangs from the chain.'; };
Story.p2CutChain = function () {
  if (SF().chainCut) return;
  if (!Story.has('boltCutters')) { UI.say('A chain through both handles, and a padlock the size of your fist. You need something to cut it.', 4); UI.objective(Story.has('shedKey') ? 'Find the bolt cutters in the groundskeeper\'s shed.' : 'Find a way in. The site key is "with the security booth by the gate".'); return; }
  SF().chainCut = true; W.obj.chain.visible = false; SFX.click(V3(0, 1.1, 4.3), .9, 900); SFX.scrape(V3(0, 1.1, 4.3), .4, .5); this.take('boltCutters');
  const d = W.doors.entrance; d.locked = false; UI.say('The chain bites, then snaps. It slithers to the step like something alive.', 4); UI.objective('Go inside.');
};
Story.p2TakeCutters = function () {
  const f = SF(); if (f.gotCutters) return; f.gotCutters = true; W.obj.boltCutters.visible = false; Story.give('boltCutters'); UI.objective('Cut the chain on the front doors.');
  const d = W.doors.shed; const dp = d.pos();
  this.after(1.6, () => { if (d.open) d.slam(); W.camShake = .6; Scare.sting(.3); });
  [2.2, 2.7, 3.1, 3.4, 3.9].forEach((t, i) => this.after(t, () => { SFX.knock(dp, 1, 1); W.camShake = .4; }));
  this.after(2.3, () => UI.sub('', '[something hammers on the shed door from outside]', 3));
  this.after(6.5, () => { d.creakOpen(1.2, .3); UI.sub(NM(), '...Hello?', 2); });
};

// ---------------- chapter 12: reception ----------------
Story.enter12 = function (load) {
  this.setIntensity(2);
  UI.objective('Find out what happened to Grandma.');
  if (!load) this.after(1.5, () => UI.sub(NM(), 'Hello? ...Anyone here?', 2.5));
  this.after(22, () => { if (!SF().phoneDone) this.p2StartRing(); });
};
Story.p2StartRing = function () {
  if (W.p2ring || SF().phoneDone) return; W.p2ring = true; const pp = W.obj.phone.getWorldPosition(new THREE.Vector3());
  const ring = () => { if (!W.p2ring) return; SFX.ring(pp); this.after(3, ring); }; ring();
  UI.sub('', '[the phone on the reception desk is ringing]', 3);
};
Story.p2Phone = function () {
  const f = SF();
  if (!W.p2ring) { UI.say('Dead. No dial tone. The cord has been cut.', 3); return; }
  W.p2ring = false; f.phoneDone = true; const pp = W.obj.phone.getWorldPosition(new THREE.Vector3());
  SFX.staticBurst(pp, 1.5, .3);
  this.after(1.2, () => { UI.sub('A child\'s voice, on the line', 'She\'s still waiting for you. In fourteen. ...No. Downstairs. She moves.', 5); SFX.speak('She is still waiting for you. In fourteen. No. Downstairs. She moves.', { pitch: 1.8, rate: .8, volume: .45 }); });
  this.after(6.5, () => { // the wheelchair rolls, the tube bursts
    const wc = W.obj.wheelchair, a = wc.position.clone(), b = V3(-3.6, 0, -1.6); let t = 0; f.chairRolled = true;
    SFX.scrape(a, 1.1, .7); W.updaters.push(dt => { t += dt / 1.1; wc.position.lerpVectors(a, b, smooth(Math.min(1, t))); wc.rotation.y += dt * 2; return t < 1; });
    const L = W.obj.lamp_lob1; this.after(.5, () => { SFX.crash(L.obj.getWorldPosition(new THREE.Vector3()), .6); W.fx.flash = .3; setLamp(L, false); Scare.sting(.35); });
    UI.objective('Find Margaret\'s records.');
  });
};
Story.p2RecordsDoor = function (d) { if (!d.locked) return true; this.p2Keypad(); return false; };
Story.p2Keypad = function () {
  if (SF().recordsOpen) return;
  let code = '';
  UI.puzzle('Records — keypad', 'Four digits. A sticky label under the keys has been scratched away.', (body, close) => {
    const disp = document.createElement('div'); disp.style.cssText = 'font-family:"Special Elite",monospace;font-size:34px;letter-spacing:.4em;margin:8px 0 14px;min-height:44px';
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center';
    const show = () => disp.textContent = code.padEnd(4, '·');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].forEach(k => {
      const b = document.createElement('button'); b.textContent = k; b.onclick = () => {
        SFX.click(null, .25, 2600);
        if (k === 'C') code = ''; else if (k === 'OK') {
          if (code === '1410') { SFX.unlock(V3(6, 1.2, -5)); SF().recordsOpen = true; const d = W.doors.records; d.locked = false; close(); d.setOpen(true, 3); UI.objective('Find Margaret\'s file in the records room.'); return; }
          SFX.locked(null); disp.style.color = '#b33a2c'; setTimeout(() => { disp.style.color = ''; code = ''; show(); }, 600); return;
        } else if (code.length < 4) code += k;
        show();
      }; grid.appendChild(b);
    });
    body.append(disp, grid); show();
  });
};
Story.ch12 = function (dt) {
  const f = SF(), r = this.room;
  // leaving the records room with the card: it is in the doorway
  if (f.gotCard && !f.faceRecords && r === 'lobby' && this.prevRoom === 'records' && this.roomT < .6 && Scare.ready(12)) { f.faceRecords = true; Scare.face(1.3); }
};

// ---------------- chapter 13: Ward B ----------------
Story.enter13 = function (load) {
  this.setIntensity(3);
  UI.objective('It\'s pitch dark. Find a way to get the power back on.');
  if (!load) this.after(1.5, () => UI.sub(NM(), 'Ward B. Fourteen is somewhere down here.', 3.5));
  this.after(14, () => { if (!SF().powerOn) { SFX.knock(V3(-38, 1.2, -3.2), 3, .5); UI.sub('', '[three knocks, far down the corridor]', 3); } });
};
Story.p2FuseCount = function () { const f = SF(); return ['fuseA', 'fuseB', 'fuseC'].filter(k => f[k]).length; };
Story.p2Fuse = function (id, text) {
  const f = SF(); if (f[id]) return; f[id] = true; Story.give(id); UI.say(text, 4); if (id === 'fuseA') W.obj.fuse1.visible = false;
  UI.objective(this.p2FuseObjective());
};
Story.p2FuseObjective = function () {
  const n = this.p2FuseCount();
  return n >= 3 ? 'Put the fuses in the fuse box, in the nurses\' station at the far end of Ward B.' : `Find three fuses (${n}/3). The fuse box is in the nurses' station at the far end of Ward B.`;
};
Story.p2FuseBox = function () {
  const f = SF();
  if (f.powerOn) { UI.say('All three fuses are in. The box hums like something asleep.', 3); return; }
  f.fuseBoxSeen = true;
  // fuses count by who found them (team flags), so two players picking them up at once never loses one
  const found = this.p2FuseCount(), before = f.fusesIn || 0;
  ['fuseA', 'fuseB', 'fuseC'].forEach(k => { if (f[k]) this.take(k); });
  if (f.fuseA) W.obj.fuse1.visible = false;
  f.fusesIn = Math.max(before, found); W.obj.fuseSlots.forEach((sl, i) => { if (i < f.fusesIn) sl.material = MAT.brass; });
  if (f.fusesIn < 3) { if (f.fusesIn > before) SFX.click(null, .4, 1400);
    UI.say(`The main fuse box. ${3 - f.fusesIn} of the three fuse holders ${3 - f.fusesIn === 1 ? 'is' : 'are'} empty.`, 3.5); UI.objective(this.p2FuseObjective()); return; }
  SFX.click(null, .6, 1200); this.after(.4, () => { SFX.hit(.4); this.p2ApplyPower(false); UI.sub('', '[a deep clunk — and the hum of the lights, one after another]', 3.5); });
  this.after(4.5, () => { UI.objective('Room 14. Look for the ribbon.'); UI.sub(NM(), 'The numbers on the doors. They\'re... right again.', 3.5); });
};
Story.ch13 = function (dt) {
  const f = SF(), r = this.room;
  // the numbers on the doors change while you're not looking (until the power is back)
  if (!f.powerOn && r === 'corridor') {
    f.plateT = (f.plateT || 0) - dt;
    if (f.plateT <= 0) { f.plateT = 2; const ns = Object.keys(W.p2plates); const n = pick(ns); const p = W.p2plates[n]; if (!inView(p.mesh.getWorldPosition(new THREE.Vector3()), .3)) p.set(pick([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])); }
  }
  // the patient in 13 turns its head while you look away
  const pat = W.obj.patient, pp = pat.getWorldPosition(new THREE.Vector3()).setY(1.2);
  if (r === 'r13') { if (inView(pp, .3)) { if (f.patTurned && !f.patStung) { f.patStung = true; Scare.sting(.3); } f.patSeen = true; } else if (f.patSeen && !f.patTurned) { f.patTurned = true; pat.rotation.y = Math.atan2(P.pos.x - pat.position.x, P.pos.z - pat.position.z); SFX.creak(pp, .4, .7); } }
  // something hammers on the door of 17 from inside
  const d17 = W.doors.r17;
  if (!f.bang17 && this.p2FuseCount() >= 1 && r === 'corridor' && Math.abs(P.pos.x - d17.pos().x) < 2.2 && Scare.ready(30)) {
    f.bang17 = true; [0, .3, .55, .8, 1.3, 1.5].forEach(t => this.after(t, () => { SFX.knock(d17.pos(), 1, 1.1); W.camShake = .5; }));
    Scare.sting(.3); UI.sub('', '[something throws itself against the door of 17 — from inside]', 3.5);
  }
  // a body drops through the ceiling hatch
  if (!f.hatch && this.p2FuseCount() >= 2 && r === 'corridor' && Math.abs(P.pos.x + 21) < 1.6 && Scare.ready(30)) {
    f.hatch = true; W.obj.hatch.visible = false; const h = W.obj.hanging; h.visible = true; h.position.y = 3.2; let t = 0;
    SFX.crash(V3(-21, 3, -3.2), .9); W.camShake = 1; Scare.last = G.time; SFX.hit(.9);
    W.updaters.push(dt => { t += dt; h.position.y = Math.max(1.0, 3.2 - t * t * 20); h.rotation.z = Math.sin(t * 5) * .3 * Math.exp(-t); if (t > 4 && !inView(h.position.clone().setY(1.8), .4)) { h.visible = false; return false; } return true; });
  }
  // CHASE 4: with the power on, the Matron comes down the ward
  if (f.powerOn && !f.chase4 && r === 'corridor' && P.pos.x > -27 && !Chase.active && this.chT > 6) Chase.start(CHASES[4]);
};
Story.p2Room14Msg = function () { return SF().powerOn ? 'It will not open.' : 'Locked. An electric lock — dead with the power off. A yellow ribbon is knotted round the handle.'; };

// ---------------- chapter 14: room 14 ----------------
Story.enter14 = function (load) {
  this.setIntensity(3);
  UI.objective('Find out what Grandma left here.');
  if (!load) this.after(5, () => UI.sub(NM(), 'Her room. She lived in this room for fifteen years.', 3.5));
};
Story.p2PhotoLook = function (i) { insp('A photograph on the wall (' + ['I', 'II', 'III', 'IV'][i] + ')', P2PH[i], this.p2Photo(i)); };
Story.ch14 = function (dt) {
  const f = SF(), r = this.room;
  if (r === 'r14' && !f.wallDone && f.mDiaryRead && !f.wallAsked) { f.wallAsked = true; }
  if (r === 'r14' && !f.m14 && this.roomT > 3 && !Chase.active) {
    const mp = V3(W.p2rooms[14].x1 + .09, 1.5, .6);
    if (P.pos.distanceTo(mp) < 2.6 && lookDot(mp) > .9) { f.m14 = true; Ent.show(P.pos.x + .9, P.y, P.pos.z + .2, { mirror: true, dur: 2.2, yaw0: P.yaw, quiet: true }); Scare.sting(.3); }
  }
};
Story.p2PhotoWall = function () {
  const pick2 = new Set();
  UI.puzzle('The photo wall', 'Two of these are Elena. Two are the things it made. Choose the two to take down.', (body, close) => {
    const row = document.createElement('div'); row.className = 'phs';
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div'); d.className = 'ph'; d.style.width = '110px'; d.style.height = '130px'; d.title = P2PH[i];
      const im = new Image(); im.src = this.p2Photo(i).toDataURL(); d.appendChild(im); const lb = document.createElement('div'); lb.textContent = ['I', 'II', 'III', 'IV'][i]; lb.style.cssText = 'font-size:12px;color:var(--dim);text-align:center'; d.appendChild(lb);
      d.onclick = () => { if (pick2.has(i)) pick2.delete(i); else if (pick2.size < 2) pick2.add(i); d.style.outline = pick2.has(i) ? '2px solid #b33a2c' : ''; SFX.click(null, .25, 2200); };
      row.appendChild(d);
    }
    const tip = document.createElement('p'); tip.style.fontSize = '14px'; tip.style.color = 'var(--dim)'; tip.textContent = 'Look closely at each photograph on the wall first. Margaret\'s diary says how to tell.';
    const go = document.createElement('button'); go.textContent = 'Take them down';
    go.onclick = () => { if (pick2.size !== 2) return; if (pick2.has(1) && pick2.has(3)) { close(); this.p2WallSolved(); } else { SFX.locked(null); tip.textContent = 'You reach for them — and stop. That one is her. You are sure of it.'; } };
    body.append(row, tip, go);
  });
};
Story.p2WallSolved = function (remote) {
  const f = SF(); if (f.wallDone) return; f.wallDone = true; if (!remote) Net.beat('p2wall');
  [1, 3].forEach(i => W.p2.photoWall[i].g.visible = false); W.obj.wallPanel.visible = false; SFX.scrape(V3(W.p2rooms[14].x1 + 5.7, 1.2, 3.9), .5, .3);
  if (!Story.has('basementKey') && !remote) { Story.give('basementKey'); }
  UI.say('Behind the frames, a loose panel. Behind the panel, a heavy key stamped MORTUARY.', 4);
  this.after(3.5, () => { // lights out — the shape in her bed sits up
    W.blackout = true; SFX.silence(4, .05); const fig = W.obj.r14Fig; let t = 0;
    this.after(1.2, () => { W.flashFlicker = .6; SFX.screech(fig.position.clone().setY(1.2), .8); W.updaters.push(dt => { t += dt / .35; fig.rotation.x = -Math.PI / 2 * (1 - Math.min(1, t)); fig.position.y = .62 + Math.min(1, t) * -.1; return t < 1; }); W.camShake = .8; Scare.last = G.time; });
    this.after(3.6, () => { W.blackout = false; fig.visible = false; UI.objective('The basement. The stairwell behind the nurses\' station.'); });
  });
};
Object.assign(Story.defs, { p2photo0: { prompt: () => SF().wallDone ? 'Look at the photograph' : (SF().mDiaryRead ? 'The photo wall' : 'Look at the photograph'), use: () => SF().mDiaryRead && !SF().wallDone ? Story.p2PhotoWall() : Story.p2PhotoLook(0) } });
['p2photo1', 'p2photo2', 'p2photo3'].forEach((id, k) => { Story.defs[id] = { prompt: () => SF().mDiaryRead && !SF().wallDone ? 'The photo wall' : 'Look at the photograph', use: () => SF().mDiaryRead && !SF().wallDone ? Story.p2PhotoWall() : Story.p2PhotoLook(k + 1) }; });
Story.p2StairsMsg = function () { return 'STAIRS — MORTUARY. Locked with a heavy key.'; };

// ---------------- chapter 15: the morgue ----------------
Story.enter15 = function (load) {
  this.setIntensity(4);
  UI.objective('Find Grandma\'s things in the mortuary.');
  if (!load) this.after(2, () => UI.sub(NM(), 'It\'s colder down here than outside.', 3));
};
Story.p2Drawer = function (i) {
  const f = SF(), dr = W.p2.drawers[i];
  if (!f['dr' + i]) { f['dr' + i] = true; let t = 0; const x0 = dr.position.x; SFX.scrape(dr.position, .6, .4); W.updaters.push(dt => { t += dt / .6; dr.position.x = x0 + Math.min(1, t) * .7; return t < 1; }); }
  if (i === 2) return Story.findMemory('mem10');
  if (i === 6) {
    if (!Story.has('album') && !f.gotAlbum) { f.gotAlbum = true; Story.give('album'); UI.inspect('Drawer 7', 'A cardboard box: PERSONAL EFFECTS — HALE, M.\n\nInside, in a plastic sleeve, one photograph. The dinner table, 14 October 1987. Everyone is laughing at something outside the frame.\n\nOn the back: "Don\'t let me forget."', this.diningPortrait(3), () => this.after(2.5, () => { if (!SF().chase5 && !Chase.active) Chase.start(CHASES[5]); })); }
    else UI.say('Empty now.', 2);
    return;
  }
  if (i === 9) {
    if (!f.arm) { f.arm = true; const arm = new THREE.Group(); arm.position.set(.45, .2, 0); dr.add(arm); const a1 = new THREE.Mesh(new THREE.CylinderGeometry(.04, .03, .7, 7), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: .5 })); a1.rotation.z = Math.PI / 2; a1.position.x = .3; arm.add(a1);
      for (let k = 0; k < 4; k++) { const fg = new THREE.Mesh(new THREE.CylinderGeometry(.007, .004, .17, 5), MAT.black); fg.rotation.z = Math.PI / 2 + rand(-.3, .3); fg.position.set(.72, rand(-.04, .04), -.04 + k * .025); arm.add(fg); }
      SFX.screech(dr.getWorldPosition(new THREE.Vector3()), 1); SFX.hit(1); W.camShake = 1.1; W.fx.red = .5; Scare.last = G.time;
      this.after(1.4, () => { dr.remove(arm); }); UI.sub('', '[a hand shoots out of the drawer — and is gone]', 3); }
    else UI.say('Empty. Scratches on the inside of the metal.', 3);
    return;
  }
  UI.say(['Empty. A tag on a string, no name.', 'Empty, and very cold.', 'A folded sheet, and nothing under it.', 'Empty. It smells of lilies.'][i % 4], 3);
};
Story.ch15 = function (dt) {
  const f = SF(), r = this.room;
  // the body on the table sits up while you look away
  if (r === 'morgue' && f.gotAlbum && !f.bodySat) {
    const b = W.obj.tableBody, bp = b.getWorldPosition(new THREE.Vector3()).setY(BY + 1.2);
    if (!inView(bp, .6)) { f.bodySat = true; b.rotation.x = 0; b.position.set(-42.1, BY, -27.4); b.rotation.z = 0; b.rotation.y = Math.atan2(P.pos.x - b.position.x, P.pos.z - b.position.z); f.bodyCheck = true; }
  }
  if (f.bodyCheck && !f.bodyStung && inView(W.obj.tableBody.getWorldPosition(new THREE.Vector3()).setY(BY + 1.2), .3)) { f.bodyStung = true; Scare.sting(.4); }
};
Story.p2LiftButton = function () {
  const f = SF(); SFX.click(V3(3.9, BY + 1.2, -28), .4, 1600);
  if (!f.gotAlbum) { UI.say('The button lights for a second, then dies. Somewhere far above, the lift does not move.', 4); return; }
  if (!W.p2.liftCalling) this.p2CallLift();
  else UI.say(W.p2.liftB.open > .5 ? 'The doors are open. Get in.' : 'You hammer the button. The lift is coming. Too slowly.', 3);
};
Story.p2CallLift = function () {
  if (W.p2.liftCalling) return; W.p2.liftCalling = true; SF().liftCalled = true; UI.sub('', '[far above, the lift starts to come down]', 3);
  this.after(9, () => { W.p2.liftB.set(1); SFX.ding(V3(4, BY + 1.5, -26)); UI.sub('', '[ding]', 1.5); });
};

// ---------------- chapter 16: visiting hours ----------------
Story.enter16 = function (load) {
  this.setIntensity(2); W.raining = true;
  UI.objective('Talk to her.');
  W.p2.liftT.set(1);
  this.after(2, () => UI.sub(NM(), 'The dayroom. And she\'s... here.', 3));
  W.memHum = SFX.musicBox(W.obj.p2box.getWorldPosition(new THREE.Vector3()), { vol: .08, tempo: .42 });
};
Story.ch16 = function (dt) { };
Story.p2CanF = function () { return ['mem7', 'mem8', 'mem9', 'mem10'].every(k => this.S.mem[k]) && SF().mDiaryRead; };
Story.p2TalkMargaret = function () {
  const canF = this.p2CanF(), has = Story.has('album');
  const N = {
    start: { who: 'Margaret', text: 'You came. Nobody visits any more. They only send her.', opts: [{ t: 'Grandma… it\'s me.', to: 'me' }, { t: 'Who is "her"?', to: 'her' }] },
    me: { who: 'Margaret', text: 'I know who you are, love. You have Tom\'s chin. I\'m so sorry about your father.', next: 'her' },
    her: { who: 'Margaret', text: 'Every night at nine she comes to my door. She has the photograph — the last one, from the dinner. The building learned her from it. From me, looking at it, every day for fifteen years.', next: 'her2' },
    her2: { who: 'Margaret', text: has ? 'I brought that photograph here so I would never forget her face. I think I taught this place to make her. You found it. You have it in your pocket. I can feel it.' : 'You need the photograph, love. It\'s down below, with my things. Drawer seven.', next: has ? 'choice' : null },
    choice: { who: 'Margaret', text: 'Give it to me, and I will stay here with her. Or burn it, and all of this stops. Her. The ward. Me.', opts: [{ t: 'Give her the photograph.', to: 'D1' }, { t: 'Burn the photograph.', to: 'E1' }].concat(canF ? [{ t: 'Elena is waiting for you, Grandma. Not this one — the real one. The ribbon. The ring. The postcard. The drawing. She never stopped.', to: 'F1', special: true }] : []).concat([{ t: '(Step back.)', to: null }]) },
    D1: { who: 'Margaret', text: '…Thank you, love. Go home now. Visiting hours are over.', act: () => this.p2EndingD() },
    E1: { who: 'Margaret', text: 'No — no, please, it\'s all I have left of her—', act: () => this.p2EndingE() },
    F1: { who: 'Margaret', text: '…She is? All this time? Then I had better not keep her waiting.', next: 'F2' },
    F2: { who: 'Elena', text: 'Mama. Come on. You\'re late.', act: () => this.p2EndingF(), voice: 1.85 },
  };
  UI.dialogue(N, SF().p2Talked && has ? 'choice' : 'start', node => { SF().p2Talked = true; if (!node) return; if (node.voice) SFX.speak(node.text, { pitch: node.voice, rate: .8, volume: .5 }); else if (node.who === 'Margaret') SFX.murmur(W.obj.margaret.position.clone().setY(1.2), Math.min(4, node.text.length * .045), { pitch: 175, vol: .22 }); });
};
function p2Dawn() {
  W.dawn = true; W.raining = false; W.blackout = false; Ent.hide(true); Story.setIntensity(0);
  W.scene.fog.color.set(0x8a8478); W.scene.background = new THREE.Color(0x8a8478); W.scene.fog.density = .03;
  W.hemi.color.set(0xd8c8a8); W.hemi.groundColor.set(0x3a3228); W.lamps.forEach(L => L.flick = 0);
  const fd = W.doors.fireExit; fd.locked = false; fd.setOpen(true, .6); SFX.doorOpen(fd.pos(), true);
  if (W.memHum) W.memHum.stop();
}
Story.p2EndingD = function (remote) {
  const f = SF(); if (f.p2Ending) return; f.p2Ending = 'D'; if (!remote) Net.beat('ending', { w: 'D' });
  this.take('album'); SFX.musicBox(W.obj.p2box.getWorldPosition(new THREE.Vector3()), { vol: .22, bus: SFX.voice });
  const g = W.obj.girl, a = g.position.clone(), b = V3(27.9, 0, -14.2); let t = 0; W.updaters.push(dt => { t += dt / 4; g.position.lerpVectors(a, b, smooth(Math.min(1, t))); return t < 1; });
  this.after(5, () => UI.sub('Margaret', 'There you are. There you are.', 3.5));
  this.after(9, () => UI.fade(1, 2.5));
  this.after(12, () => { W.obj.girl.visible = false; W.obj.margaret.visible = false; p2Dawn(); UI.fade(0, 3); UI.objective('Go home. The fire exit is open.'); this.endingWalk = 'D'; });
};
Story.p2EndingE = function (remote) {
  const f = SF(); if (f.p2Ending) return; f.p2Ending = 'E'; if (!remote) Net.beat('ending', { w: 'E' });
  this.take('album'); W.fx.flash = .6; W.fx.red = .7; SFX.crash(V3(27, 1, -12), .8);
  UI.sub('', '[the photograph curls in the flame — and the girl at the window screams]', 3.5);
  SFX.screech(W.obj.girl.position.clone().setY(1.2), 1.2); W.camShake = 1.2; if (W.memHum) W.memHum.stop();
  let t = 0; const h = W.obj.margHead; W.updaters.push(dt => { t += dt / 1.4; if (h) h.rotation.y = Math.PI * Math.min(1, t); return t < 1; });
  this.after(1.2, () => { W.obj.girl.visible = false; Scare.sting(.5); });
  ['day1', 'day2', 'dayLamp'].forEach(n => { const L = W.obj['lamp_' + n]; if (L) { L.color.set(0xff3a20); L.flick = .7; } });
  const fd = W.doors.fireExit; fd.locked = false;
  this.after(2.5, () => { if (!Chase.active) Chase.start(CHASES[6]); });
};
Story.p2EndingF = function (remote) {
  const f = SF(); if (f.p2Ending) return; f.p2Ending = 'F'; if (!remote) Net.beat('ending', { w: 'F' });
  SFX.musicBox(W.obj.p2box.getWorldPosition(new THREE.Vector3()), { vol: .25, bus: SFX.voice });
  const g = W.obj.girl; g.rotation.y = Math.PI / 2 + Math.PI; let t = 0; const a = g.position.clone(), b = V3(28.2, 0, -13.6); W.updaters.push(dt => { t += dt / 3; g.position.lerpVectors(a, b, smooth(Math.min(1, t))); return t < 1; });
  this.after(5, () => { W.obj.margaret.visible = false; g.visible = false; SFX.whisper(V3(28, 1.4, -13), 1.5, .2); });
  this.after(7.5, () => UI.fade(1, 2.5));
  this.after(10.5, () => { p2Dawn(); UI.fade(0, 3); UI.objective('Go outside.'); this.endingWalk = 'F'; this.after(4, () => { UI.sub('Elena', `Thank you, ${NM()}. We're going home now.`, 4.5); SFX.speak(`Thank you, ${NM()}. We are going home now.`, { pitch: 1.85, rate: .8, volume: .5 }); }); });
};

// ---------------- chases ----------------
Object.assign(CHASES, {
  4: {
    id: 4, spawn: [-37.4, 0, -3.2], respawn: [-28, 0, -3.2, -Math.PI / 2], windup: 1.8, speed: 3.45,
    objective: 'RUN. Room 14 — the door with the ribbon.', sub: '[a shriek from the nurses\' station behind you]',
    safe: () => Story.room === 'r14',
    onStart() { ['w1', 'w2', 'w3', 'w4', 'w5'].forEach(n => { const L = W.obj['lamp_' + n]; if (L) L.flick = .85; }); },
    onSafe(done) {
      const d = W.doors.r14; if (d.open) d.slam(); W.camShake = .6;
      Ent.g.position.set(-14, 0, -3.4); Ent.anim.mode = 'idle';
      for (let i = 0; i < 6; i++) Story.after(.7 + i * .45, () => { SFX.knock(d.pos(), 1, 1); W.camShake = .35; });
      Story.after(1.4, () => { UI.sub('A voice through the door — Margaret\'s', 'Let me in, love. It\'s only me. It\'s only Grandma.', 4); SFX.murmur(d.pos(), 2.5, { pitch: 180, vol: .3 }); });
      Story.after(5.5, () => { ['w1', 'w2', 'w3', 'w4', 'w5'].forEach(n => { const L = W.obj['lamp_' + n]; if (L) L.flick = .05; }); done(); });
    },
    onEnd() { if (CH() === 13) Story.startChapter(14); }
  },
  5: {
    id: 5, spawn: [-42.5, -1, -19.6], respawn: [-33, -1, -26, -Math.PI / 2], windup: 2.2, speed: 3.25,
    objective: 'RUN. The service lift — through the tunnel.', sub: '[something is coming down the stairs, fast]',
    safe: () => W.p2.liftB.inside() && W.p2.liftB.open > .85,
    onStart() { Story.p2CallLift(); },
    onSafe(done) {
      const L = W.p2.liftB; L.set(0); SFX.doorClose(V3(4, BY + 1, -26));
      Story.after(1.3, () => { [0, .3, .7, 1.0].forEach(t => Story.after(t, () => { SFX.knock(V3(3.8, BY + 1.2, -26), 1, 1.2); W.camShake = .5; })); });
      Story.after(3, () => done());
    },
    onEnd() { Story.p2RideUp(); }
  },
  6: {
    id: 6, spawn: [15.5, 0, -19], respawn: [21, 0, -9, Math.PI], windup: 1.6, speed: 3.4,
    objective: 'GET OUT. The fire exit.', sub: '[the Matron steps out of the corner of the room]',
    safe: () => P.outside,
    onSafe(done) { done(); },
    onEnd() { Story.after(1.5, () => { p2Dawn(); }); Story.after(5, () => Story.ending('E')); }
  },
});
Story.p2RideUp = function () {
  UI.fade(1, 1.2);
  this.after(1.6, () => {
    SFX.hum && SFX.ding(null);
    const dz = P.pos.z + 26; P.pos.set(12.8, 0, -13 + clamp(dz, -.8, .8)); P.lv = 0; P.y = 0; P.yaw = -Math.PI / 2; P.outside = false;
    if (CH() === 15) this.startChapter(16); UI.fade(0, 2);
  });
};
// ---------------- endings ----------------
Story.p2EndPhoto = function (w) {
  if (w === 'D') return drawPhoto({ w: 360, h: 300, bg: 'room', people: [{ x: .4, kind: 'woman', smile: true }, { x: .6, kind: 'girl', s: .8, smile: true }], caption: 'Visiting hours' });
  if (w === 'E') return drawPhoto({ w: 360, h: 300, bg: 'dark', people: [], caption: '', draw: (ctx, iw, ih) => { const g = ctx.createRadialGradient(iw / 2, ih / 2, 10, iw / 2, ih / 2, iw * .6); g.addColorStop(0, 'rgba(90,60,30,.9)'); g.addColorStop(.6, 'rgba(30,18,10,.95)'); g.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = g; ctx.fillRect(0, 0, iw, ih); } });
  return drawPhoto({ w: 380, h: 300, bg: 'dawn', color: true, tint: [1.05, 1, .92], aged: .3, people: [{ x: .42, kind: 'woman', smile: true }, { x: .58, kind: 'girl', s: .85, smile: true }], caption: 'Home' });
};
