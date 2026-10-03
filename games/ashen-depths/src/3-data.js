/* =====================================================================
   GAME DATA — classes, abilities, weapons, affixes, enemies, bosses,
   regions, difficulties, power-ups, achievements, permanent upgrades
   ===================================================================== */

/* ---------------- CLASSES ---------------- */
const CLASSES = {
  warrior: {
    name: 'Warrior', color: '#c9433b', res: 'Stamina', primary: 'str', weapon: 'sword',
    base: { hp: 115, mp: 60, armor: 10, speed: 64, str: 10, dex: 4, int: 2, vit: 10, luck: 3, crit: 0 },
    pal: PAL({ 2: '#8a8f9a', 4: '#d4a13a', 6: '#9c2f2f', 3: '#3a2a24', 7: '#c8ccd4' }),
    abilities: ['whirlwind', 'groundslam', 'shieldwall', 'battlecry', 'leapstrike'],
    passive: { name: 'Iron Will', desc: 'Takes 12% less damage and blocks 8% of hits. Deals up to +30% damage as health drops.' },
    desc: 'Heavy armour and a big sword. Wades into crowds and outlasts them.'
  },
  rogue: {
    name: 'Rogue', color: '#6fc46a', res: 'Energy', primary: 'dex', weapon: 'dagger',
    base: { hp: 82, mp: 70, armor: 3, speed: 78, str: 4, dex: 11, int: 3, vit: 5, luck: 6, crit: .08 },
    pal: PAL({ 2: '#2b3a2e', 4: '#4d6b50', 6: '#3a3030', 3: '#1e1a1c', 7: '#b8c0c8' }),
    abilities: ['shadowstep', 'stealth', 'fanofknives', 'poisoncloud', 'bladeflurry'],
    passive: { name: 'Backstab', desc: '+25% crit damage and two dash charges. Hits in the 1.2s after a dash always crit.' },
    desc: 'Fast and fragile. Lives on critical hits and never stands still.'
  },
  mage: {
    name: 'Mage', color: '#5a9cf0', res: 'Mana', primary: 'int', weapon: 'staff',
    base: { hp: 72, mp: 140, armor: 1, speed: 66, str: 2, dex: 4, int: 12, vit: 4, luck: 4, crit: 0 },
    pal: PAL({ 2: '#3b3f9e', 4: '#e0c060', 6: '#4a3a8e', 3: '#241d4a', 7: '#e0c060' }),
    abilities: ['fireball', 'icenova', 'lightning', 'meteor', 'blink'],
    passive: { name: 'Arcane Flow', desc: '+50% mana regeneration and +15% ability damage.' },
    desc: 'Glass cannon. Clears whole rooms with fire, frost and lightning.'
  },
  ranger: {
    name: 'Ranger', color: '#d0a050', res: 'Energy', primary: 'dex', weapon: 'bow',
    base: { hp: 86, mp: 80, armor: 3, speed: 72, str: 4, dex: 10, int: 3, vit: 5, luck: 5, crit: .03 },
    pal: PAL({ 2: '#3e6b2e', 4: '#b89060', 6: '#6b4a2a', 3: '#3a2a1a', 7: '#b89060' }),
    abilities: ['multishot', 'arrowrain', 'beartrap', 'evasiveroll', 'explosivearrow'],
    passive: { name: 'Hunter', desc: 'Arrows and bolts pierce one extra enemy. +10% move speed.' },
    desc: 'Keeps its distance and controls the field with traps and volleys.'
  },
  paladin: {
    name: 'Paladin', color: '#f0d070', res: 'Faith', primary: 'str', weapon: 'hammer',
    base: { hp: 108, mp: 90, armor: 9, speed: 62, str: 8, dex: 3, int: 6, vit: 9, luck: 3, crit: 0 },
    pal: PAL({ 2: '#d8c890', 4: '#f0c040', 6: '#e8e4d8', 3: '#6a5a3a', 7: '#f0c040' }),
    abilities: ['judgment', 'heal', 'holyshield', 'consecration', 'divinecharge'],
    passive: { name: 'Devotion', desc: 'Regenerates 0.4% max HP per second. +25% damage against undead and demons.' },
    desc: 'Holy warrior who heals, shields and smites.'
  },
  necro: {
    name: 'Necromancer', color: '#a070e0', res: 'Mana', primary: 'int', weapon: 'wand',
    base: { hp: 80, mp: 120, armor: 2, speed: 64, str: 2, dex: 3, int: 11, vit: 6, luck: 5, crit: 0 },
    pal: PAL({ 2: '#1e1826', 4: '#8a7aa0', 6: '#3a1f4a', 3: '#16121c', 8: '#a8c0a0', 5: '#9fff7a', 7: '#8a7aa0' }),
    abilities: ['summonskeleton', 'bonespear', 'lifedrain', 'raisedead', 'corpseexplosion'],
    passive: { name: 'Soulbind', desc: '4% lifesteal. Kills have a 12% chance to raise a skeleton for 12s.' },
    desc: 'Commands the dead. Fallen enemies get back up and fight for you.'
  }
};

/* ---------------- ABILITIES ----------------
   Every ability: damage (as % of ability power), cooldown, cost, area, animation, and 5 upgrade ranks.
   Rank scaling: damage +25%/rank, area +10%/rank, cooldown -6%/rank. */
const dm = r => 1 + .25 * (r - 1), ar = r => 1 + .1 * (r - 1);
const D_ = (b, r) => Math.round(b * dm(r)), R_ = (b, r) => Math.round(b * ar(r));
const ABILITIES = {
  // WARRIOR
  whirlwind: { name: 'Whirlwind', glyph: 'spin', color: '#a8403a', cd: 6, cost: 22,
    desc: r => `Spin for 0.9s, striking everything within ${R_(46, r)}px four times for ${D_(55, r)}% power each.`,
    cast(p, r) { p.spin = { t: .9, tick: 0, rad: 46 * ar(r), mult: .55 * dm(r) }; Sfx.play('swing'); return true; } },
  groundslam: { name: 'Ground Slam', glyph: 'slam', color: '#8a6a3a', cd: 7, cost: 25,
    desc: r => `Smash the ground for ${D_(160, r)}% power in ${R_(58, r)}px, stunning for ${(1 + .1 * r).toFixed(1)}s.`,
    cast(p, r) { aoe(p, p.x, p.y, 58 * ar(r), abilityPower(p) * 1.6 * dm(r), { stun: 1 + .1 * r, kb: 220, color: '#e0c080', proc: true }); shake(7); Sfx.play('boom'); fxDebris(p.x, p.y, '#8a7a60', 26); return true; } },
  shieldwall: { name: 'Shield Wall', glyph: 'shield', color: '#5a6a8a', cd: 14, cost: 20,
    desc: r => `For ${(4 + .5 * (r - 1)).toFixed(1)}s take 60% less damage and reflect ${20 + 5 * r}% of it.`,
    cast(p, r) { addBuff(p, 'shieldwall', 'Shield Wall', 4 + .5 * (r - 1), { dr: 60, reflect: 20 + 5 * r }, '#8aa0d0'); Sfx.play('shield'); fxRing(p.x, p.y, 22, '#a0b8ff'); return true; } },
  battlecry: { name: 'Battle Cry', glyph: 'horn', color: '#b05a2a', cd: 18, cost: 25,
    desc: r => `Roar: +${D_(30, r)}% damage and +20% attack speed for 8s. Heals 10% HP and stuns nearby foes briefly.`,
    cast(p, r) { addBuff(p, 'battlecry', 'Battle Cry', 8, { dmg: 30 * dm(r), atkSpd: 20 }, '#ff9a50'); healPlayer(p.S.maxHp * .1); aoe(p, p.x, p.y, 60, 0, { stun: .6, color: '#ff9a50' }); shake(4); Sfx.play('boss'); return true; } },
  leapstrike: { name: 'Leap Strike', glyph: 'leap', color: '#7a4a6a', cd: 8, cost: 20,
    desc: r => `Leap up to ${R_(120, r)}px and crash down for ${D_(150, r)}% power in ${R_(42, r)}px. Invulnerable mid-air.`,
    cast(p, r, a) { const d = Math.min(120 * ar(r), Math.hypot(a.x - p.x, a.y - p.y)); const t = findFree(p.x + Math.cos(a.ang) * d, p.y + Math.sin(a.ang) * d, p); p.leap = { t: 0, dur: .38, x0: p.x, y0: p.y, x1: t.x, y1: t.y, mult: 1.5 * dm(r), rad: 42 * ar(r) }; Sfx.play('dash'); return true; } },
  // ROGUE
  shadowstep: { name: 'Shadow Step', glyph: 'step', color: '#3a3a5a', cd: 6, cost: 18,
    desc: r => `Teleport behind the enemy nearest your cursor and strike for ${D_(160, r)}% power. Next hits crit for 1.2s.`,
    cast(p, r, a) { const e = nearestEnemy(a.x, a.y, 110) || nearestEnemy(p.x, p.y, 170); if (!e) return false; const an = angTo(p, e); const t = findFree(e.x + Math.cos(an) * (e.r + 10), e.y + Math.sin(an) * (e.r + 10), p); fxBurst(p.x, p.y - 6, '#6a5a9a', 14, 60); p.x = t.x; p.y = t.y; p.sure = 1.2; p.aim = an + Math.PI; hitEnemy(p, e, abilityPower(p) * 1.6 * dm(r), { forceCrit: true, proc: true }); fxBurst(p.x, p.y - 6, '#6a5a9a', 14, 60); Sfx.play('dash'); return true; } },
  stealth: { name: 'Stealth', glyph: 'eye', color: '#2a4a3a', cd: 14, cost: 25,
    desc: r => `Vanish for ${(4 + .75 * (r - 1)).toFixed(1)}s. Enemies lose track of you. Your next hit deals ${D_(250, r) / 100}x damage.`,
    cast(p, r) { p.stealth = 4 + .75 * (r - 1); p.stealthMult = 2.5 * dm(r); fxBurst(p.x, p.y - 6, '#404050', 20, 50); Sfx.play('dash'); return true; } },
  fanofknives: { name: 'Fan of Knives', glyph: 'knives', color: '#6a6a7a', cd: 6, cost: 20,
    desc: r => `Throw ${12 + 2 * (r - 1)} knives in all directions for ${D_(60, r)}% power. Knives cause bleeding.`,
    cast(p, r) { const n = 12 + 2 * (r - 1); for (let i = 0; i < n; i++) shoot(p, p.x, p.y - 5, i * TAU / n, 240, { dmg: abilityPower(p) * .6 * dm(r), kind: 'knife', pierce: 1, elem: 'bleed', proc: true, life: .6 }); Sfx.play('swing'); return true; } },
  poisoncloud: { name: 'Poison Cloud', glyph: 'cloud', color: '#4a8a2a', cd: 9, cost: 22,
    desc: r => `Release a toxic cloud at the cursor: ${D_(45, r)}% power per second for 5s in ${R_(44, r)}px.`,
    cast(p, r, a) { addZone(p, a.x, a.y, 44 * ar(r), 5, abilityPower(p) * .45 * dm(r), 'poison'); Sfx.play('fire'); return true; } },
  bladeflurry: { name: 'Blade Flurry', glyph: 'slash', color: '#8a2a3a', cd: 7, cost: 20,
    desc: r => `Unleash 8 rapid slashes in front of you for ${D_(45, r)}% power each.`,
    cast(p, r, a) { p.flurry = { t: .5, tick: 0, n: 0, mult: .45 * dm(r), ang: a.ang, rad: 32 * ar(r) }; return true; } },
  // MAGE
  fireball: { name: 'Fireball', glyph: 'flame', color: '#c8501a', cd: 1.4, cost: 12,
    desc: r => `Hurl ${r >= 5 ? 3 : r >= 3 ? 2 : 1} fireball(s) that explode for ${D_(160, r)}% power in ${R_(34, r)}px and ignite.`,
    cast(p, r, a) { const n = r >= 5 ? 3 : r >= 3 ? 2 : 1; for (let i = 0; i < n; i++) { const an = a.ang + (i - (n - 1) / 2) * .16; shoot(p, p.x, p.y - 6, an, 230, { dmg: abilityPower(p) * 1.6 * dm(r), kind: 'fireball', r: 4, splash: 34 * ar(r), elem: 'fire', proc: true, life: 1.4 }); } Sfx.play('fire'); return true; } },
  icenova: { name: 'Ice Nova', glyph: 'nova', color: '#3a8ac8', cd: 8, cost: 26,
    desc: r => `Blast frost outward for ${D_(110, r)}% power in ${R_(72, r)}px, freezing enemies for ${(1.4 + .2 * r).toFixed(1)}s.`,
    cast(p, r) { aoe(p, p.x, p.y, 72 * ar(r), abilityPower(p) * 1.1 * dm(r), { freeze: 1.4 + .2 * r, color: '#bfe8ff', proc: true }); fxBurst(p.x, p.y, '#bfe8ff', 40, 150); Sfx.play('ice'); return true; } },
  lightning: { name: 'Lightning Strike', glyph: 'bolt', color: '#8a7ae0', cd: 3, cost: 16,
    desc: r => `Call lightning at the cursor for ${D_(140, r)}% power, chaining to ${3 + (r - 1)} more enemies.`,
    cast(p, r, a) { const e = nearestEnemy(a.x, a.y, 70); const x = e ? e.x : a.x, y = e ? e.y : a.y; fxBolt(x, y - 120, x, y, '#d8d0ff'); aoe(p, x, y, 20, abilityPower(p) * 1.4 * dm(r), { color: '#d8d0ff', proc: true, elem: 'shock' }); chainLightning(p, x, y, abilityPower(p) * .9 * dm(r), 3 + (r - 1), e ? [e] : []); Sfx.play('zap'); shake(3); return true; } },
  meteor: { name: 'Meteor', glyph: 'meteor', color: '#a03a1a', cd: 12, cost: 40,
    desc: r => `Call a meteor at the cursor: ${D_(340, r)}% power in ${R_(58, r)}px, leaving burning ground.`,
    cast(p, r, a) { const d = Math.min(220, Math.hypot(a.x - p.x, a.y - p.y)); const x = p.x + Math.cos(a.ang) * d, y = p.y + Math.sin(a.ang) * d; const P = abilityPower(p);
      tele({ kind: 'circle', x, y, r: 58 * ar(r), dur: .75, team: 'player', color: '255,140,60', onDone: () => { aoe(p, x, y, 58 * ar(r), P * 3.4 * dm(r), { elem: 'fire', kb: 160, color: '#ffb060', proc: true }); addZone(p, x, y, 40 * ar(r), 3, P * .35, 'fire'); shake(9); Sfx.play('boom'); fxDebris(x, y, '#ff8030', 30); } }); Sfx.play('cast'); return true; } },
  blink: { name: 'Blink', glyph: 'blink', color: '#6a4ab0', cd: 4.5, cost: 10,
    desc: r => `Teleport up to ${R_(140, r)}px toward the cursor, releasing an arcane burst for ${D_(60, r)}% power where you left.`,
    cast(p, r, a) { const d = Math.min(140 * ar(r), Math.hypot(a.x - p.x, a.y - p.y)); const t = findFree(p.x + Math.cos(a.ang) * d, p.y + Math.sin(a.ang) * d, p); aoe(p, p.x, p.y, 36, abilityPower(p) * .6 * dm(r), { color: '#c0a0ff' }); fxBurst(p.x, p.y - 6, '#b090ff', 18, 70); p.x = t.x; p.y = t.y; p.ifr = Math.max(p.ifr, .25); fxBurst(p.x, p.y - 6, '#b090ff', 18, 70); Sfx.play('zap'); return true; } },
  // RANGER
  multishot: { name: 'Multishot', glyph: 'arrows', color: '#7a6a2a', cd: 3, cost: 14,
    desc: r => `Fire ${5 + (r - 1)} arrows in a fan for ${D_(80, r)}% power each.`,
    cast(p, r, a) { const n = 5 + (r - 1); for (let i = 0; i < n; i++) shoot(p, p.x, p.y - 5, a.ang + (i - (n - 1) / 2) * .13, 300, { dmg: abilityPower(p) * .8 * dm(r), kind: 'arrow', pierce: p.S.pierce, proc: true }); Sfx.play('arrow'); return true; } },
  arrowrain: { name: 'Arrow Rain', glyph: 'rain', color: '#5a6a3a', cd: 9, cost: 28,
    desc: r => `Rain arrows on the cursor for 2.5s: ${D_(140, r)}% power per second in ${R_(52, r)}px.`,
    cast(p, r, a) { addZone(p, a.x, a.y, 52 * ar(r), 2.5, abilityPower(p) * 1.4 * dm(r), 'rain'); Sfx.play('arrow'); return true; } },
  beartrap: { name: 'Bear Trap', glyph: 'trap', color: '#6a5a4a', cd: 5, cost: 12,
    desc: r => `Place a trap (max 3). The first enemy to step on it takes ${D_(200, r)}% power and is rooted for 2s.`,
    cast(p, r) { const traps = G.zones.filter(z => z.kind === 'trap'); if (traps.length >= 3) traps[0].t = traps[0].dur; addZone(p, p.x, p.y, 12, 30, abilityPower(p) * 2 * dm(r), 'trap'); Sfx.play('spike'); return true; } },
  evasiveroll: { name: 'Evasive Roll', glyph: 'roll', color: '#4a7a6a', cd: 4, cost: 10,
    desc: r => `Roll away, invulnerable. Your next shot deals ${D_(160, r)}% damage and pierces 3 extra enemies.`,
    cast(p, r, a) { const mv = moveDir(); const an = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : a.ang + Math.PI; p.dashV = { x: Math.cos(an) * 300, y: Math.sin(an) * 300, t: .28 }; p.ifr = Math.max(p.ifr, .35); p.empower = { mult: 1.6 * dm(r), pierce: 3 }; Sfx.play('dash'); return true; } },
  explosivearrow: { name: 'Explosive Arrow', glyph: 'burst', color: '#b04a1a', cd: 6, cost: 20,
    desc: r => `An arrow that explodes for ${D_(200, r)}% power in ${R_(42, r)}px and sets enemies ablaze.`,
    cast(p, r, a) { shoot(p, p.x, p.y - 5, a.ang, 280, { dmg: abilityPower(p) * 2 * dm(r), kind: 'arrow', splash: 42 * ar(r), elem: 'fire', proc: true, color: '#ff8a30' }); Sfx.play('arrow'); return true; } },
  // PALADIN
  judgment: { name: 'Judgment', glyph: 'hammer', color: '#b0902a', cd: 7, cost: 22,
    desc: r => `Smite the cursor with holy light: ${D_(220, r)}% power in ${R_(44, r)}px and a ${(1 + .1 * r).toFixed(1)}s stun. Double damage to undead.`,
    cast(p, r, a) { const d = Math.min(160, Math.hypot(a.x - p.x, a.y - p.y)); const x = p.x + Math.cos(a.ang) * d, y = p.y + Math.sin(a.ang) * d; fxBolt(x, y - 130, x, y, '#fff0a0'); aoe(p, x, y, 44 * ar(r), abilityPower(p) * 2.2 * dm(r), { stun: 1 + .1 * r, color: '#fff0a0', holy: true, proc: true }); shake(5); Sfx.play('zap'); return true; } },
  heal: { name: 'Holy Light', glyph: 'cross', color: '#3a9a5a', cd: 12, cost: 30,
    desc: r => `Heal yourself and your allies for ${25 + 5 * (r - 1)}% of max HP and cleanse burning and poison.`,
    cast(p, r) { healPlayer(p.S.maxHp * (.25 + .05 * (r - 1))); p.status = {}; for (const a of G.allies) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * .4); fxBurst(p.x, p.y - 6, '#b0ffb0', 30, 60); Sfx.play('heal'); return true; } },
  holyshield: { name: 'Holy Shield', glyph: 'shield', color: '#c0a040', cd: 14, cost: 25,
    desc: r => `Gain a barrier absorbing ${30 + 5 * (r - 1)}% of max HP for 6s.`,
    cast(p, r) { p.shield = Math.max(p.shield, p.S.maxHp * (.3 + .05 * (r - 1))); p.shieldT = 6; fxRing(p.x, p.y, 24, '#fff0a0'); Sfx.play('shield'); return true; } },
  consecration: { name: 'Consecration', glyph: 'sun', color: '#c8a030', cd: 12, cost: 30,
    desc: r => `Bless the ground for 6s: ${D_(50, r)}% power per second to enemies in ${R_(62, r)}px, heals you 2% HP/s inside.`,
    cast(p, r) { addZone(p, p.x, p.y, 62 * ar(r), 6, abilityPower(p) * .5 * dm(r), 'holy'); Sfx.play('heal'); return true; } },
  divinecharge: { name: 'Divine Charge', glyph: 'charge', color: '#a07a2a', cd: 8, cost: 18,
    desc: r => `Charge forward in holy fire, hitting everything in your path for ${D_(130, r)}% power and knocking it aside.`,
    cast(p, r, a) { p.charge = { t: .34, ang: a.ang, spd: 360 * ar(r), mult: 1.3 * dm(r), hit: new Set() }; p.ifr = Math.max(p.ifr, .3); Sfx.play('dash'); return true; } },
  // NECROMANCER
  summonskeleton: { name: 'Summon Skeleton', glyph: 'skull', color: '#5a4a6a', cd: 8, cost: 25,
    desc: r => `Raise ${r >= 5 ? 3 : r >= 3 ? 2 : 1} skeleton warrior(s) for 25s (max 5). They deal ${D_(60, r)}% power per hit.`,
    cast(p, r) { const n = r >= 5 ? 3 : r >= 3 ? 2 : 1; for (let i = 0; i < n; i++) { const sk = G.allies.filter(a => a.kind === 'skeleton' && !a.temp); if (sk.length >= 5) { sk[0].dead = true; fxBurst(sk[0].x, sk[0].y - 6, '#9fff7a', 8, 40); } const an = rand(TAU); summonAlly('skeleton', p.x + Math.cos(an) * 16, p.y + Math.sin(an) * 16, { life: 25, power: .6 * dm(r) }); } Sfx.play('summon'); return true; } },
  bonespear: { name: 'Bone Spear', glyph: 'bone', color: '#8a8070', cd: 2, cost: 12,
    desc: r => `Launch a spear of bone that pierces every enemy in a line for ${D_(190, r)}% power.`,
    cast(p, r, a) { shoot(p, p.x, p.y - 6, a.ang, 320, { dmg: abilityPower(p) * 1.9 * dm(r), kind: 'bone', pierce: 99, r: 3, proc: true, life: 1 }); Sfx.play('shoot'); return true; } },
  lifedrain: { name: 'Life Drain', glyph: 'drain', color: '#8a2a4a', cd: 5, cost: 18,
    desc: r => `Drain up to 3 nearby enemies for ${D_(110, r)}% power each and heal for half the damage.`,
    cast(p, r) { const es = enemiesIn(p.x, p.y, 130 * ar(r)).sort((a, b) => dist(p, a) - dist(p, b)).slice(0, 3); if (!es.length) return false; let tot = 0; for (const e of es) { tot += hitEnemy(p, e, abilityPower(p) * 1.1 * dm(r), { proc: true }); fxBeam(p.x, p.y - 6, e.x, e.y - 6, '#ff4a7a', .3); } healPlayer(tot * .5); Sfx.play('cast'); return true; } },
  raisedead: { name: 'Raise Dead', glyph: 'raise', color: '#4a6a3a', cd: 10, cost: 30,
    desc: r => `Raise up to ${2 + (r - 1)} nearby corpses as allies for 20s. They keep their abilities.`,
    cast(p, r) { const cs = G.corpses.filter(c => Math.hypot(c.x - p.x, c.y - p.y) < 150).slice(0, 2 + (r - 1)); if (!cs.length) { toast('No corpses nearby'); return false; } for (const c of cs) { summonAlly(c.id, c.x, c.y, { life: 20, power: .5 * dm(r), raised: true }); G.corpses.splice(G.corpses.indexOf(c), 1); fxBurst(c.x, c.y - 4, '#9fff7a', 16, 50); } Sfx.play('summon'); return true; } },
  corpseexplosion: { name: 'Corpse Explosion', glyph: 'burst', color: '#6a3a2a', cd: 6, cost: 20,
    desc: r => `Detonate every corpse within 160px for ${D_(200, r)}% power in ${R_(46, r)}px each.`,
    cast(p, r) { const cs = G.corpses.filter(c => Math.hypot(c.x - p.x, c.y - p.y) < 160); if (!cs.length) { toast('No corpses nearby'); return false; } for (const c of cs) { aoe(p, c.x, c.y, 46 * ar(r), abilityPower(p) * 2 * dm(r), { color: '#ff7a4a', kb: 150, proc: true }); fxDebris(c.x, c.y, '#c03020', 16); G.corpses.splice(G.corpses.indexOf(c), 1); } shake(6); Sfx.play('boom'); return true; } }
};

/* ---------------- WEAPONS ---------------- */
const WEAPON_TYPES = {
  sword: { name: 'Sword', names: ['Shortsword', 'Longsword', 'Sabre', 'Broadsword', 'Falchion'], kind: 'melee', dmg: 10, rate: 2.1, range: 24, arc: 1.9, kb: 70, stat: 'str' },
  greatsword: { name: 'Greatsword', names: ['Greatsword', 'Claymore', 'Zweihander', 'Bastard Sword'], kind: 'melee', dmg: 19, rate: 1.05, range: 32, arc: 2.5, kb: 150, stat: 'str' },
  axe: { name: 'Axe', names: ['Hatchet', 'Battleaxe', 'Cleaver', 'Waraxe'], kind: 'melee', dmg: 14, rate: 1.5, range: 24, arc: 2.0, kb: 90, stat: 'str', innate: { bleed: .22 }, note: '22% chance to cause bleeding' },
  dagger: { name: 'Dagger', names: ['Dagger', 'Stiletto', 'Kris', 'Dirk'], kind: 'melee', dmg: 6.5, rate: 3.4, range: 19, arc: 1.3, kb: 30, stat: 'dex', base: { crit: 8 } },
  spear: { name: 'Spear', names: ['Spear', 'Pike', 'Glaive', 'Partisan'], kind: 'melee', dmg: 11, rate: 1.75, range: 40, arc: .6, kb: 80, stat: 'dex', note: 'Long reach' },
  hammer: { name: 'Hammer', names: ['Mace', 'Warhammer', 'Maul', 'Morningstar'], kind: 'melee', dmg: 18, rate: .95, range: 26, arc: 2.2, kb: 210, stat: 'str', innate: { stun: .15 }, note: '15% chance to stun' },
  shield: { name: 'Shield', names: ['Buckler', 'Kite Shield', 'Tower Shield', 'Heater'], kind: 'melee', dmg: 8, rate: 1.7, range: 20, arc: 1.7, kb: 180, stat: 'str', base: { armor: 10, block: 12 }, note: 'Shield bash with heavy knockback' },
  bow: { name: 'Bow', names: ['Shortbow', 'Longbow', 'Recurve', 'Warbow'], kind: 'ranged', dmg: 9, rate: 1.9, spd: 290, stat: 'dex', proj: 'arrow' },
  staff: { name: 'Staff', names: ['Staff', 'Rod', 'Quarterstaff', 'Scepter'], kind: 'ranged', dmg: 12, rate: 1.35, spd: 190, stat: 'int', proj: 'orb', splash: 20, note: 'Bolts splash in a small area' },
  wand: { name: 'Wand', names: ['Wand', 'Twig', 'Focus', 'Spire'], kind: 'ranged', dmg: 5.5, rate: 3.6, spd: 250, stat: 'int', proj: 'spark' }
};
const ARMOR_SLOTS = {
  helmet: { name: 'Helmet', names: ['Cap', 'Helm', 'Visor', 'Hood', 'Circlet'], base: { armor: 4, hp: 10 } },
  chest: { name: 'Chestplate', names: ['Tunic', 'Hauberk', 'Breastplate', 'Robe', 'Cuirass'], base: { armor: 8, hp: 20 } },
  gloves: { name: 'Gloves', names: ['Gloves', 'Gauntlets', 'Wraps', 'Grips'], base: { armor: 2, atkSpd: 5 } },
  boots: { name: 'Boots', names: ['Boots', 'Greaves', 'Sandals', 'Treads'], base: { armor: 2, move: 6 } },
  ring: { name: 'Ring', names: ['Band', 'Ring', 'Signet', 'Loop'], base: { crit: 2 } },
  amulet: { name: 'Amulet', names: ['Amulet', 'Pendant', 'Talisman', 'Charm'], base: { mp: 15, luck: 2 } }
};
const EQUIP_SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'ring', 'amulet'];

/* Stat affixes. v = [base, growth per item level]. */
const AFFIXES = {
  dmg: { name: 'Damage', v: [6, 1.1], u: '%' }, atkSpd: { name: 'Attack Speed', v: [5, .35], u: '%' },
  crit: { name: 'Critical Chance', v: [3, .12], u: '%' }, critDmg: { name: 'Critical Damage', v: [12, 1.2], u: '%' },
  lifesteal: { name: 'Lifesteal', v: [1.5, .08], u: '%' }, luck: { name: 'Luck', v: [3, .3], u: '' },
  move: { name: 'Move Speed', v: [4, .2], u: '%' }, armorPen: { name: 'Armor Penetration', v: [8, .7], u: '%' },
  fire: { name: 'Burn Chance', v: [10, .5], u: '%' }, ice: { name: 'Chill Chance', v: [10, .5], u: '%' },
  shock: { name: 'Chain Lightning Chance', v: [8, .4], u: '%' }, poison: { name: 'Poison Chance', v: [10, .5], u: '%' },
  hp: { name: 'Max HP', v: [12, 3.5], u: '' }, mp: { name: 'Max Mana', v: [10, 2], u: '' }, armor: { name: 'Armor', v: [3, .8], u: '' },
  str: { name: 'Strength', v: [2, .3], u: '' }, dex: { name: 'Dexterity', v: [2, .3], u: '' }, int: { name: 'Intelligence', v: [2, .3], u: '' }, vit: { name: 'Vitality', v: [2, .3], u: '' },
  regen: { name: 'HP Regen', v: [.5, .12], u: '/s' }, cdr: { name: 'Cooldown Reduction', v: [4, .15], u: '%' }, abil: { name: 'Ability Damage', v: [6, 1], u: '%' },
  gold: { name: 'Gold Find', v: [10, 1], u: '%' }, xp: { name: 'XP Gain', v: [6, .5], u: '%' }, block: { name: 'Block Chance', v: [4, .25], u: '%' }
};
const PREFIXES = [['Flaming', 'fire'], ['Frozen', 'ice'], ['Thundering', 'shock'], ['Venomous', 'poison'], ['Vampiric', 'lifesteal'], ['Swift', 'atkSpd'], ['Brutal', 'dmg'], ['Keen', 'crit'], ['Savage', 'critDmg'], ['Piercing', 'armorPen'], ['Ancient', 'abil'], ['Shadow', 'crit'], ['Gilded', 'gold'], ['Sturdy', 'armor']];
const SUFFIXES = [['of the Wolf', 'move'], ['of Fortune', 'luck'], ['of Storms', 'shock'], ['of the Bear', 'hp'], ['of the Titan', 'str'], ['of the Fox', 'dex'], ['of the Sage', 'int'], ['of Vigor', 'vit'], ['of Slaughter', 'critDmg'], ['of the Leech', 'lifesteal'], ['of Embers', 'fire'], ['of Winter', 'ice'], ['of Warding', 'armor'], ['of Haste', 'cdr'], ['of Wisdom', 'xp'], ['of Renewal', 'regen'], ['of the Depths', 'mp']];

const RARITIES = [
  { id: 'common', name: 'Common', color: '#b9b1a2', mult: 1, affix: [0, 1], w: 600 },
  { id: 'uncommon', name: 'Uncommon', color: '#6fc46a', mult: 1.12, affix: [1, 1], w: 260 },
  { id: 'rare', name: 'Rare', color: '#5a9cf0', mult: 1.28, affix: [2, 2], w: 100 },
  { id: 'epic', name: 'Epic', color: '#b769ea', mult: 1.48, affix: [3, 3], w: 30 },
  { id: 'legendary', name: 'Legendary', color: '#f0a830', mult: 1.75, affix: [3, 4], w: 6 },
  { id: 'mythic', name: 'Mythic', color: '#ff4d6d', mult: 2.1, affix: [4, 5], w: .8 }
];
/* Legendary powers: special on-hit effects handled in onPlayerHit() */
const POWERS = {
  ignite: { name: 'Ignite', desc: 'Every hit sets enemies ablaze.' },
  vampire: { name: 'Bloodthirst', desc: '+6% lifesteal. Kills restore 3% max HP.' },
  chain: { name: 'Chain Lightning', desc: '30% chance on hit to arc lightning to 3 enemies.' },
  frostbite: { name: 'Frostbite', desc: 'Hits chill enemies; 12% chance to freeze them solid.' },
  shadow: { name: 'Nightblade', desc: '+120% damage while stealthed or right after a dash.' },
  execute: { name: 'Executioner', desc: 'Double damage against enemies below 30% HP.' },
  meteor: { name: 'Skyfall', desc: '8% chance on hit to call down a meteor.' },
  soul: { name: 'Soul Reaper', desc: 'Kills raise a skeleton ally for 10s.' },
  midas: { name: 'Midas Touch', desc: '+60% gold. Hits have a 6% chance to spill coins.' },
  echo: { name: 'Echo', desc: '25% chance for attacks to strike twice.' },
  split: { name: 'Splinter', desc: 'Attacks release 2 extra projectiles.' },
  thorns: { name: 'Retribution', desc: 'Reflect 60% of damage taken back at the attacker.' }
};
const UNIQUES = [
  { name: 'Emberbrand', type: 'sword', power: 'ignite' }, { name: 'Crimson Kiss', type: 'sword', power: 'vampire' },
  { name: 'Stormcaller', type: 'hammer', power: 'chain' }, { name: 'Rimeheart', type: 'staff', power: 'frostbite' },
  { name: 'Nightfang', type: 'dagger', power: 'shadow' }, { name: 'Headsman', type: 'axe', power: 'execute' },
  { name: 'Skyfall', type: 'greatsword', power: 'meteor' }, { name: 'Gravewhisper', type: 'wand', power: 'soul' },
  { name: 'Goldtongue', type: 'spear', power: 'midas' }, { name: 'Twinstring', type: 'bow', power: 'split' },
  { name: 'Aegis of Dawn', type: 'shield', power: 'thorns' }, { name: 'Echoing Rod', type: 'staff', power: 'echo' }
];

/* ---------------- ENEMIES ----------------
   ai: melee | ranged | dodger | tank | flyer | support | summoner | caster | slime | mimic | thief */
const ENEMIES = {
  skeleton: { name: 'Skeleton', tpl: 'skel', pal: PAL({ 4: '#d8d0bc', 5: '#ff5a3a' }), hp: 26, dmg: 7, spd: 38, ai: 'melee', xp: 5, undead: 1, desc: 'Rattling bones bound to guard the crypt.' },
  skelarcher: { name: 'Skeleton Archer', tpl: 'skel', pal: PAL({ 4: '#c8bca0', 5: '#5ad0ff' }), hp: 20, dmg: 7, spd: 34, ai: 'ranged', proj: 'arrow', xp: 6, undead: 1, desc: 'Looses bone-tipped arrows from a distance.' },
  zombie: { name: 'Zombie', tpl: 'human', pal: PAL({ 2: '#3a4a30', 8: '#7a9a6a', 5: '#e8e060', 6: '#4a4038', 4: '#2a2a26', 3: '#2a2a26' }), hp: 44, dmg: 10, spd: 24, ai: 'melee', xp: 6, undead: 1, desc: 'Slow, relentless and always hungry.' },
  bat: { name: 'Bat', tpl: 'bat', pal: PAL({ 2: '#4a3a52', 5: '#ff4040' }), hp: 11, dmg: 5, spd: 82, ai: 'flyer', xp: 3, r: 4, fly: 1, desc: 'Erratic fliers that swarm in the dark.' },
  cultist: { name: 'Cultist', tpl: 'human', pal: PAL({ 2: '#6a1f2e', 8: '#2a1a20', 5: '#ff5a3a', 6: '#5a1a28', 4: '#d4a13a', 3: '#2a1a20' }), hp: 30, dmg: 8, spd: 40, ai: 'support', proj: 'dark', xp: 8, desc: 'Heals and empowers the monsters around it. Kill it first.' },
  goblin: { name: 'Goblin', tpl: 'human', pal: PAL({ 2: '#5a3a1a', 8: '#6fa048', 5: '#ffdd33', 6: '#8a5a2a', 4: '#3a2a1a', 3: '#4a3a20' }), hp: 18, dmg: 6, spd: 64, ai: 'dodger', xp: 5, scale: .85, desc: 'Quick and shifty. Sidesteps your swings.' },
  goblinarcher: { name: 'Goblin Archer', tpl: 'human', pal: PAL({ 2: '#3a5a2a', 8: '#6fa048', 5: '#ffdd33', 6: '#5a4a2a', 4: '#8a6a3a', 3: '#3a2a1a' }), hp: 16, dmg: 6, spd: 56, ai: 'ranged', proj: 'arrow', xp: 5, scale: .85, desc: 'Keeps its distance and peppers you with arrows.' },
  goblinshaman: { name: 'Goblin Shaman', tpl: 'human', pal: PAL({ 2: '#8a2a8a', 8: '#6fa048', 5: '#ff60ff', 6: '#5a3a6a', 4: '#e0c040', 3: '#3a2a1a' }), hp: 24, dmg: 6, spd: 44, ai: 'summoner', summon: 'goblin', proj: 'orb', xp: 9, scale: .9, desc: 'Calls goblin reinforcements from the tunnels.' },
  orc: { name: 'Orc', tpl: 'human', pal: PAL({ 2: '#2a2a2a', 8: '#5a8a3a', 5: '#ff4020', 6: '#7a3a2a', 4: '#9a9a9a', 3: '#3a2a20' }), hp: 80, dmg: 14, spd: 32, ai: 'tank', xp: 12, scale: 1.3, r: 7, desc: 'A brute that lowers its head and charges.' },
  slime: { name: 'Slime', tpl: 'slime', pal: PAL({ 2: '#4ac04a', 3: '#2a7a2a', 4: '#9af09a', 5: '#103010' }), hp: 26, dmg: 7, spd: 30, ai: 'slime', xp: 5, split: 1, desc: 'Splits into smaller slimes when struck down.' },
  spider: { name: 'Cave Spider', tpl: 'spider', pal: PAL({ 2: '#3a2a3a', 3: '#2a1a2a', 5: '#ff3030' }), hp: 20, dmg: 6, spd: 72, ai: 'melee', elem: 'poison', xp: 5, desc: 'Venomous bite. Poison stacks.' },
  wolf: { name: 'Dire Wolf', tpl: 'beast', pal: PAL({ 2: '#6a6a70', 3: '#4a4a50', 5: '#ffcc33', 8: '#dddddd' }), hp: 30, dmg: 9, spd: 76, ai: 'melee', xp: 7, desc: 'Hunts in packs through the old wood.' },
  dryad: { name: 'Corrupted Dryad', tpl: 'human', pal: PAL({ 2: '#3a8a3a', 8: '#a0c880', 5: '#ff60a0', 6: '#2a6a2a', 4: '#e070a0', 3: '#1a3a1a' }), hp: 28, dmg: 8, spd: 40, ai: 'caster', proj: 'thorn', xp: 9, desc: 'Summons grasping roots beneath your feet.' },
  sapling: { name: 'Sapling', tpl: 'tree', pal: PAL({ 2: '#3a5a2a', 3: '#5a4028', 4: '#2a1a10', 5: '#e0ff60' }), hp: 40, dmg: 9, spd: 22, ai: 'tank', xp: 7, scale: .7, r: 6, desc: 'A young treant. Stubborn and hard to fell.' },
  frostskel: { name: 'Frost Skeleton', tpl: 'skel', pal: PAL({ 4: '#c8e8ff', 5: '#40c0ff' }), hp: 30, dmg: 8, spd: 38, ai: 'melee', elem: 'ice', xp: 6, undead: 1, desc: 'Its touch chills to the bone.' },
  frostling: { name: 'Frostling', tpl: 'slime', pal: PAL({ 2: '#8ad0f0', 3: '#4a90c0', 4: '#e0f6ff', 5: '#10304a' }), hp: 28, dmg: 7, spd: 32, ai: 'slime', split: 1, elem: 'ice', xp: 6, desc: 'A living clump of ice that splits apart.' },
  yeti: { name: 'Yeti', tpl: 'human', pal: PAL({ 2: '#e8f0f8', 8: '#a8c0d8', 5: '#3060a0', 6: '#d8e4f0', 4: '#b0c4d8', 3: '#8aa0b8' }), hp: 90, dmg: 15, spd: 32, ai: 'tank', xp: 13, scale: 1.4, r: 8, desc: 'A mountain of fur and fury.' },
  icebat: { name: 'Ice Bat', tpl: 'bat', pal: PAL({ 2: '#4a7aa0', 5: '#e0ffff' }), hp: 12, dmg: 5, spd: 84, ai: 'flyer', elem: 'ice', xp: 3, r: 4, fly: 1, desc: 'Its bite slows you down.' },
  frostmage: { name: 'Frost Mage', tpl: 'human', pal: PAL({ 2: '#2a5a9a', 8: '#d8e8f0', 5: '#40c0ff', 6: '#3a70b0', 4: '#c8e8ff', 3: '#1a3050' }), hp: 26, dmg: 9, spd: 40, ai: 'caster', proj: 'ice', elem: 'ice', xp: 9, desc: 'Drops icicles from the ceiling.' },
  imp: { name: 'Imp', tpl: 'horned', pal: PAL({ 2: '#b03020', 8: '#d04030', 5: '#ffe040', 6: '#8a2018', 7: '#302020', 4: '#401010', 3: '#401010' }), hp: 18, dmg: 7, spd: 64, ai: 'ranged', proj: 'fire', elem: 'fire', xp: 6, scale: .75, fly: 1, demon: 1, desc: 'Cackling little firestarters.' },
  magmaslime: { name: 'Magma Slime', tpl: 'slime', pal: PAL({ 2: '#f06a1a', 3: '#a03010', 4: '#ffd040', 5: '#3a0a00' }), hp: 30, dmg: 8, spd: 30, ai: 'slime', split: 1, elem: 'fire', xp: 6, desc: 'Molten rock that burns on contact.' },
  fireknight: { name: 'Flame Knight', tpl: 'human', pal: PAL({ 2: '#5a2a20', 8: '#1a1220', 5: '#ff8030', 6: '#8a3a1a', 7: '#e08040', 4: '#e08040', 3: '#3a1a10' }), hp: 95, dmg: 14, spd: 34, ai: 'tank', elem: 'fire', armor: .35, xp: 14, scale: 1.15, r: 6, desc: 'Armoured in cooling slag. Resists damage.' },
  demon: { name: 'Demon', tpl: 'horned', pal: PAL({ 2: '#8a1a1a', 8: '#b82a2a', 5: '#ffe040', 6: '#5a0a0a', 7: '#e8d8c8', 4: '#302020', 3: '#300a0a' }), hp: 70, dmg: 13, spd: 48, ai: 'melee', elem: 'fire', xp: 12, scale: 1.2, r: 6, demon: 1, desc: 'Hellspawn with burning claws.' },
  hellhound: { name: 'Hellhound', tpl: 'beast', pal: PAL({ 2: '#5a1a10', 3: '#3a0a08', 5: '#ffb020', 8: '#ff6a20' }), hp: 36, dmg: 10, spd: 82, ai: 'melee', elem: 'fire', xp: 8, demon: 1, desc: 'Fast, feral and on fire.' },
  ghost: { name: 'Ghost', tpl: 'ghost', pal: PAL({ 4: '#c8d4e8', 3: '#8a98b0', 5: '#1a1220' }), hp: 24, dmg: 8, spd: 46, ai: 'flyer', ghost: 1, fly: 1, xp: 7, undead: 1, desc: 'Drifts through walls.' },
  knight: { name: 'Knight', tpl: 'human', pal: PAL({ 2: '#8a909a', 8: '#1a1220', 5: '#e04040', 6: '#6a707a', 7: '#c8ccd4', 4: '#c8ccd4', 3: '#3a3e46' }), hp: 100, dmg: 15, spd: 34, ai: 'tank', armor: .4, xp: 14, scale: 1.15, r: 6, desc: 'Cursed plate that still remembers its oath.' },
  archer: { name: 'Castle Archer', tpl: 'human', pal: PAL({ 2: '#5a3a5a', 6: '#4a3a2a', 4: '#a08040', 3: '#2a2020' }), hp: 22, dmg: 8, spd: 42, ai: 'ranged', proj: 'arrow', xp: 7, desc: 'Fires from the battlements.' },
  darkmage: { name: 'Dark Mage', tpl: 'human', pal: PAL({ 2: '#2a1a3a', 8: '#9080a0', 5: '#c060ff', 6: '#3a1a4a', 4: '#8a60c0', 3: '#1a1020' }), hp: 28, dmg: 9, spd: 40, ai: 'caster', proj: 'dark', xp: 9, desc: 'Curses the ground you stand on.' },
  necroacolyte: { name: 'Acolyte', tpl: 'human', pal: PAL({ 2: '#1a1a1a', 8: '#a8c0a0', 5: '#9fff7a', 6: '#2a2a2a', 4: '#6a8a5a', 3: '#101010' }), hp: 26, dmg: 7, spd: 40, ai: 'summoner', summon: 'skeleton', proj: 'dark', xp: 9, desc: 'Keeps raising the dead until you stop it.' },
  drowned: { name: 'Drowned One', tpl: 'human', pal: PAL({ 2: '#2a5a5a', 8: '#6a9a90', 5: '#e0ff80', 6: '#3a4a4a', 4: '#1a2a2a', 3: '#1a2a2a' }), hp: 48, dmg: 11, spd: 28, ai: 'melee', xp: 7, undead: 1, desc: 'Sailors the sea never gave back.' },
  crab: { name: 'Reef Crab', tpl: 'spider', pal: PAL({ 2: '#d0602a', 3: '#8a3a1a', 5: '#101010' }), hp: 40, dmg: 9, spd: 50, ai: 'melee', armor: .35, xp: 7, desc: 'Hard shell, harder pincers.' },
  siren: { name: 'Siren', tpl: 'ghost', pal: PAL({ 4: '#6ae0d0', 3: '#3a9a90', 5: '#10302a' }), hp: 26, dmg: 9, spd: 44, ai: 'caster', proj: 'orb', fly: 1, xp: 9, desc: 'Her song pulls water up from the floor.' },
  eel: { name: 'Cave Eel', tpl: 'bat', pal: PAL({ 2: '#2a6a60', 5: '#f0f080' }), hp: 16, dmg: 7, spd: 80, ai: 'flyer', elem: 'shock', fly: 1, xp: 4, r: 4, desc: 'Shocking to the touch.' },
  shade: { name: 'Shade', tpl: 'ghost', pal: PAL({ 4: '#3a3050', 3: '#1a1428', 5: '#c080ff' }), hp: 30, dmg: 10, spd: 52, ai: 'flyer', ghost: 1, fly: 1, xp: 8, desc: 'A shadow that forgot its owner.' },
  voidspider: { name: 'Void Spider', tpl: 'spider', pal: PAL({ 2: '#3a1a5a', 3: '#1a0a2a', 5: '#c080ff' }), hp: 28, dmg: 8, spd: 76, ai: 'dodger', elem: 'poison', xp: 7, desc: 'Blinks in and out of reality.' },
  shadowknight: { name: 'Shadow Knight', tpl: 'human', pal: PAL({ 2: '#2a2438', 8: '#0a0810', 5: '#b070ff', 6: '#1a1628', 7: '#5a4a80', 4: '#5a4a80', 3: '#100c18' }), hp: 110, dmg: 16, spd: 36, ai: 'tank', armor: .4, xp: 15, scale: 1.2, r: 6, desc: 'Sworn to the Shadow King.' },
  wraith: { name: 'Wraith', tpl: 'ghost', pal: PAL({ 4: '#8a70b0', 3: '#4a3a70', 5: '#ffffff' }), hp: 30, dmg: 10, spd: 44, ai: 'caster', proj: 'dark', fly: 1, ghost: 1, xp: 10, undead: 1, desc: 'Screams dark bolts through walls.' },
  succubus: { name: 'Succubus', tpl: 'horned', pal: PAL({ 2: '#e050a0', 8: '#e0a0c0', 5: '#ff2060', 6: '#8a1a4a', 7: '#402030', 4: '#ffd0e0', 3: '#401028' }), hp: 34, dmg: 10, spd: 50, ai: 'caster', proj: 'dark', xp: 10, demon: 1, desc: 'Charming and deadly at range.' },
  mummy: { name: 'Mummy', tpl: 'human', pal: PAL({ 2: '#d8ccaa', 8: '#c8bc9a', 5: '#40ff90', 6: '#c0b490', 4: '#a89c7a', 3: '#8a7e5e' }), hp: 52, dmg: 11, spd: 28, ai: 'melee', elem: 'poison', xp: 8, undead: 1, desc: 'Its wrappings are soaked in old venom.' },
  scarab: { name: 'Scarab', tpl: 'spider', pal: PAL({ 2: '#c8a030', 3: '#6a5010', 5: '#40e0ff' }), hp: 18, dmg: 6, spd: 84, ai: 'melee', xp: 4, desc: 'Swarms out of the sand.' },
  templeguard: { name: 'Temple Guard', tpl: 'human', pal: PAL({ 2: '#d0a030', 8: '#1a1220', 5: '#40e0ff', 6: '#8a6a30', 7: '#f0d060', 4: '#f0d060', 3: '#5a4420' }), hp: 105, dmg: 15, spd: 36, ai: 'tank', armor: .4, xp: 15, scale: 1.2, r: 6, desc: 'Golden sentinels that never sleep.' },
  sandgolem: { name: 'Sand Golem', tpl: 'human', pal: PAL({ 2: '#b89868', 8: '#a88858', 5: '#40e0ff', 6: '#9a7a4a', 4: '#7a5a3a', 3: '#6a4a2a' }), hp: 130, dmg: 17, spd: 26, ai: 'tank', xp: 16, scale: 1.5, r: 8, desc: 'Crumbles slowly. Hits like a landslide.' },
  priest: { name: 'Sun Priest', tpl: 'human', pal: PAL({ 2: '#f0e8d0', 8: '#c8a080', 6: '#e8dcc0', 4: '#d0a030', 3: '#8a7a5a', 5: '#1a1220' }), hp: 34, dmg: 8, spd: 40, ai: 'support', proj: 'holy', xp: 10, desc: 'Mends the temple guardians.' },
  mimic: { name: 'Mimic', tpl: 'mimic', pal: PAL({ 2: '#7a5230', 3: '#4e331d', 7: '#d0a040', 4: '#ffffff', 6: '#a01a2a', 5: '#ffe040' }), hp: 70, dmg: 13, spd: 72, ai: 'mimic', xp: 20, desc: 'Not every chest wants to be opened.' },
  treasuregoblin: { name: 'Treasure Goblin', tpl: 'human', pal: PAL({ 2: '#d0a030', 8: '#6fa048', 5: '#ffdd33', 6: '#c89030', 4: '#ffe060', 3: '#6a4a20' }), hp: 70, dmg: 0, spd: 70, ai: 'thief', xp: 25, scale: .9, desc: 'Runs off with a sack of gold. Catch it before it escapes.' }
};
const ELITE_MODS = {
  burning: { name: 'Burning', c: '#ff7a30', desc: 'leaves fire and burns on hit' },
  frozen: { name: 'Frozen', c: '#8ad8ff', desc: 'chills on hit' },
  fast: { name: 'Swift', c: '#f0f070', desc: 'moves and attacks faster' },
  giant: { name: 'Giant', c: '#d0a070', desc: 'huge and tough' },
  vampiric: { name: 'Vampiric', c: '#e03050', desc: 'heals when it hits' },
  armored: { name: 'Armored', c: '#b0b8c8', desc: 'reduces damage taken' },
  explosive: { name: 'Explosive', c: '#ff5020', desc: 'explodes on death' },
  blinking: { name: 'Blinking', c: '#b080ff', desc: 'teleports around' }
};

/* ---------------- BOSSES ----------------
   pats: [patternName, minPhase]. Patterns live in BOSS_PATS (combat file). */
const BOSSES = {
  guardian: { name: 'The Dungeon Guardian', tpl: 'crowned', pal: PAL({ 2: '#6a707a', 8: '#1a1220', 5: '#ff3a2a', 6: '#4a5058', 7: '#d4a13a', 4: '#d4a13a', 3: '#2a2e36' }), scale: 3, hp: 900, dmg: 13, spd: 34, r: 13, move: 'chase', cd: 2.4, phases: [.5],
    pats: [['slam', 0], ['charge', 0], ['summon', 0], ['spin', 1]], minions: ['skeleton', 'skelarcher'], desc: 'An ancient warden of stone and iron. Grows faster when wounded.' },
  grukk: { name: 'Grukk the Goblin King', tpl: 'crowned', pal: PAL({ 2: '#5a3a1a', 8: '#6fa048', 5: '#ff3a2a', 6: '#8a2a2a', 7: '#f0c040', 4: '#f0c040', 3: '#3a2a1a' }), scale: 3, hp: 1000, dmg: 12, spd: 46, r: 12, move: 'chase', cd: 2.2, phases: [.5],
    pats: [['bombs', 0], ['spin', 0], ['summon', 0], ['charge', 1]], minions: ['goblin', 'goblinarcher'], desc: 'Throws bombs, spins like a madman and never fights alone.' },
  treant: { name: 'Elder Rotwood', tpl: 'tree', pal: PAL({ 2: '#2a4a1e', 3: '#4a3420', 4: '#1a1008', 5: '#ffe040' }), scale: 3, hp: 1250, dmg: 13, spd: 12, r: 16, move: 'static', cd: 2.3, phases: [.6, .3],
    pats: [['roots', 0], ['spores', 0], ['thornring', 0], ['summon', 1], ['roots', 2]], minions: ['sapling', 'spider'], desc: 'The oldest tree in the forest, rotten to the core.' },
  frostqueen: { name: 'Queen Rimeveil', tpl: 'crowned', pal: PAL({ 2: '#c8e8ff', 8: '#e8f4ff', 5: '#2a8aff', 6: '#6ab0e0', 7: '#ffffff', 4: '#ffffff', 3: '#3a70b0' }), scale: 3, hp: 1300, dmg: 13, spd: 40, r: 12, move: 'keep', cd: 2.1, phases: [.5],
    pats: [['icicles', 0], ['nova', 0], ['blink', 0], ['spiral', 1]], desc: 'Queen of the frozen deep. Her spiral of ice is hard to escape.' },
  dragon: { name: 'Ignaroth the Fire Dragon', tpl: 'dragon', pal: PAL({ 2: '#b8321a', 3: '#6a1a0a', 5: '#ffe040', 6: '#e07a2a', 4: '#ffb060' }), scale: 2.6, hp: 1600, dmg: 15, spd: 40, r: 18, move: 'chase', cd: 2.2, phases: [.6, .3],
    pats: [['breath', 0], ['fireballs', 0], ['dive', 0], ['lava', 1], ['meteors', 2]], desc: 'Breathes fire, takes to the air and floods the fortress with lava. Enrages below 30%.' },
  necromancer: { name: 'Malgrath the Necromancer', tpl: 'crowned', pal: PAL({ 2: '#1e1826', 8: '#a8c0a0', 5: '#9fff7a', 6: '#2a1a3a', 7: '#8a7aa0', 4: '#9fff7a', 3: '#16121c' }), scale: 3, hp: 1500, dmg: 13, spd: 36, r: 12, move: 'keep', cd: 2.0, phases: [.5],
    pats: [['summon', 0], ['teleport', 0], ['darkbolts', 0], ['heal', 0], ['bonering', 1]], minions: ['skeleton', 'skelarcher', 'zombie'], desc: 'Heals himself while his minions live. Kill the minions.' },
  kraken: { name: 'The Drowned Leviathan', tpl: 'kraken', pal: PAL({ 2: '#2a6a7a', 3: '#1a3a4a', 5: '#ffe060' }), scale: 3, hp: 1900, dmg: 14, spd: 30, r: 16, move: 'hover', cd: 2.2, phases: [.55],
    pats: [['tentacles', 0], ['wave', 0], ['submerge', 0], ['ink', 1]], desc: 'Slams tentacles across the room and hides beneath the water.' },
  shadowking: { name: 'The Shadow King', tpl: 'crowned', pal: PAL({ 2: '#1a1428', 8: '#0a0810', 5: '#c080ff', 6: '#120e1c', 7: '#8a6ad0', 4: '#8a6ad0', 3: '#08060e' }), scale: 3, hp: 2000, dmg: 15, spd: 58, r: 12, move: 'chase', cd: 2.0, phases: [.66, .33],
    pats: [['shadowstrike', 0], ['clones', 0], ['darkness', 0], ['darkbolts', 1]], desc: 'Teleports, splits into clones and swallows the light. Becomes frighteningly fast at the end.' },
  archdemon: { name: 'Baalzor the Archdemon', tpl: 'horned', pal: PAL({ 2: '#6a0a0a', 8: '#a01a1a', 5: '#ffe040', 6: '#3a0606', 7: '#f0e0c0', 4: '#ff6a2a', 3: '#200404' }), scale: 3.2, hp: 2400, dmg: 16, spd: 44, r: 14, move: 'chase', cd: 1.9, phases: [.5],
    pats: [['hellfire', 0], ['meteors', 0], ['charge', 0], ['summon', 0], ['firering', 1]], minions: ['imp', 'hellhound'], desc: 'Lord of the citadel. Rains fire from the sky.' },
  sentinel: { name: 'The Eternal Sentinel', tpl: 'eye', pal: PAL({ 2: '#f0e0b0', 3: '#c8a050', 5: '#40e0ff', 7: '#f0c040' }), scale: 3, hp: 2900, dmg: 16, spd: 30, r: 16, move: 'hover', cd: 1.9, phases: [.66, .33],
    pats: [['spiral', 0], ['beams', 0], ['judgment', 0], ['summon', 1], ['wave', 2]], minions: ['templeguard', 'scarab'], desc: 'The final guardian. Bullet storms, sweeping beams and divine judgment.' }
};

/* ---------------- REGIONS ---------------- */
const BIOMES = [
  { id: 'crypt', name: 'Forgotten Crypt', floor: '#3a3440', floor2: '#322c38', line: '#2a2430', wall: '#4d4556', wallHi: '#6a6075', wallDark: '#2c2633', top: '#141018', liquid: null, trap: 'spikes', decor: ['bones', 'skull', 'rubble', 'candle'], dark: .84, light: '255,190,120',
    enemies: ['skeleton', 'zombie', 'bat', 'skelarcher', 'cultist'], boss: 'guardian', music: { root: 110, scale: [0, 2, 3, 7, 8], tempo: 66, seed: 11 }, hazard: 'Spike traps' },
  { id: 'caves', name: 'Goblin Caves', floor: '#4a3b2c', floor2: '#3f3226', line: '#33281e', wall: '#5e4a36', wallHi: '#7a6248', wallDark: '#3a2d20', top: '#18120c', liquid: 'poison', trap: 'spikes', decor: ['mushroom', 'rubble', 'bones', 'mushroom'], dark: .8, light: '255,200,130', organic: 1,
    enemies: ['goblin', 'goblinarcher', 'goblinshaman', 'orc', 'slime', 'spider', 'bat'], boss: 'grukk', music: { root: 98, scale: [0, 3, 5, 7, 10], tempo: 84, seed: 22 }, hazard: 'Poison pools' },
  { id: 'forest', name: 'Ancient Forest', floor: '#2f4a2c', floor2: '#294126', line: '#223820', wall: '#3b2d22', wallHi: '#5a4632', wallDark: '#241a13', top: '#0c160b', liquid: 'swamp', trap: 'spikes', decor: ['grass', 'fern', 'mushroom', 'flower'], dark: .74, light: '220,255,170', organic: 1,
    enemies: ['wolf', 'spider', 'slime', 'dryad', 'sapling', 'bat'], boss: 'treant', music: { root: 131, scale: [0, 2, 4, 7, 9], tempo: 72, seed: 33 }, hazard: 'Sucking swamp' },
  { id: 'frozen', name: 'Frozen Caverns', floor: '#3c5364', floor2: '#35495a', line: '#2c3e4d', wall: '#6a8aa0', wallHi: '#a9cbe0', wallDark: '#3e5566', top: '#121c26', liquid: 'ice', trap: 'spikes', decor: ['crystal', 'crystal', 'rubble', 'snow'], dark: .72, light: '170,220,255', organic: 1,
    enemies: ['frostskel', 'frostling', 'yeti', 'icebat', 'frostmage'], boss: 'frostqueen', music: { root: 117, scale: [0, 2, 3, 7, 10], tempo: 60, seed: 44 }, hazard: 'Slippery ice' },
  { id: 'lava', name: 'Lava Fortress', floor: '#3a2a26', floor2: '#33241f', line: '#2a1c18', wall: '#4a302a', wallHi: '#6e453a', wallDark: '#2a1814', top: '#120807', liquid: 'lava', trap: 'vent', decor: ['ember', 'rubble', 'bones', 'ember'], dark: .68, light: '255,150,80',
    enemies: ['imp', 'magmaslime', 'fireknight', 'demon', 'hellhound'], boss: 'dragon', music: { root: 82, scale: [0, 1, 4, 5, 7, 8], tempo: 80, seed: 55 }, hazard: 'Lava and fire vents' },
  { id: 'castle', name: 'Haunted Castle', floor: '#3b2f33', floor2: '#45262c', line: '#2a2024', wall: '#555060', wallHi: '#777184', wallDark: '#34303c', top: '#121016', liquid: null, trap: 'spikes', decor: ['candle', 'bones', 'rug', 'skull'], dark: .86, light: '255,210,150',
    enemies: ['ghost', 'knight', 'archer', 'darkmage', 'necroacolyte', 'skeleton'], boss: 'necromancer', music: { root: 104, scale: [0, 2, 3, 5, 7, 8, 11], tempo: 70, seed: 66 }, hazard: 'Spike traps' },
  { id: 'sunken', name: 'Sunken Ruins', floor: '#2b4a4a', floor2: '#254040', line: '#1d3434', wall: '#3f6660', wallHi: '#5f8c84', wallDark: '#274440', top: '#0b1818', liquid: 'water', trap: 'arrow', decor: ['seaweed', 'shell', 'rubble', 'coral'], dark: .78, light: '150,240,230',
    enemies: ['drowned', 'crab', 'siren', 'eel', 'slime'], boss: 'kraken', music: { root: 93, scale: [0, 2, 5, 7, 9], tempo: 64, seed: 77 }, hazard: 'Deep water and arrow traps' },
  { id: 'shadow', name: 'Shadow Realm', floor: '#1f1a2e', floor2: '#241d36', line: '#171325', wall: '#3a2f55', wallHi: '#5a4a80', wallDark: '#221b35', top: '#07050c', liquid: 'void', trap: 'spikes', decor: ['wisp', 'crystal', 'rubble', 'glyph'], dark: .9, light: '190,150,255',
    enemies: ['shade', 'voidspider', 'shadowknight', 'wraith', 'bat'], boss: 'shadowking', music: { root: 87, scale: [0, 1, 3, 6, 7, 10], tempo: 62, seed: 88 }, hazard: 'Void rifts' },
  { id: 'citadel', name: 'Demon Citadel', floor: '#3a1f22', floor2: '#43222a', line: '#2a1418', wall: '#5a2a2e', wallHi: '#823c3e', wallDark: '#35171a', top: '#110608', liquid: 'lava', trap: 'vent', decor: ['skull', 'ember', 'glyph', 'bones'], dark: .76, light: '255,120,90',
    enemies: ['demon', 'imp', 'hellhound', 'succubus', 'cultist', 'fireknight'], boss: 'archdemon', music: { root: 73, scale: [0, 1, 3, 5, 6, 8, 10], tempo: 88, seed: 99 }, hazard: 'Lava and fire vents' },
  { id: 'temple', name: 'Ancient Temple', floor: '#6b5a3a', floor2: '#625233', line: '#54462b', wall: '#8a7550', wallHi: '#b89c68', wallDark: '#5a4a30', top: '#1c160d', liquid: null, trap: 'arrow', decor: ['glyph', 'rubble', 'urn', 'glyph'], dark: .7, light: '255,230,160',
    enemies: ['mummy', 'scarab', 'templeguard', 'sandgolem', 'priest'], boss: 'sentinel', music: { root: 123, scale: [0, 1, 4, 5, 7, 8, 11], tempo: 76, seed: 111 }, hazard: 'Arrow and spike traps' }
];

const DIFFS = [
  { id: 'easy', name: 'Easy', hp: .65, dmg: .55, elite: .03, heal: 1.3, loot: .9, xp: .9, boss: .8, shards: .7, req: 0, c: '#7bd88a' },
  { id: 'normal', name: 'Normal', hp: 1, dmg: 1, elite: .07, heal: 1, loot: 1, xp: 1, boss: 1, shards: 1, req: 0, c: '#d8d0c0' },
  { id: 'hard', name: 'Hard', hp: 1.5, dmg: 1.35, elite: .12, heal: .85, loot: 1.25, xp: 1.3, boss: 1.2, shards: 1.4, req: 0, c: '#f0c060' },
  { id: 'nightmare', name: 'Nightmare', hp: 2.3, dmg: 1.75, elite: .18, heal: .7, loot: 1.6, xp: 1.7, boss: 1.4, shards: 1.9, req: 3, c: '#f08a40' },
  { id: 'hell', name: 'Hell', hp: 3.4, dmg: 2.3, elite: .25, heal: .55, loot: 2.1, xp: 2.2, boss: 1.6, shards: 2.6, req: 6, c: '#ff5040' },
  { id: 'inferno', name: 'Inferno', hp: 5, dmg: 3.1, elite: .33, heal: .4, loot: 2.8, xp: 3, boss: 1.85, shards: 3.5, req: 10, c: '#ff2a6a' }
];

/* ---------------- POWER-UPS (boons last the whole run) ---------------- */
const BOONS = [
  { id: 'might', name: 'Might', desc: '+20% damage', mods: { dmg: 20 } },
  { id: 'haste', name: 'Haste', desc: '+15% move speed', mods: { move: 15 } },
  { id: 'precision', name: 'Precision', desc: '+10% critical chance', mods: { crit: 10 } },
  { id: 'twin', name: 'Twin Strike', desc: '20% chance to attack twice', mods: { double: 20 } },
  { id: 'leech', name: 'Leech', desc: '+5% lifesteal', mods: { lifesteal: 5 } },
  { id: 'windstep', name: 'Wind Step', desc: '+1 dash charge', mods: { dashCh: 1 } },
  { id: 'fire', name: 'Fire Attacks', desc: '+35% chance to burn', mods: { fire: 35 } },
  { id: 'venom', name: 'Venom Attacks', desc: '+35% chance to poison', mods: { poison: 35 } },
  { id: 'bulwark', name: 'Bulwark', desc: 'Gain a 10 HP shield on every kill', mods: { killShield: 10 } },
  { id: 'regen', name: 'Regeneration', desc: '+2 HP per second', mods: { regen: 2 } },
  { id: 'wisdom', name: 'Wisdom', desc: '+25% XP', mods: { xp: 25 } },
  { id: 'fortune', name: 'Fortune', desc: '+8 Luck', mods: { luck: 8 } },
  { id: 'frost', name: 'Frost Attacks', desc: '+30% chance to chill', mods: { ice: 30 } },
  { id: 'fury', name: 'Fury', desc: '+18% attack speed', mods: { atkSpd: 18 } },
  { id: 'berserk', rare: 1, name: 'Berserker', desc: '+45% damage and +25% attack speed', mods: { dmg: 45, atkSpd: 25 } },
  { id: 'phoenix', rare: 1, name: 'Phoenix Feather', desc: 'Revive once at 50% HP', mods: { revive: 1 } },
  { id: 'midas', rare: 1, name: 'Midas', desc: '+100% gold', mods: { gold: 100 } },
  { id: 'storm', rare: 1, name: 'Storm Heart', desc: '+25% chance to chain lightning', mods: { shock: 25 } },
  { id: 'glass', rare: 1, name: 'Glass Cannon', desc: '+80% damage, -30% max HP', mods: { dmg: 80, hpPct: -30 } },
  { id: 'clover', rare: 1, name: 'Four-Leaf Clover', desc: '+25 Luck', mods: { luck: 25 } },
  { id: 'titan', rare: 1, name: "Titan's Blood", desc: '+50% max HP', mods: { hpPct: 50 } },
  { id: 'chrono', rare: 1, name: 'Chrono Shard', desc: '-25% ability cooldowns', mods: { cdr: 25 } },
  { id: 'vampire', rare: 1, name: 'Vampire Lord', desc: '+12% lifesteal', mods: { lifesteal: 12 } }
];
/* Temporary elixirs sold in shops */
const ELIXIRS = [
  { id: 'wrath', name: 'Elixir of Wrath', desc: '+40% damage for 60s', dur: 60, mods: { dmg: 40 }, c: '#ff6a4a' },
  { id: 'swift', name: 'Elixir of Swiftness', desc: '+25% move and attack speed for 60s', dur: 60, mods: { move: 25, atkSpd: 25 }, c: '#f0e060' },
  { id: 'fortune', name: 'Elixir of Fortune', desc: '+30 Luck for 90s', dur: 90, mods: { luck: 30 }, c: '#7bd88a' },
  { id: 'stone', name: 'Elixir of Stone', desc: '+40 armor for 60s', dur: 60, mods: { armor: 40 }, c: '#b0b8c8' }
];

/* ---------------- LEVEL-UP CHOICES (pick 1 of 3) ---------------- */
const LEVEL_UPS = [
  { id: 'str', name: '+3 Strength', desc: 'Swords, axes, hammers and shields hit harder. +1 armor per 3.', apply: p => p.alloc.str += 3 },
  { id: 'dex', name: '+3 Dexterity', desc: '+1.2% crit and +3% attack speed. Bows, daggers and spears hit harder.', apply: p => p.alloc.dex += 3 },
  { id: 'int', name: '+3 Intelligence', desc: '+12 mana and faster mana regen. Staves and wands hit harder.', apply: p => p.alloc.int += 3 },
  { id: 'vit', name: '+3 Vitality', desc: '+24 max HP and faster regeneration.', apply: p => p.alloc.vit += 3 },
  { id: 'luck', name: '+4 Luck', desc: 'Better drops, chests, shops and more secrets.', apply: p => p.alloc.luck += 4 },
  { id: 'cruel', name: 'Cruelty', desc: '+20% critical damage.', apply: p => addMod(p, { critDmg: 20 }) },
  { id: 'fleet', name: 'Fleet', desc: '+6% move speed.', apply: p => addMod(p, { move: 6 }) },
  { id: 'leech', name: 'Leech', desc: '+2% lifesteal.', apply: p => addMod(p, { lifesteal: 2 }) },
  { id: 'focus', name: 'Focus', desc: '-6% ability cooldowns.', apply: p => addMod(p, { cdr: 6 }) },
  { id: 'hard', name: 'Hardened', desc: '+6 armor.', apply: p => addMod(p, { armor: 6 }) },
  { id: 'power', name: 'Power', desc: '+10% damage.', apply: p => addMod(p, { dmg: 10 }) },
  { id: 'pockets', name: 'Deep Pockets', desc: '+1 potion slot and refill all potions.', apply: p => { p.maxPotions++; p.potions = p.maxPotions; } },
  { id: 'juggernaut', cls: 'warrior', name: 'Juggernaut', desc: '+15 armor and +10% max HP.', apply: p => addMod(p, { armor: 15, hpPct: 10 }) },
  { id: 'bloodlust', cls: 'warrior', name: 'Bloodlust', desc: '+3% lifesteal and +10% attack speed.', apply: p => addMod(p, { lifesteal: 3, atkSpd: 10 }) },
  { id: 'assassin', cls: 'rogue', name: 'Assassin', desc: '+6% crit chance and +25% crit damage.', apply: p => addMod(p, { crit: 6, critDmg: 25 }) },
  { id: 'quickblades', cls: 'rogue', name: 'Quickblades', desc: '+15% attack speed.', apply: p => addMod(p, { atkSpd: 15 }) },
  { id: 'arcanemind', cls: 'mage', name: 'Arcane Mind', desc: '+25% max mana and +40% mana regen.', apply: p => addMod(p, { mpPct: 25, mpRegenPct: 40 }) },
  { id: 'spellweaver', cls: 'mage', name: 'Spellweaver', desc: '+15% ability damage and -5% cooldowns.', apply: p => addMod(p, { abil: 15, cdr: 5 }) },
  { id: 'eagleeye', cls: 'ranger', name: 'Eagle Eye', desc: 'Projectiles pierce 1 more enemy. +10% damage.', apply: p => addMod(p, { pierce: 1, dmg: 10 }) },
  { id: 'fleetfoot', cls: 'ranger', name: 'Fleetfoot', desc: '+10% move speed and +1 dash charge.', apply: p => addMod(p, { move: 10, dashCh: 1 }) },
  { id: 'zealot', cls: 'paladin', name: 'Zealot', desc: '+2 HP regen per second and +8 armor.', apply: p => addMod(p, { regen: 2, armor: 8 }) },
  { id: 'crusader', cls: 'paladin', name: 'Crusader', desc: '+15% ability damage and +8% damage.', apply: p => addMod(p, { abil: 15, dmg: 8 }) },
  { id: 'darkpact', cls: 'necro', name: 'Dark Pact', desc: 'Summons deal 30% more damage and last 30% longer.', apply: p => addMod(p, { summonDmg: 30, summonLife: 30 }) },
  { id: 'soulharvest', cls: 'necro', name: 'Soul Harvest', desc: 'Heal 4 HP and restore 3 mana per kill.', apply: p => addMod(p, { killHeal: 4, killMana: 3 }) }
];

/* ---------------- PERMANENT (hub) UPGRADES, paid in Soul Shards ---------------- */
const UPGRADES = [
  { id: 'vit', name: 'Heart of the Deep', desc: '+6% max HP per rank', max: 10, cost: l => 30 + l * 30 },
  { id: 'str', name: 'Honed Edge', desc: '+5% damage per rank', max: 10, cost: l => 35 + l * 32 },
  { id: 'luck', name: 'Four-Leaf Charm', desc: '+2 Luck per rank', max: 10, cost: l => 30 + l * 28 },
  { id: 'crit', name: "Hawk's Eye", desc: '+1.5% crit chance per rank', max: 5, cost: l => 40 + l * 40 },
  { id: 'swift', name: 'Light Boots', desc: '+3% move speed per rank', max: 5, cost: l => 35 + l * 35 },
  { id: 'mana', name: 'Deep Well', desc: '+8% max mana per rank', max: 5, cost: l => 25 + l * 25 },
  { id: 'potion', name: 'Potion Belt', desc: '+1 potion slot per rank', max: 3, cost: l => 80 + l * 90 },
  { id: 'gold', name: 'Inheritance', desc: 'Start each run with +40 gold per rank', max: 5, cost: l => 25 + l * 25 },
  { id: 'xp', name: 'Scholar', desc: '+8% XP per rank', max: 5, cost: l => 40 + l * 35 },
  { id: 'discount', name: 'Haggler', desc: '-6% shop prices per rank', max: 5, cost: l => 40 + l * 40 },
  { id: 'revive', name: 'Second Wind', desc: 'Revive once per run at 40% HP', max: 1, cost: () => 500 },
  { id: 'sense', name: 'Treasure Sense', desc: 'Chests, shops and secret walls show on the minimap', max: 1, cost: () => 250 }
];

/* ---------------- ACHIEVEMENTS (permanent rewards) ---------------- */
const ACHIEVEMENTS = [
  { id: 'firstblood', name: 'First Blood', desc: 'Defeat your first enemy.', reward: { shards: 10 } },
  { id: 'bossslayer', name: 'Boss Slayer', desc: 'Defeat any boss.', reward: { dmg: .03 } },
  { id: 'legendary', name: 'Legendary Hunter', desc: 'Find a Legendary item.', reward: { luck: 2 } },
  { id: 'mythic', name: 'Myth Made Real', desc: 'Find a Mythic item.', reward: { luck: 3 } },
  { id: 'lucky', name: 'Lucky', desc: 'Reach 40 Luck in a single run.', reward: { luck: 2 } },
  { id: 'treasure', name: 'Treasure Hunter', desc: 'Open 40 chests in total.', reward: { shards: 80 } },
  { id: 'nodamage', name: 'No Damage', desc: 'Clear a floor without taking damage.', reward: { hp: .03 } },
  { id: 'speedrun', name: 'Speed Runner', desc: 'Finish a floor in under 75 seconds.', reward: { speed: .03 } },
  { id: 'master', name: 'Dungeon Master', desc: 'Defeat all 10 bosses.', reward: { dmg: .05, hp: .05 } },
  { id: 'centurion', name: 'Centurion', desc: 'Defeat 150 enemies in one run.', reward: { shards: 60 } },
  { id: 'streak', name: 'Unstoppable', desc: 'Reach a 15 kill streak.', reward: { shards: 40 } },
  { id: 'combo', name: 'Combo Artist', desc: 'Reach a 50 hit combo.', reward: { shards: 40 } },
  { id: 'level20', name: 'Seasoned', desc: 'Reach level 20.', reward: { hp: .03 } },
  { id: 'rich', name: 'Hoarder', desc: 'Hold 1,500 gold at once.', reward: { shards: 50 } },
  { id: 'secret', name: 'Secret Keeper', desc: 'Discover a secret room.', reward: { luck: 1 } },
  { id: 'shopper', name: 'Valued Customer', desc: 'Buy 15 items from shops in total.', reward: { shards: 50 } },
  { id: 'elite', name: 'Elite Breaker', desc: 'Defeat 25 elite enemies in total.', reward: { dmg: .02 } },
  { id: 'endless10', name: 'Into the Abyss', desc: 'Reach floor 10 in Endless mode.', reward: { shards: 120 } },
  { id: 'hell', name: 'Hellwalker', desc: 'Defeat a boss on Hell or Inferno.', reward: { dmg: .04 } },
  { id: 'allclasses', name: 'Jack of All Trades', desc: 'Clear a floor with every class.', reward: { luck: 2, hp: .02 } },
  { id: 'victory', name: 'The Deepest Dark', desc: 'Finish a full run through the Ancient Temple.', reward: { shards: 300 } },
  ...Object.keys(BOSSES).map(k => ({ id: 'boss_' + k, name: 'Felled: ' + BOSSES[k].name.replace(/^The /, ''), desc: `Defeat ${BOSSES[k].name}.`, reward: { shards: 50 }, boss: k }))
];
