/* =====================================================================
   RENDER — LIVING CITY BUILDINGS
   Drawings for the bridges, waterfront, transport, energy, schools,
   sports and the newer homes and shops. Uses the drawing kit from
   render.js. Every function gets (gx, gy, building|null, {seed, lvl, rot}):
   rot 0 puts the front on the lower-left face, rot 1 on the lower-right.
   ===================================================================== */
(function (TE) {
  'use strict';
  const K = TE.Render.kit;
  const { P, poly, prism, quad, windows, hipRoof, gableRoof, cylinder, circle, treeAt, person, sign, awning, lightGlow, shade, hash } = K;
  const G = () => TE.Game;
  const faces = (f, o) => (o.rot ? [f.R, f.L] : [f.L, f.R]);
  const nb = (b, dx, dy) => (b && TE.S ? G().tile(TE.S, b.x + dx, b.y + dy) : null);
  const isWaterAt = (b, dx, dy) => { const t = nb(b, dx, dy); return !!(t && (t.water || t.f === 'pond')); };
  const crossesX = (b) => { // bridges run along x unless water/land suggests y
    if (!b || !TE.S) return true;
    const road = (dx, dy) => { const o = G().buildingAt(TE.S, b.x + dx, b.y + dy); return o && G().isWalkway(o.type); };
    if (road(1, 0) || road(-1, 0)) return true;
    if (road(0, 1) || road(0, -1)) return false;
    return !(isWaterAt(b, 1, 0) && isWaterAt(b, -1, 0));
  };
  const CAR_COLORS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#ffffff', '#ffb703', '#8338ec', '#264653'];
  function parkedCar(gx, gy, alongX, col) {
    const lx = alongX ? 0.13 : 0.07, ly = alongX ? 0.07 : 0.13;
    prism(gx - lx, gy - ly, gx + lx, gy + ly, 0, 4, col, { outline: false });
    prism(gx - lx * 0.55, gy - ly * 0.55, gx + lx * 0.55, gy + ly * 0.55, 4, 6.5, '#cfe8ff', { outline: false });
  }
  function bench(gx, gy) {
    const [x, y] = P(gx, gy); const c = K.ctx();
    c.fillStyle = '#9c6644'; c.fillRect(x - 4, y - 4, 8, 2); c.fillRect(x - 4, y - 7, 8, 1.5);
    c.fillStyle = '#5c3d2e'; c.fillRect(x - 3.5, y - 2, 1, 2); c.fillRect(x + 2.5, y - 2, 1, 2);
  }
  function lamp(gx, gy) {
    const [x, y] = P(gx, gy); const c = K.ctx();
    c.fillStyle = '#343a40'; c.fillRect(x - 0.6, y - 16, 1.2, 16);
    const on = K.night() > 0.15;
    circle(x, y - 17, 1.8, on ? '#fff3b0' : '#dee2e6');
    if (on) { lightGlow(x, y - 15, 16, 'rgba(255,236,150,0.5)'); }
  }
  function sail(gx, gy, z, seed, scale) {
    const t = K.t(), bob = Math.sin(t * 2 + seed * 9) * 1.2;
    const [x, y] = P(gx, gy, z); const c = K.ctx(); const s = scale || 1;
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - 7 * s, y + bob); c.lineTo(x + 7 * s, y + bob); c.lineTo(x + 5 * s, y + 3 * s + bob); c.lineTo(x - 5 * s, y + 3 * s + bob); c.closePath(); c.fill();
    c.fillStyle = seed < 0.5 ? '#1d3557' : '#e63946'; c.fillRect(x - 6 * s, y + 0.5 * s + bob, 12 * s, 1.2 * s);
    c.fillStyle = '#6c757d'; c.fillRect(x - 0.4, y - 16 * s + bob, 0.8, 16 * s);
    poly([[x + 0.5, y - 15 * s + bob], [x + 0.5, y - 2 * s + bob], [x + 7 * s, y - 2.5 * s + bob]], '#f8f9fa');
  }

  const DRAW = {
    /* ----- Roads drawn in the ground pass; these are no-ops ----- */
    avenue() {}, bikelane() {}, roundabout() {}, path() {},

    bridge(gx, gy, b) {
      const ax = crossesX(b);
      const [x0, y0, x1, y1] = ax ? [gx, gy + 0.12, gx + 1, gy + 0.88] : [gx + 0.12, gy, gx + 0.88, gy + 1];
      // pillar
      prism(gx + 0.4, gy + 0.4, gx + 0.6, gy + 0.6, -4, 7, '#adb5bd');
      const f = prism(x0, y0, x1, y1, 7, 10, '#6c757d', { top: '#4a4e69' });
      void f;
      // lane markings
      const c = K.ctx(); c.strokeStyle = 'rgba(255,230,120,0.9)'; c.lineWidth = 0.9; c.setLineDash([3, 3]); c.beginPath();
      const p0 = ax ? P(gx, gy + 0.5, 10) : P(gx + 0.5, gy, 10), p1 = ax ? P(gx + 1, gy + 0.5, 10) : P(gx + 0.5, gy + 1, 10);
      c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke(); c.setLineDash([]);
      // railings
      if (ax) { prism(gx, gy + 0.08, gx + 1, gy + 0.14, 10, 14, '#dee2e6'); prism(gx, gy + 0.86, gx + 1, gy + 0.92, 10, 14, '#dee2e6'); }
      else { prism(gx + 0.08, gy, gx + 0.14, gy + 1, 10, 14, '#dee2e6'); prism(gx + 0.86, gy, gx + 0.92, gy + 1, 10, 14, '#dee2e6'); }
      if (K.night() > 0.2) { const [lx, ly] = P(gx + 0.5, gy + 0.5, 16); lightGlow(lx, ly, 14, 'rgba(255,236,150,0.45)'); }
    },
    footbridge(gx, gy, b) {
      const ax = crossesX(b);
      const [x0, y0, x1, y1] = ax ? [gx, gy + 0.32, gx + 1, gy + 0.68] : [gx + 0.32, gy, gx + 0.68, gy + 1];
      prism(gx + 0.45, gy + 0.45, gx + 0.55, gy + 0.55, -3, 8, '#8d6e63');
      prism(x0, y0, x1, y1, 8, 10, '#a47148', { top: '#c08552' });
      const c = K.ctx(); c.strokeStyle = 'rgba(90,60,40,0.5)'; c.lineWidth = 0.6;
      for (let k = 1; k < 6; k++) { const a = ax ? P(gx + k / 6, y0, 10) : P(x0, gy + k / 6, 10), bb = ax ? P(gx + k / 6, y1, 10) : P(x1, gy + k / 6, 10); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bb[0], bb[1]); c.stroke(); }
      if (ax) { prism(gx, y0 - 0.03, gx + 1, y0, 10, 15, '#6f4518'); prism(gx, y1, gx + 1, y1 + 0.03, 10, 15, '#6f4518'); }
      else { prism(x0 - 0.03, gy, x0, gy + 1, 10, 15, '#6f4518'); prism(x1, gy, x1 + 0.03, gy + 1, 10, 15, '#6f4518'); }
    },
    promenade(gx, gy, b, o) {
      poly([P(gx, gy), P(gx + 1, gy), P(gx + 1, gy + 1), P(gx, gy + 1)], '#e9dcc9');
      const c = K.ctx(); c.strokeStyle = 'rgba(160,130,100,0.35)'; c.lineWidth = 0.6;
      for (let k = 1; k < 4; k++) {
        let a = P(gx + k / 4, gy), d = P(gx + k / 4, gy + 1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke();
        a = P(gx, gy + k / 4); d = P(gx + 1, gy + k / 4); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke();
      }
      // railing on the water sides
      if (isWaterAt(b, 0, -1)) prism(gx, gy, gx + 1, gy + 0.05, 0, 5, '#495057', { outline: false });
      if (isWaterAt(b, -1, 0)) prism(gx, gy, gx + 0.05, gy + 1, 0, 5, '#495057', { outline: false });
      if (isWaterAt(b, 0, 1)) prism(gx, gy + 0.95, gx + 1, gy + 1, 0, 5, '#495057', { outline: false });
      if (isWaterAt(b, 1, 0)) prism(gx + 0.95, gy, gx + 1, gy + 1, 0, 5, '#495057', { outline: false });
      treeAt(gx + 0.3, gy + 0.3, 0.45, o.seed);
      bench(gx + 0.7, gy + 0.6);
      lamp(gx + 0.25, gy + 0.75);
      const t = K.t();
      for (let i = 0; i < 2; i++) {
        const u = 0.5 + Math.sin(t * 0.4 + i * 3 + o.seed * 5) * 0.35;
        const [px, py] = P(gx + u, gy + 0.45 + i * 0.15);
        person(px, py, ['#e76f51', '#3a86ff'][i], t * 8 + i);
      }
    },
    waterpark(gx, gy, b, o) {
      poly([P(gx + 0.03, gy + 0.03), P(gx + 0.97, gy + 0.03), P(gx + 0.97, gy + 0.97), P(gx + 0.03, gy + 0.97)], '#74c69d');
      // sandy beach along the water
      [[0, -1, [gx, gy, gx + 1, gy + 0.3]], [-1, 0, [gx, gy, gx + 0.3, gy + 1]], [0, 1, [gx, gy + 0.7, gx + 1, gy + 1]], [1, 0, [gx + 0.7, gy, gx + 1, gy + 1]]].forEach(([dx, dy, r]) => {
        if (isWaterAt(b, dx, dy) || !b) poly([P(r[0], r[1]), P(r[2], r[1]), P(r[2], r[3]), P(r[0], r[3])], '#f1dca7');
      });
      treeAt(gx + 0.3, gy + 0.65, 0.7, o.seed, '#2d6a4f');
      treeAt(gx + 0.75, gy + 0.75, 0.55, o.seed + 0.3);
      bench(gx + 0.55, gy + 0.35);
      const [ux, uy] = P(gx + 0.7, gy + 0.3); const c = K.ctx();
      c.fillStyle = '#555'; c.fillRect(ux - 0.5, uy - 10, 1, 10);
      poly([[ux - 6, uy - 9], [ux + 6, uy - 9], [ux, uy - 13]], '#ff006e');
      const t = K.t();
      for (let i = 0; i < 3; i++) { const a = t * 0.3 + i * 2 + o.seed * 4; const [px, py] = P(gx + 0.5 + Math.cos(a) * 0.3, gy + 0.5 + Math.sin(a * 1.2) * 0.3); person(px, py, ['#ffb703', '#8338ec', '#2a9d8f'][i], t * 8 + i); }
    },
    marina(gx, gy, b, o) {
      // pier from the land side
      const land = [[0, -1], [-1, 0], [0, 1], [1, 0]].find(([dx, dy]) => { const t = nb(b, dx, dy); return t && !t.water; }) || [0, 1];
      const alongX = land[0] !== 0;
      if (alongX) prism(gx, gy + 0.42, gx + 1, gy + 0.58, 1, 3, '#a47148', { top: '#c08552' });
      else prism(gx + 0.42, gy, gx + 0.58, gy + 1, 1, 3, '#a47148', { top: '#c08552' });
      prism(gx + 0.15, gy + 0.15, gx + 0.85, gy + 0.25, 1, 3, '#a47148', { top: '#c08552' });
      sail(alongX ? gx + 0.3 : gx + 0.25, alongX ? gy + 0.72 : gy + 0.4, 1, o.seed, 0.8);
      sail(alongX ? gx + 0.7 : gx + 0.75, alongX ? gy + 0.72 : gy + 0.65, 1, o.seed + 0.5, 0.7);
      const [fx, fy] = P(gx + 0.15, gy + 0.2, 3); const c = K.ctx();
      c.fillStyle = '#495057'; c.fillRect(fx - 0.5, fy - 14, 1, 14);
      poly([[fx + 0.5, fy - 14], [fx + 8, fy - 12 + Math.sin(K.t() * 4)], [fx + 0.5, fy - 10]], '#00b4d8');
    },
    floodbarrier(gx, gy, b) {
      const sides = [[0, -1, [gx, gy, gx + 1, gy + 0.18]], [-1, 0, [gx, gy, gx + 0.18, gy + 1]], [0, 1, [gx, gy + 0.82, gx + 1, gy + 1]], [1, 0, [gx + 0.82, gy, gx + 1, gy + 1]]];
      let any = false;
      sides.forEach(([dx, dy, r]) => {
        if (!isWaterAt(b, dx, dy)) return; any = true;
        const f = prism(r[0], r[1], r[2], r[3], 0, 11, '#ced4da');
        for (let k = 0; k < 5; k++) quad(f.L, k / 5, 0.75, k / 5 + 0.1, 0.92, '#ffb703');
      });
      if (!any) { const f = prism(gx, gy + 0.4, gx + 1, gy + 0.6, 0, 11, '#ced4da'); for (let k = 0; k < 5; k++) quad(f.L, k / 5, 0.75, k / 5 + 0.1, 0.92, '#ffb703'); }
      // sandbags
      for (let k = 0; k < 3; k++) { const [x, y] = P(gx + 0.3 + k * 0.2, gy + 0.55); K.ctx().beginPath(); K.ctx().ellipse(x, y - 2, 4, 2.4, 0, 0, Math.PI * 2); K.ctx().fillStyle = '#d4a373'; K.ctx().fill(); }
    },

    /* ----- Transport ----- */
    busstop(gx, gy, b, o) {
      const [ux, uy] = o.rot ? [gx + 0.75, gy + 0.5] : [gx + 0.5, gy + 0.75];
      prism(ux - 0.22, uy - 0.1, ux + 0.22, uy + 0.1, 0, 1, '#adb5bd', { outline: false });
      const f = prism(ux - 0.2, uy - 0.08, ux + 0.2, uy - 0.04, 1, 12, 'rgba(173,216,230,0.7)', { outline: false });
      void f;
      prism(ux - 0.24, uy - 0.12, ux + 0.24, uy + 0.12, 12, 13.5, '#ffb703');
      bench(ux, uy);
      const [sx, sy] = P(gx + 0.25, gy + 0.25); const c = K.ctx();
      c.fillStyle = '#495057'; c.fillRect(sx - 0.6, sy - 18, 1.2, 18);
      circle(sx, sy - 19, 4, '#2a9d8f'); c.fillStyle = '#fff'; c.font = 'bold 5px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BUS', sx, sy - 19);
      treeAt(gx + 0.25, gy + 0.75, 0.4, o.seed);
      if (K.night() > 0.25) { const [lx, ly] = P(ux, uy, 11); lightGlow(lx, ly, 10, 'rgba(255,240,180,0.6)'); }
    },
    trainstation(gx, gy, b, o) {
      const ax = !o.rot;
      // tracks
      const c = K.ctx();
      if (ax) { poly([P(gx, gy + 0.62), P(gx + 1, gy + 0.62), P(gx + 1, gy + 0.98), P(gx, gy + 0.98)], '#8d8d8d'); }
      else { poly([P(gx + 0.62, gy), P(gx + 0.98, gy), P(gx + 0.98, gy + 1), P(gx + 0.62, gy + 1)], '#8d8d8d'); }
      c.strokeStyle = '#5c4033'; c.lineWidth = 1;
      for (let k = 0; k < 8; k++) { const a = ax ? P(gx + k / 8, gy + 0.64) : P(gx + 0.64, gy + k / 8), d = ax ? P(gx + k / 8, gy + 0.96) : P(gx + 0.96, gy + k / 8); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); }
      // platform + station hall
      if (ax) prism(gx + 0.02, gy + 0.42, gx + 0.98, gy + 0.6, 0, 3, '#dee2e6'); else prism(gx + 0.42, gy + 0.02, gx + 0.6, gy + 0.98, 0, 3, '#dee2e6');
      const f = ax ? prism(gx + 0.08, gy + 0.05, gx + 0.92, gy + 0.4, 0, 22, '#e9c46a') : prism(gx + 0.05, gy + 0.08, gx + 0.4, gy + 0.92, 0, 22, '#e9c46a');
      const [A, Bs] = faces(f, o);
      windows(A, 5, 1, { v0: 0.35, v1: 0.85, color: '#bde0fe', seed: 3 });
      quad(A, 0.4, 0, 0.6, 0.55, '#6d597a');
      windows(Bs, 2, 1, { v0: 0.35, v1: 0.85, color: '#a2d2ff', seed: 4 });
      hipRoof(ax ? gx + 0.05 : gx + 0.02, ax ? gy + 0.02 : gy + 0.05, ax ? gx + 0.95 : gx + 0.43, ax ? gy + 0.43 : gy + 0.95, 22, 8, '#9d0208');
      // canopy
      if (ax) prism(gx + 0.05, gy + 0.42, gx + 0.95, gy + 0.62, 13, 14.5, '#adb5bd', { outline: false }); else prism(gx + 0.42, gy + 0.05, gx + 0.62, gy + 0.95, 13, 14.5, '#adb5bd', { outline: false });
      // train: arrives, waits, leaves
      const ph = (K.t() * 0.08 + o.seed) % 1;
      const off = ph < 0.3 ? (0.3 - ph) * 3 : ph > 0.7 ? -(ph - 0.7) * 3 : 0;
      if (Math.abs(off) < 0.9) {
        const k0 = ax ? gx + 0.08 + off : gx + 0.69, k1 = ax ? gy + 0.69 : gy + 0.08 + off;
        const tr = ax ? prism(Math.max(gx - 0.1, k0), k1, Math.min(gx + 1.1, k0 + 0.85), k1 + 0.24, 1, 12, '#f8f9fa', { top: '#e9ecef' })
          : prism(k0, Math.max(gy - 0.1, k1), k0 + 0.24, Math.min(gy + 1.1, k1 + 0.85), 1, 12, '#f8f9fa', { top: '#e9ecef' });
        quad(ax ? tr.L : tr.R, 0, 0.45, 1, 0.75, '#4361ee');
        windows(ax ? tr.L : tr.R, 5, 1, { v0: 0.5, v1: 0.72, color: '#cfe8ff', seed: 7, gap: 0.2, litChance: 0.9 });
      }
      const [sx, sy] = P(gx + 0.5, gy + 0.2, 30); sign(sx, sy, 'STATION', '#9d0208', '#fff', 6);
    },
    parkinglot(gx, gy, b) {
      poly([P(gx + 0.04, gy + 0.04), P(gx + 0.96, gy + 0.04), P(gx + 0.96, gy + 0.96), P(gx + 0.04, gy + 0.96)], '#5c5f6e');
      const c = K.ctx(); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.8;
      for (let k = 0; k <= 4; k++) { const a = P(gx + 0.1 + k * 0.2, gy + 0.08), d = P(gx + 0.1 + k * 0.2, gy + 0.38); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); const a2 = P(gx + 0.1 + k * 0.2, gy + 0.62), d2 = P(gx + 0.1 + k * 0.2, gy + 0.92); c.beginPath(); c.moveTo(a2[0], a2[1]); c.lineTo(d2[0], d2[1]); c.stroke(); }
      const use = b && TE.S && TE.S.R && TE.S.R.lots && TE.S.R.lots[b.uid] ? TE.S.R.lots[b.uid].used / TE.S.R.lots[b.uid].cap : 0.5;
      const cars = Math.round(use * 8);
      for (let k = 0; k < 8; k++) {
        if (k >= cars) continue;
        const row = k < 4 ? 0.23 : 0.77, col = k % 4;
        parkedCar(gx + 0.2 + col * 0.2, gy + row, false, CAR_COLORS[Math.floor(hash((b ? b.uid : 1) * 31 + k) * CAR_COLORS.length)]);
      }
      const [sx, sy] = P(gx + 0.04, gy + 0.5); c.fillStyle = '#495057'; c.fillRect(sx - 0.6, sy - 14, 1.2, 14);
      K.roundRect(sx - 5, sy - 22, 10, 10, 2); c.fillStyle = '#1d4ed8'; c.fill(); c.fillStyle = '#fff'; c.font = 'bold 8px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', sx, sy - 16.5);
    },
    garage(gx, gy, b, o) {
      const floors = 4;
      for (let k = 0; k < floors; k++) {
        const z = k * 9;
        prism(gx + 0.08, gy + 0.08, gx + 0.92, gy + 0.92, z, z + 1.5, '#ced4da');
        const f = prism(gx + 0.08, gy + 0.08, gx + 0.92, gy + 0.92, z + 1.5, z + 2.2, '#adb5bd', { noTop: true });
        void f;
        // cars visible on each deck
        for (let c2 = 0; c2 < 3; c2++) if (hash((b ? b.uid : 3) * 13 + k * 7 + c2) < 0.7) {
          const [x, y] = P(gx + 0.25 + c2 * 0.25, gy + 0.85, z + 1.5);
          K.ctx().fillStyle = CAR_COLORS[(k * 3 + c2) % CAR_COLORS.length]; K.ctx().fillRect(x - 3, y - 4, 6, 3.5);
        }
        // columns
        [[0.1, 0.9], [0.5, 0.9], [0.9, 0.9], [0.9, 0.5]].forEach(([u, v]) => prism(gx + u - 0.02, gy + v - 0.02, gx + u + 0.02, gy + v + 0.02, z + 2.2, z + 9, '#868e96', { outline: false }));
      }
      prism(gx + 0.08, gy + 0.08, gx + 0.92, gy + 0.92, floors * 9, floors * 9 + 1.5, '#ced4da');
      const [sx, sy] = P(gx + 0.5, gy + 0.5, floors * 9 + 2); sign(sx, sy - 2, 'P', '#1d4ed8', '#fff', 9);
    },
    charger(gx, gy, b, o) {
      poly([P(gx + 0.1, gy + 0.1), P(gx + 0.9, gy + 0.1), P(gx + 0.9, gy + 0.9), P(gx + 0.1, gy + 0.9)], '#5c5f6e');
      prism(gx + 0.1, gy + 0.1, gx + 0.9, gy + 0.3, 14, 15.5, '#2b9348');
      [[0.15, 0.2], [0.85, 0.2]].forEach(([u, v]) => prism(gx + u - 0.03, gy + v - 0.03, gx + u + 0.03, gy + v + 0.03, 0, 14, '#adb5bd', { outline: false }));
      [0.35, 0.65].forEach((u, k) => {
        const f = prism(gx + u - 0.06, gy + 0.32, gx + u + 0.06, gy + 0.42, 0, 9, '#38b000');
        quad(f.L, 0.2, 0.5, 0.8, 0.8, K.night() > 0.2 || Math.sin(K.t() * 3 + k) > 0 ? '#ccff33' : '#2b9348', K.night() > 0.2 ? 'rgba(204,255,51,0.8)' : null);
        parkedCar(gx + u, gy + 0.7, false, ['#ffffff', '#4cc9f0'][k]);
      });
    },

    /* ----- Homes ----- */
    townhouse(gx, gy, b, o) {
      const cols = ['#bc4749', '#e5989b', '#457b9d', '#e9c46a', '#6d6875'], wall = cols[Math.floor(o.seed * cols.length)];
      const h = 26 + (Math.min(o.lvl, 4) - 1) * 6;
      const [x0, y0, x1, y1] = o.rot ? [gx + 0.12, gy + 0.22, gx + 0.88, gy + 0.78] : [gx + 0.22, gy + 0.12, gx + 0.78, gy + 0.88];
      const f = prism(x0, y0, x1, y1, 0, h, wall);
      const [A, Bs] = faces(f, o);
      const floors = Math.floor(h / 9);
      windows(A, 2, floors, { v0: 0.25, v1: 0.95, color: '#f1faee', seed: o.seed * 30, gap: 0.45 });
      quad(A, 0.08, 0, 0.32, 0.22, '#3d405b');
      windows(Bs, 2, floors, { v0: 0.2, v1: 0.95, color: '#e9ecef', seed: o.seed * 31, gap: 0.5 });
      // stoop
      const st = A(0.2, 0); prism(...(o.rot ? [x1, y1 - 0.25, x1 + 0.08, y1 - 0.05] : [x0 + 0.05, y1, x0 + 0.25, y1 + 0.08]), 0, 3, '#adb5bd', { outline: false });
      void st;
      gableRoof(x0 - 0.03, y0 - 0.03, x1 + 0.03, y1 + 0.03, h, 9, '#3d405b', wall);
      if (o.lvl >= 3) treeAt(o.rot ? gx + 0.5 : gx + 0.9, o.rot ? gy + 0.92 : gy + 0.5, 0.35, o.seed);
    },
    tower(gx, gy, b, o) {
      const h = 96 + o.lvl * 12;
      const f = prism(gx + 0.16, gy + 0.16, gx + 0.84, gy + 0.84, 0, h, '#f2e9e4', { left: '#e0d5cf', right: '#bcaaa4', top: '#f8f1ee' });
      const [A, Bs] = faces(f, o);
      const rows = Math.floor(h / 8);
      windows(A, 3, rows, { color: '#9bd0f5', seed: o.seed * 61, gap: 0.2, v0: 0.04, v1: 0.98, litChance: 0.65 });
      windows(Bs, 3, rows, { color: '#7fb5dc', seed: o.seed * 62, gap: 0.2, v0: 0.04, v1: 0.98, litChance: 0.65 });
      for (let r = 1; r < rows; r += 2) quad(A, 0, r / rows, 1, r / rows + 0.012, '#ffffff');
      prism(gx + 0.22, gy + 0.22, gx + 0.78, gy + 0.78, h, h + 3, '#95d5b2');
      K.ctx().save(); K.ctx().translate(0, -h - 3); treeAt(gx + 0.45, gy + 0.45, 0.4, o.seed); treeAt(gx + 0.62, gy + 0.62, 0.3, o.seed + 0.2); K.ctx().restore();
    },

    /* ----- Shops ----- */
    shop(gx, gy, b, o) {
      const h = 15 + (o.lvl >= 3 ? 7 : 0);
      const f = prism(gx + 0.2, gy + 0.2, gx + 0.8, gy + 0.8, 0, h, '#fefae0');
      const [A, Bs] = faces(f, o);
      quad(A, 0.1, 0.06, 0.62, 0.6, '#caf0f8', K.night() > 0.25 ? 'rgba(255,240,180,0.9)' : null);
      quad(A, 0.7, 0, 0.9, 0.6, '#264653');
      awning(A, 0.62, '#219ebc');
      windows(Bs, 1, 1, { v0: 0.3, v1: 0.7, color: '#bde0fe', seed: 5, u0: 0.3, u1: 0.7 });
      prism(gx + 0.18, gy + 0.18, gx + 0.82, gy + 0.82, h, h + 2, '#219ebc');
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 2); sign(x, y - 2, 'SHOP', '#023047', '#ffb703', 6);
    },
    supermarket(gx, gy, b, o) {
      const h = 17 + (o.lvl >= 3 ? 4 : 0);
      const f = prism(gx + 0.05, gy + 0.05, gx + 0.95, gy + 0.95, 0, h, '#f1faee');
      const [A, Bs] = faces(f, o);
      quad(A, 0.05, 0.05, 0.95, 0.55, '#a8dadc', K.night() > 0.25 ? 'rgba(220,250,255,0.9)' : null);
      quad(A, 0.42, 0, 0.58, 0.5, '#e9ecef');
      quad(A, 0, 0.66, 1, 0.92, '#e63946');
      quad(Bs, 0, 0.66, 1, 0.92, '#c1121f');
      prism(gx + 0.03, gy + 0.03, gx + 0.97, gy + 0.97, h, h + 2, '#dee2e6');
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 2); sign(x, y - 3, 'SUPERMARKET', '#e63946', '#fff', 6);
      // shopping carts
      for (let k = 0; k < 3; k++) { const [cx, cy] = o.rot ? P(gx + 1.0, gy + 0.3 + k * 0.12) : P(gx + 0.3 + k * 0.12, gy + 1.0); K.ctx().strokeStyle = '#adb5bd'; K.ctx().lineWidth = 0.8; K.ctx().strokeRect(cx - 2, cy - 5, 4, 3); }
    },

    /* ----- Industry & energy ----- */
    farm(gx, gy, b, o) {
      const crops = ['#a7c957', '#e9c46a', '#6a994e'];
      for (let k = 0; k < 5; k++) {
        const col = crops[(k + Math.floor(o.seed * 3)) % 3];
        poly([P(gx + 0.04, gy + 0.04 + k * 0.18), P(gx + 0.6, gy + 0.04 + k * 0.18), P(gx + 0.6, gy + 0.18 + k * 0.18), P(gx + 0.04, gy + 0.18 + k * 0.18)], col);
      }
      const f = prism(gx + 0.64, gy + 0.18, gx + 0.94, gy + 0.6, 0, 13, '#ae2012');
      quad(f.L, 0.25, 0, 0.75, 0.7, '#f1faee'); quad(f.L, 0.3, 0.05, 0.7, 0.65, '#9b2226');
      gableRoof(gx + 0.62, gy + 0.16, gx + 0.96, gy + 0.62, 13, 7, '#495057', '#ae2012');
      cylinder(gx + 0.8, gy + 0.78, 0, 24, 4, '#ced4da');
      const [dx, dy] = P(gx + 0.8, gy + 0.78, 24); circle(dx, dy - 1, 4, '#adb5bd');
      const t = K.t(); const [px, py] = P(gx + 0.15 + (Math.sin(t * 0.3 + o.seed * 6) + 1) * 0.2, gy + 0.5);
      person(px, py, '#3a86ff', t * 6);
    },
    powerplant(gx, gy, b, o) {
      // cooling tower (hyperboloid)
      const [cx, cy] = P(gx + 0.35, gy + 0.4); const c = K.ctx();
      const H = 46, r0 = 13, rm = 8, r1 = 10;
      c.beginPath(); c.moveTo(cx - r0, cy); c.quadraticCurveTo(cx - rm * 0.6, cy - H * 0.6, cx - r1, cy - H); c.lineTo(cx + r1, cy - H);
      c.quadraticCurveTo(cx + rm * 0.6, cy - H * 0.6, cx + r0, cy); c.closePath();
      const g = c.createLinearGradient(cx - r0, 0, cx + r0, 0); g.addColorStop(0, '#e9ecef'); g.addColorStop(1, '#adb5bd'); c.fillStyle = g; c.fill();
      c.beginPath(); c.ellipse(cx, cy - H, r1, r1 * 0.45, 0, 0, Math.PI * 2); c.fillStyle = '#868e96'; c.fill();
      c.beginPath(); c.ellipse(cx, cy, r0, r0 * 0.45, 0, 0, Math.PI); c.fillStyle = '#ced4da'; c.fill();
      if (b) b._steam = [cx, cy - H];
      const f = prism(gx + 0.55, gy + 0.45, gx + 0.95, gy + 0.95, 0, 16, '#8d99ae');
      windows(f.L, 3, 1, { v0: 0.4, v1: 0.8, color: '#e5e5e5', seed: 3, litChance: 0.9 });
      cylinder(gx + 0.85, gy + 0.55, 0, 52, 3, '#6c757d');
      const [sx, sy] = P(gx + 0.85, gy + 0.55, 46); c.fillStyle = '#e63946'; c.fillRect(sx - 3, sy, 6, 2);
      if (b) b._chimney = P(gx + 0.85, gy + 0.55, 52);
      const [lx, ly] = P(gx + 0.85, gy + 0.55, 52); if (Math.sin(K.t() * 3) > 0) { circle(lx, ly - 1, 1.3, '#ff006e'); lightGlow(lx, ly - 1, 6, 'rgba(255,0,110,0.7)'); }
    },
    solar(gx, gy, b, o) {
      poly([P(gx + 0.02, gy + 0.02), P(gx + 0.98, gy + 0.02), P(gx + 0.98, gy + 0.98), P(gx + 0.02, gy + 0.98)], '#b7d5a3');
      for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
        const x0 = gx + 0.06 + k * 0.47, y0 = gy + 0.06 + r * 0.23;
        poly([P(x0, y0, 2), P(x0 + 0.42, y0, 2), P(x0 + 0.42, y0 + 0.16, 7), P(x0, y0 + 0.16, 7)], '#1d3557', 'rgba(255,255,255,0.55)', 0.5);
        const glint = (Math.sin(K.t() * 0.8 + r + k * 2) + 1) / 2;
        const p = P(x0 + 0.21, y0 + 0.08, 4.5); circle(p[0], p[1], 1.5, `rgba(255,255,255,${0.15 + glint * 0.4})`);
      }
    },
    recycling(gx, gy, b, o) {
      const f = prism(gx + 0.1, gy + 0.12, gx + 0.75, gy + 0.88, 0, 18, '#52b788');
      const [A, Bs] = faces(f, o);
      quad(A, 0.2, 0, 0.8, 0.65, '#40916c');
      for (let i = 0; i < 4; i++) quad(A, 0.2, i * 0.16, 0.8, i * 0.16 + 0.05, '#2d6a4f');
      windows(Bs, 2, 1, { v0: 0.5, v1: 0.85, color: '#d8f3dc', seed: 2 });
      prism(gx + 0.08, gy + 0.1, gx + 0.77, gy + 0.9, 18, 20, '#2d6a4f');
      const [x, y] = P(gx + 0.42, gy + 0.5, 20); const c = K.ctx();
      c.save(); c.translate(x, y - 7); c.rotate(K.t() * 0.6); c.strokeStyle = '#ffffff'; c.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.arc(0, 0, 5, -0.2, 1.2); c.stroke(); }
      c.restore();
      ['#3a86ff', '#ffbe0b', '#38b000'].forEach((col, k) => prism(gx + 0.82, gy + 0.2 + k * 0.22, gx + 0.95, gy + 0.36 + k * 0.22, 0, 7, col));
    },

    /* ----- Services ----- */
    school(gx, gy, b, o) {
      const h = 22 + (o.lvl - 1) * 5;
      const f = prism(gx + 0.08, gy + 0.1, gx + 0.92, gy + 0.9, 0, h, '#c8553d');
      const [A, Bs] = faces(f, o);
      windows(A, 4, 2, { color: '#f1faee', seed: 8, v0: 0.15, gap: 0.35 });
      quad(A, 0.42, 0, 0.58, 0.4, '#3d405b');
      windows(Bs, 3, 2, { color: '#e9ecef', seed: 9, v0: 0.15, gap: 0.35 });
      hipRoof(gx + 0.06, gy + 0.08, gx + 0.94, gy + 0.92, h, 8, '#3d405b');
      // bell tower with clock
      const t = prism(gx + 0.42, gy + 0.42, gx + 0.58, gy + 0.58, h + 4, h + 16, '#f2cc8f');
      const p = t.L(0.5, 0.55); circle(p[0], p[1], 2.6, '#fff');
      hipRoof(gx + 0.4, gy + 0.4, gx + 0.6, gy + 0.6, h + 16, 6, '#3d405b');
      const [fx, fy] = P(gx + 0.95, gy + 0.1); const c = K.ctx();
      c.fillStyle = '#495057'; c.fillRect(fx - 0.5, fy - 24, 1, 24);
      poly([[fx + 0.5, fy - 24], [fx + 9, fy - 21 + Math.sin(K.t() * 4)], [fx + 0.5, fy - 18]], '#3a86ff');
      const tt = K.t(); for (let i = 0; i < 2; i++) { const [px, py] = o.rot ? P(gx + 1.0, gy + 0.3 + i * 0.3) : P(gx + 0.3 + i * 0.3, gy + 1.0); person(px, py, ['#ffb703', '#ef476f'][i], tt * 9 + i); }
    },
    library(gx, gy, b, o) {
      const h = 20 + (o.lvl - 1) * 4;
      prism(gx + 0.06, gy + 0.06, gx + 0.94, gy + 0.94, 0, 3, '#e9ecef');
      const f = prism(gx + 0.14, gy + 0.14, gx + 0.86, gy + 0.86, 3, h, '#f5ebe0');
      const [A, Bs] = faces(f, o);
      for (let i = 0; i < 5; i++) quad(A, 0.06 + i * 0.2, 0, 0.12 + i * 0.2, 1, '#ffffff');
      windows(A, 4, 1, { v0: 0.2, v1: 0.85, color: '#6c584c', seed: 4, gap: 0.55, u0: 0.12, u1: 0.95 });
      windows(Bs, 3, 1, { v0: 0.25, v1: 0.8, color: '#a2d2ff', seed: 5, gap: 0.4 });
      gableRoof(gx + 0.12, gy + 0.12, gx + 0.88, gy + 0.88, h, 9, '#d6ccc2', '#f5ebe0');
      const [x, y] = P(gx + 0.5, gy + 0.5, h + 9); sign(x, y - 2, 'LIBRARY', '#6c584c', '#fff', 6);
    },

    /* ----- Recreation ----- */
    playground(gx, gy, b, o) {
      poly([P(gx + 0.06, gy + 0.06), P(gx + 0.94, gy + 0.06), P(gx + 0.94, gy + 0.94), P(gx + 0.06, gy + 0.94)], '#80b918');
      poly([P(gx + 0.15, gy + 0.15), P(gx + 0.85, gy + 0.15), P(gx + 0.85, gy + 0.6), P(gx + 0.15, gy + 0.6)], '#f1dca7');
      // slide
      prism(gx + 0.2, gy + 0.25, gx + 0.32, gy + 0.37, 0, 14, '#ef476f');
      poly([P(gx + 0.32, gy + 0.25, 14), P(gx + 0.32, gy + 0.37, 14), P(gx + 0.6, gy + 0.37, 1), P(gx + 0.6, gy + 0.25, 1)], '#ffd166');
      // swing frame
      const c = K.ctx(); const [a1, a2] = [P(gx + 0.62, gy + 0.72, 0), P(gx + 0.88, gy + 0.72, 0)];
      c.strokeStyle = '#073b4c'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(a1[0], a1[1] - 16); c.lineTo(a2[0], a2[1] - 16); c.lineTo(a2[0], a2[1]); c.stroke();
      const sw = Math.sin(K.t() * 2.5) * 4;
      c.lineWidth = 0.7; c.beginPath(); c.moveTo((a1[0] + a2[0]) / 2, a1[1] - 16); c.lineTo((a1[0] + a2[0]) / 2 + sw, a1[1] - 5); c.stroke();
      person((a1[0] + a2[0]) / 2 + sw, a1[1] - 1, '#06d6a0', 0);
      const [kx, ky] = P(gx + 0.4 + Math.sin(K.t()) * 0.15, gy + 0.8); person(kx, ky, '#118ab2', K.t() * 10);
    },
    bench(gx, gy, b, o) {
      poly([P(gx + 0.12, gy + 0.12), P(gx + 0.88, gy + 0.12), P(gx + 0.88, gy + 0.88), P(gx + 0.12, gy + 0.88)], '#e5e0d8');
      // planter with flowers
      prism(gx + 0.18, gy + 0.18, gx + 0.48, gy + 0.48, 0, 4, '#9c6644');
      for (let i = 0; i < 6; i++) { const [x, y] = P(gx + 0.22 + (i % 3) * 0.1, gy + 0.24 + Math.floor(i / 3) * 0.14, 5); circle(x, y, 1.6, ['#ff006e', '#ffbe0b', '#ffffff', '#c77dff', '#fb5607', '#3a86ff'][(i + Math.floor(o.seed * 6)) % 6]); }
      // bench facing the street
      const c = K.ctx(); const [bx, by] = P(gx + 0.66, gy + 0.68, 0);
      c.fillStyle = '#7f5539'; c.fillRect(bx - 7, by - 5, 14, 2.2); c.fillRect(bx - 7, by - 9, 14, 1.8);
      c.fillStyle = '#343a40'; c.fillRect(bx - 6, by - 3, 1.2, 3); c.fillRect(bx + 5, by - 3, 1.2, 3);
      if (hash(Math.floor(K.t() / 9) + o.seed * 97) < 0.5) person(bx - 2, by - 3, '#457b9d', 0);
      treeAt(gx + 0.75, gy + 0.28, 0.5, o.seed);
    },
    plaza(gx, gy, b, o) {
      poly([P(gx + 0.02, gy + 0.02), P(gx + 0.98, gy + 0.02), P(gx + 0.98, gy + 0.98), P(gx + 0.02, gy + 0.98)], '#e5e0d8');
      const c = K.ctx(); c.strokeStyle = 'rgba(150,130,110,0.35)'; c.lineWidth = 0.6;
      for (let k = 1; k < 5; k++) { let a = P(gx + k / 5, gy), d = P(gx + k / 5, gy + 1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); a = P(gx, gy + k / 5); d = P(gx + 1, gy + k / 5); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); }
      const [fx, fy] = P(gx + 0.5, gy + 0.5);
      c.beginPath(); c.ellipse(fx, fy, 13, 6.5, 0, 0, Math.PI * 2); c.fillStyle = '#adb5bd'; c.fill();
      c.beginPath(); c.ellipse(fx, fy, 11, 5.2, 0, 0, Math.PI * 2); c.fillStyle = '#4cc9f0'; c.fill();
      c.fillStyle = '#ced4da'; c.fillRect(fx - 1.5, fy - 10, 3, 10);
      for (let k = 0; k < 6; k++) { const a = K.t() * 2 + k * Math.PI / 3; c.strokeStyle = 'rgba(220,245,255,0.85)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(fx, fy - 10); c.quadraticCurveTo(fx + Math.cos(a) * 6, fy - 16, fx + Math.cos(a) * 9, fy - 2 + Math.sin(a) * 2); c.stroke(); }
      [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(([u, v], k) => { prism(gx + u - 0.06, gy + v - 0.06, gx + u + 0.06, gy + v + 0.06, 0, 4, '#bc6c25', { outline: false }); const [px, py] = P(gx + u, gy + v, 4); circle(px, py - 1, 3, ['#ff006e', '#ffbe0b', '#c77dff', '#fb5607'][k]); });
      bench(gx + 0.25, gy + 0.55); bench(gx + 0.75, gy + 0.45);
      const t = K.t(); for (let i = 0; i < 3; i++) { const a = t * 0.25 + i * 2.1 + o.seed * 3; const [px, py] = P(gx + 0.5 + Math.cos(a) * 0.38, gy + 0.5 + Math.sin(a) * 0.38); person(px, py, ['#e76f51', '#457b9d', '#8338ec'][i], t * 8 + i); }
    },
    sportsfield(gx, gy, b, o) {
      poly([P(gx + 0.02, gy + 0.02), P(gx + 0.98, gy + 0.02), P(gx + 0.98, gy + 0.98), P(gx + 0.02, gy + 0.98)], '#55a630');
      for (let k = 0; k < 4; k++) poly([P(gx + 0.08 + k * 0.21, gy + 0.08), P(gx + 0.18 + k * 0.21, gy + 0.08), P(gx + 0.18 + k * 0.21, gy + 0.92), P(gx + 0.08 + k * 0.21, gy + 0.92)], '#4c9a2a');
      const c = K.ctx(); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 0.9;
      c.beginPath(); [P(gx + 0.08, gy + 0.08), P(gx + 0.92, gy + 0.08), P(gx + 0.92, gy + 0.92), P(gx + 0.08, gy + 0.92), P(gx + 0.08, gy + 0.08)].forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      c.beginPath(); const m0 = P(gx + 0.5, gy + 0.08), m1 = P(gx + 0.5, gy + 0.92); c.moveTo(m0[0], m0[1]); c.lineTo(m1[0], m1[1]); c.stroke();
      const [mc, md] = P(gx + 0.5, gy + 0.5); c.beginPath(); c.ellipse(mc, md, 6, 3, 0, 0, Math.PI * 2); c.stroke();
      [0.1, 0.9].forEach((u) => prism(gx + u - 0.02, gy + 0.4, gx + u + 0.02, gy + 0.6, 0, 7, '#ffffff', { noTop: false, outline: false }));
      const t = K.t(), bx = 0.5 + Math.sin(t * 1.3) * 0.3, by = 0.5 + Math.sin(t * 0.9) * 0.25;
      const [qx, qy] = P(gx + bx, gy + by); circle(qx, qy - 1, 1.3, '#ffffff');
      for (let i = 0; i < 4; i++) { const [px, py] = P(gx + bx + Math.cos(i * 1.6 + t) * 0.15, gy + by + Math.sin(i * 1.6 + t) * 0.15); person(px, py, i % 2 ? '#e63946' : '#3a86ff', t * 12 + i); }
    },
    pool(gx, gy, b, o) {
      poly([P(gx + 0.04, gy + 0.04), P(gx + 0.96, gy + 0.04), P(gx + 0.96, gy + 0.96), P(gx + 0.04, gy + 0.96)], '#e9ecef');
      prism(gx + 0.14, gy + 0.14, gx + 0.86, gy + 0.68, -3, 0, '#48cae4', { top: '#48cae4', outline: false });
      poly([P(gx + 0.16, gy + 0.16), P(gx + 0.84, gy + 0.16), P(gx + 0.84, gy + 0.66), P(gx + 0.16, gy + 0.66)], K.mix('#48cae4', '#90e0ef', (Math.sin(K.t() * 1.5) + 1) / 4));
      const c = K.ctx(); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.7; c.setLineDash([2, 2]);
      for (let k = 1; k < 4; k++) { const a = P(gx + 0.16, gy + 0.16 + k * 0.125), d = P(gx + 0.84, gy + 0.16 + k * 0.125); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); }
      c.setLineDash([]);
      const t = K.t();
      for (let i = 0; i < 3; i++) { const u = 0.2 + ((t * 0.08 + i * 0.33) % 1) * 0.6; const [sx, sy] = P(gx + u, gy + 0.22 + i * 0.16); circle(sx, sy - 1, 1.3, '#f1c27d'); }
      [0.25, 0.5, 0.75].forEach((u) => { const [lx, ly] = P(gx + u, gy + 0.83); c.fillStyle = '#ffffff'; c.fillRect(lx - 4, ly - 2, 8, 2); });
      const [ux, uy] = P(gx + 0.88, gy + 0.85); c.fillStyle = '#555'; c.fillRect(ux - 0.5, uy - 11, 1, 11); poly([[ux - 6, uy - 10], [ux + 6, uy - 10], [ux, uy - 14]], '#ffbe0b');
    },
  };
  Object.assign(TE.Render.DRAW, DRAW);
  Object.assign(TE.Render.HEIGHTS, {
    bench: 20,
    bridge: 14, footbridge: 15, promenade: 18, waterpark: 22, marina: 18, floodbarrier: 12, busstop: 20, trainstation: 34,
    parkinglot: 22, garage: 40, charger: 16, townhouse: (l) => 36 + (Math.min(l, 4) - 1) * 6, tower: (l) => 100 + l * 12,
    shop: 22, supermarket: 26, farm: 26, powerplant: 54, solar: 8, recycling: 26, school: 40, library: 32,
    playground: 16, plaza: 16, sportsfield: 10, pool: 14, avenue: 2, bikelane: 2, roundabout: 2, path: 2,
  });
})(window.TE = window.TE || {});
