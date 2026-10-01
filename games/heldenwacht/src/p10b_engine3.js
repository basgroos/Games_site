/* =====================================================================
   ENGINE UITBREIDING 3 — onzichtbare vijanden, elites, dungeon, relikwieën,
   echo/uitwis-aanvallen, nieuwe traits, baas-mechanieken en abilities
   ===================================================================== */
STAT_DEFAULTS.turret = 0; STAT_DEFAULTS.cdPct = 0; STAT_DEFAULTS.upgPct = 0; STAT_DEFAULTS.costPct = 0;

/* ---------- nieuwe trait-statistieken ---------- */
const _applyTraitStats3 = applyTraitStats;
applyTraitStats = function (s, def, T) {
  _applyTraitStats3(s, def, T);
  const m = T.m;
  if (m.costPct) s.costPct = m.costPct;
  if (m.cdPct) s.cdPct += m.cdPct;
  if (m.upgPct) s.upgPct = m.upgPct;
  if (m.detect) s.detect = true;
  if (m.pierceAdd) {
    if (def.style === 'chain' || def.style === 'beam') s.chains += m.pierceAdd;
    else if (def.style === 'melee') s.cleave += 0.4 * m.pierceAdd;
    else if (def.style === 'projectile') s.pierce += m.pierceAdd;
    else s.splash += 0.3 * m.pierceAdd;
  }
};

/* ---------- initialisatie per potje ---------- */
Game.prototype.initExt3 = function () {
  this.R = { dmg: 1, rate: 1, range: 1, cash: this.diff.hp > 2.1 && !this.raid ? Math.sqrt(this.diff.hp / 2.1) : 1, cost: 1, upg: 1, cdPct: 0, shred: 0, detect: false };
  this.relics = []; this.relicOffer = null; this.graveyard = []; this.revealT = 0; this.roomCash = 1;
  this.ms.elites = 0; this.ms.eliteGems = 0; this.ms.rooms = 0;
  this.world = this.map.world || 1;
  if (this.diff.cashPct && !this.raid && this.mode !== 'coop' && this.mode !== 'dungeon') this.cash += Math.round(this.map.startCash * this.diff.cashPct);
  const noElite = this.mode === 'coop' || this.mode === 'bossrush' || !!this.raid;
  this.eliteChance = noElite ? 0 : (this.diff.elite || 0) + (this.world === 2 ? 0.03 : 0);
  if (this.mode === 'dungeon') {
    this.depth = clamp(this.opts.depth || 1, 1, DUNGEON.maxDepth);
    this.totalWaves = (DUNGEON.rooms - 1) * DUNGEON.wavesPerRoom + 1;
    this.eliteChance = 0.02 * this.depth; this.cash += (this.depth - 1) * 200;
    this.rooms = dungeonRooms(this.depth);
  }
};
function dungeonRooms(depth) {
  const rng = mulberry32(depth * 7919 + hashStr(dayKey())), rest = DUNGEON_ROOMS.slice(1).sort(() => rng() - 0.5);
  return [DUNGEON_ROOMS[0], rest[0], rest[1], rest[2], { id: 'troon', name: 'Troonzaal', desc: 'De Kerkerheer wacht.', pool: ['shield', 'tank', 'necro'] }];
}
Game.prototype.roomOf = function (n) { return this.rooms[Math.min(this.rooms.length - 1, Math.floor((n - 1) / DUNGEON.wavesPerRoom))]; };
Game.prototype.genDungeon = function (n) {
  const rng = mulberry32(n * 4231 + this.depth * 977), out = [];
  if (n === this.totalWaves) {
    for (let i = 0; i < 6 + this.depth; i++) out.push({ type: ['shield', 'tank', 'necro'][Math.floor(rng() * 3)], gap: 0.6 });
    out.push({ type: '__pause', gap: 2.5 }); out.push({ type: 'kerkerheer', gap: 1.4 });
    for (let i = 0; i < 6; i++) out.push({ type: ['grunt', 'runner', 'skelet'][Math.floor(rng() * 3)], gap: 0.8 });
    return out;
  }
  const room = this.roomOf(n), local = (n - 1) % DUNGEON.wavesPerRoom;
  const count = Math.round((7 + n * 1.5 + this.depth * 1.2) * (room.count || 1));
  for (let i = 0; i < count; i++) out.push({ type: room.pool[Math.floor(rng() * room.pool.length)], gap: Math.max(0.3, 0.8 - n * 0.02) * (0.8 + rng() * 0.4) * (room.count > 1 ? 0.7 : 1), hpm: room.hp, elite: room.elite });
  if (local === DUNGEON.wavesPerRoom - 1 && n >= 6) out.splice(Math.floor(out.length / 2), 0, { type: ['kolos', 'necro', 'trol'][Math.floor(rng() * 3)], gap: 1.5 });
  return out;
};
const _startWave3 = Game.prototype.startWave;
Game.prototype.startWave = function () {
  const ok = _startWave3.call(this);
  if (ok && this.mode === 'dungeon') {
    const room = this.roomOf(this.wave), ri = Math.floor((this.wave - 1) / DUNGEON.wavesPerRoom);
    this.roomCash = room.cash || 1;
    if ((this.wave - 1) % DUNGEON.wavesPerRoom === 0 || this.wave === this.totalWaves) this.banners[this.banners.length - 1] = { text: room.name, sub: `Diepte ${this.depth} · kamer ${ri + 1} van ${DUNGEON.rooms} · ${room.desc}`, color: '#84cc16', life: 2.4, max: 2.4 };
  }
  return ok;
};

/* ---------- elites ---------- */
Game.prototype.rollElite = function (e, q) {
  if (!e) return;
  if (q && q.hpm) { e.hp *= q.hpm; e.maxHp *= q.hpm; }
  if (e.boss || e.E.worldBoss) return;
  const ch = q && q.elite != null ? q.elite : this.eliteChance;
  if (!(ch > 0) || Math.random() >= ch) return;
  e.elite = true; e.hp *= 2.5; e.maxHp *= 2.5; e.shield *= 2.5; e.maxShield *= 2.5; e.armor += 3; e.reward = Math.round(e.reward * 3); e.r *= 1.18;
};

/* ---------- relikwieën (dungeon) ---------- */
Game.prototype.offerRelic = function () {
  const avail = RELICS.filter(r => !this.relics.includes(r.id)).sort(() => Math.random() - 0.5);
  this.relicOffer = avail.slice(0, 3).map(r => r.id); this.autoT = -1; this.ms.rooms = Math.floor(this.wave / DUNGEON.wavesPerRoom);
  this.banner('Kamer veroverd!', 'Kies een relikwie', '#84cc16'); Sfx.play('bigupgrade');
  this.emit('relic');
};
Game.prototype.chooseRelic = function (id) {
  if (!this.relicOffer || !this.relicOffer.includes(id)) return false;
  const Rl = RELICS.find(r => r.id === id), f = Rl.fx, R = this.R;
  for (const k of ['dmg', 'rate', 'range', 'cash', 'cost', 'upg']) if (f[k]) R[k] *= f[k];
  if (f.cdPct) R.cdPct += f.cdPct; if (f.shred) R.shred += f.shred; if (f.detect) R.detect = true;
  if (f.heal) { this.maxHp += f.heal; this.hp += f.heal; }
  if (f.cashNow) this.cash += f.cashNow;
  this.relics.push(id); this.relicOffer = null; this.panelDirty = true;
  this.floatText(GW / 2, GH / 2, Rl.name, '#bef264', 26, 1.6); this.fx.ring(this.base.x, this.base.y, 80, '#84cc16', 0.7, 6);
  if (this.autoWave) this.autoT = 1.5;
  return true;
};

/* ---------- onzichtbaarheid ---------- */
Game.prototype.revealPass = function (dt) {
  if (this.revealT > 0) this.revealT -= dt;
  if (!this.hasInvis) return;
  const near2 = (1.6 * TILE) ** 2;
  for (const e of this.enemies) {
    if (!e.invis) continue;
    if (this.revealT > 0 || this.R.detect) { e.revealed = true; continue; }
    let r = false;
    for (const h of this.heroes) {
      const d2 = (h.x - e.x) ** 2 + (h.y - e.y) ** 2;
      if (d2 < near2) { r = true; break; }
      if (h.st && h.st.detect && h.stunT <= 0) { const R = h.st.range * TILE; if (d2 <= R * R) { r = true; break; } }
    }
    e.revealed = r;
  }
};

/* ---------- echo-aanvallen en uitwissen ---------- */
Game.prototype.echoAttack = function (h, ts, st) {
  const n = st.echo >= 3 ? 3 : 1, mult = st.echo >= 2 ? 1 : 0.6, list = ts.slice();
  for (let k = 0; k < n; k++) this.after(0.3 + k * 0.22, () => {
    if (!this.heroes.includes(h) || this.over) return;
    list.forEach((e, i) => {
      if (e.dead) return;
      if (h.def.style === 'strike') this.effects.push({ type: 'strike', target: e, x: e.x, y: e.y, delay: 0.15, h, st, dmg: st.dmg * mult, kind: h.def.strike, color: '#22d3ee', life: 0.15, max: 0.15 });
      else this.fireProjectile(h, e, st, i, { dmg: st.dmg * mult, kind: 'echo' });
    });
    this.fx.ring(h.x, h.y - 8, 24, k % 2 ? '#f43f5e' : '#22d3ee', 0.3, 2);
  });
};
Game.prototype.eraseFx = function (e) {
  for (let i = 0; i < 14; i++) this.fx.add({ type: 'dot', x: e.x + rnd(-e.r, e.r), y: e.ay + rnd(-e.r, e.r), vx: rnd(-60, 60), vy: rnd(-60, 20), size: rnd(2, 4), color: i % 2 ? '#0a0a0a' : '#fafafa', life: 0.5 });
  this.fx.ring(e.x, e.ay, e.r * 2, '#fafafa', 0.3, 3);
  if (Math.random() < 0.5) this.floatText(e.x, e.ay - e.r - 10, 'UITGEWIST', '#fafafa', 13, 0.7);
};
const STRIKE_FX = {
  orbital(g, f, st, w) {
    g.effects.push({ type: 'pillar', x: f.x, y: f.y, life: 0.35, max: 0.35, w: w * 0.8 });
    g.fx.ring(f.x, f.y, st.splash * TILE, '#fb923c', 0.4, 5); g.fx.burst(f.x, f.y, '#fdba74', 18, 220, 3, 0.5, 'glow'); g.fx.burst(f.x, f.y, '#52525b', 6, 70, 6, 0.8, 'smoke');
    Sfx.play('boom');
  },
  erase(g, f, st) {
    const R = st.splash * TILE;
    g.addExt({ dur: 0.45, x: f.x, y: f.y, draw(gg, ctx) { const k = this.t / 0.45; ctx.fillStyle = `rgba(10,10,10,${0.85 * (1 - k)})`; circle(ctx, this.x, this.y, R * (0.3 + k * 0.7)); ctx.fill(); ctx.strokeStyle = `rgba(250,250,250,${1 - k})`; ctx.lineWidth = 3; circle(ctx, this.x, this.y, R * (0.3 + k * 0.7)); ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? `rgba(34,211,238,${1 - k})` : `rgba(244,63,94,${1 - k})`; ctx.fillRect(this.x + Math.sin(i * 9.1 + k * 20) * R, this.y + Math.cos(i * 7.3) * R * 0.6, 10 + i * 2, 3); } } });
    Sfx.play('void');
  },
};

/* ---------- vijand-gedrag ---------- */
const _enemyTraits3 = Game.prototype.enemyTraits;
Game.prototype.enemyTraits = function (e, dt) {
  const E = e.E, hp0 = e.hp;
  _enemyTraits3.call(this, e, dt);
  if (E.fireStops && e.burnT > 0 && e.hp > hp0) e.hp = hp0;
  if (E.summons && tickAb(e, 'sum', 5, 3, dt)) { for (let i = 0; i < 2; i++) this.spawnEnemy(E.summons, Math.max(-10, e.d - 12 - i * 14), e.wave); this.fx.burst(e.x, e.y + 6, '#16a34a', 14, 110, 3, 0.5, 'smoke'); }
  if (E.shieldAura && tickAb(e, 'sa', 4.5, 2, dt)) {
    for (const o of this.enemiesIn(e.x, e.y, 2 * TILE, true)) { if (o.boss) continue; const s = o.maxHp * 0.3; if (o.shield < s) { o.shield = s; o.maxShield = Math.max(o.maxShield, s); } }
    this.fx.ring(e.x, e.y, 2 * TILE, '#38bdf8', 0.5, 3);
  }
  if (E.healAura && tickAb(e, 'ha', 2, 1.5, dt)) {
    let n = 0; for (const o of this.enemiesIn(e.x, e.y, 2 * TILE, true)) { if (o === e || o.hp >= o.maxHp) continue; o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o.boss ? 0.01 : 0.06)); n++; }
    e.healPulse = 1; if (n) this.fx.ring(e.x, e.y, 2 * TILE, '#fde68a', 0.5, 3);
  }
  if (E.hacks) {
    e.ab.hk = (e.ab.hk || 0) - dt;
    if (e.ab.hk <= 0) { const h = heroesNear(this, e.x, e.y, 1.3 * TILE).find(x => x.stunT <= 0); if (h) { e.ab.hk = 4; disableHero(this, h, 1.6, 'hack'); lineFx(this, () => (e.dead ? null : { x: e.x, y: e.ay }), () => ({ x: h.x, y: h.y - 8 }), '#a855f7', 0.4, 'beam'); Sfx.play('zap'); } }
  }
};
const _onEnemyDeath3 = Game.prototype.onEnemyDeath;
Game.prototype.onEnemyDeath = function (e, h) {
  _onEnemyDeath3.call(this, e, h);
  if (e.elite) { this.ms.elites++; if (Math.random() < 0.25) { this.ms.eliteGems++; this.floatText(e.x, e.ay - 30, '+1 gem', '#5eead4', 14, 1); this.fx.burst(e.x, e.ay, '#5eead4', 10, 120, 3, 0.6, 'star'); } }
  if (!e.boss && !e.E.worldBoss) { this.graveyard.push({ type: e.type, wave: e.wave }); if (this.graveyard.length > 30) this.graveyard.shift(); }
  if (h && h.trait && h.trait.m.proc === 'reap' && this.heroes.includes(h)) {
    let best = null, bd = (3.5 * TILE) ** 2;
    for (const o of this.enemies) { if (o.dead || o === e || (o.invis && !o.revealed)) continue; const d2 = (o.x - e.x) ** 2 + (o.y - e.y) ** 2; if (d2 < bd) { bd = d2; best = o; } }
    if (best) { this.fireProjectile(h, best, h.st, 0, { dmg: h.st.dmg * 2.5, kind: 'phantom', speed: 10 }); const p = this.proj[this.proj.length - 1]; p.x = p.sx = e.x; p.y = p.sy = e.ay; p.splash = 0; p.pierce = 0; p.color = '#e9d5ff'; }
  }
};

/* ---------- nieuwe trait-procs ---------- */
const _traitProc3 = Game.prototype.traitProc;
Game.prototype.traitProc = function (h, e, dealt, o) {
  const P = h.trait.m.proc;
  switch (P) {
    case 'minichain': if (Math.random() < 0.15) { const list = this.enemiesIn(e.x, e.y, 2 * TILE, true).filter(x => x !== e).slice(0, 2); for (const x of list) this.damage(x, dealt * 0.6, h, { noProc: true, color: '#fde047' }); if (list.length) this.effects.push({ type: 'lightning', pts: [{ x: e.x, y: e.ay }, ...list.map(x => ({ x: x.x, y: x.ay }))], color: '#fde047', life: 0.18, max: 0.18, w: 1.5 }); } return;
    case 'minifreeze': if (Math.random() < 0.06) { e.stunT = Math.max(e.stunT, e.boss ? 0.3 : 1); this.fx.burst(e.x, e.ay, '#e0f2fe', 8, 100, 3, 0.4, 'snow'); } return;
    case 'echo': { const d = dealt * 0.5; this.after(0.5, () => { if (e.dead || this.over) return; this.damage(e, d, h, { noProc: true, color: '#22d3ee' }); this.fx.ring(e.x, e.ay, 14, '#22d3ee', 0.25, 2); }); return; }
    case 'gravity': if (!e.E.worldBoss) { e.d = Math.max(-20, e.d - (e.boss ? 0.04 : 0.22) * TILE); if (Math.random() < 0.3) this.fx.add({ type: 'glow', x: e.x, y: e.ay, vx: rnd(-20, 20), vy: rnd(-20, 20), size: 3, color: '#a78bfa', life: 0.4 }); } return;
    case 'armageddon': if (Math.random() < 0.1) { for (let i = 0; i < 3; i++) { const x0 = e.x + rnd(-40, 40), y0 = e.ay + rnd(-30, 30); this.after(i * 0.12, () => dropFx(this, x0, y0, 'comet', 0.35, g => { g.hitArea(x0, y0, 1.1 * TILE, dealt * 1.5, h, null, { air: true, noProc: true, color: '#f97316' }); g.fx.ring(x0, y0, 1.1 * TILE, '#f97316', 0.35, 4); g.fx.burst(x0, y0, '#fdba74', 12, 180, 3, 0.4, 'glow'); Sfx.play('boom'); })); } } return;
    case 'timestop': if (Math.random() < 0.08) { for (const x of this.enemiesIn(e.x, e.y, 2 * TILE, true)) x.stunT = Math.max(x.stunT, x.boss ? 0.4 : 1.5); this.fx.ring(e.x, e.y, 2 * TILE, '#fcd34d', 0.6, 4); this.effects.push({ type: 'implode', x: e.x, y: e.y, r: 2 * TILE, color: '#fcd34d', life: 0.5, max: 0.5 }); this.floatText(e.x, e.ay - 30, 'TIJDSTOP', '#fcd34d', 14, 0.8); } return;
    case 'reap': return;
  }
  _traitProc3.call(this, h, e, dealt, o);
};

/* ---------- baas-mechanieken wereld 2 en dungeon ---------- */
Object.assign(BOSS_AB, {
  hackwave(g, e, dt) {
    if (!tickAb(e, 'hw', 9, 4, dt)) return;
    const hs = heroesNear(g, e.x, e.y, 4.5 * TILE).sort(() => Math.random() - 0.5).slice(0, 3);
    for (const h of hs) { lineFx(g, () => (e.dead ? null : { x: e.x, y: e.ay }), () => ({ x: h.x, y: h.y - 8 }), '#f0abfc', 0.5, 'beam'); disableHero(g, h, 2.5, 'hack'); }
    if (hs.length) { g.floatText(e.x, e.y - 55, 'GEHACKT!', '#f0abfc', 18, 1); Sfx.play('zap'); }
  },
  cloak(g, e, dt) {
    if (e.cloakT > 0) { e.cloakT -= dt; if (e.cloakT <= 0) { e.invis = !!e.E.invisible; g.fx.burst(e.x, e.ay, '#f0abfc', 16, 140, 3, 0.4, 'spark'); } }
    if (!tickAb(e, 'ck', 12, 7, dt)) return;
    e.cloakT = 3.5; e.invis = true; g.hasInvis = true; g.fx.burst(e.x, e.ay, '#94a3b8', 24, 140, 4, 0.5, 'smoke'); g.floatText(e.x, e.y - 55, 'ONZICHTBAAR', '#cbd5e1', 16, 1); Sfx.play('void');
  },
  chillaura(g, e, dt) {
    const R = 3 * TILE;
    for (const h of heroesNear(g, e.x, e.y, R)) { h.chillT = 0.3; if (Math.random() < dt * 3) g.fx.add({ type: 'snow', x: h.x + rnd(-12, 12), y: h.y - 20, vy: 20, size: 2.5, color: '#e0f2fe', life: 0.6, drag: 0 }); }
    if (Math.random() < dt * 12) { const a = rnd(0, TAU); g.fx.add({ type: 'snow', x: e.x + Math.cos(a) * R, y: e.y + Math.sin(a) * R * 0.6, vx: -Math.cos(a) * 30, vy: -Math.sin(a) * 20, size: 3, color: '#bae6fd', life: 0.9, drag: 0 }); }
  },
  summonWolf(g, e, dt) { if (!tickAb(e, 'sw', 7, 4, dt)) return; for (let i = 0; i < 3; i++) g.spawnEnemy('ijswolf', Math.max(-10, e.d - 16 - i * 14), e.wave); g.floatText(e.x, e.y - 55, 'ROEDEL!', '#bae6fd', 16, 1); Sfx.play('freeze'); },
  molten(g, e, dt) {
    if (e.moltenT > 0) { e.moltenT -= dt; if (Math.random() < dt * 25) g.fx.add({ type: 'glow', x: e.x + rnd(-e.r, e.r), y: e.ay + rnd(-e.r, e.r * 0.5), vy: -50, size: 4, color: '#fb923c', life: 0.5, drag: 0 }); if (e.moltenT <= 0) e.armor = e.ab.baseArmor; }
    if (!tickAb(e, 'mt', 11, 6, dt)) return;
    if (e.ab.baseArmor == null) e.ab.baseArmor = e.armor;
    e.armor = e.ab.baseArmor * 3; e.moltenT = 4; g.floatText(e.x, e.y - 55, 'GLOEIEND HEET', '#fb923c', 17, 1.1); g.fx.ring(e.x, e.y, 60, '#f97316', 0.6, 6); Sfx.play('fire');
  },
  summonTrol(g, e, dt) { if (!tickAb(e, 'str', 12, 6, dt)) return; g.spawnEnemy('trol', Math.max(-10, e.d - 20), e.wave); g.fx.burst(e.x, e.y, '#4d7c0f', 20, 140, 4, 0.5, 'smoke'); },
  broodling(g, e, dt) { if (!tickAb(e, 'bl', 6, 3, dt)) return; for (let i = 0; i < 2; i++) g.spawnEnemy('xenolarve', Math.max(-10, e.d - 14 - i * 14), e.wave); g.fx.burst(e.x, e.y + 8, '#84cc16', 16, 120, 3, 0.5, 'glow'); },
  psychic(g, e, dt) {
    if (!tickAb(e, 'ps', 10, 5, dt)) return;
    const hs = g.heroes.filter(h => !h.temp).sort((a, b) => b.dmg - a.dmg).slice(0, 2);
    for (const h of hs) { lineFx(g, () => (e.dead ? null : { x: e.x, y: e.ay - e.r }), () => ({ x: h.x, y: h.y - 10 }), '#e879f9', 0.6, 'beam'); disableHero(g, h, 2.2, 'gedachten'); }
    if (hs.length) { g.floatText(e.x, e.y - 60, 'GEDACHTENGOLF', '#e879f9', 17, 1); g.effects.push({ type: 'tint', color: '#701a75', alpha: 0.25, life: 0.5, max: 0.5 }); Sfx.play('void'); }
  },
  resurrect(g, e, dt) {
    if (!tickAb(e, 'rz', 10, 6, dt) || !g.graveyard.length) return;
    const list = g.graveyard.splice(-4);
    list.forEach((x, i) => { const n = g.spawnEnemy(x.type, Math.max(-10, e.d - 18 - i * 16), x.wave); n.hp = n.maxHp * 0.5; g.effects.push({ type: 'pillar', x: n.x, y: n.y, life: 0.5, max: 0.5, w: 0.4 }); });
    g.floatText(e.x, e.y - 60, 'ONTWAAK!', '#fbbf24', 18, 1.1); Sfx.play('cosmic');
  },
  genshield(g, e, dt) { if (!tickAb(e, 'gs', 14, 8, dt)) return; for (let i = 0; i < 2; i++) g.spawnEnemy('schildgen', Math.max(-10, e.d - 16 - i * 18), e.wave); g.fx.ring(e.x, e.y, 70, '#38bdf8', 0.6, 5); },
});

/* ---------- tijdelijke helpers (torens en drones) ---------- */
Game.prototype.spawnHelpers = function (h, id, n, dur, dmgMul) {
  const R = 3 * TILE, pts = []; for (let d = 0; d < this.pathLen; d += 25) pts.push(this.posAt(d));
  const cand = this.freeTiles.filter(([x, y]) => this.tileFree(x, y)).map(([x, y]) => { const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2; let sc = 0; for (const p of pts) if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < R * R) sc++; return { x, y, sc: sc - Math.sqrt((cx - h.x) ** 2 + (cy - h.y) ** 2) / TILE * 1.5 }; })
    .sort((a, b) => b.sc - a.sc).slice(0, n);
  for (const c of cand) {
    const u = this.makeHero(id, c.x, c.y, h.level); u.temp = dur; u.abilCd = 999; u.buffs.push({ dmgMul, t: dur + 1 }); u.st = this.heroStats(u); this.heroes.push(u);
    this.fx.burst(u.x, u.y - 8, h.look.suit2, 20, 150, 3, 0.5, 'spark'); this.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 10 }, { x: u.x, y: u.y - 10 }], color: h.look.suit2, life: 0.35, max: 0.35, w: 2 });
  }
  return cand.length;
};

/* ---------- nieuwe hero-abilities ---------- */
const noTarget = (g, h) => g.floatText(h.x, h.y - 30, 'Geen doel', '#ffffff', 14, 0.8);
Object.assign(ABILITY_FX, {
  megabounce(g, h, ult) {
    const ts = g.findTargets(h, h.st.range * TILE * 1.4, ult ? 3 : 1); if (!ts.length) return noTarget(g, h);
    ts.forEach((e, i) => { g.fireProjectile(h, e, h.st, i, { dmg: h.st.dmg * (ult ? 4 : 3), kind: 'ball', speed: 16 }); const p = g.proj[g.proj.length - 1]; p.pierce = ult ? 12 : 8; p.big = true; p.st = Object.assign({}, h.st, { knock: 0.3 }); });
    g.fx.burst(h.x, h.y - 10, '#fb7185', 16, 160, 3, 0.4, 'dot'); Sfx.play('shoot');
  },
  lassopull(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.5, h.st.air).filter(e => !(e.invis && !e.revealed)).sort((a, b) => b.d - a.d).slice(0, ult ? 6 : 3);
    if (!list.length) return noTarget(g, h);
    for (const e of list) {
      lineFx(g, () => ({ x: h.x, y: h.y - 10 }), () => (e.dead ? null : { x: e.x, y: e.ay }), '#a16207', 0.5, 'tentacle');
      g.damage(e, h.st.dmg * 4, h, { color: '#fde68a' });
      if (!e.dead && !e.E.worldBoss) { e.d = Math.max(-20, e.d - (ult ? 5 : 3) * TILE * (e.boss ? 0.2 : 1)); e.stunT = Math.max(e.stunT, e.boss ? 0.3 : 1); }
    }
    g.floatText(h.x, h.y - 44, 'JIEHAA!', '#fde68a', 18, 1); Sfx.play('punch');
  },
  swarm(g, h, ult) {
    const list = ult ? g.enemies.filter(e => !e.dead) : g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.6, true);
    for (const e of list) { e.burnD = Math.max(e.burnD, h.st.burn * 2 + h.st.dmg * (ult ? 5 : 3)); e.burnT = Math.max(e.burnT, 5); e.slowM = Math.max(e.slowM, 0.25); e.slowT = Math.max(e.slowT, 3); }
    for (let i = 0; i < (ult ? 90 : 50); i++) { const e = list[i % Math.max(1, list.length)], tx = e ? e.x : h.x + rnd(-80, 80), ty = e ? e.ay : h.y + rnd(-80, 80); g.fx.add({ type: 'dot', x: h.x + rnd(-10, 10), y: h.y - 14, vx: (tx - h.x) * rnd(0.8, 1.4), vy: (ty - h.y) * rnd(0.8, 1.4), size: 2.4, color: i % 3 ? '#facc15' : '#1c1917', life: 0.9, drag: 0 }); }
    g.fx.ring(h.x, h.y, h.st.range * TILE * 1.6, '#facc15', 0.5, 3); Sfx.play('hum'); Sfx.play('zap');
  },
  magnetpull(g, h, ult) {
    const R = h.st.range * TILE * (ult ? 1.9 : 1.4), list = g.enemiesIn(h.x, h.y, R, true);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 6 : 4), h, { color: '#f87171' }); if (e.dead) continue; e.shred = Math.max(e.shred, e.armor); if (!e.E.worldBoss) e.d = Math.max(-20, e.d - (e.boss ? 0.3 : 1.5) * TILE); if (ult) e.stunT = Math.max(e.stunT, e.boss ? 0.4 : 1.5); }
    g.effects.push({ type: 'implode', x: h.x, y: h.y, r: R, color: '#ef4444', life: 0.5, max: 0.5 }); g.after(0.15, () => g.effects.push({ type: 'implode', x: h.x, y: h.y, r: R * 0.8, color: '#60a5fa', life: 0.45, max: 0.45 }));
    g.shake(5); Sfx.play('void');
  },
  gadgets(g, h, ult) {
    g.revealT = Math.max(g.revealT, ult ? 14 : 8);
    for (const e of g.enemies) { if (e.dead) continue; e.vulnT = Math.max(e.vulnT, ult ? 10 : 6); e.vulnM = Math.max(e.vulnM, ult ? 0.4 : 0.25); }
    g.addExt({ dur: 1, x: h.x, y: h.y, under: true, draw(gg, ctx) { const k = this.t; ctx.strokeStyle = `rgba(74,222,128,${1 - k})`; ctx.lineWidth = 3; circle(ctx, this.x, this.y, 40 + k * 900); ctx.stroke(); ctx.strokeStyle = `rgba(74,222,128,${0.5 * (1 - k)})`; circle(ctx, this.x, this.y, 20 + k * 700); ctx.stroke(); } });
    g.floatText(h.x, h.y - 44, 'SCAN', '#4ade80', 18, 1); Sfx.play('laser');
  },
  overload(g, h, ult) {
    h.buffs.push({ dmgMul: ult ? 4 : 3, chains: ult ? 2 : 0, t: ult ? 6 : 5 });
    g.fx.burst(h.x, h.y - 10, '#e879f9', 30, 200, 3, 0.5, 'spark'); g.fx.ring(h.x, h.y, 44, '#e879f9', 0.5, 5); Sfx.play('hum'); Sfx.play('zap');
  },
  crystalprison(g, h, ult) {
    const R = h.st.range * TILE * (ult ? 1.6 : 1.2), list = g.enemiesIn(h.x, h.y, R, true), dur = ult ? 4.5 : 3;
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 6 : 4), h, { color: '#a5f3fc' }); if (!e.dead) e.stunT = Math.max(e.stunT, dur * (e.boss ? 0.25 : 1)); }
    g.addExt({ dur, list, draw(gg, ctx, t) { const fade = Math.min(1, (dur - this.t) * 2); for (const e of this.list) { if (e.dead || e.stunT <= 0) continue; const r = e.r + 6; ctx.save(); ctx.translate(e.x, e.ay); ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = '#a5f3fc'; ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.lineTo(r, -r * 0.2); ctx.lineTo(r * 0.6, r); ctx.lineTo(-r * 0.6, r); ctx.lineTo(-r, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.6); ctx.lineTo(r * 0.1, -r); ctx.stroke(); ctx.restore(); } } });
    g.fx.ring(h.x, h.y, R, '#a5f3fc', 0.6, 5); for (let i = 0; i < 40; i++) { const a = rnd(0, TAU), r = rnd(0, R); g.fx.add({ type: 'star', x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, size: 2, color: '#e0f2fe', life: 0.6 }); }
    Sfx.play('freeze'); g.shake(4);
  },
  deployturret(g, h, ult) {
    const tu = h.st.turret || 0, n = (2 + (tu >= 2 ? 1 : 0)) * (ult ? 2 : 1);
    const got = g.spawnHelpers(h, 'geschut', n, 12 + tu * 4, Math.max(1, h.st.dmg / 20) * (1 + 0.5 * tu));
    if (!got) g.floatText(h.x, h.y - 30, 'Geen plek', '#ffffff', 14, 0.8); else { g.floatText(h.x, h.y - 44, ult ? 'FORT!' : 'TORENS!', '#fde047', 18, 1); Sfx.play('place'); }
  },
  meteorshower(g, h, ult) {
    const n = ult ? 24 : 12, R = h.st.range * TILE * 1.2;
    g.effects.push({ type: 'tint', color: '#1e1b4b', alpha: 0.3, life: n * 0.08 + 0.5, max: n * 0.08 + 0.5 });
    for (let i = 0; i < n; i++) g.after(i * 0.08, () => {
      const list = g.enemiesIn(h.x, h.y, R, true); const e = list[Math.floor(Math.random() * list.length)]; const x = e ? e.x : h.x + rnd(-100, 100), y = e ? e.y : h.y + rnd(-100, 100);
      dropFx(g, x, y, 'comet', 0.4, gg => { gg.hitArea(x, y, 1.3 * TILE, h.st.dmg * 2.2, h, h.st, { air: true }); gg.fx.ring(x, y, 1.3 * TILE, '#fb923c', 0.4, 5); gg.fx.burst(x, y, '#fde68a', 14, 200, 3, 0.5, 'glow'); gg.shake(2); Sfx.play('boom'); });
    });
  },
  sandstorm(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 5 : 3), h, { color: '#fde68a' }); if (e.dead) continue; e.slowM = Math.max(e.slowM, 0.5); e.slowT = Math.max(e.slowT, 5); if (ult) { e.vulnT = Math.max(e.vulnT, 6); e.vulnM = Math.max(e.vulnM, 0.3); } }
    g.effects.push({ type: 'tint', color: '#d6b35a', alpha: 0.35, life: 2.5, max: 2.5 });
    for (let i = 0; i < (ult ? 160 : 100); i++) g.fx.add({ type: 'dot', x: rnd(-60, GW), y: rnd(0, GH), vx: rnd(260, 420), vy: rnd(-20, 20), size: rnd(1.5, 3), color: i % 2 ? '#d6b35a' : '#fde68a', life: rnd(0.8, 1.8), drag: 0 });
    g.shake(6); Sfx.play('freeze');
  },
  hive(g, h, ult) {
    const tu = h.st.turret || 0, n = 2 + Math.floor(tu / 2) + (ult ? 2 : 0);
    const got = g.spawnHelpers(h, 'xenodrone', n, 14, Math.max(1, h.st.dmg / 110));
    g.fx.burst(h.x, h.y, '#84cc16', 30, 180, 4, 0.6, 'glow'); if (got) g.floatText(h.x, h.y - 44, 'ZWERM!', '#bef264', 18, 1); Sfx.play('void');
  },
  bigcrunch(g, h, ult) {
    const R = h.st.range * TILE * 1.4, list = g.enemiesIn(h.x, h.y, R, true); if (!list.length) return noTarget(g, h);
    const tgt = list.slice().sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield))[0], d0 = tgt.d, pt = g.posAt(d0);
    for (const e of list) { if (e.E.worldBoss) continue; if (e.boss) { e.slowM = Math.max(e.slowM, 0.6); e.slowT = Math.max(e.slowT, 2); } else { e.d = d0 + rnd(-6, 6); e.stunT = Math.max(e.stunT, 1.6); } }
    g.effects.push({ type: 'blackhole', x: pt.x, y: pt.y, r: 1.6 * TILE, life: 1.2, max: 1.2, dps: h.st.dmg * 1.5, h });
    g.after(1.1, () => { g.hitArea(pt.x, pt.y, 1.9 * TILE, h.st.dmg * (ult ? 14 : 8), h, h.st, { air: true, color: '#f0abfc' }); g.effects.push({ type: 'implode', x: pt.x, y: pt.y, r: 2.4 * TILE, color: '#f0abfc', life: 0.6, max: 0.6 }); g.fx.burst(pt.x, pt.y, '#f0abfc', 50, 320, 4, 0.8, 'star'); g.flash = { color: '#f5d0fe', life: 0.3, max: 0.3 }; g.shake(ult ? 16 : 10); Sfx.play('bigboom'); });
    Sfx.play('void');
  },
  timeloop(g, h, ult) {
    for (const e of g.enemies) { if (e.dead || e.E.worldBoss) continue; if (e.boss) { if (ult) e.d = Math.max(-20, e.d - 4 * TILE); e.slowM = Math.max(e.slowM, 0.5); e.slowT = Math.max(e.slowT, 4); } else { e.d = -10 - rnd(0, 40); e.slowT = Math.max(e.slowT, 3); e.slowM = Math.max(e.slowM, 0.3); } if (ult) g.damage(e, h.st.dmg * 5, h, { color: '#22d3ee' }); }
    for (const o of g.heroes) if (o !== h && !o.temp) o.abilCd = 0;
    g.effects.push({ type: 'rewind', life: 1.4, max: 1.4 }); g.effects.push({ type: 'tint', color: '#0e7490', alpha: 0.25, life: 1, max: 1 });
    g.panelDirty = true; g.shake(10); Sfx.play('cosmic'); Sfx.play('void');
  },
  erase(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead);
    g.effects.push({ type: 'tint', color: '#fafafa', alpha: 0.6, life: 0.5, max: 0.5 });
    g.after(0.35, () => {
      for (const e of list) {
        if (e.dead) continue;
        if (e.E.worldBoss) { g.damage(e, h.st.dmg * 20, h, { color: '#fafafa' }); continue; }
        if (e.boss) { const amt = e.maxHp * (ult ? 0.2 : 0.1) * (e.E.raidBoss ? 0.5 : 1); g.damage(e, amt, h, { pure: true, color: '#fafafa' }); continue; }
        if (e.elite && !ult) { g.damage(e, e.maxHp * 0.5, h, { pure: true, color: '#fafafa' }); continue; }
        g.eraseFx(e); const left = Math.max(0, e.hp); e.hp = 0; h.dmg += left; g.ms.dmg += left; g.kill(e, h);
      }
      g.effects.push({ type: 'tint', color: '#0a0a0a', alpha: 0.7, life: 0.7, max: 0.7 }); g.shake(18); Sfx.play('bigboom');
    });
    Sfx.play('cosmic');
  },
});

/* ---------- tekenen: vijanden, projectielen, speciale helden ---------- */
const _drawEnemy3 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  const oy = e.flying ? -16 : 0;
  if (e.elite) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(e.x, e.y + oy, 2, e.x, e.y + oy, e.r * 1.9); g2.addColorStop(0, 'rgba(250,204,21,.35)'); g2.addColorStop(1, 'rgba(250,204,21,0)'); ctx.fillStyle = g2; circle(ctx, e.x, e.y + oy, e.r * 1.9); ctx.fill(); ctx.restore(); }
  if (e.E.shieldAura || e.E.healAura) { const ph = (t * 0.7 + e.id * 0.13) % 1; ctx.strokeStyle = rgba(e.E.shieldAura ? '#38bdf8' : '#fde68a', 0.4 * (1 - ph)); ctx.lineWidth = 2; circle(ctx, e.x, e.y, 2 * TILE * ph); ctx.stroke(); }
  if (e.invis) { ctx.save(); ctx.globalAlpha = e.revealed ? 0.62 : 0.16; _drawEnemy3.call(this, ctx, e, t); ctx.restore(); }
  else _drawEnemy3.call(this, ctx, e, t);
  if (e.invis && e.revealed) { ctx.save(); ctx.translate(e.x, e.y + oy - e.r - 16); ctx.strokeStyle = '#4ade80'; ctx.fillStyle = '#4ade80'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.5, 0, 0, TAU); ctx.stroke(); circle(ctx, 0, 0, 1.6); ctx.fill(); ctx.restore(); }
  if (e.elite) { ctx.save(); ctx.translate(e.x, e.y + oy); ctx.strokeStyle = rgba('#facc15', 0.7 + Math.sin(t * 6 + e.id) * 0.25); ctx.lineWidth = 2.5; circle(ctx, 0, 0, e.r + 5); ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; ctx.beginPath(); const cy = -e.r - 8; ctx.moveTo(-6, cy + 3); ctx.lineTo(-6, cy - 3); ctx.lineTo(-3, cy); ctx.lineTo(0, cy - 5); ctx.lineTo(3, cy); ctx.lineTo(6, cy - 3); ctx.lineTo(6, cy + 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if (e.moltenT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#f97316', 0.6 + Math.sin(t * 12) * 0.3); ctx.lineWidth = 4; circle(ctx, e.x, e.y + oy, e.r * 1.2); ctx.stroke(); ctx.restore(); }
};
const _drawProj3 = Game.prototype.drawProj;
Game.prototype.drawProj = function (ctx, p, t) {
  const k = p.kind;
  if (k !== 'ball' && k !== 'rope' && k !== 'bee' && k !== 'crystal' && k !== 'acid' && k !== 'echo') return _drawProj3.call(this, ctx, p, t);
  ctx.save(); ctx.translate(p.x, p.y);
  switch (k) {
    case 'ball': { const r = p.big ? 8 : 5; ctx.rotate(p.rot * 0.4); ctx.fillStyle = '#e11d48'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.3; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = r * 0.35; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.3, 2.6); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; circle(ctx, -r * 0.35, -r * 0.35, r * 0.25); ctx.fill(); break; }
    case 'rope': { ctx.rotate(p.ang || 0); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(2, 0, 6, 4, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-12, Math.sin(p.rot) * 5, -20, 0); ctx.stroke(); break; }
    case 'bee': { const b = Math.sin(p.rot * 3) * 2; ctx.rotate(p.ang || 0); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-1, -3 - b * 0.3, 3, 2, -0.4, 0, TAU); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 3, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1c1917'; ctx.fillRect(-1.5, -3, 1.4, 6); ctx.fillRect(1.2, -2.6, 1.2, 5.2); break; }
    case 'crystal': { ctx.rotate(p.rot * 0.5); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 10; ctx.fillStyle = 'rgba(165,243,252,.9)'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(2, 0); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); break; }
    case 'acid': { const g2 = ctx.createRadialGradient(0, 0, 1, 0, 0, 9); g2.addColorStop(0, '#ecfccb'); g2.addColorStop(0.5, '#84cc16'); g2.addColorStop(1, 'rgba(63,98,18,0)'); ctx.fillStyle = g2; circle(ctx, 0, 0, 9); ctx.fill(); ctx.fillStyle = '#bef264'; circle(ctx, Math.sin(p.rot) * 3, 5, 1.6); ctx.fill(); break; }
    case 'echo': { ctx.globalCompositeOperation = 'lighter'; ctx.rotate(p.ang || 0); ctx.fillStyle = 'rgba(34,211,238,.75)'; rr(ctx, -8, -3, 12, 6, 3); ctx.fill(); ctx.fillStyle = 'rgba(244,63,94,.75)'; rr(ctx, -10, -1, 12, 6, 3); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(ctx, 3, 0, 2.2); ctx.fill(); break; }
  }
  ctx.restore();
  if (Math.random() < 0.3 && this.fx) { if (k === 'acid') this.fx.add({ type: 'glow', x: p.x, y: p.y, size: 3, color: '#84cc16', life: 0.3 }); else if (k === 'echo') this.fx.add({ type: 'dot', x: p.x + rnd(-4, 4), y: p.y, size: 2, color: Math.random() < 0.5 ? '#22d3ee' : '#f43f5e', life: 0.25 }); }
};

/* nieuwe vijandvormen */
const _drawShape3 = drawShape;
drawShape = function (ctx, e, t) {
  const E = e.E, r = e.r, c = E.color;
  ctx.strokeStyle = EDGE; ctx.lineWidth = 2;
  switch (E.shape) {
    case 'sneak': {
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(-r, r * 0.8); ctx.quadraticCurveTo(-r * 1.1, -r * 0.4, 0, -r * 1.1); ctx.quadraticCurveTo(r * 1.1, -r * 0.4, r, r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(r * 0.15, -r * 0.2, r * 0.55, r * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e2e8f0'; circle(ctx, r * 0.05, -r * 0.25, 1.8); circle(ctx, r * 0.4, -r * 0.25, 1.8); ctx.fill();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.1); ctx.lineTo(r * 1.3, -r * 0.3); ctx.stroke(); break; }
    case 'troll': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, r * 0.1, r, r * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, -0.3); ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 0.45, r * 0.55, r * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.3); ctx.lineTo(r * 0.38, -r * 0.7); ctx.lineTo(r * 0.5, -r * 0.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.64, -r * 0.65); ctx.lineTo(r * 0.72, -r * 0.3); ctx.fill();
      ctx.fillStyle = '#fde047'; circle(ctx, r * 0.1, -r * 0.55, 2); circle(ctx, r * 0.45, -r * 0.55, 2); ctx.fill();
      ctx.save(); ctx.rotate(Math.sin(t * 4) * 0.2); ctx.fillStyle = '#78350f'; rr(ctx, r * 0.6, -r * 0.2, r * 0.3, r * 1.2, 3); ctx.fill(); ctx.stroke(); circle(ctx, r * 0.75, r * 1.0, r * 0.28); ctx.fill(); ctx.stroke(); ctx.restore();
      if (e.burnT <= 0 && e.hp < e.maxHp) { ctx.fillStyle = 'rgba(74,222,128,.8)'; ctx.font = "700 11px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('+', -r * 0.6, -r * 0.8 - Math.sin(t * 5) * 3); }
      break; }
    case 'necro': {
      ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.moveTo(-r * 0.9, r); ctx.lineTo(-r * 0.5, -r * 0.4); ctx.lineTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 0.9, r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e7e5e4'; circle(ctx, 0, -r * 0.6, r * 0.48); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#16a34a'; circle(ctx, -r * 0.16, -r * 0.65, 2.2); circle(ctx, r * 0.16, -r * 0.65, 2.2); ctx.fill();
      ctx.strokeStyle = '#57534e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r * 0.9, r); ctx.lineTo(r * 0.9, -r * 1.2); ctx.stroke();
      ctx.save(); ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10; ctx.fillStyle = rgba('#4ade80', 0.7 + Math.sin(t * 6) * 0.3); circle(ctx, r * 0.9, -r * 1.3, 4); ctx.fill(); ctx.restore(); break; }
    case 'skeleton': {
      ctx.strokeStyle = '#e7e5e4'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.05 + i * r * 0.28); ctx.lineTo(r * 0.5, r * 0.05 + i * r * 0.28); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.9); ctx.stroke(); const lg = Math.sin(t * 10) * r * 0.3; ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(-r * 0.4 + lg, r * 1.3); ctx.moveTo(0, r * 0.9); ctx.lineTo(r * 0.4 - lg, r * 1.3); ctx.stroke();
      ctx.fillStyle = '#f5f5f4'; ctx.strokeStyle = EDGE; circle(ctx, 0, -r * 0.55, r * 0.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1c1917'; circle(ctx, -r * 0.18, -r * 0.58, 2); circle(ctx, r * 0.18, -r * 0.58, 2); ctx.fill(); break; }
    case 'generator': {
      ctx.fillStyle = '#334155'; rr(ctx, -r, -r * 0.3, r * 2, r * 1.2, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba('#38bdf8', 0.55 + Math.sin(t * 5) * 0.2); ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.7, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(0, -r * 0.3); ctx.rotate(t * 2); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.35, 0, 0, TAU); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#22d3ee'; for (let i = -1; i <= 1; i++) { circle(ctx, i * r * 0.5, r * 0.35, 2); ctx.fill(); } break; }
    case 'priest': {
      ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(-r * 0.9, r); ctx.lineTo(-r * 0.45, -r * 0.4); ctx.lineTo(r * 0.45, -r * 0.4); ctx.lineTo(r * 0.9, r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(-r * 0.12, -r * 0.3, r * 0.24, r * 1.2);
      ctx.fillStyle = '#c68642'; circle(ctx, 0, -r * 0.62, r * 0.4); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.strokeStyle = rgba('#fde047', 0.8); ctx.lineWidth = 2; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.ellipse(0, -r * 1.12, r * 0.45, r * 0.14, 0, 0, TAU); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-r * 0.95, r); ctx.lineTo(-r * 0.95, -r * 1.1); ctx.moveTo(-r * 1.2, -r * 0.8); ctx.lineTo(-r * 0.7, -r * 0.8); ctx.stroke(); break; }
    case 'hacker': {
      ctx.fillStyle = '#581c87'; ctx.beginPath(); ctx.moveTo(-r, r * 0.9); ctx.quadraticCurveTo(-r, -r * 0.6, 0, -r); ctx.quadraticCurveTo(r, -r * 0.6, r, r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0f0a1e'; ctx.beginPath(); ctx.ellipse(r * 0.1, -r * 0.3, r * 0.5, r * 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(-r * 0.1, -r * 0.38, r * 0.5, 2.5);
      ctx.fillStyle = '#1e293b'; ctx.save(); ctx.translate(r * 0.4, r * 0.35); ctx.rotate(-0.2); ctx.fillRect(-r * 0.5, -r * 0.3, r, r * 0.55); ctx.strokeRect(-r * 0.5, -r * 0.3, r, r * 0.55); ctx.fillStyle = rgba('#a855f7', 0.6 + Math.sin(t * 12) * 0.3); ctx.fillRect(-r * 0.4, -r * 0.22, r * 0.8, r * 0.38); ctx.restore(); break; }
    case 'wolf': {
      const run = Math.sin(t * 14) * 3; ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 1.05, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 1.05, -r * 0.1); ctx.quadraticCurveTo(-r * 1.6, -r * 0.6 + run * 0.3, -r * 1.5, -r * 0.1); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * 0.85, -r * 0.35, r * 0.48, r * 0.38, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.65); ctx.lineTo(r * 0.8, -r * 1.05); ctx.lineTo(r * 0.95, -r * 0.65); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0ea5e9'; circle(ctx, r * 1.0, -r * 0.42, 1.8); ctx.fill();
      ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.4); ctx.lineTo(-r * 0.6 + run, r * 0.95); ctx.moveTo(r * 0.4, r * 0.4); ctx.lineTo(r * 0.4 - run, r * 0.95); ctx.stroke(); break; }
    case 'larva': {
      for (let i = 3; i >= 0; i--) { const x = -i * r * 0.45, y = Math.sin(t * 9 - i) * 2; ctx.fillStyle = i % 2 ? shade(c, -0.15) : c; circle(ctx, x, y, r * (0.72 - i * 0.08)); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#1a2e05'; circle(ctx, r * 0.25, -r * 0.15, 2); ctx.fill(); ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.4); ctx.lineTo(r * 0.7, -r * 0.8); ctx.stroke(); break; }
    case 'brain': {
      const b = Math.sin(t * 3) * 2; ctx.translate(0, -8 + b);
      ctx.strokeStyle = '#a21caf'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.25, r * 0.5); ctx.quadraticCurveTo(i * r * 0.3 + Math.sin(t * 4 + i) * 6, r * 1.1, i * r * 0.4, r * 1.5); ctx.stroke(); }
      ctx.strokeStyle = EDGE; ctx.lineWidth = 2; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.75, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.6); for (let i = 0; i < 4; i++) { const y = -r * 0.45 + i * r * 0.3; ctx.moveTo(-r * 0.8, y); ctx.quadraticCurveTo(-r * 0.4, y - 6, -r * 0.1, y + 3); ctx.moveTo(r * 0.8, y); ctx.quadraticCurveTo(r * 0.4, y - 6, r * 0.1, y + 3); } ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#f0abfc', 0.25 + Math.sin(t * 5) * 0.15); circle(ctx, 0, 0, r * 1.25); ctx.fill(); ctx.restore(); break; }
    case 'jackal': {
      ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(-r * 0.8, r); ctx.lineTo(-r * 0.6, -r * 0.2); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 0.8, r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.25); ctx.strokeRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.25);
      ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.3); ctx.lineTo(-r * 0.75, r * 0.4); ctx.lineTo(-r * 0.3, -r * 0.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.75, r * 0.4); ctx.lineTo(r * 0.3, -r * 0.3); ctx.fill();
      ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.3); ctx.lineTo(-r * 0.3, -r * 1.35); ctx.lineTo(-r * 0.05, -r * 0.75); ctx.lineTo(r * 0.05, -r * 0.75); ctx.lineTo(r * 0.3, -r * 1.35); ctx.lineTo(r * 0.35, -r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.75, -r * 0.35); ctx.lineTo(r * 0.1, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 8; circle(ctx, r * 0.12, -r * 0.55, 2.5); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.95, r); ctx.lineTo(r * 0.95, -r * 1.1); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.95, -r * 1.2, 4, 0, TAU); ctx.stroke(); break; }
    case 'eye': {
      const b = Math.sin(t * 2) * 2; ctx.translate(0, -6 + b);
      ctx.fillStyle = '#334155'; for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(t * 0.6 + i * TAU / 6); rr(ctx, r * 0.75, -r * 0.18, r * 0.45, r * 0.36, 3); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = '#e2e8f0'; circle(ctx, 0, 0, r * 0.85); ctx.fill(); ctx.stroke();
      const lx = Math.cos(t * 0.9) * r * 0.2, ly = Math.sin(t * 1.3) * r * 0.12;
      ctx.save(); ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14; ctx.fillStyle = '#0891b2'; circle(ctx, lx, ly, r * 0.45); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#020617'; circle(ctx, lx, ly, r * 0.2); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(ctx, lx - r * 0.12, ly - r * 0.14, 2.5); ctx.fill(); break; }
    default: return _drawShape3(ctx, e, t);
  }
};

/* speciale uiterlijken: glitch (Secret) en alien (Xeno) */
const _drawSpecial3 = drawSpecial;
drawSpecial = function (ctx, H, s, k, t, seed, o) {
  if (H.special === 'glitch') {
    for (const [dx, col] of [[-3, 'rgba(34,211,238,.9)'], [3, 'rgba(244,63,94,.9)']]) { ctx.save(); ctx.globalAlpha *= 0.28; ctx.globalCompositeOperation = 'lighter'; drawHero(ctx, H, dx * s + Math.sin(t * 17 + seed) * 1.5 * s, 0, s, t, Object.assign({}, o, { ghost: true, atk: 0 })); ctx.restore(); }
    const ph = Math.floor(t * 8 + seed * 3);
    if (ph % 5 === 0) { ctx.save(); const r = mulberry32(ph); for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? 'rgba(34,211,238,.8)' : 'rgba(244,63,94,.8)'; ctx.fillRect((r() - 0.5) * 36 * k, (r() - 0.8) * 50 * s, (6 + r() * 16) * s, 2.5 * s); } ctx.restore(); }
    ctx.save(); ctx.translate(0, 14 * s); ctx.scale(1, 0.35); ctx.strokeStyle = H.id === 'nul' ? 'rgba(250,250,250,.7)' : 'rgba(34,211,238,.7)'; ctx.lineWidth = 2 * s; ctx.setLineDash([3 * s, 4 * s]); ctx.lineDashOffset = -t * 30; circle(ctx, 0, 0, 26 * k); ctx.stroke(); ctx.restore();
    return;
  }
  if (H.special === 'alien') {
    ctx.save(); ctx.strokeStyle = 'rgba(132,204,22,.8)'; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(i * 8 * s, -4 * s); ctx.quadraticCurveTo(i * 22 * s + Math.sin(t * 3 + i) * 4 * s, -18 * s, i * 16 * s, -34 * s + Math.cos(t * 2.5) * 3 * s); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const a = t * 1.5 + i * TAU / 4; ctx.fillStyle = 'rgba(190,242,100,.85)'; circle(ctx, Math.cos(a) * 20 * k, -6 * s + Math.sin(a) * 8 * k, 2.4 * s); ctx.fill(); }
    ctx.restore(); return;
  }
  return _drawSpecial3(ctx, H, s, k, t, seed, o);
};
const _idleFx3 = idleFx;
idleFx = function (fx, type, x, y, color) {
  if (type === 'glitch') { fx.add({ type: 'dot', x: x + rnd(-16, 16), y: y + rnd(-28, 6), vx: rnd(-40, 40), vy: 0, size: rnd(1.5, 3), color: ['#22d3ee', '#f43f5e', '#fafafa'][Math.floor(rnd(0, 3))], life: 0.25 }); return; }
  return _idleFx3(fx, type, x, y, color);
};
