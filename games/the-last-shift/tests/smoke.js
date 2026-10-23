/* Speelt The Last Shift alleen helemaal uit: stroompuzzel, ronde, archief, zekering, verstoppen,
   de jacht met de gekraste code, gepakt worden met checkpoint, de serverruimte en beide eindes. */
const { boot, sleep, check, done, ready } = require('./lib');
const errors = [];
(async () => {
  const W = boot('Daan', errors), e = (s) => W.eval(s);
  check(await ready(W), 'het startmenu verschijnt');
  check(e("document.getElementById('coop').hidden"), 'zonder online-verbinding is samen spelen verborgen');
  e("document.getElementById('btnStart').click()"); await sleep(60); e('T.step(9)');
  check(e('__game.state') === 'play' && e('__game.story.flags.chapter') === 1, 'het spel start in hoofdstuk 1');
  check(/sleutel/i.test(e('__game.ui.currentObjective')), 'eerste doel: de sleutel halen', e('__game.ui.currentObjective'));

  // H1: sleutel en stroom
  e("T.tp(2.2, 4.5, Math.PI / 2); T.use(__game.level.named.keyBox)"); await sleep(10); e('T.close()'); await sleep(10);
  check(e("__game.inv.has('key_tech')"), 'sleutel technische ruimte in de inventaris');
  e("T.tp(45.5, 15.8, 0); T.use(__game.level.named.door_tech.panel); T.use(__game.level.named.door_tech.panel); T.step(1)");
  check(!e('__game.level.named.door_tech.locked') && e('__game.level.named.door_tech.isOpen'), 'de deur van de technische ruimte gaat open');
  e("T.tp(47.5, 4.5, -Math.PI / 2); const s = __game.story; s.useSwitch(s.switches[0]); T.step(1)");
  check(!e('__game.story.flags.main'), 'hoofdschakelaar slaat af als er groepen aan staan');
  e("const s = __game.story; s.useSwitch(s.switches[1]); s.useSwitch(s.switches[3]); s.useSwitch(s.switches[0]); s.useSwitch(s.switches[1]); s.useSwitch(s.switches[2]); s.useSwitch(s.switches[3]); T.step(5)");
  check(e("['A','B','C','D'].every(c => __game.lights.power[c])"), 'in de juiste volgorde gaat alle stroom aan');
  check(e('__game.story.flags.chapter') === 2, 'hoofdstuk 2 begint');

  // H2: de ronde en de archiefsleutel
  e("const s = __game.story; T.tp(19, 3, -Math.PI / 2); s.stamp(s.clocks[0]); T.tp(24, 22, 0); T.step(12)");
  check(e('__game.story.flags.upstairs'), 'voetstappen op de verdieping erboven na de eerste stempel');
  e('T.step(6)');
  check(e('__game.story.flags.phoneRinging'), 'de telefoon in de kantine gaat');
  e("T.tp(26.5, 20, 0); __game.story.answerPhone(); T.step(14)");
  check(e('__game.story.flags.phoneDone') && e('__game.story.lf.echoArmed'), 'het telefoontje wordt beantwoord');
  e("const s = __game.story; s.stamp(s.clocks[1]); T.tp(12.2, 21.2, Math.PI / 2); s.stamp(s.clocks[2]); T.step(6)");
  check(/kantoor B/.test(e('__game.ui.currentObjective')), 'na de ronde: archiefsleutel in kantoor B', e('__game.ui.currentObjective'));
  e("T.tp(23, 10.5, Math.PI / 2); __game.story.toggleDrawer(__game.level.named.drawerCabinet.drawers[0], 0); T.step(.5); T.use(__game.story.items.key_archive)"); await sleep(10); e('T.close()'); await sleep(10);
  check(e("__game.inv.has('key_archive')"), 'archiefsleutel uit de onderste la');

  // H3: archief, stroomuitval, zekering, verstoppen
  e("T.tp(36.5, 15.6, 0); T.use(__game.level.named.door_archive.panel); T.step(1)");
  check(e('__game.story.flags.chapter') === 3, 'hoofdstuk 3 begint bij het archief');
  e("T.tp(40, 3.5, 0); T.use(__game.story.items.diary)"); await sleep(10); e('T.close()'); await sleep(10); e('T.step(3)');
  check(!e('__game.lights.power.C') && !e('__game.lights.power.D'), 'na het dagboek valt de stroom in oost en zuid uit');
  e('T.step(8)');
  e("__game.flashlight.on = true; T.tp(36.5, 16.5, -Math.PI / 2); T.step(.5)");
  check(e("__game.enemy.root.visible") && e('__game.enemy.mode') === 'scripted', 'een silhouet staat aan het einde van de gang');
  e("T.tp(40, 16.5, -Math.PI / 2); T.step(1)");
  check(!e('__game.enemy.root.visible'), 'het silhouet verdwijnt als je dichterbij komt');
  e("T.tp(37, 21.5, 0); T.use(__game.story.items.fuse)"); await sleep(10); e('T.close()'); await sleep(10); e("__game.player.yaw = 0; T.step(8)");
  check(e("__game.inv.has('fuse')") && e('__game.story.flags.burst'), 'zekering gevonden en de kast springt open');
  e("T.tp(47.8, 8.2, -Math.PI / 2); __game.story.useFuse(0); __game.story.useFuse(2); T.step(6)");
  check(e('__game.story.flags.fuseFixed') && e('__game.lights.power.C'), 'zekering vervangen, de stroom komt terug');
  // verstoppen zoals een speler: kijk naar de kastdeur en druk op E
  e("__game.flashlight.on = false; const sp = __game.level.hideSpots.find(h => h.id === 'tech1'); __game.player.pos.copy(sp.out); __game.player.yaw = sp.yaw + Math.PI; __game.player.pitch = -0.1; T.step(.1)");
  check(e("(__game.findInteract() || {def:{prompt:()=>''}}).def.prompt()") === 'Verstoppen in de kast', 'voor de kast verschijnt "Verstoppen in de kast"', e("(__game.findInteract() || {def:{prompt:()=>'(niets)'}}).def.prompt()"));
  e("__game.onKey('KeyE'); T.step(.5)");
  check(e('!!__game.player.hidden'), 'met E zit je in de kast');
  for (let i = 0; i < 80 && !e('__game.story.flags.afterHide'); i++) e('T.step(1)');
  check(e('__game.story.flags.afterHide') && e('__game.state') === 'play', 'verstopt in de kast: het monster loopt voorbij zonder je te vinden');
  e("__game.player.hideT = 5; __game.player.unhide(); T.step(1); T.use(__game.story.note3)"); await sleep(10); e('T.close()'); await sleep(10); e('T.step(1)');
  check(e('__game.story.flags.chapter') === 4 && e('__game.enemy.mode') !== 'inactive', 'hoofdstuk 4: het monster jaagt');

  // H4: de code
  e("const s = __game.story; for (const sc of s.scratches) { T.tp(sc.x + (Math.abs(Math.sin(sc.rot)) > .5 ? Math.sin(sc.rot) : 0), sc.z + (Math.abs(Math.cos(sc.rot)) > .5 ? Math.cos(sc.rot) : 0)); s.foundDigit(sc); } T.step(.5)");
  check(new RegExp(e('__game.story.code')).test(e('__game.ui.currentObjective')), 'alle vier cijfers gevonden: de code staat in het doel', [e('__game.story.code'), e('__game.ui.currentObjective'), e('__game.state')]);
  // gepakt worden en terug naar het checkpoint
  e("const g = __game; g.enemy.activate(); g.enemy.place(g.player.pos.x + .6, g.player.pos.z); g.enemy.setMode('chase'); T.step(.5)");
  for (let i = 0; i < 200 && e('__game.state') !== 'dead'; i++) { await sleep(50); e('T.step(.05)'); }
  check(e('__game.state') === 'dead' && e("document.getElementById('deathScreen').classList.contains('show')"), 'gepakt: het game-over-scherm verschijnt');
  e("document.getElementById('btnRetry').click(); T.step(1)");
  check(e('__game.state') === 'play' && e('__game.story.flags.chapter') === 4, 'terug bij het checkpoint in hoofdstuk 4');
  check(e("['I','II','III','IV'].every(r => __game.story.flags['dig_' + r] !== undefined)"), 'de gevonden cijfers zijn bewaard');
  // keypad
  e("__game.enemy.deactivate(); T.tp(42.3, 17.2, Math.PI); __game.story.openKeypad(__game.level.named.door_server)"); await sleep(10);
  e("__game.ui.kpPress('1'); __game.ui.kpPress('OK')"); await sleep(1100);
  check(e('__game.story.flags.chapter') === 4 && !e('__game.story.flags.serverOpen'), 'een foute code opent niets');
  e("for (const c of __game.story.code) __game.ui.kpPress(c); __game.ui.kpPress('OK')"); await sleep(800); e('T.step(2)');
  check(e('__game.story.flags.chapter') === 5 && e('__game.level.named.door_server.isOpen'), 'de juiste code opent de serverruimte: hoofdstuk 5');

  // H5: dossier, keuze, aftellen, einde 1
  e("T.tp(44, 26.3, Math.PI); T.use(__game.story.items.dossier)"); await sleep(10); e('T.close()'); await sleep(10); e('__game.player.yaw = 0; T.step(15)');
  check(e('__game.story.flags.dossierScare') && e('__game.story.lf.dossierScare'), 'het dossier is gelezen (met schrikmoment)');
  e("T.tp(45.3, 25, -Math.PI / 2); __game.story.powerChoice()"); await sleep(10);
  e("document.querySelectorAll('#choice button')[1].click()"); await sleep(20);
  check(e('__game.story.flags.choice') === 'exit' && e('__game.lights.alarm'), 'keuze: nooduitgang, het alarm gaat');
  e('__game.story.flags.noDeath = true; T.step(47)');
  check(e('__game.story.flags.exitReady'), 'na het aftellen is de nooduitgang vrij');
  e("T.tp(48.3, 16.5, -Math.PI / 2); __game.level.named.door_exit.playerUse()");
  for (let i = 0; i < 100 && e('__game.state') !== 'ended'; i++) { e('T.step(.2)'); await sleep(30); }
  check(e('__game.state') === 'ended' && /ZONSOPGANG/.test(e("document.getElementById('endTitle').textContent")), 'einde 1: Zonsopgang');

  // einde 2 in een nieuwe pagina
  const W2 = boot('Daan2', errors), e2 = (s) => W2.eval(s);
  await ready(W2); e2("document.getElementById('btnStart').click()"); await sleep(60); e2('T.step(1)');
  e2("const s = __game.story; s.flags.chapter = 5; s.flags.serverOpen = true; s.applyChoice(0); s.flags.noDeath = true; s.flags.countdown = .1; T.step(1)");
  check(e2('__game.story.flags.exitReady') && e2('__game.story.flags.choice') === 'dock', 'keuze: laaddock, ontgrendeld');
  e2("T.tp(8.3, 32.2, Math.PI); T.use(__game.level.named.dockPanel)");
  for (let i = 0; i < 60 && e2('__game.state') !== 'ended'; i++) { e2('T.step(.2)'); await sleep(30); }
  check(e2('__game.state') === 'ended' && /LAATSTE DIENST/.test(e2("document.getElementById('endTitle').textContent")), 'einde 2: De laatste dienst');
  done(errors, 'The Last Shift smoke-test');
})().catch((err) => { console.log('FAIL gecrasht: ' + err.stack); if (process.env.GITHUB_ACTIONS) console.log('::error title=The Last Shift gecrasht::' + String(err.message).slice(0, 300)); process.exit(1); });
