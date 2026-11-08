/* =========================================================================
 * AGE CLASH: EVOLUTION WAR — data.js
 * Alle game-data (tijdperken, units, towers, upgrades, powers, cosmetics).
 * Alles is data-driven: pas hier waarden aan om de balans te tweaken.
 * ========================================================================= */
var AC = (typeof window !== 'undefined' ? window : globalThis).AC = (typeof window !== 'undefined' ? window : globalThis).AC || {};

AC.CONST = {
  W: 1600, H: 720, GROUND: 596,
  TICK: 1 / 30,
  START_IRON: 500,
  BASE_INCOME: 20,
  INCOME_PER_AGE: 5,          // extra basisinkomen per bereikt tijdperk
  BASE_W: 130,                // breedte van de basis
  BASE_HP: 3000,
  BASE_HP_GROWTH: 1.48,       // basis-HP vermenigvuldiger per tijdperk
  TOWER_SPOTS: [175, 228, 281],
  SPAWN_X: 112,
  STAT_GROWTH: 1.72,          // unit kracht per tijdperk
  COST_GROWTH: 1.4,          // unit prijs per tijdperk
  KILL_BASE: 0.5,             // kill-inkomen = 50% van de prijs van de vijand
  XP_KILL: 0.6, XP_SPAWN: 0.15, XP_TOWER_DMG: 0.08, XP_BASE_DMG: 0.45, XP_PER_SEC: 4,
  // cumulatieve XP die nodig is om tijdperk index+1 te bereiken
  AGE_XP: [0, 1600, 4000, 7600, 12800, 20000, 30000, 44000],
  POWER_CD: 60, POWER_START_CD: 35,
  OVERTIME_1: 13 * 60, SUDDEN_DEATH: 16 * 60,
  SLOT_CD: [2, 2, 4, 4],
};

AC.ROLES = [
  { id: 'melee', name: 'Melee', icon: '⚔', cd: 2 },
  { id: 'ranged', name: 'Ranged', icon: '➶', cd: 2 },
  { id: 'anti', name: 'Anti-Armor', icon: '✸', cd: 4 },
  { id: 'armored', name: 'Armored', icon: '⛨', cd: 4 },
];

/* Basisrollen (stats in tijdperk 1, vóór per-unit modifiers) */
AC.ROLE_BASE = [
  { cost: 60, hp: 130, dmg: 15, cd: 0.9, range: 22, speed: 48, w: 14 },
  { cost: 85, hp: 80, dmg: 12, cd: 1.25, range: 155, speed: 44, w: 14 },
  { cost: 130, hp: 120, dmg: 24, cd: 1.7, range: 45, speed: 40, w: 15, aa: true },
  { cost: 190, hp: 460, dmg: 16, cd: 1.35, range: 24, speed: 32, w: 28, armored: true },
];

/* Matchup-multipliers (regels uit sectie 15) */
AC.MATCHUP = {
  meleeVsRanged: 1.5,     // melee is sterk tegen ranged als hij dichtbij komt
  rangedVsMelee: 1.3,     // ranged is sterk tegen melee
  antiVsArmored: 2.6,     // anti-armor sloopt armored
  antiVsStructure: 1.8,   // anti-armor vs towers en basis
  armorReduction: 0.5,    // armored neemt 50% minder schade (behalve van anti-armor)
};

/* ---------------------------- TIJDPERKEN ---------------------------- */
AC.AGES = [
  {
    id: 'primal', name: 'Primal Dawn', short: 'Primal', era: 'Prehistorie',
    desc: 'Het tijdperk van de apen en primitieve stammen. Rauwe kracht in een dampende jungle.',
    colors: { sky1: '#1f4d3a', sky2: '#8fbf6a', ground: '#4a3520', ground2: '#2f6b2a', accent: '#a3d14a', ui: '#7fb83a' },
    passive: { id: 'speed', val: 0.10, text: '+10% loopsnelheid voor alle units' },
    power: { id: 'rockslide', name: 'Rotslawine', desc: 'Keien regenen neer op de vijandelijke frontlinie.' },
    unlockCost: 0, startOwned: [1, 1, 1, 1],
  },
  {
    id: 'genesis', name: 'Human Genesis', short: 'Genesis', era: 'Steentijd',
    desc: 'De eerste Homo sapiens. Speren, bogen en vuur op de uitgestrekte savanne.',
    colors: { sky1: '#e07b39', sky2: '#f6d38b', ground: '#7a5530', ground2: '#a88a45', accent: '#ffb347', ui: '#e8913a' },
    passive: { id: 'range', val: 0.10, text: '+10% bereik voor ranged units' },
    power: { id: 'volley', name: 'Pijlenregen', desc: 'Een wolk van vuurpijlen valt op de vijand.' },
    unlockCost: 0, startOwned: [1, 1, 1, 1],
  },
  {
    id: 'pharaoh', name: "Pharaoh's Dominion", short: 'Pharaoh', era: 'Oud-Egypte',
    desc: "Farao's, strijdwagens en de goden van de Nijl in een brandende woestijn.",
    colors: { sky1: '#d98a2b', sky2: '#fbe3a1', ground: '#c9a25a', ground2: '#e3c27a', accent: '#ffd34d', ui: '#e0b030' },
    passive: { id: 'bounty', val: 0.15, text: '+15% kill-inkomen' },
    power: { id: 'sandstorm', name: 'Zandstorm', desc: 'Vijanden worden vertraagd en geschuurd door zand.' },
    unlockCost: 0, startOwned: [1, 1, 1, 0],
  },
  {
    id: 'imperium', name: 'Imperium Aeternum', short: 'Imperium', era: 'Romeinse Rijk',
    desc: 'Legioenen, gladiatoren en belegeringswapens van het eeuwige Rome.',
    colors: { sky1: '#6d4b8c', sky2: '#e9b8a0', ground: '#7d6a55', ground2: '#9c8b6e', accent: '#d64545', ui: '#c43c3c' },
    passive: { id: 'armorhp', val: 0.15, text: '+15% HP voor armored units' },
    power: { id: 'testudo', name: 'Testudo-formatie', desc: 'Je units nemen 8 sec. 50% minder schade en genezen.' },
    unlockCost: 0, startOwned: [1, 1, 1, 0],
  },
  {
    id: 'ironfront', name: 'Ironfront Era', short: 'Ironfront', era: 'Industriële oorlog',
    desc: 'Musketten, kanonnen en buskruitrook. De eerste grote legers marcheren.',
    colors: { sky1: '#4c5866', sky2: '#c7b9a0', ground: '#4f4436', ground2: '#6b5d45', accent: '#e0c070', ui: '#8a9bb0' },
    passive: { id: 'towerdmg', val: 0.15, text: '+15% tower-schade' },
    power: { id: 'barrage', name: 'Artilleriebarrage', desc: 'Granaten slaan in over het hele slagveld.' },
    unlockCost: 0, startOwned: [1, 1, 1, 0],
  },
  {
    id: 'neo', name: 'Neo Warfare', short: 'Neo', era: 'Moderne tijd',
    desc: 'Tanks, sluipschutters en raketten in een verwoeste stad.',
    colors: { sky1: '#2b3440', sky2: '#8796a3', ground: '#3a3d40', ground2: '#55595c', accent: '#7cc242', ui: '#6e9c3a' },
    passive: { id: 'income', val: 0.10, text: '+10% automatisch ijzerinkomen' },
    power: { id: 'airstrike', name: 'Luchtaanval', desc: 'Een straaljager bombardeert de vijandelijke linie.' },
    unlockCost: 1200, startOwned: [0, 0, 0, 0],
  },
  {
    id: 'mech', name: 'Mech Rebellion', short: 'Mech', era: 'Robottoekomst',
    desc: 'Gevechtsrobots, lasers en gigantische machines in een neon-metropool.',
    colors: { sky1: '#0b1530', sky2: '#1f4f7a', ground: '#1a2333', ground2: '#26354d', accent: '#33e0ff', ui: '#2cc5e8' },
    passive: { id: 'regen', val: 0.01, text: 'Alle units herstellen 1% HP per seconde' },
    power: { id: 'orbital', name: 'Orbitale Laser', desc: 'Een satellietlaser veegt over het slagveld.' },
    unlockCost: 2000, startOwned: [0, 0, 0, 0],
  },
  {
    id: 'omni', name: 'Omniverse Ascension', short: 'Omniverse', era: 'Multiversum',
    desc: 'Buitenaardse wezens en dimensiewapens tussen botsende werkelijkheden.',
    colors: { sky1: '#12052b', sky2: '#5a1f8a', ground: '#21103a', ground2: '#3b1d63', accent: '#e05cff', ui: '#b44cff' },
    passive: { id: 'dmg', val: 0.10, text: '+10% schade voor alle units' },
    power: { id: 'singularity', name: 'Singulariteit', desc: 'Een zwart gat zuigt vijanden samen en verplettert ze.' },
    unlockCost: 3200, startOwned: [0, 0, 0, 0],
  },
];

/* ------------------------------ UNITS ------------------------------
 * mods: vermenigvuldigers t.o.v. ROLE_BASE.  special: unieke eigenschap.
 * look: renderer-sleutel.  atk: 'melee' | 'proj' | 'beam'.  coin: permanente prijs. */
AC.UNITS = [
  [ // Primal Dawn
    { name: 'Apenstrijder', desc: 'Een woeste aap met een knots. Wordt razend als hij gewond raakt.', look: 'ape', pal: { skin: '#6b4a2e', fur: '#4a3020', wpn: '#7a5a3a' }, atk: 'melee', mods: { hp: 1.0, speed: 1.05 }, special: { id: 'frenzy', mult: 0.6 }, coin: 0 },
    { name: 'Steenwerper', desc: 'Gooit zware keien die vijanden kort kunnen verdoven.', look: 'ape', pal: { skin: '#7a5638', fur: '#5a3a24', wpn: '#888' }, atk: 'proj', proj: 'rock', mods: { range: 0.85 }, special: { id: 'stun', chance: 0.18, dur: 0.5 }, coin: 0 },
    { name: 'Bottenjager', desc: 'Werpt vergiftigde botspiezen die pantser doorboren.', look: 'caveman', pal: { skin: '#a0704a', fur: '#6a4a2a', wpn: '#e8e0c8' }, atk: 'proj', proj: 'bone', mods: { range: 2.0 }, special: { id: 'poison', dps: 0.25, dur: 3 }, coin: 0 },
    { name: 'Mammoet', desc: 'Een gigantische wolharige mammoet. Zijn eerste aanval verplettert en verdooft.', look: 'mammoth', pal: { fur: '#6a4528', tusk: '#efe6cf' }, atk: 'melee', mods: { hp: 1.12, speed: 0.92 }, special: { id: 'charge', mult: 2.2, dur: 0.8 }, w: 36, coin: 0 },
  ],
  [ // Human Genesis
    { name: 'Speerjager', desc: 'Een snelle jager met een speer. Kans op een kritieke steek.', look: 'human', pal: { skin: '#c48a5a', top: '#8a5a2a', bot: '#5a3a1a', wpn: '#b08050' }, gear: { head: 'band' }, atk: 'melee', mods: { range: 1.3 }, special: { id: 'crit', chance: 0.22, mult: 2.0 }, coin: 0 },
    { name: 'Boogschutter', desc: 'Schiet brandende pijlen die vijanden in vuur zetten.', look: 'human', pal: { skin: '#b07a4a', top: '#6a7a3a', bot: '#4a3a1a', wpn: '#7a4a1a' }, gear: { head: 'feather', weapon: 'bow' }, atk: 'proj', proj: 'firearrow', mods: { range: 1.1, hp: 0.92 }, special: { id: 'burn', dps: 0.2, dur: 3 }, coin: 0 },
    { name: 'Lansdrager', desc: 'Zijn lange lans doorboort tot twee vijanden tegelijk.', look: 'human', pal: { skin: '#a8724a', top: '#7a3a2a', bot: '#4a2a1a', wpn: '#ccc' }, gear: { head: 'skull', weapon: 'lance' }, atk: 'melee', mods: { range: 1.0, hp: 1.1 }, special: { id: 'cleave', n: 2 }, coin: 0 },
    { name: 'Schildwacht', desc: 'Draagt een enorm houten schild dat pijlen en stenen afketst.', look: 'human', pal: { skin: '#b07a4a', top: '#5a4a3a', bot: '#3a2a1a', wpn: '#8a6a3a' }, gear: { head: 'fur', shield: 'wood', big: true }, atk: 'melee', mods: { hp: 1.0 }, special: { id: 'shield', red: 0.4 }, w: 23, coin: 0 },
  ],
  [ // Pharaoh's Dominion
    { name: 'Khopesh-krijger', desc: 'Egyptische zwaardvechter wiens sikkelzwaard levenskracht steelt.', look: 'human', pal: { skin: '#a8703f', top: '#f0e6c8', bot: '#e0c060', wpn: '#d8b040' }, gear: { head: 'nemes', weapon: 'khopesh' }, atk: 'melee', mods: { hp: 1.05 }, special: { id: 'lifesteal', frac: 0.3 }, coin: 0 },
    { name: 'Nijl-boogschutter', desc: 'Elite boogschutter die twee pijlen tegelijk afvuurt.', look: 'human', pal: { skin: '#9a6538', top: '#f4ecd0', bot: '#3a6ab0', wpn: '#7a4a1a' }, gear: { head: 'nemesBlue', weapon: 'bow' }, atk: 'proj', proj: 'arrow', mods: { dmg: 0.7 }, special: { id: 'multishot', n: 2 }, coin: 0 },
    { name: 'Anubis-jager', desc: 'Jakhalskrijger met een glaive. Executeert verzwakte vijanden.', look: 'human', pal: { skin: '#222', top: '#d8b040', bot: '#1a1a1a', wpn: '#d8b040' }, gear: { head: 'jackal', weapon: 'glaive' }, atk: 'melee', mods: { range: 1.1 }, special: { id: 'execute', below: 0.35, mult: 2.0 }, coin: 0 },
    { name: 'Oorlogswagen', desc: 'Snelle strijdwagen die met volle vaart de vijand ramt.', look: 'chariot', pal: { wood: '#8a5a2a', gold: '#e0b030', horse: '#6a4a30' }, atk: 'melee', mods: { speed: 1.45, hp: 0.95 }, special: { id: 'charge', mult: 2.5, dur: 0.6 }, w: 39, coin: 300 },
  ],
  [ // Imperium Aeternum
    { name: 'Legionair', desc: 'Gedisciplineerde soldaat. Nabije bondgenoten doen meer schade.', look: 'human', pal: { skin: '#c48a5a', top: '#b02a2a', bot: '#8a6a4a', wpn: '#ccc' }, gear: { head: 'galea', shield: 'scutum', weapon: 'gladius' }, atk: 'melee', mods: { hp: 1.08 }, special: { id: 'rally', radius: 90, bonus: 0.12 }, coin: 0 },
    { name: 'Sagittarius', desc: 'Romeinse boogschutter wiens salvo\'s een klein gebied raken.', look: 'human', pal: { skin: '#c08050', top: '#8a2a2a', bot: '#7a6a4a', wpn: '#7a4a1a' }, gear: { head: 'helmet', weapon: 'bow' }, atk: 'proj', proj: 'arrow', mods: {}, special: { id: 'splash', radius: 40, frac: 0.5 }, coin: 0 },
    { name: 'Ballista-eenheid', desc: 'Belegeringswapen dat met één bout meerdere vijanden doorboort.', look: 'ballista', pal: { wood: '#7a5530', metal: '#999', cloth: '#b02a2a' }, atk: 'proj', proj: 'bolt', mods: { range: 4.6, cd: 1.5, dmg: 1.45, speed: 0.8 }, special: { id: 'pierce', len: 90 }, w: 31, coin: 0 },
    { name: 'Testudo', desc: 'Romeinse schildtank: een blok legionairs achter muren van schilden.', look: 'testudo', pal: { shield: '#b02a2a', trim: '#e0b030', skin: '#c48a5a' }, atk: 'melee', mods: { hp: 1.05, speed: 0.9 }, special: { id: 'shield', red: 0.5 }, w: 36, coin: 400 },
  ],
  [ // Ironfront Era
    { name: 'Musketier', desc: 'Stormt naar voren met een bajonetcharge.', look: 'human', pal: { skin: '#d8a070', top: '#2a3a8a', bot: '#ddd', wpn: '#5a3a1a' }, gear: { head: 'tricorn', weapon: 'musket' }, atk: 'melee', mods: { range: 1.2 }, special: { id: 'charge', mult: 2.0, dur: 0.3 }, coin: 0 },
    { name: 'Scherpschutter', desc: 'Langeafstandsgeweer met dodelijke kritieke treffers.', look: 'human', pal: { skin: '#d0a070', top: '#3a5a3a', bot: '#4a4a3a', wpn: '#4a3a2a' }, gear: { head: 'shako', weapon: 'rifle' }, atk: 'proj', proj: 'bullet', mods: { range: 1.55, cd: 1.3, dmg: 1.25, hp: 0.85 }, special: { id: 'crit', chance: 0.3, mult: 2.5 }, coin: 0 },
    { name: 'Kanonnier', desc: 'Duwt een veldkanon. Kanonskogels ontploffen in een gebied.', look: 'cannoneer', pal: { skin: '#d8a070', top: '#5a2a2a', bot: '#3a3a3a', metal: '#3a3a3a', wood: '#6a4a2a' }, atk: 'proj', proj: 'cannonball', mods: { range: 3.6, cd: 1.2, speed: 0.85 }, special: { id: 'splash', radius: 45, frac: 0.6 }, w: 26, coin: 0 },
    { name: 'Zware Artillerist', desc: 'Gepantserde stoomwagen met een houwitser. Raakt van afstand.', look: 'steamtank', pal: { metal: '#5a5a5a', brass: '#b08a3a', dark: '#2a2a2a' }, atk: 'proj', proj: 'shell', mods: { range: 5.0, dmg: 1.1, cd: 1.3, speed: 0.85, hp: 0.92 }, special: { id: 'splash', radius: 50, frac: 0.5 }, w: 39, coin: 500 },
  ],
  [ // Neo Warfare
    { name: 'Assault Soldier', desc: 'Vecht op korte afstand met een machinepistool. Adrenaline bij lage HP.', look: 'soldier', pal: { skin: '#c8906a', top: '#4a5a3a', bot: '#3a4a2a', wpn: '#222' }, gear: { head: 'kevlar', weapon: 'smg' }, atk: 'proj', proj: 'bullet', mods: { range: 2.6, cd: 0.45, dmg: 0.52 }, special: { id: 'frenzy', mult: 0.65 }, coin: 400 },
    { name: 'Sniper', desc: 'Raakt vijanden van enorme afstand met kritieke kogels.', look: 'soldier', pal: { skin: '#c08a60', top: '#5a5a3a', bot: '#4a4a2a', wpn: '#222' }, gear: { head: 'beret', weapon: 'sniper' }, atk: 'proj', proj: 'bullet', mods: { range: 1.9, cd: 1.6, dmg: 1.6, hp: 0.8 }, special: { id: 'crit', chance: 0.35, mult: 2.5 }, coin: 450 },
    { name: 'Rocket Trooper', desc: 'Vuurt raketten die tanks en groepen opblazen.', look: 'soldier', pal: { skin: '#c8906a', top: '#3a4a5a', bot: '#2a3a4a', wpn: '#3a5a3a' }, gear: { head: 'kevlar', weapon: 'rpg' }, atk: 'proj', proj: 'rocket', mods: { range: 4.2, cd: 1.1 }, special: { id: 'splash', radius: 45, frac: 0.5 }, coin: 550 },
    { name: 'Main Battle Tank', desc: 'Zwaar gepantserde tank met reactief pantser en een kanon.', look: 'tank', pal: { body: '#4a5a3a', dark: '#2a3a2a', track: '#222' }, atk: 'proj', proj: 'shell', mods: { range: 5.6, cd: 1.2, dmg: 1.05, speed: 0.95 }, special: { id: 'shield', red: 0.3 }, w: 42, coin: 700 },
  ],
  [ // Mech Rebellion
    { name: 'Blade Mech', desc: 'Snelle mech met plasmazwaarden die meerdere vijanden raken.', look: 'mechlight', pal: { body: '#c0c8d0', dark: '#3a4a5a', glow: '#33e0ff' }, atk: 'melee', mods: { speed: 1.1, hp: 1.05 }, special: { id: 'cleave', n: 3 }, w: 18, coin: 600 },
    { name: 'Laser Drone', desc: 'Zwevende drone. Vliegt over bondgenoten en vertraagt met zijn laser.', look: 'drone', pal: { body: '#8a9aa8', dark: '#2a3a4a', glow: '#ff3a5a' }, atk: 'beam', beam: '#ff3a5a', mods: { range: 0.95, hp: 0.9 }, special: { id: 'slow', frac: 0.3, dur: 1.5 }, flying: true, coin: 700 },
    { name: 'Titan Buster', desc: 'Railgun-trooper wiens straal door rijen pantser snijdt.', look: 'mechsuit', pal: { body: '#d0a030', dark: '#3a3a3a', glow: '#ffee55' }, atk: 'beam', beam: '#ffee55', mods: { range: 4.4, cd: 1.3, dmg: 1.2 }, special: { id: 'pierce', len: 120 }, coin: 800 },
    { name: 'Heavy Mech', desc: 'Kolossale gevechtsrobot met zelfreparatie en schildgenerator.', look: 'mechheavy', pal: { body: '#5a6a7a', dark: '#2a3440', glow: '#33e0ff' }, atk: 'proj', proj: 'plasma', mods: { range: 3.2, hp: 1.05 }, special: { id: 'regen', frac: 0.02 }, w: 34, coin: 1000 },
  ],
  [ // Omniverse Ascension
    { name: 'Void Warrior', desc: 'Teleporteert door de leegte recht naar de vijand en steelt leven.', look: 'alien', pal: { body: '#2a1048', glow: '#e05cff', skin: '#7a3aa8' }, atk: 'melee', mods: { hp: 1.05 }, special: { id: 'blink', dist: 160, frac: 0.2 }, coin: 900 },
    { name: 'Quantum Shooter', desc: 'Kwantumschoten springen over naar tot 3 vijanden.', look: 'alien', pal: { body: '#1a2a58', glow: '#55ffee', skin: '#3a7aa8' }, gear: { weapon: 'qgun' }, atk: 'beam', beam: '#55ffee', mods: { dmg: 0.8 }, special: { id: 'chain', n: 3, falloff: 0.7 }, coin: 1000 },
    { name: 'Dimension Breaker', desc: 'Scheurt de werkelijkheid open: gebiedsschade en vertraging.', look: 'alienbig', pal: { body: '#3a1058', glow: '#ff5ce0', skin: '#8a3aa8' }, atk: 'proj', proj: 'void', mods: { range: 3.5, cd: 1.2 }, special: { id: 'rift', radius: 50, frac: 0.5, slow: 0.35 }, w: 21, coin: 1200 },
    { name: 'Cosmic Colossus', desc: 'Een sterrenreus die bondgenoten heelt en bij zijn dood implodeert.', look: 'colossus', pal: { body: '#1a0a3a', glow: '#ffd35c', star: '#fff' }, atk: 'melee', mods: { hp: 1.1, speed: 0.9 }, special: { id: 'heal', radius: 110, frac: 0.02, burst: 1.5 }, w: 36, coin: 1500 },
  ],
];

/* ------------------------------ TOWERS ------------------------------ */
AC.TOWERS = [
  { id: 'rapid', name: 'Rapid Tower', desc: 'Schiet heel snel, maar doet weinig schade per schot.', icon: '⁂', cost: 150, dmg: 6, cd: 0.32, range: 230, hp: 650 },
  { id: 'sniper', name: 'Sniper Tower', desc: 'Schiet langzaam, maar raakt hard op grote afstand.', icon: '◎', cost: 220, dmg: 46, cd: 2.4, range: 380, hp: 550 },
  { id: 'blast', name: 'Blast Tower', desc: 'Explosieve gebiedsschade tegen groepen vijanden.', icon: '✺', cost: 260, dmg: 20, cd: 2.0, range: 210, hp: 750, splash: 60 },
];
AC.TOWER_SELL = 0.5;

/* -------------------------- MATCH UPGRADES -------------------------- */
// cost(level) = base * growth^level  (vermenigvuldigd met tijdperk-schaal voor unit-upgrades)
AC.UPGRADES = [
  { key: 'hp0', cat: 'unit', slot: 0, stat: 'hp', name: 'Melee HP', per: 0.12, base: 90, growth: 1.45, max: 10 },
  { key: 'dmg0', cat: 'unit', slot: 0, stat: 'dmg', name: 'Melee Damage', per: 0.12, base: 90, growth: 1.45, max: 10 },
  { key: 'hp1', cat: 'unit', slot: 1, stat: 'hp', name: 'Ranged HP', per: 0.12, base: 100, growth: 1.45, max: 10 },
  { key: 'dmg1', cat: 'unit', slot: 1, stat: 'dmg', name: 'Ranged Damage', per: 0.12, base: 100, growth: 1.45, max: 10 },
  { key: 'hp2', cat: 'unit', slot: 2, stat: 'hp', name: 'Anti-Armor HP', per: 0.12, base: 130, growth: 1.45, max: 10 },
  { key: 'dmg2', cat: 'unit', slot: 2, stat: 'dmg', name: 'Anti-Armor Damage', per: 0.12, base: 130, growth: 1.45, max: 10 },
  { key: 'hp3', cat: 'unit', slot: 3, stat: 'hp', name: 'Armored HP', per: 0.12, base: 160, growth: 1.45, max: 10 },
  { key: 'dmg3', cat: 'unit', slot: 3, stat: 'dmg', name: 'Armored Damage', per: 0.12, base: 160, growth: 1.45, max: 10 },
  { key: 'tdmg', cat: 'tower', stat: 'dmg', name: 'Tower Damage', per: 0.15, base: 140, growth: 1.5, max: 10 },
  { key: 'trange', cat: 'tower', stat: 'range', name: 'Tower Range', per: 0.08, base: 120, growth: 1.5, max: 8 },
  { key: 'income', cat: 'eco', stat: 'income', name: 'Automatisch inkomen', per: 6, base: 120, growth: 1.42, max: 20 },
  { key: 'bounty', cat: 'eco', stat: 'bounty', name: 'Kill-inkomen', per: 0.1, base: 110, growth: 1.5, max: 10 },
];

/* ------------------ PERMANENTE UPGRADES (alleen vs Bot) ------------------ */
AC.PERMA = [
  { key: 'startIron', name: 'Oorlogskist', desc: '+50 startijzer per niveau', per: 50, max: 5, cost: [150, 300, 500, 800, 1200] },
  { key: 'baseHp', name: 'Fundamenten', desc: '+5% basis-HP per niveau', per: 0.05, max: 5, cost: [200, 400, 650, 950, 1400] },
  { key: 'unitHp', name: 'Veteranentraining', desc: '+3% unit-HP per niveau', per: 0.03, max: 5, cost: [250, 500, 800, 1200, 1700] },
  { key: 'unitDmg', name: 'Wapensmid', desc: '+3% unit-schade per niveau', per: 0.03, max: 5, cost: [250, 500, 800, 1200, 1700] },
  { key: 'xp', name: 'Oude Wijsheid', desc: '+6% XP tijdens matches', per: 0.06, max: 5, cost: [200, 400, 700, 1000, 1500] },
  { key: 'coins', name: 'Fortuin', desc: '+8% coins na iedere match', per: 0.08, max: 5, cost: [300, 600, 900, 1300, 1800] },
];

/* ------------------------------ BOT ------------------------------ */
AC.BOT = {
  easy: { name: 'Easy', think: 1.4, mistakes: 0.35, income: 0.85, evolveDelay: 18, upgradeBias: 0.3, towerBias: 0.5, coins: 1, rating: 900 },
  normal: { name: 'Normal', think: 0.75, mistakes: 0.12, income: 1.0, evolveDelay: 5, upgradeBias: 0.7, towerBias: 1, coins: 1.6, rating: 1150 },
  hard: { name: 'Hard', think: 0.35, mistakes: 0.0, income: 1.12, evolveDelay: 0, upgradeBias: 1, towerBias: 1.2, coins: 2.4, rating: 1450 },
};
AC.BOT_NAMES = ['Grok de Grote', 'Ramses XIII', 'Centurio Brutus', 'Generaal Kruitdamp', 'Sgt. Stahl', 'UNIT-77', 'Xyl\'thar', 'Kapitein Kogel', 'Cleo Strijdlust', 'Mammoetmeester'];

/* ------------------------------ COSMETICS ------------------------------ */
AC.COSMETICS = [
  { id: 'c_blue', type: 'color', name: 'Koningsblauw', color: '#3a8bff', cost: 0, rarity: 'common' },
  { id: 'c_red', type: 'color', name: 'Bloedrood', color: '#ff4a4a', cost: 0, rarity: 'common' },
  { id: 'c_green', type: 'color', name: 'Junglegroen', color: '#4adf6a', cost: 250, rarity: 'common' },
  { id: 'c_orange', type: 'color', name: 'Savannevuur', color: '#ff9a2a', cost: 250, rarity: 'common' },
  { id: 'c_gold', type: 'color', name: 'Farao-goud', color: '#ffd23a', cost: 600, rarity: 'rare' },
  { id: 'c_cyan', type: 'color', name: 'Neon Cyaan', color: '#2af0ff', cost: 600, rarity: 'rare' },
  { id: 'c_void', type: 'color', name: 'Leegtepaars', color: '#c04aff', cost: 1200, rarity: 'epic' },
  { id: 'c_white', type: 'color', name: 'Sterrenwit', color: '#f4f4ff', cost: 2000, rarity: 'legendary' },
  { id: 'b_skull', type: 'banner', name: 'Schedelbanier', emblem: 'skull', cost: 300, rarity: 'common' },
  { id: 'b_sun', type: 'banner', name: 'Zonneschijf', emblem: 'sun', cost: 300, rarity: 'common' },
  { id: 'b_eagle', type: 'banner', name: 'Adelaar', emblem: 'eagle', cost: 500, rarity: 'rare' },
  { id: 'b_gear', type: 'banner', name: 'Tandwiel', emblem: 'gear', cost: 500, rarity: 'rare' },
  { id: 'b_eye', type: 'banner', name: 'Allesziend Oog', emblem: 'eye', cost: 1000, rarity: 'epic' },
  { id: 'b_crown', type: 'banner', name: 'Kroon der Tijden', emblem: 'crown', cost: 1800, rarity: 'legendary' },
  { id: 'g_gold', type: 'glow', name: 'Gouden Aura (units)', glow: '#ffd23a', cost: 1500, rarity: 'epic' },
  { id: 'g_void', type: 'glow', name: 'Leegte-aura (units)', glow: '#c04aff', cost: 2500, rarity: 'legendary' },
];
AC.RARITY_COL = { common: '#b0b8c0', rare: '#4aa8ff', epic: '#c04aff', legendary: '#ffb02a' };

/* ------------------------------ SEIZOEN ------------------------------ */
AC.SEASON = {
  name: 'Seizoen 1 — Dawn of War',
  tiers: (function () {
    var t = [];
    for (var i = 1; i <= 30; i++) {
      var r;
      if (i % 10 === 0) r = { type: 'cos', id: i === 10 ? 'b_eagle' : i === 20 ? 'c_void' : 'b_crown' };
      else if (i % 5 === 0) r = { type: 'crate', n: 1 };
      else r = { type: 'coins', n: 60 + i * 15 };
      t.push({ tier: i, xp: i * 400, reward: r });
    }
    return t;
  })(),
};

AC.RANKS = [
  { name: 'Brons', min: 0, col: '#cd7f32' },
  { name: 'Zilver', min: 1100, col: '#c0c8d0' },
  { name: 'Goud', min: 1250, col: '#ffd23a' },
  { name: 'Platina', min: 1400, col: '#5ae0d0' },
  { name: 'Diamant', min: 1600, col: '#7ab8ff' },
  { name: 'Legende', min: 1800, col: '#ff5ce0' },
];

/* ------------------------- AFGELEIDE STATS ------------------------- */
AC.specialText = function (s) {
  if (!s) return '';
  switch (s.id) {
    case 'frenzy': return 'Razernij: +' + Math.round((1 / s.mult - 1) * 100) + '% aanvalssnelheid onder 50% HP';
    case 'stun': return 'Verdoving: ' + Math.round(s.chance * 100) + '% kans om ' + s.dur + 's te verdoven';
    case 'poison': return 'Gif: ' + Math.round(s.dps * 100) + '% schade per sec. gedurende ' + s.dur + 's';
    case 'burn': return 'Brand: ' + Math.round(s.dps * 100) + '% schade per sec. gedurende ' + s.dur + 's';
    case 'charge': return 'Charge: eerste aanval ×' + s.mult + ' schade en ' + s.dur + 's verdoving';
    case 'crit': return 'Kritiek: ' + Math.round(s.chance * 100) + '% kans op ×' + s.mult + ' schade';
    case 'cleave': return 'Doorhaal: raakt tot ' + s.n + ' vijanden tegelijk';
    case 'shield': return 'Schild: −' + Math.round(s.red * 100) + '% schade van ranged aanvallen';
    case 'lifesteal': return 'Levensroof: herstelt ' + Math.round(s.frac * 100) + '% van de toegebrachte schade';
    case 'multishot': return 'Dubbel schot: vuurt op ' + s.n + ' doelen tegelijk';
    case 'execute': return 'Executie: ×' + s.mult + ' schade tegen doelen onder ' + Math.round(s.below * 100) + '% HP';
    case 'rally': return 'Disciplina: bondgenoten in de buurt +' + Math.round(s.bonus * 100) + '% schade';
    case 'splash': return 'Explosie: ' + Math.round(s.frac * 100) + '% gebiedsschade (straal ' + s.radius + ')';
    case 'pierce': return 'Doorboren: raakt alle vijanden in een lijn van ' + s.len + 'px';
    case 'slow': return 'Vertraging: −' + Math.round(s.frac * 100) + '% snelheid gedurende ' + s.dur + 's';
    case 'regen': return 'Zelfreparatie: herstelt ' + Math.round(s.frac * 100) + '% HP per seconde';
    case 'blink': return 'Leegtesprong: teleporteert naar de vijand, ' + Math.round(s.frac * 100) + '% levensroof';
    case 'chain': return 'Kettingschot: springt over naar ' + s.n + ' vijanden';
    case 'rift': return 'Dimensiescheur: gebiedsschade en −' + Math.round(s.slow * 100) + '% snelheid';
    case 'heal': return 'Sterrenlicht: heelt bondgenoten; implodeert bij dood';
  }
  return '';
};

/* Berekent de definitieve stats voor unit (age, slot), zonder match-upgrades */
AC.unitStats = function (age, slot) {
  var u = AC.UNITS[age][slot], b = AC.ROLE_BASE[slot], m = u.mods || {}, C = AC.CONST;
  var sg = Math.pow(C.STAT_GROWTH, age), cg = Math.pow(C.COST_GROWTH, age);
  var range = b.range * (m.range || 1);
  if (slot === 1) range *= (1 + 0.04 * age);
  return {
    age: age, slot: slot, name: u.name,
    cost: Math.round(b.cost * cg * (m.cost || 1) / 5) * 5,
    hp: Math.round(b.hp * sg * (m.hp || 1)),
    dmg: Math.round(b.dmg * sg * (m.dmg || 1) * 10) / 10,
    cd: Math.round(b.cd * (m.cd || 1) * 100) / 100,
    range: Math.round(range),
    speed: Math.round(b.speed * (m.speed || 1) * (1 + 0.03 * age)),
    w: u.w || b.w,
    armored: !!b.armored, aa: !!b.aa, flying: !!u.flying,
    atk: u.atk, proj: u.proj, beam: u.beam, special: u.special,
  };
};
AC.dps = function (s) { return Math.round(s.dmg / s.cd * 10) / 10; };

if (typeof module !== 'undefined') module.exports = AC;
