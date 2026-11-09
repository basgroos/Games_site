// =====================================================================
//  MAIN — game controller, camera, loop, input, lobby attract-mode
// =====================================================================
function boot() {
  var T = G.T, UI = G.UI, R = G.R, FX = G.FX, P = G.Profile;
  var WORLD_W = G.WCOLS * T, WORLD_H = G.WROWS * T, VIEW_FRACTION = 1 / 5;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var MP = G.MP;
  var Game = G.Game = { mode: 'solo', state: 'lobby', match: null, net: null, me: 0, speed: 1, paused: false, ui: { placing: null, hover: null, selTower: null, selDoor: false, marker: null },
    cam: { s: 1, x0: 0, y0: 0 }, camPos: { x: WORLD_W / 2, y: WORLD_H / 2 }, keys: {}, demo: null, ended: false };

  // ---------------------------------------------------------------------
  //  Match setup
  // ---------------------------------------------------------------------
  function botPlayers(diffId, n) {
    var styles = Object.keys(G.BOT_STYLES), names = G.BOT_NAMES.slice().sort(function () { return Math.random() - 0.5; });
    var pr = { easy: [0.15, 0.4], medium: [0.35, 0.65], hard: [0.55, 0.9], endless: [0.45, 0.85] }[diffId] || [0.2, 0.5];
    var out = [];
    for (var i = 0; i < n; i++) {
      var power = pr[0] + Math.random() * (pr[1] - pr[0]), lo = G.botLoadout(Math.random, power), stars = {};
      lo.forEach(function (id) { stars[id] = Math.floor(Math.random() * 3 * power); });
      out.push({ name: names[i], isBot: true, style: styles[(i + Math.floor(Math.random() * 5)) % styles.length], loadout: lo, stars: stars });
    }
    return out;
  }
  Game.botPlayers = botPlayers;
  // online: host or guest enters a networked match
  Game.startOnline = function (m, pid, role) {
    G.Audio.init();
    Game.mode = role; Game.match = m; Game.me = pid; Game.state = 'match'; Game.ended = false;
    Game.net = role === 'host' ? new G.LocalNet(m, pid) : { send: function (c) { return MP.clientSend(c); } };
    Game.ui = { placing: null, hover: null, selTower: null, selDoor: false, marker: null }; Game.speed = 1; Game.paused = false; Game.acc = 0;
    Game.camPos = { x: m.players[pid].pos.x, y: m.players[pid].pos.y };
    FX.reset(); FX.amb = null; Game.demo = null;
    UI.$('modal').classList.add('hidden'); UI.$('modal').innerHTML = '';
    UI.buildHUD();
    G.Audio.music(m.map.music);
    UI.banner('CLAIM EEN KAMER', '#ffd23f', 'Online potje • ' + m.map.name + ' • ' + m.diff.name);
  };
  Game.start = function (mapId, diffId, duo) {
    G.Audio.init(); Game.mode = 'solo'; MP.leave();
    var stars = {}; P.d.loadout.forEach(function (id) { stars[id] = P.stars(id); });
    var players = [{ name: P.d.name, isBot: false, loadout: P.d.loadout.slice(), stars: stars, cos: P.cosMap(), hat: P.d.hat }].concat(botPlayers(diffId, 7));
    if (duo) players[1].duoWith = 0;   // a bot buddy shares your room and wallet
    var m = new G.Match({ mapId: mapId, diffId: diffId, players: players, fx: FX.api, duo: !!duo });
    m.bots = players.map(function (p, i) { return p.isBot ? new G.Bot(m, i) : null; }).filter(Boolean);
    Game.match = m; Game.net = new G.LocalNet(m, 0); Game.me = 0; Game.state = 'match'; Game.ended = false;
    Game.ui = { placing: null, hover: null, selTower: null, selDoor: false, marker: null }; Game.speed = 1; Game.paused = false; Game.acc = 0;
    Game.camPos = { x: m.players[0].pos.x, y: m.players[0].pos.y };
    FX.reset(); FX.amb = null;
    Game.demo = null;
    UI.buildHUD();
    G.Audio.music(m.map.music);
    UI.banner('CLAIM EEN KAMER', '#ffd23f', 'Loop een vrije kamer binnen • ' + m.map.name + ' • ' + m.diff.name);
  };
  Game.goRoom = function (ri) { var r = Game.net.send({ type: 'goto', room: ri }); if (r.ok) G.Audio.sfx('click'); };
  Game.selectItem = function (id) {
    var m = Game.match, me = m.players[Game.me];
    if (m.phase === 'claim' || !me.alive) return;
    Game.ui.placing = Game.ui.placing === id ? null : id;
    Game.ui.selTower = null; Game.ui.selDoor = false;
    if (Game.ui.placing && !m.canBuild(me)) UI.toast('Loop naar je kamer om te bouwen — druk op <b>' + UI.keyName(UI.hk('home')) + '</b> om terug te lopen', '#ff9f1c');
  };
  Game.cycleSpeed = function () {
    if (Game.mode === 'client') { UI.toast('Alleen de host kan de snelheid aanpassen.'); return; }
    Game.speed = Game.speed >= 3 ? 1 : Game.speed + 1; UI.$('hSpeed').textContent = Game.speed + 'x';
  };
  Game.finish = function (left) {
    if (Game.ended) return;
    Game.ended = true;
    var m = Game.match, me = m.players[Game.me];
    if (left && me.alive && !me.finished) { me.alive = false; me.stats.waveReached = m.wave; }
    if (left && Game.mode === 'client') MP.leave();
    var rew = P.rewards(m, Game.me);
    P.recordMatch(m, Game.me, rew);
    UI.results(m, Game.me, rew);
  };
  Game.toLobby = function () {
    if (Game.mode !== 'solo') MP.leave();
    Game.mode = 'solo';
    Game.state = 'lobby'; Game.match = null; UI.$('modal').classList.add('hidden'); UI.$('modal').innerHTML = '';
    UI.$('hud').classList.add('hidden'); UI.$('hud').innerHTML = '';
    startDemo(); UI.showLobby(); G.Audio.music('lobby');
  };

  // ---------------------------------------------------------------------
  //  FX hooks → UI
  // ---------------------------------------------------------------------
  FX.hooks = {
    claim: function (room, p) {
      if (!Game.match) return;
      var m = Game.match, other = room.partner === p.id ? m.players[room.owner] : null;
      if (p.id === Game.me && other) UI.toast('🤝 Je deelt nu de <b>' + room.def.name + '</b> met <b>' + other.name + '</b> — samen één portemonnee!', '#7dff9a');
      else if (p.id === Game.me) UI.toast('🚪 Je hebt de <b>' + room.def.name + '</b> geclaimd! Dit is nu jouw basis.' + (m.duo ? ' (Duo: een maatje kan nog bij je komen)' : ''), '#ffd23f');
      else if (other && other.id === Game.me) UI.toast('🤝 <b>' + p.name + '</b> speelt nu samen met jou in jouw kamer!', '#7dff9a');
    },
    event: function (type, d) {
      if (!Game.match) return;
      var me = Game.match.players[Game.me];
      if (type === 'prep') UI.banner('BOUW JE VERDEDIGING', '#7dff9a', 'Eerste wave over 15 seconden');
      if (type === 'skip') UI.toast('⏭ Wave overgeslagen! Iedereen krijgt +$' + FX.fmt(d.bonus), '#3fa2ff');
      if (type === 'over' && Game.state === 'match' && !Game.ended && me.finished) setTimeout(function () { Game.finish(); }, 1200);
    },
    wave: function (n) {
      if (!Game.match) return;
      var tot = Game.match.totalWaves();
      UI.banner('WAVE ' + n, n % 5 === 0 ? '#ff6b6b' : '#ffffff', n === tot ? 'LAATSTE WAVE!' : n % 5 === 0 ? 'Boss wave!' : '');
      G.Audio.sfx('wave');
    },
    bossIncoming: function (room, b, p) {
      if (!Game.match) return;
      if (p.id === Game.me) UI.bossIntro(b, 'JOUW KAMER!');
      else UI.toast('👑 <b>' + b.name + '</b> komt naar de kamer van <b>' + p.name + '</b>! (klik in de lijst om erheen te lopen)', '#ff6b6b');
    },
    bossSpawn: function () { },
    bossDeath: function (room, z, p) {
      if (!Game.match || z.child) return;
      if (p && p.id === Game.me) UI.banner('BOSS VERSLAGEN!', '#ffd23f', z.name + ' • +$' + FX.fmt(z.reward));
      else if (p) UI.toast('⚔️ ' + p.name + ' versloeg ' + z.name + '!', '#ffd23f');
    },
    eliminated: function (room, p) {
      if (!Game.match) return;
      if (p.id === Game.me) {
        Game.ui.placing = null; Game.ui.selTower = null; Game.ui.selDoor = false;
        UI.banner('JE DEUR IS GEVALLEN', '#ff4d4d', 'Wave ' + Game.match.wave);
        setTimeout(function () { if (!Game.ended) UI.defeatPrompt(); }, 1800);
      } else UI.toast('💀 <b>' + p.name + '</b> is uitgeschakeld (wave ' + Game.match.wave + ')', '#ff4d4d');
    },
    finished: function (p) {
      if (!Game.match) return;
      if (p.id === Game.me) { UI.banner('VICTORY!', '#4cd964', 'Je hebt alle waves overleefd'); setTimeout(function () { Game.finish(); }, 2200); }
    },
    evolve: function (room, t, nx) {
      if (!Game.match) return;
      var me = Game.match.players[Game.me];
      if (room.index === me.room) { UI.banner('EVOLUTIE!', '#ffd23f', t.item.name + ' → ' + nx.name); UI.panelDirty(); }
    },
    upgrade: function (room) { if (Game.match && room.index === Game.match.players[Game.me].room) UI.panelDirty(); },
    banner: function (t, c) { UI.banner(t, c); },
    door: function () { }
  };

  // ---------------------------------------------------------------------
  //  Lobby attract mode: a bot match runs behind the menu, camera pans
  // ---------------------------------------------------------------------
  function startDemo() {
    var pl = botPlayers('medium', 8);
    var mapId = G.MAPS[(Math.random() * 3) | 0].id;
    var m = new G.Match({ mapId: mapId, diffId: 'endless', players: pl, fx: FX.api, claimTime: 1 });
    m.bots = pl.map(function (p, i) { return new G.Bot(m, i); });
    for (var i = 0; i < 30 * 45; i++) m.update(G.TICK);
    Game.demo = m; FX.reset(); FX.amb = null; Game.demoT = Math.random() * 100;
  }

  // ---------------------------------------------------------------------
  //  Camera: follows your avatar and shows ~1/5 of the map
  // ---------------------------------------------------------------------
  function layout(dt) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var s = Math.sqrt(W * H / (WORLD_W * WORLD_H * VIEW_FRACTION));
    if (Game.state !== 'match') s *= 1.15;
    s = Math.max(0.45, s);
    var vw = W / s, vh = H / s, target;
    if (Game.state === 'match') target = Game.match.players[Game.me].pos;
    else {
      Game.demoT = (Game.demoT || 0) + dt * 0.05;
      target = { x: WORLD_W / 2 + Math.cos(Game.demoT) * WORLD_W * 0.36, y: WORLD_H / 2 + Math.sin(Game.demoT * 1.7) * WORLD_H * 0.3 };
    }
    var k = Math.min(1, dt * 8);
    Game.camPos.x += (target.x - Game.camPos.x) * k; Game.camPos.y += (target.y - Game.camPos.y) * k;
    var cx = vw >= WORLD_W ? WORLD_W / 2 : Math.max(vw / 2, Math.min(WORLD_W - vw / 2, Game.camPos.x));
    var cy = vh >= WORLD_H ? WORLD_H / 2 : Math.max(vh / 2, Math.min(WORLD_H - vh / 2, Game.camPos.y));
    Game.cam = { s: s, x0: cx - vw / 2, y0: cy - vh / 2, vw: vw, vh: vh, dpr: dpr, W: W, H: H };
  }
  function toWorld(sx, sy) { var c = Game.cam; return { x: c.x0 + sx / c.s, y: c.y0 + sy / c.s }; }
  Game.toWorld = toWorld;

  // ---------------------------------------------------------------------
  //  Input
  // ---------------------------------------------------------------------
  cv.addEventListener('mousemove', function (e) {
    if (Game.state !== 'match') return;
    var w = toWorld(e.clientX, e.clientY);
    Game.ui.hover = { x: Math.floor(w.x / T), y: Math.floor(w.y / T) };
  });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); Game.ui.placing = null; });
  cv.addEventListener('pointerdown', function (e) {
    G.Audio.init();
    if (Game.state !== 'match' || e.button === 2) return;
    var m = Game.match, me = m.players[Game.me], w = toWorld(e.clientX, e.clientY);
    var tx = Math.floor(w.x / T), ty = Math.floor(w.y / T);
    Game.ui.hover = { x: tx, y: ty };
    var room = m.roomOf(me);
    if (m.phase !== 'claim' && me.alive && room) {
      if (Game.ui.placing) {
        var it = G.ITEM[Game.ui.placing];
        var valid = it.place === 'path' ? room.def.pathSet[tx + ',' + ty] : G.inRect(room.def.interior, tx, ty);
        if (valid) {
          var r = Game.net.send({ type: 'place', item: Game.ui.placing, x: tx, y: ty });
          if (!r.ok) { UI.toast(r.msg, '#ff4d4d'); G.Audio.sfx('error'); }
          else if (!e.shiftKey && (me.cash < it.cost || m.countPlaced(room, it.id) >= it.limit)) Game.ui.placing = null;
          return;
        }
      }
      var t = room.tile[tx + ',' + ty], d = room.def.door;
      if (Game.ui.build && !t && m.canBuild(me) && UI.buildPick(tx, ty, e.clientX, e.clientY)) return;
      Game.ui.buildPick = null; UI.hideBuildPick();
      if (t) { Game.ui.selTower = t.id; Game.ui.selDoor = false; Game.ui.placing = null; G.Audio.sfx('click'); UI.$('hPanel').dataset.k = ''; return; }
      if (tx === d.x && ty === d.y) { Game.ui.selDoor = true; Game.ui.selTower = null; Game.ui.placing = null; G.Audio.sfx('click'); UI.$('hPanel').dataset.k = ''; return; }
    }
    // otherwise: walk there
    Game.ui.selTower = null; Game.ui.selDoor = false; UI.$('hPanel').dataset.k = '';
    if (Game.net.send({ type: 'move', x: w.x, y: w.y }).ok) Game.ui.marker = { x: w.x, y: w.y, t: 1 };
  });
  window.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;   // never while typing
    var k = e.key.toLowerCase();
    if (UI.handleKey(e)) { updateKeys(); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) Game.keys[k] = true;
    if (Game.state !== 'match') return;
    if (k.indexOf('arrow') === 0) e.preventDefault();
    updateKeys();
  });
  window.addEventListener('keyup', function (e) { Game.keys[e.key.toLowerCase()] = false; UI.handleKeyUp(e); updateKeys(); });
  window.addEventListener('blur', function () { Game.keys = {}; updateKeys(); });
  function updateKeys() {
    if (Game.state !== 'match') return;
    var k = Game.keys, kx = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), ky = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    var me = Game.match.players[Game.me];
    if (kx !== me.kx || ky !== me.ky) Game.net.send({ type: 'keys', kx: kx, ky: ky });
  }

  // ---------------------------------------------------------------------
  //  Loop
  // ---------------------------------------------------------------------
  var last = performance.now(), musicT = 0, lastFrameT = performance.now(), lastBgT = performance.now();
  // game logic for one frame (also used while the tab is in the background)
  function stepLogic(m, dt, maxSteps) {
    if (Game.state === 'match' && Game.mode === 'client') MP.clientTick(dt);
    else if (Game.state === 'match') {
      if (Game.mode === 'host') Game.paused = false;
      if (!Game.paused) {
        Game.acc += dt * Game.speed;
        var steps = 0;
        while (Game.acc >= G.TICK && steps < maxSteps) { m.update(G.TICK); Game.acc -= G.TICK; steps++; }
        if (steps >= maxSteps) Game.acc = 0;
      }
      if (Game.mode === 'host') MP.hostTick(dt, Game.speed);
    } else m.update(dt);
    MP.hostLobbyTick(dt);
  }
  // A browser stops animation frames in a hidden tab. Online, the host must keep the match running
  // (and guests must keep talking), so a worker timer drives the logic whenever frames stop.
  function bgTick() {
    var now = performance.now(), dt = Math.min(1.5, (now - lastBgT) / 1000); lastBgT = now;
    if (now - lastFrameT < 400 || !(MP.role || Game.mode !== 'solo')) return;
    var m = Game.state === 'match' ? Game.match : null;
    if (m) stepLogic(m, dt, 60); else MP.hostLobbyTick(dt);
  }
  try {
    var wk = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(1)},50)'], { type: 'text/javascript' })));
    wk.onmessage = bgTick;
  } catch (e) { setInterval(bgTick, 100); }
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    R.time += dt;
    lastFrameT = performance.now();
    var m = Game.state === 'match' ? Game.match : Game.demo;
    if (m) {
      stepLogic(m, dt, 14);
      layout(dt);
      var c = Game.cam, view = { x0: c.x0, y0: c.y0, x1: c.x0 + c.vw, y1: c.y0 + c.vh };
      var vis = {}; R.visibleRooms(m, view).forEach(function (r) { vis[r.index] = true; }); FX.vis = vis; FX.viewRect = view;
      FX.update(Game.paused ? 0 : dt * (Game.state === 'match' ? Math.min(Game.speed, 2) : 1));
      if (Game.ui.marker) Game.ui.marker.t -= dt * 2;
      var sh = FX.shake ? FX.shake * 0.4 : 0, sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0d1017'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(c.dpr * c.s, 0, 0, c.dpr * c.s, c.dpr * (-c.x0 * c.s + sx), c.dpr * (-c.y0 * c.s + sy));
      var me = Game.state === 'match' ? m.players[Game.me] : null;
      R.drawWorld(ctx, m, view, Game.state === 'match' ? Game.ui : null, me);
      FX.draw(ctx);
      // screen-space overlays
      ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
      FX.ambient(ctx, m.map, Game.paused ? 0 : dt, c.W, c.H);
      var vg = ctx.createRadialGradient(c.W / 2, c.H / 2, Math.min(c.W, c.H) * 0.35, c.W / 2, c.H / 2, Math.max(c.W, c.H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, c.W, c.H);
      if (FX.flash > 0) { ctx.globalAlpha = Math.min(1, FX.flash * 2); ctx.fillStyle = FX.flashCol; ctx.fillRect(0, 0, c.W, c.H); ctx.globalAlpha = 1; }
      if (Game.state === 'match') {
        UI.updateHUD(dt, view);
        musicT -= dt;
        if (musicT <= 0) {
          musicT = 1;
          var boss = m.rooms.some(function (r) { return vis[r.index] && r.zombies.some(function (z) { return z.isBoss && !z.dead; }); });
          G.Audio.music(boss ? 'boss' : m.map.music);
        }
      }
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------
  //  Boot
  // ---------------------------------------------------------------------
  P.load();
  MP.hooks = {
    myInfo: function () { var st = {}; P.d.loadout.forEach(function (id) { st[id] = P.stars(id); }); return { name: P.d.name, loadout: P.d.loadout.slice(), stars: st, cos: P.cosMap(), hat: P.d.hat }; },
    toast: function (msg) { UI.toast(msg, '#3fa2ff'); },
    roster: function () { if (UI.renderOnline) UI.renderOnline(); },
    start: function (m, pid) { Game.startOnline(m, pid, 'client'); },
    kicked: function (msg) { if (Game.state === 'match' && Game.mode === 'client' && !Game.ended) Game.finish(); else if (UI.renderOnline) UI.renderOnline(); },
    hostEnded: function (msg) { if (Game.state === 'match' && Game.mode === 'client' && !Game.ended) { UI.toast(msg || 'De host heeft het potje beëindigd.', '#ff9f1c'); Game.finish(); } },
    hostLost: function () { if (Game.state === 'match' && Game.mode === 'client') UI.toast('Geen verbinding met de host… we blijven proberen.', '#ff9f1c'); }
  };
  G.Audio.on = P.d.settings.sfx; G.Audio.musicOn = P.d.settings.music;
  document.addEventListener('pointerdown', function first() { G.Audio.init(); G.Audio.music(Game.state === 'match' ? Game.match.map.music : 'lobby'); document.removeEventListener('pointerdown', first); });
  startDemo();
  UI.showLobby();
  if (!P.d.seenHelp) setTimeout(function () { if (Game.state === 'lobby' && !P.d.seenHelp && $modalHidden()) UI.openHelp(); }, 600);
  function $modalHidden() { return UI.$('modal').classList.contains('hidden'); }
  requestAnimationFrame(frame);
}
