/* =====================================================================
   TINY EMPIRE — CONFIGURATION DATA
   ---------------------------------------------------------------------
   Everything that defines the game balance lives in this one file:
   buildings, roads, synergies, combinations, upgrades, districts, levels,
   quests, citizen needs and events.
   Edit numbers here to rebalance the game — no other file needs to change.
   ===================================================================== */
(function (TE) {
  'use strict';

  /* ---------- General balance ---------- */
  TE.BALANCE = {
    mapSize: 24,            // map is mapSize x mapSize tiles (change to grow the world)
    chunkSize: 4,           // land is bought in chunkSize x chunkSize sections
    startChunks: [[2, 2], [3, 2], [2, 3], [3, 3]], // starting land (chunk coordinates)
    startMoney: 1000,
    landValueInflation: 0.025, // every building raises new construction prices by 2.5% (roads, trees, lights excluded)
    customersPerResident: 1.0,  // each resident is one customer for shops & leisure
    customersPerHotel: 15,      // hotels bring tourists who also shop
    baseCustomers: 6,           // visitors from out of town (helps the first shops)
    workersPerResident: 0.7,    // share of residents who work
    demolishRefund: 0.5,    // fraction of money spent that is returned on demolish
    maxLevel: 5,
    serviceMaxLevel: 3,
    levelIncomeMult: [1, 1.6, 2.4, 3.5, 5.0],      // income-building output per level
    levelCostMult:   [0, 2.5, 6.0, 14.0, 30.0],     // upgrade to level N costs (price paid) * this
    residentCapMult: [1, 1.5, 2.0, 2.6, 3.2],      // homes: capacity per level
    serviceUpkeepMult: [1, 1.5, 2.1],              // service upkeep per level
    happinessIncomeFactor: 0.003, // city income bonus = (happiness - 50) * factor
    qualityIncomeFactor: 0.004,   // home income bonus = (quality - 50) * factor
    expansionBaseCost: 800,
    expansionGrowth: 1.55,
    expensiveConfirmFraction: 0.4, // ask for confirmation when a purchase costs >= 40% of cash...
    expensiveConfirmMin: 1000,     // ...and at least this much
    offlineIncomeRate: 0.5,        // fraction of net income earned while away
    offlineMaxSeconds: 2 * 3600,
    dayLength: 300,                // game seconds per day/night cycle
    autosaveSeconds: 30,
    firstEventDelay: 150,
    eventInterval: [110, 170],     // seconds between random events (min, max)
    basePower: 30,                 // power the Town Hall's small generator supplies
  };

  /* ---------- Traffic, parking, transit, river ---------- */
  TE.TRAFFIC = {
    tripsPerResident: 0.25,   // car trips per resident
    tripsPerCustomer: 0.5,    // per customer a shop needs
    tripsPerWorker: 0.6,     // per worker a workplace needs
    spreadRadius: 2,          // trips spread over road tiles this close to the building
    maxTransitCut: 0.6,       // public transport + bikes can remove at most 60% of car trips
    jamStart: 0.85,           // congestion where problems begin (load / capacity)
    jamIncomePenalty: 0.25,   // max business income lost to jams on its streets
    jamHappinessPenalty: 15,  // max happiness lost by homes on jammed streets
    trafficPollution: 0.6,    // pollution per unit of load on a road tile
    trafficNoise: 0.7,        // extra noise per unit of load
    parkingIncomeWeight: 0.3, // business income lost when it has no parking at all
    parkingTransitCut: 0.5,   // max share of parking demand removed by public transport
  };
  TE.RIVER = {
    decay: 0.9,               // river pollution kept per tile downstream
    dumpShare: 0.45,          // share of an industrial building's pollution that ends up in a nearby river
    homePenaltyMax: 15,       // max happiness lost by homes next to a dirty river
    floodZone: 1,             // land within this many tiles of the river can flood
    barrierRadius: 3,         // a flood barrier protects this far along the bank
  };

  /* ---------- Buildings ----------
     cat:      category (colors, filters, perks)
     tags:     used by synergy rules / combos ("home", "shop", "food", "work", "parking", ...)
     cost / costGrowth / income / upkeep: money ($/sec)
     unlock:   conditions to unlock (city level, population, neighborhood quality)
     place:    'land' (default) | 'water' (river tiles) | 'shore' (land touching water)
     road:     { cap: traffic capacity, parking: street spaces, walk: true for pedestrian-only }
     residents / taxPerResident / expectation: homes
     customers / workers / jobs / parking (spaces needed) / power (use) / trips (car trips override)
     emits / absorbs: { pollution:[amount, radius], noise:[amount, radius] }
     service:  coverage { kind, radius, strength, travel: 'road' | 'walk' }
     transit:  { kind: 'bus' | 'train' | 'bike', radius, cut } — fewer car trips & less parking needed
     parkingSupply: { cap, radius }   powerSupply: number
     paint:    can be drag-painted
  */
  TE.BUILDINGS = {
    /* ----- Roads & water crossings ----- */
    road: { name: 'Street', cat: 'infra', icon: '🛣️', cost: 10, unlock: { level: 1 }, paint: true,
      desc: 'Two-lane street with sidewalks and street parking. Connects buildings to the Town Hall. Drag to paint.',
      tags: ['road'], road: { cap: 10, parking: 3 }, emits: { noise: [5, 1] }, noUpgrade: true },
    avenue: { name: 'Avenue', cat: 'infra', icon: '🛤️', cost: 35, unlock: { level: 2 }, paint: true,
      desc: 'Four lanes with a planted median: more than double the traffic capacity, but no street parking and louder.',
      tags: ['road'], road: { cap: 26, parking: 0 }, emits: { noise: [9, 1] }, noUpgrade: true },
    bikelane: { name: 'Street + Bike Lane', cat: 'infra', icon: '🚲', cost: 22, unlock: { level: 2 }, paint: true,
      desc: 'A street with a protected bike lane. Homes and workplaces within 2 tiles make 12% fewer car trips.',
      tags: ['road', 'bike'], road: { cap: 10, parking: 2 }, emits: { noise: [4, 1] }, noUpgrade: true,
      transit: { kind: 'bike', radius: 2, cut: 0.12 } },
    roundabout: { name: 'Roundabout', cat: 'infra', icon: '🔄', cost: 80, unlock: { level: 3 },
      desc: 'Keeps a busy junction flowing: high capacity and quieter than a crossing.', tags: ['road'],
      road: { cap: 32, parking: 0 }, emits: { noise: [3, 1] }, noUpgrade: true },
    path: { name: 'Walking Path', cat: 'infra', icon: '🚶', cost: 8, unlock: { level: 1 }, paint: true,
      desc: 'A gravel footpath for pedestrians. Counts as a little recreation for nearby homes and links footbridges.',
      tags: ['walk'], road: { walk: true }, service: { kind: 'rec', radius: 1, strength: 0.25, travel: 'walk' }, noUpgrade: true },
    bridge: { name: 'Road Bridge', cat: 'infra', icon: '🌉', cost: 120, unlock: { level: 1 }, place: 'water', paint: true,
      desc: 'Carries a street across the river. Emergency services need road bridges to reach the other bank.',
      tags: ['road'], road: { cap: 12, parking: 0 }, emits: { noise: [4, 1] }, noUpgrade: true },
    footbridge: { name: 'Footbridge', cat: 'infra', icon: '🌁', cost: 50, unlock: { level: 1 }, place: 'water', paint: true,
      desc: 'A pedestrian bridge. Parks, schools and shops on the other bank become reachable on foot (not for cars or fire trucks).',
      tags: ['walk'], road: { walk: true }, noUpgrade: true },

    /* ----- Public transport & parking ----- */
    busstop: { name: 'Bus Stop', cat: 'transport', icon: '🚏', cost: 70, upkeep: 0.4, unlock: { level: 2 }, needsRoad: true,
      desc: 'Buses serve everything within 4 tiles: 25% fewer car trips and parking demand, better access to jobs.',
      tags: ['transit'], transit: { kind: 'bus', radius: 4, cut: 0.25 }, noUpgrade: true, power: 0.2 },
    trainstation: { name: 'Train Station', cat: 'transport', icon: '🚉', cost: 3000, upkeep: 4, income: 10, unlock: { level: 3 }, needsRoad: true,
      desc: 'Fast trains for commuters and tourists: 40% fewer car trips within 7 tiles, +12 visiting customers, offices nearby thrive.',
      tags: ['transit'], transit: { kind: 'train', radius: 7, cut: 0.4 }, jobs: 3, workers: 4, power: 4, tourists: 12, noUpgrade: true,
      emits: { noise: [10, 1] } },
    parkinglot: { name: 'Parking Lot', cat: 'transport', icon: '🅿️', cost: 80, upkeep: 0.2, unlock: { level: 1 },
      desc: '24 spaces for shops and offices within 3 tiles. Busy businesses without parking lose customers.',
      tags: ['parking'], parkingSupply: { cap: 24, radius: 3 }, emits: { noise: [3, 1] }, noUpgrade: true },
    garage: { name: 'Parking Garage', cat: 'transport', icon: '🏬', cost: 950, upkeep: 1.2, unlock: { level: 3 },
      desc: 'Multi-storey garage: 90 spaces for businesses within 4 tiles.', tags: ['parking'],
      parkingSupply: { cap: 90, radius: 4 }, power: 1, noUpgrade: true },
    charger: { name: 'EV Charging', cat: 'transport', icon: '🔌', cost: 260, upkeep: 0.2, income: 1.5, unlock: { level: 3 },
      desc: 'Electric cars: traffic within 4 tiles pollutes 35% less. Earns charging fees.', tags: ['ev'],
      power: 3, noUpgrade: true },

    /* ----- Homes ----- */
    townhall: { name: 'Town Hall', cat: 'civic', icon: '🏛️', cost: 0, income: 3, unlock: { never: true },
      desc: 'The heart of your city. The road network starts here, and its generator supplies a little power.', tags: ['civic'],
      noUpgrade: true, fixed: true, jobs: 2, powerSupply: 30 },
    house: { name: 'House', cat: 'residential', icon: '🏠', cost: 100, costGrowth: 0.05, unlock: { level: 1 },
      desc: 'A family home with a garden. Pays tax per resident.', tags: ['home', 'lowrise'],
      residents: 4, taxPerResident: 0.5, expectation: 0, power: 0.5, upkeep: 0.03 },
    townhouse: { name: 'Townhouse', cat: 'residential', icon: '🏘️', cost: 280, costGrowth: 0.05, unlock: { level: 2 },
      desc: 'Narrow row homes for 8 people. Look great in a row.', tags: ['home', 'lowrise'],
      residents: 8, taxPerResident: 0.55, expectation: 5, power: 0.8, upkeep: 0.06 },
    apartment: { name: 'Apartments', cat: 'residential', icon: '🏢', cost: 900, costGrowth: 0.06,
      unlock: { level: 2, population: 40, quality: 55 },
      desc: 'Many households under one roof. Residents expect a decent neighborhood.',
      tags: ['home', 'apt', 'dense'], residents: 16, taxPerResident: 0.6, expectation: 12, power: 2, upkeep: 0.2 },
    condo: { name: 'Luxury Apartments', cat: 'residential', icon: '🏙️', cost: 3000, costGrowth: 0.07,
      unlock: { level: 3, population: 150, quality: 72 },
      desc: 'Premium living. Big tax income — but wealthy residents leave poor neighborhoods quickly.',
      tags: ['home', 'apt', 'dense'], residents: 14, taxPerResident: 1.6, expectation: 30, power: 2.5, upkeep: 0.5 },
    tower: { name: 'Residential Tower', cat: 'residential', icon: '🌇', cost: 8000, costGrowth: 0.08,
      unlock: { level: 5, population: 300, quality: 65 },
      desc: 'A residential skyscraper for 60 people. Brings lots of traffic — plan transit around it.',
      tags: ['home', 'apt', 'dense'], residents: 60, taxPerResident: 0.9, expectation: 25, power: 8, upkeep: 1.5 },

    /* ----- Shops ----- */
    shop: { name: 'Corner Shop', customers: 3, cat: 'commercial', icon: '🏪', cost: 150, costGrowth: 0.08, income: 3, upkeep: 0.2, unlock: { level: 1 },
      desc: 'A small shop for daily needs. Loves being right next to homes.', tags: ['shop'], jobs: 0.5, parking: 2, power: 0.6 },
    bakery: { name: 'Bakery', customers: 4, cat: 'commercial', icon: '🥐', cost: 180, costGrowth: 0.08, income: 3, upkeep: 0.2, unlock: { level: 1 },
      desc: 'Fresh bread every morning. Loves nearby homes, dislikes a second bakery right next door.',
      tags: ['shop', 'food'], jobs: 0.5, parking: 3, power: 1 },
    coffee: { name: 'Café', customers: 4, cat: 'commercial', icon: '☕', cost: 250, costGrowth: 0.08, income: 4, upkeep: 0.25, unlock: { level: 1 },
      desc: 'Busy when offices or homes are nearby. Loves a waterfront view.', tags: ['shop', 'food'], jobs: 0.5, parking: 2, power: 1 },
    grocery: { name: 'Grocery Store', customers: 8, cat: 'commercial', icon: '🛒', cost: 350, costGrowth: 0.08, income: 6, upkeep: 0.4, unlock: { level: 2 },
      desc: 'Essential groceries for homes within 4 tiles. Sells more in residential districts.',
      tags: ['shop', 'grocer'], jobs: 1, parking: 6, power: 1.5, service: { kind: 'grocery', radius: 4, travel: 'walk' } },
    supermarket: { name: 'Supermarket', customers: 24, cat: 'commercial', icon: '🏬', cost: 1600, costGrowth: 0.08, income: 22, upkeep: 1.6, unlock: { level: 3 },
      desc: 'Big weekly shop for homes within 6 tiles. Needs a lot of parking.',
      tags: ['shop', 'grocer'], jobs: 3, parking: 20, power: 4, service: { kind: 'grocery', radius: 6, travel: 'road' } },
    mall: { name: 'Shopping Mall', customers: 30, cat: 'commercial', icon: '🛍️', cost: 2000, costGrowth: 0.1, income: 30, upkeep: 2.2, unlock: { level: 4 },
      desc: 'Draws shoppers from homes up to 3 tiles away. Needs plenty of parking or transit.', tags: ['shop'], jobs: 3,
      parking: 30, power: 6, emits: { noise: [12, 1] } },

    /* ----- Leisure ----- */
    restaurant: { name: 'Restaurant', customers: 8, cat: 'entertainment', icon: '🍝', cost: 400, costGrowth: 0.08, income: 7, upkeep: 0.5, unlock: { level: 2 },
      desc: 'Dinner with a view: earns more beside parks, cinemas, promenades and the river.', tags: ['shop', 'food', 'fun'], jobs: 1,
      parking: 5, power: 1.5, emits: { noise: [6, 1] } },
    cinema: { name: 'Cinema', customers: 18, cat: 'entertainment', icon: '🎬', cost: 1500, costGrowth: 0.1, income: 21, upkeep: 1.5, unlock: { level: 4 },
      desc: 'Pairs perfectly with restaurants for a nightlife bonus.', tags: ['fun'], jobs: 1.5, parking: 15, power: 3, emits: { noise: [10, 1] } },
    hotel: { name: 'Hotel', cat: 'entertainment', icon: '🏨', cost: 1800, costGrowth: 0.1, income: 24, upkeep: 1.8, unlock: { level: 4 },
      desc: 'Brings 15 tourist customers. Tourists love parks, dining, marinas, the river and landmarks; they hate factory views.',
      tags: ['fun'], jobs: 2, parking: 10, power: 4 },
    marina: { name: 'Marina', cat: 'entertainment', icon: '⛵', cost: 2500, costGrowth: 0.1, income: 18, upkeep: 2, unlock: { level: 3 }, place: 'water',
      desc: 'Boat moorings on the river (must touch land). Brings 12 tourists. Dirty water scares sailors away.',
      tags: ['fun', 'water'], jobs: 1.5, power: 2, tourists: 12 },

    /* ----- Offices ----- */
    office: { name: 'Office', workers: 6, cat: 'business', icon: '💼', cost: 600, costGrowth: 0.08, income: 9, upkeep: 0.7, unlock: { level: 3 },
      desc: 'Offices love coffee, each other and train stations. They hate noisy factories.', tags: ['work'], jobs: 3, parking: 8, power: 3 },
    skyscraper: { name: 'Skyscraper', workers: 25, cat: 'business', icon: '🌆', cost: 5000, costGrowth: 0.12, income: 65, upkeep: 4, unlock: { level: 5 },
      desc: 'The ultimate business address. Gains value next to offices and stations. Needs huge parking or transit.',
      tags: ['work', 'dense'], jobs: 8, parking: 30, power: 12 },

    /* ----- Industry & energy ----- */
    farm: { name: 'Farm', workers: 3, cat: 'industrial', icon: '🌾', cost: 300, costGrowth: 0.08, income: 4, upkeep: 0.3, unlock: { level: 2 },
      desc: 'Fields and a barn. Supplies fresh produce: bakeries, groceries and restaurants within 4 tiles earn +10%. +50% on fertile soil.',
      tags: ['agri'], jobs: 1, power: 0.5, emits: { pollution: [4, 1], noise: [3, 1] }, trips: 1 },
    factory: { name: 'Factory', workers: 8, cat: 'industrial', icon: '🏭', cost: 900, costGrowth: 0.09, income: 15, upkeep: 1, unlock: { level: 3 },
      desc: 'Big money, but pollutes the air and the river and makes noise. Keep it away from homes and cafés.',
      tags: ['work', 'industry'], jobs: 3, power: 6, trips: 5, emits: { pollution: [35, 3], noise: [25, 2] } },
    warehouse: { name: 'Warehouse', workers: 4, cat: 'industrial', icon: '📦', cost: 500, costGrowth: 0.08, income: 5, upkeep: 0.4, unlock: { level: 3 },
      desc: 'Boosts adjacent factories and earns more next to them. Lots of truck traffic.', tags: ['work', 'industry'], jobs: 1.5,
      power: 2, trips: 5, emits: { pollution: [8, 1], noise: [14, 1] } },
    ecofactory: { name: 'Eco Factory', workers: 10, cat: 'industrial', icon: '♻️', cost: 4000, costGrowth: 0.1, income: 50, upkeep: 3, unlock: { level: 5 },
      desc: 'Advanced clean manufacturing: high output, little pollution.', tags: ['work', 'industry'], jobs: 4,
      power: 5, trips: 4, emits: { pollution: [10, 2], noise: [12, 1] } },
    powerplant: { name: 'Power Plant', workers: 6, cat: 'industrial', icon: '⚡', cost: 2200, costGrowth: 0.15, upkeep: 3, unlock: { level: 2 },
      desc: 'Generates 150 power for the whole city. Very polluting — build it far from homes and upstream of nothing you love.',
      tags: ['industry', 'energy'], jobs: 2, powerSupply: 150, trips: 3, emits: { pollution: [45, 4], noise: [20, 2] }, noUpgrade: true },
    solar: { name: 'Solar Farm', cat: 'industrial', icon: '☀️', cost: 2400, costGrowth: 0.1, upkeep: 1, unlock: { level: 4 },
      desc: 'Clean energy: 60 power with no pollution at all.', tags: ['energy', 'green'], powerSupply: 60, trips: 0.5, noUpgrade: true },
    recycling: { name: 'Recycling Center', workers: 4, cat: 'industrial', icon: '🔁', cost: 1200, costGrowth: 0.1, income: 3, upkeep: 2, unlock: { level: 3 },
      desc: 'Cleans up: absorbs pollution within 3 tiles, cuts citywide smog and halves river pollution flowing past it.',
      tags: ['industry', 'green'], jobs: 1.5, power: 2, trips: 3, absorbs: { pollution: [14, 3] }, emits: { noise: [10, 1] }, smogCut: 4 },

    /* ----- Public services ----- */
    police: { name: 'Police Station', cat: 'service', icon: '🚓', cost: 500, costGrowth: 0.1, upkeep: 1.5, unlock: { level: 2 }, needsRoad: true,
      desc: 'Safety for homes it can reach by road within 5 tiles. Rivers block it unless there is a road bridge.',
      tags: ['emergency'], service: { kind: 'police', radius: 5, travel: 'road' }, power: 1 },
    fire: { name: 'Fire Station', cat: 'service', icon: '🚒', cost: 650, costGrowth: 0.1, upkeep: 1.8, unlock: { level: 2 }, needsRoad: true,
      desc: 'Contains fires within 5 road tiles before they cause damage. Also adds a little safety.',
      tags: ['emergency'], service: { kind: 'fire', radius: 5, travel: 'road' }, power: 1 },
    hospital: { name: 'Hospital', cat: 'service', icon: '🏥', cost: 1400, costGrowth: 0.1, upkeep: 3.5, unlock: { level: 3 }, needsRoad: true,
      desc: 'Healthcare for homes within 7 road tiles. Helps during heatwaves.', tags: ['emergency'], jobs: 2, power: 4,
      service: { kind: 'hospital', radius: 7, travel: 'road' } },
    school: { name: 'School', cat: 'service', icon: '🏫', cost: 1000, costGrowth: 0.1, upkeep: 2, unlock: { level: 2 },
      desc: 'Education for children within 5 tiles on foot (footbridges count). Families love it.', tags: ['edu'], jobs: 1.5, power: 2,
      service: { kind: 'school', radius: 5, travel: 'walk' }, emits: { noise: [5, 1] } },
    library: { name: 'Library', cat: 'service', icon: '📚', cost: 850, costGrowth: 0.1, upkeep: 1.3, unlock: { level: 3 },
      desc: 'Books, courses and a quiet reading room: education and a little happiness within 4 tiles.', tags: ['edu'], jobs: 1, power: 1,
      service: { kind: 'library', radius: 4, travel: 'walk' } },

    /* ----- Recreation & nature ----- */
    park: { name: 'Park', cat: 'recreation', icon: '🌳', cost: 150, costGrowth: 0.04, upkeep: 0.3, unlock: { level: 1 },
      desc: 'Recreation for homes within 3 tiles. Cleans the air and quiets the street.', tags: ['green', 'rec'],
      service: { kind: 'rec', radius: 3, strength: 1, travel: 'walk' }, absorbs: { pollution: [15, 2], noise: [10, 1] } },
    playground: { name: 'Playground', cat: 'recreation', icon: '🛝', cost: 90, costGrowth: 0.04, upkeep: 0.15, unlock: { level: 1 },
      desc: 'Swings and slides for families within 2 tiles.', tags: ['rec'],
      service: { kind: 'rec', radius: 2, strength: 0.6, travel: 'walk' } },
    bench: { name: 'Bench & Flowers', cat: 'recreation', icon: '🪴', cost: 30, upkeep: 0.02, unlock: { level: 1 }, noUpgrade: true, paint: true,
      desc: 'A bench, a planter and a little tree. A small spot to rest for homes right next to it; softens street noise.', tags: ['rec', 'green'],
      service: { kind: 'rec', radius: 1, strength: 0.2, travel: 'walk' }, absorbs: { noise: [4, 1] } },
    plaza: { name: 'Plaza', cat: 'recreation', icon: '⛲', cost: 300, costGrowth: 0.05, upkeep: 0.3, unlock: { level: 2 },
      desc: 'A paved square with a fountain and benches. Shops next to it get foot traffic.', tags: ['rec'],
      service: { kind: 'rec', radius: 2, strength: 0.45, travel: 'walk' } },
    sportsfield: { name: 'Sports Field', cat: 'recreation', icon: '⚽', cost: 700, costGrowth: 0.06, upkeep: 0.9, unlock: { level: 2 },
      desc: 'Football and athletics for homes within 3 tiles. A bit noisy on match days.', tags: ['rec', 'sport'],
      service: { kind: 'rec', radius: 3, strength: 0.85, travel: 'walk' }, emits: { noise: [6, 1] }, parking: 6, power: 1 },
    pool: { name: 'Swimming Pool', cat: 'recreation', icon: '🏊', cost: 1300, costGrowth: 0.08, upkeep: 1.8, income: 4, unlock: { level: 3 },
      desc: 'An outdoor pool: recreation within 3 tiles, earns entry fees, and a lifesaver in heatwaves.', tags: ['rec', 'sport'],
      service: { kind: 'rec', radius: 3, strength: 0.9, travel: 'walk' }, parking: 6, power: 2, customers: 6 },
    promenade: { name: 'Promenade', cat: 'recreation', icon: '🚶‍♀️', cost: 120, costGrowth: 0.03, upkeep: 0.2, unlock: { level: 1 }, place: 'shore', paint: true,
      desc: 'A riverside walk with benches and lamps (must touch water). Restaurants, cafés and hotels nearby earn more.',
      tags: ['rec', 'walk'], road: { walk: true }, service: { kind: 'rec', radius: 2, strength: 0.55, travel: 'walk' } },
    waterpark: { name: 'Waterfront Park', cat: 'recreation', icon: '🏞️', cost: 400, costGrowth: 0.05, upkeep: 0.5, unlock: { level: 2 }, place: 'shore',
      desc: 'A park on the riverbank (must touch water): strong recreation and absorbs pollution.', tags: ['green', 'rec'],
      service: { kind: 'rec', radius: 3, strength: 1.3, travel: 'walk' }, absorbs: { pollution: [15, 2], noise: [8, 1] } },
    tree: { name: 'Tree', cat: 'nature', icon: '🌲', cost: 25, unlock: { level: 1 }, paint: true,
      desc: 'Absorbs a little pollution and noise from neighboring tiles.', tags: ['green'], noUpgrade: true,
      absorbs: { pollution: [6, 1], noise: [5, 1] } },
    streetlight: { name: 'Streetlight', cat: 'service', icon: '💡', cost: 40, upkeep: 0.1, unlock: { level: 1 }, paint: true,
      desc: 'Lights up the night. Improves safety within 2 tiles.', tags: ['light'], noUpgrade: true,
      service: { kind: 'light', radius: 2 }, power: 0.1 },
    floodbarrier: { name: 'Flood Barrier', cat: 'service', icon: '🧱', cost: 400, upkeep: 0.2, unlock: { level: 2 }, place: 'shore', paint: true,
      desc: 'A wall along the bank (must touch water). Protects buildings within 3 tiles from river floods.', tags: ['flood'], noUpgrade: true },
    landmark: { name: 'Grand Clocktower', cat: 'civic', icon: '🕰️', cost: 12000, income: 30, upkeep: 2, unlock: { level: 5 }, unique: true,
      desc: 'A city icon. +8 happiness everywhere and +5% income citywide. Only one can be built.',
      tags: ['civic', 'fun'], jobs: 1, noUpgrade: true, cityEffect: { happiness: 8, income: 0.05 }, power: 1 },
  };

  /* Menu groups in the construction bar */
  TE.MENU = [
    { id: 'roads', name: 'Roads', icon: '🛣️', items: ['road', 'avenue', 'bikelane', 'roundabout', 'path', 'bridge', 'footbridge'] },
    { id: 'homes', name: 'Homes', icon: '🏠', items: ['house', 'townhouse', 'apartment', 'condo', 'tower'] },
    { id: 'shops', name: 'Shops', icon: '🛍️', items: ['shop', 'bakery', 'coffee', 'grocery', 'supermarket', 'mall'] },
    { id: 'fun', name: 'Leisure', icon: '🎬', items: ['restaurant', 'cinema', 'hotel', 'marina', 'landmark'] },
    { id: 'work', name: 'Work', icon: '💼', items: ['office', 'skyscraper', 'farm', 'factory', 'warehouse', 'ecofactory'] },
    { id: 'energy', name: 'Energy', icon: '⚡', items: ['powerplant', 'solar', 'recycling'] },
    { id: 'services', name: 'Services', icon: '🚓', items: ['police', 'fire', 'hospital', 'school', 'library', 'streetlight', 'floodbarrier'] },
    { id: 'rec', name: 'Parks', icon: '🌳', items: ['park', 'playground', 'plaza', 'sportsfield', 'pool', 'promenade', 'waterpark', 'tree', 'bench'] },
    { id: 'transit', name: 'Transport', icon: '🚌', items: ['busstop', 'trainstation', 'parkinglot', 'garage', 'charger'] },
  ];

  TE.CATEGORY_COLORS = {
    residential: '#f4a261', commercial: '#e76f51', entertainment: '#b5179e', business: '#4895ef',
    industrial: '#8d99ae', service: '#2a9d8f', recreation: '#52b788', nature: '#40916c', infra: '#6c757d',
    transport: '#ffb703', civic: '#e9c46a',
  };

  /* ---------- Synergy rules (neighbor bonuses) ----------
     target / source: building id, "tag:xxx" or "cat:xxx"
     radius:  tiles (square / Chebyshev distance)
     per:     bonus per matching neighbor (negative = penalty), capped at `max` neighbors
     minCount + flat: a one-off bonus once at least minCount neighbors match
     distinct: count different building types instead of buildings
  */
  TE.SYNERGIES = [
    { target: 'tag:home', source: 'tag:rec', radius: 2, per: 0.12, max: 1, label: 'Park nearby', icon: '🌳' },
    { target: 'tag:home', source: 'tag:grocer', radius: 2, per: 0.12, max: 1, label: 'Groceries nearby', icon: '🛒' },
    { target: 'tag:home', source: 'tag:home', radius: 1, minCount: 3, flat: 0.10, label: 'Residential district', icon: '🏘️' },
    { target: 'townhouse', source: 'townhouse', radius: 1, per: 0.05, max: 2, label: 'Terrace row', icon: '🏘️' },
    { target: 'shop', source: 'tag:home', radius: 1, per: 0.06, max: 4, label: 'Neighborhood regulars', icon: '🏠' },
    { target: 'bakery', source: 'tag:home', radius: 2, per: 0.08, max: 5, label: 'Hungry neighbors', icon: '🥐' },
    { target: 'bakery', source: 'bakery', radius: 1, per: -0.10, max: 2, label: 'Competition', icon: '⚔️' },
    { target: 'coffee', source: 'office', radius: 2, per: 0.25, max: 2, label: 'Office crowd', icon: '💼' },
    { target: 'coffee', source: 'tag:home', radius: 1, per: 0.05, max: 3, label: 'Morning regulars', icon: '🏠' },
    { target: 'coffee', source: 'coffee', radius: 1, per: -0.10, max: 2, label: 'Competition', icon: '⚔️' },
    { target: 'grocery', source: 'tag:home', radius: 2, per: 0.06, max: 6, label: 'Local shoppers', icon: '🏘️' },
    { target: 'supermarket', source: 'tag:home', radius: 3, per: 0.03, max: 10, label: 'Weekly shoppers', icon: '🏘️' },
    { target: 'tag:shop', source: 'tag:shop', radius: 1, distinct: true, minCount: 2, flat: 0.15, label: 'Shopping street', icon: '🛍️' },
    { target: 'tag:shop', source: 'tag:parking', radius: 2, per: 0.10, max: 1, label: 'Customer parking', icon: '🅿️' },
    { target: 'tag:shop', source: 'plaza', radius: 1, per: 0.08, max: 1, label: 'Plaza foot traffic', icon: '⛲' },
    { target: 'mall', source: 'tag:home', radius: 3, per: 0.03, max: 10, label: 'Suburban shoppers', icon: '🚗' },
    { target: 'restaurant', source: 'park', radius: 2, per: 0.20, max: 1, label: 'Park-side dining', icon: '🌳' },
    { target: 'restaurant', source: 'cinema', radius: 2, per: 0.15, max: 1, label: 'Pre-movie dinners', icon: '🎬' },
    { target: 'tag:food', source: 'promenade', radius: 2, per: 0.15, max: 1, label: 'Promenade strollers', icon: '🚶' },
    { target: 'hotel', source: 'promenade', radius: 2, per: 0.15, max: 1, label: 'Riverside walks', icon: '🚶' },
    { target: 'tag:food', source: 'farm', radius: 4, per: 0.10, max: 1, label: 'Fresh local produce', icon: '🌾' },
    { target: 'tag:grocer', source: 'farm', radius: 4, per: 0.10, max: 1, label: 'Fresh local produce', icon: '🌾' },
    { target: 'cinema', source: 'restaurant', radius: 2, per: 0.30, max: 1, label: 'Nightlife', icon: '🌃' },
    { target: 'office', source: 'coffee', radius: 2, per: 0.20, max: 1, label: 'Caffeinated staff', icon: '☕' },
    { target: 'office', source: 'office', radius: 1, per: 0.10, max: 3, label: 'Business cluster', icon: '💼' },
    { target: 'office', source: 'trainstation', radius: 5, per: 0.15, max: 1, label: 'Commuter access', icon: '🚉' },
    { target: 'office', source: 'busstop', radius: 3, per: 0.05, max: 1, label: 'Bus connection', icon: '🚏' },
    { target: 'office', source: 'factory', radius: 1, per: -0.12, max: 2, label: 'Noisy factory', icon: '🔊' },
    { target: 'skyscraper', source: 'office', radius: 2, per: 0.10, max: 4, label: 'Prime business address', icon: '💼' },
    { target: 'skyscraper', source: 'skyscraper', radius: 1, per: 0.10, max: 2, label: 'Skyline', icon: '🌆' },
    { target: 'skyscraper', source: 'trainstation', radius: 5, per: 0.20, max: 1, label: 'Commuter access', icon: '🚉' },
    { target: 'factory', source: 'warehouse', radius: 1, per: 0.30, max: 1, label: 'Logistics', icon: '📦' },
    { target: 'factory', source: 'factory', radius: 1, per: 0.08, max: 3, label: 'Industrial zone', icon: '🏭' },
    { target: 'warehouse', source: 'tag:industry', radius: 1, per: 0.20, max: 3, label: 'Supply chain', icon: '🏭' },
    { target: 'ecofactory', source: 'warehouse', radius: 1, per: 0.20, max: 1, label: 'Logistics', icon: '📦' },
    { target: 'recycling', source: 'factory', radius: 3, per: 0.15, max: 3, label: 'Scrap supply', icon: '🏭' },
    { target: 'farm', source: 'farm', radius: 1, per: 0.10, max: 3, label: 'Farmland', icon: '🌾' },
    { target: 'farm', source: 'tag:home', radius: 1, per: -0.10, max: 2, label: 'Neighbors complain', icon: '😤' },
    { target: 'hotel', source: 'park', radius: 2, per: 0.10, max: 1, label: 'Garden views', icon: '🌳' },
    { target: 'hotel', source: 'tag:fun', radius: 2, per: 0.10, max: 3, label: 'Things to do', icon: '🎭' },
    { target: 'hotel', source: 'landmark', radius: 4, per: 0.30, max: 1, label: 'Landmark tourists', icon: '🕰️' },
    { target: 'hotel', source: 'marina', radius: 3, per: 0.20, max: 1, label: 'Yacht guests', icon: '⛵' },
    { target: 'marina', source: 'promenade', radius: 2, per: 0.20, max: 1, label: 'Promenade crowds', icon: '🚶' },
    { target: 'marina', source: 'hotel', radius: 3, per: 0.15, max: 1, label: 'Hotel guests', icon: '🏨' },
    { target: 'pool', source: 'tag:home', radius: 3, per: 0.04, max: 8, label: 'Local swimmers', icon: '🏠' },
    { target: 'charger', source: 'tag:parking', radius: 1, per: 0.30, max: 1, label: 'Parking-lot chargers', icon: '🅿️' },
    { target: 'hotel', source: 'tag:industry', radius: 3, per: -0.15, max: 2, label: 'Ugly view', icon: '🏭' },
    { target: 'tag:food', source: 'factory', radius: 2, per: -0.15, max: 2, label: 'Industrial grime', icon: '😷' },
    { target: 'tag:food', source: 'powerplant', radius: 3, per: -0.15, max: 1, label: 'Smokestack view', icon: '😷' },
  ];

  /* Buildings next to water (river or pond) earn more. */
  TE.WATERFRONT = {
    restaurant: 0.2, coffee: 0.15, hotel: 0.2, condo: 0.15, apartment: 0.1, tower: 0.1, house: 0.1, townhouse: 0.1, office: 0.05,
  };

  /* Road access effects on income (by category). Buildings must touch a road
     that is connected to the Town Hall to count as "connected". */
  TE.ROAD_ACCESS = {
    commercial: { connected: 0.10, disconnected: -0.25 },
    entertainment: { connected: 0.10, disconnected: -0.25 },
    business: { connected: 0.05, disconnected: -0.15 },
    industrial: { connected: 0.05, disconnected: -0.20 },
  };

  /* ---------- Districts ----------
     Each land section (4x4) becomes a district based on what is built there. */
  TE.DISTRICTS = {
    downtown: { name: 'Downtown', icon: '🌆', color: '#4361ee', desc: 'Dense offices, towers and shops. With public transport: business and shops +10%.' },
    suburbs: { name: 'Suburbs', icon: '🏡', color: '#f4a261', desc: 'Low-rise homes. Quiet suburbs (little noise): homes +8% tax.' },
    industrial: { name: 'Industrial Area', icon: '🏭', color: '#8d99ae', desc: 'Factories and warehouses. Without homes in the section: industry +10%.' },
    waterfront: { name: 'Waterfront', icon: '⛵', color: '#00b4d8', desc: 'Riverside leisure. Restaurants, cafés, hotels and marinas +12%.' },
    commercial: { name: 'Shopping District', icon: '🛍️', color: '#e76f51', desc: 'Lots of shops. Shops +6%.' },
    countryside: { name: 'Countryside', icon: '🌾', color: '#a7c957', desc: 'Farms and nature. Farms +10%.' },
    mixed: { name: 'Mixed Use', icon: '🏙️', color: '#b5838d', desc: 'A bit of everything. No bonus, no penalty.' },
  };

  /* Special land tiles found in new land. */
  TE.RESOURCES = {
    fertile: { name: 'Fertile soil', icon: '🌾', color: '#a7c957', bonus: 0.25, applies: ['bakery', 'grocery', 'restaurant', 'farm'],
      desc: '+25% for Bakeries, Groceries and Restaurants built here, +50% for Farms' },
    ore: { name: 'Ore deposit', icon: '⛏️', color: '#9d8189', bonus: 0.30, applies: ['factory', 'warehouse', 'ecofactory'],
      desc: '+30% for Factories and Warehouses built here' },
    scenic: { name: 'Scenic view', icon: '🌅', color: '#90e0ef', bonus: 0.20, applies: ['house', 'townhouse', 'apartment', 'condo', 'tower', 'hotel'],
      desc: '+20% for homes and hotels built here, +5 resident happiness' },
  };
  TE.FEATURES = {
    tree: { name: 'Wild trees', clearCost: 15, absorbs: { pollution: [4, 1], noise: [3, 1] } },
    rock: { name: 'Boulders', clearCost: 60 },
    pond: { name: 'Pond', clearCost: null, scenic: 6 }, // cannot be cleared; makes nearby homes happier
  };

  /* ---------- Upgrades ----------
     Levels raise base output (Better Equipment). Perks are one-time upgrades. */
  TE.PERKS = {
    marketing: { name: 'Marketing', icon: '📣', minLevel: 2, costMult: 1.2,
      cats: ['commercial', 'entertainment', 'business'],
      desc: 'Positive neighbor bonuses this building receives are 50% stronger.' },
    automation: { name: 'Automation', icon: '⚙️', minLevel: 2, costMult: 1.5,
      cats: ['industrial', 'business'],
      desc: '+30% production efficiency.' },
    premium: { name: 'Premium Design', icon: '✨', minLevel: 3, costMult: 1.8,
      cats: ['commercial', 'entertainment', 'business', 'residential'],
      desc: 'Counts as 1.5 neighbors for the bonuses it gives. Homes: +8 neighborhood quality.' },
    filters: { name: 'Clean Filters', icon: '🍃', minLevel: 1, costMult: 0.8,
      cats: ['industrial'],
      desc: 'Cuts this building\'s air and river pollution and noise by 60%.' },
  };

  /* ---------- Discoverable combinations ----------
     needs:   building id / "tag:x" -> count, all within `radius` of one anchor building
     water:   number of river/pond tiles that must also be within the radius
     distinctTag: alternative — N different building types sharing a tag
     effects: income (bonus for members), happiness / safety (homes in combo),
              pollutionMult (industrial members), cityIncome
  */
  TE.COMBOS = [
    { id: 'morning_ritual', name: 'Morning Ritual', icon: '🥐', radius: 2, needs: { coffee: 1, bakery: 1, park: 1 },
      reward: 300, effects: { income: 0.15 }, hint: 'Breakfast tastes better outdoors…',
      desc: 'Café + Bakery + Park nearby. Shops in the combo earn +15%.' },
    { id: 'happy_neighborhood', name: 'Happy Neighborhood', icon: '🏡', radius: 2, needs: { 'tag:home': 3, park: 1 },
      reward: 300, effects: { income: 0.10, happiness: 6 }, hint: 'A few homes around something green…',
      desc: '3 homes + a Park. Homes earn +10% and residents are +6 happier.' },
    { id: 'leafy_lane', name: 'Leafy Lane', icon: '🌳', radius: 1, needs: { tree: 3, 'tag:home': 2 },
      reward: 200, effects: { happiness: 4, income: 0.05 }, hint: 'Homes framed by a few trees…',
      desc: '3 Trees hugging 2 homes. Homes +5% income and +4 happiness.' },
    { id: 'park_and_shop', name: 'Park & Shop', icon: '🅿️', radius: 2, needs: { 'tag:shop': 2, 'tag:parking': 1 },
      reward: 300, effects: { income: 0.20 }, hint: 'Customers need somewhere to leave the car…',
      desc: '2 shops + a Parking Lot or Garage. Shops earn +20% from extra customers.' },
    { id: 'food_market', name: 'Food Market', icon: '🧺', radius: 2, needs: { bakery: 2, grocery: 1 },
      reward: 500, effects: { income: 0.20 }, hint: 'Two bakers and a grocer walk into a street…',
      desc: '2 Bakeries + Grocery Store. All members earn +20%.' },
    { id: 'shopping_boulevard', name: 'Shopping Boulevard', icon: '🛍️', radius: 2, distinctTag: { tag: 'shop', count: 4 },
      reward: 1000, effects: { income: 0.20 }, hint: 'Variety is the spice of shopping…',
      desc: '4 different kinds of shops close together. Members earn +20%.' },
    { id: 'waterfront', name: 'Waterfront Boulevard', icon: '🌊', radius: 2, needs: { promenade: 1, restaurant: 1 }, water: 1,
      reward: 800, effects: { income: 0.25, happiness: 4 }, hint: 'Dinner by the river, a stroll along the water…',
      desc: 'River + Promenade + Restaurant. Members earn +25%, nearby homes are happier.' },
    { id: 'safe_streets', name: 'Safe Streets', icon: '🛡️', radius: 2, needs: { 'tag:home': 3, police: 1, streetlight: 1 },
      reward: 700, effects: { safety: 15, happiness: 3 }, hint: 'Homes watched over by uniforms and lamps…',
      desc: '3 homes + Police Station + Streetlight. Homes +15 safety, +3 happiness.' },
    { id: 'green_commute', name: 'Green Commute', icon: '🚲', radius: 2, needs: { busstop: 1, bikelane: 1, 'tag:home': 2 },
      reward: 600, effects: { happiness: 4, income: 0.05 }, hint: 'Leave the car at home…',
      desc: 'Bus Stop + Bike Lane + 2 homes. Homes +4 happiness, +5% income.' },
    { id: 'family_district', name: 'Family District', icon: '👨‍👩‍👧', radius: 3, needs: { 'tag:home': 3, school: 1, hospital: 1 },
      reward: 1500, effects: { happiness: 8, income: 0.10 }, hint: 'Homes with a school and a doctor close by…',
      desc: '3 homes + School + Hospital. Homes +8 happiness and +10% tax.' },
    { id: 'learning_quarter', name: 'Learning Quarter', icon: '📚', radius: 2, needs: { school: 1, library: 1, park: 1 },
      reward: 900, effects: { happiness: 5 }, hint: 'Lessons, books and a green place to read…',
      desc: 'School + Library + Park. Homes in the area are +5 happier.' },
    { id: 'sports_park', name: 'Sports Park', icon: '🏅', radius: 2, needs: { sportsfield: 1, pool: 1, playground: 1 },
      reward: 1200, effects: { happiness: 6, income: 0.15 }, hint: 'Run, swim and climb…',
      desc: 'Sports Field + Swimming Pool + Playground. +6 happiness, pool +15%.' },
    { id: 'farm_to_table', name: 'Farm to Table', icon: '🥕', radius: 3, needs: { farm: 1, restaurant: 1, 'tag:grocer': 1 },
      reward: 700, effects: { income: 0.20 }, hint: 'From the field straight to the plate…',
      desc: 'Farm + Restaurant + Grocery/Supermarket. Members earn +20%.' },
    { id: 'productive_workplace', name: 'Productive Workplace', icon: '💼', radius: 2, needs: { office: 2, coffee: 1 },
      reward: 800, effects: { income: 0.15 }, hint: 'Workers run on caffeine…',
      desc: '2 Offices + Café. Members earn +15%.' },
    { id: 'industrial_complex', name: 'Industrial Complex', icon: '🏭', radius: 2, needs: { factory: 3, warehouse: 1 },
      reward: 2500, effects: { income: 0.25 }, hint: 'Many chimneys need one big storeroom…',
      desc: '3 Factories + Warehouse. Members earn +25%.' },
    { id: 'green_industry', name: 'Green Industry', icon: '🍃', radius: 2, needs: { factory: 1, tree: 2, park: 1 },
      reward: 1200, effects: { income: 0.10, pollutionMult: 0.6 }, hint: 'Can industry and nature be friends?',
      desc: 'Factory + 2 Trees + Park. Factory pollutes 40% less and earns +10%.' },
    { id: 'health_district', name: 'Health District', icon: '🏥', radius: 2, needs: { hospital: 1, park: 1, 'tag:home': 2 },
      reward: 1500, effects: { happiness: 6, income: 0.10 }, hint: 'Healing, fresh air and neighbors…',
      desc: 'Hospital + Park + 2 homes. Homes +6 happiness and +10% income.' },
    { id: 'city_center', name: 'City Center', icon: '🚉', radius: 3, needs: { trainstation: 1, office: 2, 'tag:apt': 1 },
      reward: 3000, effects: { income: 0.25, cityIncome: 0.03 }, hint: 'Trains, desks and apartments at one busy hub…',
      desc: 'Train Station + 2 Offices + Apartments. Members +25% and +3% citywide income.' },
    { id: 'entertainment_hub', name: 'Entertainment Hub', icon: '🎭', radius: 2, needs: { cinema: 1, restaurant: 1, park: 1 },
      reward: 2000, effects: { income: 0.25, happiness: 5 }, hint: 'Dinner, a movie and a stroll…',
      desc: 'Cinema + Restaurant + Park. Members earn +25%; nearby homes happier.' },
    { id: 'marina_life', name: 'Marina Life', icon: '⛵', radius: 2, needs: { marina: 1, hotel: 1, promenade: 1 },
      reward: 3000, effects: { income: 0.25 }, hint: 'Boats, guests and a riverside walk…',
      desc: 'Marina + Hotel + Promenade. Members earn +25%.' },
    { id: 'tourist_quarter', name: 'Tourist Quarter', icon: '🧳', radius: 2, needs: { hotel: 1, restaurant: 1, park: 1 },
      reward: 3000, effects: { income: 0.20 }, hint: 'Where do visitors stay, eat and relax?',
      desc: 'Hotel + Restaurant + Park. Members earn +20%.' },
    { id: 'clean_energy', name: 'Clean Energy', icon: '☀️', radius: 3, needs: { solar: 1, recycling: 1, ecofactory: 1 },
      reward: 4000, effects: { income: 0.15, pollutionMult: 0.7 }, hint: 'Sun, scrap and clean machines…',
      desc: 'Solar Farm + Recycling Center + Eco Factory. +15% income, 30% less pollution.' },
    { id: 'grand_plaza', name: 'Grand Plaza', icon: '🕰️', radius: 2, needs: { landmark: 1, park: 1, skyscraper: 1 },
      reward: 10000, effects: { income: 0.20, cityIncome: 0.05 }, hint: 'A monument, a tower and a garden…',
      desc: 'Clocktower + Park + Skyscraper. Members +20% and +5% citywide income.' },
  ];

  /* ---------- Citizen needs (homes) ----------
     weight: share of happiness.  activeFromLevel: needs that can't be met yet stay neutral. */
  TE.NEEDS = {
    safety:     { name: 'Safety', icon: '🛡️', weight: 0.18, activeFromLevel: 1,
      fix: 'Add Streetlights nearby, or a Police Station that can reach the home by road.' },
    health:     { name: 'Healthcare', icon: '🏥', weight: 0.14, activeFromLevel: 3,
      fix: 'Build a Hospital within 7 road tiles (a road bridge is needed across the river).' },
    education:  { name: 'Education', icon: '🎓', weight: 0.12, activeFromLevel: 2,
      fix: 'Build a School within 5 tiles on foot; a Library adds more.' },
    recreation: { name: 'Recreation', icon: '🌳', weight: 0.16, activeFromLevel: 1,
      fix: 'Build a Park, Playground or Sports Field nearby (promenades and paths help too).' },
    shops:      { name: 'Shops', icon: '🛒', weight: 0.14, activeFromLevel: 1,
      fix: 'Build shops within 4 tiles and a Grocery Store or Supermarket in reach.' },
    jobs:       { name: 'Jobs & transit', icon: '💼', weight: 0.12, activeFromLevel: 1,
      fix: 'Connect the home to a road, build workplaces within 6 tiles or a Bus Stop / Train Station.' },
    air:        { name: 'Clean air', icon: '💨', weight: 0.14, activeFromLevel: 1,
      fix: 'Move factories and power plants away, plant trees or parks, cut traffic, or buy Clean Filters.' },
  };
  TE.NEED_THRESHOLDS = { good: 65, ok: 40 }; // >= good: green, >= ok: yellow, else red
  TE.CITIZENS = {
    baseSafety: 40, policeSafety: 45, lightSafety: 10, maxLights: 2, fireSafety: 10,
    neglectSafety: -12, noRoadSafety: -10,
    noisePenalty: 0.25,           // happiness lost per point of noise
    shopRadius: 4, jobRadius: 6,
    occupancyRate: 0.03,          // how fast occupancy moves toward its target (per second)
    qualitySmoothing: 0.05,       // how fast neighborhood quality changes (per second)
    neglectThreshold: 0.3, neglectRecover: 0.42, neglectDelay: 30,
    overcrowdPopulation: 60,
    attraction: 0.005,            // extra occupancy per happiness point above 50 (happy cities attract residents)
    powerPenalty: 12,             // max happiness lost during a power shortage
  };

  /* ---------- City levels ---------- */
  TE.LEVELS = [
    { level: 1, name: 'Small Settlement', req: null, landCap: 2, reward: 0 },
    { level: 2, name: 'Growing Town', req: { population: 20, totalEarned: 2500 }, landCap: 6, reward: 500 },
    { level: 3, name: 'Busy City', req: { population: 60, income: 45, combos: 2 }, landCap: 12, reward: 2000 },
    { level: 4, name: 'Modern City', req: { population: 150, income: 160, happiness: 55 }, landCap: 20, reward: 8000 },
    { level: 5, name: 'Metropolis', req: { population: 350, income: 500, combos: 6, safety: 55 }, landCap: 999, reward: 25000 },
  ];
  TE.REQ_LABELS = {
    population: ['Population', '👥', ''], totalEarned: ['Total earned', '💰', '$'], income: ['Income', '📈', '$/s'],
    combos: ['Combos discovered', '✨', ''], happiness: ['Happiness', '😊', ''], safety: ['Safety', '🛡️', ''],
    quality: ['Best neighborhood quality', '🏘️', ''], level: ['City level', '⭐', ''],
  };

  /* ---------- Quests (shown 3 at a time, in order) ----------
     metric: see TE.Progress.metric(); reward: { money, buff: { mult, seconds, name } } */
  TE.QUESTS = [
    { id: 'q_house', text: 'Build your first House', metric: 'count:house', target: 1, reward: { money: 50 }, tip: 'Pick 🏠 in the Homes tab, then click a green tile.' },
    { id: 'q_bakery', text: 'Open a Bakery next to homes', metric: 'count:bakery', target: 1, reward: { money: 80 }, tip: 'Bakeries earn +8% per home within 2 tiles.' },
    { id: 'q_park', text: 'Build a Park near your homes', metric: 'count:park', target: 1, reward: { money: 100 } },
    { id: 'q_5houses', text: 'Build 5 homes', metric: 'homes', target: 5, reward: { money: 150 } },
    { id: 'q_light', text: 'Place a Streetlight', metric: 'count:streetlight', target: 1, reward: { money: 60 } },
    { id: 'q_combo1', text: 'Discover your first combination', metric: 'combos', target: 1, reward: { money: 200 }, tip: 'Try Café + Bakery + Park close together.' },
    { id: 'q_parking', text: 'Build a Parking Lot for your shops', metric: 'count:parkinglot', target: 1, reward: { money: 120 }, tip: 'Shops within 3 tiles share its 24 spaces.' },
    { id: 'q_earn5k', text: 'Earn $5,000 in total', metric: 'totalEarned', target: 5000, reward: { money: 300 } },
    { id: 'q_bridge', text: 'Cross the river with a Road Bridge', metric: 'count:bridge', target: 1, reward: { money: 300 }, tip: 'Buy land across the river, then paint a bridge over the water.' },
    { id: 'q_inc25', text: 'Reach $25/sec income', metric: 'income', target: 25, reward: { buff: { mult: 0.2, seconds: 120, name: 'Boom Time' } } },
    { id: 'q_upgrade', text: 'Upgrade a building to level 2', metric: 'maxLevel', target: 2, reward: { money: 200 } },
    { id: 'q_land', text: 'Buy a land expansion', metric: 'expansions', target: 1, reward: { money: 300 } },
    { id: 'q_school', text: 'Build a School', metric: 'count:school', target: 1, reward: { money: 400 } },
    { id: 'q_pop40', text: 'Reach 40 population', metric: 'population', target: 40, reward: { money: 400 } },
    { id: 'q_bus', text: 'Open a Bus Stop', metric: 'count:busstop', target: 1, reward: { money: 300 } },
    { id: 'q_promenade', text: 'Build a Promenade along the river', metric: 'count:promenade', target: 1, reward: { money: 250 } },
    { id: 'q_police', text: 'Build a Police Station', metric: 'count:police', target: 1, reward: { money: 300 } },
    { id: 'q_shopping', text: 'Create your first shopping district', metric: 'shoppingStreets', target: 1, reward: { money: 500 }, tip: 'Put 3 different shops side by side.' },
    { id: 'q_power', text: 'Build a Power Plant', metric: 'count:powerplant', target: 1, reward: { money: 600 }, tip: 'Watch ⚡ in the top bar: shortages cut income.' },
    { id: 'q_inc100', text: 'Reach $100/sec income', metric: 'income', target: 100, reward: { money: 1000 } },
    { id: 'q_10houses', text: 'Build 10 homes', metric: 'homes', target: 10, reward: { money: 600 } },
    { id: 'q_combo5', text: 'Discover 5 combinations', metric: 'combos', target: 5, reward: { money: 1500 } },
    { id: 'q_factory', text: 'Earn $1,000 from industry', metric: 'earned:industrial', target: 1000, reward: { money: 800 } },
    { id: 'q_train', text: 'Open a Train Station', metric: 'count:trainstation', target: 1, reward: { money: 2000 } },
    { id: 'q_safety', text: 'Reach 70 city safety', metric: 'safety', target: 70, reward: { money: 1500 } },
    { id: 'q_happy', text: 'Reach 80 happiness', metric: 'happiness', target: 80, reward: { money: 2000, buff: { mult: 0.25, seconds: 180, name: 'Joyful City' } } },
    { id: 'q_quality', text: 'Get a neighborhood to 75 quality', metric: 'quality', target: 75, reward: { money: 1500 } },
    { id: 'q_pop200', text: 'Reach 200 population', metric: 'population', target: 200, reward: { money: 3000 } },
    { id: 'q_inc500', text: 'Reach $500/sec income', metric: 'income', target: 500, reward: { money: 8000 } },
    { id: 'q_landmark', text: 'Build the Grand Clocktower', metric: 'count:landmark', target: 1, reward: { money: 20000 } },
    { id: 'q_combo12', text: 'Discover 12 combinations', metric: 'combos', target: 12, reward: { money: 15000 } },
    { id: 'q_combo20', text: 'Discover 20 combinations', metric: 'combos', target: 20, reward: { money: 40000 } },
  ];

  /* ---------- Daily challenges (offline, seeded by the date) ----------
     target(level, state) returns the goal; counters reset every day. */
  TE.DAILY_POOL = [
    { id: 'd_earn', text: (t) => `Earn ${TE.fmtMoney(t)} today`, counter: 'earned',
      target: (lv, s) => Math.max(1500, Math.round(((s.totals && s.totals.net) || 10) * 240 / 100) * 100) },
    { id: 'd_build', text: (t) => `Construct ${t} buildings`, counter: 'built', target: (lv) => 6 + lv * 3 },
    { id: 'd_upgrade', text: (t) => `Perform ${t} upgrades`, counter: 'upgrades', target: (lv) => 2 + lv },
    { id: 'd_green', text: (t) => `Plant ${t} trees or parks`, counter: 'green', target: (lv) => 4 + lv },
    { id: 'd_happy', text: (t) => `Keep happiness ≥ 60 for ${Math.round(t / 60)} min`, counter: 'happySeconds', target: (lv) => 180 + lv * 60 },
    { id: 'd_events', text: (t) => `Handle ${t} city events`, counter: 'events', target: () => 2 },
    { id: 'd_safe', text: (t) => `Keep safety ≥ 55 for ${Math.round(t / 60)} min`, counter: 'safeSeconds', target: (lv) => 180 + lv * 60 },
    { id: 'd_flow', text: (t) => `Keep traffic flowing (no jams) for ${Math.round(t / 60)} min`, counter: 'flowSeconds', target: (lv) => 240 + lv * 60 },
  ];
  TE.DAILY_REWARD = (lv) => ({ money: 300 * lv * lv, buff: { mult: 0.15, seconds: 90, name: 'Daily Spirit' } });

  /* Tips shown in the objectives panel */
  TE.TIPS = [
    'Hover a tile while building to preview its income and neighbor bonuses.',
    'Green-glowing tiles are the most profitable spots for the selected building.',
    'Press R while building to rotate it. Buildings face the nearest road automatically.',
    'Click 😊 Happiness in the top bar for a full city report.',
    'Factories pollute the river too. Everything downstream suffers — recycling centers clean it up.',
    'Shops need parking. A Parking Lot serves every shop within 3 tiles.',
    'Busy streets jam. Upgrade a jammed street to an Avenue by clicking it, or add Bus Stops.',
    'Fire trucks and police can only cross the river over road bridges.',
    'Press O to cycle map overlays: traffic, parking, flood risk, districts…',
    'Wealthy residents leave poor neighborhoods. Build services first!',
    'Undo your last placement with Ctrl+Z for a full refund.',
  ];

  /* Helpers used in config strings */
  TE.fmtMoney = function (v) {
    const neg = v < 0; v = Math.abs(v);
    let s;
    if (v >= 1e9) s = (v / 1e9).toFixed(2) + 'B';
    else if (v >= 1e6) s = (v / 1e6).toFixed(2) + 'M';
    else if (v >= 1e4) s = (v / 1e3).toFixed(1) + 'K';
    else s = Math.floor(v).toLocaleString('en-US');
    return (neg ? '-$' : '$') + s;
  };
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
