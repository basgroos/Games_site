// =====================================================================
//  PROFILE — persistent account: coins, collection, loadout, records
//  + SUMMONS, REWARDS, LEADERBOARD, ACHIEVEMENTS
// =====================================================================
(function () {
  var ENV = (typeof window !== 'undefined' && window.HW_BUILD && window.HW_BUILD.env) || 'live';
  var KEY = 'zdt_profile_v1' + (ENV === 'live' ? '' : '_' + ENV);
  var P = G.Profile = { d: null };
  function fresh() {
    var inv = {};
    ['pistol', 'shotgun', 'scout', 'minicash', 'slowtrap', 'wall', 'cashreg'].forEach(function (id) { inv[id] = { n: 1, stars: 0 }; });
    return {
      v: 1, name: 'Speler' + Math.floor(100 + Math.random() * 900), coins: 300, inv: inv, fav: [],
      loadout: ['pistol', 'shotgun', 'minicash', 'scout', 'slowtrap'],
      stats: { games: 0, wins: 0, bosses: 0, summons: 0, bestWave: 0, bestEndless: 0, coinsEarned: 0 },
      mapWins: {}, ach: {}, lb: { wave: [], bosses: [], money: [], endless: [] }, best: {},
      settings: { sfx: true, music: true }, seenHelp: false, pulls: []
    };
  }
  P.load = function () {
    var d = null;
    try { var raw = localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    if (!d || d.v !== 1) d = fresh();
    var f = fresh();
    for (var k in f) if (d[k] === undefined) d[k] = f[k];
    // sanitize loadout
    d.loadout = (d.loadout || []).filter(function (id, i, a) { return G.ITEM[id] && d.inv[id] && a.indexOf(id) === i; });
    P.d = d; P.fixLoadout(); return d;
  };
  P.save = function () { try { localStorage.setItem(KEY, JSON.stringify(P.d)); } catch (e) { } };
  P.reset = function () { P.d = fresh(); P.save(); };
  P.owns = function (id) { return !!P.d.inv[id]; };
  P.stars = function (id) { return P.d.inv[id] ? P.d.inv[id].stars : 0; };
  P.ownedCount = function () { return Object.keys(P.d.inv).length; };
  P.fixLoadout = function () {
    var d = P.d;
    if (d.loadout.length < 5) {
      var order = G.ITEMS.filter(function (i) { return d.inv[i.id] && d.loadout.indexOf(i.id) < 0; });
      while (d.loadout.length < 5 && order.length) d.loadout.push(order.shift().id);
    }
  };
  P.toggleLoadout = function (id) {
    var lo = P.d.loadout, i = lo.indexOf(id);
    if (i >= 0) { lo.splice(i, 1); P.save(); return { ok: true, removed: true }; }
    if (!P.owns(id)) return { ok: false, msg: 'Je bezit dit item nog niet' };
    if (lo.length >= 5) return { ok: false, msg: 'Loadout is vol (5). Verwijder eerst een item.' };
    lo.push(id); P.save(); return { ok: true };
  };
  P.toggleFav = function (id) { var f = P.d.fav, i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); P.save(); };
  P.addCoins = function (n) { P.d.coins += n; P.d.stats.coinsEarned += Math.max(0, n); };

  // ---- Summons ----
  // Duplicates add a star (max 5, +5% stats each). Beyond that they convert to coins
  // worth far less than a summon costs, so duplicates can never be farmed for profit.
  P.addItem = function (id) {
    var inv = P.d.inv, it = G.ITEM[id], rar = G.RAR[it.rarity];
    if (!inv[id]) { inv[id] = { n: 1, stars: 0 }; return { isNew: true }; }
    inv[id].n++;
    if (inv[id].stars < rar.stars) { inv[id].stars++; return { starUp: inv[id].stars }; }
    P.addCoins(rar.dupeCoins); return { coins: rar.dupeCoins };
  };
  P.rollRarity = function (bannerId, rnd) {
    var odds = G.summonOdds(bannerId), r = (rnd || Math.random)() * 100, acc = 0;
    for (var i = G.RARITIES.length - 1; i >= 0; i--) { var id = G.RARITIES[i].id; acc += odds[id]; if (r < acc) return id; }
    return 'common';
  };
  P.summon = function (bannerId, count) {
    var b = G.SUMMON[bannerId], cost = b.cost * count;
    if (P.d.coins < cost) return { ok: false, msg: 'Niet genoeg munten' };
    P.d.coins -= cost;
    var res = [];
    for (var i = 0; i < count; i++) {
      var rid = P.rollRarity(bannerId), pool = G.itemsByRarity(rid), it = pool[(Math.random() * pool.length) | 0];
      var r = P.addItem(it.id); r.item = it; res.push(r);
      P.d.pulls.unshift({ id: it.id, b: bannerId, t: Date.now() });
    }
    P.d.pulls = P.d.pulls.slice(0, 30);
    P.d.stats.summons += count;
    P.checkAch();
    P.save();
    return { ok: true, results: res };
  };

  // ---- Rewards after a match ----
  P.rewards = function (match, pid) {
    var p = match.players[pid], diff = match.diff, map = match.map, lines = [], win = p.finished && p.alive;
    var mm = map.reward;
    if (diff.id === 'endless') {
      var w = p.stats.waveReached;
      lines.push({ label: 'Endless: ' + w + ' waves overleefd', coins: Math.round(15 * Math.pow(w, 1.35) * mm) });
    } else if (win) {
      lines.push({ label: diff.name + ' gewonnen (' + map.name + ')', coins: Math.round(diff.reward * mm) });
      if (p.stats.doorDamage <= 0) lines.push({ label: 'Geen deurdamage!', coins: Math.round(diff.reward * mm * 0.25) });
      lines.push({ label: 'Alle waves overleefd', coins: Math.round(diff.reward * mm * 0.1) });
    } else {
      var frac = p.stats.waveReached / diff.waves;
      lines.push({ label: 'Wave ' + p.stats.waveReached + '/' + diff.waves + ' gehaald', coins: Math.round(diff.reward * mm * 0.25 * frac) });
    }
    if (p.stats.bosses) lines.push({ label: p.stats.bosses + 'x boss verslagen', coins: Math.round(p.stats.bosses * diff.bossBonus * mm) });
    var alive = match.players.filter(function (q) { return q.alive; }).length;
    if (p.alive && diff.id !== 'endless') { /* placement bonus */ }
    var rank = P.rank(match, pid);
    if (rank === 1 && diff.id !== 'endless' && !win) lines.push({ label: '#1 van de lobby', coins: Math.round(diff.reward * mm * 0.05) });
    var total = lines.reduce(function (a, l) { return a + l.coins; }, 0);
    return { lines: lines, total: total, win: win, rank: rank, alive: alive };
  };
  P.rank = function (match, pid) {
    var sorted = match.players.slice().sort(function (a, b) {
      var av = (a.finished && a.alive ? 1000 : 0) + a.stats.waveReached, bv = (b.finished && b.alive ? 1000 : 0) + b.stats.waveReached;
      return bv - av || b.stats.moneyEarned - a.stats.moneyEarned;
    });
    return sorted.indexOf(match.players[pid]) + 1;
  };
  P.recordMatch = function (match, pid, rew) {
    var d = P.d, p = match.players[pid], now = Date.now();
    d.stats.games++;
    if (rew.win) { d.stats.wins++; d.mapWins[match.map.id] = true; d.mapWins[match.map.id + '_' + match.diff.id] = true; }
    d.stats.bosses += p.stats.bosses;
    d.stats.bestWave = Math.max(d.stats.bestWave, p.stats.waveReached);
    var bk = match.map.id + '_' + match.diff.id;
    d.best[bk] = Math.max(d.best[bk] || 0, p.stats.waveReached);
    if (match.diff.id === 'endless') d.stats.bestEndless = Math.max(d.stats.bestEndless, p.stats.waveReached);
    P.addCoins(rew.total);
    // leaderboards include every player of the match (you + bots)
    match.players.forEach(function (q) {
      var e = { name: q.name, you: q.id === pid, map: match.map.name, diff: match.diff.name, t: now };
      push('wave', Object.assign({ v: q.stats.waveReached }, e));
      push('bosses', Object.assign({ v: q.stats.bosses }, e));
      push('money', Object.assign({ v: Math.round(q.stats.moneyEarned) }, e));
      if (match.diff.id === 'endless') push('endless', Object.assign({ v: q.stats.waveReached }, e));
    });
    P.checkAch(match, pid, rew);
    P.save();
  };
  function push(k, e) {
    var l = P.d.lb[k]; if (e.v <= 0) return;
    l.push(e); l.sort(function (a, b) { return b.v - a.v; });
    P.d.lb[k] = l.slice(0, 15);
  }

  // ---- Achievements ----
  P.newAch = [];
  P.checkAch = function (match, pid, rew) {
    var d = P.d, s = d.stats, got = [];
    function give(id) { if (d.ach[id]) return; var a = G.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0]; d.ach[id] = Date.now(); P.addCoins(a.reward); got.push(a); }
    if (s.wins >= 1) give('firstwin');
    if (s.bosses >= 1) give('boss1');
    if (s.bosses >= 10) give('boss10');
    if (d.mapWins.city && d.mapWins.frozen && d.mapWins.volcano) give('allmaps');
    if (Object.keys(d.mapWins).some(function (k) { return /_medium$/.test(k); })) give('medium');
    if (Object.keys(d.mapWins).some(function (k) { return /_hard$/.test(k); })) give('hard');
    if (s.bestEndless >= 20) give('endless20');
    if (s.bestEndless >= 40) give('endless40');
    if (P.ownedCount() >= 15) give('collect15');
    if (P.ownedCount() >= 30) give('collect30');
    if (Object.keys(d.inv).some(function (id) { return G.ITEM[id].rarity === 'secret'; })) give('secret');
    if (match) {
      var p = match.players[pid];
      if (rew && rew.win && p.stats.doorDamage <= 0) give('flawless');
      if (p.stats.moneyEarned >= 1e6) give('rich');
      if (match.rooms[p.room].door.lvl >= 15) give('door15');
    }
    P.newAch = P.newAch.concat(got);
    return got;
  };
})();

// =====================================================================
//  NET — command transport. LocalNet applies commands directly to the
//  in-browser match. An online adapter would send the same command
//  objects to an authoritative server and apply state snapshots.
// =====================================================================
(function () {
  G.LocalNet = function (match, localId) { this.match = match; this.localId = localId; };
  G.LocalNet.prototype.send = function (cmd) { return this.match.command(this.localId, cmd); };
  G.LocalNet.prototype.mode = 'local';
  /* Online sketch:
     G.OnlineNet = function (url, localId) { this.ws = new WebSocket(url); ... }
     send(cmd) -> ws.send(JSON.stringify({ pid: localId, cmd: cmd }))
     onmessage(snapshot) -> replace match state (players, rooms) from server tick */
})();
