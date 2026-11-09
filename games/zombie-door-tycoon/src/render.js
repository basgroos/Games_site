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
    var fire = o.fire || 0, lvl = o.level || 0, tier = o.tier != null ? o.tier : Math.min(10, lvl), evo = o.evo || 0, skin = o.skin || null;
    var bob = o.anim ? Math.sin(t * 3 + x) * 1.5 : 0, hx = x, hy = y - 7 + bob;
    c.save();
    if (it.place === 'path') { drawTrap(c, it, x, y, o); c.restore(); return; }
    // godly: rotating rays of light behind the tower
    if (rar.id === 'godly') {
      c.save(); c.translate(x, y - 4); c.rotate(t * 0.4);
      for (var gr = 0; gr < 10; gr++) { c.rotate(TAU / 10); var gg = c.createLinearGradient(0, 0, 0, -36); gg.addColorStop(0, 'rgba(255,240,160,.55)'); gg.addColorStop(1, 'rgba(255,240,160,0)'); c.fillStyle = gg; c.beginPath(); c.moveTo(-3, 0); c.lineTo(0, -38); c.lineTo(3, 0); c.fill(); }
      c.restore();
    }
    // rarity aura for high rarities (and every evolved tower)
    if (rar.index >= 3 || evo) {
      var gl = 0.25 + 0.15 * Math.sin(t * 3 + x), ac = evo === 2 ? '#ffd23f' : rar.color;
      var grd = c.createRadialGradient(x, y, 4, x, y, evo ? 30 : 24); grd.addColorStop(0, rgba(ac, gl)); grd.addColorStop(1, rgba(ac, 0));
      c.fillStyle = grd; c.fillRect(x - 30, y - 32, 60, 62);
    }
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, x, y + 13, 15 + (tier >= 7 ? 4 : 0), 5); c.fill();
    // tier 7+: futuristic hex platform under the base
    if (tier >= 7) { c.fillStyle = '#2a2f3a'; hex(c, x, y + 4, 21, 9); c.fill(); c.strokeStyle = rgba(rar.color, 0.8); c.lineWidth = 1.5; hex(c, x, y + 4, 21, 9); c.stroke(); }
    drawBase(c, x, y, lvl, tier, rar, skin, t);
    tierBase(c, x, y, tier, rar, t);
    if (o.stunned) c.globalAlpha = 0.55;
    BS = 1 + 0.04 * Math.max(0, tier - 1); BD = tier >= 5;
    if (evo && EVO_HEADS[it.id + evo]) EVO_HEADS[it.id + evo](c, hx, hy, a, fire, t, o, tier);
    else drawHead(c, it, hx, hy, a, fire, t, o, tier);
    BS = 1; BD = false;
    c.globalAlpha = 1;
    tierAbove(c, x, y + bob, tier, rar, t, evo);
    if (lvl > 0) {
      var stars = lvl >= 10 ? 4 : lvl >= 7 ? 3 : lvl >= 4 ? 2 : 1;
      for (var i = 0; i < stars; i++) star(c, x - (stars - 1) * 4.5 + i * 9, y + 13, 3.5, lvl >= 10 ? '#ff5ad8' : '#ffd23f');
    }
    if (evo) { c.fillStyle = evo === 2 ? '#ffd23f' : '#fff'; c.font = 'bold 8px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText(evo === 2 ? '★★' : '★', x + 13, y - 10); }
    if (o.auto) { c.fillStyle = '#7dff9a'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('⟳', x - 13, y - 10); }
    if (o.prio) { c.fillStyle = '#ffd23f'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('!', x - 13, y + 2); }
    if (o.stunned) { c.fillStyle = '#9ef'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('⚡', x + 12, y - 16); }
    c.restore();
  };
  var BS = 1, BD = false;
  function hex(c, x, y, rx, ry) { c.beginPath(); for (var i = 0; i < 6; i++) { var an = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(an) * rx, y + Math.sin(an) * ry); } c.closePath(); }
  function drawBase(c, x, y, lvl, tier, rar, skin, t) {
    var baseCol = tier >= 3 ? '#4f545e' : '#6b6f78', top = shade(baseCol, 0.15), side = shade(baseCol, -0.35);
    if (skin === 'gold') { top = '#e8c35a'; side = '#8f6a10'; }
    if (skin === 'neon') { top = '#1a1d26'; side = '#0c0e14'; }
    if (skin === 'prism') { top = 'hsl(' + (t * 60 % 360) + ',60%,55%)'; side = 'hsl(' + (t * 60 % 360) + ',60%,30%)'; }
    if (skin === 'camo') { top = '#5a6a3a'; side = '#3a4428'; }
    box(c, x - 15, y - 9, 30, 20, 6, top, side, 6);
    if (skin === 'camo') { c.fillStyle = '#3e4a26'; ell(c, x - 6, y - 3, 6, 3); c.fill(); c.fillStyle = '#7a6a3a'; ell(c, x + 7, y + 2, 5, 3); c.fill(); }
    if (skin === 'neon') { c.strokeStyle = 'rgba(0,255,230,' + (0.6 + 0.3 * Math.sin(t * 5)) + ')'; c.lineWidth = 2; rr(c, x - 14, y - 8, 28, 18, 5); c.stroke(); }
    if (rar.id === 'godly' && !skin) { box(c, x - 15, y - 9, 30, 20, 6, '#f6f1e4', '#b8a77a', 6); c.fillStyle = '#ffd23f'; c.fillRect(x - 15, y - 1, 30, 2); }
    c.strokeStyle = rar.color; c.lineWidth = 2; rr(c, x - 15, y - 9, 30, 20, 6); c.stroke();
    rarityTrim(c, x, y, rar, t);
    if (rar.id === 'secret') { c.strokeStyle = 'hsl(' + (t * 120 % 360) + ',100%,65%)'; c.lineWidth = 1.5; rr(c, x - 17, y - 11, 34, 24, 7); c.stroke(); }
  }
  // every rarity has its own trim on the base, so you see the rarity at a glance
  function rarityTrim(c, x, y, rar, t) {
    var i = rar.index;
    if (i === 1) { c.fillStyle = rar.color; c.fillRect(x - 13, y + 7, 26, 2); }
    if (i === 2) { [[-13, -7], [13, -7], [-13, 9], [13, 9]].forEach(function (p) { c.fillStyle = rar.color; c.beginPath(); c.moveTo(x + p[0], y + p[1] - 2.5); c.lineTo(x + p[0] + 2.5, y + p[1]); c.lineTo(x + p[0], y + p[1] + 2.5); c.lineTo(x + p[0] - 2.5, y + p[1]); c.fill(); }); }
    if (i === 3) { [-13, 13].forEach(function (dx) { circ(c, x + dx, y - 7, 2.6, '#ffd23f'); circ(c, x + dx, y + 9, 2.6, '#ffd23f'); }); c.fillStyle = '#ffd23f'; c.fillRect(x - 6, y + 9.5, 12, 1.5); }
    if (i === 4) { c.fillStyle = '#ff3d6e'; [-15, 15].forEach(function (dx) { var sg = dx < 0 ? -1 : 1; c.beginPath(); c.moveTo(x + dx, y - 6); c.lineTo(x + dx + sg * 6, y - 13); c.lineTo(x + dx, y - 1); c.fill(); }); }
    if (i === 5) { for (var k = 0; k < 6; k++) circ(c, x - 12.5 + k * 5, y + 10, 1.4, 'hsl(' + ((t * 120 + k * 60) % 360) + ',100%,65%)'); }
    if (i === 6) {
      // golden wings + floating sparks
      c.fillStyle = 'rgba(255,248,210,.9)';
      [-1, 1].forEach(function (sg) { c.beginPath(); c.moveTo(x + sg * 14, y - 4); c.quadraticCurveTo(x + sg * 27, y - 16 + Math.sin(t * 3) * 2, x + sg * 24, y + 4); c.quadraticCurveTo(x + sg * 20, y, x + sg * 14, y + 4); c.fill(); });
      for (var q = 0; q < 5; q++) { var a = t * 1.3 + q * 1.26; circ(c, x + Math.cos(a) * 20, y - 10 - ((t * 14 + q * 9) % 26), 1.3, q % 2 ? '#fff' : '#ffd23f'); }
    }
  }
  // Each upgrade adds real parts to the model: gears, plates, neon, core, ring, sparks, crown
  function tierBase(c, x, y, tier, rar, t) {
    if (tier >= 1) { gear(c, x - 13, y + 8, 4.5, tier >= 8 ? t * 3 : 0, '#8a919c'); }
    if (tier >= 2) { gear(c, x + 13, y + 8, 4.5, tier >= 8 ? -t * 3 : 0, '#8a919c'); }
    if (tier >= 3) { c.fillStyle = '#3a3f48'; c.fillRect(x - 12, y + 5, 8, 5); c.fillRect(x + 4, y + 5, 8, 5); c.fillStyle = '#aab'; [x - 10, x - 6, x + 6, x + 10].forEach(function (rx) { c.fillRect(rx, y + 6.5, 1.5, 1.5); }); }
    if (tier >= 4) { var na = 0.55 + 0.35 * Math.sin(t * 4 + x); c.strokeStyle = rgba(rar.color, na); c.lineWidth = 2; c.beginPath(); c.moveTo(x - 13, y + 11); c.lineTo(x + 13, y + 11); c.stroke(); }
    if (tier >= 6) { var cr = 3 + Math.sin(t * 6) * 0.8; circ(c, x, y + 7, cr + 2, rgba(rar.color, 0.35)); circ(c, x, y + 7, cr, '#ffffff'); }
  }
  function tierAbove(c, x, y, tier, rar, t, evo) {
    if (tier >= 8) { c.save(); c.translate(x, y - 8); c.rotate(t * 1.2); c.strokeStyle = rgba(rar.color, 0.7); c.lineWidth = 1.2; ell(c, 0, 0, 19, 6); c.stroke(); circ(c, 19, 0, 2, '#fff'); circ(c, -19, 0, 2, rar.color); c.restore(); }
    if (tier >= 9) for (var i = 0; i < 4; i++) { var an = t * 2 + i * 1.57, sx = x + Math.cos(an) * 14, sy = y - 12 + Math.sin(an * 1.3) * 10 - ((t * 20 + i * 7) % 14); circ(c, sx, sy, 1.4, i % 2 ? '#fff' : rar.color); }
    if (tier >= 10) {
      c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x - 7, y - 27); c.lineTo(x - 7, y - 32); c.lineTo(x - 3.5, y - 29); c.lineTo(x, y - 34); c.lineTo(x + 3.5, y - 29); c.lineTo(x + 7, y - 32); c.lineTo(x + 7, y - 27); c.closePath(); c.fill();
      circ(c, x, y - 31, 1.3, '#ff3d6e');
      for (var k = 0; k < 3; k++) { var a2 = -t * 1.6 + k * 2.09; c.fillStyle = '#ffe680'; c.save(); c.translate(x + Math.cos(a2) * 22, y - 6 + Math.sin(a2) * 7); c.rotate(t * 4); c.fillRect(-2, -2, 4, 4); c.restore(); }
    }
  }
  function gear(c, x, y, r, rot, col) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col;
    for (var i = 0; i < 6; i++) { c.save(); c.rotate(i * Math.PI / 3); c.fillRect(-1.2, -r - 1.5, 2.4, 3); c.restore(); }
    circ(c, 0, 0, r, col); circ(c, 0, 0, r * 0.4, '#333'); c.restore();
  }
  function star(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath();
    for (var i = 0; i < 10; i++) { var rad = i % 2 ? r * 0.45 : r, an = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); }
    c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.6; c.stroke();
  }
  function barrel(c, x, y, a, len, w, col, tip) {
    len *= BS;
    c.save(); c.translate(x, y); c.rotate(a);
    var offs = BD ? [-w * 0.55, w * 0.55] : [0], ww = BD ? w * 0.78 : w;
    offs.forEach(function (of) {
      c.fillStyle = shade(col, -0.3); rr(c, 0, of - ww / 2 + 1.5, len, ww, ww / 3); c.fill();
      c.fillStyle = col; rr(c, 0, of - ww / 2, len, ww, ww / 3); c.fill();
      if (tip) { c.fillStyle = tip; c.fillRect(len - 3, of - ww / 2, 3, ww); }
    });
    if (BS > 1.15) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(len * 0.45, -w / 2 - (BD ? w * 0.55 : 0), 2, w + (BD ? w * 1.1 : 0)); }
    c.restore();
  }
  function drawHead(c, it, x, y, a, fire, t, o, lv) {
    lv = lv || 0;
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
      // ---------------- 30 new towers ----------------
      case 'doublebarrel': barrel(c, x, y - 3, a, 15, 4, '#3a3f47', '#222'); barrel(c, x, y + 3, a, 15, 4, '#3a3f47', '#222'); circ(c, x, y, 7, '#7a8088'); c.fillStyle = '#a33'; c.fillRect(x - 2, y - 2, 4, 4); break;
      case 'revolver':
        barrel(c, x, y, a, 15, 4, '#55504a', '#222');
        c.save(); c.translate(x, y); c.rotate(o.reload ? t * 12 : 0); circ(c, 0, 0, 7, '#8a7a5a');
        for (i = 0; i < 6; i++) { var ra = i * Math.PI / 3; circ(c, Math.cos(ra) * 4, Math.sin(ra) * 4, 1.5, i < (o.ammo == null ? 6 : o.ammo) ? '#ffd23f' : '#222'); }
        c.restore(); break;
      case 'slingshot': c.strokeStyle = '#7a4a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 3); c.lineTo(x, y - 6); c.lineTo(x - 7, y - 14); c.moveTo(x, y - 6); c.lineTo(x + 7, y - 14); c.stroke(); var pull = fire > 0 ? 0 : 4; c.strokeStyle = '#c33'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 7, y - 14); c.lineTo(x, y - 10 + pull); c.lineTo(x + 7, y - 14); c.stroke(); circ(c, x, y - 10 + pull, 2.2, '#888'); break;
      case 'minifarm': c.fillStyle = '#6a4a2a'; c.fillRect(x - 12, y - 4, 24, 8); for (i = 0; i < 4 + Math.floor(lv / 3); i++) { var gx = x - 10 + (i % 4) * 6.5, gy = y - 2 - Math.floor(i / 4) * 6, gr = 2 + Math.sin(t * 2 + i) * 0.4; c.fillStyle = '#3a8a2a'; c.fillRect(gx - 0.5, gy - 5, 1.2, 5); circ(c, gx, gy - 6, gr, i % 2 ? '#f5c542' : '#7c3'); } break;
      case 'minigun':
        var spin = o.spin || 0; c.save(); c.translate(x, y); c.rotate(a);
        c.fillStyle = '#444'; rr(c, -7, -7, 12, 14, 3); c.fill();
        for (i = 0; i < 6; i++) { var ph = t * (4 + spin * 40) + i * Math.PI / 3, oy = Math.sin(ph) * 3.5, sh = Math.cos(ph) > 0 ? '#9aa' : '#566'; c.fillStyle = sh; c.fillRect(4, oy - 1, 15 * BS, 2); }
        c.fillStyle = '#333'; c.fillRect(17 * BS, -4.5, 3, 9);
        if (spin > 0.5) { c.fillStyle = rgba('#ff8a3a', spin * 0.6); c.fillRect(4, -5, 6, 10); }
        c.restore(); c.fillStyle = '#c90'; for (i = 0; i < 4; i++) c.fillRect(x - 10 + i * 2.5, y + 4 + (i % 2), 2, 3); break;
      case 'radartower': c.strokeStyle = '#777'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y + 3); c.lineTo(x, y - 14); c.lineTo(x + 6, y + 3); c.stroke(); c.save(); c.translate(x, y - 15); c.scale(1, 0.5); c.rotate(t * 2.5); c.fillStyle = '#ddd'; c.beginPath(); c.arc(0, 0, 9, -0.6, 0.6); c.lineTo(0, 0); c.fill(); c.fillStyle = 'rgba(80,255,120,.25)'; c.beginPath(); c.arc(0, 0, 18 + lv, 0, 0.9); c.lineTo(0, 0); c.fill(); c.restore(); circ(c, x, y - 15, 2, '#3f3'); break;
      case 'boomerang': circ(c, x, y, 8, '#8a6a3a'); if (fire <= 0) { c.save(); c.translate(x, y - 4); c.rotate(a); c.strokeStyle = '#c9a24a'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, 6); c.lineTo(3, 0); c.lineTo(-6, -6); c.stroke(); c.restore(); } c.fillStyle = '#5a3a1a'; c.fillRect(x - 2, y - 2, 4, 4); break;
      case 'sprayer': c.fillStyle = '#2a4a1a'; rr(c, x - 6, y - 15, 12, 16, 5); c.fill(); c.fillStyle = '#8f3'; c.fillRect(x - 4, y - 12 + (1 - (Math.sin(t) * 0.5 + 0.5)) * 6, 8, 10 - (1 - (Math.sin(t) * 0.5 + 0.5)) * 6); barrel(c, x, y - 2, a, 13, 3, '#555', '#8f3'); if (fire > 0) { c.fillStyle = 'rgba(140,255,60,.35)'; circ(c, x + Math.cos(a) * 20, y + Math.sin(a) * 20, 5, 'rgba(140,255,60,.35)'); } break;
      case 'magnet': c.save(); c.translate(x, y - 3); c.rotate(a); c.strokeStyle = '#d33'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 7, -Math.PI / 2, Math.PI / 2, true); c.stroke(); c.fillStyle = '#ddd'; c.fillRect(-1, -9.5, 7, 5); c.fillRect(-1, 4.5, 7, 5); if (fire > 0 || Math.sin(t * 5) > 0.7) { c.strokeStyle = 'rgba(150,200,255,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(10, 0, 6, -1, 1); c.stroke(); } c.restore(); break;
      case 'mortar': circ(c, x, y, 9, '#4a4f3a'); c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#3a3a2a'; rr(c, -3, -5, 10 * BS, 10, 4); c.fill(); c.restore(); circ(c, x + Math.cos(a) * 3, y - 8, 4.5, '#222'); circ(c, x + Math.cos(a) * 3, y - 8, 2.5, '#000'); if (fire > 0) circ(c, x, y - 12, 5, 'rgba(200,200,200,.5)'); break;
      case 'dronefactory': box(c, x - 12, y - 10, 24, 15, 5, '#5a5f6a', '#3a3e46', 3); c.fillStyle = '#222'; c.fillRect(x - 7, y - 4, 14, 6); c.fillStyle = Math.sin(t * 6) > 0 ? '#f93' : '#530'; c.fillRect(x - 10, y - 9, 3, 2); c.fillRect(x + 7, y - 9, 3, 2); for (i = 0; i < (o.drones || 0); i++) { circ(c, x - 6 + i * 4, y - 1, 1.5, '#ffae42'); } break;
      case 'teslacoil': for (i = -1; i <= 1; i += 2) { c.fillStyle = '#5a4a3a'; c.fillRect(x + i * 7 - 2, y - 14, 4, 15); for (var tc = 0; tc < 3; tc++) { c.fillStyle = '#c87533'; c.fillRect(x + i * 7 - 3, y - 12 + tc * 4, 6, 1.6); } circ(c, x + i * 7, y - 16, 3, '#9ef'); } c.strokeStyle = 'rgba(190,240,255,' + (0.4 + Math.random() * 0.6) + ')'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x - 7, y - 16); for (i = 1; i < 5; i++) c.lineTo(x - 7 + i * 3.5, y - 16 + (Math.random() - 0.5) * 6); c.lineTo(x + 7, y - 16); c.stroke(); break;
      case 'sonic': c.fillStyle = '#333'; rr(c, x - 9, y - 14, 18, 16, 3); c.fill(); var pulse = 1 + (fire > 0 ? 0.25 : Math.sin(t * 10) * 0.05); circ(c, x, y - 9, 4.5 * pulse, '#666'); circ(c, x, y - 9, 2.5, '#111'); circ(c, x, y - 1, 2.5, '#555'); if (fire > 0) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; for (i = 1; i <= 3; i++) { c.beginPath(); c.arc(x, y - 6, 8 * i * (1.6 - fire), 0, TAU); c.stroke(); } } break;
      case 'repairbot': box(c, x - 10, y - 9, 20, 13, 4, '#d8dde4', '#9aa2ad', 3); c.fillStyle = '#3a7'; c.fillRect(x - 6, y - 7, 12, 4); c.save(); c.translate(x + 6, y - 12); c.rotate(Math.sin(t * 3) * 0.6); c.strokeStyle = '#777'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(6, -6); c.stroke(); c.strokeStyle = '#ffd23f'; c.beginPath(); c.arc(7, -7, 2.5, 0, 4); c.stroke(); c.restore(); if (Math.sin(t * 9) > 0.6) star(c, x + 13, y - 19, 2, '#ff0'); break;
      case 'gravity': circ(c, x, y - 8, 8, '#1a1030'); for (i = 0; i < 3; i++) { c.save(); c.translate(x, y - 8); c.rotate(-t * (1.5 + i * 0.7) + i); c.strokeStyle = rgba('#8a6aff', 0.8 - i * 0.2); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 10 + i * 3, 0, 2.3); c.stroke(); c.restore(); } circ(c, x, y - 8, 3, '#c7b6ff'); break;
      case 'satellite': c.fillStyle = '#666'; c.fillRect(x - 2, y - 6, 4, 8); c.save(); c.translate(x, y - 14 + Math.sin(t * 2) * 2); c.fillStyle = '#2a4a9a'; c.fillRect(-15, -3, 9, 6); c.fillRect(6, -3, 9, 6); c.strokeStyle = '#8af'; c.lineWidth = 0.6; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-15 + i * 3, -3); c.lineTo(-15 + i * 3, 3); c.moveTo(6 + i * 3, -3); c.lineTo(6 + i * 3, 3); c.stroke(); } circ(c, 0, 0, 5, '#ccc'); circ(c, 0, 0, 2, fire > 0 ? '#fff' : '#f33'); c.restore(); break;
      case 'assassin': var al = 0.6 + Math.sin(t * 2) * 0.25; c.globalAlpha *= al; c.fillStyle = '#1a1424'; c.beginPath(); c.moveTo(x - 8, y + 2); c.lineTo(x, y - 20); c.lineTo(x + 8, y + 2); c.fill(); circ(c, x, y - 12, 4.5, '#1a1424'); c.fillStyle = '#c58bff'; c.fillRect(x - 3, y - 13, 2, 1.2); c.fillRect(x + 1, y - 13, 2, 1.2); c.globalAlpha /= al; c.save(); c.translate(x, y - 6); c.rotate(a + (fire > 0 ? 1 : 0)); c.fillStyle = '#ddd'; c.fillRect(4, -0.8, 11, 1.6); c.restore(); break;
      case 'timetower': c.fillStyle = '#7a5a2a'; c.fillRect(x - 8, y - 18, 16, 2); c.fillRect(x - 8, y + 1, 16, 2); c.fillStyle = 'rgba(200,230,255,.6)'; c.beginPath(); c.moveTo(x - 6, y - 16); c.lineTo(x + 6, y - 16); c.lineTo(x, y - 7.5); c.lineTo(x + 6, y + 1); c.lineTo(x - 6, y + 1); c.lineTo(x, y - 7.5); c.closePath(); c.fill(); var sand = (t * 0.25) % 1; c.fillStyle = '#e8c35a'; c.beginPath(); c.moveTo(x - 5 * (1 - sand), y - 15 + 7 * sand); c.lineTo(x + 5 * (1 - sand), y - 15 + 7 * sand); c.lineTo(x, y - 8); c.fill(); c.fillRect(x - 5 * sand, y + 1 - 6 * sand, 10 * sand, 6 * sand); c.fillRect(x - 0.4, y - 8, 0.8, 8); break;
      case 'emptower': c.fillStyle = '#444'; c.fillRect(x - 2, y - 14, 4, 15); circ(c, x, y - 16, 5, '#2a6aff'); circ(c, x, y - 16, 2.5, '#cef'); c.strokeStyle = 'rgba(80,160,255,' + (0.3 + 0.3 * Math.sin(t * 4)) + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y - 16, 8 + (t * 8 % 6), 0, TAU); c.stroke(); break;
      case 'bloodbank': box(c, x - 10, y - 12, 20, 17, 4, '#eee', '#bbb', 3); c.fillStyle = '#7a0010'; var bl = 0.4 + 0.3 * Math.sin(t); c.fillRect(x - 7, y - 10 + 12 * (1 - bl), 6, 12 * bl); c.fillStyle = '#c00'; c.fillRect(x + 2, y - 9, 6, 2); c.fillRect(x + 4, y - 11, 2, 6); c.fillStyle = '#ffd23f'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('$', x + 5, y + 2); break;
      case 'jackpot': box(c, x - 10, y - 14, 20, 18, 4, '#c22', '#811', 3); c.fillStyle = '#fff'; c.fillRect(x - 8, y - 11, 16, 7); var sy = ['7', '$', '♦', '★'], roll = fire > 0 ? Math.floor(t * 20) : 0; c.fillStyle = '#c22'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; for (i = 0; i < 3; i++) c.fillText(sy[(roll + i * (fire > 0 ? 1 : 0)) % 4], x - 5 + i * 5, y - 5.5); c.strokeStyle = '#999'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 10, y - 8); c.lineTo(x + 13, y - 15 + (fire > 0 ? 6 : 0)); c.stroke(); circ(c, x + 13, y - 15 + (fire > 0 ? 6 : 0), 2, '#f33'); break;
      case 'nuke': box(c, x - 10, y - 8, 20, 13, 4, '#5a6050', '#3a3e32', 3); c.fillStyle = '#ddd'; c.beginPath(); c.moveTo(x - 7, y - 8); c.lineTo(x - 5, y - 20); c.lineTo(x + 5, y - 20); c.lineTo(x + 7, y - 8); c.fill(); circ(c, x, y - 2, 4, '#ffd23f'); c.fillStyle = '#222'; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x, y - 2); c.arc(x, y - 2, 4, i * 2.09, i * 2.09 + 1.05); c.fill(); } var ch = o.charge || 0; circ(c, x, y - 21, 2 + ch * 3, rgba('#9dff5a', 0.4 + ch * 0.6)); break;
      case 'dragon': var fl = Math.sin(t * 4) * 0.25; c.fillStyle = '#7a1a1a'; c.beginPath(); c.moveTo(x - 4, y - 6); c.lineTo(x - 16, y - 16 + fl * 10); c.lineTo(x - 10, y - 4); c.fill(); c.beginPath(); c.moveTo(x + 4, y - 6); c.lineTo(x + 16, y - 16 - fl * 10); c.lineTo(x + 10, y - 4); c.fill(); circ(c, x, y - 4, 7, '#b22'); c.save(); c.translate(x, y - 8); c.rotate(a); c.fillStyle = '#c33'; rr(c, 0, -4, 12, 8, 3); c.fill(); c.fillStyle = '#ffd23f'; c.fillRect(7, -3, 2, 2); if (fire > 0) { c.fillStyle = 'rgba(255,150,0,.8)'; c.beginPath(); c.moveTo(12, -3); c.lineTo(22, 0); c.lineTo(12, 3); c.fill(); } c.restore(); c.fillStyle = '#eee'; c.beginPath(); c.moveTo(x - 3, y - 10); c.lineTo(x - 5, y - 15); c.lineTo(x - 1, y - 11); c.moveTo(x + 3, y - 10); c.lineTo(x + 5, y - 15); c.lineTo(x + 1, y - 11); c.fill(); break;
      case 'portal': c.save(); c.translate(x, y - 8); c.scale(0.75, 1); for (i = 0; i < 3; i++) { c.strokeStyle = i % 2 ? '#3af' : '#f83'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 11 - i * 3, t * (2 + i) , t * (2 + i) + 4.5); c.stroke(); } circ(c, 0, 0, 4, '#0a0a1a'); c.restore(); break;
      case 'celestial': barrel(c, x, y, a, 20, 6, '#e8e2d0', '#ffe9a8'); circ(c, x, y, 9, '#f5efdc'); circ(c, x, y, 4, '#ffd23f'); for (i = 0; i < 4; i++) { var wa = t * 0.8 + i * Math.PI / 2; c.fillStyle = 'rgba(255,240,180,.8)'; c.beginPath(); c.ellipse(x + Math.cos(wa) * 12, y - 4 + Math.sin(wa) * 4, 4, 1.8, wa, 0, TAU); c.fill(); } break;
      case 'dimension': c.save(); c.translate(x, y - 8); c.rotate(t * 0.7); c.strokeStyle = '#e08bff'; c.lineWidth = 1.5; c.strokeRect(-7, -7, 14, 14); c.rotate(-t * 1.4); c.strokeStyle = '#8bf0ff'; c.strokeRect(-5, -5, 10, 10); c.restore(); circ(c, x, y - 8, 2.5, '#fff'); break;
      case 'storm': var act = o.storm; c.fillStyle = '#556'; c.fillRect(x - 2, y - 10, 4, 11); for (i = 0; i < 4; i++) circ(c, x - 9 + i * 6, y - 17 + Math.sin(t * 2 + i) * 1.2, 5 + (i % 2), act ? '#4a5060' : '#9aa4b4'); if (act && Math.random() < 0.4) { c.strokeStyle = '#eef'; c.lineWidth = 1.2; c.beginPath(); var bx = x + (Math.random() - 0.5) * 14; c.moveTo(bx, y - 14); c.lineTo(bx + 3, y - 8); c.lineTo(bx - 1, y - 6); c.lineTo(bx + 2, y); c.stroke(); } break;
      case 'worldender': var wc = o.charge || 0; c.fillStyle = '#1a0606'; c.beginPath(); c.moveTo(x - 10, y + 2); c.lineTo(x - 6, y - 18); c.lineTo(x + 6, y - 18); c.lineTo(x + 10, y + 2); c.fill(); c.strokeStyle = '#f33'; c.lineWidth = 1; c.stroke(); circ(c, x, y - 10, 4 + wc * 3, rgba('#ff3030', 0.5 + wc * 0.5)); for (i = 0; i < 5; i++) { c.fillStyle = i / 5 < wc ? '#ff5050' : '#400'; c.fillRect(x - 7 + i * 3, y - 2, 2, 2); } if (wc > 0.9) { c.strokeStyle = 'rgba(255,60,60,.4)'; c.beginPath(); c.arc(x, y - 10, 14 + Math.sin(t * 20) * 2, 0, TAU); c.stroke(); } break;
      case 'eternal': for (i = 0; i < 5; i++) { var ea = t * 1.3 + i * TAU / 5; circ(c, x + Math.cos(ea) * 11, y - 8 + Math.sin(ea) * 4, 2.3, ['#ff6a6a', '#6aff8a', '#6ab0ff', '#ffd23f', '#e08bff'][i]); } circ(c, x, y - 8, 6, '#fff'); circ(c, x, y - 8, 3.5, 'hsl(' + (t * 90 % 360) + ',100%,70%)'); break;
      // ---------------- GODLY ----------------
      case 'archangel':
        var wf = Math.sin(t * 3) * 3;
        c.fillStyle = 'rgba(255,250,225,.95)';
        [-1, 1].forEach(function (sg) { c.beginPath(); c.moveTo(x + sg * 3, y - 12); c.quadraticCurveTo(x + sg * 22, y - 30 - wf, x + sg * 20, y - 4); c.quadraticCurveTo(x + sg * 14, y - 8, x + sg * 3, y - 4); c.fill(); for (var fw = 0; fw < 3; fw++) { c.strokeStyle = 'rgba(220,200,140,.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + sg * 6, y - 9 + fw * 2); c.lineTo(x + sg * (16 + fw * 2), y - 22 + fw * 5 - wf * 0.5); c.stroke(); } });
        c.fillStyle = '#f2ead2'; rr(c, x - 4.5, y - 16, 9, 15, 3); c.fill();
        circ(c, x, y - 20, 4.5, '#ffe2b8');
        c.strokeStyle = '#ffd23f'; c.lineWidth = 1.5; ell(c, x, y - 27, 6, 1.8); c.stroke();
        c.save(); c.translate(x + 6, y - 10); c.rotate(a * 0.3 - 0.6 + (fire > 0 ? 0.8 : 0)); c.fillStyle = '#fffbe0'; c.fillRect(0, -1, 16, 2); c.fillStyle = '#ffd23f'; c.fillRect(-1, -3, 2, 6); c.restore();
        if (fire > 0) circ(c, x, y - 20, 9, 'rgba(255,240,160,.35)');
        break;
      case 'singularity':
        c.fillStyle = '#2a2140'; c.beginPath(); c.moveTo(x - 11, y + 2); c.lineTo(x - 7, y - 12); c.lineTo(x + 7, y - 12); c.lineTo(x + 11, y + 2); c.fill();
        for (i = 0; i < 4; i++) { c.save(); c.translate(x, y - 16); c.rotate(t * (1.2 + i * 0.5) + i); c.strokeStyle = ['#e0b0ff', '#8bf0ff', '#ffd23f', '#ff7ad8'][i]; c.lineWidth = 1.4; ell(c, 0, 0, 15 - i * 2, 4 + i); c.stroke(); c.restore(); }
        var sg2 = c.createRadialGradient(x, y - 16, 1, x, y - 16, 9); sg2.addColorStop(0, '#000'); sg2.addColorStop(0.7, '#1a0030'); sg2.addColorStop(1, 'rgba(200,140,255,.9)');
        c.fillStyle = sg2; c.beginPath(); c.arc(x, y - 16, 8 + Math.sin(t * 4) * 0.8, 0, TAU); c.fill();
        break;
      case 'omegatitan':
        c.fillStyle = '#3a3f4a'; c.fillRect(x - 9, y - 4, 7, 8); c.fillRect(x + 2, y - 4, 7, 8);
        box(c, x - 11, y - 20, 22, 17, 4, '#d8b04a', '#8a6a1a', 3);
        c.fillStyle = '#1a1a1a'; c.fillRect(x - 6, y - 17, 12, 4); c.fillStyle = fire > 0 ? '#fff' : '#ff3030'; c.fillRect(x - 5, y - 16, 10, 2);
        [-1, 1].forEach(function (sg) { c.save(); c.translate(x + sg * 12, y - 13); c.rotate(a); c.fillStyle = '#5a5f6a'; rr(c, -3, -3.5, 18 * BS, 7, 2); c.fill(); c.fillStyle = '#ffd23f'; c.fillRect(14 * BS, -3.5, 3, 7); c.restore(); circ(c, x + sg * 12, y - 13, 4, '#8a6a1a'); });
        for (i = 0; i < 3; i++) { c.fillStyle = '#eee'; c.fillRect(x - 5 + i * 4, y - 26, 2.4, 6); c.fillStyle = '#e33'; c.fillRect(x - 5 + i * 4, y - 27, 2.4, 1.5); }
        break;
      case 'midas':
        c.fillStyle = '#b8860b'; c.fillRect(x - 11, y - 2, 22, 5);
        c.fillStyle = '#ffd23f'; rr(c, x - 9, y - 22, 18, 21, 4); c.fill();
        c.fillStyle = '#c0392b'; rr(c, x - 6, y - 12, 12, 10, 2); c.fill();
        c.fillStyle = '#fff2a0'; c.beginPath(); c.moveTo(x - 9, y - 22); c.lineTo(x - 5, y - 28); c.lineTo(x, y - 24); c.lineTo(x + 5, y - 28); c.lineTo(x + 9, y - 22); c.fill();
        circ(c, x, y - 25, 1.6, '#3af'); circ(c, x - 11, y - 8, 2.5, '#ffd23f'); circ(c, x + 11, y - 8, 2.5, '#ffd23f');
        for (i = 0; i < 4; i++) { var ca2 = t * 2 + i * 1.57; c.fillStyle = '#ffd23f'; ell(c, x + Math.cos(ca2) * 15, y + 4 + Math.sin(ca2) * 4, 3, 1.3); c.fill(); }
        break;
      default: circ(c, x, y, 8, '#888');
    }
    towerParts(c, it, x, y, a, lv, t);
  }
  // Per-tower upgrade components: each level bolts something new onto the model
  function towerParts(c, it, x, y, a, lv, t) {
    if (!lv) return;
    var i, n;
    switch (it.id) {
      case 'frost': case 'cryo':
        n = Math.min(8, Math.ceil(lv * 0.8));
        for (i = 0; i < n; i++) { var fa = i / n * TAU + 0.4, fx2 = x + Math.cos(fa) * 12, fy2 = y + 2 + Math.sin(fa) * 5, h = 5 + (i % 3) * 2;
          c.fillStyle = i % 2 ? '#bff0ff' : '#7fd8ff'; c.beginPath(); c.moveTo(fx2, fy2 - h); c.lineTo(fx2 + 2.2, fy2); c.lineTo(fx2 - 2.2, fy2); c.closePath(); c.fill(); }
        if (lv >= 6) for (i = 0; i < 3; i++) circ(c, x + Math.cos(t * 2 + i * 2.1) * 9, y - 12 + Math.sin(t * 3 + i) * 3, 1.2, '#fff');
        return;
      case 'tesla':
        n = lv >= 9 ? 3 : lv >= 6 ? 2 : lv >= 3 ? 1 : 0;
        var spots = [[-11, -2], [11, -2], [0, 4]];
        for (i = 0; i < n; i++) { var cx2 = x + spots[i][0], cy2 = y + spots[i][1]; c.fillStyle = '#5a4a3a'; c.fillRect(cx2 - 1.5, cy2 - 9, 3, 9); c.fillStyle = '#c87533'; c.fillRect(cx2 - 2.5, cy2 - 7, 5, 1.4); c.fillRect(cx2 - 2.5, cy2 - 4, 5, 1.4); circ(c, cx2, cy2 - 10, 2.2, '#8ef');
          if (Math.random() < 0.25) { c.strokeStyle = '#bff'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx2, cy2 - 10); c.lineTo(x, y - 16); c.stroke(); } }
        return;
      case 'rocket':
        n = lv >= 7 ? 2 : lv >= 3 ? 1 : 0;
        for (i = 0; i < n; i++) { c.save(); c.translate(x + (i ? 0 : -1), y - 9 - i * 6); c.rotate(a); c.fillStyle = '#5a6a4a'; rr(c, -6, -5, 14, 10, 2); c.fill(); for (var k = 0; k < 3; k++) { c.fillStyle = '#ddd'; c.fillRect(8, -4.5 + k * 3.2, 3.5, 2.4); c.fillStyle = '#e33'; c.fillRect(10.5, -4.5 + k * 3.2, 1.5, 2.4); } c.restore(); }
        return;
      case 'laser':
        n = lv >= 8 ? 2 : lv >= 4 ? 1 : 0;
        for (i = 0; i < n; i++) { var off = (i ? -1 : 1) * 8, ex = x + Math.cos(a + Math.PI / 2) * off, ey = y + Math.sin(a + Math.PI / 2) * off; barrel(c, ex, ey, a, 11, 3, '#555', '#ff3d6e'); circ(c, ex, ey, 2.5, '#ff7a9a'); }
        return;
      case 'printer':
        n = Math.floor(lv / 3);
        for (i = 0; i < n; i++) { var py = y - 14 - i * 6; box(c, x - 10 + i, py, 20 - 2 * i, 6, 3, '#e4e4e4', '#a0a0a0', 2); c.fillStyle = '#6a6'; c.fillRect(x - 5, py + 1, 2, 2); c.fillStyle = 'rgba(200,200,200,.5)'; if (i === n - 1) circ(c, x + 6 - i, py - 3 - (t * 8 % 5), 2, 'rgba(200,200,200,.5)'); }
        return;
      case 'sniper':
        if (lv >= 2) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#111'; c.fillRect(2, -6, 10 + lv, 2.6); circ(c, 12 + lv, -4.7, 1.8, '#3af'); c.restore(); }
        if (lv >= 4) { c.strokeStyle = '#333'; c.lineWidth = 1.3; var bx2 = x + Math.cos(a) * 14, by2 = y + Math.sin(a) * 14; c.beginPath(); c.moveTo(bx2, by2); c.lineTo(bx2 - 3, by2 + 7); c.moveTo(bx2, by2); c.lineTo(bx2 + 3, by2 + 7); c.stroke(); }
        return;
      case 'cashreg': case 'minicash':
        n = Math.min(4, Math.floor(lv / 2));
        for (i = 0; i < n; i++) { c.fillStyle = i % 2 ? '#3a9a4a' : '#4ab05a'; c.fillRect(x - 15 + i * 2, y - 4 - i * 2.5, 7, 2.4); }
        if (lv >= 5) { c.strokeStyle = '#ffd23f'; c.lineWidth = 1.4; rr(c, x - 11, y - 6, 22, 13, 3); c.stroke(); }
        return;
      case 'flamethrower':
        n = Math.min(3, Math.floor(lv / 3));
        for (i = 0; i < n; i++) { box(c, x - 13 + i * 4, y - 14, 4, 10, 2, '#d33', '#922', 2); }
        if (lv >= 6) circ(c, x + Math.cos(a) * 15, y + Math.sin(a) * 15, 2 + Math.random() * 1.5, 'rgba(255,160,40,.9)');
        return;
    }
    // Generic parts for every other tower, by category
    if (it.cat === 'farm') { n = Math.min(5, Math.ceil(lv / 2)); for (i = 0; i < n; i++) { c.fillStyle = '#ffd23f'; ell(c, x + 11, y + 6 - i * 2.2, 3.5, 1.4); c.fill(); c.strokeStyle = '#b8901a'; c.lineWidth = 0.6; c.stroke(); } }
    else if (it.cat === 'turret') { if (lv >= 3) { c.fillStyle = '#c90'; for (i = 0; i < Math.min(6, lv - 1); i++) c.fillRect(x - 14 + i * 2.3, y - 1 + (i % 2), 1.8, 4); } if (lv >= 6) { c.fillStyle = '#556'; rr(c, x - 9, y - 1, 18, 4, 1.5); c.fill(); } }
    else { if (lv >= 2) { c.strokeStyle = '#888'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 10, y - 2); c.lineTo(x + 12, y - 12 - lv); c.stroke(); circ(c, x + 12, y - 12 - lv, 1.5, Math.sin(t * 6) > 0 ? '#f33' : '#3f3'); }
      if (lv >= 5) { c.strokeStyle = '#888'; c.beginPath(); c.moveTo(x - 10, y - 2); c.lineTo(x - 12, y - 10 - lv * 0.7); c.stroke(); circ(c, x - 12, y - 10 - lv * 0.7, 1.5, '#3af'); } }
  }
  // Evolved models (stage 1 / stage 2 per line)
  var EVO_HEADS = {
    pistol1: function (c, x, y, a, f, t) { barrel(c, x, y - 2.5, a, 15, 3.5, '#2a2f37', '#ffd23f'); barrel(c, x, y + 2.5, a, 15, 3.5, '#2a2f37', '#ffd23f'); box(c, x - 8, y - 6, 16, 12, 3, '#5a6370', '#3a4048', 3); c.fillStyle = '#ffd23f'; c.fillRect(x - 6, y + 4, 12, 2); },
    pistol2: function (c, x, y, a, f, t) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#333'; rr(c, -9, -9, 16, 18, 4); c.fill(); for (var i = 0; i < 6; i++) { var ph = t * (f > 0 ? 40 : 3) + i * 1.05; c.fillStyle = Math.cos(ph) > 0 ? '#bcc' : '#677'; c.fillRect(5, Math.sin(ph) * 5 - 1.2, 18 * BS, 2.4); } c.fillStyle = '#ffd23f'; c.fillRect(20 * BS, -6, 3, 12); c.restore(); circ(c, x, y, 4, '#ffd23f'); },
    shotgun1: function (c, x, y, a, f, t) { for (var i = -1; i <= 1; i++) barrel(c, x, y + i * 3.5, a, 14, 3.4, '#4a2a12'); box(c, x - 9, y - 8, 18, 14, 3, '#2a3a5a', '#1a2440', 3); c.fillStyle = '#ddd'; c.fillRect(x - 7, y - 6, 14, 2); },
    shotgun2: function (c, x, y, a, f, t) { barrel(c, x, y, a, 18, 12, '#3a1a0a', '#ff6a00'); circ(c, x + Math.cos(a) * 18, y + Math.sin(a) * 18, 4, f > 0 ? '#fff' : '#ff6a00'); box(c, x - 10, y - 9, 20, 16, 4, '#5a1a1a', '#3a0a0a', 3); circ(c, x, y - 2, 3.5, '#ff6a00'); },
    frost1: function (c, x, y, a, f, t) { circ(c, x, y - 4, 9, '#cdf6ff'); for (var i = 0; i < 5; i++) { var fa = i * 1.257 + t * 0.5; c.fillStyle = '#7fd8ff'; c.beginPath(); c.moveTo(x + Math.cos(fa) * 4, y - 4 + Math.sin(fa) * 4); c.lineTo(x + Math.cos(fa) * 14, y - 4 + Math.sin(fa) * 14); c.lineTo(x + Math.cos(fa + 0.3) * 5, y - 4 + Math.sin(fa + 0.3) * 5); c.fill(); } circ(c, x, y - 4, 4, '#fff'); },
    frost2: function (c, x, y, a, f, t) { c.fillStyle = '#e8fbff'; c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x + 9, y - 4); c.lineTo(x, y + 4); c.lineTo(x - 9, y - 4); c.closePath(); c.fill(); c.strokeStyle = '#7fd8ff'; c.lineWidth = 1.5; c.stroke(); for (var i = 0; i < 6; i++) { var fa = t * 1.5 + i * 1.047; circ(c, x + Math.cos(fa) * 15, y - 10 + Math.sin(fa) * 5, 2, '#bff0ff'); } c.fillStyle = 'rgba(160,230,255,.3)'; ell(c, x, y + 4, 20, 7); c.fill(); },
    sniper1: function (c, x, y, a, f, t) { barrel(c, x, y, a, 30, 4, '#3a3a5a', '#7fdcff'); c.save(); c.translate(x, y); c.rotate(a); for (var i = 0; i < 4; i++) { c.fillStyle = '#7fdcff'; c.fillRect(8 + i * 5, -3.5, 2, 7); } c.restore(); circ(c, x, y, 7, '#4a4a6a'); circ(c, x, y, 3, '#7fdcff'); },
    sniper2: function (c, x, y, a, f, t) { barrel(c, x, y, a, 34, 5, '#1a1a1a', '#ff3d6e'); c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#111'; c.fillRect(0, -8, 16, 3.5); circ(c, 16, -6.2, 2.5, '#ff3d6e'); c.restore(); circ(c, x, y, 8, '#2a2a2a'); if (Math.sin(t * 3) > 0) { c.strokeStyle = 'rgba(255,60,110,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 80, y + Math.sin(a) * 80); c.stroke(); } },
    flamethrower1: function (c, x, y, a, f, t) { barrel(c, x, y, a, 18, 9, '#3a3a3a', '#ff4a00'); box(c, x - 10, y - 12, 9, 16, 3, '#d33', '#922', 3); box(c, x + 1, y - 12, 9, 16, 3, '#d33', '#922', 3); circ(c, x + Math.cos(a) * 18, y + Math.sin(a) * 18, 3, 'rgba(255,120,0,.8)'); },
    flamethrower2: function (c, x, y, a, f, t) { var fl = Math.sin(t * 5) * 0.3; c.fillStyle = '#5a0a0a'; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x - 18, y - 18 + fl * 10); c.lineTo(x - 8, y); c.moveTo(x, y - 6); c.lineTo(x + 18, y - 18 - fl * 10); c.lineTo(x + 8, y); c.fill(); circ(c, x, y - 4, 9, '#8a1a0a'); c.save(); c.translate(x, y - 8); c.rotate(a); c.fillStyle = '#a22'; rr(c, 0, -5, 15, 10, 4); c.fill(); c.fillStyle = 'rgba(255,170,0,.9)'; c.beginPath(); c.moveTo(15, -4); c.lineTo(22 + Math.random() * 6, 0); c.lineTo(15, 4); c.fill(); c.restore(); },
    tesla1: function (c, x, y, a, f, t) { for (var i = -1; i <= 1; i++) { c.fillStyle = '#5a4a3a'; c.fillRect(x + i * 7 - 2, y - 14 + Math.abs(i) * 3, 4, 14 - Math.abs(i) * 3); circ(c, x + i * 7, y - 16 + Math.abs(i) * 3, 3.5, '#9ef'); } c.strokeStyle = '#cff'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 7, y - 13); c.lineTo(x + (Math.random() - 0.5) * 4, y - 17); c.lineTo(x + 7, y - 13); c.stroke(); },
    tesla2: function (c, x, y, a, f, t) { c.fillStyle = '#7a6a5a'; c.fillRect(x - 2, y - 12, 4, 13); c.save(); c.translate(x, y - 16); c.rotate(Math.sin(t * 2) * 0.2); c.fillStyle = '#999'; rr(c, -9, -6, 18, 9, 2); c.fill(); c.fillStyle = '#ccd'; c.fillRect(-9, -6, 18, 2); c.restore(); for (var i = 0; i < 3; i++) if (Math.random() < 0.5) { c.strokeStyle = '#bff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + (Math.random() - 0.5) * 26, y - 16 + (Math.random() - 0.5) * 20); c.stroke(); } },
    rocket1: function (c, x, y, a, f, t) { for (var j = 0; j < 3; j++) { c.save(); c.translate(x + (j - 1) * 6, y - j * 2); c.rotate(a); c.fillStyle = '#4a5a3a'; rr(c, -5, -4, 12, 8, 2); c.fill(); c.fillStyle = '#ddd'; c.fillRect(7, -3, 4, 6); c.fillStyle = '#e33'; c.fillRect(10, -3, 2, 6); c.restore(); } },
    rocket2: function (c, x, y, a, f, t) { box(c, x - 11, y - 12, 22, 16, 4, '#3a4430', '#22281c', 3); for (var i = 0; i < 5; i++) { var rx = x - 8 + i * 4; c.fillStyle = '#eee'; c.fillRect(rx - 1.3, y - 20, 2.6, 8); c.fillStyle = '#e33'; c.beginPath(); c.moveTo(rx - 1.3, y - 20); c.lineTo(rx, y - 23); c.lineTo(rx + 1.3, y - 20); c.fill(); } c.fillStyle = '#ffd23f'; c.fillRect(x - 10, y - 1, 20, 2); },
    laser1: function (c, x, y, a, f, t) { c.save(); c.translate(x, y - 6); c.rotate(t); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 5); c.lineTo(-8, 5); c.closePath(); c.fill(); c.restore(); barrel(c, x, y, a + 0.12, 16, 3, '#444', '#ff3d6e'); barrel(c, x, y, a - 0.12, 16, 3, '#444', '#3dc8ff'); },
    laser2: function (c, x, y, a, f, t) { circ(c, x, y - 6, 9, '#2a0a1a'); circ(c, x, y - 6, 5 + Math.sin(t * 6), '#ff3d6e'); circ(c, x, y - 6, 2.5, '#fff'); for (var i = 0; i < 3; i++) barrel(c, x, y - 6, a + (i - 1) * 0.25, 17, 3, '#333', ['#ff3d6e', '#ffd23f', '#3dc8ff'][i]); },
    printer1: function (c, x, y, a, f, t) { box(c, x - 12, y - 10, 24, 15, 5, '#e8c35a', '#a8841a', 3); var pp = (t * 20) % 10; c.fillStyle = '#ffd23f'; c.fillRect(x - 6, y - 14 - pp * 0.4, 12, 7); c.fillStyle = '#a8841a'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('$', x, y - 9 - pp * 0.4); c.fillStyle = '#5a4a1a'; c.fillRect(x + 6, y - 20, 4, 10); },
    printer2: function (c, x, y, a, f, t) { c.fillStyle = '#d8faff'; c.fillRect(x - 11, y - 14, 22, 18); c.fillStyle = '#7fe8ff'; c.beginPath(); c.moveTo(x - 13, y - 14); c.lineTo(x, y - 24); c.lineTo(x + 13, y - 14); c.fill(); for (var i = 0; i < 3; i++) { c.fillStyle = '#3a8ab0'; c.fillRect(x - 8 + i * 6, y - 11, 3, 12); } if (Math.sin(t * 4 + x) > 0.8) star(c, x + 8, y - 20, 3, '#fff'); },
    cashreg1: function (c, x, y, a, f, t) { box(c, x - 11, y - 6, 22, 13, 5, '#ffd23f', '#b8901a', 3); c.fillStyle = '#183'; c.fillRect(x - 8, y - 13, 16, 7); c.fillStyle = '#7f7'; c.font = 'bold 6px monospace'; c.textAlign = 'center'; c.fillText('$$$', x, y - 7.5); c.fillStyle = '#fff'; c.fillRect(x - 8, y + 2, 16, 1.5); },
    cashreg2: function (c, x, y, a, f, t) { box(c, x - 12, y - 14, 24, 20, 3, '#8a929c', '#5a626c', 4); circ(c, x, y - 4, 7, '#b8c0ca'); c.save(); c.translate(x, y - 4); c.rotate(t * 0.5); c.strokeStyle = '#333'; c.lineWidth = 1.5; for (var i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * 1.57) * 6, Math.sin(i * 1.57) * 6); c.stroke(); } c.restore(); circ(c, x, y - 4, 2, '#ffd23f'); }
  };
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
      case 'barricade':
        var hb = o.hpFrac == null ? 1 : o.hpFrac;
        if (hb <= 0) { c.fillStyle = '#7a5a3a'; for (var q = 0; q < 4; q++) c.fillRect(x - 12 + seeded(q + x) * 20, y + seeded(q * 5 + y) * 8, 7, 2); break; }
        c.strokeStyle = '#7a4a22'; c.lineWidth = 3.5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 14, y + 6); c.lineTo(x + 14, y - 8); c.moveTo(x - 14, y - 8); c.lineTo(x + 14, y + 6); c.stroke();
        c.fillStyle = '#a8743a'; c.fillRect(x - 15, y - 4, 30, 4); c.fillStyle = '#ccc'; c.fillRect(x - 10, y - 3, 1.5, 1.5); c.fillRect(x + 8, y - 3, 1.5, 1.5);
        if (hb < 0.99) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 15, y + 10, 30, 3); c.fillStyle = hb > 0.5 ? '#6f6' : hb > 0.25 ? '#fc3' : '#f44'; c.fillRect(x - 15, y + 10, 30 * hb, 3); }
        break;
    }
    var tl = o.tier || 0;
    if (tl >= 3) { c.strokeStyle = rgba(G.RAR[it.rarity].color, 0.35 + tl * 0.04); c.lineWidth = 1 + tl * 0.15; ell(c, x, y + 2, 16 + tl * 0.4, 9); c.stroke(); }
    if (tl >= 6) for (var sp = 0; sp < Math.min(4, tl - 5); sp++) circ(c, x - 12 + sp * 8, y + 10, 1.5, G.RAR[it.rarity].color);
    if (tl >= 10) star(c, x, y - 14, 3.5, '#ffd23f');
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
      else if (ui && ui.build && room === mine) {   // building mode: every free tile + yard
        def.slots.forEach(function (s) { var oc = room.tile[s.x + ',' + s.y]; c.strokeStyle = oc ? 'rgba(255,255,255,.12)' : 'rgba(120,255,160,' + (0.45 + 0.2 * Math.sin(t * 4)) + ')'; c.lineWidth = 1.5; c.setLineDash(oc ? [] : [5, 4]); rr(c, s.x * T + 3, s.y * T + 3, T - 6, T - 6, 6); c.stroke(); c.setLineDash([]); if (!oc) { c.fillStyle = 'rgba(120,255,160,.08)'; rr(c, s.x * T + 3, s.y * T + 3, T - 6, T - 6, 6); c.fill(); } });
        def.pathTiles.forEach(function (p) { if (room.tile[p.x + ',' + p.y]) return; c.fillStyle = 'rgba(255,255,120,.1)'; c.fillRect(p.x * T + 3, p.y * T + 3, T - 6, T - 6); });
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
        R.drawTower(c, tw.item, tw.px, tw.py, { fire: tw.fire, armed: tw.data.armed, tier: G.towerTier(tw), hpFrac: tw.item.kind === 'wall' ? tw.hp / tw.maxHp : null, rebuild: tw.hp <= 0 ? tw.downUntil - now : null });
        if (ui && ui.selTower === tw.id && room === mine) selRing(c, tw.px, tw.py);
      });
      R.drawDoor(c, room, ui && ui.selDoor && room === mine);
    });
    // ground fields (radiation etc.) and dimension links
    match.rooms.forEach(function (room) {
      (room.fields || []).forEach(function (f) {
        if (f.x < view.x0 - f.r || f.x > view.x1 + f.r || f.y < view.y0 - f.r || f.y > view.y1 + f.r) return;
        var left = Math.min(1, (f.until - room.time) / 2), g = c.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r);
        g.addColorStop(0, rgba(f.col || '#9dff5a', 0.35 * left)); g.addColorStop(1, rgba(f.col || '#9dff5a', 0));
        c.fillStyle = g; ell(c, f.x, f.y, f.r, f.r * 0.6); c.fill();
        for (var bi = 0; bi < 4; bi++) circ(c, f.x + Math.cos(bi * 1.7 + t) * f.r * 0.5, f.y + Math.sin(bi * 2.3 + t * 1.3) * f.r * 0.3 - (t * 10 + bi * 5) % 10, 1.6, rgba(f.col || '#9dff5a', 0.6 * left));
      });
      var seen = [];
      room.zombies.forEach(function (z) {
        var L = z.link; if (!L || z.dead || L.until < room.time || seen.indexOf(L) >= 0) return; seen.push(L);
        var ms = L.members.filter(function (m) { return !m.dead; }); if (ms.length < 2) return;
        c.strokeStyle = 'rgba(224,139,255,' + (0.45 + 0.25 * Math.sin(t * 8)) + ')'; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.beginPath();
        ms.forEach(function (m, k) { if (k) c.lineTo(m.x, m.y - 10); else c.moveTo(m.x, m.y - 10); }); c.stroke(); c.setLineDash([]);
      });
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
        var tw = e.tw, room = e.room, o = { angle: tw.angle, fire: tw.fire, level: match.towerLevel(tw), stunned: tw.stunUntil > room.time, mode: tw.data.mode, souls: tw.data.souls,
          tier: G.towerTier(tw), evo: tw.evo || 0, skin: tw.cos && tw.cos.skin, anim: tw.cos && tw.cos.anim, auto: room === mine && tw.auto, prio: room === mine && tw.prio,
          spin: tw.data.spin, ammo: tw.data.ammo, reload: tw.data.reloadUntil > room.time, charge: tw.data.charge, storm: tw.data.stormUntil > room.time, drones: tw.data.kz ? tw.data.kz.length : 0 };
        if (tw.item.kind === 'lastdef') o.miss = 1 - room.door.hp / room.door.max;
        if (tw.item.warmup) o.warm = Math.min(1, (room.time - tw.placedAt) / tw.item.warmup);
        R.drawTower(c, tw.item, tw.px, tw.py, o);
        if (ui && ui.selTower === tw.id && room === mine) selRing(c, tw.px, tw.py);
      } else if (e.z) R.drawZombie(c, e.z, e.room);
      else {
        var p = e.p;
        c.globalAlpha = p.alive || p.room < 0 ? 1 : 0.45;
        R.drawAvatar(c, p.pos.x, p.pos.y + 8, p.color, p.name, p.moving ? p.walk : 0, p.face, p === me, p.hat);
        c.globalAlpha = 1;
      }
    });
    rooms.forEach(function (room) {
      room.towers.forEach(function (tw) {
        if (tw.data.kz) tw.data.kz.forEach(function (d) {
          c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, d.x, d.y + 14, 4, 1.6); c.fill();
          c.save(); c.translate(d.x, d.y); c.rotate(d.tgt ? Math.atan2(d.tgt.y - d.y, d.tgt.x - d.x) : t * 2);
          c.fillStyle = '#5a5f6a'; c.beginPath(); c.moveTo(6, 0); c.lineTo(-4, -4); c.lineTo(-2, 0); c.lineTo(-4, 4); c.closePath(); c.fill();
          circ(c, -4, 0, 1.8, 'rgba(255,170,60,' + (0.5 + Math.random() * 0.5) + ')'); circ(c, 2, 0, 1.3, '#f33'); c.restore();
        });
        if (tw.item.kind === 'storm' && tw.data.stormUntil > room.time) {
          var srng = match.stats(tw, room).range;
          for (var si = 0; si < 7; si++) { var sa = si * 0.9 + t * 0.3; circ(c, tw.px + Math.cos(sa) * srng * 0.55, tw.py - 40 + Math.sin(sa) * srng * 0.25, 18 + (si % 3) * 6, 'rgba(70,76,96,.35)'); }
        }
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
      var label = owner ? owner.name + (room.partner >= 0 && match.players[room.partner] ? ' & ' + match.players[room.partner].name : '') : 'VRIJ — ' + def.name;
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
      if (ui.build) mine.towers.forEach(function (q) { if (q !== showT && q.item.range && !q.item.global && !q.item.isFarm) { var rs = match.stats(q, mine).range; c.strokeStyle = rgba(G.RAR[q.item.rarity].color, 0.35); c.lineWidth = 1; c.beginPath(); c.arc(q.px, q.py, rs, 0, TAU); c.stroke(); } });
      if (ui.buildPick) { c.strokeStyle = '#ffd23f'; c.lineWidth = 2.5; rr(c, ui.buildPick.x * T + 2, ui.buildPick.y * T + 2, T - 4, T - 4, 6); c.stroke(); }
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

  function drawHat(c, h) {
    switch (h) {
      case 'cap': c.fillStyle = '#d33'; c.beginPath(); c.arc(0, -32, 6.5, Math.PI, 0); c.fill(); c.fillRect(0, -33, 10, 2.5); break;
      case 'crown': c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-6, -32); c.lineTo(-6, -39); c.lineTo(-3, -35); c.lineTo(0, -40); c.lineTo(3, -35); c.lineTo(6, -39); c.lineTo(6, -32); c.fill(); circ(c, 0, -36, 1.2, '#f33'); break;
      case 'tophat': c.fillStyle = '#111'; c.fillRect(-8, -33, 16, 2.5); c.fillRect(-5, -43, 10, 10); c.fillStyle = '#c33'; c.fillRect(-5, -36, 10, 2); break;
      case 'helmet': c.fillStyle = '#eee'; c.beginPath(); c.arc(0, -31, 7, Math.PI, 0); c.fill(); c.fillStyle = '#e33'; c.fillRect(-1.2, -38, 2.4, 5); c.fillRect(-3, -36, 6, 2); break;
      case 'party': c.fillStyle = '#ff5ad8'; c.beginPath(); c.moveTo(-5, -32); c.lineTo(0, -45); c.lineTo(5, -32); c.fill(); circ(c, 0, -45, 2, '#ffd23f'); c.fillStyle = '#7df'; c.fillRect(-3, -37, 6, 1.5); break;
      case 'halo': c.strokeStyle = '#ffe680'; c.lineWidth = 2; ell(c, 0, -38, 7, 2.2); c.stroke(); break;
    }
  }
  R.drawAvatar = function (c, x, y, color, name, walk, face, me, hat) {
    var sw = Math.sin(walk) * 0.5;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, 0, 2, 9, 3); c.fill();
    c.scale(face || 1, 1);
    c.fillStyle = '#2a3a6a'; c.save(); c.translate(-3, -8); c.rotate(sw); c.fillRect(-2.5, 0, 5, 9); c.restore(); c.save(); c.translate(3, -8); c.rotate(-sw); c.fillRect(-2.5, 0, 5, 9); c.restore();
    c.fillStyle = color; c.fillRect(-7, -20, 14, 13);
    c.fillStyle = '#f5c542'; c.save(); c.translate(-8, -19); c.rotate(-sw); c.fillRect(-2, 0, 4, 11); c.restore(); c.save(); c.translate(8, -19); c.rotate(sw); c.fillRect(-2, 0, 4, 11); c.restore();
    c.fillStyle = '#f5c542'; rr(c, -6, -32, 12, 12, 3); c.fill();
    c.fillStyle = '#222'; c.fillRect(-1, -28, 2, 2.5); c.fillRect(3, -28, 2, 2.5); c.fillRect(0, -24, 4, 1);
    if (hat) drawHat(c, hat);
    c.restore();
    c.font = 'bold 10px Fredoka, sans-serif'; c.textAlign = 'center';
    c.fillStyle = me ? '#ffd23f' : '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(name, x, y - 37); c.fillText(name, x, y - 37);
    if (me) { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x - 5, y - 52); c.lineTo(x + 5, y - 52); c.lineTo(x, y - 46); c.fill(); }
  };
})();
