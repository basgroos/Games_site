/* Hollow Pines — world definition: grid, structures, collision, navigation, line of sight.
   Pure logic (no rendering). Shared by the browser build and the Node test harness. */
(function (G) {
  'use strict';
  const HG = G.HG = G.HG || {};

  // ---------- utilities ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function makeNoise(seed) {
    const r = mulberry32(seed); const p = new Float32Array(256 * 256);
    for (let i = 0; i < p.length; i++) p[i] = r();
    const v = (x, z) => p[((z & 255) << 8) | (x & 255)];
    return function (x, z) {
      const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), w = zf * zf * (3 - 2 * zf);
      return lerp(lerp(v(xi, zi), v(xi + 1, zi), u), lerp(v(xi, zi + 1), v(xi + 1, zi + 1), u), w);
    };
  }
  HG.util = { mulberry32, clamp, lerp, smooth, makeNoise };

  // ---------- constants ----------
  const W = 128, H = 128, N = W * H, LEVELS = 3;
  const T = { OPEN: 0, WALL: 1, TREE: 2, DOOR: 3, CRAWL: 4, VEIL: 5, WINDOW: 6, FENCE: 7, STAIR: 8, ROCK: 9, VOID: 10, LOG: 11 };
  const S = { GRASS: 0, MUD: 1, GRAVEL: 2, WOOD: 3, CONCRETE: 4, ASPHALT: 5 };
  const SURF_NAMES = ['grass', 'mud', 'gravel', 'wood', 'concrete', 'asphalt'];
  HG.W = W; HG.H = H; HG.T = T; HG.S = S; HG.SURF_NAMES = SURF_NAMES;
  HG.LEVEL_FLOOR = [0.5, -2.4, 3.6];   // house floors: ground, basement, attic
  HG.LEVEL_NAMES = ['ground', 'basement', 'attic'];

  function World() {
    this.grid = [];       // type per level
    this.surf = [];       // surface per level
    this.cover = new Uint8Array(N);   // level 0 only: 1 tall grass, 2 bush
    this.indoor = [];     // room / building id per level (0 = outdoors)
    this.treeAt = new Int32Array(N).fill(-1);
    for (let l = 0; l < LEVELS; l++) {
      this.grid.push(new Uint8Array(N).fill(l === 0 ? T.OPEN : T.VOID));
      this.surf.push(new Uint8Array(N).fill(l === 0 ? S.GRASS : S.CONCRETE));
      this.indoor.push(new Uint8Array(N));
    }
    this.boxes = [];      // static colliders {x0,z0,x1,z1,level,kind,flags,h,y0}
    this.circles = [];    // tree / rock colliders {x,z,r,level}
    this.trees = [];      // {x,z,r,h,kind,scale,rot}
    this.rocks = [];
    this.bushes = [];
    this.grass = [];
    this.logs = [];
    this.doors = [];
    this.windows = [];    // visual info for windows / broken / veils / rails
    this.walls = [];      // visual wall boxes
    this.stairs = [];
    this.containers = [];
    this.hides = [];
    this.stations = {};
    this.lamps = [];
    this.regions = [];
    this.props = [];      // visual-only furniture etc {model,x,z,level,yaw,w,d,h}
    this.paths = [];
    this.flatZones = [];
    this.buildings = [];  // for rendering floors/roofs
    this.colHash = [];    // per level: Map cell -> [collider refs]
  }
  HG.World = World;
  const P = World.prototype;

  P.idx = (x, z) => z * W + x;
  P.inb = (x, z) => x >= 0 && z >= 0 && x < W && z < H;
  P.get = function (l, x, z) { return this.inb(x, z) ? this.grid[l][z * W + x] : T.VOID; };
  P.set = function (l, x, z, t) { if (this.inb(x, z)) this.grid[l][z * W + x] = t; };

  // ----- building primitives -----
  // Rasterise a box into the grid: cells whose centre lies inside.
  P.raster = function (l, x0, z0, x1, z1, type) {
    for (let z = Math.floor(z0); z <= Math.ceil(z1); z++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const cx = x + 0.5, cz = z + 0.5;
        if (cx >= x0 - 0.01 && cx <= x1 + 0.01 && cz >= z0 - 0.01 && cz <= z1 + 0.01) this.set(l, x, z, type);
      }
  };
  P.addBox = function (b) {
    b.flags = b.flags || 0; b.enabled = b.enabled !== false;
    this.boxes.push(b); return b;
  };
  // flags: 1 = crawlable (monster crawling passes), 2 = ghostable (ghost passes), 4 = low (does not block view)
  const F_CRAWL = 1, F_GHOST = 2, F_LOW = 4;
  HG.F_CRAWL = F_CRAWL; HG.F_GHOST = F_GHOST; HG.F_LOW = F_LOW;

  /* Wall along a line of cells. axis 'h': runs along x at row `line`; 'v': runs along z at column `line`.
     openings: {cellIndex: kind}. kind: door | window | broken | veil | arch | lockeddoor | gate | crawlgap
     style: house | shed | concrete | fence | rail | hut */
  P.wallLine = function (l, axis, line, a, b, openings, style, opts) {
    opts = opts || {};
    openings = openings || {};
    const h = opts.h || (style === 'fence' ? 2.6 : style === 'rail' ? 1.0 : (style === 'house' && l === 0 ? 3.5 : 3.0));
    const th = style === 'fence' ? 0.12 : style === 'rail' ? 0.14 : 0.3;
    const lo = 0.5 - th / 2, hi = 0.5 + th / 2;
    const baseType = style === 'fence' || style === 'rail' ? (style === 'rail' ? T.WINDOW : T.FENCE) : T.WALL;
    const y0 = opts.y0 !== undefined ? opts.y0 : (l === 0 ? (opts.ground || 0) : HG.LEVEL_FLOOR[l]);
    let runStart = null;
    const flush = (endCell, endIsOpening) => {
      if (runStart === null) return;
      const s = runStart.cell, e = endCell;
      if (e < s) { runStart = null; return; }
      const sOff = runStart.afterOpening ? 0 : lo, eOff = endIsOpening ? 1 : hi;
      let box;
      if (axis === 'h') box = { x0: s + sOff, x1: e + eOff, z0: line + lo, z1: line + hi };
      else box = { z0: s + sOff, z1: e + eOff, x0: line + lo, x1: line + hi };
      box.level = l; box.kind = 'wall'; box.style = style; box.h = h; box.y0 = y0;
      if (style === 'fence' || style === 'rail') box.flags = F_LOW;
      this.addBox(box); this.walls.push(box);
      this.raster(l, box.x0, box.z0, box.x1, box.z1, baseType);
      runStart = null;
    };
    for (let c = a; c <= b; c++) {
      const op = openings[c];
      if (op) {
        flush(c - 1, true);
        const cx = axis === 'h' ? c : line, cz = axis === 'h' ? line : c;
        this.opening(l, axis, cx, cz, op, style, h, y0, th, opts.doorY !== undefined ? opts.doorY : (l === 0 && style === 'house' ? 0.5 : y0));
        runStart = { cell: c + 1, afterOpening: true };
        if (c === b) runStart = null;
      } else if (runStart === null) runStart = { cell: c, afterOpening: c !== a && !!openings[c - 1] };
    }
    flush(b, false);
  };

  P.opening = function (l, axis, cx, cz, kind, style, h, y0, th, doorY) {
    const lo = 0.5 - th / 2, hi = 0.5 + th / 2;
    const cell = axis === 'h' ? { x0: cx, x1: cx + 1, z0: cz + lo, z1: cz + hi } : { x0: cx + lo, x1: cx + hi, z0: cz, z1: cz + 1 };
    const vis = Object.assign({ level: l, axis, cx, cz, kind, style, h, y0 }, cell);
    if (kind === 'door' || kind === 'lockeddoor') {
      this.set(l, cx, cz, T.DOOR);
      const dt = 0.07;
      const col = axis === 'h' ? { x0: cx, x1: cx + 1, z0: cz + 0.5 - dt, z1: cz + 0.5 + dt } : { x0: cx + 0.5 - dt, x1: cx + 0.5 + dt, z0: cz, z1: cz + 1 };
      const box = this.addBox(Object.assign({ level: l, kind: 'door', h: 2.2, y0: doorY }, col));
      const door = { id: this.doors.length, level: l, axis, cx, cz, open: false, locked: kind === 'lockeddoor', box, angle: 0, style, y0: doorY, lastUse: -99, hinge: 0 };
      box.door = door;
      this.doors.push(door);
      vis.door = door;
      this.windows.push(vis);
    } else if (kind === 'window') {
      this.set(l, cx, cz, T.WINDOW);
      this.addBox(Object.assign({ level: l, kind: 'window', h, y0, flags: F_LOW }, cell));
      this.windows.push(vis);
    } else if (kind === 'broken' || kind === 'crawlgap') {
      this.set(l, cx, cz, T.CRAWL);
      this.addBox(Object.assign({ level: l, kind: kind, h, y0, flags: F_CRAWL | F_LOW }, cell));
      this.windows.push(vis);
    } else if (kind === 'veil') {
      this.set(l, cx, cz, T.VEIL);
      this.addBox(Object.assign({ level: l, kind: 'veil', h, y0, flags: F_GHOST }, cell));
      this.windows.push(vis);
    } else if (kind === 'gate') {
      this.set(l, cx, cz, T.FENCE);
      const b = this.addBox(Object.assign({ level: l, kind: 'gate', h, y0, flags: F_LOW }, cell));
      vis.box = b; this.windows.push(vis);
      (this.gateBoxes = this.gateBoxes || []).push(b);
    } else { // arch
      this.set(l, cx, cz, T.OPEN);
      this.windows.push(vis);
    }
  };

  P.carve = function (l, x0, z0, x1, z1, surf, roomId) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      this.set(l, x, z, T.OPEN);
      this.surf[l][z * W + x] = surf;
      this.indoor[l][z * W + x] = roomId;
    }
  };
  P.markIndoor = function (l, x0, z0, x1, z1, id, surf) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!this.inb(x, z)) continue;
      this.indoor[l][z * W + x] = id;
      if (surf !== undefined) this.surf[l][z * W + x] = surf;
    }
  };
  P.solidBox = function (l, x0, z0, x1, z1, kind, h, opts) {
    opts = opts || {};
    const b = this.addBox(Object.assign({ level: l, x0, z0, x1, z1, kind, h: h || 1, y0: opts.y0 || 0 }, opts));
    const type = opts.type !== undefined ? opts.type : T.WALL;
    this.raster(l, x0, z0, x1, z1, type);
    // thin solids: also mark cells they substantially overlap
    for (let z = Math.floor(z0); z <= Math.floor(z1 - 1e-6); z++) for (let x = Math.floor(x0); x <= Math.floor(x1 - 1e-6); x++) {
      const ox = Math.min(x1, x + 1) - Math.max(x0, x), oz = Math.min(z1, z + 1) - Math.max(z0, z);
      if (ox > 0 && oz > 0 && ox * oz > 0.3 && this.get(l, x, z) === T.OPEN) this.set(l, x, z, type);
    }
    return b;
  };

  // ---------- the map ----------
  P.build = function () {
    const rnd = mulberry32(1337);
    const noise = makeNoise(77);
    const o = {}; // shorthand openings
    const H0 = 0; // house level
    // --- regions (for callouts) ---
    const R = (name, l, x0, z0, x1, z1) => this.regions.push({ name, level: l, x0, z0, x1, z1 });

    // ===== HOUSE (level 0) =====
    // footprint x 52..71, z 54..67 ; interior cells x 53..70, z 55..66
    this.markIndoor(0, 53, 55, 70, 66, 1, S.WOOD);
    this.wallLine(0, 'h', 54, 52, 71, { 55: 'window', 60: 'door', 64: 'window', 69: 'window' }, 'house');
    this.wallLine(0, 'h', 67, 52, 71, { 54: 'window', 55: 'window', 58: 'window', 61: 'door', 66: 'window', 69: 'window' }, 'house');
    this.wallLine(0, 'v', 52, 55, 66, { 57: 'broken', 59: 'window', 62: 'window', 65: 'veil' }, 'house');
    this.wallLine(0, 'v', 71, 55, 66, { 58: 'window', 63: 'broken', 65: 'door' }, 'house');
    this.wallLine(0, 'h', 61, 53, 70, { 59: 'arch', 60: 'arch', 68: 'door' }, 'house');
    this.wallLine(0, 'v', 57, 55, 60, { 60: 'door' }, 'house');
    this.wallLine(0, 'v', 61, 55, 60, { 59: 'door' }, 'house');
    this.wallLine(0, 'v', 66, 55, 60, {}, 'house');
    this.wallLine(0, 'v', 64, 62, 66, { 64: 'door' }, 'house');
    // attic stair railings + caps (level 0)
    this.wallLine(0, 'v', 59, 55, 59, {}, 'rail');
    this.solidBox(0, 58.05, 55.0, 58.95, 55.6, 'cabinet', 1.9);
    // basement stair railing + cap
    this.wallLine(0, 'v', 64, 56, 59, {}, 'rail');
    this.solidBox(0, 65.05, 55.0, 65.95, 55.6, 'cabinet', 1.9);
    this.buildings.push({ id: 1, name: 'house', level: 0, x0: 52.35, z0: 54.35, x1: 71.65, z1: 67.65, floorY: 0.5, ceil: 3.4, roof: true, surf: 'wood' });
    // room ids for indoor (finer): living 2, kitchen 3, hall 4, bed1 5, storage 6, bed2 7
    this.markIndoor(0, 53, 62, 63, 66, 2); this.markIndoor(0, 65, 62, 70, 66, 3);
    this.markIndoor(0, 58, 55, 60, 60, 4); this.markIndoor(0, 53, 55, 56, 60, 5);
    this.markIndoor(0, 62, 55, 65, 60, 6); this.markIndoor(0, 67, 55, 70, 60, 7);
    R('in the living room', 0, 53, 62, 64, 67); R('in the kitchen', 0, 64, 62, 71, 67);
    R('in the hallway', 0, 57, 55, 61, 61); R('in the west bedroom', 0, 52, 54, 57, 61);
    R('in the storage room', 0, 61, 54, 66, 61); R('in the east bedroom', 0, 66, 54, 71, 61);

    // ===== BASEMENT (level 1) =====
    this.carve(1, 54, 55, 65, 66, S.CONCRETE, 10);
    this.wallLine(1, 'h', 54, 53, 66, {}, 'concrete', { y0: HG.LEVEL_FLOOR[1], h: 2.7 });
    this.wallLine(1, 'h', 67, 53, 66, {}, 'concrete', { y0: HG.LEVEL_FLOOR[1], h: 2.7 });
    this.wallLine(1, 'v', 53, 55, 66, {}, 'concrete', { y0: HG.LEVEL_FLOOR[1], h: 2.7 });
    this.wallLine(1, 'v', 66, 55, 66, {}, 'concrete', { y0: HG.LEVEL_FLOOR[1], h: 2.7 });
    this.wallLine(1, 'h', 61, 54, 64, { 58: 'arch' }, 'concrete', { y0: HG.LEVEL_FLOOR[1], h: 2.7 });
    this.wallLine(1, 'v', 64, 56, 59, {}, 'rail', { y0: HG.LEVEL_FLOOR[1] });
    this.solidBox(1, 65.05, 60.4, 65.95, 61.0, 'cabinet', 2.6, { y0: HG.LEVEL_FLOOR[1] });
    this.solidBox(1, 58.25, 58.25, 58.85, 58.85, 'pillar', 2.7, { y0: HG.LEVEL_FLOOR[1] });
    this.solidBox(1, 60.25, 63.25, 60.85, 63.85, 'pillar', 2.7, { y0: HG.LEVEL_FLOOR[1] });
    this.buildings.push({ id: 10, name: 'basement', level: 1, x0: 53.35, z0: 54.35, x1: 66.65, z1: 67.65, floorY: HG.LEVEL_FLOOR[1], ceil: 0.3, surf: 'concrete' });
    R('in the basement', 1, 53, 54, 67, 68);

    // ===== ATTIC (level 2) =====
    this.carve(2, 53, 55, 70, 63, S.WOOD, 20);
    this.wallLine(2, 'h', 54, 52, 71, {}, 'attic', { y0: HG.LEVEL_FLOOR[2], h: 1.7 });
    this.wallLine(2, 'h', 64, 52, 71, {}, 'attic', { y0: HG.LEVEL_FLOOR[2], h: 1.7 });
    this.wallLine(2, 'v', 52, 55, 63, { 59: 'window' }, 'gable', { y0: HG.LEVEL_FLOOR[2], h: 1.7 });
    this.wallLine(2, 'v', 71, 55, 63, { 59: 'window' }, 'gable', { y0: HG.LEVEL_FLOOR[2], h: 1.7 });
    this.wallLine(2, 'v', 57, 56, 59, {}, 'rail', { y0: HG.LEVEL_FLOOR[2] });
    this.wallLine(2, 'v', 59, 56, 59, {}, 'rail', { y0: HG.LEVEL_FLOOR[2] });
    this.solidBox(2, 58.05, 60.4, 58.95, 61.0, 'cabinet', 1.2, { y0: HG.LEVEL_FLOOR[2] });
    this.buildings.push({ id: 20, name: 'attic', level: 2, x0: 52.35, z0: 54.35, x1: 71.65, z1: 64.65, floorY: HG.LEVEL_FLOOR[2], ceil: 1.7, surf: 'wood' });
    R('in the attic', 2, 52, 54, 72, 65);

    // ===== STAIRS =====
    const stair = (x, zs, A, B, yA, yB) => {
      const st = { id: this.stairs.length, x, cells: [], A, B, yA, yB, start: 60, len: 4 };
      for (let i = 0; i < 4; i++) {
        const z = 59 - i; const owner = i < 2 ? A : B;
        st.cells.push({ x, z, owner });
        this.set(A, x, z, T.STAIR); this.set(B, x, z, T.STAIR);
        this.surf[A][z * W + x] = S.WOOD; this.surf[B][z * W + x] = S.WOOD;
        this.indoor[A][z * W + x] = this.indoor[A][z * W + x] || 1;
        this.indoor[B][z * W + x] = this.indoor[B][z * W + x] || 1;
      }
      this.stairs.push(st); return st;
    };
    stair(58, 59, 0, 2, 0.5, 3.6);   // attic
    stair(65, 59, 0, 1, 0.5, -2.4);  // basement
    this.stairOwner = [new Int8Array(N).fill(-1), new Int8Array(N).fill(-1), new Int8Array(N).fill(-1)];
    this.stairRef = new Int16Array(N).fill(-1);
    for (const st of this.stairs) for (const c of st.cells) {
      const i = c.z * W + c.x;
      this.stairOwner[st.A][i] = c.owner; this.stairOwner[st.B][i] = c.owner;
      this.stairRef[i] = st.id;
    }

    // ===== PORCH =====
    this.markIndoor(0, 57, 68, 65, 69, 30, S.WOOD);
    this.wallLine(0, 'h', 70, 56, 66, { 60: 'arch', 61: 'arch', 62: 'arch' }, 'rail', { y0: 0.45 });
    this.wallLine(0, 'v', 56, 68, 69, {}, 'rail', { y0: 0.45 });
    this.wallLine(0, 'v', 66, 68, 69, {}, 'rail', { y0: 0.45 });
    this.buildings.push({ id: 30, name: 'porch', level: 0, x0: 56.3, z0: 67.65, x1: 66.7, z1: 70.7, floorY: 0.45, porch: true, surf: 'wood' });
    R('on the porch', 0, 56, 67, 67, 71);
    R('behind the house', 0, 52, 49, 72, 54);

    // ===== SHED =====
    this.markIndoor(0, 31, 41, 35, 44, 40, S.WOOD);
    this.wallLine(0, 'h', 40, 30, 36, { 33: 'window' }, 'shed', { h: 2.6 });
    this.wallLine(0, 'h', 45, 30, 36, {}, 'shed', { h: 2.6 });
    this.wallLine(0, 'v', 30, 41, 44, { 43: 'broken' }, 'shed', { h: 2.6 });
    this.wallLine(0, 'v', 36, 41, 44, { 42: 'door' }, 'shed', { h: 2.6 });
    this.buildings.push({ id: 40, name: 'shed', level: 0, x0: 30.35, z0: 40.35, x1: 36.65, z1: 45.65, floorY: 0.12, ceil: 2.6, roof: true, roofType: 'shed', surf: 'wood' });
    R('in the shed', 0, 30, 40, 37, 46); R('by the shed', 0, 25, 35, 42, 52);

    // ===== GENERATOR =====
    this.markIndoor(0, 57, 45, 63, 49, 0, S.CONCRETE);
    this.solidBox(0, 58.9, 46.4, 61.3, 47.7, 'generator', 1.3);
    R('at the generator', 0, 55, 43, 66, 51);

    // ===== POWER STATION =====
    for (let z = 25; z <= 35; z++) for (let x = 97; x <= 107; x++) this.surf[0][z * W + x] = S.GRAVEL;
    this.wallLine(0, 'h', 24, 96, 108, {}, 'fence');
    this.wallLine(0, 'h', 36, 96, 108, { 104: 'crawlgap' }, 'fence');
    this.wallLine(0, 'v', 96, 25, 35, { 29: 'arch', 30: 'arch' }, 'fence');
    this.wallLine(0, 'v', 108, 25, 35, { 28: 'veil' }, 'fence');
    this.solidBox(0, 100.2, 26.0, 102.4, 28.0, 'transformer', 2.2);
    this.solidBox(0, 104.2, 26.0, 106.4, 28.0, 'transformer', 2.2);
    this.markIndoor(0, 100, 32, 103, 34, 50, S.CONCRETE);
    this.wallLine(0, 'h', 31, 99, 104, { 101: 'door' }, 'hut', { h: 2.6 });
    this.wallLine(0, 'h', 35, 99, 104, {}, 'hut', { h: 2.6 });
    this.wallLine(0, 'v', 99, 32, 34, {}, 'hut', { h: 2.6 });
    this.wallLine(0, 'v', 104, 32, 34, { 33: 'window' }, 'hut', { h: 2.6 });
    this.buildings.push({ id: 50, name: 'control hut', level: 0, x0: 99.35, z0: 31.35, x1: 104.65, z1: 35.65, floorY: 0.1, ceil: 2.6, roof: true, roofType: 'flat', surf: 'concrete' });
    R('at the power station', 0, 92, 20, 112, 40);

    // ===== STORAGE BUILDING (locked) =====
    this.markIndoor(0, 21, 83, 27, 87, 60, S.CONCRETE);
    this.wallLine(0, 'h', 82, 20, 28, { 24: 'lockeddoor' }, 'concrete', { h: 3.0 });
    this.wallLine(0, 'h', 88, 20, 28, { 26: 'veil' }, 'concrete', { h: 3.0 });
    this.wallLine(0, 'v', 20, 83, 87, {}, 'concrete', { h: 3.0 });
    this.wallLine(0, 'v', 28, 83, 87, { 85: 'window' }, 'concrete', { h: 3.0 });
    this.buildings.push({ id: 60, name: 'storage building', level: 0, x0: 20.35, z0: 82.35, x1: 28.65, z1: 88.65, floorY: 0.1, ceil: 3.0, roof: true, roofType: 'flat', surf: 'concrete' });
    this.storageDoor = this.doors[this.doors.length - 1];
    for (const d of this.doors) if (d.locked) this.storageDoor = d;
    R('in the storage building', 0, 20, 82, 29, 89); R('by the storage building', 0, 14, 74, 36, 96);

    // ===== TRUCK =====
    this.solidBox(0, 69.0, 80.0, 71.2, 85.2, 'truck', 1.8);
    R('by the truck', 0, 64, 76, 76, 90);

    // ===== RADIO TOWER =====
    for (const [x, z] of [[62.4, 10.4], [65.6, 10.4], [62.4, 13.6], [65.6, 13.6]]) {
      this.circles.push({ x, z, r: 0.25, level: 0, kind: 'towerleg' });
      this.set(0, Math.floor(x), Math.floor(z), T.ROCK);
    }
    this.solidBox(0, 63.1, 13.7, 64.9, 14.3, 'cabinet', 1.6);
    R('at the radio tower', 0, 54, 2, 74, 22);

    // ===== ROAD, FENCE, GATE =====
    for (let z = 116; z <= 121; z++) for (let x = 0; x < W; x++) this.surf[0][z * W + x] = S.ASPHALT;
    this.wallLine(0, 'h', 114, 2, 125, { 62: 'gate', 63: 'gate', 64: 'gate', 65: 'gate' }, 'fence', { h: 2.4 });
    // fence terminates against forest edge blockers
    this.solidBox(0, 1.0, 113.5, 2.4, 123.5, 'boundary', 3, { type: T.VOID });
    this.solidBox(0, 125.6, 113.5, 127.0, 123.5, 'boundary', 3, { type: T.VOID });
    R('at the gate', 0, 56, 106, 72, 116); R('on the driveway', 0, 56, 70, 72, 106);

    // world boundary (invisible)
    this.addBox({ x0: -2, z0: -2, x1: 1.2, z1: 130, level: 0, kind: 'boundary', h: 10, y0: 0 });
    this.addBox({ x0: 126.8, z0: -2, x1: 130, z1: 130, level: 0, kind: 'boundary', h: 10, y0: 0 });
    this.addBox({ x0: -2, z0: -2, x1: 130, z1: 1.2, level: 0, kind: 'boundary', h: 10, y0: 0 });
    this.addBox({ x0: -2, z0: 123.5, x1: 130, z1: 130, level: 0, kind: 'boundary', h: 10, y0: 0 });
    for (let i = 0; i < W; i++) { this.set(0, i, 0, T.VOID); this.set(0, 0, i, T.VOID); this.set(0, W - 1, i, T.VOID); this.set(0, i, 124, T.VOID); this.set(0, i, 125, T.VOID); this.set(0, i, 126, T.VOID); this.set(0, i, 127, T.VOID); }

    // ===== PATHS =====
    const path = (pts, width, surf) => this.paths.push({ pts, width, surf });
    path([[61, 71], [62, 80], [65, 90], [64, 102], [64, 114]], 3.6, S.GRAVEL);              // driveway
    path([[64, 115], [64, 121]], 3.6, S.GRAVEL);
    path([[60, 53], [60, 49]], 1.8, S.MUD);                                                     // back door → generator
    path([[60, 45], [57, 36], [61, 25], [64, 15]], 1.8, S.MUD);                                 // → tower
    path([[56, 70], [48, 67], [41, 56], [37, 47], [37, 42]], 1.8, S.MUD);                       // → shed
    path([[63, 47], [75, 44], [86, 36], [96, 30]], 1.8, S.MUD);                                 // → power station
    path([[63, 84], [50, 87], [38, 88], [30, 82], [24, 80]], 1.8, S.MUD);                       // → storage
    path([[41, 56], [31, 66], [27, 79]], 1.5, S.MUD);                                           // shed ↔ storage
    path([[86, 36], [91, 55], [81, 74], [72, 81]], 1.5, S.MUD);                                 // station ↔ truck
    path([[37, 47], [41, 31], [57, 36]], 1.5, S.MUD);                                           // shed ↔ tower trail
    path([[75, 44], [81, 60], [72, 70]], 1.4, S.MUD);                                           // east loop
    path([[50, 87], [44, 100], [52, 108], [60, 110]], 1.4, S.MUD);                              // south-west loop to gate
    path([[81, 74], [88, 92], [76, 104], [66, 108]], 1.4, S.MUD);                               // south-east loop to gate

    const distSeg = (px, pz, ax, az, bx, bz) => {
      const dx = bx - ax, dz = bz - az; const L2 = dx * dx + dz * dz;
      const t = L2 ? clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1) : 0;
      const qx = ax + dx * t - px, qz = az + dz * t - pz; return Math.sqrt(qx * qx + qz * qz);
    };
    this.pathDist = new Float32Array(N).fill(99);
    for (const p of this.paths) {
      for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
        let d = 99;
        for (let i = 0; i < p.pts.length - 1; i++) d = Math.min(d, distSeg(x + 0.5, z + 0.5, p.pts[i][0], p.pts[i][1], p.pts[i + 1][0], p.pts[i + 1][1]));
        const i = z * W + x;
        if (d < this.pathDist[i]) this.pathDist[i] = d;
        if (d < p.width / 2 && this.indoor[0][i] === 0 && this.surf[0][i] !== S.ASPHALT && this.surf[0][i] !== S.CONCRETE) this.surf[0][i] = p.surf;
      }
    }

    // ===== CLEARINGS =====
    const clear = [];
    const rect = (x0, z0, x1, z1) => clear.push({ t: 'r', x0, z0, x1, z1 });
    const circ = (x, z, r) => clear.push({ t: 'c', x, z, r });
    rect(46, 43, 78, 76); circ(33, 42.5, 8.5); rect(91, 19, 113, 41); circ(24, 85, 9.5); circ(64, 12, 9.5);
    rect(0, 109, 128, 123); rect(66, 77, 75, 88);
    const inClear = (x, z) => {
      for (const c of clear) {
        if (c.t === 'r') { if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; }
        else if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return true;
      }
      return false;
    };
    this.inClear = inClear;

    // ===== MUD PATCHES =====
    for (let z = 2; z < 112; z++) for (let x = 2; x < 126; x++) {
      const i = z * W + x;
      if (this.surf[0][i] !== S.GRASS || this.indoor[0][i]) continue;
      const n = noise(x * 0.11, z * 0.11) * 0.7 + noise(x * 0.37 + 50, z * 0.37) * 0.3;
      if (n > 0.66 || (this.pathDist[i] < 2.4 && n > 0.48)) this.surf[0][i] = S.MUD;
      // yard near house is trampled mud
      if (x > 50 && x < 74 && z > 66 && z < 74 && n > 0.42) this.surf[0][i] = S.MUD;
    }

    // ===== TALL GRASS / MEADOWS =====
    const meadows = [[82, 58, 9], [42, 72, 8], [48, 30, 7], [92, 92, 10], [30, 104, 8], [75, 50, 4.5], [47, 50, 4.5], [104, 60, 7], [18, 50, 7], [100, 106, 6], [70, 96, 5]];
    for (let z = 2; z < 112; z++) for (let x = 2; x < 126; x++) {
      const i = z * W + x;
      if (this.indoor[0][i] || this.get(0, x, z) !== T.OPEN || this.pathDist[i] < 1.2) continue;
      let m = 0;
      for (const [mx, mz, mr] of meadows) { const d = Math.hypot(x - mx, z - mz); if (d < mr) m = Math.max(m, 1 - d / mr); }
      const n = noise(x * 0.3 + 9, z * 0.3 - 4);
      const sparse = !inClear(x, z) && n > 0.78;
      const yardEdge = (x >= 46 && x <= 78 && z >= 43 && z <= 76) && (x < 49 || x > 75 || z < 46 || z > 73) && n > 0.45;
      if ((m > 0 && n + m * 0.6 > 0.62) || sparse || yardEdge) {
        this.cover[i] = 1;
      }
    }

    // ===== PROPS (visual + collision furniture) =====
    const prop = (model, l, x, z, w, d, h, yaw, solid, extra) => {
      const y0 = l === 0 ? (this.indoor[0][Math.floor(z) * W + Math.floor(x)] === 1 ? 0.5 : 0) : HG.LEVEL_FLOOR[l];
      const p = Object.assign({ model, level: l, x, z, w, d, h, yaw: yaw || 0, y0 }, extra || {});
      this.props.push(p);
      if (solid) this.addBox({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, level: l, kind: 'prop', h, y0, flags: F_LOW, invisible: true });
      return p;
    };
    // living room
    prop('sofa', 0, 56.5, 63.0, 2.4, 0.95, 0.9, 0, true);
    prop('table_low', 0, 56.5, 64.6, 1.2, 0.6, 0.45, 0, true);
    prop('armchair', 0, 59.6, 64.4, 0.9, 0.9, 0.95, -1.4, true);
    prop('fireplace', 0, 53.2, 64.0, 0.6, 1.6, 1.4, Math.PI / 2, true);
    prop('rug', 0, 57.2, 64.2, 3.2, 2.2, 0.01, 0, false);
    // kitchen
    prop('table', 0, 67.5, 64.0, 1.6, 1.0, 0.78, 0, true);
    prop('chair', 0, 66.4, 64.0, 0.45, 0.45, 0.9, Math.PI / 2, true);
    prop('chair', 0, 68.6, 64.2, 0.45, 0.45, 0.9, -Math.PI / 2, true);
    prop('counter', 0, 69.6, 66.45, 1.4, 0.5, 0.92, Math.PI, true);
    prop('stove', 0, 67.5, 66.45, 0.75, 0.6, 0.92, Math.PI, true);
    prop('fridge', 0, 65.5, 66.3, 0.8, 0.7, 1.8, Math.PI, true);
    // bedrooms
    prop('bed', 0, 54.4, 57.4, 1.4, 2.1, 0.6, 0, true);
    prop('bed', 0, 69.5, 57.6, 1.4, 2.1, 0.6, 0, true);
    // storage
    prop('shelf', 0, 62.4, 55.5, 0.7, 1.0, 2.0, Math.PI / 2, true);
    // basement
    prop('boiler', 1, 55.0, 65.6, 1.2, 1.0, 1.9, 0, true);
    prop('shelf', 1, 54.4, 62.8, 0.6, 1.6, 2.0, Math.PI / 2, true);
    prop('workbench', 1, 54.6, 56.4, 0.9, 1.8, 0.9, Math.PI / 2, true);
    prop('boxes', 1, 61.0, 66.3, 1.6, 0.8, 0.9, 0, true);
    // attic
    prop('boxes', 2, 56.1, 62.4, 1.2, 1.0, 0.9, 0, true);
    prop('trunk', 2, 68.6, 57.0, 0.6, 1.1, 0.6, Math.PI / 2, true);
    prop('mannequin', 2, 64.6, 56.2, 0.5, 0.5, 1.75, 0.6, true);
    prop('crib', 2, 67.4, 62.4, 0.7, 1.2, 0.9, 0.3, true);
    // shed
    prop('workbench', 0, 34.5, 44.3, 1.8, 0.7, 0.9, Math.PI, true);
    // generator area
    prop('fuel_drum', 0, 62.4, 46.1, 0.6, 0.6, 0.9, 0, true);
    prop('lamp_post', 0, 57.6, 46.2, 0.3, 0.3, 3.0, 0, true);
    // tower
    prop('tower', 0, 64, 12, 4, 4, 30, 0, false);
    // power station
    prop('flood_pole', 0, 98.2, 25.4, 0.3, 0.3, 6.5, 0, true);
    // gate
    prop('gate', 0, 64, 114.5, 4, 0.2, 2.4, 0, false);
    prop('road_sign', 0, 70.5, 115.4, 0.2, 0.2, 2.2, 0, true);
    prop('mailbox', 0, 59.5, 113.0, 0.4, 0.4, 1.2, 0, true);
    // storage building
    prop('rack', 0, 21.5, 87.0, 0.6, 1.6, 2.1, Math.PI / 2, true);
    // scattered junk
    prop('wheelbarrow', 0, 47.2, 64.5, 0.7, 1.4, 0.7, 0.8, true);
    prop('woodpile', 0, 72.6, 52.2, 1.0, 2.2, 1.0, 0, true);
    prop('car_wreck', 0, 30.6, 108.2, 1.9, 4.2, 1.4, 0.4, true);
    prop('swing', 0, 76.5, 63.0, 2.2, 0.4, 2.3, 0.2, false);
    prop('well', 0, 49.5, 52.5, 1.4, 1.4, 1.0, 0, true);
    prop('scarecrow', 0, 82.4, 57.6, 0.6, 0.6, 2.2, -0.6, false);

    // ===== CONTAINERS (search spots) =====
    const C = (id, name, l, x, z, model, yaw, opts) => {
      this.containers.push(Object.assign({ id, name, level: l, x, z, model, yaw: yaw || 0, searchTime: l === 0 ? 5.5 : 6.5, items: [], searched: false, locked: false }, opts || {}));
    };
    C('living_sideboard', 'sideboard', 0, 54.6, 66.45, 'sideboard', Math.PI, { solid: [1.3, 0.5, 0.85] });
    C('living_desk', 'writing desk', 0, 58.5, 66.4, 'desk', Math.PI, { solid: [1.2, 0.6, 0.78] });
    C('kitchen_cabinet', 'kitchen cupboard', 0, 70.4, 62.6, 'cabinet', -Math.PI / 2, { solid: [0.6, 0.9, 1.9] });
    C('kitchen_drawer', 'kitchen drawers', 0, 65.7, 62.4, 'counter', 0, { solid: [1.2, 0.6, 0.92] });
    C('bed1_dresser', 'dresser', 0, 53.7, 59.8, 'dresser', Math.PI / 2, { solid: [0.5, 1.2, 1.0] });
    C('bed1_nightstand', 'nightstand', 0, 55.6, 55.6, 'nightstand', 0, { solid: [0.45, 0.45, 0.6] });
    C('bed2_dresser', 'wardrobe', 0, 70.4, 60.2, 'dresser', -Math.PI / 2, { solid: [0.5, 1.2, 1.0] });
    C('bed2_nightstand', 'nightstand', 0, 68.0, 55.6, 'nightstand', 0, { solid: [0.45, 0.45, 0.6] });
    C('storage_boxes', 'stacked boxes', 0, 62.5, 58.0, 'boxes', Math.PI / 2, { solid: [0.8, 1.0, 1.0] });
    C('storage_shelf', 'tool shelf', 0, 63.6, 55.5, 'shelf', 0, { solid: [1.0, 0.5, 1.8] });
    C('base_workbench', 'basement workbench', 1, 55.35, 56.4, 'none', Math.PI / 2, {});
    C('base_shelves', 'basement shelves', 1, 54.4, 60.6, 'shelf', Math.PI / 2, { solid: [0.5, 1.2, 1.9] });
    C('base_crates', 'old crates', 1, 62.6, 63.2, 'boxes', 0, { solid: [0.9, 0.9, 0.8] });
    C('base_chest', 'footlocker', 1, 57.2, 66.4, 'trunk', Math.PI, { solid: [1.0, 0.5, 0.5] });
    C('attic_trunk', 'steamer trunk', 2, 60.6, 63.4, 'trunk', Math.PI, { solid: [1.0, 0.5, 0.6] });
    C('attic_boxes', 'attic boxes', 2, 66.2, 59.0, 'boxes', 0, { solid: [0.9, 0.9, 0.8] });
    C('attic_chest', 'cedar chest', 2, 55.6, 56.0, 'trunk', Math.PI / 2, { solid: [0.5, 1.0, 0.55] });
    C('shed_toolbox', 'toolbox', 0, 31.7, 41.6, 'toolbox', Math.PI / 2, { solid: [0.5, 0.8, 0.9] });
    C('shed_bench', 'shed workbench', 0, 34.5, 43.5, 'none', Math.PI, {});
    C('shed_locker', 'metal locker', 0, 31.6, 44.3, 'cabinet', Math.PI / 2, { solid: [0.55, 0.6, 1.9] });
    C('ps_cabinet', 'control cabinet', 0, 100.6, 34.3, 'cabinet', Math.PI, { solid: [0.8, 0.5, 1.9] });
    C('ps_crate', 'cable crate', 0, 106.4, 33.8, 'boxes', 0, { solid: [1.0, 1.0, 0.9] });
    C('truck_glove', 'truck cab', 0, 71.9, 81.6, 'none', -Math.PI / 2, {});
    C('truck_bed', 'truck bed', 0, 70.1, 86.0, 'none', 0, {});
    C('store_crate1', 'supply crate', 0, 21.8, 84.0, 'boxes', Math.PI / 2, { solid: [0.9, 1.0, 0.9], locked: true });
    C('store_crate2', 'locked crate', 0, 23.6, 86.9, 'boxes', 0, { solid: [1.0, 0.9, 0.9], locked: true });
    C('tower_box', 'equipment box', 0, 61.6, 15.2, 'boxes', 0, { solid: [0.9, 0.7, 0.7] });
    C('forest_pack1', 'abandoned backpack', 0, 45.2, 30.6, 'backpack', 0.4, {});
    C('forest_stand', 'hunting stand', 0, 88.6, 91.2, 'deerstand', 0.2, {});
    C('forest_pack2', 'torn backpack', 0, 30.4, 103.4, 'backpack', 2.1, {});
    C('forest_cooler', 'rusted cooler', 0, 82.6, 59.6, 'cooler', 1.1, {});
    C('forest_tent', 'collapsed tent', 0, 104.6, 61.2, 'tent', 0.7, {});
    C('forest_car', 'car wreck', 0, 31.8, 106.6, 'none', 0.4, {});
    C('yard_shed_box', 'woodpile box', 0, 72.4, 50.6, 'boxes', 0, { solid: [0.8, 0.8, 0.6] });
    for (const c of this.containers) {
      c.y0 = c.level === 0 ? (this.indoor[0][Math.floor(c.z) * W + Math.floor(c.x)] === 1 || [2, 3, 4, 5, 6, 7].includes(this.indoor[0][Math.floor(c.z) * W + Math.floor(c.x)]) ? 0.5 : 0) : HG.LEVEL_FLOOR[c.level];
      if (c.solid) this.addBox({ x0: c.x - c.solid[0] / 2, z0: c.z - c.solid[1] / 2, x1: c.x + c.solid[0] / 2, z1: c.z + c.solid[1] / 2, level: c.level, kind: 'container', h: c.solid[2], y0: c.y0, flags: F_LOW, invisible: true });
    }

    // ===== HIDE SPOTS =====
    const HS = (id, name, l, x, z, yaw) => this.hides.push({ id, name, level: l, x, z, yaw, occupant: null, lastOpened: -99 });
    HS('bed1_closet', 'closet', 0, 56.4, 55.45, Math.PI);
    HS('bed2_closet', 'closet', 0, 69.6, 55.45, Math.PI);
    HS('living_cupboard', 'linen cupboard', 0, 63.5, 66.45, 0);
    HS('kitchen_pantry', 'pantry', 0, 66.9, 62.0, Math.PI);
    HS('base_locker', 'boiler cupboard', 1, 57.5, 55.45, Math.PI);
    HS('attic_wardrobe', 'wardrobe', 2, 62.5, 55.45, Math.PI);
    HS('shed_locker', 'shed locker', 0, 35.45, 41.5, Math.PI / 2);
    HS('ps_locker', 'hut locker', 0, 103.45, 34.3, Math.PI / 2);
    HS('store_locker', 'storage locker', 0, 27.4, 83.6, Math.PI / 2);
    for (const h of this.hides) {
      h.y0 = h.level === 0 ? (this.indoor[0][Math.floor(h.z) * W + Math.floor(h.x)] ? (h.x > 52 && h.x < 72 && h.z > 54 && h.z < 68 ? 0.5 : 0.1) : 0) : HG.LEVEL_FLOOR[h.level];
      // hiding furniture is solid; the hiding person sits inside
      const s = 0.42;
      this.addBox({ x0: h.x - s, z0: h.z - s, x1: h.x + s, z1: h.z + s, level: h.level, kind: 'hide', h: 2.0, y0: h.y0, hide: h, invisible: true });
      // interaction point in front (forward = (-sin yaw, -cos yaw))
      h.ix = h.x - Math.sin(h.yaw) * 0.85;
      h.iz = h.z - Math.cos(h.yaw) * 0.85;
    }

    // ===== STATIONS =====
    const ST = (id, name, l, x, z, r) => { this.stations[id] = { id, name, level: l, x, z, r: r || 1.6 }; };
    ST('generator', 'generator', 0, 60.1, 48.6);
    ST('power_panel', 'control panel', 0, 102.4, 34.0, 1.4);
    ST('storage_door', 'storage door', 0, 24.5, 81.0, 1.5);
    ST('gate_chain', 'gate chain', 0, 64.0, 113.0, 1.8);
    ST('radio_table', 'kitchen table', 0, 67.5, 62.85, 1.4);
    ST('tower_cabinet', 'transmitter cabinet', 0, 64.0, 15.0, 1.6);
    ST('tower_zone', 'tower', 0, 64.0, 15.5, 6.5);
    ST('truck_hood', "truck's engine", 0, 70.1, 79.0, 1.6);
    ST('fusebox', 'breaker panel', 1, 65.3, 64.0, 1.4);
    ST('fallen_tree', 'fallen tree', 0, 64.0, 111.0, 2.0);
    ST('gate', 'road gate', 0, 64.0, 113.5, 3);

    // ----- reserved points: keep vegetation off furniture, containers and objectives -----
    const reserved = [];
    for (const p of this.props) reserved.push([p.x, p.z, Math.max(p.w, p.d) / 2]);
    for (const c of this.containers) reserved.push([c.x, c.z, 0.8]);
    for (const h of this.hides) reserved.push([h.x, h.z, 0.8]);
    for (const k in this.stations) { const st = this.stations[k]; reserved.push([st.x, st.z, k === 'tower_zone' ? 2 : 1.2]); }
    const reservedNear = (x, z, pad) => { for (const r of reserved) if ((x - r[0]) ** 2 + (z - r[1]) ** 2 < (r[2] + pad) ** 2) return true; return false; };
    for (const c of this.containers) if (c.level === 0) { const i = Math.floor(c.z) * W + Math.floor(c.x); this.cover[i] = 0; }
    // ===== FOREST =====
    const placeTree = (x, z, kind, scale) => {
      const cx = Math.floor(x), cz = Math.floor(z);
      if (!this.inb(cx, cz)) return false;
      if (this.get(0, cx, cz) !== T.OPEN || this.indoor[0][cz * W + cx]) return false;
      if (this.treeAt[cz * W + cx] >= 0) return false;
      if (reservedNear(x, z, 1.6)) return false;
      const r = kind === 'dead' ? 0.18 + 0.1 * scale : 0.22 + 0.14 * scale;
      const t = { x, z, r, kind, scale, rot: rnd() * Math.PI * 2, h: (kind === 'dead' ? 9 : 14) * (0.75 + scale * 0.45), lean: (rnd() - 0.5) * 0.08 };
      this.treeAt[cz * W + cx] = this.trees.length;
      this.trees.push(t);
      this.circles.push({ x, z, r, level: 0, kind: 'tree', tree: t });
      this.set(0, cx, cz, T.TREE);
      this.cover[cz * W + cx] = 0;
      return true;
    };
    for (let gz = 1.6; gz < 124; gz += 2.15) for (let gx = 1.6; gx < 127; gx += 2.15) {
      const x = gx + (rnd() - 0.5) * 1.9, z = gz + (rnd() - 0.5) * 1.9;
      const ci = Math.floor(z) * W + Math.floor(x);
      if (ci < 0 || ci >= N) continue;
      if (inClear(x, z)) continue;
      if (this.pathDist[ci] < 2.1) continue;
      if (z > 109 && z < 123.5) continue;
      const dens = noise(x * 0.07 + 3, z * 0.07 + 11);
      const edge = (x < 7 || x > 121 || z < 7 || z > 122);
      if (!edge && dens < 0.33 && rnd() < 0.6) continue;
      if (this.cover[ci] === 1 && rnd() < 0.75) continue;
      const kind = rnd() < 0.16 ? 'dead' : 'pine';
      placeTree(x, z, kind, rnd());
    }
    // a few lone trees in the yard for cover
    [[49, 47], [76, 47], [48, 74], [75, 73], [73, 55], [47, 60]].forEach(([x, z]) => placeTree(x + 0.3, z + 0.4, 'dead', 0.6));

    // ===== ROCKS =====
    for (let k = 0; k < 160; k++) {
      const x = 3 + rnd() * 122, z = 3 + rnd() * 106;
      const cx = Math.floor(x), cz = Math.floor(z), ci = cz * W + cx;
      if (this.get(0, cx, cz) !== T.OPEN || this.indoor[0][ci] || this.pathDist[ci] < 1.8 || inClear(x, z) && rnd() < 0.85) continue;
      if (reservedNear(x, z, 2.2)) continue;
      const big = rnd() < 0.18;
      const r = big ? 0.7 + rnd() * 0.5 : 0.2 + rnd() * 0.3;
      this.rocks.push({ x, z, r, big, rot: rnd() * 6.28, sx: 0.8 + rnd() * 0.5, sy: 0.5 + rnd() * 0.5 });
      if (r > 0.35) { this.circles.push({ x, z, r: r * 0.85, level: 0, kind: 'rock' }); if (big) this.set(0, cx, cz, T.ROCK); }
    }

    // ===== BUSHES =====
    for (let k = 0; k < 900; k++) {
      const x = 3 + rnd() * 122, z = 3 + rnd() * 106;
      const cx = Math.floor(x), cz = Math.floor(z), ci = cz * W + cx;
      if (this.get(0, cx, cz) !== T.OPEN || this.indoor[0][ci] || this.pathDist[ci] < 1.4) continue;
      if (inClear(x, z) && !(rnd() < 0.08)) continue;
      if (x > 50 && x < 74 && z > 52 && z < 70) continue;
      if (reservedNear(x, z, 1.4)) continue;
      this.bushes.push({ x, z, s: 0.7 + rnd() * 0.8, rot: rnd() * 6.28 });
      this.cover[ci] = 2;
    }

    // ===== DEADFALL (crawl-under logs) & THORN VEILS =====
    const deadfall = (x0, z0, x1, z1) => {
      // a raised fallen trunk: survivors must go around, crawling monster passes beneath
      const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(len);
      const log = { x0, z0, x1, z1, cells: [] };
      for (let s = 0; s <= steps; s++) {
        const x = lerp(x0, x1, s / steps), z = lerp(z0, z1, s / steps);
        const cx = Math.floor(x), cz = Math.floor(z);
        if (this.get(0, cx, cz) === T.OPEN && this.pathDist[cz * W + cx] > 1.6) {
          this.set(0, cx, cz, T.CRAWL); this.cover[cz * W + cx] = 0;
          this.addBox({ x0: cx + 0.02, z0: cz + 0.02, x1: cx + 0.98, z1: cz + 0.98, level: 0, kind: 'deadfall', h: 1.1, y0: 0, flags: F_CRAWL | F_LOW });
          log.cells.push([cx, cz]);
        }
      }
      this.logs.push(log);
    };
    deadfall(40.2, 61.3, 46.6, 66.9);
    deadfall(84.4, 46.1, 88.8, 52.6);
    deadfall(31.4, 93.2, 38.2, 96.6);
    deadfall(76.3, 94.5, 82.4, 97.6);
    const thorn = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(len * 1.2);
      const cells = [];
      for (let s = 0; s <= steps; s++) {
        const x = lerp(x0, x1, s / steps), z = lerp(z0, z1, s / steps);
        const cx = Math.floor(x), cz = Math.floor(z);
        if (this.get(0, cx, cz) === T.OPEN && this.pathDist[cz * W + cx] > 1.6) {
          this.set(0, cx, cz, T.VEIL); this.cover[cz * W + cx] = 0;
          this.addBox({ x0: cx, z0: cz, x1: cx + 1, z1: cz + 1, level: 0, kind: 'thorn', h: 2.2, y0: 0, flags: F_GHOST });
          cells.push([cx, cz]);
        }
      }
      this.windows.push({ kind: 'thornline', level: 0, cells });
    };
    thorn(70.5, 30.5, 80.5, 37.5);
    thorn(25.5, 55.5, 30.5, 63.5);
    thorn(88.5, 70.5, 96.5, 66.5);
    thorn(44.5, 104.5, 40.5, 96.5);

    // ===== LAMPS =====
    const LAMP = (id, l, x, z, y, r, circuit, color) => this.lamps.push({ id, level: l, x, z, y, r, circuit, color: color || 0xffc48a, on: true, flick: 0 });
    LAMP('living', 0, 57.5, 64.0, 3.0, 7, 'house');
    LAMP('kitchen', 0, 67.5, 64.0, 3.0, 6, 'house');
    LAMP('hall', 0, 59.6, 58.2, 3.0, 5, 'house');
    LAMP('bed1', 0, 55.0, 58.0, 3.0, 4.5, 'house');
    LAMP('bed2', 0, 68.5, 58.0, 3.0, 4.5, 'house');
    LAMP('storage', 0, 63.5, 57.5, 3.0, 4, 'house');
    LAMP('porch', 0, 61.5, 68.7, 2.8, 6, 'house', 0xffb070);
    LAMP('basement', 1, 59.5, 58.0, 0.0, 6, 'house', 0xffe0b0);
    LAMP('basement2', 1, 61.0, 64.0, 0.0, 6, 'house', 0xffe0b0);
    LAMP('attic', 2, 62.0, 59.5, 5.6, 6, 'house', 0xffd8a0);
    LAMP('genlamp', 0, 57.6, 46.2, 3.0, 9, 'generator', 0xe8f0ff);
    LAMP('flood', 0, 98.2, 25.4, 6.4, 18, 'station', 0xdfe8ff);
    LAMP('shed', 0, 33.0, 42.5, 2.4, 4.5, 'shed', 0xffb26a);
    LAMP('gatelight', 0, 61.3, 114.3, 3.4, 10, 'gate', 0xff4030);

    // ===== furniture blocks navigation (but not sight) =====
    for (const b of this.boxes) if (b.kind === 'prop' || b.kind === 'container' || b.kind === 'hide') {
      for (let z = Math.floor(b.z0); z <= Math.floor(b.z1); z++) for (let x = Math.floor(b.x0); x <= Math.floor(b.x1); x++) {
        const cx = x + 0.5, cz = z + 0.5;
        if (cx >= b.x0 - 0.05 && cx <= b.x1 + 0.05 && cz >= b.z0 - 0.05 && cz <= b.z1 + 0.05 && this.get(b.level, x, z) === T.OPEN) this.set(b.level, x, z, b.kind === 'hide' ? T.WALL : T.WINDOW);
      }
    }

    // ===== FLATTEN ZONES / TERRAIN =====
    const FZ = (x0, z0, x1, z1, h, f) => this.flatZones.push({ x0, z0, x1, z1, h, f });
    FZ(50, 52, 74, 72, 0, 7); FZ(29, 39, 37, 46, 0, 5); FZ(56, 44, 64, 50, 0, 5); FZ(95, 23, 109, 37, 0, 6);
    FZ(19, 81, 29, 89, 0, 5); FZ(60, 8, 68, 17, 0, 6); FZ(0, 110, 128, 123, 0, 5); FZ(67, 78, 73, 87, 0, 4);
    this.buildHeights(noise);

    // ===== collision hash =====
    this.buildHash();
  };

  P.buildHeights = function (noise) {
    const V = W + 1;
    this.heights = new Float32Array(V * V);
    for (let z = 0; z <= H; z++) for (let x = 0; x <= W; x++) {
      let h = (noise(x * 0.045, z * 0.045) - 0.5) * 2.6 + (noise(x * 0.16 + 31, z * 0.16 + 7) - 0.5) * 0.7 + (noise(x * 0.6, z * 0.6) - 0.5) * 0.12;
      // paths are slightly worn in
      const ci = Math.min(z, H - 1) * W + Math.min(x, W - 1);
      if (this.pathDist[ci] < 2) h -= 0.08;
      let m = 0, target = 0;
      for (const f of this.flatZones) {
        const dx = Math.max(f.x0 - x, 0, x - f.x1), dz = Math.max(f.z0 - z, 0, z - f.z1);
        const d = Math.hypot(dx, dz);
        const w = 1 - smooth(0, f.f, d);
        if (w > m) { m = w; target = f.h; }
      }
      // gentle lowering toward the edges (valley around the property)
      const edge = Math.max(0, 1 - Math.min(x, z, W - x, 112 - Math.min(z, 112)) / 14);
      h += edge * 1.6;
      this.heights[z * V + x] = lerp(h, target, m);
    }
  };
  P.terrainY = function (x, z) {
    const V = W + 1;
    x = clamp(x, 0, W - 0.001); z = clamp(z, 0, H - 0.001);
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const a = this.heights[zi * V + xi], b = this.heights[zi * V + xi + 1], c = this.heights[(zi + 1) * V + xi], d = this.heights[(zi + 1) * V + xi + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
  };
  // Floor height for an agent at (x,z) on level l
  P.floorY = function (l, x, z) {
    const cx = Math.floor(x), cz = Math.floor(z);
    const i = cz * W + cx;
    if (cx >= 0 && cz >= 0 && cx < W && cz < H) {
      const sr = this.stairRef[i];
      if (sr >= 0 && (l === this.stairs[sr].A || l === this.stairs[sr].B)) {
        const st = this.stairs[sr];
        const p = clamp((st.start - z) / st.len, 0, 1);
        return lerp(st.yA, st.yB, p);
      }
      if (l !== 0) return HG.LEVEL_FLOOR[l];
      const room = this.indoor[0][i];
      if (room >= 1 && room <= 7) return 0.5;
      if (room === 30) return 0.45;
      if (room === 40) return 0.12;
      if (room === 50 || room === 60) return 0.1;
    } else if (l !== 0) return HG.LEVEL_FLOOR[l];
    return this.terrainY(x, z);
  };

  P.buildHash = function () {
    this.colHash = [];
    for (let l = 0; l < LEVELS; l++) this.colHash.push(new Map());
    const add = (l, cx, cz, ref) => {
      const k = cz * W + cx; const m = this.colHash[l];
      let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(ref);
    };
    for (const b of this.boxes) {
      if (b.kind === 'boundary') continue;
      for (let z = Math.floor(b.z0 - 0.5); z <= Math.floor(b.z1 + 0.5); z++)
        for (let x = Math.floor(b.x0 - 0.5); x <= Math.floor(b.x1 + 0.5); x++) if (this.inb(x, z)) add(b.level, x, z, b);
    }
    for (const c of this.circles) {
      for (let z = Math.floor(c.z - c.r - 0.5); z <= Math.floor(c.z + c.r + 0.5); z++)
        for (let x = Math.floor(c.x - c.r - 0.5); x <= Math.floor(c.x + c.r + 0.5); x++) if (this.inb(x, z)) add(c.level, x, z, c);
    }
    this.boundaries = this.boxes.filter(b => b.kind === 'boundary');
  };

  /* ---------- collision ----------
     mode: { crawl, ghost } — which flagged colliders the mover may ignore */
  P.collide = function (ent, mode) {
    const l = ent.level, r = ent.radius;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const cx = Math.floor(ent.x), cz = Math.floor(ent.z);
      const seen = new Set();
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const arr = this.colHash[l].get((cz + dz) * W + cx + dx);
        if (!arr) continue;
        for (const c of arr) {
          if (seen.has(c)) continue; seen.add(c);
          if (c.x0 !== undefined) {
            if (!c.enabled) continue;
            if (c.door && c.door.open) continue;
            if (mode && mode.ghost && (c.flags & F_GHOST)) continue;
            if (mode && mode.crawl && (c.flags & F_CRAWL)) continue;
            if (mode && mode.ghost && c.kind === 'door') continue;
            const px = clamp(ent.x, c.x0, c.x1), pz = clamp(ent.z, c.z0, c.z1);
            let dx2 = ent.x - px, dz2 = ent.z - pz; const d2 = dx2 * dx2 + dz2 * dz2;
            if (d2 < r * r) {
              if (d2 > 1e-8) {
                const d = Math.sqrt(d2), push = r - d;
                ent.x += dx2 / d * push; ent.z += dz2 / d * push;
              } else {
                // centre inside box: push out along smallest axis
                const l1 = ent.x - c.x0, r1 = c.x1 - ent.x, t1 = ent.z - c.z0, b1 = c.z1 - ent.z;
                const m = Math.min(l1, r1, t1, b1);
                if (m === l1) ent.x = c.x0 - r; else if (m === r1) ent.x = c.x1 + r; else if (m === t1) ent.z = c.z0 - r; else ent.z = c.z1 + r;
              }
              moved = true; ent._hit = c;
            }
          } else {
            const dx2 = ent.x - c.x, dz2 = ent.z - c.z, rr = r + c.r; const d2 = dx2 * dx2 + dz2 * dz2;
            if (d2 < rr * rr && d2 > 1e-8) {
              const d = Math.sqrt(d2), push = rr - d; ent.x += dx2 / d * push; ent.z += dz2 / d * push; moved = true; ent._hit = c;
            }
          }
        }
      }
      if (!moved) break;
    }
    ent.x = clamp(ent.x, 1.5, W - 1.5); ent.z = clamp(ent.z, 1.5, 123.2);
  };

  /* ---------- passability for navigation ---------- */
  // caps: {crawl, ghost, opener(bool: may path through closed unlocked doors)}
  P.passable = function (l, x, z, caps) {
    if (!this.inb(x, z)) return false;
    const i = z * W + x;
    const t = this.grid[l][i];
    switch (t) {
      case T.OPEN: return true;
      case T.STAIR: return this.stairOwner[l][i] === l;
      case T.DOOR: {
        const d = this.doorAt(l, x, z);
        return d ? (!d.locked || (caps && caps.ghost)) : true;
      }
      case T.CRAWL: return !!(caps && caps.crawl);
      case T.VEIL: return !!(caps && caps.ghost);
      case T.FENCE: {
        // open gate cells become OPEN in grid when gate opens
        return false;
      }
      default: return false;
    }
  };
  P.doorAt = function (l, x, z) {
    if (!this._doorMap) {
      this._doorMap = new Map();
      for (const d of this.doors) this._doorMap.set(d.level * N + d.cz * W + d.cx, d);
    }
    return this._doorMap.get(l * N + z * W + x);
  };

  /* ---------- line of sight (2D DDA, same level) ----------
     returns {clear, bush:n}. Trees test against trunk circles; low objects and windows pass. */
  P.los = function (l, ax, az, bx, bz, ignoreVeil) {
    let x = Math.floor(ax), z = Math.floor(az);
    const ex = Math.floor(bx), ez = Math.floor(bz);
    const dx = bx - ax, dz = bz - az;
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(1 / dx) : 1e9, tDZ = dz !== 0 ? Math.abs(1 / dz) : 1e9;
    let tMX = dx !== 0 ? (dx > 0 ? (x + 1 - ax) : (ax - x)) * tDX : 1e9;
    let tMZ = dz !== 0 ? (dz > 0 ? (z + 1 - az) : (az - z)) * tDZ : 1e9;
    let bush = 0; let n = 0;
    const g = this.grid[l];
    while (n++ < 400) {
      if (!(x === Math.floor(ax) && z === Math.floor(az)) && !(x === ex && z === ez)) {
        const i = z * W + x;
        const t = g[i];
        if (t === T.WALL || t === T.VOID || t === T.ROCK) return { clear: false, bush };
        if (t === T.VEIL && !ignoreVeil) return { clear: false, bush };
        if (t === T.DOOR) { const d = this.doorAt(l, x, z); if (d && !d.open) return { clear: false, bush }; }
        if (t === T.TREE && l === 0) {
          const tr = this.trees[this.treeAt[i]];
          if (tr && segCircle(ax, az, bx, bz, tr.x, tr.z, tr.r + 0.05)) return { clear: false, bush };
        }
        if (l === 0 && this.cover[i] === 2) bush++;
      }
      if (x === ex && z === ez) break;
      if (tMX < tMZ) { tMX += tDX; x += stepX; } else { tMZ += tDZ; z += stepZ; }
      if (!this.inb(x, z)) return { clear: false, bush };
    }
    return { clear: true, bush };
  };
  function segCircle(ax, az, bx, bz, cx, cz, r) {
    const dx = bx - ax, dz = bz - az; const L2 = dx * dx + dz * dz;
    const t = L2 ? clamp(((cx - ax) * dx + (cz - az) * dz) / L2, 0, 1) : 0;
    const qx = ax + dx * t - cx, qz = az + dz * t - cz; return qx * qx + qz * qz < r * r;
  }
  HG.segCircle = segCircle;

  // Count sound-blocking cells between two points (for muffling)
  P.wallsBetween = function (l1, ax, az, l2, bx, bz) {
    let walls = 0;
    if (l1 !== l2) walls += 2 * Math.abs(l1 - l2) + (l1 * l2 === 0 ? 0 : 1);
    const l = l1;
    let x = Math.floor(ax), z = Math.floor(az);
    const ex = Math.floor(bx), ez = Math.floor(bz);
    const dx = bx - ax, dz = bz - az;
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(1 / dx) : 1e9, tDZ = dz !== 0 ? Math.abs(1 / dz) : 1e9;
    let tMX = dx !== 0 ? (dx > 0 ? (x + 1 - ax) : (ax - x)) * tDX : 1e9;
    let tMZ = dz !== 0 ? (dz > 0 ? (z + 1 - az) : (az - z)) * tDZ : 1e9;
    let n = 0;
    const g = this.grid[l];
    while (n++ < 300) {
      if (this.inb(x, z)) {
        const t = g[z * W + x];
        if (t === T.WALL) walls += 1;
        else if (t === T.DOOR) { const d = this.doorAt(l, x, z); if (d && !d.open) walls += 0.8; }
        else if (t === T.WINDOW && this.indoor[l][z * W + x] === 0) walls += 0.4;
      }
      if (x === ex && z === ez) break;
      if (tMX < tMZ) { tMX += tDX; x += stepX; } else { tMZ += tDZ; z += stepZ; }
    }
    return walls;
  };

  P.regionName = function (l, x, z) {
    for (const r of this.regions) if (r.level === l && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.name;
    // compass from house
    const dx = x - 62, dz = z - 61;
    const d = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, -dz) * 180 / Math.PI;
    const dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    const dir = dirs[((Math.round(ang / 45) % 8) + 8) % 8];
    return d > 40 ? `deep in the woods ${dir}` : `in the woods ${dir} of the house`;
  };
  P.isHouse = function (l, x, z) {
    if (l !== 0) return true;
    const r = this.indoor[0][Math.floor(z) * W + Math.floor(x)];
    return r >= 1 && r <= 7;
  };

  /* ---------- A* navigation ---------- */
  function Heap() { this.a = []; this.f = []; }
  Heap.prototype.push = function (n, f) {
    const a = this.a, F = this.f; let i = a.length; a.push(n); F.push(f);
    while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; a[i] = a[p]; F[i] = F[p]; i = p; }
    a[i] = n; F[i] = f;
  };
  Heap.prototype.pop = function () {
    const a = this.a, F = this.f; const top = a[0]; const ln = a.pop(), lf = F.pop();
    if (a.length) {
      let i = 0; const L = a.length;
      while (true) {
        let c = 2 * i + 1; if (c >= L) break;
        if (c + 1 < L && F[c + 1] < F[c]) c++;
        if (F[c] >= lf) break;
        a[i] = a[c]; F[i] = F[c]; i = c;
      }
      a[i] = ln; F[i] = lf;
    }
    return top;
  };
  Heap.prototype.size = function () { return this.a.length; };

  P.initNav = function () {
    const total = N * LEVELS;
    this._g = new Float32Array(total);
    this._par = new Int32Array(total);
    this._stamp = new Uint32Array(total);
    this._closed = new Uint32Array(total);
    this._gen = 1;
    // stair links: between the last A-owned and first B-owned cell
    this.links = new Map();
    for (const st of this.stairs) {
      const a = st.cells[1], b = st.cells[2];
      const na = st.A * N + a.z * W + a.x, nb = st.B * N + b.z * W + b.x;
      this.links.set(na, (this.links.get(na) || []).concat([nb]));
      this.links.set(nb, (this.links.get(nb) || []).concat([na]));
    }
  };
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  // Connected components per capability set, so impossible paths fail instantly.
  P.capKey = function (caps) { return caps && caps.ghost ? 2 : (caps && caps.crawl ? 1 : 0); };
  P.computeComponents = function () {
    if (!this._g) this.initNav();
    this.comps = [];
    const total = N * LEVELS;
    const capsList = [{}, { crawl: true }, { crawl: true, ghost: true }];
    for (let k = 0; k < 3; k++) {
      const caps = capsList[k];
      const comp = new Int32Array(total).fill(-1);
      let id = 0; const stack = [];
      for (let n0 = 0; n0 < total; n0++) {
        if (comp[n0] >= 0) continue;
        const l0 = (n0 / N) | 0, r0 = n0 - l0 * N, z0 = (r0 / W) | 0, x0 = r0 - z0 * W;
        if (!this.passable(l0, x0, z0, caps)) continue;
        comp[n0] = id; stack.push(n0);
        while (stack.length) {
          const n = stack.pop();
          const l = (n / N) | 0, rem = n - l * N, z = (rem / W) | 0, x = rem - z * W;
          for (let d = 0; d < 4; d++) {
            const nx = x + DIRS[d][0], nz = z + DIRS[d][1];
            if (!this.passable(l, nx, nz, caps)) continue;
            const ni = l * N + nz * W + nx;
            if (comp[ni] < 0) { comp[ni] = id; stack.push(ni); }
          }
          const lk = this.links.get(n);
          if (lk) for (const ni of lk) if (comp[ni] < 0) { comp[ni] = id; stack.push(ni); }
        }
        id++;
      }
      this.comps.push(comp);
    }
    this.compDirty = false;
  };
  P.markDirty = function () { this.compDirty = true; };

  /* findPath(from {level,x,z}, to {level,x,z}, caps, costFn(level,i) -> extra cost, maxIter) */
  P.findPath = function (from, to, caps, costFn, maxIter) {
    if (!this._g) this.initNav();
    maxIter = maxIter || 60000;
    const gen = ++this._gen;
    let sx = Math.floor(from.x), sz = Math.floor(from.z), sl = from.level;
    let tx = Math.floor(to.x), tz = Math.floor(to.z), tl = to.level;
    // nudge start/goal into passable cells
    const nudge = (l, x, z) => {
      if (this.passable(l, x, z, caps)) return [x, z];
      for (let r = 1; r <= 3; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++)
        if (this.passable(l, x + dx, z + dz, caps)) return [x + dx, z + dz];
      return null;
    };
    const s = nudge(sl, sx, sz);
    if (!s) return null;
    [sx, sz] = s;
    // goal set: the target cell, or every passable cell within reach of the target point
    const goals = new Set();
    if (this.passable(tl, tx, tz, caps)) goals.add(tl * N + tz * W + tx);
    else {
      const R = to.reach || 1.6;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const gx = tx + dx, gz = tz + dz;
        if (Math.hypot(gx + 0.5 - to.x, gz + 0.5 - to.z) <= R && this.passable(tl, gx, gz, caps)) goals.add(tl * N + gz * W + gx);
      }
      if (!goals.size) { const t = nudge(tl, tx, tz); if (!t) return null; goals.add(tl * N + t[1] * W + t[0]); }
    }
    const start = sl * N + sz * W + sx;
    let goal = -1;
    if (!this.comps || this.compDirty) this.computeComponents();
    const comp = this.comps[this.capKey(caps)];
    let reachable = false;
    for (const gnode of goals) if (comp[gnode] === comp[start]) { reachable = true; break; }
    if (!reachable) return null;
    const heap = new Heap();
    const g = this._g, par = this._par, stamp = this._stamp, closed = this._closed;
    g[start] = 0; par[start] = -1; stamp[start] = gen;
    const hfn = (l, x, z) => Math.hypot(x - tx, z - tz) + Math.abs(l - tl) * 6;
    heap.push(start, hfn(sl, sx, sz));
    let it = 0, found = false, best = start, bestH = 1e9;
    while (heap.size() && it++ < maxIter) {
      const n = heap.pop();
      if (closed[n] === gen) continue;
      closed[n] = gen;
      if (goals.has(n)) { found = true; goal = n; break; }
      const l = (n / N) | 0, rem = n - l * N, z = (rem / W) | 0, x = rem - z * W;
      const hh = hfn(l, x, z); if (hh < bestH) { bestH = hh; best = n; }
      const gn = g[n];
      for (let k = 0; k < 8; k++) {
        const d = DIRS[k]; const nx = x + d[0], nz = z + d[1];
        if (!this.passable(l, nx, nz, caps)) continue;
        if (k >= 4 && (!this.passable(l, x + d[0], z, caps) || !this.passable(l, x, z + d[1], caps))) continue;
        const ni = l * N + nz * W + nx;
        if (closed[ni] === gen) continue;
        const ci = nz * W + nx;
        let c = d[2];
        const t = this.grid[l][ci];
        if (t === T.DOOR) c += 0.6;
        if (t === T.CRAWL) c += 2.5;
        if (t === T.VEIL) c += 3;
        if (costFn) c += costFn(l, ci, nx, nz);
        const ng = gn + c;
        if (stamp[ni] !== gen || ng < g[ni]) {
          stamp[ni] = gen; g[ni] = ng; par[ni] = n;
          heap.push(ni, ng + hfn(l, nx, nz) * 1.3);
        }
      }
      const lk = this.links.get(n);
      if (lk) for (const ni of lk) {
        if (closed[ni] === gen) continue;
        const ng = gn + 1;
        if (stamp[ni] !== gen || ng < g[ni]) {
          stamp[ni] = gen; g[ni] = ng; par[ni] = n;
          const l2 = (ni / N) | 0, r2 = ni - l2 * N, z2 = (r2 / W) | 0, x2 = r2 - z2 * W;
          heap.push(ni, ng + hfn(l2, x2, z2));
        }
      }
    }
    if (!found) return null;
    const out = [];
    let n = goal;
    while (n !== -1) {
      const l = (n / N) | 0, rem = n - l * N, z = (rem / W) | 0, x = rem - z * W;
      out.push({ level: l, x: x + 0.5, z: z + 0.5 });
      n = par[n];
    }
    out.reverse();
    if (out.length) { const last = out[out.length - 1]; if (to.level === last.level && Math.floor(to.x) === Math.floor(last.x) && Math.floor(to.z) === Math.floor(last.z)) { last.x = to.x; last.z = to.z; } }
    return this.smoothPath(out, caps, from.radius || 0.35);
  };
  P.pathCost = function () { return this._g; };

  // Walkable straight line check for path smoothing (samples cells with clearance)
  P.walkLine = function (l, ax, az, bx, bz, caps, r) {
    const d = Math.hypot(bx - ax, bz - az); const steps = Math.ceil(d / 0.3);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps; const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const offs = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
      for (const [ox, oz] of offs) {
        const cx = Math.floor(x + ox), cz = Math.floor(z + oz);
        if (!this.passable(l, cx, cz, caps)) return false;
        const tt = this.grid[l][cz * W + cx];
        if (tt === T.DOOR || tt === T.CRAWL || tt === T.VEIL || tt === T.STAIR) return false;
      }
    }
    return true;
  };
  P.smoothPath = function (pts, caps, r) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + 12);
      while (j > i + 1) {
        const a = pts[i], b = pts[j];
        if (a.level === b.level && this.walkLine(a.level, a.x, a.z, b.x, b.z, caps, r + 0.15)) {
          // also ensure no level change in between
          let ok = true; for (let k = i + 1; k < j; k++) if (pts[k].level !== a.level) { ok = false; break; }
          if (ok) break;
        }
        j--;
      }
      out.push(pts[j]); i = j;
    }
    return out;
  };

  // Random reachable point near (x,z) on level l
  P.randomOpenNear = function (rnd, l, x, z, rmin, rmax, caps, tries) {
    tries = tries || 30;
    for (let k = 0; k < tries; k++) {
      const a = rnd() * Math.PI * 2, d = rmin + rnd() * (rmax - rmin);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const cx = Math.floor(px), cz = Math.floor(pz);
      if (this.passable(l, cx, cz, caps) && this.grid[l][cz * W + cx] === T.OPEN) return { level: l, x: cx + 0.5, z: cz + 0.5 };
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
