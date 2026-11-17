// =====================================================================
//  DEVICE DETECTION + TOUCH CONTROLS (phone / tablet / computer)
// =====================================================================
(function () {
  var UI = G.UI, P = G.Profile;
  function $(id) { return document.getElementById(id); }
  var D = G.Device = { type: 'desktop', touch: false, detected: 'desktop', portrait: false };
  var NAMES = { phone: '📱 Telefoon', tablet: '📲 Tablet', desktop: '🖥️ Computer' };
  D.NAMES = NAMES;

  // Works out what you are playing on. Uses the browser's own hints (touch screen, fine/coarse
  // pointer, user agent) and the screen size; a phone in landscape still counts as a phone.
  D.detect = function () {
    var nav = window.navigator || {}, ua = nav.userAgent || '', mtp = nav.maxTouchPoints || 0;
    var mm = function (q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
    var touch = mm('(pointer: coarse)') || mtp > 0 || 'ontouchstart' in window;
    var ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && mtp > 1);
    var phoneUA = !ipad && /iPhone|iPod|Android.+Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile|Mobile Safari/i.test(ua);
    var tabletUA = ipad || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || /Tablet|Silk|Kindle|PlayBook/i.test(ua);
    var scr = window.screen || {}, short = Math.min(scr.width || window.innerWidth, scr.height || window.innerHeight);
    var type = phoneUA ? 'phone' : tabletUA ? 'tablet' : touch && !mm('(hover: hover)') ? (short < 600 ? 'phone' : 'tablet') : 'desktop';
    return { type: type, touch: touch || type !== 'desktop', short: short };
  };
  D.apply = function () {
    var d = D.detect(), o = P.d && P.d.settings && P.d.settings.device;
    D.detected = d.type;
    D.type = o && o !== 'auto' && NAMES[o] ? o : d.type;
    D.touch = D.type !== 'desktop';   // a laptop with a touch screen keeps the mouse/keyboard layout
    D.portrait = window.innerHeight > window.innerWidth;
    var b = document.body; if (!b) return D;
    ['phone', 'tablet', 'desktop'].forEach(function (t) { b.classList.toggle('dev-' + t, D.type === t); });
    b.classList.toggle('touch', D.touch); b.classList.toggle('notouch', !D.touch);
    b.classList.toggle('portrait', D.portrait); b.classList.toggle('landscape', !D.portrait);
    return D;
  };

  // ---------------------------------------------------------------------
  //  Pinch to zoom on the map
  // ---------------------------------------------------------------------
  D.bind = function (cv) {
    // one viewport rule for the whole game (no pinch-zoom of the page, use the full screen incl. notch)
    var metas = document.querySelectorAll('meta[name="viewport"]');
    Array.prototype.forEach.call(metas, function (m) { m.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover'); });
    var pts = {}, pinch = null;
    function count() { return Object.keys(pts).length; }
    function dist() { var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (count() === 2) { pinch = { d: dist(), z: G.Game.zoom || 1 }; G.Game.pinching = true; G.Game.cancelTap && G.Game.cancelTap(); }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && count() >= 2) G.Game.setZoom(pinch.z * dist() / Math.max(20, pinch.d));
    });
    function up(e) { delete pts[e.pointerId]; if (count() < 2) pinch = null; if (!count()) setTimeout(function () { G.Game.pinching = false; }, 60); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    window.addEventListener('resize', function () { D.apply(); });
    window.addEventListener('orientationchange', function () { setTimeout(D.apply, 200); });
    // no browser zoom / scroll / long-press menus on the game itself
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (D.touch) e.preventDefault(); }, { passive: false });
  };

  // ---------------------------------------------------------------------
  //  HUD for touch screens: joystick, action buttons, minimap toggle
  // ---------------------------------------------------------------------
  var baseBuild = UI.buildHUD, baseUpdate = UI.updateHUD;
  UI.buildHUD = function () {
    D.apply();
    baseBuild();
    var g = G.Game, h = $('hud');
    if (!D.touch) return;
    h.insertAdjacentHTML('beforeend',
      '<div class="joy" id="hJoy"><div class="joyk" id="hJoyK"></div></div>' +
      '<div class="tact" id="hAct">' +
      '<button class="tb" data-a="home" title="Naar je kamer">🏠</button>' +
      '<button class="tb" data-a="score" title="Scorebord">🏆</button>' +
      '<button class="tb" data-a="zoomin" title="Inzoomen">＋</button>' +
      '<button class="tb" data-a="zoomout" title="Uitzoomen">－</button>' +
      '</div>');
    Array.prototype.forEach.call($('hAct').children, function (b) {
      b.onclick = function (e) {
        e.stopPropagation(); G.Audio.sfx('click');
        var a = b.dataset.a;
        if (a === 'score') UI.showScore(!UI._score);
        else if (a === 'zoomin') g.setZoom((g.zoom || 1) * 1.2);
        else if (a === 'zoomout') g.setZoom((g.zoom || 1) / 1.2);
        else UI.doAction(a);
      };
    });
    if ($('hScore')) $('hScore').onclick = function () { UI.showScore(false); };
    // compact quick-bar labels
    Array.prototype.forEach.call(($('hQ') || { children: [] }).children, function (b) {
      var ic = { upall: '⬆', upfarms: '🌾', door: '🚪', menu: '📋', build: '🧱' }[b.dataset.a];
      b.dataset.t = '<span class="qi">' + ic + '</span><span class="ql">' + ({ upall: 'Alles', upfarms: 'Farms', door: 'Deur', menu: 'Menu', build: 'Bouw' }[b.dataset.a]) + '</span>';
      b.innerHTML = b.dataset.t;
    });
    // virtual joystick
    var joy = $('hJoy'), knob = $('hJoyK'), jid = null, last = { x: 0, y: 0 };
    function setDir(dx, dy) {
      var l = Math.hypot(dx, dy), R = Math.max(30, (joy.getBoundingClientRect().width || 120) / 2 - 6), kx = 0, ky = 0;
      if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      if (l > 12) { var a = Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) * (Math.PI / 8); kx = Math.round(Math.cos(a) * 100) / 100; ky = Math.round(Math.sin(a) * 100) / 100; }
      if (kx !== last.x || ky !== last.y) { last = { x: kx, y: ky }; if (g.state === 'match') g.net.send({ type: 'keys', kx: kx, ky: ky }); }
    }
    function centre(e) { var r = joy.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }; }
    joy.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (er) {} joy.classList.add('on'); var c = centre(e); setDir(c.x, c.y); });
    joy.addEventListener('pointermove', function (e) { if (e.pointerId !== jid) return; var c = centre(e); setDir(c.x, c.y); });
    function rel(e) { if (e.pointerId !== jid) return; jid = null; joy.classList.remove('on'); setDir(0, 0); }
    joy.addEventListener('pointerup', rel); joy.addEventListener('pointercancel', rel);
    // smaller minimap on phones
    var mc = $('hMini');
    if (D.type === 'phone' && mc) {
      var mw = 120, mh = Math.round(mw * G.WROWS / G.WCOLS), dpr = Math.min(2, window.devicePixelRatio || 1);
      mc.width = mw * dpr; mc.height = mh * dpr; mc.style.width = mw + 'px'; mc.style.height = mh + 'px'; mc.dataset.w = mw;
    }
    // tower names are too long for the phone loadout bar
    if (D.type === 'phone') Array.prototype.forEach.call(document.querySelectorAll('#hLbar .lcard .hk'), function (k) { k.style.display = 'none'; });
    if (D.type === 'phone' && D.portrait && !UI._rotSeen) UI.rotateHint();
  };
  UI.updateHUD = function (dt, view) {
    baseUpdate(dt, view);
    if (D.touch && $('hPanel')) document.body.classList.toggle('sheet', !$('hPanel').classList.contains('hidden'));
  };
  UI.rotateHint = function () {
    if ($('rotHint')) return;
    var d = document.createElement('div'); d.id = 'rotHint'; d.className = 'rothint';
    d.innerHTML = '<div class="rh"><div class="ph">📱</div><b>Draai je telefoon</b><p>Zombie Door Tycoon speelt het fijnst liggend (landschap).</p><button class="btn small" id="rotOk">Toch staand spelen</button></div>';
    document.body.appendChild(d);
    var close = function () { UI._rotSeen = true; d.remove(); };
    $('rotOk').onclick = close;
    var chk = setInterval(function () { if (!document.body.contains(d)) return clearInterval(chk); if (window.innerWidth > window.innerHeight) { close(); clearInterval(chk); } }, 400);
  };

  // ---------------------------------------------------------------------
  //  Settings: shows the detected device and lets you override it
  // ---------------------------------------------------------------------
  var baseSettings = UI.openSettings;
  UI.openSettings = function () {
    baseSettings();
    var box = document.querySelector('#modal .hklist'); if (!box) return;
    var s = P.d.settings, cur = s.device || 'auto';
    var html = '<h4 style="margin:6px 0 0">📱 Apparaat</h4><p class="tip" style="margin:2px 0 6px">Gedetecteerd: <b>' + NAMES[D.detected] + '</b>' + (D.touch ? ' • aanraakbediening aan' : '') + '</p><div class="filters" id="sDev">' +
      [['auto', 'Automatisch'], ['phone', NAMES.phone], ['tablet', NAMES.tablet], ['desktop', NAMES.desktop]].map(function (o) { return '<span class="chip' + (cur === o[0] ? ' on' : '') + '" data-d="' + o[0] + '">' + o[1] + '</span>'; }).join('') + '</div>' +
      (document.fullscreenEnabled || document.webkitFullscreenEnabled ? '<button class="btn small" id="sFull" style="margin-top:6px">⛶ Volledig scherm</button>' : '');
    box.previousElementSibling.previousElementSibling.insertAdjacentHTML('beforebegin', html);
    Array.prototype.forEach.call(document.querySelectorAll('#sDev .chip'), function (c) {
      c.onclick = function () { s.device = c.dataset.d; P.save(); D.apply(); UI.openSettings(); if (G.Game.state === 'match') UI.buildHUD(); else UI.showLobby(); UI.openSettings(); };
    });
    if ($('sFull')) $('sFull').onclick = function () { D.fullscreen(); };
    if (D.touch) Array.prototype.forEach.call(document.querySelectorAll('#modal .hkrow, #modal .hklist, #sHk, #sHint, #sHkReset'), function (el) { el.style.opacity = '.5'; });
  };
  D.fullscreen = function () {
    var el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (!rq) return;
    try {
      var pr = rq.call(el);
      var lock = function () { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} };
      if (pr && pr.then) pr.then(lock).catch(function () {}); else lock();
    } catch (e) {}
  };

  // lobby: a fullscreen button on touch devices that support it
  var baseLobby = UI.showLobby;
  UI.showLobby = function () {
    D.apply();
    baseLobby.apply(this, arguments);
    var lob = $('lobby');
    if (D.touch && lob && (document.fullscreenEnabled || document.webkitFullscreenEnabled) && !$('bFull')) {
      var b = document.createElement('button'); b.className = 'btn fullbtn'; b.id = 'bFull'; b.textContent = '⛶'; b.title = 'Volledig scherm';
      b.onclick = function () { G.Audio.sfx('click'); D.fullscreen(); };
      lob.appendChild(b);
    }
    var tag = $('devTag');
    var hdr = lob && lob.querySelector('header .grow');
    if (hdr && !tag) { tag = document.createElement('div'); tag.id = 'devTag'; tag.className = 'devtag'; tag.title = 'Gedetecteerd apparaat — aan te passen in ⚙️ Instellingen'; hdr.parentNode.insertBefore(tag, hdr.nextSibling); }
    if (tag) tag.textContent = NAMES[D.type] + (D.type !== D.detected ? ' (handmatig)' : '');
  };
})();
