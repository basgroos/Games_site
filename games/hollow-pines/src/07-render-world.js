/* Hollow Pines — static scene construction (terrain, forest, structures, props). */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { mulberry32, clamp, lerp } = HG.util;
  const W = HG.W, T = HG.T;

  // ---------- geometry batching with world-space UVs ----------
  function Batch(uvScale) { this.p = []; this.n = []; this.uv = []; this.i = []; this.s = uvScale || 1; }
  Batch.prototype.quad = function (a, b, c, d, nrm, uvs) {
    const base = this.p.length / 3;
    for (const v of [a, b, c, d]) this.p.push(v[0], v[1], v[2]);
    for (let k = 0; k < 4; k++) this.n.push(nrm[0], nrm[1], nrm[2]);
    if (uvs) for (const u of uvs) this.uv.push(u[0], u[1]);
    else {
      // planar mapping by dominant normal axis
      const s = this.s;
      for (const v of [a, b, c, d]) {
        if (Math.abs(nrm[1]) > 0.7) this.uv.push(v[0] * s, v[2] * s);
        else if (Math.abs(nrm[0]) > 0.7) this.uv.push(v[2] * s, v[1] * s);
        else this.uv.push(v[0] * s, v[1] * s);
      }
    }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // axis-aligned box; faces: which faces to emit {px,nx,py,ny,pz,nz}
  Batch.prototype.box = function (x0, y0, z0, x1, y1, z1, faces) {
    const f = faces || { px: 1, nx: 1, py: 1, ny: 0, pz: 1, nz: 1 };
    if (f.py) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
    if (f.ny) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
    if (f.pz) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    if (f.nz) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
    if (f.px) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]);
    if (f.nx) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  };
  Batch.prototype.mesh = function (mat, shadow) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = shadow !== false; m.receiveShadow = true;
    return m;
  };
  HG.Batch = Batch;

  // merge a group of meshes into one mesh per material (static props)
  function bake(group, scene) {
    group.updateMatrixWorld(true);
    const byMat = new Map();
    group.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const k = o.material.uuid;
      if (!byMat.has(k)) byMat.set(k, { mat: o.material, geos: [] });
      byMat.get(k).geos.push(g);
    });
    const out = [];
    for (const { mat, geos } of byMat.values()) {
      let n = 0; for (const g of geos) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), U = new Float32Array(n * 2);
      let o = 0;
      for (const g of geos) {
        P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
      scene.add(m); out.push(m);
    }
    return out;
  }
  HG.bake = bake;

  // wind sway injected into standard materials
  function windify(mat, strength, uniforms, depth) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uWind = uniforms.uWind;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float hh = max(position.y, 0.0);
        float sway = (sin(uTime * 1.1 + ip.x * 0.21 + ip.z * 0.17) + 0.5 * sin(uTime * 2.7 + ip.z * 0.5)) * uWind * ${strength.toFixed(4)} * hh * hh;
        transformed.x += sway; transformed.z += sway * 0.6;
        transformed.x += sin(uTime * 7.0 + position.x * 9.0 + ip.x) * uWind * ${(strength * 0.15).toFixed(4)} * hh;`);
    };
  }

  HG.buildWorldScene = function (R) {
    const world = R.world, scene = R.scene, Tx = R.T, Mt = R.M;
    const q = R.quality;
    const rnd = mulberry32(4242);
    R.windU = { uTime: { value: 0 }, uWind: { value: 1 } };

    // ===== terrain =====
    {
      const seg = q === 'low' ? 160 : 256;
      const g = new THREE.PlaneGeometry(128, 128, seg, seg);
      g.rotateX(-Math.PI / 2);
      g.translate(64, 0, 64);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, world.terrainY(pos.getX(i), pos.getZ(i)));
      g.computeVertexNormals();
      // the uv of PlaneGeometry after rotation: u along x, v along -z → remap to map z
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 128, 1 - pos.getZ(i) / 128);
      Tx.terrain.flipY = true;
      const mat = new THREE.MeshStandardMaterial({ map: Tx.terrain, roughnessMap: Tx.terrainRough, roughness: 1, metalness: 0 });
      R.terrainMat = mat;
      const detU = { tDetail: { value: Tx.detail }, uWet: { value: 0 } };
      R.terrainU = detU;
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.tDetail = detU.tDetail; sh.uniforms.uWet = detU.uWet;
        sh.fragmentShader = 'uniform sampler2D tDetail; uniform float uWet;\n' + sh.fragmentShader
          .replace('#include <map_fragment>', '#include <map_fragment>\n float det = texture2D(tDetail, vUv * 64.0).r * 0.7 + texture2D(tDetail, vUv * 9.0).r * 0.3; diffuseColor.rgb *= 0.55 + det * 0.9;')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor - uWet * 0.35 + (det - 0.5) * 0.2, 0.08, 1.0);');
      };
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
      scene.add(m);
      R.terrain = m;
      // road is a separate slightly raised strip so it reads as asphalt
    }

    // ===== forest: chunked instancing =====
    const CH = 32;
    R.chunks = [];
    const chunkOf = (x, z) => clamp(Math.floor(x / CH), 0, 3) + clamp(Math.floor(z / CH), 0, 3) * 4;
    const pineGeo = buildPineGeometry(), trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 7, 1, true).translate(0, 0.5, 0);
    const deadGeo = buildDeadTreeGeometry();
    const pineMat = new THREE.MeshStandardMaterial({ map: Tx.pine, alphaTest: 0.42, side: THREE.DoubleSide, color: 0x8a9a80, roughness: 0.9 });
    windify(pineMat, 0.0016, R.windU);
    const pineDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: Tx.pine, alphaTest: 0.42 });
    const trunkMat = Mt.bark, deadMat = Mt.barkDead;
    const grassMat = new THREE.MeshStandardMaterial({ map: Tx.grass, alphaTest: 0.38, side: THREE.DoubleSide, color: 0x9a9a88, roughness: 1 });
    windify(grassMat, 0.09, R.windU);
    const bushMat = new THREE.MeshStandardMaterial({ map: Tx.leaves, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x8a907a, roughness: 0.95 });
    windify(bushMat, 0.05, R.windU);
    const bushDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: Tx.leaves, alphaTest: 0.4 });
    const grassGeo = crossQuads(3, 0.9, 1.0), tuftGeo = crossQuads(2, 0.5, 0.45), bushGeo = buildBushGeometry();
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    { const p = rockGeo.attributes.position; const n = HG.util.makeNoise(5); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.75 + n(x * 2 + 9, z * 2 + y * 3) * 0.5; p.setXYZ(i, x * k, y * k * 0.8, z * k); } rockGeo.computeVertexNormals(); }
    const rockMat = new THREE.MeshStandardMaterial({ map: Tx.concrete, color: 0x6a6860, roughness: 0.95 });
    const lists = []; for (let i = 0; i < 16; i++) lists.push({ pine: [], trunk: [], dead: [], grass: [], tuft: [], bush: [], rock: [] });
    const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), eu = new THREE.Euler();
    const put = (arr, x, y, z, ry, sx, sy, sz, rx, rz) => { eu.set(rx || 0, ry, rz || 0); qq.setFromEuler(eu); sc.set(sx, sy, sz); ps.set(x, y, z); mtx.compose(ps, qq, sc); arr.push(mtx.clone()); };
    for (const t of world.trees) {
      const L = lists[chunkOf(t.x, t.z)];
      const y = world.terrainY(t.x, t.z) - 0.15;
      if (t.kind === 'pine') {
        put(L.trunk, t.x, y, t.z, t.rot, t.r * 1.9, t.h, t.r * 1.9, t.lean, t.lean * 0.5);
        const cw = t.h * (0.27 + t.scale * 0.06);
        put(L.pine, t.x, y + t.h * 0.12, t.z, t.rot, cw, t.h * 0.9, cw, t.lean, t.lean * 0.5);
      } else put(L.dead, t.x, y, t.z, t.rot, 1 + t.scale * 0.3, t.h / 9, 1 + t.scale * 0.3, t.lean, t.lean);
    }
    for (let z = 2; z < 123; z++) for (let x = 2; x < 126; x++) {
      const i = z * W + x;
      if (world.grid[0][i] !== T.OPEN || world.indoor[0][i]) continue;
      const L = lists[chunkOf(x, z)];
      const surf = world.surf[0][i];
      if (world.cover[i] === 1) {
        const n = q === 'low' ? 2 : 3;
        for (let k = 0; k < n; k++) { const px = x + rnd(), pz = z + rnd(); put(L.grass, px, world.terrainY(px, pz) - 0.05, pz, rnd() * 6.28, 0.9 + rnd() * 0.5, 0.9 + rnd() * 0.6, 0.9 + rnd() * 0.5); }
      } else if (surf === HG.S.GRASS && rnd() < (q === 'low' ? 0.25 : 0.55)) {
        const px = x + rnd(), pz = z + rnd(); put(L.tuft, px, world.terrainY(px, pz) - 0.03, pz, rnd() * 6.28, 0.8 + rnd() * 0.6, 0.6 + rnd() * 0.8, 0.8 + rnd() * 0.6);
      }
    }
    for (const b of world.bushes) { const L = lists[chunkOf(b.x, b.z)]; put(L.bush, b.x, world.terrainY(b.x, b.z) - 0.1, b.z, b.rot, b.s * 1.3, b.s, b.s * 1.3); }
    for (const r of world.rocks) { const L = lists[chunkOf(r.x, r.z)]; put(L.rock, r.x, world.terrainY(r.x, r.z) - r.r * 0.3, r.z, r.rot, r.r * r.sx, r.r * r.sy * (r.big ? 1.3 : 1), r.r); }
    const inst = (geo, mat, arr, shadow, depth) => {
      if (!arr.length) return null;
      const m = new THREE.InstancedMesh(geo, mat, arr.length);
      for (let i = 0; i < arr.length; i++) m.setMatrixAt(i, arr[i]);
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false; m.castShadow = !!shadow; m.receiveShadow = true;
      if (depth) m.customDepthMaterial = depth;
      scene.add(m); return m;
    };
    for (let c = 0; c < 16; c++) {
      const L = lists[c];
      const cx = (c % 4) * CH + CH / 2, cz = Math.floor(c / 4) * CH + CH / 2;
      const meshes = [inst(pineGeo, pineMat, L.pine, true, pineDepth), inst(trunkGeo, trunkMat, L.trunk, true), inst(deadGeo, deadMat, L.dead, true), inst(grassGeo, grassMat, L.grass, false), inst(tuftGeo, grassMat, L.tuft, false), inst(bushGeo, bushMat, L.bush, true, bushDepth), inst(rockGeo, rockMat, L.rock, true)].filter(Boolean);
      R.chunks.push({ cx, cz, sphere: new THREE.Sphere(new THREE.Vector3(cx, 6, cz), CH * 0.75 + 12), meshes, grass: meshes.filter(m => m.material === grassMat) });
    }

    // ===== structures =====
    buildStructures(R);
    // ===== props =====
    const propGroup = new THREE.Group();
    R.dynamicProps = {};
    for (const p of world.props) {
      if (p.model === 'gate' || p.model === 'generator') continue;
      const g = HG.buildProp(p);
      const y = p.level === 0 ? (p.y0 > 0 ? p.y0 : world.terrainY(p.x, p.z)) : p.y0;
      g.position.set(p.x, y, p.z); g.rotation.y = p.yaw;
      if (g.userData.beacon || g.userData.swing || g.userData.bulb || g.userData.lens) { scene.add(g); R.dynamicProps[p.model] = g; }
      else propGroup.add(g);
    }
    for (const c of world.containers) {
      if (c.model === 'none') continue;
      const s = c.solid || [0.5, 0.5, 0.6];
      const g = HG.buildProp({ model: c.model, w: s[0] > s[1] ? s[0] : s[1], d: s[0] > s[1] ? s[1] : s[0], h: s[2], x: c.x, z: c.z });
      const y = c.level === 0 ? (c.y0 > 0 ? c.y0 : world.terrainY(c.x, c.z)) : c.y0;
      g.position.set(c.x, y, c.z);
      // face into the room (models are built facing +z)
      g.rotation.y = c.yaw + Math.PI + (s[0] > s[1] ? 0 : Math.PI / 2);
      propGroup.add(g);
    }
    scene.add(propGroup);
    bake(propGroup, scene);
    scene.remove(propGroup);

    // hiding wardrobes / lockers (doors animate)
    R.hideModels = new Map();
    for (const h of world.hides) {
      const g = new THREE.Group();
      const metal = h.id.includes('locker');
      const mat = metal ? Mt.paintGreen : Mt.woodDark;
      HG.box(0.84, 2.0, 0.8, mat, 0, 1.0, 0, g);
      const dl = new THREE.Group(); dl.position.set(-0.42, 0, -0.41); g.add(dl);
      const dr = new THREE.Group(); dr.position.set(0.42, 0, -0.41); g.add(dr);
      HG.box(0.41, 1.9, 0.03, mat, 0.205, 1.0, -0.02, dl); HG.box(0.41, 1.9, 0.03, mat, -0.205, 1.0, -0.02, dr);
      // slats
      for (let i = 0; i < 6; i++) { HG.box(0.3, 0.02, 0.02, Mt.rubber, 0.205, 1.4 + i * 0.07, -0.04, dl); HG.box(0.3, 0.02, 0.02, Mt.rubber, -0.205, 1.4 + i * 0.07, -0.04, dr); }
      g.position.set(h.x, h.y0, h.z); g.rotation.y = h.yaw;
      scene.add(g);
      R.hideModels.set(h.id, { g, dl, dr, open: 0 });
    }

    // generator
    {
      const g = new THREE.Group();
      HG.box(2.3, 0.15, 1.2, Mt.concrete, 0, 0.07, 0, g);
      HG.box(1.6, 0.9, 1.0, Mt.paintGreen, -0.15, 0.6, 0, g);
      HG.cyl(0.25, 0.25, 0.9, Mt.paintRed, 0.85, 0.6, 0, g, 12, 0, Math.PI / 2);
      HG.cyl(0.05, 0.05, 0.8, Mt.metalDark, -0.7, 1.4, 0.3, g, 6);
      HG.box(0.3, 0.2, 0.05, Mt.metalDark, 0.2, 0.75, 0.52, g);
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0x220000 }));
      light.position.set(0.3, 0.8, 0.53); g.add(light);
      g.position.set(60.1, world.terrainY(60.1, 47), 47.05);
      scene.add(g); R.generator = { g, light };
    }
    // power panel
    {
      const g = new THREE.Group();
      HG.box(1.2, 1.5, 0.3, Mt.metalDark, 0, 1.05, 0, g);
      const lights = [];
      for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0x200404 })); m.position.set(-0.4 + i * 0.2, 1.6, 0.16); g.add(m); lights.push(m); }
      const lever = new THREE.Group(); lever.position.set(0.45, 1.0, 0.16); g.add(lever); HG.box(0.04, 0.3, 0.04, Mt.paintRed, 0, 0.15, 0, lever);
      g.position.set(102.4, 0.1, 34.55); g.rotation.y = Math.PI;
      scene.add(g); R.panel = { g, lights, lever };
    }
    // fusebox in basement
    {
      const g = new THREE.Group();
      HG.box(0.15, 0.8, 0.6, Mt.metalDark, 0, 1.4, 0, g);
      const lever = new THREE.Group(); lever.position.set(-0.08, 1.4, 0.2); g.add(lever); HG.box(0.03, 0.2, 0.03, Mt.paintRed, 0, 0.1, 0, lever);
      g.position.set(65.85, HG.LEVEL_FLOOR[1], 64.0);
      scene.add(g); R.fusebox = { g, lever };
    }
    // radio on the kitchen table
    {
      const g = new THREE.Group();
      const parts = [HG.box(0.18, 0.1, 0.14, Mt.metalDark, -0.3, 0.05, 0, g), HG.box(0.12, 0.08, 0.12, Mt.paintGreen, 0, 0.04, 0.05, g), HG.box(0.1, 0.06, 0.18, Mt.metal, 0.25, 0.03, -0.05, g)];
      const radio = new THREE.Group(); g.add(radio);
      HG.box(0.45, 0.22, 0.25, Mt.woodDark, 0, 0.11, 0, radio); HG.box(0.3, 0.1, 0.02, Mt.paintYellow, -0.05, 0.13, 0.13, radio); HG.cyl(0.005, 0.005, 0.6, Mt.metal, 0.18, 0.5, -0.05, radio, 4);
      const dial = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0x100800 })); dial.position.set(0.15, 0.15, 0.13); radio.add(dial);
      for (const p of parts) p.visible = false; radio.visible = false;
      g.position.set(67.5, 0.5 + 0.78, 64.0);
      scene.add(g); R.radio = { g, parts, radio, dial };
    }
    // truck
    {
      const g = new THREE.Group();
      HG.box(2.0, 0.8, 5.0, Mt.truck, 0, 0.75, 0, g);
      HG.box(1.9, 0.75, 1.7, Mt.truck, 0, 1.5, 0.2, g);
      HG.box(1.8, 0.55, 0.05, Mt.glass, 0, 1.55, -0.66, g, -0.25);
      HG.box(1.95, 0.3, 1.9, Mt.truck, 0, 1.15, 1.95, g);
      for (const [x, z] of [[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]]) HG.cyl(0.4, 0.4, 0.3, Mt.rubber, x * 0.95, 0.4, z, g, 12, 0, Math.PI / 2);
      const hood = new THREE.Group(); hood.position.set(0, 1.16, -1.0); g.add(hood); HG.box(1.95, 0.06, 1.5, Mt.truck, 0, 0, -0.75, hood);
      const hl = [], hlm = [];
      for (const x of [-0.7, 0.7]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), new THREE.MeshBasicMaterial({ color: 0x111111 })); m.position.set(x, 0.95, -2.51); m.rotation.y = Math.PI; g.add(m); hlm.push(m); }
      g.position.set(70.1, world.terrainY(70.1, 82.6), 82.6);
      scene.add(g); R.truck = { g, hood, hlm };
    }
    // storage padlock + gate
    {
      const lock = HG.box(0.08, 0.12, 0.05, Mt.metal, 24.5, 1.1, 82.25, scene);
      R.storageLock = lock;
      const gate = new THREE.Group(); scene.add(gate);
      const leafs = [];
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(64 + side * 2, 0, 114.5); gate.add(pivot);
        const frame = new THREE.Group(); frame.position.x = -side * 1.0; pivot.add(frame);
        HG.box(2.0, 0.06, 0.06, Mt.metal, 0, 2.2, 0, frame); HG.box(2.0, 0.06, 0.06, Mt.metal, 0, 0.1, 0, frame); HG.box(0.06, 2.2, 0.06, Mt.metal, side * 1.0, 1.15, 0, frame); HG.box(0.06, 2.2, 0.06, Mt.metal, -side * 1.0, 1.15, 0, frame);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.1), Mt.chain); mesh.position.y = 1.15; frame.add(mesh);
        leafs.push({ pivot, side });
      }
      const chain = new THREE.Group(); chain.position.set(64, 1.1, 114.4); gate.add(chain);
      for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), Mt.metal); l.position.set(Math.sin(i) * 0.06, -i * 0.05 + 0.2, 0); l.rotation.y = i % 2 ? 0 : Math.PI / 2; chain.add(l); }
      HG.box(0.08, 0.1, 0.04, Mt.paintYellow, 0, -0.25, 0, chain);
      R.gate = { leafs, chain };
      // gate posts and lights
      for (const x of [61.6, 66.4]) HG.box(0.2, 2.8, 0.2, Mt.metalDark, x, 1.4, 114.5, scene);
    }
    // fallen tree
    {
      const g = new THREE.Group();
      const trunk = HG.cyl(0.42, 0.55, 16, Mt.bark, 0, 0.5, 0, g, 10, 0, Math.PI / 2);
      for (let i = 0; i < 9; i++) { const b = HG.cyl(0.04, 0.09, 1.8 + rnd(), Mt.bark, -6 + i * 1.5, 0.9, (rnd() - 0.5) * 0.6, g, 5, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6); }
      const needles = new THREE.Mesh(buildBushGeometry(), new THREE.MeshStandardMaterial({ map: Tx.pine, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x6a5a40 }));
      needles.scale.set(3.5, 1.2, 1.4); needles.position.set(6.5, 0.4, 0); g.add(needles);
      HG.box(1.4, 1.3, 1.9, Mt.barkDead, -7.2, 0.65, 1.0, g); HG.box(1.4, 1.3, 1.9, Mt.barkDead, 7.2, 0.65, 1.0, g);
      g.position.set(64, world.terrainY(64, 112), 112.05);
      g.visible = false; scene.add(g); R.fallenTree = g;
    }

    // ===== lamps (bulb meshes; lights assigned from a pool) =====
    R.lampMeshes = world.lamps.map(L => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: L.color }));
      const y = L.level === 1 ? 0.1 : (L.level === 2 ? 5.0 : L.y);
      m.position.set(L.x, y, L.z);
      if (L.id !== 'genlamp' && L.id !== 'flood') { scene.add(m); const cord = HG.cyl(0.005, 0.005, 0.4, Mt.rubber, L.x, y + 0.22, L.z, scene, 3); }
      return m;
    });
    R.lampPool = [];
    for (let i = 0; i < (q === 'low' ? 3 : q === 'medium' ? 4 : 6); i++) {
      const l = new THREE.PointLight(0xffc48a, 0, 9, 2);
      scene.add(l); R.lampPool.push(l);
    }
    R.flood = new THREE.SpotLight(0xdfe8ff, 0, 40, 0.75, 0.6, 1.5);
    R.flood.position.set(98.4, 6.3, 25.8); R.flood.target.position.set(100, 0, 34); scene.add(R.flood); scene.add(R.flood.target);
    R.headlights = new THREE.SpotLight(0xfff0d0, 0, 35, 0.5, 0.5, 1.5);
    R.headlights.position.set(70.1, 1.0, 79.9); R.headlights.target.position.set(70, 0, 60); scene.add(R.headlights); scene.add(R.headlights.target);
    R.beaconLight = new THREE.PointLight(0xff2010, 0, 20, 2); R.beaconLight.position.set(64, 30.4, 12); scene.add(R.beaconLight);
    R.gateLight = new THREE.PointLight(0xff3020, 0, 14, 2); R.gateLight.position.set(61.5, 3.0, 114.2); scene.add(R.gateLight);
  };

  // ---------- tree / foliage geometry ----------
  function buildPineGeometry() {
    // unit-height spruce: rings of drooping branch cards around the trunk
    const b = new Batch(1); const r = mulberry32(17);
    const layers = 10;
    for (let L = 0; L < layers; L++) {
      const t = L / (layers - 1);
      const y = 0.02 + t * 0.92;
      const rad = (1 - t) * 0.5 + 0.06;
      const cards = 7;
      for (let k = 0; k < cards; k++) {
        const a = (k / cards) * Math.PI * 2 + r() * 0.5 + L * 0.7;
        const ca = Math.cos(a), sa = Math.sin(a);
        const width = rad * 0.55, droop = rad * 0.45;
        const px = -sa * width * 0.5, pz = ca * width * 0.5;
        const ox = ca * rad, oz = sa * rad;
        const inner = [0, y, 0], outer = [ox, y - droop, oz];
        // quad from trunk to tip, uv: u along length, v across
        b.quad([inner[0] - px, inner[1] + 0.02, inner[2] - pz], [outer[0] - px, outer[1], outer[2] - pz], [outer[0] + px, outer[1] + 0.03, outer[2] + pz], [inner[0] + px, inner[1] + 0.05, inner[2] + pz], [0, 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    g.setIndex(b.i);
    g.computeVertexNormals();
    // bias normals outward/up for softer foliage lighting
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) { const x = p.getX(i), z = p.getZ(i), l = Math.hypot(x, z) || 1; n.setXYZ(i, x / l * 0.6, 0.7, z / l * 0.6); }
    return g;
  }
  function buildDeadTreeGeometry() {
    const parts = [];
    const r = mulberry32(29);
    const addBranch = (x, y, z, len, rad, rx, rz, depth) => {
      const g = new THREE.CylinderGeometry(rad * 0.4, rad, len, 5, 1, true).translate(0, len / 2, 0);
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, r() * 6.28, rz));
      g.applyMatrix4(m); g.translate(x, y, z);
      parts.push(g);
      if (depth < 2) {
        const tip = new THREE.Vector3(0, len, 0).applyMatrix4(m);
        for (let i = 0; i < 2 + depth; i++) {
          const f = 0.45 + r() * 0.5;
          addBranch(x + tip.x * f, y + tip.y * f, z + tip.z * f, len * 0.45, rad * 0.45, rx + (r() - 0.5) * 1.6, rz + (r() - 0.5) * 1.6, depth + 1);
        }
      }
    };
    addBranch(0, 0, 0, 9, 0.28, 0, 0, 0);
    let n = 0; for (const g of parts) n += g.toNonIndexed().attributes.position.count;
    const P = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
    for (const g0 of parts) { const g = g0.toNonIndexed(); P.set(g.attributes.position.array, o * 3); U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.computeVertexNormals();
    return g;
  }
  function crossQuads(n, w, h) {
    const b = new Batch(1);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI, c = Math.cos(a) * w / 2, s = Math.sin(a) * w / 2;
      b.quad([-c, 0, -s], [c, 0, s], [c, h, s], [-c, h, -s], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.i);
    const nn = []; for (let i = 0; i < b.p.length / 3; i++) nn.push(0, 1, 0);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    return g;
  }
  function buildBushGeometry() {
    const b = new Batch(1); const r = mulberry32(3);
    for (let k = 0; k < 9; k++) {
      const a = r() * 6.28, e = (r() - 0.3) * 1.2, s = 0.5 + r() * 0.35;
      const cx = Math.cos(a) * 0.25, cz = Math.sin(a) * 0.25, cy = 0.45 + r() * 0.4;
      const ux = Math.cos(a + 1.57) * s, uz = Math.sin(a + 1.57) * s, vy = Math.cos(e) * s, vx = Math.sin(e) * Math.cos(a) * s, vz = Math.sin(e) * Math.sin(a) * s;
      b.quad([cx - ux - vx, cy - vy, cz - uz - vz], [cx + ux - vx, cy - vy, cz + uz - vz], [cx + ux + vx, cy + vy, cz + uz + vz], [cx - ux + vx, cy + vy, cz - uz + vz], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.i);
    const p = g.attributes.position, nn = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) - 0.5, z = p.getZ(i), l = Math.hypot(x, y, z) || 1; nn.push(x / l, y / l + 0.4, z / l); }
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    return g;
  }
  HG.buildBushGeometry = buildBushGeometry;

  // ---------- structures ----------
  function roofY(z) { return z < 59.5 ? 8.2 - (59.5 - z) * 0.556 : 8.2 - (z - 59.5) * 0.56; }
  HG.roofY = roofY;
  function buildStructures(R) {
    const world = R.world, scene = R.scene, Tx = R.T, Mt = R.M;
    const mat = {
      clap: new THREE.MeshStandardMaterial({ map: Tx.clap, roughness: 0.9 }),
      paper: new THREE.MeshStandardMaterial({ map: Tx.wallpaper, roughness: 0.92 }),
      boards: new THREE.MeshStandardMaterial({ map: Tx.boards, color: 0x9a8a78, roughness: 0.9 }),
      concrete: new THREE.MeshStandardMaterial({ map: Tx.concrete, color: 0x8a8680, roughness: 0.95 }),
      blocks: new THREE.MeshStandardMaterial({ map: Tx.blocks, color: 0x9a968e, roughness: 0.95 }),
      planks: new THREE.MeshStandardMaterial({ map: Tx.planks, color: 0x8a6a50, roughness: 0.8 }),
      plaster: new THREE.MeshStandardMaterial({ map: Tx.concrete, color: 0x8a847a, roughness: 0.95 }),
      shingles: new THREE.MeshStandardMaterial({ map: Tx.shingles, color: 0x7a7a74, roughness: 0.9 }),
      trim: new THREE.MeshStandardMaterial({ map: Tx.planks, color: 0x4a4038, roughness: 0.85 }),
      sigil: new THREE.MeshStandardMaterial({ map: Tx.sigil, color: 0x806a5a, roughness: 0.9 }),
    };
    R.structMat = mat;
    const B = {}; const batch = (k, s) => (B[k] = B[k] || new Batch(s || 0.5));
    const house = (x, z) => x > 52 && x < 72 && z > 54 && z < 68;
    // walls
    for (const w of world.walls) {
      const y0 = w.y0, y1 = w.y0 + w.h;
      const isH = (w.x1 - w.x0) > (w.z1 - w.z0);
      let outerMat = 'paper', innerMat = 'paper';
      switch (w.style) {
        case 'house': {
          const perim = w.level === 0 && (Math.abs(w.x0 - 52.35) < 0.01 || Math.abs(w.x0 - 71.35) < 0.01 || Math.abs(w.z0 - 54.35) < 0.01 || Math.abs(w.z0 - 67.35) < 0.01);
          outerMat = perim ? 'clap' : 'paper'; innerMat = 'paper';
          break;
        }
        case 'attic': case 'gable': outerMat = 'boards'; innerMat = 'boards'; break;
        case 'shed': outerMat = 'boards'; innerMat = 'boards'; break;
        case 'hut': outerMat = 'blocks'; innerMat = 'concrete'; break;
        case 'concrete': outerMat = w.level === 1 ? 'concrete' : 'blocks'; innerMat = 'concrete'; break;
        case 'fence': buildFence(R, w); continue;
        case 'rail': buildRail(R, w); continue;
      }
      // which side faces outward: away from the building's centre
      const bld = world.buildings.find(b => b.level === w.level && w.x0 >= b.x0 - 0.4 && w.x1 <= b.x1 + 0.4 && w.z0 >= b.z0 - 0.4 && w.z1 <= b.z1 + 0.4);
      const cx = bld ? (bld.x0 + bld.x1) / 2 : 62, cz = bld ? (bld.z0 + bld.z1) / 2 : 61;
      const mid = isH ? (w.z0 + w.z1) / 2 : (w.x0 + w.x1) / 2;
      const posOut = isH ? mid > cz : mid > cx;
      const fp = posOut ? outerMat : innerMat, fn = posOut ? innerMat : outerMat;
      if (isH) {
        batch(fp).box(w.x0, y0, w.z0, w.x1, y1, w.z1, { pz: 1 });
        batch(fn).box(w.x0, y0, w.z0, w.x1, y1, w.z1, { nz: 1 });
        batch('trim').box(w.x0, y0, w.z0, w.x1, y1, w.z1, { py: 1, px: 1, nx: 1 });
      } else {
        batch(fp).box(w.x0, y0, w.z0, w.x1, y1, w.z1, { px: 1 });
        batch(fn).box(w.x0, y0, w.z0, w.x1, y1, w.z1, { nx: 1 });
        batch('trim').box(w.x0, y0, w.z0, w.x1, y1, w.z1, { py: 1, pz: 1, nz: 1 });
      }
    }
    // openings: sills, headers, glass, boards
    R.doorModels = [];
    R.veils = [];
    const glassBatch = new Batch(1);
    for (const o of world.windows) {
      if (o.kind === 'thornline') { buildThorns(R, o); continue; }
      if (o.style === 'fence' || o.style === 'rail') { if (o.kind === 'veil') buildVeil(R, o, true); continue; }
      const floor = o.level === 0 ? (o.style === 'house' ? 0.5 : (o.style === 'shed' ? 0.12 : 0.1)) : HG.LEVEL_FLOOR[o.level];
      const y0 = o.y0, top = o.y0 + o.h;
      const wallMat = o.style === 'house' ? (house(o.x0, o.z0) && (o.level === 0) ? 'paper' : 'boards') : (o.style === 'shed' || o.style === 'attic' || o.style === 'gable' ? 'boards' : 'blocks');
      const header = (from) => { if (top > from + 0.02) batch(wallMat).box(o.x0, from, o.z0, o.x1, top, o.z1, { py: 1, ny: 1, px: 1, nx: 1, pz: 1, nz: 1 }); };
      const sill = (to) => batch(wallMat).box(o.x0, y0, o.z0, o.x1, to, o.z1, { py: 1, px: 1, nx: 1, pz: 1, nz: 1 });
      if (o.kind === 'window' || o.kind === 'broken') {
        const s1 = floor + (o.level === 2 ? 0.5 : 0.9), h1 = Math.min(top, floor + (o.level === 2 ? 1.5 : 2.1));
        sill(s1); header(h1);
        // frame
        batch('trim').box(o.x0 - (o.axis === 'h' ? 0 : 0.02), s1, o.z0 - (o.axis === 'h' ? 0.02 : 0), o.x1 + (o.axis === 'h' ? 0 : 0.02), s1 + 0.05, o.z1 + (o.axis === 'h' ? 0.02 : 0));
        const mx = (o.x0 + o.x1) / 2, mz = (o.z0 + o.z1) / 2;
        if (o.kind === 'window') {
          if (o.axis === 'h') glassBatch.quad([o.x0, s1, mz], [o.x1, s1, mz], [o.x1, h1, mz], [o.x0, h1, mz], [0, 0, 1]);
          else glassBatch.quad([mx, s1, o.z1], [mx, s1, o.z0], [mx, h1, o.z0], [mx, h1, o.z1], [1, 0, 0]);
          // muntins
          if (o.axis === 'h') { batch('trim').box(mx - 0.02, s1, mz - 0.03, mx + 0.02, h1, mz + 0.03); batch('trim').box(o.x0, (s1 + h1) / 2 - 0.02, mz - 0.03, o.x1, (s1 + h1) / 2 + 0.02, mz + 0.03); }
          else { batch('trim').box(mx - 0.03, s1, mz - 0.02, mx + 0.03, h1, mz + 0.02); batch('trim').box(mx - 0.03, (s1 + h1) / 2 - 0.02, o.z0, mx + 0.03, (s1 + h1) / 2 + 0.02, o.z1); }
        } else {
          // broken: jagged shards and one loose board
          const r = mulberry32(Math.floor(mx * 7 + mz));
          for (let k = 0; k < 5; k++) {
            const u = r(), up = r() < 0.5;
            const yb = up ? h1 : s1, len = 0.15 + r() * 0.3;
            if (o.axis === 'h') glassBatch.quad([o.x0 + u * 0.9, yb, mz], [o.x0 + u * 0.9 + 0.12, yb, mz], [o.x0 + u * 0.9 + 0.05, yb + (up ? -len : len), mz], [o.x0 + u * 0.9 + 0.05, yb + (up ? -len : len), mz], [0, 0, 1]);
            else glassBatch.quad([mx, yb, o.z0 + u * 0.9], [mx, yb, o.z0 + u * 0.9 + 0.12], [mx, yb + (up ? -len : len), o.z0 + u * 0.9 + 0.05], [mx, yb + (up ? -len : len), o.z0 + u * 0.9 + 0.05], [1, 0, 0]);
          }
          if (o.axis === 'h') batch('boards').box(o.x0 - 0.05, s1 + 0.6, mz + 0.06, o.x1 + 0.05, s1 + 0.75, mz + 0.1);
          else batch('boards').box(mx + 0.06, s1 + 0.6, o.z0 - 0.05, mx + 0.1, s1 + 0.75, o.z1 + 0.05);
        }
      } else if (o.kind === 'crawlgap') {
        // a sagging hole at the bottom of a wall
        header(floor + 0.75);
      } else if (o.kind === 'door' || o.kind === 'lockeddoor') {
        header(floor + 2.15);
        const d = o.door;
        const pivot = new THREE.Group();
        const dm = d.style === 'concrete' || d.style === 'hut' ? Mt.metalDark : Mt.woodDark;
        const panel = new THREE.Group(); pivot.add(panel);
        HG.box(0.95, 2.1, 0.05, dm, 0.475, 1.05, 0, panel);
        HG.box(0.75, 0.6, 0.02, d.style === 'house' ? Mt.wood : dm, 0.475, 1.5, 0.03, panel);
        HG.box(0.75, 0.6, 0.02, d.style === 'house' ? Mt.wood : dm, 0.475, 0.6, 0.03, panel);
        HG.cyl(0.03, 0.03, 0.04, Mt.metal, 0.85, 1.0, 0.05, panel, 6, Math.PI / 2);
        HG.cyl(0.03, 0.03, 0.04, Mt.metal, 0.85, 1.0, -0.05, panel, 6, Math.PI / 2);
        if (o.axis === 'h') { pivot.position.set(o.x0 + 0.02, floor, (o.z0 + o.z1) / 2); pivot.rotation.y = 0; }
        else { pivot.position.set((o.x0 + o.x1) / 2, floor, o.z0 + 0.02); pivot.rotation.y = -Math.PI / 2; }
        scene.add(pivot);
        R.doorModels.push({ door: d, pivot, base: pivot.rotation.y, angle: 0 });
        // frame trim
        if (o.axis === 'h') { batch('trim').box(o.x0 - 0.06, floor, o.z0 - 0.03, o.x0, floor + 2.2, o.z1 + 0.03); batch('trim').box(o.x1, floor, o.z0 - 0.03, o.x1 + 0.06, floor + 2.2, o.z1 + 0.03); }
        else { batch('trim').box(o.x0 - 0.03, floor, o.z0 - 0.06, o.x1 + 0.03, floor + 2.2, o.z0); batch('trim').box(o.x0 - 0.03, floor, o.z1, o.x1 + 0.03, floor + 2.2, o.z1 + 0.06); }
      } else if (o.kind === 'arch') {
        header(floor + 2.3);
      } else if (o.kind === 'veil') {
        header(floor + 2.15);
        buildVeil(R, o, false, floor);
      }
    }
    for (const k in B) scene.add(B[k].mesh(mat[k]));
    const glass = glassBatch.mesh(new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), false);
    scene.add(glass);

    // floors and ceilings
    const F = {}; const fb = (k) => (F[k] = F[k] || new Batch(0.5));
    for (const b of world.buildings) {
      const l = b.level;
      const fmat = b.surf === 'wood' ? 'planks' : 'concrete';
      for (let z = Math.floor(b.z0); z < Math.ceil(b.z1); z++) for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) {
        const x0 = Math.max(x, b.x0), x1 = Math.min(x + 1, b.x1), z0 = Math.max(z, b.z0), z1 = Math.min(z + 1, b.z1);
        if (x1 <= x0 || z1 <= z0) continue;
        const sr = world.stairRef[z * W + x];
        const st = sr >= 0 ? world.stairs[sr] : null;
        // floor holes: basement stairwell in the ground floor, attic stairwell in the attic floor
        const hole = st && ((b.id === 1 && st.B === 1) || (b.id === 20 && st.B === 2));
        if (!hole) fb(fmat).quad([x0, b.floorY, z1], [x1, b.floorY, z1], [x1, b.floorY, z0], [x0, b.floorY, z0], [0, 1, 0]);
        if (b.porch) continue;
        // ceiling
        let cy = b.floorY + (b.ceil || 3);
        if (b.id === 1) cy = 3.4;
        if (b.id === 20) continue; // attic ceiling is the roof
        const chole = st && ((b.id === 1 && st.B === 2) || (b.id === 10 && st.B === 1));
        if (!chole) fb(b.id === 10 ? 'planks' : 'plaster').quad([x0, cy, z0], [x1, cy, z0], [x1, cy, z1], [x0, cy, z1], [0, -1, 0]);
      }
      // foundation skirt for raised buildings
      if (l === 0 && b.floorY > 0.2 && !b.porch) fb('stone').box(b.x0 - 0.1, -0.6, b.z0 - 0.1, b.x1 + 0.1, b.floorY - 0.01, b.z1 + 0.1, { px: 1, nx: 1, pz: 1, nz: 1, py: 0 });
    }
    // slab edges around the basement opening
    mat.stone = Mt.stone;
    for (const k in F) scene.add(F[k].mesh(mat[k] || Mt.stone));

    // stairs
    for (const st of world.stairs) {
      const g = new Batch(0.5);
      const steps = 14;
      const ymin = Math.min(st.yA, st.yB);
      for (let i = 0; i < steps; i++) {
        const za = 60 - i * 4 / steps, zb = za - 4 / steps;
        const top = lerp(st.yA, st.yB, (i + 1) / steps);
        g.box(st.x + 0.05, ymin, zb, st.x + 0.95, top, za, { py: 1, pz: 1, nz: 1, px: 1, nx: 1 });
      }
      g.box(st.x - 0.01, Math.min(st.yA, st.yB), 56, st.x + 0.05, Math.max(st.yA, st.yB), 60, { px: 1, nx: 1, py: 1 });
      g.box(st.x + 0.95, Math.min(st.yA, st.yB), 56, st.x + 1.01, Math.max(st.yA, st.yB), 60, { px: 1, nx: 1, py: 1 });
      scene.add(g.mesh(mat.planks));
    }

    // roof (saltbox) over the house
    {
      const sh = new Batch(0.35), under = new Batch(0.5), gable = new Batch(0.5), gableIn = new Batch(0.5);
      const xa = 51.7, xb = 72.3, zr = 59.5, yr = 8.2, zn = 53.9, zs = 68.2;
      const yn = roofY(zn), ys = roofY(zs);
      // outer surfaces (normals up-ish)
      const ln = Math.hypot(zr - zn, yr - yn), ls = Math.hypot(zs - zr, yr - ys);
      sh.quad([xa, yn, zn], [xa, yr, zr], [xb, yr, zr], [xb, yn, zn], [0, (zr - zn) / ln, -(yr - yn) / ln], [[0, 0], [0, ln], [20.6, ln], [20.6, 0]].map(([u, v]) => [u * 0.35, v * 0.35]));
      sh.quad([xb, ys, zs], [xb, yr, zr], [xa, yr, zr], [xa, ys, zs], [0, (zs - zr) / ls, (yr - ys) / ls], [[0, 0], [0, ls], [20.6, ls], [20.6, 0]].map(([u, v]) => [u * 0.35, v * 0.35]));
      // underside (attic ceiling)
      const o = 0.15;
      under.quad([xb, yn - o, zn], [xb, yr - o, zr], [xa, yr - o, zr], [xa, yn - o, zn], [0, -(zr - zn) / ln, (yr - yn) / ln]);
      under.quad([xa, ys - o, zs], [xa, yr - o, zr], [xb, yr - o, zr], [xb, ys - o, zs], [0, -(zs - zr) / ls, -(yr - ys) / ls]);
      // gables (outer clapboard + inner boards) from wall top 3.5 to the roof line
      for (const [x, nx] of [[52.35, -1], [71.65, 1]]) {
        const pts = [[54.35, 3.5], [54.35, roofY(54.35)], [zr, yr - 0.1], [67.65, roofY(67.65)], [67.65, 3.5]];
        // fan triangulation as quads (degenerate last vertex)
        const xo = x + nx * 0.15, xi = x - nx * 0.15;
        for (let k = 1; k < pts.length - 1; k++) {
          const a = pts[0], b2 = pts[k], c = pts[k + 1];
          const A = [xo, a[1], a[0]], Bv = [xo, b2[1], b2[0]], Cv = [xo, c[1], c[0]];
          if (nx < 0) gable.quad(A, Bv, Cv, Cv, [-1, 0, 0]); else gable.quad(Cv, Bv, A, A, [1, 0, 0]);
          const Ai = [xi, a[1], a[0]], Bi = [xi, b2[1], b2[0]], Ci = [xi, c[1], c[0]];
          if (nx < 0) gableIn.quad(Ci, Bi, Ai, Ai, [1, 0, 0]); else gableIn.quad(Ai, Bi, Ci, Ci, [-1, 0, 0]);
        }
      }
      scene.add(sh.mesh(mat.shingles)); scene.add(under.mesh(mat.boards, false)); scene.add(gable.mesh(mat.clap)); scene.add(gableIn.mesh(mat.boards, false));
      // chimney
      const ch = new Batch(0.5); ch.box(52.7, 0, 63.3, 53.6, 9.0, 64.7); scene.add(ch.mesh(Mt.stone));
      // porch roof and posts
      const pr = new Batch(0.35); pr.quad([56.2, 2.8, 70.8], [66.8, 2.8, 70.8], [66.8, 3.3, 67.6], [56.2, 3.3, 67.6], [0, 0.99, 0.15]); scene.add(pr.mesh(mat.shingles));
      for (const px of [56.4, 66.6]) HG.box(0.14, 2.4, 0.14, mat.trim, px, 0.45 + 1.2, 70.6, scene);
      // attic gable windows (glass)
      // shed roof
      const sr = new Batch(0.35); sr.quad([29.9, 2.6, 45.9], [37.1, 2.6, 45.9], [37.1, 3.2, 39.9], [29.9, 3.2, 39.9], [0, 0.99, 0.1]); sr.quad([29.9, 3.18, 39.9], [37.1, 3.18, 39.9], [37.1, 2.58, 45.9], [29.9, 2.58, 45.9], [0, -0.99, -0.1]); scene.add(sr.mesh(Mt.metal));
      // flat roofs
      const fr = new Batch(0.5); fr.box(99.2, 2.6, 31.2, 104.8, 2.75, 35.8); fr.box(20.2, 3.0, 82.2, 28.8, 3.2, 88.8); scene.add(fr.mesh(mat.concrete));
      // road
      const rd = new Batch(0.25); scene.add(rd.mesh(mat.concrete));
    }
  }

  function buildFence(R, w) {
    const isH = (w.x1 - w.x0) > (w.z1 - w.z0);
    const len = isH ? w.x1 - w.x0 : w.z1 - w.z0;
    const y = R.world.terrainY((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2);
    const g = new THREE.PlaneGeometry(len, w.h);
    const tex = R.M.chain;
    const m = new THREE.Mesh(g, tex.clone());
    m.material.map = R.T.chain.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(len * 2.5, w.h * 2.5);
    m.position.set((w.x0 + w.x1) / 2, y + w.h / 2, (w.z0 + w.z1) / 2);
    if (!isH) m.rotation.y = Math.PI / 2;
    m.castShadow = true;
    R.scene.add(m);
    for (let t = 0; t <= len; t += 3) {
      const px = isH ? w.x0 + t : (w.x0 + w.x1) / 2, pz = isH ? (w.z0 + w.z1) / 2 : w.z0 + t;
      HG.cyl(0.04, 0.04, w.h + 0.1, R.M.metal, px, R.world.terrainY(px, pz) + w.h / 2, pz, R.scene, 6);
    }
  }
  function buildRail(R, w) {
    const isH = (w.x1 - w.x0) > (w.z1 - w.z0);
    const len = isH ? w.x1 - w.x0 : w.z1 - w.z0;
    const y = w.y0;
    const mx = (w.x0 + w.x1) / 2, mz = (w.z0 + w.z1) / 2;
    HG.box(isH ? len : 0.08, 0.06, isH ? 0.08 : len, R.M.woodDark, mx, y + 1.0, mz, R.scene);
    HG.box(isH ? len : 0.05, 0.05, isH ? 0.05 : len, R.M.woodDark, mx, y + 0.5, mz, R.scene);
    for (let t = 0; t <= len + 0.01; t += 0.5) {
      const px = isH ? w.x0 + t : mx, pz = isH ? mz : w.z0 + t;
      HG.box(0.05, 1.0, 0.05, R.M.woodDark, px, y + 0.5, pz, R.scene);
    }
  }
  function buildVeil(R, o, fence, floor) {
    const y = floor !== undefined ? floor : (o.level === 0 ? R.world.terrainY(o.cx + 0.5, o.cz + 0.5) : HG.LEVEL_FLOOR[o.level]);
    const g = new THREE.Group();
    const r = mulberry32(o.cx * 31 + o.cz);
    for (let i = 0; i < 6; i++) HG.box(1.15, 0.22, 0.05, R.structMat.sigil, 0, 0.25 + i * 0.36 + (r() - 0.5) * 0.06, (r() - 0.5) * 0.04, g, 0, 0, (r() - 0.5) * 0.25);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0), new THREE.MeshBasicMaterial({ map: R.T.sigilGlow, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xff5030 }));
    glow.position.set(0, 1.1, 0.04); g.add(glow);
    g.position.set(o.cx + 0.5, y, o.cz + 0.5);
    if (o.axis === 'v') g.rotation.y = Math.PI / 2;
    R.scene.add(g);
    R.veils.push({ glow, x: o.cx + 0.5, z: o.cz + 0.5, level: o.level });
  }
  function buildThorns(R, o) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: R.T.thorn, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x553838, roughness: 0.6, emissive: 0x120202 });
    const r = mulberry32(o.cells.length * 7 + o.cells[0][0]);
    for (const [cx, cz] of o.cells) {
      for (let k = 0; k < 3; k++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), mat);
        const x = cx + 0.5 + (r() - 0.5) * 0.4, z = cz + 0.5 + (r() - 0.5) * 0.4;
        p.position.set(x, R.world.terrainY(x, z) + 1.1, z);
        p.rotation.y = r() * Math.PI;
        g.add(p);
      }
    }
    R.scene.add(g);
    for (const [cx, cz] of o.cells) if (r() < 0.25) R.veils.push({ glow: null, x: cx + 0.5, z: cz + 0.5, level: 0, thorn: true });
  }
})(typeof window !== 'undefined' ? window : globalThis);
