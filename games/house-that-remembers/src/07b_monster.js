// =====================================================================
//  THE FORGOTTEN — rigged creature, chase AI, jumpscares, chase audio
// =====================================================================
Object.assign(SFX, {
  screech(pos, vol = .9) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 2.5, .7);
    const ws = ctx.createWaveShaper(); const cv = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; cv[i] = Math.tanh(x * 6); } ws.curve = cv;
    const g = ctx.createGain(); ws.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .06); g.gain.setValueAtTime(vol, t + .9); g.gain.exponentialRampToValueAtTime(.001, t + 1.9);
    [[520, 1.0], [790, .7], [1260, .5]].forEach(([f, a], k) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * .6, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + .25); o.frequency.exponentialRampToValueAtTime(f * .7, t + 1.8);
      const vib = ctx.createOscillator(); vib.frequency.value = 13 + k * 3; const vg = ctx.createGain(); vg.gain.value = f * .06; vib.connect(vg); vg.connect(o.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.6; bp.Q.value = 2;
      const og = ctx.createGain(); og.gain.value = a * .5; o.connect(bp); bp.connect(og); og.connect(ws); o.start(t); vib.start(t); o.stop(t + 2); vib.stop(t + 2);
    });
    const n = this.noise('white', false); const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = .8; const ng = ctx.createGain(); ng.gain.value = .35; n.connect(nf); nf.connect(ng); ng.connect(ws); n.start(t); n.stop(t + 2);
  },
  monsterStep(pos, surf, vol = 1) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.sfx, 1.6, 1.1);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(32, t + .14); const g = ctx.createGain(); o.connect(g); g.connect(out); this.env(g, t, .004, .7 * vol, .2); o.start(t); o.stop(t + .25);
    const n = this.noise('white', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = surf === 'concrete' ? 2600 : surf === 'carpet' ? 500 : 900; f.Q.value = 1.2; const ng = ctx.createGain(); n.connect(f); f.connect(ng); ng.connect(out); this.env(ng, t, .002, .45 * vol, .1); n.start(t, rand(0, 2)); n.stop(t + .15);
    if (Math.random() < .5) { const tt = t + rand(.03, .08); const c = this.noise('white', false); const cf = ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 4000; const cg = ctx.createGain(); c.connect(cf); cf.connect(cg); cg.connect(out); this.env(cg, tt, .001, .25 * vol, .03); c.start(tt); c.stop(tt + .05); }
  },
  rasp(pos, dur = .9, vol = .35) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now(); const out = this.out(pos, this.voice, 1.4, 1.1);
    const n = this.noise('pink', false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(700, t + dur); f.Q.value = 3;
    const am = ctx.createOscillator(); am.frequency.value = 38; const amg = ctx.createGain(); amg.gain.value = vol * .4; am.connect(amg);
    const g = ctx.createGain(); amg.connect(g.gain); n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .3); g.gain.linearRampToValueAtTime(0, t + dur);
    n.start(t, rand(0, 2)); n.stop(t + dur + .05); am.start(t); am.stop(t + dur + .05);
  },
  chaseMusic(on) {
    if (!this.ok) return; const ctx = this.ctx, t = this.now();
    if (!this.chase) {
      const m = ctx.createGain(); m.gain.value = 0; m.connect(this.master);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(m);
      const pulse = ctx.createGain(); pulse.gain.value = 0; pulse.connect(lp);
      const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = 36.7; const b2 = ctx.createOscillator(); b2.type = 'square'; b2.frequency.value = 73.4; const bg = ctx.createGain(); bg.gain.value = .5; b.connect(bg); b2.connect(bg); bg.connect(pulse); b.start(); b2.start();
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 2.3; const lg = ctx.createGain(); lg.gain.value = .5; lfo.connect(lg); lg.connect(pulse.gain); const bias = ctx.createConstantSource ? ctx.createConstantSource() : null; if (bias) { bias.offset.value = .5; bias.connect(pulse.gain); bias.start(); } lfo.start();
      const sg = ctx.createGain(); sg.gain.value = .06; sg.connect(lp);
      [233.1, 246.9, 349.2, 370, 493.9].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = rand(-18, 18); const tr = ctx.createOscillator(); tr.frequency.value = rand(5, 8); const tg = ctx.createGain(); tg.gain.value = 6; tr.connect(tg); tg.connect(o.detune); o.connect(sg); o.start(); tr.start(); });
      this.chase = { m, lp, lfo };
    }
    const c = this.chase; c.m.gain.cancelScheduledValues(t); c.m.gain.setTargetAtTime(on ? .55 : 0, t, on ? .25 : 1.2);
  },
  chaseProx(p) { if (!this.ok || !this.chase) return; const t = this.now(); this.chase.lp.frequency.setTargetAtTime(500 + p * 2600, t, .2); this.chase.lfo.frequency.setTargetAtTime(2.3 + p * 2.8, t, .3); },
  setBreath(v) {
    if (!this.ok) return; const ctx = this.ctx;
    if (!this.breath) {
      const n = this.noise('pink'); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = .9;
      const g = ctx.createGain(); g.gain.value = 0; const am = ctx.createGain(); am.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = .55; const lg = ctx.createGain(); lg.gain.value = 1; lfo.connect(lg); lg.connect(am.gain);
      n.connect(f); f.connect(am); am.connect(g); g.connect(this.sfx); n.start(); lfo.start(); this.breath = { g, lfo };
    }
    const t = this.now(); this.breath.g.gain.setTargetAtTime(v * .32, t, .4); this.breath.lfo.frequency.setTargetAtTime(.45 + v * .9, t, .5);
  },
});

// ---------------- the creature ----------------
Ent.build = function () {
  const g = new THREE.Group(); const rig = new THREE.Group(); g.add(rig);
  const skin = new THREE.MeshStandardMaterial({ color: 0x0e0b09, roughness: .42, metalness: .05, bumpMap: TEX.concrete, bumpScale: .07 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: .95 });
  const seg = (len, r0, r1, mat, up) => { const geo = new THREE.CylinderGeometry(r0, r1, len, 9); geo.translate(0, up ? len / 2 : -len / 2, 0); const m = new THREE.Mesh(geo, mat || skin); m.castShadow = true; return m; };
  const J = {};
  J.hips = new THREE.Group(); J.hips.position.y = 1.22; rig.add(J.hips);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8), skin); pel.scale.set(1.25, .7, .9); J.hips.add(pel);
  J.spine = new THREE.Group(); J.hips.add(J.spine);
  const torso = seg(.8, .21, .11, skin, true); J.spine.add(torso);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.16 - i * .006, .012, 5, 14, Math.PI * 1.2), skin); r.rotation.set(Math.PI / 2, 0, -Math.PI * .1); r.position.set(0, .36 + i * .07, .01); r.scale.set(1, .85, 1); J.spine.add(r); }
  for (let i = 0; i < 7; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 5), skin); v.position.set(0, .1 + i * .1, -.13 + i * .006); J.spine.add(v); }
  J.neck = new THREE.Group(); J.neck.position.y = .8; J.spine.add(J.neck); J.neck.add(seg(.18, .04, .055, skin, true));
  J.head = new THREE.Group(); J.head.position.y = .17; J.neck.add(J.head);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), skin); head.scale.set(.92, 1.38, 1.05); head.position.y = .15; head.castShadow = true; J.head.add(head);
  const fc = makeCanvas(64, 96), fx = fc.getContext('2d'); const gr = fx.createRadialGradient(32, 44, 3, 32, 48, 40);
  gr.addColorStop(0, 'rgba(120,108,96,.45)'); gr.addColorStop(.6, 'rgba(50,44,38,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = gr; fx.fillRect(0, 0, 64, 96);
  fx.fillStyle = 'rgba(0,0,0,.85)'; fx.beginPath(); fx.ellipse(21, 40, 8, 11, .1, 0, TAU); fx.ellipse(43, 40, 8, 11, -.1, 0, TAU); fx.fill();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.22, .33), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false })); face.position.set(0, .16, .128); J.head.add(face);
  const mc = makeCanvas(64, 64), mx = mc.getContext('2d'); const mg = mx.createRadialGradient(32, 32, 2, 32, 32, 30); mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(.7, 'rgba(20,4,4,.9)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); mx.fillStyle = mg; mx.fillRect(0, 0, 64, 64);
  mx.fillStyle = 'rgba(205,195,170,.9)'; for (let i = 0; i < 9; i++) { mx.fillRect(14 + i * 4, 18 + rand(-2, 2), 2, rand(5, 9)); mx.fillRect(14 + i * 4, 40 + rand(-2, 2), 2, rand(5, 9)); }
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(.12, .12), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(mc), transparent: true, depthWrite: false })); mouth.position.set(0, .05, .131); J.head.add(mouth);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xd8cfb8 }); const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 5), eyeM); e.position.set(s * .045, .205, .118); J.head.add(e); return e; });
  ['L', 'R'].forEach((k, i) => {
    const s = i ? 1 : -1;
    const sh = J['sh' + k] = new THREE.Group(); sh.position.set(s * .24, .74, 0); J.spine.add(sh); sh.add(seg(.6, .05, .035));
    const el = J['el' + k] = new THREE.Group(); el.position.y = -.6; sh.add(el); el.add(seg(.64, .036, .024));
    const hd = J['hd' + k] = new THREE.Group(); hd.position.y = -.64; el.add(hd);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.06, .1, .03), skin); palm.position.y = -.05; hd.add(palm);
    J['fing' + k] = [-1.5, -.5, .5, 1.5].map(f => { const fg = new THREE.Group(); fg.position.set(f * .014, -.1, 0); hd.add(fg); fg.add(seg(.19, .007, .004, dark)); return fg; });
    const hp = J['hip' + k] = new THREE.Group(); hp.position.set(s * .1, -.02, 0); J.hips.add(hp); hp.add(seg(.62, .065, .04));
    const kn = J['kn' + k] = new THREE.Group(); kn.position.y = -.62; hp.add(kn); kn.add(seg(.62, .042, .028));
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.07, .04, .22), skin); ft.position.set(0, -.62, .06); kn.add(ft);
  });
  // long wet hair hanging over the face
  const hc = makeCanvas(128, 256), hx = hc.getContext('2d');
  for (let i = 0; i < 260; i++) { const x0 = rand(0, 128); hx.strokeStyle = `rgba(${rand(4, 14) | 0},${rand(3, 10) | 0},${rand(2, 8) | 0},${rand(.6, 1)})`; hx.lineWidth = rand(.6, 2.2); hx.beginPath(); hx.moveTo(x0, 0); hx.bezierCurveTo(x0 + rand(-8, 8), 80, x0 + rand(-14, 14), 160, x0 + rand(-18, 18), rand(150, 256)); hx.stroke(); }
  const hairT = new THREE.CanvasTexture(hc); hairT.wrapS = THREE.RepeatWrapping; hairT.repeat.set(3, 1);
  const hairM = new THREE.MeshStandardMaterial({ map: hairT, alphaTest: .35, side: THREE.DoubleSide, roughness: .45, color: 0x1a1a1a });
  const drape = new THREE.CylinderGeometry(.14, .27, .9, 26, 8, true, .5, TAU - 1.0); drape.translate(0, -.45, 0);
  const dp = drape.attributes.position; for (let k = 0; k < dp.count; k++) { const y = dp.getY(k); dp.setX(k, dp.getX(k) * (1 + Math.sin(k * 1.7) * .06)); dp.setZ(k, dp.getZ(k) + (y < -.3 ? Math.sin(k) * .02 : 0)); } drape.computeVertexNormals();
  const drapeM = new THREE.Mesh(drape, hairM); drapeM.position.y = .33; J.head.add(drapeM);
  [[-.06, -.25], [.06, .25]].forEach(([x, ry]) => { const st = new THREE.Mesh(new THREE.PlaneGeometry(.07, .7), hairM); st.geometry.translate(0, -.35, 0); st.position.set(x, .3, .14); st.rotation.set(-.1, ry, 0); J.head.add(st); });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.137, 14, 8, 0, TAU, 0, 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: .45 })); cap.position.y = .17; cap.scale.set(.95, 1.4, 1.08); J.head.add(cap);
  // a torn shroud
  const sc = makeCanvas(256, 256), sx = sc.getContext('2d'), ac = makeCanvas(256, 256), ax = ac.getContext('2d');
  const scI = sx.createImageData(256, 256), acI = ax.createImageData(256, 256), dd = scI.data, da = acI.data;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * 4; const n = NZ.fbm(x * .05, y * .02, 4); const k = .45 + n * .6; dd[o] = 46 * k; dd[o + 1] = 40 * k; dd[o + 2] = 33 * k; dd[o + 3] = 255; const cut = 150 + Math.sin(x * .3) * 30 + NZ.fbm(x * .2, 3, 3) * 120; const v = (y > cut || (n < .3 && y > 60)) ? 0 : 255; da[o] = da[o + 1] = da[o + 2] = v; da[o + 3] = 255; }
  sx.putImageData(scI, 0, 0); ax.putImageData(acI, 0, 0);
  const shM = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(sc), alphaMap: new THREE.CanvasTexture(ac), alphaTest: .5, side: THREE.DoubleSide, roughness: .95 });
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(.19, .36, 1.1, 14, 1, true), shM); shroud.position.y = -.42; J.hips.add(shroud);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.24, .23, .5, 14, 1, true), shM); top.position.y = .5; top.rotation.y = 1.3; J.spine.add(top);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.visible = false; W.scene.add(g);
  this.g = g; this.rig = rig; this.J = J; this.head = head; this.mouth = mouth; this.eyes = eyes; this.on = false;
  this.anim = { ph: 0, t: 0, tw: 0, twT: 1, open: 0 };
};
Ent.pose = function (dt, mode, speed = 0) {
  const J = this.J, a = this.anim; if (!J) return; a.t += dt;
  a.twT -= dt; if (a.twT <= 0) { a.twT = rand(.4, 2.6); a.tw = rand(-.7, .7); }
  const tw = a.tw, jit = Math.sin(a.t * 37) * .03 + Math.sin(a.t * 23) * .02;
  let open = .05;
  const set = (o, x, y, z) => { if (x != null) o.rotation.x = x; if (y != null) o.rotation.y = y; if (z != null) o.rotation.z = z; };
  if (mode === 'run' || mode === 'crawl') {
    a.ph += dt * (1.4 + speed * 1.5); const s = Math.sin(a.ph), c = Math.cos(a.ph);
    const crawl = mode === 'crawl';
    J.hips.position.y = (crawl ? .78 : 1.14) + Math.abs(s) * .07;
    set(J.spine, (crawl ? 1.15 : .55) + Math.sin(a.ph * 2) * .05, 0, s * .12);
    set(J.hipL, -s * (crawl ? .6 : .95) + (crawl ? -.9 : 0)); set(J.hipR, s * (crawl ? .6 : .95) + (crawl ? -.9 : 0));
    set(J.knL, Math.max(0, c) * 1.4 + (crawl ? 1.2 : .15)); set(J.knR, Math.max(0, -c) * 1.4 + (crawl ? 1.2 : .15));
    set(J.shL, (crawl ? -1.5 : -.75) + s * (crawl ? .7 : .9), 0, -.25); set(J.shR, (crawl ? -1.5 : -.75) - s * (crawl ? .7 : .9), 0, .25);
    set(J.elL, -.35 - Math.max(0, s) * .5); set(J.elR, -.35 - Math.max(0, -s) * .5);
    set(J.neck, (crawl ? -1.0 : -.55) + jit, tw * .3, tw * .5 + jit * 3);
    open = .65 + Math.sin(a.t * 9) * .2;
  } else if (mode === 'lunge') {
    J.hips.position.y = 1.0; set(J.spine, .75, 0, 0);
    set(J.hipL, -.5); set(J.hipR, .3); set(J.knL, .9); set(J.knR, .5);
    set(J.shL, -2.3, 0, -.5); set(J.shR, -2.3, 0, .5); set(J.elL, -.4); set(J.elR, -.4);
    set(J.neck, -.75 + jit * 4, 0, jit * 6); open = 1.15;
  } else if (mode === 'reach') {
    J.hips.position.y = .9; set(J.spine, 1.05, 0, .1);
    set(J.hipL, -.9); set(J.hipR, -.6); set(J.knL, 1.6); set(J.knR, 1.4);
    set(J.shL, -.4, 0, -.2); set(J.shR, -2.2 + Math.sin(a.t * 3) * .2, 0, .2); set(J.elL, -.2); set(J.elR, -.2 + Math.sin(a.t * 5) * .15);
    set(J.neck, -.9 + jit, tw * .4, .6 + jit * 4); open = .4 + Math.sin(a.t * 4) * .3;
  } else { // idle: wrong, patient, twitching
    J.hips.position.y = 1.2 + Math.sin(a.t * 1.3) * .01; set(J.spine, .14 + Math.sin(a.t * .9) * .02, 0, Math.sin(a.t * .6) * .03);
    set(J.hipL, 0); set(J.hipR, 0); set(J.knL, .06); set(J.knR, .06);
    set(J.shL, .05, 0, -.12); set(J.shR, .05, 0, .12); set(J.elL, -.08); set(J.elR, -.1);
    set(J.neck, -.1 + jit * .5, tw * .25, .35 + tw * .6 + jit);
  }
  ['L', 'R'].forEach((k, i) => J['fing' + k].forEach((f, j) => { f.rotation.x = -.3 - Math.sin(a.t * (6 + j) + i) * .25; }));
  a.open = lerp(a.open, open, 1 - Math.exp(-dt * 12)); this.mouth.scale.set(1, .25 + a.open * 1.1, 1);
};
const _entUpdate0 = Ent.update;
Ent.show = (function (orig) { return function (x, y, z, o = {}) { if (Chase.active && !o.chase) return; orig.call(this, x, y, z, o); this.anim.mode = o.pose || 'idle'; }; })(Ent.show);
Ent.update = function (dt) {
  if (!this.on) return;
  if (this.o && this.o.chase) return;
  this.pose(dt, (this.o && this.o.pose) || 'idle', 0);
  _entUpdate0.call(this, dt);
};

// ---------------- line of sight (2D, against colliders) ----------------
function losClear(a, b, lv, pad = .2) {
  const ax = a.x, az = a.z, dx = b.x - ax, dz = b.z - az;
  for (const c of W.colliders) {
    if (!c.on || c.lv.indexOf(lv) < 0) continue; const o = grpOff(c.grp);
    const x1 = c.x1 + o.x - pad, x2 = c.x2 + o.x + pad, z1 = c.z1 + o.z - pad, z2 = c.z2 + o.z + pad;
    let t0 = 0, t1 = 1, hit = true;
    for (const [p, d, lo, hi] of [[ax, dx, x1, x2], [az, dz, z1, z2]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { hit = false; break; } }
      else { let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { hit = false; break; } }
    }
    if (hit) return false;
  }
  return true;
}

// ---------------- chases ----------------
const CHASES = {
  1: {
    id: 1, spawn: [0, 1, -13.3], respawn: [-3.2, 1, -6.5, -Math.PI / 2], windup: 1.7, speed: 3.35,
    objective: 'RUN. Get into the locked room.', sub: '[something shrieks at the end of the hall]',
    safe: () => Story.room === 'elena' && P.pos.x < -2.7 && !W.doors.elena.locked,
    onStart() { setLamp(W.obj.lamp_uh1, false); W.obj.lamp_uh2.flick = .9; W.obj.lamp_uh3.flick = .5; },
    onSafe(done) {
      const d = W.doors.elena; d.slam(); W.camShake = .6;
      Ent.g.position.set(0, UY, 0); Ent.anim.mode = 'idle';
      for (let i = 0; i < 7; i++) Story.after(.6 + i * .42 + rand(0, .1), () => { SFX.knock(d.pos(), 1, 1); W.camShake = .35; });
      Story.after(1.2, () => SFX.rasp(d.pos(), 1.4, .45));
      Story.after(4.2, () => { setLamp(W.obj.lamp_uh1, true); W.obj.lamp_uh2.flick = .08; W.obj.lamp_uh3.flick = .08; UI.sub('', '[silence]', 2); done(); });
    }
  },
  2: {
    id: 2, spawn: [-9.8, 1, 0], respawn: [-13.6, 1, 0, Math.PI / 2], windup: 1.1, speed: 3.2, crawl: true, scale: .8,
    objective: 'RUN. The small door — now.', sub: '[behind you, something squeezes through the wardrobe]',
    safe: () => !!SF().wardExit,
    onSafe(done) { done(); }
  },
  3: {
    id: 3, spawn: [-11.6, -1, -30], respawn: [5.2, -1, -33.6, Math.PI], windup: 2.0, speed: 3.15,
    objective: 'HIDE. Somewhere it cannot follow you.', sub: '[a shriek from the west corridor]',
    safe: () => P.lv === -1 && P.pos.x > 7.05 && P.pos.z > -26.45,
    peek: [8.5, -27.5],
    onStart() { ['b1', 'b2', 'b3', 'b4'].forEach((n, i) => { const L = W.obj['lamp_' + n]; L.flick = .8; }); Story.after(7, () => { if (Chase.active && !Chase.localSafe) { SFX.whisper(P.pos.clone().add(V3(0, 1.5, 0)), 2, .3); UI.sub('', '[a child\'s whisper] ...under the house... it can\'t hear you there...', 4); } }); },
    onSafe(done) {
      Story.after(1.5, () => UI.sub('', '[it is right outside — don\'t move]', 3));
      Story.after(7.5, () => { ['b1', 'b2', 'b3', 'b4'].forEach(n => { W.obj['lamp_' + n].flick = .12; }); done(); });
    },
    onEnd() { SFX.unlock(V3(0, BY + 1.2, -36)); SFX.knock(V3(0, BY + 1.2, -36.4), 1, .6); UI.sub('', '[far away, behind the iron door, a heavy bolt slides back]', 3.5); W.doors.sealed.locked = false; UI.objective('Go through the iron door.'); }
  },
};
const Chase = {
  active: false, owner: false, cfg: null, deaths: 0,
  reset() { this.active = false; this.cfg = null; this.localSafe = false; SFX.chaseMusic(false); if (W) W.chaseProx = 0; $('death').classList.remove('show'); P.dead = false; },
  start(cfg, opts = {}) {
    if (this.active) return;
    const f = SF(); f['chase' + cfg.id] = true;
    this.cfg = cfg; this.active = true; this.owner = !opts.remote; this.state = 'windup'; this.t = 0; this.trails = {}; this.stuckT = 0; this.stepAcc = 0; this.hbT = 0; this.localSafe = false; this.lastMon = performance.now(); this.monT = 0; this.speed = 0; this.mode = 'idle'; this.killT = 0;
    const s = cfg.spawn; this.lv = s[1];
    Ent.show(s[0], levelY(s[1]), s[2], { chase: true, scale: cfg.scale || 1 }); this.netPos = Ent.g.position.clone(); this.netRot = 0;
    SFX.silence(.9, .04);
    Story.after(.35, () => { SFX.screech(Ent.g.position.clone().setY(levelY(this.lv) + 2), 1); W.fx.flash = .12; W.camShake = .55; SFX.chaseMusic(true); });
    UI.objective(cfg.objective); UI.sub('', cfg.sub, 3);
    W.intensity = 5;
    if (cfg.onStart) cfg.onStart();
    if (this.owner && Net.active) Net.emit('chase', { act: 'start', id: cfg.id });
  },
  targets() {
    const out = [];
    if (!P.dead && !this.localSafe && P.lv === this.lv) out.push({ id: 'me', x: P.pos.x, z: P.pos.z });
    Net.remoteTargets(this.lv).forEach(t => out.push(t));
    return out;
  },
  update(dt) {
    if (!this.active) return;
    const cfg = this.cfg; this.t += dt; const e = Ent.g.position;
    // trails
    const rec = (id, x, z) => { const tr = this.trails[id] || (this.trails[id] = []); const l = tr[tr.length - 1]; if (!l || Math.hypot(l.x - x, l.z - z) > .4) { tr.push({ x, z }); if (tr.length > 260) tr.shift(); } };
    if (P.lv === this.lv) rec('me', P.pos.x, P.pos.z);
    Net.remoteTargets(this.lv).forEach(t => rec(t.id, t.x, t.z));
    if (this.owner) this.ai(dt);
    else if (this.killT <= 0) {
      e.lerp(this.netPos, 1 - Math.exp(-dt * 10));
      let dr = this.netRot - Ent.g.rotation.y; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; Ent.g.rotation.y += dr * (1 - Math.exp(-dt * 10));
      if (performance.now() - this.lastMon > 4000) this.end(true);
    }
    if (this.killT > 0) { this.killT -= dt; this.mode = 'lunge'; }
    if (!this.active) return;
    Ent.pose(dt, this.mode, this.speed);
    // presence of the thing: steps, breath, proximity
    const dl = P.lv === this.lv ? Math.hypot(e.x - P.pos.x, e.z - P.pos.z) : 99;
    const prox = clamp(1 - dl / 14, 0, 1); W.chaseProx = prox; SFX.chaseProx(prox);
    if (this.speed > .3) { this.stepAcc += this.speed * dt; if (this.stepAcc > (cfg.crawl ? .7 : 1.15)) { this.stepAcc = 0; SFX.monsterStep(e.clone().setY(levelY(this.lv) + .1), surfaceAt(e.x, e.z, this.lv), cfg.crawl ? .8 : 1.1); if (dl < 6) W.camShake = Math.max(W.camShake || 0, .25 * prox); } }
    this.raspT = (this.raspT || 0) - dt; if (this.raspT <= 0) { this.raspT = rand(1.2, 2.6); SFX.rasp(e.clone().setY(levelY(this.lv) + 2), rand(.6, 1.1), .3 + prox * .3); }
    this.hbT -= dt; if (this.hbT <= 0 && prox > .05) { this.hbT = lerp(1.0, .36, prox); SFX.heartbeat(1, .25 + prox * .5, 1.2); }
    // safety / capture
    if (!this.localSafe && cfg.safe && cfg.safe()) { this.localSafe = true; if (this.owner) this.reachSafe(); }
    if (this.state === 'hunt' && !this.localSafe && !P.dead && dl < .95) this.caught();
  },
  ai(dt) {
    const cfg = this.cfg, e = Ent.g.position, lv = this.lv;
    if (this.state === 'kill') { this.speed = 0; return; }
    if (this.state === 'windup') { this.mode = 'idle'; this.speed = 0; this.faceTo(P.pos.x, P.pos.z, dt); if (this.t > cfg.windup) this.state = 'hunt'; this.send(dt); return; }
    if (this.state === 'safe') {
      if (cfg.peek) { const [px, pz] = cfg.peek; const d = Math.hypot(px - e.x, pz - e.z); if (d > .3) { this.move(px, pz, 2.2, dt); this.mode = 'run'; } else { this.speed = 0; this.mode = 'reach'; this.faceTo(8.5, -25.5, dt); } }
      else { this.speed = 0; this.mode = 'idle'; }
      this.send(dt); return;
    }
    const tg = this.targets();
    if (!tg.length) { this.speed = 0; this.mode = 'idle'; this.send(dt); return; }
    let best = null, bd = 1e9; tg.forEach(t => { const d = Math.hypot(t.x - e.x, t.z - e.z); if (d < bd) { bd = d; best = t; } });
    let goal = null;
    if (losClear(e, best, lv)) goal = best;
    else { const tr = this.trails[best.id] || []; for (let i = tr.length - 1; i >= Math.max(0, tr.length - 160); i--) if (losClear(e, tr[i], lv)) { goal = tr[i]; break; } if (!goal) goal = tr[0] || best; }
    let spd = Math.max(2.7, cfg.speed - this.deaths * .18); if (bd > 13) spd += 1.3; else if (bd < 2.5) spd -= .25; spd *= Math.min(1, (this.t - cfg.windup) / .8 + .3);
    const before = e.clone(); this.move(goal.x, goal.z, spd, dt);
    const moved = Math.hypot(e.x - before.x, e.z - before.z);
    if (moved < spd * dt * .3) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.stuckT > .45) { // it tears doors open
      for (const k in W.doors) { const D = W.doors[k]; if (D.missing || D.locked || D.open || D.lv !== lv) continue; const dp = D.pos(); if (Math.hypot(dp.x - e.x, dp.z - e.z) < 1.9) { D.setOpen(true, 11); SFX.slam(dp, 1); W.camShake = .3; this.stuckT = 0; } }
    }
    if (this.stuckT > 2.6) { const tr = this.trails[best.id] || []; const p = tr[Math.max(0, tr.length - 18)]; if (p && !inView(V3(p.x, levelY(lv) + 1.5, p.z), 1)) { e.x = p.x; e.z = p.z; } this.stuckT = 0; }
    this.mode = cfg.crawl ? 'crawl' : 'run';
    this.send(dt);
  },
  move(gx, gz, spd, dt) {
    const e = Ent.g.position; const dx = gx - e.x, dz = gz - e.z, d = Math.hypot(dx, dz); this.speed = spd;
    if (d > .01) { const st = Math.min(d, spd * dt); e.x += dx / d * st; e.z += dz / d * st; this.faceTo(gx, gz, dt); }
    collide(e, .3, this.lv, false);
  },
  faceTo(x, z, dt) { const e = Ent.g.position; const ty = Math.atan2(x - e.x, z - e.z); let dr = ty - Ent.g.rotation.y; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; Ent.g.rotation.y += dr * (1 - Math.exp(-dt * 9)); },
  send(dt) {
    if (!Net.active) return; this.monT -= dt; if (this.monT > 0) return; this.monT = .1 * Math.max(1, (Net.game ? Net.game.peers().length : 2) - 1);
    const e = Ent.g.position; Net.emit('mon', { x: +e.x.toFixed(2), z: +e.z.toFixed(2), r: +Ent.g.rotation.y.toFixed(2), m: this.mode, s: +this.speed.toFixed(2), st: this.state });
  },
  onNet(d) { if (!this.active || this.owner) return; this.lastMon = performance.now(); this.netPos.set(d.x, levelY(this.lv), d.z); this.netRot = d.r; this.mode = d.m; this.speed = d.s; if (d.st === 'hunt') this.state = 'hunt'; },
  caught() {
    if (P.dead) return; P.dead = true; P.frozen = true; this.deaths++;
    const fw = camFwd(); fw.y = 0; fw.normalize();
    const e = Ent.g.position; e.set(P.pos.x + fw.x * 1.45, levelY(this.lv), P.pos.z + fw.z * 1.45); Ent.g.rotation.y = Math.atan2(P.pos.x - e.x, P.pos.z - e.z);
    if (this.owner) this.state = 'kill'; this.killT = 2.8; this.mode = 'lunge'; this.speed = 0; Ent.pose(.016, 'lunge');
    W.forceLook = { target: e.clone().setY(levelY(this.lv) + 1.7), speed: 16, t: 1.3 }; Ent.g.scale.setScalar(1);
    SFX.screech(e.clone().setY(levelY(this.lv) + 1.7), 1.3); SFX.hit(1); W.camShake = 1.5; W.fx.red = .9; W.fx.flash = .25; P.flashOn = true; W.flashFlicker = 1;
    Story.after(1.05, () => { UI.fade(1, .06); SFX.silence(2.4, .03); $('death').classList.add('show'); });
    Story.after(3.4, () => this.respawn());
    if (Net.active) Net.presenceNow();
  },
  respawn() {
    const r = this.cfg.respawn; P.pos.set(r[0], 0, r[2]); P.lv = r[1]; P.y = levelY(r[1]); P.yaw = r[3]; P.pitch = 0; P.stamina = 1; P.exhausted = false; P.crouch = false;
    P.dead = false; P.frozen = false; W.fx.red = 0; W.forceLook = null; this.trails.me = []; this.killT = 0;
    if (this.owner) { const s = this.cfg.spawn; Ent.g.position.set(s[0], levelY(s[1]), s[2]); this.state = 'windup'; this.t = 0; if (this.cfg.id === 2) { const d = W.doors.wardEnd; } }
    $('death').classList.remove('show'); UI.fade(0, .9); SFX.chaseMusic(true);
    if (this.cfg.id === 1) { const d = W.doors.elena; if (d.locked) SF().fumbling = false; }
    UI.objective(this.cfg.objective);
  },
  reachSafe() {
    this.state = 'safe'; SFX.chaseMusic(false);
    this.cfg.onSafe(() => this.end(false));
  },
  end(remote) {
    if (!this.active) return; const cfg = this.cfg;
    this.active = false; SFX.chaseMusic(false); W.chaseProx = 0; Ent.hide(true); W.intensity = Math.min(4, CH());
    if (this.owner && Net.active && !remote) Net.emit('chase', { act: 'end', id: cfg.id });
    if (cfg.onEnd) cfg.onEnd();
    if (P.dead) { this.respawn(); }
  },
};
