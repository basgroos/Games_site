// ================= ENGINE: renderer, player, collision, lights, interaction, HUD =================
const V3 = THREE.Vector3;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

// Staging builds of the Bas Games site keep their own save
const SAVE_KEY = (window.HW_BUILD && window.HW_BUILD.env === 'staging') ? 'hs_ckpt_staging' : 'hs_ckpt';
// Co-op hooks (replaced by 11-net.js when playing together)
let VIEW_ID = '';           // which player's eyes the story checks are looking through ('' = this computer)
function netFx(e){}         // send a world event to the other players
function useInter(h){ h.use(); }
function everyone(pred){ return pred(player.pos, player.level); }   // true when every player matches (co-op adds the others)
const G = { state: 'menu', time: 0, flags: {}, inv: [], step: '', checkpoint: 'start', power: true, sens: 1, noLock: false, chapter: 0 };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060a);
scene.fog = new THREE.FogExp2(0x06080d, 0.05);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 160);
camera.rotation.order = 'YXZ';
scene.add(camera);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const hemi = new THREE.HemisphereLight(0x6a7ea6, 0x0c0d12, 0.16); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x6f86c4, 0.22); moon.position.set(-30, 50, -20); scene.add(moon);
const flash = new THREE.SpotLight(0xfff0d6, 0, 22, 0.42, 0.5, 1.4);
flash.castShadow = true; flash.shadow.mapSize.set(512, 512); flash.shadow.camera.near = 0.2; flash.shadow.camera.far = 22; flash.shadow.bias = -0.0015;
camera.add(flash); flash.position.set(0.18, -0.15, 0.05); flash.target.position.set(0.05, -0.1, -6); camera.add(flash.target);

// ---------- Light fixture pool (constant number of real lights, assigned to nearest fixtures) ----------
const POOL = 11; const pool = [];
for (let i = 0; i < POOL; i++){ const l = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(l); pool.push(l); }
const fixtures = [];
function addFixture(x, y, z, color, intensity, dist = 8, o = {}){
  const f = { pos: new V3(x, y, z), color: new THREE.Color(color), base: intensity, dist, on: o.on !== false, def: o.on !== false,
    group: o.group || 'house', flicker: 0, mul: 1, broken: false, bulb: o.bulb || null, unstable: o.unstable || 0, room: o.room || '', mulT: 0, alt: o.alt || 0 };
  fixtures.push(f); return f;
}
function fixtureEff(f){
  if (!f.on || f.broken) return 0;
  if (f.group === 'house' && !G.power) return 0;
  if (f.group === 'neighbor' && !G.npower) return 0;
  return f.base * f.mul;
}
function updateLights(dt){
  const cp = camera.position;
  for (const f of fixtures){
    if (f.flicker > 0){ f.flicker -= dt; f.mulT -= dt; if (f.mulT <= 0){ f.mul = Math.random() < 0.45 ? 0 : 0.25 + Math.random() * 0.9; f.mulT = rnd(0.03, 0.12); } if (f.flicker <= 0) f.mul = 1; }
    else if (f.unstable){ f.mulT -= dt; if (f.mulT <= 0){ f.mul = Math.random() < f.unstable ? rnd(0, 0.4) : rnd(0.85, 1); f.mulT = rnd(0.05, 0.5); } }
    else if (f.alt){ f.mul = (Math.sin(G.time * 9 + f.alt) > 0) ? 1 : 0; }
    else f.mul = 1;
    f.eff = fixtureEff(f);
    if (f.bulb){ const m = f.bulb.material; m.emissiveIntensity = f.eff > 0.01 ? 1.2 * Math.min(1.5, f.eff / f.base + 0.1) : 0.0; }
    const lvlPen = Math.abs(f.pos.y - cp.y) > 2.4 ? 9 : 0;
    f.score = f.pos.distanceTo(cp) + lvlPen;
  }
  const act = fixtures.filter(f => f.eff > 0.01).sort((a, b) => a.score - b.score);
  for (let i = 0; i < POOL; i++){
    const l = pool[i], f = act[i];
    if (f){ l.position.copy(f.pos); l.color.copy(f.color); l.intensity = f.eff; l.distance = f.dist; }
    else l.intensity = 0;
  }
}
function flickerGroup(pred, dur){ fixtures.forEach(f => { if (pred(f)) { f.flicker = dur; f.mulT = 0; } }); }

// ---------- Colliders ----------
const colliders = [];
function addCollider(minX, maxX, minZ, maxZ, level = 0, o = {}){
  const c = { minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), level, on: o.on !== false, tag: o.tag || '' };
  colliders.push(c); return c;
}
function colliderFromObject(obj, level = 0, pad = 0, o = {}){
  obj.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(obj);
  return addCollider(b.min.x - pad, b.max.x + pad, b.min.z - pad, b.max.z + pad, level, o);
}
function collide(pos, r, level){
  for (let it = 0; it < 3; it++){
    for (const c of colliders){
      if (!c.on || (c.level !== -1 && c.level !== level)) continue;
      if (pos.x < c.minX - r || pos.x > c.maxX + r || pos.z < c.minZ - r || pos.z > c.maxZ + r) continue;
      const cx = clamp(pos.x, c.minX, c.maxX), cz = clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9){ const d = Math.sqrt(d2); pos.x += dx / d * (r - d); pos.z += dz / d * (r - d); }
      else { const l = pos.x - c.minX, rr = c.maxX - pos.x, t = pos.z - c.minZ, b = c.maxZ - pos.z; const m = Math.min(l, rr, t, b);
        if (m === l) pos.x = c.minX - r; else if (m === rr) pos.x = c.maxX + r; else if (m === t) pos.z = c.minZ - r; else pos.z = c.maxZ + r; }
    }
  }
}
// ---------- Stairs / floors ----------
const stairs = []; // {minX,maxX,minZ,maxZ,y0,y1} rising along +z
function floorAt(x, z, level){
  for (const s of stairs){ if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ){ const t = (z - s.minZ) / (s.maxZ - s.minZ); return { y: s.y0 + t * (s.y1 - s.y0), stair: true }; } }
  return { y: level * 3, stair: false };
}
const houseRects = [{ minX: 0, maxX: 16, minZ: 0, maxZ: 12, name: 'house' }, { minX: 0, maxX: 16, minZ: -34, maxZ: -24, name: 'neighbor' }];
function inHouseRect(x, z){ for (const r of houseRects) if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) return r.name; return null; }

// ---------- Player ----------
const player = { pos: new V3(8, 0, -13), feetY: 0, level: 0, yaw: Math.PI, pitch: 0, vel: new V3(), stamina: 100, exhausted: false, regenDelay: 0,
  battery: 100, hasFlash: false, flashOn: false, height: 1.62, r: 0.3, frozen: false, stumble: 0, shake: 0, bobT: 0, lastBob: 0, trail: [], lookTarget: null, lookSpeed: 4, speedMul: 1, roll: 0 };
const keys = {};
let mouseDown = false;
const STEP_INTERVAL = Math.PI;

function surfaceAt(x, z, level){
  const h = inHouseRect(x, z);
  if (h === 'house'){
    if (level === 0 && ((x > 6 && z > 6) || (x < 6 && z > 8))) return 'tile';
    if (level === 1 && x < 6 && z < 7) return 'carpet';
    return 'wood';
  }
  if (h === 'neighbor'){ if (x > 10 || (x < 8 && z < -30)) return 'tile'; return 'wood'; }
  if ((z > -22 && z < -8) || (z < -46 && z > -55) || (x > 7.3 && x < 8.7 && z > -8 && z < 0.2) || (x > 3.4 && x < 4.6 && z < -22 && z > -24.1) || (x > 6 && x < 10 && z > -1.6 && z < 0.1)) return 'concrete';
  return 'grass';
}

function lookAtPoint(p, speed = 5){ player.lookTarget = p.clone(); player.lookSpeed = speed; }

function updatePlayer(dt){
  const p = player; const canMove = G.state === 'playing' && !p.frozen;
  let ix = 0, iz = 0;
  if (canMove){
    if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1;
    if (keys.KeyA) ix -= 1; if (keys.KeyD) ix += 1;
    if (keys.ArrowLeft) p.yaw += 2.2 * dt; if (keys.ArrowRight) p.yaw -= 2.2 * dt;
  }
  // sitting: look around freely; any movement key gets you up
  if (p.seated){ if (canMove && (ix !== 0 || iz !== 0)) standUp(); else { ix = 0; iz = 0; } }
  const moving = (ix !== 0 || iz !== 0);
  const wantSprint = (keys.ShiftLeft || keys.ShiftRight) && moving && iz < 0.5;
  const sprinting = wantSprint && !p.exhausted && p.stamina > 0;
  if (sprinting){ p.stamina -= 15 * dt; p.regenDelay = 0.8; if (p.stamina <= 0){ p.stamina = 0; p.exhausted = true; SND.pant(0.35); } }
  else { p.regenDelay -= dt; if (p.regenDelay <= 0) p.stamina = Math.min(100, p.stamina + (moving ? 11 : 20) * dt); if (p.exhausted && p.stamina > 35) p.exhausted = false; }
  if (p.exhausted && Math.random() < dt * 0.8) SND.pant(0.18);
  let speed = (sprinting ? 5.7 : 3.0) * p.speedMul;
  if (p.stumble > 0){ p.stumble -= dt; speed *= 0.3; }
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let wx = 0, wz = 0;
  if (moving){ const fx = -sy, fz = -cy, rx = cy, rz = -sy; wx = fx * (-iz) + rx * ix; wz = fz * (-iz) + rz * ix; const l = Math.hypot(wx, wz); wx = wx / l * speed; wz = wz / l * speed; }
  const a = Math.min(1, dt * 11);
  p.vel.x += (wx - p.vel.x) * a; p.vel.z += (wz - p.vel.z) * a;
  if (p.seated) p.vel.set(0, 0, 0);
  const np = p.pos.clone(); np.x += p.vel.x * dt; np.z += p.vel.z * dt;
  // level & floor
  let fl = floorAt(np.x, np.z, p.level);
  if (fl.stair) p.level = fl.y > 1.5 ? 1 : 0; else fl = floorAt(np.x, np.z, p.level);
  if (!p.seated) collide(np, p.r, p.level);
  fl = floorAt(np.x, np.z, p.level);
  if (fl.stair) p.level = fl.y > 1.5 ? 1 : 0;
  p.pos.copy(np);
  p.feetY += (fl.y - p.feetY) * Math.min(1, dt * 14);
  p.pos.y = p.feetY;
  // clutter stumble
  if (sprinting && G.clutter){ for (const c of G.clutter){ if (!c.hit && c.level === p.level && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r){ c.hit = true; p.stumble = 0.65; p.shake = Math.max(p.shake, 0.5); SND.thud(p.pos, 0.8); SND.scrape(p.pos, 0.3); subtitle('You trip on something in the dark.', 1.8, 'thought'); } } }
  // trail for the monster
  const last = p.trail[p.trail.length - 1];
  if (!last || Math.hypot(last.x - p.pos.x, last.z - p.pos.z) > 0.45) { p.trail.push({ x: p.pos.x, z: p.pos.z, level: p.level }); if (p.trail.length > 400) p.trail.shift(); }
  // view
  if (p.lookTarget){
    const d = p.lookTarget.clone().sub(camera.position); const ty = Math.atan2(-d.x, -d.z); const tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
    let dy = ty - p.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    p.yaw += dy * Math.min(1, dt * p.lookSpeed); p.pitch += (tp - p.pitch) * Math.min(1, dt * p.lookSpeed);
    if (Math.abs(dy) < 0.02) p.lookTarget = null;
  }
  // bob & footsteps
  const hs = Math.hypot(p.vel.x, p.vel.z);
  if (hs > 0.4){ p.bobT += dt * hs * 2.1; if (Math.floor(p.bobT / STEP_INTERVAL) !== Math.floor(p.lastBob / STEP_INTERVAL)) SND.step(surfaceAt(p.pos.x, p.pos.z, p.level), new V3(p.pos.x, p.feetY + 0.05, p.pos.z), sprinting ? 0.45 : 0.28); p.lastBob = p.bobT; }
  const bob = Math.sin(p.bobT) * (sprinting ? 0.055 : 0.032) * Math.min(1, hs / 3);
  p.shake = Math.max(0, p.shake - dt * 0.9);
  const sh = p.shake * p.shake;
  camera.position.set(p.pos.x + (Math.random() - 0.5) * sh * 0.06, p.feetY + (p.seated ? 1.12 : p.height) + bob + (p.stumble > 0 ? -0.18 : 0), p.pos.z + (Math.random() - 0.5) * sh * 0.06);
  p.pitch = clamp(p.pitch, -1.45, 1.45);
  p.roll += ((p.stumble > 0 ? 0.08 : 0) - p.roll) * Math.min(1, dt * 6);
  camera.rotation.set(p.pitch + (Math.random() - 0.5) * sh * 0.03, p.yaw + (Math.random() - 0.5) * sh * 0.03, p.roll);
  // flashlight
  if (p.flashOn){ p.battery = Math.max(0, p.battery - dt * 0.9); if (p.battery <= 0){ p.flashOn = false; subtitle('The flashlight died.', 2, 'thought'); SND.click(); } }
  let fi = p.flashOn ? 2.4 : 0; if (p.flashOn && p.battery < 15 && Math.random() < 0.08) fi *= 0.2;
  flash.intensity = fi;
}
function sitDown(seat){ const p = player; p.seated = seat; p.pos.set(seat.x, 0, seat.z); p.feetY = 0; p.level = 0; p.yaw = seat.yaw; p.pitch = -0.08; p.vel.set(0, 0, 0); p.lookTarget = null; SND.rustle(p.pos, 0.3); }
function standUp(){ const p = player, s = p.seated; if (!s) return; p.seated = null; p.pos.x -= Math.sin(s.yaw) * 0.6; p.pos.z -= Math.cos(s.yaw) * 0.6; }
function setPlayer(x, y, z, yaw, pitch = 0){ player.seated = null; player.pos.set(x, y, z); player.feetY = y; player.level = y > 1.5 ? 1 : 0; player.yaw = yaw; player.pitch = pitch; player.vel.set(0, 0, 0); player.trail = []; player.lookTarget = null; player.stumble = 0; player.roll = 0; }

// ---------- Visibility test ----------
const occluders = [];
const _ray = new THREE.Raycaster(); const _v = new V3(), _f = new V3();
function inView(pos, deg = 30, maxDist = 40, occl = true){
  _v.copy(pos).sub(camera.position); const d = _v.length(); if (d > maxDist) return false;
  camera.getWorldDirection(_f); if (_f.angleTo(_v) * 57.3 > deg) return false;
  if (occl){ _ray.set(camera.position, _v.clone().normalize()); _ray.far = Math.max(0.01, d - 0.35); _ray.near = 0; if (_ray.intersectObjects(occluders, false).length) return false; }
  return true;
}
function dist2(a, x, z){ return Math.hypot(a.x - x, a.z - z); }

// ---------- Interaction ----------
const inters = [];
let hover = null;
function addInter(obj, text, use, enabled, range = 2.4){ const e = { obj, text, use, enabled: enabled || (() => true), range }; obj.traverse(o => { o.userData.inter = e; }); inters.push(e); return e; }
const _iray = new THREE.Raycaster(); let rayTargets = [];
function refreshRayTargets(){ rayTargets = []; scene.traverse(o => { if (o.isMesh && (o.userData.inter || o.userData.occ)) rayTargets.push(o); }); }
function visibleChain(o){ while (o){ if (!o.visible && !o.userData.hitbox) return false; o = o.parent; } return true; }
function updateInteract(){
  hover = null;
  if (G.state === 'playing' && !player.frozen){
    _iray.setFromCamera({ x: 0, y: 0 }, camera); _iray.far = 2.6;
    const hits = _iray.intersectObjects(rayTargets, false);
    for (const h of hits){
      if (!visibleChain(h.object)) continue;
      const e = h.object.userData.inter;
      if (e && h.distance <= e.range && e.enabled()) hover = e;
      break;
    }
  }
  const t = hover ? (typeof hover.text === 'function' ? hover.text() : hover.text) : '';
  const pr = $('prompt');
  if (t){ pr.innerHTML = '<kbd>E</kbd>' + t; pr.classList.add('on'); $('cross').classList.add('on'); }
  else { pr.classList.remove('on'); $('cross').classList.remove('on'); }
}

// ---------- Timers (game time) ----------
let timers = [];
function after(s, fn){ const t = { t: G.time + s, fn }; timers.push(t); return t; }
function cancel(t){ timers = timers.filter(x => x !== t); }
function updateTimers(){ const due = timers.filter(t => t.t <= G.time); if (!due.length) return; timers = timers.filter(t => t.t > G.time); due.sort((a, b) => a.t - b.t).forEach(t => t.fn()); }

// ---------- HUD ----------
function setObjectives(list){ G.objectives = list; renderObjectives(); }
function objective(text, cls = ''){ setObjectives([{ text, cls }]); flashObj(); }
function renderObjectives(){ const ul = $('objList'); ul.innerHTML = ''; (G.objectives || []).forEach(o => { const li = document.createElement('li'); li.textContent = o.text; if (o.done) li.className = 'done'; else if (o.cls) li.className = o.cls; ul.appendChild(li); }); }
function flashObj(){ $('objList').querySelectorAll('li').forEach(li => { li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); }); }
function markObj(key){ (G.objectives || []).forEach(o => { if (o.key === key) o.done = true; }); renderObjectives(); }
let subTimer = null;
function subtitle(text, dur = 4, cls = '', who = ''){
  const s = $('sub'); s.className = cls; s.innerHTML = (who ? '<span class="who">' + who + '</span>' : '') + text; s.classList.add('on');
  if (subTimer) cancel(subTimer); subTimer = after(dur, () => { s.classList.remove('on'); subTimer = null; });
}
function say(who, text, dur = 4){ subtitle(text, dur, '', who); }
function think(text, dur = 3.5){ subtitle(text, dur, 'thought'); }
function scare(text, dur = 2.5){ subtitle(text, dur, 'scare'); }
function addItem(name){ if (!G.inv.includes(name)) G.inv.push(name); renderInv(); SND.pickup(); }
function removeItem(name){ G.inv = G.inv.filter(n => n !== name); renderInv(); }
function hasItem(name){ return G.inv.includes(name); }
function renderInv(){ $('invList').innerHTML = G.inv.map(n => '<div>' + n + '</div>').join('') || '<div style="color:#4b5058">nothing</div>'; }
function fade(to, dur = 1){ const f = $('fade'); f.style.transition = 'opacity ' + dur + 's'; f.style.opacity = to; }
function flashFx(color = '#fff', dur = 0.5, peak = 0.9){ const f = $('flashfx'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = peak; void f.offsetWidth; f.style.transition = 'opacity ' + dur + 's'; f.style.opacity = 0; }
let noteCb = null;
function showNote(text, cls = '', cb = null){
  $('noteBody').textContent = text; $('paper').className = 'paper ' + cls; $('note').hidden = false; noteCb = cb; G.prevState = G.state; G.state = 'note'; SND.rustle(null, 0.3);
}
function closeNote(){ if ($('note').hidden) return; $('note').hidden = true; G.state = 'playing'; const cb = noteCb; noteCb = null; if (cb) cb(); }
// Cinematic text sequences (black screen)
let cineData = null;
function cine(lines, done){
  cineData = { lines, i: -1, done, timer: null }; $('cine').hidden = false; $('hud').hidden = true; G.state = 'cine'; nextCine();
}
function nextCine(){
  const c = cineData; if (!c) return; if (c.timer) cancel(c.timer);
  c.i++; const el = $('cineText');
  if (c.i >= c.lines.length){ el.classList.remove('on'); cineData = null; after(0.6, () => { $('cine').hidden = true; $('hud').hidden = false; G.state = 'playing'; c.done && c.done(); }); return; }
  const L = c.lines[c.i];
  el.classList.remove('on');
  after(0.35, () => { if (cineData !== c) return; el.className = L.cls || ''; el.innerHTML = (L.who ? '<span class="who">' + L.who + '</span>' : '') + L.t; void el.offsetWidth; el.classList.add('on'); if (L.fx) L.fx(); });
  c.timer = after((L.d || 4) + 0.35, nextCine);
}

// ---------- Input ----------
function isLocked(){ return document.pointerLockElement === canvas; }
// Pointer lock can be refused for a moment (e.g. right after Esc). Only fall back to click-and-drag looking after it fails a few times.
function lockFailed(){ G.lockFails = (G.lockFails || 0) + 1; if (G.lockFails >= 3){ G.noLock = true; $('lockhint').hidden = true; } }
function requestLock(){ if (G.noLock) return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(lockFailed); } catch (e) { G.noLock = true; } }
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE'){
    if (G.state === 'note'){ closeNote(); return; }
    if (G.state === 'cine'){ nextCine(); return; }
    if (G.state === 'playing' && hover && !player.frozen){ useInter(hover); }
  }
  if (e.code === 'KeyF' && G.state === 'playing'){
    if (!player.hasFlash){ if (!G.power) think("You don't have a flashlight.", 2); return; }
    if (player.battery <= 0){ think('Dead batteries.', 2); return; }
    player.flashOn = !player.flashOn; SND.click(camera.position);
  }
  if (e.code === 'Escape' || e.code === 'KeyP'){
    if (G.state === 'note'){ closeNote(); return; }
    if (G.state === 'playing' && (G.noLock || !isLocked())) pauseGame();
    else if (G.state === 'paused') resumeGame();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousedown', () => { mouseDown = true; if ((G.state === 'playing' || G.state === 'cine') && !isLocked()) requestLock(); if (G.state === 'note') closeNote(); });
addEventListener('mouseup', () => { mouseDown = false; });
$('note').addEventListener('click', () => closeNote());
$('cine').addEventListener('click', () => { if (G.state === 'cine') nextCine(); });
document.addEventListener('mousemove', e => {
  if (G.state !== 'playing' || player.frozen) return;
  if (!(isLocked() || (G.noLock && mouseDown))) return;
  const s = 0.0022 * G.sens;
  player.yaw -= e.movementX * s; player.pitch -= e.movementY * s; player.lookTarget = null;
});
document.addEventListener('pointerlockchange', () => {
  $('lockhint').hidden = true;
  if (!isLocked() && G.state === 'playing' && !G.ignoreUnlock) pauseGame();
  G.ignoreUnlock = false;
});
document.addEventListener('pointerlockerror', lockFailed);
