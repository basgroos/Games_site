/* =====================================================================
   Nieuwe helden (v1.23): oproepers, drie-in-één, hypnose, omkeren,
   premiejacht, groeien, wortels, zwaartekracht en drones.
   - Eigen aanvalsstijlen ('summon', 'trio', 'roots', 'pull', 'drones'):
     het gewone updateHero regelt cooldown/doel, deze file doet de aanval.
   - Bondgenoten (soldaten en gehypnotiseerde vijanden) lopen van de basis
     over het pad terug naar het portaal en vechten met wat ze tegenkomen.
   - Co-op: de host stuurt bondgenoten, putten en drones mee in de snapshot.
   ===================================================================== */
Object.assign(STYLE_LABEL, { summon: 'Oproeper', trio: 'Drie-in-één', roots: 'Wortels', pull: 'Zwaartekracht', drones: 'Drones' });
Object.assign(STAT_DEFAULTS, { hypno: 0, revChance: 0, revDur: 0, rootDur: 0, markMult: 0, growRate: 0, drones: 0, allyHp: 0, allyN: 0, pullR: 0, pullStr: 0, vuln: 0 });
const ALLY_MAX = 36, H4_IMMUNE = e => e.megaBoss || e.E.worldBoss || e.E.raidBoss;

const NEW_HEROES_4 = [
  { id: 'premiejager', name: 'Premiejager', rarity: 'rare', role: 'Geld', h4: 'bounty', title: 'Iedere schurk heeft een prijs', style: 'projectile', proj: 'snipe', cost: 420,
    desc: 'Markeert steeds één vijand met een premie. Wordt die verslagen (door wie dan ook), dan krijg je extra geld. Gemarkeerde vijanden krijgen 20% meer schade.',
    base: { dmg: 34, range: 3.6, rate: 0.9, air: true, projSpeed: 18, markMult: 1 },
    look: { skin: '#c68642', suit: '#3f2d1d', suit2: '#fbbf24', cape: '#78350f', hair: 'cap', hairC: '#1c1917', emblem: 'dollar', weapon: 'rifle' }, fx: 'gold', ability: 'premiejacht',
    upgrades: [U('Scherpe Blik', 300, '+14 schade', { dmg: 14 }), U('Hoge Premie', 520, 'Premie +50%', { markMult: 0.5 }), U('Kogel met Naam', 900, '+0.3 snelheid, +1 bereik', { rate: 0.3, range: 1 }, true), U('Gezocht: Levend of Dood', 1500, 'Premie +75%, +30 schade', { markMult: 0.75, dmg: 30 }), U('Legendarische Jager', 2600, '+60 schade, premie ×2. ULTIMATE', { dmg: 60, markMult: 1 }, true)] },
  { id: 'omkeerder', name: 'Omkeerder', rarity: 'epic', role: 'Controle', h4: 'reverse', title: 'Laat de tijd terugstromen', style: 'projectile', proj: 'time', cost: 600,
    desc: 'Zijn klokschoten kunnen vijanden laten omdraaien: een paar seconden lopen ze de andere kant op, terug naar het portaal. Bazen draaien maar kort om.',
    base: { dmg: 26, range: 3.2, rate: 1.0, air: true, projSpeed: 12, revChance: 0.22, revDur: 1.6 },
    look: { skin: '#f1c27d', suit: '#1e3a8a', suit2: '#67e8f9', cape: '#0e7490', hair: 'visor', hairC: '#0f172a', emblem: 'clock', weapon: 'staff' }, fx: 'wind', ability: 'tijdstroom',
    upgrades: [U('Tikkende Klok', 420, '+12 schade', { dmg: 12 }), U('Terugspoelen', 700, '+10% omkeerkans', { revChance: 0.1 }), U('Lange Echo', 1200, 'Omkeren duurt 1 seconde langer, raakt 2 doelen', { revDur: 1, multi: 1 }, true), U('Achteruit!', 1900, '+10% omkeerkans, +30 schade', { revChance: 0.1, dmg: 30 }), U('Heer van het Verleden', 3200, '+50 schade, omkeren +1,5 s. ULTIMATE', { dmg: 50, revDur: 1.5 }, true)] },
  { id: 'wortelaar', name: 'Wortelaar', rarity: 'epic', role: 'Controle', h4: 'roots', title: 'Het bos houdt je vast', style: 'roots', cost: 620,
    desc: 'Laat wortels uit de grond schieten die vijanden vastzetten en daarna vertragen. Vliegende vijanden ontsnappen. Bazen worden maar kort vastgehouden.',
    base: { dmg: 22, range: 2.8, rate: 0.65, multi: 2, rootDur: 1.0, slow: 0.35, slowDur: 1.8, air: false },
    look: { skin: '#a16207', suit: '#14532d', suit2: '#86efac', cape: '#3f6212', hair: 'crown', hairC: '#65a30d', emblem: 'wind', weapon: 'staff' }, fx: 'leaf', ability: 'wortelwoud',
    upgrades: [U('Diepe Wortels', 420, '+0,4 s vastzetten', { rootDur: 0.4 }), U('Doornen', 700, '+20 schade, +1 doel', { dmg: 20, multi: 1 }), U('Wurgranken', 1200, 'Sterkere vertraging, +0,5 bereik', { slow: 0.15, range: 0.5 }, true), U('Oerwoud', 1900, '+1 doel, +0,5 s vastzetten', { multi: 1, rootDur: 0.5 }), U('Hart van het Woud', 3300, '+60 schade, +2 doelen. ULTIMATE', { dmg: 60, multi: 2 }, true)] },
  { id: 'garnizoen', name: 'Garnizoen', rarity: 'legendary', role: 'Allround', h4: 'summon', title: 'Commandant van de stadswacht', style: 'summon', cost: 820,
    desc: 'Stuurt soldaten vanaf jullie basis het pad op, richting het portaal. Ze houden vijanden tegen en vechten tot ze vallen. Bazen lopen er wel doorheen.',
    base: { dmg: 22, range: 2.2, rate: 0.22, allyN: 1, allyHp: 160, air: false },
    look: { skin: '#e0ac69', suit: '#334155', suit2: '#f59e0b', cape: '#b91c1c', hair: 'helmet', hairC: '#94a3b8', emblem: 'cross', weapon: 'shield' }, fx: 'dust', ability: 'uitval',
    upgrades: [U('Drilmeester', 700, '+12 schade, +60 HP per soldaat', { dmg: 12, allyHp: 60 }), U('Dubbele Wacht', 1000, '+1 soldaat per keer', { allyN: 1 }), U('Pantsering', 1800, '+150 HP per soldaat, sneller oproepen', { allyHp: 150, rate: 0.06 }, true), U('Veteranen', 2600, '+30 schade', { dmg: 30 }), U('Het Grote Leger', 4400, '+1 soldaat, +60 schade, +300 HP. ULTIMATE', { allyN: 1, dmg: 60, allyHp: 300 }, true)] },
  { id: 'oerkiem', name: 'Oerkiem', rarity: 'legendary', role: 'Starter', h4: 'grow', title: 'Klein begonnen, eindigt als titaan', style: 'melee', cost: 760,
    desc: 'Wordt na iedere golf sterker (zolang hij staat). Zijn aanval groeit mee: vanaf 5 golven een schokgolf, vanaf 10 verdoven, vanaf 15 een meteoor bij elke 4e klap, vanaf 25 de Oervorm.',
    base: { dmg: 30, range: 1.6, rate: 0.9, growRate: 0.07, air: false },
    look: { skin: '#a3e635', suit: '#365314', suit2: '#d9f99d', cape: null, hair: 'crystal', hairC: '#4d7c0f', emblem: 'sun', weapon: 'fists', big: true }, fx: 'leaf', ability: 'oerbrul',
    upgrades: [U('Voeding', 600, '+10 schade', { dmg: 10 }), U('Snelle Groei', 950, 'Groeit 40% sneller', { growRate: 0.028 }), U('Wortelkracht', 1600, '+0,5 bereik, +20 schade', { range: 0.5, dmg: 20 }, true), U('Bloei', 2400, 'Groeit nog eens 40% sneller, +0,2 snelheid', { growRate: 0.028, rate: 0.2 }), U('Wereldboom', 4200, '+60 schade, groei ×1,5. ULTIMATE', { dmg: 60, growRate: 0.035 }, true)] },
  { id: 'mesmera', name: 'Mesmera', rarity: 'mythic', role: 'Controle', h4: 'hypno', title: 'Kijk diep in mijn ogen', style: 'projectile', proj: 'phantom', cost: 1150,
    desc: 'Haar spiraalschoten kunnen gewone vijanden hypnotiseren: ze draaien om en lopen terug over het pad, vechtend tegen hun eigen bende. Werkt niet op bazen.',
    base: { dmg: 60, range: 3.4, rate: 0.85, air: true, projSpeed: 11, hypno: 0.12 },
    look: { skin: '#fde2e4', suit: '#581c87', suit2: '#f472b6', cape: '#be185d', hair: 'long', hairC: '#f9a8d4', emblem: 'eye', weapon: 'orb', orb: '#f472b6' }, fx: 'prism', ability: 'massahypnose',
    upgrades: [U('Slingerende Munt', 1200, '+40 schade', { dmg: 40 }), U('Dieper Slapen', 1600, '+5% hypnosekans', { hypno: 0.05 }), U('Tweede Blik', 2600, '+1 doel, +0,3 snelheid', { multi: 1, rate: 0.3 }, true), U('Gedachtenlezer', 3800, '+6% hypnosekans, +80 schade', { hypno: 0.06, dmg: 80 }), U('Koningin van de Trance', 6500, '+150 schade, +1 doel. ULTIMATE', { dmg: 150, multi: 1 }, true)] },
  { id: 'singulara', name: 'Singulara', rarity: 'mythic', role: 'Area damage', h4: 'pull', title: 'Alles valt naar het midden', style: 'pull', cost: 1200,
    desc: 'Opent een zwaartekrachtput op het pad die vijanden naar één punt trekt. Daar raken explosies en splash-helden veel meer vijanden tegelijk. Getrokken vijanden krijgen 15% meer schade; aan het eind implodeert de put.',
    base: { dmg: 120, range: 3.6, rate: 0.32, pullR: 2.3, pullStr: 2.6, vuln: 0.15, air: true },
    look: { skin: '#e9d5ff', suit: '#1e1b4b', suit2: '#a78bfa', cape: '#4c1d95', hair: 'dome', hairC: '#312e81', emblem: 'void', weapon: 'orb', orb: '#1e1b4b', halo: true }, fx: 'void', ability: 'horizon',
    upgrades: [U('Diepere Put', 1300, '+0,5 trekbereik', { pullR: 0.5 }), U('Getijdenkracht', 1800, 'Sterkere trek, +80 schade', { pullStr: 1, dmg: 80 }), U('Gebeurtenishorizon', 3000, 'Vaker een put, +10% extra schade op getrokken vijanden', { rate: 0.1, vuln: 0.1 }, true), U('Spaghettificatie', 4200, '+200 schade', { dmg: 200 }), U('Zwart Gat', 7000, '+0,8 trekbereik, +300 schade. ULTIMATE', { pullR: 0.8, dmg: 300 }, true)] },
  { id: 'drieling', name: 'De Drieling', rarity: 'exotic', role: 'Allround', h4: 'trio', title: 'Drie helden, één team', style: 'trio', cost: 1500,
    trio: [
      { name: 'Vuist', look: { skin: '#f1c27d', suit: '#dc2626', suit2: '#fde047', cape: null, hair: 'spiky', hairC: '#1f2937', mask: '#111827', emblem: 'fist', weapon: 'fists' } },
      { name: 'Pijl', look: { skin: '#c68642', suit: '#15803d', suit2: '#bbf7d0', cape: '#166534', hair: 'hood', hairC: '#14532d', emblem: 'arrow', weapon: 'bow' } },
      { name: 'Vonk', look: { skin: '#fde2e4', suit: '#1d4ed8', suit2: '#93c5fd', cape: '#1e3a8a', hair: 'long', hairC: '#bfdbfe', emblem: 'bolt', weapon: 'staff' } },
    ],
    desc: 'Drie helden in één vak: Vuist slaat alles dichtbij (met splash), Pijl schiet ver en raakt vliegers, Vonk laat bliksem overspringen. Ze vallen ieder hun eigen doel aan.',
    base: { dmg: 70, range: 3.6, rate: 1.0, chains: 2, air: true, projSpeed: 15 },
    look: { skin: '#f1c27d', suit: '#dc2626', suit2: '#fde047', cape: null, hair: 'spiky', hairC: '#1f2937', emblem: 'tri', weapon: 'fists' }, fx: 'spark', ability: 'drievoud',
    upgrades: [U('Teamwork', 1600, '+40 schade voor alle drie', { dmg: 40 }), U('Snelle Wissels', 2200, '+0,25 snelheid', { rate: 0.25 }), U('Drie Tegen Allen', 3600, 'Vonk springt +2 verder, Pijl +1 bereik', { chains: 2, range: 1 }, true), U('Familieband', 5000, '+90 schade, 15% kritiek', { dmg: 90, crit: 0.15 }), U('De Drie-eenheid', 9000, '+160 schade, +0,3 snelheid. ULTIMATE', { dmg: 160, rate: 0.3 }, true)] },
  { id: 'dronemeester', name: 'Dronemeester', rarity: 'exotic', role: 'Snelle aanvallen', h4: 'drones', title: 'Nooit alleen op wacht', style: 'drones', cost: 1450,
    desc: 'Bestuurt drones die zelf vijanden zoeken en aanvallen, ook vliegende. Drones verdienen ervaring met elke zege en worden steeds sterker (tot level 20).',
    base: { dmg: 32, range: 3.8, rate: 1.6, drones: 2, air: true },
    look: { skin: '#e0ac69', suit: '#0f172a', suit2: '#22d3ee', cape: null, hair: 'visor', hairC: '#0e7490', emblem: 'hex', weapon: 'blaster' }, fx: 'spark', ability: 'zwermprotocol',
    upgrades: [U('Extra Drone', 1500, '+1 drone', { drones: 1 }), U('Lasers', 2100, '+22 schade per drone', { dmg: 22 }), U('Zwermlogica', 3500, '+1 drone, +0,4 snelheid', { drones: 1, rate: 0.4 }, true), U('Titanium Romp', 4800, '+40 schade, 10% kritiek', { dmg: 40, crit: 0.1 }), U('Moederschip', 8500, '+2 drones, +60 schade. ULTIMATE', { drones: 2, dmg: 60 }, true)] },
];
NEW_HEROES_4.forEach(h => { HEROES.push(h); HERO[h.id] = h; });

Object.assign(ABILITIES, {
  premiejacht: { name: 'Premiejacht', ult: 'Meest Gezocht', cd: 18, desc: 'Markeert de 3 sterkste vijanden in bereik met een driedubbele premie.' },
  tijdstroom: { name: 'Tijdstroom', ult: 'Grote Terugspoeling', cd: 20, desc: 'Alle vijanden in bereik lopen 3 seconden achteruit (bazen korter).' },
  wortelwoud: { name: 'Wortelwoud', ult: 'Woud der Eeuwen', cd: 20, desc: 'Zet alle grondvijanden in bereik 3 seconden vast.' },
  uitval: { name: 'Uitval', ult: 'Roep de Reus', cd: 22, desc: 'Stuurt 4 zware ridders het pad op.' },
  oerbrul: { name: 'Oerbrul', ult: 'Wereldbrul', cd: 18, desc: 'Verdooft alles in bereik en doet zware schade. Als ULTIMATE groeit hij ook 2 golven extra.' },
  massahypnose: { name: 'Massahypnose', ult: 'Grote Trance', cd: 24, desc: 'Hypnotiseert de 3 sterkste gewone vijanden in bereik.' },
  horizon: { name: 'Gebeurtenishorizon', ult: 'Singulariteit', cd: 22, desc: 'Een enorme put trekt 4 seconden lang alles in bereik naar één punt.' },
  drievoud: { name: 'Drievoud', ult: 'Drie-eenheid', cd: 20, desc: 'Alle drie vallen 5 seconden lang driemaal zo snel aan.' },
  zwermprotocol: { name: 'Zwermprotocol', ult: 'Moederschip', cd: 22, desc: 'Lanceert 8 seconden lang 4 extra drones.' },
});

/* ---------- algemene hulpjes ---------- */
const h4Live = g => g.allies || (g.allies = []);
function h4Ally(g, o) {
  const A = h4Live(g); if (A.length >= ALLY_MAX) return null;
  const a = Object.assign({ d: g.leakD - 6, hp: 100, maxHp: 100, dmg: 10, r: 10, speed: 1.15, hitT: 0, t: Math.random() * 5, x: 0, y: 0, ang: Math.PI, kind: 'soldier' }, o);
  a.maxHp = a.hp; const p = g.posAt(a.d); a.x = p.x; a.y = p.y; A.push(a);
  g.fx.burst(a.x, a.y, a.kind === 'hyp' ? '#f472b6' : '#fbbf24', 10, 110, 3, 0.4, 'spark');
  return a;
}
function h4Root(e, dur) { if (H4_IMMUNE(e) || e.flying) return; const d = e.boss ? dur * 0.25 : e.ccImm ? dur * 0.4 : dur; e.rootT = Math.max(e.rootT || 0, d); }
function h4Reverse(e, dur) { if (H4_IMMUNE(e) || e.ccImm) return; e.revT = Math.max(e.revT || 0, e.boss ? dur * 0.3 : dur); }
function h4Hypno(g, e, h) {
  if (e.boss || e.dead || H4_IMMUNE(e) || e.E.hidden && e.type !== 'mini' || h4Live(g).length >= ALLY_MAX) return false;
  const hp = Math.min(Math.max(30, e.hp), 400 * (1 + 0.1 * Math.min(g.wave || 1, 80))), E = e.E, d = e.d;
  g.kill(e, h); if (!e.dead) return false;
  const a = h4Ally(g, { kind: 'hyp', type: e.type, E, d, hp: hp * 1.2, dmg: h.st.dmg * 0.5 + E.hp * 0.08, r: e.r, speed: Math.max(0.7, E.speed * 0.9), owner: h });
  if (a) g.floatText(a.x, a.y - 26, 'GEHYPNOTISEERD', '#f472b6', 14, 0.9);
  return !!a;
}
function h4Well(g, h, d, opts = {}) {
  const st = h.st, p = g.posAt(d);
  (g.wells || (g.wells = [])).push({ d, x: p.x, y: p.y, r: (opts.r || st.pullR) * TILE, str: opts.str || st.pullStr, life: opts.life || 1.6, max: opts.life || 1.6, dmg: opts.dmg || st.dmg, h, tick: 0, air: st.air, big: !!opts.big, vuln: st.vuln });
  Sfx.play('void');
}
function h4Growth(g, h) { if (!h.def || h.def.h4 !== 'grow') return 0; const w = Math.max(0, (g.wave || 0) - (h.placedW == null ? (g.wave || 0) : h.placedW)) + (h.growBonus || 0); return Math.min(60, w); }

/* ---------- plaatsen: onthoud de golf (voor Oerkiem) ---------- */
const _place25 = Game.prototype.placeHero;
Game.prototype.placeHero = function (id, tx, ty) {
  const r = _place25.apply(this, arguments);
  const h = r && typeof r === 'object' ? r : this.heroes.find(x => x.id === id && x.tx === tx && x.ty === ty);
  if (h && h.placedW == null) h.placedW = this.wave;
  return r;
};

/* ---------- statistieken: groei ---------- */
const _heroStats25 = Game.prototype.heroStats;
Game.prototype.heroStats = function (h) {
  const st = _heroStats25.call(this, h);
  if (h.def && h.def.h4 === 'grow') {
    const w = h4Growth(this, h); h.growth = w;
    st.dmg *= 1 + w * st.growRate * (h.tier >= 5 ? 1.5 : 1);
    if (w >= 5) st.cleave = Math.max(st.cleave, 0.9);
    if (w >= 10) { st.stunChance += 0.12; st.stun = Math.max(st.stun, 0.6); }
    if (w >= 25) { st.rate *= 1.4; st.range += 0.4; }
  }
  return st;
};

/* ---------- aanvallen ---------- */
const _updateHero25 = Game.prototype.updateHero;
Game.prototype.updateHero = function (h, dt) {
  const kind = h.def && h.def.h4; if (!kind) return _updateHero25.call(this, h, dt);
  const cdBefore = h.cd - dt, stunned = h.stunT > 0;
  _updateHero25.call(this, h, dt);
  if (stunned || h.stunT > 0 || h.temp) return;
  const attacked = cdBefore <= 0 && h.cd > 0 && h.atk === 1;
  const fn = H4_TICK[kind]; if (fn) fn(this, h, dt, attacked);
};
const H4_TICK = {
  bounty(g, h, dt) {
    h.markT = (h.markT || 0) - dt; if (h.markT > 0) return; h.markT = 0.4;
    if (h.markE && !h.markE.dead && g.enemies.includes(h.markE)) return;
    const R = h.st.range * TILE * 1.6;
    const c = g.enemies.filter(e => !e.dead && !e.bountyT && (e.x - h.x) ** 2 + (e.y - h.y) ** 2 <= R * R && (!e.invis || e.revealed)).sort((a, b) => (b.maxHp + b.maxShield) - (a.maxHp + a.maxShield));
    if (c[0]) { h.markE = c[0]; c[0].bountyT = 999; c[0].bountyBy = h; c[0].bountyX = 1; g.floatText(c[0].x, c[0].ay - c[0].r - 18, 'PREMIE!', '#fbbf24', 14, 0.8); }
  },
  grow(g, h, dt, attacked) {
    const w = h.growth || 0;
    if (w !== h.growSeen) { if (h.growSeen != null && w > h.growSeen && [5, 10, 15, 25].includes(w)) { g.floatText(h.x, h.y - 36, w >= 25 ? 'OERVORM!' : `Oerkiem groeit (${w})`, '#bef264', 17, 1.4); g.fx.ring(h.x, h.y, 50, '#bef264', 0.6, 5); Sfx.play('upgrade'); } h.growSeen = w; }
    if (!attacked || w < 15) return;
    h.hits = (h.hits || 0) + 1; if (h.hits % 4) return;
    const t = g.findTargets(h, h.st.range * TILE + 30, 1)[0]; if (!t) return;
    g.effects.push({ type: 'strike', target: t, x: t.x, y: t.y, delay: 0.3, h, st: Object.assign({}, h.st, { splash: 1.4 }), dmg: h.st.dmg * 2.5, kind: 'comet', color: '#bef264', life: 0.3, max: 0.3 });
  },
  roots(g, h, dt, attacked) {
    if (!attacked) return; const st = h.st;
    const ts = g.findTargets(h, st.range * TILE, Math.max(1, st.multi)).filter(e => !e.flying);
    for (const e of ts) { g.damage(e, st.dmg, h, { color: '#86efac' }); if (e.dead) continue; h4Root(e, st.rootDur); g.applyStatus(e, st); (g.vines || (g.vines = [])).push({ x: e.x, y: e.y, life: 0.6, max: 0.6, s: e.r }); }
    if (ts.length) { Sfx.play('punch'); g.fx.burst(h.x, h.y + 8, '#86efac', 6, 80, 2, 0.4, 'leaf'); }
  },
  summon(g, h, dt) {
    h.sumT = (h.sumT == null ? 1 : h.sumT) - dt;
    if (h.sumT > 0 || !(g.wave > 0) || (!g.enemies.length && !g.queue.length)) return;
    h.sumT = 1 / h.st.rate; const st = h.st;
    for (let i = 0; i < st.allyN; i++) h4Ally(g, { d: g.leakD - 6 - i * 16, hp: st.allyHp, dmg: st.dmg, owner: h, kind: 'soldier', look: h.look });
    g.fx.ring(h.x, h.y, 30, '#fbbf24', 0.4, 3); Sfx.play('place');
  },
  pull(g, h, dt, attacked) {
    if (!attacked) return;
    const t = g.findTargets(h, h.st.range * TILE, 1)[0]; if (!t) return;
    // midden van de grootste groep binnen bereik
    const R = h.st.pullR * TILE, near = g.enemiesIn(h.x, h.y, h.st.range * TILE, h.st.air);
    let best = t, bn = 0; for (const e of near) { let n = 0; for (const o of near) if (Math.abs(o.d - e.d) < R) n++; if (n > bn) { bn = n; best = e; } }
    h4Well(g, h, best.d);
  },
  trio(g, h, dt) {
    const st = h.st, cds = h.trioCd || (h.trioCd = [0, 0.3, 0.6]);
    const M = [
      { range: 1.7, rate: st.rate * 0.9, air: false },
      { range: st.range + 0.4, rate: st.rate * 1.15, air: true },
      { range: st.range * 0.9, rate: st.rate * 0.75, air: true },
    ];
    h.trioAtk = h.trioAtk || [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      h.trioAtk[i] = Math.max(0, h.trioAtk[i] - dt * 4);
      cds[i] -= dt; if (cds[i] > 0) continue;
      let c = g.enemiesIn(h.x, h.y, M[i].range * TILE, M[i].air); if (g.hasInvis) c = c.filter(e => !e.invis || e.revealed);
      if (!c.length) { cds[i] = 0; continue; }
      c.sort((a, b) => b.d - a.d); const t = c[0]; cds[i] = 1 / M[i].rate; h.trioAtk[i] = 1; h.ang = Math.atan2(t.ay - h.y, t.x - h.x);
      const crit = Math.random() < st.crit;
      if (i === 0) {
        for (const e of g.enemiesIn(t.x, t.y, 0.9 * TILE, false)) g.damage(e, st.dmg * 1.5, h, { crit, critMult: st.critMult });
        g.effects.push({ type: 'slash', x: t.x, y: t.ay, ang: h.ang, color: '#fde047', life: 0.18, max: 0.18, big: true }); Sfx.play('punch');
      } else if (i === 1) {
        g.fireProjectile(h, t, Object.assign({}, st, { splash: 0 }), 0, { kind: 'arrow', speed: 18 }); Sfx.play('shoot');
      } else {
        const hit = new Set(); let cur = t, dmg = st.dmg * 0.9; const pts = [{ x: h.x, y: h.y - 14 }];
        for (let j = 0; j <= st.chains && cur; j++) { hit.add(cur); pts.push({ x: cur.x, y: cur.ay }); g.damage(cur, dmg, h, { crit, critMult: st.critMult, color: '#93c5fd' }); dmg *= 0.85; let nxt = null, nd = (2 * TILE) ** 2; for (const o of g.enemies) { if (o.dead || hit.has(o)) continue; const dd = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (dd < nd) { nd = dd; nxt = o; } } cur = nxt; }
        g.effects.push({ type: 'lightning', pts, color: '#93c5fd', life: 0.18, max: 0.18, w: 2.5 }); Sfx.play('zap');
      }
    }
  },
  drones(g, h, dt) {
    const st = h.st, n = Math.min(10, st.drones + (h.extraDrones || 0)), lvl = Math.min(20, Math.floor((h.droneXp || 0) / 12));
    if (lvl > (h.droneLvl || 0)) { h.droneLvl = lvl; g.floatText(h.x, h.y - 36, `Drones level ${lvl}!`, '#22d3ee', 15, 1.1); Sfx.play('upgrade'); }
    if (h.extraT > 0) { h.extraT -= dt; if (h.extraT <= 0) h.extraDrones = 0; }
    const D = h.dr || (h.dr = []); while (D.length < n) D.push({ cd: Math.random() * 0.5, a: D.length * TAU / Math.max(1, n), x: h.x, y: h.y, flash: 0 }); D.length = n;
    const dmg = st.dmg * (1 + (h.droneLvl || 0) * 0.12), R = st.range * TILE;
    D.forEach((d, i) => {
      d.a += dt * 1.6; const ox = h.x + Math.cos(d.a + i * TAU / n) * 30, oy = h.y - 22 + Math.sin(d.a + i * TAU / n) * 12;
      d.x += (ox - d.x) * Math.min(1, dt * 8); d.y += (oy - d.y) * Math.min(1, dt * 8); d.flash = Math.max(0, d.flash - dt * 5);
      d.cd -= dt; if (d.cd > 0) return;
      let c = g.enemiesIn(h.x, h.y, R, true); if (g.hasInvis) c = c.filter(e => !e.invis || e.revealed);
      if (!c.length) { d.cd = 0.1; return; }
      const t = c[i % c.length]; d.cd = 1 / st.rate; d.flash = 1;
      const crit = Math.random() < st.crit; g.damage(t, dmg, h, { crit, critMult: st.critMult, color: '#67e8f9', droneHit: true });
      g.effects.push({ type: 'lightning', pts: [{ x: d.x, y: d.y }, { x: t.x, y: t.ay }], color: '#22d3ee', life: 0.12, max: 0.12, w: 1.6 + (h.droneLvl || 0) * 0.08 });
    });
    if (D.some(d => d.flash === 1)) Sfx.play('laser');
  },
};

/* ---------- schade: omkeren, hypnose, premie-bonus ---------- */
const _damage25 = Game.prototype.damage;
Game.prototype.damage = function (e, amt, h, o = {}) {
  if (e && e.bountyT > 0 && amt > 0) amt *= 1.2;
  if (e && e.wellT > 0 && amt > 0) amt *= 1 + (e.wellV || 0.15);
  // klappen van bondgenoten (o.ally) veroorzaken geen nieuwe hypnose of omkering: geen kettingreactie
  const own = h && h.st && e && !e.dead && !o.acc && !o.ally;
  // hypnose vóór de schade: anders zou een dodelijke klap het nooit laten gebeuren
  if (own && h.st.hypno > 0 && Math.random() < h.st.hypno * (e.elite ? 0.5 : 1) && h4Hypno(this, e, h)) return 0;
  const r = _damage25.call(this, e, amt, h, o);
  if (!own || e.dead) return r;
  if (h.st.revChance > 0 && Math.random() < h.st.revChance) { const b = e.revT || 0; h4Reverse(e, h.st.revDur); if ((e.revT || 0) > b + 0.3) this.floatText(e.x, e.ay - e.r - 12, 'OMGEKEERD', '#67e8f9', 13, 0.7); }
  return r;
};
const _kill25 = Game.prototype.kill;
Game.prototype.kill = function (e, h) {
  const was = e.dead; _kill25.call(this, e, h);
  if (was || !e.dead) return;
  if (e.bountyT > 0 && e.bountyBy) {
    const hb = e.bountyBy, mult = (hb.st ? hb.st.markMult : 1) * (e.bountyX || 1);
    const amt = Math.round((20 + Math.min(this.wave, 80) * 5) * mult * (e.boss ? 4 : 1));
    if (this.mode === 'coop2' && this.cash2 != null && hb.owner === 1) this.cash2 += amt; else this.cash += amt;
    this.floatText(e.x, e.ay - 24, `+$${amt} PREMIE`, '#fbbf24', 17, 1.2); this.fx.burst(e.x, e.ay, '#fde047', 16, 160, 3, 0.6, 'glow'); Sfx.play('coin');
  }
  if (h && h.def && h.def.h4 === 'drones') h.droneXp = (h.droneXp || 0) + (e.boss ? 10 : 1);
};

/* ---------- vijanden: vastgezet / achteruit / in een put ---------- */
const _updateEnemy25 = Game.prototype.updateEnemy;
Game.prototype.updateEnemy = function (e, dt) {
  const d0 = e.d; _updateEnemy25.call(this, e, dt);
  if (e.dead) return;
  if (e.wellT > 0) e.wellT -= dt;
  if (e.bountyT > 0 && e.bountyBy && !this.heroes.includes(e.bountyBy)) { e.bountyT = 0; e.bountyBy = null; }
  let moved = e.d - d0, fix = false;
  if (e.rootT > 0) { e.rootT -= dt; if (moved > 0) { e.d = d0; fix = true; } }
  else if (e.revT > 0) { e.revT -= dt; if (moved > 0) { e.d = Math.max(-20, d0 - moved * 0.9); fix = true; } }
  if (e.allyBlock > 0) { e.allyBlock -= dt; if (!e.boss && e.d > d0) { e.d = d0; fix = true; } }
  // lastD bijwerken: anders ziet het 'zware vijanden'-systeem dit als terugduwen en versterkt het elkaar
  if (fix) { const p = this.posAt(e.d); e.x = p.x; e.y = p.y; e.ay = p.y - (e.flying ? 16 : 0); e.dir = e.revT > 0 ? p.ang + Math.PI : p.ang; if (e.lastD != null) e.lastD = e.d; }
};

/* ---------- bondgenoten en putten bijwerken ---------- */
const _updExt25 = Game.prototype.updateExt;
Game.prototype.updateExt = function (dt) {
  _updExt25.call(this, dt);
  const A = this.allies;
  if (A && A.length) {
    for (const a of A) {
      a.t += dt; a.hitT -= dt;
      const foe = this.enemies.find(e => !e.dead && !e.flying && Math.abs(e.d - a.d) < (a.r + e.r) * 0.9 + 6);
      if (foe) {
        if (!foe.boss) foe.allyBlock = 0.15;
        if (a.hitT <= 0) {
          a.hitT = 0.5; this.damage(foe, a.dmg, a.owner && this.heroes.includes(a.owner) ? a.owner : null, { color: a.kind === 'hyp' ? '#f9a8d4' : '#fde68a', pure: !a.owner, ally: true });
          a.hp -= 20 * Math.min(6, foe.E.leak || 1) * (1 + 0.08 * Math.min(this.wave || 1, 80)) * (foe.boss ? 6 : 1) * (foe.elite ? 2 : 1);
          this.fx.burst((a.x + foe.x) / 2, (a.y + foe.ay) / 2, '#ffffff', 3, 80, 2, 0.2, 'spark');
        }
      } else a.d -= a.speed * TILE * dt;
      const p = this.posAt(a.d); a.x = p.x; a.y = p.y; a.ang = p.ang + Math.PI;
      if (a.hp <= 0 || a.d < -15) { a.gone = true; this.fx.burst(a.x, a.y - 6, a.kind === 'hyp' ? '#f472b6' : '#94a3b8', 12, 120, 3, 0.4, 'smoke'); }
    }
    this.allies = A.filter(a => !a.gone);
  }
  const W = this.wells;
  if (W && W.length) {
    for (const w of W) {
      w.life -= dt; w.tick -= dt; const hot = w.tick <= 0; if (hot) w.tick = 0.4;
      for (const e of this.enemiesIn(w.x, w.y, w.r, w.air)) {
        if (H4_IMMUNE(e)) continue;
        const k = Math.min(1, w.str * dt * (e.boss ? 0.15 : e.ccImm ? 0.3 : 1)); e.d += (w.d - e.d) * k;
        e.wellT = 0.5; e.wellV = w.vuln || 0.15;
        if (hot && w.h) this.damage(e, w.dmg * 0.15, this.heroes.includes(w.h) ? w.h : null, { color: '#c4b5fd', acc: true });
      }
      if (w.life <= 0) {
        for (const e of this.enemiesIn(w.x, w.y, w.r, w.air)) this.damage(e, w.dmg * (w.big ? 6 : 1), this.heroes.includes(w.h) ? w.h : null, { color: '#a78bfa' });
        this.fx.ring(w.x, w.y, w.r, '#a78bfa', 0.5, 6); this.fx.burst(w.x, w.y, '#c4b5fd', w.big ? 40 : 18, 220, 3, 0.5, 'glow'); this.shake(w.big ? 8 : 3); Sfx.play('boom');
      }
    }
    this.wells = W.filter(w => w.life > 0);
  }
  if (this.vines && this.vines.length) { for (const v of this.vines) v.life -= dt; this.vines = this.vines.filter(v => v.life > 0); }
};

/* ---------- abilities ---------- */
Object.assign(ABILITY_FX, {
  premiejacht(g, h, ult) {
    const R = h.st.range * TILE * 1.6, list = g.enemies.filter(e => !e.dead && (e.x - h.x) ** 2 + (e.y - h.y) ** 2 <= R * R).sort((a, b) => b.maxHp - a.maxHp).slice(0, ult ? 6 : 3);
    if (!list.length) return noTarget(g, h);
    for (const e of list) { e.bountyT = 999; e.bountyBy = h; e.bountyX = 3; g.fx.ring(e.x, e.ay, 26, '#fbbf24', 0.5, 3); }
    g.floatText(h.x, h.y - 36, `${list.length}× PREMIE ×3`, '#fbbf24', 17, 1.2);
  },
  tijdstroom(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * (ult ? 1.6 : 1.2), true); if (!list.length) return noTarget(g, h);
    for (const e of list) h4Reverse(e, ult ? 5 : 3);
    g.fx.ring(h.x, h.y, h.st.range * TILE * 0.6, '#a5f3fc', 0.5, 4); g.fx.ring(h.x, h.y, h.st.range * TILE * 1.2, '#67e8f9', 0.6, 6);
  },
  wortelwoud(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * (ult ? 1.8 : 1.3), false).filter(e => !e.flying); if (!list.length) return noTarget(g, h);
    for (const e of list) { h4Root(e, ult ? 5 : 3); g.damage(e, h.st.dmg * (ult ? 6 : 3), h, { color: '#86efac' }); (g.vines || (g.vines = [])).push({ x: e.x, y: e.y, life: 1.2, max: 1.2, s: e.r * 1.4 }); }
    g.fx.ring(h.x, h.y, h.st.range * TILE * 1.3, '#4ade80', 0.6, 6);
  },
  uitval(g, h, ult) {
    const st = h.st;
    if (ult) h4Ally(g, { hp: st.allyHp * 14, dmg: st.dmg * 6, owner: h, kind: 'giant', r: 22, speed: 0.7, look: h.look });
    for (let i = 0; i < 4; i++) h4Ally(g, { d: g.leakD - 6 - i * 20, hp: st.allyHp * 3, dmg: st.dmg * 2, owner: h, kind: 'knight', r: 13, look: h.look });
    g.banner(ult ? 'DE REUS MARCHEERT' : 'UITVAL!', 'Soldaten vanaf de basis het pad op', '#f59e0b');
  },
  oerbrul(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 2.2, false);
    for (const e of list) { g.damage(e, h.st.dmg * (ult ? 8 : 4), h, { color: '#bef264' }); if (!H4_IMMUNE(e)) e.stunT = Math.max(e.stunT, e.boss ? 0.4 : 1.5); }
    if (ult) { h.growBonus = (h.growBonus || 0) + 2; g.floatText(h.x, h.y - 40, '+2 groei', '#bef264', 18, 1.3); }
    g.fx.ring(h.x, h.y, h.st.range * TILE * 2.2, '#bef264', 0.6, 8); g.shake(6);
  },
  massahypnose(g, h, ult) {
    const list = g.enemiesIn(h.x, h.y, h.st.range * TILE * 1.3, true).filter(e => !e.boss && !H4_IMMUNE(e)).sort((a, b) => b.maxHp - a.maxHp).slice(0, ult ? 8 : 3);
    if (!list.length) return noTarget(g, h);
    let n = 0; for (const e of list) if (h4Hypno(g, e, h)) n++;
    g.floatText(h.x, h.y - 36, `${n}× GEHYPNOTISEERD`, '#f472b6', 17, 1.2); g.fx.ring(h.x, h.y, h.st.range * TILE * 1.3, '#f472b6', 0.6, 6);
  },
  horizon(g, h, ult) {
    const t = g.findTargets(h, h.st.range * TILE * 1.3, 1)[0]; if (!t) return noTarget(g, h);
    h4Well(g, h, t.d, { r: h.st.pullR * (ult ? 2 : 1.6), str: h.st.pullStr * 1.5, life: 4, dmg: h.st.dmg * (ult ? 2 : 1), big: ult });
  },
  drievoud(g, h, ult) { h.buffs.push({ rateMul: 3, dmgMul: ult ? 2 : 1, t: ult ? 8 : 5 }); g.fx.ring(h.x, h.y, 40, '#fde047', 0.5, 5); },
  zwermprotocol(g, h, ult) { h.extraDrones = ult ? 8 : 4; h.extraT = ult ? 12 : 8; g.fx.burst(h.x, h.y - 20, '#22d3ee', 24, 160, 3, 0.5, 'spark'); },
});

/* ---------- tekenen ---------- */
// De Drieling: drie kleine helden op één vak (ook in portretten)
const _drawHero25 = drawHero;
drawHero = function (ctx, H, x, y, s, t, o = {}) {
  if (!H || !H.trio || o.trioPart) return _drawHero25.apply(this, arguments);
  const off = [[-9, 3], [9, 3], [0, -7]], atk = o.trioAtk || [0, 0, 0];
  [2, 0, 1].forEach(i => _drawHero25(ctx, H, x + off[i][0] * s, y + off[i][1] * s, s * 0.7, t + i * 0.7, Object.assign({}, o, { trioPart: true, look: H.trio[i].look, atk: atk[i], seed: (o.seed || 0) + i * 3 })));
};
const _drawHeroUnit25 = Game.prototype.drawHeroUnit;
Game.prototype.drawHeroUnit = function (ctx, h, t) {
  if (h.def && h.def.trio) { const keep = drawHero; drawHero = (c, H, x, y, s, tt, o = {}) => keep(c, H, x, y, s, tt, Object.assign({}, o, { trioAtk: h.trioAtk })); try { return _drawHeroUnit25.call(this, ctx, h, t); } finally { drawHero = keep; } }
  const r = _drawHeroUnit25.call(this, ctx, h, t);
  if (h.def && h.def.h4 === 'grow' && h.growth) {
    ctx.save(); ctx.font = "700 11px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = h.growth >= 25 ? '#fde047' : '#bef264'; ctx.strokeStyle = EDGE; ctx.lineWidth = 3;
    const s = `+${h.growth}`; ctx.strokeText(s, h.x - 15, h.y - 24); ctx.fillText(s, h.x - 15, h.y - 24); ctx.restore();
  }
  if (h.dr) for (const d of h.dr) drawDrone(ctx, d.x, d.y, t, h.droneLvl || 0, d.flash);
  return r;
};
function drawDrone(ctx, x, y, t, lvl, flash) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 6 + x) * 1.5);
  const c = lvl >= 15 ? '#fde047' : lvl >= 8 ? '#a78bfa' : '#22d3ee';
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 14, 6, 2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1e293b'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5; rr(ctx, -6, -3, 12, 6, 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba('#e2e8f0', 0.7); ctx.lineWidth = 1; for (const sx of [-7, 7]) { ctx.beginPath(); ctx.moveTo(sx - 4 * Math.cos(t * 40), -4); ctx.lineTo(sx + 4 * Math.cos(t * 40), -4); ctx.stroke(); }
  ctx.fillStyle = flash > 0 ? '#ffffff' : c; circle(ctx, 0, 0, 2 + flash); ctx.fill();
  ctx.restore();
}
function drawAlly(ctx, a, t) {
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.kind === 'hyp' && a.E) {
    ctx.save(); ctx.globalAlpha = 0.9; drawEnemyBody(ctx, { type: a.type, E: a.E, r: a.r, flying: false, dir: a.ang, hp: a.hp, maxHp: a.maxHp, shield: 0, maxShield: 0, healPulse: 0 }, a.t); ctx.restore();
    ctx.strokeStyle = rgba('#f472b6', 0.8); ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 18; i++) { const an = i * 0.7 + a.t * 4, rr2 = 2 + i * 0.5; ctx.lineTo(Math.cos(an) * rr2, -a.r - 10 + Math.sin(an) * rr2 * 0.5); } ctx.stroke();
  } else {
    const L = a.look || { skin: '#e0ac69', suit: '#334155', suit2: '#f59e0b' }, s = a.kind === 'giant' ? 1.25 : a.kind === 'knight' ? 0.85 : 0.65;
    _drawHero25(ctx, HERO.garnizoen, 0, -4 * s, s, a.t, { look: Object.assign({}, L, { cape: a.kind === 'soldier' ? null : L.cape, weapon: a.kind === 'giant' ? 'hammer' : 'shield', hair: 'helmet' }), ang: a.ang, atk: a.hitT > 0.35 ? 1 : 0, seed: a.d % 7 });
  }
  if (a.hp < a.maxHp) { const w = 22; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-w / 2, -a.r - 20, w, 3); ctx.fillStyle = '#38bdf8'; ctx.fillRect(-w / 2, -a.r - 20, w * clamp(a.hp / a.maxHp, 0, 1), 3); }
  ctx.restore();
}
const _drawExt25 = Game.prototype.drawExt;
Game.prototype.drawExt = function (ctx, t, under) {
  _drawExt25.call(this, ctx, t, under);
  const V = this.h4view;
  if (under) {
    for (const w of (V ? V.w : this.wells) || []) {
      const f = w.life / w.max; ctx.save(); ctx.translate(w.x, w.y);
      const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, w.r); gr.addColorStop(0, 'rgba(15,10,40,.75)'); gr.addColorStop(0.6, 'rgba(76,29,149,.25)'); gr.addColorStop(1, 'rgba(76,29,149,0)');
      ctx.fillStyle = gr; circle(ctx, 0, 0, w.r); ctx.fill();
      ctx.strokeStyle = rgba('#a78bfa', 0.6 * f + 0.2); ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, w.r * (0.3 + i * 0.18) * (0.8 + 0.2 * f), t * (3 + i) + i, t * (3 + i) + i + 2.4); ctx.stroke(); }
      ctx.restore();
    }
    for (const v of (V ? V.v : this.vines) || []) {
      const f = v.life / v.max, grow = Math.min(1, (1 - f) * 5); ctx.save(); ctx.translate(v.x, v.y + 6); ctx.strokeStyle = rgba('#4ade80', 0.9 * Math.min(1, f * 3)); ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * v.s * 0.8, Math.sin(a) * v.s * 0.4, Math.cos(a) * v.s * 1.3 * grow, Math.sin(a) * v.s * 1.6 * grow); ctx.stroke(); }
      ctx.restore();
    }
    return;
  }
  for (const a of (V ? V.a : this.allies) || []) drawAlly(ctx, a, t);
  if (V && V.d) for (const d of V.d) drawDrone(ctx, d[0], d[1], t, d[2], 0);
};
const _drawEnemy25 = Game.prototype.drawEnemy;
Game.prototype.drawEnemy = function (ctx, e, t) {
  _drawEnemy25.call(this, ctx, e, t);
  if (!(e.rootT > 0 || e.revT > 0 || e.bountyT > 0)) return;
  ctx.save(); ctx.translate(e.x, e.ay); const r = e.r;
  if (e.rootT > 0) { ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 1.1, r * 0.45, a * 0.1, a, a + 1.2); ctx.stroke(); } }
  if (e.revT > 0) { ctx.fillStyle = '#67e8f9'; ctx.font = "700 14px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('↺', 0, -r - 10); }
  if (e.bountyT > 0) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; const k = r + 7 + Math.sin(t * 6) * 1.5; circle(ctx, 0, 0, k); ctx.stroke(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(dx * (k - 4), dy * (k - 4)); ctx.lineTo(dx * (k + 5), dy * (k + 5)); ctx.stroke(); } ctx.fillStyle = '#fbbf24'; ctx.font = "700 11px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('$', 0, -k - 3); }
  ctx.restore();
};

/* ---------- co-op: bondgenoten, putten, wortels en drones meesturen ---------- */
if (typeof FLAG_BITS !== 'undefined') for (const k of ['rootT', 'revT', 'bountyT']) if (!FLAG_BITS.includes(k)) FLAG_BITS.push(k);
if (typeof coopSnapshot === 'function') {
  const _snap25 = coopSnapshot;
  coopSnapshot = function (g) {
    const p = _snap25.apply(this, arguments);
    const A = (g.allies || []).map(a => ({ x: Math.round(a.x), y: Math.round(a.y), kind: a.kind, type: a.type || null, r: a.r, hp: Math.round(a.hp), maxHp: Math.round(a.maxHp), ang: +a.ang.toFixed(2), t: 0, look: a.kind === 'hyp' ? null : a.look }));
    const W = (g.wells || []).map(w => ({ x: Math.round(w.x), y: Math.round(w.y), r: Math.round(w.r), life: +w.life.toFixed(2), max: w.max }));
    const Vn = (g.vines || []).map(v => ({ x: Math.round(v.x), y: Math.round(v.y), s: v.s, life: +v.life.toFixed(2), max: v.max }));
    const D = []; for (const h of g.heroes) if (h.dr) for (const d of h.dr) D.push([Math.round(d.x), Math.round(d.y), h.droneLvl || 0]);
    if (A.length || W.length || Vn.length || D.length) p.X4 = { a: A, w: W, v: Vn, d: D };
    return p;
  };
}
if (typeof coopGuestMsg === 'function') {
  const _gmsg25 = coopGuestMsg;
  coopGuestMsg = function (g, ev, p) {
    const r = _gmsg25.apply(this, arguments);
    if (ev === 'snap' && p) { const X = p.X4 || { a: [], w: [], v: [], d: [] }; for (const a of X.a) { a.E = a.type ? ENEMIES[a.type] : null; a.t = performance.now() / 1000; } g.h4view = X; }
    return r;
  };
}
