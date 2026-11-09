// =====================================================================
//  EXTRA UI — hotkeys, quick upgrades, tower interface, scoreboard,
//  mastery, daily missions, achievements, reward screen & animations
// =====================================================================
(function () {
  var UI = G.UI, P = G.Profile, R = G.R;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return G.FX.fmt(n); }
  function click() { G.Audio.init(); G.Audio.sfx('click'); }

  // ---------------------------------------------------------------------
  //  HOTKEYS (customizable)
  // ---------------------------------------------------------------------
  G.HOTKEYS = [
    { id: 'slot1', def: '1', label: 'Item 1 kiezen' }, { id: 'slot2', def: '2', label: 'Item 2 kiezen' }, { id: 'slot3', def: '3', label: 'Item 3 kiezen' },
    { id: 'slot4', def: '4', label: 'Item 4 kiezen' }, { id: 'slot5', def: '5', label: 'Item 5 kiezen' },
    { id: 'upgrade', def: 'e', label: 'Upgrade geselecteerde tower', short: 'Upgrade' },
    { id: 'menu', def: 'u', label: 'Upgrade-menu openen', short: 'Menu' },
    { id: 'sell', def: 'r', label: 'Geselecteerde tower verkopen', short: 'Verkoop' },
    { id: 'door', def: 'q', label: 'Deur upgraden', short: 'Deur' },
    { id: 'farm', def: 'f', label: 'Dichtstbijzijnde farm upgraden', short: 'Farm' },
    { id: 'upall', def: 'x', label: 'Upgrade alles (1 level per tower)', short: 'Alles' },
    { id: 'upfarms', def: 'c', label: 'Upgrade alle farms', short: 'Farms' },
    { id: 'auto', def: 't', label: 'Auto-upgrade aan/uit (geselecteerd)', short: 'Auto' },
    { id: 'prio', def: 'p', label: 'Prioriteit aan/uit (geselecteerd)', short: 'Prio' },
    { id: 'evolve', def: 'v', label: 'Geselecteerde tower evolueren', short: 'Evolve' },
    { id: 'score', def: 'tab', label: 'Scorebord (vasthouden)', short: 'Scores' },
    { id: 'close', def: 'escape', label: 'Menu sluiten / annuleren', short: 'Sluit' },
    { id: 'build', def: ' ', label: 'Bouwmodus aan/uit', short: 'Bouwen' },
    { id: 'home', def: 'h', label: 'Terug naar je kamer lopen', short: 'Naar huis' },
    { id: 'speed', def: 'g', label: 'Spelsnelheid (solo/host)', short: 'Snelheid' },
    { id: 'repair', def: 'b', label: 'Deur repareren', short: 'Repair' }
  ];
  var RESERVED = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
  UI.hk = function (id) { var s = P.d.settings.hotkeys || {}; if (s[id]) return s[id]; for (var i = 0; i < G.HOTKEYS.length; i++) if (G.HOTKEYS[i].id === id) return G.HOTKEYS[i].def; return null; };
  UI.keyName = function (k) { return k === ' ' ? 'Spatie' : k === 'tab' ? 'Tab' : k === 'escape' ? 'Esc' : k && k.length === 1 ? k.toUpperCase() : k ? k.charAt(0).toUpperCase() + k.slice(1) : '—'; };
  function actionFor(k) { for (var i = 0; i < G.HOTKEYS.length; i++) if (UI.hk(G.HOTKEYS[i].id) === k) return G.HOTKEYS[i].id; return null; }
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }

  // visual feedback for a key press
  UI.keyFx = function (id, text, ok) {
    var el = $('hKeyFx'); if (!el) return;
    el.innerHTML = '<kbd>' + esc(UI.keyName(UI.hk(id))) + '</kbd> ' + text;
    el.className = 'keyfx show ' + (ok === false ? 'bad' : 'good');
    clearTimeout(UI._kfxT); UI._kfxT = setTimeout(function () { el.className = 'keyfx'; }, 1100);
    var chip = document.querySelector('#hKeys [data-k="' + id + '"]');
    if (chip) { chip.classList.remove('flash'); void chip.offsetWidth; chip.classList.add('flash'); }
  };
  function res(id, r, okText) {
    if (r && r.ok && r.pending) { var hk = G.HOTKEYS.filter(function (h) { return h.id === id; })[0]; UI.keyFx(id, (hk ? hk.short : 'Actie') + ' ✓', true); return true; }
    if (r && r.ok) { UI.keyFx(id, okText || 'OK', true); return true; }
    UI.keyFx(id, (r && r.msg) || 'Kan nu niet', false); G.Audio.sfx('error'); return false;
  }
  function myRoom() { var g = G.Game, m = g.match; return m && m.roomOf(m.players[g.me]); }
  function selTower() { var g = G.Game, room = myRoom(); return room && g.ui.selTower ? room.towers.filter(function (q) { return q.id === g.ui.selTower; })[0] : null; }
  function nearestTower(filter) {
    var g = G.Game, m = g.match, me = m.players[g.me], room = myRoom(), best = null, bd = 1e9;
    if (!room) return null;
    room.towers.forEach(function (q) { if (filter && !filter(q)) return; var d = Math.hypot(q.px - me.pos.x, q.py - me.pos.y); if (d < bd) { bd = d; best = q; } });
    return best;
  }
  var TR_NAME = function (tr) { return G.TRACKS[tr] ? G.TRACKS[tr].name : tr; };

  UI.handleKey = function (e) {
    if (typing(e)) return false;
    var k = e.key.toLowerCase();
    if (UI._rebind) { e.preventDefault(); UI.finishRebind(k); return true; }
    var g = G.Game; if (g.state !== 'match') return false;
    var act = actionFor(k);
    if (!act) return false;
    if (!P.d.settings.hotkeysOn && act !== 'close') return false;
    if (act === 'score' || act === 'build' || act === 'close') e.preventDefault();
    if (e.repeat && act !== 'upgrade') return true;
    UI.doAction(act);
    return true;
  };
  UI.handleKeyUp = function (e) {
    if (!G.Game || G.Game.state !== 'match') return;
    if (e.key.toLowerCase() === UI.hk('score')) { UI.showScore(false); }
  };
  UI.doAction = function (act) {
    var g = G.Game, m = g.match, me = m.players[g.me], room = myRoom(), t, r;
    if (act.indexOf('slot') === 0) { var n = +act.slice(4); if (me.loadout[n - 1]) { g.selectItem(me.loadout[n - 1]); g.ui.build = false; UI.keyFx(act, g.ui.placing ? G.ITEM[me.loadout[n - 1]].name : 'Geannuleerd', true); } return; }
    switch (act) {
      case 'close':
        if (UI._score) { UI.showScore(false); return; }
        if (UI._upOpen) { UI.toggleUpMenu(false); return; }
        if (g.ui.buildPick) { g.ui.buildPick = null; UI.hideBuildPick(); return; }
        if (!$('modal').classList.contains('hidden') && G.Game.state === 'match' && !$('modal').dataset.sticky) { $('modal').classList.add('hidden'); return; }
        g.ui.placing = null; g.ui.selTower = null; g.ui.selDoor = false; g.ui.build = false; UI.hideBuildPick();
        return;
      case 'score': UI.showScore(true); return;
      case 'build':
        g.ui.build = !g.ui.build; g.ui.placing = null; g.ui.buildPick = null; UI.hideBuildPick();
        UI.keyFx('build', g.ui.build ? 'Bouwmodus AAN — klik op een vrij vakje' : 'Bouwmodus uit', true); click(); return;
      case 'home': if (me.room >= 0) { g.goRoom(me.room); UI.keyFx('home', 'Terug naar je kamer', true); } return;
      case 'speed': g.cycleSpeed(); UI.keyFx('speed', 'Snelheid ' + g.speed + 'x', true); return;
      case 'menu': UI.toggleUpMenu(); return;
      case 'door': r = g.net.send({ type: 'door' }); res('door', r, 'Deur geüpgraded → level ' + (room ? room.door.lvl : '')); return;
      case 'repair': r = g.net.send({ type: 'repair' }); res('repair', r, 'Deur wordt gerepareerd'); return;
      case 'upall': r = g.net.send({ type: 'upgradeAll' }); res('upall', r, (r && r.count) + ' upgrades gekocht'); return;
      case 'upfarms': r = g.net.send({ type: 'upgradeAll', farms: true }); res('upfarms', r, (r && r.count) + ' farm-upgrades gekocht'); return;
      case 'farm':
        t = nearestTower(function (q) { return q.item.isFarm && m.cheapestTrack(q); });
        if (!t) { res('farm', { ok: false, msg: 'Geen farm om te upgraden' }); return; }
        var fl = m.towerLevel(t) + 1; r = g.net.send({ type: 'upgradeTower', tower: t.id }); res('farm', r, t.item.name + ' → Lv ' + fl); return;
      case 'upgrade':
        t = selTower() || nearestTower();
        if (!t) { res('upgrade', { ok: false, msg: 'Geen tower geselecteerd' }); return; }
        if (!g.ui.selTower) { g.ui.selTower = t.id; g.ui.selDoor = false; }
        var nxl = m.nextLevel(t), nl = m.towerLevel(t) + 1;
        r = g.net.send({ type: 'upgradeTower', tower: t.id }); res('upgrade', r, t.item.name + ' Lv ' + nl + (nxl ? ': ' + G.pathText(t.item, nxl) : '')); UI.panelDirty(); return;
      case 'sell':
        t = selTower(); if (!t) { res('sell', { ok: false, msg: 'Selecteer eerst een tower' }); return; }
        r = g.net.send({ type: 'sell', tower: t.id }); if (res('sell', r, 'Verkocht voor $' + fmt(r.value || 0))) g.ui.selTower = null; UI.panelDirty(); return;
      case 'auto': case 'prio':
        t = selTower(); if (!t) { res(act, { ok: false, msg: 'Selecteer eerst een tower' }); return; }
        var on = !t[act]; r = g.net.send({ type: act, tower: t.id, on: on });
        res(act, r, (act === 'auto' ? 'Auto-upgrade ' : 'Prioriteit ') + (on ? 'AAN' : 'UIT')); UI.panelDirty(); return;
      case 'evolve':
        t = selTower(); if (!t) { res('evolve', { ok: false, msg: 'Selecteer eerst een tower' }); return; }
        r = g.net.send({ type: 'evolve', tower: t.id }); res('evolve', r, 'Evolutie!'); UI.panelDirty(); return;
    }
  };
  UI.panelDirty = function () { var p = $('hPanel'); if (p) p.dataset.k = ''; UI._panelT = 0; UI._upT = 0; };

  // rebinding from the settings screen
  UI.startRebind = function (id) { UI._rebind = id; UI.openSettings(); };
  UI.finishRebind = function (k) {
    var id = UI._rebind; UI._rebind = null;
    if (k === 'escape' && id !== 'close') { UI.openSettings(); return; }
    if (RESERVED.indexOf(k) >= 0) { UI.toast('Die toets is voor lopen (WASD/pijltjes).', '#ff9f1c'); UI.openSettings(); return; }
    var hk = P.d.settings.hotkeys;
    G.HOTKEYS.forEach(function (h) { if (h.id !== id && UI.hk(h.id) === k) hk[h.id] = UI.hk(id); }); // swap on conflict
    hk[id] = k; P.save(); UI.openSettings();
  };

  // ---------------------------------------------------------------------
  //  SETTINGS (adds hotkeys)
  // ---------------------------------------------------------------------
  UI.openSettings = function () {
    var s = P.d.settings;
    var rows = G.HOTKEYS.map(function (h) {
      var cur = UI._rebind === h.id;
      return '<div class="hkrow"><span>' + esc(h.label) + '</span><button class="btn small ' + (cur ? 'yellow' : '') + '" data-h="' + h.id + '">' + (cur ? 'Druk op een toets…' : esc(UI.keyName(UI.hk(h.id)))) + '</button></div>';
    }).join('');
    var html = '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;gap:8px"><button class="btn" id="sSfx" style="flex:1">Geluid: ' + (s.sfx ? 'AAN' : 'UIT') + '</button><button class="btn" id="sMus" style="flex:1">Muziek: ' + (s.music ? 'AAN' : 'UIT') + '</button></div>' +
      '<h4 style="margin:6px 0 0">⌨️ Sneltoetsen</h4>' +
      '<div style="display:flex;gap:8px"><button class="btn small ' + (s.hotkeysOn ? 'green' : '') + '" id="sHk" style="flex:1">Sneltoetsen: ' + (s.hotkeysOn ? 'AAN' : 'UIT') + '</button><button class="btn small ' + (s.hints ? 'green' : '') + '" id="sHint" style="flex:1">Toets-hints: ' + (s.hints ? 'AAN' : 'UIT') + '</button><button class="btn small" id="sHkReset">Standaard</button></div>' +
      '<div class="hklist">' + rows + '</div><p class="tip">Klik op een toets en druk daarna de nieuwe toets in. WASD/pijltjes blijven voor lopen. Sneltoetsen werken niet terwijl je typt.</p>' +
      '<button class="btn red" id="sReset">Voortgang resetten</button><p class="tip">Je voortgang wordt in deze browser bewaard.</p></div>';
    var wasOpen = !$('modal').classList.contains('hidden') && $('modal').querySelector('.hklist');
    var sc = wasOpen ? $('modal').querySelector('.mbody') : null, top = sc ? sc.scrollTop : 0;
    UI._modal('⚙️ Instellingen', html, 'sm');
    if (wasOpen && $('modal').querySelector('.mbody')) $('modal').querySelector('.mbody').scrollTop = top;
    $('sSfx').onclick = function () { s.sfx = !s.sfx; G.Audio.setSfx(s.sfx); P.save(); UI.openSettings(); };
    $('sMus').onclick = function () { s.music = !s.music; G.Audio.setMusic(s.music); P.save(); UI.openSettings(); };
    $('sHk').onclick = function () { s.hotkeysOn = !s.hotkeysOn; P.save(); UI.openSettings(); UI.renderKeys(); };
    $('sHint').onclick = function () { s.hints = !s.hints; P.save(); UI.openSettings(); UI.renderKeys(); };
    $('sHkReset').onclick = function () { s.hotkeys = {}; P.save(); UI.openSettings(); UI.renderKeys(); };
    Array.prototype.forEach.call(document.querySelectorAll('.hklist button'), function (b) { b.onclick = function (ev) { ev.stopPropagation(); UI.startRebind(b.dataset.h); }; });
    $('sReset').onclick = function () {
      if (this.dataset.c) { P.reset(); UI.closeModal(); UI.toast('Voortgang gereset.'); return; }
      this.dataset.c = 1; this.textContent = 'Klik nogmaals om te bevestigen';
    };
  };

  // ---------------------------------------------------------------------
  //  HUD additions
  // ---------------------------------------------------------------------
  var baseBuildHUD = UI.buildHUD, baseUpdateHUD = UI.updateHUD, baseRenderPanel = UI.renderPanel;
  UI.buildHUD = function () {
    baseBuildHUD();
    var g = G.Game, h = $('hud');
    $('hTop').insertAdjacentHTML('beforeend', '<span class="chip kchip" id="hKills" title="Jouw kills en kill-geld">🧟 0 • $0</span>');
    h.insertAdjacentHTML('beforeend',
      '<div class="keys" id="hKeys"></div>' +
      '<div class="qbar" id="hQ">' +
      '<button class="btn small" data-a="upall" title="Koop 1 upgrade voor elke tower die je kunt betalen (prioriteit eerst)">⬆ Upgrade alles</button>' +
      '<button class="btn small" data-a="upfarms" title="Upgrade al je farms">🌾 Upgrade farms</button>' +
      '<button class="btn small" data-a="door" title="Deur upgraden">🚪 Deur</button>' +
      '<button class="btn small" data-a="menu" title="Overzicht van al je towers">📋 Upgrade-menu</button>' +
      '<button class="btn small" data-a="build" title="Bouwmodus: alle vrije vakjes en ranges">🧱 Bouwmodus</button></div>' +
      '<div class="keyfx" id="hKeyFx"></div>' +
      '<div class="doorbar hidden" id="hDoor" title="Jouw deur — klik om te repareren"><span class="dl">🚪</span><div class="db"><i class="dsh" id="hDoorSh"></i><i class="dhp" id="hDoorHp"></i><b id="hDoorTxt"></b></div></div>' +
      '<div class="lowwarn hidden" id="hLow"></div><div class="danger hidden" id="hDanger"></div>' +
      '<div class="upmenu hidden" id="hUp"></div>' +
      '<div class="score hidden" id="hScore"></div>' +
      '<div class="bpick hidden" id="hPick"></div>');
    Array.prototype.forEach.call($('hQ').children, function (b) { b.onclick = function () { click(); UI.doAction(b.dataset.a); }; });
    $('hDoor').onclick = function () { UI.doAction('repair'); };
    UI._upOpen = false; UI._score = false; UI._upT = 0; UI._scoreT = 0; UI._doorWarn = 0; UI._doorHpLast = null;
    g.ui.build = false; g.ui.buildPick = null;
    UI.renderKeys();
  };
  UI.renderKeys = function () {
    var el = $('hKeys'); if (!el) return;
    var s = P.d.settings;
    el.classList.toggle('hidden', !s.hints || !s.hotkeysOn);
    $('hQ') && Array.prototype.forEach.call($('hQ').children, function (b) {
      var k = s.hotkeysOn ? ' <kbd>' + esc(UI.keyName(UI.hk(b.dataset.a))) + '</kbd>' : '';
      if (!b.dataset.t) b.dataset.t = b.innerHTML; b.innerHTML = b.dataset.t + k;
    });
    el.innerHTML = '<div class="kh">SNELTOETSEN</div>' + ['upgrade', 'sell', 'auto', 'prio', 'evolve', 'farm', 'upall', 'upfarms', 'door', 'repair', 'menu', 'build', 'score', 'home'].map(function (id) {
      var h = G.HOTKEYS.filter(function (x) { return x.id === id; })[0];
      return '<div class="krow" data-k="' + id + '"><kbd>' + esc(UI.keyName(UI.hk(id))) + '</kbd><span>' + esc(h.short) + '</span></div>';
    }).join('') + '<div class="krow"><kbd>1–5</kbd><span>Item</span></div>';
  };
  UI.updateHUD = function (dt, camView) {
    baseUpdateHUD(dt, camView);
    var g = G.Game, m = g.match, me = m.players[g.me], room = m.roomOf(me);
    var kt = '🧟 ' + fmt(me.stats.kills) + ' • $' + fmt(me.stats.killMoney);
    if ($('hKills') && $('hKills').textContent !== kt) $('hKills').textContent = kt;
    var q = $('hQ'); if (q) q.classList.toggle('hidden', !room || !me.alive || m.phase === 'claim');
    UI.updateDoorBar(m, me, room);
    // hint for building mode
    if (g.ui.build && !g.ui.placing && room) { var hint = $('hHint'); hint.classList.remove('hidden'); hint.innerHTML = '🧱 <b>Bouwmodus</b> — klik op een vrij vakje om te bouwen, op een tower om te upgraden • ' + UI.keyName(UI.hk('build')) + ' om te sluiten'; }
    if (UI._upOpen) { UI._upT -= dt; if (UI._upT <= 0) { UI._upT = 0.3; UI.renderUpMenu(); } }
    if (UI._score) { UI._scoreT -= dt; if (UI._scoreT <= 0) { UI._scoreT = 0.4; UI.renderScore(); } }
  };

  // ---------------------------------------------------------------------
  //  DOOR HP BAR (top) + low-HP warning
  // ---------------------------------------------------------------------
  UI.updateDoorBar = function (m, me, room) {
    var bar = $('hDoor'); if (!bar) return;
    var show = room && me.alive && m.phase !== 'claim';
    bar.classList.toggle('hidden', !show);
    $('hBoss').classList.toggle('below', !!show);
    if (!show) { $('hLow').classList.add('hidden'); $('hDanger').classList.add('hidden'); return; }
    var d = room.door, f = Math.max(0, d.hp / d.max), sh = d.shieldUntil > room.time ? Math.min(1, d.shield / d.max) : 0;
    var lvl = f <= 0.25 ? 2 : f <= 0.5 ? 1 : 0, repairing = d.repairUntil > room.time;
    $('hDoorHp').style.width = (f * 100) + '%';
    $('hDoorSh').style.width = (sh * 100) + '%';
    var hit = UI._doorHpLast != null && d.hp < UI._doorHpLast - 0.5; UI._doorHpLast = d.hp;
    var txt = 'Deur ' + G.FX.fmt(Math.max(0, d.hp)) + ' / ' + G.FX.fmt(d.max) + ' (' + Math.ceil(f * 100) + '%)' + (sh ? ' • 🛡 ' + G.FX.fmt(d.shield) : '') + (repairing ? ' • 🔧 repareren…' : '');
    if ($('hDoorTxt').textContent !== txt) $('hDoorTxt').textContent = txt;
    bar.className = 'doorbar lv' + lvl + (hit ? ' hit' : bar.classList.contains('hit') && R.time - (UI._hitT || 0) < 0.25 ? ' hit' : '');
    if (hit) UI._hitT = R.time;
    // warnings: once when it drops below 50% and below 25%, again after it was repaired above 60%
    if (f > 0.6) UI._doorWarn = 0;
    var low = $('hLow');
    if (lvl > UI._doorWarn) {
      UI._doorWarn = lvl;
      G.Audio.sfx(lvl === 2 ? 'alarm' : 'error');
      UI._lowUntil = R.time + 4;
      low.innerHTML = (lvl === 2 ? '🚨 <b>JE DEUR IS BIJNA KAPOT!</b>' : '⚠️ <b>Je deur is onder de 50%</b>') +
        '<small>' + (d.repairReady <= room.time && !repairing ? 'Druk op <kbd>' + esc(UI.keyName(UI.hk('repair'))) + '</kbd> om te repareren of <kbd>' + esc(UI.keyName(UI.hk('door'))) + '</kbd> om te upgraden' : 'Upgrade je deur (<kbd>' + esc(UI.keyName(UI.hk('door'))) + '</kbd>) of zet meer towers neer') + (m.canBuild(me) ? '' : ' — loop eerst terug (<kbd>' + esc(UI.keyName(UI.hk('home'))) + '</kbd>)') + '</small>';
      low.className = 'lowwarn lv' + lvl;
    }
    low.style.top = $('hBoss').classList.contains('hidden') ? '' : (window.innerWidth > 900 ? '140px' : '172px');
    if (UI._lowUntil && R.time > UI._lowUntil) { low.classList.add('hidden'); UI._lowUntil = 0; }
    $('hDanger').classList.toggle('hidden', lvl < 2);
  };

  // ---------------------------------------------------------------------
  //  BUILD MODE quick picker (click on a free tile)
  // ---------------------------------------------------------------------
  UI.buildPick = function (tx, ty, sx, sy) {
    var g = G.Game, m = g.match, me = m.players[g.me], room = m.roomOf(me), el = $('hPick');
    if (!room) return false;
    var path = room.def.pathSet[tx + ',' + ty], inside = G.inRect(room.def.interior, tx, ty);
    if ((!path && !inside) || room.tile[tx + ',' + ty]) return false;
    var opts = me.loadout.filter(function (id) { var it = G.ITEM[id]; return path ? it.place === 'path' : it.place !== 'path'; });
    if (!opts.length) { UI.toast(path ? 'Je hebt geen traps in je loadout.' : 'Geen towers in je loadout.', '#ff9f1c'); return true; }
    g.ui.buildPick = { x: tx, y: ty };
    el.innerHTML = '';
    opts.forEach(function (id) {
      var it = G.ITEM[id], err = m.canPlace(me, id, tx, ty), b = document.createElement('button');
      b.className = 'bp' + (err ? ' no' : ''); b.title = err || it.name;
      b.appendChild(UI.icon(it, 34));
      b.insertAdjacentHTML('beforeend', '<small>$' + fmt(it.cost) + '</small><kbd>' + (me.loadout.indexOf(id) + 1) + '</kbd>');
      b.onclick = function (ev) {
        ev.stopPropagation();
        var r = g.net.send({ type: 'place', item: id, x: tx, y: ty });
        if (!r.ok) { UI.toast(r.msg, '#ff4d4d'); G.Audio.sfx('error'); }
        g.ui.buildPick = null; UI.hideBuildPick();
      };
      el.appendChild(b);
    });
    el.style.left = Math.min(window.innerWidth - 60 * opts.length - 20, Math.max(8, sx - 30 * opts.length)) + 'px';
    el.style.top = Math.max(8, sy - 78) + 'px';
    el.classList.remove('hidden');
    return true;
  };
  UI.hideBuildPick = function () { var el = $('hPick'); if (el) el.classList.add('hidden'); };

  // ---------------------------------------------------------------------
  //  UPGRADE MENU (U): every tower in your room at a glance
  // ---------------------------------------------------------------------
  UI.toggleUpMenu = function (on) {
    UI._upOpen = on == null ? !UI._upOpen : on;
    $('hUp').classList.toggle('hidden', !UI._upOpen);
    UI._upT = 0; if (UI._upOpen) UI.renderUpMenu();
  };
  UI.renderUpMenu = function () {
    var g = G.Game, m = g.match, me = m.players[g.me], room = m.roomOf(me), el = $('hUp');
    if (!room) { el.innerHTML = '<p>Je hebt nog geen kamer.</p>'; return; }
    var near = m.canBuild(me), list = m.upgradeOrder(room);
    var key = list.map(function (q) { return q.id + JSON.stringify(q.lvl) + q.auto + q.prio + q.evo; }).join('|') + '|' + Math.floor(me.cash / 25) + near;
    if (el.dataset.k === key) return; el.dataset.k = key;
    var h = '<div class="umh"><h3>📋 Upgrade-menu</h3><span class="tip">' + list.length + ' towers • gesorteerd op prioriteit en prijs</span><div class="grow"></div><button class="x" id="uX">✕</button></div>' +
      '<div class="umq"><button class="btn small yellow" data-u="upall">⬆ Upgrade alles <kbd>' + UI.keyName(UI.hk('upall')) + '</kbd></button><button class="btn small green" data-u="upfarms">🌾 Alle farms <kbd>' + UI.keyName(UI.hk('upfarms')) + '</kbd></button><button class="btn small" data-u="door">🚪 Deur $' + fmt(G.doorUpgradeCost(room.door.lvl)) + ' <kbd>' + UI.keyName(UI.hk('door')) + '</kbd></button><button class="btn small" data-u="autoall">⟳ Auto alles</button></div>' +
      (near ? '' : '<p class="tip" style="color:#ff9f1c">Loop naar je kamer om te upgraden.</p>') + '<div class="umlist">';
    list.forEach(function (q) {
      var nl = m.nextLevel(q), tr = !!nl, c = tr ? m.upgradeCost(q) : 0, nx = q.item.evo && q.item.evo[q.evo];
      h += '<div class="umrow' + (q.prio ? ' prio' : '') + '" data-t="' + q.id + '"><span class="ic" data-ic="' + q.item.id + '"></span><div class="un"><b style="color:' + G.RAR[q.item.rarity].color + '">' + esc(q.evo ? q.item.evo[q.evo - 1].name : q.item.name) + '</b><small>Lv ' + m.towerLevel(q) + '/' + G.UPGRADE_LEVELS + (nl ? ' • volgende: ' + G.pathText(q.item, nl) : '') + (q.item.isFarm ? ' • $' + fmt(q.earned) + ' verdiend' : ' • ' + q.kills + ' kills') + (nx && m.towerLevel(q) >= nx.lvl ? ' • <span style="color:#ffd23f">🧬 kan evolueren</span>' : '') + '</small></div>' +
        '<button class="tg ' + (q.auto ? 'on' : '') + '" data-a="auto" title="Auto-upgrade">⟳</button><button class="tg ' + (q.prio ? 'on' : '') + '" data-a="prio" title="Prioriteit">!</button>' +
        '<button class="btn small ' + (tr ? 'yellow' : '') + '" data-a="up" ' + (!tr || me.cash < c || !near ? 'disabled' : '') + '>' + (tr ? 'Lv ' + (m.towerLevel(q) + 1) + ' $' + fmt(c) : 'MAX') + '</button></div>';
    });
    el.innerHTML = h + (list.length ? '' : '<p class="tip">Nog geen towers geplaatst.</p>') + '</div><p class="tip">⟳ Auto: koopt automatisch upgrades zodra je geld hebt • ! Prioriteit: deze tower eerst (auto spaart ervoor).</p>';
    Array.prototype.forEach.call(el.querySelectorAll('[data-ic]'), function (s) { s.appendChild(UI.icon(G.ITEM[s.dataset.ic], 30)); });
    $('uX').onclick = function () { UI.toggleUpMenu(false); };
    Array.prototype.forEach.call(el.querySelectorAll('[data-u]'), function (b) {
      b.onclick = function () {
        click();
        if (b.dataset.u === 'autoall') { var anyOff = room.towers.some(function (q) { return !q.auto; }); room.towers.forEach(function (q) { g.net.send({ type: 'auto', tower: q.id, on: anyOff }); }); UI.keyFx('auto', 'Auto-upgrade ' + (anyOff ? 'AAN' : 'UIT') + ' voor alles', true); }
        else UI.doAction(b.dataset.u);
        el.dataset.k = ''; UI.renderUpMenu();
      };
    });
    Array.prototype.forEach.call(el.querySelectorAll('.umrow'), function (row) {
      var id = +row.dataset.t, q = room.towers.filter(function (x) { return x.id === id; })[0];
      row.querySelector('.un').onclick = function () { g.ui.selTower = id; g.ui.selDoor = false; UI.panelDirty(); };
      Array.prototype.forEach.call(row.querySelectorAll('[data-a]'), function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation(); click();
          var r;
          if (b.dataset.a === 'up') { r = g.net.send({ type: 'upgradeTower', tower: id }); if (!r.ok) UI.toast(r.msg, '#ff4d4d'); }
          else { r = g.net.send({ type: b.dataset.a, tower: id, on: !q[b.dataset.a] }); }
          el.dataset.k = ''; UI.renderUpMenu(); UI.panelDirty();
        };
      });
    });
  };

  // ---------------------------------------------------------------------
  //  SCOREBOARD (hold TAB)
  // ---------------------------------------------------------------------
  UI.showScore = function (on) { UI._score = on; var el = $('hScore'); if (!el) return; el.classList.toggle('hidden', !on); if (on) { UI._scoreT = 0; UI.renderScore(); } };
  UI.renderScore = function () {
    var g = G.Game, m = g.match, el = $('hScore');
    var list = m.players.slice().sort(function (a, b) { return P.rank(m, a.id) - P.rank(m, b.id); });
    var h = '<h3>🏆 Scorebord — wave ' + m.wave + '</h3><table class="tbl"><tr><th>#</th><th>Speler</th><th>Kamer</th><th>Status</th><th>Kills</th><th>Kill $</th><th>Bosses</th><th>Verdiend</th><th>Deur</th></tr>';
    list.forEach(function (p, i) {
      var r = m.roomOf(p), hp = r ? Math.max(0, r.door.hp / r.door.max) : 1;
      h += '<tr class="' + (p.id === g.me ? 'you' : '') + '"><td>' + (i + 1) + '</td><td><span class="rdot" style="background:' + p.color + '"></span>' + esc(p.name) + (p.isBot ? ' <span class="tip">bot</span>' : '') + '</td><td>' + (r ? esc(r.def.name) + (r.partner >= 0 ? ' 🤝' : '') : '—') + '</td><td>' + (!p.alive ? '💀 w' + p.stats.waveReached : p.finished ? '🏁' : '✅') + '</td><td>' + fmt(p.stats.kills) + '</td><td>$' + fmt(p.stats.killMoney) + '</td><td>' + p.stats.bosses + '</td><td>$' + fmt(p.stats.moneyEarned) + '</td><td><div class="hpb" style="width:60px"><i style="width:' + hp * 100 + '%;background:' + (hp > 0.5 ? '#4cd964' : hp > 0.25 ? '#ffcc00' : '#ff4d4d') + '"></i></div></td></tr>';
    });
    el.innerHTML = h + '</table><p class="tip">Laat ' + UI.keyName(UI.hk('score')) + ' los om te sluiten</p>';
  };

  // ---------------------------------------------------------------------
  //  TOWER INTERFACE (improved panel)
  // ---------------------------------------------------------------------
  function dps(t, st) {
    var it = t.item, ev = t.evo ? it.evo[t.evo - 1] : null;
    if (!it.dmg || !st.cd) return 0;
    var mult = (it.pellets || it.shots || 1) + (ev && ev.pellets ? ev.pellets : 0);
    mult *= ev && ev.multi ? ev.multi : 1; mult *= ev && ev.rockets ? ev.rockets : 1; mult *= ev && ev.beams ? ev.beams : 1;
    return st.dmg / st.cd * mult;
  }
  function towerCanvas(it, o, size) {
    var cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
    var c = cv.getContext('2d'); c.scale(dpr * size / 60, dpr * size / 60);
    R.drawTower(c, it, 30, 36, Object.assign({ angle: -0.6 }, o));
    return cv;
  }
  UI.towerCanvas = towerCanvas;
  function kbd(id) { return P.d.settings.hotkeysOn ? ' <kbd>' + esc(UI.keyName(UI.hk(id))) + '</kbd>' : ''; }
  UI.renderPanel = function () {
    var g = G.Game, m = g.match, me = m.players[g.me], room = m.roomOf(me), pan = $('hPanel');
    if (!room || g.ui.selDoor || !g.ui.selTower || !me.alive) return baseRenderPanel();
    var t = room.towers.filter(function (q) { return q.id === g.ui.selTower; })[0];
    if (!t) { g.ui.selTower = null; pan.classList.add('hidden'); return; }
    pan.classList.remove('hidden');
    var it = t.item, st = m.stats(t, room), lvl = m.towerLevel(t), near = m.canBuild(me), tier = G.towerTier(t), ev = t.evo ? it.evo[t.evo - 1] : null, nx = it.evo && it.evo[t.evo];
    var key = 'T' + near + t.id + '|' + JSON.stringify(t.lvl) + '|' + Math.floor(me.cash / 25) + '|' + t.target + '|' + t.kills + '|' + Math.round(t.earned) + '|' + (t.data.souls || 0) + t.auto + t.prio + t.evo + (Math.round(t.dmgDealt / 100));
    if (pan.dataset.k === key) return; pan.dataset.k = key;
    var sc = pan.scrollTop;
    pan.innerHTML = '';
    var head = document.createElement('div'); head.className = 'tph';
    head.appendChild(towerCanvas(it, { level: lvl, tier: tier, evo: t.evo, skin: t.cos && t.cos.skin, angle: -0.6 }, 58));
    var owner = t.by != null && t.by !== g.me && m.players[t.by] ? '<div class="tip">Geplaatst door <b style="color:' + m.players[t.by].color + '">' + esc(m.players[t.by].name) + '</b></div>' : '';
    head.insertAdjacentHTML('beforeend', '<div style="flex:1;min-width:0"><h3>' + esc(ev ? ev.name : it.name) + '</h3>' + (ev ? '<div class="tip">' + esc(it.name) + ' • evolutie ' + t.evo + '/2</div>' : '') +
      '<span class="rr" style="color:' + G.RAR[it.rarity].color + '">' + G.RAR[it.rarity].name.toUpperCase() + '</span> <span class="tip">• Level ' + lvl + (P.stars(it.id) && t.by === g.me ? ' • ' + P.stars(it.id) + '★' : '') + '</span>' + owner + '</div><button class="x" id="pX">✕</button>');
    pan.appendChild(head);
    // stats grid
    var cells = [];
    if (it.dmg) cells.push(['Damage', fmt(st.dmg)]);
    if (it.dmg && st.cd) cells.push(['Attack speed', (1 / st.cd).toFixed(2) + '/s']);
    if (it.range && !it.global) cells.push(['Range', (st.range / G.T).toFixed(1) + ' tegels']); else if (it.global) cells.push(['Range', 'Hele map']);
    var d = dps(t, st); if (d) cells.push(['DPS', '<span style="color:#ffd23f">' + fmt(d) + '</span>']);
    if (it.isFarm) { cells.push(['Inkomen', '$' + fmt(st.income * t.buff.farm) + (it.kind === 'mine_farm' ? '/20s' : '/5s')]); cells.push(['Farm-geld', '$' + fmt(t.earned)]); }
    if (it.dmg || it.kind === 'wall') { cells.push(['Kills', fmt(t.kills)]); cells.push(['Damage totaal', fmt(t.dmgDealt)]); }
    if (it.kind === 'wall') cells.push(['HP', fmt(Math.max(0, t.hp)) + '/' + fmt(t.maxHp)]);
    if (it.kind === 'soul') cells.push(['Zielen', t.data.souls]);
    var grid = '<div class="tgrid">' + cells.map(function (c) { return '<div><small>' + c[0] + '</small><b>' + c[1] + '</b></div>'; }).join('') + '</div>';
    var buffs = [t.buff.dmg > 1 ? '+' + Math.round((t.buff.dmg - 1) * 100) + '% dmg' : '', t.buff.spd > 1 ? '+' + Math.round((t.buff.spd - 1) * 100) + '% spd' : '', t.buff.detect ? 'detectie' : '', t.buff.farm > 1 ? '+' + Math.round((t.buff.farm - 1) * 100) + '% inkomen' : ''].filter(Boolean).join(', ');
    pan.insertAdjacentHTML('beforeend', grid + '<div class="srow"><span>Special</span><b>' + esc(ev ? ev.ability : it.ability) + '</b></div>' + (buffs ? '<div class="srow"><span>Buffs</span><b style="color:#7dff9a">' + buffs + '</b></div>' : '') +
      (near ? '' : '<p class="tip" style="color:#ff9f1c">Je bent niet in je kamer — loop terug (' + UI.keyName(UI.hk('home')) + ') om te upgraden.</p>'));
    // quick actions
    var cheap = m.nextLevel(t), cc = cheap ? m.upgradeCost(t) : 0;
    var qa = document.createElement('div'); qa.className = 'tquick';
    qa.innerHTML = '<button class="btn small yellow" data-q="upgrade" ' + (!cheap || me.cash < cc || !near ? 'disabled' : '') + '>⬆ ' + (cheap ? 'Lv ' + (lvl + 1) + ' • $' + fmt(cc) : 'MAX LEVEL') + kbd('upgrade') + '</button>' +
      '<button class="tg ' + (t.auto ? 'on' : '') + '" data-q="auto" title="Auto-upgrade: koopt automatisch upgrades voor deze tower">⟳ Auto' + kbd('auto') + '</button>' +
      '<button class="tg ' + (t.prio ? 'on' : '') + '" data-q="prio" title="Prioriteit: wordt als eerste geüpgraded">! Prio' + kbd('prio') + '</button>';
    pan.appendChild(qa);
    Array.prototype.forEach.call(qa.querySelectorAll('[data-q]'), function (b) { b.onclick = function () { click(); UI.doAction(b.dataset.q); }; });
    // upgrade path: every level improves a mix of stats
    var pathEl = document.createElement('div'); pathEl.className = 'upath';
    var ph = '<div class="uph"><b>Upgrade-pad</b><span class="tip">Lv ' + lvl + ' / ' + G.UPGRADE_LEVELS + '</span></div><div class="ulv">';
    for (var li = 0; li < G.UPGRADE_LEVELS; li++) ph += '<i class="' + (li < lvl ? 'on' : li === lvl ? 'nx' : '') + '"></i>';
    ph += '</div>';
    it.path.forEach(function (inc, li) {
      if (li < lvl - 1 || li > lvl + 2) return;   // last bought level + the next three
      ph += '<div class="ustep ' + (li < lvl ? 'done' : li === lvl ? 'next' : '') + '"><span class="un">' + (li < lvl ? '✓' : 'Lv ' + (li + 1)) + '</span><span class="ut">' + esc(G.pathText(it, inc)) + '</span>' +
        (li === lvl ? '<button class="btn small yellow" ' + (me.cash < cc || !near ? 'disabled' : '') + '>$' + fmt(cc) + '</button>' : '') + '</div>';
    });
    if (!cheap) ph += '<div class="ustep done"><span class="ut">Maximaal level bereikt — alle stats zijn volledig geüpgraded</span></div>';
    pathEl.innerHTML = ph;
    var ub = pathEl.querySelector('.ustep.next button');
    if (ub) ub.onclick = function () { click(); UI.doAction('upgrade'); };
    pan.appendChild(pathEl);
    if (tier < 10) {
      var pv = document.createElement('div'); pv.className = 'tprev';
      pv.innerHTML = '<small>Volgende upgrade verandert het model:</small><div class="pvr"></div><small class="tip">' + tierText(tier + 1, it) + '</small>';
      var pr = pv.querySelector('.pvr');
      pr.appendChild(towerCanvas(it, { level: lvl, tier: tier, evo: t.evo, skin: t.cos && t.cos.skin }, 50));
      pr.insertAdjacentHTML('beforeend', '<span>➜</span>');
      pr.appendChild(towerCanvas(it, { level: lvl + 1, tier: tier + 1, evo: t.evo, skin: t.cos && t.cos.skin }, 50));
      pan.appendChild(pv);
    }
    // evolution
    if (nx) {
      var okL = lvl >= nx.lvl, okC = me.cash >= nx.cost, evd = document.createElement('div'); evd.className = 'tevo';
      evd.innerHTML = '<div class="evh"><span class="evc"></span><div><b>🧬 Evolutie ' + (t.evo + 1) + ': ' + esc(nx.name) + '</b><small>' + esc(nx.ability) + '</small></div></div>' +
        '<div class="evr"><span class="' + (okL ? 'ok' : 'no') + '">' + (okL ? '✓' : '✗') + ' Level ' + nx.lvl + ' (nu ' + lvl + ')</span><span class="' + (okC ? 'ok' : 'no') + '">' + (okC ? '✓' : '✗') + ' $' + fmt(nx.cost) + '</span></div>' +
        '<button class="btn small purple" style="width:100%" ' + (okL && okC && near ? '' : 'disabled') + '>✨ Evolueer' + kbd('evolve') + '</button>';
      evd.querySelector('.evc').appendChild(towerCanvas(it, { level: Math.max(lvl, nx.lvl), tier: Math.max(tier, Math.min(10, nx.lvl)), evo: t.evo + 1, skin: t.cos && t.cos.skin }, 50));
      evd.querySelector('button').onclick = function () { click(); UI.doAction('evolve'); };
      pan.appendChild(evd);
    } else if (it.evo) pan.insertAdjacentHTML('beforeend', '<div class="srow"><span>Evolutie</span><b style="color:#ffd23f">Volledig geëvolueerd ★★</b></div>');
    // mastery progress (your own towers)
    if (t.by === g.me) {
      var ms = P.mast(it.id), need = ms.lvl >= G.MASTERY_MAX ? 1 : G.masteryXpFor(ms.lvl + 1), live = me.mast[it.id] || [0, 0, 0];
      var nr = G.MASTERY_REWARDS.filter(function (r) { return r.lvl > ms.lvl; })[0];
      pan.insertAdjacentHTML('beforeend', '<div class="tmast"><div class="srow"><span>🎖 Mastery Lv ' + ms.lvl + '</span><b>' + (ms.lvl >= G.MASTERY_MAX ? 'MAX' : fmt(ms.xp) + ' / ' + fmt(need) + ' XP') + '</b></div><div class="xpb"><i style="width:' + Math.min(100, ms.xp / need * 100) + '%"></i></div><small class="tip">Dit potje: ' + live[0] + ' kills, ' + live[2] + ' bosses' + (nr ? ' • volgende: ' + nr.icon + ' ' + esc(nr.name) + ' (Lv ' + nr.lvl + ')' : '') + '</small></div>');
    }
    // targeting
    if (it.dmg && it.place !== 'path' && !it.global) {
      var tg = document.createElement('div'); tg.className = 'tgt';
      [['first', 'Eerste'], ['last', 'Laatste'], ['strongest', 'Sterkste'], ['closest', 'Dichtst']].forEach(function (o) {
        var b = document.createElement('button'); b.textContent = o[1]; b.className = t.target === o[0] ? 'on' : '';
        b.onclick = function () { g.net.send({ type: 'target', tower: t.id, mode: o[0] }); UI.panelDirty(); UI.renderPanel(); };
        tg.appendChild(b);
      });
      pan.appendChild(tg);
    }
    var sell = document.createElement('button'); sell.className = 'btn red small'; sell.style.cssText = 'width:100%;margin-top:10px';
    sell.innerHTML = 'Verkoop voor $' + fmt(m.sellValue(t)) + kbd('sell'); sell.disabled = !near;
    sell.onclick = function () { var r = g.net.send({ type: 'sell', tower: t.id }); if (r.ok) g.ui.selTower = null; UI.panelDirty(); UI.renderPanel(); };
    pan.appendChild(sell);
    $('pX').onclick = function () { g.ui.selTower = null; UI.panelDirty(); UI.renderPanel(); };
    pan.scrollTop = sc;
  };
  function tierText(n, it) {
    var specific = { frost: 'meer ijskristallen', tesla: 'extra spoelen', rocket: 'extra raketwerper', laser: 'extra emitter', printer: 'extra verdieping', sniper: 'grotere scope en geweer', cashreg: 'meer geldstapels', flamethrower: 'extra brandstoftank' }[it.id];
    var generic = ['', 'tandwiel', 'tweede tandwiel', 'pantserplaten', 'neon-strip', 'dubbele loop', 'energiekern', 'hex-platform', 'draaiende ring', 'vonken', 'gouden kroon'][n];
    return 'Lv ' + n + ': + ' + generic + (specific ? ' • ' + specific : '');
  }

  // ---------------------------------------------------------------------
  //  ACHIEVEMENTS (icons + progress) and unlock popups
  // ---------------------------------------------------------------------
  UI.openAch = function () {
    var h = '<div class="achs">';
    G.ACHIEVEMENTS.forEach(function (a) {
      var done = !!P.d.ach[a.id], cur = Math.min(a.goal, P.achStat(a));
      h += '<div class="ach ' + (done ? 'done' : '') + '"><div class="ai">' + (done ? a.icon : '🔒') + '</div><div style="flex:1;min-width:0"><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small>' +
        '<div class="xpb"><i style="width:' + (cur / a.goal * 100) + '%"></i></div><small>' + fmt(cur) + ' / ' + fmt(a.goal) + ' <span class="coin" style="float:right">🪙 ' + fmt(a.reward) + (done ? ' ✓' : '') + '</span></small></div></div>';
    });
    UI._modal('🎖️ Achievements — ' + Object.keys(P.d.ach).length + '/' + G.ACHIEVEMENTS.length, h + '</div>');
  };
  var achQ = [];
  UI.flushAch = function () {
    if (!P.newAch.length) return;
    achQ = achQ.concat(P.newAch); P.newAch = [];
    if (!UI._achBusy) nextAch();
    UI.refreshCoins && UI.refreshCoins();
  };
  function nextAch() {
    var a = achQ.shift(); if (!a) { UI._achBusy = false; return; }
    UI._achBusy = true;
    var d = document.createElement('div'); d.className = 'achpop';
    d.innerHTML = '<div class="ai">' + a.icon + '</div><div><small>ACHIEVEMENT UNLOCKED</small><b>' + esc(a.name) + '</b><span class="coin">+🪙 ' + fmt(a.reward) + '</span></div>';
    document.body.appendChild(d); G.Audio.sfx('summon');
    setTimeout(function () { d.classList.add('out'); }, 2800);
    setTimeout(function () { d.remove(); nextAch(); }, 3300);
  }

  // ---------------------------------------------------------------------
  //  TOWER MASTERY screen
  // ---------------------------------------------------------------------
  UI.openMastery = function (selId) {
    var owned = G.ITEMS.filter(function (it) { return P.owns(it.id); });
    owned.sort(function (a, b) { var ma = P.d.mastery[a.id], mb = P.d.mastery[b.id]; return ((mb ? mb.lvl * 1e6 + mb.xp : 0) - (ma ? ma.lvl * 1e6 + ma.xp : 0)) || G.RAR[b.rarity].index - G.RAR[a.rarity].index; });
    var sel = selId || UI._mastSel || owned[0].id; UI._mastSel = sel;
    UI._modal('🎖 Tower Mastery', '<div class="mastwrap"><div class="mastgrid" id="mg"></div><div class="mastdet" id="md"></div></div><p class="tip">Mastery geeft alleen cosmetische beloningen (skins, kill-effecten, animaties, badges) — nooit extra kracht. XP komt van kills, damage, bosses en gespeelde potjes met die tower.</p>');
    var mg = $('mg');
    owned.forEach(function (it) {
      var ms = P.d.mastery[it.id], c = document.createElement('div'); c.className = 'mcell' + (it.id === sel ? ' on' : ''); c.style.borderColor = G.RAR[it.rarity].color;
      c.appendChild(UI.icon(it, 40)); c.insertAdjacentHTML('beforeend', '<small>Lv ' + (ms ? ms.lvl : 1) + '</small>' + (ms && ms.lvl >= 2 ? '<span class="mb">' + (ms.lvl >= 20 ? '🏅' : ms.lvl >= 10 ? '🥈' : '🥉') + '</span>' : ''));
      c.title = it.name; c.onclick = function () { click(); UI.openMastery(it.id); };
      mg.appendChild(c);
    });
    var it = G.ITEM[sel], ms = P.mast(sel), need = ms.lvl >= G.MASTERY_MAX ? 1 : G.masteryXpFor(ms.lvl + 1), eq = P.d.cos[sel] || {};
    var md = $('md');
    md.innerHTML = '<div class="mdh"><span id="mPrev"></span><div><h3 style="margin:0">' + esc(it.name) + '</h3><span class="rr" style="color:' + G.RAR[it.rarity].color + '">' + G.RAR[it.rarity].name.toUpperCase() + '</span><div style="font-size:22px;font-weight:700">Mastery Lv ' + ms.lvl + (ms.lvl >= G.MASTERY_MAX ? ' (MAX)' : '') + '</div></div></div>' +
      '<div class="xpb big"><i style="width:' + Math.min(100, ms.xp / need * 100) + '%"></i></div><small class="tip">' + (ms.lvl >= G.MASTERY_MAX ? 'Maximaal level bereikt' : fmt(ms.xp) + ' / ' + fmt(need) + ' XP naar level ' + (ms.lvl + 1)) + '</small>' +
      '<div class="tgrid" style="margin-top:8px"><div><small>Kills</small><b>' + fmt(ms.kills) + '</b></div><div><small>Damage</small><b>' + fmt(ms.dmg) + '</b></div><div><small>Bosses</small><b>' + fmt(ms.bosses) + '</b></div><div><small>Potjes</small><b>' + fmt(ms.matches) + '</b></div></div>' +
      '<h4 style="margin:10px 0 4px">Beloningen</h4><div class="mrew">' + G.MASTERY_REWARDS.map(function (r) {
        var un = ms.lvl >= r.lvl, canEq = un && r.type !== 'badge', on = r.type === 'anim' ? !!eq.anim : eq[r.type] === r.id;
        return '<div class="mr ' + (un ? 'un' : '') + '"><span class="ic">' + (un ? r.icon : '🔒') + '</span><div style="flex:1"><b>' + esc(r.name) + '</b><small>Level ' + r.lvl + '</small></div>' + (canEq ? '<button class="btn small ' + (on ? 'green' : '') + '" data-t="' + r.type + '" data-v="' + r.id + '">' + (on ? 'Uitrusten ✓' : 'Uitrusten') + '</button>' : '') + '</div>';
      }).join('') + '</div>';
    $('mPrev').appendChild(towerCanvas(it, { level: 6, tier: 6, skin: eq.skin, anim: eq.anim }, 84));
    Array.prototype.forEach.call(md.querySelectorAll('button[data-t]'), function (b) {
      b.onclick = function () {
        click(); var ty = b.dataset.t, v = b.dataset.v, cur = P.d.cos[sel] || {};
        if (ty === 'anim') P.equip(sel, 'anim', cur.anim ? null : v);
        else P.equip(sel, ty, cur[ty] === v ? null : v);
        UI.openMastery(sel);
      };
    });
  };

  // ---------------------------------------------------------------------
  //  DAILY MISSIONS
  // ---------------------------------------------------------------------
  UI.openMissions = function () {
    var list = P.missions(), ms = P.missionReset(), hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60;
    var h = '<p class="tip" style="margin-top:0">Nieuwe missions over <b>' + hh + 'u ' + mm + 'm</b> • Tickets: 🎟️ ' + (P.d.tickets.normal || 0) + ' Normal • 💎 ' + (P.d.tickets.premium || 0) + ' Premium</p><div class="mlist">';
    list.forEach(function (m, i) {
      var done = m.prog >= m.goal;
      h += '<div class="mis ' + (m.claimed ? 'cl' : done ? 'dn' : '') + '"><div class="tierb t' + m.tier + '">' + ['★', '★', '★★', '★★★'][m.tier + (m.tier ? 1 : 0)] + '</div><div style="flex:1"><b>' + esc(P.missionText(m)) + '</b><div class="xpb"><i style="width:' + (m.prog / m.goal * 100) + '%"></i></div><small>' + fmt(m.prog) + ' / ' + fmt(m.goal) + ' • Beloning: ' + P.rewardText(m.reward) + '</small></div>' +
        '<button class="btn small ' + (done && !m.claimed ? 'yellow' : '') + '" data-i="' + i + '" ' + (done && !m.claimed ? '' : 'disabled') + '>' + (m.claimed ? '✓ Geclaimd' : done ? 'Claim!' : 'Bezig') + '</button></div>';
    });
    h += '</div><h4 style="margin:14px 0 6px">🎩 Hoeden (cosmetisch)</h4><div class="hats">' + G.HATS.map(function (ht) {
      var own = P.d.hats.indexOf(ht.id) >= 0;
      return '<button class="hat ' + (P.d.hat === ht.id ? 'on' : '') + '" data-h="' + ht.id + '" ' + (own ? '' : 'disabled') + ' title="' + esc(ht.name) + '">' + (own ? ht.icon : '🔒') + '<small>' + esc(ht.name) + '</small></button>';
    }).join('') + '</div><p class="tip">Hoeden verdien je met daily missions. Je hoed is zichtbaar voor iedereen in online potjes.</p>';
    UI._modal('📅 Daily Missions', h, 'sm');
    Array.prototype.forEach.call(document.querySelectorAll('.mis button[data-i]'), function (b) {
      b.onclick = function () {
        var r = P.claimMission(+b.dataset.i); if (!r) return;
        G.Audio.sfx('summon'); UI.rewardBurst(b, P.rewardText(r.reward) + (r.extra ? ' — ' + r.extra : ''));
        UI.refreshCoins(); UI.flushAch(); setTimeout(UI.openMissions, 700);
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('.hat[data-h]'), function (b) { b.onclick = function () { click(); P.d.hat = P.d.hat === b.dataset.h ? null : b.dataset.h; P.save(); UI.openMissions(); }; });
  };
  // coin-burst animation from an element
  UI.rewardBurst = function (el, text) {
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < 14; i++) {
      var c = document.createElement('div'); c.className = 'flycoin'; c.textContent = '🪙';
      c.style.left = cx + 'px'; c.style.top = cy + 'px';
      var a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d - 30 + 'px');
      document.body.appendChild(c); setTimeout(function (n) { n.remove(); }.bind(null, c), 900);
    }
    var tx = document.createElement('div'); tx.className = 'flytxt'; tx.textContent = text; tx.style.left = cx + 'px'; tx.style.top = cy - 20 + 'px';
    document.body.appendChild(tx); setTimeout(function () { tx.remove(); }, 1400);
  };

  // ---------------------------------------------------------------------
  //  RESULTS / REWARD SCREEN (animated, detailed)
  // ---------------------------------------------------------------------
  var CAT = { completion: 'Voltooiing', kills: 'Kills', bosses: 'Bosses', waves: 'Waves', bonus: 'Prestatiebonussen' };
  UI.results = function (match, pid, rew) {
    var p = match.players[pid], d = match.diff;
    var title = d.id === 'endless' ? 'ENDLESS RUN' : rew.win ? 'VICTORY!' : 'DEFEAT';
    var col = rew.win ? '#4cd964' : d.id === 'endless' ? '#bf5af2' : '#ff4d4d';
    var sorted = match.players.slice().sort(function (a, b) { return P.rank(match, a.id) - P.rank(match, b.id); });
    var cats = Object.keys(CAT).filter(function (c) { return rew.lines.some(function (l) { return l.cat === c; }); });
    var h = '<div class="res-title" style="color:' + col + ';text-shadow:0 0 30px ' + col + '">' + title + '</div>' +
      '<p style="text-align:center;margin:0 0 12px" class="tip">' + match.map.name + ' • ' + d.name + ' • Plaats #' + rew.rank + ' van ' + match.players.length + (match.duo ? ' • 🤝 Duo' : '') + '</p>' +
      '<div class="rstats"><div><small>Waves</small><b>' + p.stats.waveReached + '</b></div><div><small>Kills</small><b>' + fmt(p.stats.kills) + '</b></div><div><small>Kill-geld</small><b>$' + fmt(p.stats.killMoney) + '</b></div><div><small>Bosses</small><b>' + p.stats.bosses + '</b></div><div><small>Verdiend</small><b>$' + fmt(p.stats.moneyEarned) + '</b></div><div><small>Upgrades</small><b>' + p.stats.upgrades + '</b></div><div><small>Deurdamage</small><b>' + fmt(p.stats.doorDamage) + '</b></div></div>' +
      '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:16px" class="resg"><div><h4 style="margin:0 0 6px">💰 Beloningen</h4><div class="rewards" id="rwl">' +
      cats.map(function (c) { return '<div class="rcat"><h5>' + CAT[c] + '</h5>' + rew.lines.filter(function (l) { return l.cat === c; }).map(function (l) { return '<div class="srow rline"><span>' + (l.icon || '') + ' ' + esc(l.label) + '</span><b class="coin" data-v="' + l.coins + '">+🪙0</b></div>'; }).join('') + '</div>'; }).join('') +
      '<div class="srow rtotal"><span>Totaal</span><b class="coin" id="rTot">+🪙0</b></div></div>' +
      '<p class="tip">≈ ' + (rew.total / G.SUMMON.normal.cost).toFixed(1) + ' Normal Summons</p>' +
      (rew.mastery && rew.mastery.length ? '<h4 style="margin:12px 0 6px">🎖 Tower Mastery</h4><div class="rmast">' + rew.mastery.map(function (mm) {
        var ms = P.mast(mm.id), need = ms.lvl >= G.MASTERY_MAX ? 1 : G.masteryXpFor(ms.lvl + 1);
        return '<div class="rm"><span data-ic="' + mm.id + '"></span><div style="flex:1"><b>' + esc(G.ITEM[mm.id].name) + '</b> <span class="tip">+' + mm.xp + ' XP</span>' + (mm.after > mm.before ? ' <span class="lvup">LEVEL UP! ' + mm.before + ' → ' + mm.after + '</span>' : '') +
          '<div class="xpb"><i style="width:0" data-w="' + Math.min(100, ms.xp / need * 100) + '"></i></div>' + (mm.unlocked.length ? '<small style="color:#ffd23f">Ontgrendeld: ' + mm.unlocked.map(function (u) { return u.icon + ' ' + esc(u.name); }).join(', ') + '</small>' : '') + '</div></div>';
      }).join('') + '</div>' : '') + '</div>' +
      '<div><h4 style="margin:0 0 6px">Lobby</h4><table class="tbl"><tr><th>#</th><th>Speler</th><th>Wave</th><th>Kills</th><th>Bosses</th><th>$</th></tr>' +
      sorted.map(function (q, i) { return '<tr class="' + (q.id === pid ? 'you' : '') + '"><td>' + (i + 1) + '</td><td><span class="rdot" style="background:' + q.color + '"></span>' + esc(q.name) + (q.isBot ? ' <span class="tip">' + (G.BOT_STYLES[q.style] ? G.BOT_STYLES[q.style].name : 'bot') + '</span>' : '') + '</td><td>' + (q.finished && q.alive ? '🏁 ' : q.alive ? '' : '💀 ') + q.stats.waveReached + '</td><td>' + fmt(q.stats.kills) + '</td><td>' + q.stats.bosses + '</td><td>' + fmt(q.stats.moneyEarned) + '</td></tr>'; }).join('') + '</table>' +
      '<h4 style="margin:12px 0 6px">📅 Daily missions</h4>' + P.missions().map(function (m) { return '<div class="srow"><span>' + esc(P.missionText(m)) + '</span><b style="color:' + (m.prog >= m.goal ? '#4cd964' : '#fff') + '">' + (m.claimed ? '✓' : m.prog >= m.goal ? 'Klaar! Claim in menu' : fmt(m.prog) + '/' + fmt(m.goal)) + '</b></div>'; }).join('') +
      '</div></div>' +
      (G.Game.mode === 'host' && match.players.some(function (q) { return !q.isBot && q.id !== pid && q.alive && !q.finished; }) ? '<p class="tip" style="text-align:center;color:#ff9f1c">Je bent de host: anderen spelen nog. Als je naar de lobby gaat, stopt het potje voor iedereen.</p>' : '') +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap"><button class="btn" id="rLobby">Naar lobby</button><button class="btn blue" id="rSum">Summon</button><button class="btn" id="rMast">🎖 Mastery</button><button class="btn green" id="rAgain">Opnieuw spelen</button></div>';
    UI._modal('Resultaten', h);
    $('modal').dataset.sticky = '1';
    Array.prototype.forEach.call(document.querySelectorAll('.rmast [data-ic]'), function (s) { s.appendChild(UI.icon(G.ITEM[s.dataset.ic], 34)); });
    $('mClose').onclick = $('rLobby').onclick = function () { click(); G.Game.toLobby(); };
    $('rSum').onclick = function () { click(); G.Game.toLobby(); UI.openSummon(); };
    $('rMast').onclick = function () { click(); G.Game.toLobby(); UI.openMastery(); };
    $('rAgain').onclick = function () { click(); $('modal').classList.add('hidden'); if (G.Game.mode !== 'solo') { G.Game.toLobby(); UI.openOnline(); } else G.Game.start(match.map.id, match.diff.id, match.duo); };
    if (G.Game.mode !== 'solo') $('rAgain').textContent = 'Online lobby';
    G.Audio.sfx(rew.win ? 'win' : 'lose');
    // animated count-up, line by line
    var lines = document.querySelectorAll('#rwl .rline b'), acc = 0, i = 0;
    function step() {
      if (i >= lines.length) { countTo($('rTot'), 0, rew.total, 700); setTimeout(function () { $('rTot') && $('rTot').classList.add('pop'); G.Audio.sfx('cash'); if ($('rTot')) UI.rewardBurst($('rTot'), '+🪙 ' + fmt(rew.total)); }, 700); return; }
      var b = lines[i], v = +b.dataset.v; b.parentNode.classList.add('in'); countTo(b, 0, v, 380); acc += v; G.Audio.sfx('blip'); i++;
      setTimeout(step, 320);
    }
    setTimeout(step, 400);
    setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll('.rmast .xpb i'), function (x) { x.style.width = x.dataset.w + '%'; }); if (document.querySelector('.lvup')) G.Audio.sfx('upgrade'); }, 900);
    setTimeout(UI.flushAch, 1600);
  };
  function countTo(el, a, b, ms) {
    if (!el) return; var t0 = performance.now();
    (function f(now) { var k = Math.min(1, (now - t0) / ms); el.textContent = '+🪙' + fmt(Math.round(a + (b - a) * k * (2 - k))); if (k < 1 && el.isConnected) requestAnimationFrame(f); })(t0);
  }
})();
