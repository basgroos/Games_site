// =====================================================================
//  BOTS — fill empty seats; they issue the same commands as players
// =====================================================================
(function () {
  var T = G.T;
  var ATTACK_KINDS = ['bullet', 'hitscan', 'spread', 'frost', 'chain', 'poison', 'flame', 'splash', 'beam', 'plasma', 'blackhole',
    'drones', 'soul', 'meteor', 'creator', 'aura', 'reality', 'lastdef', 'timeslow'];
  G.isAttacker = function (it) { return ATTACK_KINDS.indexOf(it.kind) >= 0; };
  var DETECTORS = ['scout', 'sniper', 'laser', 'radar', 'plasma', 'drones', 'soul', 'creator', 'voidemperor', 'reality', 'lastdefense'];

  // Random bot loadout. power 0..1 controls access to high rarities.
  G.botLoadout = function (rnd, power) {
    var maxR = power < 0.2 ? 1 : power < 0.45 ? 2 : power < 0.7 ? 3 : power < 0.9 ? 4 : 5;
    function pick(filter) {
      var c = G.ITEMS.filter(function (i) { return G.RAR[i.rarity].index <= maxR && filter(i) && chosen.indexOf(i.id) < 0; });
      if (!c.length) return null;
      // bias towards higher rarity a little
      c.sort(function (a, b) { return G.RAR[b.rarity].index - G.RAR[a.rarity].index; });
      var idx = Math.floor(Math.pow(rnd(), 0.8) * c.length);
      return c[idx].id;
    }
    var chosen = [];
    function add(id) { if (id && chosen.indexOf(id) < 0 && chosen.length < 5) chosen.push(id); }
    add(pick(function (i) { return G.isAttacker(i) && i.cost <= 500; }));
    add(pick(function (i) { return i.isFarm && i.id !== 'cashreg' || i.id === 'cashreg'; }));
    if (rnd() < 0.7) add(pick(function (i) { return DETECTORS.indexOf(i.id) >= 0; }));
    add(pick(function (i) { return G.isAttacker(i); }));
    if (rnd() < 0.6) add(pick(function (i) { return i.isFarm; }));
    while (chosen.length < 5) add(pick(function (i) { return rnd() < 0.7 ? G.isAttacker(i) : true; }));
    return chosen;
  };

  // Path coverage for a slot with given range (weighted towards the door)
  G.coverage = function (def, x, y, range) {
    var cx = x * T + T / 2, cy = y * T + T / 2, s = 0, R = range * T;
    def.samples.forEach(function (p) { if (Math.hypot(p.x - cx, p.y - cy) <= R) s += p.w; });
    return s / def.useRoutes.length;
  };
  G.estimateDps = function (match, room, t) {
    var it = t.item, st = match.stats(t, room), d = st.dmg, cd = st.cd || 1;
    var cov = Math.min(1, G.coverage(room.def, t.x, t.y, (st.range / T) || 3) / 8);
    var v;
    switch (it.kind) {
      case 'spread': v = d * (it.pellets + t.lvl.spc) / cd * 0.6; break;
      case 'chain': v = d * (it.chain + t.lvl.spc) * 0.6 / cd; break;
      case 'flame': case 'splash': case 'beam': v = d / cd * 2.2; break;
      case 'plasma': case 'creator': case 'reality': v = d / cd * 1.6; break;
      case 'aura': v = d * 2; break;
      case 'meteor': v = d / cd * 3; cov = 1; break;
      case 'blackhole': v = d * it.hold / cd * 3 + 40 * match.wave; break;
      case 'drones': v = d * it.drones / cd; break;
      case 'archangel': v = d * it.beams / cd * 1.1; break;
      case 'titan': v = d * 2 / cd * 2.4; break;
      case 'singularity': v = d * (it.hold + it.burst) / cd * 3; break;
      case 'timeslow': v = 60 * match.wave; cov = 1; break;
      case 'spike': v = d / cd * 1.5; cov = 1; break;
      case 'mine': v = d / it.rearm * 2; cov = 1; break;
      default: v = it.dmg ? d / cd : 0;
    }
    return v * (0.3 + 0.7 * cov);
  };
  G.waveHp = function (match, n) {
    match._whp = match._whp || {};
    if (match._whp[n]) return match._whp[n];
    var w = G.genWave(match, n), sc = G.scaling(match.map, match.diff, n), s = 0;
    w.entries.forEach(function (e) { s += G.ZOMBIES[e.type].hp * sc.hp; });
    return (match._whp[n] = s);
  };

  G.Bot = function (match, pid) {
    this.m = match; this.pid = pid; this.p = match.players[pid];
    this.style = G.BOT_STYLES[this.p.style] || G.BOT_STYLES.balanced;
    this.t = 1 + Math.random() * 2;
  };
  var VISIT = { beginner: 0.35, aggressive: 0.2, balanced: 0.12, economy: 0.08, defensive: 0.04 };
  G.Bot.prototype.update = function (dt) {
    var p = this.p, m = this.m;
    if (m.phase === 'claim' || p.room < 0) return;
    var room = m.roomOf(p);
    // walking: visit other rooms now and then, otherwise stay home
    this.walkT = (this.walkT == null ? 6 + Math.random() * 10 : this.walkT) - dt;
    if (this.visiting) {
      if (!p.path) { this.stay = (this.stay == null ? 3 + Math.random() * 5 : this.stay) - dt; if (this.stay <= 0) { this.visiting = false; this.stay = null; m.goRoom(p, p.room); } }
      if (p.alive && room.time - room.door.lastHit < 2) { this.visiting = false; m.goRoom(p, p.room); }
    } else if (this.walkT <= 0) {
      this.walkT = 8 + Math.random() * 14;
      var others = m.rooms.filter(function (r) { return r.owner >= 0 && r.index !== p.room && m.players[r.owner].alive; });
      var calm = !p.alive || (room.door.hp > room.door.max * 0.8 && !room.zombies.some(function (z) { return z.isBoss; }));
      if (others.length && calm && Math.random() < (p.alive ? VISIT[p.style] || 0.1 : 0.6)) {
        var tgt = others.sort(function (a, b) { return Math.abs(a.index - p.room) - Math.abs(b.index - p.room); })[(Math.random() * Math.min(3, others.length)) | 0];
        this.visiting = true; m.goRoom(p, tgt.index);
      } else if (p.alive && m.canBuild(p) && !p.path) {
        var sl = room.def.slots.filter(function (q) { return !room.tile[q.x + ',' + q.y]; });
        if (sl.length) { var q = sl[(Math.random() * sl.length) | 0]; m.goTo(p, q.x * T + T / 2, q.y * T + T / 2); }
      }
    }
    if (!p.alive || p.finished) return;
    if (!this.visiting && !m.canBuild(p) && !p.path) m.goRoom(p, p.room);
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.style.think * (0.7 + Math.random() * 0.6);
    // a bot sharing a wallet with a human acts calmer, so the human keeps most of the money
    var mate = room.partner >= 0 ? m.players[room.owner === p.id ? room.partner : room.owner] : null;
    if (mate && !mate.isBot) this.t *= 2.2;
    var wantVote = m.canVote(p) && !room.zombies.length && room.door.hp > room.door.max * 0.6;
    if (wantVote !== p.vote && m.canVote(p)) m.command(this.pid, { type: 'vote' });
    if (!m.canVote(p) && p.vote) p.vote = false;
    if (!m.canBuild(p)) return;
    if (room.door.hp < room.door.max * 0.6 && room.door.repairReady <= room.time && Math.random() > this.style.mistakes) m.command(this.pid, { type: 'repair' });
    for (var i = 0; i < 3; i++) if (!this.act(room)) break;
  };
  var UTIL_CAP = { slowtrap: 2, wall: 2, barricade: 2, radar: 1, radartower: 1, overclock: 2, wardrum: 2, medic: 2, shieldgen: 1, landmine: 3, spiketrap: 3, repairbot: 1, timetower: 2, emptower: 1, portal: 2, sonic: 2, gravity: 2, teslacoil: 3 };
  G.Bot.prototype.fake = function (it, x, y) {
    return { item: it, x: x, y: y, px: x * T + T / 2, py: y * T + T / 2, lvl: { dmg: 0, spd: 0, rng: 0, spc: 0, inc: 0 },
      buff: { dmg: 1, spd: 1, rng: 1, detect: false, farm: 1 }, data: { souls: 0, drones: [] }, pathIdx: 0 };
  };
  G.Bot.prototype.act = function (room) {
    var m = this.m, p = this.p, st = this.style, self = this;
    var door = room.door, hpFrac = door.hp / door.max;
    var mistakes = Math.random() < st.mistakes;
    var nextWave = Math.max(1, m.wave + 1);
    var doorCost = G.doorUpgradeCost(door.lvl);
    var recentHit = room.time - door.lastHit < 4;
    // 1) door emergencies / defensive habit
    if ((hpFrac < 0.3 + st.door * 0.4 && recentHit) || (door.lvl < (m.wave - 3) * st.door * 0.4)) {
      if (p.cash >= doorCost) return m.command(this.pid, { type: 'door' }).ok;
      if (hpFrac < 0.4 && recentHit) return false; // save for the door
    }
    var dps = 0, farms = 0;
    room.towers.forEach(function (t) { if (t.item.isFarm) farms++; else dps += G.estimateDps(m, room, t); });
    var bossSoon = nextWave % 5 === 0;
    var need = G.waveHp(m, nextWave) / 20 * (bossSoon ? 2.2 : 1) * (m.bossLog.length && m.bossLog[m.bossLog.length - 1].player === p.id && m.bossLog[m.bossLog.length - 1].wave === m.wave ? 2 : 1);
    var want = { beginner: 0.8, balanced: 1.2, aggressive: 1.35, economy: 0.9, defensive: 1.3 }[p.style] || 1.2;
    var lateGame = m.diff.waves !== Infinity && m.wave > m.diff.waves * 0.75;
    var loadout = p.loadout.map(function (id) { return G.ITEM[id]; });
    var freeSlots = room.def.slots.filter(function (s) { return !room.tile[s.x + ',' + s.y]; });
    var farmCap = Math.round(room.def.slots.length * st.farm);
    var invest = dps >= need * want && !recentHit && !lateGame && farms < farmCap + 2;
    if (this.goal && (recentHit || lateGame || p.cash >= this.goal)) this.goal = 0;
    if (!invest && this.goal && dps >= need * 0.75) return false; // keep saving for the farm
    var acts = [];
    if (invest) {
      loadout.forEach(function (it) {
        if (!it.isFarm || m.countPlaced(room, it.id) >= it.limit || !freeSlots.length || farms >= farmCap) return;
        var inc = it.income * (it.kind === 'mine_farm' ? 0.25 : 1) + (it.kind === 'quantum' ? it.growth * m.time / 60 : 0);
        acts.push({ v: inc / it.cost, cost: it.cost, run: function () {
          var s = mistakes ? freeSlots[(Math.random() * freeSlots.length) | 0] : self.bestSlot(room, freeSlots, 3, true);
          return m.command(self.pid, { type: 'place', item: it.id, x: s.x, y: s.y }).ok;
        } });
      });
      room.towers.forEach(function (t) {
        var nx = m.nextLevel(t);
        if (!t.item.isFarm || !nx || !nx.inc) return;
        var c = m.upgradeCost(t);
        acts.push({ v: (t.item.income || 50) * G.TRACKS.inc.per * nx.inc / c * (t.item.kind === 'mine_farm' ? 0.25 : 1), cost: c, run: function () { return m.command(self.pid, { type: 'upgradeTower', tower: t.id }).ok; } });
      });
    } else {
      loadout.forEach(function (it) {
        if (it.isFarm || m.countPlaced(room, it.id) >= Math.min(it.limit, UTIL_CAP[it.id] || 99)) return;
        var path = it.place === 'path';
        if (!path && !freeSlots.length) return;
        var s = path ? self.bestPathTile(room, it) : (mistakes ? freeSlots[(Math.random() * freeSlots.length) | 0] : self.bestSlot(room, freeSlots, it.range || 3, false));
        if (!s) return;
        var gain = G.estimateDps(m, room, self.fake(it, s.x, s.y));
        if (!gain) gain = (UTIL_CAP[it.id] ? 0.25 : 0.1) * Math.max(dps, 10) * (it.kind === 'medic' && door.lvl < 3 ? 0.3 : 1);
        acts.push({ v: gain / it.cost * (freeSlots.length > 4 ? 1.1 : 0.8), cost: it.cost, run: function () {
          return m.command(self.pid, { type: 'place', item: it.id, x: s.x, y: s.y }).ok;
        } });
      });
      room.towers.forEach(function (t) {
        if (t.item.isFarm) return;
        var nx = m.nextLevel(t); if (!nx) return;
        var tr, before = G.estimateDps(m, room, t);
        for (tr in nx) t.lvl[tr] += nx[tr];
        var after = G.estimateDps(m, room, t);
        for (tr in nx) t.lvl[tr] -= nx[tr];
        var c = m.upgradeCost(t), g = after - before;
        if (g <= 0) g = Math.max(before, 5) * 0.08 * Object.keys(nx).length;
        acts.push({ v: g / c * st.upgrade * 2, cost: c, run: function () { return m.command(self.pid, { type: 'upgradeTower', tower: t.id }).ok; } });
      });
      room.towers.forEach(function (t) {
        var nx = t.item.evo && t.item.evo[t.evo];
        if (!nx || m.towerLevel(t) < nx.lvl) return;
        var gain = Math.max(G.estimateDps(m, room, t), 20) * ((nx.mul.dmg || nx.mul.inc || 1.5) - 1 + (nx.multi || nx.rockets || nx.beams || 1) * 0.3);
        acts.push({ v: gain / nx.cost * 1.3, cost: nx.cost, run: function () { return m.command(self.pid, { type: 'evolve', tower: t.id }).ok; } });
      });
      if (door.lvl < 2 + m.wave * 0.3) acts.push({ v: (dps * 0.15 + 5) / doorCost * (0.5 + st.door), cost: doorCost, run: function () { return m.command(self.pid, { type: 'door' }).ok; } });
    }
    if (!acts.length) return false;
    if (p.style === 'beginner') acts.forEach(function (a) { a.v *= 0.4 + Math.random() * 1.2; });
    acts.sort(function (a, b) { return b.v - a.v; });
    var top = acts[0];
    if (top.cost <= p.cash) return top.run();
    if (invest && top.cost > p.cash && p.style !== 'beginner') this.goal = top.cost;
    // fallback: something affordable that's at least decent value, otherwise save
    for (var i = 1; i < acts.length; i++) {
      if (acts[i].cost <= p.cash && acts[i].v >= top.v * (recentHit ? 0.3 : 0.65)) return acts[i].run();
    }
    return false;
  };
  G.Bot.prototype.bestSlot = function (room, free, range, farm) {
    var best = null, bv = farm ? Infinity : -Infinity;
    free.forEach(function (s) {
      var v = G.coverage(room.def, s.x, s.y, range) + Math.random() * 0.5;
      if (farm ? v < bv : v > bv) { bv = v; best = s; }
    });
    return best;
  };
  G.Bot.prototype.bestPathTile = function (room, it) {
    var def = room.def, best = null, bv = -Infinity;
    var shooters = room.towers.filter(function (t) { return !t.item.isFarm && t.item.range; });
    def.pathTiles.forEach(function (pt) {
      if (room.tile[pt.x + ',' + pt.y]) return;
      var cx = pt.x * T + T / 2, cy = pt.y * T + T / 2, c = 0;
      shooters.forEach(function (t) { if (Math.hypot(t.px - cx, t.py - cy) <= t.item.range * T) c++; });
      var dFront = Math.hypot(pt.x - def.front.x, pt.y - def.front.y);
      var v = c * 2 - dFront * (it.kind === 'wall' ? 2 : 0.8) + Math.random();
      if (it.kind === 'wall' && dFront < 0.5) v -= 3;
      if (v > bv) { bv = v; best = pt; }
    });
    return best;
  };
})();
