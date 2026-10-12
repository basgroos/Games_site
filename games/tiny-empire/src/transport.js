/* =====================================================================
   TRANSPORT — public transport coverage, car trips, road congestion
   and parking. Everything is computed per tile, no individual cars:
   each building sends its car trips onto the streets around it.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;
  const T = () => TE.TRAFFIC;
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const damaged = (S, b) => b.damagedUntil && b.damagedUntil > S.time;
  const lvlMult = (b) => 1 + 0.25 * ((b.level || 1) - 1);

  const Transport = {
    /* Transit coverage per tile: share of car trips removed by buses, trains and bikes. */
    computeTransit(S, R) {
      const n = S.size, N = n * n;
      const bus = new Float32Array(N), train = new Float32Array(N), bike = new Float32Array(N);
      G().eachBuilding(S, (b) => {
        const tr = TE.BUILDINGS[b.type].transit;
        if (!tr || damaged(S, b)) return;
        if ((tr.kind === 'bus' || tr.kind === 'train') && !R.connected[b.y * n + b.x]) return; // a stop off the network serves no one
        const arr = tr.kind === 'bus' ? bus : tr.kind === 'train' ? train : bike;
        for (let y = b.y - tr.radius; y <= b.y + tr.radius; y++) for (let x = b.x - tr.radius; x <= b.x + tr.radius; x++) {
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const i = y * n + x;
          if (tr.cut > arr[i]) arr[i] = tr.cut;
        }
      });
      const cut = new Float32Array(N), transit = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        cut[i] = Math.min(T().maxTransitCut, bus[i] + train[i] + bike[i]);
        transit[i] = Math.min(1, bus[i] / 0.25 * 0.6 + train[i] / 0.4); // 0..1 public transport quality
      }
      R.transitCut = cut; R.transit = transit; R.busCov = bus; R.trainCov = train; R.bikeCov = bike;
    },

    /* Car trips a building generates (before transit). */
    tripsOf(S, b) {
      const def = TE.BUILDINGS[b.type], t = T();
      if (damaged(S, b) || def.road || def.cat === 'nature') return 0;
      if (def.trips != null) return def.trips * lvlMult(b);
      if (def.residents) return (b.occ || 0) * t.tripsPerResident;
      let trips = 0;
      if (def.customers) trips += def.customers * lvlMult(b) * t.tripsPerCustomer;
      if (def.workers) trips += def.workers * lvlMult(b) * t.tripsPerWorker;
      if (b.type === 'hotel' || b.type === 'marina') trips += 4;
      if (def.service && ['police', 'fire', 'hospital', 'school', 'library'].indexOf(def.service.kind) >= 0) trips += 2;
      if (def.cat === 'recreation' && def.parking) trips += 2;
      return trips;
    },

    /* Spread every building's trips onto nearby streets and measure congestion. */
    computeTraffic(S, R) {
      const n = S.size, N = n * n, t = T();
      const load = new Float32Array(N), cap = new Float32Array(N), cong = new Float32Array(N);
      const ev = TE.Events ? TE.Events.modifiers(S) : {};
      G().eachBuilding(S, (b) => { const d = TE.BUILDINGS[b.type]; if (d.road && !d.road.walk) cap[b.y * n + b.x] = d.road.cap; });
      let totalTrips = 0, removed = 0;
      G().eachBuilding(S, (b) => {
        const raw = Transport.tripsOf(S, b) * (ev.tripsMult || 1);
        if (raw <= 0) return;
        const i0 = b.y * n + b.x, trips = raw * (1 - R.transitCut[i0]);
        totalTrips += raw; removed += raw - trips;
        const targets = []; let wsum = 0;
        const r = t.spreadRadius;
        for (let y = b.y - r; y <= b.y + r; y++) for (let x = b.x - r; x <= b.x + r; x++) {
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const i = y * n + x;
          if (!cap[i]) continue;
          const d = Math.abs(x - b.x) + Math.abs(y - b.y);
          const w = 1 / (d * d);
          targets.push([i, w]); wsum += w;
        }
        targets.forEach(([i, w]) => { load[i] += trips * w / wsum; });
      });
      let jammed = 0, roads = 0, wsum = 0, csum = 0;
      for (let i = 0; i < N; i++) {
        if (!cap[i]) continue;
        cong[i] = load[i] / cap[i];
        roads++;
        if (cong[i] > 1) jammed++;
        wsum += load[i]; csum += load[i] * cong[i];
      }
      R.load = load; R.roadCap = cap; R.cong = cong;
      R.trafficStats = { roads, jammed, avg: wsum > 0 ? csum / wsum : 0, trips: totalTrips, removed };
    },

    /* Worst congestion on the streets touching a tile. */
    adjacentCongestion(S, R, x, y) {
      let worst = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= S.size || ny >= S.size) return;
        worst = Math.max(worst, R.cong[ny * S.size + nx] || 0);
      });
      return worst;
    },

    /* Parking: street spaces are shared by the businesses on that street; lots and
       garages are shared by businesses within their radius. */
    parkingDemand(S, R, b) {
      const def = TE.BUILDINGS[b.type];
      if (!def.parking || damaged(S, b)) return 0;
      const cut = Math.min(T().parkingTransitCut, R.transitCut[b.y * S.size + b.x] / T().maxTransitCut * T().parkingTransitCut);
      return def.parking * lvlMult(b) * (1 - cut);
    },
    computeParking(S, R) {
      const n = S.size, dem = [], byRoad = {};
      G().eachBuilding(S, (b) => {
        const d = Transport.parkingDemand(S, R, b);
        if (d > 0) dem.push({ b, d, street: 0, lots: 0 });
      });
      // street parking
      dem.forEach((e) => {
        e.roads = [];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const rb = G().buildingAt(S, e.b.x + dx, e.b.y + dy);
          if (rb && TE.BUILDINGS[rb.type].road && TE.BUILDINGS[rb.type].road.parking) { e.roads.push(rb); byRoad[rb.uid] = (byRoad[rb.uid] || 0) + 1; }
        });
      });
      dem.forEach((e) => { e.roads.forEach((rb) => { e.street += TE.BUILDINGS[rb.type].road.parking / byRoad[rb.uid]; }); e.rem = Math.max(0, e.d - e.street); });
      // lots & garages
      const lots = [];
      G().eachBuilding(S, (b) => { const ps = TE.BUILDINGS[b.type].parkingSupply; if (ps && !damaged(S, b)) lots.push({ b, ps, used: 0 }); });
      lots.forEach((L) => {
        const users = dem.filter((e) => e.rem > 0 && cheb(e.b.x, e.b.y, L.b.x, L.b.y) <= L.ps.radius);
        const total = users.reduce((a, e) => a + e.rem, 0);
        if (!total) return;
        const k = Math.min(1, L.ps.cap / total);
        users.forEach((e) => { e.lots += e.rem * k; });
        L.used = Math.min(L.ps.cap, total);
      });
      // lots are applied in order, so cap each building at its demand
      R.parking = {};
      let need = 0, have = 0;
      dem.forEach((e) => {
        const avail = Math.min(e.d, e.street + e.lots);
        R.parking[e.b.uid] = { demand: e.d, street: e.street, lots: e.lots, ratio: avail / e.d };
        need += e.d; have += avail;
      });
      R.lots = {}; lots.forEach((L) => { R.lots[L.b.uid] = { used: L.used, cap: L.ps.cap }; });
      R.parkingStats = { need, have, ratio: need > 0 ? have / need : 1, short: dem.filter((e) => R.parking[e.b.uid].ratio < 0.9).length };
    },
  };
  TE.Transport = Transport;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
