/* =========================================================================
 * sim.js — deterministische match-simulatie (30 ticks/s).
 * Geen Math.random en geen rendering: dezelfde seed + dezelfde commando's
 * geven op iedere machine exact dezelfde match (nodig voor online lockstep).
 * ========================================================================= */
var AC = (typeof window !== 'undefined' ? window : globalThis).AC;

(function () {
  var C = AC.CONST, M = AC.MATCHUP;

  function RNG(seed) {
    var s = seed >>> 0;
    this.next = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Sim(opts) {
    this.rng = new RNG(opts.seed || 1);
    this.tickN = 0; this.time = 0; this.dt = C.TICK;
    this.nextId = 1;
    this.units = []; this.towers = []; this.projs = []; this.effects = [];
    this.events = [];
    this.queue = [];
    this.over = false; this.winner = -1;
    this.mode = opts.mode || 'bot';
    this.players = [];
    for (var s = 0; s < 2; s++) this.players.push(this._makePlayer(s, opts.players[s] || {}));
    this.bases = [this._makeBase(0), this._makeBase(1)];
  }
  AC.Sim = Sim;
  AC.RNG = RNG;
  var P = Sim.prototype;

  P._makePlayer = function (side, o) {
    var owned = o.owned;
    if (!owned) { owned = []; for (var a = 0; a < 8; a++) owned.push([true, true, true, true]); }
    var perma = o.perma || {};
    var p = {
      side: side, name: o.name || (side ? 'Speler 2' : 'Speler 1'),
      iron: C.START_IRON + (perma.startIron || 0),
      xp: 0, age: 0, maxAge: o.maxAge == null ? 7 : o.maxAge,
      owned: owned, upg: {}, cds: [0, 0, 0, 0], powerCd: C.POWER_START_CD,
      incomeMult: o.incomeMult || 1, perma: perma,
      buffT: 0, lastBounty: 0, ironRate: 0,
      color: o.color || (side ? '#ff4a4a' : '#3a8bff'),
      st: { kills: 0, spawned: 0, baseDmg: 0, dmg: 0, iron: 0, towers: 0, lost: 0, powers: 0, upgrades: 0 },
    };
    AC.UPGRADES.forEach(function (u) { p.upg[u.key] = 0; });
    return p;
  };

  P._baseMaxHp = function (p) {
    return Math.round(C.BASE_HP * Math.pow(C.BASE_HP_GROWTH, p.age) * (1 + (p.perma.baseHp || 0)));
  };
  P._makeBase = function (side) {
    var p = this.players[side], hp = this._baseMaxHp(p);
    return { kind: 'base', side: side, x: side ? C.W - C.BASE_W / 2 : C.BASE_W / 2, w: C.BASE_W / 2, hp: hp, maxHp: hp, dead: false, hitT: 0 };
  };

  /* ------------------------------ queries ------------------------------ */
  P.dir = function (side) { return side ? -1 : 1; };
  P.unitDefAge = function (side, slot) {
    var p = this.players[side];
    for (var a = p.age; a >= 0; a--) if (p.owned[a] && p.owned[a][slot]) return a;
    return 0;
  };
  P.unitStats = function (side, slot) { return AC.unitStats(this.unitDefAge(side, slot), slot); };
  P.unitCost = function (side, slot) { return this.unitStats(side, slot).cost; };
  P.income = function (side) {
    var p = this.players[side], ag = AC.AGES[p.age];
    var inc = C.BASE_INCOME + C.INCOME_PER_AGE * p.age + p.upg.income * 6;
    if (ag.passive.id === 'income') inc *= 1 + ag.passive.val;
    return inc * p.incomeMult;
  };
  P.killMult = function (side) {
    var p = this.players[side], m = C.KILL_BASE + p.upg.bounty * 0.1;
    if (AC.AGES[p.age].passive.id === 'bounty') m *= 1 + AC.AGES[p.age].passive.val;
    return m;
  };
  P.upgradeDef = function (key) { for (var i = 0; i < AC.UPGRADES.length; i++) if (AC.UPGRADES[i].key === key) return AC.UPGRADES[i]; return null; };
  P.upgradeCost = function (side, key) {
    var d = this.upgradeDef(key), p = this.players[side], lvl = p.upg[key];
    var c = d.base * Math.pow(d.growth, lvl);
    if (d.cat !== 'eco') c *= Math.pow(1.25, p.age);
    return Math.round(c / 5) * 5;
  };
  P.towerCost = function (side, kind) {
    return Math.round(AC.TOWERS[kind].cost * Math.pow(C.COST_GROWTH, this.players[side].age) / 5) * 5;
  };
  P.towerStats = function (side, kind) {
    var p = this.players[side], t = AC.TOWERS[kind], g = Math.pow(1.5, p.age);
    var dm = (1 + p.upg.tdmg * 0.15) * (AC.AGES[p.age].passive.id === 'towerdmg' ? 1.15 : 1);
    return { dmg: t.dmg * g * dm, cd: t.cd, range: t.range * (1 + p.upg.trange * 0.08), hp: Math.round(t.hp * g), splash: t.splash || 0 };
  };
  P.xpNeeded = function (side) {
    var p = this.players[side];
    if (p.age >= 7) return null;
    return C.AGE_XP[p.age + 1];
  };
  P.canEvolve = function (side) {
    var p = this.players[side], need = this.xpNeeded(side);
    return need != null && p.age < p.maxAge && p.xp >= need;
  };
  P.overtimeMult = function () {
    if (this.time >= C.SUDDEN_DEATH) return 2;
    if (this.time >= C.OVERTIME_1) return 1.5;
    return 1;
  };
  P.towerAt = function (side, spot) {
    for (var i = 0; i < this.towers.length; i++) { var t = this.towers[i]; if (t.side === side && t.spot === spot && !t.dead) return t; }
    return null;
  };

  /* ------------------------------ commands ------------------------------ */
  P.command = function (side, c) { this.queue.push({ side: side, c: c }); };

  P._apply = function (side, c) {
    if (this.over) return;
    var p = this.players[side];
    switch (c.t) {
      case 'spawn': {
        var slot = c.s | 0; if (slot < 0 || slot > 3) return;
        if (p.cds[slot] > 0) return;
        var st = this.unitStats(side, slot);
        if (p.iron < st.cost) return;
        p.iron -= st.cost; p.cds[slot] = C.SLOT_CD[slot];
        this._spawnUnit(side, slot, st);
        this._xp(side, st.cost * C.XP_SPAWN);
        p.st.spawned++;
        break;
      }
      case 'tower': {
        var spot = c.s | 0, kind = c.k | 0;
        if (spot < 0 || spot > 2 || kind < 0 || kind > 2 || this.towerAt(side, spot)) return;
        var cost = this.towerCost(side, kind);
        if (p.iron < cost) return;
        p.iron -= cost;
        var ts = this.towerStats(side, kind);
        var x = side ? C.W - C.TOWER_SPOTS[spot] : C.TOWER_SPOTS[spot];
        this.towers.push({ kind: 'tower', id: this.nextId++, side: side, spot: spot, type: kind, x: x, w: 15, hp: ts.hp, maxHp: ts.hp, atkT: 0.5, paid: cost, dead: false, hitT: 0, aim: 0, fireT: 0 });
        p.st.towers++;
        this.events.push({ e: 'build', side: side, x: x });
        break;
      }
      case 'sell': {
        var t = this.towerAt(side, c.s | 0); if (!t) return;
        p.iron += Math.round(t.paid * AC.TOWER_SELL * (t.hp / t.maxHp));
        t.dead = true; this.events.push({ e: 'sell', side: side, x: t.x });
        break;
      }
      case 'upg': {
        var d = this.upgradeDef(c.k); if (!d) return;
        if (p.upg[c.k] >= d.max) return;
        var uc = this.upgradeCost(side, c.k);
        if (p.iron < uc) return;
        p.iron -= uc; p.upg[c.k]++; p.st.upgrades++;
        if (d.cat === 'unit' && d.stat === 'hp') {
          var self = this;
          this.units.forEach(function (u) {
            if (u.side === side && u.slot === d.slot && !u.dead) {
              var nm = self._hpMult(side, u.slot, u.armored);
              var r = nm / u.hpMult; u.maxHp *= r; u.hp *= r; u.hpMult = nm;
            }
          });
        }
        this.events.push({ e: 'upgrade', side: side, k: c.k });
        break;
      }
      case 'evolve': {
        if (!this.canEvolve(side)) return;
        var oldMax = this.bases[side].maxHp;
        p.age++;
        var b = this.bases[side]; b.maxHp = this._baseMaxHp(p); b.hp += b.maxHp - oldMax;
        var self2 = this;
        this.towers.forEach(function (t) {
          if (t.side === side && !t.dead) { var ns = self2.towerStats(side, t.type); var r = ns.hp / t.maxHp; t.maxHp = ns.hp; t.hp *= r; }
        });
        this.events.push({ e: 'evolve', side: side, age: p.age });
        break;
      }
      case 'power': {
        if (p.powerCd > 0) return;
        p.powerCd = C.POWER_CD; p.st.powers++;
        this._castPower(side);
        break;
      }
      case 'surrender': {
        this.bases[side].hp = 0; this._endMatch(1 - side);
        break;
      }
    }
  };

  P._hpMult = function (side, slot, armored) {
    var p = this.players[side];
    var m = 1 + p.upg['hp' + slot] * 0.12 + (p.perma.unitHp || 0);
    if (armored && AC.AGES[p.age].passive.id === 'armorhp') m *= 1.15;
    return m;
  };
  P._dmgMult = function (side, slot) {
    var p = this.players[side];
    var m = 1 + p.upg['dmg' + slot] * 0.12 + (p.perma.unitDmg || 0);
    if (AC.AGES[p.age].passive.id === 'dmg') m *= 1.1;
    return m * this.overtimeMult();
  };

  P._spawnUnit = function (side, slot, st) {
    var p = this.players[side];
    var hm = this._hpMult(side, slot, st.armored);
    var x = side ? C.W - C.SPAWN_X : C.SPAWN_X;
    var u = {
      kind: 'unit', id: this.nextId++, side: side, slot: slot, age: st.age, st: st,
      x: x, px: x, w: st.w, hp: st.hp * hm, maxHp: st.hp * hm, hpMult: hm,
      armored: st.armored, aa: st.aa, flying: st.flying, cost: st.cost,
      atkT: 0.25, anim: 0, atkAnim: 0, walk: 0, state: 'walk',
      stun: 0, slowT: 0, slowF: 0, dotT: 0, dotDps: 0, dotType: '', charged: false, blinked: false,
      dead: false, hitT: 0, rally: 1, lastHit: -1, tgtX: 0,
    };
    this.units.push(u);
    this.events.push({ e: 'spawn', side: side, slot: slot, x: x, age: st.age });
    return u;
  };

  P._xp = function (side, amt) {
    var p = this.players[side];
    p.xp += amt * (1 + (p.perma.xp || 0));
  };

  /* ------------------------------ geometry ------------------------------ */
  P.gap = function (u, e) {
    return u.side === 0 ? (e.x - e.w) - (u.x + u.w) : (u.x - u.w) - (e.x + e.w);
  };
  P._enemiesOf = function (side, out) {
    out.length = 0;
    var i;
    for (i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.side !== side && !u.dead) out.push(u); }
    for (i = 0; i < this.towers.length; i++) { var t = this.towers[i]; if (t.side !== side && !t.dead) out.push(t); }
    out.push(this.bases[1 - side]);
    return out;
  };

  /* ------------------------------ tick ------------------------------ */
  var _enA = [], _enB = [];
  P.tick = function () {
    if (this.over) return;
    var dt = this.dt, i, j, self = this;
    this.tickN++; this.time += dt;

    // commando's (deterministische volgorde)
    var q = this.queue; this.queue = [];
    q.sort(function (a, b) { return a.side - b.side; });
    for (i = 0; i < q.length; i++) this._apply(q[i].side, q[i].c);
    if (this.over) return;

    // economie / XP / cooldowns
    for (var s = 0; s < 2; s++) {
      var p = this.players[s];
      var inc = this.income(s) * dt;
      p.iron += inc; p.st.iron += inc;
      this._xp(s, C.XP_PER_SEC * dt);
      for (j = 0; j < 4; j++) if (p.cds[j] > 0) p.cds[j] = Math.max(0, p.cds[j] - dt);
      if (p.powerCd > 0) p.powerCd = Math.max(0, p.powerCd - dt);
      if (p.buffT > 0) p.buffT = Math.max(0, p.buffT - dt);
    }

    // Sudden death: beide bases brokkelen af
    if (this.time >= C.SUDDEN_DEATH) {
      var sdRate = 0.01 * (1 + (this.time - C.SUDDEN_DEATH) / 60) * dt;
      for (s = 0; s < 2; s++) { var bb = this.bases[s]; bb.hp -= bb.maxHp * sdRate; }
      if (this.bases[0].hp <= 0 || this.bases[1].hp <= 0) {
        var r0 = this.bases[0].hp / this.bases[0].maxHp, r1 = this.bases[1].hp / this.bases[1].maxHp;
        var w = Math.abs(r0 - r1) > 1e-6 ? (r0 > r1 ? 0 : 1) : (this.players[0].st.dmg >= this.players[1].st.dmg ? 0 : 1);
        this.bases[1 - w].hp = 0; this.bases[1 - w].dead = true;
        this.events.push({ e: 'bdeath', side: 1 - w, x: this.bases[1 - w].x });
        this._endMatch(w); return;
      }
    }

    // statussen, aura's
    var units = this.units;
    for (i = 0; i < units.length; i++) {
      var u = units[i]; if (u.dead) continue;
      u.px = u.x;
      if (u.hitT > 0) u.hitT -= dt;
      if (u.atkAnim > 0) u.atkAnim = Math.max(0, u.atkAnim - dt);
      if (u.stun > 0) u.stun -= dt;
      if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) u.slowF = 0; }
      if (u.dotT > 0) { u.dotT -= dt; this._damage({ side: 1 - u.side, dot: true }, u, u.dotDps * dt, true); if (u.dead) continue; }
      var sp = u.st.special;
      var pa = AC.AGES[this.players[u.side].age].passive;
      if (pa.id === 'regen') u.hp = Math.min(u.maxHp, u.hp + u.maxHp * pa.val * dt);
      if (sp && sp.id === 'regen') u.hp = Math.min(u.maxHp, u.hp + u.maxHp * sp.frac * dt);
      u.rally = 1;
    }
    for (i = 0; i < units.length; i++) {
      var a = units[i]; if (a.dead || !a.st.special) continue;
      var sa = a.st.special;
      if (sa.id === 'rally' || sa.id === 'heal') {
        for (j = 0; j < units.length; j++) {
          var b = units[j];
          if (b.dead || b.side !== a.side || b === a || Math.abs(b.x - a.x) > sa.radius) continue;
          if (sa.id === 'rally') b.rally = Math.max(b.rally, 1 + sa.bonus);
          else b.hp = Math.min(b.maxHp, b.hp + b.maxHp * sa.frac * dt);
        }
      }
    }

    // units: beweging & gevecht. Sorteer per kant op frontpositie (voorste eerst)
    var order = units.filter(function (u) { return !u.dead; });
    order.sort(function (a, b) {
      if (a.side !== b.side) return a.side - b.side;
      var fa = a.side ? -a.x : a.x, fb = b.side ? -b.x : b.x;
      if (fa !== fb) return fb - fa;
      return a.id - b.id;
    });
    var enemies0 = this._enemiesOf(0, _enA), enemies1 = this._enemiesOf(1, _enB);
    for (i = 0; i < order.length; i++) {
      var un = order[i]; if (un.dead) continue;
      this._unitThink(un, un.side ? enemies1 : enemies0, order, i);
    }

    // towers
    for (i = 0; i < this.towers.length; i++) {
      var t = this.towers[i]; if (t.dead) continue;
      if (t.hitT > 0) t.hitT -= dt;
      if (t.fireT > 0) t.fireT -= dt;
      t.atkT -= dt;
      var ts = this.towerStats(t.side, t.type), best = null, bd = 1e9;
      for (j = 0; j < units.length; j++) {
        var e = units[j]; if (e.dead || e.side === t.side) continue;
        var d = Math.abs(e.x - t.x) - e.w;
        if (d <= ts.range && d < bd) { bd = d; best = e; }
      }
      if (best) {
        t.aim = best.x;
        if (t.atkT <= 0) {
          t.atkT = ts.cd; t.fireT = 0.15;
          this._projectile({ side: t.side, tower: true, ranged: true, splash: ts.splash, splashFrac: 0.7, x: t.x, y: C.GROUND - 92, target: best, dmg: ts.dmg, style: ['trapid', 'tsniper', 'tblast'][t.type], speed: [900, 1400, 520][t.type], arc: t.type === 2 ? 60 : 0, age: this.players[t.side].age });
          this.events.push({ e: 'tshot', side: t.side, type: t.type, x: t.x, age: this.players[t.side].age });
        }
      }
    }

    // projectielen
    for (i = 0; i < this.projs.length; i++) {
      var pr = this.projs[i]; if (pr.done) continue;
      if (pr.target && !pr.target.dead) { pr.tx = pr.target.x; pr.ty = pr.target.kind === 'unit' ? this._unitMidY(pr.target) : pr.ty; }
      pr.t += dt / pr.T;
      var tt = Math.min(1, pr.t);
      pr.lx = pr.x; pr.ly = pr.y;
      pr.x = pr.sx + (pr.tx - pr.sx) * tt;
      pr.y = pr.sy + (pr.ty - pr.sy) * tt - Math.sin(tt * Math.PI) * pr.arc;
      if (pr.t >= 1) { pr.done = true; this._projHit(pr); }
    }
    this.projs = this.projs.filter(function (p) { return !p.done; });

    // power-effecten
    for (i = 0; i < this.effects.length; i++) this._effectTick(this.effects[i]);
    this.effects = this.effects.filter(function (e) { return !e.done; });

    // opruimen
    this.units = this.units.filter(function (u) { return !u.dead; });
    this.towers = this.towers.filter(function (t) { return !t.dead; });
    for (s = 0; s < 2; s++) if (this.bases[s].hitT > 0) this.bases[s].hitT -= dt;
  };

  P._unitMidY = function (u) { return C.GROUND - (u.flying ? 165 : (u.w > 25 ? 46 : 34)); };

  P._unitThink = function (u, enemies, order, idx) {
    var dt = this.dt, st = u.st, sp = st.special, i;
    if (u.stun > 0) { u.state = 'stun'; return; }
    var p = this.players[u.side];
    var range = st.range;
    if (st.slot === 1 && AC.AGES[p.age].passive.id === 'range') range *= 1.1;

    // dichtstbijzijnde vijand
    var target = null, tg = 1e9, frontGap = 1e9;
    for (i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (e.dead) continue;
      var g = this.gap(u, e);
      if (g < -80) continue;            // achter ons
      if (g < tg) { tg = g; target = e; }
      if (!e.flying && g < frontGap) frontGap = g;
    }

    // Void Warrior: leegtesprong
    if (sp && sp.id === 'blink' && !u.blinked && target && target.kind === 'unit' && tg > range && tg < sp.dist + range) {
      u.blinked = true;
      var fromX = u.x;
      u.x += this.dir(u.side) * (tg - range * 0.5);
      u.px = u.x;
      this.events.push({ e: 'blink', side: u.side, x: fromX, x2: u.x });
      tg = range * 0.5; frontGap = Math.min(frontGap, tg);
    }

    if (target && tg <= range) {
      u.state = 'attack'; u.tgtX = target.x;
      u.atkT -= dt;
      if (u.atkT <= 0) {
        var cd = st.cd;
        if (sp && sp.id === 'frenzy' && u.hp < u.maxHp * 0.5) cd *= sp.mult;
        if (u.slowF) cd /= (1 - u.slowF * 0.5);
        u.atkT = cd;
        u.atkAnim = Math.min(0.35, cd * 0.6);
        this._attack(u, target, range, enemies);
      }
      return;
    }
    // lopen
    u.state = 'walk';
    if (u.atkT > 0.3) u.atkT = Math.max(0.3, u.atkT - dt);
    var speed = st.speed;
    if (AC.AGES[p.age].passive.id === 'speed') speed *= 1.1;
    if (u.slowF) speed *= 1 - u.slowF;
    var step = speed * dt;
    if (!u.flying) {
      step = Math.min(step, Math.max(0, frontGap));
      // bondgenoot vóór ons (order is gesorteerd: voorste eerst)
      for (i = idx - 1; i >= 0; i--) {
        var a = order[i];
        if (a.side !== u.side) break;
        if (a.dead || a.flying) continue;
        var ag = this.gap(u, a) + 6;   // lichte overlap toegestaan
        step = Math.min(step, Math.max(0, ag));
        break;
      }
    }
    u.x += this.dir(u.side) * step;
    u.walk += step;
  };

  P._srcOf = function (u) {
    return { side: u.side, slot: u.slot, aa: u.aa, ranged: u.st.range > 70, unit: u, special: u.st.special, age: u.age };
  };

  P._attack = function (u, target, range, enemies) {
    var st = u.st, sp = st.special, rng = this.rng;
    var dmg = st.dmg * this._dmgMult(u.side, u.slot) * u.rally;
    var stun = 0;
    if (sp && sp.id === 'charge' && !u.charged) { u.charged = true; dmg *= sp.mult; stun = sp.dur; this.events.push({ e: 'charge', side: u.side, x: u.x }); }
    var crit = false;
    if (sp && sp.id === 'crit' && rng.next() < sp.chance) { dmg *= sp.mult; crit = true; }
    var src = this._srcOf(u); src.crit = crit; src.stun = stun;
    var dir = this.dir(u.side), i;
    this.events.push({ e: 'attack', side: u.side, slot: u.slot, age: u.age, atk: st.atk, x: u.x, look: AC.UNITS[u.age][u.slot].look });

    if (st.atk === 'melee') {
      this._damage(src, target, dmg);
      if (sp && sp.id === 'cleave') {
        var n = 1;
        for (i = 0; i < enemies.length && n < sp.n; i++) {
          var e = enemies[i];
          if (e === target || e.dead || e.kind !== 'unit') continue;
          var g = this.gap(u, e);
          if (g > -60 && g <= range + 30) { this._damage(src, e, dmg * 0.8); n++; }
        }
      }
    } else if (st.atk === 'proj') {
      var targets = [target];
      if (sp && sp.id === 'multishot') {
        for (i = 0; i < enemies.length && targets.length < sp.n; i++) {
          var e2 = enemies[i];
          if (e2 === target || e2.dead) continue;
          var g2 = this.gap(u, e2);
          if (g2 > -60 && g2 <= range) targets.push(e2);
        }
        if (targets.length < sp.n) targets.push(target);
      }
      var arcStyles = { rock: 50, bone: 30, cannonball: 45, shell: 30, firearrow: 25, arrow: 20, bolt: 8, void: 30, plasma: 5 };
      var speeds = { rock: 420, bone: 520, firearrow: 600, arrow: 650, bolt: 900, bullet: 1600, cannonball: 520, shell: 700, rocket: 560, plasma: 700, void: 450 };
      for (i = 0; i < targets.length; i++) {
        var tgt = targets[i];
        var oy = u.flying ? -165 : -(u.w > 25 ? 54 : 40);
        this._projectile({
          side: u.side, src: src, x: u.x + dir * (u.w + 4), y: C.GROUND + oy, target: tgt, dmg: dmg,
          style: st.proj, speed: speeds[st.proj] || 600, arc: (arcStyles[st.proj] || 0) * Math.min(1.5, Math.abs(tgt.x - u.x) / 200),
          splash: sp && (sp.id === 'splash' || sp.id === 'rift') ? sp.radius : 0, splashFrac: sp && sp.frac ? sp.frac : 0,
          pierce: sp && sp.id === 'pierce' ? sp.len : 0, age: u.age, i: i,
        });
      }
    } else if (st.atk === 'beam') {
      var y1 = C.GROUND + (u.flying ? -165 : -44);
      this._damage(src, target, dmg);
      var pts = [target.x];
      if (sp && sp.id === 'chain') {
        var last = target, hit = [target], m = dmg;
        for (var k = 1; k < sp.n; k++) {
          m *= sp.falloff;
          var nb = null, nd = 1e9;
          for (i = 0; i < enemies.length; i++) {
            var e3 = enemies[i];
            if (e3.dead || e3.kind !== 'unit' || hit.indexOf(e3) >= 0) continue;
            var d3 = Math.abs(e3.x - last.x);
            if (d3 < 110 && d3 < nd) { nd = d3; nb = e3; }
          }
          if (!nb) break;
          this._damage(src, nb, m); hit.push(nb); pts.push(nb.x); last = nb;
        }
      }
      if (sp && sp.id === 'pierce') {
        for (i = 0; i < enemies.length; i++) {
          var e4 = enemies[i];
          if (e4 === target || e4.dead || e4.kind !== 'unit') continue;
          var rel = (e4.x - target.x) * dir;
          if (rel > 0 && rel <= sp.len) this._damage(src, e4, dmg * 0.7);
        }
      }
      this.events.push({ e: 'beam', side: u.side, x: u.x + dir * u.w, y: y1, pts: pts, col: st.beam, age: u.age, pierce: sp && sp.id === 'pierce' ? sp.len : 0 });
    }
  };

  P._projectile = function (o) {
    var tx = o.target.x, ty = o.target.kind === 'unit' ? this._unitMidY(o.target) : C.GROUND - 40;
    var dist = Math.max(30, Math.abs(tx - o.x));
    this.projs.push({
      side: o.side, src: o.src || { side: o.side, tower: true, ranged: true, aa: false }, target: o.target,
      sx: o.x, sy: o.y, x: o.x, y: o.y, lx: o.x, ly: o.y, tx: tx, ty: ty, t: 0, T: dist / o.speed, arc: o.arc || 0,
      dmg: o.dmg, style: o.style, splash: o.splash || 0, splashFrac: o.splashFrac || 0.5, pierce: o.pierce || 0, age: o.age, done: false,
    });
  };

  P._projHit = function (pr) {
    var t = pr.target, i, self = this;
    var hitX = pr.tx;
    if (t && !t.dead) this._damage(pr.src, t, pr.dmg);
    var all = this._enemiesOf(pr.side, []);
    if (pr.splash) {
      for (i = 0; i < all.length; i++) {
        var e = all[i]; if (e === t || e.dead) continue;
        if (pr.src.power && e.kind !== 'unit') continue;
        if (Math.abs(e.x - hitX) - e.w <= pr.splash) {
          this._damage(pr.src, e, pr.dmg * pr.splashFrac);
          if (pr.src.special && pr.src.special.id === 'rift' && e.kind === 'unit') { e.slowF = pr.src.special.slow; e.slowT = 2; }
        }
      }
    }
    if (pr.pierce) {
      var dir = this.dir(pr.side);
      for (i = 0; i < all.length; i++) {
        var e2 = all[i]; if (e2 === t || e2.dead || e2.kind !== 'unit') continue;
        var rel = (e2.x - hitX) * dir;
        if (rel > 0 && rel <= pr.pierce) this._damage(pr.src, e2, pr.dmg * 0.7);
      }
    }
    this.events.push({ e: 'hit', side: pr.side, x: hitX, y: pr.ty, style: pr.style, splash: pr.splash, age: pr.age });
  };

  /* src: {side, slot?, aa?, ranged?, unit?, special?, tower?, power?, dot?, crit?, stun?} */
  P._damage = function (src, tgt, amount, silent) {
    if (tgt.dead || this.over) return;
    var m = 1, sp = src.special;
    var isUnit = tgt.kind === 'unit', isStruct = !isUnit;
    if (!src.dot && !src.power) {
      if (isUnit && src.slot === 0 && tgt.slot === 1) m *= M.meleeVsRanged;
      if (isUnit && src.slot === 1 && tgt.slot === 0) m *= M.rangedVsMelee;
      if (src.aa) { if (tgt.armored) m *= M.antiVsArmored; else if (isStruct) m *= M.antiVsStructure; }
      else if (tgt.armored) m *= M.armorReduction;
      if (isUnit && src.ranged && tgt.st.special && tgt.st.special.id === 'shield') m *= 1 - tgt.st.special.red;
      if (sp && sp.id === 'execute' && tgt.hp < tgt.maxHp * sp.below) m *= sp.mult;
    }
    if (isUnit && this.players[tgt.side].buffT > 0) m *= 0.5;
    var dmg = amount * m;
    tgt.hp -= dmg;
    if (!silent) tgt.hitT = 0.12;
    var ps = this.players[src.side];
    ps.st.dmg += dmg;
    if (tgt.kind === 'base') { ps.st.baseDmg += dmg; this._xp(src.side, dmg * C.XP_BASE_DMG); }
    if (src.tower) this._xp(src.side, dmg * C.XP_TOWER_DMG);
    // on-hit
    if (src.unit && !src.dot) {
      var u = src.unit;
      if (sp && sp.id === 'lifesteal') u.hp = Math.min(u.maxHp, u.hp + dmg * sp.frac);
      if (sp && sp.id === 'blink') u.hp = Math.min(u.maxHp, u.hp + dmg * sp.frac);
      if (isUnit) {
        if (sp && sp.id === 'stun' && this.rng.next() < sp.chance) tgt.stun = Math.max(tgt.stun, sp.dur);
        if (src.stun) tgt.stun = Math.max(tgt.stun, src.stun);
        if (sp && (sp.id === 'poison' || sp.id === 'burn')) { tgt.dotT = sp.dur; tgt.dotDps = u.st.dmg * sp.dps * this._dmgMult(u.side, u.slot); tgt.dotType = sp.id; }
        if (sp && sp.id === 'slow') { tgt.slowF = Math.max(tgt.slowF, sp.frac); tgt.slowT = sp.dur; }
      }
    }
    if (!silent && (src.crit || dmg > 0)) this.events.push({ e: 'dmg', x: tgt.x, y: isUnit ? this._unitMidY(tgt) - 20 : C.GROUND - 120, v: dmg, crit: !!src.crit, side: tgt.side, kind: tgt.kind });
    if (tgt.hp <= 0) this._kill(src, tgt);
  };

  P._kill = function (src, tgt) {
    tgt.dead = true; tgt.hp = 0;
    var killer = 1 - tgt.side, pk = this.players[killer];
    if (tgt.kind === 'unit') {
      var bounty = Math.round(tgt.cost * this.killMult(killer));
      pk.iron += bounty; pk.st.iron += bounty; pk.lastBounty = bounty; pk.st.kills++;
      this.players[tgt.side].st.lost++;
      this._xp(killer, tgt.cost * C.XP_KILL);
      this.events.push({ e: 'death', side: tgt.side, x: tgt.x, y: this._unitMidY(tgt), slot: tgt.slot, age: tgt.age, bounty: bounty, look: AC.UNITS[tgt.age][tgt.slot].look, w: tgt.w, flying: tgt.flying });
      var sp = tgt.st.special;
      if (sp && sp.id === 'heal' && sp.burst) {
        var all = this._enemiesOf(tgt.side, []), d = tgt.st.dmg * sp.burst * 3;
        for (var i = 0; i < all.length; i++) if (all[i].kind === 'unit' && Math.abs(all[i].x - tgt.x) < 120) this._damage({ side: tgt.side, power: true }, all[i], d);
        this.events.push({ e: 'implode', side: tgt.side, x: tgt.x });
      }
    } else if (tgt.kind === 'tower') {
      var b2 = Math.round(tgt.paid * 0.4);
      pk.iron += b2; pk.lastBounty = b2;
      this._xp(killer, tgt.paid * 0.5);
      this.events.push({ e: 'tdeath', side: tgt.side, x: tgt.x, bounty: b2 });
    } else if (tgt.kind === 'base') {
      this.events.push({ e: 'bdeath', side: tgt.side, x: tgt.x });
      this._endMatch(killer);
    }
  };

  P._endMatch = function (winner) {
    if (this.over) return;
    this.over = true; this.winner = winner;
    this.events.push({ e: 'end', winner: winner });
  };

  /* ------------------------------ powers ------------------------------ */
  P.enemyFront = function (side) {
    var best = null;
    for (var i = 0; i < this.units.length; i++) {
      var u = this.units[i]; if (u.dead || u.side === side) continue;
      if (best == null || (side === 0 ? u.x < best : u.x > best)) best = u.x;
    }
    if (best == null) best = side === 0 ? C.W - 300 : 300;
    return best;
  };
  P._castPower = function (side) {
    var p = this.players[side], ag = AC.AGES[p.age], id = ag.power.id;
    var sg = Math.pow(C.STAT_GROWTH, p.age), front = this.enemyFront(side), dir = this.dir(side);
    var fx = { id: id, side: side, t: 0, done: false, sg: sg, front: front, dir: dir, n: 0, age: p.age };
    if (id === 'testudo') {
      p.buffT = 8;
      for (var i = 0; i < this.units.length; i++) { var u = this.units[i]; if (u.side === side && !u.dead) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.25); }
      fx.dur = 8;
    } else if (id === 'sandstorm') {
      for (var j = 0; j < this.units.length; j++) {
        var e = this.units[j]; if (e.side === side || e.dead) continue;
        e.slowF = 0.5; e.slowT = 6; e.dotT = 6; e.dotDps = 9 * sg; e.dotType = 'sand';
      }
      fx.dur = 6;
    } else if (id === 'orbital') { fx.dur = 3.2; fx.bx = side ? C.W * 0.62 : C.W * 0.38; }
    else if (id === 'singularity') { fx.dur = 3; fx.cx = front + dir * 60; }
    else if (id === 'airstrike') { fx.dur = 2.2; }
    else fx.dur = id === 'barrage' ? 3 : 2.4;
    this.effects.push(fx);
    this.events.push({ e: 'power', side: side, id: id, age: p.age, front: front });
  };

  P._effectTick = function (fx) {
    var dt = this.dt, rng = this.rng, C2 = C, i;
    var prevT = fx.t; fx.t += dt;
    if (fx.t >= fx.dur) fx.done = true;
    var self = this;
    function drop(x, dmg, radius, style, arc) {
      self.projs.push({ side: fx.side, src: { side: fx.side, power: true, ranged: true }, target: null, sx: x - fx.dir * 80, sy: -40, x: x, y: -40, lx: x, ly: -40, tx: x, ty: C2.GROUND - 6, t: 0, T: 0.55 + rng.next() * 0.25, arc: arc || 0, dmg: 0, style: style, splash: radius, splashFrac: 1, powerDmg: dmg, age: fx.age, done: false });
      self.projs[self.projs.length - 1].dmg = dmg;
      self.projs[self.projs.length - 1].target = { x: x, dead: true, kind: 'ground' };
    }
    function spread(w) { return fx.front + fx.dir * (rng.next() * w - 40); }
    switch (fx.id) {
      case 'rockslide':
        if (Math.floor(fx.t / 0.17) > Math.floor(prevT / 0.17)) drop(spread(260), 55 * fx.sg, 45, 'boulder');
        break;
      case 'volley':
        if (Math.floor(fx.t / 0.06) > Math.floor(prevT / 0.06)) drop(spread(300), 26 * fx.sg, 22, 'firearrow');
        break;
      case 'barrage':
        if (Math.floor(fx.t / 0.25) > Math.floor(prevT / 0.25)) drop(spread(380), 95 * fx.sg, 60, 'pshell');
        break;
      case 'airstrike':
        if (fx.t > 0.5 && Math.floor(fx.t / 0.15) > Math.floor(prevT / 0.15) && fx.n < 10) { drop(fx.front + fx.dir * (fx.n * 55 - 30), 120 * fx.sg, 55, 'bomb'); fx.n++; }
        break;
      case 'orbital':
        fx.bx += fx.dir * 380 * dt;
        for (i = 0; i < this.units.length; i++) {
          var u = this.units[i]; if (u.dead || u.side === fx.side) continue;
          if (Math.abs(u.x - fx.bx) < 45) this._damage({ side: fx.side, power: true }, u, 230 * fx.sg * dt, true);
        }
        break;
      case 'singularity':
        for (i = 0; i < this.units.length; i++) {
          var e = this.units[i]; if (e.dead || e.side === fx.side) continue;
          var d = e.x - fx.cx;
          if (Math.abs(d) < 230) {
            if (!e.flying || true) e.x -= Math.sign(d) * Math.min(Math.abs(d), 70 * dt);
            this._damage({ side: fx.side, power: true }, e, 70 * fx.sg * dt, true);
          }
        }
        if (fx.done) {
          for (i = 0; i < this.units.length; i++) { var e2 = this.units[i]; if (!e2.dead && e2.side !== fx.side && Math.abs(e2.x - fx.cx) < 130) this._damage({ side: fx.side, power: true }, e2, 260 * fx.sg); }
          this.events.push({ e: 'hit', side: fx.side, x: fx.cx, y: C.GROUND - 40, style: 'singularity', splash: 130, age: 7 });
        }
        break;
    }
  };

  /* ------------------------------ util ------------------------------ */
  P.hash = function () {
    var h = 0;
    function mix(v) { h = (Math.imul(h ^ (Math.round(v * 10) | 0), 2654435761) + 0x9e3779b9) | 0; }
    mix(this.tickN);
    this.units.forEach(function (u) { mix(u.id); mix(u.x); mix(u.hp); });
    this.towers.forEach(function (t) { mix(t.id); mix(t.hp); });
    this.players.forEach(function (p) { mix(p.iron); mix(p.xp); mix(p.age); });
    mix(this.bases[0].hp); mix(this.bases[1].hp);
    return h >>> 0;
  };
})();
if (typeof module !== 'undefined') module.exports = AC;
