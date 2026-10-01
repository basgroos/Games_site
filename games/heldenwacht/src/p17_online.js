/* =====================================================================
   Wereldranglijst via Supabase (tabel "scores", views "leaderboard" en
   "leaderboard_total"). De instellingen komen uit config/online.json en
   worden door scripts/build.js in window.HW_BUILD.online gezet.
   Zonder instellingen blijft alles lokaal werken.
   ===================================================================== */
const NET = (() => {
  const cfg = (window.HW_BUILD && window.HW_BUILD.online) || {};
  const on = !!(cfg.url && cfg.key);
  const env = (window.HW_BUILD && window.HW_BUILD.env) || 'live', game = 'heldenwacht';
  const base = on ? cfg.url.replace(/\/+$/, '') + '/rest/v1/' : '';
  // Nieuwe 'sb_publishable_'-sleutels gaan alleen in apikey; oude JWT-sleutels ook in Authorization
  const headers = on ? Object.assign({ apikey: cfg.key, 'Content-Type': 'application/json' }, /^eyJ/.test(cfg.key) ? { Authorization: 'Bearer ' + cfg.key } : {}) : {};
  const cache = {};
  async function req(path, opts = {}) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const to = ctl ? setTimeout(() => ctl.abort(), 8000) : null;
    try {
      const r = await fetch(base + path, Object.assign({ headers: Object.assign({}, headers, opts.headers || {}), signal: ctl ? ctl.signal : undefined }, opts.body ? { method: 'POST', body: JSON.stringify(opts.body) } : {}));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return opts.body ? null : r.json();
    } finally { if (to) clearTimeout(to); }
  }
  async function count(path) {
    const r = await fetch(base + path, { headers: Object.assign({}, headers, { Prefer: 'count=exact', Range: '0-0' }) });
    if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status);
    const cr = r.headers.get('content-range') || ''; const n = parseInt(cr.split('/')[1], 10); return isFinite(n) ? n : null;
  }
  const q = s => encodeURIComponent(s);
  return {
    on, env, game,
    async submit(e) {
      if (!on) return false;
      const D = Store.data;
      await req('scores', { headers: { Prefer: 'return=minimal' }, body: { env, game, player_id: playerId(), name: playerName(), mode: e.mode, map: e.map, diff: e.diff, score: e.score, waves: e.waves, kills: e.kills, win: e.win, version: (window.HW_BUILD && window.HW_BUILD.version) || '' } });
      for (const k in cache) delete cache[k];
      return true;
    },
    // top van de ranglijst + jouw eigen plek
    async board(mode) {
      if (!on) return null;
      const key = mode; if (cache[key] && Date.now() - cache[key].t < 20000) return cache[key].v;
      const view = mode === 'all' ? 'leaderboard_total' : 'leaderboard';
      const filt = `env=eq.${q(env)}&game=eq.${q(game)}${mode === 'all' ? '' : `&mode=eq.${q(mode)}`}`;
      const [top, me, cnt] = await Promise.all([
        req(`${view}?select=rank,name,score,mode,map,diff,waves,player_id&${filt}&order=rank.asc,created_at.asc&limit=50`),
        req(`${view}?select=rank,name,score,mode,map,diff,waves,player_id&${filt}&player_id=eq.${q(playerId())}&limit=1`),
        count(`${view}?select=player_id&${filt}`).catch(() => null),
      ]);
      const v = { top: top || [], me: (me && me[0]) || null, total: cnt != null ? cnt : (top || []).length };
      cache[key] = { t: Date.now(), v };
      return v;
    },
  };
})();
/* Speler-ID en naam gelden voor heel Bas Games (alle spellen), bewaard in de browser */
const PLAYER_KEY = 'basgames-player';
function readPlayer() { try { const p = JSON.parse(localStorage.getItem(PLAYER_KEY) || 'null'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } }
function writePlayer(p) { try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch (e) { } }
function newUuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
function playerId() {
  const P = readPlayer(), D = Store.data;
  if (!P.id) { P.id = D.playerId || newUuid(); writePlayer(P); }
  if (D.playerId !== P.id) { D.playerId = P.id; Store.save(); }
  return P.id;
}
function playerName() { const P = readPlayer(); return P.name || Store.data.playerName || ''; }
function setPlayerName(n) { const P = readPlayer(); P.name = n; if (!P.id) P.id = Store.data.playerId || newUuid(); writePlayer(P); Store.data.playerName = n; Store.data.playerId = P.id; Store.save(); }
const NAME_RE = /^[\p{L}\p{N} _.\-]{2,16}$/u;
const BAD_WORDS = ['kanker', 'hoer', 'neuk', 'fuck', 'nigger', 'nazi', 'kut', 'lul'];
function cleanName(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (!NAME_RE.test(s)) return null;
  const low = s.toLowerCase().replace(/[^a-z]/g, '');
  if (BAD_WORDS.some(w => low.includes(w))) return null;
  return s;
}

/* ---------- naam kiezen ---------- */
function openNameDialog(after, first) {
  const D = Store.data;
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-labelledby="nm-title">
    <form class="panel code-card" id="name-form" autocomplete="off">
      <button type="button" class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
      <h2 id="nm-title" style="color:var(--pow);font-size:24px">${first ? 'Hoe heet je?' : 'Jouw spelersnaam'}</h2>
      <label for="name-in" class="muted">${first ? 'Kies een naam voordat je gaat spelen. ' : ''}Deze naam komt bij je scores te staan en wordt in deze browser onthouden. 2 tot 16 tekens.</label>
      <input id="name-in" class="name-in" maxlength="16" value="${esc(playerName())}" placeholder="Naam">
      <p class="code-err" id="name-err" aria-live="polite"></p>
      <button type="submit" class="btn btn-pow">${first ? 'Spelen' : 'Opslaan'}</button>
    </form></div>`;
  const inp = $('#name-in'); inp.focus(); inp.select();
  $('#name-form').addEventListener('submit', ev => {
    ev.preventDefault(); const n = cleanName(inp.value);
    if (!n) { $('#name-err').textContent = 'Gebruik 2 tot 16 letters, cijfers of spaties, en geen scheldwoorden.'; Sfx.play('error'); return; }
    setPlayerName(n); closeOverlay(); Sfx.play('coin'); toast(`Je speelt nu als ${n}.`, 'good');
    if (after) after(); else if (App.screen === 'leaderboard') renderLeaderboard();
  });
}

/* ---------- na elk potje insturen ---------- */
const _showResults9 = showResults;
showResults = function () {
  _showResults9.apply(this, arguments);
  if (!NET.on) return;
  const S = scoreStore(), e = S.recent[0]; if (!e || Date.now() - e.t > 5000) return;
  const box = document.querySelector('.results-card .score-res'); if (!box) return;
  const line = document.createElement('span'); line.className = 'muted net-line'; box.appendChild(line);
  if (!playerName()) { line.innerHTML = `Kies een naam voor de wereldranglijst: <span class="name-inline"><input id="res-name" class="name-in sm" maxlength="16" placeholder="Naam"><button class="btn btn-sm btn-pow" data-act="name-inline">Opslaan</button></span>`; return; }
  sendScore(e, line);
};
async function sendScore(e, line) {
  if (line) line.textContent = 'Score versturen…';
  try {
    if (!e.sent) { if (e.sending) return; e.sending = true; try { await NET.submit(e); e.sent = true; } finally { delete e.sending; } Store.save(); }
    const b = await NET.board(e.mode);
    if (line && b && b.me) line.innerHTML = `Wereldranglijst ${esc(SCORE_MODES.find(m => m[0] === e.mode)[1])}: <b>#${b.me.rank}</b> van ${fmt(b.total)}${b.me.score > e.score ? ` (je beste: ${fmt(b.me.score)})` : ''}`;
    else if (line) line.textContent = 'Score verstuurd.';
  } catch (err) { if (line) line.textContent = 'Ranglijst niet bereikbaar. Je score staat wel bij je eigen scores.'; }
}
// Niet verstuurde scores later alsnog insturen (bijv. na het kiezen van een naam of als je offline was)
async function flushScores() {
  if (!NET.on || !playerName()) return;
  const S = scoreStore(), todo = S.recent.filter(e => !e.sent && !e.sending && Date.now() - e.t < 7 * 864e5).slice(0, 5);
  for (const e of todo) { e.sending = true; try { await NET.submit(e); e.sent = true; } catch (err) { break; } finally { delete e.sending; } }
  if (todo.length) Store.save();
}

/* ---------- wereldranglijst bovenaan het scores-scherm ---------- */
App.netMode = App.netMode || 'all';
const _renderLB9 = renderLeaderboard;
renderLeaderboard = function () {
  _renderLB9.apply(this, arguments);
  if (!NET.on) return;
  const scr = $('#scr-leaderboard'), head = scr.querySelector('.screen-head'); if (!head) return;
  const D = Store.data, m = App.netMode;
  const sec = document.createElement('div'); sec.className = 'panel card world-lb';
  sec.innerHTML = `<div class="wl-head"><div><span class="kicker">Alle spelers</span><h3>Wereldranglijst</h3></div>
      <div class="wl-me">${playerName() ? `Je speelt als <b>${esc(playerName())}</b>` : 'Je hebt nog geen naam'} <button class="btn btn-sm" data-act="name-edit">${playerName() ? 'Wijzig' : 'Naam kiezen'}</button></div></div>
    ${tabsHtml('net-mode', m, SCORE_MODES.filter(x => x[0] !== 'other'))}
    <div id="wl-body"><p class="muted">Ranglijst laden…</p></div>`;
  head.after(sec);
  loadWorld(m);
};
async function loadWorld(m) {
  const body = document.getElementById('wl-body'); if (!body) return;
  try {
    await flushScores();
    const b = await NET.board(m); if (App.netMode !== m || !document.getElementById('wl-body')) return;
    const me = playerId(), D = Store.data;
    const rows = b.top.map(r => `<tr class="${r.player_id === me ? 'me' : ''}"><td class="rk">${r.rank}</td><td>${esc(r.name)}${r.player_id === me ? ' <span class="you">jij</span>' : ''}<span class="ttl">${esc(m === 'all' ? (SCORE_MODES.find(x => x[0] === r.mode) || [, r.mode])[1] + ' · ' : '')}${esc((MAPS.concat(SPECIAL_MAPS).find(x => x.id === r.map) || {}).name || r.map || '')}${r.diff != null && DIFFS[r.diff] ? ' · ' + esc(DIFFS[r.diff].name) : ''}</span></td><td class="v">${fmt(r.score)}</td></tr>`).join('');
    const mine = b.me && !b.top.some(r => r.player_id === me) ? `<tr class="me gap"><td class="rk">${b.me.rank}</td><td>${esc(b.me.name)} <span class="you">jij</span></td><td class="v">${fmt(b.me.score)}</td></tr>` : '';
    body.innerHTML = `<p class="wl-pos">${b.me ? `Jouw plek: <b>#${b.me.rank}</b> van ${fmt(b.total)} spelers` : playerName() ? 'Speel een potje om op de ranglijst te komen.' : 'Kies een naam en speel een potje om op de ranglijst te komen.'}</p>
      <div class="lb-wrap"><table class="lb"><thead><tr><th>#</th><th>Speler</th><th style="text-align:right">Score</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="muted" style="padding:16px">Nog niemand op deze ranglijst. Wees de eerste!</td></tr>'}${mine}</tbody></table></div>`;
  } catch (err) {
    body.innerHTML = '<p class="muted">De wereldranglijst is nu niet bereikbaar. Probeer het later opnieuw.</p>';
  }
}
Object.assign(ACTIONS, {
  'net-mode': b => { App.netMode = b.dataset.tab; Sfx.play('click'); $$('[data-act="net-mode"]').forEach(x => x.setAttribute('aria-pressed', x === b)); const body = document.getElementById('wl-body'); if (body) body.innerHTML = '<p class="muted">Ranglijst laden…</p>'; loadWorld(App.netMode); },
  'name-edit': () => openNameDialog(),
  'name-inline': () => {
    const inp = document.getElementById('res-name'), line = inp && inp.closest('.net-line'); if (!inp) return;
    const n = cleanName(inp.value); if (!n) { toast('Gebruik 2 tot 16 letters, cijfers of spaties, en geen scheldwoorden.', 'bad'); Sfx.play('error'); return; }
    setPlayerName(n); const e = scoreStore().recent[0]; if (e) sendScore(e, line);
  },
});

/* ---------- naam vragen zodra iemand gaat spelen ---------- */
const _startMatch9 = startMatch;
startMatch = function (o) {
  if (!playerName()) { openNameDialog(() => startMatch(o), true); return; }
  return _startMatch9.apply(this, arguments);
};
// Naam ook tonen in het profiel en op het startscherm
const _renderProfile9 = renderProfile;
renderProfile = function () {
  _renderProfile9.apply(this, arguments);
  const h = document.querySelector('#scr-profile .screen-head'); if (!h || document.getElementById('pf-name')) return;
  const d = document.createElement('div'); d.id = 'pf-name'; d.className = 'wl-me';
  d.innerHTML = `${playerName() ? `Spelersnaam: <b>${esc(playerName())}</b>` : 'Nog geen spelersnaam'} <button class="btn btn-sm" data-act="name-edit">${playerName() ? 'Wijzig' : 'Kiezen'}</button>`;
  h.appendChild(d);
};
