/* =========================================================================
 * profile.js — permanente progressie: coins, unlocks, ranking, seizoen,
 * cosmetics. Opslag: per-speler database-document (als het platform dat
 * biedt) met localStorage als snelle lokale kopie / fallback.
 * ========================================================================= */
var AC = window.AC;
(function () {
  var BUILD = window.HW_BUILD || null;
  var SITE = !!(BUILD && BUILD.online && BUILD.online.url && BUILD.online.key);
  // staging heeft een eigen save, zodat testen nooit je echte voortgang raakt
  var KEY = 'ageclash_profile_v1' + (BUILD && BUILD.env === 'staging' ? '_staging' : '');
  AC.SITE = SITE; AC.BUILD = BUILD;

  function fresh() {
    var owned = AC.AGES.map(function (a) { return a.startOwned.slice(); });
    return {
      v: 1, savedAt: 0, name: 'Commandant', coins: 400, xp: 0, level: 1,
      owned: owned, agesOwned: AC.AGES.map(function (a) { return a.unlockCost === 0 ? 1 : 0; }),
      perma: {}, cosmetics: ['c_blue', 'c_red'], equip: { color: 'c_blue', banner: null, glow: null },
      rating: 1000, peak: 1000, wins: 0, losses: 0, matches: 0, streak: 0, bestStreak: 0,
      season: { xp: 0, claimed: [] }, crates: 1, boost: 0,
      daily: { day: '', firstWin: false },
      settings: { vol: 0.7, mus: 0.35, muted: false, dmgNums: true, diff: 'normal', quality: 'high' },
      history: [], stats: { kills: 0, maxAge: 1, playTime: 0 },
      tutorialDone: false,
    };
  }

  function merge(base, data) {
    if (!data || typeof data !== 'object') return base;
    for (var k in data) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && data[k] && typeof data[k] === 'object' && !Array.isArray(data[k])) merge(base[k], data[k]);
      else base[k] = data[k];
    }
    return base;
  }

  var Profile = { data: fresh(), db: null, uid: null, saving: false, dirty: false, listeners: [], cloud: 'local' };
  AC.Profile = Profile;

  Profile.loadLocal = function () {
    try { var s = localStorage.getItem(KEY); if (s) Profile.data = merge(fresh(), JSON.parse(s)); } catch (e) { }
    Profile._fix();
    if (BUILD) { var P = readPlayer(); if (P.name && Profile.data.name === 'Commandant') Profile.data.name = String(P.name).slice(0, 16); }
  };
  /* Speler-ID en naam gelden op de site voor alle Bas Games */
  var PLAYER_KEY = 'basgames-player';
  function readPlayer() { try { var p = JSON.parse(localStorage.getItem(PLAYER_KEY) || 'null'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } }
  function writePlayer(p) { try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch (e) { } }
  function newUuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  Profile.playerId = function () { var P = readPlayer(); if (!P.id) { P.id = newUuid(); writePlayer(P); } return P.id; };
  Profile.setName = function (n) {
    Profile.data.name = n; Profile.save();
    if (BUILD) { var P = readPlayer(); P.name = n; if (!P.id) P.id = newUuid(); writePlayer(P); }
  };
  Profile._fix = function () {
    var d = Profile.data;
    // zorg dat structuren compleet zijn (nieuwe versies van de game)
    while (d.owned.length < 8) d.owned.push([0, 0, 0, 0]);
    for (var a = 0; a < 8; a++) for (var s = 0; s < 4; s++) if (AC.AGES[a].startOwned[s]) d.owned[a][s] = 1;
    for (var b = 0; b < 8; b++) if (AC.AGES[b].unlockCost === 0) d.agesOwned[b] = 1;
    if (d.cosmetics.indexOf('c_blue') < 0) d.cosmetics.push('c_blue');
  };

  Profile.connectCloud = function () {
    if (!window.claude || !window.claude.use) return;
    var done = false;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user) return;
      return user.id().then(function (uid) {
        if (!uid) return;
        Profile.db = db; Profile.uid = uid;
        var timer = setTimeout(function () { done = true; }, 10000);
        return db.doc('data/users/' + uid + '/profile').get().then(function (snap) {
          clearTimeout(timer);
          Profile.cloud = 'cloud';
          if (snap && snap.exists) {
            var cd = snap.data();
            if (cd && cd.savedAt && cd.savedAt > (Profile.data.savedAt || 0)) {
              Profile.data = merge(fresh(), JSON.parse(JSON.stringify(cd)));
              Profile._fix();
              try { localStorage.setItem(KEY, JSON.stringify(Profile.data)); } catch (e) { }
              Profile.emit();
            } else if ((Profile.data.savedAt || 0) > (cd && cd.savedAt || 0)) Profile.save();
          } else Profile.save();
        });
      });
    }).catch(function () { Profile.cloud = 'local'; });
  };

  Profile.save = function () {
    var d = Profile.data; d.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { }
    if (!Profile.db || !Profile.uid) return;
    if (Profile.saving) { Profile.dirty = true; return; }
    Profile.saving = true;
    var body = JSON.parse(JSON.stringify(d));
    Profile.db.doc('data/users/' + Profile.uid + '/profile').set(body).then(function () {
      Profile.saving = false; Profile.cloud = 'cloud';
      if (Profile.dirty) { Profile.dirty = false; Profile.save(); }
    }, function () { Profile.saving = false; Profile.cloud = 'local'; });
  };
  Profile.on = function (fn) { Profile.listeners.push(fn); };
  Profile.emit = function () { Profile.listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); };
  Profile.reset = function () { Profile.data = fresh(); Profile.save(); Profile.emit(); };

  /* ------------------------------ helpers ------------------------------ */
  Profile.levelXp = function (lvl) { return 300 + (lvl - 1) * 150; };
  Profile.rank = function (r) { var rk = AC.RANKS[0]; AC.RANKS.forEach(function (x) { if (r >= x.min) rk = x; }); return rk; };
  Profile.maxAge = function () { var d = Profile.data, m = 0; for (var a = 0; a < 8; a++) if (d.agesOwned[a]) m = a; return m; };
  Profile.loadout = function () { return Profile.data.owned.map(function (r, a) { return r.map(function (v) { return !!v && !!Profile.data.agesOwned[a]; }); }); };
  Profile.color = function () { var c = AC.COSMETICS.filter(function (x) { return x.id === Profile.data.equip.color; })[0]; return c ? c.color : '#3a8bff'; };
  Profile.banner = function () { var c = AC.COSMETICS.filter(function (x) { return x.id === Profile.data.equip.banner; })[0]; return c ? c.emblem : null; };
  Profile.glow = function () { var c = AC.COSMETICS.filter(function (x) { return x.id === Profile.data.equip.glow; })[0]; return c ? c.glow : null; };
  Profile.today = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  Profile.spend = function (n) { if (Profile.data.coins < n) return false; Profile.data.coins -= n; Profile.save(); Profile.emit(); return true; };
  Profile.buyUnit = function (age, slot) {
    var d = Profile.data, u = AC.UNITS[age][slot];
    if (d.owned[age][slot] || !d.agesOwned[age]) return false;
    if (!Profile.spend(u.coin)) return false;
    d.owned[age][slot] = 1; Profile.save(); Profile.emit(); return true;
  };
  Profile.buyAge = function (age) {
    var d = Profile.data;
    if (d.agesOwned[age]) return false;
    if (age > 0 && !d.agesOwned[age - 1]) return false;
    if (!Profile.spend(AC.AGES[age].unlockCost)) return false;
    d.agesOwned[age] = 1; Profile.save(); Profile.emit(); return true;
  };
  Profile.buyPerma = function (key) {
    var d = Profile.data, def = AC.PERMA.filter(function (p) { return p.key === key; })[0], lvl = d.perma[key] || 0;
    if (!def || lvl >= def.max) return false;
    if (!Profile.spend(def.cost[lvl])) return false;
    d.perma[key] = lvl + 1; Profile.save(); Profile.emit(); return true;
  };
  Profile.permaValues = function () {
    var d = Profile.data, o = {};
    AC.PERMA.forEach(function (p) { o[p.key] = (d.perma[p.key] || 0) * p.per; });
    return o;
  };
  Profile.buyCosmetic = function (id) {
    var d = Profile.data, c = AC.COSMETICS.filter(function (x) { return x.id === id; })[0];
    if (!c || d.cosmetics.indexOf(id) >= 0) return false;
    if (!Profile.spend(c.cost)) return false;
    d.cosmetics.push(id); Profile.save(); Profile.emit(); return true;
  };
  Profile.equip = function (id) {
    var d = Profile.data, c = AC.COSMETICS.filter(function (x) { return x.id === id; })[0];
    if (!c || d.cosmetics.indexOf(id) < 0) return;
    if (d.equip[c.type] === id && c.type !== 'color') d.equip[c.type] = null; else d.equip[c.type] = id;
    Profile.save(); Profile.emit();
  };

  // kist openen: willekeurige beloning
  Profile.openCrate = function () {
    var d = Profile.data; if (d.crates <= 0) return null;
    d.crates--;
    var r = Math.random(), res;
    var locked = AC.COSMETICS.filter(function (c) { return d.cosmetics.indexOf(c.id) < 0 && c.cost > 0; });
    if (r < 0.35 && locked.length) {
      var weights = { common: 6, rare: 3, epic: 1.4, legendary: 0.5 }, tot = 0;
      locked.forEach(function (c) { tot += weights[c.rarity]; });
      var pick = Math.random() * tot, chosen = locked[0];
      for (var i = 0; i < locked.length; i++) { pick -= weights[locked[i].rarity]; if (pick <= 0) { chosen = locked[i]; break; } }
      d.cosmetics.push(chosen.id); res = { type: 'cos', item: chosen };
    } else if (r < 0.5) { d.boost += 3; res = { type: 'boost', n: 3 }; }
    else { var n = 150 + Math.floor(Math.random() * 6) * 50 + (Math.random() < 0.08 ? 600 : 0); d.coins += n; res = { type: 'coins', n: n }; }
    Profile.save(); Profile.emit(); return res;
  };

  Profile.claimTier = function (tier) {
    var d = Profile.data, t = AC.SEASON.tiers[tier - 1];
    if (!t || d.season.xp < t.xp || d.season.claimed.indexOf(tier) >= 0) return null;
    d.season.claimed.push(tier);
    var r = t.reward;
    if (r.type === 'coins') d.coins += r.n;
    else if (r.type === 'crate') d.crates += r.n;
    else if (r.type === 'cos' && d.cosmetics.indexOf(r.id) < 0) d.cosmetics.push(r.id);
    Profile.save(); Profile.emit(); return r;
  };

  /* ---------------------- beloningen na een match ---------------------- */
  // res: {won, mode, diff, time, stats, age, oppRating}
  Profile.matchReward = function (res) {
    var d = Profile.data, perma = Profile.permaValues();
    var mins = Math.max(1, res.time / 60);
    var diffMult = res.mode === 'bot' ? AC.BOT[res.diff].coins : 2.2;
    var coins = Math.round((res.won ? 120 : 45) * diffMult + Math.min(120, res.stats.kills * 0.8) + (res.age) * 12);
    var bonus = [];
    if (res.mode === 'local') coins = Math.round(coins * 0.35);
    if (res.won && d.daily.day !== Profile.today()) { d.daily.day = Profile.today(); bonus.push({ k: 'Eerste overwinning van de dag', v: 150 }); coins += 150; }
    if (res.won && d.streak >= 2) { var sb = Math.min(5, d.streak) * 20; bonus.push({ k: 'Winstreak ×' + (d.streak + 1), v: sb }); coins += sb; }
    if (d.boost > 0) { bonus.push({ k: 'Coin-boost (×1.5)', v: Math.round(coins * 0.5) }); coins = Math.round(coins * 1.5); d.boost--; }
    if (perma.coins) coins = Math.round(coins * (1 + perma.coins));
    var xp = Math.round((res.won ? 220 : 110) + mins * 18 + res.stats.kills * 1.5);
    // ranking
    var oppR = res.oppRating || 1000, exp = 1 / (1 + Math.pow(10, (oppR - d.rating) / 400));
    var K = res.mode === 'online' ? 32 : (res.mode === 'bot' ? 20 : 0);
    var dr = Math.round(K * ((res.won ? 1 : 0) - exp));
    d.rating = Math.max(0, d.rating + dr); d.peak = Math.max(d.peak, d.rating);
    // tellers
    d.matches++; if (res.won) { d.wins++; d.streak++; d.bestStreak = Math.max(d.bestStreak, d.streak); } else { d.losses++; d.streak = 0; }
    d.coins += coins;
    d.stats.kills += res.stats.kills; d.stats.maxAge = Math.max(d.stats.maxAge, res.age + 1); d.stats.playTime += res.time;
    // account-level
    d.xp += xp; var levels = [];
    while (d.xp >= Profile.levelXp(d.level)) { d.xp -= Profile.levelXp(d.level); d.level++; var lc = 100 + d.level * 20; d.coins += lc; levels.push({ level: d.level, coins: lc }); if (d.level % 5 === 0) d.crates++; }
    d.season.xp += xp;
    d.history.unshift({ won: res.won, mode: res.mode, diff: res.diff, time: Math.round(res.time), opp: res.oppName, age: res.age + 1, date: Date.now(), dr: dr });
    d.history = d.history.slice(0, 12);
    Profile.save(); Profile.emit();
    return { coins: coins, xp: xp, dr: dr, bonus: bonus, levels: levels };
  };

  Profile.simpleReward = function (coins, xp) {
    var d = Profile.data, levels = [];
    d.coins += coins; d.xp += xp; d.season.xp += xp;
    while (d.xp >= Profile.levelXp(d.level)) { d.xp -= Profile.levelXp(d.level); d.level++; var lc = 100 + d.level * 20; d.coins += lc; levels.push({ level: d.level, coins: lc }); if (d.level % 5 === 0) d.crates++; }
    Profile.save(); Profile.emit();
    return { coins: coins, xp: xp, dr: 0, bonus: [], levels: levels };
  };

  /* ------------------------------ leaderboard ------------------------------
     Op de Bas Games-site: Supabase-tabel "scores" / view "leaderboard" (game age-clash,
     mode ranked, score = rating, waves = aantal overwinningen). In Claude: de artifact-database. */
  function rest(path, body) {
    if (typeof fetch === 'undefined') return Promise.reject(new Error('no fetch'));
    var cfg = BUILD.online, base = cfg.url.replace(/\/+$/, '') + '/rest/v1/';
    var headers = { apikey: cfg.key, 'Content-Type': 'application/json' };
    if (/^eyJ/.test(cfg.key)) headers.Authorization = 'Bearer ' + cfg.key;
    if (body) headers.Prefer = 'return=minimal';
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
    return fetch(base + path, { method: body ? 'POST' : 'GET', headers: headers, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (to) clearTimeout(to); if (!r.ok) throw new Error('HTTP ' + r.status); return body ? null : r.json(); });
  }
  function siteName() {
    var n = String(Profile.data.name || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    return n.length >= 2 ? n : 'Commandant';
  }
  Profile.publishScore = function () {
    var d = Profile.data;
    if (SITE) {
      return rest('scores', { env: BUILD.env || 'live', game: 'age-clash', player_id: Profile.playerId(), name: siteName(), mode: 'ranked', score: Math.max(0, Math.min(5000000, d.rating | 0)), waves: Math.min(10000, d.wins | 0), kills: Math.min(1000000, d.stats.kills | 0), win: d.history[0] ? !!d.history[0].won : null, version: String(BUILD.version || '').slice(0, 16) }).catch(function () { });
    }
    if (!Profile.db || !Profile.uid) return;
    Profile.db.doc('leaderboard/' + Profile.uid).set({ name: String(d.name).slice(0, 20), rating: d.rating, wins: d.wins, level: d.level, maxAge: d.stats.maxAge, at: Date.now() }).catch(function () { });
  };
  Profile.fetchBoard = function () {
    if (SITE) {
      var q = encodeURIComponent, me = Profile.playerId();
      return rest('leaderboard?select=rank,name,score,waves,player_id&env=eq.' + q(BUILD.env || 'live') + '&game=eq.age-clash&mode=eq.ranked&order=rank.asc,created_at.asc&limit=50')
        .then(function (rows) { return (rows || []).map(function (x) { return { name: String(x.name || 'Speler').slice(0, 16), rating: +x.score || 0, wins: x.waves == null ? '–' : +x.waves, level: '–', me: x.player_id === me }; }); })
        .catch(function () { return null; });
    }
    if (!Profile.db) return Promise.resolve(null);
    return Profile.db.collection('leaderboard').orderBy('rating', 'desc').limit(50).get().then(function (q) {
      return q.docs.map(function (s) { var x = s.data() || {}; return { id: s.id, name: String(x.name || 'Speler').slice(0, 20), rating: +x.rating || 0, wins: +x.wins || 0, level: +x.level || 1, me: s.id === Profile.uid }; });
    }).catch(function () { return null; });
  };
})();
