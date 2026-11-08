/* =========================================================================
 * art_world.js — achtergronden, bases en towers per tijdperk.
 * Achtergronden worden één keer per tijdperk naar een offscreen canvas
 * getekend en daarna gecachet.
 * ========================================================================= */
var AC = window.AC;
(function () {
  var A = AC.art, rr = A.rr, circ = A.circ, ln = A.ln, poly = A.poly, shade = A.shade, PI = Math.PI;
  var W = AC.CONST.W, H = AC.CONST.H, G = AC.CONST.GROUND;

  function R(seed) { var r = new AC.RNG(seed); return function () { return r.next(); }; }
  function grad(c, y0, y1, stops) { var g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function hills(c, rnd, base, amp, col, step) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, H); c.lineTo(0, base);
    var y = base;
    for (var x = 0; x <= W + step; x += step) { y = base - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + rnd() * 0.6)) - rnd() * amp * 0.3; c.lineTo(x, y); }
    c.lineTo(W, H); c.closePath(); c.fill();
  }
  function groundBand(c, ag, rnd, top) {
    c.fillStyle = grad(c, G, H, [[0, ag.colors.ground2], [0.08, ag.colors.ground], [1, shade(ag.colors.ground, -0.45)]]);
    c.fillRect(0, G - 2, W, H - G + 2);
    for (var i = 0; i < 260; i++) { var x = rnd() * W, y = G + 8 + rnd() * (H - G); c.fillStyle = 'rgba(0,0,0,' + (0.05 + rnd() * 0.12) + ')'; c.fillRect(x, y, 2 + rnd() * 6, 1 + rnd() * 2); }
    for (var j = 0; j < 120; j++) { var x2 = rnd() * W, y2 = G + 6 + rnd() * (H - G); c.fillStyle = 'rgba(255,255,255,' + (0.03 + rnd() * 0.06) + ')'; c.fillRect(x2, y2, 1 + rnd() * 4, 1); }
    if (top) top();
  }

  var BG = [];
  BG[0] = function (c, ag, rnd) { // Primal Dawn — jungle
    c.fillStyle = grad(c, 0, G, [[0, '#0f3328'], [0.55, '#3f7d4a'], [1, '#9fc77a']]); c.fillRect(0, 0, W, G);
    c.fillStyle = 'rgba(255,255,200,0.15)'; circ(c, 1100, 140, 90); c.fill();
    hills(c, rnd, 380, 90, '#24543a', 40); hills(c, rnd, 440, 60, '#1d4630', 30);
    for (var i = 0; i < 26; i++) {
      var x = rnd() * W, h = 180 + rnd() * 200, tw = 10 + rnd() * 12, d = rnd() < 0.5;
      var col = d ? '#1a3a22' : '#24502c';
      rr(c, x - tw / 2, G - h, tw, h, 4); c.fillStyle = d ? '#2d2418' : '#3d3020'; c.fill();
      for (var k = 0; k < 6; k++) { c.fillStyle = shade(col, rnd() * 0.25 - 0.1); c.beginPath(); c.ellipse(x + (rnd() - 0.5) * 70, G - h + (rnd() - 0.5) * 50, 30 + rnd() * 30, 18 + rnd() * 18, rnd(), 0, PI * 2); c.fill(); }
      if (rnd() < 0.5) { c.strokeStyle = '#2f5a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, G - h + 20); c.quadraticCurveTo(x + 14, G - h / 2, x + 4, G - h * 0.3); c.stroke(); }
    }
    groundBand(c, ag, rnd, function () {
      for (var i = 0; i < 90; i++) { var x = rnd() * W; c.fillStyle = rnd() < 0.5 ? '#3a7a2a' : '#2f6b22'; poly(c, [x, G + 2, x + 4 + rnd() * 5, G - 14 - rnd() * 14, x + 10, G + 2], c.fillStyle); }
      c.fillStyle = '#3c7d2a'; c.fillRect(0, G - 3, W, 6);
    });
  };
  BG[1] = function (c, ag, rnd) { // Human Genesis — savanne
    c.fillStyle = grad(c, 0, G, [[0, '#5a2a4a'], [0.4, '#e07b39'], [1, '#f8d890']]); c.fillRect(0, 0, W, G);
    c.fillStyle = 'rgba(255,230,150,0.9)'; circ(c, 1180, 330, 70); c.fill(); c.fillStyle = 'rgba(255,200,120,0.25)'; circ(c, 1180, 330, 120); c.fill();
    hills(c, rnd, 430, 70, '#a8603a', 50); hills(c, rnd, 480, 30, '#8a5530', 40);
    // grot / rotsen
    c.fillStyle = '#6a4a35'; c.beginPath(); c.ellipse(420, G, 160, 110, 0, PI, 0); c.fill(); c.fillStyle = '#2a1a12'; c.beginPath(); c.ellipse(420, G, 40, 50, 0, PI, 0); c.fill();
    for (var i = 0; i < 9; i++) {
      var x = 120 + rnd() * (W - 240), h = 60 + rnd() * 50;
      ln(c, x, G, x + 6, G - h, 5, '#3a2418');
      c.fillStyle = '#3a4a20'; c.beginPath(); c.ellipse(x + 6, G - h - 6, 50 + rnd() * 20, 10, 0, 0, PI * 2); c.fill();
      c.beginPath(); c.ellipse(x + 20, G - h - 14, 30, 8, 0, 0, PI * 2); c.fill();
    }
    groundBand(c, ag, rnd, function () { for (var i = 0; i < 140; i++) { var x = rnd() * W; ln(c, x, G + 2, x + (rnd() - 0.5) * 6, G - 8 - rnd() * 16, 1.5, rnd() < 0.5 ? '#c9a24a' : '#b08a3a'); } });
  };
  BG[2] = function (c, ag, rnd) { // Pharaoh — woestijn
    c.fillStyle = grad(c, 0, G, [[0, '#d98a2b'], [0.6, '#f6d38b'], [1, '#fff0c8']]); c.fillRect(0, 0, W, G);
    c.fillStyle = 'rgba(255,255,230,0.95)'; circ(c, 300, 120, 50); c.fill();
    [[1050, 230], [1320, 170], [800, 120]].forEach(function (p) { poly(c, [p[0] - p[1], G - 70, p[0], G - 70 - p[1], p[0] + p[1], G - 70], '#d9a860'); poly(c, [p[0], G - 70 - p[1], p[0] + p[1], G - 70, p[0] + p[1] * 0.25, G - 70], '#b8884a'); poly(c, [p[0] - 14, G - 56 - p[1], p[0], G - 70 - p[1], p[0] + 14, G - 56 - p[1]], '#ffd34d'); });
    c.fillStyle = '#e8c27a'; c.beginPath(); c.moveTo(0, G); for (var x = 0; x <= W; x += 20) c.lineTo(x, G - 80 + Math.sin(x * 0.006) * 30); c.lineTo(W, G); c.fill();
    c.fillStyle = '#dcb468'; c.beginPath(); c.moveTo(0, G); for (var x2 = 0; x2 <= W; x2 += 20) c.lineTo(x2, G - 30 + Math.sin(x2 * 0.009 + 2) * 16); c.lineTo(W, G); c.fill();
    // obelisk + palmen
    poly(c, [585, G - 30, 595, G - 210, 605, G - 30], '#c9985a'); poly(c, [592, G - 210, 595, G - 222, 598, G - 210], '#ffd34d');
    [200, 470, 1450].forEach(function (x) {
      c.strokeStyle = '#7a5a30'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, G - 20); c.quadraticCurveTo(x + 20, G - 80, x + 6, G - 140); c.stroke();
      for (var k = 0; k < 6; k++) { var an = -PI / 2 + (k - 2.5) * 0.55; c.strokeStyle = '#3a7a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 6, G - 140); c.quadraticCurveTo(x + 6 + Math.cos(an) * 30, G - 150 + Math.sin(an) * 20, x + 6 + Math.cos(an) * 50, G - 130 + Math.sin(an) * 10); c.stroke(); }
    });
    groundBand(c, ag, rnd);
  };
  BG[3] = function (c, ag, rnd) { // Imperium — Romeinse heuvels
    c.fillStyle = grad(c, 0, G, [[0, '#3b2a5c'], [0.5, '#b07090'], [1, '#f0c8a8']]); c.fillRect(0, 0, W, G);
    hills(c, rnd, 400, 60, '#6a5a6a', 60);
    // aquaduct
    c.fillStyle = '#c8b8a0'; c.fillRect(0, 330, W, 18);
    for (var x = 0; x < W; x += 70) { c.fillStyle = '#b8a890'; c.fillRect(x, 348, 16, 110); c.fillStyle = 'rgba(0,0,0,0)'; }
    c.fillStyle = '#7a6a7a'; for (var x1 = 16; x1 < W; x1 += 70) { c.beginPath(); c.arc(x1 + 27, 380, 27, PI, 0); c.lineTo(x1 + 54, 460); c.lineTo(x1, 460); c.closePath(); c.fill(); }
    hills(c, rnd, 470, 40, '#5a6a3a', 50);
    // colosseum
    c.fillStyle = '#d8c8a8'; rr(c, 920, 380, 320, 100, 6); c.fill();
    for (var r = 0; r < 3; r++) for (var k = 0; k < 10; k++) { c.fillStyle = '#9a8a70'; rr(c, 932 + k * 31, 390 + r * 30, 18, 22, 8); c.fill(); }
    // cipressen
    for (var i = 0; i < 14; i++) { var cx = rnd() * W; c.fillStyle = '#2a4a2a'; c.beginPath(); c.ellipse(cx, G - 60, 10, 60 + rnd() * 20, 0, 0, PI * 2); c.fill(); }
    groundBand(c, ag, rnd, function () { c.fillStyle = '#6a7a3a'; c.fillRect(0, G - 3, W, 5); for (var i = 0; i < 60; i++) { c.fillStyle = 'rgba(200,190,170,0.5)'; rr(c, i * 28, G + 10, 24, 6, 2); c.fill(); } });
  };
  BG[4] = function (c, ag, rnd) { // Ironfront — industriële oorlog
    c.fillStyle = grad(c, 0, G, [[0, '#3a424c'], [0.6, '#8a8a84'], [1, '#c7b9a0']]); c.fillRect(0, 0, W, G);
    for (var i = 0; i < 9; i++) {
      var x = 120 + i * 170 + rnd() * 50, h = 80 + rnd() * 120;
      c.fillStyle = '#4a3a34'; c.fillRect(x, G - 60 - h, 18, h);
      c.fillStyle = '#5a4a40'; c.fillRect(x - 40, G - 120, 100, 70);
      for (var k = 0; k < 4; k++) { c.fillStyle = 'rgba(120,120,120,' + (0.25 - k * 0.05) + ')'; circ(c, x + 9 + k * 25, G - 70 - h - k * 25, 18 + k * 10); c.fill(); }
      for (var w = 0; w < 6; w++) { c.fillStyle = rnd() < 0.4 ? '#e0b060' : '#2a2420'; c.fillRect(x - 32 + (w % 3) * 28, G - 110 + (w / 3 | 0) * 28, 14, 14); }
    }
    hills(c, rnd, 500, 25, '#5a5040', 40);
    groundBand(c, ag, rnd, function () {
      for (var i = 0; i < 30; i++) { var x = i * 56 + rnd() * 10; ln(c, x, G + 4, x, G - 22, 3, '#5a4a30'); }
      c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.3; for (var j = 0; j < 3; j++) { c.beginPath(); for (var x2 = 0; x2 < W; x2 += 14) c.lineTo(x2, G - 6 - j * 7 + Math.sin(x2) * 2); c.stroke(); }
      for (var k = 0; k < 14; k++) { c.fillStyle = 'rgba(40,30,20,0.4)'; c.beginPath(); c.ellipse(rnd() * W, G + 30 + rnd() * 100, 30 + rnd() * 30, 8, 0, 0, PI * 2); c.fill(); }
    });
  };
  BG[5] = function (c, ag, rnd) { // Neo Warfare — verwoeste stad
    c.fillStyle = grad(c, 0, G, [[0, '#1a2028'], [0.6, '#5a6470'], [1, '#9aa4ac']]); c.fillRect(0, 0, W, G);
    for (var L = 0; L < 2; L++) {
      for (var x = -20; x < W; x += 60 + rnd() * 50) {
        var h = (L ? 120 : 200) + rnd() * 200, bw = 50 + rnd() * 60;
        c.fillStyle = L ? '#2a3038' : '#3a424c'; c.fillRect(x, G - h, bw, h);
        if (rnd() < 0.5) poly(c, [x, G - h, x + bw * 0.4, G - h - 20, x + bw * 0.7, G - h], c.fillStyle);
        for (var wy = G - h + 10; wy < G - 20; wy += 18) for (var wx = x + 6; wx < x + bw - 8; wx += 14) if (rnd() < 0.7) { c.fillStyle = rnd() < 0.12 ? '#e8a040' : '#1a1e24'; c.fillRect(wx, wy, 7, 9); }
      }
    }
    ln(c, 1200, G - 380, 1200, G - 120, 5, '#c8a030'); ln(c, 1100, G - 370, 1330, G - 370, 4, '#c8a030');
    for (var s = 0; s < 6; s++) { c.fillStyle = 'rgba(30,30,30,0.35)'; circ(c, rnd() * W, 200 + rnd() * 200, 40 + rnd() * 60); c.fill(); }
    groundBand(c, ag, rnd, function () { c.fillStyle = '#2a2d30'; c.fillRect(0, G - 2, W, 26); for (var i = 0; i < W; i += 80) { c.fillStyle = '#c8c040'; c.fillRect(i, G + 10, 40, 3); } for (var k = 0; k < 40; k++) { c.fillStyle = '#4a4a48'; poly(c, [rnd() * W, G + 2, rnd() * W, G - 8, rnd() * W, G + 2], '#4a4a48'); } });
  };
  BG[6] = function (c, ag, rnd) { // Mech — neon-metropool
    c.fillStyle = grad(c, 0, G, [[0, '#04081a'], [0.6, '#10284a'], [1, '#2a5a8a']]); c.fillRect(0, 0, W, G);
    for (var i = 0; i < 120; i++) { c.fillStyle = 'rgba(255,255,255,' + rnd() * 0.6 + ')'; c.fillRect(rnd() * W, rnd() * 300, 1.5, 1.5); }
    for (var L = 0; L < 2; L++) for (var x = -10; x < W; x += 50 + rnd() * 60) {
      var h = (L ? 160 : 260) + rnd() * 220, bw = 40 + rnd() * 50;
      c.fillStyle = L ? '#0c1428' : '#141e38'; c.fillRect(x, G - h, bw, h);
      c.fillStyle = rnd() < 0.5 ? 'rgba(51,224,255,0.7)' : 'rgba(255,60,200,0.6)'; c.fillRect(x, G - h, bw, 2);
      for (var wy = G - h + 12; wy < G - 10; wy += 14) if (rnd() < 0.6) { c.fillStyle = rnd() < 0.5 ? 'rgba(51,224,255,0.35)' : 'rgba(255,200,80,0.3)'; c.fillRect(x + 4, wy, bw - 8, 3); }
      if (rnd() < 0.3) { ln(c, x + bw / 2, G - h, x + bw / 2, G - h - 40, 2, '#33e0ff'); circ(c, x + bw / 2, G - h - 40, 3); c.fillStyle = '#ff3a5a'; c.fill(); }
    }
    groundBand(c, ag, rnd, function () {
      c.strokeStyle = 'rgba(51,224,255,0.35)'; c.lineWidth = 1;
      for (var y = G + 10; y < H; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      for (var x = -400; x < W + 400; x += 60) { c.beginPath(); c.moveTo(x, G); c.lineTo(W / 2 + (x - W / 2) * 2.2, H); c.stroke(); }
      c.fillStyle = '#33e0ff'; c.fillRect(0, G - 2, W, 3);
    });
  };
  BG[7] = function (c, ag, rnd) { // Omniverse — buitenaardse dimensie
    c.fillStyle = grad(c, 0, G, [[0, '#06010f'], [0.5, '#2a0a4a'], [1, '#6a2a9a']]); c.fillRect(0, 0, W, G);
    for (var n = 0; n < 7; n++) { var g = c.createRadialGradient(0, 0, 0, 0, 0, 1); var nx = rnd() * W, ny = rnd() * 350, nr = 120 + rnd() * 200; var rg = c.createRadialGradient(nx, ny, 0, nx, ny, nr); var cc = ['rgba(224,92,255,', 'rgba(85,255,238,', 'rgba(255,92,150,'][n % 3]; rg.addColorStop(0, cc + '0.25)'); rg.addColorStop(1, cc + '0)'); c.fillStyle = rg; c.fillRect(0, 0, W, G); }
    for (var i = 0; i < 220; i++) { c.fillStyle = 'rgba(255,255,255,' + rnd() * 0.9 + ')'; c.fillRect(rnd() * W, rnd() * G * 0.8, rnd() < 0.1 ? 2.5 : 1.2, rnd() < 0.1 ? 2.5 : 1.2); }
    // planeten
    [[1250, 140, 70, '#c86aff', '#5a1a8a'], [260, 90, 34, '#55ffee', '#1a5a6a'], [700, 220, 18, '#ffd35c', '#8a5a1a']].forEach(function (p) {
      var pg = c.createRadialGradient(p[0] - p[2] * 0.4, p[1] - p[2] * 0.4, 2, p[0], p[1], p[2]); pg.addColorStop(0, p[3]); pg.addColorStop(1, p[4]); c.fillStyle = pg; circ(c, p[0], p[1], p[2]); c.fill();
      if (p[2] > 50) { c.strokeStyle = 'rgba(255,200,255,0.5)'; c.lineWidth = 3; c.beginPath(); c.ellipse(p[0], p[1], p[2] * 1.7, p[2] * 0.35, -0.3, 0, PI * 2); c.stroke(); }
    });
    // zwevende rotsen + spiralen
    for (var r = 0; r < 8; r++) { var rx = rnd() * W, ry = 260 + rnd() * 180, rs = 14 + rnd() * 26; poly(c, [rx - rs, ry, rx + rs, ry, rx + rs * 0.3, ry + rs * 1.5], '#2a1448'); c.fillStyle = '#4a2a78'; c.fillRect(rx - rs, ry - 4, rs * 2, 5); }
    for (var s = 0; s < 7; s++) { var sx = rnd() * W, sh = 120 + rnd() * 160; poly(c, [sx - 18, G, sx, G - sh, sx + 18, G], '#1e0c38'); ln(c, sx, G - sh, sx, G - sh + 40, 2, '#e05cff'); }
    groundBand(c, ag, rnd, function () {
      for (var k = 0; k < 40; k++) { var kx = rnd() * W, kh = 6 + rnd() * 18; poly(c, [kx - 4, G + 2, kx, G - kh, kx + 4, G + 2], rnd() < 0.5 ? '#e05cff' : '#55ffee'); }
      c.fillStyle = 'rgba(224,92,255,0.5)'; c.fillRect(0, G - 2, W, 3);
    });
  };

  var bgCache = {};
  AC.getBackground = function (age) {
    if (bgCache[age]) return bgCache[age];
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    BG[age](c, AC.AGES[age], R(1234 + age * 77));
    bgCache[age] = cv; return cv;
  };

  /* ------------------------------ EMBLEMEN ------------------------------ */
  AC.drawEmblem = function (c, kind, x, y, s, col) {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.6;
    switch (kind) {
      case 'skull': circ(c, 0, -1, 5); c.fill(); rr(c, -3, 2, 6, 4, 1); c.fill(); c.fillStyle = 'rgba(0,0,0,0.6)'; circ(c, -2, -1.5, 1.4); c.fill(); circ(c, 2, -1.5, 1.4); c.fill(); break;
      case 'sun': circ(c, 0, 0, 3.5); c.fill(); for (var i = 0; i < 8; i++) { var a = i * PI / 4; ln(c, Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 7.5, Math.sin(a) * 7.5, 1.4, col); } break;
      case 'eagle': poly(c, [-8, -3, 0, 1, 8, -3, 4, 4, 0, 7, -4, 4], col); circ(c, 0, -3, 2.4); c.fill(); break;
      case 'gear': for (var j = 0; j < 8; j++) { c.save(); c.rotate(j * PI / 4); c.fillRect(-1.3, -7.5, 2.6, 3); c.restore(); } circ(c, 0, 0, 5); c.fill(); c.fillStyle = 'rgba(0,0,0,0.6)'; circ(c, 0, 0, 2); c.fill(); break;
      case 'eye': c.beginPath(); c.ellipse(0, 0, 7, 4, 0, 0, PI * 2); c.fill(); c.fillStyle = 'rgba(0,0,0,0.7)'; circ(c, 0, 0, 2.2); c.fill(); break;
      case 'crown': poly(c, [-7, 4, -7, -4, -3.5, 0, 0, -6, 3.5, 0, 7, -4, 7, 4], col); break;
      default: poly(c, [0, -6, 6, 0, 0, 6, -6, 0], col);
    }
    c.restore();
  };

  /* ------------------------------ BASES ------------------------------ */
  function flag(c, x, y, h, col, emblem, t) {
    ln(c, x, y, x, y - h, 2.5, '#3a3a3a');
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y - h);
    for (var i = 0; i <= 8; i++) { var fx = x + i * 4, fy = y - h + Math.sin(t * 5 + i * 0.7) * 2; c.lineTo(fx, fy); }
    for (var j = 8; j >= 0; j--) { var fx2 = x + j * 4, fy2 = y - h + 20 + Math.sin(t * 5 + j * 0.7) * 2; c.lineTo(fx2, fy2); }
    c.closePath(); c.fill();
    if (emblem) AC.drawEmblem(c, emblem, x + 16, y - h + 10 + Math.sin(t * 5 + 4 * 0.7) * 2, 0.9, 'rgba(255,255,255,0.9)');
  }
  var BASES = [
    function (c, o) { // grot
      c.fillStyle = '#6a5a4a'; c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(10, -200, 70, -190); c.quadraticCurveTo(140, -170, 150, 0); c.closePath(); c.fill();
      c.fillStyle = '#4a3e32'; c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(40, -140, 75, -130); c.quadraticCurveTo(110, -120, 120, 0); c.fill();
      c.fillStyle = '#1a120c'; c.beginPath(); c.ellipse(78, 0, 30, 70, 0, PI, 0); c.fill();
      var f = Math.sin(o.t * 12) * 2; poly(c, [66, 0, 78, -24 - f, 90, 0], '#ff8a2a'); poly(c, [71, 0, 78, -14 + f, 85, 0], '#ffe06a');
      [[30, -80], [110, -60]].forEach(function (b) { ln(c, b[0], b[1], b[0] + 14, b[1] - 8, 3, '#e8e0c8'); });
      flag(c, 125, -150, 50, o.col, o.emblem, o.t);
    },
    function (c, o) { // hut met palissade
      for (var i = 0; i < 9; i++) { rr(c, -6 + i * 17, -70 - (i % 2) * 8, 13, 70 + (i % 2) * 8, 3); c.fillStyle = i % 2 ? '#7a5530' : '#8a6438'; c.fill(); poly(c, [-6 + i * 17, -70 - (i % 2) * 8, 0.5 + i * 17, -82 - (i % 2) * 8, 7 + i * 17, -70 - (i % 2) * 8], '#6a4a28'); }
      poly(c, [10, -70, 70, -200, 135, -70], '#a8804a'); poly(c, [70, -200, 135, -70, 95, -70], '#8a6638');
      ln(c, 70, -200, 60, -220, 3, '#5a3a1a'); ln(c, 70, -200, 82, -218, 3, '#5a3a1a');
      c.fillStyle = '#2a1a10'; c.beginPath(); c.ellipse(72, -70, 16, 30, 0, PI, 0); c.fill();
      flag(c, 128, -120, 60, o.col, o.emblem, o.t);
    },
    function (c, o) { // piramide-tempel
      for (var i = 0; i < 6; i++) { rr(c, -5 + i * 12, -30 * (i + 1), 150 - i * 24, 30, 1); c.fillStyle = i % 2 ? '#d9a860' : '#c99850'; c.fill(); }
      poly(c, [55, -180, 70, -210, 85, -180], '#ffd34d');
      rr(c, 50, -60, 40, 60, 2); c.fillStyle = '#3a2a1a'; c.fill();
      [10, 130].forEach(function (x) { rr(c, x - 6, -120, 12, 120, 2); c.fillStyle = '#e8d8a8'; c.fill(); rr(c, x - 8, -126, 16, 8, 2); c.fillStyle = '#ffd34d'; c.fill(); });
      rr(c, 2, -110, 16, 60, 2); c.fillStyle = o.col; c.fill(); rr(c, 122, -110, 16, 60, 2); c.fill();
      flag(c, 70, -210, 40, o.col, o.emblem, o.t);
    },
    function (c, o) { // Romeins fort / tempel
      rr(c, -6, -40, 152, 40, 2); c.fillStyle = '#d8d0c0'; c.fill();
      for (var i = 0; i < 6; i++) { rr(c, 2 + i * 25, -150, 14, 110, 3); c.fillStyle = '#ece4d4'; c.fill(); ln(c, 6 + i * 25, -148, 6 + i * 25, -42, 1, '#c8c0b0'); ln(c, 12 + i * 25, -148, 12 + i * 25, -42, 1, '#c8c0b0'); }
      rr(c, -8, -162, 156, 14, 2); c.fillStyle = '#d8d0c0'; c.fill();
      poly(c, [-8, -162, 70, -220, 148, -162], '#b02a2a'); poly(c, [12, -166, 70, -208, 128, -166], '#e8e0d0');
      AC.drawEmblem(c, o.emblem || 'eagle', 70, -182, 1.4, '#e0b030');
      flag(c, 140, -162, 50, o.col, o.emblem, o.t);
    },
    function (c, o) { // bakstenen fort
      rr(c, -6, -150, 150, 150, 2); c.fillStyle = '#8a4a3a'; c.fill();
      for (var r = 0; r < 15; r++) for (var k = 0; k < 8; k++) { c.fillStyle = (r + k) % 3 ? '#7a3e30' : '#9a5444'; c.fillRect(-4 + k * 19 + (r % 2) * 9, -148 + r * 10, 17, 8); }
      for (var m = 0; m < 7; m++) { rr(c, -6 + m * 22, -166, 14, 18, 1); c.fillStyle = '#7a3e30'; c.fill(); }
      rr(c, 50, -60, 40, 60, 4); c.fillStyle = '#2a1a14'; c.fill();
      c.save(); c.translate(120, -120); rr(c, 0, -6, 36, 12, 4); c.fillStyle = '#2a2a2a'; c.fill(); c.restore();
      flag(c, 20, -166, 60, o.col, o.emblem, o.t);
    },
    function (c, o) { // bunker
      c.fillStyle = '#6a6e70'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(0, -110); c.lineTo(140, -110); c.lineTo(150, 0); c.fill();
      rr(c, 10, -86, 120, 12, 2); c.fillStyle = '#1a1c1e'; c.fill();
      for (var s = 0; s < 8; s++) { c.fillStyle = s % 2 ? '#8a7a5a' : '#9a8a6a'; c.beginPath(); c.ellipse(-4 + s * 20, -6, 11, 7, 0, 0, PI * 2); c.fill(); }
      rr(c, 30, -150, 14, 40, 2); c.fillStyle = '#4a4e50'; c.fill();
      c.save(); c.translate(37, -160); c.rotate(Math.sin(o.t * 0.8) * 0.6); c.strokeStyle = '#9aa'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 18, PI * 1.1, PI * 1.9); c.stroke(); c.restore();
      ln(c, 110, -110, 110, -200, 2, '#333'); circ(c, 110, -200, 3); c.fillStyle = Math.sin(o.t * 4) > 0 ? '#f33' : '#600'; c.fill();
      rr(c, 0, -112, 140, 6, 1); c.fillStyle = o.col; c.fill();
      flag(c, 130, -110, 50, o.col, o.emblem, o.t);
    },
    function (c, o) { // mechfabriek
      poly(c, [-6, 0, 10, -180, 130, -180, 150, 0], '#2a3448');
      rr(c, 20, -170, 100, 150, 4); c.fillStyle = '#3a4a64'; c.fill();
      var pulse = 0.6 + Math.sin(o.t * 3) * 0.3;
      circ(c, 70, -110, 26); c.fillStyle = '#0a1426'; c.fill(); circ(c, 70, -110, 16); c.fillStyle = 'rgba(51,224,255,' + pulse + ')'; c.shadowColor = '#33e0ff'; c.shadowBlur = 20; c.fill(); c.shadowBlur = 0;
      for (var i = 0; i < 5; i++) { rr(c, 26 + i * 19, -40, 12, 20, 2); c.fillStyle = 'rgba(51,224,255,0.4)'; c.fill(); }
      ln(c, 70, -180, 70, -240, 3, '#5a6a80'); circ(c, 70, -244, 5); c.fillStyle = o.col; c.fill();
      rr(c, 10, -184, 120, 6, 2); c.fillStyle = o.col; c.fill();
      flag(c, 130, -180, 50, o.col, o.emblem, o.t);
    },
    function (c, o) { // kristalcitadel
      var hov = Math.sin(o.t * 1.5) * 4;
      poly(c, [0, 0, 20, -100, 70, -140, 120, -100, 145, 0], '#1e0c38');
      [[30, 160, 14], [70, 230, 20], [110, 170, 14]].forEach(function (s) { poly(c, [s[0] - s[2], -60, s[0], -s[1], s[0] + s[2], -60], '#3a1a68'); poly(c, [s[0], -s[1], s[0] + s[2], -60, s[0] + 2, -60], '#5a2a98'); });
      circ(c, 70, -170 + hov, 14); c.fillStyle = '#e05cff'; c.shadowColor = '#e05cff'; c.shadowBlur = 24; c.fill(); c.shadowBlur = 0;
      c.strokeStyle = 'rgba(224,92,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.ellipse(70, -170 + hov, 30, 8, o.t, 0, PI * 2); c.stroke();
      rr(c, 40, -50, 60, 50, 20); c.fillStyle = '#0a0418'; c.fill();
      rr(c, 0, -64, 145, 5, 2); c.fillStyle = o.col; c.fill();
      flag(c, 140, -100, 50, o.col, o.emblem, o.t);
    },
  ];
  AC.drawBase = function (c, base, age, col, emblem, t) {
    c.save();
    var x0 = base.side ? W : 0;
    c.translate(x0, G);
    if (base.side) c.scale(-1, 1);
    c.translate(-8, 0);
    if (base.hitT > 0) { c.translate((Math.random() - 0.5) * 3, 0); }
    BASES[age](c, { col: col, emblem: emblem, t: t });
    // schadestaat
    var f = base.hp / base.maxHp;
    if (f < 0.6) {
      c.strokeStyle = 'rgba(20,10,5,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(40, -120); c.lineTo(55, -90); c.lineTo(45, -70); c.lineTo(62, -40); c.stroke();
      if (f < 0.35) { c.beginPath(); c.moveTo(100, -130); c.lineTo(90, -100); c.lineTo(104, -80); c.stroke(); }
    }
    if (base.hitT > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,80,40,0.12)'; c.fillRect(-10, -230, 170, 230); }
    c.restore();
  };

  /* ------------------------------ TOWERS ------------------------------ */
  var TMAT = [
    { body: '#6a4a2a', trim: '#8a6a3a', head: '#5a3a1a', style: 'palisade' },
    { body: '#8a6a4a', trim: '#a8804a', head: '#6a4a2a', style: 'stone' },
    { body: '#d9a860', trim: '#ffd34d', head: '#b8884a', style: 'obelisk' },
    { body: '#e0d8c8', trim: '#b02a2a', head: '#9a8a70', style: 'column' },
    { body: '#8a4a3a', trim: '#5a5a5a', head: '#3a3a3a', style: 'brick' },
    { body: '#5a5e60', trim: '#7a8a5a', head: '#2a2e30', style: 'bunker' },
    { body: '#2a3448', trim: '#33e0ff', head: '#1a2233', style: 'pylon' },
    { body: '#2a1448', trim: '#e05cff', head: '#1e0c38', style: 'crystal' },
  ];
  AC.drawTower = function (c, tw, age, col, t, aimX) {
    var m = TMAT[age], dir = tw.side ? -1 : 1;
    c.save(); c.translate(tw.x, G);
    if (tw.hitT > 0) c.translate((Math.random() - 0.5) * 2, 0);
    var h = 78;
    // body
    switch (m.style) {
      case 'palisade': for (var i = 0; i < 3; i++) { rr(c, -15 + i * 10, -h, 9, h, 2); c.fillStyle = i % 2 ? m.trim : m.body; c.fill(); poly(c, [-15 + i * 10, -h, -10.5 + i * 10, -h - 8, -6 + i * 10, -h], m.body); } break;
      case 'stone': for (var r = 0; r < 6; r++) { rr(c, -15 + (r % 2) * 2, -13 * (r + 1), 28, 12, 4); c.fillStyle = r % 2 ? m.body : m.trim; c.fill(); } break;
      case 'obelisk': poly(c, [-14, 0, -9, -h, 9, -h, 14, 0], m.body); poly(c, [0, -h, 9, -h, 14, 0, 4, 0], shade(m.body, -0.12)); rr(c, -11, -h - 3, 22, 4, 1); c.fillStyle = m.trim; c.fill(); break;
      case 'column': rr(c, -10, -h, 20, h, 2); c.fillStyle = m.body; c.fill(); for (var f = -6; f <= 6; f += 4) ln(c, f, -h + 4, f, -4, 1, '#c8c0b0'); rr(c, -14, -h - 4, 28, 6, 2); c.fill(); rr(c, -14, -6, 28, 6, 2); c.fill(); break;
      case 'brick': rr(c, -15, -h, 30, h, 2); c.fillStyle = m.body; c.fill(); for (var b = 0; b < 8; b++) { c.fillStyle = b % 2 ? '#7a3e30' : '#9a5444'; c.fillRect(-14, -h + b * 10 + 2, 28, 7); } break;
      case 'bunker': poly(c, [-17, 0, -12, -h, 12, -h, 17, 0], m.body); rr(c, -10, -h + 20, 20, 5, 1); c.fillStyle = '#1a1c1e'; c.fill(); break;
      case 'pylon': poly(c, [-15, 0, -6, -h, 6, -h, 15, 0], m.body); ln(c, -10, -10, 4, -h + 6, 1.2, m.trim); ln(c, 10, -10, -4, -h + 6, 1.2, m.trim); break;
      case 'crystal': poly(c, [-14, 0, -4, -h, 4, -h - 6, 14, 0], m.body); poly(c, [0, -h - 3, 4, -h - 6, 14, 0, 3, 0], shade(m.body, 0.2)); c.strokeStyle = m.trim; c.lineWidth = 1; c.stroke(); break;
    }
    rr(c, -15, -22, 30, 5, 1); c.fillStyle = col; c.fill();
    // kop, gericht op doel
    c.translate(0, -h - 12);
    var ang = 0;
    if (aimX != null) { ang = Math.atan2(h - 18, Math.max(10, (aimX - tw.x) * dir)); ang = Math.max(-0.3, Math.min(1.1, ang)); }
    c.scale(dir, 1);
    c.rotate(ang);
    var recoil = tw.fireT > 0 ? tw.fireT * 20 : 0;
    c.fillStyle = m.head;
    if (tw.type === 0) { // rapid
      rr(c, -10, -8, 18, 16, 4); c.fill();
      for (var k = -1; k <= 1; k++) { rr(c, 6 - recoil * 0.5, k * 4 - 1.2, 16, 2.4, 1); c.fillStyle = age >= 6 ? m.trim : '#2a2a2a'; c.fill(); }
      if (age <= 1) { ln(c, -4, -8, 12, -2, 2, '#a88050'); ln(c, -4, 8, 12, 2, 2, '#a88050'); }
    } else if (tw.type === 1) { // sniper
      rr(c, -10, -6, 16, 12, 3); c.fill();
      rr(c, 4 - recoil, -2, 30, 4, 1.5); c.fillStyle = age >= 6 ? m.trim : '#1a1a1a'; c.fill();
      rr(c, -2, -11, 12, 5, 2); c.fillStyle = '#111'; c.fill(); circ(c, 9, -8.5, 1.6); c.fillStyle = '#f33'; c.fill();
    } else { // blast
      circ(c, 0, 0, 11); c.fill();
      rr(c, 2 - recoil, -6, 16, 12, 4); c.fillStyle = age >= 6 ? shade(m.trim, -0.3) : '#2a2a2a'; c.fill();
      if (age <= 1) { c.fillStyle = '#888'; circ(c, 0, -10, 6); c.fill(); }
    }
    c.restore();
    // hp-balk
    if (tw.hp < tw.maxHp) {
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(tw.x - 18, G - 108, 36, 5);
      c.fillStyle = col; c.fillRect(tw.x - 17, G - 107, 34 * Math.max(0, tw.hp / tw.maxHp), 3);
    }
  };
})();
