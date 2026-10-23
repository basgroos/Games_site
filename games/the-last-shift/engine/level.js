// Het gebouw: grid-gebaseerde plattegrond, geometrie, deuren, meubilair, licht en navigatie.
import * as THREE from 'three';
import { mergeGeometries } from 'three-r159/examples/jsm/utils/BufferGeometryUtils.js';
import { Reflector } from 'three-r159/examples/jsm/objects/Reflector.js';
import { signMat, textCanvas } from './textures.js';

export const W = 50, H = 34, WALL_H = 3;
export const T_WALL = 0, T_FLOOR = 1, T_DOOR = 2, T_GLASS = 3, T_GATE = 4;

export const ROOMS = [
  { id: 'security', name: 'Beveiligingsruimte', x0: 1, z0: 1, x1: 9, z1: 9, floor: 'lino', wall: 'paintBlue', ceil: 'tiles', surface: 'lino', reverb: 0.35, circuit: 'A' },
  { id: 'lobby', name: 'Hal', x0: 1, z0: 11, x1: 9, z1: 21, floor: 'terrazzo', wall: 'paintBeige', ceil: 'tiles', surface: 'tile', reverb: 0.8, circuit: 'A' },
  { id: 'officeA', name: 'Kantoor A', x0: 11, z0: 1, x1: 19, z1: 13, floor: 'carpet', wall: 'paintBeige', ceil: 'tiles', surface: 'carpet', reverb: 0.3, circuit: 'B' },
  { id: 'officeB', name: 'Kantoor B', x0: 21, z0: 1, x1: 29, z1: 13, floor: 'carpet', wall: 'paintBeige', ceil: 'tiles', surface: 'carpet', reverb: 0.3, circuit: 'B' },
  { id: 'archive', name: 'Archief', x0: 31, z0: 1, x1: 41, z1: 13, floor: 'concrete', wall: 'paintGreen', ceil: 'concreteCeil', surface: 'concrete', reverb: 0.9, circuit: 'C' },
  { id: 'technical', name: 'Technische ruimte', x0: 43, z0: 1, x1: 48, z1: 13, floor: 'metal', wall: 'block', ceil: 'concreteCeil', surface: 'metal', reverb: 0.7, circuit: 'C' },
  { id: 'toilets', name: 'Toiletten', x0: 11, z0: 19, x1: 17, z1: 28, floor: 'tileWhite', wall: 'tileWall', ceil: 'tiles', surface: 'tile', reverb: 1.0, circuit: 'B' },
  { id: 'kantine', name: 'Kantine', x0: 19, z0: 19, x1: 28, z1: 28, floor: 'wood', wall: 'paintBeige', ceil: 'tiles', surface: 'wood', reverb: 0.5, circuit: 'B' },
  { id: 'storage', name: 'Opslag', x0: 30, z0: 19, x1: 38, z1: 28, floor: 'concrete', wall: 'block', ceil: 'concreteCeil', surface: 'concrete', reverb: 0.8, circuit: 'D' },
  { id: 'server', name: 'Serverruimte', x0: 40, z0: 19, x1: 45, z1: 28, floor: 'concrete', wall: 'blockDark', ceil: 'concreteCeil', surface: 'concrete', reverb: 0.5, circuit: 'D' },
  { id: 'dock', name: 'Laaddock', x0: 1, z0: 23, x1: 9, z1: 32, floor: 'concrete', wall: 'block', ceil: 'concreteCeil', surface: 'concrete', reverb: 1.0, circuit: 'A' },
  { id: 'passage', name: 'Dienstgang', x0: 47, z0: 18, x1: 48, z1: 29, floor: 'concrete', wall: 'block', ceil: 'concreteCeil', surface: 'wet', reverb: 0.9, circuit: 'D' },
  { id: 'service', name: 'Achtergang', x0: 1, z0: 30, x1: 48, z1: 31, floor: 'concrete', wall: 'block', ceil: 'concreteCeil', surface: 'concrete', reverb: 1.0, circuit: 'D' },
  { id: 'corridor', name: 'Hoofdgang', x0: 1, z0: 15, x1: 48, z1: 17, floor: 'lino', wall: 'paintGreen', ceil: 'tiles', surface: 'lino', reverb: 1.0, circuit: 'B' },
];

export const DOORS = [
  { id: 'security', x: 5, z: 10, into: 'n', kind: 'wood', name: 'Beveiligingsruimte' },
  { id: 'secA', x: 10, z: 5, into: 'e', kind: 'wood' },
  { id: 'officeA', x: 15, z: 14, into: 'n', kind: 'wood', open: true },
  { id: 'AB', x: 20, z: 7, into: 'e', kind: 'wood' },
  { id: 'officeB', x: 25, z: 14, into: 'n', kind: 'wood' },
  { id: 'archive', x: 36, z: 14, into: 'n', kind: 'metal', locked: 'key_archive', lockMsg: 'Op slot. Archiefsleutel nodig.' },
  { id: 'archTech', x: 42, z: 10, into: 'e', kind: 'metal', locked: 'stuck', lockMsg: 'De deur klemt. Hij wordt aan de andere kant tegengehouden.' },
  { id: 'tech', x: 45, z: 14, into: 'n', kind: 'metal', locked: 'key_tech', lockMsg: 'Op slot. Sleutel technische ruimte nodig.' },
  { id: 'toilets', x: 14, z: 18, into: 's', kind: 'wood' },
  { id: 'kantine', x: 23, z: 18, into: 's', kind: 'wood', open: true },
  { id: 'kantineBack', x: 21, z: 29, into: 's', kind: 'wood' },
  { id: 'kantineStorage', x: 29, z: 24, into: 'e', kind: 'wood' },
  { id: 'storage', x: 34, z: 18, into: 's', kind: 'metal', open: true },
  { id: 'storageBack', x: 35, z: 29, into: 's', kind: 'metal' },
  { id: 'server', x: 43, z: 18, into: 's', kind: 'metal', locked: 'code', lockMsg: 'Elektronisch slot. Voer een code in op het paneel.' },
  { id: 'toiletsBack', x: 12, z: 29, into: 's', kind: 'wood' },
  { id: 'dock', x: 5, z: 22, into: 's', kind: 'metal' },
  { id: 'exit', x: 49, z: 16, into: 'e', kind: 'exit', locked: 'exit', lockMsg: 'NOODUITGANG — magneetslot actief. Wordt vrijgegeven vanuit de serverruimte.' },
];
const GLASS = [[7, 10], [8, 10], [22, 14], [23, 14], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18],
  [12, 0], [13, 0], [17, 0], [18, 0], [22, 0], [23, 0], [27, 0], [28, 0], [3, 0], [4, 0], [33, 0], [34, 0], [38, 0], [39, 0]];
const FROSTED = new Set(['22,14', '23,14']);
const DOORGLASS = new Set(['0,15', '0,16', '0,17']);

export class Level {
  constructor(game, M) {
    this.game = game; this.M = M;
    this.scene = game.scene;
    this.grid = [];
    for (let z = 0; z < H; z++) { this.grid.push(new Array(W).fill(T_WALL)); }
    this.roomGrid = [];
    this.colliders = []; // {minX,maxX,minZ,maxZ,maxY, nav}
    this.doors = []; this.doorAt = {};
    this.fixtures = [];
    this.hideSpots = [];
    this.puddles = [];
    this.static = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.scene.add(this.static, this.dynamic);
    this.named = {};
    this.raycastBlockers = [];
  }

  // ---------------- PLATTEGROND ----------------
  build() {
    for (const r of [...ROOMS].reverse()) for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) this.grid[z][x] = T_FLOOR;
    for (let z = 0; z < H; z++) { this.roomGrid.push([]); for (let x = 0; x < W; x++) this.roomGrid[z].push(this.findRoom(x, z)); }
    for (const [x, z] of GLASS) this.grid[z][x] = T_GLASS;
    for (let x = 3; x <= 7; x++) this.grid[33][x] = T_GATE;
    for (const d of DOORS) this.grid[d.z][d.x] = T_DOOR;
    this.buildShell();
    for (const d of DOORS) this.addDoor(d);
    this.furnish();
    this.exterior();
  }
  findRoom(x, z) { for (const r of ROOMS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r; return null; }
  roomAt(wx, wz) { const x = Math.floor(wx), z = Math.floor(wz); if (x < 0 || z < 0 || x >= W || z >= H) return null; return this.roomGrid[z][x]; }
  cell(x, z) { if (x < 0 || z < 0 || x >= W || z >= H) return T_WALL; return this.grid[z][x]; }
  isSolidCell(x, z) {
    const t = this.cell(x, z);
    if (t === T_WALL || t === T_GLASS || t === T_GATE) return true;
    if (t === T_DOOR) { const d = this.doorAt[x + ',' + z]; return d ? d.blocking : true; }
    return false;
  }

  buildShell() {
    const M = this.M;
    const byMat = new Map();
    const quad = (mat, pts, n, uvs) => {
      if (!byMat.has(mat)) byMat.set(mat, { pos: [], nor: [], uv: [], idx: [] });
      const b = byMat.get(mat), base = b.pos.length / 3;
      for (const p of pts) b.pos.push(...p);
      for (let i = 0; i < 4; i++) b.nor.push(...n);
      for (const u of uvs) b.uv.push(...u);
      b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const t = this.grid[z][x];
      if (t === T_WALL || t === T_GATE) {
        for (const [dx, dz] of dirs) {
          const nt = this.cell(x + dx, z + dz);
          if (nt === T_WALL || nt === T_GATE || (x + dx < 0 || z + dz < 0 || x + dx >= W || z + dz >= H)) continue;
          let mat;
          if (nt === T_DOOR || nt === T_GLASS) mat = M.frame;
          else { const room = this.roomGrid[z + dz][x + dx]; mat = M.wallFor[room ? room.wall : 'paintGreen']; }
          if (t === T_GATE) continue;
          this.wallFace(quad, mat, x, z, dx, dz, 0, WALL_H);
        }
      }
      if (t === T_FLOOR || t === T_DOOR) {
        const room = this.roomGrid[z][x];
        const fm = room ? M[room.floor] : M.concrete;
        quad(fm, [[x, 0, z + 1], [x + 1, 0, z + 1], [x + 1, 0, z], [x, 0, z]], [0, 1, 0], [[x / 2, -(z + 1) / 2], [(x + 1) / 2, -(z + 1) / 2], [(x + 1) / 2, -z / 2], [x / 2, -z / 2]]);
        if (t === T_FLOOR) {
          const cm = room ? M[room.ceil] : M.concreteCeil;
          quad(cm, [[x, WALL_H, z], [x + 1, WALL_H, z], [x + 1, WALL_H, z + 1], [x, WALL_H, z + 1]], [0, -1, 0], [[x / 2, z / 2], [(x + 1) / 2, z / 2], [(x + 1) / 2, (z + 1) / 2], [x / 2, (z + 1) / 2]]);
        }
      }
      if (t === T_GLASS) this.addWindow(x, z);
    }
    for (const [mat, b] of byMat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.idx);
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; m.userData.noMerge = true;
      this.scene.add(m);
      if (mat !== M[ROOMS[0].floor]) this.raycastBlockers.push(m);
    }
  }
  wallFace(quad, mat, x, z, dx, dz, y0, y1) {
    // vlak op de grens tussen cel (x,z) en buur (x+dx,z+dz), normaal richting buur
    const v0 = y0 / WALL_H, v1 = y1 / WALL_H;
    if (dx === 1) { const X = x + 1; quad(mat, [[X, y0, z + 1], [X, y0, z], [X, y1, z], [X, y1, z + 1]], [1, 0, 0], [[(z + 1) / 2, v0], [z / 2, v0], [z / 2, v1], [(z + 1) / 2, v1]].map(([u, v]) => [-u, v])); }
    if (dx === -1) { const X = x; quad(mat, [[X, y0, z], [X, y0, z + 1], [X, y1, z + 1], [X, y1, z]], [-1, 0, 0], [[z / 2, v0], [(z + 1) / 2, v0], [(z + 1) / 2, v1], [z / 2, v1]]); }
    if (dz === 1) { const Z = z + 1; quad(mat, [[x, y0, Z], [x + 1, y0, Z], [x + 1, y1, Z], [x, y1, Z]], [0, 0, 1], [[x / 2, v0], [(x + 1) / 2, v0], [(x + 1) / 2, v1], [x / 2, v1]]); }
    if (dz === -1) { const Z = z; quad(mat, [[x + 1, y0, Z], [x, y0, Z], [x, y1, Z], [x + 1, y1, Z]], [0, 0, -1], [[-(x + 1) / 2, v0], [-x / 2, v0], [-x / 2, v1], [-(x + 1) / 2, v1]]); }
  }
  addWindow(x, z) {
    const M = this.M;
    const alongX = this.cell(x - 1, z) !== T_FLOOR && this.cell(x + 1, z) !== T_FLOOR;
    const frosted = FROSTED.has(x + ',' + z);
    const exterior = x === 0 || z === 0;
    const sill = DOORGLASS.has(x + ',' + z) ? 0.0 : exterior ? 0.9 : 1.0, top = 2.3;
    const w = alongX ? 1 : 1, cx = x + 0.5, cz = z + 0.5;
    const sx = alongX ? 1 : 1, sz = 1;
    if (sill > 0) this.box(cx, 0, cz, sx, sill, sz, exterior ? M.paintBeige : M.frame);
    this.box(cx, top, cz, sx, WALL_H - top, sz, exterior ? M.paintBeige : M.frame);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1, top - sill), frosted ? M.frosted : M.glass);
    pane.position.set(cx, (sill + top) / 2, cz); if (!alongX) pane.rotation.y = Math.PI / 2;
    pane.userData.noMerge = true; pane.renderOrder = 2; this.scene.add(pane);
    // sponning
    const fr = (ox, oz, wx, wz, h, y) => this.box(cx + ox, y, cz + oz, wx, h, wz, M.frame);
    if (alongX) { fr(0, 0, 1, 0.08, 0.05, sill); fr(0, 0, 1, 0.08, 0.05, top - 0.05); fr(-0.48, 0, 0.05, 0.08, top - sill, sill); fr(0.48, 0, 0.05, 0.08, top - sill, sill); }
    else { fr(0, 0, 0.08, 1, 0.05, sill); fr(0, 0, 0.08, 1, 0.05, top - 0.05); fr(0, -0.48, 0.08, 0.05, top - sill, sill); fr(0, 0.48, 0.08, 0.05, top - sill, sill); }
    if (exterior && z === 0) { // lamellen
      for (let k = 0; k < 14; k++) { if (k > 9 && (x % 3 === 0)) continue; const sl = this.box(cx, top - 0.06 - k * 0.07, z + 0.92, 0.98, 0.01, 0.06, M.beigePlastic); sl.rotation.x = 0.5 + (x % 2) * 0.3; }
    }
    void w;
  }

  // ---------------- BOUWBLOKKEN ----------------
  box(x, y, z, w, h, d, mat, o = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    if (o.rot) m.rotation.y = o.rot;
    m.castShadow = o.shadow !== false; m.receiveShadow = true;
    (o.parent || (o.dynamic ? this.dynamic : this.static)).add(m);
    if (o.col) this.addColliderFromMesh(m, o.nav !== false, o.colPad || 0);
    return m;
  }
  cyl(x, y, z, rt, rb, h, mat, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 14), mat);
    m.position.set(x, y + h / 2, z);
    if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.shadow !== false; m.receiveShadow = true;
    (o.parent || (o.dynamic ? this.dynamic : this.static)).add(m);
    if (o.col) this.addColliderFromMesh(m, o.nav !== false);
    return m;
  }
  group(x, z, rot = 0, dynamic = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    (dynamic ? this.dynamic : this.static).add(g); return g;
  }
  gbox(g, x, y, z, w, h, d, mat, o = {}) { return this.box(x, y, z, w, h, d, mat, { ...o, parent: g }); }
  addColliderFromMesh(m, nav = true, pad = 0) {
    m.updateWorldMatrix(true, false);
    const b = new THREE.Box3().setFromObject(m);
    this.colliders.push({ minX: b.min.x - pad, maxX: b.max.x + pad, minZ: b.min.z - pad, maxZ: b.max.z + pad, maxY: b.max.y, minY: b.min.y, nav });
  }
  colliderBox(minX, minZ, maxX, maxZ, maxY = 2, nav = true) { const c = { minX, maxX, minZ, maxZ, maxY, minY: 0, nav }; this.colliders.push(c); return c; }
  sign(x, y, z, rot, w, h, lines, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat(lines, o));
    m.position.set(x, y, z); m.rotation.y = rot; m.userData.noMerge = !!o.emissive;
    (o.emissive ? this.scene : this.static).add(m);
    return m;
  }
  // muurposities: geef cel en kant, krijg wereldpositie op het muuroppervlak + rotatie
  wallPos(face, a, b) {
    // face: 'n' muur aan noordkant van ruimte (z = b), normaal +z, enz.
    if (face === 'n') return { x: a, z: b + 0.01, rot: 0 };
    if (face === 's') return { x: a, z: b - 0.01, rot: Math.PI };
    if (face === 'w') return { x: b + 0.01, z: a, rot: Math.PI / 2 };
    return { x: b - 0.01, z: a, rot: -Math.PI / 2 };
  }

  // ---------------- DEUREN ----------------
  addDoor(spec) {
    const d = new Door(this, spec);
    this.doors.push(d); this.doorAt[spec.x + ',' + spec.z] = d;
    this.named['door_' + spec.id] = d;
  }

  // ---------------- LICHTARMATUREN ----------------
  fixture(x, z, circuit, o = {}) {
    const M = this.M;
    const g = new THREE.Group(); g.position.set(x, WALL_H, z); if (o.rotZ) g.rotation.y = Math.PI / 2;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 1.25), M.greyMetal);
    housing.position.y = -0.035; g.add(housing);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8dcd6, emissive: 0xe9f2ea, emissiveIntensity: 0, roughness: 0.4 });
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 1.18), mat);
    tube.position.y = -0.075; g.add(tube);
    if (o.cage) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 1.3), new THREE.MeshStandardMaterial({ color: 0x222222, wireframe: true })); c.position.y = -0.1; g.add(c); }
    this.scene.add(g);
    const f = { x, z, y: WALL_H - 0.25, circuit, state: o.state || 'ok', mat, group: g, b: 0, flickT: 0, flickOn: true, override: 0, room: this.roomAt(x, z), dead: false };
    this.fixtures.push(f);
    return f;
  }

  // ---------------- VERSTOPPLEKKEN ----------------
  addHide(spot) { this.hideSpots.push(spot); return spot; }

  // ---------------- INRICHTING ----------------
  furnish() {
    const M = this.M, L = this;
    const rnd = mulberryLocal(31337);

    // == Beveiligingsruimte ==
    {
      const g = this.group(5.5, 1.6);
      this.gbox(g, 0, 0, 0, 4.2, 0.74, 0.85, M.deskTop, {});
      this.gbox(g, 0, 0, 0, 4.1, 0.72, 0.8, M.deskWood, {});
      this.colliderBox(3.4, 1.15, 7.6, 2.05, 0.8);
      this.named.monitors = [];
      for (let i = -1; i <= 1; i++) {
        const mon = this.crt(5.5 + i * 1.15, 0.75, 1.55, 0);
        this.named.monitors.push(mon);
      }
      this.named.secDeskPhone = this.phone(7.25, 0.75, 1.85, -0.3);
      this.named.logbookPos = new THREE.Vector3(4.2, 0.76, 2.0);
      this.officeChair(5.5, 2.9, Math.PI);
      this.filingCabinet(9.4, 4.0, -Math.PI / 2);
      this.filingCabinet(9.4, 4.6, -Math.PI / 2);
      // sleutelkastje (westmuur)
      const kb = this.box(1.06, 1.3, 4.5, 0.12, 0.55, 0.45, M.greyMetal, { dynamic: true });
      this.named.keyBox = kb;
      for (let i = 0; i < 6; i++) this.box(1.13, 1.38 + (i % 2) * 0.2, 4.35 + Math.floor(i / 2) * 0.12, 0.02, 0.06, 0.02, M.yellow);
      this.locker(1.35, 7.3, Math.PI / 2, 'sec1');
      this.locker(1.35, 7.85, Math.PI / 2, 'sec2');
      this.noticeBoard(9.98, 1.6, 7.5, -Math.PI / 2);
      this.sign(5.5, 2.4, 1.01, 0, 1.2, 0.35, [['BEVEILIGING', 44, true], ['Toezicht 24/7', 26]], { bg: '#26324a', fg: '#e8e4d6', aged: true });
      this.fixture(3.5, 5.5, 'A'); this.fixture(7.5, 5.5, 'A');
      this.trash(8.8, 8.8);
    }
    // == Hal ==
    {
      const M2 = M;
      const g = this.group(6.8, 13.4);
      this.gbox(g, 0, 0, 0, 3.4, 1.1, 0.7, M2.deskWood);
      this.gbox(g, 0, 1.1, -0.05, 3.5, 0.05, 0.85, M2.deskTop);
      this.gbox(g, -1.75, 0, -0.9, 0.7, 1.1, 1.9, M2.deskWood);
      this.colliderBox(4.75, 12.6, 8.55, 13.8, 1.2);
      this.colliderBox(4.7, 11.6, 5.45, 13.8, 1.2);
      this.named.receptionChair = this.officeChair(6.8, 12.4, 0, true);
      this.crt(7.6, 1.15, 13.2, Math.PI, true);
      // wachtbank
      for (let i = 0; i < 3; i++) this.chair(1.55, 19.2 + i * 0.6, Math.PI / 2);
      this.plant(1.6, 11.6); this.plant(9.3, 21.3); this.plant(1.6, 21.3);
      // lift (buiten gebruik)
      this.box(9.98, 0, 12.4, 0.04, 2.2, 1.4, M.greyMetal);
      this.box(9.96, 0, 12.4, 0.02, 2.2, 0.02, M.black);
      this.sign(9.95, 1.5, 13.4, -Math.PI / 2, 0.4, 0.25, [['LIFT', 30, true], ['buiten gebruik', 20]], { bg: '#ddd8c4' });
      // trappenhuis (afgesloten)
      this.named.stairsDoor = this.fakeDoor(1.01, 12.6, Math.PI / 2, M.doorMetal, 'Trappenhuis — dichtgelast door het sloopbedrijf.');
      this.sign(1.03, 2.35, 12.6, Math.PI / 2, 0.7, 0.2, [['TRAPPENHUIS', 30, true]], { bg: '#2a6a3a', fg: '#fff' });
      this.noticeBoard(1.02, 1.5, 19.8, Math.PI / 2);
      this.wallClock(9.98, 2.3, 18.5, -Math.PI / 2);
      // deurmat
      this.box(1.8, 0, 16.5, 1.4, 0.015, 2.4, M.rubber, { shadow: false });
      this.fixture(3.5, 13.5, 'A'); this.fixture(7.5, 15.5, 'A', { rotZ: true }); this.fixture(3.5, 19.5, 'A'); this.fixture(7.5, 19.5, 'A');
      this.named.frontDoor = this.fakeDoor(0.55, 16.5, Math.PI / 2, M.glass, 'Hoofdingang. Tijdslot — gaat pas om 06:00 open.', true);
      this.sign(0.95, 2.45, 16.5, Math.PI / 2, 1.0, 0.25, [['UITGANG', 36, true]], { bg: '#0b4a1c', fg: '#bfffcf', emissive: 0x1aff66, ei: 0.6 });
    }
    // == Hoofdgang ==
    {
      const xs = [12, 16, 20, 24, 28, 32, 36, 40, 44, 47.5];
      for (const x of xs) {
        const st = x === 28 ? 'flicker' : x === 40 ? 'flicker' : 'ok';
        this.fixture(x, 16.5, x < 26 ? 'B' : 'C', { rotZ: true, state: st });
      }
      this.extinguisher(18.7, 15.05, 0); this.extinguisher(38.5, 17.95, Math.PI);
      this.radiator(30.5, 15.02, 0); this.radiator(13, 17.98, Math.PI);
      this.noticeBoard(27.5, 1.5, 15.02, 0);
      this.sign(43.9, 1.6, 15.02, 0, 0.6, 0.4, [['SLOOP', 40, true], ['15-11', 34, true], ['VERBODEN TOEGANG', 18]], { bg: '#e0c21c', fg: '#111', border: true });
      this.sign(48.98, 2.55, 16.5, -Math.PI / 2, 1.0, 0.28, [['NOODUITGANG', 34, true]], { bg: '#0b4a1c', fg: '#bfffcf', emissive: 0x1aff66, ei: 0.8 });
      this.sign(33.3, 1.7, 15.02, 0, 0.5, 0.25, [['ARCHIEF', 32, true]], { bg: '#ddd8c4' });
      this.sign(46.3, 1.7, 15.02, 0, 0.6, 0.25, [['TECHNIEK', 32, true]], { bg: '#ddd8c4' });
      this.sign(44.3, 1.7, 17.98, Math.PI, 0.6, 0.25, [['SERVER', 32, true]], { bg: '#ddd8c4' });
      this.sign(14.0, 2.4, 17.98, Math.PI, 0.5, 0.25, [['WC', 40, true]], { bg: '#ddd8c4' });
      this.sign(23.0, 2.4, 17.98, Math.PI, 0.7, 0.25, [['KANTINE', 32, true]], { bg: '#ddd8c4' });
      this.waterCooler(9.6, 17.6);
      this.trolley(31.5, 17.3);
      this.chair(21, 15.4, 0); this.chair(21.6, 15.4, 0);
      this.box(40.2, 0, 15.4, 0.8, 0.9, 0.5, M.cardboard, { col: true });
      this.box(40.3, 0.9, 15.45, 0.6, 0.45, 0.4, M.cardboard2);
      this.papers(26, 16.4, 6); this.papers(37, 16.8, 4);
      this.puddle(42.5, 16.9, 1.2, 0.8);
    }
    // == Kantoor A ==
    {
      this.desk(13, 4, 0, 'dA1', true); this.desk(17, 4, 0, 'dA2', true);
      this.desk(13, 9, Math.PI, 'dA3', false); this.desk(17.2, 9, Math.PI, 'dA4', true);
      this.filingCabinet(11.35, 11.5, Math.PI / 2); this.filingCabinet(11.35, 12.1, Math.PI / 2);
      this.plant(19.4, 1.5);
      this.whiteboard(15, 1.02, 0, ['Q3: archief digitaliseren', 'deadline sloop 15/11 !!', 'H.V. — waar is hij?']);
      this.wallClock(19.98, 2.3, 11, -Math.PI / 2);
      this.fixture(13, 6.5, 'B'); this.fixture(17, 6.5, 'B', { state: 'ok' }); this.fixture(15, 11.5, 'B', { rotZ: true });
      this.papers(15, 6.5, 8);
      this.radiator(13, 1.02, 0); this.radiator(17.5, 1.02, 0);
    }
    // == Kantoor B ==
    {
      this.desk(23, 4, 0, 'dB1', true); this.desk(27, 4, 0, 'dB2', false);
      this.desk(27, 9.5, Math.PI, 'dB3', true);
      this.named.drawerCabinet = this.filingCabinet(21.4, 10.5, Math.PI / 2, true);
      this.locker(29.6, 12.4, -Math.PI / 2, 'ob1');
      this.plant(21.5, 1.6);
      this.whiteboard(29.98, 6, -Math.PI / 2, ['NACHTRONDE:', '00:00 - 02:00 - 04:00', 'niet in archief na 03:00']);
      this.fixture(23, 6.5, 'B'); this.fixture(27, 6.5, 'B'); this.fixture(25, 11.5, 'B', { rotZ: true, state: 'flicker' });
      this.radiator(22.5, 1.02, 0); this.radiator(27.5, 1.02, 0);
      this.trash(28.8, 1.4);
    }
    // == Archief ==
    {
      for (const x of [32.6, 35.0, 37.4]) for (const z0 of [2.2, 7.6]) this.shelf(x, z0 + 1.8, Math.PI / 2, 3.6, rnd);
      this.shelf(41.4, 6.5, Math.PI / 2, 3.0, rnd);
      // Henks bureau
      this.desk(40.2, 2.2, 0, 'dArch', false);
      this.named.henkDesk = new THREE.Vector3(40.2, 0.76, 2.0);
      this.deskLamp(39.4, 0.75, 1.9);
      this.box(39.8, 0, 12.3, 0.9, 0.6, 0.6, M.cardboard, { col: true }); this.box(39.7, 0.6, 12.3, 0.7, 0.4, 0.5, M.cardboard2);
      this.box(32.2, 0, 12.6, 1.0, 0.5, 0.7, M.cardboard, { col: true });
      this.locker(31.4, 12.6, Math.PI / 2, 'arch1');
      this.papers(36, 6, 12);
      this.fixture(33.8, 4.5, 'C'); this.fixture(36.2, 4.5, 'C', { state: 'broken' }); this.fixture(33.8, 10, 'C'); this.fixture(38.6, 10, 'C', { state: 'flicker' });
    }
    // == Technische ruimte ==
    {
      const bp = this.box(48.92, 0.9, 4.5, 0.15, 1.3, 1.6, M.greyMetal, { dynamic: true });
      this.named.breakerPanel = bp;
      this.named.fuseBoxPos = new THREE.Vector3(48.85, 1.4, 8.2);
      this.box(48.9, 0.9, 8.2, 0.18, 1.0, 0.8, M.darkMetal);
      this.locker(43.35, 11.6, Math.PI / 2, 'tech1');
      this.locker(43.35, 12.25, Math.PI / 2, 'tech2');
      this.box(46.2, 0, 2.0, 2.2, 2.0, 1.2, M.darkMetal, { col: true }); // ketel
      this.cyl(45.3, 2.0, 2.0, 0.12, 0.12, 1.0, M.pipe);
      for (const zz of [1.4, 1.7]) this.cyl(46, 2.75, zz, 0.07, 0.07, 6, M.pipe, { rz: Math.PI / 2 });
      for (const xx of [44.2, 47.8]) this.cyl(xx, 2.7, 7.5, 0.06, 0.06, 13, M.pipe, { rx: Math.PI / 2 });
      this.box(47.9, 0, 11.5, 1.4, 1.0, 0.7, M.wood2, { col: true }); // werkbank
      this.box(47.9, 1.0, 11.5, 1.5, 0.05, 0.8, M.deskTop);
      this.sign(48.97, 2.15, 4.5, -Math.PI / 2, 1.0, 0.35, [['HOOFDVERDEELKAST', 26, true], ['Hoogspanning — levensgevaar', 18]], { bg: '#e0c21c', fg: '#111' });
      this.fixture(45.5, 5, 'C', { cage: true }); this.fixture(45.5, 10, 'C', { cage: true });
    }
    // == Toiletten ==
    {
      for (let i = 0; i < 3; i++) {
        const z = 20.2 + i * 1.0;
        this.box(11.3, 0.8, z, 0.5, 0.12, 0.45, M.porcelain);
        this.cyl(11.25, 0, z, 0.06, 0.08, 0.8, M.porcelain);
        this.cyl(11.12, 0.95, z, 0.012, 0.012, 0.12, M.greyMetal);
      }
      this.box(11.02, 1.15, 21.2, 0.03, 1.0, 2.9, M.frame);
      const mir = new Reflector(new THREE.PlaneGeometry(2.8, 0.9), { textureWidth: 512, textureHeight: 256, color: 0x8a9696, clipBias: 0.003 });
      mir.position.set(11.05, 1.65, 21.2); mir.rotation.y = Math.PI / 2; this.scene.add(mir);
      this.named.mirror = mir;
      // hokjes
      for (let i = 0; i < 3; i++) this.stall(16.4, 23.6 + i * 1.6, 'stall' + i);
      this.box(16.4, 0, 28.4, 0.06, 2.1, 0.8, M.frame, { col: true });
      this.wetSign(13.5, 24.8);
      this.puddle(13, 23.5, 1.6, 1.0); this.puddle(14.5, 27, 1.0, 1.4); this.puddle(12.4, 20.5, 0.9, 0.7);
      this.named.dripPos = new THREE.Vector3(12.2, 2.9, 20.6);
      this.fixture(13.5, 21, 'B', { state: 'flicker' }); this.fixture(13.5, 26, 'B', { state: 'ok' });
      this.trash(16.8, 19.6);
    }
    // == Kantine ==
    {
      this.table(22.5, 23.5, 'tk1'); this.table(26.2, 23.5, 'tk2');
      for (const [tx, tz] of [[22.5, 23.5], [26.2, 23.5]]) { for (const dx of [-0.6, 0.6]) { this.chair(tx + dx, tz - 0.85, 0); this.chair(tx + dx, tz + 0.85, Math.PI); } }
      // aanrecht westmuur
      this.box(19.32, 0, 23.5, 0.62, 0.9, 5.2, M.deskWood, { col: true });
      this.box(19.32, 0.9, 23.5, 0.66, 0.04, 5.3, M.deskTop);
      this.box(19.32, 0.94, 22.2, 0.45, 0.06, 0.6, M.greyMetal);
      this.box(19.3, 0.94, 24.8, 0.4, 0.35, 0.3, M.darkMetal); // koffieautomaat
      this.box(19.3, 0.94, 25.6, 0.4, 0.28, 0.5, M.beigePlastic); // magnetron
      this.box(19.4, 0, 27.6, 0.7, 1.8, 0.7, M.beigePlastic, { col: true }); // koelkast
      this.box(19.4, 1.5, 22.6, 0.35, 0.7, 2.4, M.deskWood); // kastjes
      this.box(28.55, 0, 21, 0.8, 1.9, 0.9, M.red, { col: true }); // automaat
      this.box(28.14, 0.9, 21, 0.02, 0.8, 0.7, M.screenOff);
      this.named.kantinePhonePos = new THREE.Vector3(26.5, 1.45, 19.06);
      this.named.kantinePhone = this.wallPhone(26.5, 1.45, 19.02, 0);
      this.noticeBoard(24.5, 1.5, 28.98, Math.PI);
      this.wallClock(28.98, 2.3, 26, -Math.PI / 2);
      this.fixture(22.5, 21.5, 'B'); this.fixture(26.2, 21.5, 'B'); this.fixture(24.3, 26.5, 'B', { rotZ: true, state: 'flicker' });
      this.trash(20.2, 28.4);
    }
    // == Opslag ==
    {
      this.shelf(31.0, 21.5, Math.PI / 2, 4.0, rnd, true);
      this.shelf(33.6, 23.5, Math.PI / 2, 4.0, rnd, true);
      this.shelf(36.4, 23.5, Math.PI / 2, 4.0, rnd, true);
      this.locker(38.65, 19.6, -Math.PI / 2, 'stor1');
      this.named.burstLocker = this.locker(38.65, 20.25, -Math.PI / 2, null);
      this.crate(31.5, 27.5, 1.0); this.crate(32.6, 27.7, 0.8); this.crate(31.6, 27.4, 0.7, 1.0);
      this.box(37.8, 0, 27.6, 1.2, 0.15, 1.0, M.wood2, { col: true });
      for (const xx of [30.4, 38.6]) this.cyl(xx, 2.7, 24, 0.06, 0.06, 10, M.pipe, { rx: Math.PI / 2 });
      this.fixture(32.3, 21.5, 'D', { cage: true }); this.fixture(35, 26.5, 'D', { cage: true, state: 'flicker' });
    }
    // == Serverruimte ==
    {
      for (const z of [21.0, 23.5]) for (let i = 0; i < 3; i++) this.rack(41.2 + i * 0.75, z, Math.PI, i === 1 && z === 21);
      this.desk(44.3, 27.2, Math.PI, 'dServer', false);
      this.named.serverDeskPos = new THREE.Vector3(44.3, 0.76, 27.2);
      this.named.serverMonitor = this.crt(43.6, 0.75, 27.55, Math.PI);
      this.named.powerPanel = this.box(45.9, 0.9, 25.0, 0.15, 1.2, 1.4, M.greyMetal, { dynamic: true });
      this.sign(45.95, 2.2, 25.0, -Math.PI / 2, 1.2, 0.35, [['NOODSTROOM', 30, true], ['accucapaciteit: 1 circuit', 20]], { bg: '#c8281c', fg: '#fff' });
      // brandschade
      for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rnd() * 0.9, 18), new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); s.rotation.x = -Math.PI / 2; s.position.set(40.5 + rnd() * 5, 0.01, 19.5 + rnd() * 8.5); s.userData.noMerge = true; this.scene.add(s); }
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x080605, roughness: 1, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); s.position.set(40.02, 1.4, 20 + i * 1.8); s.rotation.y = Math.PI / 2; s.userData.noMerge = true; this.scene.add(s); }
      this.fixture(42.5, 20.5, 'D', { state: 'broken' }); this.fixture(42.5, 25.5, 'D', { state: 'flicker' });
    }
    // == Dienstgang + achtergang ==
    {
      this.fixture(47.9, 23, 'D', { cage: true, state: 'flicker' });
      for (const x of [6, 14, 22, 30, 38, 45]) this.fixture(x, 30.95, 'D', { rotZ: true, cage: true, state: x === 22 || x === 38 ? 'broken' : x === 30 ? 'flicker' : 'ok' });
      this.cyl(25, 2.75, 30.25, 0.08, 0.08, 46, M.pipe, { rz: Math.PI / 2 });
      this.cyl(25, 2.55, 30.3, 0.05, 0.05, 46, M.rust, { rz: Math.PI / 2 });
      this.cyl(48.7, 2.7, 24, 0.06, 0.06, 12, M.pipe, { rx: Math.PI / 2 });
      this.puddle(27, 31, 2.0, 0.9); this.puddle(40, 30.6, 1.4, 0.8); this.puddle(48, 26, 1.2, 1.6); this.puddle(15, 31.2, 1.2, 0.7);
      this.box(18.5, 0, 31.6, 1.0, 0.8, 0.6, M.cardboard, { col: true });
      this.barrel(44.2, 31.5); this.barrel(43.6, 31.6);
    }
    // == Laaddock ==
    {
      this.pallet(2.5, 25.5); this.pallet(2.5, 25.5, 0.15); this.crate(2.5, 25.5, 1.0, 0.3);
      this.pallet(8.3, 27.5); this.crate(8.3, 27.4, 1.1, 0.15); this.crate(8.2, 27.5, 0.8, 1.25);
      this.pallet(8.2, 31.9); this.barrel(1.6, 31.6); this.barrel(2.3, 31.8); this.barrel(1.6, 30.9);
      this.box(5, 0.0, 32.9, 5.3, 0.25, 0.25, M.yellow);
      this.named.dockPanel = this.box(8.9, 1.0, 32.9, 0.5, 0.7, 0.18, M.greyMetal, { dynamic: true });
      this.sign(5, 2.85, 32.98, Math.PI, 2.0, 0.22, [['LAADDOCK 1', 30, true]], { bg: '#e0c21c', fg: '#111' });
      this.fixture(3, 26, 'A', { cage: true }); this.fixture(7, 26, 'A', { cage: true, state: 'flicker' }); this.fixture(5, 30, 'A', { cage: true });
      this.puddle(5, 31.5, 2.5, 1.0);
      // roldeur
      const gate = new THREE.Group(); gate.position.set(5.5, 0, 33.05);
      for (let i = 0; i < 26; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 0.06), M.greyMetal); sl.position.y = 0.05 + i * 0.1; sl.castShadow = true; gate.add(sl); }
      this.scene.add(gate); this.named.gate = gate;
      this.box(5.5, 2.6, 32.85, 5.4, 0.4, 0.4, M.darkMetal);
    }
    // nooduitgang: buitenlicht achter de deur
    this.named.exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.named.exitGlow.position.set(50.4, 1.5, 16.5); this.named.exitGlow.rotation.y = -Math.PI / 2; this.scene.add(this.named.exitGlow);
  }

  // ---------------- MEUBELS ----------------
  desk(x, z, rot, id, hide) {
    const M = this.M; const g = this.group(x, z, rot);
    this.gbox(g, 0, 0.72, 0, 1.5, 0.04, 0.78, M.deskTop);
    this.gbox(g, -0.72, 0, 0, 0.04, 0.72, 0.74, M.darkMetal); this.gbox(g, 0.72, 0, 0, 0.04, 0.72, 0.74, M.darkMetal);
    this.gbox(g, 0, 0.35, -0.36, 1.4, 0.37, 0.02, M.darkMetal);
    this.gbox(g, 0.45, 0.05, 0.02, 0.45, 0.62, 0.7, M.greyMetal);
    for (let i = 0; i < 3; i++) this.gbox(g, 0.45, 0.08 + i * 0.2, 0.37, 0.43, 0.17, 0.01, M.darkMetal);
    // spullen
    if (Math.random() < 0.8) { this.gbox(g, -0.2, 0.76, -0.1, 0.4, 0.3, 0.35, M.beigePlastic); this.gbox(g, -0.2, 0.86, 0.08, 0.32, 0.22, 0.01, M.screenOff); this.gbox(g, -0.2, 0.76, 0.22, 0.45, 0.02, 0.15, M.beigePlastic); }
    this.gbox(g, 0.4, 0.76, 0.05, 0.25, 0.01, 0.32, M.paper, { shadow: false });
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    this.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, maxY: 0.76, minY: 0, nav: true });
    if (hide) {
      const fwd = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
      const pos = new THREE.Vector3(x, 0.42, z).addScaledVector(fwd, -0.05);
      this.addHide({ id, type: 'desk', pos, out: new THREE.Vector3(x, 0, z).addScaledVector(fwd, 0.95), yaw: Math.atan2(-fwd.x, -fwd.z), mesh: g, prompt: 'Onder het bureau kruipen' });
    }
    return g;
  }
  table(x, z, id) {
    const M = this.M; const g = this.group(x, z);
    this.gbox(g, 0, 0.72, 0, 1.6, 0.04, 0.9, M.wood2);
    for (const [a, b] of [[-0.72, -0.38], [0.72, -0.38], [-0.72, 0.38], [0.72, 0.38]]) this.gbox(g, a, 0, b, 0.05, 0.72, 0.05, M.greyMetal);
    this.colliders.push({ minX: x - 0.8, maxX: x + 0.8, minZ: z - 0.45, maxZ: z + 0.45, maxY: 0.76, minY: 0, nav: true });
    this.addHide({ id, type: 'desk', pos: new THREE.Vector3(x, 0.42, z), out: new THREE.Vector3(x, 0, z + 1.4), yaw: Math.PI, mesh: g, prompt: 'Onder de tafel kruipen' });
  }
  chair(x, z, rot) {
    const M = this.M; const g = this.group(x, z, rot + (Math.random() - 0.5) * 0.4);
    this.gbox(g, 0, 0.44, 0, 0.42, 0.04, 0.42, M.fabric);
    this.gbox(g, 0, 0.48, -0.2, 0.42, 0.42, 0.03, M.fabric);
    for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) this.gbox(g, a, 0, b, 0.025, 0.44, 0.025, M.darkMetal);
    this.colliders.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25, maxY: 0.9, minY: 0, nav: false });
    return g;
  }
  officeChair(x, z, rot, dynamic = false) {
    const M = this.M; const g = this.group(x, z, rot, dynamic);
    this.gbox(g, 0, 0.45, 0, 0.5, 0.08, 0.48, M.fabric);
    this.gbox(g, 0, 0.55, -0.24, 0.46, 0.55, 0.06, M.fabric);
    this.cyl(0, 0.08, 0, 0.03, 0.03, 0.37, M.darkMetal, { parent: g });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = this.gbox(g, Math.sin(a) * 0.15, 0.03, Math.cos(a) * 0.15, 0.04, 0.04, 0.3, M.darkMetal); l.rotation.y = a; }
    this.colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, maxY: 1, minY: 0, nav: false });
    return g;
  }
  filingCabinet(x, z, rot, withDrawers = false) {
    const M = this.M; const g = this.group(x, z, rot, withDrawers);
    this.gbox(g, 0, 0, 0, 0.5, 1.32, 0.62, M.greyMetal);
    const drawers = [];
    for (let i = 0; i < 4; i++) {
      if (withDrawers) {
        const dg = new THREE.Group(); dg.position.set(0, 0.05 + i * 0.32, 0.31); g.add(dg);
        const front = this.box(0, 0, 0.005, 0.46, 0.29, 0.02, M.greyMetal, { parent: dg });
        this.box(0, 0.2, 0.03, 0.14, 0.03, 0.03, M.darkMetal, { parent: dg });
        this.box(0, 0.02, -0.27, 0.42, 0.22, 0.56, M.darkMetal, { parent: dg });
        drawers.push({ group: dg, front, open: false, t: 0 });
      } else {
        this.gbox(g, 0, 0.05 + i * 0.32, 0.315, 0.46, 0.29, 0.01, M.darkMetal);
        this.gbox(g, 0, 0.25 + i * 0.32, 0.33, 0.14, 0.03, 0.03, M.frame);
      }
    }
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    this.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, maxY: 1.35, minY: 0, nav: true });
    if (withDrawers) return { group: g, drawers };
    return g;
  }
  locker(x, z, rot, hideId) {
    const M = this.M; const g = this.group(x, z, rot, true);
    // achterwand en zijkanten (kast staat met rug tegen de muur, open naar +z lokaal)
    this.box(0, 0, -0.24, 0.6, 1.95, 0.02, M.greyMetal, { parent: g });
    this.box(-0.29, 0, 0, 0.02, 1.95, 0.5, M.greyMetal, { parent: g });
    this.box(0.29, 0, 0, 0.02, 1.95, 0.5, M.greyMetal, { parent: g });
    this.box(0, 1.93, 0, 0.6, 0.02, 0.5, M.greyMetal, { parent: g });
    this.box(0, 0, 0, 0.6, 0.04, 0.5, M.greyMetal, { parent: g });
    const pivot = new THREE.Group(); pivot.position.set(-0.29, 0, 0.25); g.add(pivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.9, 0.02), M.locker);
    door.position.set(0.29, 0.98, 0); door.castShadow = true; pivot.add(door);
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    this.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, maxY: 2, minY: 0, nav: true });
    const fwd = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
    const L = { group: g, pivot, door, angle: 0, target: 0, rot };
    this.lockers = this.lockers || []; this.lockers.push(L);
    if (hideId) {
      this.addHide({ id: hideId, type: 'locker', locker: L, pos: new THREE.Vector3(x, 1.6, z).addScaledVector(fwd, 0.02), out: new THREE.Vector3(x, 0, z).addScaledVector(fwd, 0.85), yaw: Math.atan2(fwd.x, fwd.z) + Math.PI, mesh: door, prompt: 'Verstoppen in de kast' });
    }
    return L;
  }
  stall(x, z, id) {
    // hokje: van x=16.4 (voorwand) tot 18 (achtermuur), breedte 1.6 in z (z = middelpunt)
    const M = this.M;
    this.box(17.2, 0.1, z - 0.8, 1.6, 2.0, 0.04, M.frame, { col: true, nav: true });
    this.box(x, 0.1, z - 0.55, 0.05, 2.0, 0.5, M.frame, { col: true });
    this.box(x, 0.1, z + 0.55, 0.05, 2.0, 0.5, M.frame, { col: true });
    const pivot = new THREE.Group(); pivot.position.set(x, 0, z - 0.3); this.dynamic.add(pivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.6), M.frame); door.position.set(0, 1.05, 0.3); door.castShadow = true; pivot.add(door);
    // toilet
    this.box(17.65, 0, z, 0.55, 0.42, 0.4, M.porcelain); this.box(17.92, 0.42, z, 0.18, 0.4, 0.45, M.porcelain);
    const L = { group: pivot, pivot, door, angle: 0, target: 0, rot: 0, stall: true };
    this.lockers = this.lockers || []; this.lockers.push(L);
    this.addHide({ id, type: 'stall', locker: L, pos: new THREE.Vector3(17.25, 1.5, z), out: new THREE.Vector3(15.7, 0, z), yaw: Math.PI / 2, mesh: door, prompt: 'Verstoppen in het hokje' });
    this.colliders.push({ minX: x, maxX: 18, minZ: z - 0.8, maxZ: z + 0.8, maxY: 2, minY: 0, nav: true });
  }
  shelf(x, z, rot, len, rnd, metal = false) {
    const M = this.M; const g = this.group(x, z, rot);
    const d = 0.5, h = 2.3;
    for (const sx of [-len / 2, len / 2]) for (const sz of [-d / 2, d / 2]) this.gbox(g, sx, 0, sz, 0.04, h, 0.04, M.greyMetal);
    for (let k = 0; k < 5; k++) {
      const y = 0.1 + k * 0.52;
      this.gbox(g, 0, y, 0, len, 0.02, d, M.greyMetal);
      let px = -len / 2 + 0.05;
      while (px < len / 2 - 0.3) {
        const bw = 0.25 + rnd() * 0.25;
        if (rnd() < 0.82) { const bh = 0.25 + rnd() * 0.18; this.gbox(g, px + bw / 2, y + 0.02, (rnd() - 0.5) * 0.05, bw - 0.02, bh, 0.38, rnd() < 0.5 ? M.cardboard : (metal ? M.rust : M.cardboard2)); }
        px += bw;
      }
    }
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    this.colliders.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, maxY: 2.4, minY: 0, nav: true });
  }
  crt(x, y, z, rot, small = false) {
    const M = this.M; const s = small ? 0.7 : 1;
    const g = this.group(x, z, rot, true); g.position.y = y;
    this.box(0, 0, -0.05, 0.42 * s, 0.38 * s, 0.4 * s, M.beigePlastic, { parent: g });
    this.box(0, 0.05 * s, -0.3 * s, 0.3 * s, 0.28 * s, 0.2 * s, M.beigePlastic, { parent: g });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * s, 0.27 * s), M.screenOff.clone());
    screen.position.set(0, 0.2 * s, 0.152 * s); g.add(screen);
    return { group: g, screen };
  }
  phone(x, y, z, rot) {
    const M = this.M; const g = this.group(x, z, rot, true); g.position.y = y;
    this.box(0, 0, 0, 0.22, 0.07, 0.2, M.plastic, { parent: g });
    this.box(0, 0.07, 0, 0.22, 0.04, 0.06, M.plastic, { parent: g });
    return g;
  }
  wallPhone(x, y, z, rot) {
    const M = this.M; const g = this.group(x, z, rot, true); g.position.y = y;
    this.box(0, -0.15, 0.04, 0.18, 0.28, 0.08, M.beigePlastic, { parent: g });
    const hs = this.box(-0.06, -0.12, 0.1, 0.05, 0.24, 0.05, M.beigePlastic, { parent: g });
    return { group: g, handset: hs };
  }
  wallClock(x, y, z, rot) {
    const c = textCanvas([['5:40', 1]], { w: 128, h: 128, bg: '#e6e2d6', aged: false });
    const ctx = c.getContext('2d'); ctx.fillStyle = '#e6e2d6'; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(64, 64, 58, 0, 7); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); ctx.lineTo(64 + Math.sin(a) * 54, 64 - Math.cos(a) * 54); ctx.stroke(); }
    // klok staat stil op 05:40
    const hand = (a, l, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(a) * l, 64 - Math.cos(a) * l); ctx.stroke(); };
    hand((5 + 40 / 60) / 12 * Math.PI * 2, 30, 5); hand(40 / 60 * Math.PI * 2, 45, 3);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
    m.position.set(x, y, z); m.rotation.y = rot; this.static.add(m);
  }
  noticeBoard(x, y, z, rot) {
    const M = this.M;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; this.static.add(g);
    this.box(0, -0.4, 0, 1.2, 0.8, 0.02, M.cardboard2, { parent: g });
    const notes = [['Personeelsuitje', 'GEANNULEERD'], ['Koffieautomaat', 'defect — melden bij Ria'], ['ROOSTER NACHT', 'wk 46: D. Verhoef'], ['Bij brand:', 'verlaat het pand'], ['Gevonden:', 'pasje H. Vos']];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), signMat(notes[i], { w: 256, h: 196, size: 26, bg: ['#e8e4d0', '#f0e8a0', '#dde8f0', '#f0d0d0', '#e8e4d0'][i] }));
      p.position.set(-0.42 + (i % 3) * 0.42, 0.18 - Math.floor(i / 3) * 0.32 - 0.1, 0.012); p.rotation.z = (Math.random() - 0.5) * 0.15; g.add(p);
    }
  }
  whiteboard(x, z, rot, lines) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), signMat(lines.map((l) => [l, 34]), { w: 512, h: 288, bg: '#e9ebe6', fg: '#1d2b6a', font: '"Comic Sans MS", cursive' }));
    m.position.set(x, 1.55, z + (rot === 0 ? 0.01 : 0)); m.rotation.y = rot; if (rot !== 0) m.position.x = x - 0.01;
    this.static.add(m);
  }
  plant(x, z) {
    const M = this.M;
    this.cyl(x, 0, z, 0.22, 0.17, 0.42, M.rust, { col: true });
    for (let i = 0; i < 7; i++) { const l = this.box(x, 0.42, z, 0.03, 0.5 + Math.random() * 0.5, 0.12, M.cardboard2); l.rotation.set((Math.random() - 0.5) * 1.2, Math.random() * 3, (Math.random() - 0.5) * 1.2); }
  }
  trash(x, z) { this.cyl(x, 0, z, 0.17, 0.14, 0.45, this.M.darkMetal, { col: true, nav: false }); }
  extinguisher(x, z, rot) { const M = this.M; this.cyl(x, 0.35, z + (rot === 0 ? 0.12 : -0.12), 0.08, 0.08, 0.5, M.red); this.box(x, 0.9, z + (rot === 0 ? 0.02 : -0.02), 0.3, 0.3, 0.04, M.red); }
  radiator(x, z, rot) { const M = this.M; const g = this.group(x, z, rot); for (let i = 0; i < 12; i++) this.gbox(g, -0.55 + i * 0.1, 0.15, 0.07, 0.05, 0.6, 0.08, M.beigePlastic); this.colliders.push({ minX: x - 0.65, maxX: x + 0.65, minZ: z - 0.2, maxZ: z + 0.2, maxY: 0.8, minY: 0, nav: false }); }
  waterCooler(x, z) { const M = this.M; this.box(x, 0, z, 0.35, 1.0, 0.35, M.beigePlastic, { col: true, nav: false }); this.cyl(x, 1.0, z, 0.14, 0.14, 0.45, new THREE.MeshStandardMaterial({ color: 0x5a7a8a, transparent: true, opacity: 0.5, roughness: 0.1 })); }
  trolley(x, z) { const M = this.M; this.box(x, 0.15, z, 0.9, 0.04, 0.5, M.greyMetal, { col: true, nav: false }); this.box(x, 0.8, z, 0.9, 0.04, 0.5, M.greyMetal); for (const a of [-0.43, 0.43]) for (const b of [-0.23, 0.23]) this.box(x + a, 0.05, z + b, 0.03, 0.8, 0.03, M.greyMetal); this.box(x, 0.84, z, 0.5, 0.25, 0.35, M.cardboard); }
  papers(x, z, n) { const M = this.M; for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), M.paper); p.rotation.set(-Math.PI / 2, 0, Math.random() * 6); p.position.set(x + (Math.random() - 0.5) * 2.5, 0.004 + i * 0.0005, z + (Math.random() - 0.5) * 1.2); p.receiveShadow = true; this.static.add(p); } }
  puddle(x, z, w, d) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), this.M.puddle); m.scale.set(w, d, 1); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); m.userData.noMerge = true; m.renderOrder = 1; this.scene.add(m); this.puddles.push({ x, z, w: w / 2, d: d / 2 }); }
  wetSign(x, z) { const M = this.M; const g = this.group(x, z, 0.5); const a = this.gbox(g, 0, 0, 0.12, 0.3, 0.62, 0.02, M.yellow); a.rotation.x = -0.25; const b = this.gbox(g, 0, 0, -0.12, 0.3, 0.62, 0.02, M.yellow); b.rotation.x = 0.25; }
  crate(x, z, s, y = 0) { this.box(x, y, z, s, s * 0.8, s * 0.9, this.M.wood2, { col: y === 0 }); }
  pallet(x, z, y = 0) { const M = this.M; for (let i = 0; i < 5; i++) this.box(x - 0.5 + i * 0.25, y + 0.1, z, 0.12, 0.03, 1.2, M.wood2); for (const b of [-0.5, 0, 0.5]) this.box(x, y, z + b, 1.2, 0.1, 0.1, M.wood2); this.colliderBox(x - 0.6, z - 0.6, x + 0.6, z + 0.6, y + 0.2, true); }
  barrel(x, z) { this.cyl(x, 0, z, 0.3, 0.3, 0.9, Math.random() < 0.5 ? this.M.rust : this.M.red, { col: true }); }
  deskLamp(x, y, z) { const M = this.M; this.cyl(x, y, z, 0.07, 0.08, 0.03, M.darkMetal); this.cyl(x, y + 0.03, z, 0.01, 0.01, 0.35, M.darkMetal); this.cyl(x + 0.05, y + 0.36, z, 0.04, 0.09, 0.1, M.darkMetal); }
  rack(x, z, rot, burnt) {
    const M = this.M; const g = this.group(x, z, rot);
    this.gbox(g, 0, 0, 0, 0.7, 2.0, 0.9, burnt ? M.burnt : M.darkMetal);
    for (let i = 0; i < 10; i++) { this.gbox(g, 0, 0.15 + i * 0.18, 0.455, 0.62, 0.12, 0.01, burnt ? M.burnt : M.plastic); }
    this.colliders.push({ minX: x - 0.36, maxX: x + 0.36, minZ: z - 0.46, maxZ: z + 0.46, maxY: 2, minY: 0, nav: true });
    if (!burnt) { this.racksLEDs = this.racksLEDs || []; for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.01), Math.random() < 0.7 ? M.ledGreen : M.ledRed); l.position.set(x - 0.2 + Math.random() * 0.4, 0.25 + Math.random() * 1.6, z - 0.462); l.visible = false; this.scene.add(l); this.racksLEDs.push(l); } }
  }
  fakeDoor(x, z, rot, mat, msg, glass = false) {
    const M = this.M; const g = this.group(x, z, rot, true);
    if (glass) {
      for (const s of [-0.48, 0.48]) { this.box(s, 2.16, 0, 0.94, 0.08, 0.06, M.frame, { parent: g }); this.box(-s * 0.15, 0.85, 0.06, 0.04, 0.45, 0.04, M.greyMetal, { parent: g }); }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.1), M.glass); hit.position.y = 1.1; hit.visible = false; g.add(hit);
      this.box(0, 0, 0, 0.06, 2.24, 0.07, M.frame, { parent: g });
    } else {
      this.box(0, 0, 0, 1.0, 2.1, 0.05, mat, { parent: g });
      this.box(0.38, 1.0, 0.05, 0.12, 0.03, 0.04, M.greyMetal, { parent: g });
      for (let k = 0; k < 4; k++) { const b = this.box(0, 0.4 + k * 0.45, 0.05, 1.1, 0.06, 0.03, M.rust, { parent: g }); b.rotation.z = (Math.random() - 0.5) * 0.1; }
    }
    this.game.addInteract(g, { prompt: () => 'Openen', local: true, use: () => { this.game.audio.play('door_locked', { pos: { x, y: 1, z } }); this.game.ui.toast(msg); } });
    return g;
  }

  // ---------------- BUITEN ----------------
  exterior() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.95 }));
    g.rotation.x = -Math.PI / 2; g.position.set(25, -0.02, 17); this.scene.add(g);
    // straatlantaarns (alleen emissief)
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
    const poolMat = new THREE.MeshBasicMaterial({ color: 0x4a2a0a, transparent: true, opacity: 0.35, depthWrite: false });
    for (const [x, z] of [[-14, 10], [-14, 26], [-30, 17], [12, -16], [30, -18]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), new THREE.MeshStandardMaterial({ color: 0x111111 })); pole.position.set(x, 3, z); this.scene.add(pole);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), lampMat); l.position.set(x, 6, z); this.scene.add(l);
      const p = new THREE.Mesh(new THREE.CircleGeometry(4, 24), poolMat); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); this.scene.add(p);
    }
    // geparkeerde auto voor de deur
    const car = new THREE.Group(); car.position.set(-8, 0, 16.5);
    const cm = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.3, metalness: 0.6 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), cm); b1.position.y = 0.6; car.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), cm); b2.position.set(0, 1.2, -0.2); car.add(b2);
    this.scene.add(car);
  }

  // ---------------- STATISCHE GEOMETRIE SAMENVOEGEN ----------------
  mergeStatic() {
    this.static.updateMatrixWorld(true);
    const groups = new Map();
    const toRemove = [];
    this.static.traverse((o) => {
      if (!o.isMesh || o.userData.noMerge) return;
      const mat = o.material;
      if (!groups.has(mat)) groups.set(mat, []);
      let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      groups.get(mat).push(g);
      toRemove.push(o);
    });
    for (const o of toRemove) o.parent.remove(o);
    for (const [mat, list] of groups) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, mat); m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
      this.raycastBlockers.push(m);
    }
  }

  // ---------------- NAVIGATIE ----------------
  buildNav() {
    this.navBlocked = [];
    for (let z = 0; z < H; z++) { this.navBlocked.push(new Array(W).fill(false)); }
    for (const c of this.colliders) {
      if (!c.nav) continue;
      for (let z = Math.floor(c.minZ); z <= Math.floor(c.maxZ); z++) for (let x = Math.floor(c.minX); x <= Math.floor(c.maxX); x++) {
        if (x < 0 || z < 0 || x >= W || z >= H) continue;
        const cx = x + 0.5, cz = z + 0.5;
        if (cx > c.minX - 0.2 && cx < c.maxX + 0.2 && cz > c.minZ - 0.2 && cz < c.maxZ + 0.2) this.navBlocked[z][x] = true;
      }
    }
  }
  walkable(x, z, ignoreDoors = false) {
    const t = this.cell(x, z);
    if (t === T_FLOOR) return !this.navBlocked[z][x];
    if (t === T_DOOR) { const d = this.doorAt[x + ',' + z]; if (!d) return false; if (d.id === 'exit') return false; return ignoreDoors || !d.locked || d.isOpen; }
    return false;
  }
  findPath(sx, sz, tx, tz) {
    sx = Math.floor(sx); sz = Math.floor(sz); tx = Math.floor(tx); tz = Math.floor(tz);
    if (!this.walkable(tx, tz)) { const n = this.nearestWalkable(tx, tz); if (!n) return null; [tx, tz] = n; }
    if (!this.walkable(sx, sz)) { const n = this.nearestWalkable(sx, sz); if (!n) return null; [sx, sz] = n; }
    const key = (x, z) => z * W + x;
    const open = [[sx, sz]], g = new Map([[key(sx, sz), 0]]), f = new Map([[key(sx, sz), 0]]), came = new Map();
    const closed = new Set();
    const hfn = (x, z) => Math.hypot(x - tx, z - tz);
    let iter = 0;
    while (open.length && iter++ < 4000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(key(...open[i])) < f.get(key(...open[bi]))) bi = i;
      const [cx, cz] = open.splice(bi, 1)[0]; const ck = key(cx, cz);
      if (cx === tx && cz === tz) {
        const path = [[cx, cz]]; let k = ck;
        while (came.has(k)) { k = came.get(k); path.push([k % W, Math.floor(k / W)]); }
        return path.reverse().map(([x, z]) => new THREE.Vector3(x + 0.5, 0, z + 0.5));
      }
      closed.add(ck);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (!this.walkable(nx, nz)) continue;
        if (dx && dz) { if (!this.walkable(cx + dx, cz) || !this.walkable(cx, cz + dz)) continue; if (this.cell(nx, nz) === T_DOOR || this.cell(cx, cz) === T_DOOR) continue; }
        const nk = key(nx, nz); if (closed.has(nk)) continue;
        const ng = g.get(ck) + (dx && dz ? 1.414 : 1) + (this.cell(nx, nz) === T_DOOR ? 0.5 : 0);
        if (!g.has(nk) || ng < g.get(nk)) {
          g.set(nk, ng); f.set(nk, ng + hfn(nx, nz)); came.set(nk, ck);
          if (!open.some(([a, b]) => a === nx && b === nz)) open.push([nx, nz]);
        }
      }
    }
    return null;
  }
  nearestWalkable(x, z) {
    for (let r = 1; r < 5; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (this.walkable(x + dx, z + dz)) return [x + dx, z + dz];
    return null;
  }
  // Zichtlijn/occlusie door het grid (DDA). mode 'vision': glas laat zicht door. Geeft aantal blokkades terug.
  occlusion(ax, az, bx, bz, mode = 'audio') {
    let x = Math.floor(ax), z = Math.floor(az); const ex = Math.floor(bx), ez = Math.floor(bz);
    const dx = bx - ax, dz = bz - az;
    const sx = Math.sign(dx), sz = Math.sign(dz);
    const tdx = dx !== 0 ? Math.abs(1 / dx) : 1e9, tdz = dz !== 0 ? Math.abs(1 / dz) : 1e9;
    let tmx = dx !== 0 ? (sx > 0 ? (x + 1 - ax) : (ax - x)) * tdx : 1e9;
    let tmz = dz !== 0 ? (sz > 0 ? (z + 1 - az) : (az - z)) * tdz : 1e9;
    let count = 0, last = -1, n = 0;
    while (!(x === ex && z === ez) && n++ < 120) {
      if (tmx < tmz) { tmx += tdx; x += sx; } else { tmz += tdz; z += sz; }
      if (x === ex && z === ez) break;
      const t = this.cell(x, z);
      let blk = 0;
      if (t === T_WALL || t === T_GATE) blk = 1;
      else if (t === T_GLASS) blk = mode === 'vision' ? 0 : 0.6;
      else if (t === T_DOOR) { const d = this.doorAt[x + ',' + z]; blk = d && !d.blocking ? 0 : (mode === 'vision' ? 1 : 0.7); }
      if (blk) { // aaneengesloten muurcellen tellen als één muur
        const id = (t === T_WALL ? 'w' : 'o');
        if (last !== id) count += blk; else count += blk * 0.15;
        last = id;
        if (mode === 'vision') return count;
      } else last = -1;
      if (count > 4) break;
    }
    return count;
  }
  hasLOS(ax, az, bx, bz) { return this.occlusion(ax, az, bx, bz, 'vision') === 0; }
  surfaceAt(x, z) {
    for (const p of this.puddles) { const dx = (x - p.x) / p.w, dz = (z - p.z) / p.d; if (dx * dx + dz * dz < 1) return 'wet'; }
    const r = this.roomAt(x, z); return r ? r.surface : 'concrete';
  }
}

function mulberryLocal(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------- DEUR ----------------
export class Door {
  constructor(level, s) {
    const M = level.M;
    this.level = level; this.id = s.id; this.x = s.x; this.z = s.z; this.kind = s.kind;
    this.locked = s.locked || null; this.lockMsg = s.lockMsg; this.name = s.name;
    this.axis = (level.cell(s.x - 1, s.z) !== T_FLOOR && level.cell(s.x + 1, s.z) !== T_FLOOR) ? 'x' : 'z';
    if (this.axis === 'x') this.swing = s.into === 'n' ? 1 : -1; else this.swing = s.into === 'e' ? 1 : -1;
    this.openAngle = this.swing * 1.75;
    this.angle = s.open ? this.openAngle : 0; this.target = this.angle; this.speed = 2.6;
    const cx = s.x + 0.5, cz = s.z + 0.5;
    this.center = new THREE.Vector3(cx, 1.1, cz);
    this.pivot = new THREE.Group();
    const mat = s.kind === 'wood' ? M.doorWood : s.kind === 'exit' ? M.doorExit : M.doorMetal;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.08, 0.05), mat);
    const handleMat = M.greyMetal;
    if (this.axis === 'x') {
      this.pivot.position.set(s.x + 0.05, 0, cz);
      panel.position.set(0.45, 1.04, 0);
      for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.03), handleMat); h.position.set(0.78, 1.0, sd * 0.05); this.pivot.add(h); }
    } else {
      this.pivot.position.set(cx, 0, s.z + 0.05);
      panel.rotation.y = Math.PI / 2; panel.position.set(0, 1.04, 0.45);
      for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.13), handleMat); h.position.set(sd * 0.05, 1.0, 0.78); this.pivot.add(h); }
    }
    if (s.kind === 'exit') { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.75), M.greyMetal); bar.position.set(-0.06, 1.0, 0.45); this.pivot.add(bar); }
    panel.castShadow = true; panel.receiveShadow = true;
    this.panel = panel; this.pivot.add(panel);
    this.pivot.rotation.y = this.angle;
    level.dynamic.add(this.pivot);
    // bovendorpel + kozijn
    level.box(cx, 2.1, cz, 1, WALL_H - 2.1, 1, M.paintGreen === undefined ? M.frame : level.M.frame, { shadow: true }).userData.noMerge = false;
    const f = (ox, oz, w, d, h, y) => level.box(cx + ox, y, cz + oz, w, h, d, M.frame);
    if (this.axis === 'x') { f(-0.48, 0, 0.05, 1.02, 2.1, 0); f(0.48, 0, 0.05, 1.02, 2.1, 0); }
    else { f(0, -0.48, 1.02, 0.05, 2.1, 0); f(0, 0.48, 1.02, 0.05, 2.1, 0); }
    level.game.addInteract(panel, {
      prompt: () => (this.locked && this.locked !== 'open' ? (this.canUnlock() ? 'Ontgrendelen' : 'Openen') : (this.target === 0 ? 'Openen' : 'Sluiten')),
      use: () => this.playerUse(),
      // co-op-gast: het codeslot opent het eigen keypad, al het andere doet de host
      guest: () => { const g = level.game; if (this.locked === 'code') g.story.openKeypad(this); else g.net.useRemote(g.interactables.get(panel)); },
    });
    this.creakT = 0;
  }
  get isOpen() { return Math.abs(this.angle) > 0.35; }
  get blocking() { return Math.abs(this.angle) < 0.4; }
  canUnlock() { return this.locked && this.locked.startsWith('key_') && this.level.game.inv.has(this.locked); }
  playerUse() {
    const g = this.level.game;
    if (this.locked) {
      if (this.canUnlock()) {
        g.inv.remove(this.locked); this.locked = null;
        g.sfx('unlock', { pos: this.center }); g.ui.toast('Ontgrendeld.');
        g.story && g.story.onDoorUnlocked && g.story.onDoorUnlocked(this);
        return;
      }
      if (this.locked === 'code' && g.story) { if (g.actor) { g.ui.toast('Gebruik het codepaneel naast de deur.'); return; } g.story.openKeypad(this); return; }
      g.sfx('door_locked', { pos: this.center });
      g.ui.toast(this.lockMsg || 'Op slot.');
      g.noise(this.center, 4, 'door');
      return;
    }
    // botsingscontrole: speler niet in de deur laten klemmen
    const p = g.actorPos();
    if (this.target !== 0 && Math.floor(p.x) === this.x && Math.floor(p.z) === this.z) return;
    this.toggle(g.player.running ? 'fast' : 'normal');
  }
  toggle(how = 'normal', by = 'player') {
    const g = this.level.game;
    const opening = this.target === 0;
    // open van de speler af draaien
    if (opening) {
      let sign = this.swing;
      const src = by === 'player' ? g.actorPos() : (by.pos || null);
      if (src) {
        const side = this.axis === 'x' ? Math.sign(src.z - (this.z + 0.5)) : Math.sign(src.x - (this.x + 0.5));
        // swing>0 opent richting -z (x-as) of +x (z-as)
        if (this.axis === 'x') sign = side > 0 ? 1 : -1; else sign = side > 0 ? -1 : 1;
      }
      this.openAngle = sign * 1.75;
    }
    this.target = opening ? this.openAngle : 0;
    this.speed = how === 'fast' ? 5 : how === 'slow' ? 0.35 : 2.4;
    if (opening) {
      g.audio.play(how === 'slow' ? 'creak_slow' : 'creak', { pos: this.center, volume: how === 'fast' ? 0.9 : 0.6, rate: how === 'fast' ? 1.4 : 1 });
      g.noise(this.center, how === 'fast' ? 12 : 6, by === 'player' ? 'player' : 'other');
    } else { this.pendingCloseSound = how; }
    if (by === 'player') g.story && g.story.onDoorUsed && g.story.onDoorUsed(this, opening);
  }
  setOpen(open, silent = true) { this.target = open ? this.openAngle : 0; this.angle = this.target; this.pivot.rotation.y = this.angle; void silent; }
  slam() {
    const g = this.level.game; this.target = 0; this.speed = 9; this.pendingCloseSound = 'slam';
    g.noise(this.center, 14, 'other');
  }
  update(dt) {
    if (this.angle === this.target) return;
    const d = this.target - this.angle, st = this.speed * dt;
    if (Math.abs(d) <= st) {
      this.angle = this.target;
      if (this.target === 0 && this.pendingCloseSound) {
        const g = this.level.game;
        if (this.pendingCloseSound === 'slam') { g.audio.play('door_slam', { pos: this.center, volume: 1 }); g.shake(0.25); }
        else g.audio.play('door_close', { pos: this.center, volume: this.pendingCloseSound === 'fast' ? 1 : 0.6 });
        g.noise(this.center, this.pendingCloseSound === 'fast' ? 12 : 5, 'player');
        this.pendingCloseSound = null;
      }
    } else this.angle += Math.sign(d) * st;
    this.pivot.rotation.y = this.angle;
  }
  // botsvolume van het geopende deurblad
  panelAABB() {
    if (this.blocking) return null;
    const a = this.angle, L = 0.92;
    const px = this.pivot.position.x, pz = this.pivot.position.z;
    let ex, ez;
    if (this.axis === 'x') { ex = px + Math.cos(a) * L; ez = pz - Math.sin(a) * L; }
    else { ex = px + Math.sin(a) * L; ez = pz + Math.cos(a) * L; }
    return { minX: Math.min(px, ex) - 0.04, maxX: Math.max(px, ex) + 0.04, minZ: Math.min(pz, ez) - 0.04, maxZ: Math.max(pz, ez) + 0.04 };
  }
}

// ---------------- LICHTSYSTEEM ----------------
export class LightSystem {
  constructor(game, level, poolSize = 8) {
    this.game = game; this.level = level;
    this.power = { A: false, B: false, C: false, D: false };
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      const l = new THREE.PointLight(0xe4ece4, 0, 10, 1.6);
      l.castShadow = false; game.scene.add(l); this.pool.push(l);
    }
    this.hums = [];
    this.flickerZones = [];
    this.alarm = false; this.alarmT = 0;
  }
  setCircuit(c, on, fx = true) {
    if (this.power[c] === on) return;
    this.power[c] = on;
    const g = this.game;
    if (fx) for (const f of this.level.fixtures) if (f.circuit === c) {
      const d = Math.hypot(f.x - g.player.pos.x, f.z - g.player.pos.z);
      if (on && d < 25) { f.startT = 0.2 + Math.random() * 1.2 + d * 0.03; f.starting = true; }
    }
  }
  flickerNear(x, z, radius, dur) { this.flickerZones.push({ x, z, radius, t: dur }); }
  update(dt, cam) {
    const g = this.game, t = g.time;
    for (const zf of this.flickerZones) zf.t -= dt;
    this.flickerZones = this.flickerZones.filter((z) => z.t > 0);
    const cand = [];
    for (const f of this.level.fixtures) {
      let target = 0;
      if (this.power[f.circuit] && f.state !== 'broken' && !f.dead) {
        target = 1;
        if (f.starting) { f.startT -= dt; if (f.startT > 0) target = 0; else if (f.startT > -0.5) { target = Math.sin(f.startT * 60) > 0 ? 0.8 : 0.05; if (!f.startSnd) { f.startSnd = true; if (Math.hypot(f.x - cam.position.x, f.z - cam.position.z) < 14) g.audio.play('tl_start', { pos: { x: f.x, y: f.y, z: f.z }, volume: 0.35 }); } } else { f.starting = false; f.startSnd = false; } }
        if (f.state === 'flicker') {
          f.flickT -= dt;
          if (f.flickT <= 0) { f.flickOn = !f.flickOn; f.flickT = f.flickOn ? 0.2 + Math.random() * 3.5 : 0.03 + Math.random() * 0.25; if (!f.flickOn && Math.hypot(f.x - cam.position.x, f.z - cam.position.z) < 9 && Math.random() < 0.5) g.audio.play('tl_flicker', { pos: { x: f.x, y: f.y, z: f.z }, volume: 0.25 }); }
          if (!f.flickOn) target = 0.04;
        }
        for (const zf of this.flickerZones) if (Math.hypot(f.x - zf.x, f.z - zf.z) < zf.radius) { target *= Math.random() < 0.35 ? 0.05 : 1; }
      }
      f.b += (target - f.b) * Math.min(1, dt * 30);
      f.mat.emissiveIntensity = f.b * 2.4;
      if (f.b > 0.03) { const d = (f.x - cam.position.x) ** 2 + (f.z - cam.position.z) ** 2; if (d < 400) cand.push([d, f]); }
    }
    cand.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i], c = cand[i];
      if (c) { const f = c[1]; l.position.set(f.x, f.y, f.z); l.intensity = f.b * 4.2; l.visible = true; }
      else { l.intensity = 0; l.visible = false; }
    }
    // zoemen van TL-buizen in de buurt
    const near = cand.filter((c) => c[0] < 49 && c[1].b > 0.5).slice(0, 2).map((c) => c[1]);
    for (const h of this.hums) if (!near.includes(h.f)) { h.snd && h.snd.stop(0.3); h.dead = true; }
    this.hums = this.hums.filter((h) => !h.dead);
    for (const f of near) if (!this.hums.some((h) => h.f === f)) {
      const snd = g.audio.play('tl_hum', { pos: { x: f.x, y: f.y, z: f.z }, loop: true, volume: 0.07, ref: 0.8, rolloff: 1.6, reverb: 0.1, detune: false, offset: Math.random() * 1.5 });
      this.hums.push({ f, snd });
    }
    for (const h of this.hums) if (h.snd) h.snd.base = 0.07 * h.f.b;
    if (this.level.racksLEDs) { const on = this.power.D; for (const l of this.level.racksLEDs) l.visible = on && Math.sin(t * (3 + l.id % 7) + l.id) > -0.3; }
  }
  anyPowerAt(x, z) {
    // is de speler in een verlichte zone? (voor zichtbaarheid voor de vijand)
    for (const l of this.pool) if (l.visible && l.intensity > 1.5) { const d = Math.hypot(l.position.x - x, l.position.z - z); if (d < 3.2 && this.level.hasLOS(l.position.x, l.position.z, x, z)) return true; }
    return false;
  }
}
