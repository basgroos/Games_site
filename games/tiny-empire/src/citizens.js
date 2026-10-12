/* =====================================================================
   CITIZENS — road networks, service coverage, needs, happiness, safety,
   neighborhoods, occupancy and the advisor's warnings.
   Calculations are per tile / per neighborhood (no individual citizens).
   Services reach homes by travelling over land: the river blocks them
   unless there is a bridge (fire trucks need road bridges, people on
   foot can also use footbridges).
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;
  const C = () => TE.CITIZENS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIRS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.42], [1, -1, 1.42], [-1, 1, 1.42], [-1, -1, 1.42]];

  const NB_NAMES = ['Maple', 'Willow', 'Cedar', 'Sunny', 'Elm', 'Rose', 'Birch', 'Clover', 'Oak', 'Harbor', 'Lark', 'Juniper', 'Aspen', 'Meadow', 'Pine', 'Hazel', 'Orchard', 'Brook'];
  const NB_SUFFIX = ['Row', 'Hill', 'Court', 'Gardens', 'Park', 'Corner', 'Grove', 'Heights', 'Lane', 'Square'];
  const NO_ROAD_NEEDED = { nature: 1, recreation: 1 };

  const Citizens = {
    /* ---------- Road networks ----------
       R.road: car roads; R.walk: anything people can walk on; R.roadConn: car roads linked
       to the Town Hall; R.connected: tiles touching a linked car road. */
    computeRoads(S, R) {
      const n = S.size, N = n * n;
      const road = new Uint8Array(N), walk = new Uint8Array(N), conn = new Uint8Array(N), adjConn = new Uint8Array(N);
      const crossing = new Uint8Array(N); // 1 = road bridge, 2 = footbridge
      let hall = null;
      G().eachBuilding(S, (b) => {
        const i = b.y * n + b.x;
        if (G().isCarRoad(b.type)) road[i] = 1;
        if (G().isWalkway(b.type)) walk[i] = 1;
        if (b.type === 'bridge') crossing[i] = 1;
        if (b.type === 'footbridge') crossing[i] = 2;
        if (b.type === 'townhall') hall = b;
      });
      const queue = [];
      if (hall) DIRS4.forEach(([dx, dy]) => {
        const x = hall.x + dx, y = hall.y + dy;
        if (G().inBounds(S, x, y) && road[y * n + x] && !conn[y * n + x]) { conn[y * n + x] = 1; queue.push(y * n + x); }
      });
      while (queue.length) {
        const i = queue.pop(), x = i % n, y = (i / n) | 0;
        DIRS4.forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) return;
          const j = ny * n + nx;
          if (road[j] && !conn[j]) { conn[j] = 1; queue.push(j); }
        });
      }
      for (let i = 0; i < N; i++) {
        const x = i % n, y = (i / n) | 0;
        adjConn[i] = DIRS4.some(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          return nx >= 0 && ny >= 0 && nx < n && ny < n && conn[ny * n + nx];
        }) ? 1 : 0;
      }
      if (hall) adjConn[hall.y * n + hall.x] = 1;
      R.road = road; R.walk = walk; R.roadConn = conn; R.connected = adjConn; R.crossing = crossing;
    },

    /* Is building b connected to the road network? */
    isConnected(S, R, b) {
      const def = TE.BUILDINGS[b.type];
      if (def.road || NO_ROAD_NEEDED[def.cat] || b.type === 'streetlight' || b.type === 'floodbarrier' || def.place === 'water') return true;
      return !!R.connected[b.y * S.size + b.x];
    },

    /* ---------- Travel distance ----------
       Tiles a service at (x,y) reaches within `radius`, travelling over land.
       travel 'road': water only via road bridges; 'walk': footbridges too. */
    reach(S, R, x, y, radius, travel) {
      const n = S.size, out = new Map();
      const passable = (i) => {
        const t = S.tiles[i];
        if (t.f === 'pond') return false;
        if (!t.water) return true;
        return R.crossing[i] === 1 || (travel === 'walk' && R.crossing[i] === 2);
      };
      out.set(y * n + x, 0);
      let frontier = [y * n + x];
      while (frontier.length) {
        const next = [];
        frontier.forEach((i) => {
          const d0 = out.get(i), cx = i % n, cy = (i / n) | 0;
          DIRS8.forEach(([dx, dy, c]) => {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= n || ny >= n) return;
            const j = ny * n + nx, d = d0 + c;
            if (d > radius + 0.5 || !passable(j)) return;
            if (c > 1 && (!passable(cy * n + nx) || !passable(ny * n + cx))) return; // no corner-cutting across water
            const old = out.get(j);
            if (old == null || d < old - 1e-6) { out.set(j, d); next.push(j); }
          });
        });
        frontier = next;
      }
      return out;
    },
    /* Effective radius of a service building (level bonus, road connection). */
    serviceRadius(S, R, b) {
      const sv = TE.BUILDINGS[b.type].service;
      let r = sv.radius + ((TE.BUILDINGS[b.type].noUpgrade ? 1 : b.level) - 1);
      if (sv.travel === 'road' && !Citizens.isConnected(S, R, b)) r = Math.ceil(r / 2);
      return r;
    },

    /* ---------- Coverage & environment fields (one value per tile) ---------- */
    computeFields(S, R) {
      const n = S.size, N = n * n;
      const F = {};
      ['pollution', 'noise', 'police', 'fire', 'hospital', 'school', 'library', 'grocery', 'lights', 'rec', 'fun', 'shops', 'jobs',
        'neglect', 'scenic', 'trees', 'river', 'traffic', 'water'].forEach((k) => { F[k] = new Float32Array(N); });
      const pol = new Float32Array(N), polAbs = new Float32Array(N), noi = new Float32Array(N), noiAbs = new Float32Array(N);
      const ev = TE.Events ? TE.Events.modifiers(S) : {};
      const underfunded = !!S.underfunded;
      const TR = TE.TRAFFIC;
      let emitSum = 0, absorbSum = 0, smogCut = 0;
      R.reachCache = {};

      const spread = (arr, x, y, amount, radius) => {
        for (let yy = y - radius; yy <= y + radius; yy++) for (let xx = x - radius; xx <= x + radius; xx++) {
          if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
          const d = cheb(x, y, xx, yy);
          arr[yy * n + xx] += amount * (1 - d / (radius + 1));
        }
      };
      const cover = (arr, b, mode, strength) => {
        const sv = TE.BUILDINGS[b.type].service;
        const reff = Citizens.serviceRadius(S, R, b);
        const fund = underfunded ? 0.5 : 1;
        const tiles = Citizens.reach(S, R, b.x, b.y, reff, sv.travel || 'walk');
        R.reachCache[b.uid] = { tiles, radius: reff };
        tiles.forEach((d, i) => {
          const s = (1 - 0.5 * (d / Math.max(1, reff))) * fund * (strength || 1);
          if (mode === 'sum') arr[i] += s; else if (s > arr[i]) arr[i] = s;
        });
      };

      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type];
        const fx = R.comboFx[b.uid] || {};
        const damaged = b.damagedUntil && b.damagedUntil > S.time;
        if (def.emits && def.emits.pollution && !damaged) {
          let a = def.emits.pollution[0] * (b.perks.filters ? 0.4 : 1) * (fx.pollutionMult || 1);
          if (def.cat === 'industrial') a *= (ev.industryPollution || 1);
          spread(pol, b.x, b.y, a, def.emits.pollution[1]);
          emitSum += a;
        }
        if (def.emits && def.emits.noise && !damaged) {
          const a = def.emits.noise[0] * (b.perks.filters ? 0.4 : 1);
          spread(noi, b.x, b.y, a, def.emits.noise[1]);
        }
        if (def.absorbs) {
          if (def.absorbs.pollution) { spread(polAbs, b.x, b.y, def.absorbs.pollution[0], def.absorbs.pollution[1]); absorbSum += def.absorbs.pollution[0]; }
          if (def.absorbs.noise) spread(noiAbs, b.x, b.y, def.absorbs.noise[0], def.absorbs.noise[1]);
        }
        if (def.smogCut && !damaged) smogCut += def.smogCut;
        if (def.service && !damaged) {
          const k = def.service.kind;
          if (k === 'light') {
            for (let yy = b.y - 2; yy <= b.y + 2; yy++) for (let xx = b.x - 2; xx <= b.x + 2; xx++) if (G().inBounds(S, xx, yy)) F.lights[yy * n + xx] += 1;
          } else if (k === 'rec') cover(F.rec, b, 'sum', def.service.strength);
          else if (F[k]) cover(F[k], b, 'max', k === 'grocery' && b.type === 'supermarket' ? 1.15 : 1);
        }
        if (def.tags && def.tags.indexOf('fun') >= 0 && b.type !== 'hotel' && !damaged) spread(F.fun, b.x, b.y, 1.5, 3);
        if (def.tags && def.tags.indexOf('shop') >= 0 && !damaged) spread(F.shops, b.x, b.y, 1, C().shopRadius);
        if (def.jobs && !damaged) spread(F.jobs, b.x, b.y, def.jobs, C().jobRadius);
        if (def.residents && b.neglected) spread(F.neglect, b.x, b.y, 1.5, 2);
        if (b.type === 'tree') spread(F.trees, b.x, b.y, 1, 1);
      });
      // Traffic: busy streets pollute and make noise (less with EV chargers nearby)
      const ev35 = new Uint8Array(N);
      G().eachBuilding(S, (b) => {
        if (b.type !== 'charger' || b.damagedUntil > S.time) return;
        for (let yy = b.y - 4; yy <= b.y + 4; yy++) for (let xx = b.x - 4; xx <= b.x + 4; xx++) if (G().inBounds(S, xx, yy)) ev35[yy * n + xx] = 1;
      });
      let trafficEmit = 0;
      for (let i = 0; i < N; i++) {
        const L = R.load ? R.load[i] : 0;
        if (!L) continue;
        const x = i % n, y = (i / n) | 0;
        const p = L * TR.trafficPollution * (ev35[i] ? 0.65 : 1);
        spread(pol, x, y, p, 1); trafficEmit += p * 0.3;
        spread(noi, x, y, L * TR.trafficNoise, 1);
        const c = R.cong[i];
        if (c > TR.jamStart) {
          const v = clamp((c - TR.jamStart) / (1.6 - TR.jamStart), 0, 1);
          for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
            if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
            const j = yy * n + xx; if (v > F.traffic[j]) F.traffic[j] = v;
          }
        }
      }
      // Natural features on owned land, water views
      let ownedTrees = 0;
      for (let i = 0; i < N; i++) {
        const t = S.tiles[i], x = i % n, y = (i / n) | 0;
        if (t.f === 'tree') {
          const f = TE.FEATURES.tree.absorbs;
          spread(polAbs, x, y, f.pollution[0], f.pollution[1]);
          spread(noiAbs, x, y, f.noise[0], f.noise[1]);
          spread(F.trees, x, y, 0.7, 1);
          if (G().isOwned(S, x, y)) ownedTrees++;
        } else if (t.f === 'pond') spread(F.scenic, x, y, TE.FEATURES.pond.scenic, 1);
        if (t.water || t.f === 'pond') {
          for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (G().inBounds(S, xx, yy)) F.water[yy * n + xx] = 1;
        }
        if (t.r === 'scenic') F.scenic[i] += 10;
        if (R.riverPol && R.riverPol[i] > 0) {
          const p = R.riverPol[i];
          for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) {
            if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
            const j = yy * n + xx, v = p * (1 - cheb(x, y, xx, yy) / 3);
            if (v > F.river[j]) F.river[j] = v;
          }
        }
      }
      absorbSum += ownedTrees;
      const smog = clamp((emitSum + trafficEmit - absorbSum * 0.5) / 10 - smogCut, 0, 35);
      for (let i = 0; i < N; i++) {
        F.pollution[i] = clamp(pol[i] - polAbs[i] + smog, 0, 100);
        F.noise[i] = clamp(noi[i] - noiAbs[i], 0, 100);
      }
      R.f = F; R.smog = smog; R.emitSum = emitSum;
    },

    /* ---------- Needs for a home on tile i ---------- */
    needsAt(S, R, i, fx, neglectSelf) {
      const c = C(), F = R.f, conn = !!R.connected[i];
      fx = fx || {};
      const ev = TE.Events ? TE.Events.modifiers(S) : {};
      const neglect = Math.max(0, F.neglect[i] - (neglectSelf ? 1.5 : 0));
      const transit = R.transit ? R.transit[i] : 0;
      const safety = clamp(c.baseSafety + c.policeSafety * F.police[i] + c.lightSafety * Math.min(c.maxLights, F.lights[i])
        + c.fireSafety * F.fire[i] + c.neglectSafety * Math.min(2, neglect) + (conn ? 0 : c.noRoadSafety) + (fx.safety || 0), 0, 100);
      const health = clamp(20 + 75 * F.hospital[i], 0, 100);
      const education = clamp(20 + 60 * F.school[i] + 25 * F.library[i], 0, 100);
      const recreation = clamp(15 + 55 * Math.min(1.5, F.rec[i]) + 10 * Math.min(2, F.fun[i]) + 4 * Math.min(4, F.trees[i]) + F.scenic[i] + 8 * F.water[i], 0, 100);
      const shops = clamp(20 + 45 * Math.min(1, F.shops[i] / 1.5) + 35 * F.grocery[i], 0, 100);
      const jobs = clamp((20 + 50 * Math.min(1, F.jobs[i] / 4) + 30 * transit) * (conn ? 1 : 0.6), 0, 100);
      const air = clamp(100 - F.pollution[i], 0, 100);
      const noise = F.noise[i];
      const vals = { safety, health, education, recreation, shops, jobs, air };
      let wsum = 0, hsum = 0;
      const active = {};
      for (const k in TE.NEEDS) {
        const nd = TE.NEEDS[k];
        active[k] = S.level >= nd.activeFromLevel;
        const v = active[k] ? vals[k] : 60;
        hsum += nd.weight * v; wsum += nd.weight;
      }
      // Penalties that are not needs: noise, traffic jams, dirty river, power cuts
      const pen = {
        noise: noise * c.noisePenalty,
        traffic: TE.TRAFFIC.jamHappinessPenalty * F.traffic[i],
        river: Math.min(TE.RIVER.homePenaltyMax, F.river[i] / 5),
        power: R.power ? c.powerPenalty * (1 - R.power.ratio) : 0,
      };
      let happy = hsum / wsum - pen.noise - pen.traffic - pen.river - pen.power;
      let mods = 0;
      mods += fx.happiness || 0;
      mods += R.cityHappiness || 0;
      mods += ev.happiness || 0;
      if (S.tiles[i].r === 'scenic') mods += 5;
      if (ev.heatwave) {
        const cool = recreation >= 65 || F.hospital[i] > 0.3;
        mods += cool ? -3 : -12;
      }
      happy = clamp(happy + mods, 0, 100);
      return Object.assign(vals, { noise, happiness: happy, active, mods, pen, connected: conn, traffic: F.traffic[i], river: F.river[i] });
    },

    /* ---------- Homes & neighborhoods ---------- */
    computeHomes(S, R) {
      const homes = [];
      G().eachBuilding(S, (b) => { if (TE.BUILDINGS[b.type].residents) homes.push(b); });
      homes.forEach((b) => {
        const i = b.y * S.size + b.x;
        const nd = Citizens.needsAt(S, R, i, R.comboFx[b.uid], b.neglected);
        const local = 0.35 * nd.happiness + 0.25 * nd.safety + 0.15 * nd.air + 0.1 * (100 - nd.noise)
          + 0.15 * (nd.connected ? 100 : 40) + (b.perks.premium ? 8 : 0);
        R.b[b.uid].needs = nd;
        R.b[b.uid].local = local;
      });
      // Union-find: homes within 2 tiles belong to one neighborhood
      const parent = {};
      const find = (u) => (parent[u] === u ? u : (parent[u] = find(parent[u])));
      homes.forEach((b) => { parent[b.uid] = b.uid; });
      for (let a = 0; a < homes.length; a++) for (let c = a + 1; c < homes.length; c++) {
        if (cheb(homes[a].x, homes[a].y, homes[c].x, homes[c].y) <= 2) {
          const ra = find(homes[a].uid), rc = find(homes[c].uid);
          if (ra !== rc) parent[Math.max(ra, rc)] = Math.min(ra, rc);
        }
      }
      const groups = {};
      homes.forEach((b) => { const r = find(b.uid); (groups[r] = groups[r] || []).push(b); });
      const nbs = [];
      Object.keys(groups).forEach((root) => {
        const members = groups[root];
        const h = TE.util.hashStr('nb' + root + S.seed);
        const name = NB_NAMES[h % NB_NAMES.length] + ' ' + NB_SUFFIX[(h >> 8) % NB_SUFFIX.length];
        let sum = 0, pop = 0, svc = 0, cx = 0, cy = 0;
        members.forEach((b) => { const nd = R.b[b.uid].needs; sum += R.b[b.uid].local; pop += b.occ || 0; svc += (nd.shops + (nd.active.health ? nd.health : 60)) / 2; cx += b.x; cy += b.y; });
        let q = sum / members.length;
        const notes = [];
        if (members.length >= 4) { q += 4; notes.push({ text: 'Lively, dense neighborhood', v: 4 }); }
        const overcrowded = pop > C().overcrowdPopulation && S.level >= 2 && svc / members.length < 50;
        if (overcrowded) { q -= 10; notes.push({ text: 'Overcrowded — needs more shops and healthcare', v: -10 }); }
        q = clamp(q, 0, 100);
        const nb = { id: +root, name, members: members.map((b) => b.uid), quality: q, pop, notes, overcrowded,
          cx: cx / members.length, cy: cy / members.length };
        nbs.push(nb);
        members.forEach((b) => { R.b[b.uid].nb = nb; R.b[b.uid].quality = q; if (b.qs == null) b.qs = q; });
      });
      nbs.sort((a, b) => b.pop - a.pop);
      R.neighborhoods = nbs;
      R.homes = homes.map((b) => b.uid);
    },

    /* ---------- Gradual changes (called every simulated second) ---------- */
    tick(S, R, dt) {
      const c = C();
      let flipped = false;
      const attract = R.totals ? clamp((R.totals.happiness - 50) * c.attraction, -0.1, 0.15) : 0;
      R.homes.forEach((uid) => {
        const b = S.buildings[uid]; if (!b) return;
        const info = R.b[uid];
        if (!info || info.quality == null) return;
        b.qs += (info.quality - b.qs) * Math.min(1, c.qualitySmoothing * dt);
        const cap = Citizens.capacity(b);
        const target = clamp(Citizens.targetRatio(b) + attract, 0.15, 1);
        b.occ += (target * cap - b.occ) * Math.min(1, c.occupancyRate * dt);
        const ratio = b.occ / cap;
        if (ratio < c.neglectThreshold) {
          b.neglectT = (b.neglectT || 0) + dt;
          if (!b.neglected && b.neglectT > c.neglectDelay) { b.neglected = true; flipped = true; }
        } else {
          b.neglectT = 0;
          if (b.neglected && ratio > c.neglectRecover) { b.neglected = false; flipped = true; }
        }
      });
      if (flipped) S.dirty = true;
    },
    capacity(b) {
      const def = TE.BUILDINGS[b.type];
      return def.residents * TE.BALANCE.residentCapMult[b.level - 1];
    },
    targetRatio(b) {
      const def = TE.BUILDINGS[b.type];
      return clamp(0.3 + ((b.qs == null ? 50 : b.qs) - def.expectation - 20) / 70, 0.15, 1);
    },
    /* People who would like to move in (happy cities attract residents). */
    housingDemand(S, R) {
      const T = R.totals; if (!T || T.happiness < 55) return 0;
      return Math.round(Math.max(10, T.population) * (T.happiness - 55) / 90);
    },
    needStatus(v) {
      if (v == null) return 'off';
      return v >= TE.NEED_THRESHOLDS.good ? 'good' : v >= TE.NEED_THRESHOLDS.ok ? 'ok' : 'bad';
    },

    /* ---------- Advisor: warnings with actionable fixes ---------- */
    advise(S, R) {
      const W = [];
      const homesTxt = (n) => `${n} home${n > 1 ? 's' : ''}`;
      const verb = (n, one, many) => (n > 1 ? many : one);
      const homes = R.homes.map((u) => S.buildings[u]).filter(Boolean);
      const bad = (k) => homes.filter((b) => { const nd = R.b[b.uid].needs; return nd.active[k] && nd[k] < TE.NEED_THRESHOLDS.ok; });
      const add = (sev, icon, text, fix, list) => {
        const focus = list && list.length ? { x: list[0].x, y: list[0].y } : null;
        W.push({ sev, icon, text, fix, focus });
      };
      if (S.underfunded) add(3, '💸', 'Upkeep is higher than income — services run at half strength!', 'Build income buildings or demolish unneeded services.');
      if (R.power && R.power.short) add(3, '⚡', `Power shortage: ${Math.round(R.power.demand)} needed, ${Math.round(R.power.supply)} supplied`, 'Build a Power Plant (or Solar Farm). Businesses lose income and residents are unhappy.');
      const air = bad('air');
      if (air.length) add(3, '💨', `${homesTxt(air.length)} ${verb(air.length, 'breathes', 'breathe')} polluted air`, TE.NEEDS.air.fix, air);
      const safe = bad('safety');
      if (safe.length) add(2, '🛡️', `${homesTxt(safe.length)} ${verb(safe.length, 'feels', 'feel')} unsafe`, TE.NEEDS.safety.fix, safe);
      const rec = bad('recreation');
      if (rec.length) add(2, '🌳', `${homesTxt(rec.length)} ${verb(rec.length, 'has', 'have')} nowhere to relax`, TE.NEEDS.recreation.fix, rec);
      const hl = bad('health');
      if (hl.length) add(2, '🏥', `${homesTxt(hl.length)} ${verb(hl.length, 'has', 'have')} no healthcare`, TE.NEEDS.health.fix, hl);
      const ed = bad('education');
      if (ed.length) add(2, '🎓', `${homesTxt(ed.length)} ${verb(ed.length, 'has', 'have')} no school nearby`, TE.NEEDS.education.fix, ed);
      const sh = bad('shops');
      if (sh.length) add(1, '🛒', `${homesTxt(sh.length)} ${verb(sh.length, 'is', 'are')} far from shops`, TE.NEEDS.shops.fix, sh);
      const jb = bad('jobs');
      if (jb.length) add(1, '💼', `${homesTxt(jb.length)} ${verb(jb.length, 'is', 'are')} far from jobs`, TE.NEEDS.jobs.fix, jb);
      const ts = R.trafficStats;
      if (ts && ts.jammed > 0) {
        const jamTiles = []; for (let i = 0; i < R.cong.length; i++) if (R.cong[i] > 1) jamTiles.push({ x: i % S.size, y: (i / S.size) | 0 });
        add(ts.jammed > 3 ? 3 : 2, '🚗', `Traffic jams on ${ts.jammed} street${ts.jammed > 1 ? 's' : ''}`, 'Click a red street to upgrade it to an Avenue, add a Roundabout, or build Bus Stops and Bike Lanes.', jamTiles);
      }
      const ps = R.parkingStats;
      if (ps && ps.short > 0) {
        const list = []; G().eachBuilding(S, (b) => { const p = R.parking[b.uid]; if (p && p.ratio < 0.9) list.push(b); });
        add(2, '🅿️', `${ps.short} business${ps.short > 1 ? 'es lack' : ' lacks'} parking`, 'Build a Parking Lot or Garage nearby, or a Bus Stop / Train Station so fewer people drive.', list);
      }
      const dirty = homes.filter((b) => R.b[b.uid].needs.river >= 20);
      if (dirty.length) add(2, '🌊', `The river is dirty next to ${homesTxt(dirty.length)}`, 'Industry within 2 tiles of the river dumps waste downstream. Move it, buy Clean Filters, or build a Recycling Center on the bank.', dirty);
      const noisy = homes.filter((b) => R.b[b.uid].needs.noise >= 18);
      if (noisy.length) add(1, '🔊', `${homesTxt(noisy.length)} ${verb(noisy.length, 'suffers', 'suffer')} from noise`, 'Plant trees or parks beside busy roads and industry, or move homes away.', noisy);
      const negl = homes.filter((b) => b.neglected);
      if (negl.length) add(3, '🏚️', `${negl.length} home${negl.length > 1 ? 's are' : ' is'} being neglected (few residents)`, 'Improve the neighborhood quality — click the home to see what\'s missing.', negl);
      R.neighborhoods.filter((n) => n.overcrowded).forEach((n) => add(2, '👥', `${n.name} is overcrowded`, 'Add shops, a Grocery Store or a Hospital in range.', [S.buildings[n.members[0]]]));
      if (S.settings.floods !== false && R.floodZone) {
        const risk = TE.Water.floodVictims(S, R);
        if (risk.length >= 2) add(1, '🌧️', `${risk.length} buildings stand in the flood zone without protection`, 'Build Flood Barriers on the bank (each protects 3 tiles around it). See the Flood risk overlay.', risk);
      }
      const disc = [];
      G().eachBuilding(S, (b) => { const d = TE.BUILDINGS[b.type]; if (!d.residents && TE.ROAD_ACCESS[d.cat] && !Citizens.isConnected(S, R, b)) disc.push(b); });
      const discEmerg = [];
      G().eachBuilding(S, (b) => { if (['police', 'fire', 'hospital'].indexOf(b.type) >= 0 && !Citizens.isConnected(S, R, b)) discEmerg.push(b); });
      if (disc.length) add(2, '🚧', `${disc.length} business${disc.length > 1 ? 'es have' : ' has'} no road access`, 'Connect them with roads leading to the Town Hall.', disc);
      if (discEmerg.length) add(2, '🚑', `${discEmerg.length} emergency service${discEmerg.length > 1 ? 's are' : ' is'} not connected to roads (coverage halved)`, 'Build a road from the station to the network.', discEmerg);
      const dmg = []; G().eachBuilding(S, (b) => { if (b.damagedUntil > S.time) dmg.push(b); });
      if (dmg.length) add(3, '🔥', `${dmg.length} building${dmg.length > 1 ? 's are' : ' is'} closed for repairs`, 'Repair from the building panel, or wait. Fire Stations and Flood Barriers prevent this.', dmg);
      const D = R.totals && R.totals.demand;
      if (D && D.need > 0 && D.shopRatio < 0.85) add(2, '👥', `Shops only have ${Math.round(D.shopRatio * 100)}% of the customers they need`, 'Build more homes (or hotels for tourists) before more shops.');
      if (D && D.jobs > 0 && D.workRatio < 0.85) add(2, '👷', `Workplaces are only ${Math.round(D.workRatio * 100)}% staffed`, 'Build more homes — residents anywhere in the city can commute.');
      const hd = Citizens.housingDemand(S, R);
      if (hd >= 8) add(1, '🏠', `${hd} people want to move to your city`, 'Your city is popular! Build more homes to welcome them.');
      W.sort((a, b) => b.sev - a.sev);
      R.warnings = W;
    },
  };
  TE.Citizens = Citizens;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
