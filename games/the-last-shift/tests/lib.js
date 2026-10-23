/* Start de gebouwde The Last Shift-pagina in jsdom. jsdom heeft geen WebGL, dus Three.js (r159 uit node_modules)
   draait met een renderer die niets tekent; al het andere (verhaal, puzzels, deuren, het monster, co-op) is de echte spelcode. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const file = process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'the-last-shift', 'index.html');
const THREE_SRC = fs.readFileSync(path.join(path.dirname(require.resolve('three-r159')), 'three.min.js'), 'utf8');
const STUB = `THREE.WebGLRenderer = function(){ let rt = null; return {
  domElement: document.createElement('canvas'), setPixelRatio(){}, getPixelRatio(){ return 1; }, setSize(){}, render(){}, clear(){}, compile(){},
  setRenderTarget(t){ rt = t; }, getRenderTarget(){ return rt; }, readRenderTargetPixels(){}, getContext(){ return {}; }, dispose(){},
  capabilities: { isWebGL2: true }, extensions: { get(){ return null; } }, shadowMap: { enabled: false, autoUpdate: true }, info: { render: {} } }; };`;

function makeCtx(cv){
  const grad = { addColorStop(){} };
  const img = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, createPattern: () => ({}), measureText: s => ({ width: String(s).length * 7 }),
    createImageData: (w, h) => img(w, h), getImageData: (x, y, w, h) => img(w, h) };
  return new Proxy(base, { get(t, k){ if (k in t) return t[k]; return () => {}; }, set(t, k, v){ t[k] = v; return true; } });
}
// een in-memory vervanger voor de Supabase-kamers, gedeeld door meerdere pagina's in één test
function makeBus(){
  const rooms = {}; const stats = { sent: 0, bytes: 0, byTopic: {} };
  return { stats, room(name, peer){
    const R = rooms[name] || (rooms[name] = { members: new Map() });
    const me = { peer, pres: {}, H: {}, PL: [] };
    const snap = () => [...R.members.values()].map(m => ({ peer: m.peer, isMe: m === me, sameTab: m === me, presence: m.pres }));
    const notifyAll = (joined, left) => R.members.forEach(m => { const s = [...R.members.values()].map(x => ({ peer: x.peer, isMe: x === m, sameTab: x === m, presence: x.pres })); m.PL.forEach(f => f({ peers: s, joined, left, updated: [] })); });
    R.members.set(peer, me); setTimeout(() => notifyAll([{ peer, sameTab: false, presence: me.pres }], []), 0);
    return Promise.resolve({
      emit: async (t, d) => { const json = JSON.stringify(d === undefined ? null : d); stats.sent++; stats.bytes += json.length; stats.byTopic[t] = (stats.byTopic[t] || 0) + 1;
        R.members.forEach(m => { if (m !== me) (m.H[t] || []).forEach(f => setTimeout(() => f({ topic: t, data: JSON.parse(json), peer, isMe: false, sameTab: false }), 0)); }); },
      on: (t, f) => { (me.H[t] = me.H[t] || []).push(f); return () => {}; },
      presence: async p => { me.pres = Object.assign({}, me.pres, JSON.parse(JSON.stringify(p))); for (const k in p) if (p[k] === null) delete me.pres[k]; },
      peers: () => snap(),
      onPeers: f => { me.PL.push(f); setTimeout(() => f({ peers: snap(), joined: snap(), left: [], updated: [] }), 0); return () => {}; },
      connected: () => true, onConnection: f => { setTimeout(() => f(true), 0); return () => {}; },
      leave: async () => { R.members.delete(peer); notifyAll([], [{ peer }]); },
    });
  } };
}
function boot(name, errors, bus){
  let html = fs.readFileSync(file, 'utf8');
  const tag = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.159\.0\/build\/three\.min\.js"><\/script>/;
  if (!tag.test(html)) throw new Error('Three.js-scripttag niet gevonden in de gebouwde pagina');
  html = html.replace(tag, () => '<script>' + THREE_SRC + '</script><script>' + STUB + '</script>');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented|Could not load link/.test(e.message)) errors.push(name + ': ' + e.message); });
  vc.on('error', (...a) => errors.push(name + ' console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/games/the-last-shift/?' + name,
    beforeParse(w){
      w.HTMLCanvasElement.prototype.getContext = function(){ return this._c || (this._c = makeCtx(this)); };
      w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.webkitAudioContext = undefined; w.scrollTo = () => {};
      w.__fast = true;
      w.localStorage.setItem('basgames-player', JSON.stringify({ id: 'id-' + name, name }));
      if (bus) w.__fakeRoom = n => bus.room(n, 'peer-' + name);
    } });
  const w = dom.window;
  w.addEventListener('error', e => errors.push(name + ': ' + e.message));
  w.eval(`window.T = {
    now: 1000,
    get g(){ return window.__game; },
    use(o){ const d = o && (o.userData ? o.userData.interact : o.group && o.group.userData.interact); if (!d) return 'missing'; const g = window.__game;
      if (!g.isGuest() || d.local) d.use({}); else if (d.guest) d.guest({}); else g.net.useRemote(d); return 'ok'; },
    close(){ let n = 0; while (window.__game.ui.modal && n++ < 10) window.__game.ui.closeModal(); },
    tp(x, z, yaw){ const p = window.__game.player; p.pos.set(x, 0, z); if (yaw != null) p.yaw = yaw; p.pitch = 0; },
    step(sec){ for (let t = 0; t < sec; t += .05){ this.now += 50; window.__game.frame(this.now); } },
  }; 1`);
  return w;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(cond, label, extra){
  console.log((cond ? 'OK   ' : 'FAIL ') + label + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!cond){ failed++; if (process.env.GITHUB_ACTIONS) console.log(`::error title=The Last Shift::${label} ${extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''}`); }
}
function done(errors, title){
  if (errors.length){ console.log('Fouten:\n  ' + errors.slice(0, 20).join('\n  ')); failed++; if (process.env.GITHUB_ACTIONS) console.log('::error title=The Last Shift fouten::' + errors.slice(0, 3).join(' | ').slice(0, 500)); }
  if (failed){ console.log(`${title}: ${failed} controle(s) mislukt`); process.exit(1); }
  console.log(`${title} geslaagd`); process.exit(0);
}
async function ready(w){ for (let i = 0; i < 2400; i++){ if (w.document.querySelector('#startMenu.show')) return true; await sleep(50); } return false; }
module.exports = { boot, sleep, check, done, file, makeBus, ready };
