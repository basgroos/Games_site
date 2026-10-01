/* =====================================================================
   UITBREIDING 2 — nieuwe content: exclusieve helden, vijanden, bazen,
   thema's en speciale maps (events, raids, geheime maps, arena's)
   ===================================================================== */
STAT_DEFAULTS.bossPct = 0;

/* ---------- Exclusieve helden (niet in de gewone gacha's) ---------- */
const EXCLUSIVE_HEROES = [
  // Events
  { id: 'heks', name: 'Pompoenheks', rarity: 'legendary', role: 'Area damage', exclusive: 'event', event: 'halloween', title: 'Vloekt al sinds 1692', style: 'projectile', cost: 720,
    desc: 'Gooit brandende pompoenbommen en vervloekt vijanden zodat ze meer schade krijgen.',
    base: { dmg: 55, splash: 1.0, burn: 18, range: 3.2, rate: 0.8, air: true, projSpeed: 11 },
    look: { skin: '#d9f99d', suit: '#4c1d95', suit2: '#f97316', cape: '#1e1b4b', hair: 'witch', hairC: '#1e1b4b', emblem: 'moon', weapon: 'staff', orb: '#f97316' },
    fx: 'bats', proj: 'pumpkin', ability: 'hexcurse',
    upgrades: [
      U('Rotte Pompoenen', 600, '+25 schade', { dmg: 25 }),
      U('Heksenvuur', 850, '+15 brand per seconde', { burn: 15 }),
      U('Pompoenregen', 1500, '2 pompoenen tegelijk, grotere explosie', { multi: 1, splash: 0.4 }, true),
      U('Zwarte Kat', 2000, '+0.3 snelheid, +0.5 bereik', { rate: 0.3, range: 0.5 }),
      U('Heksensabbat', 3800, '+80 schade, +25 brand. ULTIMATE', { dmg: 80, burn: 25 }, true),
    ] },
  { id: 'kerstagent', name: 'Agent Sneeuwvlok', rarity: 'legendary', role: 'Support', exclusive: 'event', event: 'kerst', title: 'Bezorgt cadeaus en ijsballen', style: 'projectile', cost: 650,
    desc: 'Sneeuwballen die vertragen, extra geld per golf en een cadeauregen als ability.',
    base: { dmg: 30, range: 3, rate: 1.2, slow: 0.3, slowDur: 1.5, air: true, projSpeed: 13, income: 40 },
    look: { skin: '#f1c27d', suit: '#b91c1c', suit2: '#f8fafc', cape: '#15803d', hair: 'santa', hairC: '#dc2626', emblem: 'snow', weapon: 'orb', orb: '#e0f2fe' },
    fx: 'frost', proj: 'snowball', ability: 'giftdrop',
    upgrades: [
      U('Harde Sneeuwballen', 550, '+15 schade', { dmg: 15 }),
      U('Kerstbonus', 800, '+40 geld per golf', { income: 40 }),
      U('Sneeuwstorm', 1400, '2 doelen, +10% vertraging', { multi: 1, slow: 0.1 }, true),
      U('Rendierslee', 1900, '+0.4 snelheid, +0.5 bereik', { rate: 0.4, range: 0.5 }),
      U('Kerstwonder', 3500, '+60 schade, +80 geld per golf. ULTIMATE', { dmg: 60, income: 80 }, true),
    ] },
  { id: 'surfer', name: 'Golfrijder', rarity: 'legendary', role: 'Controle', exclusive: 'event', event: 'zomer', title: 'Rijdt op elke golf', style: 'aura', cost: 680,
    desc: 'Golven rondom hem duwen vijanden terug. Zijn tsunami spoelt het hele pad schoon.',
    base: { dmg: 26, range: 2.4, rate: 1.0, knock: 0.2, slow: 0.15, slowDur: 1, air: true },
    look: { skin: '#c68642', suit: '#0891b2', suit2: '#fde047', cape: null, hair: 'long', hairC: '#fde68a', goggles: true, emblem: 'wind', weapon: 'surf' },
    fx: 'bubbles', ability: 'tsunami',
    upgrades: [
      U('Zoute Golven', 550, '+14 schade', { dmg: 14 }),
      U('Springvloed', 800, '+0.5 bereik, sterkere terugduw', { range: 0.5, knock: 0.1 }),
      U('Grote Branding', 1400, '+0.4 snelheid, +10% vertraging', { rate: 0.4, slow: 0.1 }, true),
      U('Onderstroom', 1900, '+25 schade, breekt 3 pantser', { dmg: 25, shred: 3 }),
      U('Koning van de Golven', 3600, '+50 schade, groter bereik. ULTIMATE', { dmg: 50, range: 0.8 }, true),
    ] },
  { id: 'feestkoning', name: 'Confettikoning', rarity: 'mythic', role: 'Geld', exclusive: 'event', event: 'jubileum', title: 'Elke dag is een feestdag', style: 'chain', cost: 1050,
    desc: 'Confettibliksem springt tussen vijanden en kills leveren extra geld op. Zijn feest laat vijanden dansen.',
    base: { dmg: 45, chains: 4, range: 3.2, rate: 1.2, air: true, bounty: 0.4 },
    look: { skin: '#fde7c8', suit: '#7c3aed', suit2: '#fbbf24', cape: '#ec4899', hair: 'crown', hairC: '#fbbf24', emblem: 'star', weapon: 'orb', orb: '#f472b6' },
    fx: 'confetti', ability: 'party',
    upgrades: [
      U('Feestslingers', 1000, '+25 schade, +1 sprong', { dmg: 25, chains: 1 }),
      U('Traktatie', 1400, 'Kills +30% geld', { bounty: 0.3 }),
      U('Megafeest', 2500, '+2 sprongen, +0.4 snelheid', { chains: 2, rate: 0.4 }, true),
      U('Discobal', 3200, '+60 schade, 10% kans om te verdoven', { dmg: 60, stunChance: 0.1, stun: 0.6 }),
      U('Jubileumkoning', 5800, '+120 schade, kills +50% geld. ULTIMATE', { dmg: 120, bounty: 0.5 }, true),
    ] },
  { id: 'komeet', name: 'Kapitein Komeet', rarity: 'legendary', role: 'Hoge damage', exclusive: 'event', event: 'held', title: 'De held uit de stripboeken', style: 'strike', strike: 'comet', cost: 760,
    desc: 'Laat kometen neerslaan op vijanden. Zijn Kometenregen treft alles in een groot gebied.',
    base: { dmg: 90, splash: 1.1, range: 4, rate: 0.6, air: true },
    look: { skin: '#e0ac69', suit: '#1d4ed8', suit2: '#fb923c', cape: '#f97316', hair: 'spiky', hairC: '#fb923c', mask: '#1e3a8a', emblem: 'star', weapon: 'fists' },
    fx: 'ember', ability: 'cometfall',
    upgrades: [
      U('Hete Staart', 600, '+45 schade', { dmg: 45 }),
      U('Sterrenzicht', 900, '+1 bereik', { range: 1 }),
      U('Dubbelkomeet', 1600, '2 kometen tegelijk, grotere inslag', { multi: 1, splash: 0.3 }, true),
      U('Zwaartekrachtlens', 2100, '+0.2 snelheid, breekt 5 pantser', { rate: 0.2, shred: 5 }),
      U('Held van de Hemel', 4000, '+140 schade, +1 komeet. ULTIMATE', { dmg: 140, multi: 1 }, true),
    ] },
  // Raids
  { id: 'titanenbreker', name: 'Titanenbreker', rarity: 'mythic', role: 'Baasdoder', exclusive: 'raid', title: 'Verslaat reuzen met één hamer', style: 'melee', cost: 1100,
    desc: 'Zware hamerslagen met dubbele schade tegen bazen. Zijn Titanenval verplettert alles in een grote kring.',
    base: { dmg: 140, range: 1.8, rate: 0.8, cleave: 0.7, air: false, bossPct: 1 },
    look: { skin: '#a8a29e', suit: '#44403c', suit2: '#f59e0b', cape: '#78350f', hair: 'helmet', hairC: '#292524', emblem: 'hex', weapon: 'hammer', big: true },
    fx: 'steam', ability: 'titanfall',
    upgrades: [
      U('Zwaardere Hamer', 1100, '+80 schade', { dmg: 80 }),
      U('Reuzenkracht', 1500, '+50% extra baasschade', { bossPct: 0.5 }),
      U('Aardscheur', 2600, 'Groter slaggebied, 15% kans om te verdoven', { cleave: 0.5, stunChance: 0.15, stun: 0.6 }, true),
      U('Titaanstaal', 3400, '+0.25 snelheid, breekt 8 pantser', { rate: 0.25, shred: 8 }),
      U('Godenhamer', 6000, '+250 schade, +100% baasschade. ULTIMATE', { dmg: 250, bossPct: 1 }, true),
    ] },
  { id: 'valkyrie', name: 'Stormvalkyrie', rarity: 'exotic', role: 'Baasdoder', exclusive: 'raid', special: 'cosmic', title: 'Rijdt op de raidstorm', style: 'chain', cost: 1500,
    desc: 'Bliksem die door 5 vijanden springt, met extra baasschade. Haar Valkyrierit slaat bliksem op elke vijand.',
    base: { dmg: 150, chains: 4, range: 4, rate: 1.1, air: true, bossPct: 0.6, stunChance: 0.1, stun: 0.5 },
    look: { skin: '#fef3c7', suit: '#0c4a6e', suit2: '#e0f2fe', cape: '#38bdf8', hair: 'long', hairC: '#fef9c3', emblem: 'wing', weapon: 'staff', orb: '#bae6fd', wings: true },
    fx: 'spark', ability: 'valkyrieride',
    upgrades: [
      U('Donderspeer', 1600, '+90 schade', { dmg: 90 }, false, true),
      U('Stormschild', 2200, '+2 sprongen, +0.3 snelheid', { chains: 2, rate: 0.3 }),
      U('Walhalla-roep', 3600, '+60% baasschade, +1 bereik', { bossPct: 0.6, range: 1 }, true, true),
      U('Bliksemvleugels', 4600, '+150 schade, +15% verdoofkans', { dmg: 150, stunChance: 0.15 }),
      U('Koningin van de Storm', 8200, '+300 schade, +3 sprongen. ULTIMATE', { dmg: 300, chains: 3 }, true, true),
    ] },
  // Uitdaging
  { id: 'kampioen', name: 'De Kampioen', rarity: 'legendary', role: 'Allround', exclusive: 'challenge', title: 'Won elke uitdaging', style: 'projectile', cost: 700,
    desc: 'Twee gouden bollen per schot met kans op kritieke treffers. Zijn Kampioensbrul maakt het hele team sneller.',
    base: { dmg: 50, range: 3.4, rate: 1.2, multi: 2, crit: 0.2, air: true, projSpeed: 15 },
    look: { skin: '#e8c39e', suit: '#ca8a04', suit2: '#fef08a', cape: '#b91c1c', hair: 'crown', hairC: '#fef08a', emblem: 'star', weapon: 'orb', orb: '#fef08a' },
    fx: 'gold', proj: 'star', ability: 'championroar',
    upgrades: [
      U('Trainingsuren', 600, '+25 schade', { dmg: 25 }),
      U('Topvorm', 850, '+0.4 snelheid, +10% crit', { rate: 0.4, crit: 0.1 }),
      U('Driedubbel Goud', 1500, 'Schiet op 3 doelen', { multi: 1 }, true),
      U('Wereldrecord', 2000, '+45 schade, +0.6 bereik', { dmg: 45, range: 0.6 }),
      U('Onverslaanbaar', 3800, '+90 schade, crits 3×. ULTIMATE', { dmg: 90, critMult: 1 }, true),
    ] },
];
for (const h of EXCLUSIVE_HEROES) { HEROES.push(h); HERO[h.id] = h; }
Object.assign(ABILITIES, {
  hexcurse:     { name: 'Heksenvloek',    ult: 'Grote Vervloeking', cd: 22, desc: 'Vervloekt alle vijanden in bereik: ze krijgen 6 seconden lang 50% meer schade.' },
  giftdrop:     { name: 'Cadeauregen',    ult: 'Kerstnacht',        cd: 24, desc: 'Cadeaus vallen op vijanden en ontploffen. Levert ook geld op.' },
  tsunami:      { name: 'Tsunami',        ult: 'Vloedgolf',         cd: 28, desc: 'Een enorme golf spoelt over het pad en duwt vijanden ver terug.' },
  party:        { name: 'Feestje!',       ult: 'Jubileumfeest',     cd: 30, desc: 'Vijanden in bereik dansen (verdoofd) en alle helden worden sneller.' },
  cometfall:    { name: 'Kometenregen',   ult: 'Meteorenstorm',     cd: 26, desc: 'Een regen van kometen op vijanden in een groot gebied.' },
  titanfall:    { name: 'Titanenval',     ult: 'Wereldsplijter',    cd: 24, desc: 'Springt op en slaat een schokgolf die bazen extra hard raakt.' },
  valkyrieride: { name: 'Valkyrierit',    ult: 'Walhalla',          cd: 30, desc: 'Bliksem op elke vijand op de map, extra hard op bazen.' },
  championroar: { name: 'Kampioensbrul',  ult: 'Gouden Moment',     cd: 28, desc: 'Alle helden 6 seconden 40% sneller; de Kampioen vuurt een gouden salvo.' },
});

/* ---------- Nieuwe vijanden en bazen ---------- */
const LOOK_ANTI = { skin: '#d1d5db', suit: '#111827', suit2: '#dc2626', cape: '#7f1d1d', hair: 'spiky', hairC: '#111827', mask: '#dc2626', emblem: 'bolt', weapon: 'fists' };
const LOOK_MIRROR = { skin: '#e0e7ff', suit: '#c7d2fe', suit2: '#f8fafc', cape: '#818cf8', hair: 'crown', hairC: '#e0e7ff', emblem: 'diamond', weapon: 'orb', orb: '#ffffff' };
const LOOK_WARDEN = { skin: '#a8a29e', suit: '#292524', suit2: '#a855f7', cape: '#1c1917', hair: 'hood', hairC: '#1c1917', emblem: 'void', weapon: 'staff', orb: '#a855f7' };
Object.assign(ENEMIES, {
  // event-vijanden
  spook:     { name: 'Spookje', hp: 60, speed: 1.2, armor: 0, reward: 7, r: 11, leak: 1, color: '#e9d5ff', shape: 'ghost', ghostPhase: true, event: 'halloween', desc: 'Wordt af en toe onzichtbaar en is dan niet te raken.' },
  sneeuwman: { name: 'Sneeuwpop', hp: 200, speed: 0.7, armor: 2, reward: 12, r: 14, leak: 2, color: '#f8fafc', shape: 'snowman', onDeath: 'freeze', event: 'kerst', desc: 'Bevriest helden in de buurt als hij smelt.' },
  krab:      { name: 'Pantserkrab', hp: 120, speed: 1.25, armor: 6, reward: 10, r: 12, leak: 2, color: '#ef4444', shape: 'crab', event: 'zomer', desc: 'Snel en zwaar gepantserd.' },
  feestbot:  { name: 'Feestbot', hp: 70, speed: 1.3, armor: 0, reward: 6, r: 10, leak: 1, color: '#f472b6', shape: 'bot', onDeath: 'confetti', event: 'jubileum', desc: 'Laat bij zijn dood extra geld achter.' },
  kloon:     { name: 'Schurkenkloon', hp: 110, shield: 50, speed: 1.0, armor: 1, reward: 9, r: 12, leak: 2, color: '#64748b', shape: 'mask', regenShield: true, event: 'held', desc: 'Zijn schild laadt steeds opnieuw op.' },
  // geheime vijanden
  schim:     { name: 'Schim', hp: 90, speed: 1.1, armor: 0, reward: 9, r: 11, leak: 1, color: '#6d28d9', shape: 'shade', blink: true, desc: 'Teleporteert af en toe een stuk vooruit.' },
  stormvogel:{ name: 'Stormvogel', hp: 140, speed: 1.3, armor: 2, reward: 11, r: 13, leak: 2, color: '#38bdf8', shape: 'bird', flying: true, desc: 'Sterke vliegende vijand.' },
  mutant:    { name: 'Mutant', hp: 260, speed: 0.8, armor: 3, reward: 13, r: 14, leak: 3, color: '#65a30d', shape: 'blob', regen: 0.02, desc: 'Herstelt steeds een beetje HP.' },
  // raid- en baas-hulpjes
  rotsschild:{ name: 'Rotsschild', hp: 400, speed: 0.5, armor: 8, reward: 20, r: 13, leak: 3, color: '#78716c', shape: 'rock', desc: 'Zolang hij leeft, krijgt Kolossus Rex 60% minder schade.' },
  hydrakop:  { name: 'Hydrakop', hp: 600, speed: 0.8, armor: 3, reward: 60, r: 18, leak: 8, color: '#16a34a', shape: 'serpenthead', mini: true, desc: 'Groeit uit een verslagen Hydra.' },
  spiegelbeeld: { name: 'Spiegelbeeld', hp: 300, speed: 0.6, armor: 2, reward: 15, r: 20, leak: 5, color: '#c7d2fe', shape: 'villain', look: LOOK_MIRROR, decoy: true, desc: 'Een zwakke kopie van de Spiegelkoning.' },
  // event-bazen
  pompoenkoning: { name: 'Pompoenkoning', hp: 1400, speed: 0.45, armor: 3, reward: 200, r: 26, leak: 25, color: '#f97316', boss: true, shape: 'pumpkin', abilities: ['pumpkins', 'teleport'], event: 'halloween', desc: 'Gooit pompoenen waar spookjes uit komen.' },
  krampus:   { name: 'IJsreus Krampus', hp: 1800, speed: 0.4, armor: 6, reward: 220, r: 28, leak: 30, color: '#bae6fd', boss: true, shape: 'golem', horns: true, abilities: ['freezeheroes', 'summonSnow'], event: 'kerst', desc: 'Bevriest je helden en roept sneeuwpoppen op.' },
  haai:      { name: 'Haaienkoning', hp: 1500, speed: 0.6, armor: 4, reward: 210, r: 26, leak: 25, color: '#0ea5e9', boss: true, shape: 'shark', abilities: ['submerge', 'summonCrab'], event: 'zomer', desc: 'Duikt onder en is dan niet te raken.' },
  taart:     { name: 'Taart-titan', hp: 1700, speed: 0.45, armor: 4, reward: 230, r: 28, leak: 30, color: '#f9a8d4', boss: true, shape: 'cake', abilities: ['candles', 'healpulse'], event: 'jubileum', desc: 'Heelt zichzelf en roept feestbots op.' },
  antiheld:  { name: 'Anti-Held', hp: 1600, speed: 0.55, armor: 4, reward: 220, r: 24, leak: 25, color: '#dc2626', boss: true, shape: 'villain', look: LOOK_ANTI, abilities: ['laser', 'mirror'], event: 'held', desc: 'Schakelt helden uit met zijn laserblik.' },
  // raid-bazen
  rex:       { name: 'Kolossus Rex', hp: 11000, speed: 0.3, armor: 8, reward: 800, r: 34, leak: 999, color: '#a16207', boss: true, raidBoss: true, shape: 'golem', abilities: ['rockshield', 'laser', 'enrage'], desc: 'Beschermd door rotsschilden. Vernietig die eerst!' },
  kraken:    { name: 'De Kraken', hp: 11000, speed: 0.35, armor: 6, reward: 800, r: 32, leak: 999, color: '#7c3aed', boss: true, raidBoss: true, shape: 'kraken', abilities: ['grab', 'submerge', 'enrage'], desc: 'Grijpt helden met tentakels en duikt onder.' },
  tiran:     { name: 'Mega-Tiran', hp: 14000, speed: 0.32, armor: 10, reward: 900, r: 34, leak: 999, color: '#dc2626', boss: true, raidBoss: true, shape: 'mech', abilities: ['hitshield', 'barrage', 'repair'], desc: 'Energieschild dat een aantal treffers blokkeert, ongeacht de schade.' },
  // Boss Rush (komen nergens anders voor)
  spiegelkoning: { name: 'Spiegelkoning', hp: 2000, speed: 0.5, armor: 5, reward: 250, r: 24, leak: 40, color: '#c7d2fe', boss: true, shape: 'villain', look: LOOK_MIRROR, abilities: ['mirror', 'teleport'], desc: 'Maakt spiegelbeelden van zichzelf.' },
  hydra:     { name: 'Hydra', hp: 2400, speed: 0.4, armor: 5, reward: 280, r: 28, leak: 40, color: '#16a34a', boss: true, shape: 'hydra', abilities: ['regen'], hydra: true, desc: 'Herstelt HP, en splitst in twee koppen als hij valt.' },
  tijdvreter:{ name: 'Tijdvreter', hp: 2600, speed: 0.5, armor: 6, reward: 300, r: 26, leak: 40, color: '#eab308', boss: true, shape: 'clock', abilities: ['rewind', 'dash'], desc: 'Draait zijn eigen schade terug in de tijd.' },
  chaoskoning: { name: 'Chaos-Opperheer', hp: 4200, speed: 0.4, armor: 8, reward: 500, r: 32, leak: 999, color: '#e11d48', boss: true, shape: 'crown', abilities: ['phases2', 'laser', 'summon2', 'teleport'], desc: 'De laatste baas van de Boss Rush. Gebruikt alles.' },
  // geheime bazen
  kerkermeester: { name: 'Kerkermeester', hp: 2200, speed: 0.45, armor: 7, reward: 300, r: 26, leak: 40, color: '#a855f7', boss: true, shape: 'villain', look: LOOK_WARDEN, abilities: ['summonShade', 'freezeheroes'], desc: 'Bewaker van de Schurkenkerker.' },
  stormkoning: { name: 'Stormkoning', hp: 2000, speed: 0.7, armor: 4, reward: 300, r: 26, leak: 40, color: '#0284c7', boss: true, flying: true, shape: 'bird', abilities: ['laser', 'dash'], desc: 'Heerser van de Wolkencitadel.' },
  omegachaos: { name: 'Dr. Chaos Omega', hp: 2600, speed: 0.5, armor: 5, reward: 320, r: 27, leak: 40, color: '#84cc16', boss: true, drawAs: 'chaos', abilities: ['summon2', 'repair', 'rockshield'], desc: 'Dr. Chaos met zijn allerbeste uitvindingen.' },
  // co-op
  leviathan: { name: 'Omega-Leviathan', hp: 1e9, speed: 0.33, armor: 4, reward: 0, r: 40, leak: 999, color: '#0f766e', boss: true, worldBoss: true, shape: 'kraken', abilities: ['grab', 'summonMix', 'laser'], desc: 'Wereldbaas. Alle spelers vechten samen tegen dezelfde HP-balk.' },
});

/* ---------- Thema's ---------- */
Object.assign(THEMES, {
  halloween: { ground: '#1f1b2e', g2: '#241f36', path: '#3b2f2f', edge: '#f97316', glow: true, amb: 'bats', sky: '#0b0714', label: 'Spookstad' },
  christmas: { ground: '#e8f0f8', g2: '#f1f6fb', path: '#b9c9d9', edge: '#8aa1b8', amb: 'snow', sky: '#1d2b44', label: 'Kerstdorp' },
  summer:    { ground: '#f5d68a', g2: '#f8dc95', path: '#e0b86a', edge: '#c79a4a', amb: 'sparkle', sky: '#38bdf8', label: 'Strand' },
  party:     { ground: '#2a1747', g2: '#311b53', path: '#1a0f2e', edge: '#fbbf24', glow: true, dash: 'rgba(244,114,182,.8)', amb: 'confetti', sky: '#1a0b33', label: 'Feestplein' },
  comic:     { ground: '#fef3c7', g2: '#fde68a', path: '#1f2937', edge: '#111827', dash: '#fef08a', amb: 'none', sky: '#fde68a', label: 'Stripstad' },
  dungeon:   { ground: '#1c1826', g2: '#221d2e', path: '#0f0c16', edge: '#7c3aed', glow: true, amb: 'motes', sky: '#07050c', label: 'Kerker' },
  sky:       { ground: '#bfe3ff', g2: '#cbe9ff', path: '#f8fafc', edge: '#fbbf24', amb: 'clouds', sky: '#7dd3fc', label: 'Wolken' },
  lab:       { ground: '#d7e4e8', g2: '#e0ebee', path: '#475569', edge: '#22c55e', glow: true, amb: 'bubbles', sky: '#0f172a', label: 'Laboratorium' },
  ruins:     { ground: '#8a7a5c', g2: '#94846a', path: '#5c4f3a', edge: '#3d3325', amb: 'dust', sky: '#3d3325', label: 'Ruïnes' },
  deepsea:   { ground: '#0b3a53', g2: '#0d4260', path: '#0a2a3a', edge: '#2dd4bf', glow: true, amb: 'bubbles', sky: '#021624', label: 'Diepzee' },
  factory:   { ground: '#3a3f47', g2: '#41464f', path: '#1f2328', edge: '#f59e0b', dash: 'rgba(245,158,11,.7)', amb: 'ember', sky: '#111317', label: 'Fabriek' },
});

/* ---------- Speciale maps ---------- */
const SPECIAL_MAPS = [
  // events (alleen beschikbaar tijdens het event)
  { id: 'spookstad', kind: 'event', event: 'halloween', name: 'Spookhaven', theme: 'halloween', reward: 420, hpMult: 2.0, startCash: 650, desc: 'Havenstad op Halloween. Spookjes vliegen door de straten.',
    pool: ['grunt', 'runner', 'spook', 'flyer', 'splitter', 'spook'], bosses: ['pompoenkoning', 'chaos'], finalBoss: 'pompoenkoning',
    path: [[-1, 7], [3, 7], [3, 2], [8, 2], [8, 12], [13, 12], [13, 4], [17, 4], [17, 10], [21, 10], [21, 5], [24, 5]] },
  { id: 'kerstdorp', kind: 'event', event: 'kerst', name: 'Kerstdorp', theme: 'christmas', reward: 420, hpMult: 2.0, startCash: 650, desc: 'Een besneeuwd dorp vol lichtjes, en sneeuwpoppen met slechte bedoelingen.',
    pool: ['grunt', 'sneeuwman', 'tank', 'flyer', 'healer', 'sneeuwman'], bosses: ['krampus', 'kolos'], finalBoss: 'krampus',
    path: [[12, -1], [12, 2], [3, 2], [3, 6], [20, 6], [20, 10], [4, 10], [4, 13], [24, 13]] },
  { id: 'strand', kind: 'event', event: 'zomer', name: 'Zonnestrand', theme: 'summer', reward: 420, hpMult: 2.0, startCash: 650, desc: 'Palmbomen, zandkastelen en een leger pantserkrabben.',
    pool: ['grunt', 'runner', 'krab', 'krab', 'flyer', 'shield'], bosses: ['haai', 'wyrm'], finalBoss: 'haai',
    path: [[-1, 11], [6, 11], [6, 3], [11, 3], [11, 11], [16, 11], [16, 3], [21, 3], [21, 8], [24, 8]] },
  { id: 'feestplein', kind: 'event', event: 'jubileum', name: 'Feestplein', theme: 'party', reward: 420, hpMult: 2.0, startCash: 650, desc: 'Het jubileumfeest van Heldenwacht. Iemand heeft de taart laten ontsnappen.',
    pool: ['grunt', 'runner', 'feestbot', 'feestbot', 'flyer', 'splitter'], bosses: ['taart', 'chaos'], finalBoss: 'taart',
    path: [[-1, 2], [5, 2], [5, 12], [10, 12], [10, 6], [14, 6], [14, 12], [19, 12], [19, 2], [24, 2]] },
  { id: 'stripstad', kind: 'event', event: 'held', name: 'Stripstad', theme: 'comic', reward: 420, hpMult: 2.0, startCash: 650, desc: 'Een stad recht uit een stripboek. Pas op voor de Anti-Held.',
    pool: ['grunt', 'kloon', 'kloon', 'runner', 'flyer', 'tank'], bosses: ['antiheld', 'wyrm'], finalBoss: 'antiheld',
    path: [[3, -1], [3, 5], [9, 5], [9, 1], [15, 1], [15, 9], [6, 9], [6, 13], [20, 13], [20, 6], [24, 6]] },
  // geheime maps
  { id: 'kerker', kind: 'secret', name: 'Schurkenkerker', theme: 'dungeon', reward: 560, hpMult: 2.6, startCash: 850, desc: 'De gevangenis onder Havenstad. Lang pad, maar vol schimmen.',
    pool: ['grunt', 'schim', 'schim', 'tank', 'shield', 'healer'], bosses: ['chaos', 'kerkermeester', 'kolos'], finalBoss: 'kerkermeester',
    unlock: { type: 'bosses', n: 10, text: 'Versla in totaal 10 bazen' },
    path: [[-1, 1], [21, 1], [21, 4], [2, 4], [2, 7], [21, 7], [21, 10], [2, 10], [2, 13], [24, 13]] },
  { id: 'wolken', kind: 'secret', name: 'Wolkencitadel', theme: 'sky', reward: 640, hpMult: 2.9, startCash: 900, desc: 'Een gouden fort boven de wolken. Bijna alles vliegt hier.',
    pool: ['flyer', 'stormvogel', 'stormvogel', 'runner', 'shield', 'flyer'], bosses: ['wyrm', 'stormkoning'], finalBoss: 'stormkoning',
    unlock: { type: 'challenge', id: 'luchtmeester', text: 'Voltooi de uitdaging "Luchtmeester"' },
    path: [[-1, 7], [5, 7], [5, 3], [10, 3], [10, 11], [15, 11], [15, 3], [20, 3], [20, 7], [24, 7]] },
  { id: 'lab', kind: 'secret', name: 'Het Laboratorium', theme: 'lab', reward: 720, hpMult: 3.3, startCash: 1000, desc: 'Het geheime lab van Dr. Chaos. Mutanten en proefkonijnen overal.',
    pool: ['grunt', 'mutant', 'splitter', 'healer', 'shield', 'mutant'], bosses: ['chaos', 'omegachaos'], finalBoss: 'omegachaos',
    unlock: { type: 'achievement', id: 'onverwoestbaar', text: 'Haal de achievement "Onverwoestbaar"' },
    path: [[-1, 3], [7, 3], [7, 11], [12, 11], [12, 3], [17, 3], [17, 11], [24, 11]] },
  // raids, arena, co-op
  { id: 'ruines', kind: 'raid', name: 'Titanenruïnes', theme: 'ruins', reward: 500, hpMult: 1.5, startCash: 2400, desc: '', pool: ['grunt', 'tank', 'shield', 'splitter'], bosses: ['kolos'], finalBoss: 'rex',
    path: [[-1, 4], [8, 4], [8, 10], [16, 10], [16, 4], [24, 4]] },
  { id: 'diepzee', kind: 'raid', name: 'Kraken-trog', theme: 'deepsea', reward: 560, hpMult: 1.7, startCash: 2600, desc: '', pool: ['grunt', 'krab', 'flyer', 'healer'], bosses: ['haai'], finalBoss: 'kraken',
    path: [[-1, 10], [5, 10], [5, 3], [12, 3], [12, 11], [19, 11], [19, 5], [24, 5]] },
  { id: 'fabriek', kind: 'raid', name: 'Tiranenfabriek', theme: 'factory', reward: 620, hpMult: 1.9, startCash: 2800, desc: '', pool: ['grunt', 'tank', 'shield', 'healer', 'kloon'], bosses: ['antiheld'], finalBoss: 'tiran',
    path: [[3, -1], [3, 8], [10, 8], [10, 2], [17, 2], [17, 12], [24, 12]] },
  { id: 'arena', kind: 'arena', name: 'Het Kolosseum', theme: 'ruins', reward: 400, hpMult: 1.6, startCash: 1400, desc: 'De Boss Rush-arena.', pool: ['grunt', 'runner', 'tank'], bosses: ['chaos'], finalBoss: 'chaoskoning',
    path: [[-1, 7], [4, 7], [4, 2], [12, 2], [12, 12], [20, 12], [20, 7], [24, 7]] },
  { id: 'baai', kind: 'coop', name: 'Leviathan-baai', theme: 'deepsea', reward: 300, hpMult: 2, startCash: 2200, desc: 'De co-op wereldbaas.', pool: ['grunt', 'krab', 'flyer', 'shield', 'healer'], bosses: [], finalBoss: 'leviathan',
    path: [[-1, 2], [18, 2], [18, 6], [4, 6], [4, 11], [24, 11]] },
];
const SMAP = Object.fromEntries(SPECIAL_MAPS.map(m => [m.id, m]));
const ALL_MAPS = () => MAPS.concat(SPECIAL_MAPS);
function mapById(id) { return MAPS.find(m => m.id === id) || SMAP[id]; }

/* ---------- Tekenwerk: thema-details, props en nieuwe vijandvormen ---------- */
const THEME_EXTRA = {
  halloween: {
    ground(ctx, x, y, i) { if (i % 2) { ctx.fillStyle = 'rgba(124,58,237,.18)'; ctx.beginPath(); ctx.ellipse(x, y, 14, 5, 0, 0, TAU); ctx.fill(); } else { ctx.strokeStyle = 'rgba(163,230,53,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 4); ctx.stroke(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.45) { ctx.fillStyle = '#4b5563'; rr(ctx, cx - 9, cy - 12, 18, 24, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#374151'; ctx.fillRect(cx - 5, cy - 4, 10, 2); ctx.fillRect(cx - 1, cy - 8, 2, 10); }
      else if (v < 0.75) { ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy + 14); ctx.lineTo(cx, cy - 6); ctx.lineTo(cx - 10, cy - 14); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + 9, cy - 12); ctx.moveTo(cx + 4, cy - 7); ctx.lineTo(cx + 12, cy - 6); ctx.stroke(); }
      else { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 12, 9, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 3, cy - 3); ctx.lineTo(cx - 1, cy); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + 1, cy); ctx.lineTo(cx + 4, cy - 3); ctx.lineTo(cx + 6, cy); ctx.fill(); ctx.fillRect(cx - 5, cy + 4, 10, 2); ctx.fillStyle = '#15803d'; ctx.fillRect(cx - 1, cy - 10, 3, 4); }
    } },
  christmas: {
    ground(ctx, x, y, i) { if (i % 5 === 0) { ctx.fillStyle = ['#ef4444', '#facc15', '#22c55e', '#60a5fa'][i % 4]; circle(ctx, x, y, 2); ctx.fill(); } else { ctx.fillStyle = 'rgba(148,170,196,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 9, 3, 0, 0, TAU); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.5) { for (let i = 0; i < 3; i++) { const w = 15 - i * 4, y = cy + 10 - i * 9; ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx, y - 13); ctx.lineTo(cx + w, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#ef4444', '#facc15', '#60a5fa'][i % 3]; circle(ctx, cx + (rng() - 0.5) * 18, cy + rng() * 18 - 8, 1.8); ctx.fill(); } ctx.fillStyle = '#facc15'; drawEmblem(ctx, 'star', 0, '#facc15'); ctx.save(); ctx.translate(cx, cy - 16); drawEmblem(ctx, 'star', 4, '#facc15'); ctx.restore(); }
      else if (v < 0.8) { ctx.fillStyle = '#b45309'; ctx.fillRect(cx - 14, cy - 4, 28, 18); ctx.strokeRect(cx - 14, cy - 4, 28, 18); ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(cx - 17, cy - 3); ctx.lineTo(cx, cy - 16); ctx.lineTo(cx + 17, cy - 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fde68a'; ctx.fillRect(cx - 4, cy + 2, 8, 7); }
      else { ctx.fillStyle = ['#dc2626', '#2563eb', '#16a34a'][Math.floor(rng() * 3)]; ctx.fillRect(cx - 9, cy - 6, 18, 16); ctx.strokeRect(cx - 9, cy - 6, 18, 16); ctx.fillStyle = '#facc15'; ctx.fillRect(cx - 2, cy - 6, 4, 16); ctx.fillRect(cx - 9, cy, 18, 3); }
    } },
  summer: {
    ground(ctx, x, y, i) { if (i % 6 === 0) { ctx.fillStyle = '#fda4af'; ctx.beginPath(); ctx.arc(x, y, 3, Math.PI, 0); ctx.fill(); } else { ctx.fillStyle = 'rgba(180,130,60,.18)'; circle(ctx, x, y, 1.5); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.5) { ctx.strokeStyle = '#92400e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 4, cy + 14); ctx.quadraticCurveTo(cx + 2, cy, cx, cy - 10); ctx.stroke(); ctx.fillStyle = '#16a34a'; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.7; ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.quadraticCurveTo(cx + Math.cos(a) * 10, cy - 10 + Math.sin(a) * 10 - 4, cx + Math.cos(a) * 16, cy - 10 + Math.sin(a) * 12 + 4); ctx.quadraticCurveTo(cx + Math.cos(a) * 8, cy - 8 + Math.sin(a) * 6, cx, cy - 10); ctx.fill(); ctx.stroke(); } }
      else if (v < 0.78) { ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy - 6); ctx.stroke(); const cols = ['#ef4444', '#f8fafc']; for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.arc(cx, cy - 6, 16, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); } }
      else { ctx.fillStyle = '#eab308'; ctx.fillRect(cx - 12, cy - 2, 24, 12); ctx.fillRect(cx - 9, cy - 10, 6, 8); ctx.fillRect(cx + 3, cy - 10, 6, 8); ctx.strokeRect(cx - 12, cy - 2, 24, 12); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(cx + 6, cy - 10); ctx.lineTo(cx + 6, cy - 18); ctx.lineTo(cx + 12, cy - 15); ctx.closePath(); ctx.fill(); }
    } },
  party: {
    ground(ctx, x, y, i) { ctx.fillStyle = ['#f472b6', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa'][i % 5]; ctx.fillRect(x, y, 3, 2); },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.55) { for (let i = 0; i < 3; i++) { const bx = cx - 8 + i * 8, by = cy - 8 - (i % 2) * 5, c = ['#f472b6', '#fbbf24', '#60a5fa'][i]; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + 9); ctx.lineTo(cx, cy + 14); ctx.stroke(); ctx.fillStyle = c; ctx.strokeStyle = EDGE; ctx.beginPath(); ctx.ellipse(bx, by, 6, 8, 0, 0, TAU); ctx.fill(); ctx.stroke(); } }
      else if (v < 0.8) { ctx.fillStyle = '#a78bfa'; ctx.fillRect(cx - 11, cy - 8, 22, 20); ctx.strokeRect(cx - 11, cy - 8, 22, 20); ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 2, cy - 8, 4, 20); ctx.beginPath(); ctx.ellipse(cx - 5, cy - 11, 5, 3, -0.4, 0, TAU); ctx.ellipse(cx + 5, cy - 11, 5, 3, 0.4, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy - 10); ctx.stroke(); const g = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#94a3b8'); ctx.fillStyle = g; circle(ctx, cx, cy, 10); ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.35)'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx - 10, cy + i * 4); ctx.lineTo(cx + 10, cy + i * 4); ctx.stroke(); } }
    } },
  comic: {
    ground(ctx, x, y, i) { ctx.fillStyle = 'rgba(234,88,12,.18)'; for (let k = 0; k < 4; k++) { circle(ctx, x + (k % 2) * 6, y + Math.floor(k / 2) * 6, 1.6); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.7) { const c = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7'][Math.floor(rng() * 4)]; ctx.lineWidth = 3; ctx.fillStyle = c; ctx.fillRect(cx - 16, cy - 16, 32, 32); ctx.strokeRect(cx - 16, cy - 16, 32, 32); ctx.fillStyle = '#fef9c3'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - 11 + (i % 2) * 13, cy - 11 + Math.floor(i / 2) * 13, 9, 9); ctx.lineWidth = 1.5; }
      else { ctx.fillStyle = '#facc15'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 9 : 17; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#dc2626'; ctx.font = "9px Bungee, Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['POW', 'BAM', 'ZAP'][Math.floor(rng() * 3)], cx, cy + 1); }
    } },
  dungeon: {
    ground(ctx, x, y, i) { if (i % 7 === 0) { ctx.fillStyle = 'rgba(231,229,228,.35)'; circle(ctx, x, y, 3); ctx.fill(); ctx.fillStyle = '#0f0c16'; circle(ctx, x - 1, y - 0.5, 0.8); circle(ctx, x + 1, y - 0.5, 0.8); ctx.fill(); } else { ctx.strokeStyle = 'rgba(124,58,237,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 4); ctx.lineTo(x + 4, y + 10); ctx.stroke(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.5) { ctx.fillStyle = '#3f3a4d'; ctx.fillRect(cx - 9, cy - 16, 18, 32); ctx.strokeRect(cx - 9, cy - 16, 18, 32); ctx.fillStyle = '#2a2537'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - 9, cy - 12 + i * 8, 18, 1.5); }
      else if (v < 0.8) { ctx.strokeStyle = '#71717a'; ctx.lineWidth = 2; ctx.strokeRect(cx - 12, cy - 12, 24, 24); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 12 + i * 6, cy - 12); ctx.lineTo(cx - 12 + i * 6, cy + 12); ctx.stroke(); } }
      else { ctx.fillStyle = '#57534e'; ctx.fillRect(cx - 2, cy - 4, 4, 16); ctx.save(); ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14; ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.quadraticCurveTo(cx + 6, cy - 8, cx, cy - 4); ctx.quadraticCurveTo(cx - 6, cy - 8, cx, cy - 16); ctx.fill(); ctx.restore(); }
    } },
  sky: {
    ground(ctx, x, y) { ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(ctx, x, y, 5); circle(ctx, x + 5, y + 1, 4); circle(ctx, x - 5, y + 1, 3.5); ctx.fill(); },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.55) { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(148,163,184,.8)'; for (const [dx, dy, r] of [[-8, 3, 9], [2, -2, 11], [10, 4, 8]]) { circle(ctx, cx + dx, cy + dy, r); ctx.fill(); } ctx.beginPath(); ctx.ellipse(cx, cy + 6, 18, 6, 0, 0, Math.PI); ctx.stroke(); }
      else { ctx.fillStyle = '#fde68a'; ctx.fillRect(cx - 6, cy - 14, 12, 28); ctx.strokeRect(cx - 6, cy - 14, 12, 28); ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 9, cy - 16, 18, 4); ctx.fillRect(cx - 9, cy + 12, 18, 4); }
    } },
  lab: {
    ground(ctx, x, y, i) { if (i < 50) { ctx.strokeStyle = 'rgba(71,85,105,.18)'; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(x / TILE) * TILE + 0.5, Math.floor(y / TILE) * TILE + 0.5, TILE - 1, TILE - 1); } else if (i % 5 === 0) { ctx.fillStyle = 'rgba(34,197,94,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 4, 0.3, 0, TAU); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.55) { ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx - 10, cy + 8, 20, 6); ctx.strokeRect(cx - 10, cy + 8, 20, 6); ctx.fillStyle = 'rgba(134,239,172,.75)'; rr(ctx, cx - 8, cy - 14, 16, 22, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4ade80'; circle(ctx, cx - 2, cy - 4, 2); circle(ctx, cx + 3, cy - 9, 1.5); ctx.fill(); }
      else if (v < 0.8) { ctx.fillStyle = '#334155'; ctx.fillRect(cx - 14, cy - 8, 28, 18); ctx.strokeRect(cx - 14, cy - 8, 28, 18); ctx.fillStyle = '#22d3ee'; ctx.fillRect(cx - 10, cy - 5, 12, 8); ctx.fillStyle = ['#ef4444', '#22c55e', '#facc15'][Math.floor(rng() * 3)]; circle(ctx, cx + 8, cy - 1, 2.5); ctx.fill(); }
      else { ctx.fillStyle = '#facc15'; ctx.fillRect(cx - 9, cy - 12, 18, 24); ctx.strokeRect(cx - 9, cy - 12, 18, 24); ctx.fillStyle = EDGE; ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 6, cy + 5); ctx.lineTo(cx - 6, cy + 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.fillRect(cx - 1, cy - 3, 2, 5); }
    } },
  ruins: {
    ground(ctx, x, y, i) { if (i % 3) { ctx.strokeStyle = 'rgba(61,51,37,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y + 3); ctx.stroke(); } else { ctx.strokeStyle = 'rgba(101,163,13,.4)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.stroke(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.5) { ctx.fillStyle = '#d6cfc0'; const h = 14 + rng() * 14; ctx.fillRect(cx - 7, cy + 12 - h, 14, h); ctx.strokeRect(cx - 7, cy + 12 - h, 14, h); ctx.fillStyle = '#b8ad97'; for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * 4 - 0.5, cy + 12 - h, 1, h); ctx.fillStyle = '#c9c0ad'; ctx.fillRect(cx - 10, cy + 10, 20, 5); ctx.strokeRect(cx - 10, cy + 10, 20, 5); }
      else { ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.moveTo(cx - 14, cy + 10); ctx.lineTo(cx - 8, cy - 8); ctx.lineTo(cx + 6, cy - 10); ctx.lineTo(cx + 14, cy + 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } },
  deepsea: {
    ground(ctx, x, y, i) { if (i % 2) { ctx.strokeStyle = 'rgba(45,212,191,.12)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } else { ctx.fillStyle = 'rgba(94,234,212,.15)'; circle(ctx, x, y, 1.5); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.45) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 6, cy + 14); ctx.quadraticCurveTo(cx + i * 6 + 6, cy, cx + i * 6 - 2, cy - 14); ctx.stroke(); } }
      else if (v < 0.8) { const c = ['#f472b6', '#fb923c', '#a78bfa'][Math.floor(rng() * 3)]; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy - 2); ctx.lineTo(cx - 8, cy - 10); ctx.moveTo(cx, cy + 2); ctx.lineTo(cx + 8, cy - 8); ctx.moveTo(cx - 4, cy - 6); ctx.lineTo(cx - 4, cy - 14); ctx.stroke(); ctx.lineCap = 'butt'; }
      else { ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.moveTo(cx - 16, cy + 8); ctx.lineTo(cx - 10, cy - 6); ctx.lineTo(cx + 12, cy - 2); ctx.lineTo(cx + 16, cy + 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0a2a3a'; circle(ctx, cx - 2, cy + 1, 3); circle(ctx, cx + 6, cy + 2, 3); ctx.fill(); }
    } },
  factory: {
    ground(ctx, x, y, i) { if (i % 4 === 0) { ctx.fillStyle = 'rgba(148,163,184,.3)'; circle(ctx, x, y, 1.5); circle(ctx, x + 8, y, 1.5); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.45) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rng()); ctx.fillStyle = '#71717a'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 12 : 15; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#3a3f47'; circle(ctx, 0, 0, 5); ctx.fill(); ctx.restore(); }
      else if (v < 0.75) { ctx.fillStyle = '#92400e'; ctx.fillRect(cx - 12, cy - 12, 24, 24); ctx.strokeRect(cx - 12, cy - 12, 24, 24); ctx.strokeStyle = '#78350f'; ctx.beginPath(); ctx.moveTo(cx - 12, cy - 12); ctx.lineTo(cx + 12, cy + 12); ctx.moveTo(cx + 12, cy - 12); ctx.lineTo(cx - 12, cy + 12); ctx.stroke(); }
      else { ctx.fillStyle = '#52525b'; ctx.fillRect(cx - 7, cy - 16, 14, 30); ctx.strokeRect(cx - 7, cy - 16, 14, 30); ctx.fillStyle = '#f59e0b'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 7, cy - 12 + i * 9, 14, 3); }
    } },
};

/* Nieuwe vijandvormen */
function drawShape(ctx, e, t) {
  const E = e.E, r = e.r, c = E.color;
  ctx.strokeStyle = EDGE; ctx.lineWidth = 2;
  switch (E.shape) {
    case 'ghost': {
      ctx.globalAlpha *= e.ghost ? 0.3 : 0.9; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -r * 0.2, r, Math.PI, 0);
      for (let i = 0; i <= 4; i++) { const x = r - i * r / 2; ctx.lineTo(x, r * 0.8 + Math.sin(t * 8 + i) * 2 * (i % 2 ? 1 : -1)); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.ellipse(r * 0.1, -r * 0.3, r * 0.18, r * 0.28, 0, 0, TAU); ctx.ellipse(r * 0.55, -r * 0.3, r * 0.16, r * 0.26, 0, 0, TAU); ctx.fill(); break; }
    case 'snowman':
      ctx.fillStyle = c; circle(ctx, 0, r * 0.35, r * 0.75); ctx.fill(); ctx.stroke(); circle(ctx, 0, -r * 0.55, r * 0.55); ctx.fill(); ctx.stroke();
      ctx.fillStyle = EDGE; circle(ctx, r * 0.1, -r * 0.65, r * 0.08); circle(ctx, r * 0.35, -r * 0.65, r * 0.08); ctx.fill(); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.8, -r * 0.45); ctx.lineTo(r * 0.3, -r * 0.4); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.fillRect(-r * 0.4, -r * 1.25, r * 0.8, r * 0.18); ctx.fillRect(-r * 0.28, -r * 1.65, r * 0.56, r * 0.42); break;
    case 'crab':
      ctx.strokeStyle = shade(c, -0.3); ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * r * 0.5, i * r * 0.25); ctx.lineTo(sd * r * 1.1, i * r * 0.35 + Math.sin(t * 16 + i) * 2); ctx.stroke(); }
      ctx.fillStyle = c; ctx.strokeStyle = EDGE; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.6, sd * r * 0.75, r * 0.32, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#fff'; circle(ctx, r * 0.35, -r * 0.2, r * 0.13); circle(ctx, r * 0.35, r * 0.2, r * 0.13); ctx.fill(); break;
    case 'bot':
      ctx.fillStyle = c; rr(ctx, -r * 0.85, -r * 0.8, r * 1.7, r * 1.6, r * 0.4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f2937'; rr(ctx, -r * 0.55, -r * 0.5, r * 1.1, r * 0.7, 3); ctx.fill(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.25, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = EDGE; ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, -r * 1.2); ctx.stroke(); ctx.fillStyle = ['#fde047', '#60a5fa', '#34d399'][Math.floor(t * 4) % 3]; circle(ctx, 0, -r * 1.25, r * 0.18); ctx.fill(); break;
    case 'mask':
      ctx.fillStyle = c; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111827'; rr(ctx, -r * 0.1, -r * 0.45, r * 1.0, r * 0.35, r * 0.15); ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, r * 0.18, -r * 0.28, r * 0.09); circle(ctx, r * 0.6, -r * 0.28, r * 0.09); ctx.fill();
      if (e.shield > 0) { ctx.strokeStyle = rgba('#94a3b8', 0.8); ctx.lineWidth = 2; circle(ctx, 0, 0, r * 1.35); ctx.stroke(); } break;
    case 'shade': {
      ctx.globalAlpha *= 0.85 + Math.sin(t * 6) * 0.1; const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.3); g.addColorStop(0, shade(c, 0.2)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; circle(ctx, 0, 0, r * 1.3); ctx.fill();
      ctx.fillStyle = shade(c, -0.4); ctx.beginPath(); ctx.moveTo(r, 0); ctx.quadraticCurveTo(0, -r * 1.2, -r * 1.6, Math.sin(t * 5) * 4); ctx.quadraticCurveTo(0, r * 1.2, r, 0); ctx.fill();
      ctx.fillStyle = '#e9d5ff'; circle(ctx, r * 0.35, -r * 0.15, r * 0.14); circle(ctx, r * 0.7, -r * 0.15, r * 0.12); ctx.fill(); break; }
    case 'bird': {
      const w = Math.sin(t * 10) * 0.6, big = e.boss ? 1.2 : 1;
      ctx.fillStyle = shade(c, 0.25); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(-r * 0.6 * big, sd * r * (1.5 + w)); ctx.lineTo(r * 0.4, sd * r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.15); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 0.9, r * 0.15); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, r * 0.55, -r * 0.18, r * 0.12); ctx.fill();
      if (e.boss) { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.5); ctx.lineTo(-r * 0.1, -r * 0.95); ctx.lineTo(r * 0.1, -r * 0.65); ctx.lineTo(r * 0.3, -r * 0.95); ctx.lineTo(r * 0.4, -r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); } break; }
    case 'blob': {
      const wob = Math.sin(t * 4) * r * 0.08; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r + wob, r - wob, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, 0.3); for (const [x, y, s] of [[-0.4, 0.3, 0.2], [-0.1, 0.55, 0.14], [-0.55, -0.2, 0.16]]) { circle(ctx, x * r, y * r, s * r); ctx.fill(); }
      ctx.fillStyle = '#fef9c3'; circle(ctx, r * 0.35, -r * 0.2, r * 0.32); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b91c1c'; circle(ctx, r * 0.45, -r * 0.2, r * 0.13); ctx.fill(); break; }
    case 'rock':
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-r, r * 0.6); ctx.lineTo(-r * 0.8, -r * 0.5); ctx.lineTo(-r * 0.1, -r); ctx.lineTo(r * 0.8, -r * 0.6); ctx.lineTo(r, r * 0.5); ctx.lineTo(r * 0.2, r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, TAU); ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, r * 0.4); ctx.stroke(); ctx.restore(); break;
    case 'serpenthead':
      ctx.fillStyle = shade(c, -0.2); ctx.beginPath(); ctx.ellipse(-r * 0.6, 0, r * 0.7, r * 0.45, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.6); ctx.quadraticCurveTo(r * 1.2, -r * 0.5, r * 1.1, 0); ctx.lineTo(r * 0.4, r * 0.1); ctx.lineTo(r * 1.0, r * 0.5); ctx.quadraticCurveTo(0, r * 0.8, -r * 0.3, r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fde047'; circle(ctx, r * 0.35, -r * 0.3, r * 0.12); ctx.fill(); break;
    case 'pumpkin': {
      ctx.fillStyle = c; for (const dx of [-0.5, 0.5, 0]) { ctx.beginPath(); ctx.ellipse(dx * r, 0, r * 0.62, r * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.save(); ctx.shadowColor = '#fde047'; ctx.shadowBlur = 12; ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.2); ctx.lineTo(-r * 0.2, -r * 0.5); ctx.lineTo(-r * 0.05, -r * 0.2); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.2); ctx.lineTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.5, -r * 0.2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.2); for (let i = 0; i <= 6; i++) ctx.lineTo(-r * 0.5 + i * r / 6, r * 0.2 + (i % 2 ? r * 0.2 : 0)); ctx.lineTo(r * 0.5, r * 0.45); ctx.lineTo(-r * 0.5, r * 0.45); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.8); ctx.lineTo(-r * 0.3, -r * 1.25); ctx.lineTo(-r * 0.1, -r * 0.95); ctx.lineTo(0, -r * 1.35); ctx.lineTo(r * 0.1, -r * 0.95); ctx.lineTo(r * 0.3, -r * 1.25); ctx.lineTo(r * 0.4, -r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); break; }
    case 'golem': {
      const sw = Math.sin(t * 2) * r * 0.12; ctx.fillStyle = shade(c, -0.15);
      rr(ctx, -r * 0.85, -r * 0.7, r * 1.7, r * 1.6, r * 0.25); ctx.fill(); ctx.stroke(); ctx.fillStyle = c; rr(ctx, -r * 0.5, -r * 1.25, r, r * 0.65, r * 0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, -0.3); circle(ctx, -r * 1.05, r * 0.1 + sw, r * 0.38); ctx.fill(); ctx.stroke(); circle(ctx, r * 1.05, r * 0.1 - sw, r * 0.38); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.fillStyle = E.horns ? '#38bdf8' : '#fb923c'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; circle(ctx, -r * 0.18, -r * 0.95, r * 0.09); circle(ctx, r * 0.2, -r * 0.95, r * 0.09); ctx.fill(); ctx.restore();
      if (E.horns) { ctx.fillStyle = '#e0f2fe'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * r * 0.35, -r * 1.2); ctx.quadraticCurveTo(sd * r * 0.9, -r * 1.5, sd * r * 0.75, -r * 1.9); ctx.quadraticCurveTo(sd * r * 0.6, -r * 1.45, sd * r * 0.15, -r * 1.25); ctx.fill(); ctx.stroke(); } }
      if (e.dmgRed > 0) { ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 30; circle(ctx, 0, -r * 0.2, r * 1.6); ctx.stroke(); ctx.restore(); }
      break; }
    case 'shark':
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.quadraticCurveTo(r * 0.3, -r * 0.8, -r * 1.1, -r * 0.1); ctx.lineTo(-r * 1.5, -r * 0.6); ctx.lineTo(-r * 1.3, 0); ctx.lineTo(-r * 1.5, r * 0.6); ctx.lineTo(-r * 1.1, r * 0.1); ctx.quadraticCurveTo(r * 0.3, r * 0.8, r * 1.3, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.5); ctx.lineTo(-r * 0.5, -r * 1.2); ctx.lineTo(r * 0.3, -r * 0.55); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.15); for (let i = 0; i < 5; i++) ctx.lineTo(r * 0.6 + i * r * 0.12 + r * 0.06, r * (i % 2 ? 0.15 : 0.3)); ctx.lineTo(r * 1.2, r * 0.1); ctx.fill(); circle(ctx, r * 0.75, -r * 0.2, r * 0.1); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.55); ctx.lineTo(r * 0.2, -r * 0.95); ctx.lineTo(r * 0.35, -r * 0.7); ctx.lineTo(r * 0.5, -r * 0.95); ctx.lineTo(r * 0.55, -r * 0.5); ctx.fill(); ctx.stroke(); break;
    case 'cake': {
      const tiers = [[1, 0.35, '#fbcfe8'], [0.78, -0.2, '#f9a8d4'], [0.55, -0.7, '#fce7f3']];
      for (const [w, y, col] of tiers) { ctx.fillStyle = col; rr(ctx, -r * w, r * y - r * 0.28, r * w * 2, r * 0.56, r * 0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) circle(ctx, -r * w + (i + 0.5) * r * w / 2, r * y - r * 0.26, r * 0.1); ctx.fill(); }
      for (let i = -1; i <= 1; i++) { ctx.fillStyle = '#60a5fa'; ctx.fillRect(i * r * 0.3 - 2, -r * 1.25, 4, r * 0.3); ctx.save(); ctx.fillStyle = '#fde047'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(i * r * 0.3, -r * 1.32 + Math.sin(t * 12 + i) * 1, 2.5, 4.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = EDGE; circle(ctx, -r * 0.2, -r * 0.25, r * 0.08); circle(ctx, r * 0.2, -r * 0.25, r * 0.08); ctx.fill(); break; }
    case 'villain': {
      const pseudo = { look: E.look, style: 'melee', upgrades: [] }, s = r / 15;
      ctx.save(); if (E.decoy) ctx.globalAlpha *= 0.55 + Math.sin(t * 8) * 0.15;
      ctx.fillStyle = rgba(c, 0.25); circle(ctx, 0, -4 * s, r * 1.1); ctx.fill();
      drawHero(ctx, pseudo, 0, 4 * s, s, t, { tier: e.boss && !E.decoy ? 4 : 0, atk: Math.max(0, Math.sin(t * 3)), ang: e.dir || 0 }); ctx.restore(); break; }
    case 'kraken': {
      ctx.strokeStyle = shade(c, -0.2); ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8, w = Math.sin(t * 3 + i) * 0.4; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 + r * 0.2); ctx.quadraticCurveTo(Math.cos(a + w) * r * 1.3, Math.sin(a + w) * r * 1.3 + r * 0.2, Math.cos(a - w) * r * 1.7, Math.sin(a - w) * r * 1.5 + r * 0.3); ctx.stroke(); }
      ctx.lineCap = 'butt'; ctx.lineWidth = 2; ctx.strokeStyle = EDGE; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.9, r * 1.05, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, 0.35); circle(ctx, -r * 0.35, -r * 0.7, r * 0.12); circle(ctx, r * 0.1, -r * 0.9, r * 0.09); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.05, r * 0.2, r * 0.15, 0, 0, TAU); ctx.ellipse(r * 0.3, -r * 0.05, r * 0.2, r * 0.15, 0, 0, TAU); ctx.fill(); ctx.fillStyle = EDGE; ctx.fillRect(-r * 0.33, -r * 0.14, r * 0.06, r * 0.18); ctx.fillRect(r * 0.27, -r * 0.14, r * 0.06, r * 0.18); break; }
    case 'mech': {
      ctx.fillStyle = '#27272a'; rr(ctx, -r * 1.0, r * 0.45, r * 2.0, r * 0.5, r * 0.2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#52525b'; for (let i = 0; i < 5; i++) circle(ctx, -r * 0.8 + i * r * 0.4, r * 0.7, r * 0.12); ctx.fill();
      ctx.fillStyle = c; rr(ctx, -r * 0.85, -r * 0.8, r * 1.7, r * 1.3, r * 0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#18181b'; rr(ctx, -r * 0.5, -r * 1.3, r, r * 0.55, r * 0.12); ctx.fill(); ctx.stroke(); ctx.save(); ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 10; ctx.fillRect(-r * 0.35, -r * 1.12, r * 0.7, r * 0.14); ctx.restore();
      ctx.fillStyle = '#3f3f46'; for (const sd of [-1, 1]) { rr(ctx, sd > 0 ? r * 0.8 : -r * 1.45, -r * 0.5, r * 0.65, r * 0.4, 3); ctx.fill(); ctx.stroke(); }
      if (e.hitShield > 0) { ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = 'rgba(56,189,248,.12)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t * 0.5; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = '#e0f2fe'; ctx.font = "700 14px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center'; ctx.fillText(String(e.hitShield), 0, -r * 1.6); ctx.restore(); }
      break; }
    case 'hydra': {
      ctx.fillStyle = shade(c, -0.15); ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.2, r * 0.95, r * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = -1; i <= 1; i++) { const sw = Math.sin(t * 3 + i) * r * 0.12; ctx.strokeStyle = c; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.2, r * 0.1 + i * r * 0.25); ctx.quadraticCurveTo(r * 0.6, i * r * 0.6 - r * 0.3, r * 0.95 + sw, i * r * 0.75 - r * 0.2); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = c; ctx.strokeStyle = EDGE; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r * 1.05 + sw, i * r * 0.75 - r * 0.2, r * 0.3, r * 0.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fde047'; circle(ctx, r * 1.12 + sw, i * r * 0.75 - r * 0.27, r * 0.06); ctx.fill(); }
      break; }
    case 'clock': {
      ctx.strokeStyle = EDGE; ctx.lineWidth = 3; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * r * 0.4, r * 0.6); ctx.lineTo(sd * r * 0.55, r * 1.05 + Math.sin(t * 8 + sd) * 3); ctx.stroke(); }
      ctx.lineWidth = 2; ctx.fillStyle = c; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fef9c3'; circle(ctx, 0, 0, r * 0.78); ctx.fill();
      ctx.strokeStyle = EDGE; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65); ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * (e.rewindT > 0 ? -12 : 2)) * r * 0.6, Math.sin(t * (e.rewindT > 0 ? -12 : 2)) * r * 0.6); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 0.3) * r * 0.4, Math.sin(t * 0.3) * r * 0.4); ctx.stroke();
      ctx.fillStyle = '#b91c1c'; circle(ctx, -r * 0.25, -r * 0.3, r * 0.1); circle(ctx, r * 0.25, -r * 0.3, r * 0.1); ctx.fill(); break; }
    case 'crown': {
      ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 24; ctx.fillStyle = '#1c0510'; circle(ctx, 0, 0, r); ctx.fill(); ctx.restore(); ctx.strokeStyle = c; ctx.lineWidth = 3; circle(ctx, 0, 0, r); ctx.stroke();
      ctx.strokeStyle = rgba('#fb7185', 0.8); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (1.25 + i * 0.15), t * (1.5 + i) + i, t * (1.5 + i) + i + 2); ctx.stroke(); }
      ctx.fillStyle = '#fecdd3'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.05, r * 0.2, r * 0.12, 0, 0, TAU); ctx.ellipse(r * 0.3, -r * 0.05, r * 0.2, r * 0.12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c; ctx.strokeStyle = EDGE; ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.7); ctx.lineTo(-r * 0.55, -r * 1.4); ctx.lineTo(-r * 0.25, -r * 0.95); ctx.lineTo(0, -r * 1.55); ctx.lineTo(r * 0.25, -r * 0.95); ctx.lineTo(r * 0.55, -r * 1.4); ctx.lineTo(r * 0.7, -r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (e.shield > 0) { ctx.strokeStyle = rgba('#fda4af', 0.7); ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = t * 30; circle(ctx, 0, 0, r * 1.8); ctx.stroke(); ctx.setLineDash([]); } break; }
    default: ctx.fillStyle = c; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); eyes(ctx, r, '#fff');
  }
}
