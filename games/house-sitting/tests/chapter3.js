/* House Sitting, chapter 3 (Don't Look Away): plays it from start to finish. Checks that the house only changes
   while nobody is looking, that the rules have consequences, that the woods can be crossed with the thing behind you,
   and every checkpoint. */
const { boot, step, use, check, done } = require('./lib');
const errors = [];
const w = boot('Tess', errors), E = s => w.eval(s);
const until = (cond, sec = 30) => { for (let i = 0; i < sec * 10 && !E(cond); i++) step(w, 0.1); return E(cond); };
const at = (x, y, z, yaw = 'Math.PI') => { E(`setPlayer(${x}, ${y}, ${z}, ${yaw})`); step(w, 0.1); };
const look = (x, y, z) => E(`(() => { const d = new V3(${x}, ${y}, ${z}).sub(camera.position); player.yaw = Math.atan2(-d.x, -d.z); player.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); })()`);
const turnAround = () => E('player.yaw += Math.PI; player.pitch = 0');
const obj = () => E("$('objList').textContent");
const X = v => 300 + v, F = v => 520 + v;
(async () => {
  check(!E("$('bCh3').hidden"), 'the main menu has a Chapter 3 button');
  E("$('bCh3').click()"); step(w, 0.5);
  check(E("G.state") === 'cine' && E("G.flags.ch3"), 'chapter 3 starts with its own intro');
  for (let i = 0; i < 9; i++){ E("if (G.state === 'cine') nextCine()"); step(w, 0.5); } step(w, 1.5);
  check(E("G.state + ' ' + G.step") === 'playing c3_mail' && obj().includes('mailbox'), 'at the end of Blackwater Road: get the keys from the mailbox', E("G.state + ' ' + G.step"));
  check(!E("$('phBadge').hidden"), 'the phone hint is on screen (Q)');
  E("openPhone()"); check(E("G.state") === 'phone' && E("$('phTime').textContent") === '9:32 PM', 'Q holds up your phone: 9:32 PM, no messages'); E("closePhone()"); check(E("G.state") === 'playing', 'and puts it away');
  at(X(1.8), 0, -9.6);
  check(use(w, 'PROPS.c3mailbox') === 'ok' && E("hasItem('House keys')") && E("G.step") === 'c3_enter', 'the keys are in the mailbox');
  at(X(4), 0, -0.6);
  check(use(w, 'D.c3front.panel') === 'ok', 'unlock the front door'); step(w, 1.5);
  check(E("D.c3front.open"), 'the door opens');
  at(X(4), 0, 1.5); step(w, 0.3);
  check(E("G.step") === 'c3_lock' && obj().includes('Lock'), 'inside: lock the door behind you');
  at(X(4), 0, 0.8, 0); E("setDoor(D.c3front, false, { instant: true })"); step(w, 0.2);
  check(use(w, 'D.c3front.panel') === 'ok' && E("D.c3front.locked") && E("G.step") === 'c3_note', 'locked; now read the instructions');
  at(X(2.9), 0, 3.4, '-Math.PI / 2');
  check(use(w, 'PROPS.c3note') === 'ok' && E("$('noteBody').textContent").includes("If you see a door that wasn't there before"), 'the note has the six rules');
  ['front door after 10 PM', 'footsteps upstairs', 'hallway carpet changes', 'door that wasn', 'unknown number', 'calling your name'].forEach(r => check(E("$('noteBody').textContent").includes(r), 'rule: ' + r));
  E("closeNote()"); step(w, 0.5);
  check(E("G.step") === 'c3_tasks' && E("G.objectives.length") === 5, 'five chores on the list', obj());
  // the first change: subtle. It does not happen while you watch the carpet...
  at(X(4), 0, 3.5, 'Math.PI'); look(X(4), 0, 7); step(w, 4);
  check(E("G.flags.c3carpet") === 0, 'while you look at the hallway carpet, nothing happens');
  turnAround(); step(w, 3);
  check(E("G.flags.c3carpet") === 1, '...look away, and the pattern is different (circles instead of diamonds)');
  // chores
  at(X(2.8), 0, 0.6, '-Math.PI / 2'); check(use(w, 'PROPS.c3thermo') === 'ok' && E("G.flags.c3thermo") === 20 && E("G.flags.t_thermo"), 'chore: heating up to 20');
  at(X(1.4), 0, 1.5); check(use(w, 'PROPS.c3plant') === 'ok' && E("G.flags.t_plant"), 'chore: water the fern');
  at(X(1.2), 0, 1.2, '-Math.PI / 2'); look(X(1.93), 1.3, 0.9); check(use(w, 'PROPS.c3switch') === 'ok' && E("FX.c3lamp.on") && E("G.flags.t_lamp"), 'chore: the living room lamp');
  at(X(-1), 0, 2.5, 'Math.PI'); look(X(-1), 1.95, 0.1); step(w, 3);
  check(E("G.flags.c3paint") === 0, 'the painting stays the same while you look at it');
  look(X(4), 1.5, 6); step(w, 3); check(E("G.flags.c3paint") === 1 && E("FX.c3lamp.on") === false, 'look away: someone is in the painting now, and the lamp is off again');
  at(X(8), 0, 4.5, 'Math.PI'); step(w, 0.3); check(E("G.flags.t_kitchen"), 'chore: check the kitchen');
  look(X(4), 1.5, 4.5); step(w, 3); check(E("PROPS.c3chair.g.rotation.y") > 0.5, 'a kitchen chair has turned when you look back');
  at(X(4), 0, 0.8, 0); use(w, 'D.c3front.panel'); step(w, 1.5); check(E("D.c3front.open && !D.c3front.locked"), 'unlock the front door again for the parcel');
  at(X(5), 0, 0); check(use(w, 'PROPS.c3package') === 'ok' && E("hasItem('Study key')") && E("$('noteBody').textContent").includes('Polaroid'), 'the parcel: a study key, and a Polaroid of the house'); E("closeNote()"); step(w, 0.5);
  check(E("G.step") === 'c3_msg1' && E("G.checkpoint") === 'c3mid', 'all chores done (checkpoint)');
  // 10 PM
  check(until("(G.flags.c3m || []).length === 1", 8) && E("G.flags.c3m[0][1]").includes('lock the front door'), 'a text from an unknown number: did you lock the front door?');
  check(E("$('phBadge').textContent").includes('1 new'), 'the phone hint shows a new message');
  E("openPhone()"); check(E("$('phMsgs').textContent").includes('UNKNOWN NUMBER') && E("$('phTime').textContent") === '10:00 PM', 'read it on the phone (10:00 PM)');
  // the house changes while you read your phone, even with the hallway in front of you
  at(X(4), 0, 3.0, 'Math.PI'); E("G.state = 'phone'"); E("c3Change('test', { pts: () => [new V3(300 + 4, 1, 6)], wait: 0.5, apply: () => { G.flags.testChange = 1; } })"); step(w, 1.5);
  check(E("G.flags.testChange") === 1, 'reading your phone counts as looking away');
  E("closePhone()"); step(w, 0.2);
  at(X(4), 0, 0.8, 0); check(E("D.c3front.textFn()") === 'Close the front door', 'after 10 PM: the door offers to close'); use(w, 'D.c3front.panel'); step(w, 1);
  check(E("D.c3front.textFn()") === 'Lock the front door', 'and to lock'); use(w, 'D.c3front.panel'); check(E("D.c3front.locked"), 'locked');
  check(until("G.step === 'c3_knock'", 12), 'knocking at the front door');
  check(until("G.step === 'c3_ring'", 20) && E("G.flags.c3ringing"), 'then the landline: UNKNOWN');
  check(until("G.step === 'c3_steps'", 30) && !E("G.flags.c3broke5"), 'let it ring (rule five kept): footsteps upstairs', E('G.step'));
  // rule two: go up anyway, and the stairs bring you back down
  at(X(5.5), 1.5, 2.0, 'Math.PI'); E("player.pos.y = player.feetY = 3; player.level = 1; player.pos.z = 3.4"); step(w, 0.3);
  check(E("player.level") === 0 && E("player.pos.z") < 1.2 && E("G.flags.c3broke2"), 'go up during the footsteps: you are at the bottom again (rule two)');
  check(until("G.step === 'c3_up'", 32) && obj().includes('upstairs'), 'the footsteps stop: check upstairs');
  at(X(0), 3, 3.5, '-Math.PI / 2'); step(w, 0.3);
  check(E("G.step") === 'c3_up2' && E("G.flags.c3ward"), "Ruth's bedroom: the wardrobe is open");
  at(X(1.3), 3, 4.4, 'Math.PI'); look(X(1.3), 3.3, 5.5);
  check(use(w, 'PROPS.c3box') === 'ok' && E("$('noteBody').textContent").includes('The house-sitter in each picture is the owner in the next one'), 'the photo box: every sitter became the owner'); E("closeNote()"); step(w, 0.5);
  check(E("G.step") === 'c3_hall', 'go back downstairs');
  at(X(4), 0, 2.5, 'Math.PI'); look(X(4), 1.2, 8); step(w, 3);
  check(E("G.flags.c3len") === 0 || E("G.flags.c3len") === 2, 'downstairs, looking down the hallway: it holds still', E("G.flags.c3len"));
  turnAround(); step(w, 3);
  check(E("G.flags.c3len") >= 3 && E("D.c3bath.open") && E("G.step") === 'c3_study', 'turn round: the hallway is longer, the bathroom door is open, the fern is in the hall', E("G.flags.c3len + ' ' + G.step"));
  check(E("PROPS.c3plant.position.z") > 11, 'the fern stands in the new part of the hallway');
  // walking to the study: every look back, the hallway grows
  const len0 = E("G.flags.c3len");
  for (let k = 0; k < 6; k++){ at(X(4), 0, E("hallEnd()") - 6, 'Math.PI'); turnAround(); step(w, 1.2); }
  check(E("G.flags.c3len") >= 7 && E("G.flags.c3len") > len0, 'every time you look back, the hallway is longer', E("G.flags.c3len"));
  check(E("G.flags.c3carpet") === 2 && E("G.flags.c3fold"), 'the carpet is green now, and rumpled');
  // rule three: fixing the carpet makes it worse
  const len1 = E("G.flags.c3len");
  at(X(4.3), 0, 8.4, 'Math.PI'); check(use(w, 'PROPS.c3fold') === 'ok' && E("G.flags.c3broke3"), 'straighten the carpet (rule three broken)');
  turnAround(); step(w, 1.5); check(E("G.flags.c3len") === len1 + 4, 'the hallway grows by eight metres', E("G.flags.c3len"));
  const end = E("hallEnd()");
  check(E("C3.seg[0].g.visible") && E(`C3.seg[${len1 + 3}].g.visible`) && !E(`C3.seg[${len1 + 4}].g.visible`), 'the hallway segments match its length');
  check(E("Math.abs(D.c3study.collider.minZ - " + end + ")") < 0.2, 'the study door moved to the far end');
  at(X(4), 0, end - 1, 'Math.PI'); check(use(w, 'D.c3study.panel') === 'ok', 'unlock the study'); step(w, 1.5);
  check(E("D.c3study.open") && E("G.step") === 'c3_letter', 'the study is open');
  at(X(3.8), 0, end + 2.6, 'Math.PI'); look(X(3.8), 0.76, end + 3.3);
  check(use(w, 'C3.letter') === 'ok' && E("$('noteBody').textContent").includes('It was in my handwriting'), "Ruth's letter: the ad was in her handwriting");
  const zIn = E("player.pos.z"); E("closeNote()"); step(w, 1);
  check(E("G.flags.c3len") >= 12 && E("G.flags.c3dark") && E("G.step") === 'c3_dark' && E("G.checkpoint") === 'c3dark', 'while you read, the hallway grew and the power went out (checkpoint)', E("G.flags.c3len"));
  check(E("player.pos.z - hallEnd()") > 2 && E("player.pos.z - hallEnd()") < 3, 'you are still inside the study, wherever it is now', [zIn, E("player.pos.z"), E("hallEnd()")]);
  check(!E("C3.seg[2].lamp.on") && !E("FX.c3hallFixed.on"), 'the hallway is dark');
  // walk back to the fuse box: the figure at the end of the hall
  at(X(4), 0, E("hallEnd()") - 12, 0); step(w, 1.6);
  check(E("C3ENT.visible") && E("C3ENT.position.z") > E("hallEnd()") - 2, 'with your back turned, something stands at the end of the hall');
  turnAround(); look(X(4), 2.2, E("hallEnd()") - 1.4); step(w, 1);
  check(E("G.flags.w_endFigure"), 'you turn round and see it');
  look(X(4), 1.5, 5); step(w, 1.5); check(!E("C3ENT.visible"), 'look away: gone');
  at(X(6.2), 0, 8.4, '-Math.PI / 2'); look(X(6.9), 1.5, 8.6);
  check(use(w, 'PROPS.c3fuse') === 'ok' && !E("G.flags.c3dark"), 'reset the fuses: light');
  check(until("G.flags.c3tapOn", 6) && obj().includes('Water'), 'water is running somewhere');
  at(X(2.4), 0, 8.9, 'Math.PI'); look(X(2.4), 1.1, 9.6); check(use(w, 'PROPS.c3tap') === 'ok', 'turn off the bathroom tap');
  check(obj().includes('mirror'), 'look in the mirror');
  look(X(2.4), 1.7, 9.95); step(w, 1.5);
  check(E("C3ENT.visible") && E("C3ENT.position.z") > 10.5, 'in the mirror: the hood, behind you');
  look(X(2.4), 1.5, 6); step(w, 3);
  check(!E("C3ENT.visible") && E("G.step") === 'c3_leave' && E("!D.c3front.locked"), 'look away: gone. Now leave the house');
  // you think you can leave
  at(X(4), 0, 0.6, 0); E("setDoor(D.c3front, true, { instant: true })"); step(w, 0.3); at(X(4), 0, -0.6, 0); step(w, 0.2);
  check(E("player.pos.z") > 20 && E("G.flags.c3loopN") === 1, 'out the front door... and back in the hallway', E("player.pos.z"));
  check(until("G.step === 'c3_newdoor'", 12), 'find another way out');
  at(X(4), 0, 26, 'Math.PI'); step(w, 1.5);
  check(E("G.flags.c3nd") === 1, 'a door appears in the hallway wall while you are not looking at it');
  at(X(4), 0, E("C3.ndZ"), 'Math.PI / 2'); look(X(3.05), 1.2, E("C3.ndZ")); step(w, 0.6);
  check(E("G.flags.w_newDoor"), 'there is a door that wasn\'t there before');
  check(use(w, 'C3.ndHit') === 'ok' && E("G.flags.c3nd") === 2 && E("G.flags.c3broke4"), 'open it straight away: bricks (rule four)');
  step(w, 2); look(X(4), 1.5, 5); step(w, 2); check(E("G.flags.c3nd") === 0, 'and when you look away it is gone again');
  check(until("G.flags.c3nd === 1", 15), 'it comes back');
  at(X(4), 0, E("C3.ndZ"), 'Math.PI / 2'); look(X(3.05), 1.2, E("C3.ndZ")); step(w, 0.5); step(w, 8.5);
  check(obj().includes('Open the door'), 'wait, then: open the door');
  check(use(w, 'C3.ndHit') === 'ok' && E("G.flags.c3nd") === 3, 'the door opens onto cold air and trees');
  at(X(3.3), 0, E("C3.ndZ"), 'Math.PI / 2'); E("keys.KeyW = true"); step(w, 1.2); E("keys.KeyW = false"); step(w, 0.3);
  check(E("player.pos.x") > 500 && E("G.step") === 'c3_forest' && E("G.checkpoint") === 'c3forest', 'through it: the woods (checkpoint)', E("player.pos.x"));
  check(E("!G.flags.c3doorLoop"), 'the front-door loop is over');
  // the woods
  E("player.yaw = 0"); step(w, 2); check(E("G.flags.c3fdoorGone"), 'the door behind you is gone when you look back');
  at(F(1), 0, 30, 'Math.PI'); look(F(1.3), 1.8, 32); step(w, 2);
  look(F(1), 1.6, 10); step(w, 1.2); look(F(1.3), 1.8, 32); step(w, 0.6);
  check(E("G.flags.c3sign2") && E("C3.signArm2.visible"), 'look at the sign, then away: it has a second arm now');
  at(F(-10), 0, 42, 'Math.PI'); step(w, 0.3); check(E("Math.hypot(player.pos.x - 520.4, player.pos.z - 31.2)") < 0.5, 'the other path leads back to the sign');
  at(F(9), 0, 47.5, 'Math.PI'); step(w, 0.3);
  check(E("G.step") === 'c3_cabin' && E("G.objectives.length") === 3, 'a cabin in the woods: search it');
  at(F(9), 0, 50.6, 'Math.PI'); look(F(9), 1.45, 51.9); check(use(w, 'C3.polHit') === 'ok' && E("$('noteBody').textContent").includes('wearing your jacket'), 'Polaroids of the house for fifty years. The last one is you'); E("closeNote()");
  at(F(9), 0, 48.7, 'Math.PI'); look(F(9), 0.9, 49.6); check(use(w, 'C3.dollhouse') === 'ok', 'a model of the house'); E("closeNote()");
  at(F(10.9), 0, 50.6, '-Math.PI / 2'); look(F(11.55), 1.07, 50.6); check(use(w, 'C3.machine') === 'ok', "play Ruth's message");
  check(until("G.step === 'c3_stalk'", 70) && E("G.checkpoint") === 'c3stalk' && E("C3ENT.visible"), "Ruth: follow the red reflectors (checkpoint). It is behind the cabin");
  // it only moves while nobody is looking
  at(F(19), 0, 44, '-Math.PI / 2'); E("C3ENT.position.set(520 + 11, 0, 44.5)"); look(F(11), 2.3, 44.5); const p0 = E("C3ENT.position.x"); step(w, 2);
  check(Math.abs(E("C3ENT.position.x") - p0) < 0.3, 'while you look at it, it does not move', E("C3ENT.position.x") - p0);
  look(F(30), 1.5, 44); step(w, 1); check(E("C3ENT.position.x") > p0 + 2, 'look away and it comes closer', E("C3ENT.position.x - " + p0));
  look(F(1), 2.3, 44); step(w, 0.2); E("C3ENT.position.set(520 + 16, 0, 44)");
  E("G.state = 'phone'"); step(w, 3); check(E("G.state") === 'dead', 'stand there reading your phone, and it gets you');
  // from the checkpoint: the route to the road, looking back when needed (a bot)
  E("$('bDeadRetry').click()"); step(w, 1);
  check(E("G.step") === 'c3_stalk' && E("G.state") === 'playing', 'retry from the reflectors');
  const route = [[13.5, 44.3], [15, 46.5], [19, 44], [25, 45], [31, 49], [37, 50], [43, 47], [49, 45], [55, 47], [61, 50], [67, 48], [72.5, 48]];
  const keys = E('keys'); let i = 0, t = 0, lookT = 0, answered = false, heard = 0;
  while (t < 120 && E("G.step") === 'c3_stalk' && E("G.state") === 'playing'){
    t += 0.05; E('tick(lastT + 50)');
    if (E("G.c3answerUntil > G.time")) heard = Math.max(heard, E("G.flags.c3call"));
    const ent = E("[C3ENT.position.x, C3ENT.position.z]"), p = E("[player.pos.x, player.pos.z]"), d = Math.hypot(ent[0] - p[0], ent[1] - p[1]);
    // close behind you: face it and back away along the route; otherwise run, glancing back now and then
    if (d < 6){ keys.KeyW = false; keys.KeyS = true; keys.ShiftLeft = false; look(ent[0], 2.3, ent[1]); E('player.pitch = 0'); const wp = route[i]; if (wp && Math.hypot(F(wp[0]) - p[0], wp[1] - p[1]) < 1.2) i++; continue; }
    keys.KeyS = false;
    if (lookT > 0){ lookT -= 0.05; keys.KeyW = false; look(ent[0], 2.3, ent[1]); continue; }
    if (Math.random() < 0.02) lookT = 0.4;
    const wp = route[i]; if (!wp) break; const dx = F(wp[0]) - p[0], dz = wp[1] - p[1];
    if (Math.hypot(dx, dz) < 0.6){ i++; continue; }
    E(`player.yaw = ${Math.atan2(-dx, -dz)}; player.pitch = 0`); keys.KeyW = true; keys.ShiftLeft = E("player.stamina > 30");
  }
  keys.KeyW = keys.KeyS = keys.ShiftLeft = false;
  check(E("G.step") === 'c3_road' && E("G.state") === 'playing', 'the bot follows the reflectors to the road, looking back when it gets close', [E("G.step"), E("G.state"), i, t.toFixed(1)]);
  check(heard >= 2 && !E("G.flags.c3broke6"), 'someone calls your name from the woods, twice; you do not answer');
  check(E("G.flags.c3reflGone"), 'the first reflectors are gone behind you');
  step(w, 2); const ent = E("[C3ENT.position.x, C3ENT.position.z]"); look(ent[0], 2.3, ent[1]); step(w, 1);
  check(E("G.flags.w_roadEnt"), 'at the road it is right behind you');
  check(until("G.step === 'c3_home'", 12) && E("G.flags.c3m.slice(-1)[0][1]") === "It's yours now.", "Ruth: Thank you for watching the house. It's yours now.");
  E("openPhone()"); step(w, 0.5); E("closePhone()"); step(w, 2.5);
  check(E("Math.abs(player.pos.x - 304) < 0.5 && player.pos.z < -1"), 'you look up from the phone: the front door of the house', E("[player.pos.x, player.pos.z]"));
  check(E("G.step") === 'c3_inside' && E("D.c3front.open") && E("G.flags.c3paint") === 4 && E("G.flags.c3clock") === 41, 'the porch light is on, the clock says 9:41, the painting is of the hallway');
  at(X(3), 0, 3.0, '-Math.PI / 2'); look(X(2.45), 0.86, 3.4); check(use(w, 'PROPS.c3note') === 'ok' && E("$('noteBody').textContent").includes('- Tess'), 'the note on the hall table is signed with your name'); E("closeNote()");
  at(X(4), 0, 2.0, 0); step(w, 0.5);
  check(until("G.step === 'c3_door'", 10), 'headlights, then knocking');
  at(X(4), 0, 0.8, 0); check(use(w, 'D.c3front.panel') === 'ok' && E("VISITOR.root.visible"), 'open the door: a visitor');
  check(until("G.state === 'ending'", 30), 'Sam: "You must be the owner." You: "There are only a few rules."');
  step(w, 18);
  check(E("$('end3').textContent").includes("LOOK AWAY") && E("$('end2').textContent").includes('THREE OF THE SIX'), 'the ending: DON\'T LOOK AWAY (and you broke three rules)', E("$('end2').textContent"));
  check((w.__noObjective || 0) < 20, 'there was always something on the to-do list', w.__noObjAt);
  // the checkpoints load
  for (const cp of ['c3', 'c3mid', 'c3dark', 'c3forest', 'c3stalk']){ E(`hideScreens(); loadCheckpoint('${cp}')`); step(w, 2); check(E("G.flags.ch3") && E("G.state") !== 'dead', 'checkpoint ' + cp + ' loads', E("G.step")); }
  // chapter 1 still starts normally afterwards
  E("hideScreens(); loadCheckpoint('start')"); step(w, 1); check(!E("G.flags.ch3") && E("$('phBadge').hidden") && E("G.flashDrain") === 0.9, 'chapter 1 afterwards: no phone, normal flashlight');
  done(errors, 'Chapter 3');
})();
