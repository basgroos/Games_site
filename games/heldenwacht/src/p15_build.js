/* =====================================================================
   Versie-info, staging-label en terugknop naar Bas Games
   window.HW_BUILD wordt door scripts/build.js gezet: { env, version, commit, date, home }
   ===================================================================== */
const HW = Object.assign({ env: 'live', version: 'dev', commit: '', date: '', home: '' }, window.HW_BUILD || {});
function buildLabel() { return `v${HW.version}${HW.commit ? ' · ' + HW.commit.slice(0, 7) : ''}${HW.date ? ' · ' + HW.date.slice(0, 10) : ''}`; }
if (HW.env === 'staging') {
  const rib = document.createElement('div');
  rib.className = 'env-ribbon'; rib.title = 'Testversie: je voortgang hier staat los van de live-versie.';
  rib.textContent = `STAGING · ${buildLabel()}`;
  document.body.appendChild(rib);
  document.title = '[Staging] ' + document.title;
}
if (HW.home) {
  const a = document.createElement('a'); a.href = HW.home; a.className = 'home-link'; a.textContent = '← Bas Games'; a.title = 'Terug naar alle spellen';
  const tb = document.getElementById('topbar'); if (tb) tb.insertBefore(a, tb.firstChild);
}
const _renderSettings7 = renderSettings;
renderSettings = function () {
  _renderSettings7.apply(this, arguments);
  const box = $('#scr-settings .settings'); if (!box || $('#set-version')) return;
  const row = document.createElement('div'); row.className = 'panel set-row'; row.id = 'set-version';
  row.innerHTML = `<div><label>Versie</label><span class="muted">${HW.env === 'staging' ? 'Staging (testversie, aparte voortgang)' : 'Live'} · ${esc(buildLabel())}</span></div>`;
  box.appendChild(row);
};
