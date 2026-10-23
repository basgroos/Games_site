// THE LAST SHIFT — hoofdmodule: renderer, game-loop, systemen.
import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { buildMaterials } from './textures.js';
import { Level, LightSystem, ROOMS } from './level.js';
import { Player } from './player.js';
import { Enemy, Director } from './enemy.js';
import { UI } from './ui.js';
import { Story } from './story.js';
import { Net } from './net.js';

// ---------------- INPUT ----------------
class Input {
  constructor(game) {
    this.game = game; this.keys = new Set(); this.locked = false; this.dragLook = false; this.wantLock = false;
    addEventListener('keydown', (e) => {
      if (e.ctrlKey && ['KeyW', 'KeyS', 'KeyD', 'KeyA', 'KeyR', 'KeyF', 'KeyP'].includes(e.code)) e.preventDefault();
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code) || e.code.startsWith('Control')) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) game.onKey(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === game.canvas;
      if (!this.locked && game.state === 'play' && !game.ui.modal && !this.dragLook) game.pause(true);
    });
    document.addEventListener('pointerlockerror', () => { this.dragLook = true; });
    addEventListener('mousemove', (e) => {
      if (game.state !== 'play') return;
      if (game.ui.modal === 'inspect') { if (e.buttons || this.locked) game.inspector.rotate(e.movementX, e.movementY); return; }
      if (game.ui.modal) return;
      if (this.locked || (this.dragLook && e.buttons)) game.player.look(e.movementX, e.movementY);
    });
    game.canvas.addEventListener('mousedown', (e) => {
      if (game.state !== 'play' || game.ui.modal) return;
      if (!this.locked && !this.dragLook) { this.lock(); return; }
      if (e.button === 0 && (this.locked || e.shiftKey)) game.throwBottle();
    });
    game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  key(c) { return this.keys.has(c); }
  lock() { if (this.dragLook) return; try { const p = this.game.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { this.dragLook = true; }); } catch (e) { this.dragLook = true; } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
}

// ---------------- ZAKLAMP ----------------
class Flashlight {
  constructor(game) {
    this.game = game; this.on = false; this.glitchT = 0; this.dead = 0;
    const s = this.spot = new THREE.SpotLight(0xfff1dc, 0, 30, 0.43, 0.55, 1.4);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.03; s.shadow.camera.near = 0.2; s.shadow.camera.far = 30;
    game.scene.add(s, s.target);
    this.fill = new THREE.PointLight(0xffe8d0, 0, 7, 2); game.scene.add(this.fill);
    this.dir = new THREE.Vector3(0, 0, -1); this.pos = new THREE.Vector3();
    // stofkegel
    const cone = new THREE.ConeGeometry(2.6, 9, 32, 1, true); cone.translate(0, -4.5, 0); cone.rotateX(-Math.PI / 2);
    this.cone = new THREE.Mesh(cone, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { intensity: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; varying float vY; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz; vY = uv.y; gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float intensity; varying vec3 vN; varying vec3 vP; varying float vY; void main(){ float e = pow(abs(dot(normalize(vN), normalize(-vP))), 3.0); float a = e * pow(vY, 2.2) * intensity; gl_FragColor = vec4(vec3(1.0,0.95,0.85)*a, a); }',
    }));
    this.cone.frustumCulled = false; game.scene.add(this.cone);
  }
  toggle() { this.on = !this.on; this.game.audio.play('flashlight_click', { volume: 0.6 }); }
  glitch(t) { this.glitchT = Math.max(this.glitchT, t); }
  kill(t) { this.dead = t; }
  update(dt) {
    const cam = this.game.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.dir.lerp(fwd, Math.min(1, dt * 16)).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    this.pos.copy(cam.position).addScaledVector(right, 0.18).addScaledVector(up, -0.16);
    this.spot.position.copy(this.pos);
    this.spot.target.position.copy(this.pos).addScaledVector(this.dir, 5);
    this.fill.position.copy(cam.position).addScaledVector(this.dir, 0.6);
    let k = this.on ? 1 : 0;
    if (this.glitchT > 0) { this.glitchT -= dt; if (Math.random() < 0.5) k *= Math.random() * 0.3; }
    if (this.dead > 0) { this.dead -= dt; k = 0; }
    const flick = 0.97 + 0.03 * Math.sin(this.game.time * 37) * Math.sin(this.game.time * 13);
    this.spot.intensity = k * 26 * flick;
    this.fill.intensity = k * 0.35;
    this.cone.position.copy(this.pos);
    this.cone.lookAt(this.pos.clone().add(this.dir));
    this.cone.material.uniforms.intensity.value = k * 0.06;
    this.cone.visible = k > 0;
  }
}

// ---------------- INVENTARIS ----------------
class Inventory {
  constructor(game) { this.game = game; this.items = []; this.max = 5; }
  has(id) { return this.items.some((i) => i.id === id); }
  count(id) { const i = this.items.find((x) => x.id === id); return i ? i.count : 0; }
  add(id, name, desc, stack = false) {
    const ex = this.items.find((i) => i.id === id);
    if (ex && stack) { if (ex.count >= 3) { this.game.ui.toast('Je kunt er niet meer meenemen.'); return false; } ex.count++; return true; }
    if (this.items.length >= this.max) { this.game.ui.toast('Inventaris vol.'); return false; }
    this.items.push({ id, name, desc, count: 1 }); return true;
  }
  remove(id) { const i = this.items.findIndex((x) => x.id === id); if (i < 0) return; if (--this.items[i].count <= 0) this.items.splice(i, 1); }
}

// ---------------- VOORWERP INSPECTEREN ----------------
class Inspector {
  constructor(game) {
    this.game = game; this.canvas = document.getElementById('inspectCanvas');
    this.renderer = null; this.obj = null; this.rx = 0.3; this.ry = 0;
  }
  start(obj) {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      this.renderer.setSize(360, 300, false);
      this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(35, 360 / 300, 0.01, 10); this.cam.position.set(0, 0, 0.9);
      this.scene.add(new THREE.HemisphereLight(0xbfc8d0, 0x101010, 1.2));
      const d = new THREE.DirectionalLight(0xfff0e0, 2.5); d.position.set(1, 1.5, 2); this.scene.add(d);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
    if (this.obj) this.scene.remove(this.obj);
    this.obj = obj.clone(); this.obj.position.set(0, 0, 0); this.obj.rotation.set(0, 0, 0); this.obj.visible = true;
    const b = new THREE.Box3().setFromObject(this.obj), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = 0.45 / Math.max(s.x, s.y, s.z); this.obj.scale.multiplyScalar(k); this.obj.position.sub(c.multiplyScalar(k));
    const piv = new THREE.Group(); piv.add(this.obj); this.scene.add(piv); this.obj = piv;
    this.active = true; this.rx = 0.4; this.ry = 0.5;
  }
  rotate(dx, dy) { this.ry += dx * 0.01; this.rx += dy * 0.01; }
  stop() { this.active = false; }
  update(dt) { if (!this.active) return; this.ry += dt * 0.4; this.obj.rotation.set(this.rx, this.ry, 0); this.renderer.render(this.scene, this.cam); }
}

// ---------------- POST-PROCESSING ----------------
const PostShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fear: { value: 0 }, flash: { value: 0 }, flashColor: { value: new THREE.Color(1, 1, 1) }, exposure: { value: 1 }, res: { value: new THREE.Vector2() }, grainAmt: { value: 0.06 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, fear, flash, exposure, grainAmt; uniform vec3 flashColor; uniform vec2 res; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
    void main(){
      vec2 uv = vUv;
      float wob = fear * 0.002 * sin(uv.y*40.0 + time*7.0);
      uv.x += wob;
      vec2 dc = (uv - 0.5);
      float ca = 0.0012 + fear * 0.006;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dc*ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dc*ca).b;
      col *= exposure;
      col = aces(col);
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(col, vec3(l), 0.25 + fear*0.35);
      col *= vec3(0.97, 1.0, 1.02);
      float v = smoothstep(0.85, 0.25, length(dc*vec2(1.0, 0.85)));
      col *= mix(0.35, 1.0, v) * (1.0 - fear*0.25*(1.0-v));
      col = toSRGB(col);
      float n = h(uv*res + fract(time*13.0)*100.0) - 0.5;
      col += n * (grainAmt + fear*0.05);
      col -= 0.025 * sin(uv.y*res.y*1.5) * 0.5;
      col = mix(col, flashColor, flash);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// ---------------- GAME ----------------
export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.state = 'menu';
    this.time = 0; this.playTime = 0;
    this.settings = Object.assign({ volume: 0.8, scare: 0.85, sens: 1, motion: 1, quality: 1, bright: 1 }, loadSettings());
    this.audio = new AudioEngine();
    this.interactables = new Map();
    this.checkpoint = null;
    this.thrown = [];
    this.hooks = [];
    this.netDefs = []; this.actor = null;
    this.net = new Net(this);
  }
  async init(progress) {
    progress('Renderer…', 0.05);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020203);
    this.scene.fog = new THREE.FogExp2(0x030304, 0.075);
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
    this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight(0x3a4050, 0x0a0a08, 0.06));
    this.setupPost();
    this.ui = new UI(this);
    this.input = new Input(this);
    this.inv = new Inventory(this);
    this.inspector = new Inspector(this);
    await tick(); progress('Textures genereren…', 0.15);
    this.M = buildMaterials();
    await tick(); progress('Gebouw bouwen…', 0.35);
    this.player = new Player(this);
    this.level = new Level(this, this.M);
    this.level.build();
    this.lights = new LightSystem(this, this.level, 8);
    this.flashlight = new Flashlight(this);
    this.enemy = new Enemy(this);
    this.director = new Director(this);
    this.story = new Story(this);
    await tick(); progress('Verhaal en puzzels…', 0.5);
    this.story.build();
    this.level.mergeStatic();
    this.level.buildNav();
    this.enemy.setNodes(this.makeNodes());
    this.setupCCTV();
    this.net.init();
    await tick(); progress('Geluid synthetiseren (screams, voetstappen, galm)…', 0.6);
    await this.audio.prepare(48000);
    progress('Shaders compileren…', 0.9); await tick();
    this.onResize(); addEventListener('resize', () => this.onResize());
    this.applySettings();
    // shaders vooraf compileren
    this.renderer.compile(this.scene, this.camera);
  }
  initAudio() {
    this.audio.init();
    this.audio.occlusionFn = (a, b) => this.level.occlusion(a.x, a.z, b.x, b.z, 'audio');
    this.audio.setVolume(this.settings.volume); this.audio.setScareVolume(this.settings.scare);
  }
  makeNodes() {
    const nodes = [];
    for (const r of ROOMS) {
      const n = r.id === 'corridor' || r.id === 'service' ? 8 : r.id === 'passage' ? 2 : 3;
      for (let k = 0; k < n * 4 && nodes.filter((q) => q.room === r.id).length < n; k++) {
        const x = r.x0 + Math.floor(Math.random() * (r.x1 - r.x0 + 1)), z = r.z0 + Math.floor(Math.random() * (r.z1 - r.z0 + 1));
        if (this.level.walkable(x, z, true) && this.level.roomAt(x + 0.5, z + 0.5) === r) nodes.push({ x: x + 0.5, z: z + 0.5, room: r.id });
      }
    }
    return nodes;
  }
  setupPost() {
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.postMat = new THREE.ShaderMaterial({ ...PostShader, uniforms: THREE.UniformsUtils.clone(PostShader.uniforms), depthTest: false, depthWrite: false });
    this.postScene = new THREE.Scene(); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));
    this.fear = 0; this.flash = 0;
  }
  setupCCTV() {
    // bewakingscamera's: render-to-texture met een korrelig zwart-wit scherm
    const mk = (pos, look, label) => { const c = new THREE.PerspectiveCamera(62, 4 / 3, 0.1, 40); c.position.set(...pos); c.lookAt(...look); return { cam: c, label }; };
    this.cctvCams = [
      mk([9.4, 2.8, 21.6], [3, 0.8, 12], 'CAM 1 — HAL'),
      mk([47.6, 2.8, 15.3], [12, 0.8, 16.5], 'CAM 2 — HOOFDGANG'),
      mk([1.3, 2.8, 1.3], [7, 0.6, 9.5], 'CAM 3 — BEVEILIGING'),
      mk([28.6, 2.8, 19.4], [20, 0.5, 27], 'CAM 4 — KANTINE'),
      mk([9.4, 2.8, 23.4], [5, 0.8, 32.5], 'CAM 6 — LAADDOCK'),
    ];
    const cctvMat = (rt) => new THREE.ShaderMaterial({
      uniforms: { map: { value: rt.texture }, time: { value: 0 }, on: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float time, on; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){ vec2 uv = vUv; uv.x += (h(vec2(floor(uv.y*60.0), floor(time*20.0))) - 0.5) * 0.004;
          vec3 c = texture2D(map, uv).rgb; float l = dot(c, vec3(0.3,0.59,0.11)); l = pow(clamp(l*3.0,0.0,1.0), 0.6);
          l += (h(uv*vec2(320.0,240.0)+time) - 0.5) * 0.18; l *= 0.85 + 0.15*sin(uv.y*400.0);
          float vg = smoothstep(0.75, 0.2, length(uv-0.5)); vec3 col = vec3(l*0.85, l, l*0.85) * vg * on;
          gl_FragColor = vec4(col + vec3(0.01,0.012,0.01), 1.0); }`,
    });
    this.cctv = [];
    const monitors = [...this.level.named.monitors, this.level.named.serverMonitor];
    monitors.forEach((m, i) => {
      const rt = new THREE.WebGLRenderTarget(256, 192);
      const mat = cctvMat(rt); m.screen.material = mat;
      const camIdx = i === 3 ? 4 : i;
      this.cctv.push({ m, rt, mat, cam: camIdx, t: Math.random() * 4, server: i === 3 });
    });
    // lichaam van de speler (alleen zichtbaar op camerabeelden)
    const body = this.playerBody = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 8), bm); torso.position.y = 1.05; body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0x5c4a40 })); head.position.y = 1.68; body.add(head);
    for (const s of [-0.1, 0.1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 4, 8), bm); l.position.set(s, 0.4, 0); body.add(l); }
    body.visible = false; this.scene.add(body);
  }
  renderCCTV(dt) {
    const p = this.player.pos;
    const nearSec = p.x < 11 && p.z < 11, nearServer = p.x > 39 && p.z > 18 && p.z < 29;
    if (!nearSec && !nearServer) return;
    const powered = this.lights.power.A;
    for (const c of this.cctv) {
      c.mat.uniforms.time.value = this.time;
      const on = c.server ? this.lights.power.D || this.story.flags.serverOpen : powered;
      c.mat.uniforms.on.value = on ? 1 : 0;
      if (!on || (c.server ? !nearServer : !nearSec)) continue;
      c.t -= dt;
      if (!c.server && c.t <= 0) { c.t = 5 + Math.random() * 3; c.cam = (c.cam + 3) % 4; }
    }
    this._cc = ((this._cc || 0) + 1) % 3;
    const c = this.cctv.filter((x) => x.mat.uniforms.on.value > 0)[this._cc];
    if (!c) return;
    const camObj = this.cctvCams[c.cam].cam;
    this.playerBody.position.set(p.x, 0, p.z); this.playerBody.rotation.y = this.player.yaw; this.playerBody.visible = !this.player.hidden;
    const fl = this.flashlight.cone.visible; this.flashlight.cone.visible = false;
    for (const x of this.cctv) x.m.screen.visible = false;
    this.story.beforeCCTV && this.story.beforeCCTV(c, camObj);
    const fog = this.scene.fog.density; this.scene.fog.density = 0.03;
    this.renderer.setRenderTarget(c.rt); this.renderer.render(this.scene, camObj);
    this.scene.fog.density = fog;
    this.story.afterCCTV && this.story.afterCCTV(c, camObj);
    this.playerBody.visible = false; this.flashlight.cone.visible = fl;
    for (const x of this.cctv) x.m.screen.visible = true;
    this.renderer.setRenderTarget(null);
  }
  applySettings() {
    const s = this.settings;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, s.quality >= 1 ? 1.5 : 0.75));
    this.flashlight.spot.shadow.mapSize.set(s.quality >= 1 ? 1024 : 512, s.quality >= 1 ? 1024 : 512);
    if (this.flashlight.spot.shadow.map) { this.flashlight.spot.shadow.map.dispose(); this.flashlight.spot.shadow.map = null; }
    this.audio.setVolume(s.volume); this.audio.setScareVolume(s.scare);
    this.onResize();
    saveSettings(s);
  }
  onResize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.rt.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.postMat.uniforms.res.value.set(w * pr, h * pr);
  }
  // ---------- interactie ----------
  addInteract(obj, def) { def.netId = this.netDefs.length; this.netDefs.push(def); this.interactables.set(obj, def); obj.userData.interact = def; return def; }
  // ---------- co-op hulpfuncties ----------
  isGuest() { return this.net.active && !this.net.isHost; }
  localTarget() {
    const p = this.player; if (p.dead || this.dying) return null;
    const t = this._lt || (this._lt = { id: 'local', local: true });
    t.pos = p.pos; t.eye = this.camera.position; t.crouch = p.crouch; t.running = p.running; t.flash = this.flashlight.on;
    t.dir = this.flashlight.dir; t.hidden = p.hidden; t.stillT = p.stillT; t.dead = false;
    return t;
  }
  targets() { const a = []; const l = this.localTarget(); if (l) a.push(l); if (this.net.active && this.net.isHost) for (const t of this.net.remoteTargets()) if (!t.dead) a.push(t); return a; }
  isVisibleToAny(p) { return this.isVisibleToPlayer(p) || (this.net.active && this.net.isHost && this.net.remoteSees(p)); }
  // voert een interactie uit namens een co-op-gast (deuren draaien van hem af, meldingen gaan naar hem)
  withActor(peer, d, fn) { this.actor = { peer, pos: { x: +d.x || this.player.pos.x, z: +d.z || this.player.pos.z } }; try { fn(); } finally { this.actor = null; } }
  actorPos() { return this.actor ? this.actor.pos : this.player.pos; }
  sfx(name, o = {}) { this.net.sfx(name, o); return this.audio.play(name, o); }
  removeInteract(obj) { this.interactables.delete(obj); delete obj.userData.interact; }
  findInteract() {
    if (this.player.hidden) return { def: { prompt: () => 'Tevoorschijn komen', use: () => this.player.unhide() } };
    const rc = this._rc || (this._rc = new THREE.Raycaster());
    rc.setFromCamera({ x: 0, y: 0 }, this.camera); rc.far = 2.3;
    const objs = [...this.interactables.keys()].filter((o) => o.parent);
    const hits = rc.intersectObjects([...objs, ...this.level.raycastBlockers], true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.interact) o = o.parent;
      if (!o) return null; // muur in de weg
      const def = o.userData.interact;
      if (def.enabled && !def.enabled()) continue;
      return { def, obj: o, point: h.point };
    }
    // verstopplekken in de buurt (bureau/tafel op ooghoogte niet goed te raken)
    for (const s of this.level.hideSpots) {
      const d = Math.hypot(s.out.x - this.player.pos.x, s.out.z - this.player.pos.z);
      if (d < 1.0 && s.type === 'desk') {
        const to = new THREE.Vector3(s.pos.x - this.camera.position.x, s.pos.y - this.camera.position.y, s.pos.z - this.camera.position.z).normalize();
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        if (to.dot(f) > 0.75) return { def: { prompt: () => s.prompt, use: () => this.player.hide(s) } };
      }
    }
    return null;
  }
  onKey(code) {
    if (code === 'Escape') {
      if (this.ui.modal) { this.ui.closeModal(); return; }
      if (this.state === 'play') this.pause(true); else if (this.state === 'paused') this.pause(false);
      return;
    }
    if (this.state !== 'play') return;
    if (code === 'Tab' || code === 'KeyI' || code === 'KeyJ') { this.ui.toggleJournal(); return; }
    if (this.ui.modal === 'note' || this.ui.modal === 'inspect') { if (code === 'KeyE' || code === 'Space' || code === 'Enter') this.ui.closeModal(); return; }
    if (this.ui.modal === 'keypad') { if (/^Digit\d$/.test(code)) this.ui.kpPress(code.slice(5)); if (/^Numpad\d$/.test(code)) this.ui.kpPress(code.slice(6)); if (code === 'Backspace') this.ui.kpPress('C'); if (code === 'Enter' || code === 'NumpadEnter') this.ui.kpPress('OK'); return; }
    if (this.ui.modal) return;
    if (this.cinematic) return;
    if (code === 'KeyF') this.flashlight.toggle();
    if (code === 'KeyE') {
      const it = this.findInteract();
      if (it) {
        const d = it.def;
        if (!this.isGuest() || d.netId === undefined || d.local) d.use(it);
        else if (d.guest) d.guest(it);
        else this.net.useRemote(d);
      }
    }
    if (code === 'KeyQ' || code === 'KeyG') this.throwBottle();
    if (code === 'KeyO') this.ui.showObjective();
  }
  pause(p) {
    if (p && this.state === 'play') { this.state = 'paused'; this.ui.screen('pauseMenu', true); this.input.unlock(); this.audio.ctx && this.audio.ctx.suspend(); }
    else if (!p && this.state === 'paused') { this.state = 'play'; this.ui.screen('pauseMenu', false); this.input.lock(); this.audio.resume(); this.last = performance.now(); }
  }
  // ---------- geluid & zicht ----------
  noise(pos, radius, kind = 'player') {
    if (this.isGuest()) { if (kind !== 'step' && radius >= 3) this.net.noise(pos, radius, kind); return; }
    if (this.enemy) this.enemy.hear(pos, radius, kind === 'step' ? 'player' : kind);
  }
  shake(a) { this.player.shake = Math.min(1.2, this.player.shake + a); }
  isVisibleToPlayer(p) {
    const cam = this.camera;
    const d = cam.position.distanceTo(p); if (d > 30) return false;
    const f = this._fr || (this._fr = new THREE.Frustum()); const m = this._fm || (this._fm = new THREE.Matrix4());
    m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); f.setFromProjectionMatrix(m);
    if (!f.containsPoint(p)) return false;
    return this.level.hasLOS(cam.position.x, cam.position.z, p.x, p.z);
  }
  clockString() {
    const min = 23 * 60 + 52 + Math.floor(this.playTime / 60 * 17);
    const h = Math.floor(min / 60) % 24, m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // ---------- gooien ----------
  throwBottle() {
    if (this.ui.modal || this.player.hidden || this.cinematic) return;
    if (!this.inv.has('bottle')) return;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const p = this.camera.position.clone().addScaledVector(dir, 0.4), v = dir.multiplyScalar(11).add(new THREE.Vector3(0, 2.2, 0));
    if (this.isGuest()) { this.inv.remove('bottle'); this.net.sendThrow(p, v); this.spawnBottle(p, v, true); }
    else { this.inv.remove('bottle'); if (this.net.active) this.net.sendThrow(p, v); this.spawnBottle(p, v, false); }
    this.audio.play('throw_whoosh', { volume: 0.5 });
  }
  // remote = alleen beeld en geluid (de host bepaalt het lawaai voor het monster)
  spawnBottle(p, v, remote) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x2e5a2a, roughness: 0.1, transparent: true, opacity: 0.8 }));
    m.position.copy(p); this.scene.add(m);
    this.thrown.push({ m, v: v.clone(), t: 0, remote });
  }
  updateThrown(dt) {
    for (const b of this.thrown) {
      b.t += dt; b.v.y -= 9.8 * dt;
      const p = b.m.position, nx = p.x + b.v.x * dt, nz = p.z + b.v.z * dt, ny = p.y + b.v.y * dt;
      b.m.rotation.x += dt * 12; b.m.rotation.z += dt * 7;
      let hit = ny < 0.05 || ny > 2.95 || this.level.isSolidCell(Math.floor(nx), Math.floor(nz));
      if (!hit) for (const c of this.level.colliders) if (nx > c.minX && nx < c.maxX && nz > c.minZ && nz < c.maxZ && ny < c.maxY) { hit = true; break; }
      if (hit || b.t > 4) {
        b.dead = true; this.scene.remove(b.m);
        const at = { x: p.x, y: Math.max(0.1, p.y), z: p.z };
        this.audio.play('glass_break', { pos: at, volume: 1 });
        if (!b.remote) this.noise(at, 17, 'bottle');
      } else p.set(nx, ny, nz);
    }
    this.thrown = this.thrown.filter((b) => !b.dead);
  }
  // ---------- dood & checkpoints ----------
  saveCheckpoint(label) {
    const s = this.story;
    this.checkpoint = {
      label,
      player: { x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw },
      inv: JSON.parse(JSON.stringify(this.inv.items)),
      doors: this.level.doors.map((d) => ({ id: d.id, locked: d.locked, open: d.target !== 0, angle: d.openAngle })),
      power: { ...this.lights.power },
      fixtures: this.level.fixtures.map((f) => f.dead),
      story: s.save(),
      flash: this.flashlight.on,
      pager: this.ui.pagerLog.length,
      notes: this.ui.noteLog.length,
      objective: this.ui.currentObjective,
      playTime: this.playTime,
    };
    if (label) this.ui.toast('Checkpoint opgeslagen', 2);
  }
  loadCheckpoint() {
    const c = this.checkpoint; if (!c) return;
    this.audio.stopAll();
    this.player.hidden = null; this.ui.setHidden(null); this.player.frozen = false; this.player.lookLock = null; this.player.shake = 0;
    this.player.pos.set(c.player.x, 0, c.player.z); this.player.yaw = c.player.yaw; this.player.pitch = 0; this.player.vel.set(0, 0, 0); this.player.stamina = 1; this.player.breathSnd = null;
    this.inv.items = JSON.parse(JSON.stringify(c.inv));
    for (const ds of c.doors) { const d = this.level.named['door_' + ds.id]; d.locked = ds.locked; d.openAngle = ds.angle; d.setOpen(ds.open); }
    for (const k of Object.keys(c.power)) this.lights.power[k] = c.power[k];
    this.level.fixtures.forEach((f, i) => { f.dead = c.fixtures[i]; f.starting = false; });
    for (const L of this.level.lockers) { L.target = 0; L.angle = 0; L.pivot.rotation.y = 0; }
    this.lights.hums = [];
    this.flashlight.on = c.flash;
    this.ui.pagerLog.length = c.pager; this.ui.noteLog.length = c.notes;
    this.ui.currentObjective = c.objective;
    this.playTime = c.playTime;
    for (const b of this.thrown) this.scene.remove(b.m); this.thrown = [];
    this.enemy.deactivate(); this.enemy.pose = 'walk'; this.enemy.suspicion = 0; this.enemy.sawHide = null; this.enemy.silent = false;
    this.cinematic = false; this.dying = false;
    this.story.load(c.story);
    this.fear = 0; this.flash = 0;
    this.ui.fadeTo('#000', 0, 1.2);
    this.state = 'play';
    this.ui.screen('deathScreen', false);
    this.input.lock();
    this.last = performance.now();
    if (c.objective) this.ui.objective(c.objective, 5);
    this.story.startAmbience();
  }
  caught(enemy, fromHide = false, remote = false) {
    if (this.dying || this.state !== 'play' || this.player.dead) return;
    if (this.cinematic && !remote) return;
    if (this.story.flags.noDeath) return;
    const coop = this.net.active;
    if (coop) enemy.puppetHold = true;
    this.dying = true; this.cinematic = true;
    const pl = this.player;
    if (pl.hidden) { pl.hidden = null; this.ui.setHidden(null); }
    pl.frozen = true;
    const cam = this.camera.position;
    const f = new THREE.Vector3(enemy.pos.x - cam.x, 0, enemy.pos.z - cam.z).normalize();
    if (!isFinite(f.x)) f.set(0, 0, 1);
    enemy.place(cam.x + f.x * 0.62, cam.z + f.z * 0.62, Math.atan2(-f.x, -f.z));
    enemy.mode = 'scripted'; enemy.path = null; enemy.curSpeed = 0; enemy.pose = 'reach'; enemy.parts.torso.rotation.x = 0.25;
    pl.lookLock = new THREE.Vector3(enemy.pos.x, 1.72, enemy.pos.z);
    this.audio.play('scream_monster', { volume: 1, bus: 'scare' });
    this.audio.play('stinger', { volume: 0.8 });
    this.shake(1.2); this.flash = 0.6; this.postMat.uniforms.flashColor.value.setRGB(0.6, 0.05, 0.03);
    this.ui.faceFlash(120, true);
    setTimeout(() => { enemy.pose = 'scream'; this.flashlight.glitch(1.2); }, 150);
    setTimeout(() => { this.ui.fadeTo('#000', 1, 0.25); this.audio.play('body_fall', { volume: 0.9 }); }, 1500);
    setTimeout(() => {
      if (coop) { // co-op: de anderen spelen door, jij staat op bij het laatste checkpoint
        pl.dead = true; pl.lookLock = null; this.input.unlock(); enemy.puppetHold = false; enemy.pose = 'walk';
        if (!this.isGuest()) { enemy.setMode('retreat'); enemy.relocate(20); this.director.relief(20); }
        document.getElementById('deathCp').textContent = 'Je collega’s spelen door. Je staat weer op bij het laatste checkpoint.';
        document.getElementById('btnRetry').textContent = 'OPSTAAN';
        this.ui.screen('deathScreen', true);
        return;
      }
      this.audio.stopAll(); this.state = 'dead'; this.input.unlock();
      enemy.deactivate(); pl.lookLock = null;
      document.getElementById('deathCp').textContent = this.checkpoint ? `Laatste checkpoint: ${this.checkpoint.label || 'begin'}` : '';
      this.ui.screen('deathScreen', true);
      this.audio.play('tinnitus', { volume: 0.4 });
    }, 2600);
  }
  respawn() {
    const pl = this.player, cp = this.isGuest() ? this.story.netCp : (this.checkpoint && this.checkpoint.player);
    pl.dead = false; pl.frozen = false; pl.hidden = null; pl.shake = 0; this.ui.setHidden(null);
    if (cp) { pl.pos.set(cp.x + (Math.random() - 0.5), 0, cp.z + (Math.random() - 0.5)); pl.yaw = cp.yaw || 0; }
    pl.pitch = 0; pl.vel.set(0, 0, 0); pl.stamina = 1;
    this.dying = false; this.cinematic = false; this.fear = 0; this.flash = 0;
    this.ui.screen('deathScreen', false); this.ui.fadeTo('#000', 0, 1.2);
    this.input.lock();
  }
  // ---------- starten ----------
  prepareLaunch() {
    if (this._prepared) return; this._prepared = true;
    document.getElementById('startMenu').classList.remove('show');
    this.initAudio();
    try {
      const fs = document.documentElement.requestFullscreen?.();
      if (fs && fs.then) fs.then(() => { if (navigator.keyboard?.lock) navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape']).catch(() => {}); }).catch(() => {});
    } catch (e) { /* geen fullscreen */ }
  }
  launch() { this.prepareLaunch(); this.start(); }
  startGuest(st) {
    this.prepareLaunch();
    this.state = 'play'; this.last = performance.now();
    this.story.beginGuest(st);
    this.input.lock();
    if (!this._loop) { this._loop = true; requestAnimationFrame((t) => this.frame(t)); }
  }
  // ---------- loop ----------
  start() {
    this.state = 'play'; this.last = performance.now();
    this.input.lock();
    this.story.begin();
    if (!this._loop) { this._loop = true; requestAnimationFrame((t) => this.frame(t)); }
  }
  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    const dt = Math.max(0, Math.min(0.05, (t - this.last) / 1000)); this.last = t;
    if (this.state === 'play' && this.ui.modal !== 'note' && this.ui.modal !== 'keypad' && this.ui.modal !== 'choice' && this.ui.modal !== 'journal' && this.ui.modal !== 'inspect') this.update(dt);
    else if (this.state === 'play') { this.ui.update(dt); this.inspector.update(dt); this.audio.updateListener(this.camera); }
    this.render(dt);
  }
  update(dt) {
    this.time += dt; this.playTime += dt;
    this.player.update(dt, this.input);
    this.camera.updateMatrixWorld();
    if (this.isGuest()) this.enemy.puppetUpdate(dt, this.net.mon);
    else { this.enemy.update(dt); this.director.update(dt); }
    this.story.update(dt);
    this.net.tick(dt);
    for (const d of this.level.doors) d.update(dt);
    for (const L of this.level.lockers) { const dd = L.target - L.angle; if (Math.abs(dd) > 0.001) { L.angle += Math.sign(dd) * Math.min(Math.abs(dd), dt * 5); L.pivot.rotation.y = L.angle; } }
    this.lights.update(dt, this.camera);
    this.flashlight.update(dt);
    this.updateThrown(dt);
    const it = !this.cinematic && this.findInteract();
    this.ui.setPrompt(it ? it.def.prompt(it) : null);
    this.audio.updateListener(this.camera); this.audio.update();
    // angst: afstand tot de vijand
    let fearT = 0;
    if (this.enemy.mode !== 'inactive' && this.enemy.root.visible) { const d = this.enemy.distToLocal(); fearT = Math.max(0, 1 - d / 9) * 0.7 + (this.enemy.mode === 'chase' ? 0.35 : 0); }
    this.fear += (Math.min(1, fearT + this.story.fearBias) - this.fear) * Math.min(1, dt * 2);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    const room = this.level.roomAt(this.player.pos.x, this.player.pos.z);
    this.audio.setReverb(room ? 0.25 + room.reverb * 0.6 : 0.5);
    this.ui.update(dt);
    this.renderCCTV(dt);
  }
  render() {
    const u = this.postMat.uniforms;
    u.time.value = this.time; u.fear.value = this.fear; u.flash.value = this.flash; u.exposure.value = 1.0 * this.settings.bright;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    u.tDiffuse.value = this.rt.texture;
    this.renderer.render(this.postScene, this.postCam);
  }
}

function tick() { return new Promise((r) => setTimeout(r, 0)); }
function loadSettings() { try { return JSON.parse(localStorage.getItem('lastshift_settings') || '{}'); } catch (e) { return {}; } }
function saveSettings(s) { try { localStorage.setItem('lastshift_settings', JSON.stringify(s)); } catch (e) { /* geen opslag */ } }

// ---------------- OPSTARTEN (boot() wordt door de Bas Games-build aangeroepen) ----------------
window.boot = function boot() {
const game = new Game();
window.__game = game;
const bar = document.querySelector('#loading .bar > div'), lt = document.querySelector('#loading .ltext');
const progress = (t, p) => { lt.textContent = t; bar.style.width = (p * 100) + '%'; };

(async () => {
  try {
    await game.init(progress);
    progress('Klik op SPELEN om te beginnen.', 0.6);
    document.getElementById('loading').classList.remove('show');
    document.getElementById('startMenu').classList.add('show');
  } catch (e) { console.error(e); lt.textContent = 'Fout bij laden: ' + e.message + ' — WebGL2 vereist.'; }
})();

function bindSettings(root) {
  root.querySelectorAll('[data-set]').forEach((el) => {
    const k = el.dataset.set; el.value = game.settings[k];
    el.oninput = () => { game.settings[k] = parseFloat(el.value); if (game.renderer) game.applySettings(); };
  });
}
bindSettings(document);
document.getElementById('btnStart').onclick = () => game.launch();
document.getElementById('btnResume').onclick = () => game.pause(false);
document.getElementById('btnRetry').onclick = () => (game.net.active ? game.respawn() : game.loadCheckpoint());
document.getElementById('btnRestartP').onclick = () => location.reload();
document.querySelectorAll('.btnReload').forEach((b) => b.onclick = () => location.reload());
document.getElementById('noteClose').onclick = () => game.ui.closeModal();
document.getElementById('kpClose').onclick = () => game.ui.closeModal();
document.getElementById('inspectClose').onclick = () => game.ui.closeModal();
const B = window.HW_BUILD; const ver = document.getElementById('ver');
if (ver && B) ver.textContent = `v${B.version}${B.env === 'staging' ? ' · staging' : ''}`;
window.addEventListener('beforeunload', () => game.net.leave());
};
