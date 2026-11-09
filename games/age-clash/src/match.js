/* =========================================================================
 * match.js — match-controller en in-game HUD (Vs Bot, Lokaal 1v1, Online).
 * ========================================================================= */
var AC = window.AC;
(function () {
  var Pf = AC.Profile, C = AC.CONST, h, $, fmt, esc;
  var Match = { active: false };
  AC.Match = Match;

  var KEYS = [
    { spawn: ['1', '2', '3', '4'], power: 'q', evolve: 'e', upg: 'u', tower: 't' },
    { spawn: ['7', '8', '9', '0'], power: 'p', evolve: 'o', upg: 'i', tower: 'y' },
  ];

  function contrast(col) { return col.toLowerCase() === '#ff4a4a' ? '#3a8bff' : '#ff4a4a'; }

  Match.start = function (opts) {
    h = AC.UI.h; $ = AC.UI.$; fmt = AC.UI.fmt; esc = AC.UI.esc;
    var d = Pf.data, M = Match;
    M.opts = opts; M.mode = opts.mode; M.over = false; M.resultShown = false; M.paused = false; M.acc = 0; M.time = 0;
    M.towerMode = null; M.drawer = [null, null]; M.hints = []; M.endT = 0;
    M.speed = opts.mode === 'online' ? 1 : (Match.lastSpeed || 1);
    var seed = (Date.now() & 0xffffff) | 1, P0, P1, myColor = Pf.color();
    var lo = Pf.loadout(), maxA = Pf.maxAge();
    if (opts.mode === 'bot') {
      var cfg = AC.BOT[opts.diff];
      M.botName = AC.BOT_NAMES[Math.floor(Math.random() * AC.BOT_NAMES.length)];
      P0 = { name: d.name, owned: lo, maxAge: maxA, perma: Pf.permaValues(), color: myColor };
      P1 = { name: M.botName + ' (' + cfg.name + ')', maxAge: maxA, incomeMult: cfg.income, color: contrast(myColor) };
      M.local = [0];
    } else if (opts.mode === 'local') {
      P0 = { name: 'Speler 1', owned: lo, maxAge: maxA, color: myColor };
      P1 = { name: 'Speler 2', owned: lo, maxAge: maxA, color: contrast(myColor) };
      M.local = [0, 1];
    } else {
      var net = opts.net, opp = opts.opp; M.net = net; seed = net.seed;
      var me = { name: d.name, owned: lo, maxAge: maxA, color: myColor };
      var oppCol = opp.color.toLowerCase() === myColor.toLowerCase() ? contrast(myColor) : opp.color;
      var them = { name: opp.name, owned: AC.NetMatch.decodeLoadout(opp.loadout), maxAge: opp.maxAge, color: oppCol };
      // Beide clients moeten identieke sim-parameters hebben: kleuren zijn alleen visueel.
      P0 = net.side === 0 ? me : them; P1 = net.side === 0 ? them : me;
      M.local = [net.side];
      M.oppInfo = opp;
      net.onDisconnect = function () { if (!M.over) { M.disconnectWin = true; AC.UI.toast('Tegenstander heeft de verbinding verbroken'); M.finish(net.side); } };
      net.start();
    }
    M.sim = new AC.Sim({ seed: seed, players: [P0, P1], mode: opts.mode });
    M.colors = [P0.color, P1.color];
    M.view = { colors: M.colors, emblems: [null, null], glow: [null, null], localSide: M.local[0], buff: [0, 0], towerMode: false, hoverSpot: -1 };
    var mySide = M.local[0];
    M.view.emblems[mySide] = Pf.banner(); M.view.glow[mySide] = Pf.glow();
    if (opts.mode === 'online') { M.view.emblems[1 - mySide] = M.oppInfo.emblem; M.view.glow[1 - mySide] = M.oppInfo.glow; }
    if (opts.mode === 'bot') { M.bot = new AC.Bot(M.sim, 1, opts.diff, seed ^ 0x5151); M.view.emblems[1] = ['skull', 'gear', 'eye'][Math.floor(Math.random() * 3)]; }
    else M.bot = null;
    if (!M.renderer) { M.renderer = new AC.Renderer($('#cv')); }
    M.renderer.audio = AC.audio; M.renderer.parts = []; M.renderer.texts = []; M.renderer.banners = []; M.renderer.flashes = []; M.renderer.beams = []; M.renderer.bgKey = '';
    M.buildHud();
    AC.UI.show('match');
    M.active = true;
    AC.audio.init(); AC.audio.music(true, 0);
    if (!d.tutorialDone && opts.mode === 'bot') M.queueTutorial();
    else M.hint(opts.mode === 'local' ? 'Speler 1: 1–4, Q, E · Speler 2: 7–0, P, O' : 'Vernietig de vijandelijke basis! Units plaatsen: 1–4', 3500);
  };

  Match.queueTutorial = function () {
    Match.hints = [
      { t: 0.5, s: '👉 Klik op een unit onderin (of druk <kbd>1</kbd>–<kbd>4</kbd>) om hem te plaatsen', d: 6000 },
      { t: 9, s: '⚔ Melee verslaat ranged · ranged verslaat melee · anti-armor sloopt armored', d: 6000 },
      { t: 18, s: '⬆ Open <b>Upgrades</b> (<kbd>U</kbd>) voor meer inkomen en sterkere units — de match loopt door', d: 6500 },
      { t: 32, s: '🏰 Plaats <b>Towers</b> (<kbd>T</kbd>) op de plekken voor je basis', d: 6000 },
      { t: 45, s: '⏳ Vul je XP-balk en <b>evolueer</b> (<kbd>E</kbd>) naar het volgende tijdperk!', d: 6500 },
      { t: 62, s: '⚡ Je <b>tijdperk-power</b> (<kbd>Q</kbd>) is bijna klaar — gebruik hem op een grote groep vijanden', d: 6000 },
    ];
  };
  Match.hint = function (s, ms) {
    var el = $('#hint'); if (!el) return;
    el.innerHTML = s; el.style.display = 'block'; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(Match._ht); Match._ht = setTimeout(function () { el.style.display = 'none'; }, ms || 3000);
  };

  /* ------------------------------ HUD ------------------------------ */
  Match.buildHud = function () {
    var M = Match, sim = M.sim, hud = $('#hud'); hud.innerHTML = '';
    M.ui = [null, null];
    // top
    var top = h('div', { class: 'htop' });
    M.top = [];
    for (var s = 0; s < 2; s++) {
      var p = sim.players[s];
      var nm = h('span', { text: p.name + (M.local.length === 1 && M.local[0] === s ? ' (jij)' : '') }), ag = h('span', { class: 'agen' });
      var hpI = h('i', { style: 'background:' + M.colors[s] }), hpLag = h('i', { class: 'lag' }), hpT = h('span');
      var xpI = h('i'), xpT = h('span', { class: 'mut' });
      var box = h('div', { class: 'pinfo' + (s ? ' r' : '') }, [
        h('div', { class: 'nmrow' }, [h('span', { style: 'width:12px;height:12px;border-radius:3px;background:' + M.colors[s] }), nm, ag]),
        h('div', { class: 'hpbar' }, [hpLag, hpI, hpT]),
        h('div', { class: 'xprow' }, [h('span', { text: 'XP' }), h('div', { class: 'bar' }, [xpI]), xpT]),
      ]);
      M.top.push({ ag: ag, hpI: hpI, hpLag: hpLag, hpT: hpT, xpI: xpI, xpT: xpT, last: {} });
      if (s === 0) top.appendChild(box);
      if (s === 0) {
        M.timerEl = h('div', { class: 'tm', text: '0:00' }); M.otEl = h('div', { class: 'ot' });
        var mid = h('div', { class: 'mid pe' }, [M.timerEl, h('div', { class: 'md', text: M.mode === 'bot' ? 'VS BOT · ' + AC.BOT[M.opts.diff].name.toUpperCase() : M.mode === 'local' ? 'LOKAAL 1v1' : 'ONLINE RANKED' }), M.otEl,
          h('button', { class: 'btn ghost sm', text: M.mode === 'online' ? '⚑ Menu' : '❚❚ Pauze', onclick: function () { AC.UI.click(); M.pause(); } })]);
        M.spdBtns = [];
        var spd = h('div', { class: 'spd' });
        [1, 2, 3, 5].forEach(function (v) {
          var b = h('button', { class: 'spdb' + (M.speed === v ? ' on' : ''), text: v + '×', title: M.mode === 'online' ? 'Stem op ' + v + '× (toets F wisselt). Kiezen jullie allebei hetzelfde, dan wordt dat de snelheid; anders 1×.' : 'Snelheid ' + v + '× (toets F wisselt)', onclick: function () { AC.UI.click(); M.setSpeed(v); } });
          M.spdBtns.push({ v: v, b: b }); spd.appendChild(b);
        });
        mid.appendChild(spd);
        if (M.mode === 'online') { M.spdInfo = h('div', { class: 'spdinfo' }); mid.appendChild(M.spdInfo); }
        top.appendChild(mid);
      } else top.appendChild(box);
    }
    hud.appendChild(top);
    hud.appendChild(h('div', { id: 'hint', class: 'hint', style: 'display:none' }));
    M.netEl = h('div', { class: 'hint', style: 'display:none;top:170px;border-color:rgba(255,90,74,.6)' }); hud.appendChild(M.netEl);
    // bottom
    var split = M.local.length > 1;
    var bot = h('div', { class: 'hbot pe' + (split ? ' split' : '') });
    M.local.forEach(function (side) { var sh = M.buildSide(side, split); bot.appendChild(sh); });
    if (!split && M.mode !== 'local') {
      // rechts: info over tegenstander
      var os = 1 - M.local[0];
      M.oppBox = h('div', { class: 'ironbox', style: 'width:auto;flex:1;max-width:300px;margin-left:auto' });
      bot.appendChild(M.oppBox);
    }
    hud.appendChild(bot);
    var dl = split ? ['left:330px', 'right:330px'] : ['left:50%;transform:translateX(-50%)', 'right:330px'];
    M.drawerEls = [h('div', { class: 'drawer panel pe', style: 'display:none;' + dl[0] }), h('div', { class: 'drawer panel pe', style: 'display:none;' + dl[1] })];
    hud.appendChild(M.drawerEls[0]); hud.appendChild(M.drawerEls[1]);
  };

  Match.buildSide = function (side, compact) {
    var M = Match, sim = M.sim, K = M.local.length > 1 ? KEYS[side] : KEYS[0];
    var u = { side: side, slots: [], last: {} };
    var wrap = h('div', { class: 'side-hud' + (side && compact ? ' r' : '') });
    u.iron = h('div', { class: 'amt ironic' }); u.inc = h('b'); u.kill = h('b'); u.cnt = h('b');
    var ib = h('div', { class: 'ironbox', style: compact ? 'width:150px;padding:10px' : '' }, [h('div', { class: 'mut', style: 'font-size:11px;font-weight:800;letter-spacing:1px', text: 'IJZER' }), u.iron,
      h('div', { class: 'ln' }, [h('span', { text: 'Per seconde' }), u.inc]), h('div', { class: 'ln' }, [h('span', { text: 'Per kill' }), u.kill]), compact ? null : h('div', { class: 'ln' }, [h('span', { text: 'Leger' }), u.cnt])]);
    var slots = h('div', { class: 'slots', style: compact ? 'gap:6px' : '' });
    for (var s = 0; s < 4; s++) (function (slot) {
      var cv = h('canvas', { width: 192, height: 160 });
      var el = h('button', { class: 'slot', style: compact ? 'width:92px' : '', onclick: function () { M.cmd(side, { t: 'spawn', s: slot }); } }, [
        h('kbd', { class: 'key', text: K.spawn[slot] }), h('span', { class: 'rl', text: AC.ROLES[slot].icon }), cv, h('div', { class: 'sn' }), h('div', { class: 'sc ironic' }), h('div', { class: 'cdv' }), h('div', { class: 'cdt' }),
      ]);
      if (compact) { cv.style.width = '76px'; cv.style.height = '64px'; }
      el.addEventListener('mouseenter', function () { M.tip(side, slot, el); });
      el.addEventListener('mouseleave', function () { M.tip(null); });
      u.slots.push({ el: el, cv: cv, sn: el.querySelector('.sn'), sc: el.querySelector('.sc'), cdv: el.querySelector('.cdv'), cdt: el.querySelector('.cdt'), last: {} });
      slots.appendChild(el);
    })(s);
    // acties
    u.towerBtn = h('button', { class: 'act', onclick: function () { AC.UI.click(); M.toggleDrawer(side, 'tower'); } }, [h('span', { class: 'ai', text: '🏰' }), h('span', { text: 'Towers' }), h('small', { html: '<kbd>' + K.tower.toUpperCase() + '</kbd>' })]);
    u.upgBtn = h('button', { class: 'act', onclick: function () { AC.UI.click(); M.toggleDrawer(side, 'upg'); } }, [h('span', { class: 'ai', text: '⬆' }), h('span', { text: 'Upgrades' }), h('small', { html: '<kbd>' + K.upg.toUpperCase() + '</kbd>' })]);
    u.powCd = h('div', { class: 'cdv' }); u.powName = h('span', { style: 'font-size:12.5px;text-align:center' }); u.powT = h('small');
    u.powBtn = h('button', { class: 'act', style: 'grid-column:span 2', onclick: function () { M.cmd(side, { t: 'power' }); } }, [h('span', { class: 'ai', text: '⚡' }), u.powName, u.powT, u.powCd]);
    var acts = h('div', { class: 'acts', style: compact ? 'width:150px;gap:5px' : '' }, [u.towerBtn, u.upgBtn, u.powBtn]);
    // evolve
    u.evoName = h('div', { class: 'an' }); u.evoNext = h('div', { class: 'mut', style: 'font-size:12px' }); u.evoBar = h('i'); u.evoTxt = h('div', { class: 'mut', style: 'font-size:12px;display:flex;justify-content:space-between' });
    u.evoBtn = h('button', { class: 'btn sm', onclick: function () { M.cmd(side, { t: 'evolve' }); } });
    var evo = h('div', { class: 'evo', style: compact ? 'width:150px;padding:8px' : '' }, [u.evoName, u.evoNext, h('div', { class: 'bar' }, [u.evoBar]), u.evoTxt, u.evoBtn]);
    [ib, slots, acts, evo].forEach(function (x) { wrap.appendChild(x); });
    Match.ui[side] = u;
    return wrap;
  };

  Match.tip = function (side, slot, el) {
    var t = $('#slotTip');
    if (side == null) { if (t) t.remove(); return; }
    if (!t) { t = h('div', { id: 'slotTip', class: 'panel', style: 'position:absolute;z-index:40;padding:10px 12px;width:260px;font-size:13px;pointer-events:none' }); $('#hud').appendChild(t); }
    var sim = Match.sim, st = sim.unitStats(side, slot), u = AC.UNITS[st.age][slot];
    var p = sim.players[side], hm = 1 + p.upg['hp' + slot] * 0.12, dm = 1 + p.upg['dmg' + slot] * 0.12;
    t.innerHTML = '<b style="font-size:15px">' + esc(u.name) + '</b> <span class="mut">· ' + AC.ROLES[slot].name + ' · ' + AC.AGES[st.age].short + '</span><div class="mut" style="margin:4px 0">' + esc(u.desc) + '</div>' +
      'HP <b>' + fmt(st.hp * hm) + '</b> · DPS <b>' + (AC.dps(st) * dm).toFixed(1) + '</b> · Bereik <b>' + st.range + '</b><div style="color:#ffe39a;margin-top:4px">★ ' + AC.specialText(u.special) + '</div>';
    var r = el.getBoundingClientRect(), sr = $('#stage').getBoundingClientRect(), sc = sr.width / 1600;
    t.style.left = Math.min(1320, (r.left - sr.left) / sc - 60) + 'px'; t.style.top = ((r.top - sr.top) / sc - 128) + 'px';
  };

  Match.toggleDrawer = function (side, kind) {
    var M = Match;
    if (M.drawer[side] === kind) { M.drawer[side] = null; if (M.towerMode && M.towerMode.side === side) M.towerMode = null; }
    else M.drawer[side] = kind;
    M.renderDrawer(side);
  };
  Match.renderDrawer = function (side) {
    var M = Match, el = M.drawerEls[side], kind = M.drawer[side], sim = M.sim, p = sim.players[side];
    if (!kind) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = '';
    var close = h('button', { class: 'btn ghost sm', text: '✕', onclick: function () { M.toggleDrawer(side, kind); } });
    if (kind === 'upg') {
      el.appendChild(h('h3', {}, [h('span', { html: '⬆ Upgrades <span class="mut" style="font-size:13px;font-family:var(--f)">— de match gaat gewoon door</span>' }), close]));
      var g = h('div', { class: 'ugrid' });
      var cols = [['Units', AC.UPGRADES.filter(function (u) { return u.cat === 'unit'; })], ['Towers', AC.UPGRADES.filter(function (u) { return u.cat === 'tower'; })], ['Economie', AC.UPGRADES.filter(function (u) { return u.cat === 'eco'; })]];
      M.upBtns = M.upBtns || [[], []]; M.upBtns[side] = [];
      cols.forEach(function (col) {
        var c = h('div', { class: 'ucol' }, [h('h4', { text: col[0] })]);
        col[1].forEach(function (u) {
          var lab = h('span', { class: 'lv' }), cost = h('span', { class: 'uc ironic' }), desc = h('span', { class: 'mut' });
          var b = h('button', { class: 'upbtn', onclick: function () { M.cmd(side, { t: 'upg', k: u.key }); } }, [h('span', { class: 'ul' }, [h('b', { text: u.name }), desc, ' ', lab]), cost]);
          M.upBtns[side].push({ b: b, lab: lab, cost: cost, desc: desc, u: u, last: '' });
          c.appendChild(b);
        });
        g.appendChild(c);
      });
      el.appendChild(g);
    } else {
      el.appendChild(h('h3', {}, [h('span', { html: '🏰 Towers <span class="mut" style="font-size:13px;font-family:var(--f)">— kies een type en klik op een vrije plek voor je basis</span>' }), close]));
      M.tBtns = M.tBtns || [[], []]; M.tBtns[side] = [];
      var trow = h('div', { style: 'display:flex;gap:8px' }); el.appendChild(trow);
      AC.TOWERS.forEach(function (t, k) {
        var cost = h('b', { class: 'ironic' });
        var ts = sim.towerStats(side, k);
        var b = h('button', { class: 'tbtn' + (M.towerMode && M.towerMode.side === side && M.towerMode.kind === k ? ' on' : ''), onclick: function () { AC.UI.click(); M.towerMode = { side: side, kind: k }; M.renderDrawer(side); } }, [
          h('span', { class: 'ti', text: t.icon }), h('span', { style: 'flex:1' }, [h('b', { text: t.name }), h('small', { text: t.desc }), h('small', { text: 'Schade ' + Math.round(ts.dmg) + ' · ' + (1 / ts.cd).toFixed(1) + '/s · bereik ' + Math.round(ts.range) + (ts.splash ? ' · gebied' : '') })]), cost]);
        M.tBtns[side].push({ b: b, cost: cost, k: k, last: '' });
        trow.appendChild(b);
      });
      trow.appendChild(h('button', { class: 'tbtn' + (M.towerMode && M.towerMode.side === side && M.towerMode.sell ? ' on' : ''), onclick: function () { AC.UI.click(); M.towerMode = { side: side, sell: true }; M.renderDrawer(side); } }, [h('span', { class: 'ti', text: '💰' }), h('span', { style: 'flex:1' }, [h('b', { text: 'Verkopen' }), h('small', { text: 'Klik op een eigen tower: ' + Math.round(AC.TOWER_SELL * 100) + '% terug (naar rato van HP)' })])]));
    }
  };

  /* ------------------------------ input ------------------------------ */
  Match.cmd = function (side, c) {
    var M = Match; if (!M.active || M.over || M.paused) return;
    var sim = M.sim, p = sim.players[side];
    // directe feedback voor ongeldige acties
    if (c.t === 'spawn') { if (p.cds[c.s] > 0) return deny(); if (p.iron < sim.unitCost(side, c.s)) { return deny('Niet genoeg ijzer'); } }
    if (c.t === 'evolve' && !sim.canEvolve(side)) { if (p.age >= p.maxAge && p.age < 7) return deny('Ontgrendel ' + AC.AGES[p.age + 1].name + ' in het menu'); return deny('Nog niet genoeg XP'); }
    if (c.t === 'power' && p.powerCd > 0) return deny('Power laadt nog op');
    if (c.t === 'upg') { var d = sim.upgradeDef(c.k); if (p.upg[c.k] >= d.max) return deny('Maximaal niveau'); if (p.iron < sim.upgradeCost(side, c.k)) return deny('Niet genoeg ijzer'); }
    if (c.t === 'tower' && p.iron < sim.towerCost(side, c.k)) return deny('Niet genoeg ijzer');
    AC.audio.play('click');
    if (M.mode === 'online') M.net.command(c); else sim.command(side, c);
  };
  function deny(msg) { AC.audio.play('deny'); if (msg) AC.UI.toast(msg, 1100); }

  Match.setSpeed = function (v) {
    var M = Match;
    M.speed = v;
    if (M.spdBtns) M.spdBtns.forEach(function (x) { x.b.classList.toggle('on', x.v === v); });
    if (M.mode === 'online') { if (M.net) M.net.setVote(v); return; }
    Match.lastSpeed = v;
    if (v > 1) M.hint('⏩ Snelheid ' + v + '×', 1000);
  };

  Match.key = function (e) {
    var M = Match; if (!M.active) return false;
    var k = e.key.toLowerCase();
    if (k === 'escape') {
      if (M.towerMode) { M.towerMode = null; M.drawer = [null, null]; M.renderDrawer(0); M.renderDrawer(1); return true; }
      if (M.drawer[0] || M.drawer[1]) { M.drawer = [null, null]; M.renderDrawer(0); M.renderDrawer(1); return true; }
      M.pause(); return true;
    }
    if (M.paused || M.over) return false;
    if (k === 'f') { var sp = [1, 2, 3, 5], i0 = sp.indexOf(M.speed); M.setSpeed(sp[(i0 + 1) % sp.length]); return true; }
    var sides = M.local.length > 1 ? [0, 1] : [M.local[0]];
    for (var i = 0; i < sides.length; i++) {
      var side = sides[i], K = M.local.length > 1 ? KEYS[side] : KEYS[0];
      var si = K.spawn.indexOf(k);
      if (si >= 0) { M.cmd(side, { t: 'spawn', s: si }); return true; }
      if (k === K.power) { M.cmd(side, { t: 'power' }); return true; }
      if (k === K.evolve) { M.cmd(side, { t: 'evolve' }); return true; }
      if (k === K.upg) { M.toggleDrawer(side, 'upg'); return true; }
      if (k === K.tower) { M.toggleDrawer(side, 'tower'); return true; }
    }
    return false;
  };

  Match.canvasPos = function (e) {
    var r = $('#cv').getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * C.W, y: (e.clientY - r.top) / r.height * C.H };
  };
  Match.spotAt = function (side, x) {
    for (var sp = 0; sp < 3; sp++) { var tx = side ? C.W - C.TOWER_SPOTS[sp] : C.TOWER_SPOTS[sp]; if (Math.abs(x - tx) < 26) return sp; }
    return -1;
  };
  Match.mouseMove = function (e) {
    var M = Match; if (!M.active || !M.towerMode) { M.view && (M.view.hoverSpot = -1); return; }
    var p = M.canvasPos(e); M.view.hoverSpot = p.y > C.GROUND - 190 && p.y < C.GROUND + 40 ? M.spotAt(M.towerMode.side, p.x) : -1;
  };
  Match.mouseDown = function (e) {
    var M = Match; if (!M.active || !M.towerMode || M.over) return;
    if (e.button === 2) { M.towerMode = null; M.renderDrawer(0); M.renderDrawer(1); return; }
    var p = M.canvasPos(e), side = M.towerMode.side, sp = M.spotAt(side, p.x);
    if (sp < 0 || p.y < C.GROUND - 190 || p.y > C.GROUND + 40) return;
    var existing = M.sim.towerAt(side, sp);
    if (M.towerMode.sell) { if (existing) M.cmd(side, { t: 'sell', s: sp }); return; }
    if (existing) return deny('Deze plek is bezet');
    M.cmd(side, { t: 'tower', s: sp, k: M.towerMode.kind });
  };

  /* ------------------------------ pauze ------------------------------ */
  Match.pause = function () {
    var M = Match; if (M.over) return;
    var online = M.mode === 'online';
    if (!online) M.paused = true;
    var bg = h('div', { class: 'pausebg pe', id: 'pauseBg' });
    var box = h('div', { class: 'panel modal' }, [h('h2', { text: online ? 'Menu' : 'Gepauzeerd' }), online ? h('p', { class: 'mut', text: 'De match loopt door terwijl dit menu open is.' }) : null]);
    var row = h('div', { class: 'row' });
    row.appendChild(h('button', { class: 'btn green', text: online ? 'Terug naar match' : 'Doorgaan', onclick: function () { AC.UI.click(); bg.remove(); M.paused = false; } }));
    row.appendChild(h('button', { class: 'btn red', text: 'Opgeven', onclick: function () {
      AC.UI.click(); bg.remove(); M.paused = false;
      var side = M.local.length > 1 ? 0 : M.local[0];
      if (M.mode === 'online') M.net.command({ t: 'surrender' }); else M.sim.command(side, { t: 'surrender' });
    } }));
    box.appendChild(row); bg.appendChild(box); $('#hud').appendChild(bg);
  };

  /* ------------------------------ update ------------------------------ */
  Match.update = function (dt) {
    var M = Match, sim = M.sim; if (!M.active) return;
    dt = Math.min(dt, M.mode === 'online' ? 4 : 0.1);
    var alpha = 1;
    if (!M.paused) {
      if (M.mode === 'online') {
        var eff = M.net.speed();
        if (M.effSpeed !== eff) {
          if (M.effSpeed != null) M.hint(eff > 1 ? '⏩ Jullie kozen allebei ' + eff + '× — snelheid ' + eff + '×' : '▶ Snelheid 1×' + (M.net.vote !== M.net.oppVote ? ' (jullie keuzes verschillen)' : ''), 1800);
          M.effSpeed = eff;
        }
        if (M.lastOppVote !== M.net.oppVote) {
          if (M.lastOppVote != null && M.net.oppVote !== M.net.vote) M.hint('🗳 ' + (M.oppInfo ? M.oppInfo.name : 'Je tegenstander') + ' wil ' + M.net.oppVote + '×. Kies ook ' + M.net.oppVote + '× om te versnellen.', 3000);
          M.lastOppVote = M.net.oppVote;
        }
        var si = 'Jij ' + M.net.vote + '× · ' + (M.oppInfo ? M.oppInfo.name : 'Tegenstander') + ' ' + M.net.oppVote + '× → ' + eff + '×';
        if (M.spdInfo && M.spdInfo._v !== si) { M.spdInfo._v = si; M.spdInfo.textContent = si; }
        M.net.step(sim, dt * eff);
        alpha = Math.min(1, M.net.acc / C.TICK);
        var w = M.net.waiting > 0.4;
        var oppName = M.oppInfo ? M.oppInfo.name : 'Je tegenstander';
        if (M.net.oppAway) { w = true; M.netEl.textContent = '💤 ' + oppName + ' heeft het spel niet in beeld (ander tabblad of app). Het gaat verder zodra die terug is.'; }
        else if (w) M.netEl.textContent = M.net.lostFor > 3 ? '📡 Geen contact met je tegenstander… wachten (' + Math.max(0, Math.ceil(M.net.grace() - M.net.lostFor)) + 's)' : '⏳ Wachten op tegenstander…';
        else if (M.net.desync) M.netEl.textContent = '⚠ Synchronisatie-afwijking gedetecteerd';
        M.netEl.style.display = w || M.net.desync ? 'block' : 'none';
      } else {
        M.acc += dt * M.speed;
        while (M.acc >= C.TICK) {
          if (M.bot) M.bot.update(C.TICK);
          sim.tick(); M.acc -= C.TICK;
          if (sim.over) break;
        }
        alpha = M.acc / C.TICK;
      }
      // tutorial-hints
      if (M.hints.length && sim.time >= M.hints[0].t) { var hn = M.hints.shift(); M.hint(hn.s, hn.d); }
    }
    M.view.buff = [sim.players[0].buffT, sim.players[1].buffT];
    M.view.towerMode = !!M.towerMode; M.view.sellMode = M.towerMode && M.towerMode.sell; M.view.localSide = M.towerMode ? M.towerMode.side : M.local[0];
    // dmg-getallen filteren volgens instelling
    if (!Pf.data.settings.dmgNums) sim.events = sim.events.filter(function (e) { return e.e !== 'dmg' || e.crit; });
    M.renderer.render(sim, M.paused ? 1 : alpha, M.view, M.paused ? 0 : dt * Math.min(M.mode === 'online' ? (M.effSpeed || 1) : M.speed, 3));
    var age = sim.players[M.local[0]].age;
    if (AC.audio.musicAge !== age) AC.audio.music(true, age);
    M.updateHud();
    if (sim.over && !M.over) M.finish(sim.winner);
    if (M.over && !M.resultShown) { M.endT += dt; if (M.endT > 2.2) M.showResult(); }
  };

  function tm(t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  function setTxt(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
  function setW(el, v) { v = Math.round(v * 1000) / 10; if (el._w !== v) { el._w = v; el.style.width = v + '%'; } }

  Match.updateHud = function () {
    var M = Match, sim = M.sim;
    setTxt(M.timerEl, tm(sim.time));
    setTxt(M.otEl, sim.time >= C.SUDDEN_DEATH ? '☠ SUDDEN DEATH' : sim.time >= C.OVERTIME_1 ? '🔥 OVERTIME ×1.5 schade' : sim.time > C.OVERTIME_1 - 60 ? 'Overtime over ' + Math.ceil(C.OVERTIME_1 - sim.time) + 's' : '');
    for (var s = 0; s < 2; s++) {
      var p = sim.players[s], b = sim.bases[s], T = M.top[s], ag = AC.AGES[p.age];
      if (T.last.age !== p.age) { T.last.age = p.age; T.ag.textContent = ag.name; T.ag.style.background = AC.hexA(ag.colors.accent, 0.25); T.ag.style.color = ag.colors.accent; }
      var f = Math.max(0, b.hp / b.maxHp);
      setW(T.hpI, f); setW(T.hpLag, f); setTxt(T.hpT, fmt(Math.max(0, b.hp)) + ' / ' + fmt(b.maxHp));
      var need = sim.xpNeeded(s), prev = C.AGE_XP[p.age];
      setW(T.xpI, need ? Math.min(1, (p.xp - prev) / (need - prev)) : 1);
      setTxt(T.xpT, need ? fmt(p.xp) + ' / ' + fmt(need) : 'MAX');
    }
    M.local.forEach(function (side) { M.updateSide(side); });
    if (M.oppBox) {
      var os = 1 - M.local[0], op = sim.players[os], n = 0; sim.units.forEach(function (u) { if (u.side === os) n++; });
      var tw = sim.towers.filter(function (t) { return t.side === os; }).length;
      var html = '<div class="mut" style="font-size:11px;font-weight:800;letter-spacing:1px">TEGENSTANDER</div><div style="font-weight:900;font-size:16px;color:' + M.colors[os] + '">' + esc(op.name) + '</div>' +
        '<div class="ln"><span>Tijdperk</span><b>' + AC.AGES[op.age].short + '</b></div><div class="ln"><span>Leger</span><b>' + n + ' units</b></div><div class="ln"><span>Towers</span><b>' + tw + ' / 3</b></div>' + (M.mode === 'online' ? '<div class="ln"><span>Rating</span><b>' + (M.oppInfo.rating) + '</b></div>' : '<div class="ln"><span>Kills</span><b>' + op.st.kills + '</b></div>');
      if (M.oppBox._h !== html) { M.oppBox._h = html; M.oppBox.innerHTML = html; }
    }
  };

  Match.updateSide = function (side) {
    var M = Match, sim = M.sim, p = sim.players[side], u = M.ui[side];
    setTxt(u.iron, fmt(p.iron));
    setTxt(u.inc, '+' + sim.income(side).toFixed(0) + '/s');
    setTxt(u.kill, Math.round(sim.killMult(side) * 100) + '% prijs' + (p.lastBounty ? ' (+' + p.lastBounty + ')' : ''));
    if (u.cnt) { var n = 0; sim.units.forEach(function (x) { if (x.side === side) n++; }); setTxt(u.cnt, n + ' units'); }
    for (var s = 0; s < 4; s++) {
      var sl = u.slots[s], st = sim.unitStats(side, s), key = st.age + '_' + s + '_' + p.age;
      if (sl.last.key !== key) {
        sl.last.key = key;
        var cx = sl.cv.getContext('2d'); cx.clearRect(0, 0, 192, 160); cx.drawImage(AC.unitIcon(st.age, s, M.colors[side]), 0, 0);
        sl.sn.textContent = st.name;
        var old = sl.el.querySelector('.old'); if (old) old.remove();
        if (st.age < p.age) sl.el.appendChild(h('span', { class: 'old', text: AC.AGES[st.age].short }));
        sl.el.style.borderColor = AC.hexA(AC.AGES[st.age].colors.accent, 0.5);
      }
      setTxt(sl.sc, String(st.cost));
      var poor = p.iron < st.cost;
      if (sl.last.poor !== poor) { sl.last.poor = poor; sl.el.classList.toggle('poor', poor); }
      var cdf = p.cds[s] / C.SLOT_CD[s];
      sl.cdv.style.height = (cdf * 100) + '%';
      setTxt(sl.cdt, p.cds[s] > 0 ? p.cds[s].toFixed(1) : '');
    }
    // power
    var ag = AC.AGES[p.age];
    setTxt(u.powName, ag.power.name);
    setTxt(u.powT, p.powerCd > 0 ? Math.ceil(p.powerCd) + 's' : 'KLAAR!');
    u.powCd.style.height = (p.powerCd / (p.powerCd > C.POWER_CD ? C.POWER_START_CD : C.POWER_CD) * 100) + '%';
    var pr = p.powerCd <= 0; if (u.last.pr !== pr) { u.last.pr = pr; u.powBtn.classList.toggle('ready', pr); }
    u.towerBtn.classList.toggle('on', M.drawer[side] === 'tower'); u.upgBtn.classList.toggle('on', M.drawer[side] === 'upg');
    // evolve
    setTxt(u.evoName, (p.age + 1) + '. ' + ag.name);
    var need = sim.xpNeeded(side), prev = C.AGE_XP[p.age];
    if (need == null) { setTxt(u.evoNext, 'Hoogste tijdperk bereikt'); setW(u.evoBar, 1); setTxt(u.evoBtn, '★ MAX'); u.evoBtn.className = 'btn sm dis'; u.evoTxt.textContent = ''; }
    else {
      var nextLocked = p.age >= p.maxAge;
      setTxt(u.evoNext, '→ ' + AC.AGES[p.age + 1].name + (nextLocked ? ' 🔒' : ''));
      setW(u.evoBar, Math.min(1, (p.xp - prev) / (need - prev)));
      var txt = fmt(p.xp) + ' / ' + fmt(need) + ' XP'; if (u.evoTxt._v !== txt) { u.evoTxt._v = txt; u.evoTxt.innerHTML = '<span>' + txt + '</span><span>' + Math.min(100, Math.floor((p.xp - prev) / (need - prev) * 100)) + '%</span>'; }
      var can = sim.canEvolve(side);
      var cls = 'btn sm ' + (can ? 'gold ready' : nextLocked ? 'dis' : 'dis');
      if (u.evoBtn.className !== cls) u.evoBtn.className = cls;
      setTxt(u.evoBtn, nextLocked ? '🔒 Vergrendeld' : can ? '⏫ EVOLUEER (' + (M.local.length > 1 ? KEYS[side].evolve : 'E').toUpperCase() + ')' : 'Evolueren');
    }
    // drawers live bijwerken
    if (M.drawer[side] === 'upg' && M.upBtns && M.upBtns[side]) M.upBtns[side].forEach(function (x) {
      var lvl = p.upg[x.u.key], max = lvl >= x.u.max, c = max ? 0 : sim.upgradeCost(side, x.u.key);
      var k = lvl + '|' + c + '|' + (p.iron >= c);
      if (x.last === k) return; x.last = k;
      x.lab.textContent = 'Lv ' + lvl + '/' + x.u.max;
      x.desc.textContent = x.u.cat === 'eco' ? (x.u.key === 'income' ? '+6 ijzer/s' : '+10% kill-inkomen') : '+' + Math.round(x.u.per * 100) + '%';
      x.cost.textContent = max ? 'MAX' : fmt(c);
      x.b.classList.toggle('max', max); x.b.classList.toggle('poor', !max && p.iron < c);
    });
    if (M.drawer[side] === 'tower' && M.tBtns && M.tBtns[side]) M.tBtns[side].forEach(function (x) { var c = sim.towerCost(side, x.k); var k = c + '|' + (p.iron >= c); if (x.last === k) return; x.last = k; x.cost.textContent = fmt(c); x.cost.style.color = p.iron >= c ? '' : 'var(--bad)'; });
  };

  /* ------------------------------ einde ------------------------------ */
  Match.finish = function (winner) {
    var M = Match; if (M.over) return;
    M.over = true; M.winner = winner; M.endT = 0;
    M.towerMode = null; M.drawer = [null, null]; M.renderDrawer(0); M.renderDrawer(1);
    var won = M.local.length > 1 ? true : winner === M.local[0];
    AC.audio.music(false);
    setTimeout(function () { AC.audio.play(won ? 'win' : 'lose'); }, 600);
  };

  Match.showResult = function () {
    var M = Match, sim = M.sim; M.resultShown = true;
    var me = M.local.length > 1 ? M.winner : M.local[0];
    var won = M.local.length > 1 ? true : M.winner === me;
    var p = sim.players[me];
    var reward = null;
    if (M.mode === 'local') reward = Pf.simpleReward(40, 90);
    else {
      reward = Pf.matchReward({ won: won, mode: M.mode, diff: M.opts.diff || 'normal', time: sim.time, stats: p.st, age: p.age, oppRating: M.mode === 'bot' ? AC.BOT[M.opts.diff].rating : (M.oppInfo ? M.oppInfo.rating : 1000), oppName: M.mode === 'bot' ? M.botName : M.oppInfo.name });
      Pf.publishScore();
    }
    Pf.data.tutorialDone = true; Pf.save();
    if (M.net) M.net.leave();
    var title = M.local.length > 1 ? (sim.players[M.winner].name + ' WINT!') : (won ? 'OVERWINNING' : 'NEDERLAAG');
    var sub = M.disconnectWin ? 'Je tegenstander heeft de match verlaten.' : (won ? 'De vijandelijke basis is vernietigd!' : 'Je basis is gevallen…');
    if (M.local.length > 1) sub = 'Gefeliciteerd ' + sim.players[M.winner].name + '!';
    var st = p.st;
    var box = h('div', { class: 'panel rbox' }, [
      h('div', { class: 'rtitle ' + (won ? 'win' : 'lose'), text: title }), h('div', { class: 'rsub', text: sub }),
      h('div', { class: 'rstats' }, [['Kills', st.kills], ['Units geplaatst', st.spawned], ['Basisschade', fmt(st.baseDmg)], ['Tijdperk', (p.age + 1) + ' · ' + AC.AGES[p.age].short], ['Tijd', tm(sim.time)], ['IJzer verdiend', fmt(st.iron)]].map(function (r) { return h('div', { class: 'rstat' }, [h('b', { text: r[1] }), h('span', { text: r[0] })]); })),
    ]);
    if (reward) {
      box.appendChild(h('div', { class: 'rewards' }, [
        h('div', { class: 'reward' }, [h('b', { class: 'coin', text: '+' + reward.coins }), h('span', { class: 'mut', text: 'Coins' })]),
        h('div', { class: 'reward' }, [h('b', { style: 'color:#7ad0ff', text: '+' + reward.xp }), h('span', { class: 'mut', text: 'Account-XP' })]),
        M.mode !== 'local' ? h('div', { class: 'reward' }, [h('b', { style: 'color:' + (reward.dr >= 0 ? 'var(--good)' : 'var(--bad)'), text: (reward.dr >= 0 ? '+' : '') + reward.dr }), h('span', { class: 'mut', text: 'Rating → ' + Pf.data.rating })]) : null,
      ]));
      reward.bonus.forEach(function (b) { box.appendChild(h('div', { class: 'bonus', html: '✦ ' + b.k + ': <span class="coin">+' + b.v + '</span>' })); });
      reward.levels.forEach(function (l) { box.appendChild(h('div', { class: 'bonus', html: '⭐ Level ' + l.level + ' bereikt! <span class="coin">+' + l.coins + '</span>' + (l.level % 5 === 0 ? ' + 📦 kist' : '') })); });
    }
    var row = h('div', { class: 'row', style: 'display:flex;gap:12px;justify-content:center;margin-top:22px' });
    if (M.mode !== 'online') row.appendChild(h('button', { class: 'btn gold', text: '↻ Opnieuw', onclick: function () { AC.UI.click(); Match.end(); Match.start(M.opts); } }));
    else row.appendChild(h('button', { class: 'btn blue', text: '🌐 Nieuwe match zoeken', onclick: function () { AC.UI.click(); Match.end(); AC.UI.show('online'); } }));
    row.appendChild(h('button', { class: 'btn', text: 'Terug naar menu', onclick: function () { AC.UI.click(); Match.end(); AC.UI.show('menu'); } }));
    box.appendChild(row);
    $('#hud').appendChild(h('div', { class: 'result pe' }, [box]));
  };

  Match.end = function () {
    var M = Match; M.active = false; AC.audio.music(false);
    if (M.net && !M.net.ended) M.net.leave();
    M.net = null;
    $('#hud').innerHTML = '';
  };
})();
