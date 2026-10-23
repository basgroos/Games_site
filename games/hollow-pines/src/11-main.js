/* Hollow Pines — game shell: loop, input, cameras, HUD, menus. */
(function () {
  'use strict';
  const HG = window.HG;
  const { clamp, lerp } = HG.util;
  const $ = (id) => document.getElementById(id);

  // ---------- settings ----------
  const DEFAULTS = { volMaster: 0.85, volSfx: 1, volAmb: 0.8, volVoice: 0.9, headphones: true, speech: false, quality: 'medium', fov: 74, brightness: 1, grain: true, fearMeter: false, bob: true, sens: 1, invert: false, mode: 'survivor', difficulty: 'normal', length: 'normal', weather: 'fog' };
  let settings = Object.assign({}, DEFAULTS);
  try { const s = JSON.parse(localStorage.getItem('hollow-pines-settings') || '{}'); Object.assign(settings, s); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem('hollow-pines-settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } };
  if (!['low', 'medium', 'high'].includes(settings.quality)) settings.quality = 'medium';

  // ---------- state ----------
  const canvas = $('view');
  let world, R, audio, sim = null;
  let state = 'loading'; // loading | splash | menu | playing | paused | dead | results
  let attract = null;
  const cam = { yaw: Math.PI, pitch: 0, bob: 0, bobAmp: 0, y: null, sway: { x: 0, y: 0 }, shake: 0, scream: 0, death: 0, roll: 0, flashOn: true };
  const keys = {};
  const pressed = {};
  let pointerLocked = false, dragLook = false;
  let spectateIdx = 0, deathT = 0;
  let puzzle = null, puzzleCool = 0;
  // online play (only on the Bas Games site, where HW_BUILD carries the Supabase settings)
  const BUILD = window.HW_BUILD || null;
  let net = null, online = false;

  // ---------- boot ----------
  function setLoad(msg) { $('loadMsg').textContent = msg; }
  function boot() {
    if (!window.THREE) { setLoad('Could not load the 3D engine. Check your connection and reload.'); return; }
    setLoad('Laying out the property');
    setTimeout(() => {
      world = new HG.World(); world.build(); world.initNav(); world.computeComponents();
      setLoad('Painting textures');
      setTimeout(() => {
        try {
          R = new HG.Renderer(canvas, world, settings, setLoad);
        } catch (err) {
          console.error(err);
          setLoad('WebGL is not available in this browser. Hollow Pines needs a WebGL-capable browser.');
          return;
        }
        audio = new HG.Audio(settings);
        startAttract();
        state = 'splash';
        setLoad('');
        $('enterBtn').hidden = false;
        $('enterBtn').focus();
        requestAnimationFrame(frame);
      }, 30);
    }, 30);
  }

  // menu background: the woods, with AI survivors and the creature already at it
  function startAttract() {
    attract = new HG.Sim(world, { mode: 'survivor', difficulty: 'normal', length: 'long', seed: (Math.random() * 1e9) | 0, allBots: true, weather: settings.weather });
    sim = attract;
    R.bindSim(sim);
  }

  // ---------- menu wiring ----------
  const segSyncs = [];
  function segment(id, key, onChange) {
    const el = $(id);
    const sync = () => { for (const b of el.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === settings[key])); };
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; settings[key] = b.dataset.v; save(); for (const f of segSyncs) f(); onChange && onChange(); });
    segSyncs.push(sync);
    sync();
  }
  const KEYS_S = [['W A S D', 'Move'], ['Mouse', 'Look'], ['Shift', 'Sprint (stamina)'], ['C / Ctrl', 'Crouch'], ['F', 'Flashlight on / off'], ['E (hold)', 'Search, use, repair, hide'], ['R', 'Swap batteries'], ['Q', 'Use first-aid kit'], ['E / Space (mash)', 'Break free when grabbed'], ['G', 'Tell nearest teammate to follow / split up'], ['Z', 'Call everyone back to the house'], ['Tab', 'Field notebook'], ['Esc', 'Pause']];
  const KEYS_M = [['W A S D', 'Move'], ['Mouse', 'Look'], ['Left click', 'Swipe'], ['Right click', 'Pounce (leap 3–8 m)'], ['X', 'Grab and drag'], ['Shift', 'Run (drains stamina)'], ['Q', 'Dash'], ['C', 'Crawl (under logs, through broken windows)'], ['E', 'Ghost (through sigil barriers)'], ['V', 'Stalk (silent, slow)'], ['R', 'Scream'], ['F', 'Darkness'], ['Space', 'Open door / check a hiding place'], ['Tab', 'Hunt status'], ['Esc', 'Pause']];
  function keyList(list) { return '<div class="keys">' + list.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('') + '</div>'; }
  function refreshMenuText() {
    $('menuKeys').innerHTML = keyList(settings.mode === 'monster' ? KEYS_M : KEYS_S);
    const d = HG.DIFFICULTY[settings.difficulty], L = HG.LENGTH[settings.length];
    const n = clamp((settings.mode === 'monster' ? d.monTasks : d.tasks) + L.taskDelta, 3, 8);
    $('diffNote').textContent = settings.mode === 'monster'
      ? `${n} objectives for the survivors. Smarter survivors on harder settings. You win if fewer than three escape before ${'5:00 AM'}.`
      : `${n} objectives drawn at random. ${d.hits === 1 ? 'One hit and you are taken.' : 'A first hit wounds; a second takes you.'} Dawn comes at 5:00 AM (${L.minutes} minutes).`;
    $('keysFull').innerHTML = '<p class="label" style="margin:14px 0 8px">Survivor</p>' + keyList(KEYS_S) + '<p class="label" style="margin:14px 0 8px">The Hollow</p>' + keyList(KEYS_M);
  }
  segment('optMode', 'mode', refreshMenuText);
  segment('optDiff', 'difficulty', refreshMenuText);
  segment('optLen', 'length', refreshMenuText);
  segment('optWeather', 'weather', () => { if (attract) attract.weather = settings.weather; });
  segment('sQuality', 'quality');
  refreshMenuText();

  // settings controls
  const bindRange = (id, key, fmt) => {
    const el = $(id), out = el.nextElementSibling;
    el.value = settings[key]; out.textContent = fmt(settings[key]);
    el.addEventListener('input', () => { settings[key] = +el.value; out.textContent = fmt(settings[key]); save(); if (audio) audio.applyVolumes(); });
  };
  const pct = v => Math.round(v * 100) + '%';
  bindRange('sVolMaster', 'volMaster', pct); bindRange('sVolSfx', 'volSfx', pct); bindRange('sVolAmb', 'volAmb', pct); bindRange('sVolVoice', 'volVoice', pct);
  bindRange('sFov', 'fov', v => v + '°'); bindRange('sBright', 'brightness', v => v.toFixed(2)); bindRange('sSens', 'sens', v => v.toFixed(2));
  const bindCheck = (id, key) => { const el = $(id); el.checked = !!settings[key]; el.addEventListener('change', () => { settings[key] = el.checked; save(); }); };
  bindCheck('sHeadphones', 'headphones'); bindCheck('sSpeech', 'speech'); bindCheck('sGrain', 'grain'); bindCheck('sFear', 'fearMeter'); bindCheck('sBob', 'bob'); bindCheck('sInvert', 'invert');
  if (!window.speechSynthesis) { $('sSpeech').disabled = true; settings.speech = false; }
  for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('.tabs button')) x.setAttribute('aria-selected', String(x === b));
    for (const p of document.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== b.dataset.tab;
  });
  let settingsReturn = 'menu';
  $('settingsBtn').addEventListener('click', () => { settingsReturn = 'menu'; show('settings'); });
  $('pauseSettings').addEventListener('click', () => { settingsReturn = 'pause'; show('settings'); });
  $('settingsBack').addEventListener('click', () => show(settingsReturn));
  $('enterBtn').addEventListener('click', () => { audio.start(); state = 'menu'; show('menu'); });
  $('startBtn').addEventListener('click', () => startMatch());
  $('resumeBtn').addEventListener('click', resume);
  $('restartBtn').addEventListener('click', () => startMatch());
  $('quitBtn').addEventListener('click', toTitle);

  function show(which) {
    for (const id of ['splash', 'menu', 'settings', 'pause', 'results', 'online']) $(id).hidden = id !== which;
    $('hud').hidden = !(which === null || which === 'pause');
    if (which === 'settings' || which === 'menu' || which === 'pause' || which === 'results' || which === 'online') { if (document.pointerLockElement) document.exitPointerLock(); }
    for (const f of segSyncs) f();
  }

  // ---------- online room ----------
  // the player profile is shared with the other Bas Games (same name everywhere)
  function profile() {
    let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    if (!P.id) { P.id = 'hp-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) { /* private window */ } }
    return { id: P.id + (BUILD && BUILD.tab ? '-' + BUILD.tab : ''), name: String(P.name || '').trim().slice(0, 16) };
  }
  function saveName(name) {
    let P = {}; try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    P.name = name; try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) { /* ignore */ }
  }
  function setupOnline() {
    if (BUILD && BUILD.home) { $('homeLink').href = BUILD.home; $('homeLink').hidden = false; }
    if (BUILD && BUILD.env === 'staging') $('envTag').hidden = false;
    const qs = new URLSearchParams(location.search);
    let transport = null;
    if (qs.get('net') === 'bc' && window.BroadcastChannel) { transport = new HG.Net.BC(); if (BUILD) BUILD.tab = qs.get('tab') || String(Math.random()).slice(2, 6); }
    else if (BUILD && BUILD.online && BUILD.online.url && BUILD.online.key) transport = new HG.Net.Supa(BUILD.online);
    if (!transport) return;
    net = new HG.Net({ transport, env: (BUILD && BUILD.env) || 'live', me: profile(), callbacks: {
      onLobby: () => { if (!$('online').hidden) renderRoom(); },
      onStart: cfg => { closePuzzle(); startMatch(cfg); },
      onHostLeft: (msg, inGame) => {
        if (inGame || online) { online = false; startAttract(); state = 'menu'; }
        if (state !== 'results') openOnline();
        roomMsg(msg, true);
      },
      onNotice: msg => { if (online) toast(msg); },
      onCommand: (s, c) => { if (!sim) return; if (c === 'follow') commandFollow(s); else if (c === 'regroup') regroup(s); }
    } });
    $('onlineCta').hidden = false;
  }
  let roomErr = '';
  function roomMsg(text, err) { roomErr = err ? text : ''; $('onMsg').textContent = text || ''; $('onMsg').classList.toggle('err', !!err); }
  function openOnline() {
    show('online');
    $('onName').value = net.me.name;
    renderRoom();
  }
  function renderRoom() {
    const inRoom = net.status !== 'idle';
    $('onPick').hidden = inRoom; $('onRoom').hidden = !inRoom;
    $('onCodeShow').textContent = net.code || '----';
    $('onHostOpts').hidden = !net.host;
    const host = net.members.find(m => m.slot === -1) || (net.host ? { id: net.me.id, name: net.me.name } : null);
    const surv = net.survivorMembers();
    let li = '';
    li += `<li class="hollow"><span class="n">☾</span><span class="nm">${escapeHtml(host ? host.name || 'Player' : 'Waiting for the host…')}${host && host.id === net.me.id ? ' (you)' : ''}</span><span class="role">The Hollow</span></li>`;
    for (let i = 0; i < HG.Net.MAX_GUESTS; i++) {
      const m = surv.find(m => m.slot === i);
      if (m) li += `<li><span class="n">${i + 1}</span><span class="nm">${escapeHtml(m.name || 'Player')}${m.id === net.me.id ? ' (you)' : ''}</span><span class="role">Survivor</span></li>`;
      else li += `<li class="bot"><span class="n">${i + 1}</span><span class="nm">AI survivor</span><span class="role">Bot</span></li>`;
    }
    $('onList').innerHTML = li;
    const guests = surv.length;
    $('onStart').disabled = guests < 1;
    let msg = net.error || roomErr;
    if (!msg) {
      if (net.status === 'connecting') msg = 'Connecting…';
      else if (net.status === 'connected' && net.host) msg = guests < 1 ? 'Give this code to your friends. Waiting for someone to join…' : `${guests} ${guests === 1 ? 'survivor' : 'survivors'} ready. Start when everyone is here.`;
      else if (net.status === 'connected') msg = net.hostId ? 'You are in. Waiting for The Hollow to start the hunt…' : 'Looking for the room…';
    }
    $('onMsg').textContent = msg || '';
    $('onMsg').classList.toggle('err', !!(net.error || roomErr));
  }
  $('onlineBtn').addEventListener('click', () => { audio.start(); roomMsg(''); net.error = ''; openOnline(); });
  $('onBack').addEventListener('click', () => { net.leave(); roomMsg(''); show('menu'); });
  $('onName').addEventListener('input', e => { const v = e.target.value.trim().slice(0, 16); saveName(v); net.setName(v); renderRoom(); });
  for (const id of ['onName', 'onCode']) $(id).addEventListener('keydown', e => e.stopPropagation());
  const needName = () => { if (!net.me.name) { roomMsg('Type your name first.', true); $('onName').focus(); return true; } return false; };
  $('onCreate').addEventListener('click', () => { if (needName()) return; roomMsg(''); net.noRoomMsg = false; net.open(net.newCode(), true); });
  $('onJoin').addEventListener('click', () => {
    if (needName()) return;
    const c = $('onCode').value.toUpperCase().replace(/[^A-Z]/g, '');
    if (c.length !== 4) { roomMsg('Type the 4-letter room code.', true); return; }
    roomMsg(''); net.noRoomMsg = false; net.open(c, false);
  });
  $('onCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('onJoin').click(); });
  $('onCopy').addEventListener('click', () => {
    const t = net.code; if (!t) return;
    const done = () => { $('onCopy').textContent = 'Copied'; setTimeout(() => { $('onCopy').textContent = 'Copy'; }, 1500); };
    try { navigator.clipboard.writeText(t).then(done, () => {}); } catch (e) { /* select it instead */ }
  });
  $('onStart').addEventListener('click', () => {
    if (!net.host || net.survivorMembers().length < 1) return;
    const cfg = net.hostStart({ difficulty: settings.difficulty, length: settings.length, weather: settings.weather });
    if (cfg) startMatch(cfg);
  });
  segment('onDiff', 'difficulty', refreshMenuText);
  segment('onLen', 'length', refreshMenuText);
  segment('onWeather', 'weather', () => { if (attract) attract.weather = settings.weather; });
  setupOnline();

  // ---------- match control ----------
  function startMatch(cfg) {
    audio.start();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    online = !!(cfg && cfg.seed !== undefined && net);
    if (online) { sim = new HG.Sim(world, net.simOpts(cfg)); net.bind(sim); }
    else sim = new HG.Sim(world, { mode: settings.mode, difficulty: settings.difficulty, length: settings.length, weather: settings.weather, seed: (Math.random() * 1e9) | 0 });
    attract = null;
    R.bindSim(sim);
    audio.stopLoops();
    const p = sim.player;
    cam.yaw = p.yaw; cam.pitch = 0; cam.y = null; cam.death = 0; cam.scream = 0; cam.shake = 0;
    deathT = 0; spectateIdx = 0; puzzle = null; $('puzzle').hidden = true;
    $('subs').innerHTML = ''; $('toast').innerHTML = ''; $('ripples').innerHTML = '';
    $('deathCard').hidden = true; $('spectate').hidden = true; $('notebook').hidden = true;
    const monster = sim.player.kind === 'monster';
    $('abilities').hidden = !monster; $('hunt').hidden = !monster; $('objective').hidden = monster; $('crosshair').hidden = false;
    if (monster) buildAbilityBar();
    $('restartBtn').hidden = online;
    $('quitBtn').textContent = online ? 'Leave the match' : 'Quit to title';
    $('pauseHint').textContent = online ? 'The match keeps going while you are here. Click the view to go back.' : 'Click the view to capture the mouse again.';
    state = 'playing';
    show(null);
    lockPointer();
    if (online && monster) { const n = sim.survivors.filter(s => s.remote).length; toast(`${n} ${n === 1 ? 'friend' : 'friends'} and ${5 - n} strangers in the house. Let them come out into the dark.`); }
    else if (online) toast(`You are ${sim.player.name}. ${cfg.host || 'Your friend'} is The Hollow. Press Tab for your notes.`);
    else toast(monster ? 'Five of them in the house. Let them come out into the dark.' : 'The house is safe. For now. Press Tab for your notes.');
  }
  function toTitle() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (online && net) net.leave();
    online = false;
    audio.stopLoops();
    startAttract();
    state = 'menu';
    show('menu');
  }
  function pause() { if (state !== 'playing' && state !== 'dead') return; pausedFrom = state; state = 'paused'; $('pauseClock').textContent = (online ? 'Menu · ' : 'Paused · ') + sim.clock(); show('pause'); if (!online) audio.suspend(true); }
  let pausedFrom = 'playing';
  function resume() { if (state !== 'paused') return; state = sim.player.kind === 'survivor' && !sim.player.alive ? 'dead' : (sim.over ? 'dead' : 'playing'); show(null); audio.suspend(false); lockPointer(); }
  function lockPointer() {
    try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { dragLook = true; }); } catch (e) { dragLook = true; }
  }

  // ---------- input ----------
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked && (state === 'playing' || state === 'dead') && !puzzle) pause();
  });
  canvas.addEventListener('mousedown', (e) => {
    if ((state === 'playing' || state === 'dead') && !pointerLocked && !puzzle) lockPointer();
    if (state === 'playing' && sim && sim.player.kind === 'monster' && e.button === 0) sim.monster.ctrl.attack = true;
    if (state === 'playing' && sim && sim.player.kind === 'monster' && e.button === 2 && pointerLocked) sim.monster.ctrl.pounce = true;
    if (state === 'dead' && e.button === 0) spectateIdx++;
    if (e.button === 2) dragLook = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 2 && pointerLocked) dragLook = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
    if (state !== 'playing' && state !== 'dead') return;
    if (puzzle) return;
    if (!pointerLocked && !(dragLook && e.buttons)) return;
    const s = 0.0022 * settings.sens;
    cam.yaw -= e.movementX * s;
    cam.pitch -= e.movementY * s * (settings.invert ? -1 : 1);
    cam.pitch = clamp(cam.pitch, -1.35, 1.35);
  });
  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (k === 'Tab') e.preventDefault();
    if (k === 'Escape') {
      if (puzzle) { closePuzzle(); return; }
      if (state === 'playing' || state === 'dead') { pause(); return; }
      if (state === 'paused') { resume(); return; }
    }
    if (e.repeat) return;
    keys[k] = true; pressed[k] = true;
    if (state === 'splash' && (k === 'Enter' || k === 'Space')) $('enterBtn').click();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  window.addEventListener('resize', () => R && R.resize());

  // ---------- per-frame control mapping ----------
  function controlSurvivor(p, dt) {
    const c = p.ctrl;
    let f = 0, r = 0;
    if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
    if (keys.KeyD) r += 1; if (keys.KeyA) r -= 1;
    if (keys.ArrowLeft) cam.yaw += dt * 2.2; if (keys.ArrowRight) cam.yaw -= dt * 2.2;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    c.mx = fx * f + rx * r; c.mz = fz * f + rz * r;
    if (puzzle) { c.mx = c.mz = 0; }
    c.sprint = !!(keys.ShiftLeft || keys.ShiftRight) && f > 0;
    c.crouch = !!(keys.KeyC || keys.ControlLeft || keys.ControlRight);
    c.yaw = p.hidden ? p.hidden.yaw + clamp(HG.angDiff(p.hidden.yaw, cam.yaw), -0.7, 0.7) : cam.yaw;
    if (p.hidden) cam.yaw = c.yaw;
    c.pitch = cam.pitch;
    c.use = !!keys.KeyE || !!puzzle;
    if (p.grabbedBy || p.downT > 0) {
      // mash to break free
      if (pressed.KeyE || pressed.Space) { if (isGuest()) net.act('struggle'); else sim.struggle(p); }
      c.mx = c.mz = 0; c.use = false;
      const m = p.grabbedBy;
      if (m) { const want = Math.atan2(-(m.x - p.x), -(m.z - p.z)); cam.yaw += HG.angDiff(cam.yaw, want) * Math.min(1, dt * 6); cam.pitch = lerp(cam.pitch, 0.35, Math.min(1, dt * 4)); }
      return;
    }
    if (isGuest()) {
      if (pressed.KeyE) net.act('use');
      if (pressed.KeyF) net.act('light');
      if (pressed.KeyR) net.act('reload');
      if (pressed.KeyQ) net.act('medkit');
      if (pressed.KeyG) net.act('cmd', { c: 'follow' });
      if (pressed.KeyZ) net.act('cmd', { c: 'regroup' });
    } else {
      if (pressed.KeyE) c.usePressed = true;
      if (pressed.KeyF) c.toggleLight = true;
      if (pressed.KeyR) c.reload = true;
      if (pressed.KeyQ) c.medkit = true;
      if (pressed.KeyG) commandFollow(p);
      if (pressed.KeyZ) regroup(p);
    }
    // the wiring puzzle opens when the player starts that interaction
    puzzleCool = Math.max(0, puzzleCool - dt);
    if (p.interact && p.interact.kind === 'puzzle' && !puzzle && puzzleCool <= 0) openPuzzle(p);
    if (puzzle && (!p.interact || p.interact.kind !== 'puzzle')) closePuzzle();
  }
  function isGuest() { return online && net && !net.host; }
  function regroup(p) { sim.say(p, 'Everyone back to the house!', { shout: true }); for (const s of sim.survivors) if (s.ai && s.alive && !s.escaped) s.ai.command('regroup', p); }
  function commandFollow(p) {
    let best = null, bd = 14;
    for (const s of sim.survivors) if (s !== p && s.ai && s.alive && !s.escaped && s.level === p.level) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }
    if (!best) { if (p === sim.player) toast('No AI survivor close enough to hear you.'); return; }
    if (best.ai.leader === p) { sim.say(p, `${best.name}, split up. Find something useful.`, {}); best.ai.command('release', p); }
    else { sim.say(p, `${best.name}, stay with me.`, {}); best.ai.command('follow', p); }
  }
  function controlMonster(m, dt) {
    const c = m.ctrl;
    let f = 0, r = 0;
    if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
    if (keys.KeyD) r += 1; if (keys.KeyA) r -= 1;
    if (keys.ArrowLeft) cam.yaw += dt * 2.2; if (keys.ArrowRight) cam.yaw -= dt * 2.2;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    c.mx = fx * f + rx * r; c.mz = fz * f + rz * r;
    c.yaw = cam.yaw; c.pitch = cam.pitch;
    c.run = !!(keys.ShiftLeft || keys.ShiftRight);
    if (pressed.KeyQ) c.dash = true;
    if (pressed.KeyC) c.crawl = !m.crawling;
    if (pressed.KeyE) c.ghost = true;
    if (pressed.KeyV) c.stalk = !m.stalking;
    if (pressed.KeyR) c.scream = true;
    if (pressed.KeyF) c.darkness = true;
    if (pressed.Space) c.usePressed = true;
    if (pressed.KeyX) c.grab = true;
  }

  // ---------- wiring puzzle ----------
  const WIRE_COLORS = [['#b8372a', 'red'], ['#d8b23a', 'yellow'], ['#3a6eb8', 'blue'], ['#4f9a4a', 'green']];
  function openPuzzle(p) {
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    puzzle = { p, order, sel: null, done: [false, false, false, false], links: [] };
    if (document.pointerLockElement) document.exitPointerLock();
    renderPuzzle();
    $('puzzle').hidden = false;
  }
  function closePuzzle() {
    if (!puzzle) return;
    const p = puzzle.p;
    puzzle = null; $('puzzle').hidden = true; puzzleCool = 1.2;
    if (p.interact && p.interact.kind === 'puzzle') p.interact = null;
    if (state === 'playing') lockPointer();
  }
  function renderPuzzle() {
    const P = puzzle;
    let svg = '<svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg">';
    svg += '<rect x="0" y="0" width="300" height="220" fill="#121514"/>';
    for (const [a, b] of P.links) svg += `<path d="M40 ${40 + a * 45} C 150 ${40 + a * 45}, 150 ${40 + b * 45}, 260 ${40 + b * 45}" stroke="${WIRE_COLORS[a][0]}" stroke-width="5" fill="none"/>`;
    for (let i = 0; i < 4; i++) {
      const y = 40 + i * 45;
      svg += `<rect x="6" y="${y - 9}" width="34" height="18" fill="${WIRE_COLORS[i][0]}" opacity="${P.done[i] ? 0.4 : 1}" data-l="${i}"/>`;
      if (P.sel === i) svg += `<rect x="3" y="${y - 12}" width="40" height="24" fill="none" stroke="#d8d0bf" stroke-width="2"/>`;
      const ci = P.order[i];
      svg += `<circle cx="262" cy="${y}" r="10" fill="#2a2d2b" stroke="${WIRE_COLORS[ci][0]}" stroke-width="3" data-r="${i}"/>`;
      svg += `<text x="282" y="${y + 4}" fill="#8f897c" font-size="10" font-family="Special Elite, monospace">${WIRE_COLORS[ci][1][0].toUpperCase()}</text>`;
    }
    svg += '</svg>';
    $('puzzle').innerHTML = `<div class="label">Control panel · match each wire to its terminal</div>${svg}<p>Click a wire, then the terminal ringed in the same colour. Esc to step away (progress resets).</p>`;
    $('puzzle').querySelector('svg').addEventListener('click', (e) => {
      const t = e.target;
      if (t.dataset.l !== undefined) { const i = +t.dataset.l; if (!P.done[i]) { P.sel = i; renderPuzzle(); } }
      else if (t.dataset.r !== undefined && P.sel !== null) {
        const ri = +t.dataset.r;
        const good = P.order[ri] === P.sel;
        if (good) { P.done[P.sel] = true; P.links.push([P.sel, ri]); } else toast('Sparks. Wrong terminal.');
        if (isGuest()) net.act('wires', { bad: good ? 0 : 1 }); else sim.emitSound('task_wires', P.p.x, P.p.z, P.p.level, good ? 6 : 10, P.p);
        P.sel = null;
        if (P.done.every(Boolean)) {
          if (isGuest()) net.act('puzzle');
          else { const ia = P.p.interact; if (ia && ia.step) ia.step.progress = ia.step.time; }
          setTimeout(closePuzzle, 350);
        }
        renderPuzzle();
      }
    });
  }

  // ---------- HUD ----------
  function toast(text) {
    const d = document.createElement('div'); d.textContent = text; $('toast').appendChild(d);
    setTimeout(() => d.remove(), 4600);
    while ($('toast').children.length > 3) $('toast').firstChild.remove();
  }
  function subtitle(e) {
    const p = sim.player;
    if (p.kind === 'monster') { if (e.radio && !e.mimic && Math.hypot(e.x - p.x, e.z - p.z) > 25) return; }
    else if (e.mimic && Math.hypot(e.x - p.x, e.z - p.z) > 30) return;
    const d = document.createElement('div');
    const mine = e.who === p.id && !e.mimic;
    const name = mine ? 'You' : e.name;
    if (e.whisper) d.className = 'whisper';
    if (e.radio && !mine && p.kind === 'survivor' && Math.hypot(e.x - p.x, e.z - p.z) > 10) d.classList.add('radio');
    if (e.mimic) d.className = 'mimic';
    const b = document.createElement('b'); b.textContent = name + ': ';
    d.appendChild(b); d.appendChild(document.createTextNode(e.text));
    $('subs').appendChild(d);
    setTimeout(() => d.remove(), 5600);
    while ($('subs').children.length > 3) $('subs').firstChild.remove();
  }
  function currentObjective(p) {
    // nearest relevant step: something the player carries, else the first unfinished task
    let pick = null;
    for (const t of sim.tasks) {
      if (t.done) continue;
      const st = t.steps[t.stepIdx];
      if (st.kind === 'deliver' && st.items.some(i => p.carry.includes(i))) { pick = { t, st }; break; }
    }
    if (!pick) {
      let bd = 1e9;
      for (const t of sim.tasks) { if (t.done) continue; const st = t.steps[t.stepIdx]; const S = world.stations[st.station]; const d = Math.hypot(S.x - p.x, S.z - p.z) + (S.level !== p.level ? 15 : 0); if (d < bd) { bd = d; pick = { t, st }; } }
    }
    return pick;
  }
  let hudT = 0;
  function updateHUD(dt) {
    const p = sim.player;
    hudT -= dt;
    if (keys.Tab) { if ($('notebook').hidden || hudT <= 0) { $('notebook').hidden = false; renderNotebook(); } } else $('notebook').hidden = true;
    if (p.kind === 'survivor') {
      // interaction prompt
      const focus = p.alive && !p.escaped ? sim.focusFor(p) : null;
      const pr = $('prompt'), ring = $('ring');
      if (p.grabbedBy) {
        pr.innerHTML = '<kbd>E</kbd>MASH TO BREAK FREE'; pr.className = '';
        ring.hidden = false; $('ringArc').setAttribute('stroke-dashoffset', String(125.7 * (1 - clamp(p.struggle || 0, 0, 1))));
        $('ringArc').setAttribute('stroke', '#c4512f');
      } else if (p.downT > 0) { pr.textContent = 'Knocked down…'; pr.className = 'disabled'; ring.hidden = true; }
      else if (p.interact) {
        $('ringArc').setAttribute('stroke', '#d8d0bf');
        const ia = p.interact;
        pr.textContent = ia.kind === 'puzzle' ? 'Rewiring…' : (ia.step && ia.step.verb ? ia.step.verb + '…' : ia.label);
        pr.className = '';
        ring.hidden = ia.kind === 'puzzle';
        const frac = clamp(ia.progress / (ia.time || 1), 0, 1);
        $('ringArc').setAttribute('stroke-dashoffset', String(125.7 * (1 - frac)));
      } else if (focus) {
        pr.innerHTML = '';
        const k = document.createElement('kbd'); k.textContent = focus.instant ? 'E' : 'Hold E'; if (!focus.disabled) pr.appendChild(k);
        pr.appendChild(document.createTextNode(focus.label));
        pr.className = focus.disabled ? 'disabled' : '';
        ring.hidden = true;
      } else { pr.textContent = ''; ring.hidden = true; }
      if (hudT > 0) return;
      hudT = 0.15;
      // objective
      if (sim.gateState === 'open') $('objective').innerHTML = '<div class="t">The gate is open</div>Get to the road. South, down the driveway.';
      else if (sim.gateState === 'opening') $('objective').innerHTML = `<div class="t">Gate motor engaging</div>The gate opens in ${Math.ceil(sim.gateTimer)} seconds. Stay alive.`;
      else {
        const o = currentObjective(p);
        if (o) {
          const st = o.st;
          let prog = 0, extra = '';
          if (st.kind === 'deliver') { prog = st.delivered.length / st.items.length; if (st.items.length > 1) extra = ` (${st.delivered.length}/${st.items.length})`; }
          else prog = st.progress / st.time;
          const done = sim.tasks.filter(t => t.done).length;
          $('objective').innerHTML = `<div class="t">${o.t.title} · ${done}/${sim.tasks.length} done</div>${escapeHtml(st.label)}${extra}<div class="bar"><i style="width:${Math.round(prog * 100)}%"></i></div>`;
        }
      }
      // status: battery, spares, items
      const cells = 6, lit = Math.ceil(p.battery * cells);
      let html = `<div class="batt ${p.battery < 0.2 ? 'low' : ''}"><span class="cells">${Array.from({ length: cells }, (_, i) => `<i class="${i < lit ? '' : 'off'}"></i>`).join('')}</span><span>${p.flashlightOn && p.battery > 0 ? 'Light on' : 'Light off'}${p.batteries ? ` · ${p.batteries} spare` : ''}</span></div>`;
      if (p.carry.length) html += `<div id="carry">${p.carry.map(c => HG.ITEMS[c]).join(' · ')}</div>`;
      if (p.health === 1) html += `<div style="color:var(--ember)">Wounded${p.carry.includes('medkit') ? ' · Q to use first-aid kit' : ' · find a teammate to patch you'}</div>`;
      if (settings.fearMeter) html += `<div class="row"><span>Fear</span><div id="fearMeter"><i style="width:${Math.round(p.fear * 100)}%"></i></div></div>`;
      $('status').innerHTML = html;
      updateTags(p);
    } else updateMonsterHUD(dt);
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const tagEls = new Map();
  function updateTags(p) {
    const box = $('tags');
    const v = new THREE.Vector3();
    const camR = R.camera;
    const seen = new Set();
    for (const s of sim.survivors) {
      if (s === p || !s.alive || s.escaped || s.level !== p.level || s.hidden) continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      const speaking = sim.time - s.lastSayT < 3;
      if (d > 22 && !speaking) continue;
      v.set(s.x, s.y + 2.05, s.z).project(camR);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      if (!world.los(s.level, p.x, p.z, s.x, s.z).clear && !speaking) continue;
      let el = tagEls.get(s.id);
      if (!el) { el = document.createElement('div'); box.appendChild(el); tagEls.set(s.id, el); }
      el.textContent = s.name + (s.health === 1 ? ' · hurt' : '');
      el.className = s.health === 1 ? 'hurt' : '';
      el.style.left = ((v.x + 1) / 2 * 100) + '%'; el.style.top = ((1 - v.y) / 2 * 100) + '%';
      el.style.opacity = String(clamp(1 - d / 22, 0.25, 0.85));
      seen.add(s.id);
    }
    for (const [id, el] of tagEls) if (!seen.has(id)) { el.remove(); tagEls.delete(id); }
  }
  function renderNotebook() {
    const p = sim.player;
    let h = `<h3>${p.kind === 'monster' ? 'What they are doing' : 'Field notes'}</h3><div class="clock">${sim.clock()} · dawn at 5:00 AM · ${['', 'Settling in', 'Searching', 'Escalating', 'Final push', 'Escape'][sim.phase]}</div>`;
    for (const t of sim.tasks) {
      h += `<div class="task ${t.done ? 'done' : ''}"><div class="tt">${escapeHtml(t.title)}</div>`;
      if (p.kind === 'survivor') {
        h += `<div style="font-size:12px;opacity:.7">${escapeHtml(t.note)}</div>`;
        t.steps.forEach((st, i) => {
          let extra = '';
          if (st.kind === 'deliver' && st.items.length > 1) extra = ` (${st.delivered.length}/${st.items.length})`;
          if ((st.kind === 'hold' || st.kind === 'zone' || st.kind === 'puzzle') && i === t.stepIdx && st.progress > 0) extra = ` (${Math.round(st.progress / st.time * 100)}%)`;
          h += `<div class="step ${i < t.stepIdx || t.done ? 'done' : (i === t.stepIdx ? 'now' : '')}">${escapeHtml(st.label)}${extra}</div>`;
        });
      } else h += `<div class="step ${t.done ? 'done' : 'now'}">${t.done ? 'finished' : `stage ${t.stepIdx + 1} of ${t.steps.length}`}</div>`;
      h += '</div>';
    }
    if (sim.gateState !== 'closed') h += `<div class="task"><div class="tt">Road gate ${sim.gateState === 'open' ? 'OPEN' : 'opening…'}</div></div>`;
    h += '<div class="crew">';
    for (const s of sim.survivors) {
      if (s === p) continue;
      const known = s.escaped ? 'made it out' : (!s.alive ? (p.kind === 'monster' || sim.team.missing.includes(s.id) || (p.ai === undefined && sim.team.missing.includes(s.id)) ? 'gone' : 'not answering') : (s.health === 1 ? 'hurt' : 'on the radio'));
      h += `<span class="${!s.alive ? 'gone' : ''}">${escapeHtml(s.name)}</span><span>${s.trait.toLowerCase()} · ${known}</span>`;
    }
    h += '</div>';
    $('notebook').innerHTML = h;
  }
  function buildAbilityBar() {
    const A = HG.ABILITIES;
    const AT = HG.ATTACKS;
    const order = ['swipe', 'pounce', 'grab', 'run', 'dash', 'crawl', 'ghost', 'stalk', 'scream', 'darkness'];
    const short = { 'Left click': 'LMB', 'Right click': 'RMB' };
    $('abilities').innerHTML = order.map(k => { const d = A[k] || AT[k]; return `<div class="ab${AT[k] ? ' atk' : ''}" data-k="${k}"><div class="k">${short[d.key] || d.key}</div><div class="n">${d.name}</div>${k === 'run' ? '<div class="meter"><i></i></div>' : ''}<div class="cd"></div></div>`; }).join('');
  }
  function updateMonsterHUD() {
    const m = sim.monster, A = HG.ABILITIES, cdm = sim.diff.abilityCd;
    for (const el of $('abilities').children) {
      const k = el.dataset.k;
      let frac = 0, on = false;
      if (k === 'run') { on = m.running; el.querySelector('.meter i').style.width = Math.round(m.runEnergy * 100) + '%'; }
      else if (k === 'crawl') on = m.crawling;
      else if (k === 'stalk') on = m.stalking;
      else if (k === 'ghost') { on = m.ghostT > 0; frac = m.cd.ghost / (A.ghost.cooldown * cdm); }
      else if (k === 'swipe') { on = m.attackWind > 0; frac = m.attackCd / 2.6; }
      else if (k === 'pounce') { on = m.pounceWind > 0 || m.pounceT > 0; frac = m.cd.pounce / (HG.ATTACKS.pounce.cooldown * cdm); }
      else if (k === 'grab') { on = !!m.grabbed; frac = m.cd.grab / (HG.ATTACKS.grab.cooldown * cdm); }
      else { frac = (m.cd[k] || 0) / ((A[k].cooldown || 1) * cdm); on = k === 'dash' && m.dashT > 0; }
      el.classList.toggle('on', on);
      el.querySelector('.cd').style.width = Math.round(clamp(frac, 0, 1) * 100) + '%';
    }
    const alive = sim.survivors.filter(s => s.alive && !s.escaped).length, esc = sim.survivors.filter(s => s.escaped).length, caught = sim.survivors.filter(s => s.caught).length;
    const done = sim.tasks.filter(t => t.done).length;
    $('hunt').innerHTML = `<div><b>${alive}</b> still out there · <b>${caught}</b> taken · <b>${esc}</b> escaped</div><div>Their progress <b>${done}/${sim.tasks.length}</b>${sim.gateState !== 'closed' ? ' · <b style="color:var(--ember)">gate ' + sim.gateState + '</b>' : ''}</div><div>${sim.clock()}</div>`;
    const pr = $('prompt');
    if (m.grabbed) { pr.innerHTML = `Holding ${escapeHtml(m.grabbed.name)} · they are fighting back`; $('ring').hidden = false; $('ringArc').setAttribute('stroke', '#c4512f'); $('ringArc').setAttribute('stroke-dashoffset', String(125.7 * (1 - clamp(m.grabbed.struggle || 0, 0, 1)))); $('status').innerHTML = ''; return; }
    if (m.stumbleT > 0) { pr.textContent = 'Reeling…'; $('ring').hidden = true; return; }
    const d = sim.doorNear(m, 1.7), h = world.hides.find(h => h.level === m.level && Math.hypot(h.ix - m.x, h.iz - m.z) < 1.3);
    pr.innerHTML = d && !d.locked ? `<kbd>Space</kbd>${d.open ? 'Close door' : 'Open door'}` : (h ? '<kbd>Space</kbd>Check the ' + h.name : '');
    $('ring').hidden = true;
    $('status').innerHTML = '';
  }
  function ripple(e) {
    // the creature senses sounds: show where they came from
    const m = sim.monster;
    const aud = sim.audibility(e, m.x, m.z, m.level) * sim.diff.monHear;
    if (aud < 0.04 || !e.src || e.src.kind !== 'survivor') return;
    const v = new THREE.Vector3(e.x, world.floorY(e.level, e.x, e.z) + 1, e.z).project(R.camera);
    let x = (v.x + 1) / 2, y = (1 - v.y) / 2;
    if (v.z > 1) { x = 1 - x; y = 0.9; }
    x = clamp(x, 0.04, 0.96); y = clamp(y, 0.06, 0.94);
    const i = document.createElement('i'); i.style.left = (x * 100) + '%'; i.style.top = (y * 100) + '%';
    i.style.borderWidth = (1 + aud * 4).toFixed(1) + 'px';
    $('ripples').appendChild(i); setTimeout(() => i.remove(), 1700);
    while ($('ripples').children.length > 14) $('ripples').firstChild.remove();
  }

  // ---------- event handling ----------
  function handleEvents() {
    // the player who was just taken still hears their own death from inside
    const pl = sim.player;
    const viewer = pl && pl.kind === 'survivor' && pl.caught && sim.time - pl.caughtAt < 0.6 ? pl : viewerEntity();
    const safeAudio = (e) => { try { audio.onEvent(e, sim, viewer); } catch (err) { if (!audio.warned) { audio.warned = true; console.warn('audio', err); } } };
    const evs = sim.events.slice();
    if (online && net.host) net.hostPost(frameDt, evs);
    for (const e of evs) {
      R.onEvent(e);
      if (attract) { if (e.type === 'sound' && !e.task) safeAudio(e); continue; }
      safeAudio(e);
      const p = sim.player;
      switch (e.type) {
        case 'say': subtitle(e); break;
        case 'toast': if (p.kind === 'survivor' && (!e.who || e.who === p.id)) toast(e.text); break;
        case 'taskDone': toast(`${e.title}: done.`); break;
        case 'powerFail': if (p.kind === 'survivor') toast('The house lights die.'); break;
        case 'gateOpening': toast('Every objective is done. The gate motor is engaging.'); break;
        case 'gateOpen': toast('The gate is open. Get to the road.'); break;
        case 'escaped': if (p.kind === 'monster' || e.who !== p.id) toast(`${e.name} reached the road.`); break;
        case 'caught': if (p.kind === 'monster') toast(`${e.name} is taken.`); else if (e.who === p.id) onPlayerCaught(); break;
        case 'hit': if (p.kind === 'survivor' && e.who === p.id) { cam.shake = 1; cam.hitFlash = 1; } if (p.kind === 'monster') toast(`${e.name} is wounded.`); break;
        case 'scream': if (p.kind === 'survivor') { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < 26 && e.level === p.level) cam.scream = clamp(1.2 - d / 26, 0.2, 1); } break;
        case 'darkness': if (p.kind === 'survivor' && Math.hypot(e.x - p.x, e.z - p.z) < e.r) cam.dark = 1; break;
        case 'grabbed': if (p.kind === 'monster') toast(`You have ${e.name}. Drag them into the dark.`); else if (e.who === p.id) toast('It has you. Fight!'); break;
        case 'grabBreak': if (p.kind === 'monster') toast(`${e.name} tore free.`); else if (e.who === p.id) toast('You tore free. RUN.'); else toast(`${e.name} broke free!`); break;
        case 'batteryDead': if (e.who === p.id) toast('Your flashlight dies.'); break;
        case 'reload': if (e.who === p.id) toast('Fresh batteries.'); break;
        case 'patched': if (e.who === p.id) toast('Patched up.'); break;
        case 'sound': if (p.kind === 'monster') ripple(e); break;
        case 'matchOver': if (online && net.host) net.hostEnd(); { const sm = sim; setTimeout(() => { if (sim === sm) showResults(); }, sim.result.win ? 1800 : 2600); } break;
      }
    }
    sim.events.length = 0;
  }
  function onPlayerCaught() {
    state = 'dead'; deathT = 0;
    $('deathCard').hidden = false;
    closePuzzle();
  }

  // ---------- cameras ----------
  function viewerEntity() {
    if (!sim) return null;
    if (attract) return null;
    const p = sim.player;
    if (p.kind === 'survivor' && (!p.alive || p.escaped)) {
      const alive = sim.survivors.filter(s => s.alive && !s.escaped);
      if (alive.length) return alive[spectateIdx % alive.length];
      return sim.monster;
    }
    return p;
  }
  const flashState = { dx: 0, dy: 0, sx: 0, sy: 0 };
  function computeView(dt) {
    const t = performance.now() / 1000;
    if (HG.debugView) return Object.assign({ fov: 70, level: 0, firstPerson: false, flash: null, roll: 0 }, HG.debugView);
    if (attract) {
      // slow drift around the property
      const a = t * 0.035;
      const x = 62 + Math.cos(a) * 26, z = 61 + Math.sin(a) * 24;
      const y = world.terrainY(x, z) + 2.4;
      const yaw = Math.atan2(-(62 - x), -(61 - z)) + Math.sin(t * 0.2) * 0.15;
      return { x, y, z, yaw, pitch: -0.04, fov: 62, level: 0, firstPerson: false, flash: null };
    }
    const p = sim.player;
    const viewer = viewerEntity();
    cam.scream = Math.max(0, cam.scream - dt * 0.6);
    cam.shake = Math.max(0, cam.shake - dt * 1.5);
    cam.dark = Math.max(0, (cam.dark || 0) - dt * 0.15);
    cam.hitFlash = Math.max(0, (cam.hitFlash || 0) - dt * 2);
    if (p.kind === 'survivor' && p.alive && !p.escaped) {
      // ----- first person -----
      const crouch = p.crouching ? 1.08 : 1.62;
      const floor = p.y;
      cam.y = cam.y === null ? floor : lerp(cam.y, floor, Math.min(1, dt * 12));
      cam.eye = lerp(cam.eye || 1.62, crouch, Math.min(1, dt * 8));
      const sp = p.speed;
      cam.bob += dt * sp * (p.sprinting ? 1.75 : 2.1);
      const bobA = settings.bob ? clamp(sp / 5, 0, 1) * (p.sprinting ? 0.055 : 0.03) : 0;
      const fearShake = p.fear > 0.6 ? (p.fear - 0.6) * 0.006 : 0;
      const sh = cam.shake * 0.04 + cam.scream * 0.02 + fearShake;
      let x = p.x, z = p.z, y = cam.y + cam.eye + Math.abs(Math.sin(cam.bob)) * bobA;
      if (p.grabbedBy) { y += 0.3; cam.shake = Math.max(cam.shake, 0.55); cam.scream = Math.max(cam.scream, 0.5); }
      cam.down = lerp(cam.down || 0, p.downT > 0 ? 1 : 0, Math.min(1, dt * 9));
      y -= cam.down * 1.3;
      let yaw = cam.yaw + (Math.random() - 0.5) * sh, pitch = cam.pitch + (Math.random() - 0.5) * sh + Math.sin(cam.bob * 2) * bobA * 0.15;
      if (p.hidden) { y = p.y + 1.45 + Math.sin(t * 1.4) * 0.01; x = p.hidden.x - Math.sin(p.hidden.yaw) * 0.25; z = p.hidden.z - Math.cos(p.hidden.yaw) * 0.25; }
      // flashlight: lags the view (spring), sways with steps, shakes with fear
      const k = Math.min(1, dt * 9);
      flashState.dx = lerp(flashState.dx, 0, k); flashState.dy = lerp(flashState.dy, 0, k);
      cam.prevYaw = cam.prevYaw === undefined ? yaw : cam.prevYaw;
      flashState.dx += HG.angDiff(cam.prevYaw, yaw) * 0.5; cam.prevYaw = yaw;
      const sway = Math.sin(cam.bob) * bobA * 1.4 + (Math.random() - 0.5) * (p.fear * 0.012 + cam.scream * 0.08 + (p.panicT > 0 ? 0.04 : 0));
      const fyaw = yaw - flashState.dx + sway, fpitch = pitch - 0.035 + Math.abs(Math.cos(cam.bob)) * bobA * 0.4 + (Math.random() - 0.5) * p.fear * 0.008;
      const dir = { x: -Math.sin(fyaw) * Math.cos(fpitch), y: Math.sin(fpitch), z: -Math.cos(fyaw) * Math.cos(fpitch) };
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      let inten = 1;
      if (p.lightFlicker > 0) inten = Math.random() < 0.45 ? 0.05 : 1;
      if (p.battery < 0.15) inten *= Math.random() < 0.05 ? 0.15 : 0.55 + p.battery * 3;
      const flash = { x: x + rx * 0.22, y: y - 0.28, z: z + rz * 0.22, dx: dir.x, dy: dir.y, dz: dir.z, on: sim.flashlightActive(p), intensity: inten };
      return { x, y, z, yaw, pitch: pitch + cam.down * 0.6, roll: Math.sin(cam.bob) * bobA * 0.08 + cam.shake * (Math.random() - 0.5) * 0.06 + cam.down * 0.5, fov: settings.fov + (p.sprinting ? 4 : 0), level: p.level, firstPerson: true, viewer: p, flash, fear: p.fear, wound: p.health === 1 ? 0.55 + cam.hitFlash * 0.4 : cam.hitFlash, scream: cam.scream, darkness: cam.dark, hidden: !!p.hidden, stamina: p.stamina };
    }
    if (p.kind === 'survivor' && !p.alive && deathT < 3.2) {
      // ----- taken: the view drops and goes dark -----
      deathT += dt;
      const k = clamp(deathT / 1.2, 0, 1);
      return { x: p.deathX, y: p.y + lerp(1.62, 0.25, k), z: p.deathZ, yaw: cam.yaw + deathT * 0.4, pitch: cam.pitch + k * 0.9, roll: k * 1.1, fov: settings.fov, level: p.deathLevel, firstPerson: true, viewer: p, flash: null, death: clamp((deathT - 0.6) / 1.8, 0, 1), wound: 1, scream: 0.6 };
    }
    // ----- third person: the creature, or spectating -----
    const e = viewer;
    if (state === 'dead' && deathT >= 3.2) { $('deathCard').hidden = true; const sp = $('spectate'); sp.hidden = false; sp.textContent = e.kind === 'survivor' ? `Spectating ${e.name} · click to switch` : 'Watching the creature'; }
    if (p.kind === 'survivor' && p.escaped && !$('spectate').textContent.startsWith('You')) { const sp = $('spectate'); sp.hidden = false; sp.textContent = `You made it out · ${e.kind === 'survivor' ? 'watching ' + e.name : 'watching the woods'}`; }
    const isMon = e.kind === 'monster';
    const h = isMon ? (e.crawling ? 1.0 : 2.45) : 1.7;
    const dist = isMon ? (e.crawling ? 2.4 : 3.3) : 3.2;
    const yaw = p.kind === 'monster' ? cam.yaw : (e.yaw || 0);
    const pitch = p.kind === 'monster' ? cam.pitch * 0.8 - 0.12 : -0.18;
    const fx = -Math.sin(yaw) * Math.cos(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
    const tx = e.x + Math.cos(yaw) * 0.55, tz = e.z - Math.sin(yaw) * 0.55, ty = (e.y || 0) + h;
    let d = dist;
    // pull the camera in so walls don't block the view
    for (let s = 0.4; s <= dist; s += 0.2) { const cx = tx - fx * s, cz = tz - fz * s; const cl = world.get(e.level, Math.floor(cx), Math.floor(cz)); if (cl === HG.T.WALL || cl === HG.T.VOID || cl === HG.T.DOOR && !(world.doorAt(e.level, Math.floor(cx), Math.floor(cz)) || {}).open) { d = Math.max(0.35, s - 0.3); break; } }
    const x = tx - fx * d, z = tz - fz * d, y = ty - Math.sin(pitch) * d * 0.9;
    const ceil = e.level === 1 ? 0.15 : (e.level === 0 && world.isHouse(0, x, z) ? 3.25 : 99);
    return { x, y: Math.min(y, ceil), z, yaw, pitch, fov: settings.fov, level: e.level, firstPerson: false, viewer: e, flash: null, monsterVision: p.kind === 'monster', fear: isMon ? 0 : e.fear * 0.5 };
  }

  // ---------- main loop ----------
  let last = performance.now(), acc = 0, frameDt = 1 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!R) return;
    frameDt = dt;
    // online matches keep running behind the menu; solo pauses
    const running = state === 'playing' || state === 'dead' || attract || (online && state === 'paused') || (online && state === 'results' && !sim.over);
    if (running && sim) {
      if (!attract && state === 'playing') { if (sim.player.kind === 'survivor') { if (sim.player.alive && !sim.player.escaped) controlSurvivor(sim.player, dt); } else controlMonster(sim.player, dt); }
      else if (!attract) { const c = sim.player.ctrl; c.mx = c.mz = 0; c.use = false; c.run = false; c.sprint = false; }
      if (isGuest()) net.guestFrame(dt);
      else {
        if (online) net.hostPre();
        acc += dt;
        let n = 0;
        while (acc >= 1 / 60 && n < 5) { sim.update(1 / 60); acc -= 1 / 60; n++; }
        if (n === 5) acc = 0;
      }
      handleEvents();
      // the menu's background match restarts when it ends
      if (attract && sim.over) startAttract();
    }
    if (net) net.update(dt);
    for (const k in pressed) pressed[k] = false;
    const view = computeView(dt);
    view.indoor = R.indoor;
    R.update(dt, view);
    if (state === 'playing' || state === 'dead' || attract) R.adaptResolution(dt);
    if (audio && audio.ok && sim) {
      try { audio.listen(view.x, view.y, view.z, view.yaw, view.pitch, view.level); audio.update(dt, sim, view); }
      catch (err) { if (!audio.warned) { audio.warned = true; console.warn('audio', err); } }
    }
    if (!attract && sim && (state === 'playing' || state === 'dead')) updateHUD(dt);
  }

  // ---------- results ----------
  function showResults() {
    if (attract || state === 'results' || !sim.over) return;
    state = 'results';
    closePuzzle();
    const r = sim.result, p = sim.player;
    const mins = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    let head, sub;
    if (p.kind === 'survivor') {
      if (p.escaped) { head = 'You made it out'; sub = r.escaped === 5 ? 'All five of you reached the road. The pines let you go.' : `${r.escaped} of 5 reached the road. The others are still in the woods.`; }
      else if (r.timeout) { head = 'Dawn never came'; sub = 'At five o\'clock the woods closed in on whoever was left.'; }
      else { head = 'Taken'; sub = r.escaped ? `${r.escaped} of 5 escaped. You were not one of them.` : 'Nobody reached the road.'; }
    } else {
      if (r.win) { head = 'The pines keep them'; sub = `${r.caught} taken, ${r.escaped} escaped. Not enough of them saw the road.`; }
      else { head = 'They got away'; sub = `${r.escaped} reached the road. The Hollow goes hungry.`; }
    }
    let rows = '';
    for (const s of sim.survivors) {
      const status = s.escaped ? `<span class="esc">Escaped at ${mins(s.escapedAt)}</span>` : (s.lostToNight ? '<span class="taken">Lost to the night</span>' : `<span class="taken">Taken at ${mins(s.caughtAt || sim.time)}</span>`);
      rows += `<tr><td>${escapeHtml(s.isPlayer ? s.name + ' (you)' : s.name)}</td><td>${escapeHtml(s.trait)}</td><td>${status}</td><td>${s.deliveries}</td><td>${Math.round(s.taskTime)}s</td></tr>`;
    }
    const tasks = sim.tasks.map(t => `<tr><td>${escapeHtml(t.title)}</td><td>${t.done ? '<span class="esc">Done at ' + mins(t.doneAt) + '</span>' : `<span class="taken">Unfinished (stage ${t.stepIdx + 1}/${t.steps.length})</span>`}</td></tr>`).join('');
    const ab = sim.stats.abilityUses;
    $('resultsBody').innerHTML = `
      <p class="kicker">${HG.DIFFICULTY[sim.opts.difficulty].label} · ${HG.LENGTH[sim.opts.length].label} · ${sim.weather === 'rain' ? 'Rain' : sim.weather === 'clear' ? 'Clear' : 'Fog'}</p>
      <h2 class="${(p.kind === 'survivor' ? p.escaped : r.win) ? '' : 'lose'}">${head}</h2>
      <p class="sub">${sub}</p>
      <div class="stats"><div><b>${mins(r.time)}</b><span>Match time</span></div><div><b>${r.tasksDone}/${r.tasksTotal}</b><span>Objectives</span></div><div><b>${r.escaped}</b><span>Escaped</span></div><div><b>${r.caught}</b><span>Taken</span></div><div><b>${sim.stats.chases}</b><span>Chases</span></div></div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Survivor</th><th>Temperament</th><th>Fate</th><th>Items delivered</th><th>Time on objectives</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="tablewrap" style="margin-top:18px"><table class="ledger"><thead><tr><th>Objective</th><th>Status</th></tr></thead><tbody>${tasks}</tbody></table></div>
      <p class="hint">The creature used: ${Object.entries(ab).map(([k, v]) => `${((HG.ABILITIES[k] || HG.ATTACKS[k] || { name: k }).name).toLowerCase()} ×${v}`).join(', ') || 'nothing but patience'}.</p>
      <div class="cta" style="margin-top:18px"><button class="btn" id="againBtn">${online ? 'Back to the room' : 'Play again'}</button><button class="btn ghost" id="titleBtn">${online ? 'Leave the room' : 'Title screen'}</button></div>`;
    show('results');
    if (online) {
      $('againBtn').addEventListener('click', () => { online = false; net.backToRoom(); startAttract(); state = 'menu'; openOnline(); });
      $('titleBtn').addEventListener('click', () => { net.leave(); online = false; toTitle(); });
    } else {
      $('againBtn').addEventListener('click', () => startMatch());
      $('titleBtn').addEventListener('click', toTitle);
    }
    $('againBtn').focus();
  }

  // test hooks (used by the automated browser checks)
  HG.game = { get sim() { return sim; }, get R() { return R; }, get audio() { return audio; }, settings, step(sec) { for (let i = 0; i < sec * 60; i++) { sim.update(1 / 60); if (i % 30 === 0) handleEvents(); } handleEvents(); } };
  window.boot = boot;
})();
