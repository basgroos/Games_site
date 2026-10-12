/* =====================================================================
   ECONOMY — neighbor synergies, building income, totals.
   recalc()  : full recompute; only when the city changes (S.dirty).
   refresh() : cheap per-second update (occupancy-based home income, totals).
   preview() : "what if I build X here?" without changing the city.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;
  const B = TE.BALANCE;

  function isDamaged(S, b) { return b.damagedUntil && b.damagedUntil > S.time; }

  /* Count neighbors matching a synergy rule around building b. */
  function countSources(S, b, rule) {
    let count = 0;
    const types = {};
    for (let y = b.y - rule.radius; y <= b.y + rule.radius; y++) for (let x = b.x - rule.radius; x <= b.x + rule.radius; x++) {
      if (x === b.x && y === b.y) continue;
      const nb = G().buildingAt(S, x, y);
      if (!nb || isDamaged(S, nb) || !G().matches(nb.type, rule.source)) continue;
      if (rule.distinct) { if (nb.type !== b.type) types[nb.type] = 1; continue; }
      count += (nb.perks && nb.perks.premium && (rule.per > 0 || rule.flat > 0)) ? 1.5 : 1;
    }
    return rule.distinct ? Object.keys(types).length : count;
  }

  const Economy = {
    _recalcs: 0,
    countSources,

    /* Neighbor bonuses for building b (list of {label, icon, value, kind}). */
    synergies(S, b) {
      const out = [];
      TE.SYNERGIES.forEach((rule) => {
        if (!G().matches(b.type, rule.target)) return;
        const n = countSources(S, b, rule);
        let v = 0;
        if (rule.flat != null) { if (n >= (rule.minCount || 1)) v = rule.flat; }
        else v = rule.per * Math.min(n, rule.max || 99);
        if (Math.abs(v) > 1e-6) out.push({ label: rule.label, icon: rule.icon, value: v, kind: v > 0 ? 'syn' : 'neg', count: n });
      });
      return out;
    },

    /* Full recalculation of the city. Pure with respect to money/time. */
    recalc(S) {
      const R = { b: {}, comboFx: {}, _id: ++Economy._recalcs };
      // City-wide effects from unique buildings
      R.cityHappiness = 0; R.cityIncome = 0;
      G().eachBuilding(S, (b) => {
        const ce = TE.BUILDINGS[b.type].cityEffect;
        if (ce && !isDamaged(S, b)) { R.cityHappiness += ce.happiness || 0; R.cityIncome += ce.income || 0; }
        R.b[b.uid] = {};
      });
      TE.Citizens.computeRoads(S, R);
      // Combos first: they change pollution, happiness and income
      R.combos = TE.Combos.detect(S);
      R.membership = TE.Combos.membership(R.combos);
      for (const uid in R.membership) {
        const fx = { income: 0, happiness: 0, safety: 0, pollutionMult: 1, list: [] };
        R.membership[uid].forEach((id) => {
          const c = TE.Combos.byId(id), e = c.effects;
          fx.income += e.income || 0; fx.happiness += e.happiness || 0; fx.safety += e.safety || 0;
          if (e.pollutionMult) fx.pollutionMult *= e.pollutionMult;
          fx.list.push(c);
        });
        R.comboFx[uid] = fx;
      }
      R.combos.forEach((inst) => { const c = TE.Combos.byId(inst.id); if (c.effects.cityIncome) R.cityIncome += c.effects.cityIncome; });
      TE.Transport.computeTransit(S, R);   // buses, trains, bikes
      TE.Transport.computeTraffic(S, R);   // car trips -> street congestion
      TE.Water.computeRiver(S, R);         // river pollution flows downstream
      TE.Water.computeFlood(S, R);
      TE.Utilities.computePower(S, R);
      TE.Citizens.computeFields(S, R);     // coverage, pollution, noise
      TE.Citizens.computeHomes(S, R);      // needs, happiness, neighborhoods
      TE.Transport.computeParking(S, R);
      TE.Districts.compute(S, R);
      const ev = TE.Events ? TE.Events.modifiers(S) : {};

      // Per-building income multipliers
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type], info = R.b[b.uid];
        const conn = TE.Citizens.isConnected(S, R, b);
        info.connected = conn;
        const bonuses = Economy.synergies(S, b);
        if (b.perks.marketing) bonuses.forEach((x) => { if (x.kind === 'syn') { x.value *= 1.5; x.label += ' 📣'; } });
        const ra = TE.ROAD_ACCESS[def.cat];
        if (ra) bonuses.push(conn ? { label: 'Street frontage', icon: '🛣️', value: ra.connected, kind: 'road' }
          : { label: 'No road access', icon: '🚧', value: ra.disconnected, kind: 'neg' });
        const t = S.tiles[b.y * S.size + b.x];
        if (t.r && TE.RESOURCES[t.r].applies.indexOf(b.type) >= 0) {
          bonuses.push({ label: TE.RESOURCES[t.r].name, icon: TE.RESOURCES[t.r].icon, value: TE.RESOURCES[t.r].bonus, kind: 'res' });
        }
        const fx = R.comboFx[b.uid];
        if (fx && fx.income && (def.income || def.residents)) {
          bonuses.push({ label: 'Combo: ' + fx.list.filter((c) => c.effects.income).map((c) => c.name).join(', '), icon: '✨', value: fx.income, kind: 'combo' });
        }
        if (def.residents && info.needs) {
          const air = info.needs.air;
          if (air < 60) bonuses.push({ label: 'Polluted air', icon: '💨', value: -(60 - air) * 0.006, kind: 'neg' });
        }
        const i = b.y * S.size + b.x;
        const wf = TE.WATERFRONT[b.type];
        if (wf && G().nearWater(S, b.x, b.y)) {
          const dirt = TE.Water.nearbyRiverPollution(S, R, b.x, b.y);
          bonuses.push({ label: dirt > 25 ? 'Waterfront (dirty river)' : 'Waterfront view', icon: '🌊', value: wf * Math.max(0, 1 - dirt / 120), kind: 'res' });
        }
        if (b.type === 'marina' && R.riverPol[i] > 5) bonuses.push({ label: 'Dirty water scares sailors', icon: '🤢', value: -Math.min(0.6, R.riverPol[i] / 100), kind: 'neg' });
        const db = TE.Districts.bonus(S, R, b); if (db) bonuses.push(db);
        if (!def.residents && def.income && !def.road) {
          const jam = TE.Transport.adjacentCongestion(S, R, b.x, b.y), TR = TE.TRAFFIC;
          if (jam > TR.jamStart) bonuses.push({ label: 'Traffic jams outside', icon: '🚗', value: -Math.min(TR.jamIncomePenalty, (jam - TR.jamStart) * 0.4), kind: 'neg' });
          const pk = R.parking[b.uid];
          if (pk && pk.ratio < 0.98) bonuses.push({ label: `Parking shortage (${Math.round(pk.ratio * 100)}% spaces)`, icon: '🅿️', value: -TR.parkingIncomeWeight * (1 - pk.ratio), kind: 'neg' });
          if (R.power.short && def.power) bonuses.push({ label: `Power shortage (${Math.round(R.power.ratio * 100)}%)`, icon: '⚡', value: -0.5 * (1 - R.power.ratio), kind: 'neg' });
        }
        if (ev.shopBonus && def.tags && def.tags.indexOf('shop') >= 0) bonuses.push({ label: 'Celebration crowds', icon: '🎉', value: ev.shopBonus, kind: 'event' });
        if (ev.industryIncome && def.cat === 'industrial') bonuses.push({ label: 'Production cut', icon: '⚠️', value: ev.industryIncome, kind: 'event' });
        let sum = 0; bonuses.forEach((x) => { sum += x.value; });
        info.bonuses = bonuses;
        info.mult = Math.max(0.1, 1 + sum);
        info.base = def.residents ? 0 : (def.income || 0) * B.levelIncomeMult[b.level - 1] * (b.perks.automation ? 1.3 : 1);
        info.upkeep = (def.upkeep || 0) * (def.service ? B.serviceUpkeepMult[b.level - 1] || 1 : 1 + 0.25 * (b.level - 1));
        info.damaged = isDamaged(S, b);
      });
      R.shoppingStreets = 0;
      G().eachBuilding(S, (b) => { if (R.b[b.uid].bonuses.some((x) => x.label === 'Shopping street')) R.shoppingStreets++; });
      Economy.refresh(S, R);
      TE.Citizens.advise(S, R);
      return R;
    },

    /* Income of a single building before the global multiplier. */
    rawIncome(S, R, b) {
      const def = TE.BUILDINGS[b.type], info = R.b[b.uid];
      if (!info || info.damaged) return 0;
      if (def.residents) {
        const qs = b.qs == null ? (info.quality || 50) : b.qs;
        return (b.occ || 0) * def.taxPerResident * info.mult * Math.max(0.5, 1 + (qs - 50) * B.qualityIncomeFactor);
      }
      return info.base * info.mult * Economy.demandFactor(R, def);
    },

    /* Shops need customers, workplaces need workers (city-wide pools). */
    demandFactor(R, def) {
      const D = R.totals && R.totals.demand;
      if (!D) return 1;
      if (def.customers) return D.shopFactor;
      if (def.workers) return D.workFactor;
      return 1;
    },
    computeDemand(S, R, pop) {
      let need = 0, jobs = 0, hotels = 0, tourists = 0;
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type];
        if (b.damagedUntil > S.time) return;
        const lv = 1 + 0.25 * (b.level - 1);
        if (def.customers) need += def.customers * lv;
        if (def.workers) jobs += def.workers * lv;
        if (b.type === 'hotel') hotels++;
        if (def.tourists) tourists += def.tourists;
      });
      const customers = (B.baseCustomers || 0) + pop * B.customersPerResident + hotels * B.customersPerHotel + tourists;
      const workers = pop * B.workersPerResident;
      const shopRatio = need > 0 ? customers / need : 1;
      const workRatio = jobs > 0 ? workers / jobs : 1;
      return {
        customers, need, shopRatio, workers, jobs, workRatio,
        shopFactor: Math.max(0.35, Math.min(1.1, 0.35 + 0.65 * shopRatio)),
        workFactor: Math.max(0.4, Math.min(1, 0.4 + 0.6 * workRatio)),
      };
    },

    globalMultiplier(S, R) {
      const parts = [];
      const h = R.totals ? R.totals.happiness : 50;
      const hb = (h - 50) * B.happinessIncomeFactor;
      parts.push({ label: 'City happiness', value: hb });
      if (R.cityIncome) parts.push({ label: 'Landmarks & plazas', value: R.cityIncome });
      (S.buffs || []).forEach((bf) => { if (bf.until > S.time) parts.push({ label: bf.name, value: bf.mult }); });
      let m = 1; parts.forEach((p) => { m += p.value; });
      return { mult: Math.max(0.5, m), parts };
    },

    /* Cheap update of totals (every simulated second and after recalc). */
    refresh(S, R) {
      let pop = 0, hap = 0, saf = 0, homePol = 0, cap = 0;
      R.homes.forEach((uid) => {
        const b = S.buildings[uid]; if (!b) return;
        const nd = R.b[uid].needs, occ = b.occ || 0;
        pop += occ; cap += TE.Citizens.capacity(b);
        hap += nd.happiness * occ; saf += nd.safety * occ; homePol += (100 - nd.air) * occ;
      });
      const happiness = pop > 0 ? hap / pop : 50 + (R.cityHappiness || 0);
      const safety = pop > 0 ? saf / pop : 50;
      const avgPol = pop > 0 ? homePol / pop : 0;
      const pollution = Math.max(0, Math.min(100, 0.5 * avgPol + 0.35 * Math.min(100, R.smog * 2.5) + 0.15 * (R.riverMax || 0)));
      R.totals = Object.assign(R.totals || {}, { population: pop, capacity: cap, happiness, safety, pollution, avgHomePollution: avgPol });
      R.totals.demand = Economy.computeDemand(S, R, pop);
      const gm = Economy.globalMultiplier(S, R);
      let gross = 0, upkeep = 0;
      const byCat = {};
      G().eachBuilding(S, (b) => {
        const info = R.b[b.uid]; if (!info) return;
        const inc = Economy.rawIncome(S, R, b) * gm.mult;
        info.income = inc;
        gross += inc;
        upkeep += info.upkeep || 0;
        const cat = TE.BUILDINGS[b.type].cat;
        byCat[cat] = (byCat[cat] || 0) + inc;
      });
      R.totals.gross = gross; R.totals.upkeep = upkeep; R.totals.net = gross - upkeep;
      R.totals.traffic = R.trafficStats; R.totals.power = R.power; R.totals.parking = R.parkingStats; R.totals.river = R.riverMax || 0;
      R.totals.globalMult = gm; R.totals.byCat = byCat;
      let best = 0; R.neighborhoods.forEach((n) => { best = Math.max(best, n.quality); });
      R.totals.bestQuality = best;
      return R.totals;
    },

    /* Preview a placement: income change, bonuses for the new building,
       how neighbors' bonuses change and whether it completes a combo. */
    preview(S, type, x, y) {
      const t = G().tile(S, x, y);
      if (!t || t.b || t.f) return null;
      const before = S.R;
      const uid = -2;
      const def = TE.BUILDINGS[type];
      const temp = { uid, type, x, y, level: 1, perks: {}, spent: 0, built: S.time };
      if (def.residents) { temp.occ = def.residents * 0.6; temp.qs = null; }
      S.buildings[uid] = temp; t.b = uid; S.counts[type] = (S.counts[type] || 0) + 1;
      let after;
      try { after = Economy.recalc(S); }
      finally { delete S.buildings[uid]; t.b = null; S.counts[type]--; }
      const info = after.b[uid];
      const own = info.income;
      if (def.residents && info.quality != null) temp.qs = info.quality;
      const neighbors = [];
      for (const k in after.b) {
        if (+k === uid || !before.b[k]) continue;
        const b = S.buildings[k]; if (!b) continue;
        const d = (after.b[k].income || 0) - (before.b[k].income || 0);
        if (Math.abs(d) > 0.05 && Math.max(Math.abs(b.x - x), Math.abs(b.y - y)) <= 4) neighbors.push({ uid: +k, delta: d });
      }
      const beforeCombos = {}; before.combos.forEach((c) => { beforeCombos[c.id + ':' + c.members.slice().sort().join(',')] = 1; });
      const newCombos = after.combos.filter((c) => c.members.indexOf(uid) >= 0).map((c) => c.id)
        .filter((v, i, a) => a.indexOf(v) === i);
      return {
        own, bonuses: info.bonuses, needs: info.needs, quality: info.quality,
        netDelta: after.totals.net - before.totals.net,
        happinessDelta: after.totals.happiness - before.totals.happiness,
        safetyDelta: after.totals.safety - before.totals.safety,
        pollutionDelta: after.totals.pollution - before.totals.pollution,
        neighbors, newCombos, upkeep: info.upkeep,
      };
    },

    /* Quick per-tile score for the "hot spots" hint while a building is selected. */
    hotspots(S, type) {
      const n = S.size, out = new Float32Array(n * n).fill(NaN), combo = new Uint8Array(n * n);
      const def = TE.BUILDINGS[type];
      const rules = TE.SYNERGIES.filter((r) => G().matches(type, r.target));
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const t = S.tiles[y * n + x];
        if (t.b || t.f || !G().isOwned(S, x, y) || !G().placementRule(S, type, x, y).ok) continue;
        const fake = { x, y, type, perks: {} };
        let v = 0;
        rules.forEach((rule) => {
          const c = countSources(S, fake, rule);
          if (rule.flat != null) { if (c >= (rule.minCount || 1)) v += rule.flat; } else v += rule.per * Math.min(c, rule.max || 99);
        });
        const ra = TE.ROAD_ACCESS[def.cat];
        if (ra && S.R) v += S.R.connected[y * n + x] ? ra.connected : ra.disconnected;
        if (t.r && TE.RESOURCES[t.r].applies.indexOf(type) >= 0) v += TE.RESOURCES[t.r].bonus;
        if (TE.WATERFRONT[type] && G().nearWater(S, x, y)) v += TE.WATERFRONT[type];
        if (def.residents && S.R && S.R.f) {
          const nd = TE.Citizens.needsAt(S, S.R, y * n + x);
          v += (nd.happiness - 50) / 200;
        }
        out[y * n + x] = v;
      }
      // Combo hints: only recipes that involve this building type
      const relevant = TE.COMBOS.some((c) => (c.distinctTag ? G().matches(type, 'tag:' + c.distinctTag.tag)
        : Object.keys(c.needs).some((k) => G().matches(type, k))));
      if (relevant) {
        for (let i = 0; i < n * n; i++) {
          if (isNaN(out[i])) continue;
          const ids = TE.Combos.wouldComplete(S, type, i % n, (i / n) | 0);
          if (ids.length) combo[i] = ids.some((id) => !S.discovered[id]) ? 2 : 1;
        }
      }
      return { score: out, combo };
    },
  };
  TE.Economy = Economy;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
