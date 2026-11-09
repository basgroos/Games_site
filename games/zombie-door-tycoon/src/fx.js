// =====================================================================
//  FX — particles, projectiles, damage numbers, screen shake + AUDIO
//  The simulation calls these hooks; only the viewed room is drawn.
// =====================================================================
(function () {
  var T = G.T, TAU = Math.PI * 2;
  var FX = G.FX = { marks: [], coins: [], vis: {}, view: -1, parts: [], shots: [], beams: [], nums: [], rings: [], meteors: [], shake: 0, flash: 0, flashCol: '#fff', hooks: {} };
  function on(room) { return room && FX.vis && FX.vis[room.index]; }
  function inV(x, y) { var v = FX.viewRect; return v && x > v.x0 - 60 && x < v.x1 + 60 && y > v.y0 - 80 && y < v.y1 + 60; }
  FX.inV = inV;
  function hook(name, a, b, c) { if (FX.hooks[name]) FX.hooks[name](a, b, c); }
  FX.reset = function () { FX.marks = []; FX.coins = []; FX.parts = []; FX.shots = []; FX.beams = []; FX.nums = []; FX.rings = []; FX.meteors = []; FX.shake = 0; };
  FX.particle = function (room, p) { if (!(on(room) || inV(p.x, p.y)) || FX.parts.length > 700) return; p.max = p.life; FX.parts.push(p); };
  function burst(room, x, y, n, col, sp, life, size, type) {
    if (!on(room) && !inV(x, y)) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7);
      FX.particle(room, { x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8), color: typeof col === 'string' ? col : col[(Math.random() * col.length) | 0], type: type || 'spark', grav: type === 'debris' ? 300 : 0 });
    }
  }
  FX.burst = burst;
  function num(room, x, y, text, color, big) {
    if (!on(room) && !inV(x, y)) return;
    if (FX.nums.length > 60) FX.nums.shift();
    FX.nums.push({ x: x + (Math.random() - 0.5) * 10, y: y, text: text, color: color || '#fff', life: big ? 1.6 : 0.8, max: big ? 1.6 : 0.8, big: big });
  }
  function fmt(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1000 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + ''; }
  FX.fmt = fmt;

  // ---- hooks called from the simulation ----
  var api = {
    claim: function (room, p) { hook('claim', room, p); A.sfx('claim'); },
    event: function (type, d) { hook('event', type, d); },
    place: function (room, t) { if (on(room)) { burst(room, t.px, t.py, 14, ['#fff', G.RAR[t.item.rarity].color], 90, 0.5, 3); FX.rings.push({ x: t.px, y: t.py, r: 6, max: 30, life: 0.4, col: G.RAR[t.item.rarity].color }); A.sfx('place'); } },
    upgrade: function (room, t) {
      hook('upgrade', room, t);
      if (!on(room)) return;
      var tier = G.towerTier ? G.towerTier(t) : 0, col = G.RAR[t.item.rarity].color;
      burst(room, t.px, t.py - 10, 18 + tier * 2, ['#ffd23f', '#fff', col], 120, 0.6, 3);
      FX.rings.push({ x: t.px, y: t.py, r: 6, max: 26 + tier * 2, life: 0.45, col: col });
      num(room, t.px, t.py - 26, tier >= 10 ? '👑 MAX LOOK!' : 'LV ' + tier + '!', '#ffd23f', tier === 5 || tier === 10);
      if (tier === 5 || tier === 10) { FX.rings.push({ x: t.px, y: t.py, r: 4, max: 60, life: 0.5, col: '#ffffff', fill: true }); FX.shake = Math.max(FX.shake, 3); }
      A.sfx('upgrade');
    },
    sell: function (room, t, v) { if (on(room)) { num(room, t.px, t.py - 20, '+$' + fmt(v), '#7dff7d'); burst(room, t.px, t.py, 10, '#aaa', 80, 0.5, 3, 'smoke'); A.sfx('cash'); } },
    doorUpgrade: function (room) { if (on(room)) { var d = room.def.door; burst(room, d.x * T + 20, d.y * T + 10, 26, ['#ffd23f', '#fff', G.doorTier(room.door.lvl).trim], 140, 0.7, 3.5); num(room, d.x * T + 20, d.y * T - 20, G.doorTier(room.door.lvl).name, '#ffd23f', true); A.sfx('upgrade'); } },
    bossIncoming: function (room, b, p) { hook('bossIncoming', room, b, p); },
    wave: function (n) { hook('wave', n); },
    bossSpawn: function (room, z) { hook('bossSpawn', room, z); if (inV(z.x, z.y)) { FX.shake = 12; A.sfx('roar'); } },
    text: function (room, x, y, txt, col, big) { if (inV(x, y)) FX.nums.push({ x: x, y: y, text: txt, color: col || '#fff', life: big ? 1.6 : 0.8, max: big ? 1.6 : 0.8, big: big }); },
    hit: function (room, z, amt, col, small) {
      if (!inV(z.x, z.y)) return;
      if (small && Math.random() < 0.7) return;
      if (!small && amt < 12 && Math.random() < 0.8) return;
      num(room, z.x, z.y - z.size * 22, fmt(amt), col || (amt > 200 ? '#ffd23f' : '#fff'), amt > 1000);
      if (!small) burst(room, z.x, z.y - z.size * 10, 2, shadeGreen(z), 60, 0.3, 2);
    },
    cash: function (room, x, y, v, farm, blood) { if (inV(x, y)) { num(room, x, y - 10, (blood ? '🩸' : '') + '+$' + fmt(v), farm ? '#7dff7d' : blood ? '#ff8a8a' : '#c8ff9a'); if (!farm) FX.coins.push({ x: x, y: y - 10, t: 0 }); if (farm) { burst(room, x, y, 4, '#ffd23f', 50, 0.6, 2.5, 'coin'); A.sfx('cash', 0.5); } } },
    kill: function (room, z, src) {
      if (!inV(z.x, z.y)) return;
      var ke = src && src.cos && src.cos.kill;
      if (ke === 'sparks') burst(room, z.x, z.y - 14, 18, ['#ffd23f', '#fff', '#ffae42'], 160, 0.6, 3);
      if (ke === 'souls') for (var si = 0; si < 3; si++) FX.particle(room, { x: z.x + (si - 1) * 8, y: z.y - 10, vx: (si - 1) * 10, vy: -50, life: 1.2, size: 6, color: 'rgba(200,170,255,.8)', type: 'ghost' });
      if (ke === 'prism') burst(room, z.x, z.y - 14, 24, ['#ff5ad8', '#5ad8ff', '#ffe65a', '#7dff9a'], 180, 0.7, 3);
      burst(room, z.x, z.y - 10, z.isBoss ? 60 : 10, [z.color, '#4a2', '#2a1'], z.isBoss ? 220 : 100, 0.6, z.isBoss ? 5 : 3, 'debris');
      FX.parts.push({ x: z.x, y: z.y + 2, vx: 0, vy: 0, life: 4, max: 4, size: 7 * z.size, color: 'rgba(60,90,30,.5)', type: 'splat' });
      if (z.type === 'golden') burst(room, z.x, z.y, 20, '#ffd700', 120, 0.8, 3, 'coin');
      A.sfx('pop', 0.6);
    },
    freeze: function (room, t) { if (on(room)) burst(room, t.px, t.py - 8, 10, ['#bff', '#fff'], 70, 0.6, 3); },
    bossDeath: function (room, z, p) { hook('bossDeath', room, z, p); if (on(room)) { FX.shake = 18; FX.flash = 0.4; FX.flashCol = '#fff'; api.explosion(room, z.x, z.y, 80, '#ffd23f', true); } },
    door: function (room, amt) { if (on(room)) { var d = room.def.door; if (Math.random() < 0.5) num(room, d.x * T + 20, d.y * T, '-' + fmt(amt), '#ff5050'); burst(room, d.x * T + 20, d.y * T + 10, 3, ['#8b5a2b', '#ccc'], 70, 0.4, 2.5, 'debris'); FX.shake = Math.max(FX.shake, 2); A.sfx('thud', 0.6); } hook('door', room, amt); },
    eliminated: function (room, p) { hook('eliminated', room, p); if (on(room)) { FX.shake = 20; api.explosion(room, room.def.door.x * T + 20, room.def.door.y * T + 20, 70, '#ff4040', true); } },
    explosion: function (room, x, y, r, col, big) {
      if (!inV(x, y)) return;
      FX.rings.push({ x: x, y: y, r: 4, max: r, life: 0.35, col: col, fill: true });
      burst(room, x, y, big ? 40 : 16, [col, '#ffd23f', '#fff'], r * 3, 0.5, big ? 5 : 3.5);
      burst(room, x, y, big ? 14 : 6, 'rgba(80,80,80,.6)', r * 1.5, 1, 8, 'smoke');
      FX.shake = Math.max(FX.shake, big ? 10 : 3);
      A.sfx(big ? 'boom' : 'boomS');
    },
    heal: function (room, z) { if (inV(z.x, z.y)) FX.rings.push({ x: z.x, y: z.y - 10, r: 4, max: 1.8 * T, life: 0.5, col: '#5f5' }); },
    bossCast: function (room, z, txt) { if (inV(z.x, z.y)) { num(room, z.x, z.y - 70, txt, '#ff5a5a', true); A.sfx('roar', 0.5); } hook('bossCast', room, z, txt); },
    emp: function (room, z, r) { if (inV(z.x, z.y)) { FX.rings.push({ x: z.x, y: z.y, r: 4, max: r, life: 0.6, col: '#2ad4ff', fill: true }); A.sfx('zap'); } },
    nova: function (room, z, r, col) { if (inV(z.x, z.y)) FX.rings.push({ x: z.x, y: z.y, r: 4, max: r, life: 0.6, col: col, fill: true }); },
    shot: function (room, t, tx, ty, kind, dur) {
      if (!on(room)) return;
      var a = Math.atan2(ty - t.py, tx - t.px), sx = t.px + Math.cos(a) * 14, sy = t.py - 7 + Math.sin(a) * 14;
      if (t.drone) { sx = t.px; sy = t.py; }
      if (kind === 'hitscan') { FX.beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, life: 0.12, max: 0.12, col: '#fff7c0', w: 2 }); A.sfx('snipe'); }
      else FX.shots.push({ x: sx, y: sy, sx: sx, sy: sy, tx: tx, ty: ty, t: 0, dur: dur || (kind === 'plasma' ? 0.16 : 0.08), kind: kind });
      if (kind !== 'pellet' || Math.random() < 0.3) FX.parts.push({ x: sx, y: sy, vx: 0, vy: 0, life: 0.06, max: 0.06, size: kind === 'kaiju' ? 14 : 6, color: '#fff3a0', type: 'flash' });
      A.sfx(kind === 'rocket' || kind === 'kaiju' ? 'launch' : kind === 'frost' ? 'ice' : kind === 'plasma' ? 'plasma' : kind === 'drone' ? 'blip' : 'shoot', 0.5);
    },
    flame: function (room, t, range, kind) {
      if (!on(room)) return;
      var spray = kind === 'spray', drg = kind === 'dragon', n = drg ? 7 : 4;
      for (var i = 0; i < n; i++) { var a = t.angle + (Math.random() - 0.5) * (drg ? 0.7 : 0.9), v = range * 3 * (0.5 + Math.random() * 0.5); FX.particle(room, { x: t.px + Math.cos(t.angle) * 12, y: t.py - 7 + Math.sin(t.angle) * 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.32, size: (drg ? 7 : 5) + Math.random() * 4, color: spray ? ['#9f3', '#cf6', '#6c3'][i % 3] : drg ? ['#ff3a1a', '#ff7a1a', '#ffd23f', '#fff3a0'][i % 4] : ['#ff7a1a', '#ffd23f', '#ff3a1a'][i % 3], type: spray ? 'smoke' : 'fire' }); }
      A.sfx('flame', 0.3);
    },
    beam: function (room, x1, y1, x2, y2, col, w) { if (on(room)) { FX.beams.push({ x1: x1, y1: y1, x2: x2, y2: y2, life: 0.18, max: 0.18, col: col, w: w }); A.sfx('laser', 0.6); } },
    chain: function (room, pts, col) { if (on(room)) { FX.beams.push({ pts: pts, life: 0.2, max: 0.2, col: col, w: 2, zig: true }); A.sfx('zap', 0.5); } },
    meteor: function (room, x, y, delay) { if (on(room)) { FX.meteors.push({ x: x, y: y, t: 0, dur: delay }); A.sfx('whoosh'); } },
    vortex: function (room) { if (on(room)) A.sfx('vortex'); },
    timeslow: function (room, t) { if (on(room)) { FX.rings.push({ x: t.px, y: t.py, r: 4, max: 900, life: 1, col: '#9cf', fill: true }); hook('banner', '⏳ TIME SLOW', '#9cf'); A.sfx('vortex'); } },
    shield: function (room) { if (on(room)) { var d = room.def.door; FX.rings.push({ x: d.x * T + 20, y: d.y * T + 10, r: 4, max: 40, life: 0.5, col: '#8cf', fill: true }); A.sfx('upgrade', 0.5); } },
    bless: function (room, t) { if (on(room)) { FX.rings.push({ x: t.px, y: t.py, r: 4, max: 900, life: 1.2, col: '#ffd23f', fill: true }); hook('banner', '✨ DIVINE BLESSING', '#ffd23f'); A.sfx('summon'); } },
    genesis: function (room, t) { if (on(room)) { FX.flash = 0.6; FX.flashCol = '#fffbe0'; FX.shake = 16; room.zombies.forEach(function (z) { FX.beams.push({ x1: z.x, y1: -20, x2: z.x, y2: z.y, life: 0.5, max: 0.5, col: '#fff2a0', w: 8 }); }); hook('banner', '🌟 GENESIS BEAM', '#fff2a0'); A.sfx('boom'); } },
    rewrite: function (room, t, vic) { if (on(room)) { vic.forEach(function (z) { burst(room, z.x, z.y - 10, 8, ['#f0f', '#0ff', '#28ffd5'], 80, 0.4, 3); }); A.sfx('glitch'); } },
    wallBreak: function (room, w) { if (on(room)) { burst(room, w.px, w.py, 20, ['#b5653a', '#7a3a20', '#ccc'], 140, 0.7, 4, 'debris'); A.sfx('boomS'); } },
    finished: function (p) { hook('finished', p); },
    evolve: function (room, t, nx) {
      hook('evolve', room, t, nx);
      if (!inV(t.px, t.py)) return;
      FX.rings.push({ x: t.px, y: t.py, r: 4, max: 90, life: 0.5, col: '#ffffff', fill: true });
      FX.rings.push({ x: t.px, y: t.py, r: 4, max: 60, life: 0.5, col: G.RAR[t.item.rarity].color });
      burst(room, t.px, t.py - 10, 50, ['#fff', '#ffd23f', G.RAR[t.item.rarity].color], 220, 0.9, 4);
      for (var i = 0; i < 8; i++) FX.beams.push({ x1: t.px, y1: t.py, x2: t.px + Math.cos(i * 0.785) * 70, y2: t.py + Math.sin(i * 0.785) * 70, life: 0.5, max: 0.5, col: '#fff7c0', w: 4 });
      num(room, t.px, t.py - 40, '✨ ' + nx.name + '!', '#ffd23f', true);
      FX.flash = Math.max(FX.flash, 0.15); FX.flashCol = '#fffbe0'; FX.shake = Math.max(FX.shake, 6);
      A.sfx('summon');
    },
    slash: function (room, t, z) { if (!inV(z.x, z.y)) return; FX.beams.push({ x1: z.x - 16, y1: z.y - 30, x2: z.x + 16, y2: z.y + 2, life: 0.2, max: 0.2, col: '#c58bff', w: 4 }); FX.beams.push({ x1: z.x + 16, y1: z.y - 30, x2: z.x - 16, y2: z.y + 2, life: 0.2, max: 0.2, col: '#ffffff', w: 2 }); burst(room, z.x, z.y - 14, 8, '#c58bff', 90, 0.4, 3); A.sfx('zap', 0.4); },
    orbital: function (room, x, y, delay) { if (!inV(x, y)) return; FX.marks.push({ x: x, y: y, t: 0, dur: delay, col: '#9ef' }); A.sfx('laser'); },
    repair: function (room, t) { if (!inV(t.px, t.py)) return; var d = room.def.doorPx; FX.beams.push({ x1: t.px, y1: t.py - 10, x2: d.x, y2: d.y, life: 0.4, max: 0.4, col: '#7dff9a', w: 3 }); burst(room, d.x, d.y, 14, ['#7dff9a', '#fff'], 90, 0.6, 3); num(room, d.x, d.y - 26, '🔧 +HP', '#7dff9a'); },
    nuke: function (room, x, y, r) { if (!inV(x, y)) return; FX.flash = 0.5; FX.flashCol = '#eaffc0'; FX.shake = 20; FX.rings.push({ x: x, y: y, r: 4, max: r * 1.6, life: 1, col: '#d7ff5a', fill: true }); burst(room, x, y - 20, 40, ['#555', '#777', '#9dff5a'], 160, 1.6, 10, 'smoke'); },
    portal: function (room, x0, y0, x1, y1) { if (inV(x0, y0)) { FX.rings.push({ x: x0, y: y0, r: 2, max: 26, life: 0.5, col: '#b05aff', fill: true }); burst(room, x0, y0, 8, '#d9a8ff', 70, 0.4, 3); } if (inV(x1, y1)) FX.rings.push({ x: x1, y: y1, r: 26, max: 2, life: 0.5, col: '#7a3aff', fill: true }); A.sfx('vortex', 0.4); },
    rift: function (room, pts) { if (!pts.length || !inV(pts[0].x, pts[0].y)) return; FX.beams.push({ pts: pts, life: 0.6, max: 0.6, col: '#e08bff', w: 3, zig: true }); pts.forEach(function (p) { FX.rings.push({ x: p.x, y: p.y, r: 3, max: 18, life: 0.5, col: '#e08bff' }); }); A.sfx('glitch', 0.5); },
    bolt: function (room, x, y) { if (!inV(x, y)) return; var pts = [{ x: x + (Math.random() - 0.5) * 40, y: y - 260 }]; for (var i = 1; i < 6; i++) pts.push({ x: x + (Math.random() - 0.5) * 30 * (1 - i / 6), y: y - 260 + i * 52 }); pts.push({ x: x, y: y }); FX.beams.push({ pts: pts, life: 0.25, max: 0.25, col: '#e8f4ff', w: 4 }); burst(room, x, y, 8, ['#fff', '#9cf'], 90, 0.3, 3); FX.flash = Math.max(FX.flash, 0.05); FX.flashCol = '#dfeaff'; A.sfx('zap', 0.6); },
    worldEnd: function (room, t, r) { if (!inV(t.px, t.py)) return; FX.flash = 0.8; FX.flashCol = '#ff3030'; FX.shake = 28; FX.rings.push({ x: t.px, y: t.py, r: 4, max: r, life: 1.2, col: '#ff3030', fill: true }); FX.rings.push({ x: t.px, y: t.py, r: 4, max: r * 0.6, life: 0.8, col: '#000000', fill: true }); hook('banner', '☄ WORLD ENDER', '#ff5050'); A.sfx('boom'); }
  };
  FX.api = api;
  function shadeGreen(z) { return z.isBoss ? '#a22' : '#5a3'; }

  FX.update = function (dt) {
    FX.shake = Math.max(0, FX.shake - dt * 30);
    FX.flash = Math.max(0, FX.flash - dt);
    var i, p;
    for (i = FX.parts.length - 1; i >= 0; i--) {
      p = FX.parts[i]; p.life -= dt;
      if (p.life <= 0) { FX.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) p.vy += p.grav * dt;
      if (p.type === 'fire' || p.type === 'smoke') { p.vx *= 0.92; p.vy *= 0.92; p.vy -= 20 * dt; }
      if (p.type === 'spark' || p.type === 'coin') { p.vx *= 0.94; p.vy = p.vy * 0.94 + 80 * dt; }
    }
    for (i = FX.shots.length - 1; i >= 0; i--) { p = FX.shots[i]; p.t += dt; if (p.t >= p.dur) FX.shots.splice(i, 1); }
    for (i = FX.beams.length - 1; i >= 0; i--) { p = FX.beams[i]; p.life -= dt; if (p.life <= 0) FX.beams.splice(i, 1); }
    for (i = FX.nums.length - 1; i >= 0; i--) { p = FX.nums[i]; p.life -= dt; p.y -= dt * (p.big ? 22 : 34); if (p.life <= 0) FX.nums.splice(i, 1); }
    for (i = FX.rings.length - 1; i >= 0; i--) { p = FX.rings[i]; p.life -= dt; if (p.life <= 0) FX.rings.splice(i, 1); }
    for (i = FX.meteors.length - 1; i >= 0; i--) { p = FX.meteors[i]; p.t += dt; if (p.t >= p.dur) FX.meteors.splice(i, 1); }
    for (i = FX.marks.length - 1; i >= 0; i--) { p = FX.marks[i]; p.t += dt; if (p.t >= p.dur) FX.marks.splice(i, 1); }
    for (i = FX.coins.length - 1; i >= 0; i--) { p = FX.coins[i]; p.t += dt; if (p.t >= 0.7) FX.coins.splice(i, 1); }
  };

  FX.ambient = function (c, map, dt, W, H) {
    FX.amb = FX.amb || [];
    var a = FX.amb, n = map.particle === 'snow' ? 90 : 45;
    while (a.length < n) a.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), ph: Math.random() * 6 });
    a.forEach(function (p) {
      if (map.particle === 'snow') { p.y += (20 + p.s * 30) * dt; p.x += Math.sin(R0() + p.ph) * 12 * dt; c.fillStyle = 'rgba(255,255,255,' + (0.4 + p.s * 0.5) + ')'; c.fillRect(p.x, p.y, 1.5 + p.s * 2, 1.5 + p.s * 2); }
      else if (map.particle === 'ember') { p.y -= (14 + p.s * 24) * dt; p.x += Math.sin(R0() * 2 + p.ph) * 10 * dt; c.fillStyle = 'rgba(255,' + (90 + (p.s * 120 | 0)) + ',30,' + (0.4 + p.s * 0.5) + ')'; c.fillRect(p.x, p.y, 2, 2); }
      else { p.x += (8 + p.s * 10) * dt; p.y += Math.sin(R0() + p.ph) * 4 * dt; c.fillStyle = 'rgba(220,200,170,' + (0.12 + p.s * 0.2) + ')'; c.fillRect(p.x, p.y, 2, 2); }
      if (p.y > H + 10) p.y = -5; if (p.y < -10) p.y = H + 5; if (p.x > W + 5) p.x = -5; if (p.x < -10) p.x = W;
    });
  };
  function R0() { return G.R.time; }

  FX.draw = function (c) {
    var i, p;
    FX.rings.forEach(function (r) {
      var f = 1 - r.life / (r.max > 100 ? 1 : 0.5); f = Math.min(1, Math.max(0, f));
      var rad = r.r + (r.max - r.r) * (1 - r.life / ((r.max > 100) ? 1.2 : 0.5));
      rad = Math.max(1, Math.min(r.max, rad));
      c.globalAlpha = Math.max(0, r.life * 2);
      if (r.fill) { c.fillStyle = r.col; c.globalAlpha *= 0.25; c.beginPath(); c.arc(r.x, r.y, rad, 0, TAU); c.fill(); c.globalAlpha = Math.max(0, r.life * 2); }
      c.strokeStyle = r.col; c.lineWidth = 3; c.beginPath(); c.arc(r.x, r.y, rad, 0, TAU); c.stroke();
      c.globalAlpha = 1;
    });
    FX.parts.forEach(function (p) {
      var f = p.life / p.max;
      c.globalAlpha = Math.min(1, f * 1.5);
      if (p.type === 'splat') { c.globalAlpha = f * 0.8; c.fillStyle = p.color; c.beginPath(); c.ellipse(p.x, p.y, p.size, p.size * 0.45, 0, 0, TAU); c.fill(); }
      else if (p.type === 'smoke') { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (1.5 - f * 0.5), 0, TAU); c.fill(); }
      else if (p.type === 'flash') { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); }
      else if (p.type === 'fire') { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * f + 1, 0, TAU); c.fill(); }
      else if (p.type === 'coin') { c.fillStyle = p.color; c.beginPath(); c.ellipse(p.x, p.y, p.size, p.size * Math.abs(Math.sin(p.life * 12)) + 0.5, 0, 0, TAU); c.fill(); }
      else if (p.type === 'ghost') { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, Math.PI, 0); c.lineTo(p.x + p.size, p.y + p.size); c.lineTo(p.x - p.size, p.y + p.size); c.fill(); }
      else if (p.type === 'bubble') { c.strokeStyle = p.color; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.stroke(); }
      else { c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    });
    c.globalAlpha = 1;
    FX.shots.forEach(function (s) {
      var f = s.t / s.dur, x = s.sx + (s.tx - s.sx) * f, y = s.sy + (s.ty - s.sy) * f;
      if (s.kind === 'mortar' || s.kind === 'nuke') { var ar = Math.sin(f * Math.PI) * (s.kind === 'nuke' ? 160 : 90); y -= ar; c.fillStyle = s.kind === 'nuke' ? '#d7ff5a' : '#4a4a3a'; c.beginPath(); c.arc(x, y, s.kind === 'nuke' ? 9 : 5, 0, TAU); c.fill(); if (s.kind === 'nuke') { c.strokeStyle = '#222'; c.lineWidth = 2; c.stroke(); } }
      else if (s.kind === 'boomerang') { var bf = f < 0.5 ? f * 2 : 2 - f * 2, bx = s.sx + (s.tx - s.sx) * bf, by = s.sy + (s.ty - s.sy) * bf; c.save(); c.translate(bx, by); c.rotate(s.t * 25); c.strokeStyle = '#c9a24a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-9, 0); c.lineTo(0, -6); c.lineTo(9, 0); c.stroke(); c.restore(); }
      else if (s.kind === 'rocket' || s.kind === 'kaiju') { var arc = Math.sin(f * Math.PI) * (s.kind === 'kaiju' ? 40 : 20); y -= arc; c.fillStyle = s.kind === 'kaiju' ? '#7dff4a' : '#ddd'; c.beginPath(); c.arc(x, y, s.kind === 'kaiju' ? 8 : 3.5, 0, TAU); c.fill(); FX.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: s.kind === 'kaiju' ? 7 : 3, color: 'rgba(200,200,200,.5)', type: 'smoke' }); }
      else if (s.kind === 'plasma') { c.fillStyle = 'rgba(220,140,255,.5)'; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); }
      else if (s.kind === 'frost') { c.fillStyle = '#bff'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
      else if (s.kind === 'poison') { c.fillStyle = '#9f3'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
      else { var px2 = s.sx + (s.tx - s.sx) * Math.max(0, f - 0.25), py2 = s.sy + (s.ty - s.sy) * Math.max(0, f - 0.25); c.strokeStyle = s.kind === 'drone' ? '#9ff' : '#ffe680'; c.lineWidth = s.kind === 'pellet' ? 1.5 : 2; c.beginPath(); c.moveTo(px2, py2); c.lineTo(x, y); c.stroke(); }
    });
    FX.beams.forEach(function (b) {
      var f = b.life / b.max;
      c.globalAlpha = f; c.strokeStyle = b.col; c.lineWidth = b.w * (0.5 + f); c.lineCap = 'round';
      c.shadowColor = b.col; c.shadowBlur = 8;
      c.beginPath();
      if (b.pts) {
        c.moveTo(b.pts[0].x, b.pts[0].y);
        for (var k = 1; k < b.pts.length; k++) {
          var a = b.pts[k - 1], q = b.pts[k];
          for (var s = 1; s <= 4; s++) { var u = s / 4; c.lineTo(a.x + (q.x - a.x) * u + (s < 4 ? (Math.random() - 0.5) * 12 : 0), a.y + (q.y - a.y) * u + (s < 4 ? (Math.random() - 0.5) * 12 : 0)); }
        }
      } else { c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); }
      c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1; c.lineCap = 'butt';
    });
    FX.meteors.forEach(function (m) {
      var f = m.t / m.dur, x = m.x - 160 * (1 - f), y = m.y - 300 * (1 - f);
      c.fillStyle = 'rgba(255,80,0,.25)'; c.beginPath(); c.arc(m.x, m.y, 30 * f + 5, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,200,80,.6)'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 30, y - 50); c.stroke();
      c.fillStyle = '#ff6a00'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    });
    FX.marks.forEach(function (m) {
      var f = m.t / m.dur;
      c.strokeStyle = m.col; c.lineWidth = 2; c.globalAlpha = 0.8;
      c.beginPath(); c.arc(m.x, m.y, 26 - f * 18, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(m.x - 30, m.y); c.lineTo(m.x + 30, m.y); c.moveTo(m.x, m.y - 30); c.lineTo(m.x, m.y + 30); c.stroke();
      c.globalAlpha = 0.25 + f * 0.4; c.fillStyle = m.col; c.fillRect(m.x - 3, m.y - 400, 6, 400); c.globalAlpha = 1;
    });
    FX.coins.forEach(function (o) {
      var f = o.t / 0.7;
      for (var k = 0; k < 3; k++) { c.globalAlpha = 1 - f; c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(o.x + (k - 1) * 9 * f, o.y - 34 * f - k * 4, 4, 4 * Math.abs(Math.cos(o.t * 14 + k)), 0, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    });
    c.textAlign = 'center';
    FX.nums.forEach(function (n) {
      var f = n.life / n.max, sc = n.big ? 1 + (1 - f) * 0.2 : 1;
      c.globalAlpha = Math.min(1, f * 2);
      c.font = 'bold ' + Math.round((n.big ? 15 : 11) * sc) + 'px Fredoka, sans-serif';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(n.text, n.x, n.y); c.fillStyle = n.color; c.fillText(n.text, n.x, n.y);
    });
    c.globalAlpha = 1;
  };

  // ===================================================================
  //  AUDIO — synthesized SFX + procedural music per map
  // ===================================================================
  var A = G.Audio = { ctx: null, master: null, sfxGain: null, musicGain: null, on: true, musicOn: true, last: {}, track: null, step: 0, nextT: 0 };
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.6; A.master.connect(A.ctx.destination);
      A.sfxGain = A.ctx.createGain(); A.sfxGain.gain.value = A.on ? 0.5 : 0; A.sfxGain.connect(A.master);
      A.musicGain = A.ctx.createGain(); A.musicGain.gain.value = A.musicOn ? 0.22 : 0; A.musicGain.connect(A.master);
      var len = A.ctx.sampleRate * 1, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noise = buf;
      setInterval(A.tick, 50);
    } catch (e) { A.ctx = null; }
  };
  A.setSfx = function (v) { A.on = v; if (A.sfxGain) A.sfxGain.gain.value = v ? 0.5 : 0; };
  A.setMusic = function (v) { A.musicOn = v; if (A.musicGain) A.musicGain.gain.value = v ? 0.22 : 0; };
  function tone(type, f1, f2, dur, vol, dest, when) {
    var c = A.ctx, t = when || c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || A.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, dest, when, type) {
    var c = A.ctx, t = when || c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise; f.type = type || 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || A.sfxGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  var GAP = { shoot: 0.05, pop: 0.06, cash: 0.08, thud: 0.12, zap: 0.08, laser: 0.08, flame: 0.12, blip: 0.06, snipe: 0.06 };
  A.sfx = function (name, vol) {
    if (!A.ctx || !A.on) return;
    var now = A.ctx.currentTime;
    if (A.last[name] && now - A.last[name] < (GAP[name] || 0.04)) return;
    A.last[name] = now; vol = vol || 1;
    switch (name) {
      case 'shoot': tone('square', 900, 300, 0.05, 0.05 * vol); break;
      case 'snipe': tone('sawtooth', 1400, 200, 0.12, 0.08 * vol); noise(0.08, 0.08 * vol, 3000); break;
      case 'blip': tone('square', 1500, 900, 0.03, 0.03 * vol); break;
      case 'ice': tone('sine', 1800, 900, 0.08, 0.06 * vol); break;
      case 'plasma': tone('sawtooth', 300, 900, 0.18, 0.07 * vol); break;
      case 'launch': noise(0.25, 0.12 * vol, 800); tone('sawtooth', 200, 80, 0.2, 0.05 * vol); break;
      case 'boom': noise(0.7, 0.35 * vol, 400); tone('sine', 120, 30, 0.6, 0.3 * vol); break;
      case 'boomS': noise(0.3, 0.15 * vol, 700); tone('sine', 160, 50, 0.25, 0.1 * vol); break;
      case 'zap': tone('sawtooth', 2000, 400, 0.1, 0.05 * vol); noise(0.08, 0.05 * vol, 5000, null, null, 'highpass'); break;
      case 'laser': tone('square', 1200, 1600, 0.1, 0.04 * vol); break;
      case 'flame': noise(0.2, 0.06 * vol, 1200, null, null, 'bandpass'); break;
      case 'pop': tone('triangle', 400, 120, 0.08, 0.06 * vol); break;
      case 'cash': tone('square', 1318, 0, 0.06, 0.03 * vol); tone('square', 1976, 0, 0.12, 0.03 * vol, null, A.ctx.currentTime + 0.06); break;
      case 'thud': tone('sine', 140, 60, 0.12, 0.12 * vol); noise(0.08, 0.06 * vol, 500); break;
      case 'place': tone('triangle', 500, 900, 0.1, 0.1 * vol); break;
      case 'upgrade': [523, 659, 784, 1046].forEach(function (f, i) { tone('triangle', f, 0, 0.12, 0.07 * vol, null, A.ctx.currentTime + i * 0.05); }); break;
      case 'claim': [392, 523, 659].forEach(function (f, i) { tone('square', f, 0, 0.12, 0.05 * vol, null, A.ctx.currentTime + i * 0.07); }); break;
      case 'roar': tone('sawtooth', 110, 55, 0.9, 0.15 * vol); noise(0.8, 0.12 * vol, 300); break;
      case 'whoosh': noise(0.6, 0.12 * vol, 1500, null, null, 'bandpass'); break;
      case 'vortex': tone('sine', 80, 400, 0.8, 0.12 * vol); break;
      case 'glitch': for (var i = 0; i < 4; i++) tone('square', 200 + Math.random() * 1500, 0, 0.04, 0.04 * vol, null, A.ctx.currentTime + i * 0.04); break;
      case 'click': tone('triangle', 700, 500, 0.05, 0.06 * vol); break;
      case 'wave': [330, 440].forEach(function (f, i) { tone('sawtooth', f, 0, 0.25, 0.06 * vol, null, A.ctx.currentTime + i * 0.15); }); break;
      case 'summon': [523, 659, 784, 988, 1175, 1568].forEach(function (f, i) { tone('triangle', f, 0, 0.2, 0.07 * vol, null, A.ctx.currentTime + i * 0.06); }); break;
      case 'reveal': tone('sine', 300, 1200, 0.5, 0.1 * vol); noise(0.4, 0.06 * vol, 4000, null, null, 'highpass'); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach(function (f, i) { tone('square', f, 0, 0.2, 0.05 * vol, null, A.ctx.currentTime + i * 0.12); }); break;
      case 'lose': [392, 349, 311, 262].forEach(function (f, i) { tone('sawtooth', f, 0, 0.35, 0.06 * vol, null, A.ctx.currentTime + i * 0.25); }); break;
      case 'error': tone('square', 200, 150, 0.12, 0.05 * vol); break;
      case 'alarm': var t0 = A.ctx.currentTime; for (var ai = 0; ai < 3; ai++) { tone('square', 880, 660, 0.16, 0.06 * vol, null, t0 + ai * 0.22); } break;
    }
  };
  // music: scale + tempo + timbre per map
  var TRACKS = {
    lobby:   { bpm: 92,  root: 57, scale: [0, 3, 5, 7, 10], prog: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', drums: 0.4 },
    city:    { bpm: 104, root: 52, scale: [0, 3, 5, 7, 10], prog: [0, 0, 5, 3], lead: 'square', bass: 'triangle', drums: 1 },
    frozen:  { bpm: 84,  root: 59, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 4, 5, 3], lead: 'sine', bass: 'sine', drums: 0.5 },
    volcano: { bpm: 132, root: 50, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 0, 6], lead: 'sawtooth', bass: 'sawtooth', drums: 1.2 },
    boss:    { bpm: 148, root: 48, scale: [0, 1, 3, 6, 7, 8], prog: [0, 1, 0, 5], lead: 'sawtooth', bass: 'square', drums: 1.4 }
  };
  A.music = function (name) { if (A.track === name) return; A.track = name; A.step = 0; if (A.ctx) A.nextT = A.ctx.currentTime + 0.1; };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  A.tick = function () {
    if (!A.ctx || !A.track || !A.musicOn) return;
    var tr = TRACKS[A.track]; if (!tr) return;
    var spb = 60 / tr.bpm / 2; // eighth notes
    while (A.nextT < A.ctx.currentTime + 0.2) {
      var s = A.step, bar = Math.floor(s / 8) % tr.prog.length, beat = s % 8, chordRoot = tr.root + tr.scale[tr.prog[bar] % tr.scale.length];
      var t = A.nextT, mg = A.musicGain;
      if (beat % 2 === 0) tone(tr.bass, mtof(chordRoot - 12), 0, spb * 1.8, 0.18, mg, t);
      var r = Math.sin(s * 12.9898) * 43758.5453; r = r - Math.floor(r);
      if (r < 0.55) { var deg = Math.floor(r * 10) % tr.scale.length; tone(tr.lead, mtof(tr.root + 12 + tr.scale[deg] + (r < 0.12 ? 12 : 0)), 0, spb * 0.9, tr.lead === 'sine' ? 0.12 : 0.05, mg, t); }
      if (beat === 0 || beat === 4) { tone('sine', 120, 40, 0.15, 0.3 * tr.drums, mg, t); }
      if (beat % 2 === 1 && tr.drums > 0.6) noise(0.04, 0.05 * tr.drums, 7000, mg, t, 'highpass');
      if ((beat === 2 || beat === 6) && tr.drums > 0.9) noise(0.12, 0.08 * tr.drums, 1500, mg, t, 'bandpass');
      if (beat === 0 && bar % 2 === 0) [0, 2, 4].forEach(function (k) { var deg2 = (tr.prog[bar] + k) % tr.scale.length; tone('triangle', mtof(tr.root + tr.scale[deg2]), 0, spb * 7, 0.035, mg, t); });
      A.nextT += spb; A.step++;
    }
  };
})();
