/* Online play test: the host (The Hollow) and two survivor guests over an in-process fake Realtime hub.
   Each player has their own world, as in real browsers. Checks lobby, start, movement sync, searching,
   doors, task progress, grab and break free, a guest leaving (a bot takes over), the end of the match,
   and how many messages are sent per second. */
const { load } = require('./lib');
const HG = load();
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ✔ ' : '  ✖ ') + msg); if (!c) failed++; };
const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
  const hub = new HG.FakeHub();
  const mk = (id, name) => {
    const world = new HG.World(); world.build(); world.initNav();
    const net = new HG.Net({ transport: hub.transport(), env: 'test', me: { id, name } });
    const P = { id, world, net, sim: null, notices: [] };
    net.cb = {
      onLobby: () => {}, onStart: cfg => { P.sim = new HG.Sim(world, net.simOpts(cfg)); net.bind(P.sim); },
      onHostLeft: msg => { P.left = msg; }, onNotice: msg => P.notices.push(msg), onCommand: () => {}
    };
    return P;
  };
  const H = mk('host', 'Bas'), A = mk('ga', 'Anna'), B = mk('gb', 'Bram');
  await H.net.open('TEST', true); await tick(); hub.pump();
  await A.net.open('TEST', false); await B.net.open('TEST', false);
  for (let i = 0; i < 5; i++) { await tick(); hub.pump(); }
  console.log('Lobby');
  ok(H.net.status === 'connected' && A.net.status === 'connected', 'host and guests connect');
  ok(H.net.members.length === 3 && A.net.members.length === 3, 'everyone sees 3 people in the room');
  ok(H.net.members[0].slot === -1 && A.net.members.find(m => m.id === 'ga').slot >= 0, 'the host is The Hollow, guests are survivors');
  // a friend switches to another tab in the lobby: their frame loop stops, only the heartbeat timer runs
  { const t0 = Date.now(); while (Date.now() - t0 < 16500) { await new Promise(r => setTimeout(r, 250)); hub.pump(); } }
  ok(H.net.members.length === 3, 'a guest in a background tab (no frames for 16 s) stays in the room');

  // start
  const cfg = H.net.hostStart({ difficulty: 'normal', length: 'short', weather: 'fog' });
  H.sim = new HG.Sim(H.world, H.net.simOpts(cfg)); H.net.bind(H.sim);
  await tick(); hub.pump();
  console.log('Start');
  ok(A.sim && B.sim, 'guests start the same match');
  ok(H.sim.player === H.sim.monster && H.sim.monster.isPlayer && !H.sim.monster.ai, 'the host controls the creature');
  const hA = H.sim.survivors.find(s => s.netId === 'ga'), aMe = A.sim.player;
  ok(hA && hA.remote && !hA.ai && aMe.netId === 'ga' && !aMe.remote, 'each guest has their own survivor; no AI on human survivors');
  ok(H.sim.survivors.filter(s => s.ai).length === 3, '3 empty survivor slots are AI bots');
  ok(JSON.stringify(H.sim.tasks.map(t => t.type)) === JSON.stringify(A.sim.tasks.map(t => t.type)), 'same objectives on every computer');
  ok(JSON.stringify(H.world.containers.map(c => c.items)) === JSON.stringify(A.world.containers.map(c => c.items)), 'same items hidden in the same places');
  ok(aMe.name === 'Anna' && H.sim.survivors.some(s => s.name === 'Bram'), 'players keep their names');

  // a frame on every computer
  let msgs0 = hub.sent, simT = 0;
  const frame = (dt, ctlA, ctlB) => {
    H.net.hostPre(); H.sim.update(dt);
    const ev = H.sim.events.slice(); H.sim.events.length = 0;
    H.net.hostPost(dt, ev);
    for (const [P, ctl] of [[A, ctlA], [B, ctlB]]) {
      if (!P.sim) continue;
      const me = P.sim.player; const c = me.ctrl;
      c.mx = c.mz = 0; c.use = false; c.sprint = false; c.crouch = false;
      if (ctl) ctl(P, me, c, dt);
      P.net.guestFrame(dt); P.sim.events.length = 0;
    }
    hub.pump(); simT += dt;
  };
  const steerTo = (P, me, c, x, z, l) => {
    const p = P.world.findPath({ level: me.level, x: me.x, z: me.z }, { level: l, x, z }, {});
    if (!p || p.length < 2) return true;
    const wp = p[1]; const dx = wp.x - me.x, dz = wp.z - me.z, d = Math.hypot(dx, dz) || 1;
    c.mx = dx / d; c.mz = dz / d; c.yaw = Math.atan2(-c.mx, -c.mz);
    return Math.hypot(x - me.x, z - me.z) < 1.0 && l === me.level;
  };
  // keep the creature far away while we test the basics
  H.sim.monster.x = 10.5; H.sim.monster.z = 10.5;
  for (let i = 0; i < 60; i++) frame(1 / 30);

  console.log('Movement');
  const start = { x: aMe.x, z: aMe.z };
  for (let i = 0; i < 60; i++) frame(1 / 30, (P, me, c) => { c.mz = 1; c.yaw = Math.PI; });
  ok(Math.hypot(aMe.x - start.x, aMe.z - start.z) > 1.5, 'the guest walks on their own screen without waiting for the host');
  ok(Math.hypot(hA.x - aMe.x, hA.z - aMe.z) < 0.6, 'the host sees the guest where they are (' + Math.hypot(hA.x - aMe.x, hA.z - aMe.z).toFixed(2) + ' m)');
  const aOnB = B.sim.survivors.find(s => s.netId === 'ga');
  for (let i = 0; i < 20; i++) frame(1 / 30);
  ok(Math.hypot(aOnB.x - aMe.x, aOnB.z - aMe.z) < 0.6, 'other guests see them too');

  console.log('Searching');
  const box = A.world.containers.find(c => c.level === 0 && A.world.isHouse(0, c.x, c.z) && c.items.length && !c.locked);
  const idx = A.world.containers.indexOf(box);
  let arrived = false, n = 0;
  while (!arrived && n++ < 900) frame(1 / 30, (P, me, c) => { arrived = steerTo(P, me, c, box.x, box.z, box.level); });
  // face it and hold E
  for (let i = 0; i < 30 * 8 && !H.world.containers[idx].searched; i++) frame(1 / 30, (P, me, c) => {
    c.yaw = Math.atan2(-(box.x - me.x), -(box.z - me.z));
    if (i === 2) P.net.act('use');
    c.use = true;
  });
  ok(H.world.containers[idx].searched, 'holding E makes the host search the ' + box.name + ' for the guest');
  for (let i = 0; i < 40; i++) frame(1 / 30);
  ok(A.world.containers[idx].searched && B.world.containers[idx].searched, 'everyone sees it has been searched');
  ok(JSON.stringify(aMe.carry) === JSON.stringify(hA.carry) && aMe.batteries === hA.batteries, 'what the guest found shows up on their screen (' + (aMe.carry.join(',') || hA.batteries + ' batteries') + ')');

  console.log('Doors and tasks');
  const door = H.world.doors.find(d => !d.locked && d.level === 0);
  const di = H.world.doors.indexOf(door);
  H.sim.toggleDoor(H.sim.monster, door, !door.open);
  const want = door.open;
  for (let i = 0; i < 10; i++) frame(1 / 30);
  ok(A.world.doors[di].open === want, 'doors opened by anyone are open for everyone');
  const t = H.sim.tasks[0], st = t.steps[t.stepIdx];
  if (st.kind === 'deliver') { st.delivered.push(st.items.find(x => !st.delivered.includes(x))); H.sim.emit({ type: 'progress', task: t.id }); }
  else st.progress = st.time * 0.5;
  for (let i = 0; i < 30; i++) frame(1 / 30);
  const at = A.sim.tasks[0], ast = at.steps[at.stepIdx];
  ok(at.stepIdx === t.stepIdx && (ast.kind === 'deliver' ? ast.delivered.length === st.delivered.length : Math.abs(ast.progress - st.progress) < 0.5), 'task progress is shared');

  console.log('The creature');
  const m = H.sim.monster;
  m.x = hA.x; m.z = hA.z + 1.0; m.level = hA.level; m.yaw = 0; m.ctrl.yaw = 0; // just south of Anna, facing north
  m.ctrl.grab = true;
  let grabbed = false;
  for (let i = 0; i < 20; i++) { frame(1 / 30); if (hA.grabbedBy) grabbed = true; }
  ok(grabbed, 'the creature grabs a human survivor');
  ok(!!aMe.grabbedBy, 'the guest knows they are grabbed');
  const heldAt = { x: aMe.x, z: aMe.z };
  for (let i = 0; i < 6; i++) frame(1 / 30, (P, me, c) => { c.mz = 1; });
  ok(Math.hypot(aMe.x - hA.x, aMe.z - hA.z) < 0.3, 'a grabbed guest cannot walk away (follows the claws)');
  let free = false;
  for (let i = 0; i < 30 * 4 && !free; i++) { frame(1 / 30, (P, me, c) => { if (i % 4 === 0) P.net.act('struggle'); }); if (!hA.grabbedBy && hA.alive) free = true; }
  ok(free && hA.alive && hA.health === 1, 'mashing on the guest\'s computer breaks free (wounded)');
  for (let i = 0; i < 10; i++) frame(1 / 30);
  ok(!aMe.grabbedBy && aMe.health === 1, 'the guest is free and sees they are hurt');
  const before = { x: aMe.x, z: aMe.z };
  for (let i = 0; i < 30; i++) frame(1 / 30, (P, me, c) => { c.mx = 1; c.yaw = -Math.PI / 2; });
  ok(Math.hypot(aMe.x - before.x, aMe.z - before.z) > 1 && Math.hypot(hA.x - aMe.x, hA.z - aMe.z) < 0.6, 'after breaking free the guest can run, and the host follows their position');

  console.log('Leaving');
  const hB = H.sim.survivors.find(s => s.netId === 'gb');
  await B.net.leave(); hub.pump();
  for (let i = 0; i < 10; i++) frame(1 / 30);
  ok(!hB.remote && !!hB.ai, "when a guest leaves, a bot takes over their survivor");
  ok(H.net.members.length === 2, 'the room shows who is left');

  console.log('Network load');
  const before2 = hub.sent; const d0 = hub.delivered; const b0 = hub.bytes;
  for (let i = 0; i < 300; i++) frame(1 / 30);
  const secs = 10, perSec = (hub.sent - before2) / secs, delPerSec = (hub.delivered - d0) / secs, kb = (hub.bytes - b0) / secs / 1024;
  console.log(`    ${perSec.toFixed(0)} sent/s, ${delPerSec.toFixed(0)} delivered/s, ${kb.toFixed(1)} kB/s (host + 1 guest)`);
  ok(perSec < 30 && delPerSec < 40, 'message rate stays well inside Realtime limits');

  console.log('Full room (5 guests)');
  {
    const hub2 = new HG.FakeHub();
    const world = new HG.World(); world.build();
    const host = new HG.Net({ transport: hub2.transport(), env: 'test', me: { id: 'h', name: 'H' }, callbacks: {} });
    await host.open('FULL', true); await tick(); hub2.pump();
    const guests = [];
    for (let i = 0; i < 6; i++) { const g = new HG.Net({ transport: hub2.transport(), env: 'test', me: { id: 'g' + i, name: 'G' + i }, callbacks: { onStart: cfg => { g.sim = new HG.Sim(new HG.World(), g.simOpts(cfg)); } } }); g.cb.onStart = cfg => { const w = new HG.World(); w.build(); g.sim = new HG.Sim(w, g.simOpts(cfg)); g.bind(g.sim); }; guests.push(g); await g.open('FULL', false); }
    for (let i = 0; i < 6; i++) { await tick(); hub2.pump(); }
    ok(host.members.length === 6, 'a room holds The Hollow and 5 survivors');
    ok(guests[5].status === 'idle' && /full/.test(guests[5].error), 'a sixth guest is told the room is full');
    const cfg2 = host.hostStart({ difficulty: 'normal', length: 'short', weather: 'fog' });
    const hsim = new HG.Sim(world, host.simOpts(cfg2)); host.bind(hsim);
    await tick(); hub2.pump();
    ok(hsim.survivors.every(s => s.remote), 'all five survivors are people');
    const s0 = hub2.sent, d0 = hub2.delivered;
    for (let i = 0; i < 300; i++) {
      host.hostPre(); hsim.update(1 / 30); const ev = hsim.events.slice(); hsim.events.length = 0; host.hostPost(1 / 30, ev);
      for (const g of guests.slice(0, 5)) { const me = g.sim.player; me.ctrl.mx = Math.sin(i / 20); me.ctrl.mz = Math.cos(i / 25); me.ctrl.yaw = i / 10; g.guestFrame(1 / 30); g.sim.events.length = 0; }
      hub2.pump();
    }
    const total = (hub2.sent - s0 + hub2.delivered - d0) / 10;
    console.log(`    ${(hub2.sent - s0) / 10} sent/s + ${(hub2.delivered - d0) / 10} received/s = ${total} counted/s at ${host.hz.toFixed(1)} updates/s`);
    ok(total < 90, 'a full room stays under the Free plan limit of 100 messages per second (Supabase counts sends and receipts)');
  }

  console.log('End of the match');
  // finish quickly: everyone left alive is lost to the night
  H.sim.time = H.sim.timeLimit - 0.05;
  let ended = false;
  for (let i = 0; i < 10 && !ended; i++) { frame(1 / 30); if (H.sim.over) { H.net.hostEnd(); hub.pump(); ended = true; } }
  ok(ended && A.sim.over && A.sim.result && A.sim.result.time > 0, 'the guest gets the result');
  ok(A.sim.survivors.every((s, i) => s.caught === H.sim.survivors[i].caught && s.escaped === H.sim.survivors[i].escaped), 'everyone sees the same fates');

  console.log('Host leaves');
  await H.net.leave(); hub.pump();
  ok(!!A.left, 'when the host leaves, guests are told (' + A.left + ')');

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log('\nOnline play: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
