/* Co-op-test: een host (Anna) en een gast (Bram) in dezelfde nachtdienst, via een in-memory vervanger
   voor de Supabase-kamers. Controleert de lobby, meedoen, elkaar zien, gedeelde sleutels, deuren en stroom,
   interacties van de gast die de host uitvoert, het monster dat beide spelers ziet en de gast vangt,
   opstaan na gepakt worden, het gezamenlijke einde en het aantal berichten. */
const { boot, sleep, check, done, makeBus, ready } = require('./lib');
const errors = [], bus = makeBus();
const A = boot('Anna', errors, bus), B = boot('Bram', errors, bus);
const a = (s) => A.eval(s), b = (s) => B.eval(s);
const both = async (sec) => { for (let t = 0; t < sec; t += 0.25) { a('T.step(.25)'); b('T.step(.25)'); await sleep(4); } };
(async () => {
  await ready(A); await ready(B); await sleep(100);
  check(!a("document.getElementById('coop').hidden") && !b("document.getElementById('coop').hidden"), 'samen spelen staat in het startmenu');
  a("document.getElementById('btnHost').click()"); await sleep(200); await both(9);
  check(a('__game.state') === 'play' && a('__game.net.active && __game.net.isHost'), 'Anna host een dienst en speelt');
  a('__game.net.tick(1)'); await sleep(50); b('__game.net.renderLobby()');
  check(/Anna/.test(b("document.getElementById('coopList').textContent")), 'Bram ziet de dienst van Anna in de lobby', b("document.getElementById('coopList').textContent"));
  b("document.getElementById('coopList').querySelector('button').click()"); await sleep(300); await both(0.5); await sleep(200); await both(1);
  check(b('__game.state') === 'play' && !b('__game.net.waiting') && b('__game.story.flags.chapter') === 1, 'Bram doet mee in hoofdstuk 1');
  check(a('Object.keys(__game.net.avatars).length') === 1 && b('Object.keys(__game.net.avatars).length') === 1, 'ze zien elkaar');
  check(/Bram/.test(a("document.getElementById('coopHud').textContent")), 'de code en spelers staan in beeld', a("document.getElementById('coopHud').textContent"));
  check(/sleutel/i.test(b('__game.ui.currentObjective')), 'Bram krijgt het doel van de dienst', b('__game.ui.currentObjective'));

  // Bram pakt de sleutel: de inventaris is gedeeld
  b("T.tp(2.2, 4.5, Math.PI / 2); T.use(__game.level.named.keyBox)"); await sleep(10); b('T.close()'); await sleep(30); await both(1);
  check(a("__game.inv.has('key_tech')") && b("__game.inv.has('key_tech')"), 'de sleutel die Bram pakt zit in de gedeelde inventaris');
  check(/technische ruimte/.test(a('__game.ui.currentObjective')) && /technische ruimte/.test(b('__game.ui.currentObjective')), 'beiden krijgen het nieuwe doel');
  // Bram opent de deur (de host voert het uit), Anna ziet hem open
  b("T.tp(45.5, 15.8, 0); T.use(__game.level.named.door_tech.panel)"); await sleep(30); await both(0.6);
  b("T.use(__game.level.named.door_tech.panel)"); await sleep(30); await both(1.5);
  check(a('__game.level.named.door_tech.isOpen') && b('__game.level.named.door_tech.isOpen'), 'Bram opent de deur, voor allebei open');
  // Bram zet de stroom aan via de schakelaars
  b("T.tp(47.5, 4.5, -Math.PI / 2); const s = __game.story; for (const i of [1, 3, 0, 1, 2, 3]) T.use(s.switches[i].g)"); await sleep(50); await both(6);
  check(a("['A','B','C','D'].every(c => __game.lights.power[c])") && b("['A','B','C','D'].every(c => __game.lights.power[c])"), 'Bram zet de stroom aan: overal licht');
  check(a('__game.story.flags.chapter') === 2 && b('__game.story.flags.chapter') === 2, 'samen naar hoofdstuk 2');
  // Bram leest het briefje in hoofdstuk 3-situatie: verhaalgevolgen via de host
  a("const s = __game.story; s.flags.chapter = 3; s.flags.hideSeq = true; s.flags.afterHide = true; s.note3.visible = true"); await both(1);
  b("T.tp(45.3, 9.2, 0); T.use(__game.story.note3)"); await sleep(10); b('T.close()'); await sleep(40); await both(1.5);
  check(a('__game.story.flags.chapter') === 4 && b('__game.story.flags.chapter') === 4, 'Bram leest het briefje: voor beiden begint de jacht');
  check(b("__game.story.scratches.every((s, i) => s.digit === " + a("JSON.stringify(__game.story.scratches.map(s => s.digit))") + "[i])"), 'dezelfde gekraste code bij beide spelers');
  // het monster ziet Bram en jaagt op hem
  a("const g = __game; g.enemy.activate(); g.enemy.place(26, 16.5, Math.PI / 2); g.enemy.setMode('patrol'); g.enemy.wait = 99; T.tp(3, 5)");
  b("T.tp(36, 16.5, Math.PI / 2); __game.flashlight.on = true"); // Bram kijkt van het monster weg, 10 m verder
  let chased = false, same = 99, caught = false;
  for (let i = 0; i < 60 && !caught; i++) {
    await both(0.25);
    if (a('__game.enemy.mode') === 'chase' && a('__game.enemy.chaseId') === 'peer-Bram') {
      chased = true;
      const ea = a("[__game.enemy.pos.x, __game.enemy.pos.z]"), eb = b("[__game.enemy.pos.x, __game.enemy.pos.z]");
      if (b('__game.enemy.root.visible')) same = Math.min(same, Math.hypot(ea[0] - eb[0], ea[1] - eb[1]));
    }
    caught = b('__game.dying || __game.player.dead');
  }
  check(chased, 'het monster ziet Bram (zaklamp) en jaagt op hem');
  check(same < 1.5, 'Bram ziet het monster op dezelfde plek als Anna', same);
  check(caught, 'het monster vangt Bram: zijn scherm toont de jumpscare');
  for (let i = 0; i < 200 && !b("document.getElementById('deathScreen').classList.contains('show')"); i++) { await sleep(50); await both(0.05); }
  await both(0.5);
  check(b('__game.player.dead') && b("document.getElementById('deathScreen').classList.contains('show')") && a('__game.state') === 'play' && !a('__game.player.dead'), 'Bram ligt eruit, Anna speelt door');
  check(a("__game.enemy.mode") !== 'chase', 'het monster trekt zich terug na de vangst');
  b("document.getElementById('btnRetry').click()"); await both(1);
  check(!b('__game.player.dead') && b('__game.state') === 'play', 'Bram staat weer op bij het checkpoint');
  // gezamenlijk einde: Bram kiest de nooduitgang, Anna opent hem
  a("const s = __game.story; s.flags.chapter = 5; s.flags.serverOpen = true; __game.enemy.deactivate(); __game.director.relief(999)"); await both(1);
  b("__game.story.powerChoice()"); await sleep(10); b("document.querySelectorAll('#choice button')[1].click()"); await sleep(40); await both(1);
  check(a("__game.story.flags.choice") === 'exit' && b('__game.lights.alarm'), 'Bram kiest de nooduitgang: het alarm gaat voor beiden');
  a('__game.story.flags.noDeath = true; __game.story.flags.countdown = .1; __game.enemy.deactivate()'); await both(1.5);
  b("T.tp(48.3, 16.5, -Math.PI / 2); T.use(__game.level.named.door_exit.panel)"); await sleep(40);
  for (let i = 0; i < 80 && (a('__game.state') !== 'ended' || b('__game.state') !== 'ended'); i++) await both(0.25);
  check(a('__game.state') === 'ended' && b('__game.state') === 'ended' && /ZONSOPGANG/.test(b("document.getElementById('endTitle').textContent")), 'beiden zien het einde Zonsopgang');
  const secs = (a('__game.time') || 1);
  console.log('berichten:', bus.stats.sent, 'in', Math.round(secs), 's spel;', JSON.stringify(bus.stats.byTopic));
  check(bus.stats.bytes / bus.stats.sent < 3000, 'berichten blijven klein', Math.round(bus.stats.bytes / bus.stats.sent));
  // verlaten
  b('__game.net.leave()'); await both(1);
  check(a('Object.keys(__game.net.avatars).length') === 0, 'als Bram weggaat, ziet Anna hem niet meer');
  done(errors, 'The Last Shift co-op-test');
})().catch((err) => { console.log('FAIL gecrasht: ' + err.stack); if (process.env.GITHUB_ACTIONS) console.log('::error title=The Last Shift gecrasht::' + String(err.message).slice(0, 300)); process.exit(1); });
