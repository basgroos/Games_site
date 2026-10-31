/* Shared test setup: loads the built Pegfall Arena page in jsdom with a fake 2D canvas. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');

function load() {
  const file = process.env.HW_FILE || path.join(__dirname, '..', '..', '..', 'site', 'games', 'pegfall', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const grad = { addColorStop() {} };
  const makeCtx = (cv) => new Proxy({ canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: (t) => ({ width: String(t).length * 6 }), setLineDash() {} },
    { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/games/pegfall/',
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx(this)); };
      w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {};
    } });
  const w = dom.window, errors = [];
  w.addEventListener('error', (e) => { errors.push(e.message); console.log('WINDOW ERROR', e.message); });
  const origErr = w.console.error; w.console.error = (...a) => { errors.push(String(a[0] && a[0].stack || a[0])); origErr.apply(w.console, a); };
  return { dom, w, E: (s) => w.eval(s), errors };
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 8000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await sleep(20); }
  throw new Error('timed out waiting for ' + label);
}
module.exports = { load, ok, sleep, waitFor };
