/* =====================================================================
   Algemene Skill Tree: permanente account-upgrades met Skillpunten (SP).
   Voortgang staat in Store.data.skills ({ id: level }) en geldt voor het
   hele account (alle helden, alle modi).
   ===================================================================== */
// x = kolom (tak), y = rij (laag in de boom). req: [[id, minLevel], ...]
const SKILL_BRANCHES = [
  { id: 'eco', name: 'Economie', color: '#facc15', icon: '$' },
  { id: 'atk', name: 'Kracht', color: '#f87171', icon: '⚔' },
  { id: 'tech', name: 'Techniek', color: '#60a5fa', icon: '⚙' },
  { id: 'def', name: 'Verdediging', color: '#4ade80', icon: '⛨' },
  { id: 'loot', name: 'Beloningen', color: '#c084fc', icon: '★' },
];
const SKILLS = [
  // Economie
  { id: 'eco1', b: 'eco', row: 0, name: 'Startkapitaal', max: 5, cost: 1, per: 0.05, fmt: v => `+${pct(v)} startgeld` },
  { id: 'eco2', b: 'eco', row: 1, col: 0, name: 'Golfbonus', max: 5, cost: 1, per: 0.08, req: [['eco1', 2]], fmt: v => `+${pct(v)} geld uit de golfbonus` },
  { id: 'eco3', b: 'eco', row: 1, col: 1, name: 'Premiejager', max: 5, cost: 1, per: 0.03, req: [['eco1', 2]], fmt: v => `+${pct(v)} geld per verslagen vijand` },
  { id: 'eco4', b: 'eco', row: 2, name: 'Goudader', max: 3, cost: 2, per: 0.02, req: [['eco2', 3], ['eco3', 3]], fmt: v => `Na elke golf ${pct(v)} rente over je geld (max $${Math.round(v / 0.02) * 150})` },
  // Kracht
  { id: 'atk1', b: 'atk', row: 0, name: 'Training', max: 5, cost: 1, per: 0.02, fmt: v => `+${pct(v)} schade voor alle helden` },
  { id: 'atk2', b: 'atk', row: 1, col: 0, name: 'Scherpe Blik', max: 5, cost: 1, per: 0.02, req: [['atk1', 2]], fmt: v => `+${pct(v)} kans op een kritieke treffer` },
  { id: 'atk3', b: 'atk', row: 1, col: 1, name: 'Baasjager', max: 5, cost: 1, per: 0.04, req: [['atk1', 2]], fmt: v => `+${pct(v)} schade tegen bazen` },
  { id: 'atk4', b: 'atk', row: 2, name: 'Heldenmoed', max: 3, cost: 2, per: 0.03, req: [['atk2', 3], ['atk3', 3]], fmt: v => `+${pct(v)} aanvalssnelheid voor alle helden` },
  // Techniek
  { id: 'tech1', b: 'tech', row: 0, name: 'Goedkope Werving', max: 5, cost: 1, per: 0.02, fmt: v => `Helden plaatsen kost ${pct(v)} minder` },
  { id: 'tech2', b: 'tech', row: 1, col: 0, name: 'Efficiënte Upgrades', max: 5, cost: 1, per: 0.03, req: [['tech1', 2]], fmt: v => `Upgrades kosten ${pct(v)} minder` },
  { id: 'tech3', b: 'tech', row: 1, col: 1, name: 'Snelle Lading', max: 5, cost: 1, per: 0.03, req: [['tech1', 2]], fmt: v => `Ability-cooldowns ${pct(v)} korter` },
  { id: 'tech4', b: 'tech', row: 2, name: 'Verkenners', max: 3, cost: 2, per: 0.03, req: [['tech2', 3], ['tech3', 3]], fmt: v => `+${pct(v)} bereik voor alle helden` },
  // Verdediging
  { id: 'def1', b: 'def', row: 0, name: 'Versterkte Basis', max: 5, cost: 1, per: 5, fmt: v => `+${v} basis-HP` },
  { id: 'def2', b: 'def', row: 1, col: 0, name: 'Herstel', max: 3, cost: 1, per: 1, req: [['def1', 2]], fmt: v => `Na elke golf +${v} basis-HP terug` },
  { id: 'def3', b: 'def', row: 1, col: 1, name: 'Modderpad', max: 5, cost: 1, per: 0.01, req: [['def1', 2]], fmt: v => `Alle vijanden lopen ${pct(v)} trager` },
  { id: 'def4', b: 'def', row: 2, name: 'Laatste Bolwerk', max: 1, cost: 3, per: 1, req: [['def2', 2], ['def3', 3]], fmt: () => 'Eén keer per potje: zakt je basis onder 25%, dan bevriezen alle vijanden 3 seconden' },
  // Beloningen
  { id: 'loot1', b: 'loot', row: 0, name: 'Muntenregen', max: 5, cost: 1, per: 0.04, fmt: v => `+${pct(v)} munten na elk potje` },
  { id: 'loot2', b: 'loot', row: 1, col: 0, name: 'Ervaring', max: 5, cost: 1, per: 0.05, req: [['loot1', 2]], fmt: v => `+${pct(v)} account-XP na elk potje` },
  { id: 'loot3', b: 'loot', row: 1, col: 1, name: 'Geluksvogel', max: 5, cost: 1, per: 0.03, req: [['loot1', 2]], fmt: v => `${pct(v)} kans op een extra Trait Token na een overwinning` },
  { id: 'loot4', b: 'loot', row: 2, name: 'Schatkist', max: 3, cost: 2, per: 1, req: [['loot2', 3], ['loot3', 3]], fmt: v => `+${v} gem${v === 1 ? '' : 's'} per gewonnen potje` },
];
const SKILL = Object.fromEntries(SKILLS.map(s => [s.id, s]));
const SKILL_RESET_GEMS = 50;
const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.', ',');

/* ---------- punten ---------- */
function skillData() {
  const D = Store.data;
  if (!D.skills || typeof D.skills !== 'object') D.skills = {};
  if (D.stats.levelsGained == null) D.stats.levelsGained = Math.max(0, D.level - 1) + (D.prestige || 0) * 20;
  return D.skills;
}
function skillLv(id) { const S = Store.data && Store.data.skills; return S && S[id] ? S[id] : 0; }
function skillVal(id) { return skillLv(id) * SKILL[id].per; }
function spSources() {
  const D = Store.data; skillData();
  const ach = Object.values(D.ach || {}).filter(v => v === 'claimed').length;
  return [
    ['Accountlevels', Math.min(120, D.stats.levelsGained || 0), '1 SP per level dat je stijgt (ook levels van vóór een prestige tellen mee)'],
    ['Sterren', Math.floor(Progress.totalStars() / 6), '1 SP per 6 sterren op de maps'],
    ['Achievements', Math.floor(ach / 4), '1 SP per 4 opgehaalde achievements'],
    ['Prestige', (D.prestige || 0) * 3, '3 SP per prestige'],
    ['Dungeon', Math.floor((D.stats.dungeonBest || 0) / 5), '1 SP per 5 dungeon-dieptes'],
  ];
}
function spTotal() { return spSources().reduce((s, x) => s + x[1], 0); }
function spSpent() { const S = skillData(); return SKILLS.reduce((s, k) => s + (S[k.id] || 0) * k.cost, 0); }
function spFree() { return spTotal() - spSpent(); }
function skillState(k) {
  const lv = skillLv(k.id);
  if (lv >= k.max) return 'max';
  const ok = (k.req || []).every(([id, l]) => skillLv(id) >= l);
  if (!ok) return 'locked';
  return spFree() >= k.cost ? 'available' : 'nopoints';
}
function buySkill(id) {
  const k = SKILL[id]; if (!k) return false;
  if (skillState(k) !== 'available') return false;
  skillData()[id] = skillLv(id) + 1; Store.save(); return true;
}
function resetSkills() {
  const D = Store.data; if (spSpent() === 0) return 'leeg';
  if ((D.gems || 0) < SKILL_RESET_GEMS) return 'gems';
  D.gems -= SKILL_RESET_GEMS; D.skills = {}; Store.save(); return 'ok';
}
// levels bijhouden (ook over prestige heen)
const _addXP10 = Meta.addXP;
Meta.addXP = function (n) { const D = Store.data, before = D.level; const r = _addXP10.call(this, n); if (D.level > before) { skillData(); D.stats.levelsGained += D.level - before; } return r; };

/* ---------- effecten in een potje ---------- */
const _initExt10 = Game.prototype.initExt3;
Game.prototype.initExt3 = function () {
  _initExt10.call(this);
  if (this.mode === 'coop') return;
  this.SK = Object.fromEntries(SKILLS.map(k => [k.id, skillVal(k.id)]));
  this.cash = Math.round(this.cash * (1 + this.SK.eco1));
  if (this.SK.def1) { this.hp += this.SK.def1; this.maxHp += this.SK.def1; }
  this.bulwarkUsed = false;
};
const _heroStats10 = Game.prototype.heroStats;
Game.prototype.heroStats = function (h) {
  const st = _heroStats10.call(this, h), K = this.SK; if (!K) return st;
  st.dmg *= 1 + K.atk1; st.crit = Math.min(0.95, st.crit + K.atk2); st.bossPct = (st.bossPct || 0) + K.atk3; st.rate *= 1 + K.atk4;
  if (st.range < 90) st.range *= 1 + K.tech4;
  return st;
};
const _costOf10 = Game.prototype.costOf;
Game.prototype.costOf = function (id) { const c = _costOf10.call(this, id); return this.SK ? Math.round(c * (1 - this.SK.tech1)) : c; };
const _upgCost10 = Game.prototype.upgCost;
Game.prototype.upgCost = function (h) { const c = _upgCost10.call(this, h); return this.SK ? Math.round(c * (1 - this.SK.tech2)) : c; };
const _abilCd10 = Game.prototype.abilCdMax;
Game.prototype.abilCdMax = function (h) { const c = _abilCd10.call(this, h); return this.SK ? c * (1 - this.SK.tech3) : c; };
const _spawn10 = Game.prototype.spawnEnemy;
Game.prototype.spawnEnemy = function (type, d, w) {
  const e = _spawn10.call(this, type, d, w);
  if (e && this.SK) { if (this.SK.eco3) e.reward = Math.round(e.reward * (1 + this.SK.eco3)); if (this.SK.def3 && !e.E.worldBoss) e.speed *= 1 - this.SK.def3; }
  return e;
};
const _payBonus10 = Game.prototype.payWaveBonus;
Game.prototype.payWaveBonus = function () {
  const c0 = this.cash; _payBonus10.call(this); const K = this.SK; if (!K) return;
  let extra = 0;
  if (K.eco2) extra += Math.round((this.cash - c0) * K.eco2);
  if (K.eco4) extra += Math.min(Math.round(this.cash * K.eco4), Math.round(K.eco4 / 0.02) * 150);
  if (extra > 0) { this.cash += extra; this.floatText(GW / 2, GH - 120, `Skills +$${extra}`, '#facc15', 15, 1.2); }
  if (K.def2 && this.hp > 0 && this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + K.def2); this.floatText(this.base.x, this.base.y - 30, `+${K.def2} ♥`, '#4ade80', 16, 1); }
};
const _updExt10 = Game.prototype.updateExt;
Game.prototype.updateExt = function (dt) {
  _updExt10.call(this, dt);
  if (this.SK && this.SK.def4 && !this.bulwarkUsed && !this.over && this.hp > 0 && this.hp < this.maxHp * 0.25) {
    this.bulwarkUsed = true;
    for (const e of this.enemies) { if (e.dead || e.E.worldBoss) continue; const d = e.boss ? 1 : 3; e.stunT = Math.max(e.stunT, d); e.frozenT = Math.max(e.frozenT || 0, d); }
    this.banner('Laatste Bolwerk!', 'Alle vijanden bevriezen', '#4ade80'); this.flash = { color: '#bbf7d0', life: 0.4, max: 0.4 };
    this.fx.ring(this.base.x, this.base.y, 220, '#4ade80', 0.9, 8); this.shake(8); Sfx.play('freeze');
  }
};
/* ---------- beloningen na een potje ---------- */
const _finish10 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const R = _finish10.call(this, g);
  if (g._skillRew || g.mode === 'coop' || g.wave === 0) return R; g._skillRew = true;
  const K = Object.fromEntries(SKILLS.map(k => [k.id, skillVal(k.id)])), win = !!g.result.win, extra = [];
  if (K.loot1 && R.coins > 0) { const c = Math.round(R.coins * K.loot1); this.grant({ coins: c }); R.coins += c; R.rows.push([`Skill: Muntenregen`, c]); }
  if (K.loot2 && R.xp > 0) { const x = Math.round(R.xp * K.loot2); R.lines.push(...this.addXP(x)); R.xp += x; }
  if (win && K.loot3 && Math.random() < K.loot3) { this.grant({ tokens: 1 }); R.lines.push('Geluksvogel: +1 Trait Token'); }
  if (win && K.loot4) { this.grant({ gems: K.loot4 }); R.lines.push(`Schatkist: +${K.loot4} gems`); }
  Store.save();
  return R;
};

/* ---------- scherm ---------- */
function skillNodeHtml(k) {
  const lv = skillLv(k.id), st = skillState(k), B = SKILL_BRANCHES.find(b => b.id === k.b);
  const cur = lv ? k.fmt(lv * k.per) : 'Nog niet vrijgespeeld', next = lv < k.max ? k.fmt((lv + 1) * k.per) : null;
  const reqTxt = (k.req || []).filter(([id, l]) => skillLv(id) < l).map(([id, l]) => `${SKILL[id].name} level ${l}`).join(' en ');
  const lbl = { max: 'Maximaal', available: `Upgrade · ${k.cost} SP`, nopoints: `${k.cost} SP nodig`, locked: 'Vergrendeld' }[st];
  return `<div class="sk-node sk-${st}" style="--bc:${B.color}" data-id="${k.id}">
    <div class="sk-top"><b>${esc(k.name)}</b><span class="sk-lv num">${lv}/${k.max}</span></div>
    <div class="sk-pips">${Array.from({ length: k.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
    <div class="sk-cur">${esc(cur)}</div>
    ${next ? `<div class="sk-next">Volgend level: ${esc(next)}</div>` : ''}
    ${st === 'locked' ? `<div class="sk-req">Vereist: ${esc(reqTxt)}</div>` : ''}
    <button class="btn btn-sm ${st === 'available' ? 'btn-pow' : ''}" data-act="sk-buy" data-id="${k.id}" ${st === 'available' ? '' : 'disabled'}>${lbl}</button></div>`;
}
function renderSkills() {
  const scr = $('#scr-skills'); if (!scr) return;
  const free = spFree(), total = spTotal(), src = spSources(), D = Store.data;
  scr.innerHTML = `<div class="screen-head"><div><span class="kicker">Voor je hele account</span><h2>Skill Tree</h2></div>
      <div class="sp-pill"><span class="sp-ico">SP</span><span class="num">${free}</span><small>van ${total} vrij</small></div></div>
    <p class="muted" style="margin:-6px 0 14px">Permanente upgrades voor al je helden en alle modi. Elke tak loopt van links naar rechts: de topskill rechts gaat pas open als je beide middelste skills ver genoeg hebt.</p>
    <div class="sk-legend"><span class="sk-l available">Beschikbaar</span><span class="sk-l nopoints">Te weinig SP</span><span class="sk-l locked">Vergrendeld</span><span class="sk-l max">Maximaal</span></div>
    <div class="sk-tree">${SKILL_BRANCHES.map(B => {
      const ks = SKILLS.filter(k => k.b === B.id), r0 = ks.filter(k => k.row === 0), r1 = ks.filter(k => k.row === 1), r2 = ks.filter(k => k.row === 2);
      const spent = ks.reduce((s, k) => s + skillLv(k.id) * k.cost, 0), on1 = skillLv(r0[0].id) >= 2, on2 = r2[0].req.every(([id, l]) => skillLv(id) >= l);
      return `<section class="sk-branch" style="--bc:${B.color}">
        <header><span class="sk-ico">${B.icon}</span><h3>${B.name}</h3><span class="muted num">${spent} SP</span></header>
        <div class="sk-col">${r0.map(skillNodeHtml).join('')}</div>
        <div class="sk-link ${on1 ? 'on' : ''}" aria-hidden="true"><i></i></div>
        <div class="sk-col two">${r1.map(skillNodeHtml).join('')}</div>
        <div class="sk-link ${on2 ? 'on' : ''}" aria-hidden="true"><i></i></div>
        <div class="sk-col">${r2.map(skillNodeHtml).join('')}</div></section>`;
    }).join('')}</div>
    <div class="two-col" style="margin-top:16px">
      <div class="panel card"><div class="section-title" style="margin-top:0">Zo verdien je Skillpunten</div>
        <div class="stat-table">${src.map(([k, v, d]) => `<div class="stat" title="${esc(d)}"><div class="k">${k}</div><div class="v">${v} SP</div></div>`).join('')}</div>
        <p class="muted" style="font-size:13px;margin:8px 0 0">${src.map(([k, , d]) => esc(d)).join(' · ')}.</p></div>
      <div class="panel card"><div class="section-title" style="margin-top:0">Opnieuw verdelen</div>
        <p class="muted" style="margin:0 0 10px">Zet al je punten terug en verdeel ze opnieuw. Kost ${SKILL_RESET_GEMS} gems (je hebt er ${fmt(D.gems || 0)}).</p>
        ${App.skReset ? `<div class="confirm-box"><b>Alle skills terugzetten?</b><div class="btn-row" style="justify-content:flex-start"><button class="btn btn-danger btn-sm" data-act="sk-reset-yes">Ja, reset (${SKILL_RESET_GEMS} gems)</button><button class="btn btn-sm" data-act="sk-reset-no">Nee</button></div></div>` : `<button class="btn" data-act="sk-reset" ${spSpent() ? '' : 'disabled'}>Skills resetten</button>`}</div>
    </div>`;
}
Object.assign(ACTIONS, {
  'sk-buy': b => {
    const id = b.dataset.id, k = SKILL[id];
    if (buySkill(id)) { Sfx.play(skillLv(id) >= k.max ? 'bigupgrade' : 'upgrade'); renderSkills(); const n = document.querySelector(`.sk-node[data-id="${id}"]`); if (n) { n.classList.add('sk-pop'); } updateTopbar && updateTopbar(); }
    else { Sfx.play('error'); }
  },
  'sk-reset': () => { App.skReset = true; renderSkills(); },
  'sk-reset-no': () => { App.skReset = false; renderSkills(); },
  'sk-reset-yes': () => { App.skReset = false; const r = resetSkills(); if (r === 'ok') { Sfx.play('coin'); toast('Skills teruggezet. Verdeel je punten opnieuw!', 'good'); } else if (r === 'gems') { Sfx.play('error'); toast(`Je hebt ${SKILL_RESET_GEMS} gems nodig.`, 'bad'); } renderSkills(); updateTopbar && updateTopbar(); },
});
// melding in het menu als er punten te besteden zijn
const _updTop10 = updateTopbar;
updateTopbar = function () {
  _updTop10.apply(this, arguments);
  const b = document.querySelector('[data-act="nav"][data-to="skills"]'); if (!b) return;
  const n = Store.data ? Math.max(0, spFree()) : 0, avail = n > 0 && SKILLS.some(k => skillState(k) === 'available');
  let dot = b.querySelector('.ndot'); if (avail) { if (!dot) { dot = document.createElement('span'); dot.className = 'ndot'; b.appendChild(dot); } dot.textContent = n; } else if (dot) dot.remove();
};
