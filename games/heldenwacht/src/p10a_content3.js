/* =====================================================================
   UITBREIDING 3 — Secret-rarity, wereld 2, nieuwe moeilijkheden, helden,
   vijanden, bazen, traits, gacha's, gems, shop, dungeon en collectie
   ===================================================================== */
RARITY_ORDER.push('secret');
RARITIES.secret = { label: 'Secret', color: '#f5f5f5', dupe: 15000, lvl: 3500, cap: 1 };
STAT_DEFAULTS.detect = false; STAT_DEFAULTS.echo = 0; STAT_DEFAULTS.erase = 0; STAT_DEFAULTS.pctMax = 0; STAT_DEFAULTS.corrode = 0;

/* ---------- Nieuwe helden ---------- */
const NEW_HEROES_3 = [
  { id: 'stuiter', name: 'Stuiterbal', rarity: 'common', role: 'Snelle aanvallen', title: 'Nooit stil te krijgen', style: 'projectile', cost: 130,
    desc: 'Rubberen ballen die van vijand naar vijand stuiteren.', base: { dmg: 7, range: 2.6, rate: 1.6, pierce: 3, air: true, projSpeed: 14 },
    look: { skin: '#f1c27d', suit: '#e11d48', suit2: '#fde047', cape: null, hair: 'cap', hairC: '#2563eb', emblem: 'ring', weapon: 'orb', orb: '#fb7185' }, fx: 'dust', proj: 'ball', ability: 'megabounce',
    upgrades: [U('Hardere Ballen', 90, '+3 schade', { dmg: 3 }), U('Extra Stuiter', 160, 'Stuitert naar 2 extra vijanden', { pierce: 2 }), U('Dubbele Worp', 300, 'Gooit 2 ballen tegelijk', { multi: 1 }, true), U('Superrubber', 500, '+5 schade, +0.4 snelheid', { dmg: 5, rate: 0.4 }), U('Stuiterkoning', 1000, '+8 schade, +3 stuiters. ULTIMATE', { dmg: 8, pierce: 3 }, true)] },
  { id: 'lasso', name: 'Lassoheld', rarity: 'common', role: 'Controle', title: 'Snelste touw van het westen', style: 'projectile', cost: 140,
    desc: 'Vangt vijanden met zijn lasso en trekt ze een stukje terug.', base: { dmg: 9, range: 2.4, rate: 0.9, knock: 0.25, slow: 0.25, slowDur: 1, air: false, projSpeed: 14 },
    look: { skin: '#c68642', suit: '#92400e', suit2: '#fde68a', cape: null, hair: 'cap', hairC: '#78350f', emblem: 'star', weapon: 'orb', orb: '#fde68a' }, fx: 'dust', proj: 'rope', ability: 'lassopull',
    upgrades: [U('Stevig Touw', 90, '+4 schade', { dmg: 4 }), U('Lange Lasso', 150, '+0.6 bereik', { range: 0.6 }), U('Dubbele Lasso', 300, 'Vangt 2 vijanden, sterkere trek', { multi: 1, knock: 0.15 }, true), U('Vliegende Vangst', 480, 'Vangt ook vliegende vijanden, +0.3 snelheid', { air: true, rate: 0.3 }), U('Rodeokampioen', 950, '+12 schade, +15% vertraging. ULTIMATE', { dmg: 12, slow: 0.15 }, true)] },
  { id: 'bij', name: 'Bijenkoningin', rarity: 'uncommon', role: 'Snelle aanvallen', title: 'Heerst over de zwerm', style: 'projectile', cost: 250,
    desc: 'Stuurt zwermen bijen op 3 doelen die gif achterlaten.', base: { dmg: 5, range: 2.8, rate: 1.6, multi: 3, burn: 6, air: true, projSpeed: 12 },
    look: { skin: '#fde7c8', suit: '#facc15', suit2: '#1c1917', cape: null, hair: 'crown', hairC: '#fbbf24', emblem: 'hex', weapon: 'orb', orb: '#fde047', wings: true }, fx: 'leaf', proj: 'bee', ability: 'swarm',
    upgrades: [U('Scherpe Angels', 140, '+2 schade, +4 gif', { dmg: 2, burn: 4 }), U('Grotere Zwerm', 240, '+1 doel', { multi: 1 }), U('Koninklijke Gelei', 450, '+0.5 snelheid, +6 gif', { rate: 0.5, burn: 6 }, true), U('Hoornaars', 650, '+4 schade, +0.4 bereik', { dmg: 4, range: 0.4 }), U('Zwermkoningin', 1250, '+2 doelen, +10 gif. ULTIMATE', { multi: 2, burn: 10 }, true)] },
  { id: 'magneet', name: 'Magnetron', rarity: 'uncommon', role: 'Controle', title: 'Aantrekkelijk gevaarlijk', style: 'aura', cost: 240,
    desc: 'Magnetische pulsen die vijanden vertragen en hun pantser uit elkaar trekken.', base: { dmg: 8, range: 2.1, rate: 0.9, slow: 0.25, slowDur: 1, shred: 3, air: true },
    look: { skin: '#e0ac69', suit: '#dc2626', suit2: '#94a3b8', cape: null, hair: 'helmet', hairC: '#475569', emblem: 'ring', weapon: 'none' }, fx: 'spark', ability: 'magnetpull',
    upgrades: [U('Sterkere Magneet', 140, '+6 schade', { dmg: 6 }), U('Groter Veld', 240, '+0.4 bereik', { range: 0.4 }), U('Polariteit', 450, '+10% vertraging, breekt 3 extra pantser', { slow: 0.1, shred: 3 }, true), U('Elektromagneet', 650, '+10 schade, +0.3 snelheid', { dmg: 10, rate: 0.3 }), U('Magnetische Storm', 1250, '+18 schade, groot veld. ULTIMATE', { dmg: 18, range: 0.6 }, true)] },
  { id: 'spion', name: 'Geheim Agent', rarity: 'rare', role: 'Detectie', title: 'Ziet alles, zegt niets', style: 'projectile', cost: 400,
    desc: 'Ziet onzichtbare vijanden in zijn bereik (ook voor andere helden) en schiet met kans op kritieke treffers.', base: { dmg: 24, range: 3.4, rate: 1.1, crit: 0.25, air: true, detect: true, projSpeed: 22 },
    look: { skin: '#e8c39e', suit: '#111827', suit2: '#e5e7eb', cape: null, hair: 'cap', hairC: '#111827', goggles: true, emblem: 'eye', weapon: 'blaster' }, fx: 'shadow', proj: 'bullet', ability: 'gadgets',
    upgrades: [U('Stille Loop', 230, '+10 schade', { dmg: 10 }), U('Nachtkijker', 380, '+0.8 bereik', { range: 0.8 }), U('Dubbelagent', 700, 'Schiet op 2 doelen', { multi: 1 }, true), U('Geheime Munitie', 950, '+15% crit, breekt 3 pantser', { crit: 0.15, shred: 3 }), U('Agent 00', 1900, '+40 schade, crits 3×. ULTIMATE', { dmg: 40, critMult: 1 }, true)] },
  { id: 'plasma', name: 'Plasmaridder', rarity: 'rare', role: 'Hoge damage', title: 'Zwaard van puur licht', style: 'beam', cost: 450,
    desc: 'Een korte maar zeer sterke plasmastraal die pantser wegbrandt.', base: { dmg: 45, range: 2.2, shred: 4, air: true },
    look: { skin: '#f5d0a9', suit: '#1e3a8a', suit2: '#a855f7', cape: '#312e81', hair: 'visor', hairC: '#1e1b4b', emblem: 'bolt', weapon: 'orb', orb: '#e879f9' }, fx: 'spark', ability: 'overload',
    upgrades: [U('Heter Plasma', 250, '+20 schade/s', { dmg: 20 }), U('Langere Kling', 400, '+0.6 bereik', { range: 0.6 }), U('Splitsing', 750, '+1 straal', { beams: 1 }, true), U('Zonnetemperatuur', 1000, '+30 schade/s, brand 10/s', { dmg: 30, burn: 10 }), U('Sterrenridder', 1950, '+60 schade/s, +1 straal. ULTIMATE', { dmg: 60, beams: 1 }, true)] },
  { id: 'kristal', name: 'Kristalmagiër', rarity: 'epic', role: 'Controle', title: 'Bevriest de tijd in glas', style: 'projectile', cost: 620,
    desc: 'Kristallen die ontploffen, vertragen en soms vijanden in kristal vangen.', base: { dmg: 30, splash: 0.9, slow: 0.3, slowDur: 1.2, stunChance: 0.08, stun: 0.8, range: 3.1, rate: 0.9, air: true, projSpeed: 12 },
    look: { skin: '#e0f2fe', suit: '#6d28d9', suit2: '#67e8f9', cape: '#a78bfa', hair: 'crystal', hairC: '#c4b5fd', emblem: 'diamond', weapon: 'staff', orb: '#67e8f9' }, fx: 'prism', proj: 'crystal', ability: 'crystalprison',
    upgrades: [U('Scherpe Splinters', 420, '+15 schade', { dmg: 15 }), U('Kristalregen', 600, '+0.3 snelheid, +0.3 explosie', { rate: 0.3, splash: 0.3 }), U('Diamanten Kooi', 1100, '+8% kans op kristalvangst, sterker vertragen', { stunChance: 0.08, slow: 0.1 }, true), U('Prismamagie', 1500, '+25 schade, 2 doelen', { dmg: 25, multi: 1 }), U('Kristalkoningin', 2900, '+50 schade, grotere explosie. ULTIMATE', { dmg: 50, splash: 0.4 }, true)] },
  { id: 'mechasmid', name: 'Mechasmid', rarity: 'epic', role: 'Support', title: 'Bouwt wat hij nodig heeft', style: 'projectile', cost: 600,
    desc: 'Repareert helden in de buurt (sneller aanvallen) en bouwt geschuttorens met zijn ability.', base: { dmg: 20, range: 2.8, rate: 1.2, air: true, projSpeed: 15, buffRange: 2, buffRate: 0.1 },
    look: { skin: '#c68642', suit: '#ea580c', suit2: '#fde047', cape: null, hair: 'helmet', hairC: '#facc15', goggles: true, emblem: 'tri', weapon: 'hammer' }, fx: 'steam', proj: 'bullet', ability: 'deployturret',
    upgrades: [U('Betere Bouten', 420, '+10 schade', { dmg: 10 }), U('Onderhoud', 600, '+8% snelheidsbuff, groter bereik', { buffRate: 0.08, buffRange: 0.6 }), U('Zware Torens', 1100, 'Torens schieten harder en blijven langer', { turret: 1 }, true), U('Werkplaats', 1500, '+10% schadebuff', { buffDmg: 0.1 }), U('Meester-ingenieur', 2900, '+1 toren, +20 schade. ULTIMATE', { turret: 1, dmg: 20 }, true)] },
  { id: 'astro', name: 'Astro-Commandant', rarity: 'legendary', role: 'Detectie', title: 'Commandant van Station Orion', style: 'strike', strike: 'orbital', cost: 820,
    desc: 'Orbitale inslagen over groot bereik. Zijn scanner onthult onzichtbare vijanden.', base: { dmg: 85, splash: 1.1, range: 4.6, rate: 0.6, multi: 2, air: true, detect: true },
    look: { skin: '#e8c39e', suit: '#f8fafc', suit2: '#f97316', cape: null, hair: 'dome', hairC: '#cbd5e1', emblem: 'star', weapon: 'orb', orb: '#fdba74' }, fx: 'star', ability: 'meteorshower',
    upgrades: [U('Doelzoeker', 700, '+45 schade', { dmg: 45 }), U('Satellietnetwerk', 1000, '+1 bereik, +1 inslag', { range: 1, multi: 1 }), U('Zwaar Bombardement', 1800, 'Grotere inslagen, breekt 5 pantser', { splash: 0.5, shred: 5 }, true), U('Hyperdrive', 2300, '+0.25 snelheid', { rate: 0.25 }), U('Admiraal van Orion', 4200, '+130 schade, +1 inslag. ULTIMATE', { dmg: 130, multi: 1 }, true)] },
  { id: 'farao', name: 'Farao Ra', rarity: 'mythic', role: 'Area damage', title: 'Zoon van de zon', style: 'beam', cost: 1150,
    desc: 'Een gouden zonnestraal die van vijand naar vijand overspringt en ze vervloekt.', base: { dmg: 100, beams: 2, chains: 2, range: 3.8, burn: 20, air: true },
    look: { skin: '#b08968', suit: '#fbbf24', suit2: '#0ea5e9', cape: '#1e3a8a', hair: 'crown', hairC: '#fbbf24', emblem: 'sun', weapon: 'staff', orb: '#fde047' }, fx: 'gold', ability: 'sandstorm',
    upgrades: [U('Gouden Scepter', 1100, '+60 schade/s', { dmg: 60 }), U('Zonnetempel', 1500, '+0.6 bereik, +1 sprong', { range: 0.6, chains: 1 }), U('Oog van Ra', 2600, '+1 straal, brand +30', { beams: 1, burn: 30 }, true), U('Eeuwige Dynastie', 3400, '+100 schade/s', { dmg: 100 }), U('Zonnegod', 6000, '+180 schade/s, +2 sprongen. ULTIMATE', { dmg: 180, chains: 2 }, true)] },
  { id: 'xeno', name: 'Xeno-Koningin', rarity: 'exotic', role: 'Area damage', special: 'alien', title: 'Moeder van de zwerm', style: 'projectile', cost: 1450,
    desc: 'Zuurbollen die ontploffen en pantser steeds verder oplossen. Haar Broedkorf roept xeno-drones op.', base: { dmg: 110, splash: 1.1, range: 3.8, rate: 1.0, corrode: 2, air: true, projSpeed: 11 },
    look: { skin: '#a3e635', suit: '#1a2e05', suit2: '#84cc16', cape: '#3f6212', hair: 'crystal', hairC: '#65a30d', emblem: 'eye', weapon: 'orb', orb: '#bef264' }, fx: 'void', proj: 'acid', ability: 'hive',
    upgrades: [U('Sterker Zuur', 1500, 'Elke treffer lost 1 extra pantser op', { corrode: 1 }, false, true), U('Legsel', 2100, '+80 schade, +0.3 snelheid', { dmg: 80, rate: 0.3 }), U('Broedmoeder', 3500, '2 zuurbollen tegelijk, grotere explosie', { multi: 1, splash: 0.4 }, true, true), U('Hyperevolutie', 4400, '+120 schade, +0.8 bereik', { dmg: 120, range: 0.8 }), U('Keizerin van de Zwerm', 8200, '+200 schade, meer drones. ULTIMATE', { dmg: 200, turret: 2 }, true, true)] },
  { id: 'nebula', name: 'Nebula', rarity: 'ultra', role: 'Hoge damage', special: 'cosmic', title: 'Geboren in een sterrennevel', style: 'projectile', cost: 1850,
    desc: 'Mini-zwarte gaten die vijanden naar zich toe trekken en exploderen. Haar Grote Krak zuigt alles naar één punt.', base: { dmg: 260, splash: 1.5, range: 4.4, rate: 0.8, multi: 2, air: true, projSpeed: 9, knock: 0.15 },
    look: { skin: '#f5f3ff', suit: '#2e1065', suit2: '#f0abfc', cape: '#7c3aed', hair: 'long', hairC: '#e9d5ff', emblem: 'star', weapon: 'orb', orb: '#f0abfc', halo: true, wings: true }, fx: 'star', proj: 'void', ability: 'bigcrunch',
    upgrades: [U('Nevelkern', 2400, '+160 schade', { dmg: 160 }, false, true), U('Zwaartekrachtgolf', 3100, '+1 zwart gat, sterkere trek', { multi: 1, knock: 0.1 }), U('Supernevel', 5300, 'Veel grotere explosies, breekt 10 pantser', { splash: 0.6, shred: 10 }, true, true), U('Sterrenwieg', 6800, '+300 schade, +0.3 snelheid', { dmg: 300, rate: 0.3 }), U('Moeder der Sterren', 12000, '+500 schade, +1 zwart gat. ULTIMATE', { dmg: 500, multi: 1 }, true, true)] },
  // Secret
  { id: 'paradox', name: 'Het Paradox', rarity: 'secret', role: 'Tijdmanipulatie', special: 'glitch', title: 'Bestaat twee keer tegelijk', style: 'projectile', cost: 2000, cap: 1,
    desc: 'Elke aanval gebeurt twee keer: een echo uit de toekomst volgt een halve seconde later. Zijn Tijdlus stuurt alle vijanden terug naar het begin.', base: { dmg: 280, splash: 1.0, range: 4.2, rate: 1.0, multi: 2, echo: 1, air: true, projSpeed: 16 },
    look: { skin: '#e5e7eb', suit: '#0a0a0a', suit2: '#22d3ee', cape: '#f43f5e', hair: 'visor', hairC: '#111827', emblem: 'infinity', weapon: 'orb', orb: '#ffffff', halo: true },
    fx: 'glitch', proj: 'echo', ability: 'timeloop',
    upgrades: [U('Voorgevoel', 3000, '+200 schade', { dmg: 200 }, false, true), U('Dubbele Tijdlijn', 4000, 'Echo\'s zijn even sterk als het origineel, +1 doel', { echo: 1, multi: 1 }), U('Oorzaak & Gevolg', 7000, '+0.5 snelheid, grotere explosies', { rate: 0.5, splash: 0.5 }, true, true), U('Grootvaderparadox', 9000, '+500 schade, breekt 15 pantser', { dmg: 500, shred: 15 }), U('Einde van de Tijd', 16000, 'Drie echo\'s per aanval, +700 schade. ULTIMATE', { echo: 1, dmg: 700 }, true, true)] },
  { id: 'nul', name: 'De Nul', rarity: 'secret', role: 'Uitwisser', special: 'glitch', title: 'Wat hij aanraakt, heeft nooit bestaan', style: 'strike', strike: 'erase', cost: 2100, cap: 1,
    desc: 'Inslagen van pure leegte: gewone vijanden kunnen in één keer worden uitgewist en bazen verliezen een deel van hun maximale HP.', base: { dmg: 300, splash: 1.2, range: 99, rate: 0.55, multi: 2, erase: 0.12, pctMax: 0.012, air: true },
    look: { skin: '#fafafa', suit: '#fafafa', suit2: '#0a0a0a', cape: '#0a0a0a', hair: 'dome', hairC: '#0a0a0a', emblem: 'void', weapon: 'orb', orb: '#0a0a0a', wings: true },
    fx: 'glitch', ability: 'erase',
    upgrades: [U('Stilte', 3000, '+5% uitwiskans', { erase: 0.05 }, false, true), U('Nulpunt', 4000, '+1 inslag, +250 schade', { multi: 1, dmg: 250 }), U('Absolute Leegte', 7000, 'Bazen verliezen 1% extra max-HP per treffer', { pctMax: 0.01 }, true, true), U('Vergetelheid', 9000, '+0.25 snelheid, +6% uitwiskans', { rate: 0.25, erase: 0.06 }), U('Het Einde van Alles', 17000, '+2 inslagen, +600 schade. ULTIMATE', { multi: 2, dmg: 600 }, true, true)] },
];
NEW_HEROES_3.forEach(h => { HEROES.push(h); HERO[h.id] = h; });
// verborgen helden (torens en drones) — niet in gacha's of collectie
const HIDDEN_HEROES = {
  geschut: { id: 'geschut', name: 'Geschuttoren', rarity: 'common', role: 'Toren', hidden: true, style: 'projectile', cost: 0, base: { dmg: 40, range: 3, rate: 2, air: true, projSpeed: 20 }, look: { skin: '#9ca3af', suit: '#52525b', suit2: '#f97316', cape: null, hair: 'helmet', hairC: '#3f3f46', emblem: 'tri', weapon: 'blaster', big: false }, fx: 'steam', proj: 'bullet', ability: 'gadgets', upgrades: [] },
  xenodrone: { id: 'xenodrone', name: 'Xeno-drone', rarity: 'common', role: 'Drone', hidden: true, style: 'projectile', cost: 0, base: { dmg: 90, range: 2.8, rate: 1.6, splash: 0.6, corrode: 1, air: true, projSpeed: 14 }, look: { skin: '#a3e635', suit: '#1a2e05', suit2: '#84cc16', cape: null, hair: 'crystal', hairC: '#65a30d', emblem: 'eye', weapon: 'orb', orb: '#bef264', wings: true }, fx: 'void', proj: 'acid', ability: 'gadgets', upgrades: [] },
};
Object.assign(HERO, HIDDEN_HEROES);
Object.assign(ABILITIES, {
  megabounce: { name: 'Megastuiter', ult: 'Stuiterstorm', cd: 16, desc: 'Een reuzenbal stuitert langs 8 vijanden.' },
  lassopull: { name: 'Lassoworp', ult: 'Grote Kudde', cd: 18, desc: 'Trekt de 3 verste vijanden in bereik ver terug over het pad.' },
  swarm: { name: 'Zwermaanval', ult: 'Koninklijke Zwerm', cd: 20, desc: 'Een wolk bijen vergiftigt alle vijanden in bereik.' },
  magnetpull: { name: 'Magneetpuls', ult: 'Polaire Omkering', cd: 20, desc: 'Trekt vijanden in bereik terug en verwijdert hun pantser.' },
  gadgets: { name: 'Gadgets', ult: 'Missie Onmogelijk', cd: 22, desc: 'Onthult 8 seconden alle onzichtbare vijanden op de map en markeert ze voor extra schade.' },
  overload: { name: 'Overbelasting', ult: 'Kernsmelting', cd: 22, desc: 'Straal 5 seconden driedubbel sterk.' },
  crystalprison: { name: 'Kristalgevangenis', ult: 'Diamanten Tijdperk', cd: 26, desc: 'Vangt alle vijanden in bereik in kristal.' },
  deployturret: { name: 'Toren Bouwen', ult: 'Fort Bouwen', cd: 30, desc: 'Bouwt tijdelijke geschuttorens langs het pad.' },
  meteorshower: { name: 'Meteorenregen', ult: 'Orbitale Storm', cd: 26, desc: 'Een regen van meteorieten op vijanden in een groot gebied.' },
  sandstorm: { name: 'Zandstorm', ult: 'Toorn van Ra', cd: 28, desc: 'Een zandstorm vertraagt alle vijanden op de map en doet schade.' },
  hive: { name: 'Broedkorf', ult: 'Zwermmoeder', cd: 30, desc: 'Roept xeno-drones op die tijdelijk meevechten.' },
  bigcrunch: { name: 'Grote Krak', ult: 'Singulariteit', cd: 34, desc: 'Trekt alle vijanden in bereik naar één punt en laat ze imploderen.' },
  timeloop: { name: 'Tijdlus', ult: 'Oneindige Lus', cd: 45, desc: 'Stuurt gewone vijanden terug naar het begin en zet alle ability-cooldowns op nul.' },
  erase: { name: 'Uitwissen', ult: 'Niets', cd: 40, desc: 'Wist alle gewone vijanden in een enorm gebied uit en haalt 10% van de max-HP van bazen af.' },
});

/* ---------- Nieuwe vijanden en bazen ---------- */
const LOOK_NET = { skin: '#d1d5db', suit: '#0f0a1e', suit2: '#f0abfc', cape: '#be185d', hair: 'hood', hairC: '#1e1b4b', emblem: 'eye', weapon: 'orb', orb: '#f0abfc' };
const LOOK_DUNGEON = { skin: '#78716c', suit: '#1c1917', suit2: '#dc2626', cape: '#450a0a', hair: 'helmet', hairC: '#292524', emblem: 'hex', weapon: 'hammer', big: true };
Object.assign(ENEMIES, {
  sluiper:  { name: 'Sluiper', hp: 70, speed: 1.3, armor: 0, reward: 9, r: 11, leak: 2, color: '#94a3b8', shape: 'sneak', invisible: true, desc: 'Onzichtbaar. Alleen te raken als een held met detectie hem ziet, of als hij vlak langs een held loopt.' },
  trol:     { name: 'Bergtrol', hp: 380, speed: 0.6, armor: 3, reward: 16, r: 15, leak: 3, color: '#4d7c0f', shape: 'troll', regen: 0.04, fireStops: true, desc: 'Herstelt snel HP. Brandschade stopt zijn herstel.' },
  necro:    { name: 'Dodenbezweerder', hp: 160, speed: 0.75, armor: 1, reward: 14, r: 12, leak: 2, color: '#16a34a', shape: 'necro', summons: 'skelet', desc: 'Roept steeds skeletten op.' },
  skelet:   { name: 'Skelet', hp: 40, speed: 1.2, armor: 0, reward: 2, r: 9, leak: 1, color: '#e7e5e4', shape: 'skeleton', desc: 'Opgeroepen door een dodenbezweerder.' },
  schildgen:{ name: 'Schildgenerator', hp: 180, speed: 0.7, armor: 4, reward: 15, r: 13, leak: 2, color: '#0ea5e9', shape: 'generator', shieldAura: true, desc: 'Geeft vijanden in de buurt steeds een energieschild.' },
  priester: { name: 'Hogepriester', hp: 150, speed: 0.8, armor: 1, reward: 14, r: 12, leak: 2, color: '#fbbf24', shape: 'priest', healAura: true, desc: 'Heelt alle vijanden in de buurt voortdurend.' },
  hacker:   { name: 'Hacker', hp: 100, speed: 1.1, armor: 0, reward: 11, r: 11, leak: 2, color: '#a855f7', shape: 'hacker', hacks: true, desc: 'Schakelt helden waar hij langs loopt even uit.' },
  ijswolf:  { name: 'IJswolf', hp: 90, speed: 1.9, armor: 1, reward: 8, r: 11, leak: 1, color: '#bae6fd', shape: 'wolf', desc: 'Snel, en komt in roedels.' },
  xenolarve:{ name: 'Xenolarve', hp: 110, speed: 1.2, armor: 2, reward: 8, r: 11, leak: 1, color: '#84cc16', shape: 'larva', split: 'xenomini', desc: 'Barst open in drie kleine larven.' },
  xenomini: { name: 'Larfje', hp: 28, speed: 1.8, armor: 0, reward: 2, r: 7, leak: 1, color: '#bef264', shape: 'larva', hidden: true },
  // bazen wereld 2
  netrunner: { name: 'Netrunner Zero', hp: 1400, speed: 0.55, armor: 5, reward: 320, r: 24, leak: 40, color: '#f0abfc', boss: true, shape: 'villain', look: LOOK_NET, abilities: ['hackwave', 'cloak', 'mirror'], desc: 'Hackt helden en wordt onzichtbaar.' },
  lawine:    { name: 'Lawinekoning', hp: 1700, speed: 0.4, armor: 9, reward: 350, r: 30, leak: 40, color: '#dbeafe', boss: true, shape: 'golem', horns: true, abilities: ['chillaura', 'summonWolf', 'enrage'], desc: 'Zijn ijskou laat helden in de buurt trager aanvallen.' },
  magmatitan:{ name: 'Magmatitan', hp: 1900, speed: 0.42, armor: 8, reward: 380, r: 30, leak: 40, color: '#ea580c', boss: true, shape: 'golem', abilities: ['molten', 'summonTrol'], desc: 'Wordt af en toe gloeiend heet: dan is zijn pantser drie keer zo sterk.' },
  moederbrein:{ name: 'Het Moederbrein', hp: 2000, speed: 0.38, armor: 5, reward: 400, r: 30, leak: 40, color: '#e879f9', boss: true, shape: 'brain', abilities: ['broodling', 'psychic', 'regen'], desc: 'Legt larven en verdooft helden met gedachtekracht.' },
  anubis:    { name: 'Anubis', hp: 2100, speed: 0.45, armor: 7, reward: 420, r: 26, leak: 40, color: '#fbbf24', boss: true, shape: 'jackal', abilities: ['resurrect', 'laser', 'teleport'], desc: 'Wekt verslagen vijanden weer tot leven.' },
  stationai: { name: 'S.T.A.T.I.O.N.', hp: 2400, speed: 0.36, armor: 8, reward: 460, r: 30, leak: 60, color: '#22d3ee', boss: true, shape: 'eye', abilities: ['hitshield', 'laser', 'genshield'], desc: 'Beschermt zich met schilden en energieschermen, en schiet lasers op je helden.' },
  kerkerheer:{ name: 'Kerkerheer', hp: 3800, speed: 0.4, armor: 6, reward: 500, r: 28, leak: 999, color: '#dc2626', boss: true, shape: 'villain', look: LOOK_DUNGEON, abilities: ['phases2', 'summon2', 'freezeheroes', 'resurrect'], desc: 'Heerser van de Diepe Crypte. Wordt sterker in elke diepte.' },
});
Object.assign(ENEMY_FROM_WAVE, { sluiper: 5, trol: 6, necro: 7, schildgen: 8, priester: 8, hacker: 4, ijswolf: 2, xenolarve: 3 });

/* ---------- Thema's wereld 2 ---------- */
Object.assign(THEMES, {
  cyber:   { ground: '#150a26', g2: '#1a0d2e', path: '#07030f', edge: '#f472b6', glow: true, dash: 'rgba(34,211,238,.7)', amb: 'rain', sky: '#0a0418', label: 'Cyberpunk-stad' },
  glacier: { ground: '#bcd7ee', g2: '#c7def2', path: '#8fb3d3', edge: '#4a78a3', amb: 'snow', sky: '#0f2440', label: 'Bevroren bergen' },
  inferno: { ground: '#120707', g2: '#170909', path: '#050202', edge: '#f97316', glow: true, amb: 'ember', sky: '#0b0202', label: 'Inferno' },
  alien:   { ground: '#1d0f33', g2: '#23123d', path: '#3b2350', edge: '#84cc16', glow: true, amb: 'motes', sky: '#0b0616', label: 'Buitenaardse planeet' },
  temple:  { ground: '#2d4a22', g2: '#335427', path: '#c8a35a', edge: '#8a6d2e', amb: 'firefly', sky: '#10200b', label: 'Oude tempel' },
  space:   { ground: '#1b2130', g2: '#1f2638', path: '#0b0e16', edge: '#38bdf8', glow: true, dash: 'rgba(56,189,248,.5)', amb: 'sparkle', sky: '#03050b', label: 'Ruimtestation' },
});
Object.assign(THEME_EXTRA, {
  cyber: {
    ground(ctx, x, y, i) { if (i < 60) { ctx.strokeStyle = 'rgba(244,114,182,.10)'; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(x / TILE) * TILE + 0.5, Math.floor(y / TILE) * TILE + 0.5, TILE - 1, TILE - 1); } else if (i % 6 === 0) { ctx.fillStyle = 'rgba(34,211,238,.25)'; ctx.fillRect(x, y, 10, 2); } },
    prop(ctx, cx, cy, rng, v) {
      const neon = ['#f472b6', '#22d3ee', '#a855f7', '#facc15'][Math.floor(rng() * 4)];
      if (v < 0.7) { ctx.fillStyle = '#1e1033'; ctx.fillRect(cx - 16, cy - 18, 32, 34); ctx.strokeRect(cx - 16, cy - 18, 32, 34); ctx.save(); ctx.shadowColor = neon; ctx.shadowBlur = 12; ctx.fillStyle = neon; ctx.fillRect(cx - 12, cy - 14, 24, 5); ctx.restore(); ctx.fillStyle = rgba(neon, 0.6); for (let i = 0; i < 6; i++) ctx.fillRect(cx - 11 + (i % 3) * 8, cy - 4 + Math.floor(i / 3) * 8, 5, 4); }
      else { ctx.save(); ctx.shadowColor = neon; ctx.shadowBlur = 14; ctx.strokeStyle = neon; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 12, cy + 10); ctx.lineTo(cx, cy - 14); ctx.lineTo(cx + 12, cy + 10); ctx.closePath(); ctx.stroke(); ctx.restore(); }
    } },
  glacier: {
    ground(ctx, x, y, i) { if (i % 3 === 0) { ctx.strokeStyle = 'rgba(74,120,163,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x + 5, y + 12); ctx.stroke(); } else { ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, x, y, 2); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.6) { ctx.fillStyle = '#e0f2fe'; ctx.strokeStyle = '#4a78a3'; ctx.beginPath(); ctx.moveTo(cx - 14, cy + 12); ctx.lineTo(cx - 8, cy - 14); ctx.lineTo(cx - 2, cy + 2); ctx.lineTo(cx + 4, cy - 18); ctx.lineTo(cx + 14, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(56,189,248,.35)'; ctx.beginPath(); ctx.moveTo(cx + 4, cy - 18); ctx.lineTo(cx + 14, cy + 12); ctx.lineTo(cx + 4, cy + 12); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = '#93c5fd'; ctx.strokeStyle = '#1e3a8a'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 7 - 3, cy + 12); ctx.lineTo(cx + i * 7, cy - 10 - (1 - Math.abs(i)) * 6); ctx.lineTo(cx + i * 7 + 3, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    } },
  inferno: {
    ground(ctx, x, y, i) { if (i % 2) { ctx.save(); ctx.strokeStyle = 'rgba(249,115,22,.45)'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 6; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 4); ctx.lineTo(x + 3, y + 10); ctx.lineTo(x + 9, y + 14); ctx.stroke(); ctx.restore(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.5) { ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 14); ctx.lineTo(cx - 4, cy - 16); ctx.lineTo(cx + 2, cy - 6); ctx.lineTo(cx + 6, cy - 18); ctx.lineTo(cx + 10, cy + 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.save(); ctx.strokeStyle = '#f97316'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(cx - 2, cy + 12); ctx.lineTo(cx, cy - 4); ctx.stroke(); ctx.restore(); }
      else { ctx.save(); ctx.shadowColor = '#f97316'; ctx.shadowBlur = 18; const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15); g.addColorStop(0, '#fef08a'); g.addColorStop(0.5, '#f97316'); g.addColorStop(1, '#7f1d1d'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 15, 10, 0, 0, TAU); ctx.fill(); ctx.restore(); ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.ellipse(cx + 3, cy - 3, 3, 2, 0, 0, TAU); ctx.fill(); }
    } },
  alien: {
    ground(ctx, x, y, i) { if (i % 4 === 0) { ctx.fillStyle = 'rgba(132,204,22,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0.5, 0, TAU); ctx.fill(); } else { ctx.fillStyle = 'rgba(232,121,249,.2)'; circle(ctx, x, y, 1.6); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.55) { const c = rng() < 0.5 ? '#a3e635' : '#e879f9'; ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 12; for (let i = -1; i <= 1; i++) { ctx.fillStyle = rgba(c, 0.85); ctx.beginPath(); ctx.moveTo(cx + i * 6 - 3, cy + 12); ctx.lineTo(cx + i * 6 + i * 3, cy - 12 - (1 - Math.abs(i)) * 6); ctx.lineTo(cx + i * 6 + 3, cy + 12); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      else { ctx.fillStyle = '#4c1d95'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 14, 7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#84cc16'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.quadraticCurveTo(cx - 6, cy - 6, cx + 2, cy - 16); ctx.stroke(); ctx.fillStyle = '#d9f99d'; circle(ctx, cx + 2, cy - 16, 3.5); ctx.fill(); }
    } },
  temple: {
    ground(ctx, x, y, i) { if (i % 3) { ctx.strokeStyle = 'rgba(134,239,172,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4, y - 6, x - 1, y - 9); ctx.stroke(); } else { ctx.fillStyle = 'rgba(138,109,46,.25)'; ctx.fillRect(x, y, 8, 5); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.45) { ctx.fillStyle = '#a8a29e'; ctx.fillRect(cx - 9, cy - 16, 18, 32); ctx.strokeRect(cx - 9, cy - 16, 18, 32); ctx.fillStyle = '#fbbf24'; ctx.fillRect(cx - 9, cy - 16, 18, 4); ctx.strokeStyle = '#57534e'; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 6); ctx.lineTo(cx + 4, cy - 6); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 6); ctx.stroke(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 9, cy - 10); ctx.quadraticCurveTo(cx - 14, cy, cx - 8, cy + 10); ctx.stroke(); }
      else if (v < 0.8) { ctx.fillStyle = '#14532d'; circle(ctx, cx, cy, 16); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#166534'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 8, 4, a, 0, TAU); ctx.fill(); } }
      else { ctx.fillStyle = '#d6b35a'; ctx.beginPath(); ctx.moveTo(cx - 14, cy + 12); ctx.lineTo(cx, cy - 16); ctx.lineTo(cx + 14, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#8a6d2e'; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 14 + i * 3.5, cy + 12 - i * 7); ctx.lineTo(cx + 14 - i * 3.5, cy + 12 - i * 7); ctx.stroke(); } }
    } },
  space: {
    ground(ctx, x, y, i) { if (i < 70) { ctx.strokeStyle = 'rgba(148,163,184,.12)'; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(x / TILE) * TILE + 1.5, Math.floor(y / TILE) * TILE + 1.5, TILE - 3, TILE - 3); } else if (i % 4 === 0) { ctx.fillStyle = 'rgba(148,163,184,.35)'; circle(ctx, x, y, 1.2); ctx.fill(); } },
    prop(ctx, cx, cy, rng, v) {
      if (v < 0.4) { ctx.fillStyle = '#334155'; rr(ctx, cx - 15, cy - 15, 30, 30, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0b0e16'; circle(ctx, cx, cy, 9); ctx.fill(); ctx.fillStyle = '#e2e8f0'; for (let i = 0; i < 5; i++) { ctx.fillRect(cx - 6 + rng() * 12, cy - 6 + rng() * 12, 1.2, 1.2); } ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; circle(ctx, cx, cy, 9); ctx.stroke(); }
      else if (v < 0.75) { ctx.fillStyle = '#475569'; ctx.fillRect(cx - 14, cy - 10, 28, 20); ctx.strokeRect(cx - 14, cy - 10, 28, 20); ctx.fillStyle = ['#22c55e', '#f97316', '#38bdf8'][Math.floor(rng() * 3)]; for (let i = 0; i < 3; i++) { circle(ctx, cx - 8 + i * 8, cy - 3, 2); ctx.fill(); } ctx.fillStyle = '#0ea5e9'; ctx.fillRect(cx - 10, cy + 2, 20, 4); }
      else { ctx.fillStyle = '#1e40af'; ctx.fillRect(cx - 16, cy - 6, 32, 12); ctx.strokeRect(cx - 16, cy - 6, 32, 12); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - 16 + i * 5.3, cy - 6); ctx.lineTo(cx - 16 + i * 5.3, cy + 6); ctx.stroke(); } }
    } },
});

/* ---------- Wereld 2 ---------- */
const WORLD1_COUNT = MAPS.length;
MAPS.push(
  { id: 'neonstad', world: 2, reqLevel: 10, name: 'Neon-Metropool', theme: 'cyber', reward: 820, hpMult: 3.8, startCash: 1400, desc: 'Een cyberpunk-stad vol hackers en sluipers die je niet ziet aankomen.',
    pool: ['grunt', 'runner', 'hacker', 'sluiper', 'shield', 'flyer', 'schildgen'], bosses: ['chaos', 'netrunner'], finalBoss: 'netrunner',
    path: [[-1, 12], [4, 12], [4, 3], [9, 3], [9, 9], [14, 9], [14, 2], [19, 2], [19, 12], [24, 12]] },
  { id: 'gletsjer', world: 2, name: 'Eeuwige Gletsjer', theme: 'glacier', reward: 960, hpMult: 4.5, startCash: 1600, desc: 'Bevroren bergen waar roedels ijswolven jagen en trollen niet omvallen.',
    pool: ['ijswolf', 'ijswolf', 'tank', 'trol', 'flyer', 'healer', 'shield'], bosses: ['kolos', 'lawine'], finalBoss: 'lawine',
    path: [[2, -1], [2, 6], [8, 6], [8, 1], [14, 1], [14, 8], [5, 8], [5, 13], [18, 13], [18, 5], [24, 5]] },
  { id: 'inferno', world: 2, name: 'Het Inferno', theme: 'inferno', reward: 1120, hpMult: 5.3, startCash: 1800, desc: 'Een gloeiend hellelandschap. Dodenbezweerders roepen eindeloos skeletten op.',
    pool: ['grunt', 'trol', 'splitter', 'tank', 'necro', 'flyer', 'runner'], bosses: ['wyrm', 'magmatitan'], finalBoss: 'magmatitan',
    path: [[-1, 4], [6, 4], [6, 11], [12, 11], [12, 4], [18, 4], [18, 11], [24, 11]] },
  { id: 'xenoplaneet', world: 2, name: 'Planeet Xeno-9', theme: 'alien', reward: 1300, hpMult: 6.2, startCash: 2000, desc: 'Een buitenaardse planeet vol larven, kristallen en het Moederbrein.',
    pool: ['xenolarve', 'xenolarve', 'runner', 'flyer', 'mutant', 'sluiper', 'schildgen'], bosses: ['wyrm', 'moederbrein'], finalBoss: 'moederbrein',
    path: [[12, -1], [12, 3], [3, 3], [3, 11], [9, 11], [9, 7], [15, 7], [15, 11], [21, 11], [21, 3], [16, 3], [16, -1]] },
  { id: 'tempel', world: 2, name: 'Tempel van Anubis', theme: 'temple', reward: 1500, hpMult: 7.2, startCash: 2300, desc: 'Een oude jungletempel. Priesters houden de mummie-legers op de been.',
    pool: ['grunt', 'necro', 'priester', 'tank', 'sluiper', 'shield', 'skelet'], bosses: ['kolos', 'anubis'], finalBoss: 'anubis',
    path: [[-1, 1], [10, 1], [10, 5], [3, 5], [3, 9], [10, 9], [10, 13], [14, 13], [14, 9], [21, 9], [21, 5], [14, 5], [14, 1], [24, 1]] },
  { id: 'station', world: 2, name: 'Ruimtestation Orion', theme: 'space', reward: 1750, hpMult: 8.4, startCash: 2600, desc: 'Een spiraalvormig ruimtestation met de hoofdcomputer in het midden. Alles valt tegelijk aan.',
    pool: ['flyer', 'hacker', 'schildgen', 'tank', 'runner', 'sluiper', 'shield'], bosses: ['netrunner', 'stationai'], finalBoss: 'stationai',
    path: [[-1, 1], [22, 1], [22, 13], [2, 13], [2, 4], [19, 4], [19, 10], [5, 10], [5, 7], [12, 7]] },
);
SPECIAL_MAPS.push({ id: 'crypte', kind: 'dungeon', name: 'De Diepe Crypte', theme: 'dungeon', reward: 600, hpMult: 1.9, startCash: 900, desc: 'Dungeon', pool: ['grunt', 'runner', 'tank', 'shield', 'healer', 'schim'], bosses: [], finalBoss: 'kerkerheer',
  path: [[-1, 7], [6, 7], [6, 2], [12, 2], [12, 12], [18, 12], [18, 7], [24, 7]] });
SMAP.crypte = SPECIAL_MAPS[SPECIAL_MAPS.length - 1];

/* ---------- Nieuwe moeilijkheden ---------- */
DIFFS[3].elite = 0.05; DIFFS[3].drops = 1;
DIFFS.push(
  { id: 'insane', name: 'Waanzin', waves: 35, hp: 2.6, speed: 1.18, baseHp: 40, cash: 250, cashPct: 0.3, reward: 4.0, elite: 0.08, drops: 1, reqLevel: 15 },
  { id: 'hell', name: 'Hel', waves: 40, hp: 3.4, speed: 1.22, baseHp: 30, cash: 450, cashPct: 0.6, reward: 5.6, elite: 0.14, drops: 2, reqLevel: 25 },
  { id: 'abyss', name: 'Afgrond', waves: 50, hp: 4.6, speed: 1.26, baseHp: 20, cash: 700, cashPct: 1.0, reward: 8.0, elite: 0.2, drops: 3, reqLevel: 40 },
);
const DIFF_MULT = [0.8, 1, 1.4, 1.8, 2.3, 2.9, 3.6];
const DROP_TABLE = [
  { w: 38, r: () => ({ gems: 15 + Math.floor(Math.random() * 30) }) },
  { w: 24, r: () => ({ tokens: 1 + Math.floor(Math.random() * 2) }) },
  { w: 14, r: () => ({ tickets: { epic: 1 } }) },
  { w: 9, r: () => ({ tickets: { mythic: 1 } }) },
  { w: 5, r: () => ({ tickets: { exotic: 1 } }) },
  { w: 2.2, minDiff: 6, r: () => ({ skin: 'afgrond' }) },
  { w: 0.35, minDiff: 5, r: () => ({ hero: Math.random() < 0.5 ? 'paradox' : 'nul' }) },
];

/* ---------- Nieuwe traits ---------- */
TRAITS.push(
  { id: 'zuinig', name: 'Zuinig', rarity: 'common', desc: 'Held kost 8% minder om te plaatsen', m: { costPct: 0.08 } },
  { id: 'haastig', name: 'Haastig', rarity: 'common', desc: 'Ability 8% sneller opgeladen', m: { cdPct: 0.08 } },
  { id: 'handelaar', name: 'Handelaar', rarity: 'uncommon', desc: 'Upgrades 10% goedkoper', m: { upgPct: 0.1 } },
  { id: 'doorboorder', name: 'Doorboorder', rarity: 'uncommon', desc: 'Aanvallen raken 1 extra vijand', m: { pierceAdd: 1 } },
  { id: 'waakzaam', name: 'Waakzaam', rarity: 'uncommon', desc: 'Ziet onzichtbare vijanden in bereik', m: { detect: true } },
  { id: 'giftig', name: 'Giftig', rarity: 'rare', desc: 'Aanvallen vergiftigen (15% van de schade per seconde)', m: { burnPct: 0.15 } },
  { id: 'pantserbreker', name: 'Pantserbreker', rarity: 'rare', desc: 'Aanvallen breken 3 pantser', m: { shred: 3 } },
  { id: 'vonkje', name: 'Kettingvonk', rarity: 'rare', desc: '15% kans dat een treffer overspringt naar 2 vijanden', m: { proc: 'minichain' } },
  { id: 'scherpzinnig', name: 'Scherpzinnig', rarity: 'epic', desc: '+15% crit en crits doen 50% meer schade', m: { crit: 0.15, critMult: 0.5 } },
  { id: 'ijzel', name: 'IJzel', rarity: 'epic', desc: 'Vertraagt 25% en 6% kans om te bevriezen', m: { slow: 0.25, slowDur: 1, proc: 'minifreeze' } },
  { id: 'vuurwerk', name: 'Vuurwerk', rarity: 'epic', desc: 'Aanvallen ontploffen in een klein gebied', m: { splashAdd: 0.6 } },
  { id: 'sluipmoord', name: 'Sluipmoordenaar', rarity: 'legendary', desc: '+30% schade en +20% crit', m: { dmgPct: 0.3, crit: 0.2 } },
  { id: 'stormloop', name: 'Stormloop', rarity: 'legendary', desc: '+30% aanvalssnelheid en +10% bereik', m: { ratePct: 0.3, rangePct: 0.1 } },
  { id: 'titanslachter', name: 'Titanenslachter', rarity: 'legendary', desc: '+50% baasschade en +20% schade', m: { bossPct: 0.5, dmgPct: 0.2 } },
  { id: 'godenkracht', name: 'Godenkracht', rarity: 'mythic', desc: '+75% schade en +25% aanvalssnelheid', m: { dmgPct: 0.75, ratePct: 0.25 } },
  { id: 'hemelschutter', name: 'Hemelschutter', rarity: 'mythic', desc: '+40% bereik en +40% schade, ziet onzichtbare vijanden', m: { rangePct: 0.4, dmgPct: 0.4, detect: true } },
  { id: 'leegtestaal', name: 'Leegtestaal', rarity: 'mythic', desc: '+60% baasschade en breekt 6 pantser', m: { bossPct: 0.6, shred: 6 } },
  { id: 'tweelingschot', name: 'Tweelingschot', rarity: 'exotic', desc: 'Elke treffer wordt een halve seconde later herhaald voor 50%', m: { proc: 'echo' } },
  { id: 'zwaartekracht', name: 'Zwaartekracht', rarity: 'exotic', desc: 'Treffers trekken vijanden een stukje terug over het pad', m: { proc: 'gravity' } },
  { id: 'fenikskracht', name: 'Fenikskracht', rarity: 'exotic', desc: '+40% brand en kleine vuurexplosies', m: { burnPct: 0.4, splashAdd: 0.4 } },
  { id: 'armageddon', name: 'Armageddon', rarity: 'ultra', mech: 'Meteorenstorm', desc: '10% kans op een storm van drie meteorieten rond het doel', m: { proc: 'armageddon' } },
  { id: 'tijdstop', name: 'Tijdstop', rarity: 'ultra', mech: 'Tijd bevriezen', desc: '8% kans om de tijd rond het doel stil te zetten (alle vijanden in 2 vakjes)', m: { proc: 'timestop' } },
  { id: 'oneindig', name: 'Oneindig', rarity: 'ultra', mech: 'Alles tegelijk', desc: '+50% schade, +50% snelheid en een extra projectiel', m: { dmgPct: 0.5, ratePct: 0.5, multiAdd: 1 } },
  { id: 'zielenoogst', name: 'Zielenoogst', rarity: 'ultra', mech: 'Geesten', desc: 'Kills laten een geest los die de volgende vijand voor 250% raakt', m: { proc: 'reap' } },
);
TRAITS.forEach(t => { TRAIT[t.id] = t; });
Object.assign(TRAIT_FX_COLOR, { minichain: '#fde047', minifreeze: '#bae6fd', echo: '#22d3ee', gravity: '#a78bfa', armageddon: '#f97316', timestop: '#fcd34d', reap: '#e9d5ff' });

/* ---------- Nieuwe skins ---------- */
SKINS.push(
  { id: 'cyber', name: 'Cybernetisch', source: 'Shop', shop: 180, pal: { suit: '#0f0a1e', suit2: '#f472b6', cape: '#22d3ee', hairC: '#f472b6', orb: '#22d3ee', mask: '#22d3ee' }, fx: 'spark', overlay: 'neon', trail: '#f472b6' },
  { id: 'piraat', name: 'Piraat', source: 'Shop', shop: 150, pal: { suit: '#7f1d1d', suit2: '#fde68a', cape: '#111827', hairC: '#111827', orb: '#fde68a', mask: '#111827' }, fx: 'dust', overlay: 'laurel', trail: '#fde68a' },
  { id: 'kristalhuid', name: 'Kristal', source: 'Shop', shop: 220, pal: { suit: '#a5f3fc', suit2: '#e0e7ff', cape: '#c4b5fd', hairC: '#e0f2fe', orb: '#ffffff', mask: '#67e8f9' }, fx: 'prism', overlay: 'shine', trail: '#e0f2fe' },
  { id: 'schaduwridder', name: 'Schaduwridder', source: 'Shop', shop: 250, pal: { suit: '#0a0a0a', suit2: '#7c3aed', cape: '#1e1b4b', hairC: '#0a0a0a', orb: '#7c3aed', mask: '#7c3aed' }, fx: 'shadow', overlay: 'armor', trail: '#7c3aed' },
  { id: 'grafridder', name: 'Grafridder', source: 'Dungeon diepte 3', pal: { suit: '#292524', suit2: '#84cc16', cape: '#1c1917', hairC: '#d6d3d1', orb: '#84cc16', mask: '#84cc16' }, fx: 'void', overlay: 'armor', trail: '#84cc16' },
  { id: 'afgrond', name: 'Afgrond', source: 'Zeldzame drop op Afgrond', pal: { suit: '#000000', suit2: '#ef4444', cape: '#450a0a', hairC: '#ef4444', orb: '#ef4444', mask: '#ef4444' }, fx: 'ember', overlay: 'moon', trail: '#ef4444' },
);
SKINS.forEach(s => { SKIN[s.id] = s; });

/* ---------- Tickets en nieuwe gacha's ---------- */
Object.assign(TICKETS, { epic: { name: 'Epic Ticket', gacha: 'epic', color: '#c084fc' }, mythic: { name: 'Mythic Ticket', gacha: 'mythic', color: '#ff4f8b' }, exotic: { name: 'Exotic Ticket', gacha: 'exotic', color: '#2dd4bf' } });
GACHAS.find(g => g.id === 'cosmic').rates = { legendary: 61.9, mythic: 28, exotic: 8, ultra: 2, secret: 0.1 };
GACHAS.push(
  { id: 'epic', name: 'Epic Gacha', color: '#c084fc', price: 700, desc: 'Vooral Epic helden, met een goede kans op Legendary.',
    rates: { epic: 70, legendary: 25, mythic: 4.5, exotic: 0.5 }, guarantee10: 'legendary', unlockLevel: 8, pity: { n: 40, rarity: 'legendary', key: 'pityEpic' } },
  { id: 'mythic', name: 'Mythic Gacha', color: '#ff4f8b', price: 1600, desc: 'Een veel hogere kans op Mythic helden.',
    rates: { legendary: 60, mythic: 36, exotic: 3.5, ultra: 0.5 }, guarantee10: 'mythic', unlockLevel: 15, pity: { n: 30, rarity: 'mythic', key: 'pityMythic' } },
  { id: 'exotic', name: 'Exotic Gacha', color: '#2dd4bf', price: 60, currency: 'gems', desc: 'De beste kans op Exotic en Ultra, en een piepkleine kans op een Secret held.',
    rates: { mythic: 55, exotic: 35, ultra: 9.8, secret: 0.2 }, guarantee10: 'exotic', unlockLevel: 25, pity: { n: 50, rarity: 'ultra', key: 'pityExotic' } },
  { id: 'limited', name: 'Limited Gacha', color: '#f59e0b', price: 40, currency: 'gems', limited: true, desc: 'Tijdelijk: limited helden (van het huidige en een eerder event) en exclusieve skins.',
    rates: { skin: 35, legendary: 40, mythic: 18, limited: 7 }, guarantee10: 'mythic', unlockLevel: 10, pity: { n: 70, rarity: 'limited', key: 'pityLimited' } },
);

/* ---------- Dungeon ---------- */
const DUNGEON = { rooms: 5, wavesPerRoom: 3, unlock: { map: 'woestijn', diff: 1 }, unlockLevel: 12, maxDepth: 10 };
const DUNGEON_ROOMS = [
  { id: 'normaal', name: 'Gewelf', desc: 'Een gewone kamer.', pool: ['grunt', 'runner', 'tank', 'shield'] },
  { id: 'zwerm', name: 'Zwermhol', desc: 'Veel snelle vijanden.', pool: ['runner', 'runner', 'ijswolf', 'skelet'], count: 1.6, hp: 0.6 },
  { id: 'schaduw', name: 'Schaduwgang', desc: 'Onzichtbare sluipers.', pool: ['sluiper', 'schim', 'grunt'] },
  { id: 'elite', name: 'Elitekamer', desc: 'Alle vijanden zijn elite.', pool: ['grunt', 'tank', 'shield'], elite: 1, count: 0.5 },
  { id: 'necro', name: 'Knekelhuis', desc: 'Dodenbezweerders en skeletten.', pool: ['necro', 'skelet', 'skelet', 'grunt'] },
  { id: 'schat', name: 'Schatkamer', desc: 'Vijanden laten dubbel geld vallen.', pool: ['grunt', 'runner', 'feestbot'], cash: 2 },
  { id: 'heiligdom', name: 'Heiligdom', desc: 'Priesters en schildgeneratoren.', pool: ['priester', 'schildgen', 'grunt', 'tank'] },
];
const RELICS = [
  { id: 'klingen', name: 'Scherpe Klingen', desc: 'Alle helden +15% schade', fx: { dmg: 1.15 } },
  { id: 'handen', name: 'Snelle Handen', desc: 'Alle helden +12% aanvalssnelheid', fx: { rate: 1.12 } },
  { id: 'beurs', name: 'Gouden Beurs', desc: 'Direct $600 en +15% geld per kill', fx: { cashNow: 600, cash: 1.15 } },
  { id: 'bron', name: 'Heilige Bron', desc: 'Basis +25 HP', fx: { heal: 25 } },
  { id: 'blik', name: 'Verre Blik', desc: 'Alle helden +10% bereik', fx: { range: 1.1 } },
  { id: 'koopjes', name: 'Koopjesjager', desc: 'Helden en upgrades 15% goedkoper', fx: { cost: 0.85, upg: 0.85 } },
  { id: 'bliksem', name: 'Bliksemrelikwie', desc: 'Abilities laden 20% sneller op', fx: { cdPct: 0.2 } },
  { id: 'breker', name: 'Pantserbreker', desc: 'Alle aanvallen breken 3 pantser', fx: { shred: 3 } },
  { id: 'oog', name: 'Alziend Oog', desc: 'Alle helden zien onzichtbare vijanden', fx: { detect: true } },
];
const DUNGEON_FIRST = { 1: { gems: 30 }, 2: { tickets: { epic: 1 } }, 3: { skin: 'grafridder' }, 4: { tokens: 3 }, 5: { title: 'kerkerheer', tickets: { mythic: 1 } }, 6: { gems: 80 }, 7: { tickets: { exotic: 1 }, tokens: 3 }, 8: { gems: 120 }, 9: { tickets: { exotic: 2 } }, 10: { badge: 'crypte', gems: 250 } };
TITLES.kerkerheer = 'Kerkerheer'; TITLES.afgrond = 'Afgrondloper'; TITLES.verzamelaar2 = 'Grootverzamelaar'; TITLES.geheim = 'Kenner van Geheimen'; TITLES.kosmonaut = 'Kosmonaut';

/* ---------- Boss Rush uitgebreid ---------- */
BOSSRUSH.splice(0, BOSSRUSH.length, 'chaos', 'wyrm', 'spiegelkoning', 'kolos', 'hydra', 'lawine', 'overlord', 'netrunner', 'tijdvreter', 'moederbrein', 'anubis', 'chaoskoning');

/* ---------- Collectie ---------- */
const COLL_WEIGHT = { common: 5, uncommon: 8, rare: 12, epic: 18, legendary: 28, mythic: 40, exotic: 60, ultra: 80, secret: 150 };
const COLL_LEVELS = [0, 60, 160, 300, 480, 700, 960, 1260, 1600, 2000, 2450, 2950, 3500, 4100];
const collReward = l => Object.assign({ gems: 20 + l * 10 }, l % 3 === 0 ? { tickets: { mythic: 1 } } : {}, l % 4 === 0 ? { tokens: 3 } : {});
const COLL_BONUS = 0.02; // +2% munten per collectielevel

/* ---------- Shop ---------- */
const SHOP_ROT_HOURS = 8;
const SHOP_ROT_REFRESH = 20;
const SHOP_FIXED = {
  tickets: [
    { id: 't-basic', text: 'Basic Ticket', cost: { coins: 900 }, reward: { tickets: { basic: 1 } } },
    { id: 't-rare', text: 'Rare Ticket', cost: { coins: 2800 }, reward: { tickets: { rare: 1 } } },
    { id: 't-epic', text: 'Epic Ticket', cost: { coins: 6000 }, reward: { tickets: { epic: 1 } } },
    { id: 't-leg', text: 'Legendary Ticket', cost: { gems: 70 }, reward: { tickets: { legendary: 1 } } },
    { id: 't-myth', text: 'Mythic Ticket', cost: { gems: 130 }, reward: { tickets: { mythic: 1 } } },
    { id: 't-cos', text: 'Kosmisch Ticket', cost: { gems: 200 }, reward: { tickets: { cosmic: 1 } } },
    { id: 't-exo', text: 'Exotic Ticket', cost: { gems: 55 }, reward: { tickets: { exotic: 1 } } },
  ],
  tokens: [
    { id: 'tk-1', text: '1 Trait Token', cost: { coins: 3500 }, reward: { tokens: 1 }, limit: 3, per: 'day' },
    { id: 'tk-5', text: '5 Trait Tokens', cost: { gems: 110 }, reward: { tokens: 5 } },
    { id: 'tk-12', text: '12 Trait Tokens', cost: { gems: 240 }, reward: { tokens: 12 } },
  ],
  currency: [
    { id: 'c-coins1', text: '5.000 munten', cost: { gems: 40 }, reward: { coins: 5000 } },
    { id: 'c-coins2', text: '22.000 munten', cost: { gems: 160 }, reward: { coins: 22000 } },
    { id: 'c-coins3', text: '75.000 munten', cost: { gems: 500 }, reward: { coins: 75000 } },
    { id: 'c-gems', text: '25 Gems', cost: { coins: 15000 }, reward: { gems: 25 }, limit: 4, per: 'week' },
    { id: 'c-raid', text: '25 Raidtokens', cost: { gems: 100 }, reward: { raidTokens: 25 } },
  ],
};
const HERO_SHOP_PRICE = { common: { coins: 3000 }, uncommon: { coins: 7000 }, rare: { coins: 15000 }, epic: { gems: 250 }, legendary: { gems: 600 }, mythic: { gems: 1400 } };
const DEAL_POOL = [
  { id: 'd-hero', name: 'Held + Tickets', make: (rng, wk) => { const L = HEROES.filter(h => h.rarity === 'legendary' && !h.exclusive); const H = L[Math.floor(rng() * L.length)]; return { text: `${H.name} + 3 Epic Tickets`, cost: { gems: 650 }, reward: { hero: H.id, tickets: { epic: 3 } }, hero: H.id }; } },
  { id: 'd-skin', name: 'Skin + Valuta', make: rng => { const S = SKINS.filter(s => s.shop); const K = S[Math.floor(rng() * S.length)]; return { text: `Skin "${K.name}" + 15.000 munten`, cost: { gems: 210 }, reward: { skin: K.id, coins: 15000 }, skin: K.id }; } },
  { id: 'd-gacha', name: 'Gacha-bundel', make: () => ({ text: '5 Legendary + 5 Epic Tickets', cost: { gems: 420 }, reward: { tickets: { legendary: 5, epic: 5 } } }) },
  { id: 'd-trait', name: 'Trait-bundel', make: () => ({ text: '15 Trait Tokens', cost: { gems: 260 }, reward: { tokens: 15 } }) },
  { id: 'd-myth', name: 'Mythische bundel', make: () => ({ text: '3 Mythic Tickets + 5 Trait Tokens', cost: { gems: 420 }, reward: { tickets: { mythic: 3 }, tokens: 5 } }) },
  { id: 'd-exo', name: 'Exotische bundel', make: () => ({ text: '5 Exotic Tickets + 100.000 munten', cost: { gems: 330 }, reward: { tickets: { exotic: 5 }, coins: 100000 } }) },
];
const STARTER_DEAL = { id: 'starter', text: 'Starterspakket: 3 Rare Tickets, 5 Trait Tokens en 50 Gems', cost: { coins: 4000 }, reward: { tickets: { rare: 3 }, tokens: 5, gems: 50 }, maxLevel: 15 };

/* ---------- Nieuwe achievements, quests, ranglijsten, login ---------- */
ACHIEVEMENTS.push(
  { id: 'wereld2', name: 'Voorbij de Sterren', text: 'Speel wereld 2 vrij', check: () => Progress.mapUnlocked(WORLD1_COUNT), reward: { gems: 50 }, color: '#f472b6' },
  { id: 'wereld2klaar', name: 'Sterrenredder', text: 'Haal alle maps van wereld 2 op Normaal', check: () => MAPS.slice(WORLD1_COUNT).every(m => Progress.clearedAtLeast(m.id, 1)), reward: { gems: 200, title: 'kosmonaut' }, color: '#38bdf8' },
  { id: 'waanzin', name: 'Waanzinnig', text: 'Win een map op Waanzin', check: () => MAPS.some(m => Progress.clearedAtLeast(m.id, 4)), reward: { gems: 100, tokens: 3 }, color: '#f97316' },
  { id: 'afgrond', name: 'Afgrondloper', text: 'Win een map op Afgrond', check: () => MAPS.some(m => Progress.cleared(m.id, 6)), reward: { gems: 400, title: 'afgrond' }, color: '#7f1d1d' },
  { id: 'eerstesecret', name: 'Het Geheim', text: 'Verzamel een Secret held', check: (s, D) => ownsRarity(D, 'secret'), reward: { gems: 500, title: 'geheim' }, color: '#f5f5f5' },
  { id: 'dungeon5', name: 'Diepgraver', text: 'Voltooi diepte 5 in de Dungeon', check: s => (s.dungeonBest || 0) >= 5, reward: { gems: 150 }, color: '#65a30d' },
  { id: 'dungeon10', name: 'Bodem Bereikt', text: 'Voltooi diepte 10 in de Dungeon', check: s => (s.dungeonBest || 0) >= 10, reward: { gems: 400, tickets: { exotic: 2 } }, color: '#14532d' },
  { id: 'collectie5', name: 'Collectioneur', text: 'Bereik collectielevel 5', check: (s, D) => collectionInfo(D).level >= 5, reward: { gems: 100 }, color: '#a78bfa' },
  { id: 'collectie10', name: 'Grootverzamelaar', text: 'Bereik collectielevel 10', check: (s, D) => collectionInfo(D).level >= 10, reward: { gems: 300, title: 'verzamelaar2' }, color: '#7c3aed' },
  { id: 'shopper', name: 'Klant van de Maand', text: 'Koop 10 dingen in de Shop', check: s => (s.shopBuys || 0) >= 10, reward: { gems: 60 }, color: '#f59e0b' },
);
for (const a of ACHIEVEMENTS) { if (!a.reward.gems && !a.reward.tickets) a.reward.gems = 20; }
QUESTS.push(
  { id: 'dungeon', text: n => `Voltooi dungeon-diepte ${n}`, stat: 'dungeonBest', tiers: [1, 3, 6, 10], reward: i => ({ gems: 60 * (i + 1), tokens: i + 1 }) },
  { id: 'elites', text: n => `Versla ${fmt(n)} elite-vijanden`, stat: 'elites', tiers: [25, 150, 600, 2000], reward: i => ({ gems: 40 * (i + 1), coins: 1000 * (i + 1) }) },
);
QUESTS.forEach(q => { const f = q.reward; q.reward = i => Object.assign({ gems: 10 * (i + 1) }, f(i)); });
LB_CATS.push({ id: 'dungeon', name: 'Dungeon-diepte', unit: 'diepte' });
LOGIN_CAL.forEach((r, i) => { r.gems = (r.gems || 0) + ((i + 1) % 7 === 0 ? 30 : 5); });
WEEKLY_POOL.forEach(c => { c.reward.gems = (c.reward.gems || 0) + 40; });
DAILY_POOL.forEach(c => { c.reward.gems = (c.reward.gems || 0) + 5; });
