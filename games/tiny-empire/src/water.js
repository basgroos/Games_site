/* =====================================================================
   WATER — river pollution that flows downstream, waterfront tiles,
   flood zones and flood barriers.
   The river flows from the top of the map (row 0) to the bottom.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

  const Water = {
    hasRiver(S) { return !!(S.river && S.river.length); },

    /* Pollution dumped into the river by industry, carried downstream. */
    computeRiver(S, R) {
      const n = S.size, N = n * n, RV = TE.RIVER;
      const pol = new Float32Array(N);
      R.riverPol = pol; R.riverRows = {}; R.riverMax = 0;
      if (!Water.hasRiver(S)) return;
      const ev = TE.Events ? TE.Events.modifiers(S) : {};
      const rows = {}; // y -> list of river tile indexes
      S.river.forEach((i) => { const y = (i / n) | 0; (rows[y] = rows[y] || []).push(i); });
      const dump = {}, clean = {};
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type];
        if (b.damagedUntil > S.time) return;
        // nearest river tile within 2
        let best = null, bd = 99;
        for (let y = b.y - 2; y <= b.y + 2; y++) {
          (rows[y] || []).forEach((i) => { const d = cheb(b.x, b.y, i % n, y); if (d <= 2 && d < bd) { bd = d; best = y; } });
        }
        if (best == null) return;
        if (def.emits && def.emits.pollution && (def.cat === 'industrial')) {
          const fx = R.comboFx[b.uid] || {};
          let a = def.emits.pollution[0] * RV.dumpShare * (b.perks.filters ? 0.4 : 1) * (fx.pollutionMult || 1) * (ev.industryPollution || 1);
          if (bd === 2) a *= 0.6;
          dump[best] = (dump[best] || 0) + a;
        }
        if (b.type === 'recycling') clean[best] = true;
      });
      let carry = 0;
      for (let y = 0; y < n; y++) {
        if (!rows[y]) continue;
        carry = carry * RV.decay + (dump[y] || 0);
        if (clean[y] || clean[y - 1] || clean[y + 1]) carry *= 0.5;
        carry = Math.min(100, carry);
        R.riverRows[y] = carry;
        rows[y].forEach((i) => { pol[i] = carry; });
        if (carry > R.riverMax) R.riverMax = carry;
      }
    },

    /* River pollution felt on a land tile (strongest within 2 tiles of dirty water). */
    nearbyRiverPollution(S, R, x, y) {
      let worst = 0;
      for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) {
        if (xx < 0 || yy < 0 || xx >= S.size || yy >= S.size) continue;
        const p = R.riverPol[yy * S.size + xx];
        if (p > 0) worst = Math.max(worst, p * (1 - cheb(x, y, xx, yy) / 3));
      }
      return worst;
    },

    /* Flood risk: land close to the river, unless a flood barrier protects it. */
    computeFlood(S, R) {
      const n = S.size, N = n * n, RV = TE.RIVER;
      const zone = new Uint8Array(N), safe = new Uint8Array(N);
      R.floodZone = zone; R.floodSafe = safe;
      if (!Water.hasRiver(S)) return;
      S.river.forEach((i) => {
        const rx = i % n, ry = (i / n) | 0;
        for (let y = ry - RV.floodZone; y <= ry + RV.floodZone; y++) for (let x = rx - RV.floodZone; x <= rx + RV.floodZone; x++) {
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const t = S.tiles[y * n + x];
          if (!t.water) zone[y * n + x] = 1;
        }
      });
      G().eachBuilding(S, (b) => {
        if (b.type !== 'floodbarrier') return;
        const r = RV.barrierRadius;
        for (let y = b.y - r; y <= b.y + r; y++) for (let x = b.x - r; x <= b.x + r; x++) {
          if (x >= 0 && y >= 0 && x < n && y < n) safe[y * n + x] = 1;
        }
      });
    },
    /* Buildings that a flood would close (in the zone, not protected, not water-proof). */
    floodVictims(S, R) {
      const out = [];
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type], i = b.y * S.size + b.x;
        if (!R.floodZone[i] || R.floodSafe[i]) return;
        if (def.road || def.cat === 'nature' || def.cat === 'recreation' || b.type === 'floodbarrier' || def.place === 'water') return;
        out.push(b);
      });
      return out;
    },
  };
  TE.Water = Water;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
