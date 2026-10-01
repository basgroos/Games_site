/* =====================================================================
   UI voor de meta-systemen: Modi, Missies, Event, Ranglijst, Profiel,
   held-tabs (Trait / Skins / Mastery), topbalk en meldingen
   ===================================================================== */
function updateTopbar() {
  const D = Store.data; if (!D) return;
  const lv = $('#tb-level'); if (lv) lv.textContent = D.level;
  const xp = $('#tb-xp'); if (xp) xp.style.width = Math.min(100, D.xp / xpForLevel(D.level) * 100) + '%';
  const tk = $('#tb-tokens'); if (tk) tk.textContent = D.tokens;
  const dots = { missions: missionClaimables(), event: eventClaimables(), profile: Meta.canPrestige() ? 1 : 0 };
  for (const k in dots) { const el = $('#dot-' + k); if (el) { el.hidden = !dots[k]; el.textContent = dots[k] > 9 ? '9+' : dots[k]; } }
}
function missionClaimables() {
  const D = Store.data; if (!D.ch.day) return 0; let n = Meta.loginClaimable() ? 1 : 0;
  for (const k of ['day', 'week']) for (const c of D.ch[k].list) if (c.st === 'done') n++;
  for (const id in D.ch.perm) if (D.ch.perm[id].st === 'done') n++;
  for (const q of QUESTS) if (Meta.questState(q).claimable) n++;
  for (const a of ACHIEVEMENTS) if (D.ach[a.id] === 'done') n++;
  return n;
}
function eventClaimables() { const ev = Meta.activeEvent(); return EVENT_QUESTS.filter(q => { const s = Meta.evQuest(ev, q); return s.done && !s.claimed; }).length; }
function flushNotes() { while (Meta.pending.length) { const n = Meta.pending.shift(); toast(n.msg, n.kind); } updateTopbar(); }
function rerender() { if (App.game) return; ({ home: renderHome, maps: renderMaps, gacha: renderGacha, collection: renderCollection, team: renderTeam, settings: renderSettings, modes: renderModes, missions: renderMissions, event: renderEvent, leaderboard: renderLeaderboard, skills: renderSkills, profile: renderProfile, shop: renderShop })[App.screen](); updateCoins(); flushNotes(); }
const chips = r => `<div class="reward-chips">${Meta.rewardText(r).map(t => `<span>${esc(t)}</span>`).join('')}</div>`;
const tabsHtml = (act, cur, list) => `<div class="tabs" role="group">${list.map(([k, l, dis, dot]) => `<button data-act="${act}" data-tab="${k}" aria-pressed="${cur === k}" ${dis ? 'disabled' : ''}>${l}${dot ? `<span class="ndot">${dot}</span>` : ''}</button>`).join('')}</div>`;
function enemyIcon(t, size = 62) { return `<canvas data-enemy="${t}" style="width:${size}px;height:${size}px"></canvas>`; }

/* ---------------- Held-tabs ---------------- */
function heroTabHtml(id, tab) {
  const D = Store.data, H = HERO[id], o = D.heroes[id];
  if (tab === 'trait') {
    const T = o.trait ? TRAIT[o.trait] : null;
    return `${T ? `<div class="trait-card ${T.rarity === 'ultra' ? 'ultra' : ''}" style="--tc:${rarColor(T.rarity)}">
        <span class="chip rar rar-${T.rarity}" style="align-self:flex-start">${RARITIES[T.rarity].label} trait</span>
        <span class="tn" style="color:${rarColor(T.rarity)}">${esc(T.name)}</span>${T.mech ? `<span class="kicker">Mechanic: ${esc(T.mech)}</span>` : ''}<span>${esc(T.desc)}</span></div>`
      : `<div class="trait-card" style="--tc:#3b3478"><span class="tn">Nog geen trait</span><span>Deze held heeft nog geen trait. Rol er een in de Trait Gacha!</span></div>`}
      <button class="btn btn-pow" data-act="goto-trait" data-id="${id}">${T ? 'Nieuwe trait rollen' : 'Rol een trait'} in de Trait Gacha</button>
      <p class="muted" style="font-size:13px;margin:0">Een roll kost ${TRAIT_COST.tokens} Reroll Token of ${fmt(TRAIT_COST.coins)} munten. De nieuwe trait vervangt de oude.</p>`;
  }
  if (tab === 'skins') {
    const cur = o.skin || '';
    return `<p class="muted" style="margin:0;font-size:14px">Skins zijn alleen cosmetisch: ander uiterlijk, andere deeltjes en een eigen projectielspoor.</p>
      <div class="skin-grid">
        <button class="skin" data-act="equip-skin" data-id="${id}" data-skin="" aria-pressed="${!cur}">${portrait(id, '', 2, false, '')}<div class="sn">Standaard</div><div class="ss">Altijd</div></button>
        ${SKINS.map(S => { const own = Meta.ownsSkin(id, S.id); return `<button class="skin ${own ? '' : 'locked'}" data-act="${own ? 'equip-skin' : 'skin-info'}" data-id="${id}" data-skin="${S.id}" aria-pressed="${cur === S.id}">${portrait(id, '', 2, false, S.id)}<div class="sn">${esc(S.name)}</div><div class="ss">${own ? (cur === S.id ? 'Gedragen' : 'In bezit') : esc(S.source)}</div></button>`; }).join('')}
      </div>`;
  }
  if (tab === 'mastery') {
    const m = Meta.mastery(id), b = Meta.masteryBadge(id);
    const pct = m.next ? (m.xp - m.cur) / (m.next - m.cur) * 100 : 100;
    return `<div class="panel" style="padding:12px;box-shadow:none;background:var(--panel2);display:flex;gap:12px;align-items:center">
        <div class="bdg ${b ? '' : 'off'}" style="--bc:${b ? MASTERY_BADGE[b] : '#555'}">${m.lvl}</div>
        <div style="flex:1;min-width:0"><b>Mastery ${m.lvl} van ${MASTERY_MAX}</b><div class="bar" style="margin-top:6px"><i style="width:${pct}%;background:var(--sky)"></i></div>
        <div class="muted num" style="font-size:13px;margin-top:4px">${m.next ? `${fmt(m.xp)} / ${fmt(m.next)} XP` : `${fmt(m.xp)} XP · maximaal`}</div></div></div>
      <p class="muted" style="margin:0;font-size:13px">Mastery-XP krijg je door deze held te gebruiken: meer schade en hogere moeilijkheden geven meer XP.</p>
      <ol class="mtrack">${Object.keys(MASTERY_REWARDS).map(l => `<li class="${m.lvl >= +l ? 'got' : ''}"><b>${l}</b><span>${esc(MASTERY_REWARDS[l].text.replace('<held>', H.name))}</span></li>`).join('')}</ol>`;
  }
  return '';
}

/* ---------------- Modi ---------------- */
function renderModes() {
  const D = Store.data, tab = App.modeTab;
  const brOpen = Meta.modeUnlocked(BOSSRUSH_UNLOCK), coopOpen = Meta.modeUnlocked(COOP.unlock);
  let body = '';
  if (tab === 'endless') {
    const maps = MAPS.filter((m, i) => Progress.mapUnlocked(i)).concat(SPECIAL_MAPS.filter(m => m.kind === 'secret' && Meta.secretUnlocked(m)));
    if (!maps.some(m => m.id === App.endlessMap)) App.endlessMap = maps[0].id;
    body = `<div class="two-col"><div class="panel card"><span class="kicker">Endless Mode</span><h3>Geen laatste golf</h3>
        <p class="muted" style="margin:0">De golven blijven komen en worden steeds sterker, met om de 5 golven een baas en vanaf golf 25 twee tegelijk. Beloningen hangen af van je hoogste golf, kills, bazen en schade.</p>
        <div class="section-title" style="margin:0">Kies een map</div><div class="pick-row">${maps.map(m => `<button class="pick" data-act="endless-map" data-id="${m.id}" aria-pressed="${App.endlessMap === m.id}">${esc(m.name)}</button>`).join('')}</div>
        <button class="btn btn-pow btn-xl" data-act="start-endless">Start Endless</button></div>
      <div class="panel card"><span class="kicker">Jouw record</span><h3 class="num" style="font-size:40px;font-family:var(--f-display)">Golf ${D.stats.endlessBest}</h3>
        <p class="muted" style="margin:0">Elke 15 golven levert een Trait Reroll Token op. Je record telt mee voor de Endless-ranglijst.</p>
        <button class="btn btn-sm" data-act="lb-open" data-cat="endless">Bekijk scores</button></div></div>`;
  } else if (tab === 'bossrush') {
    const best = D.stats.bossrushBest;
    body = `<div class="panel card"><span class="kicker">Boss Rush · Het Kolosseum</span><h3>${BOSSRUSH.length} bazen achter elkaar</h3>
      <p class="muted" style="margin:0">Elke baas is sterker dan de vorige, met escortes ervoor. Spiegelkoning, Hydra, Tijdvreter en de Chaos-Opperheer kom je alleen hier tegen. Hoe verder je komt, hoe groter de beloning.</p>
      <div class="boss-strip">${BOSSRUSH.map((b, i) => `<div class="bs ${best > i ? 'done' : ''}">${enemyIcon(b)}<div>${i + 1}. ${esc(ENEMIES[b].name)}</div></div>`).join('')}</div>
      <p class="muted" style="margin:0">Beste resultaat: <b>${best} van ${BOSSRUSH.length}</b>. Alles verslaan geeft de eerste keer een Kosmisch Ticket.</p>
      ${brOpen ? '<button class="btn btn-pow btn-xl" data-act="start-bossrush">Start Boss Rush</button>' : `<span class="chip">Haal ${esc(MAPS.find(m => m.id === BOSSRUSH_UNLOCK.map).name)} op Normaal</span>`}</div>`;
  } else if (tab === 'raids') {
    body = `<div class="cards">${RAIDS.map(r => { const un = Meta.raidUnlocked(r); return `<div class="panel card raid-card" style="--rc:${r.color}">
        <div style="display:flex;gap:12px;align-items:center">${enemyIcon(r.boss, 72)}<div><span class="kicker">Raid</span><h3>${esc(r.name)}</h3></div></div>
        <p class="muted" style="margin:0">${esc(r.intro)}</p>
        <ol class="phase-list">${r.phases.map(p => `<li>${esc(p.name)}${p.boss ? ' — ' + esc(ENEMIES[r.boss].desc) : ` (${p.waves} golven${p.miniboss ? ', met ' + ENEMIES[p.miniboss].name : ''})`}</li>`).join('')}</ol>
        ${un ? `<div class="raid-diffs">${RAID_DIFFS.map((d, i) => { const ok = Meta.raidDiffUnlocked(r, i), done = Meta.raidCleared(r, i); return `<button class="btn btn-sm ${done ? 'btn-good' : i === 2 ? 'btn-danger' : ''}" data-act="start-raid" data-id="${r.id}" data-d="${i}" ${ok ? '' : 'disabled'} title="${ok ? '' : 'Haal eerst ' + RAID_DIFFS[i - 1].name}">${d.name}${done ? ' ✓' : ''}</button>`; }).join('')}</div>
          <div class="muted" style="font-size:12px">Eerste keer: ${RAID_DIFFS.map(d => `${d.name}: ${Meta.rewardText(r.firstClear[d.id]).join(', ') || 'badge'}`).join(' · ')}</div>` : `<span class="chip">Haal ${esc(MAPS.find(m => m.id === r.unlock.map).name)} op Normaal</span>`}
      </div>`; }).join('')}</div>
      <div class="screen-head" style="margin-top:22px"><div><span class="kicker">Exclusieve beloningen</span><h2 style="font-size:24px">Raid-winkel</h2></div><div class="cur-pill" style="--ec:#f59e0b">${D.raidTokens} Raidtokens</div></div>
      <div class="shop">${RAID_SHOP.map(it => { const owned = it.once && Meta.shopOwned(it, D.raidShop); return `<div class="shop-item">${it.reward.hero ? portrait(it.reward.hero, '', 3, !D.heroes[it.reward.hero], '') : it.reward.skin ? portrait(D.team[0] || 'vuist', '', 2, false, it.reward.skin) : ''}<b>${esc(it.text)}</b><span class="sub">${esc(it.sub)}</span>
        <button class="btn btn-sm ${owned ? '' : 'btn-pow'}" data-act="buy-raid" data-id="${it.id}" ${owned || D.raidTokens < it.cost ? 'disabled' : ''}>${owned ? 'In bezit' : `${it.cost} Raidtokens`}</button></div>`; }).join('')}</div>`;
  } else if (tab === 'coop') {
    const left = Online.coopPool(), mine = D.coop.week === weekKey() ? D.coop.dmg : 0, beaten = left <= 0;
    const rows = Online.coop.filter(c => c.week === weekKey()).sort((a, b) => b.dmg - a.dmg).slice(0, 10);
    body = `<div class="two-col"><div class="panel card"><span class="kicker">Co-op raid · week ${weekKey().split('-W')[1]}</span><h3>Omega-Leviathan</h3>
        <p class="muted" style="margin:0">Een wereldbaas die alle spelers samen bevechten. Iedereen deelt dezelfde HP-balk. Elke run duurt ${COOP.runTime} seconden en al je schade gaat van de gedeelde balk af. Versla hem samen voor de weekbeloning.</p>
        <div class="big-bar"><i style="width:${left / COOP.hp * 100}%"></i><span>${fmt(left)} / ${fmt(COOP.hp)} HP</span></div>
        <div class="muted num">Jouw schade deze week: <b>${fmt(mine)}</b> · reset over <span class="event-timer" data-timer="${endOfWeek()}">${timeLeft(endOfWeek() - Date.now())}</span></div>
        ${beaten && mine > 0 && !D.coop.claimed ? '<button class="btn btn-good" data-act="coop-claim">Claim weekbeloning</button>' : ''}
        ${coopOpen ? `<button class="btn btn-pow btn-xl" data-act="start-coop" ${beaten ? 'disabled' : ''}>${beaten ? 'Deze week verslagen!' : 'Start een run'}</button>` : `<span class="chip">Haal ${esc(MAPS.find(m => m.id === COOP.unlock.map).name)} op Normaal</span>`}
        <p class="muted" style="font-size:12px;margin:0">${Online.ready ? (Online.canWrite ? 'Verbonden: je schade wordt gedeeld met andere spelers van deze pagina.' : 'Je kunt meekijken, maar je schade wordt alleen lokaal bewaard (je hebt geen schrijfrechten op deze pagina).') : 'Offline weergave: je vecht nu alleen tegen je eigen versie van de baas.'}</p></div>
      <div class="panel card"><span class="kicker">Meeste schade deze week</span>
        ${rows.length ? `<table class="lb"><tbody>${rows.map((r, i) => `<tr class="${r.id === Online.uid ? 'me' : ''}"><td class="rk">${i + 1}</td><td>${esc(Online.nameOf(r.id))}</td><td class="v">${fmt(r.dmg)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="margin:0">Nog niemand heeft deze week meegevochten. Wees de eerste!</p>'}
        <div class="muted" style="font-size:13px">Weekbeloning: 50 Raidtokens, 3 Reroll Tokens en een Kosmisch Ticket voor iedereen die meedeed.</div></div></div>`;
  } else if (tab === 'custom') {
    const C = App.custom, maps = MAPS.filter((m, i) => Progress.mapUnlocked(i)).concat(SPECIAL_MAPS.filter(m => m.kind === 'secret' && Meta.secretUnlocked(m)));
    if (!maps.some(m => m.id === C.map)) C.map = maps[0].id;
    const mi = MAPS.findIndex(m => m.id === C.map), dOk = di => (mi < 0 ? !(DIFFS[di].reqLevel > D.level) : Progress.diffUnlocked(mi, di));
    if (!dOk(C.diff)) C.diff = 1;
    const mb = modBonus(C.mods), map = mapById(C.map);
    body = `<div class="panel card"><span class="kicker">Custom Mode</span><h3>Combineer modifiers voor grotere beloningen</h3>
      <div class="section-title" style="margin:0">Map</div><div class="pick-row">${maps.map(m => `<button class="pick" data-act="cust-map" data-id="${m.id}" aria-pressed="${C.map === m.id}">${esc(m.name)}</button>`).join('')}</div>
      <div class="section-title" style="margin:0">Moeilijkheid</div><div class="pick-row">${DIFFS.map((d, i) => `<button class="pick" data-act="cust-diff" data-d="${i}" aria-pressed="${C.diff === i}" ${dOk(i) ? '' : 'disabled'}>${d.name}</button>`).join('')}</div>
      <div class="section-title" style="margin:0">Modifiers</div>
      <div class="mod-grid">${MODIFIERS.map(m => `<button class="mod ${m.bonus < 0 ? 'good' : ''}" data-act="cust-mod" data-id="${m.id}" aria-pressed="${C.mods.includes(m.id)}"><b>${esc(m.name)}</b><span>${esc(m.desc)}</span><span class="pct">${m.bonus > 0 ? '+' : ''}${Math.round(m.bonus * 100)}% beloning</span></button>`).join('')}</div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="rw-total" style="gap:10px"><span>Beloning ×${mb.toFixed(2).replace('.', ',')}</span></div>
        <span class="muted">tot ${coinHtml(Math.round(matchRewards(map, C.diff, DIFFS[C.diff].waves, bossCount(C.diff), true, false).total * mb))} bij winst</span>
        <button class="btn btn-pow btn-xl" data-act="start-custom">Start</button></div>
      <p class="muted" style="font-size:13px;margin:0">Overwinningen tellen mee voor sterren en uitdagingen, behalve met "Superkracht".</p></div>`;
  } else if (tab === 'dungeon') {
    body = dungeonBody();
  } else if (tab === 'secret') {
    body = `<div class="cards">${SPECIAL_MAPS.filter(m => m.kind === 'secret').map(m => { const un = Meta.secretUnlocked(m); return `<div class="panel card">
        ${un ? `<canvas data-map="${m.id}" style="width:100%;aspect-ratio:24/15;border:2px solid var(--edge);border-radius:4px;max-width:100%"></canvas>` : `<div style="aspect-ratio:24/15;display:grid;place-items:center;background:var(--edge);border-radius:4px;font-family:var(--f-display);font-size:48px;color:var(--line)">?</div>`}
        <span class="kicker">Geheime map</span><h3>${un ? esc(m.name) : '???'}</h3>
        <p class="muted" style="margin:0">${un ? esc(m.desc) : 'Hint: ' + esc(m.unlock.text)}</p>
        ${un ? `<div class="enemy-chips">${[...new Set(m.pool)].map(t => `<span class="chip">${enemyIcon(t, 18)}${ENEMIES[t].name}</span>`).join('')}<span class="chip" style="border-color:#ff4d5e">${enemyIcon(m.finalBoss, 18)}${ENEMIES[m.finalBoss].name}</span></div>
          <div class="pick-row">${DIFFS.map((d, i) => `<button class="btn btn-sm ${Progress.cleared(m.id, i) ? 'btn-good' : ''}" data-act="start-secret" data-id="${m.id}" data-d="${i}" ${d.reqLevel > D.level ? `disabled title="Vanaf level ${d.reqLevel}"` : ''}>${d.name}${Progress.cleared(m.id, i) ? ' ★' : ''}</button>`).join('')}</div>` : ''}
      </div>`; }).join('')}</div>
      <p class="muted" style="margin-top:12px">Eventmaps zijn ook geheim: ze zijn alleen te spelen zolang hun event loopt. Kijk bij <button class="btn btn-sm" data-act="nav" data-to="event">Event</button></p>`;
  }
  $('#scr-modes').innerHTML = `<div class="screen-head"><div><span class="kicker">Speciale spelmodi</span><h2>Modi</h2></div></div>
    ${tabsHtml('mode-tab', tab, [['endless', 'Endless'], ['bossrush', 'Boss Rush'], ['raids', 'Raids'], ['dungeon', 'Dungeon', false, Meta.dungeonUnlocked() && !D.dungeon.best ? 'nieuw' : 0], ['custom', 'Custom'], ['secret', 'Geheime maps']])}${body}`;
  $$('#scr-modes canvas[data-map]').forEach(cv => drawMapThumb(cv, mapById(cv.dataset.map)));
  hydratePortraits($('#scr-modes'));
}

/* ---------------- Missies ---------------- */
function chRow(kind, key, def, c) {
  const pct = Math.min(1, c.prog / def.n) * 100, rule = def.type === 'rule' || def.map;
  return `<div class="row-card ${c.st}">
    <div style="min-width:0"><div class="rc-title">${esc(def.name ? def.name + ': ' : '')}${esc(def.text)}</div>
      ${def.rule ? `<div class="rc-sub">Regel: ${esc(RULE_TEXT[def.rule])}</div>` : ''}
      ${chips(def.reward)}<div class="bar" style="height:6px"><i style="width:${pct}%;background:${c.st === 'open' ? 'var(--pow)' : 'var(--good)'}"></i></div>
      <div class="rc-sub num">${Math.min(c.prog, def.n)} / ${def.n}</div></div>
    <div>${c.st === 'done' ? `<button class="btn btn-good btn-sm" data-act="claim-ch" data-kind="${kind}" data-key="${key}">Claim</button>` : c.st === 'claimed' ? '<span class="muted">Geclaimd</span>' : rule ? `<button class="btn btn-sm btn-sky" data-act="start-ch" data-kind="${kind}" data-key="${key}">Start</button>` : ''}</div></div>`;
}
function renderMissions() {
  Meta.ensureChallenges();
  const D = Store.data, tab = App.missionTab;
  const cnt = { daily: [...D.ch.day.list, ...D.ch.week.list].filter(c => c.st === 'done').length, perm: Object.values(D.ch.perm).filter(c => c.st === 'done').length, quests: QUESTS.filter(q => Meta.questState(q).claimable).length, ach: ACHIEVEMENTS.filter(a => D.ach[a.id] === 'done').length, login: Meta.loginClaimable() ? 1 : 0 };
  let body = '';
  if (tab === 'daily') {
    body = `<div class="two-col"><div><div class="screen-head" style="margin-bottom:8px"><h2 style="font-size:20px">Dagelijks</h2><span class="muted">Nieuwe over <span class="event-timer" data-timer="${endOfDay()}">${timeLeft(endOfDay() - Date.now())}</span></span></div>
        <div class="row-list">${D.ch.day.list.map((c, i) => chRow('day', i, Meta.chDef('day', c), c)).join('')}</div></div>
      <div><div class="screen-head" style="margin-bottom:8px"><h2 style="font-size:20px">Wekelijks</h2><span class="muted">Nieuwe over <span class="event-timer" data-timer="${endOfWeek()}">${timeLeft(endOfWeek() - Date.now())}</span></span></div>
        <div class="row-list">${D.ch.week.list.map((c, i) => chRow('week', i, Meta.chDef('week', c), c)).join('')}</div></div></div>
      <p class="muted" style="font-size:13px">Uitdagingen met een regel start je met de knop "Start": de regel wordt dan in het potje bewaakt. Andere voortgang telt automatisch mee in elk potje.</p>`;
  } else if (tab === 'perm') {
    body = `<div class="row-list">${PERM_CHALLENGES.map(def => chRow('perm', def.id, def, D.ch.perm[def.id] || { prog: 0, st: 'open' })).join('')}</div>`;
  } else if (tab === 'quests') {
    body = `<div class="row-list">${QUESTS.map(q => { const s = Meta.questState(q), v = Meta.questValue(q); return `<div class="row-card ${s.done ? 'claimed' : s.claimable ? 'done' : ''}">
        <div style="min-width:0"><div class="rc-title">${esc(q.text(s.n))}</div><div class="rc-sub">Niveau ${Math.min(s.i + 1, q.tiers.length)} van ${q.tiers.length}</div>${s.reward ? chips(s.reward) : ''}
        <div class="bar" style="height:6px"><i style="width:${Math.min(1, v / s.n) * 100}%"></i></div><div class="rc-sub num">${fmt(Math.min(v, s.n))} / ${fmt(s.n)}</div></div>
        <div>${s.claimable ? `<button class="btn btn-good btn-sm" data-act="claim-quest" data-id="${q.id}">Claim</button>` : s.done ? '<span class="muted">Voltooid</span>' : ''}</div></div>`; }).join('')}</div>`;
  } else if (tab === 'ach') {
    const got = ACHIEVEMENTS.filter(a => D.ach[a.id]).length;
    body = `<p class="muted">${got} van ${ACHIEVEMENTS.length} behaald.</p><div class="row-list">${ACHIEVEMENTS.map(a => { const st = D.ach[a.id]; return `<div class="row-card ${st === 'done' ? 'done' : st === 'claimed' ? '' : ''}" style="${st ? '' : 'opacity:.7'}">
        <div style="display:flex;gap:10px;align-items:center;min-width:0"><div class="bdg ${st ? '' : 'off'}" style="--bc:${a.color};flex:none">${esc(a.name[0])}</div>
        <div style="min-width:0"><div class="rc-title">${esc(a.name)}</div><div class="rc-sub">${esc(a.text)}</div>${chips(a.reward)}</div></div>
        <div>${st === 'done' ? `<button class="btn btn-good btn-sm" data-act="claim-ach" data-id="${a.id}">Claim</button>` : st === 'claimed' ? '<span class="muted">✓</span>' : ''}</div></div>`; }).join('')}</div>`;
  } else if (tab === 'login') {
    const day = D.login.day % 28, can = Meta.loginClaimable();
    body = `<div class="panel card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><span class="kicker">Login-kalender</span><h3>Dag ${day + 1} van 28</h3></div>
        ${can ? '<button class="btn btn-pow" data-act="claim-login">Claim vandaag</button>' : '<span class="muted">Vandaag al geclaimd. Kom morgen terug!</span>'}</div>
      <div class="cal">${LOGIN_CAL.map((r, i) => `<div class="cal-day ${i < day ? 'got' : ''} ${i === day && can ? 'today' : ''} ${(i + 1) % 7 === 0 ? 'big' : ''}"><b>Dag ${i + 1}</b>${Meta.rewardText(r).map(t => `<span>${esc(t)}</span>`).join('')}</div>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin:0">Elke 7e dag is een grote beloning. Dag 28 geeft de exclusieve skin "Trouwe Held". Een gemiste dag reset niets.</p></div>`;
  }
  $('#scr-missions').innerHTML = `<div class="screen-head"><div><span class="kicker">Doelen en beloningen</span><h2>Missies</h2></div></div>
    ${tabsHtml('mission-tab', tab, [['daily', 'Dagelijks & wekelijks', 0, cnt.daily], ['perm', 'Uitdagingen', 0, cnt.perm], ['quests', 'Quests', 0, cnt.quests], ['ach', 'Achievements', 0, cnt.ach], ['login', 'Login-kalender', 0, cnt.login]])}${body}`;
}
function startChallenge(kind, key) {
  const D = Store.data; let def;
  if (kind === 'perm') def = PERM_CHALLENGES.find(x => x.id === key); else def = Meta.chDef(kind, D.ch[kind].list[+key]);
  const rules = def.rule ? RULES[def.rule] : {};
  let mapId = def.map, di = Math.max(1, def.minDiff || 1);
  if (!mapId) { let best = 0; MAPS.forEach((m, i) => { if (Progress.mapUnlocked(i)) best = i; }); mapId = MAPS[Math.max(0, best - 1)].id; }
  const mi = MAPS.findIndex(m => m.id === mapId);
  if (mi >= 0 && !Progress.diffUnlocked(mi, di)) { toast(`Speel eerst ${MAPS[mi].name} op ${DIFFS[di].name} vrij.`, 'bad'); Sfx.play('error'); return; }
  startMatch({ map: mapId, diffIdx: di, mode: 'challenge', rules, back: 'missions' });
}

/* ---------------- Event ---------------- */
function renderEvent() {
  const D = Store.data, ev = Meta.activeEvent(), E = ev.def, st = Meta.evState(ev), map = SMAP[E.map], nx = Meta.nextEvent();
  $('#scr-event').innerHTML = `
  <div class="panel ev-hero" style="--ec:${E.color}">
    <div style="display:flex;flex-direction:column;gap:10px;min-width:0"><span class="kicker" style="color:#fff">Tijdelijk event · eindigt over <span class="event-timer" data-timer="${ev.ends}">${timeLeft(ev.ends - Date.now())}</span></span>
      <h2>${esc(E.name)}</h2><p style="margin:0;max-width:60ch">${esc(E.intro)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="cur-pill" style="--ec:${E.color}">${st.cur} ${esc(E.currency)}</span><span class="muted" style="font-size:13px;color:#e5e7eb">Verdien ${esc(E.currency.toLowerCase())} in elk potje; op de eventmap 3× zoveel.</span></div></div>
    <canvas data-portrait="${E.hero}" data-tier="5" data-sil="0" data-skin="" aria-label="${esc(HERO[E.hero].name)}"></canvas>
  </div>
  <div class="two-col" style="margin-top:18px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel card"><canvas data-map="${map.id}" style="width:100%;aspect-ratio:24/15;border:2px solid var(--edge);border-radius:4px;max-width:100%"></canvas>
        <span class="kicker">Eventmap · alleen tijdens ${esc(E.name)}</span><h3>${esc(map.name)}</h3><p class="muted" style="margin:0">${esc(map.desc)}</p>
        <div class="enemy-chips"><span class="chip">${enemyIcon(E.enemy, 18)}${ENEMIES[E.enemy].name} (nieuw)</span><span class="chip" style="border-color:#ff4d5e">${enemyIcon(E.boss, 18)}${ENEMIES[E.boss].name} (eventbaas)</span></div>
        <div class="pick-row">${DIFFS.map((d, i) => `<button class="btn btn-sm ${Progress.cleared(map.id, i) ? 'btn-good' : i === 1 ? 'btn-pow' : ''}" data-act="start-event" data-d="${i}" ${d.reqLevel > Store.data.level ? `disabled title="Vanaf level ${d.reqLevel}"` : ''}>${d.name}${Progress.cleared(map.id, i) ? ' ★' : ''}</button>`).join('')}</div></div>
      <div class="panel card"><span class="kicker">Eventquests</span><div class="row-list">${EVENT_QUESTS.map(q => { const s = Meta.evQuest(ev, q); return `<div class="row-card ${s.claimed ? 'claimed' : s.done ? 'done' : ''}"><div style="min-width:0"><div class="rc-title">${esc(q.text)}</div>${chips({ eventCur: q.reward, tokens: q.tokens || 0 })}<div class="bar" style="height:6px"><i style="width:${s.v / q.n * 100}%;background:${E.color}"></i></div><div class="rc-sub num">${s.v} / ${q.n}</div></div>
          <div>${s.done && !s.claimed ? `<button class="btn btn-good btn-sm" data-act="claim-evq" data-id="${q.id}">Claim</button>` : s.claimed ? '<span class="muted">✓</span>' : ''}</div></div>`; }).join('')}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel card"><span class="kicker">Eventwinkel</span><div class="shop">${EVENT_SHOP(E).map(it => { const owned = it.once && Meta.shopOwned(it, st.bought); return `<div class="shop-item">${it.reward.hero ? portrait(it.reward.hero, '', 3, false, '') : it.reward.skin ? portrait(D.team[0] || 'vuist', '', 2, false, it.reward.skin) : ''}<b>${esc(it.text)}</b><span class="sub">${esc(it.sub)}</span>
          <button class="btn btn-sm ${owned ? '' : 'btn-pow'}" data-act="buy-event" data-id="${it.id}" ${owned || st.cur < it.cost ? 'disabled' : ''}>${owned ? 'In bezit' : `${it.cost} ${esc(E.currency)}`}</button></div>`; }).join('')}</div></div>
      <div class="panel card"><span class="kicker">Event Gacha</span><p class="muted" style="margin:0">${esc(HERO[E.hero].name)} zit tijdens dit event ook in de Event Gacha, met verhoogde kans.</p><button class="btn btn-sm" data-act="goto-gacha" data-id="event">Naar Event Gacha</button></div>
      <div class="panel card"><span class="kicker">Evenementenkalender</span><div class="row-list">${SEASON_EVENTS.filter(e => !e.fallback).map(e => `<div class="row-card" style="border-left:5px solid ${e.color}"><div><div class="rc-title">${esc(e.name)}</div><div class="rc-sub">${e.from[1]}/${e.from[0]} t/m ${e.to[1]}/${e.to[0]} · ${esc(HERO[e.hero].name)}</div></div><div>${e.id === E.id ? '<span class="chip" style="background:var(--good);color:#032014">Nu</span>' : nx && nx.def.id === e.id ? `<span class="muted num">over ${Math.ceil((nx.start - Date.now()) / 864e5)} d</span>` : ''}</div></div>`).join('')}
        <div class="row-card" style="border-left:5px solid #1d4ed8"><div><div class="rc-title">Superheldenfestival</div><div class="rc-sub">Tussen de andere events in · Kapitein Komeet</div></div><div>${E.fallback ? '<span class="chip" style="background:var(--good);color:#032014">Nu</span>' : ''}</div></div></div></div>
    </div>
  </div>`;
  $$('#scr-event canvas[data-map]').forEach(cv => drawMapThumb(cv, mapById(cv.dataset.map)));
  hydratePortraits($('#scr-event'));
}

/* ---------------- Ranglijst ---------------- */
function renderLeaderboard() {
  const cat = App.lbCat, C = LB_CATS.find(c => c.id === cat), rows = Online.board(cat, App.lbSeason, App.lbMap);
  const fmtV = v => cat === 'fastest' ? `${Math.floor(v / 60)}:${pad2(Math.round(v % 60))}` : fmt(v);
  $('#scr-leaderboard').innerHTML = `<div class="screen-head"><div><span class="kicker">${App.lbSeason ? esc(seasonName()) + ' · reset over ' : 'Aller tijden'}${App.lbSeason ? `<span class="event-timer" data-timer="${endOfSeason()}">${timeLeft(endOfSeason() - Date.now())}</span>` : ''}</span><h2>Ranglijst</h2></div>
      <div class="pick-row"><button class="pick" data-act="lb-season" data-v="1" aria-pressed="${App.lbSeason}">Dit seizoen</button><button class="pick" data-act="lb-season" data-v="0" aria-pressed="${!App.lbSeason}">Aller tijden</button></div></div>
    ${tabsHtml('lb-cat', cat, LB_CATS.map(c => [c.id, c.name]))}
    ${cat === 'fastest' ? `<div class="pick-row" style="margin-bottom:12px">${MAPS.map(m => `<button class="pick" data-act="lb-map" data-id="${m.id}" aria-pressed="${App.lbMap === m.id}">${esc(m.name)}</button>`).join('')}</div>` : ''}
    <div class="panel card"><div class="lb-wrap"><table class="lb"><thead><tr><th>#</th><th>Speler</th><th>Level</th><th style="text-align:right">${esc(C.name)}</th></tr></thead><tbody>
      ${rows.length ? rows.slice(0, 50).map((r, i) => `<tr class="${r.id === Online.uid || r.me ? 'me' : ''}"><td class="rk">${i + 1}</td><td>${esc(r.me ? 'Jij' : Online.nameOf(r.id))}${r.title ? `<span class="ttl">${esc(titleName(r.title))}</span>` : ''}</td><td class="num">${r.level || 1}${r.prestige ? ` · P${r.prestige}` : ''}</td><td class="v">${fmtV(r.v)}</td></tr>`).join('') : `<tr><td colspan="4" class="muted">Nog geen scores in deze categorie. Speel een potje om op de lijst te komen.</td></tr>`}
    </tbody></table></div>
    <p class="muted" style="font-size:13px;margin:0">${Online.ready ? (Online.canWrite ? `Gedeelde ranglijst van iedereen die deze game speelt (${Online.scores.length} spelers). Je score wordt na elk potje bijgewerkt.` : 'Je kunt de ranglijst bekijken, maar je eigen score wordt niet gedeeld (je hebt geen schrijfrechten op deze pagina).') : 'Offline weergave: je ziet alleen je eigen records. Open de game via de gedeelde link om samen een ranglijst te hebben.'}</p></div>`;
}

/* ---------------- Profiel ---------------- */
function renderProfile() {
  const D = Store.data, S = D.stats, P = PRESTIGE[D.prestige], canP = Meta.canPrestige();
  const byR = RARITY_ORDER.map(r => [r, TRAITS.filter(t => t.rarity === r)]);
  const badgeList = [...ACHIEVEMENTS.filter(a => D.ach[a.id] === 'claimed').map(a => ({ c: a.color, t: a.name })), ...D.badges.map(b => ({ c: b === 'feniks' ? '#f472b6' : '#f59e0b', t: b === 'feniks' ? 'Feniks (prestige)' : b === 'crypte' ? 'Dungeon-meester' : `Raid: ${b}` }))];
  $('#scr-profile').innerHTML = `<div class="screen-head"><div><span class="kicker">Jouw voortgang</span><h2>Profiel</h2></div></div>
  <div class="two-col">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel card"><div style="display:flex;gap:14px;align-items:center"><div class="bdg" style="--bc:var(--sky);width:64px;height:64px;font-size:22px">${D.level}</div>
        <div style="flex:1;min-width:0"><h3>Spelerslevel ${D.level}${D.prestige ? ` · Prestige ${D.prestige}` : ''}</h3><div class="bar" style="margin-top:6px"><i style="width:${D.xp / xpForLevel(D.level) * 100}%;background:var(--sky)"></i></div><div class="muted num" style="font-size:13px">${fmt(D.xp)} / ${fmt(xpForLevel(D.level))} XP${D.prestige ? ` · +${Math.round((Meta.prestigeMult() - 1) * 100)}% munten en XP` : ''}</div></div></div>
        <label class="section-title" for="title-sel" style="margin:0">Titel</label>
        <select id="title-sel" style="font:inherit;padding:8px;border-radius:6px;border:2px solid var(--edge);background:var(--panel2);color:var(--text)">${D.titles.length ? D.titles.map(t => `<option value="${esc(t)}" ${D.title === t ? 'selected' : ''}>${esc(titleName(t))}</option>`).join('') : '<option>Nog geen titels</option>'}</select>
        <div class="stat-table">${[['Munten', fmt(D.coins)], ['Gems', fmt(D.gems)], ['Trait Tokens', D.tokens], ['Raidtokens', D.raidTokens], ...Object.keys(TICKETS).map(k => [TICKETS[k].name, D.tickets[k] || 0])].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div></div>
      <div class="panel card"><span class="kicker">Prestige (optioneel)</span>
        ${P ? `<h3>Prestige ${D.prestige + 1}: ${esc(P.text)}</h3>
          <p class="muted" style="margin:0">Voorwaarden: spelerslevel ${prestigeReqLevel(D.prestige)} (jij: ${D.level}) en alle 6 maps van wereld 1 op Normaal gehaald. Bij prestige gaan je munten terug naar 400, je sterren, spelerslevel en heldlevels terug naar begin. Je houdt je helden, traits, skins, mastery, tickets, titels en achievements.</p>
          ${App.confirm.prestige ? `<div class="confirm-box"><b>Echt prestige doen?</b><span style="font-size:13px">Dit kun je niet terugdraaien.</span><div class="btn-row" style="justify-content:flex-start"><button class="btn btn-danger btn-sm" data-act="prestige-yes">Ja, prestige</button><button class="btn btn-sm" data-act="prestige-no">Nee</button></div></div>` : `<button class="btn ${canP ? 'btn-pow' : ''}" data-act="prestige" ${canP ? '' : 'disabled'}>${canP ? 'Doe prestige' : 'Nog niet beschikbaar'}</button>`}` : '<h3>Maximale prestige bereikt</h3>'}
        <ol class="mtrack">${PRESTIGE.map(p => `<li class="${D.prestige >= p.n ? 'got' : ''}"><b>P${p.n}</b><span>${esc(p.text)}</span></li>`).join('')}</ol></div>
      <div class="panel card"><span class="kicker">Statistieken</span><div class="stat-list">${[['Potjes', S.games], ['Overwinningen', S.wins], ['Golven', S.waves], ['Vijanden', S.kills], ['Bazen', S.bossKills], ['Schade totaal', S.damage], ['Upgrades', S.upgrades], ['Abilities', S.abilities], ['Raids', S.raidsDone], ['Endless-record', S.endlessBest], ['Boss Rush-record', S.bossrushBest], ['Gacha-trekkingen', S.pulls], ['Mastery-XP', S.masteryXp], ['Munten verdiend', S.earned]].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${fmt(v || 0)}</div></div>`).join('')}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel card"><span class="kicker">Badges (${badgeList.length})</span><div class="badges">${badgeList.length ? badgeList.map(b => `<div class="bdg" style="--bc:${b.c}" title="${esc(b.t)}">${esc(b.t[0])}</div>`).join('') : '<span class="muted">Claim achievements om badges te verdienen.</span>'}</div></div>
      <div class="panel card"><span class="kicker">Trait-collectie · ${D.traitsSeen.length} van ${TRAITS.length}</span>
        ${byR.filter(([, l]) => l.length).map(([r, l]) => `<div class="section-title" style="margin:4px 0;color:${rarColor(r)}">${RARITIES[r].label}</div><div class="trait-grid">${l.map(t => { const seen = D.traitsSeen.includes(t.id); return `<div class="tg ${seen ? '' : 'unseen'}" style="--tc:${rarColor(r)}"><b>${seen ? esc(t.name) : '???'}</b>${seen ? esc(t.desc) : 'Nog niet gevonden'}</div>`; }).join('')}</div>`).join('')}</div>
      <div class="panel card"><span class="kicker">Skin-collectie · ${D.skins.length} algemene skins + ${Object.keys(D.heroSkins).length} mastery-skins</span>
        <div class="skin-grid">${SKINS.filter(s => !s.mastery).map(S => { const own = D.skins.includes(S.id); return `<div class="skin ${own ? '' : 'locked'}">${portrait(D.team[0] || 'vuist', '', 2, false, S.id)}<div class="sn">${esc(S.name)}</div><div class="ss">${own ? 'In bezit' : esc(S.source)}</div></div>`; }).join('')}</div></div>
    </div>
  </div>`;
  const sel = $('#title-sel'); if (sel) sel.addEventListener('change', () => { if (D.titles.includes(sel.value)) { D.title = sel.value; Store.save(); Online.submit(); toast(`Titel "${titleName(sel.value)}" gekozen.`, 'good'); } });
  hydratePortraits($('#scr-profile'));
}

/* ---------------- Acties ---------------- */
function afterClaim(lines) { if (!lines) return; Sfx.play('coin'); toast(`Ontvangen: ${lines.join(', ')}`, 'good'); rerender(); }
Object.assign(ACTIONS, {
  'mode-tab': b => { App.modeTab = b.dataset.tab; Sfx.play('click'); if (App.screen !== 'modes') nav('modes'); else renderModes(); },
  'mission-tab': b => { App.missionTab = b.dataset.tab; Sfx.play('click'); renderMissions(); },
  'lb-cat': b => { App.lbCat = b.dataset.tab; Sfx.play('click'); renderLeaderboard(); },
  'lb-season': b => { App.lbSeason = b.dataset.v === '1'; Sfx.play('click'); renderLeaderboard(); },
  'lb-map': b => { App.lbMap = b.dataset.id; renderLeaderboard(); },
  'lb-open': b => { App.lbCat = b.dataset.cat; nav('leaderboard'); },
  'endless-map': b => { App.endlessMap = b.dataset.id; renderModes(); },
  'start-endless': () => startMatch({ map: App.endlessMap, diffIdx: 1, mode: 'endless', back: 'modes' }),
  'start-bossrush': () => startMatch({ map: 'arena', diffIdx: 1, mode: 'bossrush', back: 'modes' }),
  'start-raid': b => { const r = RAIDS.find(x => x.id === b.dataset.id); startMatch({ map: r.map, diffIdx: 1, mode: 'raid', raid: r.id, raidDiff: +b.dataset.d, back: 'modes' }); },
  'start-coop': () => startMatch({ map: 'baai', diffIdx: 1, mode: 'coop', coopPool: Online.coopPool(), back: 'modes' }),
  'coop-claim': () => { const D = Store.data; if (D.coop.claimed || Online.coopPool() > 0) return; D.coop.claimed = true; afterClaim(Meta.grant({ raidTokens: 50, tokens: 3, tickets: { cosmic: 1 } })); Store.save(); },
  'cust-map': b => { App.custom.map = b.dataset.id; renderModes(); },
  'cust-diff': b => { App.custom.diff = +b.dataset.d; renderModes(); },
  'cust-mod': b => { const m = App.custom.mods, id = b.dataset.id, i = m.indexOf(id); if (i >= 0) m.splice(i, 1); else m.push(id); Sfx.play('click'); renderModes(); },
  'start-custom': () => { const C = App.custom; const secret = SMAP[C.map] && SMAP[C.map].kind === 'secret'; startMatch({ map: C.map, diffIdx: C.diff, mode: secret && !C.mods.length ? 'secret' : 'custom', mods: C.mods.slice(), back: 'modes' }); },
  'start-secret': b => startMatch({ map: b.dataset.id, diffIdx: +b.dataset.d, mode: 'secret', back: 'modes' }),
  'start-event': b => startMatch({ map: Meta.activeEvent().def.map, diffIdx: +b.dataset.d, mode: 'event', back: 'event' }),
  'buy-raid': b => afterClaim(Meta.buyRaid(b.dataset.id)),
  'buy-event': b => afterClaim(Meta.buyEvent(b.dataset.id)),
  'claim-evq': b => afterClaim(Meta.claimEvQuest(b.dataset.id)),
  'claim-ch': b => afterClaim(Meta.claimCh(b.dataset.kind, b.dataset.kind === 'perm' ? b.dataset.key : +b.dataset.key)),
  'start-ch': b => startChallenge(b.dataset.kind, b.dataset.key),
  'claim-quest': b => afterClaim(Meta.claimQuest(b.dataset.id)),
  'claim-ach': b => afterClaim(Meta.claimAch(b.dataset.id)),
  'claim-login': () => afterClaim(Meta.claimLogin()),
  'goto-gacha': b => { App.gachaSel = b.dataset.id; nav('gacha'); },
  'hero-tab': b => { App.heroTab = b.dataset.tab; App.confirm.reroll = null; openHeroModal(b.dataset.id, App.preview ? App.preview.tier : 0); },
  'equip-skin': b => { const id = b.dataset.id, o = Store.data.heroes[id]; o.skin = b.dataset.skin || null; Store.save(); Sfx.play('upgrade'); openHeroModal(id, App.preview ? App.preview.tier : 0); if (App.screen === 'collection') renderCollection(); if (App.screen === 'team') renderTeam(); },
  'skin-info': b => { const S = SKIN[b.dataset.skin]; toast(`Skin "${S.name}" krijg je via: ${S.source}.`); },
  'prestige': () => { App.confirm.prestige = true; renderProfile(); },
  'prestige-no': () => { App.confirm.prestige = false; renderProfile(); },
  'prestige-yes': () => { App.confirm.prestige = false; const l = Meta.doPrestige(); if (l) { Sfx.play('r-mythic'); toast(`Prestige ${Store.data.prestige}! ${l.join(', ')}`, 'good'); Online.submit(); } rerender(); },
});

/* ---------------- Trait Gacha ---------------- */
function traitGachaCard(sel) {
  return `<button class="gcard panel" data-act="sel-gacha" data-id="traits" aria-pressed="${sel}">
    <span class="tg-ico">T</span>
    <span style="min-width:0"><b style="font-family:var(--f-display);font-weight:400">Trait Gacha</b><br>
    <span class="muted" style="font-size:13px">Kies een held en rol een trait · ${TRAIT_COST.tokens} token of ${coinHtml(TRAIT_COST.coins)}</span></span></button>`;
}
function traitChance(t) { const tot = Object.values(TRAIT_WEIGHTS).reduce((a, b) => a + b, 0); return TRAIT_WEIGHTS[t.rarity] / tot / TRAITS.filter(x => x.rarity === t.rarity).length * 100; }
const pctTxt = v => (v < 1 ? v.toFixed(2) : v.toFixed(1)).replace('.', ',') + '%';
function renderTraitGacha() {
  const D = Store.data, owned = HEROES.filter(h => D.heroes[h.id]).sort((a, b) => (D.team.includes(b.id) - D.team.includes(a.id)) || rarOrd(b.rarity) - rarOrd(a.rarity));
  if (!App.traitHero || !D.heroes[App.traitHero]) App.traitHero = (D.team[0] && D.heroes[D.team[0]]) ? D.team[0] : owned[0].id;
  const id = App.traitHero, H = HERO[id], o = D.heroes[id], T = o.trait ? TRAIT[o.trait] : null;
  const tot = Object.values(TRAIT_WEIGHTS).reduce((a, b) => a + b, 0), tc = T ? rarColor(T.rarity) : '#3b3478';
  const conf = App.traitConfirm;
  $('#scr-gacha').innerHTML = `
  <div class="screen-head"><div><span class="kicker">Nieuwe helden en traits</span><h2>Gacha</h2></div>
    <div class="wallet"><span class="tok-pill"><span class="tok-ico"></span><span class="num">${D.tokens}</span></span><div class="coins"><span class="coin-ico"></span><span class="num">${fmt(D.coins)}</span></div></div></div>
  <div class="gacha-layout">
    <div class="gacha-list">${GACHAS.map(x => { const un = Progress.gachaUnlocked(x); return `
      <button class="gcard panel ${un ? '' : 'locked'}" data-act="sel-gacha" data-id="${x.id}" aria-pressed="false"><span class="capsule-ico" style="--g1:${x.color}"></span>
        <span style="min-width:0"><b style="font-family:var(--f-display);font-weight:400">${x.event ? esc(currentEvent().name) : x.name}</b><br><span class="muted" style="font-size:13px">${un ? `${coinHtml(x.price)} per trekking` : esc(Progress.unlockText(x))}</span></span></button>`; }).join('')}${traitGachaCard(true)}</div>
    <div class="panel gacha-detail" style="--rc:#c084fc">
      <div><span class="kicker">Trait Gacha</span><h3 style="font-size:26px">Rol een trait op een held</h3>
        <p class="muted" style="margin:4px 0 0">Kies hieronder een held en rol. De held krijgt de trait die je rolt; een eventuele oude trait wordt vervangen. Hoe zeldzamer de trait, hoe sterker of unieker het effect.</p></div>
      <div class="tg-layout">
        <div><div class="section-title" style="margin-top:0">1. Kies een held (${owned.length})</div>
          <div class="tg-pick">${owned.map(h => { const t = D.heroes[h.id].trait ? TRAIT[D.heroes[h.id].trait] : null; return `<button class="tg-hero" style="--rc:${rarColor(h.rarity)}" data-act="tg-hero" data-id="${h.id}" aria-pressed="${h.id === id}">${portrait(h.id)}<div class="tn2">${esc(h.name)}</div><span class="tt" style="color:${t ? rarColor(t.rarity) : 'var(--dim)'}">${t ? esc(t.name) : 'Geen trait'}</span></button>`; }).join('')}</div></div>
        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
          <div class="section-title" style="margin:0">2. Rol een trait</div>
          <div class="tg-sel" style="--tc:${tc}">${portrait(id, '', 3)}<div style="min-width:0;flex:1"><span class="chip rar rar-${H.rarity}">${RARITIES[H.rarity].label}</span><h3 style="font-size:22px;margin-top:4px">${esc(H.name)}</h3>
            ${T ? `<div><span class="kicker">Huidige trait</span><div><b style="color:${tc};font-size:18px">${esc(T.name)}</b> <span class="chip rar rar-${T.rarity}">${RARITIES[T.rarity].label}</span></div><div class="muted" style="font-size:13px">${esc(T.desc)}</div></div>` : '<div class="muted">Nog geen trait</div>'}</div></div>
          ${conf ? `<div class="confirm-box"><b>Je huidige trait vervangen?</b><span style="font-size:13px">${esc(H.name)} heeft ${esc(T.name)} (${RARITIES[T.rarity].label}). Na het rollen ben je die kwijt, ook als de nieuwe trait slechter is.</span>
            <div class="btn-row" style="justify-content:flex-start"><button class="btn btn-danger btn-sm" data-act="tg-roll-yes" data-pay="${conf}">Ja, rol toch</button><button class="btn btn-sm" data-act="tg-roll-no">Nee, houden</button></div></div>` : `
          <div class="pull-row"><button class="btn btn-pow" data-act="tg-roll" data-pay="token" ${Meta.canRollTrait('token') ? '' : 'disabled'}>Rol · ${TRAIT_COST.tokens} Trait Token</button>
            <button class="btn btn-sky" data-act="tg-roll" data-pay="coins" ${Meta.canRollTrait('coins') ? '' : 'disabled'}>Rol · ${coinHtml(TRAIT_COST.coins)}</button></div>`}
          <div class="muted" style="font-size:13px">Gegarandeerd <b style="color:var(--r-legendary)">Legendary of beter</b> binnen <b>${Meta.traitPityLeft()}</b> roll${Meta.traitPityLeft() === 1 ? '' : 's'}. Tokens verdien je met missies, raids, events, login-beloningen en achievements.</div>
        </div>
      </div>
      <div><div class="section-title" style="margin-top:0">Drop rates per zeldzaamheid</div>
        <div class="rates">${Object.keys(TRAIT_WEIGHTS).reverse().map(r => `<div class="rate-row"><span class="chip rar rar-${r}">${RARITIES[r].label}</span><div class="bar"><i style="width:${Math.max(1.5, TRAIT_WEIGHTS[r] / tot * 100)}%;background:${rarColor(r)}"></i></div><span class="pct">${pctTxt(TRAIT_WEIGHTS[r] / tot * 100)}</span></div>`).join('')}</div></div>
      <div><div class="section-title" style="margin-top:0">Alle mogelijke traits (${TRAITS.length}) · gevonden: ${D.traitsSeen.length}</div>
        <div class="tpool">${RARITY_ORDER.slice().reverse().map(r => { const l = TRAITS.filter(t => t.rarity === r); return l.length ? `<div class="tr"><span class="chip rar rar-${r}" style="align-self:start">${RARITIES[r].label}</span><div class="tl">${l.map(t => `<span class="${D.traitsSeen.includes(t.id) ? 'seen' : ''}" style="--tc:${rarColor(r)}" title="${esc(t.desc)}"><b>${esc(t.name)}</b> · ${pctTxt(traitChance(t))}</span>`).join('')}</div></div>` : ''; }).join('')}</div></div>
    </div>
  </div>`;
  hydratePortraits($('#scr-gacha'));
}
function requestTraitRoll(pay) {
  const o = Store.data.heroes[App.traitHero], T = o.trait ? TRAIT[o.trait] : null;
  if (!Meta.canRollTrait(pay)) { Sfx.play('error'); toast(pay === 'coins' ? `Je hebt ${fmt(TRAIT_COST.coins)} munten nodig.` : 'Je hebt geen Reroll Tokens meer.', 'bad'); return; }
  if (T && rarOrd(T.rarity) >= 3) { closeOverlay(); App.traitConfirm = pay; if (App.screen !== 'gacha') { App.gachaSel = 'traits'; nav('gacha'); } else renderTraitGacha(); return; }
  doTraitRoll(pay);
}
function doTraitRoll(pay) {
  App.traitConfirm = null;
  const id = App.traitHero, res = Meta.rollTraitOn(id, pay); if (!res) return;
  const T = TRAIT[res.now], mega = rarOrd(T.rarity) >= 6, col = rarColor(T.rarity);
  $('#overlay-root').innerHTML = `<div class="overlay ${mega ? 'mega' : ''}" id="treel" role="dialog" aria-modal="true" aria-label="Trait-roll">
    <div class="reel-stage">${portrait(id, '', 3)}<div class="kicker">${esc(HERO[id].name)} rolt een trait…</div>
      <div class="reel spin" id="reel"><span class="rn3" id="reel-n">?</span><span class="rd" id="reel-d"></span></div>
      <div id="reel-extra" class="tg-cmp" hidden></div>
      <div class="btn-row"><button class="btn" id="reel-skip" data-act="tg-skip">Overslaan</button>
        <span id="reel-btns" hidden style="display:contents"><button class="btn btn-pow" data-act="tg-again" data-pay="token" ${Meta.canRollTrait('token') ? '' : 'disabled'}>Nog eens · 1 token</button><button class="btn btn-sky" data-act="tg-again" data-pay="coins" ${Meta.canRollTrait('coins') ? '' : 'disabled'}>Nog eens · ${coinHtml(TRAIT_COST.coins)}</button><button class="btn btn-good" data-act="tg-done">Klaar</button></span></div>
    </div></div>`;
  hydratePortraits($('#treel'));
  Sfx.play('gacha'); if (mega) Sfx.play('cosmic');
  const steps = mega ? 34 : 24, reel = $('#reel'), nameEl = $('#reel-n'), descEl = $('#reel-d');
  App.reel = { timers: [], res, id };
  const show = t => { reel.style.setProperty('--rc', rarColor(t.rarity)); nameEl.textContent = t.name; };
  let delay = 0;
  for (let i = 0; i < steps; i++) {
    delay += 45 + Math.pow(i / steps, 3) * (mega ? 420 : 260);
    App.reel.timers.push(setTimeout(() => { const pool = mega && i > steps - 8 ? TRAITS.filter(t => rarOrd(t.rarity) >= 5) : TRAITS; show(pool[Math.floor(Math.random() * pool.length)]); Sfx.play('click'); }, delay));
  }
  App.reel.timers.push(setTimeout(finishTraitReel, delay + (mega ? 500 : 250)));
}
function finishTraitReel() {
  const R = App.reel; if (!R) return; R.timers.forEach(clearTimeout); App.reel = null;
  const T = TRAIT[R.res.now], reel = $('#reel'); if (!reel) return;
  reel.classList.remove('spin'); reel.classList.add('final'); reel.style.setProperty('--rc', rarColor(T.rarity));
  $('#reel-n').textContent = T.name; $('#reel-d').innerHTML = `<span class="chip rar rar-${T.rarity}">${RARITIES[T.rarity].label}</span>${T.mech ? ` · ${esc(T.mech)}` : ''}<br>${esc(T.desc)}`;
  const old = R.res.old ? TRAIT[R.res.old] : null, ex = $('#reel-extra'); ex.hidden = false;
  ex.innerHTML = `${old ? `<span class="muted">${esc(old.name)}</span><span>→</span>` : ''}<b style="color:${rarColor(T.rarity)}">${esc(T.name)}</b>${R.res.isNew ? '<span class="rtag">NIEUW in je collectie!</span>' : ''}${R.res.pity ? '<span class="rtag dup">Pity-garantie!</span>' : ''}`;
  $('#reel-skip').hidden = true; $('#reel-btns').hidden = false; $('#reel-btns').style.display = 'contents';
  Sfx.play('r-' + T.rarity);
  if (rarOrd(T.rarity) >= 4) { const fl = document.createElement('div'); fl.className = 'reveal-flash'; fl.style.setProperty('--c', rarColor(T.rarity)); document.body.appendChild(fl); setTimeout(() => fl.remove(), 700); }
  updateTopbar(); flushNotes();
}
Object.assign(ACTIONS, {
  'goto-trait': b => { App.traitHero = b.dataset.id; App.gachaSel = 'traits'; App.traitConfirm = null; closeOverlay(); nav('gacha'); },
  'tg-hero': b => { App.traitHero = b.dataset.id; App.traitConfirm = null; Sfx.play('click'); renderTraitGacha(); },
  'tg-roll': b => requestTraitRoll(b.dataset.pay),
  'tg-roll-yes': b => doTraitRoll(b.dataset.pay),
  'tg-roll-no': () => { App.traitConfirm = null; renderTraitGacha(); },
  'tg-skip': () => finishTraitReel(),
  'tg-again': b => requestTraitRoll(b.dataset.pay),
  'tg-done': () => { closeOverlay(); if (App.screen === 'gacha') renderTraitGacha(); updateCoins(); },
});
