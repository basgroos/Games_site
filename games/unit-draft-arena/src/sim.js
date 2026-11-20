// ===================== SIMULATION (no DOM) =====================
const AW = 12, AH = 6;            // arena size in cells
const ZONE = [[0, 3], [8, 11]];   // deploy columns per team
const MAX_TIME = 120, SUDDEN = 80;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const radOf = u => 0.3 * u.size;
const tierOf = def => RAR[def.rar].tier;

// ---------- synergies ----------
function computeSynergies(defs) {
  const counts = {};
  for (const d of defs) for (const t of d.tags) counts[t] = (counts[t] || 0) + 1;
  const active = [];
  for (const s of SYNERGIES) {
    const c = counts[s.tag] || 0; let lvl = 0;
    s.levels.forEach((l, i) => { if (c >= l.n) lvl = i + 1; });
    if (lvl) active.push({ syn: s, lvl, count: c });
  }
  return { counts, active };
}

// ---------- units ----------
function newUnit(B, def, team, x, y, opts = {}) {
  const u = {
    uid: B.seq++, def, team: team.idx, x, y, size: def.size || 1, alive: true, pending: false,
    hpM: 0, dmgM: 0, asM: 0, msM: 0, rngA: 0, crit: def.crit || 0, critMul: def.critMul || 2, ls: def.ls || 0, dr: def.dr || 0,
    regen: 0, splashA: 0, cc: !!def.cc, thorns: 0, fire: 0, poison: 0, soul: false,
    st: freshStatus(), atkCd: rnd(0.2, 0.6), target: null, retarget: 0, spCd: def.spCd0 || 9, shots: 0, first: true, jumped: false,
    summon: !!opts.summon, lifeT: opts.lifeT || 0, raised: false, rebirthUsed: false, soulUsed: false,
    stats: { dmg: 0, heal: 0, kills: 0 }, dotAcc: 0, healAcc: 0, accT: 0, auraAs: 0, auraRegen: 0,
    anim: { atk: 0, flash: 0, face: team.idx === 0 ? 1 : -1, walk: Math.random() * 6, moving: false, cast: 0, deathT: 0, spawn: 0 },
  };
  B.units.push(u);
  return u;
}
function freshStatus() {
  return { stun: 0, freeze: 0, slow: 0, slowAmt: 0, burn: 0, burnDps: 0, burnSrc: null, poison: 0, poisonDps: 0, poisonSrc: null,
    antiheal: 0, shield: 0, shieldT: 0, curse: 0, rage: 0, inv: 0, blood: 0, warp: 0 };
}
function finalize(u) {
  const d = u.def;
  u.maxHp = Math.round(d.hp * (1 + u.hpM));
  u.hp = u.maxHp; u.dispHp = u.hp; u.lagHp = u.hp;
  u.dmg = d.dmg * (1 + u.dmgM);
  u.heal = (d.heal || 0) * (1 + u.dmgM);
  u.as = d.as * (1 + u.asM);
  u.ms = d.ms * (1 + u.msM);
  u.rng = d.rng + (d.role !== 'melee' ? u.rngA : 0);
  u.splash = d.splash ? d.splash + u.splashA : 0;
}

// ---------- battle creation ----------
// side = { units:[{def,cx,cy}], buffs:[{def,target(index into units)}], abilities:[def], coins, ai, level }
function createBattle(sides) {
  const B = { time: 0, seq: 1, units: [], proj: [], zones: [], delayed: [], fx: [], teams: [], alive: [[], []], over: false, winner: null, shake: 0, endT: 0 };
  sides.forEach((s, i) => {
    const T = { idx: i, ai: !!s.ai, level: s.level || 'normal', abilities: s.abilities.map(def => ({ def, cd: 3, uses: 0 })), fallen: [],
      dr: 0, healM: 0, martyr: false, martyrStacks: 0, aiT: rnd(0.5, 1.5), coins: s.coins || 0,
      syn: computeSynergies(s.units.map(p => p.def)), buffs: s.buffs };
    B.teams.push(T);
    const made = s.units.map(p => newUnit(B, p.def, T, p.cx + 0.5, p.cy + 0.5));
    for (const a of T.syn.active) { const L = a.syn.levels[a.lvl - 1]; made.forEach(u => L.f(u, T)); if (L.tf) L.tf(T); }
    for (const b of s.buffs) {
      if (b.def.target === 'team') { made.forEach(u => b.def.apply(u, T)); if (b.def.teamApply) b.def.teamApply(T); }
      else { const tu = made[b.target != null && made[b.target] ? b.target : bestUnitIndex(s.units.map(p => p.def))]; if (tu) b.def.apply(tu, T); }
    }
    const sv = Math.min(SAVINGS_MAX, (s.coins || 0) * SAVINGS_PER_EURO);
    made.forEach(u => { u.hpM += sv; u.dmgM += sv; finalize(u); });
  });
  refreshAlive(B);
  return B;
}
function bestUnitIndex(defs) {
  let bi = 0, bv = -1;
  defs.forEach((d, i) => { const v = d.hp * 0.05 + d.dmg * d.as + tierOf(d) * 30 + (d.role === 'healer' ? -40 : 0); if (v > bv) { bv = v; bi = i; } });
  return bi;
}
function refreshAlive(B) { B.alive[0] = []; B.alive[1] = []; for (const u of B.units) if (u.alive) B.alive[u.team].push(u); }

// ---------- fx helpers (consumed by renderer; ignored headless) ----------
function fx(B, o) { if (B.fx.length < 600) B.fx.push(o); }
function fxText(B, u, text, color, size = 14) { fx(B, { type: 'text', x: u.x + rnd(-0.15, 0.15), y: u.y - 0.55 * u.size, text, color, size }); }

// ---------- stat multipliers ----------
function hpFrac(u) { return u.hp / u.maxHp; }
function dmgMult(B, u) {
  const T = B.teams[u.team];
  let m = 1 + (u.auraDmg || 0) + (u.st.rage > 0 ? 0.5 : 0) + (u.st.blood > 0 ? 0.2 : 0) + T.martyrStacks * 0.1;
  if (u.def.sp === 'bloodlust') m += (1 - hpFrac(u)) * 1.0;
  if (u.def.sp === 'together') { let c = 0; for (const v of B.alive[u.team]) if (v !== u && hasT(v, 'Volk')) c++; m += Math.min(0.3, c * 0.06); }
  return m;
}
function asMult(B, u) {
  const T = B.teams[u.team];
  let m = 1 + u.auraAs + (u.st.rage > 0 ? 0.25 : 0) + T.martyrStacks * 0.1;
  if (u.def.sp === 'bloodlust') m += (1 - hpFrac(u)) * 0.5;
  if (u.def.sp === 'pack') { let c = 0; for (const v of B.alive[u.team]) if (v !== u && hasT(v, 'Beest')) c++; m += Math.min(0.36, c * 0.12); }
  if (u.st.warp > 0) m *= 0.5;
  if (u.st.slow > 0) m *= 1 - u.st.slowAmt * 0.6;
  return m;
}
function msMult(B, u) {
  let m = 1;
  if (u.first && (u.def.sp === 'charge' || u.def.sp === 'dive')) m *= 1.6;
  if (u.st.warp > 0) m *= 0.5;
  if (u.st.slow > 0) m *= 1 - u.st.slowAmt;
  return m;
}
const isCC = u => u.st.stun > 0 || u.st.freeze > 0;

// ---------- damage & healing ----------
function dealDamage(B, src, tgt, amt, o = {}) {
  if (!tgt.alive || amt <= 0) return 0;
  if (tgt.st.inv > 0) { if (!o.dot && Math.random() < 0.4) fxText(B, tgt, 'Immuun', '#ffe9a8', 12); return 0; }
  if (o.attack && tgt.def.sp === 'dodge' && Math.random() < 0.25) { fxText(B, tgt, 'Ontweken', '#d5ffd0', 12); return 0; }
  let m = 1;
  if (tgt.st.curse > 0) m *= 1.4;
  if (!o.pierce) m *= 1 - Math.min(0.6, tgt.dr + B.teams[tgt.team].dr);
  if (o.ranged && tgt.def.sp === 'shieldwall') m *= 0.7;
  amt *= m;
  if (tgt.st.shield > 0) { const a = Math.min(tgt.st.shield, amt); tgt.st.shield -= a; amt -= a; if (amt <= 0) { if (!o.dot) fxText(B, tgt, 'Blok', '#bfe9ff', 11); return 0; } }
  tgt.hp -= amt;
  if (!o.dot) tgt.anim.flash = 0.14;
  if (src) {
    src.stats.dmg += amt;
    if (o.attack && src.alive) {
      const ls = src.ls + (src.st.blood > 0 ? 0.5 : 0);
      if (ls > 0) heal(B, src, src, amt * ls, { quiet: true });
    }
    if (o.attack && o.melee && tgt.thorns > 0 && src.alive && !o.reflect) dealDamage(B, tgt, src, amt * tgt.thorns, { reflect: true, dot: true });
  }
  if (o.dot) tgt.dotAcc += amt;
  else fxText(B, tgt, Math.round(amt) + (o.crit ? '!' : ''), o.crit ? '#ffd23f' : (o.color || '#ffffff'), o.crit ? 20 : (o.big ? 18 : 14));
  if (tgt.hp <= 0) killUnit(B, tgt, src);
  return amt;
}
function heal(B, src, tgt, amt, o = {}) {
  if (!tgt.alive || amt <= 0) return 0;
  amt *= 1 + B.teams[tgt.team].healM;
  if (tgt.st.antiheal > 0) amt *= 0.5;
  const h = Math.min(tgt.maxHp - tgt.hp, amt);
  tgt.hp += h;
  if (src) src.stats.heal += h;
  if (o.overShield && amt > h) { tgt.st.shield = Math.min(40, tgt.st.shield + (amt - h)); tgt.st.shieldT = Math.max(tgt.st.shieldT, 4); }
  if (o.quiet) tgt.healAcc += h;
  else if (h >= 1) fx(B, { type: 'text', x: tgt.x, y: tgt.y - 0.55 * tgt.size, text: '+' + Math.round(h), color: '#6dff9e', size: 13 });
  return h;
}
function applyCC(B, u, kind, dur) {
  if (!u.alive || u.cc || u.st.inv > 0) return;
  u.st[kind] = Math.max(u.st[kind], dur);
}
function applySlow(u, amt, dur) { if (!u.alive) return; u.st.slow = Math.max(u.st.slow, dur); u.st.slowAmt = Math.max(u.st.slowAmt * (u.st.slow > 0 ? 1 : 0), amt); }
function applyBurn(u, dps, dur, src) { if (!u.alive) return; u.st.burn = Math.max(u.st.burn, dur); u.st.burnDps = Math.max(u.st.burnDps, dps); u.st.burnSrc = src; }
function applyPoison(u, dps, dur, src) { if (!u.alive) return; u.st.poison = Math.max(u.st.poison, dur); u.st.poisonDps = Math.max(u.st.poisonDps, dps); u.st.poisonSrc = src; u.st.antiheal = Math.max(u.st.antiheal, dur); }

function killUnit(B, u, src) {
  u.hp = 0; u.alive = false; u.anim.deathT = 0;
  const T = B.teams[u.team];
  if (src) { src.stats.kills++; if (src.def.sp === 'void' && src.alive) heal(B, src, src, src.maxHp * 0.08); }
  fx(B, { type: 'death', x: u.x, y: u.y, size: u.size, team: u.team, def: u.def });
  if (u.raised || u.lifeTOnly) { u.raised = false; if (!u.summon) T.fallen.push(u); return; }
  if (u.def.sp === 'rebirth' && !u.rebirthUsed) {
    u.rebirthUsed = true; u.pending = true;
    B.delayed.push({ t: 2, f: () => revive(B, u, 0.6, 'rebirth') });
    return;
  }
  if (u.soul && !u.soulUsed && !u.summon) {
    u.soulUsed = true; u.pending = true;
    B.delayed.push({ t: 1.5, f: () => revive(B, u, 0.35, 'soul') });
    return;
  }
  if (!u.summon) {
    T.fallen.push(u);
    if (T.martyr && T.martyrStacks < 5) { T.martyrStacks++; fx(B, { type: 'banner', team: u.team, text: 'Laatste Wraak +' + T.martyrStacks * 10 + '%' }); }
  }
}
function revive(B, u, frac, kind) {
  if (B.over) return;
  u.pending = false; u.alive = true; u.hp = Math.max(1, u.maxHp * frac); u.st = freshStatus();
  u.target = null; u.atkCd = 0.5; u.anim.spawn = 1; u.anim.deathT = 0;
  const T = B.teams[u.team]; const i = T.fallen.indexOf(u); if (i >= 0) T.fallen.splice(i, 1);
  fx(B, { type: 'revive', x: u.x, y: u.y, kind, size: u.size });
  refreshAlive(B);
}

// ---------- targeting ----------
function chooseTarget(B, u) {
  const en = B.alive[1 - u.team]; if (!en.length) return null;
  const sp = u.def.sp;
  if (sp !== 'shadowstep' && sp !== 'headshot') {
    let best = null, bd = 1e9;
    for (const e of en) if (e.def.taunt) { const d = dist(u, e); if (d <= e.def.taunt * (e.size / (e.def.size || 1)) + 0.2 && d < bd) { bd = d; best = e; } }
    if (best) return best;
  }
  if (sp === 'headshot') { let b = null, bv = 1e9; for (const e of en) { const v = e.hp + dist(u, e) * 25; if (v < bv) { bv = v; b = e; } } return b; }
  if (sp === 'shadowstep') { let b = null, bv = 1e9; for (const e of en) { const v = e.hp + (e.def.role === 'melee' ? 500 : 0) + dist(u, e) * 20; if (v < bv) { bv = v; b = e; } } return b; }
  let best = null, bd = 1e9;
  for (const e of en) { let d = dist(u, e); if (e === u.target) d -= 0.8; if (d < bd) { bd = d; best = e; } }
  return best;
}
const inRange = (u, t, extra = 0) => dist(u, t) <= u.rng + radOf(u) + radOf(t) + extra;

function moveToward(B, u, tx, ty, dt, stop = 0) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (Math.abs(dx) > 0.05) u.anim.face = dx > 0 ? 1 : -1;
  if (d <= stop + 0.02) { u.anim.moving = false; return true; }
  const step = Math.min(u.ms * msMult(B, u) * dt, d - stop);
  u.x += dx / d * step; u.y += dy / d * step; u.anim.moving = true;
  return false;
}

// ---------- attacks ----------
function doAttack(B, u, t) {
  u.anim.atk = 1; u.shots++;
  if (Math.abs(t.x - u.x) > 0.05) u.anim.face = t.x > u.x ? 1 : -1;
  let dmg = u.dmg * dmgMult(B, u) * rnd(0.9, 1.1), crit = false;
  if (Math.random() < u.crit) { dmg *= u.critMul; crit = true; }
  const sp = u.def.sp;
  if (u.first && sp === 'charge') { dmg *= 2; }
  if (u.first && sp === 'dive') { dmg *= 3; }
  if (sp === 'piercer' && t.maxHp >= 600) dmg *= 1.6;
  const hit = { dmg, crit, first: u.first, nova: sp === 'nova' && u.shots % 3 === 0 };
  u.first = false;
  if (sp === 'chain') {
    const hits = [t]; let cur = t, d = dmg;
    for (let k = 0; k < 2; k++) {
      let nx = null, nd = 2.8;
      for (const e of B.alive[1 - u.team]) if (!hits.includes(e)) { const dd = dist(cur, e); if (dd < nd) { nd = dd; nx = e; } }
      if (!nx) break; hits.push(nx); cur = nx;
    }
    fx(B, { type: 'chain', pts: [{ x: u.x, y: u.y - 0.5 * u.size }].concat(hits.map(h => ({ x: h.x, y: h.y - 0.3 * h.size }))), color: '#9ef' });
    hits.forEach((h, i) => onHit(B, u, h, d * Math.pow(0.7, i), i === 0 && crit));
    return;
  }
  if (u.def.role === 'melee') {
    fx(B, { type: 'slash', x: t.x, y: t.y - 0.3 * t.size, face: u.anim.face, big: u.size > 1.3, color: u.team === 0 ? '#bff4ff' : '#ffd0c8' });
    onHit(B, u, t, dmg, crit, hit);
  } else {
    const kind = u.def.proj || 'arrow';
    const speed = { arrow: 13, bolt: 16, fire: 8, holy: 9, shadow: 8, frost: 10, arcane: 8, breath: 9, note: 9 }[kind] || 10;
    B.proj.push({ x: u.x + u.anim.face * 0.2 * u.size, y: u.y - 0.45 * u.size, target: t, tx: t.x, ty: t.y, speed, kind, src: u, hit, team: u.team, big: u.size > 1.5 });
    if (sp === 'volley' && u.shots % 4 === 0) {
      const other = B.alive[1 - u.team].filter(e => e !== t).sort((a, b) => dist(u, a) - dist(u, b))[0];
      if (other) B.proj.push({ x: u.x, y: u.y - 0.45, target: other, tx: other.x, ty: other.y, speed, kind, src: u, hit: { dmg: dmg * 0.8, crit: false }, team: u.team });
    }
  }
}
function onHit(B, u, t, dmg, crit, hit = {}) {
  const sp = u.def.sp;
  const melee = u.def.role === 'melee';
  if (t && t.alive) {
    dealDamage(B, u, t, dmg, { attack: true, crit, melee, ranged: !melee, pierce: sp === 'piercer' });
    if (u.fire && t.alive) { dealDamage(B, u, t, 5 * u.fire, { dot: true }); applyBurn(t, 4, 3, u); }
    if (u.poison && t.alive) applyPoison(t, 6, 4, u);
    if (sp === 'charge' && hit.first) { applyCC(B, t, 'stun', 0.8); fxText(B, t, 'Stun', '#ffe27a', 12); }
    if (sp === 'frost' && t.alive) { applySlow(t, 0.35, 2); if (u.shots % 4 === 0) { applyCC(B, t, 'freeze', 1.5); fx(B, { type: 'ring', x: t.x, y: t.y, r: 0.7, color: '#bff3ff' }); } }
    if ((sp === 'fireball' || sp === 'rebirth') && t.alive) applyBurn(t, 6, 3, u);
    if (sp === 'breath' && t.alive) applyBurn(t, 7, 3, u);
  }
  const cx = t ? t.x : u.x, cy = t ? t.y : u.y;
  if (hit.nova) {
    fx(B, { type: 'explosion', x: cx, y: cy, r: 2, color: '#c9a6ff' }); B.shake = Math.max(B.shake, 0.25);
    for (const e of B.alive[1 - u.team]) if (e !== t && Math.hypot(e.x - cx, e.y - cy) <= 2) dealDamage(B, u, e, dmg * 1.4, {});
    if (t && t.alive) dealDamage(B, u, t, dmg, {});
  } else if (u.splash) {
    fx(B, { type: 'explosion', x: cx, y: cy, r: u.splash, color: sp === 'stone' ? '#c9b48a' : sp === 'nova' ? '#c9a6ff' : '#ff9a3c', small: true });
    for (const e of B.alive[1 - u.team]) if (e !== t && e.alive && Math.hypot(e.x - cx, e.y - cy) <= u.splash) {
      dealDamage(B, u, e, dmg * 0.6, { color: '#ffd2a8' });
      if (sp === 'breath') applyBurn(e, 7, 3, u);
      if (sp === 'fireball' || sp === 'rebirth') applyBurn(e, 6, 3, u);
    }
  }
}

// ---------- specials ----------
function specials(B, u, dt) {
  const sp = u.def.sp;
  if (sp === 'shadowstep' && !u.jumped && B.time > 0.8) {
    u.jumped = true;
    const t = chooseTarget(B, u);
    if (t) {
      fx(B, { type: 'poof', x: u.x, y: u.y, color: '#7a5aa0' });
      const behind = u.team === 0 ? 0.75 : -0.75;
      u.x = clamp(t.x + behind, 0.3, AW - 0.3); u.y = clamp(t.y + rnd(-0.2, 0.2), 0.3, AH - 0.3); u.target = t; u.anim.face = -Math.sign(behind);
      fx(B, { type: 'poof', x: u.x, y: u.y, color: '#7a5aa0' });
    }
  }
  if (sp === 'raise' || sp === 'warcry' || sp === 'void') {
    u.spCd -= dt;
    if (u.spCd > 0) return;
    if (sp === 'raise') {
      u.spCd = 9;
      const T = B.teams[u.team];
      const cand = T.fallen.filter(f => !f.pending && !f.summon);
      u.anim.cast = 0.6;
      if (cand.length) {
        const f = cand[cand.length - 1];
        revive(B, f, 0.5, 'raise'); f.raised = true; f.lifeT = 10;
        fxText(B, f, 'Opgewekt!', '#7dff9b', 13);
      } else {
        const sx = u.x + (u.team === 0 ? 0.8 : -0.8), sy = u.y;
        const s = newUnit(B, SKELETON, B.teams[u.team], clamp(sx, 0.3, AW - 0.3), clamp(sy, 0.3, AH - 0.3), { summon: true, lifeT: 12 });
        finalize(s); s.anim.spawn = 1; fx(B, { type: 'revive', x: s.x, y: s.y, kind: 'raise', size: 1 }); refreshAlive(B);
      }
    } else if (sp === 'warcry') {
      const en = B.alive[1 - u.team].filter(e => dist(u, e) <= 1.6 + radOf(u));
      if (!en.length) { u.spCd = 0.5; return; }
      u.spCd = 8; u.anim.atk = 1; u.anim.cast = 0.5;
      fx(B, { type: 'whirl', x: u.x, y: u.y, r: 1.6 });
      for (const e of en) dealDamage(B, u, e, u.dmg * dmgMult(B, u) * 1.5, { attack: true, melee: true, big: true });
    } else if (sp === 'void') {
      const en = B.alive[1 - u.team].filter(e => dist(u, e) <= 4);
      if (!en.length) { u.spCd = 0.5; return; }
      u.spCd = 8; u.anim.cast = 0.8;
      fx(B, { type: 'voidpull', x: u.x, y: u.y, r: 4 }); B.shake = Math.max(B.shake, 0.3);
      for (const e of en) {
        const d = dist(u, e), k = Math.max(0, (d - (radOf(u) + radOf(e) + 0.2)) / d) * 0.75;
        e.x -= (e.x - u.x) * k; e.y -= (e.y - u.y) * k;
        applyCC(B, e, 'stun', 1);
      }
    }
  }
}

// ---------- per-unit update ----------
function updateUnit(B, u, dt) {
  const s = u.st;
  for (const k of ['stun', 'freeze', 'slow', 'burn', 'poison', 'antiheal', 'curse', 'rage', 'inv', 'blood', 'warp']) if (s[k] > 0) s[k] = Math.max(0, s[k] - dt);
  if (s.shieldT > 0) { s.shieldT -= dt; if (s.shieldT <= 0) s.shield = 0; }
  if (s.slow <= 0) s.slowAmt = 0;
  u.anim.atk = Math.max(0, u.anim.atk - dt * 4);
  u.anim.flash = Math.max(0, u.anim.flash - dt);
  u.anim.cast = Math.max(0, u.anim.cast - dt);
  u.anim.spawn = Math.max(0, u.anim.spawn - dt * 2);
  // temporary life
  if (u.lifeT > 0) {
    u.lifeT -= dt;
    if (u.lifeT <= 0) { u.lifeTOnly = true; killUnit(B, u, null); u.lifeTOnly = false; return; }
  }
  // DOTs & regen
  if (s.burn > 0) dealDamage(B, s.burnSrc && s.burnSrc.alive ? s.burnSrc : null, u, s.burnDps * dt, { dot: true });
  if (!u.alive) return;
  if (s.poison > 0) dealDamage(B, s.poisonSrc && s.poisonSrc.alive ? s.poisonSrc : null, u, s.poisonDps * dt, { dot: true });
  if (!u.alive) return;
  const rg = u.regen * u.maxHp + u.auraRegen;
  if (rg > 0 && u.hp < u.maxHp) heal(B, null, u, rg * dt, { quiet: true });
  u.accT += dt;
  if (u.accT > 0.5) {
    u.accT = 0;
    if (u.dotAcc >= 1) { fx(B, { type: 'text', x: u.x + rnd(-0.2, 0.2), y: u.y - 0.5 * u.size, text: Math.round(u.dotAcc), color: s.poison > 0 ? '#a6ff6b' : '#ffae5c', size: 11 }); u.dotAcc = 0; }
    if (u.healAcc >= 4) { fx(B, { type: 'text', x: u.x + rnd(-0.2, 0.2), y: u.y - 0.6 * u.size, text: '+' + Math.round(u.healAcc), color: '#6dff9e', size: 11 }); u.healAcc = 0; }
  }
  if (isCC(u)) { u.anim.moving = false; return; }
  specials(B, u, dt);
  if (!u.alive) return;
  u.atkCd -= dt * asMult(B, u);
  const role = u.def.role;

  if (role === 'healer') {
    let best = null, bs = 1e9;
    for (const a of B.alive[u.team]) { const p = hpFrac(a) + dist(u, a) * 0.03; if (hpFrac(a) < 0.97 && p < bs) { bs = p; best = a; } }
    if (best) {
      if (dist(u, best) <= u.rng + 0.3) {
        u.anim.moving = false;
        if (Math.abs(best.x - u.x) > 0.05) u.anim.face = best.x > u.x ? 1 : -1;
        if (u.atkCd <= 0) {
          u.atkCd = rnd(0.9, 1.1) / u.as; u.anim.cast = 0.4;
          B.proj.push({ x: u.x, y: u.y - 0.5, target: best, tx: best.x, ty: best.y, speed: 9, kind: 'healorb', src: u, heal: u.heal, team: u.team });
        }
      } else moveToward(B, u, best.x, best.y, dt, u.rng * 0.85);
      return;
    }
  }

  if (u.retarget <= 0 || !u.target || !u.target.alive) { u.target = chooseTarget(B, u); u.retarget = 0.4; }
  u.retarget -= dt;
  const t = u.target;
  if (!t) { u.anim.moving = false; return; }

  // healers & supports stay behind the front line when nothing to do
  if ((role === 'healer' || role === 'support') && !inRange(u, t)) {
    const front = B.alive[u.team].filter(a => a !== u && a.def.role === 'melee').sort((a, b) => dist(a, t) - dist(b, t))[0];
    if (front) { const back = u.team === 0 ? -1.4 : 1.4; moveToward(B, u, front.x + back, front.y + (u.y > front.y ? 0.4 : -0.4), dt, 0.25); return; }
  }

  if (inRange(u, t)) {
    u.anim.moving = false;
    if (Math.abs(t.x - u.x) > 0.05) u.anim.face = t.x > u.x ? 1 : -1;
    if (u.atkCd <= 0) { u.atkCd = rnd(0.9, 1.1) / u.as; doAttack(B, u, t); }
  } else {
    if (u.atkCd < 0) u.atkCd = rnd(0, 0.3);
    moveToward(B, u, t.x, t.y, dt, u.rng + radOf(u) + radOf(t) - 0.1);
  }
}

function auras(B) {
  for (const u of B.units) { u.auraAs = 0; u.auraRegen = 0; u.auraDmg = 0; }
  for (const a of B.units) {
    if (!a.alive) continue;
    const sp = a.def.sp;
    if (sp !== 'rhythm' && sp !== 'aura' && sp !== 'warcry') continue;
    for (const b of B.alive[a.team]) {
      if (sp === 'warcry') b.auraDmg += 0.15;
      else if (sp === 'rhythm' && dist(a, b) <= 2.5) b.auraAs += 0.2;
      else if (sp === 'aura' && dist(a, b) <= 2) b.auraRegen += 7;
    }
  }
}

function separate(B) {
  const all = B.units.filter(u => u.alive);
  const ox = new Float64Array(all.length), oy = new Float64Array(all.length);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    if (!!a.def.fly !== !!b.def.fly && a.team === b.team) continue;
    let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy);
    const min = (radOf(a) + radOf(b)) * 0.9;
    if (d < min) {
      if (d < 1e-4) { dx = rnd(-1, 1); dy = rnd(-1, 1); d = Math.hypot(dx, dy); }
      const push = (min - d) / d, wa = b.size / (a.size + b.size), wb = 1 - wa;
      ox[i] -= dx * push * wa; oy[i] -= dy * push * wa; ox[j] += dx * push * wb; oy[j] += dy * push * wb;
    }
  }
  all.forEach((u, i) => { u.x = clamp(u.x + ox[i] * 0.8, 0.25, AW - 0.25); u.y = clamp(u.y + oy[i] * 0.8, 0.25, AH - 0.25); });
}

function updateProjectiles(B, dt) {
  for (const p of B.proj) {
    if (p.target && p.target.alive) { p.tx = p.target.x; p.ty = p.target.y - 0.3 * p.target.size; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    const st = p.speed * dt;
    p.ang = Math.atan2(dy, dx);
    if (d <= st + 0.05) {
      p.done = true;
      if (p.kind === 'healorb') { if (p.target.alive) { heal(B, p.src, p.target, p.heal, { overShield: p.src.def.sp === 'blessing' }); fx(B, { type: 'sparkle', x: p.target.x, y: p.target.y, color: '#8dffb0' }); } continue; }
      const t = p.target && p.target.alive ? p.target : null;
      if (t || p.src.splash) onHit(B, p.src, t, p.hit.dmg, p.hit.crit, p.hit);
      if (!t && !p.src.splash) continue;
      if (p.kind === 'fire' || p.kind === 'breath') fx(B, { type: 'burst', x: p.tx, y: p.ty, color: '#ff8a2b', n: p.kind === 'breath' ? 16 : 8 });
      else fx(B, { type: 'burst', x: p.tx, y: p.ty, color: { arrow: '#e8d6a8', bolt: '#d0d0d0', frost: '#bff3ff', shadow: '#7dff9b', arcane: '#d6b8ff', note: '#ffe27a', holy: '#fff3b0' }[p.kind] || '#fff', n: 4 });
    } else { p.x += dx / d * st; p.y += dy / d * st; }
  }
  B.proj = B.proj.filter(p => !p.done);
}

function updateZones(B, dt) {
  for (const z of B.zones) {
    z.t += dt;
    const en = B.alive[1 - z.team].filter(e => Math.hypot(e.x - z.x, e.y - z.y) <= z.r + radOf(e) * 0.5);
    if (z.kind === 'poison') { for (const e of en) { dealDamage(B, null, e, 28 * dt, { dot: true }); applySlow(e, 0.3, 0.3); if (z.src) z.src.dmg += 28 * dt; } }
    if (z.kind === 'arrows') {
      z.tick -= dt;
      if (z.tick <= 0) { z.tick = 0.4; for (const e of en) dealDamage(B, null, e, 22, { color: '#ffe7b0' }); fx(B, { type: 'arrowwave', x: z.x, y: z.y, r: z.r }); }
    }
    if (z.kind === 'hole') {
      for (const e of B.alive[1 - z.team]) {
        const d = Math.hypot(e.x - z.x, e.y - z.y);
        if (d <= z.r && d > 0.15) { const k = Math.min(d - 0.1, 2.2 * dt); e.x -= (e.x - z.x) / d * k; e.y -= (e.y - z.y) / d * k; applySlow(e, 0.6, 0.2); }
      }
      if (z.t >= z.dur) {
        fx(B, { type: 'explosion', x: z.x, y: z.y, r: 1.8, color: '#b06bff' }); B.shake = Math.max(B.shake, 0.6);
        for (const e of B.alive[1 - z.team]) if (Math.hypot(e.x - z.x, e.y - z.y) <= 1.8) dealDamage(B, null, e, 260, { big: true, color: '#e2c6ff' });
      }
    }
  }
  B.zones = B.zones.filter(z => z.t < z.dur);
}

// ---------- abilities ----------
function canCast(B, T, ab) {
  if (B.over || ab.cd > 0) return false;
  if (ab.def.id === 'resurrect') return T.fallen.some(f => !f.pending);
  if (ab.def.id === 'tele') return B.alive[T.idx].length > 0;
  return B.alive[1 - T.idx].length > 0;
}
// target: {x,y} for point; {unit, x, y} for ally
function castAbility(B, ti, ab, target) {
  const T = B.teams[ti]; const id = ab.def.id; const mine = B.alive[ti]; const en = B.alive[1 - ti];
  if (!canCast(B, T, ab)) return false;
  ab.cd = ab.def.cd; ab.uses++;
  fx(B, { type: 'cast', team: ti, name: ab.def.name, color: ab.def.color, id });
  const inR = (p, r) => en.filter(e => Math.hypot(e.x - p.x, e.y - p.y) <= r + radOf(e) * 0.5);
  switch (id) {
    case 'heal': for (const u of mine) { heal(B, null, u, u.maxHp * 0.25); fx(B, { type: 'sparkle', x: u.x, y: u.y, color: '#5dff9a', n: 10 }); } break;
    case 'shield': for (const u of mine) { u.st.shield = 60 + u.maxHp * 0.15; u.st.shieldT = 6; fx(B, { type: 'ring', x: u.x, y: u.y, r: 0.6 * u.size, color: '#9fe3ff' }); } break;
    case 'tele': {
      const u = target.unit; if (!u || !u.alive) { ab.cd = 0; return false; }
      fx(B, { type: 'poof', x: u.x, y: u.y, color: '#c58bff' });
      u.x = clamp(target.x, 0.3, AW - 0.3); u.y = clamp(target.y, 0.3, AH - 0.3); u.target = null;
      fx(B, { type: 'poof', x: u.x, y: u.y, color: '#c58bff' });
      break;
    }
    case 'arrows': B.zones.push({ kind: 'arrows', team: ti, x: target.x, y: target.y, r: 1.6, t: 0, dur: 2.05, tick: 0 }); break;
    case 'freeze': fx(B, { type: 'frostnova', x: target.x, y: target.y, r: 2 }); for (const e of inR(target, 2)) { dealDamage(B, null, e, 20, { color: '#bff3ff' }); applyCC(B, e, 'freeze', 2.5); } break;
    case 'lightning': {
      if (!en.length) break;
      let cur = en.slice().sort((a, b) => b.hp - a.hp)[0]; const hits = [cur];
      for (let k = 0; k < 4; k++) { let nx = null, nd = 1e9; for (const e of en) if (!hits.includes(e)) { const d = dist(cur, e); if (d < nd) { nd = d; nx = e; } } if (!nx) break; hits.push(nx); cur = nx; }
      fx(B, { type: 'chain', pts: [{ x: hits[0].x, y: -1 }].concat(hits.map(h => ({ x: h.x, y: h.y - 0.3 * h.size }))), color: '#fff27a', big: true });
      hits.forEach(h => dealDamage(B, null, h, 80, { color: '#fff27a' })); B.shake = Math.max(B.shake, 0.25);
      break;
    }
    case 'rage': for (const u of mine) { u.st.rage = 5; } fx(B, { type: 'teamflash', team: ti, color: '#ff5a3c' }); break;
    case 'curse': fx(B, { type: 'ring', x: target.x, y: target.y, r: 1.7, color: '#b45cff', fill: true }); for (const e of inR(target, 1.7)) e.st.curse = 6; break;
    case 'meteor':
      fx(B, { type: 'meteor', x: target.x, y: target.y, r: 1.5, delay: 0.9 });
      B.delayed.push({ t: 0.9, f: () => {
        B.shake = Math.max(B.shake, 0.7);
        fx(B, { type: 'explosion', x: target.x, y: target.y, r: 1.6, color: '#ff8a2b' });
        for (const e of B.alive[1 - ti]) { const d = Math.hypot(e.x - target.x, e.y - target.y); if (d <= 1.5 + radOf(e) * 0.5) { dealDamage(B, null, e, 220 * (1 - 0.4 * d / 1.5), { big: true, color: '#ffb36b' }); applyBurn(e, 8, 3, null); } }
      } });
      break;
    case 'poison': B.zones.push({ kind: 'poison', team: ti, x: target.x, y: target.y, r: 1.8, t: 0, dur: 6 }); break;
    case 'skeletons':
      for (let k = 0; k < 3; k++) {
        const s = newUnit(B, SKELETON, T, clamp(target.x + Math.cos(k * 2.1) * 0.5, 0.3, AW - 0.3), clamp(target.y + Math.sin(k * 2.1) * 0.5, 0.3, AH - 0.3), { summon: true, lifeT: 15 });
        finalize(s); s.anim.spawn = 1; fx(B, { type: 'revive', x: s.x, y: s.y, kind: 'raise', size: 1 });
      }
      refreshAlive(B); break;
    case 'quake': B.shake = Math.max(B.shake, 0.9); fx(B, { type: 'quake', team: ti }); for (const e of en.slice()) { dealDamage(B, null, e, 60, { color: '#e8c89a' }); applyCC(B, e, 'stun', 1.2); } break;
    case 'warp': for (const e of en) e.st.warp = 5; fx(B, { type: 'teamflash', team: 1 - ti, color: '#7ef0ff' }); break;
    case 'blood': for (const u of mine) u.st.blood = 6; fx(B, { type: 'teamflash', team: ti, color: '#ff2a4a' }); break;
    case 'smite': {
      let t = null, bd = 1e9; for (const e of en) { const d = Math.hypot(e.x - target.x, e.y - target.y); if (d < bd) { bd = d; t = e; } }
      if (!t) break;
      fx(B, { type: 'beam', x: t.x, y: t.y, color: '#fff3b0' }); B.shake = Math.max(B.shake, 0.4);
      dealDamage(B, null, t, 380, { big: true, color: '#fff3b0' });
      for (const u of mine) if (Math.hypot(u.x - t.x, u.y - t.y) <= 1.8) heal(B, null, u, 80);
      break;
    }
    case 'resurrect': for (const f of T.fallen.slice()) if (!f.pending) revive(B, f, 0.4, 'res'); break;
    case 'inv': for (const u of mine) u.st.inv = 3; fx(B, { type: 'teamflash', team: ti, color: '#ffd84a' }); break;
    case 'hole': B.zones.push({ kind: 'hole', team: ti, x: target.x, y: target.y, r: 3, t: 0, dur: 2.5 }); break;
  }
  refreshAlive(B);
  return true;
}

// ---------- ability AI ----------
function bestCluster(units, r) {
  let best = null;
  for (const c of units) {
    let n = 0, sc = 0, sx = 0, sy = 0;
    for (const e of units) if (Math.hypot(e.x - c.x, e.y - c.y) <= r) { n++; sc += 0.6 + e.hp / 700; sx += e.x; sy += e.y; }
    if (!best || sc > best.score) best = { x: sx / n, y: sy / n, n, score: sc };
  }
  return best;
}
function engagedFrac(B, ti) {
  const mine = B.alive[ti], en = B.alive[1 - ti]; if (!mine.length) return 0;
  let c = 0; for (const u of mine) if (en.some(e => dist(u, e) <= u.rng + radOf(u) + radOf(e) + 0.6)) c++;
  return c / mine.length;
}
function aiAbilities(B, ti, dt) {
  const T = B.teams[ti];
  T.aiT -= dt; if (T.aiT > 0) return;
  const lv = T.level;
  T.aiT = lv === 'easy' ? rnd(1.2, 2.2) : lv === 'hard' ? rnd(0.3, 0.6) : rnd(0.6, 1.1);
  if (B.time < 1.5) return;
  const mine = B.alive[ti], en = B.alive[1 - ti]; if (!mine.length || !en.length) return;
  const eng = engagedFrac(B, ti);
  const missing = mine.reduce((s, u) => s + (u.maxHp - u.hp), 0), total = mine.reduce((s, u) => s + u.maxHp, 0);
  const low = mine.filter(u => hpFrac(u) < 0.4).length;
  const need = en.length <= 2 ? 1 : 2;
  for (const ab of T.abilities) {
    if (!canCast(B, T, ab)) continue;
    if (lv === 'easy' && Math.random() < 0.4) continue;
    const id = ab.def.id; let tgt = null, go = false;
    switch (id) {
      case 'heal': go = missing / total > 0.3 || (low >= 1 && mine.length <= 2) || low >= 2; break;
      case 'shield': go = eng >= 0.4 && missing / total > 0.12; break;
      case 'inv': go = low >= 2 || (low >= 1 && mine.length <= 2) || (eng > 0.6 && missing / total > 0.45); break;
      case 'rage': case 'blood': go = eng >= 0.5; break;
      case 'lightning': go = en.length >= 2 && eng > 0.2 || en.length === 1 && en[0].hp < 160; break;
      case 'quake': case 'warp': go = eng >= 0.4 && en.length >= 2; break;
      case 'resurrect': { const f = T.fallen.filter(x => !x.pending).length; go = f >= 2 || (f >= 1 && mine.length <= 2); break; }
      case 'arrows': case 'meteor': case 'poison': case 'curse': case 'freeze': case 'hole': {
        const r = ab.def.radius; const c = bestCluster(en, r * 0.9);
        const req = id === 'hole' ? Math.min(3, en.length) : id === 'freeze' ? Math.min(2, en.length) : need;
        if (c && c.n >= req && (id !== 'curse' || eng > 0.3)) { go = true; tgt = { x: c.x, y: c.y }; }
        break;
      }
      case 'smite': {
        let b = null, bv = -1;
        for (const e of en) { const v = (e.hp <= 380 * (1 - B.teams[e.team].dr) ? 2000 : 0) + e.dmg * e.as * 10 + tierOf(e.def) * 50; if (v > bv) { bv = v; b = e; } }
        if (b && (eng > 0.2 || b.hp <= 380)) { go = true; tgt = { x: b.x, y: b.y }; }
        break;
      }
      case 'skeletons': {
        if (B.time < 3) break;
        const e = en.slice().sort((a, b) => Math.abs(a.x - (ti ? 11 : 0)) - Math.abs(b.x - (ti ? 11 : 0)))[0];
        const back = mine.filter(u => u.def.role !== 'melee').sort((a, b) => dist(a, e) - dist(b, e))[0] || mine[0];
        go = true; tgt = { x: (e.x + back.x) / 2, y: (e.y + back.y) / 2 }; break;
      }
      case 'tele': {
        const squishy = mine.filter(u => u.def.role !== 'melee' && en.some(e => e.def.role === 'melee' && dist(u, e) < 1.3) && hpFrac(u) < 0.7);
        if (squishy.length) { const u = squishy[0]; go = true; tgt = { unit: u, x: ti === 0 ? 0.6 : AW - 0.6, y: clamp(u.y + rnd(-1.5, 1.5), 0.5, AH - 0.5) }; }
        break;
      }
    }
    if (go) { castAbility(B, ti, ab, tgt || { x: 0, y: 0 }); return; }
  }
}

// ---------- main step ----------
function stepBattle(B, dt) {
  if (B.over) { B.endT += dt; return; }
  B.time += dt;
  B.shake = Math.max(0, B.shake - dt * 1.5);
  for (const T of B.teams) for (const a of T.abilities) a.cd = Math.max(0, a.cd - dt);
  const order = Math.random() < 0.5 ? [0, 1] : [1, 0];
  for (const i of order) if (B.teams[i].ai) aiAbilities(B, i, dt);
  auras(B);
  const list = B.units.slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }
  for (const u of list) if (u.alive) updateUnit(B, u, dt);
  if (B.time > SUDDEN) {
    const r = (B.time - SUDDEN) * 0.003;
    for (const u of B.units) if (u.alive) dealDamage(B, null, u, u.maxHp * r * dt, { dot: true, pierce: true });
  }
  updateProjectiles(B, dt);
  updateZones(B, dt);
  for (const d of B.delayed) { d.t -= dt; if (d.t <= 0 && !d.done) { d.done = true; d.f(); } }
  B.delayed = B.delayed.filter(d => !d.done);
  separate(B);
  refreshAlive(B);
  for (const u of B.units) if (!u.alive) u.anim.deathT += dt;
  // end check
  const alive = [0, 0];
  for (const u of B.units) if (u.alive || u.pending) alive[u.team]++;
  if (!alive[0] || !alive[1]) { B.over = true; B.winner = !alive[0] && !alive[1] ? -1 : alive[0] ? 0 : 1; }
  else if (B.time >= MAX_TIME) {
    const pct = [0, 1].map(i => { let h = 0, m = 0; for (const u of B.units) if (u.team === i && !u.summon) { m += u.maxHp; h += Math.max(0, u.alive ? u.hp : 0); } return h / m; });
    B.over = true; B.winner = pct[0] === pct[1] ? -1 : pct[0] > pct[1] ? 0 : 1; B.timeout = true;
  }
}

// ===================== DRAFT =====================
function rollRarity() { let r = Math.random() * 100; for (const x of RARITIES) { if ((r -= x.weight) < 0) return x.id; } return 'common'; }
function generateDraft() {
  const n = 10 + Math.floor(Math.random() * 3); // 10..12
  const nUnits = Math.round(n * 0.6) + (Math.random() < 0.4 ? 1 : 0);
  const nAb = Math.max(2, Math.round((n - nUnits) / 2));
  const nBuff = Math.max(2, n - nUnits - nAb);
  const lots = [];
  const take = (pool, kind) => {
    const rar = rollRarity();
    let c = pool.filter(d => d.rar === rar && !lots.some(l => l.kind !== 'unit' && l.def === d));
    if (!c.length) c = pool.filter(d => !lots.some(l => l.kind !== 'unit' && l.def === d));
    const def = pick(c);
    lots.push({ kind, def, start: RAR[def.rar].price });
  };
  for (let i = 0; i < nUnits; i++) take(UNITS, 'unit');
  for (let i = 0; i < nBuff; i++) take(BUFFS, 'buff');
  for (let i = 0; i < nAb; i++) take(ABILITIES, 'ability');
  // shuffle, but keep at least one unit in the first three lots
  for (let i = lots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lots[i], lots[j]] = [lots[j], lots[i]]; }
  if (!lots.slice(0, 3).some(l => l.kind === 'unit')) { const k = lots.findIndex(l => l.kind === 'unit'); [lots[0], lots[k]] = [lots[k], lots[0]]; }
  lots.forEach((l, i) => { l.idx = i; l.winner = null; l.price = 0; });
  return lots;
}

// ---------- AI valuation ----------
const FAIR = [2.2, 3.3, 4.7, 6.6, 8.6, 11];
function aiValue(item, me, lotsLeft, pers, level) {
  const def = item.def, tier = tierOf(def);
  let v = FAIR[tier];
  const units = me.units.map(x => x.def);
  const nU = units.length;
  const synW = (pers ? pers.syn : 1) * (level === 'easy' ? 0.3 : level === 'hard' ? 1.25 : 1);
  if (item.kind === 'unit') {
    v *= nU < 2 ? 1.4 : nU < 4 ? 1.15 : nU < 6 ? 0.9 : 0.6;
    for (const t of def.tags) {
      const c = units.filter(d => d.tags.includes(t)).length;
      const s = SYN[t]; if (!s) continue;
      if (s.levels.some(l => l.n === c + 1)) v += 1.1 * synW; else if (c > 0) v += 0.35 * synW;
    }
    if (def.role === 'healer' && units.some(d => d.role === 'healer')) v *= 0.8;
    if (def.tags.includes('Beschermer') && !units.some(d => d.tags.includes('Beschermer'))) v += 0.5;
  } else if (item.kind === 'buff') {
    const n = Math.max(3, nU + lotsLeft.filter(l => l.kind === 'unit').length * 0.4);
    if (def.target === 'team') v *= Math.min(1.35, 0.5 + n * 0.14);
    if (def.id === 'folk') { const c = units.filter(d => d.tags.includes('Volk')).length; v *= c >= 3 ? 1.4 : c >= 1 ? 0.9 : 0.5; }
    if (def.id === 'eagle') { const c = units.filter(d => d.role !== 'melee').length; v *= c >= 2 ? 1.2 : c ? 0.8 : 0.4; }
    if (def.id === 'holy') { const c = units.filter(d => d.role === 'healer' || d.tags.includes('Heilig')).length; v *= c >= 2 ? 1.2 : c ? 0.8 : 0.5; }
    v *= me.buffs.length >= 3 ? 0.7 : 1;
  } else {
    const k = me.abilities.length;
    v *= k === 0 ? 1.2 : k === 1 ? 1.05 : k === 2 ? 0.8 : 0.55;
    if (def.id === 'resurrect' && nU < 3) v *= 0.7;
  }
  if (pers) v *= pers.pref[item.kind] * pers.aggr;
  return v;
}
function aiMaxBid(item, me, lotsLeft, pers, level) {
  const noise = level === 'easy' ? rnd(0.6, 1.25) : level === 'hard' ? rnd(0.95, 1.12) : rnd(0.82, 1.18);
  let v = aiValue(item, me, lotsLeft, pers, level) * noise;
  // pacing: spend money if lots are running out
  const futureFair = lotsLeft.reduce((s, l) => s + FAIR[tierOf(l.def)], 0);
  const ratio = me.coins / Math.max(1, futureFair * 0.55);
  if (ratio > 1) v *= Math.min(1.6, ratio);
  if (lotsLeft.length === 0) v = Math.max(v, me.coins * (item.kind === 'unit' ? 1 : 0.6));
  // reserve money for at least 2-3 units
  const needUnits = Math.max(0, 3 - me.units.length - (item.kind === 'unit' ? 1 : 0));
  const futureUnits = lotsLeft.filter(l => l.kind === 'unit').length;
  const reserve = Math.min(needUnits, futureUnits) * 1.5;
  return Math.max(0, Math.min(me.coins - reserve, Math.floor(v)));
}

// ---------- placement ----------
function autoPlace(defs, team) {
  const [c0, c1] = ZONE[team];
  const front = team === 0 ? c1 : c0, dir = team === 0 ? -1 : 1;
  const occ = new Set(); const out = [];
  const depth = d => {
    if (d.sp === 'shadowstep' || d.sp === 'dive') return 0;
    if (d.role === 'melee') return (d.taunt || d.tags.includes('Beschermer') || d.hp >= 600) ? 0 : 1;
    if (d.role === 'support') return 1;
    if (d.role === 'healer') return 3;
    return d.rng >= 5 ? 3 : 2;
  };
  const order = defs.map((d, i) => ({ d, i, dep: depth(d) })).sort((a, b) => a.dep - b.dep || b.d.hp - a.d.hp);
  const minDep = Math.min(...order.filter(o => o.d.sp !== 'shadowstep' && o.d.sp !== 'dive').map(o => o.dep), 9);
  if (minDep > 0 && minDep < 9) order.forEach(o => { if (o.d.sp !== 'shadowstep' && o.d.sp !== 'dive') o.dep -= minDep; });
  for (const o of order) {
    const rows = (o.d.sp === 'shadowstep' || o.d.sp === 'dive') ? [0, 5, 1, 4, 2, 3] : [2, 3, 1, 4, 0, 5];
    let placed = false;
    for (let dd = o.dep; dd < 4 && !placed; dd++) for (const r of rows) {
      const c = front + dir * dd; const k = c + ',' + r;
      if (!occ.has(k)) { occ.add(k); out[o.i] = { cx: c, cy: r }; placed = true; break; }
    }
    for (let dd = o.dep - 1; dd >= 0 && !placed; dd--) for (const r of rows) {
      const c = front + dir * dd; const k = c + ',' + r;
      if (!occ.has(k)) { occ.add(k); out[o.i] = { cx: c, cy: r }; placed = true; break; }
    }
  }
  return out;
}
