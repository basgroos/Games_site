/* PULSE//SHIFT smoke test: boots the built game in jsdom, opens every menu,
   fights all three bosses through all phases, and plays Survival, Boss Rush and the tutorial. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'pulse-shift', 'index.html'), 'utf8');

function makeCtx(cv) {
  const grad = { addColorStop() {} };
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 7 }) };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/games/pulse-shift/',
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx(this)); };
    w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
  } });
const w = dom.window, E = (s) => w.eval(s);
const errors = [];
w.addEventListener('error', (e) => { errors.push(e.message); console.log('WINDOW ERROR', e.message); });
const ok = (c, m) => { if (!c) throw new Error(m); };
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 4).join(' | ')); } }

// a simple bot: moves in circles, dashes often, breaks when it can
E(`window.__play = (sec, godMode) => {
  const g = PS.game; let t = 0;
  PS.Input.move = () => ({ x: Math.cos(t * 1.7), y: Math.sin(t * 1.1) });
  if (godMode) g.hurt = function () { this.stats.hits++; this.player.hurtT = 0.4; };
  for (let i = 0; i < sec * 60 && g.state === 'playing'; i++) {
    t += 1 / 60;
    if (i % 25 === 0) PS.Input.press('dash');
    if (i % 40 === 0) PS.Input.press('hop');
    if (g.res >= 50 && i % 30 === 0) PS.Input.press('brk');
    g.update(1 / 60);
    if (i % 4 === 0) g.draw();
    const p = g.player;
    if (p && (isNaN(p.x) || isNaN(p.y))) throw new Error('player position became NaN');
  }
  return g.state;
};`);

run('title screen has a link back to the site and all menus open', () => {
  ok(E("PS.Menus.current") === 'title', 'title not shown');
  ok(E("!!document.querySelector('#ui a.home[href=\"../../\"]')") || E("PS.BUILD.home") === '', 'no link back to the site');
  for (const s of ['modes', 'customize', 'records', 'settings', 'title']) { E(`PS.Menus.show('${s}')`); ok(E("document.querySelectorAll('#ui button').length") > 0, s + ' has no buttons'); }
  E("PS.Menus.mode = 'practice'; PS.Menus.show('setup')");
  ok(E("document.querySelectorAll('[data-act=boss]').length") === 3, 'boss cards missing');
  return E("PS.Store.prefix");
});

for (const boss of ['metronome', 'seraph', 'offbeat']) run(`${boss}: all three phases and a clear`, () => {
  E(`PS.game.start({ mode: 'practice', boss: '${boss}', difficulty: 'normal' })`);
  const phases = new Set();
  for (let k = 0; k < 40 && E("PS.game.state") === 'playing'; k++) {
    E('__play(4, true)');
    phases.add(E('PS.game.boss ? PS.game.boss.phase : -1'));
    E("PS.game.boss && !PS.game.boss.defeated && PS.game.boss.takeDamage(6)");
  }
  E('__play(5, true)');
  ok(phases.has(2), 'never reached phase III');
  ok(E("PS.game.state") === 'results' && E("PS.Menus.lastResults.cleared"), 'boss not cleared');
  return { rank: E("PS.Menus.lastResults.rank"), perfects: E("PS.Menus.lastResults.perfects"), breaks: E("PS.Menus.lastResults.breakHits") };
});

run('easy, hard and every modifier start and run', () => {
  for (const d of ['easy', 'hard']) { E(`PS.game.start({ mode: 'practice', boss: 'offbeat', difficulty: '${d}', modifiers: { doubleTime: true, remix: true } })`); E('__play(25, true)'); }
  E(`PS.game.start({ mode: 'practice', boss: 'metronome', difficulty: 'normal', modifiers: { glass: true } })`);
  E('__play(30, false)');
  return E('PS.game.state');
});

run('pause, resume, restart and quit', () => {
  E(`PS.game.start({ mode: 'practice', boss: 'seraph', difficulty: 'normal' })`); E('__play(3, true)');
  E('PS.game.pause()'); ok(E('PS.game.state') === 'paused' && E('PS.Menus.current') === 'pause', 'not paused');
  E('PS.game.resume()'); ok(E('PS.game.state') === 'playing', 'not resumed');
  E('PS.game.restart()'); E('__play(2, true)');
  E('PS.game.quit()'); ok(E('PS.game.state') === 'menu' && E('PS.Menus.current') === 'title', 'not back at title');
});

run('survival reaches level 3', () => {
  E(`PS.game.start({ mode: 'survival', difficulty: 'normal' })`); E('__play(60, true)');
  const lvl = E('PS.game.boss.level'); ok(lvl >= 3, 'level ' + lvl); return { level: lvl };
});

run('boss rush goes through all three bosses', () => {
  E(`PS.game.start({ mode: 'rush', difficulty: 'easy' })`);
  for (let k = 0; k < 120 && E("PS.game.state") === 'playing'; k++) { E('__play(3, true)'); E("PS.game.boss && !PS.game.boss.defeated && PS.game.boss.takeDamage(10)"); }
  ok(E("PS.game.state") === 'results' && E("PS.Menus.lastResults.bossesCleared") === 3, 'rush not finished');
  return { score: E("PS.Menus.lastResults.score") };
});

run('tutorial starts and shows its first step', () => {
  E(`PS.game.start({ mode: 'tutorial', difficulty: 'normal' })`); E('__play(4, false)');
  ok(E('PS.game.tutorial && PS.game.tutorial.i') >= 0, 'no tutorial');
});

if (errors.length) { console.log(`\n${errors.length} problem(s)`); process.exit(1); }
console.log('\nPULSE//SHIFT: all smoke tests passed');
