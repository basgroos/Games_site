/* =========================================================================
 * main.js — opstarten, schalen, hoofdloop, menu-achtergrondgevecht, input.
 * ========================================================================= */
var AC = window.AC;
(function () {
  var Main = { demo: null, last: 0, t: 0 };
  AC.Main = Main;

  /* Schalen: het podium heeft een vaste ontwerpmaat en wordt passend geschaald.
     Computer/tablet: 1600×900. Telefoon (compacte layout): 1000 breed, hoogte volgt
     de verhouding van het scherm, zodat knoppen en tekst groot genoeg blijven. */
  function fit() {
    var st = document.getElementById('stage'), D = AC.Device;
    var vw = window.innerWidth || 1600, vh = window.innerHeight || 900;
    if (window.visualViewport && window.visualViewport.width) { vw = Math.min(vw, window.visualViewport.width); vh = Math.min(vh, window.visualViewport.height); }
    var phone = D.layout() === 'phone', W = 1600, H = 900;
    if (phone) { W = 1000; H = Math.max(420, Math.min(720, Math.round(1000 * vh / vw))); }
    st.style.width = W + 'px'; st.style.height = H + 'px';
    var s = Math.min(vw / W, vh / H);
    st.style.transform = 'scale(' + s + ')';
    Main.scale = s; Main.W = W; Main.H = H;
    var b = document.body.classList;
    b.toggle('phone', phone); b.toggle('touch', D.touch); b.toggle('dev-' + D.type, true);
    var rot = document.getElementById('rotate');
    if (rot) {
      rot.style.display = phone && D.touch && D.isPortrait() && !Main.rotateDismissed ? 'flex' : 'none';
      var fsb = rot.querySelector('[data-act=fs]'); if (fsb) fsb.style.display = D.canFullscreen() ? '' : 'none';
    }
  }
  Main.fit = fit;

  Main.newDemo = function () {
    var a = Math.floor(Math.random() * 8), b = Math.max(0, Math.min(7, a + Math.floor(Math.random() * 3) - 1));
    var sim = new AC.Sim({ seed: (Math.random() * 1e9) | 0, players: [{ maxAge: 7, color: AC.Profile.color() }, { maxAge: 7, color: '#ff4a4a' }] });
    [a, b].forEach(function (age, s) { var p = sim.players[s]; p.age = age; p.iron = 900 * Math.pow(1.4, age); var bs = sim.bases[s]; bs.maxHp = bs.hp = sim._baseMaxHp(p) * 3; p.xp = AC.CONST.AGE_XP[age]; });
    Main.demo = { sim: sim, bots: [new AC.Bot(sim, 0, 'normal', 3), new AC.Bot(sim, 1, 'normal', 9)], acc: 0, t: 0 };
    if (!Main.demoR) { Main.demoR = new AC.Renderer(document.getElementById('menuCv')); Main.demoR.audio = null; }
    Main.demoR.bgKey = ''; Main.demoR.parts = []; Main.demoR.banners = [];
  };

  Main.onScreen = function (id) {
    document.getElementById('menuCv').style.display = id === 'match' ? 'none' : 'block';
  };

  function frame(ts) {
    var dt = Main.lastStep ? (performance.now() - Main.lastStep) / 1000 : 0.016;
    Main.step(Main.online() ? dt : Math.min(0.1, dt));
    requestAnimationFrame(frame);
  }
  Main.online = function () { return AC.Match.active && AC.Match.mode === 'online' && !AC.Match.resultShown; };
  /* Een tabblad dat niet in beeld is krijgt geen animatieframes. Online zou de match dan stilstaan
     en de tegenstander eindeloos wachten; daarom draait de match dan op een timer verder en
     laten we de tegenstander weten dat we even weg zijn. */
  // 'weg' = tabblad verborgen, of al 0,6 s geen echt frame meer (de timer-stappen tellen niet mee)
  Main.away = function () { return document.hidden || performance.now() - (Main.lastFrame || Main.bootT || 0) > 600; };
  setInterval(function () {
    if (!Main.booted || !Main.online()) return;
    var away = Main.away();
    if (AC.Match.net) AC.Match.net.setAway(!!away);
    if (away) Main._tick(Main.lastStep ? (performance.now() - Main.lastStep) / 1000 : 0.25);
  }, 250);
  // Main.step = één echt frame (animatieframe, of een test die zelf stapt); Main._tick = ook timer-stappen
  Main.step = function (dt) { Main.lastFrame = performance.now(); Main._tick(dt); };
  Main._tick = function (dt) {
    Main.t += dt; Main.lastStep = performance.now();
    try {
      if (AC.Match.active) AC.Match.update(dt);
      else {
        var D = Main.demo; if (!D || D.sim.over || D.t > 110) { Main.newDemo(); D = Main.demo; }
        D.acc += dt; D.t += dt;
        while (D.acc >= AC.CONST.TICK) { D.bots[0].update(AC.CONST.TICK); D.bots[1].update(AC.CONST.TICK); D.sim.tick(); D.acc -= AC.CONST.TICK; }
        D.sim.events = D.sim.events.filter(function (e) { return e.e !== 'dmg' && e.e !== 'death' && e.e !== 'power' && e.e !== 'evolve' && e.e !== 'item'; });
        Main.demoR.render(D.sim, D.acc / AC.CONST.TICK, { colors: [AC.Profile.color(), '#ff4a4a'], emblems: [AC.Profile.banner(), 'skull'], glow: [null, null], localSide: 0, buff: [D.sim.players[0].buffT, D.sim.players[1].buffT] }, dt);
        if (AC.UI.previews.length) AC.UI.tickPreviews(Main.t);
      }
      if (AC.audio) AC.audio.update();
    } catch (e) { console.error(e); }
  };

  Main.boot = function () {
    if (Main.booted) return; Main.booted = true; Main.bootT = performance.now();
    AC.Profile.loadLocal();
    AC.Device.override = AC.Profile.data.settings.device || 'auto';
    fit(); window.addEventListener('resize', fit); window.addEventListener('orientationchange', function () { setTimeout(fit, 120); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
    var rot = document.getElementById('rotate');
    if (rot) rot.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('button'); if (!t) return;
      if (t.dataset.act === 'fs') AC.Device.fullscreen(); else { Main.rotateDismissed = true; fit(); }
    });
    var S = AC.Profile.data.settings;
    AC.audio = new AC.Audio(); AC.audio.vol = S.vol; AC.audio.musVol = S.mus; AC.audio.muted = S.muted;
    document.addEventListener('pointerdown', function () { AC.audio.init(); }, { once: false });
    document.addEventListener('touchend', function () { AC.audio.init(); }, { passive: true }); // iOS: geluid pas na een tik
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      AC.audio.init();
      if (AC.Match.active && AC.Match.key(e)) { e.preventDefault(); return; }
      if (e.key === 'Escape' && !AC.Match.active) { var m = document.querySelector('.modal-bg'); if (m) m.remove(); else if (AC.UI.cur !== 'menu') AC.UI.show(AC.UI.cur === 'online' ? 'mode' : 'menu'); }
    });
    var cv = document.getElementById('cv');
    cv.addEventListener('pointermove', function (e) { AC.Match.mouseMove(e); });
    cv.addEventListener('pointerdown', function (e) { AC.Match.mouseMove(e); AC.Match.mouseDown(e); });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    AC.Profile.on(function () { if (AC.UI.cur === 'menu') AC.UI.show('menu'); });
    AC.UI.show('menu');
    requestAnimationFrame(frame);
    // cloud-opslag + online lobby op de achtergrond
    AC.Profile.connectCloud();
    setTimeout(function () { AC.Net.init(); }, 200);
  };

  window.boot = Main.boot; // wordt aangeroepen door de build (Bas Games-site en artifact)
})();
