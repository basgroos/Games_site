// =============================================================
//  HUD — health, Resonance, boss bar, score, combo, beat counter,
//  big announcements.
// =============================================================
PS.HUD = {
  draw(ctx, g) {
    const U = PS.U, C = PS.CONFIG, pal = PS.Profile.palette();
    const W = g.W, H = g.H, p = g.player, b = g.boss;
    ctx.save();
    ctx.textBaseline = 'middle';

    // ---- player HP ----
    for (let i = 0; i < p.maxHp; i++) {
      const x = 52 + i * 24, y = 48;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      if (i < p.hp) {
        ctx.fillStyle = p.hp === 1 ? (Math.floor(g.realTime * 6) % 2 ? C.hazardColors.danger : '#ffffff') : pal.player;
        ctx.fillRect(-7, -7, 14, 14);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
        ctx.strokeRect(-6, -6, 12, 12);
      }
      ctx.restore();
    }

    // ---- co-op partner ----
    if (g.coop && PS.Net.remote) {
      const Rm = PS.Net.remote;
      ctx.font = '700 11px ' + PS.FONT; ctx.textAlign = 'left';
      ctx.fillStyle = pal.accent;
      ctx.fillText((Rm.alive === false ? '✕ ' : '') + PS.Net.partnerName().toUpperCase() + '  ' + (Rm.hp || 0) + '/' + (Rm.maxHp || 0) + '  ·  DEATHLINK', 42, 112);
    }

    // ---- Resonance ----
    const R = C.resonance, bx = 42, by = 70, bw = 230, bh = 10;
    const ready = g.res >= R.breakCost;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = C.hazardColors.breakable;
    ctx.globalAlpha = ready ? 0.75 + 0.25 * Math.sin(g.realTime * 10) : 0.7;
    ctx.fillRect(bx, by, (bw * g.res) / R.max, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(bx + (bw * R.breakCost) / R.max - 1, by - 2, 3, bh + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.font = '700 11px ' + PS.FONT; ctx.textAlign = 'left';
    ctx.fillStyle = ready ? C.hazardColors.breakable : 'rgba(255,255,255,0.5)';
    ctx.fillText(ready ? 'RESONANCE — BREAK READY [L / C / E]' : 'RESONANCE', bx, by + 22);

    // ---- boss bar ----
    const cx = W / 2;
    ctx.textAlign = 'center';
    ctx.font = '800 15px ' + PS.FONT;
    ctx.fillStyle = pal.ui;
    if (b.isSurvival) {
      ctx.fillText('SURVIVAL — LEVEL ' + b.level, cx, 36);
      ctx.font = '700 22px ' + PS.MONO;
      ctx.fillText(U.formatTime(g.stats.time), cx, 62);
      if (g.bestTime > 0) {
        const beat = g.stats.time > g.bestTime;
        ctx.font = '700 12px ' + PS.FONT;
        ctx.fillStyle = beat ? '#ffe27a' : 'rgba(255,255,255,0.5)';
        ctx.fillText(beat ? 'NEW BEST TIME!' : 'BEST ' + U.formatTime(g.bestTime) + '  ·  ' + Math.floor((g.stats.time / g.bestTime) * 100) + '% of best', cx, 84);
      }
    } else {
      ctx.fillText(b.name, cx, 34);
      const w = 520, x0 = cx - w / 2, y0 = 48;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x0, y0, w, 10);
      ctx.fillStyle = b.flash > 0.3 ? '#ffffff' : pal.boss;
      ctx.fillRect(x0, y0, (w * b.hp) / b.maxHp, 10);
      ctx.fillStyle = pal.bg;
      for (const t of b.thresholds) ctx.fillRect(x0 + w * t - 1, y0 - 3, 3, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(x0, y0, w, 10);
      // gold mark = how far your best attempt got
      if (!b.isDummy && g.bestPct > 0 && g.bestPct < 100 && g.opts.mode !== 'rush') {
        const bx2 = x0 + w * (1 - g.bestPct / 100);
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath(); ctx.moveTo(bx2, y0 - 2); ctx.lineTo(bx2 - 5, y0 - 9); ctx.lineTo(bx2 + 5, y0 - 9); ctx.closePath(); ctx.fill();
        ctx.fillRect(bx2 - 1, y0 - 2, 2, 14);
      }
      if (!b.isDummy) { // % done and % of best
        const pct = g.progressPct(), best = g.bestPct || 0, newBest = pct > best && best > 0;
        ctx.textAlign = 'right';
        ctx.font = '800 14px ' + PS.MONO;
        ctx.fillStyle = pal.ui;
        ctx.fillText(pct + '%', x0 - 12, y0 + 5);
        ctx.textAlign = 'left';
        ctx.font = '700 12px ' + PS.FONT;
        ctx.fillStyle = newBest ? '#ffe27a' : 'rgba(255,255,255,0.5)';
        ctx.fillText(newBest ? 'NEW BEST!' : best > 0 ? 'BEST ' + best + '%' : 'FIRST TRY', x0 + w + 12, y0 + 5);
        ctx.textAlign = 'center';
      }
      if (b.shielded) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(g.realTime * 10)).toFixed(2) + ')';
        ctx.font = '700 11px ' + PS.FONT;
        ctx.fillText('SHIELDED — PHASE CHANGE', cx, y0 + 24);
      } else if (!b.isDummy) {
        ctx.font = '600 11px ' + PS.FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(b.phaseNames[b.phase] + (g.opts.mode === 'rush' ? '   ·   BOSS ' + (g.rushIndex + 1) + '/3' : ''), cx, y0 + 24);
      }
    }

    // ---- score & combo ----
    ctx.textAlign = 'right';
    ctx.font = '700 26px ' + PS.MONO;
    ctx.fillStyle = pal.ui;
    ctx.fillText(String(g.stats.score).padStart(7, '0'), W - 44, 46);
    const mult = g.comboMult();
    ctx.font = '700 13px ' + PS.FONT;
    ctx.fillStyle = mult > 1 ? pal.accent : 'rgba(255,255,255,0.5)';
    ctx.fillText('COMBO ' + g.stats.combo + '   ×' + mult.toFixed(1), W - 44, 72);
    if (g.scoreMult !== 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 11px ' + PS.FONT;
      ctx.fillText('score ×' + g.scoreMult.toFixed(2) + ' (difficulty/mods)', W - 44, 90);
    }

    // ---- beat counter ----
    const beat = U.mod(Math.floor(g.clock.beat), 4);
    for (let i = 0; i < 4; i++) {
      const on = i === beat;
      ctx.fillStyle = on ? pal.accent : 'rgba(255,255,255,0.18)';
      const s = on ? 7 + g.clock.pulse * 4 : 5;
      ctx.save(); ctx.translate(W / 2 - 36 + i * 24, H - 42); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore();
    }
    ctx.textAlign = 'center'; ctx.font = '600 10px ' + PS.MONO; ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(Math.round(g.clock.bpm) + ' BPM', W / 2 + 76, H - 42);

    ctx.textAlign = 'left'; ctx.font = '600 11px ' + PS.FONT; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('ESC — pause', 42, H - 42);

    // ---- announcement ----
    const a = g.announcement;
    if (a) {
      const t = a.t, inA = Math.min(1, t / 0.15), outA = Math.min(1, (a.life - t) / 0.4);
      const al = Math.max(0, Math.min(inA, outA));
      ctx.textAlign = 'center';
      ctx.globalAlpha = al;
      ctx.font = '900 ' + Math.round(42 + (1 - inA) * 20) + 'px ' + PS.FONT;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(a.title, W / 2 + 3, H / 2 - 207);
      ctx.fillStyle = pal.ui;
      ctx.fillText(a.title, W / 2, H / 2 - 210);
      if (a.sub) {
        ctx.font = '600 17px ' + PS.FONT;
        ctx.fillStyle = pal.accent;
        ctx.fillText(a.sub, W / 2, H / 2 - 172);
      }
      ctx.globalAlpha = 1;
    }

    if (g.tutorial) g.tutorial.draw(ctx);
    ctx.restore();
  }
};
