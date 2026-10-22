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
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(cond, label, extra){ console.log((cond ? 'OK   ' : 'FAIL ') + label + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) failed++; }
function done(errors, title){
  if (errors.length){ console.log('Errors:\n  ' + errors.slice(0, 20).join('\n  ')); failed++; }
  if (failed){ console.log(`${title}: ${failed} check(s) failed`); process.exit(1); }
  console.log(`${title} passed`);
}
module.exports = { boot, step, use, sleep, check, done, file };
