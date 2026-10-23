// =====================================================================
//  WORLD — the house, the garden, the basement and the memory room
// =====================================================================
function IT(obj, id, extra) { const d = Object.assign({}, Story.defs[id] || { prompt: () => 'Examine', use: () => {} }, extra || {}); d.id = id; return interactive(obj, d); }

// ---------- furniture ----------
function chair(x, z, ry, y0, parent, mat) {
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; add(g, parent);
  const m = mat || MAT.darkWood;
  box(.46, .05, .46, 0, .45, 0, m, { parent: g, cast: true, occ: false });
  [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([a, b]) => box(.04, .45, .04, a, 0, b, m, { parent: g, occ: false }));
  box(.46, .55, .04, 0, .5, -.21, m, { parent: g, cast: true, occ: false });
  return g;
}
function table(x, z, w, d, h, y0, parent, mat) {
  const g = new THREE.Group(); g.position.set(x, y0, z); add(g, parent);
  const m = mat || MAT.darkWood;
  const top = box(w, .06, d, 0, h - .06, 0, m, { parent: g, cast: true });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.07, h - .06, .07, a * (w / 2 - .08), 0, b * (d / 2 - .08), m, { parent: g, occ: false }));
  g.userData.top = top; return g;
}
function framedPicture(canvas, w, h, x, y, z, ry, parent, opt = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; add(g, parent);
  const fw = opt.frame == null ? .05 : opt.frame;
  if (fw) { box(w + fw * 2, h + fw * 2, .04, 0, -h / 2 - fw, -.02, MAT.frame, { parent: g, occ: false }); }
  const c = makeCanvas(canvas.width, canvas.height); c.getContext('2d').drawImage(canvas, 0, 0);
  const tex = texFrom(c, false);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .6 });
  const pm = plane(w, h, 0, 0, .003, mat, { parent: g });
  if (opt.rz) g.rotation.z = opt.rz;
  const P = { g, mesh: pm, canvas: c, tex, set(cv) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(cv, 0, 0, c.width, c.height); tex.needsUpdate = true; } };
  return P;
}
function windowDecor(x, y, z, ry, w, h, parent, opt = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; add(g, parent);
  const glassMat = opt.mat || MAT.window;
  plane(w, h, 0, 0, 0, glassMat, { parent: g });
  box(w + .16, .08, .12, 0, -h / 2 - .08, .02, MAT.darkWood, { parent: g, occ: false });
  box(w + .16, .08, .1, 0, h / 2, .02, MAT.darkWood, { parent: g, occ: false });
  box(.08, h, .1, -w / 2 - .04, -h / 2, .02, MAT.darkWood, { parent: g, occ: false }); box(.08, h, .1, w / 2 + .04, -h / 2, .02, MAT.darkWood, { parent: g, occ: false });
  box(.04, h, .05, 0, -h / 2, .01, MAT.darkWood, { parent: g, occ: false }); box(w, .04, .05, 0, -.02, .01, MAT.darkWood, { parent: g, occ: false });
  if (opt.curtains !== false) { const cm = opt.curtainMat || MAT.fabricRed; box(.32, h + .5, .06, -w / 2 - .12, -h / 2 - .35, .12, cm, { parent: g, occ: false }); box(.32, h + .5, .06, w / 2 + .12, -h / 2 - .35, .12, cm, { parent: g, occ: false }); }
  if (opt.shaft !== false) { // cold light shaft
    const sc = makeCanvas(64, 128), sctx = sc.getContext('2d'); const gr = sctx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(150,175,215,.55)'); gr.addColorStop(1, 'rgba(150,175,215,0)'); sctx.fillStyle = gr; sctx.fillRect(0, 0, 64, 128);
    const sm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const shaft = plane(w, 2.6, 0, -h / 2 - .55, 1.1, sm, { parent: g, rx: -1.1 }); shaft.rotation.x = -1.05;
  }
  if (opt.light !== false) lamp(x + Math.sin(ry) * .6, y - .3, z + Math.cos(ry) * .6, { color: 0x7f97c8, int: opt.int || .35, dist: 6, bulb: false, parent, lv: opt.lv });
  return g;
}
// seated / standing human figure (memory people)
function personFigure(o) {
  const g = new THREE.Group(); const s = o.scale || 1;
  const mat = o.mat || new THREE.MeshStandardMaterial({ color: o.color || 0x3a3229, roughness: .9 });
  const headMat = o.headMat || MAT.black;
  const seated = o.seated;
  if (seated) {
    cyl(.17 * s, .2 * s, .62 * s, 0, .5, 0, mat, { parent: g, cast: true });
    box(.34 * s, .14 * s, .45 * s, 0, .43, .16, mat, { parent: g, occ: false });
    box(.3 * s, .45, .1, 0, 0, .36, mat, { parent: g, occ: false });
  } else {
    cyl(.15 * s, .19 * s, .7 * s, 0, .8 * s, 0, mat, { parent: g, cast: true });
    cyl(.14 * s, .1 * s, .82 * s, 0, 0, 0, mat, { parent: g });
  }
  const hy = seated ? .5 + .62 * s + .14 * s : 1.5 * s + .14 * s;
  const head = sph(.13 * s, 0, hy, 0, headMat, { parent: g, sy: 1.12, sx: 1 }); g.userData.head = head;
  if (o.hair) sph(.135 * s, 0, hy + .02, -.02, new THREE.MeshStandardMaterial({ color: o.hair, roughness: 1 }), { parent: g, sx: 1.02, sy: 1.1 });
  [-1, 1].forEach(sd => { const a = cyl(.045 * s, .04 * s, .55 * s, sd * .2 * s, (seated ? .55 : .86 * s), seated ? .14 : 0, mat, { parent: g }); a.rotation.x = seated ? -.9 : 0; });
  return g;
}

// ---------- the living room (also rebuilt as the memory) ----------
function buildLivingRoom(ox, oz, y0, lv, variant) {
  const memory = variant === 'memory';
  const X = x => x + ox, Z = z => z + oz;
  floorRect(X(2), X(10), Z(-6), Z(4), y0, MAT.wood, { surf: 'wood', lv });
  box(4.4, .02, 3.4, X(6.4), y0, Z(-1), MAT.carpet, { occ: false }); surface(X(4.2), X(8.6), Z(-2.7), Z(.7), lv, 'carpet');
  ceilRect(X(2), X(10), Z(-6), Z(4), y0 + 3.15);
  if (memory) {
    wallX(Z(-6), X(2), X(10), lv, MAT.wallRed, [], { y0 });
    wallZ(X(2), Z(-6), Z(4), lv, MAT.wallRed, [[Z(.5), Z(2), 2.4]], { y0 });
    box(.1, 2.4, 1.6, X(1.75), y0, Z(1.25), MAT.black, { occ: true }); // doorway to nowhere
    addCollider(X(1.6), X(1.9), Z(.4), Z(2.1), lv);
    wallX(Z(4), X(2), X(10), lv, MAT.wallRed, [[X(5), X(7), 2.25]], { y0 }); // the way in
    doorFrame('x', Z(4), X(5), X(7), y0, 2.25);
    wallZ(X(10), Z(-6), Z(4), lv, MAT.wallRed, [], { y0 });
  }
  // fireplace on east wall
  box(.5, 1.25, 2.2, X(9.72), y0, Z(-1), MAT.stone, { solid: true, lv, cast: true });
  box(.62, .08, 2.5, X(9.66), y0 + 1.25, Z(-1), MAT.darkWood, {});
  box(.3, .75, 1.1, X(9.55), y0, Z(-1), MAT.black, { occ: false });
  // mantel clock
  const clock = new THREE.Group(); clock.position.set(X(9.62), y0 + 1.33, Z(-1)); add(clock);
  box(.16, .34, .3, 0, 0, 0, MAT.darkWood, { parent: clock, cast: true });
  const cf = new THREE.Mesh(new THREE.CircleGeometry(.1, 20), MAT.porcelain); cf.position.set(-.085, .2, 0); cf.rotation.y = -Math.PI / 2; clock.add(cf);
  const hand1 = box(.005, .08, .012, -.09, .2, 0, MAT.black, { parent: clock, occ: false }); hand1.geometry.translate(0, .04, 0); hand1.position.y = .2; hand1.rotation.x = -(9.25 / 12) * TAU;
  const hand2 = box(.005, .06, .012, -.09, .2, 0, MAT.black, { parent: clock, occ: false }); hand2.geometry.translate(0, .03, 0); hand2.position.y = .2; hand2.rotation.x = -(14 / 60) * TAU;
  if (!memory) { W.obj.clock = clock; W.obj.clockHands = [hand1, hand2]; IT(clock, 'clock'); }
  // mantel photographs
  const mp = [
    drawPhoto({ w: 200, h: 250, bg: 'garden', tree: .1, people: [{ x: .4, kind: 'man' }, { x: .6, kind: 'woman' }], caption: 'A. & M.' }),
    drawPhoto({ w: 250, h: 200, bg: 'garden', tree: .7, people: [{ x: .25, kind: 'man' }, { x: .42, kind: 'woman' }, { x: .6, kind: 'boy' }, { x: .76, kind: 'girl', scratched: !memory }], caption: '' }),
    drawPhoto({ w: 200, h: 250, bg: 'garden', tree: .5, people: [{ x: .5, kind: 'boy', smile: true }], caption: 'Tom' }),
  ];
  const mpos = [[Z(-1.85), .26, .32, 0], [Z(-.45), .3, .24, 1], [Z(.12), .2, .25, 2]];
  mpos.forEach(([z, w, h, i]) => {
    const p = framedPicture(mp[i], w * .8, h * .8, X(9.62), y0 + 1.33 + h * .8 / 2 + .05, z, -Math.PI / 2 + .25 * (i - 1));
    if (!memory) { IT(p.g, 'mantel' + i); W.portraits['mantel' + i] = p; }
  });
  // sofa (or the dinner table in the memory)
  if (!memory) {
    const sofa = new THREE.Group(); sofa.position.set(X(5.9), y0, Z(-1)); add(sofa);
    box(.9, .42, 2.3, 0, 0, 0, MAT.fabric, { parent: sofa, cast: true });
    box(.25, .55, 2.3, -.33, .42, 0, MAT.fabric, { parent: sofa, cast: true });
    box(.9, .3, .22, 0, .42, -1.04, MAT.fabric, { parent: sofa }); box(.9, .3, .22, 0, .42, 1.04, MAT.fabric, { parent: sofa });
    addCollider(X(5.45), X(6.35), Z(-2.15), Z(.15), lv);
    // armchair (it moves)
    const arm = new THREE.Group(); arm.position.set(X(8.2), y0, Z(2.6)); arm.rotation.y = -2.4; add(arm);
    box(.8, .4, .8, 0, 0, 0, MAT.fabricRed, { parent: arm, cast: true }); box(.8, .6, .2, 0, .4, -.32, MAT.fabricRed, { parent: arm, cast: true });
    box(.16, .25, .8, -.34, .4, 0, MAT.fabricRed, { parent: arm }); box(.16, .25, .8, .34, .4, 0, MAT.fabricRed, { parent: arm });
    W.obj.armchair = arm; W.obj.armCol = addCollider(X(7.8), X(8.6), Z(2.2), Z(3.0), lv);
    IT(arm, 'armchair');
    // coffee table
    table(X(7.4), Z(-1), .7, 1.2, .45, y0, null, MAT.darkWood);
    // TV
    const tv = new THREE.Group(); tv.position.set(X(9.1), y0, Z(-5.1)); tv.rotation.y = -.75; add(tv);
    box(.8, .55, .55, 0, 0, 0, MAT.darkWood, { parent: tv, cast: true });
    box(.72, .58, .55, 0, .55, 0, new THREE.MeshStandardMaterial({ color: 0x2b2620, roughness: .5 }), { parent: tv, cast: true });
    W.tvRT = new THREE.WebGLRenderTarget(256, 192);
    const tvMat = new THREE.ShaderMaterial({
      uniforms: { img: { value: W.tvRT.texture }, on: { value: 0 }, time: { value: 0 }, mixImg: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D img; uniform float on,time,mixImg; varying vec2 vUv; float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}
        void main(){ vec2 uv=vUv; vec2 d=uv-.5; float bulge=1.-dot(d,d)*.6; float n=h(floor(uv*vec2(160.,120.))+fract(time*13.)*91.);
        vec3 im=texture2D(img,uv+vec2(sin(uv.y*80.+time*30.)*.003,0.)).rgb; float l=dot(pow(im,vec3(.6)),vec3(.3,.59,.11))*1.6;
        float scan=.75+.25*sin(uv.y*400.); vec3 col=mix(vec3(n),vec3(l*.95,l,l*1.05),mixImg)*scan*bulge*on;
        col+=vec3(.02,.025,.03)*(1.-on); gl_FragColor=vec4(col,1.); }`
    });
    const scr = plane(.56, .42, 0, .84, .28, tvMat, { parent: tv }); W.obj.tvMat = tvMat; W.obj.tv = tv;
    IT(tv, 'tv');
    // writing desk with drawers
    const desk = new THREE.Group(); desk.position.set(X(4.2), y0, Z(-5.6)); add(desk);
    box(1.3, .76, .55, 0, 0, 0, MAT.darkWood, { parent: desk, cast: true }); addCollider(X(3.55), X(4.85), Z(-5.9), Z(-5.3), lv);
    for (let i = 0; i < 3; i++) { const dr = box(.36, .2, .03, -.42 + i * .42, .45, .28, MAT.darkWood, { parent: desk }); const kn = sph(.02, -.42 + i * .42, .55, .31, MAT.brass, { parent: desk }); IT(dr, 'drawer' + i); W.obj['drawer' + i] = dr; }
    box(.9, .5, .3, 0, .76, -.12, MAT.darkWood, { parent: desk });
    IT(box(.22, .015, .3, .3, .76, .1, MAT.paper, { parent: desk }), 'deskPapers');
    // bookcase on south wall
    const bc = new THREE.Group(); bc.position.set(X(3.6), y0, Z(3.75)); add(bc);
    box(1.4, 2.1, .4, 0, 0, 0, MAT.darkWood, { parent: bc, cast: true }); addCollider(X(2.9), X(4.3), Z(3.55), Z(3.95), lv);
    for (let s = 0; s < 4; s++) for (let b = 0; b < 9; b++) if (Math.random() < .8) box(.1, rand(.22, .32), .26, -.55 + b * .13, .12 + s * .5, -.05, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rand(0, .12), .35, rand(.1, .22)), roughness: .9 }), { parent: bc, occ: false });
    IT(bc, 'bookcase');
    // floor lamp
    cyl(.02, .02, 1.5, X(4.6), y0, Z(2.8), MAT.brass); cyl(.12, .2, .25, X(4.6), y0 + 1.42, Z(2.8), new THREE.MeshStandardMaterial({ color: 0xc9b48a, emissive: 0x3a2a12, roughness: 1, side: THREE.DoubleSide }), { open: true });
    W.obj.livingLamp = lamp(X(4.6), y0 + 1.45, Z(2.8), { int: .75, dist: 7, name: 'livingLamp', size: .04 });
    // memory 2: drawing behind the sofa
    const dr2 = plane(.3, .24, X(5.1), y0 + .012, Z(-1.6), new THREE.MeshStandardMaterial({ map: texFrom(drawCrayon({ kind: 'house', stage: 1 }), false), roughness: 1 }), { rx: -Math.PI / 2 }); dr2.rotation.z = .4;
    IT(dr2, 'mem2');
    // window
    windowDecor(X(7), y0 + 1.7, Z(3.9), Math.PI, 1.4, 1.5, null, { lv });
    // boarded kitchen door on north wall
    box(1.0, 2.2, .06, X(8), y0, Z(-5.88), MAT.door, {});
    for (let i = 0; i < 3; i++) box(1.25, .14, .04, X(8), y0 + .5 + i * .6, Z(-5.83), MAT.darkWood, { rz: rand(-.25, .25), occ: false });
    IT(box(1.0, 2.2, .1, X(8), y0, Z(-5.86), MAT.door, {}), 'kitchenDoor');
    W.obj.livingCeil = lamp(X(6), y0 + 2.85, Z(-1), { int: .85, dist: 9, name: 'living', flick: .06 });
    cyl(.01, .01, .3, X(6), y0 + 2.85, Z(-1), MAT.iron); cyl(.05, .25, .18, X(6), y0 + 2.8, Z(-1), new THREE.MeshStandardMaterial({ color: 0x7a6a50, side: THREE.DoubleSide }), { open: true });
  } else {
    // ---- the memory: the family at the table, the last night ----
    const t = table(X(6), Z(-1), 1.3, 2.6, .76, y0, null, MAT.darkWood); addCollider(X(5.35), X(6.65), Z(-2.3), Z(.3), lv);
    box(1.35, .005, 2.65, X(6), y0 + .76, Z(-1), MAT.sheet, { occ: false });
    const seats = [[X(6), Z(-2.75), 0], [X(5.15), Z(-1.6), Math.PI / 2], [X(5.15), Z(-.4), Math.PI / 2], [X(6.85), Z(-.4), -Math.PI / 2], [X(6.85), Z(-1.6), -Math.PI / 2], [X(6), Z(.75), Math.PI]];
    seats.forEach(([x, z, r]) => chair(x, z, r, y0));
    for (let i = 0; i < seats.length; i++) { const [x, z] = seats[i]; const px = lerp(x, X(6), .45), pz = lerp(z, Z(-1), .35); cyl(.13, .11, .02, px, y0 + .765, pz, MAT.porcelain); }
    const sepia = new THREE.MeshStandardMaterial({ color: 0x8c7356, roughness: .95, emissive: 0x1a120a });
    const arthur = personFigure({ seated: true, mat: sepia, headMat: new THREE.MeshStandardMaterial({ color: 0xb59b78, roughness: .9, emissive: 0x20160c }), hair: 0x9c917c });
    arthur.position.set(X(6), y0, Z(-2.75)); add(arthur); W.obj.arthur = arthur; IT(arthur, 'arthur');
    const fam = [
      { s: 1, color: 0x1c1a24, at: 1, name: 'margaret', hair: 0x120d09 }, { s: .78, color: 0x1a1814, at: 3, name: 'thomas' }, { s: .74, color: 0x5a4a1a, at: 2, name: 'elena', hair: 0x140e0a }
    ];
    fam.forEach(f => { const p = personFigure({ seated: true, scale: f.s, color: f.color, hair: f.hair }); const [x, z, r] = seats[f.at]; p.position.set(x, y0, z); p.rotation.y = r; add(p); W.obj['fam_' + f.name] = p; IT(p, 'fam_' + f.name); });
    // the music box on the table
    const mb = new THREE.Group(); mb.position.set(X(6), y0 + .77, Z(-1)); add(mb);
    box(.22, .12, .16, 0, 0, 0, MAT.darkWood, { parent: mb, cast: true }); box(.23, .03, .17, 0, .12, 0, MAT.frame, { parent: mb });
    W.obj.tableMusicBox = mb; IT(mb, 'tableMusicBox');
    // candles
    [-.5, .5].forEach(dz => { cyl(.025, .025, .22, X(6), y0 + .77, Z(-1) + dz, MAT.porcelain); sph(.018, X(6), y0 + 1.01, Z(-1) + dz, new THREE.MeshBasicMaterial({ color: 0xffc070 })); });
    W.obj.repCandle = lamp(X(6), y0 + 1.1, Z(-1), { int: 1.1, dist: 7, color: 0xffb060, bulb: false, flick: .35, name: 'repCandle', always: false });
    W.obj.repLamp = lamp(X(6), y0 + 2.8, Z(-1), { int: .35, dist: 9, color: 0xffcf90, name: 'rep' });
    windowDecor(X(8.6), y0 + 1.7, Z(3.9), Math.PI, 1.0, 1.5, null, { lv, mat: new THREE.MeshBasicMaterial({ color: 0x0c0e12 }), light: false, shaft: false, curtains: false });
  }
}

// ---------- exterior ----------
function buildExterior() {
  W.ext = new THREE.Group(); W.scene.add(W.ext);
  const E = W.ext;
  // ground
  box(80, .1, 60, 0, -.1, 22, MAT.grass, { parent: E, occ: true });
  box(2.2, .02, 23.6, 0, 0, 16.2, MAT.gravel, { parent: E, occ: false });
  box(5.4, .12, 2.4, 0, -.1, 5.2, MAT.wood, { parent: E }); surface(-2.7, 2.7, 4, 6.4, 0, 'wood');
  // fence + gate
  const post = (x, z) => box(.12, 1.2, .12, x, 0, z, MAT.darkWood, { parent: E, cast: true, occ: false });
  for (let z = 4.5; z <= 30; z += 2.2) { post(-16, z); post(16, z); }
  for (let x = -16; x <= 16; x += 2.2) if (Math.abs(x) > 1.5) post(x, 30);
  [[-16, 4, 30, 'z'], [16, 4, 30, 'z']].forEach(([c, a, b]) => { box(.05, .08, b - a, c, .9, (a + b) / 2, MAT.darkWood, { parent: E, occ: false }); box(.05, .08, b - a, c, .45, (a + b) / 2, MAT.darkWood, { parent: E, occ: false }); });
  [[-16, -1.5], [1.5, 16]].forEach(([a, b]) => { box(b - a, .08, .05, (a + b) / 2, .9, 30, MAT.darkWood, { parent: E, occ: false }); box(b - a, .08, .05, (a + b) / 2, .45, 30, MAT.darkWood, { parent: E, occ: false }); });
  const gate = box(1.4, 1.0, .05, -1.9, .15, 31.2, MAT.darkWood, { parent: E, ry: 1.2, occ: false });
  addCollider(-16.3, -15.7, 4, 30.5, 0); addCollider(15.7, 16.3, 4, 30.5, 0); addCollider(-16.3, 16.3, 29.1, 29.5, 0);
  addCollider(-16.3, -13.1, 3.9, 4.2, 0); addCollider(10.1, 16.3, 3.9, 4.2, 0);
  IT(box(3, 1.4, .3, 0, 0, 29.6, new THREE.MeshBasicMaterial({ visible: false }), { parent: E, occ: false }), 'road');
  // house shell (seen from outside)
  const S = W.shell = new THREE.Group(); W.scene.add(S);
  wallX(4.12, -13.25, 10.25, 0, MAT.siding, [[-.62, .62, 2.3]], { y0: 0, h: 6.6, parent: S, noTrim: true });
  wallZ(-13.25, -14.25, 4.2, 0, MAT.siding, [], { y0: 0, h: 6.6, parent: S, noCol: true, noTrim: true });
  wallZ(10.25, -14.25, 4.2, 0, MAT.siding, [], { y0: 0, h: 6.6, parent: S, noCol: true, noTrim: true });
  wallX(-14.25, -13.25, 10.25, 0, MAT.siding, [], { y0: 0, h: 6.6, parent: S, noCol: true, noTrim: true });
  const roofL = box(24.2, .25, 10.6, -1.5, 6.4, -.3, MAT.roof, { parent: S, rx: -.62, occ: false }); roofL.position.set(-1.5, 8.0, 1.6);
  const roofR = box(24.2, .25, 10.6, -1.5, 6.4, -8.3, MAT.roof, { parent: S, rx: .62, occ: false }); roofR.position.set(-1.5, 8.0, -12.1);
  // gable fills
  [-13.25, 10.25].forEach(x => { const sh = new THREE.Shape(); sh.moveTo(-9.3, 0); sh.lineTo(9.3, 0); sh.lineTo(0, 3.1); sh.lineTo(-9.3, 0); const gm = new THREE.Mesh(new THREE.ShapeGeometry(sh), MAT.siding); gm.position.set(x, 6.6, -5); gm.rotation.y = Math.PI / 2; gm.material.side = THREE.DoubleSide; S.add(gm); });
  box(.6, 2.4, .6, 6, 8, -6, new THREE.MeshStandardMaterial({ color: 0x4a2f28, roughness: 1 }), { parent: S, occ: false }); // chimney
  // facade windows
  const winMat = MAT.window, lit = new THREE.MeshBasicMaterial({ color: 0x6d5a3e });
  [[7, 1.9], [-8, 1.9], [-4.5, 1.9], [6, 5.0], [0, 5.0]].forEach(([x, y]) => windowDecor(x, y, 4.2, 0, 1.2, 1.4, S, { light: false, shaft: false, curtains: false }));
  W.obj.elenaWinOutside = windowDecor(-6.5, 5.0, 4.2, 0, 1.2, 1.4, S, { light: false, shaft: false, curtains: false, mat: lit });
  // porch roof + posts
  box(5.6, .14, 2.6, 0, 3.0, 5.25, MAT.darkWood, { parent: E, occ: false });
  [-2.4, 2.4].forEach(x => cyl(.09, .09, 3.0, x, 0, 6.3, MAT.darkWood, { parent: E, solid: true, cast: true }));
  // porch light
  box(.16, .26, .16, .95, 2.32, 4.28, MAT.iron, { parent: E, occ: false });
  W.obj.porchLamp = lamp(.95, 2.45, 4.38, { int: 1.6, dist: 8, flick: .55, name: 'porch', color: 0xffc98a, size: .05 });
  // flower pots, doormat
  [[-1.7, 4.65], [1.75, 4.6], [2.55, 5.5]].forEach(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, 0, z); E.add(g); cyl(.2, .14, .32, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x5a3324, roughness: .9 }), { parent: g, cast: true }); sph(.13, 0, .36, 0, MAT.leafDark, { parent: g, sy: .5 }); IT(g, 'pot' + i); });
  IT(box(1.0, .02, .6, 0, .01, 4.55, MAT.fabricRed, { parent: E, occ: false }), 'doormat');
  // the oak & swing (memory 1)
  const oak = new THREE.Group(); oak.position.set(-8, 0, 16); E.add(oak);
  cyl(.38, .55, 4.2, 0, 0, 0, MAT.bark, { parent: oak, cast: true }); addCollider(-8.55, -7.45, 15.45, 16.55, 0);
  [[1.6, 3.6, .4, .9], [-1.4, 3.9, -.3, -.8], [.3, 4.2, 1.3, .2], [.6, 3.3, -1.2, .1]].forEach(([dx, y, dz, rz]) => { const b = cyl(.12, .2, 2.6, dx * .5, y - .4, dz * .5, MAT.bark, { parent: oak }); b.rotation.z = rz; b.rotation.x = dz * .4; });
  [[0, 6, 0, 2.6], [1.8, 5.2, .6, 1.8], [-1.6, 5.4, -.5, 1.9], [.4, 5.0, 1.6, 1.7], [-.4, 5.2, -1.6, 1.6]].forEach(([x, y, z, r]) => sph(r, x, y, z, MAT.leafDark, { parent: oak, sy: .7, seg: 9 }));
  const sw = new THREE.Group(); sw.position.set(-6.6, 0, 16); E.add(sw);
  cyl(.012, .012, 3.3, -.3, .55, 0, MAT.paper, { parent: sw }); cyl(.012, .012, 3.3, .3, .55, 0, MAT.paper, { parent: sw });
  box(.75, .05, .3, 0, .52, 0, MAT.darkWood, { parent: sw, cast: true }); W.obj.swing = sw;
  IT(sw, 'mem1');
  // stone angel + the spare key
  const ang = new THREE.Group(); ang.position.set(8.5, 0, 13.5); ang.rotation.y = -.6; E.add(ang);
  box(.8, .5, .8, 0, 0, 0, MAT.stone, { parent: ang, cast: true }); addCollider(8.0, 9.0, 13.0, 14.0, 0);
  cyl(.18, .32, 1.15, 0, .5, 0, MAT.stone, { parent: ang, cast: true }); sph(.14, 0, 1.78, .06, MAT.stone, { parent: ang });
  box(.08, .9, .55, -.22, 1.0, -.25, MAT.stone, { parent: ang, rx: .5, rz: .3, occ: false }); box(.08, .9, .55, .22, 1.0, -.25, MAT.stone, { parent: ang, rx: .5, rz: -.3, occ: false });
  box(.3, .12, .1, 0, 1.25, .17, MAT.stone, { parent: ang, occ: false });
  IT(ang, 'angel');
  const key = new THREE.Group(); key.position.set(8.2, .52, 13.9); E.add(key);
  box(.12, .012, .03, 0, 0, 0, MAT.brass, { parent: key }); const kr = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 6, 12), MAT.brass); kr.rotation.x = Math.PI / 2; kr.position.x = -.08; key.add(kr);
  W.obj.frontKey = key; IT(key, 'frontKey');
  // mailbox with the solicitor's letter
  const mbx = new THREE.Group(); mbx.position.set(2.3, 0, 27.2); E.add(mbx);
  box(.08, 1.05, .08, 0, 0, 0, MAT.darkWood, { parent: mbx }); box(.28, .26, .45, 0, 1.05, 0, MAT.metal, { parent: mbx, cast: true });
  box(.02, .14, .06, .15, 1.25, .1, new THREE.MeshStandardMaterial({ color: 0x6a1d18 }), { parent: mbx, occ: false });
  IT(mbx, 'mailbox');
  // trees, bushes, distant woods
  const deadTree = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, 0, z); E.add(g); cyl(.1, .22, h, 0, 0, 0, MAT.bark, { parent: g, cast: true }); for (let i = 0; i < 5; i++) { const b = cyl(.03, .07, h * .45, 0, h * rand(.45, .8), 0, MAT.bark, { parent: g }); b.rotation.z = rand(-1.1, 1.1); b.rotation.y = rand(0, TAU); } };
  [[12, 20, 5], [-13, 25, 6], [13, 8, 4.5], [-12, 8, 5], [6, 25, 4]].forEach(a => { deadTree(...a); addCollider(a[0] - .3, a[0] + .3, a[1] - .3, a[1] + .3, 0); });
  for (let i = 0; i < 26; i++) { const x = (Math.random() < .5 ? -1 : 1) * rand(3, 15), z = rand(6, 28); if (Math.abs(x) < 2.5 && z < 8) continue; sph(rand(.4, .9), x, rand(.1, .3), z, Math.random() < .5 ? MAT.leaf : MAT.leafDark, { parent: E, sy: rand(.5, .8), seg: 7 }); }
  for (let i = 0; i < 40; i++) { const a = rand(-1.2, 1.2) + (Math.random() < .5 ? 0 : Math.PI), r = rand(36, 48); const x = Math.sin(a) * r, z = 14 + Math.cos(a) * r; const h = rand(6, 12); const c = new THREE.Mesh(new THREE.ConeGeometry(rand(1.5, 2.5), h, 6), MAT.leafDark); c.position.set(x, h / 2, z); E.add(c); }
  for (let x = -30; x <= 30; x += 4) { if (Math.abs(x) < 3) continue; const h = rand(7, 11); const c = new THREE.Mesh(new THREE.ConeGeometry(2, h, 6), MAT.leafDark); c.position.set(x + rand(-1, 1), h / 2, rand(36, 42)); E.add(c); }
  // moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0xc8cdd6, fog: false })); moon.position.set(-25, 32, 60); moon.lookAt(0, 0, 0); E.add(moon); W.obj.moon = moon;
}

// ---------- ground floor ----------
function buildGround() {
  const lv = 0;
  // hall
  floorRect(-2, 2, -14, 4, 0, MAT.wood, { surf: 'wood', lv });
  box(1.2, .015, 16.5, 0, 0, -5, MAT.carpet, { occ: false }); surface(-.6, .6, -13.2, 3.2, 0, 'carpet');
  ceilRect(-2, 2, -14, 4, 3.15);
  wallZ(-2, -14, 4, lv, MAT.wall, [[-3.5, -2.5]]);
  wallZ(2, -14, -6, lv, MAT.wall, [[-7.9, -6.9]]);
  wallZ(2, -6, 4, lv, MAT.wall, [[.5, 2.0, 2.4]], { mat2: MAT.wallRed });
  doorFrame('z', 2, .5, 2.0, 0, 2.4);
  wallX(-14, -2, 2, lv, MAT.wall, [[-.5, .5]]);
  wallX(4, -2, 2, lv, MAT.wall, [[-.5, .5]]);
  // front door
  makeDoor('front', { axis: 'x', c: 4, mid: 0, lv, dir: 1, locked: true, key: 'frontKey', name: 'front door', lockMsg: () => Story.frontLockMsg() });
  // foyer table + grandfather's note
  const ft = table(-1.65, 1.2, .5, 1.0, .8, 0); addCollider(-1.92, -1.38, .7, 1.7, lv);
  IT(box(.18, .01, .24, -1.6, .8, 1.25, MAT.paper, { occ: false }), 'gfNote'); W.obj.gfNoteMesh = null;
  cyl(.06, .05, .22, -1.7, .8, .85, MAT.porcelain); // vase
  // coat rack
  cyl(.025, .03, 1.8, 1.65, 0, 3.4, MAT.darkWood, { solid: true }); box(.3, .7, .12, 1.6, .95, 3.43, new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 1 }), { occ: false });
  // hall lamps
  [[1, 'hall1', .7, 0], [-6, 'hall2', .55, .15], [-11.5, 'hall3', .45, .1]].forEach(([z, n, i, f]) => { lamp(0, 2.95, z, { name: n, int: i, flick: f, dist: 8 }); cyl(.004, .004, .2, 0, 2.95, z, MAT.iron); });
  // hall picture (small, ordinary)
  framedPicture(drawPhoto({ w: 240, h: 180, bg: 'garden', tree: .9, people: [] , caption: '14 Alder Lane'}), .5, .38, -1.91, 1.65, -9, Math.PI / 2);
  // stair door (jammed until chapter 4)
  makeDoor('stairs', { axis: 'z', c: 2, mid: -7.4, lv, dir: 1, locked: true, name: 'door', lockMsg: () => Story.stairLockMsg() });
  // basement door
  makeDoor('basement', { axis: 'x', c: -14, mid: 0, lv, dir: 1, locked: true, name: 'basement door', mat: MAT.darkWood, lockMsg: () => Story.basementLockMsg() });
  box(.5, .06, .06, .3, 1.15, -13.95, MAT.iron, { occ: false }); // a bolt
  W.obj.basementBolt = box(.08, .22, .08, .5, 1.05, -13.93, MAT.iron, { occ: false });
  // dining door (locked)
  makeDoor('dining', { axis: 'z', c: -2, mid: -3, lv, dir: -1, locked: true, key: 'diningKey', name: 'door', lockMsg: 'Locked. A small brass keyhole, polished from use.' });
  // living room
  wallX(-6, 6, 10, lv, MAT.wallRed);
  wallX(4, 2, 10, lv, MAT.wallRed);
  wallZ(10, -6, 4, lv, MAT.wallRed);
  buildLivingRoom(0, 0, 0, 0, 'normal');
  // stairwell (shared by both floors)
  wallZ(6, -14, -6, [0, 1], MAT.wall, [], { y0: 0, h: 6.4 });
  wallX(-14, 2, 6, [0, 1], MAT.wall, [], { y0: 0, h: 6.4 });
  wallX(-6, 2, 6, [0, 1], MAT.wall, [], { y0: 0, h: 6.4, mat2: MAT.wallRed });
  floorRect(2, 6, -7.6, -6, 0, MAT.wood, { surf: 'wood', lv: 0 });
  floorRect(2, 6, -14, -12.6, 3.4, MAT.wood, { surf: 'wood', lv: 1 });
  ceilRect(2, 6, -14, -6, 6.3);
  W.ramps.push({ x1: 2, x2: 6, z1: -14, z2: -6, za: -7.6, zb: -12.6, ya: 0, yb: 3.4 });
  const nSteps = 20;
  for (let i = 0; i < nSteps; i++) { const z0 = -7.6 - i * .25, top = (i + 1) * 3.4 / nSteps; box(3.84, top, .25, 4, 0, z0 - .125, MAT.wood, { occ: false }); }
  surface(2, 6, -14, -6, 0, 'wood'); surface(2, 6, -14, -6, 1, 'wood');
  // banister
  const ban = new THREE.Group(); add(ban); for (let i = 0; i < 10; i++) { const z = -7.8 - i * .5, y = (i * 2 + 1) * 3.4 / 20; cyl(.02, .02, .9, 5.7, y, z, MAT.darkWood, { parent: ban }); }
  const rail = box(.06, .06, 5.6, 5.7, 1.9, -10.1, MAT.darkWood, { occ: false }); rail.rotation.x = .6;
  lamp(4, 5.95, -10, { name: 'stairs', int: .5, dist: 8, flick: .1 });

  // ---- passage + dining room (a group that can be moved: the hallway stretches) ----
  W.dining = new THREE.Group(); W.scene.add(W.dining);
  const D = W.dining;
  // passage pieces (stretchable): north wall, south wall, floor, ceiling
  W.passage = {
    n: box(1, 3.4, WALL_T, 0, 0, -4, MAT.wall), s: box(1, 3.4, WALL_T, 0, 0, -2, MAT.wall),
    f: box(1, .1, 2, 0, -.1, -3, MAT.wood), c: box(1, .1, 2, 0, 3.15, -3, MAT.plaster, { occ: false }),
    cn: addCollider(0, 1, -4.08, -3.92, 0), cs: addCollider(0, 1, -2.08, -1.92, 0), surf: { x1: -5, x2: -2, z1: -4, z2: -2, lv: 0, type: 'wood', grp: null }
  };
  W.surfaces.push(W.passage.surf);
  floorRect(-13, -5, -9, 1, 0, MAT.wood, { surf: 'wood', lv, parent: D });
  ceilRect(-13, -5, -9, 1, 3.15, MAT.plaster, { parent: D });
  wallX(-9, -13, -5, lv, MAT.wallBlue, [], { parent: D });
  wallX(1, -13, -5, lv, MAT.wallBlue, [], { parent: D });
  wallZ(-13, -9, 1, lv, MAT.wallBlue, [], { parent: D });
  wallZ(-5, -9, 1, lv, MAT.wallBlue, [[-4, -2, 2.4]], { parent: D });
  doorFrame('z', -5, -4, -2, 0, 2.4, D);
  box(7.6, .015, 4.4, -9, 0, -4, MAT.carpet, { parent: D, occ: false });
  // the table
  const dt = table(-9, -4, 3.6, 1.3, .76, 0, D, MAT.darkWood); addCollider(-10.8, -7.2, -4.65, -3.35, lv, { grp: D });
  box(3.65, .005, 1.35, -9, .76, -4, MAT.sheet, { parent: D, occ: false });
  const seats = [[-6.75, -4, -Math.PI / 2], [-11.25, -4, Math.PI / 2], [-9.8, -5.05, 0], [-8.2, -5.05, 0], [-9.8, -2.95, Math.PI], [-8.2, -2.95, Math.PI]];
  W.obj.dinChairs = seats.map(([x, z, r]) => chair(x, z, r, 0, D));
  // place settings: [Arthur(east head), Margaret, Thomas, Elena, extra(west head)]
  const plateAt = [[-7.35, -4], [-8.2, -4.45], [-9.8, -4.45], [-8.2, -3.55], [-10.65, -4]];
  W.obj.plates = plateAt.map(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, .77, z); D.add(g);
    cyl(.14, .11, .02, 0, 0, 0, MAT.porcelain, { parent: g });
    if (i < 3) sph(.05, rand(-.04, .04), .03, rand(-.04, .04), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 }), { parent: g, sy: .4 });
    box(.02, .005, .18, .18, 0, 0, MAT.metal, { parent: g, occ: false });
    g.visible = i < 3; return g;
  });
  [[-8.6, -4.3], [-9.4, -3.7]].forEach(([x, z]) => cyl(.035, .03, .12, x, .77, z, MAT.porcelain, { parent: D }));
  [-9.6, -8.4].forEach(x => { cyl(.03, .04, .04, x, .77, -4, MAT.brass, { parent: D }); cyl(.015, .015, .2, x, .81, -4, MAT.porcelain, { parent: D }); });
  // sideboard with radio and a drawer
  const sb = new THREE.Group(); sb.position.set(-9, 0, .65); D.add(sb);
  box(2.2, .85, .55, 0, 0, 0, MAT.darkWood, { parent: sb, cast: true }); addCollider(-10.1, -7.9, .37, .93, lv, { grp: D });
  const sbDrawer = box(.6, .18, .03, .5, .6, -.28, MAT.darkWood, { parent: sb }); sph(.02, .5, .69, -.31, MAT.brass, { parent: sb }); IT(sbDrawer, 'sbDrawer');
  const radio = new THREE.Group(); radio.position.set(-8.3, .85, .7); D.add(radio);
  box(.42, .26, .2, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: .5 }), { parent: radio, cast: true });
  plane(.22, .16, -.06, .13, -.101, new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 }), { parent: radio, ry: Math.PI });
  sph(.025, .14, .1, -.1, MAT.brass, { parent: radio }); sph(.025, .14, .18, -.1, MAT.brass, { parent: radio });
  W.obj.radio = radio; IT(radio, 'radio');
  const photoA = new THREE.Group(); photoA.position.set(-9.6, .86, .55); photoA.rotation.y = Math.PI + .3; D.add(photoA);
  box(.16, .2, .015, 0, 0, 0, MAT.frame, { parent: photoA }); W.obj.photoA = photoA; IT(photoA, 'photoA');
  // photo C under the table
  const photoC = plane(.13, .1, -9.5, .012, -3.7, new THREE.MeshStandardMaterial({ map: texFrom(Story.puzzlePhotos()[2], false), roughness: .8 }), { parent: D, rx: -Math.PI / 2 });
  photoC.rotation.z = 2.2; W.obj.photoC = photoC; IT(photoC, 'photoC');
  // the cabinet (photo puzzle)
  const cab = new THREE.Group(); cab.position.set(-9, 0, -8.65); D.add(cab);
  box(1.5, 2.0, .5, 0, 0, 0, MAT.darkWood, { parent: cab, cast: true }); addCollider(-9.8, -8.2, -8.95, -8.35, lv, { grp: D });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: .1, metalness: .3, transparent: true, opacity: .5 });
  W.obj.cabDoor = plane(1.3, 1.0, 0, 1.45, .26, glassM, { parent: cab });
  W.obj.cabSlots = [-.45, 0, .45].map((x, i) => { const s = box(.3, .24, .02, x, .55, .255, MAT.black, { parent: cab, occ: false }); return s; });
  W.obj.cabSlotPics = [-.45, 0, .45].map(x => { const m = new THREE.MeshStandardMaterial({ roughness: .7 }); const p = plane(.26, .2, x, .67, .267, m, { parent: cab }); p.visible = false; return p; });
  const letter = box(.22, .01, .3, 0, 1.05, .05, MAT.paper, { parent: cab, occ: false }); W.obj.cabLetter = letter;
  IT(cab, 'cabinet');
  // frosted window + the passing shadow (memory 3: the ribbon on the latch)
  const fw = windowDecor(-12.9, 1.75, -4, Math.PI / 2, 1.4, 1.6, D, { mat: new THREE.MeshBasicMaterial({ color: 0x7286a6 }), curtainMat: MAT.fabric, int: .45 });
  const shc = makeCanvas(64, 128), shx = shc.getContext('2d'); const sg = shx.createRadialGradient(32, 50, 2, 32, 60, 60); sg.addColorStop(0, 'rgba(0,0,0,.95)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); shx.fillStyle = sg; shx.fillRect(0, 0, 64, 128);
  const shadow = plane(.7, 1.6, -12.88, 1.75, -4, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shc), transparent: true, opacity: 0, depthWrite: false }), { parent: D, ry: Math.PI / 2 });
  W.obj.winShadow = shadow;
  const rib = box(.04, .12, .05, -12.86, 1.62, -3.3, new THREE.MeshStandardMaterial({ color: 0xc8a43a, roughness: .8 }), { parent: D, occ: false });
  IT(rib, 'mem3');
  // the family portrait (gains a person)
  W.portraits.dining = framedPicture(Story.diningPortrait(0), 1.0, .8, -5.1, 1.85, -7, -Math.PI / 2, D, { frame: .08 });
  IT(W.portraits.dining.g, 'diningPortrait');
  W.obj.diningLamp = lamp(-9, 2.55, -4, { name: 'dining', int: .9, dist: 9, flick: .2, parent: D });
  cyl(.004, .004, .5, -9, 2.65, -4, MAT.iron, { parent: D }); [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * TAU; sph(.03, -9 + Math.cos(a) * .25, 2.55, -4 + Math.sin(a) * .25, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), { parent: D }); });
  setDiningOffset(0);
}
function setDiningOffset(dx) {
  W.diningDX = dx; W.dining.position.x = dx;
  const x1 = -5 + dx, x2 = -2, len = x2 - x1, mid = (x1 + x2) / 2;
  const P = W.passage;
  [P.n, P.s, P.f, P.c].forEach(m => { m.scale.x = len; m.position.x = mid; });
  P.cn.x1 = x1; P.cn.x2 = x2; P.cs.x1 = x1; P.cs.x2 = x2; P.surf.x1 = x1;
}

// ---------- upstairs ----------
function buildUpstairs() {
  const lv = 1, Y = 3.4;
  floorRect(-2, 2, -14, 4, Y, MAT.wood, { surf: 'wood', lv });
  box(1.1, .015, 17.5, 0, Y, -5, MAT.carpet, { occ: false }); surface(-.55, .55, -13.5, 4, 1, 'carpet');
  ceilRect(-2, 2, -14, 4, Y + 2.9);
  wallZ(-2, -14, -9, lv, MAT.tile, [[-12, -11]], { mat2: MAT.wall });
  wallZ(-2, -9, -4, lv, MAT.wallBlue, [[-7, -6]], { mat2: MAT.wall });
  wallZ(-2, -4, 4, lv, MAT.wallPink, [[-.5, .5]], { mat2: MAT.wall });
  wallZ(2, -14, -6, lv, MAT.wall, [[-13.9, -12.9]]);
  wallZ(2, -6, 4, lv, MAT.wall, [[-3, -2]], { mat2: MAT.wallRed });
  wallX(-14, -2, 2, lv, MAT.wall);
  // stretchable hall end (the hallway grows when you look back)
  W.tail = new THREE.Group(); W.scene.add(W.tail);
  wallX(4, -2, 2, lv, MAT.wall, [], { parent: W.tail });
  const et = table(0, 3.62, .9, .4, .8, Y, W.tail); lamp(0, Y + 1.05, 3.62, { name: 'uhEnd', int: .5, dist: 6, parent: W.tail, size: .045, lv: 1 });
  cyl(.08, .14, .2, 0, Y + .8, 3.62, MAT.brass, { parent: W.tail });
  W.obj.tailMem = null;
  W.hallStretch = {
    l: box(WALL_T, 3.0, 1, -2, Y, 4, MAT.wall), r: box(WALL_T, 3.0, 1, 2, Y, 4, MAT.wall), f: box(4, .1, 1, 0, Y - .1, 4, MAT.wood), c: box(4, .1, 1, 0, Y + 2.9, 4, MAT.plaster, { occ: false }), run: box(1.1, .015, 1, 0, Y, 4, MAT.carpet, { occ: false }),
    cl: addCollider(-2.08, -1.92, 4, 4, lv), cr: addCollider(1.92, 2.08, 4, 4, lv), surf: { x1: -2, x2: 2, z1: 4, z2: 4, lv: 1, type: 'wood', grp: null }
  };
  W.surfaces.push(W.hallStretch.surf);
  setHallLength(0);
  // hall lamps
  [[-11, 'uh1'], [-6, 'uh2'], [-1, 'uh3']].forEach(([z, n]) => { lamp(0, Y + 2.75, z, { name: n, int: .55, dist: 8, flick: .08 }); cyl(.004, .004, .15, 0, Y + 2.75, z, MAT.iron); });
  // the hallway portrait
  W.portraits.hall = framedPicture(Story.hallPortrait(0), .9, 1.1, 1.9, Y + 1.75, -8.5, -Math.PI / 2, null, { frame: .08 });
  IT(W.portraits.hall.g, 'hallPortrait');
  // the triple-locked door
  makeDoor('elena', { axis: 'z', c: -2, mid: 0, lv, dir: -1, locked: true, name: 'door', wallMat: MAT.wall, onUse: (d) => Story.elenaDoorUse(d) });
  [.95, 1.15, 1.35].forEach(y => box(.04, .07, .05, -1.95, Y + y, .32, MAT.iron, { occ: false }));
  // grandfather's bedroom
  floorRect(2, 10, -6, 4, Y, MAT.wood, { surf: 'wood', lv });
  box(3, .015, 3.4, 7.4, Y, -1, MAT.carpet, { occ: false }); surface(5.9, 8.9, -2.7, .7, 1, 'carpet');
  ceilRect(2, 10, -6, 4, Y + 2.9);
  wallX(-6, 6, 10, lv, MAT.wallRed); wallX(4, 2, 10, lv, MAT.wallRed); wallZ(10, -6, 4, lv, MAT.wallRed);
  makeDoor('gbed', { axis: 'z', c: 2, mid: -2.5, lv, dir: 1, name: 'door' });
  const bed = new THREE.Group(); bed.position.set(8.85, Y, -1.1); add(bed);
  box(2.1, .35, 1.7, 0, 0, 0, MAT.darkWood, { parent: bed, cast: true }); box(2.0, .18, 1.6, 0, .35, 0, MAT.sheet, { parent: bed, cast: true });
  box(.08, 1.1, 1.75, 1.05, 0, 0, MAT.darkWood, { parent: bed }); box(.5, .12, 1.3, .7, .52, 0, MAT.sheet, { parent: bed });
  addCollider(7.8, 9.95, -1.95, -.25, lv);
  const ns = new THREE.Group(); ns.position.set(9.6, Y, -2.55); add(ns);
  box(.45, .6, .5, 0, 0, 0, MAT.darkWood, { parent: ns, cast: true }); addCollider(9.35, 9.85, -2.8, -2.3, lv);
  const nsd = box(.03, .16, .4, -.23, .38, 0, MAT.darkWood, { parent: ns }); IT(nsd, 'nightstand');
  cyl(.05, .07, .25, 0, .6, 0, MAT.brass, { parent: ns }); cyl(.1, .16, .15, 0, .85, 0, new THREE.MeshStandardMaterial({ color: 0xd8c39a, side: THREE.DoubleSide, emissive: 0x2a1c08 }), { parent: ns, open: true });
  lamp(9.6, Y + .92, -2.55, { name: 'gbedLamp', int: .5, dist: 5, size: .03 });
  // crooked painting & the message behind it
  W.obj.gPainting = framedPicture(drawPhoto({ w: 300, h: 220, bg: 'garden', tree: 1, people: [], border: false, aged: .5 }), .9, .66, 9.9, Y + 1.75, -1.1, -Math.PI / 2, null, { frame: .06, rz: .09 });
  IT(W.obj.gPainting.g, 'gPainting');
  const msgC = makeCanvas(256, 192), mx = msgC.getContext('2d'); mx.fillStyle = '#4a2a26'; mx.fillRect(0, 0, 256, 192);
  mx.strokeStyle = 'rgba(230,215,190,.75)'; mx.lineWidth = 2; mx.font = '22px Caveat, cursive'; mx.fillStyle = 'rgba(235,222,200,.85)';
  ['IT LEARNS', 'IT WEARS THEIR FACES', "IT DOESN'T KNOW", "SHE'S GONE"].forEach((t, i) => mx.fillText(t, 22 + rand(-4, 4), 40 + i * 40));
  W.obj.gMessage = plane(.8, .6, 9.915, Y + 1.42, -1.1, new THREE.MeshStandardMaterial({ map: texFrom(msgC, false), roughness: 1 }), { ry: -Math.PI / 2 });
  W.obj.gMessage.visible = false;
  // dresser, chair, wardrobe, hairbrush
  const dr = new THREE.Group(); dr.position.set(7.5, Y, -5.7); add(dr); box(1.6, .9, .5, 0, 0, 0, MAT.darkWood, { parent: dr, cast: true }); addCollider(6.7, 8.3, -5.95, -5.45, lv);
  IT(box(.2, .03, .06, .3, .9, 0, MAT.darkWood, { parent: dr }), 'hairbrush');
  framedPicture(drawPhoto({ w: 200, h: 250, bg: 'room', people: [{ x: .5, kind: 'woman', smile: true }], caption: 'Margaret, 1979' }), .22, .28, 7.0, Y + 1.06, -5.6, 0);
  const wd = new THREE.Group(); wd.position.set(3.0, Y, -5.6); add(wd); box(1.2, 2.1, .6, 0, 0, 0, MAT.darkWood, { parent: wd, cast: true }); addCollider(2.4, 3.6, -5.95, -5.3, lv);
  chair(4.2, 2.6, 2.5, Y);
  windowDecor(6, Y + 1.6, 3.9, Math.PI, 1.2, 1.4, null, { lv });
  lamp(6, Y + 2.65, -1, { name: 'gbed', int: .45, dist: 9 });
  // bathroom
  floorRect(-10, -2, -14, -9, Y, MAT.tile, { surf: 'tile', lv });
  ceilRect(-10, -2, -14, -9, Y + 2.9);
  wallX(-14, -10, -2, lv, MAT.tile); wallZ(-10, -14, -9, lv, MAT.tile); wallX(-9, -10, -2, lv, MAT.tile, [], { mat2: MAT.wallBlue });
  makeDoor('bath', { axis: 'z', c: -2, mid: -11.5, lv, dir: -1, name: 'door' });
  const tub = new THREE.Group(); tub.position.set(-9.15, Y, -12.8); add(tub);
  box(1.6, .55, 1.0, 0, 0, 0, MAT.porcelain, { parent: tub, cast: true, ry: Math.PI / 2 }); box(1.4, .02, .8, 0, .5, 0, new THREE.MeshStandardMaterial({ color: 0x29302a, roughness: .2 }), { parent: tub, ry: Math.PI / 2 });
  addCollider(-9.7, -8.6, -13.65, -11.95, lv); IT(tub, 'bathtub');
  const sink = new THREE.Group(); sink.position.set(-6, Y, -13.65); add(sink); cyl(.08, .1, .8, 0, 0, 0, MAT.porcelain, { parent: sink }); box(.55, .15, .4, 0, .8, 0, MAT.porcelain, { parent: sink, cast: true }); addCollider(-6.3, -5.7, -13.9, -13.4, lv);
  W.mirrorBath = makeMirror(.8, .95, -6, Y + 1.6, -13.9, 0, { range: 6 });
  box(.9, 1.05, .04, -6, Y + 1.07, -13.94, MAT.frame, { occ: false });
  const mc = new THREE.Group(); mc.position.set(-7.05, Y + 1.25, -13.82); add(mc);
  box(.45, .6, .2, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0xd2cdbf, roughness: .5 }), { parent: mc, cast: true });
  W.obj.medDoorPivot = new THREE.Group(); W.obj.medDoorPivot.position.set(-.22, 0, .1); mc.add(W.obj.medDoorPivot);
  box(.44, .58, .02, .22, .01, 0, new THREE.MeshStandardMaterial({ color: 0xbab5a8, roughness: .4 }), { parent: W.obj.medDoorPivot });
  IT(mc, 'medCabinet');
  const toilet = new THREE.Group(); toilet.position.set(-3.6, Y, -13.55); add(toilet); cyl(.18, .22, .42, 0, 0, 0, MAT.porcelain, { parent: toilet }); box(.4, .55, .2, 0, .25, -.22, MAT.porcelain, { parent: toilet }); addCollider(-3.85, -3.35, -13.9, -13.2, lv);
  lamp(-6, Y + 2.7, -11.5, { name: 'bath', int: .5, dist: 7, flick: .35 });
  W.emitDrip = { x: -9.2, y: Y + .6, z: -13.3 };
  // sewing room
  floorRect(-10, -2, -9, -4, Y, MAT.wood, { surf: 'wood', lv });
  ceilRect(-10, -2, -9, -4, Y + 2.9);
  wallZ(-10, -9, -4, lv, MAT.wallBlue); wallX(-4, -10, -2, lv, MAT.wallBlue, [], { mat2: MAT.wallPink });
  makeDoor('sewing', { axis: 'z', c: -2, mid: -6.5, lv, dir: -1, locked: true, name: 'door', lockMsg: 'It will not move. Not locked — stuck, as if someone is leaning against it.' });
  const st = table(-5.2, -8.5, 1.4, .7, .76, Y); addCollider(-5.95, -4.45, -8.9, -8.1, lv);
  box(.45, .3, .2, -5.4, Y + .76, -8.5, MAT.iron, {}); box(.12, .16, .2, -5.6, Y + 1.06, -8.5, MAT.iron, { occ: false });
  const sbx = new THREE.Group(); sbx.position.set(-4.75, Y + .76, -8.45); add(sbx); box(.3, .12, .2, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x6a3a3a, roughness: .8 }), { parent: sbx }); IT(sbx, 'sewingBox'); W.obj.sewingBox = sbx;
  const form = new THREE.Group(); form.position.set(-8.4, Y, -6.2); form.rotation.y = .9; add(form);
  cyl(.02, .02, .9, 0, 0, 0, MAT.darkWood, { parent: form }); cyl(.12, .18, .6, 0, .9, 0, new THREE.MeshStandardMaterial({ color: 0xb8ab8c, roughness: 1 }), { parent: form, cast: true });
  cyl(.19, .32, .55, 0, .55, 0, new THREE.MeshStandardMaterial({ color: 0x9c7c3a, roughness: 1, side: THREE.DoubleSide }), { parent: form, open: true, cast: true });
  addCollider(-8.7, -8.1, -6.5, -5.9, lv); IT(form, 'mem4');
  chair(-5.2, -7.6, Math.PI, Y);
  windowDecor(-9.9, Y + 1.6, -6.5, Math.PI / 2, 1.0, 1.3, null, { lv, curtainMat: MAT.fabric });
  lamp(-6, Y + 2.7, -6.5, { name: 'sew', int: .45, dist: 7 });
  // Elena's room
  floorRect(-10, -2, -4, 4, Y, MAT.wood, { surf: 'wood', lv });
  box(2.6, .015, 2, -5.6, Y, .6, new THREE.MeshStandardMaterial({ color: 0x7a5a6a, roughness: 1 }), { occ: false }); surface(-6.9, -4.3, -.4, 1.6, 1, 'carpet');
  ceilRect(-10, -2, -4, 4, Y + 2.9);
  wallZ(-10, -4, 4, lv, MAT.wallPink, [[-.5, .5, 2.0]]);
  wallX(4, -10, -2, lv, MAT.wallPink);
  // bed + the bear that turns its head
  const eb = new THREE.Group(); eb.position.set(-5.2, Y, -3.3); add(eb);
  box(2.0, .3, 1.1, 0, 0, 0, MAT.darkWood, { parent: eb, cast: true }); box(1.9, .15, 1.0, 0, .3, 0, new THREE.MeshStandardMaterial({ color: 0xc4a6a6, roughness: 1 }), { parent: eb, cast: true });
  box(.08, .8, 1.15, -1.0, 0, 0, MAT.darkWood, { parent: eb }); addCollider(-6.25, -4.15, -3.9, -2.7, lv);
  const bear = new THREE.Group(); bear.position.set(-5.85, Y + .47, -3.35); bear.rotation.y = Math.PI / 2; add(bear);
  const bm = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 1 });
  sph(.12, 0, .12, 0, bm, { parent: bear, sy: 1.1, cast: true });
  const bh = new THREE.Group(); bh.position.set(0, .3, 0); bear.add(bh); sph(.09, 0, 0, 0, bm, { parent: bh, cast: true }); sph(.035, -.06, .07, 0, bm, { parent: bh }); sph(.035, .06, .07, 0, bm, { parent: bh });
  sph(.012, -.03, .01, .08, MAT.black, { parent: bh }); sph(.012, .03, .01, .08, MAT.black, { parent: bh }); sph(.02, 0, -.02, .085, new THREE.MeshStandardMaterial({ color: 0x2a1a10 }), { parent: bh });
  W.obj.bear = bear; W.obj.bearHead = bh; IT(bear, 'bear');
  // desk + diary
  const ed = table(-8.7, -3.55, 1.1, .6, .72, Y); addCollider(-9.3, -8.1, -3.9, -3.2, lv);
  const diary = new THREE.Group(); diary.position.set(-8.75, Y + .72, -3.5); diary.rotation.y = .2; add(diary);
  box(.2, .04, .26, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x5a2a36, roughness: .8 }), { parent: diary, cast: true }); W.obj.diary = diary; IT(diary, 'diary');
  chair(-8.7, -2.9, Math.PI, Y);
  // drawings
  W.drawings = [
    { kind: 'family', stage: 0, pic: framedPicture(drawCrayon({ kind: 'family', stage: 0 }), .5, .39, -2.1, Y + 1.6, 1.8, -Math.PI / 2, null, { frame: 0 }) },
    { kind: 'mama', stage: 0, pic: framedPicture(drawCrayon({ kind: 'mama', stage: 0 }), .5, .39, -2.1, Y + 1.6, 3.1, -Math.PI / 2, null, { frame: 0 }) },
    { kind: 'house', stage: 0, pic: framedPicture(drawCrayon({ kind: 'house', stage: 0 }), .5, .39, -8.7, Y + 1.55, -3.9, 0, null, { frame: 0 }) },
  ];
  W.drawings.forEach((d, i) => IT(d.pic.g, 'drawing' + i));
  // season window
  W.obj.seasonPic = framedPicture(drawSeason(3), 1.1, 1.2, -6.8, Y + 1.7, 3.92, Math.PI, null, { frame: 0 });
  windowDecor(-6.8, Y + 1.7, 3.9, Math.PI, 1.1, 1.2, null, { lv, mat: new THREE.MeshBasicMaterial({ visible: false }), curtainMat: new THREE.MeshStandardMaterial({ color: 0xc89aa2, roughness: 1 }), int: .3 });
  W.obj.seasonPic.mesh.material = new THREE.MeshBasicMaterial({ map: W.obj.seasonPic.tex, color: 0x8892a0 });
  IT(W.obj.seasonPic.g, 'seasonWindow');
  // vanity with mirror and the music box
  const vt = new THREE.Group(); vt.position.set(-3.6, Y, 3.7); add(vt); box(1.2, .8, .45, 0, 0, 0, MAT.darkWood, { parent: vt, cast: true }); addCollider(-4.25, -2.95, 3.45, 3.95, lv);
  W.mirrorElena = makeMirror(.7, .8, -3.6, Y + 1.38, 3.86, Math.PI, { range: 5, tint: 0xa8a49a });
  box(.8, .9, .04, -3.6, Y + .93, 3.9, MAT.frame, { occ: false });
  const mb = new THREE.Group(); mb.position.set(-3.6, Y + .8, 3.62); add(mb);
  box(.22, .12, .16, 0, 0, 0, MAT.darkWood, { parent: mb, cast: true }); const lid = box(.23, .03, .17, 0, .12, 0, MAT.frame, { parent: mb });
  [-.06, 0, .06].forEach(x => cyl(.02, .02, .02, x, .15, 0, MAT.brass, { parent: mb }));
  W.obj.musicBox = mb; IT(mb, 'musicBox');
  // wardrobe (impossible hallway behind)
  const wr = new THREE.Group(); add(wr);
  box(.6, 2.3, .25, -9.7, Y, -.75, MAT.darkWood, { cast: true }); box(.6, 2.3, .25, -9.7, Y, .75, MAT.darkWood, { cast: true }); box(.6, .3, 1.75, -9.7, Y + 2.0, 0, MAT.darkWood, {});
  addCollider(-10, -9.4, -.9, -.6, lv); addCollider(-10, -9.4, .6, .9, lv);
  W.obj.wardL = new THREE.Group(); W.obj.wardL.position.set(-9.4, Y, -.5); add(W.obj.wardL); box(.04, 2.0, .5, 0, 0, .25, MAT.darkWood, { parent: W.obj.wardL });
  W.obj.wardR = new THREE.Group(); W.obj.wardR.position.set(-9.4, Y, .5); add(W.obj.wardR); box(.04, 2.0, .5, 0, 0, -.25, MAT.darkWood, { parent: W.obj.wardR });
  W.obj.wardCol = addCollider(-9.45, -9.35, -.5, .5, lv);
  IT(W.obj.wardL, 'wardrobe'); IT(W.obj.wardR, 'wardrobe');
  // the hallway that cannot fit
  floorRect(-22, -10, -.5, .5, Y, MAT.wood, { surf: 'wood', lv });
  ceilRect(-22, -10, -.5, .5, Y + 2.0, MAT.plaster);
  wallX(-.5, -22, -10, lv, MAT.wallPink, [], { h: 2.0 }); wallX(.5, -22, -10, lv, MAT.wallPink, [], { h: 2.0 });
  wallZ(-22, -.5, .5, lv, MAT.wallPink, [[-.45, .45, 1.9]], { h: 2.0 });
  makeDoor('wardEnd', { axis: 'z', c: -22, mid: 0, w: .88, h: 1.9, lv, dir: -1, locked: true, name: 'small door', lockMsg: 'It will not open. On the other side, very close, something breathes in when you do.', onUse: d => Story.wardEndUse(d) });
  lamp(-16, Y + 1.85, 0, { name: 'wcor', int: .4, dist: 6, flick: .5, size: .035 });
  const pol = plane(.09, .11, -21.5, Y + .012, .15, new THREE.MeshStandardMaterial({ map: texFrom(Story.polaroid(), false), roughness: .8 }), { rx: -Math.PI / 2 }); pol.rotation.z = .5; IT(pol, 'mem5');
  lamp(-6, Y + 2.7, 0, { name: 'elena', int: .5, dist: 8, color: 0xffcfc0 });
  lamp(-3.0, Y + 1.0, 3.7, { name: 'elenaLamp', int: .35, dist: 4, color: 0xffb080, size: .03 });
  // the room's stairwell side wall
}
function setHallLength(L) {
  W.hallL = L; W.tail.position.z = L;
  const H = W.hallStretch, z1 = 4, z2 = 4 + Math.max(L, .001), mid = (z1 + z2) / 2, len = z2 - z1;
  [H.l, H.r, H.f, H.c, H.run].forEach(m => { m.scale.z = len; m.position.z = mid; m.visible = L > .01; });
  H.cl.z1 = z1; H.cl.z2 = z2; H.cr.z1 = z1; H.cr.z2 = z2; H.cl.on = H.cr.on = L > .01; H.surf.z2 = z2;
}

// ---------- basement ----------
function buildBasement() {
  const lv = -1, Y = -3.4;
  // stairs shaft
  wallZ(-1, -24, -14, [0, -1], MAT.concrete, [], { y0: Y, h: 6.55 });
  wallZ(1, -24, -14, [0, -1], MAT.concrete, [], { y0: Y, h: 6.55 });
  floorRect(-1, 1, -15, -14, 0, MAT.wood, { surf: 'wood', lv: 0 });
  W.ramps.push({ x1: -1, x2: 1, z1: -24, z2: -14.02, za: -15, zb: -23, ya: 0, yb: -3.4 });
  for (let i = 0; i < 32; i++) { const z0 = -15 - i * .25, top = -(i + 1) * 3.4 / 32; box(1.84, .14, .25, 0, top, z0 - .125, MAT.darkWood, { occ: false }); box(1.84, top + 3.4 - .001, .25, 0, Y, z0 - .125, MAT.concrete, { occ: false, receive: true }); }
  surface(-1, 1, -24, -14, 0, 'wood'); surface(-1, 1, -24, -14, -1, 'wood');
  const sc = box(2, .1, 9.4, 0, 0, -19, MAT.concrete, { occ: false }); sc.rotation.x = -.4115; sc.position.set(0, .95, -18.9);
  box(2, .1, 1.2, 0, 3.05, -14.6, MAT.concrete, { occ: false });
  lamp(0, Y + 2.6, -25.2, { name: 'b0', int: .5, dist: 7, flick: .1 });
  // main room
  floorRect(-10, 10, -36, -24, Y, MAT.concrete, { surf: 'concrete', lv });
  ceilRect(-10, 10, -36, -24, Y + 3.1, MAT.concrete);
  wallX(-24, -10, 10, lv, MAT.concrete, [[-1, 1, 2.6]], { noTrim: true });
  wallX(-36, -10, 10, lv, MAT.concrete, [[-1, 1, 2.3]], { noTrim: true });
  wallZ(-10, -36, -24, lv, MAT.concrete, [[-31, -29, 2.3]], { noTrim: true });
  wallZ(10, -36, -24, lv, MAT.concrete, [[-31, -29, 2.3]], { noTrim: true });
  [[-4, -30], [4, -30]].forEach(([x, z]) => box(.35, 3.1, .35, x, Y, z, MAT.concrete, { solid: true, lv, cast: true }));
  for (let x = -8; x <= 8; x += 4) box(.2, .25, 12, x, Y + 2.85, -30, MAT.darkWood, { occ: false });
  // pipes
  cyl(.06, .06, 20, 0, Y + 2.7, -24.6, MAT.metal, { rz: Math.PI / 2 }).position.set(0, Y + 2.7, -24.6);
  // crawlspace alcove (crouch)
  wallX(-26.5, 7, 10, lv, MAT.concrete, [[8, 9, 1.25]], { noTrim: true });
  addCollider(8, 9, -26.58, -26.42, lv, { low: true });
  ceilRect(7, 10, -26.5, -24, Y + 1.6, MAT.concrete);
  box(3, 1.5, .1, 8.5, Y + 1.6, -26.5, MAT.concrete, { occ: true });
  const beam = box(.2, 1.6, .2, 9.8, Y, -25.2, MAT.darkWood, { cast: true }); IT(beam, 'mem6');
  // boxes (things that should be upstairs)
  const boxesAt = [['boxClock', -7.5, -25.5], ['boxPlates', -8.6, -27.4], ['boxDiary', 6.8, -33.6], ['boxPhotos', -7.6, -34.6], ['boxToys', 2.2, -34.8], ['boxFamily', 8.4, -29.0]];
  boxesAt.forEach(([id, x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, Y, z); g.rotation.y = rand(-.3, .3); add(g);
    box(.7, .5, .55, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x6e5a3c, roughness: 1 }), { parent: g, cast: true });
    const flap = box(.7, .02, .28, 0, .5, -.14, new THREE.MeshStandardMaterial({ color: 0x5e4c32, roughness: 1 }), { parent: g }); flap.rotation.x = -.5;
    if (i % 2 === 0) box(.6, .45, .5, .05, .5, .05, new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 1 }), { parent: g, cast: true, ry: .2 });
    addCollider(x - .4, x + .4, z - .35, z + .35, lv); W.obj[id] = g; IT(g, id);
  });
  // sheeted furniture
  [[-6, -31.5, 1.6, 1.0, .9], [7.5, -31.4, 1.0, 1.0, 1.4], [-2, -26.2, 1.8, .7, .8]].forEach(([x, z, w, d, h]) => {
    const s = box(w, h, d, x, Y, z, MAT.sheet, { cast: true, solid: true, lv }); s.scale.set(1, 1, 1);
    sph(Math.max(w, d) * .55, x, Y + h, z, MAT.sheet, { sy: .25 });
  });
  // documents desk + tape recorder bench
  const dd = table(-5.5, -35.3, 1.6, .7, .78, Y); addCollider(-6.35, -4.65, -35.7, -34.9, lv);
  IT(box(.3, .01, .4, -5.9, Y + .78, -35.3, MAT.paper, { occ: false, ry: .2 }), 'newspaper');
  IT(box(.22, .01, .3, -5.2, Y + .78, -35.25, MAT.paper, { occ: false, ry: -.15 }), 'policeReport');
  IT(box(.2, .03, .27, -4.85, Y + .78, -35.45, new THREE.MeshStandardMaterial({ color: 0x2a3540 }), { occ: false }), 'arthurNotes');
  lamp(-5.5, Y + 1.25, -35.3, { name: 'deskLamp', int: .4, dist: 4, size: .03, color: 0xffd090 });
  const tb = table(5.4, -35.3, 1.8, .7, .85, Y); addCollider(4.45, 6.35, -35.7, -34.9, lv);
  const tape = new THREE.Group(); tape.position.set(5.3, Y + .85, -35.25); add(tape);
  box(.42, .12, .28, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: .6 }), { parent: tape, cast: true });
  [-.1, .1].forEach(x => cyl(.06, .06, .02, x, .12, -.02, MAT.metal, { parent: tape }));
  box(.36, .02, .05, 0, .12, .1, MAT.metal, { parent: tape });
  W.obj.tape = tape; IT(tape, 'tape');
  // basement lamps
  [[-5, -27, 'b1'], [5, -27, 'b2'], [-5, -33, 'b3'], [5, -33, 'b4']].forEach(([x, z, n]) => { lamp(x, Y + 2.55, z, { name: n, int: .55, dist: 8, flick: .12 }); cyl(.004, .004, .5, x, Y + 2.6, z, MAT.iron); });
  // corridors (they only lead back)
  [-1, 1].forEach(sd => {
    const x1 = sd < 0 ? -24 : 10, x2 = sd < 0 ? -10 : 24;
    floorRect(x1, x2, -31, -29, Y, MAT.concrete, { surf: 'concrete', lv });
    ceilRect(x1, x2, -31, -29, Y + 2.3, MAT.concrete);
    wallX(-31, x1, x2, lv, MAT.concrete, [], { h: 2.3, noTrim: true }); wallX(-29, x1, x2, lv, MAT.concrete, [], { h: 2.3, noTrim: true });
    wallZ(sd < 0 ? -24 : 24, -31, -29, lv, MAT.concrete, [], { h: 2.3, noTrim: true });
    lamp(sd * 17, Y + 2.15, -30, { name: sd < 0 ? 'bw' : 'be', int: .4, dist: 6, flick: .15 });
    for (let k = 0; k < 3; k++) box(.15, .15, 2, sd * (12 + k * 5), Y + 2.15, -30, MAT.darkWood, { occ: false });
  });
  // sealed room
  floorRect(-4, 4, -44, -36, Y, MAT.concrete, { surf: 'concrete', lv });
  ceilRect(-4, 4, -44, -36, Y + 3.1, MAT.concrete);
  wallZ(-4, -44, -36, lv, MAT.concrete, [], { noTrim: true }); wallZ(4, -44, -36, lv, MAT.concrete, [], { noTrim: true });
  wallX(-44, -4, 4, lv, MAT.concrete, [[-1, 1, 2.2]], { noTrim: true });
  makeDoor('sealed', { axis: 'x', c: -36, mid: 0, w: 1.9, h: 2.25, lv, dir: 1, locked: true, mat: MAT.metal, name: 'iron door', onUse: d => Story.sealedUse(d) });
  [-.55, 0, .55].forEach((x, i) => { const s = [box(.18, .12, .05, x, Y + 1.35, -35.95, MAT.black, { occ: false }), box(.16, .1, .05, x, Y + 1.35, -35.95, MAT.black, { occ: false }), box(.12, .16, .05, x, Y + 1.35, -35.95, MAT.black, { occ: false })][i]; });
  // back wall panel that will open
  W.obj.backPanel = box(2.0, 2.2, .2, 0, Y, -44, MAT.concrete, {}); W.obj.backPanelCol = addCollider(-1, 1, -44.1, -43.9, lv);
  W.pedestals = [-2, 0, 2].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, Y, -42.3); add(g);
    cyl(.22, .28, .95, 0, 0, 0, MAT.stone, { parent: g, cast: true }); box(.55, .05, .55, 0, .95, 0, MAT.stone, { parent: g });
    addCollider(x - .3, x + .3, -42.6, -42.0, lv);
    const holder = new THREE.Group(); holder.position.set(0, 1.0, 0); g.add(holder);
    const P = { g, holder, item: null, i }; IT(g, 'pedestal' + i); return P;
  });
  const plq = makeCanvas(512, 96), pc = plq.getContext('2d'); pc.fillStyle = '#4c4a45'; pc.fillRect(0, 0, 512, 96); pc.fillStyle = 'rgba(20,18,16,.85)'; pc.font = '34px "Special Elite", monospace'; pc.textAlign = 'center'; pc.fillText('LAY HER DOWN THE WAY SHE GREW', 256, 58);
  IT(plane(2.4, .45, 0, Y + 2.55, -43.88, new THREE.MeshStandardMaterial({ map: texFrom(plq, false), roughness: 1 })), 'plaque');
  lamp(0, Y + 2.7, -40, { name: 'sealed', int: .5, dist: 8, on: false, flick: .1 });
  // passage to the memory
  floorRect(-1, 1, -50, -44, Y, MAT.wood, { surf: 'wood', lv });
  ceilRect(-1, 1, -50, -44, Y + 3.1, MAT.plaster);
  wallZ(-1, -50, -44, lv, MAT.wallRed, [], { noTrim: true }); wallZ(1, -50, -44, lv, MAT.wallRed, [], { noTrim: true });
  // the memory room (replica of the living room)
  buildLivingRoom(-6, -54, Y, lv, 'memory');
  W.emitDripB = { x: 8, y: Y + .3, z: -35 };
}
