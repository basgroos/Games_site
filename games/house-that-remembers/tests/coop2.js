/* Co-op in Part II: the host picks St. Brigid's, the guest joins the hospital (not the house),
   the chain, the fuses and the power are shared, and both are pulled along through the chapters. */
const { boot, sleep, check, done, makeBus } = require('./lib');
const errors = [], bus = makeBus();
const A = boot('Anna', errors, bus), B = boot('Bram', errors, bus);
const a = s => A.eval(s), b = s => B.eval(s);
const both = async (sec) => { for (let t = 0; t < sec; t += .25) { a('T.step(.25)'); b('T.step(.25)'); await sleep(5); } };
(async () => {
  await sleep(100);
  a("Game.setPart(2); $('btnHost').click()"); await sleep(300);
  check(a("G.state") === 'play' && a("Story.S.part") === 2 && a("Story.S.ch") === 11, 'Anna hosts a Part II game');
  await both(.5); b("Net.renderLobby()");
  check(/Part II/.test(b("$('coopList').textContent")), "the lobby says it is Part II", b("$('coopList').textContent"));
  b("$('coopList').querySelector('button').click()"); await sleep(300); await both(.25); await sleep(300);
  check(b("G.state") === 'play' && b("Story.S.part") === 2 && b("Story.S.ch") === 11 && b("!!W.doors.entrance"), 'Bram joins the hospital, not the house', b("[Story.S.part, Story.S.ch]"));
  a("T.close()"); b("T.close()"); await both(1);
  check(a("Object.keys(Net.avatars).length") === 1 && b("Object.keys(Net.avatars).length") === 1, 'each sees the other');
  // Bram gets the cutters, Anna cuts the chain with them
  b("T.close(); Story.give('boltCutters'); Story.S.flags.gotCutters = true"); await both(1);
  check(a("Story.has('boltCutters')") && !a("W.obj.boltCutters.visible"), "Anna has Bram's bolt cutters");
  a("T.close(); T.tp(0,0,5.4,0); T.use('p2chain'); W.doors.entrance.tryUse()"); await both(1.5);
  check(!b("W.obj.chain.visible") && b("W.doors.entrance.open"), 'Bram sees the chain cut and the doors open');
  a("T.tp(0,0,2,0)"); await both(3);
  check(b("Story.S.ch") === 12 && !b("P.outside"), 'Bram is pulled inside into chapter 12', b("[Story.S.ch, P.outside]"));
  // fuses found by both players count together; the power comes on for both
  a("T.close(); Story.S.ch = 13; Story.p2Fuse('fuseA','x'); Story.p2Fuse('fuseB','x')"); b("T.close(); Story.S.ch = 13; Story.p2Fuse('fuseC','x')");
  await both(1.5);
  check(a("Story.p2FuseCount()") === 3 && b("Story.p2FuseCount()") === 3, 'both count three fuses');
  a("T.close(); T.tp(-45,0,-5,Math.PI/2); T.use('p2fusebox')"); await both(5);
  check(b("Story.S.flags.powerOn") && b("W.p2power") && b("!W.doors.r14.locked"), 'the power comes back for Bram too');
  // the photo wall solved by one is solved for both
  a("T.close(); Story.p2WallSolved()"); await both(1.5);
  check(b("Story.S.flags.wallDone") && !b("W.obj.wallPanel.visible") && b("Story.has('basementKey')"), 'the photo wall and the mortuary key are shared');
  b("Game.quitToTitle()"); await both(1);
  check(a("Object.keys(Net.avatars).length") === 0, 'when Bram leaves, Anna no longer sees him');
  done(errors, 'Part II co-op test');
})().catch(e => { console.log('FAIL crashed: ' + e.stack); process.exit(1); });
