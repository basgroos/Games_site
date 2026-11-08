/* Shared test helpers for Zombie Door Tycoon.
   - loadGame(): runs the game code from the BUILT page (HW_FILE) in a plain vm (no DOM), without calling boot().
   - loadPage(): the whole built page in jsdom with a fake canvas (for UI smoke tests). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILE = process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'zombie-door-tycoon', 'index.html');
function builtScript() {
  const html = fs.readFileSync(FILE, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const main = blocks.filter((b) => b.includes('G.ITEMS'))[0];
  if (!main) throw new Error('game script not found in ' + FILE);
  return main.replace(/\n?boot\(\);\s*$/, '\n');
}
function loadGame(opts = {}) {
  const timers = [], intervals = [];
  const win = Object.assign({ HW_BUILD: { env: 'test', online: opts.online ? { url: 'https://fake.supabase.co', key: 'fake' } : null } }, opts.window || {});
  const ctx = { console, Math, Proxy, Date, JSON, Promise, window: win, Int32Array, Float64Array, Uint8Array,
    setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {}, setInterval: (f) => { intervals.push(f); return intervals.length; }, clearInterval() {},
    localStorage: { getItem: () => null, setItem() {} } };
  vm.createContext(ctx);
  vm.runInContext(builtScript(), ctx, { filename: 'zombie-door-tycoon.js' });
  return { G: ctx.G, run() { timers.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); }, beat() { intervals.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); } };
}
function loadPage(opts = {}) {
  const { JSDOM } = require('jsdom');
  const html = fs.readFileSync(FILE, 'utf8');
  const grad = { addColorStop() {} };
  const makeCtx = (cv) => new Proxy({ canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: (t) => ({ width: String(t).length * 6 }), setLineDash() {}, getImageData: () => ({ data: [] }) },
    { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/games/zombie-door-tycoon/',
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx(this)); };
      w.requestAnimationFrame = (f) => { w.__raf = f; return 1; }; w.AudioContext = undefined; w.scrollTo = () => {};
      if (opts.before) opts.before(w);
    } });
  const w = dom.window, errors = [];
  w.addEventListener('error', (e) => { errors.push(e.message); console.log('WINDOW ERROR', e.message); });
  const origErr = w.console.error; w.console.error = (...a) => { errors.push(String(a[0] && a[0].stack || a[0])); origErr.apply(w.console, a); };
  return { dom, w, E: (s) => w.eval(s), errors };
}
const ok = (c, m) => { if (!c) { console.error('✖ ' + m); throw new Error(m); } console.log('  ✓ ' + m); };
module.exports = { loadGame, loadPage, ok, FILE };
