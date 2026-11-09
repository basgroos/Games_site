// =====================================================================
//  SIMULATION — authoritative game state. Pure logic, no rendering.
//  All player actions arrive as commands via match.command(pid, cmd),
//  so a network adapter can forward them later (see net.js).
// =====================================================================
(function () {
  var T = G.T;

  G.rng = function (seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };
  function noop() {}
  var NOFX = new Proxy({}, { get: function () { return noop; } });

  // -------------------------------------------------------------------
  //  Wave scaling
  // -------------------------------------------------------------------
  G.scaling = function (map, diff, n) {
    var hp = diff.hp * map.hp * (1 + 0.2 * (n - 1)) * Math.pow(1.04, n - 1);
    if (diff.id === 'endless' && n > 25) hp *= Math.pow(1.035, n - 25);
    return {
      hp: hp,
      dmg: diff.dmg * (1 + 0.1 * (n - 1)) * (diff.id === 'endless' && n > 30 ? Math.pow(1.02, n - 30) : 1),
      reward: diff.cash * 1.3 * (1 + 0.09 * (n - 1)),
      speed: 1 + Math.min(0.3, 0.01 * (n - 1))
    };
  };

  // Wave composition — identical for every room in the match
  G.genWave = function (match, n) {
    var rnd = G.rng(match.seed * 7919 + n * 104729);
    var map = match.map, diff = match.diff, sp = map.special;
    var pool = [['normal', 10]];
    if (n >= 2) pool.push(['fast', 4 + n * 0.3]);
    if (n >= 4) pool.push(['armored', 2 + n * 0.25]);
    if (n >= 4) { pool.push(['tank', 1.5 + n * 0.12]); pool.push([sp[0], 3 + n * 0.2]); }
    if (n >= 6) { pool.push(['invisible', 2 + n * 0.12]); pool.push(['poisonz', 2.5]); }
    if (n >= 7) { pool.push(['flying', 2 + n * 0.12]); pool.push([sp[1], 1.5 + n * 0.12]); }
    if (n >= 8) { pool.push(['exploding', 2.5]); pool.push(['healer', 1.2 + n * 0.05]); }
    if (n >= 12) { pool.push(['giant', 0.3 + n * 0.025]); pool.push([sp[2], 1 + n * 0.06]); }
    // normals become rarer later
    pool[0][1] = Math.max(3, 10 - n * 0.35);
    var total = pool.reduce(function (a, p) { return a + p[1]; }, 0);
    var count = Math.round((6 + 1.45 * n) * diff.count);
    if (diff.id === 'endless' && n > 30) count = Math.round(count * Math.min(1.6, 1 + (n - 30) * 0.02));
    var spread = 15 + Math.min(6, n * 0.2);
    var entries = [];
    for (var i = 0; i < count; i++) {
      var r = rnd() * total, type = 'normal';
      for (var j = 0; j < pool.length; j++) { r -= pool[j][1]; if (r <= 0) { type = pool[j][0]; break; } }
      var at = (i / count) * spread + rnd() * 0.6;
      entries.push({ type: type, at: at });
    }
    var boss = null;
    if (n % 5 === 0) {
      var idx = n / 5 - 1;
      var order = map.bosses.slice();
      G.MAPS.forEach(function (m) { if (m !== map) order = order.concat(m.bosses); });
      boss = { id: order[idx % order.length], num: idx };
    }
    return { entries: entries, boss: boss };
  };

  // -------------------------------------------------------------------
  //  Match
  // -------------------------------------------------------------------
  G.Match = function (opts) {
    this.map = G.MAP[opts.mapId];
    this.diff = G.DIFF[opts.diffId];
    this.seed = opts.seed || ((Math.random() * 1e9) | 0);
    this.rnd = G.rng(this.seed);
    this.fx = opts.fx || NOFX;
    this.players = opts.players.map(function (p, i) {
      return {
        id: i, name: p.name, isBot: !!p.isBot, style: p.style || null, color: G.PLAYER_COLORS[i % 8],
        loadout: p.loadout.slice(0, 5), stars: p.stars || {}, room: -1, alive: true, finished: false,
        vote: false,
        pos: { x: 32 * G.T + Math.cos(i / 8 * Math.PI * 2) * 150, y: 21.5 * G.T + Math.sin(i / 8 * Math.PI * 2) * 120 }, path: null, kx: 0, ky: 0, face: 1, walk: 0, moving: false,
        stats: { moneyEarned: 0, kills: 0, bosses: 0, doorDamage: 0, waveReached: 0, damage: 0, killMoney: 0, upgrades: 0, evolves: 0 },
        incomeLast: 0, mast: {}, cos: p.cos || {}, hat: p.hat || null, duoWith: p.duoWith != null ? p.duoWith : null
      };
    });
    // money lives in a "bank" so two players in a duo room can share one wallet
    this.players.forEach(function (pl) {
      pl.bank = { cash: 700 };
      Object.defineProperty(pl, 'cash', { get: function () { return this.bank.cash; }, set: function (v) { this.bank.cash = v; }, enumerable: true, configurable: true });
    });
    this.duo = !!opts.duo;
    this.rooms = G.ROOMS.map(function (def, i) {
      return { index: i, def: def, owner: -1, partner: -1, towers: [], zombies: [], queue: [], pending: [], vortices: [], fields: [],
        door: { lvl: 0, hp: G.doorMaxHp(0), max: G.doorMaxHp(0), shield: 0, shieldUntil: 0, poison: [], lastHit: -99, repairUntil: 0, repairReady: 0, repairRate: 0 },
        tile: {}, walls: [], incomeT: G.INCOME_INTERVAL, time: 0, timeSlowUntil: 0, timeSlowAmt: 0,
        blessUntil: 0, buffT: 0, nextZid: 1, nextTid: 1, waveSpawned: true };
    });
    this.phase = 'claim';
    this.claimTimer = opts.claimTime || 25;
    this.prepTimer = 15;
    this.wave = 0;
    this.waveTimer = 0;
    this.time = 0;          // seconds since first wave prep
    this.elapsed = 0;       // total
    this.bossLog = [];
    this.over = false;
    this.speed = 1;
    this.bots = [];
  };
  var M = G.Match.prototype;

  M.alivePlayers = function () { return this.players.filter(function (p) { return p.alive; }); };
  M.roomOf = function (p) { return p.room >= 0 ? this.rooms[p.room] : null; };
  M.totalWaves = function () { return this.diff.waves; };

  // -------------------------------------------------------------------
  //  Claim phase (hub)
  // -------------------------------------------------------------------
  M.canJoinDuo = function (p, room) {
    if (!this.duo || room.owner < 0 || room.partner >= 0 || p.room >= 0) return false;
    var owner = this.players[room.owner];
    if (owner.isBot && !p.isBot) return false;
    if (p.isBot && p.duoWith !== owner.id) return false;
    return true;
  };
  M.joinDuo = function (p, room) {
    var owner = this.players[room.owner];
    room.partner = p.id; p.room = room.index;
    owner.bank.cash += p.bank.cash; p.bank = owner.bank;
    this.fx.claim(room, p);
    return true;
  };
  M.roomPlayers = function (room) { var out = []; if (room.owner >= 0) out.push(this.players[room.owner]); if (room.partner >= 0) out.push(this.players[room.partner]); return out; };
  M.claim = function (p, ri) {
    var room = this.rooms[ri];
    if (this.phase === 'claim' && room.owner >= 0 && this.canJoinDuo(p, room)) return this.joinDuo(p, room);
    if (this.phase !== 'claim' || p.room >= 0 || room.owner >= 0) return false;
    room.owner = p.id; p.room = ri;
    this.setupRoom(room, p);
    this.fx.claim(room, p);
    return true;
  };
  M.setupRoom = function (room, p) {
    var c = room.def.cashSlot;
    var t = this.addTower(room, G.ITEM.cashreg, c.x, c.y);
    t.spent = 0; t.starter = true;
  };
  // ---- avatars: free movement with wall collision, or BFS path following ----
  var AV_R = 9, AV_SPEED = 5.2 * T;
  function canStand(x, y) {
    return G.isWalk(Math.floor((x - AV_R) / T), Math.floor((y - AV_R) / T)) && G.isWalk(Math.floor((x + AV_R) / T), Math.floor((y - AV_R) / T)) &&
      G.isWalk(Math.floor((x - AV_R) / T), Math.floor((y + AV_R) / T)) && G.isWalk(Math.floor((x + AV_R) / T), Math.floor((y + AV_R) / T));
  }
  G.canStand = canStand;
  M.updateAvatars = function (dt) {
    var self = this;
    this.players.forEach(function (p) {
      if (p.remote) { if (p.moving) p.walk += dt * 11; return; }   // position comes from the network
      self.moveAvatar(p, dt);
    });
  };
  M.moveAvatar = function (p, dt) {
    (function () {
      var pos = p.pos, sp = AV_SPEED * (p.isBot ? 0.85 : 1) * dt, mx = 0, my = 0;
      if (p.kx || p.ky) { var l = Math.hypot(p.kx, p.ky); mx = p.kx / l * sp; my = p.ky / l * sp; p.path = null; }
      else if (p.path && p.path.length) {
        var wp = p.path[0], dx = wp.x - pos.x, dy = wp.y - pos.y, d = Math.hypot(dx, dy);
        if (d <= sp) { mx = dx; my = dy; p.path.shift(); if (!p.path.length) p.path = null; }
        else { mx = dx / d * sp; my = dy / d * sp; }
      }
      p.moving = !!(mx || my);
      if (p.moving) {
        if (canStand(pos.x + mx, pos.y)) pos.x += mx; else if (p.path) pos.x += mx;
        if (canStand(pos.x, pos.y + my)) pos.y += my; else if (p.path) pos.y += my;
        p.walk += dt * 11; if (Math.abs(mx) > 0.01) p.face = mx > 0 ? 1 : -1;
      }
    })();
  };
  M.tileOf = function (p) { return { x: Math.floor(p.pos.x / T), y: Math.floor(p.pos.y / T) }; };
  M.roomAt = function (tx, ty) {
    for (var i = 0; i < 8; i++) { var d = this.rooms[i].def; if (G.inRect(d.walls, tx, ty)) return this.rooms[i]; }
    return null;
  };
  M.goTo = function (p, x, y) {
    var t = this.tileOf(p), path = G.findPath(t.x, t.y, Math.floor(x / T), Math.floor(y / T));
    p.path = path; p.kx = p.ky = 0;
    if (path && path.length) { var e = path[path.length - 1]; if (G.isWalk(Math.floor(x / T), Math.floor(y / T)) && Math.floor(e.x / T) === Math.floor(x / T) && Math.floor(e.y / T) === Math.floor(y / T)) { e.x = x; e.y = y; } }
    return !!path;
  };
  M.goRoom = function (p, ri) {
    var d = this.rooms[ri].def;
    if (ri === p.room || this.phase === 'claim') return this.goTo(p, d.center.x, d.center.y);
    return this.goTo(p, d.outside.x, d.outside.y + (d.top ? -T : T));
  };
  // building only works from inside your own room (or right at its door)
  M.canBuild = function (p) {
    var room = this.roomOf(p); if (!room) return false;
    var t = this.tileOf(p);
    if (G.inRect(room.def.walls, t.x, t.y)) return true;
    return Math.hypot(p.pos.x - room.def.doorPx.x, p.pos.y - room.def.doorPx.y) < 2.6 * T;
  };
  M.updateClaim = function (dt) {
    var self = this;
    this.claimTimer -= dt;
    this.players.forEach(function (p) {
      if (p.room >= 0) return;
      var t = self.tileOf(p), r = self.roomAt(t.x, t.y);
      if (r && G.WORLD.grid[t.y][t.x] !== '#' && (r.owner < 0 || self.canJoinDuo(p, r))) self.claim(p, r.index);
    });
    // bots pick rooms and walk there
    this.players.forEach(function (p) {
      if (!p.isBot || p.room >= 0) return;
      p.botClaimDelay = (p.botClaimDelay == null) ? 0.5 + self.rnd() * 5 : p.botClaimDelay - dt;
      if (p.botClaimDelay > 0) return;
      if (p.duoWith != null) {
        var buddy = self.players[p.duoWith];
        if (buddy.room >= 0) { if (!p.path) self.goRoom(p, buddy.room); }
        return;
      }
      var tgt = p.botTarget;
      if (tgt == null || self.rooms[tgt].owner >= 0) {
        var free = self.rooms.filter(function (r) { return r.owner < 0; });
        if (!free.length) return;
        free.sort(function (a, b) { return Math.hypot(a.def.center.x - p.pos.x, a.def.center.y - p.pos.y) - Math.hypot(b.def.center.x - p.pos.x, b.def.center.y - p.pos.y); });
        tgt = p.botTarget = free[Math.min(free.length - 1, (self.rnd() * Math.min(3, free.length)) | 0)].index;
        self.goRoom(p, tgt);
      }
      if (!p.path) self.goRoom(p, tgt);
    });
    var unclaimed = this.players.filter(function (p) { return p.room < 0; });
    if (this.claimTimer <= 0 && unclaimed.length) {
      unclaimed.forEach(function (p) {
        if (p.duoWith != null && self.players[p.duoWith].room >= 0) { var br = self.rooms[self.players[p.duoWith].room]; if (br.partner < 0) { self.joinDuo(p, br); self.goRoom(p, br.index); return; } }
        var free = self.rooms.filter(function (r) { return r.owner < 0; });
        var r = free[(self.rnd() * free.length) | 0];
        self.claim(p, r.index);
        if (p.isBot) self.goRoom(p, r.index);
      });
    }
    if (!this.players.some(function (p) { return p.room < 0; })) {
      this.phase = 'prep';
      this.fx.event('prep', {});
    }
  };

  // -------------------------------------------------------------------
  //  Towers
  // -------------------------------------------------------------------
  M.addTower = function (room, item, x, y, by) {
    if (by == null) by = room.owner;
    var bp = this.players[by];
    var t = { id: room.nextTid++, roomIdx: room.index, by: by, auto: false, prio: false, evo: 0, cos: (bp && bp.cos && bp.cos[item.id]) || null, item: item, x: x, y: y, px: x * T + T / 2, py: y * T + T / 2,
      lvl: { dmg: 0, spd: 0, rng: 0, spc: 0, inc: 0 }, ul: 0, spent: item.cost, cd: 0.3, angle: -Math.PI / 2,
      target: item.target || 'first', stunUntil: 0, placedAt: room.time, kills: 0, dmgDealt: 0, earned: 0,
      buff: { dmg: 1, spd: 1, rng: 1, detect: false }, fire: 0, data: {} };
    if (item.place === 'path') {
      var idx = -1;
      idx = 0;
      t.pathIdx = idx;
      if (item.kind === 'wall') { t.hp = t.maxHp = this.wallHp(t, room); t.downUntil = 0; room.walls.push(t); }
      if (item.kind === 'mine') { t.data.armed = true; t.data.rearmAt = 0; }
    }
    if (item.kind === 'drones') {
      t.data.drones = [];
    }
    if (item.kind === 'soul') t.data.souls = 0;
    if (item.kind === 'creator') { t.data.mode = 0; t.data.modeT = 4; t.data.ultT = item.ult; }
    if (item.kind === 'reality') t.data.rewriteT = item.rewrite;
    if (item.kind === 'timeslow' || item.kind === 'shield' || item.kind === 'goldengod' || item.kind === 'meteor' || item.kind === 'blackhole') t.cd = item.kind === 'meteor' ? 2 : 4;
    if (item.kind === 'mine_farm') t.data.mineT = item.every;
    room.towers.push(t);
    room.tile[x + ',' + y] = t;
    room.buffT = 0;
    if (bp) { var ms = bp.mast[item.id] || (bp.mast[item.id] = [0, 0, 0]); }
    return t;
  };
  M.ownerStars = function (room, item, by) { var p = this.players[by != null ? by : room.owner]; return (p && p.stars[item.id]) || 0; };
  M.evoOf = function (t) { return t.evo && t.item.evo ? t.item.evo[t.evo - 1] : null; };

  // Effective stats of a tower (levels, stars, buffs)
  M.stats = function (t, room) {
    var it = t.item, L = t.lvl, stars = this.ownerStars(room, it, t.by), s = {}, ev = this.evoOf(t), em = (ev && ev.mul) || {};
    var starMul = 1 + 0.05 * stars, rar = G.RAR[it.rarity];
    var bless = room.blessUntil > room.time ? 1.5 : 1;
    s.dmg = (it.dmg || 0) * (1 + G.TRACKS.dmg.per * L.dmg) * starMul * t.buff.dmg * bless * rar.power;
    s.cd = (it.cd || 1) / ((1 + G.TRACKS.spd.per * L.spd) * t.buff.spd * bless);
    s.range = (it.range || 0) * (1 + G.TRACKS.rng.per * L.rng) * t.buff.rng * T;
    s.spc = 1 + G.TRACKS.spc.per * L.spc;
    s.income = (it.income || 0) * (1 + G.TRACKS.inc.per * L.inc) * starMul * rar.incPower;
    s.detect = !!it.detect || t.buff.detect || !!(ev && ev.detect);
    if (em.dmg) s.dmg *= em.dmg; if (em.cd) s.cd *= em.cd; if (em.rng) s.range *= em.rng; if (em.inc) s.income *= em.inc;
    if (t.hasteUntil > room.time) s.cd /= 2;
    if (it.kind === 'lastdef') {
      var miss = 1 - room.door.hp / room.door.max;
      s.dmg *= 1 + 4 * miss; s.cd /= 1 + miss;
    }
    if (it.kind === 'soul') s.dmg += (t.data.souls || 0) * it.perSoul * s.spc * starMul;
    if (it.kind === 'creator') s.ultCd = it.ult / s.spc;
    // slow / cooldown abilities: spd track shortens cooldown
    return s;
  };
  M.wallHp = function (t, room) { return Math.round(t.item.hp * (1 + 0.4 * t.lvl.spc) * (1 + 0.05 * this.ownerStars(room, t.item)) * (1 + 0.12 * Math.max(0, this.wave - 1))); };

  // cost of one stat point on a track (internal); a level costs the sum of its points
  M.trackCost = function (t, track, lvl) {
    if (lvl == null) lvl = t.lvl[track];
    var mul = { dmg: 1, spd: 1.1, rng: 0.8, spc: 1, inc: 0.85 }[track];
    return Math.round((t.item.upCost || t.item.cost) * 0.55 * mul * Math.pow(1.5, lvl) / 5) * 5;
  };
  // one upgrade path per tower: every level raises a mix of stats (see G.buildPath)
  M.nextLevel = function (t) { return t.item.path[t.ul || 0] || null; };
  M.upgradeCost = function (t) {
    var nx = this.nextLevel(t); if (!nx) return 0;
    var c = 0; for (var tr in nx) for (var k = 0; k < nx[tr]; k++) c += this.trackCost(t, tr, t.lvl[tr] + k);
    return c;
  };
  M.towerLevel = function (t) { return t.ul || 0; };
  // visual tier 0..10 for the model (each upgrade level changes the look)
  G.towerTier = function (t) { return Math.min(10, t.ul || 0); };
  M.cheapestTrack = function (t) { return this.nextLevel(t) ? 'lvl' : null; };   // kept for older callers
  M.doUpgrade = function (p, room, t) {
    var cost = this.upgradeCost(t), nx = this.nextLevel(t);
    p.cash -= cost; t.spent += cost; for (var tr in nx) t.lvl[tr] += nx[tr]; t.ul = (t.ul || 0) + 1; p.stats.upgrades++;
    if (t.item.kind === 'wall') { var nm = this.wallHp(t, room); t.hp += nm - t.maxHp; t.maxHp = nm; }
    room.buffT = 0;
    this.fx.upgrade(room, t);
  };
  M.upgradeOrder = function (room, farmsOnly) {
    var self = this;
    return room.towers.filter(function (q) { return !farmsOnly || q.item.isFarm; }).map(function (q) { var tr = self.cheapestTrack(q); return { q: q, c: tr ? self.upgradeCost(q, tr) : Infinity }; })
      .sort(function (a, b) { return (b.q.prio - a.q.prio) || (a.c - b.c); }).map(function (o) { return o.q; });
  };
  M.autoUpgrade = function (room) {
    var owner = this.players[room.owner]; if (!owner || !owner.alive) return;
    var self = this, list = this.upgradeOrder(room).filter(function (q) { return q.auto; });
    for (var i = 0; i < list.length; i++) {
      var q = list[i], tr = this.cheapestTrack(q); if (!tr) continue;
      var c = this.upgradeCost(q, tr);
      if (owner.cash >= c) { this.doUpgrade(this.players[q.by] && this.players[q.by].room === room.index ? this.players[q.by] : owner, room, q, tr); break; }
      if (q.prio) break; // save up for the priority tower first
    }
  };
  M.sellValue = function (t) { return Math.round(t.spent * 0.6); };
  M.countPlaced = function (room, itemId) { return room.towers.filter(function (t) { return t.item.id === itemId && !t.starter; }).length; };

  M.canPlace = function (p, itemId, x, y) {
    var room = this.roomOf(p), it = G.ITEM[itemId];
    if (!room || !p.alive || this.phase === 'claim') return 'Niet beschikbaar';
    if (!it || p.loadout.indexOf(itemId) < 0) return 'Niet in loadout';
    if (it.place === 'path') { if (!room.def.pathSet[x + ',' + y] || G.WORLD.grid[y][x] === 'S') return 'Traps alleen op het pad naar jouw deur'; }
    else if (!G.inRect(room.def.interior, x, y)) return 'Alleen binnen jouw kamer';
    if (room.tile[x + ',' + y]) return 'Vakje bezet';
    if (!this.canBuild(p)) return 'Loop naar je kamer om te bouwen';
    if (this.countPlaced(room, itemId) >= it.limit) return 'Limiet bereikt (' + it.limit + ')';
    if (p.cash < it.cost) return 'Niet genoeg geld';
    return null;
  };

  // -------------------------------------------------------------------
  //  Commands (the only way players change state)
  // -------------------------------------------------------------------
  M.command = function (pid, cmd) {
    var p = this.players[pid], room = this.roomOf(p), err, t;
    switch (cmd.type) {
      case 'move': return { ok: this.goTo(p, cmd.x, cmd.y) };
      case 'goto': return { ok: this.goRoom(p, cmd.room) };
      case 'keys': p.kx = cmd.kx; p.ky = cmd.ky; return { ok: true };
      case 'place':
        err = this.canPlace(p, cmd.item, cmd.x, cmd.y);
        if (err) return { ok: false, msg: err };
        p.cash -= G.ITEM[cmd.item].cost;
        t = this.addTower(room, G.ITEM[cmd.item], cmd.x, cmd.y, pid);
        this.fx.place(room, t);
        return { ok: true, tower: t };
      case 'upgrade':        // (older clients send a track; every upgrade now buys the next level)
      case 'upgradeTower':   // hotkey E: next level of one tower
        t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
        if (!t || !p.alive) return { ok: false, msg: 'Geen tower' };
        if (!this.canBuild(p)) return { ok: false, msg: 'Loop naar je kamer om te upgraden' };
        var tr0 = this.cheapestTrack(t);
        if (!tr0) return { ok: false, msg: 'Deze tower is al max level' };
        if (p.cash < this.upgradeCost(t, tr0)) return { ok: false, msg: 'Niet genoeg geld ($' + this.upgradeCost(t, tr0) + ')' };
        this.doUpgrade(p, room, t, tr0);
        return { ok: true, track: tr0 };
      case 'upgradeAll':     // one level for every tower (or every farm) you can afford, priority first
        if (!room || !p.alive) return { ok: false };
        if (!this.canBuild(p)) return { ok: false, msg: 'Loop naar je kamer om te upgraden' };
        var self0 = this, n0 = 0;
        this.upgradeOrder(room, cmd.farms).forEach(function (q) {
          var tr = self0.cheapestTrack(q); if (!tr) return;
          if (p.cash >= self0.upgradeCost(q, tr)) { self0.doUpgrade(p, room, q, tr); n0++; }
        });
        return n0 ? { ok: true, count: n0 } : { ok: false, msg: cmd.farms ? 'Geen farm-upgrade betaalbaar' : 'Geen upgrade betaalbaar' };
      case 'auto':
        t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
        if (!t) return { ok: false }; t.auto = !!cmd.on; return { ok: true };
      case 'prio':
        t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
        if (!t) return { ok: false }; t.prio = !!cmd.on; return { ok: true };
      case 'evolve':
        t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
        if (!t || !p.alive) return { ok: false, msg: 'Geen tower' };
        if (!this.canBuild(p)) return { ok: false, msg: 'Loop naar je kamer om te evolueren' };
        var nx = t.item.evo && t.item.evo[t.evo];
        if (!nx) return { ok: false, msg: 'Kan niet (verder) evolueren' };
        if (this.towerLevel(t) < nx.lvl) return { ok: false, msg: 'Eerst level ' + nx.lvl + ' nodig' };
        if (p.cash < nx.cost) return { ok: false, msg: 'Niet genoeg geld ($' + nx.cost + ')' };
        p.cash -= nx.cost; t.spent += nx.cost; t.evo++; p.stats.evolves++;
        room.buffT = 0;
        this.fx.evolve(room, t, nx);
        return { ok: true };
      case 'sell':
        t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
        if (!t || !p.alive) return { ok: false, msg: 'Geen tower' };
        if (!this.canBuild(p)) return { ok: false, msg: 'Loop naar je kamer om te verkopen' };
        var v = this.sellValue(t);
        p.cash += v;
        this.removeTower(room, t);
        this.fx.sell(room, t, v);
        return { ok: true, value: v };
      case 'target':
        t = room && room.towers.filter(function (q) { return q.id === cmd.tower; })[0];
        if (t) t.target = cmd.mode; return { ok: !!t };
      case 'door':
        if (!room || !p.alive) return { ok: false };
        if (!this.canBuild(p)) return { ok: false, msg: 'Loop naar je kamer om je deur te upgraden' };
        var dc = G.doorUpgradeCost(room.door.lvl);
        if (p.cash < dc) return { ok: false, msg: 'Niet genoeg geld' };
        p.cash -= dc; room.door.lvl++;
        var nmax = G.doorMaxHp(room.door.lvl), gain = nmax - room.door.max;
        room.door.max = nmax; room.door.hp = Math.min(nmax, room.door.hp + gain + nmax * 0.1);
        this.fx.doorUpgrade(room);
        return { ok: true };
      case 'repair':
        if (!room || !p.alive) return { ok: false };
        if (!this.canBuild(p)) return { ok: false, msg: 'Loop naar je kamer om te repareren' };
        var dr = room.door;
        if (dr.repairUntil > room.time) return { ok: false, msg: 'Al aan het repareren' };
        if (dr.repairReady > room.time) return { ok: false, msg: 'Nog ' + Math.ceil(dr.repairReady - room.time) + 's cooldown' };
        if (dr.hp >= dr.max) return { ok: false, msg: 'Deur is niet beschadigd' };
        dr.repairUntil = room.time + 6; dr.repairRate = dr.max * 0.35 / 6; dr.repairReady = room.time + 6 + 20;
        this.fx.text(room, room.def.doorPx.x, room.def.doorPx.y - 30, '🔧 Repareren...', '#7dff9a');
        return { ok: true };
      case 'vote': if (!this.canVote(p)) { p.vote = false; return { ok: false, msg: 'Nog niet mogelijk' }; } p.vote = !p.vote; return { ok: true, vote: p.vote };
    }
    return { ok: false };
  };
  M.removeTower = function (room, t) {
    room.towers.splice(room.towers.indexOf(t), 1);
    delete room.tile[t.x + ',' + t.y];
    if (t.item.kind === 'wall') room.walls.splice(room.walls.indexOf(t), 1);
    room.buffT = 0;
  };

  // -------------------------------------------------------------------
  //  Waves
  // -------------------------------------------------------------------
  M.startWave = function (n) {
    var self = this, w = G.genWave(this, n);
    this.wave = n;
    this.waveTimer = (n % 5 === 0) ? 42 : 30;
    this.players.forEach(function (p) { p.vote = false; if (p.alive) p.stats.waveReached = n; });
    var alive = this.alivePlayers();
    this.rooms.forEach(function (room) {
      var p = self.players[room.owner];
      if (!p || !p.alive) return;
      w.entries.forEach(function (e) { room.queue.push({ at: room.time + e.at + 0.5, type: e.type, wave: n }); });
      room.queue.sort(function (a, b) { return a.at - b.at; });
    });
    if (w.boss && alive.length) {
      var target = alive[(this.rnd() * alive.length) | 0];
      var broom = this.roomOf(target);
      broom.queue.push({ at: broom.time + 4, type: 'boss', boss: w.boss.id, num: w.boss.num, wave: n });
      broom.queue.sort(function (a, b) { return a.at - b.at; });
      this.bossLog.push({ wave: n, boss: w.boss.id, player: target.id });
      // escorts for the other rooms
      alive.forEach(function (p) {
        if (p === target) return;
        var r = self.roomOf(p);
        r.queue.push({ at: r.time + 5, type: 'tank', wave: n, elite: true });
        r.queue.push({ at: r.time + 6, type: n >= 20 ? 'giant' : 'tank', wave: n, elite: n < 20 });
        r.queue.sort(function (a, b) { return a.at - b.at; });
      });
      this.fx.bossIncoming(broom, G.BOSSES[w.boss.id], target);
    }
    this.fx.wave(n);
  };

  M.spawnZombie = function (room, type, opts) {
    opts = opts || {};
    var sc = G.scaling(this.map, this.diff, opts.wave || this.wave || 1), z;
    if (type === 'boss') {
      var b = G.BOSSES[opts.boss];
      var hp = 1200 * sc.hp * b.hp * (1 + 0.12 * (opts.num || 0));
      z = { type: 'boss', boss: b, name: b.name, hp: hp, maxHp: hp, speed: b.speed * T, baseSpeed: b.speed * T, dmg: b.dmg * sc.dmg,
        reward: Math.round(350 * (1 + 0.5 * (opts.num || 0)) * sc.reward), armor: b.armor * (1 + 0.04 * this.wave), color: b.color, size: b.size,
        fly: !!b.fly, immuneSlow: !!b.immuneSlow, immuneBurn: !!b.immuneBurn, heavy: true, isBoss: true,
        ab: { t1: 4, t2: 6, phase: 1 } };
    } else {
      var d = G.ZOMBIES[type], mul = opts.hpMul || 1;
      if (opts.elite) mul *= 1.6;
      var zhp = d.hp * sc.hp * mul;
      z = { type: type, def: d, hp: zhp, maxHp: zhp, speed: d.speed * T * sc.speed * (opts.spdMul || 1), dmg: d.dmg * sc.dmg, reward: Math.max(1, Math.round(d.reward * sc.reward * (opts.rewMul || 1))),
        armor: (d.armor || 0) * (1 + 0.05 * this.wave), color: d.color, size: d.size * (opts.elite ? 1.15 : 1), fly: !!d.fly, invis: !!d.invis, immuneSlow: !!d.immuneSlow,
        immuneBurn: !!d.immuneBurn, heavy: !!d.heavy, regen: d.regen || 0, healer: !!d.healer, blocks: d.blocks || 0, elite: !!opts.elite };
      if (opts.elite) z.reward = Math.max(z.reward, Math.round(75 * sc.reward));
      z.baseSpeed = z.speed;
    }
    z.id = room.nextZid++; z.room = room.index; z.dist = opts.dist || 0; z.atk = 0.5;
    var ur = room.def.useRoutes;
    z.route = opts.route || ur[(this.rnd() * ur.length) | 0]; z.ox = 0; z.oy = 0; z.slowUntil = 0; z.slowAmt = 0; z.trapSlow = 0;
    z.burn = null; z.poison = []; z.stunUntil = 0; z.markUntil = 0; z.markAmt = 0; z.weakUntil = 0; z.shred = 0;
    z.revealUntil = 0; z.immuneUntil = 0; z.healT = 2; z.off = (Math.random() - 0.5) * 16; z.walk = Math.random() * 6; z.flash = 0;
    z.spawnT = room.time;
    this.placeZombie(room, z);
    room.zombies.push(z);
    if (this.zall) this.zall.push(z);
    if (z.isBoss) this.fx.bossSpawn(room, z);
    return z;
  };
  M.placeZombie = function (room, z) {
    var r = z.route, p = G.routePos(r, z.dist), a = r.pts[p.i], b = r.pts[p.i + 1];
    var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    var lat = z.off * Math.min(1, (r.len - z.dist) / (2 * T) + 0.15);
    z.x = p.x - dy / l * lat + z.ox; z.y = p.y + dx / l * lat + z.oy;
    z.dir = p.dir;
  };
  // spatial grid over all zombies (rebuilt every tick) for fast range queries
  var CELL = 4 * T, GC = Math.ceil(G.WCOLS * T / CELL), GR = Math.ceil(G.WROWS * T / CELL);
  M.buildGrid = function () {
    var g = this.zgrid || (this.zgrid = []), i;
    for (i = 0; i < GC * GR; i++) g[i] = g[i] ? (g[i].length = 0, g[i]) : [];
    var all = this.zall = [];
    for (var r = 0; r < this.rooms.length; r++) {
      var zs = this.rooms[r].zombies;
      for (i = 0; i < zs.length; i++) {
        var z = zs[i]; if (z.dead) continue; all.push(z);
        var cx = Math.max(0, Math.min(GC - 1, (z.x / CELL) | 0)), cy = Math.max(0, Math.min(GR - 1, (z.y / CELL) | 0));
        g[cy * GC + cx].push(z);
      }
    }
  };
  M.eachNear = function (x, y, r, fn) {
    var g = this.zgrid; if (!g) return;
    var x0 = Math.max(0, ((x - r - 30) / CELL) | 0), x1 = Math.min(GC - 1, ((x + r + 30) / CELL) | 0), y0 = Math.max(0, ((y - r - 30) / CELL) | 0), y1 = Math.min(GR - 1, ((y + r + 30) / CELL) | 0);
    for (var cy = y0; cy <= y1; cy++) for (var cx = x0; cx <= x1; cx++) { var c = g[cy * GC + cx]; for (var i = 0; i < c.length; i++) if (!c[i].dead) fn(c[i]); }
  };
  M.towersNear = function (x, y, r) {
    var out = [];
    this.rooms.forEach(function (rm) { rm.towers.forEach(function (t) { if (t.item.place !== 'path' && Math.hypot(t.px - x, t.py - y) < r) out.push(t); }); });
    return out;
  };
  M.remaining = function (z) { return z.route.len - z.dist; };

  // -------------------------------------------------------------------
  //  Damage & death
  // -------------------------------------------------------------------
  M.damage = function (room, z, amount, src, o) {
    o = o || {};
    if (z.dead || amount <= 0) return 0;
    var emp = z.empUntil > room.time;
    if (z.immuneUntil > room.time && !emp) { if (!o.dot) this.fx.text(room, z.x, z.y - 20, 'IMMUUN', '#aaa'); return 0; }
    if (z.blocks > 0 && !o.dot && !o.aoe && !emp) { z.blocks--; this.fx.text(room, z.x, z.y - 20, 'BLOCK', '#7ab'); return 0; }
    var mult = 1;
    if (z.markUntil > room.time) mult += z.markAmt;
    if (z.weakUntil > room.time) mult += 0.5;
    var amt = amount * mult;
    if (!o.pierce) { var ar = Math.max(0, z.armor - z.shred) * (1 - (o.ap || 0)); amt = Math.max(amt * 0.4, amt - ar); }
    z.hp -= amt; z.flash = 0.08;
    if (z.link && !o.linked && z.link.until > room.time) {
      var lk = z.link, self = this;
      lk.members.forEach(function (m) { if (m !== z && !m.dead) self.damage(room, m, amt * lk.share, lk.src, { linked: true, dot: true, pierce: true }); });
    }
    if (src) { src.dmgDealt += amt; z.lastBy = room.index; z.lastSrc = src; var mp = src.by != null && this.players[src.by]; if (mp && src.item) { var mm = mp.mast[src.item.id] || (mp.mast[src.item.id] = [0, 0, 0]); mm[1] += amt; } }
    var p = this.players[room.owner]; if (p) p.stats.damage += amt;
    if (!o.dot) this.fx.hit(room, z, amt, o.color);
    else if (o.showDot) this.fx.hit(room, z, amt, o.color, true);
    if (z.hp <= 0) this.kill(room, z, src);
    return amt;
  };
  M.kill = function (room, z, src, noReward) {
    if (z.dead) return;
    var self = this;
    z.dead = true; z.hp = 0;
    var p = this.players[src && src.by != null ? src.by : room.owner] || this.players[room.owner];
    if (!noReward && p) {
      var bb = this.bloodBonus(room, z), bonus = bb ? bb.b : 0, rew = Math.round(z.reward * (1 + bonus));
      if (bb) bb.t.earned += rew - z.reward;
      p.cash += rew; p.stats.moneyEarned += rew; p.stats.kills++; p.stats.killMoney += rew;
      if (src) { src.kills++; var ms = p.mast[src.item.id] || (p.mast[src.item.id] = [0, 0, 0]); ms[0]++; if (z.isBoss) ms[2]++; }
      this.fx.cash(room, z.x, z.y, rew, false, bonus > 0);
    }
    room.towers.forEach(function (t) { if (t.item.kind === 'soul' && t.data.souls < t.item.maxSouls * (1 + 0.15 * t.lvl.spc)) t.data.souls++; });
    this.fx.kill(room, z, src);
    var home = this.rooms[z.room];
    if (z.def && z.def.split) for (var i = 0; i < z.def.split; i++) this.spawnZombie(home, 'labspawn', { dist: Math.max(0, z.dist - 10 - i * 14), route: z.route });
    if (z.def && z.def.freezeOnDeath) {
      this.towersNear(z.x, z.y, 1.6 * T).forEach(function (t) { t.stunUntil = Math.max(t.stunUntil, room.time + 2); self.fx.freeze(room, t); });
    }
    if (z.isBoss) {
      if (!noReward && p) { p.stats.bosses++; }
      this.fx.bossDeath(room, z, p);
      var bid = z.boss.id;
      if (bid === 'toxic') for (var k = 0; k < 6; k++) this.spawnZombie(home, 'poisonz', { dist: Math.max(0, z.dist - k * 12), hpMul: 1.5, rewMul: 0.5, route: z.route });
      if (bid === 'mutantboss' && !z.child) for (var m = 0; m < 2; m++) {
        var c = this.spawnZombie(home, 'boss', { boss: 'mutantboss', num: 0, dist: Math.max(0, z.dist - m * 20), route: z.route });
        c.hp = c.maxHp = z.maxHp * 0.3; c.size = 1.5; c.child = true; c.reward = Math.round(150 * G.scaling(this.map, this.diff, this.wave).reward); c.name = 'Mutant Spawn';
      }
    }
  };
  M.bloodBonus = function (room, z) {
    var best = null;
    room.towers.forEach(function (t) {
      if ((t.item.kind !== 'bloodbank' && t.item.kind !== 'midas') || Math.hypot(t.px - z.x, t.py - z.y) > t.item.range * T * (1 + G.TRACKS.rng.per * t.lvl.rng)) return;
      var b = t.item.bounty * (1 + G.TRACKS.inc.per * t.lvl.inc); if (!best || b > best.b) best = { b: b, t: t };
    });
    return best;
  };
  M.targetable = function (room, z, detect, groundOnly) {
    if (z.dead) return false;
    if (z.invis && !detect && z.revealUntil <= room.time && !(z.empUntil > room.time)) return false;
    if (groundOnly && z.fly) return false;
    return true;
  };
  M.findTarget = function (room, x, y, range, mode, detect, groundOnly) {
    var best = null, bv = -Infinity, self = this;
    this.eachNear(x, y, range, function (z) {
      if (!self.targetable(room, z, detect, groundOnly)) return;
      var d = Math.hypot(z.x - x, z.y - y);
      if (d > range) return;
      var rem = z.route.len - z.dist;
      var v = mode === 'last' ? rem : mode === 'strongest' ? z.hp - rem * 0.01 : mode === 'closest' ? -d : -rem;
      if (v > bv) { bv = v; best = z; }
    });
    return best;
  };
  M.inRadius = function (room, x, y, r, filter) {
    var out = [];
    this.eachNear(x, y, r, function (z) { if (Math.hypot(z.x - x, z.y - y) <= r + z.size * 6 && (!filter || filter(z))) out.push(z); });
    return out;
  };
  M.slow = function (room, z, amt, dur) {
    if (z.immuneSlow) return;
    if (z.slowUntil < room.time || amt >= z.slowAmt) { z.slowAmt = Math.max(amt, z.slowUntil > room.time ? z.slowAmt : 0); }
    z.slowUntil = Math.max(z.slowUntil, room.time + dur);
  };
  M.burn = function (room, z, dps, dur) {
    if (z.immuneBurn) return;
    if (!z.burn || z.burn.dps <= dps || z.burn.until < room.time) z.burn = { dps: dps, until: room.time + dur };
    else z.burn.until = Math.max(z.burn.until, room.time + dur);
  };

  // -------------------------------------------------------------------
  //  Door
  // -------------------------------------------------------------------
  M.hitDoor = function (room, amount, z) {
    var door = room.door, p = this.players[room.owner];
    if (!p || !p.alive) return;
    amount *= 1 - G.doorArmor(door.lvl);
    if (door.shieldUntil > room.time && door.shield > 0) {
      var ab = Math.min(door.shield, amount); door.shield -= ab; amount -= ab;
    }
    if (amount <= 0) return;
    door.hp -= amount; door.lastHit = room.time;
    p.stats.doorDamage += amount;
    if (room.partner >= 0) this.players[room.partner].stats.doorDamage += amount;
    this.fx.door(room, amount);
    if (door.hp <= 0) this.eliminate(p);
  };
  M.eliminate = function (p) {
    if (!p.alive) return;
    var room = this.roomOf(p), self = this;
    this.roomPlayers(room).forEach(function (q) { if (q !== p && q.alive) { q.alive = false; q.stats.waveReached = self.wave; q.vote = false; self.fx.eliminated(room, q); } });
    p.alive = false; p.stats.waveReached = this.wave; room.door.hp = 0; p.vote = false;
    this.fx.eliminated(room, p);
    room.zombies = []; room.queue = []; room.pending = []; room.vortices = []; room.fields = [];
  };

  // -------------------------------------------------------------------
  //  Buff recompute (support towers)
  // -------------------------------------------------------------------
  M.recomputeBuffs = function (room) {
    var self = this, buffers = room.towers.filter(function (t) { return t.item.kind === 'buff' || t.item.kind === 'revealer'; });
    var farmers = room.towers.filter(function (t) { return t.item.id === 'farmer'; });
    room.towers.forEach(function (t) {
      var b = { dmg: 1, spd: 1, rng: 1, detect: false, farm: 1 };
      buffers.forEach(function (s) {
        if (s === t) return;
        var st = self.stats(s, room);
        if (Math.hypot(s.px - t.px, s.py - t.py) > st.range + 1) return;
        var it = s.item, k = st.spc;
        if (it.buffDetect) b.detect = true;
        if (it.buffRange) b.rng = Math.max(b.rng, 1 + it.buffRange * k);
        if (it.buffSpd) b.spd = Math.max(b.spd, 1 + it.buffSpd * k);
        if (it.buffDmg) b.dmg = Math.max(b.dmg, 1 + it.buffDmg * k);
      });
      if (t.item.isFarm) farmers.forEach(function (f) {
        if (f === t) return;
        var r = f.item.range * (1 + G.TRACKS.rng.per * f.lvl.rng) * T;
        if (Math.hypot(f.px - t.px, f.py - t.py) <= r + 1) b.farm += f.item.farmBoost * (1 + 0.25 * f.lvl.spc);
      });
      t.buff = b;
    });
  };

  // -------------------------------------------------------------------
  //  Room update
  // -------------------------------------------------------------------
  M.updateRoom = function (room, dt) {
    var self = this, p = this.players[room.owner];
    if (!p || !p.alive) return;
    room.time = this.time;
    var now = room.time;
    // spawn
    while (room.queue.length && room.queue[0].at <= now) {
      var q = room.queue.shift();
      this.spawnZombie(room, q.type, q);
    }
    // buffs
    room.buffT -= dt;
    if (room.buffT <= 0) { this.recomputeBuffs(room); room.buffT = 0.5; }
    room.autoT = (room.autoT || 0) - dt;
    if (room.autoT <= 0) { room.autoT = 0.5; this.autoUpgrade(room); }
    // income
    room.incomeT -= dt;
    if (room.incomeT <= 0) { room.incomeT += G.INCOME_INTERVAL; this.payIncome(room, p); }
    // pending impacts
    for (var i = room.pending.length - 1; i >= 0; i--) {
      if (room.pending[i].at <= now) { var pe = room.pending.splice(i, 1)[0]; pe.fn(); }
    }
    // door poison
    var door = room.door;
    for (var j = door.poison.length - 1; j >= 0; j--) {
      var dp = door.poison[j];
      if (dp.until <= now) door.poison.splice(j, 1);
      else { this.hitDoor(room, dp.dps * dt); if (!p.alive) return; }
    }
    if (door.shieldUntil <= now) door.shield = 0;
    if (door.repairUntil > now) door.hp = Math.min(door.max, door.hp + door.repairRate * dt);
    for (var v = room.vortices.length - 1; v >= 0; v--) if (room.vortices[v].until <= now) room.vortices.splice(v, 1);
    var self = this;
    for (var fi = room.fields.length - 1; fi >= 0; fi--) {
      var fd = room.fields[fi];
      if (fd.until <= now) { room.fields.splice(fi, 1); continue; }
      this.inRadius(room, fd.x, fd.y, fd.r).forEach(function (z) { self.damage(room, z, fd.dps * dt, fd.src, { dot: true, pierce: true }); });
    }

    this.updateTraps(room, dt);
    this.updateZombies(room, dt);
    if (!p.alive) return;
    this.updateTowers(room, dt);
    // cleanup
    if (room.zombies.some(function (z) { return z.dead; })) room.zombies = room.zombies.filter(function (z) { return !z.dead; });
  };

  M.payIncome = function (room, p) {
    var self = this, total = 0, elapsedMin = this.time / 60;
    room.towers.forEach(function (t) {
      var it = t.item; if (!it.isFarm) return;
      var st = self.stats(t, room), inc = st.income * t.buff.farm, got = 0;
      switch (it.kind) {
        case 'farm':
          if (it.warmup && room.time - t.placedAt < it.warmup) { got = 0; break; }
          got = inc;
          var evg = self.evoOf(t);
          if (evg && evg.gem && self.rnd() < evg.gem.chance) { got += evg.gem.amount; self.fx.text(room, t.px, t.py - 30, '💎 +$' + evg.gem.amount, '#a8f0ff', true); }
          break;
        case 'crypto': got = inc * (self.rnd() * 2.2); break;
        case 'quantum': got = (inc + it.growth * elapsedMin * (1 + G.TRACKS.inc.per * t.lvl.inc)) * t.buff.farm; break;
        case 'bank': got = inc + Math.min(1000 * (1 + 0.2 * t.lvl.inc), p.cash * it.interest * (1 + 0.1 * t.lvl.inc)); break;
        case 'diamond':
          got = inc;
          if (self.rnd() < it.chance) { got += it.jackpot; self.fx.text(room, t.px, t.py - 30, '💎 DIAMOND! +$' + it.jackpot, '#a8f0ff', true); }
          break;
        case 'goldengod': case 'midas': got = inc; break;
        case 'harvest': got = (inc + it.growth * Math.max(0, self.wave - 1) * (1 + G.TRACKS.inc.per * t.lvl.inc)) * t.buff.farm; break;
        case 'jackpot':
          var r = self.rnd();
          got = r < 0.5 ? 0 : r < 0.85 ? inc : r < 0.98 ? inc * 2.5 : inc * 15;
          if (r >= 0.98) self.fx.text(room, t.px, t.py - 30, '🎰 JACKPOT! +$' + Math.round(got), '#ffd23f', true);
          t.fire = 0.6; break;
        case 'bloodbank': got = 0; break;
        case 'mine_farm': got = 0; break;
      }
      got = Math.round(got);
      if (got > 0) { t.earned += got; total += got; self.fx.cash(room, t.px, t.py - 10, got, true); var bp = self.players[t.by]; (bp || p).stats.moneyEarned += got; }
    });
    p.cash += total; p.incomeLast = total;
  };
  M.incomePer5 = function (room) {
    var self = this, total = 0, p = this.players[room.owner];
    room.towers.forEach(function (t) {
      var it = t.item; if (!it.isFarm) return;
      var st = self.stats(t, room), inc = st.income * t.buff.farm;
      if (it.kind === 'crypto') inc *= 1.1;
      if (it.kind === 'quantum') inc = (inc + it.growth * (self.time / 60) * (1 + G.TRACKS.inc.per * t.lvl.inc)) * t.buff.farm;
      if (it.kind === 'bank') inc += Math.min(1000 * (1 + 0.2 * t.lvl.inc), p.cash * it.interest * (1 + 0.1 * t.lvl.inc));
      if (it.kind === 'mine_farm') inc = inc * 5 / (it.every / (1 + G.TRACKS.spd.per * t.lvl.spd));
      if (it.kind === 'harvest') inc = (inc + it.growth * Math.max(0, self.wave - 1) * (1 + G.TRACKS.inc.per * t.lvl.inc)) * t.buff.farm;
      if (it.kind === 'jackpot') inc *= 0.975;
      if (it.warmup && room.time - t.placedAt < it.warmup) inc = 0;
      total += inc;
    });
    return Math.round(total);
  };

  M.updateTraps = function (room, dt) {
    var self = this, now = room.time;
    room.towers.forEach(function (t) {
      var it = t.item; if (it.place !== 'path') return;
      if (it.kind === 'slowtrap') {
        var amt = Math.min(0.8, it.slow * (1 + 0.15 * t.lvl.spc) * (1 + 0.04 * self.ownerStars(room, it)));
        self.eachNear(t.px, t.py, 0.7 * T, function (z) { if (!z.fly && Math.hypot(z.x - t.px, z.y - t.py) < 0.7 * T) z.trapSlowNext = Math.max(z.trapSlowNext || 0, amt); });
      } else if (it.kind === 'spike') {
        t.cd -= dt;
        if (t.cd <= 0) {
          var st = self.stats(t, room), hit = false;
          self.inRadius(room, t.px, t.py, 0.55 * T, function (z) { return !z.fly; }).forEach(function (z) { self.damage(room, z, st.dmg, t, { pierce: true, aoe: true }); hit = true; });
          t.cd = hit ? st.cd : 0.05; if (hit) t.fire = 0.2;
        }
      } else if (it.kind === 'mine') {
        if (!t.data.armed) { if (now >= t.data.rearmAt) t.data.armed = true; return; }
        if (self.inRadius(room, t.px, t.py, 0.4 * T, function (z) { return !z.fly; }).length) {
          var st2 = self.stats(t, room), r = it.splash * T * (1 + 0.15 * t.lvl.spc);
          self.inRadius(room, t.px, t.py, r, function (z) { return !z.fly; }).forEach(function (z) { self.damage(room, z, st2.dmg, t, { aoe: true }); });
          t.data.armed = false; t.data.rearmAt = now + it.rearm / (1 + G.TRACKS.spd.per * t.lvl.spd);
          self.fx.explosion(room, t.px, t.py, r, '#ffae42');
        }
      } else if (it.kind === 'wall') {
        if (t.hp <= 0 && now >= t.downUntil) { t.maxHp = self.wallHp(t, room); t.hp = t.maxHp; self.fx.text(room, t.px, t.py - 20, 'Herbouwd', '#9f9'); }
      }
    });
  };
  M.updateZombies = function (room, dt) {
    var self = this, now = room.time;
    var timeSlow = room.timeSlowUntil > now ? room.timeSlowAmt : 0;
    for (var i = 0; i < room.zombies.length; i++) {
      var z = room.zombies[i];
      if (z.dead) continue;
      var len = z.route.len;
      z.trapSlow = z.trapSlowNext || 0; z.trapSlowNext = 0;
      var dotRoom = z.lastBy != null ? self.rooms[z.lastBy] : room;
      z.flash = Math.max(0, z.flash - dt);
      // DoTs
      if (z.burn && z.burn.until > now) self.damage(dotRoom, z, z.burn.dps * dt, null, { dot: true, pierce: true });
      if (z.dead) continue;
      if (z.poison.length) {
        var pd = 0; z.poison = z.poison.filter(function (s) { return s.until > now; });
        z.poison.forEach(function (s) { pd += s.dps; });
        if (pd) self.damage(dotRoom, z, pd * dt, null, { dot: true, pierce: true });
        if (z.dead) continue;
      }
      var empd = z.empUntil > now;
      if (z.regen && !empd) z.hp = Math.min(z.maxHp, z.hp + z.maxHp * z.regen * dt);
      if (z.healer && !empd) {
        z.healT -= dt;
        if (z.healT <= 0) {
          z.healT = 2;
          self.inRadius(room, z.x, z.y, 1.8 * T).forEach(function (o) { if (o !== z) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o.isBoss ? 0.015 : 0.05)); });
          self.fx.heal(room, z);
        }
      }
      if (z.isBoss && !empd) { self.bossAbility(room, z, dt); if (z.dead) continue; }
      if (z.stunUntil > now) continue;
      // speed
      var sp = z.speed;
      if (!z.immuneSlow) {
        var s1 = z.slowUntil > now ? z.slowAmt : 0;
        sp *= (1 - s1) * (1 - z.trapSlow) * (1 - timeSlow * (z.isBoss ? 0.5 : 1));
      }
      // vortex pull (2D): held in place and dragged towards the centre
      var held = false, pulled = false;
      var vxs = self.allVortices || [];
      for (var v = 0; v < vxs.length; v++) {
        var vx = vxs[v], ddx = vx.x - z.x, ddy = vx.y - z.y, dd = Math.hypot(ddx, ddy);
        if (dd < vx.r) {
          if (vx.dps) self.damage(self.rooms[vx.room], z, vx.dps * dt, vx.src, { dot: true });
          var pull = (z.isBoss || z.heavy) ? 0.25 : z.fly ? 0.4 : 1, step = Math.min(dd, 3 * T * dt * pull);
          if (dd > 1) { z.ox += ddx / dd * step; z.oy += ddy / dd * step; }
          pulled = true;
          if (vx.soft) sp *= 0.6; else if (!z.isBoss && !z.heavy) held = true; else sp *= 0.5;
        }
      }
      if (!pulled && (z.ox || z.oy)) { var dk = Math.min(1, dt * 2.5); z.ox -= z.ox * dk; z.oy -= z.oy * dk; if (Math.abs(z.ox) + Math.abs(z.oy) < 0.5) z.ox = z.oy = 0; }
      if (held) sp = 0;
      var nd = z.dist + sp * dt;
      z.attackingWall = null;
      if (!z.fly && sp > 0) {
        var ahead = G.routePos(z.route, nd + 10);
        var aw = self.allWalls || [];
        for (var w = 0; w < aw.length; w++) {
          var wall = aw[w]; if (wall.hp <= 0) continue;
          if (Math.hypot(ahead.x - wall.px, ahead.y - wall.py) < 0.72 * T && Math.hypot(z.x - wall.px, z.y - wall.py) < 1.2 * T) { nd = z.dist; z.attackingWall = wall; break; }
        }
      }
      if (nd >= len) { nd = len; z.atDoor = true; } else z.atDoor = false;
      z.moving = nd > z.dist + 0.01;
      z.dist = nd;
      z.walk += dt * (z.moving ? sp / T * 6 : 0);
      self.placeZombie(room, z);
      // attack
      if (z.atDoor || z.attackingWall) {
        z.atk -= dt;
        z.revealUntil = now + 0.5;
        if (z.atk <= 0) {
          z.atk = 1; z.swing = 0.25;
          if (now - z.spawnT > 60) z.dmg *= 1.03; // anti-stall: lingering zombies get angrier
          if (z.attackingWall) {
            var wd = z.dmg * (z.boss && z.boss.id === 'butcher' ? 5 : 1);
            z.attackingWall.hp -= wd;
            if (z.attackingWall.item.thorns) self.damage(self.rooms[z.attackingWall.roomIdx != null ? z.attackingWall.roomIdx : room.index], z, z.attackingWall.item.thorns * (1 + 0.4 * z.attackingWall.lvl.spc) * (1 + 0.1 * self.wave), z.attackingWall, { pierce: true, aoe: true });
            if (z.attackingWall.hp <= 0) { z.attackingWall.downUntil = now + z.attackingWall.item.rebuild; self.fx.wallBreak(room, z.attackingWall); }
          } else if (z.def && z.def.explode) {
            self.hitDoor(room, z.dmg * z.def.explode, z);
            self.fx.explosion(room, z.x, z.y, 1.4 * T, '#ff7b00');
            self.kill(room, z, null, true);
          } else if (z.dmg > 0) {
            self.hitDoor(room, z.dmg, z);
            if (z.def && z.def.doorPoison) room.door.poison.push({ dps: z.dmg * 0.4, until: now + 4 });
          }
          if (!self.players[room.owner].alive) return;
        }
      }
      if (z.swing) z.swing = Math.max(0, z.swing - dt);
    }
  };

  // -------------------------------------------------------------------
  //  Boss abilities
  // -------------------------------------------------------------------
  M.bossAbility = function (room, z, dt) {
    var self = this, ab = z.ab, id = z.boss.id, now = room.time;
    ab.t1 -= dt; ab.t2 -= dt;
    var self2 = this;
    function towersNear(r) { return self2.towersNear(z.x, z.y, r * T); }
    switch (id) {
      case 'king':
        if (ab.t1 <= 0) { ab.t1 = 8; for (var i = 0; i < 3; i++) this.spawnZombie(room, 'normal', { dist: Math.max(0, z.dist - 8 - i * 6), hpMul: 1.5, rewMul: 0.5, route: z.route }); this.fx.bossCast(room, z, 'Roept zijn leger op!'); }
        if (!ab.enraged && z.hp < z.maxHp * 0.5) { ab.enraged = true; z.speed = z.baseSpeed * 1.6; this.fx.bossCast(room, z, 'ENRAGED!'); }
        break;
      case 'butcher':
        if (ab.t1 <= 0) { ab.t1 = 9; ab.charge = now + 1.0; this.fx.bossCast(room, z, 'CHARGE!'); }
        z.speed = ab.charge > now ? z.baseSpeed * 4 : z.baseSpeed;
        break;
      case 'riot':
        if (ab.t1 <= 0) { ab.t1 = 9; z.immuneUntil = now + 2.5; this.fx.bossCast(room, z, 'Riot Shield!'); }
        this.inRadius(room, z.x, z.y, 2 * T).forEach(function (o) { if (o !== z && !o.riotBuff) { o.riotBuff = true; o.armor += 5; } });
        break;
      case 'cyber':
        if (ab.t1 <= 0) { ab.t1 = 10; towersNear(3).forEach(function (t) { t.stunUntil = Math.max(t.stunUntil, now + 3); }); this.fx.emp(room, z, 3 * T); this.fx.bossCast(room, z, 'EMP!'); }
        break;
      case 'titan':
        if (ab.t1 <= 0) { ab.t1 = 9; towersNear(2.5).forEach(function (t) { t.stunUntil = Math.max(t.stunUntil, now + 2.5); self.fx.freeze(room, t); }); this.fx.nova(room, z, 2.5 * T, '#bff'); this.fx.bossCast(room, z, 'Frost Nova!'); }
        break;
      case 'reaper':
        if (ab.t1 <= 0) { ab.t1 = 8; z.invis = true; ab.visAt = now + 3; this.fx.bossCast(room, z, 'Verdwijnt in de schaduw...'); }
        if (z.invis && ab.visAt <= now) z.invis = false;
        if (ab.t2 <= 0) { ab.t2 = 7; z.dist = Math.min(z.route.len - T, z.dist + 2.5 * T); this.fx.nova(room, z, T, '#636'); }
        break;
      case 'wyrm':
        if (ab.t1 <= 0) { ab.t1 = 8; for (var w = 0; w < 3; w++) this.spawnZombie(room, 'snowmutant', { dist: Math.max(0, z.dist - w * 10), hpMul: 1.5, rewMul: 0.5, route: z.route }); this.fx.bossCast(room, z, 'Blizzard!'); }
        break;
      case 'mutantboss':
        z.hp = Math.min(z.maxHp, z.hp + z.maxHp * 0.012 * dt);
        break;
      case 'lava':
        if (ab.t1 <= 0) { ab.t1 = 10; for (var l = 0; l < 3; l++) this.spawnZombie(room, 'firemonster', { dist: Math.max(0, z.dist - l * 12), hpMul: 1.5, rewMul: 0.5, route: z.route }); this.fx.nova(room, z, 2 * T, '#f60'); this.fx.bossCast(room, z, 'Eruptie!'); }
        break;
      case 'toxic':
        towersNear(2.5).forEach(function (t) { t.cd += dt * 0.4; });
        this.inRadius(room, z.x, z.y, 2 * T).forEach(function (o) { if (o !== z) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.03 * dt); });
        break;
      case 'voidm':
        if (ab.t1 <= 0) { ab.t1 = 10; z.immuneUntil = now + 2; z.hp = Math.min(z.maxHp, z.hp + z.maxHp * 0.06); this.fx.nova(room, z, 1.5 * T, '#a0f'); this.fx.bossCast(room, z, 'Void Phase!'); }
        break;
      case 'final':
        if (ab.phase === 1 && z.hp < z.maxHp * 0.66) {
          ab.phase = 2; z.speed = z.baseSpeed * 1.3;
          for (var f = 0; f < 6; f++) this.spawnZombie(room, 'labmutant', { dist: Math.max(0, z.dist - f * 10), hpMul: 1.5, rewMul: 0.5, route: z.route });
          this.fx.bossCast(room, z, 'FASE 2: Mutatie!');
        }
        if (ab.phase === 2 && z.hp < z.maxHp * 0.33) {
          ab.phase = 3; z.armor += 20; z.regen = 0.01;
          towersNear(4).forEach(function (t) { t.stunUntil = Math.max(t.stunUntil, now + 4); });
          this.fx.emp(room, z, 4 * T); this.fx.bossCast(room, z, 'FASE 3: Overload!');
        }
        break;
    }
  };

  // -------------------------------------------------------------------
  //  Tower update
  // -------------------------------------------------------------------
  M.updateTowers = function (room, dt) {
    var self = this, now = room.time, door = room.door;
    for (var i = 0; i < room.towers.length; i++) {
      var t = room.towers[i], it = t.item;
      if (it.place === 'path' || it.isFarm && it.kind !== 'goldengod' && it.kind !== 'mine_farm' && it.kind !== 'midas') continue;
      t.fire = Math.max(0, t.fire - dt);
      if (t.stunUntil > now) continue;
      var st = this.stats(t, room);
      t.cd -= dt;
      switch (it.kind) {
        case 'mine_farm':
          t.data.mineT -= dt * (1 + G.TRACKS.spd.per * t.lvl.spd);
          if (t.data.mineT <= 0) {
            t.data.mineT = it.every;
            var g = Math.round(st.income * t.buff.farm), pl = this.players[room.owner];
            pl.cash += g; pl.stats.moneyEarned += g; t.earned += g; t.fire = 0.5;
            this.fx.cash(room, t.px, t.py - 14, g, true);
          }
          break;
        case 'midas':   // golden touch: turns a zombie into gold
          t.data.touchT = (t.data.touchT == null ? it.touchEvery : t.data.touchT) - dt * st.spc;
          if (t.data.touchT <= 0) {
            var rM = it.range * T * (1 + G.TRACKS.rng.per * t.lvl.rng), gz = this.inRadius(room, t.px, t.py, rM, function (z) { return !z.isBoss; }).sort(function (a, b) { return b.hp - a.hp; })[0];
            t.data.touchT = gz ? it.touchEvery : 1;
            if (gz) { gz.reward *= 5; this.fx.text(room, gz.x, gz.y - 26, '✨ GOUD!', '#ffd23f', true); this.fx.nova(room, gz, 1.2 * T, '#ffd23f'); this.kill(room, gz, t); t.fire = 0.6; }
          }
          break;
        case 'singularity':
          if (t.cd <= 0) {
            var sf = this.findTarget(room, t.px, t.py, st.range, 'strongest', true, false);
            if (sf) {
              t.cd = st.cd;
              var sR = it.radius * T * (1 + 0.08 * t.lvl.spc), sHold = it.hold, sx0 = sf.x, sy0 = sf.y;
              room.vortices.push({ room: room.index, x: sx0, y: sy0, r: sR, until: now + sHold, dps: st.dmg, src: t, start: now, big: true });
              t.fire = 0.8; t.angle = Math.atan2(sy0 - t.py, sx0 - t.px);
              this.fx.vortex(room, sx0, sy0);
              (function (x0, y0, d0, R0) {
                room.pending.push({ at: now + sHold, fn: function () {
                  self.inRadius(room, x0, y0, R0 * 1.3).forEach(function (z) { self.damage(room, z, d0, t, { aoe: true, pierce: true, color: '#e0b0ff' }); });
                  self.fx.explosion(room, x0, y0, R0 * 1.3, '#d9a0ff', true); self.fx.text(room, x0, y0 - 30, 'SUPERNOVA', '#f0d0ff', true);
                } });
              })(sx0, sy0, st.dmg * it.burst * st.spc, sR);
            } else t.cd = 0.3;
          }
          break;
        case 'goldengod':
          if (t.cd <= 0) { t.cd = it.cd / st.spc; room.blessUntil = now + it.blessDur * st.spc; t.fire = 0.6; this.fx.bless(room, t); }
          break;
        case 'medic':
          var heal = door.max * it.heal * st.spc * (1 + 0.05 * this.ownerStars(room, it)) * dt;
          if (door.hp < door.max) { door.hp = Math.min(door.max, door.hp + heal); t.fire = 0.2; }
          break;
        case 'shield':
          if (t.cd <= 0) {
            t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
            door.shield = Math.max(door.shield, door.max * it.shield * st.spc); door.shieldUntil = now + it.shieldDur;
            t.fire = 0.6; this.fx.shield(room, t);
          }
          break;
        case 'timeslow':
          if (t.cd <= 0 && room.zombies.length) {
            t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
            room.timeSlowUntil = now + it.slowDur * st.spc; room.timeSlowAmt = it.slow;
            t.fire = 0.8; this.fx.timeslow(room, t);
          }
          break;
        case 'buff': break;
        case 'aura':
          t.data.tick = (t.data.tick || 0) - dt;
          if (t.data.tick <= 0) {
            t.data.tick = 0.25;
            var vic = this.inRadius(room, t.px, t.py, st.range);
            vic.forEach(function (z) { z.markUntil = now + 0.6; z.markAmt = Math.max(z.markAmt, it.mark * st.spc); self.damage(room, z, st.dmg * 0.25, t, { dot: true, showDot: true, color: '#c58bff' }); });
            if (vic.length) t.fire = 0.25;
          }
          break;
        case 'meteor':
          if (t.cd <= 0 && room.zombies.length) {
            t.cd = st.cd;
            var best = null, bc = -1, R = it.radius * T * st.spc;
            room.zombies.forEach(function (z) {
              if (z.dead) return; var c = 0;
              room.zombies.forEach(function (o) { if (!o.dead && Math.hypot(o.x - z.x, o.y - z.y) < R) c += 1 + o.hp / o.maxHp; });
              if (c > bc) { bc = c; best = z; }
            });
            if (best) {
              var mx = best.x, my = best.y, lead = best;
              t.fire = 0.6;
              this.fx.meteor(room, mx, my, 0.8);
              (function (tw, x0, y0, st0, R0, ld) {
                room.pending.push({ at: now + 0.8, fn: function () {
                  var x = ld.dead ? x0 : ld.x, y = ld.dead ? y0 : ld.y;
                  self.inRadius(room, x, y, R0).forEach(function (z) { self.damage(room, z, st0.dmg, tw, { aoe: true }); self.burn(room, z, it.burn * st0.spc, it.burnDur); });
                  self.fx.explosion(room, x, y, R0, '#ff6a00', true);
                } });
              })(t, mx, my, st, R, lead);
            }
          }
          break;
        case 'blackhole':
          if (t.cd <= 0) {
            var front = this.findTarget(room, t.px, t.py, st.range, 'first', true, false);
            if (front) {
              t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
              var ahead2 = G.routePos(front.route, Math.min(front.route.len - T, front.dist + 0.6 * T));
              var tmp = { x: ahead2.x, y: ahead2.y };
              room.vortices.push({ room: room.index, x: tmp.x, y: tmp.y, r: it.radius * T * (1 + 0.1 * t.lvl.spc), until: now + it.hold * (1 + 0.1 * t.lvl.spc), dps: st.dmg, src: t, start: now });
              t.fire = 0.6; t.angle = Math.atan2(tmp.y - t.py, tmp.x - t.px);
              this.fx.vortex(room, tmp.x, tmp.y);
            }
          }
          break;
        case 'revealer':
          t.data.tick = (t.data.tick || 0) - dt;
          if (t.data.tick <= 0) { t.data.tick = 0.25; this.eachNear(t.px, t.py, st.range, function (z) { if (Math.hypot(z.x - t.px, z.y - t.py) <= st.range) z.revealUntil = Math.max(z.revealUntil, now + 0.5); }); }
          break;
        case 'overload':
          if (t.cd <= 0) {
            var first = this.findTarget(room, t.px, t.py, st.range, 'first', false, false);
            if (first) {
              t.cd = st.cd;
              var hitO = [first], ptsO = [{ x: t.px, y: t.py - 22 }, { x: first.x, y: first.y }], curO = first, jumpO = it.jump * T * (1 + 0.1 * t.lvl.spc);
              this.damage(room, first, st.dmg, t, { color: '#bfe8ff' });
              for (var oi = 0; oi < 40; oi++) {
                var nb = null, bd = jumpO;
                this.eachNear(curO.x, curO.y, jumpO, function (z) { if (hitO.indexOf(z) >= 0) return; var dd = Math.hypot(z.x - curO.x, z.y - curO.y); if (dd < bd) { bd = dd; nb = z; } });
                if (!nb) break;
                hitO.push(nb); ptsO.push({ x: nb.x, y: nb.y }); curO = nb; this.damage(room, nb, st.dmg, t, { color: '#bfe8ff' });
              }
              t.fire = 0.5; this.fx.chain(room, ptsO, '#bfe8ff');
            } else t.cd = 0.1;
          }
          break;
        case 'sonic':
          if (t.cd <= 0) {
            var sv = this.inRadius(room, t.px, t.py, st.range);
            if (sv.length) {
              t.cd = st.cd;
              sv.forEach(function (z) { self.damage(room, z, st.dmg, t, { aoe: true }); self.slow(room, z, Math.min(0.8, it.slow * st.spc), it.slowDur); if (z.healer) z.healT = 2; });
              t.fire = 0.4; this.fx.nova(room, { x: t.px, y: t.py - 6 }, st.range, '#c9b8ff');
            } else t.cd = 0.1;
          }
          break;
        case 'repairbot':
          if (t.cd <= 0) {
            t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
            var fixed = false;
            if (door.hp < door.max) { door.hp = Math.min(door.max, door.hp + door.max * it.heal * st.spc); fixed = true; }
            room.walls.forEach(function (w) { if (w.hp > 0 && w.hp < w.maxHp) { w.hp = Math.min(w.maxHp, w.hp + w.maxHp * 0.5); fixed = true; } });
            if (fixed) { t.fire = 0.6; this.fx.repair(room, t); }
          }
          break;
        case 'gravity':
          if (t.cd <= 0) {
            var gv = this.inRadius(room, t.px, t.py, st.range);
            if (gv.length >= 2) {
              t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
              var cx = 0, cy = 0; gv.forEach(function (z) { cx += z.x; cy += z.y; }); cx /= gv.length; cy /= gv.length;
              room.vortices.push({ room: room.index, soft: true, x: cx, y: cy, r: st.range * 0.9 * (1 + 0.1 * t.lvl.spc), until: now + 1.4, dps: st.dmg, src: t, start: now });
              t.fire = 0.6; this.fx.vortex(room, cx, cy);
            } else t.cd = 0.2;
          }
          break;
        case 'orbital':
          if (t.cd <= 0) {
            var cand = room.zombies.filter(function (z) { return !z.dead; });
            this.eachNear(t.px, t.py, 12 * T, function (z) { if (cand.indexOf(z) < 0) cand.push(z); });
            var big = null; cand.forEach(function (z) { if (!big || z.hp > big.hp) big = z; });
            if (big) {
              t.cd = st.cd; t.fire = 0.8;
              var Ro = it.radius * T * st.spc;
              this.fx.orbital(room, big.x, big.y, 1);
              (function (z0, st0) {
                room.pending.push({ at: now + 1, fn: function () {
                  self.inRadius(room, z0.x, z0.y, Ro).forEach(function (z) { self.damage(room, z, z === z0 ? st0.dmg : st0.dmg * 0.3, t, { aoe: true, color: '#9ef' }); });
                  self.fx.beam(room, z0.x, z0.y - 600, z0.x, z0.y, '#bff4ff', 14); self.fx.explosion(room, z0.x, z0.y, Ro, '#bff4ff', true);
                } });
              })(big, st);
            } else t.cd = 0.3;
          }
          break;
        case 'timetower':
          this.eachNear(t.px, t.py, st.range, function (z) { if (Math.hypot(z.x - t.px, z.y - t.py) <= st.range) z.trapSlowNext = Math.max(z.trapSlowNext || 0, 0.25); });
          if (t.cd <= 0) {
            t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
            room.towers.forEach(function (o) { if (o !== t && Math.hypot(o.px - t.px, o.py - t.py) <= st.range + 1) o.hasteUntil = now + 3 * st.spc; });
            t.fire = 0.8; this.fx.nova(room, { x: t.px, y: t.py }, st.range, '#ffe9a8');
          }
          break;
        case 'emp':
          if (t.cd <= 0) {
            var ev2 = this.inRadius(room, t.px, t.py, st.range);
            if (ev2.length) {
              t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
              ev2.forEach(function (z) { z.empUntil = now + 4 * st.spc; });
              t.fire = 0.6; this.fx.emp(room, { x: t.px, y: t.py }, st.range);
            } else t.cd = 0.2;
          }
          break;
        case 'kamikaze':
          var kz = t.data.kz || (t.data.kz = []), maxK = it.drones + G.spcSteps(it, t.ul);
          if (t.cd <= 0 && kz.length < maxK) { t.cd = st.cd; kz.push({ x: t.px, y: t.py - 12, tgt: null }); t.fire = 0.3; }
          for (var ki = kz.length - 1; ki >= 0; ki--) {
            var kd = kz[ki];
            if (!kd.tgt || kd.tgt.dead) kd.tgt = this.findTarget(room, t.px, t.py, st.range, 'strongest', true, false);
            var hx = kd.tgt ? kd.tgt.x : t.px + Math.cos(now * 2 + ki * 2) * 24, hy = kd.tgt ? kd.tgt.y - 6 : t.py - 20 + Math.sin(now * 2 + ki * 2) * 10;
            var kdx = hx - kd.x, kdy = hy - kd.y, kl = Math.hypot(kdx, kdy), ks = 5 * T * dt;
            if (kl > 1) { kd.x += kdx / kl * Math.min(ks, kl); kd.y += kdy / kl * Math.min(ks, kl); }
            if (kd.tgt && kl < 12) {
              var Rk = it.splash * T * (1 + 0.15 * t.lvl.spc);
              this.inRadius(room, kd.x, kd.y, Rk).forEach(function (z) { self.damage(room, z, st.dmg, t, { aoe: true }); });
              this.fx.explosion(room, kd.x, kd.y, Rk, '#ffae42'); kz.splice(ki, 1);
            }
          }
          break;
        case 'nuke':
          t.data.charge = Math.max(0, Math.min(1, 1 - t.cd / st.cd));
          if (t.cd <= 0) {
            var Rn = it.radius * T * (1 + 0.1 * t.lvl.spc), pool = this.inRadius(room, t.px, t.py, st.range);
            if (pool.length) {
              var bestN = null, bcN = -1;
              pool.forEach(function (z) { var c = 0; pool.forEach(function (o) { if (Math.hypot(o.x - z.x, o.y - z.y) < Rn) c += 1 + o.hp / o.maxHp; }); if (c > bcN) { bcN = c; bestN = z; } });
              t.cd = st.cd; t.fire = 1;
              this.fx.shot(room, t, bestN.x, bestN.y, 'nuke', 1.2);
              (function (x0, y0, st0) {
                room.pending.push({ at: now + 1.2, fn: function () {
                  self.inRadius(room, x0, y0, Rn).forEach(function (z) { self.damage(room, z, st0.dmg, t, { aoe: true }); });
                  room.fields.push({ x: x0, y: y0, r: Rn * 0.8, until: room.time + 5, dps: st0.dmg * 0.08, src: t, col: '#9dff5a' });
                  self.fx.explosion(room, x0, y0, Rn, '#d7ff5a', true); self.fx.nuke(room, x0, y0, Rn);
                } });
              })(bestN.x, bestN.y, st);
            } else t.cd = 0.3;
          }
          break;
        case 'portal':
          if (t.cd <= 0) {
            var pv = this.inRadius(room, t.px, t.py, st.range, function (z) { return !z.isBoss; }).sort(function (a, b) { return self.remaining(a) - self.remaining(b); }).slice(0, Math.round(it.count * st.spc));
            if (pv.length) {
              t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
              pv.forEach(function (z) { var x0 = z.x, y0 = z.y; z.dist = Math.max(0, z.dist - it.back * z.route.len); z.ox = z.oy = 0; self.placeZombie(room, z); self.fx.portal(room, x0, y0, z.x, z.y); });
              t.fire = 0.6;
            } else t.cd = 0.2;
          }
          break;
        case 'dimension':
          if (t.cd <= 0) {
            var dv = this.findTargets(room, t.px, t.py, st.range, 'strongest', true, false, Math.round(it.links * st.spc));
            if (dv.length >= 2) {
              t.cd = st.cd;
              var link = { share: it.share, until: now + 6, members: dv, src: t };
              dv.forEach(function (z) { z.link = link; self.damage(room, z, st.dmg, t, { color: '#e08bff' }); });
              t.fire = 0.6; this.fx.rift(room, dv.map(function (z) { return { x: z.x, y: z.y }; }));
            } else t.cd = 0.2;
          }
          break;
        case 'storm':
          if (t.cd <= 0 && !(t.data.stormUntil > now)) {
            if (this.findTarget(room, t.px, t.py, st.range, 'first', true, false)) { var sdur = 6 + G.spcSteps(it, t.ul); t.data.stormUntil = now + sdur; t.data.bolt = 0; t.cd = st.cd + sdur; t.fire = 1; }
            else t.cd = 0.3;
          }
          if (t.data.stormUntil > now) {
            t.data.bolt -= dt;
            if (t.data.bolt <= 0) {
              t.data.bolt = 0.35;
              var sz = this.inRadius(room, t.px, t.py, st.range);
              if (sz.length) { var vz = sz[(this.rnd() * sz.length) | 0]; this.inRadius(room, vz.x, vz.y, 0.8 * T * st.spc).forEach(function (z) { self.damage(room, z, st.dmg, t, { aoe: true, color: '#e8f4ff' }); }); this.fx.bolt(room, vz.x, vz.y); }
            }
          }
          break;
        case 'worldender':
          t.data.charge = Math.max(0, Math.min(1, 1 - t.cd / (it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd))));
          if (t.cd <= 0) {
            var wv = this.inRadius(room, t.px, t.py, st.range);
            if (wv.length >= 3 || wv.some(function (z) { return z.isBoss; })) {
              t.cd = it.cd / (1 + G.TRACKS.spd.per * t.lvl.spd);
              wv.forEach(function (z) { self.damage(room, z, z.isBoss ? z.maxHp * 0.25 * st.spc : z.hp + 10, t, { pierce: true, aoe: true, color: '#ff5050' }); });
              t.fire = 1.5; this.fx.worldEnd(room, t, st.range);
            } else t.cd = 0.3;
          }
          break;
        case 'drones':
          this.updateDrones(room, t, st, dt);
          break;
        default:
          this.towerAttack(room, t, st, dt);
      }
    }
  };

  M.updateDrones = function (room, t, st, dt) {
    var it = t.item, n = it.drones + G.spcSteps(it, t.ul), ds = t.data.drones, self = this;
    while (ds.length < n) ds.push({ x: t.px, y: t.py - 10, cd: Math.random() * 0.5, ang: Math.random() * 6, tgt: null });
    var cands = this.inRadius(room, t.px, t.py, st.range, function (z) { return self.targetable(room, z, true, false); })
      .sort(function (a, b) { return self.remaining(a) - self.remaining(b); });
    ds.forEach(function (d, i) {
      d.ang += dt * 2;
      var z = cands.length ? cands[i % cands.length] : null;
      var hx, hy;
      if (z) { hx = z.x + Math.cos(d.ang + i) * 30; hy = z.y + Math.sin(d.ang + i) * 30 - 20; }
      else { hx = t.px + Math.cos(d.ang + i * 2) * 26; hy = t.py - 14 + Math.sin(d.ang + i * 2) * 14; }
      var dx = hx - d.x, dy = hy - d.y, l = Math.hypot(dx, dy);
      var sp = 4 * T * dt; if (l > 1) { d.x += dx / l * Math.min(sp, l); d.y += dy / l * Math.min(sp, l); }
      d.cd -= dt;
      if (z && d.cd <= 0 && Math.hypot(z.x - d.x, z.y - d.y) < it.droneRange * T) {
        d.cd = st.cd;
        self.damage(room, z, st.dmg, t, {});
        self.fx.shot(room, { px: d.x, py: d.y, item: it, drone: true }, z.x, z.y, 'drone');
      }
    });
  };

  M.towerAttack = function (room, t, st, dt) {
    var self = this, it = t.item, now = room.time, kind = it.kind;
    var mode = t.target;
    // creator mode cycling + ultimate
    if (kind === 'creator') {
      t.data.modeT -= dt; if (t.data.modeT <= 0) { t.data.modeT = 4; t.data.mode = (t.data.mode + 1) % 4; }
      t.data.ultT -= dt;
      if (t.data.ultT <= 0 && room.zombies.length) {
        t.data.ultT = st.ultCd;
        room.zombies.slice().forEach(function (z) {
          var dmg = it.ultDmg * (1 + G.TRACKS.dmg.per * t.lvl.dmg) * (1 + 0.05 * self.ownerStars(room, it)) + (z.isBoss ? 0 : z.maxHp * 0.1);
          self.damage(room, z, dmg, t, { aoe: true, pierce: true }); z.stunUntil = Math.max(z.stunUntil, now + 1.5);
        });
        this.fx.genesis(room, t);
      }
    }
    if (kind === 'reality') {
      t.data.rewriteT -= dt;
      if (t.data.rewriteT <= 0) {
        var vic = this.inRadius(room, t.px, t.py, st.range).sort(function (a, b) { return self.remaining(a) - self.remaining(b); }).slice(0, Math.round(8 * st.spc));
        if (vic.length) {
          t.data.rewriteT = it.rewrite;
          vic.forEach(function (z) {
            if (!z.isBoss && self.rnd() < 0.12) {
              z.type = 'golden'; z.def = G.ZOMBIES.golden; z.color = z.def.color; z.dmg = 0; z.reward *= 5; z.speed = z.baseSpeed = 0.6 * T;
              z.healer = false; z.regen = 0; z.blocks = 0; z.split = 0; z.armor = 0; z.fly = false; z.invis = false;
              self.fx.text(room, z.x, z.y - 24, 'GOLD!', '#ffd700');
            } else {
              z.armor = 0; z.invis = false; z.regen = 0; z.healer = false; z.blocks = 0;
              if (z.fly && !z.isBoss) z.fly = false;
              z.weakUntil = now + 6; self.slow(room, z, 0.5, 6);
            }
          });
          this.fx.rewrite(room, t, vic);
          t.fire = 0.5;
        }
      }
    }
    if (t.cd > 0) {
      if (kind === 'flame' || kind === 'beam' || kind === 'dragon' || kind === 'spray') { var tg0 = this.findTarget(room, t.px, t.py, st.range, mode, st.detect, it.groundOnly); if (tg0) t.angle = Math.atan2(tg0.y - t.py, tg0.x - t.px); }
      return;
    }
    var ev = this.evoOf(t) || {};
    var minR = it.minRange ? it.minRange * T : 0;
    var tgt = minR ? this.findTargets(room, t.px, t.py, st.range, mode, st.detect, it.groundOnly, 1, minR)[0] : this.findTarget(room, t.px, t.py, st.range, mode, st.detect, it.groundOnly && !ev.hitAir);
    if (!tgt) { t.cd = 0.05; if (kind === 'minigun') t.data.spin = Math.max(0, (t.data.spin || 0) - dt * 2); return; }
    t.cd = st.cd;
    t.angle = Math.atan2(tgt.y - t.py, tgt.x - t.px);
    t.fire = 0.12;
    var dmg = st.dmg;
    var reveal = function (z) { if (it.reveal) z.revealUntil = Math.max(z.revealUntil, now + it.reveal * st.spc); };
    var hitOpts = function (o) { o = o || {}; if (ev.pierceArmor) o.ap = ev.pierceArmor; return o; };
    var critDmg = function () { return ev.crit && self.rnd() < ev.crit.chance ? dmg * ev.crit.mult : dmg; };
    var afterHit = function (z, base) {
      if (ev.freeze && !z.isBoss && self.rnd() < ev.freeze.chance) z.stunUntil = Math.max(z.stunUntil, now + ev.freeze.dur);
      if (ev.splashHit) self.inRadius(room, z.x, z.y, ev.splashHit * T, function (o) { return o !== z; }).forEach(function (o) { self.damage(room, o, base * 0.5, t, { aoe: true }); });
      if (ev.knock && !z.isBoss && !z.heavy) z.dist = Math.max(0, z.dist - ev.knock * T);
    };
    switch (kind) {
      case 'bullet': case 'hitscan': case 'soul': case 'lastdef':
        if (ev.pierce) { this.lineHit(room, t, st.range, critDmg(), '#fff7c0', 3); break; }
        var targets = ev.multi ? this.findTargets(room, t.px, t.py, st.range, mode, st.detect, it.groundOnly, ev.multi) : [tgt];
        targets.forEach(function (z) {
          var d = critDmg();
          for (var sh = 0; sh < (it.shots || 1); sh++) { self.damage(room, z, d, t, hitOpts({})); self.fx.shot(room, t, z.x + (sh ? 6 : 0), z.y + (sh ? -4 : 0), kind); }
          reveal(z); afterHit(z, d);
          if (kind === 'lastdef' && room.door.hp < room.door.max * 0.25) self.slow(room, z, 0.4, 1);
        });
        break;
      case 'revolver':
        if (t.data.ammo == null) t.data.ammo = it.clip;
        this.damage(room, tgt, dmg, t, {}); this.fx.shot(room, t, tgt.x, tgt.y, 'hitscan');
        t.data.ammo--;
        if (t.data.ammo <= 0) { t.data.ammo = it.clip; t.cd = it.reload / (1 + G.TRACKS.spd.per * t.lvl.spd); t.data.reloadUntil = now + t.cd; }
        break;
      case 'minigun':
        t.data.spin = Math.min(1, (t.data.spin || 0) + st.cd / it.spin);
        t.cd = st.cd / (1 + 4 * t.data.spin);
        this.damage(room, tgt, dmg, t, {}); if (Math.random() < 0.6) this.fx.shot(room, t, tgt.x + (Math.random() - 0.5) * 8, tgt.y, 'bullet');
        break;
      case 'bounce':
        var hitB = [tgt], curB = tgt, dB = dmg, nB = (it.bounces || 2) + t.lvl.spc;
        this.damage(room, tgt, dB, t, {}); this.fx.shot(room, t, tgt.x, tgt.y, 'pellet');
        for (var bi = 0; bi < nB; bi++) {
          var nxt = null, bdB = 2.5 * T;
          this.eachNear(curB.x, curB.y, bdB, function (z) { if (hitB.indexOf(z) >= 0 || !self.targetable(room, z, st.detect, false)) return; var dd = Math.hypot(z.x - curB.x, z.y - curB.y); if (dd < bdB) { bdB = dd; nxt = z; } });
          if (!nxt) break;
          dB *= 0.8; this.damage(room, nxt, dB, t, {}); this.fx.shot(room, { px: curB.x, py: curB.y + 7, item: it }, nxt.x, nxt.y, 'pellet'); hitB.push(nxt); curB = nxt;
        }
        break;
      case 'plasma':
        var bonus = tgt.isBoss ? tgt.maxHp * 0.015 : tgt.maxHp * 0.04;
        this.damage(room, tgt, (dmg + bonus) * (tgt.isBoss ? 1.5 : 1), t, { color: '#d27bff' });
        this.fx.shot(room, t, tgt.x, tgt.y, 'plasma');
        break;
      case 'spread':
        var pel = it.pellets + t.lvl.spc + (ev.pellets || 0);
        var near = this.inRadius(room, tgt.x, tgt.y, 1.0 * T, function (z) { return self.targetable(room, z, st.detect, false); });
        if (!near.length) near = [tgt];
        for (var pi = 0; pi < pel; pi++) {
          var z = pi < 2 ? tgt : near[(Math.random() * near.length) | 0];
          this.damage(room, z, dmg, t, {});
          if (pi < 3) afterHit(z, dmg);
          this.fx.shot(room, t, z.x + (Math.random() - 0.5) * 10, z.y + (Math.random() - 0.5) * 10, 'pellet');
        }
        break;
      case 'frost':
        this.damage(room, tgt, dmg, t, { color: '#9be8ff' });
        this.slow(room, tgt, Math.min(0.85, it.slow * st.spc + (ev.slowAdd || 0)), it.slowDur);
        afterHit(tgt, dmg);
        this.fx.shot(room, t, tgt.x, tgt.y, 'frost');
        break;
      case 'poison':
        this.damage(room, tgt, dmg, t, { color: '#9f3' });
        this.poison(tgt, it.pdps * (dmg / it.dmg), it.pdur, it.stacks + t.lvl.spc, now);
        this.fx.shot(room, t, tgt.x, tgt.y, 'poison');
        break;
      case 'chain':
        this.doChain(room, t, tgt, dmg, it.chain + t.lvl.spc + (ev.chainAdd || 0), it.jump * T, ev.stun ? '#fff' : '#8ef', ev.stun);
        break;
      case 'flame': case 'dragon': case 'spray':
        var cone = kind === 'dragon' ? 0.42 : kind === 'spray' ? 0.6 : 0.55, air = kind === 'dragon' || ev.hitAir;
        this.inRadius(room, t.px, t.py, st.range, function (z) { return air || !z.fly; }).forEach(function (z) {
          var a = Math.atan2(z.y - t.py, z.x - t.px), da = Math.abs(((a - t.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (da >= cone) return;
          if (kind === 'spray') { self.damage(room, z, dmg, t, { dot: true }); self.poison(z, it.pdps * (1 + G.TRACKS.dmg.per * t.lvl.dmg), it.pdur, it.stacks + t.lvl.spc, now); return; }
          self.damage(room, z, z.def && z.def.immuneBurn ? dmg * 0.5 : dmg, t, { dot: true, showDot: Math.random() < 0.2, color: '#ff9a3c' });
          self.burn(room, z, it.burn * st.spc * (ev.burnMul || 1), it.burnDur);
        });
        this.fx.flame(room, t, st.range, kind);
        break;
      case 'magnet':
        var armored = tgt.armor - tgt.shred > 0.5;
        this.damage(room, tgt, dmg * (armored ? 2 : 1), t, { color: '#9cf' });
        tgt.armor = Math.max(0, tgt.armor - it.shred * st.spc);
        if (!tgt.isBoss && !tgt.heavy) tgt.dist = Math.max(0, tgt.dist - 0.6 * T);
        this.fx.beam(room, t.px, t.py - 10, tgt.x, tgt.y, '#7fb8ff', 4);
        break;
      case 'splash': case 'mortar':
        var nR = ev.rockets || 1, rTargets = nR > 1 ? this.findTargets(room, t.px, t.py, st.range, mode, st.detect, it.groundOnly, nR) : [tgt];
        var R = it.splash * T * (1 + 0.12 * t.lvl.spc) * (ev.splashMul || 1), fl = kind === 'mortar' ? 0.9 : it.big ? 0.45 : 0.3;
        rTargets.forEach(function (tz) {
          self.fx.shot(room, t, tz.x, tz.y, kind === 'mortar' ? 'mortar' : it.big ? 'kaiju' : 'rocket', fl);
          (function (x0, y0, d0) {
            room.pending.push({ at: now + fl, fn: function () {
              var x = tz.dead || kind === 'mortar' ? x0 : tz.x, y = tz.dead || kind === 'mortar' ? y0 : tz.y;
              self.inRadius(room, x, y, R, function (z) { return kind !== 'mortar' || !z.fly; }).forEach(function (z) { self.damage(room, z, d0, t, { aoe: true }); if (it.stun) z.stunUntil = Math.max(z.stunUntil, room.time + it.stun * (1 + 0.1 * t.lvl.spc)); });
              self.fx.explosion(room, x, y, R, it.big ? '#7dff4a' : kind === 'mortar' ? '#c9a24a' : '#ff8c1a', it.big);
            } });
          })(kind === 'mortar' ? tz.x + Math.cos(tz.dir) * tz.speed * 0.6 : tz.x, kind === 'mortar' ? tz.y + Math.sin(tz.dir) * tz.speed * 0.6 : tz.y, dmg);
        });
        break;
      case 'beam':
        var nb = ev.beams || 1, bTargets = nb > 1 ? this.findTargets(room, t.px, t.py, st.range, mode, true, false, nb) : [tgt];
        bTargets.forEach(function (bz) {
          var ang = Math.atan2(bz.y - t.py, bz.x - t.px);
          self.lineHit(room, t, st.range, dmg, '#ff3d6e', 5, ang, function (z) { z.shred = Math.min(z.armor, z.shred + it.shred * st.spc); if (ev.burnHit) self.burn(room, z, ev.burnHit, 2); });
        });
        break;
      case 'archangel':
        var aT = this.findTargets(room, t.px, t.py, st.range, 'strongest', true, false, it.beams + G.spcSteps(it, t.ul));
        aT.forEach(function (z) { self.damage(room, z, dmg, t, { color: '#fff4b0' }); self.fx.beam(room, t.px, t.py - 26, z.x, z.y, '#fff1a0', 5); });
        t.data.n = (t.data.n || 0) + 1;
        if (t.data.n >= it.novaEvery) {
          t.data.n = 0;
          this.inRadius(room, t.px, t.py, st.range).forEach(function (z) { self.damage(room, z, dmg * 2, t, { aoe: true, color: '#fff4b0' }); if (!z.isBoss) z.stunUntil = Math.max(z.stunUntil, now + 0.6 * st.spc); });
          room.door.hp = Math.min(room.door.max, room.door.hp + room.door.max * 0.02 * st.spc);
          this.fx.nova(room, { x: t.px, y: t.py }, st.range, '#fff1a0'); this.fx.text(room, t.px, t.py - 40, 'HEILIGE NOVA', '#fff1a0', true);
        }
        break;
      case 'titan':
        var tT = this.findTargets(room, t.px, t.py, st.range, mode, true, false, 2), Rt = it.splash * T * (1 + 0.1 * t.lvl.spc);
        if (!tT.length) tT = [tgt];
        tT.forEach(function (tz) {
          self.fx.shot(room, t, tz.x, tz.y, 'kaiju', 0.35);
          (function (z0) { room.pending.push({ at: now + 0.35, fn: function () {
            self.inRadius(room, z0.x, z0.y, Rt).forEach(function (z) { self.damage(room, z, dmg, t, { aoe: true }); });
            self.fx.explosion(room, z0.x, z0.y, Rt, '#ffcf5a', true);
          } }); })({ x: tz.x, y: tz.y });
        });
        t.data.n = (t.data.n || 0) + 1;
        if (t.data.n >= it.salvoEvery) {
          t.data.n = 0;
          this.findTargets(room, t.px, t.py, st.range * 1.2, 'strongest', true, false, it.salvo + G.spcSteps(it, t.ul)).forEach(function (tz, k) {
            self.fx.shot(room, t, tz.x, tz.y, 'rocket', 0.5 + k * 0.06);
            (function (z0) { room.pending.push({ at: now + 0.5 + k * 0.06, fn: function () {
              self.inRadius(room, z0.x, z0.y, Rt * 0.7).forEach(function (z) { self.damage(room, z, dmg * 0.7, t, { aoe: true }); });
              self.fx.explosion(room, z0.x, z0.y, Rt * 0.7, '#ff8c1a');
            } }); })({ x: tz.x, y: tz.y });
          });
        }
        break;
      case 'boomerang':
        this.lineHit(room, t, st.range, dmg, '#c9a24a', 3);
        var angB = t.angle;
        (function () { room.pending.push({ at: now + 0.45, fn: function () { self.lineHit(room, t, st.range, dmg, '#c9a24a', 3, angB); } }); })();
        this.fx.shot(room, t, t.px + Math.cos(t.angle) * st.range, t.py + Math.sin(t.angle) * st.range, 'boomerang', 0.45);
        break;
      case 'assassin':
        var ex2 = !tgt.isBoss && tgt.hp / tgt.maxHp < it.execute * st.spc;
        if (ex2) { this.damage(room, tgt, tgt.hp + 1, t, { pierce: true, color: '#c58bff' }); this.fx.text(room, tgt.x, tgt.y - 30, 'EXECUTE', '#c58bff'); }
        else this.damage(room, tgt, dmg, t, { color: '#c58bff' });
        this.fx.slash(room, t, tgt);
        break;
      case 'celestial':
        var endPt = this.lineHit(room, t, st.range, dmg, '#ffe9a8', 7);
        var Rc = it.splash * T * (1 + 0.12 * t.lvl.spc);
        this.inRadius(room, endPt.x, endPt.y, Rc).forEach(function (z) { self.damage(room, z, dmg * 0.6, t, { aoe: true }); });
        this.fx.explosion(room, endPt.x, endPt.y, Rc, '#ffe9a8');
        break;
      case 'eternal':
        this.damage(room, tgt, dmg, t, { color: '#fff' });
        this.burn(room, tgt, dmg * 0.2, 3); this.slow(room, tgt, 0.4, 1.5); this.poison(tgt, dmg * 0.15, 3, 5, now);
        this.doChain(room, t, tgt, dmg * 0.5, 3 + G.spcSteps(it, t.ul), 2 * T, '#ffd6ff');
        this.fx.shot(room, t, tgt.x, tgt.y, 'plasma');
        break;
      case 'reality':
        this.damage(room, tgt, dmg, t, { color: '#28ffd5' });
        this.fx.beam(room, t.px, t.py - 18, tgt.x, tgt.y, '#28ffd5', 3);
        break;
      case 'creator':
        var m = t.data.mode;
        if (m === 0) { this.damage(room, tgt, dmg * 1.5, t, { color: '#fff' }); this.fx.shot(room, t, tgt.x, tgt.y, 'plasma'); }
        else if (m === 1) { this.doChain(room, t, tgt, dmg, 5, 2 * T, '#ffe680'); }
        else if (m === 2) { this.inRadius(room, tgt.x, tgt.y, 1.5 * T).forEach(function (z) { self.damage(room, z, dmg * 0.8, t, { aoe: true }); }); this.fx.explosion(room, tgt.x, tgt.y, 1.5 * T, '#ffd23f'); this.fx.shot(room, t, tgt.x, tgt.y, 'rocket', 0.01); }
        else { this.damage(room, tgt, dmg, t, { color: '#9be8ff' }); this.slow(room, tgt, 0.5, 1.5); this.fx.shot(room, t, tgt.x, tgt.y, 'frost'); }
        break;
    }
  };
  // hit everything on a line from the tower (returns the end point)
  M.lineHit = function (room, t, range, dmg, color, width, ang, extra) {
    var self = this, a = ang != null ? ang : t.angle, ex = t.px + Math.cos(a) * range, ey = t.py + Math.sin(a) * range;
    this.inRadius(room, (t.px + ex) / 2, (t.py + ey) / 2, range / 2 + T).forEach(function (z) {
      if (distToSeg(z.x, z.y, t.px, t.py, ex, ey) < 0.45 * T + z.size * 4) { self.damage(room, z, dmg, t, { color: color }); if (extra) extra(z); }
    });
    this.fx.beam(room, t.px, t.py - 14, ex, ey, color, width);
    return { x: ex, y: ey };
  };
  M.findTargets = function (room, x, y, range, mode, detect, groundOnly, n, minR) {
    var self = this, list = [];
    this.eachNear(x, y, range, function (z) {
      if (!self.targetable(room, z, detect, groundOnly)) return;
      var d = Math.hypot(z.x - x, z.y - y); if (d > range || (minR && d < minR)) return;
      var rem = z.route.len - z.dist;
      list.push({ z: z, v: mode === 'last' ? rem : mode === 'strongest' ? z.hp - rem * 0.01 : mode === 'closest' ? -d : -rem });
    });
    list.sort(function (a, b) { return b.v - a.v; });
    return list.slice(0, n).map(function (o) { return o.z; });
  };
  M.poison = function (z, dps, dur, maxStacks, now) {
    z.poison.push({ dps: dps, until: now + dur });
    while (z.poison.length > maxStacks) z.poison.shift();
  };
  M.doChain = function (room, t, first, dmg, n, jump, color, stun) {
    var self = this, hit = [first], pts = [{ x: t.px, y: t.py - 20 }, { x: first.x, y: first.y }], cur = first, d = dmg;
    this.damage(room, first, d, t, { color: color });
    for (var i = 1; i < n; i++) {
      var best = null, bd = jump;
      this.eachNear(cur.x, cur.y, jump, function (z) { if (hit.indexOf(z) >= 0) return; var dd = Math.hypot(z.x - cur.x, z.y - cur.y); if (dd < bd) { bd = dd; best = z; } });
      if (!best) break;
      d *= 0.9; hit.push(best); pts.push({ x: best.x, y: best.y }); cur = best;
      this.damage(room, best, d, t, { color: color });
      if (stun && !best.isBoss) best.stunUntil = Math.max(best.stunUntil, room.time + stun);
    }
    this.fx.chain(room, pts, color);
  };
  function distToSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    u = Math.max(0, Math.min(1, u));
    return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
  }

  // -------------------------------------------------------------------
  //  Main update
  // -------------------------------------------------------------------
  M.update = function (dt) {
    var self = this;
    this.elapsed += dt;
    this.updateAvatars(dt);
    if (this.phase === 'claim') { this.updateClaim(dt); this.bots.forEach(function (b) { b.update(dt); }); return; }
    if (this.phase === 'over') return;
    this.time += dt;
    if (this.phase === 'prep') {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) { this.phase = 'play'; this.startWave(1); }
    } else {
      var total = this.totalWaves();
      if (this.wave < total) {
        this.waveTimer -= dt;
        // vote skip: majority of alive players, only once the wave has fully spawned in their rooms
        var alive = this.alivePlayers();
        var votes = alive.filter(function (p) { return p.vote; }).length;
        if (alive.length && votes > alive.length / 2 && this.waveTimer > 1) {
          var bonus = Math.round(this.waveTimer * 3 * G.scaling(this.map, this.diff, this.wave).reward);
          alive.forEach(function (p) { p.cash += bonus; p.stats.moneyEarned += bonus; });
          this.fx.event('skip', { bonus: bonus });
          this.waveTimer = 0;
        }
        if (this.waveTimer <= 0) this.startWave(this.wave + 1);
      } else {
        this.waveTimer = 0;
        this.players.forEach(function (p) {
          if (!p.alive || p.finished) return;
          var r = self.roomOf(p);
          if (!r.queue.length && !r.zombies.length) { p.finished = true; self.fx.finished(p); }
        });
      }
    }
    this.buildGrid();
    var av = this.allVortices = [], aw = this.allWalls = [];
    this.rooms.forEach(function (r) { r.vortices.forEach(function (v) { av.push(v); }); r.walls.forEach(function (w) { aw.push(w); }); });
    for (var i = 0; i < this.rooms.length; i++) this.updateRoom(this.rooms[i], dt);
    this.bots.forEach(function (b) { b.update(dt); });
    if (this.players.every(function (p) { return !p.alive || p.finished; })) { this.phase = 'over'; this.fx.event('over', {}); }
  };
  M.roomClear = function (room) { return !room.zombies.length && !room.queue.length; };
  M.canVote = function (p) {
    var r = this.roomOf(p);
    return this.phase === 'play' && p.alive && this.wave < this.totalWaves() && r && !r.queue.length;
  };
})();
