/* House Sitting, chapter 2 (The Room): plays it from start to finish, survives both chases, and checks every checkpoint. */
const { boot, step, use, sleep, check, done, runRoute } = require('./lib');
const errors = [];
const w = boot('Ch2', errors), E = s => w.eval(s);
const until = (cond, sec = 30) => { for (let i = 0; i < sec * 10 && !E(cond); i++) step(w, 0.1); return E(cond); };
(async () => {
  check(!E("$('bCh2').hidden"), 'the main menu has a Chapter 2 button');
  E("$('bCh2').click()"); step(w, 0.5);
  check(E("G.state") === 'cine' && E("G.flags.ch2"), 'chapter 2 starts with its own intro');
  for (let i = 0; i < 9; i++){ E("if (G.state === 'cine') nextCine()"); step(w, 0.5); } step(w, 1.5);
  check(E("G.state + ' ' + G.step") === 'playing c2_poster' && E("$('objList').textContent").includes('posters'), 'standing in the street again: read the posters', E("G.state + ' ' + G.step"));
  check(use(w, 'PROPS.posterHit') === 'ok' && E("$('noteBody').textContent").includes('JESSE BRANDT'), 'missing posters: Jesse Brandt, Sanne de Wit, Tom Visser'); E("closeNote()"); step(w, 0.5);
  check(E("G.step") === 'c2_arrive', 'then: go inside');
  check(E("!PROPS.hallShelfCol.on || PROPS.hallShelf.visible") && E("W.kitchenWin.glass.visible"), 'the house is back to normal (shelf, window)');
  check(E("HEN[0].root.visible && HEN[1].root.visible && HEN[0].seated"), 'the Hendersons are home, sitting upstairs');
  E("setPlayer(8, 0, 2, Math.PI)"); step(w, 0.5);
  check(E("G.step") === 'c2_note', 'inside: read the note');
  check(use(w, 'PROPS.note') === 'ok' && E("$('noteBody').textContent").includes('feed the room'), 'the new note: feed the room'); E("closeNote()"); step(w, 1);
  check(E("G.step") === 'c2_phone', 'after the note: wait for the phone');
  check(until("S.ringing", 12) && E("$('objList').textContent").includes('phone'), 'the phone rings in the hall');
  E("setPlayer(9.7, 0, 1.4, Math.PI)"); check(use(w, 'PROPS.phone') === 'ok' && !E("S.ringing"), 'answer it');
  check(until("G.step === 'c2_tapes'", 25) && E("$('objList').textContent").includes('0/3'), 'Jesse on the phone: find my tapes (0/3)');
  // three tapes, played one by one, each followed by something
  const tapeAt = [[1.0, 0, 2.95], [3.3, 0, 9.6], [1.4, 3, 3.6]];
  for (let i = 0; i < 3; i++){
    E(`setPlayer(${tapeAt[i].join(',')}, 0)`); check(use(w, `PROPS.tapes[${i}]`) === 'ok' && E(`hasItem('Tape ${i + 1}')`), 'take tape ' + (i + 1));
    E("setPlayer(3.3, 0, 5.0, Math.PI)"); check(use(w, 'PROPS.deck') === 'ok' && E("S.busy"), 'play tape ' + (i + 1));
    check(until("!S.busy", 45), 'tape ' + (i + 1) + ' plays to the end');
    if (i === 1){ check(until("G.flags.hallHen === 1", 10), 'after tape 2: the power goes out, then they stand in the hall'); E("player.yaw = 0"); step(w, 1); check(E("G.flags.hallHen") === 2, 'look away: they are gone (back upstairs)'); }
    else step(w, 1);
  }
  check(until("S.ringing", 10) && E("G.step") === 'c2_call2', 'after tape 3: the phone again');
  E("setPlayer(9.7, 0, 1.4, Math.PI)"); use(w, 'PROPS.phone');
  check(until("G.step === 'c2_find'", 20) && E("G.checkpoint") === 'c2find', 'Mrs. Henderson: come upstairs (checkpoint)');
  E("setPlayer(11, 3, 3.5, -Math.PI / 2)"); step(w, 0.5);
  check(E("G.step") === 'c2_owners', 'in their bedroom');
  check(use(w, 'PROPS.henHit') === 'ok', 'talk to them');
  check(until("G.step === 'c2_vanish'", 20) && E("HEN[0].P.head.rotation.y") < -2.5, 'their heads turn all the way round', E("HEN[0].P.head.rotation.y"));
  E("player.yaw = Math.PI / 2"); step(w, 1);
  check(E("G.step") === 'c2_diary' && !E("HEN[0].root.visible"), 'look away, look back: they are gone');
  check(use(w, 'PROPS.diary') === 'ok' && E("$('noteBody').textContent").includes('Burn the room'), 'Dana\'s diary'); E("closeNote()"); step(w, 1);
  check(E("G.step") === 'c2_key', 'find the cellar key');
  E("setPlayer(9.3, 0, -1.4, 0)"); check(use(w, 'PROPS.flowerpot') === 'ok' && E("hasItem('Cellar key')"), 'the cellar key under the flowerpot'); step(w, 1);
  E("setPlayer(2.3, 0, 9.6, 0)"); check(use(w, 'PROPS.c2hatch') === 'ok' && E("G.step") === 'c2_down' && E("PROPS.c2hole.visible"), 'unlock the hatch in the laundry room');
  check(use(w, 'PROPS.c2hatch') === 'ok', 'climb down'); step(w, 0.5);
  check(E("G.step") === 'c2_cellar' && E("player.pos.x") > 60 && E("G.checkpoint") === 'c2cellar', 'in the cellar (checkpoint)');
  check(E("inHouseRect(player.pos.x, player.pos.z)") === 'cellar' && E("surfaceAt(player.pos.x, player.pos.z, 0)") === 'concrete', 'the cellar is indoors, concrete underfoot');
  use(w, 'PROPS.crowbar'); use(w, 'PROPS.gascan');
  check(E("D.cellarRoom.locked && !D.cellarRoom.open"), 'the old room is locked with a combination lock');
  E("setPlayer(69.3, 0, 2.6, -Math.PI / 2)"); check(use(w, 'D.cellarRoom.panel') === 'ok' && E("G.state") === 'keypad' && !E("$('keypad').hidden"), 'the keypad opens');
  check(!E("kpTry('2025')") && E("D.cellarRoom.locked"), 'the wrong year does not open it');
  check(E("kpTry('1962')") && E("G.state") === 'playing', 'the year it started (1962)'); step(w, 1);
  check(!E("D.cellarRoom.locked") && E("D.cellarRoom.open"), 'the lock drops, the door opens');
  E("setPlayer(73.1, 0, 2.95, 0)"); check(use(w, 'PROPS.tapes[3]') === 'ok', 'the last tape'); check(use(w, 'PROPS.lighter') === 'ok', 'the lighter');
  check(use(w, 'PROPS.recorder') === 'ok', 'play the last tape'); check(until("!S.busy", 60) && E("G.step") === 'c2_cellar', 'the truth about Dana and Rob (still safe)');
  check(use(w, 'PROPS.ledger') === 'ok' && E("$('noteBody').textContent").includes('Dana Albers'), 'the ledger: Dana and Rob were the first, in 1962'); E("closeNote()");
  check(until("G.step === 'c2_hunt'", 10), 'everything found and known: it comes down');
  let r = runRoute(w, 'cellar', 1.0); check(r.ok && E("G.step") === 'c2_room', 'out through the coal chute before it catches you', r);
  check(!E("MON.m.root.visible") && E("player.pos.z") > 12 && E("G.checkpoint") === 'c2room', 'in the garden, it stays under the house (checkpoint)');
  E("setPlayer(8, 3, 6.6, Math.PI)"); step(w, 0.3);
  check(E("G.flags.plea") === 1 && E("HEN[0].root.visible && !HEN[0].seated"), 'upstairs, they stand in front of the door and beg');
  check(E("D.locked.textFn()") === 'Locked', 'you cannot pry while they are talking');
  check(until("G.flags.plea === 2", 30) && !E("HEN[0].root.visible"), 'then they are gone');
  E("setPlayer(8, 3, 7.6, Math.PI)"); step(w, 0.3);
  for (let i = 0; i < 3; i++){ check(use(w, 'D.locked.panel') === 'ok', 'pry lock ' + (i + 1)); step(w, 0.3); }
  step(w, 1); check(E("G.step") === 'c2_pour' && !E("D.locked.locked") && E("D.locked.open"), 'the locks are off, the door swings open');
  for (let i = 0; i < 3; i++){ check(use(w, `PROPS.gasSpots[${i}]`) === 'ok', 'pour gasoline ' + (i + 1)); step(w, 0.3); }
  check(E("G.step") === 'c2_light' && E("G.checkpoint") === 'c2fire', 'all poured: light it (checkpoint)');
  E("setPlayer(8, 3, 9.6, Math.PI)"); use(w, 'PROPS.lightHit'); check(E("G.step") === 'c2_light', 'you cannot light it from inside the room');
  E("setPlayer(8, 3, 7.7, Math.PI)"); check(use(w, 'PROPS.lightHit') === 'ok' && E("G.step") === 'c2_fire' && E("PROPS.fireRoom.visible"), 'it goes up');
  r = runRoute(w, 'fire', 1.0, 40, false); check(r.ok && E("G.step") === 'c2_out', 'down the stairs and out the front door', r);
  check(E("MON.burning && MON.mode === 'watch'") && E("Math.abs(MON.pos.z - 0.9) < 0.2"), 'it stands burning in the doorway, it cannot follow');
  step(w, 0.2); check(E("HEN[0].root.visible && HEN[0].root.position.y === 3"), 'the Hendersons stand in the burning upstairs window');
  check(until("G.step === 'c2_end'", 15), 'the house comes down', E("[G.step, G.state, S.c2outT, player.pos.z, MON.mode].join(' ')"));
  check(until("G.state === 'ending'", 15) && E("FX.nPorch.on"), 'across the street, a porch light switches on; the end');
  await sleep(5000);
  check(E("$('end1').textContent").includes('BURNED') && E("$('end2').textContent").includes('2026') && E("$('end3').textContent").includes('ROOM'), 'chapter 2 ending text');
  check(!w.__noObjective, 'there is always an objective in the top left while playing', w.__noObjective || 0);
  // checkpoints load, and the chases can be survived from them
  for (const c of ['c2', 'c2find', 'c2cellar', 'c2room', 'c2fire']){ E(`toMenu(); loadCheckpoint('${c}')`); step(w, 1); check(['playing', 'cine'].includes(E("G.state")) && E("G.flags.ch2"), 'checkpoint ' + c + ' loads'); }
  E("toMenu(); loadCheckpoint('c2fire')"); step(w, 0.5); use(w, 'PROPS.lightHit');
  r = runRoute(w, 'fire', 1.0, 40, false); check(r.ok, 'from the fire checkpoint you can get out', r);
  const cellarReady = "useInter(E_CODE); G.flags.t4 = 1; G.flags.c2ledger = true; PROPS.tapes[3].visible = false";
  E("toMenu(); loadCheckpoint('c2cellar')"); step(w, 0.5); use(w, 'PROPS.crowbar'); use(w, 'PROPS.gascan'); E(cellarReady); E("setPlayer(73.1, 0, 2.95, 0)"); use(w, 'PROPS.lighter');
  r = runRoute(w, 'cellar', 2.0); check(r.ok, 'the cellar chase can be survived even when slow (2 s per press)', r);
  // and it does catch you if you stand still
  E("toMenu(); loadCheckpoint('c2cellar')"); step(w, 0.5); use(w, 'PROPS.crowbar'); use(w, 'PROPS.gascan'); E(cellarReady); use(w, 'PROPS.lighter');
  until("MON.mode === 'chase'", 10); E("setPlayer(MON.pos.x + 0.3, 0, MON.pos.z + 0.3, 0)"); step(w, 0.5); await sleep(1100);
  check(E("G.state") === 'dead', 'standing still in the cellar gets you caught');
  done(errors, 'House Sitting chapter 2 test');
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
