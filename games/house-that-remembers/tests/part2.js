/* Part II (St. Brigid's) smoke test: picks Part II on the title screen and plays the whole hospital alone —
   grounds, reception keypad, Ward B fuses, the photo wall, the morgue, three chases and the endings D, E and F. */
const { boot, sleep, check, done } = require('./lib');
const errors = [];
const w = boot('Solo2', errors), E = s => w.eval(s);
const info = () => E(`({ ch: Story.S.ch, obj: Story.S.objective, room: Story.getRoom(), inv: Story.S.inv.slice(), chase: Chase.active && Chase.cfg.id })`);
const TALK = "for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll('#dlgOpts button')]; if (bs.some(b => /Give her|Burn/.test(b.textContent))) break; const me = bs.find(b => /it.s me/.test(b.textContent)); if (me) me.click(); else UI.dadvance(); }";
(async () => {
  check(E("G.state") === 'title' && !!E("$('part2')"), 'the title screen offers Part II');
  E("$('part2').click()");
  check(E("Game.part") === 2 && E("$('part2').classList.contains('on')"), 'Part II can be selected');
  E("$('btnNew').click()"); await sleep(200);
  check(E("G.state") === 'play' && E("Story.S.part") === 2 && E("Story.S.ch") === 11, 'a new Part II game starts in chapter 11', info());
  check(E("$('chapter').querySelector('.n').textContent") === 'Part II · Chapter I', 'the chapter card says Part II · Chapter I');
  check(E("!!W.doors.entrance && !W.doors.front"), 'the hospital is built instead of the house');
  // ---------- I. The Grounds ----------
  E("T.step(7); T.close()");
  check(/security booth/i.test(E("Story.S.objective")), 'the letter points to the security booth', info());
  E("W.doors.entrance.tryUse(); T.step(.2)");
  check(E("W.doors.entrance.locked"), 'the front doors are chained');
  E("T.tp(5,0,20.5,Math.PI/2); W.doors.booth.tryUse(); T.step(1); T.tp(7.4,0,20.5,-Math.PI/2); T.step(1)");
  check(E("Story.getRoom()") === 'booth', 'inside the security booth', info());
  E("T.use('p2logbook'); T.close(); T.use('p2shedKey'); T.use('p2lighter')");
  check(E("Story.has('shedKey') && Story.has('lighter')"), 'shed key and lighter taken');
  // the CCTV scare: look at the monitor
  E(`(() => { T.tp(7.5,0,20.5,-Math.PI/2); P.pitch = -.35; for (let i = 0; i < 40; i++) { T.step(.05); } })()`);
  check(E("Story.S.flags.camScare"), 'the CCTV shows something standing behind you', E("Story.S.flags.camLook"));
  E("T.step(3); T.tp(-7,0,14,Math.PI/2); W.doors.shed.tryUse(); W.doors.shed.tryUse(); T.step(1)");
  check(!E("W.doors.shed.locked"), 'the shed key opens the shed');
  E("T.tp(-10.6,0,14,Math.PI/2); T.step(.5); T.use('p2boltCutters'); T.step(8)");
  check(E("Story.has('boltCutters')"), 'bolt cutters taken (and something hammers on the door)');
  E("T.tp(0,0,5.4,0); T.step(.5); T.use('p2chain')");
  check(E("Story.S.flags.chainCut") && !E("W.doors.entrance.locked"), 'the chain is cut');
  E("W.doors.entrance.tryUse(); T.step(1); T.tp(0,0,2.5,0); T.step(1)");
  check(E("Story.S.ch") === 12, 'walking into the lobby starts chapter 12', info());
  // ---------- II. Reception ----------
  E("T.step(24)");
  check(E("!!W.p2ring"), 'the reception phone rings');
  E("T.tp(-1.2,0,-3.6,0); T.use('p2phone'); T.step(9)");
  check(E("Story.S.flags.phoneDone && Story.S.flags.chairRolled"), 'answering it: the voice, the wheelchair rolls');
  E("T.use('p2visitorLog'); T.close()");
  check(/visitors/i.test(E("Story.S.objective")), 'the visitors book has the code hint', info());
  E("W.doors.records.tryUse()"); check(E("UI.stack.includes('puzzle')"), 'the records door asks for a code');
  const key = k => E(`[...document.querySelectorAll('#pzBody button')].find(b => b.textContent === '${k}').click()`);
  ['1', '2', '3', '4', 'OK'].forEach(key); await sleep(700);
  check(E("W.doors.records.locked"), 'a wrong code does nothing');
  ['1', '4', '1', '0', 'OK'].forEach(key); E("T.step(2)");
  check(!E("W.doors.records.locked") && !E("UI.stack.includes('puzzle')"), '1410 opens the records room');
  E("T.tp(10.6,0,-5.7,-Math.PI/2); T.step(1); T.use('p2files'); T.close(); T.use('p2staffMemo'); T.close()");
  check(E("Story.has('keycard')"), "Margaret's file holds the Ward B card");
  E("T.step(14); T.tp(10,0,-5,Math.PI/2); T.step(.5); T.tp(5,0,-5,Math.PI/2); T.step(1)");
  check(E("Story.S.flags.faceRecords"), 'something waits in the records doorway');
  E("T.step(3); T.tp(-5,0,-3.2,Math.PI/2); W.doors.ward.tryUse(); W.doors.ward.tryUse(); T.step(1)");
  check(E("Story.S.ch") === 13, 'opening Ward B starts chapter 13', info());
  // ---------- III. Ward B ----------
  E("T.step(3); W.doors.r14.tryUse()");
  check(E("W.doors.r14.locked"), 'room 14 is dead-locked without power');
  // fuse 1 (room 11), the patient in 13
  const R = n => E(`W.p2rooms[${n}]`);
  const r11 = R(11); E(`T.tp(${r11.x2 - 1.6},0,-3.6,0); W.doors.r11.tryUse(); T.step(1); T.tp(${r11.x1 + 2.5},0,-8.6,0); T.step(.3); T.use('p2fuse1')`);
  const r13 = R(13); E(`T.tp(${r13.x2 - 1.6},0,-3.6,0); W.doors.r13.tryUse(); T.step(1); T.tp(${r13.x1 + 2},0,-6,0); T.step(1); T.tp(${r13.x1 + 2},0,-6,Math.PI); T.step(1)`);
  check(E("Story.S.flags.patTurned"), 'the patient in 13 turns its head while you look away');
  const r16 = R(16); E(`T.tp(${r16.x2 - 1.6},0,-2.8,Math.PI); W.doors.r16.tryUse(); T.step(1); T.tp(${r16.x1 + 2.5},0,2.6,Math.PI); T.use('p2fuse2')`);
  E("T.step(30); T.tp(-21.4,0,-3.2,Math.PI/2); for (let i = 0; i < 20; i++) { P.pos.x -= .05; T.step(.05); }");
  check(E("Story.S.flags.hatch"), 'a body drops through the ceiling hatch');
  E("T.step(5)");
  const r19 = R(19); E(`T.tp(${r19.x2 - 1.6},0,-3.6,0); W.doors.r19.tryUse(); T.step(1); T.tp(${r19.x2 - 1.2},0,-7.2,-Math.PI/2); T.use('p2fuse3')`);
  check(E("Story.p2FuseCount()") === 3 && E("['fuseA','fuseB','fuseC'].every(f => Story.has(f))"), 'three fuses found', info());
  E("T.tp(-40,0,-5,-Math.PI/2); T.use('p2nurseNotes'); T.close(); T.use('mem9'); T.close(); T.tp(-45,0,-5,Math.PI/2); T.use('p2fusebox'); T.step(6)");
  check(E("Story.S.flags.powerOn") && !E("W.doors.r14.locked") && E("W.obj.lamp_w1.on"), 'the fuse box puts the power back; room 14 unlocks');
  // CHASE 4
  E("T.tp(-26,0,-3.2,-Math.PI/2); T.step(.4)");
  check(E("Chase.active && Chase.cfg.id === 4"), 'chase 4 starts in the ward corridor', info());
  E("T.step(9)");
  check(E("Chase.deaths") >= 1, 'standing still gets you caught');
  E("T.step(4)");
  E("T.tp(-14,0,-2.6,Math.PI); W.doors.r14.tryUse(); T.step(1); T.tp(-14,0,.5,Math.PI); T.step(8)");
  check(!E("Chase.active") && E("Story.S.ch") === 14, 'reaching room 14 ends the chase; chapter 14', info());
  // ---------- IV. Room 14 ----------
  E("T.use('mem8'); T.close(); T.use('p2mBox'); T.close()");
  E("T.use('p2photo0')"); check(E("UI.stack.includes('inspect')"), 'before the diary the photos are just photographs'); E("T.close()");
  E("T.use('p2mDiary'); T.close(); T.use('p2photo2')");
  check(E("UI.stack.includes('puzzle')"), 'after the diary the photo wall becomes a puzzle');
  const ph = i => E(`document.querySelectorAll('#pzBody .ph')[${i}].click()`);
  ph(0); ph(2); E("[...document.querySelectorAll('#pzBody button')].find(b => /Take them down/.test(b.textContent)).click()");
  check(!E("Story.S.flags.wallDone"), 'taking down the real photos does not work');
  ph(0); ph(2); ph(1); ph(3); E("[...document.querySelectorAll('#pzBody button')].find(b => /Take them down/.test(b.textContent)).click(); T.close(); T.step(8)");
  check(E("Story.S.flags.wallDone") && E("Story.has('basementKey')"), 'the two fakes hide the mortuary key');
  check(!E("W.blackout") && !E("W.obj.r14Fig.visible"), 'the lights come back; the bed is empty');
  E("T.tp(-42.5,0,-6.5,0); W.doors.stairs2.tryUse(); W.doors.stairs2.tryUse(); T.step(1); T.tp(-42.5,0,-9,0); T.step(1)");
  check(E("Story.S.ch") === 15, 'the stairwell starts chapter 15', info());
  // ---------- V. The Morgue ----------
  E("T.tp(-42.5,-1,-17.2,0); T.step(1); T.tp(-47,-1,-24,-Math.PI/2); T.step(1)");
  check(E("Story.getRoom()") === 'morgue', 'down in the morgue', info());
  E("T.tp(-38.6,-1,-20,-Math.PI/2); T.use('p2toeTags'); T.close(); T.tp(-48.4,-1,-24,Math.PI/2)");
  E("T.use('p2drawer9'); T.step(1.6)"); check(E("Story.S.flags.arm"), 'a hand comes out of drawer 10');
  E("T.use('p2drawer2'); T.close()"); check(E("Story.S.mem.mem10"), "the wedding ring in drawer 3");
  E("T.use('p2liftBtn')");
  E("T.use('p2drawer6'); T.close(); T.step(3.2)");
  check(E("Story.has('album')") && E("Chase.active && Chase.cfg.id === 5"), 'the photograph in drawer 7; chase 5 starts', info());
  E("T.tp(-20,-1,-26,-Math.PI/2); T.step(.5); T.tp(-2,-1,-26,-Math.PI/2); T.step(9.5)");
  check(E("W.p2.liftB.open") > .85, 'the service lift arrives');
  E("T.tp(5.2,-1,-26,-Math.PI/2); T.step(6)");
  check(!E("Chase.active") && E("Story.S.ch") === 16 && E("P.lv") === 0, 'the lift takes you up; chapter 16', info());
  // ---------- VI. Visiting Hours ----------
  E("T.step(4); T.tp(26.6,0,-13,-Math.PI/2); T.use('p2margaret'); " + TALK + "");
  let opts = E("[...document.querySelectorAll('#dlgOpts button')].map(b => b.textContent)");
  check(opts.some(t => /Give her/.test(t)) && opts.some(t => /Burn/.test(t)), 'Margaret offers the choice', opts);
  check(!opts.some(t => /Elena is waiting/.test(t)), 'without all four memories there is no third way');
  check(!!E("Store.get('save2') && Store.get('save2').cp.ch === 16") && !!E("!Store.get('save') || Store.get('save').cp.part !== 2"), 'Part II has its own checkpoint');
  // ending E: burn it, chase 6 to the fire exit
  E("[...document.querySelectorAll('#dlgOpts button')].find(b => /Burn/.test(b.textContent)).click(); UI.dadvance(); T.step(3)");
  check(E("Chase.active && Chase.cfg.id === 6") && E("!W.doors.fireExit.locked"), 'burning it: chase 6, the fire exit opens', info());
  E("T.tp(23.2,0,3.4,Math.PI); W.doors.fireExit.tryUse(); T.step(.8); T.tp(23.2,0,6,Math.PI); T.step(8)");
  check(E("G.state") === 'ending' && E("$('endTitle').textContent") === 'Discharge', 'ending E screen', E("$('endTitle').textContent"));
  check(!E("Store.get('save2')"), 'the Part II checkpoint is cleared at the end');
  // ending D and F from a checkpoint in chapter 16
  const cp16 = mem => `Store.set('save2', { cp: Object.assign(Story.newState('Solo2', 2), { ch: 16, inv: ['album','lighter'], flags: { gotAlbum: true, mDiaryRead: true, chase5: true, chase4: true } }), mem: ${mem}, playTime: 1800 })`;
  E(cp16('{}')); E("Game.quitToTitle(); Game.setPart(2)");
  check(/Part II · Chapter VI/.test(E("$('btnContinue').textContent")), 'Continue shows the Part II chapter', E("$('btnContinue').textContent"));
  E("$('btnContinue').click()"); await sleep(200);
  check(E("Story.S.part") === 2 && E("Story.S.ch") === 16 && E("Story.getRoom()") === 'liftT', 'Continue puts you back in the lift', info());
  E("T.step(2); T.tp(26.6,0,-13,-Math.PI/2); T.use('p2margaret'); " + TALK + "; [...document.querySelectorAll('#dlgOpts button')].find(b => /Give her/.test(b.textContent)).click(); UI.dadvance(); T.step(15)");
  check(E("W.dawn") && !E("W.obj.margaret.visible"), 'ending D: she is gone, it is dawn');
  E("T.tp(23.2,0,3.4,Math.PI); T.step(.5); T.tp(23.2,0,6,Math.PI); T.step(6)");
  check(E("$('endTitle').textContent") === 'Visiting Hours', 'ending D screen', E("$('endTitle').textContent"));
  E(cp16("{ mem7: true, mem8: true, mem9: true, mem10: true }")); E("Game.quitToTitle(); Game.setPart(2); $('btnContinue').click()"); await sleep(200);
  E("T.step(2); T.tp(26.6,0,-13,-Math.PI/2); T.use('p2margaret'); " + TALK + "");
  opts = E("[...document.querySelectorAll('#dlgOpts button')].map(b => b.textContent)");
  check(opts.some(t => /Elena is waiting/.test(t)), 'with all four memories the third way is offered');
  E("[...document.querySelectorAll('#dlgOpts button')].find(b => /Elena is waiting/.test(b.textContent)).click(); for (let i = 0; i < 3; i++) UI.dadvance(); T.step(14)");
  E("T.tp(23.2,0,3.4,Math.PI); T.step(.5); T.tp(23.2,0,6,Math.PI); T.step(7)");
  check(E("$('endTitle').textContent") === 'Going Home', 'ending F screen', E("$('endTitle').textContent"));
  check(/D/.test(E("Object.keys(Store.get('endings')).join('')")) && /F/.test(E("Object.keys(Store.get('endings')).join('')")), 'endings D, E and F are remembered');
  // Part I is untouched
  E("Game.quitToTitle(); Game.setPart(1); $('btnNew').click()"); await sleep(200);
  check(E("Story.S.part") === 1 && E("Story.S.ch") === 1 && E("!!W.doors.front"), 'Part I still starts at the gate of 14 Alder Lane');
  done(errors, 'Part II smoke test');
})().catch(e => { console.log('FAIL crashed: ' + e.stack); process.exit(1); });
