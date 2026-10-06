/* =====================================================================
   Engine-uitbreidingen: traits, vijand-eigenschappen, baas-mechanieken,
   extra effecten en abilities van de nieuwe helden
   ===================================================================== */
function rarOrdG(r) { return RARITY_ORDER.indexOf(r); }
function masteryLevel(xp) { let l = 1; for (let i = 1; i < MASTERY_XP.length; i++) if (xp >= MASTERY_XP[i]) l = i + 1; return l; }
function RULE_LABEL(r) {
  const out = [];
  if (r.maxHeroes) out.push(`max. ${r.maxHeroes} helden tegelijk`);
  if (r.maxRarity) out.push(`alleen t/m ${RARITIES[r.maxRarity].label}`);
  if (r.maxTier != null) out.push(`upgrades t/m niveau ${r.maxTier}`);
  return out.join(', ');
}

/* ---------- Eigen effect-objecten (update + draw) ---------- */
Game.prototype.addExt = function (o) { (this.ext || (this.ext = [])).push(o); return o; };
Game.prototype.updateExt = function (dt) {
  if (!this.ext || !this.ext.length) return;
  for (let i = this.ext.length - 1; i >= 0; i--) { const o = this.ext[i]; o.t = (o.t || 0) + dt; if (o.update && o.update(this, dt) === false) this.ext.splice(i, 1); else if (o.dur && o.t >= o.dur) { if (o.end) o.end(this); this.ext.splice(i, 1); } }
};
Game.prototype.drawExt = function (ctx, t, under) { if (!this.ext) return; for (const o of this.ext) if (!!o.under === under && o.draw) { ctx.save(); o.draw(this, ctx, t); ctx.restore(); } };

// Een object dat van boven valt en bij de landing iets doet
function dropFx(g, x, y, kind, dur, onLand) {
  return g.addExt({ dur, draw(g, ctx) {
    const k = clamp(this.t / dur, 0, 1), yy = lerp(y - 260, y, k * k), xx = lerp(x - 50, x, k);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 4]); circle(ctx, x, y, 22 * (1 - k) + 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.translate(xx, yy);
    if (kind === 'pumpkin') { ctx.rotate(k * 6); ctx.fillStyle = '#f97316'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 9, 7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fde047'; ctx.fillRect(-4, -2, 3, 3); ctx.fillRect(1, -2, 3, 3); }
    else if (kind === 'gift') { ctx.rotate(Math.sin(k * 10) * 0.3); ctx.fillStyle = '#dc2626'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16); ctx.fillStyle = '#facc15'; ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4); }
    else if (kind === 'comet') { ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createLinearGradient(-50, -260 * (1 - k) * 0 - 60, 0, 0); g2.addColorStop(0, 'rgba(251,146,60,0)'); g2.addColorStop(1, 'rgba(253,230,138,.9)'); ctx.strokeStyle = g2; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-40, -120); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = '#fff7c2'; circle(ctx, 0, 0, 7); ctx.fill(); }
    else if (kind === 'missile') { ctx.rotate(Math.atan2(260, 50)); ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1; rr(ctx, -9, -3, 18, 6, 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f97316'; circle(ctx, -10, 0, 3 + Math.random() * 2); ctx.fill(); }
    else if (kind === 'star') { ctx.globalCompositeOperation = 'lighter'; ctx.rotate(k * 8); drawEmblem(ctx, 'star', 16, '#fef3c7'); }
  }, end: onLand });
}
function lineFx(g, from, to, color, dur, style) {
  return g.addExt({ dur, draw(g, ctx, t) {
    const a = from(), b = to(); if (!a || !b) return; const k = this.t / dur;
    if (style === 'telegraph') { ctx.strokeStyle = rgba(color, 0.3 + k * 0.5); ctx.lineWidth = 1 + k * 4; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 60; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = rgba(color, 0.9); circle(ctx, b.x, b.y, 18 * (1 - k) + 6); ctx.stroke(); }
    else if (style === 'beam') { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(color, 1 - k); ctx.lineWidth = 12 * (1 - k) + 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.strokeStyle = rgba('#ffffff', 1 - k); ctx.lineWidth = 3; ctx.stroke(); }
    else if (style === 'tentacle') { ctx.strokeStyle = rgba(color, 1 - k * 0.5); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); const mx = (a.x + b.x) / 2 + Math.sin(t * 8) * 20, my = (a.y + b.y) / 2 + Math.cos(t * 7) * 20; ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = rgba('#f5d0fe', 0.7); ctx.stroke(); }
  } });
}
function disableHero(g, h, dur, by) { if (!h || h.temp) return; h.stunT = Math.max(h.stunT, dur); h.disabledBy = by; g.fx.burst(h.x, h.y - 8, '#ff4d5e', 10, 100, 2.5, 0.4, 'spark'); }
function heroesNear(g, x, y, R) { return g.heroes.filter(h => !h.temp && (h.x - x) ** 2 + (h.y - y) ** 2 <= R * R); }
const tickAb = (e, key, period, first, dt) => { if (e.ab[key] == null) e.ab[key] = first; e.ab[key] -= dt; if (e.ab[key] <= 0) { e.ab[key] = period; return true; } return false; };

/* ---------- Trait-procs ---------- */
Game.prototype.traitProc = function (h, e, dealt, o) {
  const P = h.trait.m.proc, col = TRAIT_FX_COLOR[P] || '#fff';
  const others = (R, n) => this.enemiesIn(e.x, e.y, R * TILE, true).filter(x => x !== e).slice(0, n || 99);
  switch (P) {
    case 'explode': { for (const x of others(0.9)) this.damage(x, dealt * 0.45, h, { noProc: true, acc: true, color: col }); this.fx.ring(e.x, e.ay, 0.9 * TILE, col, 0.3, 3); this.fx.burst(e.x, e.ay, col, 6, 120, 2.5, 0.3); break; }
    case 'void': { const list = others(2, 2); for (const x of list) { this.damage(x, dealt * 0.4, h, { noProc: true, acc: true, color: '#c084fc' }); x.shred = Math.max(x.shred, 4); } if (list.length) this.effects.push({ type: 'lightning', pts: [{ x: e.x, y: e.ay }, ...list.map(x => ({ x: x.x, y: x.ay }))], color: '#a855f7', life: 0.2, max: 0.2, w: 2 }); this.fx.burst(e.x, e.ay, '#7e22ce', 5, 70, 3, 0.4, 'glow'); break; }
    case 'nova': { for (const x of others(1.4)) { this.damage(x, dealt * 0.8, h, { noProc: true, acc: true, color: '#fde68a' }); x.burnD = Math.max(x.burnD, dealt * 0.3); x.burnT = Math.max(x.burnT, 2.5); } this.fx.ring(e.x, e.ay, 1.4 * TILE, '#fde68a', 0.35, 5); this.fx.ring(e.x, e.ay, 0.8 * TILE, '#ffffff', 0.25, 3); this.fx.burst(e.x, e.ay, '#fffbeb', 10, 200, 2.5, 0.4, 'star'); if (Math.random() < 0.3) Sfx.play('boom'); break; }
    case 'chain': { let cur = e; const hit = new Set([e]), pts = [{ x: e.x, y: e.ay }]; for (let i = 0; i < 3; i++) { let nx = null, nd = (2.2 * TILE) ** 2; for (const x of this.enemies) { if (x.dead || hit.has(x) || x.ghost) continue; const d2 = (x.x - cur.x) ** 2 + (x.y - cur.y) ** 2; if (d2 < nd) { nd = d2; nx = x; } } if (!nx) break; hit.add(nx); pts.push({ x: nx.x, y: nx.ay }); this.damage(nx, dealt * 0.6, h, { noProc: true, acc: true, color: col }); cur = nx; } if (pts.length > 1) this.effects.push({ type: 'lightning', pts, color: col, life: 0.18, max: 0.18, w: 2.5 }); break; }
    case 'multi': this.fx.burst(e.x, e.ay, col, 3, 80, 2, 0.25, 'star'); break;
    case 'hell': e.hellfire = true; this.fx.add({ type: 'glow', x: e.x + rnd(-5, 5), y: e.ay, vy: -60, size: 5, color: '#ef4444', life: 0.5, drag: 0 }); break;
    case 'freeze': if (Math.random() < 0.22) { e.stunT = Math.max(e.stunT, e.boss ? 0.35 : 1.2); this.fx.burst(e.x, e.ay, '#e0f2fe', 12, 120, 3, 0.5, 'snow'); this.floatText(e.x, e.ay - e.r - 10, 'BEVROREN', '#bae6fd', 13, 0.7); } break;
    case 'stun': if (Math.random() < 0.2) { e.stunT = Math.max(e.stunT, e.boss ? 0.3 : 1); for (const x of others(1.2, 2)) x.stunT = Math.max(x.stunT, x.boss ? 0.2 : 0.6); this.effects.push({ type: 'bolt', x: e.x, y: e.y, color: '#fde047', life: 0.25, max: 0.25, w: 1.2 }); } break;
    case 'meteor': if (Math.random() < 0.25) { const x0 = e.x, y0 = e.ay; dropFx(this, x0, y0, 'comet', 0.35, g => { g.hitArea(x0, y0, 1.2 * TILE, dealt * 1.2, h, null, { air: true, noProc: true, color: '#fb923c' }); g.fx.ring(x0, y0, 1.2 * TILE, '#f97316', 0.4, 5); g.fx.burst(x0, y0, '#fb923c', 14, 180, 3, 0.4); }); } break;
    case 'fatal': if (o.crit) { this.fx.burst(e.x, e.ay, '#facc15', 12, 200, 3, 0.4, 'star'); this.fx.ring(e.x, e.ay, 26, '#fef08a', 0.3, 3); } break;
    case 'god': if (e.boss) { this.fx.ring(e.x, e.ay, 34, '#fef3c7', 0.4, 4); this.fx.burst(e.x, e.ay, '#fffbeb', 6, 140, 2.5, 0.4, 'star'); } break;
  }
};
Game.prototype.drawTraitSigil = function (ctx, h, t) {
  const T = h.trait, ultra = T.rarity === 'ultra', col = TRAIT_FX_COLOR[T.m.proc] || RARITIES[T.rarity].color;
  ctx.save(); ctx.translate(h.x, h.y + 12); ctx.scale(1, 0.38);
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 10;
  circle(ctx, 0, 0, 22); ctx.stroke();
  if (ultra) { ctx.rotate(t * 1.2); circle(ctx, 0, 0, 27); ctx.stroke(); for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(27, 0); ctx.stroke(); ctx.fillStyle = rgba(col, 0.8); circle(ctx, 30, 0, 1.8); ctx.fill(); } }
  else { ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 20; circle(ctx, 0, 0, 26); ctx.stroke(); }
  ctx.restore();
};

/* ---------- Vijand-eigenschappen ---------- */
Game.prototype.enemyTraits = function (e, dt) {
  const E = e.E;
  if (E.ghostPhase) { e.gT -= dt; if (e.gT <= 0) { e.ghost = !e.ghost; e.gT = e.ghost ? 1.4 : 3; } }
  if (E.blink) { e.bT -= dt; if (e.bT <= 0) { e.bT = 4; this.fx.burst(e.x, e.ay, '#6d28d9', 10, 90, 3, 0.4, 'smoke'); e.d += 1.5 * TILE; } }
  if (E.regenShield && tickAb(e, 'rs', 5, 5, dt) && e.shield < e.maxShield) { e.shield = e.maxShield; this.fx.ring(e.x, e.ay, e.r * 1.6, '#94a3b8', 0.4, 3); }
  if (E.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * E.regen * dt);
};
Game.prototype.onEnemyDeath = function (e, h) {
  const E = e.E;
  if (E.onDeath === 'freeze') { for (const hh of heroesNear(this, e.x, e.y, 1.4 * TILE)) disableHero(this, hh, 1.2, 'ijs'); this.fx.ring(e.x, e.y, 1.4 * TILE, '#bae6fd', 0.5, 4); this.fx.burst(e.x, e.y, '#e0f2fe', 14, 140, 3, 0.5, 'snow'); }
  if (E.onDeath === 'confetti') { const c = Math.round(8 * this.M.cash); this.cash += c; this.fx.burst(e.x, e.ay, '#f472b6', 10, 160, 3, 0.6); this.fx.burst(e.x, e.ay, '#fbbf24', 10, 160, 3, 0.6); this.fx.add({ type: 'text', x: e.x, y: e.ay - 24, vy: -40, text: `+$${c}`, size: 13, color: '#fbbf24', life: 0.8 }); }
  if (E.hydra) { for (const off of [-12, 10]) { const k = this.spawnEnemy('hydrakop', e.d + off, e.wave); k.hp = k.maxHp = e.maxHp * 0.3; } this.banner('Twee nieuwe koppen!', 'De Hydra groeit terug', '#16a34a'); }
  if (e.hellfire) for (const x of this.enemiesIn(e.x, e.y, 1.5 * TILE, true)) { x.hellfire = true; x.burnD = Math.max(x.burnD, e.maxHp * 0.04 + 10); x.burnT = Math.max(x.burnT, 3); this.fx.add({ type: 'glow', x: x.x, y: x.ay, vy: -40, size: 6, color: '#ef4444', life: 0.5 }); }
};

/* ---------- Baas-mechanieken ---------- */
const BOSS_AB = {
  pumpkins(g, e, dt) { if (!tickAb(e, 'pk', 6, 3, dt)) return; for (let i = 0; i < 3; i++) { const d = e.d + 50 + i * 40, p = g.posAt(d); dropFx(g, p.x, p.y, 'pumpkin', 0.6, gg => { gg.spawnEnemy('spook', d, e.wave); gg.fx.burst(p.x, p.y, '#f97316', 14, 140, 3, 0.5); }); } g.floatText(e.x, e.y - 50, 'Pompoenen!', '#f97316', 16, 1); },
  teleport(g, e, dt) { if (!tickAb(e, 'tp', 7, 5, dt)) return; g.fx.burst(e.x, e.ay, '#a855f7', 24, 160, 4, 0.5, 'smoke'); e.d += (e.E.raidBoss ? 0.8 : 1.6) * TILE; const p = g.posAtL(e.lane, e.d); g.fx.burst(p.x, p.y, '#e9d5ff', 20, 160, 3, 0.5, 'glow'); Sfx.play('void'); },
  freezeheroes(g, e, dt) { if (!tickAb(e, 'fz', 8, 4, dt)) return; const R = 3 * TILE; for (const h of heroesNear(g, e.x, e.y, R)) disableHero(g, h, 2.2, 'ijs'); g.fx.ring(e.x, e.y, R, '#bae6fd', 0.7, 6); for (let i = 0; i < 30; i++) { const a = rnd(0, TAU), r = rnd(0, R); g.fx.add({ type: 'snow', x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, vy: 20, size: 3, color: '#e0f2fe', life: 0.9 }); } g.floatText(e.x, e.y - 50, 'IJSSTORM!', '#bae6fd', 18, 1); Sfx.play('freeze'); },
  summonSnow(g, e, dt) { if (!tickAb(e, 'ss', 9, 6, dt)) return; for (let i = 0; i < 2; i++) g.spawnEnemy('sneeuwman', Math.max(0, e.d - 20 - i * 20), e.wave); },
  submerge(g, e, dt) { if (!tickAb(e, 'sm', 10, 6, dt)) return; e.invulnT = 2.5; g.fx.burst(e.x, e.y, '#7dd3fc', 24, 160, 3, 0.5); g.floatText(e.x, e.y - 50, 'ONDERGEDOKEN', '#7dd3fc', 16, 1); },
  summonCrab(g, e, dt) { if (!tickAb(e, 'sc', 8, 5, dt)) return; for (let i = 0; i < 3; i++) g.spawnEnemy('krab', Math.max(0, e.d - 16 - i * 16), e.wave); },
  candles(g, e, dt) { if (!tickAb(e, 'cd', 7, 4, dt)) return; for (let i = 0; i < 3; i++) g.spawnEnemy('feestbot', Math.max(0, e.d - 16 - i * 14), e.wave); g.fx.burst(e.x, e.y - e.r, '#fde047', 20, 160, 3, 0.5, 'glow'); },
  healpulse(g, e, dt) { if (!tickAb(e, 'hp', 9, 7, dt)) return; const amt = e.maxHp * (e.E.raidBoss ? 0.03 : 0.06); e.hp = Math.min(e.maxHp, e.hp + amt); g.fx.ring(e.x, e.y, 60, '#34d399', 0.6, 5); g.floatText(e.x, e.y - 50, `+${fmt(amt)}`, '#34d399', 18, 1); },
  laser(g, e, dt) {
    if (!tickAb(e, 'lz', e.E.raidBoss ? 6 : 7, 4, dt)) return;
    const hs = g.heroes.filter(h => !h.temp).sort((a, b) => b.dmg - a.dmg); const h = hs[Math.floor(Math.random() * Math.min(2, hs.length))]; if (!h) return;
    const from = () => (e.dead ? null : { x: e.x, y: e.ay - e.r * 0.5 }), to = () => ({ x: h.x, y: h.y - 8 });
    lineFx(g, from, to, '#ef4444', 1, 'telegraph');
    g.after(1, () => { if (e.dead || !g.heroes.includes(h)) return; lineFx(g, from, to, '#ef4444', 0.35, 'beam'); disableHero(g, h, 3, 'laser'); g.shake(4); Sfx.play('laser'); });
  },
  mirror(g, e, dt) {
    const f = e.hp / e.maxHp; e.ab.mi = e.ab.mi || 0;
    if ((e.ab.mi === 0 && f < 0.66) || (e.ab.mi === 1 && f < 0.33)) { e.ab.mi++; for (const off of [-24, 14]) { const d = g.spawnEnemy('spiegelbeeld', Math.max(0, e.d + off), e.wave); d.hp = d.maxHp = e.maxHp * 0.12; } g.banner('Spiegelbeelden!', 'Welke is de echte?', '#c7d2fe'); g.flash = { color: '#e0e7ff', life: 0.3, max: 0.3 }; Sfx.play('void'); }
  },
  rockshield(g, e, dt) {
    if (tickAb(e, 'rk', 14, 0.5, dt) && !g.enemies.some(o => o.type === 'rotsschild' && !o.dead)) { for (let i = 0; i < 3; i++) { const r = g.spawnEnemy('rotsschild', Math.max(0, e.d - 20 - i * 22), e.wave); r.hp = r.maxHp = e.maxHp * 0.04; } g.floatText(e.x, e.y - 60, 'ROTSSCHILDEN!', '#fbbf24', 18, 1.2); g.shake(5); }
    e.dmgRed = g.enemies.some(o => o.type === 'rotsschild' && !o.dead) ? 0.6 : 0;
  },
  enrage(g, e) { if (!e.enraged && e.hp < e.maxHp * 0.3) { e.enraged = true; g.banner('WOEDEND!', `${e.E.name} wordt sneller`, '#ef4444'); g.shake(10); Sfx.play('boss'); } },
  grab(g, e, dt) {
    if (!tickAb(e, 'gr', 6, 3, dt)) return;
    const hs = heroesNear(g, e.x, e.y, 5 * TILE).sort(() => Math.random() - 0.5).slice(0, e.E.worldBoss ? 3 : 2);
    for (const h of hs) { lineFx(g, () => (e.dead ? null : { x: e.x, y: e.ay }), () => ({ x: h.x, y: h.y - 6 }), e.E.color, 2.5, 'tentacle'); disableHero(g, h, 2.5, 'tentakel'); }
    if (hs.length) { g.floatText(e.x, e.y - 60, 'GEGREPEN!', '#e9d5ff', 16, 1); Sfx.play('void'); }
  },
  hitshield(g, e, dt) { if (!tickAb(e, 'hs', 12, 2, dt)) return; e.hitShield = Math.round(14 * Math.sqrt(g.raidDiff ? g.raidDiff.hp : 1)); g.floatText(e.x, e.y - 60, 'ENERGIESCHILD', '#38bdf8', 18, 1.2); Sfx.play('shield'); },
  barrage(g, e, dt) {
    if (!tickAb(e, 'bg', 8, 5, dt)) return;
    const hs = g.heroes.filter(h => !h.temp).sort(() => Math.random() - 0.5).slice(0, 3);
    for (const h of hs) dropFx(g, h.x, h.y, 'missile', 0.6, gg => { disableHero(gg, h, 1.5, 'raket'); gg.fx.burst(h.x, h.y, '#f97316', 16, 160, 3, 0.4); gg.fx.ring(h.x, h.y, 30, '#fb923c', 0.3, 4); Sfx.play('boom'); });
  },
  repair(g, e, dt) { if (!tickAb(e, 'rp', 10, 6, dt)) return; for (let i = 0; i < 2; i++) g.spawnEnemy('healer', Math.max(0, e.d - 16 - i * 16), e.wave); },
  regen(g, e, dt) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01 * dt); },
  rewind(g, e, dt) {
    e.ab.hT = (e.ab.hT || 0) - dt; if (e.ab.hT <= 0) { e.ab.hT = 1; e.hist.push(e.hp); if (e.hist.length > 6) e.hist.shift(); }
    if (e.rewindT > 0) e.rewindT -= dt;
    if (tickAb(e, 'rw', 9, 8, dt) && e.hist.length >= 4) { const old = e.hist[e.hist.length - 4]; if (old > e.hp) { g.floatText(e.x, e.y - 55, `TERUGGESPOELD +${fmt(old - e.hp)}`, '#eab308', 16, 1.2); e.hp = old; e.rewindT = 1; g.fx.ring(e.x, e.y, 70, '#eab308', 0.7, 5); Sfx.play('void'); } }
  },
  dash(g, e, dt) { if (tickAb(e, 'ds', 6, 4, dt)) { e.dashT = 1; g.fx.burst(e.x, e.ay, '#fde047', 16, 160, 3, 0.4, 'spark'); } if (e.dashT > 0) g.fx.add({ type: 'glow', x: e.x, y: e.ay, size: 6, color: e.E.color, life: 0.3 }); },
  phases2(g, e) {
    const f = e.hp / e.maxHp; e.ab.ph = e.ab.ph || 0;
    if ((e.ab.ph === 0 && f < 0.66) || (e.ab.ph === 1 && f < 0.33)) { e.ab.ph++; e.shield = e.maxHp * 0.2; e.maxShield = e.shield; for (let i = 0; i < 4; i++) g.spawnEnemy('shield', Math.max(0, e.d - 20 - i * 18), e.wave); g.banner(`Fase ${e.ab.ph + 1}`, `${e.E.name} krijgt een schild!`, e.E.color); g.shake(10); Sfx.play('void'); }
  },
  summon2(g, e, dt) { if (!tickAb(e, 's2', 6, 4, dt)) return; const t = ['grunt', 'runner', 'tank']; for (let i = 0; i < 3; i++) g.spawnEnemy(t[i], Math.max(0, e.d - 14 - i * 16), e.wave); },
  summonShade(g, e, dt) { if (!tickAb(e, 'sh', 7, 4, dt)) return; for (let i = 0; i < 3; i++) g.spawnEnemy('schim', Math.max(0, e.d - 14 - i * 16), e.wave); },
  summonMix(g, e, dt) { if (!tickAb(e, 'mx', 5, 2, dt)) return; const p = g.map.pool; for (let i = 0; i < 4 + Math.floor(g.time / 40); i++) g.spawnEnemy(p[Math.floor(Math.random() * p.length)], -10 - i * 18, 3 + Math.floor(g.time / 15)); },
};

/* Co-op balk: gedeelde HP van de wereldbaas */
Game.prototype.drawCoopBar = function (ctx) {
  const w = 460, x = GW / 2 - w / 2, y = 14, left = Math.max(0, this.coopPoolStart - this.coopDmg), f = left / COOP.hp;
  ctx.fillStyle = 'rgba(5,4,13,.85)'; rr(ctx, x - 8, y - 6, w + 16, 46, 6); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = "13px Bungee, Impact, sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Omega-Leviathan · gedeelde HP', x, y - 2);
  ctx.textAlign = 'right'; ctx.font = "700 14px 'Barlow Condensed', sans-serif"; ctx.fillText(`${fmt(left)} / ${fmt(COOP.hp)}`, x + w, y - 1);
  ctx.fillStyle = '#062a2a'; ctx.fillRect(x, y + 16, w, 12); ctx.fillStyle = '#2dd4bf'; ctx.fillRect(x, y + 16, w * clamp(f, 0, 1), 12);
  ctx.fillStyle = '#fde68a'; ctx.textAlign = 'left'; ctx.font = "700 13px 'Barlow Condensed', sans-serif"; ctx.fillText(`Jouw schade deze run: ${fmt(this.coopDmg)}`, x, y + 30);
  ctx.textAlign = 'right'; ctx.fillText(`Tijd: ${Math.ceil(this.coopTime)}s`, x + w, y + 30);
};

/* Extra projectielen en strike-varianten */
const _drawProj = Game.prototype.drawProj;
Game.prototype.drawProj = function (ctx, p, t) {
  if (p.kind === 'pumpkin') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.5); ctx.fillStyle = '#f97316'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, 0, 7, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fde047'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2); ctx.restore(); return; }
  if (p.kind === 'snowball') { ctx.save(); ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; circle(ctx, p.x, p.y, 5); ctx.fill(); ctx.stroke(); ctx.restore(); return; }
  _drawProj.call(this, ctx, p, t);
};

/* ---------- Abilities van de nieuwe helden ---------- */
Object.assign(ABILITY_FX, {
  hexcurse(g, h, ult) {
    const list = ult ? g.enemies.filter(e => !e.dead) : g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.5, true);
    for (const e of list) { e.vulnT = ult ? 8 : 6; e.vulnM = ult ? 0.75 : 0.5; g.fx.burst(e.x, e.ay, '#a3e635', 6, 80, 3, 0.6, 'glow'); }
    g.effects.push({ type: 'tint', color: '#4c1d95', alpha: 0.35, life: 0.8, max: 0.8 }); g.fx.ring(h.x, h.y, h.st.range * TILE * 1.5, '#a3e635', 0.6, 5); Sfx.play('void');
  },
  giftdrop(g, h, ult) {
    const n = ult ? 12 : 6, R = h.st.range * TILE * 1.6;
    for (let i = 0; i < n; i++) g.after(i * 0.12, () => { const list = g.enemiesIn(h.x, h.y, R, true); const e = list[Math.floor(Math.random() * list.length)]; const x = e ? e.x : h.x + rnd(-60, 60), y = e ? e.ay : h.y + rnd(-60, 60);
      dropFx(g, x, y, 'gift', 0.45, gg => { gg.hitArea(x, y, 1.2 * TILE, h.st.dmg * (ult ? 6 : 4), h, h.st, { air: true }); gg.fx.burst(x, y, '#dc2626', 10, 160, 3, 0.4); gg.fx.burst(x, y, '#facc15', 10, 160, 3, 0.4, 'star'); const c = Math.round(10 * (0.5 + 0.5 * gg.map.hpMult)); gg.cash += c; gg.fx.add({ type: 'text', x, y: y - 20, vy: -40, text: `+$${c}`, size: 13, color: '#facc15', life: 0.8 }); Sfx.play('coin'); }); });
  },
  tsunami(g, h, ult) {
    const waves = ult ? 2 : 1;
    for (let w = 0; w < waves; w++) g.after(w * 0.8, () => {
      const start = Math.max(g.nearestD(h.x, h.y) + 120, ...g.enemies.filter(e => !e.dead).map(e => e.d + 40), 200);
      const hit = new Set();
      g.addExt({ d: start, update(gg, dt) { this.d -= 7 * TILE * dt; const p = gg.posAt(this.d); this.p = p;
          for (const e of gg.enemiesIn(p.x, p.y, 1.2 * TILE, false)) if (!hit.has(e)) { hit.add(e); gg.damage(e, h.st.dmg * (ult ? 5 : 3), h, { color: '#67e8f9' }); if (!e.dead) e.d = Math.max(-20, e.d - (e.boss ? 0.8 : 3) * TILE); }
          if (Math.random() < 0.8) gg.fx.add({ type: 'bubble', x: p.x + rnd(-18, 18), y: p.y + rnd(-20, 10), vy: -40, size: rnd(2, 4), color: '#a5f3fc', life: 0.6 });
          return this.d > -30; },
        draw(gg, ctx, t) { if (!this.p) return; ctx.translate(this.p.x, this.p.y); ctx.rotate(this.p.ang + Math.PI); const g2 = ctx.createLinearGradient(-30, 0, 20, 0); g2.addColorStop(0, 'rgba(14,165,233,0)'); g2.addColorStop(1, 'rgba(165,243,252,.9)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-40, -22); ctx.quadraticCurveTo(20, -34 + Math.sin(t * 10) * 4, 22, 0); ctx.quadraticCurveTo(20, 34, -40, 22); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#f0f9ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, -24); ctx.quadraticCurveTo(26, 0, 12, 24); ctx.stroke(); } });
      Sfx.play('freeze'); g.shake(6);
    });
  },
  party(g, h, ult) {
    const R = h.st.range * TILE * 1.5;
    for (const e of g.enemiesIn(h.x, h.y, R, true)) e.stunT = Math.max(e.stunT, (ult ? 3 : 2) * (e.boss ? 0.25 : 1));
    for (const o of g.heroes) o.buffs.push({ rateMul: ult ? 1.6 : 1.3, t: 6 });
    for (let i = 0; i < (ult ? 90 : 50); i++) g.fx.add({ type: 'dot', x: h.x + rnd(-R, R), y: h.y - rnd(40, 160), vy: rnd(40, 120), vx: rnd(-20, 20), size: 4, color: ['#f472b6', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa'][i % 5], life: 1.4, drag: 0 });
    g.addExt({ dur: ult ? 3 : 2, under: true, draw(gg, ctx, t) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const a = t * 2 + i * TAU / 5; ctx.fillStyle = ['rgba(244,114,182,.18)', 'rgba(251,191,36,.18)', 'rgba(96,165,250,.18)', 'rgba(52,211,153,.18)', 'rgba(167,139,250,.18)'][i]; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, R, a, a + 0.5); ctx.closePath(); ctx.fill(); } } });
    g.floatText(h.x, h.y - 50, 'FEEST!', '#fbbf24', 22, 1.2); Sfx.play('win');
  },
  cometfall(g, h, ult) {
    const n = ult ? 20 : 10, R = h.st.range * TILE * 1.6;
    for (let i = 0; i < n; i++) g.after(i * 0.1, () => { const list = g.enemiesIn(h.x, h.y, R, true); const e = list[Math.floor(Math.random() * list.length)]; const x = e ? e.x : h.x + rnd(-80, 80), y = e ? e.y : h.y + rnd(-80, 80);
      dropFx(g, x, y, 'comet', 0.4, gg => { gg.hitArea(x, y, 1.3 * TILE, h.st.dmg * 2, h, h.st, { air: true }); gg.fx.ring(x, y, 1.3 * TILE, '#fb923c', 0.4, 5); gg.fx.burst(x, y, '#fde68a', 16, 200, 3, 0.5, 'glow'); gg.shake(2); Sfx.play('boom'); }); });
  },
  titanfall(g, h, ult) {
    const R = (h.st.range + 2) * TILE * (ult ? 1.3 : 1);
    h.pulse = 1; g.after(0.35, () => {
      for (const e of g.enemiesIn(h.x, h.y, R, true)) { g.damage(e, h.st.dmg * (ult ? 10 : 6) * (e.boss ? 2 : 1), h, { color: '#f59e0b' }); if (!e.dead) e.stunT = Math.max(e.stunT, e.boss ? 0.4 : 1); }
      for (let i = 0; i < 3; i++) g.after(i * 0.08, () => g.fx.ring(h.x, h.y, R * (0.5 + i * 0.25), i ? '#f59e0b' : '#ffffff', 0.5, 8));
      g.fx.burst(h.x, h.y + 10, '#78716c', 50, 300, 6, 0.8, 'smoke'); g.shake(ult ? 18 : 12); Sfx.play('bigboom');
    });
  },
  valkyrieride(g, h, ult) {
    const list = g.enemies.filter(e => !e.dead);
    list.forEach((e, i) => g.after(i * 0.03, () => { if (e.dead) return; g.damage(e, h.st.dmg * (ult ? 5 : 3) * (e.boss ? 2 : 1), h, { color: '#e0f2fe' }); if (!e.dead) e.stunT = Math.max(e.stunT, e.boss ? 0.3 : 0.8); g.effects.push({ type: 'bolt', x: e.x, y: e.y, color: '#e0f2fe', life: 0.3, max: 0.3, w: 1.4 }); }));
    g.effects.push({ type: 'tint', color: '#0c4a6e', alpha: 0.4, life: 1, max: 1 }); g.shake(10); Sfx.play('strike');
  },
  championroar(g, h, ult) {
    for (const o of g.heroes) { o.buffs.push({ rateMul: ult ? 1.7 : 1.4, t: 6 }); g.fx.ring(o.x, o.y, 26, '#fef08a', 0.5, 4); }
    for (let i = 0; i < (ult ? 16 : 10); i++) g.after(i * 0.08, () => { const list = g.enemies.filter(e => !e.dead && !e.ghost); const e = list[Math.floor(Math.random() * list.length)]; if (e) g.fireProjectile(h, e, h.st, 0, { dmg: h.st.dmg * 2, kind: 'star' }); });
    g.floatText(h.x, h.y - 50, 'KAMPIOEN!', '#fef08a', 20, 1.2); Sfx.play('wave');
  },
});
