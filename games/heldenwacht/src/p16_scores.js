/* =====================================================================
   Scores (site-versie): elk potje krijgt een score. Beste potjes, records
   en recente potjes worden op dit apparaat bewaard.
   ===================================================================== */
const SCORE_MODES = [['all', 'Alles'], ['campaign', 'Campagne'], ['endless', 'Endless'], ['bossrush', 'Boss Rush'], ['dungeon', 'Dungeon'], ['raid', 'Raids'], ['other', 'Overig']];
const SCORE_MODE_MULT = { endless: 1.2, bossrush: 1.5, raid: 1.6, dungeon: 1.4 };
const scoreModeOf = m => (['campaign', 'endless', 'bossrush', 'dungeon', 'raid'].includes(m) ? m : 'other');
function calcScore(g, waves, win) {
  const base = waves * 100 + g.kills * 2 + g.bossKills * 300 + (win ? 1500 : 0) + (win && g.ms.hpLost === 0 ? 500 : 0);
  return Math.round(base * (DIFF_MULT[g.diffIdx] || 1) * (SCORE_MODE_MULT[g.mode] || 1));
}
function scoreStore() {
  const D = Store.data;
  if (!D.scores || typeof D.scores !== 'object') D.scores = {};
  const S = D.scores; S.recent = Array.isArray(S.recent) ? S.recent : []; S.top = Array.isArray(S.top) ? S.top : [];
  return S;
}
const _finishMatch8 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const R = _finishMatch8.call(this, g);
  if (g.mode === 'coop' || g.wave === 0 || g._scored) return R;
  g._scored = true;
  const win = !!g.result.win, waves = win ? (g.totalWaves === Infinity ? g.cleared : g.totalWaves) : g.cleared;
  const S = scoreStore(), score = calcScore(g, waves, win), mode = scoreModeOf(g.mode);
  const prevBest = S.top.filter(e => e.mode === mode).reduce((m, e) => Math.max(m, e.score), 0);
  const prevMap = S.top.filter(e => e.map === g.map.id && e.diff === g.diffIdx && e.mode === mode).reduce((m, e) => Math.max(m, e.score), 0);
  const entry = { t: Date.now(), score, mode, label: modeLabel(g), map: g.map.id, mapName: g.map.name, diff: g.diffIdx, win, quit: !!g.result.quit, waves, kills: g.kills, bosses: g.bossKills, dmg: Math.round(g.ms.dmg), time: Math.round(g.time),
    heroes: Object.keys(g.ms.heroUse).sort((a, b) => g.ms.heroUse[b].dmg - g.ms.heroUse[a].dmg).slice(0, 4) };
  S.recent.unshift(entry); S.recent.length = Math.min(S.recent.length, 30);
  S.top.push(entry); S.top.sort((a, b) => b.score - a.score);
  // per modus de beste 25 bewaren
  const keep = {}; S.top = S.top.filter(e => (keep[e.mode] = (keep[e.mode] || 0) + 1) <= 25);
  Store.save();
  R.score = { score, record: score > prevBest, mapRecord: score > prevMap && prevMap > 0, prev: prevBest };
  return R;
};
const _showResults8 = showResults;
showResults = function () {
  _showResults8.apply(this, arguments);
  const g = App.game, card = document.querySelector('.results-card'); if (!card || !g) return;
  const S = scoreStore(), e = S.recent[0]; if (!e || Date.now() - e.t > 5000) return;
  const best = S.top.filter(x => x.mode === e.mode)[0], rec = best && best.t === e.t && S.top.filter(x => x.mode === e.mode).length > 1;
  const el = document.createElement('div'); el.className = 'score-res' + (rec ? ' rec' : '');
  el.innerHTML = `<span class="kicker">Score</span><b class="num">${fmt(e.score)}</b>${rec ? '<span class="rec-tag">Nieuw record!</span>' : best ? `<span class="muted">Record ${esc(SCORE_MODES.find(m => m[0] === e.mode)[1])}: ${fmt(best.score)}</span>` : ''}`;
  const h = card.querySelector('h2'); if (h && h.nextElementSibling) h.nextElementSibling.after(el); else card.appendChild(el);
  if (rec) Sfx.play('r-legendary');
};

/* ---------- Scores-scherm (vervangt de online ranglijst) ---------- */
App.scoreMode = App.scoreMode || 'all';
const fmtTime = s => `${Math.floor(s / 60)}:${pad2(Math.round(s % 60))}`;
const fmtDate = t => { const d = new Date(t); return `${d.getDate()}-${d.getMonth() + 1} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
function scoreRow(e, i) {
  return `<tr class="${e.win ? '' : 'lost'}"><td class="rk">${i + 1}</td>
    <td><b>${esc(e.mapName)}</b><span class="ttl">${esc(e.label)}${e.mode === 'campaign' || e.mode === 'other' ? ' · ' + esc((DIFFS[e.diff] || {}).name || '') : ''} · ${e.win ? 'gewonnen' : e.quit ? 'opgegeven' : 'verloren'} · ${fmtDate(e.t)}</span></td>
    <td class="heroes">${e.heroes.map(id => HERO[id] ? portrait(id, 'sc-pt', 0) : '').join('')}</td>
    <td class="num">${e.waves} golven<span class="ttl">${fmt(e.kills)} kills · ${fmtTime(e.time)}</span></td>
    <td class="v">${fmt(e.score)}</td></tr>`;
}
renderLeaderboard = function () {
  const S = scoreStore(), D = Store.data, st = D.stats, se = Meta.season(), m = App.scoreMode;
  const top = S.top.filter(e => m === 'all' || e.mode === m).slice(0, 15), recent = S.recent.slice(0, 15);
  const tiles = [['Hoogste golf', st.highestWave], ['Endless-record', st.endlessBest], ['Boss Rush', `${st.bossrushBest} bazen`], ['Dungeon-diepte', st.dungeonBest || 0],
    ['Meeste schade', fmt(Math.round(st.maxDmg))], ['Bazen verslagen', fmt(st.bossKills)], ['Vijanden verslagen', fmt(st.kills)], ['Raids voltooid', st.raidsDone],
    ['Potjes gespeeld', fmt(st.games)], ['Overwinningen', fmt(st.wins)]];
  const fastest = MAPS.filter(mp => st.fastest[mp.id]).map(mp => [mp.name, fmtTime(st.fastest[mp.id])]);
  $('#scr-leaderboard').innerHTML = `<div class="screen-head"><div><span class="kicker">Op dit apparaat</span><h2>Scores</h2></div>
      <div class="muted num" style="font-size:18px">${S.recent.length ? `Beste score: ${fmt((S.top[0] || {}).score || 0)}` : ''}</div></div>
    <p class="muted" style="margin:-6px 0 16px">Elk potje krijgt een score: golven, kills en bazen, plus een bonus voor winnen en voor geen levens verliezen. Hogere moeilijkheden en zwaardere modi tellen zwaarder mee.</p>
    ${tabsHtml('score-mode', m, SCORE_MODES)}
    <div class="panel card"><div class="section-title" style="margin-top:0">Beste potjes</div>
      <div class="lb-wrap"><table class="lb sc"><thead><tr><th>#</th><th>Potje</th><th>Helden</th><th>Resultaat</th><th style="text-align:right">Score</th></tr></thead><tbody>
      ${top.length ? top.map(scoreRow).join('') : `<tr><td colspan="5" class="muted" style="padding:18px">Nog geen scores${m === 'all' ? '' : ' in deze modus'}. Speel een potje!</td></tr>`}
      </tbody></table></div></div>
    <div class="two-col" style="margin-top:16px">
      <div class="panel card"><div class="section-title" style="margin-top:0">Records</div>
        <div class="stat-table">${tiles.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
        <div class="section-title">Dit seizoen · ${esc(seasonName())}</div>
        <div class="stat-table">${[['Hoogste golf', se.wave], ['Endless', se.endless], ['Boss Rush', se.bossrush], ['Bazen', fmt(se.bosses)], ['Kills', fmt(se.kills)], ['Meeste schade', fmt(Math.round(se.damage))]].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
        ${fastest.length ? `<div class="section-title">Snelste overwinning per map</div><div class="stat-table">${fastest.map(([k, v]) => `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join('')}</div>` : ''}
      </div>
      <div class="panel card"><div class="section-title" style="margin-top:0">Recente potjes</div>
        <div class="lb-wrap"><table class="lb sc"><tbody>${recent.length ? recent.map(scoreRow).join('') : '<tr><td class="muted" style="padding:18px">Nog geen potjes gespeeld.</td></tr>'}</tbody></table></div>
      </div>
    </div>`;
  hydratePortraits($('#scr-leaderboard'));
};
Object.assign(ACTIONS, {
  'score-mode': b => { App.scoreMode = b.dataset.tab; Sfx.play('click'); renderLeaderboard(); },
  'lb-open': b => { App.scoreMode = b.dataset.cat === 'dungeon' ? 'dungeon' : b.dataset.cat === 'endless' ? 'endless' : 'all'; nav('leaderboard'); },
});
// De oude online ranglijst en co-op gebruiken we hier niet
Online.init = function () {}; Online.submit = function () {}; Online.submitCoop = function () {};
