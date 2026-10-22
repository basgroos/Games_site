/* House Sitting co-op test: two copies of the game (host and guest) in two jsdom windows, linked by a fake
   connection instead of Supabase. Messages go through JSON like the real thing. Checks the lobby, starting together,
   cutscenes, the guest moving the story and pressing E, notes for one player, shared doors, pockets and sounds,
   the monster hunting the nearest player, deathlink, restarting together and leaving. */
const { boot, step, use, sleep, check, done } = require('./lib');
const errors = [];
const A = boot('Host', errors), B = boot('Guest', errors);
const EA = s => A.eval(s), EB = s => B.eval(s);

// fake room: queues messages and delivers them to the other windows
let room = [], queue = [], sent = { A: {}, B: {} };
const fakeFor = (w, tag) => ({
  connect(mp){ room.push({ w, mp }); },
  disconnect(mp){ room = room.filter(m => m.mp !== mp); },
  send(mp, ev, payload){ sent[tag][ev] = (sent[tag][ev] || 0) + 1; queue.push({ from: mp, ev, data: JSON.stringify(payload) }); },
});
EA('MP').fake = fakeFor(A, 'A'); EB('MP').fake = fakeFor(B, 'B');
function deliver(){ let n = 0; while (queue.length && n < 5000){ const m = queue.shift(); n++; for (const r of room) if (r.mp !== m.from) r.mp.recv(m.ev, r.w.JSON.parse(m.data)); } }
// run both games side by side
function both(sec){ const n = Math.max(1, Math.round(sec * 20)); for (let i = 0; i < n; i++){ A.eval('tick(lastT + 50)'); B.eval('tick(lastT + 50)'); deliver(); } }
const near = (a, b, d = 1.5) => Math.hypot(a[0] - b[0], a[1] - b[1]) < d;

(async () => {
  // ---- lobby ----
  EA("MP.openScreen(); $('mpCreate').click()"); await sleep(0); both(0.2);
  const code = EA('MP.code');
  check(/^[A-Z]{4}$/.test(code) && EA("MP.host && MP.status") === 'connected', 'host makes a room', code);
  check(EA("$('mpGo').disabled"), 'cannot start alone');
  EB(`MP.openScreen(); $('mpCode').value = '${code}'; $('mpJoin').click()`); await sleep(0); both(0.5);
  check(EA("MP.members.length") === 2 && EB("MP.members.length") === 2, 'guest joins: both see 2 players');
  check(EB("MP.hostId") === 'id-Host' && EB("$('mpList').textContent").includes('Host'), 'guest knows the host and sees the list', EB("$('mpList').textContent"));
  check(!EA("$('mpGo').disabled"), 'host can start now');

  // ---- start together ----
  EA("$('mpGo').click()"); both(0.6);
  check(EA("MP.started") && EB("MP.started"), 'both games started');
  check(EB("G.state") === 'cine' && !EB("$('cine').hidden"), 'guest sees the intro cutscene');
  both(1); check(EB("$('cineText').textContent").length > 5, 'guest gets the cutscene text', EB("$('cineText').textContent"));
  EB("nextCine()"); both(0.5);
  check(EA("cineData && cineData.i") >= 1, 'guest pressing E moves the cutscene on for everyone');
  for (let i = 0; i < 9; i++){ EA("if (G.state === 'cine') nextCine()"); both(0.5); }
  both(1.2);
  check(EA("G.state") === 'playing' && EB("G.state") === 'playing', 'cutscene over for both', [EA("G.state"), EB("G.state")]);
  const pa = EA("[player.pos.x, player.pos.z]"), pb = EB("[player.pos.x, player.pos.z]");
  check(near(pa, [8, -13.2], 0.3) && near(pb, [8, -13.2], 1.2) && !near(pa, pb, 0.3), 'guest is teleported next to the host', [pa, pb]);
  check(EB("G.objectives.length") > 0 && EB("$('objList').textContent").includes('flowerpot'), 'guest sees the objective', EB("$('objList').textContent"));
  check(EA("Object.keys(MP.remotes).length") === 1 && EA("!!MP.remotes['id-Guest'].av"), 'host sees the guest as a person in the world');
  check(EB("!!MP.remotes['id-Host'] && !!MP.remotes['id-Host'].av"), 'guest sees the host');

  // ---- the guest does things ----
  EB("setPlayer(9.2,0,-1.4,0)"); both(0.5);
  check(use(B, 'PROPS.flowerpot') === 'ok', 'guest lifts the flowerpot'); both(0.6);
  check(EA("hasItem('House key')") && EB("hasItem('House key')"), 'the key is in the shared pockets');
  check(EB("$('sub').textContent").includes('brass key'), 'guest sees the subtitle', EB("$('sub').textContent"));
  check(use(B, 'D.front.panel') === 'ok', 'guest unlocks the front door'); both(1.5);
  check(EA("D.front.open") && EB("D.front.open"), 'the door is open on both');
  check(EB("Math.abs(D.front.ang - D.front.maxAng) < 0.2"), 'and swings open on the guest\'s screen');
  EB("setPlayer(8,0,2.5,Math.PI)"); both(0.6);
  check(EA("G.step") === 'note' && EA("player.pos.z") < -10, 'the guest walking in moves the story (host is still outside)');
  check(use(B, 'PROPS.note') === 'ok', 'guest reads the note'); both(0.4);
  check(!EB("$('note').hidden") && EA("$('note').hidden"), 'only the guest sees the note');
  EB("closeNote()"); both(2.5);
  check(EA("G.step") === 'trash' && EB("G.step") === 'trash', 'closing it moves on for everyone');
  EA("setDoor(D.livKit, false)"); both(1);
  check(!EB("D.livKit.open"), 'host closes a door: closed for the guest too');
  check(sent.A.fx > 0 && sent.A.snap > 0 && sent.B.p > 0 && sent.A.h > 0, 'messages flow both ways', sent);
  let sounds = 0; B.eval('MP').applyFx = ((o) => function(e){ if (e.t === 's') sounds++; return o.call(this, e); })(EB('MP.applyFx'));
  use(B, 'PROPS.trashBag'); both(1);
  check(sounds > 0, 'sounds made by the host reach the guest', sounds);

  // ---- the monster hunts the nearest player ----
  EA("MP.hostStart('chase1')"); both(0.5);
  check(EB("G.step") !== 'trash' && EB("MP.started"), 'host restarts at a checkpoint: guest follows');
  both(4); EA("revealSwap()"); for (let i = 0; i < 60 && EA("G.step") !== 'chase1'; i++) both(0.1);
  check(EA("G.step + ' ' + MON.mode") === 'chase1 chase', 'the chase starts', EA("G.step + ' ' + MON.mode"));
  EA("setPlayer(1,0,10,0)"); EB("setPlayer(8.4,3,8.2,0)"); EA("MON.pos.set(8,3,9.6); MON.level = 1; MON.tid = null"); both(0.4);
  check(EA("MON.tid") === 'id-Guest', 'monster goes after the guest (closest)', EA("MON.tid"));
  check(EB("MON.m.root.visible") && EB("Math.hypot(MON.pos.x - 8, MON.pos.z - 9.6)") < 2, 'guest sees the monster where the host has it');
  EB("setPlayer(MON.pos.x, 3, MON.pos.z, 0)"); both(0.4);
  await sleep(1100); both(0.1);
  check(EA("G.state") === 'dead' && EB("G.state") === 'dead', 'deathlink: the guest is caught, both games over');
  check(EB("$('deadTitle').textContent") === 'IT FOUND YOU' && EA("$('deadTitle').textContent") === 'IT FOUND GUEST', 'right names on the game over screens', [EA("$('deadTitle').textContent"), EB("$('deadTitle').textContent")]);
  check(EB("$('bDeadRetry').hidden") && !EA("$('bDeadRetry').hidden"), 'only the host can try again');
  EA("$('bDeadRetry').click()"); both(1);
  check(EA("G.state") !== 'dead' && EB("G.state") !== 'dead', 'host tries again: both back in');

  // ---- the kitchen door only slams when everyone is inside ----
  EA("MP.hostStart('chase2')"); both(0.5); both(2.5);
  check(EA("G.step") === 'chase2' && EB("G.step") === 'chase2', 'both at the final chase checkpoint');
  EA("MON.mode = 'watch'; MON.pos.set(2, 0, -28)"); EB("setPlayer(9, 0, -27, 0)"); EA("player.pos.set(12, 0, -30); player.vel.set(0, 0, 0)"); both(0.5);
  check(!EA("G.flags.kitSlam") && EA("D.nKitchen.open"), 'one player still in the hall: the kitchen door stays open', EA("[G.flags.kitSlam, D.nKitchen.open, JSON.stringify(Object.values(MP.remotes).map(r => [r.tx, r.tz])), player.pos.x, player.pos.z, G.state]"));
  EB("setPlayer(12.5, 0, -31, 0)"); both(0.5);
  check(EA("G.flags.kitSlam") && EA("D.nKitchen.hold") === 8 && !EB("D.nKitchen.open"), 'both in the kitchen: it slams shut (for the guest too)');

  // ---- leaving ----
  EB("toMenu()"); both(0.3);
  check(EA("MP.members.length") === 1 && EA("Object.keys(MP.remotes).length") === 0, 'guest leaves: host keeps playing alone');
  EB(`MP.openScreen(); $('mpCode').value = '${code}'; $('mpJoin').click()`); await sleep(0); both(0.5); await sleep(0);
  check(EB("MP.status") === 'idle' && EB("$('mpMsg').textContent").includes('already started'), 'cannot join a game that already started', EB("$('mpMsg').textContent"));
  done(errors, 'House Sitting co-op test');
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
