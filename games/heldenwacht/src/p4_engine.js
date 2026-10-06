/* =====================================================================
   Game-engine: waves, helden, vijanden, projectielen, abilities
   ===================================================================== */
const MAX_HEROES = 14;
const TARGET_MODES = [['first', 'Eerste'], ['last', 'Laatste'], ['strong', 'Sterkste'], ['close', 'Dichtst']];

class Game {
  constructor(map, diffIdx, cb = {}, opts = {}) {
    this.map = map; this.mapIdx = MAPS.indexOf(map); this.diffIdx = diffIdx; this.diff = DIFFS[diffIdx]; this.cb = cb;
    this.opts = opts; this.mode = opts.mode || 'campaign'; this.mods = (opts.mods || []).filter(id => MOD[id]);
    const M = { hp: 1, speed: 1, cost: 1, rate: 1, dmg: 1, cash: 1, extra: 1, flyer: false, bossEvery: 5, armor: 0, baseHp: null, maxRarity: null };
    for (const id of this.mods) { const f = MOD[id].fx; for (const k in f) { if (k === 'hp' || k === 'speed' || k === 'cost' || k === 'rate' || k === 'dmg' || k === 'cash' || k === 'extra') M[k] *= f[k]; else if (k === 'armor') M.armor += f[k]; else M[k] = f[k]; } }
    this.M = M;
    this.rules = Object.assign({}, opts.rules || {}); if (M.maxRarity) this.rules.maxRarity = this.rules.maxRarity && rarOrdG(this.rules.maxRarity) < rarOrdG(M.maxRarity) ? this.rules.maxRarity : M.maxRarity;
    this.raid = opts.raid ? RAIDS.find(r => r.id === opts.raid) : null; this.raidDiff = this.raid ? RAID_DIFFS[opts.raidDiff || 0] : null;
    this.coopPoolStart = opts.coopPool || 0; this.coopDmg = 0; this.coopTime = COOP.runTime;
    const bg = mapBackground(map); this.bg = bg.canvas; this.props = bg.props; this.pathSet = bg.pathSet;
    this.theme = THEMES[map.theme];
    this.team = Store.data.team.filter(id => HERO[id] && Store.data.heroes[id]);
    this.levels = {}; this.hmeta = {};
    this.team.forEach(id => { this.levels[id] = heroLevel(id); const o = Store.data.heroes[id] || {}; this.hmeta[id] = { trait: TRAIT[o.trait] || null, skin: o.skin || null, look: resolveLook(HERO[id], o.skin), mlv: masteryLevel(o.mxp || 0), aura: masteryLevel(o.mxp || 0) >= 12 }; });
    this.ms = { dmg: 0, upgrades: 0, maxTier: 0, maxPlaced: 0, maxRar: 0, abilities: 0, fastBoss: Infinity, heroUse: {}, evKills: 0, evBossKills: 0, hpLost: 0, bossKillsList: [] };
    this.buildPath();
    this.heroes = []; this.enemies = []; this.proj = []; this.effects = []; this.texts = []; this.timers = []; this.amb = [];
    this.fx = new FX();
    this.cash = this.map.startCash + this.diff.cash; this.hp = M.baseHp || this.diff.baseHp; this.maxHp = this.hp;
    this.wave = 0; this.totalWaves = this.mode === 'endless' || this.mode === 'race' ? Infinity : this.mode === 'bossrush' ? BOSSRUSH.length : this.raid ? this.raid.phases.reduce((n, p) => n + (p.boss ? 1 : p.waves), 0) : this.mode === 'coop' ? 1 : this.diff.waves; this.queue = []; this.spawnT = 0; this.cleared = 0; this.bonusPending = false;
    this.time = 0; this.speed = 1; this.paused = false; this.autoWave = false; this.autoT = -1;
    this.placing = null; this.sel = null; this.hover = null;
    this.shakeA = 0; this.banners = []; this.cutin = null; this.flash = null;
    this.over = false; this.result = null; this.kills = 0; this.bossKills = 0; this.leaks = 0; this.uid = 1;
    this.panelDirty = true; this.events = [];
    this.freeTiles = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const k = x + ',' + y; if (!this.pathSet.has(k) && !this.props.has(k)) this.freeTiles.push([x, y]); }
    if (this.initExt3) this.initExt3();
  }

  /* ---------- pad ---------- */
  buildPath() {
    this.pts = this.map.path.map(([x, y]) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }));
    this.segs = []; let acc = 0;
    for (let i = 0; i < this.pts.length - 1; i++) { const a = this.pts[i], b = this.pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y); this.segs.push({ a, b, len, start: acc, ang: Math.atan2(b.y - a.y, b.x - a.x) }); acc += len; }
    this.pathLen = acc;
    const last = this.pts[this.pts.length - 1], first = this.pts[0];
    this.base = { x: clamp(last.x, 22, GW - 22), y: clamp(last.y, 22, GH - 22) };
    this.portal = { x: clamp(first.x, 18, GW - 18), y: clamp(first.y, 18, GH - 18) };
    // afstand langs het pad waarop een vijand de basis bereikt
    let best = 0, bd = 1e9; for (let d = 0; d <= this.pathLen; d += 4) { const p = this.posAt(d); const dd = Math.hypot(p.x - this.base.x, p.y - this.base.y); if (dd < bd) { bd = dd; best = d; } }
    this.leakD = best;
  }
  posAt(d) {
    if (d <= 0) { const s = this.segs[0]; return { x: s.a.x + Math.cos(s.ang) * d, y: s.a.y + Math.sin(s.ang) * d, ang: s.ang }; }
    for (const s of this.segs) if (d <= s.start + s.len) { const f = (d - s.start) / s.len; return { x: lerp(s.a.x, s.b.x, f), y: lerp(s.a.y, s.b.y, f), ang: s.ang }; }
    const s = this.segs[this.segs.length - 1]; return { x: s.b.x, y: s.b.y, ang: s.ang };
  }
  posAtL(l, d) { return this.posAt(d); } // meerdere routes: zie p33_portals.js
  nearestD(x, y) { let best = 0, bd = 1e9; for (let d = 0; d <= this.pathLen; d += 8) { const p = this.posAt(d); const dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < bd) { bd = dd; best = d; } } return best; }

  /* ---------- waves ---------- */
  hpScale(n) {
    const m = n - 1; let s = (1 + 0.14 * m + 0.010 * m * m) * this.diff.hp * this.map.hpMult * this.M.hp;
    if ((this.mode === 'endless' || this.mode === 'race') && n > 30) s *= Math.pow(1.035, n - 30);
    if (this.raidDiff) s *= this.raidDiff.hp;
    if (this.mode === 'dungeon') s *= 1 + 0.4 * ((this.opts.depth || 1) - 1);
    return s;
  }
  raidPhase(n) { let acc = 0; for (let i = 0; i < this.raid.phases.length; i++) { const p = this.raid.phases[i], w = p.boss ? 1 : p.waves; if (n <= acc + w) return { idx: i, p, local: n - acc, len: w }; acc += w; } return { idx: this.raid.phases.length - 1, p: this.raid.phases[this.raid.phases.length - 1], local: 1, len: 1 }; }
  genWave(n) {
    if (this.mode === 'bossrush') return this.genBossRush(n);
    if (this.raid) return this.genRaid(n);
    if (this.mode === 'coop') return [{ type: 'leviathan', gap: 1 }];
    if (this.mode === 'dungeon') return this.genDungeon(n);
    return this.genNormal(n);
  }
  genBossRush(n) {
    const rng = mulberry32(n * 131 + 7), out = [], esc = ['grunt', 'runner', 'tank', 'shield'];
    for (let i = 0; i < 3 + n * 2; i++) out.push({ type: esc[Math.floor(rng() * Math.min(esc.length, 1 + Math.ceil(n / 2)))], gap: 0.45 });
    out.push({ type: '__pause', gap: 1.2 }); out.push({ type: BOSSRUSH[n - 1], gap: 1, stage: n });
    return out;
  }
  genRaid(n) {
    const ph = this.raidPhase(n), rng = mulberry32(n * 977 + this.raid.id.length), out = [];
    if (ph.p.boss) {
      for (let i = 0; i < 8; i++) out.push({ type: this.raid.phases[1].pool[Math.floor(rng() * this.raid.phases[1].pool.length)], gap: 0.5 });
      out.push({ type: '__pause', gap: 2 }); out.push({ type: this.raid.boss, gap: 1 });
      for (let i = 0; i < 10; i++) out.push({ type: this.raid.phases[1].pool[Math.floor(rng() * this.raid.phases[1].pool.length)], gap: 1.2 });
      return out;
    }
    const count = Math.round((6 + n * 1.6) * (ph.p.elite || 1));
    for (let i = 0; i < count; i++) out.push({ type: ph.p.pool[Math.floor(rng() * ph.p.pool.length)], gap: Math.max(0.35, 0.8 - n * 0.03) * (0.8 + rng() * 0.4) });
    if (ph.p.miniboss && ph.local === ph.len) out.splice(Math.floor(out.length / 2), 0, { type: ph.p.miniboss, gap: 1.5 });
    return out;
  }
  genNormal(n) {
    const rng = mulberry32(n * 7919 + (this.mapIdx + 1) * 104729 + this.diffIdx * 31 + this.map.id.length * 17 + 1);
    let pool = this.map.pool.filter(t => n >= (ENEMY_FROM_WAVE[t] || 1));
    if (this.M.flyer) pool = pool.concat(['flyer', 'flyer', 'flyer']);
    if (!pool.length) pool = ['grunt', 'runner'];
    const count = Math.min(140, Math.round((5 + Math.min(n, 60) * 1.3 + this.diffIdx * Math.min(n, 60) * 0.12) * this.M.extra));
    const gapBase = Math.max(0.32, 0.95 - n * 0.022);
    const spot = n % 4 === 0 && pool.length > 1 ? pool[1 + Math.floor(rng() * (pool.length - 1))] : null;
    const out = [];
    for (let i = 0; i < count; i++) {
      let type;
      if (spot && rng() < 0.6) type = spot;
      else if (rng() < Math.max(0.25, 0.7 - n * 0.03)) type = 'grunt';
      else type = pool[Math.floor(rng() * pool.length)];
      const gap = gapBase * (type === 'tank' ? 1.6 : type === 'runner' ? 0.6 : 1) * (0.8 + rng() * 0.4);
      out.push({ type, gap });
    }
    const be = this.M.bossEvery;
    if (n === this.totalWaves) {
      out.push({ type: '__pause', gap: 2.5 });
      out.push({ type: this.map.finalBoss, gap: 1.2 });
      for (let i = 0; i < 6; i++) out.push({ type: pool[Math.floor(rng() * pool.length)], gap: 0.5 });
    } else if ((this.mode === 'endless' || this.mode === 'race') && n % 5 === 0) {
      const list = this.map.bosses.concat([this.map.finalBoss, 'overlord']), k = n / 5 - 1;
      out.splice(Math.floor(out.length / 2), 0, { type: list[k % list.length], gap: 1.6 });
      if (n >= 25) out.push({ type: list[(k + 1) % list.length], gap: 1.6 });
    } else if (n % be === 0) {
      const b = this.map.bosses[(n / be - 1) % this.map.bosses.length];
      out.splice(Math.floor(out.length / 2), 0, { type: b, gap: 1.6 });
    }
    return out;
  }
  wavePreview(n) {
    if (n > this.totalWaves) return [];
    const c = {}; for (const q of this.genWave(n)) if (q.type !== '__pause') c[q.type] = (c[q.type] || 0) + 1;
    return Object.entries(c).map(([type, count]) => ({ type, count, boss: !!ENEMIES[type].boss }));
  }
  canStartWave() { return !this.over && this.wave < this.totalWaves && this.queue.length === 0 && !this.relicOffer; }
  startWave() {
    if (!this.canStartWave()) return false;
    let early = 0;
    if (this.bonusPending) { if (this.enemies.length) early = Math.round(10 + this.wave * 2); this.payWaveBonus(); }
    this.wave++; this.cleared = Math.max(this.cleared, this.wave - 1);
    this.queue = this.genWave(this.wave); this.spawnT = 0.4; this.bonusPending = true; this.autoT = -1;
    if (early) { this.cash += early; this.floatText(GW / 2, GH - 70, `Vroege start +$${early}`, '#ffd23f', 18, 1.4); }
    const bossWave = this.queue.some(q => ENEMIES[q.type] && ENEMIES[q.type].boss);
    if (this.raid) { const ph = this.raidPhase(this.wave); if (ph.local === 1) this.banner(ph.p.name, ph.p.boss ? 'De raidbaas verschijnt!' : `${this.raidDiff.name} · ${this.raid.name}`, this.raid.color); else this.banner(`Golf ${this.wave}`, ph.p.name, this.raid.color); }
    else if (this.mode === 'bossrush') this.banner(`Fase ${this.wave} van ${BOSSRUSH.length}`, ENEMIES[BOSSRUSH[this.wave - 1]].name, '#ff4d5e');
    else if (this.mode === 'coop') this.banner('Wereldbaas', 'Doe zoveel mogelijk schade!', '#2dd4bf');
    else this.banner(`Golf ${this.wave}`, bossWave ? 'Er komt een baas aan!' : `${this.queue.filter(q => q.type !== '__pause').length} vijanden`, bossWave ? '#ff4d5e' : '#ffd23f');
    Sfx.play('wave'); this.panelDirty = true; this.emit('wave');
    return true;
  }
  payWaveBonus() {
    const b = Math.round((ECONOMY.waveBonusBase + Math.min(this.wave, 60) * ECONOMY.waveBonusPerWave) * (0.5 + 0.5 * this.map.hpMult) * this.M.cash * (this.mode === 'bossrush' ? 3 : 1)); this.cash += b; this.bonusPending = false;
    this.floatText(GW / 2, 64, `Golf ${this.wave} gehaald  +$${b}`, '#3ddc97', 20, 1.6); Sfx.play('coin');
    let heal = 0;
    for (const h of this.heroes) {
      if (h.temp || !h.st) continue;
      if (h.st.income > 0) { const inc = Math.round(h.st.income); this.cash += inc; this.floatText(h.x, h.y - 30, `+$${inc}`, '#ffd23f', 16, 1.4); this.fx.burst(h.x, h.y - 10, '#facc15', 12, 120, 3, 0.6, 'glow'); }
      heal += h.st.heal || 0;
    }
    if (heal > 0 && this.hp < this.maxHp) { const hv = Math.min(this.maxHp - this.hp, Math.round(heal)); this.hp += hv; this.floatText(this.base.x, this.base.y - 30, `+${hv} ♥`, '#3ddc97', 18, 1.4); this.fx.ring(this.base.x, this.base.y, 40, '#3ddc97', 0.6, 4); }
  }

  /* ---------- helden ---------- */
  heroCount(id) { return this.heroes.reduce((n, h) => n + (h.id === id && !h.temp ? 1 : 0), 0); }
  realHeroes() { return this.heroes.filter(h => !h.temp); }
  heroCap(id) { return HERO[id].cap || RARITIES[HERO[id].rarity].cap; }
  tileFree(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    const k = tx + ',' + ty; if (this.pathSet.has(k) || this.props.has(k)) return false;
    return !this.heroes.some(h => h.tx === tx && h.ty === ty);
  }
  costOf(id) { const hm = this.hmeta[id], tp = hm && hm.trait && hm.trait.m.costPct || 0; return Math.round(HERO[id].cost * this.M.cost * (this.R ? this.R.cost : 1) * (1 - tp)); }
  upgCost(h) { const u = h.def.upgrades[h.tier]; if (!u) return 0; const tp = h.trait && h.trait.m.upgPct || 0; return Math.round(u.cost * (this.R ? this.R.upg : 1) * (1 - tp)); }
  abilCdMax(h) { const A = ABILITIES[h.def.ability]; return A.cd * (h.tier >= 5 ? 0.8 : 1) * (1 - Math.min(0.5, (h.st && h.st.cdPct || 0) + (this.R ? this.R.cdPct : 0))); }
  heroAllowed(id) { return !this.rules.maxRarity || rarOrdG(HERO[id].rarity) <= rarOrdG(this.rules.maxRarity); }
  placeCheck(id, tx, ty) {
    const H = HERO[id];
    if (!this.heroAllowed(id)) return `${H.name} is niet toegestaan: ${RULE_LABEL(this.rules)}.`;
    if (!this.tileFree(tx, ty)) return 'Hier kun je geen held plaatsen.';
    if (this.rules.maxHeroes && this.realHeroes().length >= this.rules.maxHeroes) return `Maximaal ${this.rules.maxHeroes} helden tegelijk in deze uitdaging.`;
    if (this.cash < this.costOf(id)) return `Te weinig geld: ${H.name} kost $${this.costOf(id)}.`;
    if (this.heroCount(id) >= this.heroCap(id)) return `Maximaal ${this.heroCap(id)}× ${H.name} tegelijk.`;
    if (this.realHeroes().length >= MAX_HEROES) return `Maximaal ${MAX_HEROES} helden op de map.`;
    return null;
  }
  placeHero(id, tx, ty) {
    const err = this.placeCheck(id, tx, ty);
    if (err) { Sfx.play('error'); this.emit('msg', err); return false; }
    const H = HERO[id];
    const h = this.makeHero(id, tx, ty);
    this.heroes.push(h); this.cash -= h.spent;
    this.fx.burst(h.x, h.y, h.look.suit2, 16, 140, 3, 0.5); this.fx.ring(h.x, h.y, 30, h.look.suit2, 0.4); h.pulse = 1;
    const ms = this.ms; ms.maxPlaced = Math.max(ms.maxPlaced, this.realHeroes().length); ms.maxRar = Math.max(ms.maxRar, rarOrdG(H.rarity)); if (!ms.heroUse[id]) ms.heroUse[id] = { dmg: 0, kills: 0 };
    if (h.mlv >= MASTERY_MAX) { this.effects.push({ type: 'pillar', x: h.x, y: h.y + 10, life: 0.9, max: 0.9, w: 0.8 }); for (let i = 0; i < 18; i++) this.fx.add({ type: 'star', x: h.x + rnd(-24, 24), y: h.y + rnd(-30, 10), vy: rnd(-90, -30), size: 2.5, color: '#e9d5ff', life: 1, drag: 1 }); this.floatText(h.x, h.y - 44, 'LEGENDE', '#e9d5ff', 16, 1.2); }
    Sfx.play('place'); this.select(h); this.emit('placed', h);
    return true;
  }
  makeHero(id, tx, ty, level) {
    const H = HERO[id];
    const hm = this.hmeta[id] || { trait: null, skin: null, look: H.look, mlv: 0 };
    const h = { uid: this.uid++, id, def: H, tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, tier: 0, spent: this.costOf(id), cd: 0.3, trait: hm.trait, look: hm.look, mlv: hm.mlv, maura: hm.aura, procT: 0,
      abilCd: ABILITIES[H.ability].cd * 0.4, buffs: [], ext: [], ang: 0.3, atk: 0, t: Math.random() * 10, seed: Math.random() * 10, stunT: 0,
      mode: this.mode === 'coop' ? 'strong' : 'first', kills: 0, dmg: 0, fxT: 0, beamRamp: {}, beamTargets: [], beamChains: [], level: level || this.levels[id] || 1, pulse: 0, humT: 0 };
    h.st = this.heroStats(h);
    return h;
  }
  select(h) { this.sel = h && h.temp ? null : h; this.panelDirty = true; }
  upgrade(h) {
    if (!h || h.tier >= 5) return false;
    if (this.rules.maxTier != null && h.tier >= this.rules.maxTier) { Sfx.play('error'); this.emit('msg', `In deze uitdaging mag je niet verder upgraden dan niveau ${this.rules.maxTier}.`); return false; }
    const u = h.def.upgrades[h.tier], uc = this.upgCost(h);
    if (this.cash < uc) { Sfx.play('error'); this.emit('msg', `Te weinig geld voor ${u.name} ($${uc}).`); return false; }
    this.cash -= uc; h.tier++; h.spent += uc; h.pulse = 1;
    this.ms.upgrades++; this.ms.maxTier = Math.max(this.ms.maxTier, h.tier);
    const c = h.look.suit2;
    if (u.major) {
      this.fx.burst(h.x, h.y - 8, c, 40, 220, 4, 0.8, 'glow'); this.fx.ring(h.x, h.y, 60, c, 0.6, 5); this.fx.ring(h.x, h.y, 40, '#fff', 0.4, 3);
      for (let i = 0; i < 14; i++) this.fx.add({ type: 'star', x: h.x + rnd(-20, 20), y: h.y + rnd(-10, 10), vy: rnd(-120, -60), vx: rnd(-40, 40), size: 2.5, color: '#fff3a0', life: 0.9, drag: 1 });
      this.floatText(h.x, h.y - 40, h.tier === 5 ? 'ULTIMATE!' : 'MEGA-UPGRADE!', '#ffd23f', 22, 1.3);
      Sfx.play('bigupgrade'); this.shake(4);
    } else {
      this.fx.burst(h.x, h.y - 8, c, 18, 140, 3, 0.5); this.fx.ring(h.x, h.y, 34, c, 0.4);
      this.floatText(h.x, h.y - 36, 'UPGRADE', '#ffffff', 16, 1); Sfx.play('upgrade');
    }
    this.panelDirty = true; this.emit('upgraded', h);
    return true;
  }
  sellValue(h) { return Math.round(h.spent * 0.7); }
  sell(h) {
    if (!h) return;
    const v = this.sellValue(h); this.cash += v;
    this.heroes = this.heroes.filter(x => x !== h);
    this.fx.burst(h.x, h.y, '#ffd23f', 14, 120, 3, 0.5); this.floatText(h.x, h.y - 20, `+$${v}`, '#ffd23f', 16, 1);
    if (this.sel === h) this.sel = null; this.panelDirty = true; Sfx.play('sell');
  }
  useAbility(h) {
    if (!h || h.abilCd > 0 || h.stunT > 0 || this.over) return false;
    const A = ABILITIES[h.def.ability], ult = h.tier >= 5;
    ABILITY_FX[h.def.ability](this, h, ult);
    h.abilCd = this.abilCdMax(h); h.atk = 1; h.pulse = 1; this.ms.abilities++;
    this.cutin = { h, name: ult ? A.ult : A.name, ult, life: ult ? 1.6 : 1.1, max: ult ? 1.6 : 1.1 };
    Sfx.play(ult ? 'ult' : 'ability'); if (ult) this.shake(6);
    this.panelDirty = true; this.emit('ability', h);
    return true;
  }
  heroStats(h) {
    const st = computeStats(h.def, h.tier, h.level, h.ext && h.ext.length ? h.buffs.concat(h.ext) : h.buffs, h.trait);
    if (this.M.rate !== 1) st.rate *= this.M.rate;
    if (this.M.dmg !== 1) st.dmg *= this.M.dmg;
    if (st.earlyBoost) { st.earlyNow = st.earlyBoost * earlyFactor(Math.max(1, this.wave)); st.dmg *= 1 + st.earlyNow; }
    if (this.R) { st.dmg *= this.R.dmg; st.rate *= this.R.rate; if (st.range < 90) st.range *= this.R.range; st.shred += this.R.shred; if (this.R.detect) st.detect = true; }
    if (h.chillT > 0) st.rate *= 0.6;
    return st;
  }
  /* Support-helden: buff voor helden binnen hun buffbereik (sterkste buff telt) */
  applyAuras() {
    for (const h of this.heroes) h.ext = [];
    for (const sp of this.heroes) {
      const st = sp.st; if (!st || !(st.buffRate || st.buffDmg) || sp.stunT > 0) continue;
      const R = st.buffRange * TILE, global = st.buffRange >= 90;
      for (const h of this.heroes) { if (h === sp) continue; if (!global && (h.x - sp.x) ** 2 + (h.y - sp.y) ** 2 > R * R) continue; h.ext.push({ rateMul: 1 + st.buffRate, dmgMul: 1 + st.buffDmg }); }
    }
    for (const h of this.heroes) if (h.ext.length > 1) { let r = 1, d = 1; for (const b of h.ext) { r = Math.max(r, b.rateMul); d = Math.max(d, b.dmgMul); } h.ext = [{ rateMul: r, dmgMul: d }]; }
  }

  /* ---------- helpers ---------- */
  emit(type, data) { this.events.push({ type, data }); }
  shake(a) { if (Store.data.settings.shake) this.shakeA = Math.max(this.shakeA, a); }
  banner(text, sub, color) { this.banners.push({ text, sub, color, life: 2.2, max: 2.2 }); }
  floatText(x, y, text, color, size = 14, life = 0.9) { this.texts.push({ x, y, text, color, size, life, max: life, vy: -30 }); if (this.texts.length > 90) this.texts.shift(); }
  dmgText(e, amt, color, crit) {
    if (!Store.data.settings.dmgNums || amt < 0.5) return;
    this.texts.push({ x: e.x + rnd(-8, 8), y: e.ay - e.r - 6, text: fmtDmg(amt) + (crit ? '!' : ''), color, size: crit ? 20 : 13 + Math.min(6, Math.log10(amt + 1) * 2), life: 0.75, max: 0.75, vy: -44 });
    if (this.texts.length > 90) this.texts.shift();
  }
  enemiesIn(x, y, R, air = true) { const out = []; for (const e of this.enemies) { if (e.dead || e.ghost) continue; if (e.flying && !air) continue; if ((e.x - x) ** 2 + (e.y - y) ** 2 <= (R + e.r * 0.5) ** 2) out.push(e); } return out; }
  strongest() { let b = null; for (const e of this.enemies) if (!e.dead && !(e.invis && !e.revealed) && (!b || e.hp + e.shield > b.hp + b.shield)) b = e; return b; }
  findTargets(h, R, n) {
    const air = h.st.air; let c = this.enemiesIn(h.x, h.y, R, air);
    if (this.hasInvis) c = c.filter(e => !e.invis || e.revealed);
    if (!c.length) return c;
    switch (h.mode) {
      case 'last': c.sort((a, b) => a.d - b.d); break;
      case 'strong': c.sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield)); break;
      case 'close': c.sort((a, b) => ((a.x - h.x) ** 2 + (a.y - h.y) ** 2) - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2)); break;
      default: c.sort((a, b) => b.d - a.d);
    }
    return c.slice(0, n);
  }
  after(t, fn) { this.timers.push({ t, fn }); }

  /* ---------- schade ---------- */
  damage(e, amt, h, o = {}) {
    if (e.dead || amt <= 0) return 0;
    if (e.invulnT > 0) { if (!o.acc && Math.random() < 0.15) this.floatText(e.x, e.ay - e.r - 8, 'IMMUUN', '#94a3b8', 12, 0.5); return 0; }
    if (e.hitShield > 0 && !o.pure) { e.hitShield--; if (!o.acc || Math.random() < 0.2) this.fx.burst(e.x, e.ay, '#38bdf8', 4, 90, 2, 0.25, 'spark'); if (e.hitShield === 0) { this.floatText(e.x, e.ay - e.r - 14, 'SCHILD KAPOT!', '#38bdf8', 18, 1); Sfx.play('shield'); this.fx.ring(e.x, e.y, 80, '#38bdf8', 0.5, 6); } return 0; }
    let a = amt;
    if (h && h.st && !o.pure) {
      const hs = h.st;
      if (hs.erase > 0 && !e.boss && !o.acc && Math.random() < hs.erase * (e.elite ? 0.5 : 1)) { const left = Math.max(0, e.hp); this.eraseFx(e); e.hp = 0; h.dmg += left; this.ms.dmg += left; this.kill(e, h); return left; }
      if (hs.pctMax > 0 && e.boss && !e.E.worldBoss && !o.acc) a += e.maxHp * hs.pctMax * (e.E.raidBoss ? 0.4 : 1);
      if (hs.corrode > 0) { e.corr = Math.min(60, (e.corr || 0) + hs.corrode * (o.acc ? 0.1 : 1)); e.shred = Math.max(e.shred, e.corr); }
    }
    if (o.crit) a *= o.critMult || 2;
    if (e.boss && h && h.st && h.st.bossPct) a *= 1 + h.st.bossPct;
    if (e.vulnT > 0) a *= 1 + e.vulnM;
    if (e.dmgRed > 0) a *= 1 - e.dmgRed;
    if (!o.pure) { const arm = Math.max(0, e.armor - e.shred); a = Math.max(a * 0.2, a - arm); }
    const dealt = a;
    if (e.shield > 0) { const s = Math.min(e.shield, a); e.shield -= s; a -= s; if (e.shield <= 0) { this.fx.burst(e.x, e.ay, '#7dd3fc', 14, 160, 3, 0.4, 'spark'); Sfx.play('shield'); } }
    e.hp -= a; e.flash = 1;
    if (e.hp > 0 && h && h.st && h.st.execute > 0 && !e.boss && e.hp < e.maxHp * h.st.execute) { e.hp = 0; this.floatText(e.x, e.ay - e.r - 14, 'EXECUTIE', '#f0abfc', 15, 0.8); this.fx.burst(e.x, e.ay, '#f0abfc', 10, 140, 3, 0.4, 'star'); }
    if (h) { h.dmg += dealt; this.ms.dmg += dealt; const u = this.ms.heroUse[h.id]; if (u && !h.temp) u.dmg += dealt; }
    if (e.E.worldBoss) { this.coopDmg += dealt; e.hp = e.maxHp; }
    if (o.acc) { e.dmgAcc += dealt; e.accColor = o.color || '#fff'; }
    else this.dmgText(e, dealt, o.crit ? (h && h.trait && h.trait.m.proc === 'fatal' ? '#fef08a' : '#ffd23f') : (o.color || '#ffffff'), o.crit);
    if (h && h.trait && h.trait.m.proc && !o.noProc && !o.pure && !e.dead) {
      if (!o.acc) this.traitProc(h, e, dealt, o);
      else if (h.procT <= 0) { h.procT = 0.35; this.traitProc(h, e, dealt, o); }
    }
    if (e.hp <= 0) this.kill(e, h);
    return dealt;
  }
  applyStatus(e, st, o = {}) {
    if (e.dead) return;
    if (st.slow > 0) { const s = Math.min(0.8, st.slow * (e.boss ? 0.5 : 1)); if (e.slowT <= 0 || s >= e.slowM) e.slowM = s; e.slowT = Math.max(e.slowT, st.slowDur); }
    if (st.burn > 0) { if (e.burnT <= 0 || st.burn >= e.burnD) e.burnD = st.burn; e.burnT = Math.max(e.burnT, st.burnDur || 3); }
    if (!o.noStun && st.stunChance > 0 && Math.random() < st.stunChance) { e.stunT = Math.max(e.stunT, st.stun * (e.boss ? 0.3 : 1)); }
    if (st.knock > 0 && !o.noKnock) { e.d = Math.max(-20, e.d - st.knock * TILE * (e.boss ? 0.2 : 1)); }
    if (st.shred > 0) e.shred = Math.max(e.shred, st.shred);
  }
  hitArea(x, y, R, dmg, h, st, o = {}) {
    const list = this.enemiesIn(x, y, R, o.air !== false);
    for (const e of list) { const crit = st && Math.random() < st.crit; this.damage(e, dmg, h, { crit, critMult: st ? st.critMult : 2, color: o.color, noProc: o.noProc }); if (st) this.applyStatus(e, st, o); }
    return list.length;
  }
  kill(e, h) {
    if (e.dead) return;
    e.dead = true; this.kills++; if (h) { h.kills++; const u = this.ms.heroUse[h.id]; if (u && !h.temp) u.kills++; }
    if (e.E.event) { this.ms.evKills++; if (e.boss) this.ms.evBossKills++; }
    if (e.boss) { const tt = this.time - (e.spawnTime || 0); this.ms.fastBoss = Math.min(this.ms.fastBoss, tt); this.ms.bossKillsList.push(e.type); }
    this.onEnemyDeath(e, h);
    this.cash += e.reward;
    if (h && h.st && h.st.bounty > 0) { const extra = Math.max(1, Math.round(e.reward * h.st.bounty)); this.cash += extra; this.fx.add({ type: 'text', x: e.x + 10, y: e.ay - 18, vy: -40, text: `+$${extra}`, size: 13, color: '#facc15', life: 0.7 }); }
    const c = e.E.color;
    this.fx.burst(e.x, e.ay, c, e.boss ? 60 : 12, e.boss ? 300 : 140, e.boss ? 5 : 3, e.boss ? 1 : 0.45);
    this.fx.burst(e.x, e.ay, '#ffffff', e.boss ? 20 : 4, 100, 2, 0.3, 'spark');
    if (e.reward >= 10) this.floatText(e.x, e.ay - 14, `+$${e.reward}`, '#ffd23f', e.boss ? 24 : 13, 0.9);
    if (e.E.split) for (const off of [-10, 8]) this.spawnEnemy(e.E.split, e.d + off, e.wave);
    if (e.boss) { this.bossKills++; this.shake(14); Sfx.play('bossdie'); this.fx.ring(e.x, e.y, 120, c, 0.8, 6); this.banner(`${e.E.name} verslagen!`, `+$${e.reward}`, '#3ddc97'); this.flash = { color: '#ffffff', life: 0.3, max: 0.3 }; }
    else Sfx.play('death');
  }

  /* ---------- vijanden ---------- */
  spawnEnemy(type, d, waveN) {
    const E = ENEMIES[type]; let sc = this.hpScale(waveN) * (type === this.map.finalBoss && waveN === this.totalWaves ? 0.85 : 1);
    if (this.mode === 'bossrush') sc = E.boss ? this.map.hpMult * this.diff.hp * (1 + (waveN - 1) * 0.4) : this.hpScale(waveN * 3);
    else if (this.raid) sc = E.raidBoss ? this.raidDiff.hp * this.diff.hp : this.hpScale(2 + Math.round(waveN * 1.5));
    else if (this.mode === 'coop' && !E.worldBoss) sc = this.hpScale(8 + Math.floor(this.time / 12));
    const e = { id: this.uid++, type, E, wave: waveN, hp: E.hp * sc, maxHp: E.hp * sc, shield: (E.shield || 0) * sc, maxShield: (E.shield || 0) * sc,
      armor: E.armor * (1 + Math.min(waveN, 60) * (E.boss ? 0.015 : 0.03)) + this.M.armor, speed: E.speed * this.diff.speed * this.M.speed, d, flying: !!E.flying, r: E.r, boss: !!E.boss,
      spawnTime: this.time, ab: {}, invulnT: 0, vulnT: 0, vulnM: 0, dmgRed: 0, hitShield: 0, ghost: false, gT: rnd(0, 3), bT: rnd(1, 4), hist: [], enraged: false,
      slowT: 0, slowM: 0, stunT: 0, burnT: 0, burnD: 0, shred: 0, flash: 0, t: Math.random() * 10, dmgAcc: 0, accT: 0.35, accColor: '#fff',
      abilT: 3, phase: 0, dashT: 0, reward: Math.round(E.reward * ECONOMY.killMult * (1 + 0.06 * (Math.min(waveN, 60) - 1)) * (0.5 + 0.5 * this.map.hpMult) * this.M.cash * (this.R ? this.R.cash : 1) * (this.roomCash || 1)), invis: !!E.invisible, healPulse: 0, x: 0, y: 0, ay: 0, dir: 0 };
    const p = this.posAt(d); e.x = p.x; e.y = p.y; e.ay = p.y - (e.flying ? 16 : 0); e.dir = p.ang;
    if (e.invis) this.hasInvis = true;
    this.enemies.push(e);
    if (e.boss) { this.banner(E.raidBoss ? 'RAIDBAAS' : E.worldBoss ? 'WERELDBAAS' : 'BAAS NADERT', E.name, '#ff4d5e'); Sfx.play('boss'); this.shake(8); if (E.abilities && E.abilities.includes('rockshield')) e.ab.rockshield = 0.5; }
    if (E.worldBoss) { e.hp = e.maxHp = 1e9; }
    if (E.shape === 'villain' && E.decoy) e.reward = 15;
    return e;
  }
  updateEnemy(e, dt) {
    e.t += dt; e.flash = Math.max(0, e.flash - dt * 6); e.healPulse = Math.max(0, e.healPulse - dt * 1.5);
    if (e.burnT > 0) {
      e.burnT -= dt; this.damage(e, e.burnD * dt, null, { pure: true, acc: true, color: '#ff9a3c' });
      if (Math.random() < dt * 8) this.fx.add({ type: 'glow', x: e.x + rnd(-6, 6), y: e.ay - 4, vy: -40, size: 3, color: '#fb923c', life: 0.4, drag: 0 });
      if (e.dead) return;
    }
    if (e.vulnT > 0) e.vulnT -= dt;
    if (e.invulnT > 0) e.invulnT -= dt;
    this.enemyTraits(e, dt);
    if (e.stunT > 0) e.stunT -= dt;
    else {
      let sp = e.speed * (e.enraged ? 1.5 : 1) * (e.invulnT > 0 && e.E.abilities && e.E.abilities.includes('submerge') ? 1.8 : 1);
      if (e.slowT > 0) { e.slowT -= dt; sp *= (1 - e.slowM); }
      if (e.dashT > 0) { e.dashT -= dt; sp *= 3.2; }
      e.d += sp * TILE * dt;
    }
    const p = this.posAtL(e.lane, e.d); e.x = p.x; e.y = p.y; e.ay = p.y - (e.flying ? 16 : 0); e.dir = p.ang;
    if (e.dmgAcc > 0) { e.accT -= dt; if (e.accT <= 0) { this.dmgText(e, e.dmgAcc, e.accColor, false); e.dmgAcc = 0; e.accT = 0.35; } }
    if (e.E.heal) {
      e.abilT -= dt;
      if (e.abilT <= 0) { e.abilT = 1.6; e.healPulse = 1;
        for (const o of this.enemiesIn(e.x, e.y, 1.8 * TILE, true)) if (o !== e) { const amt = o.maxHp * (o.boss ? 0.01 : 0.05); o.hp = Math.min(o.maxHp, o.hp + amt); this.fx.add({ type: 'text', x: o.x, y: o.ay - o.r - 4, vy: -30, text: '+', size: 16, color: '#34d399', life: 0.5 }); } }
    }
    if (e.boss || e.E.abilities) this.bossAI(e, dt);
    if (e.d >= this.leakD) {
      e.dead = true; e.leaked = true; this.leaks++;
      const dmg = Math.min(e.E.leak, this.hp); this.hp -= dmg; this.ms.hpLost += dmg;
      this.floatText(this.base.x, this.base.y - 30, `-${e.E.leak} ♥`, '#ff4d5e', 20, 1.1); this.fx.burst(this.base.x, this.base.y, '#ff4d5e', 20, 180, 3, 0.5);
      this.shake(e.boss ? 16 : 5); Sfx.play('leak');
      if (this.hp <= 0) this.lose();
    }
  }
  bossAI(e, dt) {
    e.abilT -= dt;
    if (e.E.abilities) for (const ab of e.E.abilities) { if (BOSS_AB[ab]) BOSS_AB[ab](this, e, dt); }
    switch (e.E.ability) {
      case 'summon': if (e.abilT <= 0) { e.abilT = 5; for (let i = 0; i < 3; i++) this.spawnEnemy('grunt', Math.max(0, e.d - 14 - i * 16), e.wave); this.fx.burst(e.x, e.y, '#bef264', 24, 160, 3, 0.6, 'glow'); this.floatText(e.x, e.y - 40, 'Handlangers!', '#bef264', 16, 1); Sfx.play('zap'); } break;
      case 'stomp': if (e.abilT <= 0) { e.abilT = 7; const R = 2.6 * TILE; for (const h of this.heroes) if ((h.x - e.x) ** 2 + (h.y - e.y) ** 2 <= R * R) { h.stunT = Math.max(h.stunT, 2); }
        this.fx.ring(e.x, e.y, R, '#fb923c', 0.7, 6); this.fx.ring(e.x, e.y, R * 0.6, '#fde68a', 0.5, 4); this.fx.burst(e.x, e.y, '#a8a29e', 30, 200, 4, 0.6, 'smoke'); this.shake(10); Sfx.play('boom'); this.floatText(e.x, e.y - 44, 'STAMP!', '#fb923c', 20, 1); } break;
      case 'dash': if (e.abilT <= 0) { e.abilT = 6; e.dashT = 1; this.fx.burst(e.x, e.ay, '#7dd3fc', 20, 180, 3, 0.5, 'spark'); Sfx.play('zap'); } if (e.dashT > 0) this.fx.add({ type: 'glow', x: e.x, y: e.ay, size: 6, color: '#38bdf8', life: 0.35 }); break;
      case 'phases': {
        const f = e.hp / e.maxHp;
        if ((e.phase === 0 && f < 0.66) || (e.phase === 1 && f < 0.33)) {
          e.phase++; e.shield = e.maxHp * 0.25; e.maxShield = e.shield;
          for (let i = 0; i < 4; i++) this.spawnEnemy('shield', Math.max(0, e.d - 20 - i * 18), e.wave);
          this.banner(`Fase ${e.phase + 1}`, 'De Overlord krijgt een schild!', '#d946ef'); this.shake(10); Sfx.play('void');
          this.fx.ring(e.x, e.y, 90, '#d946ef', 0.8, 6);
        }
        if (e.abilT <= 0) { e.abilT = 8; for (let i = 0; i < 2; i++) this.spawnEnemy('runner', Math.max(0, e.d - 10 - i * 12), e.wave); }
        break; }
    }
  }

  /* ---------- helden updaten ---------- */
  updateHero(h, dt) {
    h.t += dt; h.atk = Math.max(0, h.atk - dt * 4); h.pulse = Math.max(0, h.pulse - dt * 2.5);
    if (h.abilCd > 0) h.abilCd = Math.max(0, h.abilCd - dt);
    if (h.chillT > 0) h.chillT -= dt;
    if (h.buffs.length) { h.buffs = h.buffs.filter(b => (b.t -= dt) > 0); if (!h.buffs.length) this.panelDirty = true; }
    h.st = this.heroStats(h);
    h.fxT -= dt;
    if (h.procT > 0) h.procT -= dt;
    if (h.fxT <= 0) { h.fxT = (h.tier >= 5 ? 0.12 : 0.3) + Math.random() * 0.25; idleFx(this.fx, h.look.skinFx || h.def.fx, h.x, h.y, h.look.suit2); if (h.maura) this.fx.add({ type: 'glow', x: h.x + rnd(-16, 16), y: h.y + rnd(-26, 8), vy: -20, size: 2.4, color: '#e9d5ff', life: 0.8, drag: 0 }); if (h.trait && rarOrdG(h.trait.rarity) >= 6) { const a = rnd(0, TAU); this.fx.add({ type: h.trait.rarity === 'ultra' ? 'star' : 'glow', x: h.x + Math.cos(a) * 20, y: h.y + 10 + Math.sin(a) * 7, vy: -30, size: 2, color: TRAIT_FX_COLOR[h.trait.m.proc] || RARITIES[h.trait.rarity].color, life: 0.7, drag: 0 }); } }
    if (h.buffs.some(b => b.clone) && Math.random() < dt * 20) this.fx.add({ type: 'smoke', x: h.x + rnd(-14, 14), y: h.y + rnd(-10, 10), size: 4, color: '#4c1d95', life: 0.5 });
    if (h.stunT > 0) { h.stunT -= dt; h.beamTargets = []; if (h.stunT <= 0) h.disabledBy = null; return; }
    const st = h.st, R = st.range * TILE, H = h.def;
    if (H.style === 'beam') { this.beamUpdate(h, dt, R); return; }
    h.cd -= dt; if (h.cd > 0) return;
    const n = H.style === 'projectile' || H.style === 'strike' ? st.multi : 1;
    const ts = this.findTargets(h, R, Math.max(1, n));
    if (!ts.length) { h.cd = 0; return; }
    h.cd = 1 / st.rate; h.atk = 1;
    const t0 = ts[0]; h.ang = Math.atan2(t0.ay - h.y, t0.x - h.x);
    const col = h.look.suit2;
    switch (H.style) {
      case 'melee': {
        const hits = st.cleave > 0 ? this.enemiesIn(t0.x, t0.y, st.cleave * TILE, st.air) : [t0];
        if (!hits.includes(t0)) hits.push(t0);
        for (const e of hits) { const crit = Math.random() < st.crit; this.damage(e, st.dmg, h, { crit, critMult: st.critMult }); this.applyStatus(e, st); }
        this.effects.push({ type: 'slash', x: t0.x, y: t0.ay, ang: h.ang, color: col, life: 0.18, max: 0.18, big: st.cleave > 0 });
        this.fx.burst(t0.x, t0.ay, col, st.cleave > 0 ? 12 : 6, 140, 3, 0.3, 'spark');
        if (st.cleave > 0) this.fx.ring(t0.x, t0.y, st.cleave * TILE, rgba(col, 0.8), 0.25, 3);
        Sfx.play('punch'); break; }
      case 'projectile': case 'splash': {
        ts.forEach((e, i) => this.fireProjectile(h, e, st, i));
        Sfx.play(H.proj === 'bullet' ? 'bullet' : H.proj === 'fire' ? 'fire' : H.proj === 'void' ? 'void' : 'shoot'); break; }
      case 'chain': {
        const hit = new Set(); let cur = t0, dmg = st.dmg; const pts = [{ x: h.x + Math.cos(h.ang) * 12, y: h.y - 12 }];
        for (let j = 0; j <= st.chains && cur; j++) {
          hit.add(cur); pts.push({ x: cur.x, y: cur.ay });
          const crit = Math.random() < st.crit; this.damage(cur, dmg, h, { crit, critMult: st.critMult, color: '#fde047' }); this.applyStatus(cur, st);
          this.fx.burst(cur.x, cur.ay, '#fde047', 4, 100, 2, 0.25, 'spark');
          dmg *= 0.85; let nxt = null, nd = (2 * TILE) ** 2;
          for (const o of this.enemies) { if (o.dead || hit.has(o) || (o.flying && !st.air)) continue; const dd = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (dd < nd) { nd = dd; nxt = o; } }
          cur = nxt;
        }
        this.effects.push({ type: 'lightning', pts, color: '#fde047', life: 0.18, max: 0.18, w: 2 + h.tier * 0.4 });
        Sfx.play('zap'); break; }
      case 'aura': {
        const list = this.enemiesIn(h.x, h.y, R, st.air);
        for (const e of list) { this.damage(e, st.dmg, h, { color: col }); this.applyStatus(e, st); }
        this.fx.ring(h.x, h.y, R, rgba(col, 0.9), 0.5, 3 + h.tier * 0.5);
        if (H.id === 'grav') this.effects.push({ type: 'implode', x: h.x, y: h.y, r: R, color: col, life: 0.4, max: 0.4 });
        else for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; this.fx.add({ type: 'snow', x: h.x + Math.cos(a) * R * 0.6, y: h.y + Math.sin(a) * R * 0.6, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, size: 3, color: '#e0f2fe', life: 0.5 }); }
        Sfx.play(H.id === 'grav' ? 'void' : 'freeze'); break; }
      case 'strike': {
        for (const e of ts) this.effects.push({ type: 'strike', target: e, x: e.x, y: e.y, delay: 0.22, h, st, dmg: st.dmg, kind: H.strike, color: col, life: 0.22, max: 0.22 });
        break; }
    }
    if (st.echo > 0 && (H.style === 'projectile' || H.style === 'strike')) this.echoAttack(h, ts, st);
  }
  fireProjectile(h, e, st, i = 0, over = {}) {
    const H = h.def, kind = over.kind || H.proj || 'arrow';
    const sx = h.x + Math.cos(h.ang) * 12, sy = h.y - 10;
    const p = { kind, x: sx, y: sy, sx, sy, target: e, tx: e.x, ty: e.ay, h, st, dmg: over.dmg || st.dmg, splash: over.splash != null ? over.splash : st.splash, pierce: st.pierce - 1, hitIds: new Set(),
      speed: (over.speed || st.projSpeed) * TILE, color: h.look.suit2, trail: h.look.trail, arc: kind === 'grenade', t: 0, dur: 0.55 + i * 0.04, rot: 0, air: st.air };
    this.proj.push(p);
  }
  beamUpdate(h, dt, R) {
    const st = h.st, ts = this.findTargets(h, R, st.beams);
    h.beamTargets = ts;
    if (!ts.length) { h.beamRamp = {}; return; }
    const nr = {};
    for (const e of ts) {
      const r = Math.min(2.5, (h.beamRamp[e.id] || 1) + dt * 0.5); nr[e.id] = r;
      this.damage(e, st.dmg * r * dt, h, { acc: true, color: '#fde047' });
      this.applyStatus(e, st, { noStun: true, noKnock: true });
      if (Math.random() < dt * 25) this.fx.add({ type: 'glow', x: e.x + rnd(-5, 5), y: e.ay + rnd(-5, 5), vx: rnd(-60, 60), vy: rnd(-60, 60), size: 3, color: h.def.look.suit2, life: 0.3 });
    }
    h.beamChains = [];
    if (st.chains > 0) for (const e of ts) {
      const near = this.enemies.filter(o => !o.dead && !ts.includes(o) && (!o.flying || st.air) && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < (2.2 * TILE) ** 2).slice(0, st.chains);
      for (const o of near) { this.damage(o, st.dmg * 0.5 * dt, h, { acc: true, color: '#f0abfc' }); this.applyStatus(o, st, { noStun: true, noKnock: true }); h.beamChains.push([e, o]); }
    }
    h.beamRamp = nr; h.ang = Math.atan2(ts[0].ay - h.y, ts[0].x - h.x); h.atk = Math.max(h.atk, 0.4);
    h.humT -= dt; if (h.humT <= 0) { h.humT = 0.45; Sfx.play('hum'); }
  }

  /* ---------- projectielen & effecten ---------- */
  updateProjectiles(dt) {
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i]; p.rot += dt * 18;
      let done = false;
      if (p.arc) {
        p.t += dt; const f = Math.min(1, p.t / p.dur);
        p.x = lerp(p.sx, p.tx, f); p.y = lerp(p.sy, p.ty, f) - Math.sin(f * Math.PI) * 60;
        if (f >= 1) { this.explode(p, p.tx, p.ty); done = true; }
      } else {
        if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.ay; }
        const dx = p.tx - p.x, dy = p.ty - p.y, dd = Math.hypot(dx, dy), step = p.speed * dt;
        p.ang = Math.atan2(dy, dx);
        if (dd <= step + (p.target && !p.target.dead ? p.target.r * 0.6 : 2)) {
          p.x = p.tx; p.y = p.ty;
          if (p.target && !p.target.dead) done = this.projHit(p, p.target);
          else { if (p.splash > 0) this.explode(p, p.tx, p.ty); done = true; }
        } else { p.x += dx / dd * step; p.y += dy / dd * step; }
      }
      // sporen
      if (Math.random() < dt * 40) {
        if (p.kind === 'fire') this.fx.add({ type: 'glow', x: p.x, y: p.y, size: 4, color: '#fb923c', life: 0.3 });
        else if (p.kind === 'void') this.fx.add({ type: 'glow', x: p.x, y: p.y, size: 5, color: '#a21caf', life: 0.35 });
        else if (p.kind === 'time') this.fx.add({ type: 'glow', x: p.x, y: p.y, size: 3, color: '#fcd34d', life: 0.3 });
        else if (p.kind === 'grenade') this.fx.add({ type: 'smoke', x: p.x, y: p.y, size: 2, color: '#9ca3af', life: 0.3 });
        else if (p.trail) this.fx.add({ type: 'glow', x: p.x, y: p.y, size: 2.5, color: p.trail, life: 0.25 });
      }
      if (done) { this.proj[i] = this.proj[this.proj.length - 1]; this.proj.pop(); }
    }
  }
  projHit(p, e) {
    p.hitIds.add(e.id);
    if (p.st.fork > 0 && !p.isFork) {
      const near = this.enemies.filter(o => !o.dead && o !== e && (!o.flying || p.air) && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < (2.6 * TILE) ** 2).sort((a, b) => ((a.x - e.x) ** 2 + (a.y - e.y) ** 2) - ((b.x - e.x) ** 2 + (b.y - e.y) ** 2)).slice(0, p.st.fork);
      for (const o of near) this.proj.push(Object.assign({}, p, { isFork: true, target: o, x: e.x, y: e.ay, sx: e.x, sy: e.ay, tx: o.x, ty: o.ay, dmg: p.dmg * 0.5, splash: 0, pierce: 0, hitIds: new Set([e.id]), arc: false, speed: p.speed * 1.2 }));
    }
    if (p.splash > 0) { this.explode(p, e.x, e.ay); }
    else {
      const crit = Math.random() < p.st.crit;
      this.damage(e, p.dmg, p.h, { crit, critMult: p.st.critMult, color: p.kind === 'time' ? '#fcd34d' : null }); this.applyStatus(e, p.st);
      this.fx.burst(e.x, e.ay, p.color, 5, 90, 2, 0.25, 'spark');
    }
    if (p.pierce > 0) {
      let nxt = null, nd = (2.2 * TILE) ** 2;
      for (const o of this.enemies) { if (o.dead || p.hitIds.has(o.id) || (o.flying && !p.air)) continue; const d2 = (o.x - e.x) ** 2 + (o.y - e.y) ** 2; if (d2 < nd) { nd = d2; nxt = o; } }
      if (nxt) { p.pierce--; p.target = nxt; return false; }
    }
    return true;
  }
  explode(p, x, y) {
    const R = Math.max(0.5, p.splash) * TILE;
    const list = this.enemiesIn(x, y, R, p.air);
    for (const e of list) { const crit = Math.random() < p.st.crit; this.damage(e, p.dmg, p.h, { crit, critMult: p.st.critMult }); this.applyStatus(e, p.st); }
    const col = p.kind === 'void' ? '#d946ef' : p.kind === 'fire' ? '#fb923c' : p.kind === 'grenade' ? '#fde047' : p.color;
    this.fx.ring(x, y, R, col, 0.35, 4); this.fx.burst(x, y, col, 16, 180, 3, 0.45, p.kind === 'void' ? 'glow' : 'dot');
    this.fx.burst(x, y, '#6b7280', 6, 60, 5, 0.6, 'smoke');
    if (p.kind === 'void') this.effects.push({ type: 'implode', x, y, r: R, color: '#d946ef', life: 0.35, max: 0.35 });
    Sfx.play('boom');
    if (p.splash >= 1.3) this.shake(2);
  }
  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const f = this.effects[i];
      if (f.type === 'strike') {
        if (f.target && !f.target.dead) { f.x = f.target.x; f.y = f.target.y; }
        f.delay -= dt;
        if (f.delay <= 0 && !f.fired) {
          f.fired = true; const st = f.st;
          const n = this.hitArea(f.x, f.y, st.splash * TILE, f.dmg, f.h, st, { air: true });
          if (f.exec && f.target && !f.target.dead && !f.target.boss && f.target.hp < f.target.maxHp * f.exec) { f.target.hp = 0; this.floatText(f.x, f.y - 30, 'EXECUTIE', '#fde68a', 16, 0.8); this.kill(f.target, f.h); }
          const w = 1 + (f.h ? f.h.tier * 0.15 : 0);
          if (f.kind === 'laser') { this.effects.push({ type: 'laser', x: f.x, y: f.y, life: 0.3, max: 0.3, w }); this.fx.ring(f.x, f.y, st.splash * TILE, '#93c5fd', 0.35, 4); this.fx.burst(f.x, f.y, '#bfdbfe', 14, 180, 3, 0.4, 'spark'); Sfx.play('laser'); }
          else if (f.kind === 'missile') { this.fx.ring(f.x, f.y, st.splash * TILE, '#fb923c', 0.4, 5); this.fx.burst(f.x, f.y, '#f97316', 18, 200, 4, 0.5); this.fx.burst(f.x, f.y, '#52525b', 8, 60, 7, 0.9, 'smoke'); Sfx.play('boom'); }
          else if (f.kind === 'comet') { this.fx.ring(f.x, f.y, st.splash * TILE, '#fb923c', 0.4, 5); this.fx.burst(f.x, f.y, '#fde68a', 18, 200, 3, 0.5, 'glow'); this.effects.push({ type: 'pillar', x: f.x, y: f.y, life: 0.3, max: 0.3, w: 0.5 }); Sfx.play('boom'); }
          else if (f.kind === 'judge') { this.effects.push({ type: 'pillar', x: f.x, y: f.y, color: '#fde68a', life: 0.55, max: 0.55, w: w * (f.big ? 1.6 : 1) }); this.fx.ring(f.x, f.y, st.splash * TILE, '#fde68a', 0.45, 5); this.fx.burst(f.x, f.y, '#fffbeb', 16, 200, 3, 0.5, 'star'); Sfx.play('laser'); }
          else if (STRIKE_FX[f.kind]) STRIKE_FX[f.kind](this, f, st, w);
          else { const gold = f.kind === 'gold'; this.effects.push({ type: 'bolt', x: f.x, y: f.y, color: gold ? '#fde047' : '#e0e7ff', life: 0.3, max: 0.3, w }); this.fx.ring(f.x, f.y, st.splash * TILE, gold ? '#fbbf24' : '#e0e7ff', 0.35, 4); this.fx.burst(f.x, f.y, '#fde047', 14, 180, 3, 0.4, gold ? 'glow' : 'spark'); Sfx.play(gold ? 'coin' : 'strike'); }
          if (n > 2) this.shake(2);
        }
        if (f.fired) { this.effects[i] = this.effects[this.effects.length - 1]; this.effects.pop(); }
        continue;
      }
      if (f.type === 'drop') {
        f.t += dt;
        if (f.t >= f.dur && !f.done) { f.done = true; f.onEnd && f.onEnd(); }
        if (f.done) { this.effects[i] = this.effects[this.effects.length - 1]; this.effects.pop(); }
        continue;
      }
      if (f.type === 'tornado') {
        f.d -= f.speed * TILE * dt; f.tick -= dt; f.t = (f.t || 0) + dt;
        const p = this.posAt(f.d); f.x = p.x; f.y = p.y;
        if (f.tick <= 0) { f.tick = 0.15; for (const e of this.enemiesIn(p.x, p.y, 1.1 * TILE, true)) { this.damage(e, f.dmg, f.h, { acc: true, color: '#a5f3fc' }); e.d = Math.max(-20, e.d - (e.boss ? 0.08 : 0.4) * TILE); } }
        if (Math.random() < dt * 30) this.fx.add({ type: 'dot', x: p.x + rnd(-14, 14), y: p.y - rnd(0, 40), vx: rnd(-80, 80), vy: rnd(-40, 10), size: 3, color: '#94a3b8', life: 0.5 });
        if (f.d < -20) f.life = 0;
      }
      if (f.type === 'wall') {
        const p = this.posAt(f.d); f.x = p.x; f.y = p.y; f.ang = p.ang; f.tick -= dt;
        for (const e of this.enemies) { if (e.dead || e.flying || e.d > f.d + 6 || e.d < f.d - 30) continue; if (e.boss) { e.slowM = Math.max(e.slowM, 0.6); e.slowT = Math.max(e.slowT, 0.2); } else e.d = Math.min(e.d, f.d - 12); }
        if (f.tick <= 0) { f.tick = 0.5; for (const e of this.enemiesIn(p.x, p.y, 1.1 * TILE, false)) this.damage(e, f.dmg, f.h, { color: '#fde68a' }); }
        if (f.life - dt <= 0 && f.ult) for (const e of this.enemiesIn(p.x, p.y, 2 * TILE, false)) { e.d = Math.max(-20, e.d - (e.boss ? 0.3 : 1.5) * TILE); this.fx.ring(p.x, p.y, 80, '#fde68a', 0.5, 6); }
      }
      if (f.type === 'flare') {
        f.tick -= dt;
        if (f.tick <= 0 && f.h && this.heroes.includes(f.h)) { f.tick = 0.2; const R = f.h.st.range * TILE * 1.25; for (const e of this.enemiesIn(f.h.x, f.h.y, R, true)) { this.damage(e, f.dmg, f.h, { acc: true, color: '#fde047' }); this.applyStatus(e, f.h.st, { noStun: true, noKnock: true }); } }
      }
      if (f.type === 'blackhole') {
        for (const e of this.enemiesIn(f.x, f.y, f.r, true)) {
          this.damage(e, f.dps * dt, f.h, { acc: true, color: '#e879f9' });
          if (!e.boss) { e.stunT = Math.max(e.stunT, 0.12); } else { e.slowM = Math.max(e.slowM, 0.6); e.slowT = Math.max(e.slowT, 0.2); }
        }
        if (Math.random() < dt * 40) { const a = Math.random() * TAU; this.fx.add({ type: 'glow', x: f.x + Math.cos(a) * f.r, y: f.y + Math.sin(a) * f.r, vx: -Math.cos(a) * f.r * 1.6, vy: -Math.sin(a) * f.r * 1.6, size: 3, color: '#e879f9', life: 0.5, drag: 0 }); }
      }
      f.life -= dt;
      if (f.life <= 0) { this.effects[i] = this.effects[this.effects.length - 1]; this.effects.pop(); }
    }
  }

  /* ---------- hoofd-update ---------- */
  update(dtRaw) {
    let dt = dtRaw;
    if (this.cutin) { this.cutin.life -= dtRaw; if (this.cutin.ult && this.cutin.life > this.cutin.max - 0.7) dt *= 0.25; if (this.cutin.life <= 0) this.cutin = null; }
    this.fx.update(dt); this.updateAmbient(dt);
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.96; if (t.life <= 0) this.texts.splice(i, 1); }
    for (let i = this.banners.length - 1; i >= 0; i--) { if (i > 0) continue; this.banners[i].life -= dtRaw; if (this.banners[i].life <= 0) this.banners.splice(i, 1); }
    if (this.flash) { this.flash.life -= dtRaw; if (this.flash.life <= 0) this.flash = null; }
    this.shakeA = Math.max(0, this.shakeA - dtRaw * 30);
    if (this.over) return;
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    if (this.queue.length) {
      this.spawnT -= dt;
      while (this.queue.length && this.spawnT <= 0) { const q = this.queue.shift(); if (q.type !== '__pause') { const ne = this.spawnEnemy(q.type, -10, this.wave); this.rollElite(ne, q); } this.spawnT += q.gap; }
    }
    for (const e of this.enemies) if (!e.dead) this.updateEnemy(e, dt);
    if (this.over) return;
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    this.revealPass(dt);
    this.applyAuras();
    for (const h of this.heroes) this.updateHero(h, dt);
    if (this.heroes.some(h => h.temp)) for (const h of this.heroes) if (h.temp) { h.temp -= dt; if (h.temp <= 0) { h.gone = true; this.fx.burst(h.x, h.y - 8, '#c4b5fd', 20, 140, 4, 0.6, 'smoke'); } }
    if (this.heroes.some(h => h.gone)) this.heroes = this.heroes.filter(h => !h.gone);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateExt(dt);
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    if (this.mode === 'coop' && this.wave > 0) { this.coopTime -= dt; if (this.coopTime <= 0) { this.coopTime = 0; this.cleared = 1; this.win(); return; } }
    if (this.bonusPending && !this.queue.length && !this.enemies.length && this.mode !== 'coop') {
      this.payWaveBonus(); this.cleared = this.wave; this.panelDirty = true;
      if (this.wave >= this.totalWaves) this.win();
      else if (this.mode === 'dungeon' && this.wave % DUNGEON.wavesPerRoom === 0) this.offerRelic();
      else if (this.autoWave) this.autoT = this.mode === 'bossrush' ? 3 : 1.5;
      this.emit('cleared');
    }
    if (this.autoDirect && this.autoWave && this.wave > 0 && this.autoT < 0 && this.enemies.length && this.canStartWave() && !(this.mode === 'dungeon' && this.wave % DUNGEON.wavesPerRoom === 0)) this.autoT = this.mode === 'bossrush' ? 2.5 : 1.2;
    if (this.autoT > 0) { this.autoT -= dt; if (this.autoT <= 0) { this.autoT = -1; this.startWave(); } }
    if (this.autoWave && this.canStartWave() && !this.bonusPending && this.wave === 0 && this.heroes.length) this.startWave();
  }
  updateAmbient(dt) {
    const amb = this.theme.amb; if (amb === 'none') return;
    const rate = ({ firefly: 3, dust: 10, snow: 22, rain: 40, ember: 14, bats: 1.5, sparkle: 6, confetti: 18, motes: 8, clouds: 0.5, bubbles: 10 }[amb] || 0) * (Store.data.settings.fxHigh ? 1 : 0.3);
    if (Math.random() < rate * dt && this.amb.length < 160) {
      switch (amb) {
        case 'firefly': this.amb.push({ x: rnd(0, GW), y: rnd(0, GH), vx: rnd(-10, 10), vy: rnd(-10, 10), life: rnd(3, 6), t: 0, k: amb }); break;
        case 'dust': this.amb.push({ x: -20, y: rnd(0, GH), vx: rnd(80, 160), vy: rnd(-5, 5), life: 8, t: 0, k: amb }); break;
        case 'snow': this.amb.push({ x: rnd(-40, GW), y: -10, vx: rnd(10, 30), vy: rnd(30, 60), life: 14, t: 0, k: amb, s: rnd(1, 2.6) }); break;
        case 'rain': this.amb.push({ x: rnd(0, GW + 100), y: -20, vx: -60, vy: rnd(420, 560), life: 2, t: 0, k: amb }); break;
        case 'ember': this.amb.push({ x: rnd(0, GW), y: GH + 10, vx: rnd(-15, 15), vy: rnd(-50, -30), life: 12, t: 0, k: amb, s: rnd(1, 2.5) }); break;
        case 'bats': this.amb.push({ x: -20, y: rnd(20, GH * 0.6), vx: rnd(90, 150), vy: rnd(-10, 10), life: 12, t: 0, k: amb, s: rnd(3, 5) }); break;
        case 'sparkle': this.amb.push({ x: rnd(0, GW), y: rnd(0, GH), vx: 0, vy: 0, life: 0.8, t: 0, k: amb, s: rnd(1.5, 3) }); break;
        case 'confetti': this.amb.push({ x: rnd(0, GW), y: -10, vx: rnd(-20, 20), vy: rnd(40, 80), life: 14, t: 0, k: amb, s: rnd(2, 3.5), c: ['#f472b6', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa'][Math.floor(rnd(0, 5))] }); break;
        case 'motes': this.amb.push({ x: rnd(0, GW), y: GH + 10, vx: rnd(-10, 10), vy: rnd(-35, -20), life: 14, t: 0, k: amb, s: rnd(1, 2.2) }); break;
        case 'clouds': this.amb.push({ x: -120, y: rnd(0, GH), vx: rnd(15, 30), vy: 0, life: 60, t: 0, k: amb, s: rnd(30, 60) }); break;
        case 'bubbles': this.amb.push({ x: rnd(0, GW), y: GH + 10, vx: rnd(-8, 8), vy: rnd(-45, -25), life: 16, t: 0, k: amb, s: rnd(1.5, 4) }); break;
      }
    }
    for (let i = this.amb.length - 1; i >= 0; i--) {
      const a = this.amb[i]; a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.k === 'firefly') { a.vx += rnd(-30, 30) * dt; a.vy += rnd(-30, 30) * dt; }
      if (a.t > a.life || a.y > GH + 30 || a.x > GW + 160 || a.y < -40) this.amb.splice(i, 1);
    }
  }
  win() { if (this.over) return; this.over = true; this.result = { win: true }; Sfx.play('win'); this.banner(this.mode === 'coop' ? 'Tijd is om!' : 'Gewonnen!', this.mode === 'coop' ? `${fmt(this.coopDmg)} schade aan de wereldbaas` : this.raid ? `${this.raid.name} voltooid` : `${this.map.name} verdedigd`, '#3ddc97'); this.emit('end'); }
  lose() { if (this.over) return; this.over = true; this.hp = 0; this.result = { win: false }; Sfx.play('lose'); this.banner('Basis gevallen', this.totalWaves === Infinity ? `Je haalde golf ${this.wave}` : `Golf ${this.wave} van ${this.totalWaves}`, '#ff4d5e'); this.emit('end'); }
  quit() { if (this.over) return; this.over = true; this.result = { win: false, quit: true }; this.emit('end'); }

  /* =================== render =================== */
  render(ctx, k) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.save();
    if (this.shakeA > 0) ctx.translate(rnd(-this.shakeA, this.shakeA) * 0.6, rnd(-this.shakeA, this.shakeA) * 0.6);
    ctx.drawImage(this.bg, 0, 0, GW, GH);
    const t = this.time;
    this.drawPathFlow(ctx, t);
    this.drawPortal(ctx, t); this.drawBase(ctx, t);
    // plaatsen: vrije tegels
    if (this.placing) {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      for (const [x, y] of this.freeTiles) if (!this.heroes.some(h => h.tx === x && h.ty === y)) ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
    }
    // bereik geselecteerde held
    if (this.sel) this.drawRange(ctx, this.sel.x, this.sel.y, this.sel.st.range * TILE, '#ffffff', true);
    // effecten onder vijanden
    for (const f of this.effects) if (f.type === 'blackhole' || f.type === 'implode' || f.type === 'strike' || f.type === 'flare') this.drawEffect(ctx, f, t);
    this.drawExt(ctx, t, true);
    const ground = this.enemies.filter(e => !e.flying).sort((a, b) => a.y - b.y);
    for (const e of ground) this.drawEnemy(ctx, e, t);
    // helden
    const hs = this.heroes.slice().sort((a, b) => a.y - b.y);
    for (const h of hs) this.drawHeroUnit(ctx, h, t);
    for (const h of hs) if (h.beamTargets.length) this.drawBeams(ctx, h, t);
    for (const e of this.enemies) if (e.flying) this.drawEnemy(ctx, e, t);
    for (const p of this.proj) this.drawProj(ctx, p, t);
    for (const f of this.effects) if (!(f.type === 'blackhole' || f.type === 'implode' || f.type === 'strike' || f.type === 'flare')) this.drawEffect(ctx, f, t);
    this.drawExt(ctx, t, false);
    this.fx.draw(ctx);
    this.drawAmbient(ctx, t);
    // ghost bij plaatsen
    if (this.placing && this.hover) {
      const { tx, ty } = this.hover, H = HERO[this.placing], ok = !this.placeCheck(this.placing, tx, ty);
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      const st = computeStats(H, 0, this.levels[this.placing] || 1);
      this.drawRange(ctx, cx, cy, st.range * TILE, ok ? '#3ddc97' : '#ff4d5e', false);
      ctx.fillStyle = ok ? 'rgba(61,220,151,.25)' : 'rgba(255,77,94,.3)'; ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.globalAlpha = 0.75; drawHero(ctx, H, cx, cy - 4, 1, performance.now() / 1000, { ang: 0.3 }); ctx.globalAlpha = 1;
    } else if (this.hover && !this.placing) {
      const hh = this.heroes.find(h => h.tx === this.hover.tx && h.ty === this.hover.ty);
      if (hh && hh !== this.sel) this.drawRange(ctx, hh.x, hh.y, hh.st.range * TILE, '#ffffff', false, 0.35);
    }
    for (const tx of this.texts) {
      const f = tx.life / tx.max; ctx.globalAlpha = Math.min(1, f * 2);
      ctx.font = `700 ${tx.size}px 'Barlow Condensed', 'Arial Narrow', sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 3.5; ctx.strokeStyle = EDGE; ctx.strokeText(tx.text, tx.x, tx.y); ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    this.drawBossBar(ctx);
    if (this.banners.length) this.drawBanner(ctx, this.banners[0]);
    if (this.cutin) this.drawCutin(ctx, this.cutin);
    if (this.flash) { ctx.globalAlpha = (this.flash.life / this.flash.max) * 0.7; ctx.fillStyle = this.flash.color; ctx.fillRect(0, 0, GW, GH); ctx.globalAlpha = 1; }
  }
  drawRange(ctx, x, y, R, col, fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    if (fill) { ctx.fillStyle = rgba(col, 0.08); circle(ctx, x, y, R); ctx.fill(); }
    ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -performance.now() / 60; circle(ctx, x, y, R); ctx.stroke(); ctx.restore();
  }
  drawPathFlow(ctx, t) {
    ctx.save(); ctx.fillStyle = this.map.theme === 'snow' || this.map.theme === 'desert' ? 'rgba(40,30,60,.22)' : 'rgba(255,255,255,.12)';
    for (let d = (t * 30) % 70; d < this.pathLen; d += 70) {
      const p = this.posAt(d); if (p.x < 0 || p.x > GW || p.y < 0 || p.y > GH) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -6); ctx.lineTo(-1, 0); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  drawPortal(ctx, t) {
    const { x, y } = this.portal; ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26); g.addColorStop(0, 'rgba(217,70,239,.9)'); g.addColorStop(1, 'rgba(76,29,149,0)'); ctx.fillStyle = g; circle(ctx, 0, 0, 26); ctx.fill();
    ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 8 + i * 5, t * (2 + i) + i, t * (2 + i) + i + 3.6); ctx.stroke(); }
    ctx.restore();
  }
  drawBase(ctx, t) {
    const { x, y } = this.base, f = this.hp / this.maxHp; ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = EDGE; ctx.lineWidth = 2; rr(ctx, -18, -18, 36, 36, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.font = "16px Bungee, Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', 0, 1);
    const col = f > 0.5 ? '#3ddc97' : f > 0.25 ? '#ffd23f' : '#ff4d5e';
    ctx.strokeStyle = rgba(col, 0.5 + Math.sin(t * 3) * 0.2); ctx.lineWidth = 3; circle(ctx, 0, 0, 24 + Math.sin(t * 2) * 1.5); ctx.stroke();
    ctx.restore();
  }
  drawHeroUnit(ctx, h, t) {
    const H = h.def, L = h.look;
    const st = h.st || {};
    if (h.trait && rarOrdG(h.trait.rarity) >= 6) this.drawTraitSigil(ctx, h, t);
    if ((st.buffRate || st.buffDmg) && st.buffRange < 90) { const ph = (t * 0.6 + h.seed) % 1; ctx.strokeStyle = rgba(L.suit2, 0.3 * (1 - ph)); ctx.lineWidth = 2; circle(ctx, h.x, h.y, st.buffRange * TILE * ph); ctx.stroke(); }
    if (h.temp) ctx.globalAlpha = 0.55 + Math.sin(t * 8) * 0.1;
    if (this.sel === h) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(h.x, h.y + 14, 18, 7, 0, 0, TAU); ctx.stroke(); }
    if (h.buffs.length) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(L.suit2, 0.25 + Math.sin(t * 10) * 0.1); circle(ctx, h.x, h.y - 6, 24); ctx.fill(); ctx.restore(); }
    if (h.buffs.some(b => b.clone)) {
      for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; ctx.globalAlpha = 0.4; drawHero(ctx, H, h.x + Math.cos(a) * 18, h.y + Math.sin(a) * 6, 0.85, t + i, { tier: h.tier, atk: h.atk, ang: h.ang, seed: h.seed + i, look: L }); }
      ctx.globalAlpha = 1;
    }
    drawHero(ctx, H, h.x, h.y - 4, 1, h.t, { tier: h.tier, atk: h.atk, ang: h.ang, seed: h.seed, stun: h.stunT > 0, pulse: h.pulse, look: L });
    if (h.stunT > 0 && h.disabledBy) { ctx.fillStyle = '#ff4d5e'; ctx.font = "700 11px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('UITGESCHAKELD', h.x, h.y - 32); }
    ctx.globalAlpha = 1;
    if (h.temp) return;
    if (h.ext && h.ext.length) { ctx.fillStyle = '#3ddc97'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; const by = h.y - 30 + Math.sin(t * 4 + h.seed) * 1.5; ctx.beginPath(); ctx.moveTo(h.x - 14, by + 3); ctx.lineTo(h.x - 10, by - 2); ctx.lineTo(h.x - 6, by + 3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (h.tier > 0) { for (let i = 0; i < 5; i++) { ctx.fillStyle = i < h.tier ? (H.upgrades[i].major ? '#ffd23f' : '#ffffff') : 'rgba(255,255,255,.2)'; ctx.fillRect(h.x - 12 + i * 5, h.y + 19, 4, 3); } }
    if (h.abilCd <= 0) { ctx.save(); ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; const b = Math.sin(t * 5) * 1.5; circle(ctx, h.x + 13, h.y - 26 + b, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = EDGE; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', h.x + 13, h.y - 26 + b); ctx.restore(); }
  }
  drawBeams(ctx, h, t) {
    const L = h.look, sx = h.x + Math.cos(h.ang) * 12, sy = h.y - 12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const prism = h.def.special === 'prism';
    if (h.beamChains) for (const [a, b] of h.beamChains) { ctx.strokeStyle = prism ? `hsla(${(t * 200 + a.id * 40) % 360},100%,70%,.8)` : rgba(L.suit2, 0.7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a.x, a.ay); ctx.lineTo(b.x, b.ay); ctx.stroke(); }
    h.beamTargets.forEach((e, bi) => {
      const col = prism ? `hsl(${(bi * 72 + t * 120) % 360},100%,65%)` : L.suit2;
      const r = h.beamRamp[e.id] || 1, w = 3 + r * 2 + h.tier * 0.5;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35; ctx.lineWidth = w * 2.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x, e.ay); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x, e.ay); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.35; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x, e.ay); ctx.stroke();
      ctx.fillStyle = col; ctx.globalAlpha = 0.8; circle(ctx, e.x, e.ay, 5 + r * 2 + Math.sin(t * 30) * 1.5); ctx.fill(); ctx.globalAlpha = 1;
    });
    ctx.restore();
  }
  drawEnemy(ctx, e, t) {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.type === 'wyrm') {
      for (let i = 6; i >= 1; i--) { const p = this.posAt(e.d - i * 13); ctx.fillStyle = shade('#0ea5e9', -0.1 - i * 0.05); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; circle(ctx, p.x - e.x, p.y - e.y - 16 + Math.sin(t * 6 - i) * 3, e.r * (0.75 - i * 0.07)); ctx.fill(); ctx.stroke(); }
    }
    if (e.invulnT > 0 && e.E.abilities && e.E.abilities.includes('submerge')) { ctx.strokeStyle = 'rgba(125,211,252,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 4, e.r * (0.6 + i * 0.35) + Math.sin(t * 6 + i) * 3, e.r * 0.3 * (1 + i * 0.3), 0, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 0.3; }
    if (e.dmgRed > 0) for (const o of this.enemies) if (o.type === 'rotsschild' && !o.dead) { ctx.strokeStyle = 'rgba(251,191,36,.45)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.x - e.x, o.y - e.y); ctx.stroke(); ctx.setLineDash([]); }
    drawEnemyBody(ctx, e, e.t);
    ctx.globalAlpha = 1;
    if (e.vulnT > 0 && e.vulnM > 0.25) { ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = '#a3e635'; ctx.font = "700 12px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('VLOEK', 0, (e.flying ? -16 : 0) - e.r - 14); ctx.restore(); }
    if (e.enraged) { ctx.strokeStyle = rgba('#ef4444', 0.5 + Math.sin(t * 10) * 0.3); ctx.lineWidth = 3; circle(ctx, 0, e.flying ? -16 : 0, e.r * 1.35); ctx.stroke(); }
    if (e.flash > 0) { ctx.globalAlpha = e.flash * 0.55; ctx.fillStyle = '#ffffff'; circle(ctx, 0, e.flying ? -16 : 0, e.r * 1.05); ctx.fill(); ctx.globalAlpha = 1; }
    const oy = e.flying ? -16 : 0;
    if (e.slowT > 0) { ctx.strokeStyle = 'rgba(125,211,252,.85)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); circle(ctx, 0, oy, e.r + 4); ctx.stroke(); ctx.setLineDash([]); }
    if (e.stunT > 0) { ctx.fillStyle = '#ffe066'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; circle(ctx, Math.cos(a) * e.r * 0.8, oy - e.r - 6 + Math.sin(a) * 3, 2.2); ctx.fill(); } }
    if (!e.boss && (e.hp < e.maxHp || e.shield > 0)) {
      const w = Math.max(20, e.r * 2), y = oy - e.r - 9;
      ctx.fillStyle = 'rgba(5,4,13,.85)'; ctx.fillRect(-w / 2 - 1, y - 1, w + 2, 6);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#3ddc97' : e.hp / e.maxHp > 0.25 ? '#ffd23f' : '#ff4d5e'; ctx.fillRect(-w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 4);
      if (e.shield > 0) { ctx.fillStyle = '#7dd3fc'; ctx.fillRect(-w / 2, y - 3, w * clamp(e.shield / e.maxShield, 0, 1), 2); }
    }
    ctx.restore();
  }
  drawProj(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    switch (p.kind) {
      case 'arrow': ctx.rotate(p.ang || 0); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.fill(); ctx.fillStyle = p.color; ctx.fillRect(-10, -2, 3, 4); break;
      case 'bullet': ctx.rotate(p.ang || 0); ctx.fillStyle = '#fde047'; ctx.fillRect(-5, -1.5, 8, 3); break;
      case 'shuriken': ctx.rotate(p.rot); ctx.fillStyle = '#e4e4e7'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 1.8 : 6; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'grenade': ctx.rotate(p.rot * 0.5); ctx.fillStyle = '#4d7c0f'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; circle(ctx, 0, 0, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fde047'; circle(ctx, 3, -4, 1.8); ctx.fill(); break;
      case 'fire': { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 10); g.addColorStop(0, '#fff7c2'); g.addColorStop(0.4, '#fb923c'); g.addColorStop(1, 'rgba(239,68,68,0)'); ctx.fillStyle = g; circle(ctx, 0, 0, 10); ctx.fill(); break; }
      case 'time': ctx.rotate(p.rot); ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 2; ctx.shadowColor = '#fcd34d'; ctx.shadowBlur = 8; circle(ctx, 0, 0, 5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -4); ctx.moveTo(0, 0); ctx.lineTo(3, 0); ctx.stroke(); break;
      case 'plasma': ctx.rotate(p.ang || 0); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(244,114,182,.5)'; rr(ctx, -9, -3, 14, 6, 3); ctx.fill(); ctx.fillStyle = '#a5f3fc'; rr(ctx, -4, -1.5, 8, 3, 1.5); ctx.fill(); break;
      case 'star': ctx.rotate(p.rot); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 10; drawEmblem(ctx, 'star', 7, '#fef3c7'); break;
      case 'coin': ctx.rotate(p.rot * 0.6); ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 5 * Math.abs(Math.cos(p.rot)) + 1, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); break;
      case 'snipe': ctx.rotate(p.ang || 0); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(217,249,157,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#fef9c3'; circle(ctx, 4, 0, 2.5); ctx.fill(); break;
      case 'shield': ctx.rotate(p.rot); for (const [r, c] of [[7, '#dc2626'], [5, '#f8fafc'], [3, '#1d4ed8']]) { ctx.fillStyle = c; circle(ctx, 0, 0, r); ctx.fill(); } ctx.strokeStyle = EDGE; ctx.lineWidth = 1; circle(ctx, 0, 0, 7); ctx.stroke(); break;
      case 'phantom': ctx.rotate(p.ang || 0); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(196,181,253,.35)'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-16, -5); ctx.lineTo(-16, 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ede9fe'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill(); break;
      case 'void': { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 13); g.addColorStop(0, '#05040d'); g.addColorStop(0.55, '#4c1d95'); g.addColorStop(1, 'rgba(217,70,239,0)'); ctx.fillStyle = g; circle(ctx, 0, 0, 13); ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 7, p.rot, p.rot + 2); ctx.stroke(); break; }
      default: ctx.fillStyle = p.color; circle(ctx, 0, 0, 4); ctx.fill();
    }
    ctx.restore();
  }
  drawEffect(ctx, f, t) {
    const a = clamp(f.life / (f.max || 1), 0, 1);
    ctx.save();
    switch (f.type) {
      case 'slash': ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.strokeStyle = rgba(f.color, a); ctx.lineWidth = f.big ? 5 : 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-6, 0, f.big ? 20 : 13, -1, 1); ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-6, 0, f.big ? 16 : 10, -0.8, 0.8); ctx.stroke(); break;
      case 'lightning': ctx.globalCompositeOperation = 'lighter'; for (const [w, c] of [[f.w * 3, rgba(f.color, 0.35 * a)], [f.w, rgba('#ffffff', a)]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i < f.pts.length - 1; i++) { const p = f.pts[i], q = f.pts[i + 1]; if (i === 0) ctx.moveTo(p.x, p.y); for (let s = 1; s <= 4; s++) { const k = s / 4; ctx.lineTo(lerp(p.x, q.x, k) + (s < 4 ? rnd(-6, 6) : 0), lerp(p.y, q.y, k) + (s < 4 ? rnd(-6, 6) : 0)); } } ctx.stroke(); } break;
      case 'bolt': { ctx.globalCompositeOperation = 'lighter'; let x = f.x + rnd(-10, 10), y = f.y - 260; ctx.strokeStyle = rgba(f.color || '#e0e7ff', a); ctx.lineWidth = 3 * f.w; ctx.beginPath(); ctx.moveTo(x, y); while (y < f.y) { y += 26; x = y >= f.y ? f.x : x + rnd(-14, 14); ctx.lineTo(x, Math.min(y, f.y)); } ctx.stroke(); ctx.fillStyle = rgba('#c7d2fe', 0.5 * a); circle(ctx, f.x, f.y, 22 * a + 6); ctx.fill(); break; }
      case 'laser': { ctx.globalCompositeOperation = 'lighter'; const w = (8 + 10 * a) * (f.w || 1); const g = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0); g.addColorStop(0, 'rgba(147,197,253,0)'); g.addColorStop(0.5, rgba('#dbeafe', a)); g.addColorStop(1, 'rgba(147,197,253,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - w, 0, w * 2, f.y); ctx.fillStyle = rgba('#ffffff', a); circle(ctx, f.x, f.y, w); ctx.fill(); break; }
      case 'strike': if (f.kind === 'comet') { const k = clamp(f.delay / 0.22, 0, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(f.x - k * 50, f.y - k * 220); ctx.strokeStyle = 'rgba(251,146,60,.8)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, -110); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = '#fff7c2'; circle(ctx, 0, 0, 6); ctx.fill(); ctx.restore(); }
        if (f.kind === 'missile') { const k = clamp(f.delay / (f.max || 0.5), 0, 1); ctx.save(); ctx.translate(f.x + k * 40, f.y - k * 220); ctx.rotate(Math.atan2(220, -40)); ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; rr(ctx, -8, -2.5, 16, 5, 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f97316'; circle(ctx, -9, 0, 3 + Math.random() * 2); ctx.fill(); ctx.restore(); }
        if (f.kind === 'judge') { ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, 0.4); ctx.rotate(t * 2); ctx.strokeStyle = rgba('#fde68a', 0.9); ctx.lineWidth = 3; circle(ctx, 0, 0, 22); ctx.stroke(); ctx.beginPath(); for (let i = 0; i <= 5; i++) { const q = i * TAU / 5 * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(q) * 22, Math.sin(q) * 22); } ctx.stroke(); ctx.restore(); break; }
        ctx.strokeStyle = rgba(f.kind === 'laser' ? '#93c5fd' : f.kind === 'missile' ? '#fb923c' : f.kind === 'gold' ? '#fde047' : '#e0e7ff', 0.8); ctx.lineWidth = 2; ctx.setLineDash([4, 4]); circle(ctx, f.x, f.y, f.st.splash * TILE * (0.4 + (f.delay / 0.22) * 0.6)); ctx.stroke(); ctx.setLineDash([]); break;
      case 'implode': ctx.strokeStyle = rgba(f.color, a); ctx.lineWidth = 3; circle(ctx, f.x, f.y, f.r * a); ctx.stroke(); ctx.lineWidth = 1.5; circle(ctx, f.x, f.y, f.r * a * 0.6); ctx.stroke(); break;
      case 'drop': { const k = clamp(f.t / f.dur, 0, 1), y = lerp(f.y - 240, f.y, k * k), x = lerp(f.x - 40, f.x, k);
        if (f.kind === 'arrow') { ctx.translate(x, y); ctx.rotate(Math.atan2(240, 40)); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.fill(); }
        else if (f.kind === 'star') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(k * 8); ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 20; drawEmblem(ctx, 'star', 18 + 6 * k, '#fef3c7'); ctx.restore(); ctx.strokeStyle = 'rgba(253,230,138,.6)'; ctx.setLineDash([4, 4]); circle(ctx, f.x, f.y, 50 * (1 - k) + 12); ctx.stroke(); }
        else { ctx.fillStyle = '#3f3f46'; ctx.strokeStyle = EDGE; circle(ctx, x, y, 6); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.setLineDash([3, 3]); circle(ctx, f.x, f.y, 20 * (1 - k) + 8); ctx.stroke(); }
        break; }
      case 'flare': { if (!f.h) break; const R = f.h.st.range * TILE * 1.25; ctx.globalCompositeOperation = 'lighter'; ctx.translate(f.h.x, f.h.y - 6);
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, R); g.addColorStop(0, rgba('#fde047', 0.45)); g.addColorStop(1, 'rgba(251,146,60,0)'); ctx.fillStyle = g; circle(ctx, 0, 0, R); ctx.fill();
        ctx.rotate(t * 1.5); ctx.strokeStyle = rgba('#fff7c2', 0.5); ctx.lineWidth = 6; for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(R, 0); ctx.stroke(); } break; }
      case 'blackhole': { ctx.translate(f.x, f.y); const R = f.r; const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R); g.addColorStop(0, '#000'); g.addColorStop(0.35, 'rgba(46,16,101,.95)'); g.addColorStop(0.8, 'rgba(217,70,239,.25)'); g.addColorStop(1, 'rgba(217,70,239,0)'); ctx.fillStyle = g; circle(ctx, 0, 0, R); ctx.fill();
        ctx.strokeStyle = 'rgba(240,171,252,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, R * (0.3 + i * 0.15), t * (3 - i * 0.5) + i, t * (3 - i * 0.5) + i + 2.4); ctx.stroke(); } break; }
      case 'pillar': { ctx.globalCompositeOperation = 'lighter'; const w = (10 + 16 * a) * (f.w || 1); const g = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0); g.addColorStop(0, 'rgba(253,230,138,0)'); g.addColorStop(0.5, rgba('#fffbeb', a)); g.addColorStop(1, 'rgba(253,230,138,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - w, 0, w * 2, f.y);
        ctx.fillStyle = rgba('#fde68a', 0.6 * a); ctx.beginPath(); ctx.ellipse(f.x, f.y, w * 2.2, w * 0.8, 0, 0, TAU); ctx.fill(); break; }
      case 'rays': { ctx.globalCompositeOperation = 'lighter'; f.pts.forEach((p, i) => { ctx.strokeStyle = `hsla(${(i * 47 + t * 300) % 360},100%,65%,${a})`; ctx.lineWidth = 3 + 4 * a; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }); ctx.fillStyle = rgba('#ffffff', a); circle(ctx, f.x, f.y, 14 + 20 * a); ctx.fill(); break; }
      case 'tornado': { ctx.translate(f.x, f.y); const sp = (f.t || 0) * 14; for (let i = 0; i < 7; i++) { const yy = -i * 8, rw = 8 + i * 4.5; ctx.strokeStyle = `rgba(${200 - i * 10},${230 - i * 6},255,${0.75 - i * 0.07})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(Math.sin(sp * 0.3 + i) * 4, yy, rw, rw * 0.3, 0, sp + i, sp + i + 4.5); ctx.stroke(); } break; }
      case 'bigbang': { const k = 1 - a; ctx.globalCompositeOperation = 'lighter';
        if (k < 0.3) { const r = (1 - k / 0.3) * 600; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 8; circle(ctx, f.x, f.y, r); ctx.stroke(); ctx.fillStyle = 'rgba(167,139,250,.25)'; ctx.fillRect(0, 0, GW, GH); }
        else { const r = (k - 0.3) / 0.7 * 900; for (let i = 0; i < 4; i++) { ctx.strokeStyle = `hsla(${260 + i * 25},100%,75%,${a})`; ctx.lineWidth = 10 - i * 2; circle(ctx, f.x, f.y, r * (1 - i * 0.12)); ctx.stroke(); } ctx.fillStyle = rgba('#ffffff', a * 0.5); ctx.fillRect(0, 0, GW, GH); }
        break; }
      case 'wall': { ctx.translate(f.x, f.y); ctx.rotate(f.ang + Math.PI / 2); ctx.globalCompositeOperation = 'lighter'; const fl = Math.min(1, f.life * 2);
        ctx.fillStyle = `rgba(253,230,138,${0.25 * fl})`; rr(ctx, -24, -7, 48, 14, 5); ctx.fill(); ctx.strokeStyle = `rgba(254,243,199,${0.9 * fl})`; ctx.lineWidth = 3; rr(ctx, -24, -7, 48, 14, 5); ctx.stroke();
        ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -7); ctx.lineTo(i * 9 + 4, 7); ctx.stroke(); }
        ctx.fillStyle = `rgba(251,191,36,${0.5 * fl + Math.sin(t * 10) * 0.1})`; circle(ctx, 0, 0, 5); ctx.fill(); break; }
      case 'tint': ctx.globalAlpha = a * f.alpha; ctx.fillStyle = f.color; ctx.fillRect(0, 0, GW, GH); break;
      case 'rewind': { ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#0f766e'; ctx.fillRect(0, 0, GW, GH); ctx.globalAlpha = a; ctx.translate(GW / 2, GH / 2); ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 6; circle(ctx, 0, 0, 120); ctx.stroke(); ctx.rotate(-t * 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -90); ctx.stroke(); ctx.rotate(t * 7); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0); ctx.stroke(); break; }
      case 'ring': ctx.strokeStyle = rgba(f.color, a); ctx.lineWidth = 6 * a + 1; circle(ctx, f.x, f.y, lerp(f.r, 8, a)); ctx.stroke(); break;
    }
    ctx.restore();
  }
  drawAmbient(ctx, t) {
    for (const a of this.amb) {
      switch (a.k) {
        case 'firefly': { const al = Math.max(0, Math.sin(a.t * 3)) * Math.min(1, (a.life - a.t)); ctx.fillStyle = `rgba(253,224,71,${al})`; circle(ctx, a.x, a.y, 2); ctx.fill(); ctx.fillStyle = `rgba(253,224,71,${al * 0.25})`; circle(ctx, a.x, a.y, 7); ctx.fill(); break; }
        case 'dust': ctx.strokeStyle = 'rgba(255,237,213,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - 18, a.y); ctx.stroke(); break;
        case 'snow': ctx.fillStyle = 'rgba(255,255,255,.9)'; circle(ctx, a.x + Math.sin(a.t * 2) * 6, a.y, a.s); ctx.fill(); break;
        case 'rain': ctx.strokeStyle = 'rgba(34,211,238,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + 3, a.y - 14); ctx.stroke(); break;
        case 'ember': ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.sin(a.t * 5) * 60)},40,.9)`; circle(ctx, a.x + Math.sin(a.t * 2) * 5, a.y, a.s); ctx.fill(); break;
        case 'bats': { ctx.fillStyle = 'rgba(12,10,20,.85)'; const f = Math.sin(a.t * 18) * a.s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.s * 2, a.y - f); ctx.lineTo(a.x - a.s * 0.6, a.y + a.s * 0.5); ctx.lineTo(a.x, a.y + a.s * 0.3); ctx.lineTo(a.x + a.s * 0.6, a.y + a.s * 0.5); ctx.lineTo(a.x + a.s * 2, a.y - f); ctx.closePath(); ctx.fill(); break; }
        case 'sparkle': { const al = Math.sin(a.t / a.life * Math.PI); ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.save(); ctx.translate(a.x, a.y); drawEmblem(ctx, 'star', a.s * al + 0.5, `rgba(255,255,255,${al})`); ctx.restore(); break; }
        case 'confetti': ctx.fillStyle = a.c; ctx.save(); ctx.translate(a.x + Math.sin(a.t * 3) * 8, a.y); ctx.rotate(a.t * 4); ctx.fillRect(-a.s, -a.s / 2, a.s * 2, a.s); ctx.restore(); break;
        case 'motes': ctx.fillStyle = `rgba(168,85,247,${0.4 + Math.sin(a.t * 4) * 0.3})`; circle(ctx, a.x + Math.sin(a.t * 2) * 6, a.y, a.s); ctx.fill(); break;
        case 'clouds': ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, a.x, a.y, a.s); circle(ctx, a.x + a.s * 0.9, a.y + a.s * 0.1, a.s * 0.75); circle(ctx, a.x - a.s * 0.9, a.y + a.s * 0.15, a.s * 0.6); ctx.fill(); break;
        case 'bubbles': ctx.strokeStyle = 'rgba(165,243,252,.55)'; ctx.lineWidth = 1; circle(ctx, a.x + Math.sin(a.t * 2) * 4, a.y, a.s); ctx.stroke(); break;
      }
    }
  }
  drawBossBar(ctx) {
    if (this.mode === 'coop') return this.drawCoopBar(ctx);
    const b = this.enemies.find(e => e.boss && !e.dead && !e.E.decoy); if (!b) return;
    const w = 420, x = GW / 2 - w / 2, y = 14;
    ctx.fillStyle = 'rgba(5,4,13,.85)'; rr(ctx, x - 8, y - 6, w + 16, 40, 6); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = "13px Bungee, Impact, sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(b.E.name, x, y - 2);
    ctx.textAlign = 'right'; ctx.font = "700 14px 'Barlow Condensed', sans-serif"; ctx.fillText(`${fmt(Math.max(0, b.hp))} / ${fmt(b.maxHp)}`, x + w, y - 1);
    ctx.fillStyle = '#3a0a14'; ctx.fillRect(x, y + 16, w, 12);
    ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x, y + 16, w * clamp(b.hp / b.maxHp, 0, 1), 12);
    if (b.shield > 0) { ctx.fillStyle = 'rgba(125,211,252,.85)'; ctx.fillRect(x, y + 16, w * clamp(b.shield / b.maxShield, 0, 1), 4); }
  }
  drawBanner(ctx, b) {
    const f = b.life / b.max, inT = clamp((1 - f) * 8, 0, 1), outT = clamp(f * 6, 0, 1), a = Math.min(inT, outT);
    const y = GH * 0.42;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(GW / 2 + (1 - inT) * -200, y); ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.fillStyle = 'rgba(5,4,13,.85)'; ctx.fillRect(-GW, -38, GW * 2, 76);
    ctx.fillStyle = b.color; ctx.fillRect(-GW, -38, GW * 2, 4); ctx.fillRect(-GW, 34, GW * 2, 4);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "34px Bungee, Impact, sans-serif"; ctx.lineWidth = 6; ctx.strokeStyle = EDGE; ctx.strokeText(b.text, GW / 2, y - 8); ctx.fillStyle = b.color; ctx.fillText(b.text, GW / 2, y - 8);
    if (b.sub) { ctx.font = "600 17px Barlow, sans-serif"; ctx.fillStyle = '#eeebff'; ctx.fillText(b.sub, GW / 2, y + 22); }
    ctx.restore();
  }
  drawCutin(ctx, c) {
    const H = c.h.def, L = c.h.look || H.look, f = 1 - c.life / c.max, inT = clamp(f * 6, 0, 1), outT = clamp((c.life / c.max) * 6, 0, 1), a = Math.min(inT, outT);
    const y = GH * 0.5, hgt = c.ult ? 150 : 110;
    ctx.save(); ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#05040d'; ctx.fillRect(0, 0, GW, GH); ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - inT) * -GW * 0.6 + (1 - outT) * GW * 0.6, 0);
    ctx.save(); ctx.translate(GW / 2, y); ctx.transform(1, -0.08, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(-GW / 2, 0, GW / 2, 0); g.addColorStop(0, L.suit); g.addColorStop(0.6, shade(L.suit, -0.4)); g.addColorStop(1, L.cape || L.suit2);
    ctx.fillStyle = g; ctx.fillRect(-GW, -hgt / 2, GW * 2, hgt);
    ctx.fillStyle = L.suit2; ctx.fillRect(-GW, -hgt / 2 - 6, GW * 2, 6); ctx.fillRect(-GW, hgt / 2, GW * 2, 6);
    ctx.globalAlpha = a * 0.25; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let i = 0; i < 14; i++) { const yy = -hgt / 2 + ((i * 37 + f * 900) % hgt); ctx.beginPath(); ctx.moveTo(-GW, yy); ctx.lineTo(GW, yy); ctx.stroke(); }
    ctx.restore();
    ctx.globalAlpha = a;
    drawHero(ctx, H, GW * 0.26, y + (c.ult ? 26 : 18), c.ult ? 3.6 : 2.7, performance.now() / 1000, { tier: c.h.tier, atk: 0.8, ang: 0, look: L });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (c.ult) { ctx.font = "16px Bungee, Impact, sans-serif"; ctx.fillStyle = '#ffd23f'; ctx.fillText('ULTIMATE', GW * 0.42, y - 38); }
    ctx.font = `${c.ult ? 40 : 32}px Bungee, Impact, sans-serif`; ctx.lineWidth = 7; ctx.strokeStyle = EDGE; ctx.strokeText(c.name.toUpperCase(), GW * 0.42, y + 2); ctx.fillStyle = '#ffffff'; ctx.fillText(c.name.toUpperCase(), GW * 0.42, y + 2);
    ctx.font = "600 16px Barlow, sans-serif"; ctx.fillStyle = L.suit2; ctx.fillText(H.name, GW * 0.42, y + (c.ult ? 40 : 34));
    ctx.restore();
  }
}

/* =====================================================================
   Abilities: (game, held, ultimate?) — voeg nieuwe toe met dezelfde naam als in ABILITIES
   ===================================================================== */
const ABILITY_FX = {
  shockwave(g, h, ult) {
    const R = (h.st.range + 1) * TILE * (ult ? 1.5 : 1), dmg = h.st.dmg * (ult ? 6 : 3);
    for (const e of g.enemiesIn(h.x, h.y, R, true)) { g.damage(e, dmg, h); e.stunT = Math.max(e.stunT, (ult ? 2 : 1.2) * (e.boss ? 0.3 : 1)); }
    for (let i = 0; i < 3; i++) g.after(i * 0.1, () => g.fx.ring(h.x, h.y, R * (0.6 + i * 0.2), i ? '#ffd23f' : '#ffffff', 0.5, 6));
    g.fx.burst(h.x, h.y + 10, '#a8a29e', 40, 260, 5, 0.7, 'smoke'); g.shake(ult ? 12 : 7); Sfx.play('boom');
  },
  volley(g, h, ult) {
    const n = ult ? 30 : 14, R = h.st.range * TILE * 1.3;
    for (let i = 0; i < n; i++) g.after(i * 0.07, () => {
      const list = g.enemiesIn(h.x, h.y, R, true); if (!list.length) return;
      const e = list[Math.floor(Math.random() * list.length)], x = e.x, y = e.ay;
      g.effects.push({ type: 'drop', kind: 'arrow', x, y, t: 0, dur: 0.25, onEnd: () => { g.hitArea(x, y, 0.7 * TILE, h.st.dmg * (ult ? 2.5 : 1.8), h, h.st); g.fx.burst(x, y, '#e9c46a', 6, 100, 2, 0.3, 'spark'); Sfx.play('shoot'); } });
    });
  },
  barrage(g, h, ult) { h.buffs.push({ rateMul: 3, multi: 2, dmgMul: ult ? 1.6 : 1, t: ult ? 6 : 4 }); g.fx.burst(h.x, h.y, '#fde047', 20, 160, 3, 0.4, 'spark'); },
  overcharge(g, h, ult) {
    h.buffs.push({ rateMul: 2, chains: ult ? 6 : 3, dmgMul: ult ? 1.5 : 1, t: ult ? 9 : 6 });
    g.fx.burst(h.x, h.y - 10, '#fde047', 40, 240, 3, 0.6, 'spark'); g.fx.ring(h.x, h.y, 50, '#fde047', 0.5, 5);
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.4, true).slice(0, ult ? 12 : 6);
    if (list.length) g.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 12 }, ...list.map(e => ({ x: e.x, y: e.ay }))], color: '#fde047', life: 0.35, max: 0.35, w: 4 });
    for (const e of list) g.damage(e, h.st.dmg * 2, h, { color: '#fde047' });
  },
  blizzard(g, h, ult) {
    const R = (h.st.range + 1) * TILE * (ult ? 1.35 : 1);
    for (const e of g.enemiesIn(h.x, h.y, R, true)) { g.damage(e, h.st.dmg * (ult ? 10 : 4) + 20, h, { color: '#e0f2fe' }); e.stunT = Math.max(e.stunT, (ult ? 3.5 : 2.2) * (e.boss ? 0.35 : 1)); e.slowM = 0.5; e.slowT = 4; }
    g.effects.push({ type: 'tint', color: '#bae6fd', alpha: 0.35, life: 0.8, max: 0.8 });
    for (let i = 0; i < (ult ? 90 : 50); i++) { const a = Math.random() * TAU, r = Math.random() * R; g.fx.add({ type: 'snow', x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r - 40, vy: 70, vx: 20, size: 3, color: '#ffffff', life: 1, drag: 0 }); }
    g.fx.ring(h.x, h.y, R, '#e0f2fe', 0.7, 7); Sfx.play('freeze');
  },
  carpet(g, h, ult) {
    const n = ult ? 16 : 8, R = h.st.range * TILE * 1.5;
    const list = g.enemiesIn(h.x, h.y, R, true);
    let d0 = list.length ? Math.max(...list.map(e => e.d)) + 20 : g.nearestD(h.x, h.y) + 60;
    for (let i = 0; i < n; i++) {
      const d = d0 - i * 30;
      g.after(i * 0.1, () => { const p = g.posAt(d); g.effects.push({ type: 'drop', kind: 'bomb', x: p.x, y: p.y, t: 0, dur: 0.3, onEnd: () => {
        g.hitArea(p.x, p.y, 1.4 * TILE, h.st.dmg * (ult ? 4 : 2.5), h, h.st, { air: true }); g.fx.ring(p.x, p.y, 1.4 * TILE, '#fde047', 0.4, 5); g.fx.burst(p.x, p.y, '#fb923c', 20, 200, 4, 0.5); g.fx.burst(p.x, p.y, '#52525b', 10, 60, 7, 0.9, 'smoke'); g.shake(3); Sfx.play('boom'); } }); });
    }
  },
  titanslam(g, h, ult) {
    const R = (h.st.range + 1.2) * TILE * (ult ? 1.3 : 1), dmg = h.st.dmg * (ult ? 7 : 4);
    for (const e of g.enemiesIn(h.x, h.y, R, true)) { g.damage(e, dmg, h); e.d = Math.max(-20, e.d - (ult ? 3 : 1.5) * TILE * (e.boss ? 0.3 : 1)); if (ult) e.stunT = Math.max(e.stunT, e.boss ? 0.5 : 1.5); }
    g.fx.ring(h.x, h.y, R, '#3b82f6', 0.6, 8); g.fx.ring(h.x, h.y, R * 0.6, '#ffffff', 0.4, 5); g.fx.burst(h.x, h.y + 12, '#94a3b8', 50, 300, 5, 0.7, 'smoke');
    g.shake(ult ? 16 : 10); Sfx.play('bigboom');
  },
  shadowclone(g, h, ult) { h.buffs.push({ rateMul: 3, crit: 1, multi: ult ? 3 : 0, clone: true, t: ult ? 8 : 5 }); g.fx.burst(h.x, h.y, '#312e81', 30, 160, 6, 0.6, 'smoke'); },
  solarflare(g, h, ult) { g.effects.push({ type: 'flare', h, life: ult ? 4.5 : 3, max: ult ? 4.5 : 3, tick: 0, dmg: h.st.dmg * 0.6 * (ult ? 2 : 1) }); g.effects.push({ type: 'tint', color: '#fde047', alpha: 0.2, life: 0.6, max: 0.6 }); },
  thunderstorm(g, h, ult) {
    const n = ult ? 26 : 12, R = h.st.range * TILE * 1.5;
    g.effects.push({ type: 'tint', color: '#1e1b4b', alpha: 0.45, life: n * 0.12 + 0.4, max: n * 0.12 + 0.4 });
    for (let i = 0; i < n; i++) g.after(i * 0.12, () => {
      const list = g.enemiesIn(h.x, h.y, R, true); if (!list.length) return;
      const e = list[Math.floor(Math.random() * list.length)];
      g.hitArea(e.x, e.y, 1.1 * TILE, h.st.dmg * 1.6, h, Object.assign({}, h.st, { stunChance: 0.5, stun: 0.5 }), { air: true });
      g.effects.push({ type: 'bolt', x: e.x, y: e.y, color: '#e0e7ff', life: 0.3, max: 0.3, w: ult ? 1.8 : 1.3 }); g.fx.burst(e.x, e.y, '#e0e7ff', 10, 160, 3, 0.4, 'spark'); Sfx.play('strike'); g.shake(2);
    });
  },
  phoenixdive(g, h, ult) {
    const R = (h.st.range + 0.5) * TILE * (ult ? 1.3 : 1);
    for (const e of g.enemiesIn(h.x, h.y, R, true)) { g.damage(e, h.st.dmg * (ult ? 9 : 5), h, { color: '#fb923c' }); e.burnD = Math.max(e.burnD, h.st.burn * 3); e.burnT = 4; }
    for (let i = 0; i < 4; i++) g.after(i * 0.08, () => g.fx.ring(h.x, h.y, R * (0.5 + i * 0.17), i % 2 ? '#fde047' : '#ef4444', 0.6, 7));
    for (let i = 0; i < (ult ? 80 : 45); i++) { const a = Math.random() * TAU, s = rnd(80, R * 2.2); g.fx.add({ type: 'glow', x: h.x, y: h.y - 8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 5, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', life: 0.6 }); }
    g.shake(ult ? 10 : 6); Sfx.play('fire'); Sfx.play('boom');
  },
  singularity(g, h, ult) {
    const R = h.st.range * TILE * 1.3;
    for (const e of g.enemiesIn(h.x, h.y, R, true)) { g.damage(e, h.st.dmg * (ult ? 8 : 4), h, { color: '#22d3ee' }); e.d = Math.max(-20, e.d - (ult ? 3 : 1.5) * TILE * (e.boss ? 0.3 : 1)); e.stunT = Math.max(e.stunT, e.boss ? 0.3 : 1); e.shred = Math.max(e.shred, h.st.shred + 3); }
    g.effects.push({ type: 'implode', x: h.x, y: h.y, r: R, color: '#22d3ee', life: 0.6, max: 0.6 });
    g.effects.push({ type: 'blackhole', x: h.x, y: h.y, r: TILE * 0.9, life: 0.8, max: 0.8, dps: 0, h });
    g.shake(8); Sfx.play('void');
  },
  orbitalcannon(g, h, ult) {
    const e = g.strongest(); if (!e) { g.floatText(h.x, h.y - 30, 'Geen doel', '#ffffff', 14, 0.8); return; }
    const mark = { type: 'strike', target: e, x: e.x, y: e.y, delay: 0.8, h, st: Object.assign({}, h.st, { splash: 1.6 }), dmg: 0, kind: 'laser', color: '#93c5fd', life: 0.8, max: 0.8 };
    g.effects.push(mark);
    g.after(0.8, () => {
      const x = e.dead ? mark.x : e.x, y = e.dead ? mark.y : e.y;
      if (!e.dead) g.damage(e, h.st.dmg * (ult ? 25 : 12), h, { color: '#dbeafe' });
      g.hitArea(x, y, 1.6 * TILE, h.st.dmg * (ult ? 6 : 3), h, h.st, { air: true });
      g.effects.push({ type: 'laser', x, y, life: 0.6, max: 0.6, w: ult ? 3 : 2 }); g.fx.ring(x, y, 90, '#dbeafe', 0.7, 7); g.fx.burst(x, y, '#bfdbfe', 50, 320, 4, 0.8, 'glow');
      g.flash = { color: '#dbeafe', life: 0.25, max: 0.25 }; g.shake(ult ? 18 : 12); Sfx.play('bigboom');
    });
    Sfx.play('laser');
  },
  timerewind(g, h, ult) {
    for (const e of g.enemies) { if (e.dead) continue; e.d = Math.max(-20, e.d - (ult ? 5 : 2.5) * TILE * (e.boss ? 0.35 : 1)); e.slowM = Math.max(e.slowM, 0.5); e.slowT = Math.max(e.slowT, ult ? 5 : 3); g.fx.burst(e.x, e.ay, '#fcd34d', 5, 80, 2, 0.4, 'glow'); }
    g.effects.push({ type: 'rewind', life: 1.2, max: 1.2 }); Sfx.play('void');
  },
  supernova(g, h, ult) {
    for (const e of g.enemies) { if (e.dead) continue; g.damage(e, h.st.dmg * (ult ? 12 : 6), h, { color: '#fff7c2' }); if (!e.dead) { e.burnD = Math.max(e.burnD, h.st.burn * 2); e.burnT = 4; } }
    g.flash = { color: '#fff7c2', life: 0.7, max: 0.7 }; g.fx.ring(h.x, h.y, 500, '#fde047', 1, 10); g.fx.ring(h.x, h.y, 300, '#ffffff', 0.8, 6);
    g.fx.burst(h.x, h.y, '#fde047', 80, 500, 5, 1, 'glow'); g.shake(ult ? 20 : 14); Sfx.play('bigboom');
  },
  eventhorizon(g, h, ult) {
    const e = g.strongest(); const x = e ? e.x : h.x, y = e ? e.y : h.y;
    g.effects.push({ type: 'blackhole', x, y, r: (ult ? 2.4 : 1.8) * TILE, life: ult ? 6 : 4, max: ult ? 6 : 4, dps: h.st.dmg * (ult ? 3 : 1.8), h });
    g.fx.ring(x, y, 100, '#d946ef', 0.6, 6); g.shake(8); Sfx.play('void');
  },
  goldrush(g, h, ult) {
    const amt = Math.round((ult ? 400 : 150) * (0.5 + 0.5 * g.map.hpMult)); g.cash += amt;
    g.floatText(h.x, h.y - 44, `+$${amt}`, '#facc15', 26, 1.6);
    for (let i = 0; i < (ult ? 70 : 35); i++) g.fx.add({ type: 'glow', x: h.x + rnd(-80, 80), y: h.y - rnd(120, 220), vy: rnd(160, 260), vx: rnd(-20, 20), size: 4, color: '#facc15', life: 0.9, drag: 0 });
    Sfx.play('coin'); g.after(0.15, () => Sfx.play('coin'));
  },
  rally(g, h, ult) {
    const R = (h.st.buffRange + 1) * TILE * (ult ? 1.5 : 1);
    for (const o of g.heroes) if ((o.x - h.x) ** 2 + (o.y - h.y) ** 2 <= R * R) { o.buffs.push({ rateMul: ult ? 2 : 1.6, dmgMul: ult ? 1.4 : 1, t: ult ? 8 : 6 }); g.fx.ring(o.x, o.y, 26, '#ef4444', 0.5, 4); g.fx.burst(o.x, o.y - 10, '#fca5a5', 8, 100, 3, 0.5, 'glow'); }
    const hv = Math.min(g.maxHp - g.hp, ult ? 15 : 6); if (hv > 0) { g.hp += hv; g.floatText(g.base.x, g.base.y - 30, `+${hv} ♥`, '#3ddc97', 18, 1.2); }
    g.fx.ring(h.x, h.y, R, '#ef4444', 0.7, 5);
  },
  headshot(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE, true).sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield)); const e = list[0];
    if (!e) { g.floatText(h.x, h.y - 30, 'Geen doel', '#ffffff', 14, 0.8); return; }
    g.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 12 }, { x: e.x, y: e.ay }], color: '#d9f99d', life: 0.3, max: 0.3, w: 2 });
    if (ult && !e.boss) { e.hp = 0; g.floatText(e.x, e.ay - 30, 'EXECUTIE', '#d9f99d', 20, 1); g.kill(e, h); }
    else g.damage(e, h.st.dmg * (ult ? 25 : 12), h, { crit: true, critMult: 1 });
    g.fx.burst(e.x, e.ay, '#d9f99d', 24, 220, 3, 0.5, 'spark'); g.shake(4); Sfx.play('laser');
  },
  cyclone(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 2.5, true);
    const d0 = list.length ? Math.max(...list.map(e => e.d)) + 40 : g.nearestD(h.x, h.y) + 120;
    const n = ult ? 2 : 1;
    for (let i = 0; i < n; i++) g.effects.push({ type: 'tornado', d: d0 + i * 90, speed: 1.8, tick: 0, life: ult ? 6 : 4, max: ult ? 6 : 4, dmg: h.st.dmg * (ult ? 2 : 1.2), h, x: h.x, y: h.y });
    Sfx.play('freeze');
  },
  speedforce(g, h, ult) {
    const n = ult ? 14 : 8, R = (h.st.range + 3) * TILE * (ult ? 1.6 : 1);
    for (let i = 0; i < n; i++) g.after(i * 0.08, () => {
      const list = g.enemiesIn(h.x, h.y, R, true).sort(() => Math.random() - 0.5).slice(0, 6); if (!list.length) return;
      for (const e of list) g.damage(e, h.st.dmg * 4, h, { color: '#fde047' });
      g.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 8 }, ...list.map(e => ({ x: e.x, y: e.ay }))], color: i % 2 ? '#ef4444' : '#fde047', life: 0.2, max: 0.2, w: 3 });
      Sfx.play('zap');
    });
    g.fx.burst(h.x, h.y, '#fde047', 30, 260, 3, 0.5, 'spark');
  },
  warcry(g, h, ult) {
    for (const o of g.heroes) { o.buffs.push({ dmgMul: ult ? 1.8 : 1.5, rateMul: ult ? 1.3 : 1, t: ult ? 10 : 8 }); g.fx.ring(o.x, o.y, 30, '#f8fafc', 0.6, 4); }
    g.floatText(h.x, h.y - 44, 'STRIJDKREET!', '#f8fafc', 22, 1.3); g.shake(5); Sfx.play('wave');
  },
  dragonbreath(g, h, ult) {
    const R = h.st.range * TILE * 1.8 * (ult ? 1.3 : 1), list = g.enemiesIn(h.x, h.y, R, true);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 8 : 5), h, { color: '#fb923c' }); if (!e.dead) { e.burnD = Math.max(e.burnD, h.st.burn * 3); e.burnT = 4; } }
    const tgt = list[0], base = tgt ? Math.atan2(tgt.y - h.y, tgt.x - h.x) : 0;
    for (let i = 0; i < (ult ? 120 : 70); i++) { const a = base + rnd(-0.6, 0.6), sp = rnd(150, R * 2); g.fx.add({ type: 'glow', x: h.x, y: h.y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rnd(4, 8), color: Math.random() < 0.5 ? '#f97316' : '#fde047', life: 0.7 }); }
    g.fx.ring(h.x, h.y, R, '#f97316', 0.6, 6); g.shake(ult ? 12 : 7); Sfx.play('fire'); Sfx.play('bigboom');
  },
  missilestorm(g, h, ult) {
    const n = ult ? 40 : 20, st = Object.assign({}, h.st, { splash: 1.2 });
    for (let i = 0; i < n; i++) g.after(i * 0.06, () => {
      const list = g.enemies.filter(e => !e.dead); if (!list.length) return;
      const e = list[Math.floor(Math.random() * list.length)];
      g.effects.push({ type: 'strike', target: e, x: e.x, y: e.y, delay: 0.5, max: 0.5, h, st, dmg: h.st.dmg * 1.5, kind: 'missile', color: '#fb923c', life: 0.5 });
    });
    Sfx.play('laser');
  },
  divinelight(g, h, ult) {
    for (const o of g.heroes) { if (o !== h) o.abilCd = ult ? 0 : o.abilCd * 0.5; o.buffs.push({ dmgMul: ult ? 1.6 : 1.3, t: 8 }); g.effects.push({ type: 'pillar', x: o.x, y: o.y + 10, life: 0.8, max: 0.8, w: 0.6 }); }
    const hv = Math.min(g.maxHp - g.hp, ult ? 25 : 10); if (hv > 0) { g.hp += hv; g.floatText(g.base.x, g.base.y - 30, `+${hv} ♥`, '#3ddc97', 20, 1.3); }
    g.flash = { color: '#fef9c3', life: 0.5, max: 0.5 }; g.panelDirty = true; Sfx.play('bigupgrade');
  },
  midastouch(g, h, ult) {
    const R = h.st.range * TILE * 1.3, list = g.enemiesIn(h.x, h.y, R, true);
    const normal = list.filter(e => !e.boss).sort((a, b) => b.hp - a.hp).slice(0, ult ? 16 : 8);
    for (const e of normal) { const bonus = e.reward * 2; g.cash += bonus; g.floatText(e.x, e.ay - 20, `+$${bonus}`, '#facc15', 15, 1); g.fx.burst(e.x, e.ay, '#fde047', 14, 140, 3, 0.6, 'glow'); e.hp = 0; g.kill(e, h); }
    for (const e of list) if (e.boss && !e.dead) g.damage(e, h.st.dmg * (ult ? 15 : 8), h, { color: '#fde047' });
    g.fx.ring(h.x, h.y, R, '#fbbf24', 0.7, 6); g.flash = { color: '#fde047', life: 0.3, max: 0.3 }; Sfx.play('coin'); Sfx.play('bigupgrade');
  },
  spectrum(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead);
    g.effects.push({ type: 'rays', x: h.x, y: h.y - 12, pts: list.map(e => ({ x: e.x, y: e.ay })), life: 0.9, max: 0.9 });
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 6 : 3), h, { color: '#f0abfc' }); if (!e.dead) { e.slowM = Math.max(e.slowM, 0.5); e.slowT = Math.max(e.slowT, 4); } }
    g.flash = { color: '#f0abfc', life: 0.35, max: 0.35 }; g.shake(ult ? 14 : 8); Sfx.play('cosmic');
  },
  mirrorarmy(g, h, ult) {
    const n = (ult ? 5 : 3) + (h.st.clones || 0), dur = 10 + (h.st.cloneTime || 0) + (ult ? 5 : 0);
    const R = h.st.range * TILE, pts = []; for (let d = 0; d < g.pathLen; d += 25) pts.push(g.posAt(d));
    const cand = g.freeTiles.filter(([x, y]) => g.tileFree(x, y)).map(([x, y]) => { const cx = x * TILE + 20, cy = y * TILE + 20; let sc = 0; for (const p of pts) if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < R * R) sc++; return { x, y, sc: sc + Math.random() }; }).sort((a, b) => b.sc - a.sc).slice(0, n);
    for (const c of cand) {
      const cl = g.makeHero(h.id, c.x, c.y, h.level); cl.tier = h.tier; cl.temp = dur; cl.abilCd = 999; cl.st = g.heroStats(cl); g.heroes.push(cl);
      g.fx.burst(cl.x, cl.y - 8, '#c4b5fd', 24, 160, 4, 0.6, 'smoke'); g.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 10 }, { x: cl.x, y: cl.y - 10 }], color: '#c4b5fd', life: 0.4, max: 0.4, w: 2 });
    }
    Sfx.play('void');
  },
  judgement(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead), st = Object.assign({}, h.st, { splash: 0.8 });
    for (const e of list) g.effects.push({ type: 'strike', target: e, x: e.x, y: e.y, delay: 1.2, max: 1.2, h, st, dmg: h.st.dmg * (ult ? 14 : 8) * (e.boss && ult ? 2 : 1), kind: 'judge', exec: ult ? 0.4 : 0.25, big: true, life: 1.2 });
    g.effects.push({ type: 'tint', color: '#0a0a0a', alpha: 0.55, life: 1.6, max: 1.6 });
    g.after(1.2, () => { g.flash = { color: '#fffbeb', life: 0.5, max: 0.5 }; g.shake(ult ? 22 : 14); Sfx.play('bigboom'); });
    Sfx.play('cosmic');
  },
  bigbang(g, h, ult) {
    g.effects.push({ type: 'bigbang', x: h.x, y: h.y, life: 1.6, max: 1.6 }); Sfx.play('cosmic');
    g.after(0.5, () => {
      for (const e of g.enemies) { if (e.dead) continue; g.damage(e, h.st.dmg * (ult ? 8 : 5), h, { color: '#e9d5ff' }); if (e.dead) continue; if (e.boss) e.d = Math.max(-20, e.d - (ult ? 4 : 2) * TILE); else e.d = ult ? -15 : Math.max(-15, e.d - 6 * TILE); }
      for (const o of g.heroes) if (o !== h) o.abilCd = ult ? 0 : o.abilCd * 0.5;
      g.flash = { color: '#ffffff', life: 0.6, max: 0.6 }; g.shake(20); Sfx.play('bigboom'); g.panelDirty = true;
      for (let i = 0; i < 80; i++) g.fx.add({ type: 'star', x: rnd(0, GW), y: rnd(0, GH), size: rnd(1.5, 3), color: i % 2 ? '#e9d5ff' : '#fde68a', life: rnd(0.6, 1.4) });
    });
  },
  twinstorm(g, h, ult) {
    h.buffs.push({ rateMul: 3, multi: 3, dmgMul: ult ? 1.5 : 1, t: ult ? 5 : 3.5 });
    for (let i = 0; i < 3; i++) g.after(i * 0.12, () => g.fx.ring(h.x, h.y - 8, 26 + i * 10, i % 2 ? '#a5f3fc' : '#f472b6', 0.4, 4));
    g.fx.burst(h.x, h.y - 8, '#f472b6', 24, 200, 3, 0.4, 'spark'); Sfx.play('zap');
  },
  bulwark(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, (h.st.range + 2.5) * TILE, false);
    const d = list.length ? Math.max(...list.map(e => e.d)) + 18 : g.nearestD(h.x, h.y) + 20;
    g.effects.push({ type: 'wall', d, x: h.x, y: h.y, ang: 0, tick: 0, life: ult ? 6 : 4, max: ult ? 6 : 4, dmg: h.st.dmg * (ult ? 1.5 : 1), h, ult });
    if (ult) g.effects.push({ type: 'wall', d: d - 70, x: h.x, y: h.y, ang: 0, tick: 0.25, life: 6, max: 6, dmg: h.st.dmg, h, ult: false });
    const p = g.posAt(d); g.fx.burst(p.x, p.y, '#fde68a', 30, 200, 3, 0.5, 'glow'); g.effects.push({ type: 'lightning', pts: [{ x: h.x, y: h.y - 10 }, { x: p.x, y: p.y }], color: '#fde68a', life: 0.3, max: 0.3, w: 2 });
    g.shake(4); Sfx.play('shield');
  },
  wishingstar(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.4, true).sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield));
    const n = ult ? 3 : 1;
    const cash = Math.round((ult ? 110 : 50) * (0.5 + 0.5 * g.map.hpMult)); g.cash += cash; g.floatText(h.x, h.y - 44, `Wens: +$${cash}`, '#fde68a', 18, 1.4);
    for (let i = 0; i < n; i++) {
      const e = list[i] || list[0]; const x = e ? e.x : h.x + rnd(-40, 40), y = e ? e.ay : h.y + rnd(-40, 40);
      g.after(i * 0.25, () => g.effects.push({ type: 'drop', kind: 'star', x, y, t: 0, dur: 0.5, onEnd: () => {
        g.hitArea(x, y, 1.6 * TILE, h.st.dmg * (ult ? 18 : 12), h, h.st); g.fx.ring(x, y, 1.6 * TILE, '#fde68a', 0.5, 6); g.fx.burst(x, y, '#fef3c7', 30, 240, 3, 0.7, 'star'); g.shake(6); Sfx.play('boom'); } }));
    }
    Sfx.play('coin');
  },
};
