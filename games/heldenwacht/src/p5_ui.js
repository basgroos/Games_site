/* =====================================================================
   UI: schermen, gacha, collectie, team, instellingen, match-HUD
   ===================================================================== */
const App = { modeTab: 'endless', missionTab: 'daily', lbCat: 'wave', lbSeason: true, lbMap: 'stad', heroTab: 'info', custom: { map: 'stad', diff: 1, mods: [] }, secretDiff: 1, evDiff: 1, endlessMap: 'stad', lastMatch: null, screen: 'home', mapSel: 0, diffSel: 1, gachaSel: 'basic', collFilter: 'all', game: null, preview: null, confirm: {}, lastTs: 0, cv: null, k: 1 };
const rarColor = r => RARITIES[r].color;
const rarOrd = r => RARITY_ORDER.indexOf(r);
const coinHtml = n => `<span class="coin-ico sm"></span> <span class="num">${fmt(n)}</span>`;
function starsHtml(n) { return `<span class="stars" aria-label="${n} van ${DIFFS.length} sterren">${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, DIFFS.length - n))}</span></span>`; }
function portrait(id, cls = '', tier = 0, sil = false, skin) { const sk = skin === undefined ? ((Store.data.heroes[id] || {}).skin || '') : (skin || ''); return `<canvas class="${cls}" data-portrait="${id}" data-tier="${tier}" data-sil="${sil ? 1 : 0}" data-skin="${sk}" aria-hidden="true"></canvas>`; }
function toast(msg, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2800); }
function updateCoins() { $('#coin-count').textContent = fmt(Store.data.coins); updateTopbar(); }

/* ---------------- navigatie ---------------- */
function nav(to) {
  App.screen = to;
  $$('#main > section').forEach(s => { s.hidden = s.id !== 'scr-' + to; });
  $$('.nav button').forEach(b => b.setAttribute('aria-current', b.dataset.to === to ? 'page' : 'false'));
  ({ home: renderHome, maps: renderMaps, gacha: renderGacha, collection: renderCollection, team: renderTeam, settings: renderSettings, modes: renderModes, missions: renderMissions, event: renderEvent, leaderboard: renderLeaderboard, profile: renderProfile, shop: renderShop })[to]();
  updateCoins(); flushNotes(); window.scrollTo(0, 0);
}

/* ---------------- Home ---------------- */
function nextGoal() {
  for (let i = 0; i < MAPS.length; i++) {
    if (!Progress.mapUnlocked(i)) return `${Progress.lockText(i)} om ${MAPS[i].name} vrij te spelen.`;
    for (let d = 1; d < DIFFS.length; d++) if (!Progress.cleared(MAPS[i].id, d) && Progress.diffUnlocked(i, d)) return `Voltooi ${MAPS[i].name} op ${DIFFS[d].name} (${DIFFS[d].waves} golven).`;
  }
  return 'Alles verslagen! Verzamel de laatste Mythics en maximaliseer je helden.';
}
function renderHome() {
  Meta.ensureChallenges();
  const D = Store.data, owned = Object.keys(D.heroes).length, ev = Meta.activeEvent(), es = Meta.evState(ev);
  const dl = D.ch.day.list.map(c => ({ c, def: Meta.chDef('day', c) }));
  const login = Meta.loginClaimable(), lr = LOGIN_CAL[D.login.day % 28];
  $('#scr-home').innerHTML = `
  <div class="home-hero panel">
    <canvas id="home-cv" aria-label="Je team op een dak in de nacht"></canvas>
    <div class="home-copy">
      <span class="kicker">Tower defense · ${HEROES.length} superhelden · ${MAPS.length + SPECIAL_MAPS.filter(m => m.kind === 'secret' || m.kind === 'event').length} maps</span>
      <h1>Heldenwacht</h1>
      <p>Plaats je superhelden langs het pad, stop de golven schurken en verdien munten voor nieuwe helden.</p>
      <div class="btn-row" style="justify-content:flex-start"><button class="btn btn-pow btn-xl" data-act="nav" data-to="maps">Spelen</button><button class="btn" data-act="nav" data-to="modes">Modi</button></div>
    </div>
  </div>
  <div class="home-grid">
    <div class="panel home-card"><span class="kicker">Dagelijkse beloning · dag ${(D.login.day % 28) + 1} van 28</span>
      <h3>${login ? 'Klaar om te claimen' : 'Morgen weer een beloning'}</h3>
      <div class="reward-chips">${Meta.rewardText(lr).map(t => `<span>${esc(t)}</span>`).join('')}</div>
      <div><button class="btn btn-sm ${login ? 'btn-pow' : ''}" data-act="${login ? 'claim-login' : 'nav'}" data-to="missions" ${login ? '' : 'data-tab="login"'}>${login ? 'Claim beloning' : 'Bekijk kalender'}</button></div></div>
    <div class="panel home-card" style="border-top:4px solid ${ev.def.color}"><span class="kicker">Event · nog <span class="event-timer" data-timer="${ev.ends}">${timeLeft(ev.ends - Date.now())}</span></span><h3>${esc(ev.def.name)}</h3>
      <div class="team-strip">${portrait(ev.def.hero, '', 3, !D.heroes[ev.def.hero], '')}<span class="muted" style="font-size:14px">${esc(HERO[ev.def.hero].name)} · ${es.cur} ${esc(ev.def.currency)}</span></div>
      <div><button class="btn btn-sm" data-act="nav" data-to="event">Naar event</button></div></div>
    <div class="panel home-card"><span class="kicker">Dagelijkse uitdagingen</span>
      ${dl.map(({ c, def }) => `<div style="font-size:14px"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(def.text)}</span><b class="num">${c.st === 'open' ? `${Math.min(c.prog, def.n)}/${def.n}` : c.st === 'done' ? 'Klaar!' : '✓'}</b></div><div class="bar" style="height:6px"><i style="width:${Math.min(1, c.prog / def.n) * 100}%;background:${c.st === 'open' ? 'var(--pow)' : 'var(--good)'}"></i></div></div>`).join('')}
      <div><button class="btn btn-sm" data-act="nav" data-to="missions">Alle missies</button></div></div>
    <div class="panel home-card"><span class="kicker">Volgend doel</span><h3>${esc(nextGoal())}</h3>
      <div class="muted">Sterren: <b class="num">${Progress.totalStars()}</b> / ${MAPS.length * DIFFS.length} · ${owned} van ${HEROES.length} helden</div>
      <div class="bar"><i style="width:${Progress.totalStars() / (MAPS.length * DIFFS.length) * 100}%"></i></div></div>
    <div class="panel home-card"><span class="kicker">De spelloop</span>
      <ol class="loop"><li>Speel maps, raids en modi</li><li>Verdien munten, tickets en tokens</li><li>Open gacha's en verzamel helden</li><li>Upgrade, reroll traits en bouw mastery</li><li>Versla uitdagingen, events en de ranglijst</li></ol></div>
  </div>`;
  hydratePortraits($('#scr-home'));
}
const HOME_STARS = Array.from({ length: 70 }, (_, i) => { const r = mulberry32(i + 3); return [r(), r() * 0.6, r() * 1.5 + 0.3]; });
function drawHome(ts) {
  const cv = $('#home-cv'); if (!cv || App.screen !== 'home') return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = ts / 1000;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b1450'); g.addColorStop(1, '#3a1f5c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (const [x, y, s] of HOME_STARS) { ctx.globalAlpha = 0.5 + Math.sin(t * 2 + x * 20) * 0.4; ctx.fillStyle = '#fff'; ctx.fillRect(x * w, y * h, s, s); } ctx.globalAlpha = 1;
  ctx.fillStyle = '#fef3c7'; circle(ctx, w * 0.82, h * 0.2, 26); ctx.fill(); ctx.fillStyle = '#1b1450'; circle(ctx, w * 0.82 + 10, h * 0.2 - 6, 22); ctx.fill();
  // zoeklichten
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [bx, sp] of [[0.2, 0.6], [0.7, -0.5]]) { const a = -Math.PI / 2 + Math.sin(t * sp) * 0.5; ctx.fillStyle = 'rgba(255,210,63,.08)'; ctx.beginPath(); ctx.moveTo(w * bx, h); ctx.lineTo(w * bx + Math.cos(a - 0.08) * h * 1.4, h + Math.sin(a - 0.08) * h * 1.4); ctx.lineTo(w * bx + Math.cos(a + 0.08) * h * 1.4, h + Math.sin(a + 0.08) * h * 1.4); ctx.fill(); }
  ctx.restore();
  // skyline
  const r = mulberry32(42); ctx.fillStyle = '#120d33'; let x = 0; while (x < w) { const bw = 30 + r() * 50, bh = h * (0.25 + r() * 0.35); ctx.fillRect(x, h - bh, bw, bh); ctx.fillStyle = 'rgba(253,230,138,.5)'; for (let wy = h - bh + 8; wy < h - 20; wy += 12) for (let wx = x + 6; wx < x + bw - 6; wx += 10) if (r() < 0.25) ctx.fillRect(wx, wy, 4, 5); ctx.fillStyle = '#120d33'; x += bw + 4; }
  ctx.fillStyle = '#0c0a1d'; ctx.fillRect(0, h - 40, w, 40); ctx.fillStyle = '#2c2560'; ctx.fillRect(0, h - 44, w, 4);
  const team = Store.data.team.length ? Store.data.team : ['vuist', 'pijl'];
  const n = team.length, sc = clamp(Math.min(w / (n * 44 + 40), h / 90), 1.2, 3.2);
  team.forEach((id, i) => { const hx = w / 2 + (i - (n - 1) / 2) * sc * 42; drawHero(ctx, HERO[id], hx, h - 44 - 15 * sc, sc, t + i * 0.7, { seed: i * 2, ang: i < n / 2 ? Math.PI - 0.3 : 0.3, tier: Math.min(5, heroLevel(id) >= 10 ? 5 : Math.floor((heroLevel(id) - 1) / 2)) }); });
}

/* ---------------- Maps ---------------- */
function drawMapThumb(cv, map) {
  const bg = mapBackground(map), dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 240, h = w * GH / GW;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d'); ctx.drawImage(bg.canvas, 0, 0, cv.width, cv.height);
}
function renderMaps() {
  if (!Progress.mapUnlocked(App.mapSel)) App.mapSel = 0;
  if (App.world == null) App.world = MAPS[App.mapSel].world || 1;
  const m = MAPS[App.mapSel];
  if (!Progress.diffUnlocked(App.mapSel, App.diffSel)) App.diffSel = 1;
  const base = m.reward;
  const team = Store.data.team;
  $('#scr-maps').innerHTML = `
  <div class="screen-head"><div><span class="kicker">Kies je slagveld</span><h2>Maps</h2></div><div class="muted">Moeilijkere maps en moeilijkheden leveren meer munten op.</div></div>
  ${worldTabsHtml()}
  <div class="maps-layout">
    <div class="map-grid">${MAPS.map((mp, i) => { if ((mp.world || 1) !== App.world) return ''; const un = Progress.mapUnlocked(i); return `
      <button class="map-card panel ${un ? '' : 'locked'}" data-act="sel-map" data-i="${i}" aria-pressed="${i === App.mapSel}" ${un ? '' : 'aria-disabled="true"'}>
        <canvas data-map="${mp.id}" aria-hidden="true"></canvas>
        ${un ? '' : `<span class="lock-tag">${esc(Progress.lockText(i))}</span>`}
        <div class="mc-body"><div><div class="mc-name">${esc(mp.name)}</div><div class="muted" style="font-size:13px">${THEMES[mp.theme].label}</div></div>${starsHtml(Progress.stars(mp.id))}</div>
      </button>`; }).join('')}</div>
    <div class="panel map-detail">
      <canvas data-map="${m.id}" aria-hidden="true"></canvas>
      <div><span class="kicker">${m.world === 2 ? 'Wereld 2 · ' : ''}${THEMES[m.theme].label}</span><h3 style="font-size:24px">${esc(m.name)}</h3><p class="muted" style="margin:4px 0 0">${esc(m.desc)}</p></div>
      <div><div class="section-title" style="margin-top:0">Vijanden</div><div class="enemy-chips">${m.pool.map(t => `<span class="chip"><canvas data-enemy="${t}" style="width:18px;height:18px"></canvas>${ENEMIES[t].name}</span>`).join('')}</div>
        <div class="section-title">Bazen</div><div class="enemy-chips">${[...new Set([...m.bosses, m.finalBoss])].map(t => `<span class="chip" style="border-color:#ff4d5e"><canvas data-enemy="${t}" style="width:18px;height:18px"></canvas>${ENEMIES[t].name}${t === m.finalBoss ? ' (eindbaas)' : ''}</span>`).join('')}</div></div>
      <div><div class="section-title" style="margin-top:0">Moeilijkheid</div>
      <div class="diffs">${DIFFS.map((d, di) => { const un = Progress.diffUnlocked(App.mapSel, di), done = Progress.cleared(m.id, di), best = Store.data.best[m.id + ':' + d.id];
        return `<button class="diff" data-act="sel-diff" data-d="${di}" aria-pressed="${di === App.diffSel}" ${un ? '' : 'disabled'}>
          <b>${d.name}${done ? ' ★' : ''}</b>
          <span class="muted num">${d.waves} golven · ${d.baseHp} ♥</span>
          <span class="num">${un ? `tot ${coinHtml(matchRewards(m, di, d.waves, bossCount(di), true, !done).total)}` : esc(Progress.diffLockText(App.mapSel, di))}</span>
          ${best && !done ? `<span class="muted num">Beste: golf ${best}</span>` : ''}${d.drops ? `<span class="drop-tag">${d.elite ? Math.round((d.elite + (m.world === 2 ? 0.03 : 0)) * 100) + '% elites · ' : ''}speciale drops</span>` : ''}
        </button>`; }).join('')}</div></div>
      <div><div class="section-title" style="margin-top:0">Jouw team</div>
        <div class="team-strip">${team.map(id => portrait(id)).join('') || '<span class="muted">Nog geen helden in je team.</span>'}<button class="btn btn-sm" data-act="nav" data-to="team">Team wijzigen</button></div>
        ${team.some(id => computeStats(HERO[id], 0, 1).air || HERO[id].upgrades.some(u => u.mods.air)) ? '' : '<p class="tip" style="margin:8px 0 0">Let op: je team heeft geen held met luchtaanval. Drones en de Hemelwyrm vliegen dan ongestoord door.</p>'}</div>
      <button class="btn btn-pow btn-xl" data-act="start-game" ${team.length && Progress.diffUnlocked(App.mapSel, App.diffSel) ? '' : 'disabled'}>Start ${DIFFS[App.diffSel].name}</button>
      <p class="muted" style="font-size:13px;margin:0">Meer uitdaging? Kies modifiers in <button class="btn btn-sm" data-act="mode-tab" data-tab="custom" data-map="${m.id}">Custom Mode</button></p>
    </div>
  </div>`;
  $$('#scr-maps canvas[data-map]').forEach(cv => drawMapThumb(cv, MAPS.find(x => x.id === cv.dataset.map)));
  hydratePortraits($('#scr-maps'));
}

/* ---------------- Gacha ---------------- */
function gachaPool(g) {
  const ev = g.event ? currentEvent() : null, out = [], sev = g.event ? Meta.activeEvent() : null;
  const featIds = ev ? ev.featured.concat(sev ? [sev.def.hero] : []) : [];
  for (const r of Object.keys(g.rates)) {
    const list = HEROES.filter(h => h.rarity === r && (!h.exclusive || (sev && h.id === sev.def.hero))); if (!list.length) continue;
    const feat = ev ? list.filter(h => featIds.includes(h.id)) : [], rest = list.filter(h => !feat.includes(h));
    for (const h of list) {
      let share;
      if (feat.length && rest.length) share = feat.includes(h) ? 0.6 / feat.length : 0.4 / rest.length;
      else share = 1 / list.length;
      out.push({ id: h.id, rarity: r, rate: g.rates[r] * share, featured: feat.includes(h) });
    }
  }
  return out;
}
function rollFrom(pool, minOrd = 0) {
  const p = pool.filter(x => rarOrd(x.rarity) >= minOrd); const tot = p.reduce((s, x) => s + x.rate, 0);
  let r = Math.random() * tot; for (const x of p) { r -= x.rate; if (r <= 0) return x; } return p[p.length - 1];
}
function grantHero(id) {
  const H = HERO[id], own = Store.data.heroes[id];
  if (!own) { Store.data.heroes[id] = { level: 1, copies: 1 }; if (Store.data.team.length < 6) Store.data.team.push(id); Meta.ensureHero(id); Meta.checkAchievements(); return { id, isNew: true, trait: Store.data.heroes[id].trait }; }
  own.copies++;
  if (own.level < MAX_LEVEL) { own.level++; return { id, level: own.level }; }
  const c = RARITIES[H.rarity].dupe; Store.data.coins += c; return { id, coins: c };
}
function ticketFor(gid) { return Object.keys(TICKETS).find(k => TICKETS[k].gacha === gid); }
function doPull(gid, n, ticket) {
  const g = GACHAS.find(x => x.id === gid);
  if (!Progress.gachaUnlocked(g)) return;
  if (ticket) { const tk = ticketFor(gid); if (!tk || (Store.data.tickets[tk] || 0) < 1) return; Store.data.tickets[tk]--; n = 1; }
  else {
    const price = n === 10 ? g.price * 9 : g.price;
    if (Store.data.coins < price) { Sfx.play('error'); toast(`Je hebt ${fmt(price - Store.data.coins)} munten te weinig. Speel een map om munten te verdienen.`, 'bad'); return; }
    Store.data.coins -= price;
  }
  const pool = gachaPool(g), res = [];
  for (let i = 0; i < n; i++) {
    let minOrd = 0;
    if (n === 10 && i === n - 1 && !res.some(r => rarOrd(HERO[r.id].rarity) >= rarOrd(g.guarantee10))) minOrd = rarOrd(g.guarantee10);
    if (g.pity) { const k = g.pity.key; Store.data[k] = (Store.data[k] || 0) + 1; if (Store.data[k] >= g.pity.n) minOrd = Math.max(minOrd, rarOrd(g.pity.rarity)); }
    const pick = rollFrom(pool, minOrd);
    if (g.pity && rarOrd(pick.rarity) >= rarOrd(g.pity.rarity)) Store.data[g.pity.key] = 0;
    res.push(grantHero(pick.id));
  }
  Store.data.stats.pulls += n; Meta.checkAchievements(); Store.save(); updateCoins();
  showReveal(res, g);
}
function renderGacha() {
  if (App.gachaSel === 'traits') return renderTraitGacha();
  let g = GACHAS.find(x => x.id === App.gachaSel) || GACHAS[0];
  const ev = currentEvent(), pool = gachaPool(g), open = Progress.gachaUnlocked(g);
  const byR = Object.keys(g.rates).sort((a, b) => rateOrd(b) - rateOrd(a));
  $('#scr-gacha').innerHTML = `
  <div class="screen-head"><div><span class="kicker">Nieuwe helden</span><h2>Gacha</h2></div><div class="coins"><span class="coin-ico"></span><span class="num">${fmt(Store.data.coins)}</span></div></div>
  <div class="gacha-layout">
    <div class="gacha-list">${GACHAS.map(x => { const un = Progress.gachaUnlocked(x); return `
      <button class="gcard panel ${un ? '' : 'locked'}" data-act="sel-gacha" data-id="${x.id}" aria-pressed="${x.id === g.id}">
        <span class="capsule-ico" style="--g1:${x.color}"></span>
        <span style="min-width:0"><b style="font-family:var(--f-display);font-weight:400">${x.event ? esc(ev.name) : x.name}</b><br>
        <span class="muted" style="font-size:13px">${un ? `${priceHtml(x, x.price)} per trekking` : esc(Progress.unlockText(x))}${ticketFor(x.id) && Store.data.tickets[ticketFor(x.id)] ? ` · <b style="color:${TICKETS[ticketFor(x.id)].color}">${Store.data.tickets[ticketFor(x.id)]} ticket${Store.data.tickets[ticketFor(x.id)] > 1 ? 's' : ''}</b>` : ''}</span></span>
      </button>`; }).join('')}${traitGachaCard(false)}</div>
    <div class="panel gacha-detail" style="--rc:${g.color}">
      <div><span class="kicker">${g.currency === 'gems' ? '<span class="gem-ico sm"></span> Gem-gacha · ' : ''}${g.event ? `Event Gacha · eindigt over <span class="event-timer" data-timer="${ev.ends}">${timeLeft(ev.ends - Date.now())}</span>` : g.limited ? `Limited gacha · wisselt over <span class="event-timer" data-timer="${Meta.activeEvent().ends}">${timeLeft(Meta.activeEvent().ends - Date.now())}</span>` : 'Permanente gacha'}</span>
        <h3 style="font-size:26px">${g.event ? esc(ev.name) + ' + ' + esc(Meta.activeEvent().def.name) : g.name}</h3><p class="muted" style="margin:4px 0 0">${esc(g.desc)}</p></div>
      <div><div class="section-title" style="margin-top:0">Drop rates</div>
        <div class="rates">${byR.map(r => `<div class="rate-row"><span class="chip rar rar-${RARITIES[r] ? r : 'legendary'}" ${RARITIES[r] ? '' : `style="background:${rateColor(r)}"`}>${rateLabel(r)}</span><div class="bar"><i style="width:${Math.max(1.5, g.rates[r])}%;background:${rateColor(r)}"></i></div><span class="pct">${String(g.rates[r]).replace('.', ',')}%</span></div>`).join('')}</div>
        <p class="muted" style="font-size:13px;margin:8px 0 0">10× trekken kost 9× de prijs en geeft minstens één ${RARITIES[g.guarantee10].label} of beter.${g.pity ? ` Gegarandeerd ${rateLabel(g.pity.rarity)}${g.pity.rarity === 'limited' ? '' : ' of beter'} na ${g.pity.n} trekkingen zonder (nog ${Math.max(1, g.pity.n - (Store.data[g.pity.key] || 0))}).` : ''}${g.event ? ' Uitgelichte helden krijgen 60% van de kans binnen hun zeldzaamheid.' : ''} Dubbele helden geven +1 level (max ${MAX_LEVEL}); daarna munten.</p></div>
      <div><div class="section-title" style="margin-top:0">Mogelijke helden (${pool.length})</div>
        <div class="pool">${pool.sort((a, b) => (b.cat === 'limited') - (a.cat === 'limited') || rarOrd(b.rarity) - rarOrd(a.rarity) || b.rate - a.rate).map(p => { if (p.skin) return skinPoolItem(p); const own = Store.data.heroes[p.id]; return `
          <button class="pool-item ${p.featured ? 'feat' : ''}" style="--rc:${rarColor(p.rarity)}" data-act="hero-info" data-id="${p.id}">
            ${portrait(p.id, '', 0, !own)}${own ? `<span class="own">Lv ${own.level}</span>` : ''}
            <div class="pn">${own ? esc(HERO[p.id].name) : '???'}</div><div class="pr">${(p.rate < 1 ? p.rate.toFixed(2) : p.rate.toFixed(1)).replace('.', ',')}%${p.featured ? ' · uitgelicht' : ''}</div>
          </button>`; }).join('')}</div></div>
      <div class="pull-row">
        ${open ? `<button class="btn btn-pow" data-act="pull" data-id="${g.id}" data-n="1" ${canPayG(g, g.price) ? '' : 'disabled'}>1× openen · ${priceHtml(g, g.price)}</button>
        <button class="btn btn-pow" data-act="pull" data-id="${g.id}" data-n="10" ${canPayG(g, g.price * 9) ? '' : 'disabled'}>10× openen · ${priceHtml(g, g.price * 9)}</button>
        ${ticketFor(g.id) ? `<button class="btn btn-sky" data-act="pull-ticket" data-id="${g.id}" ${(Store.data.tickets[ticketFor(g.id)] || 0) < 1 ? 'disabled' : ''}>Gebruik ${TICKETS[ticketFor(g.id)].name} (${Store.data.tickets[ticketFor(g.id)] || 0})</button>` : ''}` : `<span class="chip">${esc(Progress.unlockText(g))}</span>`}
        ${open && !canPayG(g, g.price) ? `<span class="muted">${g.currency === 'gems' ? 'Verdien Gems met missies, achievements, drops, de dungeon en de Shop.' : 'Speel een map om munten te verdienen.'}</span>` : ''}
      </div>
    </div>
  </div>`;
  hydratePortraits($('#scr-gacha'));
}
function showReveal(res, g) {
  const top = res.reduce((m, r) => Math.max(m, rarOrd(resRar(r))), 0), topR = RARITY_ORDER[top];
  const root = $('#overlay-root');
  const mega = top >= rarOrd('exotic');
  root.innerHTML = `<div class="overlay ${mega ? 'mega' : ''}" id="reveal" role="dialog" aria-modal="true" aria-label="Gacha-resultaat" style="--c:${rarColor(topR)}">
    <div class="reveal-stage">
      ${mega ? `<div class="mega-title" id="mega-title" hidden>${RARITIES[topR].label.toUpperCase()}!</div>` : ''}
      <div class="capsule" id="capsule" style="--c:${rarColor(topR)}"></div>
      <div class="reveal-cards" id="rcards" hidden>${res.map((r, i) => { const H = r.skin ? { name: 'Skin: ' + SKIN[r.skin].name, rarity: 'epic' } : HERO[r.id]; return `
        <div class="rcard ${res.length === 1 ? 'big' : ''} l-${H.rarity}" style="--rc:${rarColor(H.rarity)}" data-i="${i}">
          <div class="rcard-in"><div class="rface">${r.skin ? portrait(Store.data.team[0] || 'vuist', '', 2, false, r.skin) : portrait(r.id)}<div class="rb"><span class="chip rar rar-${H.rarity}">${RARITIES[H.rarity].label}</span><span class="rn">${esc(H.name)}</span>
            ${r.isNew ? '<span class="rtag">NIEUW!</span>' : r.level ? `<span class="rtag dup">Level ${r.level}</span>` : r.gems ? `<span class="rtag dup">+${r.gems} Gems</span>` : `<span class="rtag dup">+${fmt(r.coins)} munten</span>`}</div></div><div class="rback"></div></div>
        </div>`; }).join('')}</div>
      <div class="btn-row"><button class="btn" id="reveal-skip" data-act="reveal-skip">Alles tonen</button>
        <button class="btn btn-pow" data-act="reveal-close" id="reveal-close" hidden>Doorgaan</button>
        <button class="btn btn-sky" data-act="reveal-again" data-id="${g.id}" data-n="${res.length}" id="reveal-again" hidden>Nog eens ${res.length}×</button></div>
    </div></div>`;
  Sfx.play('gacha');
  App.reveal = { timers: [], res };
  const T = (ms, fn) => App.reveal.timers.push(setTimeout(fn, ms));
  if (mega) Sfx.play('cosmic');
  T(mega ? 1800 : 950, () => {
    $('#capsule').classList.add('pop'); if (mega && $('#mega-title')) $('#mega-title').hidden = false;
    const fl = document.createElement('div'); fl.className = 'reveal-flash'; fl.style.setProperty('--c', rarColor(topR)); document.body.appendChild(fl); setTimeout(() => fl.remove(), 700);
    T(300, () => { $('#capsule').hidden = true; $('#rcards').hidden = false; hydratePortraits($('#rcards'));
      $$('#rcards .rcard').forEach((c, i) => T(i * (res.length > 1 ? 160 : 0) + 80, () => { c.classList.add('show'); Sfx.play('r-' + resRar(res[i])); }));
      T(res.length * 160 + 500, revealDone);
    });
  });
}
function revealDone() { if (!App.reveal) return; App.reveal.timers.forEach(clearTimeout); $('#capsule') && ($('#capsule').hidden = true); const rc = $('#rcards'); if (rc) { if (rc.hidden) { rc.hidden = false; hydratePortraits(rc); } $$('.rcard', rc).forEach(c => c.classList.add('show')); }
  $('#reveal-skip') && ($('#reveal-skip').hidden = true); $('#reveal-close') && ($('#reveal-close').hidden = false); $('#reveal-again') && ($('#reveal-again').hidden = false); }
function closeOverlay() { if (App.reel) { App.reel.timers.forEach(clearTimeout); App.reel = null; } if (App.reveal) { App.reveal.timers.forEach(clearTimeout); App.reveal = null; } App.preview = null; $('#overlay-root').innerHTML = ''; }

/* ---------------- Collectie ---------------- */
function renderCollection() {
  const f = App.collFilter, own = Store.data.heroes;
  const list = HEROES.filter(h => f === 'all' || h.rarity === f || (f === 'owned' && own[h.id]) || (f === 'excl' && h.exclusive)).sort((a, b) => rarOrd(b.rarity) - rarOrd(a.rarity) || a.name.localeCompare(b.name));
  const cnt = Object.keys(own).length;
  $('#scr-collection').innerHTML = `
  <div class="screen-head"><div><span class="kicker">Inventory</span><h2>Helden</h2></div><div class="muted num" style="font-size:18px">${cnt} / ${HEROES.length} verzameld</div></div>
  <div class="filters" role="group" aria-label="Filter">${[['all', 'Alle'], ['owned', 'In bezit'], ['excl', 'Exclusief'], ...RARITY_ORDER.map(r => [r, RARITIES[r].label])].map(([k, l]) => `<button data-act="filter" data-f="${k}" aria-pressed="${f === k}">${l}${RARITIES[k] ? ` <span class="num">${HEROES.filter(h => h.rarity === k && own[h.id]).length}/${HEROES.filter(h => h.rarity === k).length}</span>` : ''}</button>`).join('')}</div>
  <div class="hgrid" style="margin-top:14px">${list.map(h => heroCard(h)).join('')}</div>`;
  hydratePortraits($('#scr-collection'));
}
function heroSource(h) {
  if (h.exclusive === 'event') { const ev = SEASON_EVENTS.find(e => e.id === h.event); return `Eventwinkel: ${ev.name}`; }
  if (h.exclusive === 'raid') return 'Raid-winkel';
  if (h.exclusive === 'challenge') return 'Uitdaging "Kampioenschap"';
  return GACHAS.filter(g => g.rates[h.rarity]).map(g => g.event ? 'Event Gacha' : g.name).join(', ');
}
function heroCard(h, act = 'hero-info') {
  const o = Store.data.heroes[h.id], inTeam = Store.data.team.includes(h.id), T = o && TRAIT[o.trait], mb = o && Meta.masteryBadge(h.id);
  return `<button class="hcard ${o ? '' : 'unowned'} ${inTeam ? 'in-team' : ''}" style="--rc:${rarColor(h.rarity)}" data-act="${act}" data-id="${h.id}">
    ${portrait(h.id, '', 0, !o)}
    ${o ? `<span class="badge">Lv ${o.level}</span><span class="badge badge-l">×${o.copies}</span>` : ''}
    ${mb ? `<span class="mbadge" style="--mb:${MASTERY_BADGE[mb]}" title="Mastery ${Meta.mastery(h.id).lvl}"></span>` : ''}
    ${T ? `<span class="trait-tag" style="--tc:${rarColor(T.rarity)}">${esc(T.name)}</span>` : ''}
    <div class="hc-body"><span class="hc-name">${o ? esc(h.name) : 'Onbekend'}</span>
      <div class="hc-meta"><span style="color:${rarColor(h.rarity)}">${RARITIES[h.rarity].label}</span><span>${o ? h.role : h.exclusive ? '<span class="src-tag">Exclusief</span>' : '—'}</span></div></div>
  </button>`;
}

/* ---------------- Team ---------------- */
function renderTeam() {
  const team = Store.data.team, owned = HEROES.filter(h => Store.data.heroes[h.id]).sort((a, b) => rarOrd(b.rarity) - rarOrd(a.rarity));
  const air = team.some(id => HERO[id].base.air || HERO[id].upgrades.some(u => u.mods.air));
  const hasSlow = team.some(id => HERO[id].base.slow || HERO[id].ability === 'timerewind');
  const hasAoe = team.some(id => HERO[id].base.splash || HERO[id].base.chains || HERO[id].style === 'aura' || HERO[id].base.cleave);
  $('#scr-team').innerHTML = `
  <div class="screen-head"><div><span class="kicker">Superhelden</span><h2>Team</h2></div><div class="muted">Neem tot 6 helden mee in een potje. Tik op een held voor details en training.</div></div>
  <div class="team-layout">
    <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:14px">
      <div class="slots">${Array.from({ length: 6 }, (_, i) => { const id = team[i]; return id ? `
        <div class="slot filled" style="border-bottom:4px solid ${rarColor(HERO[id].rarity)}">${portrait(id)}<span class="nm">${esc(HERO[id].name)} · Lv ${heroLevel(id)}</span>
          <button class="x" data-act="team-remove" data-id="${id}" aria-label="${esc(HERO[id].name)} uit team halen">×</button></div>` : `<div class="slot">Leeg</div>`; }).join('')}</div>
      <div><div class="section-title" style="margin-top:0">Teamcheck</div>
        <div class="check"><span class="dot ${air ? 'ok' : ''}"></span>Luchtaanval tegen drones en de Hemelwyrm</div>
        <div class="check"><span class="dot ${hasAoe ? 'ok' : ''}"></span>Groepsschade (explosie, ketting of puls)</div>
        <div class="check"><span class="dot ${hasSlow ? 'ok' : ''}"></span>Vertraging of controle</div>
        <div class="check"><span class="dot ${team.some(id => HERO[id].role === 'Support' || HERO[id].role === 'Geld') ? 'ok' : ''}"></span>Support of geld (optioneel)</div></div>
      <button class="btn btn-pow" data-act="nav" data-to="maps" ${team.length ? '' : 'disabled'}>Naar maps</button>
    </div>
    <div><div class="section-title" style="margin-top:0">Jouw helden (${owned.length}) · tik om toe te voegen of te verwijderen</div>
      <div class="hgrid">${owned.map(h => heroCard(h, 'team-toggle')).join('')}</div>
      <p class="muted" style="font-size:13px">Meer helden krijg je via de <button class="btn btn-sm" data-act="nav" data-to="gacha">Gacha</button></p></div>
  </div>`;
  hydratePortraits($('#scr-team'));
}
function toggleTeam(id) {
  const t = Store.data.team, i = t.indexOf(id);
  if (i >= 0) t.splice(i, 1); else { if (t.length >= 6) { toast('Je team is vol (6 helden). Haal eerst een held weg.', 'bad'); Sfx.play('error'); return; } t.push(id); }
  Sfx.play('click'); Store.save();
}

/* ---------------- Held-detail (modal) ---------------- */
function lvlCost(id) { const o = Store.data.heroes[id]; return o ? RARITIES[HERO[id].rarity].lvl * o.level : 0; }
function openHeroModal(id, tier = 0, tab) {
  if (tab) App.heroTab = tab;
  const H = HERO[id], o = Store.data.heroes[id], lv = o ? o.level : 1, A = ABILITIES[H.ability], T = o ? TRAIT[o.trait] : null;
  if (!o && App.heroTab !== 'info') App.heroTab = 'info';
  const st = computeStats(H, 0, lv, null, T), st5 = computeStats(H, 5, lv, null, T);
  const statBox = (k, v, v5) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}${v5 != null && v5 !== v ? ` <span class="muted" style="font-size:14px">→ ${v5}</span>` : ''}</div></div>`;
  const specials = [];
  if (st5.chains) specials.push(`${st5.chains} kettingsprongen`); if (st5.splash) specials.push('explosies'); if (st5.slow) specials.push(`${Math.round(st5.slow * 100)}% vertraging`);
  if (st5.burn) specials.push(`brand ${Math.round(st5.burn)}/s`); if (st5.crit) specials.push(`${Math.round(st5.crit * 100)}% crit`); if (st5.shred) specials.push(`breekt ${st5.shred} pantser`); if (st5.stunChance) specials.push('verdoven'); if (st5.knock) specials.push('terugslag');
  if (st5.income) specials.push(`+$${Math.round(st5.income)} per golf`); if (st5.bounty) specials.push(`+${Math.round(st5.bounty * 100)}% geld per kill`);
  if (st5.buffRate || st5.buffDmg) specials.push(`buff ${st5.buffRange >= 90 ? 'hele map' : 'in de buurt'}: +${Math.round(st5.buffRate * 100)}% snelheid, +${Math.round(st5.buffDmg * 100)}% schade`);
  if (st5.earlyBoost) specials.push(`vroege kracht: +${Math.round(st5.earlyBoost * 100)}% schade in golf 1, neemt af tot 0 bij golf 15`);
  if (st5.heal) specials.push(`+${st5.heal} basis-HP per golf`); if (st5.execute) specials.push(`executie onder ${Math.round(st5.execute * 100)}% HP`); if (st5.fork) specials.push(`splitst in ${st5.fork} scherven`);
  const cost = lvlCost(id);
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-label="${esc(H.name)}">
   <div class="panel modal-card" style="--rc:${rarColor(H.rarity)}">
    <button class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
    <div class="hero-modal">
      <div><div class="hm-stage"><canvas id="hm-cv" aria-label="Voorbeeld van ${esc(H.name)}"></canvas></div>
        <div class="tier-pick" role="group" aria-label="Upgradevoorbeeld"><span class="muted" style="font-size:13px;width:100%">Bekijk hoe de held verandert per upgrade:</span>${[0, 1, 2, 3, 4, 5].map(t => `<button data-act="tier-preview" data-t="${t}" aria-pressed="${t === tier}">${t}</button>`).join('')}</div>
        <div class="btn-row" style="justify-content:flex-start;margin-top:10px"><button class="btn btn-sm btn-sky" data-act="preview-attack">Aanval tonen</button><button class="btn btn-sm" data-act="preview-ult">Ultimate tonen</button></div></div>
      <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
        <div><span class="chip rar rar-${H.rarity}">${RARITIES[H.rarity].label}</span> <span class="chip role">${H.role}</span> <span class="chip">${STYLE_LABEL[H.style]}</span>
          <h2 style="font-size:30px;margin-top:6px">${o ? esc(H.name) : esc(H.name) + ' <span class="muted" style="font-size:16px;font-family:var(--f-body)">(niet in bezit)</span>'}</h2>
          <div class="kicker">${esc(H.title)}</div><p style="margin:6px 0 0">${esc(H.desc)}</p></div>
        ${o ? `<div class="panel" style="padding:10px 12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;box-shadow:none;background:var(--panel2)">
          <div style="flex:1;min-width:160px"><div class="kicker">Level ${o.level} / ${MAX_LEVEL} · ${o.copies}× verkregen</div><div class="bar" style="margin-top:6px"><i style="width:${o.level / MAX_LEVEL * 100}%"></i></div>
          <div class="muted" style="font-size:12px;margin-top:4px">Elk level geeft +7% schade. Dubbele helden uit de gacha geven gratis levels.</div></div>
          ${o.level < MAX_LEVEL ? `<button class="btn btn-pow btn-sm" data-act="level-up" data-id="${id}" ${Store.data.coins < cost ? 'disabled' : ''}>Train · ${coinHtml(cost)}</button>` : '<span class="chip" style="background:var(--pow);color:var(--pow-ink)">Max level</span>'}
          <button class="btn btn-sm ${Store.data.team.includes(id) ? 'btn-danger' : 'btn-good'}" data-act="team-toggle" data-id="${id}" data-modal="1">${Store.data.team.includes(id) ? 'Uit team' : 'In team'}</button></div>` : `<div class="tip">Deze held krijg je via: ${esc(heroSource(H))}.</div>`}
        ${o ? `<div class="tabs" role="group" aria-label="Heldmenu" style="margin:0">${[['info', 'Overzicht'], ['trait', 'Trait'], ['skins', 'Skins'], ['mastery', 'Mastery']].map(([k, l]) => `<button data-act="hero-tab" data-tab="${k}" data-id="${id}" aria-pressed="${App.heroTab === k}">${l}</button>`).join('')}</div>` : ''}
        ${o && App.heroTab !== 'info' ? heroTabHtml(id, App.heroTab) : `
        <div><div class="section-title" style="margin-top:0">Stats · level ${lv}${T ? ` · trait ${esc(T.name)}` : ''} (→ na 5 upgrades)</div>
          <div class="stat-table">
            ${statBox('Plaatsen', '$' + H.cost)}
            ${statBox(H.style === 'beam' ? 'Schade / s' : 'Schade', fmt(st.dmg), fmt(st5.dmg))}
            ${statBox('Bereik', st.range >= 90 ? 'Hele map' : st.range.toFixed(1), st5.range >= 90 ? 'Hele map' : st5.range.toFixed(1))}
            ${statBox('Snelheid', H.style === 'beam' ? 'Continu' : st.rate.toFixed(2) + '/s', H.style === 'beam' ? null : st5.rate.toFixed(2) + '/s')}
            ${statBox('DPS (schatting)', fmt(estDps(H, st)), fmt(estDps(H, st5)))}
            ${statBox('Luchtaanval', st.air ? 'Ja' : 'Nee', st5.air ? 'Ja' : 'Nee')}
            ${statBox('Max op map', (H.cap || RARITIES[H.rarity].cap) + '×')}
          </div>
          ${specials.length ? `<p class="muted" style="font-size:13px;margin:6px 0 0">Speciaal (na upgrades): ${specials.join(' · ')}</p>` : ''}</div>
        <div class="ability-box"><div class="kicker">Speciale ability · ${A.cd}s cooldown</div><b>${A.name}</b> <span class="muted">— ${esc(A.desc)}</span>
          <div style="margin-top:6px"><span class="kicker" style="color:var(--pow)">Ultimate na upgrade 5</span> <b>${A.ult}</b> <span class="muted">— sterkere versie met eigen animatie en kortere cooldown.</span></div></div>
        <div><div class="section-title" style="margin-top:0">5 upgrades (in een potje, met speldgeld)</div>
          <ol class="upg-list">${H.upgrades.map((u, i) => `<li class="${u.major ? 'major' : ''}"><span class="tn">${i + 1}</span><div><div class="un">${esc(u.name)}${u.major ? ' · visuele upgrade' : ''}${u.excl ? '<span class="excl">EXCLUSIEF</span>' : ''}</div><div class="ud">${esc(u.desc)}</div></div><span class="num" style="color:var(--pow);font-weight:700">$${fmt(u.cost)}</span></li>`).join('')}</ol></div>`}
      </div>
    </div>
   </div></div>`;
  App.preview = { id, tier, t: 0, atk: 0, fx: new FX(), shots: [], fxT: 0, ult: 0, look: o ? resolveLook(H, App.previewSkin !== undefined && App.previewSkinFor === id ? App.previewSkin : o.skin) : H.look };
  hydratePortraits($('#overlay-root'));
}
function previewAttack(ult) {
  const P = App.preview; if (!P) return; const H = HERO[P.id];
  P.atk = 1;
  if (ult) { P.ult = 1.4; Sfx.play('ult'); for (let i = 0; i < 40; i++) P.fx.burst(150, 150, H.look.suit2, 1, 300, 4, 0.9, 'glow'); P.fx.ring(150, 170, 140, H.look.suit2, 0.8, 8); return; }
  Sfx.play(H.style === 'melee' ? 'punch' : H.style === 'chain' ? 'zap' : H.style === 'aura' ? 'freeze' : H.style === 'strike' ? 'strike' : H.style === 'beam' ? 'laser' : 'shoot');
  P.shots.push({ x: 180, y: 140, life: 0.5, style: H.style, kind: H.proj });
}
function drawPreview(dt) {
  const P = App.preview, cv = $('#hm-cv'); if (!P || !cv) return;
  const H = HERO[P.id], dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth; if (!w) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr); }
  const ctx = cv.getContext('2d'), k = w / 300; ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); ctx.clearRect(0, 0, 300, 300);
  P.t += dt; P.atk = Math.max(0, P.atk - dt * 2.5); P.ult = Math.max(0, P.ult - dt); P.fxT -= dt;
  if (P.fxT <= 0) { P.fxT = P.tier >= 5 ? 0.08 : 0.2; idleFx(P.fx, P.look.skinFx || H.fx, 150, 190, P.look.suit2); const q = P.fx.p[P.fx.p.length - 1]; if (q) { q.x = 150 + (q.x - 150) * 3; q.y = 190 + (q.y - 190) * 3; q.size *= 2; } }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(150, 238, 90, 20, 0, 0, TAU); ctx.fill();
  if (P.ult > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, P.ult) * 0.5; ctx.fillStyle = H.look.suit2; ctx.fillRect(0, 0, 300, 300); ctx.restore(); }
  drawHero(ctx, H, 140, 180, 3.5, P.t, { tier: P.tier, atk: P.atk, ang: 0.15, pulse: P.ult > 0 ? 0.6 : 0, look: P.look });
  for (let i = P.shots.length - 1; i >= 0; i--) {
    const s = P.shots[i]; s.life -= dt; const f = 1 - s.life / 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = H.look.suit2; ctx.fillStyle = H.look.suit2;
    if (s.style === 'aura') { ctx.lineWidth = 6 * (1 - f); circle(ctx, 140, 200, 30 + f * 110); ctx.stroke(); }
    else if (s.style === 'beam') { ctx.lineWidth = 10; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.moveTo(185, 150); ctx.lineTo(300, 140); ctx.stroke(); }
    else if (s.style === 'chain' || s.style === 'strike') { ctx.lineWidth = 4; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.moveTo(s.style === 'strike' ? 250 : 175, s.style === 'strike' ? 0 : 110); for (let j = 1; j <= 6; j++) ctx.lineTo(lerp(s.style === 'strike' ? 250 : 175, 260, j / 6) + rnd(-12, 12), lerp(s.style === 'strike' ? 0 : 110, 210, j / 6)); ctx.stroke(); }
    else if (s.style === 'melee') { ctx.lineWidth = 6; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.arc(200, 170, 40, -1, 1); ctx.stroke(); }
    else { circle(ctx, lerp(190, 310, f), 150 - Math.sin(f * Math.PI) * (s.kind === 'grenade' ? 60 : 0), 7); ctx.fill(); }
    ctx.restore();
    if (s.life <= 0) P.shots.splice(i, 1);
  }
  P.fx.update(dt); P.fx.draw(ctx);
}

/* ---------------- Codes ---------------- */
const CODES = { '8022': 'unlockAll' };
function openCodeDialog() {
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-labelledby="code-title">
    <form class="panel code-card" id="code-form" autocomplete="off">
      <button type="button" class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
      <h2 id="code-title" style="color:var(--pow);font-size:26px">Code invoeren</h2>
      <label for="code-in" class="muted">Heb je een geheime code? Vul hem hier in.</label>
      <input id="code-in" maxlength="24" autocapitalize="off" spellcheck="false" placeholder="Code">
      <p class="code-err" id="code-err" aria-live="polite"></p>
      <button type="submit" class="btn btn-pow">Code gebruiken</button>
    </form></div>`;
  const inp = $('#code-in'); inp.focus();
  $('#code-form').addEventListener('submit', e => { e.preventDefault(); redeemCode(inp.value.trim()); });
}
function redeemCode(code) {
  const act = CODES[code];
  if (!act) { Sfx.play('error'); $('#code-err').textContent = 'Deze code klopt niet. Probeer het opnieuw.'; $('#code-in').select(); return; }
  if (act === 'unlockAll') {
    let n = 0;
    for (const h of HEROES) if (!Store.data.heroes[h.id]) { Store.data.heroes[h.id] = { level: 1, copies: 1 }; n++; }
    Meta.ensureAll(); Meta.checkAchievements(); Store.save(); closeOverlay();
    if (n) { Sfx.play('r-ultra'); toast(`Code geaccepteerd! ${n} nieuwe helden vrijgespeeld. Je hebt nu alle ${HEROES.length} helden.`, 'good'); }
    else { Sfx.play('coin'); toast(`Je hebt al alle ${HEROES.length} helden.`, 'good'); }
    nav(App.screen === 'home' ? 'collection' : App.screen);
  }
}

/* ---------------- Spel resetten ---------------- */
function openResetDialog() {
  const D = Store.data, owned = Object.keys(D.heroes).length;
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-labelledby="reset-title">
    <div class="panel code-card">
      <button type="button" class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
      <h2 id="reset-title" style="color:var(--danger);font-size:26px">Opnieuw beginnen?</h2>
      <p style="margin:0">Je hele spel wordt gewist en je begint opnieuw, net als de eerste keer. Dit kun je niet ongedaan maken.</p>
      <ul class="reset-list muted">
        <li>${fmt(D.coins)} munten</li>
        <li>${owned} helden en al hun levels</li>
        <li>${Progress.totalStars()} sterren en alle vrijgespeelde maps en gacha's</li>
        <li>Je statistieken (${D.stats.wins} overwinningen, ${D.stats.pulls} trekkingen)</li>
      </ul>
      <p class="muted" style="margin:0;font-size:13px">Je instellingen voor geluid en effecten blijven bewaard.</p>
      <div class="btn-row" style="justify-content:stretch"><button class="btn" data-act="modal-close" style="flex:1">Annuleren</button><button class="btn btn-danger" data-act="reset-confirm" id="reset-confirm" style="flex:1">Ja, alles wissen</button></div>
    </div></div>`;
  $('#reset-confirm').focus();
}
function resetGame() {
  const keep = Object.assign({}, Store.data.settings);
  Store.reset(); Store.data.settings = keep; Meta.ensureAll(); Meta.ensureChallenges(); Store.save(); Online.submit();
  App.mapSel = 0; App.diffSel = 1; App.gachaSel = 'basic'; App.collFilter = 'all';
  closeOverlay(); updateCoins(); Sfx.play('wave');
  toast('Het spel is gereset. Je begint opnieuw met 400 munten en 2 helden.', 'good');
  nav('home');
}

/* ---------------- Instellingen ---------------- */
function renderSettings() {
  const s = Store.data.settings;
  const tog = (k, label, sub) => `<div class="panel set-row"><div><label id="lbl-${k}">${label}</label><span class="muted">${sub}</span></div><button class="toggle" id="set-${k}" data-act="set-toggle" data-k="${k}" aria-pressed="${!!s[k]}" aria-labelledby="lbl-${k}"></button></div>`;
  $('#scr-settings').innerHTML = `
  <div class="screen-head"><div><span class="kicker">Voorkeuren</span><h2>Instellingen</h2></div></div>
  <div class="settings">
    <div class="panel set-row"><div><label for="set-sfx">Geluidseffecten</label><span class="muted">Aanvallen, explosies, bazen en upgrades</span></div><input type="range" id="set-sfx" min="0" max="1" step="0.05" value="${s.sfx}"></div>
    ${tog('musicOn', 'Muziek', 'Een rustige synth-loop op de achtergrond')}
    <div class="panel set-row"><div><label for="set-music">Muziekvolume</label></div><input type="range" id="set-music" min="0" max="1" step="0.05" value="${s.music}"></div>
    ${tog('dmgNums', 'Schadegetallen', 'Toon zwevende schade boven vijanden')}
    ${tog('fxHigh', 'Veel effecten', 'Zet uit als het spel hapert op een oudere telefoon')}
    ${tog('shake', 'Schermschudden', 'Bij explosies, bazen en ultimates')}
    ${tog('tips', 'Tips tonen', 'Uitleg voor nieuwe spelers tijdens een potje')}
    <div class="panel set-row" style="flex-direction:column;align-items:stretch"><label>Besturing</label>
      <div class="keys"><kbd>1</kbd>–<kbd>6</kbd><span>Kies een held uit je deck om te plaatsen</span>
        <kbd>Klik</kbd><span>Plaats op een vrij veld, of selecteer een geplaatste held</span>
        <kbd>Shift</kbd><span>Ingedrukt houden tijdens plaatsen om meerdere keren te plaatsen</span>
        <kbd>Spatie</kbd><span>Start de volgende golf</span><kbd>A</kbd><span>Auto Skip: Uit → Na golf → Direct</span><kbd>F</kbd><span>Fast Forward: wissel tussen 1×, 2× en 3×</span><kbd>U</kbd><span>Upgrade geselecteerde held</span><kbd>Q</kbd><span>Speciale ability van geselecteerde held</span>
        <kbd>Esc</kbd><span>Annuleren of pauze</span></div></div>
    <div class="panel set-row"><div><label>Opnieuw beginnen</label><span class="muted">Wist munten, helden en vrijgespeelde maps op dit apparaat</span></div>
      <button class="btn btn-danger" data-act="reset-progress" id="reset-btn">Opnieuw beginnen</button></div>
    <p class="muted" style="font-size:13px">Je voortgang wordt in deze browser op dit apparaat bewaard.</p>
  </div>`;
  $('#set-sfx').addEventListener('input', e => { Store.data.settings.sfx = +e.target.value; Sfx.applyVol(); Store.save(); });
  $('#set-sfx').addEventListener('change', () => Sfx.play('coin'));
  $('#set-music').addEventListener('input', e => { Store.data.settings.music = +e.target.value; Sfx.applyVol(); Store.save(); });
}

/* =====================================================================
   Match
   ===================================================================== */
function startGame() {
  const mi = App.mapSel, di = App.diffSel;
  if (!Progress.diffUnlocked(mi, di) || !Store.data.team.length) return;
  startMatch({ map: MAPS[mi].id, diffIdx: di, mode: 'campaign' });
}
function startMatch(o) {
  const map = mapById(o.map); if (!map) return;
  if (!Store.data.team.length) { toast('Zet eerst helden in je team.', 'bad'); nav('team'); return; }
  const rules = Object.assign({}, o.rules || {});
  for (const id of o.mods || []) if (MOD[id].fx.maxRarity) rules.maxRarity = rules.maxRarity && rarOrd(rules.maxRarity) < rarOrd(MOD[id].fx.maxRarity) ? rules.maxRarity : MOD[id].fx.maxRarity;
  if (rules.maxRarity && !Store.data.team.some(id => rarOrd(HERO[id].rarity) <= rarOrd(rules.maxRarity))) { toast(`Je team heeft geen helden die hier mogen (${RULE_LABEL(rules)}). Pas eerst je team aan.`, 'bad'); Sfx.play('error'); return; }
  Sfx.init(); closeOverlay();
  const g = new Game(map, o.diffIdx == null ? 1 : o.diffIdx, {}, Object.assign({}, o, { rules }));
  App.game = g; App.gameOverShown = false; App.lastMatch = o;
  if (o.mode !== 'coop') applyAutoMode(g, Store.data.settings.autoMode);
  buildGameDom();
  $('#topbar').hidden = true; $('#main').hidden = true; $('#scr-game').hidden = false;
  fitCanvas(); renderSide();
}
function modeLabel(g) {
  if (g.raid) return `${g.raid.name} · ${g.raidDiff.name}`;
  return { dungeon: `Dungeon · diepte ${g.depth}`, endless: 'Endless', bossrush: 'Boss Rush', coop: 'Co-op', custom: `Custom${g.mods.length ? ' +' + g.mods.length : ''}`, challenge: 'Uitdaging', secret: 'Geheime map', event: 'Event' }[g.mode] || g.diff.name;
}
function buildGameDom() {
  const g = App.game;
  $('#scr-game').innerHTML = `
  <div class="hud">
    <div class="pill hp"><small>Basis</small><span id="h-hp" class="num">${g.hp}</span><div class="hp-bar"><i id="h-hpbar" style="width:100%"></i></div></div>
    <div class="pill cash"><small>Geld</small>$<span id="h-cash" class="num">0</span></div>
    <div class="pill"><small>${g.mode === 'bossrush' ? 'Fase' : 'Golf'}</small><span id="h-wave" class="num">0/${g.totalWaves === Infinity ? '∞' : g.totalWaves}</span></div>
    <div class="pill"><small>Vijanden</small><span id="h-en" class="num">0</span></div>
    <div class="pill" style="font-size:14px"><span>${esc(g.map.name)} · ${esc(modeLabel(g))}</span></div>
    ${g.rules.maxHeroes || g.rules.maxRarity || g.rules.maxTier != null ? `<span class="mode-pill" title="${esc(RULE_LABEL(g.rules))}">Regels: ${esc(RULE_LABEL(g.rules))}</span>` : ''}
    <span class="spacer"></span>
    <div class="ff" role="group" aria-label="Fast Forward"><small>Fast Forward</small><div class="seg">${[1, 2, 3].map(s => `<button data-act="g-speed" data-s="${s}" aria-pressed="${s === 1}">${s}×</button>`).join('')}</div></div>
    ${g.mode === 'coop' ? '' : `<button class="skip-btn" data-act="g-auto" id="h-auto" data-mode="${autoModeOf(g)}" aria-pressed="${g.autoWave}" title="Auto Skip (A): Uit → Na golf (start als de golf verslagen is) → Direct (start zodra alle vijanden van de golf binnen zijn)"><span class="sw"></span><span>Auto: <b id="h-auto-l">${AUTO_LABEL[autoModeOf(g)]}</b></span></button>`}
    <button class="btn btn-sm" data-act="g-pause">Pauze</button>
    <button class="btn btn-good" data-act="g-start" id="h-start">Start golf 1</button>
  </div>
  <div class="g-main"><div class="canvas-box" id="cbox"><canvas id="gcv" aria-label="Speelveld ${esc(g.map.name)}"></canvas></div><aside class="side" id="side" aria-live="polite"></aside></div>
  <div class="deck" id="deck" role="toolbar" aria-label="Helden plaatsen">${g.team.map((id, i) => { const H = HERO[id]; return `
    <button class="dcard ${g.heroAllowed(id) ? '' : 'banned'}" data-act="deck" data-id="${id}" style="--rc:${rarColor(H.rarity)}" title="${esc(H.name)} plaatsen (toets ${i + 1})${g.heroAllowed(id) ? '' : ' · niet toegestaan'}">
      <span class="dk">${i + 1}</span>${portrait(id)}<span class="dn">${esc(H.name)}</span><span class="dc">$${g.costOf(id)}</span><span class="dq" data-q="${id}">0/${(H.cap || RARITIES[H.rarity].cap)}</span></button>`; }).join('')}</div>`;
  hydratePortraits($('#deck'));
  const cv = $('#gcv'); App.cv = cv;
  const toG = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * GW, y: (e.clientY - r.top) / r.height * GH }; };
  cv.addEventListener('pointermove', e => { const p = toG(e); g.hover = { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) }; });
  cv.addEventListener('pointerleave', () => { g.hover = null; });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); g.placing = null; syncDeck(); });
  cv.addEventListener('pointerdown', e => {
    Sfx.init(); if (e.button === 2) return;
    const p = toG(e), tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE); g.hover = { tx, ty };
    if (g.over) return;
    if (g.placing) { if (g.placeHero(g.placing, tx, ty) && !e.shiftKey) g.placing = null; syncDeck(); return; }
    const h = g.heroes.find(q => q.tx === tx && q.ty === ty && !q.temp);
    if (h) Sfx.play('click');
    g.select(h || null);
  });
}
function fitCanvas() {
  const box = $('#cbox'), cv = App.cv; if (!box || !cv) return;
  const narrow = window.innerWidth <= 900;
  const bw = box.clientWidth - 16, bh = narrow ? bw * GH / GW : box.clientHeight - 16;
  const sc = Math.max(0.1, Math.min(bw / GW, bh / GH));
  const w = Math.floor(GW * sc), h = Math.floor(GH * sc), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  App.k = cv.width / GW;
}
function syncDeck() { const g = App.game; if (!g) return; $$('#deck .dcard').forEach(b => b.classList.toggle('active', g.placing === b.dataset.id)); }
function hudUpdate() {
  const g = App.game; if (!g) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };
  set('h-hp', Math.max(0, Math.ceil(g.hp))); set('h-cash', fmt(g.cash)); set('h-wave', `${g.wave}/${g.totalWaves === Infinity ? '∞' : g.totalWaves}`); set('h-en', g.enemies.length + g.queue.filter(q => q.type !== '__pause').length);
  const bar = $('#h-hpbar'); if (bar) bar.style.width = clamp(g.hp / g.maxHp * 100, 0, 100) + '%';
  const sb = $('#h-start');
  if (sb) {
    let label, dis = false;
    if (g.over) { label = 'Afgelopen'; dis = true; }
    else if (g.mode === 'coop') { label = g.wave ? `Nog ${Math.ceil(g.coopTime)}s` : 'Start de aanval'; dis = g.wave > 0; }
    else if (g.wave >= g.totalWaves) { label = g.mode === 'bossrush' ? 'Laatste baas' : 'Laatste golf'; dis = true; }
    else if (g.relicOffer) { label = 'Kies een relikwie'; dis = false; }
    else if (g.queue.length) { label = 'Golf bezig…'; dis = true; }
    else if (g.autoWave && g.autoT > 0) label = `Volgende golf over ${Math.ceil(g.autoT)}s`;
    else if (g.bonusPending && g.enemies.length) label = `Volgende golf (+$${Math.round(10 + g.wave * 2)})`;
    else label = g.mode === 'bossrush' ? `Start fase ${g.wave + 1}` : `Start golf ${g.wave + 1}`;
    set('h-start', label); sb.disabled = dis;
  }
  $$('#deck .dcard').forEach(b => { const id = b.dataset.id, H = HERO[id], n = g.heroCount(id), cap = g.heroCap(id); b.classList.toggle('poor', g.cash < g.costOf(id) || n >= cap); const q = b.querySelector('.dq'); const t = `${n}/${cap}`; if (q.textContent !== t) q.textContent = t; });
  // dynamische delen van het zijpaneel
  const h = g.sel;
  if (h) {
    const ab = $('#s-abil'); if (ab) { const A = ABILITIES[h.def.ability], cd = g.abilCdMax(h); ab.querySelector('.cdfill').style.width = (h.abilCd / cd * 100) + '%'; ab.disabled = h.abilCd > 0 || h.stunT > 0; const lbl = ab.querySelector('.lbl'); const txt = h.abilCd > 0 ? `${h.tier >= 5 ? A.ult : A.name} · ${Math.ceil(h.abilCd)}s` : `${h.tier >= 5 ? 'ULTIMATE: ' + A.ult : A.name} (Q)`; if (lbl.textContent !== txt) lbl.textContent = txt; }
    const ub = $('#s-upg'); if (ub && h.tier < 5) ub.disabled = g.cash < g.upgCost(h);
    set('s-kills', fmt(h.kills)); set('s-dmg', fmt(h.dmg));
  }
}
function statLine(k, v, nv) { return `<div><span>${k}</span><b>${v}${nv != null && nv !== v ? ` <span class="up">→ ${nv}</span>` : ''}</b></div>`; }
function renderSide() {
  const g = App.game; if (!g) return; g.panelDirty = false;
  const side = $('#side'); if (!side) return;
  const tip = tutorialTip();
  const h = g.sel;
  if (h) {
    const H = h.def, st = h.st || g.heroStats(h), A = ABILITIES[H.ability];
    const next = h.tier < 5 ? H.upgrades[h.tier] : null;
    const nst = next ? computeStats(H, h.tier + 1, h.level, null, h.trait) : null, cst = computeStats(H, h.tier, h.level, null, h.trait);
    const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
    side.innerHTML = `${tip}
      <div class="sel-head">${portrait(h.id, '', h.tier)}<div style="min-width:0"><span class="chip rar rar-${H.rarity}">${RARITIES[H.rarity].label}</span><h3 style="margin-top:4px">${esc(H.name)}</h3>
        <div class="pips" aria-label="Upgrade ${h.tier} van 5">${H.upgrades.map((u, i) => `<i class="${i < h.tier ? 'on' : ''}"></i>`).join('')}</div><div class="muted" style="font-size:12px">Level ${h.level} · ${H.role}${h.ext && h.ext.length ? ' · <span style="color:var(--good)">gebuft</span>' : ''}</div>${h.trait ? `<div style="font-size:12px"><span class="tdot" style="--tc:${rarColor(h.trait.rarity)}"></span> <b style="color:${rarColor(h.trait.rarity)}">${esc(h.trait.name)}</b> <span class="muted">${esc(h.trait.desc)}</span></div>` : ''}</div></div>
      <div class="mini-stats">
        ${statLine(H.style === 'beam' ? 'Schade/s' : 'Schade', fmt(cst.dmg), nst && fmt(nst.dmg))}
        ${statLine('Bereik', cst.range >= 90 ? 'Map' : f1(cst.range), nst && (nst.range >= 90 ? 'Map' : f1(nst.range)))}
        ${H.style === 'beam' ? statLine('Stralen', cst.beams, nst && nst.beams) : statLine('Snelheid', f2(cst.rate), nst && f2(nst.rate))}
        ${statLine('Lucht', cst.air ? 'Ja' : 'Nee', nst && (nst.air ? 'Ja' : 'Nee'))}
        ${cst.multi > 1 || (nst && nst.multi > 1) ? statLine('Doelen', cst.multi, nst && nst.multi) : ''}
        ${cst.chains || (nst && nst.chains) ? statLine('Sprongen', cst.chains, nst && nst.chains) : ''}
        ${cst.splash || (nst && nst.splash) ? statLine('Explosie', f1(cst.splash), nst && f1(nst.splash)) : ''}
        ${cst.slow || (nst && nst.slow) ? statLine('Vertraging', Math.round(cst.slow * 100) + '%', nst && Math.round(nst.slow * 100) + '%') : ''}
        ${cst.burn || (nst && nst.burn) ? statLine('Brand/s', fmt(cst.burn), nst && fmt(nst.burn)) : ''}
        ${cst.crit || (nst && nst.crit) ? statLine('Crit', Math.round(cst.crit * 100) + '%', nst && Math.round(nst.crit * 100) + '%') : ''}
        ${cst.shred || (nst && nst.shred) ? statLine('Pantserbreuk', cst.shred, nst && nst.shred) : ''}
        ${cst.income || (nst && nst.income) ? statLine('Geld/golf', '$' + fmt(cst.income), nst && '$' + fmt(nst.income)) : ''}
        ${cst.bounty || (nst && nst.bounty) ? statLine('Killbonus', Math.round(cst.bounty * 100) + '%', nst && Math.round(nst.bounty * 100) + '%') : ''}
        ${cst.buffRate || (nst && nst.buffRate) ? statLine('Buff snelh.', '+' + Math.round(cst.buffRate * 100) + '%', nst && '+' + Math.round(nst.buffRate * 100) + '%') : ''}
        ${cst.buffDmg || (nst && nst.buffDmg) ? statLine('Buff schade', '+' + Math.round(cst.buffDmg * 100) + '%', nst && '+' + Math.round(nst.buffDmg * 100) + '%') : ''}
        ${cst.heal || (nst && nst.heal) ? statLine('HP/golf', '+' + cst.heal, nst && '+' + nst.heal) : ''}
        ${cst.execute || (nst && nst.execute) ? statLine('Executie', Math.round(cst.execute * 100) + '%', nst && Math.round(nst.execute * 100) + '%') : ''}
        ${cst.fork || (nst && nst.fork) ? statLine('Scherven', cst.fork, nst && nst.fork) : ''}
        ${st.earlyBoost ? `<div><span>Vroege kracht</span><b style="color:${st.earlyNow > 0 ? 'var(--pow)' : 'var(--dim)'}">+${Math.round((st.earlyNow || 0) * 100)}%</b></div>` : ''}
        <div><span>Kills</span><b id="s-kills">${fmt(h.kills)}</b></div><div><span>Schade</span><b id="s-dmg">${fmt(h.dmg)}</b></div>
      </div>
      <div><div class="kicker" style="margin-bottom:4px">Doelwit</div><div class="target-modes" role="group" aria-label="Doelwit kiezen">${TARGET_MODES.map(([k, l]) => `<button data-act="g-mode" data-m="${k}" aria-pressed="${h.mode === k}">${l}</button>`).join('')}</div></div>
      <button class="btn ${h.tier >= 5 ? 'btn-pow' : 'btn-sky'} abil-btn" id="s-abil" data-act="g-ability" title="${esc(A.desc)}"><span class="cdfill"></span><span class="lbl">${A.name}</span></button>
      ${next ? `<div class="next-upg ${next.major ? 'major' : ''}"><div class="kicker">Upgrade ${h.tier + 1} van 5${next.major ? ' · visuele upgrade' : ''}${next.excl ? '<span class="excl">EXCLUSIEF</span>' : ''}</div><b style="font-size:16px">${esc(next.name)}</b><span class="muted" style="font-size:13px">${esc(next.desc)}</span>
        <button class="btn btn-pow" id="s-upg" data-act="g-upgrade">Upgrade · $${fmt(g.upgCost(h))} (U)</button></div>` : `<div class="next-upg major"><b>Volledig geüpgraded</b><span class="muted" style="font-size:13px">De ultimate "${A.ult}" is actief.</span></div>`}
      <button class="btn btn-danger" data-act="g-sell">Verkoop voor $${fmt(g.sellValue(h))}</button>`;
  } else {
    const nextW = g.wave < g.totalWaves ? g.wave + 1 : null, prev = nextW && g.mode !== 'coop' ? g.wavePreview(nextW) : [];
    let types = [...new Set([...g.map.pool, ...g.map.bosses, g.map.finalBoss])];
    if (g.mode === 'bossrush') types = [...new Set(BOSSRUSH)]; if (g.raid) types = [...new Set([...g.raid.phases.flatMap(p => p.pool || []), g.raid.boss, ...g.raid.phases.map(p => p.miniboss).filter(Boolean)])];
    const ph = g.raid && nextW ? g.raidPhase(nextW) : null;
    side.innerHTML = `${tip}
      <div><span class="kicker">${esc(g.map.name)} · ${esc(modeLabel(g))}</span><h3>${g.mode === 'coop' ? 'Wereldbaas' : g.mode === 'bossrush' ? (nextW ? `Volgende: ${ENEMIES[BOSSRUSH[nextW - 1]].name}` : 'Laatste baas') : nextW ? `Volgende: golf ${nextW}` : 'Laatste golf bezig'}</h3></div>
      ${g.mods.length ? `<div class="wave-preview">${g.mods.map(id => `<span>${esc(MOD[id].name)}</span>`).join('')}</div>` : ''}
      ${ph ? `<p class="tip" style="margin:0"><b>${esc(ph.p.name)}</b>${ph.p.boss ? ` · ${esc(ENEMIES[g.raid.boss].desc)}` : ` · golf ${ph.local} van ${ph.len}`}</p>` : ''}
      ${g.mode === 'coop' ? `<p class="tip" style="margin:0">Alle spelers vechten tegen dezelfde HP-balk. Doe binnen ${COOP.runTime} seconden zoveel mogelijk schade. Je schade telt mee voor iedereen.</p>` : ''}
      ${g.mode === 'endless' ? `<p class="tip" style="margin:0">Geen laatste golf: vijanden worden steeds sterker. Hoe ver kom jij? Je record: golf ${Store.data.stats.endlessBest}.</p>` : ''}
      ${nextW && prev.length ? `<div class="wave-preview">${prev.map(p => `<span class="${p.boss ? 'boss' : ''}">${p.count}× ${ENEMIES[p.type].name}</span>`).join('')}</div>` : ''}
      ${g.mode !== 'bossrush' && !g.raid && g.mode !== 'coop' && nextW && prev.some(p => p.boss) && nextW !== g.totalWaves ? '<p class="tip" style="margin:0">Deze golf bevat een baas. Houd je abilities klaar!</p>' : ''}
      ${nextW === g.totalWaves && (g.mode === 'campaign' || g.mode === 'custom' || g.mode === 'challenge' || g.mode === 'event' || g.mode === 'secret') ? `<p class="tip" style="margin:0">Laatste golf: de eindbaas ${ENEMIES[g.map.finalBoss].name} verschijnt.</p>` : ''}
      <div><div class="section-title" style="margin-top:0">Vijanden op deze map</div><div class="legend">${types.map(t => `<div><canvas data-enemy="${t}"></canvas><span><b>${ENEMIES[t].name}</b> <span class="muted">${esc(ENEMIES[t].desc || '')}</span></span></div>`).join('')}</div></div>
      <p class="muted" style="font-size:13px;margin:0">Klik op een geplaatste held om te upgraden, de ability te gebruiken of te verkopen. Een uitroepteken boven een held betekent: ability klaar.</p>`;
  }
  hydratePortraits(side);
}
function tutorialTip() {
  if (!Store.data.settings.tips) return '';
  const g = App.game, s = Store.data.tutorial;
  if (s >= 3) return '';
  const steps = ['Stap 1: kies een held in de balk onderaan en klik op een vrij veld naast het pad.', 'Stap 2: druk op "Start golf". Tussen golven verdien je extra geld.', 'Stap 3: klik op je held en koop een upgrade. Grote upgrades veranderen zijn uiterlijk!'];
  return `<div class="tip"><b>Tip.</b> ${steps[s]}</div>`;
}
function tutorialEvent(type) {
  const s = Store.data.tutorial; if (s >= 3) return;
  if ((s === 0 && type === 'placed') || (s === 1 && type === 'wave') || (s === 2 && type === 'upgraded')) { Store.data.tutorial++; Store.save(); App.game.panelDirty = true; }
}
function handleGameEvents() {
  const g = App.game; if (!g || !g.events.length) return;
  const ev = g.events; g.events = [];
  for (const e of ev) {
    if (e.type === 'msg') toast(e.data, 'bad');
    tutorialEvent(e.type);
    if (e.type === 'end' && !App.gameOverShown) { App.gameOverShown = true; setTimeout(showResults, g.result.quit ? 0 : 1800); }
  }
}

/* ---------------- beloningen ---------------- */
function snapshotUnlocks() { return { maps: MAPS.map((m, i) => Progress.mapUnlocked(i)), diffs: MAPS.map((m, i) => DIFFS.map((d, j) => Progress.diffUnlocked(i, j))), gachas: GACHAS.map(x => Progress.gachaUnlocked(x)), raids: RAIDS.map(r => RAID_DIFFS.map((d, j) => Meta.raidDiffUnlocked(r, j))), br: Meta.modeUnlocked(BOSSRUSH_UNLOCK), coop: Meta.modeUnlocked(COOP.unlock), secret: Object.keys(Store.data.secret).length }; }
function showResults() {
  const g = App.game; if (!g) return;
  const win = g.result.win, before = snapshotUnlocks(), lvBefore = Store.data.level;
  const R = Meta.finishMatch(g);
  const after = snapshotUnlocks(), unlocks = [];
  MAPS.forEach((m, i) => { if (after.maps[i] && !before.maps[i]) unlocks.push(`Nieuwe map: ${m.name}`); DIFFS.forEach((d, j) => { if (j > 1 && after.diffs[i][j] && !before.diffs[i][j]) unlocks.push(`${m.name}: ${d.name} vrijgespeeld`); }); });
  GACHAS.forEach((x, i) => { if (after.gachas[i] && !before.gachas[i]) unlocks.push(`Nieuwe gacha: ${x.event ? 'Event Gacha' : x.name}`); });
  RAIDS.forEach((r, i) => RAID_DIFFS.forEach((d, j) => { if (after.raids[i][j] && !before.raids[i][j]) unlocks.push(j ? `Raid ${r.name}: ${d.name} vrijgespeeld` : `Nieuwe raid: ${r.name}`); }));
  if (after.br && !before.br) unlocks.push('Boss Rush vrijgespeeld');
  const title = g.mode === 'coop' ? 'Run voltooid' : win ? 'Overwinning!' : g.result.quit ? 'Opgegeven' : 'Verslagen';
  const sub = g.mode === 'coop' ? `${fmt(g.coopDmg)} schade aan de wereldbaas.` : g.mode === 'endless' ? `Je overleefde ${g.cleared} golven.` : g.mode === 'bossrush' ? `${BOSSRUSH.filter(b => g.ms.bossKillsList.includes(b)).length} van ${BOSSRUSH.length} bazen verslagen.` : win ? `Alle ${g.totalWaves} golven overleefd met ${Math.ceil(g.hp)} ♥ over.` : `Je haalde ${g.cleared} van ${g.totalWaves} golven.`;
  $('#overlay-root').innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-label="Resultaat"><div class="panel results-card">
    <span class="kicker" style="text-align:center">${esc(g.map.name)} · ${esc(modeLabel(g))}</span>
    <h2 class="${win ? 'win' : 'lose'}">${title}</h2>
    <p class="muted" style="text-align:center;margin:0">${sub} ${g.kills} schurken verslagen · ${fmt(g.ms.dmg)} schade.</p>
    <div class="rw-rows">${R.rows.map(([k, v]) => `<div><span>${esc(k)}</span><span class="num">${typeof v === 'number' ? coinHtml(v) : esc(v)}</span></div>`).join('')}</div>
    <div class="rw-total"><span>Totaal</span><span><span class="coin-ico"></span> <span id="rw-count" class="num">0</span></span></div>
    <div class="rw-extra"><span style="color:var(--sky)">+${fmt(R.xp)} XP${Store.data.level > lvBefore ? ` · level ${Store.data.level}!` : ''}</span>${R.evCur ? `<span style="color:${R.ev.def.color}">+${R.evCur} ${esc(R.ev.def.currency)}</span>` : ''}${R.lines.filter(l => !/^Level /.test(l) && !/mastery/.test(l)).map(l => `<span>${esc(l)}</span>`).join('')}</div>
    ${R.mastery.length ? `<div><div class="section-title" style="margin:4px 0">Mastery</div><div class="mastery-rows">${R.mastery.map(m => `<div><span>${esc(HERO[m.id].name)}</span><span class="num">+${m.xp} XP · mastery ${m.lvl}${m.up ? ' ▲' : ''}</span></div>`).join('')}</div></div>` : ''}
    ${R.lines.filter(l => /mastery/.test(l)).map(u => `<div class="unlock">${esc(u)}</div>`).join('')}
    ${R.done.map(u => `<div class="unlock" style="background:var(--pow);color:var(--pow-ink)">${esc(u)} · claim in Missies</div>`).join('')}
    ${unlocks.map(u => `<div class="unlock">${esc(u)}</div>`).join('')}
    <div class="btn-row"><button class="btn btn-good" data-act="res-retry">Opnieuw</button><button class="btn" data-act="res-maps">${g.mode === 'campaign' ? 'Andere map' : 'Terug'}</button><button class="btn btn-pow" data-act="res-gacha">Naar gacha</button>${R.done.length ? '<button class="btn btn-sky" data-act="res-missions">Missies</button>' : ''}</div>
  </div></div>`;
  const total = R.coins, t0 = performance.now(); const tick = () => { const f = Math.min(1, (performance.now() - t0) / 900); const el = $('#rw-count'); if (!el) return; el.textContent = fmt(total * f); if (f < 1) requestAnimationFrame(tick); else Sfx.play('coin'); }; tick();
  flushNotes();
}
function exitGame(to) {
  App.game = null; closeOverlay();
  $('#scr-game').hidden = true; $('#scr-game').innerHTML = ''; $('#topbar').hidden = false; $('#main').hidden = false;
  nav(to);
}
function showPause() {
  const g = App.game; if (!g || g.over) return;
  g.paused = true;
  const s = Store.data.settings;
  $('#overlay-root').innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-label="Pauze"><div class="panel pause-card">
    <h2 style="color:var(--pow);font-size:32px">Pauze</h2>
    <p class="muted" style="margin:0">Golf ${g.wave}${g.totalWaves === Infinity ? '' : ` van ${g.totalWaves}`} · ${esc(g.map.name)}</p>
    <button class="btn btn-good" data-act="g-resume">Doorgaan</button>
    <div class="set-row" style="padding:0"><label for="p-sfx">Geluid</label><input type="range" id="p-sfx" min="0" max="1" step="0.05" value="${s.sfx}"></div>
    <div class="set-row" style="padding:0"><label id="pl-music">Muziek</label><button class="toggle" data-act="set-toggle" data-k="musicOn" aria-pressed="${s.musicOn}" aria-labelledby="pl-music"></button></div>
    <div class="set-row" style="padding:0"><label id="pl-dmg">Schadegetallen</label><button class="toggle" data-act="set-toggle" data-k="dmgNums" aria-pressed="${s.dmgNums}" aria-labelledby="pl-dmg"></button></div>
    <button class="btn btn-danger" data-act="g-quit" id="quit-btn">Opgeven</button>
    <span class="muted" style="font-size:13px">Opgeven levert munten op voor de golven die je al hebt gehaald.</span>
  </div></div>`;
  $('#p-sfx').addEventListener('input', e => { Store.data.settings.sfx = +e.target.value; Sfx.applyVol(); Store.save(); });
}

/* =====================================================================
   Acties (event delegation)
   ===================================================================== */
const ACTIONS = {
  'nav': b => { Sfx.play('click'); if (b.dataset.tab && b.dataset.to === 'missions') App.missionTab = b.dataset.tab; nav(b.dataset.to); },
  'sel-map': b => { const i = +b.dataset.i; if (!Progress.mapUnlocked(i)) { toast(`${Progress.lockText(i)}.`, 'bad'); Sfx.play('error'); return; } Sfx.play('click'); App.mapSel = i; App.diffSel = Math.min(App.diffSel, 1); renderMaps(); },
  'sel-diff': b => { Sfx.play('click'); App.diffSel = +b.dataset.d; renderMaps(); },
  'start-game': () => startGame(),
  'sel-gacha': b => { Sfx.play('click'); App.gachaSel = b.dataset.id; renderGacha(); },
  'pull': b => doPull(b.dataset.id, +b.dataset.n),
  'pull-ticket': b => doPull(b.dataset.id, 1, true),
  'reveal-skip': () => revealDone(),
  'reveal-close': () => { closeOverlay(); updateCoins(); if (App.screen === 'gacha') renderGacha(); },
  'reveal-again': b => { closeOverlay(); doPull(b.dataset.id, +b.dataset.n); if (App.screen === 'gacha' && !$('#reveal')) renderGacha(); },
  'filter': b => { App.collFilter = b.dataset.f; renderCollection(); },
  'hero-info': b => { Sfx.play('click'); openHeroModal(b.dataset.id); },
  'team-toggle': b => { toggleTeam(b.dataset.id); if (b.dataset.modal) openHeroModal(b.dataset.id, App.preview ? App.preview.tier : 0); if (App.screen === 'team') renderTeam(); if (App.screen === 'collection') renderCollection(); },
  'team-remove': b => { toggleTeam(b.dataset.id); renderTeam(); },
  'level-up': b => { const id = b.dataset.id, o = Store.data.heroes[id], c = lvlCost(id); if (!o || o.level >= MAX_LEVEL || Store.data.coins < c) return; Store.data.coins -= c; o.level++; Store.save(); updateCoins(); Sfx.play('upgrade'); toast(`${HERO[id].name} is nu level ${o.level}!`, 'good'); openHeroModal(id, App.preview ? App.preview.tier : 0); if (App.screen === 'collection') renderCollection(); if (App.screen === 'team') renderTeam(); },
  'modal-close': () => closeOverlay(),
  'open-code': () => { Sfx.play('click'); openCodeDialog(); },
  'modal-bg': (b, e) => { if (e.target === b) closeOverlay(); },
  'tier-preview': b => { if (!App.preview) return; App.preview.tier = +b.dataset.t; $$('.tier-pick button').forEach(x => x.setAttribute('aria-pressed', x === b)); Sfx.play(+b.dataset.t === 3 || +b.dataset.t === 5 ? 'bigupgrade' : 'upgrade'); App.preview.fx.ring(150, 200, 90, HERO[App.preview.id].look.suit2, 0.5, 6); },
  'preview-attack': () => previewAttack(false),
  'preview-ult': () => previewAttack(true),
  'set-toggle': b => { const k = b.dataset.k; Store.data.settings[k] = !Store.data.settings[k]; b.setAttribute('aria-pressed', Store.data.settings[k]); Sfx.applyVol(); Store.save(); Sfx.play('click'); if (App.game) App.game.panelDirty = true; },
  'reset-progress': () => { Sfx.play('click'); openResetDialog(); },
  'open-reset': () => { Sfx.play('click'); openResetDialog(); },
  'reset-confirm': () => resetGame(),
  // match
  'deck': b => { const g = App.game; if (!g) return; Sfx.init(); const id = b.dataset.id; g.placing = g.placing === id ? null : id; g.select(null); Sfx.play('click'); syncDeck(); },
  'g-start': () => { const g = App.game; if (g && g.relicOffer) { showRelicPick(); return; } if (g && g.startWave()) {} },
  'g-speed': b => { const g = App.game; if (!g) return; g.speed = +b.dataset.s; $$('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); Sfx.play('click'); },
  'g-auto': () => toggleAutoSkip(),
  'g-pause': () => showPause(),
  'g-resume': () => { closeOverlay(); if (App.game) App.game.paused = false; },
  'g-quit': b => { if (!App.confirm.quit) { App.confirm.quit = true; b.textContent = 'Klik nogmaals om op te geven'; setTimeout(() => { App.confirm.quit = false; if (b.isConnected) b.textContent = 'Opgeven'; }, 4000); return; } App.confirm.quit = false; closeOverlay(); App.game.paused = false; App.game.quit(); },
  'g-upgrade': () => { const g = App.game; if (g && g.sel) g.upgrade(g.sel); },
  'g-sell': () => { const g = App.game; if (g && g.sel) g.sell(g.sel); },
  'g-ability': () => { const g = App.game; if (g && g.sel) g.useAbility(g.sel); },
  'g-mode': b => { const g = App.game; if (g && g.sel) { g.sel.mode = b.dataset.m; g.panelDirty = true; Sfx.play('click'); } },
  'res-retry': () => { closeOverlay(); $('#scr-game').innerHTML = ''; App.game = null; startMatch(App.lastMatch); },
  'res-maps': () => exitGame(App.lastMatch && App.lastMatch.back ? App.lastMatch.back : 'maps'),
  'res-missions': () => exitGame('missions'),
  'res-gacha': () => exitGame('gacha'),
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const fn = ACTIONS[b.dataset.act]; if (!fn) return;
  if (b.dataset.act !== 'modal-bg') e.stopPropagation();
  Sfx.init(); fn(b, e);
});
document.addEventListener('keydown', e => {
  const g = App.game;
  if (e.key === 'Escape') {
    if ($('#overlay-root').children.length) { if (g && g.paused) { closeOverlay(); g.paused = false; } else if (!$('.results-card')) closeOverlay(); return; }
    if (g) { if (g.placing) { g.placing = null; syncDeck(); } else if (g.sel) g.select(null); else showPause(); }
    return;
  }
  if (!g || g.paused || g.over || $('#overlay-root').children.length) return;
  if (e.target.matches('input')) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= g.team.length) { const id = g.team[n - 1]; g.placing = g.placing === id ? null : id; g.select(null); syncDeck(); e.preventDefault(); }
  else if (e.key === ' ') { g.startWave(); e.preventDefault(); }
  else if (e.key === 'u' || e.key === 'U') { if (g.sel) g.upgrade(g.sel); }
  else if (e.key === 'q' || e.key === 'Q') { if (g.sel) g.useAbility(g.sel); }
  else if (e.key === 'p' || e.key === 'P') showPause();
  else if (e.key === 'a' || e.key === 'A') toggleAutoSkip();
  else if (e.key === 'f' || e.key === 'F') { g.speed = g.speed >= 3 ? 1 : g.speed + 1; $$('.seg button[data-act="g-speed"]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.s === g.speed)); Sfx.play('click'); }
});
window.addEventListener('resize', () => { if (App.game) fitCanvas(); if (App.screen === 'maps' && !App.game) $$('#scr-maps canvas[data-map]').forEach(cv => drawMapThumb(cv, MAPS.find(x => x.id === cv.dataset.map))); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { Store.save(); if (App.game && !App.game.over && !App.game.paused) showPause(); } });

/* ---------------- hoofdlus ---------------- */
let lastSide = 0;
function frame(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - (App.lastTs || ts)) / 1000)); App.lastTs = ts;
  const g = App.game;
  if (g) {
    if (!g.paused) { const steps = g.over ? 1 : g.speed; for (let i = 0; i < steps; i++) g.update(dt); }
    const ctx = App.cv && App.cv.getContext('2d'); if (ctx) g.render(ctx, App.k);
    hudUpdate(); handleGameEvents();
    if (g.panelDirty || (ts - lastSide > 1000 && !g.sel)) { lastSide = ts; renderSide(); }
  } else if (App.screen === 'home') drawHome(ts);
  if (App.preview) drawPreview(dt);
  $$('[data-timer]').forEach(el => { if (Math.floor(ts / 1000) !== +el.dataset.tick) { el.dataset.tick = Math.floor(ts / 1000); el.textContent = timeLeft(+el.dataset.timer - Date.now()); } });
  requestAnimationFrame(frame);
}
const AUTO_ORDER = ['off', 'clear', 'direct'];
const AUTO_LABEL = { off: 'Uit', clear: 'Na golf', direct: 'Direct' };
function autoModeOf(g) { return !g.autoWave ? 'off' : g.autoDirect ? 'direct' : 'clear'; }
function applyAutoMode(g, m) { g.autoWave = m === 'clear' || m === 'direct'; g.autoDirect = m === 'direct'; if (!g.autoWave) g.autoT = -1; }
function toggleAutoSkip() {
  const g = App.game; if (!g || g.mode === 'coop') return;
  const m = AUTO_ORDER[(AUTO_ORDER.indexOf(autoModeOf(g)) + 1) % AUTO_ORDER.length];
  applyAutoMode(g, m); Store.data.settings.autoMode = m; Store.data.settings.autoWave = g.autoWave; Store.save();
  const b = $('#h-auto'); if (b) { b.setAttribute('aria-pressed', g.autoWave); b.dataset.mode = m; }
  const l = $('#h-auto-l'); if (l) l.textContent = AUTO_LABEL[m];
  if (g.autoWave && !g.bonusPending && g.canStartWave() && g.wave > 0) g.autoT = 1;
  toast({ off: 'Auto Skip uit', clear: 'Auto Skip: de volgende golf start vanzelf zodra de golf verslagen is', direct: 'Auto Skip Direct: de volgende golf start zodra alle vijanden binnen zijn (met vroege-startbonus)' }[m], g.autoWave ? 'good' : ''); Sfx.play('click');
}
function boot() {
  Store.load();
  if (Store.data.settings.autoWave == null) Store.data.settings.autoWave = false;
  if (!AUTO_ORDER.includes(Store.data.settings.autoMode)) Store.data.settings.autoMode = Store.data.settings.autoWave ? 'clear' : 'off';
  Meta.ensureAll(); Meta.ensureChallenges(); Meta.season(); for (const m of SPECIAL_MAPS) if (m.kind === 'secret') Meta.secretUnlocked(m); Meta.checkAchievements(); Store.save();
  Online.on(() => { if (!App.game && !$('#overlay-root').children.length && (App.screen === 'leaderboard' || (App.screen === 'modes' && App.modeTab === 'coop'))) rerender(); });
  nav('home');
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (App.screen === 'home') renderHome(); });
}
