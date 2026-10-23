/* Hollow Pines — runtime renderer. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { clamp, lerp } = HG.util;
  const W = HG.W;

  const BEAM_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDepth;
    void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const BEAM_FS = `uniform float uI; uniform float uFog; uniform vec3 uC; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDepth;
    float h(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5); }
    void main(){ float along = 1.0 - vUv.y; float edge = pow(abs(dot(vN, vV)), 1.6);
      float n = 0.75 + 0.25 * h(floor(vUv*vec2(40.0,12.0) + uTime*vec2(0.0,1.5)));
      float a = uI * edge * pow(1.0 - along, 1.6) * smoothstep(0.0, 0.08, along) * n;
      a *= exp(-vDepth * uFog * 0.8);
      gl_FragColor = vec4(uC * a, 1.0); }`;

  const POST_FS = `uniform sampler2D tDiffuse; uniform float uTime, uFear, uWound, uScream, uDark, uMV, uHidden, uFlash, uDeath, uGrain, uVig, uWhite; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5; float r = length(c);
      // scream / fear: subtle chromatic split and warp
      float ca = 0.0015 + uScream * 0.012 + uFear * 0.002 + uDark * 0.004;
      uv += c * sin(uTime * 23.0) * uScream * 0.01;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r; col.g = texture2D(tDiffuse, uv).g; col.b = texture2D(tDiffuse, uv - c * ca).b;
      // grade: cold shadows, warm lights
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(col, col * vec3(0.86,0.95,1.12), smoothstep(0.25, 0.0, l) * 0.6);
      col = mix(col, vec3(l), 0.18 + uFear * 0.25);
      // creature vision: everything readable, drained and red-shifted
      if (uMV > 0.0) { vec3 mv = pow(col, vec3(0.55)) * 1.6; float ml = dot(mv, vec3(0.3,0.6,0.1)); mv = mix(vec3(ml), mv, 0.35) * vec3(1.15, 0.82, 0.8); col = mix(col, mv, uMV); }
      // wound: pulsing red edges
      float pulse = 0.6 + 0.4 * sin(uTime * 5.0);
      col = mix(col, vec3(0.25, 0.0, 0.0), smoothstep(0.35, 0.75, r) * uWound * pulse * 0.7);
      // hiding: dark slats between the closet doors
      if (uHidden > 0.0) { float slat = step(0.5, fract(vUv.y * 18.0)) * smoothstep(0.08, 0.2, abs(vUv.x - 0.5)); col *= 1.0 - uHidden * (0.35 + 0.6 * slat); }
      // vignette
      col *= 1.0 - smoothstep(0.3, 0.9, r) * (uVig + uFear * 0.35 + uDark * 0.4);
      // grain
      float g = hash(vUv * uRes + fract(uTime * 13.7) * 100.0) - 0.5;
      col += g * uGrain * (0.6 + (1.0 - l) * 0.8);
      col += uFlash * 0.35 * vec3(0.8,0.85,1.0);
      col = mix(col, vec3(0.0), uDeath);
      col = mix(col, vec3(1.0), uWhite);
      gl_FragColor = vec4(col, 1.0);
    }`;

  function Renderer(canvas, world, settings, onProgress) {
    this.world = world; this.settings = settings;
    const q = this.quality = settings.quality;
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.basePR = window.HG_TEST_PR || Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.5 : q === 'medium' ? 1.0 : 0.75);
    this.scale = 1;
    r.setPixelRatio(this.basePR);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = q !== 'low';
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    this.fogBase = 0.05;
    scene.fog = new THREE.FogExp2(0x070a0e, this.fogBase);
    scene.background = new THREE.Color(0x050608);
    this.camera = new THREE.PerspectiveCamera(settings.fov || 72, 1, 0.05, 150);
    scene.add(this.camera);
    onProgress && onProgress('Painting textures');
    this.T = HG.makeTextures(world, q);
    this.M = HG.makeMaterials(this.T);
    this.hemi = new THREE.HemisphereLight(0x33435e, 0x0e0c09, 0.6); scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x8a9ac0, 0.32); this.moon.position.set(-40, 80, -30); scene.add(this.moon);
    onProgress && onProgress('Growing the forest');
    HG.buildWorldScene(this);
    this.buildSky(); this.buildRain(); this.buildDecals(); this.buildPost(); this.buildFlashlights();
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4();
    this.t = 0;
    this.indoor = 0;
    this.resize();
  }
  HG.Renderer = Renderer;
  const P = Renderer.prototype;

  // dynamic resolution: keep frame time near the target on slower GPUs
  P.adaptResolution = function (dt) {
    if (window.HG_TEST_PR) return;
    this.ftEMA = this.ftEMA === undefined ? dt : lerp(this.ftEMA, dt, 0.05);
    this.adaptT = (this.adaptT || 0) + dt;
    if (this.adaptT < 1.5) return;
    let s = this.scale;
    if (this.ftEMA > 0.034 && s > 0.5) s = Math.max(0.5, s - 0.1);
    else if (this.ftEMA < 0.019 && s < 1) s = Math.min(1, s + 0.05);
    if (s !== this.scale) { this.scale = s; this.r.setPixelRatio(this.basePR * s); this.resize(); this.adaptT = 0; }
    else this.adaptT = 1.0;
  };
  P.resize = function () {
    const w = this.r.domElement.clientWidth || window.innerWidth, h = this.r.domElement.clientHeight || window.innerHeight;
    this.r.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const pr = this.r.getPixelRatio();
    if (this.rt) this.rt.setSize(Math.floor(w * pr), Math.floor(h * pr));
    if (this.postU) this.postU.uRes.value.set(w * pr, h * pr);
  };

  P.buildSky = function () {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uTime, uFlash; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=0.0, w=0.5; for(int i=0;i<5;i++){ a+=n(p)*w; p*=2.03; w*=0.5; } return a; }
        void main(){ float y = max(vD.y, 0.0);
          vec3 col = mix(vec3(0.028,0.034,0.045), vec3(0.012,0.016,0.024), pow(y, 0.6));
          vec2 p = vD.xz / (vD.y + 0.15) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
          float c = fbm(p);
          vec3 moonDir = normalize(vec3(-0.45, 0.55, -0.35));
          float m = max(dot(vD, moonDir), 0.0);
          float glow = pow(m, 40.0) * 0.6 + pow(m, 6.0) * 0.08;
          col += vec3(0.55,0.6,0.7) * glow * (1.0 - smoothstep(0.35, 0.8, c));
          col = mix(col, vec3(0.05,0.055,0.065) * (0.6 + glow * 3.0), smoothstep(0.42, 0.75, c) * 0.85);
          col += uFlash * vec3(0.5,0.55,0.7) * (0.4 + c);
          col *= smoothstep(-0.12, 0.08, vD.y);
          gl_FragColor = vec4(col, 1.0); }`
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), mat);
    this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  };

  P.buildRain = function () {
    const n = this.quality === 'low' ? 1800 : 4000;
    const pos = new Float32Array(n * 6), seed = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 36, y = Math.random() * 22, z = (Math.random() - 0.5) * 36, s = Math.random();
      pos.set([x, y, z, x + 0.02, y - 0.5, z + 0.04], i * 6); seed[i * 2] = s; seed[i * 2 + 1] = s;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const rects = [new THREE.Vector4(52.2, 54.2, 71.8, 70.8), new THREE.Vector4(30.2, 40.2, 36.8, 45.8), new THREE.Vector4(99.2, 31.2, 104.8, 35.8), new THREE.Vector4(20.2, 82.2, 28.8, 88.8)];
    this.rainU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uRects: { value: rects }, uA: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: this.rainU,
      vertexShader: `uniform float uTime; uniform vec3 uCam; uniform vec4 uRects[4]; attribute float seed; varying float vA;
        void main(){ vec3 p = position; float fall = mod(p.y - uTime * (14.0 + seed * 4.0) - seed * 30.0, 22.0);
          vec3 w = vec3(uCam.x + mod(p.x - uCam.x + 18.0, 36.0) - 18.0, uCam.y - 6.0 + fall, uCam.z + mod(p.z - uCam.z + 18.0, 36.0) - 18.0);
          w.x -= fall * 0.04;
          vA = 1.0;
          for (int i = 0; i < 4; i++) if (w.x > uRects[i].x && w.x < uRects[i].z && w.z > uRects[i].y && w.z < uRects[i].w) vA = 0.0;
          if (gl_VertexID % 2 == 1) w += vec3(0.02, -0.55, 0.04);
          vec4 mv = modelViewMatrix * vec4(w, 1.0); vA *= exp(-(-mv.z) * 0.06); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: 'uniform float uA; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.6,0.65,0.7), vA * uA * 0.35); }'
    });
    // gl_VertexID needs WebGL2; fall back to a second attribute when unavailable
    if (!this.r.capabilities.isWebGL2) {
      const end = new Float32Array(n * 2); for (let i = 0; i < n; i++) end[i * 2 + 1] = 1;
      g.setAttribute('isEnd', new THREE.BufferAttribute(end, 1));
      mat.vertexShader = mat.vertexShader.replace('attribute float seed;', 'attribute float seed; attribute float isEnd;').replace('if (gl_VertexID % 2 == 1)', 'if (isEnd > 0.5)');
    }
    this.rain = new THREE.LineSegments(g, mat);
    this.rain.frustumCulled = false; this.rain.visible = false;
    this.scene.add(this.rain);
  };

  P.buildDecals = function () {
    const mk = (map, n) => {
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.3, color: 0x6a6058 }), n);
      m.frustumCulled = false; m.count = n; m.receiveShadow = true;
      const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) m.setMatrixAt(i, z);
      this.scene.add(m); return { m, i: 0, n };
    };
    this.prints = { boot: mk(this.T.boot, 260), claw: mk(this.T.claw, 200), hand: null };
    this.prints.hand = this.prints.claw;
    const blood = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,4,4,${0.4 + Math.random() * 0.5})`; g.beginPath(); g.arc(64 + (Math.random() - 0.5) * 70, 64 + (Math.random() - 0.5) * 70, 3 + Math.random() * 16, 0, 7); g.fill(); } return c; })());
    this.blood = mk(blood, 40);
    this.blood.m.material.color.set(0xffffff); this.blood.m.material.roughness = 0.2;
  };
  P.addDecal = function (pool, x, y, z, yaw, sx, sz) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(sx, 1, sz));
    pool.m.setMatrixAt(pool.i, m); pool.m.instanceMatrix.needsUpdate = true; pool.i = (pool.i + 1) % pool.n;
  };
  P.clearDecals = function () {
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const pool of [this.prints.boot, this.prints.claw, this.blood]) { for (let i = 0; i < pool.n; i++) pool.m.setMatrixAt(i, z); pool.m.instanceMatrix.needsUpdate = true; pool.i = 0; }
  };

  P.buildPost = function () {
    const isGL2 = this.r.capabilities.isWebGL2;
    this.rt = new THREE.WebGLRenderTarget(2, 2, { samples: isGL2 && this.quality !== 'low' ? 4 : 0, encoding: THREE.sRGBEncoding, type: THREE.HalfFloatType });
    this.postU = { tDiffuse: { value: this.rt.texture }, uTime: { value: 0 }, uFear: { value: 0 }, uWound: { value: 0 }, uScream: { value: 0 }, uDark: { value: 0 }, uMV: { value: 0 }, uHidden: { value: 0 }, uFlash: { value: 0 }, uDeath: { value: 0 }, uGrain: { value: 0.07 }, uVig: { value: 0.55 }, uWhite: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } };
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.postU, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: POST_FS, depthTest: false, depthWrite: false }));
    this.postScene.add(quad);
  };

  P.makeBeam = function (len, angle, intensity) {
    const rad = Math.tan(angle) * len;
    const g = new THREE.ConeGeometry(rad, len, 24, 1, true);
    g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2); // apex at origin, opening along +z (lookAt aims +z)
    const u = { uI: { value: intensity }, uFog: { value: 0.05 }, uC: { value: new THREE.Color(0xffe2b8) }, uTime: { value: 0 } };
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 5;
    m.userData.u = u;
    this.scene.add(m);
    return m;
  };
  P.buildFlashlights = function () {
    const q = this.quality;
    const sl = this.playerLight = new THREE.SpotLight(0xffe4c0, 0, 36, 0.42, 0.55, 1.15);
    if (q !== 'low') { sl.castShadow = true; sl.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024); sl.shadow.bias = -0.0004; sl.shadow.camera.near = 0.2; sl.shadow.camera.far = 34; sl.shadow.normalBias = 0.02; }
    this.scene.add(sl); this.scene.add(sl.target);
    // a faint fill so the near field isn't pitch black around the hotspot
    this.fill = new THREE.PointLight(0xffd8b0, 0, 5, 2); this.scene.add(this.fill);
    this.playerBeam = this.makeBeam(9, 0.36, 0.05);
    this.botLights = [];
    for (let i = 0; i < (q === 'high' ? 4 : q === 'medium' ? 3 : 2); i++) {
      const l = new THREE.SpotLight(0xffe4c0, 0, 28, 0.4, 0.55, 1.2);
      if (q === 'high' && i < 2) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.0006; l.shadow.camera.near = 0.3; l.shadow.camera.far = 26; }
      this.scene.add(l); this.scene.add(l.target);
      this.botLights.push(l);
    }
  };

  // ---------- binding a match ----------
  P.bindSim = function (sim) {
    if (this.survModels) for (const m of this.survModels) { this.scene.remove(m.model); this.scene.remove(m.beam); }
    if (this.monModel) this.scene.remove(this.monModel);
    if (this.itemMeshes) for (const m of this.itemMeshes.values()) this.scene.remove(m);
    this.sim = sim;
    this.survModels = sim.survivors.map((s, i) => ({ s, model: HG.buildSurvivor(s, i), beam: this.makeBeam(11, 0.33, 0.22), deadT: 0 }));
    for (const sm of this.survModels) this.scene.add(sm.model);
    this.monModel = HG.buildMonster();
    this.scene.add(this.monModel);
    this.itemMeshes = new Map();
    this.clearDecals();
    for (const dm of this.doorModels) { dm.angle = dm.door.open ? (dm.door.axis === 'h' ? 1 : -1) * (dm.door.swing || 1) * 1.45 : 0; }
    for (const h of this.hideModels.values()) h.open = 0;
    for (const lf of this.gate.leafs) lf.pivot.rotation.y = 0;
    this.gate.chain.visible = true;
    this.storageLock.visible = true;
    this.radio.parts.forEach(p => p.visible = false); this.radio.radio.visible = false;
    this.flash = 0; this.lastLightning = 0;
    this.camFloorY = null;
  };

  // events from the sim (decals, door creaks handled by audio)
  P.onEvent = function (e) {
    const w = this.world;
    if (e.type === 'footprint') {
      const pool = e.kind === 'boot' ? this.prints.boot : this.prints.claw;
      const side = e.foot ? 1 : -1;
      const ox = Math.cos(e.yaw) * 0.12 * side, oz = -Math.sin(e.yaw) * 0.12 * side;
      const y = w.terrainY(e.x + ox, e.z + oz) + 0.02;
      if (e.kind === 'boot') this.addDecal(pool, e.x + ox, y, e.z + oz, e.yaw, 0.13 * side, 0.3);
      else if (e.kind === 'claw') this.addDecal(pool, e.x + ox * 1.6, y, e.z + oz * 1.6, e.yaw, 0.24 * side, 0.42);
      else this.addDecal(pool, e.x + ox * 2.4, y, e.z + oz * 2.4, e.yaw + side * 0.6, 0.16 * side, 0.26);
    } else if (e.type === 'hit' || e.type === 'caught') {
      const s = this.sim.survivors.find(x => x.id === e.who);
      if (s) { const y = w.floorY(s.level, s.x, s.z) + 0.025; this.addDecal(this.blood, s.x, y, s.z, Math.random() * 6, e.type === 'caught' ? 1.6 : 0.9, e.type === 'caught' ? 1.6 : 0.9); }
    } else if (e.type === 'sound' && (e.kind === 'hide' || e.kind === 'closet_open' || e.kind === 'closet_rattle')) {
      for (const h of w.hides) if (Math.hypot(h.x - e.x, h.z - e.z) < 0.6) { const hm = this.hideModels.get(h.id); hm.openT = e.kind === 'closet_rattle' ? 0.3 : 0.8; hm.rattle = e.kind === 'closet_rattle' ? 0.9 : 0; }
    } else if (e.type === 'lightning') { this.flash = 1.0; }
  };

  // ---------- frame ----------
  P.update = function (dt, view) {
    const sim = this.sim, w = this.world, cam = this.camera, t = (this.t += dt);
    cam.fov = view.fov; cam.updateProjectionMatrix();
    cam.position.set(view.x, view.y, view.z);
    cam.rotation.set(0, 0, 0); cam.rotation.order = 'YXZ';
    cam.rotation.y = view.yaw; cam.rotation.x = view.pitch; cam.rotation.z = view.roll || 0;
    cam.updateMatrixWorld();
    // weather / atmosphere
    const weather = sim.weather;
    const fogTarget = weather === 'clear' ? 0.032 : weather === 'rain' ? 0.052 : 0.062;
    const camIndoor = view.level !== 0 ? (view.level === 1 ? 1 : 0.85) : (w.isHouse(0, view.x, view.z) ? 0.75 : (w.indoor[0][Math.floor(view.z) * W + Math.floor(view.x)] >= 40 ? 0.6 : 0));
    this.indoor = lerp(this.indoor, camIndoor, Math.min(1, dt * 3));
    this.scene.fog.density = lerp(fogTarget, fogTarget * 0.45, this.indoor) * (view.monsterVision ? 0.55 : 1);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    const lightning = sim.lightning > 0.6 ? (Math.random() < 0.6 ? 1 : 0.3) : 0;
    const amb = (1 - this.indoor * 0.88) * (1 + lightning * 3);
    this.hemi.intensity = (0.85 * amb + (view.monsterVision ? 0.9 : 0)) * (this.settings.brightness || 1);
    this.moon.intensity = 0.45 * (1 - this.indoor) * (1 + lightning * 6);
    this.r.toneMappingExposure = 1.15 * (this.settings.brightness || 1);
    this.sky.position.copy(cam.position);
    this.sky.material.uniforms.uTime.value = t; this.sky.material.uniforms.uFlash.value = lightning;
    this.windU.uTime.value = t; this.windU.uWind.value = weather === 'rain' ? 1.6 : 1.0 + Math.sin(t * 0.13) * 0.4;
    this.rain.visible = weather === 'rain';
    this.rainU.uTime.value = t; this.rainU.uCam.value.copy(cam.position); this.rainU.uA.value = 1;
    this.terrainU.uWet.value = weather === 'rain' ? 1 : 0.3;
    // chunk culling
    this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pm);
    const farD = 18 + 3.2 / this.scene.fog.density;
    for (const c of this.chunks) {
      const d = Math.hypot(c.cx - cam.position.x, c.cz - cam.position.z);
      const vis = d < farD + 30 && this.frustum.intersectsSphere(c.sphere);
      for (const m of c.meshes) m.visible = vis;
      for (const g of c.grass) g.visible = vis && d < 50 + 23;
    }
    this.updateLamps(view, dt);
    this.updateDoors(dt);
    this.updateObjectives(dt, t);
    this.updateCharacters(dt, t, view);
    this.updateItems();
    // veils pulse
    for (const v of this.veils) if (v.glow) v.glow.material.opacity = 0.18 + Math.sin(t * 1.3 + v.x) * 0.08 + (sim.monster.ghostT > 0 && Math.hypot(sim.monster.x - v.x, sim.monster.z - v.z) < 6 ? 0.5 : 0);
    // post
    const U = this.postU;
    U.uTime.value = t;
    U.uFear.value = view.fear || 0; U.uWound.value = view.wound || 0; U.uScream.value = view.scream || 0; U.uDark.value = view.darkness || 0;
    U.uMV.value = view.monsterVision ? 1 : 0; U.uHidden.value = view.hidden ? 1 : 0; U.uFlash.value = lightning * 0.7 + this.flash * 0.2; U.uDeath.value = view.death || 0; U.uWhite.value = view.white || 0;
    U.uGrain.value = (this.settings.grain === false ? 0.015 : 0.075);
    this.r.setRenderTarget(this.rt);
    this.r.render(this.scene, cam);
    this.r.setRenderTarget(null);
    this.r.render(this.postScene, this.postCam);
  };

  // which enclosed space a point is in: lights only affect the camera's own space (no shadows to stop leaks)
  P.spaceOf = function (level, x, z) {
    const w = this.world;
    if (level !== 0) return 'L' + level;
    const id = w.indoor[0][Math.floor(z) * W + Math.floor(x)] || 0;
    if (id >= 1 && id <= 7) return 'house';
    if (id === 30) return 'out';
    return id === 0 ? 'out' : 'b' + id;
  };
  P.updateLamps = function (view, dt) {
    const sim = this.sim, w = this.world;
    const camSpace = this.spaceOf(view.level, view.x, view.z);
    const cands = [];
    for (let i = 0; i < w.lamps.length; i++) {
      const L = w.lamps[i];
      const on = L.level01 || 0;
      const bulb = this.lampMeshes[i];
      bulb.material.color.setHex(on > 0.05 ? L.color : 0x0a0806);
      if (on <= 0.02 || L.id === 'flood') continue;
      if (this.spaceOf(L.level, L.x, L.z) !== camSpace) continue;
      const d = Math.hypot(L.x - view.x, L.z - view.z);
      if (d > 38) continue;
      cands.push({ L, d, on, i });
    }
    cands.sort((a, b) => a.d - b.d);
    for (let k = 0; k < this.lampPool.length; k++) {
      const pl = this.lampPool[k], c = cands[k];
      if (!c) { pl.intensity = 0; continue; }
      const L = c.L; const y = L.level === 1 ? 0.0 : (L.level === 2 ? 4.9 : L.y - 0.25);
      pl.position.set(L.x, y, L.z); pl.color.setHex(L.color); pl.distance = L.r * 1.7;
      pl.intensity = c.on * (L.id === 'genlamp' ? 2.2 : 1.6);
    }
    const fl = sim.stationPowered && !sim.darknessFields.some(f => Math.hypot(f.x - 98, f.z - 25) < f.r);
    this.flood.intensity = fl ? 3.2 : 0;
    const flLens = this.dynamicProps.flood_pole && this.dynamicProps.flood_pole.userData.lens; if (flLens) flLens.material.color.setHex(fl ? 0xf4f8ff : 0x111111);
    this.headlights.intensity = sim.truckRunning ? 2.5 : 0;
    for (const m of this.truck.hlm) m.material.color.setHex(sim.truckRunning ? 0xfff4d0 : 0x111111);
    const beaconOn = (sim.beaconSent || sim.tasks.some(t => t.type === 'tower' && !t.done && t.stepIdx === 1)) && Math.sin(this.t * 3) > 0;
    this.beaconLight.intensity = beaconOn ? 3 : 0;
    if (this.dynamicProps.tower) this.dynamicProps.tower.userData.beacon.material.color.setHex(beaconOn ? 0xff2a10 : 0x200404);
    const gateOn = sim.gateState !== 'closed' && Math.sin(this.t * 6) > 0;
    this.gateLight.intensity = gateOn ? 2.5 : 0;
    const gl = this.dynamicProps.lamp_post && this.dynamicProps.lamp_post.userData.bulb; if (gl) gl.material.color.setHex(sim.generatorRunning ? 0xeef4ff : 0x0a0a0a);
  };

  P.updateDoors = function (dt) {
    for (const dm of this.doorModels) {
      const d = dm.door;
      const sign = d.axis === 'h' ? 1 : -1;
      const target = d.open ? sign * (d.swing || 1) * 1.42 : 0;
      const speed = d.openedBy === 'wind' ? 0.5 : (d.openedBy === 'monster' && !d.open ? 2 : 6);
      dm.angle += clamp(target - dm.angle, -dt * speed, dt * speed);
      dm.pivot.rotation.y = dm.base + dm.angle;
    }
    for (const h of this.world.hides) {
      const hm = this.hideModels.get(h.id);
      hm.openT = Math.max(0, (hm.openT || 0) - dt);
      const tgt = hm.openT > 0 ? 1.2 : 0;
      hm.open += clamp(tgt - hm.open, -dt * 5, dt * 5);
      const rattle = hm.rattle > 0 ? Math.sin(this.t * 60) * 0.05 : 0; hm.rattle = Math.max(0, (hm.rattle || 0) - dt);
      hm.dl.rotation.y = hm.open + rattle; hm.dr.rotation.y = -hm.open - rattle;
    }
  };

  P.updateObjectives = function (dt, t) {
    const sim = this.sim;
    const task = (ty) => sim.tasks.find(x => x.type === ty);
    // generator vibrates when running
    const gen = this.generator;
    gen.g.position.y = this.world.terrainY(60.1, 47) + (sim.generatorRunning ? Math.sin(t * 90) * 0.006 : 0);
    gen.light.material.color.setHex(sim.generatorRunning ? 0x30ff40 : (sim.generatorFixed ? 0xff3010 : 0x200000));
    // power panel
    const pw = task('power');
    const lit = pw ? (pw.done ? 5 : pw.steps[0].delivered.length + (pw.stepIdx >= 1 ? 1 : 0) + (pw.stepIdx >= 2 ? 1 : 0)) : 0;
    this.panel.lights.forEach((m, i) => m.material.color.setHex(i < lit ? (pw && pw.done ? 0x40ff60 : 0xffa020) : 0x200404));
    this.panel.lever.rotation.x = sim.stationPowered ? -1.2 : 0;
    this.fusebox.lever.rotation.x = sim.breakersReset ? -1.4 : 0;
    // radio
    const rd = task('radio');
    if (rd) {
      const parts = rd.stepIdx === 0 ? rd.steps[0].delivered.length : 3;
      this.radio.parts.forEach((p, i) => p.visible = i < parts && rd.stepIdx <= 1);
      this.radio.radio.visible = rd.stepIdx >= 2 || rd.done;
      this.radio.dial.material.color.setHex(rd.done ? 0xffb040 : (rd.stepIdx === 2 && Math.random() < 0.5 ? 0xff9020 : 0x100800));
    }
    // truck hood opens while being worked on
    const vh = task('vehicle');
    const hoodOpen = vh && !vh.done && (vh.stepIdx > 0 || vh.steps[0].delivered.length > 0) ? 1 : 0;
    this.truck.hood.rotation.x = lerp(this.truck.hood.rotation.x, hoodOpen ? -0.9 : 0, Math.min(1, dt * 3));
    // storage / gate / tree
    this.storageLock.visible = this.world.storageDoor.locked;
    this.gate.chain.visible = !sim.chainCut;
    this.fallenTree.visible = !!sim.fallenTree;
    const gopen = sim.gateState === 'open' ? 1 : 0;
    for (const lf of this.gate.leafs) lf.pivot.rotation.y = lerp(lf.pivot.rotation.y, gopen * lf.side * 1.3, Math.min(1, dt * 0.8));
    // swing in the wind
    if (this.dynamicProps.swing) this.dynamicProps.swing.userData.swing.rotation.x = Math.sin(t * 0.9) * 0.18 * this.windU.uWind.value;
  };

  P.updateItems = function () {
    const seen = new Set();
    const colors = { fuel: 0x8a1a12, fuse: 0x8a7a40, wrench: 0x6a6a6a, relay: 0x2a3a4a, cable: 0x2a2a2a, storage_key: 0xb08a3a, cutters: 0xa02010, radio_part: 0x3a4a2a, car_battery: 0x1a1a1a, spark_plugs: 0xb0b0a0, truck_keys: 0xb08a3a, breaker: 0x8a7a40, chainsaw: 0xc06010, battery: 0x30402a, medkit: 0xb0b0a8 };
    for (const it of this.sim.items) {
      seen.add(it.id);
      let m = this.itemMeshes.get(it.id);
      if (!m) {
        const s = it.kind === 'fuel' || it.kind === 'car_battery' || it.kind === 'chainsaw' ? [0.35, 0.3, 0.2] : [0.18, 0.08, 0.12];
        m = HG.box(s[0], s[1], s[2], new THREE.MeshStandardMaterial({ color: colors[it.kind] || 0x6a6a6a, roughness: 0.5, metalness: 0.3 }), 0, 0, 0, this.scene, 0, Math.random() * 6, 0);
        m.position.set(it.x, this.world.floorY(it.level, it.x, it.z) + s[1] / 2, it.z);
        this.itemMeshes.set(it.id, m);
      }
    }
    for (const [id, m] of this.itemMeshes) if (!seen.has(id)) { this.scene.remove(m); this.itemMeshes.delete(id); }
  };

  P.updateCharacters = function (dt, t, view) {
    const sim = this.sim, cam = this.camera;
    const camFwd = new THREE.Vector3(); cam.getWorldDirection(camFwd);
    // ----- player flashlight -----
    const pl = this.playerLight;
    const p = view.flash;
    if (p) {
      pl.position.set(p.x, p.y, p.z);
      pl.target.position.set(p.x + p.dx * 10, p.y + p.dy * 10, p.z + p.dz * 10);
      pl.intensity = p.on ? p.intensity * 9 : 0;
      pl.angle = 0.42; pl.distance = 34;
      this.fill.position.set(p.x + p.dx * 1.5, p.y + p.dy * 1.5, p.z + p.dz * 1.5); this.fill.intensity = p.on ? p.intensity * 0.6 : 0;
      const b = this.playerBeam; b.visible = p.on && p.intensity > 0.05;
      b.position.set(p.x, p.y, p.z); b.lookAt(p.x + p.dx, p.y + p.dy, p.z + p.dz);
      b.userData.u.uI.value = 0.035 * p.intensity; b.userData.u.uFog.value = this.scene.fog.density; b.userData.u.uTime.value = t;
    } else { pl.intensity = 0; this.fill.intensity = 0; this.playerBeam.visible = false; }
    // ----- survivors -----
    const botCands = [];
    for (const sm of this.survModels) {
      const s = sm.s, model = sm.model;
      const isViewer = view.firstPerson && s === view.viewer;
      if (!s.alive) { sm.deadT += dt; } else sm.deadT = 0;
      model.visible = !isViewer && !s.hidden && !s.escaped && (s.alive || sm.deadT < 1.4) && (s.level === view.level || Math.abs(s.y - view.y) < 2.5);
      sm.downBlend = lerp(sm.downBlend || 0, s.downT > 0 ? 1 : 0, Math.min(1, dt * 10));
      model.position.set(s.x, s.y + (s.alive ? 0 : -sm.deadT * 0.3) + (s.grabbedBy ? 0.35 + Math.abs(Math.sin(t * 9)) * 0.05 : 0) + sm.downBlend * 0.15, s.z);
      model.rotation.y = s.yaw;
      model.rotation.x = s.alive ? -sm.downBlend * 1.45 : Math.min(1.5, sm.deadT * 2.5);
      model.rotation.z = s.grabbedBy ? Math.sin(t * 7) * 0.12 : 0;
      if (model.visible) {
        HG.animateSurvivor(model, s, dt, t);
        model.updateMatrixWorld(true);
        // aim flashlight along the look direction
        const J = model.userData.J;
        const wp = new THREE.Vector3(); J.flash.getWorldPosition(wp);
        const dir = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch || 0), Math.sin((s.pitch || 0) - 0.12), -Math.cos(s.yaw) * Math.cos(s.pitch || 0));
        J.flash.lookAt(wp.x + dir.x, wp.y + dir.y, wp.z + dir.z);
        sm.handPos = wp; sm.dir = dir;
      } else { sm.handPos = new THREE.Vector3(s.x, s.y + 1.3, s.z); sm.dir = new THREE.Vector3(-Math.sin(s.yaw), -0.12, -Math.cos(s.yaw)); }
      const on = sim.flashlightActive(s) && !isViewer;
      const flick = s.lightFlicker > 0 ? (Math.random() < 0.5 ? 0.1 : 1) : 1;
      const lowBatt = s.battery < 0.15 ? (Math.random() < 0.08 ? 0.2 : 0.7) : 1;
      sm.lightI = on ? flick * lowBatt : 0;
      model.userData.J.lens.material.color.setHex(sm.lightI > 0.05 ? 0xfff2d0 : 0x222222);
      sm.beam.visible = sm.lightI > 0.05 && (s.level === view.level || view.level === 0 && s.level === 0);
      if (sm.beam.visible) {
        sm.beam.position.copy(sm.handPos); sm.beam.lookAt(sm.handPos.x + sm.dir.x, sm.handPos.y + sm.dir.y, sm.handPos.z + sm.dir.z);
        sm.beam.userData.u.uI.value = 0.2 * sm.lightI; sm.beam.userData.u.uFog.value = this.scene.fog.density; sm.beam.userData.u.uTime.value = t;
        const d = Math.hypot(s.x - view.x, s.z - view.z);
        if (s.level === view.level && d < 45 && this.spaceOf(s.level, s.x, s.z) === this.spaceOf(view.level, view.x, view.z)) botCands.push({ sm, d });
      }
    }
    botCands.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.botLights.length; i++) {
      const l = this.botLights[i], c = botCands[i];
      if (!c) { l.intensity = 0; continue; }
      const { sm } = c;
      l.position.copy(sm.handPos);
      l.target.position.set(sm.handPos.x + sm.dir.x * 8, sm.handPos.y + sm.dir.y * 8, sm.handPos.z + sm.dir.z * 8);
      l.intensity = 6.5 * sm.lightI;
    }
    // ----- the creature -----
    const m = sim.monster, mm = this.monModel;
    mm.position.set(m.x, m.y + (m.airY || 0), m.z);
    mm.rotation.y = m.yaw;
    mm.visible = (m.level === view.level || Math.abs(m.y - view.y) < 2.5) && !(view.firstPerson && view.viewer === m);
    // eyeshine: when a flashlight lands on its face, or when it wants to be seen
    let eyes = Math.max(m.eyesT > 0 && m.ai && m.ai.state === 'stalk' ? 0.35 : 0, m.revealT > 0 ? 1 : 0);
    let reveal = 0;
    if (p && p.on && view.viewer !== m) {
      const dx = m.x - p.x, dz = m.z - p.z, dy = (m.y + (m.crawling ? 0.6 : 2.3)) - p.y, d = Math.hypot(dx, dy, dz);
      const cos = (dx * p.dx + dy * p.dy + dz * p.dz) / d;
      const facing = Math.cos(HG.angDiff(m.yaw, Math.atan2(-(p.x - m.x), -(p.z - m.z))));
      if (cos > 0.93 && d < 32) { eyes = Math.max(eyes, clamp((cos - 0.93) * 20, 0, 1) * clamp(facing, 0, 1) * (d > 5 ? 1 : 0.4)); reveal = clamp((cos - 0.9) * 10, 0, 1) * clamp(1 - d / 10, 0, 1); }
    }
    if (view.viewer === m) eyes = 0;
    m.eyesT = Math.max(0, (m.eyesT || 0) - dt);
    HG.animateMonster(mm, m, dt, t, { eyes, reveal });
  };

  P.dispose = function () { this.r.dispose(); };
})(typeof window !== 'undefined' ? window : globalThis);
