/* Boots the built The House That Remembers page in jsdom. jsdom has no WebGL, so Three.js (from node_modules)
   runs with a do-nothing renderer; everything else (story, doors, puzzles, the monster, co-op) is the real game code. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const file = process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'house-that-remembers', 'index.html');
const THREE_SRC = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');
const STUB = `THREE.WebGLRenderer = function(){ let rt = null; return {
  domElement: document.createElement('canvas'), setPixelRatio(){}, getPixelRatio(){ return 1; }, setSize(){}, render(){}, clear(){}, compile(){},
  setRenderTarget(t){ rt = t; }, getRenderTarget(){ return rt; }, readRenderTargetPixels(){}, getContext(){ return {}; },
  capabilities: { isWebGL2: false }, extensions: { get(){ return null; } }, shadowMap: { enabled: false, autoUpdate: true }, info: { render: {} } }; };`;

function makeCtx(cv){
  const grad = { addColorStop(){} };
  const img = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
  const base = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, createPattern: () => ({}), measureText: s => ({ width: String(s).length * 7 }),
    createImageData: (w, h) => img(w, h), getImageData: (x, y, w, h) => img(w, h) };
  return new Proxy(base, { get(t, k){ if (k in t) return t[k]; return () => {}; }, set(t, k, v){ t[k] = v; return true; } });
}
// an in-memory stand-in for the Supabase rooms, shared by several pages in one test
function makeBus(){
  const rooms = {};
  return { room(name, peer){
    const R = rooms[name] || (rooms[name] = { members: new Map() });
    const me = { peer, pres: {}, H: {}, PL: [] };
    const snap = () => [...R.members.values()].map(m => ({ peer: m.peer, by: null, isMe: m === me, sameTab: m === me, kind: 'viewer', guest: false, presence: m.pres, updatedAt: Date.now() }));
    const notifyAll = (joined, left) => R.members.forEach(m => { const s = [...R.members.values()].map(x => ({ peer: x.peer, isMe: x === m, sameTab: x === m, presence: x.pres })); m.PL.forEach(f => f({ peers: s, joined, left, updated: [] })); });
    R.members.set(peer, me); setTimeout(() => notifyAll([{ peer, sameTab: false, presence: me.pres }], []), 0);
    return Promise.resolve({
      emit: async (t, d) => { const data = JSON.parse(JSON.stringify(d === undefined ? null : d)); R.members.forEach(m => { if (m !== me) (m.H[t] || []).forEach(f => setTimeout(() => f({ topic: t, data, peer, isMe: false, sameTab: false }), 0)); }); },
      on: (t, f) => { (me.H[t] = me.H[t] || []).push(f); return () => {}; },
      presence: async p => { me.pres = Object.assign({}, me.pres, p); for (const k in p) if (p[k] === null) delete me.pres[k]; },
      peers: () => snap(),
      onPeers: f => { me.PL.push(f); setTimeout(() => f({ peers: snap(), joined: snap(), left: [], updated: [] }), 0); return () => {}; },
      connected: () => true, onConnection: f => { setTimeout(() => f(true), 0); return () => {}; },
      leave: async () => { R.members.delete(peer); notifyAll([], [{ peer }]); },
    });
  } };
}
function boot(name, errors, bus, supa){
  let html = fs.readFileSync(file, 'utf8');
  const tag = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/;
  if (!tag.test(html)) throw new Error('Three.js script tag not found in the built page');
  html = html.replace(tag, () => '<script>' + THREE_SRC + '</script><script>' + STUB + '</script>');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(name + ': ' + e.message); });
  vc.on('error', (...a) => errors.push(name + ' console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://example.org/games/house-that-remembers/?' + name,
    beforeParse(w){
      w.HTMLCanvasElement.prototype.getContext = function(){ return this._c || (this._c = makeCtx(this)); };
      w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.webkitAudioContext = undefined; w.scrollTo = () => {};
      w.localStorage.setItem('basgames-player', JSON.stringify({ id: 'id-' + name, name }));
      if (bus) w.__fakeRoom = n => bus.room(n, 'peer-' + name);
      if (supa) w.supabase = supa.lib;
    } });
  const w = dom.window;
  w.addEventListener('error', e => errors.push(name + ': ' + e.message));
  w.eval(`window.T = {
    now: 1000,
    use(id){ const m = W.interact.find(m => m.userData.it && m.userData.it.id === id); if (!m) return 'missing ' + id; m.userData.it.use(); return 'ok'; },
    close(){ let n = 0; while (UI.stack.length && n++ < 20){ const top = UI.stack[UI.stack.length - 1]; if (top === 'dialogue') UI.dadvance(); else UI.close(top); } },
    tp(x, lv, z, yaw){ P.pos.set(x, 0, z); P.lv = lv; P.y = levelY(lv); if (yaw != null) P.yaw = yaw; P.pitch = 0; P.outside = P.lv === 0 && P.pos.z > 4.05; },
    step(sec){ for (let t = 0; t < sec; t += .05){ this.now += 50; Game.frame(this.now); } },
  }; 1`);
  return w;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(cond, label, extra){ console.log((cond ? 'OK   ' : 'FAIL ') + label + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) failed++; }
function done(errors, title){
  if (errors.length){ console.log('Errors:\n  ' + errors.slice(0, 20).join('\n  ')); failed++; }
  if (failed){ console.log(`${title}: ${failed} check(s) failed`); process.exit(1); }
  console.log(`${title} passed`); process.exit(0);
}
module.exports = { boot, sleep, check, done, file, makeBus };

// A stand-in for supabase-js (createClient → channel: on / subscribe / send / track / presenceState / untrack / unsubscribe),
// shared by several pages, so the game's real Supabase room code (supaRoom) is what gets tested.
function makeSupa(opts = {}){
  const hub = { chans: new Map(), delivered: 0, sent: 0, bytes: 0, maxBytes: 0, log: [] };
  const later = fn => setTimeout(fn, opts.delay || 0);
  function Channel(name, cfg){
    this.name = name; this.key = cfg && cfg.config && cfg.config.presence && cfg.config.presence.key; this.H = []; this.joined = false; this.state = null;
    this.self = !!(cfg && cfg.config && cfg.config.broadcast && cfg.config.broadcast.self);
  }
  const members = name => hub.chans.get(name) || (hub.chans.set(name, new Set()), hub.chans.get(name));
  const pstate = name => { const o = {}; members(name).forEach(c => { if (c.state) o[c.key] = [Object.assign({ presence_ref: 'r' + c.key }, c.state)]; }); return o; };
  Channel.prototype.on = function(type, filter, fn){ this.H.push({ type, event: filter && filter.event, fn }); return this; };
  Channel.prototype.emitLocal = function(type, event, arg){ this.H.forEach(h => { if (h.type === type && (h.event === event || h.event === '*')) h.fn(arg); }); };
  Channel.prototype.subscribe = function(cb){ this.joined = true; members(this.name).add(this); later(() => { cb && cb('SUBSCRIBED'); this.emitLocal('presence', 'sync', {}); }); return this; };
  Channel.prototype.send = function(msg){
    const json = JSON.stringify(msg.payload); hub.sent++; hub.byEvent = hub.byEvent || {}; hub.byEvent[msg.event] = (hub.byEvent[msg.event] || 0) + 1; hub.bytes += json.length; hub.maxBytes = Math.max(hub.maxBytes, json.length);
    if (opts.limitBytes && json.length > opts.limitBytes) return Promise.resolve('error');
    members(this.name).forEach(c => { if (c === this && !this.self) return; hub.delivered++; const payload = JSON.parse(json); later(() => c.emitLocal('broadcast', msg.event, { type: 'broadcast', event: msg.event, payload })); });
    return Promise.resolve('ok');
  };
  Channel.prototype.track = function(state){ hub.tracks = (hub.tracks || 0) + 1; const fresh = !this.state; this.state = JSON.parse(JSON.stringify(state)); const nm = this.name;
    members(nm).forEach(c => { hub.delivered++; later(() => { if (fresh) c.emitLocal('presence', 'join', { key: this.key, newPresences: [this.state] }); c.emitLocal('presence', 'sync', {}); }); }); return Promise.resolve('ok'); };
  Channel.prototype.presenceState = function(){ return pstate(this.name); };
  Channel.prototype.untrack = function(){ this.state = null; return Promise.resolve('ok'); };
  Channel.prototype.unsubscribe = function(){ const nm = this.name, key = this.key; members(nm).delete(this); this.joined = false;
    members(nm).forEach(c => later(() => { c.emitLocal('presence', 'leave', { key, leftPresences: [] }); c.emitLocal('presence', 'sync', {}); })); return Promise.resolve('ok'); };
  hub.lib = { createClient: () => ({ channel: (name, cfg) => new Channel(name, cfg), removeChannel: ch => ch.unsubscribe() }) };
  return hub;
}
module.exports.makeSupa = makeSupa;
