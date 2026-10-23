// =====================================================================
//  ENGINE — renderer, post-processing, world-building helpers, physics
// =====================================================================
const G = { time: 0, dt: 0, paused: true, state: 'title' };
let W = null; // current world (rebuilt on new game / checkpoint)

function initRenderer() {
  const canvas = $('gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { $('errBox').style.display = 'flex'; $('errBox').textContent = 'WebGL is not available in this browser, so the house cannot be shown. Try a recent desktop Chrome, Edge or Firefox.'; throw e; }
  G.renderer = renderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.shadowMap.enabled = !!Settings.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = true;
  G.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
  G.camera.rotation.order = 'YXZ';
  // HDR-ish render target to avoid banding in the dark
  const gl = renderer.getContext();
  let type = THREE.UnsignedByteType;
  if (renderer.capabilities.isWebGL2 && (renderer.extensions.get('EXT_color_buffer_float') || renderer.extensions.get('EXT_color_buffer_half_float'))) type = THREE.HalfFloatType;
  G.rt = new THREE.WebGLRenderTarget(4, 4, { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  G.postScene = new THREE.Scene(); G.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  G.post = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: G.rt.texture }, time: { value: 0 }, grain: { value: .06 }, vignette: { value: 1.25 }, distort: { value: 0 }, chroma: { value: .3 }, bright: { value: 1 }, fade: { value: 0 }, flash: { value: 0 }, desat: { value: .3 }, red: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time,grain,vignette,distort,chroma,bright,fade,flash,desat,red; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 uv=vUv;
        if(distort>0.001){ uv.x+=sin(uv.y*22.+time*2.7)*.0035*distort; uv.y+=sin(uv.x*17.+time*2.1)*.0025*distort; }
        vec2 d=uv-.5; float ca=chroma*.0025+distort*.004;
        vec3 c=vec3(texture2D(tDiffuse,uv+d*ca).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-d*ca).b);
        c*=bright*.62; c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.); c=pow(max(c,0.),vec3(1./2.2));
        float l=dot(c,vec3(.299,.587,.114)); c=mix(c,vec3(l)*vec3(1.0,1.0,1.04),desat);
        c=mix(c,c*vec3(1.25,.75,.7),red);
        float v=smoothstep(.95,.15,length(d)*vignette); c*=mix(1.,v,.9);
        c+=(rnd(uv*vec2(1.7,.9)+fract(time*7.31))-.5)*grain;
        c=mix(c,vec3(1.),flash); c*=(1.-fade);
        gl_FragColor=vec4(c,1.);
      }`,
    depthTest: false, depthWrite: false
  });
  G.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), G.post));
  window.addEventListener('resize', onResize); onResize();
}
function onResize() {
  const w = window.innerWidth, h = window.innerHeight; const pr = G.renderer.getPixelRatio();
  G.renderer.setSize(w, h, false); G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
  G.rt.setSize(Math.floor(w * pr), Math.floor(h * pr));
}

// ---------------- world container ----------------
function newWorld() {
  if (W && W.emitters) W.emitters.forEach(e => { try { e.stop(); } catch (er) {} });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080b);
  scene.fog = new THREE.FogExp2(0x07080b, 0.05);
  W = {
    scene, colliders: [], ramps: [], surfaces: [], occluders: [], interact: [], rayList: [],
    lamps: [], doors: {}, mirrors: [], obj: {}, emitters: [], updaters: [], timers: [], groups: {},
    portraits: {}, items: {}
  };
  G.scene = scene;
  return W;
}

// ---------------- primitive builders ----------------
const WALL_T = 0.16;
function add(o, parent) { (parent || W.scene).add(o); return o; }
function box(w, h, d, x, y, z, mat, opt = {}) { // y = bottom
  const g = new THREE.BoxGeometry(w, h, d);
  const tile = opt.tile || (mat && mat.userData && mat.userData.tile) || 1; scaleBoxUV(g, w, h, d, tile);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y + h / 2, z);
  if (opt.ry) m.rotation.y = opt.ry; if (opt.rx) m.rotation.x = opt.rx; if (opt.rz) m.rotation.z = opt.rz;
  m.receiveShadow = opt.receive !== false; m.castShadow = !!opt.cast;
  add(m, opt.parent);
  if (opt.occ !== false) W.occluders.push(m);
  if (opt.solid) {
    const rot = Math.abs(Math.sin(opt.ry || 0)) > .7; const hw = (rot ? d : w) / 2, hd = (rot ? w : d) / 2;
    addCollider(x - hw, x + hw, z - hd, z + hd, opt.lv == null ? 0 : opt.lv, { grp: opt.parent && opt.parent.isGroup && opt.parent !== W.scene ? opt.parent : null, low: opt.low });
  }
  return m;
}
function cyl(rt, rb, h, x, y, z, mat, opt = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, opt.seg || 14, 1, !!opt.open), mat); m.position.set(x, y + h / 2, z);
  m.castShadow = !!opt.cast; m.receiveShadow = true; if (opt.rx) m.rotation.x = opt.rx; if (opt.rz) m.rotation.z = opt.rz; add(m, opt.parent);
  if (opt.solid) { const r = Math.max(rt, rb); addCollider(x - r, x + r, z - r, z + r, opt.lv == null ? 0 : opt.lv, { grp: opt.parent && opt.parent.isGroup ? opt.parent : null }); }
  if (opt.occ) W.occluders.push(m);
  return m;
}
function sph(r, x, y, z, mat, opt = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, opt.seg || 14, opt.seg ? Math.ceil(opt.seg * .7) : 10), mat); m.position.set(x, y, z);
  if (opt.sx) m.scale.set(opt.sx, opt.sy || 1, opt.sz || opt.sx); m.castShadow = !!opt.cast; m.receiveShadow = true; add(m, opt.parent); return m;
}
function plane(w, h, x, y, z, mat, opt = {}) { // y = center
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = opt.ry || 0; if (opt.rx) m.rotation.x = opt.rx; m.receiveShadow = opt.receive !== false; add(m, opt.parent); return m;
}
function addCollider(x1, x2, z1, z2, lv, opt = {}) {
  const c = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), lv: Array.isArray(lv) ? lv : [lv], on: true, grp: opt.grp || null, low: !!opt.low, tag: opt.tag };
  W.colliders.push(c); return c;
}
function grpOff(g) { return g ? g.position : { x: 0, z: 0 }; }

// walls ---------------------------------------------------------------
// wallZ: wall at constant x spanning z1..z2 ; wallX: constant z spanning x1..x2
// holes: [[a,b,top]] door openings ; opt: {lv (collider levels), y0, h, mat2, parent}
function shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function wallAlong(axis, c, a1, a2, lv, mat, holes = [], opt = {}) {
  const L = Array.isArray(lv) ? lv : [lv];
  const base = opt.y0 != null ? opt.y0 : levelY(L[0]);
  const H = opt.h != null ? opt.h : (L[0] === 1 ? 3.0 : 3.4);
  const t = opt.t || WALL_T; const parent = opt.parent;
  const hs = holes.slice().sort((p, q) => p[0] - q[0]);
  const segs = []; let cur = a1;
  hs.forEach(hh => { if (hh[0] > cur) segs.push([cur, hh[0], 0, H]); const top = hh[2] || 2.25; if (top < H) segs.push([hh[0], hh[1], top, H, true]); cur = hh[1]; });
  if (cur < a2) segs.push([cur, a2, 0, H]);
  const meshes = [];
  segs.forEach(([s, e, yb, yt, lintel]) => {
    const len = e - s, mid = (s + e) / 2, hh = yt - yb;
    if (len <= 0.001) return;
    const mk = (off, th, m) => {
      const px = axis === 'z' ? c + off : mid, pz = axis === 'z' ? mid : c + off;
      const w = axis === 'z' ? th : len, d = axis === 'z' ? len : th;
      const mesh = box(w, hh, d, px, base + yb, pz, m, { parent });
      meshes.push(mesh);
    };
    if (opt.mat2) { mk(-t / 4, t / 2, mat); mk(t / 4, t / 2, opt.mat2); } else mk(0, t, mat);
    if (!lintel && !opt.noCol) {
      const g = parent && parent.isGroup ? parent : null;
      if (axis === 'z') addCollider(c - t / 2, c + t / 2, s, e, L, { grp: g }); else addCollider(s, e, c - t / 2, c + t / 2, L, { grp: g });
    }
  });
  // baseboards
  if (!opt.noTrim) {
    let cur2 = a1; const pieces = []; hs.forEach(hh => { if (hh[0] > cur2) pieces.push([cur2, hh[0]]); cur2 = hh[1]; }); if (cur2 < a2) pieces.push([cur2, a2]);
    pieces.forEach(([s, e]) => { const len = e - s, mid = (s + e) / 2; if (axis === 'z') box(t + .05, .12, len, c, base, mid, MAT.darkWood, { parent, occ: false }); else box(len, .12, t + .05, mid, base, c, MAT.darkWood, { parent, occ: false }); });
  }
  return meshes;
}
const wallZ = (x, z1, z2, lv, mat, holes, opt) => wallAlong('z', x, z1, z2, lv, mat, holes, opt);
const wallX = (z, x1, x2, lv, mat, holes, opt) => wallAlong('x', z, x1, x2, lv, mat, holes, opt);

function floorRect(x1, x2, z1, z2, y, mat, opt = {}) {
  const m = box(x2 - x1, .1, z2 - z1, (x1 + x2) / 2, y - .1, (z1 + z2) / 2, mat, { parent: opt.parent, occ: true });
  if (opt.surf) W.surfaces.push({ x1, x2, z1, z2, lv: opt.lv == null ? 0 : opt.lv, type: opt.surf, grp: opt.parent && opt.parent.isGroup ? opt.parent : null });
  return m;
}
function ceilRect(x1, x2, z1, z2, y, mat, opt = {}) { return box(x2 - x1, .1, z2 - z1, (x1 + x2) / 2, y, (z1 + z2) / 2, mat || MAT.plaster, { parent: opt.parent, occ: false }); }
function surface(x1, x2, z1, z2, lv, type, grp) { W.surfaces.push({ x1, x2, z1, z2, lv, type, grp: grp || null }); }

// door frames (trim around openings)
function doorFrame(axis, c, a, b, y0, top, parent) {
  const t = WALL_T + .06, w = .09;
  if (axis === 'z') return [box(t, top, w, c, y0, a - w / 2 + .02, MAT.darkWood, { parent, occ: false }), box(t, top, w, c, y0, b + w / 2 - .02, MAT.darkWood, { parent, occ: false }), box(t, w, b - a + w * 2, c, y0 + top, (a + b) / 2, MAT.darkWood, { parent, occ: false })];
  return [box(w, top, t, a - w / 2 + .02, y0, c, MAT.darkWood, { parent, occ: false }), box(w, top, t, b + w / 2 - .02, y0, c, MAT.darkWood, { parent, occ: false }), box(b - a + w * 2, w, t, (a + b) / 2, y0 + top, c, MAT.darkWood, { parent, occ: false })];
}

// ---------------- interaction registry ----------------
function interactive(obj, def) {
  obj.traverse(o => { if (o.isMesh) { o.userData.it = def; W.interact.push(o); } });
  def.obj = obj; return def;
}
function rebuildRayList() { W.rayList = W.occluders.concat(W.interact.filter(m => !W.occluders.includes(m))); }

// ---------------- lamps (pooled point lights) ----------------
function lamp(x, y, z, opt = {}) {
  const parent = opt.parent;
  let obj;
  if (opt.bulb !== false) {
    const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(opt.color || 0xffd9a0) });
    obj = sph(opt.size || .06, x, y, z, bm, { parent, seg: 8 });
    obj.userData.bulbMat = bm; obj.userData.baseColor = bm.color.clone();
  } else { obj = new THREE.Object3D(); obj.position.set(x, y, z); add(obj, parent); }
  const L = { obj, color: new THREE.Color(opt.color || 0xffd9a0), int: opt.int == null ? 1.2 : opt.int, dist: opt.dist || 8, on: opt.on !== false, flick: opt.flick || 0, cur: 0, lv: opt.lv != null ? opt.lv : (y > 3.3 ? 1 : y < -0.1 ? -1 : 0), name: opt.name, mult: 1, wp: new THREE.Vector3(), always: !!opt.always };
  W.lamps.push(L); if (opt.name) W.obj['lamp_' + opt.name] = L;
  return L;
}
function setLamp(L, on) { if (L) L.on = on; }

function initLightPool() {
  W.pool = [];
  for (let i = 0; i < 7; i++) { const p = new THREE.PointLight(0xffffff, 0, 8, 2); W.scene.add(p); W.pool.push(p); }
  W.hemi = new THREE.HemisphereLight(0x3a4458, 0x0e0c0a, .22); W.scene.add(W.hemi);
  W.moon = new THREE.DirectionalLight(0x7d93c4, 0); W.moon.position.set(-20, 30, 25); W.scene.add(W.moon);
  // flashlight
  const fl = new THREE.SpotLight(0xfff1d8, 2.6, 20, 0.52, 0.55, 1.6);
  fl.castShadow = !!Settings.shadows; fl.shadow.mapSize.set(1024, 1024); fl.shadow.camera.near = .2; fl.shadow.camera.far = 20; fl.shadow.bias = -0.0006;
  W.rflash = [0, 1, 2].map(() => { const s = new THREE.SpotLight(0xfff1d8, 0, 16, .5, .55, 1.6); W.scene.add(s); W.scene.add(s.target); return s; });
  W.flash = fl; W.flashTarget = new THREE.Object3D(); W.scene.add(fl); W.scene.add(W.flashTarget); fl.target = W.flashTarget;
}
const _v = new THREE.Vector3();
function updateLights(dt) {
  const cam = G.camera.position; const blackout = W.blackout;
  const cand = [];
  for (const L of W.lamps) {
    let target = (L.on && !blackout) ? L.int * L.mult : 0;
    if (L.flick && target > 0) { const t = G.time * (5 + L.flick * 9) + L.int * 13; const n = Math.sin(t) * Math.sin(t * 2.31) * Math.sin(t * .71); if (n > 1 - L.flick * 1.4) target *= rand(.05, .35); }
    L.cur = target;
    if (L.obj.userData.bulbMat) { const k = target > 0 ? clamp(.25 + target / (L.int || 1) * .9, 0, 1.3) : 0.04; L.obj.userData.bulbMat.color.copy(L.obj.userData.baseColor).multiplyScalar(k); }
    if (target <= 0) continue;
    L.obj.getWorldPosition(L.wp);
    const d2 = L.wp.distanceToSquared(cam); if (d2 > 26 * 26) continue;
    if (!L.always && L.lv !== P.lv && Math.abs(L.wp.y - cam.y) > 2.2) continue;
    cand.push({ L, s: target * (L.always ? 50 : 1) / (d2 + 2) });
  }
  cand.sort((a, b) => b.s - a.s);
  W.pool.forEach((p, i) => {
    const c = cand[i];
    if (!c) { p.intensity = 0; return; }
    p.position.copy(c.L.wp); p.color.copy(c.L.color); p.distance = c.L.dist; p.intensity = c.L.cur;
  });
}

// ---------------- doors ----------------
// axis 'z' : door lies in a wall of constant x (spans z) ; 'x' : wall of constant z (spans x)
function makeDoor(id, o) {
  const parent = o.parent || W.scene; const lv = o.lv == null ? 0 : o.lv; const y0 = o.y0 != null ? o.y0 : levelY(lv);
  const w = o.w || .96, h = o.h || 2.2;
  const pivot = new THREE.Group(); add(pivot, parent);
  let hx, hz;
  if (o.axis === 'z') { hx = o.c; hz = o.mid - w / 2; } else { hx = o.mid - w / 2; hz = o.c; }
  pivot.position.set(hx, y0, hz);
  const mat = o.mat || MAT.door;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(o.axis === 'z' ? .055 : w, h, o.axis === 'z' ? w : .055), mat);
  if (o.axis === 'z') panel.position.set(0, h / 2, w / 2); else panel.position.set(w / 2, h / 2, 0);
  panel.castShadow = true; panel.receiveShadow = true; pivot.add(panel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), MAT.brass);
  if (o.axis === 'z') knob.position.set(0, 1.0, w - .1); else knob.position.set(w - .1, 1.0, 0);
  knob.scale.set(o.axis === 'z' ? 3.2 : 1, 1, o.axis === 'z' ? 1 : 3.2); pivot.add(knob);
  const frames = o.noFrame ? [] : doorFrame(o.axis, o.c, o.mid - w / 2 - .02, o.mid + w / 2 + .02, y0, h + .02, parent);
  const col = o.axis === 'z' ? addCollider(o.c - .08, o.c + .08, o.mid - w / 2, o.mid + w / 2, lv, { grp: parent.isGroup && parent !== W.scene ? parent : null }) : addCollider(o.mid - w / 2, o.mid + w / 2, o.c - .08, o.c + .08, lv, { grp: parent.isGroup && parent !== W.scene ? parent : null });
  const D = {
    id, pivot, panel, knob, col, open: false, ang: 0, target: 0, speed: 3, dir: o.dir || 1, openAng: o.openAng || 1.75,
    locked: !!o.locked, lockMsg: o.lockMsg || 'Locked.', key: o.key || null, missing: false, onOpen: o.onOpen, onUse: o.onUse, name: o.name || 'door', lv,
    pos() { return panel.getWorldPosition(new THREE.Vector3()); },
    setOpen(v, speed = 3) { this.open = v; this.target = v ? this.openAng * this.dir : 0; this.speed = speed; if (!v) this.col.on = true; },
    tryUse() {
      if (this.missing) return;
      if (this.onUse && this.onUse(this) === false) return;
      if (this.locked) {
        if (this.key && Game.hasItem(this.key)) { this.locked = false; SFX.unlock(this.pos()); Game.useItem(this.key, this); UI.notify('Unlocked.'); if (this.onUnlock) this.onUnlock(this); return; }
        SFX.locked(this.pos()); UI.say(typeof this.lockMsg === 'function' ? this.lockMsg() : this.lockMsg, 3.5); return;
      }
      if (this.open) { this.setOpen(false); SFX.doorClose(this.pos()); }
      else { this.setOpen(true); SFX.doorOpen(this.pos()); if (this.onOpen) { const f = this.onOpen; f(this); } }
    },
    slam() { this.setOpen(false, 14); this.col.on = true; SFX.slam(this.pos(), 1); },
    creakOpen(ang = 1, speed = .35) { this.open = true; this.target = ang * this.dir; this.speed = speed; SFX.doorOpen(this.pos(), true); },
    setMissing() { // the house removes the door: it becomes wall
      this.missing = true; this.locked = true; this.setOpen(false, 30); this.ang = 0; this.pivot.rotation.y = 0; this.col.on = true;
      panel.material = o.wallMat || MAT.wallPink; panel.scale.set(o.axis === 'z' ? 2.6 : 1.1, 1.03, o.axis === 'z' ? 1.1 : 2.6); knob.visible = false;
      panel.position.y = h / 2 + .02; frames.forEach(f => f.visible = false);
      this.def.prompt = () => null;
    }
  };
  D.def = interactive(panel, { prompt: () => D.missing ? null : D.locked ? (D.key && Game.hasItem(D.key) ? 'Unlock' : 'Try the ' + D.name) : D.open ? 'Close' : 'Open', use: () => D.tryUse() });
  interactive(knob, D.def);
  W.doors[id] = D;
  return D;
}
function updateDoors(dt) {
  for (const k in W.doors) {
    const D = W.doors[k];
    if (Math.abs(D.ang - D.target) > .001) {
      const step = D.speed * dt; D.ang += clamp(D.target - D.ang, -step, step);
      D.pivot.rotation.y = D.ang;
      if (Math.abs(D.ang) > .35) D.col.on = false; else D.col.on = true;
    }
  }
}

// ---------------- mirrors (planar reflection) ----------------
function makeMirror(w, h, x, y, z, ry, opt = {}) {
  const res = 512;
  const rt = new THREE.WebGLRenderTarget(res, Math.round(res * h / w), { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const tm = new THREE.Matrix4();
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, textureMatrix: { value: tm }, tint: { value: new THREE.Color(opt.tint || 0x9aa39a) }, time: { value: 0 } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vU; void main(){ vU=uv; vUv=textureMatrix*vec4(position,1.); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tint; varying vec4 vUv; varying vec2 vU;
      float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5);}
      void main(){ vec4 c=texture2DProj(tDiffuse,vUv); vec2 d=vU-.5; float spot=smoothstep(.75,.2,length(d)); float dirt=h(floor(vU*80.))*.15;
        vec3 col=c.rgb*tint*(.55+.45*spot)-dirt*.08; gl_FragColor=vec4(col,1.); }`
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z); mesh.rotation.y = ry; add(mesh, opt.parent);
  const vcam = new THREE.PerspectiveCamera(); vcam.layers.enable(2);
  const plane = new THREE.Plane(), normal = new THREE.Vector3(), mpos = new THREE.Vector3(), cpos = new THREE.Vector3(), rotM = new THREE.Matrix4(), look = new THREE.Vector3(), view = new THREE.Vector3(), target = new THREE.Vector3(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const M = { mesh, rt, active: true, range: opt.range || 7 };
  mesh.onBeforeRender = (renderer, scene, camera) => {
    if (!M.active || M.busy) return;
    mpos.setFromMatrixPosition(mesh.matrixWorld); cpos.setFromMatrixPosition(camera.matrixWorld);
    if (mpos.distanceTo(cpos) > M.range) return;
    rotM.extractRotation(mesh.matrixWorld); normal.set(0, 0, 1).applyMatrix4(rotM);
    view.subVectors(mpos, cpos); if (view.dot(normal) > 0) return;
    view.reflect(normal).negate(); view.add(mpos);
    rotM.extractRotation(camera.matrixWorld); look.set(0, 0, -1).applyMatrix4(rotM); look.add(cpos);
    target.subVectors(mpos, look); target.reflect(normal).negate(); target.add(mpos);
    vcam.position.copy(view); vcam.up.set(0, 1, 0).applyMatrix4(rotM).reflect(normal); vcam.lookAt(target);
    vcam.far = camera.far; vcam.near = camera.near; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(camera.projectionMatrix);
    tm.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1); tm.multiply(vcam.projectionMatrix); tm.multiply(vcam.matrixWorldInverse); tm.multiply(mesh.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, mpos); plane.applyMatrix4(vcam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = vcam.projectionMatrix.elements;
    q.x = (Math.sign(clip.x) + pm[8]) / pm[0]; q.y = (Math.sign(clip.y) + pm[9]) / pm[5]; q.z = -1; q.w = (1 + pm[10]) / pm[14];
    clip.multiplyScalar(2 / clip.dot(q)); pm[2] = clip.x; pm[6] = clip.y; pm[10] = clip.z + 1 - .003; pm[14] = clip.w;
    M.busy = true; mesh.visible = false;
    const cur = renderer.getRenderTarget(); const su = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, vcam);
    renderer.setRenderTarget(cur); renderer.shadowMap.autoUpdate = su;
    mesh.visible = true; M.busy = false;
  };
  W.mirrors.push(M);
  return M;
}

// ---------------- render-to-texture snapshots ----------------
function snapshotCanvas(camPos, lookAt, w = 320, h = 240, opt = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h);
  const cam = new THREE.PerspectiveCamera(opt.fov || 55, w / h, .05, 60); cam.position.copy(camPos); cam.lookAt(lookAt); cam.layers.enable(2);
  const prevFlash = W.flash.intensity;
  G.renderer.setRenderTarget(rt); G.renderer.clear(); G.renderer.render(W.scene, cam); G.renderer.setRenderTarget(null);
  const px = new Uint8Array(w * h * 4); G.renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); rt.dispose();
  const c = makeCanvas(w, h), ctx = c.getContext('2d'); const img = ctx.createImageData(w, h);
  const gain = opt.gain || 2.2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = ((h - 1 - y) * w + x) * 4, di = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) img.data[di + k] = clamp(Math.pow(px[si + k] / 255 * gain, 1 / 2.2) * 255, 0, 255);
    img.data[di + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  W.flash.intensity = prevFlash;
  return c;
}
// age a canvas into an old photograph
function agePhoto(src, caption) {
  return drawPhoto({ w: 340, h: 280, bg: 'dark', caption, scale: .7, draw: (ctx, iw, ih) => { ctx.drawImage(src, 0, 0, iw, ih); } });
}

// ---------------- physics ----------------
function collide(p, r, lv, crouch) {
  for (let it = 0; it < 3; it++) {
    for (const c of W.colliders) {
      if (!c.on || c.lv.indexOf(lv) < 0 || (c.low && crouch)) continue;
      const o = grpOff(c.grp);
      const x1 = c.x1 + o.x, x2 = c.x2 + o.x, z1 = c.z1 + o.z, z2 = c.z2 + o.z;
      const nx = clamp(p.x, x1, x2), nz = clamp(p.z, z1, z2);
      const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), push = (r - d) / d; p.x += dx * push; p.z += dz * push; }
        else { // centre inside box: push out along smallest axis
          const l = p.x - x1, rr = x2 - p.x, f = p.z - z1, b = z2 - p.z, m = Math.min(l, rr, f, b);
          if (m === l) p.x = x1 - r; else if (m === rr) p.x = x2 + r; else if (m === f) p.z = z1 - r; else p.z = z2 + r;
        }
      }
    }
  }
}
function rampAt(x, z) {
  for (const R of W.ramps) if (x >= R.x1 && x <= R.x2 && z >= R.z1 && z <= R.z2) return R;
  return null;
}
function rampY(R, z) { const t = clamp((z - R.za) / (R.zb - R.za), 0, 1); return lerp(R.ya, R.yb, t); }
function surfaceAt(x, z, lv) {
  let s = null;
  for (const S of W.surfaces) { if (S.lv !== lv) continue; const o = grpOff(S.grp); if (x >= S.x1 + o.x && x <= S.x2 + o.x && z >= S.z1 + o.z && z <= S.z2 + o.z) s = S.type; }
  return s || (lv === -1 ? 'concrete' : 'wood');
}
function inRect(p, x1, x2, z1, z2, grp) { const o = grpOff(grp); return p.x >= x1 + o.x && p.x <= x2 + o.x && p.z >= z1 + o.z && p.z <= z2 + o.z; }

// visibility helpers
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4();
function updateFrustum() { _pm.multiplyMatrices(G.camera.projectionMatrix, G.camera.matrixWorldInverse); _frustum.setFromProjectionMatrix(_pm); }
function inView(pos, margin = 0) { if (margin) { const s = new THREE.Sphere(pos, margin); return _frustum.intersectsSphere(s); } return _frustum.containsPoint(pos); }
function lookDot(pos) { const d = _v.copy(pos).sub(G.camera.position).normalize(); const f = new THREE.Vector3(0, 0, -1).applyQuaternion(G.camera.quaternion); return f.dot(d); }
function camFwd() { return new THREE.Vector3(0, 0, -1).applyQuaternion(G.camera.quaternion); }
const _ray = new THREE.Raycaster();
function visibleFrom(pos) { // line of sight from camera (walls block)
  const cp = G.camera.position; const dir = _v.copy(pos).sub(cp); const dist = dir.length(); dir.normalize();
  _ray.set(cp, dir); _ray.far = dist - .3; const hit = _ray.intersectObjects(W.occluders, false);
  return hit.length === 0;
}
