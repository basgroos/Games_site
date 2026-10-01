/* =====================================================================
   UI UITBREIDING 3 — Shop, gems, werelden, dungeon, relikwieën,
   gem- en limited-gacha's, collectielevel
   ===================================================================== */
App.shopTab = 'rot'; App.dungeonDepth = null;
const gemHtml = n => `<span class="gem-ico sm"></span> <span class="num">${fmt(n)}</span>`;
function priceHtml(g, n) { return g.currency === 'gems' ? gemHtml(n) : coinHtml(n); }
function canPayG(g, n) { return (Store.data[g.currency || 'coins'] || 0) >= n; }
function resRar(r) { return r.skin ? 'epic' : HERO[r.id].rarity; }
const RATE_EXTRA = { skin: ['Skin', '#f472b6', 3.5], limited: ['Limited held', '#f59e0b', 99] };
function rateLabel(r) { return RARITIES[r] ? RARITIES[r].label : RATE_EXTRA[r][0]; }
function rateColor(r) { return RARITIES[r] ? RARITIES[r].color : RATE_EXTRA[r][1]; }
function rateOrd(r) { return RARITIES[r] ? rarOrd(r) : RATE_EXTRA[r][2]; }
function costHtml(cost) { return Object.keys(cost).map(k => k === 'coins' ? coinHtml(cost[k]) : k === 'gems' ? gemHtml(cost[k]) : `<span class="num">${fmt(cost[k])} ${CUR_LABEL[k] || k}</span>`).join(' + '); }

/* ---------- topbar, geluid ---------- */
const _updateTopbar3 = updateTopbar;
updateTopbar = function () {
  _updateTopbar3();
  const D = Store.data; if (!D) return;
  const gm = $('#tb-gems'); if (gm) gm.textContent = fmt(D.gems);
  const ds = $('#dot-shop'); if (ds) { const nw = D.shop && D.shop.seen !== Shop.rotKey(); ds.hidden = !nw; ds.textContent = '!'; }
  const dp = $('#dot-profile'); if (dp) { const n = (Meta.canPrestige() ? 1 : 0) + Meta.collClaimable(); dp.hidden = !n; dp.textContent = n > 9 ? '9+' : n; }
};
const _sfxPlay3 = Sfx.play.bind(Sfx);
Sfx.play = function (name) { if (name === 'r-secret') { _sfxPlay3('r-ultra'); return _sfxPlay3('cosmic'); } return _sfxPlay3(name); };

/* ---------- werelden ---------- */
function worldTabsHtml() {
  const w2 = MAPS.findIndex(m => m.world === 2), open2 = Progress.mapUnlocked(w2);
  const st = w => MAPS.reduce((s, m) => s + ((m.world || 1) === w ? Progress.stars(m.id) : 0), 0), mx = w => MAPS.filter(m => (m.world || 1) === w).length * DIFFS.length;
  return `<div class="world-tabs" role="group" aria-label="Wereld">
    <button data-act="world-tab" data-w="1" aria-pressed="${App.world === 1}">Wereld 1 · Aarde <span class="muted num">${st(1)}/${mx(1)} ★</span></button>
    <button data-act="world-tab" data-w="2" aria-pressed="${App.world === 2}">Wereld 2 · Voorbij de sterren <span class="muted num">${open2 ? `${st(2)}/${mx(2)} ★` : esc(Progress.lockText(w2))}</span></button></div>`;
}

/* ---------- Shop ---------- */
const SHOP_TABS = [['rot', 'Roterend'], ['deals', 'Speciale deals'], ['heroes', 'Helden'], ['skins', 'Skins'], ['tickets', 'Gacha Tickets'], ['tokens', 'Trait Tokens'], ['currency', 'Valuta']];
function shopVisual(it) {
  const r = it.reward;
  if (r.hero) return portrait(r.hero, '', 3, !Store.data.heroes[r.hero], '');
  if (r.skin) return portrait(Store.data.team[0] || 'vuist', '', 2, false, r.skin);
  if (r.tickets) { const k = Object.keys(r.tickets)[0]; return `<div class="ico-box"><div class="ticket-ico" style="--tc:${TICKETS[k].color}"></div></div>`; }
  if (r.tokens) return `<div class="ico-box"><span class="tok-ico" style="width:40px;height:40px;border-width:3px"></span></div>`;
  if (r.gems) return `<div class="ico-box"><span class="gem-ico lg"></span></div>`;
  if (r.raidTokens) return `<div class="ico-box"><span class="cur-pill" style="--ec:#f59e0b">Raid</span></div>`;
  return `<div class="ico-box"><span class="coin-ico" style="width:40px;height:40px"></span></div>`;
}
function shopCard(it) {
  const st = Shop.status(it), left = Shop.left(it), owned = it.hero && Store.data.heroes[it.hero];
  return `<div class="shop-item ${it.cat === 'deals' ? 'deal' : ''}">${it.disc && it.disc < 1 ? `<span class="disc">-${Math.round((1 - it.disc) * 100)}%</span>` : ''}${shopVisual(it)}
    <b>${esc(it.text)}</b><span class="sub">${esc(it.sub || '')}${owned ? ' · in bezit: +1 level' : ''}</span>
    <span class="sub">${esc(Meta.rewardText(it.reward).join(', '))}</span>
    ${it.per && it.per !== 'once' && left !== Infinity ? `<span class="left">Nog ${left}× ${it.per === 'day' ? 'vandaag' : it.per === 'week' ? 'deze week' : 'in deze rotatie'}</span>` : ''}
    <button class="btn btn-sm ${st.ok ? 'btn-pow' : ''}" data-act="shop-buy" data-id="${esc(it.id)}" ${st.ok ? '' : 'disabled'}>${st.ok || st.why === 'Te duur' ? `<span class="price">${costHtml(it.cost)}</span>` : esc(st.why)}</button></div>`;
}
function renderShop() {
  const D = Store.data, tab = App.shopTab; D.shop.seen = Shop.rotKey(); Shop.cleanup();
  const items = Shop.items(tab);
  const info = {
    rot: `<div class="rot-bar"><span class="muted">Nieuwe aanbiedingen over <b class="event-timer" data-timer="${Shop.rotEnds()}">${timeLeft(Shop.rotEnds() - Date.now())}</b> (elke ${SHOP_ROT_HOURS} uur).</span><button class="btn btn-sm btn-sky" data-act="shop-refresh">Nu vernieuwen · ${gemHtml(SHOP_ROT_REFRESH)}</button></div>`,
    deals: `<p class="muted" style="margin:0 0 12px">Tijdelijke bundels: elke week drie nieuwe deals, elk één keer te koop. Ze wisselen over <b class="event-timer" data-timer="${endOfWeek()}">${timeLeft(endOfWeek() - Date.now())}</b>.</p>`,
    heroes: `<p class="muted" style="margin:0 0 12px">Elke week zes helden direct te koop, één per zeldzaamheid van Common tot Mythic. Heb je de held al, dan krijgt hij +1 level. Exotic, Ultra en Secret zijn alleen via gacha's te krijgen.</p>`,
    skins: `<p class="muted" style="margin:0 0 12px">Skins zijn voor al je helden tegelijk. Kies ze per held in het Skins-tabblad van de held.</p>`,
    tickets: `<p class="muted" style="margin:0 0 12px">Tickets geven één gratis trekking in de bijbehorende gacha, inclusief pity.</p>`,
    tokens: `<p class="muted" style="margin:0 0 12px">Met Trait Tokens rol je een nieuwe trait op een held in de Trait Gacha.</p>`,
    currency: `<p class="muted" style="margin:0 0 12px">Wissel valuta om. Gems voor munten kan maar 4× per week.</p>`,
  }[tab];
  $('#scr-shop').innerHTML = `<div class="screen-head"><div><span class="kicker">Direct kopen</span><h2>Shop</h2></div></div>
    <div class="shop-head">
      <div class="cur-card"><span class="coin-ico ci"></span><div><b>${fmt(D.coins)}</b><span>Munten: verdien je met elke match. Voor levels, gacha's en de Shop.</span></div></div>
      <div class="cur-card"><span class="gem-ico lg ci" style="width:26px;height:26px"></span><div><b>${fmt(D.gems)} Gems</b><span>Zeldzaam: missies, achievements, drops, dungeon, collectie. Voor gem-gacha's, skins en deals.</span></div></div>
      <div class="cur-card"><span class="tok-ico ci"></span><div><b>${D.tokens} Trait Tokens</b><span>Voor de Trait Gacha: rol een trait op een held.</span></div></div>
      <div class="cur-card"><span class="cur-pill ci" style="--ec:#f59e0b;font-size:13px">R</span><div><b>${D.raidTokens} Raidtokens</b><span>Uit raids. Voor de Raid-winkel bij Modi.</span></div></div>
      <div class="cur-card"><span class="cur-pill ci" style="--ec:${Meta.activeEvent().def.color};font-size:13px">E</span><div><b>${Meta.evState(Meta.activeEvent()).cur} ${esc(Meta.activeEvent().def.currency)}</b><span>Eventvaluta: alleen tijdens het event, voor de Event-winkel.</span></div></div>
    </div>
    ${tabsHtml('shop-tab', tab, SHOP_TABS.map(([k, l]) => [k, l]))}
    ${info}
    <div class="shop">${items.map(shopCard).join('') || '<p class="muted">Niets te koop.</p>'}</div>`;
  hydratePortraits($('#scr-shop')); updateTopbar();
}

/* ---------- gacha: gems, limited en skins ---------- */
const _gachaPool3 = gachaPool;
gachaPool = function (g) {
  if (!g.limited) return _gachaPool3(g);
  const L = Meta.limitedSet(), out = [];
  L.heroes.forEach(id => out.push({ id, rarity: HERO[id].rarity, rate: g.rates.limited / L.heroes.length, featured: true, cat: 'limited' }));
  L.skins.forEach(s => out.push({ skin: s, id: null, rarity: 'epic', rate: g.rates.skin / L.skins.length, cat: 'skin' }));
  for (const r of ['legendary', 'mythic']) { const list = HEROES.filter(h => h.rarity === r && !h.exclusive); list.forEach(h => out.push({ id: h.id, rarity: r, rate: g.rates[r] / list.length })); }
  return out;
};
function skinPoolItem(p) {
  const own = Store.data.skins.includes(p.skin);
  return `<button class="pool-item" style="--rc:#f472b6" data-act="skin-info" data-skin="${p.skin}">${portrait(Store.data.team[0] || 'vuist', '', 2, false, p.skin)}${own ? '<span class="own">In bezit</span>' : ''}<div class="pn">Skin: ${esc(SKIN[p.skin].name)}</div><div class="pr">${(p.rate < 1 ? p.rate.toFixed(2) : p.rate.toFixed(1)).replace('.', ',')}%</div></button>`;
}
function grantSkinPull(id) { const D = Store.data; if (D.skins.includes(id)) { D.gems += 15; return { skin: id, gems: 15 }; } D.skins.push(id); return { skin: id, isNew: true }; }
function rollList(list) { const tot = list.reduce((s, x) => s + x.rate, 0); let r = Math.random() * tot; for (const x of list) { r -= x.rate; if (r <= 0) return x; } return list[list.length - 1]; }
doPull = function (gid, n, ticket) {
  const g = GACHAS.find(x => x.id === gid), D = Store.data;
  if (!g || !Progress.gachaUnlocked(g)) return;
  const cur = g.currency || 'coins';
  if (ticket) { const tk = ticketFor(gid); if (!tk || (D.tickets[tk] || 0) < 1) return; D.tickets[tk]--; n = 1; }
  else {
    const price = n === 10 ? g.price * 9 : g.price;
    if ((D[cur] || 0) < price) { Sfx.play('error'); toast(`Je hebt ${fmt(price - (D[cur] || 0))} ${CUR_LABEL[cur]} te weinig.${cur === 'gems' ? ' Verdien Gems met missies, achievements, drops en de dungeon.' : ' Speel een map om munten te verdienen.'}`, 'bad'); return; }
    D[cur] -= price;
  }
  const pool = gachaPool(g), res = [];
  for (let i = 0; i < n; i++) {
    let minOrd = 0, forceLim = false;
    if (n === 10 && i === n - 1 && !res.some(r => r.id && rarOrd(HERO[r.id].rarity) >= rarOrd(g.guarantee10))) minOrd = rarOrd(g.guarantee10);
    if (g.pity) { const k = g.pity.key; D[k] = (D[k] || 0) + 1; if (D[k] >= g.pity.n) { if (g.pity.rarity === 'limited') forceLim = true; else minOrd = Math.max(minOrd, rarOrd(g.pity.rarity)); } }
    const pick = forceLim ? rollList(pool.filter(p => p.cat === 'limited')) : rollFrom(pool, minOrd);
    if (g.pity && (g.pity.rarity === 'limited' ? pick.cat === 'limited' : !pick.skin && rarOrd(pick.rarity) >= rarOrd(g.pity.rarity))) D[g.pity.key] = 0;
    res.push(pick.skin ? grantSkinPull(pick.skin) : grantHero(pick.id));
  }
  D.stats.pulls += n; Meta.checkAchievements(); Store.save(); updateCoins();
  showReveal(res, g);
};

/* ---------- dungeon ---------- */
function dungeonBody() {
  const D = Store.data, open = Meta.dungeonUnlocked(), max = Meta.dungeonMaxDepth();
  if (App.dungeonDepth == null || App.dungeonDepth > max) App.dungeonDepth = max;
  const dep = App.dungeonDepth, rooms = dungeonRooms(dep), um = mapById(DUNGEON.unlock.map);
  return `<div class="two-col"><div class="panel card"><span class="kicker">Dungeon · De Diepe Crypte</span><h3>Kamer na kamer de diepte in</h3>
      <p class="muted" style="margin:0">Elke run heeft ${DUNGEON.rooms} kamers: ${DUNGEON.rooms - 1} kamers van ${DUNGEON.wavesPerRoom} golven met elk een eigen thema, daarna de Troonzaal met de Kerkerheer. Na elke kamer kies je 1 van 3 relikwieën die je team de rest van de run sterker maken. Elke diepte is 40% sterker, heeft meer elites en geeft betere beloningen. De kamers wisselen elke dag.</p>
      ${open ? `<div class="section-title" style="margin:0">Diepte</div><div class="depth-row">${Array.from({ length: DUNGEON.maxDepth }, (_, i) => i + 1).map(d => `<button class="pick" data-act="dungeon-depth" data-d="${d}" aria-pressed="${d === dep}" ${d > max ? 'disabled title="Voltooi eerst de vorige diepte"' : ''}>${d}${d <= (D.dungeon.best || 0) ? ' ✓' : ''}</button>`).join('')}</div>
        <div class="section-title" style="margin:0">Kamers vandaag op diepte ${dep}</div>
        <div class="row-list">${rooms.map((r, i) => `<div class="row-card" style="display:block"><b>${i + 1}. ${esc(r.name)}</b> <span class="muted" style="font-size:13px">· ${esc(r.desc)}</span><div class="enemy-chips" style="margin-top:6px">${[...new Set(i === rooms.length - 1 ? ['kerkerheer'] : r.pool)].slice(0, 4).map(t => `<span class="chip">${enemyIcon(t, 18)}${ENEMIES[t].name}</span>`).join('')}</div></div>`).join('')}</div>
        <button class="btn btn-pow btn-xl" data-act="start-dungeon">Betreed diepte ${dep}</button>`
      : `<span class="chip">Vanaf spelerslevel ${DUNGEON.unlockLevel} en ${esc(um.name)} op ${DIFFS[DUNGEON.unlock.diff].name}</span>`}</div>
    <div class="panel card"><span class="kicker">Jouw record: diepte ${D.dungeon.best || 0} van ${DUNGEON.maxDepth}</span><h3>Beloningen</h3>
      <p class="muted" style="margin:0">Elke overwinning: munten, Gems en Trait Tokens (meer per diepte). De eerste keer dat je een diepte haalt krijg je extra:</p>
      <div class="row-list">${Object.keys(DUNGEON_FIRST).map(k => `<div class="row-card ${+k <= (D.dungeon.best || 0) ? 'claimed' : ''}"><div><b>Diepte ${k}</b></div>${chips(DUNGEON_FIRST[k])}${+k <= (D.dungeon.best || 0) ? '<span class="muted">✓</span>' : ''}</div>`).join('')}</div>
      <div class="section-title" style="margin:0">Relikwieën</div><div class="enemy-chips">${RELICS.map(r => `<span class="chip" title="${esc(r.desc)}">${esc(r.name)}</span>`).join('')}</div>
      <button class="btn btn-sm" data-act="lb-open" data-cat="dungeon">Bekijk scores</button></div></div>`;
}
function showRelicPick() {
  const g = App.game; if (!g || !g.relicOffer || g.over) return;
  g.paused = true;
  $('#overlay-root').innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-label="Kies een relikwie"><div style="display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center">
    <span class="kicker">Kamer ${Math.floor(g.wave / DUNGEON.wavesPerRoom)} veroverd · diepte ${g.depth}</span><h2 style="color:#bef264;font-size:34px">Kies een relikwie</h2>
    <p class="muted" style="margin:0">Het relikwie werkt de rest van deze run.</p>
    <div class="relic-grid">${g.relicOffer.map(id => { const R = RELICS.find(r => r.id === id); return `<button class="relic" data-act="relic-pick" data-id="${id}"><span class="rg">${esc(R.name[0])}</span><b>${esc(R.name)}</b><span>${esc(R.desc)}</span></button>`; }).join('')}</div>
    ${g.relics.length ? `<p class="muted" style="margin:0;font-size:13px">Al gekozen: ${g.relics.map(id => esc(RELICS.find(r => r.id === id).name)).join(', ')}</p>` : ''}</div></div>`;
  Sfx.play('ability');
}
const _handleGameEvents3 = handleGameEvents;
handleGameEvents = function () {
  const g = App.game;
  if (g && g.events.some(e => e.type === 'relic')) setTimeout(() => { if (App.game === g && g.relicOffer && !$('#overlay-root').children.length) showRelicPick(); }, 900);
  _handleGameEvents3();
};
const _renderSide3 = renderSide;
renderSide = function () {
  _renderSide3();
  const g = App.game, side = $('#side'); if (!g || !side || g.sel || g.mode !== 'dungeon') return;
  const cur = g.wave ? Math.floor((g.wave - 1) / DUNGEON.wavesPerRoom) : -1;
  side.insertAdjacentHTML('afterbegin', `<div><span class="kicker">Diepte ${g.depth} · kamers</span><div class="room-strip" style="margin-top:4px">${g.rooms.map((r, i) => `<span class="${i === cur ? 'on' : ''}">${i + 1}. ${esc(r.name)}</span>`).join('')}</div>
    ${g.relics.length ? `<div class="kicker" style="margin-top:8px">Relikwieën</div><div class="wave-preview">${g.relics.map(id => `<span title="${esc(RELICS.find(r => r.id === id).desc)}">${esc(RELICS.find(r => r.id === id).name)}</span>`).join('')}</div>` : ''}
    ${g.relicOffer ? '<button class="btn btn-good btn-sm" style="margin-top:8px" data-act="g-start">Kies je relikwie</button>' : ''}</div>`);
};

/* ---------- profiel en collectie ---------- */
function collPanel() {
  const D = Store.data, c = collectionInfo(), cl = Meta.collClaimable(), f = c.next ? (c.pts - c.cur) / (c.next - c.cur) : 1;
  return `<div class="panel card"><span class="kicker">Collectielevel</span><h3>Level ${c.level} van ${c.max}</h3>
    <div class="coll-bar"><i style="width:${Math.round(f * 100)}%"></i></div>
    <div class="muted num" style="font-size:13px">${fmt(c.pts)} punten${c.next ? ` · volgende level bij ${fmt(c.next)}` : ' · maximaal'} · +${Math.round(COLL_BONUS * c.level * 100)}% munten per match</div>
    <p class="muted" style="margin:0;font-size:13px">Punten krijg je voor elke held (zeldzamer = meer), elke skin en elke ontdekte trait. Elk level geeft Gems en soms tickets of Trait Tokens.</p>
    ${cl ? `<button class="btn btn-good" data-act="coll-claim">Claim ${cl} collectiebeloning${cl > 1 ? 'en' : ''}</button>` : ''}</div>`;
}
const _renderProfile3 = renderProfile;
renderProfile = function () { _renderProfile3(); const col = $('#scr-profile .two-col > div:last-child'); if (col) col.insertAdjacentHTML('afterbegin', collPanel()); };
const _renderCollection3 = renderCollection;
renderCollection = function () {
  _renderCollection3();
  const c = collectionInfo(), cl = Meta.collClaimable(), head = $('#scr-collection .screen-head');
  if (head) head.insertAdjacentHTML('afterend', `<div class="panel" style="padding:10px 14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><b style="font-family:var(--f-display);font-weight:400">Collectielevel ${c.level}</b><div class="coll-bar" style="flex:1;min-width:140px"><i style="width:${c.next ? Math.round((c.pts - c.cur) / (c.next - c.cur) * 100) : 100}%"></i></div><span class="muted num">${fmt(c.pts)}${c.next ? ' / ' + fmt(c.next) : ''} punten · +${Math.round(COLL_BONUS * c.level * 100)}% munten</span>${cl ? `<button class="btn btn-good btn-sm" data-act="coll-claim">Claim (${cl})</button>` : ''}</div>`);
};

/* ---------- acties ---------- */
Object.assign(ACTIONS, {
  'world-tab': b => { App.world = +b.dataset.w; const i = MAPS.findIndex((m, j) => (m.world || 1) === App.world && Progress.mapUnlocked(j)); if (i >= 0 && (MAPS[App.mapSel].world || 1) !== App.world) App.mapSel = i; Sfx.play('click'); renderMaps(); },
  'shop-tab': b => { App.shopTab = b.dataset.tab; Sfx.play('click'); renderShop(); },
  'shop-buy': b => { const l = Shop.buy(b.dataset.id); if (l) { Sfx.play('coin'); toast(`Gekocht: ${l.join(', ')}`, 'good'); } renderShop(); updateCoins(); flushNotes(); },
  'shop-refresh': () => { if (Shop.refresh()) { Sfx.play('gacha'); toast('Nieuwe aanbiedingen!', 'good'); } renderShop(); },
  'dungeon-depth': b => { App.dungeonDepth = +b.dataset.d; Sfx.play('click'); renderModes(); },
  'start-dungeon': () => { if (!Meta.dungeonUnlocked()) return; startMatch({ map: 'crypte', diffIdx: 1, mode: 'dungeon', depth: App.dungeonDepth || 1, back: 'modes' }); },
  'relic-pick': b => { const g = App.game; if (!g || !g.chooseRelic(b.dataset.id)) return; closeOverlay(); g.paused = false; Sfx.play('bigupgrade'); $$('#deck .dcard').forEach(c => { const el = c.querySelector('.dc'); if (el) el.textContent = '$' + g.costOf(c.dataset.id); }); renderSide(); },
  'coll-claim': () => afterClaim(Meta.claimColl()),
});
