/* Hollow Pines — procedural textures (canvas). No external assets. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { makeNoise, mulberry32, clamp, lerp } = HG.util;

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function fbm(n, x, y, oct) { let a = 0, f = 1, amp = 0.5, t = 0; for (let i = 0; i < (oct || 4); i++) { a += n(x * f, y * f) * amp; t += amp; f *= 2.03; amp *= 0.5; } return a / t; }
  // tileable fbm via wrapping coordinates into the noise lattice period
  function tfbm(n, x, y, period, oct) {
    let a = 0, f = 1, amp = 0.5, t = 0;
    for (let i = 0; i < (oct || 4); i++) {
      const p = period * f;
      const xx = ((x * f) % p + p) % p, yy = ((y * f) % p + p) % p;
      // blend across the seam
      const v = n(xx, yy);
      a += v * amp; t += amp; f *= 2; amp *= 0.5;
    }
    return a / t;
  }
  function tex(c, opts) {
    opts = opts || {};
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (opts.color !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = opts.aniso || 4;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
    return t;
  }
  function pixels(w, h, fn) {
    const c = canvas(w, h), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4; const r = fn(x, y);
      d[o] = r[0]; d[o + 1] = r[1]; d[o + 2] = r[2]; d[o + 3] = r.length > 3 ? r[3] : 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  const T = {};
  HG.makeTextures = function (world, quality) {
    const n1 = makeNoise(11), n2 = makeNoise(23), n3 = makeNoise(37);
    const rnd = mulberry32(99);
    const hi = quality === 'high';

    // ---- bark ----
    T.bark = tex(pixels(256, 512, (x, y) => {
      const f = fbm(n1, x * 0.08, y * 0.012, 4);
      const crack = Math.abs(Math.sin(x * 0.25 + fbm(n2, x * 0.05, y * 0.02, 3) * 9));
      let v = 38 + f * 50 - (crack < 0.18 ? 26 : 0) + fbm(n3, x * 0.3, y * 0.3, 2) * 14;
      return [v * 0.95, v * 0.88, v * 0.8];
    }));
    T.barkDead = tex(pixels(256, 512, (x, y) => {
      const f = fbm(n2, x * 0.06, y * 0.01, 4);
      const crack = Math.abs(Math.sin(x * 0.18 + fbm(n1, x * 0.04, y * 0.015, 3) * 7));
      let v = 58 + f * 50 - (crack < 0.12 ? 30 : 0);
      return [v * 0.92, v * 0.9, v * 0.86];
    }));

    // ---- pine branch card (alpha) ----
    {
      const c = canvas(256, 256), g = c.getContext('2d');
      g.clearRect(0, 0, 256, 256);
      const r = mulberry32(5);
      // main stem from left (trunk side) to right tip, drooping
      const stem = (x0, y0, len, ang, width, depth) => {
        const pts = [];
        let x = x0, y = y0, a = ang;
        for (let i = 0; i < 20; i++) { pts.push([x, y]); x += Math.cos(a) * len / 20; y += Math.sin(a) * len / 20; a += 0.012 + (r() - 0.5) * 0.04; }
        g.strokeStyle = `rgba(${40 + depth * 6},${32 + depth * 4},${22},1)`; g.lineWidth = width;
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke();
        // needles
        for (let i = 2; i < pts.length; i++) {
          const [px, py] = pts[i];
          const sz = (1 - i / pts.length) * 14 + 6;
          for (let k = 0; k < 7; k++) {
            const na = (r() - 0.5) * 2.6 + (k % 2 ? 1.2 : -1.2);
            const l = sz * (0.6 + r() * 0.5);
            const shade = 22 + r() * 30;
            g.strokeStyle = `rgba(${shade * 0.55 | 0},${shade + 10 | 0},${shade * 0.6 | 0},${0.85})`;
            g.lineWidth = 1.4;
            g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(na) * l, py + Math.sin(na) * l * 0.9 + 3); g.stroke();
          }
        }
        if (depth < 2) for (let i = 4; i < pts.length - 3; i += 3) stem(pts[i][0], pts[i][1], len * 0.38 * (1 - i / pts.length), ang + (r() < 0.5 ? -0.7 : 0.7) + 0.2, width * 0.6, depth + 1);
      };
      stem(4, 118, 250, 0.05, 4, 0);
      stem(10, 128, 200, -0.25, 3, 1);
      stem(10, 140, 190, 0.3, 3, 1);
      T.pine = tex(c, { aniso: 4 });
    }

    // ---- leaf cluster for bushes ----
    {
      const c = canvas(256, 256), g = c.getContext('2d');
      const r = mulberry32(8);
      for (let i = 0; i < 520; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 110;
        const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * 0.9;
        const s = 5 + r() * 9;
        const dead = r() < 0.25;
        const v = 20 + r() * 35;
        g.fillStyle = dead ? `rgba(${v * 1.5 | 0},${v * 1.1 | 0},${v * 0.5 | 0},1)` : `rgba(${v * 0.6 | 0},${v * 1.05 | 0},${v * 0.55 | 0},1)`;
        g.save(); g.translate(x, y); g.rotate(r() * 6.28); g.beginPath(); g.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      g.strokeStyle = 'rgba(30,24,16,1)'; g.lineWidth = 2;
      for (let i = 0; i < 18; i++) { const a = r() * 6.28; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 90); g.stroke(); }
      T.leaves = tex(c);
    }

    // ---- grass blades ----
    {
      const c = canvas(256, 256), g = c.getContext('2d');
      const r = mulberry32(13);
      for (let i = 0; i < 170; i++) {
        const x = 10 + r() * 236, h = 120 + r() * 130, lean = (r() - 0.5) * 60;
        const dry = r();
        const grd = g.createLinearGradient(0, 256, 0, 256 - h);
        grd.addColorStop(0, `rgba(${22},${26},${14},1)`);
        grd.addColorStop(1, dry < 0.5 ? `rgba(${98 + dry * 60 | 0},${92 + dry * 30 | 0},${52},1)` : `rgba(${54},${66},${30},1)`);
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(x - 2.5, 256); g.quadraticCurveTo(x + lean * 0.3, 256 - h * 0.6, x + lean, 256 - h); g.quadraticCurveTo(x + lean * 0.3 + 1, 256 - h * 0.6, x + 2.5, 256); g.fill();
      }
      T.grass = tex(c);
    }

    // ---- thorns ----
    {
      const c = canvas(256, 256), g = c.getContext('2d');
      const r = mulberry32(31);
      g.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        let x = r() * 256, y = 256, a = -Math.PI / 2 + (r() - 0.5) * 1.4;
        g.strokeStyle = `rgba(${14 + r() * 10 | 0},${10},${10},1)`; g.lineWidth = 2 + r() * 3;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 12; k++) {
          x += Math.cos(a) * 18; y += Math.sin(a) * 18; a += (r() - 0.5) * 0.9; g.lineTo(x, y);
          if (r() < 0.6) { const ta = a + (r() < 0.5 ? 1 : -1) * 1.1; g.moveTo(x, y); g.lineTo(x + Math.cos(ta) * 9, y + Math.sin(ta) * 9); g.moveTo(x, y); }
        }
        g.stroke();
      }
      T.thorn = tex(c);
    }

    // ---- clapboard siding ----
    T.clap = tex(pixels(512, 512, (x, y) => {
      const board = Math.floor(y / 32), by = y % 32;
      const shade = by < 3 ? 0.45 : (by > 28 ? 0.8 : 1);
      const peel = fbm(n1, x * 0.02 + board * 7, y * 0.06, 4);
      const grime = fbm(n2, x * 0.01, y * 0.004, 4);
      const painted = peel < 0.62;
      let r, g, b;
      if (painted) { r = 112; g = 116; b = 104; } else { const w = 60 + fbm(n3, x * 0.2, y * 0.6 + board * 9, 3) * 30; r = w; g = w * 0.85; b = w * 0.7; }
      const gm = 0.78 + grime * 0.3 - (y / 512) * 0.1 + fbm(n3, x * 0.08, board * 3.1, 2) * 0.12;
      return [r * shade * gm, g * shade * gm, b * shade * gm];
    }));
    // ---- wallpaper ----
    T.wallpaper = tex(pixels(512, 512, (x, y) => {
      const u = x / 64, v = y / 64;
      const motif = Math.abs(Math.sin(u * Math.PI) * Math.cos(v * Math.PI * 2 + Math.sin(u * Math.PI * 2) * 0.8));
      const stripe = (x % 64) < 4 ? 0.9 : 1;
      const stain = fbm(n1, x * 0.008, y * 0.004, 5);
      const water = clamp((fbm(n2, x * 0.01, y * 0.002, 3) - 0.55) * 4, 0, 1) * (y / 512);
      let r = 118 + motif * 22, g = 106 + motif * 14, b = 84 + motif * 8;
      const k = stripe * (0.75 + stain * 0.35) * (1 - water * 0.45);
      return [r * k, g * k * 0.97, b * k * 0.92];
    }));
    // ---- floor planks ----
    T.planks = tex(pixels(512, 512, (x, y) => {
      const plank = Math.floor(x / 64), px = x % 64;
      const off = (plank * 137) % 512;
      const yy = (y + off) % 512;
      const seam = px < 2 || (yy % 256) < 2 ? 0.45 : 1;
      const grain = fbm(n1, x * 0.15 + plank * 11, yy * 0.012, 4);
      const v = 54 + grain * 46 + fbm(n3, x * 0.02, y * 0.02, 3) * 18;
      return [v * 1.0 * seam, v * 0.78 * seam, v * 0.56 * seam];
    }));
    // ---- vertical shed boards ----
    T.boards = tex(pixels(256, 512, (x, y) => {
      const b = Math.floor(x / 42), bx = x % 42;
      const seam = bx < 2 ? 0.35 : 1;
      const grain = fbm(n2, x * 0.3 + b * 9, y * 0.02, 4);
      const v = 46 + grain * 52;
      return [v * seam, v * 0.9 * seam, v * 0.78 * seam];
    }));
    // ---- concrete ----
    T.concrete = tex(pixels(512, 512, (x, y) => {
      const f = fbm(n1, x * 0.02, y * 0.02, 5), sp = n3(x * 0.9, y * 0.9);
      const stain = clamp((fbm(n2, x * 0.006, y * 0.006, 3) - 0.5) * 3, 0, 1);
      const v = (70 + f * 40 + sp * 10) * (1 - stain * 0.35);
      return [v, v * 0.98, v * 0.94];
    }));
    T.blocks = tex(pixels(512, 512, (x, y) => {
      const row = Math.floor(y / 64), off = row % 2 ? 64 : 0;
      const bx = (x + off) % 128, by = y % 64;
      const mortar = bx < 4 || by < 4 ? 0.55 : 1;
      const f = fbm(n1, x * 0.05, y * 0.05, 4);
      const v = (68 + f * 34) * mortar;
      return [v, v * 0.97, v * 0.92];
    }));
    // ---- roof shingles ----
    T.shingles = tex(pixels(512, 512, (x, y) => {
      const row = Math.floor(y / 32), off = row % 2 ? 24 : 0;
      const sx = (x + off) % 48, sy = y % 32;
      const edge = sy > 28 ? 0.35 : 1;
      const gap = sx < 2 ? 0.4 : 1;
      const moss = clamp((fbm(n2, x * 0.01, y * 0.01, 4) - 0.5) * 3, 0, 1);
      const v = 34 + fbm(n1, x * 0.1, y * 0.1, 3) * 26;
      return [v * edge * gap * (1 - moss * 0.2), (v + moss * 22) * edge * gap, v * 0.9 * edge * gap];
    }));
    // ---- rusty metal ----
    T.metal = tex(pixels(256, 256, (x, y) => {
      const r = clamp((fbm(n3, x * 0.03, y * 0.03, 5) - 0.42) * 2.5, 0, 1);
      const base = 62 + fbm(n1, x * 0.2, y * 0.02, 3) * 18;
      return [lerp(base, 96, r), lerp(base, 50, r), lerp(base * 1.02, 26, r)];
    }));
    T.fabric = tex(pixels(128, 128, (x, y) => {
      const w = ((x % 4) < 2) !== ((y % 4) < 2) ? 0.92 : 1;
      const f = fbm(n2, x * 0.05, y * 0.05, 3);
      const v = (52 + f * 30) * w;
      return [v * 0.8, v * 0.62, v * 0.52];
    }));
    T.sheet = tex(pixels(256, 256, (x, y) => {
      const fold = Math.abs(Math.sin(x * 0.05 + fbm(n1, x * 0.01, y * 0.01, 3) * 6));
      const v = 120 + fold * 30 - fbm(n2, x * 0.02, y * 0.02, 4) * 40;
      return [v, v * 0.96, v * 0.88];
    }));
    // ---- chain-link (alpha) ----
    {
      const c = canvas(64, 64), g = c.getContext('2d');
      g.strokeStyle = 'rgba(150,150,145,1)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.moveTo(32, 0); g.lineTo(64, 32); g.moveTo(0, 32); g.lineTo(32, 64); g.moveTo(32, 0); g.lineTo(0, 32); g.moveTo(64, 32); g.lineTo(32, 64); g.stroke();
      T.chain = tex(c);
    }
    // ---- footprints ----
    {
      const c = canvas(64, 128), g = c.getContext('2d');
      g.fillStyle = 'rgba(10,8,6,0.85)';
      g.beginPath(); g.ellipse(32, 38, 15, 26, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(32, 98, 12, 16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 6; i++) g.fillRect(20, 20 + i * 8, 24, 3);
      T.boot = tex(c, { clamp: true });
      const c2 = canvas(64, 128), h = c2.getContext('2d');
      h.fillStyle = 'rgba(8,6,6,0.9)';
      h.beginPath(); h.ellipse(32, 92, 12, 20, 0, 0, Math.PI * 2); h.fill();
      h.strokeStyle = 'rgba(8,6,6,0.95)'; h.lineCap = 'round';
      for (const [a, l] of [[-0.45, 66], [-0.12, 80], [0.18, 76], [0.5, 60]]) { h.lineWidth = 5; h.beginPath(); h.moveTo(32, 80); h.lineTo(32 + Math.sin(a) * l, 80 - Math.cos(a) * l); h.stroke(); }
      T.claw = tex(c2, { clamp: true });
    }
    // ---- sigil boards (veil) ----
    T.sigil = tex(pixels(256, 256, (x, y) => {
      const b = Math.floor(y / 52), by = y % 52;
      const seam = by < 3 ? 0.3 : 1;
      const grain = fbm(n1, x * 0.02 + b * 5, y * 0.2, 3);
      const v = (30 + grain * 30) * seam;
      return [v, v * 0.85, v * 0.75];
    }));
    {
      const c = canvas(256, 256), g = c.getContext('2d');
      const r = mulberry32(66);
      g.strokeStyle = 'rgba(255,90,60,1)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const cx = 40 + r() * 176, cy = 40 + r() * 176, R = 18 + r() * 24;
        g.beginPath(); g.arc(cx, cy, R, r() * 2, r() * 2 + 4.5); g.stroke();
        for (let i = 0; i < 4; i++) { const a = r() * 6.28; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * 1.3); g.stroke(); }
      }
      T.sigilGlow = tex(c);
    }
    // ---- detail tile ----
    T.detail = tex(pixels(256, 256, (x, y) => {
      const v = 128 + (tfbm(n1, x * 0.06, y * 0.06, 256 * 0.06, 4) - 0.5) * 120 + (n3(x * 0.9, y * 0.9) - 0.5) * 40;
      return [v, v, v];
    }), { color: false });
    T.detail.repeat.set(1, 1);

    // ---- terrain splat (whole map) ----
    {
      const S = hi ? 1536 : 1024, scale = 128 / S;
      const W = HG.W;
      const surf = world.surf[0], cover = world.cover;
      const col = { 0: [44, 46, 30], 1: [36, 28, 20], 2: [70, 67, 60], 3: [60, 46, 32], 4: [66, 64, 60], 5: [28, 28, 30] };
      const rough = canvas(512, 512), rctx = rough.getContext('2d'), rimg = rctx.createImageData(512, 512);
      const cvs = pixels(S, S, (px, py) => {
        const x = px * scale, z = py * scale;
        // jitter sampling to soften cell edges
        const jx = x + (n1(x * 1.3, z * 1.3) - 0.5) * 0.9, jz = z + (n2(x * 1.3, z * 1.3) - 0.5) * 0.9;
        const cx = clamp(Math.floor(jx), 0, 127), cz = clamp(Math.floor(jz), 0, 127);
        const s = surf[cz * W + cx];
        let c = col[s] || col[0];
        const f = fbm(n1, x * 0.35, z * 0.35, 4), g2 = fbm(n2, x * 0.08, z * 0.08, 3);
        let r = c[0], g = c[1], b = c[2];
        if (s === 0) {
          // forest floor: needles, dead leaves, moss
          const leaf = clamp((g2 - 0.45) * 3, 0, 1);
          r = lerp(r, 58, leaf); g = lerp(g, 42, leaf); b = lerp(b, 26, leaf);
          if (cover[cz * W + cx] === 1) { r *= 1.15; g *= 1.2; b *= 1.0; }
        }
        if (s === 1) { const puddle = clamp((n3(x * 0.25, z * 0.25) - 0.62) * 6, 0, 1); r = lerp(r, 18, puddle); g = lerp(g, 16, puddle); b = lerp(b, 15, puddle); }
        if (s === 2) { const pebble = n3(x * 6, z * 6); r += (pebble - 0.5) * 40; g += (pebble - 0.5) * 38; b += (pebble - 0.5) * 34; }
        if (s === 5) { const line = (Math.abs(z - 118.5) < 0.08 && (x % 4) < 2.2) ? 1 : 0; const crack = Math.abs(n2(x * 0.8, z * 0.8) - 0.5) < 0.012 ? 1 : 0; r = lerp(r, 120, line * 0.6) - crack * 12; g = lerp(g, 112, line * 0.6) - crack * 12; b = lerp(b, 80, line * 0.6) - crack * 12; }
        const k = 0.72 + f * 0.56;
        return [r * k, g * k, b * k];
      });
      for (let py = 0; py < 512; py++) for (let px = 0; px < 512; px++) {
        const x = px / 4, z = py / 4;
        const s = surf[clamp(Math.floor(z), 0, 127) * W + clamp(Math.floor(x), 0, 127)];
        let rv = s === 1 ? 0.35 + n3(x * 0.25, z * 0.25) * 0.2 : s === 5 ? 0.7 : s === 2 ? 0.85 : 0.94;
        if (s === 1 && n3(x * 0.25, z * 0.25) > 0.62) rv = 0.12;
        const o = (py * 512 + px) * 4; const v = rv * 255;
        rimg.data[o] = v; rimg.data[o + 1] = v; rimg.data[o + 2] = v; rimg.data[o + 3] = 255;
      }
      rctx.putImageData(rimg, 0, 0);
      T.terrain = tex(cvs, { aniso: 8 }); T.terrain.wrapS = T.terrain.wrapT = THREE.ClampToEdgeWrapping;
      T.terrainRough = tex(rough, { color: false }); T.terrainRough.wrapS = T.terrainRough.wrapT = THREE.ClampToEdgeWrapping;
    }
    // ---- monster skin ----
    T.skin = tex(pixels(256, 256, (x, y) => {
      const f = fbm(n1, x * 0.05, y * 0.05, 5), vein = Math.abs(fbm(n2, x * 0.02, y * 0.02, 4) - 0.5) < 0.02 ? 0.6 : 1;
      const v = (14 + f * 22) * vein;
      return [v * 1.15, v * 0.92, v * 0.9];
    }));
    // ---- sky ----
    return T;
  };
  HG.TEX = T;
})(typeof window !== 'undefined' ? window : globalThis);
