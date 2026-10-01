/* =====================================================================
   Animatie voor zeldzame helden. Speelt bij elke manier waarop je een held
   krijgt (gacha, shop, codes, beloningen). In Instellingen kies je vanaf
   welke rarity hij speelt en of dat alleen voor nieuwe helden is.
   ===================================================================== */
const RareQ = [];
function rareFrom() { const v = Store.data.settings.rareAnim; return v === 'off' || RARITIES[v] ? v : 'legendary'; }
function rareWanted(id, res) {
  const H = HERO[id], from = rareFrom(); if (!H || H.hidden || from === 'off') return false;
  if (Store.data.settings.rareOnlyNew && !(res && res.isNew)) return false;
  return rarOrd(H.rarity) >= rarOrd(from);
}
const _grantHero12 = grantHero;
grantHero = function (id) {
  const res = _grantHero12.apply(this, arguments);
  if (rareWanted(id, res)) { RareQ.push({ id, res: Object.assign({}, res) }); setTimeout(() => { if (RareQ.length && !App.rarePlaying && !document.getElementById('reveal')) playRareQueue(); }, 60); }
  return res;
};
const _showReveal12 = showReveal;
showReveal = function (res, g) {
  if (RareQ.length && !App.rarePlaying) { const args = arguments; playRareQueue(() => _showReveal12.apply(this, args)); return; }
  return _showReveal12.apply(this, arguments);
};

function playRareQueue(done) {
  if (!RareQ.length) { App.rarePlaying = false; if (done) done(); return; }
  App.rarePlaying = true;
  // hoogste rarity eerst, maximaal 5 achter elkaar
  RareQ.sort((a, b) => rarOrd(HERO[b.id].rarity) - rarOrd(HERO[a.id].rarity));
  const list = RareQ.splice(0, RareQ.length).slice(0, 5);
  let i = 0;
  const next = () => { if (i >= list.length) { App.rarePlaying = false; if (done) done(); else if (RareQ.length) playRareQueue(); return; } rareCinematic(list[i++], next, list.length - i); };
  next();
}
function rareCinematic(item, onDone, left) {
  const H = HERO[item.id], r = H.rarity, col = rarColor(r), lvl = rarOrd(r) - rarOrd('legendary'); // 0 = legendary, hoger = spectaculairder
  const big = rarOrd(r) >= rarOrd('exotic'), dur = big ? 3200 : 2400, revealAt = big ? 1500 : 1050;
  const sparks = Array.from({ length: big ? 42 : 26 }, (_, k) => { const a = (k / (big ? 42 : 26)) * 360 + Math.random() * 8, d = 140 + Math.random() * 260; return `<i style="--a:${a}deg;--d:${d}px;--s:${2 + Math.random() * 4}px;--t:${0.8 + Math.random() * 0.9}s;--w:${(revealAt / 1000).toFixed(2)}s"></i>`; }).join('');
  const tag = item.res.isNew ? 'NIEUWE HELD!' : item.res.level ? `DUBBEL · LEVEL ${item.res.level}` : item.res.coins ? `DUBBEL · +${fmt(item.res.coins)} MUNTEN` : 'DUBBEL';
  const el = document.createElement('div');
  el.className = `rare-anim ra-${r}${big ? ' ra-big' : ''}`; el.id = 'rare-layer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `${RARITIES[r].label} held: ${H.name}`);
  el.style.setProperty('--c', col); el.style.setProperty('--rv', (revealAt / 1000) + 's'); el.style.setProperty('--lvl', Math.max(0, lvl));
  el.innerHTML = `<div class="ra-bg"></div><div class="ra-rays"></div><div class="ra-rays r2"></div>
    <div class="ra-ring"></div><div class="ra-ring r2"></div><div class="ra-ring r3"></div>
    <div class="ra-sparks">${sparks}</div>
    <div class="ra-stage">
      <div class="ra-hero"><div class="ra-sil">${portrait(item.id, 'ra-pt', 0, true)}</div><div class="ra-full">${portrait(item.id, 'ra-pt', 0)}</div></div>
      <div class="ra-text"><span class="chip rar rar-${r}">${RARITIES[r].label}</span><h2>${esc(H.name)}</h2><div class="ra-sub">${esc(H.title || H.role || '')}</div><div class="ra-tag ${item.res.isNew ? 'new' : ''}">${tag}</div></div>
    </div>
    <div class="ra-flash"></div>
    <div class="ra-hint">${left ? `Tik om door te gaan · nog ${left}` : 'Tik om door te gaan'}</div>`;
  document.body.appendChild(el);
  hydratePortraits(el);
  requestAnimationFrame(() => el.classList.add('go'));
  Sfx.play('gacha'); if (big) Sfx.play('cosmic');
  let revealed = false, closed = false;
  const reveal = () => { if (revealed) return; revealed = true; el.classList.add('revealed'); Sfx.play(r === 'secret' ? 'r-secret' : 'r-' + (RARITIES[r] && ['legendary', 'mythic', 'exotic', 'ultra'].includes(r) ? r : 'legendary')); };
  const close = () => { if (closed) return; closed = true; clearTimeout(t1); clearTimeout(t2); el.classList.add('out'); setTimeout(() => { el.remove(); onDone(); }, 260); };
  const t1 = setTimeout(reveal, revealAt), t2 = setTimeout(() => el.classList.add('hint-on'), dur);
  el.addEventListener('click', () => { if (!revealed) { el.classList.add('skip'); reveal(); } else close(); });
  const key = ev => { if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); if (!revealed) { el.classList.add('skip'); reveal(); } else { document.removeEventListener('keydown', key, true); close(); } } };
  document.addEventListener('keydown', key, true);
}

/* ---------- instelling ---------- */
function rareSelectHtml(id) {
  const v = rareFrom();
  return `<select class="warn-sel" id="${id}" data-set="rareAnim" aria-label="Animatie voor zeldzame helden">
    ${RARITY_ORDER.filter(r => r !== 'common').map(r => `<option value="${r}" ${v === r ? 'selected' : ''}>Vanaf ${RARITIES[r].label}</option>`).join('')}
    <option value="off" ${v === 'off' ? 'selected' : ''}>Nooit tonen</option></select>`;
}
const _renderSettings12 = renderSettings;
renderSettings = function () {
  _renderSettings12.apply(this, arguments);
  const box = $('#scr-settings .settings'); if (!box || $('#set-rareAnim')) return;
  const s = Store.data.settings;
  const row = document.createElement('div'); row.className = 'panel set-row';
  row.innerHTML = `<div><label for="set-rareAnim">Animatie bij zeldzame helden</label><span class="muted">Een speciale onthulling als je een held van deze rarity of hoger krijgt (gacha, shop, codes en beloningen)</span></div>${rareSelectHtml('set-rareAnim')}`;
  const row2 = document.createElement('div'); row2.className = 'panel set-row';
  row2.innerHTML = `<div><label id="lbl-rareOnlyNew">Alleen bij nieuwe helden</label><span class="muted">Geen animatie als je een held krijgt die je al had</span></div><button class="toggle" id="set-rareOnlyNew" data-act="set-toggle" data-k="rareOnlyNew" aria-pressed="${!!s.rareOnlyNew}" aria-labelledby="lbl-rareOnlyNew"></button>`;
  const prev = $('#set-traitWarn'); const anchor = prev ? prev.closest('.set-row') : null;
  if (anchor) { anchor.after(row); row.after(row2); } else { box.appendChild(row); box.appendChild(row2); }
  const demo = document.createElement('button'); demo.className = 'btn btn-sm'; demo.textContent = 'Voorbeeld'; demo.dataset.act = 'rare-demo'; row.appendChild(demo);
};
document.addEventListener('change', e => {
  const s = e.target.closest && e.target.closest('select[data-set="rareAnim"]'); if (!s) return;
  Store.data.settings.rareAnim = s.value; Store.save(); Sfx.play('click');
  toast(s.value === 'off' ? 'Animatie voor zeldzame helden staat uit.' : `Animatie vanaf ${RARITIES[s.value].label}.`, 'good');
});
Object.assign(ACTIONS, {
  'rare-demo': () => {
    const from = rareFrom() === 'off' ? 'legendary' : rareFrom();
    const pool = HEROES.filter(h => !h.hidden && rarOrd(h.rarity) >= rarOrd(from)); const H = pool[Math.floor(Math.random() * pool.length)] || HEROES[0];
    RareQ.push({ id: H.id, res: { id: H.id, isNew: true } }); playRareQueue();
  },
});
