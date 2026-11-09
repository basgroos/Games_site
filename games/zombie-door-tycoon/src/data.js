// =====================================================================
//  DATA — rarities, items, zombies, bosses, maps, difficulties, rooms
// =====================================================================
var G = (typeof G !== 'undefined') ? G : {};

G.T = 40;               // tile size in world pixels
G.COLS = 20; G.ROWS = 12;
G.TICK = 1 / 30;        // fixed simulation step (seconds)
G.INCOME_INTERVAL = 5;  // farms pay every 5 seconds

G.RARITIES = [
  { id: 'common',    name: 'Common',    color: '#c3ccd6', dark: '#5d6873', weight: 60,  limit: 8, dupeCoins: 10,   stars: 5 },
  { id: 'rare',      name: 'Rare',      color: '#3fa2ff', dark: '#14508f', weight: 26,  limit: 6, dupeCoins: 25,   stars: 5 },
  { id: 'epic',      name: 'Epic',      color: '#b65cff', dark: '#5a1f8f', weight: 10,  limit: 5, dupeCoins: 60,   stars: 5 },
  { id: 'legendary', name: 'Legendary', color: '#ffb526', dark: '#8f5a00', weight: 3.2, limit: 3, dupeCoins: 150,  stars: 5 },
  { id: 'mythic',    name: 'Mythic',    color: '#ff3d6e', dark: '#8f1030', weight: 0.7, limit: 2, dupeCoins: 400,  stars: 5 },
  { id: 'secret',    name: 'Secret',    color: '#28ffd5', dark: '#0b6f63', weight: 0.1, limit: 1, dupeCoins: 1500, stars: 5 }
];
G.RAR = {}; G.RARITIES.forEach(function (r, i) { r.index = i; G.RAR[r.id] = r; });

// Summon banners. Premium = 10x price, 3x luck (luck multiplies Epic and higher).
G.SUMMON = {
  normal:  { id: 'normal',  name: 'Normal Summon',  cost: 100,  luck: 1 },
  premium: { id: 'premium', name: 'Premium Summon', cost: 1000, luck: 3 }
};
G.summonOdds = function (bannerId) {
  var luck = G.SUMMON[bannerId].luck, odds = {}, rest = 0;
  G.RARITIES.forEach(function (r) {
    if (r.index >= 2) { odds[r.id] = r.weight * luck; rest += odds[r.id]; }
  });
  odds.rare = G.RAR.rare.weight;
  odds.common = 100 - rest - odds.rare;
  return odds; // percentages, sum = 100
};

G.CATS = {
  turret:  { name: 'Turret',  icon: '🔫' },
  farm:    { name: 'Farm',    icon: '💰' },
  boost:   { name: 'Boost',   icon: '⚡' },
  special: { name: 'Special', icon: '✨' },
  support: { name: 'Support', icon: '🛡️' },
  trap:    { name: 'Trap',    icon: '⚠️' }
};

// Upgrade tracks: per-level effect
G.TRACKS = {
  dmg: { name: 'Damage',        short: 'DMG', per: 0.22 },
  spd: { name: 'Attack Speed',  short: 'SPD', per: 0.10 },
  rng: { name: 'Range',         short: 'RNG', per: 0.08 },
  spc: { name: 'Special',       short: 'SPC', per: 0.15 },
  inc: { name: 'Income',        short: 'INC', per: 0.28 }
};
G.MAX_TRACK_LEVEL = 10;

// ---------------------------------------------------------------------
//  ITEMS (42).  cost = in-match $, income = $ per 5s tick, cd = seconds
// ---------------------------------------------------------------------
G.ITEMS = [
  // ---------------- COMMON ----------------
  { id: 'pistol', name: 'Pistol Turret', rarity: 'common', cat: 'turret', cost: 150, kind: 'bullet',
    dmg: 5, cd: 0.4, range: 4.8, tracks: ['dmg', 'spd', 'rng'],
    desc: 'Schiet snel met lage damage. Goedkoop en betrouwbaar.', ability: 'Rapid fire' },
  { id: 'shotgun', name: 'Shotgun Turret', rarity: 'common', cat: 'turret', cost: 275, kind: 'spread',
    dmg: 4, cd: 1.2, range: 3.6, pellets: 5, tracks: ['dmg', 'spd', 'spc'],
    desc: 'Schiet meerdere hagelkorrels tegelijk. Sterk tegen groepen dichtbij.', ability: '5 pellets (+1 per SPC)' },
  { id: 'scout', name: 'Scout Tower', rarity: 'common', cat: 'turret', cost: 225, kind: 'bullet',
    dmg: 3, cd: 0.5, range: 5.4, detect: true, reveal: 2.0, tracks: ['dmg', 'spd', 'spc'],
    desc: 'Ziet onzichtbare zombies. Geraakte zombies blijven 2s zichtbaar voor ál je towers.', ability: 'Detection + Reveal' },
  { id: 'minicash', name: 'Mini Cash Register', rarity: 'common', cat: 'farm', cost: 175, kind: 'farm',
    income: 18, tracks: ['inc'], desc: 'Een kleine kassa die iedere 5 seconden wat extra geld oplevert.', ability: 'Passive income' },
  { id: 'cashreg', name: 'Cash Register', rarity: 'common', cat: 'farm', cost: 350, kind: 'farm',
    income: 55, tracks: ['inc'], desc: 'De klassieke starterfarm. Iedere speler begint met één gratis exemplaar.', ability: 'Passive income' },
  { id: 'slowtrap', name: 'Slow Trap', rarity: 'common', cat: 'trap', cost: 120, kind: 'slowtrap', place: 'path',
    slow: 0.4, tracks: ['spc'], desc: 'Plaats op het pad. Vertraagt zombies die eroverheen lopen. Vliegende zombies negeren dit.', ability: '-40% speed' },
  { id: 'spiketrap', name: 'Spike Trap', rarity: 'common', cat: 'trap', cost: 150, kind: 'spike', place: 'path',
    dmg: 9, cd: 0.5, tracks: ['dmg', 'spd'], desc: 'Plaats op het pad. Prikt iedere zombie die erop staat. Negeert armor.', ability: 'Armor-piercing spikes' },
  { id: 'wall', name: 'Basic Wall', rarity: 'common', cat: 'trap', cost: 150, kind: 'wall', place: 'path',
    hp: 260, rebuild: 15, tracks: ['spc'], desc: 'Barricade op het pad. Zombies moeten hem eerst kapotslaan. Herbouwt zichzelf na 15s.', ability: 'Blocks ground zombies' },

  // ---------------- RARE ----------------
  { id: 'sniper', name: 'Sniper Tower', rarity: 'rare', cat: 'turret', cost: 500, kind: 'hitscan',
    dmg: 48, cd: 2.0, range: 8.4, detect: true, target: 'strongest', tracks: ['dmg', 'spd', 'rng'],
    desc: 'Schiet op lange afstand met hoge damage, maar langzaam.', ability: 'Detection, long range' },
  { id: 'frost', name: 'Frost Turret', rarity: 'rare', cat: 'turret', cost: 450, kind: 'frost',
    dmg: 4, cd: 0.7, range: 4.8, slow: 0.4, slowDur: 1.5, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Vertraagt vijanden met ijs.', ability: '-40% speed for 1.5s' },
  { id: 'tesla', name: 'Tesla Tower', rarity: 'rare', cat: 'special', cost: 600, kind: 'chain',
    dmg: 12, cd: 1.3, range: 4.5, chain: 4, jump: 1.7, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Elektriciteit springt over naar meerdere zombies. Kan onzichtbare zombies via de keten raken.', ability: 'Chains to 4 zombies' },
  { id: 'poison', name: 'Poison Tower', rarity: 'rare', cat: 'turret', cost: 500, kind: 'poison',
    dmg: 3, cd: 1.0, range: 5.1, pdps: 7, pdur: 4, stacks: 5, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Geeft poison damage over tijd. Stapelt tot 5x en negeert armor.', ability: 'Stacking poison' },
  { id: 'farmer', name: 'Farmer', rarity: 'rare', cat: 'farm', cost: 450, kind: 'farm',
    income: 22, range: 2.4, farmBoost: 0.2, tracks: ['inc', 'rng', 'spc'],
    desc: 'Genereert geld én laat farms in zijn buurt 20% meer opleveren.', ability: '+20% income to nearby farms' },
  { id: 'printer', name: 'Money Printer', rarity: 'rare', cat: 'farm', cost: 700, kind: 'farm',
    income: 85, tracks: ['inc'], desc: 'Print geld. Meer dan een kassa.', ability: 'Passive income' },
  { id: 'landmine', name: 'Landmine', rarity: 'rare', cat: 'trap', cost: 350, kind: 'mine', place: 'path',
    dmg: 90, splash: 1.2, rearm: 6, tracks: ['dmg', 'spd', 'spc'],
    desc: 'Ontploft wanneer een zombie erop stapt en laadt daarna opnieuw op.', ability: 'Splash 90, rearm 6s' },
  { id: 'radar', name: 'Radar Station', rarity: 'rare', cat: 'support', cost: 400, kind: 'buff',
    range: 3.9, buffDetect: true, buffRange: 0.1, tracks: ['rng', 'spc'],
    desc: 'Towers in bereik kunnen onzichtbare zombies zien en krijgen +10% range.', ability: 'Grants detection' },

  // ---------------- EPIC ----------------
  { id: 'flamethrower', name: 'Flamethrower', rarity: 'epic', cat: 'turret', cost: 700, upCost: 630, kind: 'flame',
    dmg: 5, cd: 0.2, range: 3.45, burn: 8, burnDur: 3, groundOnly: true, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Raakt alle zombies in een kegel en zet ze in brand. Kan vliegende zombies niet raken.', ability: 'Cone + burn' },
  { id: 'rocket', name: 'Rocket Launcher', rarity: 'epic', cat: 'turret', cost: 750, upCost: 700, kind: 'splash',
    dmg: 42, cd: 2.0, range: 5.76, splash: 1.2, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Explosieve raketten met splash damage.', ability: 'Splash radius 1.2' },
  { id: 'laser', name: 'Laser Tower', rarity: 'epic', cat: 'turret', cost: 850, upCost: 840, kind: 'beam',
    dmg: 22, cd: 1.0, range: 6.6, detect: true, shred: 2, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Een laser die door alle vijanden in een lijn heen gaat en armor wegsmelt.', ability: 'Pierce + armor shred' },
  { id: 'goldfactory', name: 'Gold Factory', rarity: 'epic', cat: 'farm', cost: 1500, upCost: 1400, kind: 'farm',
    income: 210, tracks: ['inc'], desc: 'Produceert veel geld.', ability: 'Passive income' },
  { id: 'goldmine', name: 'Gold Mine', rarity: 'epic', cat: 'farm', cost: 1000, upCost: 910, kind: 'mine_farm',
    income: 520, every: 20, tracks: ['inc', 'spd'],
    desc: 'Graaft iedere 20 seconden een grote lading goud op in plaats van iedere 5 seconden.', ability: 'Big payout every 20s' },
  { id: 'crypto', name: 'Crypto Farm', rarity: 'epic', cat: 'farm', cost: 1200, upCost: 1120, kind: 'crypto',
    income: 170, tracks: ['inc'],
    desc: 'Duur en volatiel: iedere uitbetaling is tussen 0x en 2.2x. Gemiddeld hoge inkomsten.', ability: 'Volatile income' },
  { id: 'medic', name: 'Medic Station', rarity: 'epic', cat: 'support', cost: 900, kind: 'medic',
    heal: 0.005, limit: 3, tracks: ['spc'], desc: 'Herstelt iedere seconde 0.5% van de max HP van je deur.', ability: 'Door regen' },
  { id: 'overclock', name: 'Overclock Beacon', rarity: 'epic', cat: 'boost', cost: 1100, kind: 'buff',
    range: 3, buffSpd: 0.25, tracks: ['rng', 'spc'], desc: 'Towers in bereik schieten 25% sneller.', ability: '+25% attack speed aura' },

  // ---------------- LEGENDARY ----------------
  { id: 'plasma', name: 'Plasma Cannon', rarity: 'legendary', cat: 'turret', cost: 1800, upCost: 2450, kind: 'plasma',
    dmg: 180, cd: 3.0, range: 6, detect: true, target: 'strongest', tracks: ['dmg', 'spd', 'rng'],
    desc: 'Enorme damage tegen sterke vijanden: +4% van max HP per schot en x1.5 tegen bosses.', ability: '% max HP damage' },
  { id: 'blackhole', name: 'Black Hole Tower', rarity: 'legendary', cat: 'special', cost: 1500, upCost: 2100, kind: 'blackhole',
    dmg: 25, cd: 9, range: 5.4, radius: 2.0, hold: 3, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Opent een zwart gat dat zombies naar één punt trekt en vasthoudt.', ability: 'Pull & hold 3s' },
  { id: 'drones', name: 'Drone Commander', rarity: 'legendary', cat: 'special', cost: 1600, upCost: 2240, kind: 'drones',
    dmg: 14, cd: 0.5, range: 6.6, drones: 3, droneRange: 3.9, detect: true, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Stuurt kleine drones die zelfstandig aanvallen. Drones zien onzichtbare zombies.', ability: '3 drones (+1 per 2 SPC)' },
  { id: 'quantum', name: 'Quantum Farm', rarity: 'legendary', cat: 'farm', cost: 1600, upCost: 2100, kind: 'quantum',
    income: 70, growth: 20, tracks: ['inc'], desc: 'Verdient steeds meer naarmate het potje langer duurt (+$20 per minuut).', ability: 'Scaling income' },
  { id: 'shieldgen', name: 'Shield Generator', rarity: 'legendary', cat: 'support', cost: 1300, upCost: 1750, kind: 'shield',
    cd: 25, shield: 0.3, shieldDur: 8, limit: 1, tracks: ['spd', 'spc'],
    desc: 'Geeft je deur iedere 25s een energieschild van 30% max HP.', ability: 'Door shield' },
  { id: 'bank', name: 'Bank', rarity: 'legendary', cat: 'farm', cost: 1800, upCost: 2450, kind: 'bank',
    income: 80, interest: 0.025, tracks: ['inc'], desc: 'Geeft inkomen plus 2.5% rente over je huidige geld (max $1000 per keer).', ability: 'Interest on savings' },
  { id: 'wardrum', name: 'War Drum', rarity: 'legendary', cat: 'boost', cost: 1300, upCost: 1820, kind: 'buff',
    range: 3, buffDmg: 0.3, tracks: ['rng', 'spc'], desc: 'Towers in bereik doen 30% meer damage.', ability: '+30% damage aura' },

  // ---------------- MYTHIC ----------------
  { id: 'kaiju', name: 'Kaiju Cannon', rarity: 'mythic', cat: 'turret', cost: 4000, upCost: 6300, kind: 'splash',
    dmg: 620, cd: 4.0, range: 7.2, splash: 2.0, stun: 0.5, big: true, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Schiet enorme projectielen met gigantische splash damage die zombies even verdoven.', ability: 'Huge splash + stun' },
  { id: 'timemanip', name: 'Time Manipulator', rarity: 'mythic', cat: 'special', cost: 3200, upCost: 4900, kind: 'timeslow',
    cd: 16, slow: 0.7, slowDur: 5, limit: 1, tracks: ['spd', 'spc'],
    desc: 'Vertraagt iedere 16s álle zombies in je kamer met 70% (bosses 35%).', ability: 'Room-wide time slow' },
  { id: 'infinity', name: 'Infinity Reactor', rarity: 'mythic', cat: 'farm', cost: 6500, upCost: 10500, kind: 'farm',
    income: 1100, warmup: 30, tracks: ['inc'], desc: 'Genereert enorme hoeveelheden geld, maar moet na plaatsen 30s opwarmen.', ability: 'Huge income' },
  { id: 'soul', name: 'Soul Collector', rarity: 'mythic', cat: 'turret', cost: 3000, upCost: 4550, kind: 'soul',
    dmg: 40, cd: 0.6, range: 5.76, detect: true, perSoul: 2, maxSouls: 400, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Verzamelt een ziel van iedere verslagen zombie in je kamer en wordt daardoor steeds sterker.', ability: '+2 dmg per soul' },
  { id: 'meteor', name: 'Meteor Tower', rarity: 'mythic', cat: 'special', cost: 3500, upCost: 5600, kind: 'meteor',
    dmg: 460, cd: 7, radius: 1.8, burn: 30, burnDur: 3, global: true, tracks: ['dmg', 'spd', 'spc'],
    desc: 'Roept meteorieten op die de grootste groep zombies in je hele kamer raken.', ability: 'Global meteor strikes' },
  { id: 'diamond', name: 'Diamond Generator', rarity: 'mythic', cat: 'farm', cost: 5500, upCost: 8400, kind: 'diamond',
    income: 800, jackpot: 12000, chance: 0.02, tracks: ['inc'],
    desc: 'Extreem krachtige farm met 2% kans per uitbetaling op een diamant ter waarde van $12.000.', ability: 'Jackpot chance' },

  // ---------------- SECRET ----------------
  { id: 'creator', name: 'The Creator', rarity: 'secret', cat: 'special', cost: 9000, upCost: 17500, kind: 'creator',
    dmg: 220, cd: 0.45, range: 6.6, detect: true, ult: 25, ultDmg: 3000, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Wisselt iedere 4s tussen kogels, bliksem, explosies en ijs. Ultimate: Genesis Beam raakt álle zombies in de kamer.', ability: 'Mode cycle + Genesis Beam' },
  { id: 'voidemperor', name: 'Void Emperor', rarity: 'secret', cat: 'special', cost: 8500, upCost: 15400, kind: 'aura',
    dmg: 420, range: 4.8, mark: 0.25, detect: true, tracks: ['dmg', 'rng', 'spc'],
    desc: 'Creëert een void-veld waarin zombies continu schade krijgen en 25% meer damage van alles ontvangen.', ability: 'Void field + mark' },
  { id: 'goldengod', name: 'Golden God', rarity: 'secret', cat: 'farm', cost: 8000, upCost: 14000, kind: 'goldengod',
    income: 1500, cd: 20, blessDur: 6, tracks: ['inc', 'spc'],
    desc: 'Genereert extreem veel geld en zegent iedere 20s al je towers: +50% damage en attack speed.', ability: 'Divine Blessing' },
  { id: 'reality', name: 'Reality Breaker', rarity: 'secret', cat: 'special', cost: 9000, upCost: 16800, kind: 'reality',
    dmg: 160, cd: 0.8, range: 6, detect: true, rewrite: 6, tracks: ['dmg', 'spd', 'rng', 'spc'],
    desc: 'Herschrijft iedere 6s de werkelijkheid: zombies verliezen armor, onzichtbaarheid, vliegen en regeneratie, en kunnen in goud veranderen.', ability: 'Rewrite enemies' },
  { id: 'lastdefense', name: 'The Last Defense', rarity: 'secret', cat: 'turret', cost: 7500, upCost: 14000, kind: 'lastdef',
    dmg: 300, cd: 0.5, range: 6.24, detect: true, tracks: ['dmg', 'spd', 'rng'],
    desc: 'Wordt sterker naarmate je deur minder HP heeft: tot 5x damage en 2x attack speed.', ability: 'Desperation scaling' },
  // =================== EXPANSION: 30 NEW TOWERS ===================
  // ---------------- COMMON ----------------
  { id: 'doublebarrel', name: 'Double Barrel', rarity: 'common', cat: 'turret', cost: 220, kind: 'bullet', shots: 2,
    dmg: 4, cd: 0.6, range: 4.5, tracks: ['dmg', 'spd', 'rng'], desc: 'Vuurt twee kogels tegelijk af.', ability: '2 kogels per schot' },
  { id: 'revolver', name: 'Revolver Tower', rarity: 'common', cat: 'turret', cost: 260, kind: 'revolver',
    dmg: 20, cd: 0.32, clip: 6, reload: 2.4, range: 5, tracks: ['dmg', 'spd', 'rng'], desc: 'Zes krachtige schoten achter elkaar, daarna herladen.', ability: '6 schoten, dan herladen' },
  { id: 'slingshot', name: 'Slingshot Tower', rarity: 'common', cat: 'turret', cost: 120, kind: 'bounce',
    dmg: 4, cd: 0.9, range: 4.2, bounces: 2, tracks: ['dmg', 'spd', 'spc'], desc: 'Goedkope stenen die doorstuiteren naar 2 andere zombies.', ability: 'Stuitert 2x (+1 per SPC)' },
  { id: 'barricade', name: 'Basic Barricade', rarity: 'common', cat: 'trap', cost: 130, kind: 'wall', place: 'path',
    hp: 160, thorns: 6, rebuild: 10, tracks: ['spc'], desc: 'Prikkeldraad-barricade vóór je deur. Zombies die erop slaan, prikken zichzelf.', ability: 'Blokkeert + terugprikken' },
  { id: 'minifarm', name: 'Mini Farm', rarity: 'common', cat: 'farm', cost: 140, kind: 'harvest',
    income: 10, growth: 3, tracks: ['inc'], desc: 'Een moestuintje: levert elke wave $3 per 5s meer op.', ability: 'Groeit elke wave' },
  // ---------------- RARE ----------------
  { id: 'minigun', name: 'Minigun', rarity: 'rare', cat: 'turret', cost: 550, kind: 'minigun',
    dmg: 3, cd: 0.3, spin: 3, range: 4.5, tracks: ['dmg', 'spd', 'rng'], desc: 'Draait op en schiet steeds sneller zolang hij blijft vuren.', ability: 'Spin-up tot 5x sneller' },
  { id: 'radartower', name: 'Radar Tower', rarity: 'rare', cat: 'support', cost: 450, kind: 'revealer',
    range: 4.5, buffRange: 0.15, tracks: ['rng', 'spc'], desc: 'Maakt onzichtbare zombies in zijn bereik zichtbaar voor iedereen en geeft towers in de buurt +15% range.', ability: 'Onthult gebied + range' },
  { id: 'boomerang', name: 'Boomerang Tower', rarity: 'rare', cat: 'turret', cost: 480, kind: 'boomerang',
    dmg: 14, cd: 1.4, range: 5, tracks: ['dmg', 'spd', 'rng'], desc: 'Een boemerang die alles op zijn pad raakt, heen én terug.', ability: 'Raakt 2x in een lijn' },
  { id: 'sprayer', name: 'Poison Sprayer', rarity: 'rare', cat: 'turret', cost: 500, kind: 'spray', groundOnly: true,
    dmg: 1, cd: 0.6, range: 3.3, pdps: 4, pdur: 3, stacks: 3, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Sproeit een gifwolk in een kegel: iedereen erin krijgt poison.', ability: 'Gif-kegel' },
  { id: 'magnet', name: 'Magnetic Cannon', rarity: 'rare', cat: 'turret', cost: 600, kind: 'magnet',
    dmg: 18, cd: 1.6, range: 4.8, shred: 4, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Trekt het pantser van zombies af (permanent), doet 2x damage tegen gepantserden en duwt ze terug.', ability: 'Armor strip + knockback' },
  // ---------------- EPIC ----------------
  { id: 'mortar', name: 'Mortar Tower', rarity: 'epic', cat: 'turret', cost: 900, kind: 'mortar', groundOnly: true,
    dmg: 60, cd: 3.2, range: 10, minRange: 2.5, splash: 1.5, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Granaten met enorm bereik en splash, maar kan niet dichtbij schieten.', ability: 'Lange afstand splash' },
  { id: 'dronefactory', name: 'Drone Factory', rarity: 'epic', cat: 'special', cost: 1100, kind: 'kamikaze',
    dmg: 70, cd: 3.5, range: 8, splash: 1.0, drones: 3, tracks: ['dmg', 'spd', 'spc'], desc: 'Bouwt kamikaze-drones die op zombies afvliegen en ontploffen.', ability: 'Zelfzoekende drones' },
  { id: 'teslacoil', name: 'Tesla Coil', rarity: 'epic', cat: 'special', cost: 950, kind: 'overload',
    dmg: 26, cd: 2.4, range: 4.2, jump: 1.8, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Laadt statische stroom op en ontlaadt die in een kettingbliksem die van zombie naar zombie springt — zonder limiet, zolang ze dicht genoeg bij elkaar lopen.', ability: 'Onbeperkte keten' },
  { id: 'sonic', name: 'Sonic Tower', rarity: 'epic', cat: 'special', cost: 850, kind: 'sonic',
    dmg: 6, cd: 3, range: 3.6, slow: 0.5, slowDur: 2, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Geluidsgolven vertragen alles in de buurt en onderbreken healers.', ability: 'Pulse-slow' },
  { id: 'repairbot', name: 'Repair Bot Factory', rarity: 'epic', cat: 'support', cost: 1000, kind: 'repairbot',
    cd: 8, heal: 0.06, limit: 2, tracks: ['spd', 'spc'], desc: 'Stuurt elke 8s een repair-bot: +6% deur-HP en herstelt barricades.', ability: 'Deur + muren repareren' },
  { id: 'gravity', name: 'Gravity Tower', rarity: 'epic', cat: 'special', cost: 1200, kind: 'gravity',
    dmg: 10, cd: 5, range: 4.2, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Trekt zombies in zijn bereik naar elkaar toe: perfect voor splash-towers.', ability: 'Groepeert zombies' },
  // ---------------- LEGENDARY ----------------
  { id: 'satellite', name: 'Satellite Cannon', rarity: 'legendary', cat: 'special', cost: 1700, kind: 'orbital', global: true,
    dmg: 900, cd: 6, radius: 1.0, tracks: ['dmg', 'spd', 'spc'], desc: 'Richt een satelliet op de sterkste zombie die naar jouw kamer komt: na 1s een orbitale inslag.', ability: 'Orbital strike' },
  { id: 'assassin', name: 'Shadow Assassin', rarity: 'legendary', cat: 'turret', cost: 1600, kind: 'assassin', detect: true, target: 'strongest',
    dmg: 120, cd: 1.1, range: 6, execute: 0.15, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Valt altijd de sterkste zombie aan en executeert zombies onder 15% HP (geen bosses).', ability: 'Execute' },
  { id: 'timetower', name: 'Time Tower', rarity: 'legendary', cat: 'boost', cost: 1500, kind: 'timetower',
    cd: 10, range: 3, tracks: ['spd', 'rng', 'spc'], desc: 'Geeft towers in de buurt elke 10s 3s lang dubbele vuursnelheid en vertraagt zombies in zijn bereik.', ability: 'Haste-burst' },
  { id: 'emptower', name: 'EMP Tower', rarity: 'legendary', cat: 'special', cost: 1400, kind: 'emp',
    cd: 7, range: 4.2, tracks: ['spd', 'rng', 'spc'], desc: 'Schakelt speciale vaardigheden uit: geen healing, regeneratie, onzichtbaarheid, schilden of boss-abilities.', ability: 'Ability-blokker' },
  { id: 'bloodbank', name: 'Blood Bank', rarity: 'legendary', cat: 'farm', cost: 1500, kind: 'bloodbank',
    income: 0, bounty: 0.6, range: 4.5, limit: 2, tracks: ['inc', 'rng'], desc: 'Zombies die in zijn bereik sterven leveren 60% meer geld op.', ability: '+60% kill-geld' },
  { id: 'jackpot', name: 'Jackpot Machine', rarity: 'legendary', cat: 'farm', cost: 1300, kind: 'jackpot',
    income: 200, tracks: ['inc'], desc: 'Gokkast: elke 5s een spin. Vaak niets, soms veel, heel soms de jackpot (15x).', ability: 'Random uitbetaling' },
  // ---------------- MYTHIC ----------------
  { id: 'nuke', name: 'Nuclear Reactor', rarity: 'mythic', cat: 'special', cost: 4200, kind: 'nuke',
    dmg: 1500, cd: 12, range: 7, radius: 3.5, tracks: ['dmg', 'spd', 'spc'], desc: 'Laadt op en lanceert een kernexplosie op de grootste groep, met een stralingsveld erna.', ability: 'Nuke + straling' },
  { id: 'dragon', name: 'Flame Dragon', rarity: 'mythic', cat: 'turret', cost: 4000, kind: 'dragon',
    dmg: 20, cd: 0.15, range: 6.5, burn: 40, burnDur: 3, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Een draak die een enorme vuurstroom spuwt — raakt ook vliegende zombies.', ability: 'Lange vuurstroom' },
  { id: 'portal', name: 'Portal Tower', rarity: 'mythic', cat: 'special', cost: 3600, kind: 'portal',
    cd: 6, range: 5, count: 5, back: 0.45, tracks: ['spd', 'rng', 'spc'], desc: 'Stuurt de voorste zombies door een portaal terug naar het begin van hun route.', ability: 'Terugsturen' },
  { id: 'celestial', name: 'Celestial Cannon', rarity: 'mythic', cat: 'turret', cost: 4400, kind: 'celestial', detect: true,
    dmg: 350, cd: 2.2, range: 8, splash: 1.4, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Schiet een sterrenbol die door alle zombies heen gaat en aan het eind ontploft.', ability: 'Pierce + explosie' },
  { id: 'dimension', name: 'Dimension Tower', rarity: 'mythic', cat: 'special', cost: 3800, kind: 'dimension',
    dmg: 80, cd: 5, range: 6, links: 5, share: 0.6, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Verbindt 5 zombies via een dimensie-scheur: damage op één wordt voor 60% gedeeld met de rest.', ability: 'Damage-link' },
  { id: 'storm', name: 'Storm Generator', rarity: 'mythic', cat: 'special', cost: 4000, kind: 'storm',
    dmg: 160, cd: 7, range: 7, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Roept een onweersbui op: 6 seconden lang slaan bliksems in op zombies in de buurt.', ability: 'Bliksemstorm' },
  // ---------------- SECRET ----------------
  { id: 'worldender', name: 'World Ender', rarity: 'secret', cat: 'special', cost: 9500, kind: 'worldender',
    cd: 40, range: 7, limit: 1, tracks: ['spd', 'rng', 'spc'], desc: 'Eens per 40s: vaagt álle gewone zombies in bereik weg en haalt 25% van de HP van bosses af.', ability: 'Totale vernietiging' },
  { id: 'eternal', name: 'Eternal Machine', rarity: 'secret', cat: 'special', cost: 9000, kind: 'eternal', detect: true,
    dmg: 180, cd: 0.5, range: 6.5, tracks: ['dmg', 'spd', 'rng', 'spc'], desc: 'Elk schot is kogel, bliksem, vuur, ijs én gif tegelijk.', ability: 'Alles-in-één' }

];
G.ITEM = {}; G.ITEMS.forEach(function (it, i) {
  it.index = i; it.place = it.place || 'slot'; G.ITEM[it.id] = it;
  it.isFarm = it.cat === 'farm';
  it.limit = it.limit || G.RAR[it.rarity].limit;
});
// ---------------------------------------------------------------------
//  EVOLUTIONS — two stages per line; need a tower level + money
//  mul: stat multipliers | extra fields are abilities read by the simulation
// ---------------------------------------------------------------------
G.EVO = {
  pistol: [
    { name: 'SMG Turret', lvl: 6, cost: 450, mul: { dmg: 1.5, cd: 0.7 }, multi: 2, ability: 'Raakt 2 zombies tegelijk' },
    { name: 'Gatling Destroyer', lvl: 14, cost: 2200, mul: { dmg: 2.6, cd: 0.45, rng: 1.15 }, multi: 3, pierceArmor: 0.5, ability: '3 doelen, negeert 50% armor' }],
  shotgun: [
    { name: 'Riot Shotgun', lvl: 6, cost: 700, mul: { dmg: 1.5 }, pellets: 2, knock: 0.3, ability: '+2 pellets, duwt terug' },
    { name: 'Doom Blaster', lvl: 14, cost: 2800, mul: { dmg: 2.6, rng: 1.2 }, pellets: 5, splashHit: 0.8, ability: '+5 pellets met mini-explosies' }],
  frost: [
    { name: 'Cryo Tower', lvl: 6, cost: 1100, mul: { dmg: 1.6 }, slowAdd: 0.15, freeze: { chance: 0.15, dur: 0.6 }, ability: 'Kans om te bevriezen' },
    { name: 'Absolute Zero', lvl: 14, cost: 4000, mul: { dmg: 3, rng: 1.15 }, slowAdd: 0.25, freeze: { chance: 0.3, dur: 1 }, splashHit: 1.2, ability: 'Bevriest vaker, ijsscherven-splash' }],
  sniper: [
    { name: 'Railgun', lvl: 6, cost: 1300, mul: { dmg: 1.8 }, pierce: true, ability: 'Schiet door alle zombies in een lijn' },
    { name: 'Hyper Sniper', lvl: 14, cost: 4500, mul: { dmg: 3.2, rng: 1.2 }, pierce: true, crit: { chance: 0.25, mult: 3 }, ability: 'Pierce + 25% kans op 3x crit' }],
  flamethrower: [
    { name: 'Inferno Cannon', lvl: 6, cost: 1500, mul: { dmg: 1.6, rng: 1.25 }, burnMul: 1.8, ability: 'Groter bereik, hetere brand' },
    { name: "Dragon's Breath", lvl: 14, cost: 5000, mul: { dmg: 2.8, rng: 1.5 }, burnMul: 3, hitAir: true, ability: 'Raakt ook vliegende zombies' }],
  tesla: [
    { name: 'Storm Coil', lvl: 6, cost: 1300, mul: { dmg: 1.6 }, chainAdd: 2, ability: '+2 sprongen' },
    { name: "Thor's Hammer", lvl: 14, cost: 4200, mul: { dmg: 2.8, rng: 1.2 }, chainAdd: 5, stun: 0.3, ability: '+5 sprongen, verdooft' }],
  rocket: [
    { name: 'Missile Battery', lvl: 6, cost: 1500, mul: { dmg: 1.4 }, rockets: 3, ability: '3 raketten op 3 doelen' },
    { name: 'Apocalypse Silo', lvl: 14, cost: 5000, mul: { dmg: 2.4, rng: 1.2 }, rockets: 5, splashMul: 1.4, ability: '5 raketten, grotere explosies' }],
  laser: [
    { name: 'Prism Array', lvl: 6, cost: 1600, mul: { dmg: 1.6 }, beams: 2, ability: '2 laserstralen' },
    { name: 'Photon Annihilator', lvl: 14, cost: 5200, mul: { dmg: 2.8, rng: 1.15 }, beams: 3, burnHit: 30, ability: '3 stralen die laten branden' }],
  printer: [
    { name: 'Gold Works', lvl: 4, cost: 1400, mul: { inc: 2.0 }, ability: '2x inkomen' },
    { name: 'Diamond Empire', lvl: 9, cost: 5000, mul: { inc: 4.2 }, gem: { chance: 0.03, amount: 5000 }, ability: '4.2x inkomen + diamanten' }],
  cashreg: [
    { name: 'Golden Register', lvl: 4, cost: 600, mul: { inc: 1.8 }, ability: '1.8x inkomen' },
    { name: 'Bank Vault', lvl: 9, cost: 2500, mul: { inc: 3.6 }, ability: '3.6x inkomen' }]
};
Object.keys(G.EVO).forEach(function (id) { G.ITEM[id].evo = G.EVO[id]; G.EVO[id][0].lvl = G.ITEM[id].isFarm ? 3 : 4; G.EVO[id][1].lvl = G.ITEM[id].isFarm ? 7 : 8; });

// ---------------------------------------------------------------------
//  UPGRADE PATH — one upgrade button per tower; every level improves a
//  mix of stats (e.g. Lv1: +44% damage +8% range, Lv2: +20% attack speed
//  +15% special). 10 levels; at max level every stat track is maxed.
// ---------------------------------------------------------------------
G.UPGRADE_LEVELS = 10;
G.buildPath = function (it) {
  var tr = it.tracks, n = tr.length, L = G.UPGRADE_LEVELS, MAX = G.MAX_TRACK_LEVEL, cum = {}, path = [];
  var per = n * MAX / L, width = n <= 1 ? 1 : n <= 3 ? 2 : 3;
  tr.forEach(function (t) { cum[t] = 0; });
  for (var i = 0; i < L; i++) {
    var pts = Math.round(per * (i + 1)) - Math.round(per * i), ideal = MAX * (i + 1) / L;
    var rot = function (t) { return (tr.indexOf(t) - i % n + n) % n; };
    var order = tr.filter(function (t) { return cum[t] < MAX; }).sort(function (a, b) { return ((ideal - cum[b]) - (ideal - cum[a])) || (rot(a) - rot(b)); });
    var pick = order.slice(0, Math.min(width, pts)), inc = {};
    for (var k = 0; k < pts; k++) {
      var best = null, bd = -1e9;
      pick.forEach(function (t) { var d = ideal - cum[t] - (inc[t] || 0); if (cum[t] + (inc[t] || 0) < MAX && d > bd) { bd = d; best = t; } });
      if (!best) break;
      inc[best] = (inc[best] || 0) + 1;
    }
    for (var t in inc) cum[t] += inc[t];
    path.push(inc);
  }
  return path;
};
G.ITEMS.forEach(function (it) { it.path = G.buildPath(it); });
G.pathText = function (it, inc) {
  return it.tracks.filter(function (t) { return inc[t]; }).map(function (t) {
    var pct = Math.round(inc[t] * G.TRACKS[t].per * 100);
    var extra = t === 'spc' ? (it.kind === 'spread' ? ' (+' + inc[t] + ' pellet)' : it.kind === 'chain' ? ' (+' + inc[t] + ' sprong)' : '') : '';
    return '+' + pct + '% ' + G.TRACKS[t].name.toLowerCase() + extra;
  }).join(', ');
};
G.itemsByRarity = function (rid) { return G.ITEMS.filter(function (i) { return i.rarity === rid; }); };

// ---------------------------------------------------------------------
//  ZOMBIES
// ---------------------------------------------------------------------
// hp / speed (tiles/s) / dmg per hit (1 hit per second) / reward ($)
G.ZOMBIES = {
  normal:    { name: 'Normal Zombie',    hp: 30,  speed: 0.9,  dmg: 8,  reward: 5,  color: '#6fbf4a', size: 1 },
  fast:      { name: 'Fast Zombie',      hp: 18,  speed: 1.8,  dmg: 5,  reward: 7,  color: '#e0503a', size: 0.85 },
  tank:      { name: 'Tank Zombie',      hp: 150, speed: 0.6,  dmg: 20, reward: 18, color: '#4a6a3a', size: 1.3 },
  armored:   { name: 'Armored Zombie',   hp: 60,  speed: 0.8,  dmg: 10, reward: 15, color: '#7a8a94', size: 1.05, armor: 2.5 },
  exploding: { name: 'Exploding Zombie', hp: 35,  speed: 1.2,  dmg: 6,  reward: 10, color: '#ff8a1e', size: 1, explode: 15 },
  poisonz:   { name: 'Poison Zombie',    hp: 45,  speed: 0.9,  dmg: 6,  reward: 12, color: '#9be03a', size: 1, doorPoison: true },
  invisible: { name: 'Invisible Zombie', hp: 35,  speed: 1.1,  dmg: 8,  reward: 12, color: '#b9c4ff', size: 0.95, invis: true },
  giant:     { name: 'Giant Zombie',     hp: 520, speed: 0.45, dmg: 45, reward: 50, color: '#3d5e2e', size: 1.7, heavy: true },
  healer:    { name: 'Healer Zombie',    hp: 70,  speed: 0.8,  dmg: 6,  reward: 16, color: '#f1f1f1', size: 1, healer: true },
  flying:    { name: 'Flying Zombie',    hp: 40,  speed: 1.3,  dmg: 8,  reward: 12, color: '#8f5ac8', size: 0.9, fly: true },
  // map specific
  police:    { name: 'Police Zombie',    hp: 90,  speed: 0.85, dmg: 12, reward: 16, color: '#2f5fb8', size: 1.05, armor: 4, blocks: 2 },
  mutant:    { name: 'Mutated Zombie',   hp: 120, speed: 1.0,  dmg: 14, reward: 18, color: '#a54bd6', size: 1.15, regen: 0.02 },
  frozen:    { name: 'Frozen Zombie',    hp: 70,  speed: 0.8,  dmg: 10, reward: 12, color: '#8fd8ff', size: 1, immuneSlow: true },
  icemonster:{ name: 'Ice Monster',      hp: 260, speed: 0.55, dmg: 25, reward: 30, color: '#c8f2ff', size: 1.4, freezeOnDeath: true, immuneSlow: true },
  snowmutant:{ name: 'Snow Mutant',      hp: 40,  speed: 2.3,  dmg: 6,  reward: 10, color: '#ffffff', size: 0.85 },
  firemonster:{ name: 'Fire Monster',    hp: 90,  speed: 1.0,  dmg: 12, reward: 14, color: '#ff5a1e', size: 1.05, immuneBurn: true },
  labmutant: { name: 'Lab Mutant',       hp: 110, speed: 0.9,  dmg: 12, reward: 16, color: '#39ff8a', size: 1.1, split: 2 },
  labspawn:  { name: 'Mutant Spawn',     hp: 40,  speed: 1.4,  dmg: 6,  reward: 4,  color: '#7dffb5', size: 0.7 },
  magma:     { name: 'Magma Brute',      hp: 320, speed: 0.5,  dmg: 30, reward: 34, color: '#5a2a1e', size: 1.45, armor: 5, immuneBurn: true },
  golden:    { name: 'Golden Zombie',    hp: 30,  speed: 0.6,  dmg: 0,  reward: 30, color: '#ffd700', size: 1 }
};
Object.keys(G.ZOMBIES).forEach(function (k) { G.ZOMBIES[k].id = k; });

// ---------------------------------------------------------------------
//  BOSSES (12)
// ---------------------------------------------------------------------
G.BOSSES = {
  king:     { name: 'Giant Zombie King', title: 'Heerser van de Verlaten Stad', hp: 1.0, speed: 0.45, dmg: 60, armor: 1, color: '#4f8a2e', size: 2.2,
              abil: 'Roept iedere 7s 4 zombies op. Enrage onder 50% HP.' },
  butcher:  { name: 'The Butcher', title: 'Slachter van Blok 9', hp: 0.9, speed: 0.55, dmg: 80, armor: 1.5, color: '#a33a3a', size: 2.0,
              abil: 'Stormt iedere 8s vooruit en verplettert muren.' },
  riot:     { name: 'Riot Commander', title: 'Laatste Politie-eenheid', hp: 1.0, speed: 0.5, dmg: 55, armor: 8, color: '#28468f', size: 2.0,
              abil: 'Riot Shield maakt hem 2.5s immuun. Geeft zombies in de buurt armor.' },
  cyber:    { name: 'Cyber Zombie', title: 'Het Gehackte Experiment', hp: 1.0, speed: 0.6, dmg: 60, armor: 4, color: '#2ad4ff', size: 2.0,
              abil: 'EMP iedere 10s: schakelt towers in de buurt 3s uit.' },
  titan:    { name: 'Frozen Titan', title: 'Reus uit het Eeuwige IJs', hp: 1.4, speed: 0.35, dmg: 120, armor: 5, color: '#9ae6ff', size: 2.4, immuneSlow: true,
              abil: 'Frost Nova bevriest towers. Immuun voor slow.' },
  reaper:   { name: 'Shadow Reaper', title: 'Fluisteraar in de Sneeuwstorm', hp: 0.9, speed: 0.6, dmg: 80, armor: 2, color: '#2a1f3a', size: 2.0,
              abil: 'Wordt periodiek onzichtbaar en teleporteert vooruit.' },
  wyrm:     { name: 'Blizzard Wyrm', title: 'Vliegende IJsdraak', hp: 1.0, speed: 0.7, dmg: 70, armor: 3, color: '#e8f8ff', size: 2.1, fly: true,
              abil: 'Vliegt over traps. Roept Snow Mutants op.' },
  mutantboss:{ name: 'The Mutant', title: 'Onstuitbare Celdeling', hp: 1.1, speed: 0.5, dmg: 70, armor: 3, color: '#b04fe0', size: 2.1,
              abil: 'Regenereert en splitst zich bij de dood in twee.' },
  lava:     { name: 'Lava Colossus', title: 'Hart van de Vulkaan', hp: 1.5, speed: 0.35, dmg: 120, armor: 10, color: '#4a1a10', size: 2.5, immuneBurn: true,
              abil: 'Erupties roepen Fire Monsters op. Immuun voor vuur.' },
  toxic:    { name: 'Toxic Abomination', title: 'Mislukt Gifproject', hp: 1.2, speed: 0.45, dmg: 80, armor: 4, color: '#7fd61e', size: 2.3,
              abil: 'Giftig aura vertraagt towers en heelt zombies. Valt uiteen in gifzombies.' },
  voidm:    { name: 'Void Monster', title: 'Scheur in de Realiteit', hp: 1.3, speed: 0.5, dmg: 90, armor: 6, color: '#3a0a5e', size: 2.3,
              abil: 'Void Phase: wordt 2s immuun en heelt zichzelf.' },
  final:    { name: 'The Final Experiment', title: 'Subject Ω', hp: 2.0, speed: 0.45, dmg: 140, armor: 8, color: '#e6ff3a', size: 2.6,
              abil: '3 fases: mutanten oproepen, EMP, extra armor en regeneratie.' }
};
Object.keys(G.BOSSES).forEach(function (k) { G.BOSSES[k].id = k; });

// ---------------------------------------------------------------------
//  MAPS & DIFFICULTIES
// ---------------------------------------------------------------------
G.MAPS = [
  { id: 'city', name: 'Abandoned City', desc: 'Een verlaten stad vol normale zombies, politie-zombies en mutanten.',
    special: ['police', 'mutant', 'tank'], bosses: ['king', 'butcher', 'riot', 'cyber'], hp: 1.0, reward: 1.0,
    sky: '#1d2330', ground: '#2b2e33', accent: '#ffb347', path: '#5f636b', particle: 'dust', music: 'city' },
  { id: 'frozen', name: 'Frozen Wasteland', desc: 'Een besneeuwde wereld met bevroren zombies, ijsmonsters en snelle sneeuwmutanten.',
    special: ['frozen', 'icemonster', 'snowmutant'], bosses: ['titan', 'reaper', 'wyrm', 'mutantboss'], hp: 1.1, reward: 1.15,
    sky: '#16263a', ground: '#c9dbe8', accent: '#7fd7ff', path: '#9fb8c9', particle: 'snow', music: 'frozen' },
  { id: 'volcano', name: 'Volcanic Laboratory', desc: 'Een gevaarlijk lab in een vulkaan met vuurmonsters, mutanten en experimentele bosses.',
    special: ['firemonster', 'labmutant', 'magma'], bosses: ['lava', 'toxic', 'voidm', 'final'], hp: 1.2, reward: 1.3,
    sky: '#1a0c0a', ground: '#241614', accent: '#ff5a1e', path: '#55403a', particle: 'ember', music: 'volcano' }
];
G.MAP = {}; G.MAPS.forEach(function (m) { G.MAP[m.id] = m; });

G.DIFFS = [
  { id: 'easy',    name: 'Easy',    waves: 10, hp: 0.72, dmg: 0.7, count: 0.85, cash: 1.15, reward: 500,  color: '#4cd964', bossBonus: 40 },
  { id: 'medium',  name: 'Medium',  waves: 20, hp: 0.95,  dmg: 1.0, count: 1.0,  cash: 1.0,  reward: 1500, color: '#ffcc00', bossBonus: 100 },
  { id: 'hard',    name: 'Hard',    waves: 30, hp: 1.1, dmg: 1.3, count: 1.12, cash: 0.95, reward: 4000, color: '#ff3b30', bossBonus: 200 },
  { id: 'endless', name: 'Endless', waves: Infinity, hp: 0.95, dmg: 1.1, count: 1.0, cash: 1.0, reward: 0, color: '#bf5af2', bossBonus: 80 }
];
G.DIFF = {}; G.DIFFS.forEach(function (d) { G.DIFF[d.id] = d; });

// Door appearance tiers
G.DOOR_TIERS = [
  { lvl: 0,  name: 'Wooden Door',     color: '#8b5a2b', trim: '#5e3a1a' },
  { lvl: 3,  name: 'Reinforced Door', color: '#9c6b3a', trim: '#6b6b6b' },
  { lvl: 5,  name: 'Iron Door',       color: '#7d8590', trim: '#4a5058' },
  { lvl: 8,  name: 'Steel Vault',     color: '#aab6c2', trim: '#58636e' },
  { lvl: 11, name: 'Titanium Gate',   color: '#d6dde4', trim: '#3a7bd5' },
  { lvl: 15, name: 'Diamond Gate',    color: '#a8f0ff', trim: '#2ad4ff' },
  { lvl: 20, name: 'Energy Barrier',  color: '#7affc8', trim: '#00ff9d' },
  { lvl: 30, name: 'Cosmic Portal',   color: '#d89cff', trim: '#ff5ad8' }
];
G.doorTier = function (lvl) { var t = G.DOOR_TIERS[0]; G.DOOR_TIERS.forEach(function (d) { if (lvl >= d.lvl) t = d; }); return t; };
G.doorMaxHp = function (lvl) { return Math.round(500 * Math.pow(1.42, lvl)); };
G.doorArmor = function (lvl) { return Math.min(0.6, lvl * 0.025); };     // % damage reduction
G.doorUpgradeCost = function (lvl) { return Math.round(220 * Math.pow(1.62, lvl) / 10) * 10; };

// ---------------------------------------------------------------------
//  WORLD — one big open hall (64x44 tiles). Zombies pour out of gates in
//  the outer wall and walk the shortest route to the door of their room.
//  8 equally sized rooms (interior 6x5 = 30 tiles), each with one door.
//  _ floor | W outer wall | G gate | # room wall | D door | B build tile | o pillar
// ---------------------------------------------------------------------
G.WCOLS = 64; G.WROWS = 44;
G.COLS = G.WCOLS; G.ROWS = G.WROWS;
G.ROOM_STYLES = [
  { id: 'basement',    name: 'Small Basement',   theme: { floor: '#5a5550', floor2: '#4f4a46', wall: '#6e6259', wallTop: '#8a7d72' } },
  { id: 'bunker',      name: 'Military Bunker',  theme: { floor: '#4b5a3c', floor2: '#435134', wall: '#5d6b4a', wallTop: '#7c8b63' } },
  { id: 'house',       name: 'Abandoned House',  theme: { floor: '#7a5a3a', floor2: '#6e5034', wall: '#8a6d55', wallTop: '#a88a70' } },
  { id: 'lab',         name: 'Laboratory',       theme: { floor: '#d8dee4', floor2: '#c9d0d7', wall: '#9aa5b0', wallTop: '#c2ccd5' } },
  { id: 'warehouse',   name: 'Warehouse',        theme: { floor: '#6b5f4e', floor2: '#615545', wall: '#7a6a55', wallTop: '#9a8a72' } },
  { id: 'castle',      name: 'Castle Room',      theme: { floor: '#5e5e6a', floor2: '#55555f', wall: '#6f6f7d', wallTop: '#8f8f9e' } },
  { id: 'underground', name: 'Underground Base', theme: { floor: '#3a4048', floor2: '#333840', wall: '#4a525c', wallTop: '#68727e' } },
  { id: 'secret',      name: 'Secret Room',      theme: { floor: '#3a2a4e', floor2: '#332545', wall: '#4e3a66', wallTop: '#6e5590' } }
];
// plot = top-left of its 8x7 wall rectangle + the side its door is on
G.PLOTS = [
  { x: 4, y: 6, door: 'right' }, { x: 21, y: 5, door: 'top' }, { x: 35, y: 5, door: 'top' }, { x: 52, y: 6, door: 'left' },
  { x: 4, y: 31, door: 'right' }, { x: 21, y: 32, door: 'bottom' }, { x: 35, y: 32, door: 'bottom' }, { x: 52, y: 31, door: 'left' }
];
G.GATES = [
  { x: 16, y: 0, dx: 0, dy: 1 }, { x: 47, y: 0, dx: 0, dy: 1 }, { x: 16, y: 43, dx: 0, dy: -1 },
  { x: 47, y: 43, dx: 0, dy: -1 }, { x: 0, y: 21, dx: 1, dy: 0 }, { x: 63, y: 21, dx: -1, dy: 0 }
];
G.buildWorld = function () {
  var W = G.WCOLS, H = G.WROWS, grid = [], x, y;
  for (y = 0; y < H; y++) { grid.push([]); for (x = 0; x < W; x++) grid[y].push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'W' : '_'); }
  G.GATES.forEach(function (g) {
    for (var k = -1; k <= 1; k++) { var gx = g.x + (g.dx ? 0 : k), gy = g.y + (g.dy ? 0 : k); grid[gy][gx] = 'G'; }
    g.spawn = { x: g.x + g.dx, y: g.y + g.dy };
  });
  var rooms = [];
  G.PLOTS.forEach(function (pl, i) {
    var room = Object.assign({}, G.ROOM_STYLES[i]);
    room.index = i;
    room.walls = { x0: pl.x, y0: pl.y, x1: pl.x + 7, y1: pl.y + 6 };
    room.interior = { x0: pl.x + 1, y0: pl.y + 1, x1: pl.x + 6, y1: pl.y + 5 };
    for (y = pl.y; y <= pl.y + 6; y++) for (x = pl.x; x <= pl.x + 7; x++) grid[y][x] = (y === pl.y || y === pl.y + 6 || x === pl.x || x === pl.x + 7) ? '#' : 'B';
    var d, out, back;
    if (pl.door === 'top') { d = { x: pl.x + 3, y: pl.y }; out = { x: d.x, y: d.y - 1 }; back = { x: d.x, y: pl.y + 5 }; }
    if (pl.door === 'bottom') { d = { x: pl.x + 4, y: pl.y + 6 }; out = { x: d.x, y: d.y + 1 }; back = { x: d.x, y: pl.y + 1 }; }
    if (pl.door === 'left') { d = { x: pl.x, y: pl.y + 3 }; out = { x: d.x - 1, y: d.y }; back = { x: pl.x + 6, y: d.y }; }
    if (pl.door === 'right') { d = { x: pl.x + 7, y: pl.y + 3 }; out = { x: d.x + 1, y: d.y }; back = { x: pl.x + 1, y: d.y }; }
    grid[d.y][d.x] = 'D';
    room.door = d; room.front = out; room.doorSide = pl.door; room.cashSlot = back;
    room.top = pl.door === 'top' || pl.y < 20;
    room.zone = { x0: pl.x - 4, y0: pl.y - 4, x1: pl.x + 11, y1: pl.y + 10 };
    rooms.push(room);
  });
  var deco = [];
  for (y = 20; y <= 23; y++) for (x = 30; x <= 33; x++) grid[y][x] = 'o';
  [[18, 17], [26, 17], [37, 17], [45, 17], [18, 26], [26, 26], [37, 26], [45, 26], [8, 21], [55, 21]].forEach(function (p) { grid[p[1]][p[0]] = 'o'; deco.push(p); });
  G.WORLD = { grid: grid, cols: W, rows: H, deco: deco };
  G.ROOMS = rooms;
};
G.buildWorld();
// avatars: floor, doors and build tiles
G.isWalk = function (tx, ty) {
  if (tx < 0 || ty < 0 || tx >= G.WCOLS || ty >= G.WROWS) return false;
  var c = G.WORLD.grid[ty][tx]; return c === '_' || c === 'B' || c === 'D';
};
// zombies: open floor (and gates) only
G.isZWalk = function (tx, ty) {
  if (tx < 0 || ty < 0 || tx >= G.WCOLS || ty >= G.WROWS) return false;
  var c = G.WORLD.grid[ty][tx]; return c === '_' || c === 'G';
};
G.inRect = function (r, tx, ty) { return tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1; };

// Shortest route (8-directional Dijkstra, keeps a little distance from walls, then smoothed)
G.zRoute = function (sx, sy, tx, ty) {
  var W = G.WCOLS, H = G.WROWS, N = W * H, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  var near = new Float64Array(N);
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    if (!G.isZWalk(x, y)) continue; var pen = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if ((dx || dy) && !G.isZWalk(x + dx, y + dy) && G.WORLD.grid[y + dy] && G.WORLD.grid[y + dy][x + dx] !== 'G') pen = 0.5;
    near[y * W + x] = pen;
  }
  var s = sy * W + sx, goal = ty * W + tx, heap = [[0, s]]; dist[s] = 0;
  function push(it) { heap.push(it); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp; i = p; } }
  function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = i * 2 + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var tmp = heap[m]; heap[m] = heap[i]; heap[i] = tmp; i = m; } } return top; }
  while (heap.length) {
    var cur = pop(), c = cur[1]; if (done[c]) continue; done[c] = 1; if (c === goal) break;
    var cx = c % W, cy = (c / W) | 0;
    for (var k = 0; k < 8; k++) {
      var ddx = [1, -1, 0, 0, 1, 1, -1, -1][k], ddy = [0, 0, 1, -1, 1, -1, 1, -1][k], nx = cx + ddx, ny = cy + ddy;
      if (!G.isZWalk(nx, ny)) continue;
      if (ddx && ddy && (!G.isZWalk(cx + ddx, cy) || !G.isZWalk(cx, cy + ddy))) continue;
      var n = ny * W + nx, nd = dist[c] + (ddx && ddy ? 1.414 : 1) + near[n];
      if (nd < dist[n]) { dist[n] = nd; prev[n] = c; push([nd, n]); }
    }
  }
  if (prev[goal] < 0 && goal !== s) return null;
  var tiles = [], cc = goal;
  while (cc !== s) { tiles.unshift({ x: cc % W, y: (cc / W) | 0 }); cc = prev[cc]; }
  tiles.unshift({ x: sx, y: sy });
  return tiles;
};
function zLos(ax, ay, bx, by) {
  var T = G.T, d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 6)), R = 11;
  for (var i = 0; i <= n; i++) {
    var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    if (!G.isZWalk(Math.floor((x - R) / T), Math.floor((y - R) / T)) || !G.isZWalk(Math.floor((x + R) / T), Math.floor((y - R) / T)) ||
        !G.isZWalk(Math.floor((x - R) / T), Math.floor((y + R) / T)) || !G.isZWalk(Math.floor((x + R) / T), Math.floor((y + R) / T))) return false;
  }
  return true;
}
G.makeRoute = function (tiles, endPt, gi) {
  var T = G.T, raw = tiles.map(function (t) { return { x: t.x * T + T / 2, y: t.y * T + T / 2 }; }), pts = [raw[0]], i = 0;
  while (i < raw.length - 1) {
    var j = raw.length - 1;
    while (j > i + 1 && !zLos(raw[i].x, raw[i].y, raw[j].x, raw[j].y)) j--;
    pts.push(raw[j]); i = j;
  }
  pts.push(endPt);
  var cum = [0];
  for (var k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  return { pts: pts, cum: cum, len: cum[cum.length - 1], gate: gi, tiles: tiles };
};

G.prepRooms = function () {
  var T = G.T;
  G.ROOMS.forEach(function (room) {
    var D = room.door, F = room.front, slots = [];
    for (var y = room.interior.y0; y <= room.interior.y1; y++) for (var x = room.interior.x0; x <= room.interior.x1; x++)
      slots.push({ x: x, y: y, cash: x === room.cashSlot.x && y === room.cashSlot.y });
    room.slots = slots; room.slotCount = slots.length;
    room.doorPx = { x: D.x * T + T / 2, y: D.y * T + T / 2 };
    room.frontPx = { x: F.x * T + T / 2, y: F.y * T + T / 2 };
    room.outside = { x: room.frontPx.x + (F.x - D.x) * T, y: room.frontPx.y + (F.y - D.y) * T };
    room.center = { x: (room.interior.x0 + room.interior.x1 + 1) / 2 * T, y: (room.interior.y0 + room.interior.y1 + 1) / 2 * T };
    var endPt = { x: (room.frontPx.x + room.doorPx.x) / 2 + (F.x - D.x) * 4, y: (room.frontPx.y + room.doorPx.y) / 2 + (F.y - D.y) * 4 };
    room.routes = G.GATES.map(function (g, gi) {
      var tiles = G.zRoute(g.spawn.x, g.spawn.y, F.x, F.y);
      if (!tiles) throw new Error('No route ' + room.id + ' gate ' + gi);
      return G.makeRoute(tiles, endPt, gi);
    });
    // use the gates with a fair (not too short) walk; every room ends up with similar distances
    var sorted = room.routes.slice().sort(function (a, b) { return a.len - b.len; });
    room.useRoutes = sorted.slice(2);
    room.pathLen = room.useRoutes.reduce(function (a, r) { return a + r.len; }, 0) / room.useRoutes.length;
    // yard: floor tiles near the front of the door where traps & barricades can go
    var yard = {}, yardList = [];
    for (var yy = F.y - 3; yy <= F.y + 3; yy++) for (var xx = F.x - 3; xx <= F.x + 3; xx++) {
      if (!G.isZWalk(xx, yy) || G.WORLD.grid[yy][xx] === 'G') continue;
      if (Math.hypot(xx - F.x, yy - F.y) > 3.2) continue;
      yard[xx + ',' + yy] = true; yardList.push({ x: xx, y: yy });
    }
    room.pathSet = yard; room.pathTiles = yardList; room.pathTileCount = Math.round(room.pathLen / T);
    // sample points along used routes (for bot placement scoring)
    var samples = [];
    room.useRoutes.forEach(function (r) {
      for (var d = 0; d < r.len; d += T) { var p = G.routePos(r, d); samples.push({ x: p.x, y: p.y, w: 0.6 + 0.8 * d / r.len }); }
    });
    room.samples = samples;
    room.grid = G.WORLD.grid;
  });
};
G.routePos = function (r, d) {
  var pts = r.pts, cum = r.cum, i = 0;
  d = Math.max(0, Math.min(d, r.len));
  while (i < pts.length - 2 && cum[i + 1] < d) i++;
  var a = pts[i], b = pts[i + 1], seg = (cum[i + 1] - cum[i]) || 1, f = (d - cum[i]) / seg;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dir: Math.atan2(b.y - a.y, b.x - a.x), i: i };
};
G.prepRooms();

// Grid pathfinding for avatars (BFS)
G.findPath = function (sx, sy, tx, ty) {
  var W = G.WCOLS, H = G.WROWS;
  if (!G.isWalk(tx, ty)) {
    var best = null, bd = 1e9;
    for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) if (G.isWalk(tx + dx, ty + dy)) { var d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [tx + dx, ty + dy]; } }
    if (!best) return null; tx = best[0]; ty = best[1];
  }
  var start = sy * W + sx, goal = ty * W + tx, prev = new Int32Array(W * H).fill(-1), q = [start], qi = 0;
  prev[start] = start;
  while (qi < q.length) {
    var c = q[qi++]; if (c === goal) break;
    var cx = c % W, cy = (c / W) | 0;
    for (var k = 0; k < 4; k++) {
      var nx = cx + [1, -1, 0, 0][k], ny = cy + [0, 0, 1, -1][k];
      if (!G.isWalk(nx, ny)) continue;
      var n = ny * W + nx; if (prev[n] >= 0) continue; prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] < 0) return null;
  var out = [], cur = goal;
  while (cur !== start) { out.unshift({ x: (cur % W) * G.T + G.T / 2, y: ((cur / W) | 0) * G.T + G.T / 2 }); cur = prev[cur]; }
  return out;
};

G.BOT_STYLES = {
  beginner:  { name: 'Beginner',  think: 2.8, farm: 0.3,  door: 0.15, upgrade: 0.35, mistakes: 0.35 },
  balanced:  { name: 'Balanced',  think: 1.4, farm: 0.35, door: 0.3,  upgrade: 0.5,  mistakes: 0.05 },
  aggressive:{ name: 'Aggressive',think: 1.2, farm: 0.15, door: 0.2,  upgrade: 0.6,  mistakes: 0.08 },
  economy:   { name: 'Economy',   think: 1.4, farm: 0.6,  door: 0.25, upgrade: 0.45, mistakes: 0.05 },
  defensive: { name: 'Defensive', think: 1.4, farm: 0.25, door: 0.6,  upgrade: 0.5,  mistakes: 0.05 }
};

G.BOT_NAMES = ['Kevin_B0t', 'ZombieSlayer', 'NoobMaster', 'xX_Tank_Xx', 'LunaPlays', 'DoorKeeper', 'MrFarm', 'Bloxxer99',
  'TurretTom', 'SnowQueen', 'LavaLord', 'Sniper_Sam', 'CashKing', 'PixelPim', 'Jesse_TD', 'BuilderBob', 'Ninja_Noor', 'Fenna_GG'];

G.PLAYER_COLORS = ['#ffd23f', '#ff6b6b', '#4ecdc4', '#a06cd5', '#ff9f1c', '#2ec4b6', '#e84a8a', '#7bd389'];

G.ACHIEVEMENTS = [
  // stat: lifetime stat key (or special) • goal: amount needed — progress is shown in the menu
  { id: 'firstwin',  icon: '🏆', name: 'First Victory',      desc: 'Win je eerste potje.',                     stat: 'wins',        goal: 1,       reward: 200 },
  { id: 'boss1',     icon: '👑', name: 'Boss Breaker',       desc: 'Versla je eerste boss.',                   stat: 'bosses',      goal: 1,       reward: 150 },
  { id: 'boss10',    icon: '⚔️', name: 'Boss Hunter',        desc: 'Versla in totaal 10 bosses.',              stat: 'bosses',      goal: 10,      reward: 800 },
  { id: 'boss100',   icon: '🐉', name: 'Boss Slayer',        desc: 'Versla in totaal 100 bosses.',             stat: 'bosses',      goal: 100,     reward: 5000 },
  { id: 'kills1000', icon: '🧟', name: 'Zombie Hunter',      desc: 'Versla in totaal 1.000 zombies.',          stat: 'kills',       goal: 1000,    reward: 600 },
  { id: 'kills25k',  icon: '💀', name: 'Zombie Exterminator', desc: 'Versla in totaal 25.000 zombies.',        stat: 'kills',       goal: 25000,   reward: 4000 },
  { id: 'flawless',  icon: '🛡️', name: 'Onaantastbaar',      desc: 'Win zonder dat je deur damage krijgt.',    stat: 'flawless',    goal: 1,       reward: 500 },
  { id: 'medium',    icon: '🟨', name: 'Doorzetter',         desc: 'Win op Medium.',                           stat: 'medWins',     goal: 1,       reward: 400 },
  { id: 'hard',      icon: '🟥', name: 'Hardcore',           desc: 'Win op Hard.',                             stat: 'hardWins',    goal: 1,       reward: 1500 },
  { id: 'allmaps',   icon: '🗺️', name: 'Wereldreiziger',     desc: 'Win op alle 3 maps.',                      stat: 'mapsWon',     goal: 3,       reward: 1000 },
  { id: 'endless20', icon: '♾️', name: 'Uithoudingsvermogen', desc: 'Haal wave 20 in Endless.',                stat: 'bestEndless', goal: 20,      reward: 600 },
  { id: 'endless40', icon: '🔥', name: 'Onsterfelijk',       desc: 'Haal wave 40 in Endless.',                 stat: 'bestEndless', goal: 40,      reward: 2500 },
  { id: 'endless100', icon: '🌌', name: 'Endless Survivor',  desc: 'Haal wave 100 in Endless.',                stat: 'bestEndless', goal: 100,     reward: 10000 },
  { id: 'collect15', icon: '📦', name: 'Verzamelaar',        desc: 'Bezit 15 verschillende towers.',           stat: 'owned',       goal: 15,      reward: 500 },
  { id: 'collect25', icon: '🗃️', name: 'Tower Collector',    desc: 'Bezit 25 verschillende towers.',           stat: 'owned',       goal: 25,      reward: 1200 },
  { id: 'collect30', icon: '🏛️', name: 'Museumdirecteur',    desc: 'Bezit 30 verschillende towers.',           stat: 'owned',       goal: 30,      reward: 2000 },
  { id: 'secret',    icon: '❓', name: 'Secret Hunter',      desc: 'Summon een Secret tower.',                 stat: 'secrets',     goal: 1,       reward: 3000 },
  { id: 'rich',      icon: '💰', name: 'Millionaire',        desc: 'Verdien $1.000.000 in één potje.',         stat: 'bestMoney',   goal: 1000000, reward: 1000 },
  { id: 'door15',    icon: '🚪', name: 'Poortwachter',       desc: 'Upgrade je deur naar level 15.',           stat: 'bestDoor',    goal: 15,      reward: 700 },
  { id: 'build100',  icon: '🔨', name: 'Master Builder',     desc: 'Doe in totaal 100 tower-upgrades.',        stat: 'upgrades',    goal: 100,     reward: 800 },
  { id: 'evolve10',  icon: '🧬', name: 'Evolutionist',       desc: 'Evolueer in totaal 10 towers.',            stat: 'evolves',     goal: 10,      reward: 1500 },
  { id: 'master10',  icon: '🎖️', name: 'Tower Master',       desc: 'Breng één tower naar mastery level 10.',   stat: 'bestMastery', goal: 10,      reward: 2000 },
  { id: 'duo1',      icon: '🤝', name: 'Samen Sterk',        desc: 'Win een potje in een Duo-kamer.',          stat: 'duoWins',     goal: 1,       reward: 500 },
  { id: 'missions10', icon: '📅', name: 'Plichtsgetrouw',    desc: 'Voltooi 10 daily missions.',               stat: 'missions',    goal: 10,      reward: 1000 }
];

// ---------------------------------------------------------------------
//  TOWER MASTERY — cosmetic only (no stats)
// ---------------------------------------------------------------------
G.MASTERY_MAX = 20;
G.masteryXpFor = function (lvl) { return Math.round(80 * Math.pow(1.3, lvl - 1)); }; // xp needed to go from lvl-1 → lvl
G.MASTERY_REWARDS = [
  { lvl: 2,  type: 'badge', id: 'bronze', name: 'Bronzen badge', icon: '🥉' },
  { lvl: 4,  type: 'kill',  id: 'sparks', name: 'Kill-effect: Vonken', icon: '✨' },
  { lvl: 6,  type: 'skin',  id: 'camo',   name: 'Skin: Camo', icon: '🪖' },
  { lvl: 8,  type: 'anim',  id: 'float',  name: 'Animatie: Zweven', icon: '🎈' },
  { lvl: 10, type: 'skin',  id: 'neon',   name: 'Skin: Neon', icon: '💡' },
  { lvl: 10, type: 'badge', id: 'silver', name: 'Zilveren badge', icon: '🥈' },
  { lvl: 12, type: 'kill',  id: 'souls',  name: 'Kill-effect: Zielen', icon: '👻' },
  { lvl: 15, type: 'skin',  id: 'gold',   name: 'Skin: Goud', icon: '🥇' },
  { lvl: 20, type: 'skin',  id: 'prism',  name: 'Skin: Prisma', icon: '🌈' },
  { lvl: 20, type: 'kill',  id: 'prism',  name: 'Kill-effect: Prisma', icon: '🌈' },
  { lvl: 20, type: 'badge', id: 'gold',   name: 'Gouden badge', icon: '🏅' }
];

// ---------------------------------------------------------------------
//  DAILY MISSIONS — 4 per day, same for everyone on that date
// ---------------------------------------------------------------------
G.MISSIONS = [
  { id: 'kills',    stat: 'kills',    goals: [300, 600, 1200],   text: 'Versla {n} zombies' },
  { id: 'bosses',   stat: 'bosses',   goals: [2, 4, 8],          text: 'Versla {n} bosses' },
  { id: 'waves',    stat: 'waves',    goals: [25, 50, 90],       text: 'Overleef in totaal {n} waves' },
  { id: 'wins',     stat: 'wins',     goals: [1, 2, 3],          text: 'Win {n} potje(s)' },
  { id: 'money',    stat: 'money',    goals: [50000, 150000, 400000], text: 'Verdien ${n} in potjes' },
  { id: 'upgrades', stat: 'upgrades', goals: [40, 90, 160],      text: 'Upgrade {n} keer een tower' },
  { id: 'evolves',  stat: 'evolves',  goals: [1, 2, 4],          text: 'Evolueer {n} tower(s)' },
  { id: 'summons',  stat: 'summons',  goals: [5, 10, 20],        text: 'Doe {n} summons' },
  { id: 'games',    stat: 'games',    goals: [2, 3, 5],          text: 'Speel {n} potjes' },
  { id: 'killcash', stat: 'killMoney', goals: [5000, 12000, 30000], text: 'Verdien ${n} met kills' }
];
G.MISSION_REWARDS = [
  [{ type: 'coins', n: 250 }, { type: 'normal', n: 1 }],
  [{ type: 'coins', n: 500 }, { type: 'normal', n: 3 }, { type: 'hat', n: 1 }],
  [{ type: 'coins', n: 1000 }, { type: 'premium', n: 1 }, { type: 'normal', n: 5 }]
];
G.HATS = [
  { id: 'cap', name: 'Pet', icon: '🧢' }, { id: 'crown', name: 'Kroon', icon: '👑' }, { id: 'tophat', name: 'Hoge hoed', icon: '🎩' },
  { id: 'helmet', name: 'Helm', icon: '⛑️' }, { id: 'party', name: 'Feesthoed', icon: '🥳' }, { id: 'halo', name: 'Halo', icon: '😇' }
];

if (typeof module !== 'undefined') module.exports = G;
