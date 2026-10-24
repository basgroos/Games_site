// =====================================================================
//  GAME — lifecycle, checkpoints, input routing, main loop
// =====================================================================
const Game = {
  last: 0, errCount: 0,
  hasItem(id) { return Story.has(id); },
  useItem(id) { Story.take(id); },
  disposeWorld() {
    if (!W) return;
    const keep = new Set(Object.values(MAT)); const keepTex = new Set(Object.values(TEX));
    W.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach(m => { if (keep.has(m)) return; if (m.map && !keepTex.has(m.map)) m.map.dispose(); m.dispose(); });
    });
    (W.mirrors || []).forEach(m => m.rt.dispose()); if (W.tvRT) W.tvRT.dispose();
    (W.emitters || []).forEach(e => { try { e.stop(); } catch (er) {} });
  },
  buildWorld() {
    this.disposeWorld();
    G.camera.children.slice().forEach(c => G.camera.remove(c));
    newWorld(); initLightPool();
    if (Story.isP2()) { buildPart2(); buildPlayerBody(); buildParticles(); }
    else { buildExterior(); buildGround(); buildUpstairs(); buildBasement(); buildPlayerBody(); buildParticles(); decorateHouse(); }
    Story.afterBuild(); rebuildRayList();
    try { G.renderer.compile(W.scene, G.camera); } catch (e) {}
  },
  begin(fn) {
    $('title').style.display = 'none'; $('endScreen').classList.remove('show'); UI.closeAll();
    UI.fade(1, 0); SFX.init(); SFX.resume(); SFX.setVolume(Settings.vol);
    $('objective').innerHTML = ''; if (Story.S) Story.S.objective = '';
    setTimeout(() => { try { fn(); } catch (e) { this.fatal(e); return; } G.state = 'play'; lockPointer(); setTimeout(() => UI.fade(0, 3), 200); }, 60);
  },
  part: 1,
  setPart(n) { this.part = n === 2 ? 2 : 1; try { localStorage.setItem('thtr_part', String(this.part)); } catch (e) {} $('part1').classList.toggle('on', this.part === 1); $('part2').classList.toggle('on', this.part === 2); $('partLen').textContent = this.part === 2 ? 'Part II about 35 minutes' : 'Part I about 20 minutes'; this.titleSetup(); },
  newGame(name, part) {
    part = part || this.part;
    this.begin(() => {
      Story.S = Story.newState(name, part); Story.snaps = [];
      this.buildWorld(); Story.placePlayer(Story.S.ch); G.time = 0;
      Story.startChapter(Story.S.ch);
    });
  },
  continueGame(part) {
    part = part || this.part; const sv = Store.get(part === 2 ? 'save2' : 'save'); if (!sv) return this.newGame($('nameIn').value, part);
    this.begin(() => {
      Story.S = JSON.parse(JSON.stringify(sv.cp)); Story.S.part = part; Story.S.mem = sv.mem || Story.S.mem; Story.S.playTime = sv.playTime || Story.S.playTime; Story.S.objective = '';
      this.buildWorld(); Story.setupChapter(Story.S.ch); Story.placePlayer(Story.S.ch);
      Story.startChapter(Story.S.ch, true);
    });
  },
  joinFromState(st, peer) {
    const name = Net.nameIn();
    this.begin(() => {
      const pt = st.pt === 2 ? 2 : 1; Story.S = Story.newState(name, pt); Story.snaps = []; const S = Story.S;
      S.ch = pt === 2 ? Math.min(16, Math.max(11, st.ch | 0)) : Math.min(7, Math.max(1, st.ch | 0)); S.flags = Object.assign({}, st.f || {}); S.inv = (st.inv || []).filter(i => ITEMS[i]); S.invV = st.iv || 0;
      for (const k in (st.mem || {})) if (MEMS[k]) S.mem[k] = true;
      this.buildWorld(); Story.setupChapter(S.ch); Story.placePlayer(S.ch);
      G.state = 'play'; Net.onState(st, peer);
      const pp = Net.peerPos(peer); if (pp) { P.pos.set(pp.x + .8, 0, pp.z + .5); P.lv = pp.lv; P.y = levelY(pp.lv); P.outside = P.lv === 0 && P.pos.z > 4.05; }
      Story.startChapter(S.ch, true); Net.hud();
      UI.notify('You joined the house.');
    });
  },
  restartChapter() { const pt = Story.S && Story.S.part === 2 ? 2 : 1; if (Store.get(pt === 2 ? 'save2' : 'save')) this.continueGame(pt); else this.newGame(Story.S ? Story.S.name : 'Sam', pt); },
  loopRestart() {
    const S = Story.S; S.loop = true; S.part = 1; S.ch = 1; S.flags = {}; S.inv = []; S.objective = '';
    this.buildWorld(); Story.placePlayer(1); Story.enterLoop(); UI.fade(0, 4);
  },
  quitToTitle() {
    Net.leave(); Chase.reset && W && Chase.reset();
    G.state = 'title'; UI.closeAll(); $('endScreen').classList.remove('show'); unlockPointer();
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    if (W) (W.emitters || []).forEach(e => { try { e.stop(); } catch (er) {} });
    SFX.updateAmbience(false, 1, 0, false); UI.prompt(null); $('subs').style.opacity = 0; UI.subQ = []; UI.subT = 0;
    this.titleSetup(); $('title').style.display = 'flex';
  },
  titleSetup() {
    const sv = Store.get(this.part === 2 ? 'save2' : 'save'); const b = $('btnContinue');
    if (sv && sv.cp && CHAPTERS[sv.cp.ch]) { b.style.display = 'block'; b.textContent = `Continue — ${chapLabel(sv.cp.ch)}: ${CHAPTERS[sv.cp.ch]}`; } else b.style.display = 'none';
    if (sv && sv.cp && sv.cp.name) $('nameIn').value = sv.cp.name;
    const end = Store.get('endings'); let el = $('endFound');
    if (!el) { el = document.createElement('div'); el.id = 'endFound'; el.style.cssText = 'margin-top:22px;font-family:"Special Elite",monospace;font-size:12px;color:var(--faint);letter-spacing:.1em'; $('title').querySelector('.menu').after(el); }
    el.textContent = end && Object.keys(end).length ? 'Endings found: ' + Object.keys(end).sort().join(' · ') + ' (of 6)' : '';
  },
  interact() { if (P.look && P.look.use) P.look.use(); },
  onLock() { $('lockHint').style.display = 'none'; },
  onUnlock() { if (performance.now() - (Input.selfUnlock || 0) < 900) return; if (G.state === 'play' && !UI.modalOpen()) this.pause(); },
  pause() { if (UI.modalOpen()) return; UI.open('pause'); this.pausedAt = performance.now(); $('pauseInfo').textContent = (Story.S.loop ? 'Chapter I — Arrival' : `${chapLabel(CH())} — ${CHAPTERS[CH()]}`) + (Net.active ? ' · Co-op: the house does not wait for you.' : ''); $('btnRestartCh').hidden = Net.active; },
  resume() { UI.close('pause'); },
  onKey(e) {
    const k = e.code;
    if (G.state !== 'play') { if (k === 'Escape' && UI.stack.includes('settings')) UI.close('settings'); return; }
    const top = UI.stack[UI.stack.length - 1];
    if (top) {
      if (top === 'dialogue') { if (k === 'KeyE' || k === 'Space' || k === 'Enter') UI.dadvance(); return; }
      if (top === 'reader') { if (k === 'KeyE' || k === 'Escape') UI.close('reader'); else if (k === 'ArrowRight' || k === 'KeyD') UI.page(1); else if (k === 'ArrowLeft' || k === 'KeyA') UI.page(-1); return; }
      if (top === 'inspect') { if (k === 'KeyE' || k === 'Escape') UI.close('inspect'); else if (k === 'ArrowRight' || k === 'KeyD') UI.gpage(1); else if (k === 'ArrowLeft' || k === 'KeyA') UI.gpage(-1); return; }
      if (top === 'inventory') { if (k === 'Tab' || k === 'Escape' || k === 'KeyI') UI.close('inventory'); return; }
      if (top === 'journal') { if (k === 'KeyJ' || k === 'Escape') UI.close('journal'); return; }
      if (top === 'pause') { if (k === 'Escape' && performance.now() - (this.pausedAt || 0) > 400) this.resume(); return; }
      if (top === 'settings' || top === 'puzzle') { if (k === 'Escape') UI.close(top); return; }
      return;
    }
    if (k === 'KeyE') this.interact();
    else if (k === 'KeyF') { P.flashOn = !P.flashOn; SFX.click(null, .3, P.flashOn ? 2800 : 2000); }
    else if (k === 'KeyC' || k === 'ControlLeft') P.crouch = !P.crouch;
    else if (k === 'Tab' || k === 'KeyI') UI.openInventory();
    else if (k === 'KeyJ') UI.openJournal();
    else if (k === 'Escape') this.pause();
  },
  fatal(e) { console.error(e); $('errBox').style.display = 'flex'; $('errBox').textContent = 'Something went wrong while building the house: ' + (e && e.message || e); },
  frame(now) {
    const rdt = Math.min(1, Math.max(0, (now - (this.last || now)) / 1000)); this.last = now;
    const dt = Math.min(.05, rdt);
    UI.update(rdt);
    if (!W || (G.state !== 'play' && G.state !== 'ending')) return;
    const active = G.state === 'play' && (!UI.modalOpen() || Net.active);
    if (active) {
      G.time += dt;
      updatePlayer(dt); updateFrustum(); updateDoors(dt);
      const ups = W.updaters; for (let i = ups.length - 1; i >= 0; i--) { let r; try { r = ups[i](dt); } catch (e) { console.error(e); r = false; } if (r === false) ups.splice(i, 1); }
      Story.update(dt);
      updateParticles(dt); updateInteraction();
      Net.tick(dt);
      // body: sprint fov, breathing, torch beam
      const cam = G.camera, fov = 72 + (P.sprinting ? 7 : 0) + (W.chaseProx || 0) * 5;
      if (Math.abs(cam.fov - fov) > .05) { cam.fov = lerp(cam.fov, fov, 1 - Math.exp(-dt * 5)); cam.updateProjectionMatrix(); }
      this.brT = (this.brT || 0) - dt; if (this.brT <= 0) { this.brT = .25; SFX.setBreath(clamp((1 - P.stamina) * 1.3 + (W.chaseProx || 0) * .6 + (P.dead ? 0 : 0), 0, 1)); }
      if (W.beam) { W.beam.visible = P.flashOn && !W.flashDead && W.flash.intensity > .5; W.beam.material.uniforms.op.value = P.outside ? .025 : P.lv === -1 ? .07 : .05; }
      if (!P.dead && W.fx.red > 0) W.fx.red = Math.max(0, W.fx.red - dt * .6);
    }
    updateLights(dt); SFX.listener(G.camera);
    // post-processing
    const u = G.post.uniforms; u.time.value = G.time;
    if (G.memFx > 0) G.memFx -= dt; const mf = Math.max(0, G.memFx || 0);
    const I = W.intensity || 0;
    u.grain.value = Settings.grain ? .045 + I * .012 : 0;
    const cp = W.chaseProx || 0;
    u.distort.value = Settings.grain ? (W.fx.distort + (I >= 4 ? .22 : 0) + mf * .35 + (W.blackout ? .4 : 0) + cp * .55 + (P.dead ? 1.2 : 0)) : 0;
    u.chroma.value = Settings.grain ? .3 + I * .12 : 0;
    u.desat.value = clamp(.3 + mf * .25 - (W.dawn ? .2 : 0), 0, 1);
    u.bright.value = Settings.bright * (W.dawn ? 1.15 : 1);
    u.flash.value = W.fx.flash; u.red.value = Math.min(1, W.fx.red + cp * .25); u.vignette.value = 1.2 + I * .05 + cp * .5;
    if (W.mirrors) W.mirrors.forEach(m => m.mesh.material.uniforms.time.value = G.time);
    Story.renderTV();
    const R = G.renderer; R.setRenderTarget(G.rt); R.render(W.scene, G.camera); R.setRenderTarget(null); R.render(G.postScene, G.postCam);
  },
  loop(now) {
    requestAnimationFrame(t => Game.loop(t));
    try { Game.frame(now); } catch (e) { if (Game.errCount++ < 5) console.error(e); }
  }
};

function boot() {
  if (window.__thtrBooted) return; window.__thtrBooted = true;
  const B = window.HW_BUILD;
  if (B && B.home) { const h = $('homeLink'); h.href = B.home; h.hidden = false; }
  if (B) { const pn = Net.profile().name; if (pn) $('nameIn').value = pn; $('nameIn').addEventListener('change', () => Net.saveName(Net.nameIn())); }
  try {
    buildTextures(); buildMaterials(); initRenderer(); initInput(); UI.init(); Game.titleSetup();
    try { if ('speechSynthesis' in window) speechSynthesis.getVoices(); } catch (e) {}
  } catch (e) { Game.fatal(e); return; }
  Net.init();
  $('btnNew').onclick = () => { if (Net.active) Net.leave(); const n = ($('nameIn').value || '').trim().replace(/[^\p{L}\p{N} '\-]/gu, '').slice(0, 16) || 'Sam'; Game.newGame(n); };
  $('btnContinue').onclick = () => Game.continueGame();
  $('part1').onclick = () => Game.setPart(1); $('part2').onclick = () => Game.setPart(2);
  let pp = 1; try { pp = +localStorage.getItem('thtr_part') || 1; } catch (e) {} Game.setPart(pp);
  $('nameIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('btnNew').click(); });
  requestAnimationFrame(t => Game.loop(t));
  window.__thtr = { G, P, Story, get W() { return W; }, Game, UI, SFX, Ent, setDiningOffset, setHallLength };
}

