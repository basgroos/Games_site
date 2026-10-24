// =====================================================================
//  PART II — ST. BRIGID'S: the hospital map
//  Ground floor (lv 0): grounds, lobby, records, Ward B, nurses' station, dayroom.
//  Basement (lv -1): stairwell, morgue, service tunnel, service lift.
//  The front of the building faces +z at z = 4 (outside is z > 4, as in Part I).
// =====================================================================
function p2Materials() {
  if (MAT.lino) return;
  const S = 256;
  TEX.lino = texFrom(pixelTex(S, S, (x, y) => {
    const chk = ((Math.floor(x / 64) + Math.floor(y / 64)) % 2) ? 1 : .86; const n = tileFbm(x * .05, y * .05, 12.8, 3);
    const seam = (x % 64 < 1 || y % 64 < 1) ? .7 : 1; const scuff = Math.max(0, tileFbm(x * .02 + 3, y * .02, 5.12, 4) - .58) * 1.4;
    const v = (.62 + n * .25) * chk * seam - scuff; return [150 * v, 160 * v, 140 * v];
  }));
  TEX.paint = texFrom(pixelTex(S, S, (x, y) => {
    const n = tileFbm(x * .03, y * .03, 7.68, 4); const peel = Math.max(0, tileFbm(x * .05 + 7, y * .05, 12.8, 4) - .62) * 2.2;
    const band = y > 200 ? .82 : 1; const v = (.72 + n * .22) * band; return [140 * v - peel * 30, 160 * v - peel * 40, 148 * v - peel * 40];
  }));
  TEX.htile = texFrom(pixelTex(S, S, (x, y) => {
    const g = (x % 32 < 2 || y % 32 < 2) ? .55 : 1; const n = tileFbm(x * .05, y * .05, 12.8, 3); const st = Math.max(0, tileFbm(x * .03, y * .01 + 4, 7.68, 4) - .55) * 1.2;
    const v = (.78 + n * .2) * g - st; return [168 * v, 182 * v, 176 * v];
  }));
  TEX.brick = texFrom(pixelTex(S, S, (x, y) => {
    const row = Math.floor(y / 16), xx = (x + (row % 2) * 32) % 64; const mort = (y % 16 < 2 || xx < 2) ? .55 : 1;
    const n = tileFbm(x * .05, y * .05, 12.8, 3); const v = mort * (.55 + n * .4); return [120 * v, 70 * v, 55 * v];
  }));
  MAT.lino = stdMat(TEX.lino, .55); MAT.lino.userData.tile = 1.6; MAT.lino.bumpMap = TEX.lino; MAT.lino.bumpScale = .01;
  MAT.paint = stdMat(TEX.paint, .9); MAT.paint.userData.tile = 2.2; MAT.paint.bumpMap = TEX.paint; MAT.paint.bumpScale = .015;
  MAT.htile = stdMat(TEX.htile, .35); MAT.htile.userData.tile = 1; MAT.htile.bumpMap = TEX.htile; MAT.htile.bumpScale = .02;
  MAT.brick = stdMat(TEX.brick, .95); MAT.brick.userData.tile = 1.4; MAT.brick.bumpMap = TEX.brick; MAT.brick.bumpScale = .05;
  MAT.steel = stdMat(TEX.metal, .45, 0xb8bcbf, { metalness: .6 }); MAT.steel.userData.tile = 1;
  MAT.white = stdMat(null, .8, 0xd6d4cc);
  MAT.green = stdMat(null, .7, 0x4f6a5a);
}
// a fluorescent ceiling tube (a pooled lamp plus a glowing strip)
function tube(x, y, z, name, o = {}) {
  const m = new THREE.MeshBasicMaterial({ color: 0xdfe8e4 });
  const t = box(o.rot ? .12 : 1.2, .05, o.rot ? 1.2 : .12, x, y - .05, z, m, { occ: false, parent: o.parent });
  const L = lamp(x, y - .15, z, { name, int: o.int || .7, dist: o.dist || 9, color: 0xdcefe8, bulb: false, flick: o.flick || 0, on: o.on !== false, lv: o.lv, parent: o.parent });
  L.tubeMat = m; t.userData.lampRef = L; W.p2tubes.push({ L, m });
  return L;
}
function hospitalBed(x, z, ry, y0, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry || 0; add(g, o.parent);
  box(.95, .08, 2.0, 0, .5, 0, MAT.steel, { parent: g, cast: true, occ: false });
  [[-.42, -.9], [.42, -.9], [-.42, .9], [.42, .9]].forEach(([a, b]) => cyl(.025, .025, .5, a, 0, b, MAT.steel, { parent: g }));
  box(.95, .7, .05, 0, .5, -.98, MAT.steel, { parent: g, occ: false }); box(.95, .45, .05, 0, .5, .98, MAT.steel, { parent: g, occ: false });
  box(.88, .14, 1.9, 0, .58, 0, MAT.white, { parent: g, cast: true, occ: false });
  box(.6, .1, .35, 0, .72, -.72, MAT.sheet, { parent: g, occ: false });
  if (o.sheet !== false) box(.92, .06, 1.25, 0, .72, .3, MAT.sheet, { parent: g, occ: false });
  const rot = Math.abs(Math.sin(ry || 0)) > .7; const hw = rot ? 1.0 : .5, hd = rot ? .5 : 1.0;
  addCollider(x - hw, x + hw, z - hd, z + hd, o.lv == null ? 0 : o.lv);
  return g;
}
function cabinetBox(x, z, ry, y0, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry || 0; add(g, o.parent);
  box(.5, .85, .45, 0, 0, 0, MAT.white, { parent: g, cast: true });
  box(.42, .3, .02, 0, .45, .23, MAT.steel, { parent: g, occ: false });
  addCollider(x - .3, x + .3, z - .3, z + .3, o.lv == null ? 0 : o.lv);
  return g;
}
function numberPlate(num, x, y, z, ry) {
  const c = makeCanvas(128, 64), p = { c, mesh: null, num };
  const draw = n => { const x2 = c.getContext('2d'); x2.fillStyle = '#d8d6cc'; x2.fillRect(0, 0, 128, 64); x2.fillStyle = '#20231f'; x2.font = 'bold 40px "Special Elite", monospace'; x2.textAlign = 'center'; x2.fillText(String(n), 64, 47); x2.strokeStyle = '#555'; x2.lineWidth = 3; x2.strokeRect(2, 2, 124, 60); };
  draw(num); const tex = texFrom(c, false);
  p.mesh = plane(.32, .16, x, y, z, new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), { ry });
  p.set = n => { p.num = n; draw(n); tex.needsUpdate = true; };
  return p;
}
function textPlane(lines, w, h, x, y, z, ry, o = {}) {
  const c = makeCanvas(512, Math.round(512 * h / w)), t = c.getContext('2d');
  t.fillStyle = o.bg || '#1e2420'; t.fillRect(0, 0, c.width, c.height); t.fillStyle = o.fg || '#d8d2c0'; t.textAlign = 'center';
  const fs = o.size || 46; t.font = `${fs}px ${o.font || '"Special Elite", monospace'}`;
  lines.forEach((l, i) => t.fillText(l, 256, (c.height / (lines.length + 1)) * (i + 1) + fs * .35));
  return plane(w, h, x, y, z, new THREE.MeshStandardMaterial({ map: texFrom(c, false), roughness: .8 }), { ry, parent: o.parent });
}

function buildPart2() {
  p2Materials(); W.p2tubes = []; W.p2plates = {}; W.p2 = {};
  const E = W.ext = new THREE.Group(); W.scene.add(E);
  // ---------------- grounds ----------------
  box(100, .1, 60, 0, -.1, 22, MAT.grass, { parent: E });
  box(2.4, .02, 24, 0, 0, 16, MAT.gravel, { parent: E, occ: false });
  box(22, .02, 12, 12, 0, 11, new THREE.MeshStandardMaterial({ map: TEX.concrete, color: 0x6a6a68, roughness: .95 }), { parent: E, occ: false });
  const post = (x, z) => box(.1, 2.2, .1, x, 0, z, MAT.iron, { parent: E, occ: false, cast: true });
  for (let z = 4.5; z <= 30; z += 2.5) { post(-30, z); post(30, z); }
  for (let x = -30; x <= 30; x += 2.5) if (Math.abs(x) > 2) post(x, 30);
  [[-30, 'z'], [30, 'z']].forEach(([c]) => { box(.04, .05, 26, c, 2.0, 17, MAT.iron, { parent: E, occ: false }); box(.04, .05, 26, c, 1.0, 17, MAT.iron, { parent: E, occ: false }); });
  box(60, .05, .04, 0, 2.0, 30, MAT.iron, { parent: E, occ: false }); box(60, .05, .04, 0, 1.0, 30, MAT.iron, { parent: E, occ: false });
  addCollider(-30.3, -29.7, 4, 30.5, 0); addCollider(29.7, 30.3, 4, 30.5, 0); addCollider(-30.3, 30.3, 29.1, 29.5, 0);
  IT(box(3, 2, .3, 0, 0, 29.6, new THREE.MeshBasicMaterial({ visible: false }), { parent: E, occ: false }), 'p2road');
  // trees and hedges
  const deadTree = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, 0, z); E.add(g); cyl(.12, .25, h, 0, 0, 0, MAT.bark, { parent: g, cast: true }); for (let i = 0; i < 5; i++) { const b = cyl(.03, .07, h * .45, 0, h * rand(.45, .8), 0, MAT.bark, { parent: g }); b.rotation.z = rand(-1.1, 1.1); b.rotation.y = rand(0, TAU); } addCollider(x - .3, x + .3, z - .3, z + .3, 0); };
  [[-20, 20, 6], [-24, 9, 5], [22, 24, 6], [-6, 24, 5], [18, 7, 4.5]].forEach(a => deadTree(...a));
  for (let i = 0; i < 30; i++) { const x = (Math.random() < .5 ? -1 : 1) * rand(3, 28), z = rand(6, 28); if (Math.abs(x) < 3) continue; if (x > 2 && x < 22 && z < 17) continue; sph(rand(.4, .9), x, rand(.1, .3), z, Math.random() < .5 ? MAT.leaf : MAT.leafDark, { parent: E, sy: rand(.5, .8), seg: 7 }); }
  for (let i = 0; i < 40; i++) { const a = rand(-1.2, 1.2) + (Math.random() < .5 ? 0 : Math.PI), r = rand(40, 52); const h = rand(7, 12); const c = new THREE.Mesh(new THREE.ConeGeometry(rand(1.5, 2.5), h, 6), MAT.leafDark); c.position.set(Math.sin(a) * r, h / 2, 14 + Math.cos(a) * r); E.add(c); }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0xc8cdd6, fog: false })); moon.position.set(25, 30, 60); moon.lookAt(0, 0, 0); E.add(moon);
  // facade
  const S = W.shell = new THREE.Group(); W.scene.add(S);
  wallX(4.12, -48, 34, 0, MAT.brick, [[-.85, .85, 2.4], [22.6, 23.8, 2.2]], { y0: 0, h: 7, parent: S, noTrim: true });
  box(82.4, .5, .5, -7, 7, 4.2, MAT.concrete, { parent: S, occ: false });
  box(82, .3, 32, -7, 7.2, -12, MAT.concrete, { parent: S, occ: false });
  textPlane(["ST. BRIGID'S HOSPITAL"], 5.2, .55, 0, 3.4, 4.24, 0, { bg: '#2b2c28', fg: '#c9c3ae', size: 48, parent: S });
  box(3.4, .12, 1.4, 0, 2.7, 4.8, MAT.concrete, { parent: E, occ: false });
  [-3.4, 3.4, -9.2, -15.6, -22, -28.4, -34.8, 10, 16].forEach(x => windowDecor(x, 1.8, 4.22, 0, 1.2, 1.4, S, { light: false, shaft: false, curtains: false, mat: new THREE.MeshBasicMaterial({ color: 0x1a2024 }) }));
  [-9.2, -22, 4, 10, 16].forEach(x => windowDecor(x, 5.0, 4.22, 0, 1.2, 1.4, S, { light: false, shaft: false, curtains: false, mat: new THREE.MeshBasicMaterial({ color: 0x151a1e }) }));
  W.obj.p2LitWin = windowDecor(-15.6, 5.0, 4.22, 0, 1.2, 1.4, S, { light: false, shaft: false, curtains: false, mat: new THREE.MeshBasicMaterial({ color: 0x6d5a3e }) });
  W.obj.entranceLamp = lamp(1.3, 2.6, 4.45, { name: 'entr', int: 1.4, dist: 8, flick: .6, color: 0xffd8a0, size: .05 });
  lamp(3, 4.6, 19, { name: 'street', int: 1.1, dist: 12, color: 0xffc88a, size: .07 }); cyl(.06, .08, 4.6, 3, 0, 19, MAT.iron, { parent: E, solid: true });
  // the chain on the doors
  const chain = new THREE.Group(); chain.position.set(0, 1.1, 4.32); E.add(chain);
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(.045, .012, 5, 10), MAT.iron); l.position.set(-.64 + i * .16, Math.sin(i * .7) * .03, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; chain.add(l); }
  box(.12, .16, .06, 0, -.12, .02, MAT.brass, { parent: chain, occ: false });
  W.obj.chain = chain; IT(chain, 'p2chain');
  // ambulance
  const amb = new THREE.Group(); amb.position.set(9, 0, 9.5); amb.rotation.y = .25; E.add(amb);
  box(2.1, 2.2, 5, 0, .35, 0, new THREE.MeshStandardMaterial({ color: 0xc9c6bd, roughness: .6 }), { parent: amb, cast: true });
  box(2.12, .3, 5.02, 0, 1.2, 0, new THREE.MeshStandardMaterial({ color: 0x8a2a24, roughness: .7 }), { parent: amb, occ: false });
  [[-1, -1.7], [1, -1.7], [-1, 1.7], [1, 1.7]].forEach(([a, b]) => { const w = cyl(.35, .35, .25, a, .35, b, MAT.black, { parent: amb, rz: Math.PI / 2 }); w.position.y = .35; });
  addCollider(7.6, 10.4, 7, 12, 0); IT(amb, 'p2ambulance');
  // security booth
  floorRect(6, 9, 19, 22, 0, MAT.concrete, { surf: 'concrete', lv: 0 }); ceilRect(6, 9, 19, 22, 2.6, MAT.concrete);
  wallZ(9, 19, 22, 0, MAT.paint, [], { h: 2.6, noTrim: true }); wallZ(6, 19, 22, 0, MAT.paint, [[20, 21, 2.1]], { h: 2.6, noTrim: true });
  wallX(19, 6, 9, 0, MAT.paint, [], { h: 2.6, noTrim: true }); wallX(22, 6, 9, 0, MAT.paint, [], { h: 2.6, noTrim: true });
  box(3.2, .15, 3.2, 7.5, 2.6, 20.5, MAT.concrete, { parent: E, occ: false });
  windowDecor(7.5, 1.6, 22.08, 0, 1.4, .8, null, { light: false, shaft: false, curtains: false, mat: new THREE.MeshBasicMaterial({ color: 0x2a3036 }) });
  makeDoor('booth', { axis: 'z', c: 6, mid: 20.5, h: 2.1, lv: 0, dir: -1, name: 'door' });
  table(8.25, 20.5, .8, 2.2, .8, 0); addCollider(7.85, 8.65, 19.4, 21.6, 0);
  IT(box(.22, .03, .3, 8.2, .8, 21.2, new THREE.MeshStandardMaterial({ color: 0x2a3a2a }), { occ: false }), 'p2logbook');
  const sk = new THREE.Group(); sk.position.set(8.1, .81, 19.9); add(sk); box(.1, .01, .025, 0, 0, 0, MAT.brass, { parent: sk, occ: false }); const skr = new THREE.Mesh(new THREE.TorusGeometry(.025, .007, 6, 10), MAT.brass); skr.rotation.x = Math.PI / 2; skr.position.x = -.07; sk.add(skr);
  W.obj.shedKey = sk; IT(sk, 'p2shedKey');
  const lt = box(.05, .09, .03, 8.4, .81, 19.7, new THREE.MeshStandardMaterial({ color: 0x8a1a17, roughness: .4 }), { occ: false }); W.obj.lighter = lt; IT(lt, 'p2lighter');
  // CCTV monitor (shows the cameras… and once, you)
  const mon = new THREE.Group(); mon.position.set(8.45, .8, 20.5); mon.rotation.y = -Math.PI / 2; add(mon);
  box(.5, .4, .35, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x2b2a27, roughness: .5 }), { parent: mon, cast: true });
  W.tvRT = new THREE.WebGLRenderTarget(256, 192);
  const tvMat = new THREE.ShaderMaterial({
    uniforms: { img: { value: W.tvRT.texture }, on: { value: 1 }, time: { value: 0 }, mixImg: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D img; uniform float on,time,mixImg; varying vec2 vUv; float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}
      void main(){ vec2 uv=vUv; float n=h(floor(uv*vec2(160.,120.))+fract(time*13.)*91.); vec3 im=texture2D(img,uv).rgb; float l=dot(pow(im,vec3(.6)),vec3(.3,.59,.11))*1.7;
      float scan=.75+.25*sin(uv.y*400.); vec3 col=mix(vec3(n*.35),vec3(l*.8,l,l*.85),mixImg)*scan*on; gl_FragColor=vec4(col,1.); }`
  });
  plane(.42, .3, 0, .2, .176, tvMat, { parent: mon }); W.obj.tvMat = tvMat; W.obj.tv = mon; W.tvOn = true; IT(mon, 'p2monitor');
  lamp(7.5, 2.4, 20.5, { name: 'booth', int: .45, dist: 5, flick: .3 });
  // groundskeeper's shed
  floorRect(-12, -8, 12, 16, 0, MAT.wood, { surf: 'wood', lv: 0 }); ceilRect(-12, -8, 12, 16, 2.5, MAT.darkWood);
  wallZ(-12, 12, 16, 0, MAT.darkWood, [], { h: 2.5, noTrim: true }); wallZ(-8, 12, 16, 0, MAT.darkWood, [[13.5, 14.5, 2.1]], { h: 2.5, noTrim: true });
  wallX(12, -12, -8, 0, MAT.darkWood, [], { h: 2.5, noTrim: true }); wallX(16, -12, -8, 0, MAT.darkWood, [], { h: 2.5, noTrim: true });
  box(4.4, .12, 4.4, -10, 2.5, 14, MAT.roof, { parent: E, occ: false });
  makeDoor('shed', { axis: 'z', c: -8, mid: 14, h: 2.1, lv: 0, dir: 1, locked: true, key: 'shedKey', name: 'shed door', mat: MAT.darkWood, lockMsg: 'A padlock, rusted shut. The groundskeeper must have kept a key somewhere.' });
  table(-11.4, 14, .8, 2.6, .85, 0, null, MAT.darkWood); addCollider(-11.8, -11.0, 12.7, 15.3, 0);
  const bc = new THREE.Group(); bc.position.set(-11.3, .86, 14.4); bc.rotation.y = .4; add(bc);
  box(.06, .04, .62, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0xa02a1e }), { parent: bc, occ: false }); box(.05, .05, .2, .02, 0, .38, MAT.iron, { parent: bc, occ: false }); box(.05, .05, .2, -.02, 0, .38, MAT.iron, { parent: bc, occ: false });
  W.obj.boltCutters = bc; IT(bc, 'p2boltCutters');
  [12.7, 15.3].forEach(z => box(.4, rand(.3, .6), .4, -8.6, 0, z, MAT.darkWood, { occ: false }));
  lamp(-10, 2.3, 14, { name: 'shed', int: .3, dist: 4, flick: .5, size: .03 });

  // ---------------- ground floor interior ----------------
  const lv = 0, H = 3.2;
  // LOBBY  x -6..6, z -8..4
  floorRect(-6, 6, -8, 4, 0, MAT.lino, { surf: 'tile', lv }); ceilRect(-6, 6, -8, 4, H);
  wallZ(6, -8, 4, lv, MAT.paint, [[-5.5, -4.5]]); wallZ(-6, -8, 4, lv, MAT.paint, [[-4.15, -2.25, 2.4]]); wallX(-8, -6, 6, lv, MAT.paint);
  wallX(4.0, -6, 6, lv, MAT.paint, [[-.85, .85, 2.4]], { t: .04, h: H, noTrim: true });
  makeDoor('entrance', { axis: 'x', c: 4.12, mid: 0, w: 1.6, h: 2.38, lv, dir: -1, locked: true, name: 'doors', mat: MAT.door, lockMsg: () => Story.p2EntranceMsg() });
  // reception
  box(4.4, 1.1, .7, 0, 0, -4.6, MAT.darkWood, { solid: true, lv, cast: true }); box(4.6, .06, .9, 0, 1.1, -4.6, MAT.white, {});
  box(4.4, 1.0, .03, 0, 1.16, -4.95, new THREE.MeshStandardMaterial({ color: 0x9fb3b0, transparent: true, opacity: .25, roughness: .1 }), { occ: false });
  const phone = new THREE.Group(); phone.position.set(-1.2, 1.13, -4.55); add(phone); box(.22, .08, .18, 0, 0, 0, MAT.black, { parent: phone }); box(.24, .05, .06, 0, .09, 0, MAT.black, { parent: phone });
  W.obj.phone = phone; IT(phone, 'p2phone');
  IT(box(.3, .03, .4, .8, 1.13, -4.5, new THREE.MeshStandardMaterial({ color: 0x3a2e24 }), { occ: false }), 'p2visitorLog');
  const crt = new THREE.Group(); crt.position.set(1.6, 1.13, -4.7); add(crt); box(.4, .34, .36, 0, 0, 0, MAT.white, { parent: crt }); plane(.3, .22, 0, .19, .181, new THREE.MeshBasicMaterial({ color: 0x0b120d }), { parent: crt });
  [[-3.4, 1.6], [3.4, 1.6], [-3.4, -.4]].forEach(([x, z]) => { box(2.2, .45, .5, x, 0, z, MAT.green, { solid: true, lv, cast: true }); box(2.2, .5, .08, x, .45, z - .22, MAT.green, { occ: false }); });
  textPlane(['OCTOBER', '14'], .5, .6, 2.6, 1.8, -7.91, 0, { bg: '#d8d2c0', fg: '#2a2620', size: 70 }); IT(box(.5, .6, .02, 2.6, 1.5, -7.92, new THREE.MeshBasicMaterial({ visible: false }), { occ: false }), 'p2calendar');
  const nb = new THREE.Group(); nb.position.set(-5.9, 1.6, 0.6); nb.rotation.y = Math.PI / 2; add(nb);
  box(1.4, .9, .04, 0, -.45, 0, new THREE.MeshStandardMaterial({ color: 0x6a5233, roughness: 1 }), { parent: nb, occ: false });
  framedPicture(drawCrayon({ kind: 'family', stage: 0 }), .34, .27, .35, .1, .03, 0, nb, { frame: 0 });
  [-.4, -.1].forEach(x => plane(.22, .28, x, .05, .025, MAT.paper, { parent: nb }));
  IT(nb, 'mem7');
  const wc = new THREE.Group(); wc.position.set(3.8, 0, 0); wc.rotation.y = -.6; add(wc);
  box(.55, .06, .5, 0, .45, 0, MAT.black, { parent: wc, occ: false }); box(.55, .5, .06, 0, .5, -.24, MAT.black, { parent: wc, occ: false });
  [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.TorusGeometry(.28, .025, 6, 16), MAT.steel); r.position.set(s * .3, .3, 0); r.rotation.y = Math.PI / 2; wc.add(r); });
  W.obj.wheelchair = wc; IT(wc, 'p2wheelchair');
  const lc = new THREE.Group(); lc.position.set(-2.8, 2.3, -7.9); add(lc); const cf = new THREE.Mesh(new THREE.CircleGeometry(.22, 24), MAT.porcelain); lc.add(cf);
  const ch1 = box(.012, .14, .01, 0, 0, .01, MAT.black, { parent: lc, occ: false }); ch1.geometry.translate(0, .07, 0); ch1.position.y = 0; ch1.rotation.z = -(10.23 / 12) * TAU;
  const ch2 = box(.008, .19, .01, 0, 0, .012, MAT.black, { parent: lc, occ: false }); ch2.geometry.translate(0, .095, 0); ch2.position.y = 0; ch2.rotation.z = -(14 / 60) * TAU;
  tube(-2.5, H, -2, 'lob1', { flick: .15 }); tube(2.5, H, -2, 'lob2', { flick: .05 }); tube(0, H, 2, 'lob3', { int: .5, flick: .4 });
  // keypad by the records door
  IT(box(.08, .16, .12, 5.9, 1.25, -4.1, MAT.black, { occ: false }), 'p2keypad');
  // RECORDS  x 6..12, z -8..-2
  floorRect(6, 12, -8, -2, 0, MAT.lino, { surf: 'tile', lv }); ceilRect(6, 12, -8, -2, H);
  wallZ(12, -8, -2, lv, MAT.paint); wallX(-8, 6, 12, lv, MAT.paint); wallX(-2, 6, 12, lv, MAT.paint);
  makeDoor('records', { axis: 'z', c: 6, mid: -5, lv, dir: 1, locked: true, name: 'door', onUse: d => Story.p2RecordsDoor(d) });
  for (let i = 0; i < 5; i++) { box(.6, 1.35, .7, 11.55, 0, -7.4 + i * .85, MAT.steel, { cast: true }); }
  addCollider(11.2, 12, -7.8, -3.2, lv);
  IT(box(.6, 1.35, .7, 11.55, 0, -7.4 + 2 * .85, new THREE.MeshBasicMaterial({ visible: false }), { occ: false }), 'p2files');
  table(8, -6.9, 1.4, .7, .76, 0); addCollider(7.25, 8.75, -7.3, -6.5, lv); chair(8, -6.2, Math.PI, 0);
  IT(box(.26, .02, .34, 8.2, .77, -6.9, MAT.paper, { occ: false }), 'p2staffMemo');
  tube(9, H, -5, 'rec', { flick: .25, on: false });
  // WARD B corridor  x -38..-6, z -4.4..-2
  floorRect(-38, -6, -4.4, -2, 0, MAT.lino, { surf: 'tile', lv }); ceilRect(-38, -6, -4.4, -2, H);
  makeDoor('ward', { axis: 'z', c: -6, mid: -3.2, w: 1.9, h: 2.38, lv, dir: 1, locked: true, key: 'keycard', name: 'ward doors', mat: MAT.white, lockMsg: 'WARD B — STAFF ONLY. A card reader blinks red beside the doors.' });
  textPlane(['WARD B'], 1.2, .3, -5.9, 2.7, -3.2, Math.PI / 2, { bg: '#2a3a32', fg: '#d8d2c0', size: 60 });
  const ROOM = [];
  const northHoles = [], southHoles = [];
  for (let i = 0; i < 5; i++) {
    const x2 = -6 - 6.4 * i, x1 = x2 - 6.4, mid = x2 - 1.6;
    ROOM.push({ n: 11 + i * 2, side: 'n', x1, x2, mid }, { n: 12 + i * 2, side: 's', x1, x2, mid });
    northHoles.push([mid - .5, mid + .5]); southHoles.push([mid - .5, mid + .5]);
  }
  wallX(-4.4, -38, -6, lv, MAT.paint, northHoles); wallX(-2, -38, -6, lv, MAT.paint, southHoles);
  wallX(-10, -38, -6, lv, MAT.paint); wallZ(-6, -10, -8, lv, MAT.paint);
  [-12.4, -18.8, -25.2, -31.6].forEach(x => { wallZ(x, -10, -4.4, lv, MAT.paint); wallZ(x, -2, 4, lv, MAT.paint); });
  wallZ(-38, -10, 4, lv, MAT.paint, [[-4.4, -2, 2.6]]);
  W.p2rooms = {};
  ROOM.forEach(r => {
    const z1 = r.side === 'n' ? -10 : -2, z2 = r.side === 'n' ? -4.4 : 4, cz = (z1 + z2) / 2, cx = (r.x1 + r.x2) / 2;
    floorRect(r.x1, r.x2, z1, z2, 0, MAT.lino, { surf: 'tile', lv }); ceilRect(r.x1, r.x2, z1, z2, H);
    if (r.side === 's') wallX(4.0, r.x1, r.x2, lv, MAT.paint, [], { t: .04, h: H, noTrim: true }); // plaster over the outside brick
    const locked = ![11, 13, 14, 16, 19].includes(r.n);
    const D = makeDoor('r' + r.n, { axis: 'x', c: r.side === 'n' ? -4.4 : -2, mid: r.mid, lv, dir: r.side === 'n' ? 1 : -1, locked: locked || r.n === 14, name: 'door', mat: MAT.white,
      lockMsg: r.n === 14 ? () => Story.p2Room14Msg() : r.n === 17 ? 'Locked. Through the little window in the door: nothing. Then something moves away from the glass.' : 'Locked. Through the little window in the door: an empty bed, made with care.' });
    box(.25, .3, .02, r.mid, 1.55, (r.side === 'n' ? -4.4 : -2) + (r.side === 'n' ? .045 : -.045), new THREE.MeshStandardMaterial({ color: 0x0c1012, roughness: .1 }), { occ: false });
    const plate = numberPlate(r.n, r.mid + .9, 2.0, r.side === 'n' ? -4.31 : -2.09, r.side === 'n' ? 0 : Math.PI);
    W.p2plates[r.n] = plate;
    const bedZ = r.side === 'n' ? -8.6 : 2.6;
    hospitalBed(r.x1 + 1.4, bedZ, 0, 0, { lv });
    cabinetBox(r.x1 + 2.5, r.side === 'n' ? -9.6 : 3.6, r.side === 'n' ? 0 : Math.PI, 0, { lv });
    chair(r.x2 - 1.2, r.side === 'n' ? -8.8 : 2.8, r.side === 'n' ? .4 : Math.PI - .4, 0);
    windowDecor(cx + 1, 1.7, r.side === 'n' ? -9.92 : 3.95, r.side === 'n' ? 0 : Math.PI, 1.2, 1.3, null, { lv, curtainMat: MAT.green, int: .25, mat: new THREE.MeshBasicMaterial({ color: 0x3a4658 }) });
    tube(cx, H, cz, 'room' + r.n, { int: .55, on: false, flick: .1 });
    W.p2rooms[r.n] = { x1: r.x1, x2: r.x2, z1, z2, cx, cz };
  });
  // corridor tubes (no power at first)
  [-9, -15, -21, -27, -33].forEach((x, i) => tube(x, H, -3.2, 'w' + (i + 1), { on: false, int: .65, flick: .05 }));
  lamp(-7, 2.9, -3.2, { name: 'wEmerg', int: .35, dist: 6, color: 0xff5a40, size: .04, flick: .2 });
  // room details
  const R = W.p2rooms;
  IT(box(.3, .2, .3, R[11].x1 + 2.5, .86, -9.6, new THREE.MeshBasicMaterial({ visible: false }), { occ: false }), 'p2fuse1');
  W.obj.fuse1 = cyl(.025, .025, .09, R[11].x1 + 2.45, .86, -9.5, MAT.brass, {}); W.obj.fuse1.rotation.z = Math.PI / 2;
  // room 13: a patient sitting in bed (the mannequin)
  const pat = personFigure({ seated: true, scale: .95, color: 0xbfc1b6, hair: 0x2a2018, headMat: new THREE.MeshStandardMaterial({ color: 0xb8ab98, roughness: .9 }) });
  pat.position.set(R[13].x1 + 1.4, .45, -8.9); add(pat); W.obj.patient = pat; IT(pat, 'p2patient');
  // room 16: fuse in a cabinet
  IT(box(.6, .9, .5, R[16].x1 + 2.5, 0, 3.6, new THREE.MeshBasicMaterial({ visible: false }), { occ: false }), 'p2fuse2');
  // room 19: a washroom corner with a fuse under the sink
  const sink = new THREE.Group(); sink.position.set(R[19].x2 - .5, 0, -7.2); add(sink); cyl(.07, .09, .8, 0, 0, 0, MAT.porcelain, { parent: sink }); box(.4, .14, .5, 0, .8, 0, MAT.porcelain, { parent: sink, cast: true }); addCollider(R[19].x2 - .8, R[19].x2 - .2, -7.5, -6.9, lv);
  IT(sink, 'p2fuse3');
  makeMirror(.5, .7, R[19].x2 - .09, 1.55, -7.2, -Math.PI / 2, { range: 5 });
  // room 14: Margaret's room (the ribbon on the handle, the photo wall)
  const r14 = R[14];
  const rib = box(.04, .14, .04, ROOM.find(r => r.n === 14).mid + .38, 1.0, -1.93, new THREE.MeshStandardMaterial({ color: 0xc8a43a, roughness: .8 }), { occ: false }); IT(rib, 'mem8');
  W.p2.photoWall = [];
  for (let i = 0; i < 4; i++) { const pic = framedPicture(Story.p2Photo(i), .42, .34, r14.x1 + 1.3 + i * .7, 1.75, 3.9, Math.PI, null, { frame: .04 }); W.p2.photoWall.push(pic); IT(pic.g, 'p2photo' + i); }
  W.obj.wallPanel = box(.6, .5, .05, r14.x1 + 5.7, 1.0, 3.95, MAT.paint, {});
  const diary2 = new THREE.Group(); diary2.position.set(r14.x2 - 1.2, .45, 2.6); add(diary2); box(.2, .04, .27, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x2a3d5a, roughness: .8 }), { parent: diary2 }); W.obj.mDiary = diary2; IT(diary2, 'p2mDiary');
  const mbox = new THREE.Group(); mbox.position.set(r14.x1 + 2.5, .86, 3.6); add(mbox); box(.2, .1, .14, 0, 0, 0, MAT.darkWood, { parent: mbox }); IT(mbox, 'p2mBox');
  [[r14.x1 + 4, .02, 1], [r14.x1 + 3.4, .02, 2.2], [r14.x2 - .9, .02, -.8]].forEach(([x, y, z], i) => { const d = plane(.28, .22, x, y + .01, z, new THREE.MeshStandardMaterial({ map: texFrom(drawCrayon({ kind: ['family', 'mama', 'house'][i], stage: 2 }), false), roughness: 1 }), { rx: -Math.PI / 2 }); d.rotation.z = rand(0, TAU); });
  makeMirror(.6, .8, r14.x1 + .09, 1.5, .6, Math.PI / 2, { range: 5 });
  W.obj.r14Bed = hospitalBed(r14.x1 + 1.4, 2.6, 0, 0, { lv, sheet: false });
  const sheetFig = personFigure({ scale: 1, mat: MAT.sheet, headMat: MAT.sheet }); sheetFig.position.set(r14.x1 + 1.4, .62, 2.3); sheetFig.rotation.x = -Math.PI / 2; add(sheetFig); W.obj.r14Fig = sheetFig;
  // the ceiling hatch over the corridor (something drops through it)
  W.obj.hatch = box(1, .05, 1, -21, H - .06, -3.2, MAT.paint, { occ: false });
  const hang = personFigure({ scale: 1.05, mat: MAT.sheet, headMat: MAT.sheet }); hang.visible = false; hang.position.set(-21, H, -3.2); add(hang); W.obj.hanging = hang;
  // NURSES' STATION  x -46..-38, z -8..0
  floorRect(-46, -38, -8, 0, 0, MAT.lino, { surf: 'tile', lv }); ceilRect(-46, -38, -8, 0, H);
  wallX(0, -46, -38, lv, MAT.paint); wallZ(-46, -8, 0, lv, MAT.paint); wallX(-8, -46, -38, lv, MAT.paint, [[-43.2, -41.8, 2.3]]);
  box(.6, 1.1, 4, -40.2, 0, -3.5, MAT.darkWood, { solid: true, lv, cast: true }); box(.8, .05, 4.2, -40.2, 1.1, -3.5, MAT.white, {});
  IT(box(.24, .02, .32, -40.2, 1.13, -2.4, MAT.paper, { occ: false }), 'p2nurseNotes');
  IT(box(.14, .01, .1, -40.25, 1.13, -4.6, new THREE.MeshStandardMaterial({ color: 0xd8b07a }), { occ: false }), 'mem9');
  const fb = new THREE.Group(); fb.position.set(-45.85, 1.4, -5); fb.rotation.y = Math.PI / 2; add(fb);
  box(.6, .8, .15, 0, -.4, 0, MAT.steel, { parent: fb, cast: true }); W.obj.fuseSlots = [-.18, 0, .18].map(x => { const s = cyl(.03, .03, .1, x, -.05, .09, MAT.black, { parent: fb }); s.rotation.x = Math.PI / 2; return s; });
  IT(fb, 'p2fusebox');
  makeDoor('stairs2', { axis: 'x', c: -8, mid: -42.5, w: 1.4, h: 2.28, lv, dir: 1, locked: true, key: 'basementKey', name: 'stairwell door', mat: MAT.steel, lockMsg: () => Story.p2StairsMsg() });
  textPlane(['STAIRS · MORGUE', 'NO ADMITTANCE'], 1.2, .4, -42.5, 2.6, -7.9, 0, { bg: '#4a1a16', fg: '#e8d8c0', size: 40 });
  tube(-42, H, -4, 'nurse', { on: false, flick: .2 });
  lamp(-39, 2.2, -1, { name: 'nurseDesk', int: .3, dist: 4, color: 0xffcf90, size: .03 });
  // STAIRWELL  x -44..-41, z -18..-8, down to the basement
  wallZ(-44, -18, -8, [0, -1], MAT.concrete, [], { y0: BY, h: 6.6, noTrim: true }); wallZ(-41, -18, -8, [0, -1], MAT.concrete, [], { y0: BY, h: 6.6, noTrim: true });
  floorRect(-44, -41, -9.6, -8, 0, MAT.concrete, { surf: 'concrete', lv: 0 });
  W.ramps.push({ x1: -44, x2: -41, z1: -18, z2: -8.02, za: -9.6, zb: -16.6, ya: 0, yb: BY });
  for (let i = 0; i < 28; i++) { const z0 = -9.6 - i * .25, top = -(i + 1) * 3.4 / 28; box(2.96, .14, .25, -42.5, top, z0 - .125, MAT.concrete, { occ: false }); box(2.96, top + 3.4 - .001, .25, -42.5, BY, z0 - .125, MAT.concrete, { occ: false }); }
  surface(-44, -41, -18, -8, 0, 'concrete'); surface(-44, -41, -18, -8, -1, 'concrete');
  floorRect(-44, -41, -18, -16.6, BY, MAT.concrete, { surf: 'concrete', lv: -1 });
  ceilRect(-44, -41, -18, -8, H, MAT.concrete);
  lamp(-42.5, BY + 2.6, -17.3, { name: 'stairB', int: .45, dist: 7, flick: .35 });

  // ---------------- basement ----------------
  const blv = -1;
  // MORGUE  x -50..-36, z -32..-18
  floorRect(-50, -36, -32, -18, BY, MAT.htile, { surf: 'tile', lv: blv }); ceilRect(-50, -36, -32, -18, BY + 3.1, MAT.concrete);
  wallX(-18, -50, -36, blv, MAT.htile, [[-44, -41, 2.4]], { noTrim: true }); wallX(-32, -50, -36, blv, MAT.htile, [], { noTrim: true });
  wallZ(-50, -32, -18, blv, MAT.htile, [], { noTrim: true }); wallZ(-36, -32, -18, blv, MAT.htile, [[-26.6, -25.4, 2.2]], { noTrim: true });
  W.p2.drawers = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
    const i = c * 3 + r, z = -28.5 + c * 2, y = BY + .35 + r * .75;
    box(.12, .65, 1.6, -49.84, y, z, MAT.steel, { occ: false });
    const front = new THREE.Group(); front.position.set(-49.74, y, z); add(front);
    box(.06, .62, .72, 0, 0, -.4, MAT.steel, { parent: front, cast: true }); box(.06, .62, .72, 0, 0, .4, MAT.steel, { parent: front, cast: true });
    const handle = box(.05, .04, .3, .05, .5, 0, MAT.brass, { parent: front, occ: false });
    textPlane([String(i + 1)], .14, .1, .035, .45, -.62, Math.PI / 2, { bg: '#d8d2c0', fg: '#222', size: 80, parent: front });
    W.p2.drawers.push(front); IT(front, 'p2drawer' + i);
  }
  addCollider(-50, -49.3, -30, -21, blv);
  [[-43, -23.5], [-43, -28.5]].forEach(([x, z], i) => { box(1.0, .85, 2.1, x, BY, z, MAT.steel, { solid: true, lv: blv, cast: true }); });
  const body = personFigure({ scale: 1, mat: MAT.sheet, headMat: MAT.sheet }); body.position.set(-43, BY + .92, -28.5); body.rotation.x = -Math.PI / 2; body.rotation.z = Math.PI; add(body); W.obj.tableBody = body; IT(body, 'p2tableBody');
  table(-38, -20, 1.4, .7, .8, BY); addCollider(-38.75, -37.25, -20.4, -19.6, blv);
  IT(box(.24, .02, .32, -38.2, BY + .81, -20, new THREE.MeshStandardMaterial({ color: 0x6a5a3a }), { occ: false }), 'p2toeTags');
  tube(-43, BY + 3.1, -21, 'm1', { flick: .2, lv: blv }); tube(-43, BY + 3.1, -26, 'm2', { flick: .1, lv: blv }); tube(-43, BY + 3.1, -30.5, 'm3', { flick: .5, lv: blv });
  makeDoor('tunnelDoor', { axis: 'z', c: -36, mid: -26, w: 1.2, h: 2.18, lv: blv, dir: 1, name: 'door', mat: MAT.steel });
  // SERVICE TUNNEL  x -36..-4, z -27.2..-24.8
  floorRect(-36, -4, -27.2, -24.8, BY, MAT.concrete, { surf: 'concrete', lv: blv }); ceilRect(-36, -4, -27.2, -24.8, BY + 2.6, MAT.concrete);
  wallX(-27.2, -36, -4, blv, MAT.concrete, [], { h: 2.6, noTrim: true }); wallX(-24.8, -36, -4, blv, MAT.concrete, [], { h: 2.6, noTrim: true });
  cyl(.08, .08, 32, -20, BY + 2.3, -25.05, MAT.metal, { rz: Math.PI / 2 }).position.set(-20, BY + 2.3, -25.05);
  cyl(.05, .05, 32, -20, BY + 2.1, -26.95, MAT.metal, { rz: Math.PI / 2 }).position.set(-20, BY + 2.1, -26.95);
  [[-28, -26.6], [-19, -25.4], [-11, -26.6]].forEach(([x, z]) => box(.9, .8, .7, x, BY, z, MAT.darkWood, { solid: true, lv: blv, cast: true }));
  [-31, -23, -15, -7].forEach((x, i) => tube(x, BY + 2.6, -26, 't' + (i + 1), { flick: .2 + i * .05, lv: blv, int: .5 }));
  // SERVICE LIFT LOBBY  x -4..4, z -30..-22
  floorRect(-4, 4, -30, -22, BY, MAT.concrete, { surf: 'concrete', lv: blv }); ceilRect(-4, 4, -30, -22, BY + 2.8, MAT.concrete);
  wallZ(-4, -30, -22, blv, MAT.concrete, [[-27.2, -24.8, 2.6]], { noTrim: true, h: 2.8 }); wallX(-30, -4, 4, blv, MAT.concrete, [], { noTrim: true, h: 2.8 }); wallX(-22, -4, 4, blv, MAT.concrete, [], { noTrim: true, h: 2.8 });
  wallZ(4, -30, -22, blv, MAT.steel, [[-27.2, -24.8, 2.4]], { noTrim: true, h: 2.8 });
  W.p2.liftB = liftCar(4, -26, BY, blv, 1);
  IT(box(.06, .3, .16, 3.9, BY + 1.2, -28, new THREE.MeshStandardMaterial({ color: 0x8a1a17, emissive: 0x2a0606 }), { occ: false }), 'p2liftBtn');
  tube(0, BY + 2.8, -26, 'lift', { flick: .3, lv: blv });
  // DAYROOM  x 14..30, z -20..-6 (reached by the lift)
  floorRect(14, 30, -20, -6, 0, MAT.wood, { surf: 'wood', lv }); ceilRect(14, 30, -20, -6, H);
  wallZ(30, -20, -6, lv, MAT.wallPink); wallX(-20, 14, 30, lv, MAT.wallPink); wallX(-6, 14, 30, lv, MAT.wallPink, [[22, 24.4, 2.4]]);
  wallZ(14, -20, -6, lv, MAT.wallPink, [[-14.2, -11.8, 2.4]]);
  W.p2.liftT = liftCar(14, -13, 0, lv, -1);
  [-16, -10].forEach(z => windowDecor(29.92, 1.7, z, -Math.PI / 2, 1.4, 1.5, null, { lv, int: .3, mat: new THREE.MeshBasicMaterial({ color: 0x2a3446 }) }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; chair(21 + Math.cos(a) * 2.4, -13 + Math.sin(a) * 2.4, -a - Math.PI / 2, 0); }
  table(18, -18, 1.4, .8, .76, 0); addCollider(17.25, 18.75, -18.45, -17.55, lv);
  const piano = box(1.5, 1.2, .6, 16, 0, -8, MAT.darkWood, { solid: true, lv, cast: true });
  const mar = new THREE.Group(); mar.position.set(27.8, 0, -13); mar.rotation.y = Math.PI / 2; add(mar);
  const ac = new THREE.Group(); mar.add(ac); box(.8, .42, .8, 0, 0, 0, MAT.fabricRed, { parent: ac, cast: true }); box(.8, .7, .18, 0, .42, -.32, MAT.fabricRed, { parent: ac, cast: true });
  const marg = personFigure({ seated: true, scale: .92, color: 0x5a6a8a, hair: 0xcfcac0, headMat: new THREE.MeshStandardMaterial({ color: 0xc8b49a, roughness: .9 }) }); marg.position.set(0, -.04, .02); mar.add(marg);
  addCollider(27.3, 28.3, -13.5, -12.5, lv); W.obj.margaret = mar; W.obj.margHead = marg.userData.head; IT(mar, 'p2margaret');
  const girl = personFigure({ scale: .72, color: 0xc8a43a, hair: 0x1f1610 }); girl.position.set(29.1, 0, -16); girl.rotation.y = -Math.PI / 2; add(girl); W.obj.girl = girl; IT(girl, 'p2girl');
  const mb2 = new THREE.Group(); mb2.position.set(26.6, .76, -11.4); add(mb2); box(.22, .12, .16, 0, 0, 0, MAT.darkWood, { parent: mb2, cast: true }); box(.23, .03, .17, 0, .12, 0, MAT.frame, { parent: mb2 }); table(26.6, -11.4, .6, .6, .76, 0); W.obj.p2box = mb2;
  lamp(26, H - .3, -9.5, { name: 'day2', int: .6, dist: 9, color: 0xffd9a8, flick: .03 }); lamp(22, H - .2, -13, { name: 'day1', int: 1.0, dist: 12, color: 0xffd9a8, flick: .05 }); lamp(27, 1.4, -11, { name: 'dayLamp', int: .5, dist: 5, color: 0xffc080, size: .04 });
  cyl(.02, .02, 1.3, 27, 0, -11, MAT.brass); cyl(.12, .18, .22, 27, 1.3, -11, new THREE.MeshStandardMaterial({ color: 0xd8c39a, emissive: 0x3a2a12, side: THREE.DoubleSide }), { open: true });
  // fire-exit corridor from the dayroom to the front
  floorRect(22, 24.4, -6, 4.1, 0, MAT.lino, { surf: 'tile', lv }); ceilRect(22, 24.4, -6, 4.1, H);
  wallZ(22, -6, 4.04, lv, MAT.paint); wallZ(24.4, -6, 4.04, lv, MAT.paint);
  makeDoor('fireExit', { axis: 'x', c: 4.12, mid: 23.2, w: 1.15, h: 2.18, lv, dir: -1, locked: true, name: 'fire exit', mat: MAT.steel, lockMsg: 'FIRE EXIT. Chained from the outside.' });
  textPlane(['EXIT'], .5, .18, 23.2, 2.5, 3.9, Math.PI, { bg: '#123a1e', fg: '#9fe3a8', size: 90 });
  tube(23.2, H, -1, 'fire', { flick: .3 });

  // decay
  if (!DECAL.web) buildDecals();
  decorateRoom(-6, 6, -8, 4, 0, H, { papers: 4, grime: 5 });
  decorateRoom(6, 12, -8, -2, 0, H, { papers: 6 });
  decorateRoom(-38, -6, -4.4, -2, 0, H, { stains: 4, streaks: 4, grime: 8, papers: 4 });
  Object.values(W.p2rooms).forEach(r => decorateRoom(r.x1, r.x2, r.z1, r.z2, 0, H, { papers: 1, grime: 2, stains: 1, streaks: 1 }));
  decorateRoom(-46, -38, -8, 0, 0, H, { papers: 5 });
  decorateRoom(-50, -36, -32, -18, BY, 3.1, { stains: 3, streaks: 4, grime: 6, papers: 2, webChance: 1 });
  decorateRoom(-36, -4, -27.2, -24.8, BY, 2.6, { stains: 2, streaks: 3, grime: 6, papers: 1, webChance: 1 });
  decorateRoom(14, 30, -20, -6, 0, H, { papers: 1, grime: 1, stains: 1, streaks: 0, crack: 0 });
}
// a lift car with two sliding doors; side +1 = car extends to +x of the door line, -1 = to -x
function liftCar(c, mid, y0, lv, side) {
  const x1 = side > 0 ? c : c - 2.4, x2 = side > 0 ? c + 2.4 : c;
  floorRect(x1, x2, mid - 1.2, mid + 1.2, y0, MAT.steel, { surf: 'concrete', lv }); ceilRect(x1, x2, mid - 1.2, mid + 1.2, y0 + 2.5, MAT.steel);
  wallX(mid - 1.2, x1, x2, lv, MAT.steel, [], { y0, h: 2.6, noTrim: true }); wallX(mid + 1.2, x1, x2, lv, MAT.steel, [], { y0, h: 2.6, noTrim: true });
  wallZ(side > 0 ? x2 : x1, mid - 1.2, mid + 1.2, lv, MAT.steel, [], { y0, h: 2.6, noTrim: true });
  const L = box(.06, 2.4, 1.2, c, y0, mid - .6, MAT.steel, { cast: true }), R = box(.06, 2.4, 1.2, c, y0, mid + .6, MAT.steel, { cast: true });
  const col = addCollider(c - .06, c + .06, mid - 1.2, mid + 1.2, lv);
  lamp((x1 + x2) / 2, y0 + 2.4, mid, { int: .45, dist: 4, color: 0xfff0d8, size: .03, lv });
  const lift = { L, R, col, open: 0, target: 0, mid, inside: () => P.lv === lv && P.pos.x > x1 + .2 && P.pos.x < x2 - .2 && Math.abs(P.pos.z - mid) < 1.1,
    set(v) { this.target = v; } };
  W.updaters.push(dt => { const s = dt * 1.2; lift.open += clamp(lift.target - lift.open, -s, s); L.position.z = mid - .6 - lift.open * 1.1; R.position.z = mid + .6 + lift.open * 1.1; col.on = lift.open < .8; return true; });
  return lift;
}
