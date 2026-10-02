/* =====================================================================
   Samen spelen: kamers, Race (tegen elkaar) en Co-op (samen één veld).
   - Kamer = Supabase Realtime-kanaal per uitnodiging.
   - Race: ieder speelt dezelfde map met dezelfde golven; de stand gaat live
     heen en weer en je kunt vijanden naar de ander sturen.
   - Co-op: de uitnodiger (host) rekent het spel uit; de gast stuurt acties
     en krijgt ongeveer 6× per seconde de stand terug.
   ===================================================================== */
Object.assign(MP, {
  ch: null, kind: null, role: null, opp: null, inv: null, started: false, present: new Set(), pending: null, lastMsg: 0,
  send(event, payload) { if (this.ch) this.ch.send({ type: 'broadcast', event, payload }); },
  /* ---------- wachten op antwoord ---------- */
  waitForAnswer(inv) {
    this.pending = inv;
    const box = document.createElement('div'); box.className = 'overlay mp-wait'; box.id = 'mp-wait';
    box.innerHTML = `<div class="panel modal-card mp-dialog" style="width:min(460px,100%);text-align:center"><span class="kicker">${KIND_LABEL[inv.kind]}</span><h2 style="font-size:24px">Wachten op ${esc(inv.toName)}…</h2>
      <p class="muted">${esc(mapLabel(inv.map))} · ${esc((DIFFS[inv.diff] || {}).name || '')}. De uitnodiging blijft 15 minuten geldig.</p><div class="mp-spin" aria-hidden="true"></div>
      <button class="btn" data-act="mp-cancel-wait">Annuleren</button></div>`;
    $('#overlay-root').innerHTML = ''; $('#overlay-root').appendChild(box);
    clearInterval(this.waitPoll);
    this.waitPoll = setInterval(async () => {
      if (!this.pending) return clearInterval(this.waitPoll);
      const d = await SOC.refresh(); const s = d && (d.sent || []).find(x => x.id === this.pending.id);
      if (s && s.status === 'accepted') this.onInviteAnswer({ kind: 'accept', from: this.pending.to, name: this.pending.toName, data: { id: this.pending.id } });
      if (s && s.status === 'declined') this.onInviteAnswer({ kind: 'decline', from: this.pending.to, name: this.pending.toName, data: { id: this.pending.id } });
    }, 5000);
  },
  onInviteAnswer(p) {
    const P = this.pending; if (!P || !p.data || p.data.id !== P.id) return;
    clearInterval(this.waitPoll); this.pending = null;
    if (p.kind === 'accept') this.join(P, 'host', { id: P.to, name: P.toName });
    else { const w = document.getElementById('mp-wait'); if (w) w.remove(); toast(`${p.name || P.toName} heeft de uitnodiging geweigerd.`, 'bad'); }
  },
  /* ---------- kamer ---------- */
  async join(inv, role, opp) {
    await this.leave();
    if (App.game && !App.game.over) { App.game.quit(); }
    if (App.game) exitGame('friends');
    this.inv = inv; this.kind = inv.kind; this.role = role; this.opp = opp; this.started = false; this.present = new Set(); this.lastMsg = Date.now();
    this.overlay(`Verbinden met ${esc(opp.name)}…`, 'Even geduld, jullie komen in dezelfde kamer.');
    try {
      const rt = await SOC.rtClient(), me = playerId();
      const ch = rt.channel('bg-room-' + inv.id, { config: { presence: { key: me }, broadcast: { self: false, ack: false } } });
      ch.on('presence', { event: 'sync' }, () => { this.present = new Set(Object.keys(ch.presenceState())); this.onPresence(); });
      for (const ev of ['start', 'st', 'atk', 'end', 'snap', 'cmd', 'msg', 'bye']) ch.on('broadcast', { event: ev }, ({ payload }) => { this.lastMsg = Date.now(); this.onMsg(ev, payload || {}); });
      ch.subscribe(st => { if (st === 'SUBSCRIBED') ch.track({ name: playerName(), role }); });
      this.ch = ch;
      clearTimeout(this.joinTO); this.joinTO = setTimeout(() => { if (!this.started) { toast(`${opp.name} is niet in de kamer gekomen.`, 'bad'); this.leave(); closeOverlay(); } }, 60000);
    } catch (e) { toast('Verbinden lukte niet: ' + e.message, 'bad'); this.leave(); closeOverlay(); }
  },
  overlay(title, sub, extra) {
    $('#overlay-root').innerHTML = `<div class="overlay" role="dialog" aria-modal="true"><div class="panel modal-card mp-dialog" style="width:min(460px,100%);text-align:center">
      <span class="kicker">${KIND_LABEL[this.kind] || ''} · ${esc(this.opp ? this.opp.name : '')}</span><h2 style="font-size:26px" id="mp-ov-title">${title}</h2><p class="muted" id="mp-ov-sub">${sub || ''}</p>${extra || '<div class="mp-spin" aria-hidden="true"></div>'}
      <button class="btn" data-act="mp-leave">Stoppen</button></div></div>`;
  },
  onPresence() {
    const both = this.opp && this.present.has(this.opp.id) && this.present.has(playerId());
    if (!this.started && both && this.role === 'host') {
      const p = { kind: this.kind, map: this.inv.map, diff: this.inv.diff, seed: this.inv.seed, host: playerName(), guest: this.opp.name };
      this.send('start', p); this.begin(p);
    }
    if (this.started && this.opp && !this.present.has(this.opp.id)) this.oppLeft();
    if (this.started && this.opp && this.present.has(this.opp.id) && this.goneT) { clearTimeout(this.goneT); this.goneT = null; const g = App.game; if (g && !g.over) g.banner(`${this.opp.name} is terug`, '', '#3ddc97'); }
  },
  begin(p) {
    if (this.started) return; this.started = true; clearTimeout(this.joinTO);
    let n = 3;
    const tick = () => {
      if (!this.ch) return;
      if (n > 0) { this.overlay(`${n}`, p.kind === 'race' ? `Race tegen ${esc(this.opp.name)} op ${esc(mapLabel(p.map))}` : `Co-op met ${esc(this.opp.name)} op ${esc(mapLabel(p.map))}`, '<div class="mp-count"></div>'); Sfx.play('click'); n--; setTimeout(tick, 900); return; }
      closeOverlay(); Sfx.play('wave');
      startMatch({ map: p.map, diffIdx: p.diff, mode: p.kind === 'race' ? 'race' : 'coop2', back: 'friends', mp: { kind: p.kind, role: this.role, opp: this.opp, seed: p.seed } });
    };
    tick();
  },
  oppLeft() {
    if (this.goneT) return; const g = App.game;
    if (g && !g.over) g.banner(`${this.opp.name} is weg`, 'Even wachten op de verbinding…', '#f59e0b');
    this.goneT = setTimeout(() => { this.goneT = null; const g2 = App.game; if (!g2 || g2.over || !g2.mp) return; if (g2.mode === 'race') { g2.mpWinWhy = 'forfeit'; g2.win(); } else if (this.role === 'host') { g2.banner(`${this.opp.name} heeft het spel verlaten`, 'Zijn helden blijven staan; jij speelt verder.', '#f59e0b'); for (const h of g2.heroes) if (h.owner === 1) h.owner = 0; g2.mpSolo = true; } else { g2.mpQuit = true; g2.quit(); } }, 20000);
  },
  async leave() {
    clearTimeout(this.joinTO); clearInterval(this.waitPoll); clearTimeout(this.goneT); this.goneT = null;
    if (this.ch) { try { this.send('bye', {}); await this.ch.untrack(); SOC.rt && SOC.rt.removeChannel(this.ch); } catch (e) { } }
    this.ch = null; this.started = false; this.inv = null;
  },
  onMsg(ev, p) {
    if (ev === 'start' && this.role === 'guest') return this.begin(p);
    if (ev === 'bye') { this.oppLeft(); return; }
    const g = App.game; if (!g || !g.mp) return;
    if (g.mode === 'race') return raceMsg(g, ev, p);
    if (g.mode === 'coop2') return g.mp.role === 'host' ? coopHostMsg(g, ev, p) : coopGuestMsg(g, ev, p);
  },
});
Object.assign(ACTIONS, {
  'mp-cancel-wait': () => { const P = MP.pending; MP.pending = null; clearInterval(MP.waitPoll); if (P) SOC.cancel(P.id, P.to); closeOverlay(); },
  'mp-leave': () => { MP.leave(); closeOverlay(); },
});

/* ---------- algemeen: potje starten in een kamer ---------- */
const _modeLabel14 = modeLabel;
modeLabel = function (g) { const mp = g.mp || (g.opts && g.opts.mp); if (g.mode === 'race') return `Race tegen ${mp ? mp.opp.name : ''}`; if (g.mode === 'coop2') return `Co-op met ${mp ? mp.opp.name : ''}`; return _modeLabel14(g); };
const _startMatch14 = startMatch;
startMatch = function (o) {
  const r = _startMatch14.apply(this, arguments);
  const g = App.game; if (!g || !o || !o.mp) return r;
  g.mp = Object.assign({}, o.mp); g.mpT = 0; g.mpLastSent = 0;
  if (g.mode === 'race') raceSetup(g); else if (g.mode === 'coop2') (g.mp.role === 'host' ? coopHostSetup : coopGuestSetup)(g);
  return r;
};
// In samen-spelen pauzeert het spel niet
const _showPause14 = showPause;
showPause = function () {
  _showPause14.apply(this, arguments); const g = App.game;
  if (g && g.mp) { g.paused = false; const h = document.querySelector('.pause-card h2'); if (h) h.textContent = 'Menu'; const p = document.querySelector('.pause-card p'); if (p) p.textContent = `${p.textContent} · het spel loopt door (samen spelen)`; }
};
const _exitGame14 = exitGame;
exitGame = function (to) { const g = App.game; if (g && g.mp) MP.leave(); return _exitGame14.apply(this, arguments); };
// geen elites in race en co-op (eerlijk voor beide spelers)
const _initExt14 = Game.prototype.initExt3;
Game.prototype.initExt3 = function () { _initExt14.call(this); if (this.mode === 'race' || this.mode === 'coop2') this.eliteChance = 0; };
// beloningen voor race en co-op
const _finish14 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const R = _finish14.call(this, g);
  if ((g.mode !== 'race' && g.mode !== 'coop2') || g._mpRew) return R; g._mpRew = true;
  const win = !!g.result.win, waves = win ? g.totalWaves : g.cleared;
  const base = matchRewards(g.map, g.diffIdx, waves, g.bossKills, win, false);
  let c = 0; for (const r of base.rows) { const v = Math.round(r[1] * 0.8); R.rows.push([r[0], v]); c += v; }
  if (g.mode === 'race' && win) { const b = 300 + g.diffIdx * 150; R.rows.push([g.mpWinWhy === 'forfeit' ? 'Race gewonnen (tegenstander gestopt)' : 'Race gewonnen!', b]); c += b; }
  if (g.mode === 'coop2' && win) { const b = 200 + g.diffIdx * 120; R.rows.push(['Samen gewonnen!', b]); c += b; }
  this.grant({ coins: c, gems: win ? 5 + g.diffIdx : 0 }); R.coins += c;
  Store.save(); return R;
};

/* =====================================================================
   RACE
   ===================================================================== */
const RACE_SEND = [
  { name: 'Sprinters', type: 'runner', n: 6, cost: 120, cd: 6 },
  { name: 'Tanks', type: 'tank', n: 2, cost: 280, cd: 10 },
  { name: 'Juggernaut', type: 'juggernaut', n: 1, cost: 650, cd: 16 },
];
const raceCost = (g, s) => Math.round(s.cost * (1 + Math.max(0, g.wave - 1) * 0.1));
function raceSetup(g) {
  g.opp = { w: 0, tw: g.totalWaves, hp: g.hp, mhp: g.maxHp, k: 0, over: null, t: Date.now() };
  g.sendCd = RACE_SEND.map(() => 0);
  const hud = document.querySelector('#scr-game .hud');
  if (hud) {
    const box = document.createElement('div'); box.className = 'mp-opp'; box.id = 'mp-opp';
    box.innerHTML = `<div class="mo-name"><span class="dot on"></span><b>${esc(g.mp.opp.name)}</b></div><div class="mo-stats"><span id="mo-wave">Golf 0/${g.totalWaves}</span><div class="mo-hp"><i id="mo-hpbar" style="width:100%"></i></div><span id="mo-hp" class="num">${g.hp}</span></div>`;
    hud.appendChild(box);
    const sb = document.createElement('div'); sb.className = 'mp-send'; sb.id = 'mp-send';
    sb.innerHTML = `<small>Stuur naar ${esc(g.mp.opp.name)}</small>${RACE_SEND.map((s, i) => `<button class="btn btn-sm" data-act="race-send" data-i="${i}" id="rs-${i}"><span class="cdf"></span><span class="l">${s.n}× ${s.name}</span> <span class="num c">$${raceCost(g, s)}</span></button>`).join('')}`;
    hud.after(sb);
  }
}
function raceMsg(g, ev, p) {
  if (ev === 'st') { g.opp = Object.assign(g.opp || {}, p, { t: Date.now() }); return; }
  if (ev === 'atk' && !g.over) {
    const s = RACE_SEND[p.i]; if (!s) return;
    for (let k = 0; k < s.n; k++) { const e = g.spawnEnemy(s.type, -10 - k * 18, Math.max(1, g.wave)); if (e) e.sentBy = true; }
    g.banner(`${g.mp.opp.name} stuurt ${s.n}× ${s.name}!`, 'Hou ze tegen!', '#ef4444'); Sfx.play('boss'); g.shake(4);
    return;
  }
  if (ev === 'end' && !g.over) {
    if (p.why === 'dead' || p.why === 'quit') { g.mpWinWhy = p.why === 'quit' ? 'forfeit' : 'dead'; g.win(); g.banners = [{ text: 'Je wint de race!', sub: p.why === 'quit' ? `${g.mp.opp.name} heeft opgegeven` : `De basis van ${g.mp.opp.name} is gevallen`, color: '#3ddc97', life: 3, max: 3 }]; }
    else if (p.why === 'finish') { g.mpLoseWhy = 'beaten'; g.lose(); g.banners = [{ text: `${g.mp.opp.name} wint de race`, sub: 'Hij haalde als eerste alle golven', color: '#ff4d5e', life: 3, max: 3 }]; }
  }
}
// eigen stand doorsturen + einde melden
function mpTickSend(g, every, fn) { const now = Date.now(); if (now - g.mpLastSent >= every) { g.mpLastSent = now; fn(); } }
const _win14 = Game.prototype.win, _lose14 = Game.prototype.lose, _quit14 = Game.prototype.quit;
Game.prototype.win = function () { const was = this.over; _win14.call(this); if (!was && this.mode === 'race' && !this.mpWinWhy) { MP.send('end', { why: 'finish' }); this.banners = [{ text: 'Je wint de race!', sub: 'Als eerste alle golven gehaald', color: '#3ddc97', life: 3, max: 3 }]; } if (!was && this.mode === 'coop2' && this.mp && this.mp.role === 'host') coopSendEnd(this); };
Game.prototype.lose = function () { const was = this.over; _lose14.call(this); if (!was && this.mode === 'race' && !this.mpLoseWhy) MP.send('end', { why: 'dead' }); if (!was && this.mode === 'coop2' && this.mp && this.mp.role === 'host') coopSendEnd(this); };
Game.prototype.quit = function () { const was = this.over; _quit14.call(this); if (!was && this.mp) { if (this.mode === 'race') MP.send('end', { why: 'quit' }); if (this.mode === 'coop2' && this.mp.role === 'host') coopSendEnd(this); if (this.mode === 'coop2' && this.mp.role === 'guest' && !this.mpQuit) MP.send('cmd', { c: 'leave' }); } };
const _update14 = Game.prototype.update;
Game.prototype.update = function (dt) {
  const r = _update14.call(this, dt);
  if (this.mode === 'race' && this.mp && !this.over) {
    mpTickSend(this, 500, () => MP.send('st', { w: this.wave, tw: this.totalWaves, hp: Math.max(0, Math.ceil(this.hp)), mhp: this.maxHp, k: this.kills, cl: this.cleared }));
    for (let i = 0; i < this.sendCd.length; i++) if (this.sendCd[i] > 0) this.sendCd[i] = Math.max(0, this.sendCd[i] - dt);
    if (this.opp && Date.now() - this.opp.t > 6000 && !this.oppLagShown) { this.oppLagShown = true; }
  }
  if (this.mode === 'coop2' && this.mp && this.mp.role === 'host') coopHostTick(this);
  return r;
};
Object.assign(ACTIONS, {
  'race-send': b => {
    const g = App.game; if (!g || g.mode !== 'race' || g.over) return;
    const i = +b.dataset.i, s = RACE_SEND[i], c = raceCost(g, s);
    if (g.sendCd[i] > 0) return; if (g.cash < c) { Sfx.play('error'); toast(`Je hebt $${c} nodig.`, 'bad'); return; }
    g.cash -= c; g.sendCd[i] = s.cd; MP.send('atk', { i }); Sfx.play('shoot');
    g.floatText(GW - 120, 60, `${s.n}× ${s.name} verstuurd!`, '#ef4444', 18, 1.2);
  },
});
const _hud14 = hudUpdate;
hudUpdate = function () {
  _hud14.apply(this, arguments);
  const g = App.game; if (!g || !g.mp) return;
  if (g.mode === 'race' && g.opp) {
    const o = g.opp, set = (id, v) => { const el = document.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };
    set('mo-wave', o.over ? '' : `Golf ${o.w}/${o.tw}`); set('mo-hp', o.hp);
    const bar = document.getElementById('mo-hpbar'); if (bar) bar.style.width = clamp(o.hp / (o.mhp || 1), 0, 1) * 100 + '%';
    const dot = document.querySelector('#mp-opp .dot'); if (dot) dot.classList.toggle('on', Date.now() - o.t < 4000);
    RACE_SEND.forEach((s, i) => { const btn = document.getElementById('rs-' + i); if (!btn) return; const c = raceCost(g, s); btn.disabled = g.over || g.sendCd[i] > 0 || g.cash < c; const cc = btn.querySelector('.c'); if (cc && cc.textContent !== '$' + c) cc.textContent = '$' + c; const f = btn.querySelector('.cdf'); if (f) f.style.width = (g.sendCd[i] / s.cd * 100) + '%'; });
  }
  if (g.mode === 'coop2') coopHud(g);
};

/* =====================================================================
   CO-OP — host
   ===================================================================== */
const COOP_HP = 1.5;
const COSMETIC_FX = { lightning: 1, slash: 1, laser: 1, pillar: 1, bolt: 1, implode: 1, tint: 1, rewind: 1 };
function coopHostSetup(g) {
  g.cash2 = g.cash; g.mpEv = []; g.use1 = {}; g.dmg1 = 0;
  const push0 = Array.prototype.push;
  g.effects.push = function (f) { if (f && COSMETIC_FX[f.type] && g.mpEv.length < 80) { const c = {}; for (const k in f) { const v = f[k]; if (k === 'pts') c.pts = v.map(p => [Math.round(p.x), Math.round(p.y)]); else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') c[k] = v; } g.mpEv.push(['f', c]); } return push0.apply(this, arguments); };
  g.banner(`Co-op met ${g.mp.opp.name}`, 'Ieder heeft eigen geld. Samen verdedigen jullie de basis!', '#38bdf8'); g.mpEv = [];
}
const _spawn14 = Game.prototype.spawnEnemy;
Game.prototype.spawnEnemy = function (type, d, w) { const e = _spawn14.call(this, type, d, w); if (e && this.mode === 'coop2' && !e.E.worldBoss) { e.hp *= COOP_HP; e.maxHp *= COOP_HP; e.shield *= COOP_HP; e.maxShield *= COOP_HP; } return e; };
const _kill14 = Game.prototype.kill;
Game.prototype.kill = function (e, h) {
  const was = e.dead, c0 = this.cash; _kill14.call(this, e, h);
  if (!was && e.dead && this.mode === 'coop2' && this.mpEv) {
    const gain = this.cash - c0; if (gain > 0) this.cash2 += gain;
    if (h && h.owner === 1) { const u = this.use1[h.id] || (this.use1[h.id] = { dmg: 0, kills: 0 }); u.kills++; }
    this.mpEv.push(['k', Math.round(e.x), Math.round(e.ay), e.E.color, e.boss ? 1 : 0, e.r]);
  }
};
const _payBonus14 = Game.prototype.payWaveBonus;
Game.prototype.payWaveBonus = function () { const c0 = this.cash; _payBonus14.call(this); if (this.mode === 'coop2' && this.cash2 != null) this.cash2 += Math.max(0, this.cash - c0); };
const _damage14 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h, o = {}) { const r = _damage14.call(this, e, amt, h, o); if (r > 0 && h && h.owner === 1 && this.use1) { const u = this.use1[h.id] || (this.use1[h.id] = { dmg: 0, kills: 0 }); u.dmg += r; this.dmg1 += r; } return r; };
// geen held van je maatje upgraden of verkopen
for (const fn of ['upgrade', 'sell']) {
  const orig = Game.prototype[fn];
  Game.prototype[fn] = function (h) {
    if (this.mode === 'coop2' && h && (h.owner || 0) !== (this.cmdOwner || 0) && !this.mpSolo) { if (!this.cmdOwner) { this.emit('msg', `Dit is een held van ${this.mp ? this.mp.opp.name : 'je maatje'}.`); Sfx.play('error'); } return false; }
    return orig.call(this, h);
  };
}
const _useAb14 = Game.prototype.useAbility;
Game.prototype.useAbility = function (h) {
  if (this.mode === 'coop2' && this.mp && this.mp.role === 'host' && h && (h.owner || 0) !== (this.cmdOwner || 0) && !this.mpSolo) { if (!this.cmdOwner) { this.emit('msg', `Dit is een held van ${this.mp.opp.name}.`); Sfx.play('error'); } return false; }
  const ok = _useAb14.call(this, h);
  if (ok && this.mode === 'coop2' && this.mpEv) this.mpEv.push(['a', h.uid]);
  return ok;
};
const _upg14 = Game.prototype.upgrade;
Game.prototype.upgrade = function (h) { const ok = _upg14.call(this, h); if (ok && this.mode === 'coop2' && this.mpEv) this.mpEv.push(['u', h.uid]); return ok; };
const _explode14 = Game.prototype.explode;
Game.prototype.explode = function (p, x, y) { _explode14.call(this, p, x, y); if (this.mode === 'coop2' && this.mpEv && this.mpEv.length < 120) this.mpEv.push(['x', Math.round(x), Math.round(y), +(p.splash || 0.5).toFixed(2), p.kind, p.color]); };
const _banner14 = Game.prototype.banner;
Game.prototype.banner = function (t, s, c) { _banner14.call(this, t, s, c); if (this.mode === 'coop2' && this.mpEv) this.mpEv.push(['b', t, s || '', c || '#fff']); };
const _float14 = Game.prototype.floatText;
Game.prototype.floatText = function (x, y, t, c, size = 14, life = 0.9) { _float14.call(this, x, y, t, c, size, life); if (this.mode === 'coop2' && this.mpEv && size >= 15 && this.mpEv.length < 120) this.mpEv.push(['t', Math.round(x), Math.round(y), String(t), c, size, life]); };
// heldentelling per speler (iedereen heeft zijn eigen limiet)
const _heroCount14 = Game.prototype.heroCount;
Game.prototype.heroCount = function (id) { if (this.mode !== 'coop2') return _heroCount14.call(this, id); const ow = this.cmdOwner || 0; return this.heroes.reduce((n, h) => n + (h.id === id && !h.temp && (h.owner || 0) === ow ? 1 : 0), 0); };
const _realHeroes14 = Game.prototype.realHeroes;
Game.prototype.realHeroes = function () { const all = _realHeroes14.call(this); if (this.mode !== 'coop2' || !this.mpCountOwn) return all; const ow = this.cmdOwner || 0; return all.filter(h => (h.owner || 0) === ow); };
const _placeCheck14 = Game.prototype.placeCheck;
Game.prototype.placeCheck = function (id, tx, ty) { if (this.mode !== 'coop2') return _placeCheck14.call(this, id, tx, ty); this.mpCountOwn = true; try { return _placeCheck14.call(this, id, tx, ty); } finally { this.mpCountOwn = false; } };

function withOwner(g, owner, fn) {
  if (!owner) return fn();
  const c = g.cash; g.cash = g.cash2; g.cmdOwner = 1;
  try { return fn(); } finally { g.cash2 = g.cash; g.cash = c; g.cmdOwner = 0; }
}
function coopHostMsg(g, ev, p) {
  if (ev !== 'cmd') return;
  const hByUid = uid => g.heroes.find(h => h.uid === uid && !h.temp);
  const reply = text => MP.send('msg', { text });
  switch (p.c) {
    case 'place': {
      if (!HERO[p.id] || HERO[p.id].hidden) return;
      withOwner(g, 1, () => {
        g.levels[p.id] = g.levels[p.id] || 1;
        const err = g.placeCheck(p.id, p.tx, p.ty); if (err) return reply(err);
        const h = g.makeHero(p.id, p.tx, p.ty, clamp(p.lv | 0, 1, MAX_LEVEL));
        h.owner = 1; h.trait = TRAIT[p.tr] || null; if (p.sk && typeof resolveLook === 'function') h.look = resolveLook(HERO[p.id], p.sk); h.skin = p.sk || null;
        h.spent = g.costOf(p.id); h.st = g.heroStats(h);
        if (g.cash < h.spent) return reply(`Te weinig geld voor ${HERO[p.id].name}.`);
        g.heroes.push(h); g.cash -= h.spent; h.spawnA = 0.32;
        g.fx.burst(h.x, h.y, h.look.suit2, 16, 140, 3, 0.5); Sfx.play('place');
      });
      break;
    }
    case 'upg': { const h = hByUid(p.uid); if (h && h.owner === 1) withOwner(g, 1, () => { if (!g.upgrade(h)) reply('Upgraden lukte niet (te weinig geld?).'); }); break; }
    case 'sell': { const h = hByUid(p.uid); if (h && h.owner === 1) withOwner(g, 1, () => g.sell(h)); break; }
    case 'abil': { const h = hByUid(p.uid); if (h && h.owner === 1) { g.cmdOwner = 1; g.useAbility(h); g.cmdOwner = 0; } break; }
    case 'mode': { const h = hByUid(p.uid); if (h && h.owner === 1 && TARGET_MODES.some(m => m[0] === p.m)) h.mode = p.m; break; }
    case 'wave': g.startWave(); break;
    case 'speed': if ([1, 2, 3].includes(p.s)) { g.speed = p.s; $$('.seg button[data-act="g-speed"]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.s === g.speed)); } break;
    case 'auto': if (['off', 'clear', 'direct'].includes(p.m)) { applyAutoMode(g, p.m); const b = $('#h-auto'); if (b) { b.setAttribute('aria-pressed', g.autoWave); b.dataset.mode = p.m; const l = $('#h-auto-l'); if (l) l.textContent = AUTO_LABEL[p.m]; } } break;
    case 'leave': g.banner(`${g.mp.opp.name} is gestopt`, 'Zijn helden blijven staan; jij speelt verder.', '#f59e0b'); for (const h of g.heroes) if (h.owner === 1) h.owner = 0; g.mpSolo = true; break;
  }
}
const FLAG_BITS = ['stunT', 'slowT', 'burnT', 'frozenT', 'invis', 'revealed', 'ghost', 'rage', 'mirrorUp', 'enraged', 'shockT', 'markT', 'weakT', 'glueT', 'vulnT', 'invulnT'];
function coopSnapshot(g) {
  const E = [], H = [], P = [];
  for (const e of g.enemies) {
    if (e.dead) continue; let f = 0; FLAG_BITS.forEach((k, i) => { const v = e[k]; if (v && v !== 0 && v !== false) f |= 1 << i; });
    E.push([e.id, e.type, Math.round(e.d * 10) / 10, Math.round(e.hp), Math.round(e.maxHp), Math.round(e.shield), Math.round(e.maxShield), f, e.bph || (e.phase || 0) + 1, e.affix ? AFFIXES.indexOf(e.affix) : -1, e.elite ? 1 : 0, Math.round(e.r * 10) / 10]);
  }
  for (const h of g.heroes) H.push([h.uid, h.id, h.tx, h.ty, h.tier, h.owner || 0, h.level, Math.round(h.abilCd * 10) / 10, Math.round(h.ang * 100) / 100, Math.round(h.atk * 10) / 10, h.trait ? h.trait.id : null, h.skin || (h.owner ? null : (Store.data.heroes[h.id] || {}).skin || null), h.stunT > 0 ? 1 : 0, h.mode, (h.beamTargets || []).filter(x => !x.dead).map(x => x.id), h.temp ? Math.round(h.temp) : 0, h.kills, Math.round(h.dmg)]);
  for (const p of g.proj) { if (P.length >= 90) break; const a = p.ang || Math.atan2(p.ty - p.y, p.tx - p.x); P.push([p.kind, Math.round(p.x), Math.round(p.y), Math.round(Math.cos(a) * p.speed), Math.round(Math.sin(a) * p.speed), p.color, p.big ? 1 : 0, p.h ? p.h.tier : 0]); }
  const ev = g.mpEv; g.mpEv = [];
  return { w: g.wave, tw: g.totalWaves === Infinity ? -1 : g.totalWaves, cl: g.cleared, hp: Math.ceil(g.hp), mhp: g.maxHp, c2: Math.floor(g.cash2), q: g.queue.length, bp: g.bonusPending ? 1 : 0, sp: g.speed, am: autoModeOf(g), at: Math.round((g.autoT || 0) * 10) / 10, k: g.kills, bk: g.bossKills, E, H, P, V: ev, ov: g.over ? 1 : 0 };
}
function coopHostTick(g) { if (g.over) return; mpTickSend(g, 160, () => MP.send('snap', coopSnapshot(g))); }
function coopSendEnd(g) {
  MP.send('snap', coopSnapshot(g));
  MP.send('end', { win: !!(g.result && g.result.win), quit: !!(g.result && g.result.quit), w: g.wave, cl: g.cleared, k: g.kills, bk: g.bossKills, t: Math.round(g.time), use: g.use1, dmg: Math.round(g.dmg1), hpLost: g.ms.hpLost, solo: !!g.mpSolo });
}

/* =====================================================================
   CO-OP — gast
   ===================================================================== */
function coopGuestSetup(g) {
  g.SK = null; g.remote = true; g.snapT = Date.now(); g.queue = []; g.enemies = []; g.heroes = []; g.proj = [];
  const send = (c, extra) => MP.send('cmd', Object.assign({ c }, extra || {}));
  const mine = h => h && h.owner === 1;
  g.update = function (dt) { coopGuestUpdate(this, dt); };
  g.startWave = function () { if (this.over) return false; send('wave'); Sfx.play('click'); return true; };
  g.canStartWave = function () { return !this.over && this.queue.length === 0; };
  g.placeHero = function (id, tx, ty) {
    const err = this.placeCheck(id, tx, ty); if (err) { Sfx.play('error'); this.emit('msg', err); return false; }
    const o = Store.data.heroes[id] || {};
    send('place', { id, tx, ty, lv: heroLevel(id), tr: o.trait || null, sk: o.skin || null });
    this.fx.ring(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 26, '#38bdf8', 0.4, 3); Sfx.play('click'); return true;
  };
  g.placeCheck = function (id, tx, ty) {
    if (!this.tileFree(tx, ty)) return 'Hier kun je geen held plaatsen.';
    const c = Math.round(HERO[id].cost * this.M.cost); if (this.cash < c) return `Te weinig geld: ${HERO[id].name} kost $${c}.`;
    const own = this.heroes.filter(h => h.owner === 1 && !h.temp);
    if (own.filter(h => h.id === id).length >= this.heroCap(id)) return `Maximaal ${this.heroCap(id)}× ${HERO[id].name} tegelijk.`;
    if (own.length >= MAX_HEROES) return `Maximaal ${MAX_HEROES} helden per speler.`;
    return null;
  };
  g.costOf = function (id) { return Math.round(HERO[id].cost * this.M.cost); };
  g.upgCost = function (h) { const u = h.def.upgrades[h.tier]; return u ? u.cost : 0; };
  g.upgrade = function (h) { if (!mine(h)) { this.emit('msg', `Dit is een held van ${this.mp.opp.name}.`); Sfx.play('error'); return false; } if (h.tier >= 5) return false; if (this.cash < this.upgCost(h)) { Sfx.play('error'); this.emit('msg', 'Te weinig geld.'); return false; } send('upg', { uid: h.uid }); Sfx.play('click'); return true; };
  g.sell = function (h) { if (!mine(h)) { this.emit('msg', `Dit is een held van ${this.mp.opp.name}.`); return; } send('sell', { uid: h.uid }); if (this.sel === h) this.sel = null; this.panelDirty = true; };
  g.useAbility = function (h) { if (!mine(h)) { this.emit('msg', `Dit is een held van ${this.mp.opp.name}.`); return false; } if (h.abilCd > 0) return false; send('abil', { uid: h.uid }); return true; };
  g.quit = function () { if (this.over) return; this.over = true; this.result = { win: false, quit: true }; if (!this.mpQuit) send('leave'); this.emit('end'); };
  g.banner(`Co-op met ${g.mp.opp.name}`, 'Ieder heeft eigen geld. Samen verdedigen jullie de basis!', '#38bdf8');
}
function makeRemoteEnemy(g, id, type) {
  const E = ENEMIES[type] || ENEMIES.grunt;
  const e = { id, type, E, r: E.r, flying: !!E.flying, boss: !!E.boss, hp: 1, maxHp: 1, shield: 0, maxShield: 0, d: -10, vd: 0, x: 0, y: 0, ay: 0, dir: 0, t: Math.random() * 10, flash: 0,
    slowT: 0, slowM: 0, stunT: 0, burnT: 0, burnD: 0, invulnT: 0, vulnT: 0, vulnM: 0, dmgRed: 0, ab: {}, hist: [], dmgAcc: 0, accT: 0.35, phase: 0, armor: 0, shred: 0, spawnA: E.boss ? 0.6 : 0.28, speed: E.speed, wave: g.wave, reward: 0, ghost: false, enraged: false };
  return e;
}
function coopGuestMsg(g, ev, p) {
  if (ev === 'msg') { toast(p.text, 'bad'); return; }
  if (ev === 'end') {
    if (g.over) return;
    g.over = true; g.result = { win: !!p.win, quit: false }; g.wave = p.w; g.cleared = p.cl; g.kills = p.k; g.bossKills = p.bk; g.time = p.t; g.ms.dmg = p.dmg || 0; g.ms.hpLost = p.hpLost || 0;
    g.ms.heroUse = p.use || {}; g.banner(p.win ? 'Samen gewonnen!' : 'Basis gevallen', p.win ? `${g.map.name} verdedigd` : `Golf ${p.w} van ${g.totalWaves}`, p.win ? '#3ddc97' : '#ff4d5e'); Sfx.play(p.win ? 'win' : 'lose');
    g.emit('end'); return;
  }
  if (ev !== 'snap') return;
  g.snapT = Date.now(); if (g.lagShown) { g.lagShown = false; }
  const dtS = 0.18;
  g.wave = p.w; g.totalWaves = p.tw < 0 ? Infinity : p.tw; g.cleared = p.cl; g.hp = p.hp; g.maxHp = p.mhp; g.cash = p.c2; g.kills = p.k; g.bossKills = p.bk;
  if (g.queue.length !== p.q) g.queue = Array.from({ length: p.q }, () => ({ type: 'x' })); g.bonusPending = !!p.bp; g.remoteSpeed = p.sp; g.autoT = p.at;
  if (p.am) { g.autoWave = p.am !== 'off'; g.autoDirect = p.am === 'direct'; }
  // vijanden
  const byId = new Map(g.enemies.map(e => [e.id, e])), seen = new Set();
  for (const r of p.E) {
    const [id, type, d, hp, mhp, sh, msh, f, bph, af, el, rr] = r; seen.add(id);
    let e = byId.get(id); const fresh = !e;
    if (!e) { e = makeRemoteEnemy(g, id, type); e.d = d; g.enemies.push(e); }
    if (!fresh && hp < e.hp) { e.flash = 1; if (!e.boss) e.hitJ = 1; }
    const diff = d - e.d; e.vd = Math.abs(diff) > 60 ? 0 : diff / dtS; if (Math.abs(diff) > 60) e.d = d;
    e.hp = hp; e.maxHp = mhp; e.shield = sh; e.maxShield = msh; e.bph = bph; e.elite = !!el; e.r = rr;
    e.affix = af >= 0 ? AFFIXES[af] : null;
    FLAG_BITS.forEach((k, i) => { const on = !!(f & (1 << i)); if (k === 'invis' || k === 'revealed' || k === 'ghost' || k === 'rage' || k === 'enraged') e[k] = on; else e[k] = on ? Math.max(e[k] || 0, 0.3) : 0; });
    if (e.slowT && !e.slowM) e.slowM = 0.3; if (e.vulnT && !e.vulnM) e.vulnM = 0.1; if (e.markT) e.markM = 0.1; if (e.glueT) e.glueM = 0.3;
  }
  for (const e of g.enemies) if (!seen.has(e.id)) { e.dead = true; }
  g.enemies = g.enemies.filter(e => !e.dead);
  // helden
  const hb = new Map(g.heroes.map(h => [h.uid, h])), hs = new Set();
  for (const r of p.H) {
    const [uid, id, tx, ty, tier, owner, lv, cd, ang, atk, tr, sk, stun, mode, bt, temp, kills, dmg] = r; hs.add(uid);
    let h = hb.get(uid);
    if (!h) {
      h = g.makeHero(id, tx, ty, lv); h.uid = uid; h.owner = owner === 1 ? 1 : 0; // vanuit de gast gezien: 1 = mijn held
      if (sk && typeof resolveLook === 'function') h.look = resolveLook(HERO[id], sk);
      h.spawnA = 0.32; if (temp) h.temp = temp;
      g.heroes.push(h);
    }
    if (h.tier !== tier) { h.tier = tier; h.pulse = 1; }
    h.level = lv; h.trait = tr ? TRAIT[tr] || null : null; h.abilCd = cd; h.ang = ang; if (atk > h.atk) h.atk = atk; h.stunT = stun ? 0.3 : 0; h.mode = mode; h.kills = kills; h.dmg = dmg;
    h.beamTargets = (bt || []).map(x => g.enemies.find(e => e.id === x)).filter(Boolean); h.beamChains = [];
    h.st = g.heroStats(h);
  }
  const before = g.heroes.length; g.heroes = g.heroes.filter(h => hs.has(h.uid)); if (g.sel && !g.heroes.includes(g.sel)) g.sel = null; if (before !== g.heroes.length) g.panelDirty = true;
  // projectielen
  g.proj = p.P.map(([kind, x, y, vx, vy, color, big, tier]) => ({ kind, x, y, vx, vy, color, big: !!big, ang: Math.atan2(vy, vx), rot: Math.random() * 6, h: tier ? { tier } : null, sx: x, sy: y, tx: x + vx, ty: y + vy, st: {}, hitIds: new Set() }));
  // gebeurtenissen
  let snd = 0;
  for (const v of p.V || []) {
    switch (v[0]) {
      case 'k': { const [, x, y, c, boss, r] = v; g.fx.burst(x, y, c, boss ? 60 : 12, boss ? 300 : 140, boss ? 5 : 3, boss ? 1 : 0.45); g.addLight && g.addLight(x, y, r * 3, c, 0.2, 0.4); if (snd++ < 3) Sfx.play(boss ? 'bossdie' : 'death'); if (boss) g.shake(12); break; }
      case 'x': { const [, x, y, sp, kind, c] = v; const R = Math.max(0.5, sp) * TILE, col = (typeof TRAIL_COL !== 'undefined' && TRAIL_COL[kind]) || c || '#fde68a'; g.fx.ring(x, y, R, col, 0.35, 4); g.fx.burst(x, y, col, 14, 180, 3, 0.45); g.addLight && g.addLight(x, y, R * 1.7, col, 0.3, 0.6); g.addScorch && g.addScorch(x, y + 4, R * 0.7, col); if (snd++ < 3) Sfx.play('boom'); break; }
      case 'b': g.banners.push({ text: v[1], sub: v[2], color: v[3], life: 2.2, max: 2.2 }); break;
      case 't': g.texts.push({ x: v[1], y: v[2], text: v[3], color: v[4], size: v[5], life: v[6], max: v[6], vy: -30 }); break;
      case 'f': { const f = Object.assign({}, v[1]); if (f.pts) f.pts = f.pts.map(([x, y]) => ({ x, y })); g.effects.push(f); break; }
      case 'a': { const h = g.heroes.find(x => x.uid === v[1]); if (h) { const A = ABILITIES[h.def.ability], ult = h.tier >= 5; if (typeof castFx === 'function' && ABILITY_ELEM[h.def.ability]) castFx(g, h, ABILITY_ELEM[h.def.ability]); if (typeof abilitySignature === 'function') abilitySignature(g, h, ABILITY_ELEM[h.def.ability] || 'empower'); g.cutin = { h, name: ult ? A.ult : A.name, ult, life: ult ? 1.6 : 1.1, max: ult ? 1.6 : 1.1 }; Sfx.play(ult ? 'ult' : 'ability'); } break; }
      case 'u': { const h = g.heroes.find(x => x.uid === v[1]); if (h) { g.fx.burst(h.x, h.y - 8, h.look.suit2, 24, 160, 3, 0.6, 'glow'); g.fx.ring(h.x, h.y, 44, h.look.suit2, 0.5, 4); if (typeof g_pillar === 'function') g_pillar(g, h.x, h.y, '#ffd23f', 0.7, 22); Sfx.play('upgrade'); g.panelDirty = true; } break; }
    }
  }
  g.panelDirty = g.panelDirty || !!g.sel;
}
function coopGuestUpdate(g, dtRaw) {
  let dt = dtRaw; g.speed = 1;
  if (g.cutin) { g.cutin.life -= dtRaw; if (g.cutin.life <= 0) g.cutin = null; }
  g.fx.update(dt); g.updateAmbient(dt);
  for (let i = g.texts.length - 1; i >= 0; i--) { const t = g.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.96; if (t.life <= 0) g.texts.splice(i, 1); }
  if (g.banners.length) { g.banners[0].life -= dtRaw; if (g.banners[0].life <= 0) g.banners.shift(); }
  if (g.flash) { g.flash.life -= dtRaw; if (g.flash.life <= 0) g.flash = null; }
  g.shakeA = Math.max(0, g.shakeA - dtRaw * 30);
  g.time += dt;
  for (let i = g.timers.length - 1; i >= 0; i--) { const tm = g.timers[i]; tm.t -= dt; if (tm.t <= 0) { g.timers.splice(i, 1); try { tm.fn(); } catch (e) { } } }
  for (const e of g.enemies) {
    e.t += dt; e.flash = Math.max(0, e.flash - dt * 6); if (e.spawnA > 0) e.spawnA -= dt; if (e.hitJ > 0) e.hitJ = Math.max(0, e.hitJ - dt * 8);
    if (e.vd) e.d += e.vd * dt;
    const pp = g.posAt(e.d); e.x = pp.x; e.y = pp.y; e.ay = pp.y - (e.flying ? 16 : 0); e.dir = pp.ang;
  }
  for (const h of g.heroes) {
    h.t += dt; h.atk = Math.max(0, h.atk - dt * 4); h.pulse = Math.max(0, h.pulse - dt * 2.5); if (h.abilCd > 0) h.abilCd = Math.max(0, h.abilCd - dt);
    if (h.spawnA > 0) h.spawnA -= dt; h.fxT = (h.fxT || 0) - dt;
    if (h.fxT <= 0) { h.fxT = (h.tier >= 5 ? 0.12 : 0.3) + Math.random() * 0.25; idleFx(g.fx, h.look.skinFx || h.def.fx, h.x, h.y, h.look.suit2); }
  }
  for (const p of g.proj) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 18; const tr = p.tr || (p.tr = []); tr.push(p.x, p.y); if (tr.length > 14) tr.splice(0, 2); }
  g.updateEffects(dt); g.updateExt(dt);
  if (!g.over && Date.now() - g.snapT > 4000 && !g.lagShown) { g.lagShown = true; g.banner('Verbinding hapert…', `Wachten op ${g.mp.opp.name}`, '#f59e0b'); }
  if (!g.over && Date.now() - g.snapT > 25000) { g.mpQuit = true; g.over = true; g.result = { win: false, quit: true }; g.banner('Verbinding verbroken', `${g.mp.opp.name} is niet meer bereikbaar`, '#ff4d5e'); g.emit('end'); }
}
function coopHud(g) {
  if (!g.mp) return;
  if (g.mp.role === 'guest') { const sp = g.remoteSpeed || 1; $$('.seg button[data-act="g-speed"]').forEach(x => { const on = String(+x.dataset.s === sp); if (x.getAttribute('aria-pressed') !== on) x.setAttribute('aria-pressed', on); }); const b = $('#h-auto'); if (b) { const m = autoModeOf(g); if (b.dataset.mode !== m) { b.dataset.mode = m; b.setAttribute('aria-pressed', g.autoWave); const l = $('#h-auto-l'); if (l) l.textContent = AUTO_LABEL[m]; } } }
  let el = document.getElementById('mp-coop'); const hud = document.querySelector('#scr-game .hud');
  if (!el && hud) { el = document.createElement('div'); el.className = 'mp-opp coop'; el.id = 'mp-coop'; hud.appendChild(el); }
  if (el) {
    const other = g.mp.role === 'host' ? g.cash2 : null, on = g.mp.role === 'host' ? (MP.present.has(g.mp.opp.id) && !g.mpSolo) : Date.now() - g.snapT < 3000;
    const txt = `<div class="mo-name"><span class="dot ${on ? 'on' : ''}"></span><b>${esc(g.mp.opp.name)}</b></div><div class="mo-stats">${other != null ? `<span class="num">$${fmt(Math.floor(other))}</span>` : '<span>Samen</span>'}<span class="muted">${g.heroes.filter(h => !h.temp && (g.mp.role === 'host' ? h.owner === 1 : h.owner !== 1)).length} helden</span></div>`;
    if (el.dataset.k !== txt) { el.dataset.k = txt; el.innerHTML = txt; }
  }
}
// eigenaar zichtbaar maken: ring onder de held (geel = jij, blauw = je maatje)
const _drawHeroUnit14 = Game.prototype.drawHeroUnit;
Game.prototype.drawHeroUnit = function (ctx, h, t) {
  if (this.mode === 'coop2' && !h.temp) {
    const mineH = this.mp && this.mp.role === 'guest' ? h.owner === 1 : (h.owner || 0) === 0;
    ctx.save(); ctx.strokeStyle = mineH ? 'rgba(255,210,63,.75)' : 'rgba(56,189,248,.85)'; ctx.lineWidth = 2; ctx.setLineDash(mineH ? [] : [4, 3]); ctx.beginPath(); ctx.ellipse(h.x, h.y + 15, 15, 5.5, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  return _drawHeroUnit14.call(this, ctx, h, t);
};
// Snelheid, auto en doelwit via de host laten lopen
const _gSpeed14 = ACTIONS['g-speed'], _gMode14 = ACTIONS['g-mode'];
ACTIONS['g-speed'] = b => { const g = App.game; if (g && g.mode === 'coop2' && g.mp && g.mp.role === 'guest') { MP.send('cmd', { c: 'speed', s: +b.dataset.s }); Sfx.play('click'); return; } if (g && g.mode === 'coop2' && g.mp && g.mp.role === 'host') { _gSpeed14(b); return; } return _gSpeed14(b); };
ACTIONS['g-mode'] = b => { const g = App.game; if (g && g.mode === 'coop2' && g.mp && g.mp.role === 'guest' && g.sel) { if (g.sel.owner !== 1) { toast(`Dit is een held van ${g.mp.opp.name}.`, 'bad'); return; } MP.send('cmd', { c: 'mode', uid: g.sel.uid, m: b.dataset.m }); g.sel.mode = b.dataset.m; g.panelDirty = true; Sfx.play('click'); return; } if (g && g.mode === 'coop2' && g.sel && (g.sel.owner || 0) === 1 && !g.mpSolo) { toast(`Dit is een held van ${g.mp.opp.name}.`, 'bad'); return; } return _gMode14(b); };
const _toggleAuto14 = toggleAutoSkip;
toggleAutoSkip = function () { const g = App.game; if (g && g.mode === 'coop2' && g.mp && g.mp.role === 'guest') { const m = AUTO_ORDER[(AUTO_ORDER.indexOf(autoModeOf(g)) + 1) % AUTO_ORDER.length]; MP.send('cmd', { c: 'auto', m }); toast(`Auto Skip: ${AUTO_LABEL[m]}`, 'good'); return; } return _toggleAuto14.apply(this, arguments); };

// "Opnieuw" na een samen-potje: terug naar Vrienden in plaats van een los potje
const _resRetry14 = ACTIONS['res-retry'];
ACTIONS['res-retry'] = b => { if (App.lastMatch && App.lastMatch.mp) { exitGame('friends'); return; } return _resRetry14(b); };
