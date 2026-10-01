/* =====================================================================
   CODE "basheeftaura" — Aura-paneel: stel zelf in hoeveel je van alles hebt
   ===================================================================== */
const AURA_CUR = [
  ['coins', 'Munten', 'coin-ico'],
  ['gems', 'Gems', 'gem-ico'],
  ['tokens', 'Trait Tokens', 'tok-ico'],
  ['raidTokens', 'Raid Tokens', ''],
];
const AURA_MAX = 999999999;
const auraNum = v => { const n = Math.floor(Number(String(v).replace(/[^\d]/g, ''))); return isFinite(n) ? Math.max(0, Math.min(AURA_MAX, n)) : 0; };

CODES.basheeftaura = { aura: true };
const _redeem5 = redeemCode;
redeemCode = function (code) {
  if (String(code || '').trim().toLowerCase() === 'basheeftaura') { Sfx.play('r-ultra'); openAuraPanel(); return; }
  return _redeem5(code);
};

function openAuraPanel() {
  const D = Store.data, ev = Meta.activeEvent ? Meta.activeEvent() : null;
  App.aura = { heroes: Object.fromEntries(HEROES.filter(h => !h.hidden).map(h => [h.id, D.heroes[h.id] ? D.heroes[h.id].level || 1 : 0])), filter: 'all' };
  const numIn = (id, label, val, ico) => `<label class="aura-f">${ico ? `<span class="${ico}"></span>` : ''}<span>${label}</span><input type="text" inputmode="numeric" data-aura="${id}" value="${val}"></label>`;
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-labelledby="aura-title">
    <div class="panel modal-card aura-card">
      <button type="button" class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
      <span class="kicker">Code: basheeftaura</span>
      <h2 id="aura-title" class="aura-h">Aura-paneel</h2>
      <p class="muted" style="margin:0 0 14px">Stel zelf in hoeveel je van alles hebt. Er verandert pas iets als je op <b>Opslaan</b> drukt.</p>
      <div class="section-title">Valuta</div>
      <div class="aura-grid">
        ${AURA_CUR.map(([k, l, ico]) => numIn(k, l, D[k] || 0, ico)).join('')}
        ${ev ? numIn('eventCur', `${esc(ev.def.currency || 'Eventmunten')} (event)`, Meta.evState(ev).cur || 0, '') : `<div class="aura-f aura-off"><span>Eventmunten</span><small>Er loopt nu geen event</small></div>`}
      </div>
      <div class="section-title">Tickets</div>
      <div class="aura-grid">${Object.keys(TICKETS).map(k => numIn('t-' + k, esc(TICKETS[k].name), D.tickets[k] || 0, '')).join('')}</div>
      <div class="section-title">Account</div>
      <div class="aura-grid">${numIn('level', `Level (1–${PLAYER_MAX_LEVEL})`, D.level, '')}</div>
      <div class="section-title" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">Helden <span class="muted num" id="aura-cnt" style="font-size:14px"></span>
        <span style="flex:1"></span>
        <button type="button" class="btn btn-sm" data-act="aura-all" data-v="1">Alle helden</button>
        <button type="button" class="btn btn-sm" data-act="aura-all" data-v="max">Alles level ${MAX_LEVEL}</button>
        <button type="button" class="btn btn-sm" data-act="aura-all" data-v="0">Geen helden</button></div>
      <div class="filters" role="group" aria-label="Filter">${[['all', 'Alle'], ...RARITY_ORDER.map(r => [r, RARITIES[r].label])].map(([k, l]) => `<button type="button" data-act="aura-filter" data-f="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin:6px 0">Klik op een held om hem aan of uit te zetten. Met − en + kies je het level.</p>
      <div class="aura-heroes" id="aura-heroes"></div>
      <p class="code-err" id="aura-err" aria-live="polite"></p>
      <div class="aura-foot"><button type="button" class="btn" data-act="modal-close">Annuleren</button><button type="button" class="btn btn-pow" data-act="aura-save">Opslaan</button></div>
    </div></div>`;
  renderAuraHeroes();
}
function renderAuraHeroes() {
  const A = App.aura, box = $('#aura-heroes'); if (!box) return;
  const list = HEROES.filter(h => !h.hidden && (A.filter === 'all' || h.rarity === A.filter)).sort((a, b) => rarOrd(b.rarity) - rarOrd(a.rarity) || a.name.localeCompare(b.name));
  box.innerHTML = list.map(h => { const lv = A.heroes[h.id]; return `<div class="aura-h-card ${lv ? 'on' : ''}" style="--rc:${rarColor(h.rarity)}">
    <button type="button" class="aura-pick" data-act="aura-toggle" data-id="${h.id}" aria-pressed="${!!lv}" title="${esc(h.name)}">${portrait(h.id, '', 0)}<b>${esc(h.name)}</b><span class="chip rar rar-${h.rarity}">${RARITIES[h.rarity].label}</span></button>
    <div class="aura-lv">${lv ? `<button type="button" data-act="aura-lv" data-id="${h.id}" data-d="-1" aria-label="Level omlaag">−</button><span class="num">Lv ${lv}</span><button type="button" data-act="aura-lv" data-id="${h.id}" data-d="1" aria-label="Level omhoog">+</button>` : '<span class="muted">niet in bezit</span>'}</div></div>`; }).join('');
  hydratePortraits(box);
  const n = Object.values(A.heroes).filter(Boolean).length; const c = $('#aura-cnt'); if (c) c.textContent = `${n} / ${Object.keys(A.heroes).length} gekozen`;
}
function saveAura() {
  const D = Store.data, A = App.aura, val = k => { const el = document.querySelector(`[data-aura="${k}"]`); return el ? auraNum(el.value) : null; };
  const owned = Object.keys(A.heroes).filter(id => A.heroes[id]);
  if (!owned.length) { $('#aura-err').textContent = 'Kies minstens één held.'; Sfx.play('error'); return; }
  for (const [k] of AURA_CUR) { const v = val(k); if (v != null) D[k] = v; }
  const ev = Meta.activeEvent ? Meta.activeEvent() : null; if (ev) { const v = val('eventCur'); if (v != null) Meta.evState(ev).cur = v; }
  for (const k of Object.keys(TICKETS)) { const v = val('t-' + k); if (v != null) D.tickets[k] = v; }
  const lv = val('level'); if (lv != null) { D.level = Math.max(1, Math.min(PLAYER_MAX_LEVEL, lv)); D.xp = 0; }
  for (const id in A.heroes) {
    const l = A.heroes[id];
    if (!l) { delete D.heroes[id]; continue; }
    if (!D.heroes[id]) D.heroes[id] = { level: l, copies: 1 }; else D.heroes[id].level = l;
    Meta.ensureHero(id);
  }
  D.team = D.team.filter(id => D.heroes[id]);
  if (!D.team.length) D.team = owned.sort((a, b) => rarOrd(HERO[b].rarity) - rarOrd(HERO[a].rarity)).slice(0, 6);
  Meta.ensureAll(); Meta.checkAchievements(); Store.save(); closeOverlay();
  Sfx.play('coin'); toast('Aura toegepast! Je spullen zijn aangepast.', 'good');
  if (typeof updateTopbar === 'function') updateTopbar();
  nav(App.screen || 'home');
}
Object.assign(ACTIONS, {
  'aura-toggle': b => { const A = App.aura, id = b.dataset.id; A.heroes[id] = A.heroes[id] ? 0 : 1; Sfx.play('click'); renderAuraHeroes(); },
  'aura-lv': b => { const A = App.aura, id = b.dataset.id; A.heroes[id] = Math.max(1, Math.min(MAX_LEVEL, (A.heroes[id] || 1) + +b.dataset.d)); Sfx.play('click'); renderAuraHeroes(); },
  'aura-all': b => { const A = App.aura, v = b.dataset.v; for (const id in A.heroes) A.heroes[id] = v === '0' ? 0 : v === 'max' ? MAX_LEVEL : (A.heroes[id] || 1); Sfx.play('click'); renderAuraHeroes(); },
  'aura-filter': b => { App.aura.filter = b.dataset.f; $$('[data-act="aura-filter"]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderAuraHeroes(); },
  'aura-save': () => saveAura(),
});
