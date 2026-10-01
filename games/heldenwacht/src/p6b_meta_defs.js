/* =====================================================================
   Definities van de metasystemen. Nieuwe content = een item toevoegen.
   ===================================================================== */

/* ---------- Traits ---------- */
const TRAIT_WEIGHTS = { common: 40, uncommon: 26, rare: 16, epic: 10, legendary: 5, mythic: 2.2, exotic: 0.65, ultra: 0.15 };
const TRAITS = [
  { id: 'sterk', name: 'Sterk', rarity: 'common', desc: '+5% schade', m: { dmgPct: 0.05 } },
  { id: 'snel', name: 'Snel', rarity: 'common', desc: '+5% aanvalssnelheid', m: { ratePct: 0.05 } },
  { id: 'scherp', name: 'Scherp', rarity: 'common', desc: '+5% bereik', m: { rangePct: 0.05 } },
  { id: 'geluk', name: 'Geluksvogel', rarity: 'common', desc: '+3% kans op kritieke treffers', m: { crit: 0.03 } },
  { id: 'krachtig', name: 'Krachtig', rarity: 'uncommon', desc: '+10% schade', m: { dmgPct: 0.1 } },
  { id: 'vlug', name: 'Vlug', rarity: 'uncommon', desc: '+10% aanvalssnelheid', m: { ratePct: 0.1 } },
  { id: 'verrekijker', name: 'Verrekijker', rarity: 'uncommon', desc: '+10% bereik', m: { rangePct: 0.1 } },
  { id: 'premie', name: 'Premiejager', rarity: 'uncommon', desc: 'Kills leveren 10% extra geld op', m: { bounty: 0.1 } },
  { id: 'veteraan', name: 'Veteraan', rarity: 'rare', desc: '+15% schade, +5% aanvalssnelheid', m: { dmgPct: 0.15, ratePct: 0.05 } },
  { id: 'schutter', name: 'Scherpschutter', rarity: 'rare', desc: '+12% bereik, +5% crit', m: { rangePct: 0.12, crit: 0.05 } },
  { id: 'brand', name: 'Brandstichter', rarity: 'rare', desc: 'Aanvallen laten branden (10% van de schade per seconde)', m: { burnPct: 0.1 } },
  { id: 'bazenjager', name: 'Bazenjager', rarity: 'rare', desc: '+30% schade tegen bazen', m: { bossPct: 0.3 } },
  { id: 'strijder', name: 'Strijder', rarity: 'epic', desc: '+25% schade', m: { dmgPct: 0.25 } },
  { id: 'wervel', name: 'Wervelwind', rarity: 'epic', desc: '+25% aanvalssnelheid', m: { ratePct: 0.25 } },
  { id: 'adelaar', name: 'Adelaarsoog', rarity: 'epic', desc: '+20% bereik', m: { rangePct: 0.2 } },
  { id: 'ijsvinger', name: 'IJsvinger', rarity: 'epic', desc: 'Aanvallen vertragen 20%', m: { slow: 0.2, slowDur: 1 } },
  { id: 'donder', name: 'Donderslag', rarity: 'epic', desc: '8% kans om te verdoven', m: { stunChance: 0.08, stun: 0.5 } },
  { id: 'berserker', name: 'Berserker', rarity: 'legendary', desc: '+50% schade', m: { dmgPct: 0.5 } },
  { id: 'swift', name: 'Swift', rarity: 'legendary', desc: '+50% aanvalssnelheid', m: { ratePct: 0.5 } },
  { id: 'longshot', name: 'Longshot', rarity: 'legendary', desc: '+25% bereik', m: { rangePct: 0.25 } },
  { id: 'destroyer', name: 'Destroyer', rarity: 'legendary', desc: '+75% schade tegen bazen', m: { bossPct: 0.75 } },
  { id: 'overlord', name: 'Overlord', rarity: 'mythic', desc: '+100% schade', m: { dmgPct: 1 } },
  { id: 'speeddemon', name: 'Speed Demon', rarity: 'mythic', desc: '+100% aanvalssnelheid', m: { ratePct: 1 } },
  { id: 'titan', name: 'Titan', rarity: 'mythic', desc: '+50% schade en +25% bereik', m: { dmgPct: 0.5, rangePct: 0.25 } },
  { id: 'executioner', name: 'Executioner', rarity: 'mythic', desc: '+100% schade tegen bazen', m: { bossPct: 1 } },
  { id: 'explosive', name: 'Explosive Projectiles', rarity: 'exotic', desc: 'Elke aanval veroorzaakt een explosie die vijanden in de buurt raakt', m: { proc: 'explode' } },
  { id: 'celestial', name: 'Celestial', rarity: 'exotic', desc: '+100% schade, +50% aanvalssnelheid en +25% bereik', m: { dmgPct: 1, ratePct: 0.5, rangePct: 0.25 } },
  { id: 'void', name: 'Void', rarity: 'exotic', desc: 'Aanvallen raken extra vijanden via leegte-ranken en breken 4 pantser', m: { proc: 'void', multiAdd: 1, shred: 4 } },
  { id: 'supernova', name: 'Supernova', rarity: 'ultra', mech: 'Exploderende projectielen', desc: 'Elke treffer ontploft in een felle nova die alles eromheen verbrandt', m: { proc: 'nova' } },
  { id: 'ketting', name: 'Kettingreactie', rarity: 'ultra', mech: 'Chain attacks', desc: 'Elke treffer springt door naar 3 andere vijanden', m: { proc: 'chain' } },
  { id: 'veelvoud', name: 'Veelvoud', rarity: 'ultra', mech: 'Extra projectielen', desc: '+2 extra doelen, stralen of slaggebied', m: { multiAdd: 2, proc: 'multi' } },
  { id: 'hellevuur', name: 'Hellevuur', rarity: 'ultra', mech: 'Burn', desc: 'Zware brandschade die overslaat op vijanden in de buurt als het doel sterft', m: { burnPct: 0.6, proc: 'hell' } },
  { id: 'nulpunt', name: 'Absolute Nul', rarity: 'ultra', mech: 'Freeze', desc: '22% kans om het doel in ijs te zetten, en vertraagt 40%', m: { proc: 'freeze', slow: 0.4, slowDur: 1.5 } },
  { id: 'donderkoning', name: 'Donderkoning', rarity: 'ultra', mech: 'Stun', desc: '20% kans op een bliksem die het doel en buren verdooft', m: { proc: 'stun' } },
  { id: 'meteoor', name: 'Meteoor', rarity: 'ultra', mech: 'Splash damage', desc: 'Groot explosiegebied bij elke aanval, met meteorietinslagen', m: { splashAdd: 1, proc: 'meteor' } },
  { id: 'fataal', name: 'Fatale Klap', rarity: 'ultra', mech: 'Critical hits', desc: '40% kans op een kritieke treffer met 3× schade', m: { crit: 0.4, critMult: 1, proc: 'fatal' } },
  { id: 'godendoder', name: 'Godendoder', rarity: 'ultra', mech: 'Boss damage', desc: '+200% schade tegen bazen, met een goddelijk teken bij elke treffer', m: { bossPct: 2, proc: 'god' } },
];
const TRAIT = Object.fromEntries(TRAITS.map(t => [t.id, t]));
const TRAIT_COST = { tokens: 1, coins: 2500 };
const TRAIT_PITY = 50; // gegarandeerd Legendary of beter na 50 rolls zonder
const TRAIT_FX_COLOR = { explode: '#fb923c', void: '#a855f7', nova: '#fde68a', chain: '#67e8f9', multi: '#f0abfc', hell: '#ef4444', freeze: '#bae6fd', stun: '#fde047', meteor: '#f97316', fatal: '#facc15', god: '#fef3c7' };

/* ---------- Skins (cosmetisch) ---------- */
const SKINS = [
  { id: 'neon', name: 'Neon', source: 'Uitdaging "Gewone Helden"', pal: { suit: '#0f172a', suit2: '#22d3ee', cape: '#ec4899', hairC: '#f0abfc', orb: '#22d3ee', mask: '#ec4899' }, fx: 'spark', overlay: 'neon', trail: '#22d3ee' },
  { id: 'veteraan', name: 'Veteraan', source: 'Mastery 5', mastery: true, pal: { suit: '#4d5b3a', suit2: '#c2b280', cape: '#3f4a2e', hairC: '#2f2a1f', mask: '#3f4a2e' }, fx: 'dust', overlay: 'dogtag', trail: '#c2b280' },
  { id: 'goud', name: 'Goud', source: 'Mastery 10', mastery: true, pal: { suit: '#b45309', suit2: '#fde047', cape: '#f59e0b', hairC: '#fef08a', orb: '#fde047', mask: '#92400e' }, fx: 'gold', overlay: 'shine', trail: '#fde047' },
  { id: 'legende', name: 'Legende', source: 'Mastery 15', mastery: true, pal: { suit: '#f8fafc', suit2: '#a78bfa', cape: '#fde68a', hairC: '#e9d5ff', orb: '#ffffff', mask: '#a78bfa' }, fx: 'star', overlay: 'legend', trail: '#e9d5ff' },
  { id: 'halloween', name: 'Griezel', source: 'Halloween-event', pal: { suit: '#1c1917', suit2: '#f97316', cape: '#581c87', hairC: '#f97316', orb: '#a3e635', mask: '#581c87' }, fx: 'bats', overlay: 'bats', trail: '#f97316' },
  { id: 'kerst', name: 'Kerstmuts', source: 'Kerst-event', pal: { suit: '#b91c1c', suit2: '#f8fafc', cape: '#166534', hairC: '#f8fafc', orb: '#bae6fd', mask: '#166534' }, fx: 'frost', overlay: 'santahat', trail: '#e0f2fe' },
  { id: 'zomer', name: 'Zomerzon', source: 'Zomer-event', pal: { suit: '#0ea5e9', suit2: '#fde047', cape: '#f472b6', hairC: '#fde68a', orb: '#fde047', mask: '#f472b6' }, fx: 'bubbles', overlay: 'shades', trail: '#67e8f9' },
  { id: 'jubileum', name: 'Feestpak', source: 'Jubileum-event', pal: { suit: '#6d28d9', suit2: '#fbbf24', cape: '#ec4899', hairC: '#fbbf24', orb: '#f472b6', mask: '#ec4899' }, fx: 'confetti', overlay: 'partyhat', trail: '#fbbf24' },
  { id: 'strip', name: 'Stripheld', source: 'Superheldenfestival', pal: { suit: '#facc15', suit2: '#dc2626', cape: '#1d4ed8', hairC: '#111827', orb: '#f8fafc', mask: '#111827' }, fx: 'star', overlay: 'comic', trail: '#f8fafc' },
  { id: 'titanium', name: 'Titanium', source: 'Raid-winkel', pal: { suit: '#475569', suit2: '#93c5fd', cape: '#1e293b', hairC: '#94a3b8', orb: '#bfdbfe', mask: '#1e293b' }, fx: 'steam', overlay: 'armor', trail: '#93c5fd' },
  { id: 'bloedmaan', name: 'Bloedmaan', source: 'Raid-winkel', pal: { suit: '#450a0a', suit2: '#ef4444', cape: '#7f1d1d', hairC: '#fca5a5', orb: '#ef4444', mask: '#7f1d1d' }, fx: 'ember', overlay: 'moon', trail: '#ef4444' },
  { id: 'diepzee', name: 'Diepzee', source: 'Raid-winkel', pal: { suit: '#134e4a', suit2: '#2dd4bf', cape: '#0f766e', hairC: '#5eead4', orb: '#99f6e4', mask: '#0f766e' }, fx: 'bubbles', overlay: 'bubblehelm', trail: '#2dd4bf' },
  { id: 'sterrenstof', name: 'Sterrenstof', source: 'Prestige 2', pal: { suit: '#1e1b4b', suit2: '#c4b5fd', cape: '#312e81', hairC: '#e0e7ff', orb: '#e0e7ff', mask: '#312e81' }, fx: 'star', overlay: 'galaxy', trail: '#c4b5fd' },
  { id: 'trouw', name: 'Trouwe Held', source: 'Login-kalender dag 28', pal: { suit: '#1e3a8a', suit2: '#cbd5e1', cape: '#94a3b8', hairC: '#e2e8f0', orb: '#e2e8f0', mask: '#1e3a8a' }, fx: 'gold', overlay: 'shine', trail: '#cbd5e1' },
  { id: 'kampioen', name: 'Kampioen', source: 'Uitdaging "Modifier-meester"', pal: { suit: '#7f1d1d', suit2: '#fbbf24', cape: '#fbbf24', hairC: '#fbbf24', orb: '#fbbf24', mask: '#7f1d1d' }, fx: 'gold', overlay: 'laurel', trail: '#fbbf24' },
];
const SKIN = Object.fromEntries(SKINS.map(s => [s.id, s]));
const LOOK_CACHE = {};
function resolveLook(H, skinId) {
  if (!skinId || !SKIN[skinId]) return H.look;
  const k = H.id + ':' + skinId; if (LOOK_CACHE[k]) return LOOK_CACHE[k];
  const S = SKIN[skinId], L = Object.assign({}, H.look);
  for (const key in S.pal) {
    if (key === 'mask' && !H.look.mask) continue;
    if (key === 'cape' && !H.look.cape && S.overlay !== 'legend' && S.overlay !== 'comic') continue;
    if (key === 'orb' && !H.look.orb) continue;
    L[key] = S.pal[key];
  }
  L.overlay = S.overlay; L.skinFx = S.fx; L.trail = S.trail;
  return (LOOK_CACHE[k] = L);
}

/* ---------- Mastery ---------- */
const MASTERY_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200];
const MASTERY_MAX = MASTERY_XP.length;
const MASTERY_REWARDS = {
  2: { badge: 'brons', text: 'Bronzen mastery-badge' },
  3: { coins: 150, text: '150 munten' },
  4: { tokens: 1, text: '1 Trait Reroll Token' },
  5: { heroSkin: 'veteraan', text: 'Skin "Veteraan"' },
  6: { tickets: { rare: 1 }, text: 'Rare Ticket' },
  7: { heroTitle: 'kenner', text: 'Titel "<held>-kenner"' },
  8: { badge: 'zilver', text: 'Zilveren mastery-badge' },
  9: { tokens: 2, text: '2 Trait Reroll Tokens' },
  10: { heroSkin: 'goud', text: 'Skin "Goud"' },
  11: { tickets: { legendary: 1 }, text: 'Legendary Ticket' },
  12: { effect: 'aura', text: 'Effect: Meester-aura in potjes' },
  13: { badge: 'goud', text: 'Gouden mastery-badge' },
  14: { tokens: 3, text: '3 Trait Reroll Tokens' },
  15: { heroSkin: 'legende', heroTitle: 'legende', badge: 'diamant', effect: 'entree', text: 'Skin "Legende", titel, diamanten badge en een speciale entree-animatie' },
};
const MASTERY_BADGE = { brons: '#cd7f32', zilver: '#cbd5e1', goud: '#fbbf24', diamant: '#67e8f9' };

/* ---------- Spelerslevel & prestige ---------- */
const xpForLevel = l => 150 + 60 * l;
const PLAYER_MAX_LEVEL = 99;
function levelReward(l) {
  const r = { coins: Math.min(1200, 60 * l) };
  if (l % 3 === 0) r.tokens = 1;
  if (l % 5 === 0) r.tickets = l % 10 === 0 ? { legendary: 1 } : { rare: 1 };
  return r;
}
const PRESTIGE = [
  { n: 1, text: '+10% munten en XP uit potjes, 5 Trait Reroll Tokens', reward: { tokens: 5 } },
  { n: 2, text: 'Exclusieve skin "Sterrenstof" (voor alle helden)', reward: { skin: 'sterrenstof', tokens: 5 } },
  { n: 3, text: 'Titel "Herboren"', reward: { title: 'herboren', tickets: { legendary: 2 } } },
  { n: 4, text: 'Badge "Feniks" en 2 Kosmische Tickets', reward: { badge: 'feniks', tickets: { cosmic: 2 } } },
  { n: 5, text: 'Titel "Onsterfelijk" en 5 Kosmische Tickets', reward: { title: 'onsterfelijk', tickets: { cosmic: 5 } } },
];
const PRESTIGE_BONUS = 0.1;
const prestigeReqLevel = p => 20 + 10 * p;

/* ---------- Titels ---------- */
const TITLES = {
  nieuweling: 'Nieuweling', minimalist: 'Minimalist', luchtmeester: 'Luchtmeester', nachtmerrie: 'Nachtmerrie-overlever', bazenbreker: 'Bazenbreker',
  raider: 'Raider', heroisch: 'Heroïsche Raider', mythisch: 'Mythische Raider', verzamelaar: 'Verzamelaar', legendarisch: 'Legendarisch Verzamelaar',
  eindeloos: 'Eindeloos', bossrush: 'Bazenjager', herboren: 'Herboren', onsterfelijk: 'Onsterfelijk', trouw: 'Trouwe Held', feestbeest: 'Feestbeest',
  griezel: 'Griezelmeester', ijskoning: 'IJskoning', strandheld: 'Strandheld', stripheld: 'Stripheld', teamspeler: 'Teamspeler', traitmeester: 'Traitmeester',
};
function titleName(id) {
  if (!id) return '';
  if (id.startsWith('mk:')) { const H = HERO[id.slice(3)]; return H ? `${H.name}-kenner` : ''; }
  if (id.startsWith('ml:')) { const H = HERO[id.slice(3)]; return H ? `Legende: ${H.name}` : ''; }
  return TITLES[id] || id;
}

/* ---------- Modifiers ---------- */
const MODIFIERS = [
  { id: 'hp50', name: 'Taaie vijanden', desc: 'Vijanden +50% HP', bonus: 0.3, fx: { hp: 1.5 } },
  { id: 'fast', name: 'Haast', desc: 'Vijanden 25% sneller', bonus: 0.25, fx: { speed: 1.25 } },
  { id: 'costly', name: 'Inflatie', desc: 'Helden kosten 30% meer', bonus: 0.2, fx: { cost: 1.3 } },
  { id: 'slowatk', name: 'Loom', desc: 'Helden vallen 20% langzamer aan', bonus: 0.25, fx: { rate: 0.8 } },
  { id: 'earlyboss', name: 'Bazenparade', desc: 'Elke 3 golven een baas', bonus: 0.3, fx: { bossEvery: 3 } },
  { id: 'horde', name: 'Horde', desc: '40% meer vijanden per golf', bonus: 0.3, fx: { extra: 1.4 } },
  { id: 'flyers', name: 'Luchtaanval', desc: 'Veel meer vliegende vijanden', bonus: 0.15, fx: { flyer: true } },
  { id: 'poor', name: 'Krappe kas', desc: '30% minder geld', bonus: 0.25, fx: { cash: 0.7 } },
  { id: 'armored', name: 'Pantser', desc: 'Vijanden +3 pantser', bonus: 0.2, fx: { armor: 3 } },
  { id: 'glass', name: 'Glazen basis', desc: 'Je basis heeft maar 25 HP', bonus: 0.35, fx: { baseHp: 25 } },
  { id: 'lowrar', name: 'Terug naar de basis', desc: 'Alleen Common t/m Rare helden', bonus: 0.3, fx: { maxRarity: 'rare' } },
  { id: 'power', name: 'Superkracht', desc: 'Helden +25% schade (makkelijker)', bonus: -0.2, fx: { dmg: 1.25 } },
];
const MOD = Object.fromEntries(MODIFIERS.map(m => [m.id, m]));
function modBonus(ids) { return Math.max(0.5, 1 + (ids || []).reduce((s, id) => s + (MOD[id] ? MOD[id].bonus : 0), 0)); }

/* ---------- Uitdagingen (dagelijks / wekelijks / permanent) ---------- */
// types: kills, waves, bosses, upgrades, abilities, winAny, winDiff(minDiff), fastboss(sec), rule-wins, endless(n), raid, bossrush(n), modWin(n), winMap(map,minDiff)
const RULE_TEXT = { max3: 'max. 3 helden tegelijk', noLegend: 'geen Legendary of zeldzamere helden', lowOnly: 'alleen Common en Uncommon helden', noUpg: 'geen upgrades hoger dan niveau 2' };
const RULES = { max3: { maxHeroes: 3 }, noLegend: { maxRarity: 'epic' }, lowOnly: { maxRarity: 'uncommon' }, noUpg: { maxTier: 2 } };
const DAILY_POOL = [
  { type: 'kills', n: 300, text: 'Versla 300 vijanden', reward: { coins: 250, xp: 120 } },
  { type: 'waves', n: 25, text: 'Haal 25 golven', reward: { coins: 250, xp: 120 } },
  { type: 'bosses', n: 3, text: 'Versla 3 bazen', reward: { coins: 300, xp: 150, tokens: 1 } },
  { type: 'winAny', n: 1, text: 'Win een potje', reward: { coins: 300, xp: 150 } },
  { type: 'winDiff', n: 1, minDiff: 2, text: 'Win een potje op Moeilijk of hoger', reward: { coins: 450, xp: 200, tokens: 1 } },
  { type: 'upgrades', n: 15, text: 'Koop 15 upgrades', reward: { coins: 200, xp: 100 } },
  { type: 'abilities', n: 10, text: 'Gebruik 10 keer een ability', reward: { coins: 200, xp: 100 } },
  { type: 'fastboss', n: 1, sec: 30, text: 'Versla een baas binnen 30 seconden nadat hij verschijnt', reward: { coins: 350, xp: 150, tokens: 1 } },
  { type: 'rule', rule: 'max3', n: 1, text: 'Win een potje met maximaal 3 helden tegelijk', reward: { coins: 400, xp: 200, tickets: { basic: 2 } } },
  { type: 'rule', rule: 'noLegend', n: 1, text: 'Win zonder Legendary of zeldzamere helden', reward: { coins: 350, xp: 180, tokens: 1 } },
  { type: 'rule', rule: 'lowOnly', n: 1, text: 'Win met alleen Common en Uncommon helden', reward: { coins: 450, xp: 220, tickets: { rare: 1 } } },
  { type: 'rule', rule: 'noUpg', n: 1, text: 'Win zonder upgrades hoger dan niveau 2', reward: { coins: 400, xp: 200, tokens: 1 } },
  { type: 'modWin', n: 2, text: 'Win een potje met minstens 2 modifiers', reward: { coins: 450, xp: 220, tokens: 1 } },
  { type: 'endless', n: 20, text: 'Haal golf 20 in Endless Mode', reward: { coins: 400, xp: 200 } },
];
const WEEKLY_POOL = [
  { type: 'kills', n: 3000, text: 'Versla 3.000 vijanden', reward: { coins: 1500, xp: 600, tickets: { legendary: 1 } } },
  { type: 'waves', n: 150, text: 'Haal 150 golven', reward: { coins: 1500, xp: 600, tokens: 3 } },
  { type: 'bosses', n: 20, text: 'Versla 20 bazen', reward: { coins: 1600, xp: 650, tokens: 3 } },
  { type: 'raid', n: 1, text: 'Voltooi een raid', reward: { coins: 1800, xp: 700, raidTokens: 30 } },
  { type: 'bossrush', n: 5, text: 'Haal fase 5 in de Boss Rush', reward: { coins: 1800, xp: 700, tickets: { legendary: 1 } } },
  { type: 'endless', n: 30, text: 'Haal golf 30 in Endless Mode', reward: { coins: 1600, xp: 650, tokens: 3 } },
  { type: 'modWin', n: 3, text: 'Win een potje met minstens 3 modifiers', reward: { coins: 2000, xp: 800, tickets: { legendary: 1 } } },
  { type: 'rule', rule: 'max3', n: 1, minDiff: 2, text: 'Win op Moeilijk met maximaal 3 helden', reward: { coins: 2200, xp: 800, tickets: { cosmic: 1 } } },
  { type: 'rule', rule: 'noLegend', n: 1, minDiff: 2, text: 'Win op Moeilijk zonder Legendary of zeldzamer', reward: { coins: 2000, xp: 800, tokens: 4 } },
  { type: 'winDiff', n: 3, minDiff: 2, text: 'Win 3 potjes op Moeilijk of hoger', reward: { coins: 1800, xp: 700, tokens: 3 } },
];
const PERM_CHALLENGES = [
  { id: 'minimalist', type: 'rule', rule: 'max3', map: 'stad', minDiff: 1, n: 1, name: 'Minimalist', text: 'Win Havenstad op Normaal met maximaal 3 helden tegelijk', reward: { title: 'minimalist', tokens: 3 } },
  { id: 'gewoon', type: 'rule', rule: 'lowOnly', map: 'bos', minDiff: 1, n: 1, name: 'Gewone Helden', text: 'Win Fluisterbos op Normaal met alleen Common en Uncommon helden', reward: { skin: 'neon', coins: 1000 } },
  { id: 'poespas', type: 'rule', rule: 'noUpg', map: 'woestijn', minDiff: 1, n: 1, name: 'Zonder Poespas', text: 'Win Zonnevlakte op Normaal zonder upgrades hoger dan niveau 2', reward: { tickets: { legendary: 2 }, coins: 1200 } },
  { id: 'luchtmeester', type: 'winMap', map: 'bergen', minDiff: 2, n: 1, name: 'Luchtmeester', text: 'Win IJspiek op Moeilijk', reward: { title: 'luchtmeester', unlockMap: 'wolken', tokens: 3 } },
  { id: 'bazenbreker', type: 'fastboss', sec: 20, n: 1, name: 'Bazenbreker', text: 'Versla een baas binnen 20 seconden nadat hij verschijnt', reward: { title: 'bazenbreker', tokens: 5 } },
  { id: 'duizend', type: 'totalKills', n: 1000, name: 'Duizendklapper', text: 'Versla in totaal 1.000 vijanden', reward: { coins: 1500, tickets: { rare: 2 } } },
  { id: 'kampioenschap', type: 'rule', rule: 'noLegend', map: 'neo', minDiff: 2, n: 1, name: 'Kampioenschap', text: 'Win Neo-Stad 2099 op Moeilijk zonder Legendary of zeldzamere helden', reward: { hero: 'kampioen', coins: 2000 } },
  { id: 'modmeester', type: 'modWin', n: 4, name: 'Modifier-meester', text: 'Win een potje met minstens 4 modifiers tegelijk', reward: { skin: 'kampioen', tokens: 5 } },
  { id: 'nachtmerrie', type: 'winDiff', minDiff: 3, n: 1, name: 'Nachtmerrie', text: 'Win een map op Nachtmerrie', reward: { title: 'nachtmerrie', tickets: { cosmic: 1 } } },
  { id: 'golven500', type: 'totalWaves', n: 500, name: 'Golvenvreter', text: 'Voltooi in totaal 500 golven', reward: { coins: 3000, tokens: 5 } },
];

/* ---------- Quests (permanent, met niveaus) ---------- */
const QUESTS = [
  { id: 'wins', text: n => `Win ${fmt(n)} potjes`, stat: 'wins', tiers: [5, 25, 100, 250], reward: i => ({ coins: 400 * (i + 1), xp: 200 * (i + 1), tokens: i + 1 }) },
  { id: 'kills', text: n => `Versla ${fmt(n)} vijanden`, stat: 'kills', tiers: [5000, 25000, 100000, 300000], reward: i => ({ coins: 500 * (i + 1), xp: 250 * (i + 1), tickets: { rare: i + 1 } }) },
  { id: 'upgrades', text: n => `Upgrade helden ${fmt(n)} keer`, stat: 'upgrades', tiers: [20, 100, 500, 1500], reward: i => ({ coins: 300 * (i + 1), tokens: i + 1 }) },
  { id: 'pulls', text: n => `Open ${fmt(n)} gacha's`, stat: 'pulls', tiers: [10, 50, 200, 500], reward: i => ({ tickets: { basic: 3 * (i + 1) }, xp: 200 * (i + 1) }) },
  { id: 'bosses', text: n => `Versla ${fmt(n)} bazen`, stat: 'bossKills', tiers: [3, 25, 100, 300], reward: i => ({ coins: 500 * (i + 1), tokens: i + 1 }) },
  { id: 'raids', text: n => `Voltooi ${fmt(n)} raid${n > 1 ? 's' : ''}`, stat: 'raidsDone', tiers: [1, 5, 20, 50], reward: i => ({ raidTokens: 25 * (i + 1), tickets: { legendary: 1 } }) },
  { id: 'wave', text: n => `Bereik golf ${n} (in welke modus dan ook)`, stat: 'highestWave', tiers: [20, 30, 50, 75], reward: i => ({ coins: 700 * (i + 1), tickets: { legendary: i > 1 ? 2 : 1 } }) },
  { id: 'mastery', text: n => `Verdien ${fmt(n)} mastery-XP in totaal`, stat: 'masteryXp', tiers: [2000, 10000, 40000, 100000], reward: i => ({ coins: 600 * (i + 1), tokens: 2 * (i + 1) }) },
];

/* ---------- Achievements ---------- */
const ACHIEVEMENTS = [
  { id: 'eerstewinst', name: 'Eerste Overwinning', text: 'Win je eerste potje', check: s => s.wins >= 1, reward: { coins: 200, title: 'nieuweling' }, color: '#3ddc97' },
  { id: 'golven100', name: '100 Golven', text: 'Voltooi 100 golven', check: s => s.waves >= 100, reward: { coins: 500 }, color: '#60a5fa' },
  { id: 'golven1000', name: '1.000 Golven', text: 'Voltooi 1.000 golven', check: s => s.waves >= 1000, reward: { coins: 2500, tokens: 3 }, color: '#2563eb' },
  { id: 'bazen10', name: '10 Bazen', text: 'Versla 10 bazen', check: s => s.bossKills >= 10, reward: { coins: 400, tokens: 1 }, color: '#ff4d5e' },
  { id: 'bazen100', name: '100 Bazen', text: 'Versla 100 bazen', check: s => s.bossKills >= 100, reward: { coins: 2000, tickets: { legendary: 1 } }, color: '#be123c' },
  { id: 'kills10k', name: '10.000 Vijanden', text: 'Versla 10.000 vijanden', check: s => s.kills >= 10000, reward: { coins: 1500, tokens: 2 }, color: '#f97316' },
  { id: 'kills100k', name: '100.000 Vijanden', text: 'Versla 100.000 vijanden', check: s => s.kills >= 100000, reward: { coins: 5000, tickets: { cosmic: 1 } }, color: '#c2410c' },
  { id: 'eersteleg', name: 'Eerste Legendary', text: 'Verzamel een Legendary held', check: (s, D) => ownsRarity(D, 'legendary'), reward: { coins: 300 }, color: '#fbbf24' },
  { id: 'eerstemyth', name: 'Eerste Mythic', text: 'Verzamel een Mythic held', check: (s, D) => ownsRarity(D, 'mythic'), reward: { coins: 600, tokens: 1 }, color: '#ff4f8b' },
  { id: 'eersteexo', name: 'Eerste Exotic', text: 'Verzamel een Exotic held', check: (s, D) => ownsRarity(D, 'exotic'), reward: { coins: 1200, tokens: 2 }, color: '#2dd4bf' },
  { id: 'eersteultra', name: 'Eerste Ultra', text: 'Verzamel een Ultra held', check: (s, D) => ownsRarity(D, 'ultra'), reward: { coins: 2500, tokens: 3 }, color: '#fde68a' },
  { id: 'verzamelaar', name: 'Verzamelaar', text: 'Verzamel 25 verschillende helden', check: (s, D) => Object.keys(D.heroes).length >= 25, reward: { title: 'verzamelaar', tickets: { legendary: 1 } }, color: '#a78bfa' },
  { id: 'allemaal', name: 'Ze Allemaal', text: 'Verzamel elke held in het spel', check: (s, D) => HEROES.every(h => D.heroes[h.id]), reward: { title: 'legendarisch', tickets: { cosmic: 2 } }, color: '#f0abfc' },
  { id: 'eerstraid', name: 'Eerste Raid', text: 'Voltooi je eerste raid', check: s => s.raidsDone >= 1, reward: { raidTokens: 20, title: 'raider' }, color: '#f59e0b' },
  { id: 'mythraid', name: 'Mythische Raid', text: 'Voltooi een raid op Mythisch', check: s => !!s.mythicRaid, reward: { raidTokens: 60, title: 'mythisch' }, color: '#e11d48' },
  { id: 'maxheld', name: 'Volledig Uitgemaxt', text: 'Breng een held naar level 10', check: (s, D) => Object.values(D.heroes).some(h => h.level >= MAX_LEVEL), reward: { coins: 1000, tokens: 2 }, color: '#facc15' },
  { id: 'mastery15', name: 'Grootmeester', text: 'Bereik Mastery 15 met een held', check: (s, D) => Object.values(D.heroes).some(h => masteryLevel(h.mxp || 0) >= MASTERY_MAX), reward: { tickets: { cosmic: 1 } }, color: '#67e8f9' },
  { id: 'allenormaal', name: 'Wereldredder', text: 'Haal alle 6 maps van wereld 1 op Normaal', check: () => MAPS.slice(0, WORLD1_COUNT).every(m => Progress.clearedAtLeast(m.id, 1)), reward: { coins: 2000, tokens: 3 }, color: '#22c55e' },
  { id: 'allenacht', name: 'Nachtwaker', text: 'Haal alle 6 maps van wereld 1 op Nachtmerrie', check: () => MAPS.slice(0, WORLD1_COUNT).every(m => Progress.cleared(m.id, 3)), reward: { tickets: { cosmic: 3 } }, color: '#1e1b4b' },
  { id: 'endless30', name: 'Eindeloos', text: 'Haal golf 30 in Endless Mode', check: s => s.endlessBest >= 30, reward: { coins: 1500, title: 'eindeloos' }, color: '#0ea5e9' },
  { id: 'endless50', name: 'Onvermoeibaar', text: 'Haal golf 50 in Endless Mode', check: s => s.endlessBest >= 50, reward: { tickets: { cosmic: 1 }, tokens: 3 }, color: '#0369a1' },
  { id: 'bossrush', name: 'Boss Rush-kampioen', text: 'Versla alle bazen in de Boss Rush', check: s => s.bossrushBest >= BOSSRUSH.length, reward: { title: 'bossrush', tickets: { cosmic: 1 } }, color: '#dc2626' },
  { id: 'prestige1', name: 'Herboren', text: 'Doe je eerste prestige', check: (s, D) => D.prestige >= 1, reward: { tokens: 3 }, color: '#f472b6' },
  { id: 'legtrait', name: 'Legendarische Trait', text: 'Krijg een Legendary of zeldzamere trait', check: (s, D) => D.traitsSeen.some(t => TRAIT[t] && RARITY_ORDER.indexOf(TRAIT[t].rarity) >= 4), reward: { tokens: 2 }, color: '#fbbf24' },
  { id: 'ultratrait', name: 'Ultra Trait', text: 'Krijg een Ultra trait', check: (s, D) => D.traitsSeen.some(t => TRAIT[t] && TRAIT[t].rarity === 'ultra'), reward: { title: 'traitmeester', tokens: 5 }, color: '#fde68a' },
  { id: 'login7', name: 'Trouwe Bezoeker', text: 'Claim 7 dagelijkse beloningen', check: s => s.loginDays >= 7, reward: { title: 'trouw', tokens: 2 }, color: '#60a5fa' },
  { id: 'eventkoop', name: 'Feestganger', text: 'Koop iets in een eventwinkel', check: s => s.eventPurchases >= 1, reward: { title: 'feestbeest', coins: 500 }, color: '#ec4899' },
  { id: 'geheim', name: 'Geheime Gang', text: 'Speel een geheime map vrij', check: (s, D) => Object.keys(D.secret || {}).length >= 1, reward: { tokens: 3, coins: 1000 }, color: '#7c3aed' },
  { id: 'custom5', name: 'Masochist', text: 'Win met 5 of meer modifiers', check: s => s.maxModWin >= 5, reward: { tickets: { legendary: 2 } }, color: '#71717a' },
  { id: 'onverwoestbaar', name: 'Onverwoestbaar', text: 'Win een potje op Moeilijk of hoger zonder HP te verliezen', check: s => !!s.flawlessHard, reward: { coins: 1500, tokens: 3 }, color: '#10b981', unlockMap: 'lab' },
  { id: 'coop', name: 'Teamspeler', text: 'Doe mee aan een co-op wereldbaas', check: s => s.coopRuns >= 1, reward: { title: 'teamspeler', raidTokens: 15 }, color: '#14b8a6' },
];
function ownsRarity(D, r) { return Object.keys(D.heroes).some(id => HERO[id] && HERO[id].rarity === r); }

/* ---------- Login-kalender (28 dagen) ---------- */
const LOGIN_CAL = Array.from({ length: 28 }, (_, i) => {
  const d = i + 1, w = Math.floor(i / 7);
  switch (d % 7) {
    case 1: return { coins: 200 + w * 100 };
    case 2: return { tickets: { basic: 2 + w } };
    case 3: return { xp: 250 + w * 100 };
    case 4: return { coins: 300 + w * 150 };
    case 5: return { tickets: { rare: 1 + (w >= 2 ? 1 : 0) } };
    case 6: return { coins: 600 + w * 250 };
    default: return d === 28 ? { skin: 'trouw', tickets: { cosmic: 1 }, tokens: 5 } : { tickets: { legendary: 1 }, tokens: 2 + w };
  }
});

/* ---------- Events (seizoensgebonden, tijdelijk) ---------- */
const SEASON_EVENTS = [
  { id: 'zomer', name: 'Zomerfestival', from: [6, 21], to: [8, 31], color: '#0ea5e9', currency: 'Schelpen', map: 'strand', hero: 'surfer', skin: 'zomer', boss: 'haai', enemy: 'krab', title: 'strandheld',
    intro: 'Het strand is overgenomen door pantserkrabben en de Haaienkoning. Verdien schelpen en koop de Golfrijder.' },
  { id: 'jubileum', name: 'Jubileumfeest', from: [9, 22], to: [10, 12], color: '#fbbf24', currency: 'Feesttokens', map: 'feestplein', hero: 'feestkoning', skin: 'jubileum', boss: 'taart', enemy: 'feestbot', title: 'feestbeest',
    intro: 'Heldenwacht bestaat een jaar! Maar de Taart-titan is ontsnapt. Verdien feesttokens en koop de Confettikoning.' },
  { id: 'halloween', name: 'Halloween', from: [10, 13], to: [11, 9], color: '#f97316', currency: 'Snoepjes', map: 'spookstad', hero: 'heks', skin: 'halloween', boss: 'pompoenkoning', enemy: 'spook', title: 'griezel',
    intro: 'Spookjes waren door Havenstad en de Pompoenkoning eist de stad op. Verdien snoepjes en koop de Pompoenheks.' },
  { id: 'kerst', name: 'Kerstspektakel', from: [12, 8], to: [1, 7], color: '#dc2626', currency: 'Cadeautjes', map: 'kerstdorp', hero: 'kerstagent', skin: 'kerst', boss: 'krampus', enemy: 'sneeuwman', title: 'ijskoning',
    intro: 'IJsreus Krampus bevriest het kerstdorp. Verdien cadeautjes en koop Agent Sneeuwvlok.' },
  { id: 'held', name: 'Superheldenfestival', fallback: true, color: '#1d4ed8', currency: 'Heldenmedailles', map: 'stripstad', hero: 'komeet', skin: 'strip', boss: 'antiheld', enemy: 'kloon', title: 'stripheld',
    intro: 'De Anti-Held en zijn klonen vallen Stripstad aan. Verdien heldenmedailles en koop Kapitein Komeet.' },
];
const EVENT_QUESTS = [
  { id: 'play', text: 'Speel de eventmap 3 keer', stat: 'plays', n: 3, reward: 60 },
  { id: 'win', text: 'Win de eventmap', stat: 'wins', n: 1, reward: 100 },
  { id: 'boss', text: 'Versla de eventbaas 3 keer', stat: 'bossKills', n: 3, reward: 90 },
  { id: 'kills', text: 'Versla 200 eventvijanden', stat: 'evKills', n: 200, reward: 80 },
  { id: 'hard', text: 'Win de eventmap op Moeilijk', stat: 'hardWins', n: 1, reward: 150, tokens: 2 },
];
const EVENT_SHOP = ev => [
  { id: 'hero', text: HERO[ev.hero].name, sub: `${RARITIES[HERO[ev.hero].rarity].label} eventheld`, cost: 500, reward: { hero: ev.hero }, once: true },
  { id: 'skin', text: `Skin "${SKIN[ev.skin].name}"`, sub: 'Voor al je helden', cost: 300, reward: { skin: ev.skin }, once: true },
  { id: 'title', text: `Titel "${TITLES[ev.title]}"`, sub: 'Toon hem op je profiel', cost: 150, reward: { title: ev.title }, once: true },
  { id: 'tokens', text: '3 Trait Reroll Tokens', sub: 'Onbeperkt', cost: 80, reward: { tokens: 3 } },
  { id: 'rare', text: 'Rare Ticket', sub: 'Onbeperkt', cost: 60, reward: { tickets: { rare: 1 } } },
  { id: 'leg', text: 'Legendary Ticket', sub: 'Onbeperkt', cost: 150, reward: { tickets: { legendary: 1 } } },
];

/* ---------- Raids ---------- */
const RAID_DIFFS = [
  { id: 'normal', name: 'Normaal', hp: 1, reward: 1 },
  { id: 'heroic', name: 'Heroïsch', hp: 1.7, reward: 1.8 },
  { id: 'mythic', name: 'Mythisch', hp: 2.8, reward: 3 },
];
const RAIDS = [
  { id: 'titanen', name: 'Titanenval', map: 'ruines', boss: 'rex', color: '#f59e0b', unlock: { map: 'bos', diff: 1 },
    intro: 'Kolossus Rex ontwaakt in de oude ruïnes, beschermd door rotsschilden.',
    phases: [{ name: 'Fase 1: De voorhoede', waves: 3, pool: ['grunt', 'runner', 'tank'] }, { name: 'Fase 2: Stenen wachters', waves: 3, pool: ['tank', 'shield', 'splitter'], elite: 1.3 }, { name: 'Fase 3: Kolossus Rex', boss: true }],
    firstClear: { normal: { title: 'raider' }, heroic: { title: 'heroisch', raidTokens: 40 }, mythic: { badge: 'rex', tickets: { cosmic: 1 } } } },
  { id: 'kraken', name: 'Diepzee-dreiging', map: 'diepzee', boss: 'kraken', color: '#7c3aed', unlock: { map: 'bergen', diff: 1 },
    intro: 'Uit de diepste trog grijpt de Kraken met zijn tentakels naar je helden.',
    phases: [{ name: 'Fase 1: De vloed', waves: 3, pool: ['grunt', 'krab', 'flyer'] }, { name: 'Fase 2: Haaienrif', waves: 3, pool: ['krab', 'healer', 'flyer', 'shield'], elite: 1.3, miniboss: 'haai' }, { name: 'Fase 3: De Kraken', boss: true }],
    firstClear: { normal: { raidTokens: 20 }, heroic: { raidTokens: 50 }, mythic: { badge: 'kraken', tickets: { cosmic: 1 } } } },
  { id: 'tiran', name: 'Mechanische Tiran', map: 'fabriek', boss: 'tiran', color: '#dc2626', unlock: { map: 'neo', diff: 1 },
    intro: 'De Mega-Tiran beschermt zich met een energieschild. Alleen veel snelle treffers breken het.',
    phases: [{ name: 'Fase 1: Lopende band', waves: 3, pool: ['grunt', 'tank', 'kloon'] }, { name: 'Fase 2: Beveiliging', waves: 3, pool: ['shield', 'kloon', 'healer', 'tank'], elite: 1.35, miniboss: 'antiheld' }, { name: 'Fase 3: Mega-Tiran', boss: true }],
    firstClear: { normal: { raidTokens: 25 }, heroic: { raidTokens: 60 }, mythic: { badge: 'tiran', tickets: { cosmic: 2 } } } },
];
const RAID_SHOP = [
  { id: 'titanenbreker', text: 'Titanenbreker', sub: 'Mythic raidheld, dubbele baasschade', cost: 120, reward: { hero: 'titanenbreker' }, once: true },
  { id: 'valkyrie', text: 'Stormvalkyrie', sub: 'Exotic raidheld', cost: 300, reward: { hero: 'valkyrie' }, once: true },
  { id: 'titanium', text: 'Skin "Titanium"', sub: 'Raid-skin voor al je helden', cost: 60, reward: { skin: 'titanium' }, once: true },
  { id: 'bloedmaan', text: 'Skin "Bloedmaan"', sub: 'Raid-skin voor al je helden', cost: 90, reward: { skin: 'bloedmaan' }, once: true },
  { id: 'diepzee', text: 'Skin "Diepzee"', sub: 'Raid-skin voor al je helden', cost: 90, reward: { skin: 'diepzee' }, once: true },
  { id: 'tokens', text: '3 Trait Reroll Tokens', sub: 'Onbeperkt', cost: 25, reward: { tokens: 3 } },
  { id: 'leg', text: 'Legendary Ticket', sub: 'Onbeperkt', cost: 40, reward: { tickets: { legendary: 1 } } },
  { id: 'cosmic', text: 'Kosmisch Ticket', sub: 'Onbeperkt', cost: 100, reward: { tickets: { cosmic: 1 } } },
];

/* ---------- Boss Rush ---------- */
const BOSSRUSH = ['chaos', 'wyrm', 'spiegelkoning', 'kolos', 'hydra', 'overlord', 'tijdvreter', 'chaoskoning'];
const BOSSRUSH_UNLOCK = { map: 'woestijn', diff: 1 };

/* ---------- Co-op wereldbaas ---------- */
const COOP = { hp: 500000, runTime: 150, unlock: { map: 'bos', diff: 1 } };

/* ---------- Tickets ---------- */
const TICKETS = { basic: { name: 'Basic Ticket', gacha: 'basic', color: '#a3acb9' }, rare: { name: 'Rare Ticket', gacha: 'rare', color: '#38bdf8' }, legendary: { name: 'Legendary Ticket', gacha: 'legendary', color: '#fbbf24' }, cosmic: { name: 'Kosmisch Ticket', gacha: 'cosmic', color: '#a78bfa' } };

/* ---------- Leaderboards ---------- */
const LB_CATS = [
  { id: 'wave', name: 'Hoogste golf', unit: 'golf' },
  { id: 'endless', name: 'Endless-golf', unit: 'golf' },
  { id: 'bossrush', name: 'Boss Rush', unit: 'fase' },
  { id: 'bosses', name: 'Bazen verslagen', unit: 'bazen' },
  { id: 'damage', name: 'Meeste schade (1 potje)', unit: 'schade' },
  { id: 'fastest', name: 'Snelste overwinning', unit: 'sec', asc: true },
  { id: 'raids', name: 'Raids voltooid', unit: 'raids' },
  { id: 'kills', name: 'Vijanden verslagen', unit: 'kills' },
  { id: 'mastery', name: 'Mastery-XP', unit: 'XP' },
];
