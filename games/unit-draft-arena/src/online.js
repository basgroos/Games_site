// ===================== ONLINE MATCH FLOW =====================
// Host (side 0) keeps the real G.player / G.ai (= guest) and runs everything; the guest mirrors the host's
// state into its own G.* from its own point of view (own army = side 0, on the left).
const NAME_KEY = 'unit-draft-arena-name';
const ON = { kinds: ['unit', 'buff', 'ability'], pk: ['arrow', 'bolt', 'fire', 'holy', 'shadow', 'frost', 'arcane', 'breath', 'note', 'healorb'], zk: ['poison', 'arrows', 'hole'] };
const itemDef = (kind, id) => kind === 'unit' ? UNIT[id] : kind === 'buff' ? BUFF[id] : kind === 'ability' ? ABILITY[id] : null;
const isGuest = () => !!(G.net && !G.net.host);
function oppLabel() { return G.net ? G.pers.name : 'AI'; }

// ---------- lobby ----------
function onlineLobby() {
  SFX.ensure();
  const name = store.get(NAME_KEY, '') || ('Speler' + (100 + Math.floor(Math.random() * 900)));
  openModal(`<h2>Online spelen</h2>
    <p class="lede2">Speel een best of 3 tegen een echte tegenstander: dezelfde veiling, ieder zijn eigen €20, en een gevecht waarin jullie allebei spreuken gebruiken.</p>
    <div class="on-grid">
      <label class="fld">Jouw naam<input id="onName" maxlength="16" value="${esc(name)}" autocomplete="nickname"></label>
      <p class="on-status" id="onStatus">Verbinden met de lobby…</p>
    </div>
    <div class="on-opts" id="onOpts">
      <div class="on-opt"><b>Snel spel</b><span>Speel tegen de eerste die ook zoekt.</span><button class="btn gold" id="onQuick" disabled>Zoek een tegenstander</button></div>
      <div class="on-opt"><b>Met een vriend</b><span>Maak een kamer en geef de code door.</span><button class="btn" id="onMake" disabled>Maak een privé-kamer</button></div>
      <div class="on-opt"><b>Code gekregen?</b><span>Vul de code van je vriend in.</span><div class="code-row"><input id="onCode" maxlength="5" placeholder="CODE" autocomplete="off" spellcheck="false"><button class="btn" id="onJoin" disabled>Doe mee</button></div></div>
    </div>
    <div id="onSearch"></div>`);
  const status = $('#onStatus');
  Net.init().then(mode => {
    if (!$('#onStatus')) return;
    if (mode === 'offline' || mode === 'none') { status.textContent = mode === 'offline' ? 'Online is nu niet bereikbaar. Controleer je internet en probeer het later opnieuw.' : 'Deze browser kan geen realtime verbinding maken.'; return; }
    ['#onQuick', '#onMake', '#onJoin'].forEach(s => { $(s).disabled = false; });
    const upd = () => { const s = $('#onStatus'); if (!s) return; const n = Math.max(1, Net.online); s.textContent = (mode === 'tabs' ? 'Testmodus (zonder server): open de game in een tweede tabblad om tegen jezelf te spelen. ' : 'Verbonden. ') + (n === 1 ? 'Jij bent nu de enige in de lobby.' : `${n} spelers in de lobby.`); };
    G.lobbyUnsub && G.lobbyUnsub(); G.lobbyUnsub = Net.watch(upd); upd();
  });
  const go = code => {
    const nm = cleanName($('#onName').value); $('#onName').value = nm; store.set(NAME_KEY, nm);
    $('#onOpts').style.display = 'none';
    $('#onSearch').innerHTML = `<div class="on-wait"><div class="spin"></div><div>${code ? `<p>Je privé-kamer:</p><div class="code-big">${esc(code)}</div><p>Geef deze code aan je vriend. Wachten tot die meedoet…</p>` : '<p>Op zoek naar een tegenstander…</p>'}</div><button class="btn ghost" id="onCancel">Annuleren</button></div>`;
    $('#onCancel').onclick = () => { Net.cancel(); onlineLobby(); };
    Net.seek({ name: nm }, matchFound, code);
  };
  $('#onQuick').onclick = () => go(null);
  $('#onMake').onclick = () => go(Net.makeCode());
  $('#onJoin').onclick = () => { const c = $('#onCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 5) { $('#onCode').focus(); toastModal('Een code heeft 5 tekens'); return; } go(c); };
  $('#onCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('#onJoin').click(); });
}
function toastModal(t) { const s = $('#onStatus'); if (s) { s.textContent = t; s.classList.add('warn'); } }
function matchFound(sess) {
  G.lobbyUnsub && G.lobbyUnsub(); G.lobbyUnsub = null;
  const box = $('#onSearch');
  if (box) box.innerHTML = `<div class="on-wait"><div><p>Tegenstander gevonden:</p><div class="code-big">${esc(sess.oppName)}</div><p>De match begint…</p></div></div>`;
  SFX.go();
  setTimeout(() => startOnline(sess), 900);
}

// ---------- match start / end ----------
function startOnline(sess) {
  G.net = sess; G.level = 'normal'; G.bestOf = 3; G.speed = 1; G.paused = false;
  Object.assign(sess, { ph: null, dirty: true, pubT: 0, fxLog: [], fxSeq: 0, fxSeen: 0, seen: '', readyL: false, readyR: false, remote: null, nextL: false, nextR: false });
  G.pers = { name: sess.oppName, style: 'Online', desc: 'Een echte tegenstander.', avatar: 'knight' };
  sess.onCmd = hostCmd; sess.onLeft = netLost;
  sess.onState = st => guestState(st);
  document.body.classList.add('online');
  G.token++; G.round = 0; G.score = [0, 0]; G.history = []; G.mode = null;
  closeModal();
  if (sess.host) startRound();
  else {
    show('scr-draft'); $('#lotCard').innerHTML = ''; $('#lotStrip').innerHTML = '';
    openModal(`<div class="on-wait"><div class="spin"></div><div><p>Verbinden met <b>${esc(sess.oppName)}</b>…</p></div></div>`, { noClose: true });
    if (sess.pending) { const p = sess.pending; sess.pending = null; guestState(p); }
  }
}
function leaveOnline() {
  if (!G.net) return;
  G.net.leave(); G.net = null; document.body.classList.remove('online');
}
function netLost() {
  if (!G.net || G.net.lostShown || G.screen === 'scr-final') return;
  G.net.lostShown = true;
  const name = G.pers.name;
  G.token++; G.A = null; G.mode = null;
  openModal(`<h2>Verbinding verbroken</h2><p>${esc(name)} is niet meer verbonden. De match is gestopt.</p><div class="actions"><button class="btn gold" id="lostMenu">Naar het menu</button></div>`, { noClose: true });
  $('#lostMenu').onclick = () => toMenu();
}
function netStep(dt) {
  const n = G.net; if (!n) return;
  if (!n.lostShown && G.screen !== 'scr-final' && Date.now() - n.lastSeen > 25000) netLost();
  if (!n.host) return;
  n.pubT += dt;
  const every = n.ph === 'battle' ? 0.1 : 0.5;
  if ((n.dirty && n.pubT >= 0.08) || n.pubT >= every) { n.pubT = 0; n.dirty = false; n.publish(hostState()); }
}
const netDirty = () => { if (G.net && G.net.host) G.net.dirty = true; };

// ---------- serialisation ----------
function serOwner(o) { return { c: o.coins, u: o.units.map(x => [x.uid, x.def.id, x.price]), b: o.buffs.map(x => [x.uid, x.def.id, x.price, x.target ?? null]), a: o.abilities.map(x => [x.uid, x.def.id, x.price]) }; }
function parseOwner(s) {
  const L = (arr, kind) => (Array.isArray(arr) ? arr : []).map(r => ({ uid: r[0] | 0, def: itemDef(kind, r[1]), price: r[2] | 0, target: kind === 'buff' ? (r[3] ?? null) : undefined })).filter(x => x.def);
  return { coins: s ? s.c | 0 : 0, units: L(s && s.u, 'unit'), buffs: L(s && s.b, 'buff'), abilities: L(s && s.a, 'ability') };
}
const r2 = v => Math.round(v * 100);
function unitFlags(u) {
  const s = u.st; let f = 0;
  if (u.alive) f |= 1; if (u.pending) f |= 2; if (u.raised) f |= 4; if (u.summon) f |= 8; if (u.anim.moving) f |= 16;
  if (s.freeze > 0) f |= 32; if (s.stun > 0) f |= 64; if (s.inv > 0) f |= 128; if (s.burn > 0) f |= 256; if (s.poison > 0) f |= 512;
  if (s.rage > 0) f |= 1024; if (s.blood > 0) f |= 2048; if (s.warp > 0 || s.slow > 0) f |= 4096; if (s.curse > 0) f |= 8192; if (u.anim.flash > 0) f |= 16384;
  return f;
}
function snap(B) {
  return {
    tm: +B.time.toFixed(2), ov: B.over ? 1 : 0, w: B.over ? B.winner : null, sh: +B.shake.toFixed(2), to: B.timeout ? 1 : 0, cd: +Math.max(0, G.countdown).toFixed(2),
    u: B.units.map(u => [u.uid, u.def.id, u.team, r2(u.x), r2(u.y), Math.max(0, Math.round(u.hp)), u.maxHp, r2(u.size), u.anim.face, unitFlags(u), Math.round(u.st.shield || 0), Math.round((u.lifeT || 0) * 10), Math.round(u.stats.dmg), Math.round(u.stats.heal), u.stats.kills, r2(u.anim.atk), r2(u.anim.cast), Math.round(u.anim.deathT * 10)]),
    p: B.proj.map(p => [r2(p.x), r2(p.y), r2(p.ang || 0), ON.pk.indexOf(p.kind), p.big ? 1 : 0]),
    z: B.zones.map(z => [ON.zk.indexOf(z.kind), r2(z.x), r2(z.y), r2(z.r), r2(z.t), r2(z.dur)]),
    ab: B.teams.map(T => T.abilities.map(a => [a.def.id, +a.cd.toFixed(1)])),
    fl: B.teams.map(T => T.fallen.filter(f => !f.pending).length),
  };
}
function logFx(B) {
  const n = G.net, now = performance.now();
  for (const e of B.fx) {
    const o = {}; for (const k in e) if (k !== 'def') o[k] = typeof e[k] === 'number' ? Math.round(e[k] * 100) / 100 : e[k];
    n.fxLog.push([++n.fxSeq, now, o]);
  }
  while (n.fxLog.length && (n.fxLog.length > 120 || now - n.fxLog[0][1] > 900)) n.fxLog.shift();
}
function hostState() {
  const n = G.net;
  const st = { ph: n.ph, round: G.round, sc: G.score.slice(), own: [serOwner(G.player), serOwner(G.ai)] };
  if (n.ph === 'draft' && G.A) {
    const A = G.A;
    st.d = { n: G.lots.length, idx: G.lotIdx, lots: G.lots.slice(0, G.lotIdx + 1).map(l => [ON.kinds.indexOf(l.kind), l.def.id, l.winner, l.price]), price: A.price, lead: A.leader, t: +Math.max(0, A.timer).toFixed(2), max: A.max, pass: [A.pPassed ? 1 : 0, A.aiOut ? 1 : 0], closed: A.closed ? 1 : 0 };
  }
  if (n.ph === 'place') st.ready = [n.readyL ? 1 : 0, n.readyR ? 1 : 0];
  if ((n.ph === 'battle' || n.ph === 'result') && G.B) { st.b = snap(G.B); st.fx = n.fxLog.map(x => [x[0], x[2]]); }
  if (n.ph === 'result') st.res = { next: [n.nextL ? 1 : 0, n.nextR ? 1 : 0], over: n.matchOver ? 1 : 0 };
  return st;
}

// ---------- host: commands from the guest ----------
function hostCmd(c) {
  const n = G.net; if (!n || !n.host) return;
  if (c.t === 'bid' || c.t === 'pass') {
    const A = G.A; if (n.ph !== 'draft' || !A || A.closed || (c.i | 0) !== G.lotIdx) return;
    if (c.t === 'bid') {
      const need = A.leader === null ? A.lot.start : A.price + 1;
      if (A.leader === 1 || (c.a | 0) !== need || need > G.ai.coins) return;
      A.aiOut = false; placeBid(1, need);
    } else {
      if (A.aiOut || A.leader === 1) return;
      A.aiOut = true; feed(1, oppLabel() + ' past'); bubble(1, 'Past'); SFX.pass();
      if (A.leader === 0) A.timer = Math.min(A.timer, 2.3);
      else if (A.leader === null && A.pPassed) A.timer = Math.min(A.timer, 0.6);
      updateAuctionUI(); netDirty();
    }
  } else if (c.t === 'place') {
    if (n.ph !== 'place' || n.readyR) return;
    const pos = {}, used = new Set();
    for (const r of Array.isArray(c.pos) ? c.pos : []) {
      const uid = r[0] | 0, cx = r[1] | 0, cy = r[2] | 0;
      if (!G.ai.units.some(u => u.uid === uid) || cx < ZONE[0][0] || cx > ZONE[0][1] || cy < 0 || cy >= AH || used.has(cx + ',' + cy)) continue;
      used.add(cx + ',' + cy); pos[uid] = { cx: AW - 1 - cx, cy }; // mirror the guest's left side onto the right
    }
    // units the guest did not place (old message, or bought after it was sent) go to their auto spot or the nearest free cell
    const taken = c2 => Object.values(pos).some(p => p.cx === c2.cx && p.cy === c2.cy);
    const auto = autoPlace(G.ai.units.map(u => u.def), 1);
    G.ai.units.forEach((u, i) => {
      if (pos[u.uid]) return;
      let spot = auto[i] && !taken(auto[i]) ? auto[i] : null;
      for (let cx = ZONE[1][0]; !spot && cx <= ZONE[1][1]; cx++) for (const cy of [2, 3, 1, 4, 0, 5]) if (!taken({ cx, cy })) { spot = { cx, cy }; break; }
      if (spot) pos[u.uid] = spot;
    });
    for (const r of Array.isArray(c.bt) ? c.bt : []) { const b = G.ai.buffs.find(x => x.uid === (r[0] | 0) && x.def.target === 'unit'); if (b && G.ai.units.some(u => u.uid === (r[1] | 0))) b.target = r[1] | 0; }
    n.remote = pos; n.readyR = true; netDirty();
    if (G.mode === 'place') renderPlaceUI();
    hostCheckBattle();
  } else if (c.t === 'cast') {
    if (n.ph !== 'battle' || !G.B || G.B.over || G.countdown > 0) return;
    const ab = G.B.teams[1].abilities[c.k | 0]; if (!ab) return;
    const x = clamp(AW - (+c.x || 0), 0, AW), y = clamp(+c.y || 0, 0, AH);
    const unit = c.u ? G.B.units.find(u => u.uid === (c.u | 0) && u.team === 1 && u.alive) : null;
    if (ab.def.target === 'ally' && !unit) return;
    castAbility(G.B, 1, ab, { x, y, unit }); netDirty();
  } else if (c.t === 'next') {
    if (n.ph !== 'result' || (c.r | 0) !== G.round) return;
    n.nextR = true; netDirty(); updateNextInfo(); hostCheckNext();
  }
}
function hostCheckBattle() { const n = G.net; if (n && n.host && n.ph === 'place' && n.readyL && n.readyR) startBattle(); }
function hostCheckNext() { const n = G.net; if (n && n.host && n.ph === 'result' && n.nextL && n.nextR && !n.matchOver) startRound(); }

// ---------- local player actions (both sides) ----------
function onlineReady() {
  const P = G.place; if (!P || P.locked) return;
  if (!G.player.units.every(u => P.pos[u.uid])) return;
  P.locked = true; P.sel = null; P.assign = null; SFX.click();
  if (G.net.host) { G.net.readyL = true; netDirty(); hostCheckBattle(); }
  else G.net.send({ t: 'place', pos: G.player.units.map(u => [u.uid, P.pos[u.uid].cx, P.pos[u.uid].cy]), bt: G.player.buffs.filter(b => b.def.target === 'unit' && b.target != null).map(b => [b.uid, b.target]) });
  if (G.mode === 'place') renderPlaceUI();
}
function onlineNext() {
  const btn = $('#nextRound'); if (btn) { btn.disabled = true; btn.textContent = 'Wachten op ' + G.pers.name + '…'; }
  if (G.net.host) { G.net.nextL = true; netDirty(); hostCheckNext(); } else G.net.send({ t: 'next', r: G.round });
  G.net.iAmNext = true; updateNextInfo();
}
function updateNextInfo() {
  const el = $('#nextInfo'); if (!el || !G.net) return;
  const opp = G.net.host ? G.net.nextR : G.net.oppNext;
  el.textContent = opp ? `${G.pers.name} is klaar voor de volgende ronde.` : `${G.pers.name} bekijkt de uitslag nog.`;
}

// ---------- guest: apply the host's state ----------
function guestState(st) {
  const n = G.net; if (!n || n.host || n.lostShown) return;
  const me = n.side;
  if (Array.isArray(st.sc)) G.score = [st.sc[me] | 0, st.sc[1 - me] | 0];
  if (st.ph === 'draft' && st.d) guestDraft(st);
  else if (st.ph === 'place') {
    if (n.seen !== 'place' + st.round) {
      n.seen = 'place' + st.round; G.round = st.round | 0; G.A = null;
      G.player = parseOwner(st.own[me]); G.ai = parseOwner(st.own[1 - me]);
      if (G.screen !== 'scr-draft') show('scr-draft');
      renderSides(); showDraftSummary();
    }
    n.oppReady = !!(st.ready && st.ready[1 - me]);
    if (G.mode === 'place') renderPlaceUI();
  } else if ((st.ph === 'battle' || st.ph === 'result') && st.b) {
    guestBattle(st);
    if (st.ph === 'result') guestResult(st);
  }
  renderScore();
}
function guestDraft(st) {
  const n = G.net, me = n.side, d = st.d;
  if (G.round !== st.round || G.screen !== 'scr-draft' || n.seen !== 'draft' + st.round) {
    n.seen = 'draft' + st.round; G.round = st.round | 0; G.token++; closeModal(); G.mode = null; G.B = null;
    show('scr-draft'); G.lotIdx = -1; G.A = null; $('#bidFeed').innerHTML = '';
    n.iAmNext = false; n.oppNext = false;
  }
  G.player = parseOwner(st.own[me]); G.ai = parseOwner(st.own[1 - me]);
  const side = w => w === null || w === undefined ? null : w < 0 ? -1 : (w === me ? 0 : 1);
  G.lots = Array.from({ length: d.n | 0 }, (_, i) => {
    const r = d.lots[i]; if (!r) return { kind: null, def: null, winner: null, price: 0, start: 1 };
    const kind = ON.kinds[r[0]]; return { kind, def: itemDef(kind, r[1]), winner: side(r[2]), price: r[3] | 0, start: 1 };
  });
  const newLot = d.idx !== G.lotIdx; G.lotIdx = d.idx | 0;
  const prev = newLot ? null : G.A;
  const lot = G.lots[G.lotIdx]; if (!lot || !lot.def) return;
  G.A = { lot, price: d.price | 0, leader: side(d.lead), timer: +d.t || 0, max: +d.max || 9, pPassed: !!d.pass[me], aiOut: !!d.pass[1 - me], closed: !!d.closed, lastTick: prev ? prev.lastTick : 99, aiAt: null };
  const A = G.A;
  if (newLot) {
    $('#lotCard').innerHTML = cardHTML(lot.kind, lot.def, { cls: 'enter' });
    $('#stamp').className = 'stamp'; $('#stamp').innerHTML = ''; $('#bidFeed').innerHTML = '';
  } else if (prev) {
    if (A.leader !== null && A.leader >= 0 && (A.price !== prev.price || A.leader !== prev.leader)) bidFx(A.leader, A.price);
    if (!prev.aiOut && A.aiOut) { feed(1, oppLabel() + ' past'); bubble(1, 'Past'); SFX.pass(); }
    if (!prev.pPassed && A.pPassed) { feed(0, 'Jij past'); }
    if (!prev.closed && A.closed) { lot.winner = A.leader === null ? -1 : A.leader; soldFx(A, lot); }
  }
  renderStrip(); renderSides(); updateAuctionUI();
}

// ---------- guest: battle view built from snapshots ----------
function newViewBattle() {
  return { view: true, time: 0, over: false, winner: null, shake: 0, endT: 0, timeout: false, units: [], map: new Map(), alive: [[], []], proj: [], zones: [], fx: [], teams: [{ idx: 0, abilities: [], fallen: [] }, { idx: 1, abilities: [], fallen: [] }] };
}
function applySnap(VB, s) {
  const me = G.net.side, mir = x => AW - x, tm = t => t === me ? 0 : 1;
  VB.time = +s.tm || 0; VB.over = !!s.ov; VB.timeout = !!s.to;
  VB.winner = s.w === null || s.w === undefined ? null : s.w < 0 ? -1 : tm(s.w);
  VB.shake = Math.max(VB.shake, +s.sh || 0);
  for (const a of s.u || []) {
    const [uid, id, team, x, y, hp, maxHp, size, face, F, shield, lifeT, dmg, heal, kills, atk, cast, deathT] = a;
    const def = UNIT[id]; if (!def) continue;
    let u = VB.map.get(uid);
    if (!u) {
      u = { uid, def, team: tm(team), x: mir(x / 100), y: y / 100, size: size / 100, hp, maxHp, dispHp: hp, lagHp: hp, st: freshStatus(), stats: { dmg: 0, heal: 0, kills: 0 },
        anim: { walk: Math.random() * 6, moving: false, atk: 0, cast: 0, spawn: 0, flash: 0, face: 1, deathT: 0 },
        dmg: def.dmg, heal: def.heal || 0, as: def.as, rng: def.rng, crit: def.crit || 0, ls: def.ls || 0 };
      VB.map.set(uid, u); VB.units.push(u);
    }
    u.tx = mir(x / 100); u.ty = y / 100;
    if (Math.hypot(u.tx - u.x, u.ty - u.y) > 1.6) { u.x = u.tx; u.y = u.ty; }
    u.hp = hp; u.maxHp = maxHp; u.size = size / 100; u.anim.face = -face;
    const wasAlive = u.alive;
    u.alive = !!(F & 1); u.pending = !!(F & 2); u.raised = !!(F & 4); u.summon = !!(F & 8); u.anim.moving = !!(F & 16);
    if (u.alive && wasAlive === false) u.anim.spawn = 1;
    const S = u.st;
    S.freeze = F & 32 ? 1 : 0; S.stun = F & 64 ? 1 : 0; S.inv = F & 128 ? 1 : 0; S.burn = F & 256 ? 1 : 0; S.poison = F & 512 ? 1 : 0;
    S.rage = F & 1024 ? 1 : 0; S.blood = F & 2048 ? 1 : 0; S.warp = F & 4096 ? 1 : 0; S.slow = 0; S.curse = F & 8192 ? 1 : 0; S.shield = shield;
    if (F & 16384) u.anim.flash = 0.14;
    u.lifeT = lifeT / 10; u.stats = { dmg, heal, kills };
    u.anim.atk = Math.max(u.anim.atk, atk / 100); u.anim.cast = Math.max(u.anim.cast, cast / 100);
    if (!u.alive) u.anim.deathT = Math.max(u.anim.deathT, deathT / 10);
  }
  VB.proj = (s.p || []).map(([x, y, ang, k, big]) => ({ x: mir(x / 100), y: y / 100, ang: Math.PI - ang / 100, kind: ON.pk[k] || 'arrow', big: !!big }));
  VB.zones = (s.z || []).map(([k, x, y, r, t, dur]) => ({ kind: ON.zk[k], x: mir(x / 100), y: y / 100, r: r / 100, t: t / 100, dur: dur / 100 }));
  [0, 1].forEach(t => {
    const src = tm(t) === 0 ? me : 1 - me; // my perspective: team 0 = me
    const T = VB.teams[tm(t)];
    const list = (s.ab && s.ab[t]) || [];
    if (T.abilities.length !== list.length) T.abilities = list.map(([id]) => ({ def: ABILITY[id], cd: 0 })).filter(x => x.def);
    list.forEach(([, cd], i) => { if (T.abilities[i]) T.abilities[i].cd = +cd || 0; });
    T.fallen = Array.from({ length: (s.fl && s.fl[t]) | 0 }, () => ({ pending: false }));
    void src;
  });
  VB.alive = [VB.units.filter(u => u.alive && u.team === 0), VB.units.filter(u => u.alive && u.team === 1)];
}
function guestFx(VB, list) {
  const n = G.net, me = n.side;
  for (const [seq, e0] of list || []) {
    if (seq <= n.fxSeen) continue; n.fxSeen = seq;
    const e = Object.assign({}, e0);
    if (e.x != null) e.x = AW - e.x;
    if (e.face != null) e.face = -e.face;
    if (e.team != null) e.team = e.team === me ? 0 : 1;
    if (Array.isArray(e.pts)) e.pts = e.pts.map(p => ({ x: AW - p.x, y: p.y }));
    VB.fx.push(e);
  }
  consumeFx(VB, onCast);
}
function guestBattle(st) {
  const n = G.net;
  if (n.seen !== 'battle' + st.round && n.seen !== 'res' + st.round) {
    n.seen = 'battle' + st.round; G.round = st.round | 0;
    closeModal(); show('scr-arena'); resetVFX();
    $('#placePanel').style.display = 'none'; $('#battlePanel').style.display = '';
    G.B = newViewBattle(); G.mode = 'battle'; G.target = null; G.endSound = false; G.lastCount = 4;
    n.fxSeen = Math.max(0, ...(st.fx || []).map(x => x[0]));
    applySnap(G.B, st.b);
    G.countdown = +st.b.cd || 0;
    renderAbilityBar(); renderAiAbs(); updateHud();
    return;
  }
  if (!G.B || !G.B.view) return;
  applySnap(G.B, st.b);
  if (G.countdown > 0 || +st.b.cd > 0) G.countdown = +st.b.cd || 0;
  guestFx(G.B, st.fx);
}
function guestTick(dt) {
  const B = G.B; if (!B) return;
  if (G.countdown > 0) {
    G.countdown = Math.max(0, G.countdown - dt);
    const nn = Math.ceil(G.countdown - 0.4); if (nn !== G.lastCount) { G.lastCount = nn; nn > 0 ? SFX.tick() : SFX.go(); }
  }
  const k = Math.min(1, dt * 12);
  for (const u of B.units) {
    if (u.tx != null) { u.x += (u.tx - u.x) * k; u.y += (u.ty - u.y) * k; }
    if (u.anim.moving) u.anim.walk += dt * 0.8;
    u.anim.atk = Math.max(0, u.anim.atk - dt * 4); u.anim.cast = Math.max(0, u.anim.cast - dt);
    u.anim.flash = Math.max(0, u.anim.flash - dt); u.anim.spawn = Math.max(0, u.anim.spawn - dt * 2);
    if (!u.alive) u.anim.deathT += dt;
  }
  for (const p of B.proj) { /* projectiles are redrawn from each snapshot */ }
  B.shake = Math.max(0, B.shake - dt * 1.5);
  if (B.over) {
    if (G.target) G.target = null;
    B.endT += dt;
    if (!G.endSound) { G.endSound = true; B.winner === 0 ? SFX.win() : SFX.lose(); }
  }
}
function guestResult(st) {
  const n = G.net;
  n.oppNext = !!(st.res && st.res.next[1 - n.side]);
  if (n.seen === 'res' + st.round) { updateNextInfo(); return; }
  n.seen = 'res' + st.round; G.mode = 'done';
  const B = G.B, w = B.winner;
  G.history.push({ round: G.round, winner: w, timeout: B.timeout, p: G.player.units.map(u => u.def.name), a: G.ai.units.map(u => u.def.name), mvp: mvpOf(B, 0), spent: 20 - G.player.coins });
  renderScore();
  showResult(B, w, !!(st.res && st.res.over));
  updateNextInfo();
}
function doCast(i, target) {
  if (isGuest()) {
    const a = G.B.teams[0].abilities[i]; if (!a) return;
    G.net.send({ t: 'cast', k: i, x: +(AW - (target.x || 0)).toFixed(2), y: +(target.y || 0).toFixed(2), u: target.unit ? target.unit.uid : 0 });
    a.cd = a.def.cd; // optimistic: the next snapshot brings the real cooldown
    SFX.cast();
  } else { castAbility(G.B, 0, G.B.teams[0].abilities[i], target); netDirty(); }
}
