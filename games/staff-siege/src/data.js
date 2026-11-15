/* ======================================================================
   DATA — alles hieronder is uitbreidbaar: voeg een object toe en het
   verschijnt automatisch in gacha, collectie, synergieën en index.
   ====================================================================== */
const RAR=[
 {n:'Common',c:'#b8c2cc',w:45},
 {n:'Uncommon',c:'#4ade80',w:25},
 {n:'Rare',c:'#38bdf8',w:16},
 {n:'Epic',c:'#c084fc',w:9},
 {n:'Legendary',c:'#fbbf24',w:4},
 {n:'Mythic',c:'#ff3b5c',w:0.9},
 {n:'Secret',c:'#ffffff',w:0.1}];
const DMG_K=1.35;

/* Aanvalstypes: iedere type heeft een eigen engine (fire) en special */
const TYPES={
 bolt:{nl:'Bolt',sp:{n:'Bolt Burst',cd:8,d:'16 doorborende bolts in alle richtingen'}},
 spam:{nl:'Spam',sp:{n:'Kogelregen',cd:10,d:'Spiraal van 60 projectielen'}},
 laser:{nl:'Laser',sp:{n:'Mega Beam',cd:12,d:'Draaiende reuzenlaser (2s)'}},
 ice:{nl:'IJs',sp:{n:'Frost Nova',cd:12,d:'Bevriest en raakt alles in de buurt'}},
 sniper:{nl:'Sniper',sp:{n:'Deadeye',cd:10,d:'5 gegarandeerde crits op de sterkste vijanden'}},
 explosion:{nl:'Explosie',sp:{n:'Bombardement',cd:11,d:'8 zware explosies op de horde'}},
 lightning:{nl:'Bliksem',sp:{n:'Donderstorm',cd:11,d:'12 blikseminslagen uit de lucht'}},
 void:{nl:'Void',sp:{n:'Event Horizon',cd:15,d:'Enorm zwart gat in de grootste groep'}},
 flame:{nl:'Vuur',range:170,sp:{n:'Vuurstorm',cd:12,d:'Een draaiende ring van vuur rond je (3s)'}},
 crystal:{nl:'Kristal',sp:{n:'Kristalregen',cd:10,d:'24 kristallen vallen op de horde'}},
 boomerang:{nl:'Boemerang',sp:{n:'Wervelwind',cd:9,d:'10 boemerangs in alle richtingen'}},
 poison:{nl:'Gif',sp:{n:'Gifwolk',cd:13,d:'Gigantische gifwolk op de grootste groep'}},
 blood:{nl:'Bloed',sp:{n:'Bloedoffer',cd:12,d:'Bloednova die je heelt per geraakte zombie'}},
 rocket:{nl:'Raket',sp:{n:'Raketsalvo',cd:11,d:'12 zoekende raketten'}},
 sound:{nl:'Geluid',range:270,sp:{n:'Sonic Boom',cd:10,d:'Enorme schokgolf die alles wegduwt en verdooft'}},
 plasma:{nl:'Plasma',sp:{n:'Plasma Nova',cd:12,d:'8 plasmabollen in alle richtingen'}},
 shadow:{nl:'Schaduw',sp:{n:'Schaduwzwerm',cd:11,d:'20 zoekende schaduwbolts'}},
 quake:{nl:'Aardbeving',range:200,sp:{n:'Grote Beving',cd:13,d:'Drie enorme schokgolven die verdoven'}},
 time:{nl:'Tijd',sp:{n:'Tijdsprong',cd:14,d:'Alle zombies 70% trager en +30% damage ontvangen (4s)'}},
 drone:{nl:'Drone',sp:{n:'Drone Overdrive',cd:14,d:'Drones vuren 3x zo snel + 3 extra drones (6s)'}},
 tornado:{nl:'Tornado',sp:{n:'Supercel',cd:13,d:'4 tornado\'s razen door de arena'}},
 portal:{nl:'Portaal',sp:{n:'Portaalstorm',cd:13,d:'6 portalen openen rond de horde'}},
 soul:{nl:'Ziel',sp:{n:'Zielenoogst',cd:12,d:'15 spirits jagen op zombies'}},
 beam:{nl:'Straal',sp:{n:'Overload',cd:14,d:'Straal 3x zo breed en sterk (3s)'}},
 meteor:{nl:'Meteoor',sp:{n:'Meteorenregen',cd:13,d:'12 meteoren slaan in'}},
 nuke:{nl:'Nucleair',sp:{n:'Kernfusie',cd:20,d:'Een gigantische kernexplosie + straling'}},
 galaxy:{nl:'Kosmisch',sp:{n:'Supernova',cd:15,d:'Planeten exploderen in een supernova'}},
 rainbow:{nl:'Regenboog',sp:{n:'Prisma Burst',cd:12,d:'Alle elementen tegelijk'}},
};

/* role = waar de staf goed in is. Rarity ≠ automatisch sterker. */
const STAFFS=[
 /* Common */
 {id:'oak',name:'Eiken Staf',r:0,type:'bolt',dmg:12,rate:2.2,col:'#a3e635',role:'Allround',desc:'Een simpele staf die betrouwbare magische bolts schiet.'},
 {id:'spam',name:'Spam Staf',r:0,type:'spam',dmg:4,rate:11,col:'#facc15',role:'Groepen',desc:'Een stortvloed aan kleine projectielen. Weinig damage per schot, maar raakt veel.'},
 {id:'ember',name:'Vonken Staf',r:0,type:'flame',dmg:3.4,rate:10,col:'#fb7185',range:150,burn:.5,role:'Groepen',desc:'Korte vlammenwerper. Dichtbij is hij verrassend sterk tegen groepen.'},
 {id:'quartz',name:'Kwarts Staf',r:0,type:'crystal',dmg:10,rate:1.8,col:'#e9d5ff',frags:4,role:'Groepen',desc:'Kristallen die bij impact in scherven uiteenspatten.'},
 {id:'boomer',name:'Boemerang Staf',r:0,type:'boomerang',dmg:9,rate:1.4,col:'#fdba74',role:'Lijnen',desc:'Een magische boemerang die heen én terug door zombies snijdt.'},
 /* Uncommon */
 {id:'laser',name:'Laser Staf',r:1,type:'laser',dmg:9,rate:3,col:'#ff3b6b',role:'Lijnen',desc:'Snelle lasers die door meerdere zombies heen boren.'},
 {id:'frost',name:'IJs Staf',r:1,type:'ice',dmg:8,rate:2.4,col:'#7dd3fc',proj:1,freeze:.15,role:'Controle',desc:'Vertraagt zombies en kan ze tijdelijk bevriezen.'},
 {id:'poison',name:'Gif Staf',r:1,type:'poison',dmg:6,rate:1.5,col:'#84cc16',cloud:65,role:'Groepen',desc:'Gifbollen die een vergiftigende wolk achterlaten.'},
 {id:'blood',name:'Bloed Staf',r:1,type:'blood',dmg:11,rate:2.6,col:'#dc2626',ls:.02,role:'Overleven',desc:'Bloedbolts die bloeding veroorzaken en jou genezen.'},
 {id:'rocket',name:'Raket Staf',r:1,type:'rocket',dmg:19,rate:1.1,col:'#f97316',aoe:55,role:'Allround',desc:'Zoekende raketten met een kleine explosie.'},
 {id:'sonic',name:'Sonic Staf',r:1,type:'sound',dmg:7,rate:1.6,col:'#67e8f9',range:260,role:'Controle',desc:'Geluidsgolven die zombies wegduwen en soms verdoven.'},
 /* Rare */
 {id:'snipe',name:'Sniper Staf',r:2,type:'sniper',dmg:95,rate:.55,col:'#e2e8f0',role:'Bosses',desc:'Langzaam maar extreem veel damage. Richt altijd op de sterkste vijand.'},
 {id:'boom',name:'Explosie Staf',r:2,type:'explosion',dmg:22,rate:1.3,col:'#fb923c',aoe:70,role:'Groepen',desc:'Explosieve projectielen die damage doen in een gebied.'},
 {id:'plasma',name:'Plasma Staf',r:2,type:'plasma',dmg:9,rate:1.1,col:'#22d3ee',role:'Lijnen',desc:'Langzame plasmabollen die alles op hun pad blijven verbranden.'},
 {id:'shadow',name:'Schaduw Staf',r:2,type:'shadow',dmg:15,rate:2,col:'#a78bfa',bounce:3,role:'Allround',desc:'Zoekende schaduwbolts die 3 keer overspringen.'},
 {id:'quake',name:'Aardbeving Staf',r:2,type:'quake',dmg:22,rate:.8,col:'#d6a46b',range:190,stun:.2,role:'Overleven',desc:'Schokgolven rond jou die alles in de buurt raken en verdoven.'},
 {id:'time',name:'Tijd Staf',r:2,type:'time',dmg:9,rate:1.4,col:'#fde68a',role:'Support',desc:'Tijdvelden die zombies vertragen en extra damage laten ontvangen.'},
 {id:'drone',name:'Drone Staf',r:2,type:'drone',dmg:7,rate:1.2,col:'#94a3b8',drones:3,role:'Support',desc:'Spawnt 3 drones die automatisch meevechten.'},
 /* Epic */
 {id:'volt',name:'Bliksem Staf',r:3,type:'lightning',dmg:18,rate:2,col:'#a5b4fc',chain:5,role:'Groepen',desc:'Bliksem die overspringt naar 5 zombies.'},
 {id:'prism',name:'Prisma Laser',r:3,type:'laser',dmg:13,rate:3.4,col:'#f0abfc',beams:3,role:'Lijnen',desc:'Splitst in drie doorborende lasers.'},
 {id:'gatling',name:'Gatling Staf',r:3,type:'spam',dmg:5.5,rate:18,col:'#fde047',role:'Allround',desc:'Een magische minigun. Houdt nooit op met schieten.'},
 {id:'tornado',name:'Tornado Staf',r:3,type:'tornado',dmg:8,rate:.7,col:'#cbd5e1',role:'Controle',desc:'Tornado\'s die zombies meesleuren en vermalen.'},
 {id:'portal',name:'Portaal Staf',r:3,type:'portal',dmg:11,rate:.75,col:'#38bdf8',shots:5,role:'Allround',desc:'Opent portalen die vanaf de zijkant projectielen afvuren.'},
 {id:'soul',name:'Zielen Staf',r:3,type:'soul',dmg:16,rate:1.4,col:'#86efac',spirits:2,role:'Allround',desc:'Roept spirits op die zelf op zombies jagen.'},
 {id:'beam',name:'Laserstraal Staf',r:3,type:'beam',dmg:6,rate:10,col:'#ff4d6d',role:'Bosses',desc:'Een doorlopende straal die steeds sterker wordt op hetzelfde doel. Boss-smelter.'},
 /* Legendary */
 {id:'void',name:'Void Staf',r:4,type:'void',dmg:13,rate:.9,col:'#8b5cf6',hole:95,role:'Controle',desc:'Zwarte gaten die zombies naar elkaar toe trekken en verpletteren.'},
 {id:'meteor',name:'Meteor Staf',r:4,type:'meteor',dmg:70,rate:.8,col:'#f97316',aoe:120,role:'Groepen',desc:'Laat meteoren uit de lucht op zombies vallen.'},
 {id:'blizz',name:'Blizzard Staf',r:4,type:'ice',dmg:16,rate:3,col:'#bae6fd',proj:3,freeze:.25,role:'Controle',desc:'Drie ijsscherven tegelijk. Bevriest zombies vaak.'},
 {id:'crown',name:'Kristalkroon',r:4,type:'crystal',dmg:22,rate:2.2,col:'#f0abfc',frags:7,role:'Groepen',desc:'Koninklijke kristallen die in 7 scherven exploderen.'},
 {id:'inferno',name:'Inferno Staf',r:4,type:'flame',dmg:7,rate:12,col:'#f97316',range:200,burn:1,role:'Groepen',desc:'Een brullende vuurzee met zware brandwonden.'},
 {id:'swarm',name:'Zwerm Staf',r:4,type:'drone',dmg:10,rate:1.4,col:'#cbd5e1',drones:6,role:'Support',desc:'Een hele zwerm van 6 gevechtsdrones.'},
 {id:'rainbow',name:'Regenboog Staf',r:4,type:'rainbow',dmg:26,rate:2.4,col:'#f472b6',role:'Allround',desc:'Wisselt iedere aanval van element: bolt, ijs, explosie, bliksem, laser en gif.'},
 /* Mythic */
 {id:'storm',name:'Stormheer Staf',r:5,type:'lightning',dmg:42,rate:2.6,col:'#60a5fa',chain:9,role:'Groepen',desc:'Kettingbliksem die door complete hordes springt.'},
 {id:'rail',name:'Railgun Staf',r:5,type:'sniper',dmg:420,rate:.7,col:'#22d3ee',pierce:true,role:'Bosses',desc:'Doorboort alles op zijn pad. De ultieme boss-killer.'},
 {id:'sing',name:'Singulariteit',r:5,type:'void',dmg:32,rate:1.1,col:'#d946ef',hole:150,role:'Controle',desc:'Zwarte gaten zo zwaar als een kleine ster.'},
 {id:'nuke',name:'Nucleaire Staf',r:5,type:'nuke',dmg:320,rate:.33,col:'#bef264',aoe:230,role:'Groepen',desc:'Langzame kernkoppen met een enorme explosie en radioactieve neerslag.'},
 {id:'galaxy',name:'Galaxy Staf',r:5,type:'galaxy',dmg:30,rate:2,col:'#818cf8',planets:3,role:'Allround',desc:'Sterren-projectielen en 3 planeten die om je heen draaien.'},
 {id:'bmoon',name:'Bloedmaan Staf',r:5,type:'blood',dmg:40,rate:3.4,col:'#be123c',ls:.04,role:'Overleven',desc:'Bloedmaan-magie met sterke lifesteal.'},
 /* Secret */
 {id:'burger',name:'Gouden Burger Staf',r:6,type:'explosion',dmg:48,rate:4.5,col:'#ffc83d',aoe:65,burger:true,role:'Groepen',desc:'Vuurt exploderende burgers af. Geheim, krachtig en heerlijk.'},
 {id:'cosmic',name:'Kosmische Staf',r:6,type:'laser',dmg:60,rate:4,col:'#ffffff',beams:2,chain:4,role:'Allround',desc:'Kosmische lasers die bij iedere treffer bliksem laten overspringen.'},
 {id:'destroyer',name:'Galaxy Destroyer',r:6,type:'galaxy',dmg:85,rate:2.4,col:'#c4b5fd',planets:5,sp:{n:'Big Bang',cd:22,d:'Ultimate: verpletterende kosmische explosie over de hele arena'},role:'Ultimate',desc:'Vijf planeten, sterrenregen en de Big Bang als ultimate.'},
 {id:'plague',name:'Plaagkoning Staf',r:6,type:'poison',dmg:26,rate:2.5,col:'#a3e635',cloud:95,spread:true,role:'Groepen',desc:'Gif dat zich verspreidt: vergiftigde zombies laten bij hun dood een nieuwe wolk achter.'},
];

/* Classes: stats + passief (code-hook op id) + ability */
const CLASSES=[
 /* Common */
 {id:'recruit',name:'Rekruut',r:0,col:'#94a3b8',hp:1.15,aura:'ring',style:'Allround',pas:'+15% health',ab:{n:'Tweede Adem',cd:22,d:'Heal 35% en 50% minder damage (2s)'}},
 {id:'scout',name:'Verkenner',r:0,col:'#34d399',spd:1.3,rate:1.1,crit:.08,aura:'ring',style:'Mobiliteit',pas:'+30% loopsnelheid, +10% attack speed',ab:{n:'Dash',cd:5,d:'Snelle dash, onkwetsbaar tijdens de dash'}},
 {id:'guardian',name:'Guardian',r:0,col:'#93c5fd',hp:1.3,armor:.15,aura:'hex',style:'Verdediging',pas:'Plaatst iedere 12s automatisch 3 muren richting de zombies',ab:{n:'Bolwerk',cd:18,d:'Twee muurbogen naast je + 60% damage-reductie (3s)'}},
 {id:'monk',name:'Monnik',r:0,col:'#fcd34d',spd:1.15,dodge:.15,aura:'orbit',style:'Ontwijken',pas:'15% kans om aanvallen te ontwijken',ab:{n:'Palmstoot',cd:9,d:'Duwt alles in de buurt weg en verdooft 1s'}},
 /* Uncommon */
 {id:'mage',name:'Mage',r:1,col:'#a78bfa',hp:.95,dmg:1.3,rate:1.2,aura:'orbit',style:'Damage',pas:'+30% staff damage, +20% attack speed',ab:{n:'Arcane Overdrive',cd:18,d:'Dubbele attack speed (5s)'}},
 {id:'tank',name:'Tank',r:1,col:'#60a5fa',hp:1.9,armor:.3,spd:.9,aura:'hex',style:'Verdediging',pas:'+90% health, 30% minder damage ontvangen',ab:{n:'Schildmuur',cd:16,d:'Ring van muren + 80% damage-reductie (3s)'}},
 {id:'assassin',name:'Assassin',r:1,col:'#f43f5e',hp:.85,dmg:1.1,crit:.3,critM:3,spd:1.15,aura:'scope',style:'Crits',pas:'30% crit, 3x crit damage. Executes: zombies onder 15% HP sterven direct',ab:{n:'Schaduwstap',cd:10,d:'Teleporteert naar de sterkste zombie voor een backstab (8x damage, crit)'}},
 {id:'pyro',name:'Pyromancer',r:1,col:'#fb923c',dmg:1.15,aura:'flame',style:'Damage over tijd',pas:'Alle treffers zetten zombies in brand',ab:{n:'Vuurring',cd:13,d:'Vuurnova rond je die alles in brand zet'}},
 {id:'cryo',name:'Cryomancer',r:1,col:'#7dd3fc',hp:1.05,aura:'frost',style:'Controle',pas:'Alle treffers vertragen zombies 25%',ab:{n:'Absolute Nul',cd:16,d:'Bevriest alles in een grote straal (2.5s)'}},
 /* Rare */
 {id:'sniper',name:'Sniper',r:2,col:'#f472b6',dmg:1.15,crit:.25,critM:2.5,boss:1.6,aura:'scope',style:'Bosses',pas:'25% crit, 2.5x crit damage, +60% boss damage',ab:{n:'Headhunter',cd:14,d:'Volgende 8 aanvallen zijn crits met dubbele crit damage'}},
 {id:'eng',name:'Engineer',r:2,col:'#fb923c',hp:1.1,aura:'gear',style:'Builder',pas:'Spawnt automatisch towers (max 3, meer op hoger level)',ab:{n:'Barricade',cd:16,d:'Bouwt een muur van 7 blokken richting de zombies'}},
 {id:'mechanic',name:'Mechanic',r:2,col:'#fbbf24',hp:1.1,aura:'gear',style:'Builder',pas:'Bouwt snelle mini-turrets (max 4)',ab:{n:'Overklok',cd:15,d:'Repareert alles en turrets vuren 2x zo snel (6s)'}},
 {id:'berserk',name:'Berserker',r:2,col:'#ef4444',hp:1.25,dmg:1.05,aura:'rage',style:'Schaalt',pas:'+3% damage per wave in dit potje (max +150%), sneller bij lage HP',ab:{n:'Razernij',cd:16,d:'+60% attack speed en 5% lifesteal (6s)'}},
 {id:'alch',name:'Alchemist',r:2,col:'#a3e635',aura:'orbit',style:'Support',pas:'Zombies laten soms potions vallen (4%)',ab:{n:'Willekeurige Potion',cd:11,d:'Gooit een potion: heal, rage, gif, ijs of goud'}},
 {id:'druid',name:'Druïde',r:2,col:'#22c55e',hp:1.15,regen:.012,aura:'leaf',style:'Overleven',pas:'Regenereert 1.2% HP per seconde',ab:{n:'Wurgwortels',cd:14,d:'Wortels houden alles in de buurt 2.5s vast + heal 15%'}},
 /* Epic */
 {id:'summ',name:'Summoner',r:3,col:'#4ade80',hp:1.05,dmg:1.05,aura:'orbit',style:'Summoner',pas:'Roept automatisch imps op die zombies aanvallen',ab:{n:'Golem',cd:22,d:'Roept een Golem op die zombies tegenhoudt en slaat'}},
 {id:'build',name:'Builder',r:3,col:'#facc15',hp:1.2,armor:.1,aura:'gear',style:'Builder',pas:'Bouw towers (T), muren (G) en upgrade towers (U) met scrap van kills',ab:{n:'Fort',cd:28,d:'Gratis 2 towers en een ring van muren'}},
 {id:'beast',name:'Beastmaster',r:3,col:'#d97706',hp:1.15,aura:'paw',style:'Summoner',pas:'Wolven vechten met je mee (max 3)',ab:{n:'Oerbeer',cd:20,d:'Roept een enorme beer op'}},
 {id:'vamp',name:'Vampire',r:3,col:'#be123c',hp:.95,dmg:1.15,ls:.04,aura:'bat',style:'Lifesteal',pas:'4% lifesteal, kills helen 1% HP',ab:{n:'Bloeddorst',cd:16,d:'4x lifesteal en +30% damage (5s)'}},
 {id:'stormc',name:'Stormcaller',r:3,col:'#60a5fa',dmg:1.05,aura:'storm',style:'Damage',pas:'Iedere 1.2s slaat bliksem in op een zombie',ab:{n:'Onweer',cd:14,d:'15 blikseminslagen'}},
 {id:'hacker',name:'Hacker',r:3,col:'#22d3ee',aura:'code',style:'Controle',pas:'10% kans dat een treffer een zombie 1s uitschakelt',ab:{n:'Systeemcrash',cd:15,d:'Schakelt 12 zombies 3s uit, ze krijgen +50% damage. Bosses: volgende aanval vertraagd'}},
 /* Legendary */
 {id:'necro',name:'Necromancer',r:4,col:'#a3e635',dmg:1.25,aura:'skull',style:'Summoner',pas:'25% kans dat een gedode zombie als skelet voor jou vecht',ab:{n:'Leger der Doden',cd:20,d:'Roept 6 skeletten op'}},
 {id:'pala',name:'Paladin',r:4,col:'#fde68a',hp:1.6,dmg:1.3,armor:.2,aura:'holy',style:'Tank / Heal',pas:'Holy aura beschadigt zombies dichtbij',ab:{n:'Heilige Hamer',cd:14,d:'Enorme holy explosie + heal 20% + schild'}},
 {id:'commander',name:'Commander',r:4,col:'#f59e0b',hp:1.2,aura:'banner',style:'Units',pas:'Alle units +50% damage en HP. Spawnt soldaten (max 3)',ab:{n:'Ten Aanval!',cd:18,d:'Alle units 2x damage en snelheid (6s) + 3 soldaten'}},
 {id:'arch',name:'Architect',r:4,col:'#fcd34d',hp:1.15,aura:'gear',style:'Builder',pas:'Bouwt verschillende towers: cannon, frost, tesla en raket (max 4)',ab:{n:'Blauwdruk',cd:20,d:'Alle towers +1 level (max 5) en volledig gerepareerd'}},
 {id:'gambler',name:'Gokker',r:4,col:'#10b981',crit:.2,aura:'dice',style:'Geluk',pas:'Crits doen willekeurig 1.5x–6x damage. 7% burger-drop kans',ab:{n:'Jackpot',cd:16,d:'Gooit de dobbelsteen: 6 verschillende uitkomsten'}},
 /* Mythic */
 {id:'chrono',name:'Chronomancer',r:5,col:'#22d3ee',hp:1.3,dmg:1.45,rate:1.35,crit:.12,critM:2,aura:'clock',style:'Damage',pas:'+45% damage, +35% attack speed',ab:{n:'Tijdstop',cd:24,d:'Bevriest alle zombies 3.5s (bosses vertraagd)'}},
 {id:'keeper',name:'Timekeeper',r:5,col:'#fde68a',hp:1.35,dmg:1.3,aura:'clock',style:'Controle',pas:'Alle zombies 20% trager',ab:{n:'Tijdlus',cd:20,d:'Spoelt je HP 4s terug en vertraagt alles 60% (4s)'}},
 {id:'eprime',name:'Engineer Prime',r:5,col:'#fb923c',hp:1.3,dmg:1.15,aura:'gear',style:'Builder',pas:'Bouwt tesla- en laser-towers (max 5) en automatische muren',ab:{n:'Fortress Protocol',cd:24,d:'Mega-turret + alle muren hersteld'}},
 {id:'dimen',name:'Dimension Master',r:5,col:'#c084fc',hp:1.25,dmg:1.3,rate:1.1,aura:'rift',style:'Teleport',pas:'Iedere 7s opent een portaal dat op zombies vuurt',ab:{n:'Dimensiesprong',cd:12,d:'Teleporteert naar de veiligste plek en laat een zwart gat achter'}},
 /* Secret */
 {id:'blord',name:'Burger Lord',r:6,col:'#ffc83d',hp:1.6,dmg:1.6,rate:1.25,crit:.15,critM:2,boss:1.3,armor:.15,spd:1.1,aura:'burger',style:'Legende',pas:'Dubbele burger-drop kans (10%) en automatische burger-towers',ab:{n:'Burgerregen',cd:14,d:'14 exploderende burgers vallen uit de lucht'}},
 {id:'cmdx',name:'Commander X',r:6,col:'#e879f9',hp:1.7,dmg:1.6,rate:1.3,crit:.15,critM:2.2,armor:.2,spd:1.1,aura:'banner',style:'Legende',pas:'Units +100%. Spawnt elite troopers (max 4). +2% HP regen',regen:.02,ab:{n:'Orbital Strike',cd:16,d:'3 orbitale lasers + heal 30%'}},
];
CLASSES.forEach(c=>{for(const[k,v] of Object.entries({hp:1,dmg:1,rate:1,crit:.05,critM:1.5,boss:1,armor:0,spd:1,dodge:0,regen:0,ls:0}))if(c[k]==null)c[k]=v});
const STAFF=Object.fromEntries(STAFFS.map(s=>[s.id,s])), CLS=Object.fromEntries(CLASSES.map(c=>[c.id,c]));

/* Synergieën: staff (id of type) + class → mods.
   Mod keys: dmg rate crit critM boss hp aoe chain pierce freeze holeR cd drones spirits units ls burn towerKind stun necro burger wallHp poison range bounce frags beams planets portalShots */
const SYN=[
 {n:'Eerste Stappen',st:{id:'oak'},cl:'recruit',d:'+25% damage en +20% health voor beginners',m:{dmg:1.25,hp:1.2}},
 {n:'Laser Turrets',st:{type:'laser'},cl:'eng',d:'Je towers vuren doorborende lasers',m:{towerKind:'laser',units:1.2}},
 {n:'Dodelijk Oog',st:{type:'sniper'},cl:'sniper',d:'+15% crit en +1.5x crit damage',m:{crit:.15,critM:1.5}},
 {n:'Zielenbinder',st:{type:'soul'},cl:'summ',d:'+3 spirits per aanval, units +30%',m:{spirits:3,units:1.3}},
 {n:'Armageddon',st:{type:'meteor'},cl:'pyro',d:'50% grotere meteoren die alles in brand zetten',m:{aoe:1.5,burn:1}},
 {n:'Permafrost',st:{type:'ice'},cl:'cryo',d:'+25% bevries-kans, langere freeze',m:{freeze:.25,dmg:1.1}},
 {n:'Dronefabriek',st:{type:'drone'},cl:'mechanic',d:'+2 extra drones',m:{drones:2}},
 {n:'Arcane Bolts',st:{type:'bolt'},cl:'mage',d:'Bolts doorboren 2 extra zombies, +15% attack speed',m:{pierce:2,rate:1.15}},
 {n:'Aardschok',st:{type:'quake'},cl:'tank',d:'40% grotere schokgolven, +20% stun-kans',m:{range:1.4,stun:.2}},
 {n:'Dodenleger',st:{type:'soul'},cl:'necro',d:'+25% kans om skeletten op te wekken',m:{necro:.25,spirits:1}},
 {n:'Heilig Bloed',st:{type:'blood'},cl:'pala',d:'+3% lifesteal en +15% damage',m:{ls:.03,dmg:1.15}},
 {n:'Bloedlust',st:{type:'blood'},cl:'vamp',d:'+5% lifesteal en +20% damage',m:{ls:.05,dmg:1.2}},
 {n:'Godenstorm',st:{type:'lightning'},cl:'stormc',d:'+4 sprongen en +15% damage',m:{chain:4,dmg:1.15}},
 {n:'Tijdmeester',st:{type:'time'},cl:'chrono',d:'Specials laden 40% sneller op',m:{cd:.6}},
 {n:'Eeuwige Seconde',st:{type:'time'},cl:'keeper',d:'Grotere tijdvelden en +25% damage',m:{range:1.5,dmg:1.25}},
 {n:'Vuurzee',st:{type:'flame'},cl:'pyro',d:'40% langere vlammen, dubbele brand-damage',m:{range:1.4,burn:2}},
 {n:'Schaduwdolk',st:{type:'shadow'},cl:'assassin',d:'+20% crit en 2 extra sprongen',m:{crit:.2,bounce:2}},
 {n:'Backdoor',st:{type:'portal'},cl:'hacker',d:'Portalen vuren 3 extra schoten en verdoven',m:{portalShots:3,stun:.15}},
 {n:'Multiversum',st:{type:'portal'},cl:'dimen',d:'+30% damage en 3 extra portaalschoten',m:{dmg:1.3,portalShots:3}},
 {n:'Gebeurtenishorizon',st:{type:'void'},cl:'dimen',d:'40% grotere zwarte gaten',m:{holeR:1.4,dmg:1.1}},
 {n:'Stormbeesten',st:{type:'tornado'},cl:'beast',d:'Units +40% en grotere tornado\'s',m:{units:1.4,range:1.3}},
 {n:'Meesterbrouwer',st:{type:'poison'},cl:'alch',d:'Gif doet 60% meer damage, wolken 30% groter',m:{poison:1.6,range:1.3}},
 {n:'Giftige Wortels',st:{type:'poison'},cl:'druid',d:'Gif +40% en vergiftigde zombies zijn trager',m:{poison:1.4,freeze:.05}},
 {n:'Bloedrazernij',st:{type:'blood'},cl:'berserk',d:'+25% attack speed en +2% lifesteal',m:{rate:1.25,ls:.02}},
 {n:'Luchtmacht',st:{type:'drone'},cl:'commander',d:'+1 drone en units +50%',m:{drones:1,units:1.5}},
 {n:'Raketbatterij',st:{type:'rocket'},cl:'arch',d:'Al je towers vuren raketten',m:{towerKind:'rocket',units:1.2}},
 {n:'Prismanetwerk',st:{type:'beam'},cl:'eprime',d:'Towers vuren lasers, units +30%',m:{towerKind:'laser',units:1.3}},
 {n:'Geluksregenboog',st:{type:'rainbow'},cl:'gambler',d:'+20% crit en +20% damage',m:{crit:.2,dmg:1.2}},
 {n:'Burgerimperium',st:{id:'burger'},cl:'blord',d:'+5% burger-drop kans en +50% damage',m:{burger:.05,dmg:1.5}},
 {n:'Kosmisch Commando',st:{type:'galaxy'},cl:'cmdx',d:'+40% damage, specials 30% sneller',m:{dmg:1.4,cd:.7}},
 {n:'Snelle Retour',st:{type:'boomerang'},cl:'scout',d:'+30% attack speed, oneindig doorboren',m:{rate:1.3,dmg:1.1}},
 {n:'Innerlijke Echo',st:{type:'sound'},cl:'monk',d:'30% grotere golven, +20% stun',m:{range:1.3,stun:.2}},
 {n:'Kristallen Bastion',st:{type:'crystal'},cl:'guardian',d:'+3 scherven, muren +50% HP',m:{frags:3,wallHp:1.5}},
 {n:'Raketturrets',st:{type:'rocket'},cl:'mechanic',d:'Mini-turrets worden raketturrets',m:{towerKind:'rocket'}},
 {n:'Mechanische Imps',st:{type:'drone'},cl:'summ',d:'+1 drone en units +30%',m:{drones:1,units:1.3}},
 {n:'Pestmeester',st:{id:'plague'},cl:'necro',d:'+50% gif-damage en +15% skelet-kans',m:{poison:1.5,necro:.15}},
 {n:'IJstijd',st:{id:'blizz'},cl:'cryo',d:'+30% bevries-kans, specials 30% sneller',m:{freeze:.3,cd:.7}},
 {n:'Kanon van God',st:{id:'rail'},cl:'sniper',d:'+50% boss damage',m:{boss:1.5}},
 {n:'Prismamagie',st:{id:'prism'},cl:'mage',d:'2 extra lasers',m:{beams:2}},
 {n:'Plasmaschild',st:{type:'plasma'},cl:'tank',d:'+25% damage en 15% extra health',m:{dmg:1.25,hp:1.15}},
 {n:'Brandende Explosies',st:{type:'explosion'},cl:'pyro',d:'Explosies zetten in brand, 25% groter',m:{burn:1,aoe:1.25}},
 {n:'Heilige Planeten',st:{type:'galaxy'},cl:'pala',d:'+2 planeten en +15% health',m:{planets:2,hp:1.15}},
 {n:'Kernwinter',st:{type:'nuke'},cl:'cryo',d:'Kernexplosies bevriezen overlevenden',m:{freeze:.5,aoe:1.15}},
 {n:'Wolvenroedel',st:{type:'tornado'},cl:'commander',d:'Units +60%',m:{units:1.6}},
];
SYN.forEach((s,i)=>s.id='syn'+i);

/* Zombies */
const ZT={
 walker:{n:'Walker',hp:12,spd:58,dmg:8,r:13,col:'#5f9e5a',from:1,w:10,d:'De standaard zombie. Langzaam maar met velen.'},
 runner:{n:'Fast Zombie',hp:8,spd:105,dmg:6,r:10,col:'#9acd5a',from:3,w:5,d:'Mager en razendsnel.'},
 brute:{n:'Tank Zombie',hp:55,spd:36,dmg:18,r:20,col:'#3f7448',from:6,w:3,d:'Veel HP en harde klappen.'},
 spitter:{n:'Spitter',hp:18,spd:48,dmg:9,r:13,col:'#b3d13b',from:9,w:3,ranged:1,d:'Blijft op afstand en spuugt zuur.'},
 flyer:{n:'Flying Zombie',hp:14,spd:80,dmg:8,r:12,col:'#7c6f9e',from:11,w:2.5,fly:1,d:'Vliegt over muren heen.'},
 exploder:{n:'Explosive Zombie',hp:14,spd:78,dmg:30,r:14,col:'#e2603a',from:13,w:2.5,boom:1,d:'Ontploft als hij dichtbij komt.'},
 toxic:{n:'Toxic Zombie',hp:26,spd:46,dmg:10,r:14,col:'#65a30d',from:16,w:2.2,toxic:1,d:'Laat een gifspoor achter en een gifwolk bij zijn dood.'},
 armored:{n:'Armored',hp:40,spd:44,dmg:12,r:16,col:'#7c8a8f',from:18,w:2.5,armor:.5,d:'Harnas: 50% minder damage (sniper negeert dit).'},
 shield:{n:'Shield Zombie',hp:34,spd:44,dmg:11,r:15,col:'#5b7fa8',from:22,w:2,shield:.8,d:'Een schild dat damage absorbeert. Explosies breken het sneller.'},
 invis:{n:'Invisible Zombie',hp:22,spd:66,dmg:12,r:12,col:'#a5b4c8',from:26,w:2,invis:1,d:'Bijna onzichtbaar tot hij dichtbij is of geraakt wordt.'},
 splitter:{n:'Splitter',hp:30,spd:52,dmg:10,r:16,col:'#8e5fb0',from:28,w:2,split:1,d:'Splitst in twee kleine zombies.'},
 regen:{n:'Regenerating Zombie',hp:40,spd:46,dmg:11,r:15,col:'#c2410c',from:32,w:2,regen:.04,d:'Herstelt 4% HP per seconde, behalve als hij brandt of vergiftigd is.'},
 ghost:{n:'Ghost',hp:22,spd:70,dmg:10,r:13,col:'#9fd8e8',from:36,w:2,ghost:1,d:'Zweeft door muren heen.'},
 giant:{n:'Giant Zombie',hp:240,spd:26,dmg:30,r:30,col:'#4a6b3a',from:40,w:.9,giant:1,d:'Enorm. Stampt muren en towers kapot.'},
 healer:{n:'Healer Zombie',hp:34,spd:42,dmg:6,r:15,col:'#e879a8',from:45,w:1.5,heal:1,d:'Heelt zombies om zich heen.'},
 minion:{n:'Boss Minion',hp:30,spd:70,dmg:12,r:13,col:'#7f1d1d',from:999,w:0,minion:1,d:'Opgeroepen door bosses. Snel en gevaarlijk.'},
};

/* Bosses: iedere 25 waves. atk = aanvallen per fase (3 fases) */
const BOSSES=[
 {name:'Giant Zombie',title:'De Verrotte Reus',col:'#4d8b45',c2:'#9be27a',r:56,hp:360,spd:26,dmg:30,atk:[['slam','summon'],['slam','summon','stomp'],['slam','stomp','rocks','summon']]},
 {name:'Toxic Zombie King',title:'Heerser van het Moeras',col:'#7fc21f',c2:'#d9ff4a',r:52,hp:700,spd:30,dmg:34,atk:[['spit','pool'],['spit','pool','summon'],['spit','toxicrain','pool','summon']]},
 {name:'Shadow Beast',title:'Het Ding in het Donker',col:'#2b1d47',c2:'#ff3bd4',r:50,hp:950,spd:40,dmg:40,atk:[['dash','orbs'],['dash','orbs','clone'],['dash','orbs','clone','darkness']]},
 {name:'Undead Destroyer',title:'Vernietiger der Levenden',col:'#b9b2a0',c2:'#ff4040',r:58,hp:1300,spd:30,dmg:46,atk:[['ring','slam'],['ring','slam','laser'],['ring','laser','missiles','summon']]},
 {name:'Ancient Zombie God',title:'De Eerste der Doden',col:'#d9a92f',c2:'#fff1a8',r:64,hp:1800,spd:32,dmg:52,atk:[['spiral','ring'],['spiral','pool','dash'],['spiral','ring','laser','meteors','summon']]},
 {name:'Frost Titan',title:'Hart van de Eeuwige Winter',col:'#7cc4e8',c2:'#e0f7ff',r:60,hp:2400,spd:28,dmg:58,atk:[['shards','freeze'],['shards','freeze','slam'],['shards','blizzard','freeze','summon']]},
 {name:'Mecha Zombie MK-X',title:'Gebouwd om te Vernietigen',col:'#64748b',c2:'#fb923c',r:58,hp:3100,spd:34,dmg:64,atk:[['missiles','laser'],['missiles','laser','ring'],['missiles','laser','spiral','summon']]},
 {name:'Zombie Hydra',title:'Drie Hoofden, Eén Honger',col:'#166534',c2:'#4ade80',r:64,hp:4000,spd:30,dmg:70,atk:[['spit','ring'],['spit','dash','summon'],['spit','spiral','toxicrain','meteors']]},
];

/* Arena's: wisselen iedere 25 waves */
const ARENAS=[
 {n:'Vervloekt Kerkhof',bg:['#1a1530','#07060d'],tile:'#221c3a',line:'rgba(120,90,255,.09)',deco:'grave',light:'#9fffcf',dark:'rgba(6,4,18,.5)',amb:'fog'},
 {n:'Giftig Moeras',bg:['#13261a','#040a06'],tile:'#173020',line:'rgba(160,255,80,.08)',deco:'swamp',light:'#c6ff4a',dark:'rgba(2,10,4,.5)',amb:'spore'},
 {n:'Schaduwrijk',bg:['#1f0f33','#06020c'],tile:'#241038',line:'rgba(255,60,200,.08)',deco:'crystal',light:'#ff6bd5',dark:'rgba(8,0,16,.58)',amb:'void'},
 {n:'Botten Citadel',bg:['#2a1414','#0a0404'],tile:'#2c1818',line:'rgba(255,90,60,.08)',deco:'bones',light:'#ff8a4a',dark:'rgba(12,2,2,.52)',amb:'ember'},
 {n:'Gouden Tempel',bg:['#2b2210','#0b0803'],tile:'#33280f',line:'rgba(255,210,90,.1)',deco:'pillar',light:'#ffd77a',dark:'rgba(10,6,0,.42)',amb:'dust'},
 {n:'Eeuwige Winter',bg:['#13263a','#040a12'],tile:'#183048',line:'rgba(160,220,255,.1)',deco:'ice',light:'#bfe9ff',dark:'rgba(2,8,16,.45)',amb:'snow'},
 {n:'Mecha Fabriek',bg:['#1c1f26','#06070a'],tile:'#22262f',line:'rgba(255,150,60,.08)',deco:'factory',light:'#ffb35c',dark:'rgba(4,4,8,.5)',amb:'ember'},
 {n:'Hydra Jungle',bg:['#0f2416','#030a05'],tile:'#13301b',line:'rgba(80,255,140,.08)',deco:'swamp',light:'#7dffb0',dark:'rgba(0,8,3,.52)',amb:'spore'},
];

/* Permanente upgrades (lobby, kosten burgers) */
const UPGRADES=[
 {id:'hp',n:'Vitaliteit',d:'+6% max health',max:20,base:120,g:1.35,v:.06},
 {id:'dmg',n:'Kracht',d:'+5% damage',max:20,base:150,g:1.4,v:.05},
 {id:'rate',n:'Snelheid',d:'+3% attack speed',max:15,base:150,g:1.4,v:.03},
 {id:'crit',n:'Precisie',d:'+1% crit-kans',max:15,base:140,g:1.35,v:.01},
 {id:'cd',n:'Focus',d:'-3% cooldowns',max:10,base:200,g:1.45,v:.03},
 {id:'regen',n:'Regeneratie',d:'+0.15% HP per seconde',max:10,base:120,g:1.4,v:.0015},
 {id:'units',n:'Commandant',d:'+6% unit damage en HP',max:15,base:150,g:1.4,v:.06},
 {id:'magnet',n:'Burgermagneet',d:'+20% pickup-radius',max:10,base:80,g:1.3,v:.2},
 {id:'xp',n:'Wijsheid',d:'+5% XP en mastery',max:10,base:100,g:1.35,v:.05},
 {id:'wave',n:'Burgerbonus',d:'+2 burgers per voltooide wave',max:10,base:250,g:1.5,v:2},
];
const UPG=Object.fromEntries(UPGRADES.map(u=>[u.id,u]));
const upgCost=(u,l)=>Math.round(u.base*Math.pow(u.g,l));

/* Achievements: c(S) geeft true als behaald */
const ACH=[];
const ach=(id,n,d,c,b,t)=>ACH.push({id,n,d,c,b:b||0,t:t||0});
[10,25,50,75,100,150,200].forEach((w,i)=>ach('w'+w,'Wave '+w,'Bereik wave '+w,S=>S.best>=w,100+i*150,i>=2?1:0));
[[100,'Opwarmer'],[1000,'Zombiejager'],[10000,'Uitroeier'],[50000,'Apocalyps']].forEach(([k,n],i)=>ach('k'+k,n,'Versla '+k.toLocaleString('nl')+' zombies',S=>S.kills>=k,100*(i+1)*(i+1),i>=2?1:0));
BOSSES.forEach((b,i)=>ach('b'+i,'Versla '+b.name,b.title,S=>(S.st.bossKills[i]||0)>0,300+i*100,1));
[[10,'Eerste Summons'],[100,'Gacha Fan'],[500,'Gacha Legende']].forEach(([k,n],i)=>ach('p'+k,n,'Doe '+k+' summons',S=>S.pulls>=k,150*(i+1),i));
[[10,'Verzamelaar'],[25,'Stafkenner'],[STAFFS.length,'Alle Staffen']].forEach(([k,n],i)=>ach('sc'+i,n,'Verzamel '+k+' staffen',S=>Object.keys(S.staffs).length>=k,200*(i+1),i+1));
[[10,'Klassenleraar'],[20,'Veelzijdig'],[CLASSES.length,'Alle Classes']].forEach(([k,n],i)=>ach('cc'+i,n,'Verzamel '+k+' classes',S=>Object.keys(S.classes).length>=k,200*(i+1),i+1));
[[1,'Combo!'],[10,'Buildmeester'],[25,'Synergie Expert']].forEach(([k,n],i)=>ach('sy'+k,n,'Speel met '+k+' verschillende synergieën',S=>Object.keys(S.st.synUsed).length>=k,150*(i+1),i));
[[10,'Ervaren'],[25,'Veteraan'],[50,'Legendarisch']].forEach(([k,n],i)=>ach('lv'+k,n,'Bereik player level '+k,S=>S.lvl>=k,200*(i+1),i+1));
ach('mast','Meester','Krijg een staff of class naar mastery 10',S=>Object.values(S.staffs).concat(Object.values(S.classes)).some(o=>(o.m||0)>=10),800,2);
ach('upg10','Investeerder','Koop 10 upgrades',S=>Object.values(S.upg).reduce((a,b)=>a+b,0)>=10,300);
ach('upg50','Grootinvesteerder','Koop 50 upgrades',S=>Object.values(S.upg).reduce((a,b)=>a+b,0)>=50,1000,2);
ach('time1','Toegewijd','Speel 1 uur in potjes',S=>S.st.playtime>=3600,400,1);
ach('rich','Burgermiljonair','Verdien in totaal 10.000 burgers',S=>S.st.earned>=10000,500,1);
ach('daily7','Trouwe Speler','Haal een daily-reeks van 7 dagen',S=>S.daily.streak>=7,500,2);
ach('runs10','Doorzetter','Speel 10 potjes',S=>S.st.runs>=10,200);

/* Collectiebeloningen op aantal unieke items */
const COLL=[[5,150,0],[10,300,1],[15,400,1],[20,600,1],[30,900,2],[40,1200,2],[50,1600,3],[60,2200,3],[STAFFS.length+CLASSES.length,5000,10]];
/* Daily rewards (7-daagse cyclus) */
const DAILY=[{b:100},{b:150},{b:200},{t:1},{b:300},{b:400},{b:500,t:2}];
