/* =====================================================================
   COMBAT & ENTITIES — player, stats, damage, status effects, enemies,
   AI, allies/summons, projectiles, zones, telegraphs, traps, bosses
   ===================================================================== */
function later(t, fn) { G.timers.push({ t, fn }); }
const xpFor = l => Math.round(18 * Math.pow(l, 1.5) + 12);
function gainXP(n) {
  const p = G.p; if (!p || p.dead) return;
  p.xp += n * p.S.xpMult * DIFFS[G.run.diff].xp;
  while (p.xp >= xpFor(p.level)) { p.xp -= xpFor(p.level); levelUp(p); }
}
function levelUp(p) {
  p.level++; p.ap++; G.pendingLevel++;
  recalc(p);
  p.hp = Math.min(p.S.maxHp, p.hp + p.S.maxHp * .3); p.mp = p.S.maxMp;
  fxBurst(p.x, p.y - 6, '#ffe080', 40, 90); G.fx.push({ type: 'ring', x: p.x, y: p.y, r: 30, color: '#ffe080', t: 0, dur: .6 });
  dmgText(p.x, p.y - 22, 'LEVEL UP', '#ffe080', true);
  Sfx.play('levelup');
  if (p.level >= 20) unlockAch('level20');
}

/* ---------------- PLAYER ---------------- */
function makePlayer(cls) {
  const C = CLASSES[cls], U = Save.data.upgrades;
  const p = {
    team: 'player', cls, x: 0, y: 0, vx: 0, vy: 0, r: 4.5, level: 1, xp: 0, gold: 40 * (U.gold || 0), potions: 3 + (U.potion || 0), maxPotions: 3 + (U.potion || 0),
    alloc: { str: 0, dex: 0, int: 0, vit: 0, luck: 0 }, mods: {}, boons: [], buffs: [], equip: {}, inv: [], abil: {}, slots: [null, null, null, null], cds: {}, cdMax: {}, ap: 0,
    dash: { ch: 1, max: 1, t: 0 }, atkT: 0, swing: 0, swingDir: 1, swingArc: 1.8, aim: 0, ifr: 0, shield: 0, shieldT: 0, stealth: 0, sure: 0, status: {},
    combo: 0, comboT: 0, streak: 0, streakT: 0, bestCombo: 0, face: 1, walk: 0, flash: 0, revives: U.revive ? 1 : 0, lastDash: -9, uid: UID++, hpShown: 1
  };
  for (const s of EQUIP_SLOTS) p.equip[s] = null;
  const w = genWeapon(1, 0, C.weapon); w.name = 'Worn ' + WEAPON_TYPES[C.weapon].names[0]; p.equip.weapon = w;
  p.abil[C.abilities[0]] = 1; p.abil[C.abilities[1]] = 1;
  p.slots = [C.abilities[0], C.abilities[1], null, null];
  recalc(p); p.hp = p.S.maxHp; p.mp = p.S.maxMp; p.dash.ch = p.S.dashMax;
  return p;
}
function addMod(p, mods) { for (const k in mods) p.mods[k] = (p.mods[k] || 0) + mods[k]; recalc(p); }
function hasPower(p, pw) { for (const s of EQUIP_SLOTS) if (p.equip[s] && p.equip[s].power === pw) return true; return false; }

/** Recompute every derived stat from class base + level choices + gear + boons + buffs + permanent upgrades. */
function recalc(p) {
  const C = CLASSES[p.cls], b = C.base, U = Save.data.upgrades, B = Save.data.bonus;
  const add = {};
  const A = o => { for (const k in o) add[k] = (add[k] || 0) + o[k]; };
  for (const s of EQUIP_SLOTS) if (p.equip[s]) A(p.equip[s].stats);
  A(p.mods); for (const bf of p.buffs) A(bf.mods);
  const g = k => add[k] || 0, S = {};
  S.str = b.str + p.alloc.str + g('str'); S.dex = b.dex + p.alloc.dex + g('dex'); S.int = b.int + p.alloc.int + g('int'); S.vit = b.vit + p.alloc.vit + g('vit');
  S.luck = b.luck + p.alloc.luck + g('luck') + (U.luck || 0) * 2 + (B.luck || 0);
  S.lf = luckFactor(S.luck);
  S.maxHp = Math.max(10, Math.round((b.hp + S.vit * 8 + g('hp') + p.level * 4) * (1 + (U.vit || 0) * .06 + (B.hp || 0) + g('hpPct') / 100)));
  S.maxMp = Math.round((b.mp + S.int * 4 + g('mp')) * (1 + (U.mana || 0) * .08 + g('mpPct') / 100));
  S.armor = b.armor + g('armor') + Math.floor(S.str / 3);
  S.crit = Math.min(.8, .05 + b.crit + S.dex * .004 + g('crit') / 100 + (U.crit || 0) * .015);
  S.critDmg = 1.5 + g('critDmg') / 100 + (p.cls === 'rogue' ? .25 : 0);
  S.atkSpd = g('atkSpd') / 100 + S.dex * .01;
  S.move = b.speed * (1 + g('move') / 100 + (U.swift || 0) * .03 + (B.speed || 0) + (p.cls === 'ranger' ? .1 : 0));
  S.lifesteal = g('lifesteal') / 100 + (p.cls === 'necro' ? .04 : 0) + (hasPower(p, 'vampire') ? .06 : 0);
  S.armorPen = Math.min(.9, g('armorPen') / 100);
  S.dmgMult = 1 + g('dmg') / 100 + (U.str || 0) * .05 + (B.dmg || 0);
  S.fire = g('fire') / 100; S.ice = g('ice') / 100; S.shock = g('shock') / 100; S.poison = g('poison') / 100;
  S.regen = S.vit * .05 + g('regen');
  S.mpRegen = (2 + S.int * .12) * (p.cls === 'mage' ? 1.5 : 1) * (1 + g('mpRegenPct') / 100);
  S.cdr = Math.min(.6, g('cdr') / 100);
  S.block = Math.min(.6, g('block') / 100 + (p.cls === 'warrior' ? .08 : 0));
  S.xpMult = 1 + g('xp') / 100 + (U.xp || 0) * .08;
  S.goldMult = 1 + g('gold') / 100 + (hasPower(p, 'midas') ? .6 : 0);
  S.abilMult = 1 + g('abil') / 100 + (p.cls === 'mage' ? .15 : 0);
  S.dr = Math.min(.8, g('dr') / 100); S.reflect = g('reflect') / 100 + (hasPower(p, 'thorns') ? .6 : 0);
  S.pierce = (p.cls === 'ranger' ? 1 : 0) + g('pierce');
  S.dashMax = 1 + (p.cls === 'rogue' ? 1 : 0) + g('dashCh');
  S.double = g('double') / 100 + (hasPower(p, 'echo') ? .25 : 0);
  S.killShield = g('killShield'); S.killHeal = g('killHeal'); S.killMana = g('killMana');
  S.summonDmg = 1 + g('summonDmg') / 100; S.summonLife = 1 + g('summonLife') / 100;
  p.S = S;
  p.hp = Math.min(p.hp, S.maxHp); p.mp = Math.min(p.mp, S.maxMp);
  p.dash.max = S.dashMax; p.dash.ch = Math.min(p.dash.ch, S.dashMax);
  G.hudDirty = true;
  if (S.luck >= 40 && G.state === 'play') unlockAch('lucky');
}
function lowHpBonus(p) { return p.cls === 'warrior' ? 1 + (1 - p.hp / p.S.maxHp) * .3 : 1; }
function weaponPower(p) {
  const w = p.equip.weapon; if (!w) return 4 * p.S.dmgMult;
  const T = WEAPON_TYPES[w.type];
  return w.dmg * (1 + p.S[T.stat] * .03) * p.S.dmgMult * lowHpBonus(p);
}
function abilityPower(p) {
  if (p.team === 'ally') return p.dmg;
  const w = p.equip.weapon, C = CLASSES[p.cls];
  return (6 + p.level * 1.8 + (w ? w.dmg * .55 : 0)) * (1 + p.S[C.primary] * .03) * p.S.dmgMult * p.S.abilMult * lowHpBonus(p);
}
function enemiesIn(x, y, r) { return G.ents.filter(e => !e.dead && e.spawnT <= 0 && !e.hidden && !e.dormant && !(e.air > 0) && Math.hypot(e.x - x, e.y - y) < r + e.r); }
function nearestEnemy(x, y, r) { let best = null, bd = r; for (const e of enemiesIn(x, y, r)) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } } return best; }
function healPlayer(n) {
  const p = G.p; if (n <= 0) return;
  const before = p.hp; p.hp = Math.min(p.S.maxHp, p.hp + n);
  if (p.hp - before >= 1) dmgText(p.x, p.y - 14, '+' + Math.round(p.hp - before), '#7bd88a');
}
function addBuff(e, id, name, dur, mods, color) {
  const old = e.buffs.find(b => b.id === id);
  if (old) { old.t = dur; old.max = dur; } else e.buffs.push({ id, name, t: dur, max: dur, mods, color });
  if (e === G.p) recalc(e);
}
function moveDir() {
  const k = Input.keys; let x = 0, y = 0;
  if (k.KeyW || k.ArrowUp) y--; if (k.KeyS || k.ArrowDown) y++; if (k.KeyA || k.ArrowLeft) x--; if (k.KeyD || k.ArrowRight) x++;
  const l = Math.hypot(x, y); return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}

function updatePlayer(p, dt) {
  const S = p.S;
  p.flash = Math.max(0, p.flash - dt); p.ifr = Math.max(0, p.ifr - dt); p.sure = Math.max(0, p.sure - dt);
  p.swing = Math.max(0, p.swing - dt); p.atkT -= dt;
  if (p.stealth > 0) { p.stealth -= dt; if (p.stealth <= 0) p.stealth = 0; }
  if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }
  tickStatus(p, dt); if (p.dead) return;
  // aim
  p.aim = Math.atan2(G.my - (p.y - 5), G.mx - p.x);
  p.face = Math.cos(p.aim) < 0 ? -1 : 1;
  // buffs
  let bchange = false;
  for (const b of p.buffs) { b.t -= dt; if (b.t <= 0) bchange = true; }
  if (bchange) { p.buffs = p.buffs.filter(b => b.t > 0); recalc(p); }
  // cooldowns & regen
  for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
  if (p.dash.ch < p.dash.max) { p.dash.t += dt; if (p.dash.t >= 1.3) { p.dash.t = 0; p.dash.ch++; } }
  p.hp = Math.min(S.maxHp, p.hp + (S.regen + (p.cls === 'paladin' ? S.maxHp * .004 : 0)) * dt);
  p.mp = Math.min(S.maxMp, p.mp + S.mpRegen * dt);
  if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
  if (p.streakT > 0) { p.streakT -= dt; if (p.streakT <= 0) p.streak = 0; }
  // hazards under the player
  const tt = tileAt(Math.floor(p.x / TS), Math.floor(p.y / TS));
  const liquid = tt === T_LIQ ? BIOMES[G.run.bi].liquid : null;
  p.hazT = (p.hazT || 0) - dt;
  if (liquid && !p.leap && p.hazT <= 0) {
    p.hazT = .5;
    const hd = (4 + G.run.depth * .8) * DIFFS[G.run.diff].dmg;
    if (liquid === 'lava') { hurtPlayer(hd * 1.4, null, { dot: true }); applyStatus(p, 'burn', 2, hd * .5); }
    else if (liquid === 'poison') applyStatus(p, 'poison', 3, hd * .4);
    else if (liquid === 'void') hurtPlayer(hd, null, { dot: true });
  }
  // movement states
  const sm = speedMult(p);
  if (p.leap) {
    const L = p.leap; L.t += dt; const k = Math.min(1, L.t / L.dur);
    p.x = lerp(L.x0, L.x1, k); p.y = lerp(L.y0, L.y1, k); p.z = Math.sin(k * Math.PI) * 18; p.ifr = .1;
    if (k >= 1) { p.leap = null; p.z = 0; aoe(p, p.x, p.y, L.rad, abilityPower(p) * L.mult, { kb: 200, stun: .6, color: '#e0c080', proc: true }); shake(6); Sfx.play('boom'); fxDebris(p.x, p.y, '#8a7a60', 20); }
    return;
  }
  if (p.charge) {
    const c = p.charge; c.t -= dt;
    const bl = moveEnt(p, Math.cos(c.ang) * c.spd * dt, Math.sin(c.ang) * c.spd * dt);
    fxBurst(p.x, p.y - 4, '#ffe080', 2, 20);
    for (const e of G.ents) if (!e.dead && !c.hit.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 12) { c.hit.add(e); hitEnemy(p, e, abilityPower(p) * c.mult, { kb: 260, kbAng: c.ang + (angDiff(c.ang, angTo(p, e)) > 0 ? 1.2 : -1.2), proc: true, holy: true }); }
    if (c.t <= 0 || bl) p.charge = null;
    return;
  }
  if (p.dashV) {
    const d = p.dashV; d.t -= dt;
    moveEnt(p, d.x * dt, d.y * dt);
    if (Math.random() < .6) G.fx.push({ type: 'ghost', x: p.x, y: p.y, t: 0, dur: .25, face: p.face });
    if (d.t <= 0) p.dashV = null;
    return;
  }
  const mv = moveDir();
  let spd = S.move * sm;
  if (liquid === 'water' || liquid === 'swamp') spd *= .6;
  if (p.swing > 0 && (!p.equip.weapon || WEAPON_TYPES[p.equip.weapon.type].kind === 'melee')) spd *= .8;
  if (p.spin) spd *= .8;
  const tvx = mv.x * spd, tvy = mv.y * spd;
  const k = liquid === 'ice' ? Math.min(1, dt * 2.2) : 1;
  p.vx = lerp(p.vx, tvx, k); p.vy = lerp(p.vy, tvy, k);
  moveEnt(p, p.vx * dt, p.vy * dt);
  const moving = Math.hypot(p.vx, p.vy) > 5;
  if (moving) { p.walk += dt * 10; if (Math.floor(p.walk) % 4 === 0 && Math.random() < .08) Sfx.play('step'); }
  // actions
  const ui = G.modal;
  if (!ui && sm > 0) {
    if ((Input.tap('Space') || Input.tap('Mouse2') || Input.tap('ShiftLeft')) && p.dash.ch > 0) {
      const an = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : p.aim;
      p.dashV = { x: Math.cos(an) * 430, y: Math.sin(an) * 430, t: .16 }; p.ifr = Math.max(p.ifr, .22); p.dash.ch--; p.lastDash = G.time;
      if (p.cls === 'rogue') p.sure = 1.2;
      Sfx.play('dash'); fxBurst(p.x, p.y, '#c8c0d8', 8, 40);
    }
    for (let i = 0; i < 4; i++) if (Input.tap('Digit' + (i + 1))) useAbility(p, i);
    if (Input.tap('KeyQ')) drinkPotion(p);
    if (Input.mouse.down && p.atkT <= 0) playerAttack(p);
  }
  // spin (Whirlwind)
  if (p.spin) {
    const s = p.spin; s.t -= dt; s.tick -= dt;
    if (s.tick <= 0) { s.tick = .22; aoe(p, p.x, p.y, s.rad, abilityPower(p) * s.mult, { kb: 90, proc: true }); G.fx.push({ type: 'spin', x: p.x, y: p.y - 4, r: s.rad, t: 0, dur: .22 }); Sfx.play('swing'); }
    if (s.t <= 0) p.spin = null;
  }
  if (p.flurry) {
    const f = p.flurry; f.t -= dt; f.tick -= dt;
    if (f.tick <= 0 && f.n < 8) {
      f.tick = .06; f.n++;
      const a = f.ang + rand(-.5, .5);
      fxSlash(p.x, p.y - 5, a, 1.2, f.rad, '#ffb0b0');
      for (const e of G.ents) if (!e.dead && e.spawnT <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < f.rad + e.r && Math.abs(angDiff(f.ang, angTo(p, e))) < .9) hitEnemy(p, e, abilityPower(p) * f.mult, { kb: 30, proc: true, elem: 'bleed' });
      Sfx.play('swing');
    }
    if (f.t <= 0) p.flurry = null;
  }
}
function drinkPotion(p) {
  if (p.potions <= 0) { toast('No potions left'); Sfx.play('error'); return; }
  if (p.hp >= p.S.maxHp) { toast('Already at full health'); return; }
  p.potions--; healPlayer(p.S.maxHp * .45 * DIFFS[G.run.diff].heal); p.status.burn = null; p.status.poison = null;
  fxBurst(p.x, p.y - 6, '#ff6a6a', 16, 40); Sfx.play('potion'); G.hudDirty = true;
}
function useAbility(p, i) {
  const id = p.slots[i]; if (!id) { toast('Empty slot — open Abilities (K) to assign one'); return; }
  const A = ABILITIES[id], rk = p.abil[id] || 0; if (!rk) return;
  if ((p.cds[id] || 0) > 0) { Sfx.play('error'); return; }
  if (p.mp < A.cost) { toast('Not enough ' + CLASSES[p.cls].res.toLowerCase()); Sfx.play('error'); return; }
  const aim = { x: G.mx, y: G.my, ang: p.aim };
  if (A.cast(p, rk, aim) === false) return;
  p.mp -= A.cost;
  const cd = A.cd * (1 - .06 * (rk - 1)) * (1 - p.S.cdr);
  p.cds[id] = cd; p.cdMax[id] = cd;
  G.run.stats.casts++;
}
function playerAttack(p) {
  const w = p.equip.weapon, T = w ? WEAPON_TYPES[w.type] : WEAPON_TYPES.sword;
  const rate = (w ? w.rate : 1.5) * (1 + p.S.atkSpd);
  p.atkT = 1 / rate;
  const P = weaponPower(p);
  doAttack(p, T, P);
  if (chance(p.S.double)) later(.1, () => { if (G.p === p && !p.dead) doAttack(p, T, P * .8); });
}
function doAttack(p, T, P) {
  if (T.kind === 'melee') {
    p.swing = .2; p.swingDir *= -1; p.swingArc = T.arc;
    fxSlash(p.x, p.y - 5, p.aim, T.arc, T.range + 4, rarityCol(p.equip.weapon));
    Sfx.play('swing');
    let hit = 0;
    for (const e of G.ents) {
      if (e.dead || e.spawnT > 0 || e.hidden || e.air > 0 || e.dormant) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > T.range + e.r + 3) continue;
      if (d > 10 && Math.abs(angDiff(p.aim, Math.atan2(e.y - p.y, e.x - p.x))) > T.arc / 2 + .2) continue;
      hitEnemy(p, e, P, { kb: T.kb, proc: true, weaponHit: true }); hit++;
    }
    for (const e of G.ents) if (e.dormant && Math.hypot(e.x - p.x, e.y - p.y) < T.range + 8) wakeMimic(e);
    hitProps(p.x, p.y, T.range + 6, p.aim, T.arc);
    for (let d = 8; d <= T.range + 6; d += 6) { const x = p.x + Math.cos(p.aim) * d, y = p.y - 4 + Math.sin(p.aim) * d; if (tileAt(Math.floor(x / TS), Math.floor(y / TS)) === T_CRACK) { breakWall(Math.floor(x / TS), Math.floor(y / TS)); break; } }
    if (hit) { G.hitstop = Math.max(G.hitstop, .035); shake(1.2); }
    if (p.stealth > 0 && !hit) { /* swinging at air keeps stealth */ }
  } else {
    const emp = p.empower; p.empower = null;
    const n = 1 + (hasPower(p, 'split') ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const a = p.aim + (i - (n - 1) / 2) * .14;
      shoot(p, p.x + Math.cos(a) * 6, p.y - 5 + Math.sin(a) * 6, a, T.spd, { dmg: P * (emp ? emp.mult : 1), kind: T.proj, pierce: p.S.pierce + (emp ? emp.pierce : 0), splash: T.splash || 0, proc: true, weaponHit: true, r: T.proj === 'orb' ? 3.5 : 2.5, life: 1.1, color: rarityCol(p.equip.weapon) });
    }
    p.swing = .12;
    Sfx.play(T.proj === 'arrow' ? 'arrow' : 'shoot');
  }
}
function rarityCol(it) { return it ? RARITIES[it.rar].color : '#ffffff'; }

/* ---------------- DAMAGE ---------------- */
function applyStatus(e, kind, dur, pow = 0) {
  const s = e.status;
  if ((kind === 'freeze' || kind === 'stun') && e.boss) { dur *= .25; if (kind === 'freeze') kind = 'chill'; }
  if (kind === 'freeze' && e === G.p) { kind = 'chill'; }
  if (kind === 'poison') { const cur = s.poison; s.poison = { t: Math.max(dur, cur ? cur.t : 0), dps: Math.min((cur ? cur.dps : 0) + pow, pow * 5 + 1) }; }
  else if (kind === 'burn' || kind === 'bleed') { const cur = s[kind]; s[kind] = { t: Math.max(dur, cur ? cur.t : 0), dps: Math.max(pow, cur ? cur.dps : 0) }; }
  else { const cur = s[kind]; s[kind] = { t: Math.max(dur, cur ? cur.t : 0) }; }
}
function speedMult(e) {
  const s = e.status;
  if ((s.freeze && s.freeze.t > 0) || (s.stun && s.stun.t > 0) || (s.root && s.root.t > 0)) return 0;
  return (s.chill && s.chill.t > 0 ? .5 : 1) * (e.fastMul || 1);
}
/** Damage-over-time ticks every 0.5s; status timers count down. */
function tickStatus(e, dt) {
  const s = e.status; let dps = 0, col = null;
  for (const k in s) {
    const v = s[k]; if (!v) continue;
    v.t -= dt; if (v.t <= 0) { s[k] = null; continue; }
    if (v.dps) { dps += v.dps; col = k === 'burn' ? '#ff9a40' : k === 'poison' ? '#9ae05a' : '#ff4a4a'; }
    if (k === 'burn' && Math.random() < dt * 12) G.parts.push(part(e.x + rand(-4, 4), e.y - rand(4, 12), rand(-6, 6), -rand(15, 35), .5, '#ff9a30', 1, true));
    if (k === 'poison' && Math.random() < dt * 6) G.parts.push(part(e.x + rand(-4, 4), e.y - rand(2, 10), 0, -12, .6, '#8ae04a', 1));
  }
  e.dotT = (e.dotT || 0) - dt;
  if (dps > 0 && e.dotT <= 0) {
    e.dotT = .5;
    const d = dps * .5;
    if (e === G.p) hurtPlayer(d, null, { dot: true, color: col });
    else if (e.team === 'ally') hurtAlly(e, d);
    else if (!e.dead) { e.hp -= d; e.flash = .05; dmgText(e.x, e.y - 10, Math.round(d), col, false, true); G.run.stats.dmg += d; if (e.hp <= 0) killEnemy(e, G.p); }
  }
}
/** Player/ally → enemy damage. Handles crits, stealth, execute, armor, knockback, lifesteal, combo and procs. */
function hitEnemy(src, e, amt, o = {}) {
  if (!e || e.dead || e.invuln || e.spawnT > 0 || e.dormant) return 0;
  const p = G.p; let crit = false, dmg = amt;
  if (src === p) {
    if (!o.noCrit && (o.forceCrit || p.sure > 0 || chance(p.S.crit))) crit = true;
    if (p.stealth > 0) { dmg *= p.stealthMult || 2.5; if (hasPower(p, 'shadow')) dmg *= 2.2; p.stealth = 0; crit = true; fxBurst(p.x, p.y - 6, '#606070', 12, 60); }
    else if (hasPower(p, 'shadow') && G.time - p.lastDash < 1.2) dmg *= 2.2;
    if (hasPower(p, 'execute') && e.hp < e.maxHp * .3) dmg *= 2;
    if (p.cls === 'paladin' && (e.def.undead || e.def.demon)) dmg *= 1.25;
    if (o.holy && e.def.undead) dmg *= 2;
    dmg *= 1 + Math.min(p.combo, 50) * .005;
  } else if (src && src.team === 'ally' && chance(.08)) crit = true;
  if (crit) dmg *= src === p ? p.S.critDmg : 1.5;
  let arm = e.armor || 0; if (src === p) arm *= 1 - p.S.armorPen;
  dmg *= 1 - arm;
  if (e.shielded) dmg *= .15;
  dmg = Math.max(1, dmg);
  e.hp -= dmg; e.flash = .1;
  dmgText(e.x + rand(-3, 3), e.y - 12 - (e.boss ? e.def.scale * 8 : 0), Math.round(dmg), crit ? '#ffd24a' : '#ffffff', crit);
  if (o.kb && !e.boss && !e.def.static) {
    const a = o.kbAng !== undefined ? o.kbAng : Math.atan2(e.y - (src ? src.y : e.y), e.x - (src ? src.x : e.x));
    const k = o.kb * (e.giant || (e.def.scale || 1) > 1.25 ? .45 : 1);
    e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k;
  }
  if (o.stun) applyStatus(e, 'stun', o.stun);
  if (o.freeze) applyStatus(e, 'freeze', o.freeze);
  if (o.elem === 'fire') applyStatus(e, 'burn', 3, amt * .22 + 1);
  if (o.elem === 'poison') applyStatus(e, 'poison', 4, amt * .14 + 1);
  if (o.elem === 'bleed') applyStatus(e, 'bleed', 3, amt * .18 + 1);
  if (o.elem === 'ice') applyStatus(e, 'chill', 2);
  if (src === p) {
    if (p.S.lifesteal > 0) { p.hp = Math.min(p.S.maxHp, p.hp + dmg * p.S.lifesteal); }
    p.combo++; p.comboT = 2.2; if (p.combo > p.bestCombo) p.bestCombo = p.combo;
    if (p.combo >= 50) unlockAch('combo');
    G.run.stats.dmg += dmg;
    if (o.proc) onPlayerHit(e, dmg, o);
  } else if (src && src.team === 'ally') G.run.stats.dmg += dmg;
  Sfx.play(crit ? 'crit' : 'hit');
  for (let i = 0; i < (crit ? 6 : 3); i++) G.parts.push(part(e.x, e.y - 6, rand(-50, 50), rand(-60, 10), .3, e.def.blood || '#e8e0d0', 1));
  if (e.hp <= 0) killEnemy(e, src);
  return dmg;
}
function onPlayerHit(e, dmg, o) {
  const p = G.p, S = p.S;
  if (chance(S.fire) || hasPower(p, 'ignite')) applyStatus(e, 'burn', 3, dmg * .2 + 2);
  if (chance(S.ice) || hasPower(p, 'frostbite')) { applyStatus(e, 'chill', 2); if (hasPower(p, 'frostbite') && chance(.12)) applyStatus(e, 'freeze', 1.2); }
  if (chance(S.poison)) applyStatus(e, 'poison', 4, dmg * .12 + 1);
  if (chance(S.shock) || (hasPower(p, 'chain') && chance(.3))) chainLightning(p, e.x, e.y, dmg * .5, 3, [e]);
  if (hasPower(p, 'meteor') && chance(.08)) { const x = e.x, y = e.y; tele({ kind: 'circle', x, y, r: 40, dur: .5, team: 'player', color: '255,140,60', onDone: () => { aoe(p, x, y, 40, weaponPower(p) * 3, { elem: 'fire', color: '#ffb060' }); shake(5); Sfx.play('boom'); } }); }
  if (hasPower(p, 'midas') && chance(.06)) dropGold(e.x, e.y, randi(1, 3) * (1 + G.run.depth * .2));
  if (o.weaponHit && p.equip.weapon) {
    const inn = WEAPON_TYPES[p.equip.weapon.type].innate;
    if (inn && inn.bleed && chance(inn.bleed)) applyStatus(e, 'bleed', 3, dmg * .25 + 1);
    if (inn && inn.stun && chance(inn.stun)) applyStatus(e, 'stun', .7);
  }
}
function chainLightning(src, x, y, dmg, n, exclude = []) {
  let cx = x, cy = y; const hit = new Set(exclude);
  for (let i = 0; i < n; i++) {
    let best = null, bd = 90;
    for (const e of G.ents) { if (e.dead || hit.has(e) || e.spawnT > 0 || e.hidden) continue; const d = Math.hypot(e.x - cx, e.y - cy); if (d < bd) { bd = d; best = e; } }
    if (!best) break;
    hit.add(best); fxBolt(cx, cy - 6, best.x, best.y - 6, '#b8c8ff');
    hitEnemy(src, best, dmg, { noCrit: true }); cx = best.x; cy = best.y;
  }
  if (n) Sfx.play('zap');
}
/** Area damage. Enemy-team owners hurt the player and allies; everyone else hurts enemies. */
function aoe(owner, x, y, r, dmg, o = {}) {
  if (o.color) fxRing(x, y, r, o.color);
  let n = 0;
  if (owner && owner.team === 'enemy') {
    const p = G.p; if (Math.hypot(p.x - x, p.y - y) < r + p.r) { hurtPlayer(dmg, owner, { elem: o.elem }); n++; }
    for (const a of G.allies) if (Math.hypot(a.x - x, a.y - y) < r + a.r) hurtAlly(a, dmg);
    return n;
  }
  if (dmg > 0 || o.stun || o.freeze) for (const e of G.ents) {
    if (e.dead || e.spawnT > 0 || e.hidden || e.air > 0) continue;
    if (Math.hypot(e.x - x, e.y - y) < r + e.r) { hitEnemy(owner, e, dmg, o); n++; }
  }
  if (dmg > 0) {
    hitProps(x, y, r);
    for (const e of G.ents) if (e.dormant && Math.hypot(e.x - x, e.y - y) < r + 8) wakeMimic(e);
    if (owner === G.p || owner.team === 'ally') { const tx = Math.floor(x / TS), ty = Math.floor(y / TS), rr = Math.ceil(r / TS); for (let j = ty - rr; j <= ty + rr; j++) for (let i = tx - rr; i <= tx + rr; i++) if (tileAt(i, j) === T_CRACK && Math.hypot(i * TS + 8 - x, j * TS + 8 - y) < r + 8) breakWall(i, j); }
  }
  return n;
}
/** Everything that damages the player goes through here. */
function hurtPlayer(amt, src, o = {}) {
  const p = G.p; if (!p || p.dead || G.state !== 'play') return;
  if (!o.dot && (p.ifr > 0 || p.leap || p.dashV || p.charge)) return;
  if (!o.dot && chance(p.S.block)) { dmgText(p.x, p.y - 14, 'Block', '#b0c8ff'); Sfx.play('shield'); p.ifr = .25; return; }
  if (G.run.curse && !o.dot) amt *= 1.4;
  let d = amt * (100 / (100 + p.S.armor * 1.5));
  if (p.cls === 'warrior') d *= .88;
  d *= 1 - p.S.dr;
  if (p.shield > 0) { const a = Math.min(p.shield, d); p.shield -= a; d -= a; if (a > 0 && !o.dot) fxRing(p.x, p.y - 4, 14, '#fff0a0'); }
  if (src && src.def && src.team === 'enemy' && p.S.reflect > 0 && !o.dot && !src.dead) hitEnemy(p, src, amt * p.S.reflect, { noCrit: true });
  if (d <= 0) return;
  p.hp -= d; G.run.floorHurt = true; G.run.stats.taken += d;
  dmgText(p.x, p.y - 14, Math.round(d), o.color || '#ff5a4a', false, !!o.dot);
  if (!o.dot) { p.ifr = .5; p.flash = .15; shake(3.5); Sfx.play('hurt'); G.hurtFlash = .35; }
  if (o.elem === 'fire') applyStatus(p, 'burn', 2.5, amt * .15);
  if (o.elem === 'poison') applyStatus(p, 'poison', 3, amt * .1);
  if (o.elem === 'ice') applyStatus(p, 'chill', 1.5);
  if (o.elem === 'shock') applyStatus(p, 'stun', .25);
  if (p.hp <= 0) playerDeath();
}
function playerDeath() {
  const p = G.p;
  const rv = (p.mods.revive || 0) > 0 ? 'phoenix' : p.revives > 0 ? 'wind' : null;
  if (rv) {
    if (rv === 'phoenix') { p.mods.revive--; p.hp = p.S.maxHp * .5; banner('Phoenix Feather', 'You rise from the ashes'); }
    else { p.revives--; p.hp = p.S.maxHp * .4; banner('Second Wind', 'Not yet...'); }
    p.ifr = 2; aoe(p, p.x, p.y, 70, abilityPower(p) * 2, { kb: 300, color: '#ffd080' }); fxBurst(p.x, p.y - 6, '#ffb040', 50, 140); Sfx.play('levelup'); shake(8);
    return;
  }
  p.hp = 0; p.dead = true;
  G.state = 'dying'; G.dyingT = 1.8;
  Sfx.play('death'); shake(10); fxBurst(p.x, p.y - 6, '#c9433b', 40, 100);
  Music.stop();
}

/* ---------------- EFFECTS ---------------- */
function part(x, y, vx, vy, life, color, size = 1, glow = false, grav = 0) { return { x, y, vx, vy, life, max: life, color, size, glow, grav }; }
function fxBurst(x, y, color, n = 12, spd = 60, o = {}) {
  for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(.3, 1) * spd; G.parts.push(part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(.3, .7), color, rand() < .3 ? 2 : 1, o.glow !== false, o.grav || 0)); }
}
function fxDebris(x, y, color, n) { for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(30, 120); G.parts.push(part(x, y, Math.cos(a) * s, Math.sin(a) * s - 40, rand(.4, .8), color, rand() < .5 ? 2 : 1, false, 260)); } }
function fxRing(x, y, r, color, dur = .35) { G.fx.push({ type: 'ring', x, y, r, color, t: 0, dur }); }
function fxBeam(x0, y0, x1, y1, color, dur = .25) { G.fx.push({ type: 'beam', x0, y0, x1, y1, color, t: 0, dur }); }
function fxSlash(x, y, ang, arc, r, color) { G.fx.push({ type: 'slash', x, y, ang, arc, r, color, t: 0, dur: .16, dir: G.p ? G.p.swingDir : 1 }); }
function fxBolt(x0, y0, x1, y1, color) {
  const pts = [[x0, y0]]; const n = 7;
  for (let i = 1; i < n; i++) pts.push([lerp(x0, x1, i / n) + rand(-6, 6), lerp(y0, y1, i / n) + rand(-6, 6)]);
  pts.push([x1, y1]);
  G.fx.push({ type: 'bolt', pts, color, t: 0, dur: .22 });
  G.flashLights.push({ x: x1, y: y1, r: 70, t: .15 });
}
function dmgText(x, y, text, color, big = false, small = false) {
  if (!Save.data.settings.numbers && typeof text === 'number') return;
  G.texts.push({ x, y, text: String(text), color, big, small, t: 0, dur: big ? .9 : .7, vx: rand(-12, 12) });
}
function shake(a) { G.shake = Math.max(G.shake, a * Save.data.settings.shake); }

/* ---------------- PROJECTILES ---------------- */
function shoot(owner, x, y, ang, spd, o = {}) {
  const team = o.team || (owner && owner.team === 'enemy' ? 'enemy' : 'player');
  const pr = { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, spd, r: o.r || 2.5, dmg: o.dmg || 5, team, owner, kind: o.kind || 'bolt', life: o.life || 2.4, pierce: o.pierce || 0, hit: new Set(), splash: o.splash || 0, elem: o.elem, proc: o.proc, homing: o.homing || 0, color: o.color, weaponHit: o.weaponHit, t: 0, accel: o.accel || 0 };
  G.proj.push(pr); return pr;
}
const PROJ_COL = { arrow: '#e8dcc0', orb: '#9ab8ff', spark: '#f0e0ff', fireball: '#ff8a30', fire: '#ff7a2a', ice: '#bfe8ff', bone: '#e8e0d0', knife: '#d0d4dc', dark: '#b060ff', thorn: '#8ad04a', holy: '#fff0a0', bolt: '#ff6a8a', boss: '#ff5a6a', ink: '#303050', water: '#6ae0f0' };
function updateProjectiles(dt) {
  const p = G.p;
  for (const pr of G.proj) {
    pr.t += dt; pr.life -= dt;
    if (pr.accel) { const s = Math.hypot(pr.vx, pr.vy), ns = s + pr.accel * dt; pr.vx *= ns / s; pr.vy *= ns / s; }
    if (pr.homing) {
      let tgt = null;
      if (pr.team === 'enemy') tgt = p.stealth > 0 ? null : p;
      else { let bd = 140; for (const e of G.ents) { if (e.dead || e.spawnT > 0) continue; const d = Math.hypot(e.x - pr.x, e.y - pr.y); if (d < bd) { bd = d; tgt = e; } } }
      if (tgt) { const a = Math.atan2(tgt.y - 5 - pr.y, tgt.x - pr.x), ca = Math.atan2(pr.vy, pr.vx); const na = ca + clamp(angDiff(ca, a), -pr.homing * dt * 3, pr.homing * dt * 3); const s = Math.hypot(pr.vx, pr.vy); pr.vx = Math.cos(na) * s; pr.vy = Math.sin(na) * s; }
    }
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (Math.random() < .5) G.parts.push(part(pr.x, pr.y, -pr.vx * .05, -pr.vy * .05, .2, pr.color || PROJ_COL[pr.kind] || '#fff', 1, true));
    // walls
    if (solidPx(pr.x, pr.y + 5)) {
      const tx = Math.floor(pr.x / TS), ty = Math.floor((pr.y + 5) / TS);
      if (pr.team === 'player' && tileAt(tx, ty) === T_CRACK) breakWall(tx, ty);
      projEnd(pr); continue;
    }
    if (pr.life <= 0) { projEnd(pr); continue; }
    if (pr.team === 'player') {
      for (const e of G.ents) {
        if (e.dead || e.spawnT > 0 || e.hidden || e.air > 0 || pr.hit.has(e)) continue;
        if (Math.hypot(e.x - pr.x, e.y - 5 - pr.y) < e.r + pr.r + (e.boss ? e.def.scale * 3 : 2)) {
          if (e.dormant) { wakeMimic(e); }
          pr.hit.add(e);
          if (pr.splash) { projEnd(pr); break; }
          hitEnemy(pr.owner && pr.owner.team === 'ally' ? pr.owner : G.p, e, pr.dmg, { kb: 40, proc: pr.proc, elem: pr.elem, weaponHit: pr.weaponHit });
          if (pr.pierce-- <= 0) { pr.dead = true; break; }
        }
      }
      if (!pr.dead) for (const pp of G.props) if (pp.hp && !pp.dead && Math.hypot(pp.x - pr.x, pp.y - 4 - pr.y) < 8) { breakProp(pp); if (!pr.splash) pr.dead = true; else projEnd(pr); break; }
    } else {
      if (!p.dead && Math.hypot(p.x - pr.x, p.y - 5 - pr.y) < p.r + pr.r + 1 && p.stealth <= 0) { hurtPlayer(pr.dmg, pr.owner, { elem: pr.elem }); projEnd(pr); continue; }
      for (const a of G.allies) if (Math.hypot(a.x - pr.x, a.y - 5 - pr.y) < a.r + pr.r) { hurtAlly(a, pr.dmg); projEnd(pr); break; }
    }
  }
  G.proj = G.proj.filter(pr => !pr.dead);
}
function projEnd(pr) {
  if (pr.dead) return; pr.dead = true;
  if (pr.splash) {
    aoe(pr.team === 'enemy' ? pr.owner || { team: 'enemy' } : (pr.owner && pr.owner.team === 'ally' ? pr.owner : G.p), pr.x, pr.y + 3, pr.splash, pr.dmg, { elem: pr.elem, kb: 80, color: pr.color || PROJ_COL[pr.kind], proc: pr.proc });
    fxBurst(pr.x, pr.y, pr.color || PROJ_COL[pr.kind] || '#fff', 14, 70);
    if (pr.kind === 'fireball') Sfx.play('fire');
  } else fxBurst(pr.x, pr.y, pr.color || PROJ_COL[pr.kind] || '#fff', 4, 30);
}

/* ---------------- ZONES (clouds, burning ground, holy ground, traps, arrow rain) ---------------- */
function addZone(owner, x, y, r, dur, dps, kind, o = {}) {
  const z = Object.assign({ x, y, r, dur, t: 0, dps, kind, owner, team: owner && owner.team === 'enemy' ? 'enemy' : 'player', tick: 0 }, o);
  G.zones.push(z); return z;
}
const ZONE_COL = { poison: '120,220,70', fire: '255,120,40', holy: '255,230,140', rain: '220,210,180', trap: '160,140,120', lava: '255,100,30', ink: '20,15,40', spore: '150,200,80', frost: '170,220,255', void: '150,90,255' };
function updateZones(dt) {
  const p = G.p;
  for (const z of G.zones) {
    z.t += dt; z.tick -= dt;
    if (z.kind === 'trap') {
      if (z.t > .5) for (const e of G.ents) if (!e.dead && e.spawnT <= 0 && !e.def.fly && Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) { hitEnemy(p, e, z.dps, { proc: true }); applyStatus(e, 'root', 2); fxBurst(z.x, z.y, '#c8b090', 12, 50); Sfx.play('spike'); z.t = z.dur; break; }
      continue;
    }
    if (z.kind === 'rain' && Math.random() < dt * 30) { const a = rand(TAU), d = rand(z.r); G.fx.push({ type: 'arrowfall', x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, t: 0, dur: .2 }); }
    if (Math.random() < dt * (z.r / 4)) { const a = rand(TAU), d = rand(z.r); const c = ZONE_COL[z.kind] || '255,255,255'; G.parts.push(part(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 0, -rand(8, 20), rand(.4, .8), `rgb(${c})`, 1, z.kind !== 'ink')); }
    if (z.tick > 0) continue;
    z.tick = .25;
    if (z.team === 'player') {
      for (const e of G.ents) if (!e.dead && e.spawnT <= 0 && !e.hidden && Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) hitEnemy(z.owner && z.owner.team === 'ally' ? z.owner : p, e, z.dps * .25, { noCrit: z.kind !== 'rain', elem: z.kind === 'poison' ? 'poison' : z.kind === 'fire' ? 'fire' : undefined, holy: z.kind === 'holy' });
      if (z.kind === 'holy' && Math.hypot(p.x - z.x, p.y - z.y) < z.r) p.hp = Math.min(p.S.maxHp, p.hp + p.S.maxHp * .005);
    } else {
      if (z.t > (z.arm || 0) && Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r && !p.leap) {
        if (z.kind === 'ink') applyStatus(p, 'chill', .5);
        if (z.dps) hurtPlayer(z.dps * .25, null, { dot: true, color: z.kind === 'poison' || z.kind === 'spore' ? '#9ae05a' : '#ff9a40' });
        if (z.kind === 'fire' || z.kind === 'lava') applyStatus(p, 'burn', 1.5, z.dps * .15);
        if (z.kind === 'spore' || z.kind === 'poison') applyStatus(p, 'poison', 2, z.dps * .1);
      }
      for (const a of G.allies) if (z.dps && Math.hypot(a.x - z.x, a.y - z.y) < z.r) hurtAlly(a, z.dps * .25);
    }
  }
  G.zones = G.zones.filter(z => z.t < z.dur);
}

/* ---------------- TELEGRAPHS: warning shapes that resolve after a delay ---------------- */
function tele(o) { o.t = 0; o.team = o.team || 'enemy'; o.color = o.color || '255,60,50'; G.teles.push(o); return o; }
function inTele(o, x, y, r) {
  if (o.kind === 'circle') return Math.hypot(x - o.x, y - o.y) < o.r + r;
  if (o.kind === 'line') { const ex = o.x + Math.cos(o.ang) * o.len, ey = o.y + Math.sin(o.ang) * o.len; const l2 = o.len * o.len; let t = ((x - o.x) * (ex - o.x) + (y - o.y) * (ey - o.y)) / l2; t = clamp(t, 0, 1); return Math.hypot(x - (o.x + t * (ex - o.x)), y - (o.y + t * (ey - o.y))) < o.w / 2 + r; }
  if (o.kind === 'cone') { const d = Math.hypot(x - o.x, y - o.y); return d < o.len + r && Math.abs(angDiff(o.ang, Math.atan2(y - o.y, x - o.x))) < o.arc / 2; }
  return false;
}
function updateTeles(dt) {
  for (const o of G.teles) {
    o.t += dt;
    if (o.follow && o.t < o.dur * .5) { o.x = lerp(o.x, G.p.x, dt * 3); o.y = lerp(o.y, G.p.y, dt * 3); }
    if (o.t >= o.dur) {
      o.done = true;
      if (o.team === 'enemy' && o.dmg) {
        if (inTele(o, G.p.x, G.p.y, G.p.r)) hurtPlayer(o.dmg, o.src, { elem: o.elem });
        for (const a of G.allies) if (inTele(o, a.x, a.y, a.r)) hurtAlly(a, o.dmg);
        if (o.kind === 'circle') { fxRing(o.x, o.y, o.r, `rgb(${o.color})`); fxBurst(o.x, o.y, `rgb(${o.color})`, 10, o.r * 2); }
      }
      if (o.onDone) o.onDone(o);
    }
  }
  G.teles = G.teles.filter(o => !o.done);
}

/* ---------------- ENEMIES ---------------- */
function enemyScale() {
  const R = G.run, diff = DIFFS[R.diff];
  return { hp: (1 + R.depth * .3 + Math.max(0, R.depth - 12) * .15) * diff.hp, dmg: (1 + R.depth * .16) * diff.dmg };
}
function spawnEnemy(id, x, y, o = {}) {
  const d = ENEMIES[id], sc = enemyScale();
  const e = {
    id, def: d, team: 'enemy', x, y, vx: 0, vy: 0, r: d.r || 5, hp: d.hp * sc.hp, maxHp: d.hp * sc.hp, dmg: d.dmg * sc.dmg, spd: d.spd * rand(.92, 1.08),
    xp: Math.round(d.xp * (1 + G.run.depth * .12)), status: {}, atkT: rand(.6, 1.6), t: rand(5), wind: 0, flash: 0, roomId: o.room !== undefined ? o.room : -1,
    spawnT: o.delay !== undefined ? o.delay : .5, scale: d.scale || 1, face: 1, uid: UID++, armor: d.armor || 0, strafe: chance(.5) ? 1 : -1, elite: null, fastMul: 1, minionOf: o.minionOf
  };
  if (d.ai === 'mimic') e.dormant = true;
  if (d.ai === 'thief') { e.thief = true; e.life = 18; }
  if (o.elite) makeElite(e, o.eliteCount || (G.run.depth > 10 && chance(.4) ? 2 : 1));
  G.ents.push(e);
  if (!Save.data.bestiary[id]) Save.data.bestiary[id] = { seen: 1, kills: 0 };
  return e;
}
function makeElite(e, n = 1) {
  const mods = shuffle(Object.keys(ELITE_MODS)).slice(0, n);
  e.elite = mods;
  e.hp = e.maxHp = e.maxHp * 2.6; e.dmg *= 1.3; e.xp *= 3; e.scale *= 1.15;
  for (const m of mods) {
    if (m === 'fast') e.fastMul = 1.45;
    if (m === 'giant') { e.scale *= 1.4; e.r *= 1.35; e.hp = e.maxHp = e.maxHp * 1.8; e.giant = true; }
    if (m === 'armored') e.armor = Math.max(e.armor, .45);
  }
  e.name = mods.map(m => ELITE_MODS[m].name).join(' ') + ' ' + e.def.name;
}
function spawnChampion(q) {
  const B = BIOMES[G.run.bi];
  const pool = B.enemies.filter(id => ['tank', 'melee'].includes(ENEMIES[id].ai));
  const e = spawnEnemy(pick(pool.length ? pool : B.enemies), q.cx * TS, q.cy * TS, { room: q.id, elite: true, eliteCount: 3, delay: .6 });
  e.hp = e.maxHp = e.maxHp * 2.2; e.champion = true; e.name = 'Champion ' + e.def.name; e.xp *= 2;
  G.fx.push({ type: 'portal', x: e.x, y: e.y, t: 0, dur: .8, big: true });
  return e;
}
function wakeMimic(e) { if (!e.dormant) return; e.dormant = false; e.spawnT = 0; shake(4); Sfx.play('boss'); toast('It was a Mimic!'); fxBurst(e.x, e.y - 6, '#ffe080', 16, 60); }
function pickTarget(e) {
  e.tgtT = (e.tgtT || 0) - 1;
  if (e.tgt && !e.tgt.dead && e.tgtT > 0 && (e.tgt !== G.p || G.p.stealth <= 0)) return e.tgt;
  e.tgtT = 30;
  let best = null, bd = 1e9;
  const p = G.p;
  if (!p.dead && p.stealth <= 0) { best = p; bd = Math.hypot(p.x - e.x, p.y - e.y) * .85; }
  for (const a of G.allies) { const d = Math.hypot(a.x - e.x, a.y - e.y); if (d < bd) { bd = d; best = a; } }
  e.tgt = best; return best;
}
function steer(e, tgt, spd, dt, mode = 'to') {
  let dx, dy;
  if (mode === 'away') { const a = Math.atan2(e.y - tgt.y, e.x - tgt.x); dx = Math.cos(a); dy = Math.sin(a); }
  else if (mode === 'strafe') { const a = angTo(e, tgt) + Math.PI / 2 * e.strafe; dx = Math.cos(a); dy = Math.sin(a); }
  else if (tgt === G.p && !e.def.fly && !los(e.x, e.y, tgt.x, tgt.y)) { const f = flowDir(e); if (f) { dx = f.x; dy = f.y; } else { const a = angTo(e, tgt); dx = Math.cos(a); dy = Math.sin(a); } }
  else { const a = angTo(e, tgt); dx = Math.cos(a); dy = Math.sin(a); }
  const bl = moveEnt(e, dx * spd * dt, dy * spd * dt);
  if (bl && mode === 'strafe') e.strafe *= -1;
  if (Math.abs(dx) > .1) e.face = dx < 0 ? -1 : 1;
  e.moving = true;
  return bl;
}
function enemyStrike(e, tgt, dmg, o = {}) {
  if (tgt === G.p) {
    const before = G.p.hp;
    const elem = o.elem || e.def.elem || (e.elite && e.elite.includes('burning') ? 'fire' : e.elite && e.elite.includes('frozen') ? 'ice' : undefined);
    hurtPlayer(dmg, e, { elem });
    if (e.elite && e.elite.includes('vampiric') && G.p.hp < before) { e.hp = Math.min(e.maxHp, e.hp + dmg * 1.5); fxBeam(G.p.x, G.p.y - 6, e.x, e.y - 6, '#e03050', .2); }
  } else hurtAlly(tgt, dmg);
}
function updateEnemy(e, dt) {
  if (e.spawnT > 0) { e.spawnT -= dt; return; }
  if (e.dormant) { if (Math.hypot(G.p.x - e.x, G.p.y - e.y) < 22) wakeMimic(e); return; }
  e.t += dt; e.flash = Math.max(0, e.flash - dt); e.moving = false;
  tickStatus(e, dt); if (e.dead) return;
  if (Math.abs(e.vx) + Math.abs(e.vy) > 1) { moveEnt(e, e.vx * dt, e.vy * dt); const k = Math.pow(.002, dt); e.vx *= k; e.vy *= k; } else { e.vx = e.vy = 0; }
  // hazards
  const tt = tileAt(Math.floor(e.x / TS), Math.floor(e.y / TS));
  if (tt === T_LIQ && !e.def.fly && !e.boss) { e.hazT = (e.hazT || 0) - dt; if (e.hazT <= 0) { e.hazT = .5; const L = BIOMES[G.run.bi].liquid; if (L === 'lava' && e.def.elem !== 'fire') applyStatus(e, 'burn', 2, e.maxHp * .03); if (L === 'poison') applyStatus(e, 'poison', 2, e.maxHp * .02); } }
  const sm = speedMult(e);
  if (e.boss) { bossUpdate(e, dt, sm); return; }
  if (sm === 0) { e.wind = 0; return; }
  if (e.buffT > 0) e.buffT -= dt;
  const tgt = pickTarget(e);
  // elite behaviours
  if (e.elite) {
    e.eliteT = (e.eliteT || 0) - dt;
    if (e.elite.includes('burning') && e.moving !== false && e.eliteT <= 0) { e.eliteT = .9; addZone({ team: 'enemy' }, e.x, e.y, 10, 2.5, e.dmg * .5, 'fire'); }
    if (e.elite.includes('blinking') && tgt && (e.blinkT = (e.blinkT || 3) - dt) <= 0) { e.blinkT = 3.5; const a = rand(TAU); const s = findFree(tgt.x + Math.cos(a) * 40, tgt.y + Math.sin(a) * 40, e); if (roomAt(s.x, s.y) === roomAt(e.x, e.y)) { fxBurst(e.x, e.y - 6, '#b080ff', 12, 50); e.x = s.x; e.y = s.y; fxBurst(e.x, e.y - 6, '#b080ff', 12, 50); } }
  }
  if (!tgt) { e.wind = 0; if (e.def.ai === 'thief') thiefAI(e, dt, sm); return; }
  const spd = e.spd * sm * (e.buffT > 0 ? 1.2 : 1);
  const dmg = e.dmg * (e.buffT > 0 ? 1.3 : 1);
  switch (e.def.ai) {
    case 'melee': case 'dodger': case 'mimic': meleeAI(e, tgt, dt, spd, dmg); break;
    case 'ranged': rangedAI(e, tgt, dt, spd, dmg); break;
    case 'tank': tankAI(e, tgt, dt, spd, dmg); break;
    case 'flyer': flyerAI(e, tgt, dt, spd, dmg); break;
    case 'support': supportAI(e, tgt, dt, spd, dmg); break;
    case 'summoner': summonerAI(e, tgt, dt, spd, dmg); break;
    case 'caster': casterAI(e, tgt, dt, spd, dmg); break;
    case 'slime': slimeAI(e, tgt, dt, spd, dmg); break;
    case 'thief': thiefAI(e, dt, sm); break;
  }
}
function meleeAI(e, tgt, dt, spd, dmg) {
  const d = dist(e, tgt), reach = e.r + tgt.r + 7;
  if (e.wind > 0) {
    e.wind -= dt;
    if (e.wind <= 0) { e.lunge = .12; if (dist(e, tgt) < reach + 8) enemyStrike(e, tgt, dmg); e.atkT = rand(.9, 1.4) / e.fastMul; }
    return;
  }
  e.atkT -= dt;
  if (e.def.ai === 'dodger') {
    e.dodgeT = (e.dodgeT || 0) - dt;
    if (G.p.swing > .1 && d < 50 && e.dodgeT <= 0 && chance(.5)) { e.dodgeT = 1.4; const a = angTo(G.p, e) + (chance(.5) ? 1.3 : -1.3); e.vx += Math.cos(a) * 170; e.vy += Math.sin(a) * 170; }
  }
  if (d < reach) { if (e.atkT <= 0) { e.wind = .38 / e.fastMul; e.windAng = angTo(e, tgt); } }
  else steer(e, tgt, spd * (e.def.ai === 'mimic' ? 1.2 : 1), dt);
}
function rangedAI(e, tgt, dt, spd, dmg) {
  const d = dist(e, tgt), see = los(e.x, e.y - 4, tgt.x, tgt.y - 4);
  if (e.wind > 0) {
    e.wind -= dt;
    if (e.wind <= 0) {
      const lead = tgt === G.p ? .15 : 0;
      const a = Math.atan2(tgt.y + (tgt.vy || 0) * lead - e.y, tgt.x + (tgt.vx || 0) * lead - e.x);
      shoot(e, e.x, e.y - 6, a, e.def.proj === 'arrow' ? 175 : 125, { dmg, kind: e.def.proj || 'bolt', team: 'enemy', elem: e.def.elem });
      Sfx.play(e.def.proj === 'arrow' ? 'arrow' : 'shoot');
      e.atkT = rand(1.4, 2.2) / e.fastMul;
    }
    return;
  }
  e.atkT -= dt;
  e.strafeT = (e.strafeT || 0) - dt; if (e.strafeT <= 0) { e.strafeT = rand(1, 2); e.strafe *= -1; }
  if (d < 70) steer(e, tgt, spd, dt, 'away');
  else if (d > 150 || !see) steer(e, tgt, spd, dt);
  else steer(e, tgt, spd * .5, dt, 'strafe');
  if (e.atkT <= 0 && see && d < 230) { e.wind = .4; e.face = tgt.x < e.x ? -1 : 1; }
}
function casterAI(e, tgt, dt, spd, dmg) {
  const d = dist(e, tgt), see = los(e.x, e.y - 4, tgt.x, tgt.y - 4) || e.def.ghost;
  e.atkT -= dt;
  e.strafeT = (e.strafeT || 0) - dt; if (e.strafeT <= 0) { e.strafeT = rand(1, 2.4); e.strafe *= -1; }
  if (d < 80) steer(e, tgt, spd, dt, 'away'); else if (d > 160 || !see) steer(e, tgt, spd, dt); else steer(e, tgt, spd * .4, dt, 'strafe');
  if (e.atkT <= 0 && see && d < 240) {
    e.atkT = rand(2, 2.8) / e.fastMul;
    if (chance(.5)) {
      const x = tgt.x, y = tgt.y;
      tele({ kind: 'circle', x, y, r: 22, dur: .95, dmg: dmg * 1.2, src: e, elem: e.def.elem, color: e.def.proj === 'ice' ? '150,210,255' : e.def.proj === 'thorn' ? '120,200,70' : '200,90,255' });
    } else {
      const a = angTo(e, tgt);
      for (let i = -1; i <= 1; i++) shoot(e, e.x, e.y - 6, a + i * .22, 105, { dmg: dmg * .8, kind: e.def.proj || 'dark', team: 'enemy', elem: e.def.elem, homing: .6, life: 2.6 });
      Sfx.play('shoot');
    }
  }
}
function tankAI(e, tgt, dt, spd, dmg) {
  const d = dist(e, tgt);
  if (e.charging) {
    const c = e.charging; c.t -= dt;
    if (c.phase === 0) { if (c.t <= 0) { c.phase = 1; c.t = .45; Sfx.play('dash'); } return; }
    const bl = moveEnt(e, Math.cos(c.ang) * spd * 4.2 * dt, Math.sin(c.ang) * spd * 4.2 * dt);
    if (!c.hit && Math.hypot(tgt.x - e.x, tgt.y - e.y) < e.r + tgt.r + 4) { c.hit = true; enemyStrike(e, tgt, dmg * 1.3); if (tgt === G.p) { G.p.vx += Math.cos(c.ang) * 200; G.p.vy += Math.sin(c.ang) * 200; } }
    if (Math.random() < .5) G.parts.push(part(e.x, e.y, rand(-20, 20), rand(-20, 0), .4, '#a09080', 1));
    if (c.t <= 0 || bl) { e.charging = null; if (bl) { shake(3); e.status.stun = { t: .8 }; } }
    return;
  }
  e.chargeT = (e.chargeT || rand(1.5, 3)) - dt;
  if (d < 140 && d > 30 && e.chargeT <= 0 && los(e.x, e.y, tgt.x, tgt.y)) {
    e.chargeT = rand(3.5, 5); const a = angTo(e, tgt);
    e.charging = { phase: 0, t: .6, ang: a };
    tele({ kind: 'line', x: e.x, y: e.y, ang: a, len: spd * 4.2 * .45 + 10, w: e.r * 2 + 6, dur: .6, color: '255,120,60' });
    return;
  }
  meleeAI(e, tgt, dt, spd, dmg);
}
function flyerAI(e, tgt, dt, spd, dmg) {
  const d = dist(e, tgt);
  e.retreat = (e.retreat || 0) - dt; e.atkT -= dt;
  let a = angTo(e, tgt) + Math.sin(e.t * 4 + e.uid) * .9;
  if (e.retreat > 0) a += Math.PI;
  moveEnt(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
  e.face = Math.cos(a) < 0 ? -1 : 1; e.moving = true;
  if (d < e.r + tgt.r + 4 && e.atkT <= 0) { enemyStrike(e, tgt, dmg); e.atkT = 1.1; e.retreat = .45; }
}
function supportAI(e, tgt, dt, spd, dmg) {
  e.atkT -= dt; e.healT = (e.healT || 2) - dt;
  let ally = null, lo = 1;
  for (const o of G.ents) if (o !== e && !o.dead && !o.boss && o.spawnT <= 0 && Math.hypot(o.x - e.x, o.y - e.y) < 150) { const f = o.hp / o.maxHp; if (f <= lo) { lo = f; ally = o; } }
  const d = dist(e, tgt);
  if (d < 90) steer(e, tgt, spd, dt, 'away'); else if (ally && dist(e, ally) > 50) steer(e, ally, spd, dt); else steer(e, tgt, spd * .4, dt, 'strafe');
  if (e.healT <= 0 && ally) { e.healT = 3.5; ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * .22); ally.buffT = 5; fxBeam(e.x, e.y - 6, ally.x, ally.y - 6, '#7bd88a', .35); fxBurst(ally.x, ally.y - 6, '#7bd88a', 10, 40); dmgText(ally.x, ally.y - 14, '+heal', '#7bd88a'); }
  if (e.atkT <= 0 && d < 200 && los(e.x, e.y, tgt.x, tgt.y)) { e.atkT = rand(2, 3); shoot(e, e.x, e.y - 6, angTo(e, tgt), 115, { dmg: dmg * .8, kind: e.def.proj || 'dark', team: 'enemy' }); }
}
function summonerAI(e, tgt, dt, spd, dmg) {
  e.atkT -= dt; e.sumT = (e.sumT || 1.5) - dt;
  const d = dist(e, tgt);
  if (d < 110) steer(e, tgt, spd, dt, 'away'); else if (d > 180) steer(e, tgt, spd, dt); else steer(e, tgt, spd * .4, dt, 'strafe');
  if (e.sumT <= 0) {
    e.sumT = 5.5;
    const mine = G.ents.filter(o => o.minionOf === e.uid && !o.dead).length;
    for (let i = 0; i < Math.min(2, 4 - mine); i++) {
      const s = findFree(e.x + rand(-24, 24), e.y + rand(-24, 24), { r: 5 });
      const m = spawnEnemy(e.def.summon, s.x, s.y, { room: e.roomId, delay: .5, minionOf: e.uid }); m.xp = 1;
      G.fx.push({ type: 'portal', x: s.x, y: s.y, t: 0, dur: .6 });
    }
    Sfx.play('summon');
  }
  if (e.atkT <= 0 && d < 220 && los(e.x, e.y, tgt.x, tgt.y)) { e.atkT = rand(2.2, 3); shoot(e, e.x, e.y - 6, angTo(e, tgt), 110, { dmg, kind: e.def.proj || 'orb', team: 'enemy' }); }
}
function slimeAI(e, tgt, dt, spd, dmg) {
  e.hopT = (e.hopT || rand(.5, 1)) - dt; e.atkT -= dt;
  if (e.hopT <= 0) { e.hopT = rand(.7, 1.1); const a = angTo(e, tgt) + rand(-.4, .4); e.vx += Math.cos(a) * spd * 3.2; e.vy += Math.sin(a) * spd * 3.2; e.hop = .3; e.face = Math.cos(a) < 0 ? -1 : 1; }
  if (e.hop > 0) e.hop -= dt;
  if (dist(e, tgt) < e.r + tgt.r + 3 && e.atkT <= 0) { e.atkT = .9; enemyStrike(e, tgt, dmg); }
}
function thiefAI(e, dt, sm) {
  e.life -= dt;
  const p = G.p, d = dist(e, p);
  if (d < 170) steer(e, p, e.spd * sm, dt, 'away');
  else { e.wander = (e.wander || 0) - dt; if (e.wander <= 0) { e.wander = 1; e.wa = rand(TAU); } moveEnt(e, Math.cos(e.wa) * e.spd * .5 * dt, Math.sin(e.wa) * e.spd * .5 * dt); }
  if (Math.random() < dt * 8) G.parts.push(part(e.x, e.y - 8, rand(-10, 10), -20, .5, '#ffd040', 1, true));
  if (e.life <= 0) { e.dead = true; e.escaped = true; fxBurst(e.x, e.y - 6, '#ffd040', 30, 80); toast('The Treasure Goblin escaped with its loot!'); Sfx.play('zap'); }
}

function killEnemy(e, src) {
  if (e.dead) return; e.dead = true;
  const p = G.p, R = G.run;
  const col = e.def.tpl === 'skel' ? '#e0d8c8' : e.def.tpl === 'slime' ? (e.def.pal['2']) : '#a02a2a';
  fxBurst(e.x, e.y - 6, col, e.boss ? 60 : 14, e.boss ? 150 : 70, { glow: false });
  fxDebris(e.x, e.y - 4, col, e.boss ? 30 : 8);
  G.fx.push({ type: 'death', x: e.x, y: e.y, spr: entSprite(e), scale: e.scale * (e.boss ? e.def.scale : 1), face: e.face, t: 0, dur: .5 });
  Sfx.play('die');
  if (e.boss) { bossDefeated(e); return; }
  if (!e.minionOf || chance(.4)) G.corpses.push({ x: e.x, y: e.y, id: e.id, t: 0 });
  if (G.corpses.length > 30) G.corpses.shift();
  R.stats.kills++; Save.data.stats.kills++;
  const B = Save.data.bestiary[e.id] || (Save.data.bestiary[e.id] = { seen: 1, kills: 0 }); B.kills++;
  unlockAch('firstblood');
  if (R.stats.kills >= 150) unlockAch('centurion');
  if (e.elite) { R.stats.elites++; Save.data.stats.elites++; if (Save.data.stats.elites >= 25) unlockAch('elite'); }
  gainXP(e.xp);
  rollDrops(e);
  // kill streaks
  p.streak++; p.streakT = 3;
  const calls = { 3: 'Triple Kill', 5: 'Rampage', 8: 'Massacre', 12: 'Unstoppable', 15: 'Godlike', 20: 'Legendary' };
  if (calls[p.streak]) { G.streakMsg = { text: calls[p.streak], t: 1.6 }; dropGold(p.x, p.y, p.streak * 2); if (p.streak >= 15) unlockAch('streak'); }
  if (p.S.killShield) { p.shield = Math.min(p.S.maxHp * .5, p.shield + p.S.killShield); p.shieldT = Math.max(p.shieldT, 8); }
  if (p.S.killHeal) healPlayer(p.S.killHeal); if (p.S.killMana) p.mp = Math.min(p.S.maxMp, p.mp + p.S.killMana);
  if (hasPower(p, 'vampire')) healPlayer(p.S.maxHp * .03);
  if (hasPower(p, 'soul')) summonAlly('skeleton', e.x, e.y, { life: 10, power: .5, temp: true });
  else if (p.cls === 'necro' && chance(.12)) summonAlly('skeleton', e.x, e.y, { life: 12, power: .45, temp: true });
  // elite death explosion
  if (e.elite && e.elite.includes('explosive')) { const x = e.x, y = e.y, dmg = e.dmg * 1.5; tele({ kind: 'circle', x, y, r: 36, dur: .6, dmg, color: '255,90,30', onDone: () => { Sfx.play('boom'); shake(5); fxDebris(x, y, '#ff6a2a', 20); } }); }
  // slime split
  if (e.def.split && !e.small) for (let i = 0; i < 2; i++) {
    const s = spawnEnemy(e.id, e.x + rand(-6, 6), e.y + rand(-6, 6), { room: e.roomId, delay: 0 });
    s.small = true; s.scale = .65; s.r = 3.5; s.hp = s.maxHp = e.maxHp * .35 / (e.elite ? 2.6 : 1); s.xp = Math.ceil(e.xp * .3); s.vx = rand(-90, 90); s.vy = rand(-90, 90);
  }
}
function rollDrops(e) {
  const p = G.p, R = G.run, lf = p.S.lf, diff = DIFFS[R.diff];
  const goldAmt = randi(2, 5) * (1 + R.depth * .22) * p.S.goldMult * (1 + lf * .8);
  if (e.thief) { dropGold(e.x, e.y, goldAmt * 18); dropItem(e.x, e.y, genItem({ minR: 2 })); if (chance(.5)) dropBoon(e.x, e.y); toast('You caught the Treasure Goblin!', 'ach'); return; }
  if (e.def.ai === 'mimic') { dropGold(e.x, e.y, goldAmt * 6); dropItem(e.x, e.y, genItem({ minR: 2 })); return; }
  if (chance(e.elite ? 1 : .5)) dropGold(e.x, e.y, goldAmt * (e.elite ? 4 : 1) * (e.champion ? 3 : 1));
  if (chance((e.elite ? .4 : .045) * (1 + lf) * diff.loot)) dropItem(e.x, e.y, genItem({ minR: e.elite ? 1 : 0 }));
  if (chance((e.elite ? .2 : .005) * (1 + lf))) dropBoon(e.x, e.y);
  if (chance(.03 * diff.heal)) dropPickup(e.x, e.y, 'potion');
  else if (chance(.07 * diff.heal)) dropPickup(e.x, e.y, 'heart');
}

/* ---------------- ALLIES / SUMMONS ---------------- */
const ALLY_PAL_CACHE = {};
function summonAlly(kind, x, y, o = {}) {
  const d = ENEMIES[kind] || ENEMIES.skeleton, p = G.p;
  const hp = (40 + p.level * 10) * Math.sqrt(d.hp / 26) * (o.raised ? 1.2 : 1);
  const pos = findFree(x, y, { r: 5 });
  const a = {
    kind, def: d, team: 'ally', x: pos.x, y: pos.y, vx: 0, vy: 0, r: d.r || 5, hp, maxHp: hp, dmg: abilityPower(p) * (o.power || .5) * p.S.summonDmg,
    life: (o.life || 20) * p.S.summonLife, atkT: .5, wind: 0, status: {}, face: 1, flash: 0, uid: UID++, scale: (d.scale || 1) * (o.raised ? 1 : .95), temp: o.temp, t: 0
  };
  if (G.allies.length >= 12) { const old = G.allies.find(x => !x.dead); if (old) old.dead = true; }
  G.allies.push(a);
  G.fx.push({ type: 'portal', x: a.x, y: a.y, t: 0, dur: .5, ally: true });
  return a;
}
function hurtAlly(a, d) { if (a.dead) return; a.hp -= d; a.flash = .1; if (a.hp <= 0) { a.dead = true; fxBurst(a.x, a.y - 6, '#9fff7a', 12, 50); } }
function updateAlly(a, dt) {
  a.t += dt; a.life -= dt; a.flash = Math.max(0, a.flash - dt);
  tickStatus(a, dt);
  if (a.life <= 0 || a.hp <= 0) { a.dead = true; fxBurst(a.x, a.y - 6, '#9fff7a', 10, 40); return; }
  if (Math.abs(a.vx) + Math.abs(a.vy) > 1) { moveEnt(a, a.vx * dt, a.vy * dt); a.vx *= .85; a.vy *= .85; }
  const p = G.p; let tgt = null, bd = 170;
  for (const e of G.ents) { if (e.dead || e.spawnT > 0 || e.hidden || e.dormant || e.air > 0) continue; const d = Math.hypot(e.x - a.x, e.y - a.y); if (d < bd) { bd = d; tgt = e; } }
  const spd = (a.def.spd || 40) * 1.3 * speedMult(a);
  a.moving = false;
  const ranged = ['ranged', 'caster', 'support', 'summoner'].includes(a.def.ai);
  if (tgt) {
    const d = dist(a, tgt);
    if (ranged) {
      if (d > 120) steerAlly(a, tgt, spd, dt);
      a.atkT -= dt; if (a.atkT <= 0 && d < 200) { a.atkT = 1.5; shoot(a, a.x, a.y - 6, angTo(a, tgt), 170, { dmg: a.dmg, kind: a.def.proj || 'bolt', team: 'player', color: '#9fff7a' }); }
    } else {
      if (a.wind > 0) { a.wind -= dt; if (a.wind <= 0) { if (dist(a, tgt) < a.r + tgt.r + 12) hitEnemy(a, tgt, a.dmg, { kb: 60 }); a.atkT = .9; } }
      else if (d < a.r + tgt.r + 7) { a.atkT -= dt; if (a.atkT <= 0) a.wind = .22; }
      else steerAlly(a, tgt, spd, dt);
    }
    a.face = tgt.x < a.x ? -1 : 1;
  } else if (dist(a, p) > 36) steerAlly(a, p, spd, dt);
}
function steerAlly(a, tgt, spd, dt) { const an = angTo(a, tgt); moveEnt(a, Math.cos(an) * spd * dt, Math.sin(an) * spd * dt); a.face = Math.cos(an) < 0 ? -1 : 1; a.moving = true; }

/* ---------------- PICKUPS & PROPS ---------------- */
function dropPickup(x, y, kind, o = {}) {
  const pk = Object.assign({ kind, x, y, z: 0, vz: rand(60, 110), vx: rand(-40, 40), vy: rand(-40, 40), t: 0, uid: UID++ }, o);
  G.drops.push(pk); return pk;
}
function dropGold(x, y, amt) {
  amt = Math.max(1, Math.round(amt));
  const n = Math.min(7, Math.ceil(amt / 6));
  for (let i = 0; i < n; i++) dropPickup(x, y, 'gold', { amt: Math.max(1, Math.round(amt / n)) });
}
function dropItem(x, y, it) { registerFind(it); const d = dropPickup(x, y, 'item', { item: it }); if (it.rar >= 3) { toast(`${RARITIES[it.rar].name} drop: ${it.name}`, 'r' + it.rar); } return d; }
function dropBoon(x, y, rare) { dropPickup(x, y, 'boon', { rare: rare !== undefined ? rare : chance(.12 + G.p.S.lf * .35) }); }
function grantBoon(rare) {
  const p = G.p;
  const pool = BOONS.filter(b => !!b.rare === !!rare && (!b.mods.revive || !(p.mods.revive > 0)));
  const b = pick(pool);
  addMod(p, b.mods); p.boons.push(b.id);
  banner(rare ? 'Rare power-up' : 'Power-up', `${b.name}: ${b.desc}`);
  Sfx.play('levelup'); fxBurst(p.x, p.y - 6, rare ? '#ff9aff' : '#ffe080', 30, 80);
  return b;
}
function updateDrops(dt) {
  const p = G.p;
  for (const d of G.drops) {
    d.t += dt;
    if (d.z > 0 || d.vz > 0) { d.vz -= 320 * dt; d.z += d.vz * dt; if (d.z <= 0) { d.z = 0; d.vz = d.vz < -40 ? -d.vz * .35 : 0; } }
    if (d.vx || d.vy) { const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt; if (!solidPx(nx, ny)) { d.x = nx; d.y = ny; } d.vx *= .9; d.vy *= .9; if (Math.abs(d.vx) < 1) d.vx = d.vy = 0; }
    const dd = Math.hypot(p.x - d.x, p.y - d.y);
    if (d.kind === 'gold' && dd < 44 && d.t > .3) { const a = Math.atan2(p.y - d.y, p.x - d.x), s = 240 * (1 - dd / 60); d.x += Math.cos(a) * s * dt; d.y += Math.sin(a) * s * dt; }
    if (d.t < .35 || dd > 9) continue;
    if (d.kind === 'gold') { p.gold += d.amt; G.run.stats.gold += d.amt; d.dead = true; Sfx.play('coin'); if (p.gold >= 1500) unlockAch('rich'); G.hudDirty = true; }
    else if (d.kind === 'heart') { healPlayer(p.S.maxHp * .15 * DIFFS[G.run.diff].heal); d.dead = true; Sfx.play('pickup'); }
    else if (d.kind === 'potion') { if (p.potions < p.maxPotions) { p.potions++; d.dead = true; Sfx.play('pickup'); toast('+1 Health Potion'); G.hudDirty = true; } }
    else if (d.kind === 'boon') { grantBoon(d.rare); d.dead = true; }
    else if (d.kind === 'shard') { G.run.shards += d.amt; d.dead = true; Sfx.play('secret'); toast(`+${d.amt} Soul Shards`); }
  }
  G.drops = G.drops.filter(d => !d.dead);
}
function hitProps(x, y, r, ang, arc) {
  for (const pp of G.props) {
    if (!pp.hp || pp.dead) continue;
    const d = Math.hypot(pp.x - x, pp.y - y); if (d > r + 6) continue;
    if (ang !== undefined && d > 8 && Math.abs(angDiff(ang, Math.atan2(pp.y - y, pp.x - x))) > arc / 2 + .3) continue;
    breakProp(pp);
  }
}
function breakProp(pp) {
  if (pp.dead) return; pp.dead = true;
  const col = pp.type === 'crate' ? '#8a6a3a' : pp.type === 'xbarrel' ? '#c03a20' : '#7a5230';
  fxDebris(pp.x, pp.y - 4, col, 14); Sfx.play('break');
  if (pp.type === 'xbarrel') { later(.12, () => { aoe({ team: 'enemy' }, pp.x, pp.y, 40, 14 * enemyScale().dmg, { color: '#ff7a30' }); aoe(G.p, pp.x, pp.y, 40, weaponPower(G.p) * 3, { elem: 'fire', kb: 200 }); shake(6); Sfx.play('boom'); fxBurst(pp.x, pp.y, '#ff9a30', 30, 120); }); return; }
  const lf = G.p.S.lf;
  if (chance(.35)) dropGold(pp.x, pp.y, randi(2, 6) * (1 + G.run.depth * .2) * G.p.S.goldMult);
  if (chance(.05 * DIFFS[G.run.diff].heal)) dropPickup(pp.x, pp.y, 'heart');
  if (chance(.025 * (1 + lf))) dropItem(pp.x, pp.y, genItem());
}
function breakWall(tx, ty) {
  const D = G.D; D.t[ty * D.w + tx] = T_FLOOR;
  fxDebris(tx * TS + 8, ty * TS + 8, BIOMES[G.run.bi].wallHi, 26); shake(4); Sfx.play('secret');
  reveal(tx, ty, 3);
}
function updateProps(dt) {
  const p = G.p, R = G.run, sc = enemyScale();
  for (const pp of G.props) {
    pp.t += dt; if (pp.pop > 0) pp.pop -= dt;
    if (pp.type === 'spikes') {
      const c = (pp.t + pp.phase) % 2.6; const up = c > 2.0; pp.state = c > 1.75 ? (up ? 2 : 1) : 0;
      if (up && !pp.fired) { pp.fired = true; if (Math.hypot(p.x - pp.x, p.y - pp.y) < 50) Sfx.play('spike'); if (Math.abs(p.x - pp.x) < 9 && Math.abs(p.y - pp.y) < 9 && !p.leap) hurtPlayer(9 * sc.dmg, null, {}); for (const e of G.ents) if (!e.dead && !e.def.fly && !e.boss && Math.abs(e.x - pp.x) < 9 && Math.abs(e.y - pp.y) < 9) { e.hp -= e.maxHp * .15; e.flash = .1; if (e.hp <= 0) killEnemy(e, p); } }
      if (!up) pp.fired = false;
    } else if (pp.type === 'vent') {
      const c = (pp.t + pp.phase) % 3.2; pp.state = c > 2.4 ? 2 : c > 2.0 ? 1 : 0;
      if (pp.state === 2) { if (Math.random() < .8) G.parts.push(part(pp.x + rand(-4, 4), pp.y - 2, rand(-8, 8), -rand(50, 90), .5, chance(.5) ? '#ff8a30' : '#ffd040', 2, true)); pp.hitT = (pp.hitT || 0) - dt; if (pp.hitT <= 0 && Math.abs(p.x - pp.x) < 9 && Math.abs(p.y - pp.y) < 10) { pp.hitT = .5; hurtPlayer(8 * sc.dmg, null, { elem: 'fire' }); } }
    } else if (pp.type === 'arrowtrap') {
      pp.cd -= dt;
      const q = roomAt(p.x, p.y);
      if (pp.cd <= 0 && Math.abs(p.x - pp.x) < 8 && p.y > pp.y && p.y - pp.y < 170 && q) { pp.cd = 1.8; shoot({ team: 'enemy' }, pp.x, pp.y + 8, Math.PI / 2, 200, { dmg: 8 * sc.dmg, kind: 'arrow', team: 'enemy' }); Sfx.play('arrow'); }
    } else if (pp.type === 'torch' && Math.random() < dt * 3) G.parts.push(part(pp.x + rand(-1, 1), pp.y - 10, rand(-3, 3), -rand(10, 20), .5, '#ffb040', 1, true));
    else if (pp.type === 'portal' || pp.type === 'stairs') { if (Math.random() < dt * 6) G.parts.push(part(pp.x + rand(-8, 8), pp.y, 0, -rand(15, 30), .8, pp.type === 'portal' ? '#9ad0ff' : '#ffd080', 1, true)); }
  }
  G.props = G.props.filter(pp => !pp.dead || pp.type === 'chest');
}

/* ---------------- BOSSES ---------------- */
function startBoss(q) {
  const id = G.run.endless && G.run.bossOverride ? G.run.bossOverride : BIOMES[G.run.bi].boss;
  const def = BOSSES[id];
  G.bossRoom = q;
  banner(def.name, 'Boss', true);
  Sfx.play('boss'); shake(8);
  Music.play('boss' + G.run.bi, { root: BIOMES[G.run.bi].music.root, scale: BIOMES[G.run.bi].music.scale, tempo: 132, seed: 500 + G.run.bi, boss: true });
  later(1.2, () => {
    const R = G.run, diff = DIFFS[R.diff];
    const b = spawnEnemy('skeleton', q.cx * TS, q.cy * TS, { room: q.id, delay: 0 });
    b.boss = true; b.bossId = id; b.def = Object.assign({}, ENEMIES.skeleton, def, { ai: 'boss' });
    b.hp = b.maxHp = def.hp * (1 + R.depth * .28) * diff.hp * diff.boss;
    b.dmg = def.dmg * (1 + R.depth * .16) * diff.dmg;
    b.spd = def.spd; b.r = def.r; b.scale = 1; b.phase = 0; b.atkT = 1.5; b.intro = 1.2; b.xp = 120 * (1 + R.depth * .15); b.busy = 0; b.contactT = 0; b.name = def.name;
    G.boss = b;
    G.fx.push({ type: 'portal', x: b.x, y: b.y, t: 0, dur: 1.2, big: true });
    fxBurst(b.x, b.y - 20, '#ff6a4a', 60, 160); shake(10);
    Save.data.bestiary['boss_' + id] = Save.data.bestiary['boss_' + id] || { seen: 1, kills: 0 };
  });
}
function bossUpdate(b, dt, sm) {
  const def = b.def, p = G.p;
  if (b.intro > 0) { b.intro -= dt; b.invuln = true; return; }
  b.invuln = !!(b.air > 0 || b.hidden > 0);
  const hpf = b.hp / b.maxHp;
  if (b.phase < def.phases.length && hpf < def.phases[b.phase]) {
    b.phase++; b.busy = 1; b.dashV = null; b.spinT = 0;
    banner(def.name, b.phase === def.phases.length && (b.bossId === 'dragon' || b.bossId === 'shadowking') ? 'ENRAGED' : 'Phase ' + (b.phase + 1), true);
    shake(9); Sfx.play('boss'); fxBurst(b.x, b.y - 20, '#ff5a3a', 50, 140);
    aoe(b, b.x, b.y, 56, b.dmg * .8, { color: '#ff7a5a' });
    if (b.bossId === 'dragon' && b.phase === 2) b.enraged = true;
    if (b.bossId === 'shadowking' && b.phase === 2) { b.spd *= 1.9; b.enraged = true; }
    if (b.bossId === 'guardian') b.spd *= 1.4;
  }
  if (sm === 0) return;
  const rate = (1 + b.phase * .25) * (b.enraged ? 1.45 : 1);
  if (b.busy > 0) b.busy -= dt;
  b.contactT -= dt;
  // special movement states
  if (b.dashV) {
    const d = b.dashV; d.t -= dt;
    const bl = moveEnt(b, d.x * dt, d.y * dt);
    if (Math.random() < .7) G.parts.push(part(b.x + rand(-8, 8), b.y, rand(-20, 20), -rand(10, 30), .4, '#a09080', 2));
    if (!d.hit && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r + 4) { d.hit = true; hurtPlayer(b.dmg * 1.4, b, {}); p.vx += d.x * .6; p.vy += d.y * .6; }
    if (d.t <= 0 || bl) { b.dashV = null; if (bl) { shake(6); Sfx.play('boom'); if (b.phase > 0) ringShot(b, 12, 110, 'boss'); } }
    return;
  }
  if (b.spinT > 0) {
    b.spinT -= dt; steer(b, p, b.spd * 1.5 * sm, dt);
    if (Math.random() < .8) { const a = rand(TAU); G.parts.push(part(b.x + Math.cos(a) * b.r * 1.4, b.y - 10 + Math.sin(a) * b.r, -Math.sin(a) * 80, Math.cos(a) * 80, .3, '#e0d8c0', 1)); }
    if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 16 && b.contactT <= 0) { b.contactT = .35; hurtPlayer(b.dmg * .8, b, {}); }
    return;
  }
  if (b.air > 0) {
    b.air -= dt; b.x = lerp(b.x, p.x, dt * 2.2); b.y = lerp(b.y, p.y, dt * 2.2);
    if (b.air <= 0) { const x = p.x, y = p.y; b.busy = .9; tele({ kind: 'circle', x, y, r: 62, dur: .8, dmg: b.dmg * 1.8, src: b, elem: 'fire', color: '255,120,40', onDone: () => { b.x = x; b.y = y; b.z = 0; shake(10); Sfx.play('boom'); fxDebris(x, y, '#ff7a2a', 40); addZone(b, x, y, 36, 5, b.dmg * .8, 'lava'); } }); b.landing = true; }
    return;
  }
  if (b.landing) { if (b.busy <= 0) b.landing = false; return; }
  if (b.hidden > 0) {
    b.hidden -= dt; b.x = lerp(b.x, p.x, dt * 1.8); b.y = lerp(b.y, p.y, dt * 1.8);
    if (Math.random() < .5) G.parts.push(part(b.x + rand(-20, 20), b.y + rand(-6, 6), 0, -10, .5, '#6ae0f0', 1));
    if (b.hidden <= 0) { const x = b.x, y = b.y; b.busy = .9; b.surfacing = true; b.hidden = 0.001; tele({ kind: 'circle', x, y, r: 56, dur: .7, dmg: b.dmg * 1.6, src: b, color: '90,200,230', onDone: () => { b.hidden = 0; b.surfacing = false; shake(8); Sfx.play('boom'); ringShot(b, 18, 100, 'water'); } }); }
    return;
  }
  if (b.healT > 0) {
    b.healT -= dt;
    const mins = G.ents.filter(e => !e.dead && e.minionOf === b.uid);
    if (mins.length) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * .022 * dt); if (Math.random() < .3) { const m = pick(mins); fxBeam(m.x, m.y - 6, b.x, b.y - 24, '#9fff7a', .15); } }
    else b.healT = 0;
    return;
  }
  // movement
  if (b.busy <= 0) {
    const d = dist(b, p);
    if (def.move === 'chase') { if (d > b.r + 14) steer(b, p, b.spd * sm, dt); }
    else if (def.move === 'keep') { if (d < 100) steer(b, p, b.spd * sm, dt, 'away'); else if (d > 170) steer(b, p, b.spd * sm, dt); else steer(b, p, b.spd * .5 * sm, dt, 'strafe'); }
    else if (def.move === 'hover') { const q = G.bossRoom; const tx = q ? lerp(q.cx * TS, p.x, .35) : p.x, ty = q ? lerp(q.cy * TS, p.y, .35) - 10 : p.y; const a = Math.atan2(ty - b.y, tx - b.x); if (Math.hypot(tx - b.x, ty - b.y) > 6) moveEnt(b, Math.cos(a) * b.spd * dt, Math.sin(a) * b.spd * dt); b.face = p.x < b.x ? -1 : 1; }
    else b.face = p.x < b.x ? -1 : 1;
  }
  if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r + 2 && b.contactT <= 0) { b.contactT = .8; hurtPlayer(b.dmg * .6, b, {}); }
  b.atkT -= dt * rate;
  if (b.atkT <= 0 && b.busy <= 0) {
    const pats = def.pats.filter(pt => pt[1] <= b.phase).map(pt => pt[0]);
    let name = pick(pats); if (name === b.lastPat && pats.length > 1) name = pick(pats.filter(n => n !== b.lastPat));
    b.lastPat = name;
    (BOSS_PATS[name] || BOSS_PATS.slam)(b);
    b.atkT = def.cd;
  }
}
function ringShot(b, n, spd, kind, off = 0, o = {}) { for (let i = 0; i < n; i++) shoot(b, b.x, b.y - 10, off + i * TAU / n, spd, Object.assign({ dmg: b.dmg * .7, kind, team: 'enemy', r: 3.5, life: 4 }, o)); }
function bossMinions(b) { return G.ents.filter(e => !e.dead && e.minionOf === b.uid).length; }
/** Boss attack patterns. Each boss mixes several; phases unlock more and speed them up. */
const BOSS_PATS = {
  slam(b) { b.busy = 1; tele({ kind: 'circle', x: b.x, y: b.y, r: 70, dur: .8, dmg: b.dmg * 1.5, src: b, onDone: () => { shake(9); Sfx.play('boom'); fxDebris(b.x, b.y, '#9a8a70', 30); if (b.phase > 0) ringShot(b, 14, 110, 'boss'); } }); },
  charge(b) {
    b.busy = .9; const a = angTo(b, G.p), sp = 380;
    tele({ kind: 'line', x: b.x, y: b.y, ang: a, len: sp * .55, w: b.r * 2 + 6, dur: .65, color: '255,140,60' });
    later(.65, () => { if (!b.dead) b.dashV = { x: Math.cos(a) * sp, y: Math.sin(a) * sp, t: .55 }; });
  },
  summon(b) {
    if (bossMinions(b) >= 7) { BOSS_PATS.slam(b); return; }
    b.busy = .8; const list = b.def.minions || ['skeleton']; const n = 2 + b.phase + (G.run.depth > 12 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a = i * TAU / n, s = findFree(b.x + Math.cos(a) * 36, b.y + Math.sin(a) * 36, { r: 5 }); const m = spawnEnemy(pick(list), s.x, s.y, { room: b.roomId, delay: .7, minionOf: b.uid }); m.xp = 2; G.fx.push({ type: 'portal', x: s.x, y: s.y, t: 0, dur: .8 }); }
    Sfx.play('summon');
  },
  spin(b) { b.spinT = 2.2; b.busy = 0; Sfx.play('swing'); },
  bombs(b) {
    b.busy = .6; const p = G.p; const n = 3 + b.phase * 2;
    for (let i = 0; i < n; i++) { const x = p.x + rand(-60, 60), y = p.y + rand(-60, 60); later(i * .12, () => { tele({ kind: 'circle', x, y, r: 30, dur: 1, dmg: b.dmg * 1.2, src: b, elem: 'fire', color: '255,150,40', onDone: () => { Sfx.play('boom'); shake(3); fxDebris(x, y, '#ff8a30', 10); } }); G.fx.push({ type: 'lob', x0: b.x, y0: b.y - 20, x1: x, y1: y, t: 0, dur: 1 }); }); }
  },
  roots(b) {
    b.busy = 1; const a = angTo(b, G.p), n = 9 + b.phase * 2;
    for (let i = 1; i <= n; i++) { const x = b.x + Math.cos(a) * i * 26, y = b.y + Math.sin(a) * i * 26; later(i * .09, () => tele({ kind: 'circle', x, y, r: 20, dur: .6, dmg: b.dmg * 1.1, src: b, color: '140,200,80', onDone: () => fxDebris(x, y, '#5a4028', 8) })); }
    if (b.phase >= 2) { const a2 = a + .5, a3 = a - .5; for (const aa of [a2, a3]) for (let i = 1; i <= 7; i++) { const x = b.x + Math.cos(aa) * i * 26, y = b.y + Math.sin(aa) * i * 26; later(.3 + i * .09, () => tele({ kind: 'circle', x, y, r: 18, dur: .6, dmg: b.dmg, src: b, color: '140,200,80' })); } }
  },
  spores(b) { b.busy = .7; const p = G.p; for (let i = 0; i < 3 + b.phase; i++) { const x = p.x + rand(-70, 70), y = p.y + rand(-70, 70); tele({ kind: 'circle', x, y, r: 34, dur: .7, color: '150,200,80', onDone: () => addZone(b, x, y, 34, 5, b.dmg * .6, 'spore') }); } },
  thornring(b) { b.busy = .7; ringShot(b, 16 + b.phase * 4, 105, 'thorn'); if (b.phase > 0) later(.35, () => ringShot(b, 16 + b.phase * 4, 105, 'thorn', TAU / 40)); Sfx.play('shoot'); },
  bonering(b) { b.busy = .7; ringShot(b, 20, 120, 'bone'); later(.3, () => ringShot(b, 20, 120, 'bone', TAU / 40)); Sfx.play('shoot'); },
  firering(b) { b.busy = .7; for (let k = 0; k < 3; k++) later(k * .3, () => ringShot(b, 18, 120, 'fire', k * .12, { elem: 'fire' })); Sfx.play('fire'); },
  icicles(b) { b.busy = .7; const p = G.p; const n = 8 + b.phase * 4; for (let i = 0; i < n; i++) { const a = rand(TAU), d = rand(10, 110), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; later(i * .05, () => tele({ kind: 'circle', x, y, r: 16, dur: .9, dmg: b.dmg, src: b, elem: 'ice', color: '150,210,255', onDone: () => fxBurst(x, y, '#dff4ff', 8, 50) })); } Sfx.play('ice'); },
  nova(b) { b.busy = .6; ringShot(b, 24, 95, 'ice', rand(TAU), { elem: 'ice' }); Sfx.play('ice'); },
  blink(b) {
    const q = G.bossRoom; if (!q) return;
    fxBurst(b.x, b.y - 20, '#bfe8ff', 24, 80);
    for (let k = 0; k < 10; k++) { const x = (randi(q.x + 2, q.x + q.w - 3) + .5) * TS, y = (randi(q.y + 2, q.y + q.h - 3) + .5) * TS; if (Math.hypot(x - G.p.x, y - G.p.y) > 90) { b.x = x; b.y = y; break; } }
    fxBurst(b.x, b.y - 20, '#bfe8ff', 24, 80); Sfx.play('zap'); b.atkT = .6;
  },
  teleport(b) { BOSS_PATS.blink(b); later(.3, () => { if (!b.dead) BOSS_PATS.darkbolts(b); }); },
  spiral(b) {
    b.busy = 2.6; const arms = 2 + b.phase, kind = b.bossId === 'frostqueen' ? 'ice' : 'boss'; let a0 = rand(TAU);
    for (let i = 0; i < 30; i++) later(i * .085, () => { if (b.dead) return; for (let k = 0; k < arms; k++) shoot(b, b.x, b.y - 12, a0 + k * TAU / arms + i * .21, 95, { dmg: b.dmg * .6, kind, team: 'enemy', r: 3, life: 4, elem: kind === 'ice' ? 'ice' : undefined }); });
  },
  breath(b) {
    b.busy = 1.9; const a = angTo(b, G.p);
    tele({ kind: 'cone', x: b.x, y: b.y - 6, ang: a, arc: .9, len: 150, dur: .55, color: '255,120,40' });
    for (let i = 0; i < 20; i++) later(.55 + i * .06, () => { if (!b.dead) shoot(b, b.x, b.y - 12, a + rand(-.42, .42), rand(150, 200), { dmg: b.dmg * .55, kind: 'fire', team: 'enemy', r: 4, life: .85, elem: 'fire' }); });
    later(.55, () => Sfx.play('fire'));
  },
  fireballs(b) { b.busy = 1; for (let k = 0; k < 3 + b.phase; k++) later(k * .35, () => { if (b.dead) return; const a = angTo(b, G.p); for (let i = -1; i <= 1; i++) shoot(b, b.x, b.y - 14, a + i * .2, 150, { dmg: b.dmg * .8, kind: 'fireball', team: 'enemy', r: 5, splash: 22, elem: 'fire' }); Sfx.play('fire'); }); },
  dive(b) { b.air = 1.6; b.busy = 0; Sfx.play('dash'); fxBurst(b.x, b.y, '#a09080', 30, 100); },
  lava(b) { b.busy = .6; const q = G.bossRoom; for (let i = 0; i < 4 + b.phase * 2; i++) { const x = q ? (randi(q.x + 1, q.x + q.w - 2) + .5) * TS : G.p.x + rand(-100, 100), y = q ? (randi(q.y + 1, q.y + q.h - 2) + .5) * TS : G.p.y + rand(-100, 100); tele({ kind: 'circle', x, y, r: 30, dur: .9, color: '255,100,30', onDone: () => addZone(b, x, y, 30, 7, b.dmg * .8, 'lava') }); } },
  meteors(b) { b.busy = .8; const p = G.p; for (let i = 0; i < 6 + b.phase * 2; i++) { const x = p.x + rand(-100, 100), y = p.y + rand(-100, 100); later(i * .15, () => tele({ kind: 'circle', x, y, r: 36, dur: 1.1, dmg: b.dmg * 1.5, src: b, elem: 'fire', color: '255,110,40', onDone: () => { shake(4); Sfx.play('boom'); fxDebris(x, y, '#ff7a2a', 14); addZone(b, x, y, 24, 2.5, b.dmg * .5, 'fire'); } })); } },
  heal(b) { if (!bossMinions(b)) { BOSS_PATS.summon(b); return; } b.healT = 2.6; toast(`${b.def.name} draws life from his minions!`); Sfx.play('heal'); },
  darkbolts(b) { b.busy = .6; const a = angTo(b, G.p); for (let i = -2; i <= 2; i++) shoot(b, b.x, b.y - 14, a + i * .24, 120, { dmg: b.dmg * .75, kind: 'dark', team: 'enemy', homing: .7, r: 3.5, life: 3.2 }); Sfx.play('shoot'); },
  tentacles(b) {
    b.busy = 1; const q = G.bossRoom, p = G.p; const n = 3 + b.phase;
    for (let i = 0; i < n; i++) later(i * .25, () => {
      const side = randi(0, 3); let x, y;
      if (!q) { x = p.x - 150; y = p.y; } else if (side === 0) { x = q.x * TS; y = (q.y + rand(q.h)) * TS; } else if (side === 1) { x = (q.x + q.w) * TS; y = (q.y + rand(q.h)) * TS; } else if (side === 2) { x = (q.x + rand(q.w)) * TS; y = q.y * TS; } else { x = (q.x + rand(q.w)) * TS; y = (q.y + q.h) * TS; }
      const a = Math.atan2(p.y - y, p.x - x);
      tele({ kind: 'line', x, y, ang: a, len: 420, w: 26, dur: .9, dmg: b.dmg * 1.3, src: b, color: '90,200,230', onDone: o => { shake(5); Sfx.play('boom'); for (let k = 0; k < 10; k++) fxDebris(x + Math.cos(a) * k * 40, y + Math.sin(a) * k * 40, '#3a8a9a', 3); } });
    });
  },
  wave(b) { b.busy = 1.4; for (let k = 0; k < 3; k++) later(k * .5, () => { if (b.dead) return; const n = 28, gap = randi(0, n - 1); for (let i = 0; i < n; i++) if (Math.abs(i - gap) > 2) shoot(b, b.x, b.y - 10, i * TAU / n, 85, { dmg: b.dmg * .7, kind: b.bossId === 'kraken' ? 'water' : 'holy', team: 'enemy', r: 3.5, life: 5 }); }); },
  submerge(b) { b.hidden = 2; b.busy = 0; fxBurst(b.x, b.y, '#6ae0f0', 40, 100); Sfx.play('fire'); },
  ink(b) { b.busy = .6; G.darkT = 5; const p = G.p; for (let i = 0; i < 4; i++) { const x = p.x + rand(-60, 60), y = p.y + rand(-60, 60); addZone(b, x, y, 36, 6, b.dmg * .3, 'ink', { arm: .6 }); } toast('Ink clouds the water!'); },
  shadowstrike(b) {
    b.busy = 1.1; const p = G.p;
    fxBurst(b.x, b.y - 20, '#8a6ad0', 20, 80);
    later(.3, () => {
      if (b.dead) return; const a = rand(TAU); const s = findFree(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 34, b); b.x = s.x; b.y = s.y; fxBurst(b.x, b.y - 20, '#8a6ad0', 20, 80);
      const an = angTo(b, p); tele({ kind: 'cone', x: b.x, y: b.y, ang: an, arc: 1.8, len: 60, dur: b.enraged ? .35 : .5, dmg: b.dmg * 1.4, src: b, color: '160,100,255', onDone: () => { fxSlash(b.x, b.y - 10, an, 1.8, 60, '#c0a0ff'); Sfx.play('swing'); } });
    });
  },
  clones(b) {
    if (G.ents.filter(e => !e.dead && e.clone).length >= 3) { BOSS_PATS.darkbolts(b); return; }
    b.busy = .8;
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3, s = findFree(b.x + Math.cos(a) * 50, b.y + Math.sin(a) * 50, { r: 6 });
      const c = spawnEnemy('wraith', s.x, s.y, { room: b.roomId, delay: .5, minionOf: b.uid });
      c.clone = true; c.cloneOf = b; c.hp = c.maxHp = b.maxHp * .05; c.dmg = b.dmg * .6; c.xp = 3; c.def = Object.assign({}, ENEMIES.wraith, { name: 'Shadow Clone', ghost: 0, fly: 1 });
      G.fx.push({ type: 'portal', x: s.x, y: s.y, t: 0, dur: .6 });
    }
    Sfx.play('summon');
  },
  darkness(b) { b.busy = .8; G.darkT = 6; toast('Darkness falls...'); for (let i = 0; i < 12; i++) later(.4 + i * .3, () => { if (b.dead) return; const p = G.p; const x = p.x + rand(-50, 50), y = p.y + rand(-50, 50); tele({ kind: 'circle', x, y, r: 22, dur: .8, dmg: b.dmg * .9, src: b, color: '140,80,255' }); }); },
  hellfire(b) { b.busy = 1.4; for (let i = 0; i < 6 + b.phase * 2; i++) later(i * .22, () => { if (b.dead) return; const p = G.p; tele({ kind: 'circle', x: p.x, y: p.y, r: 28, dur: .65, dmg: b.dmg * 1.2, src: b, elem: 'fire', color: '255,80,30', onDone: o => { Sfx.play('fire'); fxBurst(o.x, o.y, '#ff6a2a', 12, 60); } }); }); },
  beams(b) {
    b.busy = 1.6; const base = (b.beamRot = (b.beamRot || 0) + Math.PI / 4);
    const n = b.phase >= 1 ? 6 : 4;
    for (let k = 0; k < (b.phase >= 2 ? 2 : 1); k++) later(k * .7, () => { for (let i = 0; i < n; i++) { const a = base + k * Math.PI / n + i * TAU / n; tele({ kind: 'line', x: b.x, y: b.y - 10, ang: a, len: 480, w: 22, dur: 1, dmg: b.dmg * 1.4, src: b, color: '255,220,120', onDone: () => { shake(4); Sfx.play('zap'); } }); } });
  },
  judgment(b) { b.busy = 1; const p = G.p; tele({ kind: 'circle', x: p.x, y: p.y, r: 78, dur: 1.3, dmg: b.dmg * 2, src: b, color: '255,230,120', follow: true, onDone: o => { fxBolt(o.x, o.y - 140, o.x, o.y, '#fff0a0'); shake(8); Sfx.play('boom'); } }); }
};
function bossDefeated(b) {
  const R = G.run, p = G.p, q = G.bossRoom, id = b.bossId;
  G.boss = null; G.slow = 1.2;
  shake(14); flashScreen(.6); Sfx.play('boom'); Sfx.play('levelup');
  for (const e of G.ents) if (!e.dead && e.roomId === b.roomId) { e.dead = true; fxBurst(e.x, e.y - 6, '#fff', 10, 60); }
  G.teles = []; G.proj = G.proj.filter(pr => pr.team !== 'enemy');
  R.stats.bosses++; R.stats.kills++;
  Save.data.bossKills[id] = (Save.data.bossKills[id] || 0) + 1;
  Save.data.bestiary['boss_' + id].kills++;
  unlockAch('bossslayer'); unlockAch('boss_' + id);
  if (Object.keys(BOSSES).every(k => Save.data.bossKills[k])) unlockAch('master');
  if (R.diff >= 4) unlockAch('hell');
  const bi = BIOMES.findIndex(B => B.boss === id);
  if (bi >= 0 && Save.data.unlocked < Math.min(10, bi + 2)) { Save.data.unlocked = Math.min(10, bi + 2); if (bi + 1 < 10) later(2.5, () => toast(`New region unlocked: ${BIOMES[bi + 1].name}`, 'ach')); }
  gainXP(b.xp);
  // boss loot
  const lf = p.S.lf;
  const n = 3 + (chance(lf) ? 1 : 0);
  for (let i = 0; i < n; i++) later(.3 + i * .25, () => dropItem(b.x + rand(-20, 20), b.y + rand(-10, 10), genItem({ minR: i === 0 ? (chance(.18 + lf * .35) ? 4 : 3) : 2, bonus: 10 })));
  later(.4, () => { dropGold(b.x, b.y, 60 * (1 + R.depth * .3) * p.S.goldMult); dropBoon(b.x, b.y, chance(.35 + lf * .3)); });
  const shards = Math.round((10 + R.depth * 2) * DIFFS[R.diff].shards);
  later(.8, () => dropPickup(b.x, b.y, 'shard', { amt: shards }));
  Save.write();
  q.cleared = true; q.pending = 0;
  later(2, () => {
    setDoors(q, false);
    const last = !R.endless && R.bi === 9;
    const cx = q.cx * TS, cy = q.cy * TS;
    if (!last) G.props.push({ type: 'stairs', x: cx - 24, y: cy, t: 0, uid: UID++, bossStairs: true });
    G.props.push({ type: 'portal', x: last ? cx : cx + 24, y: cy, t: 0, uid: UID++, final: last });
    banner('Victory', last ? 'The Ancient Temple falls silent. Step into the portal.' : 'Descend deeper, or take the portal home with your shards.');
    Music.play('biome' + R.bi, Object.assign({}, BIOMES[R.bi].music));
  });
}
