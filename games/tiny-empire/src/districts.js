/* =====================================================================
   UTILITIES & DISTRICTS
   - Power grid: power plants, solar farms and the Town Hall supply
     power; nearly every building uses some. Shortages hurt.
   - Districts: each 4x4 land section is labelled Downtown, Suburbs,
     Industrial Area, Waterfront… from what is built there, with a bonus.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;

  const Utilities = {
    powerUse(b) {
      const def = TE.BUILDINGS[b.type];
      if (!def.power) return 0;
      if (def.residents) return def.power * TE.BALANCE.residentCapMult[b.level - 1];
      return def.power * (1 + 0.2 * (b.level - 1));
    },
    computePower(S, R) {
      let supply = 0, demand = 0;
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type];
        if (b.damagedUntil > S.time) return;
        if (def.powerSupply) supply += def.powerSupply;
        demand += Utilities.powerUse(b);
      });
      const ratio = demand <= supply ? 1 : supply / demand;
      R.power = { supply, demand, ratio, short: ratio < 0.999 };
    },
  };

  const Districts = {
    classify(c) {
      if (c.total < 2) return null;
      if (c.industry >= 2 && c.industry >= c.homes) return 'industrial';
      if (c.river && c.waterLeisure >= 2) return 'waterfront';
      if (c.dense >= 3) return 'downtown';
      if (c.shops >= 3 && c.shops >= c.homes) return 'commercial';
      if (c.farms >= 2) return 'countryside';
      if (c.lowrise >= 3) return 'suburbs';
      return 'mixed';
    },
    compute(S, R) {
      const cs = TE.BALANCE.chunkSize, cc = G().chunkCount(S), n = S.size;
      const counts = [];
      for (let k = 0; k < cc * cc; k++) counts.push({ total: 0, homes: 0, lowrise: 0, dense: 0, industry: 0, farms: 0, shops: 0, waterLeisure: 0, river: false });
      for (let i = 0; i < n * n; i++) if (S.tiles[i].water) counts[Math.floor(((i / n) | 0) / cs) * cc + Math.floor((i % n) / cs)].river = true;
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type], tags = def.tags || [];
        if (def.road || def.cat === 'nature' || b.type === 'streetlight') return;
        const c = counts[Math.floor(b.y / cs) * cc + Math.floor(b.x / cs)];
        c.total++;
        if (def.residents) c.homes++;
        if (tags.indexOf('lowrise') >= 0) c.lowrise++;
        if (tags.indexOf('dense') >= 0 || ['office', 'mall', 'hotel', 'trainstation'].indexOf(b.type) >= 0) c.dense += (b.type === 'skyscraper' || b.type === 'tower') ? 2 : 1;
        if (def.cat === 'industrial' && ['farm', 'solar'].indexOf(b.type) < 0) c.industry++;
        if (b.type === 'farm') c.farms++;
        if (tags.indexOf('shop') >= 0) c.shops++;
        if (['restaurant', 'coffee', 'hotel', 'marina', 'promenade', 'waterpark'].indexOf(b.type) >= 0) c.waterLeisure++;
      });
      R.districts = counts.map((c, k) => ({ type: Districts.classify(c), cx: k % cc, cy: Math.floor(k / cc), counts: c }));
    },
    at(S, R, x, y) {
      if (!R.districts) return null;
      const cs = TE.BALANCE.chunkSize, cc = G().chunkCount(S);
      return R.districts[Math.floor(y / cs) * cc + Math.floor(x / cs)];
    },
    /* District bonus for one building, or null. */
    bonus(S, R, b) {
      const d = Districts.at(S, R, b.x, b.y);
      if (!d || !d.type) return null;
      const def = TE.BUILDINGS[b.type], i = b.y * S.size + b.x, D = TE.DISTRICTS[d.type];
      let v = 0;
      switch (d.type) {
        case 'downtown': if ((def.cat === 'business' || def.cat === 'commercial') && R.transitCut[i] > 0) v = 0.10; break;
        case 'suburbs': if (def.residents && R.f && R.f.noise[i] < 10) v = 0.08; break;
        case 'industrial': if (def.cat === 'industrial' && !d.counts.homes) v = 0.10; break;
        case 'waterfront': if (['restaurant', 'coffee', 'hotel', 'marina'].indexOf(b.type) >= 0) v = 0.12; break;
        case 'commercial': if ((def.tags || []).indexOf('shop') >= 0) v = 0.06; break;
        case 'countryside': if (b.type === 'farm') v = 0.10; break;
        default: break;
      }
      return v ? { label: D.name + ' district', icon: D.icon, value: v, kind: 'district' } : null;
    },
  };
  TE.Utilities = Utilities;
  TE.Districts = Districts;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
