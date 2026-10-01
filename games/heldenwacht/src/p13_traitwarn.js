/* =====================================================================
   Instelling: vanaf welke rarity krijg je een waarschuwing bij trait-rerollen
   ===================================================================== */
function traitWarnRars() { return RARITY_ORDER.filter(r => TRAITS.some(t => t.rarity === r)); }
function traitWarnFrom() { const v = Store.data.settings.traitWarn; return v === 'off' || v === 'always' || RARITIES[v] ? v : 'epic'; }
function traitNeedsWarn(T) {
  if (!T) return false; const w = traitWarnFrom();
  if (w === 'off') return false; if (w === 'always') return true;
  return rarOrd(T.rarity) >= rarOrd(w);
}
function traitWarnSelect(id) {
  const w = traitWarnFrom();
  return `<select class="warn-sel" id="${id}" data-set="traitWarn" aria-label="Waarschuwing bij rerollen">
    <option value="always" ${w === 'always' ? 'selected' : ''}>Altijd waarschuwen</option>
    ${traitWarnRars().map(r => `<option value="${r}" ${w === r ? 'selected' : ''}>Vanaf ${RARITIES[r].label}</option>`).join('')}
    <option value="off" ${w === 'off' ? 'selected' : ''}>Nooit waarschuwen</option></select>`;
}
function traitWarnText() { const w = traitWarnFrom(); return w === 'off' ? 'nooit' : w === 'always' ? 'altijd' : `vanaf ${RARITIES[w].label}`; }

requestTraitRoll = function (pay) {
  const o = Store.data.heroes[App.traitHero], T = o && o.trait ? TRAIT[o.trait] : null;
  if (!Meta.canRollTrait(pay)) { Sfx.play('error'); toast(pay === 'coins' ? `Je hebt ${fmt(TRAIT_COST.coins)} munten nodig.` : 'Je hebt geen Trait Tokens meer.', 'bad'); return; }
  if (traitNeedsWarn(T)) { closeOverlay(); App.traitConfirm = pay; if (App.screen !== 'gacha') { App.gachaSel = 'traits'; nav('gacha'); } else renderTraitGacha(); return; }
  doTraitRoll(pay);
};

const _renderSettings6 = renderSettings;
renderSettings = function () {
  _renderSettings6();
  const box = $('#scr-settings .settings'); if (!box) return;
  const row = document.createElement('div'); row.className = 'panel set-row';
  row.innerHTML = `<div><label for="set-traitWarn">Waarschuwing bij trait-rerollen</label><span class="muted">Vraag eerst of je het zeker weet als je held al een trait van deze rarity of hoger heeft</span></div>${traitWarnSelect('set-traitWarn')}`;
  const ref = box.children[6]; box.insertBefore(row, ref || null);
};
const _renderTG6 = renderTraitGacha;
renderTraitGacha = function () {
  _renderTG6.apply(this, arguments);
  const pr = document.querySelector('#scr-gacha .pull-row'); if (!pr || document.getElementById('tg-warn')) return;
  const d = document.createElement('div'); d.className = 'warn-line';
  d.innerHTML = `<span class="muted">Waarschuwing:</span>${traitWarnSelect('tg-warn')}`;
  pr.insertAdjacentElement('afterend', d);
};
document.addEventListener('change', e => {
  const s = e.target.closest && e.target.closest('select[data-set="traitWarn"]'); if (!s) return;
  Store.data.settings.traitWarn = s.value; Store.save(); Sfx.play('click');
  $$('select[data-set="traitWarn"]').forEach(x => { if (x !== s) x.value = s.value; });
  toast(`Waarschuwing bij rerollen: ${traitWarnText()}.`, 'good');
});
