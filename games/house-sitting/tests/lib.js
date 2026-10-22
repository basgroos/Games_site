/* Boots the built House Sitting page in jsdom. jsdom has no WebGL, so Three.js (from node_modules)
   is loaded with a do-nothing renderer; everything else (story, doors, monster, co-op) is the real game code. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const file = process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'house-sitting', 'index.html');
const THREE_SRC = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');
const STUB = 'THREE.WebGLRenderer = function(){ return { setPixelRatio(){}, setSize(){}, render(){}, shadowMap: {}, info: { render: {} } }; };';

function makeCtx(cv){
  const grad = { addColorStop(){} };
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, createPattern: () => ({}), measureText: s => ({ width: String(s).length * 7 }) };
  return new Proxy(base, { get(t, k){ if (k in t) return t[k]; return () => {}; }, set(t, k, v){ t[k] = v; return true; } });
}
function boot(name, errors){
  let html = fs.readFileSync(file, 'utf8');
  const tag = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/;
  if (!tag.test(html)) throw new Error('Three.js script tag not found in the built page');
  html = html.replace(tag, () => '<script>' + THREE_SRC + '</script><script>' + STUB + '</script>');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(name + ': ' + e.message); });
  vc.on('error', (...a) => errors.push(name + ' console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/games/house-sitting/?' + name,
    beforeParse(w){
      w.HTMLCanvasElement.prototype.getContext = function(){ return this._c || (this._c = makeCtx(this)); };
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.webkitAudioContext = undefined; w.scrollTo = () => {};
      w.localStorage.setItem('basgames-player', JSON.stringify({ id: 'id-' + name, name }));
    } });
  const w = dom.window;
  w.addEventListener('error', e => errors.push(name + ': ' + e.message));
  return w;
}
// advance the game by `sec` seconds of game time (20 frames per second)
function step(w, sec){ const n = Math.max(1, Math.round(sec * 20)); for (let i = 0; i < n; i++) w.eval('tick(lastT + 50)'); }
// use the interaction behind an object, like pressing E while looking at it
function use(w, expr){
  return w.eval(`(() => { const o = ${expr}; let e = null; o.traverse(x => { if (!e && x.userData.inter) e = x.userData.inter; }); if (!e) return 'no interaction';
    if (!e.enabled()) return 'disabled: ' + (typeof e.text === 'function' ? e.text() : e.text); useInter(e); return 'ok'; })()`);
}

// A bot that runs a route like a player would (sprinting, steering, pressing E with `act` seconds per press).
// Returns { ok, t, why }. Used to check that the chases can be survived.
const ROUTES = {
  chase1: [[8.0, 9.0], [8.2, 7.6], [9.3, 6.6], [9.3, 1.0], [7.6, 1.6], [6.6, 2.5], [5.2, 2.5], [5.3, 6.7], [6.2, 7.0], [7.2, 7.4], [8.0, 11.2, 'W.kitchenWin.glass'], [8.0, 11.3]],
  chase2: [[6.2, -25.6], [7.4, -27.0], [8.4, -27.0], [9.0, -27.6], [9.1, -29.5], [10.5, -29.6], [10.5, -30.4, 'PROPS.nKeyHit'], [12.3, -32.9, 'PROPS.pantry', 'G.flags.shelfMoved'],
    [13.0, -33.2, 'D.nBack.panel', '!D.nBack.locked'], [13.0, -35.0], [12.0, -40.0], [8.0, -44.9, 'D.nGate.panel', 'D.nGate.open'], [8.0, -47.5], [8.0, -49.0]],
};
function runRoute(w, name, act = 1.0, limit = 60){
  const E = s => w.eval(s), keys = E('keys'), route = ROUTES[name];
  let i = 0, wait = 0, t = 0, go = false;
  while (t < limit){
    t += 0.05; w.eval('tick(lastT + 50)');
    if (E('G.state') === 'dead') return { ok: false, t, why: 'caught at waypoint ' + i };
    if (['escaped', 'end1'].includes(E('G.step'))){ keys.KeyW = keys.ShiftLeft = false; return { ok: true, t }; }
    if (!go){ go = E('MON.m.root.visible && !player.frozen && G.state === "playing"'); if (!go) continue; }
    if (E('player.frozen') || E('G.state') !== 'playing'){ keys.KeyW = false; continue; }
    if (wait > 0){ wait -= 0.05; keys.KeyW = false; continue; }
    const wp = route[i]; if (!wp) break;
    const dx = wp[0] - E('player.pos.x'), dz = wp[1] - E('player.pos.z');
    if (Math.hypot(dx, dz) < 0.35){
      if (wp[2]){ use(w, wp[2]); wait = act; if (wp[3] && !E(wp[3])) continue; }
      i++; continue;
    }
    E(`player.yaw = ${Math.atan2(-dx, -dz)}; player.pitch = 0`); keys.KeyW = true; keys.ShiftLeft = true;
  }
  keys.KeyW = keys.ShiftLeft = false;
  return { ok: false, t, why: 'stuck at waypoint ' + i };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(cond, label, extra){ console.log((cond ? 'OK   ' : 'FAIL ') + label + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) failed++; }
function done(errors, title){
  if (errors.length){ console.log('Errors:\n  ' + errors.slice(0, 20).join('\n  ')); failed++; }
  if (failed){ console.log(`${title}: ${failed} check(s) failed`); process.exit(1); }
  console.log(`${title} passed`);
}
module.exports = { boot, step, use, sleep, check, done, file, runRoute };
