/* =====================================================================
   GAME STATE, GRID & PLACEMENT
   Creating a new city, placing / demolishing / moving buildings,
   upgrades, perks, land expansion and undo.
   All functions take the game state `S` as first argument and return
   { ok: true } or { ok: false, reason: '…' } so the UI can explain failures.
   ===================================================================== */
(function (TE) {
  'use strict';
  const B = TE.BALANCE;

  /* ---------- Small utilities ---------- */
  function rng(seed) { // mulberry32 — deterministic random numbers for map generation
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  TE.util = { rng, hashStr, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };

  /* Does building definition `def` (with id) match a key like "house", "tag:shop" or "cat:service"? */
  function matches(type, key) {
    if (key === type) return true;
    const def = TE.BUILDINGS[type];
    if (!def) return false;
    if (key.startsWith('tag:')) return def.tags && def.tags.indexOf(key.slice(4)) >= 0;
    if (key.startsWith('cat:')) return def.cat === key.slice(4);
    return false;
  }

  const G = {
    matches,
    idx(S, x, y) { return y * S.size + x; },
    inBounds(S, x, y) { return x >= 0 && y >= 0 && x < S.size && y < S.size; },
    chunkCount(S) { return Math.ceil(S.size / B.chunkSize); },
    chunkOf(x, y) { return [Math.floor(x / B.chunkSize), Math.floor(y / B.chunkSize)]; },
    isOwned(S, x, y) {
      if (!G.inBounds(S, x, y)) return false;
      const [cx, cy] = G.chunkOf(x, y);
      return !!S.chunks[cy * G.chunkCount(S) + cx];
    },
    tile(S, x, y) { return G.inBounds(S, x, y) ? S.tiles[y * S.size + x] : null; },
    buildingAt(S, x, y) { const t = G.tile(S, x, y); return t && t.b ? S.buildings[t.b] : null; },
    def(type) { return TE.BUILDINGS[type]; },
    eachBuilding(S, fn) { for (const k in S.buildings) fn(S.buildings[k]); },
    count(S, type) { return S.counts[type] || 0; },

    /* ---------- New game ---------- */
    newState(seed) {
      seed = seed == null ? Math.floor(Math.random() * 1e9) : seed;
      const size = B.mapSize;
      const S = {
        version: 2, seed, size, river: [], time: 0, money: B.startMoney, totalEarned: 0, earnedByCat: {},
        tiles: [], chunks: [], expansions: 0, buildings: {}, nextUid: 1, counts: {},
        level: 1, unlocked: {}, discovered: {}, questsDone: {}, daily: null,
        buffs: [], event: null, nextEventAt: B.firstEventDelay, eventLog: [],
        stats: { built: 0, demolished: 0, upgrades: 0, playTime: 0, peakIncome: 0, firesContained: 0, eventsHandled: 0, combosFormed: 0 },
        settings: { confirm: true, floaters: true, arrows: true, sound: true, autosave: true, bubbles: true, floods: true },
        undo: null, savedAt: null, seenIntro: false,
      };
      const R = rng(seed);
      for (let i = 0; i < size * size; i++) S.tiles.push({ b: null, f: null, r: null });
      const cc = G.chunkCount(S);
      for (let i = 0; i < cc * cc; i++) S.chunks.push(0);
      B.startChunks.forEach(([cx, cy]) => { S.chunks[cy * cc + cx] = 1; });

      // Natural features outside the starting land
      const start = (x, y) => G.isOwned(S, x, y);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (start(x, y)) continue;
        const t = S.tiles[y * size + x], r = R();
        if (r < 0.13) t.f = 'tree';
        else if (r < 0.16) t.f = 'rock';
      }
      // A river flows across the map (north to south), just east of the starting land
      let rx = 16 + Math.floor(R() * 3);
      for (let y = 0; y < size; y++) {
        const r = R();
        if (r < 0.28) rx--; else if (r > 0.72) rx++;
        const mid = y >= 6 && y <= 17;
        rx = Math.max(mid ? 16 : 12, Math.min(mid ? 18 : 20, rx));
        for (let w = 0; w < 2; w++) {
          const t = S.tiles[y * size + rx + w];
          t.water = 'river'; t.f = null; t.r = null;
          S.river.push(y * size + rx + w);
        }
      }
      // Ponds: a few small clusters
      for (let p = 0; p < 4; p++) {
        let x = Math.floor(R() * size), y = Math.floor(R() * size);
        const n = 2 + Math.floor(R() * 3);
        for (let k = 0; k < n; k++) {
          if (G.inBounds(S, x, y) && !start(x, y) && !S.tiles[y * size + x].water && !G.nearWater(S, x, y, true)) { const t = S.tiles[y * size + x]; t.f = 'pond'; t.r = null; }
          if (R() < 0.5) x += R() < 0.5 ? 1 : -1; else y += R() < 0.5 ? 1 : -1;
        }
      }
      // Resource bonuses: roughly one per land chunk outside the start
      const resKeys = Object.keys(TE.RESOURCES);
      for (let cy = 0; cy < cc; cy++) for (let cx = 0; cx < cc; cx++) {
        if (S.chunks[cy * cc + cx]) continue;
        if (R() < 0.75) {
          const x = cx * B.chunkSize + Math.floor(R() * B.chunkSize), y = cy * B.chunkSize + Math.floor(R() * B.chunkSize);
          const t = G.tile(S, x, y);
          if (t && t.f !== 'pond' && !t.water) { t.f = null; t.r = resKeys[Math.floor(R() * resKeys.length)]; }
        }
      }
      // Starting land: a few trees, the Town Hall and a crossroads
      const c0 = B.startChunks[0][0] * B.chunkSize, mid = c0 + B.chunkSize; // center line
      for (let i = 0; i < 2 * B.chunkSize; i++) {
        G._put(S, 'road', c0 + i, mid);
        if (c0 + i !== mid) G._put(S, 'road', mid, c0 + i);
      }
      G._put(S, 'townhall', mid - 1, mid - 1);
      [[c0, c0], [c0 + 7, c0 + 1], [c0 + 1, c0 + 7], [c0 + 6, c0 + 6]].forEach(([x, y]) => {
        const t = G.tile(S, x, y); if (t && !t.b) t.f = 'tree';
      });
      const fert = G.tile(S, mid + 2, mid - 2); if (fert && !fert.b) { fert.f = null; fert.r = 'fertile'; }
      S.dirty = true;
      return S;
    },

    /* Low-level: put a building on a tile without any checks or cost. */
    _put(S, type, x, y, extra) {
      const def = TE.BUILDINGS[type];
      const uid = S.nextUid++;
      const b = Object.assign({ uid, type, x, y, level: 1, perks: {}, spent: 0, built: S.time, rot: 0 }, extra || {});
      if (def.residents && b.occ == null) { b.occ = def.residents * 0.6; b.qs = null; b.neglectT = 0; b.neglected = false; }
      S.buildings[uid] = b;
      const t = S.tiles[y * S.size + x]; t.b = uid; t.f = null;
      S.counts[type] = (S.counts[type] || 0) + 1;
      S.dirty = true;
      return b;
    },
    _remove(S, b) {
      const t = S.tiles[b.y * S.size + b.x];
      if (t.b === b.uid) t.b = null;
      delete S.buildings[b.uid];
      S.counts[b.type] = Math.max(0, (S.counts[b.type] || 0) - 1);
      if (S.selected === b.uid) S.selected = null;
      S.dirty = true;
    },

    /* ---------- Costs ---------- */
    costOf(S, type) {
      const def = TE.BUILDINGS[type];
      const infl = def.costGrowth ? G.landValue(S) : 1;
      return Math.round(def.cost * Math.pow(1 + (def.costGrowth || 0), G.count(S, type)) * infl);
    },
    /* City-wide price multiplier: a bigger city means pricier land. */
    landValue(S) {
      let n = 0;
      for (const k in S.counts) if (TE.BUILDINGS[k] && TE.BUILDINGS[k].costGrowth) n += S.counts[k];
      return 1 + B.landValueInflation * n;
    },
    maxLevel(type) {
      const def = TE.BUILDINGS[type];
      if (def.noUpgrade) return 1;
      return def.service ? B.serviceMaxLevel : B.maxLevel;
    },
    upgradeCost(S, b) {
      const def = TE.BUILDINGS[b.type];
      if (b.level >= G.maxLevel(b.type)) return null;
      return Math.round(Math.max(def.cost, b.price || 0) * B.levelCostMult[b.level]);
    },
    perkCost(b, perkId) { return Math.round(Math.max(TE.BUILDINGS[b.type].cost, b.price || 0) * TE.PERKS[perkId].costMult * b.level); },
    perksFor(type) {
      const def = TE.BUILDINGS[type];
      return Object.keys(TE.PERKS).filter((p) => TE.PERKS[p].cats.indexOf(def.cat) >= 0);
    },
    expansionCost(S) { return Math.round(B.expansionBaseCost * Math.pow(B.expansionGrowth, S.expansions) / 10) * 10; },

    /* ---------- Unlocks ---------- */
    unlockStatus(S, type) {
      const def = TE.BUILDINGS[type], u = def.unlock || {};
      if (u.never) return { ok: false, missing: ['Cannot be built'] };
      if (S.unlocked[type]) return { ok: true, missing: [] };
      const missing = [];
      const m = TE.Progress ? TE.Progress.metrics(S) : { level: S.level, population: 0, quality: 0 };
      if (u.level && S.level < u.level) missing.push(`City level ${u.level} (${TE.LEVELS[u.level - 1].name})`);
      if (u.population && m.population < u.population) missing.push(`${u.population} population`);
      if (u.quality && m.quality < u.quality) missing.push(`a neighborhood with ${u.quality}+ quality`);
      return { ok: missing.length === 0, missing };
    },
    isUnlocked(S, type) { return G.unlockStatus(S, type).ok; },

    /* ---------- Placement ---------- */
    canPlace(S, type, x, y, opts) {
      opts = opts || {};
      const def = TE.BUILDINGS[type];
      if (!def) return { ok: false, reason: 'Unknown building' };
      if (!G.inBounds(S, x, y)) return { ok: false, reason: 'Outside the map' };
      if (!G.isOwned(S, x, y)) return { ok: false, reason: 'You don\'t own this land yet — buy the expansion first' };
      const t = G.tile(S, x, y);
      if (t.b && t.b !== opts.ignoreUid) return { ok: false, reason: 'Tile is occupied' };
      if (t.f === 'pond') return { ok: false, reason: 'Can\'t build on a pond' };
      const rule = G.placementRule(S, type, x, y);
      if (!rule.ok) return rule;
      if (t.f && !opts.free) {
        const fc = TE.FEATURES[t.f].clearCost;
        return { ok: false, reason: `${TE.FEATURES[t.f].name} here — clear them first with the bulldozer ($${fc})`, feature: true };
      }
      if (opts.free) return { ok: true };
      if (!G.isUnlocked(S, type)) return { ok: false, reason: 'Not unlocked yet' };
      if (def.unique && G.count(S, type) > 0) return { ok: false, reason: 'Only one can be built' };
      const cost = G.costOf(S, type);
      if (S.money < cost) return { ok: false, reason: `Not enough money (need ${TE.fmtMoney(cost)})`, funds: true, cost };
      return { ok: true, cost };
    },
    /* Terrain & road rules: water buildings, shore buildings, road frontage. */
    placementRule(S, type, x, y) {
      const def = TE.BUILDINGS[type], t = G.tile(S, x, y), place = def.place || 'land';
      if (place === 'water') {
        if (!t.water) return { ok: false, reason: `${def.name} must be built on the river` };
        if (type === 'marina' && !G.touchesLand(S, x, y)) return { ok: false, reason: 'A marina must touch the riverbank' };
      } else if (t.water) return { ok: false, reason: 'That\'s the river — build a Road Bridge or Footbridge to cross it' };
      if (place === 'shore' && !G.nearWater(S, x, y)) return { ok: false, reason: `${def.name} must be built right next to the water` };
      if (def.needsRoad && !G.touchesRoad(S, x, y)) return { ok: false, reason: `${def.name} must be built next to a street` };
      return { ok: true };
    },
    isCarRoad(type) { const d = TE.BUILDINGS[type]; return !!(d && d.road && !d.road.walk); },
    isWalkway(type) { const d = TE.BUILDINGS[type]; return !!(d && d.road); },
    isWater(S, x, y) { const t = G.tile(S, x, y); return !!(t && (t.water || t.f === 'pond')); },
    /* Is a land tile next to the river (or a pond)? riverOnly ignores ponds. */
    nearWater(S, x, y, riverOnly) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const t = G.tile(S, x + dx, y + dy);
        if (t && (t.water || (!riverOnly && t.f === 'pond'))) return true;
      }
      return false;
    },
    touchesLand(S, x, y) {
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const t = G.tile(S, x + dx, y + dy); return t && !t.water && t.f !== 'pond'; });
    },
    touchesRoad(S, x, y) {
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const b = G.buildingAt(S, x + dx, y + dy); return b && G.isCarRoad(b.type); });
    },
    /* Face the street: rot 0 = front on the lower-left side, rot 1 = lower-right side. */
    autoRot(S, x, y, fallback) {
      const road = (dx, dy) => { const b = G.buildingAt(S, x + dx, y + dy); return b && G.isWalkway(b.type); };
      if (road(0, 1)) return 0;
      if (road(1, 0)) return 1;
      if (road(-1, 0)) return 0;
      if (road(0, -1)) return 1;
      return fallback || 0;
    },
    rotate(S, b) {
      if (TE.BUILDINGS[b.type].road) return { ok: false, reason: 'Roads connect automatically' };
      b.rot = b.rot ? 0 : 1; return { ok: true };
    },
    /* Change a street into another road type in place (avenue, bike lane, roundabout…). */
    roadOptions(b) {
      if (!G.isCarRoad(b.type) || b.type === 'bridge') return [];
      return ['road', 'avenue', 'bikelane', 'roundabout'].filter((t) => t !== b.type);
    },
    convertRoad(S, b, type) {
      if (G.roadOptions(b).indexOf(type) < 0) return { ok: false, reason: 'Can\'t convert this road' };
      if (!G.isUnlocked(S, type)) return { ok: false, reason: `${TE.BUILDINGS[type].name} is not unlocked yet` };
      const cost = TE.BUILDINGS[type].cost;
      if (S.money < cost) return { ok: false, reason: `Not enough money (need ${TE.fmtMoney(cost)})`, funds: true };
      S.money -= cost;
      S.counts[b.type]--; S.counts[type] = (S.counts[type] || 0) + 1;
      b.type = type; b.spent += cost; b.price = cost;
      S.undo = null; S.dirty = true;
      return { ok: true, cost };
    },
    place(S, type, x, y, opts) {
      opts = opts || {};
      const chk = G.canPlace(S, type, x, y);
      if (!chk.ok) return chk;
      S.money -= chk.cost;
      const rot = opts.rot != null && opts.manualRot ? opts.rot : G.autoRot(S, x, y, opts.rot);
      const b = G._put(S, type, x, y, { spent: chk.cost, price: chk.cost, rot });
      S.stats.built++;
      if (TE.Progress) TE.Progress.bumpDaily(S, 'built', 1);
      if (['tree', 'park', 'waterpark'].indexOf(type) >= 0 && TE.Progress) TE.Progress.bumpDaily(S, 'green', 1);
      // Undo: consecutive placements in one drag stroke undo together
      if (opts.stroke && S.undo && S.undo.stroke === opts.stroke) { S.undo.items.push({ uid: b.uid, refund: chk.cost }); }
      else S.undo = { kind: 'place', stroke: opts.stroke || null, items: [{ uid: b.uid, refund: chk.cost }], time: S.time };
      return { ok: true, building: b, cost: chk.cost };
    },
    demolish(S, b) {
      const def = TE.BUILDINGS[b.type];
      if (def.fixed) return { ok: false, reason: `The ${def.name} can't be demolished` };
      const refund = Math.floor(b.spent * B.demolishRefund);
      S.money += refund;
      G._remove(S, b);
      S.stats.demolished++;
      S.undo = null;
      return { ok: true, refund };
    },
    move(S, b, x, y) {
      const def = TE.BUILDINGS[b.type];
      if (def.fixed) return { ok: false, reason: `The ${def.name} can't be moved` };
      if (b.x === x && b.y === y) return { ok: false, reason: 'Same spot' };
      const chk = G.canPlace(S, b.type, x, y, { ignoreUid: b.uid, free: true });
      if (!chk.ok) return chk;
      const t = G.tile(S, x, y);
      if (t.f) return { ok: false, reason: 'Clear that tile first' };
      S.tiles[b.y * S.size + b.x].b = null;
      b.x = x; b.y = y; t.b = b.uid;
      b.rot = G.autoRot(S, x, y, b.rot);
      S.undo = null;
      S.dirty = true;
      return { ok: true };
    },
    clearFeature(S, x, y) {
      const t = G.tile(S, x, y);
      if (!t || !t.f) return { ok: false, reason: 'Nothing to clear' };
      if (!G.isOwned(S, x, y)) return { ok: false, reason: 'You don\'t own this land' };
      const f = TE.FEATURES[t.f];
      if (f.clearCost == null) return { ok: false, reason: `${f.name} can't be removed` };
      if (S.money < f.clearCost) return { ok: false, reason: `Need ${TE.fmtMoney(f.clearCost)}`, funds: true };
      S.money -= f.clearCost; t.f = null; S.dirty = true;
      return { ok: true, cost: f.clearCost };
    },
    undo(S) {
      const u = S.undo;
      if (!u) return { ok: false, reason: 'Nothing to undo' };
      let refund = 0;
      u.items.forEach((it) => {
        const b = S.buildings[it.uid];
        if (b) { refund += it.refund + (b.spent - it.refund); G._remove(S, b); S.stats.built--; }
      });
      S.money += refund;
      S.undo = null;
      return { ok: true, refund, count: u.items.length };
    },

    /* ---------- Upgrades ---------- */
    upgrade(S, b) {
      const cost = G.upgradeCost(S, b);
      if (cost == null) return { ok: false, reason: 'Already at max level' };
      if (S.money < cost) return { ok: false, reason: `Not enough money (need ${TE.fmtMoney(cost)})`, funds: true };
      S.money -= cost; b.spent += cost; b.level++;
      S.stats.upgrades++;
      if (TE.Progress) TE.Progress.bumpDaily(S, 'upgrades', 1);
      S.dirty = true;
      return { ok: true, cost };
    },
    buyPerk(S, b, perkId) {
      const p = TE.PERKS[perkId];
      if (!p || G.perksFor(b.type).indexOf(perkId) < 0) return { ok: false, reason: 'Not available for this building' };
      if (b.perks[perkId]) return { ok: false, reason: 'Already owned' };
      if (b.level < p.minLevel) return { ok: false, reason: `Requires level ${p.minLevel}` };
      const cost = G.perkCost(b, perkId);
      if (S.money < cost) return { ok: false, reason: `Not enough money (need ${TE.fmtMoney(cost)})`, funds: true };
      S.money -= cost; b.spent += cost; b.perks[perkId] = true;
      S.stats.upgrades++;
      if (TE.Progress) TE.Progress.bumpDaily(S, 'upgrades', 1);
      S.dirty = true;
      return { ok: true, cost };
    },
    repair(S, b) {
      if (!b.damagedUntil || b.damagedUntil <= S.time) return { ok: false, reason: 'Not damaged' };
      const cost = G.repairCost(b);
      if (S.money < cost) return { ok: false, reason: `Need ${TE.fmtMoney(cost)}`, funds: true };
      S.money -= cost; b.damagedUntil = 0; S.dirty = true;
      return { ok: true, cost };
    },
    repairCost(b) { return Math.max(20, Math.round(TE.BUILDINGS[b.type].cost * 0.15)); },

    /* ---------- Land expansion ---------- */
    chunkStatus(S, cx, cy) {
      const cc = G.chunkCount(S);
      if (cx < 0 || cy < 0 || cx >= cc || cy >= cc) return { ok: false, reason: 'Outside the map' };
      if (S.chunks[cy * cc + cx]) return { ok: false, reason: 'Already owned', owned: true };
      const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = cx + dx, ny = cy + dy;
        return nx >= 0 && ny >= 0 && nx < cc && ny < cc && S.chunks[ny * cc + nx];
      });
      if (!adj) return { ok: false, reason: 'Must border land you already own' };
      const cap = TE.LEVELS[S.level - 1].landCap;
      if (S.expansions >= cap) {
        const next = TE.LEVELS.find((l) => l.landCap > S.expansions);
        return { ok: false, reason: next ? `Reach level ${next.level} (${next.name}) to buy more land` : 'No more land', capped: true };
      }
      const cost = G.expansionCost(S);
      if (S.money < cost) return { ok: false, reason: `Need ${TE.fmtMoney(cost)}`, funds: true, cost };
      return { ok: true, cost };
    },
    buyChunk(S, cx, cy) {
      const st = G.chunkStatus(S, cx, cy);
      if (!st.ok) return st;
      S.money -= st.cost;
      S.chunks[cy * G.chunkCount(S) + cx] = 1;
      S.expansions++;
      S.dirty = true;
      return { ok: true, cost: st.cost };
    },
    chunkContents(S, cx, cy) {
      const out = { trees: 0, rocks: 0, ponds: 0, resources: [] };
      for (let y = cy * B.chunkSize; y < (cy + 1) * B.chunkSize; y++) for (let x = cx * B.chunkSize; x < (cx + 1) * B.chunkSize; x++) {
        const t = G.tile(S, x, y); if (!t) continue;
        if (t.f === 'tree') out.trees++; else if (t.f === 'rock') out.rocks++; else if (t.f === 'pond') out.ponds++;
        if (t.r) out.resources.push(t.r);
      }
      return out;
    },
  };

  TE.Game = G;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
