// ===================== DATA =====================
const RARITIES = [
  { id: 'common',    name: 'Common',    color: '#aab3be', weight: 40, price: 1, tier: 0 },
  { id: 'uncommon',  name: 'Uncommon',  color: '#43d17a', weight: 27, price: 2, tier: 1 },
  { id: 'rare',      name: 'Rare',      color: '#4b95ff', weight: 17, price: 3, tier: 2 },
  { id: 'epic',      name: 'Epic',      color: '#b06bff', weight: 9,  price: 5, tier: 3 },
  { id: 'legendary', name: 'Legendary', color: '#ffc53d', weight: 5,  price: 7, tier: 4 },
  { id: 'mythic',    name: 'Mythic',    color: '#ff3d4f', weight: 2,  price: 9, tier: 5 },
];
const RAR = Object.fromEntries(RARITIES.map(r => [r.id, r]));

const TAGS = {
  Volk: '#d9b77a', Krijger: '#e0694f', Schutter: '#7fd36b', 'Magiër': '#8f7bff',
  Beschermer: '#7fb4d6', Schaduw: '#a07ab8', Heilig: '#ffe08a', Ondood: '#7de0b0', Beest: '#e39a4c',
};

// role: melee | ranged | healer | support.  rng in cells (melee ~0.4 = touching).  as = attacks/sec. ms = cells/sec.
const UNITS = [
  // ---------- COMMON ----------
  { id: 'militia', name: 'Militieman', rar: 'common', role: 'melee', tags: ['Volk', 'Krijger'],
    hp: 270, dmg: 19, as: 1.0, ms: 1.5, rng: 0.4, sp: 'together', spName: 'Samen Sterk',
    spDesc: '+6% damage per andere levende Volk-unit (max +30%).',
    look: { body: '#7b5a3c', skin: '#f1c27d', hat: 'cap', hatC: '#9aa4ad', weapon: 'spear' } },
  { id: 'archer', name: 'Boogschutter', rar: 'common', role: 'ranged', tags: ['Volk', 'Schutter'],
    hp: 150, dmg: 17, as: 0.9, ms: 1.4, rng: 4, proj: 'arrow', sp: 'volley', spName: 'Salvo',
    spDesc: 'Elke 4e aanval schiet ook een pijl op een tweede vijand.',
    look: { body: '#3f7a3a', skin: '#f1c27d', hat: 'hood', hatC: '#2f5e2b', weapon: 'bow' } },
  { id: 'squire', name: 'Schildknaap', rar: 'common', role: 'melee', tags: ['Volk', 'Beschermer'],
    hp: 390, dmg: 11, as: 0.9, ms: 1.3, rng: 0.4, taunt: 1.6, sp: 'shieldwall', spName: 'Schildmuur',
    spDesc: 'Neemt 30% minder ranged damage. Lokt vijanden dichtbij naar zich toe.',
    look: { body: '#6c7a89', skin: '#f1c27d', hat: 'helm', hatC: '#b8c2cc', weapon: 'sword', off: 'round', offC: '#8b5a2b' } },
  { id: 'goblin', name: 'Goblin Rover', rar: 'common', role: 'melee', tags: ['Volk', 'Schaduw'],
    hp: 150, dmg: 15, as: 1.5, ms: 2.3, rng: 0.4, size: 0.85, sp: 'dodge', spName: 'Glibberig',
    spDesc: '25% kans om een aanval te ontwijken.',
    look: { body: '#5a4632', skin: '#7fbf4d', hat: 'bandana', hatC: '#c0392b', weapon: 'dagger', ears: true } },
  { id: 'acolyte', name: 'Acoliet', rar: 'common', role: 'healer', tags: ['Volk', 'Heilig'],
    hp: 165, dmg: 8, heal: 22, as: 0.8, ms: 1.3, rng: 3, proj: 'holy', sp: 'prayer', spName: 'Gebed',
    spDesc: 'Geneest de bondgenoot die het er het slechtst aan toe is.',
    look: { body: '#e8e2d0', skin: '#f1c27d', hat: 'hood', hatC: '#d4c9ab', weapon: 'staff', gem: '#9be7ff' } },
  { id: 'wolf', name: 'Grijze Wolf', rar: 'common', role: 'melee', tags: ['Beest'],
    hp: 240, dmg: 17, as: 1.2, ms: 2.5, rng: 0.4, sp: 'pack', spName: 'Roedel',
    spDesc: '+12% attack speed per ander levend Beest (max +36%).',
    look: { creature: 'wolf', body: '#8d8f99' } },

  // ---------- UNCOMMON ----------
  { id: 'knight', name: 'Ridder', rar: 'uncommon', role: 'melee', tags: ['Krijger', 'Beschermer'],
    hp: 470, dmg: 28, as: 0.85, ms: 1.5, rng: 0.4, sp: 'charge', spName: 'Charge',
    spDesc: 'Stormt sneller op de vijand af. Eerste klap doet dubbele damage en stunt 0,8s.',
    look: { body: '#9aa7b5', skin: '#f1c27d', hat: 'plume', hatC: '#cfd8e0', plume: '#d33', weapon: 'sword', cape: '#2b4fa8' } },
  { id: 'assassin', name: 'Sluipmoordenaar', rar: 'uncommon', role: 'melee', tags: ['Schaduw'],
    hp: 200, dmg: 40, as: 1.0, ms: 2.4, rng: 0.4, crit: 0.3, sp: 'shadowstep', spName: 'Schaduwsprong',
    spDesc: 'Springt bij de start achter de zwakste ranged vijand. 30% crit. Negeert taunts.',
    look: { body: '#2a2433', skin: '#d8b08c', hat: 'hood', hatC: '#1b1722', weapon: 'dagger', off: 'dagger', mask: true } },
  { id: 'priestess', name: 'Priesteres', rar: 'uncommon', role: 'healer', tags: ['Heilig'],
    hp: 220, dmg: 10, heal: 32, as: 0.75, ms: 1.3, rng: 3.5, proj: 'holy', sp: 'blessing', spName: 'Zegening',
    spDesc: 'Overtollige healing wordt een schild (max 40).',
    look: { body: '#f4efe3', skin: '#f6d2b0', hat: 'mitre', hatC: '#e6c65a', weapon: 'staff', gem: '#ffe680', cape: '#e6c65a' } },
  { id: 'berserker', name: 'Berserker', rar: 'uncommon', role: 'melee', tags: ['Krijger'],
    hp: 400, dmg: 26, as: 0.95, ms: 1.7, rng: 0.4, size: 1.05, sp: 'bloodlust', spName: 'Bloeddorst',
    spDesc: 'Hoe minder HP, hoe sterker: tot +100% damage en +50% attack speed.',
    look: { body: '#8a3f22', skin: '#e0a877', hat: 'horns', hatC: '#ddd2b8', weapon: 'axe', beard: '#b5531f' } },
  { id: 'crossbow', name: 'Kruisboogschutter', rar: 'uncommon', role: 'ranged', tags: ['Schutter'],
    hp: 200, dmg: 38, as: 0.55, ms: 1.3, rng: 5, proj: 'bolt', sp: 'piercer', spName: 'Pantserbreker',
    spDesc: 'Negeert damage-reductie. +60% damage tegen units met 600+ max HP.',
    look: { body: '#5b4636', skin: '#f1c27d', hat: 'cap', hatC: '#6f7f5a', weapon: 'crossbow' } },
  { id: 'drummer', name: 'Oorlogstrommelaar', rar: 'uncommon', role: 'support', tags: ['Volk', 'Krijger'],
    hp: 260, dmg: 12, as: 1.0, ms: 1.4, rng: 2.5, proj: 'note', sp: 'rhythm', spName: 'Ritme',
    spDesc: 'Bondgenoten binnen 2,5 vakjes krijgen +20% attack speed.',
    look: { body: '#b23a48', skin: '#f1c27d', hat: 'plume', hatC: '#333', plume: '#f2c14e', weapon: 'drum' } },

  // ---------- RARE ----------
  { id: 'tank', name: 'Bolwerk', rar: 'rare', role: 'melee', tags: ['Beschermer'],
    hp: 950, dmg: 16, as: 0.7, ms: 1.0, rng: 0.4, size: 1.25, dr: 0.2, taunt: 3, sp: 'taunt', spName: 'Provoceren',
    spDesc: 'Vijanden binnen 3 vakjes moeten hem aanvallen. 20% damage-reductie.',
    look: { body: '#5d6873', skin: '#e0b48a', hat: 'greathelm', hatC: '#8d98a3', weapon: 'mace', off: 'tower', offC: '#4a5560' } },
  { id: 'firemage', name: 'Vuurmagiër', rar: 'rare', role: 'ranged', tags: ['Magiër'],
    hp: 230, dmg: 34, as: 0.6, ms: 1.3, rng: 4, splash: 1.1, proj: 'fire', sp: 'fireball', spName: 'Vuurbal',
    spDesc: 'Vuurballen raken een gebied en laten vijanden branden.',
    look: { body: '#b8321e', skin: '#f1c27d', hat: 'wizard', hatC: '#7e1d10', weapon: 'staff', gem: '#ff8a2b', beard: '#ddd' } },
  { id: 'necro', name: 'Necromancer', rar: 'rare', role: 'ranged', tags: ['Magiër', 'Ondood'],
    hp: 250, dmg: 21, as: 0.8, ms: 1.3, rng: 3.5, proj: 'shadow', spCd0: 5, sp: 'raise', spName: 'Dodenwekker',
    spDesc: 'Elke 9s wekt hij de laatst gevallen bondgenoot 10s op (50% HP). Anders een skelet.',
    look: { body: '#2e2a3a', skin: '#c9c3d6', hat: 'hood', hatC: '#1e1b29', weapon: 'scythe', gem: '#7dff9b' } },
  { id: 'frostwitch', name: 'IJsheks', rar: 'rare', role: 'ranged', tags: ['Magiër'],
    hp: 250, dmg: 23, as: 0.8, ms: 1.3, rng: 4, proj: 'frost', sp: 'frost', spName: 'Winterbeet',
    spDesc: 'Aanvallen vertragen 35%. Elke 4e aanval bevriest het doel 1,5s.',
    look: { body: '#3d78b8', skin: '#dff3ff', hat: 'wizard', hatC: '#24548c', weapon: 'staff', gem: '#bff3ff', hair: '#e8f6ff' } },
  { id: 'paladin', name: 'Paladijn', rar: 'rare', role: 'melee', tags: ['Beschermer', 'Heilig'],
    hp: 620, dmg: 24, as: 0.8, ms: 1.3, rng: 0.4, size: 1.1, sp: 'aura', spName: 'Heilige Aura',
    spDesc: 'Bondgenoten binnen 2 vakjes herstellen 7 HP per seconde.',
    look: { body: '#d9dde3', skin: '#f1c27d', hat: 'helm', hatC: '#e8c45a', weapon: 'hammer', cape: '#f4f4f4' } },
  { id: 'griffin', name: 'Griffioen', rar: 'rare', role: 'melee', tags: ['Beest'],
    hp: 480, dmg: 32, as: 1.0, ms: 2.6, rng: 0.4, size: 1.2, fly: true, sp: 'dive', spName: 'Duikvlucht',
    spDesc: 'Vliegt snel naar voren. Eerste aanval doet driedubbele damage.',
    look: { creature: 'griffin', body: '#c8a050' } },

  // ---------- EPIC ----------
  { id: 'golem', name: 'Steengolem', rar: 'epic', role: 'melee', tags: ['Beschermer'],
    hp: 1350, dmg: 50, as: 0.4, ms: 0.75, rng: 0.4, size: 1.5, dr: 0.2, cc: true, splash: 0.9, sp: 'stone', spName: 'Stenen Huid',
    spDesc: 'Immuun voor stun en freeze. 25% damage-reductie. Klappen raken een gebied.',
    look: { creature: 'golem', body: '#857b6d' } },
  { id: 'elf', name: 'Elfenjager', rar: 'epic', role: 'ranged', tags: ['Schutter'],
    hp: 250, dmg: 42, as: 0.75, ms: 1.5, rng: 6, crit: 0.3, critMul: 2.5, proj: 'arrow', sp: 'headshot', spName: 'Kopschot',
    spDesc: 'Mikt op de zwakste vijand. 30% kans op x2,5 crit. Negeert taunts.',
    look: { body: '#2f6a4f', skin: '#f3d6b4', hat: 'elf', hatC: '#f2e3a0', weapon: 'bow', cape: '#1f4a36' } },
  { id: 'shaman', name: 'Stormsjamaan', rar: 'epic', role: 'ranged', tags: ['Magiër'],
    hp: 300, dmg: 32, as: 0.7, ms: 1.3, rng: 4, proj: 'zap', sp: 'chain', spName: 'Kettingbliksem',
    spDesc: 'Bliksem springt over naar 2 extra vijanden.',
    look: { body: '#4b3b7a', skin: '#c79a74', hat: 'feather', hatC: '#4fd2ff', weapon: 'staff', gem: '#8ef' } },
  { id: 'vampire', name: 'Vampierheer', rar: 'epic', role: 'melee', tags: ['Ondood', 'Schaduw'],
    hp: 620, dmg: 36, as: 0.9, ms: 1.8, rng: 0.4, ls: 0.4, sp: 'drain', spName: 'Levensroof',
    spDesc: 'Herstelt 40% van zijn damage als HP.',
    look: { body: '#3a0d1a', skin: '#e8e0ea', hat: 'none', hair: '#15101a', weapon: 'sword', cape: '#8b0012', collar: true } },

  // ---------- LEGENDARY ----------
  { id: 'phoenix', name: 'Feniks', rar: 'legendary', role: 'ranged', tags: ['Beest', 'Heilig'],
    hp: 560, dmg: 34, as: 0.8, ms: 1.8, rng: 3, splash: 0.8, fly: true, size: 1.2, proj: 'fire', sp: 'rebirth', spName: 'Wedergeboorte',
    spDesc: 'Herrijst één keer uit zijn as met 60% HP. Vuur laat vijanden branden.',
    look: { creature: 'phoenix', body: '#ff7b1c' } },
  { id: 'champion', name: 'Kampioen', rar: 'legendary', role: 'melee', tags: ['Krijger'],
    hp: 950, dmg: 40, as: 0.85, ms: 1.5, rng: 0.4, size: 1.2, spCd0: 5, sp: 'warcry', spName: 'Strijdkreet',
    spDesc: 'Alle bondgenoten +15% damage. Elke 8s een wervelslag (150% damage rondom).',
    look: { body: '#b89236', skin: '#e8b98a', hat: 'crown', hatC: '#ffd75a', weapon: 'greatsword', cape: '#7a1020' } },
  { id: 'archmage', name: 'Aartsmagiër', rar: 'legendary', role: 'ranged', tags: ['Magiër'],
    hp: 380, dmg: 46, as: 0.6, ms: 1.3, rng: 5, splash: 1.2, proj: 'arcane', sp: 'nova', spName: 'Arcane Nova',
    spDesc: 'Elke 3e spreuk is een nova: dubbele damage in een groot gebied.',
    look: { body: '#4c2a8a', skin: '#f1c27d', hat: 'wizard', hatC: '#2c1860', weapon: 'staff', gem: '#d6b8ff', beard: '#f2f2f2', stars: true } },

  // ---------- MYTHIC ----------
  { id: 'dragon', name: 'Oerdraak', rar: 'mythic', role: 'ranged', tags: ['Beest'],
    hp: 1800, dmg: 40, as: 0.6, ms: 1.2, rng: 3, splash: 1.3, fly: true, size: 1.9, proj: 'breath', sp: 'breath', spName: 'Drakenvuur',
    spDesc: 'Spuwt vuur over een groot gebied en laat alles branden.',
    look: { creature: 'dragon', body: '#c3262f' } },
  { id: 'titan', name: 'Leegtetitaan', rar: 'mythic', role: 'melee', tags: ['Ondood'],
    hp: 2300, dmg: 48, as: 0.5, ms: 0.9, rng: 0.5, size: 1.85, dr: 0.15, cc: true, spCd0: 4, sp: 'void', spName: 'Leegtegreep',
    spDesc: 'Elke 8s trekt hij alle vijanden binnen 4 vakjes naar zich toe en stunt ze. Geneest bij kills.',
    look: { creature: 'titan', body: '#2b1f45' } },
];
const SKELETON = { id: 'skeleton', name: 'Skelet', rar: 'common', role: 'melee', tags: [], hp: 130, dmg: 13, as: 1.0, ms: 1.5, rng: 0.4,
  sp: 'none', spName: '', spDesc: 'Opgeroepen dienaar.', look: { creature: 'skeleton', body: '#e8e2cf' }, summon: true };
const RECRUIT = { id: 'recruit', name: 'Rekruut', rar: 'common', role: 'melee', tags: [], hp: 230, dmg: 15, as: 1.0, ms: 1.5, rng: 0.4,
  sp: 'none', spName: 'Gratis', spDesc: 'Iedere ronde krijg je één gratis Rekruut. Geen tags, wel een extra lichaam.',
  look: { body: '#6b5a48', skin: '#f1c27d', hat: 'none', hair: '#5a3a1e', weapon: 'club' }, free: true };
const UNIT = Object.fromEntries(UNITS.concat([SKELETON, RECRUIT]).map(u => [u.id, u]));

// ---------------- BUFFS ----------------
const isRanged = u => u.def.role !== 'melee';
const BUFFS = [
  { id: 'sharp', name: 'Scherpe Klingen', rar: 'common', target: 'team', icon: 'sharp',
    desc: 'Alle units +15% damage.', apply: u => { u.dmgM += 0.15; } },
  { id: 'iron', name: 'IJzeren Huid', rar: 'common', target: 'team', icon: 'iron',
    desc: 'Alle units +20% HP.', apply: u => { u.hpM += 0.2; } },
  { id: 'swift', name: 'Snelle Voeten', rar: 'common', target: 'team', icon: 'swift',
    desc: 'Units bewegen 25% sneller en vallen 10% sneller aan.', apply: u => { u.msM += 0.25; u.asM += 0.1; } },
  { id: 'eagle', name: 'Arendsoog', rar: 'common', target: 'team', icon: 'eagle',
    desc: 'Ranged units en healers: +1 range en +20% damage.', apply: u => { if (isRanged(u)) { u.rngA += 1; u.dmgM += 0.2; } } },
  { id: 'crit', name: 'Kritieke Slag', rar: 'uncommon', target: 'team', icon: 'crit',
    desc: 'Alle units +15% kans op een critical hit (x2).', apply: u => { u.crit += 0.15; } },
  { id: 'regen', name: 'Regeneratie', rar: 'uncommon', target: 'team', icon: 'regen',
    desc: 'Units herstellen 1,2% van hun max HP per seconde.', apply: u => { u.regen += 0.012; } },
  { id: 'fire', name: 'Vuurwapens', rar: 'uncommon', target: 'team', icon: 'fire',
    desc: 'Aanvallen doen +5 fire damage en laten 3s branden.', apply: u => { u.fire += 1; } },
  { id: 'thorns', name: 'Doornenpantser', rar: 'uncommon', target: 'team', icon: 'thorns',
    desc: 'Melee-aanvallers krijgen 30% van hun damage terug.', apply: u => { u.thorns += 0.3; } },
  { id: 'folk', name: 'Volksleger', rar: 'uncommon', target: 'team', icon: 'folk',
    desc: 'Volk-units +30% HP en +30% damage. Goedkoop is sterk!', apply: u => { if (u.def.tags.includes('Volk')) { u.hpM += 0.3; u.dmgM += 0.3; } } },
  { id: 'venom', name: 'Giftige Klingen', rar: 'uncommon', target: 'team', icon: 'venom',
    desc: 'Aanvallen vergiftigen (6 dmg/s, 4s) en halveren healing op het doel.', apply: u => { u.poison += 1; } },
  { id: 'vamp', name: 'Vampirisme', rar: 'rare', target: 'team', icon: 'vamp',
    desc: 'Units herstellen 18% van hun damage als HP.', apply: u => { u.ls += 0.18; } },
  { id: 'giant', name: 'Reuzengroei', rar: 'rare', target: 'unit', icon: 'giant',
    desc: 'Eén unit wordt groter: +70% HP en +40% damage.', apply: u => { u.hpM += 0.7; u.dmgM += 0.4; u.size *= 1.3; } },
  { id: 'banner', name: 'Strijdbanier', rar: 'rare', target: 'team', icon: 'banner',
    desc: 'Alle units +12% HP, damage en attack speed.', apply: u => { u.hpM += 0.12; u.dmgM += 0.12; u.asM += 0.12; } },
  { id: 'holy', name: 'Heilig Licht', rar: 'rare', target: 'team', icon: 'holy',
    desc: 'Alle healing +50%. Heilig-units +20% HP.', apply: u => { if (u.def.tags.includes('Heilig')) u.hpM += 0.2; },
    teamApply: T => { T.healM += 0.5; } },
  { id: 'hero', name: 'Heldenmoed', rar: 'epic', target: 'unit', icon: 'hero',
    desc: 'Eén unit: +100% HP, +50% damage en immuun voor stun/freeze.', apply: u => { u.hpM += 1; u.dmgM += 0.5; u.cc = true; u.size *= 1.12; } },
  { id: 'martyr', name: 'Laatste Wraak', rar: 'epic', target: 'team', icon: 'martyr',
    desc: 'Valt er een bondgenoot, dan krijgt de rest +10% damage en attack speed (max 5x).', apply: () => {}, teamApply: T => { T.martyr = true; } },
  { id: 'gods', name: 'Godenzegen', rar: 'legendary', target: 'team', icon: 'gods',
    desc: 'Alle units +25% HP, damage en attack speed.', apply: u => { u.hpM += 0.25; u.dmgM += 0.25; u.asM += 0.25; } },
  { id: 'soul', name: 'Ziel van de Feniks', rar: 'mythic', target: 'team', icon: 'soul',
    desc: 'Elke unit staat één keer weer op met 35% HP.', apply: u => { u.soul = true; } },
];
const BUFF = Object.fromEntries(BUFFS.map(b => [b.id, b]));

// ---------------- ABILITIES ----------------
// target: none | point | ally (teleport)
const ABILITIES = [
  { id: 'heal', name: 'Heling', rar: 'common', cd: 14, target: 'none', icon: 'heal', color: '#5dff9a',
    desc: 'Geneest alle eigen units voor 25% van hun max HP.' },
  { id: 'shield', name: 'Schild', rar: 'common', cd: 15, target: 'none', icon: 'shield', color: '#9fe3ff',
    desc: 'Alle eigen units krijgen 6s een schild (60 + 15% max HP).' },
  { id: 'tele', name: 'Teleport', rar: 'common', cd: 8, target: 'ally', icon: 'tele', color: '#c58bff',
    desc: 'Klik een eigen unit en daarna een plek: hij teleporteert erheen.' },
  { id: 'arrows', name: 'Pijlenregen', rar: 'common', cd: 11, target: 'point', radius: 1.6, icon: 'arrows', color: '#e8d6a8',
    desc: 'Vijf golven pijlen (22 dmg per golf) in een gebied.' },
  { id: 'freeze', name: 'Bevriezing', rar: 'uncommon', cd: 16, target: 'point', radius: 2, icon: 'freeze', color: '#bff3ff',
    desc: 'Bevriest vijanden in een gebied 2,5s en doet 20 damage.' },
  { id: 'lightning', name: 'Bliksem', rar: 'uncommon', cd: 11, target: 'none', icon: 'lightning', color: '#fff27a',
    desc: 'Bliksem springt langs 5 vijanden: 80 damage per treffer.' },
  { id: 'rage', name: 'Woede', rar: 'uncommon', cd: 18, target: 'none', icon: 'rage', color: '#ff5a3c',
    desc: 'Je team krijgt 5s +50% damage en +25% attack speed.' },
  { id: 'curse', name: 'Vloek', rar: 'uncommon', cd: 14, target: 'point', radius: 1.7, icon: 'curse', color: '#b45cff',
    desc: 'Vijanden in het gebied krijgen 6s lang 40% meer damage.' },
  { id: 'meteor', name: 'Meteoor', rar: 'rare', cd: 15, target: 'point', radius: 1.5, icon: 'meteor', color: '#ff8a2b',
    desc: 'Een meteoriet slaat in: 220 damage in een gebied en brand.' },
  { id: 'poison', name: 'Gifwolk', rar: 'rare', cd: 16, target: 'point', radius: 1.8, icon: 'poison', color: '#8dff5a',
    desc: 'Giftige wolk (6s): 28 damage/s en 30% vertraging.' },
  { id: 'skeletons', name: 'Dodenmars', rar: 'rare', cd: 20, target: 'point', radius: 0.8, icon: 'skeletons', color: '#e8e2cf',
    desc: 'Roept 3 skeletten op een gekozen plek op (15s).' },
  { id: 'quake', name: 'Aardbeving', rar: 'rare', cd: 20, target: 'none', icon: 'quake', color: '#c99a5b',
    desc: 'Alle vijanden krijgen 60 damage en worden 1,2s gestund.' },
  { id: 'warp', name: 'Tijdverdraaiing', rar: 'epic', cd: 22, target: 'none', icon: 'warp', color: '#7ef0ff',
    desc: 'Vijanden bewegen en vallen 5s lang 50% trager aan.' },
  { id: 'blood', name: 'Bloedmaan', rar: 'epic', cd: 20, target: 'none', icon: 'blood', color: '#ff2a4a',
    desc: 'Je team krijgt 6s 50% lifesteal en +20% damage.' },
  { id: 'smite', name: 'Hemelstraal', rar: 'epic', cd: 14, target: 'point', radius: 1.2, icon: 'smite', color: '#fff3b0',
    desc: 'Straal op de dichtstbijzijnde vijand: 380 damage. Geneest bondgenoten rond de inslag.' },
  { id: 'resurrect', name: 'Massa-Herrijzenis', rar: 'legendary', cd: 35, target: 'none', icon: 'resurrect', color: '#ffe066',
    desc: 'Alle gevallen eigen units staan op met 40% HP.' },
  { id: 'inv', name: 'Goddelijk Schild', rar: 'legendary', cd: 28, target: 'none', icon: 'inv', color: '#ffd84a',
    desc: 'Je hele team is 3s onkwetsbaar.' },
  { id: 'hole', name: 'Zwart Gat', rar: 'mythic', cd: 30, target: 'point', radius: 3, icon: 'hole', color: '#b06bff',
    desc: 'Zuigt vijanden 2,5s naar het midden en implodeert dan (260 damage).' },
];
const ABILITY = Object.fromEntries(ABILITIES.map(a => [a.id, a]));

// ---------------- SYNERGIES ----------------
// f(u, T): applies to unit. tf(T): team-level.
const hasT = (u, t) => u.def.tags.includes(t);
const SYNERGIES = [
  { tag: 'Volk', levels: [
    { n: 3, txt: 'Volk-units +15% HP en damage', f: u => { if (hasT(u, 'Volk')) { u.hpM += 0.15; u.dmgM += 0.15; } } },
    { n: 5, txt: 'Volk-units +35% HP en damage', f: u => { if (hasT(u, 'Volk')) { u.hpM += 0.35; u.dmgM += 0.35; } } }] },
  { tag: 'Krijger', levels: [
    { n: 2, txt: 'Krijgers +15% damage', f: u => { if (hasT(u, 'Krijger')) u.dmgM += 0.15; } },
    { n: 3, txt: 'Krijgers +30% damage en +10% HP', f: u => { if (hasT(u, 'Krijger')) { u.dmgM += 0.3; u.hpM += 0.1; } } }] },
  { tag: 'Schutter', levels: [
    { n: 2, txt: 'Schutters +20% attack speed', f: u => { if (hasT(u, 'Schutter')) u.asM += 0.2; } },
    { n: 3, txt: 'Schutters +35% attack speed en +0,5 range', f: u => { if (hasT(u, 'Schutter')) { u.asM += 0.35; u.rngA += 0.5; } } }] },
  { tag: 'Magiër', levels: [
    { n: 2, txt: 'Magiërs +20% damage', f: u => { if (hasT(u, 'Magiër')) u.dmgM += 0.2; } },
    { n: 3, txt: 'Magiërs +40% damage en groter bereik van splash', f: u => { if (hasT(u, 'Magiër')) { u.dmgM += 0.4; u.splashA += 0.3; } } }] },
  { tag: 'Beschermer', levels: [
    { n: 2, txt: 'Beschermers +20% HP', f: u => { if (hasT(u, 'Beschermer')) u.hpM += 0.2; } },
    { n: 3, txt: 'Beschermers +25% HP, hele team 10% minder damage', f: u => { if (hasT(u, 'Beschermer')) u.hpM += 0.25; }, tf: T => { T.dr += 0.1; } }] },
  { tag: 'Schaduw', levels: [
    { n: 2, txt: 'Schaduw-units +20% crit-kans', f: u => { if (hasT(u, 'Schaduw')) u.crit += 0.2; } },
    { n: 3, txt: 'Schaduw-units +35% crit-kans en +20% damage', f: u => { if (hasT(u, 'Schaduw')) { u.crit += 0.35; u.dmgM += 0.2; } } }] },
  { tag: 'Heilig', levels: [
    { n: 2, txt: 'Alle healing +30%', f: () => {}, tf: T => { T.healM += 0.3; } },
    { n: 3, txt: 'Healing +50% en team regen 0,6%/s', f: u => { u.regen += 0.006; }, tf: T => { T.healM += 0.5; } }] },
  { tag: 'Ondood', levels: [
    { n: 2, txt: 'Ondode units 20% lifesteal en +15% HP', f: u => { if (hasT(u, 'Ondood')) { u.ls += 0.2; u.hpM += 0.15; } } }] },
  { tag: 'Beest', levels: [
    { n: 2, txt: 'Beesten +20% damage en snelheid', f: u => { if (hasT(u, 'Beest')) { u.dmgM += 0.2; u.msM += 0.2; } } },
    { n: 3, txt: 'Beesten +35% damage, +20% snelheid en +15% HP', f: u => { if (hasT(u, 'Beest')) { u.dmgM += 0.35; u.msM += 0.2; u.hpM += 0.15; } } }] },
];
const SYN = Object.fromEntries(SYNERGIES.map(s => [s.tag, s]));

const SAVINGS_PER_EURO = 0.03, SAVINGS_MAX = 0.3;

const AI_NAMES = [
  { name: 'Baron Grimbald', style: 'Agressief', desc: 'Biedt hoog op alles wat glimt.', aggr: 1.18, pref: { unit: 1.1, buff: 0.9, ability: 0.95 }, syn: 0.6, avatar: 'champion' },
  { name: 'Morgana de Sluwe', style: 'Synergie-jager', desc: 'Bouwt combinaties en laat losse pracht liggen.', aggr: 1.0, pref: { unit: 1, buff: 1.1, ability: 1 }, syn: 1.6, avatar: 'archmage' },
  { name: 'Vex de Zuinige', style: 'Spaarzaam', desc: 'Koopt koopjes en houdt geld achter de hand.', aggr: 0.88, pref: { unit: 1.05, buff: 1, ability: 1.05 }, syn: 1.0, avatar: 'necro' },
  { name: 'Lady Ysolde', style: 'Tovenares', desc: 'Dol op spreuken en abilities.', aggr: 1.02, pref: { unit: 0.95, buff: 0.95, ability: 1.35 }, syn: 1.0, avatar: 'frostwitch' },
];
