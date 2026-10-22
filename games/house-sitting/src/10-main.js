// ================= MAIN: rain, environment, menus, loop =================
// ---- rain ----
const RAIN_N = 1500; let rainGeo, rainMesh;
function spawnDrop(i, top){
  const a = rainGeo.attributes.position.array; const c = camera.position; let x = 0, z = 0;
  for (let k = 0; k < 6; k++){ x = c.x + rnd(-18, 18); z = c.z + rnd(-18, 18); if (!inHouseRect(x, z)) break; }
  const y = top ? c.y + rnd(5, 11) : c.y + rnd(-2, 11);
  a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x + 0.03; a[i * 6 + 4] = y - 0.42; a[i * 6 + 5] = z + 0.015;
}
function initRain(){
  rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_N * 6), 3));
  rainMesh = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9aa8bc, transparent: true, opacity: 0.32, depthWrite: false }));
  rainMesh.frustumCulled = false; scene.add(rainMesh);
  for (let i = 0; i < RAIN_N; i++) spawnDrop(i, false);
}
function updateRain(dt){
  const a = rainGeo.attributes.position.array, c = camera.position, v = 15 * dt;
  for (let i = 0; i < RAIN_N; i++){
    a[i * 6 + 1] -= v; a[i * 6 + 4] -= v;
    if (a[i * 6 + 4] < -0.05 || Math.abs(a[i * 6] - c.x) > 19 || Math.abs(a[i * 6 + 2] - c.z) > 19) spawnDrop(i, a[i * 6 + 4] < 0);
  }
  rainGeo.attributes.position.needsUpdate = true;
  rainMesh.material.opacity = 0.12 + AMB.rain * 0.35; rainMesh.visible = G.state !== 'ending';
}
// ---- environment (indoor/outdoor lighting, fog, ambience) ----
let indoorK = 0;
function envUpdate(dt){
  const c = camera.position; const ind = (G.state !== 'menu' && inHouseRect(c.x, c.z)) ? 1 : 0;
  indoorK += (ind - indoorK) * Math.min(1, dt * 2.5);
  scene.fog.density = lerp(0.045, 0.022, indoorK);
  moon.intensity = lerp(0.24, 0.03, indoorK); hemi.intensity = lerp(0.17, 0.055, indoorK);
  ambUpdate(indoorK, dt);
  if (AU.ready && !S.hum) S.hum = LOOPS.hum(new V3(11, 2.8, 9));
  if (S.hum) S.hum.setVol(FX.kitchen.eff > 0.01 && G.state !== 'menu' ? 0.07 : 0, 0.05);
}
function hudUpdate(){
  $('stam').style.width = player.stamina.toFixed(0) + '%'; $('stamWrap').classList.toggle('low', player.exhausted);
  $('bat').style.width = player.battery.toFixed(0) + '%'; $('batWrap').classList.toggle('low', player.battery < 20);
  $('lockhint').hidden = !(G.state === 'playing' && !G.noLock && !isLocked());
}
function storyUpdate(dt){ storyUpdateA(dt); storyUpdateB(dt); storyUpdateC(dt); }

// ---- screens ----
function hideScreens(){ ['menu', 'mp', 'pause', 'dead', 'ending'].forEach(id => $(id).hidden = true); $('note').hidden = true; $('cine').hidden = true; cineData = null; }
function refreshContinue(){ const s = savedCheckpoint(); const b = $('bCont'); b.disabled = !s || s === 'start'; b.textContent = s && s !== 'start' ? 'Continue (' + ({ night: 'the noise', chase1: 'the open room', police: 'the police', neighbor: 'across the street', chase2: 'the final escape' }[s] || s) + ')' : 'Continue from checkpoint'; }
function toMenu(){
  if (MP.status !== 'idle') MP.leave();
  hideScreens(); resetWorld(); G.state = 'menu'; $('menu').hidden = false; $('hud').hidden = true; fade(0, 0.3);
  ['end1', 'end2', 'end3', 'end4'].forEach(id => $(id).classList.remove('on'));
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); AMB.master = 1; refreshContinue();
  G.ignoreUnlock = true; if (isLocked()) document.exitPointerLock(); else G.ignoreUnlock = false;
}
function loadCheckpoint(name){
  hideScreens(); $('hud').hidden = false; fade(0, 0.2); G.state = 'playing';
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
  ({ night: loadNight, chase1: loadChase1, police: loadPolice, neighbor: loadNeighbor, chase2: loadChase2 }[name] || startCh1)();
  requestLock();
}
function pauseGame(){
  if (G.state !== 'playing') return; G.state = 'paused'; $('pause').hidden = false; for (const k in keys) keys[k] = false;
  // together, the world keeps going while you look at the pause menu
  $('bRetry').hidden = MP.guest; $('pauseNote').hidden = !MP.started;
  if (AU.ctx && !MP.started) AU.ctx.suspend();
  if (isLocked()){ G.ignoreUnlock = true; document.exitPointerLock(); }
}
function resumeGame(){ $('pause').hidden = true; if (G.state === 'paused') G.state = 'playing'; if (AU.ctx) AU.ctx.resume(); requestLock(); }
const TIPS = ['Close doors behind you. It has to break them down.', 'Save your stamina for the straightaways. Exhausted, you are slow.', 'It speeds up in bursts. Keep moving, never stop to look back for long.', 'Sprinting into clutter in the dark will trip you.', 'It follows the exact path you took. Corners buy you time.'];
// who: null = you were caught; otherwise the id of the player who was caught (co-op)
function gameOver(who){
  if (!(G.state === 'playing' || (MP.started && (G.state === 'paused' || G.state === 'note' || G.state === 'cine')))) return;
  $('pause').hidden = true; $('note').hidden = true; G.state = 'dead';
  const name = who && who !== MP.me().id ? MP.nameOf(who) : '';
  $('deadTitle').textContent = name ? 'IT FOUND ' + name.toUpperCase() : 'IT FOUND YOU'; stopChaseMusic(); for (const k in keys) keys[k] = false;
  const f = new V3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
  MON.mode = 'off'; const r = MON.m.root; r.visible = true; r.position.set(camera.position.x + f.x * 0.8, camera.position.y - 2.45, camera.position.z + f.z * 0.8); r.rotation.y = Math.atan2(-f.x, -f.z); MON.m.P.head.rotation.set(0, 0, 0.45);
  flash.intensity = 3; SND.scream(new V3(r.position.x, camera.position.y, r.position.z), false); SND.sting(0.32); SND.bang(null, false); player.shake = 2;
  flashFx('#5a0000', 1.0, 0.55);
  G.ignoreUnlock = true; if (isLocked()) document.exitPointerLock(); else G.ignoreUnlock = false;
  setTimeout(() => { if (G.state !== 'dead') return; fade(0.85, 0.4); $('hud').hidden = true;
    $('deadTip').textContent = MP.started ? (MP.guest ? 'Together, you all start over from the checkpoint. Waiting for the host...' : 'Together, you all start over from the checkpoint.') : TIPS[(Math.random() * TIPS.length) | 0];
    $('bDeadRetry').hidden = MP.guest; $('dead').hidden = false; }, 950);
}
function restartCheckpoint(){ loadCheckpoint(G.checkpoint); }
$('bNew').onclick = () => { audioInit(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} loadCheckpoint('start'); };
$('bCont').onclick = () => { audioInit(); loadCheckpoint(savedCheckpoint() || 'start'); };
$('bResume').onclick = resumeGame;
$('bRetry').onclick = () => { audioInit(); restartCheckpoint(); };
$('bQuit').onclick = toMenu;
$('bDeadRetry').onclick = () => { audioInit(); restartCheckpoint(); };
$('bDeadQuit').onclick = toMenu;
$('bEndMenu').onclick = () => { $('ending').hidden = true; fade(0, 0.5); toMenu(); };
$('sens').oninput = e => { G.sens = parseFloat(e.target.value); try { localStorage.setItem(SAVE_KEY + '_sens', G.sens); } catch (er) {} };
$('vol').oninput = e => { setMasterVol(parseFloat(e.target.value)); try { localStorage.setItem(SAVE_KEY + '_vol', e.target.value); } catch (er) {} };
try { const s = localStorage.getItem(SAVE_KEY + '_sens'); if (s){ G.sens = parseFloat(s); $('sens').value = s; } const v = localStorage.getItem(SAVE_KEY + '_vol'); if (v){ AU.vol = parseFloat(v); $('vol').value = v; } } catch (e) {}


// ---- merge static meshes by material to cut draw calls ----
function markDyn(v){ if (!v) return; if (v.isObject3D){ v.userData.dyn = true; return; } if (Array.isArray(v)) { v.forEach(markDyn); return; } if (typeof v === 'object'){ if (v.g) markDyn(v.g); if (v.lid) markDyn(v.lid); } }
function mergeStatic(){
  Object.values(PROPS).forEach(markDyn); doors.forEach(d => markDyn(d.pivot)); fixtures.forEach(f => markDyn(f.bulb));
  [MON.m.root, GHOST.root, OFF1.root, OFF2.root, NEIGH.root, beam1, beam2, TORCH1, TORCH2, rainMesh].forEach(markDyn); BATT.forEach(b => markDyn(b.g));
  scene.updateMatrixWorld(true);
  const buckets = new Map(), victims = [];
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.transparent || !o.material.isMeshStandardMaterial) return;
    for (let a = o; a; a = a.parent){ const u = a.userData; if (u.dyn || u.inter || u.occ || u.hitbox || !a.visible) return; }
    victims.push(o); if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(o);
  });
  buckets.forEach((list, mat) => {
    if (list.length < 2) return;
    const parts = []; let n = 0, cast = false;
    list.forEach(m => { let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld); parts.push(g); n += g.attributes.position.count; cast = cast || m.castShadow; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    parts.forEach(g => { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, mat); mm.castShadow = cast; mm.receiveShadow = true; mm.matrixAutoUpdate = false; scene.add(mm);
    list.forEach(m => m.parent.remove(m));
  });
}

// ---- boot ----
let lastT = performance.now(); G.dt = 0;
function boot(){
  buildHouse(); buildStreet(); buildNeighbor(); monInit(); storyInit(); initRain(); mergeStatic(); refreshRayTargets(); renderInv();
  resetWorld(); setHouseLights(['hall', 'porch']); FX.livLamp.on = true; refreshContinue();
  const home = window.HW_BUILD && window.HW_BUILD.home; if (home){ const a = $('bHome'); a.href = home; a.hidden = false; }
  netInit();
  lastT = performance.now(); requestAnimationFrame(tick);
}
function tick(now){
  requestAnimationFrame(tick);
  let dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now; G.dt = dt;
  if (G.state === 'menu'){
    const t = now / 1000; camera.position.set(-1.5 + Math.sin(t * 0.07) * 1.2, 1.7 + Math.sin(t * 0.13) * 0.08, -17.5); camera.lookAt(9 + Math.sin(t * 0.05) * 1.5, 2.6, 2); flash.intensity = 0;
  } else if (G.state === 'playing' || G.state === 'cine' || G.state === 'note' || (MP.started && G.state === 'paused')){
    G.time += dt; updateTimers(); updateAnims(dt); updatePlayer(dt);
    if (MP.guest) MP.guestWorld(dt); else { storyUpdate(dt); monUpdate(dt); }
  }
  MP.update(dt);
  updateInteract(); updateDoors(dt); updateLights(dt); updateRain(dt); envUpdate(dt); audioUpdate(dt); audioListener(camera); hudUpdate();
  renderer.render(scene, camera);
}
