/* =========================================================================
 * render.js — tekent de match: gesplitste achtergrond, bases, towers, units,
 * projectielen, effecten, particles en zwevende teksten. Leest sim.events.
 * ========================================================================= */
var AC = window.AC;
(function () {
  var A = AC.art, rr = A.rr, circ = A.circ, ln = A.ln, poly = A.poly, shade = A.shade, PI = Math.PI;
  var W = AC.CONST.W, H = AC.CONST.H, G = AC.CONST.GROUND;

  AC.UNIT_SCALE = 1.4;
  function Renderer(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.parts = []; this.texts = []; this.beams = []; this.flashes = []; this.banners = [];
    this.shake = 0; this.bgKey = ''; this.comp = document.createElement('canvas'); this.comp.width = W; this.comp.height = H;
    this.ambient = []; this.t = 0; this.audio = null;
  }
  AC.Renderer = Renderer;
  var P = Renderer.prototype;

  P._composite = function (a0, a1) {
    var key = a0 + '_' + a1; if (key === this.bgKey) return;
    this.bgKey = key;
    var c = this.comp.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.drawImage(AC.getBackground(a0), 0, 0);
    var tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    var t = tmp.getContext('2d');
    t.drawImage(AC.getBackground(a1), 0, 0);
    t.globalCompositeOperation = 'destination-in';
    var g = t.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    t.fillStyle = g; t.fillRect(0, 0, W, H);
    c.drawImage(tmp, 0, 0);
  };

  /* ---------------------------- particles ---------------------------- */
  P.puff = function (x, y, n, col, spd, life, size, grav) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * PI * 2, s = spd * (0.3 + Math.random() * 0.7);
      this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8), col: col, grav: grav == null ? 200 : grav, kind: 'p' });
    }
  };
  P.explosion = function (x, y, r, age) {
    var hot = age >= 6 ? ['#33e0ff', '#ffffff', '#e05cff'] : ['#ffd34d', '#ff8a2a', '#ff4a1a'];
    if (age === 7) hot = ['#e05cff', '#ffffff', '#55ffee'];
    this.flashes.push({ x: x, y: y, r: r * 1.4, life: 0.25, max: 0.25, col: hot[0] });
    this.puff(x, y, Math.min(40, 8 + r / 3), hot[1], r * 4, 0.45, 4, 50);
    this.puff(x, y, Math.min(30, 6 + r / 4), hot[2], r * 3, 0.6, 5, 50);
    for (var i = 0; i < Math.min(12, r / 5); i++) this.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * r * 4, vy: -Math.random() * r * 3, life: 1.2, max: 1.2, size: 10 + Math.random() * 14, col: 'rgba(70,60,55,0.5)', grav: -30, kind: 'smoke' });
    if (r > 40) this.shake = Math.min(14, this.shake + r / 10);
  };
  P.text = function (x, y, s, col, size, life) { this.texts.push({ x: x, y: y, s: s, col: col, size: size || 16, life: life || 1.1, max: life || 1.1 }); if (this.texts.length > 60) this.texts.shift(); };
  P.banner = function (s, sub, col, side) { this.banners.push({ s: s, sub: sub, col: col, life: 2.6, max: 2.6, side: side }); };

  /* ---------------------------- events ---------------------------- */
  P.consume = function (sim, view) {
    var ev = sim.events, au = this.audio, self = this;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      switch (e.e) {
        case 'spawn': this.puff(e.x, G - 4, 6, 'rgba(200,180,140,0.7)', 60, 0.5, 4, 0); if (au) au.play('spawn', e.age); break;
        case 'attack': if (au) au.attack(e); break;
        case 'tshot': if (au) au.play('tshot' + e.type, e.age); break;
        case 'beam': this.beams.push({ x: e.x, y: e.y, pts: e.pts, col: e.col, life: 0.14, max: 0.14, pierce: e.pierce, dir: e.side ? -1 : 1 }); break;
        case 'hit': {
          var big = e.splash || e.style === 'shell' || e.style === 'cannonball' || e.style === 'rocket';
          if (e.style === 'singularity') { this.explosion(e.x, e.y, 130, 7); if (au) au.play('boom', 7, 1); break; }
          if (big) { this.explosion(e.x, e.y, Math.max(22, e.splash || 25), e.age); if (au) au.play('boom', e.age, (e.splash || 25) / 60); }
          else { this.puff(e.x, e.y, 4, e.age >= 6 ? '#bff' : '#fff2c0', 80, 0.25, 2.5, 100); if (au) au.play('hit', e.age); }
          break;
        }
        case 'dmg': if (e.crit) this.text(e.x, e.y, 'KRIT ' + Math.round(e.v), '#ffd34d', 18, 0.9); else if (e.kind === 'base' && Math.random() < 0.3) this.text(e.x + (Math.random() - 0.5) * 60, e.y, '-' + Math.round(e.v), '#ff8a6a', 13, 0.8); break;
        case 'death': {
          this.puff(e.x, e.y, e.w > 20 ? 20 : 10, 'rgba(120,100,80,0.8)', 120, 0.7, 4, 260);
          this.puff(e.x, e.y, 6, view.colors[e.side], 90, 0.5, 3, 200);
          var kcol = view.colors[1 - e.side];
          this.text(e.x, e.y - 30, '+' + e.bounty, kcol, 14, 1.0);
          if (au) au.play('death', e.age);
          break;
        }
        case 'tdeath': this.explosion(e.x, G - 50, 60, 4); this.text(e.x, G - 120, '+' + e.bounty, view.colors[1 - e.side], 16); if (au) au.play('boom', 4, 1.3); break;
        case 'bdeath': for (var k = 0; k < 8; k++) this.explosion(e.x + (Math.random() - 0.5) * 120, G - Math.random() * 180, 80, 4); this.shake = 30; if (au) au.play('boom', 4, 2); break;
        case 'evolve': {
          var ag = AC.AGES[e.age];
          var cx = e.side ? W * 0.75 : W * 0.25;
          this.flashes.push({ x: cx, y: H / 2, r: 900, life: 0.8, max: 0.8, col: ag.colors.accent });
          this.banner(ag.name, 'nieuw tijdperk bereikt', ag.colors.accent, e.side);
          for (var j = 0; j < 40; j++) this.parts.push({ x: (e.side ? W - 70 : 70) + (Math.random() - 0.5) * 120, y: G - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 140, life: 1.6, max: 1.6, size: 3, col: ag.colors.accent, grav: 0, kind: 'spark' });
          if (au) au.play('evolve', e.age);
          break;
        }
        case 'power': {
          var pa = AC.AGES[e.age];
          this.banner(pa.power.name, (e.side === view.localSide ? 'jouw' : 'vijandelijke') + ' tijdperk-power', pa.colors.accent, e.side);
          if (au) au.play('power', e.age);
          break;
        }
        case 'build': this.puff(e.x, G - 40, 14, '#fff6c0', 90, 0.6, 3, 50); if (au) au.play('build', 0); break;
        case 'sell': this.puff(e.x, G - 40, 14, 'rgba(160,160,160,0.8)', 90, 0.6, 4, 50); break;
        case 'upgrade': if (au && e.side === view.localSide) au.play('upgrade', 0); break;
        case 'charge': this.puff(e.x, G - 10, 10, 'rgba(220,200,150,0.8)', 140, 0.5, 4, 100); if (au) au.play('charge', 0); break;
        case 'blink': this.flashes.push({ x: e.x, y: G - 30, r: 40, life: 0.3, max: 0.3, col: '#e05cff' }); this.flashes.push({ x: e.x2, y: G - 30, r: 50, life: 0.35, max: 0.35, col: '#e05cff' }); if (au) au.play('blink', 7); break;
        case 'implode': this.flashes.push({ x: e.x, y: G - 50, r: 160, life: 0.5, max: 0.5, col: '#ffd35c' }); this.explosion(e.x, G - 40, 100, 7); break;
        case 'end': break;
      }
    }
    ev.length = 0;
  };

  /* ---------------------------- ambient ---------------------------- */
  P._ambient = function (dt, ages) {
    var am = this.ambient;
    for (var s = 0; s < 2; s++) {
      var age = ages[s], x0 = s ? W / 2 : 0;
      var rate = [3, 2, 6, 1.5, 4, 4, 8, 3][age];
      if (Math.random() < rate * dt) {
        var p = { x: x0 + Math.random() * W / 2, y: Math.random() * G, age: age, life: 6, max: 6, s: s, ph: Math.random() * 6 };
        if (age === 2) { p.x = s ? W : 0; p.y = G - Math.random() * 200; }
        if (age === 6) { p.y = -10; }
        am.push(p);
      }
    }
    for (var i = am.length - 1; i >= 0; i--) {
      var a = am[i]; a.life -= dt;
      switch (a.age) {
        case 0: a.x += Math.sin(this.t * 2 + a.ph) * 12 * dt; a.y += Math.cos(this.t * 1.7 + a.ph) * 10 * dt; break;
        case 1: a.x += 14 * dt; a.y += Math.sin(this.t + a.ph) * 4 * dt; break;
        case 2: a.x += (a.s ? -1 : 1) * 260 * dt; a.y += Math.sin(this.t * 3 + a.ph) * 20 * dt; break;
        case 3: a.x += 20 * dt; a.y += 22 * dt; break;
        case 4: a.y -= 14 * dt; a.x += 6 * dt; break;
        case 5: a.y -= 24 * dt; a.x += Math.sin(this.t + a.ph) * 10 * dt; break;
        case 6: a.y += 600 * dt; a.x -= 60 * dt; if (a.y > G) a.life = 0; break;
        case 7: a.y -= 10 * dt; break;
      }
      var half = a.s ? a.x < W / 2 - 40 || a.x > W : a.x > W / 2 + 40 || a.x < 0;
      if (a.life <= 0 || half) am.splice(i, 1);
    }
  };
  P._drawAmbient = function (c) {
    for (var i = 0; i < this.ambient.length; i++) {
      var a = this.ambient[i], f = Math.min(1, a.life, (a.max - a.life) * 2);
      switch (a.age) {
        case 0: c.fillStyle = 'rgba(220,255,120,' + (0.6 * f * (0.5 + 0.5 * Math.sin(this.t * 6 + a.ph))) + ')'; circ(c, a.x, a.y, 2); c.fill(); break;
        case 1: c.fillStyle = 'rgba(255,220,160,' + 0.25 * f + ')'; circ(c, a.x, a.y, 1.5); c.fill(); break;
        case 2: c.strokeStyle = 'rgba(240,210,150,' + 0.35 * f + ')'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x - (a.s ? -30 : 30), a.y); c.stroke(); break;
        case 3: c.fillStyle = 'rgba(255,190,210,' + 0.6 * f + ')'; c.beginPath(); c.ellipse(a.x, a.y, 3, 1.6, this.t + a.ph, 0, PI * 2); c.fill(); break;
        case 4: c.fillStyle = 'rgba(80,80,80,' + 0.35 * f + ')'; circ(c, a.x, a.y, 2); c.fill(); break;
        case 5: c.fillStyle = 'rgba(255,140,60,' + 0.7 * f + ')'; circ(c, a.x, a.y, 1.4); c.fill(); break;
        case 6: c.strokeStyle = 'rgba(140,200,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + 4, a.y - 14); c.stroke(); break;
        case 7: c.fillStyle = 'rgba(224,92,255,' + 0.5 * f * (0.5 + 0.5 * Math.sin(this.t * 4 + a.ph)) + ')'; circ(c, a.x, a.y, 2.5); c.fill(); break;
      }
    }
  };

  /* ---------------------------- projectielen ---------------------------- */
  function drawProj(c, p, alpha, t) {
    var x = p.lx + (p.x - p.lx) * alpha, y = p.ly + (p.y - p.ly) * alpha;
    var ang = Math.atan2(p.y - p.ly, p.x - p.lx);
    c.save(); c.translate(x, y);
    switch (p.style) {
      case 'rock': case 'boulder': { var r = p.style === 'boulder' ? 12 : 5; c.rotate(t * 8); poly(c, [-r, -r * 0.4, -r * 0.3, -r, r * 0.8, -r * 0.6, r, r * 0.4, 0, r, -r * 0.8, r * 0.6], '#8a8580'); break; }
      case 'bone': c.rotate(ang); ln(c, -8, 0, 8, 0, 2.4, '#efe6cf'); circ(c, 8, 0, 2); c.fillStyle = '#efe6cf'; c.fill(); break;
      case 'arrow': c.rotate(ang); ln(c, -10, 0, 8, 0, 1.4, '#c8b080'); poly(c, [8, -2, 12, 0, 8, 2], '#ccc'); poly(c, [-10, -2, -7, 0, -10, 2], '#e8e0d0'); break;
      case 'firearrow': c.rotate(ang); ln(c, -10, 0, 8, 0, 1.4, '#c8b080'); circ(c, 9, 0, 3.4 + Math.random()); c.fillStyle = 'rgba(255,140,40,0.9)'; c.fill(); circ(c, 9, 0, 1.6); c.fillStyle = '#ffe06a'; c.fill(); break;
      case 'bolt': c.rotate(ang); ln(c, -16, 0, 12, 0, 2.6, '#7a5530'); poly(c, [12, -3.5, 19, 0, 12, 3.5], '#aaa'); break;
      case 'bullet': c.rotate(ang); ln(c, -14, 0, 3, 0, 1.6, 'rgba(255,230,150,0.9)'); break;
      case 'cannonball': circ(c, 0, 0, 5); c.fillStyle = '#222'; c.fill(); break;
      case 'shell': case 'pshell': c.rotate(ang); rr(c, -6, -2.6, 12, 5.2, 2.6); c.fillStyle = '#4a4a3a'; c.fill(); c.fillStyle = 'rgba(255,180,80,0.6)'; circ(c, -8, 0, 3); c.fill(); break;
      case 'rocket': c.rotate(ang); rr(c, -8, -2.5, 14, 5, 2); c.fillStyle = '#5a6a4a'; c.fill(); poly(c, [6, -2.5, 10, 0, 6, 2.5], '#c33'); circ(c, -10, 0, 3 + Math.random() * 2); c.fillStyle = 'rgba(255,170,60,0.9)'; c.fill(); break;
      case 'plasma': c.shadowColor = '#33e0ff'; c.shadowBlur = 12; circ(c, 0, 0, 5); c.fillStyle = '#bff8ff'; c.fill(); c.shadowBlur = 0; break;
      case 'void': c.rotate(t * 10); c.shadowColor = '#ff5ce0'; c.shadowBlur = 14; poly(c, [0, -7, 5, 0, 0, 7, -5, 0], '#ff5ce0'); c.shadowBlur = 0; circ(c, 0, 0, 2); c.fillStyle = '#fff'; c.fill(); break;
      case 'bomb': c.rotate(PI / 2.4); rr(c, -7, -3.5, 14, 7, 3.5); c.fillStyle = '#3a3a3a'; c.fill(); poly(c, [-7, -4, -11, -6, -11, 6, -7, 4], '#555'); break;
      case 'trapid': c.rotate(ang); ln(c, -6, 0, 4, 0, 2, '#ffe08a'); break;
      case 'tsniper': c.rotate(ang); ln(c, -22, 0, 4, 0, 2.2, 'rgba(255,255,255,0.9)'); break;
      case 'tblast': circ(c, 0, 0, 6); c.fillStyle = '#3a3030'; c.fill(); circ(c, -1.5, -1.5, 2); c.fillStyle = '#ff8a2a'; c.fill(); break;
      default: circ(c, 0, 0, 3); c.fillStyle = '#fff'; c.fill();
    }
    c.restore();
  }

  /* ---------------------------- units ---------------------------- */
  P._drawUnit = function (c, u, alpha, view) {
    var x = u.px + (u.x - u.px) * alpha;
    var def = AC.UNITS[u.age][u.slot], dir = u.side ? -1 : 1;
    var yo = ((u.id * 53) % 7 - 3) * 2.2;
    var team = view.colors[u.side];
    var hgt = (AC.LOOK_H[def.look] || 50) * AC.UNIT_SCALE;
    c.save(); c.translate(x, G + yo);
    // schaduw
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, u.w + 3, 4, 0, 0, PI * 2); c.fill();
    var glow = view.glow[u.side];
    if (glow) { var gg = c.createRadialGradient(0, -hgt * 0.4, 2, 0, -hgt * 0.4, hgt * 0.7); gg.addColorStop(0, glow + '55'); gg.addColorStop(1, glow + '00'); c.fillStyle = gg; c.fillRect(-hgt, -hgt * 1.2, hgt * 2, hgt * 1.3); }
    var US = AC.UNIT_SCALE;
    c.scale(dir * US, US);
    var atkDur = Math.min(0.35, u.st.cd * 0.6);
    var a = u.atkAnim > 0 ? 1 - u.atkAnim / atkDur : -1;
    var o = { pal: def.pal, gear: def.gear, ph: u.walk * 0.16, a: a, t: this.t, team: team, moving: u.state === 'walk', st: u.st, seed: u.id };
    var fn = AC.LOOKS[def.look];
    if (fn) fn(c, o);
    if (u.hitT > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,240,220,' + (u.hitT * 1.2) + ')'; c.beginPath(); c.ellipse(0, -hgt / AC.UNIT_SCALE * 0.45, u.w * 0.7, hgt / AC.UNIT_SCALE * 0.45, 0, 0, PI * 2); c.fill(); c.globalCompositeOperation = 'source-over'; }
    c.restore();
    // statussen
    var top = G + yo - hgt - 8;
    if (u.stun > 0) for (var s = 0; s < 3; s++) { var an = this.t * 6 + s * 2.1; c.fillStyle = '#ffe06a'; circ(c, x + Math.cos(an) * 9, top + 2 + Math.sin(an) * 3, 2); c.fill(); }
    if (u.slowF > 0) { c.strokeStyle = 'rgba(120,200,255,0.7)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, G + yo - 2, u.w + 5, 5, 0, 0, PI * 2); c.stroke(); }
    if (u.dotT > 0 && Math.random() < 0.3) this.parts.push({ x: x + (Math.random() - 0.5) * u.w * 2, y: G + yo - Math.random() * hgt, vx: 0, vy: -30, life: 0.5, max: 0.5, size: 2.5, col: u.dotType === 'poison' ? '#8f4' : u.dotType === 'sand' ? '#e8c27a' : '#f93', grav: 0, kind: 'p' });
    if (view.buff[u.side] > 0) { c.strokeStyle = 'rgba(255,210,80,' + (0.4 + 0.2 * Math.sin(this.t * 6)) + ')'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, G + yo - hgt * 0.45, u.w + 6, hgt * 0.55, 0, 0, PI * 2); c.stroke(); }
    // healthbar
    var bw = Math.max(22, Math.min(54, u.w * 2.2)), f = Math.max(0, u.hp / u.maxHp);
    c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(x - bw / 2 - 1, top - 1, bw + 2, 5);
    c.fillStyle = f > 0.5 ? team : (f > 0.25 ? '#ffb02a' : '#ff3a2a'); c.fillRect(x - bw / 2, top, bw * f, 3);
    if (u.armored) { c.fillStyle = '#ddd'; c.fillRect(x - bw / 2 - 4, top - 1, 3, 5); }
  };

  /* ---------------------------- power-visuals ---------------------------- */
  P._drawEffects = function (c, sim) {
    for (var i = 0; i < sim.effects.length; i++) {
      var fx = sim.effects[i];
      if (fx.id === 'orbital') {
        var g = c.createLinearGradient(fx.bx - 40, 0, fx.bx + 40, 0); g.addColorStop(0, 'rgba(51,224,255,0)'); g.addColorStop(0.5, 'rgba(220,255,255,0.95)'); g.addColorStop(1, 'rgba(51,224,255,0)');
        c.fillStyle = g; c.fillRect(fx.bx - 40, 0, 80, G);
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(fx.bx - 4, 0, 8, G);
        if (Math.random() < 0.7) this.puff(fx.bx, G - 5, 3, '#bff', 160, 0.4, 3, 300);
      } else if (fx.id === 'singularity') {
        var r = 40 + Math.sin(this.t * 10) * 4;
        var rg = c.createRadialGradient(fx.cx, G - 70, 4, fx.cx, G - 70, r * 3); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.35, 'rgba(40,0,60,0.9)'); rg.addColorStop(0.6, 'rgba(224,92,255,0.4)'); rg.addColorStop(1, 'rgba(224,92,255,0)');
        c.fillStyle = rg; circ(c, fx.cx, G - 70, r * 3); c.fill();
        c.strokeStyle = 'rgba(255,180,255,0.6)'; c.lineWidth = 2;
        for (var k = 0; k < 3; k++) { c.beginPath(); c.ellipse(fx.cx, G - 70, r * (1.4 + k * 0.5), r * 0.35 * (1 + k * 0.3), this.t * (2 + k), 0, PI * 2); c.stroke(); }
      } else if (fx.id === 'sandstorm') {
        c.fillStyle = 'rgba(230,190,120,' + (0.18 * Math.min(1, fx.dur - fx.t)) + ')';
        var x0 = fx.side ? 0 : W / 2; c.fillRect(x0, 0, W / 2, G + 40);
        for (var s = 0; s < 6; s++) { var sx = x0 + ((this.t * 400 * (fx.side ? -1 : 1) + s * 150) % (W / 2) + W / 2) % (W / 2); c.strokeStyle = 'rgba(240,210,150,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, 200 + s * 60); c.lineTo(sx + 80, 210 + s * 60); c.stroke(); }
      } else if (fx.id === 'airstrike') {
        var jx = fx.side ? W + 100 - fx.t / fx.dur * (W + 300) : -100 + fx.t / fx.dur * (W + 300);
        c.save(); c.translate(jx, 150); c.scale(fx.side ? -1 : 1, 1);
        poly(c, [-40, 0, 30, -4, 44, 0, 30, 5, -40, 6], '#5a6470'); poly(c, [-10, 0, -26, 24, -14, 24, 6, 2], '#4a525c'); poly(c, [-36, 0, -46, -14, -38, -14, -28, 0], '#4a525c');
        circ(c, -44, 3, 5 + Math.random() * 3); c.fillStyle = 'rgba(255,170,60,0.9)'; c.fill();
        c.restore();
      } else if (fx.id === 'testudo') {
        // gloed staat op units zelf
      }
    }
  };

  /* ---------------------------- hoofd-render ---------------------------- */
  P.render = function (sim, alpha, view, dt) {
    var c = this.c; this.t += dt;
    var ages = [sim.players[0].age, sim.players[1].age];
    this._composite(ages[0], ages[1]);
    this.consume(sim, view);
    this._ambient(dt, ages);

    c.save();
    if (this.shake > 0) { c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - dt * 40); }
    c.drawImage(this.comp, 0, 0);
    this._drawAmbient(c);
    // middenlijn
    var mg = c.createLinearGradient(0, 0, 0, G); mg.addColorStop(0, 'rgba(255,255,255,0)'); mg.addColorStop(1, 'rgba(255,255,255,0.22)');
    c.fillStyle = mg; c.fillRect(W / 2 - 1, 120, 2, G - 120);
    c.fillStyle = 'rgba(255,255,255,0.25)'; for (var d = 0; d < 8; d++) c.fillRect(W / 2 - 1, G + 12 + d * 18, 2, 9);

    // bases
    AC.drawBase(c, sim.bases[0], ages[0], view.colors[0], view.emblems[0], this.t);
    AC.drawBase(c, sim.bases[1], ages[1], view.colors[1], view.emblems[1], this.t);
    // tower-plekken
    for (var s = 0; s < 2; s++) for (var sp = 0; sp < 3; sp++) {
      var tx = s ? W - AC.CONST.TOWER_SPOTS[sp] : AC.CONST.TOWER_SPOTS[sp];
      if (!sim.towerAt(s, sp)) {
        rr(c, tx - 16, G - 6, 32, 7, 3); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fill();
        if (view.towerMode && s === view.localSide) {
          var hov = view.hoverSpot === sp;
          c.strokeStyle = hov ? '#fff' : 'rgba(255,255,255,0.6)'; c.setLineDash([5, 4]); c.lineWidth = 2; rr(c, tx - 18, G - 92, 36, 90, 5); c.stroke(); c.setLineDash([]);
          c.fillStyle = hov ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'; c.fill();
          c.fillStyle = '#fff'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('+', tx, G - 40);
        }
      }
    }
    for (var ti = 0; ti < sim.towers.length; ti++) {
      var tw = sim.towers[ti];
      AC.drawTower(c, tw, ages[tw.side], view.colors[tw.side], this.t, tw.aim || null);
      if (view.towerMode && view.sellMode && tw.side === view.localSide && view.hoverSpot === tw.spot) { c.strokeStyle = '#ff5a4a'; c.lineWidth = 2; rr(c, tw.x - 20, G - 100, 40, 100, 5); c.stroke(); }
    }
    // units (gesorteerd op diepte)
    var us = sim.units.slice().sort(function (a, b) { var ya = (a.id * 53) % 7, yb = (b.id * 53) % 7; return ya - yb || (a.flying - b.flying); });
    for (var i = 0; i < us.length; i++) this._drawUnit(c, us[i], alpha, view);
    // projectielen
    for (var j = 0; j < sim.projs.length; j++) drawProj(c, sim.projs[j], alpha, this.t);
    this._drawEffects(c, sim);
    // beams
    for (var b = this.beams.length - 1; b >= 0; b--) {
      var bm = this.beams[b], f = bm.life / bm.max;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = bm.col; c.lineCap = 'round';
      var px = bm.x, py = bm.y;
      for (var q = 0; q < bm.pts.length; q++) {
        var qx = bm.pts[q], qy = G - 38;
        c.globalAlpha = f; c.lineWidth = 6 * f; c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke();
        c.lineWidth = 2; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke(); c.strokeStyle = bm.col;
        px = qx; py = qy;
      }
      if (bm.pierce) { c.globalAlpha = f * 0.6; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + bm.dir * bm.pierce, py); c.stroke(); }
      c.restore();
      bm.life -= dt; if (bm.life <= 0) this.beams.splice(b, 1);
    }
    // particles
    for (var pi = this.parts.length - 1; pi >= 0; pi--) {
      var p = this.parts[pi];
      p.life -= dt; if (p.life <= 0) { this.parts.splice(pi, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind !== 'smoke' && p.y > G + 6 && p.grav > 0) { p.y = G + 6; p.vy *= -0.3; p.vx *= 0.6; }
      var lf = p.life / p.max;
      c.globalAlpha = Math.min(1, lf * 1.5);
      c.fillStyle = p.col;
      if (p.kind === 'smoke') { circ(c, p.x, p.y, p.size * (1.6 - lf)); c.fill(); }
      else if (p.kind === 'spark') { c.fillRect(p.x - 1, p.y - 4, 2, 8); }
      else { c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    }
    c.globalAlpha = 1;
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
    // flitsen
    for (var fi = this.flashes.length - 1; fi >= 0; fi--) {
      var fl = this.flashes[fi], ff = fl.life / fl.max;
      var fg = c.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.r);
      fg.addColorStop(0, hexA(fl.col, 0.55 * ff)); fg.addColorStop(1, hexA(fl.col, 0));
      c.fillStyle = fg; c.fillRect(fl.x - fl.r, fl.y - fl.r, fl.r * 2, fl.r * 2);
      fl.life -= dt; if (fl.life <= 0) this.flashes.splice(fi, 1);
    }
    // teksten
    c.textAlign = 'center';
    for (var k = this.texts.length - 1; k >= 0; k--) {
      var tt = this.texts[k]; tt.life -= dt; if (tt.life <= 0) { this.texts.splice(k, 1); continue; }
      var tf = tt.life / tt.max; tt.y -= 30 * dt;
      c.globalAlpha = Math.min(1, tf * 2); c.font = '800 ' + tt.size + 'px "Exo 2", sans-serif';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.strokeText(tt.s, tt.x, tt.y); c.fillStyle = tt.col; c.fillText(tt.s, tt.x, tt.y);
    }
    c.globalAlpha = 1;
    // banners
    for (var bi = this.banners.length - 1; bi >= 0; bi--) {
      var bn = this.banners[bi]; bn.life -= dt; if (bn.life <= 0) { this.banners.splice(bi, 1); continue; }
      var bf = bn.life / bn.max, ba = Math.min(1, (1 - bf) * 6, bf * 3);
      var bx = bn.side ? W * 0.75 : W * 0.25, by = 210;
      c.globalAlpha = ba;
      c.fillStyle = 'rgba(0,0,0,0.5)'; rr(c, bx - 230, by - 42, 460, 70, 12); c.fill();
      c.font = '900 34px "Russo One", sans-serif'; c.fillStyle = bn.col; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.8)';
      c.strokeText(bn.s.toUpperCase(), bx, by); c.fillText(bn.s.toUpperCase(), bx, by);
      c.font = '600 15px "Exo 2", sans-serif'; c.fillStyle = '#fff'; c.fillText(bn.sub, bx, by + 20);
    }
    c.globalAlpha = 1;
    c.restore();
  };

  function hexA(col, a) {
    if (col[0] === '#') { var n = parseInt(col.length === 4 ? col[1] + col[1] + col[2] + col[2] + col[3] + col[3] : col.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
    return col;
  }
  AC.hexA = hexA;
})();
