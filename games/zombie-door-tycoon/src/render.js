// =====================================================================
//  RENDER — 2.5D canvas drawing of rooms, towers, zombies, hub
// =====================================================================
(function () {
  var T = G.T, R = G.R = {};
  var TAU = Math.PI * 2;

  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(c, p) {
    var r = hex2rgb(c);
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(p < 0 ? v * (1 + p) : v + (255 - v) * p))); };
    return 'rgb(' + f(r[0]) + ',' + f(r[1]) + ',' + f(r[2]) + ')';
  }
  function rgba(c, a) { var r = hex2rgb(c); return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a + ')'; }
  R.shade = shade; R.rgba = rgba;
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  R.rr = rr;
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  function circ(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
  function box(ctx, x, y, w, h, d, top, side, rad) {
    ctx.fillStyle = side; rr(ctx, x, y + d, w, h, rad || 3); ctx.fill();
    ctx.fillStyle = top; rr(ctx, x, y, w, h, rad || 3); ctx.fill();
  }
  function seeded(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  R.time = 0;

  // -------------------------------------------------------------------
  //  Static world layer (cached per map)
  // -------------------------------------------------------------------
  var cache = {}, LS = 1.5;
  R.LS = LS;
  R.worldLayer = function (map) {
    if (cache[map.id]) return cache[map.id];
    var W = G.WCOLS, H = G.WROWS, cv = document.createElement('canvas');
    cv.width = W * T * LS; cv.height = H * T * LS;
    var c = cv.getContext('2d'); c.scale(LS, LS);
    var g = G.WORLD.grid, x, y, px, py, r, ch;
    var themeAt = {};
    G.ROOMS.forEach(function (rm) { for (var yy = rm.walls.y0; yy <= rm.walls.y1; yy++) for (var xx = rm.walls.x0; xx <= rm.walls.x1; xx++) themeAt[xx + ',' + yy] = rm.theme; });
    var floor = map.id === 'frozen' ? '#cfdde8' : map.id === 'volcano' ? '#3a2a26' : '#4a4e56';
    var wallC = map.id === 'frozen' ? '#9fb8cc' : map.id === 'volcano' ? '#2a1c1a' : '#6a707a';
    c.fillStyle = floor; c.fillRect(0, 0, W * T, H * T);
    // big hall floor tiles (2x2) with subtle variation + decals
    for (y = 1; y < H - 1; y += 2) for (x = 1; x < W - 1; x += 2) {
      r = seeded(x * 31 + y * 17);
      c.fillStyle = shade(floor, (r - 0.5) * 0.08 + ((x + y) % 4 ? 0.02 : -0.02)); c.fillRect(x * T, y * T, 2 * T, 2 * T);
      c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 1.5; c.strokeRect(x * T + 0.5, y * T + 0.5, 2 * T - 1, 2 * T - 1);
    }
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) if (g[y][x] === '_') flatDecor(c, map, x * T, y * T, seeded(x * 7 + y * 131));
    // gates: dark tunnels in the outer wall with warning stripes
    G.GATES.forEach(function (gt) {
      var gx = gt.x - (gt.dx ? 0 : 1), gy = gt.y - (gt.dy ? 0 : 1), gw = gt.dx ? 1 : 3, gh = gt.dy ? 1 : 3;
      var sx = gx * T, sy = gy * T;
      c.fillStyle = '#0a0606'; c.fillRect(sx, sy, gw * T, gh * T);
      var gr = c.createLinearGradient(sx + gw * T / 2 - gt.dx * T, sy + gh * T / 2 - gt.dy * T, sx + gw * T / 2 + gt.dx * 3 * T, sy + gh * T / 2 + gt.dy * 3 * T);
      gr.addColorStop(0, 'rgba(255,30,30,.35)'); gr.addColorStop(1, 'rgba(255,30,30,0)');
      c.fillStyle = gr; c.fillRect(sx - (gt.dx ? 0 : T) + (gt.dx > 0 ? T : gt.dx < 0 ? -3 * T : 0), sy + (gt.dy > 0 ? T : gt.dy < 0 ? -3 * T : 0) - (gt.dy ? 0 : T), gt.dx ? 3 * T : 5 * T, gt.dy ? 3 * T : 5 * T);
      // hazard stripes on the threshold
      var tx = gt.x + gt.dx, ty = gt.y + gt.dy;
      for (var k = -1; k <= 1; k++) {
        var hx = (tx + (gt.dx ? 0 : k)) * T, hy = (ty + (gt.dy ? 0 : k)) * T;
        c.save(); c.beginPath(); c.rect(hx, hy, T, T); c.clip();
        for (var st = -2; st < 4; st++) { c.fillStyle = st % 2 ? 'rgba(255,200,0,.35)' : 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(hx + st * 14, hy); c.lineTo(hx + st * 14 + 14, hy); c.lineTo(hx + st * 14 - 26, hy + T); c.lineTo(hx + st * 14 - 40, hy + T); c.fill(); }
        c.restore();
      }
    });
    // outer walls (2.5D), skipping gate openings
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (g[y][x] !== 'W') continue; px = x * T; py = y * T;
      c.fillStyle = shade(wallC, -0.4); c.fillRect(px, py + T - 14, T, 14);
      c.fillStyle = wallC; c.fillRect(px, py - 12, T, T);
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(px, py - 12, T, 2);
      if ((x + y) % 6 === 0) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(px + 6, py - 4, T - 12, 6); }
    }
    // gate frames with red lamps
    G.GATES.forEach(function (gt) {
      var cx = gt.x * T + T / 2, cy = gt.y * T + T / 2;
      c.fillStyle = '#2a0808';
      if (gt.dy) { c.fillRect(cx - 1.5 * T - 6, cy - T / 2 - 14, 6, T + 10); c.fillRect(cx + 1.5 * T, cy - T / 2 - 14, 6, T + 10); c.fillStyle = '#ff2a2a'; c.fillRect(cx - 30, cy - T / 2 - 18, 60, 5); }
      else { c.fillRect(cx - T / 2, cy - 1.5 * T - 6, T, 6); c.fillRect(cx - T / 2, cy + 1.5 * T, T, 6); c.fillStyle = '#ff2a2a'; c.fillRect(cx - 3, cy - 30, 5, 60); }
    });
    // rooms: floor, build tiles
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      ch = g[y][x]; px = x * T; py = y * T;
      if (ch === 'B' || ch === 'D') {
        var th = themeAt[x + ',' + y];
        c.fillStyle = (x + y) % 2 ? th.floor : th.floor2; c.fillRect(px, py, T, T);
        c.strokeStyle = 'rgba(0,0,0,.08)'; c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
        if (ch === 'B') {
          c.fillStyle = 'rgba(255,255,255,.06)'; rr(c, px + 4, py + 4, T - 8, T - 8, 5); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; c.setLineDash([5, 4]); rr(c, px + 4, py + 4, T - 8, T - 8, 5); c.stroke(); c.setLineDash([]);
        }
      }
    }
    // room shadows + walls (2.5D, low walls like the reference)
    G.ROOMS.forEach(function (rm) { var w = rm.walls; c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(w.x0 * T + 6, w.y0 * T + 10, (w.x1 - w.x0 + 1) * T, (w.y1 - w.y0 + 1) * T); });
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (g[y][x] !== '#') continue;
      var th2 = themeAt[x + ',' + y]; px = x * T; py = y * T;
      c.fillStyle = shade(th2.wall, -0.35); c.fillRect(px, py + T - 12, T, 12);
      c.fillStyle = th2.wallTop; c.fillRect(px, py - 10, T, T);
      c.fillStyle = 'rgba(0,0,0,.12)';
      for (var bb = 0; bb < 3; bb++) c.fillRect(px + ((bb % 2) * 14 + y * 7) % 30, py + bb * 12, 12, 1.5);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(px, py - 10, T, 2);
    }
    // central fountain + pillars
    var fx0 = 30 * T, fy0 = 20 * T;
    c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, fx0 + 8, fy0 + 12, 4 * T - 8, 4 * T - 8, 40); c.fill();
    c.fillStyle = shade(floor, -0.35); rr(c, fx0 + 4, fy0 + 4, 4 * T - 8, 4 * T - 8, 40); c.fill();
    c.fillStyle = map.id === 'volcano' ? '#ff5a1e' : map.id === 'frozen' ? '#bfeaff' : '#4aa3df'; rr(c, fx0 + 16, fy0 + 16, 4 * T - 32, 4 * T - 32, 30); c.fill();
    c.fillStyle = shade(floor, -0.1); c.fillRect(fx0 + 2 * T - 8, fy0 + 2 * T - 30, 16, 34);
    circ(c, fx0 + 2 * T, fy0 + 2 * T - 32, 8, 'rgba(255,255,255,.35)');
    G.WORLD.deco.forEach(function (d) {
      var px2 = d[0] * T, py2 = d[1] * T;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px2 + 6, py2 + 10, T, T);
      box(c, px2 + 4, py2 - 30, T - 8, T + 26, 10, shade(wallC, 0.15), shade(wallC, -0.35), 3);
      c.fillStyle = map.id === 'volcano' ? '#ff6a00' : '#ffd23f'; c.fillRect(px2 + 8, py2 - 22, T - 16, 4);
    });
    cache[map.id] = cv;
    return cv;
  };
  function isPath(g, x, y) { if (y < 0 || y >= G.WROWS || x < 0 || x >= G.WCOLS) return false; var ch = g[y][x]; return ch === 'P' || ch === 'S' || ch === 'D'; }
  function flatDecor(c, map, px, py, r) {
    if (map.id === 'city') {
      if (r < 0.06) { c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 5, py + 10 + r * 40); c.lineTo(px + 20, py + 18); c.lineTo(px + 34, py + 8 + r * 60); c.stroke(); }
      else if (r < 0.2) { c.fillStyle = '#6b5a3a'; c.fillRect(px + 8, py + 18, 6, 6); c.fillStyle = '#888'; c.fillRect(px + 22, py + 12, 9, 4); }
      else if (r < 0.24) { c.fillStyle = 'rgba(60,90,140,.35)'; ell(c, px + 20, py + 22, 13, 6); c.fill(); }
    } else if (map.id === 'frozen') {
      if (r < 0.3) { c.fillStyle = 'rgba(255,255,255,.5)'; ell(c, px + 20, py + 22, 14 * r + 6, 4); c.fill(); }
      else if (r < 0.34) { c.fillStyle = '#a8d8f0'; c.beginPath(); c.moveTo(px + 14, py + 26); c.lineTo(px + 18, py + 14); c.lineTo(px + 24, py + 26); c.fill(); }
    } else {
      if (r < 0.08) { c.fillStyle = 'rgba(255,90,30,.85)'; ell(c, px + 20, py + 20, 13, 7); c.fill(); c.fillStyle = '#ffcc33'; ell(c, px + 20, py + 20, 6, 3); c.fill(); }
      else if (r < 0.25) { c.strokeStyle = 'rgba(255,90,20,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py + r * 80); c.lineTo(px + 18, py + 22); c.lineTo(px + T, py + 10); c.stroke(); }
    }
  }
  function obstacle(c, map, px, py, i) {
    if (map.id === 'frozen') { c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, px + 20, py + 34, 14, 5); c.fill(); c.fillStyle = '#2d4a3a'; c.beginPath(); c.moveTo(px + 20, py - 16); c.lineTo(px + 36, py + 32); c.lineTo(px + 4, py + 32); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(px + 20, py - 16); c.lineTo(px + 27, py); c.lineTo(px + 13, py); c.fill(); }
    else if (map.id === 'volcano') { box(c, px + 3, py + 8, 34, 24, 8, '#4a3330', '#2a1a18', 10); c.fillStyle = '#ff6a00'; c.fillRect(px + 12, py + 14, 14, 2); }
    else if (i % 2) { c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, px + 20, py + 34, 14, 5); c.fill(); c.fillStyle = '#5a3a22'; c.fillRect(px + 17, py + 18, 6, 16); circ(c, px + 20, py + 10, 15, '#3f7a3a'); circ(c, px + 14, py + 6, 7, '#4f9a48'); }
    else { box(c, px + 3, py + 16, 34, 10, 6, '#8a5a32', '#5a3a1e', 2); c.fillStyle = '#444'; c.fillRect(px + 6, py + 26, 3, 8); c.fillRect(px + 31, py + 26, 3, 8); }
  }
  // legacy helper used by the play-setup previews
  R.roomLayer = function (room, map) { return R.worldLayer(map); };

  // -------------------------------------------------------------------

  //  Door
  // -------------------------------------------------------------------
  R.drawDoor = function (c, room, sel) {
    var def = room.def, d = def.door, g = def.grid, door = room.door, tier = G.doorTier(door.lvl);
    var px = d.x * T, py = d.y * T, horiz = (g[d.y][d.x - 1] === '#' || g[d.y][d.x + 1] === '#') && !(g[d.y - 1] && g[d.y - 1][d.x] === '#');
    var frac = Math.max(0, door.hp / door.max), t = R.time;
    var shakeX = (t - door.lastHit < 0.12 && room.time - door.lastHit < 0.12) ? (Math.random() - 0.5) * 3 : 0;
    c.save(); c.translate(shakeX, 0);
    var col = tier.color, trim = tier.trim;
    if (door.hp <= 0) { col = '#3a2a1a'; }
    if (horiz) {
      c.fillStyle = shade(trim, -0.3); c.fillRect(px, py + T - 12, T, 12);
      c.fillStyle = col; c.fillRect(px + 2, py - 10, T - 4, T);
      c.fillStyle = trim; c.fillRect(px, py - 10, T, 4); c.fillRect(px, py + T - 16, T, 4);
      for (var i = 1; i < 4; i++) { c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(px + i * 10, py - 6, 1.5, T - 10); }
    } else {
      c.fillStyle = shade(trim, -0.3); c.fillRect(px, py + T - 12, T, 12);
      c.fillStyle = col; c.fillRect(px, py - 8, T, T - 2);
      c.fillStyle = trim; c.fillRect(px, py - 8, 4, T - 2); c.fillRect(px + T - 4, py - 8, 4, T - 2);
      for (var j = 1; j < 4; j++) { c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(px + 4, py - 8 + j * 9, T - 8, 1.5); }
    }
    if (door.lvl >= 15) { c.fillStyle = rgba(trim, 0.25 + 0.15 * Math.sin(t * 4)); c.fillRect(px - 2, py - 12, T + 4, T + 4); }
    if (door.lvl >= 20) { c.strokeStyle = rgba(trim, 0.8); c.lineWidth = 2; for (var k = 0; k < 3; k++) { c.beginPath(); c.arc(px + T / 2, py + 10, 6 + k * 6 + (t * 10 % 6), 0, TAU); c.stroke(); } }
    // cracks
    if (frac < 0.66) { c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px + 8, py - 4); c.lineTo(px + 18, py + 8); c.lineTo(px + 12, py + 18); c.stroke(); }
    if (frac < 0.33) { c.beginPath(); c.moveTo(px + 30, py - 2); c.lineTo(px + 22, py + 12); c.lineTo(px + 30, py + 24); c.stroke(); }
    // knob / emblem
    c.fillStyle = door.lvl >= 5 ? '#ffd23f' : '#c9a24a'; circ(c, px + T / 2, py + 10, 3, c.fillStyle);
    // shield
    if (door.shieldUntil > room.time && door.shield > 0) {
      c.fillStyle = 'rgba(80,180,255,.25)'; c.strokeStyle = 'rgba(140,220,255,.9)'; c.lineWidth = 2;
      c.beginPath(); c.arc(px + T / 2, py + 10, 30 + Math.sin(t * 6) * 2, 0, TAU); c.fill(); c.stroke();
    }
    if (sel) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([4, 3]); c.strokeRect(px - 3, py - 13, T + 6, T + 6); c.setLineDash([]); }
    // label
    var lx = horiz ? px + T + T / 2 : px + T / 2, ly = horiz ? py + 6 : py - 18; c.fillStyle = 'rgba(0,0,0,.6)'; rr(c, lx - 14, ly - 10, 28, 13, 4); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 9px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('Lv ' + door.lvl, lx, ly - 0.5);
    c.restore();
  };

  // -------------------------------------------------------------------
  //  Towers
  // -------------------------------------------------------------------
  R.drawTower = function (c, it, x, y, o) {
    o = o || {};
    var t = R.time, a = o.angle != null ? o.angle : -Math.PI / 2 + Math.sin(t + x) * 0.3, rar = G.RAR[it.rarity];
    var fire = o.fire || 0, lvl = o.level || 0, hx = x, hy = y - 7;
    c.save();
    if (it.place === 'path') { drawTrap(c, it, x, y, o); c.restore(); return; }
    // rarity aura for high rarities
    if (rar.index >= 3) {
      var gl = 0.25 + 0.15 * Math.sin(t * 3 + x);
      var grd = c.createRadialGradient(x, y, 4, x, y, 24); grd.addColorStop(0, rgba(rar.color, gl)); grd.addColorStop(1, rgba(rar.color, 0));
      c.fillStyle = grd; c.fillRect(x - 24, y - 26, 48, 50);
    }
    // shadow + base
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, x, y + 13, 15, 5); c.fill();
    var baseCol = lvl >= 10 ? '#4a4f5a' : lvl >= 5 ? '#5a5f6a' : '#6b6f78';
    box(c, x - 15, y - 9, 30, 20, 6, shade(baseCol, 0.15), shade(baseCol, -0.35), 6);
    c.strokeStyle = rar.color; c.lineWidth = 2; rr(c, x - 15, y - 9, 30, 20, 6); c.stroke();
    if (lvl >= 10) { c.strokeStyle = lvl >= 20 ? 'hsl(' + (t * 90 % 360) + ',90%,65%)' : '#ffd23f'; c.lineWidth = 1.5; rr(c, x - 13, y - 7, 26, 16, 5); c.stroke(); }
    if (rar.id === 'secret') { c.strokeStyle = 'hsl(' + (t * 120 % 360) + ',100%,65%)'; c.lineWidth = 1.5; rr(c, x - 17, y - 11, 34, 24, 7); c.stroke(); }
    if (o.stunned) c.globalAlpha = 0.55;
    drawHead(c, it, hx, hy, a, fire, t, o);
    c.globalAlpha = 1;
    // level pips
    if (lvl > 0) {
      var stars = lvl >= 20 ? 4 : lvl >= 12 ? 3 : lvl >= 6 ? 2 : 1;
      for (var i = 0; i < stars; i++) star(c, x - (stars - 1) * 4.5 + i * 9, y + 13, 3.5, lvl >= 20 ? '#ff5ad8' : '#ffd23f');
    }
    if (o.stunned) { c.fillStyle = '#9ef'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('⚡', x + 12, y - 16); }
    c.restore();
  };
  function star(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath();
    for (var i = 0; i < 10; i++) { var rad = i % 2 ? r * 0.45 : r, an = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); }
    c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.6; c.stroke();
  }
  function barrel(c, x, y, a, len, w, col, tip) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = shade(col, -0.3); rr(c, 0, -w / 2 + 1.5, len, w, w / 3); c.fill();
    c.fillStyle = col; rr(c, 0, -w / 2, len, w, w / 3); c.fill();
    if (tip) { c.fillStyle = tip; c.fillRect(len - 3, -w / 2, 3, w); }
    c.restore();
  }
  function drawHead(c, it, x, y, a, fire, t, o) {
    var rec = fire > 0 ? -2 : 0, ca, i;
    switch (it.id) {
      case 'pistol': barrel(c, x + Math.cos(a) * rec, y + Math.sin(a) * rec, a, 15, 5, '#3a3f47', '#222'); circ(c, x, y, 7.5, '#8a919c'); circ(c, x - 2, y - 2, 3, '#b8c0ca'); break;
      case 'shotgun': barrel(c, x, y - 2.5, a, 13, 4, '#5a3a22'); barrel(c, x, y + 2.5, a, 13, 4, '#5a3a22'); box(c, x - 8, y - 7, 16, 12, 3, '#8a5a32', '#5a3a1e', 3); break;
      case 'scout': c.fillStyle = '#4a5560'; c.fillRect(x - 3, y - 12, 6, 14); circ(c, x, y - 13, 6, '#2d6a4f'); circ(c, x + Math.cos(a) * 2, y - 13 + Math.sin(a) * 2, 3, '#7fffd4'); c.strokeStyle = '#ccc'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 4, y - 16); c.lineTo(x + 8, y - 24); c.stroke(); circ(c, x + 8, y - 24, 1.5, '#f33'); break;
      case 'minicash': box(c, x - 9, y - 6, 18, 12, 4, '#e8d8b0', '#a8946a', 3); c.fillStyle = '#2a6'; c.fillRect(x - 6, y - 4, 8, 4); c.fillStyle = '#ffd23f'; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('$', x + 5, y + 1); break;
      case 'cashreg': box(c, x - 11, y - 6, 22, 13, 5, '#d9c39a', '#9a845a', 3); c.fillStyle = '#183'; c.fillRect(x - 8, y - 13, 16, 7); c.fillStyle = '#7f7'; c.font = 'bold 6px monospace'; c.textAlign = 'center'; c.fillText('$$$', x, y - 7.5); c.fillStyle = '#333'; c.fillRect(x - 8, y + 2, 16, 2); break;
      case 'sniper': barrel(c, x, y, a, 24, 3.5, '#2f3a2a', '#111'); circ(c, x, y, 7, '#4b5a3a'); barrel(c, x - 1, y - 4, a, 8, 3, '#111'); break;
      case 'frost': barrel(c, x, y, a, 13, 5, '#9be8ff', '#fff'); c.fillStyle = '#5fd0ff'; c.beginPath(); c.moveTo(x, y - 11); c.lineTo(x + 7, y); c.lineTo(x, y + 7); c.lineTo(x - 7, y); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 3, y - 1); c.lineTo(x - 2, y - 1); c.fill(); break;
      case 'tesla': c.fillStyle = '#6a5a3a'; c.fillRect(x - 5, y - 12, 10, 14); for (i = 0; i < 4; i++) { c.fillStyle = '#c87533'; c.fillRect(x - 6, y - 11 + i * 3.5, 12, 1.8); } circ(c, x, y - 16, 5 + (fire > 0 ? 2 : 0), fire > 0 ? '#fff' : '#8ef'); if (Math.random() < 0.3) { c.strokeStyle = '#bff'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + (Math.random() - 0.5) * 16, y - 16 + (Math.random() - 0.5) * 16); c.stroke(); } break;
      case 'poison': barrel(c, x, y + 2, a, 12, 4, '#3a5a1a'); c.fillStyle = '#2a3a1a'; rr(c, x - 8, y - 12, 16, 16, 6); c.fill(); c.fillStyle = '#8f3'; rr(c, x - 6, y - 8, 12, 10, 4); c.fill(); circ(c, x - 2, y - 6 - (t * 8 % 6), 1.5, '#cf6'); circ(c, x + 3, y - 4 - ((t * 8 + 3) % 6), 1.2, '#cf6'); break;
      case 'farmer': c.fillStyle = '#3a7a2a'; for (i = 0; i < 3; i++) { c.fillRect(x - 12 + i * 10, y + 2, 2, -5 - i); circ(c, x - 11 + i * 10, y - 4 - i, 2.5, '#6c3'); } c.fillStyle = '#3a5a9a'; c.fillRect(x - 4, y - 8, 8, 9); c.fillStyle = '#f2c98a'; c.fillRect(x - 3.5, y - 15, 7, 7); c.fillStyle = '#e8c35a'; ell(c, x, y - 15, 9, 2.5); c.fill(); c.fillRect(x - 4, y - 19, 8, 4); break;
      case 'printer': box(c, x - 11, y - 8, 22, 13, 5, '#ddd', '#999', 3); c.fillStyle = '#7fbf7f'; var pp = (t * 20) % 10; c.fillRect(x - 6, y - 12 - pp * 0.4, 12, 7); c.fillStyle = '#285'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('$', x, y - 7 - pp * 0.4); c.fillStyle = '#333'; c.fillRect(x - 8, y - 1, 16, 2); break;
      case 'radar': c.fillStyle = '#555'; c.fillRect(x - 2, y - 10, 4, 10); ca = t * 2; c.save(); c.translate(x, y - 12); c.rotate(ca); c.fillStyle = '#ccc'; ell(c, 0, 0, 10, 4); c.fill(); c.fillStyle = '#888'; ell(c, 0, 0, 6, 2); c.fill(); c.restore(); circ(c, x, y - 12, 2, '#f33'); break;
      case 'flamethrower': barrel(c, x, y, a, 14, 6, '#555', '#f60'); c.fillStyle = '#c33'; rr(c, x - 7, y - 10, 14, 14, 6); c.fill(); c.fillStyle = '#f93'; c.fillRect(x - 5, y - 7, 10, 2); break;
      case 'rocket': c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#4a5a3a'; rr(c, -8, -8, 18, 16, 3); c.fill(); for (i = 0; i < 4; i++) { c.fillStyle = '#ddd'; c.fillRect(10, -7 + i * 4, 4, 3); c.fillStyle = '#e33'; c.fillRect(13, -7 + i * 4, 2, 3); } c.restore(); break;
      case 'laser': barrel(c, x, y, a, 16, 4, '#444', '#ff3d6e'); c.fillStyle = '#ff3d6e'; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 8, y + 3); c.lineTo(x - 8, y + 3); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 3, y); c.lineTo(x - 2, y); c.fill(); break;
      case 'goldfactory': box(c, x - 12, y - 8, 24, 14, 5, '#8a7a5a', '#5a4a32', 2); c.fillStyle = '#5a4a32'; c.fillRect(x + 4, y - 20, 6, 12); c.fillStyle = '#ffd23f'; c.fillRect(x - 9, y - 5, 10, 5); circ(c, x + 7 + Math.sin(t * 2) * 2, y - 24 - (t * 6 % 6), 3, 'rgba(200,200,200,.5)'); break;
      case 'goldmine': c.fillStyle = '#6a6a6a'; c.beginPath(); c.moveTo(x - 13, y + 4); c.lineTo(x - 5, y - 12); c.lineTo(x + 6, y - 9); c.lineTo(x + 13, y + 4); c.fill(); circ(c, x - 3, y - 4, 2.5, '#ffd23f'); circ(c, x + 4, y - 2, 2, '#ffd23f'); circ(c, x, y + 1, 2, '#ffe680'); c.strokeStyle = '#8a5a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, y - 16); c.lineTo(x + 12, y - 6); c.stroke(); break;
      case 'crypto': box(c, x - 9, y - 14, 18, 20, 4, '#2a2f3a', '#15181f', 2); for (i = 0; i < 4; i++) { c.fillStyle = (Math.floor(t * 6 + i) % 3) ? '#3f6' : '#063'; c.fillRect(x - 6, y - 11 + i * 4, 3, 2); c.fillStyle = (Math.floor(t * 5 + i * 2) % 2) ? '#f93' : '#530'; c.fillRect(x - 1, y - 11 + i * 4, 3, 2); } c.fillStyle = '#f7931a'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('₿', x + 5, y - 3); break;
      case 'medic': box(c, x - 10, y - 10, 20, 14, 4, '#f2f2f2', '#bbb', 3); c.fillStyle = '#e33'; c.fillRect(x - 2, y - 8, 4, 10); c.fillRect(x - 5, y - 5, 10, 4); if (fire) { c.strokeStyle = 'rgba(80,255,120,.7)'; c.beginPath(); c.arc(x, y - 3, 12 + (t * 20 % 6), 0, TAU); c.stroke(); } break;
      case 'overclock': c.fillStyle = '#555'; c.fillRect(x - 3, y - 12, 6, 12); ca = t * 6; c.fillStyle = 'rgba(255,140,0,.9)'; c.beginPath(); c.arc(x, y - 14, 6, ca, ca + 2); c.lineTo(x, y - 14); c.fill(); circ(c, x, y - 14, 3, '#ffcc00'); break;
      case 'plasma': barrel(c, x, y, a, 18, 8, '#5a2a7a', '#e0a0ff'); circ(c, x, y, 10, '#7a3aa0'); circ(c, x, y, 5, fire ? '#fff' : '#d27bff'); circ(c, x + Math.cos(a) * 18, y + Math.sin(a) * 18, 3 + Math.sin(t * 8), 'rgba(230,160,255,.8)'); break;
      case 'blackhole': c.save(); c.translate(x, y - 6); c.rotate(t); c.strokeStyle = 'rgba(190,120,255,.8)'; c.lineWidth = 2; ell(c, 0, 0, 13, 4); c.stroke(); c.restore(); circ(c, x, y - 6, 8, '#0a0012'); c.strokeStyle = '#b07aff'; c.lineWidth = 1; c.beginPath(); c.arc(x, y - 6, 8, 0, TAU); c.stroke(); break;
      case 'drones': c.fillStyle = '#333'; rr(c, x - 11, y - 8, 22, 12, 3); c.fill(); c.fillStyle = '#ffd23f'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('H', x, y + 1); break;
      case 'quantum': circ(c, x, y - 6, 4, '#7fdcff'); c.strokeStyle = '#3fa2ff'; c.lineWidth = 1.5; for (i = 0; i < 3; i++) { c.save(); c.translate(x, y - 6); c.rotate(t * (1 + i * 0.3) + i * 2.1); ell(c, 0, 0, 12, 4); c.stroke(); circ(c, 12, 0, 1.8, '#fff'); c.restore(); } break;
      case 'shieldgen': c.fillStyle = 'rgba(80,180,255,.35)'; c.beginPath(); c.arc(x, y - 2, 12, Math.PI, 0); c.fill(); c.strokeStyle = '#8cf'; c.lineWidth = 1.5; c.stroke(); circ(c, x, y - 4, 3, '#cef'); break;
      case 'bank': c.fillStyle = '#e8e2d0'; c.fillRect(x - 11, y - 8, 22, 12); c.fillStyle = '#c8c0a8'; for (i = 0; i < 4; i++) c.fillRect(x - 9 + i * 6, y - 7, 2.5, 10); c.fillStyle = '#d8d0b8'; c.beginPath(); c.moveTo(x - 13, y - 8); c.lineTo(x, y - 17); c.lineTo(x + 13, y - 8); c.fill(); c.fillStyle = '#c90'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('$', x, y - 9.5); break;
      case 'wardrum': c.fillStyle = '#8a2a2a'; rr(c, x - 9, y - 10, 18, 12, 4); c.fill(); c.fillStyle = '#f2e6c8'; ell(c, x, y - 10, 9, 3.5); c.fill(); c.strokeStyle = '#5a3a1a'; c.lineWidth = 2; var bb = fire ? 3 : Math.sin(t * 6) * 2; c.beginPath(); c.moveTo(x - 10, y - 20 + bb); c.lineTo(x - 2, y - 12); c.moveTo(x + 10, y - 20 - bb); c.lineTo(x + 2, y - 12); c.stroke(); break;
      case 'kaiju': barrel(c, x, y, a, 22, 10, '#2a5a2a', '#7dff4a'); circ(c, x, y, 12, '#3a7a3a'); for (i = 0; i < 5; i++) { var sa = a + Math.PI + (i - 2) * 0.45; c.fillStyle = '#9f6'; c.beginPath(); c.moveTo(x + Math.cos(sa) * 10, y + Math.sin(sa) * 10); c.lineTo(x + Math.cos(sa) * 16, y + Math.sin(sa) * 16); c.lineTo(x + Math.cos(sa + 0.2) * 10, y + Math.sin(sa + 0.2) * 10); c.fill(); } circ(c, x, y, 5, fire ? '#fff' : '#7dff4a'); break;
      case 'timemanip': circ(c, x, y - 6, 11, '#f2e6c8'); c.strokeStyle = '#a07a2a'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - 6, 11, 0, TAU); c.stroke(); c.strokeStyle = '#333'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + Math.cos(t * 3) * 8, y - 6 + Math.sin(t * 3) * 8); c.moveTo(x, y - 6); c.lineTo(x + Math.cos(t * 0.3) * 5, y - 6 + Math.sin(t * 0.3) * 5); c.stroke(); break;
      case 'infinity': c.strokeStyle = 'hsl(' + (t * 60 % 360) + ',100%,65%)'; c.lineWidth = 3; c.beginPath(); for (i = 0; i <= 40; i++) { var u = i / 40 * TAU, d = 1 + Math.sin(u) * Math.sin(u); c.lineTo(x + 12 * Math.cos(u) / d, y - 7 + 12 * Math.sin(u) * Math.cos(u) / d); } c.stroke(); if (o.warm != null && o.warm < 1) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 12, y + 6, 24, 4); c.fillStyle = '#ff5ad8'; c.fillRect(x - 12, y + 6, 24 * o.warm, 4); } break;
      case 'soul': var fy = Math.sin(t * 3) * 2; c.fillStyle = 'rgba(180,120,255,.4)'; circ(c, x, y - 8 + fy, 11, 'rgba(180,120,255,.3)'); c.fillStyle = '#eee'; rr(c, x - 7, y - 15 + fy, 14, 12, 5); c.fill(); c.fillRect(x - 4, y - 4 + fy, 8, 4); c.fillStyle = '#7a3aff'; circ(c, x - 3, y - 10 + fy, 2.2, '#7a3aff'); circ(c, x + 3, y - 10 + fy, 2.2, '#7a3aff'); if (o.souls) { c.fillStyle = '#c9a8ff'; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText(o.souls, x, y + 9); } break;
      case 'meteor': c.fillStyle = '#5a3a2a'; c.beginPath(); c.moveTo(x - 12, y + 2); c.lineTo(x - 7, y - 10); c.lineTo(x + 7, y - 10); c.lineTo(x + 12, y + 2); c.fill(); circ(c, x, y - 9, 6 + Math.sin(t * 5), '#ff6a00'); circ(c, x, y - 9, 3, '#ffd23f'); break;
      case 'diamond': c.save(); c.translate(x, y - 8); var sc = 0.85 + Math.sin(t * 2) * 0.1; c.scale(sc, 1); c.fillStyle = '#7fe8ff'; c.beginPath(); c.moveTo(0, -10); c.lineTo(9, -3); c.lineTo(0, 10); c.lineTo(-9, -3); c.closePath(); c.fill(); c.fillStyle = '#d8faff'; c.beginPath(); c.moveTo(0, -10); c.lineTo(3, -3); c.lineTo(-3, -3); c.fill(); c.restore(); if (Math.sin(t * 4 + x) > 0.9) star(c, x + 6, y - 14, 3, '#fff'); break;
      case 'creator': var cols = ['#ffffff', '#ffe680', '#ffb526', '#9be8ff'], cc = cols[o.mode || 0]; circ(c, x, y - 8, 7, cc); for (i = 0; i < 3; i++) { c.save(); c.translate(x, y - 8); c.rotate(t * 1.5 + i * 1.05); c.strokeStyle = i === 0 ? '#ffd23f' : rgba('#ffffff', 0.7); c.lineWidth = 1.2; ell(c, 0, 0, 14, 5); c.stroke(); c.restore(); } break;
      case 'voidemperor': c.fillStyle = '#1a0a2a'; c.beginPath(); c.moveTo(x, y - 24); c.lineTo(x + 8, y + 2); c.lineTo(x - 8, y + 2); c.closePath(); c.fill(); c.strokeStyle = '#a05aff'; c.lineWidth = 1; c.stroke(); circ(c, x, y - 9, 3.5, '#ff4aff'); circ(c, x, y - 9, 1.5, '#fff'); break;
      case 'goldengod': c.strokeStyle = 'rgba(255,215,0,.8)'; c.lineWidth = 1.5; ell(c, x, y - 22, 6, 2); c.stroke(); c.fillStyle = '#ffd23f'; c.fillRect(x - 5, y - 10, 10, 11); c.fillStyle = '#ffe680'; c.fillRect(x - 4, y - 18, 8, 8); c.fillStyle = '#c90'; c.fillRect(x - 9, y - 9, 4, 8); c.fillRect(x + 5, y - 9, 4, 8); c.fillStyle = '#fff'; c.fillRect(x - 2.5, y - 15, 1.5, 1.5); c.fillRect(x + 1, y - 15, 1.5, 1.5); break;
      case 'reality': var off = Math.sin(t * 13) * 1.5; c.globalAlpha = 0.7; c.fillStyle = '#f0f'; c.fillRect(x - 8 + off, y - 16, 16, 16); c.fillStyle = '#0ff'; c.fillRect(x - 8 - off, y - 16, 16, 16); c.globalAlpha = 1; c.fillStyle = '#111'; c.fillRect(x - 7, y - 15, 14, 14); c.fillStyle = '#28ffd5'; c.fillRect(x - 3, y - 11, 6, 6); break;
      case 'lastdefense': var miss = o.miss || 0; circ(c, x, y - 6, 10 + miss * 4, rgba('#ff2020', 0.2 + miss * 0.5)); c.fillStyle = '#222'; c.beginPath(); c.moveTo(x - 8, y - 15); c.lineTo(x + 8, y - 15); c.lineTo(x + 8, y - 5); c.lineTo(x, y + 3); c.lineTo(x - 8, y - 5); c.closePath(); c.fill(); c.strokeStyle = '#e22'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#ddd'; c.fillRect(x - 1, y - 22, 2, 18); c.fillRect(x - 4, y - 10, 8, 2); break;
      default: circ(c, x, y, 8, '#888');
    }
  }
  function drawTrap(c, it, x, y, o) {
    var t = R.time;
    switch (it.id) {
      case 'slowtrap': c.fillStyle = 'rgba(60,140,255,.55)'; ell(c, x, y + 2, 16, 11); c.fill(); c.strokeStyle = 'rgba(180,220,255,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y + 2, 7, t * 2, t * 2 + 4); c.stroke(); break;
      case 'spiketrap': c.fillStyle = '#5a5f66'; rr(c, x - 15, y - 10, 30, 22, 3); c.fill(); c.fillStyle = (o.fire ? '#eee' : '#aab'); for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) { var sx = x - 10 + i * 10, sy = y - 4 + j * 10; c.beginPath(); c.moveTo(sx - 3, sy + 3); c.lineTo(sx, sy - 5 - (o.fire ? 3 : 0)); c.lineTo(sx + 3, sy + 3); c.fill(); } break;
      case 'landmine': c.fillStyle = '#3a3a2a'; ell(c, x, y + 2, 10, 6); c.fill(); c.fillStyle = '#5a5a3a'; ell(c, x, y, 8, 4.5); c.fill(); circ(c, x, y - 1, 2, o.armed ? (Math.sin(t * 8) > 0 ? '#f33' : '#600') : '#333'); break;
      case 'wall':
        var hp = o.hpFrac == null ? 1 : o.hpFrac;
        if (hp <= 0) { c.fillStyle = '#6a5a4a'; for (var k = 0; k < 5; k++) { c.fillRect(x - 14 + seeded(k + x) * 24, y - 2 + seeded(k * 3 + y) * 10, 6, 4); } if (o.rebuild != null) { c.fillStyle = '#fff'; c.font = '8px sans-serif'; c.textAlign = 'center'; c.fillText(Math.ceil(o.rebuild) + 's', x, y - 6); } break; }
        box(c, x - 17, y - 14, 34, 18, 8, '#b5653a', '#7a3a20', 2);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 17, y - 8, 34, 1.5); c.fillRect(x - 6, y - 14, 1.5, 6); c.fillRect(x + 6, y - 8, 1.5, 6);
        if (hp < 0.99) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 15, y + 10, 30, 3); c.fillStyle = hp > 0.5 ? '#6f6' : hp > 0.25 ? '#fc3' : '#f44'; c.fillRect(x - 15, y + 10, 30 * hp, 3); }
        break;
    }
  }

  // Item icon for UI cards (draws onto a small canvas)
  R.icon = function (it, size) {
    var cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
    var c = cv.getContext('2d'); c.scale(dpr * size / 48, dpr * size / 48);
    R.drawTower(c, it, 24, 27, { angle: -0.6, level: 0 });
    return cv;
  };

  // -------------------------------------------------------------------
  //  Zombies
  // -------------------------------------------------------------------
  R.drawZombie = function (c, z, room) {
    var t = R.time, s = 11 * z.size, x = z.x, y = z.y, now = room.time;
    var face = Math.cos(z.dir) < -0.1 ? -1 : 1;
    if (Math.abs(Math.cos(z.dir)) < 0.1) face = z.lastFace || 1; z.lastFace = face;
    var alpha = 1;
    if (z.invis) alpha = z.revealUntil > now ? 0.6 : 0.22 + 0.08 * Math.sin(t * 6 + z.id);
    var fly = z.fly ? 16 + Math.sin(t * 5 + z.id) * 3 : 0;
    c.save();
    c.globalAlpha = alpha * 0.9;
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, x, y + 4, s * 0.9, s * 0.35); c.fill();
    c.globalAlpha = alpha;
    c.translate(x, y - fly); c.scale(face, 1);
    if (z.isBoss && z.boss.id === 'wyrm') { drawWyrm(c, z, s, t); c.restore(); return; }
    var sk = z.color, body = shade(sk, -0.35), swing = z.moving ? Math.sin(z.walk) * 0.6 : 0;
    var flash = z.flash > 0;
    // wings (flying)
    if (z.fly) { var wf = Math.sin(t * 18 + z.id) * 0.6; c.fillStyle = shade(sk, -0.5); c.save(); c.rotate(-0.4 + wf); c.beginPath(); c.moveTo(-2, -s * 1.1); c.lineTo(-s * 1.8, -s * 2); c.lineTo(-s * 1.2, -s * 0.8); c.fill(); c.restore(); }
    // legs
    c.fillStyle = shade(body, -0.3);
    c.save(); c.translate(-s * 0.25, -s * 0.5); c.rotate(swing); c.fillRect(-s * 0.18, 0, s * 0.36, s * 0.55); c.restore();
    c.save(); c.translate(s * 0.25, -s * 0.5); c.rotate(-swing); c.fillRect(-s * 0.18, 0, s * 0.36, s * 0.55); c.restore();
    // torso
    c.fillStyle = flash ? '#fff' : body; rr(c, -s * 0.5, -s * 1.45, s, s, s * 0.15); c.fill();
    // arms forward (zombie pose)
    var arm = z.swing ? -0.6 : Math.sin(z.walk * 0.5) * 0.1;
    c.fillStyle = flash ? '#fff' : sk;
    c.save(); c.translate(s * 0.3, -s * 1.3); c.rotate(arm); c.fillRect(0, -s * 0.12, s * 0.85, s * 0.26); c.restore();
    // head
    c.fillStyle = flash ? '#fff' : sk; rr(c, -s * 0.42, -s * 2.2, s * 0.84, s * 0.8, s * 0.15); c.fill();
    // eyes
    var eye = z.isBoss ? '#ff2a2a' : z.type === 'invisible' ? '#bdf' : z.type === 'golden' ? '#fff' : '#ff3';
    c.fillStyle = eye; c.fillRect(s * 0.02, -s * 1.95, s * 0.16, s * 0.16); c.fillRect(s * 0.24, -s * 1.95, s * 0.14, s * 0.16);
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(s * 0.05, -s * 1.62, s * 0.3, s * 0.07);
    accessories(c, z, s, t);
    c.restore();
    // status effects
    c.save();
    if (z.slowUntil > now && !z.immuneSlow || z.trapSlow) { c.fillStyle = 'rgba(120,200,255,.35)'; ell(c, x, y - s - fly, s * 0.9, s * 1.2); c.fill(); }
    if (z.burn && z.burn.until > now && Math.random() < 0.5) G.FX.particle(room, { x: x + (Math.random() - 0.5) * s, y: y - s * 1.2 - fly, vx: 0, vy: -30, life: 0.4, size: 3, color: Math.random() < 0.5 ? '#ff7a1a' : '#ffd23f', type: 'fire' });
    if (z.poison.length && Math.random() < 0.15) G.FX.particle(room, { x: x + (Math.random() - 0.5) * s, y: y - s - fly, vx: 0, vy: -15, life: 0.6, size: 2.5, color: '#9f3', type: 'bubble' });
    if (z.stunUntil > now) { for (var i = 0; i < 3; i++) star(c, x + Math.cos(t * 5 + i * 2.1) * s * 0.7, y - s * 2.5 - fly + Math.sin(t * 5 + i * 2.1) * 3, 2.5, '#ffd23f'); }
    if (z.markUntil > now) { c.strokeStyle = 'rgba(200,100,255,.7)'; c.lineWidth = 1.5; ell(c, x, y + 3, s, s * 0.4); c.stroke(); }
    if (z.immuneUntil > now) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - s - fly, s * 1.5, 0, TAU); c.stroke(); }
    // hp bar
    if (!z.isBoss && (z.hp < z.maxHp || z.elite)) {
      var w = Math.max(18, s * 1.6), hpf = z.hp / z.maxHp;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - w / 2, y - s * 2.6 - fly, w, 3.5);
      c.fillStyle = hpf > 0.5 ? '#5f5' : hpf > 0.25 ? '#fd3' : '#f44'; c.fillRect(x - w / 2, y - s * 2.6 - fly, w * hpf, 3.5);
      if (z.armor - z.shred > 0.5) { c.fillStyle = '#9ab'; c.fillRect(x - w / 2, y - s * 2.6 - fly - 2, w, 1.5); }
    }
    if (z.isBoss) {
      c.fillStyle = '#fff'; c.font = 'bold 10px Fredoka, sans-serif'; c.textAlign = 'center';
      c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(z.name, x, y - s * 2.6 - fly); c.fillText(z.name, x, y - s * 2.6 - fly);
    }
    c.restore();
  };
  function accessories(c, z, s, t) {
    var ty = z.type;
    if (z.isBoss) { bossAcc(c, z, s, t); return; }
    switch (ty) {
      case 'armored': c.fillStyle = '#9aa6b0'; c.fillRect(-s * 0.46, -s * 2.3, s * 0.92, s * 0.32); c.fillStyle = '#7a8690'; c.fillRect(-s * 0.55, -s * 1.4, s * 1.1, s * 0.5); break;
      case 'police': c.fillStyle = '#1a2a5a'; c.fillRect(-s * 0.48, -s * 2.35, s * 0.96, s * 0.3); c.fillRect(-s * 0.1, -s * 2.12, s * 0.65, s * 0.1); c.fillStyle = '#ffd23f'; c.fillRect(-s * 0.08, -s * 2.3, s * 0.16, s * 0.16); if (z.blocks > 0) { c.fillStyle = 'rgba(160,200,255,.6)'; c.fillRect(s * 0.6, -s * 1.7, s * 0.2, s * 1.2); } break;
      case 'exploding': c.fillStyle = '#c22'; c.fillRect(-s * 0.85, -s * 1.4, s * 0.4, s * 0.8); if (Math.sin(t * 12) > 0) { c.fillStyle = '#ff0'; c.fillRect(-s * 0.75, -s * 1.55, s * 0.2, s * 0.15); } break;
      case 'healer': c.fillStyle = '#e22'; c.fillRect(-s * 0.08, -s * 1.3, s * 0.16, s * 0.55); c.fillRect(-s * 0.28, -s * 1.1, s * 0.56, s * 0.16); break;
      case 'tank': case 'giant': c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-s * 0.5, -s * 1.0, s, s * 0.12); break;
      case 'mutant': case 'labmutant': c.fillStyle = shade(z.color, 0.2); c.beginPath(); c.arc(-s * 0.35, -s * 1.5, s * 0.35, 0, TAU); c.fill(); break;
      case 'frozen': case 'icemonster': c.fillStyle = 'rgba(220,250,255,.9)'; c.beginPath(); c.moveTo(-s * 0.4, -s * 1.45); c.lineTo(-s * 0.25, -s * 1.9); c.lineTo(-s * 0.1, -s * 1.45); c.moveTo(s * 0.1, -s * 2.2); c.lineTo(s * 0.2, -s * 2.6); c.lineTo(s * 0.32, -s * 2.2); c.fill(); break;
      case 'firemonster': case 'magma': c.fillStyle = Math.sin(t * 10 + z.id) > 0 ? '#ffcc33' : '#ff6a00'; c.beginPath(); c.moveTo(-s * 0.4, -s * 2.15); c.lineTo(-s * 0.2, -s * 2.7); c.lineTo(0, -s * 2.2); c.lineTo(s * 0.2, -s * 2.8); c.lineTo(s * 0.4, -s * 2.15); c.fill(); break;
      case 'golden': c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-s * 0.3, -s * 2.1, s * 0.1, s * 0.6); break;
      case 'snowmutant': c.fillStyle = '#e8f8ff'; c.fillRect(-s * 0.46, -s * 2.3, s * 0.92, s * 0.2); break;
    }
  }
  function bossAcc(c, z, s, t) {
    switch (z.boss.id) {
      case 'king': c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-s * 0.4, -s * 2.2); c.lineTo(-s * 0.4, -s * 2.6); c.lineTo(-s * 0.2, -s * 2.4); c.lineTo(0, -s * 2.75); c.lineTo(s * 0.2, -s * 2.4); c.lineTo(s * 0.4, -s * 2.6); c.lineTo(s * 0.4, -s * 2.2); c.fill(); c.fillStyle = '#a02'; c.fillRect(-s * 0.6, -s * 1.45, s * 0.25, s * 1.1); break;
      case 'butcher': c.fillStyle = '#ddd'; c.fillRect(-s * 0.5, -s * 1.3, s, s * 0.7); c.fillStyle = '#a33'; c.fillRect(-s * 0.3, -s * 1.1, s * 0.2, s * 0.15); c.fillStyle = '#bbb'; c.fillRect(s * 1.0, -s * 1.6, s * 0.5, s * 0.6); c.fillStyle = '#5a3a1a'; c.fillRect(s * 0.8, -s * 1.35, s * 0.25, s * 0.12); break;
      case 'riot': c.fillStyle = '#1a2a5a'; c.fillRect(-s * 0.5, -s * 2.4, s, s * 0.35); c.fillStyle = 'rgba(170,210,255,' + (z.immuneUntil > 0 ? 0.8 : 0.5) + ')'; rr(c, s * 0.6, -s * 2.0, s * 0.3, s * 1.7, 3); c.fill(); break;
      case 'cyber': c.fillStyle = '#0ff'; c.fillRect(-s * 0.1, -s * 2.0, s * 0.55, s * 0.18); c.fillStyle = '#556'; c.fillRect(-s * 0.5, -s * 1.45, s * 0.3, s * 0.9); c.fillStyle = '#0ff'; c.fillRect(-s * 0.45, -s * 1.3, s * 0.2, s * 0.1); break;
      case 'titan': c.fillStyle = '#e8faff'; for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-s * 0.45 + i * s * 0.3, -s * 1.45); c.lineTo(-s * 0.3 + i * s * 0.3, -s * 2.0 - i * 0.1 * s); c.lineTo(-s * 0.15 + i * s * 0.3, -s * 1.45); c.fill(); } break;
      case 'reaper': c.fillStyle = '#120a1a'; c.beginPath(); c.moveTo(-s * 0.6, -s * 1.3); c.lineTo(0, -s * 2.6); c.lineTo(s * 0.6, -s * 1.3); c.fill(); c.strokeStyle = '#aaa'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 0.8, -s * 0.2); c.lineTo(s * 0.9, -s * 2.4); c.quadraticCurveTo(s * 0.2, -s * 2.6, -s * 0.1, -s * 2.0); c.stroke(); break;
      case 'mutantboss': c.fillStyle = shade(z.color, 0.25); circ(c, -s * 0.4, -s * 1.7, s * 0.4, shade(z.color, 0.25)); circ(c, s * 0.3, -s * 2.3, s * 0.25, shade(z.color, 0.25)); break;
      case 'lava': c.strokeStyle = '#ff6a00'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.4, -s * 1.4); c.lineTo(-s * 0.1, -s * 1.0); c.lineTo(s * 0.2, -s * 1.3); c.moveTo(-s * 0.3, -s * 2.0); c.lineTo(0, -s * 1.7); c.stroke(); break;
      case 'toxic': c.fillStyle = 'rgba(140,255,60,.35)'; circ(c, 0, -s * 1.3, s * 1.2 + Math.sin(t * 4) * 2, 'rgba(140,255,60,.25)'); break;
      case 'voidm': c.fillStyle = '#ff4aff'; c.fillRect(s * 0.02, -s * 1.95, s * 0.16, s * 0.16); c.fillRect(s * 0.24, -s * 1.95, s * 0.14, s * 0.16); c.strokeStyle = 'rgba(180,80,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(0, -s * 1.3, s * 1.3, t, t + 3); c.stroke(); break;
      case 'final': c.fillStyle = '#eee'; c.fillRect(-s * 0.55, -s * 1.45, s * 1.1, s * 0.95); c.fillStyle = '#39ff8a'; c.fillRect(-s * 0.4, -s * 1.3, s * 0.15, s * 0.6); c.fillRect(s * 0.25, -s * 1.3, s * 0.15, s * 0.6); c.fillStyle = 'rgba(230,255,58,.6)'; circ(c, 0, -s * 2.4, s * 0.25, 'rgba(230,255,58,.6)'); break;
    }
  }
  function drawWyrm(c, z, s, t) {
    var wf = Math.sin(t * 6) * 0.5;
    c.fillStyle = '#bfe8ff';
    c.save(); c.rotate(-0.3 + wf); c.beginPath(); c.moveTo(0, -s); c.lineTo(-s * 2.2, -s * 2.4); c.lineTo(-s * 1.2, -s * 0.6); c.fill(); c.restore();
    c.save(); c.rotate(0.3 - wf); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.6, -s * 2.6); c.lineTo(s * 0.8, -s * 0.8); c.fill(); c.restore();
    c.fillStyle = z.flash > 0 ? '#fff' : z.color; ell(c, 0, -s, s * 1.3, s * 0.5); c.fill();
    c.beginPath(); c.moveTo(-s * 1.2, -s); c.quadraticCurveTo(-s * 2, -s * 0.5, -s * 2.4, -s * 1.2); c.lineWidth = s * 0.25; c.strokeStyle = z.color; c.stroke();
    rr(c, s * 0.9, -s * 1.5, s * 0.8, s * 0.6, 4); c.fill();
    c.fillStyle = '#2ad4ff'; c.fillRect(s * 1.35, -s * 1.38, s * 0.15, s * 0.15);
  }

  // -------------------------------------------------------------------
  //  World scene (camera view)
  // -------------------------------------------------------------------
  function rectHit(a, b) { return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0; }
  R.visibleRooms = function (match, view) {
    var out = [];
    match.rooms.forEach(function (room) {
      var z = room.def.zone, r = { x0: z.x0 * T - 60, y0: z.y0 * T - 80, x1: (z.x1 + 1) * T + 60, y1: (z.y1 + 1) * T + 60 };
      if (rectHit(r, view)) out.push(room);
    });
    return out;
  };
  R.drawWorld = function (c, match, view, ui, me) {
    var map = match.map, t = R.time, layer = R.worldLayer(map);
    var sx = Math.max(0, view.x0), sy = Math.max(0, view.y0), sw = Math.min(G.WCOLS * T, view.x1) - sx, sh = Math.min(G.WROWS * T, view.y1) - sy;
    c.fillStyle = shade(map.ground, -0.5); c.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
    if (sw > 0 && sh > 0) c.drawImage(layer, sx * LS, sy * LS, sw * LS, sh * LS, sx, sy, sw, sh);
    var rooms = R.visibleRooms(match, view), mine = me && me.room >= 0 ? match.rooms[me.room] : null;
    rooms.forEach(function (room) {
      var def = room.def, now = room.time;
      if (ui && ui.placing && room === mine) {
        var it = G.ITEM[ui.placing];
        if (it.place === 'path') def.pathTiles.forEach(function (p) { if (room.tile[p.x + ',' + p.y]) return; c.fillStyle = 'rgba(255,255,120,.16)'; c.fillRect(p.x * T + 2, p.y * T + 2, T - 4, T - 4); });
        else def.slots.forEach(function (s) { if (room.tile[s.x + ',' + s.y]) return; c.fillStyle = 'rgba(120,255,160,' + (0.16 + 0.07 * Math.sin(t * 4)) + ')'; rr(c, s.x * T + 3, s.y * T + 3, T - 6, T - 6, 6); c.fill(); });
      }
      room.vortices.forEach(function (v) {
        var life = Math.min(1, (now - v.start) * 3), r2 = v.r * life;
        var grd = c.createRadialGradient(v.x, v.y, 2, v.x, v.y, r2); grd.addColorStop(0, 'rgba(10,0,20,.95)'); grd.addColorStop(0.5, 'rgba(90,30,160,.45)'); grd.addColorStop(1, 'rgba(120,60,200,0)');
        c.fillStyle = grd; c.beginPath(); c.arc(v.x, v.y, r2, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(200,150,255,.6)'; c.lineWidth = 1.5;
        for (var k = 0; k < 3; k++) { c.beginPath(); c.arc(v.x, v.y, r2 * (0.3 + k * 0.25), -t * 4 + k, -t * 4 + k + 2); c.stroke(); }
      });
      room.towers.forEach(function (tw) {
        if (tw.item.kind !== 'aura') return;
        var st = match.stats(tw, room);
        c.fillStyle = 'rgba(120,40,200,' + (0.1 + 0.04 * Math.sin(t * 3)) + ')'; c.beginPath(); c.arc(tw.px, tw.py, st.range, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(200,120,255,.4)'; c.setLineDash([6, 6]); c.lineDashOffset = -t * 20; c.stroke(); c.setLineDash([]);
      });
      var z0 = def.zone;
      if (room.timeSlowUntil > now) { c.fillStyle = 'rgba(120,180,255,.10)'; c.fillRect(z0.x0 * T, z0.y0 * T, (z0.x1 - z0.x0 + 1) * T, (z0.y1 - z0.y0 + 1) * T); }
      if (room.blessUntil > now) { c.fillStyle = 'rgba(255,215,0,.07)'; c.fillRect(z0.x0 * T, z0.y0 * T, (z0.x1 - z0.x0 + 1) * T, (z0.y1 - z0.y0 + 1) * T); }
      room.towers.forEach(function (tw) {
        if (tw.item.place !== 'path') return;
        R.drawTower(c, tw.item, tw.px, tw.py, { fire: tw.fire, armed: tw.data.armed, hpFrac: tw.item.kind === 'wall' ? tw.hp / tw.maxHp : null, rebuild: tw.hp <= 0 ? tw.downUntil - now : null });
        if (ui && ui.selTower === tw.id && room === mine) selRing(c, tw.px, tw.py);
      });
      R.drawDoor(c, room, ui && ui.selDoor && room === mine);
    });
    // y-sorted entities
    var ents = [];
    G.GATES.forEach(function (gt) {
      var gx = gt.spawn.x * T + T / 2, gy = gt.spawn.y * T + T / 2;
      if (gx < view.x0 - 80 || gx > view.x1 + 80 || gy < view.y0 - 80 || gy > view.y1 + 80) return;
      for (var i = 0; i < 3; i++) { c.strokeStyle = 'rgba(255,40,60,' + (0.55 - i * 0.15) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(gx, gy, 10 + i * 9 + Math.sin(t * 3 + i) * 3, t * (1 + i), t * (1 + i) + 4.5); c.stroke(); }
    });
    rooms.forEach(function (room) { room.towers.forEach(function (tw) { if (tw.item.place !== 'path') ents.push({ y: tw.py, tw: tw, room: room }); }); });
    match.rooms.forEach(function (room) {
      room.zombies.forEach(function (z) { if (!z.dead && z.x > view.x0 - 60 && z.x < view.x1 + 60 && z.y > view.y0 - 60 && z.y < view.y1 + 90) ents.push({ y: z.y + (z.fly ? 100 : 0), z: z, room: room }); });
    });
    match.players.forEach(function (p) { if (p.pos.x > view.x0 - 40 && p.pos.x < view.x1 + 40 && p.pos.y > view.y0 - 60 && p.pos.y < view.y1 + 40) ents.push({ y: p.pos.y + 6, p: p }); });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) {
      if (e.tw) {
        var tw = e.tw, room = e.room, o = { angle: tw.angle, fire: tw.fire, level: match.towerLevel(tw), stunned: tw.stunUntil > room.time, mode: tw.data.mode, souls: tw.data.souls };
        if (tw.item.kind === 'lastdef') o.miss = 1 - room.door.hp / room.door.max;
        if (tw.item.warmup) o.warm = Math.min(1, (room.time - tw.placedAt) / tw.item.warmup);
        R.drawTower(c, tw.item, tw.px, tw.py, o);
        if (ui && ui.selTower === tw.id && room === mine) selRing(c, tw.px, tw.py);
      } else if (e.z) R.drawZombie(c, e.z, e.room);
      else {
        var p = e.p;
        c.globalAlpha = p.alive || p.room < 0 ? 1 : 0.45;
        R.drawAvatar(c, p.pos.x, p.pos.y + 8, p.color, p.name, p.moving ? p.walk : 0, p.face, p === me);
        c.globalAlpha = 1;
      }
    });
    rooms.forEach(function (room) {
      room.towers.forEach(function (tw) {
        if (tw.item.kind !== 'drones') return;
        tw.data.drones.forEach(function (d) {
          c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, d.x, d.y + 16, 5, 2); c.fill();
          c.fillStyle = '#333'; rr(c, d.x - 5, d.y - 3, 10, 6, 2); c.fill();
          c.strokeStyle = 'rgba(200,200,200,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(d.x - 8, d.y - 4); c.lineTo(d.x - 2, d.y - 4); c.moveTo(d.x + 2, d.y - 4); c.lineTo(d.x + 8, d.y - 4); c.stroke();
          circ(c, d.x, d.y, 1.5, Math.sin(t * 10) > 0 ? '#f33' : '#3f3');
        });
      });
      // owner sign on the back wall
      var def = room.def, owner = room.owner >= 0 ? match.players[room.owner] : null;
      var sx2 = (def.walls.x0 + def.walls.x1 + 1) / 2 * T, sy2 = (def.top ? def.walls.y1 : def.walls.y0) * T + (def.top ? 26 : 2);
      var label = owner ? owner.name : 'VRIJ — ' + def.name;
      c.font = 'bold 12px Fredoka, sans-serif'; c.textAlign = 'center';
      var w = c.measureText(label).width + 16;
      c.fillStyle = owner ? R.rgba(owner.color, 0.9) : 'rgba(0,0,0,.65)'; rr(c, sx2 - w / 2, sy2 - 12, w, 18, 6); c.fill();
      c.fillStyle = owner ? '#111' : '#ffe680'; c.fillText(label, sx2, sy2 + 1);
      if (owner && !owner.alive) {
        var wr = def.walls;
        c.fillStyle = 'rgba(20,0,0,.55)'; c.fillRect(wr.x0 * T, wr.y0 * T - 10, (wr.x1 - wr.x0 + 1) * T, (wr.y1 - wr.y0 + 1) * T + 10);
        c.fillStyle = '#ff4d4d'; c.font = 'bold 22px Fredoka, sans-serif'; c.strokeStyle = '#000'; c.lineWidth = 4;
        c.strokeText('ELIMINATED', sx2, def.center.y + 8); c.fillText('ELIMINATED', sx2, def.center.y + 8);
      }
    });
    // range previews for my room
    if (ui && mine) {
      var showT = ui.selTower && mine.towers.filter(function (q) { return q.id === ui.selTower; })[0];
      if (showT && showT.item.range) rangeCircle(c, showT.px, showT.py, match.stats(showT, mine).range, '#ffffff');
      if (ui.placing && ui.hover) {
        var it2 = G.ITEM[ui.placing], hx = ui.hover.x * T + T / 2, hy = ui.hover.y * T + T / 2;
        var ok = !match.canPlace(me, ui.placing, ui.hover.x, ui.hover.y);
        var valid = it2.place === 'path' ? mine.def.pathSet[ui.hover.x + ',' + ui.hover.y] : G.inRect(mine.def.interior, ui.hover.x, ui.hover.y);
        if (valid) {
          if (it2.range && !it2.global) rangeCircle(c, hx, hy, it2.range * T, ok ? '#7dff9a' : '#ff6b6b');
          c.globalAlpha = 0.65; R.drawTower(c, it2, hx, hy, {}); c.globalAlpha = 1;
          c.strokeStyle = ok ? '#7dff9a' : '#ff6b6b'; c.lineWidth = 2; rr(c, ui.hover.x * T + 2, ui.hover.y * T + 2, T - 4, T - 4, 6); c.stroke();
        }
      }
    }
    if (ui && ui.marker && ui.marker.t > 0) { var mk = ui.marker; c.strokeStyle = 'rgba(255,255,255,' + mk.t + ')'; c.lineWidth = 2; ell(c, mk.x, mk.y, 14 * (1.4 - mk.t * 0.4), 6 * (1.4 - mk.t * 0.4)); c.stroke(); }
  };
  function selRing(c, x, y) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([4, 3]); c.lineDashOffset = -R.time * 12; c.beginPath(); c.arc(x, y, 20, 0, TAU); c.stroke(); c.setLineDash([]); }
  function rangeCircle(c, x, y, r, col) {
    c.fillStyle = rgba(col, 0.08); c.strokeStyle = rgba(col, 0.6); c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
  }

  // -------------------------------------------------------------------
  //  Minimap
  // -------------------------------------------------------------------
  R.drawMinimap = function (c, match, w, h, view, me) {
    var sc = Math.min(w / (G.WCOLS * T), h / (G.WROWS * T));
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    var dpr = c.canvas.width / w; c.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    c.drawImage(R.worldLayer(match.map), 0, 0, G.WCOLS * T * LS, G.WROWS * T * LS, 0, 0, G.WCOLS * T, G.WROWS * T);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 0, G.WCOLS * T, G.WROWS * T);
    match.rooms.forEach(function (room) {
      var d = room.def.walls, owner = room.owner >= 0 ? match.players[room.owner] : null;
      c.fillStyle = owner ? R.rgba(owner.color, owner.alive ? 0.55 : 0.15) : 'rgba(255,255,255,.12)';
      c.fillRect(d.x0 * T, d.y0 * T, (d.x1 - d.x0 + 1) * T, (d.y1 - d.y0 + 1) * T);
      if (owner) { var hp = room.door.hp / room.door.max; c.fillStyle = hp > 0.5 ? '#4cd964' : hp > 0.25 ? '#ffcc00' : '#ff4d4d'; c.fillRect(room.def.door.x * T - 10, room.def.door.y * T, 60, T); }
      room.zombies.forEach(function (z) { if (z.dead) return; c.fillStyle = z.isBoss ? '#ff2a2a' : '#ff8a8a'; var s = z.isBoss ? 60 : 26; c.fillRect(z.x - s / 2, z.y - s / 2, s, s); });
    });
    match.players.forEach(function (p) { c.fillStyle = p.color; c.beginPath(); c.arc(p.pos.x, p.pos.y, p === me ? 46 : 32, 0, TAU); c.fill(); if (p === me) { c.strokeStyle = '#fff'; c.lineWidth = 14; c.stroke(); } });
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 16; c.strokeRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  };
  // -------------------------------------------------------------------

  R.drawAvatar = function (c, x, y, color, name, walk, face, me) {
    var sw = Math.sin(walk) * 0.5;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, 0, 2, 9, 3); c.fill();
    c.scale(face || 1, 1);
    c.fillStyle = '#2a3a6a'; c.save(); c.translate(-3, -8); c.rotate(sw); c.fillRect(-2.5, 0, 5, 9); c.restore(); c.save(); c.translate(3, -8); c.rotate(-sw); c.fillRect(-2.5, 0, 5, 9); c.restore();
    c.fillStyle = color; c.fillRect(-7, -20, 14, 13);
    c.fillStyle = '#f5c542'; c.save(); c.translate(-8, -19); c.rotate(-sw); c.fillRect(-2, 0, 4, 11); c.restore(); c.save(); c.translate(8, -19); c.rotate(sw); c.fillRect(-2, 0, 4, 11); c.restore();
    c.fillStyle = '#f5c542'; rr(c, -6, -32, 12, 12, 3); c.fill();
    c.fillStyle = '#222'; c.fillRect(-1, -28, 2, 2.5); c.fillRect(3, -28, 2, 2.5); c.fillRect(0, -24, 4, 1);
    c.restore();
    c.font = 'bold 10px Fredoka, sans-serif'; c.textAlign = 'center';
    c.fillStyle = me ? '#ffd23f' : '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(name, x, y - 37); c.fillText(name, x, y - 37);
    if (me) { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x - 5, y - 52); c.lineTo(x + 5, y - 52); c.lineTo(x, y - 46); c.fill(); }
  };
})();
