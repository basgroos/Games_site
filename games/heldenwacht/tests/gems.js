// Meer gems (v1.25): bazen, golven en winst geven extra gems.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
  beforeParse(w) { w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx()); }; w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {}; } });
const w = dom.window, errors = [];
w.addEventListener('error', e => { errors.push('window error'); console.log('WINDOW ERROR', e.message, e.lineno); });
const E = s => w.eval(s);
function run(label, fn) { try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); } catch (e) { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); } }

setTimeout(() => {
  E(`setPlayerName('Tester'); Store.data.settings.rareAnim = 'off'; Store.data.settings.tips = false; window.ok = (c, m) => { if (!c) throw new Error(m); };
    window.play = (diff, waves, bosses, win) => {
      closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: diff, mode: 'campaign' }); const g = App.game;
      g.wave = waves; g.cleared = waves;
      for (let i = 0; i < bosses; i++) { const e = g.spawnEnemy('kolos', 50, 5); e.hp = 0; g.kill(e, null); }
      const gems0 = Store.data.gems; if (win) g.win(); else g.lose(); const R = Meta.finishMatch(g);
      return { gained: Store.data.gems - gems0, extra: R.gems27 || 0, row: (R.rows.find(r => /Extra gems/.test(r[0])) || [])[0], bossGems: g.bossGems || 0 };
    };`);
  run('verlies op Normaal: gems voor golven en bazen (vroeger 0)', () => E(`(() => {
    const r = play(1, 9, 1, false); ok(r.extra === 4 + 8, 'extra ' + JSON.stringify(r)); ok(r.gained >= r.extra, 'niet gekregen'); return r;
  })()`));
  run('winst op Normaal met 4 bazen', () => E(`(() => {
    const r = play(1, 20, 4, true); ok(r.bossGems === 32 && r.extra === 32 + 10 + 20, JSON.stringify(r)); return r;
  })()`));
  run('hogere moeilijkheid geeft meer', () => E(`(() => {
    const a = play(1, 20, 2, true), b = play(3, 20, 2, true); ok(b.extra > a.extra, a.extra + ' vs ' + b.extra); return { normaal: a.extra, nachtmerrie: b.extra };
  })()`));
  run('baas toont +gems boven zijn hoofd', () => E(`(() => {
    closeOverlay(); startMatch({ map: MAPS[0].id, diffIdx: 1, mode: 'campaign' }); const g = App.game; g.wave = 3;
    const e = g.spawnEnemy('kolos', 50, 5); e.hp = 0; g.kill(e, null); ok(g.texts.some(t => /gems/.test(t.text)), 'geen tekst'); return true;
  })()`));
  run('geen extra gems als het potje niet begonnen is', () => E(`(() => { const r = play(1, 0, 0, false); ok(r.extra === 0, JSON.stringify(r)); return r; })()`));
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED');
  process.exitCode = errors.length ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 50);
}, 100);
