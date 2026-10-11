/* PULSE//SHIFT co-op test: two copies of the game in two jsdom windows, linked by a
   fake connection instead of Supabase. Checks the lobby, same attacks from the same
   seed, shared boss damage, DEATHLINK and a shared win. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'pulse-shift', 'index.html'), 'utf8');

function makeCtx(cv) {
  const grad = { addColorStop() {} };
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 7 }) };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
function boot(name) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/games/pulse-shift/?' + name,
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx(this)); };
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
    } });
  dom.window.localStorage.setItem('basgames-player', JSON.stringify({ id: 'id-' + name, name }));
  return dom.window;
}
const A = boot('Host'), B = boot('Guest');
const errors = [];
for (const w of [A, B]) w.addEventListener('error', (e) => { errors.push(e.message); console.log('WINDOW ERROR', e.message); });

// fake "Supabase room": delivers each message to the other window
const room = { members: [] };
const fakeFor = (w) => ({
  connect(net) {
    room.members.push({ w, net });
    if (room.members.length === 2) for (const m of room.members) {
      const other = room.members.find((o) => o !== m);
      m.net.partner = { id: 'x', name: other.net.me().name };
      if (m.net.role === 'host') m.net.sendLobby();
      m.net.changed();
    }
  },
  disconnect(net) { room.members = room.members.filter((m) => m.net !== net); },
  send(net, ev, payload) {
    const other = room.members.find((m) => m.net !== net);
    if (other) other.net.onMsg(ev, JSON.parse(JSON.stringify(payload)));
  }
});
A.eval('PS.Net').fake = fakeFor(A);
B.eval('PS.Net').fake = fakeFor(B);

const ok = (c, m) => { if (!c) throw new Error(m); };
const tests = [];
const run = (label, fn) => tests.push([label, fn]);
const flush = () => new Promise((r) => setTimeout(r, 0));
async function runOne(label, fn) { try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 4).join(' | ')); } }
// step both games together; the two players move differently
function step(sec, god) {
  for (const [w, k] of [[A, 1.3], [B, 0.8]]) w.eval(`(() => { const g = PS.game; window.__t = window.__t || 0;
    PS.Input.move = () => ({ x: Math.cos(window.__t * ${k}), y: Math.sin(window.__t * ${k * 0.7}) });
    ${god ? "g.hurt = function () { this.player.hurtT = 0.4; };" : 'delete g.hurt;'} })()`);
  for (let i = 0; i < sec * 60; i++) {
    for (const w of [A, B]) w.eval(`window.__t += 1 / 60; if (${i} % 30 === 0) PS.Input.press('dash'); PS.game.update(1 / 60); if (${i} % 6 === 0) PS.game.draw();`);
  }
}

run('host makes a room, guest joins, lobby choice reaches the guest', async () => {
  A.eval("PS.Menus.show('coop')");
  A.eval("PS.Net.open('ABCD', 'host')"); await flush();
  B.eval("PS.Net.open('ABCD', 'guest')"); await flush();
  ok(A.eval('PS.Net.partner && PS.Net.partner.name') === 'Guest', 'host does not see the guest');
  ok(B.eval('PS.Net.partner && PS.Net.partner.name') === 'Host', 'guest does not see the host');
  A.eval("PS.Menus.act('coop-boss', { id: 'metronome' }); PS.Menus.act('coop-diff', { id: 'easy' })");
  ok(B.eval('PS.Net.lobby.difficulty') === 'easy', 'guest did not get the lobby choice');
  ok(A.eval("!!document.querySelector('.roomcode')"), 'room code not shown');
});

run('start: both play the same boss with the same seed and the same first attacks', () => {
  A.eval("PS.Menus.act('coop-start', {})");
  ok(A.eval('PS.game.state') === 'playing' && B.eval('PS.game.state') === 'playing', 'not both playing');
  ok(A.eval('PS.game.opts.mode') === 'coop' && B.eval('PS.game.baseSeed') === A.eval('PS.game.baseSeed'), 'different seed');
  step(12, true);
  ok(A.eval('PS.game.boss.seqIndex') === B.eval('PS.game.boss.seqIndex'), 'the bosses are on different attacks');
  const ha = A.eval('PS.game.hazards.list.length'), hb = B.eval('PS.game.hazards.list.length');
  ok(Math.abs(ha - hb) <= Math.max(3, ha * 0.15), `attacks differ: ${ha} vs ${hb}`);
  ok(A.eval('PS.Net.remote && PS.Net.remote.tx') !== null, 'host does not see the guest move');
  return { hazards: [ha, hb] };
});

run('damage to the boss is shared', () => {
  const before = B.eval('PS.game.boss.hp');
  A.eval('PS.game.damageBoss(5)');
  const after = B.eval('PS.game.boss.hp');
  ok(after < before, 'guest boss did not take the host damage');
  step(2, true);
  const diff = Math.abs(A.eval('PS.game.boss.hp') - B.eval('PS.game.boss.hp'));
  ok(diff < 3, 'boss HP drifted apart: ' + diff);
  return { hostHp: A.eval('PS.game.boss.hp.toFixed(1)'), guestHp: B.eval('PS.game.boss.hp.toFixed(1)') };
});

run('DEATHLINK: when the guest dies, the host dies too', () => {
  B.eval('PS.game.player.hp = 1; delete PS.game.hurt; PS.game.player.hurtT = 0; PS.game.hurt()');
  ok(B.eval('PS.game.player.alive') === false, 'guest did not die');
  ok(A.eval('PS.game.player.alive') === false && A.eval('PS.game.deathlinked') === true, 'host survived: deathlink failed');
  step(3, true);
  ok(A.eval('PS.game.state') === 'results' && B.eval('PS.game.state') === 'results', 'no results screen');
  ok(A.eval('PS.Menus.lastResults.deathlinked') === true, 'results do not mention deathlink');
  return { pct: A.eval('PS.Menus.lastResults.pct') };
});

run('back to the room, play again and win together', async () => {
  A.eval("PS.Menus.act('retry', {})"); await flush();
  ok(A.eval('PS.Menus.current') === 'coop' && A.eval('PS.Net.partner') !== null, 'not back in the room');
  A.eval("PS.Menus.act('coop-start', {})");
  step(3, true);
  for (let k = 0; k < 40 && A.eval('PS.game.state') === 'playing'; k++) {
    A.eval('PS.game.boss && !PS.game.boss.defeated && PS.game.damageBoss(8)');
    step(2, true);
  }
  step(5, true);
  ok(A.eval('PS.game.state') === 'results' && A.eval('PS.Menus.lastResults.cleared'), 'host did not win');
  ok(B.eval('PS.game.state') === 'results' && B.eval('PS.Menus.lastResults.cleared'), 'guest did not win with the host');
  return { phasesSeen: 'all', rank: B.eval('PS.Menus.lastResults.rank') };
});

run('leaving the room tells the other player', async () => {
  B.eval("PS.Menus.act('coop-leave', {})"); await flush();
  ok(A.eval('PS.Net.partner') === null, 'host still sees the guest');
});

(async () => {
  for (const [label, fn] of tests) await runOne(label, fn);
  if (errors.length) { console.log(`\n${errors.length} problem(s)`); process.exit(1); }
  console.log('\nPULSE//SHIFT co-op: all tests passed');
  process.exit(0);
})();
