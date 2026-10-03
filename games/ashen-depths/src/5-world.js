/* =====================================================================
   WORLD — procedural dungeon generation, rooms, props, doors, fog of war,
   tile collision and the enemy path-finding flow field
   ===================================================================== */
const T_WALL = 0, T_FLOOR = 1, T_LIQ = 2, T_DOOR = 3, T_CRACK = 4;
const isSolidT = t => t === T_WALL || t === T_DOOR || t === T_CRACK;

/**
 * Generate one floor.
 *  1. scatter non-overlapping rooms (boss floors reserve one large arena first)
 *  2. connect them with a minimum spanning tree (Prim) + a couple of loops, carving 2-wide corridors
 *  3. pick start / exit by BFS distance, then assign room types (shop, treasure, events, elites...)
 *  4. try to attach a secret room behind a cracked wall (chance scales with Luck)
 *  5. decorate: liquids, traps, torches, barrels, chests, NPCs, decor
 */
function genDungeon(seed, bi, o) {
  const r = RNG(seed), B = BIOMES[bi];
  const W = 72, H = 58;
  const t = new Uint8Array(W * H), room = new Int16Array(W * H).fill(-1), deco = new Uint8Array(W * H);
  const rooms = [];
  const place = (w, h, tries) => {
    for (let k = 0; k < tries; k++) {
      const x = r.int(2, W - w - 3), y = r.int(3, H - h - 3);
      let ok = true;
      for (const q of rooms) if (x < q.x + q.w + 4 && x + w + 4 > q.x && y < q.y + q.h + 4 && y + h + 4 > q.y) { ok = false; break; }
      if (ok) { const rm = { x, y, w, h, cx: x + w / 2, cy: y + h / 2, id: rooms.length, type: 'monster', cleared: false, visited: false, spawned: false, doors: [], waves: 1 }; rooms.push(rm); return rm; }
    }
    return null;
  };
  if (o.boss) place(20, 15, 800);
  const target = r.int(10, 13);
  for (let i = 0; i < 400 && rooms.length < target; i++) place(r.int(7, 12), r.int(6, 9), 1);
  for (const q of rooms) for (let y = q.y; y < q.y + q.h; y++) for (let x = q.x; x < q.x + q.w; x++) { t[y * W + x] = T_FLOOR; room[y * W + x] = q.id; }
  // --- connect rooms (Prim's MST on room centres) ---
  const conn = [0], rest = rooms.slice(1).map(q => q.id), edges = [];
  while (rest.length) {
    let best = null, bd = 1e9;
    for (const a of conn) for (const b of rest) { const d = (rooms[a].cx - rooms[b].cx) ** 2 + (rooms[a].cy - rooms[b].cy) ** 2; if (d < bd) { bd = d; best = [a, b]; } }
    edges.push(best); conn.push(best[1]); rest.splice(rest.indexOf(best[1]), 1);
  }
  for (let i = 0; i < 2; i++) { const a = r.int(0, rooms.length - 1), b = r.int(0, rooms.length - 1); if (a !== b && !edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) edges.push([a, b]); }
  const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && t[y * W + x] === T_WALL) t[y * W + x] = T_FLOOR; };
  for (const [a, b] of edges) {
    const A = rooms[a], Bq = rooms[b];
    let x0 = Math.floor(A.cx), y0 = Math.floor(A.cy); const x1 = Math.floor(Bq.cx), y1 = Math.floor(Bq.cy);
    const horizFirst = r() < .5;
    const hseg = (y) => { const s = Math.sign(x1 - x0) || 1; for (let x = x0; x !== x1 + s; x += s) { carve(x, y); carve(x, y + 1); } };
    const vseg = (x) => { const s = Math.sign(y1 - y0) || 1; for (let y = y0; y !== y1 + s; y += s) { carve(x, y); carve(x + 1, y); } };
    if (horizFirst) { hseg(y0); vseg(x1); } else { vseg(x0); hseg(y1); }
  }
  // --- BFS helper over walkable tiles ---
  const bfs = (sx, sy) => {
    const d = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W + x + dx; if (d[j] < 0 && t[j] !== T_WALL) { d[j] = d[i] + 1; q.push(j); } } }
    return d;
  };
  const rc = q => (Math.floor(q.cy) * W + Math.floor(q.cx));
  let start, exit;
  if (o.boss) {
    const d = bfs(Math.floor(rooms[0].cx), Math.floor(rooms[0].cy));
    rooms[0].type = 'boss';
    start = rooms.slice(1).reduce((a, b) => d[rc(b)] > d[rc(a)] ? b : a);
    exit = rooms[0];
  } else {
    start = rooms[r.int(0, rooms.length - 1)];
    const d = bfs(Math.floor(start.cx), Math.floor(start.cy));
    exit = rooms.filter(q => q !== start).reduce((a, b) => d[rc(b)] > d[rc(a)] ? b : a);
    exit.exit = true;
  }
  start.type = 'start'; start.cleared = true;
  // --- assign special rooms ---
  const lf = luckFactor(o.luck);
  const free = shuffle(rooms.filter(q => q !== start && q !== exit && q.type === 'monster'), r);
  const assign = (type, extra = {}) => { if (free.length > 3) { const q = free.pop(); q.type = type; Object.assign(q, extra); if (type !== 'elite') q.cleared = true; return q; } return null; };
  assign('treasure');
  if (o.floorNum === 2 || o.boss || r.chance(.5)) assign('shop');
  if (r.chance((o.boss ? .8 : .45) * DIFFS[o.diff].heal)) assign('heal');
  const evs = 1 + (r.chance(.35 + lf * .5) ? 1 : 0);
  const evPool = [['shrine', 3], ['gamble', 2], ['cursed', 2], ['merchant', 1 + lf * 3], ['altar', 1.5], ['goblin', 1 + lf * 3], ['miniboss', 1.5]];
  for (let i = 0; i < evs; i++) { const ev = weightedPick(evPool, e => e[1], r)[0]; const q = assign('event', { event: ev }); if (q && (ev === 'miniboss' || ev === 'goblin')) q.cleared = false; }
  assign('elite'); if (o.depth > 5 && r.chance(.6)) assign('elite');
  for (const q of rooms) if (q.type === 'monster' && o.depth > 3 && r.chance(.25 + o.depth * .01)) q.waves = 2;
  // --- secret room behind a cracked wall ---
  if (r.chance(Math.min(.85, .35 + lf * .6))) {
    const cands = shuffle(rooms.filter(q => q.type !== 'boss'), r);
    outer: for (const q of cands) for (const side of shuffle([0, 1, 2, 3], r)) {
      const sw = 6, sh = 5; let sx, sy, cx, cy;
      if (side === 0) { sx = q.x + q.w + 1; sy = q.y + r.int(0, Math.max(0, q.h - sh)); cx = q.x + q.w; cy = sy + 2; }
      else if (side === 1) { sx = q.x - sw - 1; sy = q.y + r.int(0, Math.max(0, q.h - sh)); cx = q.x - 1; cy = sy + 2; }
      else if (side === 2) { sy = q.y + q.h + 1; sx = q.x + r.int(0, Math.max(0, q.w - sw)); cx = sx + 3; cy = q.y + q.h; }
      else { sy = q.y - sh - 1; sx = q.x + r.int(0, Math.max(0, q.w - sw)); cx = sx + 3; cy = q.y - 1; }
      if (sx < 2 || sy < 3 || sx + sw > W - 2 || sy + sh > H - 2) continue;
      let ok = true;
      for (let y = sy - 1; y <= sy + sh; y++) for (let x = sx - 1; x <= sx + sw; x++) if (t[y * W + x] !== T_WALL) ok = false;
      if (!ok || t[cy * W + cx] !== T_WALL) continue;
      const sr = { x: sx, y: sy, w: sw, h: sh, cx: sx + sw / 2, cy: sy + sh / 2, id: rooms.length, type: 'secret', cleared: true, visited: false, doors: [], crack: { x: cx, y: cy } };
      rooms.push(sr);
      for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) { t[y * W + x] = T_FLOOR; room[y * W + x] = sr.id; }
      t[cy * W + cx] = T_CRACK;
      break outer;
    }
  }
  // --- doors: perimeter floor tiles of each room ---
  for (const q of rooms) {
    if (q.type === 'secret') continue;
    for (let x = q.x - 1; x <= q.x + q.w; x++) for (const y of [q.y - 1, q.y + q.h]) if (t[y * W + x] === T_FLOOR) q.doors.push(y * W + x);
    for (let y = q.y; y < q.y + q.h; y++) for (const x of [q.x - 1, q.x + q.w]) if (t[y * W + x] === T_FLOOR) q.doors.push(y * W + x);
  }
  // --- decoration & props ---
  const props = [], occ = new Set();
  const P = (type, tx, ty, extra = {}) => { const p = Object.assign({ type, x: tx * TS + 8, y: ty * TS + 9, tx, ty, t: 0, uid: UID++ }, extra); props.push(p); occ.add(ty * W + tx); return p; };
  const doorNear = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (t[(y + dy) * W + x + dx] === T_FLOOR && room[(y + dy) * W + x + dx] < 0) return true; return false; };
  const spot = (q, m = 1) => { for (let k = 0; k < 40; k++) { const x = r.int(q.x + m, q.x + q.w - 1 - m), y = r.int(q.y + m, q.y + q.h - 1 - m); const i = y * W + x; if (t[i] === T_FLOOR && !occ.has(i) && !doorNear(x, y)) return [x, y]; } return null; };
  const center = q => [Math.floor(q.cx), Math.floor(q.cy)];
  const solidProp = { solid: true, r: 6 };
  for (const q of rooms) {
    // torches on the top wall
    const nT = q.type === 'boss' ? 5 : r.int(1, 3);
    for (let k = 0; k < nT; k++) { const x = r.int(q.x, q.x + q.w - 1); if (t[(q.y - 1) * W + x] === T_WALL && !props.some(p => p.type === 'torch' && Math.abs(p.tx - x) < 2 && p.ty === q.y - 1)) P('torch', x, q.y - 1); }
    // liquids
    if (B.liquid && ['monster', 'elite', 'boss', 'event'].includes(q.type) && r.chance(q.type === 'boss' ? .9 : .55)) {
      const n = r.int(1, q.type === 'boss' ? 4 : 2);
      for (let k = 0; k < n; k++) {
        const cx = r.int(q.x + 2, q.x + q.w - 3), cy = r.int(q.y + 2, q.y + q.h - 3), rad = r() * 1.6 + 1.2;
        for (let y = q.y + 1; y < q.y + q.h - 1; y++) for (let x = q.x + 1; x < q.x + q.w - 1; x++) if (Math.hypot(x - cx, (y - cy) * 1.2) < rad && !(q.type === 'boss' && Math.hypot(x - q.cx, y - q.cy) < 3)) t[y * W + x] = T_LIQ;
      }
    }
    if (['monster', 'elite'].includes(q.type)) {
      const nb = r.int(0, 3);
      for (let k = 0; k < nb; k++) { const s = spot(q, 0); if (s) { const typ = r.chance(B.liquid === 'lava' ? .3 : .1) ? 'xbarrel' : r.chance(.5) ? 'barrel' : 'crate'; P(typ, s[0], s[1], { ...solidProp, hp: 1 }); } }
    }
    const c = center(q);
    switch (q.type) {
      case 'treasure': {
        P('chest', c[0], c[1], { ...solidProp, big: true });
        const n = 1 + (r.chance(lf) ? 1 : 0);
        for (let k = 0; k < n; k++) { const s = spot(q, 1); if (s) P('chest', s[0], s[1], { ...solidProp, mimic: r.chance(.1) }); }
        break;
      }
      case 'shop': P('shopkeeper', c[0], c[1] - 1, { ...solidProp }); break;
      case 'heal': P('fountain', c[0], c[1], { ...solidProp, r: 8 }); break;
      case 'secret': P('chest', c[0], c[1], { ...solidProp, big: true }); { const s = spot(q, 0); if (s) P('orb', s[0], s[1], { boon: true }); } break;
      case 'event':
        if (q.event === 'shrine') P('shrine', c[0], c[1], solidProp);
        else if (q.event === 'gamble') P('gamble', c[0], c[1], solidProp);
        else if (q.event === 'cursed') P('cursed', c[0], c[1], solidProp);
        else if (q.event === 'merchant') P('merchant', c[0], c[1], solidProp);
        else if (q.event === 'altar') P('altar', c[0], c[1], solidProp);
        break;
    }
    if (q.exit) P('stairs', c[0], c[1]);
    if (q.type === 'monster' && r.chance(.12)) { const s = spot(q, 1); if (s) P('chest', s[0], s[1], { ...solidProp, mimic: r.chance(.35) }); }
  }
  // traps
  const trapN = r.int(4, 8) + Math.min(6, o.depth >> 1);
  for (let k = 0; k < trapN; k++) {
    const q = r.pick(rooms.filter(q => ['monster', 'elite', 'treasure', 'event'].includes(q.type)));
    if (!q) break;
    if (B.trap === 'arrow' && r.chance(.6)) {
      const x = r.int(q.x + 1, q.x + q.w - 2);
      if (t[(q.y - 1) * W + x] === T_WALL && !occ.has((q.y - 1) * W + x)) P('arrowtrap', x, q.y - 1, { cd: 0 });
      continue;
    }
    const s = spot(q, 1);
    if (s) P(B.trap === 'vent' ? 'vent' : 'spikes', s[0], s[1], { phase: r() * 3 });
  }
  // corridor spikes
  for (let k = 0; k < 4; k++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = r.int(2, W - 3), y = r.int(2, H - 3), i = y * W + x;
      if (t[i] === T_FLOOR && room[i] < 0 && !occ.has(i)) { P(B.trap === 'vent' ? 'vent' : 'spikes', x, y, { phase: r() * 3 }); break; }
    }
  }
  // floor decor
  for (let i = 0; i < W * H; i++) if (t[i] === T_FLOOR && !occ.has(i) && r.chance(.07)) deco[i] = 1 + r.int(0, B.decor.length - 1);
  return { w: W, h: H, t, room, rooms, deco, explored: new Uint8Array(W * H), props, start, exit, bi, seed };
}

/* ---------------- tile queries & collision ---------------- */
function tileAt(tx, ty) { const D = G.D; if (!D || tx < 0 || ty < 0 || tx >= D.w || ty >= D.h) return T_WALL; return D.t[ty * D.w + tx]; }
function solidPx(x, y) { return isSolidT(tileAt(Math.floor(x / TS), Math.floor(y / TS))); }
function boxHits(x, y, r) { return solidPx(x - r, y - r) || solidPx(x + r, y - r) || solidPx(x - r, y + r) || solidPx(x + r, y + r); }
function roomAt(x, y) { const D = G.D, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= D.w || ty >= D.h) return null; const i = D.room[ty * D.w + tx]; return i >= 0 ? D.rooms[i] : null; }
/** Line of sight between two points, stepping through tiles. */
function los(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) if (solidPx(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}
/** Nearest walkable spot to (x,y) for an entity-sized box. */
function findFree(x, y, e) {
  const r = e ? e.r : 5;
  if (!boxHits(x, y, r)) return { x, y };
  for (let rad = 1; rad < 6; rad++) for (let a = 0; a < 16; a++) {
    const nx = x + Math.cos(a * TAU / 16) * rad * 8, ny = y + Math.sin(a * TAU / 16) * rad * 8;
    if (!boxHits(nx, ny, r)) return { x: nx, y: ny };
  }
  return e ? { x: e.x, y: e.y } : { x, y };
}
/** Move with wall sliding and solid-prop blocking. Returns true if blocked. */
function moveEnt(e, dx, dy) {
  let blocked = false;
  const ghost = e.def && e.def.ghost;
  if (dx) { const nx = e.x + dx; if (ghost ? nx > 20 && nx < G.D.w * TS - 20 : !boxHits(nx, e.y, e.r) && !propBlock(e, nx, e.y)) e.x = nx; else blocked = true; }
  if (dy) { const ny = e.y + dy; if (ghost ? ny > 20 && ny < G.D.h * TS - 20 : !boxHits(e.x, ny, e.r) && !propBlock(e, e.x, ny)) e.y = ny; else blocked = true; }
  return blocked;
}
function propBlock(e, nx, ny) {
  if (e.def && e.def.fly) return false;
  for (const p of G.props) {
    if (!p.solid || p.dead) continue;
    const dx = nx - p.x, dy = ny - p.y; if (Math.abs(dx) > 20 || Math.abs(dy) > 20) continue;
    const rr = e.r + p.r, dn = dx * dx + dy * dy;
    if (dn < rr * rr && dn < (e.x - p.x) ** 2 + (e.y - p.y) ** 2) return true;
  }
  return false;
}

/* ---------------- fog of war ---------------- */
function reveal(tx, ty, rad) {
  const D = G.D;
  for (let y = ty - rad; y <= ty + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) {
    if (x < 0 || y < 0 || x >= D.w || y >= D.h) continue;
    if ((x - tx) ** 2 + (y - ty) ** 2 <= rad * rad + 1) D.explored[y * D.w + x] = 1;
  }
}
function revealRoom(q) { const D = G.D; for (let y = q.y - 2; y <= q.y + q.h + 1; y++) for (let x = q.x - 2; x <= q.x + q.w + 1; x++) if (x >= 0 && y >= 0 && x < D.w && y < D.h) D.explored[y * D.w + x] = 1; }

/* ---------------- flow field: BFS distance from the player, refreshed a few times per second ---------------- */
function computeFlow(px, py) {
  const D = G.D, W = D.w, H = D.h;
  if (!G.flow || G.flow.length !== W * H) G.flow = new Int16Array(W * H);
  const f = G.flow; f.fill(-1);
  const sx = Math.floor(px / TS), sy = Math.floor(py / TS);
  const q = [sy * W + sx]; f[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0; if (f[i] > 45) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (f[j] < 0 && !isSolidT(D.t[j])) { f[j] = f[i] + 1; q.push(j); }
    }
  }
}
/** Direction toward the player following the flow field (falls back to straight line). */
function flowDir(e) {
  const D = G.D, W = D.w, f = G.flow;
  const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS);
  const cur = f ? f[ty * W + tx] : -1;
  if (!f || cur < 0) return null;
  let best = null, bv = cur;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const nx = tx + dx, ny = ty + dy; const v = f[ny * W + nx];
    if (v < 0 || v >= bv) continue;
    if (dx && dy && (isSolidT(tileAt(tx + dx, ty)) || isSolidT(tileAt(tx, ty + dy)))) continue;
    bv = v; best = [nx, ny];
  }
  if (!best) return null;
  const gx = best[0] * TS + 8, gy = best[1] * TS + 8, a = Math.atan2(gy - e.y, gx - e.x);
  return { x: Math.cos(a), y: Math.sin(a) };
}

/* ---------------- room logic: entering, locking doors, waves, clearing ---------------- */
function setDoors(q, closed) {
  const D = G.D;
  for (const i of q.doors) if (D.t[i] === (closed ? T_FLOOR : T_DOOR)) D.t[i] = closed ? T_DOOR : T_FLOOR;
  q.locked = closed;
  Sfx.play('door');
  if (closed) {
    // push any ally standing in a doorway into the room
    for (const a of G.allies) if (boxHits(a.x, a.y, a.r)) { a.x = G.p.x; a.y = G.p.y; }
  }
}
function insideInterior(q, x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= q.x && ty >= q.y && tx < q.x + q.w && ty < q.y + q.h; }
function updateRooms() {
  const p = G.p, q = roomAt(p.x, p.y);
  if (q !== G.curRoom) {
    G.curRoom = q;
    if (q && !q.visited) { q.visited = true; revealRoom(q); onFirstEnter(q); }
  }
  if (q && !q.cleared && !q.spawned && insideInterior(q, p.x, p.y) && Math.floor(p.x / TS) > q.x && Math.floor(p.x / TS) < q.x + q.w - 1 && Math.floor(p.y / TS) > q.y && Math.floor(p.y / TS) < q.y + q.h - 1) startEncounter(q);
  // clear check
  for (const r of G.D.rooms) {
    if (!r.spawned || r.cleared) continue;
    if (r.pending > 0) continue;
    const alive = G.ents.some(e => e.roomId === r.id && !e.dead && !e.thief);
    if (!alive) {
      if (r.wave < r.waves) { r.wave++; spawnWave(r); toast('Another wave!'); continue; }
      roomCleared(r);
    }
  }
}
function onFirstEnter(q) {
  if (q.type === 'secret') { toast('Secret room discovered!', 'ach'); Sfx.play('secret'); unlockAch('secret'); G.run.stats.secrets++; }
  else if (q.type === 'shop') toast('A merchant has set up shop here.');
  else if (q.type === 'treasure') toast('Treasure room');
  else if (q.type === 'heal') toast('A healing fountain bubbles quietly.');
  else if (q.type === 'event' && q.event === 'goblin') { q.spawned = true; q.pending = 0; q.wave = 1; const e = spawnEnemy('treasuregoblin', q.cx * TS, q.cy * TS, { room: q.id, delay: .2 }); e.thief = true; toast('A Treasure Goblin! Catch it before it escapes!', 'ach'); q.cleared = true; }
}
function startEncounter(q) {
  q.spawned = true; q.wave = 1;
  if (q.type === 'boss') { setDoors(q, true); startBoss(q); return; }
  if (q.type === 'event' && q.event === 'miniboss') { setDoors(q, true); spawnChampion(q); q.pending = 0; banner('Champion', 'A mighty foe blocks your path'); return; }
  if (q.type === 'monster' || q.type === 'elite') { setDoors(q, true); spawnWave(q); }
}
function spawnWave(q) {
  const R = G.run, B = BIOMES[R.bi], diff = DIFFS[R.diff];
  const lf = luckFactor(G.p.S.luck);
  let n = Math.min(11, 3 + Math.floor(R.depth * .35) + randi(0, 2) + (q.w * q.h > 90 ? 1 : 0));
  let elites = q.type === 'elite' ? (1 + (R.depth > 8 ? 1 : 0)) : 0;
  if (q.type === 'elite') n = Math.max(2, n - 2);
  q.pending = n + elites;
  const pos = () => {
    for (let k = 0; k < 40; k++) {
      const x = (randi(q.x + 1, q.x + q.w - 2) + .5) * TS, y = (randi(q.y + 1, q.y + q.h - 2) + .5) * TS;
      if (!boxHits(x, y, 6) && Math.hypot(x - G.p.x, y - G.p.y) > 56) return [x, y];
    }
    return [q.cx * TS, q.cy * TS];
  };
  for (let i = 0; i < n + elites; i++) {
    const [x, y] = pos();
    const isElite = i >= n || chance(diff.elite + lf * .05);
    const id = pick(B.enemies);
    const delay = .3 + i * .12 + rand(.3);
    G.fx.push({ type: 'portal', x, y, t: 0, dur: delay + .2 });
    later(delay, () => { spawnEnemy(id, x, y, { room: q.id, elite: isElite, delay: 0 }); q.pending--; });
  }
}
function roomCleared(q) {
  q.cleared = true; q.pending = 0;
  if (q.locked) setDoors(q, false);
  G.run.stats.rooms++;
  const lf = luckFactor(G.p.S.luck);
  if (q.type === 'boss') return;
  if (q.type === 'elite' || (q.type === 'event' && q.event === 'miniboss')) { dropChest(q, { minR: q.type === 'elite' ? 1 : 2, big: true }); toast('Room cleared — a reward appears!'); }
  else if (q.type === 'event' && q.event === 'altar') { dropChest(q, { minR: 3, big: true, bonus: 25 }); toast('The champion falls. The altar rewards you!', 'ach'); }
  else if (chance(.22 + lf * .25)) { dropChest(q, {}); toast('Room cleared — a chest appears!'); }
  else toast('Room cleared');
  if (q.exit) toast('The stairs are open. Press E on them to descend.');
}
function dropChest(q, o) {
  const x = q.cx * TS, y = q.cy * TS;
  const s = findFree(x + (q.exit ? 24 : 0), y, { r: 7 });
  const c = { type: 'chest', x: s.x, y: s.y, solid: true, r: 6, big: !!o.big, minR: o.minR || 0, bonus: o.bonus || 0, t: 0, uid: UID++, pop: .4 };
  G.props.push(c); fxBurst(c.x, c.y - 6, '#ffe080', 20, 70); Sfx.play('chest');
}
