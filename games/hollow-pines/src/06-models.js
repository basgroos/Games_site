/* Hollow Pines — procedural models: props, survivors, the creature. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { mulberry32, clamp, lerp } = HG.util;

  // ---------- materials ----------
  const M = {};
  HG.makeMaterials = function (T) {
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
    M.woodDark = std({ map: T.planks, color: 0x6a5240, roughness: 0.8 });
    M.wood = std({ map: T.planks, color: 0x9a7a5a, roughness: 0.75 });
    M.boards = std({ map: T.boards, color: 0x8a8070 });
    M.fabric = std({ map: T.fabric, color: 0x8a6a60, roughness: 0.95 });
    M.fabricBlue = std({ map: T.fabric, color: 0x4a5866, roughness: 0.95 });
    M.sheet = std({ map: T.sheet, color: 0xb8b0a0, roughness: 0.95 });
    M.metal = std({ map: T.metal, color: 0x9a9a9a, roughness: 0.6, metalness: 0.5 });
    M.metalDark = std({ map: T.metal, color: 0x555a5e, roughness: 0.55, metalness: 0.6 });
    M.paintRed = std({ map: T.metal, color: 0x7a2018, roughness: 0.55, metalness: 0.3 });
    M.paintGreen = std({ map: T.metal, color: 0x3a4a34, roughness: 0.6, metalness: 0.3 });
    M.paintYellow = std({ map: T.metal, color: 0x8a6a18, roughness: 0.6, metalness: 0.3 });
    M.truck = std({ map: T.metal, color: 0x3b4a52, roughness: 0.5, metalness: 0.5 });
    M.white = std({ map: T.concrete, color: 0xb8b4aa, roughness: 0.4, metalness: 0.1 });
    M.concrete = std({ map: T.concrete, color: 0x9a9690 });
    M.stone = std({ map: T.concrete, color: 0x6a665e, roughness: 0.95 });
    M.rubber = std({ color: 0x141414, roughness: 0.9 });
    M.glass = new THREE.MeshStandardMaterial({ color: 0x0a0e12, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.55 });
    M.cardboard = std({ map: T.boards, color: 0x8a7050, roughness: 0.95 });
    M.ceramic = std({ color: 0xa8a49a, roughness: 0.3 });
    M.bulb = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    M.redLamp = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
    M.chain = new THREE.MeshStandardMaterial({ map: T.chain, color: 0x9a9a96, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
    M.bark = std({ map: T.bark, color: 0x9a8a7a, roughness: 0.95 });
    M.barkDead = std({ map: T.barkDead, color: 0xa09890, roughness: 0.95 });
    M.blood = std({ color: 0x2a0606, roughness: 0.3 });
    M.skinTone = [0xc89a7c, 0x8a5a3c, 0xe0b898, 0x5a3a28, 0xb88a6a, 0xd0a888].map(c => std({ color: c, roughness: 0.6 }));
    M.denim = std({ map: T.fabric, color: 0x2a3038, roughness: 0.9 });
    M.boot = std({ color: 0x1e1812, roughness: 0.8 });
    M.hair = [0x1a120c, 0x3a2a1a, 0x0a0a0a, 0x6a4a2a, 0x2a1a10, 0x1a1a1a].map(c => std({ color: c, roughness: 0.7 }));
    M.flashlight = std({ color: 0x222222, roughness: 0.4, metalness: 0.7 });
    M.lens = new THREE.MeshBasicMaterial({ color: 0xfff2d0 });
    M.monster = std({ map: T.skin, color: 0x3a312d, roughness: 0.78, metalness: 0 });
    M.monsterEye = new THREE.MeshBasicMaterial({ color: 0xe8f0d8, transparent: true, opacity: 0 });
    M.item = std({ color: 0x8a1a12, roughness: 0.5, metalness: 0.3, emissive: 0x200000 });
    M.paper = std({ color: 0xd8d0b8, roughness: 0.9 });
    return M;
  };
  HG.MAT = M;

  // ---------- helpers ----------
  function box(w, h, d, mat, x, y, z, parent, rx, ry, rz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg, rx, rz) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx || rz) m.rotation.set(rx || 0, 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  HG.box = box; HG.cyl = cyl;

  // ---------- props ----------
  HG.buildProp = function (p) {
    const g = new THREE.Group();
    const w = p.w, d = p.d, h = p.h;
    switch (p.model) {
      case 'sofa': box(w, 0.45, d, M.fabric, 0, 0.22, 0, g); box(w, 0.5, 0.22, M.fabric, 0, 0.62, -d / 2 + 0.11, g); box(0.2, 0.3, d, M.fabric, -w / 2 + 0.1, 0.55, 0, g); box(0.2, 0.3, d, M.fabric, w / 2 - 0.1, 0.55, 0, g); box(w * 0.9, 0.06, d * 0.7, M.sheet, 0, 0.47, 0.05, g, 0.05); break;
      case 'armchair': box(w, 0.42, d, M.fabricBlue, 0, 0.21, 0, g); box(w, 0.6, 0.2, M.fabricBlue, 0, 0.7, -d / 2 + 0.1, g); box(0.16, 0.25, d, M.fabricBlue, -w / 2 + 0.08, 0.53, 0, g); box(0.16, 0.25, d, M.fabricBlue, w / 2 - 0.08, 0.53, 0, g); break;
      case 'table': case 'table_low': box(w, 0.05, d, M.woodDark, 0, h - 0.025, 0, g); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.06, h - 0.05, 0.06, M.woodDark, sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06), g); if (p.model === 'table') { box(0.3, 0.02, 0.22, M.paper, 0.2, h + 0.01, 0.1, g, 0, 0.4); cyl(0.04, 0.04, 0.1, M.ceramic, -0.4, h + 0.05, -0.2, g); } break;
      case 'chair': box(w, 0.04, d, M.woodDark, 0, 0.45, 0, g); box(w, 0.45, 0.04, M.woodDark, 0, 0.7, -d / 2, g); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.04, 0.45, 0.04, M.woodDark, sx * (w / 2 - 0.03), 0.225, sz * (d / 2 - 0.03), g); break;
      case 'counter': box(w, 0.88, d, M.wood, 0, 0.44, 0, g); box(w + 0.04, 0.04, d + 0.04, M.ceramic, 0, 0.9, 0, g); break;
      case 'stove': box(w, 0.9, d, M.white, 0, 0.45, 0, g); for (let i = 0; i < 4; i++) cyl(0.09, 0.09, 0.02, M.metalDark, (i % 2 - 0.5) * 0.36, 0.91, (Math.floor(i / 2) - 0.5) * 0.3, g); break;
      case 'fridge': box(w, h, d, M.white, 0, h / 2, 0, g); box(0.03, 0.4, 0.04, M.metal, w / 2 - 0.08, h * 0.65, d / 2 + 0.02, g); break;
      case 'fireplace': box(w, h, d, M.stone, 0, h / 2, 0, g); box(w + 0.1, 0.08, d + 0.2, M.woodDark, 0, h, 0, g); box(w * 0.4, h * 0.45, d * 0.55, M.rubber, w * 0.31, h * 0.25, 0, g); break;
      case 'rug': { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.fabric); m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.receiveShadow = true; g.add(m); break; }
      case 'bed': box(w, 0.32, d, M.woodDark, 0, 0.16, 0, g); box(w * 0.96, 0.18, d * 0.96, M.sheet, 0, 0.41, 0, g); box(w, 0.9, 0.08, M.woodDark, 0, 0.45, -d / 2, g); box(w * 0.5, 0.12, 0.35, M.sheet, 0, 0.55, -d / 2 + 0.3, g); box(w * 0.98, 0.04, d * 0.6, M.fabric, 0, 0.52, 0.3, g, 0.03); break;
      case 'shelf': case 'rack': { box(w, 0.04, d, M.woodDark, 0, h, 0, g); for (let i = 0; i < 4; i++) box(w, 0.03, d, M.woodDark, 0, 0.1 + i * (h / 4), 0, g); box(0.04, h, d, M.woodDark, -w / 2, h / 2, 0, g); box(0.04, h, d, M.woodDark, w / 2, h / 2, 0, g); const r = mulberry32(Math.floor(p.x * 10)); for (let i = 0; i < 7; i++) box(0.12 + r() * 0.2, 0.12 + r() * 0.25, 0.15 + r() * 0.15, r() < 0.5 ? M.cardboard : M.metalDark, (r() - 0.5) * w * 0.7, 0.2 + Math.floor(r() * 4) * (h / 4), (r() - 0.5) * d * 0.4, g); break; }
      case 'boxes': { const r = mulberry32(Math.floor(p.x * 13 + p.z)); for (let i = 0; i < 4; i++) { const s = 0.35 + r() * 0.25; box(s, s * 0.8, s, M.cardboard, (r() - 0.5) * (w - s), s * 0.4 + (i > 2 ? 0.45 : 0), (r() - 0.5) * (d - s), g, 0, r() * 0.6); } break; }
      case 'boiler': cyl(0.45, 0.45, h, M.metalDark, 0, h / 2, 0, g, 14); cyl(0.06, 0.06, 1.2, M.metal, 0.3, h + 0.4, 0, g); box(0.25, 0.2, 0.1, M.paintRed, 0, 0.9, 0.46, g); break;
      case 'workbench': box(w, 0.06, d, M.woodDark, 0, 0.87, 0, g); box(w, 0.04, d, M.woodDark, 0, 0.3, 0, g); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.07, 0.85, 0.07, M.woodDark, sx * (w / 2 - 0.05), 0.42, sz * (d / 2 - 0.05), g); box(0.4, 0.15, 0.2, M.paintRed, 0.2, 0.97, 0, g); cyl(0.03, 0.03, 0.3, M.metal, -0.3, 0.92, 0.1, g, 6, 0, 1.5); break;
      case 'trunk': box(w, h * 0.8, d, M.woodDark, 0, h * 0.4, 0, g); box(w + 0.02, h * 0.2, d + 0.02, M.wood, 0, h * 0.9, 0, g); box(0.05, h * 0.3, d + 0.04, M.metal, -w * 0.3, h * 0.5, 0, g); box(0.05, h * 0.3, d + 0.04, M.metal, w * 0.3, h * 0.5, 0, g); break;
      case 'mannequin': { const s = new THREE.Mesh(new THREE.ConeGeometry(0.32, h, 9, 1, true), M.sheet); s.position.y = h / 2; s.castShadow = true; g.add(s); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M.sheet); hd.position.y = h + 0.05; hd.scale.set(1, 1.2, 1); g.add(hd); break; }
      case 'crib': for (let i = -3; i <= 3; i++) { box(0.025, 0.7, 0.025, M.woodDark, i * w / 7, 0.55, -d / 2, g); box(0.025, 0.7, 0.025, M.woodDark, i * w / 7, 0.55, d / 2, g); } box(w, 0.04, d, M.woodDark, 0, 0.9, -d / 2, g); box(w, 0.04, d, M.woodDark, 0, 0.9, d / 2, g); box(w, 0.08, d, M.sheet, 0, 0.3, 0, g); for (const sx of [-1, 1]) box(0.04, 0.9, 0.04, M.woodDark, sx * w / 2, 0.45, -d / 2, g), box(0.04, 0.9, 0.04, M.woodDark, sx * w / 2, 0.45, d / 2, g); break;
      case 'fuel_drum': cyl(0.3, 0.3, 0.9, M.paintRed, 0, 0.45, 0, g, 14); break;
      case 'lamp_post': cyl(0.06, 0.08, 3, M.metalDark, 0, 1.5, 0, g, 8); box(0.6, 0.05, 0.05, M.metalDark, 0.3, 2.95, 0, g); { const b = cyl(0.12, 0.2, 0.15, M.metalDark, 0.6, 2.88, 0, g); const bl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.bulb); bl.position.set(0.6, 2.8, 0); g.add(bl); g.userData.bulb = bl; } break;
      case 'tower': {
        const legs = [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]];
        for (const [x, z] of legs) { const m = cyl(0.08, 0.12, h, M.metal, x * 0.6, h / 2, z * 0.6, g, 6); m.rotation.set(z * 0.035, 0, -x * 0.035); }
        for (let y = 2; y < h; y += 2.4) { const sc = 1 - y / h * 0.6; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const m = box(3.2 * sc, 0.06, 0.06, M.metal, Math.cos(a) * 1.6 * sc, y, Math.sin(a) * 1.6 * sc, g, 0, a + Math.PI / 2, 0.5); m.castShadow = false; } }
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M.redLamp); top.position.y = h + 0.2; g.add(top); g.userData.beacon = top;
        box(0.7, 0.4, 0.4, M.metalDark, 0, h * 0.75, 0.3, g);
        break;
      }
      case 'flood_pole': cyl(0.1, 0.14, h, M.metalDark, 0, h / 2, 0, g, 8); box(0.9, 0.4, 0.3, M.metalDark, 0.2, h, 0.3, g, -0.4); { const l = box(0.8, 0.3, 0.02, M.bulb, 0.2, h - 0.08, 0.47, g, -0.4); l.material = l.material.clone(); g.userData.lens = l; } break;
      case 'gate': break; // built dynamically
      case 'road_sign': cyl(0.03, 0.03, 2.2, M.metal, 0, 1.1, 0, g, 6); box(0.7, 0.5, 0.03, M.paintYellow, 0, 2.0, 0, g); break;
      case 'mailbox': cyl(0.04, 0.04, 1.1, M.woodDark, 0, 0.55, 0, g, 6); box(0.25, 0.25, 0.45, M.metal, 0, 1.15, 0, g); box(0.02, 0.15, 0.1, M.paintRed, 0.14, 1.25, 0.1, g); break;
      case 'wheelbarrow': box(0.6, 0.3, 0.9, M.metal, 0, 0.45, 0, g, 0.1); cyl(0.17, 0.17, 0.08, M.rubber, 0, 0.17, 0.55, g, 10, 0, Math.PI / 2); box(0.04, 0.04, 0.8, M.woodDark, -0.25, 0.5, -0.5, g); box(0.04, 0.04, 0.8, M.woodDark, 0.25, 0.5, -0.5, g); break;
      case 'woodpile': for (let i = 0; i < 18; i++) { const r = mulberry32(i + 5); const m = cyl(0.11, 0.11, w, M.barkDead, 0, 0.12 + Math.floor(i / 6) * 0.22, (i % 6 - 2.5) * 0.23 * (d / 1.4), g, 7, 0, Math.PI / 2); m.rotation.y = (r() - 0.5) * 0.2; } break;
      case 'car_wreck': box(w, 0.7, d, M.metal, 0, 0.55, 0, g, 0.03, 0, 0.06); box(w * 0.9, 0.5, d * 0.45, M.metal, 0, 1.1, -0.2, g, 0.03, 0, 0.06); for (const [sx, sz] of [[-1, -1], [1, 1]]) cyl(0.3, 0.3, 0.2, M.rubber, sx * w / 2, 0.25, sz * d * 0.32, g, 10, 0, Math.PI / 2); break;
      case 'swing': cyl(0.05, 0.05, h, M.woodDark, -w / 2, h / 2, 0, g, 6, 0, 0.12); cyl(0.05, 0.05, h, M.woodDark, w / 2, h / 2, 0, g, 6, 0, -0.12); box(w, 0.08, 0.08, M.woodDark, 0, h, 0, g); { const seat = new THREE.Group(); seat.position.y = h; g.add(seat); cyl(0.008, 0.008, 1.6, M.metal, -0.22, -0.8, 0, seat, 4); cyl(0.008, 0.008, 1.6, M.metal, 0.22, -0.8, 0, seat, 4); box(0.5, 0.04, 0.2, M.woodDark, 0, -1.6, 0, seat); g.userData.swing = seat; } break;
      case 'well': cyl(0.7, 0.75, 0.8, M.stone, 0, 0.4, 0, g, 14); { const c = cyl(0.62, 0.62, 0.05, M.rubber, 0, 0.78, 0, g, 14); } box(0.08, 1.6, 0.08, M.woodDark, -0.65, 1.1, 0, g); box(0.08, 1.6, 0.08, M.woodDark, 0.65, 1.1, 0, g); box(1.5, 0.1, 0.9, M.woodDark, 0, 1.95, 0, g, 0, 0, 0); break;
      case 'scarecrow': cyl(0.04, 0.04, 2.2, M.woodDark, 0, 1.1, 0, g, 6); box(1.3, 0.05, 0.05, M.woodDark, 0, 1.6, 0, g); box(0.45, 0.65, 0.25, M.sheet, 0, 1.4, 0, g); { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.cardboard); hd.position.y = 1.95; hd.scale.set(1, 1.25, 1); hd.rotation.z = 0.3; g.add(hd); } cyl(0.2, 0.25, 0.08, M.boot, 0.02, 2.13, 0, g, 10); break;
      case 'sideboard': case 'desk': case 'dresser': case 'nightstand': case 'cabinet':
        box(w, h, d, M.woodDark, 0, h / 2, 0, g);
        for (let i = 0; i < Math.max(1, Math.round(h / 0.32)); i++) { box(w * 0.9, h / Math.max(1, Math.round(h / 0.32)) - 0.04, 0.02, M.wood, 0, 0.18 + i * (h / Math.max(1, Math.round(h / 0.32))), d / 2 + 0.01, g); box(0.1, 0.02, 0.03, M.metal, 0, 0.2 + i * (h / Math.max(1, Math.round(h / 0.32))) + 0.08, d / 2 + 0.03, g); }
        if (p.model === 'desk') { box(0.25, 0.3, 0.2, M.metalDark, w * 0.3, h + 0.15, 0, g); box(0.3, 0.02, 0.22, M.paper, -0.2, h + 0.01, 0.05, g, 0, 0.3); }
        break;
      case 'toolbox': box(w, h * 0.6, d, M.paintRed, 0, h * 0.3, 0, g); box(w * 0.9, 0.04, d * 0.9, M.metalDark, 0, h * 0.62, 0, g); break;
      case 'backpack': box(0.35, 0.45, 0.22, M.fabricBlue, 0, 0.2, 0, g, 0.5, 0.3, 0.6); break;
      case 'cooler': box(0.6, 0.38, 0.38, M.white, 0, 0.19, 0, g, 0, 0, 0.12); break;
      case 'tent': { const m = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.1, 4, 1, true), M.fabric); m.position.y = 0.4; m.rotation.set(0.5, Math.PI / 4, 0.3); m.material = M.fabric; m.castShadow = true; g.add(m); break; }
      case 'deerstand': for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) cyl(0.05, 0.06, 3.2, M.woodDark, x, 1.6, z, g, 6); box(1.5, 0.06, 1.5, M.woodDark, 0, 3.2, 0, g); box(1.5, 0.6, 0.05, M.woodDark, 0, 3.5, 0.72, g); for (let y = 0.4; y < 3.2; y += 0.4) box(0.6, 0.04, 0.04, M.woodDark, 0, y, -0.72, g); break;
      case 'generator': break;
      case 'none': break;
      default: box(w, h, d, M.woodDark, 0, h / 2, 0, g);
    }
    return g;
  };

  // ---------- survivor ----------
  HG.buildSurvivor = function (s, idx) {
    const root = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ map: HG.TEX.fabric, color: s.color, roughness: 0.85 });
    const skin = M.skinTone[idx % M.skinTone.length];
    const hairM = M.hair[idx % M.hair.length];
    const J = {};
    const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips); J.hips = hips;
    const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.1, 4, 8), M.denim); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1.2, 0.8); hips.add(pelvis);
    const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine); J.spine = spine;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 10), jacket); torso.position.y = 0.27; torso.scale.set(1.1, 1, 0.7); spine.add(torso);
    const neck = new THREE.Group(); neck.position.y = 0.56; spine.add(neck); J.neck = neck;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), skin); head.position.y = 0.13; head.scale.set(0.92, 1.12, 1); neck.add(head); J.head = head;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.113, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM); hair.position.set(0, 0.16, 0.012); hair.rotation.x = 0.35; hair.scale.set(0.95, 1.1, 1.02); neck.add(hair);
    const eyeM = M.rubber;
    for (const ex of [-0.035, 0.035]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), eyeM); e.position.set(ex, 0.15, -0.095); neck.add(e); }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.03), skin); nose.position.set(0, 0.12, -0.105); neck.add(nose);
    const limb = (parent, x, y, r, len, mat) => {
      const j = new THREE.Group(); j.position.set(x, y, 0); parent.add(j);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), mat); m.position.y = -len / 2 - r * 0.5; j.add(m);
      const end = new THREE.Group(); end.position.y = -len - r; j.add(end);
      m.castShadow = true;
      return { j, end };
    };
    const uaL = limb(spine, -0.22, 0.48, 0.055, 0.24, jacket), uaR = limb(spine, 0.22, 0.48, 0.055, 0.24, jacket);
    const faL = limb(uaL.end, 0, 0, 0.045, 0.22, jacket), faR = limb(uaR.end, 0, 0, 0.045, 0.22, jacket);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin); handL.position.y = -0.03; faL.end.add(handL);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin); handR.position.y = -0.03; faR.end.add(handR);
    // flashlight in the right hand
    const fl = new THREE.Group(); fl.position.set(0, -0.04, 0.02); faR.end.add(fl);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.2, 8), M.flashlight); body.rotation.x = Math.PI / 2; body.position.z = 0.06; fl.add(body);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 10), M.lens.clone()); lens.position.z = 0.161; fl.add(lens);
    J.flash = fl; J.lens = lens;
    const thL = limb(hips, -0.1, -0.02, 0.07, 0.34, M.denim), thR = limb(hips, 0.1, -0.02, 0.07, 0.34, M.denim);
    const shL = limb(thL.end, 0, 0, 0.055, 0.34, M.denim), shR = limb(thR.end, 0, 0, 0.055, 0.34, M.denim);
    const footL = box(0.1, 0.07, 0.24, M.boot, 0, -0.02, -0.05, shL.end), footR = box(0.1, 0.07, 0.24, M.boot, 0, -0.02, -0.05, shR.end);
    Object.assign(J, { uaL: uaL.j, uaR: uaR.j, faL: faL.j, faR: faR.j, thL: thL.j, thR: thR.j, shL: shL.j, shR: shR.j });
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.userData.J = J; root.userData.phase = 0;
    return root;
  };
  HG.animateSurvivor = function (model, s, dt, t) {
    const J = model.userData.J;
    const sp = s.speed || 0;
    const run = s.sprinting && sp > 3.2;
    model.userData.phase += dt * (sp * (run ? 2.0 : 2.6) + 0.0001);
    const ph = model.userData.phase;
    const amp = clamp(sp / 3, 0, 1) * (run ? 0.85 : 0.55);
    const crouch = s.crouching || (s.interact && s.interact.kind === 'search') ? 1 : 0;
    model.userData.crouch = lerp(model.userData.crouch || 0, crouch, Math.min(1, dt * 8));
    const cr = model.userData.crouch;
    J.hips.position.y = 0.95 - cr * 0.35 + Math.abs(Math.sin(ph)) * 0.04 * amp;
    J.spine.rotation.x = -(run ? 0.35 : 0.08) * amp - cr * 0.3 - (s.fear > 0.6 ? 0.08 : 0);
    // legs: thighs swing forward (+x), knees fold back (-x)
    J.thL.rotation.x = Math.sin(ph) * amp + cr * 1.15; J.thR.rotation.x = -Math.sin(ph) * amp + cr * 1.15;
    J.shL.rotation.x = -Math.max(0, -Math.sin(ph + 1.2)) * amp * 1.4 - cr * 1.9; J.shR.rotation.x = -Math.max(0, Math.sin(ph + 1.2)) * amp * 1.4 - cr * 1.9;
    // left arm swings, right arm holds the flashlight out front
    const working = s.interact && s.interact.kind !== 'search';
    J.uaL.rotation.x = -Math.sin(ph) * amp * 0.8 + (working ? 1.0 : 0.1); J.faL.rotation.x = 0.35 + amp * 0.4 + (working ? 0.6 : 0);
    J.uaR.rotation.x = (working ? 0.8 : 0.6) + Math.sin(ph * 2) * amp * 0.06; J.uaR.rotation.z = 0.18;
    J.faR.rotation.x = working ? 0.8 : 0.75;
    J.neck.rotation.x = (s.pitch || 0) * 0.6;
    J.neck.rotation.y = Math.sin(t * 1.7 + s.x) * 0.15 * (s.fear || 0);
    if (s.grabbedBy) {
      // seized: thrashing, kicking, arching away
      J.spine.rotation.x = 0.35 + Math.sin(t * 9) * 0.12;
      J.uaL.rotation.x = 1.1 + Math.sin(t * 13) * 1.1; J.uaR.rotation.x = 1.0 + Math.cos(t * 12) * 1.1;
      J.faL.rotation.x = J.faR.rotation.x = 0.4 + Math.abs(Math.sin(t * 10)) * 0.8;
      J.thL.rotation.x = 0.6 + Math.sin(t * 15) * 0.6; J.thR.rotation.x = 0.6 + Math.cos(t * 14) * 0.6;
      J.shL.rotation.x = -0.6 - Math.abs(Math.sin(t * 15)) * 0.9; J.shR.rotation.x = -0.6 - Math.abs(Math.cos(t * 14)) * 0.9;
      J.neck.rotation.x = 0.5 + Math.sin(t * 8) * 0.3; J.neck.rotation.y = Math.sin(t * 11) * 0.6;
    } else if (s.downT > 0) {
      J.uaL.rotation.x = 2.2; J.uaR.rotation.x = 2.0; J.thL.rotation.x = 0.3; J.thR.rotation.x = 0.1;
    }
    J.spine.scale.y = 1 + Math.sin(t * (2 + (s.fear || 0) * 4)) * 0.01;
  };

  // ---------- the creature ----------
  HG.buildMonster = function () {
    const root = new THREE.Group();
    const mat = M.monster;
    const J = {};
    const meshes = [];
    const cap = (r, len, parent, y, sx, sz) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat); m.position.y = y; if (sx) m.scale.set(sx, 1, sz || sx); parent.add(m); meshes.push(m); m.castShadow = true; return m; };
    const hips = new THREE.Group(); hips.position.y = 1.35; root.add(hips); J.hips = hips;
    cap(0.13, 0.12, hips, 0, 1.4, 0.8).rotation.z = Math.PI / 2;
    const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine); J.spine = spine;
    // emaciated, elongated torso: a sunken belly under a deep, flared ribcage
    cap(0.075, 0.38, spine, 0.25, 1.2, 0.75);
    const chest = new THREE.Group(); chest.position.y = 0.55; spine.add(chest); J.chest = chest;
    cap(0.17, 0.26, chest, 0.1, 1.55, 0.82);
    for (let i = 0; i < 5; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.17 - i * 0.012, 0.012, 4, 14, Math.PI * 1.2), mat); rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.4); rib.scale.set(1.55, 0.85, 1); rib.position.set(0, -0.06 + i * 0.07, -0.02); chest.add(rib); meshes.push(rib); }
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), mat); sh.position.set(sx * 0.24, 0.22, 0.02); sh.scale.set(1, 0.75, 1.1); chest.add(sh); meshes.push(sh); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.03), mat); blade.position.set(sx * 0.12, 0.12, 0.13); blade.rotation.set(0.2, sx * 0.3, 0); chest.add(blade); meshes.push(blade); }
    // vertebrae ridge
    for (let i = 0; i < 7; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat); v.position.set(0, -0.35 + i * 0.1, -0.12); chest.add(v); meshes.push(v); }
    const neck = new THREE.Group(); neck.position.y = 0.36; chest.add(neck); J.neck = neck;
    cap(0.045, 0.32, neck, 0.18);
    const head = new THREE.Group(); head.position.y = 0.4; neck.add(head); J.head = head;
    // long, eyeless-looking skull that juts forward
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat); skull.scale.set(0.82, 1.1, 1.65); skull.position.set(0, 0.07, -0.06); skull.rotation.x = 0.25; head.add(skull); meshes.push(skull);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.08), mat); brow.position.set(0, 0.12, -0.15); head.add(brow); meshes.push(brow);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.02, -0.06); head.add(jaw); J.jaw = jaw;
    const jm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.2), mat); jm.position.set(0, -0.04, -0.06); jaw.add(jm); meshes.push(jm);
    // eyes: tiny, deep set, only visible sometimes
    const eyeG = new THREE.SphereGeometry(0.016, 8, 6);
    const eL = new THREE.Mesh(eyeG, M.monsterEye), eR = new THREE.Mesh(eyeG, M.monsterEye);
    eL.position.set(-0.042, 0.095, -0.215); eR.position.set(0.042, 0.095, -0.215); head.add(eL); head.add(eR);
    J.eyes = [eL, eR];
    const limb = (parent, x, y, r, len, rz) => {
      const j = new THREE.Group(); j.position.set(x, y, 0); j.rotation.z = rz || 0; parent.add(j);
      cap(r, len, j, -len / 2 - r);
      const end = new THREE.Group(); end.position.y = -len - r * 1.5; j.add(end);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 8, 6), mat); end.add(knob); meshes.push(knob);
      return { j, end };
    };
    // arms reach past the knees
    const uaL = limb(chest, -0.25, 0.2, 0.045, 0.62, 0.12), uaR = limb(chest, 0.25, 0.2, 0.045, 0.62, -0.12);
    const faL = limb(uaL.end, 0, 0, 0.038, 0.66), faR = limb(uaR.end, 0, 0, 0.038, 0.66);
    const hand = (parent) => { const h = new THREE.Group(); h.position.y = -0.04; parent.add(h); for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.rotation.z = (i - 1.5) * 0.18; f.rotation.x = 0.15; h.add(f); const fm = cap(0.012, 0.24 - Math.abs(i - 1.5) * 0.04, f, -0.13); } return h; };
    J.handL = hand(faL.end); J.handR = hand(faR.end);
    const thL = limb(hips, -0.12, -0.02, 0.06, 0.55), thR = limb(hips, 0.12, -0.02, 0.06, 0.55);
    const shL = limb(thL.end, 0, 0, 0.045, 0.58), shR = limb(thR.end, 0, 0, 0.045, 0.58);
    const foot = (p) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.3), mat); f.position.set(0, -0.02, -0.1); p.add(f); meshes.push(f); };
    foot(shL.end); foot(shR.end);
    Object.assign(J, { uaL: uaL.j, uaR: uaR.j, faL: faL.j, faR: faR.j, thL: thL.j, thR: thR.j, shL: shL.j, shR: shR.j });
    root.userData.J = J; root.userData.meshes = meshes; root.userData.phase = 0;
    // ghost material: a faint refractive shimmer, revealed only by a flashlight
    root.userData.ghostMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; uniform float uTime; void main(){ vec3 p=position; p+=normal*sin(uTime*9.0+position.y*24.0)*0.006; vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vW=(modelMatrix*vec4(p,1.0)).xyz; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; uniform float uTime; uniform float uReveal; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.5); float n=fract(sin(dot(floor(vW*30.0+uTime*3.0),vec3(12.9,78.2,37.7)))*43758.5); float a=f*(0.05+uReveal*0.55)*(0.7+n*0.6); gl_FragColor=vec4(vec3(0.75,0.8,0.85)*(0.4+uReveal),a); }'
    });
    return root;
  };
  HG.animateMonster = function (model, m, dt, t, opts) {
    const J = model.userData.J;
    const sp = m.speed || 0;
    const mode = m.mode;
    const ud = model.userData;
    ud.phase += dt * (mode === 'crawl' ? sp * 3.2 : mode === 'run' || mode === 'dash' ? sp * 1.25 : sp * 1.7 + 0.0001);
    const ph = ud.phase;
    const amp = clamp(sp / 2.5, 0, 1.2);
    const tgt = ud.pose = ud.pose || {};
    // irregular twitching: the gait never quite repeats
    const tw = Math.sin(t * 13.1) * Math.sin(t * 3.7 + 1) > 0.92 ? 1 : 0;
    ud.crawlBlend = lerp(ud.crawlBlend || 0, mode === 'crawl' ? 1 : 0, Math.min(1, dt * 5));
    const cb = ud.crawlBlend;
    const runB = mode === 'run' || mode === 'dash' ? 1 : 0;
    ud.runBlend = lerp(ud.runBlend || 0, runB, Math.min(1, dt * 6));
    const rb = ud.runBlend;
    const stalk = mode === 'stalk' ? 1 : 0;
    ud.stalkBlend = lerp(ud.stalkBlend || 0, stalk, Math.min(1, dt * 4));
    const sb = ud.stalkBlend;
    // body height and pitch
    J.hips.position.y = lerp(1.35 - sb * 0.15 - rb * 0.1, 0.42, cb) + Math.abs(Math.sin(ph)) * 0.05 * amp * (1 - cb);
    J.hips.rotation.x = lerp(0, -1.35, cb);
    J.spine.rotation.x = lerp(-0.38 - sb * 0.4 - rb * 0.5, -0.1, cb) + Math.sin(ph * 2) * 0.03;
    J.chest.rotation.x = lerp(-0.3 - sb * 0.2, 0.15, cb);
    J.spine.rotation.z = Math.sin(ph) * 0.06 * amp;
    // legs
    const leg = (th, sh, sgn) => {
      const s = Math.sin(ph + sgn) * amp;
      th.rotation.x = lerp(s * (0.7 + rb * 0.4) - sb * 0.4, 1.9 + Math.sin(ph + sgn) * 0.5, cb);
      th.rotation.z = lerp(0, sgn > 1 ? 0.7 : -0.7, cb);
      sh.rotation.x = lerp(Math.max(0, -Math.sin(ph + sgn + 1.3)) * 1.4 * amp + sb * 0.6, -2.2, cb);
    };
    leg(J.thL, J.shL, 0); leg(J.thR, J.shR, Math.PI);
    // arms: long, dragging; reach forward when running or crawling
    const arm = (ua, fa, sgn) => {
      const s = Math.sin(ph + sgn + Math.PI) * amp;
      // compensate for the hunched torso so the arms hang toward the ground; when running they trail behind
      ua.rotation.x = lerp(0.72 + sb * 0.35 + s * 0.45 - rb * 1.7, -2.4 + Math.sin(ph + sgn) * 0.6, cb);
      ua.rotation.z = lerp((sgn ? -0.12 : 0.12) * (1 + rb), sgn ? -0.9 : 0.9, cb);
      fa.rotation.x = lerp(0.15 + sb * 0.35 - rb * 0.2, -0.6, cb);
    };
    arm(J.uaL, J.faL, 0); arm(J.uaR, J.faR, Math.PI);
    // attack swipe
    if (m.attackWind > 0 || ud.swingT > 0) {
      ud.swingT = m.attackWind > 0 ? 0.35 : ud.swingT - dt;
      const k = m.attackWind > 0 ? -2.6 : -2.6 + (0.35 - ud.swingT) * 9;
      J.uaR.rotation.x = k; J.faR.rotation.x = -0.2;
    }
    // head: tracks sounds with small jerks, cranes back to scream
    ud.headYaw = lerp(ud.headYaw || 0, (m.headTurn || 0) + (tw ? (Math.random() - 0.5) * 0.8 : 0), Math.min(1, dt * (tw ? 30 : 4)));
    J.neck.rotation.y = ud.headYaw;
    J.neck.rotation.z = Math.sin(t * 0.9) * 0.12 + (tw ? 0.35 : 0) * Math.sign(Math.sin(t * 7));
    J.neck.rotation.x = lerp(0.35 - rb * 0.4 + sb * 0.25, -1.2, cb);
    if (m.screamWind > 0 || ud.screamT > 0) {
      ud.screamT = m.screamWind > 0 ? 1.2 : ud.screamT - dt;
      J.neck.rotation.x = 0.7; J.jaw.rotation.x = 0.9 + Math.sin(t * 40) * 0.05;
      J.uaL.rotation.z = 1.1; J.uaR.rotation.z = -1.1;
    } else J.jaw.rotation.x = lerp(J.jaw.rotation.x, tw ? 0.3 : 0.04, Math.min(1, dt * 6));
    // attack poses
    if (m.pounceWind > 0) {
      // coiled to spring: low, arms swept back, jaw open
      J.hips.position.y = 0.85; J.spine.rotation.x = -1.05; J.chest.rotation.x = -0.25;
      J.uaL.rotation.x = J.uaR.rotation.x = -0.9; J.faL.rotation.x = J.faR.rotation.x = 0.2;
      J.thL.rotation.x = J.thR.rotation.x = 1.25; J.shL.rotation.x = J.shR.rotation.x = -2.1;
      J.neck.rotation.x = 0.9; J.jaw.rotation.x = 0.7 + Math.sin(t * 50) * 0.05;
      J.spine.rotation.z = Math.sin(t * 40) * 0.03;
    } else if (m.pounceT > 0 || m.mode === 'pounce') {
      // airborne: stretched out, claws first
      J.hips.position.y = 1.0; J.hips.rotation.x = -1.0; J.spine.rotation.x = -0.2; J.chest.rotation.x = 0;
      J.uaL.rotation.x = J.uaR.rotation.x = 2.9; J.uaL.rotation.z = 0.35; J.uaR.rotation.z = -0.35; J.faL.rotation.x = J.faR.rotation.x = 0.1;
      J.thL.rotation.x = J.thR.rotation.x = -0.7; J.shL.rotation.x = J.shR.rotation.x = -0.5;
      J.neck.rotation.x = 0.8; J.jaw.rotation.x = 1.1;
    } else if (m.grabbed) {
      // holding someone: both arms locked around them, head jerking in to bite
      J.hips.position.y = 1.15; J.hips.rotation.x = 0; J.spine.rotation.x = -0.55 + Math.sin(t * 7) * 0.08; J.chest.rotation.x = -0.2;
      J.spine.rotation.z = Math.sin(t * 14) * 0.1;
      J.uaL.rotation.x = J.uaR.rotation.x = 1.45 + Math.sin(t * 11) * 0.06; J.uaL.rotation.z = -0.45; J.uaR.rotation.z = 0.45;
      J.faL.rotation.x = J.faR.rotation.x = 0.9;
      J.neck.rotation.x = 0.2 + Math.max(0, Math.sin(t * 6)) * 0.6; J.jaw.rotation.x = 0.4 + Math.abs(Math.sin(t * 9)) * 0.7;
      J.neck.rotation.z = Math.sin(t * 17) * 0.25;
    } else if (m.stumbleT > 0) {
      // reeling: limp arms, head thrashing
      J.spine.rotation.x = -0.7 + Math.sin(t * 5) * 0.15; J.spine.rotation.z = Math.sin(t * 3.3) * 0.25;
      J.uaL.rotation.x = 0.4 + Math.sin(t * 4) * 0.3; J.uaR.rotation.x = 0.3 + Math.cos(t * 4.4) * 0.3;
      J.neck.rotation.z = Math.sin(t * 19) * 0.5; J.jaw.rotation.x = 0.5;
    }
    if (m.pounceT <= 0 && m.mode !== 'pounce' && m.mode !== 'crawl') J.hips.rotation.x = lerp(J.hips.rotation.x, 0, Math.min(1, dt * 8));
    // eyes: catch the light only now and then
    const eye = clamp(opts.eyes, 0, 1);
    for (const e of J.eyes) { e.material.opacity = eye; e.visible = eye > 0.02; }
    // ghost state swaps materials
    const ghost = m.ghostT > 0;
    if (ghost !== ud.isGhost) {
      ud.isGhost = ghost;
      for (const mesh of ud.meshes) mesh.material = ghost ? ud.ghostMat : M.monster;
    }
    ud.ghostMat.uniforms.uTime.value = t;
    ud.ghostMat.uniforms.uReveal.value = opts.reveal || 0;
  };
})(typeof window !== 'undefined' ? window : globalThis);
