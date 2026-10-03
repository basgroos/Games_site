/* =====================================================================
   MEGABAAS — co-op met een vriend tegen één gigantische baas.
   - Uitnodigen via Vrienden → "Megabaas". In de database is het een
     co-op-uitnodiging met map "mega:<map>" (geen databasewijziging nodig).
   - De host rekent alles uit (zoals gewone co-op); de gast ziet het via
     de snapshots. Fases hangen alleen af van het HP-percentage, dus de gast
     kan ze zelf afleiden.
   - Fase 1 (100–60%): aardbevingen verdoven helden.
     Fase 2 (60–25%): Kosmisch pantser — alleen Ultra/Secret doen schade.
     Fase 3 (25–0%):  Oerschild — alleen Secret-helden doen nog schade.
   - Beloning: veel munten, gems, Reroll Tokens en een gegarandeerde hoge trait.
   ===================================================================== */
const MEGA = {
  id: 'megabaas', prep: 45, startCash: 9000, income: 220, incomeEvery: 5,
  hp: 9e7,                   // × moeilijkheid (diff.hp). Gemeten (max level, upgrade 5): 1 Secret ~150–250k/s, 1 Ultra ~300k/s
  armor: 14, walkTime: 480,  // seconden om de hele route te lopen (zonder woede)
  hitCap: 0.0006,            // max. deel van zijn max-HP per treffer (tegen %-schade en runaway-buffs)
  dpsCap: 0.004,             // max. deel van zijn max-HP per seconde: een gevecht duurt altijd minstens ~4 minuten
  phase2: 0.6, phase3: 0.25,
  armorMult: 0,              // fase 2: helden onder Ultra doen geen schade
  minionEvery: 10, stompEvery: 13, stompR: 3.2, stompStun: 2.4,
};
const megaOn = g => !!(g && g.opts && g.opts.mega);
const megaHost = g => megaOn(g) && (!g.mp || g.mp.role === 'host');
const megaPhaseOf = f => f > MEGA.phase2 ? 1 : f > MEGA.phase3 ? 2 : 3;
const rarAtLeast = (r, min) => RARITY_ORDER.indexOf(r) >= RARITY_ORDER.indexOf(min);
const MEGA_DIFF_REWARD = d => 1 + d * 0.6;
// HP-factor per moeilijkheid: minder steil dan gewone levels, anders is Nachtmerrie+ onmogelijk
const megaDiffMult = g => 1 + (g.diff.hp - 1) * 0.5;
// limieten zijn absoluut (op basis van Normaal): hogere moeilijkheid = echt een langer gevecht
const megaCapBase = () => MEGA.hp;

ENEMIES.megabaas = { name: 'De Oerverslinder', hp: 1, speed: 0.1, armor: MEGA.armor, reward: 0, r: 50, leak: 999, color: '#7f1d1d', boss: true, ccImmune: true, hidden: true, drawAs: 'overlord',
  desc: 'De Megabaas. Gigantisch sterk; in de laatste fase kunnen alleen Secret-helden hem nog raken.' };

/* ---------- uitnodigen (kind 'mega' = co-op met map 'mega:<id>') ---------- */
KIND_LABEL.mega = 'Megabaas';
const megaDecode = inv => { if (inv && typeof inv.map === 'string' && inv.map.startsWith('mega:')) { inv.kind = 'mega'; inv.map = inv.map.slice(5); } return inv; };
const _socInvite24 = SOC.invite;
SOC.invite = function (to, kind, map, diff) { return kind === 'mega' ? _socInvite24.call(this, to, 'coop', 'mega:' + map, diff).then(r => Object.assign({}, r, { kind: 'mega', map })) : _socInvite24.apply(this, arguments); };
const _socRpc24 = SOC.rpc;
SOC.rpc = async function (fn, args) {
  const r = await _socRpc24.apply(this, arguments);
  if (fn === 'my_social' && r) { (r.invites || []).forEach(megaDecode); (r.sent || []).forEach(megaDecode); }
  if (fn === 'invite_respond' && r && r.ok) megaDecode(r);
  return r;
};
function megaTeamOk() { return Store.data.team.some(id => HERO[id] && rarAtLeast(HERO[id].rarity, 'ultra')); }
function megaTeamInfo() { const t = Store.data.team.map(id => HERO[id]).filter(Boolean); return { ultra: t.filter(H => H.rarity === 'ultra').length, secret: t.filter(H => H.rarity === 'secret').length }; }
const _openInv24 = openInviteDialog;
openInviteDialog = function (friendId, kind) {
  _openInv24.apply(this, arguments);
  if (kind !== 'mega') return;
  const k = document.querySelector('.mp-dialog .kicker'), p = document.querySelector('.mp-dialog p.muted'), I = megaTeamInfo();
  if (k) k.textContent = 'Samen · eindbaas';
  if (p) p.innerHTML = `Jullie vechten samen tegen <b>De Oerverslinder</b>, een gigantische baas die heel langzaam naar jullie basis loopt. Jullie krijgen 45 seconden en veel geld om te bouwen.
    <br><br><b>Fase 2</b>: alleen <b style="color:${rarColor('ultra')}">Ultra</b>- en <b>Secret</b>-helden kunnen hem raken. <b>Fase 3</b>: alleen <b>Secret</b>-helden kunnen het Oerschild breken.
    <br><br>Winst: heel veel munten, gems en Reroll Tokens + een gegarandeerde hoge trait.
    <br><span class="mega-req ${I.ultra + I.secret ? 'ok' : 'bad'}">Jouw team: ${I.ultra} Ultra · ${I.secret} Secret${I.ultra + I.secret ? '' : ' — je hebt minstens 1 Ultra of Secret nodig'}</span>`;
  const send = document.querySelector('.mp-dialog [data-act="inv-send"]'); if (send && !megaTeamOk()) { send.disabled = true; send.title = 'Zet minstens 1 Ultra- of Secret-held in je team'; }
};
const _invAccept24 = ACTIONS['inv-accept'];
ACTIONS['inv-accept'] = b => {
  const inv = ((SOC.data && SOC.data.invites) || []).find(i => i.id === b.dataset.id);
  if (inv && inv.kind === 'mega' && !megaTeamOk()) { toast('Voor de Megabaas heb je minstens 1 Ultra- of Secret-held in je team nodig.', 'bad'); Sfx.play('error'); return; }
  return _invAccept24(b);
};
const _join24 = MP.join;
MP.join = function (inv, role, opp) { return _join24.call(this, megaDecode(Object.assign({}, inv)), role, opp); };
// vriendenlijst: knop "Megabaas" naast Race en Co-op
const _renderFriends24 = renderFriends;
renderFriends = function () {
  const r = _renderFriends24.apply(this, arguments);
  document.querySelectorAll('#scr-friends [data-act="fr-invite"][data-k="coop"]').forEach(b => {
    if (b.nextElementSibling && b.nextElementSibling.dataset.k === 'mega') return;
    const m = document.createElement('button'); m.className = 'btn btn-sm btn-mega'; m.dataset.act = 'fr-invite'; m.dataset.id = b.dataset.id; m.dataset.k = 'mega'; m.textContent = 'Megabaas'; m.title = 'Samen tegen een gigantische eindbaas'; b.after(m);
  });
  return r;
};
// starten: mega = co-op met de megabaas-regels
const _startMatch24 = startMatch;
startMatch = function (o) {
  if (o && o.mode === 'mega') o = Object.assign({}, o, { mode: 'coop2', mega: true });
  if (o && o.mp && o.mp.kind === 'mega') o = Object.assign({}, o, { mode: 'coop2', mega: true });
  return _startMatch24.call(this, o);
};
const _modeLabel24 = modeLabel;
modeLabel = function (g) { return megaOn(g) ? `Megabaas met ${(g.mp || g.opts.mp || { opp: { name: '' } }).opp.name}` : _modeLabel24(g); };

/* ---------- spelregels ---------- */
const _initExt24 = Game.prototype.initExt3;
Game.prototype.initExt3 = function () {
  _initExt24.call(this);
  if (megaOn(this)) { this.totalWaves = 1; this.cash = MEGA.startCash; this.megaMin = 1; this.megaPhase = 0; }
};
const _genWave24 = Game.prototype.genWave;
Game.prototype.genWave = function (n) { return megaOn(this) ? [] : _genWave24.call(this, n); };
const _startWave24 = Game.prototype.startWave;
Game.prototype.startWave = function () {
  if (!megaOn(this)) return _startWave24.apply(this, arguments);
  if (this.wave > 0 || this.over) return;
  const r = _startWave24.apply(this, arguments);
  if (megaHost(this) && this.wave === 1) megaSpawn(this);
  this.autoT = -1;
  return r;
};
function megaSpawn(g) {
  const e = g.spawnEnemy('megabaas', -30, 30);
  e.megaBoss = true; e.hp = e.maxHp = Math.round(MEGA.hp * megaDiffMult(g));
  e.armor = MEGA.armor * (0.8 + g.diff.hp * 0.2); e.shield = e.maxShield = 0; e.ccImm = true;
  e.speed = g.pathLen / TILE / MEGA.walkTime; e.baseSpeed = e.speed; e.reward = 0;
  g.megaBoss = e; g.minionT = 6; g.stompT = MEGA.stompEvery; g.megaPhase = 1;
  g.banners = []; if (g.mpEv) g.mpEv = g.mpEv.filter(v => !(v[0] === 'b' && /^Golf /.test(v[1])));
  g.banner('DE OERVERSLINDER', 'De Megabaas komt eraan. Hou hem tegen!', '#ef4444'); g.shake(14); Sfx.play('boss');
}
// host: elke tick
const _update24 = Game.prototype.update;
Game.prototype.update = function (dt) {
  const r = _update24.call(this, dt);
  if (!megaOn(this) || this.over) return r;
  this.autoWave = false; this.autoDirect = false;
  const b = this.enemies.find(e => e.type === 'megabaas' && !e.dead);
  if (b) this.megaMin = Math.min(this.megaMin, Math.max(0, b.hp / b.maxHp));
  if (!megaHost(this)) return r;
  if (this.wave === 0) { if (this.megaPrepSet !== true) { this.megaPrepSet = true; this.autoT = MEGA.prep; } return r; }
  // inkomen voor allebei
  this.megaIncT = (this.megaIncT || MEGA.incomeEvery) - dt;
  if (this.megaIncT <= 0) { this.megaIncT += MEGA.incomeEvery; this.cash += MEGA.income; if (this.cash2 != null) this.cash2 += MEGA.income; }
  if (!b) return r;
  b.megaBudget = Math.min(megaCapBase() * MEGA.dpsCap * 2, (b.megaBudget == null ? 0 : b.megaBudget) + megaCapBase() * MEGA.dpsCap * dt);
  const f = b.hp / b.maxHp, ph = megaPhaseOf(f);
  if (ph > this.megaPhase) {
    this.megaPhase = ph; this.shake(16); Sfx.play('boss');
    if (ph === 2) this.banner('KOSMISCH PANTSER', 'Alleen Ultra- en Secret-helden kunnen hem nog raken!', '#fde68a');
    if (ph === 3) { this.banner('OERSCHILD', 'Alleen Secret-helden kunnen hem nog raken!', '#f5f5f5'); this.flash = { color: '#ffffff', life: 0.5, max: 0.5 }; }
    for (let i = 0; i < 6; i++) this.spawnEnemy(i % 2 ? 'tank' : 'juggernaut', Math.max(-10, b.d - 30 - i * 18), 26 + ph * 6);
  }
  // woede in fase 3: iets sneller
  b.speed = b.baseSpeed * (ph === 3 ? 1.35 : 1);
  // aardbeving: helden in de buurt verdoofd
  this.stompT -= dt;
  if (this.stompT <= 0) {
    this.stompT = MEGA.stompEvery * (ph === 1 ? 1 : 0.8); const R = MEGA.stompR * TILE * (ph === 3 ? 1.3 : 1); let n = 0;
    for (const h of this.heroes) if ((h.x - b.x) ** 2 + (h.y - b.y) ** 2 <= R * R) { h.stunT = Math.max(h.stunT, MEGA.stompStun); n++; }
    this.fx.ring(b.x, b.y, R, '#ef4444', 0.7, 8); this.shake(10); Sfx.play('boom');
    if (n) this.floatText(b.x, b.ay - b.r - 30, `AARDBEVING · ${n} helden verdoofd`, '#fca5a5', 18, 1.4);
  }
  // escortes
  this.minionT -= dt;
  if (this.minionT <= 0) {
    this.minionT = MEGA.minionEvery * (ph === 1 ? 1 : 0.8);
    const pool = (this.map.pool || ['grunt', 'runner', 'tank']).filter(t => ENEMIES[t] && !ENEMIES[t].boss), w = 22 + ph * 6;
    for (let i = 0; i < 6 + ph * 2; i++) this.spawnEnemy(pool[i % pool.length], -10 - i * 16, w);
  }
  return r;
};
// schade op de megabaas: fase-regels + maximum per treffer
const _damage24 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h, o = {}) {
  if (!e || !e.megaBoss) return _damage24.call(this, e, amt, h, o);
  const ph = megaPhaseOf(e.hp / e.maxHp), rar = h && h.def ? h.def.rarity : null;
  let m = 1;
  if (ph === 2 && !(rar && rarAtLeast(rar, 'ultra'))) m = MEGA.armorMult;
  if (ph === 3 && rar !== 'secret') m = 0;
  if (m === 0) {
    if ((this.megaImmT || 0) < this.time) { this.megaImmT = this.time + 1.2; this.floatText(e.x + rnd(-20, 20), e.ay - e.r - 10, ph === 3 ? 'OERSCHILD · alleen Secret' : 'PANTSER · alleen Ultra & Secret', ph === 3 ? '#e5e7eb' : '#fde68a', 15, 0.8); }
    return 0;
  }
  // tijdelijke buffer: zo kan geen enkele treffer (ook %-schade) hem in één keer te ver omlaag halen
  const hp0 = e.hp, buf = e.maxHp; e.hp += buf;
  const r = _damage24.call(this, e, amt * m, h, o);
  const dealt = Math.max(0, hp0 + buf - e.hp), cap = megaCapBase() * MEGA.hitCap, real = Math.max(0, Math.min(dealt, cap, e.megaBudget == null ? cap : e.megaBudget));
  e.hp = hp0 - real; if (e.megaBudget != null) e.megaBudget -= real;
  if (real < dealt && dealt > 0) this.megaCapped = (this.megaCapped || 0) + (dealt - real);
  if (e.hp <= 0 && !e.dead) { e.megaKillOk = true; this.kill(e, h); }
  return Math.min(r, real);
};
// gewonnen zodra de megabaas valt
const _kill24 = Game.prototype.kill;
Game.prototype.kill = function (e, h) {
  if (e.megaBoss && !e.megaKillOk) return; // alleen via de (begrensde) schade hierboven
  const was = e.dead; _kill24.call(this, e, h);
  if (!was && e.dead && e.megaBoss && megaHost(this) && !this.over) {
    this.megaMin = 0; this.fx.burst(e.x, e.ay, '#fde68a', 80, 320, 5, 1.4, 'glow'); this.shake(24);
    for (const o of this.enemies) if (!o.dead && o !== e) { o.hp = 0; o.dead = true; }
    this.cleared = 1; this.win();
  }
};
// tekenen: aura per fase (werkt ook bij de gast; fase volgt uit het HP)
const _drawEnemy24 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  if (e.type === 'megabaas') {
    const ph = megaPhaseOf(e.hp / e.maxHp), r = e.r;
    ctx.save(); ctx.translate(e.x, e.y); ctx.globalCompositeOperation = 'lighter';
    const col = ph === 1 ? '#ef4444' : ph === 2 ? '#fde68a' : '#ffffff';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = rgba(col, 0.35 - i * 0.08); ctx.lineWidth = 4; circle(ctx, 0, 0, r * (1.5 + i * 0.25) + Math.sin(t * 3 + i) * 4); ctx.stroke(); }
    if (ph === 3) { ctx.fillStyle = rgba('#ffffff', 0.12 + Math.sin(t * 6) * 0.05); circle(ctx, 0, 0, r * 1.7); ctx.fill(); }
    ctx.restore();
  }
  return _drawEnemy24.call(this, ctx, e, t);
};
const _bossBar24 = Game.prototype.drawBossBar;
Game.prototype.drawBossBar = function (ctx) {
  _bossBar24.call(this, ctx);
  const b = megaOn(this) && this.enemies.find(e => e.type === 'megabaas' && !e.dead); if (!b) return;
  const ph = megaPhaseOf(b.hp / b.maxHp), w = 420, x = GW / 2 - w / 2, y = 14;
  ctx.fillStyle = '#fde68a'; ctx.fillRect(x + w * MEGA.phase2 - 1, y + 14, 2, 16); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + w * MEGA.phase3 - 1, y + 14, 2, 16);
  ctx.font = "700 13px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = ph === 1 ? '#fca5a5' : ph === 2 ? '#fde68a' : '#ffffff';
  ctx.fillText(ph === 1 ? 'Fase 1 · Aardbevingen' : ph === 2 ? 'Fase 2 · Kosmisch pantser: alleen Ultra & Secret' : 'Fase 3 · Oerschild: alleen Secret', GW / 2, y + 31);
};
// knop en voorbereiding in de HUD
const _hud24 = hudUpdate;
hudUpdate = function () {
  _hud24.apply(this, arguments);
  const g = App.game; if (!megaOn(g)) return;
  const sb = document.getElementById('h-start'); if (!sb || g.over) return;
  const b = g.enemies.find(e => e.type === 'megabaas' && !e.dead);
  if (b && b.maxHp > 0) g.megaMin = Math.min(g.megaMin == null ? 1 : g.megaMin, Math.max(0, b.hp / b.maxHp));
  const txt = g.wave === 0 ? (g.autoT > 0 ? `Megabaas over ${Math.ceil(g.autoT)}s · nu starten` : 'Laat de Megabaas komen') : b ? `Megabaas ${Math.ceil(b.hp / b.maxHp * 100)}%` : 'Megabaas…';
  if (sb.textContent !== txt) sb.textContent = txt; const dis = g.wave > 0; if (sb.disabled !== dis) sb.disabled = dis;
  const au = document.getElementById('h-auto'); if (au && !au.hidden) au.hidden = true;
};

/* ---------- beloningen ---------- */
const _finish24 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  if (!megaOn(g)) return _finish24.call(this, g);
  g._mpRew = true; // gewone co-op-beloning overslaan
  const R = _finish24.call(this, g);
  if (g._megaRew) return R; g._megaRew = true;
  const win = !!(g.result && g.result.win), pct = win ? 1 : Math.max(0, 1 - (g.megaMin == null ? 1 : g.megaMin)), dm = MEGA_DIFF_REWARD(g.diffIdx);
  let coins, gems, tokens;
  if (win) { coins = Math.round(30000 * dm); gems = Math.round(400 * dm); tokens = Math.round(25 * dm); R.rows.push(['De Oerverslinder verslagen!', coins]); }
  else { coins = Math.round(12000 * dm * pct); gems = Math.round(120 * dm * pct); tokens = Math.floor(8 * dm * pct); R.rows.push([`Schade aan de Megabaas (${Math.round(pct * 100)}%)`, coins]); }
  if (gems) R.rows.push(['Gems', `+${fmt(gems)}`]); if (tokens) R.rows.push(['Reroll Tokens (traits)', `+${tokens}`]);
  const lines = this.grant({ coins, gems, tokens }); R.coins += coins; if (lines && lines.length) R.lines.push(...lines.filter(l => !R.lines.includes(l)));
  if (win) { Store.data.traitPity = Math.max(Store.data.traitPity || 0, TRAIT_PITY - 1); R.rows.push(['Bonus', 'Volgende trait-reroll: gegarandeerd Legendary of beter']); Store.data.stats.megaWins = (Store.data.stats.megaWins || 0) + 1; }
  Store.save(); return R;
};
