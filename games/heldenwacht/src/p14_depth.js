/* =====================================================================
   UITBREIDING 5 — Diepgang: rol-kenmerken, sterkere upgrades, ability-
   elementen, nieuwe speciale vijanden, elite-eigenschappen en baasfases
   ===================================================================== */

/* ---------- 1. Helden: rol-kenmerken ---------- */
// lvl 1 = basis, 2 = na upgrade 3, 3 = na upgrade 5 (ultimate)
const ROLE_PERK = {
  'Snelle aanvallen': { name: 'Momentum', v: [0.25, 0.4, 0.55], text: v => `Blijft hij aanvallen, dan gaat hij steeds sneller: tot +${Math.round(v * 100)}% aanvalssnelheid.` },
  'Hoge damage': { name: 'Pantserbreker', v: [0.15, 0.25, 0.35], v2: [3, 6, 10], text: (v, v2) => `Negeert ${v2} pantser en doet +${Math.round(v * 100)}% schade tegen bazen en elites.` },
  'Area damage': { name: 'Verwoesting', v: [0.15, 0.25, 0.35], text: (v, v2, l) => `+${Math.round(v * 100)}% explosiegrootte en brandschade${l >= 3 ? ', en 1 extra sprong voor kettingaanvallen' : ''}.` },
  'Controle': { name: 'Verzwakking', v: [0.1, 0.15, 0.2], text: v => `Vijanden die hij raakt, krijgen 1,5 seconde lang +${Math.round(v * 100)}% schade van alle helden.` },
  'Groot bereik': { name: 'Scherpschutter', v: [0.2, 0.35, 0.5], text: v => `+10% bereik. Hoe verder weg de vijand, hoe harder: tot +${Math.round(v * 100)}% schade aan de rand van zijn bereik.` },
  'Support': { name: 'Inspiratie', v: [0.12, 0.2, 0.3], text: v => `Helden in zijn buffbereik laden hun ability ${Math.round(v * 100)}% sneller op.` },
  'Geld': { name: 'Rente', v: [15, 30, 50], text: v => `Na elke golf krijg je $${v} plus een bonus die meegroeit met de golf.` },
  'Detectie': { name: 'Markeren', v: [0.1, 0.15, 0.2], text: v => `Vijanden die hij raakt, worden 4 seconden gemarkeerd: +${Math.round(v * 100)}% schade van alle helden.` },
  'Baasdoder': { name: 'Titanenjager', v: [0.008, 0.012, 0.016], text: v => `Elke 6e treffer op een baas haalt ${(v * 100).toFixed(1).replace('.', ',')}% van zijn max-HP extra weg.` },
  'Starter': { name: 'Groeikracht', v: [0.008, 0.012, 0.016], text: v => `Wordt elke golf sterker: +${(v * 100).toFixed(1).replace('.', ',')}% schade per golf (tot golf 30).` },
  'Allround': { name: 'Veelzijdig', v: [0.08, 0.12, 0.16], text: v => `+${Math.round(v * 100)}% schade en aanvalssnelheid.` },
  'Tijdmanipulatie': { name: 'Tijdrek', v: [0.1, 0.15, 0.2], text: v => `Elke treffer vertraagt de vijand 1 seconde met ${Math.round(v * 100)}%.` },
  'Uitwisser': { name: 'Leegte', v: [0.2, 0.35, 0.5], text: v => `+${Math.round(v * 100)}% schade tegen schilden.` },
};
const perkLvl = h => (h.tier >= 5 ? 3 : h.tier >= 3 ? 2 : 1);
const perkOf = h => (h.def && !h.def.hidden ? ROLE_PERK[h.def.role] : null);
function perkText(role, lvl) { const P = ROLE_PERK[role]; if (!P) return ''; return P.text(P.v[lvl - 1], P.v2 ? P.v2[lvl - 1] : 0, lvl); }

/* ---------- 2. Helden: sterkere upgrades ---------- */
const UPG_TIER_BONUS = 0.06; // elke upgrade geeft daarnaast +5% schade
for (const H of HEROES) {
  if (H.hidden || H._upg5) continue; H._upg5 = true;
  for (const u of H.upgrades) {
    const m = u.mods;
    if (typeof m.dmg === 'number' && m.dmg > 0) { const nv = Math.max(m.dmg + 1, Math.round(m.dmg * 1.25)); u.desc = u.desc.replace(`+${m.dmg} schade`, `+${nv} schade`); m.dmg = nv; }
    if (typeof m.rate === 'number' && m.rate > 0) { const nv = Math.round(m.rate * 1.2 * 100) / 100; u.desc = u.desc.replace(`+${m.rate} snelheid`, `+${String(nv).replace('.', ',')} snelheid`).replace(`+${String(m.rate).replace('.', ',')} snelheid`, `+${String(nv).replace('.', ',')} snelheid`); m.rate = nv; }
    if (typeof m.burn === 'number' && m.burn > 0) m.burn = Math.round(m.burn * 1.2);
  }
}

const _heroStats5 = Game.prototype.heroStats;
Game.prototype.heroStats = function (h) {
  const st = _heroStats5.call(this, h);
  if (h.temp || !h.def || h.def.hidden) return st;
  st.dmg *= 1 + UPG_TIER_BONUS * h.tier; st.burn *= 1 + UPG_TIER_BONUS * h.tier;
  const P = perkOf(h); if (!P) return st;
  const l = perkLvl(h), v = P.v[l - 1];
  switch (h.def.role) {
    case 'Snelle aanvallen': st.rate *= 1 + (h.mom || 0) * v; break;
    case 'Hoge damage': st.shred += P.v2[l - 1]; break;
    case 'Area damage': if (st.splash > 0) st.splash *= 1 + v; st.burn *= 1 + v; if (l >= 3 && st.chains > 0) st.chains += 1; break;
    case 'Groot bereik': if (st.range < 90) st.range *= 1.1; break;
    case 'Starter': st.dmg *= 1 + Math.min(30, this.wave) * v; break;
    case 'Allround': st.dmg *= 1 + v; st.rate *= 1 + v; break;
  }
  return st;
};

/* ---------- 3. Abilities: elementen ---------- */
const ELEM_INFO = {
  burn: { name: 'Brand', color: '#fb923c', desc: 'Getroffen vijanden branden 4 seconden.' },
  freeze: { name: 'Bevriezing', color: '#7dd3fc', desc: 'Getroffen vijanden bevriezen even (bazen korter).' },
  shock: { name: 'Schok', color: '#facc15', desc: 'Getroffen vijanden krijgen 4 seconden extra schade van alle helden.' },
  knock: { name: 'Terugslag', color: '#e2e8f0', desc: 'Duwt getroffen vijanden terug over het pad.' },
  weaken: { name: 'Verzwakking', color: '#c084fc', desc: 'Breekt het pantser van getroffen vijanden.' },
  slow: { name: 'Vertraging', color: '#60a5fa', desc: 'Vertraagt getroffen vijanden 3 seconden sterk.' },
  stun: { name: 'Verdoving', color: '#fde047', desc: 'Verdooft getroffen vijanden kort.' },
  empower: { name: 'Versterking', color: '#fbbf24', desc: 'Helden in de buurt doen een tijdje meer schade.' },
};
const ABILITY_ELEM = {
  shockwave: 'knock', volley: 'weaken', barrage: 'weaken', overcharge: 'shock', blizzard: 'freeze', carpet: 'burn', titanslam: 'stun', shadowclone: 'weaken', solarflare: 'burn',
  thunderstorm: 'shock', phoenixdive: 'burn', singularity: 'slow', orbitalcannon: 'burn', timerewind: 'slow', supernova: 'burn', twinstorm: 'shock', bulwark: 'knock', wishingstar: 'empower',
  eventhorizon: 'weaken', goldrush: 'weaken', rally: 'empower', headshot: 'stun', cyclone: 'knock', speedforce: 'shock', warcry: 'empower', dragonbreath: 'burn', missilestorm: 'burn',
  divinelight: 'empower', midastouch: 'weaken', spectrum: 'shock', mirrorarmy: 'weaken', judgement: 'stun', bigbang: 'burn', hexcurse: 'weaken', giftdrop: 'freeze', tsunami: 'knock',
  party: 'stun', cometfall: 'burn', titanfall: 'stun', valkyrieride: 'shock', championroar: 'empower', megabounce: 'knock', lassopull: 'slow', swarm: 'weaken', magnetpull: 'weaken',
  gadgets: 'shock', overload: 'burn', crystalprison: 'freeze', deployturret: 'empower', meteorshower: 'burn', sandstorm: 'slow', hive: 'weaken', bigcrunch: 'stun', timeloop: 'slow',
  erase: 'weaken', lijmstorm: 'slow',
};
const elemPower = h => (0.6 + 0.2 * h.tier) * (h.tier >= 5 ? 1.25 : 1);
function applyElem(g, h, e, el) {
  if (e.dead) return;
  const p = elemPower(h), boss = e.boss, cc = e.ccImm || e.E.worldBoss, I = ELEM_INFO[el];
  switch (el) {
    case 'burn': e.burnD = Math.max(e.burnD, h.st.dmg * 0.22 * p + 6); e.burnT = Math.max(e.burnT, 4); g.fx.burst(e.x, e.ay, '#fb923c', 6, 90, 3, 0.5, 'glow'); break;
    case 'freeze': if (cc) break; { const d = (boss ? 0.35 : 1.1) * p; e.stunT = Math.max(e.stunT, d); e.frozenT = Math.max(e.frozenT || 0, d); g.fx.burst(e.x, e.ay, '#e0f2fe', 6, 90, 3, 0.5, 'snow'); } break;
    case 'shock': { const m = 0.1 + 0.03 * h.tier; if (e.vulnT <= 0) e.vulnM = m; else e.vulnM = Math.max(e.vulnM, m); e.vulnT = Math.max(e.vulnT, 4); e.shockT = 4; g.fx.burst(e.x, e.ay, '#facc15', 4, 110, 2, 0.3, 'spark'); } break;
    case 'knock': if (cc) break; e.d = Math.max(-20, e.d - (boss ? 0.15 : 0.7) * p * TILE); g.fx.ring(e.x, e.ay, e.r + 6, '#e2e8f0', 0.3, 2); break;
    case 'weaken': e.shred = Math.max(e.shred, e.armor * Math.min(1, 0.45 + 0.1 * h.tier)); e.weakT = 5; g.fx.burst(e.x, e.ay, '#c084fc', 4, 80, 2, 0.4, 'dot'); break;
    case 'slow': if (cc) break; { const s = Math.min(0.7, (0.3 + 0.05 * h.tier) * (boss ? 0.5 : 1)); if (e.slowT <= 0 || s >= e.slowM) e.slowM = s; e.slowT = Math.max(e.slowT, 3); } break;
    case 'stun': if (cc) break; e.stunT = Math.max(e.stunT, (boss ? 0.3 : 0.9) * p); break;
  }
}
function applyEmpower(g, h) {
  const R = 2.6 * TILE, m = 1 + 0.12 + 0.03 * h.tier, t = 5 + h.tier;
  for (const o of g.heroes) { if ((o.x - h.x) ** 2 + (o.y - h.y) ** 2 > R * R) continue; o.buffs.push({ dmgMul: m, t }); g.fx.ring(o.x, o.y, 22, '#fbbf24', 0.5, 3); g.fx.burst(o.x, o.y - 10, '#fde68a', 6, 80, 2, 0.5, 'star'); }
  g.fx.ring(h.x, h.y, R, '#fbbf24', 0.6, 4);
}
function castFx(g, h, el) {
  const col = ELEM_INFO[el].color, ult = h.tier >= 5;
  g.addExt({ dur: 0.9, under: true, draw(gg, ctx) {
    const k = this.t / 0.9, R = 26 + k * 30, a = 1 - k;
    ctx.translate(h.x, h.y + 6); ctx.rotate(this.t * 3);
    ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 2.5; circle(ctx, 0, 0, R); ctx.stroke();
    ctx.lineWidth = 1.5; circle(ctx, 0, 0, R * 0.7); ctx.stroke();
    for (let i = 0; i < (ult ? 8 : 6); i++) { const an = i * TAU / (ult ? 8 : 6); ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.7, Math.sin(an) * R * 0.7); ctx.lineTo(Math.cos(an + 0.5) * R, Math.sin(an + 0.5) * R); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(col, 0.25 * a); circle(ctx, 0, 0, R); ctx.fill();
  } });
  for (let i = 0; i < (ult ? 24 : 14); i++) { const an = rnd(0, TAU); g.fx.add({ type: 'glow', x: h.x, y: h.y - 8, vx: Math.cos(an) * rnd(60, 160), vy: Math.sin(an) * rnd(60, 160) - 30, size: 3, color: col, life: 0.6 }); }
  g.floatText(h.x, h.y + 26, `+${ELEM_INFO[el].name.toUpperCase()}`, col, 13, 1);
}
let CAST_SEQ = 0;
const _useAbility5 = Game.prototype.useAbility;
Game.prototype.useAbility = function (h) {
  if (h && h.jamT > 0 && h.abilCd <= 0 && !this.over) { this.floatText(h.x, h.y - 40, 'GESTOORD!', '#f43f5e', 15, 0.8); Sfx.play('error'); return false; }
  const ok = _useAbility5.call(this, h);
  if (!ok) return ok;
  const el = ABILITY_ELEM[h.def.ability]; if (!el) return ok;
  castFx(this, h, el);
  if (el === 'empower') applyEmpower(this, h);
  else { h.castId = ++CAST_SEQ; h.castUntil = this.time + 2.5; h.castEl = el; h.castN = 0; }
  return ok;
};
// Nieuwe cooldowns: elke upgrade 3% korter, ultimate nog eens 15%
Game.prototype.abilCdMax = function (h) {
  const A = ABILITIES[h.def.ability];
  return A.cd * (1 - 0.03 * h.tier) * (h.tier >= 5 ? 0.85 : 1) * (1 - Math.min(0.5, (h.st && h.st.cdPct || 0) + (this.R ? this.R.cdPct : 0)));
};

/* ---------- schade: kenmerken, markeringen, ontwijken, elementen ---------- */
const _damage5 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h, o = {}) {
  if (e.dead || amt <= 0) return 0;
  const E = e.E;
  if (E.dodge && h && !o.acc && !o.pure && e.stunT <= 0 && Math.random() < E.dodge) { this.floatText(e.x, e.ay - e.r - 8, 'MIS', '#e2e8f0', 12, 0.5); return 0; }
  let a = amt;
  if (!o.pure) {
    if (e.markT > 0) a *= 1 + e.markM;
    if (e.weakT > 0) a *= 1.08;
    if (e.gepantserd) a *= 0.85;
  }
  const P = h && !h.temp ? perkOf(h) : null, l = P ? perkLvl(h) : 0;
  if (P && !o.pure) {
    switch (h.def.role) {
      case 'Hoge damage': if (e.boss || e.elite) a *= 1 + P.v[l - 1]; break;
      case 'Groot bereik': if (h.st.range < 90) a *= 1 + clamp(Math.hypot(e.x - h.x, e.y - h.y) / (h.st.range * TILE), 0, 1) * P.v[l - 1]; break;
      case 'Uitwisser': if (e.shield > 0) a *= 1 + P.v[l - 1]; break;
      case 'Baasdoder': if (e.boss && !E.worldBoss && !o.acc) { h.bossHits = (h.bossHits || 0) + 1; if (h.bossHits % 6 === 0) { a += e.maxHp * P.v[l - 1] * (E.raidBoss ? 0.3 : 1); this.fx.ring(e.x, e.ay, e.r + 10, '#f97316', 0.3, 3); } } break;
    }
  }
  const dealt = _damage5.call(this, e, a, h, o);
  if (dealt > 0 && h && !e.dead) {
    if (P) {
      switch (h.def.role) {
        case 'Controle': { const m = P.v[l - 1]; if (e.vulnT <= 0) e.vulnM = m; else e.vulnM = Math.max(e.vulnM, m); e.vulnT = Math.max(e.vulnT, 1.5); break; }
        case 'Detectie': e.markT = 4; e.markM = Math.max(e.markT > 0 ? (e.markM || 0) : 0, P.v[l - 1]); break;
        case 'Tijdmanipulatie': if (!e.ccImm) { const s = P.v[l - 1] * (e.boss ? 0.5 : 1); if (e.slowT <= 0 || s >= e.slowM) e.slowM = s; e.slowT = Math.max(e.slowT, 1); } break;
      }
    }
    if (h.castUntil > this.time && e.elCast !== h.castId && h.castN < 45) { e.elCast = h.castId; h.castN++; applyElem(this, h, e, h.castEl); }
    if (o.crit && !o.acc) { this.fx.ring(e.x, e.ay, e.r + 8, '#ffd23f', 0.25, 2.5); if (Math.random() < 0.5) this.fx.burst(e.x, e.ay, '#fff7c2', 5, 150, 2, 0.3, 'star'); }
  }
  return dealt;
};

/* ---------- 4. Vijanden: nieuwe speciale vijanden ---------- */
Object.assign(ENEMIES, {
  stoorzender: { name: 'Stoorzender', hp: 150, speed: 0.85, armor: 1, reward: 12, r: 12, leak: 2, color: '#f43f5e', shape: 'jammer', jam: 1.6, desc: 'Stoorveld: helden in de buurt kunnen hun ability niet gebruiken en hun cooldown loopt niet door.' },
  vriesgeest: { name: 'Vriesgeest', hp: 120, speed: 1.05, armor: 0, reward: 11, r: 11, leak: 2, color: '#7dd3fc', shape: 'wraith', chillAura: 1.8, desc: 'IJzige aura: helden in de buurt vallen 40% langzamer aan.' },
  spiegelridder: { name: 'Spiegelridder', hp: 260, speed: 0.8, armor: 3, reward: 16, r: 13, leak: 3, color: '#cbd5e1', shape: 'knight', immuneCycle: [4.5, 1.4], desc: 'Tilt om de paar seconden zijn spiegelschild op en is dan kort immuun voor alle schade.' },
  juggernaut: { name: 'Juggernaut', hp: 520, speed: 0.62, armor: 6, reward: 24, r: 16, leak: 4, color: '#b45309', shape: 'juggernaut', ccImmune: true, desc: 'Onstuitbaar: immuun voor vertraging, stun, bevriezing en terugduwen. Alleen schade helpt.' },
  berserker: { name: 'Berserker', hp: 200, speed: 0.95, armor: 1, reward: 13, r: 12, leak: 2, color: '#dc2626', shape: 'berserker', berserk: 0.5, desc: 'Onder de helft van zijn HP raakt hij in razernij: veel sneller en hij neemt 20% minder schade.' },
});
Object.assign(ENEMY_FROM_WAVE, { berserker: 6, vriesgeest: 8, spiegelridder: 10, stoorzender: 12, juggernaut: 13 });
// Bestaande vijanden krijgen een duidelijkere rol
Object.assign(ENEMIES.runner, { dodge: 0.08, desc: 'Snel maar zwak. Ontwijkt 8% van de losse aanvallen.' });
Object.assign(ENEMIES.tank, { heavy: 0.35, desc: 'Zwaar gepantserd: kleine treffers doen weinig en hij is nauwelijks terug te duwen.' });
Object.assign(ENEMIES.trol, { heavy: 0.4 });
Object.assign(ENEMIES.skelet, { revive: 0.35, desc: 'Zwak, maar zet zichzelf soms weer in elkaar na het sneuvelen.' });
Object.assign(ENEMIES.ijswolf, { pack: true, desc: 'Razendsnel. Samen met andere wolven rent hij nog 25% harder (roedel).' });
Object.assign(ENEMIES.stormvogel, { dive: true, desc: 'Snelle vliegende vijand die af en toe een duikvlucht maakt.' });
if (ENEMIES.flyer) ENEMIES.flyer.desc = 'Vliegt: alleen helden met luchtaanval raken hem.';
// In de map-pools zetten
const POOL_ADD = { bos: ['berserker'], woestijn: ['berserker', 'spiegelridder'], bergen: ['vriesgeest', 'juggernaut'], neo: ['stoorzender', 'spiegelridder', 'berserker'], vulkaan: ['juggernaut', 'berserker', 'stoorzender'],
  neonstad: ['stoorzender'], gletsjer: ['vriesgeest', 'vriesgeest'], inferno: ['berserker', 'juggernaut'], xenoplaneet: ['berserker'], tempel: ['spiegelridder'], station: ['stoorzender', 'juggernaut'], crypte: ['spiegelridder', 'berserker'], kerker: ['berserker'], lab: ['juggernaut'] };
for (const m of MAPS.concat(SPECIAL_MAPS)) { const add = POOL_ADD[m.id]; if (add && m.pool && !m._pool5) { m._pool5 = true; m.pool.push(...add); } }

/* ---------- elite-eigenschappen ---------- */
const AFFIXES = [
  { id: 'snel', name: 'Snel', color: '#4ade80' }, { id: 'gepantserd', name: 'Gepantserd', color: '#94a3b8' }, { id: 'regen', name: 'Herstellend', color: '#34d399' },
  { id: 'onstuitbaar', name: 'Onstuitbaar', color: '#f59e0b' }, { id: 'schild', name: 'Schildvormer', color: '#38bdf8' }, { id: 'splijt', name: 'Splijtend', color: '#e879f9' },
];
const _rollElite5 = Game.prototype.rollElite;
Game.prototype.rollElite = function (e, q) {
  _rollElite5.call(this, e, q);
  if (!e || !e.elite || e.affix) return;
  const A = AFFIXES[Math.floor(Math.random() * AFFIXES.length)]; e.affix = A;
  switch (A.id) {
    case 'snel': e.speed *= 1.3; break;
    case 'gepantserd': e.armor += 4; e.gepantserd = true; break;
    case 'onstuitbaar': e.ccImm = true; break;
    case 'schild': { const s = e.maxHp * 0.5; e.shield += s; e.maxShield += s; break; }
  }
};

/* ---------- vijand-gedrag ---------- */
function bossEscortType(g) {
  const pool = (g.map.pool || []).filter(t => ENEMIES[t] && !ENEMIES[t].boss && !ENEMIES[t].hidden && t !== 'mini' && t !== 'xenomini');
  const sup = pool.filter(t => ['healer', 'priester', 'schildgen', 'shield', 'stoorzender', 'vriesgeest', 'spiegelridder'].includes(t));
  const list = sup.length && Math.random() < 0.6 ? sup : pool.length ? pool : ['grunt'];
  return list[Math.floor(Math.random() * list.length)];
}
const BOSS_PHASE_TXT = { 2: 'Krijgt een schild en duwt je helden omver!', 3: 'Laatste fase: sneller, roept versterking en valt je helden aan!' };
function bossPhaseTick(g, e, dt) {
  const E = e.E;
  if (E.worldBoss) return;
  const f = e.hp / e.maxHp; e.bph = e.bph || 1;
  const own = E.ability === 'phases';
  if (!own && ((e.bph === 1 && f < 0.66) || (e.bph === 2 && f < 0.33))) {
    e.bph++; const p3 = e.bph === 3, raid = E.raidBoss;
    e.speed *= p3 ? 1.08 : 1.04; e.abRate = p3 ? 1.25 : 1; e.fury = p3;
    const s = e.maxHp * (raid ? 0.02 : p3 ? 0.06 : 0.03); e.shield += s; e.maxShield = Math.max(e.maxShield, e.shield);
    e.invulnT = Math.max(e.invulnT, 0.9);
    const n = p3 ? (raid ? 1 : 2) : 0; for (let i = 0; i < n; i++) g.spawnEnemy(bossEscortType(g), Math.max(0, e.d - 16 - i * 16), e.wave);
    const R = 2.4 * TILE; for (const h of heroesNear(g, e.x, e.y, R)) disableHero(g, h, p3 ? 0.8 : 0.5, 'schokgolf');
    g.fx.ring(e.x, e.y, R, E.color, 0.8, 7); g.fx.ring(e.x, e.y, R * 0.6, '#ffffff', 0.5, 4); g.fx.burst(e.x, e.ay, E.color, 40, 260, 4, 0.8, 'glow');
    g.banner(`${E.name} · fase ${e.bph}`, BOSS_PHASE_TXT[e.bph], p3 ? '#ef4444' : '#f59e0b'); g.shake(p3 ? 12 : 8); Sfx.play('boss');
    g.flash = { color: p3 ? '#fecaca' : '#fde68a', life: 0.25, max: 0.25 };
  }
  const ph = own ? (e.phase || 0) + 1 : e.bph;
  if (ph >= 3) { e.bsT = (e.bsT == null ? 4 : e.bsT) - dt; if (e.bsT <= 0) { e.bsT = 12; bossSlam(g, e); } }
}
function bossSlam(g, e) {
  const hs = heroesNear(g, e.x, e.y, 5.5 * TILE); if (!hs.length) return;
  const h = hs[Math.floor(Math.random() * hs.length)], x = h.x, y = h.y, R = 1.15 * TILE, col = e.E.color;
  g.addExt({ dur: 1.3, under: true, draw(gg, ctx) { const k = this.t / 1.3; ctx.fillStyle = rgba('#ef4444', 0.12 + 0.25 * k); circle(ctx, x, y, R * k); ctx.fill(); ctx.strokeStyle = rgba('#ef4444', 0.9); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -this.t * 40; circle(ctx, x, y, R); ctx.stroke(); ctx.setLineDash([]); },
    end(gg) { if (e.dead || gg.over) return; for (const o of heroesNear(gg, x, y, R)) disableHero(gg, o, 1.3, 'baas'); gg.fx.ring(x, y, R, col, 0.5, 6); gg.fx.burst(x, y, col, 26, 220, 4, 0.6, 'glow'); gg.fx.burst(x, y, '#78716c', 12, 120, 5, 0.7, 'smoke'); gg.shake(6); Sfx.play('boom'); } });
  lineFx(g, () => (e.dead ? null : { x: e.x, y: e.ay }), () => ({ x, y }), '#ef4444', 1.3, 'telegraph');
  g.floatText(e.x, e.y - 50, 'BAASAANVAL!', '#ef4444', 15, 0.9);
}
const _bossAI5 = Game.prototype.bossAI;
Game.prototype.bossAI = function (e, dt) { return _bossAI5.call(this, e, dt * (e.abRate || 1)); };

const _updEnemy5 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e, dt) {
  const E = e.E;
  if (E.ccImmune) e.ccImm = true;
  if (e.ccImm) {
    let blocked = false;
    if (e.maxD != null && e.d < e.maxD - 0.5) { e.d = e.maxD; blocked = true; }
    if (e.stunT > 0 || e.slowT > 0 || e.glueT > 0) { blocked = true; e.stunT = 0; e.slowT = 0; e.frozenT = 0; e.glueT = 0; }
    e.ccTxt = (e.ccTxt || 0) - dt; if (blocked && e.ccTxt <= 0) { e.ccTxt = 1.5; this.floatText(e.x, e.ay - e.r - 10, 'ONSTUITBAAR', '#f59e0b', 12, 0.6); }
  } else if (E.heavy && e.lastD != null && e.d < e.lastD - 0.5) e.d = e.lastD - (e.lastD - e.d) * E.heavy;
  if (e.frozenT > 0) e.frozenT -= dt;
  if (e.markT > 0) e.markT -= dt;
  if (e.weakT > 0) e.weakT -= dt;
  if (e.shockT > 0) e.shockT -= dt;
  if (E.berserk && !e.rage && e.hp < e.maxHp * E.berserk) { e.rage = true; e.speed *= 1.7; e.dmgRed = Math.max(e.dmgRed, 0.2); this.floatText(e.x, e.ay - e.r - 12, 'RAZERNIJ!', '#ef4444', 14, 0.9); this.fx.burst(e.x, e.ay, '#ef4444', 14, 150, 3, 0.5, 'glow'); }
  if (E.immuneCycle) { if (e.icT == null) e.icT = rnd(1, E.immuneCycle[0]); e.icT -= dt; if (e.icT <= 0) { e.icT = E.immuneCycle[0] + E.immuneCycle[1]; e.invulnT = Math.max(e.invulnT, E.immuneCycle[1]); e.mirrorUp = E.immuneCycle[1]; this.fx.ring(e.x, e.ay, e.r + 8, '#e2e8f0', 0.4, 3); } }
  if (e.mirrorUp > 0) e.mirrorUp -= dt;
  if (e.affix && e.affix.id === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
  if (E.pack) { e.base5 = e.base5 || e.speed; e.packT = (e.packT || 0) - dt; if (e.packT <= 0) { e.packT = 0.5; let n = 0; for (const o of this.enemies) if (o !== e && !o.dead && o.type === e.type && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < (1.6 * TILE) ** 2) n++; e.inPack = n >= 1; e.speed = e.base5 * (e.inPack ? 1.25 : 1); } }
  if (E.dive && tickAb(e, 'dv', 5, rnd(2, 5), dt)) { e.dashT = 0.45; this.fx.burst(e.x, e.ay, E.color, 8, 120, 2, 0.4, 'spark'); }
  if (e.boss) bossPhaseTick(this, e, dt);
  _updEnemy5.call(this, e, dt);
  if (e.ccImm) e.maxD = Math.max(e.maxD == null ? e.d : e.maxD, e.d);
  e.lastD = e.d;
};
const _onDeath5 = Game.prototype.onEnemyDeath;
Game.prototype.onEnemyDeath = function (e, h) {
  _onDeath5.call(this, e, h);
  if (e.affix && e.affix.id === 'splijt' && !e.leaked) for (const off of [-8, 8]) this.spawnEnemy('mini', e.d + off, e.wave);
  if (e.E.revive && !e.revived && !e.leaked && Math.random() < e.E.revive) {
    const d = e.d, w = e.wave, x = e.x, y = e.ay;
    this.fx.burst(x, y, '#e7e5e4', 10, 90, 3, 0.8, 'dot');
    this.after(1.2, () => { if (this.over) return; const n = this.spawnEnemy(e.type, d, w); n.revived = true; n.hp = n.maxHp * 0.5; this.fx.burst(n.x, n.ay, '#e7e5e4', 12, 110, 3, 0.5, 'dot'); this.floatText(n.x, n.ay - 20, 'HERRIJST!', '#e7e5e4', 12, 0.7); });
  }
};

/* ---------- helden: momentum, storing, inspiratie ---------- */
const _updHero5 = Game.prototype.updateHero;
Game.prototype.updateHero = function (h, dt) {
  const cd0 = h.cd, ab0 = h.abilCd;
  _updHero5.call(this, h, dt);
  if (h.jamT > 0) { h.jamT -= dt; if (ab0 > 0) h.abilCd = ab0; }
  if (h.def && h.def.role === 'Snelle aanvallen' && !h.temp) {
    if (h.cd > cd0 + 1e-6 || (h.beamTargets && h.beamTargets.length)) h.lastAtk = this.time;
    const was = h.mom || 0;
    h.mom = this.time - (h.lastAtk == null ? -9 : h.lastAtk) < 0.9 ? Math.min(1, was + dt / 2.5) : Math.max(0, was - dt * 1.5);
    if (h.mom >= 1 && was < 1) this.floatText(h.x, h.y - 36, 'MOMENTUM!', '#fb923c', 13, 0.7);
  }
};
const _updExt5 = Game.prototype.updateExt;
Game.prototype.updateExt = function (dt) {
  _updExt5.call(this, dt);
  // storing en kou van vijanden
  for (const e of this.enemies) {
    if (e.dead) continue;
    if (e.E.jam) { const R = e.E.jam * TILE; for (const h of this.heroes) if (!h.temp && (h.x - e.x) ** 2 + (h.y - e.y) ** 2 <= R * R) h.jamT = 0.25; }
    if (e.E.chillAura) { const R = e.E.chillAura * TILE; for (const h of this.heroes) if (!h.temp && (h.x - e.x) ** 2 + (h.y - e.y) ** 2 <= R * R) h.chillT = Math.max(h.chillT || 0, 0.3); }
  }
  // inspiratie van support-helden
  for (const sp of this.heroes) {
    if (sp.temp || !sp.def || sp.def.role !== 'Support' || sp.stunT > 0) continue;
    const k = ROLE_PERK.Support.v[perkLvl(sp) - 1], R = (sp.st.buffRange || 2) * TILE, gl = sp.st.buffRange >= 90;
    for (const o of this.heroes) if (o !== sp && o.abilCd > 0 && !(o.jamT > 0) && (gl || (o.x - sp.x) ** 2 + (o.y - sp.y) ** 2 <= R * R)) o.abilCd = Math.max(0, o.abilCd - dt * k);
  }
};
// Rente voor geld-helden
const _payBonus5 = Game.prototype.payWaveBonus;
Game.prototype.payWaveBonus = function () {
  _payBonus5.call(this);
  let tot = 0; for (const h of this.heroes) { if (h.temp || !h.def || h.def.role !== 'Geld') continue; const l = perkLvl(h); tot += ROLE_PERK.Geld.v[l - 1] + Math.min(this.wave, 40) * l; }
  if (tot > 0) { tot = Math.round(tot * this.M.cash); this.cash += tot; this.floatText(GW / 2, GH - 96, `Rente +$${tot}`, '#facc15', 16, 1.3); }
};

/* ---------- golven: vijanden werken samen ---------- */
const SUPPORT_TYPES = ['healer', 'priester', 'schildgen', 'shield', 'stoorzender', 'vriesgeest'];
const HEAVY_TYPES = ['tank', 'trol', 'juggernaut', 'mutant', 'spiegelridder', 'berserker'];
const _genNormal5 = Game.prototype.genNormal;
Game.prototype.genNormal = function (n) {
  const out = _genNormal5.call(this, n);
  if (n < 10) return out;
  const sup = (this.map.pool || []).filter(t => SUPPORT_TYPES.includes(t) && n >= (ENEMY_FROM_WAVE[t] || 1));
  if (sup.length) {
    const rng = mulberry32(n * 131 + (this.mapIdx + 1) * 17 + 3), cap = Math.floor(n / 10); let added = 0;
    for (let i = out.length - 1; i >= 0 && added < cap; i--) if (HEAVY_TYPES.includes(out[i].type) && rng() < 0.3) { out.splice(i + 1, 0, { type: sup[Math.floor(rng() * sup.length)], gap: 0.35 }); added++; }
  }
  if (n >= 15) for (const q of out) if (q.type === 'runner' || q.type === 'ijswolf') q.gap *= 0.5;
  return out;
};

/* ---------- tekenen ---------- */
const _drawShape5 = drawShape;
drawShape = function (ctx, e, t) {
  const E = e.E, r = e.r, c = E.color;
  ctx.strokeStyle = EDGE; ctx.lineWidth = 2;
  switch (E.shape) {
    case 'jammer': {
      ctx.fillStyle = '#334155'; rr(ctx, -r * 0.8, -r * 0.5, r * 1.6, r * 1.3, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; rr(ctx, -r * 0.55, -r * 0.25, r * 1.1, r * 0.55, 2); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * ((Math.sin(t * 8 + i) + 1) / 2); ctx.fillRect(-r * 0.45 + i * r * 0.35, -r * 0.1, r * 0.2, r * 0.2); } ctx.globalAlpha = 1;
      ctx.strokeStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, -r * 1.3); ctx.stroke();
      ctx.fillStyle = c; circle(ctx, 0, -r * 1.35, 3); ctx.fill();
      ctx.strokeStyle = rgba(c, 0.7); ctx.lineWidth = 1.5; for (let i = 1; i <= 2; i++) { const k = ((t * 1.5 + i * 0.5) % 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(0, -r * 1.35, 4 + k * 12, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke(); } ctx.globalAlpha = 1;
      break; }
    case 'wraith': {
      ctx.globalAlpha *= 0.9; const g2 = ctx.createLinearGradient(0, -r, 0, r); g2.addColorStop(0, '#e0f2fe'); g2.addColorStop(1, 'rgba(125,211,252,0.2)'); ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.85, Math.PI, 0); for (let i = 0; i <= 5; i++) { const x = r * 0.85 - i * r * 0.34; ctx.lineTo(x, r * 0.9 + Math.sin(t * 6 + i) * 3); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#38bdf8'; ctx.stroke();
      ctx.fillStyle = '#0c4a6e'; circle(ctx, -r * 0.25, -r * 0.3, 2.2); circle(ctx, r * 0.25, -r * 0.3, 2.2); ctx.fill();
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * TAU / 3; ctx.fillStyle = '#f0f9ff'; circle(ctx, Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.5, 1.5); ctx.fill(); }
      ctx.globalAlpha = 1; break; }
    case 'knight': {
      ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.75, r * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.5, Math.PI, 0); ctx.lineTo(r * 0.5, -r * 0.2); ctx.lineTo(-r * 0.5, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(-r * 0.35, -r * 0.45, r * 0.7, r * 0.1);
      const up = e.mirrorUp > 0; ctx.save(); ctx.translate(up ? r * 0.2 : r * 0.7, up ? -r * 0.1 : r * 0.2); if (up) ctx.scale(1.35, 1.35);
      const g3 = ctx.createLinearGradient(-6, -8, 6, 8); g3.addColorStop(0, '#f8fafc'); g3.addColorStop(0.5, '#94a3b8'); g3.addColorStop(1, '#f1f5f9'); ctx.fillStyle = g3;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.45, -r * 0.3); ctx.lineTo(r * 0.35, r * 0.4); ctx.lineTo(0, r * 0.65); ctx.lineTo(-r * 0.35, r * 0.4); ctx.lineTo(-r * 0.45, -r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (up) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); }
      ctx.restore(); break; }
    case 'juggernaut': {
      ctx.fillStyle = shade(c, -0.25); rr(ctx, -r, -r * 0.55, r * 2, r * 1.4, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; rr(ctx, -r * 0.75, -r * 1.0, r * 1.5, r * 0.75, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fde68a'; ctx.fillRect(-r * 0.45, -r * 0.75, r * 0.9, r * 0.14);
      ctx.fillStyle = '#44403c'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.9, -r * 0.6); ctx.lineTo(s * r * 1.35, -r * 1.05); ctx.lineTo(s * r * 1.05, -r * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#78716c'; for (let i = -1; i <= 1; i++) { circle(ctx, i * r * 0.6, r * 0.35, 2.4); ctx.fill(); }
      break; }
    case 'berserker': {
      const rage = e.rage; ctx.fillStyle = rage ? '#ef4444' : c; ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.85, r * 0.9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.ellipse(r * 0.15, -r * 0.4, r * 0.45, r * 0.38, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-r * 0.2, -r * 0.55, r * 0.75, r * 0.1);
      ctx.fillStyle = rage ? '#fef08a' : '#1f2937'; circle(ctx, 0, -r * 0.42, 1.8); circle(ctx, r * 0.35, -r * 0.42, 1.8); ctx.fill();
      ctx.save(); ctx.rotate(Math.sin(t * (rage ? 14 : 6)) * 0.5); ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 1.4, -r * 0.8); ctx.lineTo(r * 1.5, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      if (rage) { ctx.strokeStyle = rgba('#ef4444', 0.6 + Math.sin(t * 16) * 0.3); ctx.lineWidth = 2; circle(ctx, 0, 0, r * 1.25); ctx.stroke(); }
      break; }
    default: return _drawShape5(ctx, e, t);
  }
};
const _drawEnemy5 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  const E = e.E, oy = e.flying ? -16 : 0;
  if (E.jam) { const R = E.jam * TILE; ctx.save(); ctx.strokeStyle = rgba('#f43f5e', 0.35 + Math.sin(t * 5) * 0.12); ctx.lineWidth = 1.5; ctx.setLineDash([2, 6]); ctx.lineDashOffset = t * 20; circle(ctx, e.x, e.y, R); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(244,63,94,.05)'; circle(ctx, e.x, e.y, R); ctx.fill(); ctx.restore(); }
  if (E.chillAura) { const R = E.chillAura * TILE; ctx.save(); ctx.fillStyle = 'rgba(125,211,252,.07)'; circle(ctx, e.x, e.y, R); ctx.fill(); ctx.strokeStyle = 'rgba(186,230,253,.35)'; ctx.lineWidth = 1.2; circle(ctx, e.x, e.y, R * (0.85 + Math.sin(t * 2) * 0.1)); ctx.stroke(); ctx.restore(); }
  if (e.affix) { ctx.save(); ctx.strokeStyle = rgba(e.affix.color, 0.75); ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20; circle(ctx, e.x, e.y + oy, e.r + 9); ctx.stroke(); ctx.restore(); }
  _drawEnemy5.call(this, ctx, e, t);
  ctx.save(); ctx.translate(e.x, e.y + oy);
  if (e.frozenT > 0) { ctx.globalAlpha = 0.55; ctx.fillStyle = '#bae6fd'; ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 1.5; const r = e.r + 4; ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(-r * 0.4, -r * 1.1); ctx.lineTo(r * 0.5, -r); ctx.lineTo(r, -r * 0.1); ctx.lineTo(r * 0.6, r); ctx.lineTo(-r * 0.7, r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
  if (e.shockT > 0 && Math.random() < 0.35) { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.beginPath(); let x = rnd(-e.r, e.r), y = -e.r; ctx.moveTo(x, y); for (let i = 0; i < 3; i++) { x += rnd(-5, 5); y += e.r * 0.6; ctx.lineTo(x, y); } ctx.stroke(); }
  if (e.markT > 0) { ctx.strokeStyle = rgba('#4ade80', 0.85); ctx.lineWidth = 1.5; const r = e.r + 5; circle(ctx, 0, 0, r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r - 3, 0); ctx.lineTo(-r + 4, 0); ctx.moveTo(r - 4, 0); ctx.lineTo(r + 3, 0); ctx.moveTo(0, -r - 3); ctx.lineTo(0, -r + 4); ctx.moveTo(0, r - 4); ctx.lineTo(0, r + 3); ctx.stroke(); }
  if (e.weakT > 0) { ctx.strokeStyle = rgba('#c084fc', 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-e.r * 0.5, -e.r * 0.6); ctx.lineTo(-e.r * 0.1, -e.r * 0.1); ctx.lineTo(-e.r * 0.3, e.r * 0.2); ctx.lineTo(e.r * 0.2, e.r * 0.6); ctx.stroke(); }
  if (e.affix) { ctx.font = "700 10px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = e.affix.color; ctx.strokeStyle = 'rgba(5,4,13,.85)'; ctx.lineWidth = 3; const y = -e.r - 22; ctx.strokeText(e.affix.name.toUpperCase(), 0, y); ctx.fillText(e.affix.name.toUpperCase(), 0, y); }
  if (e.boss && e.fury) { ctx.strokeStyle = rgba('#ef4444', 0.45 + Math.sin(t * 9) * 0.3); ctx.lineWidth = 3; circle(ctx, 0, 0, e.r * 1.45); ctx.stroke(); }
  ctx.restore();
};
const _drawHeroUnit5 = Game.prototype.drawHeroUnit;
Game.prototype.drawHeroUnit = function (ctx, h, t) {
  if (h.mom > 0.5 && !h.temp) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#fb923c', (h.mom - 0.5) * 1.2); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = t * 8 + i * TAU / 3; ctx.beginPath(); ctx.arc(h.x, h.y + 4, 20, a, a + 1); ctx.stroke(); } ctx.restore(); }
  _drawHeroUnit5.call(this, ctx, h, t);
  if (h.jamT > 0) { ctx.save(); ctx.translate(h.x + 14, h.y - 34); ctx.fillStyle = '#f43f5e'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; circle(ctx, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); ctx.stroke(); ctx.restore(); }
  if (h.chillT > 0 && !h.temp && Math.random() < 0.15) this.fx.add({ type: 'snow', x: h.x + rnd(-12, 12), y: h.y - 20, vy: 20, size: 2, color: '#e0f2fe', life: 0.6 });
};

/* ---------- UI: kenmerk en element tonen ---------- */
function perkBoxHtml(H, tier) {
  const P = ROLE_PERK[H.role], el = ABILITY_ELEM[H.ability], E = el && ELEM_INFO[el];
  if (!P && !E) return '';
  const lv = tier >= 5 ? 3 : tier >= 3 ? 2 : 1;
  return `<div class="perk-box">
    ${P ? `<div><span class="kicker">Kenmerk · ${esc(H.role)}</span><b>${P.name}</b> <span class="muted">— ${esc(perkText(H.role, lv))}</span>
      <div class="perk-steps">${[1, 2, 3].map(l => `<span class="${l <= lv ? 'on' : ''}" title="${esc(perkText(H.role, l))}">${l === 1 ? 'Basis' : l === 2 ? 'Na upgrade 3' : 'Ultimate'}</span>`).join('')}</div></div>` : ''}
    ${E ? `<div><span class="kicker">Ability-effect</span><b style="color:${E.color}">${E.name}</b> <span class="muted">— ${esc(E.desc)} Sterker bij elke upgrade.</span></div>` : ''}
    <div class="muted" style="font-size:12px">Elke upgrade geeft daarnaast +6% schade en 3% kortere ability-cooldown.</div></div>`;
}
const _openHeroModal5 = openHeroModal;
openHeroModal = function (id, tier = 0, tab) {
  _openHeroModal5(id, tier, tab);
  const H = HERO[id], box = document.querySelector('#overlay-root .ability-box');
  if (H && box && !document.querySelector('#overlay-root .perk-box')) box.insertAdjacentHTML('beforebegin', perkBoxHtml(H, App.preview ? App.preview.tier : tier));
};
const _renderSide5 = renderSide;
renderSide = function () {
  _renderSide5.apply(this, arguments);
  const g = App.game, h = g && g.sel; if (!h || h.temp) return;
  const ab = document.getElementById('s-abil'); if (!ab || document.getElementById('s-perk')) return;
  const P = ROLE_PERK[h.def.role], el = ABILITY_ELEM[h.def.ability];
  const html = `<div id="s-perk" class="perk-mini">${P ? `<div><b>${P.name}</b> <span class="muted">${esc(perkText(h.def.role, perkLvl(h)))}</span></div>` : ''}${el ? `<div><b style="color:${ELEM_INFO[el].color}">${ELEM_INFO[el].name}</b> <span class="muted">${esc(ELEM_INFO[el].desc)}</span></div>` : ''}</div>`;
  ab.insertAdjacentHTML('afterend', html);
};
const _hudUpdate5 = hudUpdate;
hudUpdate = function () {
  _hudUpdate5.apply(this, arguments);
  const g = App.game, h = g && g.sel; if (!h || !(h.jamT > 0)) return;
  const ab = document.getElementById('s-abil'); if (!ab) return; ab.disabled = true; const l = ab.querySelector('.lbl'); if (l && l.textContent !== 'GESTOORD door Stoorzender') l.textContent = 'GESTOORD door Stoorzender';
};
