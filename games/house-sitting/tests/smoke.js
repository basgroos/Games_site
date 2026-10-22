/* House Sitting smoke test: plays the whole story alone, from the flowerpot to the ending, plus game over and every checkpoint. */
const { boot, step, use, sleep, check, done, file, runRoute } = require('./lib');
const fs = require('fs');
const html = fs.readFileSync(file, 'utf8');
check(html.includes('cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'), 'Three.js r128 is loaded from cdnjs');
check(html.includes('BUT YOU NEVER FOUND OUT WHO WAS HOUSE-SITTING FOR WHOM.'), 'ending text is present');
const errors = [];
const w = boot('Solo', errors), E = s => w.eval(s);
(async () => {
  check(E("G.state") === 'menu', 'boots to the main menu');
  check(E("!$('bHome').hidden && $('bHome').getAttribute('href') === '../../'"), 'menu links back to Bas Games');
  check(E("MP.available() === !!(HW_BUILD.online && HW_BUILD.online.url)") && E("$('bMp').hidden") === !E("MP.available()"), '"Play together" shows only when online is set up');
  E("$('bNew').click()"); step(w, 0.5);
  for (let i = 0; i < 8; i++){ E("nextCine()"); step(w, 0.5); }
  step(w, 1);
  check(E("G.state + '/' + G.step") === 'playing/arrive', 'intro done, standing in the street', E("G.state + '/' + G.step"));
  check(use(w, 'PROPS.flowerpot') === 'ok' && E("hasItem('House key')"), 'key under the flowerpot');
  check(use(w, 'D.front.panel') === 'ok', 'unlock the front door'); step(w, 1);
  E("setPlayer(8,0,2,Math.PI)"); step(w, 0.5);
  check(E("G.step") === 'note', 'walking in asks you to read the note');
  check(use(w, 'PROPS.note') === 'ok' && !E("$('note').hidden"), 'the note opens'); E("closeNote()"); step(w, 2);
  check(E("G.step") === 'trash', 'chore 1: trash');
  use(w, 'PROPS.trashBag'); step(w, 3);
  E("setPlayer(12.5,0,11,0)"); E("D.back.useFn()"); step(w, 1);
  E("setPlayer(2.1,0,14.2,0)"); step(w, 0.3);
  check(use(w, "inters.find(e => typeof e.text === 'function' && e.text().includes('bin')).obj") === 'ok', 'bag into the bin'); step(w, 2);
  E("player.yaw = Math.PI"); step(w, 3); step(w, 4);
  check(E("G.step") === 'checkKitchen', 'the bang from the kitchen');
  E("setPlayer(11,0,7,Math.PI*0.75)"); step(w, 1);
  check(E("G.step") === 'dishes', 'the moved chair');
  for (let i = 0; i < 4; i++){ E("washPlate()"); step(w, 1.3); }
  E("setPlayer(8,0,11,0); player.yaw = Math.PI; player.pitch = 0.2"); step(w, 1.5);
  check(E("G.flags.refl") === 'seen', 'the reflection in the window');
  E("player.yaw = 0"); step(w, 1.5); step(w, 14);
  check(E("G.step") === 'laundry', 'footsteps upstairs, then laundry');
  use(w, 'PROPS.basket'); use(w, 'PROPS.washer'); step(w, 11); use(w, 'PROPS.washer'); step(w, 1);
  check(use(w, 'PROPS.garment') === 'ok', 'the black cloth'); E("closeNote()"); step(w, 9);
  check(E("G.step + ' ' + G.power") === 'flashlight false', 'the power goes out');
  use(w, 'PROPS.drawer'); step(w, 1);
  check(E("player.hasFlash"), 'flashlight found');
  use(w, 'PROPS.fuse'); step(w, 11);
  check(E("G.step") === 'lockup', 'power back, lock up');
  E("setPlayer(8,0,1.5,0); setDoor(D.front,false,{instant:true}); D.front.useFn()");
  for (const n of ['livFront', 'dinFront', 'kitchenWin']) use(w, `W.${n}.glass`);
  E("setPlayer(12.5,0,11,Math.PI); player.pitch = 0; setDoor(D.back,false,{instant:true}); D.back.useFn()"); step(w, 2.5);
  check(E("G.flags.garden") === 'close', 'the figure at the glass door');
  E("player.yaw = 0"); step(w, 1.5); E("player.yaw = Math.PI"); step(w, 5);
  check(E("G.step") === 'bed', 'everything locked: go to bed');
  E("setPlayer(2.5,3,3.6,-Math.PI/2); FX.bedLamp.on = false; FX.bedroom.on = false");
  check(use(w, "inters.find(e => typeof e.text === 'function' && e.text().includes('sleep')).obj") === 'ok', 'go to sleep');
  for (let i = 0; i < 16; i++){ step(w, 2); E("if (G.state === 'cine') nextCine()"); }
  step(w, 5);
  check(E("G.step + ' ' + G.checkpoint") === 'investigate night', 'the bang wakes you');
  E("setPlayer(8,3,7.5,Math.PI)"); step(w, 3); E("setPlayer(8,3,9.6,Math.PI)"); step(w, 1);
  check(E("G.step") === 'room', 'inside the open room');
  check(use(w, "inters.filter(e => e.text === 'Read the note').pop().obj") === 'ok', 'the note in the room'); E("closeNote()"); step(w, 3);
  E("player.yaw = 0"); for (let i = 0; i < 60 && E("G.step") !== 'chase1'; i++) step(w, 0.1);
  check(E("G.step + ' ' + MON.mode") === 'chase1 chase', 'the first chase starts', E("G.step + ' ' + MON.mode + ' ' + G.state"));
  E("setPlayer(8,0,11,0); breakWindow()"); step(w, 2);
  check(E("G.step") === 'escaped', 'out through the kitchen window');
  E("setPlayer(8,0,-10,Math.PI)"); step(w, 1);
  for (let i = 0; i < 12; i++){ step(w, 2); E("if (G.state === 'cine') nextCine()"); }
  check(E("G.step + ' ' + G.state") === 'police playing', 'the police come along');
  step(w, 55);
  check(E("G.step") === 'policeGo', 'screams: go inside');
  E("setPlayer(8,0,1.5,0)"); step(w, 1);
  check(E("G.step") === 'search', 'the dead officers');
  use(w, "inters.find(e => e.text === 'Check on the officer').obj"); E("G.flags.o2 = true; afterOfficers()"); step(w, 6);
  E("setPlayer(3,0,3,0)"); step(w, 0.3); E("setPlayer(10,0,9,0)"); step(w, 0.3); E("setPlayer(7.5,3,7,0)"); step(w, 0.5); step(w, 10);
  check(E("G.step") === 'called', 'the neighbor calls you over');
  step(w, 8); E("setPlayer(4,0,-21,0)"); step(w, 5); E("setPlayer(4,0,-25.5,0)"); step(w, 1);
  check(E("G.step") === 'n_talk0', 'inside the neighbor\'s house');
  check(!E("MON.m.root.visible") && E("MON.mode") === 'off', 'no monster anywhere while you are at the neighbor\'s');
  for (let i = 0; i < 100 && !E("NEIGH.seated"); i++) step(w, 0.1);
  check(E("NEIGH.seated && Math.abs(NEIGH.root.position.x - 4.5) < 0.1"), 'the neighbor sits down on the couch');
  check(use(w, "inters.find(e => e.text === 'Sit down').obj") === 'ok' && E("!!player.seated"), 'you sit down next to him');
  step(w, 0.2); check(E("camera.position.y") < 1.3, 'seated: the camera is lower', E("camera.position.y"));
  for (let i = 0; i < 200 && E("G.step") !== 'n_drink'; i++) step(w, 0.1);
  check(E("G.step") === 'n_drink' && E("!!player.seated"), 'he starts chatting and offers water (you are still sitting)');
  E("drinkWater()"); let maxMon = false;
  for (let i = 0; i < 900 && E("G.step") !== 'n_ask'; i++){ step(w, 0.1); maxMon = maxMon || E("MON.m.root.visible"); }
  check(E("G.step") === 'n_ask' && !maxMon, 'a long quiet chat on the couch, still no monster');
  E("keys.KeyW = true"); step(w, 0.2); E("keys.KeyW = false");
  check(!E("player.seated") && E("player.pos.x") < 4.1, 'W gets you up off the couch', E("player.pos.x"));
  E("sitDown(SEATS[0]); talkNeighbor()"); for (let i = 0; i < 300 && E("G.step") !== 'chase2'; i++) step(w, 0.1);
  check(E("G.step + ' ' + MON.mode") === 'chase2 chase', 'the twist and the final chase');
  check(!E("player.seated") && !E("NEIGH.seated"), 'he got up, and so did you');
  E("loadCheckpoint('chase2'); setPlayer(13,0,-31,0)"); step(w, 2); E("MON.mode = 'watch'"); // let it watch while we open the way out
  check(E("G.state + ' ' + G.step") === 'playing chase2', 'checkpoint: final chase', E("G.state + ' ' + G.step"));
  check(use(w, 'PROPS.nKeyHit') === 'ok', 'grab the back door key');
  for (let i = 0; i < 3; i++){ use(w, 'PROPS.pantry'); step(w, 0.5); }
  E("D.nBack.useFn()"); for (let i = 0; i < 3; i++) E("D.nGate.useFn()");
  check(E("!D.nBack.locked && D.nGate.open"), 'back door and gate open');
  E("MON.mode = 'off'; setPlayer(8,0,-47.5,0)"); step(w, 1);
  check(E("G.step") === 'end1', 'out on the back street');
  E("player.yaw = Math.PI/2"); step(w, 2); E("setPlayer(-13,0,-50,Math.PI/2)"); step(w, 1);
  check(E("G.state") === 'ending', 'the ending');
  E("toMenu(); loadCheckpoint('chase1')"); step(w, 6); E("monChase({}); MON.pos.copy(player.pos)"); step(w, 0.2);
  await sleep(1100);
  check(E("G.state") === 'dead' && !E("$('dead').hidden") && E("$('deadTitle').textContent") === 'IT FOUND YOU', 'caught: game over screen');
  // the chases must be survivable for a normal player (1 second per E press)
  E("toMenu(); loadCheckpoint('chase1')"); step(w, 3); E("revealSwap()");
  let r = runRoute(w, 'chase1', 1.0); check(r.ok, 'chase 1 can be survived from its checkpoint', r);
  E("toMenu(); loadCheckpoint('chase2')");
  r = runRoute(w, 'chase2', 1.0); check(r.ok, 'the final chase can be survived from its checkpoint', r);
  check(E("G.flags.kitSlam"), 'the kitchen door slammed shut behind you');
  E("toMenu(); loadCheckpoint('chase2')");
  r = runRoute(w, 'chase2', 2.0); check(r.ok, 'the final chase can be survived even when slow (2 s per press)', r);
  E("toMenu(); loadCheckpoint('neighbor'); G.step = 'n_ask'; neighborSit(); sitDown(SEATS[0]); talkNeighbor()");
  r = runRoute(w, 'chase2', 1.0, 80); check(r.ok, 'the final chase can be survived after he gets up from the couch', r);
  for (const c of ['night', 'chase1', 'police', 'neighbor', 'chase2']){ E(`loadCheckpoint('${c}')`); step(w, 1); check(E("G.state") === 'playing' || E("G.state") === 'cine', 'checkpoint ' + c + ' loads'); }
  done(errors, 'House Sitting smoke test');
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
