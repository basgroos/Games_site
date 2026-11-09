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
      settings: { sfx: true, music: true, hotkeysOn: true, hints: true, hotkeys: {} }, seenHelp: false, pulls: [],
      mastery: {}, cos: {}, hats: [], hat: null, tickets: { normal: 0, premium: 0 }, missions: null
    };
  }
  P.load = function () {
    var d = null;
    try { var raw = localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    if (!d || d.v !== 1) d = fresh();
    var f = fresh();
    for (var k in f) if (d[k] === undefined) d[k] = f[k];
    for (var sk in f.settings) if (d.settings[sk] === undefined) d.settings[sk] = f.settings[sk];
    ['kills', 'upgrades', 'evolves', 'killMoney', 'flawless', 'duoWins', 'missions', 'bestMoney', 'bestDoor'].forEach(function (k) { if (d.stats[k] == null) d.stats[k] = 0; });
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
  P.summon = function (bannerId, count, useTicket) {
    var b = G.SUMMON[bannerId], cost = b.cost * count;
    if (useTicket) { if ((P.d.tickets[bannerId] || 0) < count) return { ok: false, msg: 'Geen tickets' }; P.d.tickets[bannerId] -= count; }
    else { if (P.d.coins < cost) return { ok: false, msg: 'Niet genoeg munten' }; P.d.coins -= cost; }
    var res = [];
    for (var i = 0; i < count; i++) {
      var rid = P.rollRarity(bannerId), pool = G.itemsByRarity(rid), it = pool[(Math.random() * pool.length) | 0];
      var r = P.addItem(it.id); r.item = it; res.push(r);
      P.d.pulls.unshift({ id: it.id, b: bannerId, t: Date.now() });
    }
    P.d.pulls = P.d.pulls.slice(0, 30);
    P.d.stats.summons += count;
    P.missionAdd('summons', count);
    P.checkAch();
    P.save();
    return { ok: true, results: res };
  };

  // ---- Rewards after a match ----
  // Base for a win = 10x / 30x / 80x the Normal Summon price (Easy / Medium / Hard), times the map multiplier.
  var BASE = { easy: 10, medium: 30, hard: 80 };
  var PER = { // coins per boss / per 10 waves / per kill
    easy: { boss: 100, ten: 150, kill: 0.25 }, medium: { boss: 250, ten: 300, kill: 0.4 },
    hard: { boss: 500, ten: 600, kill: 0.6 }, endless: { boss: 200, ten: 250, kill: 0.4 } };
  P.rewards = function (match, pid) {
    var p = match.players[pid], diff = match.diff, map = match.map, lines = [], win = p.finished && p.alive;
    var mm = map.reward, price = G.SUMMON.normal.cost, per = PER[diff.id] || PER.easy, w = p.stats.waveReached;
    var base = (BASE[diff.id] || 0) * price * mm;
    function L(cat, label, coins, icon) { coins = Math.round(coins); if (coins > 0) lines.push({ cat: cat, label: label, coins: coins, icon: icon }); }
    if (diff.id === 'endless') L('completion', 'Endless: ' + w + ' waves overleefd', 30 * Math.pow(w, 1.35) * mm, '♾️');
    else if (win) L('completion', diff.name + ' voltooid (' + map.name + ')', base, '🏆');
    else L('completion', 'Wave ' + w + '/' + diff.waves + ' gehaald', base * 0.3 * Math.pow(w / diff.waves, 1.5), '🌊');
    L('kills', p.stats.kills + ' zombies verslagen', Math.min(p.stats.kills * per.kill * mm, Math.max(base, 3000) * 0.5), '🧟');
    L('bosses', p.stats.bosses + 'x boss verslagen', p.stats.bosses * per.boss * mm, '👑');
    L('waves', Math.floor(w / 10) + 'x 10 waves overleefd', Math.floor(w / 10) * per.ten * mm, '🌊');
    var alive = match.players.filter(function (q) { return q.alive; }).length, rank = P.rank(match, pid);
    var bonusBase = diff.id === 'endless' ? 30 * Math.pow(w, 1.35) * mm : base;
    if (win || diff.id === 'endless') {
      if (p.stats.doorDamage <= 0 && w > 0) L('bonus', 'Geen deurdamage (+25%)', bonusBase * 0.25, '🛡️');
      if (alive === match.players.length && win) L('bonus', 'Alle ' + alive + ' spelers overleefden (+20%)', bonusBase * 0.2, '🤝');
    }
    if (rank === 1) L('bonus', '#1 van de lobby (+10%)', bonusBase * 0.1, '🥇');
    else if (rank <= 3) L('bonus', 'Top 3 van de lobby (+5%)', bonusBase * 0.05, '🥈');
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
    d.stats.kills += p.stats.kills; d.stats.upgrades += p.stats.upgrades; d.stats.evolves += p.stats.evolves; d.stats.killMoney += p.stats.killMoney;
    d.stats.bestMoney = Math.max(d.stats.bestMoney, p.stats.moneyEarned);
    var myRoom = match.rooms[p.room]; if (myRoom) d.stats.bestDoor = Math.max(d.stats.bestDoor, myRoom.door.lvl);
    if (rew.win && p.stats.doorDamage <= 0) d.stats.flawless++;
    if (rew.win && match.duo && myRoom && myRoom.partner >= 0) d.stats.duoWins++;
    P.addCoins(rew.total);
    rew.mastery = P.addMastery(match, pid, rew.win);
    P.missionAdd('kills', p.stats.kills); P.missionAdd('bosses', p.stats.bosses); P.missionAdd('waves', p.stats.waveReached);
    P.missionAdd('wins', rew.win ? 1 : 0); P.missionAdd('money', p.stats.moneyEarned); P.missionAdd('upgrades', p.stats.upgrades);
    P.missionAdd('evolves', p.stats.evolves); P.missionAdd('games', 1); P.missionAdd('killMoney', p.stats.killMoney);
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
  P.achStat = function (a) {
    var d = P.d, s = d.stats;
    switch (a.stat) {
      case 'medWins': return Object.keys(d.mapWins).some(function (k) { return /_medium$/.test(k); }) ? 1 : 0;
      case 'hardWins': return Object.keys(d.mapWins).some(function (k) { return /_hard$/.test(k); }) ? 1 : 0;
      case 'mapsWon': return ['city', 'frozen', 'volcano'].filter(function (m) { return d.mapWins[m]; }).length;
      case 'owned': return P.ownedCount();
      case 'secrets': return Object.keys(d.inv).filter(function (id) { return G.ITEM[id] && G.ITEM[id].rarity === 'secret'; }).length;
      case 'bestMastery': return Object.keys(d.mastery).reduce(function (m, id) { return Math.max(m, d.mastery[id].lvl); }, 0);
      default: return s[a.stat] || 0;
    }
  };
  P.checkAch = function () {
    var d = P.d, got = [];
    G.ACHIEVEMENTS.forEach(function (a) {
      if (d.ach[a.id] || P.achStat(a) < a.goal) return;
      d.ach[a.id] = Date.now(); P.addCoins(a.reward); got.push(a);
    });
    P.newAch = P.newAch.concat(got);
    return got;
  };

  // ---- Tower mastery (cosmetic rewards only) ----
  P.mast = function (id) { return P.d.mastery[id] || (P.d.mastery[id] = { xp: 0, lvl: 1, kills: 0, dmg: 0, bosses: 0, matches: 0 }); };
  P.mastUnlocked = function (id) { var m = P.d.mastery[id], l = m ? m.lvl : 1; return G.MASTERY_REWARDS.filter(function (r) { return r.lvl <= l; }); };
  P.addMastery = function (match, pid, win) {
    var p = match.players[pid], out = [];
    p.loadout.forEach(function (id) {
      var ms = p.mast[id] || [0, 0, 0], m = P.mast(id), placed = ms[0] || ms[1] || match.rooms.some(function (r) { return r.towers.some(function (t) { return t.by === pid && t.item.id === id; }); });
      if (!placed && !ms[0]) return;
      var xp = Math.round(ms[0] * 2 + ms[1] / 1000 + ms[2] * 40 + 20 + (win ? 20 : 0));
      var before = m.lvl, unlocked = [];
      m.xp += xp; m.kills += ms[0]; m.dmg += Math.round(ms[1]); m.bosses += ms[2]; m.matches++;
      while (m.lvl < G.MASTERY_MAX && m.xp >= G.masteryXpFor(m.lvl + 1)) { m.xp -= G.masteryXpFor(m.lvl + 1); m.lvl++; G.MASTERY_REWARDS.forEach(function (r) { if (r.lvl === m.lvl) unlocked.push(r); }); }
      if (m.lvl >= G.MASTERY_MAX) m.xp = Math.min(m.xp, G.masteryXpFor(G.MASTERY_MAX));
      out.push({ id: id, xp: xp, before: before, after: m.lvl, unlocked: unlocked });
    });
    return out;
  };
  // equipped cosmetics per tower → passed into a match (visual only)
  P.equip = function (id, type, val) {
    var c = P.d.cos[id] || (P.d.cos[id] = {});
    if (val && !P.mastUnlocked(id).some(function (r) { return r.type === type && r.id === val; })) return false;
    c[type] = val || null; P.save(); return true;
  };
  P.cosMap = function () {
    var out = {};
    P.d.loadout.forEach(function (id) { var c = P.d.cos[id]; if (c && (c.skin || c.kill || c.anim)) out[id] = { skin: c.skin || null, kill: c.kill || null, anim: !!c.anim }; });
    return out;
  };

  // ---- Daily missions ----
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  P.missions = function () {
    var day = today(), d = P.d;
    if (!d.missions || d.missions.day !== day) {
      var seed = 0; for (var i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) >>> 0;
      var rnd = G.rng(seed), pool = G.MISSIONS.slice(), list = [];
      var tiers = [0, 0, 1, 2];
      for (var k = 0; k < 4 && pool.length; k++) {
        var tpl = pool.splice((rnd() * pool.length) | 0, 1)[0], tier = tiers[k];
        var rw = G.MISSION_REWARDS[tier], reward = rw[(rnd() * rw.length) | 0];
        list.push({ id: tpl.id, stat: tpl.stat, goal: tpl.goals[tier], tier: tier, prog: 0, reward: reward, claimed: false });
      }
      d.missions = { day: day, list: list }; P.save();
    }
    return d.missions.list;
  };
  P.missionAdd = function (stat, n) { if (!n) return; P.missions().forEach(function (m) { if (m.stat === stat && !m.claimed) m.prog = Math.min(m.goal, m.prog + n); }); };
  P.missionText = function (m) { var t = G.MISSIONS.filter(function (x) { return x.id === m.id; })[0]; return t.text.replace('{n}', G.FX ? G.FX.fmt(m.goal) : m.goal); };
  P.rewardText = function (r) { return r.type === 'coins' ? '🪙 ' + r.n : r.type === 'normal' ? '🎟️ ' + r.n + 'x Normal Summon' : r.type === 'premium' ? '💎 ' + r.n + 'x Premium Summon' : '🎩 Cosmetische hoed'; };
  P.claimMission = function (i) {
    var m = P.missions()[i]; if (!m || m.claimed || m.prog < m.goal) return null;
    m.claimed = true; P.d.stats.missions++;
    var r = m.reward, extra = '';
    if (r.type === 'coins') P.addCoins(r.n);
    else if (r.type === 'normal' || r.type === 'premium') P.d.tickets[r.type] = (P.d.tickets[r.type] || 0) + r.n;
    else if (r.type === 'hat') {
      var left = G.HATS.filter(function (h) { return P.d.hats.indexOf(h.id) < 0; });
      if (left.length) { var h = left[(Math.random() * left.length) | 0]; P.d.hats.push(h.id); extra = h.icon + ' ' + h.name; if (!P.d.hat) P.d.hat = h.id; }
      else { P.addCoins(400); extra = '🪙 400 (alle hoeden al in bezit)'; }
    }
    P.checkAch(); P.save();
    return { reward: r, extra: extra };
  };
  P.missionReset = function () { var d = new Date(), n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return n - d; };
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
