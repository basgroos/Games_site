const { JSDOM } = require('jsdom');
const fs = require('fs');
let html = fs.readFileSync(process.env.HW_FILE || require('path').join(__dirname, '..', '..', '..', 'site', 'games', 'heldenwacht', 'index.html'), 'utf8');
const WITH_DB = process.argv.includes('--db');
const QUICK = process.argv.includes('--quick');

function makeCtx() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), setLineDash() {} };
  return new Proxy(base, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
// Nagebootste Supabase (PostgREST) voor de wereldranglijst
html = html.replace(/"online":(null|\{[^}]*\})/, '"online":{"url":"https://fake.supabase.co","key":"anon-test"}');
const DB = [];
function views(total) {
  const best = {};
  for (const r of DB) { const k = [r.env, r.game, total ? '' : r.mode, r.player_id].join('|'); if (!best[k] || r.score > best[k].score) best[k] = r; }
  const rows = Object.values(best); const grp = {};
  for (const r of rows) { const g = [r.env, r.game, total ? '' : r.mode].join('|'); (grp[g] = grp[g] || []).push(r); }
  for (const g in grp) { grp[g].sort((a, b) => b.score - a.score); grp[g].forEach((r, i) => { r.rank = i && grp[g][i - 1].score === r.score ? grp[g][i - 1].rank : i + 1; }); }
  return rows.map(r => Object.assign({}, r));
}
const calls = [];
function fakeFetch(url, opts = {}) {
  calls.push((opts.method || 'GET') + ' ' + url.replace('https://fake.supabase.co/rest/v1/', ''));
  const u = new URL(url), name = u.pathname.split('/').pop(), H = opts.headers || {};
  if (H.apikey !== 'anon-test') return Promise.resolve({ ok: false, status: 401, headers: { get: () => null }, json: async () => ({}) });
  if (opts.method === 'POST') { const b = JSON.parse(opts.body); DB.push(Object.assign({ created_at: new Date().toISOString() }, b)); return Promise.resolve({ ok: true, status: 201, headers: { get: () => null }, json: async () => null }); }
  let rows = name === 'leaderboard_total' ? views(true) : name === 'leaderboard' ? views(false) : DB.slice();
  for (const [k, v] of u.searchParams) if (v.startsWith('eq.')) rows = rows.filter(r => String(r[k]) === v.slice(3));
  rows.sort((a, b) => a.rank - b.rank);
  const lim = +u.searchParams.get('limit') || rows.length;
  const total = rows.length;
  return Promise.resolve({ ok: true, status: 200, headers: { get: k => (k.toLowerCase() === 'content-range' ? `0-0/${total}` : null) }, json: async () => rows.slice(0, lim) });
}
function boot() {
  return new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(w) {
      w.HTMLCanvasElement.prototype.getContext = function () { return this._c || (this._c = makeCtx()); };
      w.requestAnimationFrame = () => 0; w.AudioContext = undefined; w.scrollTo = () => {}; w.fetch = fakeFetch;
    } });
}
const errors = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
function run(label, fn) { return Promise.resolve().then(fn).then(r => console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''), e => { errors.push(label); console.log('FAIL', label, e.stack.split('\n').slice(0, 4).join(' | ')); }); }
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
const dom = boot(), w = dom.window, d = w.document;
w.addEventListener('error', e => { errors.push('window error'); console.log('WINDOW ERROR', e.message, e.lineno); });
const E = s => w.eval(s);
const click = el => { if (!el) throw new Error('element niet gevonden'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
const $ = s => d.querySelector(s);

function playQuick(mapId, waves) {
  E(`startMatch({ map: '${mapId}', diffIdx: 1, mode: 'campaign' })`);
  const g = E('App.game'); if (!g) throw new Error('geen potje');
  g.wave = waves; g.cleared = waves; g.kills = waves * 12; g.bossKills = 1; g.time = 300; g.quit();
  E('handleGameEvents(); showResults();');
  return g;
}
(async () => {
  await tick(50);
  // eerdere spelers op de ranglijst
  DB.push({ env: 'live', game: 'heldenwacht', player_id: '11111111-1111-4111-8111-111111111111', name: 'Sanne', mode: 'campaign', map: 'stad', diff: 1, score: 99999, waves: 20, kills: 400, win: true, created_at: '2026-01-01' });
  DB.push({ env: 'live', game: 'heldenwacht', player_id: '22222222-2222-4222-8222-222222222222', name: 'Tim', mode: 'endless', map: 'stad', diff: 1, score: 500, waves: 5, kills: 40, win: false, created_at: '2026-01-01' });
  DB.push({ env: 'staging', game: 'heldenwacht', player_id: '33333333-3333-4333-8333-333333333333', name: 'Test', mode: 'campaign', map: 'stad', diff: 1, score: 1e6, waves: 5, kills: 40, win: false, created_at: '2026-01-01' });

  await run('naam gevraagd bij eerste potje', () => {
    E(`startMatch({ map: 'stad', diffIdx: 1, mode: 'campaign' })`);
    ok(!E('App.game'), 'potje mocht niet starten zonder naam'); ok($('#name-form'), 'naamvenster ontbreekt');
    $('#name-in').value = 'x'; $('#name-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
    ok(!E('App.game') && /2 tot 16/.test($('#name-err').textContent), 'te korte naam geaccepteerd');
    $('#name-in').value = '  Bas  '; $('#name-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
    ok(E('App.game'), 'potje start niet na naam'); E('App.game.quit(); handleGameEvents(); closeOverlay(); exitGame("home")');
    return { naam: E('playerName()'), opgeslagen: JSON.parse(w.localStorage.getItem('basgames-player')).name };
  });
  await run('score ingestuurd met naam', async () => {
    E('closeOverlay()'); playQuick('stad', 12); await tick(80);
    const mine = DB.filter(r => r.name === 'Bas'); ok(mine.length === 1, 'score niet ingestuurd (' + mine.length + ')');
    ok(mine[0].player_id === E('playerId()') && mine[0].env === 'live' && mine[0].mode === 'campaign', 'verkeerde velden');
    const line = $('.results-card .net-line'); ok(line && /#2 van 2/.test(line.textContent), 'plek niet getoond: ' + (line && line.textContent));
    return { score: mine[0].score, regel: line.textContent };
  });
  await run('wereldranglijst toont top en jouw plek', async () => {
    E('closeOverlay(); exitGame("home"); App.netMode = "all"; nav("leaderboard")'); await tick(80);
    const txt = $('#wl-body').textContent; ok(/Sanne/.test(txt) && /Bas/.test(txt) && /Tim/.test(txt), 'spelers ontbreken'); ok(!/Test/.test(txt), 'staging-score op live-lijst');
    ok(/Jouw plek: #2 van 3/.test(txt), 'plek klopt niet: ' + txt.slice(0, 80));
    click($('[data-act="net-mode"][data-tab="endless"]')); await tick(80);
    ok(/Tim/.test($('#wl-body').textContent) && !/Sanne/.test($('#wl-body').textContent), 'filter op modus werkt niet');
    return $('.wl-pos').textContent;
  });
  await run('naam wijzigen', () => { click($('[data-act="name-edit"]')); $('#name-in').value = 'Kanker'; $('#name-form').dispatchEvent(new w.Event('submit', { cancelable: true })); ok(E('playerName()') === 'Bas', 'scheldwoord geaccepteerd'); $('#name-in').value = 'Bas G'; $('#name-form').dispatchEvent(new w.Event('submit', { cancelable: true })); return E('playerName()'); });
  await run('offline: score blijft lokaal en wordt later verstuurd', async () => {
    const real = w.fetch; w.fetch = () => Promise.reject(new Error('offline'));
    playQuick('stad', 15); await tick(80);
    ok(/niet bereikbaar/.test($('.results-card .net-line').textContent), 'geen offline-melding');
    w.fetch = real; E('closeOverlay(); exitGame("home"); nav("leaderboard")'); await tick(120);
    return { verstuurd: DB.filter(r => r.player_id === E('playerId()')).length };
  });
  console.log(errors.length ? 'ERRORS: ' + errors.join(', ') : 'ALL PASSED'); process.exitCode = errors.length ? 1 : 0;
})();
