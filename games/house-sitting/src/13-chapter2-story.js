// ================= CHAPTER 2, MORE STORY: the missing posters, the phone, Jesse's tapes, the lock, the plea =================
// The truth, told in pieces: Dana and Rob were the first two house-sitters, in 1962. The thing in the room kept them,
// and lets them play "the Hendersons" for as long as they keep feeding it a new sitter. Jesse Brandt (2025) found out
// and left tapes. The room is the only thing keeping it here; if it burns, it has nowhere to stay, and neither do they.
const TAPES = [
  { id: 1, where: 'living room', lines: [
    ['JESSE (TAPE)', "Tape one. Saturday. Uh... testing. I'm Jesse Brandt. I'm house-sitting for the Hendersons, 41 Alder Lane.", 5.5],
    ['JESSE (TAPE)', 'Fifty bucks a day. They gave me three rules. Weird rules.', 4],
    ['JESSE (TAPE)', "Mrs. Henderson said if I hear footsteps upstairs, I shouldn't go and look. So I'm recording this. In case.", 5.5],
    [null, null, 3],
    ['JESSE (TAPE)', "...There's someone walking around upstairs. Right now.", 4]] },
  { id: 2, where: 'bathroom', lines: [
    ['JESSE (TAPE)', "Tape two. Sunday, I think. I didn't sleep.", 3.5],
    ['JESSE (TAPE)', 'There are photos of them all over the house. 1962. 1987. 2004. Same faces. Same age. They never get older.', 6],
    ['JESSE (TAPE)', "And in some of them there's a kid standing next to them. A different kid every time.", 5],
    [null, null, 2.5],
    ['JESSE (TAPE)', "Something knocked on my window last night. Second floor. I didn't look.", 4.5]] },
  { id: 3, where: 'bedroom', lines: [
    ['JESSE (TAPE)', 'Tape three. They came home early. They were so nice. Dana made me soup. Rob showed me the cellar.', 5.5],
    ['JESSE (TAPE)', "There's a ledger down there. Every kid who ever sat for them. My name is already in it. 2025. In her handwriting.", 6],
    ['JESSE (TAPE)', 'From before I even got the job.', 3],
    [null, null, 2.5],
    ['JESSE (TAPE)', 'The old room down there has a combination lock. Four numbers. The year it all started. The year on the first photo.', 6],
    ['JESSE (TAPE)', "The last tape is in there. Whatever they tell you... don't feed it.", 4.5]] },
  { id: 4, where: 'cellar', lines: [
    ['JESSE (TAPE)', "Last tape. I'm in the old room. They locked the hatch. I can hear it on the ladder.", 5],
    ['JESSE (TAPE)', "Listen. It isn't them. It was never them. Dana and Rob were house-sitters too. The first two. 1962.", 6],
    ['JESSE (TAPE)', 'It kept them. And it lets them pretend to be the Hendersons for as long as they bring it someone new.', 5.5],
    ['JESSE (TAPE)', 'Every kid buys them another twenty years.', 3.5],
    [null, null, 2],
    ['JESSE (TAPE)', "If the room burns, it has nowhere to stay. They go too. I think they want that. I think they're just too scared.", 6],
    [null, null, 1.5],
    ['JESSE (TAPE)', "...It's here. Burn it. Please. Burn it all.", 4]] },
];
const CODE = '1962';

// ---------- posters, the phone, the cassette player, the tapes ----------
function posterTex(name, age, year, last){
  return ctex(128, 176, (x, w, h) => {
    x.fillStyle = '#e9e3d2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#9a1a12'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('MISSING', w / 2, 24);
    x.fillStyle = '#3a342c'; x.fillRect(24, 32, 80, 78); x.fillStyle = '#9a8f7a'; x.beginPath(); x.ellipse(64, 62, 17, 21, 0, 0, 7); x.fill(); x.fillRect(42, 84, 44, 26);
    x.fillStyle = '#1b1814'; x.font = 'bold 12px sans-serif'; x.fillText(name, w / 2, 126); x.font = '10px sans-serif'; x.fillText('Age ' + age + ' · ' + year, w / 2, 140); x.fillText('Last seen: ' + last, w / 2, 153); x.fillText('ALDER LANE', w / 2, 166);
    x.fillStyle = 'rgba(80,60,30,.25)'; x.fillRect(0, 0, w, h); speckle(x, w, h, 500, 0.2);
  }, { clamp: true });
}
function buildCh2Story(){
  // the utility pole by the sidewalk, papered with missing posters
  CYL(0.11, 0.13, 6.5, M.darkWood, 10.6, 0, -8.7); addCollider(10.45, 10.75, -8.85, -8.55, -1);
  const posters = [['JESSE BRANDT', 17, '2025', 'house-sitting'], ['SANNE DE WIT', 15, '2004', 'babysitting'], ['TOM VISSER', 16, '1987', 'house-sitting']];
  PROPS.posters = grp(0, 0, 0);
  posters.forEach((p, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.44), std({ map: posterTex(...p), roughness: 0.9, side: THREE.DoubleSide })); m.position.set(10.6, 1.25 + i * 0.5 - (i === 2 ? 0.9 : 0), -8.84 + (i === 2 ? 0.27 : 0)); m.rotation.y = i === 2 ? Math.PI / 2 : Math.PI; m.rotation.z = rnd(-0.06, 0.06); PROPS.posters.add(m); });
  PROPS.posterHit = hitbox(0.7, 1.8, 0.7, 10.6, 1.4, -8.8);
  // a little table with an old phone by the front door
  B(0.4, 0.75, 0.38, M.darkWood, 9.72, 0, 0.45, { col: 0 });
  PROPS.phone = grp(9.72, 0.75, 0.45); B(0.2, 0.07, 0.15, M.black, 0, 0, 0, { parent: PROPS.phone }); B(0.21, 0.04, 0.05, M.black, 0, 0.07, 0, { parent: PROPS.phone });
  CYL(0.03, 0.03, 0.005, M.white, 0, 0.071, 0.04, { parent: PROPS.phone }); hitbox(0.35, 0.3, 0.3, 0, 0.1, 0, PROPS.phone);
  // the cassette player on the coffee table
  PROPS.deck = grp(3.3, 0.42, 3.95, -0.3); B(0.34, 0.15, 0.12, std({ color: 0x24252a, roughness: 0.5 }), 0, 0, 0, { parent: PROPS.deck });
  [-0.1, 0.1].forEach(dx => CYL(0.04, 0.04, 0.01, M.darkMetal, dx, 0.075, 0.061, { parent: PROPS.deck, rx: Math.PI / 2 }));
  B(0.1, 0.05, 0.005, std({ color: 0x0f1012, roughness: 0.2 }), 0, 0.06, 0.062, { parent: PROPS.deck }); hitbox(0.4, 0.25, 0.25, 0, 0.08, 0, PROPS.deck);
  // the tapes
  const tapeAt = [[0.36, 0.5, 2.95, 0.3], [3.32, 0.92, 10.2, 1.1], [0.62, 3.74, 3.6, 0.4], [72.75, 0.79, 2.05, -0.2]];
  PROPS.tapes = tapeAt.map(([x, y, z, r], i) => { const g = grp(x, y, z, r); B(0.1, 0.016, 0.064, M.black, 0, 0, 0, { parent: g }); B(0.07, 0.002, 0.03, std({ color: [0xd8c37a, 0xc77a5a, 0x7aa0c7, 0xe0e0e0][i], roughness: 0.8 }), 0, 0.016, 0, { parent: g }); hitbox(0.22, 0.12, 0.18, 0, 0.03, 0, g); return g; });
  // a little recorder in the old room, for the last tape
  PROPS.recorder = grp(73.35, 0.79, 2.5, 0.4); B(0.16, 0.05, 0.1, std({ color: 0x2a2620, roughness: 0.5 }), 0, 0, 0, { parent: PROPS.recorder }); hitbox(0.3, 0.2, 0.25, 0, 0.05, 0, PROPS.recorder);
  // a combination padlock on the old room's door (cellar)
  const pl = new THREE.Group(); pl.position.set(0.78, 1.05, 0.06); D.cellarRoom.panel.add(pl); PROPS.combo = pl;
  B(0.09, 0.11, 0.035, M.darkMetal, 0, 0, 0, { parent: pl }); for (let i = 0; i < 4; i++) B(0.014, 0.03, 0.04, M.brass, -0.03 + i * 0.02, 0.03, 0.005, { parent: pl });
}

// ---------- ringing ----------
SND.ring = function(pos){ if (!AU.ready) return; const d = dest(pos, 3); for (let k = 0; k < 2; k++){ const at = k * 0.45; for (let i = 0; i < 16; i++){ tone(d, 'sine', 440, 440, 0.03, 0.18, at + i * 0.025); tone(d, 'sine', 480, 480, 0.03, 0.16, at + i * 0.025); } } };
function ringPhone(times, then){
  S.ringing = true; let n = 0;
  const one = () => { if (!S.ringing) return; SND.ring(PROPS.phone.position.clone().setY(0.9)); if (++n >= times){ after(3.2, () => { if (S.ringing){ n = 0; one(); } }); return; } after(3.2, one); };
  one(); S.onAnswer = then;
}
function answerPhone(){ S.ringing = false; SND.latch(PROPS.phone.position); SND.radio(PROPS.phone.position.clone().setY(1), 0.5, 0.15); const cb = S.onAnswer; S.onAnswer = null; cb && cb(); }

// ---------- tapes ----------
function tapesHeld(){ return TAPES.filter(t => hasItem('Tape ' + t.id) && !G.flags['t' + t.id]); }
function tapeObjectives(){
  const n = [1, 2, 3].filter(i => G.flags['t' + i]).length;
  setObjectives([{ text: 'Find Jesse\'s tapes and play them on the cassette player (living room): ' + n + '/3' },
    { text: 'Tape 1: living room', done: !!G.flags.t1 }, { text: 'Tape 2: bathroom', done: !!G.flags.t2 }, { text: 'Tape 3: your bed upstairs', done: !!G.flags.t3 }]);
}
function playTape(t, where){
  removeItem('Tape ' + t.id); G.flags['t' + t.id] = 1; SND.click(where); SND.thunk(where);
  S.tapeLoop = LOOPS.drone ? null : null;
  dialog(t.lines, () => { SND.click(where); if (t.id === 4) c2CheckHunt(); else afterTape(); });
  if (t.id !== 4) tapeObjectives();
}
function afterTape(){
  const n = [1, 2, 3].filter(i => G.flags['t' + i]).length;
  if (n === 1){ // footsteps, and their bedroom door opens a little
    after(2, () => { for (let i = 0; i < 6; i++) after(i * 0.7, () => SND.step('wood', new V3(11 + i * 0.4, 3.05, 4.5), 0.65)); });
    after(6.5, () => { SND.creak(D.owners.center, 0.2, 1.6); think('(Upstairs, a door creaks open.)', 3); });
  } else if (n === 2){ // the lights go out; when they come back, they are standing in the hall
    after(2, () => { G.power = false; SND.thunk(new V3(0.5, 1.5, 8.2)); SND.pop(FX.hall.pos); player.shake = 0.3; think('(The power is out.)', 2); });
    after(6.5, () => { G.power = true; flickerGroup(f => f.group === 'house', 1); hendersonsInHall(); });
  } else if (n === 3){ // the phone again
    after(3, () => { ringPhone(3, () => {
      dialog([['MRS. HENDERSON (PHONE)', "We're upstairs, sweetheart. Come and say hello.", 4], ['MRS. HENDERSON (PHONE)', 'And bring the tapes. Jesse always did talk too much.', 4.5]], () => {
        G.step = 'c2_find'; saveCheckpoint('c2find'); objective('Find the Hendersons (upstairs, their bedroom)'); after(0.8, () => think('...How does she know about the tapes?', 3));
      });
    }); G.step = 'c2_call2'; objective('The phone is ringing (hall, by the front door)'); });
  }
}
function hendersonsInHall(){
  const spots = [[7.3, 3.3], [8.3, 3.7]];
  HEN.forEach((h, i) => { humanSit(h, false); h.root.visible = true; h.root.position.set(spots[i][0], 0, spots[i][1]); h.P.head.rotation.set(0, 0, 0);
    h.root.rotation.y = Math.atan2(player.pos.x - spots[i][0], player.pos.z - spots[i][1]); });
  G.flags.hallHen = 1; S.hallHenT = 0; SND.lowSwell(0.25, 3); SND.heartbeat(0.6);
  after(0.4, () => think('(They are standing in the hall. Both of them. Smiling at you.)', 4));
}
function hendersonsBackUpstairs(){
  HEN.forEach((h, i) => { humanSit(h, true); h.root.position.set(15.05, 2.6, i ? 4.1 : 2.7); h.root.rotation.set(0, Math.PI / 2, 0); h.root.visible = true; });
  G.flags.hallHen = 2; SND.whisper(new V3(8, 1.6, 3.5), 1.2, 0.25);
}

// ---------- the combination lock (a little keypad; typing happens on your own computer) ----------
let E_CODE = null;
function openKeypad(){ if (G.state !== 'playing') return; G.state = 'keypad'; S.kp = ''; $('kpDigits').textContent = '_ _ _ _'; $('kpMsg').textContent = ''; $('keypad').hidden = false; for (const k in keys) keys[k] = false; }
function closeKeypad(){ $('keypad').hidden = true; if (G.state === 'keypad') G.state = 'playing'; }
function kpTry(code){
  if (code === CODE){ closeKeypad(); useInter(E_CODE); return true; }
  $('kpMsg').textContent = 'It does not open.'; SND.latch(D.cellarRoom.center, 0.4); S.kp = ''; setTimeout(() => { $('kpDigits').textContent = '_ _ _ _'; }, 500); return false;
}
function unlockOldRoom(){
  D.cellarRoom.locked = false; PROPS.combo.visible = false; SND.lockClick(D.cellarRoom.center); after(0.3, () => setDoor(D.cellarRoom, true, { speed: 2 }));
  markObj('code'); think('1962. The lock drops open.', 2.5);
}

// ---------- the plea at the door ----------
function hendersonsPlea(){
  G.flags.plea = 1; S.busy = true;
  const spots = [[7.55, 8.15], [8.45, 8.15]];
  HEN.forEach((h, i) => { humanSit(h, false); h.root.visible = true; h.root.position.set(spots[i][0], 3, spots[i][1]); h.root.rotation.y = Math.PI; h.P.head.rotation.set(0, 0, 0); });
  objective('Listen to them');
  dialog([['DANA', 'Please. Don\'t.', 2.5], ['ROB', 'We were seventeen. Like you. We didn\'t choose this.', 4.5], [null, null, 1.5],
    ['DANA', 'If it burns... we burn with it.', 3.5], [null, null, 2.5], ['ROB', '...Do it quickly.', 3]], () => {
      HEN.forEach(h => { h.root.visible = false; }); SND.whisper(new V3(8, 4.4, 8.2), 1.4, 0.3); G.flags.plea = 2;
      objective('Break the locks on the room (crowbar)');
      after(0.5, () => think('They are gone. The locks are still there. Three of them.', 3.5));
    });
}

// ---------- the end: they watch from the burning window ----------
function hendersonsInWindow(){
  HEN.forEach((h, i) => { humanSit(h, false); h.root.visible = true; h.root.position.set(12.6 + i * 0.8, 3, 0.55); h.root.rotation.y = Math.PI; h.P.head.rotation.set(0, 0, 0); });
  after(2.5, () => think('(In the upstairs window: Dana and Rob. Standing in the fire. They are smiling.)', 5));
}

// ---------- every frame (host) ----------
function storyUpdateE(dt){
  if (!G.flags.ch2) return;
  const p = player.pos, f = G.flags;
  if (f.hallHen === 1){ S.hallHenT = (S.hallHenT || 0) + dt; const at = new V3(7.8, 1.6, 3.5);
    if (looked('hallHenAway', !inView(at, 45, 14, false), dt, 0.4) || S.hallHenT > 10) hendersonsBackUpstairs(); }
  if (G.step === 'c2_room' && !f.plea && player.level === 1 && p.z > 3.5 && p.x > 6 && p.x < 10) hendersonsPlea();
  if (G.step === 'c2_out' && !f.henWin && !VIEW_ID){ f.henWin = 1; hendersonsInWindow(); }
  if (G.step === 'c2_end' && f.henWin === 1){ f.henWin = 2; after(0.8, () => HEN.forEach(h => { h.root.visible = false; })); }
}

// ---------- hook it in ----------
function ch2StoryInit(){
  buildCh2Story();
  // new steps slot into the chapter
  C2_STEPS.splice(0, C2_STEPS.length, 'c2_poster', 'c2_arrive', 'c2_note', 'c2_phone', 'c2_tapes', 'c2_call2', 'c2_find', 'c2_owners', 'c2_turn', 'c2_vanish', 'c2_diary', 'c2_key', 'c2_hatch', 'c2_down', 'c2_cellar', 'c2_hunt', 'c2_room', 'c2_pour', 'c2_light', 'c2_fire', 'c2_out', 'c2_end');
  addInter(PROPS.posterHit, 'Read the posters', () => showNote(`MISSING. Three posters, one on top of the other. The oldest are almost white from the sun.

JESSE BRANDT, 17. Last seen house-sitting on Alder Lane, August 2025.
SANNE DE WIT, 15. Last seen babysitting on Alder Lane, 2004.
TOM VISSER, 16. Last seen house-sitting, Alder Lane, 1987.

Under them, older staples. Older paper. Someone kept putting them up.`, 'inspect', () => { if (G.step === 'c2_poster'){ G.step = 'c2_arrive'; objective('Go inside 41 Alder Lane'); after(0.5, () => think('All of them on Alder Lane. All of them watching someone\'s house.', 4)); } }), () => G.flags.ch2);
  addInter(PROPS.phone, () => S.ringing ? 'Answer the phone' : 'An old phone', () => { if (S.ringing) answerPhone(); else think('The line is dead. Just a hiss, and very far away, breathing.', 3); }, () => G.flags.ch2);
  addInter(PROPS.deck, () => tapesHeld().length ? 'Play the tape' : 'A cassette player', () => {
    const t = tapesHeld()[0]; if (!t){ think('Empty. It needs a tape.', 2); return; } if (S.busy) return; playTape(t, PROPS.deck.position);
  }, () => G.flags.ch2 && (G.step === 'c2_tapes' || G.step === 'c2_phone') && !S.busy);
  PROPS.tapes.forEach((g, i) => addInter(g, 'Take the tape', () => { g.visible = false; addItem('Tape ' + (i + 1)); SND.pickup(); think(i < 3 ? 'A cassette. JESSE, ' + ['ONE', 'TWO', 'THREE'][i] + ' in marker on the label.' : 'The last tape. LAST, it says. Nothing else.', 3); },
    () => G.flags.ch2 && g.visible && (i < 3 ? (G.step === 'c2_tapes' || G.step === 'c2_phone') : G.step === 'c2_cellar')));
  addInter(PROPS.recorder, () => hasItem('Tape 4') ? 'Play the last tape' : 'A little tape recorder', () => { if (!hasItem('Tape 4')){ think('A recorder. The last tape should be in it. It\'s on the table.', 2.5); return; } markObj('t4'); playTape(TAPES[3], PROPS.recorder.position); }, () => G.step === 'c2_cellar' && !G.flags.t4 && !S.busy);
  // the combination lock on the old room
  const dE = inters.find(e => e.obj === D.cellarRoom.panel);
  Object.defineProperty(dE, 'local', { get: () => G.flags.ch2 && D.cellarRoom.locked });   // the keypad opens on your own screen
  D.cellarRoom.textFn = () => D.cellarRoom.locked ? 'Combination lock (4 numbers)' : (D.cellarRoom.open ? 'Close door' : 'Open door');
  D.cellarRoom.useFn = () => { if (D.cellarRoom.locked) return openKeypad(); toggleDoor(D.cellarRoom); };
  E_CODE = addInter(hitbox(0.1, 0.1, 0.1, 200, -50, 200), '', unlockOldRoom, () => G.flags.ch2 && D.cellarRoom.locked);
  addEventListener('keydown', e => {
    if (G.state !== 'keypad') return; e.preventDefault(); e.stopImmediatePropagation();
    if (/^Digit\d$/.test(e.code) || /^Numpad\d$/.test(e.code)){ if (S.kp.length < 4){ S.kp += e.code.slice(-1); SND.click(D.cellarRoom.center); $('kpDigits').textContent = (S.kp + '____').slice(0, 4).split('').join(' '); $('kpMsg').textContent = ''; if (S.kp.length === 4) setTimeout(() => kpTry(S.kp), 250); } }
    else if (e.code === 'Backspace'){ S.kp = S.kp.slice(0, -1); $('kpDigits').textContent = (S.kp + '____').slice(0, 4).split('').join(' '); }
    else if (e.code === 'Escape' || e.code === 'KeyE') closeKeypad();
  }, true);
  $('keypad').addEventListener('click', e => { if (e.target.id === 'keypad') closeKeypad(); });
  // co-op: the Hendersons' poses travel with the world
  const sn = MP.snapshot; MP.snapshot = function(){ const s = sn.call(this); s.hp = HEN.map(h => [h.seated ? 1 : 0, r3(h.P.head.rotation.y), r3(h.P.head.rotation.z)]); return s; };
  const ap = MP.applySnap; MP.applySnap = function(s){ ap.call(this, s); (s.hp || []).forEach((a, i) => { const h = HEN[i]; if (!h) return; if (!!a[0] !== !!h.seated){ const y = h.root.position.y; humanSit(h, !!a[0]); h.root.position.y = y; } h.P.head.rotation.y = a[1]; h.P.head.rotation.z = a[2]; }); };
}
function loadC2Find(){
  resetWorld(); stateC2(); Object.assign(G.flags, { c2posters: 1, c2note: true, t1: 1, t2: 1, t3: 1 }); PROPS.tapes.slice(0, 3).forEach(g => { g.visible = false; });
  setPlayer(8, 0, 2.2, Math.PI); G.step = 'c2_find'; saveCheckpoint('c2find'); objective('Find the Hendersons (upstairs, their bedroom)');
}
