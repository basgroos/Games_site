/* =========================================================================
 * art_units.js — procedurele unit-graphics (32 units, 14 lichaamstypen).
 * Iedere tekenfunctie tekent met de voeten op (0,0), kijkend naar rechts.
 * o = { pal, gear, ph (loopfase), a (aanval 0..1 of -1), t, team, hit, st }
 * ========================================================================= */
var AC = window.AC;
(function () {
  var PI = Math.PI;
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, PI * 2); }
  function ln(c, x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function shade(hex, f) {
    if (!hex || hex[0] !== '#') return hex || '#888';
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  AC.art = { rr: rr, circ: circ, ln: ln, poly: poly, shade: shade };

  // aanval-curve: snel uithalen, langzaam terug
  function swing(a) { if (a < 0) return 0; return a < 0.35 ? a / 0.35 : 1 - (a - 0.35) / 0.65; }

  /* ---------------------------- WAPENS ---------------------------- */
  function weapon(c, kind, pal, a, o) {
    var s = swing(a);
    switch (kind) {
      case 'club': c.rotate(-1.4 + s * 2.2); ln(c, 0, 0, 0, -20, 4, pal.wpn); circ(c, 0, -21, 5); c.fillStyle = shade(pal.wpn, -0.2); c.fill(); break;
      case 'rock': c.rotate(-2.2 + s * 2.8); if (a < 0.4) { circ(c, 0, -10, 4.5); c.fillStyle = '#8a8a88'; c.fill(); } break;
      case 'bone': c.rotate(-0.4 - (1 - s) * 0.8 + s * 0.6); ln(c, -6, 4, 14, -8, 2.6, pal.wpn); circ(c, -7, 5, 2.5); c.fillStyle = pal.wpn; c.fill(); break;
      case 'spear': c.rotate(-0.2); c.translate(s * 10, 0); ln(c, -10, 2, 22, -4, 2.2, pal.wpn); poly(c, [22, -7, 30, -5, 22, -2], '#ccc'); break;
      case 'lance': c.rotate(-0.1); c.translate(s * 12, 0); ln(c, -14, 2, 32, -3, 2.6, '#8a6a3a'); poly(c, [32, -7, 42, -3, 32, 1], pal.wpn); break;
      case 'bow': {
        var pull = a < 0 ? 0 : (a < 0.6 ? a / 0.6 : 0);
        c.strokeStyle = pal.wpn; c.lineWidth = 2.2; c.beginPath(); c.arc(2, 0, 11, -1.25, 1.25); c.stroke();
        c.strokeStyle = '#eee'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(2 + Math.cos(-1.25) * 11, Math.sin(-1.25) * 11); c.lineTo(-pull * 7, 0); c.lineTo(2 + Math.cos(1.25) * 11, Math.sin(1.25) * 11); c.stroke();
        if (pull > 0.1) ln(c, -pull * 7, 0, 14, 0, 1.2, '#d8c8a0');
        break;
      }
      case 'khopesh': c.rotate(-1.6 + s * 2.4); ln(c, 0, 0, 0, -8, 2.5, '#5a3a1a'); c.strokeStyle = pal.wpn; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -14); c.arc(5, -16, 5, PI, PI * 1.9); c.stroke(); break;
      case 'glaive': c.rotate(-1.0 + s * 1.6); ln(c, 0, 6, 0, -26, 2.4, '#3a2a1a'); poly(c, [0, -26, 6, -34, 2, -22], pal.wpn); break;
      case 'gladius': c.rotate(-0.3 + s * 0.4); c.translate(s * 9, 0); ln(c, 0, 0, 16, 0, 3, '#ddd'); ln(c, -2, -3, -2, 3, 2, '#c9a030'); break;
      case 'musket': c.rotate(-0.15); c.translate(s * 10, 0); ln(c, -14, 2, 22, -2, 3, pal.wpn); ln(c, 6, -1, 22, -2, 1.6, '#555'); ln(c, 22, -2, 30, -3, 1.2, '#ddd'); break;
      case 'rifle': c.rotate(-0.08 - s * 0.1); ln(c, -12, 2, 26, -1, 3, pal.wpn); ln(c, 6, 0, 30, -1, 1.6, '#444'); rr(c, 4, -5, 8, 3, 1); c.fillStyle = '#222'; c.fill(); if (a >= 0 && a < 0.15) muzzle(c, 31, -1, 6); break;
      case 'smg': c.translate(-s * 2, 0); rr(c, -4, -3, 18, 6, 1); c.fillStyle = '#222'; c.fill(); rr(c, 2, 2, 3, 6, 1); c.fill(); if (a >= 0 && (a * 10 | 0) % 2 === 0) muzzle(c, 16, 0, 5); break;
      case 'sniper': c.translate(-s * 3, 0); ln(c, -14, 2, 32, -1, 3, '#2a2a2a'); rr(c, 2, -7, 12, 4, 2); c.fillStyle = '#111'; c.fill(); if (a >= 0 && a < 0.15) muzzle(c, 33, -1, 8); break;
      case 'rpg': c.translate(-s * 4, 0); rr(c, -16, -4, 30, 7, 3); c.fillStyle = pal.wpn; c.fill(); if (a < 0.2 || a > 0.8) { poly(c, [14, -5, 22, -0.5, 14, 4], '#6a6a6a'); } break;
      case 'qgun': rr(c, -4, -4, 20, 8, 3); c.fillStyle = '#20204a'; c.fill(); circ(c, 16, 0, 3 + (a >= 0 ? swing(a) * 2 : 0)); c.fillStyle = o.pal.glow || '#5ff'; c.fill(); break;
    }
  }
  function muzzle(c, x, y, r) { c.fillStyle = 'rgba(255,220,120,0.95)'; c.beginPath(); c.moveTo(x, y - r * 0.5); c.lineTo(x + r * 1.6, y); c.lineTo(x, y + r * 0.5); c.closePath(); c.fill(); circ(c, x, y, r * 0.5); c.fillStyle = '#fff6c0'; c.fill(); }

  /* ---------------------------- HOOFDDEKSELS ---------------------------- */
  function headgear(c, kind, o, hx, hy, hr) {
    var team = o.team;
    switch (kind) {
      case 'band': rr(c, hx - hr, hy - 3, hr * 2, 3, 1); c.fillStyle = team; c.fill(); break;
      case 'feather': rr(c, hx - hr, hy - 3, hr * 2, 3, 1); c.fillStyle = team; c.fill(); poly(c, [hx - 2, hy - 3, hx - 8, hy - 16, hx - 1, hy - 5], '#e8e0d0'); break;
      case 'skull': c.fillStyle = '#e8e0c8'; c.beginPath(); c.arc(hx, hy - 1, hr + 1, PI, 0); c.fill(); circ(c, hx + 2, hy - 3, 1.3); c.fillStyle = '#222'; c.fill(); poly(c, [hx - hr, hy - 2, hx - hr - 4, hy - 8, hx - hr + 2, hy - 4], '#e8e0c8'); break;
      case 'fur': c.fillStyle = '#7a5a3a'; c.beginPath(); c.arc(hx, hy - 1, hr + 1.5, PI, 0); c.fill(); poly(c, [hx - hr - 1, hy - 1, hx - hr - 4, hy + 8, hx - hr + 3, hy + 3], '#7a5a3a'); break;
      case 'nemes': case 'nemesBlue': {
        var col2 = kind === 'nemes' ? '#3a5ab0' : '#e0b030';
        c.fillStyle = kind === 'nemes' ? '#e0c060' : '#3a6ab0';
        c.beginPath(); c.moveTo(hx - hr - 2, hy + 7); c.lineTo(hx - hr, hy - 3); c.arc(hx, hy - 2, hr + 0.5, PI, 0); c.lineTo(hx + hr - 1, hy + 2); c.lineTo(hx - hr + 3, hy + 2); c.closePath(); c.fill();
        ln(c, hx - hr, hy - 1, hx - hr - 1, hy + 6, 1.4, col2); rr(c, hx - hr, hy - 5, hr * 2, 2, 1); c.fillStyle = team; c.fill(); break;
      }
      case 'jackal': {
        c.fillStyle = '#1a1a1a'; poly(c, [hx - 3, hy - 3, hx - 1, hy - 15, hx + 2, hy - 4], '#1a1a1a'); poly(c, [hx + 1, hy - 3, hx + 4, hy - 14, hx + 5, hy - 2], '#1a1a1a');
        poly(c, [hx + 2, hy - 2, hx + hr + 8, hy + 2, hx + 2, hy + 4], '#1a1a1a');
        circ(c, hx + 3, hy - 1, 1.2); c.fillStyle = '#ffd34d'; c.fill();
        rr(c, hx - hr, hy + 4, hr * 2, 3, 1); c.fillStyle = '#e0b030'; c.fill(); break;
      }
      case 'galea': {
        c.fillStyle = '#c9b070'; c.beginPath(); c.arc(hx, hy - 1, hr + 1, PI, 0); c.fill();
        rr(c, hx - hr - 1, hy - 1, 3, 7, 1); c.fill();
        c.fillStyle = '#c0282a'; c.beginPath(); c.ellipse(hx - 1, hy - hr - 3, 6, 3, 0, PI, 0); c.fill(); rr(c, hx - 7, hy - hr - 4, 13, 3, 1); c.fill(); break;
      }
      case 'helmet': c.fillStyle = '#a89060'; c.beginPath(); c.arc(hx, hy - 1, hr + 1, PI, 0); c.fill(); ln(c, hx, hy - hr - 1, hx, hy - hr - 5, 2, team); break;
      case 'tricorn': poly(c, [hx - hr - 4, hy - 2, hx, hy - hr - 6, hx + hr + 4, hy - 2], '#1a1a2a'); rr(c, hx - hr - 4, hy - 3, hr * 2 + 8, 2.5, 1); c.fillStyle = team; c.fill(); break;
      case 'shako': rr(c, hx - hr + 1, hy - hr - 9, hr * 2 - 2, 10, 1); c.fillStyle = '#1a1a1a'; c.fill(); rr(c, hx - hr, hy - hr, hr * 2 + 3, 2, 1); c.fill(); circ(c, hx, hy - hr - 6, 2); c.fillStyle = team; c.fill(); break;
      case 'kevlar': c.fillStyle = '#4a5238'; c.beginPath(); c.arc(hx, hy - 0.5, hr + 1.5, PI * 1.05, PI * 2.05); c.fill(); rr(c, hx - 1, hy - 2, hr + 1, 2.5, 1); c.fillStyle = '#222'; c.fill(); rr(c, hx - hr - 1, hy - 4, 3, 3, 1); c.fillStyle = team; c.fill(); break;
      case 'beret': c.fillStyle = shade(team, -0.25); c.beginPath(); c.ellipse(hx - 1, hy - hr + 1, hr + 2, 3.5, -0.15, 0, PI * 2); c.fill(); break;
    }
  }

  /* ---------------------------- HUMANOÏDE ---------------------------- */
  function humanoid(c, o, opt) {
    var pal = o.pal, g = o.gear || {}, ph = o.ph, a = o.a;
    var big = g.big ? 1.2 : 1;
    c.save(); c.scale(big, big);
    var walk = o.moving ? Math.sin(ph) : 0;
    var bob = o.moving ? Math.abs(Math.cos(ph)) * 1.5 : 0;
    var ape = opt && opt.ape, cave = opt && opt.cave, modern = opt && opt.modern;
    var hip = ape ? 13 : 17, sh = ape ? 27 : 32;
    var lean = ape ? 6 : 0;
    // benen
    var legCol = pal.bot || pal.fur;
    ln(c, -1, -hip + bob, -1 - walk * 6, -1, ape ? 4.5 : 4, shade(legCol, -0.2));
    ln(c, 1, -hip + bob, 1 + walk * 6, -1, ape ? 4.5 : 4, legCol);
    if (modern) { rr(c, -3 - walk * 6, -3, 7, 3, 1); c.fillStyle = '#222'; c.fill(); rr(c, -1 + walk * 6, -3, 7, 3, 1); c.fill(); }
    // achterarm
    c.save(); c.translate(lean - 2, -sh + 4 + bob);
    ln(c, 0, 0, -3 + walk * 3, ape ? 15 : 11, 3.2, shade(pal.skin, -0.25)); c.restore();
    // romp
    c.save(); c.translate(0, bob);
    if (ape) {
      c.fillStyle = pal.fur; c.beginPath(); c.ellipse(lean * 0.6, -hip - 7, 9, 10, 0.35, 0, PI * 2); c.fill();
      c.fillStyle = pal.skin; c.beginPath(); c.ellipse(lean * 0.6 + 3, -hip - 5, 4.5, 6, 0.3, 0, PI * 2); c.fill();
    } else {
      rr(c, -6, -sh, 12, sh - hip + 3, 4); c.fillStyle = pal.top; c.fill();
      if (cave) { poly(c, [-6, -sh + 2, 6, -hip, -6, -hip + 2], shade(pal.top, -0.2)); }
      if (modern) { rr(c, -6.5, -sh + 3, 13, 11, 3); c.fillStyle = shade(pal.top, -0.25); c.fill(); rr(c, -3, -sh + 6, 4, 4, 1); c.fillStyle = shade(pal.top, 0.15); c.fill(); }
      // teamkleur: riem / sjerp
      rr(c, -6.5, -hip - 1, 13, 3.5, 1); c.fillStyle = o.team; c.fill();
    }
    c.restore();
    // hoofd
    var hx = lean + (ape ? 6 : 1), hy = -sh - 6 + bob + (ape ? 6 : 0), hr = ape ? 6 : 5.5;
    if (g.head === 'jackal') { circ(c, hx, hy, hr); c.fillStyle = '#1a1a1a'; c.fill(); }
    else {
      circ(c, hx, hy, hr); c.fillStyle = ape ? pal.fur : pal.skin; c.fill();
      if (ape) { c.fillStyle = pal.skin; c.beginPath(); c.ellipse(hx + 2.5, hy + 1.5, 3.8, 3.2, 0, 0, PI * 2); c.fill(); circ(c, hx - 4, hy - 1, 2); c.fillStyle = pal.fur; c.fill(); }
      circ(c, hx + 2.5, hy - 1.2, 1); c.fillStyle = '#111'; c.fill();
      if (ape) { rr(c, hx - 3, hy - 4.5, 7, 1.8, 1); c.fillStyle = shade(pal.fur, -0.3); c.fill(); }
    }
    if (g.head) headgear(c, g.head, o, hx, hy, hr);
    if (ape && o.team) { rr(c, hx - 5, hy - 6, 10, 2.5, 1); c.fillStyle = o.team; c.fill(); }
    // schild (achter de wapenarm)
    if (g.shield === 'wood') { rr(c, 4, -sh - 2, 9, 26, 4); c.fillStyle = pal.wpn; c.fill(); c.strokeStyle = shade(pal.wpn, -0.35); c.lineWidth = 1.5; c.stroke(); ln(c, 8.5, -sh, 8.5, -sh + 22, 1.2, shade(pal.wpn, -0.35)); circ(c, 8.5, -sh + 11, 2.5); c.fillStyle = o.team; c.fill(); }
    if (g.shield === 'scutum') { rr(c, 3, -sh - 1, 9, 24, 2); c.fillStyle = '#b02a2a'; c.fill(); c.strokeStyle = '#e0b030'; c.lineWidth = 1.4; c.stroke(); circ(c, 7.5, -sh + 11, 2.6); c.fillStyle = '#e0b030'; c.fill(); rr(c, 3, -sh + 18, 9, 3, 1); c.fillStyle = o.team; c.fill(); }
    // voorarm + wapen
    c.save(); c.translate(lean + 2, -sh + 5 + bob);
    var wk = g.weapon || (opt && opt.weapon) || 'club';
    var ranged = wk === 'bow' || wk === 'rifle' || wk === 'smg' || wk === 'sniper' || wk === 'rpg' || wk === 'qgun' || wk === 'musket';
    if (ranged) {
      var aimY = wk === 'rpg' ? -4 : 0;
      ln(c, 0, 0, 9, 4 + aimY, 3.2, pal.skin);
      c.translate(9, 4 + aimY);
      if (wk === 'rpg') c.translate(-6, -6);
      weapon(c, wk, pal, a, o);
    } else if (g.shield) {
      ln(c, 0, 0, 6, 8, 3.2, pal.skin); c.translate(7, 8); weapon(c, wk, pal, a, o);
    } else {
      var sa = swing(a);
      ln(c, 0, 0, 7 + sa * 3, (ape ? 13 : 9) - sa * 4, 3.4, ape ? pal.fur : pal.skin);
      c.translate(7 + sa * 3, (ape ? 13 : 9) - sa * 4); weapon(c, wk, pal, a, o);
    }
    c.restore();
    c.restore();
  }

  /* ---------------------------- BEESTEN & VOERTUIGEN ---------------------------- */
  function mammoth(c, o) {
    var p = o.pal, w = o.moving ? Math.sin(o.ph * 0.7) : 0, s = swing(o.a);
    c.save(); c.translate(0, o.moving ? Math.abs(Math.cos(o.ph * 0.7)) * 1.5 : 0);
    var legs = [[-18, 1], [-8, -1], [8, 1], [17, -1]];
    legs.forEach(function (l, i) { rr(c, l[0] - 4 + w * 4 * l[1], -22, 9, 22, 3); c.fillStyle = i % 2 ? shade(p.fur, -0.25) : p.fur; c.fill(); });
    c.fillStyle = p.fur; c.beginPath(); c.ellipse(-1, -36, 27, 20, 0, 0, PI * 2); c.fill();
    c.fillStyle = shade(p.fur, -0.2); c.beginPath(); c.ellipse(-4, -50, 18, 8, -0.1, PI, 0); c.fill();
    // kop
    c.save(); c.translate(22, -42); c.rotate(-s * 0.35);
    c.fillStyle = p.fur; c.beginPath(); c.ellipse(4, 2, 12, 13, 0, 0, PI * 2); c.fill();
    c.strokeStyle = p.fur; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(10, 8); c.quadraticCurveTo(18, 22 - s * 8, 12 + s * 8, 32 - s * 10); c.stroke();
    c.strokeStyle = p.tusk; c.lineWidth = 3.6; c.beginPath(); c.moveTo(8, 10); c.quadraticCurveTo(24, 20, 26, 6 - s * 6); c.stroke();
    circ(c, 7, -3, 1.6); c.fillStyle = '#111'; c.fill();
    c.restore();
    // teamdeken
    rr(c, -18, -54, 22, 10, 3); c.fillStyle = o.team; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.stroke();
    c.restore();
  }

  function chariot(c, o) {
    var p = o.pal, ph = o.ph * 1.4, s = swing(o.a);
    // paard
    c.save(); c.translate(14, 0);
    var g = o.moving ? Math.sin(ph) : 0;
    [[-6, 1], [-2, -1], [10, -1], [14, 1]].forEach(function (l, i) { ln(c, l[0], -18, l[0] + g * 7 * l[1], 0, 3, i % 2 ? shade(p.horse, -0.3) : p.horse); });
    c.fillStyle = p.horse; c.beginPath(); c.ellipse(4, -22, 13, 7, 0, 0, PI * 2); c.fill();
    c.save(); c.translate(15, -27); c.rotate(-0.7 - s * 0.3); rr(c, -3, -12, 7, 14, 3); c.fill(); rr(c, -2, -16, 11, 6, 3); c.fill(); c.restore();
    poly(c, [16, -34, 20, -40, 19, -32], o.team);
    ln(c, -8, -24, -14, -18, 2, shade(p.horse, -0.4));
    c.restore();
    // wagen
    ln(c, -4, -18, 10, -22, 2, p.wood);
    rr(c, -22, -30, 20, 14, 3); c.fillStyle = p.wood; c.fill(); rr(c, -22, -30, 20, 3, 1); c.fillStyle = p.gold; c.fill();
    c.save(); c.translate(-12, -10); c.rotate(o.moving ? ph * 0.6 : 0);
    circ(c, 0, 0, 10); c.strokeStyle = shade(p.wood, -0.3); c.lineWidth = 3; c.stroke();
    for (var i = 0; i < 6; i++) { var an = i * PI / 3; ln(c, 0, 0, Math.cos(an) * 9, Math.sin(an) * 9, 1.4, p.gold); }
    c.restore();
    // menner
    c.save(); c.translate(-12, -26);
    rr(c, -4, -16, 9, 16, 3); c.fillStyle = '#f0e6c8'; c.fill();
    circ(c, 1, -21, 4.5); c.fillStyle = '#a8703f'; c.fill(); headgear(c, 'nemes', o, 1, -21, 4.5);
    c.rotate(-0.8 + s * 1.4); ln(c, 2, -10, 2, -30, 2, '#5a3a1a'); poly(c, [0, -30, 2, -36, 4, -30], '#ddd');
    c.restore();
  }

  function ballista(c, o) {
    var p = o.pal, s = swing(o.a), r = o.moving ? o.ph * 0.5 : 0;
    [-14, 12].forEach(function (x) { c.save(); c.translate(x, -8); c.rotate(r); circ(c, 0, 0, 8); c.strokeStyle = shade(p.wood, -0.3); c.lineWidth = 3; c.stroke(); ln(c, -7, 0, 7, 0, 1.5, p.wood); ln(c, 0, -7, 0, 7, 1.5, p.wood); c.restore(); });
    rr(c, -22, -18, 44, 7, 2); c.fillStyle = p.wood; c.fill();
    c.save(); c.translate(0, -24); c.rotate(-0.12);
    rr(c, -16, -3, 36, 6, 2); c.fillStyle = shade(p.wood, 0.1); c.fill();
    var bend = 1 - s * 0.6;
    c.strokeStyle = p.metal; c.lineWidth = 3; c.beginPath(); c.moveTo(14, -14 * bend); c.quadraticCurveTo(22, 0, 14, 14 * bend); c.stroke();
    c.strokeStyle = '#eee'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(14, -14 * bend); c.lineTo(-8 + s * 20, 0); c.lineTo(14, 14 * bend); c.stroke();
    if (s < 0.3) { ln(c, -8, 0, 26, 0, 2, '#7a5530'); poly(c, [26, -3, 32, 0, 26, 3], p.metal); }
    c.restore();
    rr(c, -20, -16, 8, 4, 1); c.fillStyle = o.team; c.fill();
    // bediener
    c.save(); c.translate(-26, 0); c.scale(0.85, 0.85);
    humanoid(c, { pal: { skin: '#c48a5a', top: '#b02a2a', bot: '#8a6a4a', wpn: '#999' }, gear: { head: 'galea', weapon: 'gladius' }, ph: o.ph, a: -1, team: o.team, moving: o.moving }, {});
    c.restore();
  }

  function testudo(c, o) {
    var p = o.pal, w = o.moving ? Math.sin(o.ph) : 0, s = swing(o.a);
    for (var i = 0; i < 4; i++) { var x = -18 + i * 11; ln(c, x, -10, x + w * 4 * (i % 2 ? 1 : -1), 0, 3.4, '#8a6a4a'); }
    c.save(); c.translate(s * 6, 0);
    rr(c, -26, -40, 50, 32, 4); c.fillStyle = shade(p.shield, -0.25); c.fill();
    for (var r = 0; r < 2; r++) for (var k = 0; k < 4; k++) {
      var sx = -25 + k * 12.3, sy = -40 + r * 16;
      rr(c, sx, sy, 11.5, 15, 2); c.fillStyle = p.shield; c.fill(); c.strokeStyle = p.trim; c.lineWidth = 1.2; c.stroke();
      circ(c, sx + 5.7, sy + 7.5, 1.8); c.fillStyle = p.trim; c.fill();
    }
    // dakschilden
    for (var k2 = 0; k2 < 4; k2++) { rr(c, -25 + k2 * 12.3, -46, 11.5, 7, 2); c.fillStyle = shade(p.shield, 0.1); c.fill(); c.strokeStyle = p.trim; c.stroke(); }
    rr(c, -25, -14, 49, 3, 1); c.fillStyle = o.team; c.fill();
    if (s > 0.3) { ln(c, 24, -24, 34, -24, 2.4, '#ddd'); }
    c.restore();
  }

  function cannoneer(c, o) {
    var p = o.pal, s = swing(o.a);
    c.save(); c.translate(6, 0);
    c.save(); c.translate(-2, -9); c.rotate(o.moving ? o.ph * 0.4 : 0); circ(c, 0, 0, 9); c.strokeStyle = p.wood; c.lineWidth = 3; c.stroke(); for (var i = 0; i < 5; i++) { var an = i * PI * 0.4; ln(c, 0, 0, Math.cos(an) * 8, Math.sin(an) * 8, 1.5, p.wood); } c.restore();
    c.save(); c.translate(-2, -14); c.rotate(-0.22); c.translate(-s * 5, 0);
    rr(c, -12, -5, 30, 10, 4); c.fillStyle = p.metal; c.fill(); rr(c, 16, -6, 4, 12, 2); c.fill();
    rr(c, -4, -5, 3, 10, 1); c.fillStyle = o.team; c.fill();
    if (o.a >= 0 && o.a < 0.15) { circ(c, 24, 0, 7); c.fillStyle = 'rgba(255,200,90,0.9)'; c.fill(); }
    c.restore(); c.restore();
    c.save(); c.translate(-16, 0); c.scale(0.95, 0.95);
    humanoid(c, { pal: { skin: p.skin, top: p.top, bot: p.bot, wpn: p.wood }, gear: { head: 'tricorn', weapon: 'club' }, ph: o.ph, a: -1, team: o.team, moving: o.moving }, {});
    c.restore();
    if (o.a >= 0 && o.a < 0.5) { c.fillStyle = 'rgba(200,200,200,' + (0.5 - o.a) + ')'; circ(c, 30 + o.a * 20, -22 - o.a * 20, 6 + o.a * 14); c.fill(); }
  }

  function steamtank(c, o) {
    var p = o.pal, s = swing(o.a), r = o.moving ? o.ph * 0.5 : 0;
    [-20, -4, 12].forEach(function (x) { c.save(); c.translate(x, -9); c.rotate(r); circ(c, 0, 0, 9); c.fillStyle = p.dark; c.fill(); circ(c, 0, 0, 4); c.fillStyle = p.brass; c.fill(); ln(c, -8, 0, 8, 0, 1.4, '#777'); c.restore(); });
    rr(c, -28, -38, 52, 26, 5); c.fillStyle = p.metal; c.fill();
    for (var i = 0; i < 5; i++) { circ(c, -24 + i * 11, -16, 1.4); c.fillStyle = p.brass; c.fill(); }
    rr(c, -28, -38, 52, 4, 2); c.fillStyle = p.brass; c.fill();
    // schoorsteen
    rr(c, -22, -54, 7, 18, 2); c.fillStyle = p.dark; c.fill();
    var pf = (o.t * 1.6) % 1; c.fillStyle = 'rgba(180,180,180,' + (0.5 - pf * 0.5) + ')'; circ(c, -19 - pf * 10, -58 - pf * 20, 4 + pf * 8); c.fill();
    // houwitser
    c.save(); c.translate(10, -40); c.rotate(-0.45 + s * 0.15); c.translate(-s * 4, 0);
    rr(c, -4, -5, 28, 10, 3); c.fillStyle = p.dark; c.fill(); rr(c, 20, -6, 5, 12, 2); c.fillStyle = p.brass; c.fill();
    c.restore();
    rr(c, -6, -46, 18, 9, 3); c.fillStyle = shade(p.metal, 0.15); c.fill();
    rr(c, -28, -30, 52, 4, 1); c.fillStyle = o.team; c.fill();
  }

  function tank(c, o) {
    var p = o.pal, s = swing(o.a), tr = o.moving ? (o.ph * 3) % 6 : 0;
    rr(c, -32, -16, 64, 16, 8); c.fillStyle = p.track; c.fill();
    for (var i = 0; i < 6; i++) { circ(c, -25 + i * 10, -8, 5); c.fillStyle = '#3a3a3a'; c.fill(); circ(c, -25 + i * 10, -8, 2); c.fillStyle = '#666'; c.fill(); }
    for (var k = 0; k < 11; k++) ln(c, -30 + k * 6 + tr, -16, -30 + k * 6 + tr, -14, 1.4, '#555');
    poly(c, [-34, -16, -28, -30, 30, -30, 36, -16], p.body);
    poly(c, [-28, -30, -22, -33, 26, -33, 30, -30], shade(p.body, 0.15));
    // koepel
    c.save(); c.translate(-2, -36);
    rr(c, -14, -9, 28, 12, 5); c.fillStyle = shade(p.body, -0.08); c.fill();
    c.translate(12 - s * 5, -3);
    rr(c, 0, -2.5, 34, 5, 2); c.fillStyle = p.dark; c.fill(); rr(c, 30, -3.5, 6, 7, 1); c.fill();
    if (o.a >= 0 && o.a < 0.12) muzzle(c, 37, 0, 9);
    c.restore();
    rr(c, -20, -44, 6, 3, 1); c.fillStyle = '#222'; c.fill(); ln(c, -18, -44, -18, -60, 1, '#222'); poly(c, [-18, -60, -8, -57, -18, -54], o.team);
    rr(c, -30, -24, 58, 3, 1); c.fillStyle = o.team; c.fill();
  }

  function drone(c, o) {
    var p = o.pal, hov = Math.sin(o.t * 4 + o.seed) * 4, s = swing(o.a);
    c.save(); c.translate(0, -120 + hov);
    // schaduw-lijn
    c.fillStyle = p.dark; rr(c, -14, -4, 28, 9, 4); c.fill();
    c.fillStyle = p.body; c.beginPath(); c.ellipse(0, 0, 11, 7, 0, 0, PI * 2); c.fill();
    [-16, 16].forEach(function (x) { ln(c, x * 0.6, -2, x, -6, 2, p.dark); c.fillStyle = 'rgba(200,220,255,0.35)'; c.beginPath(); c.ellipse(x, -7, 9, 2, 0, 0, PI * 2); c.fill(); ln(c, x - 8 * Math.cos(o.t * 40), -7, x + 8 * Math.cos(o.t * 40), -7, 1.2, '#cde'); });
    circ(c, 7, 2, 3.2 + s); c.fillStyle = p.glow; c.fill(); circ(c, 7, 2, 1.4); c.fillStyle = '#fff'; c.fill();
    rr(c, -8, 4, 10, 2.5, 1); c.fillStyle = o.team; c.fill();
    c.restore();
    // grondschaduw
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, -1, 12, 3, 0, 0, PI * 2); c.fill();
  }

  function mechLeg(c, x, ph, len, col, w) {
    var k = Math.sin(ph) * 0.5;
    c.save(); c.translate(x, -len * 2);
    c.rotate(k); ln(c, 0, 0, 0, len, w, col); c.translate(0, len); c.rotate(-Math.abs(k) * 0.8); ln(c, 0, 0, 0, len, w * 0.9, shade(col, -0.2));
    rr(c, -w, len - 2, w * 2.6, 4, 2); c.fillStyle = shade(col, -0.35); c.fill(); c.restore();
  }

  function mechlight(c, o) {
    var p = o.pal, ph = o.moving ? o.ph : 0, s = swing(o.a);
    mechLeg(c, -3, ph + PI, 10, shade(p.body, -0.2), 4); mechLeg(c, 3, ph, 10, p.body, 4);
    c.save(); c.translate(0, -22 + (o.moving ? Math.abs(Math.cos(ph)) * 1.5 : 0));
    poly(c, [-8, 0, -10, -16, 0, -22, 10, -16, 8, 0], p.body);
    rr(c, -2, -14, 10, 5, 2); c.fillStyle = p.dark; c.fill(); rr(c, 1, -13, 7, 2.5, 1); c.fillStyle = p.glow; c.fill();
    rr(c, -8, -4, 16, 3, 1); c.fillStyle = o.team; c.fill();
    // zwaarden
    [[-1, 0.3], [1, 0]].forEach(function (sd, i) {
      c.save(); c.translate(i ? 6 : -4, -14); c.rotate(-1.4 + s * 2.1 + sd[1]);
      ln(c, 0, 0, 0, 8, 3, p.dark); c.translate(0, 8);
      c.strokeStyle = p.glow; c.lineWidth = 2.6; c.shadowColor = p.glow; c.shadowBlur = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 18); c.stroke(); c.shadowBlur = 0;
      c.restore();
    });
    c.restore();
  }

  function mechsuit(c, o) {
    var p = o.pal, ph = o.moving ? o.ph : 0, s = swing(o.a);
    mechLeg(c, -3, ph + PI, 9, shade(p.body, -0.25), 5); mechLeg(c, 4, ph, 9, p.body, 5);
    c.save(); c.translate(0, -20);
    rr(c, -9, -20, 18, 20, 5); c.fillStyle = p.body; c.fill();
    rr(c, -9, -6, 18, 3, 1); c.fillStyle = o.team; c.fill();
    circ(c, 1, -26, 6.5); c.fillStyle = p.dark; c.fill(); rr(c, 1, -28, 6, 3, 1); c.fillStyle = p.glow; c.fill();
    rr(c, -12, -22, 7, 9, 3); c.fillStyle = shade(p.body, -0.15); c.fill();
    // railgun
    c.save(); c.translate(4, -14); c.translate(-s * 4, 0);
    rr(c, -6, -4, 34, 7, 2); c.fillStyle = p.dark; c.fill();
    ln(c, 2, -5, 26, -5, 1.3, p.glow); ln(c, 2, 4, 26, 4, 1.3, p.glow);
    if (o.a >= 0 && o.a < 0.25) { circ(c, 30, 0, 5); c.fillStyle = p.glow; c.fill(); }
    c.restore(); c.restore();
  }

  function mechheavy(c, o) {
    var p = o.pal, ph = o.moving ? o.ph * 0.6 : 0, s = swing(o.a);
    mechLeg(c, -10, ph + PI, 16, shade(p.body, -0.25), 8); mechLeg(c, 10, ph, 16, p.body, 8);
    c.save(); c.translate(0, -34 + (o.moving ? Math.abs(Math.cos(ph)) * 2 : 0));
    poly(c, [-22, 0, -26, -30, -12, -42, 14, -42, 26, -28, 22, 0], p.body);
    rr(c, -14, -36, 26, 20, 4); c.fillStyle = shade(p.body, 0.1); c.fill();
    rr(c, -2, -32, 14, 5, 2); c.fillStyle = p.dark; c.fill(); rr(c, 0, -31, 10, 3, 1); c.fillStyle = p.glow; c.fill();
    circ(c, -6, -12, 6); c.fillStyle = p.dark; c.fill(); circ(c, -6, -12, 3.5 + Math.sin(o.t * 5) * 0.6); c.fillStyle = p.glow; c.fill();
    rr(c, -22, -4, 44, 4, 1); c.fillStyle = o.team; c.fill();
    // schouderkanon
    c.save(); c.translate(14, -34); c.translate(-s * 5, 0);
    rr(c, -2, -6, 26, 10, 3); c.fillStyle = p.dark; c.fill(); circ(c, 24, -1, 4); c.fillStyle = o.a >= 0 && o.a < 0.25 ? '#fff' : p.glow; c.fill();
    c.restore();
    // schild-generator gloed
    c.strokeStyle = 'rgba(51,224,255,' + (0.18 + Math.sin(o.t * 3) * 0.08) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(0, -22, 34, -1.2, 1.2); c.stroke();
    c.restore();
  }

  function alien(c, o, big) {
    var p = o.pal, ph = o.moving ? o.ph : 0, s = swing(o.a), g = o.gear || {};
    var sc = big ? 1.25 : 1;
    c.save(); c.scale(sc, sc);
    var w = Math.sin(ph);
    ln(c, -1, -16, -1 - w * 6, 0, 3, shade(p.body, -0.2)); ln(c, 1, -16, 1 + w * 6, 0, 3, p.body);
    c.fillStyle = p.body; c.beginPath(); c.moveTo(-6, -16); c.lineTo(-4, -34); c.lineTo(5, -34); c.lineTo(6, -16); c.closePath(); c.fill();
    ln(c, -5, -18, 5, -18, 2.4, o.team);
    c.fillStyle = p.skin; c.beginPath(); c.ellipse(1, -41, 5.5, 7.5, 0.25, 0, PI * 2); c.fill();
    c.fillStyle = p.glow; c.beginPath(); c.ellipse(3.5, -42, 2.4, 1.2, 0.3, 0, PI * 2); c.fill();
    // energie-crest
    c.strokeStyle = p.glow; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-2, -47); c.quadraticCurveTo(-8, -54, -12, -50); c.stroke();
    c.save(); c.translate(3, -31);
    if (g.weapon === 'qgun') { ln(c, 0, 0, 8, 4, 2.6, p.skin); c.translate(8, 4); weapon(c, 'qgun', p, o.a, o); }
    else if (big) {
      ln(c, 0, 0, 8, 2, 2.6, p.skin); c.translate(8, 2);
      var orb = 3.5 + Math.sin(o.t * 6) * 0.8 + s * 2; circ(c, 4, -2, orb); c.fillStyle = p.glow; c.shadowColor = p.glow; c.shadowBlur = 10; c.fill(); c.shadowBlur = 0;
    } else {
      c.rotate(-1.3 + s * 2.2); ln(c, 0, 0, 0, 10, 2.6, p.skin); c.translate(0, 10);
      c.strokeStyle = p.glow; c.lineWidth = 3; c.shadowColor = p.glow; c.shadowBlur = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(2, 20); c.stroke(); c.shadowBlur = 0;
    }
    c.restore();
    c.restore();
  }

  function colossus(c, o) {
    var p = o.pal, ph = o.moving ? o.ph * 0.6 : 0, s = swing(o.a), t = o.t;
    var w = Math.sin(ph);
    c.save(); c.translate(0, o.moving ? Math.abs(Math.cos(ph)) * 2 : 0);
    rr(c, -12 - w * 5, -30, 10, 30, 4); c.fillStyle = shade(p.body, 0.1); c.fill();
    rr(c, 3 + w * 5, -30, 10, 30, 4); c.fillStyle = p.body; c.fill();
    c.fillStyle = p.body; c.beginPath(); c.moveTo(-20, -30); c.lineTo(-24, -66); c.lineTo(-10, -78); c.lineTo(12, -78); c.lineTo(24, -64); c.lineTo(20, -30); c.closePath(); c.fill();
    // sterren in het lichaam
    for (var i = 0; i < 9; i++) { var sx = -16 + ((i * 37) % 32), sy = -36 - ((i * 23) % 38); circ(c, sx, sy, (i % 3 === 0 ? 1.5 : 0.9) * (0.7 + 0.3 * Math.sin(t * 3 + i))); c.fillStyle = p.star; c.fill(); }
    circ(c, 0, -54, 7 + Math.sin(t * 2) * 1); c.fillStyle = p.glow; c.shadowColor = p.glow; c.shadowBlur = 16; c.fill(); c.shadowBlur = 0;
    // kop
    c.fillStyle = p.body; c.beginPath(); c.arc(2, -86, 10, 0, PI * 2); c.fill();
    rr(c, 0, -89, 10, 3, 1); c.fillStyle = p.glow; c.fill();
    c.strokeStyle = p.glow; c.lineWidth = 1.6; c.beginPath(); c.arc(2, -86, 15, PI * 1.1, PI * 1.9); c.stroke();
    rr(c, -20, -34, 40, 4, 1); c.fillStyle = o.team; c.fill();
    // vuist
    c.save(); c.translate(16, -70); c.rotate(-1.2 + s * 1.8);
    rr(c, -5, 0, 10, 26, 4); c.fillStyle = shade(p.body, 0.15); c.fill(); circ(c, 0, 28, 7); c.fillStyle = p.body; c.fill(); circ(c, 0, 28, 3); c.fillStyle = p.glow; c.fill();
    c.restore();
    c.restore();
  }

  AC.LOOKS = {
    ape: function (c, o) { var wk = o.st.slot === 1 ? 'rock' : 'club'; humanoid(c, o, { ape: true, weapon: wk }); },
    caveman: function (c, o) { humanoid(c, { pal: { skin: o.pal.skin, top: o.pal.fur, bot: o.pal.skin, wpn: o.pal.wpn, fur: o.pal.fur }, gear: { head: 'band' }, ph: o.ph, a: o.a, team: o.team, moving: o.moving, t: o.t }, { cave: true, weapon: 'bone' }); },
    human: function (c, o) {
      var g = o.gear || {}, wk = g.weapon;
      if (!wk) wk = o.st.slot === 0 ? 'spear' : 'club';
      humanoid(c, { pal: o.pal, gear: { head: g.head, shield: g.shield, big: g.big, weapon: wk }, ph: o.ph, a: o.a, team: o.team, moving: o.moving, t: o.t }, { cave: o.st.age <= 1 });
    },
    soldier: function (c, o) { humanoid(c, o, { modern: true }); },
    mammoth: mammoth, chariot: chariot, ballista: ballista, testudo: testudo, cannoneer: cannoneer, steamtank: steamtank, tank: tank,
    drone: drone, mechlight: mechlight, mechsuit: mechsuit, mechheavy: mechheavy,
    alien: function (c, o) { alien(c, o, false); }, alienbig: function (c, o) { alien(c, o, true); }, colossus: colossus,
  };

  // hoogte van iedere look (voor healthbars)
  AC.LOOK_H = { ape: 40, caveman: 46, human: 50, soldier: 50, mammoth: 64, chariot: 52, ballista: 48, testudo: 50, cannoneer: 46, steamtank: 60, tank: 50, drone: 136, mechlight: 50, mechsuit: 54, mechheavy: 82, alien: 56, alienbig: 70, colossus: 104 };
})();
