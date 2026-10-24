// =====================================================================
//  EVENTS — chapters, escalation, The Forgotten, puzzles, endings
// =====================================================================
const CHAPTERS = [null, 'Arrival', 'The Living Room', 'The First Memory', 'The Upstairs Hallway', 'The Locked Bedroom', 'The Basement', 'The Final Memory'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UY = 3.4, BY = -3.4;

// ---------------- The Forgotten ----------------
const Ent = {
  g: null, on: false, o: null,
  build() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    const limb = (rt, rb, h, x, y, z, rz) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 7), m); c.position.set(x, y, z); c.rotation.z = rz || 0; g.add(c); return c; };
    limb(.05, .035, 1.1, -.1, .55, 0); limb(.05, .035, 1.1, .1, .55, 0);
    limb(.19, .12, 1.0, 0, 1.55, 0);
    limb(.06, .05, .2, 0, 2.1, 0);
    limb(.035, .025, 1.2, -.26, 1.45, 0, .06); limb(.035, .025, 1.2, .26, 1.45, 0, -.06);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), m); head.scale.set(1, 1.35, 1); head.position.y = 2.32; g.add(head);
    const fc = makeCanvas(64, 64), fx = fc.getContext('2d'); const gr = fx.createRadialGradient(32, 30, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(120,112,104,.55)'); gr.addColorStop(.5, 'rgba(60,56,52,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = gr; fx.fillRect(0, 0, 64, 64);
    fx.fillStyle = 'rgba(0,0,0,.55)'; fx.beginPath(); fx.ellipse(24, 28, 6, 8, 0, 0, TAU); fx.ellipse(40, 28, 6, 8, 0, 0, TAU); fx.fill();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.26, .34), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false }));
    face.position.set(0, 2.32, .135); g.add(face);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.visible = false; W.scene.add(g); this.g = g; this.on = false; this.head = head;
  },
  setLayer(l) { this.g.traverse(o => o.layers.set(l)); },
  show(x, y, z, o = {}) {
    if (!this.g) return;
    this.g.position.set(x, y, z); this.o = o; this.t = 0; this.stare = 0; this.seen = false; this.on = true; this.g.visible = true;
    this.setLayer(o.mirror ? 2 : 0); this.g.scale.setScalar(o.scale || 1);
    this.face();
  },
  face() { const p = this.g.position; this.g.rotation.y = Math.atan2(P.pos.x - p.x, P.pos.z - p.z); },
  hide(quiet) {
    if (!this.on) return; this.on = false; this.g.visible = false;
    if (!quiet) { SFX.whisper(this.g.position.clone().setY(this.g.position.y + 1.8), .6, .22); }
    const cb = this.o && this.o.onHide; this.o = null; if (cb) cb();
  },
  update(dt) {
    if (!this.on) return; const o = this.o; this.t += dt; this.face();
    const p = this.g.position, d = Math.hypot(P.pos.x - p.x, P.pos.z - p.z);
    const hp = this.head.getWorldPosition(new THREE.Vector3());
    const vis = inView(hp, .3) && visibleFrom(hp);
    if (vis) this.seen = true;
    if (o.dur && this.t > o.dur) return this.hide(o.quiet);
    if (o.vanish && d < o.vanish) return this.hide();
    if (o.mirror) { if (o.yaw0 != null && Math.abs(P.yaw - o.yaw0) > .9) return this.hide(true); return; }
    if (o.untilUnseen && this.seen && !vis && this.t > .4) return this.hide(true);
    if (P.flashOn && !W.flashDead && d < 9 && vis && lookDot(hp) > .985) { this.stare += dt; if (this.stare > (o.stareT || .7)) return this.hide(); }
  }
};

// ---------------- core flow ----------------
Story.after = function (s, fn) { this.timers.push({ t: s, fn }); };
Story.startChapter = function (n, load) {
  const S = this.S; S.ch = n; this.chT = 0;
  UI.chapter(n);
  const fn = this['enter' + n]; if (fn) fn.call(this, load);
  this.saveCheckpoint();
};
Story.saveCheckpoint = function () {
  const S = this.S; if (S.loop) return;
  const cp = JSON.parse(JSON.stringify(S));
  Store.set(this.saveKey(), { cp, mem: S.mem, playTime: S.playTime, at: Date.now() });
};
Story.saveProgress = function () {
  const sv = Store.get(this.saveKey()); if (!sv || this.S.loop) return; sv.mem = this.S.mem; sv.playTime = this.S.playTime; Store.set(this.saveKey(), sv);
};
Story.setIntensity = function (v) { W.intensity = v; };

Story.getRoom = function () {
  if (this.isP2()) return this.getRoom2();
  const p = P.pos, lv = P.lv, dx = W.diningDX || 0;
  if (P.outside) return 'outside';
  if (lv === 0) {
    if (p.x >= 2 && p.x <= 10 && p.z >= -6 && p.z <= 4) return 'living';
    if (p.x > 2 && p.z < -6) return 'stairs';
    if (p.x < -5 + dx) return 'dining';
    if (p.x < -2) return 'passage';
    if (p.z < -14) return 'bstairs';
    return 'hall';
  }
  if (lv === 1) {
    if (p.x > 2 && p.z < -6) return 'stairs';
    if (p.x > 2) return 'gbed';
    if (p.x > -2) return 'uhall';
    if (p.x < -10) return 'ward';
    if (p.z < -9) return 'bath'; if (p.z < -4) return 'sewing'; return 'elena';
  }
  if (p.z > -24) return 'bstairs';
  if (p.z > -36) return (p.x < -10 || p.x > 10) ? 'corridor' : 'basement';
  if (p.z > -44) return 'sealed';
  if (p.z > -50) return 'passage2';
  return 'memory';
};

Story.afterBuild = function () {
  if (this.isP2()) return this.afterBuild2();
  W.portraitStage = { dining: 0, hall: 0 };
  W.intensity = 0; W.raining = true; W.tvOn = false; W.radioOn = false; W.fx = { flash: 0, distort: 0, red: 0 };
  this.timers = []; this.ambT = 0; this.thunderT = rand(8, 16); this.chT = 0; this.room = 'outside'; this.roomT = 0; this.stopCD = 10;
  Ent.build(); Chase.reset();
  W.obj.seasonPic.set(drawSeason(3, true));
  W.doors.front.onOpen = () => { if (CH() === 1 && !SF().frontOpened) { SF().frontOpened = true; SFX.thunder(1.5, false); UI.objective('Look around.'); } };
  W.doors.dining.onOpen = () => { if (CH() === 2) this.startChapter(3); };
  W.doors.sewing.onUse = d => this.sewingDoorUse(d);
  W.doors.dining.onUnlock = () => { if (CH() === 2) UI.objective('Open the dining room.'); };
  W.doors.sealed.onOpen = () => { if (!SF().enteredSealed) { SF().enteredSealed = true; setLamp(W.obj.lamp_sealed, true); } };
  W.drip = SFX.emitter(V3(W.emitDrip.x, W.emitDrip.y, W.emitDrip.z), 'drip'); W.emitters.push(W.drip);
  W.dripB = SFX.emitter(V3(W.emitDripB.x, W.emitDripB.y, W.emitDripB.z), 'drip'); W.emitters.push(W.dripB);
  W.hum = SFX.emitter(V3(0, BY + 2.6, -30), 'hum'); W.emitters.push(W.hum);
  if (this.S.loop) this.setupLoop();
};

Story.setupChapter = function (n) {
  if (this.isP2()) return this.setupChapter2(n);
  const D = W.doors, f = SF();
  W.obj.frontKey.visible = !f.gotFrontKey;
  if (n >= 2) { D.front.locked = true; D.front.key = null; D.front.setOpen(false, 50); W.obj.gfNoteSeen = true; }
  if (n >= 3) { D.dining.locked = false; D.dining.setOpen(true, 50); }
  if (n >= 4) {
    W.obj.plates.forEach(p => p.visible = true);
    W.obj.cabDoor.visible = false; W.obj.cabLetter.visible = false;
    W.obj.cabSlotPics.forEach((p, i) => { p.material.map = texFrom(this.puzzlePhotos()[[1, 0, 2][i]], false); p.visible = true; });
    W.obj.photoA.visible = false; W.obj.photoC.visible = false;
    D.stairs.locked = false; D.stairs.setOpen(true, 50);
    this.setPortrait('dining', 1);
  }
  if (n >= 5) {
    D.elena.locked = false; D.elena.setOpen(true, 50);
    W.obj.gPainting.g.visible = false; W.obj.gMessage.visible = true;
    D.sewing.locked = false; D.sewing.setOpen(true, 50);
    this.setPortrait('hall', 1); setHallLength(3.6);
  }
  if (n >= 6) {
    D.elena.setMissing();
    this.openWardrobe(true);
    W.obj.musicBox.visible = false; W.obj.diary.visible = false;
    D.basement.locked = false; D.basement.setOpen(true, 50); W.obj.basementBolt.visible = false;
    W.drawings.forEach(d => { d.stage = 2; d.pic.set(drawCrayon({ kind: d.kind, stage: 2 })); });
  }
  if (n >= 7) {
    D.sealed.locked = false; D.sealed.setOpen(true, 50);
    ['babyPhoto', 'musicBox', 'diary'].forEach((id, i) => this.placeOnPedestal(i, id, true));
    W.obj.backPanel.position.y = BY - 2.15; W.obj.backPanelCol.on = false;
    setLamp(W.obj.lamp_sealed, true);
  }
  for (const k in D) D[k].ang = D[k].target, D[k].pivot.rotation.y = D[k].ang, D[k].col.on = Math.abs(D[k].ang) < .35;
};
Story.placePlayer = function (n) {
  if (this.isP2()) return this.placePlayer2(n);
  const spots = { 1: [0, 0, 27.5, 0], 2: [0, 0, 2.3, 0], 3: [-1.2, 0, -3, Math.PI / 2], 4: [.6, 1, -13.2, Math.PI], 5: [-1.3, 1, 0, Math.PI / 2], 6: [0, 0, -12.3, 0], 7: [0, -1, -46, 0] };
  const s = spots[n] || spots[1];
  P.pos.set(s[0], 0, s[2]); P.lv = s[1]; P.y = levelY(s[1]); P.yaw = s[3]; P.pitch = 0; P.crouch = false; P.stamina = 1; P.speed = 0; P.flashOn = true;
  P.outside = P.lv === 0 && P.pos.z > 4.05;
};

// ---------------- main update ----------------
Story.update = function (dt) {
  const S = this.S; S.playTime += dt; this.chT += dt;
  for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; if (!t) continue; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); try { t.fn(); } catch (e) { console.error(e); } } }
  Ent.update(dt); Chase.update(dt);
  if (S.part !== 2 && P.lv === -1 && P.pos.x > 7.05 && P.pos.x < 10 && P.pos.z > -26.45 && P.pos.z < -24) P.crouch = true;
  const r = this.getRoom(); if (r !== this.room) { this.prevRoom = this.room; this.room = r; this.roomT = 0; this.onRoom(r, this.prevRoom); } else this.roomT += dt;
  // ambience
  this.ambT -= dt;
  if (this.ambT <= 0) {
    this.ambT = .5; const base = r === 'bstairs' || P.lv === -1;
    SFX.updateAmbience(!P.outside, W.raining ? 1 : 0, W.intensity, base);
    if (W.moon) W.moon.intensity = P.outside ? .42 : 0;
    if (W.hemi) W.hemi.intensity = W.dawn ? (P.outside ? .9 : .5) : P.outside ? .3 : P.lv === -1 ? .06 : .11;
    this.saveTick = (this.saveTick || 0) + 1; if (this.saveTick % 20 === 0) this.saveProgress();
  }
  // thunder & lightning
  if (W.raining) { this.thunderT -= dt; if (this.thunderT <= 0) { this.thunderT = rand(16, 38); const d = rand(.4, 2.2); SFX.thunder(d, !P.outside); if (P.outside) W.fx.flash = .32 / (1 + d); else if (P.lv >= 0) W.fx.flash = .05; } }
  W.fx.flash = Math.max(0, W.fx.flash - dt * 1.6);
  if (W.camShake) W.camShake = Math.max(0, W.camShake - dt * .8);
  // clock
  if (W.clockEm && W.obj.clockHands) { const ph = (G.time % 1); W.obj.clockHands[1].rotation.x = -(14 / 60) * TAU - (ph < .25 ? .1 : 0); }
  // tv
  if (W.tvOn) W.obj.tvMat.uniforms.time.value = G.time;
  this.hallUpdate(dt); if (S.part === 2) this.p2Common(dt);
  if (W.dawn) this.chEnd(dt);
  const fn = this['ch' + S.ch]; if (fn) fn.call(this, dt);
};
Story.onRoom = function (r, prev) {
  if (this.isP2()) return this.onRoom2(r, prev);
  if (CH() === 1 && r === 'hall' && !SF().inside) { SF().inside = true; }
  if (CH() === 3 && r === 'uhall' && SF().letterRead) this.startChapter(4);
  if (CH() === 4 && r === 'elena' && !W.doors.elena.locked) this.startChapter(5);
  if (CH() === 6 && r === 'memory') this.startChapter(7);
  if (CH() === 4 && r === 'bath' && !SF().whispered) { SF().whispered = true; this.after(2.2, () => { SFX.whisper(V3(-10.4, UY + 1.6, -11.2), 2.2, .3); SFX.speak(NM(), { pitch: .1, rate: .45, volume: .22 }); UI.sub('', `[a whisper, inside the wall] ...${NM()}...`, 3.5); }); }
};
Story.onStep = function () { };
Story.onStop = function (surf) {
  if (CH() < 4 || P.outside) return;
  this.stopCD = this.stopCD == null ? 0 : this.stopCD;
  if (this.stopCD > 0 || Math.random() > (CH() >= 6 ? .55 : .4)) return;
  this.stopCD = CH() >= 6 ? 14 : 22;
  const back = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(1.4);
  const n = CH() >= 6 ? 3 : 1;
  for (let i = 0; i < n; i++) this.after(.42 + i * .48, () => SFX.footstep(surf, P.pos.clone().add(back).setY(P.y + .1), .75));
};
Story.hallUpdate = function (dt) {
  if (this.stopCD > 0) this.stopCD -= dt;
  // the passage to the dining room stretches while you are in there (chapter 3+)
  if (CH() >= 3 && CH() <= 7 && W.dining && !Net.active) {
    const room = this.room;
    if (room === 'dining' && W.diningDX === 0 && SF().diningStretch !== false && P.pos.x < -7) {
      const door = V3(-2, 1.4, -3);
      if (!inView(door, .6)) { setDiningOffset(-3.5); P.pos.x -= 3.5; SF().diningStretched = (SF().diningStretched || 0) + 1; }
    } else if (room === 'hall' && W.diningDX !== 0 && P.pos.x > -.5) {
      if (!inView(V3(-4, 1.4, -3), 1)) setDiningOffset(0);
    }
  }
};

// ---------------- chapter 1 ----------------
Story.enter1 = function (load) {
  this.setIntensity(0); W.raining = true;
  UI.objective('Go up to the house.');
  this.after(2.0, () => UI.sub(NM(), 'Fourteen Alder Lane. I haven\'t been here since I was six.', 4.5));
  this.after(7.5, () => UI.sub(NM(), 'Eleven months, and nobody\'s found him. Not a trace.', 4.5));
};
Story.ch1 = function () {
  if (!SF().porch && P.pos.z < 7.5 && P.outside) { SF().porch = true; this.after(.8, () => UI.sub(NM(), 'Every window dark. Except one.', 3.5)); }
};
Story.frontLockMsg = function () {
  if (CH() === 1) return 'Locked. Grandad never left a key under the mat. "A key under the mat is an invitation," he used to say.';
  return 'It will not open. The key turns, the latch clicks — and the door does not move, as if someone is leaning on it from outside.';
};
Story.onNoteRead = function () {
  if (CH() !== 1 || this.S.loop) return;
  this.capture(0, V3(1.5, 2.85, 3.5), P.pos.clone().setY(1.0));
  this.after(1.2, () => this.startChapter(2));
};

// ---------------- chapter 2 ----------------
Story.enter2 = function () {
  this.setIntensity(1);
  UI.objective('Look around. Find out what happened to Grandad.');
  this.after(1.5, () => UI.sub(NM(), 'The basement door. That\'s... behind the stairs. Fine. I wasn\'t planning on it.', 4.5));
  this.after(40, () => { SF().stepsUpstairsArmed = true; });
  this.after(75, () => { SF().knockArmed = true; });
  this.after(95, () => { if (!SF().clockTicking) this.startClock(); });
  W.doors.front.key = null;
};
Story.ch2 = function (dt) {
  const f = SF(), r = this.room;
  if (r === 'living') f.livingT = (f.livingT || 0) + dt;
  // the front door closes itself
  if (!f.frontShut && r === 'living' && f.livingT > 3) {
    f.frontShut = true; const d = W.doors.front;
    if (d.open) { d.setOpen(false, .9); this.after(1.6, () => { SFX.doorClose(d.pos()); }); }
    d.locked = true; d.key = null;
  }
  // the armchair moves while you are out of the room
  if (!f.chairMoved && f.livingT > 10 && r === 'hall' && this.prevRoom === 'living' && !inView(W.obj.armchair.position.clone().setY(.6), .7)) {
    f.chairMoved = true; const a = W.obj.armchair; a.position.set(6.9, 0, 1.6); a.rotation.y = -1.25 + Math.PI;
    const c = W.obj.armCol; c.x1 = 6.5; c.x2 = 7.3; c.z1 = 1.2; c.z2 = 2.0;
  }
  // the clock starts again after you have looked at it and left the room
  if (!f.clockTicking && f.clockSeen && r !== 'living' && this.roomT > 4) this.startClock();
  // a footstep upstairs
  if (f.stepsUpstairsArmed && !f.stepsUpstairs && (r === 'living' || r === 'hall')) {
    f.stepsUpstairs = true; const base = r === 'living' ? V3(6.5, UY + .1, -2) : V3(0, UY + .1, -4);
    [0, .7, 1.4].forEach((t, i) => this.after(t, () => SFX.footstep('wood', base.clone().add(V3(i * .6, 0, i * .3)), 1.2, 1.4)));
    this.after(2.4, () => SFX.creak(base.clone().add(V3(1.6, 0, .9)), .5, 1));
    this.after(.3, () => UI.sub('', '[footsteps, upstairs]', 2.5));
  }
  // knocking from below
  if (f.knockArmed && !f.knocked && r === 'hall' && P.pos.z < -4) {
    f.knocked = true; SFX.knock(V3(0, .4, -14.5), 3, .55); UI.sub('', '[three knocks — from below the floor]', 3);
  }
  // the television: an image of this room
  if (W.tvOn && !f.tvShown && W.tvOnT != null) {
    W.tvOnT += dt; const tvp = W.obj.tv.position.clone().setY(.85);
    if (W.tvOnT > 3.5 && r === 'living' && inView(tvp, .3) && P.pos.distanceTo(tvp) < 6.5) {
      f.tvShown = true; W.tvImage = true; W.obj.tvMat.uniforms.mixImg.value = 1;
      this.after(1.7, () => { W.tvImage = false; W.obj.tvMat.uniforms.mixImg.value = 0; });
      this.after(3.4, () => { if (W.tvOn) { this.toggleTV(true); UI.sub('', '[the television switches itself off]', 2.5); } });
    }
  }
};
Story.startClock = function () {
  if (SF().clockTicking) return; SF().clockTicking = true;
  W.clockEm = SFX.emitter(W.obj.clock.getWorldPosition(new THREE.Vector3()), 'clock'); W.clockEm.set(.55); W.emitters.push(W.clockEm);
  if (this.room === 'living') UI.sub('', '[a clock, ticking]', 2.5);
};
Story.toggleTV = function (silent) {
  const em = W.tvEm || (W.tvEm = SFX.emitter(W.obj.tv.position.clone().setY(.9), 'static'));
  if (!W.emitters.includes(em)) W.emitters.push(em);
  W.tvOn = !W.tvOn; SFX.click(W.obj.tv.position, .4, 900);
  W.obj.tvMat.uniforms.on.value = W.tvOn ? 1 : 0; em.set(W.tvOn ? .28 : 0, .05);
  W.tvOnT = W.tvOn ? 0 : null;
  if (W.tvOn && !silent && SF().tvShown) UI.say('Static. For a second you thought there was a picture in it.', 3.5);
};
Story.renderTV = function () {
  if (!W.tvImage || !W.tvRT) return;
  if (!W.tvCam) { W.tvCam = new THREE.PerspectiveCamera(64, 4 / 3, .05, 30); W.tvCam.layers.enable(2); }
  if (W.tvCamPos) W.tvCam.position.copy(W.tvCamPos); else W.tvCam.position.set(2.35, 2.95, 3.6); W.tvCam.lookAt(P.pos.x, 1.0, P.pos.z);
  const prev = W.flash.intensity; W.flash.intensity *= .4;
  G.renderer.setRenderTarget(W.tvRT); G.renderer.render(W.scene, W.tvCam); G.renderer.setRenderTarget(null);
  W.flash.intensity = prev;
};
Story.onScratchedPhoto = function () {
  const first = !SF().sawElena; SF().sawElena = true;
  insp('Sunday lunch', 'The whole family in the garden: Grandad, Grandma, a boy — your father — and a little girl.\n\nSomeone has scratched the girl\'s face away, carefully, over and over, until the paper went white.\n\nOn the back, in Grandma\'s hand: "Elena, nine."\nBeneath it, newer, in Grandad\'s shaky capitals: "HER CHAIR IS STILL AT THE TABLE. I KEEP THE DINING ROOM LOCKED."', W.portraits.mantel1.canvas);
  if (first) { this.addNote('photoElena', 'The scratched photograph', ['A girl in the family photo, face scratched out. "Elena, nine." Grandad: "Her chair is still at the table. I keep the dining room locked."\n\nDad never said he had a sister.']); this.livingProgress(); this.after(.5, () => UI.sub(NM(), 'Elena? Dad never... he never said he had a sister.', 4)); }
};
Story.livingProgress = function () {
  const f = SF();
  if (f.sawElena && Story.has('diningKey')) UI.objective('Unlock the dining room, across the hall.');
  else if (Story.has('diningKey')) UI.objective('A small key marked "D." Find the door it opens.');
  else if (f.sawElena) UI.objective('Find a way into the dining room.');
};

// ---------------- chapter 3 ----------------
Story.enter3 = function () {
  this.setIntensity(2);
  UI.objective('Look around the dining room.');
  this.after(2, () => UI.sub(NM(), 'Someone left in the middle of dinner. A long time ago.', 4));
};
Story.ch3 = function (dt) {
  const f = SF(), r = this.room, inD = r === 'dining';
  if (inD) f.dinT = (f.dinT || 0) + dt;
  const plates = W.obj.plates; const tableC = W.dining.localToWorld(V3(-9, 1, -4));
  // plates appear while you are not looking
  if (inD && f.dinT > 14 && !plates[3].visible && !inView(tableC, 1.6)) { plates[3].visible = true; }
  if (inD && plates[3].visible && !plates[4].visible && (f.photoCount || 0) >= 2 && !inView(tableC, 1.6)) { plates[4].visible = true; f.plate5T = 0; }
  // a chair slides out by itself
  if (plates[4].visible && !f.chairSlid && inD) {
    f.plate5T += dt; const ch = W.obj.dinChairs[1]; const cp = ch.getWorldPosition(new THREE.Vector3()).setY(.5);
    if (f.plate5T > 3 && inView(cp, .4) && P.pos.distanceTo(cp) > 2.2) { f.chairSlid = true; this.slideChair(ch); }
  }
  // a nudge if the third photograph is still on the floor
  if (inD && f.cabSeen && !f.gotPhotoC && (f.photoCount || 0) >= 1 && f.dinT > 45 && !f.photoCHint) { f.photoCHint = true; UI.sub(NM(), 'Something pale is lying on the floor... under the table.', 4); }
  // the radio turns itself on
  if (inD && f.dinT > 32 && !f.radioPlayed && !W.radioOn) { this.toggleRadio(true); }
  // a shadow passes the frosted window
  if (inD && f.dinT > 20 && !f.shadowPassed) {
    const sh = W.obj.winShadow, wp = sh.getWorldPosition(new THREE.Vector3());
    if (lookDot(wp) > .9 && P.pos.distanceTo(wp) > 2.5) { f.shadowPassed = true; this.passShadow(); }
  }
  // the portrait gains a person when you turn around
  const pp = W.portraits.dining.g.getWorldPosition(new THREE.Vector3());
  if (W.portraitStage.dining === 0) {
    if (inD && inView(pp, .3) && P.pos.distanceTo(pp) < 6) f.dpLook = (f.dpLook || 0) + dt;
    if ((f.dpLook > 1.2 || f.dpSeen) && !inView(pp, .6)) { this.setPortrait('dining', 1); }
  }
};
Story.slideChair = function (ch) {
  const start = ch.position.clone(), end = start.clone().add(V3(-.45, 0, .12)); let t = 0;
  SFX.scrape(ch.getWorldPosition(new THREE.Vector3()), 1.3, .45);
  const up = dt => { t += dt / 1.3; const k = smooth(Math.min(1, t)); ch.position.lerpVectors(start, end, k); ch.rotation.y = Math.PI / 2 + k * .35; return t < 1; };
  W.updaters.push(up);
};
Story.passShadow = function () {
  const sh = W.obj.winShadow; let t = 0; const z0 = -4.9, z1 = -3.1;
  W.updaters.push(dt => { t += dt / 1.6; sh.position.z = lerp(z0, z1, t); sh.material.opacity = Math.sin(Math.min(1, t) * Math.PI) * .85; if (t >= 1) { sh.material.opacity = 0; return false; } return true; });
  SFX.footstep('gravel', sh.getWorldPosition(new THREE.Vector3()).add(V3(-1, -1.5, 0)), .5);
};
Story.toggleRadio = function (auto) {
  const rp = W.obj.radio.getWorldPosition(new THREE.Vector3()).setY(1.1);
  const em = W.radioEm || (W.radioEm = SFX.emitter(rp, 'static')); if (!W.emitters.includes(em)) W.emitters.push(em);
  em.setPos(rp);
  W.radioOn = !W.radioOn; SFX.click(rp, .4, 1100); em.set(W.radioOn ? .16 : 0, .05);
  if (!W.radioOn) { this.radioSeq = (this.radioSeq || 0) + 1; return; }
  if (auto) UI.sub('', '[the radio clicks on by itself]', 2.5);
  if (SF().radioPlayed) return;
  SF().radioPlayed = true; const seq = this.radioSeq = (this.radioSeq || 0) + 1;
  const lines = [
    [1.5, 'a man', '...pass the potatoes, Tom. Elena — elbows.', 105, 3],
    [5, 'a woman', '...bed at nine. Nine o\'clock, I said, young lady...', 190, 3],
    [9, 'a girl', '...but it\'s got more rooms at night. I counted...', 290, 3],
    [13, 'a woman', '...don\'t be silly, sweetheart. Eat up.', 200, 2.5],
    [17, 'a girl', '...Mama? Who is that sitting in your chair?', 300, 3],
  ];
  lines.forEach(([t, who, txt, pitch, dur]) => this.after(t, () => { if (!W.radioOn || this.radioSeq !== seq) return; SFX.murmur(rp, dur, { pitch, radio: true, vol: .35, formantShift: pitch > 250 ? 1.25 : 1 }); UI.sub('Radio — ' + who, txt, dur + .8); }));
  this.after(21.5, () => { if (W.radioOn && this.radioSeq === seq) { em.set(.4, .02); this.after(.8, () => { if (W.radioOn) this.toggleRadio(); }); UI.sub('', '[the static swells, then cuts out]', 2.5); } });
};
Story.photoHint = function () {
  const f = SF(); f.photoCount = ['gotPhotoA', 'gotPhotoB', 'gotPhotoC'].filter(k => f[k]).length;
  if (f.photoCount === 3) UI.objective('Set the three photographs into the cabinet frames, in order.');
  else if (f.cabSeen) UI.objective(`Find photographs for the cabinet frames (${f.photoCount}/3).`);
};
Story.cabinetUse = function () {
  const f = SF();
  if (f.cabOpen) {
    if (!f.gotLetter) {
      f.gotLetter = true; W.obj.cabLetter.visible = false; SFX.pickup();
      this.addNote('margaret', 'Grandma\'s letter', TXT.margaret(), true);
      UI.read('A letter, never sent', TXT.margaret(), { hand: true, onClose: () => this.endChapter3() });
    } else UI.say('The three photographs, in their frames. Nothing else.', 3);
    return;
  }
  if (!f.cabSeen) { f.cabSeen = true; }
  const have = ['photoA', 'photoB', 'photoC'].filter(id => Story.has(id));
  if (!have.length) {
    insp('The glass cabinet', 'Inside, behind the glass, a single folded letter.\n\nThe door has no handle — only three empty frames set into the wood beneath it, each the size of a small photograph, numbered I, II and III.');
    this.photoHint(); if (!SF().photoCount) UI.objective('Find photographs for the cabinet frames (0/3).');
    return;
  }
  this.photoPuzzle();
};
Story.photoPuzzle = function () {
  const sol = ['photoB', 'photoA', 'photoC']; const slots = [null, null, null];
  UI.puzzle('The cabinet frames', 'Three frames: I, II, III. Lay the photographs into them. The wood is worn smooth beneath the first frame, as if someone always started there.', (body, close) => {
    const render = () => {
      body.innerHTML = '';
      const sw = document.createElement('div'); sw.className = 'slots';
      slots.forEach((id, i) => { const s = document.createElement('div'); s.className = 'slot'; s.innerHTML = `<span class="num">${ROMAN[i + 1]}</span>`; if (id) { const im = new Image(); im.src = ITEMS[id].img().toDataURL(); s.appendChild(im); } else s.appendChild(document.createTextNode('empty')); s.onclick = () => { slots[i] = null; SFX.click(null, .2, 1800); render(); }; sw.appendChild(s); });
      body.appendChild(sw);
      const ph = document.createElement('div'); ph.className = 'phs';
      ['photoA', 'photoB', 'photoC'].filter(id => Story.has(id)).forEach(id => {
        const d = document.createElement('div'); d.className = 'ph' + (slots.includes(id) ? ' used' : ''); d.title = ITEMS[id].name;
        const im = new Image(); im.src = ITEMS[id].img().toDataURL(); d.appendChild(im);
        d.onclick = () => { const k = slots.indexOf(null); if (k < 0) return; slots[k] = id; SFX.click(null, .3, 2400); render(); check(); };
        ph.appendChild(d);
      });
      body.appendChild(ph);
      const tip = document.createElement('p'); tip.style.fontSize = '14px'; tip.style.color = 'var(--dim)';
      tip.textContent = Story.S.inv.filter(i => /^photo/.test(i)).length < 3 ? 'You only have ' + have().length + ' of the photographs. The other frames stay empty.' : 'Click a photograph to place it. Click a frame to empty it.';
      body.appendChild(tip);
    };
    const have = () => ['photoA', 'photoB', 'photoC'].filter(id => Story.has(id));
    const check = () => {
      if (slots.includes(null)) return;
      if (slots.every((s, i) => s === sol[i])) {
        SFX.unlock(W.obj.cabDoor.getWorldPosition(new THREE.Vector3()));
        setTimeout(() => { close(); this.openCabinet(); }, 500);
      } else {
        SFX.locked(null); body.querySelector('.slots').style.opacity = .4;
        setTimeout(() => { slots.fill(null); render(); UI.notify('The frames spring back. Wrong order.'); }, 700);
      }
    };
    render();
  });
};
Story.openCabinet = function () {
  const f = SF(); f.cabOpen = true;
  ['photoB', 'photoA', 'photoC'].forEach((id, i) => { this.take(id); const p = W.obj.cabSlotPics[i]; p.material.map = texFrom(ITEMS[id].img(), false); p.material.needsUpdate = true; p.visible = true; });
  let t = 0; const door = W.obj.cabDoor; W.updaters.push(dt => { t += dt; door.position.y = 1.45 + Math.min(1, t) * .02; door.material.opacity = .5 * (1 - Math.min(1, t)); if (t >= 1) { door.visible = false; return false; } return true; });
  SFX.creak(door.getWorldPosition(new THREE.Vector3()), .4, 1.2);
  UI.objective('Take the letter from the cabinet.');
  this.capture(1, W.dining.localToWorld(V3(-12.4, 2.7, .4)), P.pos.clone().setY(1.0));
};
Story.endChapter3 = function (remote) {
  const f = SF(); if (!remote) { if (f.letterRead) return; Net.beat('ch3end'); } f.letterRead = true;
  this.after(.6, () => UI.sub(NM(), 'She never left the house...', 3));
  this.after(4.5, () => {
    SFX.crash(V3(-6, UY + .4, 0), 1.2); W.camShake = .9; UI.sub('', '[something heavy falls, upstairs]', 3);
    W.lamps.forEach(L => { if (L.lv === 0) { L.mult = .25; } });
    this.after(.35, () => SFX.silence(9, .15));
    this.after(1.2, () => W.lamps.forEach(L => L.mult = 1));
    this.after(7.5, () => { const d = W.doors.stairs; d.locked = false; d.creakOpen(1.1, .25); UI.objective('Something fell upstairs. Find the way up.'); });
  });
};
Story.stairLockMsg = function () { return SF().letterRead ? 'It won\'t move.' : 'Jammed. The wood has swollen in its frame. It won\'t budge — not yet.'; };
Story.basementLockMsg = function () { return 'Bolted, and padlocked beneath the bolt. On the wood, at a child\'s height, a strip of yellow ribbon has been nailed across the gap.\n\n"Whatever you do, do not open the basement door."'; };

// ---------------- chapter 4 ----------------
Story.enter4 = function () {
  this.setIntensity(3);
  UI.objective('Look around upstairs.');
  this.after(1.5, () => UI.sub(NM(), 'Hello? ...Is someone up here?', 3));
  this.after(9, () => { SF().firstSightArmed = true; });
};
Story.ch4 = function (dt) {
  const f = SF(), r = this.room;
  // first sighting at the far end of the hall
  if (f.firstSightArmed && !f.firstSight && r === 'uhall' && P.pos.z < -6 && !Ent.on) {
    const sp = V3(0, UY, 3.0 + (W.hallL || 0));
    if (inView(sp.clone().setY(UY + 1.7), .4)) {
      f.firstSight = true; Ent.show(sp.x, sp.y, sp.z, { dur: 3.2, vanish: 7.5, quiet: true, onHide: () => { const L = W.obj.lamp_uhEnd; if (L) { L.flick = .9; this.after(1.5, () => L.flick = 0); } } });
      this.capture(2, V3(0, UY + 2.65, -13.6), P.pos.clone().setY(UY + 1.1), true);
    }
  }
  // the hall stretches every time you look back
  if (f.keysObj && !Net.active && !Chase.active && r === 'uhall' && (f.stretch || 0) < 4 && P.pos.z < 1) {
    f.stretchCD = (f.stretchCD || 0) - dt;
    const end = V3(0, UY + 1.4, 4 + (W.hallL || 0));
    if (f.stretchCD <= 0 && !inView(end, 1.5)) { setHallLength((W.hallL || 0) + 1.2); f.stretch = (f.stretch || 0) + 1; f.stretchCD = 6; }
  }
  // the portrait adds you
  const hp = W.portraits.hall.g.getWorldPosition(new THREE.Vector3());
  if (W.portraitStage.hall === 0 && r === 'uhall') {
    if (inView(hp, .4) && P.pos.distanceTo(hp) < 5) f.hpLook = (f.hpLook || 0) + dt;
    if ((f.hpLook > 1 || f.hpSeen) && this.keysFound() >= 1 && !inView(hp, .8)) this.setPortrait('hall', 1);
  }
  // the sewing-room door opens by itself
  // the key count shown in the objective follows keys found by anyone (co-op)
  const kf = this.keysFound(); if (f.keysObj && kf !== f.keysShown) { f.keysShown = kf; if (kf > 0) UI.objective(kf >= 3 ? 'Open the locked room.' : `Find three old keys (${kf}/3).`); }
  if (!f.sewOpen && kf >= 2 && P.lv === 1) {
    f.sewOpen = true; const d = W.doors.sewing; d.locked = false; d.creakOpen(1.3, .22);
    this.after(1.2, () => { if (!Ent.on) Ent.show(-4.6, UY, -6.4, { dur: 4, vanish: 3.8, untilUnseen: true }); });
  }
  // bulbs go out one by one, towards you
  if (!f.bulbs && this.keysFound() >= 2 && r === 'uhall' && P.pos.z > -1 && lookDot(V3(0, UY + 2, -11)) > .85) {
    f.bulbs = true; const names = ['uh1', 'uh2', 'uh3'];
    names.forEach((n, i) => this.after(i * .9, () => { setLamp(W.obj['lamp_' + n], false); SFX.click(W.obj['lamp_' + n].obj.position, .5, 700); }));
    this.after(2.8, () => { if (!Ent.on) Ent.show(0, UY, -10.5, { dur: 2.6, vanish: 5, quiet: true }); });
    this.after(5.6, () => { names.forEach(n => setLamp(W.obj['lamp_' + n], true)); SFX.click(null, .2, 900); });
  }
  // CHASE 1: with all three keys, something comes for you
  if (this.keysFound() >= 3 && !f.chase1 && r === 'uhall' && !Chase.active) { Chase.start(CHASES[1]); }
  // bathroom mirror
  if (f.medOpened && !f.mirrorScare && r === 'bath' && !Chase.active) {
    const mp = V3(-6, UY + 1.6, -13.9);
    if (P.pos.distanceTo(mp) < 3.2 && lookDot(mp) > .9) {
      f.mirrorScare = true; Ent.show(P.pos.x + .25, UY, P.pos.z + 1.1, { mirror: true, dur: 2.2, yaw0: P.yaw, quiet: true });
      SFX.stinger(.28, 2.4); this.after(.2, () => SFX.heartbeat(5, .4, 1.4));
    }
  }
};
// keys found by anyone: the three key flags are shared in co-op, a per-player counter was not
Story.keysFound = function () { const f = SF(); return ['key1', 'key2', 'key3'].filter(k => f[k]).length; };
Story.sewingDoorUse = function (d) {
  if (!d.locked) return true;
  if (this.keysFound() >= 2) { SF().sewOpen = true; d.locked = false; d.creakOpen(1.3, .5); return false; }
  return true;
};
Story.elenaDoorUse = function (d) {
  if (!d.locked || d.missing) return true;
  const f = SF(); f.locks = f.locks || 0;
  const keys = ['ironKey1', 'ironKey2', 'ironKey3'].filter(k => Story.has(k));
  if (Chase.active && keys.length && f.locks + keys.length >= 3) {
    if (f.fumbling) return false; f.fumbling = true;
    UI.say('You jam the keys in. One — two — three —', 1.4); SFX.click(d.pos(), .5, 1500);
    this.after(.45, () => SFX.click(d.pos(), .5, 1300)); this.after(.85, () => SFX.click(d.pos(), .5, 1700));
    this.after(1.15, () => { if (!Story.has(keys[0]) && f.locks < 3) { f.fumbling = false; return; } keys.forEach(k => this.take(k)); f.locks = 3; d.locked = false; SFX.unlock(d.pos()); d.setOpen(true, 6); });
    return false;
  }
  if (keys.length) {
    keys.forEach(k => this.take(k)); f.locks += keys.length; SFX.unlock(d.pos());
    if (f.locks >= 3) { d.locked = false; UI.say('The last lock turns. The door is open.', 3); UI.objective('Go in.'); }
    else UI.say(`The key turns with a heavy clunk. ${3 - f.locks === 1 ? 'One lock' : (3 - f.locks) + ' locks'} left.`, 3.5);
    return false;
  }
  SFX.locked(d.pos());
  UI.say(f.locks ? `${3 - f.locks} lock${3 - f.locks > 1 ? 's' : ''} left. Keep looking.` : 'Three iron locks, one above the other, on a child\'s bedroom door. Someone wanted this door to stay shut — from the outside.', 4.5);
  if (!f.keysObj) { f.keysObj = true; UI.objective('Find three old keys.'); }
  return false;
};
Story.keyFound = function () {
  const f = SF(); f.keys = this.keysFound();
  if (!f.keysObj) f.keysObj = true; f.keysShown = f.keys;
  UI.objective(f.keys >= 3 ? 'Open the locked room.' : `Find three old keys (${f.keys}/3).`);
  if (f.keys === 1) this.after(3, () => { SFX.knock(V3(-2.2, UY + 1.2, 0), 2, .4); });
};
Story.paintingUse = function () {
  const f = SF();
  if (f.paintingDown) { insp('Written on the wallpaper', 'IT LEARNS\nIT WEARS THEIR FACES\nIT DOESN\'T KNOW SHE\'S GONE'); return; }
  f.paintingDown = true; const g = W.obj.gPainting.g; let t = 0; const y0 = g.position.y;
  SFX.scrape(g.position, .3, .3);
  W.updaters.push(dt => { t += dt; g.position.y = y0 - t * t * 4.9; g.rotation.x = -t * 1.5; if (g.position.y < UY + .2) { g.visible = false; SFX.crash(g.position, .5); return false; } return true; });
  W.obj.gMessage.visible = true;
  this.after(1.3, () => {
    this.addNote('wallMessage', 'Behind the painting', ['Written on the wallpaper behind Grandad\'s painting, in pencil, pressed so hard it tore:\n\nIT LEARNS\nIT WEARS THEIR FACES\nIT DOESN\'T KNOW SHE\'S GONE']);
    insp('Written on the wallpaper', 'Behind where the painting hung, in pencil, pressed so hard the paper tore:\n\nIT LEARNS\nIT WEARS THEIR FACES\nIT DOESN\'T KNOW SHE\'S GONE', null, () => {
      const d = W.doors.gbed; if (d.open) { this.after(.4, () => { d.slam(); W.camShake = .4; }); } else { this.after(.4, () => SFX.slam(d.pos(), .8)); }
      this.after(1.6, () => UI.sub('', '[footsteps run past in the hall — then nothing]', 3));
      [0, .25, .5, .75].forEach(t => this.after(.9 + t, () => SFX.footstep('carpet', V3(0, UY + .1, -2.5 - t * 6), 1.1)));
    });
  });
};
Story.medCabinetUse = function () {
  const f = SF(); const pv = W.obj.medDoorPivot;
  if (!f.medOpened) { f.medOpened = true; pv.rotation.y = -1.6; SFX.creak(V3(-7, UY + 1.3, -13.7), .3, .5); }
  UI.say('Pill bottles. Every one prescribed to Arthur Hale, for sleep. Dozens of them. He was not sleeping.', 5);
};

// ---------------- chapter 5 ----------------
Story.enter5 = function () {
  this.setIntensity(3);
  UI.objective('Find out what happened to Elena.');
  this.after(1.2, () => UI.sub(NM(), 'Her room. He kept it exactly the same.', 3.5));
  this.after(28, () => { SF().boxSelfArmed = true; });
};
Story.ch5 = function (dt) {
  const f = SF(), r = this.room;
  // the bear turns its head while you are not looking
  if (r === 'elena' || r === 'ward') {
    f.bearCD = (f.bearCD || 0) - dt;
    const bp = W.obj.bear.getWorldPosition(new THREE.Vector3()).setY(UY + .7);
    if (f.bearCD <= 0 && !inView(bp, .4) && this.roomT > 3) {
      const b = W.obj.bear; const ang = Math.atan2(P.pos.x - bp.x, P.pos.z - bp.z) - b.rotation.y;
      W.obj.bearHead.rotation.y = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.6, 1.6); f.bearTurned = true; f.bearCD = 9;
    }
  }
  // the music box plays by itself
  if (f.boxSelfArmed && !f.boxSelf && !f.boxSolved && r === 'elena') {
    const mp = W.obj.musicBox.getWorldPosition(new THREE.Vector3());
    if (P.pos.distanceTo(mp) > 3.5) { f.boxSelf = true; W.selfBox = SFX.musicBox(mp, { wrong: true, notes: 15, slowdown: true, vol: .2 }); UI.sub('', '[the music box begins to play — nobody wound it]', 3.5); }
  }
  if (W.selfBox && f.boxSelf) { const mp = W.obj.musicBox.getWorldPosition(new THREE.Vector3()); if (P.pos.distanceTo(mp) < 1.6) { W.selfBox.stop(); W.selfBox = null; } }
  // drawings change after you have looked at them
  W.drawings.forEach((d, i) => {
    if (f['dv' + i] && d.stage < 2) { const p = d.pic.g.getWorldPosition(new THREE.Vector3()); if (!inView(p, .4)) { d.stage++; d.pic.set(drawCrayon({ kind: d.kind, stage: d.stage })); f['dv' + i] = false; } }
  });
  // the mirror
  if ((f.diaryRead || 0) >= 1 && !f.elenaMirror && r === 'elena' && !f.boxSolved && !Chase.active) {
    const mp = V3(-3.6, UY + 1.38, 3.86);
    if (P.pos.distanceTo(mp) < 2.7 && lookDot(mp) > .9) {
      f.elenaMirror = true; Ent.show(P.pos.x - .2, UY, P.pos.z - 1.15, { mirror: true, dur: 3, yaw0: P.yaw, quiet: true, scale: .95 });
      this.after(.15, () => { SFX.heartbeat(6, .45, 1.6); });
    }
  }
  // CHASE 2: it follows you into the wardrobe
  if (f.boxSolved && Story.has('musicBox') && !f.chase2 && r === 'ward' && P.pos.x < -13.4 && !Chase.active) Chase.start(CHASES[2]);
  // the wardrobe corridor
  if (r === 'ward' && !f.wardWalk) { f.wardWalk = true; const L = W.obj.lamp_wcor; if (L) { L.flick = .9; } SFX.creak(V3(-16, UY + 1, 0), .35, 1.5); }
  if (r === 'ward' && P.pos.x < -19 && !f.breath && !Chase.active) { f.breath = true; SFX.whisper(V3(-22.6, UY + 1.3, 0), 1.6, .25); UI.sub('', '[breathing, on the other side of the small door]', 3); }
};
Story.readDiary = function (fromInv) {
  const f = SF();
  this.addNote('diary', 'Elena\'s diary', TXT.diary, true);
  if (!Story.has('diary') && !f.diaryTaken) { Story.give('diary'); } f.diaryTaken = true; W.obj.diary.visible = false;
  UI.read('Elena\'s diary', TXT.diary, {
    hand: true, onClose: () => {
      f.diaryRead = (f.diaryRead || 0) + 1;
      if (CH() === 5 && !f.boxSolved) { UI.objective('Make the music box play her song.'); }
    }
  });
};
Story.drawingUse = function (i) {
  const d = W.drawings[i]; SF()['dv' + i] = true;
  const T = {
    family: ['The family in crayon: a tall daddy, a mama in a dress, a boy, and a girl labelled ELENA. A yellow sun.', 'The same family. But now there is another figure at the edge of the paper — taller than everyone, coloured in so hard the crayon broke.', 'The girl\'s face has been scribbled out in black. Under her someone has written, in a child\'s hand: "ME?"'],
    mama: ['Two mamas, side by side, both in red dresses. Both labelled MAMA.', 'Two mamas. One is coloured black now. The label under it says NOT MAMA.', 'The black mama has no face. At the top, in red: "IT KNOWS THE SONG NOW".'],
    house: ['The house. OUR HOUSE, in careful capitals. Four windows.', 'The house has more windows than before. Something looks out of every one.', 'There are windows everywhere now, and eyes in all of them. "IT HAS MORE ROOMS AT NIGHT".'],
  }[d.kind];
  insp('A crayon drawing', T[d.stage], drawCrayon({ kind: d.kind, stage: d.stage }));
};
Story.seasonUse = function () {
  const f = SF(); f.season = f.season == null ? 0 : (f.season + 1) % 4;
  const s = f.season; W.obj.seasonPic.set(drawSeason(s));
  const T = ['Summer. Bright, still afternoon. The oak is heavy with leaves and the swing is moving gently, though there is no wind.\n\nIt is the middle of the night. It is raining.', 'Autumn. Leaves everywhere. A girl in a yellow dress sits on the swing with her back to the house.', 'Winter. Snow over the whole garden, smooth and unbroken. Not a single footprint.', 'Night. Raining. Someone very tall is standing on the lawn, looking up at this window.'];
  insp('Elena\'s window', T[s], drawSeason(s));
  if (s === 3) this.after(.2, () => SFX.heartbeat(4, .35, 1.3));
};
Story.openWardrobe = function (instant) {
  SF().wardOpen = true; W.obj.wardCol.on = false;
  const L = W.obj.wardL, R = W.obj.wardR; let t = instant ? 1 : 0;
  const set = k => { L.rotation.y = -1.7 * k; R.rotation.y = 1.7 * k; };
  if (instant) { set(1); return; }
  W.updaters.push(dt => { t += dt / 1.2; set(smooth(Math.min(1, t))); return t < 1; });
};
Story.wardrobeUse = function () {
  if (!SF().wardOpen) { this.openWardrobe(); SFX.doorOpen(V3(-9.5, UY + 1, 0), true); this.after(1.2, () => UI.say('Moth-eaten coats. And behind them, where the back of the wardrobe should be... a hallway.', 5)); }
  else UI.say('The hallway goes back further than the house does.', 3.5);
};
Story.musicBoxUse = function () {
  const f = SF();
  if (f.boxSolved) {
    if (!Story.has('musicBox') && !f.boxTaken) { f.boxTaken = true; W.obj.musicBox.visible = false; Story.give('musicBox'); UI.objective(SF().doorGone ? 'The door is gone. Find another way out.' : 'Find a way out.'); if (!f.wardOpen) this.after(6, () => { SFX.whisper(V3(-9.8, UY + 1.4, 0), 1.6, .3); UI.sub('', '[a whisper, from inside the wardrobe] ...this way...', 3); }); }
    return;
  }
  if ((f.diaryRead || 0) < 1) { insp('Elena\'s music box', 'A small walnut box with three brass pegs on the lid, each ringed with tiny engraved pictures. The key is already in it.\n\nIt was her mother\'s, then hers. There must be a right way to set the pegs.'); return; }
  this.boxPuzzle();
};
Story.boxPuzzle = function () {
  const SYM = ['SUN', 'BIRD', 'STAR', 'MOON', 'BELL', 'OAK']; const sol = [1, 3, 5];
  const f = SF(); f.dials = f.dials || [0, 0, 0];
  const mp = W.obj.musicBox.getWorldPosition(new THREE.Vector3());
  UI.puzzle('Elena\'s music box', 'Three brass pegs, each ringed with engraved pictures. Turn them, then wind the key.', (body, close) => {
    const wrap = document.createElement('div'); wrap.className = 'dials';
    const faces = [];
    f.dials.forEach((v, i) => {
      const d = document.createElement('div'); d.className = 'dial';
      const lbl = document.createElement('div'); lbl.className = 'lbl'; lbl.textContent = ['first', 'middle', 'last'][i] + ' peg';
      const face = document.createElement('div'); face.className = 'face'; face.style.fontSize = '18px'; face.style.fontFamily = '"Special Elite",monospace'; faces.push(face);
      const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '6px';
      const b1 = document.createElement('button'); b1.textContent = '◀'; const b2 = document.createElement('button'); b2.textContent = '▶';
      b1.onclick = () => { f.dials[i] = (f.dials[i] + 5) % 6; SFX.click(null, .25, 2600); upd(); };
      b2.onclick = () => { f.dials[i] = (f.dials[i] + 1) % 6; SFX.click(null, .25, 2600); upd(); };
      row.append(b1, b2); d.append(lbl, face, row); wrap.appendChild(d);
    });
    const upd = () => faces.forEach((fc, i) => fc.textContent = SYM[f.dials[i]]);
    upd(); body.appendChild(wrap);
    const msg = document.createElement('p'); msg.style.minHeight = '48px'; body.appendChild(msg);
    const wind = document.createElement('button'); wind.textContent = 'Wind the key';
    let playing = null;
    wind.onclick = () => {
      if (playing) playing.stop();
      const ok = f.dials.every((v, i) => v === sol[i]);
      if (ok) { wind.disabled = true; msg.textContent = 'The song plays all the way through. It is beautiful. It is exactly right.'; setTimeout(() => { close(); this.boxSolved(); }, 1400); }
      else { playing = SFX.musicBox(mp, { wrong: true, notes: 9, vol: .22 }); msg.textContent = 'The song comes out wrong — the notes sag and slide, like someone humming it from memory.'; f.boxTries = (f.boxTries || 0) + 1; if (f.boxTries === 3) msg.textContent += ' (Her diary talks about the pegs.)'; }
    };
    body.appendChild(wind);
  });
};
Story.boxSolved = function (remote) {
  const f = SF(); if (!remote) Net.beat('boxSolved'); f.boxSolved = true; if (W.selfBox) W.selfBox.stop();
  const mp = W.obj.musicBox.getWorldPosition(new THREE.Vector3());
  const song = SFX.musicBox(mp, { vol: .24, bus: SFX.voice });
  this.setIntensity(4);
  this.after(6.5, () => {
    song.stop(); W.blackout = true; W.flashDead = true; SFX.silence(11, .03); SFX.hit(.5);
    this.after(1.6, () => { UI.sub('A child\'s voice', 'You finally remembered me.', 4); SFX.speak('You finally remembered me.', { pitch: 1.9, rate: .78, volume: .7 }); SFX.murmur(P.pos.clone().add(V3(.4, 1.1, .3)), 1.8, { pitch: 330, vol: .12, formantShift: 1.3 }); });
    const c = V3(-6, UY + .1, 0);
    for (let i = 0; i < 16; i++) this.after(4 + i * .42, () => { const a = i / 16 * TAU * 1.25; SFX.footstep('wood', V3(c.x + Math.cos(a) * 4.8, c.y, c.z + Math.sin(a) * 4.8), 1.1, 1.3); });
    this.after(5, () => UI.sub('', '[footsteps, circling the room — outside the walls]', 4));
    this.after(11.5, () => {
      W.blackout = false; W.flashDead = false; W.flashFlicker = 1.2; W.doors.elena.setMissing(); f.doorGone = true;
      this.after(2, () => { UI.sub(NM(), 'The door... where is the door?', 3.5); UI.objective('Take the music box.'); });
    });
  });
};
Story.wardEndUse = function (d) {
  const f = SF();
  if (!f.boxSolved) return true;
  if (!Story.has('musicBox')) { UI.say('Not without her music box.', 3); return false; }
  if (f.wardExit) return false; f.wardExit = true;
  d.locked = false; d.setOpen(true, 1.2); SFX.doorOpen(d.pos(), true);
  UI.fade(1, 1.4);
  this.after(1.8, () => {
    this.placePlayer(6); const bd = W.doors.basement; bd.locked = false; bd.setOpen(true, 50); bd.ang = bd.target; bd.pivot.rotation.y = bd.ang; bd.col.on = false; W.obj.basementBolt.visible = false;
    this.startChapter(6); UI.fade(0, 2);
  });
  return false;
};

// ---------------- chapter 6 ----------------
Story.enter6 = function (load) {
  this.setIntensity(4);
  UI.objective('Go down into the basement.');
  if (!load) this.after(2.2, () => UI.sub(NM(), 'The downstairs hall. I was upstairs. I was upstairs.', 4));
  this.after(4.5, () => UI.sub(NM(), 'And the basement door is open.', 3));
  W.doors.basement.locked = false;
};
Story.ch6 = function (dt) {
  const f = SF(), r = this.room;
  // the stairs are longer going down
  if (r === 'bstairs' && P.pos.x > -1 && P.pos.x < 1) {
    const dz = P.pos.z - (this.lastZ == null ? P.pos.z : this.lastZ);
    if (dz < -0.001 && P.pos.z < -20 && (f.stairShift || 0) < 2) { P.pos.z += 2.0; f.stairShift = (f.stairShift || 0) + 1; }
  }
  this.lastZ = P.pos.z;
  if (!f.bottom && P.lv === -1 && P.pos.z < -24.4) {
    f.bottom = true; UI.objective('Find out what Grandad kept down here.');
    this.after(1, () => UI.sub(NM(), 'Thirty-two steps, he wrote. That was more than thirty-two.', 4));
    this.after(16, () => { f.sightB1 = true; });
  }
  // a figure at the mouth of the west corridor
  if (f.sightB1 && !f.sightB1done && r === 'basement' && !Ent.on) {
    const sp = V3(-11.2, BY, -30);
    if (inView(sp.clone().setY(BY + 1.7), .4) && P.pos.distanceTo(sp) > 6) { f.sightB1done = true; Ent.show(sp.x, sp.y, sp.z, { dur: 5, vanish: 5.5, untilUnseen: true }); }
  }
  // the corridors only lead back
  if (r === 'corridor') {
    if (P.pos.x < -21.2) { P.pos.x += 34; this.loopHit(); }
    else if (P.pos.x > 21.2) { P.pos.x -= 34; this.loopHit(); }
  }
  // lights shut off behind you, one section at a time
  if (f.tapeDone && f.chase3 && !Chase.active && !f.lightsBehind && P.pos.z < -31 && r === 'basement') {
    f.lightsBehind = true;
    ['b0', 'b1', 'b2'].forEach((n, i) => this.after(i * 1.4, () => { const L = W.obj['lamp_' + n]; setLamp(L, false); SFX.click(L.obj.position, .6, 600); }));
    this.after(5, () => { if (!Ent.on && this.room === 'basement') Ent.show(0, BY, -25.6, { dur: 4, vanish: 6, untilUnseen: true }); });
  }
  // dinner, beyond the wall
  if (f.panelOpen && this.room !== 'memory') {
    f.dinnerCD = (f.dinnerCD || 0) - dt;
    if (f.dinnerCD <= 0) { f.dinnerCD = rand(2.5, 4.5); const mp = V3(0, BY + 1.1, -55); SFX.murmur(mp, rand(1, 2.2), { pitch: pick([110, 190, 300]), vol: .16 }); if (Math.random() < .5) SFX.click(mp, .15, 3500); }
  }
};
Story.loopHit = function () {
  const f = SF(); f.loops = (f.loops || 0) + 1;
  if (f.loops === 1) this.after(1, () => UI.sub(NM(), '...That\'s the same room.', 3));
  if (f.loops === 2) this.after(.6, () => { SFX.whisper(P.pos.clone().add(V3(0, 1.5, 0)), 1.8, .3); UI.sub('', '[a whisper, very close] ...there is only one way down here...', 3.5); });
};
Story.boxPhotosUse = function () {
  const pages = [];
  const cap = ['You, in the front hall, reading Grandad\'s note. Tonight. Taken from somewhere up near the ceiling.', 'You, at the dining-room cabinet with the photographs in your hands. Tonight.', 'You, in the upstairs hall, looking the other way. Behind you, very close, something tall.'];
  for (let i = 0; i < 3; i++) pages.push({ canvas: this.snaps[i] || this.fallbackSnap(i), text: cap[i] });
  pages.push({ canvas: this.babyPhoto(), text: 'At the bottom of the box, older than the rest: Grandma in the garden, holding a baby in a white bonnet.\n\nOn the back: "Elena, her first summer, 1978."' });
  UI.gallery('A box of photographs', pages, () => { if (!SF().gotBaby) { SF().gotBaby = true; Story.give('babyPhoto'); } });
  if (!SF().photosSeen) { SF().photosSeen = true; this.after(.4, () => SFX.heartbeat(4, .35, 1.3)); }
};
Story.playTape = function (remote) {
  const f = SF(); if (f.tapePlaying) return; f.tapePlaying = true;
  if (!remote) Net.beat('tape');
  const tp = W.obj.tape.getWorldPosition(new THREE.Vector3()).setY(BY + 1.1);
  SFX.click(tp, .5, 1200); const hiss = SFX.emitter(tp, 'static'); hiss.set(.05); W.emitters.push(hiss);
  const voice = Settings.voice && 'speechSynthesis' in window;
  UI.objective('Listen.');
  let t = 1.2;
  TAPE.forEach(([who, txt, d]) => {
    const dur = Math.max(d, txt.split(' ').length * .36 + 1);
    const at = t;
    this.after(at, () => { UI.sub('Grandad — on the tape', txt, dur - .2); if (voice) SFX.speak(txt, { pitch: .55, rate: .9, volume: .6 }); else SFX.murmur(tp, dur - 1, { pitch: 95, radio: true, vol: .3, formantShift: .9 }); });
    t += dur;
  });
  this.after(t + .5, () => {
    hiss.stop(); SFX.click(tp, .5, 900); f.tapePlaying = false; f.tapeDone = true;
    this.addNote('tape', 'Grandad\'s confession', [TAPE.map(l => l[1]).join('\n\n')]);
    if (!remote) this.after(2.2, () => { if (!SF().chase3 && !Chase.active) Chase.start(CHASES[3]); });
  });
};
Story.sealedUse = function (d) {
  if (!SF().tapeDone || d.locked) { SFX.locked(d.pos()); UI.say('Iron, cold and beaded with damp. It is bolted — from the other side.', 4); return false; }
  if (!SF().pedObj) { SF().pedObj = true; this.after(1.5, () => UI.objective('Lay her down the way she grew.')); }
  return true;
};
Story.pedPrompt = function (i) { const p = W.pedestals[i]; return p.item ? 'Take back ' + ITEMS[p.item].name.toLowerCase().replace(/^elena's /, 'her ') : (SF().pedSolved ? null : 'Place something on the pedestal'); };
Story.placeOnPedestal = function (i, id, silent) {
  const p = W.pedestals[i]; p.item = id;
  if (p.mesh) p.holder.remove(p.mesh);
  const g = new THREE.Group();
  if (id === 'musicBox') { box(.22, .12, .16, 0, 0, 0, MAT.darkWood, { parent: g, occ: false }); box(.23, .03, .17, 0, .12, 0, MAT.frame, { parent: g, occ: false }); }
  else if (id === 'diary') box(.2, .04, .26, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x5a2a36, roughness: .8 }), { parent: g, occ: false });
  else { const m = plane(.22, .18, 0, .1, 0, new THREE.MeshStandardMaterial({ map: texFrom(this.babyPhoto(), false), roughness: .8 }), { parent: g }); m.rotation.x = -.5; box(.24, .2, .02, 0, 0, -.05, MAT.frame, { parent: g, occ: false, rx: -.5 }); }
  p.holder.add(g); p.mesh = g;
  if (!silent) { this.take(id); SFX.click(p.g.position, .4, 1500); this.S.pedV = (this.S.pedV || 0) + 1; }
};
Story.pedestalUse = function (i) {
  const p = W.pedestals[i], f = SF();
  if (f.pedSolved) return;
  if (p.item) { Story.give(p.item, true); UI.notify('Taken back: ' + ITEMS[p.item].name); p.holder.remove(p.mesh); p.mesh = null; p.item = null; this.S.pedV = (this.S.pedV || 0) + 1; return; }
  const cands = ['babyPhoto', 'musicBox', 'diary'].filter(id => Story.has(id));
  if (!cands.length) { const placed = W.pedestals.filter(q => q.item).length; UI.say(placed ? 'You have nothing else of hers.' : !Story.has('babyPhoto') ? 'Her music box. Her diary. And something from before both of them — from her very beginning.' : 'You have nothing of hers to place.', 4.5); return; }
  UI.choose('The pedestal', 'What do you lay down here?', cands.map(id => ({ label: ITEMS[id].name, fn: () => { this.placeOnPedestal(i, id); this.pedReact(); } })));
};
Story.pedReact = function () {
  const f = SF(); const n = W.pedestals.filter(q => q.item).length;
  f.pedPlaced = Math.max(f.pedPlaced || 0, n);
  if (n === 1 && !f.pr1) {
    f.pr1 = true; const d = W.doors.sealed; this.after(1, () => { if (d.open) d.slam(); else SFX.slam(d.pos(), .8); W.camShake = .4; });
    this.after(2.5, () => { UI.sub('A child\'s voice, behind the door', 'Daddy? Is that you? Don\'t lock me in again.', 4); SFX.speak('Daddy? Is that you? Don\'t lock me in again.', { pitch: 1.8, rate: .8, volume: .45 }); });
  }
  if (n === 2 && !f.pr2) {
    f.pr2 = true; W.lamps.forEach(L => { if (L.lv === -1) { L.flick0 = L.flick; L.flick = .95; } });
    this.after(2.6, () => W.lamps.forEach(L => { if (L.lv === -1) L.flick = L.flick0 || 0; }));
    this.after(.8, () => { if (!Ent.on) Ent.show(1.8, BY, -37.0, { dur: 4.5, vanish: 2.6, stareT: 1.5 }); });
    this.after(1.4, () => { UI.sub('A child\'s voice, very close', 'I\'m still here. I\'m still me. Please don\'t put me away.', 4.5); SFX.speak('I\'m still here. I\'m still me. Please don\'t put me away.', { pitch: 1.8, rate: .8, volume: .5 }); });
  }
  if (n === 3) {
    const order = W.pedestals.map(q => q.item);
    if (order.join() === 'babyPhoto,musicBox,diary') this.after(.8, () => this.pedSolved());
    else this.after(.9, () => {
      SFX.crash(V3(0, BY + 1, -42.3), .9); W.camShake = .6; Ent.hide(true);
      W.pedestals.forEach(q => { if (q.item) { Story.give(q.item, true); q.holder.remove(q.mesh); q.mesh = null; q.item = null; } }); this.S.pedV = (this.S.pedV || 0) + 1;
      UI.sub('A voice — almost hers', 'That isn\'t how I grew.', 3.5); SFX.murmur(V3(0, BY + 1.5, -42), 1.4, { pitch: 240, vol: .25, formantShift: .8 });
      UI.notify('Everything is thrown from the pedestals.');
    });
  }
};
Story.pedSolved = function (remote) {
  const f = SF(); if (!remote) Net.beat('pedSolved'); f.pedSolved = true; Ent.hide(true);
  UI.sub('A child\'s voice, softly', '...you remembered how I grew.', 4);
  SFX.speak('You remembered how I grew.', { pitch: 1.8, rate: .75, volume: .5 });
  const bp = W.obj.backPanel; const y0 = bp.position.y; let t = 0;
  this.after(2, () => {
    SFX.scrape(V3(0, BY + 1, -44), 4, .55); W.camShake = .25;
    W.updaters.push(dt => { t += dt / 4; bp.position.y = y0 - smooth(Math.min(1, t)) * 2.3; if (t >= 1) { W.obj.backPanelCol.on = false; f.panelOpen = true; UI.objective('Go through.'); return false; } return true; });
  });
};

// ---------------- chapter 7 ----------------
Story.enter7 = function (load) {
  this.setIntensity(3); W.raining = false;
  UI.objective('Speak to Grandad.');
  const close = () => { const bp = W.obj.backPanel; let t = 0; W.obj.backPanelCol.on = true; const y0 = bp.position.y; SFX.slam(V3(0, BY + 1, -44), .6); W.updaters.push(dt => { t += dt / .6; bp.position.y = lerp(y0, BY + .1, Math.min(1, t)); return t < 1; }); };
  if (!load) this.after(1, close); else W.obj.backPanel.position.y = BY + .1, W.obj.backPanelCol.on = true;
  this.after(2, () => UI.sub(NM(), 'The living room. But... they\'re all here.', 3.5));
  W.memHum = SFX.musicBox(W.obj.tableMusicBox.getWorldPosition(new THREE.Vector3()), { vol: .08, tempo: .4 });
};
Story.ch7 = function () {
  if (SF().endingChosen) return;
  const a = W.obj.arthur; if (!a) return;
  if (!SF().arthurGreet && P.pos.distanceTo(a.getWorldPosition(new THREE.Vector3())) < 4.5) { SF().arthurGreet = true; UI.sub('Grandad', 'There you are. Come and sit down.', 3); SFX.murmur(a.getWorldPosition(new THREE.Vector3()).setY(BY + 1.3), 1.6, { pitch: 105, vol: .3 }); }
};
Story.canC = function () { const f = SF(); return Object.keys(this.S.mem).length >= 6 && f.tapeDone && (f.diaryRead || 0) >= 1 && f.letterRead; };
Story.talkArthur = function (mode) {
  const canC = this.canC();
  const N = {
    start: { who: 'Grandad', text: 'There you are. Sit down, sit down — your plate\'s getting cold. We set a place for you. We always set a place.', opts: [{ t: 'Grandad? You\'re... alive?', to: 'alive' }, { t: 'Where is Elena?', to: 'elena' }, { t: 'What is this?', to: 'what' }] },
    alive: { who: 'Grandad', text: 'Alive? I\'m remembered. In this house, that comes to the same thing.', next: 'what' },
    elena: { who: 'Grandad', text: 'She\'s right there, love. Look at her. She\'s nearly perfect now. Tonight she even remembered to rush the third line of the song.', next: 'what' },
    what: { who: 'Grandad', text: 'It\'s the fourteenth of October, nineteen eighty-seven. The last night we were all at this table. The house plays it over and over, trying to make it complete.', next: 'what2' },
    what2: { who: 'Grandad', text: 'Every time, it gets one more thing right. It only needed everyone to be here. That\'s all it ever wanted. That\'s all I ever wanted.', next: 'box' },
    box: { who: 'Grandad', text: 'The music box holds her song. The house builds her around the song. Break it, and all of this stops. Her. The table. Me.', opts: [{ t: 'Destroy the music box.', to: 'A1' }, { t: 'Leave it. Sit down with them.', to: 'B1' }].concat(canC ? [{ t: 'You kept the house awake on purpose. Didn\'t you?', to: 'C1', special: true }] : []).concat([{ t: '(Step back.)', to: null }]) },
    A1: { who: 'Grandad', text: '...Yes. Yes, I suppose somebody has to.', act: () => this.endingA() },
    B1: { who: 'Grandad', text: 'Good. Good. Sit by Elena — she\'s been asking about you all night.', act: () => this.endingB() },
    C1: { who: 'Grandad', text: '...Every night I told myself it was for her. That if I let the house stop, she\'d be gone for good.', next: 'C2' },
    C2: { who: 'Grandad', text: 'But it was me. I was afraid that if the house forgot her, I would too. That one morning I\'d wake and not remember her face.', opts: [{ t: 'You won\'t forget her. The swing. The ribbon. The yellow dress. The inside hall. The drawing. The beam. She isn\'t in the music box — she\'s in us.', to: 'C3', special: true }, { t: 'Then let it end. Destroy the box.', to: 'A1' }] },
    C3: { who: 'Grandad', text: '...She is. Isn\'t she.', next: 'C4' },
    C4: { who: 'Elena', text: 'Daddy. You can let go now. I\'m still me. I\'ll always be me.', next: 'C5', voice: 1.85 },
    C5: { who: 'Grandad', text: 'All right, sweetheart. All right.', opts: [{ t: 'Let the memories go.', to: 'C6', special: true }] },
    C6: { who: '', text: 'You do not break anything. You only stop holding on.', act: () => this.endingC() },
  };
  UI.dialogue(N, mode === 'box' ? 'box' : (SF().talked ? 'box' : 'start'), (node) => { SF().talked = true; if (node && node.voice) SFX.speak(node.text, { pitch: node.voice, rate: .8, volume: .5 }); });
};
function dawnHouse(quiet) {
  W.dawn = true; W.raining = false; W.blackout = false; Ent.hide(true); Story.setIntensity(0);
  W.scene.fog.color.set(0x8a8478); W.scene.background = new THREE.Color(0x8a8478); W.scene.fog.density = .03;
  if (W.moon) { W.moon.color.set(0xffd9a8); }
  W.hemi.color.set(0xd8c8a8); W.hemi.groundColor.set(0x3a3228);
  W.lamps.forEach(L => { L.flick = 0; });
  const fd = W.doors.front; fd.locked = false; fd.setOpen(true, .6); SFX.doorOpen(fd.pos(), true);
  setDiningOffset(0); setHallLength(0);
  if (W.clockEm) W.clockEm.stop(); if (W.hum) W.hum.stop();
  Story.placePlayer(2); P.pos.set(0, 0, -2.5); P.yaw = Math.PI;
  Story.birdsT = 0;
}
Story.endingA = function (remote) {
  const f = SF(); if (!remote) Net.beat('ending', { w: 'A' }); f.endingChosen = 'A'; if (W.memHum) W.memHum.stop();
  const mb = W.obj.tableMusicBox; const mp = mb.getWorldPosition(new THREE.Vector3());
  SFX.crash(mp, 1.2); SFX.hit(.7); mb.visible = false; W.fx.flash = 1; W.camShake = .8;
  ['fam_elena', 'fam_thomas', 'fam_margaret', 'arthur'].forEach((k, i) => this.after(.8 + i * .9, () => { if (W.obj[k]) { W.obj[k].visible = false; SFX.whisper(W.obj[k].position.clone().setY(BY + 1.3), .7, .2); } }));
  this.after(4.8, () => { W.blackout = true; UI.fade(1, 2.2); });
  this.after(8, () => { dawnHouse(); UI.fade(0, 3); UI.objective('Go outside.'); this.endingWalk = 'A'; });
};
Story.endingC = function (remote) {
  const f = SF(); if (!remote) Net.beat('ending', { w: 'C' }); f.endingChosen = 'C'; if (W.memHum) W.memHum.stop();
  SFX.musicBox(W.obj.tableMusicBox.getWorldPosition(new THREE.Vector3()), { vol: .22, bus: SFX.voice });
  ['arthur', 'fam_margaret', 'fam_thomas', 'fam_elena'].forEach((k, i) => this.after(2 + i * 1.6, () => { if (W.obj[k]) W.obj[k].visible = false; }));
  this.after(9.5, () => UI.fade(1, 2.5));
  this.after(12.5, () => {
    dawnHouse(); UI.fade(0, 3);
    this.setPortrait('hall', 3); this.setPortrait('dining', 3);
    W.portraits.mantel1.set(drawPhoto({ w: 250, h: 200, bg: 'garden', tree: .7, people: [{ x: .25, kind: 'man', smile: true }, { x: .42, kind: 'woman', smile: true }, { x: .6, kind: 'boy', smile: true }, { x: .76, kind: 'girl', smile: true }] }));
    this.after(2.5, () => UI.sub(NM(), 'It\'s so quiet.', 3)); UI.objective('Go outside.'); this.endingWalk = 'C';
  });
};
Story.endingB = function (remote) {
  const f = SF(); if (!remote) Net.beat('ending', { w: 'B' }); f.endingChosen = 'B';
  const seat = W.obj.fam_elena.getWorldPosition(new THREE.Vector3());
  W.forceLook = { target: W.obj.arthur.getWorldPosition(new THREE.Vector3()).setY(BY + 1.3), speed: 2, t: 6 };
  P.frozen = true; this.after(.5, () => SFX.scrape(seat, .8, .3));
  this.after(2, () => UI.sub('Grandad', 'There. Now we\'re all here.', 3.5));
  this.after(5, () => { UI.fade(1, 3.5); });
  this.after(9.5, () => { P.frozen = false; Game.loopRestart(); });
};
Story.setupLoop = function () {
  const pic = framedPicture(this.endPhoto('B'), .34, .27, 0, 1.6, 4.13, 0, null, { frame: .03 });
  IT(pic.g, 'loopPhoto'); rebuildRayList();
  this.after(90, () => { if (G.state === 'play' && this.S.loop) this.ending('B', true); });
};
Story.enterLoop = function () {
  this.setIntensity(0); W.raining = true; UI.objective('Go up to the house.');
  this.after(2.5, () => UI.sub(NM(), 'Fourteen Alder Lane. I haven\'t been here since...', 4));
  this.after(7.5, () => UI.sub(NM(), 'Since dinner. Since we all sat down to dinner.', 4));
};
Story.chEnd = function (dt) {
  // dawn: birdsong, and the walk out
  this.birdsT = (this.birdsT || 0) - dt;
  if (W.dawn && this.birdsT <= 0) { this.birdsT = rand(1.5, 4); chirp(); }
  if (this.endingWalk && P.outside && !SF().farewell) {
    SF().farewell = true;
    if (this.endingWalk === 'D') {
      this.after(.5, () => UI.sub(NM(), 'Visiting hours are over.', 3));
      this.after(4, () => this.ending('D'));
    } else if (this.endingWalk === 'F') this.after(5, () => this.ending('F'));
    else if (this.endingWalk === 'C') {
      this.after(.5, () => { UI.sub('Elena', `Goodbye, ${NM()}. Thank you for remembering me.`, 5); SFX.speak(`Goodbye, ${NM()}. Thank you for remembering me.`, { pitch: 1.85, rate: .8, volume: .55 }); });
      this.after(7, () => this.ending('C'));
    } else this.after(4, () => this.ending('A'));
  }
};
function chirp() {
  if (!SFX.ok) return; const ctx = SFX.ctx, t = SFX.now(); const out = SFX.out(V3(rand(-12, 12), rand(3, 7), rand(8, 26)), SFX.amb, 3, .6);
  const n = Math.floor(rand(2, 5));
  for (let i = 0; i < n; i++) { const o = ctx.createOscillator(); const g = ctx.createGain(); const tt = t + i * rand(.09, .16); const f0 = rand(2600, 4200); o.frequency.setValueAtTime(f0, tt); o.frequency.exponentialRampToValueAtTime(f0 * rand(.7, 1.3), tt + .08); o.connect(g); g.connect(out); SFX.env(g, tt, .01, .05, .09); o.start(tt); o.stop(tt + .12); }
}
Story.ending = function (which, fromLoop) {
  if (G.state === 'ending') return;
  const S = this.S;
  const names = { A: 'Let Go', B: 'The New Memory', C: 'The House Remembers', D: 'Visiting Hours', E: 'Discharge', F: 'Going Home' };
  const texts = {
    A: 'The music box breaks with a sound like a held breath let out. The house stops.\n\nIn the morning there is only an old house on Alder Lane, with too many dust sheets and not enough furniture. In the hall, a photograph you have never seen before: Elena, laughing, not posing for anyone. Smiling the way she really smiled.',
    B: 'You sat down. Your plate was warm. Grandad passed the potatoes, and Elena rushed the third line of the song, and it was perfect.\n\nThe house has a new memory now. It will play it every night, for as long as it remembers. It remembers everything.',
    D: 'You gave her the photograph. In the dayroom, an old woman and a girl in a yellow dress sat side by side at the window, and the music box played the song with the third line rushed, the way Elena always sang it.\n\nSt. Brigid\'s was demolished on the 15th. The workmen said the dayroom was the only room they could not bring themselves to knock down first. Somebody, they said, was still visiting.',
    E: 'The photograph burned, and the thing that had learned Elena\'s face from it came apart in the flame. So did the ward, the lights, the bell that rang with no wires.\n\nSo, you think, did Margaret. You will never know whether you set her free or took the last thing she had. The building came down on the 15th. Nothing screamed.',
    F: 'You did not give the photograph to the building, and you did not burn it. You gave Margaret back the pieces of Elena that had never been the building\'s to copy: the drawing, the ribbon, the postcard, the ring.\n\nAt dawn a girl and her mother walked out of the fire exit together and did not look back. You still have the photograph. Everyone in it is laughing.',
    C: 'Grandad kept the house awake because he was afraid of forgetting her. You found every piece of her the house was holding, and gave them back.\n\nThe music box sits on the hall table, closed. It is only a music box now. The portraits are just portraits. And on the porch, as the door opened on the morning, a voice you never heard and have always known said goodbye.',
  };
  const mins = Math.floor(S.playTime / 60), secs = Math.floor(S.playTime % 60);
  const end = Store.get('endings') || {}; end[which] = true; Store.set('endings', end);
  Store.del(this.saveKey()); const p2 = 'DEF'.includes(which);
  UI.endScreen((p2 ? 'Part II · Ending ' : 'Ending ') + which, names[which], p2 ? this.p2EndPhoto(which) : this.endPhoto(which), texts[which], `Time ${p2 ? 'at St. Brigid\'s' : 'in the house'}: ${mins}m ${String(secs).padStart(2, '0')}s · Memories recovered: ${this.memCount()} of ${this.memTotal()} · Endings found: ${Object.keys(end).sort().join(' ')}`);
};

// ---------------- misc helpers ----------------
Story.setPortrait = function (which, stage) {
  if (!W.portraits[which]) return; W.portraitStage[which] = stage;
  W.portraits[which].set(which === 'dining' ? this.diningPortrait(stage) : this.hallPortrait(stage));
};
Story.capture = function (i, camPos, look, withEnt) {
  try {
    if (withEnt && !Chase.active) { const b = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(1.3); const was = Ent.on, wo = Ent.o; Ent.g.visible = true; const op = Ent.g.position.clone(), ol = Ent.g.children[0].layers.mask; Ent.g.position.set(P.pos.x + b.x, P.y, P.pos.z + b.z); Ent.g.rotation.y = P.yaw + Math.PI; Ent.setLayer(2); this.snaps[i] = agePhoto(snapshotCanvas(camPos, look, 320, 240, { gain: 3 }), ''); Ent.g.position.copy(op); Ent.setLayer(was && wo && wo.mirror ? 2 : 0); Ent.g.visible = was; }
    else this.snaps[i] = agePhoto(snapshotCanvas(camPos, look, 320, 240, { gain: 3 }), '');
  } catch (e) { console.warn('snapshot failed', e); }
};
