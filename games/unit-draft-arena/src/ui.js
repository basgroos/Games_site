// ===================== UI / GAME FLOW =====================
const BUILD = Object.assign({ env: 'live', version: 'dev', home: '' }, window.HW_BUILD || {});
const RECORD_KEY = 'unit-draft-arena-record-v1' + (BUILD.env === 'staging' ? '-staging' : '');
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- sound ----------
const SFX = (() => {
  let ctx = null, master = null, muted = false, lastHit = 0;
  function ensure() {
    try {
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
  }
  function tone(f, d, type = 'sine', v = 0.3, f2 = null, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, v = 0.3, freq = 1200, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay, len = Math.max(1, Math.floor(ctx.sampleRate * d)), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  return {
    ensure, setMuted(m) { muted = m; }, isMuted() { return muted; },
    bid: who => { tone(who ? 440 : 660, 0.09, 'triangle', 0.25); tone(who ? 550 : 880, 0.12, 'triangle', 0.2, null, 0.07); },
    tick: () => tone(1250, 0.03, 'square', 0.05),
    sold: () => { noise(0.15, 0.5, 400); tone(110, 0.25, 'sine', 0.4); tone(880, 0.6, 'triangle', 0.14, null, 0.05); },
    pass: () => tone(320, 0.14, 'sine', 0.14, 200),
    hit: () => { const n = performance.now(); if (n - lastHit < 55) return; lastHit = n; noise(0.06, 0.16, 2400); },
    boom: () => { noise(0.5, 0.45, 500); tone(70, 0.4, 'sine', 0.5, 40); },
    zap: () => { tone(900, 0.15, 'sawtooth', 0.07, 200); noise(0.1, 0.12, 6000); },
    die: () => tone(240, 0.25, 'triangle', 0.1, 90),
    whoosh: () => noise(0.6, 0.22, 900),
    freeze: () => { tone(1400, 0.3, 'sine', 0.1, 2200); noise(0.2, 0.1, 8000); },
    cast: () => tone(330, 0.35, 'sine', 0.16, 880),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.22, null, i * 0.12)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.38, 'triangle', 0.2, null, i * 0.15)),
    click: () => tone(700, 0.04, 'square', 0.05),
    go: () => { tone(220, 0.2, 'sawtooth', 0.12, 440); noise(0.3, 0.2, 1500, 0.05); },
  };
})();

// ---------- state ----------
const G = {
  level: 'normal', bestOf: 3, round: 0, score: [0, 0], pers: null, history: [], token: 0,
  player: null, ai: null, lots: [], lotIdx: -1, A: null, screen: 'scr-title',
  place: null, B: null, mode: null, speed: 1, paused: false, countdown: 0, target: null, endT: 0, hover: null, seq: 1,
};
const LOT_T = { easy: 11, normal: 9, hard: 8 }, BID_EXT = 4;
function newOwner() { return { coins: 20, units: [], buffs: [], abilities: [] }; }
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); G.screen = id; window.scrollTo({ top: 0 }); }
function renderScore() {
  const el = $('#scoreBar');
  if (!G.round) { el.innerHTML = ''; return; }
  el.innerHTML = `<span class="pill">Ronde ${G.round} · ${G.bestOf === 1 ? '1 ronde' : 'Best of ' + G.bestOf}</span><span class="pill p">Jij ${G.score[0]}</span><span class="pill a">${G.score[1]} ${esc(G.pers.name)}</span>`;
}

// ---------- card html ----------
const roleName = d => ({ melee: 'Melee', ranged: 'Ranged', healer: 'Healer', support: 'Support' }[d.role]) + (d.fly ? ' · vliegt' : '') + (d.splash ? ' · gebied' : '');
const tagChip = t => `<span class="tag" style="--tc:${TAGS[t]}">${t}</span>`;
const fmt = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
function cardHTML(kind, def, o = {}) {
  const r = RAR[def.rar];
  const typeLbl = { unit: 'Unit', buff: 'Buff', ability: 'Ability' }[kind];
  let body;
  if (kind === 'unit') {
    const st = (l, v) => `<div><b>${v}</b><span>${l}</span></div>`;
    body = `<div class="pt"><img src="${portrait(def, 160)}" alt=""></div><h3>${esc(def.name)}</h3><div class="role">${roleName(def)}</div>
      <div class="stats">${st('HP', def.hp)}${def.role === 'healer' ? st('Heal', def.heal) : st('Damage', def.dmg)}${st('Aanval/s', fmt(def.as))}${st('Range', def.role === 'melee' ? 'Melee' : fmt(def.rng))}${st('Snelheid', fmt(def.ms))}${st('DPS', Math.round((def.role === 'healer' ? def.heal : def.dmg) * def.as))}</div>
      <div class="sp"><b>${esc(def.spName)}:</b> ${esc(def.spDesc)}</div>
      <div class="tags">${def.tags.map(tagChip).join('') || '<span class="tag" style="--tc:#888">Geen tags</span>'}</div>`;
  } else {
    const sub = kind === 'buff' ? (def.target === 'team' ? 'Werkt op je hele team' : 'Werkt op één unit') : `Cooldown ${def.cd}s · ${{ none: 'direct', point: 'kies gebied', ally: 'kies unit + plek' }[def.target]}`;
    body = `<div class="pt">${iconSVG(def.icon, 72, r.color)}</div><h3>${esc(def.name)}</h3><div class="role">${sub}</div><p class="desc">${esc(def.desc)}</p>`;
  }
  return `<div class="card r-${def.rar} ${o.cls || ''}" style="--rc:${r.color}" ${o.attr || ''}><div class="card-top"><span>${typeLbl}</span><span class="rar">${r.name}</span></div>${body}${o.price != null ? `<div class="card-foot">${o.priceLbl || 'Prijs'} <b>€${o.price}</b></div>` : ''}</div>`;
}
function miniImg(kind, def, size = 30) { return kind === 'unit' ? `<img src="${portrait(def, 64)}" alt="" width="${size}" height="${size}">` : iconSVG(def.icon, size, RAR[def.rar].color); }
function miniHTML(kind, item) { return `<div class="mini" style="--rc:${RAR[item.def.rar].color}">${miniImg(kind, item.def)}<span>${esc(item.def.name)}</span><em>${item.price ? '€' + item.price : 'gratis'}</em></div>`; }
function synChips(defs, showAll = false) {
  const { counts } = computeSynergies(defs);
  const out = [];
  for (const s of SYNERGIES) {
    const c = counts[s.tag] || 0; if (!c && !showAll) continue;
    let lvl = 0; s.levels.forEach((l, i) => { if (c >= l.n) lvl = i + 1; });
    const next = s.levels[lvl] ? s.levels[lvl].n : s.levels[s.levels.length - 1].n;
    const tip = s.levels.map(l => `${l.n}: ${l.txt}`).join(' | ');
    out.push(`<span class="syn ${lvl ? 'on' : ''}" style="--tc:${TAGS[s.tag]}" title="${esc(tip)}">${s.tag} ${c}/${next}</span>`);
  }
  return out.join('') || '<span class="empty">Nog geen synergieën</span>';
}
function savingsPct(coins) { return Math.round(Math.min(SAVINGS_MAX, coins * SAVINGS_PER_EURO) * 100); }

// ---------- modal ----------
function openModal(html, opts = {}) {
  $('#modalBox').innerHTML = (opts.noClose ? '' : '<button class="icon-btn x" data-close>Sluiten</button>') + html;
  $('#modal').classList.add('on'); G.modalOpen = true; G.modalNoClose = !!opts.noClose;
}
function closeModal() { $('#modal').classList.remove('on'); G.modalOpen = false; }
$('#modal').addEventListener('click', e => { if (e.target.closest('[data-close]') || (e.target.id === 'modal' && !G.modalNoClose)) closeModal(); });

function howTo() {
  openModal(`<h2>Hoe werkt het?</h2>
  <div class="rules">
    <div><b>1. De veiling</b><p>Iedere ronde krijgen jij en de AI precies €20. Er komen 10 tot 12 kavels voorbij: units, buffs en abilities. Bied tegen de klok. Elk bod verlengt de timer. Wie het hoogst biedt, betaalt en krijgt het item.</p></div>
    <div><b>2. Geld is schaars</b><p>Je kunt nooit alles kopen. Niet uitgegeven geld wordt een spaarbonus: +3% HP en damage per euro (max +30%). Iedereen krijgt daarnaast één gratis Rekruut.</p></div>
    <div><b>3. Rarity</b><p>Common (grijs), Uncommon (groen), Rare (blauw), Epic (paars), Legendary (goud) en Mythic (rood, 2%). Hogere rarity is sterker en duurder, maar geen garantie op winst.</p></div>
    <div><b>4. Synergieën</b><p>Units hebben tags zoals Volk, Krijger, Magiër of Beest. Met 2, 3 of 5 van dezelfde tag krijgt je team bonussen. Een slimme combinatie verslaat vaak één dure unit.</p></div>
    <div><b>5. Opstelling</b><p>Zet je units in het blauwe gebied. Tanks lokken vijanden naar zich toe, healers blijven achter de frontlinie, sluipmoordenaars springen naar de achterhoede.</p></div>
    <div><b>6. Het gevecht</b><p>Units vechten automatisch. Jij activeert abilities met de knoppen of toetsen 1–9. Spreuken op een gebied richt je door daarna in de arena te klikken. Het team dat overblijft wint de ronde.</p></div>
  </div>
  <div class="actions"><button class="btn gold" data-close>Begrepen</button></div>`);
}
function codex(tab = 'unit') {
  const tabs = [['unit', 'Units (' + UNITS.length + ')'], ['buff', 'Buffs (' + BUFFS.length + ')'], ['ability', 'Abilities (' + ABILITIES.length + ')'], ['syn', 'Synergieën']];
  let body;
  if (tab === 'syn') body = `<div class="syn-list">${SYNERGIES.map(s => `<div style="--tc:${TAGS[s.tag]}"><b>${s.tag}</b>${s.levels.map(l => `<p>${l.n}×: ${esc(l.txt)}</p>`).join('')}<p style="color:var(--muted)">${UNITS.filter(u => u.tags.includes(s.tag)).map(u => u.name).join(', ')}</p></div>`).join('')}</div>`;
  else {
    const list = tab === 'unit' ? UNITS : tab === 'buff' ? BUFFS : ABILITIES;
    body = `<div class="cards">${list.slice().sort((a, b) => RAR[a.rar].tier - RAR[b.rar].tier).map(d => cardHTML(tab, d, { price: RAR[d.rar].price, priceLbl: 'Startprijs' })).join('')}</div>`;
  }
  openModal(`<h2>Alle kaarten</h2><div class="tabs">${tabs.map(([k, l]) => `<button data-codex="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`);
}
function inventory(who = 0) {
  if (!G.player) { codex(); return; }
  const o = who ? G.ai : G.player;
  const defs = o.units.map(u => u.def);
  const sec = (title, kind, arr) => arr.length ? `<h3 style="margin:16px 0 8px">${title}</h3><div class="cards">${arr.map(x => cardHTML(kind, x.def, { price: x.price, priceLbl: x.price ? 'Betaald' : 'Gratis' })).join('')}</div>` : '';
  openModal(`<h2>${who ? esc(G.pers.name) : 'Jouw items'}</h2>
    <div class="tabs"><button data-inv="0" class="${who ? '' : 'on'}">Jij</button><button data-inv="1" class="${who ? 'on' : ''}">${esc(G.pers.name)} (AI)</button></div>
    <p style="margin:0"><b style="color:var(--gold)">€${o.coins}</b> over · spaarbonus <b>+${savingsPct(o.coins)}%</b> HP en damage</p>
    <div class="syns">${synChips(defs, true)}</div>
    ${sec('Units', 'unit', o.units)}${sec('Buffs', 'buff', o.buffs)}${sec('Abilities', 'ability', o.abilities)}
    ${!o.units.length && !o.buffs.length && !o.abilities.length ? '<p class="empty" style="margin-top:14px">Nog niets gekocht.</p>' : ''}`);
}
$('#modalBox').addEventListener('click', e => {
  const c = e.target.closest('[data-codex]'); if (c) codex(c.dataset.codex);
  const i = e.target.closest('[data-inv]'); if (i) inventory(+i.dataset.inv);
});

// ---------- hero ----------
const HERO = ['archer', 'knight', 'firemage', 'dragon', 'golem', 'priestess', 'assassin'];
function drawHero(t) {
  const cv = $('#heroCv'); const c = cv.getContext('2d'); const W = cv.width, H = cv.height;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1230'); g.addColorStop(0.65, '#2a1838'); g.addColorStop(1, '#0b0812');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // arches
  c.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 7; i++) { const x = 40 + i * 140; c.beginPath(); c.moveTo(x, 260); c.lineTo(x, 110); c.arc(x + 50, 110, 50, Math.PI, 0); c.lineTo(x + 100, 260); c.fill(); }
  const sg = c.createRadialGradient(W / 2, 140, 10, W / 2, 140, 380); sg.addColorStop(0, 'rgba(255,200,120,.28)'); sg.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = sg; c.fillRect(0, 0, W, H);
  c.fillStyle = '#1a1422'; c.fillRect(0, 300, W, H - 300);
  c.fillStyle = 'rgba(242,195,91,.15)'; c.fillRect(0, 298, W, 3);
  const pos = [110, 230, 345, 455, 590, 690, 800];
  HERO.forEach((id, i) => {
    const def = UNIT[id], x = pos[i], big = id === 'dragon' || id === 'golem';
    const y = 312 + (i % 2) * 14;
    c.fillStyle = 'rgba(0,0,0,.45)'; ell(c, x, y, big ? 60 : 30, big ? 12 : 8); c.fill();
    const lg = c.createRadialGradient(x, y, 2, x, y, 70); lg.addColorStop(0, rgba(RAR[def.rar].color, 0.35)); lg.addColorStop(1, rgba(RAR[def.rar].color, 0)); c.fillStyle = lg; ell(c, x, y, 70, 20); c.fill();
    const k = big ? 2.3 : 2.4;
    const atk = ((t * 0.6 + i * 0.37) % 2.4) < 0.25 ? 1 - ((t * 0.6 + i * 0.37) % 2.4) / 0.25 : 0;
    drawFigure(c, def, x, y, k, i < 3 ? 1 : -1, { t, walk: 0, moving: false, atk, cast: atk, seed: i * 1.3 });
  });
  if (Math.random() < 0.5) heroParts.push({ x: Math.random() * W, y: H, vy: -20 - Math.random() * 40, life: 3 });
  c.fillStyle = '#ffb35a';
  heroParts.forEach(p => { p.y += p.vy / 60; p.x += Math.sin(p.y / 30) * 0.4; p.life -= 1 / 60; c.globalAlpha = Math.max(0, p.life / 3); c.fillRect(p.x, p.y, 2, 2); });
  c.globalAlpha = 1; heroParts = heroParts.filter(p => p.life > 0);
}
let heroParts = [];

// ===================== MATCH FLOW =====================
function newMatch() {
  G.token++; G.round = 0; G.score = [0, 0]; G.history = [];
  G.pers = pick(AI_NAMES);
  startRound();
}
function startRound() {
  G.token++; closeModal();
  G.round++; G.player = newOwner(); G.ai = newOwner(); G.seq = 1;
  G.lots = generateDraft(); G.lotIdx = -1; G.A = null;
  renderScore(); show('scr-draft');
  renderStrip(); renderSides();
  nextLot();
}

// ---------- draft ----------
function renderStrip() {
  $('#lotStrip').innerHTML = G.lots.map((l, i) => {
    const who = l.winner === 0 ? '<span class="who p">Jij €' + l.price + '</span>' : l.winner === 1 ? '<span class="who a">AI €' + l.price + '</span>' : l.winner === -1 ? '<span class="who n">—</span>' : '';
    return `<div class="lot ${i === G.lotIdx ? 'cur' : ''} ${l.winner != null ? 'done' : ''}" style="--rc:${RAR[l.def.rar].color}" data-lot="${i}" title="${esc(l.def.name)} (${RAR[l.def.rar].name})">${miniImg(l.kind, l.def, 40)}<span class="nm">${esc(l.def.name)}</span>${who}</div>`;
  }).join('');
  const cur = $('#lotStrip .cur'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}
$('#lotStrip').addEventListener('click', e => { const l = e.target.closest('[data-lot]'); if (!l) return; const lot = G.lots[+l.dataset.lot]; openModal(`<div class="cards" style="margin-top:20px">${cardHTML(lot.kind, lot.def, { price: lot.start, priceLbl: 'Startprijs' })}</div>`); });

function ownerPanel(o, who) {
  const defs = o.units.map(u => u.def);
  const items = o.units.map(u => miniHTML('unit', u)).concat(o.buffs.map(b => miniHTML('buff', b)), o.abilities.map(a => miniHTML('ability', a)));
  const reserved = G.A && !G.A.closed && G.A.leader === who ? G.A.price : 0;
  const head = who ? `<div class="ai-head"><img src="${portrait(UNIT[G.pers.avatar], 96)}" alt=""><div><h2 style="color:var(--a)">${esc(G.pers.name)}</h2><div class="sub" style="margin:0">${esc(G.pers.style)} · ${esc(G.pers.desc)}</div></div></div>`
    : `<h2 style="color:var(--p)">Jij</h2><div class="sub">Bouw een leger dat samenwerkt.</div>`;
  return `${head}<div class="wallet"><span class="coin">€</span><b id="coins${who}">${o.coins}</b><span>${reserved ? `€${reserved} geboden` : 'over'}${o.coins ? ` · spaarbonus +${savingsPct(o.coins)}%` : ''}</span></div>
    <div class="minis">${items.join('') || '<span class="empty">Nog niets gekocht</span>'}</div>
    <div class="syns">${synChips(defs)}</div>`;
}
function renderSides() { $('#sideMe').innerHTML = ownerPanel(G.player, 0); $('#sideAi').innerHTML = ownerPanel(G.ai, 1); }

function nextLot() {
  G.lotIdx++;
  if (G.lotIdx >= G.lots.length) { endDraft(); return; }
  const lot = G.lots[G.lotIdx];
  const left = G.lots.slice(G.lotIdx + 1);
  G.A = { lot, price: 0, leader: null, timer: LOT_T[G.level], max: LOT_T[G.level], aiMax: aiMaxBid(lot, G.ai, left, G.pers, G.level), aiAt: rnd(0.9, 2.2), aiOut: false, pPassed: false, closed: false, lastTick: 99 };
  $('#lotCard').innerHTML = cardHTML(lot.kind, lot.def, { cls: 'enter', price: lot.start, priceLbl: 'Startprijs' });
  $('#stamp').className = 'stamp'; $('#stamp').innerHTML = '';
  $('#bidFeed').innerHTML = '';
  renderStrip(); renderSides(); updateAuctionUI();
}
function feed(who, txt) {
  const f = $('#bidFeed'); const s = document.createElement('span'); s.className = who === 0 ? 'p' : who === 1 ? 'a' : ''; s.textContent = txt;
  f.prepend(s); while (f.children.length > 5) f.lastChild.remove();
}
function bubble(who, txt) {
  const side = who === 0 ? $('#sideMe') : $('#sideAi'); const r = side.getBoundingClientRect();
  const b = document.createElement('div'); b.className = 'bubble'; b.textContent = txt; b.style.background = who === 0 ? 'var(--p)' : 'var(--a)';
  b.style.left = (r.left + r.width / 2 - 30) + 'px'; b.style.top = (Math.max(70, r.top) + 40) + 'px';
  document.body.appendChild(b); setTimeout(() => b.remove(), 1000);
}
function coinFly(who) {
  const from = (who === 0 ? $('#coins0') : $('#coins1')); const to = $('#bidPrice'); if (!from || !to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  for (let i = 0; i < 3; i++) {
    const c = document.createElement('div'); c.className = 'flycard'; c.innerHTML = '<span class="coin" style="width:20px;height:20px;border-radius:50%;display:block;background:radial-gradient(circle at 35% 35%,#fff3b8,#f2c35b 45%,#a8701e)"></span>';
    document.body.appendChild(c);
    if (!c.animate) { c.remove(); continue; }
    const anim = c.animate([{ transform: `translate(${a.left}px,${a.top}px)`, opacity: 1 }, { transform: `translate(${(a.left + b.left) / 2}px,${Math.min(a.top, b.top) - 60}px)`, opacity: 1, offset: 0.5 }, { transform: `translate(${b.left + b.width / 2}px,${b.top + 10}px)`, opacity: 0 }], { duration: 520, delay: i * 60, easing: 'ease-in-out', fill: 'forwards' });
    anim.onfinish = () => c.remove();
  }
}
function placeBid(who, amt) {
  const A = G.A; if (!A || A.closed) return;
  A.price = amt; A.leader = who; A.timer = Math.max(A.timer, BID_EXT);
  feed(who, `${who ? 'AI' : 'Jij'} €${amt}`); bubble(who, '€' + amt); coinFly(who); SFX.bid(who);
  const p = $('#bidPrice'); p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  if (who === 0) {
    if (!A.aiOut) { const d = G.level === 'hard' ? rnd(0.4, 1.1) : G.level === 'easy' ? rnd(0.9, 2.2) : rnd(0.6, 1.7); A.aiAt = Math.min(d, Math.max(0.3, A.timer - 0.7)); }
  } else { A.aiAt = null; if (A.pPassed) A.timer = Math.min(A.timer, 2.3); }
  renderSides(); updateAuctionUI();
}
function aiAct() {
  const A = G.A; A.aiAt = null;
  const need = A.leader === null ? A.lot.start : A.price + 1;
  if (need <= A.aiMax && need <= G.ai.coins) {
    let amt = need; if (A.aiMax - need >= 3 && Math.random() < 0.3) amt = need + 1;
    placeBid(1, amt);
  } else {
    A.aiOut = true; feed(1, 'AI past'); bubble(1, 'Past'); SFX.pass();
    if (A.leader === 0) A.timer = Math.min(A.timer, 2.3);
    else if (A.leader === null && A.pPassed) A.timer = Math.min(A.timer, 0.7);
  }
  updateAuctionUI();
}
function playerBid(extra) {
  SFX.ensure();
  const A = G.A; if (!A || A.closed || A.leader === 0) return;
  const need = A.leader === null ? A.lot.start : A.price + 1, amt = need + extra;
  if (amt > G.player.coins) return;
  A.pPassed = false;
  placeBid(0, amt);
}
function playerPass() {
  SFX.ensure();
  const A = G.A; if (!A || A.closed || A.pPassed || A.leader === 0) return;
  A.pPassed = true; feed(0, 'Jij past'); bubble(0, 'Pas'); SFX.pass();
  if (A.leader === 1) A.timer = Math.min(A.timer, 1.6);
  else if (A.aiOut) A.timer = Math.min(A.timer, 0.6);
  else A.aiAt = Math.min(A.aiAt ?? 0.4, 0.4);
  updateAuctionUI();
}
function closeLot() {
  const A = G.A; A.closed = true; const lot = A.lot; const tok = G.token;
  const st = $('#stamp');
  if (A.leader !== null) {
    const o = A.leader ? G.ai : G.player;
    o.coins -= A.price;
    const item = { def: lot.def, price: A.price, uid: G.seq++ };
    if (lot.kind === 'unit') o.units.push(item); else if (lot.kind === 'buff') { item.target = null; o.buffs.push(item); } else o.abilities.push(item);
    lot.winner = A.leader; lot.price = A.price;
    st.innerHTML = `<span style="color:${A.leader ? 'var(--a)' : 'var(--p)'}">Verkocht aan ${A.leader ? 'AI' : 'jou'}</span>`;
    SFX.sold();
    const card = $('#lotCard .card'); const target = A.leader ? $('#sideAi') : $('#sideMe');
    if (card && target) {
      const a = card.getBoundingClientRect(), b = target.getBoundingClientRect();
      setTimeout(() => {
        if (tok !== G.token || !card.animate) return;
        card.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px,${b.top + 140 - (a.top + a.height / 2)}px) scale(.25) rotate(${A.leader ? 12 : -12}deg)`, opacity: 0 }], { duration: 500, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
      }, 650);
    }
  } else {
    lot.winner = -1; st.innerHTML = '<span style="color:#9a92ad">Niet verkocht</span>'; SFX.pass();
  }
  st.className = 'stamp show';
  renderStrip(); renderSides(); updateAuctionUI();
  setTimeout(() => { if (tok === G.token) nextLot(); }, 1400);
}
function updateAuctionUI() {
  const A = G.A; if (!A) return;
  const lot = A.lot;
  $('#bidLabel').textContent = A.leader === null ? 'Startprijs' : 'Hoogste bod';
  $('#bidPrice').textContent = '€' + (A.leader === null ? lot.start : A.price);
  const L = $('#bidLeader');
  L.className = 'leader ' + (A.leader === 0 ? 'p' : A.leader === 1 ? 'a' : '');
  L.textContent = A.closed ? (A.leader === null ? 'Geen biedingen' : (A.leader ? 'AI wint' : 'Jij wint')) : A.leader === null ? 'Nog geen bod' : A.leader === 0 ? 'Jij leidt' : esc(G.pers.name) + ' leidt';
  const card = $('#lotCard .card'); if (card) { card.classList.toggle('lead-p', A.leader === 0); card.classList.toggle('lead-a', A.leader === 1); }
  const need = A.leader === null ? lot.start : A.price + 1;
  [[0, '#bid1', 1], [1, '#bid2', 2], [4, '#bid5', 3]].forEach(([extra, id, key]) => {
    const b = $(id); const amt = need + extra;
    b.innerHTML = `Bied €${amt} <small>toets ${key}</small>`;
    b.disabled = A.closed || A.leader === 0 || amt > G.player.coins;
  });
  $('#bidPass').disabled = A.closed || A.pPassed || A.leader === 0;
}
function tickDraft(dt) {
  const A = G.A; if (!A || A.closed || G.modalOpen) return;
  A.timer -= dt;
  if (!A.aiOut && A.leader !== 1 && A.aiAt != null) { A.aiAt -= dt; if (A.aiAt <= 0) aiAct(); }
  const t = Math.max(0, A.timer);
  $('#timerTxt').textContent = Math.ceil(t);
  $('#timerArc').setAttribute('stroke-dashoffset', 201 * (1 - t / A.max));
  $('#timerArc').setAttribute('stroke', t < 3 ? '#ff5a6a' : '#f2c35b');
  $('#timer').classList.toggle('hot', t < 3);
  if (t < 3 && Math.ceil(t) !== A.lastTick) { A.lastTick = Math.ceil(t); SFX.tick(); }
  $('#callout').textContent = A.leader !== null ? (t < 1.1 ? 'Andermaal…' : t < 2.3 ? 'Eenmaal…' : '') : (t < 2 ? 'Laatste kans…' : '');
  if (A.timer <= 0) closeLot();
}

function endDraft() {
  G.A = null;
  for (const o of [G.player, G.ai]) o.units.push({ def: RECRUIT, price: 0, uid: G.seq++ });
  // AI assigns single-unit buffs to its best unit
  G.ai.buffs.forEach(b => { if (b.def.target === 'unit') b.target = G.ai.units[bestUnitIndex(G.ai.units.map(u => u.def))].uid; });
  G.player.buffs.forEach(b => { if (b.def.target === 'unit') b.target = G.player.units[bestUnitIndex(G.player.units.map(u => u.def))].uid; });
  renderSides(); renderStrip();
  const col = (o, who) => `<div class="side ${who ? 'ai' : 'me'}"><h2 style="color:${who ? 'var(--a)' : 'var(--p)'}">${who ? esc(G.pers.name) : 'Jij'}</h2>
    <div class="wallet"><span class="coin">€</span><b>${o.coins}</b><span>over · spaarbonus +${savingsPct(o.coins)}%</span></div>
    <div class="minis">${o.units.map(u => miniHTML('unit', u)).concat(o.buffs.map(b => miniHTML('buff', b)), o.abilities.map(a => miniHTML('ability', a))).join('')}</div>
    <div class="syns">${synChips(o.units.map(u => u.def))}</div></div>`;
  openModal(`<div class="res-head"><h2 class="win">Draft voltooid</h2><p>Beide legers kregen een gratis Rekruut. Tijd om je troepen op te stellen.</p></div>
    <div class="two">${col(G.player, 0)}${col(G.ai, 1)}</div>
    <div class="actions"><button class="btn gold big" id="toArena">Naar de arena</button></div>`, { noClose: true });
  $('#toArena').onclick = () => { closeModal(); startPlacement(); };
}

// ===================== PLACEMENT =====================
const cv = $('#cv'), cx2 = cv.getContext('2d');
function startPlacement() {
  G.mode = 'place'; G.B = null; resetVFX();
  const aiPos = autoPlace(G.ai.units.map(u => u.def), 1);
  G.place = { pos: {}, aiPos, sel: null, assign: null, drag: null };
  G.player.units.forEach(u => { G.place.sel = G.place.sel ?? u.uid; });
  show('scr-arena');
  $('#placePanel').style.display = ''; $('#battlePanel').style.display = 'none';
  $('#midT').textContent = 'Opstelling'; $('#midS').textContent = `Ronde ${G.round}`; $('#aiNm').textContent = G.pers.name;
  autoPlacePlayer(); // start with a sensible layout the player can tweak
  rebuildPreview(); renderPlaceUI();
}
function autoPlacePlayer() {
  const pos = autoPlace(G.player.units.map(u => u.def), 0);
  G.place.pos = {}; G.player.units.forEach((u, i) => { if (pos[i]) G.place.pos[u.uid] = pos[i]; });
  G.place.sel = null;
}
function sideFor(o, posMap, team) {
  const placed = o.units.filter(u => posMap[u.uid]);
  return {
    units: placed.map(u => ({ def: u.def, cx: posMap[u.uid].cx, cy: posMap[u.uid].cy, uid: u.uid })),
    buffs: o.buffs.map(b => ({ def: b.def, target: b.def.target === 'unit' ? Math.max(0, placed.findIndex(u => u.uid === b.target)) : null })),
    abilities: o.abilities.map(a => a.def), coins: o.coins, ai: team === 1, level: G.level,
  };
}
function aiPosMap() { const m = {}; G.ai.units.forEach((u, i) => { if (G.place.aiPos[i]) m[u.uid] = G.place.aiPos[i]; }); return m; }
function rebuildPreview() {
  const sp = sideFor(G.player, G.place.pos, 0), sa = sideFor(G.ai, aiPosMap(), 1);
  G.B = createBattle([sp, sa]);
  G.B.units.forEach((u, i) => { u.ownerUid = i < sp.units.length ? sp.units[i].uid : null; });
  G.B.fx.length = 0;
}
function renderPlaceUI() {
  const P = G.place;
  $('#tray').innerHTML = G.player.units.map(u => `<button class="tu ${P.sel === u.uid ? 'sel' : ''} ${P.pos[u.uid] ? 'placed' : ''}" style="--rc:${RAR[u.def.rar].color}" data-uid="${u.uid}"><img src="${portrait(u.def, 64)}" alt="">${esc(u.def.name)}</button>`).join('');
  const chips = G.player.buffs.map((b, i) => {
    const tu = b.def.target === 'unit' ? G.player.units.find(u => u.uid === b.target) : null;
    return `<div class="chip ${b.def.target === 'unit' ? 'assign' : ''} ${P.assign === i ? 'sel' : ''}" style="--rc:${RAR[b.def.rar].color}" ${b.def.target === 'unit' ? `data-buff="${i}" role="button" tabindex="0"` : ''} title="${esc(b.def.desc)}">${iconSVG(b.def.icon, 20, RAR[b.def.rar].color)}${esc(b.def.name)} <em>${b.def.target === 'unit' ? '→ ' + (tu ? esc(tu.def.name) : 'kies unit') : 'heel team'}</em></div>`;
  }).concat(G.player.abilities.map(a => `<div class="chip" style="--rc:${RAR[a.def.rar].color}" title="${esc(a.def.desc)}">${iconSVG(a.def.icon, 20, RAR[a.def.rar].color)}${esc(a.def.name)} <em>${a.def.cd}s</em></div>`));
  $('#placeBuffs').innerHTML = chips.join('') || '<span class="empty">Geen buffs of abilities gekocht. Je spaarbonus is +' + savingsPct(G.player.coins) + '%.</span>';
  $('#placeSyn').innerHTML = synChips(G.player.units.map(u => u.def));
  const allPlaced = G.player.units.every(u => P.pos[u.uid]);
  $('#btnFight').disabled = !allPlaced;
  $('#placeHint').textContent = P.assign != null ? 'Klik nu een eigen unit in de arena voor deze buff' : allPlaced ? 'Klaar! Sleep units om te wisselen, of start het gevecht' : 'Klik een unit en dan een vak in het blauwe gebied';
  updateHud();
}
$('#tray').addEventListener('click', e => {
  const b = e.target.closest('[data-uid]'); if (!b) return; const uid = +b.dataset.uid; SFX.ensure(); SFX.click();
  if (G.place.sel === uid && G.place.pos[uid]) { delete G.place.pos[uid]; rebuildPreview(); }
  G.place.sel = G.place.sel === uid ? null : uid; G.place.assign = null; renderPlaceUI();
});
$('#placeBuffs').addEventListener('click', e => { const c = e.target.closest('[data-buff]'); if (!c) return; const i = +c.dataset.buff; G.place.assign = G.place.assign === i ? null : i; G.place.sel = null; renderPlaceUI(); });
$('#btnAuto').onclick = () => { autoPlacePlayer(); rebuildPreview(); renderPlaceUI(); SFX.click(); };
$('#btnClear').onclick = () => { G.place.pos = {}; G.place.sel = G.player.units[0]?.uid ?? null; rebuildPreview(); renderPlaceUI(); SFX.click(); };
$('#btnFight').onclick = () => startBattle();

function canvasPoint(e) {
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * CW, y = (e.clientY - r.top) / r.height * CH;
  return { px: x, py: y, x: (x - OX) / CELL, y: (y - OY) / CELL, cx: Math.floor((x - OX) / CELL), cy: Math.floor((y - OY) / CELL) };
}
function unitAt(p, team) {
  if (!G.B) return null;
  let best = null, bd = 1e9;
  for (const u of G.B.units) {
    if (!u.alive || (team != null && u.team !== team)) continue;
    const top = figureHeight(u.def) * 1.2 * u.size / CELL;
    const d = Math.hypot(p.x - u.x, (p.y - (u.y - top * 0.4)) * 0.8);
    if (d < 0.55 * u.size + 0.1 && d < bd) { bd = d; best = u; }
  }
  return best;
}
function placeOccupant(cx, cy) { for (const [uid, p] of Object.entries(G.place.pos)) if (p.cx === cx && p.cy === cy) return +uid; return null; }
const inZone = (cx, cy) => cx >= ZONE[0][0] && cx <= ZONE[0][1] && cy >= 0 && cy < AH;
function placeClick(p) {
  const P = G.place;
  if (P.assign != null) {
    const u = unitAt(p, 0); if (!u) return;
    G.player.buffs[P.assign].target = u.ownerUid; P.assign = null; SFX.click(); rebuildPreview(); renderPlaceUI(); return;
  }
  if (!inZone(p.cx, p.cy)) { if (p.cx >= ZONE[1][0]) toast('Dat is het gebied van de AI', '#ff5a6a'); return; }
  const occ = placeOccupant(p.cx, p.cy);
  if (P.sel != null) {
    const prev = P.pos[P.sel];
    if (occ != null && occ !== P.sel) { if (prev) P.pos[occ] = prev; else delete P.pos[occ]; }
    P.pos[P.sel] = { cx: p.cx, cy: p.cy }; SFX.click();
    P.sel = G.player.units.find(u => !P.pos[u.uid])?.uid ?? null;
  } else if (occ != null) { P.sel = occ; SFX.click(); }
  rebuildPreview(); renderPlaceUI();
}
cv.addEventListener('pointerdown', e => {
  SFX.ensure();
  const p = canvasPoint(e);
  if (G.mode === 'place') {
    const occ = inZone(p.cx, p.cy) ? placeOccupant(p.cx, p.cy) : null;
    if (occ != null && G.place.assign == null && G.place.sel == null) { G.place.drag = { uid: occ, start: p, moved: false }; cv.setPointerCapture(e.pointerId); return; }
    placeClick(p);
  } else if (G.mode === 'battle') battleClick(p, e);
});
cv.addEventListener('pointermove', e => {
  const p = canvasPoint(e); G.hover = p;
  if (G.mode === 'place' && G.place.drag) { if (Math.hypot(p.px - G.place.drag.start.px, p.py - G.place.drag.start.py) > 8) G.place.drag.moved = true; }
  showTip(p, e);
});
cv.addEventListener('pointerup', e => {
  if (G.mode !== 'place' || !G.place.drag) return;
  const p = canvasPoint(e), d = G.place.drag; G.place.drag = null;
  if (!d.moved) { G.place.sel = d.uid; renderPlaceUI(); return; }
  if (!inZone(p.cx, p.cy)) return;
  const occ = placeOccupant(p.cx, p.cy), prev = G.place.pos[d.uid];
  if (occ != null && occ !== d.uid) G.place.pos[occ] = prev;
  G.place.pos[d.uid] = { cx: p.cx, cy: p.cy }; SFX.click(); rebuildPreview(); renderPlaceUI();
});
cv.addEventListener('pointerleave', () => { G.hover = null; $('#tip').style.display = 'none'; });
cv.addEventListener('contextmenu', e => { e.preventDefault(); if (G.target) { G.target = null; renderAbilityBar(); } });

function showTip(p, e) {
  const tip = $('#tip');
  const u = unitAt(p);
  if (!u || G.target) { tip.style.display = 'none'; return; }
  const d = u.def, r = RAR[d.rar];
  const dps = Math.round((d.role === 'healer' ? u.heal : u.dmg) * u.as);
  tip.innerHTML = `<b>${esc(d.name)}</b> <span class="r" style="color:${r.color}">${r.name}</span>
    <div class="g"><span>HP</span><span>${Math.max(0, Math.round(u.hp))} / ${u.maxHp}</span><span>${d.role === 'healer' ? 'Heal' : 'Damage'}</span><span>${Math.round(d.role === 'healer' ? u.heal : u.dmg)} (${dps}/s)</span><span>Range</span><span>${d.role === 'melee' ? 'Melee' : fmt(Math.round(u.rng * 10) / 10)}</span>${u.crit ? `<span>Crit</span><span>${Math.round(u.crit * 100)}%</span>` : ''}${u.ls ? `<span>Lifesteal</span><span>${Math.round(u.ls * 100)}%</span>` : ''}</div>
    <div style="margin-top:4px;color:#d8cff0"><b style="font-size:12.5px;color:${r.color}">${esc(d.spName)}</b> ${esc(d.spDesc)}</div>`;
  const wrap = cv.parentElement.getBoundingClientRect();
  let x = e.clientX - wrap.left + 16, y = e.clientY - wrap.top + 12;
  if (x > wrap.width - 250) x -= 270; if (y > wrap.height - 150) y -= 160;
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block';
}
function toast(txt, color = '#f2c35b') {
  const t = document.createElement('div'); t.textContent = txt; t.style.color = color;
  $('#toast').appendChild(t); setTimeout(() => t.remove(), 1800);
  while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
}

function placementOverlay() {
  const P = G.place;
  return {
    under(c) {
      for (let y = 0; y < AH; y++) for (let x = ZONE[0][0]; x <= ZONE[0][1]; x++) {
        c.fillStyle = 'rgba(79,209,255,.08)'; c.fillRect(PX(x) + 3, PY(y) + 3, CELL - 6, CELL - 6);
        c.strokeStyle = 'rgba(79,209,255,.35)'; c.lineWidth = 1.5; c.strokeRect(PX(x) + 3.5, PY(y) + 3.5, CELL - 7, CELL - 7);
      }
      for (let y = 0; y < AH; y++) for (let x = ZONE[1][0]; x <= ZONE[1][1]; x++) { c.fillStyle = 'rgba(255,90,106,.06)'; c.fillRect(PX(x) + 3, PY(y) + 3, CELL - 6, CELL - 6); }
      const h = G.hover;
      if (h && inZone(h.cx, h.cy) && P.assign == null) { c.strokeStyle = '#f2c35b'; c.lineWidth = 3; c.strokeRect(PX(h.cx) + 3, PY(h.cy) + 3, CELL - 6, CELL - 6); }
      if (P.sel != null && P.pos[P.sel]) { const q = P.pos[P.sel]; c.strokeStyle = '#f2c35b'; c.setLineDash([5, 4]); c.lineWidth = 2; c.strokeRect(PX(q.cx) + 6, PY(q.cy) + 6, CELL - 12, CELL - 12); c.setLineDash([]); }
    },
    over(c) {
      const h = G.hover; const uid = P.drag && P.drag.moved ? P.drag.uid : (P.sel != null && !P.pos[P.sel] ? P.sel : null);
      if (h && uid != null && inZone(h.cx, h.cy)) {
        const def = G.player.units.find(u => u.uid === uid).def;
        c.globalAlpha = 0.6; drawFigure(c, def, PX(h.cx + 0.5), PY(h.cy + 0.5) + 6, 1.2 * (def.size || 1), 1, { t: performance.now() / 1000, walk: 0, moving: false, atk: 0, cast: 0, seed: 1 }); c.globalAlpha = 1;
      }
      if (P.assign != null && G.B) for (const u of G.B.alive[0]) { c.strokeStyle = '#f2c35b'; c.lineWidth = 2; c.setLineDash([4, 4]); ell(c, PX(u.x), PY(u.y) + 6, 24 * u.size, 10 * u.size); c.stroke(); c.setLineDash([]); }
    },
    sel: P.drag && G.B ? G.B.units.find(u => u.ownerUid === P.drag.uid) : null,
  };
}

// ===================== BATTLE =====================
function startBattle() {
  closeModal();
  rebuildPreview(); resetVFX();
  G.mode = 'battle'; G.countdown = 3.4; G.endT = 0; G.endSound = false; G.target = null; G.paused = false; G.acc = 0; G.lastCount = 4;
  $('#placePanel').style.display = 'none'; $('#battlePanel').style.display = '';
  $('#btnPause').textContent = 'Pauze';
  renderAbilityBar(); renderAiAbs(); updateHud();
}
function renderAbilityBar() {
  const T = G.B.teams[0];
  $('#abar').innerHTML = T.abilities.map((a, i) => `<button class="ab" data-ab="${i}" style="--rc:${RAR[a.def.rar].color}" title="${esc(a.def.name)}: ${esc(a.def.desc)}"><kbd>${i + 1}</kbd>${iconSVG(a.def.icon, 34, RAR[a.def.rar].color)}<span class="nm">${esc(a.def.name)}</span><span class="cdv"></span></button>`).join('') || '<span class="empty">Geen abilities gekocht deze ronde. Je units vechten op eigen kracht.</span>';
  updateAbilityBar();
}
function renderAiAbs() {
  const T = G.B.teams[1];
  $('#aiAbs').innerHTML = T.abilities.map((a, i) => `<div class="ai-ab" data-aiab="${i}" title="${esc(a.def.name)}: ${esc(a.def.desc)}">${iconSVG(a.def.icon, 24, RAR[a.def.rar].color)}<span class="cdv"></span></div>`).join('') || '<span class="empty">Geen</span>';
}
function updateAbilityBar() {
  if (!G.B) return;
  const T = G.B.teams[0];
  $$('#abar .ab').forEach((b, i) => {
    const a = T.abilities[i]; const ok = canCast(G.B, T, a) && G.countdown <= 0;
    b.style.setProperty('--cd', a.cd > 0 ? a.cd / a.def.cd : 0);
    b.querySelector('.cdv').textContent = a.cd > 0 ? Math.ceil(a.cd) : '';
    b.classList.toggle('ready', ok); b.classList.toggle('arm', G.target && G.target.i === i);
    b.disabled = !ok && !(G.target && G.target.i === i);
  });
  $$('#aiAbs .ai-ab').forEach((b, i) => { const a = G.B.teams[1].abilities[i]; b.style.setProperty('--cd', a.cd > 0 ? a.cd / a.def.cd : 0); });
}
$('#abar').addEventListener('click', e => { const b = e.target.closest('[data-ab]'); if (b) armAbility(+b.dataset.ab); });
function armAbility(i) {
  SFX.ensure();
  if (!G.B || G.mode !== 'battle' || G.B.over || G.countdown > 0) return;
  const T = G.B.teams[0], a = T.abilities[i]; if (!a) return;
  if (G.target && G.target.i === i) { G.target = null; updateAbilityBar(); return; }
  if (!canCast(G.B, T, a)) { if (a.def.id === 'resurrect' && a.cd <= 0) toast('Er zijn nog geen gevallen units', '#ffe066'); return; }
  if (a.def.target === 'none') { castAbility(G.B, 0, a, { x: 0, y: 0 }); G.target = null; }
  else { G.target = { i, a, stage: a.def.target === 'ally' ? 'ally' : 'point', unit: null }; }
  updateAbilityBar();
}
function battleClick(p) {
  if (!G.target) return;
  const tg = G.target;
  if (p.x < 0 || p.x > AW || p.y < 0 || p.y > AH) return;
  if (tg.stage === 'ally') { const u = unitAt(p, 0); if (u) { tg.unit = u; tg.stage = 'dest'; SFX.click(); } return; }
  if (tg.stage === 'dest') { castAbility(G.B, 0, tg.a, { unit: tg.unit, x: p.x, y: p.y }); G.target = null; updateAbilityBar(); return; }
  castAbility(G.B, 0, tg.a, { x: p.x, y: p.y }); G.target = null; updateAbilityBar();
}
function battleOverlay() {
  return {
    over(c) {
      const tg = G.target, h = G.hover;
      if (tg && h) {
        if (tg.stage === 'point') {
          const r = (tg.a.def.radius || 1) * CELL;
          c.fillStyle = rgba(hex6(tg.a.def.color), 0.16); c.strokeStyle = tg.a.def.color; c.lineWidth = 2.5; c.setLineDash([8, 6]);
          c.beginPath(); c.ellipse(h.px, h.py, r, r * 0.8, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.setLineDash([]);
        } else if (tg.stage === 'ally') {
          for (const u of G.B.alive[0]) { c.strokeStyle = '#c58bff'; c.lineWidth = 2; c.setLineDash([4, 4]); ell(c, PX(u.x), PY(u.y) + 6, 24 * u.size, 10 * u.size); c.stroke(); c.setLineDash([]); }
        } else if (tg.stage === 'dest' && tg.unit) {
          c.strokeStyle = '#c58bff'; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(PX(tg.unit.x), PY(tg.unit.y)); c.lineTo(h.px, h.py); c.stroke(); c.setLineDash([]);
          c.globalAlpha = 0.5; drawFigure(c, tg.unit.def, h.px, h.py + 6, 1.2 * tg.unit.size, 1, { t: 0, walk: 0, moving: false, atk: 0, cast: 0, seed: 1 }); c.globalAlpha = 1;
        }
      }
      if (G.countdown > 0) {
        const n = Math.ceil(G.countdown - 0.4); const txt = n > 0 ? String(n) : 'VECHT!';
        const f = (G.countdown - 0.4) % 1;
        c.fillStyle = 'rgba(5,3,10,.35)'; c.fillRect(0, 0, CW, CH);
        c.save(); c.translate(CW / 2, CH / 2); const s = n > 0 ? 1 + f * 0.6 : 1.2; c.scale(s, s);
        c.font = '700 84px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 8; c.strokeStyle = '#1a0f08'; c.strokeText(txt, 0, 0); c.fillStyle = n > 0 ? '#fff3c9' : '#f2c35b'; c.fillText(txt, 0, 0); c.restore();
      }
      if (G.paused && !G.B.over) { c.fillStyle = 'rgba(5,3,10,.5)'; c.fillRect(0, 0, CW, CH); c.font = '700 54px Cinzel, serif'; c.textAlign = 'center'; c.fillStyle = '#fff3c9'; c.fillText('Pauze', CW / 2, CH / 2); }
      if (G.B.over && G.B.endT > 0.3) {
        const w = G.B.winner; const txt = w === 0 ? 'Overwinning!' : w === 1 ? 'Nederlaag' : 'Gelijkspel';
        c.fillStyle = 'rgba(5,3,10,.4)'; c.fillRect(0, CH / 2 - 60, CW, 120);
        c.font = '700 64px Cinzel, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 8; c.strokeStyle = '#120a06'; c.strokeText(txt, CW / 2, CH / 2);
        c.fillStyle = w === 0 ? '#f2c35b' : w === 1 ? '#ff5a6a' : '#ddd'; c.fillText(txt, CW / 2, CH / 2);
      }
    },
    sel: G.target && G.target.unit,
  };
}
function onCast(e) {
  if (e.type === 'banner') { toast(e.text, e.team === 0 ? '#4fd1ff' : '#ff5a6a'); return; }
  toast(`${e.team === 0 ? 'Jij' : 'AI'}: ${e.name}`, e.team === 0 ? '#4fd1ff' : '#ff5a6a');
  if (e.team === 1) { const el = $(`#aiAbs .ai-ab:nth-child(${G.B.teams[1].abilities.findIndex(a => a.def.id === e.id) + 1})`); if (el && el.animate) el.animate([{ transform: 'scale(1.4)' }, { transform: 'none' }], { duration: 400 }); }
}
function updateHud() {
  const B = G.B; if (!B) return;
  const tot = i => { let h = 0, m = 0, n = 0; for (const u of B.units) if (u.team === i && !u.summon) { m += u.maxHp; if (u.alive) { h += u.hp; n++; } } return { h, m, n }; };
  const p = tot(0), a = tot(1);
  $('#barP').style.width = (p.m ? p.h / p.m * 100 : 0) + '%'; $('#barA').style.width = (a.m ? a.h / a.m * 100 : 0) + '%';
  const un = n => n === 1 ? '1 unit' : n + ' units';
  $('#hpP').textContent = `${un(p.n)} · ${Math.round(p.h)} HP`; $('#hpA').textContent = `${Math.round(a.h)} HP · ${un(a.n)}`;
  if (G.mode === 'battle') {
    const t = Math.floor(B.time);
    $('#midT').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    $('#midS').textContent = B.time > SUDDEN ? 'Arena-storm! Iedereen verliest HP' : `Ronde ${G.round}${G.speed > 1 ? ' · ' + G.speed + '×' : ''}`;
  }
}
$('#btnPause').onclick = () => { if (G.mode !== 'battle') return; G.paused = !G.paused; $('#btnPause').textContent = G.paused ? 'Verder' : 'Pauze'; };
$('#btnSpeed').onclick = () => { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; $('#btnSpeed').textContent = `Snelheid ${G.speed}×`; };

function tickBattle(dt) {
  const B = G.B;
  if (G.paused || G.modalOpen) return;
  if (G.countdown > 0) {
    G.countdown -= dt;
    const n = Math.ceil(G.countdown - 0.4); if (n !== G.lastCount) { G.lastCount = n; n > 0 ? SFX.tick() : SFX.go(); }
    if (G.countdown <= 0) updateAbilityBar();
    return;
  }
  const scale = G.target ? 0.3 : G.speed;
  G.acc += Math.min(dt, 0.1) * scale;
  let steps = 0;
  while (G.acc >= 1 / 60 && steps < 12) { stepBattle(B, 1 / 60); G.acc -= 1 / 60; steps++; consumeFx(B, onCast); }
  for (const u of B.units) if (u.anim.moving) u.anim.walk += dt * scale * 0.8;
  if (B.over) {
    if (G.target) { G.target = null; }
    G.endT += dt;
    if (G.endT > 0.01 && !G.endSound) { G.endSound = true; B.winner === 0 ? SFX.win() : SFX.lose(); }
    if (G.endT > 2.2 && G.mode === 'battle') { G.mode = 'done'; roundEnd(); }
  }
}

// ---------- round end ----------
function roundEnd() {
  const B = G.B, w = B.winner; G.endSound = false;
  if (w >= 0) G.score[w]++;
  const need = Math.ceil(G.bestOf / 2), over = G.score[0] >= need || G.score[1] >= need;
  const rows = i => B.units.filter(u => u.team === i).sort((a, b) => b.stats.dmg + b.stats.heal - a.stats.dmg - a.stats.heal);
  const mvp = i => rows(i)[0];
  G.history.push({ round: G.round, winner: w, timeout: B.timeout, p: G.player.units.map(u => u.def.name), a: G.ai.units.map(u => u.def.name), mvp: mvp(0) && mvp(0).def.name, spent: 20 - G.player.coins });
  renderScore();
  const table = i => { const r = rows(i); const m = r[0]; return `<table class="st-table"><thead><tr><th>Unit</th><th class="n">Damage</th><th class="n">Heal</th><th class="n">Kills</th></tr></thead><tbody>${r.map(u => `<tr class="${u === m ? 'mvp' : ''} ${u.alive ? '' : 'dead'}"><td>${u === m ? '★ ' : ''}${esc(u.def.name)}${u.summon ? ' (opgeroepen)' : ''}</td><td class="n">${Math.round(u.stats.dmg)}</td><td class="n">${Math.round(u.stats.heal)}</td><td class="n">${u.stats.kills}</td></tr>`).join('')}</tbody></table>`; };
  const title = w === 0 ? 'Overwinning!' : w === 1 ? 'Nederlaag' : 'Gelijkspel';
  const sub = (B.timeout ? 'De tijd was op: het team met de meeste HP wint. ' : '') + `Stand: Jij ${G.score[0]} – ${G.score[1]} ${G.pers.name}`;
  openModal(`<div class="res-head"><h2 class="${w === 0 ? 'win' : 'lose'}">${title}</h2><p>${esc(sub)}</p></div>
    <div class="two"><div class="side me"><h2 style="color:var(--p)">Jouw leger</h2>${table(0)}</div><div class="side ai"><h2 style="color:var(--a)">${esc(G.pers.name)}</h2>${table(1)}</div></div>
    <div class="actions">${over ? '<button class="btn gold big" id="toFinal">Bekijk eindresultaat</button>' : '<button class="btn gold big" id="nextRound">Start ronde ' + (G.round + 1) + '</button>'}</div>`, { noClose: true });
  if (over) $('#toFinal').onclick = () => { closeModal(); finalScreen(); }; else $('#nextRound').onclick = () => startRound();
}
function finalScreen() {
  const win = G.score[0] > G.score[1];
  const rec = store.get(RECORD_KEY, { w: 0, l: 0 }); win ? rec.w++ : rec.l++; store.set(RECORD_KEY, rec);
  $('#finalBox').innerHTML = `<div class="final">
    <p style="color:var(--muted);font-weight:800;margin:0">Einde van de match</p>
    <h1 class="${win ? '' : 'lose'}">${win ? 'Jij wint de match!' : esc(G.pers.name) + ' wint'}</h1>
    <p style="font-size:20px;margin:6px 0 0"><b style="color:var(--p)">${G.score[0]}</b> – <b style="color:var(--a)">${G.score[1]}</b></p>
    <div class="hist">${G.history.map(h => `<div><b>Ronde ${h.round}</b><span style="color:var(--muted);font-size:14px">${esc(h.p.filter(n => n !== 'Rekruut').join(', ') || 'Alleen een Rekruut')} · €${h.spent} uitgegeven${h.mvp ? ' · MVP ' + esc(h.mvp) : ''}</span><span class="w ${h.winner === 0 ? 'p' : h.winner === 1 ? 'a' : ''}">${h.winner === 0 ? 'Gewonnen' : h.winner === 1 ? 'Verloren' : 'Gelijk'}</span></div>`).join('')}</div>
    <p style="color:var(--muted)">Totaal: ${rec.w} matches gewonnen, ${rec.l} verloren.</p>
    <div class="row" style="justify-content:center"><button class="btn gold big" id="again">Opnieuw spelen</button><button class="btn ghost" id="menu">Hoofdmenu</button></div></div>`;
  show('scr-final'); G.mode = null;
  $('#again').onclick = () => newMatch();
  $('#menu').onclick = () => toMenu();
}
function toMenu() { G.token++; G.mode = null; G.round = 0; G.A = null; G.player = null; renderScore(); closeModal(); show('scr-title'); renderRecord(); }
function renderRecord() { const r = store.get(RECORD_KEY, { w: 0, l: 0 }); $('#record').textContent = (r.w + r.l ? `Jouw record: ${r.w} gewonnen, ${r.l} verloren` : 'Tip: lees "Hoe werkt het?" voor je eerste veiling.') + ` · v${BUILD.version}${BUILD.env === 'staging' ? ' · staging' : ''}`; }

// ===================== GLOBAL EVENTS & LOOP =====================
function seg(id, key) { $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$(id + ' button').forEach(x => x.classList.toggle('on', x === b)); G[key] = key === 'bestOf' ? +b.dataset.v : b.dataset.v; SFX.ensure(); SFX.click(); }); }
seg('#segLevel', 'level'); seg('#segBo', 'bestOf');
$('#btnStart').onclick = () => { SFX.ensure(); newMatch(); };
$('#btnHow').onclick = howTo;
$('#btnCodex').onclick = () => codex();
$('#btnCodex2').onclick = () => codex();
$('#btnItems').onclick = () => inventory(0);
$('#btnMute').onclick = () => { SFX.setMuted(!SFX.isMuted()); $('#btnMute').textContent = SFX.isMuted() ? 'Stil' : 'Geluid'; $('#btnMute').setAttribute('aria-pressed', String(!SFX.isMuted())); };
$('#logoBtn').onclick = () => {
  if (G.screen === 'scr-title') return;
  openModal(`<h2>Terug naar het menu?</h2><p>De huidige match wordt afgebroken.</p><div class="actions"><button class="btn ghost" data-close>Verder spelen</button><button class="btn red" id="quit">Stoppen</button></div>`);
  $('#quit').onclick = toMenu;
};
$('#bid1').onclick = () => playerBid(0); $('#bid2').onclick = () => playerBid(1); $('#bid5').onclick = () => playerBid(4); $('#bidPass').onclick = playerPass;
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea')) return;
  if (e.key === 'Escape') { if (G.modalOpen && !G.modalNoClose) { closeModal(); return; } if (G.target) { G.target = null; updateAbilityBar(); return; } if (G.place) { G.place.assign = null; G.place.sel = null; if (G.mode === 'place') renderPlaceUI(); } }
  if (G.modalOpen) return;
  if (G.screen === 'scr-draft') {
    if (e.key === '1' || e.key === ' ') { e.preventDefault(); playerBid(0); } else if (e.key === '2') playerBid(1); else if (e.key === '3') playerBid(4); else if (e.key.toLowerCase() === 'p') playerPass();
  } else if (G.mode === 'battle') {
    const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) armAbility(n - 1);
    if (e.key === ' ') { e.preventDefault(); $('#btnPause').click(); }
  }
});

let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  try {
    if (G.screen === 'scr-title') drawHero(t);
    else if (G.screen === 'scr-draft') tickDraft(dt);
    else if (G.screen === 'scr-arena' && G.B) {
      if (G.mode === 'battle' || G.mode === 'done') tickBattle(dt);
      else if (G.mode === 'place') for (const u of G.B.units) u.anim.walk = 0;
      updateVFX(dt * (G.target ? 0.3 : 1));
      drawScene(cx2, G.B, t, G.mode === 'place' ? placementOverlay() : battleOverlay());
      hudT -= dt; if (hudT <= 0) { hudT = 0.1; updateHud(); if (G.mode === 'battle') updateAbilityBar(); }
    }
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
function boot() {
  if (BUILD.home) { const a = document.createElement('a'); a.className = 'home-link'; a.href = BUILD.home; a.textContent = '← Bas Games'; $('.top').prepend(a); }
  renderRecord();
  requestAnimationFrame(frame);
}
