/* =====================================================================
   v1.30
   - Boss Rush: 23 bazen in plaats van 12 (alle gewone en event-bazen,
     geen raidbazen). De moeilijkheid is uitgerekt: de laatste baas is even
     sterk als de oude laatste baas, escortes groeien even geleidelijk.
     Veel meer beloningen.
   - Trekken gebruikt automatisch eerst je tickets van die gacha.
   - Mystery-held Rafael Verbrand (Limited Gacha): vuur, en een brandbom
     die het hele pad in de fik zet (lange cooldown).
   ===================================================================== */

/* ---------- Boss Rush ---------- */
const BR_OLD_LEN = 12;
BOSSRUSH.splice(0, BOSSRUSH.length, 'chaos', 'wyrm', 'kolos', 'pompoenkoning', 'netrunner', 'haai', 'antiheld', 'lawine', 'taart', 'krampus', 'magmatitan', 'overlord',
  'spiegelkoning', 'moederbrein', 'stormkoning', 'anubis', 'kerkermeester', 'hydra', 'stationai', 'tijdvreter', 'omegachaos', 'kerkerheer', 'chaoskoning');
const BR_K = (BR_OLD_LEN - 1) / (BOSSRUSH.length - 1); // zelfde eind-moeilijkheid over meer fases
// meer fases, zelfde curve: escortes per fase en hun HP uitgerekt
Game.prototype.genBossRush = function (n) {
  const rng = mulberry32(n * 131 + 7), out = [], esc = ['grunt', 'runner', 'tank', 'shield'], m = Math.max(1, Math.round(1 + (n - 1) * BR_K));
  for (let i = 0; i < 3 + m * 2; i++) out.push({ type: esc[Math.floor(rng() * Math.min(esc.length, 1 + Math.ceil(m / 2)))], gap: 0.45 });
  out.push({ type: '__pause', gap: 1.2 }); out.push({ type: BOSSRUSH[n - 1], gap: 1, stage: n });
  return out;
};
const _spawn31 = Game.prototype.spawnEnemy;
Game.prototype.spawnEnemy = function (type, d, waveN) {
  const e = _spawn31.apply(this, arguments);
  if (e && this.mode === 'bossrush' && waveN > 1 && !e.E.worldBoss) {
    let r;
    if (e.E.boss) r = (1 + (waveN - 1) * 0.4 * BR_K) / (1 + (waveN - 1) * 0.4);
    else { const want = Math.max(1, Math.round(waveN * 3 * BR_K)); r = this.hpScale(want) / this.hpScale(waveN * 3); }
    e.hp *= r; e.maxHp *= r; e.shield *= r; e.maxShield *= r;
  }
  return e;
};
// veel meer beloningen
const _finish31 = Meta.finishMatch;
Meta.finishMatch = function (g) {
  const R = _finish31.apply(this, arguments);
  if (!g || g.mode !== 'bossrush' || g._br31) return R; g._br31 = true;
  const st = BOSSRUSH.filter(b => g.ms.bossKillsList.includes(b)).length; if (!st) return R;
  const pm = this.prestigeMult() * this.collMult(), full = st >= BOSSRUSH.length;
  let coins = 0; for (let i = 1; i <= st; i++) coins += 260 * i; coins = Math.round(coins * pm);
  const gems = st * 6 + (full ? 150 : 0), tokens = Math.ceil(st / 2) + (full ? 10 : 0), cosmic = Math.floor(st / 6) + (full ? 2 : 0);
  const reward = { coins, gems, tokens }; if (cosmic) reward.tickets = { cosmic };
  this.grant(reward); R.coins += coins;
  R.rows.push([`Boss Rush-bonus (${st} van ${BOSSRUSH.length} bazen)`, coins]);
  R.rows.push(['Extra', `+${gems} gems · +${tokens} Reroll Tokens${cosmic ? ` · +${cosmic} Kosmisch Ticket${cosmic > 1 ? 's' : ''}` : ''}`]);
  if (full) R.rows.push(['Alle bazen verslagen!', 'Kampioen van het Kolosseum']);
  Store.save(); return R;
};

/* ---------- trekken: eerst tickets gebruiken ---------- */
const _doPull31 = doPull;
doPull = function (gid, n, ticket) {
  const g = GACHAS.find(x => x.id === gid), D = Store.data, tk = typeof ticketFor === 'function' ? ticketFor(gid) : null;
  const have = tk ? (D.tickets[tk] || 0) : 0;
  if (ticket || !g || !have || !Progress.gachaUnlocked(g)) return _doPull31.apply(this, arguments);
  const cur = g.currency || 'coins', total = n === 100 ? g.price * 90 : n === 10 ? g.price * 9 : g.price * n, per = total / n;
  const use = Math.min(have, n), credit = Math.round(use * per), need = total - credit;
  if ((D[cur] || 0) < need) return _doPull31.apply(this, arguments); // laat de gewone melding 'te weinig' zien
  D.tickets[tk] -= use; D[cur] = (D[cur] || 0) + credit;
  const r = _doPull31.apply(this, arguments);
  if (use) toast(`${use}× ${TICKETS[tk].name} gebruikt${need > 0 ? `, de rest betaald (${fmt(need)} ${CUR_LABEL[cur]})` : ''}.`, 'good');
  return r;
};
const _renderGacha31 = renderGacha;
renderGacha = function () {
  const r = _renderGacha31.apply(this, arguments);
  const g = GACHAS.find(x => x.id === App.gachaSel) || GACHAS[0], tk = g && ticketFor(g.id), have = tk ? (Store.data.tickets[tk] || 0) : 0;
  const row = document.querySelector('#scr-gacha .pull-row');
  if (row && have && !row.querySelector('.tk-first')) row.insertAdjacentHTML('beforeend', `<span class="muted tk-first" style="flex-basis:100%;font-size:13px">Je ${have} ${esc(TICKETS[tk].name)}${have > 1 ? 's' : ''} worden bij openen eerst gebruikt; je betaalt alleen voor de rest.</span>`);
  return r;
};

/* ---------- Rafael Verbrand (Mystery) ---------- */
HEROES.push({ id: 'rafael', name: 'Rafael Verbrand', rarity: 'mystery', role: 'Area damage', exclusive: 'limited', cap: 1, title: 'Alles wat hij aanraakt, brandt', style: 'projectile', proj: 'fire', cost: 1400,
  desc: 'Schiet vuurballen die ontploffen en vijanden laten branden (ongeveer zo sterk als een Exotic). Zijn ability *Brandbom* zet het hele pad in de fik, maar heeft een lange cooldown.',
  base: { dmg: 85, splash: 1.3, burn: 45, burnDur: 3, range: 4.0, rate: 1.0, multi: 1, air: true, projSpeed: 11 },
  look: { skin: '#e0ac69', suit: '#7c2d12', suit2: '#fb923c', cape: '#b91c1c', hair: 'flame', hairC: '#f97316', emblem: 'flame', weapon: 'grenade' }, fx: 'ember', ability: 'brandbom',
  upgrades: [U('Hete Kolen', 1450, '+40 schade, +20 brand', { dmg: 40, burn: 20 }), U('Grote Knal', 2000, 'Grotere explosies, +0,4 bereik', { splash: 0.4, range: 0.4 }), U('Dubbelvuur', 3400, '+1 vuurbal tegelijk', { multi: 1 }, true), U('Vlammenzee', 4700, '+0,3 snelheid, +60 brand', { rate: 0.3, burn: 60 }), U('Koning van het Vuur', 8200, '+140 schade, +1 vuurbal. ULTIMATE: Inferno', { dmg: 140, multi: 1 }, true)] });
HERO.rafael = HEROES[HEROES.length - 1];
if (typeof MYSTERY_LIMITED !== 'undefined' && !MYSTERY_LIMITED.includes('rafael')) MYSTERY_LIMITED.push('rafael');
ABILITIES.brandbom = { name: 'Brandbom', ult: 'Inferno', cd: 60, desc: 'Een bom die het hele pad 8 seconden in de fik zet: alles erop krijgt veel vuurschade en brandt. Lange cooldown (60 s). ULTIMATE: 12 seconden en nog heter.' };
ABILITY_FX.brandbom = function (g, h, ult) {
  const P = g.fires || (g.fires = []), life = ult ? 12 : 8;
  for (let d = 0; d <= g.leakD; d += 30) { if (P.length >= 120) break; const p = g.posAt(d); P.push({ x: p.x, y: p.y, r: 24, life, max: life, dps: h.st.dmg * (ult ? 3.5 : 2.2), burn: h.st.dmg * (ult ? 0.8 : 0.5), h, seed: Math.random() * 10 }); }
  g.banner(ult ? 'INFERNO' : 'BRANDBOM', 'Het hele pad staat in brand!', '#f97316'); g.shake(10); g.flash = { color: '#f97316', life: 0.3, max: 0.3 }; Sfx.play('boom');
};
const _updExt31 = Game.prototype.updateExt;
Game.prototype.updateExt = function (dt) {
  _updExt31.call(this, dt);
  const P = this.fires; if (!P || !P.length) return;
  this.fireT = (this.fireT || 0) - dt; const hot = this.fireT <= 0; if (hot) this.fireT = 0.25;
  if (hot) { const done = new Set(); for (const f of P) for (const e of this.enemies) { if (e.dead || e.flying || done.has(e.id) || (e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (f.r + e.r * 0.5) ** 2) continue; done.add(e.id); const hh = this.heroes.includes(f.h) ? f.h : null; this.damage(e, f.dps * 0.25, hh, { acc: true, color: '#fb923c' }); if (!e.dead) { e.burnT = Math.max(e.burnT || 0, 2); e.burnD = Math.max(e.burnD || 0, f.burn); } } }
  for (const f of P) f.life -= dt; this.fires = P.filter(f => f.life > 0);
};
const _drawExt31 = Game.prototype.drawExt;
Game.prototype.drawExt = function (ctx, t, under) {
  _drawExt31.call(this, ctx, t, under);
  const P = (this.h6view ? this.h6view : this.fires) || []; if (under || !P.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of P) { const a = Math.min(1, f.life / f.max * 3); for (let i = 0; i < 3; i++) { const fl = Math.sin(t * 9 + f.seed + i * 2) * 4, hgt = 14 + i * 5 + fl; ctx.fillStyle = rgba(i === 0 ? '#fde047' : i === 1 ? '#fb923c' : '#ef4444', 0.35 * a); ctx.beginPath(); ctx.ellipse(f.x + (i - 1) * 7, f.y - hgt / 2 + 4, 6 + i, hgt / 2, 0, 0, TAU); ctx.fill(); } }
  ctx.restore();
};
if (typeof coopSnapshot === 'function') { const _s31 = coopSnapshot; coopSnapshot = function (g) { const p = _s31.apply(this, arguments); if (g.fires && g.fires.length) p.X6 = g.fires.map(f => ({ x: Math.round(f.x), y: Math.round(f.y), r: f.r, life: +f.life.toFixed(2), max: f.max, seed: f.seed })); return p; }; }
if (typeof coopGuestMsg === 'function') { const _m31 = coopGuestMsg; coopGuestMsg = function (g, ev, p) { const r = _m31.apply(this, arguments); if (ev === 'snap' && p) g.h6view = p.X6 || []; return r; }; }
