/* The House That Remembers smoke test: plays the whole story alone, from the gate to an ending,
   including all three puzzles, the three chases (getting caught once), checkpoints and the endings. */
const { boot, sleep, check, done, file } = require('./lib');
const fs = require('fs');
const html = fs.readFileSync(file, 'utf8');
check(html.includes('cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'), 'Three.js r128 is loaded from cdnjs');
check(html.includes('window.HW_BUILD'), 'the page has the Bas Games build info');
const errors = [];
const w = boot('Solo', errors), E = s => w.eval(s);
const info = () => E(`({ ch: Story.S.ch, obj: Story.S.objective, room: Story.getRoom(), inv: Story.S.inv.slice() })`);
(async () => {
  check(E("G.state") === 'title', 'boots to the title screen');
  check(E("!$('homeLink').hidden && $('homeLink').getAttribute('href') === '../../'"), 'title links back to Bas Games');
  check(E("$('nameIn').value") === 'Solo', 'name comes from the shared Bas Games profile');
  E("$('btnNew').click()"); await sleep(200); T = null;
  check(E("G.state") === 'play' && E("Story.S.ch") === 1, 'a new game starts in chapter I');
  // ---------- I. Arrival ----------
  E("T.use('mailbox'); T.close()");
  check(/angel/i.test(E("Story.S.objective")), 'the solicitor points to the angel', E("Story.S.objective"));
  E("W.doors.front.tryUse()"); check(E("W.doors.front.locked"), 'the front door is locked');
  E("T.tp(8.2,0,15,Math.PI); T.use('frontKey')"); check(E("Story.has('frontKey')"), 'spare key found at the angel');
  E("T.use('mem1'); T.close()");
  E("T.tp(0,0,5,0); W.doors.front.tryUse(); W.doors.front.tryUse(); T.step(1)");
  check(!E("W.doors.front.locked") && E("W.doors.front.open"), 'front door unlocked and open');
  E("T.tp(0,0,3,0); T.step(.5); T.use('gfNote'); T.close(); T.step(2)");
  check(E("Story.S.ch") === 2, 'reading the note starts chapter II');
  check(!!E("Store.get('save')"), 'a checkpoint is saved');
  // ---------- II. The Living Room ----------
  E("T.tp(5,0,1.5,-Math.PI/2); T.step(11)");
  E("T.use('clock'); T.close(); T.use('mantel1'); T.close(); T.use('drawer2'); T.use('mem2'); T.close()");
  check(E("Story.has('diningKey')") && /dining/i.test(E("Story.S.objective")), 'scratched photo + key point to the dining room', info());
  E("T.tp(0,0,-2,0); T.step(6); T.tp(4,0,1.2,-Math.PI/2); T.step(1)");
  check(E("Story.S.flags.chairMoved") && E("Story.S.flags.clockTicking"), 'the armchair moved and the clock ticks again');
  check(!E("W.doors.front.open") && E("W.doors.front.locked"), 'the front door shut itself');
  E("T.tp(-1.4,0,-3,Math.PI/2); W.doors.dining.tryUse(); W.doors.dining.tryUse(); T.step(1)");
  check(E("Story.S.ch") === 3, 'opening the dining room starts chapter III');
  // ---------- III. The First Memory ----------
  E("T.tp(-9,0,-6.5,0); T.step(16)");
  check(E("W.obj.photoC.getWorldPosition(new THREE.Vector3()).y") > .02 && E("W.obj.photoC.visible"), 'the photo under the table lies on top of the carpet, not inside it');
  E("T.use('photoA'); T.use('sbDrawer'); T.use('photoC'); T.use('mem3'); T.close(); T.step(5)");
  check(['photoA', 'photoB', 'photoC'].every(p => E(`Story.has('${p}')`)), 'three photographs found');
  E("T.use('cabinet'); [...document.querySelectorAll('#pzBody .ph')].forEach(x => x.click())"); await sleep(1000);
  check(!E("Story.S.flags.cabOpen"), 'the wrong order does not open the cabinet');
  E("if (!UI.stack.includes('puzzle')) T.use('cabinet')");
  E("const ids=['photoA','photoB','photoC'].filter(i=>Story.has(i)); ['photoB','photoA','photoC'].forEach(id => document.querySelectorAll('#pzBody .ph')[ids.indexOf(id)].click())"); await sleep(800);
  check(E("Story.S.flags.cabOpen"), 'oldest-first order opens the cabinet');
  E("T.use('cabinet'); T.close(); T.step(14)");
  check(!E("W.doors.stairs.locked") && E("Story.S.flags.letterRead"), "Margaret's letter, the crash upstairs, the stair door opens");
  E("setDiningOffset(0); T.tp(.6,1,-13.2,Math.PI); T.step(1)");
  check(E("Story.S.ch") === 4, 'going upstairs starts chapter IV');
  // ---------- IV. The Upstairs Hallway ----------
  E("T.step(10); W.doors.elena.tryUse(); T.step(.5)");
  check(/three old keys/i.test(E("Story.S.objective")), 'the triple-locked door asks for three keys');
  E("T.tp(9,1,-2.5,-Math.PI/2); T.use('nightstand'); T.use('gPainting'); T.step(2); T.close(); T.step(2)");
  E("T.tp(-8,1,-12,0); T.step(3); T.use('bathtub'); T.use('medCabinet'); T.step(1)");
  E("T.tp(0,1,-4,Math.PI); T.step(4)");
  check(E("W.doors.sewing.open"), 'with two keys the sewing room door opens by itself');
  E("T.tp(-5,1,-7,Math.PI); T.use('sewingBox'); T.use('mem4'); T.close(); T.step(1)");
  check(E("Story.S.flags.keys") === 3, 'all three keys found');
  // CHASE 1
  E("T.tp(-1,1,-6.5,-Math.PI/2); T.step(.3)");
  check(E("Chase.active && Chase.cfg.id === 1"), 'chase 1 starts in the hall');
  E("T.step(6)");
  check(E("Chase.deaths") >= 1, 'standing still gets you caught');
  E("T.step(4)");
  check(!E("P.dead") && E("Chase.active"), 'you get another try right away');
  E("T.tp(-1.3,1,0,Math.PI/2); W.doors.elena.tryUse(); T.step(1.6)");
  check(!E("W.doors.elena.locked") && E("W.doors.elena.open"), 'the three keys open the locked room');
  E("T.tp(-4,1,0,-Math.PI/2); T.step(6)");
  check(!E("Chase.active") && E("Story.S.ch") === 5, 'escaping into the room ends the chase, chapter V');
  // ---------- V. The Locked Bedroom ----------
  E("T.use('diary'); T.close(); T.use('drawing0'); T.close(); T.use('seasonWindow'); T.close(); T.use('wardrobe'); T.step(3); T.close()");
  E("T.tp(-21,1,0,Math.PI/2); T.step(2); T.use('mem5'); T.close()");
  E("T.tp(-3.6,1,2.6,Math.PI); T.use('musicBox'); Story.S.flags.dials=[1,3,5]; [...document.querySelectorAll('#pzBody button')].pop().click()"); await sleep(1700);
  check(E("Story.S.flags.boxSolved"), 'BIRD, MOON, OAK plays the song');
  E("T.close(); T.step(20)");
  check(E("W.doors.elena.missing") && !E("W.blackout"), 'after the blackout the bedroom door is gone');
  E("T.use('musicBox'); T.tp(-14,1,0,Math.PI/2); T.step(.4)");
  check(E("Chase.active && Chase.cfg.id === 2"), 'chase 2 starts in the wardrobe hallway');
  E("T.tp(-21.5,1,0,Math.PI/2); W.doors.wardEnd.tryUse(); T.step(3)");
  check(!E("Chase.active") && E("Story.S.ch") === 6, 'the small door leads down to chapter VI');
  // ---------- VI. The Basement ----------
  E("T.tp(0,0,-16,0); for (let i = 0; i < 200; i++){ P.pos.z -= .06; T.step(.05); }");
  check(E("Story.S.flags.stairShift") === 2, 'the stairs are longer on the way down');
  E("T.tp(0,-1,-26,0); T.step(2)");
  E("T.tp(-20,-1,-30,Math.PI/2); for (let i = 0; i < 40; i++){ P.pos.x -= .1; T.step(.05); }");
  check(E("P.pos.x") > 0, 'the west corridor leads back in from the east');
  E("T.tp(-7,-1,-34,Math.PI); T.use('boxPhotos'); T.close(); T.use('mem6'); T.close(); T.use('newspaper'); T.close()");
  check(E("Story.has('babyPhoto')"), 'the baby photograph is in the box');
  E("W.doors.sealed.tryUse(); T.use('tape'); T.step(98)");
  check(E("Story.S.flags.tapeDone") && E("Chase.active && Chase.cfg.id === 3"), 'after the confession, chase 3 starts');
  E("T.tp(8.5,-1,-25.2,Math.PI); T.step(12)");
  check(!E("Chase.active") && !E("W.doors.sealed.locked"), 'hiding in the crawlspace works; the iron door unbolts');
  E("T.tp(0,-1,-34.5,0); W.doors.sealed.tryUse(); T.step(2); T.tp(0,-1,-40,0); T.step(1)");
  const pick = (i, id) => E(`T.use('pedestal${i}'); [...document.querySelectorAll('#pzBody button')].find(b => b.textContent === ITEMS['${id}'].name).click()`);
  pick(0, 'musicBox'); pick(1, 'babyPhoto'); pick(2, 'diary'); E("T.step(3)");
  check(E("W.pedestals.every(p => !p.item)") && E("Story.has('diary')"), 'the wrong order throws everything off');
  pick(0, 'babyPhoto'); pick(1, 'musicBox'); pick(2, 'diary'); E("T.step(8)");
  check(E("Story.S.flags.panelOpen"), 'photo, music box, diary opens the wall');
  // ---------- VII. The Final Memory ----------
  E("T.tp(0,-1,-48,0); T.step(1); T.tp(0,-1,-51,0); T.step(3)");
  check(E("Story.S.ch") === 7, 'the memory room starts chapter VII');
  check(Object.keys(E("Story.S.mem")).length === 6, 'all six memories found');
  E("T.tp(0,-1,-53,0); T.use('arthur'); UI.dnode('box')");
  const opts = E("[...document.querySelectorAll('#dlgOpts button')].map(b => b.textContent)");
  check(opts.some(t => /awake on purpose/.test(t)), 'the special choice for ending C is offered');
  check(!!E("Store.get('save') && Store.get('save').cp.ch === 7"), 'checkpoint in chapter VII');
  E("[...document.querySelectorAll('#dlgOpts button')].find(b => /awake/.test(b.textContent)).click(); for (let i = 0; i < 6; i++){ const bs = [...document.querySelectorAll('#dlgOpts button')]; if (!bs.length) break; (bs.find(b => b.className === 'special') || bs[0]).click(); }");
  E("T.step(16)");
  check(E("W.dawn") && E("Story.getRoom()") === 'hall', 'ending C: dawn, back in the hall');
  E("T.tp(0,0,6,Math.PI); T.step(9)");
  check(E("G.state") === 'ending' && E("$('endTitle').textContent") === 'The House Remembers', 'ending C screen', E("$('endTitle').textContent"));
  // continue from a checkpoint
  E("Story.saveCheckpoint && 0");
  E("Game.quitToTitle()"); check(E("G.state") === 'title', 'back to the title');
  E(`Store.set('save', { cp: Object.assign(Story.newState('Solo'), { ch: 5, flags: { keys: 3, locks: 3, letterRead: true, chase1: true } }), mem: { mem1: true }, playTime: 300 })`);
  E("Game.titleSetup(); $('btnContinue').click()"); await sleep(200);
  check(E("Story.S.ch") === 5 && E("G.state") === 'play' && E("W.doors.elena.open"), 'Continue loads chapter V with the room open');
  // ending A and B from chapter VII
  E(`Store.set('save', { cp: Object.assign(Story.newState('Solo'), { ch: 7, flags: { tapeDone: true, chase3: true } }), mem: {}, playTime: 900 })`);
  E("Game.quitToTitle(); Game.titleSetup(); $('btnContinue').click()"); await sleep(200);
  E("T.tp(0,-1,-53,0); T.step(1); T.use('arthur'); UI.dnode('box')");
  check(!E("[...document.querySelectorAll('#dlgOpts button')].some(b => /awake/.test(b.textContent))"), 'without all memories there is no ending C choice');
  E("[...document.querySelectorAll('#dlgOpts button')][0].click(); UI.dadvance(); T.step(12); T.tp(0,0,7,Math.PI); T.step(6)");
  check(E("$('endTitle').textContent") === 'Let Go', 'ending A screen');
  E(`Store.set('save', { cp: Object.assign(Story.newState('Solo'), { ch: 7, flags: { tapeDone: true, chase3: true } }), mem: {}, playTime: 900 })`);
  E("Game.quitToTitle(); Game.titleSetup(); $('btnContinue').click()"); await sleep(200);
  E("T.tp(0,-1,-53,0); T.step(1); T.use('arthur'); UI.dnode('box'); [...document.querySelectorAll('#dlgOpts button')][1].click(); UI.dadvance(); T.step(12)");
  check(E("Story.S.loop && Story.S.ch === 1"), 'ending B: back at the gate');
  E("T.tp(0,0,5.4,0); T.use('loopPhoto'); T.close(); T.step(.2)");
  check(E("$('endTitle').textContent") === 'The New Memory', 'ending B screen');
  done(errors, 'The House That Remembers smoke test');
})().catch(e => { console.log('FAIL crashed: ' + e.stack); process.exit(1); });
